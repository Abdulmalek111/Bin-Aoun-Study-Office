import React, { useState, useEffect } from "react";
import {
  Bell,
  Menu,
  Search,
  MonitorPlay,
  BookOpen,
  ClipboardCheck,
  MessagesSquare,
  User as UserIcon,
  MessageCircle,
  Grid2X2,
  Home,
  CalendarDays,
  X,
  AlertCircle,
  Trash2
} from "lucide-react";
import { User, Subject, Exam, Notification } from "../types";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";

interface DashboardViewProps {
  user: User;
  subjects: Subject[];
  exams: Exam[];
  onNavigateToTab: (tab: 'home' | 'exams' | 'subjects' | 'profile' | 'discussions' | 'students') => void;
  onSelectExam: (examId: string) => void;
  notifications: Notification[];
  onUpdateNotifications: (updated: Notification[]) => void;
}

export default function DashboardView({
  user,
  subjects,
  exams,
  onNavigateToTab,
  onSelectExam,
  notifications = [],
  onUpdateNotifications,
}: DashboardViewProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discussionsCount, setDiscussionsCount] = useState(2);
  const [firebaseSubjects, setFirebaseSubjects] = useState<any[]>([]);

  // 1. Filter notifications dynamically for current user
  const userNotifications = notifications.filter((n) => {
    if (n.type === 'broadcast' && n.targetRole === 'students') {
      return true;
    }
    if (n.type === 'private' && n.targetUserId === user.uid) {
      return true;
    }
    if (!n.type) {
      return n.targetEmail?.toLowerCase() === user.email?.toLowerCase() || n.targetEmail?.toLowerCase() === 'all';
    }
    return false;
  });

  const isRead = (noti: Notification) => {
    if (Array.isArray(noti.readBy)) {
      return noti.readBy.includes(user.uid || '');
    }
    return !!noti.read;
  };

  const unreadCount = userNotifications.filter((n) => !isRead(n)).length;

  const handleMarkAsRead = async (id: string) => {
    const updated = notifications.map((n) => {
      if (n.id === id) {
        const readByArray = Array.isArray(n.readBy) ? [...n.readBy] : [];
        if (!readByArray.includes(user.uid || '')) {
          readByArray.push(user.uid || '');
        }
        return { ...n, readBy: readByArray, read: true };
      }
      return n;
    });
    if (onUpdateNotifications) {
      onUpdateNotifications(updated);
    }
    try {
      const notiRef = doc(db, 'notifications', id);
      const notiObj = notifications.find(n => n.id === id);
      if (notiObj) {
        const readByArray = Array.isArray(notiObj.readBy) ? [...notiObj.readBy] : [];
        if (!readByArray.includes(user.uid || '')) {
          readByArray.push(user.uid || '');
        }
        await updateDoc(notiRef, {
          readBy: readByArray,
          read: true
        });
      }
    } catch (e) {
      console.error("Failed to mark as read in Firestore:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    const updated = notifications.map((n) => {
      const isMine = (n.type === 'broadcast' && n.targetRole === 'students') ||
                     (n.type === 'private' && n.targetUserId === user.uid) ||
                     (!n.type && (n.targetEmail?.toLowerCase() === user.email?.toLowerCase() || n.targetEmail?.toLowerCase() === 'all'));
      if (isMine) {
        const readByArray = Array.isArray(n.readBy) ? [...n.readBy] : [];
        if (!readByArray.includes(user.uid || '')) {
          readByArray.push(user.uid || '');
        }
        return { ...n, readBy: readByArray, read: true };
      }
      return n;
    });
    if (onUpdateNotifications) {
      onUpdateNotifications(updated);
    }
    for (const n of userNotifications) {
      const readByArray = Array.isArray(n.readBy) ? [...n.readBy] : [];
      if (!readByArray.includes(user.uid || '')) {
        readByArray.push(user.uid || '');
        try {
          await updateDoc(doc(db, 'notifications', n.id), {
            readBy: readByArray,
            read: true
          });
        } catch (e) {
          console.error("Failed to mark all as read in Firestore:", e);
        }
      }
    }
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    if (onUpdateNotifications) {
      onUpdateNotifications(updated);
    }
  };

  // 2. Fetch active discussions / forum post count from collection group in Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'discussions'), (snapshot) => {
      setDiscussionsCount(snapshot.size || 2);
    }, (error) => {
      console.error("Error listening to discussions count:", error);
    });
    return () => unsubscribe();
  }, []);

  // 3. Keep real-time monitor on 'subjects' collection to fulfill "اربط المواد الحديثة من Firebase إذا كانت موجودة"
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.nameAr || data.title || 'مادة دراسية كبرى',
          teacher: data.teacher || data.instructor || 'أستاذ المادة',
          image: data.image || data.img || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800',
          count: data.count || (data.lecturesCount ? `${data.lecturesCount} محاضرة` : '10 محاضرات'),
          badge: data.badge || 'جديد'
        });
      });
      setFirebaseSubjects(list);
    }, (error) => {
      // Quiet warning, fallback to default mock subjects is handled below
    });
    return () => unsubscribe();
  }, []);

  // Searching logic
  const filteredSubjects = searchQuery.trim() === '' 
    ? [] 
    : subjects.filter(s => 
        (s.nameAr && s.nameAr.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (s.nameEn && s.nameEn.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const filteredExams = searchQuery.trim() === '' 
    ? [] 
    : exams.filter(e => 
        e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const defaultMockSubjects = [
    {
      id: "chemistry",
      badge: "جديد",
      image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop",
      title: "الكيمياء العضوية",
      teacher: "أ. أحمد محمد",
      count: "12 محاضرة"
    },
    {
      id: "physics",
      badge: "مميز",
      image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop",
      title: "الفيزياء العامة",
      teacher: "أ. سارة علي",
      count: "8 محاضرات"
    },
    {
      id: "math",
      badge: "جديد",
      image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=800&auto=format&fit=crop",
      title: "الرياضيات المتقدمة",
      teacher: "أ. محمد خالد",
      count: "10 محاضرات"
    }
  ];

  const subjectsToRender = firebaseSubjects.length > 0 ? firebaseSubjects : defaultMockSubjects;

  return (
    <main dir="rtl" className="w-full min-h-screen bg-white text-[#071B3A] pb-32 relative select-none">
      
      {/* 1. Dark Header curved banner from mockup pattern */}
      <section className="relative rounded-b-[36px] bg-[#071B3A] px-5 pt-7 pb-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          
          {/* Interactive bell trigger tied to unread count in Firebase (Now on the right) */}
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 active:scale-95 transition-transform"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#C9A24A] text-[8px] font-bold text-white shadow-md">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Centered Brand Shara/Logo */}
          <div className="text-center">
            <img
              src="https://i.ibb.co/ycNWS8MS/Chat-GPT-Image-May-30-2026-10-21-40-PM-removebg-preview.png"
              alt="BIN AOUN"
              className="mx-auto h-22 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Menu button toggles profile side tab (Now on the left) */}
          <button 
            onClick={() => onNavigateToTab('profile')} 
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 active:scale-95 transition-transform"
          >
            <Menu size={17} />
          </button>
        </div>

        {/* Customized Dynamic Greetings and Welcomes */}
        <div className="mt-3 text-right">
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            مرحباً بك، {user.fullName || user.username || 'يا طالب'} 👋
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-white/70">
            ماذا تريد أن تتعلم اليوم؟
          </p>
        </div>

        {/* Input Search trigger */}
        <div className="mt-5 flex h-13 items-center rounded-[20px] bg-white px-4 text-[#071B3A] shadow-md">
          <Search className="ml-2 text-gray-400" size={20} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-gray-400 text-right font-bold"
            placeholder="ابحث عن مواد، محاضرات، أو مواضيع..."
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="mr-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </section>

      {/* Real-time Notifications Popup Overlay panel */}
      {showNotifications && (
        <div className="absolute top-28 left-4 right-4 bg-white border border-gray-150 p-5 rounded-[28px] shadow-2xl z-50 max-w-md mx-auto space-y-4 text-right animate-fade-in">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <h3 className="text-sm font-black text-[#071B3A] flex items-center gap-1.5">
              <Bell size={18} className="text-[#C9A24A]" />
              <span>الإشعارات والرسائل التنظيمية ({userNotifications.length})</span>
            </h3>
            <button 
              onClick={() => setShowNotifications(false)}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto no-scrollbar">
            {userNotifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs space-y-1">
                <AlertCircle size={24} className="mx-auto text-gray-300" />
                <p className="font-bold">لا توجد أي إشعارات جديدة حالياً.</p>
              </div>
            ) : (
              userNotifications.map((noti) => {
                const readStatus = isRead(noti);
                return (
                  <div 
                    key={noti.id} 
                    onClick={() => !readStatus && handleMarkAsRead(noti.id)}
                    className={`p-3 rounded-2xl border transition-all text-right space-y-1 relative ${
                      readStatus 
                        ? 'bg-[#F8FAFC] border-gray-100 opacity-70' 
                        : 'bg-[#C9A24A]/5 border-[#C9A24A]/25 shadow-xs cursor-pointer'
                    }`}
                  >
                    {!readStatus && (
                      <span className="absolute top-3.5 left-3 w-2 h-2 bg-[#C9A24A] rounded-full animate-pulse"></span>
                    )}
                    
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-black text-white bg-[#071B3A] px-2 py-0.5 rounded-lg leading-none shrink-0">
                        {noti.senderName}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono leading-none shrink-0">{noti.createdAt}</span>
                    </div>

                    <p className="text-xs font-bold text-[#071B3A] leading-relaxed mt-1">
                      {noti.message}
                    </p>

                    <div className="flex justify-end gap-1.5 pt-1.5 border-t border-gray-100/50 mt-2" onClick={(e) => e.stopPropagation()}>
                      {!readStatus && (
                        <button
                          onClick={() => handleMarkAsRead(noti.id)}
                          className="px-2.5 py-1 bg-[#C9A24A] text-white rounded-lg text-[9px] font-black cursor-pointer transition"
                        >
                          تحديد كمقروء ✓
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(noti.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg cursor-pointer transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {unreadCount > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
              <span className="text-[#6B7280] font-black">عدد غير المقروء: {unreadCount}</span>
              <button
                onClick={handleMarkAllAsRead}
                className="text-[#C9A24A] font-black hover:underline cursor-pointer text-xs"
              >
                تحديد الكل كمقروء
              </button>
            </div>
          )}
        </div>
      )}

      {/* Real query results popover screen if search text exists */}
      {searchQuery.trim() !== '' && (
        <div className="absolute top-56 left-4 right-4 bg-white border border-gray-150 p-5 rounded-[28px] shadow-2xl z-40 max-w-md mx-auto space-y-4 text-right animate-fade-in">
          <div className="flex items-center justify-between border-b pb-2 border-gray-100">
            <h3 className="text-sm font-black text-[#071B3A] flex items-center gap-1.5">
              <span>نتائج المطابقة للبحث:</span>
            </h3>
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar">
            {filteredSubjects.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-gray-400">المواد المطابقة:</h4>
                <div className="flex flex-col gap-1.5">
                  {filteredSubjects.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSearchQuery('');
                        onNavigateToTab('subjects');
                      }}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 text-right w-full text-xs font-black text-[#071B3A]"
                    >
                      <span>{sub.nameAr}</span>
                      <BookOpen size={15} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredExams.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-gray-400">الاختبارات والتسريبات:</h4>
                <div className="flex flex-col gap-1.5">
                  {filteredExams.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setSearchQuery('');
                        onSelectExam(ex.id);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-amber-50/20 hover:bg-amber-50/50 text-right w-full text-xs font-black text-[#071B3A]"
                    >
                      <span>{ex.title}</span>
                      <ClipboardCheck size={15} className="text-[#C9A24A]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredSubjects.length === 0 && filteredExams.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4 font-bold">
                عذراً، لم نجد أي مادة أو تسريب يطابق كلمات البحث.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Page content section wrapper */}
      <section className="px-5 pt-6 pb-28">
        
        {/* Dynamic sliding / static premium Hero Banner */}
        <div className="relative overflow-hidden rounded-[28px] bg-[#071B3A] shadow-xl">
          <img
            src="https://images.unsplash.com/photo-1519682337058-a94d519337bc?q=80&w=1200&auto=format&fit=crop"
            className="h-48 w-full object-cover opacity-55 pointer-events-none"
            alt="study"
            referrerPolicy="no-referrer"
          />

          <div className="absolute inset-0 flex flex-col justify-center px-7 text-white text-right">
            <h2 className="text-2xl font-extrabold text-[#E2B94B]">
              طريقك نحو التفوق
            </h2>
            <p className="mt-2 max-w-[220px] text-base leading-7 text-white">
              ابدأ رحلتك التعليمية معنا وحقق أهدافك الأكاديمية
            </p>
            <button 
              onClick={() => onNavigateToTab('subjects')} 
              className="mt-5 w-fit rounded-full bg-[#C9A24A] px-7 py-2.5 text-sm font-bold text-white shadow-md active:scale-95 transition-transform cursor-pointer"
            >
              ابدأ الآن
            </button>
          </div>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            <span className="h-2 w-7 rounded-full bg-[#C9A24A]" />
            <span className="h-2 w-2 rounded-full bg-white/60" />
            <span className="h-2 w-2 rounded-full bg-white/60" />
          </div>
        </div>

        {/* Quick features card block (الخدمات السريعة) */}
        <div className="mt-7 grid grid-cols-4 gap-3">
          <QuickCard 
            icon={<MonitorPlay />} 
            title="المحاضرات" 
            sub="شاهد الآن" 
            onClick={() => onNavigateToTab('subjects')} 
          />
          <QuickCard 
            icon={<BookOpen />} 
            title="المواد الدراسية" 
            sub="تصفح المواد" 
            onClick={() => onNavigateToTab('subjects')} 
          />
          <QuickCard 
            icon={<ClipboardCheck />} 
            title="الاختبارات" 
            sub="اختبر نفسك" 
            onClick={() => onNavigateToTab('exams')} 
          />
          <QuickCard 
            icon={<MessagesSquare />} 
            title="المناقشات" 
            sub="شارك وتعلم" 
            onClick={() => onNavigateToTab('discussions')} 
          />
        </div>

        {/* Materials list header */}
        <SectionTitle title="المواد الحديثة" onSeeAll={() => onNavigateToTab('subjects')} />

        {/* Materials cards matching layout */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {subjectsToRender.slice(0, 3).map((item, index) => (
            <MaterialCard
              key={item.id || index}
              badge={item.badge}
              image={item.image}
              title={item.title}
              teacher={item.teacher}
              count={item.count}
              onClick={() => onNavigateToTab('subjects')}
            />
          ))}
        </div>

        {/* Schedule layout header */}
        <SectionTitle title="جدولك القادم" onSeeAll={() => onNavigateToTab('subjects')} />

        {/* Schedule box matching layout exactly */}
        <div className="mt-4 flex items-center gap-4 rounded-[24px] bg-white p-4 shadow-[0_8px_30px_rgba(7,27,58,0.12)]">
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#071B3A] text-white">
            <span className="text-xl font-extrabold">10:00</span>
            <span className="text-xs text-[#C9A24A] font-bold">صباحاً</span>
          </div>

          <div className="flex-1 text-right min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-[#071B3A] truncate leading-tight">
              محاضرة الرياضيات المتقدمة
            </h3>
            <p className="mt-1 text-xs text-gray-500 font-bold">أ. محمد خالد</p>
            <p className="mt-2 text-xs text-gray-400 font-medium">
              الأحد 25 مايو 2024
            </p>
          </div>

          <button 
            onClick={() => onNavigateToTab('subjects')}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#071B3A] text-white shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <CalendarDays size={24} className="text-[#C9A24A]" />
          </button>
        </div>
      </section>

      {/* Floating Bottom Navigation dock */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-full bg-white/95 backdrop-blur-md px-5 py-3 shadow-[0_12px_36px_rgba(7,27,58,0.20)]">
        <div className="flex items-end justify-between text-gray-500">
          
          <NavItem 
            icon={<UserIcon />} 
            label="الملف الشخصي" 
            onClick={() => onNavigateToTab('profile')} 
          />
          
          <NavItem 
            icon={<MessageCircle />} 
            label="المحادثات" 
            badge={discussionsCount > 0 ? discussionsCount.toString() : undefined} 
            onClick={() => onNavigateToTab('discussions')} 
          />

          <div className="-mt-9 flex flex-col items-center">
            <div 
              onClick={() => onNavigateToTab('home')}
              className="flex h-13 w-13 items-center justify-center rounded-full bg-[#071B3A] text-[#C9A24A] shadow-xl active:scale-95 transition-transform cursor-pointer"
            >
              <Home size={22} />
            </div>
            <span className="mt-1 text-[10px] font-extrabold text-[#071B3A]">
              الرئيسية
            </span>
          </div>

          <NavItem 
            icon={<BookOpen />} 
            label="المواد" 
            onClick={() => onNavigateToTab('subjects')} 
          />
          
          <NavItem 
            icon={<Grid2X2 />} 
            label="المزيد" 
            onClick={() => onNavigateToTab('students')} 
          />
        </div>
      </nav>
    </main>
  );
}

function QuickCard({ icon, title, sub, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex min-h-[88px] flex-col items-center justify-center rounded-2xl bg-white p-2 text-center shadow-[0_8px_24px_rgba(7,27,58,0.08)] active:scale-95 hover:scale-102 transition-transform cursor-pointer w-full select-none"
    >
      <div className="text-[#C9A24A]">{React.cloneElement(icon, { size: 22 })}</div>
      <div className="mt-2 text-[10px] sm:text-[11px] font-extrabold text-[#071B3A]">{title}</div>
      <div className="mt-0.5 text-[9px] text-gray-400 font-bold">{sub}</div>
    </button>
  );
}

function SectionTitle({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <h2 className="text-sm sm:text-base font-extrabold text-[#071B3A]">{title}</h2>
      <button 
        onClick={onSeeAll}
        className="text-[11px] font-bold text-gray-400 hover:text-[#C9A24A] hover:underline cursor-pointer"
      >
        عرض الكل ‹
      </button>
    </div>
  );
}

function MaterialCard({ image, badge, title, teacher, count, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(7,27,58,0.08)] hover:scale-102 active:scale-98 transition-transform cursor-pointer flex flex-col justify-between"
    >
      <div className="relative">
        <img 
          src={image} 
          className="h-20 w-full object-cover pointer-events-none" 
          alt={title} 
          referrerPolicy="no-referrer"
        />
        {badge && (
          <span className="absolute right-1.5 top-1.5 rounded bg-green-500 px-1.5 py-0.5 text-[8px] font-bold text-white shrink-0 shadow-sm leading-none">
            {badge}
          </span>
        )}
      </div>
      <div className="p-2 text-right flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-[10px] sm:text-[11px] font-extrabold text-[#071B3A] line-clamp-1 leading-tight">{title}</h3>
          <p className="mt-0.5 text-[8px] sm:text-[9px] text-gray-400 font-bold">{teacher}</p>
        </div>
        <p className="mt-2 text-[8px] sm:text-[9px] text-gray-500 font-bold pt-1 mt-auto shrink-0">{count}</p>
      </div>
    </div>
  );
}

function NavItem({ icon, label, badge, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="relative flex flex-col items-center gap-1.5 text-[9px] text-gray-500 hover:text-[#071B3A] active:scale-95 transition-transform cursor-pointer font-extrabold shrink-0 min-w-[48px]"
    >
      <div className="relative">
        {React.cloneElement(icon, { size: 20 })}
        {badge && (
          <span className="absolute -right-2 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#C9A24A] text-[8px] font-bold text-white shadow-md leading-none">
            {badge}
          </span>
        )}
      </div>
      <span className="truncate max-w-[62px]">{label}</span>
    </button>
  );
}
