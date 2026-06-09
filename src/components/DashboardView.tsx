import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Menu, 
  Calendar, 
  ChevronLeft, 
  Clock, 
  Trash2, 
  X, 
  MessageSquare, 
  AlertCircle, 
  Search, 
  Play, 
  BookOpen, 
  ClipboardList, 
  Sparkles,
  ChevronRight,
  BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Subject, Exam, Notification } from '../types';
import Logo from './Logo';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface DashboardViewProps {
  user: User;
  subjects: Subject[];
  exams: Exam[];
  onNavigateToTab: (tab: 'home' | 'exams' | 'subjects' | 'profile' | 'discussions' | 'students') => void;
  onSelectExam: (examId: string) => void;
  notifications: Notification[];
  onUpdateNotifications: (updated: Notification[]) => void;
}

// Interactive metadata to match premium design styles
const subjectImages: Record<string, string> = {
  chemistry: "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&q=80&w=400",
  physics: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=400",
  math: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400",
  english: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400",
};

const defaultSubjectImage = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400";

const subjectInstructors: Record<string, string> = {
  math: "أ. محمد خالد",
  physics: "أ. سارة علي",
  chemistry: "د. أحمد محمد",
  english: "أ. عاصم الشريف",
};

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
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-play for the Hero Banner carousels
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Filter notifications specifically for the logged in user or global broadcast list
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

  // Searching logic
  const filteredSubjects = searchQuery.trim() === '' 
    ? [] 
    : subjects.filter(s => 
        s.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const filteredExams = searchQuery.trim() === '' 
    ? [] 
    : exams.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const bannerSlides = [
    {
      title: "طريقك نحو التفوق",
      subtitle: "ابدأ رحلتك التعليمية معنا وحقق أهدافك",
      badge: "دبلوم وبكالوريوس 2026",
      actionText: "ابدأ الآن",
      bgImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200",
    },
    {
      title: "مستندات معتمدة ومحدثة",
      subtitle: "احصل على جميع الملخصات والأعمال المطلوبة РГР لجميع مواد الهندسة.",
      badge: "أحدث المناهج",
      actionText: "تصفح المذكرات",
      bgImage: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200",
    },
    {
      title: "اختبارات محاكاة تفاعلية",
      subtitle: "تدرّب على أسئلة الامتحانات المحلولة واختبر سرعة إجابتك فوراً.",
      badge: "تقييم فوري للدرجات",
      actionText: "اختبر نفسك",
      bgImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200",
    }
  ];

  // Map subjects for high fidelity matching with reference image
  // 1. الرياضيات المتقدمة / 2. الفيزياء العامة / 3. الكيمياء العضوية
  const visualSubjects = [
    {
      id: "math_advanced",
      nameAr: "الرياضيات المتقدمة",
      nameEn: "Advanced Math",
      instructor: "أ. محمد خالد",
      lecturesCount: 10,
      badge: "جديد",
      badgeColor: "bg-[#0077FF]", // beautiful high contrast blue
      img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400"
    },
    {
      id: "physics_general",
      nameAr: "الفيزياء العامة",
      nameEn: "General Physics",
      instructor: "أ. سارة علي",
      lecturesCount: 8,
      badge: "مميز",
      badgeColor: "bg-[#D4A63A]", // Gold Theme
      img: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=400"
    },
    {
      id: "chemistry_organic",
      nameAr: "الكيمياء العضوية",
      nameEn: "Organic Chemistry",
      instructor: "د. أحمد محمد",
      lecturesCount: 12,
      badge: "جديد",
      badgeColor: "bg-[#10B981]", // Modern green
      img: "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&q=80&w=400"
    }
  ];

  return (
    <div className="w-full max-w-md mx-auto bg-[#F8FAFC] min-h-screen pb-20" dir="rtl">
      
      {/* Dynamic Header Block with Deep Navy Curved Background */}
      <div className="bg-[#031737] px-4 pt-6 pb-9 rounded-b-[42px] transition-all relative overflow-hidden shadow-xl shadow-[#031737]/15">
        
        {/* Subtle decorative vector mesh style */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A63A]/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-8 left-16 w-24 h-24 bg-[#0D2A57] rounded-full blur-xl"></div>

        {/* Header Navigation Actions row */}
        <div className="flex items-center justify-between gap-4 relative z-10 mb-6">
          
          {/* Side menu trigger ☰ with gorgeous bordered transparent card */}
          <button 
            onClick={() => onNavigateToTab('profile')}
            className="w-11 h-11 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95"
            id="sidebar-trigger-btn"
          >
            <Menu size={22} className="stroke-[2.5]" />
          </button>
          
          {/* Centered Logo block */}
          <div className="flex-1 flex justify-center">
            <Logo variant="logo-only" className="h-10 w-auto transform hover:scale-102 transition-transform duration-300" />
          </div>
          
          {/* Notifications bell icon with absolute badge */}
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-11 h-11 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl flex items-center justify-center text-white relative transition-all active:scale-95"
            id="bell-trigger-btn"
          >
            <Bell size={21} className="stroke-[2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-[9px] font-black text-white bg-[#D4A63A] rounded-full flex items-center justify-center shadow-lg border border-white animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

        </div>

        {/* Greeting message - aligned to the right screen edge */}
        <div className="text-right text-white space-y-1 relative z-10 mb-6 px-1">
          <div className="flex items-center justify-start gap-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">مرحباً بك، {user.fullName || user.username || 'يا طالب'} 👋</h2>
          </div>
          <p className="text-[10.5px] font-medium text-gray-300/90">
            طالب بقسم {user.department || 'الهندسة'} • {user.academicYear || 'سنة أولى'} • {user.academicStage || 'بكالوريوس'}
          </p>
        </div>

        {/* Premium White Search Bar with Search Icon on the right side */}
        <div className="relative z-10 px-0.5">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مواد، محاضرات، أو مواضيع..." 
            className="w-full text-[11px] font-extrabold text-[#12233D] placeholder-gray-400 pr-11 pl-11 py-3.5 bg-white border border-transparent rounded-[20px] focus:outline-none focus:ring-2 focus:ring-[#D4A63A] shadow-lg hover:shadow-xl transition-all text-right"
          />
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
            <Search size={17} className="stroke-[2.7]" />
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 left-4 flex items-center text-gray-400 hover:text-[#031737]"
            >
              <X size={16} />
            </button>
          )}
        </div>

      </div>

      {/* Notifications Drawer (Glass UI Overlay) */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-4 top-24 bg-white/95 backdrop-blur-md border border-gray-200 p-4 rounded-2xl shadow-2xl z-50 max-w-sm mx-auto space-y-3 font-sans"
          >
            <div className="flex items-center justify-between border-b pb-2 border-gray-100">
              <h3 className="text-xs font-black text-[#031737] flex items-center gap-1.5">
                <Bell size={14} className="text-[#D4A63A]" />
                <span>إشعارات المنصة ({userNotifications.length})</span>
              </h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto no-scrollbar">
              {userNotifications.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-[10px] space-y-1">
                  <AlertCircle size={20} className="mx-auto text-gray-300" />
                  <p>لا توجد إشعارات حالياً.</p>
                </div>
              ) : (
                userNotifications.map((noti) => {
                  const readStatus = isRead(noti);
                  return (
                    <div 
                      key={noti.id} 
                      onClick={() => !readStatus && handleMarkAsRead(noti.id)}
                      className={`p-3 rounded-xl border transition-all text-right space-y-1 relative ${
                        readStatus 
                          ? 'bg-[#F8FAFC] border-gray-100 opacity-80' 
                          : 'bg-[#D4A63A]/5 border-[#D4A63A]/30 shadow-sm cursor-pointer'
                      }`}
                    >
                      {!readStatus && (
                        <span className="absolute top-3 left-3 w-2 h-2 bg-[#D4A63A] rounded-full animate-pulse"></span>
                      )}
                      
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-black text-white bg-[#031737] px-1.5 py-0.5 rounded leading-none shrink-0 border border-white/5">
                          {noti.senderName}
                        </span>
                        <span className="text-[8px] font-mono text-gray-400 leading-none shrink-0">{noti.createdAt}</span>
                      </div>

                      <p className="text-[11px] font-semibold text-[#12233D] leading-normal mt-1 text-right">
                        {noti.message}
                      </p>

                      <div className="flex justify-end gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        {!readStatus && (
                          <button
                            onClick={() => handleMarkAsRead(noti.id)}
                            className="px-2 py-0.5 bg-[#D4A63A] text-white rounded text-[8px] font-bold cursor-pointer transition"
                          >
                            تحديد كمقروء
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(noti.id)}
                          className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded cursor-pointer transition"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {unreadCount > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-[10px]">
                <span className="text-[#6B7280] font-bold">لديك {unreadCount} إشعار غير مقروء</span>
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[#D4A63A] font-black hover:underline cursor-pointer"
                >
                  تحديد الكل كمقروء ✓
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Search Results Screen overlay */}
      <AnimatePresence>
        {searchQuery.trim() !== '' && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="mx-4 mt-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-xl space-y-4 text-right relative z-20"
          >
            <h3 className="text-xs font-black text-[#031737] border-b pb-2 border-gray-100 flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#D4A63A]" />
              <span>نتائج البحث عن ({searchQuery})</span>
            </h3>

            {/* Subjects results */}
            {filteredSubjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[#6B7280]">المواد الدراسية المطابقة:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {filteredSubjects.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSearchQuery('');
                        onNavigateToTab('subjects');
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-[#F8FAFC] text-right w-full"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#031737]/5 flex items-center justify-center text-[#031737]">
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#12233D]">{sub.nameAr}</p>
                          <p className="text-[9px] text-[#6B7280] uppercase tracking-wide font-mono">{sub.nameEn}</p>
                        </div>
                      </div>
                      <ChevronLeft size={14} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Exams matches */}
            {filteredExams.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[#6B7280]">الاختبارات المطابقة:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {filteredExams.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setSearchQuery('');
                        onSelectExam(ex.id);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-[#F8FAFC] text-right w-full"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#D4A63A]/10 flex items-center justify-center text-[#D4A63A]">
                          <ClipboardList size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#12233D]">{ex.title}</p>
                          <p className="text-[9px] text-[#6B7280]">{ex.date} | {ex.timeSlot}</p>
                        </div>
                      </div>
                      <ChevronLeft size={14} className="text-[#D4A63A]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredSubjects.length === 0 && filteredExams.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4 font-bold">
                عذراً، لم نجد أي تطابق لطلبك. حاول كتابة كلمة أخرى.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 mt-6 space-y-6">

        {/* Deluxe Sliding Hero Banner matches 100% layout in mockup */}
        <div className="relative rounded-[2.2rem] overflow-hidden shadow-lg aspect-[16/9.2] bg-[#031737] group border border-white/5">
          
          {/* Carousel Background with dynamic academic study backdrops */}
          <div className="absolute inset-0 z-0">
            <motion.img 
              key={activeSlide}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 0.65 }}
              transition={{ duration: 0.4 }}
              src={bannerSlides[activeSlide].bgImage} 
              alt={bannerSlides[activeSlide].title} 
              className="w-full h-full object-cover brightness-[0.7] transform group-hover:scale-102 transition-transform duration-[6s] pointer-events-none"
              referrerPolicy="no-referrer"
            />
            {/* Ambient vignette */}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#031737]/40 to-[#031737]/95"></div>
            
            {/* The beautiful academic amber study glow matching mock image exactly */}
            <div className="absolute top-1/2 -translate-y-1/2 left-2 w-32 h-32 rounded-full bg-[#D4A63A] opacity-25 blur-2xl"></div>
          </div>

          {/* Banner Content (Text left, aligned nicely in RTL) */}
          <div className="absolute inset-0 z-10 p-5 flex flex-col justify-center items-start text-right text-white space-y-2">
            
            <motion.span 
              key={`badge-${activeSlide}`}
              initial={{ x: 15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-[9px] font-black uppercase text-[#D4A63A] tracking-wider bg-[#D4A63A]/10 border border-[#D4A63A]/20 px-2.5 py-0.5 rounded-full inline-block"
            >
              {bannerSlides[activeSlide].badge}
            </motion.span>
            
            <motion.h2 
              key={`title-${activeSlide}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="text-sm sm:text-base font-extrabold tracking-tight leading-snug w-full text-white text-right"
            >
              {bannerSlides[activeSlide].title}
            </motion.h2>

            <motion.p 
              key={`subtitle-${activeSlide}`}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-[10px] text-gray-300 w-full text-right leading-tight max-w-[240px] truncate"
            >
              {bannerSlides[activeSlide].subtitle}
            </motion.p>

            <div className="pt-1.5 font-black">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (activeSlide === 0) onNavigateToTab('subjects');
                  else if (activeSlide === 1) onNavigateToTab('subjects');
                  else if (activeSlide === 2) onNavigateToTab('exams');
                }}
                className="py-1.5 px-5 bg-[#D4A63A] hover:bg-[#D4A63A]/90 text-[#031737] font-black rounded-full text-[10px] transition-all hover:shadow-lg shadow-[#D4A63A]/20 cursor-pointer"
              >
                {bannerSlides[activeSlide].actionText}
              </motion.button>
            </div>
          </div>

          {/* Slider Indicators centered matching mockup */}
          <div className="absolute bottom-3 right-1/2 translate-x-1/2 z-10 flex gap-1.5 bg-black/10 px-2 py-1 rounded-full backdrop-blur-xs">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-5 bg-[#D4A63A]' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

        </div>

        {/* Academic Student Quick Achievements and Wallet Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          {/* Active Registered Subjects */}
          <div className="bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm flex flex-col justify-center items-center">
            <span className="text-[14px] font-black text-[#031737]">{subjects.length}</span>
            <span className="text-[8.5px] font-bold text-[#6B7280] mt-0.5">مواد مفعّلة</span>
          </div>

          {/* Wallet Balance (RUB currency matching platform standard) */}
          <div className="bg-white border border-gray-150 rounded-2xl p-2.5 text-center shadow-sm flex flex-col justify-center items-center">
            <span className="text-[13px] font-black text-[#D4A63A]">{user.balance !== undefined ? `${user.balance}` : "0"} <span className="text-[8.5px] font-extrabold text-[#031737]">RUB</span></span>
            <span className="text-[8.5px] font-bold text-[#6B7280] mt-0.5">رصيد المحفظة</span>
          </div>

          {/* My Academic Student ID file number */}
          <div className="bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm flex flex-col justify-center items-center">
            <span className="text-[11px] font-mono font-black text-[#031737] truncate w-full" dir="ltr">
              {user.studentId ? user.studentId : "تحت الإجراء"}
            </span>
            <span className="text-[8.5px] font-bold text-[#6B7280] mt-0.5">الملف الأكاديمي</span>
          </div>
        </div>

        {/* 4 Quick Services Grid Cards (الخدمات السريعة - 4 Columns) matches reference picture */}
        <div className="space-y-2.5 pt-0.5">
          <div className="grid grid-cols-4 gap-2.5" id="quick-grid-dashboard">
            
            {/* 1. Discussions / المناقشات (RTL Far-Right) */}
            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateToTab('discussions')}
              className="py-3 px-1 bg-white border border-gray-100 hover:border-gray-200 rounded-3xl text-center flex flex-col items-center justify-center shadow-xs hover:shadow-sm cursor-pointer transition-all aspect-[4/5] shrink-0 space-y-2"
            >
              <div className="w-10 h-10 bg-[#D4A63A]/10 rounded-full flex items-center justify-center text-[#D4A63A]">
                <MessageSquare size={18} className="stroke-[2.2]" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-[10px] text-[#031737] leading-none">المناقشات</h4>
                <p className="text-[7.5px] font-bold text-[#6B7280] leading-none mt-1">شارك وتعلم</p>
              </div>
            </motion.div>

            {/* 2. Exams / الاختبارات */}
            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateToTab('exams')}
              className="py-3 px-1 bg-white border border-gray-100 hover:border-gray-200 rounded-3xl text-center flex flex-col items-center justify-center shadow-xs hover:shadow-sm cursor-pointer transition-all aspect-[4/5] shrink-0 space-y-2"
            >
              <div className="w-10 h-10 bg-[#D4A63A]/10 rounded-full flex items-center justify-center text-[#D4A63A]">
                <ClipboardList size={18} className="stroke-[2.2]" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-[10px] text-[#031737] leading-none">الاختبارات</h4>
                <p className="text-[7.5px] font-bold text-[#6B7280] leading-none mt-1">اختبر نفسك</p>
              </div>
            </motion.div>

            {/* 3. Subjects / المواد الدراسية */}
            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateToTab('subjects')}
              className="py-3 px-1 bg-white border border-gray-100 hover:border-gray-200 rounded-3xl text-center flex flex-col items-center justify-center shadow-xs hover:shadow-sm cursor-pointer transition-all aspect-[4/5] shrink-0 space-y-2"
            >
              <div className="w-10 h-10 bg-[#D4A63A]/10 rounded-full flex items-center justify-center text-[#D4A63A]">
                <BookOpen size={18} className="stroke-[2.2]" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-[10px] text-[#031737] leading-none">المواد</h4>
                <p className="text-[7.5px] font-bold text-[#6B7280] leading-none mt-1">تصفح المواد</p>
              </div>
            </motion.div>

            {/* 4. Lectures / المحاضرات (RTL Far-Left) */}
            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateToTab('subjects')}
              className="py-3 px-1 bg-white border border-gray-100 hover:border-gray-200 rounded-3xl text-center flex flex-col items-center justify-center shadow-xs hover:shadow-sm cursor-pointer transition-all aspect-[4/5] shrink-0 space-y-2"
            >
              <div className="w-10 h-10 bg-[#D4A63A]/10 rounded-full flex items-center justify-center text-[#D4A63A]">
                <Play size={18} className="stroke-[2.2] fill-[#D4A63A]" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-[10px] text-[#031737] leading-none">المحاضرات</h4>
                <p className="text-[7.5px] font-bold text-[#6B7280] leading-none mt-1">شاهد الآن</p>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Modern Subjects Section (المواد الحديثة) with horizontal scroll exactly like the reference */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#031737]">المواد الحديثة</h3>
            <button 
              onClick={() => onNavigateToTab('subjects')}
              className="text-[10px] sm:text-xs font-black text-[#D4A63A] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>عرض الكل</span>
              <ChevronLeft size={14} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Horizontal scroll subjects layout matching style, card sizes, and colors of mockup */}
          <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 no-scrollbar scroll-smooth snap-x">
            {visualSubjects.map((vis) => {
              // Ensure real subjects can be selected or routed flawlessly
              const matchingSubject = subjects.find(s => s.nameAr.includes(vis.nameAr.slice(0, 5))) || subjects[0];
              
              return (
                <motion.div
                  key={vis.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (matchingSubject) {
                      onNavigateToTab('subjects');
                    }
                  }}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-xs shrink-0 w-[145px] snap-right cursor-pointer flex flex-col group transition-all duration-300"
                >
                  {/* Image Wrapper with badge overlay */}
                  <div className="relative aspect-[16/11] overflow-hidden bg-gray-50 shrink-0">
                    <img 
                      src={vis.img} 
                      alt={vis.nameAr} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    
                    {/* Style-match badge ("جديد" or "مميز") */}
                    <span className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-md text-white ${vis.badgeColor} shadow-md`}>
                      {vis.badge}
                    </span>
                  </div>

                  {/* Info Body */}
                  <div className="p-2.5 text-right flex-1 flex flex-col justify-between space-y-1">
                    <div>
                      <h4 className="font-extrabold text-[10px] text-[#031737] line-clamp-1 group-hover:text-[#D4A63A] transition-colors leading-tight">
                        {vis.nameAr}
                      </h4>
                      <p className="text-[8px] text-[#6B7280] font-sans font-bold leading-normal mt-0.5">
                        {vis.instructor}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-start text-[8px] text-gray-500 gap-1.5 mt-1.5">
                      <Calendar size={10} className="text-[#D4A63A]" />
                      <span className="font-black text-[8px] text-[#031737]">
                        {vis.lecturesCount} محاضرات
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Schedule: (جدولك القادم) Card matching the reference exactly */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#031737]">جدولك القادم</h3>
            <button 
              onClick={() => onNavigateToTab('subjects')}
              className="text-[10px] sm:text-xs font-black text-[#D4A63A] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>عرض الكل</span>
              <ChevronLeft size={14} className="stroke-[2.5]" />
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2.2rem] p-3.5 shadow-md flex justify-between items-center gap-3 relative overflow-hidden select-none hover:shadow-lg transition-all duration-300">
            
            {/* Rightmost: Beautiful deep blue container containing a gold/yellow calendar checkbox icon */}
            <div className="w-11 h-11 bg-[#031737] rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md">
              <Calendar size={18} className="text-[#D4A63A] stroke-[2.3]" />
            </div>

            {/* Middle portion details: aligned to the right side next to the icon */}
            <div className="flex-1 text-right space-y-0.5 min-w-0 pr-1">
              <h4 className="font-extrabold text-xs text-[#031737] leading-snug truncate">محاضرة الرياضيات المتقدمة</h4>
              <p className="text-[9px] text-[#6B7280] font-bold leading-none">أ. محمد خالد</p>
              
              <div className="flex items-center justify-start gap-1 text-[8.5px] text-gray-400 font-extrabold pt-1">
                <Calendar size={10} className="text-[#D4A63A] shrink-0" />
                <span className="truncate">الأحد 25 مايو 2024</span>
              </div>
            </div>

            {/* Leftmost: Beautiful solid dark blue badge displaying 'Time Slot' exactly as the mockup */}
            <div className="bg-[#031737] text-white py-2.5 px-3 rounded-2xl min-w-[70px] text-center shadow-md shrink-0 flex flex-col justify-center items-center">
              <span className="text-[13px] font-black tracking-tight leading-none">10:00</span>
              <span className="text-[8.5px] font-extrabold tracking-wider mt-1 text-[#D4A63A]">صباحاً</span>
            </div>

          </div>
        </div>

        {/* Latest Announcements Header */}
        {userNotifications.length > 0 && (
          <div className="space-y-3 pt-1 pb-4">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#031737] text-right">صندوق التنبيهات</h3>
            <div className="space-y-2.5">
              {userNotifications.slice(0, 2).map((noti) => {
                const readStatus = isRead(noti);
                return (
                  <div 
                    key={noti.id}
                    onClick={() => !readStatus && handleMarkAsRead(noti.id)}
                    className="p-3 bg-white border border-gray-100 rounded-2xl shadow-xs text-right flex gap-3 items-start hover:shadow transition-all relative overflow-hidden"
                  >
                    {!readStatus && (
                      <div className="absolute top-0 right-0 w-1.5 h-full bg-[#D4A63A]"></div>
                    )}
                    
                    <div className="p-2 bg-[#D4A63A]/10 text-[#D4A63A] rounded-xl shrink-0 mt-0.5">
                      <Bell size={13} className="stroke-[2.5]" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-[8px] text-gray-400">
                        <span className="font-extrabold text-[#031737]">{noti.senderName}</span>
                        <span>{noti.createdAt}</span>
                      </div>
                      <p className="text-[9px] font-bold text-[#12233D] leading-relaxed mt-1 truncate">
                        {noti.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
