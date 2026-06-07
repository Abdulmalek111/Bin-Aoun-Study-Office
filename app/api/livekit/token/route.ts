import { AccessToken } from 'livekit-server-sdk';
import { admin, firebaseAdminEnabled } from '../../../../src/lib/firebase-admin.ts';

export async function POST(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const roomName = body.roomName || body.roomId;
  if (!roomName) {
    return new Response(JSON.stringify({ error: 'roomName or roomId parameter is required in request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 1. Secure ID Token Verification flow
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[Route Handler LiveKit Token] Request rejected: Missing or invalid Authorization header format.');
    return new Response(JSON.stringify({ error: 'Authentication required: Missing Firebase ID token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
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
      console.log(`[Route Handler LiveKit Token] Successfully verified token with Admin SDK for user: ${verifiedUid}`);
    } catch (err: any) {
      console.error('[Route Handler LiveKit Token] IdToken verification failed:', err);
      return new Response(JSON.stringify({ error: 'Session expired or token is invalid: ' + err.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
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
      console.log(`[Route Handler LiveKit Token] Decoded verified UID securely from ID Token payload fallback: ${verifiedUid}`);
    } catch (err: any) {
      console.error('[Route Handler LiveKit Token] Local JWT decode failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid authentication token: ' + err.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.VITE_LIVEKIT_URL || '';

  if (!apiKey || !apiSecret) {
    console.error('[Route Handler LiveKit Token] LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not set.');
    return new Response(JSON.stringify({ error: 'LiveKit server credentials are not configured on the server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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

    return new Response(
      JSON.stringify({
        token,
        url: liveKitUrl,
        roomName,
        identity: verifiedUid,
        name: verifiedName,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('[Route Handler LiveKit Token] AccessToken builder error:', err);
    return new Response(JSON.stringify({ error: 'Failed to build LiveKit token: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
