import React from 'react';
import { BookOpen, Atom, FlaskConical, Languages } from 'lucide-react';

interface SubjectIconProps {
  type: 'math' | 'physics' | 'chemistry' | 'english';
  className?: string;
  size?: number;
}

export default function SubjectIcon({ type, className = '', size = 20 }: SubjectIconProps) {
  const getSubjectStyles = () => {
    switch (type) {
      case 'math':
        return {
          bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
          icon: BookOpen,
        };
      case 'physics':
        return {
          bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
          icon: Atom,
        };
      case 'chemistry':
        return {
          bg: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
          icon: FlaskConical,
        };
      case 'english':
        return {
          bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
          icon: Languages,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700',
          icon: BookOpen,
        };
    }
  };

  const { bg, icon: IconComponent } = getSubjectStyles();

  return (
    <div className={`p-2.5 rounded-xl flex items-center justify-center ${bg} ${className}`}>
      <IconComponent size={size} className="stroke-[2.2]" />
    </div>
  );
}
