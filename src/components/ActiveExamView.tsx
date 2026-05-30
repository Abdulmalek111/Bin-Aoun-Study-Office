import React, { useState, useEffect } from 'react';
import { ChevronRight, Clock, ClipboardList, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Exam, Question } from '../types';

interface ActiveExamViewProps {
  exam: Exam;
  onExit: () => void;
  onSubmitResults: (examTitle: string, scorePct: number, timeUsed: string) => void;
}

export default function ActiveExamView({ exam, onExit, onSubmitResults }: ActiveExamViewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60); // in seconds
  const [isFinished, setIsFinished] = useState(false);
  const [scoreInfo, setScoreInfo] = useState<{ correct: number; total: number; pct: number } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showUnfinishedConfirm, setShowUnfinishedConfirm] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = exam.questions[currentIdx];

  const handleSelectOption = (optionIndex: number) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex,
    });
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < exam.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleAutoSubmit = () => {
    calculateAndSubmit();
  };

  const handleManualSubmit = () => {
    const unaskedCount = exam.questions.length - Object.keys(answers).length;
    if (unaskedCount > 0) {
      setShowUnfinishedConfirm(true);
      return;
    }
    calculateAndSubmit();
  };

  const calculateAndSubmit = () => {
    let correctCount = 0;
    exam.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const total = exam.questions.length;
    const pct = Math.round((correctCount / total) * 100);
    
    // Calculate time used
    const secondsUsed = (exam.durationMinutes * 60) - timeLeft;
    const minutesUsed = Math.floor(secondsUsed / 60);
    const secsRemainder = secondsUsed % 60;
    const timeUsedStr = `${minutesUsed} دقيقة و ${secsRemainder} ثانية`;

    const summary = { correct: correctCount, total, pct };
    setScoreInfo(summary);
    setIsFinished(true);

    // Call state saver to persist inside profile history lists
    onSubmitResults(exam.title, pct, timeUsedStr);
  };

  // Convert option index to Arabic prefix letters (أ, ب, ج, د)
  const optionPrefixes = ['أ)', 'ب)', 'ج)', 'د)'];

  if (isFinished && scoreInfo) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 flex flex-col justify-center min-h-[550px] text-center space-y-6">
        <div className="mx-auto bg-indigo-50 text-brand-blue p-5 rounded-full inline-block">
          <CheckCircle size={56} className="text-brand-gold stroke-[2]" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full">
            اكتمل الاختبار التجريبي
          </span>
          <h2 className="text-2xl font-extrabold text-brand-dark block mt-2">{exam.title}</h2>
          <p className="text-xs text-gray-500">تم إرسال ونشر الإجابات الخاصة بك لمراجعتها بنجاح</p>
        </div>

        {/* Big Score representation */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 max-w-xs mx-auto w-full space-y-2">
          <p className="text-xs text-gray-400 font-bold">الدرجة المحرزة</p>
          <div className="text-5xl font-mono font-black text-brand-blue">{scoreInfo.pct}%</div>
          <p className="text-xs text-gray-600 font-semibold">
            لقد أجبت بشكل صحيح على <strong className="text-brand-gold">{scoreInfo.correct}</strong> من أصل <strong className="text-brand-dark">{scoreInfo.total}</strong> أسئلة.
          </p>
        </div>

        {/* Motivational Banner */}
        <div className="text-xs font-semibold leading-relaxed">
          {scoreInfo.pct >= 85 ? (
            <p className="text-emerald-700 bg-emerald-50 rounded-xl p-3">إنجاز رائد ومميز! أنت جاهز تماماً للاختبارات الأكاديمية النهائية.</p>
          ) : scoreInfo.pct >= 60 ? (
            <p className="text-amber-700 bg-amber-50 rounded-xl p-3">أداء جيد ومبشر! يمكنك إعادة المحاولة في أي وقت لتحقيق الدرجة الكاملة.</p>
          ) : (
            <p className="text-red-700 bg-red-50 rounded-xl p-3">تحتاج لبعض المراجعة. انصحك بمتابعة قائمة دروس المواد الدراسية وإعادة الاختبار.</p>
          )}
        </div>

        {/* Exit action buttons */}
        <div className="pt-4 flex gap-3">
          <button
            onClick={onExit}
            className="flex-1 py-3 bg-brand-dark hover:bg-brand-blue text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            العودة لمركز الاختبارات
          </button>
          <button
            onClick={() => {
              // Reset state for retry
              setAnswers({});
              setCurrentIdx(0);
              setTimeLeft(exam.durationMinutes * 60);
              setIsFinished(false);
              setScoreInfo(null);
            }}
            className="px-4 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="إعادة المحاولة"
          >
            <RefreshCw size={14} />
            <span>إعادة</span>
          </button>
        </div>
      </div>
    );
  }

  const selectedOptionIndex = answers[currentQuestion.id];

  return (
    <div className="relative w-full max-w-md mx-auto bg-gray-50 rounded-3xl shadow-xl overflow-hidden border border-gray-150 flex flex-col min-h-[660px]" style={{ direction: 'rtl' }}>
      
      {/* Quiz Top Nav Bar Header */}
      <div className="bg-brand-dark text-white px-5 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowExitConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            <ChevronRight size={20} className="stroke-[2.5]" />
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-white">{exam.title}</h2>
            <p className="text-[10px] text-gray-300">طالب: عبدالملك</p>
          </div>
        </div>

        {/* Header Badges Grid */}
        <div className="flex items-center gap-2">
          {/* Time Limit Badge */}
          <div className="bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/5 font-mono text-xs font-bold text-brand-gold">
            <Clock size={13} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Info stripe */}
      <div className="bg-amber-500 text-white text-[11px] font-bold px-4 py-2 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ClipboardList size={12} />
          <span>الوضع التجريبي النشط</span>
        </span>
        <span>عدد أسئلة الاختبار: {exam.questions.length} أسئلة</span>
      </div>

      {/* Main Container padding */}
      <div className="p-5 flex-grow flex flex-col justify-between space-y-6">
        
        {/* Progress tracker bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px] text-gray-400 font-bold">
            <span>السؤال {currentIdx + 1} من {exam.questions.length}</span>
            <span>نسبة التقدم: {Math.round(((currentIdx + 1) / exam.questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-brand-gold h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / exam.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question content card inside */}
        <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm flex-grow flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] bg-brand-blue/10 text-brand-blue font-bold px-2 py-0.5 rounded-md inline-block">
              درجة السؤال المستحقة: 10 درجات
            </span>
            <p className="text-sm font-extrabold text-brand-dark leading-relaxed">
              {currentQuestion.questionText}
            </p>
          </div>

          {/* Render Options vertically */}
          <div className="space-y-3 mt-6">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOptionIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                    isSelected
                      ? 'border-brand-gold bg-amber-500/10 text-brand-dark ring-2 ring-brand-gold ring-opacity-20'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Prefix identifier label (أ, ب, ج, د) */}
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      isSelected ? 'bg-brand-gold text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {optionPrefixes[idx] || `${idx + 1}`}
                    </span>
                    <span className="text-xs font-bold">{option}</span>
                  </div>

                  {/* Circle radio or check representation */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    isSelected 
                      ? 'border-brand-gold bg-brand-gold text-white' 
                      : 'border-gray-300 bg-transparent'
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5 stroke-[3]">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action controllers buttons previous / next */}
        <div className="flex items-center gap-3 pt-2">
          {/* Previous button */}
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
              currentIdx === 0
                ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
            }`}
          >
            السابق
          </button>

          {/* Next or Finish Button */}
          {currentIdx === exam.questions.length - 1 ? (
            <button
              onClick={handleManualSubmit}
              className="flex-1 py-3 bg-brand-gold hover:bg-yellow-600 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer text-center"
            >
              إنهاء الاختبار وتحصيل الدرجة
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-brand-dark hover:bg-brand-blue text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer text-center"
            >
              التالي
            </button>
          )}
        </div>
      </div>

      {/* Custom Exit Confirmation Modal Overlay */}
      {showExitConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 z-50 animate-fade-in animate-duration-150">
          <div className="bg-white rounded-2xl p-6 w-[85%] max-w-xs shadow-xl text-center border border-gray-100 flex flex-col items-center">
            <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">تأكيد الخروج</h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              هل تريد حقاً مغادرة الاختبار؟ لن يتم حفظ أو تسجيل تقدمك الحالي.
            </p>
            <div className="flex w-full gap-2.5">
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                نعم، غادر
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                المتابعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Unfinished Confirmation Modal Overlay */}
      {showUnfinishedConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 z-50 animate-fade-in animate-duration-150">
          <div className="bg-white rounded-2xl p-6 w-[85%] max-w-xs shadow-xl text-center border border-gray-100 flex flex-col items-center">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-full mb-3">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">أسئلة غير مكتملة</h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              لقد أجبت على {Object.keys(answers).length} فقط من أصل {exam.questions.length} أسئلة في المجموع. هل أنت متأكد من إنهاء الاختبار وحساب النتيجة؟
            </p>
            <div className="flex w-full gap-2.5">
              <button
                onClick={() => {
                  setShowUnfinishedConfirm(false);
                  calculateAndSubmit();
                }}
                className="flex-1 py-2 px-3 bg-brand-gold hover:bg-yellow-600 text-white rounded-xl text-xs font-gold transition-colors cursor-pointer"
              >
                نعم، غادر واحسب
              </button>
              <button
                onClick={() => setShowUnfinishedConfirm(false)}
                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                الرجوع للحل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
