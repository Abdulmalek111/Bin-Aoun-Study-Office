import React, { useState, useEffect } from 'react';
import { Home, Calendar, LayoutGrid, User as UserIcon, BookOpen, Smartphone, ShieldCheck, Award } from 'lucide-react';

// Types and Initial Mock Data
import { User, Subject, Exam, TabType } from './types';
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [examHistory, setExamHistory] = useState<{ examTitle: string; scorePct: number; date: string; timeUsed: string }[]>([]);
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('school_dark_mode') === 'true';
  });

  // Apply dark mode theme class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('school_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark-mode');
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
        setSubjects(JSON.parse(savedSubjects));
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

  // Sync state functions
  const handleLoginSuccess = (username: string, email: string) => {
    // Premium custom avatar generated from initial letter
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=1b365d,c9a24a`;
    const loggedUser: User = {
      username,
      email,
      avatarUrl: avatar,
      isLoggedIn: true,
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
  };

  const handleUpdateEmail = (newEmail: string) => {
    if (!user) return;
    const updated = { ...user, email: newEmail };
    setUser(updated);
    localStorage.setItem('school_user', JSON.stringify(updated));
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
      <div className={`w-full max-w-[460px] transition-all duration-500 ${!user ? 'bg-brand-dark border-transparent shadow-2xl shadow-black/40' : 'bg-white border-gray-100 shadow-2xl'} min-h-screen md:min-h-[880px] md:rounded-[36px] overflow-hidden flex flex-col justify-between border relative`}>
        
        {/* Main Content Area */}
        <div className={`flex-grow no-scrollbar flex flex-col justify-between ${!user ? 'p-0' : 'px-5 py-5'}`}>
          
          {!user ? (
            authScreen === 'welcome' ? (
              <WelcomeView 
                onNavigateToLogin={() => setAuthScreen('login')}
                onNavigateToRegister={() => setAuthScreen('register')}
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
                />
              )}

              {activeTab === 'subjects' && (
                <SubjectsView
                  subjects={subjects}
                  onToggleLecture={handleToggleLecture}
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
                  onUpdateEmail={handleUpdateEmail}
                  onNavigateToTab={setActiveTab}
                  darkMode={darkMode}
                  onToggleDarkMode={setDarkMode}
                  deferredPrompt={deferredPrompt}
                  onInstallApp={handleInstallApp}
                />
              )}
            </div>
          )}

        </div>

        {/* Common Bottom Mobile Navigation Dock (Hidden if in active exam screen for complete testing focus) */}
        {user && !activeExamId && (
          <nav className="bg-white border-t border-gray-150 px-5 py-3.5 flex justify-between items-center text-gray-400 shadow-md z-30 select-none rounded-t-2xl">
            
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
              <span className="text-[10px]">الشخصي</span>
            </button>

          </nav>
        )}

      </div>

    </div>
  );
}
