import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronDown, CheckCircle2, ChevronRight, BookOpen, Video, FileText } from 'lucide-react';
import { Subject } from '../types';
import SubjectIcon from './SubjectIcon';

interface SubjectsViewProps {
  subjects: Subject[];
  onToggleLecture: (subjectId: string, lectureIndex: number) => void;
}

// Sample lecture outline for each subject to provide real depth
const subjectLecturesMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf' }[]> = {
  math: [
    { title: 'المحاضرة 1: حساب التفاضل والتكامل المتقدم', duration: '45 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: الدوال اللوغاريتمية والأسية', duration: '30 دقيقة', type: 'pdf' },
    { title: 'المحاضرة 3: المصفوفات والمحددات في الجبر', duration: '50 دقيقة', type: 'video' },
    { title: 'المحاضرة 4: تطبيقات الهندسة الفراغية ثلاثية الأبعاد', duration: '40 دقيقة', type: 'video' },
    { title: 'المحاضرة 5: مبادئ الإحصاء والاحتمالات', duration: '35 دقيقة', type: 'pdf' },
    { title: 'المحاضرة 6: حل المعادلات التفاضلية البسيطة', duration: '48 دقيقة', type: 'video' },
  ],
  physics: [
    { title: 'المحاضرة 1: الميكانيكا الكلاسيكية وقوانين الحركة والتسارع', duration: '55 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: الديناميكا الحرارية وتطبيقاتها العملي والفيزيائي', duration: '40 دقيقة', type: 'pdf' },
    { title: 'المحاضرة 3: الكهربية الساكنة وقانون كولوم والشحنات', duration: '50 دقيقة', type: 'video' },
    { title: 'المحاضرة 4: المغناطيسية وتطبيقات الحث الكهرومغناطيسي', duration: '45 دقيقة', type: 'video' },
  ],
  chemistry: [
    { title: 'المحاضرة 1: الكيمياء العضوية وتراكيب ذرات الكربون وعلاقتها', duration: '50 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: الجدول الدوري وتوصيف الروابط التساهمية والأيونية', duration: '35 دقيقة', type: 'pdf' },
    { title: 'المحاضرة 3: معدلات التفاعلات الكيميائية ومفهوم الاتزان الكيميائي', duration: '42 دقيقة', type: 'video' },
    { title: 'المحاضرة 4: الأحماض والقواعد ومقياس الرقم الهيدروجيني pH', duration: '45 دقيقة', type: 'video' },
  ],
  english: [
    { title: 'المحاضرة 1: قواعد الأزمنة وتراكيب الجمل الإنجليزية المعقدة', duration: '30 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: مهارات الكتابة الأكاديمية وصياغة البحوث والتقارير', duration: '40 دقيقة', type: 'pdf' },
    { title: 'المحاضرة 3: مهارات الاستماع والمحادثة في البيئة الجامعية والمهنية', duration: '35 دقيقة', type: 'video' },
    { title: 'المحاضرة 4: القراءة السريعة وتحليل النصوص وفك رموز الكلمات المتقدمة', duration: '45 دقيقة', type: 'video' },
  ],
  safety: [
    { title: 'المحاضرة 1: مقدمة في سلامة الحياة وإدارة المخاطر والتهديدات', duration: '35 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: الإجراءات الوقائية في حالات الطوارئ وخطط الإخلاء', duration: '40 دقيقة', type: 'pdf' },
    { title: 'المحاضرة 3: الإسعافات الأولية والتعامل الفوري مع الإصابات الطارئة', duration: '45 دقيقة', type: 'video' }
  ],
  programming: [
    { title: 'المحاضرة 1: مفاهيم البرمجة الأساسية وكتابة الأنماط النظيفة', duration: '50 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: تحليل الخوارزميات وتصميم البنى البرمجية المعقدة', duration: '45 دقيقة', type: 'video' },
    { title: 'المحاضرة 3: مبادئ البرمجة كائنية التوجه OOP وتوزيع الصفوف', duration: '55 دقيقة', type: 'pdf' }
  ],
  history: [
    { title: 'المحاضرة 1: تأسيس الدولة الروسية والملوك الأوائل للبلاد', duration: '40 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: روسيا القيصرية والتحولات السياسية الكبرى في القرن الـ 19', duration: '50 دقيقة', type: 'pdf' }
  ],
  russian: [
    { title: 'المحاضرة 1: الحروف الأبجدية الروسية واللفظ الصحيح للمقاطع', duration: '35 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: تراكيب الجمل الحوارية والردود السريعة اليومية', duration: '45 دقيقة', type: 'video' },
    { title: 'المحاضرة 3: قواعد جمع الأسماء وصياغة التفضيلات اللغوية', duration: '40 دقيقة', type: 'pdf' }
  ],
  sports: [
    { title: 'المحاضرة 1: اللياقة البدنية والتمارين الهوائية والصحة الغذائية المتكاملة', duration: '30 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: طرق الوقاية من التشنجات والإصابات العضلية والتأهيل الرياضي', duration: '35 دقيقة', type: 'pdf' }
  ],
  nanocad: [
    { title: 'المحاضرة 1: واجهة برنامج nanoCAD وأدوات التخطيط الأساسية 2D', duration: '45 دقيقة', type: 'video' },
    { title: 'المحاضرة 2: التعامل مع الطبقات والأبعاد وضبط الإخراج والطباعة والمقاييس', duration: '50 دقيقة', type: 'video' },
    { title: 'المحاضرة 3: النمذجة ثلاثية الأبعاد والتصاميم الهندسية ثنائية التموضع', duration: '55 دقيقة', type: 'pdf' }
  ]
};

export default function SubjectsView({ subjects, onToggleLecture }: SubjectsViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Filter subjects based on filter chip and text search
  const filteredSubjects = subjects.filter((sub) => {
    const matchesChip = selectedFilter === 'all' || sub.id === selectedFilter;
    const matchesSearch = sub.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChip && matchesSearch;
  });

  const handleToggleExpand = (id: string) => {
    setExpandedSubject(expandedSubject === id ? null : id);
  };

  return (
    <div className="space-y-5">
      {/* Search Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h1 className="text-xl font-extrabold text-brand-dark">المواد الدراسية</h1>
        <p className="text-xs text-gray-500">متابعة الدروس والمحاضرات</p>
      </div>

      {/* Styled Search Field */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
          <Search size={17} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مادة دراسية..."
          className="w-full pl-4 pr-11 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-right shadow-sm"
        />
      </div>

      {/* Filter Chips - matching style from user image */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none" style={{ direction: 'rtl' }}>
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-brand-dark text-white shadow-sm'
              : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
          }`}
        >
          الكل
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedFilter(sub.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === sub.id
                ? 'bg-brand-dark text-white shadow-sm'
                : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {sub.nameAr}
          </button>
        ))}
      </div>

      {/* Materials List with Chevron Expand Details */}
      <div className="space-y-3.5">
        {filteredSubjects.length > 0 ? (
          filteredSubjects.map((sub) => {
            const isExpanded = expandedSubject === sub.id;
            const progressPct = Math.round((sub.completedLectures / sub.lecturesCount) * 100);
            const subLectures = subjectLecturesMap[sub.id] || [];

            return (
              <div 
                key={sub.id} 
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300"
              >
                {/* Main Card Header */}
                <div 
                  onClick={() => handleToggleExpand(sub.id)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <SubjectIcon type={sub.iconType} size={22} />
                    <div>
                      <h3 className="font-extrabold text-sm text-brand-dark">{sub.nameAr}</h3>
                      <p className="text-[11px] text-gray-400 font-medium">عدد المحاضرات: {sub.lecturesCount} محاضرات</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Completion rate circle or text */}
                    <div className="text-left">
                      <span className="text-xs font-bold text-brand-gold bg-amber-50 px-2.5 py-1 rounded-lg">
                        {progressPct}% إنجاز
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-gray-50 text-gray-400">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                    </div>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="px-4 pb-4">
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-gold h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expanded Detailed lecture listings */}
                {isExpanded && (
                  <div className="bg-gray-50/60 border-t border-gray-50 px-4 py-3 divide-y divide-gray-100">
                    <p className="text-[11px] font-bold text-gray-400 pb-2 flex items-center gap-1">
                      <BookOpen size={13} className="text-brand-gold" />
                      <span>قائمة المحاضرات ومخطط المنهج الدراسي:</span>
                    </p>
                    
                    {subLectures.map((lecture, i) => {
                      const isCompleted = i < sub.completedLectures;
                      return (
                        <div 
                          key={i} 
                          className="py-3 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-start gap-2.5 max-w-[80%]">
                            <button 
                              onClick={() => onToggleLecture(sub.id, i)}
                              className={`shrink-0 p-0.5 rounded-full transition-all focus:outline-none cursor-pointer ${
                                isCompleted 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-gray-100 text-gray-300 hover:text-gray-400'
                              }`}
                            >
                              <CheckCircle2 size={18} className="fill-current stroke-white" />
                            </button>
                            <div>
                              <p className={`font-bold ${isCompleted ? 'text-gray-400 line-through' : 'text-brand-dark'}`}>
                                {lecture.title}
                              </p>
                              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                                {lecture.type === 'video' ? <Video size={11} /> : <FileText size={11} />}
                                <span>{lecture.duration} | {lecture.type === 'video' ? 'شرح مرئي' : 'مذكرة مرجعية PDF'}</span>
                              </span>
                            </div>
                          </div>

                          <button 
                            onClick={() => alert(`بدء عرض المحتوى لـ ${lecture.title}...`)}
                            className="text-[11px] font-bold text-brand-blue hover:text-brand-gold transition-colors bg-white border border-gray-100 px-2.5 py-1 rounded"
                          >
                            عرض
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400 space-y-1">
            <p className="text-sm font-bold">لا توجد مواد تطابق البحث</p>
            <p className="text-xs">جرب البحث بكلمات أخرى أو تغيير الفلتر.</p>
          </div>
        )}
      </div>
    </div>
  );
}
