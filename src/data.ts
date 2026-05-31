import { Subject, Exam, Question } from './types';

export const initialSubjects: Subject[] = [
  {
    id: 'math',
    nameAr: 'الرياضيات',
    nameEn: 'Mathematics',
    lecturesCount: 12,
    completedLectures: 9,
    iconType: 'math'
  },
  {
    id: 'physics',
    nameAr: 'الفيزياء',
    nameEn: 'Physics',
    lecturesCount: 8,
    completedLectures: 5,
    iconType: 'physics'
  },
  {
    id: 'chemistry',
    nameAr: 'الكيمياء',
    nameEn: 'Chemistry',
    lecturesCount: 10,
    completedLectures: 6,
    iconType: 'chemistry'
  },
  {
    id: 'english',
    nameAr: 'اللغة الإنجليزية',
    nameEn: 'English Language',
    lecturesCount: 15,
    completedLectures: 12,
    iconType: 'english'
  },
  {
    id: 'safety',
    nameAr: 'سلامة الحياة',
    nameEn: 'Life Safety',
    lecturesCount: 10,
    completedLectures: 4,
    iconType: 'safety'
  },
  {
    id: 'programming',
    nameAr: 'البرمجة والخوارزميات',
    nameEn: 'Programming and Algorithms',
    lecturesCount: 16,
    completedLectures: 8,
    iconType: 'programming'
  },
  {
    id: 'history',
    nameAr: 'التاريخ الروسي',
    nameEn: 'Russian History',
    lecturesCount: 8,
    completedLectures: 3,
    iconType: 'history'
  },
  {
    id: 'russian',
    nameAr: 'اللغة الروسية',
    nameEn: 'Russian Language',
    lecturesCount: 14,
    completedLectures: 7,
    iconType: 'russian'
  },
  {
    id: 'sports',
    nameAr: 'الرياضة',
    nameEn: 'Sports',
    lecturesCount: 6,
    completedLectures: 2,
    iconType: 'sports'
  },
  {
    id: 'nanocad',
    nameAr: 'نانو كاد',
    nameEn: 'nanoCAD',
    lecturesCount: 11,
    completedLectures: 5,
    iconType: 'nanocad'
  }
];

export const mathExamQuestions: Question[] = [
  {
    id: 1,
    questionText: 'ما ناتج عملية الجمع التالية: 25 + 37؟',
    options: ['52', '62', '72', '68'],
    correctAnswerIndex: 1 // 62
  },
  {
    id: 2,
    questionText: 'ما حل المعادلة التالية؟ 2س + 5 = 11',
    options: ['1', '3', '6', '8'],
    correctAnswerIndex: 1 // 3 (2*3 + 5 = 11)
  },
  {
    id: 3,
    questionText: 'ما قيمة الزاوية القائمة بالدرجات؟',
    options: ['45 درجة', '90 درجة', '180 درجة', '360 درجة'],
    correctAnswerIndex: 1 // 90
  },
  {
    id: 4,
    questionText: 'ما هو القاسم المشترك الأكبر للعددين 12 و 18؟',
    options: ['2', '3', '6', '9'],
    correctAnswerIndex: 2 // 6
  },
  {
    id: 5,
    questionText: 'أي من الأعداد التالية هو عدد أولي؟',
    options: ['9', '15', '17', '21'],
    correctAnswerIndex: 2 // 17
  },
  {
    id: 6,
    questionText: 'إذا كان محيط مربع يساوي 20 سم، فما هي مساحته؟',
    options: ['16 سم²', '20 سم²', '25 سم²', '30 سم²'],
    correctAnswerIndex: 2 // 25
  },
  {
    id: 7,
    questionText: 'ما قيمة الجذر التربيعي للعدد 64؟',
    options: ['6', '7', '8', '9'],
    correctAnswerIndex: 2 // 8
  },
  {
    id: 8,
    questionText: 'حل المتباينة التالية: س - 3 > 5',
    options: ['س > 2', 'س > 8', 'س < 8', 'س = 8'],
    correctAnswerIndex: 1 // s > 8
  }
];

export const physicsExamQuestions: Question[] = [
  {
    id: 1,
    questionText: 'ما هي وحدة قياس القوة في النظام الدولي للوحدات (SI)؟',
    options: ['الجول', 'الواط', 'النيوتن', 'الباسكال'],
    correctAnswerIndex: 2 // Newton
  },
  {
    id: 2,
    questionText: 'وفقاً لقانون نيوتن الثاني، القوة تساوي الكتلة مضروبة في:',
    options: ['السرعة', 'التسارع (العجلة)', 'المسافة', 'الزمن'],
    correctAnswerIndex: 1 // Acceleration
  },
  {
    id: 3,
    questionText: 'تنتقل الحرارة في الفراغ عن طريق:',
    options: ['التوصيل', 'الحمل', 'الإشعاع', 'الاحتكاك'],
    correctAnswerIndex: 2 // Radiation
  }
];

export const chemistryExamQuestions: Question[] = [
  {
    id: 1,
    questionText: 'ما هو الرمز الكيميائي للماء؟',
    options: ['CO2', 'NaCl', 'H2O', 'O2'],
    correctAnswerIndex: 2
  },
  {
    id: 2,
    questionText: 'ما هو العنصر الأكثر وفرة في الغلاف الجوي للأرض؟',
    options: ['الأكسجين', 'النيتروجين', 'الهيدروجين', 'الأرجون'],
    correctAnswerIndex: 1
  }
];

export const initialExams: Exam[] = [
  {
    id: 'math_exam',
    title: 'اختبار الرياضيات',
    subjectId: 'math',
    questions: mathExamQuestions,
    durationMinutes: 90,
    date: '2026/06/05',
    timeSlot: '10:00 ص'
  },
  {
    id: 'physics_exam',
    title: 'اختبار الفيزياء',
    subjectId: 'physics',
    questions: physicsExamQuestions,
    durationMinutes: 60,
    date: '2026/06/12',
    timeSlot: '11:30 ص'
  },
  {
    id: 'chemistry_exam',
    title: 'اختبار الكيمياء',
    subjectId: 'chemistry',
    questions: chemistryExamQuestions,
    durationMinutes: 45,
    date: '2026/06/20',
    timeSlot: '09:00 ص'
  }
];
