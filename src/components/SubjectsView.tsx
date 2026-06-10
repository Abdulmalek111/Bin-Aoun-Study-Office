import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronDown, CheckCircle2, ChevronRight, BookOpen, Video, FileText, Sparkles, Send, GraduationCap, X, Copy, Check, Lock, Unlock, QrCode, AlertCircle, RefreshCw, Star, User as UserIcon, Play, ArrowDownToLine, Clock, Users, MessageSquare } from 'lucide-react';
import { Subject, User } from '../types';
import SubjectIcon from './SubjectIcon';
import { db, safeQuery, safeWhere, safeOnSnapshot } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { paidSubjectsConfig, PaidWorkItem } from '../data';
import PurchaseModal from './PurchaseModal';

const getSubjectImage = (id: string): string => {
  switch (id) {
    case 'physics':
      return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80';
    case 'chemistry':
      return 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&w=600&q=80';
    case 'math':
      return 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80';
    case 'programming':
      return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80';
    case 'algorithms':
      return 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80';
    case 'nanocad':
      return 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80';
    case 'english':
      return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80';
    case 'russian':
      return 'https://images.unsplash.com/photo-1513001900722-370f803f498d?auto=format&fit=crop&w=600&q=80';
    case 'history':
      return 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80';
    case 'sports':
      return 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80';
    default:
      return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80';
  }
};

const getSubjectTeacher = (id: string): string => {
  switch (id) {
    case 'physics':
      return 'أ. د. سيرجي سميرنوف';
    case 'chemistry':
      return 'د. يلينا بتروفا';
    case 'math':
      return 'أ. د. أليكسي نيكولايف';
    case 'programming':
      return 'م. عبد الملك بن عون';
    case 'algorithms':
      return 'د. فلاديمير بيتروف';
    case 'nanocad':
      return 'م. محمد بن عون';
    case 'english':
      return 'أ. تاتيانا سوبوليفا';
    case 'russian':
      return 'د. ناتاليا بافلوفا';
    case 'history':
      return 'أ. د. ديمتري رومانوف';
    case 'sports':
      return 'م. بافيل كوزلوف';
    default:
      return 'أكاديمية بن عون';
  }
};

const getSubjectRating = (id: string): number => {
  switch (id) {
    case 'programming': return 5.0;
    case 'math': return 4.9;
    case 'physics': return 4.8;
    case 'algorithms': return 4.9;
    case 'nanocad': return 4.9;
    case 'chemistry': return 4.7;
    default: return 4.8;
  }
};

const getSubjectDownloads = (id: string): string => {
  switch (id) {
    case 'physics': return '3.1k';
    case 'chemistry': return '1.9k';
    case 'math': return '2.4k';
    case 'programming': return '4.5k';
    case 'algorithms': return '2.1k';
    case 'nanocad': return '1.2k';
    case 'english': return '1.7k';
    case 'russian': return '1.5k';
    case 'history': return '930';
    case 'sports': return '380';
    case 'safety': return '1.6k';
    default: return '1.5k';
  }
};

const getSubjectStudentsCount = (id: string): string => {
  switch (id) {
    case 'physics': return '1.4k';
    case 'chemistry': return '980';
    case 'math': return '1.2k';
    case 'programming': return '2.2k';
    case 'algorithms': return '1.1k';
    case 'nanocad': return '650';
    case 'english': return '850';
    case 'russian': return '740';
    case 'history': return '450';
    case 'sports': return '210';
    case 'safety': return '820';
    default: return '1.1k';
  }
};

const getSubjectHours = (id: string): string => {
  switch (id) {
    case 'physics': return '14';
    case 'chemistry': return '12';
    case 'math': return '18';
    case 'programming': return '20';
    case 'algorithms': return '16';
    case 'nanocad': return '15';
    case 'english': return '10';
    case 'russian': return '13';
    case 'history': return '8';
    case 'sports': return '5';
    case 'safety': return '11';
    default: return '12';
  }
};

const getSubjectFullDescription = (id: string): { desc: string; goals: string[]; weights: { label: string; ratio: string }[] } => {
  switch (id) {
    case 'math':
      return {
        desc: 'يركز مقرر الرياضيات الهندسية والتحليل الرياضي على دراسة التكاملات المتعددة، المعادلات التفاضلية العادية والجزئية، ومتسلسلات فورير، المخصصة لتمكين طلاب الهندسة والعلوم من صياغة وحل المشكلات الفيزيائية والهندسية بدقة.',
        goals: [
          'فهم أساسيات حساب التفاضل والتكامل المتقدم ومحددات الفضاء متعدد الأبعاد.',
          'القدرة على حل المعادلات التفاضلية الخطية وغير الخطية بمختلف الرتب.',
          'تطبيق مصفوفات التحويل الهندسي لإيجاد الإحداثيات الهندسية المعقدة.'
        ],
        weights: [
          { label: 'الاختبارات الفترية القصيرة (Контрольные)', ratio: '30%' },
          { label: 'الأبحاث والواجبات المنزلية (ДЗ)', ratio: '30%' },
          { label: 'الامتحان النهائي والمناقشة الشفهية (Экзамен)', ratio: '40%' }
        ]
      };
    case 'physics':
      return {
        desc: 'مقرر الفيزياء الهندسية يشكل الركيزة الأساسية لفهم الميكانيكا، الكهرومغناطيسية، والفيزياء الموجية والحديثة، لربط الظواهر الطبيعية بالتطبيقات الهندسية الواقعية في بيئة المختبرات والصناعة.',
        goals: [
          'استيعاب قوانين نيوتن وقوانين حفظ الطاقة والزخم للحركات الدائرية والخطية.',
          'تطبيق معادلات ماكسويل والدوائر المغناطيسية لحل المسائل الكهرومغناطيسية.',
          'إجراء التجارب المعملية الفيزيائية بحرفية وتحليل البيانات والارتيابات الهندسية.'
        ],
        weights: [
          { label: 'التقارير المخبرية والعملية (Лабораторные)', ratio: '30%' },
          { label: 'الأعمال الفردية وحلول الرغبات (РГР)', ratio: '30%' },
          { label: 'الاختبار النهائي والمناقشة الفلسفية (Экзамен)', ratio: '40%' }
        ]
      };
    case 'chemistry':
      return {
        desc: 'يغطي مقرر الكيمياء العامة مبادئ البناء الذري، الروابط الكيميائية، الكيمياء العضوية وغير العضوية، والديناميكا الحرارية، مما يوفر فهماً شاملاً للتفاعلات والمواد الكيميائية.',
        goals: [
          'فهم البنية الإلكترونية للذرات وتوزيعها الدوري.',
          'إتقان موازنة التفاعلات الكيميائية وحساب الاستفادة الكتلية.',
          'مراقبة وفهم التوازنات الكيميائية الكهروحرارية.'
        ],
        weights: [
          { label: 'المشاريع والبحوث المعملية', ratio: '30%' },
          { label: 'التقييم المستمر والواجبات', ratio: '30%' },
          { label: 'الاختبار الفاينال التحريري', ratio: '40%' }
        ]
      };
    case 'programming':
      return {
        desc: 'مقرر البرمجة بلغة C++ وتطبيقاتها الهندسية. يبدأ من الصفر ليعلمك المنطق البرمجي، المتغيرات، التكرار، الوظائف، وينتقل بحرفية إلى البرمجة كائنية التوجه (OOP) وتطبيقات بنية البيانات.',
        goals: [
          'كتابة وتتبع شيفرات برمجية خالية من الأخطاء المنطقية.',
          'تطبيق مبادئ الكبسلة والوراثة وتعدد الأشكال عبر لغات OOP.',
          'حل وتصميم البرامج لحل المشكلات الحسابية في الندوات المختبرية.'
        ],
        weights: [
          { label: 'الندوات البرمجية الأسبوعية (Семинары)', ratio: '30%' },
          { label: 'البرامج والمشاريع التطبيقية المعملية', ratio: '30%' },
          { label: 'الاختبار العملي النهائي في المختبر', ratio: '40%' }
        ]
      };
    case 'algorithms':
      return {
        desc: 'يهدف مقرر تصميم وتحليل الخوارزميات إلى دراسة تعقيد الوقت والمساحة لحل المسائل المعقدة، مع التركيز على خوارزميات الفرز، البحث، التقسيم والحل، والبرمجة الديناميكية.',
        goals: [
          'تحليل التعقيد الزمني والمكاني باستخدام ترميز Big-O.',
          'تطبيق خوارزميات المخططات (Graphs) وحلول المسارات الأقصر.',
          'تنفيذ هياكل البيانات المتقدمة كالأشجار المتوازنة وجداول الهاش.'
        ],
        weights: [
          { label: 'تصميم وبناء الخوارزميات الفردية', ratio: '30%' },
          { label: 'الاختبارات القصيرة والواجبات', ratio: '30%' },
          { label: 'امتحان مناقشة الخوارزميات النهائي', ratio: '40%' }
        ]
      };
    case 'nanocad':
      return {
        desc: 'مقرر الرسم الهندسي والتصميم الحاسوبي ثنائي وثلاثي الأبعاد باستخدام برنامج nanoCAD الفيدرالي لإنشاء المخططات المعمارية والميكانيكية المعتمدة.',
        goals: [
          'إتقان واجهة وأدوات الرسم وتصميم الخطوط والطبقات في نانوكاد.',
          'تصميم ورسم نماذج مقطعية للمكونات الميكانيكية بدقة متناهية.',
          'التصدير الاحترافي للمخططات وفق معايير المقاييس الهندسية الفيدرالية.'
        ],
        weights: [
          { label: 'الرسومات واللوحات الهندسية المسلمة', ratio: '40%' },
          { label: 'التطبيقات العملية الصفية', ratio: '20%' },
          { label: 'الامتحان النهائي والتقييم الشفهي', ratio: '40%' }
        ]
      };
    case 'english':
      return {
        desc: 'يركز مقرر اللغة الإنجليزية الأكاديمية على تطوير مهارات القراءة السريعة، الكتابة الأكاديمية المتقدمة لتقارير المشاريع، وإتقان المصطلحات الفنية والهندسية المستخدمة في الأبحاث والمراجع العالمية.',
        goals: [
          'تحسين مهارات القراءة والتحليل السريع للنصوص الفنية.',
          'كتابة تقارير وملخصات أكاديمية متكاملة وخالية من الأخطاء اللغوية.',
          'إتقان المحادثة الأكاديمية والمصطلحات التخصصية في البيئات الجامعية.'
        ],
        weights: [
          { label: 'الاختبارات الشفهية والمحادثة واللفظ', ratio: '30%' },
          { label: 'الواجبات والتقارير الأكاديمية الأسبوعية', ratio: '30%' },
          { label: 'الاختبار التطبيقي التحريري النهائي الفاينال', ratio: '40%' }
        ]
      };
    case 'safety':
      return {
        desc: 'مقرر سلامة الحياة والأمن البيئي والمهني في المنشآت الصناعية والجامعية، يهدف إلى تمكين الطالب من فهم المخاطر وتطبيق بروتوكولات الإخلاء والإسعافات الأولية والتصرف السليم في حالات الطوارئ وفقاً لما تم إرساله.',
        goals: [
          'استيعاب بروتوكولات الأمن والسلامة المهنية في المختبرات والمنشآت.',
          'القدرة على تقييم المخاطر وتجنب التهديدات البيئية والصناعية بوعي وتأهب كافٍ.',
          'إتقان الإجراءات والخطوات العملية للإسعافات الأولية وخطط الإخلاء الطارئ.'
        ],
        weights: [
          { label: 'التقييم المستمر والاختبارات القصيرة والواجبات', ratio: '30%' },
          { label: 'ملخصات المحاضرات واستجابات الطوارئ والسيناريوهات', ratio: '30%' },
          { label: 'الامتحان والمناقشة الأكاديمية النهائية لسلامة الحياة', ratio: '40%' }
        ]
      };
    case 'history':
      return {
        desc: 'منهج التاريخ الروسي المعتمد يستعرض التحولات الكبرى والمحطات التاريخية البارزة في روسيا القيصرية والاتحاد السوفيتي وصولاً إلى العصر الحديث لتخليد التجربة الثقافية والسياسية.',
        goals: [
          'فهم الأحداث الرئيسية المؤثرة في صياغة التاريخ الروسي المعاصر.',
          'تحليل العلاقات السياسية والتحولات الاقتصادية والاجتماعية عبر العصور.',
          'كتابة أوراق بحثية نقدية حول الشخصيات والمحطات التاريخية الملهمة.'
        ],
        weights: [
          { label: 'المشاركة التفاعلية والمناقشات التاريخية الصفية بالمنصة', ratio: '25%' },
          { label: 'التكاليف والأوراق البحثية الفردية لعهد الأباطرة والاتحاد', ratio: '35%' },
          { label: 'امتحان الفاينال ومناقشة التموضع التاريخي مع المحاضر', ratio: '40%' }
        ]
      };
    case 'russian':
      return {
        desc: 'مقرر تأسيس وتطوير اللغة الروسية للطلاب الأجانب، يغطي الأبجدية، أساسيات القواعد والصرف، وتراكيب المحادثات اليومية لتمكين الطلاب من التواصل الثقافي والأكاديمي السلس.',
        goals: [
          'إتقان اللفظ الهجائي السليم للأبجدية الكيريلية والمقاطع الصوتية المتواترة.',
          'صياغة جمل وحوارات تفاعلية شائعة في مواقف الحياة اليومية السريعة والجامعية.',
          'استيعاب قواعد النحو والصرف الروسية القياسية (حالات الإضافة والدراسة والجر والأبنية الأساسية).'
        ],
        weights: [
          { label: 'الاختبارات الصوتية والشفهية الأسبوعية والنطق الصحيح للعبارات', ratio: '30%' },
          { label: 'الواجبات المنزلية وحقائب التدريبات العملية والتطبيقي', ratio: '30%' },
          { label: 'الاختبار التطبيقي التحريري النهائي والتقييم النهائي المستمر', ratio: '40%' }
        ]
      };
    case 'sports':
      return {
        desc: 'يهدف مقرر التربية البدنية والرياضية إلى صقل اللياقة البدنية والذهنية للطلاب، ممارسة التمارين التأهيلية المعتمدة، وفهم أسس التغذية الصحية المتكاملة والوقاية من الإصابات العضلية.',
        goals: [
          'تطوير القدرات البدنية للألعاب وتقديم بروتوكول التحمل والضغط العضلي والقلبي للطلاب.',
          'فهم قواعد وقوانين الرياضات الجماعية والفردية والتمارين المقننة المعتمدة.',
          'الدراسة والمعرفة السليمة بأسس التغذية المتكاملة وإدارات التأهيل وعلاجات التشنجات.'
        ],
        weights: [
          { label: 'الحضور البدني والالتزام بالمنتدى وحصص اللياقة', ratio: '40%' },
          { label: 'الواجبات والتقارير الرياضية والتقييم الحركي والتطبيقي', ratio: '20%' },
          { label: 'الاختبار والتقييم البدني والأكاديمي الشامل في نهاية الترم', ratio: '40%' }
        ]
      };
    default:
      return {
        desc: 'المقرر الدراسي المعتمد ضمن الخطة الدراسية الفيدرالية لأكاديمية بن عون للطلاب الجامعيين لتجهيزهم للمستويات المتقدمة والاستعداد الكامل للاختبارات الدورية مع شرح مدعم بالوسائط والمستندات العلمية.',
        goals: [
          'استيعاب المنهج النظري المحدد وفق الفصول الدراسية.',
          'الاستعداد للاختبارات عبر مراجعة بنوك الأسئلة والنماذج المتواترة.',
          'التواصل البناء مع الزملاء وأعضاء هيئة التدريس لحل الواجبات.'
        ],
        weights: [
          { label: 'الحضور والمشاركة التفاعلية في المنصة', ratio: '20%' },
          { label: 'الواجبات والتطبيقات العملية المفروضة', ratio: '40%' },
          { label: 'الامتحان والمناقشة الأكاديمية النهائية', ratio: '40%' }
        ]
      };
  }
};

const categories = [
  { id: 'all', title: 'الكل' },
  { id: 'physics', title: 'فيزياء' },
  { id: 'chemistry', title: 'كيمياء' },
  { id: 'math', title: 'رياضيات' },
  { id: 'programming', title: 'برمجة' },
  { id: 'algorithms', title: 'خوارزميات' }
];

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
  
  // Custom course details tab switcher
  const [activeDetailTab, setActiveDetailTab] = useState<'lectures' | 'files' | 'info' | 'discussions'>('info');
  const [courseDiscussions, setCourseDiscussions] = useState<any[]>([]);
  const [newCourseComment, setNewCourseComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Track liked message IDs in local state
  const [localLikedIds, setLocalLikedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('bin_aoun_liked_posts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('bin_aoun_liked_posts', JSON.stringify(localLikedIds));
  }, [localLikedIds]);

  // Synchronise discussions for the expanded subject in Real-time
  useEffect(() => {
    if (!expandedSubject) {
      setCourseDiscussions([]);
      return;
    }

    const collRef = collection(db, 'discussions');
    const unsubscribe = safeOnSnapshot(collRef, (snapshot) => {
      let list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.subjectId === expandedSubject) {
          list.push({ id: doc.id, ...data });
        }
      });
      list.sort((a, b) => {
        const aT = a.createdAt || a.timestamp || '';
        const bT = b.createdAt || b.timestamp || '';
        return bT.localeCompare(aT);
      });
      setCourseDiscussions(list);
    }, (error) => {
      console.error("Error loading course discussions:", error);
    });

    return () => unsubscribe();
  }, [expandedSubject]);

  useEffect(() => {
    setActiveDetailTab('lectures');
  }, [expandedSubject]);

  const handleAddCourseComment = async () => {
    if (!newCourseComment.trim() || !user || !expandedSubject) return;
    setSendingComment(true);
    try {
      const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const commentDocRef = doc(db, 'discussions', commentId);
      
      const payload = {
        id: commentId,
        subjectId: expandedSubject,
        authorName: user.fullName || user.username || 'طالب مناقش',
        authorRole: 'student',
        avatarSeed: user.username || 'student',
        content: newCourseComment,
        timestamp: 'الآن',
        createdAt: new Date().toISOString(),
        likes: 0
      };

      await setDoc(commentDocRef, payload);
      setNewCourseComment('');
    } catch (err: any) {
      console.error("Error posting course comment: ", err);
      alert(`❌ فشل في إرسال التعليق: ${err.message}`);
    } finally {
      setSendingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string, currentLikesCount: number) => {
    try {
      const isLiked = localLikedIds.includes(commentId);
      const postRef = doc(db, 'discussions', commentId);
      if (isLiked) {
        await setDoc(postRef, { likes: Math.max(0, currentLikesCount - 1) }, { merge: true });
        setLocalLikedIds(localLikedIds.filter(id => id !== commentId));
      } else {
        await setDoc(postRef, { likes: currentLikesCount + 1 }, { merge: true });
        setLocalLikedIds([...localLikedIds, commentId]);
      }
    } catch (err) {
      console.error("Failed like/unlike course comment:", err);
    }
  };
  
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
    setActiveDetailTab('info');
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

  if (expandedSubject) {
    const sub = subjects.find(s => s.id === expandedSubject);
    if (sub) {
      const subLectures = subjectLecturesMap[sub.id] || [];
      const infoDetails = getSubjectFullDescription(sub.id);
      
      return (
        <div className="bg-[#F8F9FB] dark:bg-[#050d18] min-h-screen text-slate-800 dark:text-gray-100 p-4 pb-28 text-right duration-200 font-sans max-w-md mx-auto space-y-5 animate-fade-in" dir="rtl">
          {/* HEADER BACK NAVIGATION */}
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800 select-none">
            <button 
              onClick={() => setExpandedSubject(null)}
              className="flex items-center gap-1 text-gray-500 hover:text-[#041B4D] dark:hover:text-white transition-all cursor-pointer font-black text-xs"
            >
              <ChevronRight size={18} />
              <span>رجوع للمقررات</span>
            </button>
            <div className="text-center">
              <h2 className="text-xs font-black text-[#041B4D] dark:text-white leading-none">تفاصيل المقرر الدراسي</h2>
              <span className="text-[8px] text-brand-gold font-bold block mt-1 uppercase">Course Details</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#041B4D]/5 text-[#041B4D] dark:text-brand-gold flex items-center justify-center font-black text-xs">
              ب.ع
            </div>
          </div>

          {/* LARGE COURSE COVER IMAGE WITH TITLE OVERLAY */}
          <div className="relative h-48 w-full rounded-3xl overflow-hidden shadow-md">
            <img 
              src={getSubjectImage(sub.id)} 
              alt={sub.nameAr}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Dark gradient cover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
            
            {/* Play overlay button design from reference */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-xl transition-all scale-100 hover:scale-105">
                <div className="w-10 h-10 rounded-full bg-[#D4A63D] flex items-center justify-center shadow-lg">
                  <Play size={14} className="text-[#041B4D] fill-current mr-0.5 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Course name over cover */}
            <div className="absolute bottom-4 right-4 left-4 text-right p-1 text-white z-10">
              <span className="text-[8px] tracking-wider uppercase bg-brand-gold text-brand-dark font-black px-2 py-0.5 rounded-md mb-1.5 inline-block text-right">
                مقرر معتمد
              </span>
              <h2 className="text-base font-black leading-tight drop-shadow-md text-right">{sub.nameAr}</h2>
              <div className="flex items-center gap-1.5 mt-1 opacity-95 text-right justify-start md:justify-end" style={{ direction: 'rtl' }}>
                <span className="text-[10px] font-bold text-gray-200">المحاضر: {getSubjectTeacher(sub.id)}</span>
                <span className="inline-block w-1 h-1 rounded-full bg-white/80" />
                <span className="text-[10px] font-bold text-[#D4A63D]">{sub.lecturesCount} محاضرات معتمدة</span>
              </div>
            </div>
          </div>

          {/* STATISTICS GRID CARD (Exactly 4 stats cards matching custom styling) */}
          <div className="grid grid-cols-4 gap-2">
            {/* ⭐ Rating */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-2 flex flex-col items-center justify-center text-center shadow-2xs">
              <Star size={15} className="fill-amber-400 stroke-amber-400 text-amber-500 mb-1" />
              <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">{getSubjectRating(sub.id).toFixed(1)}</span>
              <span className="text-[8px] text-gray-400 font-bold mt-1">التقييم</span>
            </div>

            {/* ⬇ Downloads */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-2 flex flex-col items-center justify-center text-center shadow-2xs">
              <ArrowDownToLine size={15} className="text-emerald-500 mb-1" />
              <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">{getSubjectDownloads(sub.id)}</span>
              <span className="text-[8px] text-gray-400 font-bold mt-1">تنزيل</span>
            </div>

            {/* 👨 Students */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-2 flex flex-col items-center justify-center text-center shadow-2xs">
              <Users size={15} className="text-indigo-500 mb-1" />
              <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">{getSubjectStudentsCount(sub.id)}</span>
              <span className="text-[8px] text-gray-400 font-bold mt-1">طالب</span>
            </div>

            {/* ⏱ Hours */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-2 flex flex-col items-center justify-center text-center shadow-2xs">
              <Clock size={15} className="text-amber-500 mb-1" />
              <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">{getSubjectHours(sub.id)} ساعة</span>
              <span className="text-[8px] text-gray-400 font-bold mt-1">شروحات</span>
            </div>
          </div>

          {/* COURSE TABS (Switches matching reference layout) */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100/75 dark:bg-slate-900/60 p-1 rounded-2xl border border-gray-150/40 dark:border-slate-800/40">
            {[
              { id: 'lectures', label: 'المحاضرات' },
              { id: 'files', label: 'ملفات المادة' },
              { id: 'info', label: 'معلومات المادة' },
              { id: 'discussions', label: 'المناقشات' }
            ].map((tab) => {
              const isActive = activeDetailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`py-2 px-0.5 text-center text-[10px] font-black rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#041B4D] text-white shadow-md dark:bg-slate-800'
                      : 'text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT BLOCK */}
          <div className="space-y-4">
            {/* TAB 1: LECTURES */}
            {activeDetailTab === 'lectures' && (
              <div className="space-y-4">
                {/* Download All Lectures Button */}
                <button
                  onClick={() => {
                    alert("🚀 جاري تجميع وتحضير كافة المحاضرات والمذكرات العلمية والمستندات المرفقة للمقرر وسيتم فوراً تنزيل الملف المدمج كملف مضغوط ZIP معتمد...");
                  }}
                  className="w-full py-3 bg-[#10B981] hover:bg-emerald-600 active:scale-[0.98] transition-all text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(16,185,129,0.2)] cursor-pointer"
                >
                  <ArrowDownToLine size={15} />
                  <span>تحميل كل مذكرات ومحاضرات المقرر المعتمد ⬇</span>
                </button>

                {/* Lecture list cards */}
                <div className="space-y-2.5">
                  {subLectures.length > 0 ? (
                    subLectures.map((lecture, i) => {
                      const isCompleted = i < sub.completedLectures;
                      return (
                        <div 
                          key={i} 
                          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-gray-150/60 dark:border-slate-800/60 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between gap-3 text-right"
                        >
                          {/* Play Circular Button & Index info */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setViewingLecture(lecture)}
                              className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-gray-150 dark:border-slate-700 flex items-center justify-center text-[#041B4D] dark:text-brand-gold hover:bg-[#041B4D] hover:text-white transition-colors cursor-pointer"
                            >
                              <Play size={13} className="fill-current mr-0.5" />
                            </button>
                            <div className="text-right">
                              <h4 className={`font-black text-xs ${isCompleted ? 'text-slate-400 line-through dark:text-slate-500 font-bold' : 'text-slate-950 dark:text-white'}`}>
                                {lecture.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-gray-400 font-bold">{lecture.duration} دقيقة</span>
                                <span className="inline-block w-1 h-1 rounded-full bg-gray-305" />
                                <span className="text-[9px] text-[#D4A63D] font-bold">{lecture.type === 'video' ? 'شرح مرئي مدمج' : 'ملخص دراسي ومذكرات PDF'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Complete toggle checkbox at leftmost (RTL) */}
                          <button
                            onClick={() => onToggleLecture(sub.id, i)}
                            className={`p-0.5 rounded-full transition-all focus:outline-none cursor-pointer scale-110 ${
                              isCompleted 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                : 'bg-gray-100 text-gray-300 hover:text-gray-400 dark:bg-slate-800 dark:text-slate-700'
                            }`}
                          >
                            <CheckCircle2 size={18} className="fill-current stroke-white dark:stroke-slate-900" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400 font-bold text-xs bg-slate-50 rounded-2xl border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
                      لا توجد محاضرات مدرجة حالياً لهذا المقرر
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FILES & RESOURCES */}
            {activeDetailTab === 'files' && (
              <div className="space-y-4 animate-fade-in text-right">
                {/* Embedded assignments laboratory model (Russia Seminars) inside Life Safety and Programming */}
                {(sub.id === 'safety' || sub.id === 'programming') && (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-gray-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[#041B4D] dark:text-brand-gold font-extrabold text-[11px] leading-relaxed pb-2 border-b border-gray-120 dark:border-slate-800">
                      <GraduationCap size={15} className="text-brand-gold shrink-0 animate-bounce" />
                      <span>الحقيبة المعملية والواجبات المختبرية الدراسية (النماذج 1 - 25):</span>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-1.5 text-center pt-1.5" style={{ direction: 'rtl' }}>
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
                                : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-750 text-gray-750 dark:text-gray-200 hover:border-brand-gold dark:hover:border-brand-gold'
                            }`}
                          >
                            <span className="font-extrabold text-[11px]">{number}</span>
                            <span className={`text-[8px] mt-0.5 font-bold ${
                              isSubmitted ? 'text-white' : 'text-gray-400 dark:text-slate-400'
                            }`}>
                              {isSubmitted ? 'مرفوع' : 'نموذج'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-center text-gray-400 font-bold mt-1.5 leading-normal">
                      ✓ يرجى الضغط على الرقم للحل والتحميل والمطالعة المباشرة لموضوع واجبك.
                    </p>
                  </div>
                )}

                {/* Bundle / Individual paid setups if configured in dataset */}
                {paidSubjectsConfig[sub.id] !== undefined ? (
                  <div className="space-y-4">
                    {/* Welcome banner */}
                    <div className="bg-gradient-to-r from-amber-500/5 to-brand-gold/5 border border-brand-gold/15 p-4 rounded-2xl space-y-1">
                      <div className="flex items-center gap-1.5 text-brand-gold font-extrabold text-[11px]">
                        <Sparkles size={14} className="text-brand-gold shrink-0 animate-pulse" />
                        <span>الملفات المعتمدة والحلول الجاهزة المضمونة للتحضير 💎</span>
                      </div>
                      <p className="text-[10px] text-gray-550 dark:text-gray-400 font-bold leading-normal">
                        نقوم بتوفير الحلول المصممة باحترافية كاملة من قبل خبراء المناهج لضمان الدرجات النهائية في مادة {sub.nameAr} بكفاءة عالية.
                      </p>
                    </div>

                    {/* Paid Bundles */}
                    {paidSubjectsConfig[sub.id].bundles && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-black text-slate-900 dark:text-white flex items-center gap-1">
                          <span>📦</span>
                          <span>الباقات والعروض الموفرة الشاملة:</span>
                        </p>
                        <div className="space-y-2">
                          {paidSubjectsConfig[sub.id].bundles!.map(bundle => {
                            const status = getPaymentStatus(sub.id, bundle.id);
                            return (
                              <div key={bundle.id} className="p-3 bg-amber-500/5 dark:bg-slate-900 border border-brand-gold/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right rounded-2xl">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs">📚</span>
                                    <h4 className="font-black text-xs text-brand-dark dark:text-white">{bundle.name}</h4>
                                    <span className="text-[9px] bg-brand-gold/20 text-brand-dark dark:text-white px-2 py-0.5 rounded font-black">جاهز فوراً</span>
                                  </div>
                                  <p className="text-[9px] text-gray-400 font-bold leading-normal">
                                    تتضمن: {bundle.itemIds.map(id => paidSubjectsConfig[sub.id].items.find(i => i.id === id)?.name || id).join(' ، ')}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between gap-3 shrink-0">
                                  <span className="font-sans font-black text-xs text-brand-gold">{bundle.price} RUB</span>
                                  {status === 'paid' ? (
                                    <a
                                      href={bundle.downloadUrl || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black flex items-center gap-1 shadow-sm font-sans transition-all hover:scale-[1.03] cursor-pointer animate-fade-in"
                                    >
                                      <Unlock size={11} />
                                      <span>تنزيل الباقة 🚀</span>
                                    </a>
                                  ) : status === 'pending_review' ? (
                                    <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl text-[10px] font-extrabold border border-amber-500/20 flex items-center gap-1 font-sans animate-pulse">
                                      <RefreshCw size={11} className="animate-spin" />
                                      <span>قيد المراجعة</span>
                                    </span>
                                  ) : status === 'rejected' ? (
                                    <button
                                      onClick={() => setActivePurchaseItem({ subjectId: sub.id, item: bundle as any })}
                                      className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                    >
                                      <span>مرفوض - أعد الطلب</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setActivePurchaseItem({ subjectId: sub.id, item: bundle as any })}
                                      className="px-3 py-1.5 bg-[#041B4D] text-[#D4A63D] font-black border border-[#D4A63D]/40 rounded-xl text-[10px] flex items-center gap-1 shadow-sm hover:scale-[1.03] transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      <Lock size={11} />
                                      <span>طلب فوري</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Paid Items */}
                    <div className="space-y-2 border-t border-gray-100 dark:border-slate-800 pt-3">
                      <p className="text-[11px] font-black text-slate-900 dark:text-white flex items-center gap-1">
                        <span>📄</span>
                        <span>الأعمال والملخصات المتاحة للطباعة والدراسة الفردية:</span>
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {paidSubjectsConfig[sub.id].items.map(item => {
                          const status = getPaymentStatus(sub.id, item.id);
                          return (
                            <div key={item.id} className="p-3 bg-white dark:bg-slate-900 border border-gray-150/60 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-2xs text-right">
                              <div className="space-y-0.5">
                                <h5 className="font-black text-xs text-slate-900 dark:text-white">{item.name}</h5>
                                <p className="text-[9px] text-gray-400 font-bold">
                                  {item.type === 'seminar' ? 'ملف سيمنار دراسي جاهز' : item.type === 'lab' ? 'تقرير معمل متكامل' : 'رغبة РГР كاملة بالحلول'}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-left font-sans flex flex-col justify-center shrink-0">
                                  {item.originalPrice && (
                                    <span className="text-[9px] text-gray-450 line-through leading-none font-bold block text-right">{item.originalPrice} RUB</span>
                                  )}
                                  <span className="font-sans font-black text-xs text-brand-gold block">{item.price} RUB</span>
                                </div>

                                {status === 'paid' ? (
                                  <a
                                    href={item.downloadUrl || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black flex items-center gap-1 shadow-xs cursor-pointer animate-fade-in"
                                  >
                                    <Unlock size={11} />
                                    <span>تحميل</span>
                                  </a>
                                ) : status === 'pending_review' ? (
                                  <span className="px-2.5 py-1.5 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-extrabold border border-amber-500/20 flex items-center gap-1 animate-pulse">
                                    <RefreshCw size={11} className="animate-spin" />
                                    <span>مراجعة</span>
                                  </span>
                                ) : status === 'rejected' ? (
                                  <button
                                    onClick={() => setActivePurchaseItem({ subjectId: sub.id, item })}
                                    className="px-2.5 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-[9px] font-black flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>إعادة إرسال</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setActivePurchaseItem({ subjectId: sub.id, item })}
                                    className="px-2.5 py-1.5 bg-[#041B4D] text-[#D4A63D] border border-brand-gold/30 rounded-lg text-[9px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Lock size={10} />
                                    <span>شراء</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard documents list for default courses */
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold text-[#041B4D] dark:text-brand-gold pb-1.5 flex items-center gap-1 text-right justify-end border-b border-gray-100 font-bold">
                      <span>دليل المذكرات العلمية والملفات المرجعية للمقرر الدراسي المعياري:</span>
                      <BookOpen size={13} className="text-brand-gold text-right" />
                    </p>
                    <div className="space-y-2">
                      {subLectures.map((lecture, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 border border-gray-150/40 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-start gap-2 max-w-[80%] text-right">
                            <span className="p-1 rounded bg-slate-100 text-[#041B4D] dark:bg-slate-800 dark:text-brand-gold mt-0.5 shrink-0">
                              <FileText size={12} />
                            </span>
                            <div className="text-right">
                              <p className="font-extrabold text-slate-800 dark:text-white">{lecture.title}</p>
                              <span className="text-[9px] text-gray-400 mt-1 block font-bold">مستند معتمد للمطالعة الذاتية</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setViewingLecture(lecture)}
                            className="px-3 py-1 bg-[#041B4D]/5 text-[#041B4D] hover:bg-[#041B4D] hover:text-white border border-[#041B4D]/10 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            عرض الملف
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SUBJECT INFORMATION */}
            {activeDetailTab === 'info' && (
              <div className="space-y-4 animate-fade-in text-right">
                {/* Description card */}
                <div className="bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-150/40 dark:border-slate-800 space-y-2">
                  <h4 className="font-black text-xs text-[#041B4D] dark:text-white">وصف المقرر الدراسي والمخطط المعتمد</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed">{infoDetails.desc}</p>
                </div>

                {/* Academic Goals card */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-150/60 dark:border-slate-800 space-y-2">
                  <h4 className="font-black text-xs text-[#041B4D] dark:text-white">الأهداف والمخرجات التعليمية المقررة</h4>
                  <ul className="text-[10px] text-gray-500 dark:text-gray-400 space-y-1.5 list-disc pr-4 font-bold">
                    {infoDetails.goals.map((goal, index) => (
                      <li key={index} className="leading-normal">{goal}</li>
                    ))}
                  </ul>
                </div>

                {/* Grading and weights card */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-150/60 dark:border-slate-800 space-y-2">
                  <h4 className="font-black text-xs text-[#041B4D] dark:text-white">تفاصيل التقييم وتوزيع الدرجات الأكاديمية</h4>
                  <div className="space-y-2 pt-1 font-bold">
                    {infoDetails.weights.map((weight, index) => (
                      <div key={index} className="flex items-center justify-between text-[10px] pb-1.5 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-gray-500 dark:text-gray-400">{weight.label}</span>
                        <span className="text-[#D4A63D]">{weight.ratio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SUBJECT REAL-TIME DISCUSSION BOARD */}
            {activeDetailTab === 'discussions' && (
              <div className="space-y-4 animate-fade-in text-right">
                {/* Banner message */}
                <div className="bg-[#041B4D]/5 dark:bg-[#041B4D]/25 p-3.5 rounded-2xl border border-[#041B4D]/10 text-[#041B4D] dark:text-brand-gold text-[10px] font-black leading-relaxed flex items-center gap-1.5">
                  <MessageSquare size={14} className="animate-pulse" />
                  <span>غرفة المناقشات والاستفسارات التفاعلية للمقرر الدراسي الجاري بمسؤولية أكاديمية 💬</span>
                </div>

                {/* Send custom message board */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-3 rounded-2xl shadow-2xs">
                  <label className="text-[9px] font-black text-gray-400 block pb-1">اطرح استفساراً أو بادر بمساعدة زملائك في المادة:</label>
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={newCourseComment}
                      onChange={(e) => setNewCourseComment(e.target.value)}
                      placeholder="اكتب رسالتك للمناقشة هنا..."
                      className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-850 border border-gray-150 dark:border-slate-800 rounded-xl text-xs text-right font-bold focus:outline-none focus:border-brand-gold select-text"
                    />
                    <button
                      onClick={handleAddCourseComment}
                      disabled={sendingComment || !newCourseComment.trim()}
                      className={`absolute bottom-2 left-2 p-1.5 rounded-full transition-all cursor-pointer ${
                        !newCourseComment.trim()
                          ? 'bg-gray-100 text-gray-300 dark:bg-slate-800 dark:text-slate-700'
                          : 'bg-[#041B4D] text-[#D4A63D] hover:bg-black'
                      }`}
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>

                {/* Real-time sync forum list */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {courseDiscussions.length > 0 ? (
                    courseDiscussions.map((msg) => {
                      const isLiked = localLikedIds.includes(msg.id);
                      return (
                        <div key={msg.id} className="p-3 bg-white dark:bg-slate-900 border border-gray-150/50 dark:border-slate-800/80 rounded-2xl shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            {/* Author info */}
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-[#041B4D] dark:text-brand-gold text-xs uppercase border border-gray-100 dark:border-slate-700">
                                {msg.authorName ? msg.authorName.slice(0, 2) : 'ط'}
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-black text-slate-950 dark:text-white leading-none">{msg.authorName}</span>
                                  <span className={`text-[8px] px-1 rounded-sm leading-none font-bold ${
                                    msg.authorRole === 'instructor'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                                      : msg.authorRole === 'moderator'
                                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400'
                                      : 'bg-gray-100 text-gray-650 dark:bg-slate-800 dark:text-gray-400'
                                  }`}>
                                    {msg.authorRole === 'instructor' ? 'محاضر' : msg.authorRole === 'moderator' ? 'مشرف' : 'طالب'}
                                  </span>
                                </div>
                                <span className="text-[8px] text-gray-400 font-bold block mt-0.5">{msg.timestamp || 'الآن'}</span>
                              </div>
                            </div>

                            {/* Like interactive hearts */}
                            <button
                              onClick={() => handleLikeComment(msg.id, msg.likes || 0)}
                              className={`flex items-center gap-1 py-1 px-2 rounded-lg border text-[9px] font-black transition-all cursor-pointer ${
                                isLiked
                                  ? 'bg-rose-50 border-rose-100 text-rose-500'
                                  : 'bg-slate-50 border-gray-100 text-gray-400 dark:bg-slate-800 dark:border-slate-700'
                              }`}
                            >
                              <span>{msg.likes || 0}</span>
                              <span>❤️</span>
                            </button>
                          </div>

                          {/* Message content text */}
                          <p className="text-[10px] text-gray-600 dark:text-gray-300 font-bold leading-relaxed pr-1 whitespace-pre-line text-right">
                            {msg.content}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-gray-400 font-bold text-xs bg-slate-50 rounded-2xl border border-gray-100 dark:bg-slate-900/40 dark:border-slate-800/40">
                      قناتنا الدراسية شاغرة حالياً... ابدأ بطرح أول سؤال لزملائك! ✏️
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC SUBMISSION OR VIEWER POPUPS */}
          {selectedModel && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-right">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 border border-brand-gold/20 shadow-2xl relative space-y-4 font-sans select-none">
                <button 
                  onClick={handleCloseModel}
                  className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-brand-dark dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-550/10 text-brand-gold flex items-center justify-center shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-850 dark:text-white">
                      النموذج الأكاديمي العملي رقم {selectedModel.modelNum}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold font-mono">
                      {selectedModel.subjectId === 'programming' ? 'Лабораторная работа по Программированию' : 'Лабораторная работа по БЖД'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5 pt-2 text-xs">
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-1">
                    <p className="font-extrabold text-[#041B4D] dark:text-brand-gold leading-normal text-right">
                      {selectedModel.subjectId === 'programming' 
                        ? `موضوع البحث باللغة الروسية: Лабораторная работа №${selectedModel.modelNum} - Проектирование алгоритмов и базовые структуры данных.`
                        : `موضوع البحث باللغة الروسية: Лабораторная работа №${selectedModel.modelNum} - Обеспечение жизнедеятельности и охрана труда на предприятии.`
                      }
                    </p>
                    <p className="text-[10px] text-gray-400 italic font-bold">
                      التوجيه: يرجى كتابة الردود أو رفع الإجابة الأكاديمية المطلوبة لنفس الرقم.
                    </p>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <label className="text-[10px] font-black text-slate-500 block">إدخال الحل الأكاديمي المكتوب (إلزامي للتقديم)</label>
                    <textarea
                      rows={3}
                      value={labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`] || ''}
                      onChange={(e) => setLabAnswers({
                        ...labAnswers,
                        [`${selectedModel.subjectId}-${selectedModel.modelNum}`]: e.target.value
                      })}
                      placeholder="اكتب تفسيرك للحل أو الملاحظات الأكاديمية هنا..."
                      className="w-full bg-white dark:bg-slate-850 border rounded-xl text-xs p-2.5 text-right font-medium focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSubmitLab(`${selectedModel.subjectId}-${selectedModel.modelNum}`)}
                      disabled={!labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`]?.trim()}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                        !labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`]?.trim()
                          ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 cursor-not-allowed'
                          : 'bg-[#041B4D] text-white hover:bg-black'
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

          {/* Documentary Video viewer */}
          {viewingLecture && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in text-right" style={{ direction: 'rtl' }}>
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-xl ${viewingLecture.type === 'video' ? 'bg-amber-500/10 text-amber-500' : 'bg-brand-blue/10 text-brand-blue'}`}>
                      {viewingLecture.type === 'video' ? <Video size={16} /> : <FileText size={16} />}
                    </span>
                    <div className="text-right">
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
                            return (
                              <div className="w-full h-[550px] rounded-2xl overflow-hidden border border-gray-250 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-lg flex flex-col">
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
                        <div className="w-full h-[550px] rounded-2xl overflow-hidden border border-gray-250 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-lg flex flex-col">
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
                      <div className="w-full mt-3.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 text-center space-y-2">
                        <p className="text-[11px] text-gray-400 font-bold font-sans">
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
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-150 dark:border-slate-800/80 shadow-md space-y-4 text-slate-705 dark:text-gray-100">
                      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center font-extrabold text-lg">
                          📖
                        </div>
                        <div className="text-right">
                          <h4 className="font-extrabold text-sm text-[#041B4D] dark:text-white">ملخص دراسي ومطالعة تفاعلية</h4>
                          <p className="text-[10px] text-gray-400 font-bold">المستند العلمي المطلوب للبرنامج الدراسي الجاري</p>
                        </div>
                      </div>
                      <div className="space-y-3 leading-relaxed text-xs">
                        <p className="font-extrabold text-[#041B4D] dark:text-brand-gold">
                          أهلاً بك يا زميل المعرفة الأكاديمية! هذا المستند مفعم بالمعلومات الأكاديمية المنسقة للدروس النظرية والاستعداد للمهارات المعملية الحالية.
                        </p>
                        <div className="bg-gray-50 dark:bg-slate-850 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1.5">
                          <p className="font-bold text-[11px] text-gray-700 dark:text-gray-200">📌 الأهداف الأكاديمية والمخرجات التعليمية المقررة:</p>
                          <ul className="list-disc pr-4 space-y-1 font-bold text-gray-400">
                            <li>فهم ومطالعة المحتوى الدراسي الموزع تحت إشراف هيئة التدريس الفيدرالية.</li>
                            <li>اكتساب المهارات والحلول الضرورية لتحضير نماذجك التفاعلية.</li>
                            <li>الاستعداد الكامل وتثبيت المفاهيم للاجتياز الناجح لأي اختبار قصير أو دوري.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="text-[10px] text-gray-400 font-bold font-sans">
                          حالة المستند: <span className="text-emerald-500">✓ معتمد رسمياً للدراسة</span>
                        </div>
                        <button 
                          onClick={() => setViewingLecture(null)}
                          className="px-4 py-1.5 bg-[#041B4D] hover:bg-black text-white rounded-xl text-[10px] font-black cursor-pointer"
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

          {/* Checkout / Manual payment popup */}
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
  }

  const continueSubject = subjects.find(s => s.completedLectures > 0 && s.completedLectures < s.lecturesCount) || subjects[0];

  return (
    <div className="bg-[#F8F9FB] dark:bg-[#050d18] min-h-screen text-slate-800 dark:text-gray-100 p-4 pb-24 text-right duration-200 font-sans max-w-md mx-auto space-y-5" dir="rtl">
      {/* BRANDING HEADER */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#041B4D] text-white flex items-center justify-center font-black text-xs shadow-sm border border-brand-gold/15">
            ب.ع
          </div>
          <div className="text-right">
            <h1 className="text-xs font-black text-[#041B4D] dark:text-white leading-none">أكاديمية بن عون</h1>
            <span className="text-[9px] text-brand-gold font-bold uppercase tracking-wider block mt-1">Bin Aoun Academy</span>
          </div>
        </div>
        <div className="text-left">
          <span className="text-[10px] bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full font-bold text-gray-400 border border-gray-100 dark:border-slate-800">
            البوابة الدراسية المعتمدة
          </span>
        </div>
      </div>

      {/* CONTINUE LEARNING SECTION */}
      {continueSubject && (
        <div className="bg-slate-50/70 dark:bg-slate-900/30 rounded-3xl p-4 border border-gray-100 dark:border-slate-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-[#041B4D] dark:text-brand-gold">
              <Sparkles size={13} className="text-brand-gold animate-pulse" />
              <span>متابعة التعلم</span>
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
              {Math.round((continueSubject.completedLectures / continueSubject.lecturesCount) * 100)}% مكتمل
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-gray-150 relative">
              <img 
                src={getSubjectImage(continueSubject.id)} 
                alt={continueSubject.nameAr}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex-1 min-w-0 text-right">
              <h4 className="font-extrabold text-xs text-[#111111] dark:text-white truncate">{continueSubject.nameAr}</h4>
              <p className="text-[9px] text-gray-400 font-bold truncate mt-0.5">المحاضر: {getSubjectTeacher(continueSubject.id)}</p>
            </div>

            <button
              onClick={() => handleToggleExpand(continueSubject.id)}
              className="px-3 py-1.5 bg-[#041B4D] hover:bg-black text-white text-[10px] font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>استئناف</span>
              <ChevronLeft size={11} className="rtl:rotate-180" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-gray-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-brand-gold h-full rounded-full transition-all duration-300"
                style={{ width: `${(continueSubject.completedLectures / continueSubject.lecturesCount) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[8px] text-gray-400 font-bold">
              <span>أنهيت {continueSubject.completedLectures} من {continueSubject.lecturesCount} محاضرات معتمدة</span>
              <span className="text-emerald-500">نشط الآن</span>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH INPUT */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-450 dark:text-gray-500">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مادة دراسية أو مقرر..."
          className="w-full pl-4 pr-10 py-2.5 bg-[#F8FAFC] dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-right font-bold shadow-xs select-text animate-fade-in"
        />
      </div>

      {/* CATEGORY FILTERS */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar select-none text-right" style={{ direction: 'rtl' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedFilter(cat.id)}
            className={`px-4 py-2 rounded-2xl text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${
              selectedFilter === cat.id
                ? 'bg-[#041B4D] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-gray-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-gray-300'
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Materials List */}
      <div className="space-y-4">
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
                className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-150/60 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all duration-300 flex flex-col space-y-3 pb-3"
              >
                {/* Course Image Header with rating */}
                <div className="relative h-32 w-full overflow-hidden">
                  <img 
                    src={getSubjectImage(sub.id)} 
                    alt={sub.nameAr}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.05]"
                    referrerPolicy="no-referrer"
                  />
                  {/* Dark Gradient bottom cover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Floating rating badge */}
                  <div className="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-md border border-gray-100/10 z-10">
                    <Star size={11} className="fill-amber-400 stroke-amber-400 shrink-0" />
                    <span className="text-[10px] font-black text-gray-800 dark:text-white">{getSubjectRating(sub.id).toFixed(1)}</span>
                  </div>

                  {/* Floating count lectures badge */}
                  <div className="absolute bottom-3 right-3 bg-[#041B4D]/85 backdrop-blur-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1 text-white z-10">
                    <span className="text-[9px] font-bold">{sub.lecturesCount} محاضرات معتمدة</span>
                  </div>
                </div>

                {/* Card content text body */}
                <div className="px-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-extrabold text-xs sm:text-sm text-[#041B4D] dark:text-white leading-snug">
                      {sub.nameAr}
                    </h3>
                    <span className="text-[9px] font-extrabold text-[#D4A63D] bg-amber-500/10 px-2 py-0.5 rounded-lg whitespace-nowrap">
                      % {progressPct} إنجاز
                    </span>
                  </div>

                  {/* Teacher line */}
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400">
                    <UserIcon size={12} className="shrink-0" />
                    <span className="text-[10px] font-bold">المحاضر: {getSubjectTeacher(sub.id)}</span>
                  </div>

                  {/* Micro progress line */}
                  <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-gold h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Action trigger button */}
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-[9px] text-gray-400 font-extrabold">منصة بن عون</span>
                    <button 
                      onClick={() => handleToggleExpand(sub.id)}
                      className="px-3.5 py-1.5 bg-[#041B4D] hover:bg-black text-white text-[10px] font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'إغلاق التفاصيل' : 'دراسة وتصفح المادة'}</span>
                      {isExpanded ? <ChevronDown size={11} /> : <ChevronLeft size={11} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                  <div className="bg-gray-50/60 border-t border-gray-100 px-4 py-3.5 dark:bg-slate-850 dark:border-slate-800 space-y-4 text-right">
                    
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
                            className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
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
                              className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
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
                            className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
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
                                className="text-[10px] font-bold text-brand-blue hover:text-brand-gold bg-white border border-gray-150 px-2 py-0.5 rounded dark:bg-slate-800 dark:border-slate-700"
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
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-155 text-gray-400 space-y-2 dark:bg-slate-900 dark:border-slate-805">
            <BookOpen size={30} className="mx-auto text-gray-300 animate-pulse" />
            <p className="text-sm font-bold">لا توجد مواد تطابق خيارات البحث الحالية</p>
            <p className="text-xs">يرجى تجربة فلتر آخر أو كتابة كلمة مفتاحية بديلة للبحث.</p>
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

