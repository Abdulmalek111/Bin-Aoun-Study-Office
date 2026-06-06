import React, { useState, useEffect } from 'react';
import { VoiceRoom, VoiceMember } from '../../types/voice';
import { collection, onSnapshot, doc, setDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Users, Plus, Ear, Lock, Globe, Search, X, Check, BookOpen } from 'lucide-react';

interface VoiceRoomListProps {
  onJoinRoom: (room: VoiceRoom) => void;
  isCurrentUserAdmin: boolean;
}

export default function VoiceRoomList({
  onJoinRoom,
  isCurrentUserAdmin
}: VoiceRoomListProps) {
  
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [roomMembersMap, setRoomMembersMap] = useState<Record<string, VoiceMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  
  // Create Room modal configurations
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomType, setNewRoomType] = useState<'public' | 'private'>('public');
  const [newRoomCapacity, setNewRoomCapacity] = useState(15);
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['student', 'teacher', 'moderator', 'admin']);
  const [submitting, setSubmitting] = useState(false);

  // Firestore Snapshot listener to sync live channels
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
          updatedAt: d.updatedAt || '',
          memberCount: typeof d.memberCount === 'number' ? d.memberCount : 0
        });
      });

      // Default room seed fallback to keep the view active immediately if database is empty
      if (list.length === 0 && isCurrentUserAdmin) {
        setLoading(true);
        try {
          const firstRoomId = 'vr-main-study-1';
          await setDoc(doc(db, 'voice_rooms', firstRoomId), {
            id: firstRoomId,
            name: 'غرفة المذاكرة الجماعية العامة 📝',
            description: 'الغرفة الصوتية الرئيسية للمناقشة وتحدي أسئلة البكالوريوس مع المشرفين وأساتذة المادة.',
            type: 'public',
            ownerId: auth.currentUser?.uid || 'system',
            maxUsers: 25,
            isLocked: false,
            allowedRoles: ['student', 'teacher', 'moderator', 'admin'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (seedErr) {
          console.warn('[Seeding] Failed background seeding first room:', seedErr);
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

  // Real-time snapshot listening for active participants in each room
  useEffect(() => {
    if (rooms.length === 0) return;

    const unsubscribers = rooms.map(room => {
      const membersRef = collection(db, 'voice_rooms', room.id, 'members');
      return onSnapshot(membersRef, (snap) => {
        const mList: VoiceMember[] = [];
        snap.forEach(mDoc => {
          const md = mDoc.data();
          if (md.isOnline !== false) {
            mList.push({
              uid: mDoc.id,
              displayName: md.displayName || 'مستخدم',
              photoURL: md.photoURL || '',
              role: md.role || 'student',
              isMuted: !!md.isMuted,
              isDeafened: !!md.isDeafened,
              isSpeaking: !!md.isSpeaking,
              handRaised: !!md.handRaised,
              joinedAt: md.joinedAt || '',
              lastSeen: md.lastSeen || '',
              socketId: md.socketId || ''
            });
          }
        });
        setRoomMembersMap(prev => ({
          ...prev,
          [room.id]: mList
        }));
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
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
      
      // Close reset
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

  // Toggle allowed roles checkbox lists
  const handleToggleRole = (role: string) => {
    setAllowedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  // Filter & Search logic
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          room.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    return room.type === filterType && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-6 select-none bg-white">
      
      {/* 1. Header with dynamic triggers */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        
        <div className="text-right space-y-1">
          <h2 className="font-black text-xl md:text-2xl text-brand-dark leading-tight flex items-center gap-2">
            مُدرّجات الحوار الصوتي المباشر🎙️
          </h2>
          <p className="text-xs text-gray-500 font-medium">مستوحاة من كاشفات حوار الديسكورد، ناقش مع زملائك والمشرفين بالصوت الحي عالي الجودة.</p>
        </div>

        {/* Trigger to initiate new room */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark rounded-2xl text-xs font-black shrink-0 transition-all duration-300 transform active:scale-95 shadow-lg shadow-brand-gold/15 cursor-pointer"
        >
          <Plus size={16} />
          <span>إنشاء غرفة صوتية نقاشية</span>
        </button>
      </div>

      {/* 2. Live Filters & Search Panels with dynamic states */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/60 p-4 rounded-3xl border border-gray-100">
        
        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-200/50 rounded-2xl self-stretch md:self-auto shrink-0 select-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              filterType === 'all' 
                ? 'bg-white text-brand-dark font-extrabold shadow-sm' 
                : 'text-gray-500 hover:text-brand-dark'
            }`}
          >
            كل الغرف
          </button>
          <button
            onClick={() => setFilterType('public')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              filterType === 'public' 
                ? 'bg-white text-brand-dark font-extrabold shadow-sm' 
                : 'text-gray-500 hover:text-brand-dark'
            }`}
          >
            الغرف العامة🌎
          </button>
          <button
            onClick={() => setFilterType('private')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              filterType === 'private' 
                ? 'bg-white text-brand-dark font-extrabold shadow-sm' 
                : 'text-gray-500 hover:text-brand-dark'
            }`}
          >
            غرف خاصة🔒
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-[320px]">
          <input
            type="text"
            placeholder="البحث عن غرفة صوتية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-200/80 rounded-2xl text-xs text-brand-dark focus:border-brand-gold focus:outline-none transition-colors text-right"
          />
          <Search size={14} className="absolute top-3.5 right-3.5 text-gray-400" />
        </div>

      </div>

      {/* 2.5 Active Voice Rooms Section */}
      {rooms.filter(room => (roomMembersMap[room.id] || []).length > 0).length > 0 && (
        <div className="flex flex-col gap-4 p-5 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 rounded-[28px] animate-fade-in">
          <div className="flex justify-between items-center select-none">
            <h3 className="font-extrabold text-xs text-brand-dark flex items-center gap-1.5 text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              الغرف الصوتية المشغولة حالياً 🔥 Active Channels
            </h3>
            <span className="text-[10px] text-gray-500 font-extrabold">* تحديث مباشر وتلقائي</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.filter(room => (roomMembersMap[room.id] || []).length > 0).map(room => {
              const activeMembers = roomMembersMap[room.id] || [];
              return (
                <div key={`active-${room.id}`} className="bg-white border border-emerald-500/15 hover:border-emerald-500 rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-[12px] text-brand-dark truncate">{room.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold line-clamp-1">{room.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1">
                      {/* Avatars Stack */}
                      <div className="flex -space-x-2 overflow-hidden rtl:space-x-reverse pr-1">
                        {activeMembers.slice(0, 4).map(member => (
                          <img
                            key={member.uid}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                            src={member.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.displayName)}`}
                            alt={member.displayName}
                            title={member.displayName}
                          />
                        ))}
                        {activeMembers.length > 4 && (
                          <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white text-[8px] font-black text-gray-500">
                            +{activeMembers.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-black mr-1">
                        {activeMembers.length} {activeMembers.length === 1 ? 'مستمع' : 'نشطين'}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => onJoinRoom(room)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-sm active:scale-95 animate-pulse"
                    >
                      انضم للمحادثة 🎙️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Room cards lists */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 select-none">
          <div className="w-10 h-10 border-4 border-brand-gold/10 border-t-brand-gold rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400 font-bold">جاري جلب قنوات البث الحواري والدردشة...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 rounded-3xl gap-4 select-none">
          <Ear size={40} className="text-gray-300 animate-pulse" />
          <div className="text-center space-y-1">
            <h4 className="font-extrabold text-sm text-brand-dark leading-tight">لا توجد قنوات حوار نشطة بالمواصفات المحددة</h4>
            <p className="text-[10px] text-gray-400 font-bold leading-none">تصفح الغرف العامة، أو كن سباقاً وأنشئ مدرّج نقاش صوتي جديد!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="p-5 border border-gray-100 hover:border-brand-gold bg-gray-50/20 hover:bg-white rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/60 flex flex-col justify-between group h-[190px]"
            >
              
              <div className="space-y-2">
                {/* Badge tags */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5">
                    {room.type === 'private' ? (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/10 text-amber-500 text-[9px] font-black rounded-full leading-none">
                        <Lock size={9} />
                        خاصة ومحمية
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-full leading-none">
                        <Globe size={9} />
                        غرفة دراسة عامة
                      </span>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-300 font-mono font-bold">Cap. Max: {room.maxUsers}</span>
                </div>

                {/* Name description */}
                <div className="text-right space-y-1 select-text">
                  <h3 className="font-black text-sm text-brand-dark truncate leading-tight group-hover:text-brand-blue transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                    {room.description}
                  </p>
                </div>
              </div>

              {/* Interaction join button layout footer */}
              <div className="flex items-center justify-between border-t border-gray-100/60 pt-3 mt-2">
                <div className="flex items-center gap-2 pr-1">
                  {(roomMembersMap[room.id] || []).length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5 overflow-hidden rtl:space-x-reverse">
                        {(roomMembersMap[room.id] || []).slice(0, 3).map(m => (
                          <img
                            key={m.uid}
                            className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
                            src={m.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.displayName)}`}
                            alt={m.displayName}
                            title={m.displayName}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 font-mono">
                        {(roomMembersMap[room.id] || []).length} متصل
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-extrabold">
                      <Users size={12} className="text-gray-400" />
                      <span>شاغرة حالياً</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onJoinRoom(room)}
                  className="px-4 py-2 bg-brand-dark group-hover:bg-brand-gold text-white group-hover:text-brand-dark rounded-xl text-[10.5px] font-black transition-all duration-300 transform active:scale-95 cursor-pointer shadow-md"
                >
                  انضم للغرفة الصوتية 🎧
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 4. Modular Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          
          <div className="w-full max-w-[480px] bg-white rounded-[28px] border border-gray-100 shadow-2xl p-6 relative">
            {/* Close control */}
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 left-4 p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-full text-gray-500 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>

            {/* Title */}
            <div className="text-right space-y-1 pb-4 border-b border-gray-100 select-none">
              <h3 className="font-black text-base text-brand-dark flex items-center gap-2">
                تخصيص مدرّج صوتي جديد 🎙️
              </h3>
              <p className="text-[10px] text-gray-400 font-bold leading-none">املأ الإعدادات وسيتم نشر الغرفة في لوحة زملائك فوراً.</p>
            </div>

            {/* Interactive creation Form layout */}
            <form onSubmit={handleCreateRoom} className="space-y-4 pt-4 text-right">
              
              {/* Room name input */}
              <div className="space-y-1 flex flex-col text-right">
                <label className="text-[11px] text-brand-dark font-black">اسم مدرّج الحوار (موجب)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مراجعة نهائية هندسة فراغية ✏️"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-brand-gold focus:outline-none transition-colors text-right"
                />
              </div>

              {/* Room description */}
              <div className="space-y-1 flex flex-col text-right">
                <label className="text-[11px] text-brand-dark font-black">تفاصيل ومحاور الغرفة</label>
                <textarea
                  placeholder="اكتب نبذة وموعد أو مواد الغرفة..."
                  value={newRoomDesc}
                  rows={2}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-brand-gold focus:outline-none transition-colors text-right"
                />
              </div>

              {/* Grid configs for Capacity & Visibility selection */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Visibility select */}
                <div className="space-y-1 flex flex-col text-right">
                  <label className="text-[11px] text-brand-dark font-black">تأمين الخصوصية</label>
                  <select
                    value={newRoomType}
                    onChange={(e: any) => setNewRoomType(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs focus:border-brand-gold focus:outline-none transition-colors text-right bg-white"
                  >
                    <option value="public">عام متاح للكل 🟢</option>
                    <option value="private">خاص ومحمي 🔒</option>
                  </select>
                </div>

                {/* Capacity count */}
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

              {/* Permissions Roles Allowed selectors */}
              <div className="space-y-2 flex flex-col text-right border-t border-gray-100 pt-3">
                <label className="text-[11px] text-brand-dark font-black">الصلاحيات: الرتب المسموح بدخولها الغرفة</label>
                
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

              {/* Submit button Deck */}
              <button
                type="submit"
                disabled={submitting || !newRoomName.trim()}
                className="w-full py-3 mt-4 bg-brand-dark text-white hover:bg-brand-gold hover:text-brand-dark disabled:bg-gray-100 disabled:text-gray-300 font-extrabold text-xs rounded-xl transition-all duration-300 transform active:scale-95 cursor-pointer shadow-lg"
              >
                {submitting ? 'جاري تأسيس وحفظ المدرّج...' : 'ابدأ بث الحوار المباشر الآن 🚀'}
              </button>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
