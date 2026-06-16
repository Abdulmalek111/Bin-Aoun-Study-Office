import React, { useState, useEffect } from 'react';
import { Home, Calendar, LayoutGrid, User as UserIcon, BookOpen, Smartphone, ShieldCheck, Award, MessageSquare, Shield, Users, PhoneIncoming, X, Check, MoreHorizontal } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db, handleFirestoreError, OperationType, safeQuery, safeWhere, safeOnSnapshot } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs, limit, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

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
import StudentsView, { getBinStudentId } from './components/StudentsView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [examHistory, setExamHistory] = useState<{ examTitle: string; scorePct: number; date: string; timeUsed: string }[]>([]);
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // Students Private Chat and Call session states
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [globalIncomingCall, setGlobalIncomingCall] = useState<any>(null);

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

  const handleAddNotification = async (targetEmail: string, senderName: string, message: string) => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')} ${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;
    const isAll = targetEmail.trim().toLowerCase() === 'all';
    
    let targetUid: string | null = null;
    if (!isAll) {
      try {
        const usersRef = collection(db, 'users');
        const q = safeQuery(usersRef, safeWhere('email', '==', targetEmail.trim().toLowerCase()));
        if (q) {
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            targetUid = snapshot.docs[0].id;
          } else {
            // Fallback search by username
            const q2 = safeQuery(usersRef, safeWhere('username', '==', targetEmail.trim()));
            if (q2) {
              const s2 = await getDocs(q2);
              if (!s2.empty) {
                targetUid = s2.docs[0].id;
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to query target user UID in handleAddNotification:", err);
      }
    }

    const notifId = 'noti-' + Math.floor(100000 + Math.random() * 900000).toString();
    const newNoti: Notification = {
      id: notifId,
      senderName,
      message,
      createdAt: formattedDate,
      read: false,
      targetEmail: targetEmail.trim(),
      type: isAll ? 'broadcast' : 'private',
      targetRole: isAll ? 'students' : null,
      targetUserId: isAll ? null : targetUid,
      createdBy: user?.uid || 'admin_user',
      readBy: [],
      status: 'active'
    };

    setNotifications(prev => [newNoti, ...prev]);

    try {
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        senderName: newNoti.senderName,
        message: newNoti.message,
        createdAt: newNoti.createdAt,
        read: newNoti.read,
        targetEmail: newNoti.targetEmail,
        type: newNoti.type,
        targetRole: newNoti.targetRole,
        targetUserId: newNoti.targetUserId,
        createdBy: newNoti.createdBy,
        readBy: newNoti.readBy,
        status: newNoti.status
      });
    } catch (e: any) {
      console.error("Failed to write notification to Firestore:", e);
      throw e;
    }
  };

  // Dynamic Required Documents (previously "Standard Lectures") state
  const [subjectLectures, setSubjectLectures] = useState<Record<string, { title: string; duration: string; type: 'video' | 'pdf'; url?: string }[]>>(() => {
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

  // Apply dark mode theme class (permanently clean to light theme)
  useEffect(() => {
    document.documentElement.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('school_dark_mode', 'false');
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
        // Auto-merge to ensure any new subject definitions in initialSubjects are added with correct localized names and fields
        const merged = parsed.map(item => {
          const matched = initialSubjects.find(init => init.id === item.id);
          return matched ? { ...item, ...matched } : item;
        });
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

  // Synchronize Firebase auth state and merge Firestore properties to React state in real-time
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          let docSnap = await getDoc(userDocRef);

          const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
          const computedBinId = `bin_${randomDigits}`;
          const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'طالب';
          const avatar = fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=1b365d,c9a24a`;

          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              uid: fbUser.uid,
              displayName: displayName,
              fullName: displayName,
              username: displayName,
              email: fbUser.email || '',
              role: 'student',
              studentId: computedBinId,
              photoURL: fbUser.photoURL || '',
              avatarUrl: avatar,
              bio: '',
              phone: '',
              university: '',
              college: '',
              department: '',
              level: 'بكالوريوس',
              isActive: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              telegram: '@no_telegram',
              isLoggedIn: true,
              signUpDate: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
              scorePct: 100,
              completedCount: 0,
              academicStage: 'بكالوريوس',
              academicYear: 'سنة أولى',
              academicSemester: 'فصل أول',
              academicTrack: 'علمي'
            });
          } else {
            // Document exists. Ensure required fields are set
            const d = docSnap.data();
            const updates: any = {};
            if (d.uid === undefined) updates.uid = fbUser.uid;
            if (d.displayName === undefined) updates.displayName = d.username || d.fullName || displayName;
            if (d.fullName === undefined) updates.fullName = d.username || d.fullName || displayName;
            if (d.email === undefined) updates.email = fbUser.email || d.email || '';
            if (d.role === undefined) updates.role = 'student';
            if (d.studentId === undefined) updates.studentId = computedBinId;
            if (d.photoURL === undefined) updates.photoURL = fbUser.photoURL || '';
            if (d.bio === undefined) updates.bio = '';
            if (d.createdAt === undefined) updates.createdAt = serverTimestamp();
            if (d.updatedAt === undefined) updates.updatedAt = serverTimestamp();

            if (Object.keys(updates).length > 0) {
              await setDoc(userDocRef, updates, { merge: true });
            }
          }

          // Subscribe to changes in the user profile in real-time
          const unsubSnapshot = onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const roleVal = data.role === undefined ? 'student' : data.role;
              const mergedUser: User = {
                username: data.username || data.fullName || data.displayName || 'طالب',
                email: data.email || '',
                avatarUrl: data.photoURL || data.avatarUrl || '',
                isLoggedIn: true,
                telegram: data.telegram || '@no_telegram',
                academicStage: data.academicStage || data.level || 'بكالوريوس',
                academicYear: data.academicYear || 'سنة أولى',
                academicSemester: data.academicSemester || 'فصل أول',
                academicTrack: data.academicTrack || 'علمي',
                balance: data.balance,
                studentId: data.studentId,
                bio: data.bio || '',
                uid: data.uid || fbUser.uid,
                fullName: data.fullName || data.displayName || 'طالب',
                phone: data.phone || '',
                university: data.university || '',
                college: data.college || '',
                department: data.department || '',
                level: data.level || 'بكالوريوس',
                photoURL: data.photoURL || '',
                role: roleVal,
                isActive: data.isActive !== undefined ? data.isActive : true,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
              };
              setUser(mergedUser);
              localStorage.setItem('school_user', JSON.stringify(mergedUser));
            }
            setAuthLoading(false);
          }, (error) => {
            console.error("Error listening to user snapshot:", error);
            setAuthLoading(false);
          });

          return () => unsubSnapshot();
        } catch (err) {
          console.error("Error syncing authenticated user: ", err);
          setAuthLoading(false);
        }
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
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

  // Auto-resolve custom Student ID starting with 'bin'
  useEffect(() => {
    if (user && auth.currentUser) {
      if (!user.studentId) {
        const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
        const computedBinId = `bin_${randomDigits}`;
        const updated = { ...user, studentId: computedBinId };
        setUser(updated);
        localStorage.setItem('school_user', JSON.stringify(updated));
        
        // Save to Firestore background-style
        setDoc(doc(db, 'users', auth.currentUser.uid), {
          studentId: computedBinId
        }, { merge: true }).catch(err => {
          console.warn("Failed background syncing student ID prefix:", err);
        });
      }
    }
  }, [user]);

  // Monitor incoming calls globally across other tabs
  useEffect(() => {
    if (!user || !auth.currentUser || activeTab === 'students') {
      setGlobalIncomingCall(null);
      return;
    }
    const currentUid = auth.currentUser.uid;
    const q = safeQuery(collection(db, 'private_calls'), safeWhere('calleeUid', '==', currentUid), limit(1));
    const unsub = safeOnSnapshot(q, (snapshot) => {
      let foundCall = false;
      snapshot.forEach((docSnap) => {
        const call = docSnap.data();
        if (call.status === 'calling' || call.status === 'ringing') {
          setGlobalIncomingCall(call);
          foundCall = true;
        }
      });
      if (!foundCall) setGlobalIncomingCall(null);
    }, (err) => {
      console.warn("Global incoming private call scan bypassed:", err);
    });
    return () => unsub();
  }, [user, activeTab]);

  // Real-time Cloud Database sync via Firestore subscriptions
  useEffect(() => {
    if (!user) {
      setSupportTickets([]);
      setNotifications([]);
      return;
    }

    // 1. Subscribe to Announcements / Notifications (filtered to prevent permission errors & comply with Firestore security rules)
    const isSchoolAdmin = user.email === 'abdulmlikoog@gmail.com';
    const notifColl = collection(db, 'notifications');

    let unsubNotif1 = () => {};
    let unsubNotif2 = () => {};
    let unsubNotif3 = () => {};

    if (isSchoolAdmin) {
      unsubNotif1 = onSnapshot(notifColl, (snapshot) => {
        const list: Notification[] = [];
        snapshot.forEach((docRef) => {
          const d = docRef.data();
          list.push({
            id: docRef.id,
            senderName: d.senderName || 'المشرف العام',
            message: d.message || '',
            createdAt: d.createdAt || '',
            read: !!d.read,
            targetEmail: d.targetEmail || '',
            type: d.type || '',
            targetRole: d.targetRole || null,
            targetUserId: d.targetUserId || null,
            createdBy: d.createdBy || '',
            readBy: d.readBy || [],
            status: d.status || ''
          });
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setNotifications(list);
      }, (err) => {
        console.warn("Admin notifications subscription bypassed:", err);
      });
    } else {
      let broadcastList: Notification[] = [];
      let privateList: Notification[] = [];
      let legacyList: Notification[] = [];

      const updateCombinedList = () => {
        const combined = [...broadcastList, ...privateList, ...legacyList];
        const unique: Record<string, Notification> = {};
        for (const item of combined) {
          unique[item.id] = item;
        }
        const sorted = Object.values(unique).sort((a, b) => b.createdAt ? b.createdAt.localeCompare(a.createdAt) : 1);
        setNotifications(sorted);
      };

      // Query broadcasts for students
      const qBroadcast = safeQuery(notifColl, safeWhere('type', '==', 'broadcast'), safeWhere('targetRole', '==', 'students'));
      unsubNotif1 = safeOnSnapshot(qBroadcast, (snapshot) => {
        broadcastList = [];
        snapshot.forEach((docRef) => {
          const d = docRef.data();
          broadcastList.push({
            id: docRef.id,
            senderName: d.senderName || 'المشرف العام',
            message: d.message || '',
            createdAt: d.createdAt || '',
            read: !!d.read,
            targetEmail: d.targetEmail || '',
            type: d.type || '',
            targetRole: d.targetRole || null,
            targetUserId: d.targetUserId || null,
            createdBy: d.createdBy || '',
            readBy: d.readBy || [],
            status: d.status || ''
          });
        });
        updateCombinedList();
      }, (err) => {
        console.warn("Broadcast query bypassed:", err);
      });

      // Query private for this student
      const qPrivate = safeQuery(notifColl, safeWhere('type', '==', 'private'), safeWhere('targetUserId', '==', user.uid));
      unsubNotif2 = safeOnSnapshot(qPrivate, (snapshot) => {
        privateList = [];
        snapshot.forEach((docRef) => {
          const d = docRef.data();
          privateList.push({
            id: docRef.id,
            senderName: d.senderName || 'المشرف العام',
            message: d.message || '',
            createdAt: d.createdAt || '',
            read: !!d.read,
            targetEmail: d.targetEmail || '',
            type: d.type || '',
            targetRole: d.targetRole || null,
            targetUserId: d.targetUserId || null,
            createdBy: d.createdBy || '',
            readBy: d.readBy || [],
            status: d.status || ''
          });
        });
        updateCombinedList();
      }, (err) => {
        console.warn("Private query bypassed:", err);
      });

      // Legacy direct matching notifications query
      const qLegacy = safeQuery(notifColl, safeWhere('targetEmail', '==', user.email?.toLowerCase()));
      unsubNotif3 = safeOnSnapshot(qLegacy, (snapshot) => {
        legacyList = [];
        snapshot.forEach((docRef) => {
          const d = docRef.data();
          if (!d.type) {
            legacyList.push({
              id: docRef.id,
              senderName: d.senderName || 'المشرف العام',
              message: d.message || '',
              createdAt: d.createdAt || '',
              read: !!d.read,
              targetEmail: d.targetEmail || '',
              type: d.type || '',
              targetRole: d.targetRole || null,
              targetUserId: d.targetUserId || null,
              createdBy: d.createdBy || '',
              readBy: d.readBy || [],
              status: d.status || ''
            });
          }
        });
        updateCombinedList();
      }, (err) => {
        console.warn("Legacy query bypassed:", err);
      });
    }

    const unsubNotif = () => {
      unsubNotif1();
      unsubNotif2();
      unsubNotif3();
    };

    // 2. Subscribe to Student Support Tickets
    const ticketsColl = collection(db, 'tickets');
    const ticketsQuery = isSchoolAdmin
      ? ticketsColl
      : safeQuery(ticketsColl, safeWhere('senderEmail', '==', user.email));

    const unsubTickets = safeOnSnapshot(ticketsQuery, (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((docRef) => {
        const d = docRef.data();
        const sender = d.senderEmail || '';
        if (isSchoolAdmin || sender.toLowerCase() === user.email.toLowerCase()) {
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
      console.warn("[Tickets] Security rules restricted support tickets query, using secure query filters. Error:", error);
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
        handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/exams`);
      });
    }

    // 4. Subscribe to Admin-Published Subject Lectures and Documents
    const unsubLectures = onSnapshot(collection(db, 'subject_lectures'), (snapshot) => {
      if (snapshot.empty) {
        // If empty, seed from default initial values
        const defaultLectures = {
          math: [
            { title: 'المستند المطلوب 1: حساب التفاضل والتكامل المتقدم', duration: 'مستند رئيسي معتمد', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: الدوال اللوغاريتمية والأسية', duration: 'ملخص الباب الأول', type: 'pdf' as const },
            { title: 'المستند المطلوب 3: المصفوفات والمحددات في الجبر', duration: 'ورقة عمل شاملة', type: 'pdf' as const },
            { title: 'المستند المطلوب 4: تطبيقات الهندسة الفراغية ثلاثية الأبعاد', duration: 'نموذج محلول وقابل للطباعة', type: 'pdf' as const },
            { title: 'المستند المطلوب 5: مبادئ الإحصاء والاحتمالات', duration: 'ملخص شامل', type: 'pdf' as const },
            { title: 'المستند المطلوب 6: حل المعادلات التفاضلية البسيطة', duration: 'اختبار تجريبي', type: 'pdf' as const },
          ],
          physics: [
            { title: 'المستند المطلوب 1: الميكانيكا الكلاسيكية وقوانين الحركة والتسارع', duration: 'مذكرة القوانين وتحضير', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: الديناميكا الحرارية وتطبيقاتها العملي والفيزيائي', duration: 'ملخص معتمد', type: 'pdf' as const },
            { title: 'المستند المطلوب 3: الكهربية الساكنة وقانون كولوم والشحنات', duration: 'تأسيس شامل', type: 'pdf' as const },
            { title: 'المستند المطلوب 4: المغناطيسية وتطبيقات الحث الكهرومغناطيسي', duration: 'مرجع كامل', type: 'pdf' as const },
          ],
          chemistry: [
            { title: 'المستند المطلوب 1: الكيمياء العضوية وتراكيب ذرات الكربون وعلاقتها', duration: 'ملخص الباب الأول', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: الجدول الدوري وتوصيف الروابط التساهمية والأيونية', duration: 'توزيع معتمد', type: 'pdf' as const },
            { title: 'المستند المطلوب 3: معدلات التفاعلات الكيميائية ومفهوم الاتزان الكيميائي', duration: 'ورقة تدريب', type: 'pdf' as const },
            { title: 'المستند المطلوب 4: الأحماض والقواعد ومقياس الرقم الهيدروجيني pH', duration: 'مستند معملي شامل', type: 'pdf' as const },
          ],
          english: [
            { title: 'المستند المطلوب 1: قواعد الأزمنة وتراكيب الجمل الإنجليزية المعقدة', duration: 'مذكرة القواعد المعتمدة', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: مهارات الكتابة الأكاديمية وصياغة البحوث والتقارير', duration: 'تعبير متميز للترم جاري', type: 'pdf' as const },
            { title: 'المستند المطلوب 3: مهارات الاستماع والمحادثة في البيئة الجامعية والمهنية', duration: 'دليلك القياسي والصوتي', type: 'pdf' as const },
            { title: 'المستند المطلوب 4: القراءة السريعة وتحليل النصوص وفك رموز الكلمات المتقدمة', duration: 'اختبار تجريبي قياسي', type: 'pdf' as const },
          ],
          safety: [
            { title: 'المستند المطلوب 1: مقدمة في سلامة الحياة وإدارة المخاطر والتهديدات', duration: 'حقيبة تفصيلية', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: الإجراءات الوقائية في حالات الطوارئ وخطط الإخلاء', duration: 'خارطة السلامة والأمن المعتمدة', type: 'pdf' as const },
            { title: 'المستند المطلوب 3: الإسعافات الأولية والتعامل الفوري مع الإصابات الطارئة', duration: 'شرح مرئي وتطبيقي', type: 'video' as const }
          ],
          programming: [
            { title: 'المستند المطلوب 1: مفاهيم البرمجة الأساسية وكتابة الأنماط النظيفة', duration: 'تأسيس بايثون وقواعد OOP', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: تحليل الخوارزميات وتصميم البنى البرمجية المعقدة', duration: 'توصيف البيانات والعمليات', type: 'pdf' as const },
            { title: 'المستند المطلوب 3: مبادئ البرمجة كائنية التوجه OOP وتوزيع الصفوف', duration: 'المرجع الجامعي الشامل', type: 'pdf' as const }
          ],
          history: [
            { title: 'المستند المطلوب 1: تأسيس الدولة الروسية والملوك الأوائل للبلاد', duration: 'ملخص التاريخ', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: روسيا القيصرية والتحولات السياسية الكبرى في القرن الـ 19', duration: 'ملحق الأحداث والقرارات للترم الحالي', type: 'pdf' as const }
          ],
          russian: [
            { title: 'المستند المطلوب 1: الحروف الأبجدية الروسية واللفظ الصحيح للمقاطع', duration: 'حقيبة صوتية وحروف المبتدئ', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: تراكيب الجمل الحوارية والردود السريعة اليومية', duration: 'دليل المحادثة الشائعة المعتمد', type: 'pdf' as const },
            { title: 'المستند المطلوب 3: قواعد جمع الأسماء وصياغة التفضيلات اللغوية', duration: 'أساسيات الصرف والنحو', type: 'pdf' as const }
          ],
          sports: [
            { title: 'المستند المطلوب 1: اللياقة البدنية والتمارين الهوائية والصحة الغذائية المتكاملة', duration: 'كابتن معتمد لتأهيل مالي', type: 'pdf' as const },
            { title: 'المستند المطلوب 2: طرق الوقاية من التشنجات والإصابات العضلية والتأهيل الرياضي', duration: 'ملخص حرق وتقوية عضلية', type: 'pdf' as const }
          ]
        };

        Object.entries(defaultLectures).forEach(async ([subjId, docsList]) => {
          try {
            await setDoc(doc(db, 'subject_lectures', subjId), { lectures: docsList });
          } catch (seedErr) {
            console.error(`Failed to seed lectures for subject ${subjId}:`, seedErr);
          }
        });
      } else {
        const fetchedMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf'; url?: string }[]> = {};
        snapshot.forEach((docRef) => {
          fetchedMap[docRef.id] = docRef.data().lectures || [];
        });
        setSubjectLectures(fetchedMap);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'subject_lectures');
    });

    return () => {
      unsubNotif();
      unsubTickets();
      unsubExams();
      unsubLectures();
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
        
        const userDocRef = doc(db, 'users', fbUser.uid);
        let userTelegram = '@google_user';
        let userStage = 'بكالوريوس';
        let userYear = 'سنة أولى';
        let userSemester = 'فصل أول';
        let userTrack = 'علمي';

        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const d = docSnap.data();
            userTelegram = d.telegram || userTelegram;
            userStage = d.academicStage || userStage;
            userYear = d.academicYear || userYear;
            userSemester = d.academicSemester || userSemester;
            userTrack = d.academicTrack || userTrack;
          } else {
            // New Google user, save defaults
            await setDoc(userDocRef, {
              username,
              email,
              avatarUrl,
              telegram: userTelegram,
              isLoggedIn: true,
              academicStage: userStage,
              academicYear: userYear,
              academicSemester: userSemester,
              academicTrack: userTrack,
              signUpDate: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
              scorePct: 100,
              completedCount: 0
            });
          }
        } catch (dbErr) {
          console.error("Failed to fetch/write profile to Firestore on Google Login:", dbErr);
        }

        const loggedUser: User = {
          username,
          email,
          avatarUrl,
          isLoggedIn: true,
          telegram: userTelegram,
          academicStage: userStage,
          academicYear: userYear,
          academicSemester: userSemester,
          academicTrack: userTrack
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

  const handleLoginSuccess = async (
    username: string, 
    email: string, 
    telegram?: string,
    academicStage?: string,
    academicYear?: string,
    academicSemester?: string,
    academicTrack?: string
  ) => {
    // Premium custom avatar generated from initial letter
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=1b365d,c9a24a`;
    const stage = academicStage || 'بكالوريوس';
    const year = academicYear || 'سنة أولى';
    const semester = academicSemester || 'فصل أول';
    const track = academicTrack || 'علمي';

    const loggedUser: User = {
      username,
      email,
      avatarUrl: avatar,
      isLoggedIn: true,
      telegram: telegram || '@abdulmlik_ou',
      academicStage: stage,
      academicYear: year,
      academicSemester: semester,
      academicTrack: track
    };

    // Save profile metadata on standard successful logins too
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          username,
          email,
          avatarUrl: avatar,
          telegram: telegram || '@abdulmlik_ou',
          isLoggedIn: true,
          academicStage: stage,
          academicYear: year,
          academicSemester: semester,
          academicTrack: track
        }, { merge: true });
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
          isLoggedIn: true,
          academicStage: updatedUser.academicStage || 'بكالوريوس',
          academicYear: updatedUser.academicYear || 'سنة أولى',
          academicSemester: updatedUser.academicSemester || 'فصل أول',
          academicTrack: updatedUser.academicTrack || 'علمي'
        }, { merge: true });
      } catch (dbErr) {
        console.error("Failed to sync profile update to Cloud:", dbErr);
      }
    }
  };

  const handleUpdateSubjects = (updatedSubjects: Subject[]) => {
    setSubjects(updatedSubjects);
    localStorage.setItem('school_subjects', JSON.stringify(updatedSubjects));
  };

  const handleUpdateSubjectLectures = async (updatedMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf'; url?: string }[]>) => {
    setSubjectLectures(updatedMap);
    localStorage.setItem('school_subject_lectures', JSON.stringify(updatedMap));

    // Persist each modified subject list to Cloud Firestore database!
    for (const [subjId, docsList] of Object.entries(updatedMap)) {
      try {
        await setDoc(doc(db, 'subject_lectures', subjId), { lectures: docsList });
      } catch (err) {
        console.error(`Failed to sync lectures for ${subjId} to Cloud:`, err);
      }
    }
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B1B3F] text-white flex flex-col items-center justify-center p-6 text-center" style={{ direction: 'rtl' }}>
        <div className="space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-300">جاري تحميل منصة بن عون التعليمية...</p>
        </div>
      </div>
    );
  }

  const activeExam = initialExams.find((e) => e.id === activeExamId);

  return (
    <div className={`min-h-screen w-full transition-colors duration-500 ${!user ? 'bg-brand-dark' : 'bg-brand-gray'} text-brand-dark flex flex-col items-center justify-center md:py-6 lg:py-8`} style={{ direction: 'rtl' }}>
      
      {/* High-quality Centered Application Container: Fills mobile screens, elegantly expanded with dual-panel sidebars on laptops/computers */}
      <div className={`w-full transition-all duration-500 ${
        !user 
          ? 'max-w-[460px] bg-brand-dark border-transparent shadow-2xl shadow-black/40 h-screen md:h-[880px] md:max-h-[880px] md:rounded-[36px]' 
          : 'max-w-full md:max-w-[480px] lg:max-w-6xl xl:max-w-7xl bg-white border-gray-100 shadow-2xl h-screen lg:h-[880px] lg:max-h-[880px] lg:rounded-[36px]'
      } overflow-hidden flex flex-col lg:flex-row justify-between border-0 lg:border relative`}>
        
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
                  onClick={() => setActiveTab('students')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right font-black text-xs cursor-pointer ${
                    activeTab === 'students' 
                      ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/10 font-black' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Users size={15} />
                  <span>دليل الطُلاب والدردشة</span>
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
          !user ? 'p-0' : activeTab === 'home' ? 'p-0' : 'px-4 py-3.5 md:p-6 lg:p-8'
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
                  user={user}
                />
              )}

              {activeTab === 'discussions' && (
                <DiscussionsView
                  subjects={subjects}
                  user={user}
                />
              )}

              {activeTab === 'students' && (
                <StudentsView
                  user={user}
                  onNavigateToTab={setActiveTab}
                  activeCallId={activeCallId}
                  setActiveCallId={setActiveCallId}
                  activeChatUser={activeChatUser}
                  setActiveChatUser={setActiveChatUser}
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
                  onUpdateSubjectLectures={handleUpdateSubjectLectures}
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
                  onUpdateSubjectLectures={handleUpdateSubjectLectures}
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
          <>
            <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-full bg-white/95 backdrop-blur-md px-4 py-2 flex justify-around items-end text-gray-400 shadow-[0_12px_36px_rgba(4,27,77,0.15)] border border-gray-150/40 select-none" dir="rtl">
              
              {/* 5. الملف الشخصي (Leftmost in RTL) */}
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setShowMoreMenu(false);
                }}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all pb-1.5 min-w-[48px] ${
                  activeTab === 'profile' && !showMoreMenu ? 'text-[#0B1B3F] font-black scale-105' : 'text-[#6B7280]'
                }`}
              >
                <UserIcon size={20} className={activeTab === 'profile' && !showMoreMenu ? 'text-[#0B1B3F] stroke-[2.3]' : 'stroke-[1.8] text-gray-400'} />
                <span className="text-[9px] font-bold">الملف الشخصي</span>
              </button>

              {/* 4. المحادثات (Second from left, with gorgeous badge 2) */}
              <button
                onClick={() => {
                  setActiveTab('discussions');
                  setShowMoreMenu(false);
                }}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all pb-1.5 relative min-w-[48px] ${
                  activeTab === 'discussions' && !showMoreMenu ? 'text-[#0B1B3F] font-black scale-105' : 'text-[#6B7280]'
                }`}
              >
                <div className="relative">
                  <MessageSquare size={20} className={activeTab === 'discussions' && !showMoreMenu ? 'text-[#0B1B3F] stroke-[2.3]' : 'stroke-[1.8] text-gray-400'} />
                  {/* Matching gold badge with '2' from the mockup */}
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-[#D4A947] text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white shadow-xs leading-none">
                    2
                  </span>
                </div>
                <span className="text-[9px] font-bold">المحادثات</span>
              </button>

              {/* 3. الرئيسية (Center highlighted) */}
              <button
                onClick={() => {
                  setActiveTab('home');
                  setShowMoreMenu(false);
                }}
                className="flex flex-col items-center gap-1 cursor-pointer transition-all -mt-8 min-w-[48px]"
              >
                <div className="w-13 h-13 rounded-full bg-[#0B1B3F] border-4 border-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95">
                  <Home size={22} className="text-[#D4A947] stroke-[2.5]" />
                </div>
                <span className={`text-[10px] font-black ${activeTab === 'home' && !showMoreMenu ? 'text-[#0B1B3F]' : 'text-[#6B7280]'}`}>الرئيسية</span>
              </button>

              {/* 2. المواد */}
              <button
                onClick={() => {
                  setActiveTab('subjects');
                  setShowMoreMenu(false);
                }}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all pb-1.5 min-w-[48px] ${
                  activeTab === 'subjects' && !showMoreMenu ? 'text-[#0B1B3F] font-black scale-105' : 'text-[#6B7280]'
                }`}
              >
                <BookOpen size={20} className={activeTab === 'subjects' && !showMoreMenu ? 'text-[#0B1B3F] stroke-[2.3]' : 'stroke-[1.8] text-gray-400'} />
                <span className="text-[9px] font-bold">المواد</span>
              </button>

              {/* 1. المزيد (Rightmost in RTL) */}
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all pb-1.5 min-w-[48px] ${
                  showMoreMenu ? 'text-[#0B1B3F] font-black scale-105' : 'text-[#6B7280]'
                }`}
              >
                <LayoutGrid size={20} className={showMoreMenu ? 'text-[#0B1B3F] stroke-[2.3]' : 'stroke-[1.8] text-gray-400'} />
                <span className="text-[9px] font-bold">المزيد</span>
              </button>

            </nav>

            {/* Slide-up custom Bottom sheet for More Options */}
            {showMoreMenu && (
              <div 
                className="fixed inset-0 bg-[#0B1B3F]/40 backdrop-blur-sm z-45 lg:hidden flex flex-col justify-end" 
                onClick={() => setShowMoreMenu(false)}
              >
                <div 
                  className="bg-white rounded-t-3xl p-5 pb-8 space-y-4 shadow-2xl border-t border-gray-150 animate-fade-in text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b pb-3 border-gray-100">
                    <h3 className="font-extrabold text-sm text-[#0B1B3F] flex items-center gap-1.5">
                      <MoreHorizontal size={18} className="text-[#D4A947]" />
                      <span>المزيد من الخدمات والأدوات</span>
                    </h3>
                    <button 
                      onClick={() => setShowMoreMenu(false)} 
                      className="p-1.5 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Students page / الزملاء */}
                    <button
                      onClick={() => {
                        setActiveTab('students');
                        setShowMoreMenu(false);
                      }}
                      className="p-3 bg-[#F8FAFC] border border-gray-100 hover:border-gray-200 rounded-2xl flex flex-col items-start gap-1 text-right transition active:scale-95 cursor-pointer"
                    >
                      <div className="p-2 bg-[#0B1B3F]/5 text-[#0B1B3F] rounded-xl mb-1">
                        <Users size={16} />
                      </div>
                      <h4 className="font-extrabold text-xs text-[#0B1B3F]">الزملاء بالمنصة</h4>
                      <p className="text-[8px] text-[#6B7280]">الدردشة والاتصال المباشر</p>
                    </button>

                    {/* Exams / الاختبارات */}
                    <button
                      onClick={() => {
                        setActiveTab('exams');
                        setShowMoreMenu(false);
                      }}
                      className="p-3 bg-[#F8FAFC] border border-gray-100 hover:border-gray-200 rounded-2xl flex flex-col items-start gap-1 text-right transition active:scale-95 cursor-pointer"
                    >
                      <div className="p-2 bg-[#D4A947]/10 text-[#D4A947] rounded-xl mb-1">
                        <Calendar size={16} />
                      </div>
                      <h4 className="font-extrabold text-xs text-[#0B1B3F]">دليل الاختبارات</h4>
                      <p className="text-[8px] text-[#6B7280]">الامتحانات والتسريبات والدرجات</p>
                    </button>

                    {/* Technical support */}
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setShowMoreMenu(false);
                      }}
                      className="p-3 bg-[#F8FAFC] border border-gray-100 hover:border-gray-200 rounded-2xl flex flex-col items-start gap-1 text-right transition active:scale-95 cursor-pointer"
                    >
                      <div className="p-2 bg-[#0B1B3F]/5 text-[#0B1B3F] rounded-xl mb-1">
                        <Smartphone size={16} />
                      </div>
                      <h4 className="font-extrabold text-xs text-[#0B1B3F]">الدعم الفني</h4>
                      <p className="text-[8px] text-[#6B7280]">إرسال ومتابعة تذاكر المساعدة</p>
                    </button>

                    {/* Admin dashboard link */}
                    {user?.email === 'abdulmlikoog@gmail.com' && (
                      <button
                        onClick={() => {
                          setActiveTab('admin');
                          setShowMoreMenu(false);
                        }}
                        className="p-3 bg-[#D4A947]/5 border border-[#D4A947]/20 hover:bg-[#D4A947]/10 rounded-2xl flex flex-col items-start gap-1 text-right transition active:scale-95 cursor-pointer"
                      >
                        <div className="p-2 bg-[#D4A947]/10 text-[#D4A947] rounded-xl mb-1">
                          <Shield size={16} />
                        </div>
                        <h4 className="font-extrabold text-xs text-[#0B1B3F]">لوحة الإدارة</h4>
                        <p className="text-[8px] text-[#D4A947] font-bold">إصدار الإعلانات والتحكم</p>
                      </button>
                    )}
                  </div>

                  {/* Dark Mode Slide selector */}
                  <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-2xl border border-gray-100 mt-2">
                    <span className="text-xs font-bold text-[#12233D]">المظهر الليلي الداكن</span>
                    <button 
                      onClick={() => setDarkMode(!darkMode)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                        darkMode ? 'bg-[#D4A947]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform duration-300 ${
                        darkMode ? '-translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                </div>
              </div>
            )}
          </>
        )}

        {/* Global Passive Ringing floating notifier */}
        {globalIncomingCall && (
          <div className="fixed bottom-20 sm:bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-white border border-gray-150 rounded-2xl p-4 shadow-2xl z-50 flex items-center justify-between gap-3 animate-bounce select-none" dir="rtl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center animate-pulse shrink-0">
                <PhoneIncoming size={20} />
              </div>
              <div className="text-right min-w-0">
                <h4 className="font-extrabold text-xs text-gray-800 truncate">مكالمة واردة ومباشرة</h4>
                <p className="text-[10px] text-gray-500 font-bold truncate mt-0.5">الزميل {globalIncomingCall.callerName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={async () => {
                  // Accept and redirect to students tab
                  const coll = collection(db, 'users');
                  const dRef = doc(db, 'users', globalIncomingCall.callerUid);
                  try {
                    const docS = await getDoc(dRef);
                    if (docS.exists()) {
                      setActiveChatUser({ ...docS.data(), uid: docS.id } as any);
                    }
                  } catch (e) {}
                  setActiveCallId(globalIncomingCall.id);
                  setActiveTab('students');
                }}
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                title="الرد على المكالمة"
              >
                <Check size={14} className="stroke-[2.5]" />
              </button>
              
              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'private_calls', globalIncomingCall.id), { status: 'declined' });
                    setTimeout(async () => {
                      await deleteDoc(doc(db, 'private_calls', globalIncomingCall.id)).catch(() => {});
                    }, 1000);
                  } catch (e) {}
                  setGlobalIncomingCall(null);
                }}
                className="p-2 bg-red-100 hover:bg-red-500 hover:text-white rounded-xl text-red-500 transition-all cursor-pointer"
                title="رفض"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
