import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Menu, 
  Calendar, 
  ChevronLeft, 
  Award, 
  Clock, 
  Check, 
  Trash2, 
  X, 
  MessageSquare, 
  AlertCircle, 
  Search, 
  Play, 
  BookOpen, 
  ClipboardList, 
  Users, 
  Sparkles, 
  MapPin, 
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

// Custom photo mapping for subjects to render a gorgeous luxury educational visual
const subjectImages: Record<string, string> = {
  math: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400",
  physics: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=400",
  chemistry: "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&q=80&w=400",
  english: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400",
  safety: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=400",
  programming: "https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&q=80&w=400",
  algorithms: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=400",
  history: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=400",
  russian: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=400",
  sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=400",
  nanocad: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400",
};

const defaultSubjectImage = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400";

const subjectInstructors: Record<string, string> = {
  math: "م/ بن عون",
  physics: "أ/ عبدالملك",
  chemistry: "د/ خالد منصور",
  english: "أ/ عاصم الشريف",
  safety: "م/ ناصر الجهني",
  programming: "م/ بن عون",
  algorithms: "أ/ عمار العطاس",
  history: "د/ إيغور الكسندر",
  russian: "أ/ يوليا سيرجيفنا",
  sports: "الكابتن/ علي هادي",
  nanocad: "م/ أحمد السالم",
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
      subtitle: "ابدأ رحلتك التعليمية معنا وحقق أهدافك بأسرع وقت وأقل جهد.",
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

  return (
    <div className="space-y-6 w-full max-w-md mx-auto" dir="rtl">
      
      {/* 2026 Premium Header */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100/80">
        <button 
          onClick={() => onNavigateToTab('profile')}
          className="p-2 hover:bg-gray-100 rounded-full text-[#071B3B] transition-colors"
          id="menu-sidebar-btn"
        >
          <Menu size={24} className="stroke-[2]" />
        </button>
        
        <div className="flex items-center justify-center">
          <Logo variant="logo-only" className="h-9 w-auto" />
        </div>
        
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 hover:bg-gray-100 rounded-full text-[#071B3B] transition-colors"
          id="notifications-bell-btn"
        >
          <Bell size={24} className="stroke-[2]" />
          {unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 text-[10px] font-black text-white bg-[#D4A63A] rounded-full flex items-center justify-center shadow border-2 border-white animate-pulse">
              {unreadCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#D4A63A] rounded-full ring-2 ring-white"></span>
          )}
        </button>
      </div>

      {/* Notifications Drawer (Glass UI Overlay) */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-4 top-16 bg-white/95 backdrop-blur-md border border-gray-200 p-4 rounded-2xl shadow-2xl z-50 max-w-md mx-auto space-y-3"
          >
            <div className="flex items-center justify-between border-b pb-2 border-gray-100">
              <h3 className="text-xs font-black text-[#071B3B] flex items-center gap-1.5">
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

            <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
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
                        <span className="text-[9px] font-black text-white bg-[#071B3B] px-1.5 py-0.5 rounded leading-none shrink-0">
                          {noti.senderName}
                        </span>
                        <span className="text-[8px] font-mono text-gray-400 leading-none shrink-0">{noti.createdAt}</span>
                      </div>

                      <p className="text-[11px] font-semibold text-[#12233D] leading-normal mt-1">
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

      {/* Styled Welcome Banner Block */}
      <div className="text-right space-y-1">
        <p className="text-sm font-bold text-[#D4A63A]">مرحباً بك 👋</p>
        <h1 className="text-2xl font-black text-[#071B3B] leading-tight">
          ماذا تريد أن تتعلم اليوم؟
        </h1>
      </div>

      {/* Large Creative Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
          <Search size={20} className="stroke-[2.5] text-[#D4A63A]" />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مواد، محاضرات، اختبارات، ملفات..." 
          className="w-full pl-4 pr-11 py-3.5 bg-white border border-gray-150 rounded-2xl text-xs font-semibold text-[#12233D] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#D4A63A]/50 focus:border-[#D4A63A] shadow-sm transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-[#071B3B]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dynamic Search Results Screen overlay */}
      <AnimatePresence>
        {searchQuery.trim() !== '' && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xl space-y-4 text-right"
          >
            <h3 className="text-xs font-black text-[#071B3B] border-b pb-2 border-gray-100 flex items-center gap-1.5">
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
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-[#F8FAFC] text-right"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#071B3B]/10 flex items-center justify-center text-[#071B3B]">
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
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-[#F8FAFC] text-right"
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

      {/* Deluxe Sliding Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg aspect-[16/10] bg-[#071B3B] group">
        
        {/* Carousel Background Image with custom CSS academic overlays */}
        <div className="absolute inset-0 z-0">
          <img 
            src={bannerSlides[activeSlide].bgImage} 
            alt="Educational Study Banner backdrop" 
            className="w-full h-full object-cover opacity-35 brightness-75 scale-105 group-hover:scale-100 transition-transform duration-700 pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071B3B] via-[#071B3B]/60 to-transparent"></div>
          
          {/* Subtle Warm Amber Spotlight Academic Effect */}
          <div className="absolute top-0 right-1/4 w-40 h-40 bg-[#D4A63A] rounded-full blur-[80px] opacity-25"></div>
        </div>

        {/* Banner Content Container */}
        <div className="absolute inset-0 z-10 p-5 flex flex-col justify-end text-right text-white space-y-2">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4A63A] bg-[#D4A63A]/10 border border-[#D4A63A]/30 px-2 py-0.5 rounded-full inline-block mb-1.5 backdrop-blur-sm">
              {bannerSlides[activeSlide].badge}
            </span>
            <h2 className="text-xl font-black tracking-tight leading-tight md:text-2xl">
              {bannerSlides[activeSlide].title}
            </h2>
            <p className="text-[10px] text-gray-200 mt-1 max-w-[85%] leading-relaxed font-sans font-medium">
              {bannerSlides[activeSlide].subtitle}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (activeSlide === 0) onNavigateToTab('subjects');
                else if (activeSlide === 1) onNavigateToTab('subjects');
                else onNavigateToTab('exams');
              }}
              className="py-2.5 px-5 bg-[#D4A63A] hover:bg-[#D4A63A]/90 text-white font-extrabold rounded-xl text-xs transition-colors shadow-lg shadow-[#D4A63A]/20 cursor-pointer"
            >
              {bannerSlides[activeSlide].actionText}
            </motion.button>

            {/* Slider Indicators dots directly into the slide corner */}
            <div className="flex gap-1.5">
              {bannerSlides.map((_, idx) => (
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
        </div>
      </div>

      {/* 4 Quick Services Cards - (الخدمات السريعة) */}
      <div className="space-y-2">
        <h3 className="text-xs font-black text-[#6B7280] uppercase tracking-wider text-right">الوصول السريع للأدوات</h3>
        <div className="grid grid-cols-2 gap-3" id="quick-services-section">
          
          {/* Card 1: lectures */}
          <motion.div 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigateToTab('subjects')}
            className="p-3.5 bg-white border border-gray-100 rounded-2xl text-right flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer transition-all h-[100px] relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-12 h-12 bg-[#071B3B]/5 rounded-br-3xl transition-transform group-hover:scale-110"></div>
            <div className="p-2 bg-[#071B3B]/5 rounded-xl w-fit text-[#071B3B]">
              <Play size={18} className="fill-current" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-[#071B3B]">المحاضرات</h4>
              <p className="text-[9px] font-bold text-[#D4A63A] mt-0.5">شاهد الآن</p>
            </div>
          </motion.div>

          {/* Card 2: subjects */}
          <motion.div 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigateToTab('subjects')}
            className="p-3.5 bg-white border border-gray-100 rounded-2xl text-right flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer transition-all h-[100px] relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-12 h-12 bg-[#D4A63A]/5 rounded-br-3xl transition-transform group-hover:scale-110"></div>
            <div className="p-2 bg-[#D4A63A]/10 rounded-xl w-fit text-[#D4A63A]">
              <BookOpen size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-[#071B3B]">المواد الدراسية</h4>
              <p className="text-[9px] font-bold text-[#D4A63A] mt-0.5">تصفح المواد</p>
            </div>
          </motion.div>

          {/* Card 3: exams */}
          <motion.div 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigateToTab('exams')}
            className="p-3.5 bg-white border border-gray-100 rounded-2xl text-right flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer transition-all h-[100px] relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-12 h-12 bg-[#071B3B]/5 rounded-br-3xl transition-transform group-hover:scale-110"></div>
            <div className="p-2 bg-[#071B3B]/5 rounded-xl w-fit text-[#071B3B]">
              <ClipboardList size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-[#071B3B]">الاختبارات</h4>
              <p className="text-[9px] font-bold text-[#D4A63A] mt-0.5">اختبر نفسك</p>
            </div>
          </motion.div>

          {/* Card 4: discussions */}
          <motion.div 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigateToTab('discussions')}
            className="p-3.5 bg-white border border-gray-100 rounded-2xl text-right flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer transition-all h-[100px] relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-12 h-12 bg-[#D4A63A]/5 rounded-br-3xl transition-transform group-hover:scale-110"></div>
            <div className="p-2 bg-[#D4A63A]/10 rounded-xl w-fit text-[#D4A63A]">
              <MessageSquare size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-[#071B3B]">المناقشات</h4>
              <p className="text-[9px] font-bold text-[#D4A63A] mt-0.5">شارك وتعلم</p>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Modern Subjects Section: (المواد الحديثة) with horizontal scroll */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#071B3B]">المواد الحديثة</h3>
          <button 
            onClick={() => onNavigateToTab('subjects')}
            className="text-xs font-black text-[#D4A63A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>عرض الكل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Horizontal scroll subjects layout */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth snap-x">
          {subjects.map((sub, index) => {
            // Pick static or mapped subject metadata
            const subImage = subjectImages[sub.id] || defaultSubjectImage;
            const subTeacher = subjectInstructors[sub.id] || "م/ بن عون المتميز";
            const badgeType = index % 3 === 0 ? "جديد" : "مميز";

            return (
              <motion.div
                key={sub.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateToTab('subjects')}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-250 shadow-sm shrink-0 w-[185px] snap-right cursor-pointer flex flex-col group transition-all duration-300"
              >
                {/* Subject Image Wrapper with badges */}
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 shrink-0">
                  <img 
                    src={subImage} 
                    alt={sub.nameAr} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  
                  {/* Badge */}
                  <span className={`absolute top-2.5 right-2.5 text-[8px] font-extrabold px-2 py-0.5 rounded-full text-white ${
                    badgeType === "جديد" ? 'bg-[#D4A63A]' : 'bg-[#071B3B]'
                  }`}>
                    {badgeType}
                  </span>
                </div>

                {/* Subject Info Body */}
                <div className="p-3 text-right flex-1 flex flex-col justify-between space-y-1">
                  <div>
                    <h4 className="font-bold text-[11px] text-[#071B3B] line-clamp-1 group-hover:text-[#D4A63A] transition-colors">
                      {sub.nameAr}
                    </h4>
                    <p className="text-[10px] text-[#6B7280] line-clamp-1 font-medium mt-0.5">
                      {subTeacher}
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-gray-50 flex items-center justify-between text-[9px] text-gray-400">
                    <span className="font-bold text-[#071B3B] bg-gray-50 px-1.5 py-0.5 rounded">
                      {sub.lecturesCount} محاضرات
                    </span>
                    <span className="font-mono text-[9px]">EN: {sub.nameEn}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Schedule: (جدولك القادم) Card */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-[#071B3B] text-right">جدولك القادم</h3>

        <div className="bg-[#071B3B] rounded-3xl p-4 text-white shadow-lg space-y-3 relative overflow-hidden">
          
          {/* Light glowing patterns to represent 2026 aesthetics */}
          <div className="absolute top-0 left-0 w-32 h-full bg-[#D4A63A] opacity-5 rounded-r-3xl transformation scale-110 skew-x-12"></div>
          <div className="absolute -bottom-1/2 -right-1/4 w-32 h-32 bg-[#D4A63A] rounded-full blur-[50px] opacity-15"></div>

          <div className="flex items-center justify-between border-b pb-2.5 border-white/10">
            <div className="flex items-center gap-1.5 text-[#D4A63A] font-bold">
              <Calendar size={14} />
              <span className="text-[10px] tracking-wide font-medium">الأسبوع الحالي</span>
            </div>
            
            <span className="text-[9px] bg-[#D4A63A]/10 border border-[#D4A63A]/30 text-[#D4A63A] px-2 py-0.5 rounded-full font-black">
              أونلاين
            </span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <div>
              <p className="text-[10px] text-gray-300">ماتم جدولته للطلاب:</p>
              <h4 className="font-extrabold text-xs text-white mt-1">الرياضيات المتقدمة والتحليل</h4>
              <p className="text-[9px] text-[#D4A63A] mt-0.5 font-sans">بإشراف: م/ بن عون</p>
            </div>

            <div className="text-left shrink-0 bg-white/5 rounded-2xl p-2.5 border border-white/10 text-center min-w-[70px]">
              <Clock size={14} className="mx-auto text-[#D4A63A] mb-1" />
              <p className="text-[9px] font-black leading-none">04:00 مساءً</p>
              <p className="text-[7px] text-gray-300 font-bold mt-1">اليوم، 9 يونيو</p>
            </div>
          </div>
        </div>
      </div>

      {/* Latest 3 Notifications: (الإشعارات) */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-[#071B3B] text-right">آخر التنبيهات والأخبار</h3>
        
        <div className="space-y-2.5">
          {userNotifications.slice(0, 3).map((noti) => {
            const readStatus = isRead(noti);
            return (
              <div 
                key={noti.id}
                onClick={() => !readStatus && handleMarkAsRead(noti.id)}
                className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-right flex gap-3 items-start hover:shadow transition-all relative overflow-hidden"
              >
                {!readStatus && (
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-[#D4A63A]"></div>
                )}
                
                <div className="p-2 bg-[#D4A63A]/10 text-[#D4A63A] rounded-xl shrink-0 mt-0.5">
                  <Bell size={14} className="stroke-[2.5]" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-[9px] text-gray-400">
                    <span className="font-extrabold text-[#071B3B]">{noti.senderName}</span>
                    <span>{noti.createdAt}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-[#12233D] leading-relaxed mt-1 truncate">
                    {noti.message}
                  </p>
                </div>
              </div>
            );
          })}

          {userNotifications.length === 0 && (
            <div className="text-center py-6 bg-white/50 border border-gray-100 border-dashed rounded-2xl text-[10px] text-gray-400">
              لا توجد تنبيهات عاجلة في صندوقك.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
