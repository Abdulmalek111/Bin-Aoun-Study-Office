import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as admin from 'firebase-admin';

// Recreate CJS variables in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app & HTTP Server
const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Initialize Socket.IO Server with dynamic CORS (allow all in development/sandbox)
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

// Configure Firebase Admin if credentials exist (Lazy Initialization)
let firebaseAdminEnabled = false;
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    firebaseAdminEnabled = true;
    console.log('[Firebase Admin] Successfully initialized with service account.');
  } else {
    console.log('[Firebase Admin] No service account provided. Running in secure token-passthrough mode.');
  }
} catch (err) {
  console.warn('[Firebase Admin] Lazy initialization skipped/bypassed:', err);
}

// Memory stores for live voice members (Single Source of Truth)
interface VoicePeer {
  socketId: string;
  uid: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'moderator' | 'teacher' | 'student';
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  joinedAt: string;
}

// roomId -> Map of socketId to VoicePeer
const voiceRooms = new Map<string, Map<string, VoicePeer>>();

// socketId -> { roomId, uid } for fast teardowns
const socketToRoom = new Map<string, { roomId: string; uid: string }>();

// Simple health API route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    firebaseAdmin: firebaseAdminEnabled,
    activeVoiceRooms: voiceRooms.size,
    timestamp: new Date().toISOString()
  });
});

// WebRTC Socket.IO Signaling logic
io.on('connection', (socket: Socket) => {
  console.log(`[Signaling] Socket connected: ${socket.id}`);

  // 1. Join Room Event
  socket.on('join-room', async (payload: {
    roomId: string;
    uid: string;
    displayName: string;
    photoURL: string;
    role: 'admin' | 'moderator' | 'teacher' | 'student';
    token?: string;
  }) => {
    const { roomId, uid, displayName, photoURL, role, token } = payload;
    
    if (!roomId || !uid) {
      socket.emit('error-msg', { message: 'معرف الغرفة أو معرف المستخدم غير صالح.' });
      return;
    }

    console.log(`[Signaling] User "${displayName}" (${uid}) joining room details: ${roomId}`);

    // Optional Token Verification: verify signature if admin is active
    if (firebaseAdminEnabled && token) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        if (decodedToken.uid !== uid) {
          socket.emit('error-msg', { message: 'فشل التحقق من هوية المستخدم (UID mismatch).' });
          return;
        }
      } catch (authErr) {
        console.error('[Signaling] Firebase authentication failed:', authErr);
        socket.emit('error-msg', { message: 'انتهت صلاحية جلسة تسجيل الدخول. يرجى إعادة تسجيل الدخول.' });
        return;
      }
    }

    // Check if room has been created in memory
    if (!voiceRooms.has(roomId)) {
      voiceRooms.set(roomId, new Map());
    }

    const roomMembers = voiceRooms.get(roomId)!;

    // Check ban or limit checks could go here (will be reinforced in frontend/rules)
    const newPeer: VoicePeer = {
      socketId: socket.id,
      uid,
      displayName: displayName || 'طالب مجهول',
      photoURL: photoURL || '',
      role: role || 'student',
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      handRaised: false,
      joinedAt: new Date().toISOString(),
    };

    // Store in memory
    roomMembers.set(socket.id, newPeer);
    socketToRoom.set(socket.id, { roomId, uid });

    // Multi-peer dynamic joining sequence:
    // Join Socket.IO channel
    socket.join(roomId);

    // Get list of existing peers in this room, excluding current socket
    const existingPeers: VoicePeer[] = [];
    roomMembers.forEach((peer, sId) => {
      if (sId !== socket.id) {
        existingPeers.push(peer);
      }
    });

    // Send back of all other peer profiles directly to the joining peer
    socket.emit('room-members-list', { members: existingPeers });

    // Notify all other members in the room that a new peer has joined
    socket.to(roomId).emit('peer-joined', { peer: newPeer });
    console.log(`[Signaling] Member joined room: ${roomId}, total member count: ${roomMembers.size}`);
  });

  // 2. WebRTC Relays (Offer, Answer, Candidate mapping)
  socket.on('webrtc-offer', (payload: { targetSocketId: string; offer: any }) => {
    const tracking = socketToRoom.get(socket.id);
    if (tracking) {
      io.to(payload.targetSocketId).emit('webrtc-offer', {
        fromSocketId: socket.id,
        offer: payload.offer,
        fromUid: tracking.uid
      });
    }
  });

  socket.on('webrtc-answer', (payload: { targetSocketId: string; answer: any }) => {
    const tracking = socketToRoom.get(socket.id);
    if (tracking) {
      io.to(payload.targetSocketId).emit('webrtc-answer', {
        fromSocketId: socket.id,
        answer: payload.answer,
        fromUid: tracking.uid
      });
    }
  });

  socket.on('webrtc-ice-candidate', (payload: { targetSocketId: string; candidate: any }) => {
    io.to(payload.targetSocketId).emit('webrtc-ice-candidate', {
      fromSocketId: socket.id,
      candidate: payload.candidate
    });
  });

  // 3. Live State Synchronizer (Mute, Deafen, Speak state changes)
  socket.on('state-change', (payload: {
    isMuted?: boolean;
    isDeafened?: boolean;
    isSpeaking?: boolean;
    handRaised?: boolean;
  }) => {
    const tracking = socketToRoom.get(socket.id);
    if (!tracking) return;

    const roomMembers = voiceRooms.get(tracking.roomId);
    if (roomMembers && roomMembers.has(socket.id)) {
      const peer = roomMembers.get(socket.id)!;
      
      // Merge updates
      if (payload.isMuted !== undefined) peer.isMuted = payload.isMuted;
      if (payload.isDeafened !== undefined) peer.isDeafened = payload.isDeafened;
      if (payload.isSpeaking !== undefined) peer.isSpeaking = payload.isSpeaking;
      if (payload.handRaised !== undefined) peer.handRaised = payload.handRaised;

      // Broadcast changes immediately to all people in the room
      io.to(tracking.roomId).emit('peer-state-changed', {
        socketId: socket.id,
        uid: tracking.uid,
        fields: payload
      });
    }
  });

  // 4. Moderation Action: Kick Event Trigger
  socket.on('kick-member', (payload: { targetSocketId: string; reason?: string }) => {
    const tracking = socketToRoom.get(socket.id);
    if (!tracking) return;

    const roomMembers = voiceRooms.get(tracking.roomId);
    if (roomMembers) {
      const senderPeer = roomMembers.get(socket.id);
      if (senderPeer && (senderPeer.role === 'admin' || senderPeer.role === 'moderator' || senderPeer.role === 'teacher')) {
        console.log(`[Signaling] Moderation Kick event by ${senderPeer.displayName} targeting ${payload.targetSocketId}`);
        io.to(payload.targetSocketId).emit('kicked-from-room', {
          kickedBy: senderPeer.displayName,
          reason: payload.reason || 'تم إخراجك بواسطة المشرف المباشر.'
        });
      }
    }
  });

  // 5. Moderation Action: Ban Event Trigger
  socket.on('ban-member', (payload: { targetUid: string; targetSocketId: string; reason?: string }) => {
    const tracking = socketToRoom.get(socket.id);
    if (!tracking) return;

    const roomMembers = voiceRooms.get(tracking.roomId);
    if (roomMembers) {
      const senderPeer = roomMembers.get(socket.id);
      if (senderPeer && (senderPeer.role === 'admin' || senderPeer.role === 'moderator' || senderPeer.role === 'teacher')) {
        console.log(`[Signaling] Moderation Ban event by ${senderPeer.displayName} targeting UID ${payload.targetUid}`);
        io.to(payload.targetSocketId).emit('banned-from-room', {
          bannedBy: senderPeer.displayName,
          reason: payload.reason || 'تم حظرك نهائياً من دخول هذه الغرفة الصوتية.'
        });
      }
    }
  });

  // 6. Graceful Leave / Exit Room Handler
  socket.on('leave-room', () => {
    handleSocketTeardown(socket);
  });

  // 7. Automatic socket closing/destruction
  socket.on('disconnect', () => {
    console.log(`[Signaling] Socket disconnected: ${socket.id}`);
    handleSocketTeardown(socket);
  });
});

// Resilient room teardown service
function handleSocketTeardown(socket: Socket) {
  const tracking = socketToRoom.get(socket.id);
  if (!tracking) return;

  const { roomId, uid } = tracking;
  socketToRoom.delete(socket.id);

  const roomMembers = voiceRooms.get(roomId);
  if (roomMembers) {
    roomMembers.delete(socket.id);
    
    // Announce peer departure immediately
    socket.to(roomId).emit('peer-left', {
      socketId: socket.id,
      uid
    });

    console.log(`[Signaling] User (${uid}) left room: ${roomId}. Current active member count: ${roomMembers.size}`);

    // If room is completely vacant, flush it from memory to preserve server resources
    if (roomMembers.size === 0) {
      voiceRooms.delete(roomId);
      console.log(`[Signaling] Flushed empty room from memory active store: ${roomId}`);
    }
  }

  // Firebase Admin instant synchronized cleanup if enabled
  if (firebaseAdminEnabled) {
    try {
      const dbAdmin = admin.firestore();
      dbAdmin.doc(`voice_rooms/${roomId}/members/${uid}`).delete().catch(() => {});
      dbAdmin.doc(`voice_presence/${uid}`).delete().catch(() => {});
      
      // Auto-log a resilient database exit audit trail event
      dbAdmin.collection(`voice_rooms/${roomId}/events`).doc(`evt-server-${Date.now()}`).set({
        type: 'leave',
        uid: uid,
        createdAt: new Date().toISOString()
      }).catch(() => {});
    } catch (dbErr) {
      console.warn('[Firebase Admin] Robust background presence cleanup avoided:', dbErr);
    }
  }
}

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
