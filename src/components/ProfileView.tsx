import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, User, CreditCard, ClipboardList, Bell, HelpCircle, LogOut, ChevronLeft, 
  ShieldCheck, Mail, Save, Check, Sun, Moon, Download, Shield, Send, ArrowRight, 
  MessageSquare, Lock, Camera, Phone, GraduationCap, ShieldAlert, Copy, Bookmark, 
  Info, FileText, CheckCircle2, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType, SupportTicket, ChatMessage } from '../types';
import { auth, db, storage } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AdminDashboard from './AdminDashboard';

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

type ActiveSection = 'none' | 'academic' | 'saved-lectures' | 'downloads' | 'payments' | 'notifications' | 'support' | 'about';

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
  onUpdateSubjects,
  subjectLecturesMap,
  onUpdateSubjectLectures,
  supportTickets = [],
  onUpdateSupportTickets,
  notifications = [],
  onUpdateNotifications,
  onAddNotification,
}: ProfileViewProps) {
  const [activeSubSection, setActiveSubSection] = useState<ActiveSection>('none');
  const [activeGraphTab, setActiveGraphTab] = useState<'gpa' | 'percentage'>('gpa');
  const [selectedPoint, setSelectedPoint] = useState<number>(4); // Point on progress graph
  
  // Edit Profile mode
  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(user.fullName || user.username || '');
  const [phoneInput, setPhoneInput] = useState(user.phone || '');
  const [universityInput, setUniversityInput] = useState(user.university || '');
  const [collegeInput, setCollegeInput] = useState(user.college || '');
  const [departmentInput, setDepartmentInput] = useState(user.department || '');
  const [levelInput, setLevelInput] = useState(user.level || user.academicStage || 'بكالوريوس');
  const [telegramInput, setTelegramInput] = useState(user.telegram || '');
  const [academicYearInput, setAcademicYearInput] = useState(user.academicYear || 'سنة أولى');

  // Interactive Downloading list states
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadCompleted, setDownloadCompleted] = useState<Record<string, boolean>>({});

  // Payment portal attachment simulation
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);

  // General state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Live support chat inputs
  const [supportMsg, setSupportMsg] = useState('');
  const [activeChatTicketId, setActiveChatTicketId] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  const [supportSenderRole, setSupportSenderRole] = useState<'self' | 'simulated_ahmed'>('self');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Count lectures dynamically
  const totalLecturesCount = Object.values(subjectLecturesMap).reduce((acc, curr) => acc + curr.length, 0) || 12;

  // Static progress data points on curve
  const progressData = {
    gpa: [
      { term: 'الترم 1', val: 4.45, details: 'الفصل الدراسي الأول - بداية ممتازة' },
      { term: 'الترم 2', val: 4.60, details: 'الفصل الأول للعام الفائت' },
      { term: 'الترم 3', val: 4.58, details: 'الفصل الثاني للعام الفائت' },
      { term: 'الترم 4', val: 4.78, details: 'الفصل الصيفي المكثف' },
      { term: 'الترم 5 (الحالي)', val: 4.88, details: 'الفصل الأول للعام الجاري - تفوّق أكاديمي' },
    ],
    percentage: [
      { term: 'الترم 1', val: 89, details: 'تقدير جيد جداً مرتفع' },
      { term: 'الترم 2', val: 92, details: 'تقدير ممتاز في الكلية' },
      { term: 'الترم 3', val: 91, details: 'الانتساب والعمل الميداني' },
      { term: 'الترم 4', val: 95, details: 'المعدل الفصلي للمواد العلمية' },
      { term: 'الترم 5 (الحالي)', val: 97.6, details: 'مرتبة الشرف الأولى والترتيب الأول' },
    ]
  };

  useEffect(() => {
    setFullNameInput(user.fullName || user.username || '');
    setPhoneInput(user.phone || '');
    setUniversityInput(user.university || '');
    setCollegeInput(user.college || '');
    setDepartmentInput(user.department || '');
    setLevelInput(user.level || user.academicStage || 'بكالوريوس');
    setTelegramInput(user.telegram || '');
    setAcademicYearInput(user.academicYear || 'سنة أولى');
  }, [user]);

  // Handle avatar upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const uidValue = user.uid || auth.currentUser?.uid;
      if (!uidValue) throw new Error("المستخدم غير مسجل دخول.");
      const storageRef = ref(storage, `profile-images/${uidValue}/avatar`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      const userDocRef = doc(db, 'users', uidValue);
      await updateDoc(userDocRef, { photoURL: downloadURL, avatarUrl: downloadURL, updatedAt: serverTimestamp() });
      onUpdateProfile({ ...user, photoURL: downloadURL, avatarUrl: downloadURL });
      setUploadSuccess(true);
    } catch (err) {
      setUploadError('فشل رفع الصورة؛ يرجى المحاولة لاحقاً.');
    } finally {
      setIsUploading(false);
    }
  };

  // Profile fields saving handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid || auth.currentUser?.uid || '');
      await updateDoc(userDocRef, {
        fullName: fullNameInput.trim(),
        username: fullNameInput.trim(),
        phone: phoneInput.trim(),
        university: universityInput.trim(),
        college: collegeInput.trim(),
        department: departmentInput.trim(),
        level: levelInput,
        telegram: telegramInput.trim(),
        academicYear: academicYearInput,
        updatedAt: serverTimestamp()
      });
      onUpdateProfile({
        ...user,
        fullName: fullNameInput.trim(),
        username: fullNameInput.trim(),
        phone: phoneInput.trim(),
        university: universityInput.trim(),
        college: collegeInput.trim(),
        department: departmentInput.trim(),
        level: levelInput,
        telegram: telegramInput.trim(),
        academicYear: academicYearInput
      });
      setIsEditing(false);
    } catch (err) {
      alert('حدث خطأ أثناء حفظ التعديلات.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyStudentId = () => {
    if (user.studentId) {
      navigator.clipboard.writeText(user.studentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Mock downloading animation progress
  const startFileDownload = (id: string) => {
    if (downloadCompleted[id] || downloadProgress[id] > 0) return;
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDownloadCompleted(prev => ({ ...prev, [id]: true }));
      }
      setDownloadProgress(prev => ({ ...prev, [id]: progress }));
    }, 150);
  };

  // Mock receipt upload
  const uploadFeeReceipt = () => {
    setUploadingReceipt(true);
    setTimeout(() => {
      setUploadingReceipt(false);
      setReceiptSubmitted(true);
    }, 1800);
  };

  // Telegram support sender
  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;
    const newId = Math.floor(1000 + Math.random() * 9000).toString();
    const formattedDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

    let senderEmail = user.email;
    let senderName = user.fullName || user.username;

    if (user.email === 'abdulmlikoog@gmail.com' && supportSenderRole === 'simulated_ahmed') {
      senderEmail = 'ahmed.salih@gmail.com';
      senderName = 'أحمد الصالح';
    }

    const newTicket: SupportTicket = {
      id: newId,
      senderEmail,
      senderName,
      message: supportMsg.trim(),
      createdAt: formattedDate,
      messages: [
        { id: newId + '-initial', senderRole: 'student', senderName, message: supportMsg.trim(), createdAt: formattedDate }
      ]
    };

    onUpdateSupportTickets([newTicket, ...supportTickets]);
    setSupportMsg('');
    setActiveChatTicketId(newId);

    // Dispatch Telegram Bot alert
    const storedToken = localStorage.getItem('school_telegram_bot_token') || '8376812737:AAEADU_8bJzZSJHq_BHCrcyCH2PvkHCrBrk';
    const storedChatId = localStorage.getItem('school_telegram_chat_id');
    if (storedToken && storedChatId) {
      const text = `📬 *دعم فني كود:* ${newId}\nالطالب: ${senderName}\nالرسالة: ${newTicket.message}`;
      fetch(`https://api.telegram.org/bot${storedToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: storedChatId, text, parse_mode: 'Markdown' })
      }).catch(console.error);
    }
  };

  const handleSendChatMessage = async (ticketId: string, text: string) => {
    if (!text.trim()) return;
    const ticket = supportTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const formattedDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const currentMessages = ticket.messages || [];
    const newMessage: ChatMessage = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      senderRole: 'student',
      senderName: ticket.senderName,
      message: text.trim(),
      createdAt: formattedDate
    };

    const updatedTickets = supportTickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, messages: [...currentMessages, newMessage] };
      }
      return t;
    });

    onUpdateSupportTickets(updatedTickets);
    setChatInputText('');

    const storedToken = localStorage.getItem('school_telegram_bot_token') || '8376812737:AAEADU_8bJzZSJHq_BHCrcyCH2PvkHCrBrk';
    const storedChatId = localStorage.getItem('school_telegram_chat_id');
    if (storedToken && storedChatId) {
      const telegramText = `💬 *رد جديد من:* ${ticket.senderName}\nبطاقة #${ticket.id}\nالرد: ${text.trim()}`;
      fetch(`https://api.telegram.org/bot${storedToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: storedChatId, text: telegramText, parse_mode: 'Markdown' })
      }).catch(console.error);
    }
  };

  // Coordinate math for progression graph (SVG dimensions: Width 320, Height 140)
  const isGpa = activeGraphTab === 'gpa';
  const points = progressData[activeGraphTab].map((d, i) => {
    const x = 30 + i * 65;
    const maxVal = isGpa ? 5.0 : 100;
    const valRatio = d.val / maxVal;
    const y = 110 - valRatio * 85; 
    return { x, y, term: d.term, val: d.val, details: d.details };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} 125 L ${points[0].x} 125 Z`
    : '';

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto" dir="rtl">
      {/* MOBILE DEVICE HEADER CONTAINER (Deep Dark Blue Header block) */}
      <div className="bg-[#041B4D] text-white pt-6 pb-12 px-5 rounded-b-[2.5rem] relative shadow-lg overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute -top-12 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-12 w-48 h-48 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none" />

        {/* Action Header Nav */}
        <div className="flex justify-between items-center mb-6 relative z-10">
          <button 
            type="button"
            onClick={() => onNavigateToTab('home')}
            className="p-2.5 bg-white/10 hover:bg-white/20 transition rounded-xl text-white cursor-pointer"
          >
            <ArrowRight size={16} />
          </button>
          <span className="font-extrabold text-sm tracking-wider uppercase font-sans text-brand-gold">منصة بن عون الأكاديمية</span>
          <button 
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2.5 transition rounded-xl cursor-pointer ${isEditing ? 'bg-brand-gold text-brand-dark' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title="تحديث البيانات"
          >
            <Settings size={16} className="animate-spin-slow" />
          </button>
        </div>

        {/* Profile Card & Picture at Top */}
        <div className="flex flex-col items-center text-center relative z-10 space-y-3">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-tr from-brand-gold to-yellow-400 rounded-full blur opacity-65 animate-pulse" />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full border-4 border-white shadow-xl overflow-hidden cursor-pointer group bg-[#071B3B]"
            >
              {user.photoURL || user.avatarUrl ? (
                <img 
                  src={user.photoURL || user.avatarUrl} 
                  alt={user.fullName || user.username} 
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-2xl text-white">
                  {(user.fullName || user.username || 'ط').charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -left-1 p-1.5 bg-brand-gold hover:bg-yellow-500 rounded-full border-2 border-[#041B4D] text-brand-dark cursor-pointer transition shadow"
            >
              <Camera size={11} className="stroke-[2.5]" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-1">
            <h2 className="font-extrabold text-base tracking-tight flex items-center justify-center gap-1">
              <span>{user.fullName || user.username}</span>
              <ShieldCheck size={16} className="text-brand-gold" />
            </h2>
            {/* Level / Status below Name */}
            <p className="text-[11px] text-gray-300 font-bold">
              {levelInput} · {departmentInput || 'طالب وباحث أكاديمي'}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-black rounded-full shadow-sm mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              <span>حساب نشط ومسجل</span>
            </div>
          </div>
        </div>
      </div>

      {/* STATS OVERLAPPING ROW (Average grade, lectures count, exams count, certificates count) */}
      <div className="px-4 -mt-8 relative z-20">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-4 grid grid-cols-4 gap-2 text-center">
          {/* Average Grade */}
          <div className="space-y-1">
            <div className="text-[14px] font-black text-brand-blue dark:text-brand-gold">4.88</div>
            <div className="text-[9px] font-extrabold text-[#707e94]">المعدل العام</div>
          </div>
          {/* Lectures Count */}
          <div className="space-y-1 border-r border-gray-100 dark:border-slate-800">
            <div className="text-[14px] font-black text-brand-dark dark:text-white">{totalLecturesCount}</div>
            <div className="text-[9px] font-extrabold text-[#707e94]">ملازم ومحاضرة</div>
          </div>
          {/* Exams Count */}
          <div className="space-y-1 border-r border-gray-100 dark:border-slate-800">
            <div className="text-[14px] font-black text-emerald-600 dark:text-emerald-400">{Math.max(examHistoryCount, 5)}</div>
            <div className="text-[9px] font-extrabold text-[#707e94]">درجات حقيقية</div>
          </div>
          {/* Certificates Count */}
          <div className="space-y-1 border-r border-gray-100 dark:border-slate-800">
            <div className="text-[14px] font-black text-[#D4A63D]">3</div>
            <div className="text-[9px] font-extrabold text-[#707e94]">شهادات درع</div>
          </div>
        </div>
      </div>

      {/* DYNAMIC PROGRESS / GPA GRAPH SECTION */}
      <div className="px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-120 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-xs text-brand-dark dark:text-white flex items-center gap-1.5">
              <GraduationCap size={16} className="text-brand-gold" />
              <span>مؤشر تطور التحصيل الأكاديمي</span>
            </h3>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold">
              <button 
                type="button"
                onClick={() => { setActiveGraphTab('gpa'); setSelectedPoint(4); }}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${isGpa ? 'bg-white dark:bg-slate-950 shadow-xs font-black text-brand-blue dark:text-brand-gold' : 'text-gray-400'}`}
              >
                نقاط GPA
              </button>
              <button 
                type="button"
                onClick={() => { setActiveGraphTab('percentage'); setSelectedPoint(4); }}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${!isGpa ? 'bg-white dark:bg-slate-950 shadow-xs font-black text-brand-blue dark:text-brand-gold' : 'text-gray-400'}`}
              >
                النسبة المئوية
              </button>
            </div>
          </div>

          {/* SVG Progress Graph Area */}
          <div className="relative bg-slate-50/75 dark:bg-slate-950/45 rounded-xl p-2 border border-slate-100 dark:border-slate-850 h-36">
            <svg className="w-full h-full" viewBox="0 0 320 120">
              <defs>
                <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4A63D" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#D4A63D" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Horizontal Grid lines */}
              <line x1="20" y1="20" x2="300" y2="20" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" className="dark:stroke-slate-800" />
              <line x1="20" y1="65" x2="300" y2="65" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" className="dark:stroke-slate-800" />
              <line x1="20" y1="110" x2="300" y2="110" stroke="#E2E8F0" strokeWidth="1" className="dark:stroke-slate-800" />

              {/* Area Under the curve */}
              <path d={areaD} fill="url(#gpaGradient)" />

              {/* Glowing Line */}
              <path d={pathD} fill="none" stroke="#D4A63D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Dots / Interactive Points */}
              {points.map((p, i) => (
                <g key={i} className="cursor-pointer" onClick={() => setSelectedPoint(i)}>
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={selectedPoint === i ? 6 : 4} 
                    fill={selectedPoint === i ? '#041B4D' : '#D4A63D'} 
                    stroke="#FFFFFF" 
                    strokeWidth="1.5" 
                    className="transition-all hover:scale-125"
                  />
                  <text x={p.x} y="118" fontSize="8" fontWeight="Bold" fill="#94A3B8" textAnchor="middle">{p.term}</text>
                </g>
              ))}
            </svg>
          </div>

          {/* Interactive Graph Details card info */}
          <div className="bg-amber-500/10 border border-brand-gold/20 rounded-xl p-2.5 text-right space-y-1">
            <div className="flex justify-between text-[11px] font-black text-brand-dark dark:text-brand-gold">
              <span>{points[selectedPoint]?.term} :</span>
              <span className="font-mono">{points[selectedPoint]?.val} {isGpa ? '/ 5.0' : '%'}</span>
            </div>
            <p className="text-[10px] text-gray-550 leading-relaxed font-semibold">
              {points[selectedPoint]?.details}
            </p>
          </div>
        </div>
      </div>

      {/* SERVICES GRID SECTION (Academic File, Saved lectures, Downloads, Payments, Notifications, Support, About) */}
      <div className="px-4 space-y-4">
        {/* Section Title */}
        <h3 className="font-extrabold text-xs text-brand-dark dark:text-white px-1">الخدمات والأدوات الذكية المتاحة</h3>
        
        {/* Services Icons Matrix */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Academic File */}
          <button
            type="button"
            onClick={() => setActiveSubSection('academic')}
            className={`p-3 rounded-2xl flex flex-col items-start text-right border transition active:scale-95 cursor-pointer ${
              activeSubSection === 'academic' 
                ? 'bg-[#041B4D] border-brand-gold text-white' 
                : 'bg-white dark:bg-slate-900 border-gray-120 dark:border-slate-800 hover:border-brand-blue/30 text-brand-dark dark:text-white'
            }`}
          >
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-300 rounded-xl mb-2.5">
              <GraduationCap size={16} />
            </div>
            <div className="text-[11px] font-black">الملف الدراسي الأكاديمي</div>
            <p className="text-[8px] text-[#707e94] mt-0.5 truncate w-full">تفاصيل القيد الجامعي والساعات</p>
          </button>

          {/* 2. Saved Lectures */}
          <button
            type="button"
            onClick={() => setActiveSubSection('saved-lectures')}
            className={`p-3 rounded-2xl flex flex-col items-start text-right border transition active:scale-95 cursor-pointer ${
              activeSubSection === 'saved-lectures' 
                ? 'bg-[#041B4D] border-brand-gold text-white' 
                : 'bg-white dark:bg-slate-900 border-gray-120 dark:border-slate-800 hover:border-brand-blue/30 text-brand-dark dark:text-white'
            }`}
          >
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-brand-gold dark:text-brand-gold rounded-xl mb-2.5">
              <Bookmark size={16} />
            </div>
            <div className="text-[11px] font-black">المذكرات والمحاضرات المفضلة</div>
            <p className="text-[8px] text-[#707e94] mt-0.5 truncate w-full">المراجعات المؤرشفة والمذاكرة</p>
          </button>

          {/* 3. Downloads */}
          <button
            type="button"
            onClick={() => setActiveSubSection('downloads')}
            className={`p-3 rounded-2xl flex flex-col items-start text-right border transition active:scale-95 cursor-pointer ${
              activeSubSection === 'downloads' 
                ? 'bg-[#041B4D] border-brand-gold text-white' 
                : 'bg-white dark:bg-slate-900 border-gray-120 dark:border-slate-800 hover:border-brand-blue/30 text-brand-dark dark:text-white'
            }`}
          >
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl mb-2.5">
              <Download size={16} />
            </div>
            <div className="text-[11px] font-black">مركز تنزيل الملازم PDF</div>
            <p className="text-[8px] text-[#707e94] mt-0.5 truncate w-full">حقائب الشرح والتسريبات والتطبيقات</p>
          </button>

          {/* 4. Payments */}
          <button
            type="button"
            onClick={() => setActiveSubSection('payments')}
            className={`p-3 rounded-2xl flex flex-col items-start text-right border transition active:scale-95 cursor-pointer ${
              activeSubSection === 'payments' 
                ? 'bg-[#041B4D] border-brand-gold text-white' 
                : 'bg-white dark:bg-slate-900 border-gray-120 dark:border-slate-800 hover:border-brand-blue/30 text-brand-dark dark:text-white'
            }`}
          >
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl mb-2.5">
              <CreditCard size={16} />
            </div>
            <div className="text-[11px] font-black">الرسوم والمدفوعات الأكاديمية</div>
            <p className="text-[8px] text-[#707e94] mt-0.5 truncate w-full">فواتير الكلية وإيصال السداد المالي</p>
          </button>

          {/* 5. Notifications */}
          <button
            type="button"
            onClick={() => setActiveSubSection('notifications')}
            className={`p-3 rounded-2xl flex flex-col items-start text-right border transition active:scale-95 cursor-pointer ${
              activeSubSection === 'notifications' 
                ? 'bg-[#041B4D] border-brand-gold text-white' 
                : 'bg-white dark:bg-slate-900 border-gray-120 dark:border-slate-800 hover:border-brand-blue/30 text-brand-dark dark:text-white'
            }`}
          >
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-xl mb-2.5">
              <Bell size={16} />
            </div>
            <div className="text-[11px] font-black">التنبيهات وتفضيلات الإشعارات</div>
            <p className="text-[8px] text-[#707e94] mt-0.5 truncate w-full">صندوق الإشعارات الواردة وضبط الصوت</p>
          </button>

          {/* 6. Support */}
          <button
            type="button"
            onClick={() => setActiveSubSection('support')}
            className={`p-3 rounded-2xl flex flex-col items-start text-right border transition active:scale-95 cursor-pointer ${
              activeSubSection === 'support' 
                ? 'bg-[#041B4D] border-brand-gold text-white' 
                : 'bg-white dark:bg-slate-900 border-gray-120 dark:border-slate-800 hover:border-brand-blue/30 text-brand-dark dark:text-white'
            }`}
          >
            <div className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-605 dark:text-teal-400 rounded-xl mb-2.5">
              <MessageSquare size={16} />
            </div>
            <div className="text-[11px] font-black">الدعم والمناقشة الفنية المباشرة</div>
            <p className="text-[8px] text-[#707e94] mt-0.5 truncate w-full">رفع التذاكر والتواصل مع المشرف</p>
          </button>
        </div>

        {/* 7. About Platform (Full width button) */}
        <button
          type="button"
          onClick={() => setActiveSubSection('about')}
          className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-right border transition active:scale-95 cursor-pointer ${
            activeSubSection === 'about' 
              ? 'bg-[#041B4D] border-brand-gold text-white' 
              : 'bg-white dark:bg-slate-900 border-gray-120 dark:border-slate-800 hover:border-brand-blue/30 text-brand-dark dark:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300 rounded-xl">
              <Info size={16} />
            </div>
            <div>
              <div className="text-[11px] font-black">عن منصة بن عون التعليمية</div>
              <p className="text-[8px] text-[#707e94] mt-0.5">اتفاقيات الاستخدام وإصدار تطبيق الويب المثالي</p>
            </div>
          </div>
          <ChevronLeft size={14} className="text-gray-400" />
        </button>
      </div>

      {/* SELECTED DRAWER / SHEET CONTAINER (White card layouts for service results) */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          {activeSubSection !== 'none' && (
            <motion.div 
              key={activeSubSection}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-120 dark:border-slate-800 p-5 shadow-md relative"
            >
              {/* Box Close Indicator */}
              <button
                type="button"
                onClick={() => setActiveSubSection('none')}
                className="absolute top-4 left-4 p-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:text-white cursor-pointer"
              >
                <ArrowRight size={14} className="rotate-180" />
              </button>

              {/* Service Subviews Details */}

              {/* Academic File detail View */}
              {activeSubSection === 'academic' && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-[#041B4D] dark:text-brand-gold border-r-4 border-brand-gold pr-2">
                    الملف الأكاديمي والبيانات الجامعية
                  </h4>
                  <div className="divide-y divide-gray-100 dark:divide-slate-800 text-[11px] font-semibold">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-gray-400">الاسم بالكامل</span>
                      <span className="text-brand-dark dark:text-white">{user.fullName || user.username}</span>
                    </div>
                    {user.studentId && (
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-gray-400">الرقم الموحد المالي</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-brand-gold font-black">{user.studentId}</span>
                          <button onClick={copyStudentId} className="p-1 text-gray-400 hover:text-brand-gold cursor-pointer">
                            {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="py-2.5 flex justify-between">
                      <span className="text-gray-400">الجامعة والكلية</span>
                      <span className="text-brand-dark dark:text-white">{universityInput || '—'} / {collegeInput || '—'}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-gray-400">القسم الدراسي والمرحلة</span>
                      <span className="text-brand-dark dark:text-white">{departmentInput || 'تخصص عام'} - {levelInput}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-gray-400">السنة الأكاديمية الحالية</span>
                      <span className="text-[#D4A63D]">{academicYearInput}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-gray-400">الساعات الأكاديمية المعترف بها</span>
                      <span className="text-emerald-600 font-bold">54 ساعة أكاديمية مجتازة</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Saved Lectures detail View */}
              {activeSubSection === 'saved-lectures' && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-[#041B4D] dark:text-brand-gold border-r-4 border-amber-500 pr-2">
                    المحاضرات المؤكدة والملازم المحفوظة ({subjects.length})
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1.5 border border-gray-100 dark:border-slate-800 text-[11px] font-semibold text-right">
                      <div className="text-[11px] font-black text-brand-dark dark:text-white">تطبيقات الخرسانة الفائقة في الهندسة والمباني الميدانية</div>
                      <p className="text-[9px] text-gray-500">مادة الهندسة المتقدمة · مدة الفيديو: 45 دقيقة</p>
                      <button 
                        type="button" 
                        onClick={() => alert('تم توجيهك لشاشة تشغيل مشغل الفيديو التفاعلي في تبويب المحاضرات الرئيسية!')}
                        className="py-1 px-3 bg-brand-gold text-white text-[9px] font-bold rounded-lg cursor-pointer"
                      >
                        شاهد الآن 🎥
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1.5 border border-gray-100 dark:border-slate-800 text-[11px] font-semibold text-right">
                      <div className="text-[11px] font-black text-brand-dark dark:text-white">ملخص الإحصاء الطبي والحيوي وقواعد التحليل v3</div>
                      <p className="text-[9px] text-gray-500">حقيبة مادة الرياضيات والتصميم الطبي · PDF - 14 صفحة</p>
                      <button 
                        type="button" 
                        onClick={() => alert('جاري تنزيل ملف PDF المرجعي المحفوظ!')}
                        className="py-1 px-3 bg-brand-gold text-white text-[9px] font-bold rounded-lg cursor-pointer"
                      >
                        تنزيل الملزمة الملحقة 📄
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Downloads list with progressive downloading progress */}
              {activeSubSection === 'downloads' && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-[#041B4D] dark:text-brand-gold border-r-4 border-emerald-500 pr-2">
                    المذكرات الأكاديمية المتاحة للتنزيل المباشر
                  </h4>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    اضغط على أي ملف لبدء تنزيله المباشر على جهازك لمذاكرته بلا إنترنت:
                  </p>
                  
                  <div className="space-y-3">
                    {[
                      { id: '1', title: 'حقيبة تسريبات اختبار كفايات ومسارات بن عون الشاملة.pdf', size: '14.2 MB' },
                      { id: '2', title: 'ملزمة الشرح وتفكيك الأسئلة الهندسية النموذجية 2026.pdf', size: '8.4 MB' },
                      { id: '3', title: 'موجز قواعد الكيمياء العضوية والتحاليل المعملية v2.pdf', size: '6.9 MB' }
                    ].map(f => (
                      <div key={f.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-start text-right text-[11px] font-semibold">
                          <div>
                            <div className="text-[11px] font-black text-brand-dark dark:text-white truncate max-w-[200px]">{f.title}</div>
                            <span className="text-[9px] text-gray-400">{f.size}</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => startFileDownload(f.id)}
                            disabled={downloadProgress[f.id] > 0}
                            className={`p-1.5 rounded-lg text-white transition ${downloadCompleted[f.id] ? 'bg-emerald-600' : 'bg-brand-gold hover:bg-yellow-500 cursor-pointer'}`}
                          >
                            {downloadCompleted[f.id] ? <Check size={12} /> : <Download size={12} />}
                          </button>
                        </div>

                        {/* Progress Bar */}
                        {downloadProgress[f.id] > 0 && (
                          <div className="space-y-1">
                            <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-brand-gold h-1.5 rounded-full transition-all duration-150"
                                style={{ width: `${downloadProgress[f.id]}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] text-gray-400 font-mono">
                              <span>يجري التنزيل الفوري...</span>
                              <span>{downloadProgress[f.id]}%</span>
                            </div>
                          </div>
                        )}
                        {downloadCompleted[f.id] && (
                          <p className="text-[8px] text-emerald-600 font-bold animate-pulse text-left">
                            ✓ تم الحفظ محلياً في مجلد المستندات بجهازك!
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments & fee receipts View */}
              {activeSubSection === 'payments' && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-[#041B4D] dark:text-brand-gold border-r-4 border-purple-500 pr-2">
                    الرسوم الدراسية وحالة الفواتير المالية
                  </h4>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-550/30 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center justify-between text-[11px] font-black">
                    <span>حالة الرسوم الإجمالية للترم</span>
                    <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[9px]">مسدد بالكامل ✓</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-gray-150 text-[11px] font-semibold space-y-2 text-right">
                    <div className="font-black text-brand-dark dark:text-white">الفصل الدراسي الأول - السداد العام</div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>رقم الفاتورة: <span className="font-mono text-[#D4A63D]">#INV-28492</span></div>
                      <div>وسيلة الدفع: <span>بوابة مدى الائتمانية</span></div>
                      <div>رسوم الدورة الصيفية: <span>1,500 ريال سعودي</span></div>
                      <div>رسوم الكتب والتسجيل: <span>1,000 ريال سعودي</span></div>
                    </div>
                  </div>

                  {/* Submission and upload portal receipt */}
                  <div className="pt-2 border-t border-gray-100 space-y-2.5">
                    <h5 className="font-bold text-[10px] text-brand-dark dark:text-white">هل قمت بالتحويل الخارجي يدوياً؟ ارفق إيصال التحويل ههنا:</h5>
                    {receiptSubmitted ? (
                      <div className="p-3 bg-teal-50 dark:bg-slate-950 text-teal-800 dark:text-teal-400 border border-teal-200 rounded-xl text-center text-[10px] font-bold animate-fade-in">
                        ✓ تم تسليم ملف إيصال الدفع البنكي؛ بانتظار مراجعته من المحاسب الميداني للمنصة.
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={uploadFeeReceipt}
                          disabled={uploadingReceipt}
                          className="flex-grow py-2 bg-brand-dark hover:bg-brand-blue text-white rounded-lg text-[10px] font-black transition cursor-pointer"
                        >
                          {uploadingReceipt ? 'جاري رفع الملف آمن...' : 'اختر وارفع صورة إشعار السداد البنكي'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notifications and push options */}
              {activeSubSection === 'notifications' && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-[#041B4D] dark:text-brand-gold border-r-4 border-rose-500 pr-2">
                    تفضيلات الإشعارات والتنبيهات الذكية
                  </h4>
                  <div className="space-y-3.5 pt-1 text-[11px] font-semibold text-gray-650 dark:text-gray-300">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
                      <span>إشعارات رفع تسريبات واختبارات جديدة</span>
                      <button type="button" className="w-9 h-5 bg-brand-gold rounded-full transition-all relative">
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full translate-x-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
                      <span>التواصل والتراسل عبر غرف النقاش والدردشة</span>
                      <button type="button" className="w-9 h-5 bg-brand-gold rounded-full transition-all relative">
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full translate-x-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
                      <span>رسائل ومتابعات الدعم الفني بمجرد الرد</span>
                      <button type="button" className="w-9 h-5 bg-brand-gold rounded-full transition-all relative">
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full translate-x-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Support & help module (Active ticket board and Telegram message dispatch) */}
              {activeSubSection === 'support' && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-[#041B4D] dark:text-brand-gold border-r-4 border-teal-500 pr-2">
                    مركز الدعم والمحادثة الميدانية للأكاديمية
                  </h4>
                  
                  {activeChatTicketId ? (
                    (() => {
                      const t = supportTickets.find(ticket => ticket.id === activeChatTicketId);
                      if (!t) return null;
                      const msgs = t.messages || [];
                      return (
                        <div className="space-y-3 flex flex-col justify-between min-h-[300px] bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-gray-150">
                          <button 
                            type="button" 
                            onClick={() => setActiveChatTicketId(null)}
                            className="text-[9px] font-black text-brand-gold flex items-center gap-1 hover:underline cursor-pointer text-right bg-transparent border-0"
                          >
                            <ArrowRight size={10} />
                            <span>العودة لجميع التذاكر ومحادثات الدعم</span>
                          </button>

                          <div className="flex-grow overflow-y-auto max-h-[160px] space-y-2 pr-1 no-scrollbar pt-2">
                            {msgs.map((m, idx) => {
                              const isAdmin = m.senderRole === 'admin';
                              return (
                                <div key={idx} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                                  <span className="text-[8px] text-gray-400 font-bold px-1">{m.senderName}</span>
                                  <div className={`p-2 rounded-xl text-[10px] leading-normal text-right shadow-xs ${isAdmin ? 'bg-amber-50 text-brand-dark rounded-tr-none' : 'bg-[#041B4D] text-white rounded-tl-none'}`}>
                                    {m.message}
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                          </div>

                          <form 
                            onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(t.id, chatInputText); }}
                            className="flex gap-1.5 items-center bg-white dark:bg-slate-800 border p-1 rounded-lg"
                          >
                            <input 
                              required
                              type="text"
                              value={chatInputText}
                              onChange={(e) => setChatInputText(e.target.value)}
                              placeholder="اكتب ردك أو استفسارك هنا..."
                              className="flex-grow bg-transparent text-[10px] p-1.5 focus:outline-none dark:text-white"
                            />
                            <button type="submit" className="p-1.5 rounded-lg bg-brand-gold text-white cursor-pointer hover:bg-yellow-500">
                              <Send size={11} />
                            </button>
                          </form>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-3">
                      <form onSubmit={handleSendSupport} className="space-y-2">
                        {user.email === 'abdulmlikoog@gmail.com' && (
                          <div className="bg-amber-500/10 p-2 rounded-xl text-[9px] font-bold">
                            <span>⚙️ ممرر محاكاة الطالب:</span>
                            <div className="flex gap-2 mt-1">
                              <button type="button" onClick={() => setSupportSenderRole('self')} className={`px-2 py-0.5 rounded ${supportSenderRole==='self'?'bg-[#041B4D] text-white':'bg-white text-gray-700'}`}>أنا المشرف</button>
                              <button type="button" onClick={() => setSupportSenderRole('simulated_ahmed')} className={`px-2 py-0.5 rounded ${supportSenderRole==='simulated_ahmed'?'bg-[#041B4D] text-white':'bg-white text-gray-700'}`}>أنا الطالب أحمد</button>
                            </div>
                          </div>
                        )}
                        <textarea
                          required
                          value={supportMsg}
                          onChange={(e) => setSupportMsg(e.target.value)}
                          placeholder="اكتب رسالتك وبدء تذكرة نقاش جديدة بالتليجرام..."
                          rows={2}
                          className="w-full text-[11px] p-2 bg-white dark:bg-slate-950 border rounded-xl text-right focus:border-brand-gold focus:outline-none dark:text-white"
                        />
                        <button type="submit" className="w-full py-1.5 bg-brand-gold hover:bg-yellow-500 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer">
                          إرسال التذكرة وبدء مراسلة المشرف الميداني
                        </button>
                      </form>

                      {/* Ticket History */}
                      {supportTickets.length > 0 && (
                        <div className="space-y-2 max-h-[140px] overflow-y-auto no-scrollbar pt-2 border-t">
                          <span className="text-[9px] font-black block text-gray-500">تذاكر الدعم والإنقاذ الجارية:</span>
                          {supportTickets.map(ticket => (
                            <div key={ticket.id} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border flex justify-between items-center text-[10px]">
                              <div>
                                <span className="font-extrabold block truncate max-w-[120px]">{ticket.senderName}</span>
                                <span className="text-[8px] text-gray-400">{ticket.createdAt}</span>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setActiveChatTicketId(ticket.id)}
                                className="px-2 py-1 bg-brand-gold text-white rounded text-[9px] font-bold"
                              >
                                افتح المحادثة
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* About educational portal */}
              {activeSubSection === 'about' && (
                <div className="space-y-4 text-right">
                  <h4 className="font-extrabold text-xs text-[#041B4D] dark:text-brand-gold border-r-4 border-gray-400 pr-2">
                    عن منصة بن عون التعليمية الشاملة
                  </h4>
                  <div className="text-[11px] text-gray-650 dark:text-gray-300 leading-relaxed space-y-2.5">
                    <p>
                      نحن نقدم لك بيئة دراسية متكاملة تهدف إلى تمهيد طريق التميز الأكاديمي والتحصيل الجامعي الرائد. جميع المقررات والاختبارات تم إعدادها وتدقيقها بالكامل من قبل كبار الأكاديميين ذوي الخبرة الطويلة.
                    </p>
                    <div className="p-3 bg-brand-gold/10 rounded-xl space-y-1 text-[#041B4D] dark:text-brand-gold">
                      <div>إصدار المنصة الأكاديمي: <span className="font-mono">v4.2.0-Stable</span></div>
                      <div>الترخيص والمزامنة: <span className="font-black">فوري عبر Firebase</span></div>
                      <div>حقوق الطبع والتحول الأكاديمي محفوظة © 2026</div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DETAILED STUDENT FIELDS EDITING SCREEN */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-4"
          >
            <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-120 dark:border-slate-800 space-y-4 shadow-sm text-right">
              <div className="border-b pb-2.5 flex justify-between items-center border-gray-100 dark:border-slate-800">
                <span className="font-black text-xs text-brand-dark dark:text-white flex items-center gap-1">
                  <User size={14} className="text-brand-gold" />
                  <span>تعديل السيرة والبيانات الأكاديمية</span>
                </span>
                <button type="button" onClick={() => setIsEditing(false)} className="text-[10px] font-bold text-gray-400 hover:text-brand-dark">إلغاء</button>
              </div>

              <div className="space-y-3 font-semibold text-[11px]">
                {/* Full name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">الاسم الثلاثي أو المستعار بالمنصة</label>
                  <input 
                    type="text" 
                    required 
                    value={fullNameInput} 
                    onChange={e => setFullNameInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 p-2 border rounded-xl text-right text-[11px] font-semibold dark:text-white"
                  />
                </div>

                {/* Academic stage */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">القسم للتخصص والمجموعة</label>
                  <input 
                    type="text" 
                    value={departmentInput} 
                    onChange={e => setDepartmentInput(e.target.value)}
                    placeholder="مثال: هندسة البرمجيات"
                    className="w-full bg-slate-50 dark:bg-slate-950 p-2 border rounded-xl text-right text-[11px] font-semibold dark:text-white"
                  />
                </div>

                {/* Stage Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">المستوى الدراسي</label>
                    <select 
                      value={levelInput} 
                      onChange={e => setLevelInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 p-2 border rounded-xl text-right text-[11px] font-semibold dark:text-white cursor-pointer"
                    >
                      <option value="بكالوريوس">بكالوريوس</option>
                      <option value="ماجستير">ماجستير</option>
                      <option value="دكتوراه">دكتوراه</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">السنة الأكاديمية</label>
                    <select 
                      value={academicYearInput} 
                      onChange={e => setAcademicYearInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 p-2 border rounded-xl text-right text-[11px] font-semibold dark:text-white cursor-pointer"
                    >
                      <option value="سنة أولى">سنة أولى</option>
                      <option value="سنة ثانية">سنة ثانية</option>
                      <option value="سنة ثالثة">سنة ثالثة</option>
                      <option value="سنة رابعة">سنة رابعة</option>
                    </select>
                  </div>
                </div>

                {/* Telephone */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">رقم تحالف التليجرام الخاص بك</label>
                  <input 
                    type="text" 
                    placeholder="@telegram_id" 
                    value={telegramInput} 
                    onChange={e => setTelegramInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 p-2 border rounded-xl text-left font-mono text-[11px] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-[#041B4D] hover:bg-[#071B3B] text-white rounded-xl text-[11px] font-bold"
                >
                  {isSaving ? 'جاري الحفظ الآمن...' : 'حفظ التحديثات'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)} 
                  className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl text-[11px] hover:bg-gray-250 cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GENERAL UTILITIES BOX (Dark mode + secure logout) */}
      <div className="px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-120 dark:border-slate-800 overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 shadow-sm text-right">
          
          {/* Admin panel redirect */}
          {user.email === 'abdulmlikoog@gmail.com' && (
            <div 
              onClick={() => onNavigateToTab('admin')}
              className="p-3.5 flex justify-between items-center hover:bg-red-500/5 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-600 dark:bg-red-950/20 rounded-xl">
                  <Shield size={14} className="animate-pulse" />
                </div>
                <span className="text-[11px] font-black text-red-600 dark:text-red-400">لوحة تحكم المسؤول العام للكلية</span>
              </div>
              <ChevronLeft size={14} className="text-red-300" />
            </div>
          )}

          {/* Secure Dark Mode Toggle */}
          <div className="p-3.5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 rounded-xl">
                {darkMode ? <Sun size={14} className="text-brand-gold" /> : <Moon size={14} />}
              </div>
              <span className="text-[11px] font-black text-gray-700 dark:text-gray-300">الوضع المظلم المريح للعين</span>
            </div>
            <button
              onClick={() => onToggleDarkMode(!darkMode)}
              className={`w-10 h-5.5 rounded-full p-0.5 cursor-pointer transition-colors flex items-center ${darkMode ? 'bg-brand-gold justify-end' : 'bg-gray-200 dark:bg-slate-800 justify-start'}`}
            >
              <span className="w-4.5 h-4.5 bg-white rounded-full shadow-md" />
            </button>
          </div>

          {/* Safe PWA integration */}
          {deferredPrompt && (
            <div 
              onClick={onInstallApp}
              className="p-3.5 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-brand-gold dark:bg-amber-950/20 rounded-xl">
                  <Download size={14} className="animate-bounce" />
                </div>
                <span className="text-[11px] font-black text-gray-700 dark:text-gray-300">تحميل تطبيق "بن عون" على الشاشة</span>
              </div>
              <ChevronLeft size={14} className="text-gray-400" />
            </div>
          )}

          {/* Secure application logout action */}
          {showLogoutConfirm ? (
            <div className="p-4 bg-rose-50/75 dark:bg-rose-950/10 space-y-3 transition-colors">
              <p className="text-[10px] font-black text-rose-800 dark:text-rose-400 text-center">هل متأكد من رغبتك بتسجيل خروج حسابك؟</p>
              <div className="flex gap-2">
                <button onClick={() => onLogout()} className="flex-1 py-1.5 bg-rose-600 scroll-smooth hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold">تسجيل الخروج الآمن</button>
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-1.5 bg-white border text-gray-600 rounded-lg text-[10px] font-bold cursor-pointer">إلغاء التراجع</button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setShowLogoutConfirm(true)}
              className="p-3.5 flex justify-between items-center hover:bg-rose-500/5 transition cursor-pointer text-rose-600"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-rose-600 dark:bg-red-950/20 rounded-xl">
                  <LogOut size={14} />
                </div>
                <span className="text-[11px] font-black">تسجيل الخروج الآمن الفوري</span>
              </div>
              <ChevronLeft size={14} className="text-rose-300" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
