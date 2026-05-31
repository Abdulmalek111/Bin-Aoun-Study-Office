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
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <button 
          onClick={() => alert('تنبيه: لا يوجد إشعارات غير مقروءة حالياً')}
          className="relative p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Bell size={21} className="stroke-[2]" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-gold rounded-full ring-2 ring-white"></span>
        </button>
        
        <h1 className="text-xl font-extrabold text-brand-dark tracking-tight">الرئيسية</h1>
        
        <button 
          onClick={() => onNavigateToTab('profile')}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Menu size={22} className="stroke-[2]" />
        </button>
      </div>

      {/* Styled Welcome Back Card like mock screen */}
      <div className="bg-brand-dark rounded-2xl p-5 text-white shadow-md relative overflow-hidden flex items-center justify-between">
        {/* Abstract Gold Background wave design */}
        <div className="absolute top-0 left-0 w-32 h-full bg-brand-gold opacity-10 rounded-r-3xl transformation scale-110 skew-x-12"></div>
        <div className="absolute bottom-0 right-0 w-24 h-5 bg-brand-gold opacity-30 transform translate-y-3 skew-y-6"></div>

        <div className="space-y-1 z-10">
          <p className="text-xs text-slate-300 font-medium">مرحباً بعودتك</p>
          <h2 className="text-2xl font-black text-white">{user.username}</h2>
          <p className="text-[11px] text-brand-gold font-bold bg-brand-blue/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full inline-block">
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
              className="relative w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="relative w-16 h-16 rounded-full bg-brand-gold text-brand-dark flex items-center justify-center font-black text-xl border-2 border-white shadow">
              {user.username.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Featured Promotional Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow transition-all group duration-300">
        <img 
          src="https://i.ibb.co/cS43nRT9/image.png" 
          alt="بنر منصة بن عون التعليمية" 
          className="w-full h-auto object-cover rounded-2xl block transform group-hover:scale-[1.01] transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Leak Exams Section: تسريبات الاختبارات */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-brand-dark">تسريبات الاختبارات</h3>
          <button 
            onClick={() => onNavigateToTab('exams')}
            className="text-xs font-bold text-brand-gold hover:underline flex items-center gap-1"
          >
            <span>مشاهدة الكل</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        {upcomingExam && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow transition-all space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-blue/10 text-brand-blue rounded-xl">
                  <Calendar size={22} className="text-brand-gold stroke-[2]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-brand-dark">{upcomingExam.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">المدة: {upcomingExam.durationMinutes} دقيقة</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                  متاح الآن
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-3">
              <div className="flex items-center gap-1">
                <Clock size={13} className="text-gray-400" />
                <span>{upcomingExam.timeSlot}</span>
              </div>
              <div className="font-semibold text-brand-dark">{upcomingExam.date}</div>
            </div>

            <button 
              onClick={() => onSelectExam(upcomingExam.id)}
              className="w-full py-2.5 bg-brand-gold hover:bg-yellow-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer hover:shadow"
            >
              بدء الاختبار التجريبي الآن
            </button>
          </div>
        )}
      </div>

      {/* Study Subjects Grid Section: المواد الدراسية */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-brand-dark">المواد الدراسية</h3>
          <button 
            onClick={() => onNavigateToTab('subjects')}
            className="text-xs font-bold text-brand-gold hover:underline flex items-center gap-1"
          >
            <span>إحصائيات التقدم</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {subjects.map((sub) => (
            <div 
              key={sub.id}
              onClick={() => onNavigateToTab('subjects')}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center space-y-2 group"
            >
              <SubjectIcon 
                type={sub.iconType} 
                className="transform group-hover:scale-110 transition-transform duration-300" 
                size={22}
              />
              <div>
                <h4 className="font-bold text-xs text-brand-dark group-hover:text-brand-gold transition-colors">{sub.nameAr}</h4>
                <p className="text-[10px] text-gray-400 font-mono tracking-wide uppercase mt-0.5">{sub.nameEn}</p>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-brand-gold h-full rounded-full" 
                  style={{ width: `${(sub.completedLectures / sub.lecturesCount) * 100}%` }}
                ></div>
              </div>
              <p className="text-[10px] font-bold text-gray-500">
                {sub.completedLectures} / {sub.lecturesCount} محاضرات
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Achievement Panel footer */}
      <div className="achievement-card border rounded-2xl p-4 flex gap-3 items-center mb-6 transition-all duration-300">
        <div className="achievement-icon-wrapper p-2.5 rounded-xl shrink-0 flex items-center justify-center">
          <Award size={20} className="stroke-[2.2] text-brand-gold" />
        </div>
        <div className="flex-1">
          <h4 className="achievement-title font-bold text-xs">تقدم ملحوظ هذا الأسبوع!</h4>
          <p className="achievement-desc text-[11px] mt-0.5 leading-relaxed">لقد أنجزت 75% من المحاضرات المقررة، استمر في هذا الأداء الرائع.</p>
        </div>
      </div>
    </div>
  );
}
