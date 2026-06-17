import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Heart, Search, MessageCircle, AlertCircle, 
  Users, Sparkles, Folder, Flame, HelpCircle, Volume2, Mic, Clock, 
  ChevronRight, Award, Shield, User, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, User as LoggedUser } from '../types';
import SubjectIcon from './SubjectIcon';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, onSnapshot, doc, setDoc, updateDoc
} from 'firebase/firestore';

// Voice Chat additions (with golden-wrapped styles)
import VoiceRoomList from './voice/VoiceRoomList';
import VoiceRoom from './voice/LiveKitVoiceRoom';
import { VoiceRoom as VoiceRoomType } from '../types/voice';

interface DiscussionsViewProps {
  subjects: Subject[];
  user?: LoggedUser | null;
}

interface ForumMessage {
  id: string;
  subjectId: string;
  authorName: string;
  authorRole: 'student' | 'instructor' | 'moderator';
  avatarSeed: string;
  content: string;
  timestamp: string;
  likes: number;
  likedByUser?: boolean;
}

const initialForumMessages: ForumMessage[] = [
  {
    id: 'm1',
    subjectId: 'math',
    authorName: 'أحمد الحارثي',
    authorRole: 'student',
    avatarSeed: 'Ahmed',
    content: 'يا شباب، كيف يمكنني فهم مسألة حساب التفاضل للدوال المثلثية المركبة؟ أحتاج إلى طريقة سهلة لتبسيطها.',
    timestamp: 'قبل ساعتين',
    likes: 8,
  },
  {
    id: 'm2',
    subjectId: 'math',
    authorName: 'المهندس عبدالملك',
    authorRole: 'instructor',
    avatarSeed: 'M Abdulmlik',
    content: 'أهلاً أحمد، القاعدة الذهبية هنا هي البدء بتطبيق قانون السلسلة (Chain Rule)، ثم تحويل كافة الدوال إلى جيب وجيب التمام (sin / cos) ليسهل الاختصار والتبسيط.',
    timestamp: 'قبل ساعة واحدة',
    likes: 15,
  },
  {
    id: 'm3',
    subjectId: 'physics',
    authorName: 'سارة العتيبي',
    authorRole: 'student',
    avatarSeed: 'Sarah',
    content: 'هل قانون النسبية مدرج في تسريبات الاختبار القادم؟ أرى أن القوانين معقدة وهناك الكثير من المسائل الرياضية المدمجة.',
    timestamp: 'قبل 4 ساعات',
    likes: 12,
  },
  {
    id: 'm4',
    subjectId: 'physics',
    authorName: 'خالد اليوسف',
    authorRole: 'moderator',
    avatarSeed: 'Khaled',
    content: 'نعم سارة، تم تأكيد سؤالين حول النسبية الخاصة والكتلة والطاقة. ركزي على الفهم المفاهيمي وليس مجرد حفظ الأرقام.',
    timestamp: 'قبل ساعتين',
    likes: 9,
  },
  {
    id: 'm5',
    subjectId: 'chemistry',
    authorName: 'محمد الدوسري',
    authorRole: 'student',
    avatarSeed: 'Mohamed',
    content: 'الروابط الهيدروجينية وصيغ الموازنة الكيميائية تسبب لي تشتت، هل هناك ملخص PDF نعتمد عليه في هذه الغرفة؟',
    timestamp: 'يوم أمس',
    likes: 5,
  },
  {
    id: 'm6',
    subjectId: 'safety',
    authorName: 'عمر القحطاني',
    authorRole: 'student',
    avatarSeed: 'Omar',
    content: 'في منهج "سلامة الحياة"، ما هي الإجراءات الأكثر أهمية عند التدريب على خطط الإخلاء في المنشآت الصناعية؟',
    timestamp: 'قبل 5 دقائق',
    likes: 2,
  },
  {
    id: 'm7',
    subjectId: 'programming',
    authorName: 'نورة السيف',
    authorRole: 'student',
    avatarSeed: 'Noura',
    content: 'أي من الخوارزميات يعتبر الأكثر فعالية في البحث في المصفوفات الكبيرة المرتّبة؟ هل Binary Search هو الأفضل دائماً؟',
    timestamp: 'قبل 30 دقيقة',
    likes: 11,
  },
  {
    id: 'm8',
    subjectId: 'programming',
    authorName: 'المهندس عون',
    authorRole: 'instructor',
    avatarSeed: 'Eng Aoun',
    content: 'ممتاز يا نورة! للبيانات المرتبة بالكامل، خوارزمية Binary Search هي الأفضل والمثلى بتعقيد زمني O(log n). بينما لو كانت البيانات غير مرتبة سنضطر للفرز أولاً أو استخدام البحث الخطي الأبطأ O(n).',
    timestamp: 'قبل 15 دقيقة',
    likes: 18,
  },
  {
    id: 'm9',
    subjectId: 'nanocad',
    authorName: 'يوسف الحربي',
    authorRole: 'student',
    avatarSeed: 'Yousef',
    content: 'من يواجه صعوبة في ضبط طبقات الإخراج ومقاييس الرسم عند تصدير النماذج ثنائية الأبعاد في نانو كاد إلى ملفات PDF جاهزة للامتحان؟',
    timestamp: 'قبل ساعة',
    likes: 4,
  },
  {
    id: 'm10',
    subjectId: 'history',
    authorName: 'عبدالرحمن العلي',
    authorRole: 'student',
    avatarSeed: 'Abdulrahman',
    content: 'عندي سؤال في مادة التاريخ الروسي: من هو القيصر الذي نقل العاصمة الروسية إلى مدينة سانت بطرسبورغ؟',
    timestamp: 'قبل 3 ساعات',
    likes: 7,
  },
  {
    id: 'm11',
    subjectId: 'history',
    authorName: 'د. فيصل',
    authorRole: 'instructor',
    avatarSeed: 'Dr Faisal',
    content: 'مرحباً عبدالرحمن. القيصر هو بطرس الأكبر (Peter the Great) وقام بذلك عام 1703 لتكون بمثابة نافذة روسيا الثقافية والجغرافية على أوروبا.',
    timestamp: 'قبل ساعتين',
    likes: 14,
  }
];

export default function DiscussionsView({ subjects, user }: DiscussionsViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Voice Section states
  const [activeSection, setActiveSection] = useState<'written' | 'voice'>('written');
  const [joinedRoom, setJoinedRoom] = useState<VoiceRoomType | null>(null);

  // Track liked message IDs in local state to preserve "likedByUser" across snapshots
  const [localLikedIds, setLocalLikedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('bin_aoun_liked_posts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('bin_aoun_liked_posts', JSON.stringify(localLikedIds));
  }, [localLikedIds]);

  // Synchronize with Firestore 'discussions' collection in Real-time
  useEffect(() => {
    const collRef = collection(db, 'discussions');
    const unsubscribe = onSnapshot(collRef, async (snapshot) => {
      let items: ForumMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          subjectId: data.subjectId || 'math',
          authorName: data.authorName || 'طالب مناقش',
          authorRole: data.authorRole || 'student',
          avatarSeed: data.avatarSeed || 'BinAoun',
          content: data.content || '',
          timestamp: data.timestamp || 'الآن',
          likes: typeof data.likes === 'number' ? data.likes : 0,
        });
      });

      // Seed default messages if the collection is fresh/empty
      if (items.length === 0) {
        try {
          for (const msg of initialForumMessages) {
            await setDoc(doc(db, 'discussions', msg.id), {
              id: msg.id,
              subjectId: msg.subjectId,
              authorName: msg.authorName,
              authorRole: msg.authorRole,
              avatarSeed: msg.avatarSeed,
              content: msg.content,
              timestamp: msg.timestamp,
              likes: msg.likes
            });
          }
        } catch (error) {
          console.error("Failed to seed initial forum items in Firestore:", error);
        }
      } else {
        items.sort((a, b) => b.id.localeCompare(a.id));
        setMessages(items);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'discussions');
    });

    return () => unsubscribe();
  }, []);

  // Handle posting a written discussion message
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    let author = user?.username || 'طالب مناقش';
    let avatarSeedValue = user?.username || 'BinAoun';
    let authorRoleValue: 'student' | 'instructor' | 'moderator' = 'student';

    if (user?.email === 'abdulmlikoog@gmail.com') {
      authorRoleValue = 'instructor';
    }

    const newMsgId = `m_${Date.now()}`;
    const targetSubjectId = selectedSubjectId === 'all' ? (subjects[0]?.id || 'math') : selectedSubjectId;

    const newMsgBody = {
      id: newMsgId,
      subjectId: targetSubjectId,
      authorName: author,
      authorRole: authorRoleValue,
      avatarSeed: avatarSeedValue,
      content: newMessageText.trim(),
      timestamp: 'الآن',
      likes: 0
    };

    try {
      await setDoc(doc(db, 'discussions', newMsgId), newMsgBody);
      setNewMessageText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `discussions/${newMsgId}`);
    }
  };

  // Toggle discussion post like
  const handleToggleLike = async (msgId: string) => {
    const isCurrentlyLiked = localLikedIds.includes(msgId);
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg) return;

    const newLikesCount = isCurrentlyLiked 
      ? Math.max(0, targetMsg.likes - 1) 
      : targetMsg.likes + 1;

    if (isCurrentlyLiked) {
      setLocalLikedIds(prev => prev.filter(id => id !== msgId));
    } else {
      setLocalLikedIds(prev => [...prev, msgId]);
    }

    try {
      await updateDoc(doc(db, 'discussions', msgId), {
        likes: newLikesCount
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `discussions/${msgId}`);
    }
  };

  // Map messages to check likes status
  const mappedMessages = messages.map(m => ({
    ...m,
    likedByUser: localLikedIds.includes(m.id)
  }));

  // Filter criteria for written messages
  const filteredMessages = mappedMessages.filter(item => {
    const matchesSubject = selectedSubjectId === 'all' || item.subjectId === selectedSubjectId;
    const matchesQuery = searchQuery.trim() === '' || 
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesQuery;
  });

  return (
    <div className="space-y-6 flex flex-col h-full text-right" dir="rtl">
      
      {/* 🌟 Tab Selector switcher for Written Forums vs Discord Voice Rooms */}
      <div className="flex items-center gap-2 p-1.5 bg-[#FAF6EE] border border-[#E9E2D2] rounded-2xl shrink-0 select-none">
        <button
          onClick={() => {
            setActiveSection('written');
            setJoinedRoom(null); // safely leave/disconnect if any
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeSection === 'written'
              ? 'bg-[#D4A947] text-[#1F1A13] font-extrabold shadow-sm'
              : 'text-[#837667] hover:text-[#2D251A] hover:bg-[#F3EFE6]'
          }`}
        >
          <MessageCircle size={15} className="text-[#2D251A]" />
          <span>حلقة النقاش المكتوبة 💬</span>
        </button>

        <button
          onClick={() => setActiveSection('voice')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeSection === 'voice'
              ? 'bg-[#D4A947] text-[#1F1A13] font-extrabold shadow-sm'
              : 'text-[#837667] hover:text-[#2D251A] hover:bg-[#F3EFE6]'
          }`}
        >
          <MessageSquare size={15} className="text-[#2D251A]" />
          <span>المدرّجات الصوتية الذهبية 🎙️</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Right Sidebar - Column span 4 on large screens, active items tracker and navigation channels */}
        <div className="lg:col-span-4 order-1 lg:order-2 space-y-4">
          
          <div className="bg-[#FFFDF9] border border-[#E9E2D2] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#FAF6EE]">
              <Sparkles size={18} className="text-[#D4A947]" />
              <h2 className="text-sm font-extrabold text-[#2D251A]">مجلس بن عون الأكاديمي</h2>
            </div>
            
            <p className="text-[11px] text-[#837667] leading-relaxed">
              مرحباً بك في ساحة المذاكرة المشتركة. يمكنك التفاعل المباشر وإضافة الأسئلة وحلها مع زملائك ومدرسي المادة بهوية ذهبية دافئة ومميزة تماشي شعارنا بدون تشويش.
            </p>

            {/* Quick stats panel */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-[#FAF6EE] border border-[#E9E2D2]/60 rounded-2xl p-3 text-center">
                <span className="text-xl font-bold text-[#C59C4B] font-mono block">
                  {messages.length}
                </span>
                <span className="text-[10px] text-[#837667] font-semibold mt-0.5 block">إجمالي المشاركات</span>
              </div>
              <div className="bg-[#FAF6EE] border border-[#E9E2D2]/60 rounded-2xl p-3 text-center">
                <span className="text-xl font-bold text-[#C59C4B] font-mono block">
                  {subjects.length}
                </span>
                <span className="text-[10px] text-[#837667] font-semibold mt-0.5 block">قنوات المذاكرة</span>
              </div>
            </div>
          </div>

          {/* Categories Channel List in sidebar container */}
          {activeSection === 'written' && (
            <div className="bg-[#FFFDF9] border border-[#E9E2D2] rounded-3xl p-4 shadow-sm space-y-3">
              <span className="text-xs font-black text-[#837667] block px-1 flex items-center gap-1.5">
                <Folder size={12} className="text-[#C59C4B]" />
                قنوات النقاش والمواد
              </span>
              
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
                <button
                  onClick={() => setSelectedSubjectId('all')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all ${
                    selectedSubjectId === 'all'
                      ? 'bg-gradient-to-r from-[#D4A947]/15 to-[#FAF6EE] text-[#7C5F2B] border-r-4 border-[#D4A947] font-extrabold'
                      : 'text-[#4E4333] hover:bg-[#FAF6EE]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} className="text-[#C59C4B]" />
                    <span>كل الغرف العامة</span>
                  </div>
                  <span className="text-[10px] bg-white border border-[#E9E2D2] text-[#837667] px-2 py-0.5 rounded-full font-mono">
                    {messages.length}
                  </span>
                </button>

                {subjects.map((sub) => {
                  const subCount = messages.filter(m => m.subjectId === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all ${
                        selectedSubjectId === sub.id
                          ? 'bg-gradient-to-r from-[#D4A947]/15 to-[#FAF6EE] text-[#7C5F2B] border-r-4 border-[#D4A947] font-extrabold'
                          : 'text-[#4E4333] hover:bg-[#FAF6EE]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <SubjectIcon type={sub.iconType} size={13} className="!p-1.5" />
                        <span className="truncate max-w-[124px]">{sub.nameAr}</span>
                      </div>
                      <span className="text-[10px] bg-white border border-[#E9E2D2] text-[#837667] px-2 py-0.5 rounded-full font-mono">
                        {subCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Online active notice panel */}
          <div className="bg-gradient-to-br from-[#1F1A13] to-[#2D2319] text-white rounded-3xl p-4 shadow-md text-right relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-[#D4A947]/10 rounded-full blur-xl transform -translate-x-6 -translate-y-6"></div>
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2">
                <Flame size={15} className="text-[#D4A947] animate-pulse" />
                <span className="text-[10px] font-extrabold tracking-wider text-[#D4A947] uppercase">إشراف أكاديمي معتمد</span>
              </div>
              <h3 className="text-xs font-black leading-tight text-[#FAF6EE]">تفاعل مع المدرسين والمشرفين مباشرة</h3>
              <p className="text-[10px] text-gray-300 leading-relaxed font-medium">كل مشاركة يتم الرد عليها بموثوقية، استغل هذا الفضاء الذهبي لطرح استفساراتك الآن.</p>
            </div>
          </div>
        </div>

        {/* Left Primary Content Column - Column span 8 on large screens */}
        <div className="lg:col-span-8 order-2 lg:order-1 space-y-4">
          
          {activeSection === 'written' ? (
            <div className="space-y-4">
              
              {/* Header Profile description */}
              <div className="bg-[#FFFDF9] border border-[#E9E2D2] rounded-3xl p-5 shadow-sm">
                <h1 className="text-lg font-black text-[#2D251A] tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4A947]"></span>
                  <span>مجالس المذاكرة والحلقات المكتوبة</span>
                </h1>
                <p className="text-xs text-[#837667] mt-1.5 font-bold leading-relaxed">
                  تصفح واطرح الاستفسارات للمواد والامتحانات. تم تنقية المظهر بالكامل من اللون الأزرق واستبداله بألوان دافئة مستوحاة من الشعار.
                </p>
              </div>

              {/* Minimal Luxurious Search bar */}
              <div className="relative">
                <span className="absolute inset-y-0 right-4 flex items-center text-[#C59C4B]">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن مواضيع، أسئلة، أو مشاركين في غرف النقاش المكتوبة..."
                  className="w-full text-xs font-bold bg-white border border-[#E9E2D2] rounded-2xl pr-11 pl-4 py-3 outline-none focus:border-[#D4A947] focus:ring-1 focus:ring-[#D4A947] text-[#2D251A] transition-all shadow-sm placeholder-[#A69989]"
                />
              </div>

              {/* Elegant Form Composer with floating gold action button */}
              <form onSubmit={handlePostMessage} className="bg-white p-3.5 rounded-2xl border border-[#E9E2D2] shadow-sm space-y-3">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full border border-[#E9E2D2] bg-[#FAF6EE] flex items-center justify-center font-bold text-xs text-[#C59C4B] shrink-0">
                    {user?.username?.charAt(0) || 'ط'}
                  </div>
                  <textarea
                    rows={2}
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={
                      selectedSubjectId === 'all'
                        ? 'اختر مادة في القائمة الجانبية أو اكتب مشاركة عامة هنا...'
                        : `اكتب سؤالاً أو مشاركة في غرفة ${subjects.find(s => s.id === selectedSubjectId)?.nameAr || ''}...`
                    }
                    className="w-full text-xs bg-[#FAF6EE]/40 border border-[#FAF6EE]-100 rounded-xl px-3 py-2 text-[#2D251A] placeholder-[#837667] outline-none focus:border-[#D4A947] focus:bg-white transition-all resize-none text-right"
                  />
                </div>
                
                <div className="flex items-center justify-between border-t border-[#FAF6EE] pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#837667] font-semibold">
                    <Sparkles size={11} className="text-[#D4A947]" />
                    <span>مشاركتك تنشر في غرفتنا بشكل فوري</span>
                  </div>

                  <button
                    type="submit"
                    disabled={!newMessageText.trim()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                      newMessageText.trim()
                        ? 'bg-[#1F1A13] text-[#D4A947] hover:bg-[#C59C4B] hover:text-[#1F1A13] shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>إرسال</span>
                    <Send size={12} className="transform rotate-180" />
                  </button>
                </div>
              </form>

              {/* Written Feed Grid */}
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                <AnimatePresence mode="popLayout">
                  {filteredMessages.length === 0 ? (
                    <motion.div 
                      key="no-item"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-16 bg-white border border-[#E9E2D2] rounded-3xl text-center text-gray-400"
                    >
                      <AlertCircle className="stroke-[1.3] mb-3 text-[#D4A947]" size={32} />
                      <p className="text-xs font-black text-[#4E4333]">لا توجد نقاشات تفاعلية حالياً</p>
                      <p className="text-[10px] text-[#837667] mt-1 max-w-[280px] mx-auto leading-relaxed">
                        كن الشخص المبادر لتبدأ النقاش وتثبت تواجدك العلمي بصحبة زملائك بالمنصة!
                      </p>
                    </motion.div>
                  ) : (
                    filteredMessages.map((msg, index) => {
                      const currentSubjectObj = subjects.find(s => s.id === msg.subjectId);
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0, transition: { delay: index * 0.04 } }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white border border-[#E9E2D2] p-4 rounded-2xl flex flex-col justify-between space-y-3 transition-all duration-300 hover:border-[#D4A947]/70 hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3 items-center">
                              <div className="relative">
                                <img
                                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.avatarSeed)}&backgroundColor=c9a24a,eedbb2`}
                                  alt={msg.authorName}
                                  className="w-8.5 h-8.5 rounded-full border border-[#D4A947] bg-[#FAF6EE] shadow-sm object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#28A745] border-2 border-white rounded-full"></span>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-extrabold text-[#2D251A]">
                                    {msg.authorName}
                                  </span>
                                  
                                  {msg.authorRole === 'instructor' && (
                                    <span className="text-[8px] bg-[#D4A947]/15 text-[#8C6D23] px-2 py-0.5 rounded font-black border border-[#D4A947]/20 flex items-center gap-0.5">
                                      <Crown size={8} className="text-[#D4A947]" />
                                      هيئة التدريس
                                    </span>
                                  )}
                                  
                                  {msg.authorRole === 'moderator' && (
                                    <span className="text-[8px] bg-[#231C13] text-[#FAF6EE] px-2 py-0.5 rounded font-black">
                                      مشرف المجلس
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-[#837667] block mt-0.5 font-semibold">
                                  {msg.timestamp}
                                </span>
                              </div>
                            </div>

                            <span className="text-[9px] font-black bg-[#FAF6EE] text-[#7C5F2B] border border-[#E9E2D2]/70 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <Folder size={9} className="text-[#C59C4B]" />
                              {currentSubjectObj?.nameAr || 'عامة'}
                            </span>
                          </div>

                          <p className="text-xs text-[#4E4333] leading-relaxed font-bold">
                            {msg.content}
                          </p>

                          <div className="flex items-center justify-end border-t border-[#FAF6EE] pt-2.5">
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => handleToggleLike(msg.id)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer transition-colors text-[10.5px] ${
                                msg.likedByUser
                                  ? 'bg-[#FAF6EE] text-rose-600 border border-rose-100'
                                  : 'text-[#837667] hover:text-rose-500 hover:bg-[#FAF6EE]'
                              }`}
                            >
                              <Heart size={12} className={msg.likedByUser ? 'fill-rose-500 text-rose-500' : ''} />
                              <span className="font-mono font-bold">{msg.likes}</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* Golden wrapped interactive voice channels layout */
            <div className="bg-white border border-[#E9E2D2] rounded-3xl p-4 shadow-sm animate-fade-in space-y-4">
              
              <div className="border-b border-[#FAF6EE] pb-3">
                <span className="text-xs font-black text-[#837667] uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 size={13} className="text-[#D4A947] animate-bounce" />
                  غرف المحادثات والمدرجات الصوتية التفاعلية
                </span>
                <p className="text-[11px] text-[#837667] mt-1 font-semibold leading-relaxed">
                  تواصل عبر المايك مباشرة بصحبة المشرفين. المظهر العام معلب بهوية ذهبية مستوحاة من الشعار بدون اللون الأزرق.
                </p>
              </div>

              <div className="p-1">
                {joinedRoom ? (
                  <VoiceRoom 
                    room={joinedRoom} 
                    isCurrentUserAdmin={user?.email === 'abdulmlikoog@gmail.com'}
                    onExitRoom={() => setJoinedRoom(null)}
                  />
                ) : (
                  <VoiceRoomList 
                    onJoinRoom={setJoinedRoom} 
                    isCurrentUserAdmin={user?.email === 'abdulmlikoog@gmail.com'} 
                  />
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
