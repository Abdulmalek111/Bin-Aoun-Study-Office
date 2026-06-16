import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronDown, 
  CheckCircle2, 
  ChevronRight, 
  BookOpen, 
  Video, 
  FileText, 
  Sparkles, 
  Send, 
  GraduationCap, 
  X, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  QrCode, 
  AlertCircle, 
  RefreshCw, 
  Star, 
  User as UserIcon, 
  Play, 
  ArrowDownToLine, 
  Clock, 
  Users, 
  MessageSquare,
  Award,
  ThumbsUp,
  Download
} from 'lucide-react';
import { Subject, User } from '../types';
import SubjectIcon from './SubjectIcon';
import { db, safeQuery, safeWhere, safeOnSnapshot } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { paidSubjectsConfig, PaidWorkItem } from '../data';
import PurchaseModal from './PurchaseModal';

// High-quality subject-specific cover illustration tags
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
    case 'physics': return 'أ. د. سيرجي سميرنوف';
    case 'chemistry': return 'د. يلينا بتروفا';
    case 'math': return 'أ. د. أليكسي نيكولايف';
    case 'programming': return 'م. عبد الملك بن عون';
    case 'algorithms': return 'د. فلاديمير بيتروف';
    case 'nanocad': return 'م. محمد بن عون';
    case 'english': return 'أ. تاتيانا سوبوليفا';
    case 'russian': return 'د. ناتاليا بافلوفا';
    case 'history': return 'أ. د. ديمتري رومانوف';
    case 'sports': return 'م. بافيل كوزلوف';
    default: return 'أكاديمية بن عون';
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
  { id: 'math', title: 'الرياضيات' },
  { id: 'physics', title: 'الفيزياء' },
  { id: 'chemistry', title: 'الكيمياء' },
  { id: 'programming', title: 'البرمجة' },
  { id: 'nanocad', title: 'تكنولوجيا الرسم' },
  { id: 'russian', title: 'اللغات' }
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
  const [expandedSubject, setExpandedSubject] = useState<string | null>('physics');

  // Sub-tabs configuration state: 'lectures' | 'seminar' | 'paid'
  const [subTabs, setSubTabs] = useState<Record<string, 'lectures' | 'seminar' | 'paid'>>({});
  
  // Real-time payments & purchases for current student
  const [payments, setPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  // Load user data dynamically
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

  // Synchronise discussions in Real-time
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
    const matchesChip = selectedFilter === 'all' || 
                        sub.id === selectedFilter || 
                        (selectedFilter === 'russian' && (sub.id === 'russian' || sub.id === 'english' || sub.id === 'history')) ||
                        (selectedFilter === 'programming' && (sub.id === 'programming' || sub.id === 'algorithms' || sub.id === 'safety'));
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
    setSelectedModel(null);
  };

  return (
    <div className="min-h-screen bg-white transition-colors duration-300 select-none pb-24" style={{ direction: 'rtl' }}>
      
      {/* HEADER SECTION - Beautiful, bold, and executive */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="space-y-1 text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4A947]/10 text-[#0B1B3F] rounded-full text-xs font-black border border-[#D4A947]/20">
              <Sparkles size={13} className="text-[#D4A947]" />
              <span>المقررات الأكاديمية والوثائق المرجعية الرسمية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B1B3F] tracking-tight mt-1">
              منهج بن عون الأكاديمي
            </h1>
            <p className="text-xs sm:text-sm text-[#0B1B3F]/80 font-bold">
              استكشف المحاضرات الجاهزة والمستندات المطابقة، وحل الواجبات، وتابع تقدمك خطوة بخطوة.
            </p>
          </div>
        </div>

        {/* SEARCH AND FILTERING GRID */}
        <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Categories Horizontal Slider */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedFilter(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 shrink-0 border whitespace-nowrap cursor-pointer ${
                    isActive 
                      ? 'bg-[#0B1B3F] text-[#D4A947] border-[#0B1B3F] shadow-sm ring-1 ring-[#D4A947]/30' 
                      : 'bg-white text-[#0B1B3F] border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat.title}
                </button>
              );
            })}
          </div>

          {/* Styled search bar - Day Mode white, explicitly clean */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              dir="rtl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مادة أو بروتوكول معملي..."
              className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-[#0B1B3F] font-bold placeholder-gray-500 focus:outline-none focus:border-[#D4A947] focus:ring-1 focus:ring-[#D4A947] transition-all"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          </div>

        </div>
      </div>

      {/* CORE SUBJECTS GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {filteredSubjects.length === 0 ? (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl">
            <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
            <h3 className="font-extrabold text-black text-sm">لم يتم العثور على مقررات مطابقة للبحث</h3>
            <p className="text-xs text-gray-500 mt-1">يرجى التحقق من الكلمة المدخلة وتجربة عبارة أخرى.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((sub) => {
              const isExpanded = expandedSubject === sub.id;
              const progressPct = sub.lecturesCount > 0 ? Math.round((sub.completedLectures / sub.lecturesCount) * 100) : 0;
              const teacher = getSubjectTeacher(sub.id);
              const rating = getSubjectRating(sub.id);
              const hours = getSubjectHours(sub.id);
              const students = getSubjectStudentsCount(sub.id);

              return (
                <div 
                  key={sub.id}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                    isExpanded 
                      ? 'border-[#D4A947] ring-1 ring-[#D4A947] shadow-lg' 
                      : 'border-gray-200 hover:border-[#0B1B3F] hover:shadow-md'
                  }`}
                >
                  
                  {/* Decorative Cover Illustration */}
                  <div className="relative h-32 w-full overflow-hidden bg-gray-50 shrink-0">
                    <img 
                      src={getSubjectImage(sub.id)} 
                      alt={sub.nameAr}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent"></div>
                    
                    {/* Subject Icon & Title Overlay */}
                    <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-[#D4A947]">
                          <SubjectIcon type={sub.iconType} size={16} />
                        </div>
                        <div className="text-right">
                          <h3 className="font-black text-xs text-white drop-shadow-sm">{sub.nameAr}</h3>
                          <p className="text-[9px] text-gray-300 font-bold font-mono tracking-wide">{sub.nameEn}</p>
                        </div>
                      </div>
                      
                      {/* Premium Badge */}
                      <span className="text-[8px] bg-[#D4A947] text-black px-1.5 py-0.5 rounded font-black">
                        أكاديمي
                      </span>
                    </div>
                  </div>

                  {/* Subject Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    
                    {/* Progress Indicator Ring & Percentage */}
                    <div className="flex items-center justify-between bg-[#F8F9FB] p-2.5 rounded-2xl border border-gray-200">
                      <div className="flex items-center gap-2.5">
                        {/* Circular Progress (pure elegant SVG) */}
                        <div className="relative w-10 h-10 shrink-0">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="20" cy="20" r="16" fill="transparent" stroke="#E2E8F0" strokeWidth="4"></circle>
                            <circle 
                              cx="20" 
                              cy="20" 
                              r="16" 
                              fill="transparent" 
                              stroke="#D4A947" 
                              strokeWidth="4"
                              strokeDasharray={`${2 * Math.PI * 16}`}
                              strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPct / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black font-mono text-[#0B1B3F]">
                            {progressPct}%
                          </span>
                        </div>
                        <div className="text-right">
                          <h4 className="font-black text-xs text-[#0B1B3F]">تقدم التعلم</h4>
                          <p className="text-[9px] text-[#0B1B3F]/60 font-bold">اكتمل {sub.completedLectures} من {sub.lecturesCount} محاضرات</p>
                        </div>
                      </div>

                      <span className="text-[9px] font-black text-[#0B1B3F] bg-[#D4A947]/10 border border-[#D4A947]/20 px-2 py-1 rounded-lg">
                        {hours} ساعة معتمدة
                      </span>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 text-right">
                      <div className="flex items-center gap-1.5 text-xs text-[#0B1B3F] font-semibold">
                        <Award size={13} className="text-[#D4A947] shrink-0" />
                        <span className="truncate">{teacher}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#0B1B3F] font-semibold justify-end">
                        <span className="font-mono text-[#0B1B3F]/60">({students} طالب)</span>
                        <Users size={13} className="text-gray-400 shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#0B1B3F] font-semibold">
                        <Star size={12} className="text-[#D4A947] fill-[#D4A947]" />
                        <span className="font-mono">{rating.toFixed(1)} / 5.0</span>
                      </div>
                    </div>

                    {/* Toggle button */}
                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-[8px] text-[#0B1B3F]/60 font-bold uppercase tracking-wider">Ben Aoun Academy</span>
                      <button 
                        onClick={() => handleToggleExpand(sub.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                          isExpanded 
                            ? 'bg-[#0B1B3F] text-[#D4A947] border border-[#0B1B3F]' 
                            : 'bg-[#D4A947]/10 text-[#0B1B3F] hover:bg-[#D4A947]/20 border border-[#D4A947]/20'
                        }`}
                      >
                        <span>{isExpanded ? 'إغلاق التفاصيل' : 'استعراض المادة'}</span>
                        <ChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} size={14} />
                      </button>
                    </div>

                  </div>

                  {/* ACCORDION EXPANSION SHEETS (When Active) */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-gray-100 bg-white space-y-4">
                      
                      {/* Sub-tabs header switches */}
                      <div className="flex gap-2 p-1 bg-gray-50 border border-gray-200 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setActiveDetailTab('info')}
                          className={`flex-1 py-2 text-[10px] font-black transition-all rounded-xl cursor-pointer ${
                            activeDetailTab === 'info' 
                              ? 'bg-[#0B1B3F] text-[#D4A947] font-black border border-[#0B1B3F] shadow-xs' 
                              : 'text-gray-500 hover:text-[#0B1B3F] hover:bg-white/55'
                          }`}
                        >
                          عن المقرر
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setActiveDetailTab('lectures')}
                          className={`flex-1 py-2 text-[10px] font-black transition-all rounded-xl cursor-pointer ${
                            activeDetailTab === 'lectures' 
                              ? 'bg-[#0B1B3F] text-[#D4A947] font-black border border-[#0B1B3F] shadow-xs' 
                              : 'text-gray-500 hover:text-[#0B1B3F] hover:bg-white/55'
                          }`}
                        >
                          المحاضرات والمستندات
                        </button>

                        {(sub.id === 'safety' || sub.id === 'programming' || paidSubjectsConfig[sub.id]) && (
                          <button
                            type="button"
                            onClick={() => setActiveDetailTab('files')}
                            className={`flex-1 py-2 text-[10px] font-black transition-all rounded-xl cursor-pointer ${
                              activeDetailTab === 'files' 
                                ? 'bg-[#0B1B3F] text-[#D4A947] font-black border border-[#0B1B3F] shadow-xs' 
                                : 'text-gray-500 hover:text-[#0B1B3F] hover:bg-white/55'
                            }`}
                          >
                            الرغبة والتقارير الروسية
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveDetailTab('discussions')}
                          className={`flex-1 py-2 text-[10px] font-black transition-all rounded-xl cursor-pointer ${
                            activeDetailTab === 'discussions' 
                              ? 'bg-[#0B1B3F] text-[#D4A947] font-black border border-[#0B1B3F] shadow-xs' 
                              : 'text-gray-550 hover:text-[#0B1B3F] hover:bg-white/55'
                          }`}
                        >
                          المناقشات ({courseDiscussions.length})
                        </button>
                      </div>

                      {/* TAB COLUMN CONTENT 1: COURSE INFO AND ASSESSMENT METRICS */}
                      {activeDetailTab === 'info' && (
                        <div className="space-y-4 animate-fade-in text-right">
                          <p className="text-xs text-[#0B1B3F]/90 font-bold leading-relaxed">
                            {getSubjectFullDescription(sub.id).desc}
                          </p>

                          {/* Academic Goals list */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-[#D4A947]">🎯 المخرجات التعليمية والأهداف:</span>
                            <ul className="space-y-1 text-xs text-[#0B1B3F] font-bold pr-2">
                              {getSubjectFullDescription(sub.id).goals.map((goal, idx) => (
                                <li key={idx} className="flex gap-1.5 items-start">
                                  <span className="text-[#D4A947] mt-0.5 shrink-0">✓</span>
                                  <span>{goal}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Assessment Ratios table */}
                          <div className="p-3 bg-gray-55 border border-gray-200 rounded-2xl space-y-2">
                            <h4 className="text-[10px] font-black text-[#0B1B3F]">⚙ تمثيل النسبة المئوية للتقييم الفيدرالي (Рейтинг):</h4>
                            <div className="space-y-1 text-xs">
                              {getSubjectFullDescription(sub.id).weights.map((w, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-gray-150 pb-1 last:border-0 last:pb-0">
                                  <span className="font-semibold text-[#0B1B3F]">{w.label}</span>
                                  <span className="font-black text-[#D4A947] font-mono">{w.ratio}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB COLUMN CONTENT 2: CORE DOCUMENTS & LECTURES LIST */}
                      {activeDetailTab === 'lectures' && (
                        <div className="space-y-2.5 animate-fade-in text-right">
                          {(subjectLecturesMap[sub.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center py-4">لم يتم رفع مستندات تدريس رسمية لهذه المادة حتى الآن.</p>
                          ) : (
                            (subjectLecturesMap[sub.id] || []).map((lecture, lIdx) => {
                              const isCompleted = lIdx < sub.completedLectures;
                              return (
                                <div 
                                  key={lIdx} 
                                  className={`p-3 bg-white border rounded-2xl flex items-center justify-between gap-3 ${
                                    isCompleted ? 'border-green-150 bg-green-50/10' : 'border-gray-200 hover:border-[#D4A947]'
                                  }`}
                                >
                                  {/* Completion checkpoint switcher */}
                                  <button
                                    onClick={() => onToggleLecture(sub.id, lIdx)}
                                    className={`p-1.5 rounded-full transition-colors shrink-0 cursor-pointer ${
                                      isCompleted 
                                        ? 'bg-[#0B1B3F] text-[#D4A947]' 
                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-300'
                                    }`}
                                  >
                                    <CheckCircle2 size={15} />
                                  </button>

                                  <div className="flex-1 min-w-0 pr-1">
                                    <p className={`text-xs font-black leading-snug truncate ${isCompleted ? 'text-gray-400 line-through' : 'text-[#0B1B3F]'}`}>
                                      {lecture.title}
                                    </p>
                                    <div className="flex gap-2 items-center text-[9px] text-gray-550 font-semibold mt-0.5 justify-end">
                                      <span>{lecture.duration}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1 text-[#0B1B3F]/60">
                                        {lecture.type === 'video' ? 'شرح فيديو' : 'مرجع ملف PDF'}
                                        {lecture.type === 'video' ? <Video size={10} /> : <FileText size={10} />}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Direct preview action button */}
                                  <button
                                    onClick={() => setViewingLecture({ title: lecture.title, type: lecture.type, url: lecture.url })}
                                    className="p-1.5 rounded-xl bg-gray-50 border border-gray-200 text-[#0B1B3F] hover:bg-[#D4A947]/10 hover:border-[#D4A947]/30 cursor-pointer shadow-xs transition-colors"
                                  >
                                    {lecture.type === 'video' ? <Play size={11} className="text-[#D4A947]" /> : <Download size={11} className="text-[#0B1B3F]" />}
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* TAB COLUMN CONTENT 3: INTERACTIVE LABS & PAID SOLVED MODELS */}
                      {activeDetailTab === 'files' && (
                        <div className="space-y-4 animate-fade-in text-right">
                          
                          {/* 1-25 Solved Models Selection list */}
                          {(sub.id === 'safety' || sub.id === 'programming') && (
                            <div className="space-y-3">
                              <div className="bg-[#0B1B3F]/95 border border-[#D4A947]/30 p-3 rounded-2xl flex items-center gap-2 text-[#D4A947] text-[10px] font-black leading-relaxed shadow-sm">
                                <Sparkles size={14} className="shrink-0 text-[#D4A947] animate-bounce" />
                                <span>الندوات المختبرية العلمية Семинары и Лабораторные работы (النماذج 1 - 25)</span>
                              </div>

                              <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 max-h-40 overflow-y-auto p-1 bg-gray-55 rounded-2xl border border-gray-200">
                                {Array.from({ length: 25 }, (_, i) => {
                                  const number = i + 1;
                                  const key = `${sub.id}-${number}`;
                                  const isSubmitted = labSubmitted[key];
                                  return (
                                    <button
                                      key={number}
                                      onClick={() => handleOpenModel(sub.id, number)}
                                      className={`p-2 rounded-xl text-center flex flex-col justify-between items-center aspect-square border transition-all cursor-pointer ${
                                        isSubmitted 
                                          ? 'bg-[#0B1B3F] text-[#D4A947] border-[#0B1B3F]' 
                                          : 'bg-white border-gray-200 text-[#0B1B3F] hover:border-[#D4A947]'
                                      }`}
                                    >
                                      <span className="font-extrabold text-[11px]">{number}</span>
                                      <span className={`text-[7px] font-bold ${isSubmitted ? 'text-[#D4A947]' : 'text-gray-400'}`}>
                                        {isSubmitted ? 'تم الحل' : 'نموذج'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-center text-[#0B1B3F] font-extrabold">
                                ✓ اضغط على أي نموذج لمطالعة السؤال وتوثيق الرفرفة لإجراء المراجعة.
                              </p>
                            </div>
                          )}

                          {/* Paid solutions grid files (Downloaded after Sberbank trigger) */}
                          {paidSubjectsConfig[sub.id] !== undefined && (
                            <div className="space-y-3 pt-2">
                              <h4 className="text-[11px] font-black bg-[#0B1B3F] text-[#D4A947] border border-[#D4A947]/30 px-3 py-1.5 rounded-xl inline-block">الملفات الجاهزة وحلول الرغبات لطلاب الدفع البسيط:</h4>
                              
                              {/* Bundles highlight discount */}
                              {paidSubjectsConfig[sub.id].bundles && paidSubjectsConfig[sub.id].bundles.map((bundle) => {
                                const status = getPaymentStatus(sub.id, bundle.id);
                                return (
                                  <div 
                                    key={bundle.id} 
                                    className="p-3 bg-yellow-50/45 border border-[#D4A947]/45 rounded-2xl flex items-center justify-between gap-3"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs">📚</span>
                                        <h4 className="font-extrabold text-xs text-[#0B1B3F]">{bundle.name}</h4>
                                        <span className="text-[8px] bg-[#0B1B3F] text-[#D4A947] px-1.5 py-0.5 rounded font-black">حزمة شاملة</span>
                                      </div>
                                      <p className="text-[9px] text-[#0B1B3F]/85 font-black">
                                        تتضمن: {bundle.itemIds.map(id => paidSubjectsConfig[sub.id].items.find(i => i.id === id)?.name || id).join(' ، ')}
                                      </p>
                                    </div>
                                    
                                    {/* Action switcher */}
                                    {status === 'paid' ? (
                                      <a 
                                        href={bundle.downloadUrl || '#'} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-[#0B1B3F] text-white rounded-xl text-[10px] font-black hover:bg-[#11234F] flex items-center gap-1 transition-colors border border-[#D4A947]/30"
                                      >
                                        <ArrowDownToLine size={10} className="text-[#D4A947]" />
                                        <span>تحميل الملف</span>
                                      </a>
                                    ) : status === 'pending_review' ? (
                                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-black animate-pulse">قيد المراجعة</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setActivePurchaseItem({ subjectId: sub.id, item: { id: bundle.id, name: bundle.name, price: bundle.price, type: 'bundle', downloadUrl: bundle.downloadUrl } })}
                                        className="px-3 py-1.5 bg-[#0B1B3F] text-[#D4A947] rounded-xl text-[10px] font-black hover:bg-[#11234F] border border-[#D4A947]/20 transition-all"
                                      >
                                        شراء ({bundle.price} RUB)
                                      </button>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Single items list */}
                              <div className="space-y-1.5 font-sans">
                                {paidSubjectsConfig[sub.id].items.map((item) => {
                                  const status = getPaymentStatus(sub.id, item.id);
                                  return (
                                    <div key={item.id} className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-3 hover:border-[#D4A947]/50 transition-colors">
                                      <div className="space-y-0.5">
                                        <h5 className="font-black text-xs text-[#0B1B3F]">{item.name}</h5>
                                        <p className="text-[8.5px] text-[#0B1B3F]/70 font-bold block">
                                          {item.type === 'seminar' ? 'ملف سيمنار أكاديمي متكامل بالكامل' : item.type === 'lab' ? 'تقرير معمل جاهز' : 'حل الرغبة (PГР) الجامعية المعتمدة لـ ' + sub.nameAr}
                                        </p>
                                      </div>

                                      {/* Checkout controls */}
                                      {status === 'paid' ? (
                                        <a 
                                          href={item.downloadUrl || '#'} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="px-3 py-1.5 bg-[#0B1B3F] text-white rounded-xl text-[9px] font-black hover:bg-[#11234F] flex items-center gap-1 cursor-pointer"
                                        >
                                          <ArrowDownToLine size={10} className="text-[#D4A947]" />
                                          <span>تحميل</span>
                                        </a>
                                      ) : status === 'pending_review' ? (
                                        <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-bold">قيد المراجعة</span>
                                      ) : (
                                        <button
                                          onClick={() => setActivePurchaseItem({ subjectId: sub.id, item })}
                                          className="px-3 py-1.5 bg-[#0B1B3F] text-[#D4A947] border border-[#D4A947]/20 hover:bg-[#11234F] rounded-xl text-[10px] font-black cursor-pointer shadow-xs transition-colors shrink-0"
                                        >
                                          شراء {item.price} RUB
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                            </div>
                          )}

                        </div>
                      )}

                      {/* TAB COLUMN CONTENT 4: COURSE REAL-TIME DISCUSSIONS */}
                      {activeDetailTab === 'discussions' && (
                        <div className="space-y-3.5 animate-fade-in text-right">
                          
                          {/* Messages block slider container */}
                          <div className="space-y-2.5 max-h-56 overflow-y-auto p-2 bg-gray-55 rounded-2xl border border-gray-200">
                            {courseDiscussions.length === 0 ? (
                              <p className="text-xs text-gray-400 italic text-center py-6">كن أول من يثري النقاش في مقرر {sub.nameAr}!</p>
                            ) : (
                              courseDiscussions.map((msg) => {
                                const isLiked = localLikedIds.includes(msg.id);
                                return (
                                  <div key={msg.id} className="p-3 bg-white border border-gray-150 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <div className="flex items-center gap-1">
                                        <button 
                                          type="button"
                                          onClick={() => handleLikeComment(msg.id, msg.likes || 0)}
                                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border transition ${
                                            isLiked 
                                              ? 'bg-[#0B1B3F] text-[#D4A947] border-[#0B1B3F]' 
                                              : 'bg-white hover:bg-gray-50 text-gray-400 border-gray-200'
                                          }`}
                                        >
                                          <ThumbsUp size={9} />
                                          <span className="font-mono text-[8px]">{msg.likes || 0}</span>
                                        </button>
                                        <span className="text-gray-400">({msg.timestamp || 'الآن'})</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-[#0B1B3F]">{msg.authorName}</span>
                                        <div className="p-1 bg-gray-100 rounded-full text-[#0B1B3F]">
                                          <UserIcon size={10} />
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-xs text-[#0B1B3F]/90 font-bold pt-1 leading-relaxed">{msg.content}</p>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Send box */}
                          <div className="flex gap-2.5">
                            <input
                              type="text"
                              value={newCourseComment}
                              onChange={(e) => setNewCourseComment(e.target.value)}
                              placeholder={`اكتب سؤالك أو ردك هنا للمشاركة...`}
                              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B1B3F] focus:outline-none focus:border-[#D4A947] focus:ring-1 focus:ring-[#D4A947]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddCourseComment();
                              }}
                            />
                            <button
                              type="button"
                              disabled={sendingComment || !newCourseComment.trim()}
                              onClick={handleAddCourseComment}
                              className="px-3.5 py-2 bg-[#0B1B3F] text-[#D4A947] border border-[#D4A947]/30 rounded-xl hover:bg-[#1B2A57] text-xs font-black shrink-0 cursor-pointer disabled:opacity-50 transition"
                            >
                              إرسال
                            </button>
                          </div>

                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RENDER MODEL POPUP DIALOG DETAIL FLOW */}
      {selectedModel && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-right"
          style={{ direction: 'rtl' }}
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-gray-200 shadow-2xl relative space-y-4">
            
            {/* Close button */}
            <button 
              onClick={handleCloseModel}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black cursor-pointer"
            >
              <X size={14} />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-2.5 pt-1.5">
              <div className="w-9 h-9 rounded-xl bg-[#D4A947]/10 text-black flex items-center justify-center shrink-0">
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-black">
                  النموذج الأكاديمي رقم {selectedModel.modelNum}
                </h3>
                <p className="text-[10px] text-gray-400 font-extrabold font-mono leading-none mt-0.5">
                  {selectedModel.subjectId === 'programming' ? 'Лабораторная по Программированию' : 'Лабораторная по БЖД'}
                </p>
              </div>
            </div>

            {/* Content text */}
            <div className="space-y-4 text-xs pt-1">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <p className="font-extrabold text-black leading-normal">
                  {selectedModel.subjectId === 'programming' 
                    ? `موضوع البحث باللغة الروسية: Лабораторная работа №${selectedModel.modelNum} - Проектирование алгоритмов и базовые структуры данных.`
                    : `موضوع البحث باللغة الروسية: Лабораторная работа №${selectedModel.modelNum} - Обеспечение жизнедеятельности и охрана труда на предприятии.`
                  }
                </p>
                <p className="text-[10px] text-gray-500 font-semibold italic">
                  التوجيه: يرجى كتابة الردود أو رفع الإجابة الأكاديمية المطلوبة لنفس الرقم.
                </p>
              </div>

              {/* Input for answer */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 block">إدخال الحل الأكاديمي المكتوب (إلزامي للتقديم):</label>
                <textarea
                  rows={3}
                  value={labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`] || ''}
                  onChange={(e) => setLabAnswers({
                    ...labAnswers,
                    [`${selectedModel.subjectId}-${selectedModel.modelNum}`]: e.target.value
                  })}
                  placeholder="اكتب تفسيرك الحل أو الملاحظات الأكاديمية هنا..."
                  className="w-full bg-white border border-gray-200 rounded-xl text-xs p-3 text-right font-bold text-black focus:outline-none focus:border-black"
                />
              </div>

              {/* Command controls buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSubmitLab(`${selectedModel.subjectId}-${selectedModel.modelNum}`)}
                  disabled={!labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`]?.trim()}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    !labAnswers[`${selectedModel.subjectId}-${selectedModel.modelNum}`]?.trim()
                      ? 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-black/80 shadow-xs'
                  }`}
                >
                  <Send size={12} />
                  <span>تقديم الحل للمراجعة</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModel}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-black hover:bg-gray-50 rounded-xl text-xs font-black cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* LECTURE VIDEO / PDF FULL-WIDTH INLINE LIGHTBOX PREVIEWER */}
      {viewingLecture && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-between p-4 z-55 animate-fade-in text-right"
          style={{ direction: 'rtl' }}
        >
          {/* Header block controls */}
          <div className="flex justify-between items-center bg-black/40 p-3 rounded-2xl border border-white/10 shrink-0">
            <button 
              onClick={() => setViewingLecture(null)}
              className="p-1.5 rounded-full bg-white border border-gray-200 text-black hover:bg-gray-50 transition"
            >
              <X size={15} />
            </button>

            <div className="text-right">
              <span className="text-[8px] text-[#D4A947] font-black uppercase tracking-wider block">معاينة المستند الفيدرالي المفتوح</span>
              <h3 className="text-xs sm:text-sm font-black text-white">{viewingLecture.title}</h3>
            </div>
          </div>

          {/* Core Content frame */}
          <div className="flex-1 my-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center p-6 relative">
            {viewingLecture.type === 'video' ? (
              <div className="w-full max-w-2xl aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                {/* Standard instructional mock player with rich feedback & controls */}
                <div className="space-y-4 p-8 text-center text-white relative z-10">
                  <Play size={44} className="mx-auto text-[#D4A947] animate-pulse" />
                  <p className="font-black text-sm">مشغل الوسائط التفاعلي لأكاديمية بن عون</p>
                  <p className="text-xs text-gray-400">الفيديو مسجل بأعلى دقة 1080p لتوفير شرح معملي مريح.</p>
                  <button 
                    onClick={() => alert('مرحباً بك! البدء التجريبي للمقطع المعتمد قيد العمل.')} 
                    className="px-5 py-2.5 bg-black hover:opacity-85 text-white border border-white/25 rounded-xl text-xs font-black"
                  >
                    بدء العرض التوضيحي
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 max-w-md bg-white border border-gray-200 rounded-3xl space-y-4 text-black text-right">
                <FileText size={48} className="mx-auto text-black shrink-0" />
                <h4 className="font-extrabold text-sm">المستند العلمي المطلوب جاهز للمطالعة والتحضير</h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  هذا الملف يضم تفاسير النماذج والقواعد وحلول المهام الأكاديمية المصاحبة لتفتيت العقبات المعقدة للفصل الحالي.
                </p>
                <div className="flex gap-2 justify-end pt-2">
                  <a 
                    href={viewingLecture.url || 'https://yadi.sk/d/sample_lectures_solution'} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 py-2 bg-black text-white hover:bg-black/80 rounded-xl text-xs font-black text-center block"
                  >
                    تحميل بصيغة PDF
                  </a>
                  <button
                    onClick={() => setViewingLecture(null)}
                    className="px-4 py-2 bg-white border border-gray-200 text-black rounded-xl text-xs font-bold"
                  >
                    إغلاق المكتشف
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 text-center shrink-0">
            <p className="text-[10px] text-gray-400 font-extrabold leading-normal">
              كل الحقوق محفوظة لـ أكاديمية بن عون © 2026. يرجى عدم تداول الملفات الأكاديمية تجارياً خارج حسابك الدراسي الموثق.
            </p>
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
