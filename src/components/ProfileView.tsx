import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, Mail, Phone, BookOpen, Download, CreditCard, Send, Settings, 
  LogOut, CheckCircle2, ChevronLeft, Sparkles, Sliders, ShieldCheck, Camera, 
  Bookmark, Info, GraduationCap, Copy, Award, Check, X, ShieldAlert,
  ChevronRight, ArrowDownToLine, Calendar, HelpCircle, RefreshCcw, Landmark, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType, SupportTicket, ChatMessage } from '../types';
import { auth, db, storage } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ProfileViewProps {
  user: UserType;
  examHistoryCount: number;
  onLogout: () => void;
  onUpdateProfile: (updatedUser: UserType) => void;
  onNavigateToTab: (tab: any) => void;
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  deferredPrompt: any;
  onInstallApp: () => void;
  subjects: any[];
  onUpdateSubjects: (updated: any[]) => void;
  subjectLecturesMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf'; url?: string }[]>;
  onUpdateSubjectLectures: (updatedMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf'; url?: string }[]>) => void;
  supportTickets: SupportTicket[];
  onUpdateSupportTickets: (updated: SupportTicket[]) => void;
  notifications?: any[];
  onUpdateNotifications?: (updated: any[]) => void;
  onAddNotification?: (targetEmail: string, senderName: string, message: string) => void;
}

type TabID = 'info' | 'grades' | 'safe' | 'support';

export default function ProfileView({
  user,
  examHistoryCount,
  onLogout,
  onUpdateProfile,
  onNavigateToTab,
  darkMode,
  onToggleDarkMode,
  deferredPrompt,
  onInstallApp,
  subjects,
  subjectLecturesMap,
  supportTickets = [],
  onUpdateSupportTickets,
  onAddNotification,
}: ProfileViewProps) {
  // Tabs management
  const [activeTab, setActiveTab2] = useState<TabID>('info');
  
  // Custom interactive alert notice state
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Profile fields state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.fullName || user.username || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [university, setUniversity] = useState(user.university || '');
  const [college, setCollege] = useState(user.college || '');
  const [department, setDepartment] = useState(user.department || '');
  const [academicYear, setAcademicYear] = useState(user.academicYear || 'سنة أولى');
  const [telegram, setTelegram] = useState(user.telegram || '');
  const [bio, setBio] = useState(user.bio || '');

  // Submitting States
  const [savingLoading, setSavingLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [receiptMode, setReceiptMode] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100');
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Active chart index
  const [selectedTermIndex, setSelectedTermIndex] = useState<number>(4);
  const [chartType, setChartType] = useState<'gpa' | 'pct'>('gpa');

  // Downloads tracking
  const [downloads, setDownloads] = useState<Record<string, { progress: number; finished: boolean }>>({});
  const [copiedId, setCopiedId] = useState(false);

  // Support section state
  const [isOpeningTicket, setIsOpeningTicket] = useState(false);
  const [newTicketMsg, setNewTicketMsg] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync back local states on user props update
  useEffect(() => {
    setFullName(user.fullName || user.username || '');
    setPhone(user.phone || '');
    setUniversity(user.university || '');
    setCollege(user.college || '');
    setDepartment(user.department || '');
    setAcademicYear(user.academicYear || 'سنة أولى');
    setTelegram(user.telegram || '');
    setBio(user.bio || '');
  }, [user]);

  // Support Message autoscroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicketId, supportTickets]);

  const showNotice = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  // Avatar Image selection
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotice('حجم الصورة كبير جداً! يجب أن لا تتجاوز 2 ميجابايت.', 'error');
      return;
    }

    setAvatarUploading(true);
    try {
      const uid = user.uid || auth.currentUser?.uid;
      if (!uid) throw new Error("المستخدم غير مسجل الدخول.");

      const fileRef = ref(storage, `profiles-avatars/${uid}/avatar_${Date.now()}`);
      const uploadSnapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);

      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
        avatarUrl: downloadURL,
        updatedAt: serverTimestamp()
      });

      onUpdateProfile({
        ...user,
        photoURL: downloadURL,
        avatarUrl: downloadURL
      });

      showNotice('تم رفع وتحديث صورتك الشخصية بنجاح!', 'success');
    } catch (error: any) {
      console.error(error);
      showNotice('فشل رفع الصورة؛ يرجى التحقق من اتصالك بالإنترنت.', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle saving data
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showNotice('الرجاء كتابة الاسم الكامل للملف الشخصي.', 'error');
      return;
    }

    setSavingLoading(true);
    try {
      const uid = user.uid || auth.currentUser?.uid;
      if (!uid) throw new Error("فشل تحديد الهوية الأكاديمية.");

      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        fullName: fullName.trim(),
        username: fullName.trim(),
        phone: phone.trim(),
        university: university.trim(),
        college: college.trim(),
        department: department.trim(),
        academicYear: academicYear,
        telegram: telegram.trim(),
        bio: bio.trim(),
        updatedAt: serverTimestamp()
      });

      onUpdateProfile({
        ...user,
        fullName: fullName.trim(),
        username: fullName.trim(),
        phone: phone.trim(),
        university: university.trim(),
        college: college.trim(),
        department: department.trim(),
        academicYear: academicYear,
        telegram: telegram.trim(),
        bio: bio.trim()
      });

      setIsEditing(false);
      showNotice('تم حفظ وتحديث بيانات ملفك الشخصي بالخادم الآمن!', 'success');
    } catch (err: any) {
      console.error(err);
      showNotice('فشل تحديث البيانات، يرجى المحاولة في وقت لاحق.', 'error');
    } finally {
      setSavingLoading(false);
    }
  };

  // Clipboard Copier
  const handleCopyId = () => {
    if (!user.studentId) return;
    navigator.clipboard.writeText(user.studentId);
    setCopiedId(true);
    showNotice('تم نسخ معرّف الطالب الموحد بنجاح لسطح المكتب.', 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // File Simulated Download Controller
  const handleSimulatedDownload = (fileId: string, fileName: string) => {
    if (downloads[fileId]?.finished) {
      showNotice(`تم تنزيل "${fileName}" مسبقاً من خزانة المقررات!`, 'info');
      return;
    }
    if (downloads[fileId] && downloads[fileId].progress < 100) {
      showNotice('جاري التنزيل نشطاً الآن بالفعل.. يرجى الانتظار.', 'info');
      return;
    }

    setDownloads(prev => ({ ...prev, [fileId]: { progress: 5, finished: false } }));
    
    let current = 5;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 20) + 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setDownloads(prev => ({ ...prev, [fileId]: { progress: 100, finished: true } }));
        showNotice(`اكتمل تحميل مستند "${fileName}" بنجاح!`, 'success');
      } else {
        setDownloads(prev => ({ ...prev, [fileId]: { progress: current, finished: false } }));
      }
    }, 150);
  };

  // Create real Support Ticket
  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketMsg.trim()) return;

    const tId = Math.floor(1000 + Math.random() * 9000).toString();
    const timeStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newTicket: SupportTicket = {
      id: tId,
      senderEmail: user.email,
      senderName: user.fullName || user.username || 'طالب منصة',
      message: newTicketMsg.trim(),
      createdAt: timeStr,
      status: 'open',
      messages: [
        {
          id: `${tId}-initial`,
          senderRole: 'student',
          senderName: user.fullName || user.username || 'طالب منصة',
          message: newTicketMsg.trim(),
          createdAt: timeStr
        }
      ]
    };

    const nextTickets = [newTicket, ...supportTickets];
    onUpdateSupportTickets(nextTickets);
    setActiveTicketId(tId);
    setNewTicketMsg('');
    setIsOpeningTicket(false);
    showNotice(`تم فتح تذكرة دعم فني جديدة برقم #${tId}`, 'success');

    // Simulated Auto-response for exquisite feel and feedback
    setTimeout(() => {
      const respTimeStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const responseMsg: ChatMessage = {
        id: `${tId}-reply-auto`,
        senderRole: 'admin',
        senderName: 'المهندس بن عون (الدعم الفني)',
        message: 'مرحباً بك يا بطل! تلقينا طلبك وسيتم مراجعته والتواصل معك على الفور، يرجى تزويدنا بأي تفاصيل إضافية إن لزم الأمر.',
        createdAt: respTimeStr
      };
      
      const ticketsWithReply = supportTickets.map(t => {
        if (t.id === tId) {
          return {
            ...t,
            messages: [...(t.messages || []), responseMsg]
          };
        }
        return t;
      });
      // Fallback update
      onUpdateSupportTickets([
        {
          ...newTicket,
          messages: [...(newTicket.messages || []), responseMsg]
        },
        ...supportTickets
      ]);
    }, 1800);
  };

  // Send communication chat message reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    const targetTicket = supportTickets.find(t => t.id === activeTicketId);
    if (!targetTicket) return;

    const timeStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newMsg: ChatMessage = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      senderName: user.fullName || user.username || 'طالب',
      senderRole: 'student',
      message: replyText.trim(),
      createdAt: timeStr
    };

    const updatedTickets = supportTickets.map(t => {
      if (t.id === activeTicketId) {
        return {
          ...t,
          messages: [...(t.messages || []), newMsg]
        };
      }
      return t;
    });

    onUpdateSupportTickets(updatedTickets);
    setReplyText('');
    showNotice("تم إرسال ردك بنجاح للدعم.", "success");
  };

  // Receipt deposit upload handler
  const handleReceiptUploadSubmit = async () => {
    setReceiptUploading(true);
    setTimeout(() => {
      setReceiptUploading(false);
      setReceiptMode(false);
      showNotice("تم استلام إيصال سداد الرصيد، بانتظار مراجعته من الإدارة المالية.", "success");
    }, 2000);
  };

  // SVG Chart math vectors coordinates values
  const dataset = {
    gpa: [
      { term: 'الفصل 1', val: 4.10, comment: 'بداية صلبة وتأسيس أساسيات الهندسة المدنية' },
      { term: 'الفصل 2', val: 4.35, comment: 'ارتفاع ممتاز مع زيادة استيعاب المواد التقنية و البرمجيات' },
      { term: 'الفصل 3', val: 4.15, comment: 'ضغط امتحانات وتعديل نسبي للأنصبة المعملية ومواد التفاضل' },
      { term: 'الفصل 4', val: 4.58, comment: 'عالي جداً وتفوق بمقررات التصميم المعماري والسلامة' },
      { term: 'الفصل 5', val: 4.90, comment: 'صدارة كاملة بمعدل تخرج ممتاز وشرفي، الأول على الدفعة' },
    ],
    pct: [
      { term: 'الفصل 1', val: 82, comment: 'درجة شرف أولى ومعدلات متميزة بمقدمة العلوم البرمجية' },
      { term: 'الفصل 2', val: 88, comment: 'تحسن في نسب حل المختبرات العملي وخرائط النمذجة الرياضية' },
      { term: 'الفصل 3', val: 83, comment: 'أداء معتدل في لغات التجميع وهيكلة الأكواد والذكاء الاصطناعي' },
      { term: 'الفصل 4', val: 92, comment: 'معدل قياسي في مقررات مصفوفات الأوتوكاد وإدارة المشاريع' },
      { term: 'الفصل 5', val: 98, comment: 'نسبة قياسية مثالية مبرهنة في بحوث الأداء والسلامة المهنية' },
    ]
  };

  const selectedData = dataset[chartType];
  const chartPoints = selectedData.map((pt, i) => {
    const x = 40 + i * 58;
    const maxVal = chartType === 'gpa' ? 5.0 : 100;
    const ratio = pt.val / maxVal;
    const y = 90 - ratio * 65; // coordinates boundary safe plot
    return { x, y, ...pt };
  });

  const getLinePath = () => `M ${chartPoints[0].x} ${chartPoints[0].y} ` + chartPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  const getAreaPath = () => `${getLinePath()} L ${chartPoints[chartPoints.length - 1].x} 100 L ${chartPoints[0].x} 100 Z`;

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto select-none bg-white min-h-screen text-slate-800" dir="rtl">
      
      {/* 1. VISUAL PREMIUM HEADER BANNER */}
      <div className="relative overflow-hidden pt-6 pb-12 px-6 bg-white text-slate-800 rounded-b-[2.5rem] shadow-sm border-b border-gray-150">
        
        {/* Soft elegant blur circles */}
        <div className="absolute top-[-20px] right-[-20px] w-48 h-48 bg-gradient-to-tr from-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-[-30px] left-[-15px] w-48 h-48 bg-slate-50 rounded-full blur-3xl pointer-events-none" />

        {/* Action upper bar */}
        <div className="flex justify-between items-center mb-6">
          <button 
            type="button"
            onClick={() => onNavigateToTab('home')}
            className="p-2.5 bg-slate-100/80 hover:bg-slate-200 active:scale-95 transition-all text-slate-700 rounded-xl border border-gray-200/40 cursor-pointer flex items-center justify-center"
            title="رجوع للرئيسية"
          >
            <ChevronRight size={16} />
          </button>
          
          <div className="text-center">
            <span className="text-[10px] font-mono tracking-widest text-amber-600 font-extrabold block uppercase">بوابة بن عون الأكاديمية</span>
            <span className="text-xs text-slate-500 font-bold">الملف الدراسي المتكامل للطلاب</span>
          </div>

          <button 
            type="button"
            onClick={() => onToggleDarkMode(!darkMode)}
            className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-amber-650 rounded-xl border border-amber-500/20 cursor-pointer flex items-center justify-center"
            title="تغيير المظهر"
          >
            <Sparkles size={15} />
          </button>
        </div>

        {/* Info Core frame with soft glowing circle */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-400 via-yellow-100 to-amber-500 rounded-full opacity-60 blur-xs animate-pulse" />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full border-4 border-white bg-slate-50 shadow-md overflow-hidden cursor-pointer group transition-transform hover:scale-105"
            >
              {user.photoURL || user.avatarUrl ? (
                <img 
                  src={user.photoURL || user.avatarUrl} 
                  alt={user.fullName || user.username} 
                  className="w-full h-full object-cover transition duration-300 group-hover:brightness-90"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-3xl bg-gradient-to-b from-slate-100 to-slate-200 text-amber-600">
                  {(user.fullName || user.username || 'ط').charAt(0)}
                </div>
              )}

              {/* Upload layer on hover */}
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white mb-0.5" />
                <span className="text-[7px] text-gray-200">تحديث الصورة</span>
              </div>

              {avatarUploading && (
                <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Float icon input trigger button */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-1.5 bg-amber-500 hover:bg-amber-600 transition rounded-full border-2 border-white text-white cursor-pointer shadow"
            >
              <Camera size={11} className="stroke-[2.5]" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-l font-black tracking-tight text-slate-800 flex items-center justify-center gap-1.5">
              <span>{user.fullName || user.username}</span>
              <ShieldCheck size={18} className="text-amber-500" fill="#D4A947" />
            </h2>
            
            <p className="text-[11px] text-slate-600 font-bold">
              مستوى القيد: {academicYear} · قسم {department || 'الشؤون والتحصيلات العلمية'}
            </p>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-150 text-emerald-700 text-[9.5px] font-black rounded-full shadow-inner mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span>مستند دراسي نشط ومعتمد</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. OVERLAPPING BRIEF METRICS BLOCK */}
      <div className="px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-4 grid grid-cols-4 gap-2 text-center">
          <div className="space-y-1">
            <span className="text-lg font-black text-slate-800 font-mono leading-none">4.90</span>
            <div className="text-[9px] font-bold text-slate-400">معدل GPA</div>
          </div>
          <div className="space-y-1 border-r border-gray-150">
            <span className="text-lg font-black text-slate-800 font-mono leading-none">82%</span>
            <div className="text-[9px] font-bold text-slate-400">التقدم العام</div>
          </div>
          <div className="space-y-1 border-r border-gray-150">
            <span className="text-lg text-slate-800 font-black font-mono leading-none">{Math.max(examHistoryCount, 4)}</span>
            <div className="text-[9px] font-bold text-slate-400">الاختبارات</div>
          </div>
          <div className="space-y-1 border-r border-gray-150">
            <span className="text-lg text-amber-600 font-black font-sans leading-none flex items-center justify-center gap-0.5">
              <span>{user.balance || 0}</span>
              <span className="text-[9px] text-slate-400 font-bold">روبل</span>
            </span>
            <div className="text-[9px] font-bold text-slate-400">المحفظة</div>
          </div>
        </div>
      </div>

      {/* FLOAT ALERTS BUBBLE CONTAINER */}
      <AnimatePresence>
        {notice && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`mx-4 p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold shadow-sm relative z-50 ${
              notice.type === 'success' 
                ? 'bg-emerald-50 border-emerald-150 text-emerald-850' 
                : notice.type === 'error'
                ? 'bg-rose-50 border-rose-150 text-rose-850'
                : 'bg-indigo-50 border-indigo-150 text-indigo-850'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-current animate-ping" />
            <p className="flex-1 leading-relaxed text-right">{notice.message}</p>
            <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 p-0.5 rounded cursor-pointer">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MODERN HORIZONTAL GLASS TABS NAVIGATION */}
      <div className="px-4">
        <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 shadow-inner text-xs font-black border border-gray-200">
          {[
            { id: 'info', text: 'بيانات القيد', icon: UserIcon },
            { id: 'grades', text: 'كشف الأداء', icon: GraduationCap },
            { id: 'safe', text: 'خزانة الملفات', icon: Bookmark },
            { id: 'support', text: 'الدعم والمالية', icon: CreditCard }
          ].map(tab => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab2(tab.id as TabID);
                  setIsEditing(false);
                }}
                className={`flex-1 py-2.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  isTabActive 
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700 scale-[1.03]' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={14} className={isTabActive ? 'text-amber-400' : 'text-current'} />
                <span className="text-[9.5px] font-extrabold">{tab.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. DYNAMIC SCREEN CONTENT DISPLAY CARD */}
      <div className="px-4">
        <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-md min-h-[300px]">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* ================================== TAB A: PROFILE FIELDS WORKFLOW ================================== */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                        <UserIcon size={14} />
                      </div>
                      <h3 className="text-xs font-black text-slate-800">تفاصيل ومستندات الانتساب الأكاديمي</h3>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1.5 rounded-xl text-[9.5px] font-black transition-colors cursor-pointer ${
                        isEditing 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {isEditing ? 'إلغاء التعديل' : 'تحديث البيانات'}
                    </button>
                  </div>

                  {isEditing ? (
                    // FORM EDIT MODE
                    <form onSubmit={handleSaveProfile} className="space-y-4 text-right">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-black text-slate-400 block">الاسم الكامل للطالب (كما بالهوية)</label>
                          <input
                            type="text"
                             value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                            placeholder="الاسم الكامل"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] font-black text-slate-400 block">رقم هاتفك (الواتساب بنظام الدولة)</label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold font-mono tracking-wider text-slate-800 text-left focus:outline-none focus:border-amber-500"
                            placeholder="+966 500 000 000"
                            dir="ltr"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] font-black text-slate-400 block">الجامعة أو الأكاديمية</label>
                          <input
                            type="text"
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                            placeholder="رابط الجامعة"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] font-black text-slate-400 block">الكلية والفرع الجامعي</label>
                          <input
                            type="text"
                            value={college}
                            onChange={(e) => setCollege(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                            placeholder="كلية الهندسة والعلوم"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] font-black text-slate-400 block">التخصص الأكاديمي الفرعي</label>
                          <input
                            type="text"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                            placeholder="القسم الدراسي"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] font-black text-slate-400 block">المرحلة الدراسية</label>
                          <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-body font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-amber-500"
                          >
                            <option value="سنة أولى">السنة الأولى (تحضيري)</option>
                            <option value="سنة ثانية">السنة الثانية</option>
                            <option value="سنة ثالثة">السنة الثالثة</option>
                            <option value="سنة رابعة">السنة الرابعة</option>
                            <option value="طالب مستجد">طالب مستجد</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] font-black text-slate-400 block">معرف حساب تليجرام</label>
                          <input
                            type="text"
                            value={telegram}
                            onChange={(e) => setTelegram(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-left text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                            placeholder="@username"
                            dir="ltr"
                          />
                        </div>

                        <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-2.5 text-[9.5px] text-slate-500 leading-normal">
                          <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                          <span>يُفضَّل إدخال الاسم المعتمد في السجلات الأكاديمية لجامعة الصرح لتسهيل مطابقة أوراق الحلول الخاصة بك بلا عوائق.</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9.5px] font-black text-slate-400 block">الوصف الذاتي البسيط (Bio)</label>
                        <textarea
                          rows={2}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                          placeholder="اكتب نبذة بسيطة عن مسارك الجامعي وشغفك..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingLoading}
                        className="w-full py-3 bg-[#0B1B3F] text-amber-400 border border-slate-800 hover:bg-slate-850 transition rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
                      >
                        {savingLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            <span>جاري معالجة وتخزين البيانات...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            <span>حفظ التعديلات في السيرة الأكاديمية</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    // READ ONLY VIEW DESIGN
                    <div className="space-y-4 text-right animate-fade-in animate-duration-200">
                      
                      {user.bio ? (
                        <div className="p-3 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-150 rounded-2xl italic text-xs text-slate-600 leading-relaxed font-semibold">
                          " {user.bio} "
                        </div>
                      ) : (
                        <div className="p-3.5 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 text-[11px] text-slate-400 italic text-center">
                          لا تتوفر نبذة ذاتية حالياً، انقر على "تحديث البيانات" لإضافتها والبدء!
                        </div>
                      )}

                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-gray-100 divide-y divide-gray-150/40 text-xs font-bold font-sans">
                        <div className="py-2.5 flex justify-between items-center">
                          <span className="text-slate-400">اسم المستخدم للولوج</span>
                          <span className="text-slate-800 font-mono text-[11px]">{user.username}</span>
                        </div>
                        
                        <div className="py-2.5 flex justify-between items-center">
                          <span className="text-slate-400">البريد المعتمد الموثق</span>
                          <span className="text-slate-800 font-mono text-[11px]">{user.email}</span>
                        </div>

                        <div className="py-2.5 flex justify-between items-center">
                          <span className="text-slate-400">كود الطالب المالي الموحد</span>
                          {user.studentId ? (
                            <div className="flex items-center gap-1.5 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/20">
                              <span className="font-mono text-amber-600 font-black text-[10.5px]">{user.studentId}</span>
                              <button onClick={handleCopyId} className="p-1 text-amber-500 hover:text-amber-600 cursor-pointer">
                                {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic font-medium">قيد التوليد التلقائي...</span>
                          )}
                        </div>

                        <div className="py-2.5 flex justify-between items-center">
                          <span className="text-slate-400">الجامعة المانحة الحالية</span>
                          <span className="text-slate-800">{university || 'المعهد العالي الموثق'}</span>
                        </div>

                        <div className="py-2.5 flex justify-between items-center">
                          <span className="text-slate-400">الكلية والمسار العلمي</span>
                          <span className="text-slate-700">
                            {college || 'كلية الحاسب والذكاء'} · {department || 'قيد المتابعة'}
                          </span>
                        </div>

                        <div className="py-2.5 flex justify-between items-center">
                          <span className="text-slate-400">رقم الهاتف النشط</span>
                          <span className="text-slate-700 font-mono select-all tracking-wider">{phone || 'غير مسجل حالياً'}</span>
                        </div>

                        <div className="py-2.5 flex justify-between items-center font-mono">
                          <span className="text-slate-400 font-sans">تليجرام للتواصل الآمن</span>
                          <span className="text-sky-600 font-bold">{telegram || '—'}</span>
                        </div>
                      </div>

                      {/* EXTRA LEVEL PWA PROMPT DESIGNS */}
                      {deferredPrompt && (
                        <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between text-right animate-pulse">
                          <div>
                            <h4 className="text-[11px] font-black text-indigo-900">تطبيق بن عون على جوالك</h4>
                            <p className="text-[9.5px] text-slate-500 font-bold mt-0.5">ثبّت التطبيق الآن لتحصل على وصول دون إنترنت ونظام إشعارات ذكي!</p>
                          </div>
                          <button
                            onClick={onInstallApp}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-1.5 text-[9.5px] font-black shrink-0 transition cursor-pointer"
                          >
                            تثبيت الآن
                          </button>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

              {/* ================================== TAB B: PERFORMANCE / CHART PLOTS ================================== */}
              {activeTab === 'grades' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                        <GraduationCap size={14} />
                      </div>
                      <h3 className="text-xs font-black text-slate-800">منحنيات الأداء الأكاديمي ودرجات التميز</h3>
                    </div>

                    <div className="flex bg-slate-100 p-0.5 rounded-xl text-[9px] font-black">
                      <button
                        type="button"
                        onClick={() => { setChartType('gpa'); setSelectedTermIndex(4); }}
                        className={`px-2.5 py-1.5 rounded-lg transition-all ${chartType === 'gpa' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-450'}`}
                      >
                        معدل GPA
                      </button>
                      <button
                        type="button"
                        onClick={() => { setChartType('pct'); setSelectedTermIndex(4); }}
                        className={`px-2.5 py-1.5 rounded-lg transition-all ${chartType === 'pct' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-450'}`}
                      >
                        النسب المئوية
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-bold leading-normal text-right">
                    اضغط على أي عمود أو نقطة بالرسم البياني التفاعلي لمطالعة تقرير التحصيل والملاحظات المسجلة من الكادر الإشرافي:
                  </p>

                  {/* SVG PLOTTING COMPOSITIONS */}
                  <div className="relative bg-slate-50/50 p-4 rounded-2xl border border-gray-150 h-36 flex items-center justify-center">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 320 110">
                      <defs>
                        <linearGradient id="gradientProfileArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4A947" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#D4A947" stopOpacity="0.00" />
                        </linearGradient>
                      </defs>

                      {/* Reference line boundaries */}
                      <line x1="30" y1="20" x2="290" y2="20" stroke="#F1F5F9" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="30" y1="55" x2="290" y2="55" stroke="#F1F5F9" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="30" y1="90" x2="290" y2="90" stroke="#E2E8F0" strokeWidth="1" />

                      {/* Gradient fill */}
                      <path d={getAreaPath()} fill="url(#gradientProfileArea)" className="transition-all duration-300" />

                      {/* Main track line */}
                      <path d={getLinePath()} fill="none" stroke="#D4A947" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />

                      {/* Points nodes */}
                      {chartPoints.map((pt, idx) => {
                        const isSelected = selectedTermIndex === idx;
                        return (
                          <g key={idx} className="cursor-pointer group" onClick={() => setSelectedTermIndex(idx)}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? 6 : 4.5}
                              fill={isSelected ? '#0B1B3F' : '#D4A947'}
                              stroke="#FFFFFF"
                              strokeWidth="1.5"
                              className="transition-all stroke-white group-hover:scale-125"
                            />
                            <text x={pt.x} y="103" fontSize="8" fontWeight="bold" fill="#94A3B8" textAnchor="middle" className="font-mono">
                              {pt.term}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* ACTIVE INSIGHT SPECS */}
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-right animate-fade-in">
                    <div className="flex justify-between items-center text-xs font-black text-slate-800">
                      <span>تفاصيل: {chartPoints[selectedTermIndex]?.term}</span>
                      <span className="font-mono bg-[#0B1B3F] text-[#D4A947] px-2.5 py-0.5 rounded-lg text-[9.5px]">
                        {chartPoints[selectedTermIndex]?.val} {chartType === 'gpa' ? '/ 5.00' : '%'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed mt-1">
                      {chartPoints[selectedTermIndex]?.comment}
                    </p>
                  </div>

                  {/* DETAILED LOG SHEETS */}
                  <div className="space-y-2 pt-1">
                    <h4 className="text-[10px] font-black text-slate-400 tracking-wider text-right uppercase">آخر المقررات المحسوبة تفصيلياً</h4>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { code: 'SAFE-109', name: 'أمن المنشآت والسلامة العامة المهنية (БЖД)', hours: '3 ساعات', pct: '96%', isHonor: true },
                        { code: 'PROG-211', name: 'لغات البرمجة المنهجية وحل المشكلات التكتيكية', hours: '4 ساعات', pct: '92%', isHonor: true },
                        { code: 'MATH-101', name: 'الهندسة التحليلية وحساب التفاضل (Математика)', hours: '3 ساعات', pct: '89%', isHonor: false },
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/70 border border-gray-150 rounded-xl flex items-center justify-between text-right text-xs font-bold leading-tight">
                          <div className="space-y-0.5">
                            <span className="font-mono text-[9px] text-slate-400 font-semibold">{item.code}</span>
                            <div className="text-[11px] font-black text-slate-800 leading-normal">{item.name}</div>
                          </div>
                          
                          <div className="text-left space-y-0.5">
                            <div className="text-amber-600 font-black font-sans text-[11px]">{item.pct}</div>
                            <span className="text-[9px] text-slate-400 block font-semibold">{item.hours}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ================================== TAB C: DOCUMENT SAFE / ACCESS KEYS ================================== */}
              {activeTab === 'safe' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Bookmark size={14} />
                      </div>
                      <h3 className="text-xs font-black text-slate-800">خزانة المستندات ومكتبة الحلول الجاهزة</h3>
                    </div>
                    
                    <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg font-black font-mono">
                      تأمين SSL مسبق
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 font-bold leading-normal text-right">
                    هنا يُحفظ ملفات السيمنار، تقارير المعامل المشحونة والحلول الحصرية لطلاب "الدفع البسيط" بنظام فوري للتنزيل مع ملفات الشرح:
                  </p>

                  <div className="space-y-2.5">
                    {[
                      { id: 'file_safe_1', name: 'تقرير معمل (Лабораторная работа) لفيزياء الموائع - نموذج 3', size: '2.4 MB', type: 'PDF' },
                      { id: 'file_safe_2', name: 'السيمنار الأكاديمي لشؤون وإدارة الأمن الصناعي المعتمد', size: '4.1 MB', type: 'DOCX' },
                      { id: 'file_safe_3', name: 'أكواد وحلول مصفوفة الأوتوكاد (AutoCAD PGR) النموذج الذهبي', size: '8.7 MB', type: 'ZIP' },
                      { id: 'file_safe_4', name: 'كشوف مراجعات أسئلة البرمجة الممنهجة - معمل بايثون التمهيدي', size: '1.2 MB', type: 'PDF' }
                    ].map((item) => {
                      const dl = downloads[item.id];
                      return (
                        <div key={item.id} className="p-3 bg-slate-50/80 border border-gray-150 rounded-xl relative overflow-hidden transition-all hover:bg-slate-100/60">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="space-y-0.5 max-w-[70%] select-none">
                              <h4 className="text-[11px] font-black text-slate-800 leading-normal truncate">{item.name}</h4>
                              <div className="flex items-center gap-2 text-[9px] text-slate-400">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-slate-500 font-semibold">{item.type}</span>
                                <span>{item.size}</span>
                              </div>
                            </div>

                            {/* Download Action switcher */}
                            {dl?.finished ? (
                              <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-250 px-2.5 py-1.5 rounded-xl font-black">
                                ✓ تم التنزيل
                              </span>
                            ) : dl ? (
                              <div className="w-16 space-y-1 text-center">
                                <div className="text-[9px] font-bold text-indigo-650 font-mono">{dl.progress}%</div>
                                <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                                  <div className="bg-indigo-650 h-full transition-all duration-150" style={{ width: `${dl.progress}%` }} />
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSimulatedDownload(item.id, item.name)}
                                className="px-3 py-1.5 bg-[#0B1B3F] hover:bg-slate-800 text-white rounded-xl text-[9.5px] font-black flex items-center gap-1 transition-all z-10 cursor-pointer"
                              >
                                <ArrowDownToLine size={12} className="text-[#D4A947]" />
                                <span>تنزيل المجلد</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ================================== TAB D: FINANCE & TICKET DESK ================================== */}
              {activeTab === 'support' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                        <CreditCard size={14} />
                      </div>
                      <h3 className="text-xs font-black text-slate-800">إيداعات الطالب المالية وبطاقات الدعم</h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReceiptMode(!receiptMode)}
                      className="px-2.5 py-1 bg-amber-500 text-slate-900 rounded-xl text-[9.5px] font-black flex items-center gap-1 cursor-pointer transition active:scale-95 shadow-sm"
                    >
                      <Landmark size={11} />
                      <span>{receiptMode ? 'عرض التذاكر' : 'شحن الرصيد'}</span>
                    </button>
                  </div>

                  {receiptMode ? (
                    // FINANCE CHARGE DEPOSIT PANEL
                    <div className="space-y-4 text-right animate-duration-200 animate-fade-in">
                      <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-850 space-y-1.5">
                        <div className="text-[10px] text-slate-350 font-extrabold uppercase">البطاقة المخصصة للاستقبال المصرفي:</div>
                        <p className="font-mono text-base font-black tracking-widest text-[#D4A947] select-all">2200 1050 0228 4190</p>
                        <p className="text-[9.5px] text-slate-200 font-bold leading-relaxed pt-1">
                          قم بتحويل قيمة الرغبات/الملفات إلى البطاقة المخصصة عبر Sberbank، ثم ارفع لقطة الشاشه أو إيصال الإيداع المالي هنا للتفعيل الفوري.
                        </p>
                      </div>

                      <div className="bg-slate-50 p-4 border border-gray-150 rounded-2xl space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 block">المبلغ المحول بالروبل الروسي (RUB)</label>
                          <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 block">إثبات التحويل أو لقطة إشعار (إيصال Sberbank)</label>
                          <div 
                            onClick={() => receiptInputRef.current?.click()}
                            className="bg-white border-2 border-dashed border-gray-200 hover:border-amber-500/40 rounded-xl p-4 text-center cursor-pointer transition-colors"
                          >
                            <Landmark size={20} className="mx-auto text-slate-400 mb-1" />
                            <span className="text-[10px] font-black text-slate-500 block">المس لرفع إيصال السداد بصيغة JPG/PNG</span>
                            <span className="text-[8px] text-slate-400 block font-semibold mt-0.5">أقصى حجم 4 ميجابايت</span>
                          </div>
                          <input type="file" ref={receiptInputRef} onChange={handleReceiptUploadSubmit} className="hidden" accept="image/*" />
                        </div>

                        {receiptUploading ? (
                          <div className="w-full py-2.5 bg-gray-100 flex items-center justify-center gap-2.5 rounded-xl">
                            <span className="w-4 h-4 border-2 border-amber-550 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] text-gray-600 font-bold">جاري مراجعة الصورة المرفوعة...</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleReceiptUploadSubmit}
                            className="w-full py-2.5 bg-[#0B1B3F] hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-black border border-slate-800 transition cursor-pointer"
                          >
                            تقديم إيصال الرصيد للمراجعة المالية
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // SUPPORT CHATS DESK
                    <div className="space-y-3.5 animate-duration-200 animate-fade-in text-right">
                      
                      {activeTicketId ? (
                        // RENDERING INTERACTIVE ACTIVE CHAT ROOM
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-gray-150">
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold block">تذكرة النشوة الفنية النشطة:</span>
                              <span className="text-xs font-black text-slate-850">كود معرّف التذكرة: #{activeTicketId}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTicketId(null)}
                              className="px-2.5 py-1 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-lg text-[9.5px] font-bold cursor-pointer"
                            >
                              إغلاق الغرفة
                            </button>
                          </div>

                          {/* Message List Grid Bubble Frame */}
                          <div className="h-44 overflow-y-auto p-2 bg-slate-50/50 rounded-2xl border border-gray-150 space-y-2.5">
                            {supportTickets.find(t => t.id === activeTicketId)?.messages?.map((msg, i) => {
                              const isAdmin = msg.senderRole === 'admin';
                              return (
                                <div key={i} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                                  <div className={`max-w-[85%] rounded-2xl p-2.5 text-xs font-bold leading-normal ${
                                    isAdmin 
                                      ? 'bg-white border border-gray-200 text-slate-750' 
                                      : 'bg-[#0B1B3F] text-white'
                                  }`}>
                                    <div className="text-[8px] opacity-70 mb-0.5">{msg.senderName}</div>
                                    <p>{msg.message}</p>
                                    <div className="text-[7.5px] opacity-60 text-left font-mono mt-0.5 tracking-tight">{msg.createdAt}</div>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={chatEndRef} />
                          </div>

                          {/* Input field send replies bar */}
                          <form onSubmit={handleSendReply} className="flex gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="اكتب ردك أو استفسارك الإضافي هنا..."
                              className="flex-1 bg-slate-50 border border-gray-200 p-2 text-xs font-semibold text-slate-800 rounded-xl focus:outline-none focus:border-amber-500"
                            />
                            <button 
                              type="submit"
                              className="px-3.5 py-2 bg-[#0B1B3F] hover:bg-slate-850 text-white rounded-xl font-black text-xs shrink-0 cursor-pointer"
                            >
                              إرسال
                            </button>
                          </form>
                        </div>
                      ) : (
                        // NO CHAT ACTIVE; LIST TICKETS & NEW BUTTON
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400">تذاكر الدعم والتحقق من التفعيل</span>
                            <button
                              type="button"
                              onClick={() => setIsOpeningTicket(!isOpeningTicket)}
                              className="px-2.5 py-1 bg-[#0B1B3F] text-white rounded-lg text-[9.5px] font-black border border-slate-750 hover:bg-slate-800 cursor-pointer"
                            >
                              {isOpeningTicket ? 'رجوع للقائمة' : 'تذكرة جديدة +'}
                            </button>
                          </div>

                          {isOpeningTicket ? (
                            <form onSubmit={handleCreateSupportTicket} className="space-y-2">
                              <label className="text-[9.5px] font-black text-slate-400">اشرح مشكلتك، استفسارك أو طلب تفعيلاً مالياً مستعجلاً:</label>
                              <textarea
                                rows={3}
                                value={newTicketMsg}
                                onChange={(e) => setNewTicketMsg(e.target.value)}
                                placeholder="اكتب رقم العملية وتفاصيل طلبك لمصلحة العمل على تفريغ الحصص بنجاح..."
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                              />
                              <button
                                type="submit"
                                className="w-full py-2 bg-[#0B1B3F] text-white hover:bg-slate-800 transition rounded-xl text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Send size={11} />
                                <span>رفع التذكرة لقسم الإشراف المالي</span>
                              </button>
                            </form>
                          ) : (
                            <div className="space-y-2">
                              {supportTickets.length === 0 ? (
                                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                                  <Clock size={18} className="mx-auto text-slate-400 mb-1" />
                                  <p className="text-[10px] text-slate-400 italic">لا توجد أي تذاكر دعم مفتوحة حالياً، لفتح تذكرة انقر على 'تذكرة جديدة'.</p>
                                </div>
                              ) : (
                                supportTickets.map((ticket) => (
                                  <div 
                                    key={ticket.id}
                                    onClick={() => setActiveTicketId(ticket.id)}
                                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-gray-150 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs font-bold"
                                  >
                                    <div>
                                      <h5 className="font-black text-slate-800">تذكرة تتبع: #{ticket.id}</h5>
                                      <p className="text-[9px] text-slate-400 truncate max-w-[200px] font-semibold mt-0.5">{ticket.message}</p>
                                    </div>

                                    <div className="text-left space-y-1">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black ${
                                        ticket.status === 'closed' 
                                          ? 'bg-rose-100 text-rose-700' 
                                          : 'bg-emerald-100 text-emerald-700 animate-pulse'
                                      }`}>
                                        {ticket.status === 'closed' ? 'مغلقة' : 'نشطة'}
                                      </span>
                                      <span className="text-[8px] text-slate-400 font-mono block leading-none">{ticket.createdAt?.split(' ')[0]}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

            </motion.div>
          </AnimatePresence>
          
        </div>
      </div>

      {/* 5. DANGER ZONE / SYSTEM EXIT LAYOUTS */}
      <div className="px-4">
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
          <div className="text-right">
            <h4 className="text-[11px] font-black text-rose-700">منطقة الأمان واللوج أوت</h4>
            <p className="text-[9.5px] text-slate-500 font-semibold mt-0.5">تسجيل الخروج الآمن والتحقق من غلق الجلسات الحالية لمصلحة الخصوصية.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-xl transition flex items-center gap-1 cursor-pointer hover:shadow-lg"
          >
            <LogOut size={12} />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* SYSTEM CONFIRM ACTION POPUP LOGOUT */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-xs w-full text-center border border-gray-200 shadow-xl space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert size={24} />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800">هل أنت متأكد من تسجيل الخروج؟</h4>
                <p className="text-[10px] text-slate-500 font-bold leading-normal">
                  سيتعين عليك إدخال كود المصادقة مجدداً لولوج بوابة بن عون الأكاديمية لاحقاً.
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  نعم، خروج
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
