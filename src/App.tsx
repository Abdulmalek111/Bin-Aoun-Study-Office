import React, { useState, useEffect } from 'react';
import { Home, Calendar, LayoutGrid, User as UserIcon, BookOpen, Smartphone, ShieldCheck, Award, MessageSquare, Shield } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';

// Types and Initial Mock Data
import { User, Subject, Exam, TabType, SupportTicket, Notification } from './types';
import { initialSubjects, initialExams } from './data';

// Components
import Logo from './components/Logo';
import LoginView from './components/LoginView';
import WelcomeView from './components/WelcomeView';
import DashboardView from './components/DashboardView';
import SubjectsView from './components/SubjectsView';
import ExamsView from './components/ExamsView';
import ActiveExamView from './components/ActiveExamView';
import ProfileView from './components/ProfileView';
import DiscussionsView from './components/DiscussionsView';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [examHistory, setExamHistory] = useState<{ examTitle: string; scorePct: number; date: string; timeUsed: string }[]>([]);
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('school_dark_mode');
    return saved !== 'false';
  });

  // Technical Support Tickets state
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem('school_support_tickets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: '8542',
        senderEmail: 'ahmed.salih@gmail.com',
        senderName: 'أحمد الصالح',
        message: 'السلام عليكم، لدي استفسار بخصوص الباب الأول في مادة الرياضيات. هل المستندات المطلوبة تغطي كافة أسئلة الامتحان النهائي؟ وشكراً لكم.',
        createdAt: '2026-06-01 10:30',
        reply: 'وعليكم السلام ورحمة الله وبركاته يا أحمد. نعم، كافة المستندات والملفات المرفقة تضمن تغطية المنهج بشكل كامل ومطابقة لنمط الأسئلة المعتمد.',
        repliedAt: '2026-06-01 11:15'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('school_support_tickets', JSON.stringify(supportTickets));
  }, [supportTickets]);

  // Dynamic Notifications State
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('school_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: 'noti-init-1',
        senderName: 'المشرف العام',
        message: 'مرحباً بك في منصة بن عون التعليمية المحدثة! تم تفعيل نظام الإشعارات الفورية في حسابك بنجاح ونظام المتابعة عبر التليجرام.',
        createdAt: '2026-06-01 12:00',
        read: false,
        targetEmail: 'abdulmlikoog@gmail.com'
      },
      {
        id: 'noti-init-2',
        senderName: 'المشرف العام',
        message: 'عزيزي أحمد، تم الرد على استفسارك ومراجعة باب الرياضيات ومستند الباب الأول بنجاح.',
        createdAt: '2026-06-01 11:16',
        read: false,
        targetEmail: 'ahmed.salih@gmail.com'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('school_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleAddNotification = (targetEmail: string, senderName: string, message: string) => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')} ${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;
    const newNoti: Notification = {
      id: 'noti-' + Math.floor(100000 + Math.random() * 900000).toString(),
      senderName,
      message,
      createdAt: formattedDate,
      read: false,
      targetEmail: targetEmail.trim()
    };
    setNotifications(prev => [newNoti, ...prev]);
  };

  // Dynamic Required Documents (previously "Standard Lectures") state
  const [subjectLectures, setSubjectLectures] = useState<Record<string, { title: string; duration: string; type: 'video' | 'pdf' }[]>>(() => {
    const saved = localStorage.getItem('school_subject_lectures');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return {
      math: [
        { title: 'المستند المطلوب 1: حساب التفاضل والتكامل المتقدم', duration: 'مستند رئيسي معتمد', type: 'pdf' },
        { title: 'المستند المطلوب 2: الدوال اللوغاريتمية والأسية', duration: 'ملخص الباب الأول', type: 'pdf' },
        { title: 'المستند المطلوب 3: المصفوفات والمحددات في الجبر', duration: 'ورقة عمل شاملة', type: 'pdf' },
        { title: 'المستند المطلوب 4: تطبيقات الهندسة الفراغية ثلاثية الأبعاد', duration: 'نموذج محلول وقابل للطباعة', type: 'pdf' },
        { title: 'المستند المطلوب 5: مبادئ الإحصاء والاحتمالات', duration: 'ملخص شامل', type: 'pdf' },
        { title: 'المستند المطلوب 6: حل المعادلات التفاضلية البسيطة', duration: 'اختبار تجريبي', type: 'pdf' },
      ],
      physics: [
        { title: 'المستند المطلوب 1: الميكانيكا الكلاسيكية وقوانين الحركة والتسارع', duration: 'مذكرة القوانين وتحضير', type: 'pdf' },
        { title: 'المستند المطلوب 2: الديناميكا الحرارية وتطبيقاتها العملي والفيزيائي', duration: 'ملخص معتمد', type: 'pdf' },
        { title: 'المستند المطلوب 3: الكهربية الساكنة وقانون كولوم والشحنات', duration: 'تأسيس شامل', type: 'pdf' },
        { title: 'المستند المطلوب 4: المغناطيسية وتطبيقات الحث الكهرومغناطيسي', duration: 'مرجع كامل', type: 'pdf' },
      ],
      chemistry: [
        { title: 'المستند المطلوب 1: الكيمياء العضوية وتراكيب ذرات الكربون وعلاقتها', duration: 'ملخص الباب الأول', type: 'pdf' },
        { title: 'المستند المطلوب 2: الجدول الدوري وتوصيف الروابط التساهمية والأيونية', duration: 'توزيع معتمد', type: 'pdf' },
        { title: 'المستند المطلوب 3: معدلات التفاعلات الكيميائية ومفهوم الاتزان الكيميائي', duration: 'ورقة تدريب', type: 'pdf' },
        { title: 'المستند المطلوب 4: الأحماض والقواعد ومقياس الرقم الهيدروجيني pH', duration: 'مستند معملي شامل', type: 'pdf' },
      ],
      english: [
        { title: 'المستند المطلوب 1: قواعد الأزمنة وتراكيب الجمل الإنجليزية المعقدة', duration: 'مذكرة القواعد المعتمدة', type: 'pdf' },
        { title: 'المستند المطلوب 2: مهارات الكتابة الأكاديمية وصياغة البحوث والتقارير', duration: 'تعبير متميز للترم جاري', type: 'pdf' },
        { title: 'المستند المطلوب 3: مهارات الاستماع والمحادثة في البيئة الجامعية والمهنية', duration: 'دليلك القياسي والصوتي', type: 'pdf' },
        { title: 'المستند المطلوب 4: القراءة السريعة وتحليل النصوص وفك رموز الكلمات المتقدمة', duration: 'اختبار تجريبي قياسي', type: 'pdf' },
      ],
      safety: [
        { title: 'المستند المطلوب 1: مقدمة في سلامة الحياة وإدارة المخاطر والتهديدات', duration: 'حقيبة تفصيلية', type: 'pdf' },
        { title: 'المستند المطلوب 2: الإجراءات الوقائية في حالات الطوارئ وخطط الإخلاء', duration: 'خارطة السلامة والأمن المعتمدة', type: 'pdf' },
        { title: 'المستند المطلوب 3: الإسعافات الأولية والتعامل الفوري مع الإصابات الطارئة', duration: 'شرح مرئي وتطبيقي', type: 'video' }
      ],
      programming: [
        { title: 'المستند المطلوب 1: مفاهيم البرمجة الأساسية وكتابة الأنماط النظيفة', duration: 'تأسيس بايثون وقواعد OOP', type: 'pdf' },
        { title: 'المستند المطلوب 2: تحليل الخوارزميات وتصميم البنى البرمجية المعقدة', duration: 'توصيف البيانات والعمليات', type: 'pdf' },
        { title: 'المستند المطلوب 3: مبادئ البرمجة كائنية التوجه OOP وتوزيع الصفوف', duration: 'المرجع الجامعي الشامل', type: 'pdf' }
      ],
      history: [
        { title: 'المستند المطلوب 1: تأسيس الدولة الروسية والملوك الأوائل للبلاد', duration: 'ملخص التاريخ', type: 'pdf' },
        { title: 'المستند المطلوب 2: روسيا القيصرية والتحولات السياسية الكبرى في القرن الـ 19', duration: 'ملحق الأحداث والقرارات للترم الحالي', type: 'pdf' }
      ],
      russian: [
        { title: 'المستند المطلوب 1: الحروف الأبجدية الروسية واللفظ الصحيح للمقاطع', duration: 'حقيبة صوتية وحروف المبتدئ', type: 'pdf' },
        { title: 'المستند المطلوب 2: تراكيب الجمل الحوارية والردود السريعة اليومية', duration: 'دليل المحادثة الشائعة المعتمد', type: 'pdf' },
        { title: 'المستند المطلوب 3: قواعد جمع الأسماء وصياغة التفضيلات اللغوية', duration: 'أساسيات الصرف والنحو', type: 'pdf' }
      ],
      sports: [
        { title: 'المستند المطلوب 1: اللياقة البدنية والتمارين الهوائية والصحة الغذائية المتكاملة', duration: 'كابتن معتمد لتأهيل مالي', type: 'pdf' },
        { title: 'المستند المطلوب 2: طرق الوقاية من التشنجات والإصابات العضلية والتأهيل الرياضي', duration: 'ملخص حرق وتقوية عضلية', type: 'pdf' }
      ],
      nanocad: [
        { title: 'المستند المطلوب 1: واجهة برنامج nanoCAD وأدوات التخطيط الأساسية 2D', duration: 'مذكرة الرسم الهندسي', type: 'pdf' },
        { title: 'المستند المطلوب 2: التعامل مع الطبقات والأبعاد وضبط الإخراج والطباعة والمقاييس', duration: 'خطوات الرسم 2D & 3D', type: 'pdf' },
        { title: 'المستند المطلوب 3: النمذجة ثلاثية الأبعاد والتصاميم الهندسية ثنائية التموضع', duration: 'حقيبة التصميم التفصيلية بالبرنامج', type: 'pdf' }
      ]
    };
  });

  // Persist Required Documents changes automatically
  useEffect(() => {
    localStorage.setItem('school_subject_lectures', JSON.stringify(subjectLectures));
  }, [subjectLectures]);

  // Apply dark mode theme class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.add('dark');
      localStorage.setItem('school_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('school_dark_mode', 'false');
    }
  }, [darkMode]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Capture PWA installation event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert("الجهاز الحالي أو المتصفح مثبت عليه التطبيق بالفعل أو لا يدعم التثبيت الفوري. في حال استخدامك لمتصفح سفاري على آيفون، يرجى الضغط على زر مشاركة واختيار 'إضافة إلى الشاشة الرئيسية'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  // Load state from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('school_user');
    const savedSubjects = localStorage.getItem('school_subjects');
    const savedHistory = localStorage.getItem('school_exam_history');

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('school_user');
      }
    }

    if (savedSubjects) {
      try {
        const parsed = JSON.parse(savedSubjects) as Subject[];
        // Auto-merge to ensure any new subject definitions in initialSubjects are added
        const merged = [...parsed];
        initialSubjects.forEach(initSub => {
          if (!merged.some(m => m.id === initSub.id)) {
            merged.push(initSub);
          }
        });
        setSubjects(merged);
        localStorage.setItem('school_subjects', JSON.stringify(merged));
      } catch (e) {
        // Fallback to default
      }
    }

    if (savedHistory) {
      try {
        setExamHistory(JSON.parse(savedHistory));
      } catch (e) {
        // Fallback to default
      }
    }
  }, []);

  // Auto-detect and route ticketId if present
  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get('ticketId');
      if (ticketId) {
        if (user.email === 'abdulmlikoog@gmail.com') {
          setActiveTab('admin');
        } else {
          setActiveTab('profile');
        }
      }
    }
  }, [user]);

  // Sync state functions
  const [googleLoggingIn, setGoogleLoggingIn] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setGoogleLoggingIn(true);
    setGoogleError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (fbUser) {
        const username = fbUser.displayName || fbUser.email?.split('@')[0] || 'عبدالملك';
        const email = fbUser.email || '';
        const avatarUrl = fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`;
        
        const loggedUser: User = {
          username,
          email,
          avatarUrl,
          isLoggedIn: true,
          telegram: '@google_user',
        };
        setUser(loggedUser);
        localStorage.setItem('school_user', JSON.stringify(loggedUser));
        setAuthScreen('welcome');
      }
    } catch (error: any) {
      console.error('Firebase Auth Error:', error);
      let errorMsg = 'حدث خطأ أثناء الاتصال بجوجل. يرجى المحاولة مرة أخرى.';
      if (error && error.code === 'auth/popup-closed-by-user') {
        errorMsg = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
      } else if (error && error.code === 'auth/network-request-failed') {
        errorMsg = 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
      } else if (error && error.code === 'auth/unauthorized-domain') {
        errorMsg = 'النطاق الحالي لتشغيل التطبيق غير مصرح به في إعدادات فيربيز الخاصة بك. يرجى إضافته إلى النطاقات المصرح بها (Authorized Domains).';
      } else if (error && error.message) {
        errorMsg = `خطأ: ${error.message}`;
      }
      setGoogleError(errorMsg);
    } finally {
      setGoogleLoggingIn(false);
    }
  };

  const handleLoginSuccess = (username: string, email: string, telegram?: string) => {
    // Premium custom avatar generated from initial letter
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=1b365d,c9a24a`;
    const loggedUser: User = {
      username,
      email,
      avatarUrl: avatar,
      isLoggedIn: true,
      telegram: telegram || '@abdulmlik_ou',
    };
    setUser(loggedUser);
    localStorage.setItem('school_user', JSON.stringify(loggedUser));
    setAuthScreen('welcome');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('school_user');
    setAuthScreen('welcome');
    // Clear all "Remember Me" stored credentials on logout
    localStorage.removeItem('school_remember_me');
    localStorage.removeItem('school_remembered_user');
    localStorage.removeItem('school_remembered_pass');
    // Keep study material and exam histories linked to device for persistent enjoyment
    try {
      signOut(auth);
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  const handleUpdateProfile = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('school_user', JSON.stringify(updatedUser));
  };

  const handleUpdateSubjects = (updatedSubjects: Subject[]) => {
    setSubjects(updatedSubjects);
    localStorage.setItem('school_subjects', JSON.stringify(updatedSubjects));
  };

  const handleToggleLecture = (subjectId: string, lectureIndex: number) => {
    const updatedSubjects = subjects.map((sub) => {
      if (sub.id === subjectId) {
        // Safe progression toggling matching standard index boundaries
        let activeCompleted = sub.completedLectures;
        if (lectureIndex < sub.completedLectures) {
          // If they click on already complete index, toggle down
          activeCompleted = Math.max(0, lectureIndex);
        } else {
          // Toggle up
          activeCompleted = Math.min(sub.lecturesCount, lectureIndex + 1);
        }
        return {
          ...sub,
          completedLectures: activeCompleted,
        };
      }
      return sub;
    });

    setSubjects(updatedSubjects);
    localStorage.setItem('school_subjects', JSON.stringify(updatedSubjects));
  };

  const handlePublishExamResults = (examTitle: string, scorePct: number, timeUsed: string) => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;

    const newHistory = [
      {
        examTitle,
        scorePct,
        date: formattedDate,
        timeUsed,
      },
      ...examHistory,
    ];

    setExamHistory(newHistory);
    localStorage.setItem('school_exam_history', JSON.stringify(newHistory));
  };

  const activeExam = initialExams.find((e) => e.id === activeExamId);

  return (
    <div className={`min-h-screen w-full transition-colors duration-500 ${!user ? 'bg-brand-dark' : 'bg-brand-gray'} text-brand-dark flex flex-col items-center justify-center md:py-8`} style={{ direction: 'rtl' }}>
      
      {/* High-quality Centered Application Container: Fills mobile screens, elegantly framed with shadows on desktops */}
      <div className={`w-full max-w-[460px] transition-all duration-500 ${!user ? 'bg-brand-dark border-transparent shadow-2xl shadow-black/40' : 'bg-white border-gray-100 shadow-2xl'} h-screen md:h-[880px] md:max-h-[880px] md:rounded-[36px] overflow-hidden flex flex-col justify-between border relative`}>
        
        {/* Main Content Area */}
        <div className={`flex-grow overflow-y-auto no-scrollbar flex flex-col justify-between ${!user ? 'p-0' : 'px-4 py-3.5'}`}>
          
          {!user ? (
            authScreen === 'welcome' ? (
              <WelcomeView 
                onNavigateToLogin={() => setAuthScreen('login')}
                onNavigateToRegister={() => setAuthScreen('register')}
                onGoogleLogin={handleGoogleLogin}
                isLoggingIn={googleLoggingIn}
                authError={googleError}
                onClearError={() => setGoogleError(null)}
              />
            ) : (
              <LoginView 
                onLoginSuccess={handleLoginSuccess} 
                initialMode={authScreen}
                onNavigateBack={() => setAuthScreen('welcome')}
              />
            )
          ) : activeExamId && activeExam ? (
            /* Immersive active exam screen: hides common shells for maximum display area */
            <ActiveExamView
              exam={activeExam}
              onExit={() => setActiveExamId(null)}
              onSubmitResults={handlePublishExamResults}
            />
          ) : (
            /* Standard Dashboard tabs router */
            <div className="flex-col h-full space-y-4">
              {activeTab === 'home' && (
                <DashboardView
                  user={user}
                  subjects={subjects}
                  exams={initialExams}
                  onNavigateToTab={setActiveTab}
                  onSelectExam={(id) => setActiveExamId(id)}
                  notifications={notifications}
                  onUpdateNotifications={setNotifications}
                />
              )}

              {activeTab === 'subjects' && (
                <SubjectsView
                  subjects={subjects}
                  onToggleLecture={handleToggleLecture}
                  subjectLecturesMap={subjectLectures}
                />
              )}

              {activeTab === 'discussions' && (
                <DiscussionsView
                  subjects={subjects}
                />
              )}

              {activeTab === 'exams' && (
                <ExamsView
                  exams={initialExams}
                  examHistory={examHistory}
                  onSelectExam={(id) => setActiveExamId(id)}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  user={user}
                  examHistoryCount={examHistory.length}
                  onLogout={handleLogout}
                  onUpdateProfile={handleUpdateProfile}
                  onNavigateToTab={setActiveTab}
                  darkMode={darkMode}
                  onToggleDarkMode={setDarkMode}
                  deferredPrompt={deferredPrompt}
                  onInstallApp={handleInstallApp}
                  subjects={subjects}
                  onUpdateSubjects={handleUpdateSubjects}
                  subjectLecturesMap={subjectLectures}
                  onUpdateSubjectLectures={setSubjectLectures}
                  supportTickets={supportTickets}
                  onUpdateSupportTickets={setSupportTickets}
                  notifications={notifications}
                  onUpdateNotifications={setNotifications}
                  onAddNotification={handleAddNotification}
                />
              )}

              {activeTab === 'admin' && user?.email === 'abdulmlikoog@gmail.com' && (
                <AdminDashboard 
                  user={user}
                  subjects={subjects}
                  onUpdateSubjects={handleUpdateSubjects}
                  onNavigateToTab={setActiveTab}
                  subjectLecturesMap={subjectLectures}
                  onUpdateSubjectLectures={setSubjectLectures}
                  supportTickets={supportTickets}
                  onUpdateSupportTickets={setSupportTickets}
                  notifications={notifications}
                  onUpdateNotifications={setNotifications}
                  onAddNotification={handleAddNotification}
                />
              )}
            </div>
          )}

        </div>

        {/* Common Bottom Mobile Navigation Dock (Hidden if in active exam screen for complete testing focus) */}
        {user && !activeExamId && (
          <nav className="bg-white border-t border-gray-150 px-2 sm:px-3 py-2.5 sm:py-3.5 flex justify-around items-center text-gray-400 shadow-md z-30 select-none rounded-t-2xl shrink-0">
            
            {/* Home tab button */}
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'home' ? 'text-brand-dark scale-105 font-extrabold' : 'hover:text-brand-blue'
              }`}
            >
              <Home size={20} className={activeTab === 'home' ? 'text-brand-gold stroke-[2.2]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">الرئيسية</span>
            </button>

            {/* Subjects tab button */}
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'subjects' ? 'text-brand-dark scale-105 font-extrabold' : 'hover:text-brand-blue'
              }`}
            >
              <LayoutGrid size={20} className={activeTab === 'subjects' ? 'text-brand-gold stroke-[2.2]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">المواد</span>
            </button>

            {/* Discussions tab button */}
            <button
              onClick={() => setActiveTab('discussions')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'discussions' ? 'text-brand-dark scale-105 font-extrabold' : 'hover:text-brand-blue'
              }`}
            >
              <MessageSquare size={20} className={activeTab === 'discussions' ? 'text-brand-gold stroke-[2.2]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">المناقشات</span>
            </button>

            {/* Exams tab button */}
            <button
              onClick={() => setActiveTab('exams')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'exams' ? 'text-brand-dark scale-105 font-extrabold' : 'hover:text-brand-blue'
              }`}
            >
              <Calendar size={20} className={activeTab === 'exams' ? 'text-brand-gold stroke-[2.2]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">الاختبارات</span>
            </button>

            {/* Profile tab button */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'profile' ? 'text-brand-dark scale-105 font-extrabold' : 'hover:text-brand-blue'
              }`}
            >
              <UserIcon size={20} className={activeTab === 'profile' ? 'text-brand-gold stroke-[2.2]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">حسابي</span>
            </button>

          </nav>
        )}

      </div>

    </div>
  );
}
