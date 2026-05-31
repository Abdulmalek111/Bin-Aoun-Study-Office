import React from 'react';
import Logo from './Logo';

interface WelcomeViewProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  onGoogleLogin: () => void;
  isLoggingIn: boolean;
  authError: string | null;
  onClearError: () => void;
}

export default function WelcomeView({ 
  onNavigateToLogin, 
  onNavigateToRegister,
  onGoogleLogin,
  isLoggingIn,
  authError,
  onClearError
}: WelcomeViewProps) {
  return (
    <div className="w-full bg-brand-dark min-h-screen md:min-h-[880px] overflow-hidden flex flex-col justify-between p-8 text-center relative select-none">
      {/* Center content container */}
      <div className="my-auto space-y-12 z-10 flex flex-col items-center">
        {/* Large Brand Calligraphy Emblem */}
        <Logo variant="stacked-dark" className="scale-105" />

        {/* Wording exactly matching the user's screenshot */}
        <div className="space-y-3.5">
          <h2 className="text-xl font-bold text-white tracking-wide">
            مرحباً بك في بن عون
          </h2>
          <p className="text-sm text-gray-300 font-medium opacity-90 leading-relaxed">
            منصة خدمات طلابية متكاملة
          </p>
        </div>
      </div>

      {/* Styled Action Buttons */}
      <div className="space-y-4 pt-6 z-10">
        {/* Gold filled button for main login action */}
        <button
          onClick={onNavigateToLogin}
          className="w-full py-4 bg-brand-gold hover:bg-yellow-600 text-brand-dark text-sm font-black rounded-2xl shadow-lg transition-all transform active:scale-[0.98] cursor-pointer"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          تسجيل الدخول
        </button>

        {/* Dark gold outlined button for secondary register action */}
        <button
          onClick={onNavigateToRegister}
          className="w-full py-4 bg-transparent border-2 border-brand-gold text-white text-sm font-bold rounded-2xl hover:bg-white/5 transition-all cursor-pointer"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          إنشاء حساب جديد
        </button>

        {/* Subtle decorative Divider with elegant margins */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-[1px] bg-white/10" />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">أو</span>
          <div className="flex-1 h-[1px] bg-white/10" />
        </div>

        {/* Fully authenticated real Google login button */}
        <button
          onClick={onGoogleLogin}
          disabled={isLoggingIn}
          className="w-full py-3.5 bg-white hover:bg-gray-50 text-[#0f2544] text-xs font-black rounded-2xl shadow-md transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3.5 disabled:opacity-50 select-none border border-transparent hover:border-gray-100"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          {isLoggingIn ? (
            <div className="w-5 h-5 border-2 border-[#091a30] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-3.3-4.53-6.16-4.53z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isLoggingIn ? 'جاري الاتصال...' : 'تسجيل الدخول عبر جوجل'}</span>
        </button>

        {/* Display Arabic Authentication Errors Beautifully */}
        {authError && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs text-center font-medium my-2 animate-fade-in flex items-center justify-between gap-1">
            <span className="flex-1 text-right">{authError}</span>
            <button 
              onClick={onClearError} 
              className="text-red-300 hover:text-white font-bold px-1.5 py-0.5 rounded focus:outline-none text-base leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
