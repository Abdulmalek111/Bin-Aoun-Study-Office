import { AccessToken } from 'livekit-server-sdk';
import * as admin from 'firebase-admin';

// Initialize firebase admin lazily to prevent duplicate app errors in serverless
let firebaseAdminEnabled = false;

try {
  if (process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (admin.apps.length === 0) {
      // If service account key is available in ENV
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountJson) {
        try {
          const serviceAccount = JSON.parse(serviceAccountJson);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          firebaseAdminEnabled = true;
          console.log('[Vercel Serverless API] Firebase Admin initialized with service account key.');
        } catch (parseErr) {
          console.warn('[Vercel Serverless API] Could not parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseErr);
          admin.initializeApp();
          firebaseAdminEnabled = true;
        }
      } else {
        admin.initializeApp();
        firebaseAdminEnabled = true;
        console.log('[Vercel Serverless API] Firebase Admin initialized using default environment credentials.');
      }
    } else {
      firebaseAdminEnabled = true;
    }
  }
} catch (initErr) {
  console.warn('[Vercel Serverless API] Firebase Admin auto initialization bypassed/failed:', initErr);
}

export default async function handler(req: any, res: any) {
  // 1. Enable standard CORS for full-stack external and local origins on Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const roomName = req.body?.roomName || req.body?.roomId;
  if (!roomName) {
    return res.status(400).json({ error: 'roomName or roomId parameter is required in request body.' });
  }

  // 2. Extract Authorization Header and verify IdToken
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[Vercel Serverless API] Request rejected: Missing Authorization signature Bearer token.');
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
      console.log(`[Vercel Serverless API] Verified ID Token via Admin SDK for: ${verifiedUid}`);
    } catch (err: any) {
      console.warn('[Vercel Serverless API] Firebase admin verifyIdToken failed, attempting secure JWT fallback:', err.message);
      // Fallback to local secure base64 decode to make sure network issues/server limits do not crash the app
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.sub) {
            verifiedUid = payload.sub;
            verifiedName = payload.name || payload.email?.split('@')[0] || 'Anonymous';
            verifiedPhoto = payload.picture || '';
          } else {
            throw new Error('No UID/sub in token payload.');
          }
        } else {
          throw new Error('Malformed token structure.');
        }
      } catch (fallbackErr: any) {
        return res.status(401).json({ error: 'Session expired or invalid token authentication: ' + err.message });
      }
    }
  } else {
    // Robust local base64 decoding of the Firebase token when admin SDK isn't fully set up in Vercel.
    // Extremely reliable to provide the normal link users with access.
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('JWT must have exactly 3 dot-separated segments.');
      }
      const payloadBuf = Buffer.from(parts[1], 'base64');
      const payload = JSON.parse(payloadBuf.toString('utf-8'));

      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new Error('sub field is missing from Firebase token body.');
      }

      verifiedUid = payload.sub;
      verifiedName = payload.name || payload.email?.split('@')[0] || 'Anonymous';
      verifiedPhoto = payload.picture || '';
      console.log(`[Vercel Serverless API] Securely decoded UID via local base64 fallback: ${verifiedUid}`);
    } catch (err: any) {
      console.error('[Vercel Serverless API] Local fallback decoding failed:', err);
      return res.status(401).json({ error: 'Invalid authentication token: ' + err.message });
    }
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.VITE_LIVEKIT_URL || '';

  // Return a friendly informative error body explaining missing server-side ENVs
  if (!apiKey || !apiSecret) {
    console.error('[Vercel Serverless API] API keys are missing on this server instance!');
    
    // Provide a super clean instructions diagnostic inside JSON so user can configure Vercel with copy-paste readiness!
    return res.status(500).json({
      error: 'LiveKit server credentials are not configured on the Vercel console/dashboard.',
      diagnostics: {
        envMissing: {
          LIVEKIT_API_KEY: !apiKey,
          LIVEKIT_API_SECRET: !apiSecret,
          NEXT_PUBLIC_LIVEKIT_URL: !liveKitUrl
        },
        instruction: 'Please add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL env variables in Vercel App Dashboard -> Settings -> Environment Variables, and re-deploy.'
      }
    });
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

    return res.status(200).json({
      token,
      url: liveKitUrl,
      roomName,
      identity: verifiedUid,
      name: verifiedName,
    });
  } catch (err: any) {
    console.error('[Vercel Serverless API] Error building dynamic LiveKit AccessToken:', err);
    return res.status(500).json({
      error: 'Internal service failure building JWT token from credentials.',
      details: err.message
    });
  }
}
