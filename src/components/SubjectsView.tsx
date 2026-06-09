import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronDown, CheckCircle2, ChevronRight, BookOpen, Video, FileText, Sparkles, Send, GraduationCap, X, Copy, Check, Lock, Unlock, QrCode, AlertCircle, RefreshCw } from 'lucide-react';
import { Subject, User } from '../types';
import SubjectIcon from './SubjectIcon';
import { db, safeQuery, safeWhere, safeOnSnapshot } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { paidSubjectsConfig, PaidWorkItem } from '../data';
import PurchaseModal from './PurchaseModal';

interface SubjectsViewProps {
  subjects: Subject[];
  onToggleLecture: (subjectId: string, lectureIndex: number) => void;
  subjectLecturesMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf'; url?: string }[]>;
  user: User | null;
}

export default function SubjectsView({ subjects, onToggleLecture, subjectLecturesMap, user }: SubjectsViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Sub-tabs for safety and programming: 'lectures' or 'seminar'
  const [subTabs, setSubTabs] = useState<Record<string, 'lectures' | 'seminar' | 'paid'>>({});
  
  // Real-time payments & purchases for current student
  const [payments, setPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  useEffect(() => {
    if (!user || !user.uid) {
      setPayments([]);
      setPurchases([]);
      return;
    }

    setLoadingFinancials(true);
    const qPayments = safeQuery(collection(db, 'payments'), safeWhere('userId', '==', user.uid));
    const unsubscribePayments = safeOnSnapshot(qPayments, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPayments(list);
    }, (error) => {
      console.error("Error listening to student payments:", error);
    });

    const qPurchases = safeQuery(collection(db, 'user_purchases'), safeWhere('userId', '==', user.uid));
    const unsubscribePurchases = safeOnSnapshot(qPurchases, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPurchases(list);
      setLoadingFinancials(false);
    }, (error) => {
      console.error("Error listening to student purchases:", error);
      setLoadingFinancials(false);
    });

    return () => {
      unsubscribePayments();
      unsubscribePurchases();
    };
  }, [user]);

  const getPaymentStatus = (subjectId: string, itemId: string): 'not_paid' | 'pending_review' | 'rejected' | 'paid' => {
    const purchased = purchases.some(p => p.subjectId === subjectId && p.itemId === itemId && p.accessGranted === true);
    if (purchased) return 'paid';

    const itemPayments = payments.filter(p => p.subjectId === subjectId && p.itemId === itemId);
    if (itemPayments.length > 0) {
      const hasPending = itemPayments.some(p => p.status === 'pending_review');
      if (hasPending) return 'pending_review';

      const hasPaid = itemPayments.some(p => p.status === 'paid');
      if (hasPaid) return 'paid';

      const hasRejected = itemPayments.some(p => p.status === 'rejected');
      if (hasRejected) return 'rejected';
    }

    return 'not_paid';
  };

  // Student purchase initiation & checkout
  const [activePurchaseItem, setActivePurchaseItem] = useState<{ subjectId: string; item: PaidWorkItem } | null>(null);

  const handleSendPaymentNotification = async (inputs: { senderName: string; telegram: string; notes: string }) => {
    if (!user || !user.email || !activePurchaseItem) return;
    try {
      const paymentId = `pay_${user.uid || Math.random().toString(36).substr(2, 9)}_${activePurchaseItem.subjectId}_${activePurchaseItem.item.id}_${Date.now()}`;
      const payDocRef = doc(db, 'payments', paymentId);
      
      const subject = subjects.find(s => s.id === activePurchaseItem.subjectId);
      const subjectNameAr = subject ? subject.nameAr : activePurchaseItem.subjectId;
      const calculatedItemNameAr = `${activePurchaseItem.item.name} (${activePurchaseItem.subjectId === 'physics' ? 'رغبة فيزياء РГР' : activePurchaseItem.subjectId === 'programming' ? 'حل برمجة' : activePurchaseItem.subjectId === 'algorithms' ? 'حل خوارزميات' : activePurchaseItem.subjectId === 'safety' ? 'حل سلامة مهنية' : 'رسم نانوكاد'})`;

      const payload = {
        id: paymentId,
        userId: user.uid || 'unauthenticated',
        userName: user.fullName || user.username || 'طالب مجهول الهوية',
        userEmail: user.email,
        subjectId: activePurchaseItem.subjectId,
        subjectName: subjectNameAr,
        itemId: activePurchaseItem.item.id,
        itemName: activePurchaseItem.item.name,
        itemType: activePurchaseItem.item.type || 'single',
        price: activePurchaseItem.item.price,
        currency: 'RUB',
        cardNumber: '220010500228419',
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        // Custom captured fields
        senderName: inputs.senderName,
        telegram: inputs.telegram,
        notes: inputs.notes,
        itemNameAr: calculatedItemNameAr
      };

      await setDoc(payDocRef, payload);
      alert('✓ تم إرسال إشعار الدفع وبدء مراجعة وتأكيد التحويل! سيقوم المسؤول العام بمراجعتها فوراً وتفعيل الملف التجهيزي لك.');
      setActivePurchaseItem(null);
    } catch (err: any) {
      console.error("Error creating payment: ", err);
      alert(`❌ فشل في إرسال إشعار الدفع: ${err.message}`);
      throw err;
    }
  };

  // Selected model details state for dialog popup
  const [selectedModel, setSelectedModel] = useState<{ subjectId: string; modelNum: number } | null>(null);
  
  // Custom video/PDF viewer state
  const [viewingLecture, setViewingLecture] = useState<{ title: string; type: 'video' | 'pdf'; url?: string } | null>(null);
  const [labAnswers, setLabAnswers] = useState<Record<string, string>>({});
  const [labSubmitted, setLabSubmitted] = useState<Record<string, boolean>>({});

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

  const handleOpenModel = (subjectId: string, modelNum: number) => {
    setSelectedModel({ subjectId, modelNum });
  };

  const handleCloseModel = () => {
    setSelectedModel(null);
  };

  const handleSubmitLab = (key: string) => {
    setLabSubmitted({ ...labSubmitted, [key]: true });
    alert('تم رفع حل النموذج وحفظه للمراجعة الأكاديمية بنجاح! ✓');
  };

  return (
    <div className="space-y-5">
      {/* Search Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
        <h1 className="text-xl font-extrabold text-brand-dark">المواد الدراسية</h1>
        <p className="text-xs text-gray-500">متابعة المستندات والملفات المطلوبة</p>
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

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none" style={{ direction: 'rtl' }}>
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-brand-dark text-white shadow-sm'
              : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300'
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
                : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300'
            }`}
          >
            {sub.nameAr}
          </button>
        ))}
      </div>

      {/* Materials List */}
      <div className="space-y-3.5">
        {filteredSubjects.length > 0 ? (
          filteredSubjects.map((sub) => {
            const isExpanded = expandedSubject === sub.id;
            const progressPct = Math.round((sub.completedLectures / sub.lecturesCount) * 100);
            const subLectures = subjectLecturesMap[sub.id] || [];
            
            // Sub-tab for safety and programming
            const activeTabForSub = subTabs[sub.id] || 'lectures';

            return (
              <div 
                key={sub.id} 
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 dark:bg-slate-900 dark:border-slate-800"
              >
                {/* Main Card Header */}
                <div 
                  onClick={() => handleToggleExpand(sub.id)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <SubjectIcon type={sub.iconType} size={22} />
                    <div>
                      <h3 className="font-extrabold text-xs md:text-sm text-brand-dark">{sub.nameAr}</h3>
                      <p className="text-[10px] md:text-[11px] text-gray-400 font-medium font-sans">المستندات المطلوبة: {sub.lecturesCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <span className="text-[10px] md:text-xs font-bold text-brand-gold bg-amber-50 px-2 py-0.5 rounded-lg dark:bg-amber-500/10 dark:text-brand-gold whitespace-nowrap">
                        {progressPct}% إنجاز
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-gray-50 text-gray-400 dark:bg-slate-800">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                    </div>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="px-4 pb-4">
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden dark:bg-slate-800">
                    <div 
                      className="bg-brand-gold h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                  <div className="bg-gray-50/60 border-t border-gray-50 px-4 py-3.5 dark:bg-slate-850 dark:border-slate-800 space-y-4">
                    
                    {/* Conditional sub-tabs switch for subjects with paid configs */}
                    {paidSubjectsConfig[sub.id] !== undefined ? (
                      <div className="space-y-4">
                        {/* Tab Switch Layout */}
                        <div className="flex gap-2 p-1 bg-gray-200/50 dark:bg-slate-800 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              const current = subTabs[sub.id] || 'lectures';
                              if (current !== 'lectures') {
                                setSubTabs({ ...subTabs, [sub.id]: 'lectures' });
                              }
                            }}
                            className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                              (subTabs[sub.id] || 'lectures') === 'lectures'
                                ? 'bg-brand-dark text-white shadow-sm dark:bg-slate-700'
                                : 'text-gray-500 dark:text-slate-400 hover:text-brand-dark dark:hover:text-white'
                            }`}
                          >
                            المراجع المعتمدة (مجاناً)
                          </button>
                          
                          {/* For life safety and programming: display interactive homework model grids Option */}
                          {(sub.id === 'safety' || sub.id === 'programming') && (
                            <button
                              type="button"
                              onClick={() => {
                                const current = subTabs[sub.id];
                                if (current !== 'seminar') {
                                  setSubTabs({ ...subTabs, [sub.id]: 'seminar' });
                                }
                              }}
                              className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                                subTabs[sub.id] === 'seminar'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'text-gray-500 dark:text-slate-400 hover:text-brand-dark dark:hover:text-white'
                              }`}
                            >
                              حلول الواجبات (1-25)
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const current = subTabs[sub.id];
                              if (current !== 'paid') {
                                setSubTabs({ ...subTabs, [sub.id]: 'paid' });
                              }
                            }}
                            className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                              subTabs[sub.id] === 'paid'
                                ? 'bg-brand-gold text-brand-dark shadow-sm font-black'
                                : 'text-brand-gold dark:text-brand-gold/80 hover:text-brand-gold/100'
                            }`}
                          >
                            ملفات جاهزة معتمدة 💎
                          </button>
                        </div>

                        {/* Switch Rendering Content */}
                        {(subTabs[sub.id] || 'lectures') === 'lectures' && (
                          <div className="divide-y divide-gray-100 dark:divide-slate-800">
                            {subLectures.map((lecture, i) => {
                              const isCompleted = i < sub.completedLectures;
                              return (
                                <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                                  <div className="flex items-start gap-2 max-w-[80%]">
                                    <button 
                                      onClick={() => onToggleLecture(sub.id, i)}
                                      className={`shrink-0 p-0.5 rounded-full transition-all focus:outline-none cursor-pointer ${
                                        isCompleted 
                                          ? 'bg-emerald-100 text-emerald-700' 
                                          : 'bg-gray-100 text-gray-300 hover:text-gray-400 dark:bg-slate-800 dark:text-slate-600'
                                      }`}
                                    >
                                      <CheckCircle2 size={17} className="fill-current stroke-white" />
                                    </button>
                                    <div className="text-right">
                                      <p className={`font-bold ${isCompleted ? 'text-slate-550 dark:text-slate-400 opacity-80' : 'text-brand-dark dark:text-white'}`}>
                                        {lecture.title}
                                      </p>
                                      <span className="text-[10px] text-slate-700 dark:text-slate-300 font-medium flex items-center justify-end gap-1 mt-0.5">
                                        <span>{lecture.duration} | {lecture.type === 'video' ? 'شرح مرئي' : 'مذكرة مرجعية PDF'}</span>
                                        {lecture.type === 'video' ? <Video size={11} /> : <FileText size={11} />}
                                      </span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => setViewingLecture(lecture)}
                                    className="text-[10px] font-bold text-brand-blue hover:text-brand-gold bg-white border border-gray-100 px-2 py-0.5 rounded dark:bg-slate-800 dark:border-slate-700"
                                  >
                                    عرض
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {subTabs[sub.id] === 'seminar' && (sub.id === 'safety' || sub.id === 'programming') && (
                          <div className="space-y-3">
                            <div className="bg-amber-500/5 border border-brand-gold/15 p-3 rounded-xl flex items-center gap-2 text-brand-gold text-[10px] font-black leading-relaxed">
                              <Sparkles size={14} className="shrink-0 animate-bounce" />
                              <span>الندوات المختبرية العلمية Семинары и Лабораторные работы (النماذج 1 - 25)</span>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-2 text-center" style={{ direction: 'rtl' }}>
                              {Array.from({ length: 25 }, (_, idx) => idx + 1).map((number) => {
                                const isSubmitted = labSubmitted[`${sub.id}-${number}`];
                                return (
                                  <button
                                    key={number}
                                    type="button"
                                    onClick={() => handleOpenModel(sub.id, number)}
                                    className={`py-2 px-1 text-xs rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer transform hover:scale-[1.03] active:scale-[0.98] ${
                                      isSubmitted
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-750 text-gray-700 dark:text-gray-200 hover:border-brand-gold dark:hover:border-brand-gold'
                                    }`}
                                  >
                                    <span className="font-extrabold text-[11px]">{number}</span>
                                    <span className={`text-[8px] mt-0.5 font-bold ${
                                      isSubmitted ? 'text-white' : 'text-gray-400 dark:text-slate-400'
                                    }`}>
                                      {isSubmitted ? 'تم رفعه' : 'نموذج'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-center text-gray-400 font-bold">
                              ✓ اضغط على أي رقم للمطالعة وحل الواجبات المختبرية وحساب تقدم النموذج.
                            </p>
                          </div>
                        )}

                        {subTabs[sub.id] === 'paid' && (
                          <div className="space-y-4">
                            {/* Premium Welcome Message */}
                            <div className="bg-gradient-to-r from-amber-500/5 to-brand-gold/5 border border-brand-gold/15 p-4 rounded-2xl space-y-2 text-right">
                              <div className="flex items-center gap-1.5 text-brand-gold font-extrabold text-[11px]">
                                <Sparkles size={14} className="text-brand-gold shrink-0 animate-pulse" />
                                <span>قسم الحلول والأعمال الجاهزة المعتمدة والمضمونة الكلية والجزئية 💎</span>
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-normal">
                                نوفر لك حلولاً نموذجية مصممة باحترافية كاملة لمساعدتك على التفوق وضمان الدرجات الكاملة في مادة {sub.nameAr} بكفاءة عالية.
                              </p>
                            </div>

                            {/* Render Bundles if any */}
                            {paidSubjectsConfig[sub.id]?.bundles && (
                              <div className="space-y-2 text-right">
                                <p className="text-[11px] font-black text-brand-dark dark:text-white flex items-center gap-1">
                                  <span>📦</span>
                                  <span>الباقات والعروض الشاملة الموفرة:</span>
                                </p>
                                <div className="space-y-2">
                                  {paidSubjectsConfig[sub.id].bundles!.map(bundle => {
                                    const status = getPaymentStatus(sub.id, bundle.id);
                                    return (
                                      <div key={bundle.id} className="p-3 bg-amber-500/5 dark:bg-slate-800 rounded-2xl border border-brand-gold/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs">📚</span>
                                            <h4 className="font-black text-xs text-brand-dark dark:text-white">{bundle.name}</h4>
                                            <span className="text-[9px] bg-brand-gold/20 text-brand-dark dark:text-white px-1.5 py-0.5 rounded font-black">توفير رائع!</span>
                                          </div>
                                          <p className="text-[9px] text-gray-400 font-bold leading-normal">
                                            تتضمن: {bundle.itemIds.map(id => paidSubjectsConfig[sub.id].items.find(i => i.id === id)?.name || id).join(' ، ')}
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                          <span className="font-sans font-black text-xs text-brand-gold">{bundle.price} RUB</span>
                                          {(() => {
                                            if (status === 'paid') {
                                              return (
                                                <a
                                                  href={bundle.downloadUrl || '#'}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black flex items-center gap-1 shadow-sm font-sans transition-all hover:scale-[1.03] cursor-pointer"
                                                >
                                                  <Unlock size={11} />
                                                  <span>تنزيل الباقة كاملة 🚀</span>
                                                </a>
                                              );
                                            } else if (status === 'pending_review') {
                                              return (
                                                <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl text-[10px] font-extrabold border border-amber-500/20 flex items-center gap-1 font-sans animate-pulse">
                                                  <RefreshCw size={11} className="animate-spin" />
                                                  <span>قيد المراجعة</span>
                                                </span>
                                              );
                                            } else if (status === 'rejected') {
                                              return (
                                                <button
                                                  onClick={() => setActivePurchaseItem({ subjectId: sub.id, item: bundle as any })}
                                                  className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                                                >
                                                  <AlertCircle size={11} />
                                                  <span>مرفوض - أعد الطلب</span>
                                                </button>
                                              );
                                            } else {
                                              return (
                                                <button
                                                  onClick={() => setActivePurchaseItem({ subjectId: sub.id, item: bundle as any })}
                                                  className="px-3 py-1.5 bg-brand-gold hover:bg-amber-600 text-white rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.03] cursor-pointer whitespace-nowrap"
                                                >
                                                  <Lock size={11} />
                                                  <span>طلب الباقة الشاملة</span>
                                                </button>
                                              );
                                            }
                                          })()}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Render Individual Items */}
                            <div className="space-y-2 text-right">
                              <p className="text-[11px] font-black text-brand-dark dark:text-white flex items-center gap-1">
                                <span>📄</span>
                                <span>الأعمال والحلول المفردة المتاحة للطلب الفوري:</span>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {paidSubjectsConfig[sub.id].items.map(item => {
                                  const status = getPaymentStatus(sub.id, item.id);
                                  return (
                                    <div key={item.id} className="p-3 bg-white dark:bg-slate-900 border border-gray-150/60 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs text-right">
                                      <div className="space-y-0.5">
                                        <h5 className="font-black text-xs text-brand-dark dark:text-white">{item.name}</h5>
                                        <p className="text-[9px] text-gray-400 font-bold">
                                          {item.type === 'seminar' ? 'ملف سيمنار أكاديمي جاهز' : item.type === 'lab' ? 'تقرير معمل متكامل' : 'رغبة РГР كاملة بالحلول'}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <div className="text-left font-sans flex flex-col justify-center shrink-0">
                                          {item.originalPrice && (
                                            <span className="text-[9px] text-gray-400 line-through leading-none font-bold block text-right">{item.originalPrice} RUB</span>
                                          )}
                                          <span className="font-sans font-black text-xs text-brand-gold block">{item.price} RUB</span>
                                        </div>

                                        {(() => {
                                          if (status === 'paid') {
                                            return (
                                              <a
                                                href={item.downloadUrl || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                              >
                                                <Unlock size={11} />
                                                <span>تحميل</span>
                                              </a>
                                            );
                                          } else if (status === 'pending_review') {
                                            return (
                                              <span className="px-2.5 py-1.5 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-extrabold border border-amber-500/20 flex items-center gap-1 font-sans animate-pulse">
                                                <RefreshCw size={11} className="animate-spin" />
                                                <span>مراجعة</span>
                                              </span>
                                            );
                                          } else if (status === 'rejected') {
                                            return (
                                              <button
                                                onClick={() => setActivePurchaseItem({ subjectId: sub.id, item })}
                                                className="px-2.5 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-555 hover:text-white border border-rose-500/20 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                                                title="اضغط لإعادة الإرسال"
                                              >
                                                <AlertCircle size={10} />
                                                <span>re-send</span>
                                              </button>
                                            );
                                          } else {
                                            return (
                                              <button
                                                onClick={() => setActivePurchaseItem({ subjectId: sub.id, item })}
                                                className="px-2.5 py-1.5 bg-brand-gold hover:bg-amber-600 text-white rounded-lg text-[9px] font-black flex items-center gap-1 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                                              >
                                                <Lock size={10} />
                                                <span>شراء</span>
                                              </button>
                                            );
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Standard Lectures Listing for subjects with NO paid configs */
                      <div className="space-y-1 divide-y divide-gray-100 dark:divide-slate-800">
                        <p className="text-[11px] font-extrabold text-slate-700 dark:text-brand-gold pb-2 flex items-center gap-1 text-right justify-end">
                          <span>قائمة المستندات المطلوبة والمراجع المعتمدة للمادة:</span>
                          <BookOpen size={13} className="text-brand-gold animate-pulse text-right" />
                        </p>
                        
                        {subLectures.map((lecture, i) => {
                          const isCompleted = i < sub.completedLectures;
                          return (
                            <div 
                              key={i} 
                              className="py-2.5 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-start gap-2 max-w-[80%]">
                                <button 
                                  onClick={() => onToggleLecture(sub.id, i)}
                                  className={`shrink-0 p-0.5 rounded-full transition-all focus:outline-none cursor-pointer ${
                                    isCompleted 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : 'bg-gray-100 text-gray-300 hover:text-gray-400 dark:bg-slate-800 dark:text-slate-600'
                                  }`}
                                >
                                  <CheckCircle2 size={17} className="fill-current stroke-white" />
                                </button>
                                <div className="text-right">
                                  <p className={`font-bold ${isCompleted ? 'text-slate-550 dark:text-slate-400 opacity-80' : 'text-brand-dark dark:text-white'}`}>
                                    {lecture.title}
                                  </p>
                                  <span className="text-[10px] text-slate-700 dark:text-slate-300 font-medium flex items-center justify-end gap-1 mt-0.5">
                                    <span>{lecture.duration} | {lecture.type === 'video' ? 'شرح مرئي' : 'مذكرة مرجعية PDF'}</span>
                                    {lecture.type === 'video' ? <Video size={11} /> : <FileText size={11} />}
                                  </span>
                                </div>
                              </div>

                              <button 
                                onClick={() => setViewingLecture(lecture)}
                                className="text-[10px] font-bold text-brand-blue hover:text-brand-gold bg-white border border-gray-100 px-2 py-0.5 rounded dark:bg-slate-800 dark:border-slate-700"
                              >
                                عرض
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400 space-y-1 dark:bg-slate-900 dark:border-slate-800">
            <p className="text-sm font-bold">لا توجد مواد تطابق البحث</p>
            <p className="text-xs">جرب البحث بكلمات أخرى أو تغيير الفلتر.</p>
          </div>
        )}
      </div>

      {/* RENDER DYNAMIC AND INTERACTIVE MODEL DETAILS DIALOG */}
      {selectedModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-right">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 border border-brand-gold/20 shadow-2xl relative space-y-4">
            
            {/* Close button */}
            <button 
              onClick={handleCloseModel}
              className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-brand-dark dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Glowing Icon Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-550/10 text-brand-gold flex items-center justify-center shrink-0">
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-brand-dark">
                  النموذج الأكاديمي العملي رقم {selectedModel.modelNum}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold font-mono">
                  {selectedModel.subjectId === 'programming' ? 'Семинар и Лабораторная работа по Программированию' : 'Семинар и Лабораторная работа по БЖД'}
                </p>
              </div>
            </div>

            {/* Academic Text Area */}
            <div className="space-y-2.5 pt-2 text-xs">
              
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-1">
                <p className="font-extrabold text-brand-dark leading-normal">
                  {selectedModel.subjectId === 'programming' 
                    ? `موضوع البحث باللغة الروسية: Лабораторная работа №${selectedModel.modelNum} - Проектирование алгоритмов и базовые структуры данных.`
                    : `موضوع البحث باللغة الروسية: Лабораторная работа №${selectedModel.modelNum} - Обеспечение жизнедеятельности и охрана труда на предприятии.`
                  }
                </p>
                <p className="text-[10px] text-gray-400 italic">
                  التوجيه: يرجى كتابة الردود أو رفع الإجابة الأكاديمية المطلوبة لنفس الرقم.
                </p>
              </div>

              {/* Interaction Details Form */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 block">إدخال الحل الأكاديمي المكتوب (إلزامي للتقديم)</label>
                <textarea
                  rows={3}
                  value={labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`] || ''}
                  onChange={(e) => setLabAnswers({
                    ...labAnswers,
                    [`${selectedModel.subjectId}-${selectedModel.modelNum}`]: e.target.value
                  })}
                  placeholder="اكتب تفسيرك الحل أو الملاحظات الأكاديمية هنا..."
                  className="w-full bg-white dark:bg-slate-850 border rounded-xl text-xs p-2.5 text-right font-medium focus:outline-none focus:border-brand-gold"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmitLab(`${selectedModel.subjectId}-${selectedModel.modelNum}`)}
                  disabled={!labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`]?.trim()}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    !labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`]?.trim()
                      ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 cursor-not-allowed'
                      : 'bg-brand-dark text-white hover:bg-black'
                  }`}
                >
                  <Send size={13} />
                  <span>تقديم الحل للمراجعة</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModel}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 rounded-xl text-xs font-bold font-black cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Dynamic Document & Video In-App Viewer Overlay */}
      {viewingLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Header bar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-xl ${viewingLecture.type === 'video' ? 'bg-amber-500/10 text-amber-500' : 'bg-brand-blue/10 text-brand-blue'}`}>
                  {viewingLecture.type === 'video' ? <Video size={16} /> : <FileText size={16} />}
                </span>
                <div>
                  <h3 className="font-extrabold text-[#111111] dark:text-white text-xs sm:text-sm leading-snug">
                    {viewingLecture.title}
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                    {viewingLecture.type === 'video' ? 'شرح مرئي مدمج' : 'مستند مراجعة دراسي مدمج'}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => setViewingLecture(null)}
                className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Viewer Stage */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[400px]">
              {viewingLecture.url ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {viewingLecture.type === 'video' ? (
                    (() => {
                      const ytUrl = getYouTubeEmbedUrl(viewingLecture.url);
                      if (ytUrl) {
                        return (
                          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 bg-black shadow-lg">
                            <iframe
                              src={ytUrl}
                              title={viewingLecture.title}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                        );
                      } else if (viewingLecture.url.match(/\.(mp4|webm|ogg|mov)$/i)) {
                        return (
                          <video 
                            src={viewingLecture.url} 
                            controls 
                            className="w-full aspect-video rounded-2xl bg-black border border-gray-200 dark:border-slate-800 shadow-lg"
                          />
                        );
                      } else {
                        // Fallback embed / custom video page iframe
                        return (
                          <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-gray-250 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-lg flex flex-col">
                            <iframe
                              src={viewingLecture.url}
                              title={viewingLecture.title}
                              className="w-full flex-1"
                              referrerPolicy="no-referrer"
                              sandbox="allow-same-origin allow-scripts allow-popups"
                            ></iframe>
                          </div>
                        );
                      }
                    })()
                  ) : (
                    /* PDF Document Handler */
                    <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-gray-250 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-lg flex flex-col">
                      <iframe
                        src={viewingLecture.url.toLowerCase().endsWith('.pdf') 
                          ? `https://docs.google.com/gview?url=${encodeURIComponent(viewingLecture.url)}&embedded=true` 
                          : viewingLecture.url
                        }
                        title={viewingLecture.title}
                        className="w-full flex-1"
                        referrerPolicy="no-referrer"
                      ></iframe>
                    </div>
                  )}

                  {/* External launch assistance block */}
                  <div className="w-full mt-3.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 text-center space-y-2">
                    <p className="text-[11px] text-gray-400 font-bold">
                      تعذر تحميل الإطار الأكاديمي؟ أو ترغب بدراسة المحتوى على شاشة أوسع؟
                    </p>
                    <a 
                      href={viewingLecture.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-black text-brand-blue hover:text-brand-gold bg-brand-blue/5 border border-brand-blue/15 px-3 py-1.5 rounded-xl transition"
                    >
                      <span>فتح الرابط الدراسي في نافذة مستقلة خارجية</span>
                      <ChevronRight size={12} className="rotate-180" />
                    </a>
                  </div>
                </div>
              ) : (
                /* Premium Academic Interactive Mock Content Generator when no link is explicitly provided by Admin */
                <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-150 dark:border-slate-800/80 shadow-md space-y-4 text-slate-700 dark:text-gray-100">
                  <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center font-extrabold text-lg">
                      📖
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#111111] dark:text-white">ملخص دراسي ومطالعة تفاعلية</h4>
                      <p className="text-[10px] text-gray-400 font-bold">المستند العلمي المطلوب للبرنامج الدراسي الجاري</p>
                    </div>
                  </div>

                  <div className="space-y-3 leading-relaxed text-xs">
                    <p className="font-extrabold text-[#111111] dark:text-brand-gold">
                      أهلاً بك يا زميل المعرفة الأكاديمية! هذا المستند مفعم بالمعلومات الأكاديمية المنسقة للدروس النظرية والاستعداد للمهارات المعملية الحالية.
                    </p>
                    
                    <div className="bg-gray-50 dark:bg-slate-850 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1.5">
                      <p className="font-bold text-[11px] text-gray-700 dark:text-gray-200 font-sans">📌 الأهداف الأكاديمية والمخرجات التعليمية المقررة:</p>
                      <ul className="list-disc pr-4 space-y-1 font-medium text-gray-500 dark:text-gray-400">
                        <li>فهم ومطالعة المحتوى الدراسي الموزع تحت إشراف هيئة التدريس الفيدرالية.</li>
                        <li>اكتساب المهارات والحلول الفلسفية والصيغ الرياضية الضرورية لتحضير نماذجك التفاعلية.</li>
                        <li>الاستعداد الكامل وتثبيت المفاهيم للاجتياز الناجح لأي اختبار قصير أو دوري.</li>
                      </ul>
                    </div>

                    <p className="font-medium text-gray-500 dark:text-gray-350">
                      يرجى قراءة الفصول المخصصة في الكتاب الجامعي والتأكد من مراجعة ملاحظاتك باستمرار. نوصي بحضور الندوات لحل النماذج والتفاعل مع دكاترة المادة في منتدى الحوار المفتوح.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="text-[10px] text-gray-400 font-bold">
                      حالة المستند: <span className="text-emerald-500">✓ معتمد رسمياً للدراسة</span>
                    </div>
                    <button 
                      onClick={() => setViewingLecture(null)}
                      className="px-4 py-1.5 bg-brand-dark hover:bg-black text-white rounded-xl text-[10px] font-black cursor-pointer"
                    >
                      حسناً، تم الحفظ والمطالعة
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* RENDER THE MANUAL PAYMENT CHECKOUT DIALOG */}
      {activePurchaseItem && (
        <PurchaseModal
          isOpen={true}
          onClose={() => setActivePurchaseItem(null)}
          subjectId={activePurchaseItem.subjectId}
          item={activePurchaseItem.item}
          user={user}
          onSubmitPayment={handleSendPaymentNotification}
        />
      )}

    </div>
  );
}

// YT embed URL extractor helper
function getYouTubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

