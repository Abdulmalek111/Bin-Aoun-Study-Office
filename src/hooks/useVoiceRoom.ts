import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
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

  // Connection diagnostics states (mocked/mapped cleanly mapping Firebase status)
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

  // Active unsubscibers list to clear listeners on leaveRoom
  const activeUnsubscribesRef = useRef<(() => void)[]>([]);

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

      speakingIntervalRef.current = setInterval(async () => {
        if (!analyserRef.current || isMutedRef.current || isDeafenedRef.current) {
          if (isLocalSpeaking) {
            isLocalSpeaking = false;
            setIsSpeaking(false);
            if (roomId && auth.currentUser) {
              try {
                await updateDoc(doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid), { isSpeaking: false });
              } catch (e) {}
            }
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
          if (roomId && auth.currentUser) {
            try {
              await updateDoc(doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid), { isSpeaking: isCurrentlySpeaking });
            } catch (e) {}
          }
        }
      }, 250);

    } catch (err) {
      console.warn('[useVoiceRoom] Speaking detector failed initialization:', err);
    }
  }, [roomId]);

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
  const closePeerConnection = useCallback((peerUid: string) => {
    const wrapper = peerConnectionsRef.current.get(peerUid);
    if (wrapper) {
      console.log(`[useVoiceRoom] Closing RTCPeerConnection for peer UID: ${peerUid}`);
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
      
      peerConnectionsRef.current.delete(peerUid);
      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
      triggerDiagnosticUpdate();
    }
  }, [triggerDiagnosticUpdate]);

  // Clean connection reset
  const resetAllVoiceEngine = useCallback(() => {
    console.log('[useVoiceRoom] Resetting audio context and peer connections...');
    Array.from(peerConnectionsRef.current.keys()).forEach(peerUid => {
      closePeerConnection(peerUid);
    });
    peerConnectionsRef.current.clear();
    stopLocalMic();
    setConnectedPeers([]);
  }, [closePeerConnection, stopLocalMic]);

  // Leave Room Flow (complete teardown + clean presence & calls)
  const leaveRoom = useCallback(async () => {
    console.log('[useVoiceRoom] Executing exit room protocol...');
    setLoading(true);
    setFirestoreStatus('جاري تسجيل مغادرة القنوات...');
    
    stopSpeakingDetector();
    resetAllVoiceEngine();

    // Fire all unsubscribers from real-time collections
    activeUnsubscribesRef.current.forEach(unsub => {
      try {
        unsub();
      } catch (e) {}
    });
    activeUnsubscribesRef.current = [];

    // Reset diagnostics
    setSocketStatus('disconnected');
    setSocketId('');

    if (roomId && auth.currentUser) {
      const myUid = auth.currentUser.uid;
      try {
        // Remove or mark offline inside members subcollection
        const memberRef = doc(db, `voice_rooms/${roomId}/members`, myUid);
        await deleteDoc(memberRef);

        await setDoc(doc(db, `voice_rooms/${roomId}/events`, `evt-${Date.now()}`), {
          type: 'leave',
          uid: myUid,
          createdAt: new Date().toISOString()
        });

        // Delete any active call links where we are involved
        const p1 = `${myUid}_`;
        peerConnectionsRef.current.forEach(async (_, peerUid) => {
          const callIdSmallFirst = myUid < peerUid ? `${myUid}_${peerUid}` : `${peerUid}_${myUid}`;
          try {
            await deleteDoc(doc(db, `voice_rooms/${roomId}/calls`, callIdSmallFirst));
          } catch (e) {}
        });

        // Trigger safe room counters re-evaluation
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

  // Call Initiation Loop Helper following perfect negotiation
  const initiateOutgoingCall = useCallback(async (peerUid: string) => {
    if (!roomId || !auth.currentUser) return;
    const myUid = auth.currentUser.uid;
    const callId = `${myUid}_${peerUid}`;

    if (peerConnectionsRef.current.has(peerUid)) {
      console.warn(`[PerfectNegotiation] PeerConnection already active for ${peerUid}. Skipping.`);
      return;
    }

    console.log(`[PerfectNegotiation] [Caller] Creating connection for outgoing call: ${callId}`);
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      const audioObj = new Audio();
      audioObj.autoplay = true;
      audioObj.muted = isDeafenedRef.current;
      const remoteStream = new MediaStream();

      const wrapper: PeerWrapper = {
        peerConnection: pc,
        audioElement: audioObj,
        stream: remoteStream,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
        polite: false // Caller is impolite
      };
      peerConnectionsRef.current.set(peerUid, wrapper);

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handler for gather candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            const candRef = doc(collection(db, 'voice_rooms', roomId, 'calls', callId, 'callerCandidates'));
            await setDoc(candRef, {
              candidate: event.candidate.candidate || '',
              sdpMid: event.candidate.sdpMid || '',
              sdpMLineIndex: event.candidate.sdpMLineIndex || 0
            });
          } catch (err) {
            console.error('Failed writing caller candidate:', err);
          }
        }
      };

      pc.ontrack = (event) => {
        console.log(`[PerfectNegotiation] Caller received WebRTC track from user: ${peerUid}`);
        event.streams[0].getAudioTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        audioObj.srcObject = remoteStream;
        setWebrtcStatus('متصل P2P Mesh Connected ✅');
        triggerDiagnosticUpdate();
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[PerfectNegotiation] Caller ICE state with ${peerUid}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          closePeerConnection(peerUid);
        }
        triggerDiagnosticUpdate();
      };

      pc.onsignalingstatechange = () => {
        triggerDiagnosticUpdate();
      };

      // 1. Write structured calling record BEFORE SDP setups
      const callRef = doc(db, 'voice_rooms', roomId, 'calls', callId);
      await setDoc(callRef, {
        callerId: myUid,
        calleeId: peerUid,
        status: 'calling',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // 2. Negotiate SDP
      wrapper.makingOffer = true;
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);
      wrapper.makingOffer = false;

      // 3. Write SDP to call document
      await updateDoc(callRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        updatedAt: Date.now()
      });

      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
      triggerDiagnosticUpdate();

    } catch (err) {
      console.error(`[PerfectNegotiation] Outgoing call flow failed to ${peerUid}:`, err);
    }
  }, [roomId, closePeerConnection, triggerDiagnosticUpdate]);

  // Answer Incoming Call Helper
  const handleIncomingCall = useCallback(async (callId: string, callData: any) => {
    if (!roomId || !auth.currentUser) return;
    const myUid = auth.currentUser.uid;
    const callerId = callData.callerId;

    let wrapper = peerConnectionsRef.current.get(callerId);

    if (!wrapper) {
      console.log(`[PerfectNegotiation] [Callee] New call from ${callerId} detected.`);
      const pc = new RTCPeerConnection(rtcConfig);
      const audioObj = new Audio();
      audioObj.autoplay = true;
      audioObj.muted = isDeafenedRef.current;
      const remoteStream = new MediaStream();

      wrapper = {
        peerConnection: pc,
        audioElement: audioObj,
        stream: remoteStream,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
        polite: true // Callee is polite
      };
      peerConnectionsRef.current.set(callerId, wrapper);

      // Attach our tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Record candidate
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            const candRef = doc(collection(db, 'voice_rooms', roomId, 'calls', callId, 'calleeCandidates'));
            await setDoc(candRef, {
              candidate: event.candidate.candidate || '',
              sdpMid: event.candidate.sdpMid || '',
              sdpMLineIndex: event.candidate.sdpMLineIndex || 0
            });
          } catch (err) {
            console.error('Failed writing callee candidate:', err);
          }
        }
      };

      pc.ontrack = (event) => {
        console.log(`[PerfectNegotiation] Callee received WebRTC track from user: ${callerId}`);
        event.streams[0].getAudioTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        audioObj.srcObject = remoteStream;
        setWebrtcStatus('متصل P2P Mesh Connected ✅');
        triggerDiagnosticUpdate();
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[PerfectNegotiation] Callee ICE state with ${callerId}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          closePeerConnection(callerId);
        }
        triggerDiagnosticUpdate();
      };

      pc.onsignalingstatechange = () => {
        triggerDiagnosticUpdate();
      };

      // Subscribe to caller candidates
      const callerCandUnsub = onSnapshot(
        collection(db, 'voice_rooms', roomId, 'calls', callId, 'callerCandidates'),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              try {
                const candidate = new RTCIceCandidate({
                  candidate: data.candidate,
                  sdpMid: data.sdpMid,
                  sdpMLineIndex: data.sdpMLineIndex
                });
                await pc.addIceCandidate(candidate);
                console.log(`[PerfectNegotiation] Callee applied caller candidate from: ${callerId}`);
              } catch (e) {
                console.warn('Callee failed applying caller ICE candidate direct link:', e);
              }
            }
          });
        }
      );
      activeUnsubscribesRef.current.push(callerCandUnsub);

      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
      triggerDiagnosticUpdate();
    }

    const pc = wrapper.peerConnection;
    const offerCollision = (callData.offer && callData.offer.type === 'offer') && 
      (wrapper.makingOffer || pc.signalingState !== 'stable');

    wrapper.ignoreOffer = false;
    if (offerCollision) {
      if (!wrapper.polite) {
        wrapper.ignoreOffer = true;
        console.warn(`[PerfectNegotiation] Collision! Impolite peer ignoring incoming offer from ${callerId}`);
        return;
      }
      console.log(`[PerfectNegotiation] Collision! Polite peer rolling back for incoming offer from ${callerId}`);
      try {
        await pc.setLocalDescription({ type: 'rollback' });
      } catch (err) {
        console.warn(`[PerfectNegotiation] Rollback minor warning:`, err);
      }
    }

    if (callData.offer && pc.signalingState !== 'stable' && !wrapper.ignoreOffer) {
      try {
        wrapper.isSettingRemoteAnswerPending = true;
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
        wrapper.isSettingRemoteAnswerPending = false;

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateDoc(doc(db, 'voice_rooms', roomId, 'calls', callId), {
          status: 'accepted',
          answer: {
            type: answer.type,
            sdp: answer.sdp
          },
          updatedAt: Date.now()
        });
        console.log(`[PerfectNegotiation] Answer sent back successfully to: ${callerId}`);
      } catch (err) {
        console.error(`[PerfectNegotiation] Failed responding answer to ${callerId}:`, err);
        wrapper.isSettingRemoteAnswerPending = false;
      }
    }
  }, [roomId, closePeerConnection, triggerDiagnosticUpdate]);

  // Main Secure Join Room Flow
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

      const myUid = currentUser.uid;

      // 3. Check access permissions from Firestore
      const userDocSnap = await getDoc(doc(db, 'users', myUid));
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

      const banDocSnap = await getDoc(doc(db, `voice_rooms/${room.id}/bans`, myUid));
      if (banDocSnap.exists()) {
        const banData = banDocSnap.data();
        throw new Error(`أنت محظور من دخول هذه الغرفة. السبب: ${banData.reason || 'مخالفة القوانين'}`);
      }

      // 4-5. Request browser microphone controls and initialize localStream
      const stream = await startLocalMic();
      localStreamRef.current = stream;

      // Mock setup of Socket variables to allow GUI compiling without erroring
      setSocketStatus('authenticated');
      setSocketId(myUid);

      // 11. Creating Presence documents in Firestore voice_rooms/{roomId}/members/{uid}
      setFirestoreStatus('جاري تفعيل الحضور الرقمي...');
      const selfMemberRecord: VoiceMember = {
        uid: myUid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب',
        photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'X')}`,
        role: currentRole,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        handRaised: false,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        socketId: myUid, // Backward-compatible mapping of peer identifiers
        isOnline: true
      };

      await setDoc(doc(db, `voice_rooms/${room.id}/members`, myUid), selfMemberRecord);

      await setDoc(doc(db, `voice_rooms/${room.id}/events`, `evt-${Date.now()}`), {
        type: 'join',
        uid: myUid,
        createdAt: new Date().toISOString()
      });

      // Update room metadata count
      const initialSnapshot = await getDocs(collection(db, `voice_rooms/${room.id}/members`));
      await updateDoc(doc(db, 'voice_rooms', room.id), {
        memberCount: initialSnapshot.size,
        updatedAt: new Date().toISOString()
      });
      setFirestoreStatus('الحضور نشط ومتصل 🟢');

      // --- FIRESTORE signaling listeners ---

      // Listen for all room members changes
      const membersUnsub = onSnapshot(collection(db, `voice_rooms/${room.id}/members`), (snapshot) => {
        const nowMs = Date.now();
        const activeList: VoiceMember[] = [];
        let hasSelfRecord = false;

        snapshot.docs.forEach((d) => {
          const data = d.data() as VoiceMember;
          const lastSeenMs = data.lastSeen ? new Date(data.lastSeen).getTime() : 0;
          const diffSeconds = (nowMs - lastSeenMs) / 1000;

          // Only keep members reporting active heartbeat <= 45s (preventing ghost players)
          if (data.isOnline && diffSeconds < 45) {
            activeList.push(data);
          }
          if (data.uid === myUid) {
            hasSelfRecord = true;
          }
        });

        // Kicked / Banned detection check
        if (!hasSelfRecord && joined) {
          console.warn('[useVoiceRoom] Self record missing! Executing kicked exit routine.');
          alert('تم طردك أو حظرك من الغرفة الصوتية بواسطة المشرف!');
          leaveRoom();
          return;
        }

        setMembers(activeList);

        // Initiate P2P mesh links if I am the Caller (lexicographically smaller UID)
        activeList.forEach((peer) => {
          if (peer.uid !== myUid) {
            if (myUid < peer.uid) {
              // Initiate outgoing offer
              initiateOutgoingCall(peer.uid);
            }
          }
        });
      });
      activeUnsubscribesRef.current.push(membersUnsub);

      // Listen to INCALLS (where callerId == myUid) -> to receive and apply peer answers
      const callerQuery = query(collection(db, `voice_rooms/${room.id}/calls`), where('callerId', '==', myUid));
      const callerCallsUnsub = onSnapshot(callerQuery, (snapshot) => {
        snapshot.docs.forEach(async (docSnap) => {
          const callData = docSnap.data();
          const puid = callData.calleeId;
          const wrapper = peerConnectionsRef.current.get(puid);

          if (wrapper && callData.status === 'accepted' && callData.answer) {
            const pc = wrapper.peerConnection;
            if (pc.signalingState === 'have-local-offer') {
              try {
                wrapper.isSettingRemoteAnswerPending = true;
                await pc.setRemoteDescription(new RTCSessionDescription(callData.answer));
                wrapper.isSettingRemoteAnswerPending = false;
                console.log(`[PerfectNegotiation] Caller applied remote answer from user: ${puid}`);

                // Subscribe to callee candidates now that remote description is set
                const calleeCandQueryRef = collection(db, 'voice_rooms', room.id, 'calls', docSnap.id, 'calleeCandidates');
                const calleeCandUnsub = onSnapshot(calleeCandQueryRef, (snapCand) => {
                  snapCand.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                      const data = change.doc.data();
                      try {
                        const candidate = new RTCIceCandidate({
                          candidate: data.candidate,
                          sdpMid: data.sdpMid,
                          sdpMLineIndex: data.sdpMLineIndex
                        });
                        await pc.addIceCandidate(candidate);
                        console.log(`[PerfectNegotiation] Caller applied ICE candidate from callee: ${puid}`);
                      } catch (e) {
                        console.warn('Caller failed applying candidate:', e);
                      }
                    }
                  });
                });
                activeUnsubscribesRef.current.push(calleeCandUnsub);

              } catch (err) {
                console.error('[PerfectNegotiation] Caller remote answer failed:', err);
                wrapper.isSettingRemoteAnswerPending = false;
              }
            }
          } else if (wrapper && callData.status === 'ended') {
            closePeerConnection(puid);
          }
        });
      });
      activeUnsubscribesRef.current.push(callerCallsUnsub);

      // Listen to INCOMING CALLS (where calleeId == myUid) -> to receive offers and send back answers
      const calleeQuery = query(collection(db, `voice_rooms/${room.id}/calls`), where('calleeId', '==', myUid));
      const calleeCallsUnsub = onSnapshot(calleeQuery, (snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          const callId = docSnap.id;
          const callData = docSnap.data();
          if (callData.status === 'calling') {
            handleIncomingCall(callId, callData);
          } else if (callData.status === 'ended') {
            closePeerConnection(callData.callerId);
          }
        });
      });
      activeUnsubscribesRef.current.push(calleeCallsUnsub);

      // Start input levels speaking analysis
      startSpeakingDetector(stream);

      // Finished
      setJoined(true);
      setLoading(false);
      setSocketStatus('joined_room');
      triggerDiagnosticUpdate();

    } catch (err: any) {
      console.error('[useVoiceRoom] Join voice room breakdown error:', err);
      setErrorCode(err.message || 'حدث خطأ غير متوقع أثناء الانضمام.');
      setLoading(false);
      leaveRoom();
    }
  }, [joined, loading, startSpeakingDetector, leaveRoom, handleIncomingCall, initiateOutgoingCall, closePeerConnection, startLocalMic, triggerDiagnosticUpdate]);

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
  const toggleMute = useCallback(async () => {
    if (!roomId || !auth.currentUser) return;
    const nextValue = !isMuted;
    setIsMuted(nextValue);
    setMuteState(nextValue);
    try {
      await updateDoc(doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid), { isMuted: nextValue });
    } catch (e) {}
  }, [isMuted, roomId, setMuteState]);

  const toggleDeafen = useCallback(async () => {
    if (!roomId || !auth.currentUser) return;
    const nextValue = !isDeafened;
    setIsDeafened(nextValue);
    setDeafenState(nextValue);
    
    // Deafen forces Mute
    const nextMute = nextValue ? true : isMuted;
    setIsMuted(nextMute);
    setMuteState(nextMute);

    try {
      await updateDoc(doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid), { 
        isDeafened: nextValue, 
        isMuted: nextMute 
      });
    } catch (e) {}
  }, [isDeafened, isMuted, roomId, setDeafenState, setMuteState]);

  const toggleHandRaise = useCallback(async () => {
    if (!roomId || !auth.currentUser) return;
    const nextValue = !handRaised;
    setHandRaised(nextValue);
    try {
      await updateDoc(doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid), { handRaised: nextValue });
    } catch (e) {}
  }, [handRaised, roomId]);

  // Moderation Controls using serverless deletes that trigger listener responses instantly
  const kickMember = useCallback(async (targetSocketId: string, reason?: string) => {
    if (!roomId) return;
    console.log(`[Moderation] Requesting kick for user UID/SocketID: ${targetSocketId}`);
    try {
      // In our design, targetSocketId is mapped to the user's UID
      const targetUid = targetSocketId;
      await deleteDoc(doc(db, `voice_rooms/${roomId}/members`, targetUid));
      await setDoc(doc(collection(db, `voice_rooms/${roomId}/events`)), {
        type: 'kick',
        uid: targetUid,
        createdAt: new Date().toISOString(),
        metadata: { reason: reason || 'طرد من الغرفة من المشرف.' }
      });
      // Delete any calls between caller/callee involving kicked user
      peerConnectionsRef.current.delete(targetUid);
      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
      console.log(`Member kicked cleanly via Firestore remove.`);
    } catch (err) {
      console.error('Kick member failed:', err);
    }
  }, [roomId]);

  const banMember = useCallback(async (targetUid: string, targetSocketId: string, reason?: string) => {
    if (!roomId) return;
    console.log(`[Moderation] Requesting ban for user UID: ${targetUid}`);
    try {
      await setDoc(doc(db, `voice_rooms/${roomId}/bans`, targetUid), {
        uid: targetUid,
        bannedBy: auth.currentUser?.uid || 'admin',
        reason: reason || 'مخالفة القوانين العامة.',
        createdAt: new Date().toISOString()
      });
      await deleteDoc(doc(db, `voice_rooms/${roomId}/members`, targetUid));
      await setDoc(doc(collection(db, `voice_rooms/${roomId}/events`)), {
        type: 'ban',
        uid: targetUid,
        targetUid,
        createdAt: new Date().toISOString(),
        metadata: { reason: reason || 'مخالفة القوانين العامة.' }
      });
      peerConnectionsRef.current.delete(targetUid);
      setConnectedPeers(Array.from(peerConnectionsRef.current.keys()));
      console.log(`Member banned cleanly via Firestore bans collection.`);
    } catch (err) {
      console.error('Ban member failed:', err);
    }
  }, [roomId]);

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
