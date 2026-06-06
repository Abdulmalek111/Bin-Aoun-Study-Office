import React, { useState, useEffect } from 'react';
import { VoiceRoom } from '../../types/voice';
import { collection, onSnapshot, doc, setDoc, query, orderBy, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { 
  Users, Plus, Ear, Lock, Globe, Search, X, Check, BookOpen, 
  Flame, MicOff, VolumeX, ShieldAlert, Volume2, Crown, 
  Activity, Clock, Radio, ShieldCheck, HelpCircle
} from 'lucide-react';

interface VoiceRoomListProps {
  onJoinRoom: (room: VoiceRoom) => void;
  isCurrentUserAdmin: boolean;
}

export default function VoiceRoomList({
  onJoinRoom,
  isCurrentUserAdmin
}: VoiceRoomListProps) {
  
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [presences, setPresences] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [activeTab, setActiveTab] = useState<'rooms' | 'dashboard'>('rooms');
  
  // Create Room modal configurations
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomType, setNewRoomType] = useState<'public' | 'private'>('public');
  const [newRoomCapacity, setNewRoomCapacity] = useState(15);
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['student', 'teacher', 'moderator', 'admin']);
  const [submitting, setSubmitting] = useState(false);

  // Selected room for detailed preview modal in side view
  const [selectedPreviewRoom, setSelectedPreviewRoom] = useState<string | null>(null);

  // 1. Authenticated User Presence Setup
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const presenceRef = doc(db, 'voice_presence', currentUser.uid);
    
    const initPresence = async () => {
      try {
        const snap = await getDoc(presenceRef);
        if (snap.exists()) {
          const currentData = snap.data();
          // If they are already connected in a room, retain that room setting
          if (currentData.currentRoomId) return;
        }
        
        let currentRole = 'student';
        if (currentUser.email === 'abdulmlikoog@gmail.com') {
          currentRole = 'admin';
        } else {
          try {
            const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDocSnap.exists() && userDocSnap.data().role) {
              currentRole = userDocSnap.data().role;
            }
          } catch (_) {}
        }
        
        await setDoc(presenceRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'طالب مجهول',
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'Stud')}`,
          role: currentRole,
          currentRoomId: null,
          currentRoomName: null,
          isSpeaking: false,
          isMuted: false,
          isDeafened: false,
          lastSeen: new Date().toISOString(),
          status: 'online'
        });
      } catch (err) {
        console.warn('[Presence] Failed to initialize presence document:', err);
      }
    };
    
    initPresence();
    
    // Clean up presence on unmount
    return () => {
      const cleanupPresence = async () => {
        try {
          const snap = await getDoc(presenceRef);
          if (snap.exists()) {
            const data = snap.data();
            // Only erase if they are NOT inside an active room session
            if (!data.currentRoomId) {
              await deleteDoc(presenceRef).catch(() => {});
            }
          }
        } catch (_) {}
      };
      cleanupPresence();
    };
  }, []);

  // 2. Real-time Rooms Listener
  useEffect(() => {
    const q = query(collection(db, 'voice_rooms'), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, async (snapshot) => {
      const list: VoiceRoom[] = [];
      
      snapshot.forEach((docRef) => {
        const d = docRef.data();
        list.push({
          id: docRef.id,
          name: d.name || '',
          description: d.description || '',
          type: d.type || 'public',
          ownerId: d.ownerId || '',
          maxUsers: typeof d.maxUsers === 'number' ? d.maxUsers : 10,
          isLocked: !!d.isLocked,
          allowedRoles: d.allowedRoles || [],
          createdAt: d.createdAt || '',
          updatedAt: d.updatedAt || ''
        });
      });

      // Default system rooms seeding if empty
      if (list.length === 0 && isCurrentUserAdmin) {
        setLoading(true);
        try {
          const adminId = auth.currentUser?.uid || 'system';
          const defaultRooms = [
            {
              id: 'vr-main-study-1',
              name: 'غرفة النقاش الصوتي العامة 🌍',
              description: 'الغرفة الصوتية الرئيسية للمناقشة وتحدي الأسئلة الجامعية وحل المسائل المباشر.',
              type: 'public',
              ownerId: adminId,
              maxUsers: 25,
              isLocked: false,
              allowedRoles: ['student', 'teacher', 'moderator', 'admin']
            },
            {
              id: 'vr-maths',
              name: 'غرفة الرياضيات والهندسة 📐',
              description: 'حلقات دراسية وتداريب مساعدة متبادلة في الإحصاء، الجبر، وحل الهندسة التحليلية.',
              type: 'public',
              ownerId: adminId,
              maxUsers: 15,
              isLocked: false,
              allowedRoles: ['student', 'teacher', 'moderator', 'admin']
            },
            {
              id: 'vr-physics',
              name: 'غرفة الفيزياء الميكانيكية 🌌',
              description: 'شروحات وافية وتفسير مسائل السرعة، التسارع وظواهر الكم مع هيئة التدريس.',
              type: 'public',
              ownerId: adminId,
              maxUsers: 20,
              isLocked: false,
              allowedRoles: ['student', 'teacher', 'moderator', 'admin']
            }
          ];

          for (const room of defaultRooms) {
            await setDoc(doc(db, 'voice_rooms', room.id), {
              ...room,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (seedErr) {
          console.warn('[Seeding] Failed background seeding rooms:', seedErr);
        }
      }

      setRooms(list);
      setLoading(false);
    }, (error) => {
      console.error('[VoiceList] Firestore snapshot error:', error);
      setLoading(false);
    });

    return () => unsub();
  }, [isCurrentUserAdmin]);

  // 3. Real-time Presences Snapshot Listener
  useEffect(() => {
    const q = collection(db, 'voice_presence');
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docRef) => {
        list.push(docRef.data());
      });
      setPresences(list);
    }, (error) => {
      console.error('[VoiceList] Presences subscription error:', error);
    });

    return () => unsub();
  }, []);

  // 4. Gather Live logs of Connects/Leaves from Active Rooms
  useEffect(() => {
    if (rooms.length === 0) return;
    
    const unsubs = rooms.map(room => {
      const eventsRef = collection(db, `voice_rooms/${room.id}/events`);
      return onSnapshot(eventsRef, (snap) => {
        const eventsList: any[] = [];
        snap.forEach(docRef => {
          const data = docRef.data();
          eventsList.push({
            id: docRef.id,
            roomName: room.name,
            ...data
          });
        });
        
        setRecentLogs(prev => {
          const filtered = prev.filter(e => e.roomName !== room.name);
          return [...filtered, ...eventsList].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ).slice(0, 30); // Keep last 30
        });
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [rooms]);

  // Handle creating room write
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || submitting) return;

    setSubmitting(true);
    const id = `vr-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newRoomPayload = {
      id,
      name: newRoomName.trim(),
      description: newRoomDesc.trim() || 'غرفة مخصصة لمناقشة الفصول الدراسية وحل المسائل الصعبة.',
      type: newRoomType,
      ownerId: auth.currentUser?.uid || 'unknown',
      maxUsers: Number(newRoomCapacity),
      isLocked: newRoomType === 'private',
      allowedRoles,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      await setDoc(doc(db, 'voice_rooms', id), newRoomPayload);
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomDesc('');
      setNewRoomType('public');
      setNewRoomCapacity(15);
      setAllowedRoles(['student', 'teacher', 'moderator', 'admin']);
    } catch (err) {
      console.error('[VoiceRoomList] Firestore write error:', err);
      alert('فشل إنشاء الغرفة الصوتية. يرجى مراجعة الصلاحيات والاتصال.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRole = (role: string) => {
    setAllowedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  // Helper: Retrieve peer details grouped by Room
  const getRoomPeers = (roomId: string) => {
    return presences.filter(p => p.currentRoomId === roomId && p.status === 'online');
  };

  // Helper: Determine room activity status indicator
  const getRoomStatusLabel = (roomPeers: any[]) => {
    const count = roomPeers.length;
    if (count === 0) {
      return {
        badge: '🔴 فارغة',
        color: 'bg-red-500/10 text-red-500 border-red-500/20'
      };
    }
    const isAnySpeaking = roomPeers.some(p => p.isSpeaking && !p.isMuted);
    if (isAnySpeaking) {
      return {
        badge: '🟢 نشطة الآن',
        color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-black animate-pulse'
      };
    }
    return {
      badge: '🟡 يوجد أعضاء لكن لا يوجد متحدث',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    };
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-1.5 py-0.2 rounded">مشرف👑</span>;
      case 'teacher':
        return <span className="bg-amber-500/10 text-amber-600 text-[8px] font-black px-1.5 py-0.2 rounded">أستاذ📚</span>;
      case 'moderator':
        return <span className="bg-purple-500/10 text-purple-600 text-[8px] font-black px-1.5 py-0.2 rounded">رقيب🛡️</span>;
      default:
        return <span className="bg-slate-100 text-slate-500 text-[8px] font-bold px-1.5 py-0.2 rounded">دارِس🎓</span>;
    }
  };

  // Filter Rooms
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          room.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'all') return matchesSearch;
    return room.type === filterType && matchesSearch;
  });

  // Calculate stats for Dashboard
  const totalConnectedCount = presences.filter(p => p.status === 'online').length;
  const inVoiceRoomsCount = presences.filter(p => p.status === 'online' && p.currentRoomId).length;
  
  // Find most active room
  const roomStats = rooms.map(room => ({
    room,
    count: getRoomPeers(room.id).length
  })).sort((a, b) => b.count - a.count);
  const mostActiveRoom = roomStats[0] && roomStats[0].count > 0 ? roomStats[0].room : null;

  return (
    <div className="w-full flex flex-col gap-6 select-none bg-white font-sans text-right relative">
      
      {/* Admin/Supervisor Navigation Selector */}
      {isCurrentUserAdmin && (
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl self-start mb-2 select-none">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === 'rooms' 
                ? 'bg-white text-brand-dark shadow-md' 
                : 'text-gray-500 hover:text-brand-dark'
            }`}
          >
            🎙️ مدرّجات الحوار البثي
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dashboard' 
                ? 'bg-white text-brand-dark shadow-md' 
                : 'text-gray-500 hover:text-brand-dark'
            }`}
          >
            <Activity size={13} className="text-red-500" />
            <span>لوحة الرقابة التفاعلية 📊</span>
          </button>
        </div>
      )}

      {activeTab === 'rooms' ? (
        <>
          {/* Main Title Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-gray-100 pb-4">
            <div className="space-y-1">
              <h2 className="font-black text-xl md:text-2xl text-brand-dark leading-tight flex items-center gap-2">
                مُدرّجات الحوار الصوتي المباشر🎙️
              </h2>
              <p className="text-xs text-sidebar-gray font-medium">
                ناقش المناهج المدرسية مع زملائك والمشرفين بالصوت الحي العالي الجودة بجودة Discord.
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark rounded-2xl text-xs font-black shrink-0 transition-all duration-300 transform active:scale-95 shadow-lg shadow-brand-gold/15 cursor-pointer"
            >
              <Plus size={16} />
              <span>إنشاء مدرّج صوتي دائم</span>
            </button>
          </div>

          {/* Search and Filters Hub */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/60 p-4 rounded-3xl border border-gray-100">
            <div className="flex items-center gap-1.5 p-1 bg-gray-200/50 rounded-2xl self-stretch md:self-auto shrink-0 select-none">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 text-[11px] font-black rounded-xl transition-all cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'
                }`}
              >
                كل الغرف
              </button>
              <button
                onClick={() => setFilterType('public')}
                className={`px-4 py-2 text-[11px] font-black rounded-xl transition-all cursor-pointer ${
                  filterType === 'public' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'
                }`}
              >
                الغرف العامة 🌎
              </button>
              <button
                onClick={() => setFilterType('private')}
                className={`px-4 py-2 text-[11px] font-black rounded-xl transition-all cursor-pointer ${
                  filterType === 'private' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'
                }`}
              >
                المغلقة 🔒
              </button>
            </div>

            <div className="relative w-full md:w-[300px]">
              <input
                type="text"
                placeholder="البحث بالاسم أو الوصف الدراسي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs text-brand-dark focus:border-brand-gold focus:outline-none transition-colors text-right"
              />
              <Search size={14} className="absolute top-3.5 right-3.5 text-gray-400" />
            </div>
          </div>

          {/* Layout Columns: [ الغرف النشطة الآن (Sidebar) ] [ قائمة القنوات والمدرجات العامة ] */}
          <div className="flex flex-col lg:flex-row gap-6 mt-2">
            
            {/* RIGHT SIDEBAR / SIDE COLUMN: الغرف النشطة الآن */}
            <div className="w-full lg:w-[320.1px] flex flex-col gap-4 self-stretch lg:border-l lg:border-gray-150 lg:pl-5 shrink-0">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="font-black text-xs text-brand-dark flex items-center gap-1.5">
                  <Flame size={14} className="text-orange-500 fill-orange-500 animate-bounce" />
                  <span>الغرف النشطة الآن 🔥</span>
                </h3>
                <span className="text-[10px] text-gray-400 font-bold">بث مباشر</span>
              </div>

              {/* List of rooms with members > 0 */}
              <div className="flex flex-col gap-3 min-h-[160px] max-h-[480px] overflow-y-auto pr-1">
                {rooms.filter(r => getRoomPeers(r.id).length > 0).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-gray-150 rounded-2xl text-center bg-gray-50/20">
                    <Radio size={24} className="text-gray-300 animate-pulse" />
                    <p className="text-[10px] text-gray-400 font-bold mt-2">لا توجد حوارات صوتية نشطة حالياً</p>
                    <p className="text-[8.5px] text-gray-300">كن أول من ينضم للحديث المباشر!</p>
                  </div>
                ) : (
                  rooms.filter(r => getRoomPeers(r.id).length > 0).map(room => {
                    const roomPeers = getRoomPeers(room.id);
                    const isAnySpeaking = roomPeers.some(p => p.isSpeaking && !p.isMuted);

                    return (
                      <div 
                        key={room.id}
                        className={`p-3 rounded-2xl border transition-all duration-300 text-right ${
                          selectedPreviewRoom === room.id 
                            ? 'border-brand-gold bg-brand-gold/5 shadow-md' 
                            : 'border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button 
                            onClick={() => setSelectedPreviewRoom(selectedPreviewRoom === room.id ? null : room.id)}
                            className="text-right flex-1 min-w-0 font-black text-xs text-brand-dark truncate hover:text-brand-blue"
                          >
                            {room.name}
                          </button>
                          <span className="px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue rounded-lg text-[9px] font-black shrink-0">
                            {roomPeers.length} أعضاء
                          </span>
                        </div>

                        {/* List preview of users inside this room */}
                        <div className="mt-2.5 space-y-1.5">
                          {roomPeers.map(peer => (
                            <div key={peer.uid} className="flex items-center justify-between gap-2 bg-white/70 p-1.5 rounded-xl border border-gray-50 text-[10.5px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="relative">
                                  <div className={`absolute -inset-0.5 rounded-full opacity-0 ${
                                    peer.isSpeaking && !peer.isMuted ? 'bg-emerald-400 opacity-75 animate-ping' : ''
                                  }`} />
                                  <img 
                                    src={peer.photoURL} 
                                    alt={peer.displayName} 
                                    className={`w-6 h-6 rounded-full border bg-white ${
                                      peer.isSpeaking && !peer.isMuted ? 'border-emerald-500' : 'border-gray-200'
                                    }`}
                                  />
                                </div>
                                <span className="font-extrabold text-brand-dark text-[10px] truncate max-w-[100px]">{peer.displayName}</span>
                                {renderRoleBadge(peer.role)}
                              </div>

                              {/* Tiny Status indicators */}
                              <div className="flex items-center gap-1 shrink-0">
                                {peer.isSpeaking && !peer.isMuted && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="يتحدث" />
                                )}
                                {peer.isMuted && (
                                  <MicOff size={10} className="text-red-400" title="مكتوم" />
                                )}
                                {peer.isDeafened && (
                                  <VolumeX size={10} className="text-red-400" title="أصم" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Fast join action */}
                        <div className="flex gap-2 mt-3 select-none">
                          <button
                            onClick={() => onJoinRoom(room)}
                            className="w-full py-1.5 bg-brand-dark hover:bg-brand-gold text-white hover:text-brand-dark text-[10px] font-black rounded-lg transition-colors cursor-pointer text-center"
                          >
                            دخول سريع ومشاركة 🎧
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Quick info tip board */}
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl select-none mt-auto flex gap-2">
                <HelpCircle size={15} className="text-brand-gold shrink-0 mt-0.5 animate-pulse" />
                <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                  تستطيع رؤية وتتبع من يتحدث، وجميع أسماء المتواجدين وأدوارهم بالصوت اللحظي حتى دون دخول أي غرفة!
                </p>
              </div>
            </div>

            {/* LEFT AREA: DEFAULT ALL CHANNELS GRID */}
            <div className="flex-1">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4 select-none">
                <h3 className="font-black text-xs text-brand-dark">كافة القنوات المتاحة للالتحاق الدراسي ({filteredRooms.length})</h3>
                <span className="text-[10px] text-gray-400 font-bold font-mono">Live Study Index</span>
               </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-4 border-brand-gold/10 border-t-brand-gold rounded-full animate-spin"></div>
                  <p className="text-xs text-gray-400 font-bold">جاري رصد الحوارات الصوتية المباشرة...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 rounded-3xl gap-4 bg-gray-50/20">
                  <Ear size={36} className="text-gray-300 animate-pulse" />
                  <div className="text-center space-y-1">
                    <h4 className="font-extrabold text-xs text-brand-dark">لا توجد غرف مطابقة لبحثك الفلتراني</h4>
                    <p className="text-[10px] text-gray-400 font-bold">حاول تغيير معايير التصفية أو أنشئ مدرّجاً جديداً!</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                  {filteredRooms.map((room) => {
                    const roomPeers = getRoomPeers(room.id);
                    const statusConfig = getRoomStatusLabel(roomPeers);

                    return (
                      <div
                        key={room.id}
                        className="p-5 border border-gray-100 hover:border-brand-gold bg-gray-50/10 hover:bg-white rounded-[26px] transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 flex flex-col justify-between min-h-[220px] group"
                      >
                        <div className="space-y-3">
                          
                          {/* Visibility badge & Room Status directly requested */}
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <div className="flex gap-1.5 items-center">
                              {room.type === 'private' ? (
                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black rounded-lg leading-none">
                                  <Lock size={9} />
                                  خاص ومحمي
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black rounded-lg leading-none">
                                  <Globe size={9} />
                                  عام للجميع
                                </span>
                              )}
                            </div>

                            {/* Live room status indicator required: نشطة / يوجد أعضاء / فارغة */}
                            <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full border ${statusConfig.color}`}>
                              {statusConfig.badge}
                            </span>
                          </div>

                          {/* Room Metadata */}
                          <div className="space-y-1 select-text">
                            <h3 className="font-black text-sm text-brand-dark group-hover:text-brand-blue transition-colors leading-snug">
                              {room.name}
                            </h3>
                            <p className="text-[10.5px] text-gray-400 line-clamp-2 leading-relaxed">
                              {room.description}
                            </p>
                          </div>

                          {/* Render Members currently inside directly onto the Card */}
                          {roomPeers.length > 0 && (
                            <div className="pt-2">
                              <span className="text-[9px] text-gray-400 font-black block mb-2 select-none">المتواجدون بالقناة حالياً ({roomPeers.length}):</span>
                              <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
                                {roomPeers.map((peer) => (
                                  <div 
                                    key={peer.uid} 
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border bg-white text-[9.5px] transition-all ${
                                      peer.isSpeaking && !peer.isMuted 
                                        ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30' 
                                        : 'border-gray-100'
                                    }`}
                                  >
                                    <img 
                                      src={peer.photoURL} 
                                      alt={peer.displayName} 
                                      className="w-4 h-4 rounded-full border border-gray-100"
                                    />
                                    <span className="font-bold text-slate-700 truncate max-w-[80px]" title={peer.displayName}>
                                      {peer.displayName}
                                    </span>
                                    {peer.isMuted && <MicOff size={9} className="text-red-400" />}
                                    {peer.isDeafened && <VolumeX size={9} className="text-red-400" />}
                                    {peer.isSpeaking && !peer.isMuted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Interactive Footer trigger */}
                        <div className="flex items-center justify-between border-t border-gray-100/60 pt-3 mt-4">
                          <span className="text-[9.5px] text-gray-400 font-bold font-mono">
                            السعة: {roomPeers.length} / {room.maxUsers}
                          </span>

                          <button
                            onClick={() => onJoinRoom(room)}
                            className="px-4.5 py-2 bg-brand-dark group-hover:bg-brand-gold text-white group-hover:text-brand-dark rounded-xl text-[10px] font-black transition-all duration-300 transform active:scale-95 cursor-pointer shadow-md"
                          >
                            اتصل وانضم الآن ✔️
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        /* ADMIN/SUPERVISOR DASHBOARD: لوحة الرقابة والتحكم */
        <div className="space-y-6 animate-fade-in text-right font-sans">
          
          {/* Header */}
          <div className="border-b border-gray-100 pb-4">
            <h2 className="font-black text-lg md:text-xl text-brand-dark">لوحة إشراف ورصد قنوات الصوت المباشرة 📊</h2>
            <p className="text-xs text-sidebar-gray">إحصائيات تفصيلية لمجتمع الصوت والتحقق اللحظي من اتصال ومشاركة المشرفين والطلاب.</p>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-right">
              <span className="text-[9px] text-emerald-600 font-bold block mb-1">الطلاب المتصلين حالياً بالمنصة</span>
              <div className="text-2xl font-black text-emerald-700 font-sans">{totalConnectedCount}</div>
              <p className="text-[9px] text-gray-400 mt-1">تتبع Snapshot نشط</p>
            </div>

            <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-2xl p-4 text-right">
              <span className="text-[9px] text-brand-blue block font-bold mb-1">في غرف الحوار الصوتي المباشر</span>
              <div className="text-2xl font-black text-brand-dark font-sans">{inVoiceRoomsCount}</div>
              <p className="text-[9px] text-gray-400 mt-1">نسبة {totalConnectedCount > 0 ? Math.round((inVoiceRoomsCount / totalConnectedCount) * 100) : 0}% من إجمالي المتصلين</p>
            </div>

            <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 text-right">
              <span className="text-[9px] text-purple-600 block font-bold mb-1">أكثر الغرف نشاطاً اليوم</span>
              <div className="text-xs font-black text-brand-dark truncate mt-2 leading-none">
                {mostActiveRoom ? mostActiveRoom.name : 'لا توجد غرف ممتلئة'}
              </div>
              <p className="text-[9px] text-gray-400 mt-1">
                {mostActiveRoom ? `يوجد بها ${getRoomPeers(mostActiveRoom.id).length} أعضاء` : 'لا توجد قنوات نشطة'}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 text-right">
              <span className="text-[9px] text-gray-500 block font-bold mb-1">إجمالي المدرّجات الصوتية القائمة</span>
              <div className="text-2xl font-black text-brand-dark font-sans">{rooms.length}</div>
              <p className="text-[9px] text-gray-400 mt-1">متاحة ومحفوظة بالخرافة</p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Presence Table Left Panel */}
            <div className="lg:col-span-2 border border-gray-100 rounded-3xl p-5 bg-white space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="font-black text-xs text-brand-dark flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>تتبع الطلاب المتصلين وإعدادات مشاركتهم اللحظية</span>
                </h3>
                <span className="text-[9px] text-gray-400">تحديث فوري عبر Firestore</span>
              </div>

              <div className="overflow-x-auto pr-1">
                <table className="w-full text-right text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-extrabold">
                      <th className="pb-2">الطالب</th>
                      <th className="pb-2">الرتبة</th>
                      <th className="pb-2">القناة النشطة</th>
                      <th className="pb-2">الميكروفون</th>
                      <th className="pb-2">السماعات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium">
                    {presences.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 text-[10px] font-bold">لا يوجد مستخدمون متصلون بالصوت حالياً بالمنصة.</td>
                      </tr>
                    ) : (
                      presences.map((p) => (
                        <tr key={p.uid} className="hover:bg-gray-50/50">
                          <td className="py-3 flex items-center gap-2">
                            <img src={p.photoURL} alt={p.displayName} className="w-6 h-6 rounded-full border" />
                            <span className="font-extrabold text-brand-dark">{p.displayName}</span>
                          </td>
                          <td className="py-3">{renderRoleBadge(p.role)}</td>
                          <td className="py-3">
                            {p.currentRoomId ? (
                              <span className="text-brand-blue font-extrabold">🟢 {p.currentRoomName}</span>
                            ) : (
                              <span className="text-gray-400">تصفح الغرف فقط 🔘</span>
                            )}
                          </td>
                          <td className="py-3">
                            {p.isMuted ? (
                              <span className="text-red-500 font-bold flex items-center gap-1"><MicOff size={10} /> مكتوم</span>
                            ) : (
                              <span className="text-emerald-600 font-bold flex items-center gap-1"><Radio size={10} className="animate-pulse" /> يتحدث / متاح</span>
                            )}
                          </td>
                          <td className="py-3 font-bold">
                            {p.isDeafened ? (
                              <span className="text-red-500"><VolumeX size={10} className="inline mr-1" /> مغلق</span>
                            ) : (
                              <span className="text-emerald-500"><Volume2 size={10} className="inline mr-1" /> مفعل</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Historical Connection Logs */}
            <div className="border border-gray-100 rounded-3xl p-5 bg-white space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="font-black text-xs text-brand-dark flex items-center gap-1">
                  <Clock size={14} className="text-gray-400" />
                  <span>سجل حركات الدخول والخروج اللحظية</span>
                </h3>
                <span className="text-[9px] text-gray-450 font-mono">Live Logs</span>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {recentLogs.length === 0 ? (
                  <div className="py-12 text-center text-[10px] text-gray-400 font-bold bg-gray-50/50 rounded-2xl">
                    سجل المراقبة فارغ حالياً. سينعكس اتصال الطلاب فور انضمامهم.
                  </div>
                ) : (
                  recentLogs.map((log) => {
                    const logUser = presences.find(p => p.uid === log.uid);
                    const userName = logUser ? logUser.displayName : `مستخدم (${log.uid.slice(0, 5)})`;
                    const avatar = logUser ? logUser.photoURL : 'https://api.dicebear.com/7.x/initials/svg?seed=X';

                    return (
                      <div key={log.id} className="p-2.5 rounded-xl border border-gray-50 bg-gray-50/30 flex gap-2.5 items-start text-right text-[10px]">
                        <img src={avatar} alt={userName} className="w-5 h-5 rounded-full border mt-0.5 shrink-0" />
                        
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-bold text-slate-700 leading-snug">
                            <span className="font-black text-brand-dark">{userName}</span>{' '}
                            {log.type === 'join' ? (
                              <span className="text-emerald-600 font-black">انضم للغرفة</span>
                            ) : (
                              <span className="text-red-500 font-black">غادر القناة</span>
                            )}
                            :{' '}
                            <span className="text-brand-blue font-black">{log.roomName}</span>
                          </p>
                          <span className="text-[8.5px] text-gray-405 block font-mono">
                            {new Date(log.createdAt).toLocaleTimeString('ar-EG')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MODULAR CREATE ROOM DIALOG */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <div className="w-full max-w-[480px] bg-white rounded-[28px] border border-gray-100 shadow-2xl p-6 relative">
            
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 left-4 p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-full text-gray-500 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>

            <div className="text-right space-y-1 pb-4 border-b border-gray-100 select-none">
              <h3 className="font-black text-base text-brand-dark flex items-center gap-2">
                تخصيص مدرّج صوتي جديد 🎙️
              </h3>
              <p className="text-[10px] text-gray-400 font-bold leading-none">املأ الإعدادات وسيتم نشر الغرفة في لوحة زملائك فوراً.</p>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 pt-4 text-right">
              
              <div className="space-y-1 flex flex-col text-right">
                <label className="text-[11px] text-brand-dark font-black">اسم مدرّج الحوار (الرياضيات، علم الفلك...)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مراجعة نهائية فيزياء الكم ⚡"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-brand-gold focus:outline-none transition-colors text-right"
                />
              </div>

              <div className="space-y-1 flex flex-col text-right">
                <label className="text-[11px] text-brand-dark font-black">تفاصيل ومحاور الغرفة</label>
                <textarea
                  placeholder="اكتب نبذة أو المحاور المراد مراجعتها..."
                  value={newRoomDesc}
                  rows={2}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-brand-gold focus:outline-none transition-colors text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 flex flex-col text-right">
                  <label className="text-[11px] text-brand-dark font-black">تأمين الخصوصية</label>
                  <select
                    value={newRoomType}
                    onChange={(e: any) => setNewRoomType(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs focus:border-brand-gold focus:outline-none transition-colors text-right bg-white"
                  >
                    <option value="public">عام متاح للكل 🌎</option>
                    <option value="private">خاص ومحمي 🔒</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col text-right">
                  <label className="text-[11px] text-brand-dark font-black">الحد الأقصى للدارسين ({newRoomCapacity})</label>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                    className="w-full accent-brand-gold mt-2 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-2 flex flex-col text-right border-t border-gray-100 pt-3">
                <label className="text-[11px] text-brand-dark font-black">رتب مسموح لها بالدخول</label>
                <div className="flex flex-wrap gap-2 pt-1 select-none">
                  {['student', 'teacher', 'moderator'].map((role) => {
                    const isChecked = allowedRoles.includes(role);
                    let labelAr = 'طالب';
                    if (role === 'teacher') labelAr = 'معلم / أستاذ';
                    if (role === 'moderator') labelAr = 'مراقب عام';

                    return (
                      <button
                        type="button"
                        key={role}
                        onClick={() => handleToggleRole(role)}
                        className={`px-3 py-1.5 border rounded-xl text-[10px] font-black cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' 
                            : 'bg-white border-gray-200 text-gray-500 hover:text-brand-dark'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '}
                        {labelAr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !newRoomName.trim()}
                className="w-full py-3 mt-4 bg-brand-dark text-white hover:bg-brand-gold hover:text-brand-dark disabled:bg-gray-100 disabled:text-gray-300 font-extrabold text-xs rounded-xl transition-all duration-300 transform active:scale-95 cursor-pointer shadow-lg"
              >
                {submitting ? 'جاري تأسيس المدرّج الحواري...' : 'ابدأ بث الحوار المباشر الآن 🚀'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
