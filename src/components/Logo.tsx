import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'logo-only' | 'full' | 'stacked-dark' | 'simple-white';
}

export default function Logo({ className = '', variant = 'full' }: LogoProps) {
  // Use the exact high-quality image uploaded by the user
  const logoUrl = 'https://i.ibb.co/4Rb3WTKX/Chat-GPT-Image-May-31-2026-12-39-58-AM.png';

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className} select-none`}>
      <img
        src={logoUrl}
        alt="شعار مكتب بن عون الدراسي"
        className={`${
          variant === 'logo-only' 
            ? 'w-24 h-auto' 
            : variant === 'stacked-dark' 
            ? 'w-44 h-auto' 
            : 'w-40 h-auto'
        } object-contain transition-all`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}


