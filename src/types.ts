/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  username: string;
  email: string;
  avatarUrl?: string;
  isLoggedIn: boolean;
}

export interface Subject {
  id: string;
  nameAr: string;
  nameEn: string;
  lecturesCount: number;
  completedLectures: number;
  iconType: 'math' | 'physics' | 'chemistry' | 'english';
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

export type TabType = 'home' | 'exams' | 'subjects' | 'profile';
