import React from 'react';
import { Bell, Menu, Calendar, ChevronLeft, Award, Clock } from 'lucide-react';
import { User, Subject, Exam } from '../types';
import SubjectIcon from './SubjectIcon';

interface DashboardViewProps {
  user: User;
  subjects: Subject[];
  exams: Exam[];
  onNavigateToTab: (tab: 'home' | 'exams' | 'subjects' | 'profile') => void;
  onSelectExam: (examId: string) => void;
}

export default function DashboardView({
  user,
  subjects,
  exams,
  onNavigateToTab,
  onSelectExam,
}: DashboardViewProps) {
  // Find upcoming exam (Math is often the first one)
  const upcomingExam = exams[0] || null;

  return (
    <div className="space-y-3">
      {/* Top action header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <button 
          onClick={() => alert('تنبيه: لا يوجد إشعارات غير مقروءة حالياً')}
          className="relative p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Bell size={20} className="stroke-[2]" />
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-brand-gold rounded-full ring-2 ring-white"></span>
        </button>
        
        <h1 className="text-lg font-extrabold text-brand-dark tracking-tight">الرئيسية</h1>
        
        <button 
          onClick={() => onNavigateToTab('profile')}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Menu size={20} className="stroke-[2]" />
        </button>
      </div>

      {/* Styled Welcome Back Card like mock screen */}
      <div className="bg-brand-dark rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between">
        {/* Abstract Gold Background wave design */}
        <div className="absolute top-0 left-0 w-32 h-full bg-brand-gold opacity-10 rounded-r-3xl transformation scale-110 skew-x-12"></div>
        <div className="absolute bottom-0 right-0 w-24 h-5 bg-brand-gold opacity-30 transform translate-y-3 skew-y-6"></div>

        <div className="space-y-1 z-10">
          <p className="text-[10px] text-slate-300 font-medium">مرحباً بعودتك</p>
          <h2 className="text-xl font-black text-white">{user.username}</h2>
          <p className="text-[10px] text-brand-gold font-bold bg-brand-blue/60 backdrop-blur-sm px-2 py-0.5 rounded-full inline-block">
            طالب مستجد - المسار العلمي
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

        <div className="grid grid-cols-2 gap-2.5">
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
