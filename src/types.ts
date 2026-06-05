/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  username: string;
  email: string;
  avatarUrl?: string;
  isLoggedIn: boolean;
  telegram?: string;
  academicStage?: string; // بكالوريوس, ماستر, دكتوراة
  academicYear?: string;  // سنة أولى, سنة ثانية, سنة ثالثة, سنة رابعة, طالب مستجد
  academicSemester?: string; // فصل أول, فصل ثاني
  academicTrack?: string; // علمي, أدبي
  balance?: number; // رصيد المحفظة المالي للطالب
  studentId?: string; // المعرف الفريد للطالب المبتدئ بـ bin_
  isOnline?: boolean;
  lastActive?: number;
}

export interface Subject {
  id: string;
  nameAr: string;
  nameEn: string;
  lecturesCount: number;
  completedLectures: number;
  iconType: 'math' | 'physics' | 'chemistry' | 'english' | 'safety' | 'programming' | 'history' | 'russian' | 'sports' | 'nanocad';
}

export interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  userAnswerIndex?: number;
}

export interface Exam {
  id: string;
  title: string;
  subjectId: string;
  questions: Question[];
  durationMinutes: number;
  date: string;
  timeSlot: string;
}

export type TabType = 'home' | 'exams' | 'subjects' | 'profile' | 'discussions' | 'students' | 'admin';

export interface ChatMessage {
  id: string;
  senderRole: 'student' | 'admin';
  senderName: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  senderEmail: string;
  senderName: string;
  message: string;
  createdAt: string;
  reply?: string;
  repliedAt?: string;
  messages?: ChatMessage[];
  status?: 'open' | 'closed';
}

export interface Notification {
  id: string;
  senderName: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetEmail: string;
}

