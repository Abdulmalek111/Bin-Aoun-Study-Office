import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { VoiceMember, VoiceRoom } from '../types/voice';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack, IRemoteAudioTrack } from 'agora-rtc-sdk-ng';

// Configure Agora Logging limit to prioritize our own debug outputs
AgoraRTC.setLogLevel(3);

export function useVoiceRoom(roomId: string | undefined) {
  const [joined, setJoined] = useState(false);
  const [members, setMembers] = useState<VoiceMember[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Connection diagnostics states (perfectly compatible with interface)
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected' | 'authenticated' | 'joined_room' | 'disconnected' | 'reconnecting' | 'failed'>('idle');
  const [socketId, setSocketId] = useState('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [firestoreStatus, setFirestoreStatus] = useState('جاهز / Ready');
  const [webrtcStatus, setWebrtcStatus] = useState('غير متصل / Disconnected');
  const [microphoneStatus, setMicrophoneStatus] = useState('غير نشط / Inactive');
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Local list of active speakers from Agora Indicator
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  // Agora instance refs
  const rtcClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map());

  // Real-time snapshot unsubscription list
  const activeUnsubscribesRef = useRef<(() => void)[]>([]);

  // Closure references to safe-guard states
  const isMutedRef = useRef(false);
  const isDeafenedRef = useRef(false);
  const handRaisedRef = useRef(false);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isDeafenedRef.current = isDeafened; }, [isDeafened]);
  useEffect(() => { handRaisedRef.current = handRaised; }, [handRaised]);

  // Set local Microphone mute at Agora level
  const setMuteState = useCallback(async (muted: boolean) => {
    if (localAudioTrackRef.current) {
      try {
        await localAudioTrackRef.current.setEnabled(!muted);
        console.log(`[Agora Mute] Micro enabled: ${!muted}`);
      } catch (err) {
        console.error('[Agora Mute] Failed to toggle mic track:', err);
      }
    }
  }, []);

  // Update Volumes based on Deafen setting
  const setDeafenState = useCallback((deafened: boolean) => {
    remoteTracksRef.current.forEach((track, uid) => {
      try {
        if (deafened) {
          track.setVolume(0);
        } else {
          track.setVolume(100);
        }
      } catch (err) {
        console.error(`[Agora Deafen] Failed to configure track level for user ${uid}:`, err);
      }
    });
  }, []);

  // Leave room flow
  const leaveRoom = useCallback(async () => {
    console.log('[useVoiceRoom] Executing exit room protocol...');
    setLoading(true);
    setFirestoreStatus('جاري تسجيل المغادرة الصوتي...');
    setSocketStatus('disconnected');

    // 1. Unsubscribe Firestore snapshot listeners
    activeUnsubscribesRef.current.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    activeUnsubscribesRef.current = [];

    // 2. Stop and release local and remote audio tracks
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      } catch (e) {}
      localAudioTrackRef.current = null;
    }

    remoteTracksRef.current.forEach((track) => {
      try { track.stop(); } catch (e) {}
    });
    remoteTracksRef.current.clear();

    if (rtcClientRef.current) {
      try {
        await rtcClientRef.current.leave();
      } catch (e) {}
      rtcClientRef.current = null;
    }

    // 3. Update Firestore Presence
    if (roomId && auth.currentUser) {
      const myUid = auth.currentUser.uid;
      try {
        const memberRef = doc(db, `voice_rooms/${roomId}/members`, myUid);
        await deleteDoc(memberRef);

        await setDoc(doc(db, `voice_rooms/${roomId}/events`, `evt-${Date.now()}`), {
          type: 'leave',
          uid: myUid,
          createdAt: new Date().toISOString()
        });

        // Safe room counters re-evaluation
        const membersSnapshot = await getDocs(collection(db, `voice_rooms/${roomId}/members`));
        await updateDoc(doc(db, 'voice_rooms', roomId), {
          memberCount: Math.max(0, membersSnapshot.size),
          updatedAt: new Date().toISOString()
        });

        setFirestoreStatus('تم مغادرة الغرفة بنجاح 🔴');
      } catch (err) {
        console.warn('[useVoiceRoom] Firestore presence cleanup skipped/failed:', err);
        setFirestoreStatus('تم مغادرة القناة 🔴');
      }
    }

    setJoined(false);
    setMembers([]);
    setIsMuted(false);
    setIsDeafened(false);
    setHandRaised(false);
    setIsSpeaking(false);
    setActiveSpeakers([]);
    setConnectedPeers([]);
    setLoading(false);
    setErrorCode(null);
    setMicrophoneStatus('غير نشط / Inactive');
    setWebrtcStatus('تم إنهاء الاتصالات / Disconnected');
    setSocketId('');
    setAutoplayBlocked(false);
  }, [roomId]);

  // Main Join Room Flow
  const joinRoom = useCallback(async (room: VoiceRoom) => {
    if (!room || joined || loading) return;

    setLoading(true);
    setErrorCode(null);
    setFirestoreStatus('جاري التحقق من الصلاحيات والمحظورين...');
    setMicrophoneStatus('جاري تهيئة قنوات Agora...');
    setWebrtcStatus('جاري الاتصال بخوادم الصوت...');
    setSocketStatus('connecting');

    console.log(`[useVoiceRoom] Joining Voice Room through Agora Web SDK: "${room.name}" (${room.id})`);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('يجب تسجيل الدخول للانضمام للغرفة الصوتية.');
      }

      const myUid = currentUser.uid;
      setSocketId(myUid);

      // Check access permission rules via roles
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

      setFirestoreStatus('جاري جلب مفتاح الاتصال الصوتي (Agora Token)...');

      // Fetch dynamic token and appId securely from back-end server via POST with Firebase ID Token
      const idToken = await currentUser.getIdToken(true);
      const tokenResponse = await fetch('/api/agora/token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelName: room.id
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('فشل توليد رمز الدخول الصوتي. تحقق من متغيرات البيئة وإعدادات Agora.');
      }

      const { appId, token, agoraUid } = await tokenResponse.json();

      setFirestoreStatus('جاري الانضمام إلى قناة الصوت...');
      setSocketStatus('authenticated');

      // Initialize Agora Web RTC Client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      rtcClientRef.current = client;

      // Register dynamic events
      client.on('user-published', async (user, mediaType) => {
        console.log(`[Agora] User published track: ${user.uid} (${mediaType})`);
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === 'audio') {
            const track = user.audioTrack;
            if (track) {
              remoteTracksRef.current.set(String(user.uid), track);
              
              if (isDeafenedRef.current) {
                track.setVolume(0);
              } else {
                track.setVolume(100);
                try {
                  await track.play();
                } catch (playErr) {
                  console.warn('[Agora Play Autoplay Blocked Warning]', playErr);
                  setAutoplayBlocked(true);
                }
              }
            }
            setConnectedPeers(client.remoteUsers.map(u => String(u.uid)));
          }
        } catch (subErr) {
          console.error('[Agora Subscribe Failed]', subErr);
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        console.log(`[Agora] User unpublished track: ${user.uid} (${mediaType})`);
        if (mediaType === 'audio') {
          const track = remoteTracksRef.current.get(String(user.uid));
          if (track) {
            track.stop();
            remoteTracksRef.current.delete(String(user.uid));
          }
          setConnectedPeers(client.remoteUsers.map(u => String(u.uid)));
        }
      });

      client.on('user-joined', (user) => {
        console.log(`[Agora] Remote user joined channel: ${user.uid}`);
        setConnectedPeers(client.remoteUsers.map(u => String(u.uid)));
      });

      client.on('user-left', (user) => {
        console.log(`[Agora] Remote user left channel: ${user.uid}`);
        const track = remoteTracksRef.current.get(String(user.uid));
        if (track) {
          track.stop();
          remoteTracksRef.current.delete(String(user.uid));
        }
        setConnectedPeers(client.remoteUsers.map(u => String(u.uid)));
      });

      // Enable volume indicator metric for speech feedback
      client.enableAudioVolumeIndicator();
      client.on('volume-indicator', (volumes) => {
        const speakers: string[] = [];
        let selfSpeaking = false;
        
        volumes.forEach((vol) => {
          if (vol.level > 6) { // Sensitivity threshold
            speakers.push(String(vol.uid));
            if (String(vol.uid) === myUid) {
              selfSpeaking = true;
            }
          }
        });
        
        setActiveSpeakers(speakers);
        setIsSpeaking(selfSpeaking);
      });

      // Join the Channel
      await client.join(appId, room.id, token, agoraUid || myUid);

      // Create Microphone track with Noise cancellation, Echo suppression, and AGC
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true
      });
      localAudioTrackRef.current = micTrack;

      // Set mic publish status matching current muted setting
      await micTrack.setEnabled(!isMutedRef.current);

      // Publish local audio to everyone in the room
      await client.publish([micTrack]);
      
      setMicrophoneStatus('نشط ومتصل 🎤 (EchoCancellation)');
      setWebrtcStatus('متصل عبر Agora Web SDK 🎙️');
      setSocketStatus('joined_room');

      // Create and upload presence details to Firestore voice_rooms/{roomId}/members/{uid}
      setFirestoreStatus('جاري تنشيط حضورك في الغرفة...');
      const selfMemberRecord: VoiceMember = {
        uid: myUid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب',
        photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'X')}`,
        role: currentRole,
        isMuted: isMutedRef.current,
        isDeafened: isDeafenedRef.current,
        isSpeaking: false,
        handRaised: false,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        socketId: myUid, // Backward-compatible UID mapping
        isOnline: true
      };

      const selfRefPath = `voice_rooms/${room.id}/members/${myUid}`;
      try {
        await setDoc(doc(db, `voice_rooms/${room.id}/members`, myUid), selfMemberRecord);
        
        await setDoc(doc(db, `voice_rooms/${room.id}/events`, `evt-${Date.now()}`), {
          type: 'join',
          uid: myUid,
          createdAt: new Date().toISOString()
        });

        const initialSnapshot = await getDocs(collection(db, `voice_rooms/${room.id}/members`));
        await updateDoc(doc(db, 'voice_rooms', room.id), {
          memberCount: initialSnapshot.size,
          updatedAt: new Date().toISOString()
        });
        setFirestoreStatus('الحضور نشط ومتصل 🟢');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, selfRefPath);
      }

      // Firestore Snapshot listener on members presence collection
      const membersPath = `voice_rooms/${room.id}/members`;
      const membersUnsub = onSnapshot(collection(db, `voice_rooms/${room.id}/members`), (snapshot) => {
        const nowMs = Date.now();
        const activeList: VoiceMember[] = [];
        let hasSelfRecord = false;

        snapshot.docs.forEach((d) => {
          const data = d.data() as VoiceMember;
          const lastSeenMs = data.lastSeen ? new Date(data.lastSeen).getTime() : 0;
          const diffSeconds = (nowMs - lastSeenMs) / 1000;

          if (data.isOnline && diffSeconds < 45) {
            activeList.push(data);
          }
          if (data.uid === myUid) {
            hasSelfRecord = true;
          }
        });

        // Serverless Kick detection trigger
        if (!hasSelfRecord) {
          console.warn('[useVoiceRoom] Self record missing! Executing kicked exit routine.');
          alert('تم طردك أو حظرك من الغرفة الصوتية بواسطة المشرف!');
          leaveRoom();
          return;
        }

        setMembers(activeList);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, membersPath);
      });

      activeUnsubscribesRef.current.push(membersUnsub);
      setJoined(true);

    } catch (err: any) {
      console.error('[useVoiceRoom] Join voice room breakdown error:', err);
      setErrorCode(err.message || 'حدث خطأ غير متوقع أثناء الانضمام.');
      setSocketStatus('failed');
      setLoading(false);
      leaveRoom();
    }
  }, [joined, loading, leaveRoom]);

  // Heartbeat Presence updates every 15 seconds
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
        console.log('[Heartbeat] Updated lastSeen presence heartbeat.');
      } catch (err) {
        console.warn('[Heartbeat] Heartbeat presence document update skipped:', err);
      }
    }, 15000);

    return () => {
      console.log('[Heartbeat] Stopping presence heartbeat ticker...');
      clearInterval(interval);
    };
  }, [joined, roomId]);

  // Sync state actions
  const toggleMute = useCallback(async () => {
    if (!roomId || !auth.currentUser) return;
    const nextValue = !isMuted;
    setIsMuted(nextValue);
    await setMuteState(nextValue);
    try {
      await updateDoc(doc(db, `voice_rooms/${roomId}/members`, auth.currentUser.uid), { isMuted: nextValue });
    } catch (e) {}
  }, [isMuted, roomId, setMuteState]);

  const toggleDeafen = useCallback(async () => {
    if (!roomId || !auth.currentUser) return;
    const nextValue = !isDeafened;
    setIsDeafened(nextValue);
    setDeafenState(nextValue);
    
    // Deafen automatically forces mute status to true
    const nextMute = nextValue ? true : isMuted;
    setIsMuted(nextMute);
    await setMuteState(nextMute);

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

  const kickMember = useCallback(async (targetSocketId: string, reason?: string) => {
    if (!roomId) return;
    const targetUid = targetSocketId; // uid mapped back-ends
    console.log(`[Moderation] Requesting kick for user UID: ${targetUid}`);
    try {
      await deleteDoc(doc(db, `voice_rooms/${roomId}/members`, targetUid));
      await setDoc(doc(collection(db, `voice_rooms/${roomId}/events`)), {
        type: 'kick',
        uid: targetUid,
        createdAt: new Date().toISOString(),
        metadata: { reason: reason || 'طرد من الغرفة من المشرف.' }
      });
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
    } catch (err) {
      console.error('Ban member failed:', err);
    }
  }, [roomId]);

  const resumeAudioPlayback = useCallback(async () => {
    try {
      remoteTracksRef.current.forEach((track) => {
        try { track.play(); } catch (e) {}
      });
      setAutoplayBlocked(false);
    } catch (err) {
      console.error('[Agora Autoplay] Play resume failure:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  // Dynamically map members to apply Speaking state via local volume indicator
  const mappedMembers = members.map(member => {
    const isUserSpeaking = activeSpeakers.includes(member.uid) || (member.uid === auth.currentUser?.uid && isSpeaking);
    return {
      ...member,
      isSpeaking: isUserSpeaking
    };
  });

  return {
    joined,
    members: mappedMembers,
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
    
    // Dynamic Autoplay controls
    autoplayBlocked,
    resumeAudioPlayback,

    // Connection diagnostics
    socketStatus,
    socketId,
    connectedPeers,
    firestoreStatus,
    webrtcStatus,
    microphoneStatus,
    peerSignalingStates: {},
    peerIceConnectionStates: {},
    diagnosticUpdateTrigger: 0
  };
}
