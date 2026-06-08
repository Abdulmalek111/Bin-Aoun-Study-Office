import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  limit,
  collectionGroup
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User } from '../types';
import { 
  MessageSquare, 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Search, 
  Sparkles, 
  Clock, 
  User as UserIcon, 
  Check, 
  Send, 
  X, 
  GraduationCap, 
  Info, 
  Volume2, 
  VolumeX, 
  Hash, 
  MessageCircle,
  PhoneIncoming,
  CircleDot,
  Copy
} from 'lucide-react';

// Generates a stable deterministic student ID starting with 'bin' using a hash of user Uid
export function getBinStudentId(uid: string): string {
  if (!uid) return 'bin_000000';
  if (uid.startsWith('local_')) {
    const rawNum = uid.replace('local_', '');
    const slice = rawNum.slice(-6);
    return `bin_${slice.padEnd(6, '0')}`;
  }
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const numericId = Math.abs(hash % 900000) + 100000; // stable 6-digit code
  return `bin_${numericId}`;
}

interface StudentsViewProps {
  user: User | null;
  onNavigateToTab?: (tab: any) => void;
  // Triggered when current user accepts a call or sets up a call
  activeCallId?: string | null;
  setActiveCallId?: (id: string | null) => void;
  activeChatUser?: User | null;
  setActiveChatUser?: (u: User | null) => void;
}

interface PrivateMessage {
  id: string;
  senderUid: string;
  senderName: string;
  content: string;
  timestamp: number;
}

interface ActiveCall {
  id: string;
  callerUid: string;
  callerName: string;
  calleeUid: string;
  calleeName: string;
  status: 'calling' | 'ringing' | 'accepted' | 'declined' | 'ended';
  createdAt: number;
}

export default function StudentsView({ 
  user, 
  onNavigateToTab,
  activeCallId: propCallId,
  setActiveCallId: propSetCallId,
  activeChatUser: propChatUser,
  setActiveChatUser: propSetChatUser
}: StudentsViewProps) {
  
  const currentUid = auth.currentUser?.uid || 'anonymous';
  const currentUserName = user?.username || 'طالب مستخدم';

  // Component state
  const [students, setStudents] = useState<(User & { uid: string; binId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState<(User & { uid: string; binId: string }) | null>(null);
  const [viewingPublicProfile, setViewingPublicProfile] = useState<(User & { uid: string; binId: string }) | null>(null);
  const [modalCopied, setModalCopied] = useState(false);
  
  // Real-time Chat state
  const [chatMessages, setChatMessages] = useState<PrivateMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Private direct calling state
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCalling, setIsCalling] = useState(false); // Outgoing or incoming status
  const [callMuted, setCallMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Audio packet capture & play refs/states
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [peerSpeaking, setPeerSpeaking] = useState(false);
  
  // Audio playback queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const playedPacketsRef = useRef<Set<string>>(new Set());

  // Safe tracking for active call ID to use in refs/asynchronous closures
  const activeCallIdRef = useRef<string | null>(null);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = callMuted;
  }, [callMuted]);

  // Sync prop setters/getters if parent holds state
  const setGlobalChatUser = (u: any) => {
    setSelectedChatUser(u);
    if (propSetChatUser) propSetChatUser(u);
  };

  const setGlobalCallId = (id: string | null) => {
    if (propSetCallId) propSetCallId(id);
  };

  // Sync active chat user if specified from outside
  useEffect(() => {
    if (propChatUser) {
      const found = students.find(s => s.uid === (propChatUser as any).uid);
      if (found) {
        setSelectedChatUser(found);
      }
    }
  }, [propChatUser, students]);

  // Unlock background Web Audio policy unblocked gesture helper
  const unlockAudioEngine = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
    } catch (e) {
      console.warn("Autoplay Context Unlock passive bypass:", e);
    }
  };

  // Chats map state holding unread counts and last message details keyed by partner Uid
  const [chatsMap, setChatsMap] = useState<Record<string, { unreadCount: number; lastMessage?: string; lastMessageAt?: number }>>({});

  // 1. Fetch Students/Users in Real-time from Firestore
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: (User & { uid: string; binId: string })[] = [];
      snapshot.forEach((docSnap) => {
        const dat = docSnap.data() as User;
        const uid = docSnap.id;
        
        // Exclude system administrators, instructors, general supervisors, and the admin email (abdulmlikoog@gmail.com)
        const roleLower = (dat.role || 'student').toLowerCase();
        const emailLower = (dat.email || '').toLowerCase();
        const isExcludedSupervisor = [
          'admin', 
          'owner', 
          'instructor', 
          'teacher', 
          'moderator', 
          'supervisor', 
          'مشرف', 
          'مشرف عام', 
          'مشرف المنصة', 
          'مدير المنصة'
        ].includes(roleLower) || emailLower === 'abdulmlikoog@gmail.com';

        if (!isExcludedSupervisor || roleLower === 'student') {
          const binId = dat.studentId || getBinStudentId(uid);
          list.push({
            ...dat,
            uid,
            binId
          });

          // Check if this student in Firestore doesn't have studentId saved yet, and write it
          if (!dat.studentId && uid !== 'anonymous') {
            const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
            const computedBinId = `bin_${randomDigits}`;
            updateDoc(doc(db, 'users', uid), {
              studentId: computedBinId
            }).catch(() => {});
          }
        }
      });
      setStudents(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading students list:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUid]);

  // Real-time listener for direct chats to get unread counts & last messages
  useEffect(() => {
    if (currentUid === 'anonymous') return;

    const q = query(
      collection(db, 'chats'), 
      where('participants', 'array-contains', currentUid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const map: Record<string, { unreadCount: number; lastMessage?: string; lastMessageAt?: number }> = {};
      snapshot.forEach((docSnap) => {
        const chatData = docSnap.data();
        const partnerUid = chatData.participants?.find((uid: string) => uid !== currentUid);
        if (partnerUid) {
          const unreads = chatData.unreadCount?.[currentUid] || 0;
          map[partnerUid] = {
            unreadCount: unreads,
            lastMessage: chatData.lastMessage,
            lastMessageAt: chatData.lastMessageAt
          };
        }
      });
      setChatsMap(map);
    }, (err) => {
      console.warn("Unable to listen to chats records:", err);
    });

    return () => unsub();
  }, [currentUid]);

  // 2. Load and listen to private chat messages when selectedChatUser changes
  useEffect(() => {
    if (!selectedChatUser) {
      setChatMessages([]);
      return;
    }

    const chatDocId = [currentUid, selectedChatUser.uid].sort().join('_');
    const messagesColl = collection(db, 'chats', chatDocId, 'messages');
    const q = query(messagesColl, orderBy('createdAt', 'asc'), limit(150));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: PrivateMessage[] = [];
      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        msgs.push({
          id: msg.id || docSnap.id,
          senderUid: msg.senderId || msg.senderUid,
          senderName: msg.senderId === currentUid ? currentUserName : selectedChatUser.username,
          content: msg.text || msg.content || '',
          timestamp: msg.createdAt || msg.timestamp || Date.now(),
          status: msg.status || 'sent',
          readBy: msg.readBy || []
        } as any);

        // Mark incoming messages as read both locally and in firestore
        if (msg.senderId === selectedChatUser.uid && msg.status !== 'read') {
          const msgRef = doc(db, 'chats', chatDocId, 'messages', docSnap.id);
          updateDoc(msgRef, {
            status: 'read',
            readBy: [...(msg.readBy || []), currentUid]
          }).catch(() => {});
        }
      });
      setChatMessages(msgs);
    }, (err) => {
      console.warn("Permission restricted or failed fetching message records:", err);
    });

    return () => unsub();
  }, [selectedChatUser, currentUid, currentUserName]);

  // Mark all unread counts when viewing chat
  useEffect(() => {
    if (!selectedChatUser || currentUid === 'anonymous') return;

    const chatDocId = [currentUid, selectedChatUser.uid].sort().join('_');
    const chatDocRef = doc(db, 'chats', chatDocId);
    
    // Explicitly reset our unreadCount counter to 0 inside chats doc
    updateDoc(chatDocRef, {
      [`unreadCount.${currentUid}`]: 0
    }).catch(() => {});

  }, [selectedChatUser, chatMessages.length, currentUid]);

  // Scroll to bottom of chat automatically on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Send Direct Private Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedChatUser) return;

    unlockAudioEngine();

    const chatDocId = [currentUid, selectedChatUser.uid].sort().join('_');
    const chatDocRef = doc(db, 'chats', chatDocId);
    const messagesColl = collection(chatDocRef, 'messages');
    const msgId = `msg_${Date.now()}__${Math.floor(Math.random() * 1000)}`;

    const text = newMessageText.trim();
    setNewMessageText('');

    try {
      const timestamp = Date.now();
      
      // Calculate recipient increment
      const chatSnap = await getDoc(chatDocRef);
      let currentPartnerUnread = 1;
      if (chatSnap.exists()) {
        const dat = chatSnap.data();
        currentPartnerUnread = (dat.unreadCount?.[selectedChatUser.uid] || 0) + 1;
      }

      // 1. Write the message document
      await setDoc(doc(messagesColl, msgId), {
        id: msgId,
        senderId: currentUid,
        receiverId: selectedChatUser.uid,
        text: text,
        createdAt: timestamp,
        readBy: [currentUid],
        status: 'sent'
      });

      // 2. Update chat parent metadata securely with incremental tracking
      await setDoc(chatDocRef, {
        participants: [currentUid, selectedChatUser.uid],
        participantIds: {
          [currentUid]: true,
          [selectedChatUser.uid]: true
        },
        lastMessage: text,
        lastMessageAt: timestamp,
        lastMessageBy: currentUid,
        unreadCount: {
          [currentUid]: 0,
          [selectedChatUser.uid]: currentPartnerUnread
        },
        createdAt: chatSnap.exists() ? chatSnap.data().createdAt || timestamp : timestamp,
        updatedAt: timestamp
      }, { merge: true });

    } catch (err) {
      console.error("Failed sending private message:", err);
      alert("عذراً، فشل في إرسال الرسالة. يرجى تجربة إعادة المحاولة.");
    }
  };

  // Convert blob to base64 promise helper
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Strip out metadata head
        const base = base64data.substring(base64data.indexOf(',') + 1);
        resolve(base);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 3. Initiate Private Call
  const handleStartCall = async (partner: typeof students[number]) => {
    unlockAudioEngine();

    // 1. Request microphone access first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setLocalAudioStream(stream);
    } catch (err) {
      console.warn("Microphone access denied for private call:", err);
      alert("عذراً! لا يمكن إجراء الاتصال الصوتي دون تفعيل صلاحية الميكروفون بالمتصفح.");
      return;
    }

    const callId = [currentUid, partner.uid].sort().join('_');
    activeCallIdRef.current = callId;
    setGlobalCallId(callId);

    const freshCall: ActiveCall = {
      id: callId,
      callerUid: currentUid,
      callerName: currentUserName,
      calleeUid: partner.uid,
      calleeName: partner.username,
      status: 'calling',
      createdAt: Date.now()
    };

    try {
      // Write call document to start signaling
      await setDoc(doc(db, 'private_calls', callId), freshCall);
      setActiveCall(freshCall);
      setIsCalling(true);
      setCallDuration(0);

    } catch (err) {
      console.error("Failed to write call document:", err);
      alert("حدث خطأ أثناء رنين الاتصال. يُرجى المحاولة لاحقاً.");
      // Stop stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalAudioStream(null);
      }
    }
  };

  // Listen to the active call document status changes
  useEffect(() => {
    if (!activeCall?.id) return;

    const callDocRef = doc(db, 'private_calls', activeCall.id);
    const unsub = onSnapshot(callDocRef, (docSnap) => {
      if (!docSnap.exists()) {
        // Call was deleted, hang up locally
        handleTerminateCall(false);
        return;
      }

      const updated = docSnap.data() as ActiveCall;
      setActiveCall(updated);

      if (updated.status === 'declined') {
        alert(`رفض الزميل ${updated.calleeName} المكالمة الصوتية.`);
        handleTerminateCall(false);
      } else if (updated.status === 'ended') {
        handleTerminateCall(false);
      } else if (updated.status === 'accepted') {
        // Connected! Start real-time audio packet capturing and listening
        setIsCalling(true);
      }
    });

    return () => unsub();
  }, [activeCall?.id]);

  // Private call duration timer increments
  useEffect(() => {
    if (activeCall?.status !== 'accepted') {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Start fallbacks audio recorder when call is connected
  useEffect(() => {
    if (activeCall?.status === 'accepted' && localAudioStream) {
      startRecordingVoicePackets(localAudioStream, activeCall.id);
    } else {
      stopRecordingVoicePackets();
    }
    return () => stopRecordingVoicePackets();
  }, [activeCall?.status, localAudioStream]);

  // Listen to remote call audio packets
  useEffect(() => {
    if (activeCall?.status !== 'accepted') return;

    // Fetch call audio packets
    const packetsColl = collection(db, 'private_calls', activeCall.id, 'audio_packets');
    // Query recently sent packets
    const minTime = Date.now() - 30000; // only last 30s
    const q = query(packetsColl, where('timestamp', '>', minTime));

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const p = docSnap.data();
        if (p.id && p.senderUid !== currentUid && !playedPacketsRef.current.has(p.id)) {
          playedPacketsRef.current.add(p.id);
          // Append to queue
          audioQueueRef.current.push(p.audioBase64);
          triggerQueuePlayback();
        }
      });
    }, (err) => {
      console.warn("Failed fetching call audio packets:", err);
    });

    return () => unsub();
  }, [activeCall?.status, activeCall?.id]);

  // Fallback voice packets uploader loops
  const startRecordingVoicePackets = (stream: MediaStream, callId: string) => {
    try {
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/ogg';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

      const options = mimeType ? { mimeType } : undefined;
      const r = new MediaRecorder(stream, options);
      mediaRecorderRef.current = r;

      r.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && !isMutedRef.current) {
          try {
            const base64 = await blobToBase64(e.data);
            if (base64 && base64.length > 200) {
              const pColl = collection(db, 'private_calls', callId, 'audio_packets');
              const packetId = `p_${currentUid}_${Date.now()}`;
              await setDoc(doc(pColl, packetId), {
                id: packetId,
                senderUid: currentUid,
                senderName: currentUserName,
                audioBase64: base64,
                timestamp: Date.now()
              });
            }
          } catch (err) {}
        }
      };

      r.start(1000); // 1-second chunks for instant real-time conversation response
    } catch (e) {
      console.warn("Failed private call recorder initialization:", e);
    }
  };

  const stopRecordingVoicePackets = () => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
  };

  // Playback engine for queue of base64 audio blocks
  const triggerQueuePlayback = async () => {
    if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingQueueRef.current = true;
    setPeerSpeaking(true);

    const run = async () => {
      if (audioQueueRef.current.length === 0) {
        isPlayingQueueRef.current = false;
        setPeerSpeaking(false);
        return;
      }

      const nextBase64 = audioQueueRef.current.shift();
      if (nextBase64) {
        try {
          const audioSrc = `data:audio/webm;base64,${nextBase64}`;
          const aud = new Audio(audioSrc);
          aud.volume = 1.0;
          await aud.play();
          
          aud.onended = () => {
            run();
          };
          aud.onerror = () => {
            // Fallback try next right away
            run();
          };
        } catch (err) {
          // Playback blocked or decode error, proceed
          run();
        }
      } else {
        run();
      }
    };

    run();
  };

  // Terminate Calls
  const handleTerminateCall = async (notifyPartner: boolean = true) => {
    const callId = activeCall?.id || activeCallIdRef.current;
    
    // Stop local micro recording
    stopRecordingVoicePackets();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalAudioStream(null);

    if (callId && notifyPartner) {
      try {
        // Set state to ended in Firestore, then delete
        await updateDoc(doc(db, 'private_calls', callId), { status: 'ended' });
        setTimeout(async () => {
          await deleteDoc(doc(db, 'private_calls', callId)).catch(() => {});
        }, 1500);
      } catch (err) {}
    }

    setActiveCall(null);
    setIsCalling(false);
    setCallDuration(0);
    setGlobalCallId(null);
    activeCallIdRef.current = null;
  };

  // Respond to Incoming Calls
  const handleAcceptIncomingCall = async () => {
    if (!activeCall) return;
    unlockAudioEngine();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setLocalAudioStream(stream);

      // Connect status
      await updateDoc(doc(db, 'private_calls', activeCall.id), { status: 'accepted' });
      setActiveCall(prev => prev ? { ...prev, status: 'accepted' } : null);
      
      // Auto open chat page with calling student for a seamless experience
      const partnerUid = activeCall.callerUid;
      const partner = students.find(s => s.uid === partnerUid);
      if (partner) {
        setGlobalChatUser(partner);
      }

    } catch (err) {
      console.warn("Failed accepting incoming call mic access:", err);
      alert("يرجى منح صلاحية الميكروفون للموقع لتتمكن من الرد على المكالمة.");
      handleDeclineIncomingCall();
    }
  };

  const handleDeclineIncomingCall = async () => {
    if (!activeCall) return;
    try {
      await updateDoc(doc(db, 'private_calls', activeCall.id), { status: 'declined' });
      setTimeout(async () => {
        await deleteDoc(doc(db, 'private_calls', activeCall.id)).catch(() => {});
      }, 1000);
    } catch (err) {}
    handleTerminateCall(false);
  };

  // Incoming Call passive monitoring scanner
  useEffect(() => {
    if (activeCall?.id) return; // already in active dialog

    // Listen to private_calls collection to capture if someone calls us in real-time
    const q = query(collection(db, 'private_calls'), where('calleeUid', '==', currentUid), limit(1));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const call = docSnap.data() as ActiveCall;
        if (call.status === 'calling' || call.status === 'ringing') {
          // Play beautiful low ring accent
          unlockAudioEngine();
          setActiveCall(call);
        }
      });
    }, (err) => {
      console.warn("Direct incoming call listener error:", err);
    });

    return () => unsub();
  }, [currentUid, activeCall?.id]);

  // Search filtering & dynamic inbox sorting
  const filteredStudents = students.filter(student => {
    const queryLower = searchQuery.toLowerCase().trim();
    if (!queryLower) return true;
    
    const cleanBinId = student.binId?.toLowerCase() || '';
    const cleanStudentId = student.studentId?.toLowerCase() || '';
    const cleanUsername = student.username?.toLowerCase() || '';
    const cleanFullName = (student.fullName || '').toLowerCase();
    
    const matchesId = cleanBinId.includes(queryLower) || cleanStudentId.includes(queryLower);
    const matchesName = cleanUsername.includes(queryLower) || cleanFullName.includes(queryLower);
    const matchesAcademic = (student.academicStage?.toLowerCase() || '').includes(queryLower) || 
                            (student.academicYear?.toLowerCase() || '').includes(queryLower) ||
                            (student.academicTrack?.toLowerCase() || '').includes(queryLower);

    return matchesId || matchesName || matchesAcademic;
  }).sort((a, b) => {
    const aChat = chatsMap[a.uid];
    const bChat = chatsMap[b.uid];
    
    const aUnread = aChat?.unreadCount || 0;
    const bUnread = bChat?.unreadCount || 0;
    
    if (aUnread !== bUnread) {
      return bUnread - aUnread; // Priority to chats with unread messages
    }
    
    const aTime = aChat?.lastMessageAt || 0;
    const bTime = bChat?.lastMessageAt || 0;
    return bTime - aTime; // Sort by latest message
  });

  // Utility to format seconds to MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="students-directory" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch min-h-[550px]" dir="rtl">
      
      {/* 1. RIGHT SIDEBAR / LIST PANEL: All Students Directory */}
      <div className={`bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between ${
        selectedChatUser ? 'lg:col-span-5 hidden lg:flex' : 'lg:col-span-12'
      }`}>
        <div>
          {/* Header Title with counts */}
          <div className="flex items-center justify-between mb-5 select-noneUnified">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-gold/10 flex items-center justify-center">
                <GraduationCap className="text-brand-dark" size={20} />
              </div>
              <div className="text-right">
                <h2 className="font-extrabold text-[#111] text-base leading-snug">دليل زملاء الدراسة</h2>
                <p className="text-[10px] text-gray-500 font-bold">تواصل مباشرة واتصل بزملائك بالجامعة</p>
              </div>
            </div>
            <span className="text-[10px] bg-brand-dark text-white rounded-full px-3 py-1 font-black">
              {students.length} طالب
            </span>
          </div>

          {/* Search Box inputs */}
          <div className="relative mb-5">
            <span className="absolute right-3.5 top-3.5 text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text"
              placeholder="ابحث باسم الطالب، أو رمز ID الخاص (bin_...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-right pr-9.5 pl-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-xs placeholder:text-gray-400 text-gray-800 font-extrabold focus:outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all"
            />
          </div>

          {/* Directory Student Cards stream */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-brand-gold border-t-transparent animate-spin"></div>
              <span className="text-xs text-gray-500 font-bold">جاري تحميل دليل الطلاب الأكاديمي...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-2 border border-dashed border-gray-200 rounded-2xl">
              <UserIcon className="text-gray-300" size={36} />
              <p className="text-xs text-gray-500 font-bold">لم نجد أي طُلاب يطابقون بحثك الحالي.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[430px] overflow-y-auto no-scrollbar">
              {filteredStudents.map((st) => (
                <div 
                  key={st.uid}
                  onClick={() => {
                    setViewingPublicProfile(st);
                    unlockAudioEngine();
                  }}
                  className="p-4 bg-slate-50 hover:bg-slate-100/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all duration-200 group relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-blue/0 group-hover:bg-brand-gold transition-all"></div>
                  
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <img 
                        src={st.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(st.username)}`} 
                        alt={st.username}
                        className="w-11 h-11 rounded-2xl border border-white shrink-0 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" title="نشط الآن"></span>
                    </div>

                    <div className="min-w-0 text-right">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-gray-800 truncate group-hover:text-brand-dark transition-colors">
                          {st.username}
                        </span>
                        
                        {/* Student Type tag */}
                        <span className="text-[9px] bg-brand-gold/10 text-brand-dark font-black px-2 py-0.5 rounded-full shrink-0">
                          {st.academicStage || 'بكالوريوس'}
                        </span>

                        {/* Unread messaging badge count */}
                        {chatsMap[st.uid]?.unreadCount > 0 && (
                          <span className="text-[9px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                            {chatsMap[st.uid].unreadCount} رسالة جديدة
                          </span>
                        )}
                      </div>

                      {/* Displaying Student Code bin_48291 */}
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mt-1.5 select-all">
                        <Hash size={10} className="text-brand-gold" />
                        <span className="font-mono text-gray-500">{st.binId}</span>
                      </div>

                      {/* Course / Year metadata */}
                      <p className="text-[10px] text-gray-500 mt-1 truncate">
                        {st.academicYear} • {st.academicTrack} • {st.academicSemester}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Triggers */}
                  {st.uid !== currentUid ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Triggers outgoing directly call
                          handleStartCall(st);
                        }}
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-xl text-emerald-600 transition-all cursor-pointer"
                        title="اتصال صوتي مباشر"
                      >
                        <Phone size={14} className="stroke-[2.5]" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setGlobalChatUser(st);
                        }}
                        className="p-2 bg-brand-gold/15 hover:bg-brand-gold hover:text-white text-brand-dark rounded-xl transition-all cursor-pointer relative"
                        title="مراسلة سريعة"
                      >
                        <MessageSquare size={14} className="stroke-[2.5]" />
                        {chatsMap[st.uid]?.unreadCount > 0 && (
                          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] bg-brand-gold/10 text-brand-gold font-extrabold px-2.5 py-1 rounded-xl">
                      ملفك الشخصي
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer informative alert */}
        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-2.5 text-right select-none">
          <Info size={14} className="text-brand-gold shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
            ملاحظة: مُعرف كل دارس في منصتنا يبدأ دائمًا بالأحرف الفريدة <span className="font-mono text-brand-dark font-black">bin</span> لدواعي فرز الهوية والمصادقة الأكاديمية المشتركة.
          </p>
        </div>
      </div>

      {/* 2. LEFT PANEL: Active Chat & Ongoing Voice Call Pane */}
      {selectedChatUser && (
        <div className="lg:col-span-7 bg-slate-50 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between overflow-hidden relative">
          
          {/* Active Chat Header */}
          <div className="bg-white border-b border-gray-150 p-4 flex items-center justify-between select-none">
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setGlobalChatUser(null)}
                className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-500 lg:hidden cursor-pointer"
                title="العودة للدليل"
              >
                <X size={16} />
              </button>

              <div className="relative">
                <img 
                  src={selectedChatUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedChatUser.username)}`} 
                  alt={selectedChatUser.username}
                  className="w-10 h-10 rounded-2xl border border-slate-100 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              </div>

              <div className="text-right">
                <h3 className="font-black text-xs text-slate-800 leading-tight flex items-center gap-1">
                  <span>{selectedChatUser.username}</span>
                  <span className="text-[9px] bg-brand-gold/15 text-brand-dark font-black px-1.5 py-0.5 rounded-full">
                    {selectedChatUser.binId}
                  </span>
                </h3>
                <p className="text-[9px] text-gray-400 mt-1">
                  {selectedChatUser.academicStage} ({selectedChatUser.academicYear})
                </p>
              </div>
            </div>

            {/* Calling button on private chat head */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStartCall(selectedChatUser)}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
              >
                <Phone size={13} className="stroke-[2.5]" />
                <span>اتصال هاتفي</span>
              </button>

              <button
                onClick={() => setGlobalChatUser(null)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hidden lg:block cursor-pointer"
                title="إغلاق المحادثة"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messaging stream body */}
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-3.5 min-h-[350px]">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <div className="w-12 h-12 bg-brand-gold/10 text-brand-dark rounded-2xl flex items-center justify-center">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-extrabold">بداية المحادثة الخاصة الآمنة</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">اكتب رسالتك وباشر النقاش الثنائي العلمي بأمان</p>
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderUid === currentUid;
                return (
                  <div 
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-start' : 'justify-end'} text-right`}
                  >
                    <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm text-xs ${
                      isMe 
                        ? 'bg-brand-dark text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                    }`}>
                      {/* Sender handle */}
                      {!isMe && (
                        <p className="text-[10px] font-black text-brand-dark/80 mb-1">
                          {selectedChatUser.username}
                        </p>
                      )}
                      
                      <p className="leading-relaxed font-bold whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Message formatted timestamps and state ticks */}
                      <div className="flex items-center justify-end gap-1.5 mt-1.5 font-mono text-[9px]">
                        <span className={isMe ? 'text-slate-300' : 'text-gray-400'}>
                          {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className={`font-black ${msg.status === 'read' ? 'text-sky-305 text-amber-300' : 'text-slate-400'}`} title={msg.status === 'read' ? 'قُرئت الرسالة' : 'أُرسلت'}>
                            {msg.status === 'read' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Text input form block */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-gray-150 flex items-center gap-2"
          >
            <input 
              type="text"
              placeholder="اكتب رسالة خاصة زميلي الدارس..."
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-grow pr-4 pl-2 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-xs placeholder:text-gray-400 text-gray-800 font-extrabold focus:outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all text-right"
            />
            
            <button 
              type="submit"
              className="p-3 bg-brand-gold text-brand-dark rounded-xl hover:bg-brand-gold/90 transition-all shrink-0 cursor-pointer shadow-md shadow-brand-gold/10"
              title="إرسال"
            >
              <Send size={15} className="stroke-[2.5]" />
            </button>
          </form>

        </div>
      )}

      {/* 3. ABSOLUTE SYSTEM POPUPS: Private Voice Calling Modals (Incoming vs Outgoing) */}
      {activeCall && (
        <div className="fixed inset-0 bg-brand-dark/65 backdrop-blur-md z-50 flex items-center justify-center p-4" dir="rtl">
          
          {/* Ringing/Calling interactive Box */}
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
            
            {/* Ambient golden radial background highlights */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-brand-gold/20 to-transparent"></div>
            
            {/* Pulsing visual core container */}
            <div className="relative mt-4 mb-4">
              <div className="absolute -inset-4 bg-brand-gold/15 rounded-full animate-ping opacity-60"></div>
              <div className="absolute -inset-2 bg-brand-gold/20 rounded-full animate-pulse"></div>
              
              <div className="relative w-20 h-20 bg-brand-dark text-brand-gold rounded-full flex items-center justify-center shadow-lg">
                {activeCall.status === 'accepted' ? (
                  <PhoneCall size={32} className="animate-bounce" />
                ) : (
                  <PhoneIncoming size={32} className="animate-pulse text-brand-gold" />
                )}
              </div>
            </div>

            {/* Active peer call profile handles */}
            <h3 className="font-extrabold text-gray-900 text-lg mt-3">
              {activeCall.callerUid === currentUid ? activeCall.calleeName : activeCall.callerName}
            </h3>
            
            <p className="text-[10px] text-gray-400 font-black tracking-wide mt-1 uppercase">
              {activeCall.callerUid === currentUid ? 'اتصال صادر مباشر' : 'مكالمة أكاديمية واردة'}
            </p>

            {/* Display customized Call status descriptions */}
            {activeCall.status === 'calling' && (
              <div className="mt-4 text-xs font-bold text-gray-500 flex items-center gap-1.5 animate-pulse">
                <CircleDot size={12} className="text-emerald-500 animate-ping" />
                <span>جاري رنين وتنبيه الزميل بالاتصال...</span>
              </div>
            )}

            {activeCall.status === 'ringing' && (
              <div className="mt-4 text-xs font-bold text-gray-500 flex items-center gap-1.5 animate-pulse">
                <CircleDot size={12} className="text-emerald-400 animate-ping" />
                <span>مكالمة واردة... بانتظار ردّك</span>
              </div>
            )}

            {activeCall.status === 'accepted' && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <span className="text-xl font-mono text-emerald-600 font-extrabold bg-emerald-50 px-4 py-1.5 rounded-full select-none">
                  {formatTime(callDuration)}
                </span>
                
                {/* Audio visual indicators */}
                <div className="flex items-center gap-1 mt-1 justify-center">
                  <span className={`w-1 h-3.5 bg-emerald-500 rounded-full ${peerSpeaking ? 'animate-bounce' : 'opacity-40'}`}></span>
                  <span className={`w-1 h-5 bg-emerald-500 rounded-full ${peerSpeaking ? 'animate-bounce delay-75' : 'opacity-40'}`}></span>
                  <span className={`w-1 h-3 bg-emerald-500 rounded-full ${peerSpeaking ? 'animate-bounce delay-150' : 'opacity-40'}`}></span>
                  <span className={`w-1 h-4.5 bg-emerald-500 rounded-full ${peerSpeaking ? 'animate-bounce' : 'opacity-40'}`}></span>
                  <span className="text-[10px] text-emerald-600 font-extrabold mr-1.5">
                    {peerSpeaking ? 'صوت الطرف الآخر مسموع' : 'متصل بالصوت'}
                  </span>
                </div>
              </div>
            )}

            {/* Responsive Actions: Decline vs Accept options */}
            <div className="flex items-center gap-4 mt-7 w-full">
              {activeCall.status === 'calling' || activeCall.status === 'accepted' ? (
                // Single RED Hang Up trigger button
                <button
                  onClick={() => handleTerminateCall(true)}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-600/10"
                >
                  <PhoneOff size={16} />
                  <span>إنهاء المكالمة</span>
                </button>
              ) : activeCall.callerUid === currentUid ? (
                // Caller shows cancel while waiting
                <button
                  onClick={() => handleTerminateCall(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-500 hover:bg-slate-600 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  <X size={15} />
                  <span>إلغاء الطلب</span>
                </button>
              ) : (
                // Callee shows Accept/Decline action switches
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={handleAcceptIncomingCall}
                    className="flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
                  >
                    <Check size={15} className="stroke-[2.5]" />
                    <span>قبول</span>
                  </button>
                  
                  <button
                    onClick={handleDeclineIncomingCall}
                    className="flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-600/10"
                  >
                    <X size={15} />
                    <span>رفض</span>
                  </button>
                </div>
              )}
            </div>

            {/* Audio configuration sliders */}
            {activeCall.status === 'accepted' && (
              <div className="flex items-center gap-6 mt-4.5 border-t border-gray-100 pt-4 w-full justify-around select-none">
                
                {/* Micro Mute action */}
                <button 
                  onClick={() => setCallMuted(!callMuted)}
                  className={`flex flex-col items-center gap-1.5 p-1 transition-all cursor-pointer ${
                    callMuted ? 'text-red-500 font-extrabold' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center line ${
                    callMuted ? 'bg-red-50' : 'bg-slate-100'
                  }`}>
                    {callMuted ? <MicOff size={15} /> : <Mic size={15} />}
                  </div>
                  <span className="text-[9px]">{callMuted ? 'كتم الميكروفون' : 'كتم صوتمي'}</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 4. PUBLIC STUDENT PROFILE MODAL/POPUP */}
      {viewingPublicProfile && (
        <div className="fixed inset-0 bg-brand-dark/65 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-150 shadow-2xl relative overflow-hidden flex flex-col items-center">
            
            {/* Close button */}
            <button 
              onClick={() => setViewingPublicProfile(null)}
              className="absolute top-4 left-4 p-2 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors cursor-pointer z-20"
            >
              <X size={16} />
            </button>

            {/* Ambient gold radial background design */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-brand-gold/15 to-transparent"></div>

            {/* Profile Avatar */}
            <div className="relative mt-5 mb-4 shrink-0">
              <img 
                src={viewingPublicProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(viewingPublicProfile.username)}`} 
                alt={viewingPublicProfile.username}
                className="w-24 h-24 rounded-3xl border-4 border-white shadow-md object-cover relative z-10"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 left-0 w-5 h-5 bg-green-500 border-4 border-white rounded-full z-20"></span>
            </div>

            {/* Name */}
            <h3 className="font-extrabold text-slate-800 text-lg text-center leading-snug">
              {viewingPublicProfile.fullName || viewingPublicProfile.username}
            </h3>

            {/* Student ID block */}
            <div className="flex items-center gap-1.5 mt-2.5 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-gray-500 font-bold">رقم الطالب / Student ID:</span>
              <span className="font-mono text-xs font-black text-brand-blue select-all">{viewingPublicProfile.binId}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingPublicProfile.binId);
                  setModalCopied(true);
                  setTimeout(() => setModalCopied(false), 2000);
                }}
                type="button"
                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-brand-gold transition-colors shrink-0 cursor-pointer"
                title="نسخ المعرف"
              >
                {modalCopied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Academic Information tag details */}
            <div className="w-full mt-4 bg-slate-50/50 rounded-2xl p-3.5 border border-slate-100 grid grid-cols-2 gap-2 text-xs text-right">
              <div>
                <p className="text-[10px] text-gray-400 font-bold">المستوى الدراسي</p>
                <p className="font-black text-slate-700 mt-0.5">{viewingPublicProfile.academicStage || 'بكالوريوس'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold">السنة الدراسية</p>
                <p className="font-extrabold text-slate-700 mt-0.5">{viewingPublicProfile.academicYear || 'سنة أولى'}</p>
              </div>
              {viewingPublicProfile.department && (
                <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">
                  <p className="text-[10px] text-gray-400 font-bold">القسم / التخصص الإكلينيكي</p>
                  <p className="font-black text-brand-blue mt-0.5">{viewingPublicProfile.department}</p>
                </div>
              )}
            </div>

            {/* Bio / Personal Description */}
            <div className="w-full mt-4 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-right">
              <p className="text-[10px] text-gray-400 font-black mb-1.5 flex items-center gap-1">
                <span>📝 الوصف الشخصي</span>
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap">
                {viewingPublicProfile.bio && viewingPublicProfile.bio.trim() !== '' 
                  ? viewingPublicProfile.bio 
                  : 'لم يضف وصفاً بعد'
                }
              </p>
            </div>

            {/* Action buttons (Chat & Call) */}
            {viewingPublicProfile.uid !== currentUid ? (
              <div className="grid grid-cols-2 gap-3 w-full mt-5">
                <button
                  onClick={() => {
                    setGlobalChatUser(viewingPublicProfile);
                    setViewingPublicProfile(null);
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-brand-dark hover:bg-brand-blue text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-md"
                >
                  <MessageSquare size={14} className="stroke-[2.5]" />
                  <span>مراسلة خاصة</span>
                </button>

                <button
                  onClick={() => {
                    handleStartCall(viewingPublicProfile);
                    setViewingPublicProfile(null);
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  <Phone size={14} className="stroke-[2.5]" />
                  <span>اتصال صوتي</span>
                </button>
              </div>
            ) : (
              <div className="w-full mt-5 text-center">
                <p className="text-[10px] text-gray-400 font-bold mb-2">يمكنك تعديل معلوماتك الشخصية في أي وقت من علامة تبويب "الملف الشخصي" بالصفحة الرئيسية.</p>
                <div className="py-2.5 bg-brand-gold/10 text-brand-gold rounded-xl text-xs font-black">
                  ✨ هذا هو مظهر ملفك للآخرين
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
