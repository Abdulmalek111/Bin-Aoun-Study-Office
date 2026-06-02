import React, { useState } from 'react';
import Logo from './Logo';
import firebaseConfig from '../../firebase-applet-config.json';

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
  const [copied, setCopied] = useState(false);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
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

        {/* Dynamic Iframe Warning for nested contexts to avoid blocks */}
        {isIframe && (
          <div className="p-3.5 bg-brand-blue/35 border border-brand-gold/20 rounded-xl text-right space-y-2 mt-2">
            <div className="flex items-center gap-2 text-brand-gold text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-ping" />
              <span>ملاحظة للمعاينة والتجربة:</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
              عند تشغيل التطبيق داخل إطار المعاينة الجانبي، قد يقوم متصفحك بحجب نافذة Google المنبثقة للتأمين. ننصحك بفتح التطبيق في صفحة مستقلة لتجنب أي قيود.
            </p>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="w-full py-2 bg-brand-gold hover:bg-yellow-600 text-brand-dark text-[11px] font-black rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>فتح التطبيق في نافذة خارجية مستقلة 🚀</span>
            </button>
          </div>
        )}

        {/* Display Arabic Authentication Errors Beautifully */}
        {authError && (
          <div className="p-4 bg-red-950/70 border border-red-500/30 rounded-2xl text-red-200 text-xs text-right space-y-3 my-2 animate-fade-in relative">
            <button 
              onClick={onClearError} 
              className="absolute top-2 left-2 text-red-300 hover:text-white font-bold p-1 rounded focus:outline-none text-lg leading-none cursor-pointer"
            >
              ×
            </button>
            
            {(authError.includes('unauthorized-domain') || authError.includes('غير مصرح') || authError.includes('النطاق')) ? (
              <div className="space-y-3">
                <div className="font-bold text-sm text-yellow-400 flex items-center gap-2">
                  <span>💡 حل مشكلة النطاق غير المصرّح به (Unauthorized Domain)</span>
                </div>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  حماية Firebase تمنع حالياً تسجيل الدخول من هذا النطاق الجديد حتى تضيفه يدوياً إلى نطاقاتك المصرح بها في لوحة التحكم.
                </p>
                
                <div className="bg-black/40 p-2.5 rounded-xl flex items-center justify-between gap-2 border border-white/5">
                  <div className="font-mono text-[10px] text-brand-gold select-all truncate break-all font-bold">
                    {window.location.hostname}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.hostname);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    {copied ? '✓ تم النسخ!' : 'نسخ النطاق'}
                  </button>
                </div>

                <div className="space-y-2 text-gray-300 text-[11px] pr-2 border-r-2 border-brand-gold/30">
                  <div>1. اذهب إلى إعدادات موفري الخدمة بمشروعك في Firebase:</div>
                  <a 
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-gold hover:underline inline-block font-bold text-[10px]"
                  >
                    فتح إعدادات النطاقات في Firebase (اضغط هنا) ↗
                  </a>
                  <div>2. انزل إلى قسم <b>النطاقات المصرح بها (Authorized domains)</b> بالأسفل.</div>
                  <div>3. اضغط <b>إضافة نطاق (Add domain)</b>، والصق النطاق الذي نسخته، ثم احفظ الإعدادات!</div>
                </div>
              </div>
            ) : (
              <div className="text-right leading-relaxed font-semibold">
                {authError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
