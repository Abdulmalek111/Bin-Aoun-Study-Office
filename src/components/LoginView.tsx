import React, { useState } from 'react';
import { User as UserIcon, Lock, Eye, EyeOff, Globe, Info, Check, ChevronRight, Mail, UserPlus } from 'lucide-react';
import Logo from './Logo';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

interface LoginViewProps {
  onLoginSuccess: (username: string, email: string, avatarUrl?: string) => void;
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Update state when initialMode changes
  React.useEffect(() => {
    setIsRegistering(initialMode === 'register');
  }, [initialMode]);
  
  // Registration state
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('الرجاء كتابة اسم المستخدم وكلمة المرور');
      return;
    }

    const isDemoAccount = (cleanUsername === 'عبدالملك' || cleanUsername === 'عبد الملك') && cleanPassword === '123456';
    
    const localRegisteredUser = localStorage.getItem('custom_auth_user');
    const localRegisteredPass = localStorage.getItem('custom_auth_pass');
    const isCustomAccount = localRegisteredUser && 
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
      onLoginSuccess('عبدالملك', 'abdulmlikoog@gmail.com');
    } else if (isCustomAccount) {
      if (rememberMe) {
        localStorage.setItem('school_remember_me', 'true');
        localStorage.setItem('school_remembered_user', cleanUsername);
        localStorage.setItem('school_remembered_pass', cleanPassword);
      } else {
        localStorage.removeItem('school_remember_me');
        localStorage.removeItem('school_remembered_user');
        localStorage.removeItem('school_remembered_pass');
      }
      const email = localStorage.getItem('custom_auth_email') || 'user@example.com';
      onLoginSuccess(cleanUsername, email);
    } else {
      setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة! للحساب التجريبي اكتب: عبدالملك والرمز: 123456');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRegSuccess(false);

    if (!regUser.trim() || !regPass.trim() || !regEmail.trim()) {
      setErrorMsg('الرجاء تعبئة جميع الحقول لإنشاء الحساب');
      return;
    }

    if (regPass.length < 4) {
      setErrorMsg('كلمة المرور يجب أن تكون 4 خانات على الأقل');
      return;
    }

    localStorage.setItem('custom_auth_user', regUser.trim());
    localStorage.setItem('custom_auth_pass', regPass.trim());
    localStorage.setItem('custom_auth_email', regEmail.trim());
    
    setRegSuccess(true);
    setUsername(regUser);
    setPassword(regPass);
    
    setTimeout(() => {
      setIsRegistering(false);
      setRegSuccess(false);
      setRegUser('');
      setRegPass('');
      setRegEmail('');
    }, 2000);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      if (googleUser) {
        onLoginSuccess(
          googleUser.displayName || googleUser.email?.split('@')[0] || 'مستخدم جوجل',
          googleUser.email || '',
          googleUser.photoURL || undefined
        );
      }
    } catch (error: any) {
      console.error("Google Sign-In Error: ", error);
      if (error && error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول من قبل المستخدم');
      } else if (error && error.code === 'auth/network-request-failed') {
        setErrorMsg('فشل الاتصال بالشبكة، يرجى المحاولة مرة أخرى');
      } else if (error && error.message) {
        setErrorMsg(`فشل تسجيل الدخول: ${error.message}`);
      } else {
        setErrorMsg('فشل تسجيل الدخول عبر Google. يرجى المحاولة لاحقاً');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full bg-brand-dark text-white flex flex-col min-h-screen md:min-h-[880px] p-8 text-center relative" style={{ direction: 'rtl' }}>
      {/* Background radial glow */}
      <div className="absolute top-[-10%] left-[-10%] right-[-10%] bottom-[-10%] bg-radial from-brand-blue/30 via-brand-dark/95 to-brand-dark pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/25 to-transparent pointer-events-none z-0" />

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
                className="w-full py-4 bg-brand-gold hover:bg-yellow-600 text-brand-dark rounded-2xl text-sm font-black shadow-lg transition-all transform active:scale-[0.98] cursor-pointer"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                تسجيل الدخول
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setErrorMsg('');
                }}
                className="w-full py-4 bg-transparent border-2 border-brand-gold text-white hover:bg-white/5 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                إنشاء حساب جديد
              </button>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="px-3 text-[11px] text-gray-400 font-bold whitespace-nowrap font-sans">أو الدخول السريع</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className={`w-full py-4 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-2xl text-[13px] font-black shadow-lg transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 ${isGoogleLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.275 1.564-1.88 4.594-6.887 4.594-4.33 0-7.86-3.585-7.86-8s3.53-8 7.86-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.103C18.28 1.41 15.42 0 12.24 0 5.58 0 0 5.4 0 12s5.58 12 12.24 12c6.96 0 11.57-4.83 11.57-11.64 0-.81-.085-1.425-.195-2.073l-11.375-.002z"
                  />
                </svg>
                <span>{isGoogleLoading ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول عبر Google'}</span>
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
            </div>

            {/* Action buttons for registration */}
            <div className="space-y-3 pt-3">
              <button
                type="submit"
                className="w-full py-4 bg-brand-gold hover:bg-yellow-600 text-brand-dark rounded-2xl text-sm font-black shadow-lg transition-all cursor-pointer"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                تأكيد إنشاء الحساب
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setErrorMsg('');
                }}
                className="w-full py-4 bg-transparent border border-white/20 text-gray-300 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                هل لديك حساب بالفعل؟ العودة لتسجيل الدخول
              </button>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="px-3 text-[11px] text-gray-400 font-bold whitespace-nowrap font-sans">أو التسجيل السريع</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className={`w-full py-4 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-2xl text-[13px] font-black shadow-lg transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 ${isGoogleLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.275 1.564-1.88 4.594-6.887 4.594-4.33 0-7.86-3.585-7.86-8s3.53-8 7.86-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.103C18.28 1.41 15.42 0 12.24 0 5.58 0 0 5.4 0 12s5.58 12 12.24 12c6.96 0 11.57-4.83 11.57-11.64 0-.81-.085-1.425-.195-2.073l-11.375-.002z"
                  />
                </svg>
                <span>{isGoogleLoading ? 'جاري الاتصال بـ Google...' : 'التسجيل عبر Google'}</span>
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
