import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Layers, 
  Trash2, 
  PlusCircle, 
  ShieldAlert, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  UserCheck, 
  Award,
  BookMarked,
  Sparkles,
  RefreshCw,
  Search,
  Mail,
  Smartphone,
  Check,
  X,
  Lock,
  LockOpen
} from 'lucide-react';
import { User, Subject, SupportTicket } from '../types';

interface AdminDashboardProps {
  user: User;
  subjects: Subject[];
  onUpdateSubjects: (updated: Subject[]) => void;
  onNavigateToTab: (tab: any) => void;
  subjectLecturesMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf' }[]>;
  onUpdateSubjectLectures: (updatedMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf' }[]>) => void;
  isEmbedded?: boolean;
  supportTickets?: SupportTicket[];
  onUpdateSupportTickets?: (updated: SupportTicket[]) => void;
}

interface SimulatedStudent {
  username: string;
  email: string;
  telegram: string;
  scorePct?: number;
  completedCount?: number;
  signUpDate: string;
}

export default function AdminDashboard({ 
  user, 
  subjects, 
  onUpdateSubjects,
  onNavigateToTab,
  subjectLecturesMap,
  onUpdateSubjectLectures,
  isEmbedded = false,
  supportTickets = [],
  onUpdateSupportTickets
}: AdminDashboardProps) {
  // Guard clause for safety
  if (user.email !== 'abdulmlikoog@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 h-full min-h-[500px]">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-500 animate-pulse">
          <ShieldAlert size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-brand-dark dark:text-white">غير مصرح بالدخول</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
            هذه اللوحة الحيوية مخصصة فقط لمشرف المنصة العام المعتمد والبريد المالي المرخص <strong>(abdulmlikoog@gmail.com)</strong>.
          </p>
        </div>
        <button 
          onClick={() => onNavigateToTab('home')}
          className="px-6 py-2.5 bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark rounded-xl text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  // State Management
  const [students, setStudents] = useState<SimulatedStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentTelegram, setNewStudentTelegram] = useState('');
  
  // Custom subject controls
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editCompletedCount, setEditCompletedCount] = useState(0);

  // Required documents dynamic states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'math');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDuration, setNewDocDuration] = useState('');
  const [newDocType, setNewDocType] = useState<'pdf' | 'video'>('pdf');

  // Broadcast
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Support Reply state
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  const handleReplyTicket = (ticketId: string) => {
    const text = replyTexts[ticketId] || '';
    if (!text.trim()) {
      alert('الرجاء كتابة رد أولاً قبل الإرسال.');
      return;
    }
    
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')} ${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;
    
    const updated = supportTickets.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          reply: text.trim(),
          repliedAt: formattedDate
        };
      }
      return ticket;
    });

    if (onUpdateSupportTickets) {
      onUpdateSupportTickets(updated);
    }
    
    // Clear reply text
    setReplyTexts(prev => ({
      ...prev,
      [ticketId]: ''
    }));

    addLog(`تم الرد على بطاقة الدعم الفني رقم #${ticketId} بنجاح.`);
    alert('✓ تم إرسال الرد الفوري للطالب وسيظهر في حسابه في الحال!');
  };

  useEffect(() => {
    // Load student database
    const savedStudents = localStorage.getItem('admin_simulated_students');
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    } else {
      const initialMockStudents: SimulatedStudent[] = [
        { username: 'عبدالملك بن عون', email: 'abdulmlikoog@gmail.com', telegram: '@abdulmlik_ou', scorePct: 98, completedCount: 22, signUpDate: '2026/05/29' },
        { username: 'أحمد الصالح', email: 'ahmed.salih@gmail.com', telegram: '@ahmed_salih99', scorePct: 84, completedCount: 14, signUpDate: '2026/05/30' },
        { username: 'سارة العتيبي', email: 'sara.otb@outlook.com', telegram: '@sara_otb', scorePct: 92, completedCount: 19, signUpDate: '2026/05/31' },
         { username: 'محمد الحربي', email: 'm.harbi@gmail.com', telegram: '@m_harbi9', scorePct: 79, completedCount: 9, signUpDate: '2026/05/31' }
      ];
      setStudents(initialMockStudents);
      localStorage.setItem('admin_simulated_students', JSON.stringify(initialMockStudents));
    }

    addLog('تم تشغيل لوحة التحكم ومزامنة نظام تليجرام الإلزامي بنجاح.');
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentTelegram.trim()) {
      alert('الرجاء كتابة جميع الحقول لإضافة الطالب بنجاح.');
      return;
    }

    let telegramForm = newStudentTelegram.trim();
    if (!telegramForm.startsWith('@')) {
      telegramForm = '@' + telegramForm;
    }

    // Email pattern check
    if (!newStudentEmail.includes('@')) {
      alert('الرجاء التأكد من كتابة البريد الإلكتروني بالشكل الصحيح.');
      return;
    }

    const newStudent: SimulatedStudent = {
      username: newStudentName.trim(),
      email: newStudentEmail.trim(),
      telegram: telegramForm,
      scorePct: Math.floor(Math.random() * 31) + 70, // 70 to 100
      completedCount: Math.floor(Math.random() * 12) + 1,
      signUpDate: new Date().toISOString().split('T')[0].replace(/-/g, '/')
    };

    const updated = [newStudent, ...students];
    setStudents(updated);
    localStorage.setItem('admin_simulated_students', JSON.stringify(updated));
    
    addLog(`تم تسجيل الطالب الجديد: ${newStudent.username} وإسناد حساب التليجرام ${newStudent.telegram}`);
    
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentTelegram('');
    alert('✓ تمت إضافة الطالب الجديد بنجاح وإسناد حساب تليجرام الإلزامي!');
  };

  const handleDeleteStudent = (email: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الطالب (${name}) من قاعدة البيانات المدرسية المعتمدة؟`)) {
      const updated = students.filter(s => s.email !== email);
      setStudents(updated);
      localStorage.setItem('admin_simulated_students', JSON.stringify(updated));
      addLog(`تمت إزالة العضوية والوصول لـ ${name}`);
    }
  };

  const handleUpdateLectures = (subjectId: string) => {
    const orig = subjects.find(s => s.id === subjectId);
    if (!orig) return;
    
    if (editCompletedCount < 0 || editCompletedCount > orig.lecturesCount) {
      alert(`تنبيه: القيمة يجب أن تكون ما بين 0 و ${orig.lecturesCount}`);
      return;
    }

    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, completedLectures: editCompletedCount };
      }
      return s;
    });

    onUpdateSubjects(updated);
    setEditingSubjectId(null);
    addLog(`تعديل محاضرات مادة ${orig.nameAr} إلى ${editCompletedCount}/${orig.lecturesCount}`);
    alert('✓ تم تعديل المحاضرات المنجزة بنجاح لجميع الطلاب في سجلات المنصة.');
  };

  const handlePublishDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) {
      alert('الرجاء كتابة عنوان للمستند الجديد الدراسي.');
      return;
    }
    
    const newDoc = {
      title: newDocTitle.trim(),
      duration: newDocDuration.trim() || 'مستند مالي معتمد',
      type: newDocType
    };

    const currentSubjectDocs = subjectLecturesMap[selectedSubjectId] || [];
    const updatedDocs = [...currentSubjectDocs, newDoc];

    const updatedMap = {
      ...subjectLecturesMap,
      [selectedSubjectId]: updatedDocs
    };

    onUpdateSubjectLectures(updatedMap);
    
    // Increment lecturesCount automatically for this subject of subjects list
    const updatedSubjects = subjects.map(s => {
      if (s.id === selectedSubjectId) {
        return { ...s, lecturesCount: s.lecturesCount + 1 };
      }
      return s;
    });
    onUpdateSubjects(updatedSubjects);

    const matchSubName = subjects.find(s => s.id === selectedSubjectId)?.nameAr || selectedSubjectId;
    addLog(`تم نشر مستند مطلوب لمادة (${matchSubName}): ${newDoc.title}`);
    
    setNewDocTitle('');
    setNewDocDuration('');
    alert('✓ تم نشر وتعميم المستند الدراسي المطلوب بنجاح على جميع الطلاب!');
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSent(true);
    addLog(`جارٍ إرسال بث عاجل لـ ${students.length} تليجرام...`);
    
    setTimeout(() => {
      setBroadcastSent(false);
      addLog(`تم بث الرسالة بنجاح: "${broadcastMessage.substring(0, 30)}..."`);
      setBroadcastMessage('');
      alert('🚀 تم إرسال الإشعار والتنبيه المباشر لجميع قنوات وتليجرام الطلاب المسجلين بالكامل!');
    }, 1200);
  };

  // Safe Stats Compute
  const overallAvgCompletion = Math.round(
    (subjects.reduce((acc, s) => acc + s.completedLectures, 0) / 
    subjects.reduce((acc, s) => acc + s.lecturesCount, 0)) * 100
  ) || 0;

  // Search filter
  const filteredStudents = students.filter(s => 
    s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.telegram.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right pb-10 select-none animate-fade-in" style={{ direction: 'rtl' }}>
      
      {/* Dynamic Header Badge & Real-time Info */}
      {!isEmbedded && (
        <div className="bg-gradient-to-l from-brand-dark to-slate-800 dark:from-slate-900 dark:to-slate-950 p-5 rounded-3xl border border-brand-gold/25 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-brand-gold/5 rounded-full blur-xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-2.5 py-0.5 rounded-full">
                  مركز التحكم المعتمد
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none font-sans">لوحة تحكم المشرف العام</h1>
              <p className="text-[11px] text-gray-300 font-medium font-sans">
                البريد النشط: <span className="font-mono text-brand-gold underline font-bold">abdulmlikoog@gmail.com</span>
              </p>
            </div>

            <div className="flex items-center gap-2 bg-black/30 dark:bg-slate-900/40 border border-white/5 py-1.5 px-3 rounded-2xl self-start md:self-auto">
              <Award size={16} className="text-brand-gold shrink-0 animate-bounce" />
              <div className="text-right">
                <p className="text-[9px] text-gray-300 font-bold leading-tight">حالة النظام المالي</p>
                <p className="text-[11px] font-extrabold text-emerald-400">نشط ومتزامن 100%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Bento Key Metric Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Metric A */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs relative overflow-hidden hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-brand-gold">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
              <Users size={18} />
            </div>
            <span className="text-[9px] text-gray-400 font-black">إجمالي الطلاب</span>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-brand-dark dark:text-white font-sans">{students.length}</h4>
            <p className="text-[10px] text-gray-400">طلاب نشيطين بالمنصة</p>
          </div>
        </div>

        {/* Metric B */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs relative overflow-hidden hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-emerald-500">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
              <Layers size={18} />
            </div>
            <span className="text-[9px] text-gray-400 font-black">تحصيل المنهج</span>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-brand-dark dark:text-white font-sans">{overallAvgCompletion}%</h4>
            <p className="text-[10px] text-gray-400">إتمام محاضرات الفصل الحالية</p>
          </div>
        </div>

        {/* Metric C */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs relative overflow-hidden hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-brand-blue">
            <div className="p-2 bg-brand-blue/10 dark:bg-slate-800 rounded-xl text-brand-gold">
              <BookOpen size={18} />
            </div>
            <span className="text-[9px] text-gray-400 font-black">المواد النشطة</span>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-brand-dark dark:text-white font-sans">{subjects.length}</h4>
            <p className="text-[10px] text-gray-400">مواد مسجلة في الترم</p>
          </div>
        </div>

        {/* Metric D */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs relative overflow-hidden hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-purple-500">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-xl">
              <Smartphone size={18} />
            </div>
            <span className="text-[9px] text-gray-400 font-black">إجبارية التليجرام</span>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-brand-dark dark:text-white font-sans">100%</h4>
            <p className="text-[10px] text-gray-400">نشاط وحماية المعرفات</p>
          </div>
        </div>

      </div>

      {/* Grid containing Quick Telegram Broadcaster & Subjects Modification */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Module 1: Broadcast Channel Messenger */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-105 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-amber-500/10 text-brand-gold flex items-center justify-center">
                <Send size={15} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-brand-dark dark:text-white">بث إشعارات جماعي فوري</h3>
                <p className="text-[9px] text-gray-400">إرسال التنبيهات المباشرة لجميع الطلاب</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-3.5">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
              سيتم إرسال هذا المنشور المالي أو العلمي لجميع معرفات حسابات تليجرام الطلاب المسجلين بالمنصة بشكل قسري وفوري.
            </p>

            <div className="space-y-2">
              <textarea 
                required
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="مثال: يرجى العلم أنه تم توفير طائفة النماذج الأكاديمية الجديدة من 1 إلى 25 لمواد البرمجة وسلامة الحياة!"
                className="w-full bg-gray-50 dark:bg-slate-850 hover:bg-gray-100/50 border border-gray-150 dark:border-slate-755 rounded-xl text-xs p-3 text-right focus:outline-none focus:border-brand-gold dark:focus:border-brand-gold text-brand-dark dark:text-white font-medium placeholder:text-gray-400 text-right"
              />
            </div>

            <button 
              type="submit"
              disabled={broadcastSent || !broadcastMessage.trim()}
              className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                broadcastSent
                  ? 'bg-gray-300 dark:bg-slate-800 text-gray-500'
                  : 'bg-brand-gold hover:bg-yellow-600 text-white shadow-md active:scale-95'
              }`}
            >
              <Send size={14} className="animate-pulse" />
              <span>{broadcastSent ? 'جاري البث والفرز...' : 'إرسال الرسالة لجميع المعرفات'}</span>
            </button>
          </form>
        </div>

        {/* Module 2: Subject Progression Level Editor */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-105 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-amber-500/10 text-brand-gold flex items-center justify-center">
                <BookMarked size={15} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-brand-dark dark:text-white">تعديل العداد العام</h3>
                <p className="text-[9px] text-gray-400">تعديل العداد العام لجميع المشتركين</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[195px] overflow-y-auto pr-1 no-scrollbar text-xs">
            {subjects.map((sub) => (
              <div 
                key={sub.id} 
                className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 dark:bg-slate-850/80 hover:bg-gray-100/50 dark:hover:bg-slate-800 transition-colors border border-gray-150/10"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 text-brand-gold flex items-center justify-center font-bold">
                    📚
                  </div>
                  <span className="font-extrabold text-gray-700 dark:text-gray-200">{sub.nameAr}</span>
                </div>
                
                <div>
                  {editingSubjectId === sub.id ? (
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number"
                        value={editCompletedCount}
                        onChange={(e) => setEditCompletedCount(parseInt(e.target.value) || 0)}
                        className="w-12 bg-white dark:bg-slate-800 border dark:border-slate-700 text-center font-bold px-1 py-1 rounded-lg text-brand-dark dark:text-white"
                        min={0}
                        max={sub.lecturesCount}
                      />
                      <span className="text-[10px] text-gray-400 font-mono">/ {sub.lecturesCount}</span>
                      <button 
                        onClick={() => handleUpdateLectures(sub.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                      >
                        حفظ
                      </button>
                      <button 
                        onClick={() => setEditingSubjectId(null)}
                        className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-gray-500 dark:text-gray-400 text-[11px]">
                        {sub.completedLectures} من {sub.lecturesCount} منجز
                      </span>
                      <button 
                        onClick={() => {
                          setEditingSubjectId(sub.id);
                          setEditCompletedCount(sub.completedLectures);
                        }}
                        className="text-[10px] font-black text-brand-blue hover:text-brand-gold bg-brand-blue/5 dark:bg-slate-805 px-2 py-0.5 rounded-md"
                      >
                        تعديل
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module 3: Dynamic Required Document Publisher */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-105 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-brand-blue flex items-center justify-center">
                <PlusCircle size={15} className="text-brand-gold" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-brand-dark dark:text-white">نشر مستند مطلوب جديد</h3>
                <p className="text-[9px] text-gray-400">إدراج أوراق العمل والمذكرات للمادة</p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePublishDoc} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-gray-400 block mb-1">المادة</label>
                <select 
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-gray-55/70 dark:bg-slate-850 border border-gray-200 text-[10px] py-1.5 px-2 rounded-xl text-right focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white font-bold"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-400 block mb-1">النوع</label>
                <select 
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as 'pdf' | 'video')}
                  className="w-full bg-gray-55/70 dark:bg-slate-850 border border-gray-200 text-[10px] py-1.5 px-2 rounded-xl text-right focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white font-bold"
                >
                  <option value="pdf">ملف مرجعي / PDF</option>
                  <option value="video">شرح مرئي / فيديو</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-gray-400 block mb-0.5">عنوان المستند التعليمي</label>
              <input 
                type="text" 
                required
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="مثال: ورقة عمل المحاضرة الثالثة"
                className="w-full bg-gray-55/70 dark:bg-slate-850 border border-gray-200 text-[10px] py-1.5 px-3 rounded-xl text-right focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-gray-400 block mb-0.5">ملاحظة قصيرة</label>
              <input 
                type="text" 
                required
                value={newDocDuration}
                onChange={(e) => setNewDocDuration(e.target.value)}
                placeholder="مثال: ملخص شامل ومعتمد"
                className="w-full bg-gray-55/70 dark:bg-slate-850 border border-gray-200 text-[10px] py-1.5 px-3 rounded-xl text-right focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white font-medium"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-2 bg-brand-gold hover:bg-yellow-600 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1"
            >
              <PlusCircle size={13} />
              <span>حفظ ونشر المستند المطلوب للمادة</span>
            </button>
          </form>
        </div>

      </div>

      {/* Module 4: Live Technical Support Tickets Management */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-105 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Mail size={15} className="text-teal-600 dark:text-teal-450" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-brand-dark dark:text-white mt-0.5">مركز وارد الدعم الفني واستفسارات الطلاب</h3>
              <p className="text-[9px] text-gray-400">متابعة الرسائل الواردة والرد عليها فوراً لتصل للطالب</p>
            </div>
          </div>
          <span className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 font-extrabold px-2 py-0.5 rounded-full font-mono">
            {supportTickets.filter(t => !t.reply).length} في الانتظار
          </span>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
          {supportTickets.length > 0 ? (
            supportTickets.map((ticket) => (
              <div key={ticket.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-xl space-y-2.5 text-right text-xs animate-fade-in shadow-sm">
                <div className="flex justify-between items-center sm:flex-row flex-col gap-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-brand-dark dark:text-white">{ticket.senderName}</span>
                    <span className="font-mono text-gray-500 bg-gray-100/70 dark:bg-slate-900/50 dark:text-gray-400 px-1.5 py-0.5 rounded">{ticket.senderEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-450 dark:text-gray-400">{ticket.createdAt}</span>
                    <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${ticket.reply ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-brand-gold dark:bg-amber-955/40 dark:text-amber-400'}`}>
                      {ticket.reply ? '✓ تم الرد' : '🕒 بانتظار الرد'}
                    </span>
                  </div>
                </div>

                <div className="text-gray-850 dark:text-gray-300 font-bold bg-white dark:bg-slate-900 border border-gray-150/60 dark:border-slate-800/60 p-2.5 rounded-lg leading-relaxed text-[11px] select-text">
                  {ticket.message}
                </div>

                {ticket.reply ? (
                  <div className="bg-emerald-50/30 dark:bg-emerald-950/15 border-r-2 border-emerald-500 p-2.5 rounded-lg text-[11px] space-y-0.5">
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[10px]">الرد المرسل سابقاً:</div>
                    <p className="font-bold text-gray-700 dark:text-gray-200 leading-normal">{ticket.reply}</p>
                    {ticket.repliedAt && <span className="block text-[8px] text-gray-400 font-mono pt-0.5">{ticket.repliedAt}</span>}
                  </div>
                ) : (
                  <div className="space-y-2 pt-1.5 border-t border-gray-100 dark:border-slate-800/60">
                    <textarea
                      value={replyTexts[ticket.id] || ''}
                      onChange={(e) => setReplyTexts({ ...replyTexts, [ticket.id]: e.target.value })}
                      rows={2}
                      placeholder="اكتب الرد الرسمي والتعليمي للطالب هنا..."
                      className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-[11px] p-2 text-right focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleReplyTicket(ticket.id)}
                        className="py-1 px-4 bg-brand-gold hover:bg-yellow-600 text-white font-extrabold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={11} />
                        <span>إرسال الرد الفوري</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-450 dark:text-gray-400">
              <Mail size={18} className="mx-auto mb-1 opacity-55 text-brand-gold" />
              <p className="text-[11px] font-bold">لا يوجد أي بطاقات دعم فني حالياً</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Student Database Listing & Administration Container */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-105 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-amber-500/10 text-brand-gold flex items-center justify-center">
              <Users size={15} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-brand-dark dark:text-white">إدارة شؤون وأرصدة الطلاب</h3>
              <p className="text-[10px] text-gray-450 dark:text-gray-400">قاعدة البيانات الرسمية للطلاب المسجلين والمستندين</p>
            </div>
          </div>

          {/* Clean Realtime Search Bar */}
          <div className="relative w-full sm:w-48">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-450">
              <Search size={12} />
            </div>
            <input 
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="البحث عن طالب..."
              className="w-full bg-gray-55/65 dark:bg-slate-850 hover:bg-gray-100/50 border border-gray-150 dark:border-slate-750 text-[10px] pr-8 pl-3 py-1.5 rounded-xl text-right text-brand-dark dark:text-white focus:outline-none focus:border-brand-gold text-right"
            />
          </div>
        </div>

        {/* Student Table/Grid View (Day/Night Harmonized) */}
        <div className="space-y-2.5 max-h-[260px] overflow-y-auto text-xs pr-1 no-scrollbar">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => {
              const isAdmin = student.email === 'abdulmlikoog@gmail.com';
              return (
                <div 
                  key={student.email} 
                  className="p-3.5 bg-gray-50/70 dark:bg-slate-850/70 border border-gray-100 dark:border-slate-800/60 rounded-xl flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-slate-850 text-xs"
                >
                  <div className="space-y-1 my-0.5 max-w-[75%]">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-brand-dark dark:text-white text-sm">
                        {student.username}
                      </span>
                      {isAdmin ? (
                        <span className="text-[8px] bg-amber-500/10 text-brand-gold border border-brand-gold/20 font-black px-1.5 py-0.2 rounded-md">
                          مشرّف عام
                        </span>
                      ) : (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 font-black px-1.5 py-0.2 rounded-md">
                          طالب معتمد
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                      <div className="flex items-center gap-1">
                        <Mail size={10} className="text-gray-400" />
                        <span className="font-mono text-[9px]">{student.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Smartphone size={10} className="text-brand-gold" />
                        <span className="text-brand-gold bg-amber-50 dark:bg-amber-500/10 pl-1.5 pr-1 py-0.2 rounded font-sans font-extrabold text-[9px]">
                          {student.telegram}
                        </span>
                      </div>

                      <div className="text-[9px] text-gray-400 flex items-center gap-2">
                        <span>نسبة الإنجاز: <strong className="text-brand-dark dark:text-white font-sans">{student.completedCount} محاضرات</strong></span>
                        <span className="text-gray-300 dark:text-slate-800">|</span>
                        <span>معدل الاختبار: <strong className="text-brand-dark dark:text-white font-sans">{student.scorePct}%</strong></span>
                        <span className="text-gray-300 dark:text-slate-800">|</span>
                        <span>تاريخ الانضمام: {student.signUpDate}</span>
                      </div>
                    </div>
                  </div>

                  {!isAdmin && (
                    <button 
                      onClick={() => handleDeleteStudent(student.email, student.username)}
                      className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-500/10 dark:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
                      title="حذف الطالب وإلغاء تنشيطه"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 bg-gray-55/65 dark:bg-slate-850 rounded-xl text-gray-400 dark:text-slate-400">
              <AlertTriangle size={20} className="mx-auto text-brand-gold/60 mb-1" />
              <p className="text-xs font-bold">لا يوجد نتائج تطابق بحثك الحالي</p>
            </div>
          )}
        </div>

        {/* Professional Add Student Form */}
        <form onSubmit={handleAddStudent} className="p-4 bg-amber-500/5 dark:bg-amber-500/5 border border-brand-gold/15 rounded-2xl space-y-3">
          <p className="text-[11px] font-black text-brand-dark dark:text-brand-gold flex items-center gap-1.5">
            <PlusCircle size={14} className="text-brand-gold animate-bounce" />
            <span>تسجيل وتثبيت طالب جديد يدوياً بالنظام</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            
            <div className="space-y-1">
              <input 
                type="text" 
                required
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="اسم الطالب بالكامل"
                className="w-full bg-white dark:bg-slate-850 border dark:border-slate-850 rounded-xl text-xs px-3 py-2 text-right font-medium focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <input 
                type="email" 
                required
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                placeholder="البريد الإلكتروني المعتمد"
                className="w-full bg-white dark:bg-slate-850 border dark:border-slate-850 rounded-xl text-xs px-3 py-2 text-left font-mono focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <input 
                type="text" 
                required
                value={newStudentTelegram}
                onChange={(e) => setNewStudentTelegram(e.target.value)}
                placeholder="معرف التليجرام الإلزامي (مثل @abdulmlik)"
                className="w-full bg-white dark:bg-slate-850 border dark:border-slate-850 rounded-xl text-xs px-3 py-2 text-left font-medium focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white placeholder:text-right"
              />
            </div>

          </div>

          <button 
            type="submit" 
            className="w-full py-2 bg-brand-dark hover:bg-black dark:bg-brand-gold dark:hover:bg-yellow-600 text-white dark:text-brand-dark rounded-xl text-xs font-black transition-all cursor-pointer text-center"
          >
            تأكيد إدراج وحفظ الطالب بنظام التليجرام الإلزامي
          </button>
        </form>
      </div>

      {/* System Live Logger Console */}
      <div className="bg-brand-dark text-emerald-400 p-4 rounded-2xl font-mono text-[9px] space-y-2 shadow-inner border border-white/5">
        <div className="flex justify-between items-center text-gray-400 pb-1.5 border-b border-white/10">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="font-extrabold text-[10px] text-emerald-500">منظومة المراقبة الحية (LOGS)</span>
          </span>
          <span>تحديث تلقائي</span>
        </div>
        <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1 no-scrollbar text-right leading-relaxed" style={{ direction: 'rtl' }}>
          {logs.map((log, i) => (
            <div key={i} className="text-emerald-350 select-text font-mono opacity-90">
              {log}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
