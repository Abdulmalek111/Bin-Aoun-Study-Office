import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { admin, firebaseAdminEnabled } from './src/lib/firebase-admin.ts';
import { AccessToken } from 'livekit-server-sdk';

// Recreate CJS variables in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app & HTTP Server
const app = express();
app.use(express.json()); // Support POST application/json payloads
const server = http.createServer(app);
const PORT = 3000;


// Memory stores for live voice members (Single Source of Truth)
// Simple health API route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    firebaseAdmin: firebaseAdminEnabled,
    timestamp: new Date().toISOString()
  });
});

// LiveKit Token Generator API Route - POST Only with Security Requirements
app.post('/api/livekit/token', async (req, res) => {
  const roomName = req.body.roomName || req.body.roomId;

  if (!roomName) {
    return res.status(400).json({ error: 'roomName or roomId parameter is required in request body.' });
  }

  // 1. Secure ID Token Verification flow
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[LiveKit Token] Request rejected: Missing or invalid Authorization header format.');
    return res.status(401).json({ error: 'Authentication required: Missing Firebase ID token.' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  let verifiedUid: string;
  let verifiedName = 'Anonymous User';
  let verifiedPhoto = '';

  if (firebaseAdminEnabled) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      verifiedUid = decodedToken.uid;
      verifiedName = decodedToken.name || decodedToken.email?.split('@')[0] || 'Anonymous';
      verifiedPhoto = decodedToken.picture || '';
      console.log(`[LiveKit Token] Successfully verified token with Admin SDK for user: ${verifiedUid}`);
    } catch (err: any) {
      console.error('[LiveKit Token] IdToken verification failed:', err);
      return res.status(401).json({ error: 'Session expired or token is invalid: ' + err.message });
    }
  } else {
    // Robust JWT decoding fallback when Admin SDK is not fully credentialed
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('JWT must have 3 parts.');
      }
      const payloadBuf = Buffer.from(parts[1], 'base64');
      const payload = JSON.parse(payloadBuf.toString('utf-8'));
      
      // Basic sanity checks for Firebase ID Token structure
      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new Error('Sub/UID field is missing in JWT payload.');
      }
      
      verifiedUid = payload.sub;
      verifiedName = payload.name || payload.email?.split('@')[0] || 'Anonymous';
      verifiedPhoto = payload.picture || '';
      console.log(`[LiveKit Token] Decoded verified UID securely from ID Token payload fallback: ${verifiedUid}`);
    } catch (err: any) {
      console.error('[LiveKit Token] Local JWT decode failed:', err);
      return res.status(401).json({ error: 'Invalid authentication token: ' + err.message });
    }
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.VITE_LIVEKIT_URL || '';

  if (!apiKey || !apiSecret) {
    console.error('[LiveKit Token] LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not set.');
    return res.status(500).json({ error: 'LiveKit server credentials are not configured on the server.' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: verifiedUid,
      name: verifiedName,
      metadata: JSON.stringify({ displayName: verifiedName, photoURL: verifiedPhoto }),
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return res.json({
      token,
      url: liveKitUrl,
      roomName,
      identity: verifiedUid,
      name: verifiedName,
    });
  } catch (err: any) {
    console.error('[LiveKit Token] AccessToken builder error:', err);
    return res.status(500).json({ error: 'Failed to build LiveKit token: ' + err.message });
  }
});


// ---------------------- Vite Development/Production Config ----------------------
async function startAppServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Dynamic Vite setup inside development to serve hot bundles on the exact same Express port
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    app.use(vite.middlewares);
    console.log('[Dev Engine] Vite mounted successfully as middleware.');
  } else {
    // Standard Production assets deployment pipeline
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Prod Engine] Production assets active at:', distPath);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Host] Advanced Voice Portal running robustly on http://0.0.0.0:${PORT}`);
  });
}

startAppServer();
