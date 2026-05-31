import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Heart, User, Search, MessageCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { Subject } from '../types';
import SubjectIcon from './SubjectIcon';
import { db } from '../firebase';
import { collection, getDocs, doc, query, orderBy, limit, setDoc, updateDoc } from 'firebase/firestore';

interface DiscussionsViewProps {
  subjects: Subject[];
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

export default function DiscussionsView({ subjects }: DiscussionsViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch discussions on mount, seed with default messages if empty, fallback to local storage
  useEffect(() => {
    const fetchDiscussions = async () => {
      setIsDbLoading(true);
      try {
        const discussionsCol = collection(db, 'discussions');
        const q = query(discussionsCol, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          // Empty DB in Firestore, let's seed it so it's instantly active for testing
          const promises = initialForumMessages.map(async (msg, index) => {
            const docRef = doc(discussionsCol, msg.id);
            await setDoc(docRef, {
              ...msg,
              createdAt: new Date(Date.now() - index * 60000)
            });
          });
          await Promise.all(promises);
          
          // Re-fetch now that we seeded
          const newSnapshot = await getDocs(q);
          const seededData = newSnapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              subjectId: d.subjectId,
              authorName: d.authorName,
              authorRole: d.authorRole || 'student',
              avatarSeed: d.avatarSeed,
              content: d.content,
              timestamp: d.timestamp || 'منذ فترة',
              likes: d.likes || 0,
              likedByUser: localStorage.getItem(`liked_${doc.id}`) === 'true'
            } as ForumMessage;
          });
          setMessages(seededData);
          localStorage.setItem('bin_aoun_discussions', JSON.stringify(seededData));
        } else {
          const fetchedData = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              subjectId: d.subjectId,
              authorName: d.authorName,
              authorRole: d.authorRole || 'student',
              avatarSeed: d.avatarSeed,
              content: d.content,
              timestamp: d.timestamp || 'منذ فترة',
              likes: d.likes || 0,
              likedByUser: localStorage.getItem(`liked_${doc.id}`) === 'true'
            } as ForumMessage;
          });
          setMessages(fetchedData);
          localStorage.setItem('bin_aoun_discussions', JSON.stringify(fetchedData));
        }
      } catch (err) {
        console.warn("Firestore access error, falling back to local storage:", err);
        const saved = localStorage.getItem('bin_aoun_discussions');
        if (saved) {
          try {
            setMessages(JSON.parse(saved));
          } catch (e) {
            setMessages(initialForumMessages);
          }
        } else {
          setMessages(initialForumMessages);
        }
      } finally {
        setIsDbLoading(false);
      }
    };

    fetchDiscussions();
  }, []);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    // Fetch user details
    const savedUserStr = localStorage.getItem('school_user');
    let author = 'طالب مناقش';
    let avatarSeedValue = 'BinAoun';
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        author = u.username || 'طالب مناقش';
        avatarSeedValue = u.username || 'BinAoun';
      } catch (err) {}
    }

    const postId = `m_${Date.now()}`;
    const newMsg: ForumMessage = {
      id: postId,
      subjectId: selectedSubjectId === 'all' ? (subjects[0]?.id || 'math') : selectedSubjectId,
      authorName: author,
      authorRole: 'student',
      avatarSeed: avatarSeedValue,
      content: newMessageText.trim(),
      timestamp: 'الآن',
      likes: 0,
      likedByUser: false,
    };

    // Optimistically update UI
    const updatedMessages = [newMsg, ...messages];
    setMessages(updatedMessages);
    localStorage.setItem('bin_aoun_discussions', JSON.stringify(updatedMessages));
    setNewMessageText('');

    // Persist to Cloud Firestore
    try {
      const discussionsCol = collection(db, 'discussions');
      await setDoc(doc(discussionsCol, postId), {
        ...newMsg,
        createdAt: new Date()
      });
    } catch (err) {
      console.warn("Could not save to Firestore, locally updated:", err);
    }
  };

  const handleToggleLike = async (msgId: string) => {
    let targetLikes = 0;
    let currentlyLiked = false;

    const updated = messages.map(m => {
      if (m.id === msgId) {
        currentlyLiked = !m.likedByUser;
        targetLikes = currentlyLiked ? m.likes + 1 : m.likes - 1;
        
        if (currentlyLiked) {
          localStorage.setItem(`liked_${msgId}`, 'true');
        } else {
          localStorage.removeItem(`liked_${msgId}`);
        }
        
        return {
          ...m,
          likedByUser: currentlyLiked,
          likes: targetLikes
        };
      }
      return m;
    });

    setMessages(updated);
    localStorage.setItem('bin_aoun_discussions', JSON.stringify(updated));

    // Persist Like count update to Cloud Firestore
    try {
      const docRef = doc(db, 'discussions', msgId);
      await updateDoc(docRef, {
        likes: targetLikes
      });
    } catch (err) {
      console.warn("Could not sync like to Firestore:", err);
    }
  };

  // Filter messages based on Subject tab and Search text query
  const filteredMessages = messages.filter(item => {
    const matchesSubject = selectedSubjectId === 'all' || item.subjectId === selectedSubjectId;
    const matchesQuery = searchQuery.trim() === '' || 
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesQuery;
  });

  return (
    <div className="space-y-4 animate-fade-in flex flex-col h-full">
      {/* Header containing premium logo style */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-brand-dark tracking-tight">غرف النقاش</h1>
          <p className="text-xs text-gray-500 mt-1">تفاعل، ناقش المسائل، وتبادل الحلول فورياً مع زملائك ومدرسيك</p>
        </div>
        <div className="bg-brand-gold/10 p-2 rounded-xl text-brand-gold">
          <MessageSquare size={22} className="stroke-[2.2]" />
        </div>
      </div>

      {/* Modern Search bar to filter discussions */}
      <div className="relative">
        <span className="absolute inset-y-0 right-3 flex items-center pr-1 text-gray-400 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مواضيع، أسئلة، أو مشاركين..."
          className="w-full text-xs font-bold bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-brand-gold/50 focus:ring-2 focus:ring-brand-gold/10 transition-all text-brand-dark text-right"
        />
      </div>

      {/* Horizontal Scrollable Categories/Subjects Selection */}
      <div className="space-y-1.5 shrink-0 select-none">
        <label className="text-[11px] font-bold text-gray-400">اختر الغرفة التعليمية:</label>
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-5 px-5 scroll-smooth">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedSubjectId === 'all'
                ? 'bg-brand-dark text-white dark:bg-brand-gold dark:text-brand-dark shadow-sm scale-105'
                : 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850'
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
                  ? 'bg-brand-dark text-white dark:bg-brand-gold dark:text-brand-dark shadow-sm scale-105'
                  : 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850'
              }`}
            >
              <SubjectIcon type={sub.iconType} size={14} />
              <span>{sub.nameAr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* New comment input area */}
      <form onSubmit={handlePostMessage} className="bg-brand-gray/50 dark:bg-slate-900/60 p-3 rounded-2xl border border-gray-100/80 dark:border-slate-850 flex gap-2 items-center shrink-0 shadow-sm">
        <input
          type="text"
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          placeholder={
            selectedSubjectId === 'all'
              ? 'اختر مادة في الأعلى أو اكتب مشاركة عامة هنا...'
              : `اكتب سؤالاً أو توضيحاً في غرفة ${subjects.find(s => s.id === selectedSubjectId)?.nameAr || ''}...`
          }
          className="flex-grow text-xs bg-white dark:bg-slate-800 border-none outline-none px-4 py-2.5 rounded-xl text-brand-dark shadow-inner text-right"
        />
        <button
          type="submit"
          disabled={!newMessageText.trim()}
          className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center ${
            newMessageText.trim()
              ? 'bg-brand-gold text-brand-dark scale-105 hover:bg-brand-gold/90 shadow-md'
              : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          <Send size={15} className="transform rotate-180" />
        </button>
      </form>

      {/* Dynamic Discussions Feed with Beautiful Bubbles */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 no-scrollbar pb-6">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <AlertCircle className="stroke-[1.5] mb-2 text-brand-gold" size={32} />
            <p className="text-xs font-bold">لا يوجد مناقشات حالية في هذه الغرفة</p>
            <p className="text-[11px] text-gray-500 mt-1">كن أول من يطرح سؤالاً تعليمياً أو يكتب فكرة للزملاء!</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const currentSub = subjects.find(s => s.id === msg.subjectId);
            
            return (
              <div
                key={msg.id}
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 p-4 rounded-3xl hover:shadow-md transition-all duration-300 text-right flex flex-col justify-between space-y-3 relative group"
              >
                {/* Upper row: Author Info */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-2.5 items-center">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.avatarSeed)}&backgroundColor=1b365d,c9a24a`}
                      alt={msg.authorName}
                      className="w-8 h-8 rounded-full border border-gray-100 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-brand-dark dark:text-white leading-tight">
                          {msg.authorName}
                        </span>
                        {msg.authorRole === 'instructor' && (
                          <span className="text-[9px] bg-brand-gold/15 text-brand-gold px-1.5 py-0.5 rounded font-extrabold shadow-sm border border-brand-gold/10">
                            مدرس المادة
                          </span>
                        )}
                        {msg.authorRole === 'moderator' && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-300 px-1.5 py-0.5 rounded font-extrabold">
                            مشرف غرف
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-0.5 font-medium">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Subject badge indicating which subject chamber */}
                  <span className="text-[9px] font-bold bg-brand-gray/60 dark:bg-slate-800 text-brand-dark/80 dark:text-gray-300 px-2 py-1 rounded-lg flex items-center gap-1">
                    <SubjectIcon type={currentSub?.iconType || 'math'} size={11} />
                    {currentSub?.nameAr || 'عامة'}
                  </span>
                </div>

                {/* Content body paragraph of discussion comment */}
                <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-medium">
                  {msg.content}
                </p>

                {/* Lower interaction line: Like counters */}
                <div className="flex items-center justify-end border-t border-gray-50 dark:border-slate-850/50 pt-2.5 mt-1">
                  <button
                    onClick={() => handleToggleLike(msg.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer text-[11px] font-bold transition-all ${
                      msg.likedByUser
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                        : 'text-gray-400 hover:text-rose-500'
                    }`}
                  >
                    <Heart size={14} className={msg.likedByUser ? 'fill-rose-600' : ''} />
                    <span>{msg.likes}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
