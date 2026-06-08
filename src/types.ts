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
  // New profile fields for students and admin dashboard integration
  uid?: string;
  fullName?: string;
  phone?: string;
  university?: string;
  college?: string;
  department?: string;
  level?: string;
  photoURL?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
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
  type?: 'broadcast' | 'private' | string;
  targetRole?: 'students' | string | null;
  targetUserId?: string | null;
  createdBy?: string;
  readBy?: string[];
  status?: string;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subjectId: string;
  subjectName: string;
  itemId: string;
  itemName: string;
  itemType: 'single' | 'bundle' | 'seminar' | 'lab';
  price: number;
  currency: 'RUB';
  cardNumber: string; // The constant paid card number (e.g. 220010500228419)
  status: 'pending_review' | 'paid' | 'rejected';
  proofImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface UserPurchase {
  userId: string;
  subjectId: string;
  itemId: string;
  paymentId: string;
  accessGranted: boolean;
  createdAt: string;
}

