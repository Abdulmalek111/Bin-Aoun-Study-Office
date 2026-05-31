import React from 'react';
import { BookOpen, Atom, FlaskConical, Languages, Shield, Code, History, Dumbbell, Compass } from 'lucide-react';

interface SubjectIconProps {
  type: 'math' | 'physics' | 'chemistry' | 'english' | 'safety' | 'programming' | 'history' | 'russian' | 'sports' | 'nanocad';
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
      case 'safety':
        return {
          bg: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
          icon: Shield,
        };
      case 'programming':
        return {
          bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
          icon: Code,
        };
      case 'history':
        return {
          bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
          icon: History,
        };
      case 'russian':
        return {
          bg: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
          icon: Languages,
        };
      case 'sports':
        return {
          bg: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',
          icon: Dumbbell,
        };
      case 'nanocad':
        return {
          bg: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
          icon: Compass,
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
