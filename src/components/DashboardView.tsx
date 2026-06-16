import React, { useState, useMemo } from 'react';
import { User, Subject, Exam, Notification } from '../types';
import { ChevronLeft, ChevronRight, Star, Clock, Users, BookOpen, AlertCircle } from 'lucide-react';

interface DashboardViewProps {
  user: User;
  subjects: Subject[];
  exams: Exam[];
  onNavigateToTab: (tab: string) => void;
  onSelectExam: (examId: string) => void;
  notifications: Notification[];
  onUpdateNotifications: (notifications: Notification[]) => void;
}

export default function DashboardView({
  user,
  subjects,
  exams,
  onNavigateToTab,
  onSelectExam,
  notifications,
  onUpdateNotifications
}: DashboardViewProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Calculate progress
  const totalLectures = subjects.reduce((sum, s) => sum + s.lecturesCount, 0);
  const completedLectures = subjects.reduce((sum, s) => sum + s.completedLectures, 0);
  const progressPercentage = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;

  const recentNotifications = notifications.slice(0, 3);

  const upcomingExams = useMemo(() => {
    return exams.filter(exam => {
      const examDate = new Date(exam.date.replace(/\//g, '-'));
      return examDate >= new Date();
    }).slice(0, 3);
  }, [exams]);

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % subjects.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + subjects.length) % subjects.length);
  };

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar flex flex-col space-y-5 px-0 md:px-4 py-0 md:py-4" style={{ direction: 'rtl' }}>
      {/* Header Welcome Section */}
      <div className="bg-gradient-to-b from-brand-dark to-brand-blue rounded-2xl md:rounded-3xl p-6 md:p-8 text-white space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-black mb-1">مرحباً بك 👋</h1>
            <p className="text-sm md:text-base text-white/80 font-medium">ماذا تريد أن تعلم اليوم؟</p>
          </div>
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-brand-gold overflow-hidden flex-shrink-0">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`}
              alt={user.username}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2.5 md:py-3">
          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ابحث عن مواد، محاضرات، أو مواضيع..."
            className="bg-transparent flex-1 text-white placeholder-white/60 focus:outline-none text-sm md:text-base"
          />
        </div>
      </div>

      {/* Progress Overview Card */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-black text-brand-dark">طريقك نحو التفوق</h2>
          <span className="text-xs md:text-sm font-bold text-brand-gold bg-brand-gold/10 px-3 py-1.5 rounded-full">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full h-3 md:h-3.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-gold to-brand-blue transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs md:text-sm text-gray-600 mt-3 font-medium">إبدأ رحلتك التعليمية معنا وحقق أهدافك</p>
      </div>

      {/* Featured Subjects Carousel */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-black text-brand-dark">المواد الحديثة</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrevSlide}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-brand-dark"
            >
              <ChevronRight size={18} className="stroke-[2]" />
            </button>
            <button
              onClick={handleNextSlide}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-brand-dark"
            >
              <ChevronLeft size={18} className="stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Carousel Items */}
        <div className="relative overflow-hidden">
          <div className="flex gap-3 md:gap-4 transition-transform duration-300">
            {subjects.slice(currentSlideIndex, currentSlideIndex + 3).map((subject, idx) => {
              const actualIdx = (currentSlideIndex + idx) % subjects.length;
              const subject_ = subjects[actualIdx];
              const bgColors = ['bg-blue-500', 'bg-orange-500', 'bg-purple-500'];
              return (
                <div
                  key={subject_.id}
                  className="flex-1 min-w-[140px] md:min-w-[160px] bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition cursor-pointer group"
                  onClick={() => onNavigateToTab('subjects')}
                >
                  <div className={`${bgColors[idx]} h-24 md:h-28 flex items-center justify-center text-white/30 text-4xl md:text-5xl`}>
                    <BookOpen size={40} className="opacity-20" />
                  </div>
                  <div className="p-3 md:p-4 space-y-2">
                    <h3 className="font-black text-xs md:text-sm text-brand-dark truncate">{subject_.nameAr}</h3>
                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-gray-600">
                      <Star size={12} className="text-brand-gold fill-brand-gold" />
                      <span>{subject_.completedLectures}/{subject_.lecturesCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-1.5">
          {subjects.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`w-2 h-2 rounded-full transition ${
                idx === currentSlideIndex ? 'bg-brand-gold w-6' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Upcoming Exams */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 space-y-3 md:space-y-4">
        <h2 className="text-base md:text-lg font-black text-brand-dark flex items-center gap-2">
          <Clock size={18} className="text-brand-gold" />
          جدولك القادم
        </h2>
        <div className="space-y-2 md:space-y-3">
          {upcomingExams.length > 0 ? (
            upcomingExams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => onSelectExam(exam.id)}
                className="w-full flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-brand-dark/5 to-brand-blue/5 border border-brand-gold/20 rounded-xl hover:shadow-md transition group"
              >
                <div className="text-right flex-1">
                  <h3 className="font-black text-xs md:text-sm text-brand-dark">{exam.title}</h3>
                  <p className="text-[10px] md:text-xs text-gray-600 mt-1">{exam.date} الساعة {exam.timeSlot}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] md:text-xs font-bold bg-brand-gold/20 text-brand-gold px-2 md:px-3 py-1 rounded-lg">
                    {exam.durationMinutes} دقيقة
                  </span>
                  <ChevronLeft size={16} className="text-brand-gold opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-xs md:text-sm">لا توجد اختبارات قادمة قريباً</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      {recentNotifications.length > 0 && (
        <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 space-y-3 md:space-y-4">
          <h2 className="text-base md:text-lg font-black text-brand-dark flex items-center gap-2">
            <AlertCircle size={18} className="text-brand-gold" />
            آخر الإشعارات
          </h2>
          <div className="space-y-2 md:space-y-3">
            {recentNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 md:p-4 rounded-xl border ${
                  notif.read
                    ? 'bg-gray-50 border-gray-100'
                    : 'bg-brand-gold/5 border-brand-gold/30'
                }`}
              >
                <div className="flex items-start gap-2 md:gap-3">
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 mt-1 ${
                    notif.read ? 'bg-gray-300' : 'bg-brand-gold'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs md:text-sm text-brand-dark">{notif.senderName}</p>
                    <p className="text-[10px] md:text-xs text-gray-600 line-clamp-2 mt-1">{notif.message}</p>
                    <p className="text-[9px] md:text-[10px] text-gray-400 mt-2">{notif.createdAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
