import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { VoiceMember, VoiceRoom } from '../types/voice';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

export function useVoiceRoom(roomId: string | null) {
  const [joined, setJoined] = useState(false);
  const [members, setMembers] = useState<VoiceMember[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Diagnostic states
  const [socketStatus, setSocketStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [socketId, setSocketId] = useState<string>('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [firestoreStatus, setFirestoreStatus] = useState<string>('مكتمل الأركان / Ready');
  const [webrtcStatus, setWebrtcStatus] = useState<string>('بانتظار الإشارة / Waiting');
  const [microphoneStatus, setMicrophoneStatus] = useState<string>('غير متصل / Offline');

  // Keep refs of values needed in async callbacks to prevent closures stale references
  const isMutedRef = useRef(isMuted);
  const isDeafenedRef = useRef(isDeafened);
  const handRaisedRef = useRef(handRaised);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // WebRTC multi-peer connection store
  const peerConnectionsRef = useRef<Map<string, {
    peerConnection: RTCPeerConnection;
    audioElement: HTMLAudioElement;
    stream: MediaStream;
  }>>(new Map());

  // ICE Servers config
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  useEffect(() => {
    handRaisedRef.current = handRaised;
  }, [handRaised]);

  // Capture user mic with ideal echo cancellation, noise suppression and auto gain criteria
  const startLocalMic = async (): Promise<MediaStream> => {
    try {
      console.log('[useVoiceRoom] Requesting microphone access with echo cancellation & noise suppression...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false
      });
      localStreamRef.current = stream;
      setMicrophoneStatus('متصل ونشط 🎙️');
      return stream;
    } catch (err: any) {
      console.error('[useVoiceRoom] Microphone access denied:', err);
      throw new Error('يرجى السماح باستخدام المايكروفون من إعدادات المتصفح.');
    }
  };

  const stopLocalMic = () => {
    if (localStreamRef.current) {
      console.log('[useVoiceRoom] Requesting local mic track stop...');
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
      setMicrophoneStatus('غير متصل / Offline');
    }
  };

  const setMuteState = (muted: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      console.log(`[useVoiceRoom] Local mic track set enabled: ${!muted}`);
      setMicrophoneStatus(muted ? 'مكتوم 🔇' : 'نشط 🎙️');
    }
  };

  const setDeafenState = (deafened: boolean) => {
    peerConnectionsRef.current.forEach(wrapper => {
      wrapper.audioElement.volume = deafened ? 0 : 1;
    });
    console.log(`[useVoiceRoom] Audio volume deafened toggle: ${deafened}`);
  };

  // Speaking Analyzer logic: analyzes amplitude of mic capture stream
  const startSpeakingDetector = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
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
          }
        } else {
          silentTicks++;
          if (silentTicks > 15) { // Debounce noise pauses
            if (lastSpeaking) {
              lastSpeaking = false;
              setIsSpeaking(false);
              socketService.emit('state-change', { isSpeaking: false });
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

  // WebRTC Setup Operations
  const closePeerConnection = useCallback((socketId: string) => {
    const wrapper = peerConnectionsRef.current.get(socketId);
    if (wrapper) {
      console.log(`[useVoiceRoom] Tearing down WebRTC connection with: ${socketId}`);
      try {
        wrapper.peerConnection.close();
        wrapper.audioElement.pause();
        wrapper.audioElement.srcObject = null;
        wrapper.audioElement.remove();
      } catch (e) {
        // Safe bypass
      }
      peerConnectionsRef.current.delete(socketId);
      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
    }
  }, []);

  const initiateOffer = useCallback(async (targetSocketId: string) => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      closePeerConnection(targetSocketId);
    }

    console.log(`[useVoiceRoom] Creating RTCPeerConnection for outgoing offer to peer: ${targetSocketId}`);
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      const audioObj = new Audio();
      audioObj.autoplay = true;

      const remoteStream = new MediaStream();
      peerConnectionsRef.current.set(targetSocketId, {
        peerConnection: pc,
        audioElement: audioObj,
        stream: remoteStream
      });

      // Attach our local stream tracks to feed this connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('webrtc-ice-candidate', {
            targetSocketId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log(`[useVoiceRoom] Received audio track from ${targetSocketId}`);
        event.streams[0].getAudioTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        audioObj.srcObject = remoteStream;
        setWebrtcStatus('متصل P2P Mesh Connected ✅');
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[useVoiceRoom] Connection state with ${targetSocketId}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          closePeerConnection(targetSocketId);
        }
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);
      
      socketService.emit('webrtc-offer', {
        targetSocketId,
        offer
      });

      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
    } catch (err) {
      console.error(`[useVoiceRoom] initiateOffer failed for ${targetSocketId}:`, err);
    }
  }, [closePeerConnection]);

  const handleIncomingOffer = useCallback(async (fromSocketId: string, offer: RTCSessionDescriptionInit) => {
    if (peerConnectionsRef.current.has(fromSocketId)) {
      closePeerConnection(fromSocketId);
    }

    console.log(`[useVoiceRoom] Creating RTCPeerConnection for incoming offer from peer: ${fromSocketId}`);
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      const audioObj = new Audio();
      audioObj.autoplay = true;

      const remoteStream = new MediaStream();
      peerConnectionsRef.current.set(fromSocketId, {
        peerConnection: pc,
        audioElement: audioObj,
        stream: remoteStream
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('webrtc-ice-candidate', {
            targetSocketId: fromSocketId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log(`[useVoiceRoom] Received audio track in response track from ${fromSocketId}`);
        event.streams[0].getAudioTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        audioObj.srcObject = remoteStream;
        setWebrtcStatus('متصل P2P Mesh Connected ✅');
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          closePeerConnection(fromSocketId);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.emit('webrtc-answer', {
        targetSocketId: fromSocketId,
        answer
      });

      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
    } catch (err) {
      console.error(`[useVoiceRoom] handleIncomingOffer error from ${fromSocketId}:`, err);
    }
  }, [closePeerConnection]);

  const handleIncomingAnswer = useCallback(async (fromSocketId: string, answer: RTCSessionDescriptionInit) => {
    const wrapper = peerConnectionsRef.current.get(fromSocketId);
    if (wrapper) {
      console.log(`[useVoiceRoom] Applying remote description answer for: ${fromSocketId}`);
      try {
        await wrapper.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error(`[useVoiceRoom] Setting remote answer failed:`, err);
      }
    }
  }, []);

  const handleIncomingIceCandidate = useCallback(async (fromSocketId: string, candidate: RTCIceCandidateInit) => {
    const wrapper = peerConnectionsRef.current.get(fromSocketId);
    if (wrapper) {
      try {
        await wrapper.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`[useVoiceRoom] Adding ICE candidate failure:`, err);
      }
    }
  }, []);

  const resetAllVoiceEngine = useCallback(() => {
    console.log('[useVoiceRoom] Tearing down inside useVoiceRoom, resetting WebRTC map...');
    Array.from(peerConnectionsRef.current.keys()).forEach(socketId => {
      closePeerConnection(socketId);
    });
    peerConnectionsRef.current.clear();
    stopLocalMic();
    setConnectedPeers([]);
  }, [closePeerConnection]);

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
    setFirestoreStatus('جاري تسجيل مغادرة الغرفة وتحديث الحضور...');
    
    // Stop local analyzer
    stopSpeakingDetector();

    // Reset voice mesh engines directly local inside hook
    resetAllVoiceEngine();

    // Disconnect sockets
    socketService.emit('leave-room', {});
    socketService.disconnect();
    setSocketStatus('disconnected');
    setSocketId('');

    // If joined, delete self presence document in firestore (highly secure)
    if (roomId && auth.currentUser) {
      try {
        const memberDocRef = doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid);
        await deleteDoc(memberDocRef);

        // Write audit trail log event to firestore
        const eventId = `evt-${Date.now()}`;
        await setDoc(doc(db, `voice_rooms/${roomId}/events`, eventId), {
          type: 'leave',
          uid: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });

        // Set actual member count
        const membersSnapshot = await getDocs(collection(db, `voice_rooms/${roomId}/members`));
        await updateDoc(doc(db, 'voice_rooms', roomId), {
          memberCount: Math.max(0, membersSnapshot.size),
          updatedAt: new Date().toISOString()
        });

        setFirestoreStatus('تم تسجيل مغادرتك وتنظيف الحضور بنجاح ✅');
      } catch (err) {
        console.warn('[useVoiceRoom] Background leave sync bypassed:', err);
        setFirestoreStatus('حدث خطأ رمزي أثناء تنظيف الحضور ⚠️');
      }
    }

    localStreamRef.current = null;
    setJoined(false);
    setMembers([]);
    setIsMuted(false);
    setIsDeafened(false);
    setHandRaised(false);
    setLoading(false);
    setMicrophoneStatus('غير متصل / Offline');
    setWebrtcStatus('تم إنهاء الاتصال / Disconnected');
  }, [roomId, stopSpeakingDetector, resetAllVoiceEngine]);

  // Join Voice room setup operations
  const joinRoom = useCallback(async (room: VoiceRoom) => {
    if (!room || joined || loading) return;
    
    setLoading(true);
    setErrorCode(null);
    setFirestoreStatus('التحقق من العضوية والصلاحيات والمحظورين...');
    setMicrophoneStatus('جاري الحصول على صلاحية المايكروفون...');
    setWebrtcStatus('بانتظار تهيئة شبكة P2P Mesh...');
    
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

      // 1-3. Capture user microphone directly inside hook stream setup
      const stream = await startLocalMic();
      localStreamRef.current = stream;

      // 4. Open socket connections
      setSocketStatus('connecting');
      const token = await currentUser.getIdToken();
      const socket = socketService.connect(token);

      // Setup Socket state tracking
      if (socket.connected) {
        setSocketStatus('connected');
        setSocketId(socket.id || '');
      }

      socket.off('connect');
      socket.on('connect', () => {
        console.log('[useVoiceRoom] Socket connected/reconnected. Joining room channel...');
        setSocketStatus('connected');
        setSocketId(socket.id || '');
        
        socket.emit('join-room', {
          roomId: room.id,
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب',
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'X')}`,
          role: currentRole,
          token
        });
      });

      socket.off('disconnect');
      socket.on('disconnect', () => {
        console.warn('[useVoiceRoom] Socket signal disconnected.');
        setSocketStatus('disconnected');
      });

      // Emit join-room event immediately if socket is connected
      if (socket.connected) {
        socket.emit('join-room', {
          roomId: room.id,
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب',
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'X')}`,
          role: currentRole,
          token
        });
      }

      // 5. Creating Presence in Firestore with isOnline=true
      setFirestoreStatus('جاري رفع وثيقة الحضور الحي...');
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
        socketId: socket.id || '',
        isOnline: true
      };

      await setDoc(doc(db, `voice_rooms/${room.id}/members`, currentUser.uid), selfMemberRecord);

      // Write join event log
      await setDoc(doc(db, `voice_rooms/${room.id}/events`, `evt-${Date.now()}`), {
        type: 'join',
        uid: currentUser.uid,
        createdAt: new Date().toISOString()
      });

      // Update room memberCount in parent document
      const membersSnapshot = await getDocs(collection(db, `voice_rooms/${room.id}/members`));
      await updateDoc(doc(db, 'voice_rooms', room.id), {
        memberCount: membersSnapshot.size,
        updatedAt: new Date().toISOString()
      });
      setFirestoreStatus('الحضور نشط ومتصل 🟢');

      // Wire Socket Listeners
      socket.off('error-msg');
      socket.on('error-msg', (data: { message: string }) => {
        console.error('[useVoiceRoom] Server socket error response:', data);
        setErrorCode(data.message);
        leaveRoom();
      });

      // Peer connections and automatic discovery mesh setups
      socket.off('room-members-list');
      socket.on('room-members-list', async (data: { members: any[] }) => {
        console.log(`[useVoiceRoom] Populated other members list from signal:`, data.members);
        setWebrtcStatus(`جاري البناء الشبكي P2P Mesh مع المجموع (${data.members.length})`);
        
        const fullList: VoiceMember[] = [
          { ...selfMemberRecord, socketId: socket.id || '', isOnline: true },
          ...data.members
        ];
        
        setMembers(fullList);

        // Initiate WebRTC offers to all existing socket peers
        for (const peer of data.members) {
          await initiateOffer(peer.socketId);
        }
      });

      socket.off('peer-joined');
      socket.on('peer-joined', (data: { peer: any }) => {
        console.log(`[useVoiceRoom] Remote peer connected (peer-joined): ${data.peer.displayName}`);
        setMembers(prev => {
          if (prev.some(m => m.socketId === data.peer.socketId)) return prev;
          return [...prev, data.peer];
        });
      });

      socket.off('user-joined');
      socket.on('user-joined', (data: { peer: any }) => {
        console.log(`[useVoiceRoom] Remote user connected (user-joined): ${data.peer.displayName}`);
        setMembers(prev => {
          if (prev.some(m => m.socketId === data.peer.socketId)) return prev;
          return [...prev, data.peer];
        });
      });

      // WebRTC SDP Relays:
      socket.off('webrtc-offer');
      socket.on('webrtc-offer', async (data: { fromSocketId: string; offer: any }) => {
        await handleIncomingOffer(data.fromSocketId, data.offer);
      });

      socket.off('webrtc-answer');
      socket.on('webrtc-answer', async (data: { fromSocketId: string; answer: any }) => {
        await handleIncomingAnswer(data.fromSocketId, data.answer);
      });

      socket.off('webrtc-ice-candidate');
      socket.on('webrtc-ice-candidate', async (data: { fromSocketId: string; candidate: any }) => {
        await handleIncomingIceCandidate(data.fromSocketId, data.candidate);
      });

      // User Presence tracking:
      socket.off('peer-left');
      socket.on('peer-left', (data: { socketId: string; uid: string }) => {
        console.log(`[useVoiceRoom] Remote peer disconnected (peer-left): ${data.socketId}`);
        closePeerConnection(data.socketId);
        setMembers(prev => prev.filter(m => m.socketId !== data.socketId));
      });

      socket.off('user-left');
      socket.on('user-left', (data: { socketId: string; uid: string }) => {
        console.log(`[useVoiceRoom] Remote peer left (user-left): ${data.socketId}`);
        closePeerConnection(data.socketId);
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

      // Successfully joined
      setJoined(true);
      setLoading(false);

    } catch (err: any) {
      console.error('[useVoiceRoom] Join voice room breakdown error:', err);
      setErrorCode(err.message || 'حدث خطأ غير متوقع أثناء الانضمام.');
      setLoading(false);
      leaveRoom();
    }
  }, [joined, loading, startSpeakingDetector, leaveRoom, handleIncomingOffer, handleIncomingAnswer, handleIncomingIceCandidate, initiateOffer, closePeerConnection]);

  // Sync state selectors actions toggles
  const toggleMute = useCallback(() => {
    const nextValue = !isMuted;
    setIsMuted(nextValue);
    setMuteState(nextValue);
    socketService.emit('state-change', { isMuted: nextValue });
    syncLocalMemberStates({ isMuted: nextValue });
  }, [isMuted, syncLocalMemberStates]);

  const toggleDeafen = useCallback(() => {
    const nextValue = !isDeafened;
    setIsDeafened(nextValue);
    setDeafenState(nextValue);
    
    // Deafen forces Mute in Discord-like systems
    const nextMute = nextValue ? true : isMuted;
    setIsMuted(nextMute);
    setMuteState(nextMute);

    socketService.emit('state-change', { 
      isDeafened: nextValue, 
      isMuted: nextMute 
    });

    syncLocalMemberStates({ 
      isDeafened: nextValue, 
      isMuted: nextMute 
    });
  }, [isDeafened, isMuted, syncLocalMemberStates]);

  const toggleHandRaise = useCallback(() => {
    const nextValue = !handRaised;
    setHandRaised(nextValue);
    socketService.emit('state-change', { handRaised: nextValue });
    syncLocalMemberStates({ handRaised: nextValue });
  }, [handRaised, syncLocalMemberStates]);

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
    banMember,
    
    // Diagnostics Exports
    socketStatus,
    socketId,
    connectedPeers,
    firestoreStatus,
    webrtcStatus,
    microphoneStatus
  };
}
