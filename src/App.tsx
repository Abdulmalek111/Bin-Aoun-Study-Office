import React, { useState, useEffect } from 'react';
import { Home, Calendar, LayoutGrid, User as UserIcon, BookOpen, Smartphone, ShieldCheck, Award, MessageSquare, Shield } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

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

  // Real-time Cloud Database sync via Firestore subscriptions
  useEffect(() => {
    if (!user) {
      setSupportTickets([]);
      setNotifications([]);
      return;
    }

    // 1. Subscribe to Announcements / Notifications
    const unsubNotif = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach((docRef) => {
        const d = docRef.data();
        const target = d.targetEmail || '';
        if (user.email === 'abdulmlikoog@gmail.com' || target.toLowerCase() === user.email.toLowerCase()) {
          list.push({
            id: docRef.id,
            senderName: d.senderName || 'المشرف العام',
            message: d.message || '',
            createdAt: d.createdAt || '',
            read: !!d.read,
            targetEmail: target
          });
        }
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setNotifications(list);
    }, (error) => {
      console.error("Firestore Notification stream error:", error);
    });

    // 2. Subscribe to Student Support Tickets
    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((docRef) => {
        const d = docRef.data();
        const sender = d.senderEmail || '';
        if (user.email === 'abdulmlikoog@gmail.com' || sender.toLowerCase() === user.email.toLowerCase()) {
          list.push({
            id: docRef.id,
            senderEmail: sender,
            senderName: d.senderName || '',
            message: d.message || '',
            createdAt: d.createdAt || '',
            status: d.status || 'open',
            reply: d.reply || '',
            repliedAt: d.repliedAt || '',
            messages: d.messages || []
          });
        }
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSupportTickets(list);
    }, (error) => {
      console.error("Firestore Ticket stream error:", error);
    });

    // 3. Subscribe to Exam History
    let unsubExams = () => {};
    if (auth.currentUser) {
      unsubExams = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'exams'), (snapshot) => {
        const list: { examTitle: string; scorePct: number; date: string; timeUsed: string }[] = [];
        snapshot.forEach((docRef) => {
          const d = docRef.data();
          list.push({
            examTitle: d.examTitle || '',
            scorePct: typeof d.scorePct === 'number' ? d.scorePct : 0,
            date: d.date || '',
            timeUsed: d.timeUsed || ''
          });
        });
        setExamHistory(list);
      }, (error) => {
        console.error("Firestore Exam History stream error:", error);
      });
    }

    return () => {
      unsubNotif();
      unsubTickets();
      unsubExams();
    };
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

        // Write user profile metadata to Cloud Firestore users directory
        try {
          await setDoc(doc(db, 'users', fbUser.uid), {
            username,
            email,
            avatarUrl,
            telegram: '@google_user',
            isLoggedIn: true,
          });
        } catch (dbErr) {
          console.error("Failed to write profile to Firestore:", dbErr);
        }

        setUser(loggedUser);
        localStorage.setItem('school_user', JSON.stringify(loggedUser));
        setAuthScreen('welcome');
      }
    } catch (error: any) {
      console.error('Firebase Auth Error:', error);
      let errorMsg = 'حدث خطأ أثناء الاتصال بجوجل. يرجى المحاولة مرة أخرى.';
      if (error && error.code === 'auth/popup-closed-by-user') {
        errorMsg = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
      } else if (error && (error.code === 'auth/popup-blocked' || error.message?.includes('popup'))) {
        errorMsg = 'تم حظر فتح النافذة المنبثقة لتسجيل الدخول من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة أو فتح التطبيق في نافذة خارجية مستقلة.';
      } else if (error && error.code === 'auth/operation-not-allowed') {
        errorMsg = 'تسجيل الدخول عبر Google غير مفعّل في لوحة تحكّم Firebase الخاصة بك. يرجى تفعيل موفر Google من قسم (Authentication -> Sign-in method -> Google).';
      } else if (error && error.code === 'auth/network-request-failed') {
        errorMsg = 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
      } else if (error && error.code === 'auth/unauthorized-domain') {
        errorMsg = `النطاق الحالي لتشغيل التطبيق غير مصرح به: (${window.location.hostname}) في إعدادات فيربيز الخاصة بك. يرجى إضافته إلى النطاقات المصرح بها (Authorized Domains) لتتمكن من استخدام تسجيل الدخول عبر جوجل بنجاح.`;
      } else if (error && error.message) {
        errorMsg = `خطأ: ${error.message}`;
      }
      setGoogleError(errorMsg);
    } finally {
      setGoogleLoggingIn(false);
    }
  };

  const handleLoginSuccess = async (username: string, email: string, telegram?: string) => {
    // Premium custom avatar generated from initial letter
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=1b365d,c9a24a`;
    const loggedUser: User = {
      username,
      email,
      avatarUrl: avatar,
      isLoggedIn: true,
      telegram: telegram || '@abdulmlik_ou',
    };

    // Save profile metadata on standard successful logins too
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          username,
          email,
          avatarUrl: avatar,
          telegram: telegram || '@abdulmlik_ou',
          isLoggedIn: true
        });
      } catch (dbErr) {
        console.error("Failed to write profile on standard signup:", dbErr);
      }
    }

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
    try {
      signOut(auth);
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('school_user', JSON.stringify(updatedUser));

    // Update profile state in the Cloud
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          username: updatedUser.username,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl || '',
          telegram: updatedUser.telegram || '',
          isLoggedIn: true
        });
      } catch (dbErr) {
        console.error("Failed to sync profile update to Cloud:", dbErr);
      }
    }
  };

  const handleUpdateSubjects = (updatedSubjects: Subject[]) => {
    setSubjects(updatedSubjects);
    localStorage.setItem('school_subjects', JSON.stringify(updatedSubjects));
  };

  const handleToggleLecture = (subjectId: string, lectureIndex: number) => {
    const updatedSubjects = subjects.map((sub) => {
      if (sub.id === subjectId) {
        let activeCompleted = sub.completedLectures;
        if (lectureIndex < sub.completedLectures) {
          activeCompleted = Math.max(0, lectureIndex);
        } else {
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

  const handleUpdateSupportTickets = async (updatedTickets: SupportTicket[]) => {
    setSupportTickets(updatedTickets);
    // Persist all additions/replies to Cloud Firestore
    try {
      for (const ticket of updatedTickets) {
        await setDoc(doc(db, 'tickets', ticket.id), {
          id: ticket.id,
          senderEmail: ticket.senderEmail,
          senderName: ticket.senderName,
          message: ticket.message,
          createdAt: ticket.createdAt,
          status: ticket.status || 'open',
          reply: ticket.reply || '',
          repliedAt: ticket.repliedAt || '',
          messages: ticket.messages || []
        });
      }
    } catch (dbErr) {
      console.error("Failed to sync ticket database changes with Cloud:", dbErr);
    }
  };

  const handleUpdateNotifications = async (updatedNotifs: Notification[]) => {
    setNotifications(updatedNotifs);
    // Push updates to Firestore
    try {
      for (const notif of updatedNotifs) {
        await setDoc(doc(db, 'notifications', notif.id), {
          id: notif.id,
          senderName: notif.senderName,
          message: notif.message,
          createdAt: notif.createdAt,
          read: notif.read,
          targetEmail: notif.targetEmail
        });
      }
    } catch (dbErr) {
      console.error("Failed to write notification update to Cloud:", dbErr);
    }
  };

  const handlePublishExamResults = async (examTitle: string, scorePct: number, timeUsed: string) => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;

    const newHistoryItem = {
      examTitle,
      scorePct,
      date: formattedDate,
      timeUsed,
    };

    setExamHistory(prev => [newHistoryItem, ...prev]);

    // Persist completed exam history under user's nested document
    if (auth.currentUser) {
      try {
        const examResultId = `exam-${Date.now()}`;
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'exams', examResultId), {
          examTitle,
          scorePct: Math.round(scorePct),
          date: formattedDate,
          timeUsed: timeUsed || ''
        });
      } catch (dbErr) {
        console.error("Failed to sync exam result to Cloud:", dbErr);
      }
    }
  };

  const activeExam = initialExams.find((e) => e.id === activeExamId);

  return (
    <div className={`min-h-screen w-full transition-colors duration-500 ${!user ? 'bg-brand-dark' : 'bg-brand-gray'} text-brand-dark flex flex-col items-center justify-center md:py-6 lg:py-8`} style={{ direction: 'rtl' }}>
      
      {/* High-quality Centered Application Container: Fills mobile screens, elegantly expanded with dual-panel sidebars on laptops/computers */}
      <div className={`w-full transition-all duration-500 ${
        !user 
          ? 'max-w-[460px] bg-brand-dark border-transparent shadow-2xl shadow-black/40 h-screen md:h-[880px] md:max-h-[880px] md:rounded-[36px]' 
          : 'max-w-full md:max-w-[480px] lg:max-w-6xl xl:max-w-7xl bg-white border-gray-100 shadow-2xl h-screen lg:h-[880px] lg:max-h-[880px] lg:rounded-[36px]'
      } overflow-hidden flex flex-col lg:flex-row justify-between border relative`}>
        
        {/* RIGHT SIDEBAR FOR DESKTOPS (Only visible if logged in, screen is lg+, and not in active exam mode) */}
        {user && !activeExamId && (
          <aside className="hidden lg:flex flex-col w-[265px] border-l border-gray-100/80 bg-brand-dark text-white p-6 shrink-0 h-full justify-between select-none relative z-40">
            {/* Background luxury highlights */}
            <div className="absolute top-0 right-0 w-full h-40 bg-gradient-to-b from-brand-blue/30 to-transparent pointer-events-none"></div>
            
            <div className="space-y-6 relative z-10">
              {/* Branding Header Area */}
              <div className="flex flex-col items-center text-center pb-5 border-b border-white/10">
                <Logo />
                <p className="text-[11px] text-brand-gold font-bold mt-1.5 tracking-wide">مكتب القياس والتقويم</p>
              </div>

              {/* Student Visual Card */}
              <div className="p-3 bg-brand-blue/40 rounded-2xl border border-white/5 space-y-2 text-right">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-brand-gold rounded-full blur-[2px] opacity-40"></div>
                    <img 
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`} 
                      alt={user.username} 
                      className="relative w-11 h-11 rounded-full object-cover border border-white/10 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-xs truncate text-white leading-tight">{user.username} 🎓</h4>
                    <p className="text-[9px] text-slate-300 font-medium truncate mt-0.5">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Sidebar Tabs Links */}
              <nav className="space-y-1.5 flex flex-col">
                <button
                  onClick={() => setActiveTab('home')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right font-black text-xs cursor-pointer ${
                    activeTab === 'home' 
                      ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/10 font-black' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Home size={15} />
                  <span>اللوحة الرئيسية للدارس</span>
                </button>

                <button
                  onClick={() => setActiveTab('subjects')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right font-black text-xs cursor-pointer ${
                    activeTab === 'subjects' 
                      ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/10 font-black' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <LayoutGrid size={15} />
                  <span>المستندات والمواد الدراسية</span>
                </button>

                <button
                  onClick={() => setActiveTab('discussions')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right font-black text-xs cursor-pointer ${
                    activeTab === 'discussions' 
                      ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/10 font-black' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <MessageSquare size={15} />
                  <span>حلقات النقاش الأكاديمي</span>
                </button>

                <button
                  onClick={() => setActiveTab('exams')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right font-black text-xs cursor-pointer ${
                    activeTab === 'exams' 
                      ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/10 font-black' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Calendar size={15} />
                  <span>الاختبارات والتسريبات</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right font-black text-xs cursor-pointer ${
                    activeTab === 'profile' 
                      ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/10 font-black' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <UserIcon size={15} />
                  <span>ملفي الشخصي والإعدادات</span>
                </button>

                {user?.email === 'abdulmlikoog@gmail.com' && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right font-black text-xs cursor-pointer border mt-3 ${
                      activeTab === 'admin' 
                        ? 'bg-red-700 text-white border-red-500 shadow-lg font-black' 
                        : 'bg-red-950/20 text-red-200 border-red-500/20 hover:bg-red-900/30'
                    }`}
                  >
                    <Shield size={15} />
                    <span>لوحة إدارة النظام والمتابعة</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Bottom Utilities Panel inside desktop sidebar */}
            <div className="space-y-4 border-t border-white/10 pt-4 relative z-10">
              {/* Day & Night interactive switch */}
              <div className="flex items-center justify-between text-[11px] px-2 text-gray-300 font-extrabold select-none">
                <span>الوضع الداكن المريح</span>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-10 h-5 bg-white/10 rounded-full transition-colors relative cursor-pointer"
                  title="تبديل وضع الألوان"
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-brand-gold transition-all duration-300 ${darkMode ? 'left-1' : 'left-5'}`} />
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 bg-red-950/40 hover:bg-red-900/40 text-red-200 hover:text-white border border-red-500/20 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
              >
                تسجيل الخروج الآمن
              </button>
            </div>
          </aside>
        )}

        {/* MAIN DISPLAY VIEWPORT CONTAINER (Scroll content & screen routing) */}
        <div className={`flex-grow overflow-y-auto no-scrollbar flex flex-col justify-between ${
          !user ? 'p-0' : 'px-4 py-3.5 md:p-6 lg:p-8'
        }`}>
          
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
                  onUpdateNotifications={handleUpdateNotifications}
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
                  onUpdateSupportTickets={handleUpdateSupportTickets}
                  notifications={notifications}
                  onUpdateNotifications={handleUpdateNotifications}
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
                  onUpdateSupportTickets={handleUpdateSupportTickets}
                  notifications={notifications}
                  onUpdateNotifications={handleUpdateNotifications}
                  onAddNotification={handleAddNotification}
                />
              )}
            </div>
          )}

        </div>

        {/* BOTTOM NAVIGATION DOCK (Fully responsive: visible on mobiles, hidden on desktop/computers screens `lg:hidden`) */}
        {user && !activeExamId && (
          <nav className="lg:hidden bg-white border-t border-gray-150 px-2 sm:px-3 py-2.5 sm:py-3.5 flex justify-around items-center text-gray-400 shadow-md z-30 select-none rounded-t-2xl shrink-0">
            
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
