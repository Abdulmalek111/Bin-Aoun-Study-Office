import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { VoiceMember, VoiceRoom } from '../types/voice';
import { Room, RoomEvent } from 'livekit-client';

export function useLiveKitVoiceRoom(roomId: string | undefined) {
  const [joined, setJoined] = useState(false);
  const [members, setMembers] = useState<VoiceMember[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection configurations and diagnostics states
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'>('idle');
  const [socketId, setSocketId] = useState('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [firestoreStatus, setFirestoreStatus] = useState('جاهز / Ready');
  const [webrtcStatus, setWebrtcStatus] = useState('غير متصل / Disconnected');
  const [microphoneStatus, setMicrophoneStatus] = useState('غير نشط / Inactive');
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // LiveKit connection details
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = useState<string | null>(null);

  const [tokenDiagnostics, setTokenDiagnostics] = useState({
    apiStatus: 'idle',
    tokenReceived: false,
    liveKitUrlExists: false,
    roomConnected: false,
    localAudioEnabled: false,
    remoteParticipantsCount: 0,
    audioRendererActive: true,
    lastError: null as string | null
  });

  // Reference hooks
  const roomRef = useRef<Room | null>(null);
  const activeUnsubscribesRef = useRef<(() => void)[]>([]);

  // Local state references for callback safety closures
  const isMutedRef = useRef(false);
  const isDeafenedRef = useRef(false);
  const handRaisedRef = useRef(false);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isDeafenedRef.current = isDeafened; }, [isDeafened]);
  useEffect(() => { handRaisedRef.current = handRaised; }, [handRaised]);

  // Clean-up and leave handler
  const leaveRoom = useCallback(async () => {
    console.log('[useLiveKitVoiceRoom] Executing exit room protocol...');
    setLoading(true);
    setFirestoreStatus('جاري تسجيل المغادرة الصوتي...');
    setSocketStatus('disconnected');

    // 1. Unsubscribe real-time Firestore collection listeners
    activeUnsubscribesRef.current.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    activeUnsubscribesRef.current = [];

    // 2. Shut down LiveKit Room
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch (e) {
        console.warn('[useLiveKitVoiceRoom] Room disconnect warning:', e);
      }
      roomRef.current = null;
    }

    // 3. Mark offline and Cleanup presence document in Firestore
    if (roomId && auth.currentUser) {
      const myUid = auth.currentUser.uid;
      try {
        const memberRef = doc(db, `voice_rooms/${roomId}/members`, myUid);
        
        // Before deleting, mark isOnline: false to bypass race conditions
        try {
          await updateDoc(memberRef, {
            isOnline: false,
            lastSeen: new Date().toISOString()
          });
        } catch (e) {}

        await deleteDoc(memberRef);

        // Record a room exit metadata event
        await setDoc(doc(db, `voice_rooms/${roomId}/events`, `evt-leave-${Date.now()}`), {
          type: 'leave',
          uid: myUid,
          createdAt: new Date().toISOString()
        });

        // Recalculate room memberCount
        const membersSnapshot = await getDocs(collection(db, `voice_rooms/${roomId}/members`));
        await updateDoc(doc(db, 'voice_rooms', roomId), {
          memberCount: Math.max(0, membersSnapshot.size),
          updatedAt: new Date().toISOString()
        });

        setFirestoreStatus('تم مغادرة الغرفة بنجاح 🔴');
      } catch (err) {
        console.warn('[useLiveKitVoiceRoom] Firestore presence cleanup skipped/failed:', err);
        setFirestoreStatus('تم مغادرة القناة 🔴');
      }
    }

    setJoined(false);
    setMembers([]);
    setIsMuted(false);
    setIsDeafened(false);
    setHandRaised(false);
    setIsSpeaking(false);
    setConnectedPeers([]);
    setLoading(false);
    setError(null);
    setLiveKitToken(null);
    setLiveKitUrl(null);
    setMicrophoneStatus('غير نشط / Inactive');
    setWebrtcStatus('تم إنهاء الاتصالات / Disconnected');
    setTokenDiagnostics(prev => ({
      ...prev,
      roomConnected: false,
      apiStatus: 'idle',
      tokenReceived: false
    }));
  }, [roomId]);

  // Join room workflow
  const joinRoom = useCallback(async (roomData: VoiceRoom) => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    setSocketStatus('connecting');
    setFirestoreStatus('تحقق من أمان الجلسة...');
    
    setTokenDiagnostics(prev => ({
      ...prev,
      apiStatus: 'fetching',
      tokenReceived: false,
      lastError: null
    }));

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('يجب تسجيل الدخول أولاً للانضمام للغرفة الصوتية.');
      }

      setSocketId(currentUser.uid);

      // 1. Get secure ID Token from Firebase authentication
      const idToken = await currentUser.getIdToken(true);

      // 2. Fetch authenticated LiveKit AccessToken
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ roomName: roomId })
      });

      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error('[useLiveKitVoiceRoom] Non-JSON API response:', responseText);
        let errorDetails = `رمز الحالة HTTP: ${response.status} (${response.statusText})`;
        if (responseText && responseText.length > 0) {
          errorDetails += ` | محتوى الرد (أول 150 حرف): ${responseText.slice(0, 150)}`;
        }
        throw new Error(`فشل الحصول على تفويض الغرفة الصوتية: الخادم لم يرجع استجابة JSON صالحة. (${errorDetails})`);
      }

      if (!response.ok) {
        let errMsg = responseData.error || 'حدث خطأ غير معروف على السيرفر.';
        if (responseData.diagnostics?.envMissing) {
          const keys = Object.keys(responseData.diagnostics.envMissing);
          const missingKeys = keys.filter(k => responseData.diagnostics.envMissing[k]);
          if (missingKeys.length > 0) {
            errMsg += ` [المتغيرات المفقودة في السيرفر: ${missingKeys.join(', ')}]`;
          }
        }
        throw new Error(errMsg);
      }

      const { token, url } = responseData;

      if (!token || !url) {
        throw new Error('الخادم لم يرجع رمز الدخول الصوتي (token) أو العنوان (url) بشكل صحيح.');
      }

      console.log('[useLiveKitVoiceRoom] Token obtained successfully from API');
      setLiveKitToken(token);
      setLiveKitUrl(url);

      setTokenDiagnostics(prev => ({
        ...prev,
        apiStatus: 'success',
        tokenReceived: true,
        liveKitUrlExists: !!url,
        lastError: null
      }));

      // 3. Setup and connect LiveKit client Room
      setFirestoreStatus('جاري بدء بروتوكولات الصوت...');
      const lkRoom = new Room({
        publishDefaults: {
          audioPreset: {
            maxBitrate: 32000,
          }
        }
      });
      roomRef.current = lkRoom;

      // Subscribe to relevant LiveKit events
      lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === 'audio') {
          if (isDeafenedRef.current) {
            try {
              if ('setVolume' in track) {
                (track as any).setVolume(0);
              }
            } catch (err) {
              console.warn('[useLiveKitVoiceRoom] Failed to mute track on subscription:', err);
            }
          }
        }
      });

      lkRoom.on(RoomEvent.Connected, () => {
        console.log('[useLiveKitVoiceRoom] Connected to LiveKit Room');
        setSocketStatus('connected');
        setWebrtcStatus('متصل / Connected');
      });

      lkRoom.on(RoomEvent.Disconnected, () => {
        console.warn('[useLiveKitVoiceRoom] Disconnected from LiveKit Room');
        setSocketStatus('disconnected');
        setWebrtcStatus('غير متصل / Disconnected');
      });

      lkRoom.on(RoomEvent.Reconnecting, () => {
        console.log('[useLiveKitVoiceRoom] Reconnecting to LiveKit Room');
        setSocketStatus('connecting');
        setWebrtcStatus('جاري إعادة الاتصال...');
      });

      lkRoom.on(RoomEvent.Reconnected, () => {
        console.log('[useLiveKitVoiceRoom] LiveKit Room reconnected');
        setSocketStatus('connected');
        setWebrtcStatus('متصل / Connected');
      });

      // Track speaking event transitions via ActiveSpeakersChanged
      lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const isSelfSpeaking = speakers.some(s => s.identity === currentUser.uid);
        setIsSpeaking(isSelfSpeaking);
        // Sync local speaking state immediately to Firestore
        const memberRef = doc(db, `voice_rooms/${roomId}/members`, currentUser.uid);
        updateDoc(memberRef, { isSpeaking: isSelfSpeaking }).catch(() => {});
      });

      // Sync active connected peers count
      lkRoom.on(RoomEvent.ParticipantConnected, () => {
        const peers = Array.from(lkRoom.remoteParticipants.keys());
        setConnectedPeers(peers);
        setTokenDiagnostics(prev => ({
          ...prev,
          remoteParticipantsCount: peers.length
        }));
      });

      lkRoom.on(RoomEvent.ParticipantDisconnected, () => {
        const peers = Array.from(lkRoom.remoteParticipants.keys());
        setConnectedPeers(peers);
        setTokenDiagnostics(prev => ({
          ...prev,
          remoteParticipantsCount: peers.length
        }));
      });

      // Actively connect to LiveKit
      await lkRoom.connect(url, token);
      console.log('[useLiveKitVoiceRoom] LiveKit Room connected, enabling mic...');

      // Publish local audio track with auto browser restrictions workaround
      try {
        await lkRoom.localParticipant.setMicrophoneEnabled(true);
        setMicrophoneStatus('نشط / Active');
        setTokenDiagnostics(prev => ({
          ...prev,
          localAudioEnabled: true
        }));
      } catch (micErr: any) {
        console.warn('[useLiveKitVoiceRoom] Microphone enable blocked (possibly browser autoplay or permission denied):', micErr);
        setMicrophoneStatus('في انتظار الصلاحيات أو التفعيل ⚠️');
        setAutoplayBlocked(true);
      }

      // Check current peers list on join
      const peers = Array.from(lkRoom.remoteParticipants.keys());
      setConnectedPeers(peers);

      setTokenDiagnostics(prev => ({
        ...prev,
        roomConnected: true,
        remoteParticipantsCount: peers.length
      }));

      // 4. Update secure Firestore database Presence structure of Joined User
      setFirestoreStatus('تحميل وحفظ حضور الغرفة الصوتية...');
      
      const isCurrentUserAdmin = currentUser.email === 'abdulmlikoog@gmail.com';
      let cleanRole: 'admin' | 'moderator' | 'teacher' | 'student' = 'student';
      if (isCurrentUserAdmin) cleanRole = 'admin';

      // Assemble full 13-field compliant model to strictly pass isValidVoiceMember schema validations
      const presencePayload: VoiceMember = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب مجهول',
        photoURL: currentUser.photoURL || '',
        role: cleanRole,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        handRaised: false,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        socketId: currentUser.uid, // mapped to uid to satisfy string format rules
        isOnline: true
      };

      const memberRef = doc(db, `voice_rooms/${roomId}/members`, currentUser.uid);
      await setDoc(memberRef, presencePayload);

      // Publish a joined event to listeners
      await setDoc(doc(db, `voice_rooms/${roomId}/events`, `evt-join-${Date.now()}`), {
        type: 'join',
        uid: currentUser.uid,
        createdAt: new Date().toISOString()
      });

      // Refresh room member count
      const membersSnapshot = await getDocs(collection(db, `voice_rooms/${roomId}/members`));
      await updateDoc(doc(db, 'voice_rooms', roomId), {
        memberCount: Math.max(1, membersSnapshot.size),
        updatedAt: new Date().toISOString()
      });

      // 5. Susbscribe to Firestore members real-time snapshots
      const q = collection(db, `voice_rooms/${roomId}/members`);
      const unsubscribeMembers = onSnapshot(q, (snapshot) => {
        const now = Date.now();
        const updatedMembers: VoiceMember[] = [];
        
        snapshot.forEach((snapDoc) => {
          const data = snapDoc.data() as VoiceMember;
          const lastSeenTime = new Date(data.lastSeen).getTime();
          
          // Determine online status based on real-time heartbeat timing (max 45 seconds tolerance)
          const isOnline = data.isOnline && (now - lastSeenTime < 45000);
          
          updatedMembers.push({
            ...data,
            isOnline
          });
        });

        // Safe sort: Admin first, then alphabetically
        updatedMembers.sort((a,b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (b.role === 'admin' && a.role !== 'admin') return 1;
          return a.displayName.localeCompare(b.displayName);
        });

        setMembers(updatedMembers);

        // Active safety kick trigger check:
        // If my own presence document represents me as offline/deleted, sign of moderators ejecting me
        const myself = updatedMembers.find(m => m.uid === currentUser.uid);
        if (!myself) {
          console.warn('[useLiveKitVoiceRoom] Self document missing! Ejecting kicked user dynamically.');
          leaveRoom();
        }
      }, (fErr) => {
        console.error('[useLiveKitVoiceRoom] Members real-time sync failed:', fErr);
      });

      activeUnsubscribesRef.current.push(unsubscribeMembers);

      setJoined(true);
      setLoading(false);
      setFirestoreStatus('متصل صلب / Online');
    } catch (err: any) {
      console.error('[useLiveKitVoiceRoom] Join voice room breakdown error:', err);
      setError(err.message || 'حدث خطأ أثناء الانضمام للغرفة الصوتية.');
      setSocketStatus('failed');
      setFirestoreStatus('فشل الاتصال / Failed');
      setLoading(false);

      setTokenDiagnostics(prev => ({
        ...prev,
        lastError: err.message || 'Unknown integration breakdown'
      }));
    }
  }, [roomId, leaveRoom]);

  // 1. Physically and strictly enforce mute state on local audio tracks and browser capture APIs
  useEffect(() => {
    const enforceMuteState = async () => {
      if (!roomRef.current) return;
      const localParticipant = roomRef.current.localParticipant;
      if (!localParticipant) return;

      try {
        if (isMuted) {
          // Tell LiveKit to disable the microphone
          await localParticipant.setMicrophoneEnabled(false);
          // And physically disable any active local audio tracks to avoid leaks
          localParticipant.audioTrackPublications.forEach(pub => {
            if (pub.track) {
              pub.track.mediaStreamTrack.enabled = false;
              try {
                (pub.track as any).mute?.();
              } catch (e) {}
            }
          });
          setMicrophoneStatus('مكتوم / Muted');
        } else {
          // Tell LiveKit to enable the microphone
          if (joined) {
            await localParticipant.setMicrophoneEnabled(true);
            localParticipant.audioTrackPublications.forEach(pub => {
              if (pub.track) {
                pub.track.mediaStreamTrack.enabled = true;
                try {
                  (pub.track as any).unmute?.();
                } catch (e) {}
              }
            });
            setMicrophoneStatus('نشط / Active');
          }
        }
      } catch (e) {
        console.warn('[useLiveKitVoiceRoom] Error enforcing mute state:', e);
      }
    };

    enforceMuteState();
  }, [isMuted, joined]);

  // 2. DOM-level deafen guard that periodically silences new audio tags
  useEffect(() => {
    const enforceDeafenState = () => {
      try {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach((audio) => {
          if (isDeafened) {
            audio.muted = true;
            audio.volume = 0;
          } else {
            audio.muted = false;
            audio.volume = 1;
          }
        });
      } catch (e) {
        console.warn('[useLiveKitVoiceRoom] DOM audio elements control error:', e);
      }
    };

    enforceDeafenState();

    // Setup an observer interval to catch newly rendered/active <audio> elements
    const intervalId = setInterval(enforceDeafenState, 500);
    return () => clearInterval(intervalId);
  }, [isDeafened]);

  // Voice rooms state controls updates
  const toggleMute = useCallback(async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (roomId && auth.currentUser) {
      const myUid = auth.currentUser.uid;
      const memberRef = doc(db, `voice_rooms/${roomId}/members`, myUid);
      updateDoc(memberRef, { isMuted: nextMuted }).catch(() => {});
    }
  }, [roomId, isMuted]);

  const toggleDeafen = useCallback(() => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);

    if (roomRef.current) {
      roomRef.current.remoteParticipants.forEach((participant) => {
        (participant as any).audioTracks.forEach((trackPublication: any) => {
          if (trackPublication.track && 'setVolume' in trackPublication.track) {
            try {
              (trackPublication.track as any).setVolume(nextDeafened ? 0 : 100);
            } catch (err) {
              console.warn('[useLiveKitVoiceRoom] volume set error:', err);
            }
          }
        });
      });
    }

    if (roomId && auth.currentUser) {
      const myUid = auth.currentUser.uid;
      const memberRef = doc(db, `voice_rooms/${roomId}/members`, myUid);
      updateDoc(memberRef, { isDeafened: nextDeafened }).catch(() => {});
    }
  }, [roomId, isDeafened]);

  const toggleHandRaise = useCallback(() => {
    const nextHandRaised = !handRaised;
    setHandRaised(nextHandRaised);

    if (roomId && auth.currentUser) {
      const myUid = auth.currentUser.uid;
      const memberRef = doc(db, `voice_rooms/${roomId}/members`, myUid);
      updateDoc(memberRef, { handRaised: nextHandRaised }).catch(() => {});
    }
  }, [roomId, handRaised]);

  // Moderation Handlers: Kick-out matching security rules
  const kickMember = useCallback(async (targetUid: string) => {
    if (!roomId) return;
    try {
      console.log(`[useLiveKitVoiceRoom] Moderation Kick triggered on member UID: ${targetUid}`);
      // Security rules allow room owners/admins to delete members presence documents directly
      const targetMemberRef = doc(db, `voice_rooms/${roomId}/members`, targetUid);
      await deleteDoc(targetMemberRef);
    } catch (err) {
      console.error('[useLiveKitVoiceRoom] Moderation kick member failure:', err);
    }
  }, [roomId]);

  // Moderation Handlers: Ban matching security rules
  const banMember = useCallback(async (targetUid: string, reason = 'تم الحظر بالكامل من الغرفة الصوتية.') => {
    if (!roomId) return;
    try {
      console.log(`[useLiveKitVoiceRoom] Moderation Ban triggered on member UID: ${targetUid}`);
      
      const banRef = doc(db, `voice_rooms/${roomId}/bans`, targetUid);
      await setDoc(banRef, {
        uid: targetUid,
        reason,
        bannedBy: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Admin',
        createdAt: new Date().toISOString()
      });

      // After registering ban in security rules subcollection, eject member presence
      await kickMember(targetUid);
    } catch (err) {
      console.error('[useLiveKitVoiceRoom] Moderation ban member failure:', err);
    }
  }, [roomId, kickMember]);

  // Browser Autoplay Block Bypass Trigger handler
  const resumeAudioPlayback = useCallback(async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.startAudio();
        setAutoplayBlocked(false);
      } catch (err) {
        console.error('[useLiveKitVoiceRoom] Resume audio playback rejected:', err);
      }
    }
  }, []);

  // Real-time heartbeat routine
  useEffect(() => {
    if (!joined || !roomId || !auth.currentUser) return;
    const myUid = auth.currentUser.uid;

    const intervalId = setInterval(() => {
      const memberRef = doc(db, `voice_rooms/${roomId}/members`, myUid);
      updateDoc(memberRef, {
        lastSeen: new Date().toISOString(),
        isOnline: true
      }).catch((heartbeatErr) => {
        console.warn('[useLiveKitVoiceRoom] Heartbeat transmit error:', heartbeatErr);
      });
    }, 15000);

    return () => clearInterval(intervalId);
  }, [joined, roomId]);

  // Auto clean-up on unmounting
  useEffect(() => {
    return () => {
      if (joined) {
        leaveRoom();
      }
    };
  }, [joined, leaveRoom]);

  return {
    joined,
    members,
    isMuted,
    isDeafened,
    handRaised,
    isSpeaking,
    loading,
    error,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleDeafen,
    toggleHandRaise,
    kickMember,
    banMember,
    
    // Diagnostics indicators
    socketStatus,
    socketId,
    connectedPeers,
    firestoreStatus,
    webrtcStatus,
    microphoneStatus,
    autoplayBlocked,
    resumeAudioPlayback,

    liveKitToken,
    liveKitUrl,

    tokenDiagnostics,

    roomInstance: roomRef.current
  };
}
