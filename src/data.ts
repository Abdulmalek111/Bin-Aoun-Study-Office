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
    nameAr: 'البرمجة',
    nameEn: 'Programming',
    lecturesCount: 8,
    completedLectures: 4,
    iconType: 'programming'
  },
  {
    id: 'algorithms',
    nameAr: 'الخوارزميات',
    nameEn: 'Algorithms',
    lecturesCount: 8,
    completedLectures: 3,
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

export interface PaidWorkItem {
  id: string;
  name: string;
  type: 'single' | 'bundle' | 'seminar' | 'lab';
  price: number;
  originalPrice?: number;
  downloadUrl?: string;
}

export interface SubjectPaidConfig {
  subjectId: string;
  sectionNameAr: string;
  items: PaidWorkItem[];
  bundles?: {
    id: string;
    name: string;
    price: number;
    itemIds: string[];
    downloadUrl?: string;
  }[];
}

export const paidSubjectsConfig: Record<string, SubjectPaidConfig> = {
  physics: {
    subjectId: 'physics',
    sectionNameAr: 'شراء أعمال الرسوم البيانية РГР',
    items: [
      { id: 'physics_rgr1', name: 'РГР 1', type: 'single', price: 250, downloadUrl: 'https://yadi.sk/d/physics_rgr1_solution' },
      { id: 'physics_rgr2', name: 'РГР 2', type: 'single', price: 250, downloadUrl: 'https://yadi.sk/d/physics_rgr2_solution' },
      { id: 'physics_rgr3', name: 'РГР 3', type: 'single', price: 250, downloadUrl: 'https://yadi.sk/d/physics_rgr3_solution' },
      { id: 'physics_rgr4', name: 'РГР 4', type: 'single', price: 250, downloadUrl: 'https://yadi.sk/d/physics_rgr4_solution' },
      { id: 'physics_rgr5', name: 'РГР 5', type: 'single', price: 250, downloadUrl: 'https://yadi.sk/d/physics_rgr5_solution' }
    ],
    bundles: [
      {
        id: 'physics_rgr_bundle',
        name: 'باكيج РГР كامل (من 1 إلى 5)',
        price: 400,
        itemIds: ['physics_rgr1', 'physics_rgr2', 'physics_rgr3', 'physics_rgr4', 'physics_rgr5'],
        downloadUrl: 'https://yadi.sk/d/physics_rgr_bundle_solution'
      }
    ]
  },
  safety: {
    subjectId: 'safety',
    sectionNameAr: 'شراء التقارير والندوات الجاهزة (Семинары и Лабораторные)',
    items: [
      { id: 'safety_seminar1', name: 'Семинар 1', type: 'seminar', price: 100, downloadUrl: 'https://yadi.sk/d/safety_sem_1' },
      { id: 'safety_seminar2', name: 'Семинар 2', type: 'seminar', price: 100, downloadUrl: 'https://yadi.sk/d/safety_sem_2' },
      { id: 'safety_seminar3', name: 'Семинар 3', type: 'seminar', price: 100, downloadUrl: 'https://yadi.sk/d/safety_sem_3' },
      { id: 'safety_seminar4', name: 'Семинар 4', type: 'seminar', price: 100, downloadUrl: 'https://yadi.sk/d/safety_sem_4' },
      { id: 'safety_seminar5', name: 'Семинар 5', type: 'seminar', price: 100, downloadUrl: 'https://yadi.sk/d/safety_sem_5' },
      { id: 'safety_seminar6', name: 'Семинар 6', type: 'seminar', price: 100, downloadUrl: 'https://yadi.sk/d/safety_sem_6' },
      { id: 'safety_seminar7', name: 'Семинар 7', type: 'seminar', price: 100, downloadUrl: 'https://yadi.sk/d/safety_sem_7' },
      { id: 'safety_seminar8', name: 'Семинар 8', type: 'seminar', price: 100, downloadUrl: 'https://yadi.sk/d/safety_sem_8' },
      { id: 'safety_lab1', name: 'Лабораторная работа 1', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/safety_lab_1' },
      { id: 'safety_lab2', name: 'Лабораторная работа 2', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/safety_lab_2' },
      { id: 'safety_lab3', name: 'Лабораторная работа 3', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/safety_lab_3' },
      { id: 'safety_lab4', name: 'Лабораторная работа 4', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/safety_lab_4' }
    ]
  },
  programming: {
    subjectId: 'programming',
    sectionNameAr: 'شراء حلول واجبات مادة البرمجة',
    items: [
      { id: 'programming_seminar1', name: 'Семинар 1', type: 'seminar', price: 500, downloadUrl: 'https://yadi.sk/d/prog_sem_1' },
      { id: 'programming_seminar2', name: 'Семинар 2', type: 'seminar', price: 500, downloadUrl: 'https://yadi.sk/d/prog_sem_2' },
      { id: 'programming_seminar3', name: 'Семинар 3', type: 'seminar', price: 500, downloadUrl: 'https://yadi.sk/d/prog_sem_3' },
      { id: 'programming_seminar4', name: 'Семинар 4', type: 'seminar', price: 500, downloadUrl: 'https://yadi.sk/d/prog_sem_4' },
      { id: 'programming_lab1', name: 'Лабораторная работа 1', type: 'lab', price: 1000, downloadUrl: 'https://yadi.sk/d/prog_lab_1' },
      { id: 'programming_lab2', name: 'Лабораторная работа 2', type: 'lab', price: 1000, downloadUrl: 'https://yadi.sk/d/prog_lab_2' },
      { id: 'programming_lab3', name: 'Лабораторная работа 3', type: 'lab', price: 1000, downloadUrl: 'https://yadi.sk/d/prog_lab_3' },
      { id: 'programming_lab4', name: 'Лабораторная работа 4', type: 'lab', price: 1000, downloadUrl: 'https://yadi.sk/d/prog_lab_4' }
    ]
  },
  algorithms: {
    subjectId: 'algorithms',
    sectionNameAr: 'شراء حلول مختبرات الخوارزميات',
    items: [
      { id: 'algorithms_lab1', name: 'Лабораторная работа 1', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/algo_lab_1' },
      { id: 'algorithms_lab2', name: 'Лабораторная работа 2', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/algo_lab_2' },
      { id: 'algorithms_lab3', name: 'Лабораторная работа 3', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/algo_lab_3' },
      { id: 'algorithms_lab4', name: 'Лабораторная работа 4', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/algo_lab_4' },
      { id: 'algorithms_lab5', name: 'Лабораторная работа 5', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/algo_lab_5' },
      { id: 'algorithms_lab6', name: 'Лабораторная работа 6', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/algo_lab_6' },
      { id: 'algorithms_lab7', name: 'Лабораторная работа 7', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/algo_lab_7' },
      { id: 'algorithms_lab8', name: 'Лабораторная работа 8', type: 'lab', price: 500, downloadUrl: 'https://yadi.sk/d/algo_lab_8' }
    ]
  },
  nanocad: {
    subjectId: 'nanocad',
    sectionNameAr: 'شراء مجلدات تطبيق نانو كاد',
    items: [
      { id: 'nanocad_lab1', name: 'Лабораторная работа 1', type: 'lab', price: 500, originalPrice: 800, downloadUrl: 'https://yadi.sk/d/nanocad_lab_1' },
      { id: 'nanocad_lab2', name: 'Лабораторная работа 2', type: 'lab', price: 500, originalPrice: 800, downloadUrl: 'https://yadi.sk/d/nanocad_lab_2' },
      { id: 'nanocad_lab3', name: 'Лабораторная работа 3', type: 'lab', price: 500, originalPrice: 800, downloadUrl: 'https://yadi.sk/d/nanocad_lab_3' },
      { id: 'nanocad_lab4', name: 'Лабораторная работа 4', type: 'lab', price: 600, downloadUrl: 'https://yadi.sk/d/nanocad_lab_4' },
      { id: 'nanocad_lab5', name: 'Лабораторная работа 5', type: 'lab', price: 600, downloadUrl: 'https://yadi.sk/d/nanocad_lab_5' },
      { id: 'nanocad_lab6', name: 'Лабораторная работа 6', type: 'lab', price: 600, downloadUrl: 'https://yadi.sk/d/nanocad_lab_6' },
      { id: 'nanocad_lab7', name: 'Лабораторная работа 7', type: 'lab', price: 600, downloadUrl: 'https://yadi.sk/d/nanocad_lab_7' }
    ]
  }
};
