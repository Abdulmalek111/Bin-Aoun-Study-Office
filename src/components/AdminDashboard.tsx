import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Layers, 
  Trash2, 
  PlusCircle, 
  ShieldAlert, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  UserCheck, 
  Award,
  BookMarked,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';
import { User, Subject, Exam } from '../types';

interface AdminDashboardProps {
  user: User;
  subjects: Subject[];
  onUpdateSubjects: (updated: Subject[]) => void;
  onNavigateToTab: (tab: any) => void;
}

interface SimulatedStudent {
  username: string;
  email: string;
  telegram: string;
  scorePct?: number;
  completedCount?: number;
  signUpDate: string;
}

export default function AdminDashboard({ 
  user, 
  subjects, 
  onUpdateSubjects,
  onNavigateToTab 
}: AdminDashboardProps) {
  // Check permission
  if (user.email !== 'abdulmlikoog@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
        <ShieldAlert size={50} className="text-red-500 animate-pulse" />
        <h2 className="text-lg font-black text-brand-dark">غير مصرح بالدخول</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          هذه الصفحة مخصصة فقط لمشرف المنصة العام <strong>(abdulmlikoog@gmail.com)</strong>.
        </p>
        <button 
          onClick={() => onNavigateToTab('home')}
          className="px-6 py-2 bg-brand-dark text-white rounded-xl text-xs font-bold"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  // Load students from mock lists
  const [students, setStudents] = useState<SimulatedStudent[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentTelegram, setNewStudentTelegram] = useState('');
  
  // Custom subject controls
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editCompletedCount, setEditCompletedCount] = useState(0);

  // Stats
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  useEffect(() => {
    // Populate or load mock student base
    const savedStudents = localStorage.getItem('admin_simulated_students');
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    } else {
      const initialMockStudents: SimulatedStudent[] = [
        { username: 'عبدالملك بن عون', email: 'abdulmlikoog@gmail.com', telegram: '@abdulmlik_ou', scorePct: 95, completedCount: 18, signUpDate: '2026/05/29' },
        { username: 'أحمد الصالح', email: 'ahmed.salih@gmail.com', telegram: '@ahmed_salih99', scorePct: 82, completedCount: 12, signUpDate: '2026/05/30' },
        { username: 'سارة العتيبي', email: 'sara.otb@outlook.com', telegram: '@sara_otb', scorePct: 88, completedCount: 15, signUpDate: '2026/05/31' },
        { username: 'فاطمة الكواري', email: 'fatima_kw@gmail.com', telegram: '@fatima_kw', scorePct: 76, completedCount: 8, signUpDate: '2026/05/31' }
      ];
      setStudents(initialMockStudents);
      localStorage.setItem('admin_simulated_students', JSON.stringify(initialMockStudents));
    }
  }, []);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentTelegram.trim()) {
      alert('الرجاء كتابة جميع الحقول لإضافة الطالب بنجاح.');
      return;
    }

    if (!newStudentTelegram.startsWith('@')) {
      alert('يجب أن يبدأ معرف التليجرام بالرمز @');
      return;
    }

    const newStudent: SimulatedStudent = {
      username: newStudentName.trim(),
      email: newStudentEmail.trim(),
      telegram: newStudentTelegram.trim(),
      scorePct: Math.floor(Math.random() * 40) + 60, // 60 to 100
      completedCount: Math.floor(Math.random() * 10) + 1,
      signUpDate: new Date().toISOString().split('T')[0].replace(/-/g, '/')
    };

    const updated = [newStudent, ...students];
    setStudents(updated);
    localStorage.setItem('admin_simulated_students', JSON.stringify(updated));
    
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentTelegram('');
    alert('تمت إضافة الطالب الجديد بنجاح وإرسال دعوة له!');
  };

  const handleDeleteStudent = (email: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطالب من قاعدة بيانات مكتب بن عون المعتمدة الدراسي؟')) {
      const updated = students.filter(s => s.email !== email);
      setStudents(updated);
      localStorage.setItem('admin_simulated_students', JSON.stringify(updated));
    }
  };

  const handleUpdateLectures = (subjectId: string) => {
    const orig = subjects.find(s => s.id === subjectId);
    if (!orig) return;
    
    if (editCompletedCount < 0 || editCompletedCount > orig.lecturesCount) {
      alert(`عفواً! القيمة يجب أن تكون ما بين 0 و ${orig.lecturesCount}`);
      return;
    }

    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, completedLectures: editCompletedCount };
      }
      return s;
    });

    onUpdateSubjects(updated);
    setEditingSubjectId(null);
    alert('تم تعديل المحاضرات المنجزة بنجاح في سجلات النظام العلمي.');
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setBroadcastMessage('');
      alert('تم إرسال الإشعار والتنبيه العاجل لجميع قنوات ومعرفات تليجرام الطلاب المسجلين بنجاح 🚀');
    }, 1500);
  };

  // Safe calculators
  const overallAvgCompletion = Math.round(
    (subjects.reduce((acc, s) => acc + s.completedLectures, 0) / 
    subjects.reduce((acc, s) => acc + s.lecturesCount, 0)) * 100
  );

  return (
    <div className="space-y-5 text-right pb-10" style={{ direction: 'rtl' }}>
      
      {/* Header bar and branding */}
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          <span className="text-[10px] bg-brand-gold/15 text-brand-gold font-black px-2 py-0.5 rounded-full border border-brand-gold/20">
            لوحة الأدمن
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-brand-dark">لوحة تحكم المشرف العام</h1>
        <p className="text-xs text-gray-400 font-mono hidden md:block">abdulmlikoog</p>
      </div>

      {/* Overview Bento Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Stat card 1 */}
        <div className="bg-brand-dark p-3.5 rounded-2xl text-white space-y-1.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-brand-gold">
            <Users size={18} />
            <span className="text-[9px] font-bold opacity-85">مكتب بن عون</span>
          </div>
          <div>
            <h4 className="text-xl font-black text-white">{students.length} طلاب</h4>
            <p className="text-[10px] text-slate-300">مسجلين نشطين في النظام الراهن</p>
          </div>
          <div className="absolute -bottom-1 -left-2 w-16 h-16 bg-white/5 rounded-full blur-sm" />
        </div>

        {/* Stat card 2 */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 space-y-1.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-brand-blue">
            <Layers size={18} className="text-brand-gold" />
            <span className="text-[9px] text-gray-400 font-bold">نسبة التحصيل</span>
          </div>
          <div>
            <h4 className="text-xl font-black text-brand-dark">{overallAvgCompletion}%</h4>
            <p className="text-[10px] text-gray-400">معدل الإنجاز العام لمواد الفصل</p>
          </div>
        </div>

      </div>

      {/* Action panel 1: Sending instant push Telegram broadcasts */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-extrabold text-xs text-brand-dark flex items-center gap-1.5 border-b pb-2">
          <Send size={14} className="text-brand-gold" />
          <span>بث إشعارات جماعي لمعرفات التيليجرام</span>
        </h3>
        <form onSubmit={handleSendBroadcast} className="space-y-2">
          <p className="text-[10px] text-gray-450 leading-relaxed">
            سيتم إرسال الرسالة لجميع الطلاب إلزامياً عبر حساباتهم الشخصية وقنوات التواصل المباشرة فور تفعيلها.
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              required
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="مثال: تم إطلاق تجميعات ونماذج جديدة تفاعلية لسلامة الحياة والبرمجة!"
              className="flex-grow bg-gray-50 border border-gray-100 rounded-xl text-xs px-3 py-2 text-right focus:outline-none focus:border-brand-gold"
            />
            <button 
              type="submit"
              disabled={broadcastSent}
              className="px-4 py-2 bg-brand-gold hover:bg-yellow-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              🚀 {broadcastSent ? 'إرسال...' : 'بث عاجل'}
            </button>
          </div>
        </form>
      </div>

      {/* Action panel 2: Subject Progression Adjustment list */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-extrabold text-xs text-brand-dark flex items-center gap-1.5 border-b pb-2">
          <BookMarked size={14} className="text-brand-gold" />
          <span>تجاوز وتعديل نسبة محاضرات المواد الدراسية</span>
        </h3>
        
        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 no-scrollbar text-xs">
          {subjects.map((sub) => (
            <div key={sub.id} className="flex justify-between items-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100/50 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-brand-gold" />
                <span className="font-bold text-gray-700">{sub.nameAr}</span>
              </div>
              
              <div>
                {editingSubjectId === sub.id ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      value={editCompletedCount}
                      onChange={(e) => setEditCompletedCount(parseInt(e.target.value) || 0)}
                      className="w-12 bg-white border text-center font-bold px-1 py-0.5 rounded"
                      min={0}
                      max={sub.lecturesCount}
                    />
                    <span className="text-[10px] text-gray-405 font-mono"> / {sub.lecturesCount}</span>
                    <button 
                      onClick={() => handleUpdateLectures(sub.id)}
                      className="bg-emerald-650 text-white px-2 py-0.5 rounded font-black text-[10px] hover:bg-emerald-700 cursor-pointer"
                    >
                      حفظ
                    </button>
                    <button 
                      onClick={() => setEditingSubjectId(null)}
                      className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black text-[10px] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-550">{sub.completedLectures} من {sub.lecturesCount} منجز</span>
                    <button 
                      onClick={() => {
                        setEditingSubjectId(sub.id);
                        setEditCompletedCount(sub.completedLectures);
                      }}
                      className="text-[10px] font-bold text-brand-blue hover:text-brand-gold"
                    >
                      تعديل
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student List View / Table database manager */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-extrabold text-xs text-brand-dark flex items-center gap-1.5">
            <Users size={14} className="text-brand-gold" />
            <span>إدارة شؤون الطلاب المسجلين بالمنصة</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-400">قاعدة بيانات محلية</span>
        </div>

        {/* List mapping */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto text-xs pr-1 no-scrollbar">
          {students.map((student) => (
            <div 
              key={student.email} 
              className="p-3 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center justify-between transition-all hover:bg-gray-50 text-xs"
            >
              <div className="space-y-1 max-w-[70%]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-brand-dark text-sm">{student.username}</span>
                  {student.email === 'abdulmlikoog@gmail.com' && (
                    <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-1 rounded">مشرف</span>
                  )}
                </div>
                
                <div className="space-y-0.5 text-[10px] text-gray-550">
                  <p className="font-medium text-gray-400">البريد: <span className="font-mono text-gray-500">{student.email}</span></p>
                  <p className="font-bold text-slate-650">
                    تليجرام: <span className="text-brand-gold bg-amber-50 px-1 py-0.2 rounded font-semibold">{student.telegram}</span>
                  </p>
                  <p className="text-[9px] text-gray-400">درجة الاختبار: <span className="font-bold text-brand-dark font-sans">{student.scorePct}%</span> | تاريخ التسجيل: {student.signUpDate}</p>
                </div>
              </div>

              {student.email !== 'abdulmlikoog@gmail.com' && (
                <button 
                  onClick={() => handleDeleteStudent(student.email)}
                  className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                  title="حذف الطالب"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Quick Add Simulated student form */}
        <form onSubmit={handleAddStudent} className="p-3 bg-amber-50/40 border border-brand-gold/15 rounded-xl space-y-3">
          <p className="text-[11px] font-black text-brand-dark flex items-center gap-1">
            <PlusCircle size={13} className="text-brand-gold" />
            <span>إدخال طالب جديد يدوياً إلى النظام</span>
          </p>

          <div className="grid grid-cols-1 gap-2">
            <input 
              type="text" 
              required
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="اسم الطالب بالكامل"
              className="bg-white border rounded-lg text-xs px-2.5 py-1.5 text-right font-medium focus:outline-none"
            />
            <input 
              type="email" 
              required
              value={newStudentEmail}
              onChange={(e) => setNewStudentEmail(e.target.value)}
              placeholder="البريد الإلكتروني المعتمد"
              className="bg-white border rounded-lg text-xs px-2.5 py-1.5 text-left font-mono focus:outline-none"
            />
            <input 
              type="text" 
              required
              value={newStudentTelegram}
              onChange={(e) => setNewStudentTelegram(e.target.value)}
              placeholder="معرف تليجرام الإلزامي (مثل @abdulmlik)"
              className="bg-white border rounded-lg text-xs px-2.5 py-1.5 text-left font-sans focus:outline-none placeholder:text-right"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-1.5 bg-brand-dark text-white rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
          >
            تأكيد تسجيل وإضافة الطالب الجديد
          </button>
        </form>
      </div>

    </div>
  );
}
