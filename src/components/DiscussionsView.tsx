import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Heart, Search, MessageCircle, AlertCircle
} from 'lucide-react';
import { Subject, User as LoggedUser } from '../types';
import SubjectIcon from './SubjectIcon';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, onSnapshot, doc, setDoc, updateDoc
} from 'firebase/firestore';

// Discord Quality Voice Chat additions
import VoiceRoomList from './voice/VoiceRoomList';
import VoiceRoom from './voice/VoiceRoom';
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

// Pre-seeded authentic discussion posts in Arabic based on subjects to make the environment instantly alive
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

  // Synchronise with Firestore 'discussions' collection in Real-time
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
    <div className="space-y-5 animate-fade-in flex flex-col h-full text-right" dir="rtl">
      
      {/* 🌟 Tab Selector switcher for Written Forums vs Discord Voice Rooms */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl shrink-0 select-none">
        <button
          onClick={() => {
            setActiveSection('written');
            setJoinedRoom(null); // safely leave/disconnect if any
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSection === 'written'
              ? 'bg-brand-dark text-white font-extrabold shadow-md'
              : 'text-gray-500 hover:text-brand-dark hover:bg-gray-200/50'
          }`}
        >
          <MessageCircle size={14} />
          <span>حلقة النقاش المكتوبة 💬</span>
        </button>

        <button
          onClick={() => setActiveSection('voice')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSection === 'voice'
              ? 'bg-brand-dark text-white font-extrabold shadow-md'
              : 'text-gray-500 hover:text-brand-dark hover:bg-gray-200/50'
          }`}
        >
          <MessageSquare size={14} />
          <span>المدرّجات الصوتية المباشرة (Discord) 🎙️</span>
        </button>
      </div>

      {activeSection === 'written' ? (
        <div className="space-y-4 flex flex-col h-full">
          {/* Header Profile Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800 gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-brand-dark dark:text-white tracking-tight flex items-center gap-2">
                <span>مجالس النقاش المكتوبة المعتمدة</span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">نظم وقت مذكرتك وتفاعل مباشرة مع الطلاب والمشرفين في غرف النقاش المكتوبة</p>
            </div>
          </div>

          {/* Search bar to filter discussions */}
          <div className="relative">
            <span className="absolute inset-y-0 right-3 flex items-center pr-1 text-gray-450 pointer-events-none">
              <Search size={15} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مواضيع، أسئلة، أو مشاركين في غرف النقاش المكتوبة..."
              className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-brand-dark dark:text-white"
            />
          </div>

          {/* Horizontal Scrollable Categories/Subjects Selection */}
          <div className="space-y-1 select-none">
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-5 px-5 scroll-smooth">
              <button
                onClick={() => setSelectedSubjectId('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedSubjectId === 'all'
                    ? 'bg-brand-dark text-white dark:bg-brand-gold dark:text-brand-dark shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-gray-150/40 dark:border-slate-800 text-gray-600 dark:text-gray-350 hover:bg-gray-50 dark:hover:bg-slate-850'
                }`}
              >
                <MessageCircle size={13} />
                <span>عرض الكل</span>
              </button>
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedSubjectId === sub.id
                    ? 'bg-brand-dark text-white dark:bg-brand-gold dark:text-brand-dark shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-gray-150/40 dark:border-slate-800 text-gray-600 dark:text-gray-350 hover:bg-gray-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <SubjectIcon type={sub.iconType} size={13} />
                  <span>{sub.nameAr}</span>
                </button>
              ))}
            </div>
          </div>

          {/* New comment input area */}
          <form onSubmit={handlePostMessage} className="bg-gray-55/65 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-gray-100/80 dark:border-slate-800 flex gap-2 items-center shrink-0">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder={
                selectedSubjectId === 'all'
                  ? 'اختر مادة في الأعلى أو اكتب مشاركة عامة للكل...'
                  : `اكتب سؤالاً أو استفساراً في غرفة ${subjects.find(s => s.id === selectedSubjectId)?.nameAr || ''}...`
              }
              className="flex-grow text-xs bg-white dark:bg-slate-800 border-none outline-none px-4 py-2 rounded-xl text-brand-dark dark:text-white shadow-inner text-right"
            />
            <button
              type="submit"
              disabled={!newMessageText.trim()}
              className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center ${
                newMessageText.trim()
                  ? 'bg-brand-gold text-brand-dark hover:bg-yellow-600 shadow-md'
                  : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-650 cursor-not-allowed'
              }`}
            >
              <Send size={14} className="transform rotate-180" />
            </button>
          </form>

          {/* Written posts Feed List */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <AlertCircle className="stroke-[1.5] mb-2 text-brand-gold" size={26} />
                <p className="text-xs font-bold">لا يوجد نقاشات مكتوبة لمطابقتك حالياً</p>
                <p className="text-[11px] text-gray-500 mt-1">كن مبادراً واكتب أول مشاركة تفاعلية مع باقي زملائك بالكلية!</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const currentSubjectObj = subjects.find(s => s.id === msg.subjectId);
                return (
                  <div
                    key={msg.id}
                    className="bg-white dark:bg-slate-900 border border-gray-100/90 dark:border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between space-y-2.5 transition-all hover:bg-gray-55/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2.5 items-center">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.avatarSeed)}&backgroundColor=1b365d,c9a24a`}
                          alt={msg.authorName}
                          className="w-7.5 h-7.5 rounded-full border border-gray-100 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-brand-dark dark:text-white">
                              {msg.authorName}
                            </span>
                            {msg.authorRole === 'instructor' && (
                              <span className="text-[8px] bg-brand-gold/15 text-brand-gold px-1.5 py-0.2 rounded font-extrabold border border-brand-gold/10">
                                هيئة التدريس
                              </span>
                            )}
                            {msg.authorRole === 'moderator' && (
                              <span className="text-[8px] bg-sky-500/10 text-sky-600 px-1.5 py-0.2 rounded font-extrabold">
                                مشرف
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-gray-400 block mt-0.5 font-sans font-bold">
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>

                      <span className="text-[8.5px] font-extrabold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <SubjectIcon type={currentSubjectObj?.iconType || 'math'} size={10} />
                        {currentSubjectObj?.nameAr || 'عامة'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-semibold">
                      {msg.content}
                    </p>

                    <div className="flex items-center justify-end border-t border-gray-50 dark:border-slate-800/40 pt-2 text-[10.5px]">
                      <button
                        onClick={() => handleToggleLike(msg.id)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full cursor-pointer transition-colors ${
                          msg.likedByUser
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'text-gray-400 hover:text-rose-500'
                        }`}
                      >
                        <Heart size={12} className={msg.likedByUser ? 'fill-rose-600' : ''} />
                        <span className="font-sans font-bold">{msg.likes}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl animate-fade-in p-1">
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
      )}

    </div>
  );
}
