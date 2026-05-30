import React from 'react';
import Logo from './Logo';

interface WelcomeViewProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

export default function WelcomeView({ onNavigateToLogin, onNavigateToRegister }: WelcomeViewProps) {
  return (
    <div className="w-full bg-brand-dark min-h-screen md:min-h-[880px] overflow-hidden flex flex-col justify-between p-8 text-center relative select-none">
      {/* Background Decorative Mesh Glow */}
      <div className="absolute top-[-10%] left-[-10%] right-[-10%] bottom-[-10%] bg-radial from-brand-blue/30 via-brand-dark/95 to-brand-dark pointer-events-none z-0" />
      
      {/* Subtle bottom curve overlay as seen in screenshot */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-0" />

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
      </div>
    </div>
  );
}
