import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { socketService } from '../services/socket.service';
import { VoiceMember, VoiceRoom } from '../types/voice';

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

interface PeerWrapper {
  peerConnection: RTCPeerConnection;
  audioElement: HTMLAudioElement;
  stream: MediaStream;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  polite: boolean;
}

export function useVoiceRoom(roomId: string | undefined) {
  const [joined, setJoined] = useState(false);
  const [members, setMembers] = useState<VoiceMember[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Connection diagnostics states
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected' | 'authenticated' | 'joined_room' | 'disconnected' | 'reconnecting' | 'failed'>('idle');
  const [socketId, setSocketId] = useState('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [firestoreStatus, setFirestoreStatus] = useState('جاهز / Ready');
  const [webrtcStatus, setWebrtcStatus] = useState('غير متصل / Disconnected');
  const [microphoneStatus, setMicrophoneStatus] = useState('غير نشط / Inactive');

  // References to preserve objects across renders
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerWrapper>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const diagnosticUpdateTrigger = useRef<number>(0);

  // Keep references to state values to prevent dependency triggers inside closures
  const isMutedRef = useRef(false);
  const isDeafenedRef = useRef(false);
  const handRaisedRef = useRef(false);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isDeafenedRef.current = isDeafened; }, [isDeafened]);
  useEffect(() => { handRaisedRef.current = handRaised; }, [handRaised]);

  // Force trigger reactive updates for diagnostics
  const triggerDiagnosticUpdate = useCallback(() => {
    diagnosticUpdateTrigger.current += 1;
  }, []);

  // Set Mute state at media level
  const setMuteState = useCallback((muted: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }, []);

  // Set Deafen state
  const setDeafenState = useCallback((deafened: boolean) => {
    peerConnectionsRef.current.forEach(wrapper => {
      wrapper.audioElement.muted = deafened;
    });
  }, []);

  // Request Microphone Mediastream with Noise Suppression & Echo Cancellation
  const startLocalMic = useCallback(async () => {
    try {
      console.log('[useVoiceRoom] Requesting browser microphone permissions with EchoCancellation...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        },
        video: false
      });
      console.log('[useVoiceRoom] Microphone stream captured successfully.');
      setMicrophoneStatus('نشط ومتصل 🎤 (EchoCancellation)');
      return stream;
    } catch (err: any) {
      console.error('[useVoiceRoom] Microphone access denied:', err);
      setMicrophoneStatus('تم رفض الصلاحية / Permission Denied ❌');
      throw new Error('فشل الوصول إلى المايكروفون. يرجى تفعيل الصلاحية والموافقة عليها.');
    }
  }, []);

  // Stop local micro stream
  const stopLocalMic = useCallback(() => {
    if (localStreamRef.current) {
      console.log('[useVoiceRoom] Stopping local audio tracks stream...');
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setMicrophoneStatus('غير نشط / Inactive');
  }, []);

  // Speech Recognition & Volumetric Input Analyzer Loop
  const startSpeakingDetector = useCallback((stream: MediaStream) => {
    try {
      if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let isLocalSpeaking = false;

      speakingIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || isMutedRef.current || isDeafenedRef.current) {
          if (isLocalSpeaking) {
            isLocalSpeaking = false;
            setIsSpeaking(false);
            socketService.emit('state-change', { isSpeaking: false });
            syncLocalMemberStates({ isSpeaking: false });
          }
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const speakingThreshold = 10; // Decibel sensitivity trigger
        const isCurrentlySpeaking = average > speakingThreshold;

        if (isCurrentlySpeaking !== isLocalSpeaking) {
          isLocalSpeaking = isCurrentlySpeaking;
          setIsSpeaking(isCurrentlySpeaking);
          socketService.emit('state-change', { isSpeaking: isCurrentlySpeaking });
          syncLocalMemberStates({ isSpeaking: isCurrentlySpeaking });
        }
      }, 250);

    } catch (err) {
      console.warn('[useVoiceRoom] Speaking detector failed initialization:', err);
    }
  }, []);

  // Stop analyser
  const stopSpeakingDetector = useCallback(() => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsSpeaking(false);
  }, []);

  // Close specific peer connection
  const closePeerConnection = useCallback((socketIdToClose: string) => {
    const wrapper = peerConnectionsRef.current.get(socketIdToClose);
    if (wrapper) {
      console.log(`[useVoiceRoom] Closing RTCPeerConnection for peer: ${socketIdToClose}`);
      try {
        wrapper.peerConnection.close();
      } catch (err) {}
      try {
        wrapper.audioElement.srcObject = null;
        wrapper.audioElement.remove();
      } catch (err) {}
      try {
        wrapper.stream.getTracks().forEach(track => track.stop());
      } catch (err) {}
      
      peerConnectionsRef.current.delete(socketIdToClose);
      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
      triggerDiagnosticUpdate();
    }
  }, [triggerDiagnosticUpdate]);

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

  // WebRTC Signaling: Initiate New Offer following Perfect Negotiation
  const initiateOffer = useCallback(async (targetSocketId: string) => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      console.warn(`[PerfectNegotiation] RTCPeerConnection already exists for ${targetSocketId}. Skipping duplicate.`);
      return;
    }

    console.log(`[PerfectNegotiation] Constructing RTCPeerConnection for outgoing offer setup to: ${targetSocketId}`);
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      const audioObj = new Audio();
      audioObj.autoplay = true;
      audioObj.muted = isDeafenedRef.current;
      const remoteStream = new MediaStream();

      // Choice of polite/impolite using lexicographical comparison of socket IDs
      const socketIdSelf = socketService.getSocket()?.id || '';
      const polite = socketIdSelf > targetSocketId;

      const wrapper: PeerWrapper = {
        peerConnection: pc,
        audioElement: audioObj,
        stream: remoteStream,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
        polite
      };
      peerConnectionsRef.current.set(targetSocketId, wrapper);

      // Attach our local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketService.getSocket()?.connected) {
          socketService.emit('webrtc-ice-candidate', {
            targetSocketId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log(`[useVoiceRoom] Received audio track on link from ${targetSocketId}`);
        event.streams[0].getAudioTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        audioObj.srcObject = remoteStream;
        setWebrtcStatus('متصل P2P Mesh Connected ✅');
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[useVoiceRoom] ICE connection state with ${targetSocketId}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          closePeerConnection(targetSocketId);
        }
        triggerDiagnosticUpdate();
      };

      pc.onsignalingstatechange = () => {
        triggerDiagnosticUpdate();
      };

      wrapper.makingOffer = true;
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);
      wrapper.makingOffer = false;

      if (socketService.getSocket()?.connected) {
        socketService.emit('webrtc-offer', {
          targetSocketId,
          offer
        });
      }

      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
      triggerDiagnosticUpdate();
    } catch (err) {
      console.error(`[useVoiceRoom] initiateOffer failed for ${targetSocketId}:`, err);
    }
  }, [closePeerConnection, triggerDiagnosticUpdate]);

  // WebRTC Signaling: Handle Incoming Offer with Collision Resolution
  const handleIncomingOffer = useCallback(async (fromSocketId: string, offer: RTCSessionDescriptionInit) => {
    let wrapper = peerConnectionsRef.current.get(fromSocketId);
    
    if (!wrapper) {
      const pc = new RTCPeerConnection(rtcConfig);
      const audioObj = new Audio();
      audioObj.autoplay = true;
      audioObj.muted = isDeafenedRef.current;
      const remoteStream = new MediaStream();

      const socketIdSelf = socketService.getSocket()?.id || '';
      const polite = socketIdSelf > fromSocketId;

      wrapper = {
        peerConnection: pc,
        audioElement: audioObj,
        stream: remoteStream,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
        polite
      };
      peerConnectionsRef.current.set(fromSocketId, wrapper);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketService.getSocket()?.connected) {
          socketService.emit('webrtc-ice-candidate', {
            targetSocketId: fromSocketId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log(`[useVoiceRoom] Received audio track in response of from ${fromSocketId}`);
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
        triggerDiagnosticUpdate();
      };

      pc.onsignalingstatechange = () => {
        triggerDiagnosticUpdate();
      };
    }

    const pc = wrapper.peerConnection;
    const offerCollision = (offer.type === 'offer') && 
      (wrapper.makingOffer || pc.signalingState !== 'stable');

    wrapper.ignoreOffer = false;
    if (offerCollision) {
      if (!wrapper.polite) {
        wrapper.ignoreOffer = true;
        console.warn(`[PerfectNegotiation] Collision! Impolite peer ignoring offer from ${fromSocketId}`);
        return;
      }
      console.log(`[PerfectNegotiation] Collision! Polite peer rolling back existing offer for incoming offer from ${fromSocketId}`);
      try {
        await pc.setLocalDescription({ type: 'rollback' });
      } catch (err) {
        console.warn(`[PerfectNegotiation] Rollback minor warning:`, err);
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socketService.getSocket()?.connected) {
        socketService.emit('webrtc-answer', {
          targetSocketId: fromSocketId,
          answer
        });
      }

      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
      triggerDiagnosticUpdate();
    } catch (err) {
      console.error(`[useVoiceRoom] handleIncomingOffer error from ${fromSocketId}:`, err);
    }
  }, [closePeerConnection, triggerDiagnosticUpdate]);

  // WebRTC Signaling: Handle Incoming Answer
  const handleIncomingAnswer = useCallback(async (fromSocketId: string, answer: RTCSessionDescriptionInit) => {
    const wrapper = peerConnectionsRef.current.get(fromSocketId);
    if (!wrapper) return;
    
    const pc = wrapper.peerConnection;
    console.log(`[PerfectNegotiation] Applying remote answer for: ${fromSocketId}. State: ${pc.signalingState}`);

    if (pc.signalingState === 'stable') {
      console.warn(`[PerfectNegotiation] Answer received in stable state. Ignoring duplicate answer from ${fromSocketId}.`);
      return;
    }

    if (pc.signalingState !== 'have-local-offer') {
      console.warn(`[PerfectNegotiation] Warning: Cannot apply answer inside state: ${pc.signalingState}`);
      return;
    }

    try {
      wrapper.isSettingRemoteAnswerPending = true;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      wrapper.isSettingRemoteAnswerPending = false;
      triggerDiagnosticUpdate();
    } catch (err) {
      console.error(`[useVoiceRoom] Setting remote answer failed:`, err);
      wrapper.isSettingRemoteAnswerPending = false;
    }
  }, [triggerDiagnosticUpdate]);

  // WebRTC Signaling: Handle Incoming ICE Candidate
  const handleIncomingIceCandidate = useCallback(async (fromSocketId: string, candidate: RTCIceCandidateInit) => {
    const wrapper = peerConnectionsRef.current.get(fromSocketId);
    if (wrapper) {
      const pc = wrapper.peerConnection;
      if (!pc.remoteDescription) {
        console.warn(`[PerfectNegotiation] Remote description not apply yet for ${fromSocketId}. Skipping ice till applied.`);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`[useVoiceRoom] Adding ICE candidate failure:`, err);
      }
    }
  }, []);

  // Tear down all components
  const resetAllVoiceEngine = useCallback(() => {
    console.log('[useVoiceRoom] Resetting audio context and peer connections...');
    Array.from(peerConnectionsRef.current.keys()).forEach(socketId => {
      closePeerConnection(socketId);
    });
    peerConnectionsRef.current.clear();
    stopLocalMic();
    setConnectedPeers([]);
  }, [closePeerConnection, stopLocalMic]);

  // Leave Room Flow
  const leaveRoom = useCallback(async () => {
    console.log('[useVoiceRoom] Executing exit room protocol...');
    setLoading(true);
    setFirestoreStatus('جاري تسجيل مغادرة القنوات...');
    
    stopSpeakingDetector();
    resetAllVoiceEngine();

    // Silently handle socket emits
    socketService.emit('leave-room', {});
    socketService.disconnect();
    setSocketStatus('disconnected');
    setSocketId('');

    if (roomId && auth.currentUser) {
      try {
        const memberRef = doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid);
        await deleteDoc(memberRef);

        await setDoc(doc(db, `voice_rooms/${roomId}/events`, `evt-${Date.now()}`), {
          type: 'leave',
          uid: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });

        const membersSnapshot = await getDocs(collection(db, `voice_rooms/${roomId}/members`));
        await updateDoc(doc(db, 'voice_rooms', roomId), {
          memberCount: Math.max(0, membersSnapshot.size),
          updatedAt: new Date().toISOString()
        });

        setFirestoreStatus('تم مغادرة الغرفة بنجاح 🔴');
      } catch (err) {
        console.warn('[useVoiceRoom] Firestore presence cleanup bypassed:', err);
        setFirestoreStatus('تم الانفصال مع تحذير بالحضور ⚠️');
      }
    }

    localStreamRef.current = null;
    setJoined(false);
    setMembers([]);
    setIsMuted(false);
    setIsDeafened(false);
    setHandRaised(false);
    setLoading(false);
    setErrorCode(null);
    setMicrophoneStatus('غير متصل / Offline');
    setWebrtcStatus('تم إنهاء الاتصالات / Disconnected');
    triggerDiagnosticUpdate();
  }, [roomId, stopSpeakingDetector, resetAllVoiceEngine, triggerDiagnosticUpdate]);

  // Reconnection & Secure Join Room Flow incorporating Step 6 Order Requirement
  const joinRoom = useCallback(async (room: VoiceRoom) => {
    if (!room || joined || loading) return;

    setLoading(true);
    setErrorCode(null);
    setFirestoreStatus('جاري التحقق من الهوية والصلاحيات والمحظورين...');
    setMicrophoneStatus('جاري طلب المايكروفون...');
    setWebrtcStatus('بانتظار بناء شبكة P2P Mesh...');
    
    console.log(`[useVoiceRoom] Joining Voice Room: "${room.name}" (${room.id})`);

    try {
      // 1. Firebase Auth Ready & 2. currentUser Check
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('يجب تسجيل الدخول للانضمام للغرفة الصوتية.');
      }

      // 3. Check access permissions from Firestore
      const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
      let currentRole: 'admin' | 'moderator' | 'teacher' | 'student' = 'student';
      if (currentUser.email === 'abdulmlikoog@gmail.com') {
        currentRole = 'admin';
      } else if (userDocSnap.exists()) {
        const d = userDocSnap.data();
        if (d.role) currentRole = d.role;
      }

      if (room.allowedRoles && room.allowedRoles.length > 0 && !room.allowedRoles.includes(currentRole)) {
        throw new Error('ليس لديك الصلاحيات والأدوار المطلوبة لدخول هذه الغرفة الصوتية المخصصة.');
      }

      const banDocSnap = await getDoc(doc(db, `voice_rooms/${room.id}/bans`, currentUser.uid));
      if (banDocSnap.exists()) {
        const banData = banDocSnap.data();
        throw new Error(`أنت محظور من دخول هذه الغرفة. السبب: ${banData.reason || 'مخالفة القوانين'}`);
      }

      // 4-5. Request browser microphone controls and initialize localStream
      const stream = await startLocalMic();
      localStreamRef.current = stream;

      // 6-7. Open Socket.IO Client signaling with refreshed Firebase ID Token
      setSocketStatus('connecting');
      const token = await currentUser.getIdToken(true);
      const socket = socketService.connect(token);

      if (socket.connected) {
        setSocketStatus('connected');
        setSocketId(socket.id || '');
      }

      // Event-based Connection Monitoring & Automatic Re-Join Room on reconnect
      socket.off('connect');
      socket.on('connect', () => {
        console.log('[useVoiceRoom] Socket connected/reconnected. Sending auth authentication credentials...');
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
        console.warn('[useVoiceRoom] Signaling Link Offline. Reconnecting...');
        setSocketStatus('reconnecting');
        setWebrtcStatus('الاتصال منقطع / Reconnecting signal...');
      });

      // Join room directly if already connected
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

      // 11. Creating Presence documents in Firestore voice_rooms/{roomId}/members/{uid}
      setFirestoreStatus('جاري تفعيل الحضور الرقمي...');
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

      await setDoc(doc(db, `voice_rooms/${room.id}/events`, `evt-${Date.now()}`), {
        type: 'join',
        uid: currentUser.uid,
        createdAt: new Date().toISOString()
      });

      // Update room count
      const membersSnapshot = await getDocs(collection(db, `voice_rooms/${room.id}/members`));
      await updateDoc(doc(db, 'voice_rooms', room.id), {
        memberCount: membersSnapshot.size,
        updatedAt: new Date().toISOString()
      });
      setFirestoreStatus('الحضور نشط ومتصل 🟢');

      // Setup Socket Listeners
      socket.off('error-msg');
      socket.on('error-msg', (data: { message: string }) => {
        console.error('[useVoiceRoom] Socket error response:', data);
        setErrorCode(data.message);
        leaveRoom();
      });

      // 12. Retrieve list of active members & 13. Build RTC Connections
      socket.off('room-members-list');
      socket.on('room-members-list', async (data: { members: any[] }) => {
        console.log(`[useVoiceRoom] Populated peer connections list:`, data.members);
        setWebrtcStatus(`جاري بناء الاتصال P2P Mesh مع (${data.members.length}) مستخدمين`);
        setSocketStatus('joined_room');

        const fullList: VoiceMember[] = [
          { ...selfMemberRecord, socketId: socket.id || '', isOnline: true },
          ...data.members
        ];
        setMembers(fullList);

        // Establish 1-to-1 P2P RTCPeerConnection Offer loops
        for (const peer of data.members) {
          await initiateOffer(peer.socketId);
        }
      });

      // Passive notification of other members
      socket.off('peer-joined');
      socket.on('peer-joined', (data: { peer: any }) => {
        console.log(`[useVoiceRoom] Remote peer connected: ${data.peer.displayName}`);
        setMembers(prev => {
          if (prev.some(m => m.socketId === data.peer.socketId)) return prev;
          return [...prev, data.peer];
        });
      });

      socket.off('user-joined');
      socket.on('user-joined', (data: { peer: any }) => {
        console.log(`[useVoiceRoom] Remote user tracking connected: ${data.peer.displayName}`);
        setMembers(prev => {
          if (prev.some(m => m.socketId === data.peer.socketId)) return prev;
          return [...prev, data.peer];
        });
      });

      // WebRTC relays
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

      // Removal of peers
      socket.off('peer-left');
      socket.on('peer-left', (data: { socketId: string; uid: string }) => {
        console.log(`[useVoiceRoom] Remote peer departed: ${data.socketId}`);
        closePeerConnection(data.socketId);
        setMembers(prev => prev.filter(m => m.socketId !== data.socketId));
      });

      socket.off('user-left');
      socket.on('user-left', (data: { socketId: string; uid: string }) => {
        console.log(`[useVoiceRoom] Remote user track departed: ${data.socketId}`);
        closePeerConnection(data.socketId);
        setMembers(prev => prev.filter(m => m.socketId !== data.socketId));
      });

      // Remote State modifications
      socket.off('peer-state-changed');
      socket.on('peer-state-changed', (data: { socketId: string; uid: string; fields: any }) => {
        setMembers(prev => prev.map(m => {
          if (m.socketId === data.socketId) {
            return { ...m, ...data.fields };
          }
          return m;
        }));
      });

      // Moderation response
      socket.off('kicked-from-room');
      socket.on('kicked-from-room', (data: { kickedBy: string; reason: string }) => {
        alert(`تم طردك من القناة الصوتية بواسطة: ${data.kickedBy}\nالسبب: ${data.reason}`);
        leaveRoom();
      });

      socket.off('banned-from-room');
      socket.on('banned-from-room', (data: { bannedBy: string; reason: string }) => {
        alert(`تم حظرك من هذه القناة بواسطة: ${data.bannedBy}\nالسبب: ${data.reason}`);
        leaveRoom();
      });

      // Start input levels speaking analysis
      startSpeakingDetector(stream);

      // Finished
      setJoined(true);
      setLoading(false);
      triggerDiagnosticUpdate();

    } catch (err: any) {
      console.error('[useVoiceRoom] Join voice room breakdown error:', err);
      setErrorCode(err.message || 'حدث خطأ غير متوقع أثناء الانضمام.');
      setLoading(false);
      leaveRoom();
    }
  }, [joined, loading, startSpeakingDetector, leaveRoom, handleIncomingOffer, handleIncomingAnswer, handleIncomingIceCandidate, initiateOffer, closePeerConnection, startLocalMic, triggerDiagnosticUpdate]);

  // Presence Heartbeat Loop (Step 7 requirement)
  useEffect(() => {
    if (!joined || !roomId || !auth.currentUser) return;

    console.log('[Heartbeat] Starting 15s presence heartbeat ticker...');
    const interval = setInterval(async () => {
      try {
        const memberRef = doc(db, `voice_rooms/${roomId}/members`, auth.currentUser!.uid);
        await updateDoc(memberRef, {
          lastSeen: new Date().toISOString(),
          isOnline: true
        });
        console.log('[Heartbeat] Updated user lastSeen presence.');
      } catch (err) {
        console.warn('[Heartbeat] Presences document update offline or skipped:', err);
      }
    }, 15000);

    return () => {
      console.log('[Heartbeat] Clearing presence heartbeat ticker...');
      clearInterval(interval);
    };
  }, [joined, roomId]);

  // Sync state actions
  const toggleMute = useCallback(() => {
    const nextValue = !isMuted;
    setIsMuted(nextValue);
    setMuteState(nextValue);
    socketService.emit('state-change', { isMuted: nextValue });
    syncLocalMemberStates({ isMuted: nextValue });
  }, [isMuted, setMuteState, syncLocalMemberStates]);

  const toggleDeafen = useCallback(() => {
    const nextValue = !isDeafened;
    setIsDeafened(nextValue);
    setDeafenState(nextValue);
    
    // Deafen forces Mute
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
  }, [isDeafened, isMuted, setDeafenState, setMuteState, syncLocalMemberStates]);

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

  // Compute states mapping for signaling states diagnostic
  const peerSignalingStates: Record<string, string> = {};
  const peerIceConnectionStates: Record<string, string> = {};
  peerConnectionsRef.current.forEach((wrap, peerId) => {
    peerSignalingStates[peerId] = wrap.peerConnection.signalingState;
    peerIceConnectionStates[peerId] = wrap.peerConnection.iceConnectionState;
  });

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
    microphoneStatus,
    peerSignalingStates,
    peerIceConnectionStates,
    diagnosticUpdateTrigger: diagnosticUpdateTrigger.current
  };
}
