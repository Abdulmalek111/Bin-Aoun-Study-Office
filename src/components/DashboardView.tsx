import React, { useState } from 'react';
import { Bell, Menu, Calendar, ChevronLeft, Award, Clock, Check, Trash2, X, MessageSquare, AlertCircle } from 'lucide-react';
import { User, Subject, Exam, Notification } from '../types';
import SubjectIcon from './SubjectIcon';

interface DashboardViewProps {
  user: User;
  subjects: Subject[];
  exams: Exam[];
  onNavigateToTab: (tab: 'home' | 'exams' | 'subjects' | 'profile') => void;
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
  // Find upcoming exam (Math is often the first one)
  const upcomingExam = exams[0] || null;

  const [showNotifications, setShowNotifications] = useState(false);

  // Filter notifications specifically for the logged in user or global "all" list
  const userNotifications = notifications.filter(
    (n) => n.targetEmail.toLowerCase() === user.email.toLowerCase() || n.targetEmail.toLowerCase() === 'all'
  );
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map((n) => {
      if (n.id === id) {
        return { ...n, read: true };
      }
      return n;
    });
    if (onUpdateNotifications) {
      onUpdateNotifications(updated);
    }
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => {
      const targetLower = n.targetEmail.toLowerCase();
      if (targetLower === user.email.toLowerCase() || targetLower === 'all') {
        return { ...n, read: true };
      }
      return n;
    });
    if (onUpdateNotifications) {
      onUpdateNotifications(updated);
    }
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    if (onUpdateNotifications) {
      onUpdateNotifications(updated);
    }
  };


  return (
    <div className="space-y-3">
      {/* Top action header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Bell size={20} className="stroke-[2]" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[9px] font-black text-white bg-red-600 rounded-full flex items-center justify-center px-1 shadow border border-white animate-bounce">
              {unreadCount}
            </span>
          ) : (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-brand-gold rounded-full ring-2 ring-white"></span>
          )}
        </button>
        
        <h1 className="text-lg font-extrabold text-brand-dark tracking-tight">الرئيسية</h1>
        
        <button 
          onClick={() => onNavigateToTab('profile')}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Menu size={20} className="stroke-[2]" />
        </button>
      </div>

      {/* Notifications Drawer Dialog overlay */}
      {showNotifications && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-xl space-y-3 animate-fade-in relative z-50">
          <div className="flex items-center justify-between border-b pb-2 border-gray-200/60 dark:border-slate-800">
            <h3 className="text-xs font-black text-brand-dark dark:text-brand-gold flex items-center gap-1.5">
              <Bell size={13} className="text-brand-gold" />
              <span>إشعارات وتنبيهات المنصة ({userNotifications.length})</span>
            </h3>
            <button 
              onClick={() => setShowNotifications(false)}
              className="p-1 rounded-full hover:bg-gray-250 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 transition"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto no-scrollbar">
            {userNotifications.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-[10px] space-y-1">
                <AlertCircle size={20} className="mx-auto text-gray-300 animate-pulse" />
                <p>صندوق الإشعارات فارغ حالياً.</p>
              </div>
            ) : (
              userNotifications.map((noti) => (
                <div 
                  key={noti.id} 
                  className={`p-3 rounded-xl border transition-all text-right space-y-1.5 relative ${
                    noti.read 
                      ? 'bg-white dark:bg-slate-950 border-gray-105 dark:border-slate-900/50 opacity-85' 
                      : 'bg-brand-gold/5 dark:bg-amber-500/5 border-brand-gold/30 shadow-sm'
                  }`}
                >
                  {/* Unread indicator */}
                  {!noti.read && (
                    <span className="absolute top-3 left-3 w-2.5 h-2.5 bg-brand-gold rounded-full ring-2 ring-white"></span>
                  )}
                  
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[9px] font-black text-white bg-brand-dark dark:bg-slate-800 px-1.5 py-0.5 rounded leading-none shrink-0">
                      {noti.senderName}
                    </span>
                    <span className="text-[8px] font-mono text-gray-400 leading-none shrink-0">{noti.createdAt}</span>
                  </div>

                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 leading-normal">
                    {noti.message}
                  </p>

                  <div className="flex justify-end gap-1.5 pt-1">
                    {!noti.read && (
                      <button
                        onClick={() => handleMarkAsRead(noti.id)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-brand-gold hover:bg-yellow-600 text-white rounded text-[8px] font-bold cursor-pointer transition"
                      >
                        <Check size={8} />
                        <span>تحديد كمقروء</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(noti.id)}
                      className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-400 rounded cursor-pointer transition"
                      title="مسح الإشعار"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {unreadCount > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-200/60 dark:border-slate-800 text-[9px]">
              <span className="text-gray-400 font-bold">لديك {unreadCount} إشعار غير مقروء</span>
              <button
                onClick={handleMarkAllAsRead}
                className="text-brand-gold font-bold hover:underline cursor-pointer"
              >
                ✓ قراءة الكل فوراً
              </button>
            </div>
          )}
        </div>
      )}

      {/* Styled Welcome Back Card like mock screen */}
      <div className="bg-brand-dark rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between">
        {/* Abstract Gold Background wave design */}
        <div className="absolute top-0 left-0 w-32 h-full bg-brand-gold opacity-10 rounded-r-3xl transformation scale-110 skew-x-12"></div>
        <div className="absolute bottom-0 right-0 w-24 h-5 bg-brand-gold opacity-30 transform translate-y-3 skew-y-6"></div>

        <div className="space-y-1 z-10">
          <p className="text-[10px] text-slate-300 font-medium">مرحباً بعودتك</p>
          <h2 className="text-xl font-black text-white">{user.username}</h2>
          <p className="text-[10px] text-brand-gold font-bold bg-brand-blue/60 backdrop-blur-sm px-2 py-0.5 rounded-full inline-block">
            {user.academicYear || 'سنة أولى'} - {user.academicStage || 'بكالوريوس'} {user.academicTrack ? `(${user.academicTrack})` : '(علمي)'}
          </p>
        </div>

        {/* User profile avatar on the left */}
        <div className="relative group shrink-0">
          <div className="absolute -inset-0.5 bg-brand-gold rounded-full blur opacity-40 group-hover:opacity-75 transition duration-1000"></div>
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.username} 
              className="relative w-14 h-14 rounded-full object-cover border-2 border-white shadow"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="relative w-14 h-14 rounded-full bg-brand-gold text-brand-dark flex items-center justify-center font-black text-lg border-2 border-white shadow">
              {user.username.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Featured Promotional Banner - Old Image restored above */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow transition-all group duration-300">
        <img 
          src="https://i.ibb.co/dwr72PGZ/Chat-GPT-Image-May-31-2026-12-50-03-PM.png" 
          alt="بنر منصة بن عون التعليمية" 
          className="w-full h-auto object-cover rounded-2xl block transform group-hover:scale-[1.01] transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Leak Exams Section: تسريبات الاختبارات */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-brand-dark">تسريبات الاختبارات</h3>
          <button 
            onClick={() => onNavigateToTab('exams')}
            className="text-[11px] font-bold text-brand-gold hover:underline flex items-center gap-1"
          >
            <span>مشاهدة الكل</span>
            <ChevronLeft size={12} />
          </button>
        </div>

        {upcomingExam && (
          <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm hover:shadow transition-all space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-brand-blue/10 text-brand-blue rounded-xl">
                  <Calendar size={18} className="text-brand-gold stroke-[2]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-brand-dark">{upcomingExam.title}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">المدة: {upcomingExam.durationMinutes} دقيقة</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                  متاح الآن
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-50 pt-2">
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                <span>{upcomingExam.timeSlot}</span>
              </div>
              <div className="font-semibold text-brand-dark">{upcomingExam.date}</div>
            </div>

            <button 
              onClick={() => onSelectExam(upcomingExam.id)}
              className="w-full py-2 bg-brand-gold hover:bg-yellow-600 text-white rounded-xl text-[11px] font-bold transition-colors shadow-sm cursor-pointer hover:shadow"
            >
              بدء الاختبار التجريبي الآن
            </button>
          </div>
        )}
      </div>

      {/* Study Subjects Grid Section: المواد الدراسية */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-brand-dark">المواد الدراسية</h3>
          <button 
            onClick={() => onNavigateToTab('subjects')}
            className="text-[11px] font-bold text-brand-gold hover:underline flex items-center gap-1"
          >
            <span>إحصائيات التقدم</span>
            <ChevronLeft size={12} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3">
          {subjects.map((sub) => (
            <div 
              key={sub.id}
              onClick={() => onNavigateToTab('subjects')}
              className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center space-y-1.5 group"
            >
              <SubjectIcon 
                type={sub.iconType} 
                className="transform group-hover:scale-110 transition-transform duration-300" 
                size={20}
              />
              <div>
                <h4 className="font-bold text-[11px] text-brand-dark group-hover:text-brand-gold transition-colors">{sub.nameAr}</h4>
                <p className="text-[9px] text-gray-400 font-mono tracking-wide uppercase mt-0.5">{sub.nameEn}</p>
              </div>
              <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-brand-gold h-full rounded-full" 
                  style={{ width: `${(sub.completedLectures / sub.lecturesCount) * 100}%` }}
                ></div>
              </div>
              <p className="text-[9px] font-bold text-gray-500">
                {sub.completedLectures} / {sub.lecturesCount} محاضرات
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* New Banner Image displayed purely by its dimensions */}
      <div className="w-full overflow-hidden rounded-2xl">
        <img 
          src="https://i.ibb.co/svv8zBDH/image.png" 
          alt="تطبيق بن عون" 
          className="w-full h-auto block"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Quick Achievement Panel footer */}
      <div className="achievement-card border rounded-2xl p-3 flex gap-2.5 items-center mb-1 transition-all duration-300">
        <div className="achievement-icon-wrapper p-2 rounded-xl shrink-0 flex items-center justify-center">
          <Award size={18} className="stroke-[2.2] text-brand-gold" />
        </div>
        <div className="flex-1">
          <h4 className="achievement-title font-bold text-[11px]">تقدم ملحوظ هذا الأسبوع!</h4>
          <p className="achievement-desc text-[10px] mt-0.5 leading-relaxed">لقد أنجزت 75% من المحاضرات المقررة، استمر في هذا الأداء الرائع.</p>
        </div>
      </div>
    </div>
  );
}
