import React, { useState } from 'react';
import { User as UserIcon, Lock, Eye, EyeOff, Globe, Info, Check, ChevronRight, Mail, UserPlus } from 'lucide-react';
import Logo from './Logo';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface LoginViewProps {
  onLoginSuccess: (
    username: string, 
    email: string, 
    telegram?: string, 
    academicStage?: string, 
    academicYear?: string, 
    academicSemester?: string,
    academicTrack?: string
  ) => void;
  initialMode?: 'login' | 'register';
  onNavigateBack?: () => void;
}

export default function LoginView({ onLoginSuccess, initialMode = 'login', onNavigateBack }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeLanguage, setActiveLanguage] = useState('ar');
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
  const [isLoading, setIsLoading] = useState(false);
  
  // Update state when initialMode changes
  React.useEffect(() => {
    setIsRegistering(initialMode === 'register');
  }, [initialMode]);
  
  // Registration state
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTelegram, setRegTelegram] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regStage, setRegStage] = useState('بكالوريوس');
  const [regYear, setRegYear] = useState('سنة أولى');
  const [regSemester, setRegSemester] = useState('فصل أول');
  const [regTrack, setRegTrack] = useState('علمي');

  const getRegYearsList = (stage: string) => {
    if (stage === 'ماستر') {
      return ['سنة أولى', 'سنة ثانية'];
    } else if (stage === 'دكتوراة') {
      return ['سنة أولى', 'سنة ثانية', 'سنة ثالثة'];
    } else {
      return ['طالب مستجد', 'سنة أولى', 'سنة ثانية', 'سنة ثالثة', 'سنة رابعة'];
    }
  };

  const handleRegStageChange = (newStage: string) => {
    setRegStage(newStage);
    const allowed = getRegYearsList(newStage);
    if (!allowed.includes(regYear)) {
      setRegYear(allowed[0]);
    }
  };

  // On mount, load remembered details if present
  React.useEffect(() => {
    const isRemembered = localStorage.getItem('school_remember_me') === 'true';
    if (isRemembered) {
      setRememberMe(true);
      const savedUser = localStorage.getItem('school_remembered_user') || '';
      const savedPass = localStorage.getItem('school_remembered_pass') || '';
      setUsername(savedUser);
      setPassword(savedPass);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('الرجاء كتابة اسم المستخدم وكلمة المرور');
      return;
    }

    const isDemoAccount = (cleanUsername === 'عبدالملك' || cleanUsername === 'عبد الملك') && cleanPassword === '123456';
    
    // Check local fallback
    const localRegisteredUser = localStorage.getItem('custom_auth_user');
    const localRegisteredPass = localStorage.getItem('custom_auth_pass');
    const isCustomLocal = localRegisteredUser && 
                          localRegisteredUser.trim() === cleanUsername && 
                          localRegisteredPass === cleanPassword;

    if (isDemoAccount) {
      if (rememberMe) {
        localStorage.setItem('school_remember_me', 'true');
        localStorage.setItem('school_remembered_user', 'عبدالملك');
        localStorage.setItem('school_remembered_pass', cleanPassword);
      } else {
        localStorage.removeItem('school_remember_me');
        localStorage.removeItem('school_remembered_user');
        localStorage.removeItem('school_remembered_pass');
      }
      onLoginSuccess('عبدالملك', 'abdulmlikoog@gmail.com', '@abdulmlik_ou');
    } else {
      setIsLoading(true);
      try {
        let loginEmail = cleanUsername;
        if (!loginEmail.includes('@')) {
          const savedMappedEmail = localStorage.getItem(`fb_email_for_${cleanUsername.toLowerCase()}`);
          if (savedMappedEmail) {
            loginEmail = savedMappedEmail;
          } else {
            loginEmail = `${cleanUsername.toLowerCase()}@school.com`; // default virtual domain fallback
          }
        }

        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, cleanPassword);
        const fbUser = userCredential.user;

        // Fetch user metadata profile from Firestore
        const docSnap = await getDoc(doc(db, 'users', fbUser.uid));
        let userDisplayName = cleanUsername;
        let userTelegram = '@no_telegram';
        let userStage = 'بكالوريوس';
        let userYear = 'سنة أولى';
        let userSemester = 'فصل أول';
        let userTrack = 'علمي';

        if (docSnap.exists()) {
          const d = docSnap.data();
          userDisplayName = d.username || userDisplayName;
          userTelegram = d.telegram || userTelegram;
          userStage = d.academicStage || userStage;
          userYear = d.academicYear || userYear;
          userSemester = d.academicSemester || userSemester;
          userTrack = d.academicTrack || userTrack;
        } else {
          // If Firestore is empty for some reason, let's write user profile structure to preserve
          const signUpDate = new Date().toISOString().split('T')[0].replace(/-/g, '/');
          await setDoc(doc(db, 'users', fbUser.uid), {
            username: userDisplayName,
            email: fbUser.email || loginEmail,
            telegram: userTelegram,
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userDisplayName)}&backgroundColor=1b365d,c9a24a`,
            isLoggedIn: true,
            signUpDate: signUpDate,
            scorePct: 0,
            completedCount: 0,
            academicStage: userStage,
            academicYear: userYear,
            academicSemester: userSemester,
            academicTrack: userTrack
          });
        }

        if (rememberMe) {
          localStorage.setItem('school_remember_me', 'true');
          localStorage.setItem('school_remembered_user', cleanUsername);
          localStorage.setItem('school_remembered_pass', cleanPassword);
        } else {
          localStorage.removeItem('school_remember_me');
          localStorage.removeItem('school_remembered_user');
          localStorage.removeItem('school_remembered_pass');
        }

        onLoginSuccess(userDisplayName, fbUser.email || loginEmail, userTelegram, userStage, userYear, userSemester, userTrack);

      } catch (error: any) {
        console.error("Firebase Login Error:", error);
        
        // If Firebase fails but we have this user local fallback, allow them to enter
        if (isCustomLocal) {
          const email = localStorage.getItem('custom_auth_email') || 'user@example.com';
          const telegram = localStorage.getItem('custom_auth_telegram') || '';
          onLoginSuccess(cleanUsername, email, telegram);
          setIsLoading(false);
          return;
        }

        let errMsg = 'اسم المستخدم أو كلمة المرور غير صحيحة!';
        if (error.code === 'auth/invalid-email') {
          errMsg = 'صيغة البريد الإلكتروني غير صالحة!';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errMsg = 'بيانات تسجيل الدخول أو الرمز السري غير متطابق!';
        } else if (error.code === 'auth/user-disabled') {
          errMsg = 'عذراً، هذا الحساب تم تعطيله فنيّاً من قِبل إدارة التعليم.';
        } else {
          errMsg = `خطأ في الاتصال بالشبكة: يرجى تمكين البريد وكلمة المرور في Firebase Console. (${error.message})`;
        }
        setErrorMsg(errMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg('');
    setRegSuccess(false);

    if (!regUser.trim() || !regPass.trim() || !regEmail.trim() || !regTelegram.trim()) {
      setErrorMsg('الرجاء تعبئة جميع الحقول لإنشاء الحساب مع التليجرام الإلزامي');
      return;
    }

    if (regPass.length < 6) {
      setErrorMsg('رمز المرور يجب أن يكون 6 خانات على الأقل لسلامة حسابك');
      return;
    }

    let telegramHandle = regTelegram.trim();
    if (!telegramHandle.startsWith('@')) {
      telegramHandle = '@' + telegramHandle;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPass.trim());
      const fbUser = userCredential.user;

      const signUpDate = new Date().toISOString().split('T')[0].replace(/-/g, '/');

      // Create Firestore user profile document
      const initialsAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(regUser.trim())}&backgroundColor=1b365d,c9a24a`;
      await setDoc(doc(db, 'users', fbUser.uid), {
        uid: fbUser.uid,
        fullName: regUser.trim(),
        username: regUser.trim(),
        email: regEmail.trim(),
        phone: '',
        university: '',
        college: '',
        department: '',
        level: regStage,
        photoURL: initialsAvatar,
        avatarUrl: initialsAvatar,
        role: 'student',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        telegram: telegramHandle,
        isLoggedIn: true,
        signUpDate: signUpDate,
        scorePct: 0,
        completedCount: 0,
        academicStage: regStage,
        academicYear: regYear,
        academicSemester: regSemester,
        academicTrack: regTrack
      });

      // Mapped email in local storage for easy login by name or email
      localStorage.setItem(`fb_email_for_${regUser.trim().toLowerCase()}`, regEmail.trim().toLowerCase());
      localStorage.setItem(`fb_email_for_${regEmail.trim().toLowerCase()}`, regEmail.trim().toLowerCase());

      localStorage.setItem('custom_auth_user', regUser.trim());
      localStorage.setItem('custom_auth_pass', regPass.trim());
      localStorage.setItem('custom_auth_email', regEmail.trim());
      localStorage.setItem('custom_auth_telegram', telegramHandle);

      setRegSuccess(true);
      
      setTimeout(() => {
        setIsRegistering(false);
        setRegSuccess(false);
        setRegUser('');
        setRegPass('');
        setRegEmail('');
        setRegTelegram('');
        onLoginSuccess(regUser.trim(), regEmail.trim(), telegramHandle, regStage, regYear, regSemester, regTrack);
      }, 1500);

    } catch (error: any) {
      console.error("Firebase Auth Registration Error:", error);
      let errMsg = 'فشل تعديل وإنشاء الحساب في النظام.';
      if (error.code === 'auth/email-already-in-use') {
        errMsg = 'هذا البريد الإلكتروني مسجل بالفعل في قاعدة البيانات!';
      } else if (error.code === 'auth/invalid-email') {
        errMsg = 'صيغة البريد الإلكتروني غير صالحة!';
      } else if (error.code === 'auth/weak-password') {
        errMsg = 'كلمة المرور ضعيفة جداً! الرجاء اختيار 6 خانات على الأقل.';
      } else if (error.code === 'auth/operation-not-allowed') {
        // Fallback write locally to database as custom fallback if email/password provider is disabled on firebase console
        try {
          // Attempt custom fallback write or guide user
          const mockUid = 'local_' + Date.now();
          await setDoc(doc(db, 'users', mockUid), {
            username: regUser.trim(),
            email: regEmail.trim(),
            telegram: telegramHandle,
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(regUser.trim())}&backgroundColor=1b365d,c9a24a`,
            isLoggedIn: true,
            signUpDate: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
            scorePct: 0,
            completedCount: 0,
            academicStage: regStage,
            academicYear: regYear,
            academicSemester: regSemester,
            academicTrack: regTrack
          });
          
          localStorage.setItem(`fb_email_for_${regUser.trim().toLowerCase()}`, regEmail.trim().toLowerCase());
          localStorage.setItem(`fb_email_for_${regEmail.trim().toLowerCase()}`, regEmail.trim().toLowerCase());
          localStorage.setItem('custom_auth_user', regUser.trim());
          localStorage.setItem('custom_auth_pass', regPass.trim());
          localStorage.setItem('custom_auth_email', regEmail.trim());
          localStorage.setItem('custom_auth_telegram', telegramHandle);
          
          setRegSuccess(true);
          setTimeout(() => {
            setIsRegistering(false);
            setRegSuccess(false);
            onLoginSuccess(regUser.trim(), regEmail.trim(), telegramHandle, regStage, regYear, regSemester, regTrack);
          }, 1500);
          return;
        } catch (dbErr) {
          errMsg = 'يرجى التأكد من تفعيل "Email/Password" في شاشة Authentication بقسم Sign-in method داخل لوحة تفعيل Firebase! أو التحقق من الربط.';
        }
      } else {
        errMsg = `خطأ أثناء إنشاء الحساب الفني: ${error.message}`;
      }
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-brand-dark text-white flex flex-col min-h-screen md:min-h-[880px] p-8 text-center relative" style={{ direction: 'rtl' }}>
      {/* Header Bar */}
      <div className="flex items-center justify-between z-10 w-full mb-4">
        {onNavigateBack ? (
          <button
            type="button"
            onClick={onNavigateBack}
            className="p-2 md:p-2.5 text-white hover:text-brand-gold bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            title="الرجوع"
          >
            <ChevronRight size={18} className="stroke-[2.5]" />
          </button>
        ) : (
          <div className="w-8 h-8" />
        )}
        
        {/* Subtle status node */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-blue/60 border border-brand-gold/25 rounded-full text-[10px] font-bold text-brand-gold">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
          <span>مكتب بن عون</span>
        </div>
      </div>

      {/* Main Contents */}
      <div className="flex-grow flex flex-col justify-between z-10 space-y-6 pt-2">
        
        {/* Upper Brand Section */}
        <div className="flex flex-col items-center">
          <Logo variant="stacked-dark" className="scale-100 transition-all active:scale-95" />
        </div>

        {!isRegistering ? (
          /* LOGIN FORM MODE */
          <form onSubmit={handleSubmit} className="space-y-5 text-right">
            
            {/* Soft Greeting Text */}
            <div className="text-center space-y-1 mb-2">
              <h3 className="text-lg font-bold text-white max-md:text-base">مرحباً بك مجدداً</h3>
              <p className="text-xs text-gray-300">الرجاء تسجيل الدخول لمتابعة حسابك التعليمي</p>
            </div>

            {/* Account Alert Badge */}
            <div className="bg-brand-blue/50 border border-brand-gold/20 rounded-2xl p-3.5 flex gap-2.5 items-start text-xs text-brand-gold leading-relaxed">
              <Info size={16} className="shrink-0 mt-0.5 text-brand-gold" />
              <div>
                <span className="font-bold">حساب تجريبي سريع:</span> 
                <br />
                اسم المستخدم: <code className="bg-brand-dark px-1.5 py-0.5 rounded font-mono font-bold text-white selection:bg-brand-gold">عبدالملك</code> | 
                الرمز: <code className="bg-brand-dark px-1.5 py-0.5 rounded font-mono font-bold text-white selection:bg-brand-gold">123456</code>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-950/70 text-red-300 text-xs p-3.5 rounded-2xl border border-red-900/50 text-center leading-relaxed font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Styled Dark Fields */}
            <div className="space-y-3.5">
              
              {/* Field 1: Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">اسم المستخدم أو البريد الإلكتروني</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-brand-gold">
                    <UserIcon size={18} className="opacity-95" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="قم بكتابة اسم المستخدم"
                    className="w-full pl-4 pr-12 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-white rounded-2xl text-sm focus:outline-none transition-all text-right placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">كلمة المرور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-brand-gold">
                    <Lock size={18} className="opacity-95" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل رمز المرور الخاص بك"
                    className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-white rounded-2xl text-sm focus:outline-none transition-all text-right placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 hover:text-brand-gold transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

            </div>

            {/* Remember Me & Alert link */}
            <div className="flex items-center justify-between text-xs font-medium py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-brand-gold focus:ring-brand-gold h-4 w-4"
                />
                <span>تذكرني على هذا الجهاز</span>
              </label>
              <button
                type="button"
                onClick={() => alert('للحساب التجريبي، يرجى كتابة اسم المستخدم: عبدالملك والرمز: 123456')}
                className="text-brand-gold hover:underline font-bold"
              >
                نسيت رمز المرور؟
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-gold hover:bg-yellow-600 text-brand-dark rounded-2xl text-sm font-black shadow-lg transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                {isLoading && <div className="w-4 h-4 rounded-full border-2 border-brand-dark border-t-transparent animate-spin" />}
                <span>{isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
              </button>
              
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setIsRegistering(true);
                  setErrorMsg('');
                }}
                className="w-full py-4 bg-transparent border-2 border-brand-gold text-white hover:bg-white/5 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                إنشاء حساب جديد
              </button>
            </div>

          </form>
        ) : (
          /* REGISTER FORM MODE */
          <form onSubmit={handleRegister} className="space-y-4 text-right">
            
            <div className="text-center space-y-1 mb-2">
              <h3 className="text-lg font-bold text-white max-md:text-base">إنشاء حساب جديد</h3>
              <p className="text-xs text-gray-300">انضم مجاناً وابدأ اختباراتك وحفظ تقدمك فوراً</p>
            </div>

            {regSuccess && (
              <div className="bg-emerald-950/70 text-emerald-300 text-xs p-3.5 rounded-2xl border border-emerald-900/50 flex items-center justify-center gap-2 font-bold text-center">
                <Check size={16} className="text-emerald-400" />
                <span>تم التسجيل بنجاح! يتم توجيهك الآن...</span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-950/70 text-red-300 text-xs p-3 rounded-2xl border border-red-900/50 text-center font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3.5">
              {/* Field A: Full name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 block">الاسم كامل</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-brand-gold">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    placeholder="مثال: عبدالملك بن عون"
                    className="w-full pl-4 pr-12 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-white rounded-2xl text-sm focus:outline-none transition-all text-right placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Field B: Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 block">البريد الإلكتروني</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-brand-gold">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="username@example.com"
                    className="w-full pl-4 pr-12 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-white rounded-2xl text-sm focus:outline-none transition-all text-left placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Field C: Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 block font-sans">رمز مرور الحساب</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-brand-gold">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="اختر رمراً قوياً"
                    className="w-full pl-4 pr-12 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-white rounded-2xl text-sm focus:outline-none transition-all text-right placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Field D: Telegram Username (Mandatory) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 block">اسم المستخدم في تيليجرام (إلزامي بالرمز @)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-brand-gold">
                    <UserPlus size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={regTelegram}
                    onChange={(e) => setRegTelegram(e.target.value)}
                    placeholder="مثال: @abdulmlik"
                    className="w-full pl-4 pr-12 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-white rounded-2xl text-sm focus:outline-none transition-all text-left placeholder:text-right placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Academic Level selections */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300 block">المرحلة الدراسية</label>
                  <select
                    value={regStage}
                    onChange={(e) => handleRegStageChange(e.target.value)}
                    className="w-full px-2 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold text-white rounded-2xl text-[11px] focus:outline-none transition-all cursor-pointer text-center"
                  >
                    <option value="بكالوريوس" className="text-brand-dark">بكالوريوس</option>
                    <option value="ماستر" className="text-brand-dark">ماجستير / ماستر</option>
                    <option value="دكتوراة" className="text-brand-dark">دكتوراه</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300 block">السنة الدراسية</label>
                  <select
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="w-full px-2 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold text-white rounded-2xl text-[11px] focus:outline-none transition-all cursor-pointer text-center"
                  >
                    {getRegYearsList(regStage).map((year) => (
                      <option key={year} value={year} className="text-brand-dark">{year}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300 block">الفصل الدراسي</label>
                  <select
                    value={regSemester}
                    onChange={(e) => setRegSemester(e.target.value)}
                    className="w-full px-2 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold text-white rounded-2xl text-[11px] focus:outline-none transition-all cursor-pointer text-center"
                  >
                    <option value="فصل أول" className="text-brand-dark">الفصل الأول</option>
                    <option value="فصل ثاني" className="text-brand-dark">الفصل الثاني</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300 block">المسار الدراسي</label>
                  <select
                    value={regTrack}
                    onChange={(e) => setRegTrack(e.target.value)}
                    className="w-full px-2 py-3.5 bg-white/5 border border-white/10 hover:border-brand-gold/40 focus:border-brand-gold text-white rounded-2xl text-[11px] focus:outline-none transition-all cursor-pointer text-center"
                  >
                    <option value="علمي" className="text-brand-dark">علمي</option>
                    <option value="أدبي" className="text-brand-dark">أدبي</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action buttons for registration */}
            <div className="space-y-3 pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-gold hover:bg-yellow-600 text-brand-dark rounded-2xl text-sm font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                {isLoading && <div className="w-4 h-4 rounded-full border-2 border-brand-dark border-t-transparent animate-spin" />}
                <span>{isLoading ? 'جاري تأسيس الحساب الفني...' : 'تأكيد إنشاء الحساب'}</span>
              </button>
              
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setIsRegistering(false);
                  setErrorMsg('');
                }}
                className="w-full py-4 bg-transparent border border-white/20 text-gray-300 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                هل لديك حساب بالفعل؟ العودة لتسجيل الدخول
              </button>
            </div>

          </form>
        )}

        {/* Cohesive Globe Selector */}
        <div className="flex justify-center items-center gap-2 pt-4 border-t border-white/10 text-[10px] text-gray-400 font-bold select-none">
          <Globe size={14} className="text-brand-gold opacity-90" />
          <span>مكتب بن عون الدراسي</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
          <select 
            value={activeLanguage} 
            onChange={(e) => setActiveLanguage(e.target.value)}
            className="bg-transparent font-black text-brand-gold border-none outline-none focus:ring-0 cursor-pointer text-xs"
          >
            <option value="ar" className="text-brand-dark">العربية (AR)</option>
            <option value="en" className="text-brand-dark">English (EN)</option>
          </select>
        </div>

      </div>
    </div>
  );
}
