import React from 'react';
import { Calendar, Clock, ClipboardList, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { Exam } from '../types';

interface ExamsViewProps {
  exams: Exam[];
  examHistory: { examTitle: string; scorePct: number; date: string; timeUsed: string }[];
  onSelectExam: (examId: string) => void;
}

export default function ExamsView({ exams, examHistory, onSelectExam }: ExamsViewProps) {
  return (
    <div className="space-y-6">
      {/* Subject Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h1 className="text-xl font-extrabold text-brand-dark">الاختبارات</h1>
        <p className="text-xs text-brand-gold font-bold">مكتب القياس والتقويم</p>
      </div>

      {/* Available Exams Container */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-gray-500 flex items-center gap-1.5">
          <ClipboardList size={16} className="text-brand-gold text-brand-gold stroke-[2.2]" />
          <span>الاختبارات التجريبية المتاحة</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div 
              key={exam.id} 
              className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-sm hover:shadow transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full inline-block">
                    اختبار تجريبي غير محدود المحاولات
                  </span>
                  <h4 className="font-extrabold text-sm text-brand-dark mt-1">{exam.title}</h4>
                  <p className="text-xs text-gray-400">
                    يحتوي هذا الاختبار التجريبي على {exam.questions.length} أسئلة شاملة للمذكرة الدراسية للمادة.
                  </p>
                </div>
              </div>

              {/* Stats parameters */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-2.5 rounded-xl text-xs">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Clock size={14} className="text-gray-400" />
                  <span>المدة: <strong>{exam.durationMinutes} دقيقة</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar size={14} className="text-gray-400" />
                  <span>تاريخ الصلاحية: <strong>{exam.date}</strong></span>
                </div>
              </div>

              {/* Start action */}
              <button
                onClick={() => onSelectExam(exam.id)}
                className="w-full py-2.5 bg-brand-dark hover:bg-brand-blue text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center block shadow-sm hover:shadow"
              >
                دخول جلسة الاختبار التجريبي
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Exam Score Logs - سجّل الاختبارات السابقة */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-gray-500 flex items-center gap-1.5">
          <Award size={16} className="text-brand-gold stroke-[2.2]" />
          <span>سجل درجات الاختبارات السابقة</span>
        </h3>

        {examHistory.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden divide-y divide-gray-100 shadow-sm">
            {examHistory.map((hist, index) => (
              <div key={index} className="p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <h5 className="font-bold text-gray-800">{hist.examTitle}</h5>
                  <p className="text-[10px] text-gray-400">
                    تم التقديم في {hist.date} | الوقت المستغرق: {hist.timeUsed}
                  </p>
                </div>

                <div className="text-left flex items-center gap-2">
                  <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg ${
                    hist.scorePct >= 70 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : hist.scorePct >= 50 
                        ? 'bg-amber-50 text-amber-700' 
                        : 'bg-red-50 text-red-700'
                  }`}>
                    {hist.scorePct}%
                  </span>
                  
                  <span className="text-[10px] text-gray-400 font-bold">
                    {hist.scorePct >= 50 ? 'ناجح ✓' : 'إعادة ✕'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 space-y-1.5 shadow-sm">
            <AlertCircle size={24} className="mx-auto text-gray-300" />
            <p className="text-xs font-bold">لا يوجد سجل محاولات سابقة حالياً</p>
            <p className="text-[10px]">ادخل أحد الاختبارات التجريبية بالشرائح أعلاه لتسجيل محاولتك الأولى!</p>
          </div>
        )}
      </div>
    </div>
  );
}
