import React, { useState } from 'react';
import { Settings, User, CreditCard, ClipboardList, Bell, HelpCircle, LogOut, ChevronLeft, ShieldCheck, Mail, Save, Check, Sun, Moon, Download } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileViewProps {
  user: UserType;
  examHistoryCount: number;
  onLogout: () => void;
  onUpdateEmail: (newEmail: string) => void;
  onNavigateToTab: (tab: 'home' | 'exams' | 'subjects' | 'profile') => void;
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  deferredPrompt: any;
  onInstallApp: () => void;
}

type ActiveSection = 'none' | 'account' | 'subscription' | 'notifications' | 'support' | 'install';

export default function ProfileView({
  user,
  examHistoryCount,
  onLogout,
  onUpdateEmail,
  onNavigateToTab,
  darkMode,
  onToggleDarkMode,
  deferredPrompt,
  onInstallApp,
}: ProfileViewProps) {
  const [activeSubSection, setActiveSubSection] = useState<ActiveSection>('none');
  const [emailInput, setEmailInput] = useState(user.email);
  const [emailUpdated, setEmailUpdated] = useState(false);
  
  // Support state
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Notification settings
  const [notifExam, setNotifExam] = useState(true);
  const [notifLectures, setNotifLectures] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEmail(emailInput);
    setEmailUpdated(true);
    setTimeout(() => setEmailUpdated(false), 2000);
  };

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (supportMsg.trim() === '') return;
    setSupportSuccess(true);
    setSupportMsg('');
    setTimeout(() => {
      setSupportSuccess(false);
      setActiveSubSection('none');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <button 
          onClick={() => alert('إعدادات عامة: تم تهيئة النظام ليعمل بالترميز العربي')}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Settings size={20} className="stroke-[2.2]" />
        </button>
        <h1 className="text-xl font-extrabold text-brand-dark">الملف الشخصي</h1>
        <div className="w-9 h-9"></div> {/* Balancer spacer */}
      </div>

      {/* Main Student Avatar Box */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center space-y-3 shadow-sm">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-tr from-brand-gold to-brand-blue rounded-full blur opacity-30"></div>
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.username} 
              className="relative w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="relative w-20 h-20 rounded-full bg-brand-dark text-white flex items-center justify-center font-black text-2xl border-4 border-white shadow-md">
              {user.username.charAt(0)}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-extrabold text-base text-brand-dark flex items-center justify-center gap-1.5">
            <span>{user.username}</span>
            <ShieldCheck size={16} className="text-brand-gold" />
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Dynamic Popover sub-section reader */}
      {activeSubSection !== 'none' && (
        <div className="bg-amber-500/5 rounded-2xl p-4 border border-brand-gold/30 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-brand-gold/10">
            <h4 className="text-xs font-black text-brand-blue">
              {activeSubSection === 'account' && 'تعديل معلومات الحساب'}
              {activeSubSection === 'subscription' && 'تفاصيل الاشتراك والمسار التعليمي'}
              {activeSubSection === 'notifications' && 'تفضيلات الإشعارات والتنبيهات'}
              {activeSubSection === 'support' && 'مركز الدعم الفني والمساعدة والاستفسارات'}
            </h4>
            <button 
              onClick={() => setActiveSubSection('none')}
              className="text-xs font-bold text-gray-400 hover:text-brand-dark px-2 py-0.5 rounded-lg hover:bg-gray-150"
            >
              إلغاء
            </button>
          </div>

          {/* Account Subview */}
          {activeSubSection === 'account' && (
            <form onSubmit={handleSaveEmail} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">اسم المستخدم الحالي (غير قابل للتعديل)</label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">
                  {user.username}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">البريد الإلكتروني المعتمد</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={emailInput} 
                    onChange={(e) => setEmailInput(e.target.value)} 
                    className="w-full bg-white border border-gray-200 rounded-lg text-xs px-3 py-2 text-right focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-2 bg-brand-dark text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {emailUpdated ? <Check size={13} className="text-emerald-400" /> : <Save size={13} />}
                <span>{emailUpdated ? 'تم التعديل وحفظ البيانات' : 'حفظ التغييرات'}</span>
              </button>
            </form>
          )}

          {/* Subscription Subview */}
          {activeSubSection === 'subscription' && (
            <div className="space-y-2.5 text-xs text-brand-dark">
              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-150">
                <span className="font-semibold text-gray-500">حالة العضوية</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">نشطة ✓</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-150">
                <span className="font-semibold text-gray-500">الباقة التعليمية</span>
                <span className="font-bold text-brand-blue">باقة المسار العلمي المطلق</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-150">
                <span className="font-semibold text-gray-500">تاريخ انتهاء الصلاحية</span>
                <span className="font-bold text-gray-700 font-mono">2027/05/30</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-normal text-center pt-1">
                جميع الميزات والمحاضرات والاختبارات التجريبية مفعلة بالكامل لحسابك الجاري بالمنصة لضمان تحصيل دراسي رائد.
              </p>
            </div>
          )}

          {/* Notifications Subview */}
          {activeSubSection === 'notifications' && (
            <div className="space-y-3.5 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-gray-600">تنبيهات اقتراب موعد الاختبارات</span>
                <input 
                  type="checkbox" 
                  checked={notifExam} 
                  onChange={(e) => setNotifExam(e.target.checked)} 
                  className="rounded text-brand-gold focus:ring-brand-gold h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-gray-600">إشعارات رفع مذكرات أو غرف نقاش جديدة</span>
                <input 
                  type="checkbox" 
                  checked={notifLectures} 
                  onChange={(e) => setNotifLectures(e.target.checked)} 
                  className="rounded text-brand-gold focus:ring-brand-gold h-4 w-4"
                />
              </label>
            </div>
          )}

          {/* Help & Support Subview */}
          {activeSubSection === 'support' && (
            <form onSubmit={handleSendSupport} className="space-y-2.5">
              {supportSuccess ? (
                <div className="text-center py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
                  تم إرسال بطاقة الدعم في الملف الدراسي برقم #8542. سنقوم بالرد عليك قريباً!
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    اكتب سؤالك أو الشكوى الخاصة بك بخصوص المواد أو الاختبارات التجريبية، وسيقوم المشرف بالتواصل معك فوراً في البريد الإلكتروني.
                  </p>
                  <textarea 
                    required 
                    value={supportMsg} 
                    onChange={(e) => setSupportMsg(e.target.value)} 
                    rows={3} 
                    placeholder="اكتب رسالتك أو استفسارك هنا تفصيلاً..."
                    className="w-full bg-white border border-gray-200 rounded-lg text-xs p-2.5 text-right font-medium focus:outline-none focus:border-brand-gold"
                  ></textarea>
                  <button 
                    type="submit" 
                    className="w-full py-2 bg-brand-gold text-white rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    إرسال بطاقة الدعم الفني
                  </button>
                </>
              )}
            </form>
          )}

          {/* PWA App Installation Subview */}
          {activeSubSection === 'install' && (
            <div className="space-y-3.5 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-gray-150 space-y-3 text-right">
                <p className="font-bold text-gray-750 leading-normal">
                  يمكنك تحميل منصة بن عون التعليمية كتطبيق رسمي على شاشة جهازك (سواء كمبيوتر، أندرويد، أو آيفون/آيباد) بكل سهولة والوصول إليها بضغطة زر واحدة!
                </p>

                {deferredPrompt ? (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onInstallApp();
                      }}
                      className="w-full py-2.5 bg-brand-gold hover:bg-yellow-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download size={15} />
                      <span>اضغط هنا لتثبيت وتحميل التطبيق الآن</span>
                    </button>
                    <p className="text-[10px] text-emerald-600 mt-2 font-semibold text-center">
                      ✓ متصفحك الحالي يدعم التثبيت المباشر بنجاح!
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-150 space-y-2">
                    <div className="font-bold text-brand-blue flex items-center gap-1">
                      <span>طريقة التثبيت والتحميل لمتصفحك:</span>
                    </div>
                    
                    <div className="space-y-1.5 pt-1">
                      <p className="font-semibold text-gray-650">
                        1. <span className="text-brand-gold">لمستخدمي جوجل كروم (أندرويد / كمبيوتر):</span> اضغط على زر القائمة (ثلاث نقاط <span className="font-sans">⋮</span> في أعلى أو أسفل المتصفح) ثم اختر <span className="font-bold">تثبيت التطبيق (Install App)</span> أو <span className="font-bold">إضافة إلى الشاشة الرئيسية</span>.
                      </p>
                      <p className="font-semibold text-gray-650">
                        2. <span className="text-brand-gold">لمستخدمي سفاري (آيفون / آيباد):</span> اضغط على زر المشاركة (Share 📤) في أسفل الشاشة، ثم اختر <span className="font-bold">إضافة إلى الشاشة الرئيسية (Add to Home Screen ➕)</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Navigation Links */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-sm">
        
        {/* Account Info button */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'account' ? 'none' : 'account')}
          className="p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-800 rounded-xl">
              <User size={18} className="stroke-[2.2] text-brand-blue" />
            </div>
            <span className="text-sm font-bold text-gray-700">معلومات الحساب الدراسي</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs font-medium text-gray-400">عبدالملك</span>
            <ChevronLeft size={16} />
          </div>
        </div>

        {/* Subscriptions */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'subscription' ? 'none' : 'subscription')}
          className="p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-800 rounded-xl">
              <CreditCard size={18} className="stroke-[2.2] text-brand-gold" />
            </div>
            <span className="text-sm font-bold text-gray-700">الاشتراكات والمساقات</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">باقة نشطة</span>
            <ChevronLeft size={16} />
          </div>
        </div>

        {/* Exam history list shortcut */}
        <div 
          onClick={() => onNavigateToTab('exams')}
          className="p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
              <ClipboardList size={18} className="stroke-[2.2] text-emerald-700" />
            </div>
            <span className="text-sm font-bold text-gray-700">سجل درجات الاختبارات</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs font-medium text-gray-400">{examHistoryCount} محاولة تم تقديمها</span>
            <ChevronLeft size={16} />
          </div>
        </div>

        {/* Notifications and Alerts */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'notifications' ? 'none' : 'notifications')}
          className="p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-800 rounded-xl">
              <Bell size={18} className="stroke-[2.2] text-purple-700" />
            </div>
            <span className="text-sm font-bold text-gray-700">تفضيلات الإشعارات</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs font-medium text-gray-400">مفعلة</span>
            <ChevronLeft size={16} />
          </div>
        </div>

        {/* Install / Download App button */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'install' ? 'none' : 'install')}
          className="p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
              <Download size={18} className="stroke-[2.2] text-brand-gold animate-bounce" />
            </div>
            <span className="text-sm font-bold text-gray-700 font-bold">تحميل تطبيق "بن عون" على جهازك</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            {deferredPrompt ? (
              <span className="text-[10px] font-bold text-brand-gold bg-amber-50 px-1.5 py-0.5 rounded animate-pulse">تثبيت مباشر</span>
            ) : (
              <span className="text-xs font-medium text-gray-400">طريقة التثبيت</span>
            )}
            <ChevronLeft size={16} />
          </div>
        </div>

        {/* Dark Mode Toggle Switch */}
        <div 
          className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-800 rounded-xl">
              {darkMode ? (
                <Sun size={18} className="stroke-[2.2] text-brand-gold" />
              ) : (
                <Moon size={18} className="stroke-[2.2] text-indigo-700" />
              )}
            </div>
            <span className="text-sm font-bold text-gray-700">الوضع المظلم (Dark Mode)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-gray-200 transition-colors duration-200 ease-in-out focus:outline-none p-0.5 items-center ${
                darkMode ? 'bg-brand-gold justify-end' : 'bg-gray-200 justify-start'
              }`}
              type="button"
              role="switch"
              aria-checked={darkMode}
            >
              <span
                className="pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow-md transition duration-200"
              />
            </button>
          </div>
        </div>

        {/* Support & Tech queries */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'support' ? 'none' : 'support')}
          className="p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-800 rounded-xl">
              <HelpCircle size={18} className="stroke-[2.2] text-teal-700" />
            </div>
            <span className="text-sm font-bold text-gray-700">الدعم الفني والمساعدة والمقترحات</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <ChevronLeft size={16} />
          </div>
        </div>

        {/* Log out of the current system session */}
        {showLogoutConfirm ? (
          <div className="p-4 bg-red-50/70 border-t border-red-100 flex flex-col gap-3 animate-fade-in">
            <p className="text-xs font-bold text-red-800 text-center">
              هل أنت متأكد من تسجيل الخروج من مكتب بن عون الدراسي؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onLogout()}
                className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                نعم، سجل الخروج
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-1.5 px-3 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setShowLogoutConfirm(true)}
            className="p-4 flex items-center justify-between hover:bg-red-50/40 cursor-pointer transition-colors text-red-600"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-700 rounded-xl">
                <LogOut size={18} className="stroke-[2.2]" />
              </div>
              <span className="text-sm font-extrabold">تسجيل الخروج</span>
            </div>
            <ChevronLeft size={16} className="text-red-300" />
          </div>
        )}

      </div>

    </div>
  );
}
