import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { voiceService } from '../services/voice.service';
import { VoiceMember, VoiceRoom } from '../types/voice';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, setDoc, deleteDoc } from 'firebase/firestore';

export function useVoiceRoom(roomId: string | null) {
  const [joined, setJoined] = useState(false);
  const [members, setMembers] = useState<VoiceMember[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Keep refs of values needed in async callbacks to prevent closures stale references
  const isMutedRef = useRef(isMuted);
  const isDeafenedRef = useRef(isDeafened);
  const handRaisedRef = useRef(handRaised);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Callback to synchronise state updates to Firestore (room subcollection + top-level presence)
  const updateFirestorePresence = useCallback(async (fields: Partial<any>) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !roomId) return;
    try {
      const memberDocRef = doc(db, `voice_rooms/${roomId}/members`, currentUser.uid);
      await updateDoc(memberDocRef, fields).catch(() => {});
      const presenceDocRef = doc(db, 'voice_presence', currentUser.uid);
      await updateDoc(presenceDocRef, fields).catch(() => {});
    } catch (err) {
      console.warn('[useVoiceRoom] Firestore presence state update bypassed:', err);
    }
  }, [roomId]);

  const updateFirestorePresenceRef = useRef(updateFirestorePresence);
  useEffect(() => {
    updateFirestorePresenceRef.current = updateFirestorePresence;
  }, [updateFirestorePresence]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  useEffect(() => {
    handRaisedRef.current = handRaised;
  }, [handRaised]);

  // Speaking Analyzer logic: analyzes amplitude of mic capture stream
  const startSpeakingDetector = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastSpeaking = false;
      let silentTicks = 0;

      const checkAudio = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Microphone sound threshold
        const threshold = 18;
        const speakingNow = average > threshold && !isMutedRef.current;

        if (speakingNow) {
          silentTicks = 0;
          if (!lastSpeaking) {
            lastSpeaking = true;
            setIsSpeaking(true);
            socketService.emit('state-change', { isSpeaking: true });
            updateFirestorePresenceRef.current({ isSpeaking: true });
          }
        } else {
          silentTicks++;
          if (silentTicks > 15) { // Debounce noise pauses
            if (lastSpeaking) {
              lastSpeaking = false;
              setIsSpeaking(false);
              socketService.emit('state-change', { isSpeaking: false });
              updateFirestorePresenceRef.current({ isSpeaking: false });
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (e) {
      console.warn('[SpeakingDetector] Audio Context could not run:', e);
    }
  }, []);

  const stopSpeakingDetector = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Sync peer connections changes to state members list
  const syncLocalMemberStates = useCallback((fields: Partial<VoiceMember>) => {
    setMembers(prev => prev.map(m => {
      const isSelf = m.uid === auth.currentUser?.uid;
      if (isSelf) {
        return { ...m, ...fields };
      }
      return m;
    }));
  }, []);

  // Leave Voice room cleanup operations
  const leaveRoom = useCallback(async () => {
    console.log('[useVoiceRoom] Initiating leave room cleanup sequence...');
    setLoading(true);
    
    // Stop local analyzer
    stopSpeakingDetector();

    // Reset voice mesh engines
    voiceService.reset();

    // Disconnect sockets
    socketService.emit('leave-room', {});
    socketService.disconnect();

    // If joined, delete self presence document in firestore (highly secure)
    if (roomId && auth.currentUser) {
      try {
        const memberDocRef = doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid);
        await deleteDoc(memberDocRef).catch(() => {});
        const presenceDocRef = doc(db, 'voice_presence', auth.currentUser.uid);
        await deleteDoc(presenceDocRef).catch(() => {});
        
        // Write audit trail log event to firestore
        const eventId = `evt-${Date.now()}`;
        await setDoc(doc(db, `voice_rooms/${roomId}/events`, eventId), {
          type: 'leave',
          uid: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        }).catch(() => {});
      } catch (err) {
        console.warn('[useVoiceRoom] Background leave sync bypassed:', err);
      }
    }

    localStreamRef.current = null;
    setJoined(false);
    setMembers([]);
    setIsMuted(false);
    setIsDeafened(false);
    setHandRaised(false);
    setLoading(false);
  }, [roomId, stopSpeakingDetector]);

  // Join Voice room setup operations
  const joinRoom = useCallback(async (room: VoiceRoom) => {
    if (!room || joined || loading) return;
    
    setLoading(true);
    setErrorCode(null);
    console.log(`[useVoiceRoom] Attempting to connect user to Voice Room: "${room.name}" (${room.id})`);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('يجب تسجيل الدخول للانضمام للغرفة الصوتية.');
      }

      // Check room locks or custom roles allowance
      const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
      let currentRole: 'admin' | 'moderator' | 'teacher' | 'student' = 'student';
      if (currentUser.email === 'abdulmlikoog@gmail.com') {
        currentRole = 'admin';
      } else if (userDocSnap.exists()) {
        const d = userDocSnap.data();
        if (d.role) currentRole = d.role;
      }

      // Role authorization barriers
      if (room.allowedRoles && room.allowedRoles.length > 0 && !room.allowedRoles.includes(currentRole)) {
        throw new Error('ليس لديك الصلاحيات والأدوار المطلوبة لدخول هذه الغرفة الصوتية المخصصة.');
      }

      // Check room ban lists before entering
      const banDocSnap = await getDoc(doc(db, `voice_rooms/${room.id}/bans`, currentUser.uid));
      if (banDocSnap.exists()) {
        const banData = banDocSnap.data();
        throw new Error(`أنت محظور من دخول هذه الغرفة. السبب: ${banData.reason || 'مخالفة القوانين'}`);
      }

      // 1. Capture user microphone
      const stream = await voiceService.startLocalMic();
      localStreamRef.current = stream;

      // 2. Open socket connections
      const token = await currentUser.getIdToken();
      const socket = socketService.connect(token);

      // Register callbacks on Voice Service
      voiceService.registerCallbacks(
        (updatedStream) => {
          localStreamRef.current = updatedStream;
        },
        (remoteSocketId, remoteStream) => {
          console.log(`[useVoiceRoom] Stream rendered for peer socket: ${remoteSocketId}`);
        },
        (peerSocketIds) => {
          // Sync existing components
        }
      );

      // 3. Emit join-room event to notify signaling server
      socket.emit('join-room', {
        roomId: room.id,
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب',
        photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'X')}`,
        role: currentRole,
        token
      });

      // 4. Set local state presence in firestore so other users see us in room list
      const selfMemberRecord: VoiceMember = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب',
        photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'X')}`,
        role: currentRole,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        handRaised: false,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        socketId: socket.id || ''
      };

      await setDoc(doc(db, `voice_rooms/${room.id}/members`, currentUser.uid), selfMemberRecord);

      // Set top-level voice_presence record
      const selfPresenceRecord = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب',
        photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'X')}`,
        role: currentRole,
        currentRoomId: room.id,
        currentRoomName: room.name,
        isSpeaking: false,
        isMuted: false,
        isDeafened: false,
        lastSeen: new Date().toISOString(),
        status: 'online'
      };
      await setDoc(doc(db, 'voice_presence', currentUser.uid), selfPresenceRecord);

      // Add audit log join event
      await setDoc(doc(db, `voice_rooms/${room.id}/events`, `evt-${Date.now()}`), {
        type: 'join',
        uid: currentUser.uid,
        createdAt: new Date().toISOString()
      });

      // Wire Socket Listeners
      socket.off('error-msg');
      socket.on('error-msg', (data: { message: string }) => {
        console.error('[useVoiceRoom] Server socket error response:', data);
        setErrorCode(data.message);
        leaveRoom();
      });

      // Peer connections updates:
      socket.off('room-members-list');
      socket.on('room-members-list', async (data: { members: any[] }) => {
        console.log(`[useVoiceRoom] Populated other members list from signal:`, data.members);
        
        // Setup existing user tracks
        const fullList: VoiceMember[] = [
          { ...selfMemberRecord, socketId: socket.id || '' },
          ...data.members
        ];
        
        setMembers(fullList);

        // Initiate WebRTC offers to all existing socket peers
        for (const peer of data.members) {
          await voiceService.initiateOffer(peer.socketId);
        }
      });

      socket.off('peer-joined');
      socket.on('peer-joined', (data: { peer: any }) => {
        console.log(`[useVoiceRoom] Remote peer connected: ${data.peer.displayName}`);
        setMembers(prev => {
          if (prev.some(m => m.socketId === data.peer.socketId)) return prev;
          return [...prev, data.peer];
        });
      });

      // WebRTC SDP Relays:
      socket.off('webrtc-offer');
      socket.on('webrtc-offer', async (data: { fromSocketId: string; offer: any }) => {
        await voiceService.handleIncomingOffer(data.fromSocketId, data.offer);
      });

      socket.off('webrtc-answer');
      socket.on('webrtc-answer', async (data: { fromSocketId: string; answer: any }) => {
        await voiceService.handleIncomingAnswer(data.fromSocketId, data.answer);
      });

      socket.off('webrtc-ice-candidate');
      socket.on('webrtc-ice-candidate', async (data: { fromSocketId: string; candidate: any }) => {
        await voiceService.handleIncomingIceCandidate(data.fromSocketId, data.candidate);
      });

      // User Presence tracking:
      socket.off('peer-left');
      socket.on('peer-left', (data: { socketId: string; uid: string }) => {
        console.log(`[useVoiceRoom] Remote peer disconnected: ${data.socketId}`);
        voiceService.closePeerConnection(data.socketId);
        setMembers(prev => prev.filter(m => m.socketId !== data.socketId));
      });

      // State synchronize changes:
      socket.off('peer-state-changed');
      socket.on('peer-state-changed', (data: { socketId: string; uid: string; fields: any }) => {
        setMembers(prev => prev.map(m => {
          if (m.socketId === data.socketId) {
            return { ...m, ...data.fields };
          }
          return m;
        }));
      });

      // Moderation Events:
      socket.off('kicked-from-room');
      socket.on('kicked-from-room', (data: { kickedBy: string; reason: string }) => {
        alert(`تم إخراجه من الغرفة الصوتية بواسطة: ${data.kickedBy}\nالسبب: ${data.reason}`);
        leaveRoom();
      });

      socket.off('banned-from-room');
      socket.on('banned-from-room', (data: { bannedBy: string; reason: string }) => {
        alert(`تم حظرك وطردك من هذه الغرفة الصوتية بواسطة: ${data.bannedBy}\nالسبب: ${data.reason}`);
        leaveRoom();
      });

      // Start local speaking detection analyzer engine
      startSpeakingDetector(stream);

      // Successfully synced
      setJoined(true);
      setLoading(false);

    } catch (err: any) {
      console.error('[useVoiceRoom] Join voice room breakdown error:', err);
      setErrorCode(err.message || 'حدث خطأ غير متوقع أثناء الانضمام.');
      setLoading(false);
      leaveRoom();
    }
  }, [joined, loading, startSpeakingDetector, leaveRoom]);

  // Sync state selectors actions toggles
  const toggleMute = useCallback(() => {
    const nextValue = !isMuted;
    setIsMuted(nextValue);
    voiceService.setMuteState(nextValue);
    socketService.emit('state-change', { isMuted: nextValue });
    syncLocalMemberStates({ isMuted: nextValue });
    updateFirestorePresence({ isMuted: nextValue });
  }, [isMuted, syncLocalMemberStates, updateFirestorePresence]);

  const toggleDeafen = useCallback(() => {
    const nextValue = !isDeafened;
    setIsDeafened(nextValue);
    voiceService.setDeafenState(nextValue);
    
    // Deafen forces Mute in Discord-like systems
    const nextMute = nextValue ? true : isMuted;
    setIsMuted(nextMute);
    voiceService.setMuteState(nextMute);

    socketService.emit('state-change', { 
      isDeafened: nextValue, 
      isMuted: nextMute 
    });

    syncLocalMemberStates({ 
      isDeafened: nextValue, 
      isMuted: nextMute 
    });

    updateFirestorePresence({
      isMuted: nextMute,
      isDeafened: nextValue
    });
  }, [isDeafened, isMuted, syncLocalMemberStates, updateFirestorePresence]);

  const toggleHandRaise = useCallback(() => {
    const nextValue = !handRaised;
    setHandRaised(nextValue);
    socketService.emit('state-change', { handRaised: nextValue });
    syncLocalMemberStates({ handRaised: nextValue });
    updateFirestorePresence({ handRaised: nextValue });
  }, [handRaised, syncLocalMemberStates, updateFirestorePresence]);

  const kickMember = useCallback((targetSocketId: string, reason?: string) => {
    socketService.emit('kick-member', { targetSocketId, reason });
  }, []);

  const banMember = useCallback((targetUid: string, targetSocketId: string, reason?: string) => {
    socketService.emit('ban-member', { targetUid, targetSocketId, reason });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  return {
    joined,
    members,
    isMuted,
    isDeafened,
    handRaised,
    isSpeaking,
    loading,
    error: errorCode,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleDeafen,
    toggleHandRaise,
    kickMember,
    banMember
  };
}
