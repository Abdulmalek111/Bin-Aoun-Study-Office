import React, { useState, useEffect, useRef } from 'react';
import { Settings, User, CreditCard, ClipboardList, Bell, HelpCircle, LogOut, ChevronLeft, ShieldCheck, Mail, Save, Check, Sun, Moon, Download, Shield, Send, ArrowRight, MessageSquare, Lock } from 'lucide-react';
import { User as UserType, SupportTicket, ChatMessage } from '../types';
import AdminDashboard from './AdminDashboard';

interface ProfileViewProps {
  user: UserType;
  examHistoryCount: number;
  onLogout: () => void;
  onUpdateProfile: (updatedUser: UserType) => void;
  onNavigateToTab: (tab: any) => void;
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  deferredPrompt: any;
  onInstallApp: () => void;
  subjects: any[];
  onUpdateSubjects: (updated: any[]) => void;
  subjectLecturesMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf' }[]>;
  onUpdateSubjectLectures: (updatedMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf' }[]>) => void;
  supportTickets: SupportTicket[];
  onUpdateSupportTickets: (updated: SupportTicket[]) => void;
  notifications?: any[];
  onUpdateNotifications?: (updated: any[]) => void;
  onAddNotification?: (targetEmail: string, senderName: string, message: string) => void;
}

type ActiveSection = 'none' | 'account' | 'subscription' | 'notifications' | 'support' | 'install';

export default function ProfileView({
  user,
  examHistoryCount,
  onLogout,
  onUpdateProfile,
  onNavigateToTab,
  darkMode,
  onToggleDarkMode,
  deferredPrompt,
  onInstallApp,
  subjects,
  onUpdateSubjects,
  subjectLecturesMap,
  onUpdateSubjectLectures,
  supportTickets = [],
  onUpdateSupportTickets,
  notifications = [],
  onUpdateNotifications,
  onAddNotification,
}: ProfileViewProps) {
  const [activeSubSection, setActiveSubSection] = useState<ActiveSection>('none');
  const [emailInput, setEmailInput] = useState(user.email);
  const [usernameInput, setUsernameInput] = useState(user.username);
  const [telegramInput, setTelegramInput] = useState(user.telegram || '');
  const [emailUpdated, setEmailUpdated] = useState(false);
  const [profileViewTab, setProfileViewTab] = useState<'profile' | 'admin'>('profile');
  
  // Support & Interactive Chat states
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState('');
  const [supportSenderRole, setSupportSenderRole] = useState<'self' | 'simulated_ahmed' | 'simulated_sara' | 'simulated_m_harbi'>('self');
  const [activeChatTicketId, setActiveChatTicketId] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto Scroll Chat to Bottom
  useEffect(() => {
    if (activeChatTicketId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatTicketId, supportTickets]);

  // URL Deep Link Listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('ticketId');
    if (tId) {
      // Ensure ticket is present in client list
      const hasTicket = supportTickets.some(t => t.id === tId);
      if (hasTicket) {
        setActiveSubSection('support');
        setActiveChatTicketId(tId);
      }
    }
  }, [supportTickets]);

  // Notification settings
  const [notifExam, setNotifExam] = useState(true);
  const [notifLectures, setNotifLectures] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      alert('الرجاء كتابة اسم المستخدم (حقل إلزامي)');
      return;
    }
    if (!emailInput.trim()) {
      alert('الرجاء كتابة البريد الإلكتروني (حقل إلزامي)');
      return;
    }
    if (!telegramInput.trim()) {
      alert('الرجاء كتابة اسم مستخدم تليجرام (حقل إلزامي)');
      return;
    }

    let formattedTelegram = telegramInput.trim();
    if (!formattedTelegram.startsWith('@')) {
      formattedTelegram = '@' + formattedTelegram;
    }

    onUpdateProfile({
      ...user,
      username: usernameInput.trim(),
      email: emailInput.trim(),
      telegram: formattedTelegram
    });
    
    setEmailUpdated(true);
    setTimeout(() => setEmailUpdated(false), 2000);
  };



  const handleSendChatMessage = async (ticketId: string, text: string) => {
    if (!text.trim()) return;
    
    const ticket = supportTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    if (ticket.status === 'closed') {
      alert('⚠️ هذه التذكرة مغلقة ومؤرشفة حالياً من قبل المشرف الفني، ولا يمكن إرسال المزيد من الرسائل.');
      return;
    }

    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')} ${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;

    const legacyMsgs: ChatMessage[] = [
      {
        id: ticket.id + '-initial',
        senderRole: 'student',
        senderName: ticket.senderName,
        message: ticket.message,
        createdAt: ticket.createdAt
      }
    ];
    if (ticket.reply) {
      legacyMsgs.push({
        id: ticket.id + '-reply',
        senderRole: 'admin',
        senderName: 'المشرف العام',
        message: ticket.reply,
        createdAt: ticket.repliedAt || ticket.createdAt
      });
    }

    const currentMessages = ticket.messages && ticket.messages.length > 0 ? ticket.messages : legacyMsgs;

    const newMessage: ChatMessage = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      senderRole: 'student',
      senderName: ticket.senderName,
      message: text.trim(),
      createdAt: formattedDate
    };

    const updatedMessages = [...currentMessages, newMessage];

    const updatedTickets = supportTickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          messages: updatedMessages
        };
      }
      return t;
    });

    onUpdateSupportTickets(updatedTickets);
    setChatInputText('');

    // Notify Telegram of follow-up chat message
    const storedToken = localStorage.getItem('school_telegram_bot_token') || '8376812737:AAEADU_8bJzZSJHq_BHCrcyCH2PvkHCrBrk';
    const storedChatId = localStorage.getItem('school_telegram_chat_id');
    if (storedToken && storedChatId) {
      const appUrl = `${window.location.origin}${window.location.pathname}?ticketId=${ticket.id}`;
      const telegramText = `💬 *رسالة جديدة من الطالب في محادثة الدعم!* (${ticket.senderName})\n\n` +
                           `📝 *الرسالة:* ${text.trim()}\n\n` +
                           `🔗 *رابط المتابعة والرد الفوري:*\n${appUrl}`;
      try {
        await fetch(`https://api.telegram.org/bot${storedToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: storedChatId,
            text: telegramText,
            parse_mode: 'Markdown'
          })
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supportMsg.trim() === '') return;
    
    const newId = Math.floor(1000 + Math.random() * 9000).toString();
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')} ${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;
    
    let senderEmail = user.email;
    let senderName = user.username;

    if (user.email === 'abdulmlikoog@gmail.com') {
      if (supportSenderRole === 'simulated_ahmed') {
        senderEmail = 'ahmed.salih@gmail.com';
        senderName = 'أحمد الصالح';
      } else if (supportSenderRole === 'simulated_sara') {
        senderEmail = 'sara.otb@outlook.com';
        senderName = 'سارة العتيبي';
      } else if (supportSenderRole === 'simulated_m_harbi') {
        senderEmail = 'm.harbi@gmail.com';
        senderName = 'محمد الحربي';
      }
    }

    const newTicket: SupportTicket = {
      id: newId,
      senderEmail,
      senderName,
      message: supportMsg.trim(),
      createdAt: formattedDate,
      messages: [
        {
          id: newId + '-initial',
          senderRole: 'student',
          senderName: senderName,
          message: supportMsg.trim(),
          createdAt: formattedDate
        }
      ]
    };

    onUpdateSupportTickets([newTicket, ...supportTickets]);
    setCreatedTicketId(newId);
    setSupportSuccess(true);
    setSupportMsg('');

    // Trigger instant Telegram Notification!
    const storedToken = localStorage.getItem('school_telegram_bot_token') || '8376812737:AAEADU_8bJzZSJHq_BHCrcyCH2PvkHCrBrk';
    const storedChatId = localStorage.getItem('school_telegram_chat_id');
    if (storedToken && storedChatId) {
      const appUrl = `${window.location.origin}${window.location.pathname}?ticketId=${newId}`;
      const telegramText = `📬 *استفسار فني جديد من الطالب:* ${senderName}\n` +
                           `📧 *البريد:* ${senderEmail}\n` +
                           `💬 *الرسالة:* ${newTicket.message}\n\n` +
                           `🔗 *رابط فتح المحادثة والرد الفوري والآمن:*\n${appUrl}`;
      try {
        await fetch(`https://api.telegram.org/bot${storedToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: storedChatId,
            text: telegramText,
            parse_mode: 'Markdown'
          })
        });
      } catch (err) {
        console.error('Telegram API error:', err);
      }
    }

    setTimeout(() => {
      setSupportSuccess(false);
      setActiveChatTicketId(newId);
    }, 1500);
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



      {user.email === 'abdulmlikoog@gmail.com' && profileViewTab === 'admin' ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-805/40 p-2.5 rounded-xl border border-gray-150/30">
            <span className="text-xs font-extrabold text-brand-dark dark:text-brand-gold flex items-center gap-1.5">
              <Shield size={14} className="text-brand-gold" />
              <span>لوحة التحكم والإرشاد العامة كمسؤول</span>
            </span>
            <button 
              type="button"
              onClick={() => setProfileViewTab('profile')}
              className="px-3 py-1.5 bg-brand-dark hover:bg-brand-blue text-white rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <ChevronLeft size={12} />
              <span>العودة للملف الشخصي</span>
            </button>
          </div>
          <AdminDashboard 
            user={user}
            subjects={subjects}
            onUpdateSubjects={onUpdateSubjects}
            onNavigateToTab={onNavigateToTab}
            subjectLecturesMap={subjectLecturesMap}
            onUpdateSubjectLectures={onUpdateSubjectLectures}
            isEmbedded={true}
            supportTickets={supportTickets}
            onUpdateSupportTickets={onUpdateSupportTickets}
            notifications={notifications}
            onUpdateNotifications={onUpdateNotifications}
            onAddNotification={onAddNotification}
          />
        </div>
      ) : (
        <>

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
            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">اسم المستخدم أو اللقب الدراسي</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={usernameInput} 
                    onChange={(e) => setUsernameInput(e.target.value)} 
                    className="w-full bg-white border border-gray-200 rounded-lg text-xs px-3 py-2 text-right focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">البريد الإلكتروني المعتمد</label>
                <div className="relative">
                  <input 
                    type="email" 
                    required
                    value={emailInput} 
                    onChange={(e) => setEmailInput(e.target.value)} 
                    className="w-full bg-white border border-gray-200 rounded-lg text-xs px-3 py-2 text-right focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">اسم حساب التيليجرام (إلزامي ومطلوب بالرمز @)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={telegramInput} 
                    onChange={(e) => setTelegramInput(e.target.value)} 
                    placeholder="مثال: @abdulmlik"
                    className="w-full bg-white border border-gray-200 rounded-lg text-xs px-3 py-2 text-left focus:outline-none focus:border-brand-gold"
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
            <div className="space-y-3">
              {activeChatTicketId && supportTickets.find(t => t.id === activeChatTicketId) ? (
                (() => {
                  const chatTicket = supportTickets.find(t => t.id === activeChatTicketId)!;
                  const legacyMsgs: ChatMessage[] = [
                    {
                      id: chatTicket.id + '-initial',
                      senderRole: 'student',
                      senderName: chatTicket.senderName,
                      message: chatTicket.message,
                      createdAt: chatTicket.createdAt
                    }
                  ];
                  if (chatTicket.reply) {
                    legacyMsgs.push({
                      id: chatTicket.id + '-reply',
                      senderRole: 'admin',
                      senderName: 'المشرف العام',
                      message: chatTicket.reply,
                      createdAt: chatTicket.repliedAt || chatTicket.createdAt
                    });
                  }
                  const chatMessages = chatTicket.messages && chatTicket.messages.length > 0 ? chatTicket.messages : legacyMsgs;
                  
                  return (
                    <div className="space-y-3 flex flex-col justify-between min-h-[460px] bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-150 relative">
                      {/* Header */}
                      <div className="flex sm:flex-row flex-col items-center justify-between gap-1.5 border-b border-gray-200/60 pb-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const newUrl = window.location.origin + window.location.pathname;
                            window.history.replaceState({}, document.title, newUrl);
                            setActiveChatTicketId(null);
                          }}
                          className="flex items-center gap-1.5 text-xs text-brand-dark dark:text-brand-gold font-bold hover:underline cursor-pointer bg-transparent"
                        >
                          <ArrowRight size={14} />
                          <span>العودة لجميع التذاكر والاستفسارات</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${chatTicket.status === 'closed' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/45 dark:text-rose-400' : 'bg-teal-100 text-teal-700 dark:bg-teal-950/45 dark:text-teal-405'}`}>
                            {chatTicket.status === 'closed' ? '🔒 مغلقة ومؤرشفة' : '🟢 محادثة مفتوحة'}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">بطاقة #{chatTicket.id}</span>
                        </div>
                      </div>

                      {/* Messages List */}
                      <div className="flex-grow overflow-y-auto max-h-[300px] no-scrollbar space-y-3.5 pr-1 py-1">
                        <div className="text-center text-[9px] text-gray-400">
                          بُدئت المحادثة في {chatTicket.createdAt}
                        </div>

                        {chatMessages.map((msg) => {
                          const isAdmin = msg.senderRole === 'admin';
                          const isSystem = msg.senderName === 'النظام الفني';
                          return (
                            <div key={msg.id} className={`flex flex-col ${isSystem ? 'items-center' : isAdmin ? 'items-start' : 'items-end'} space-y-1`}>
                              <span className="text-[9px] font-bold text-gray-400 px-1">{msg.senderName}</span>
                              <div className={`p-2.5 rounded-2xl max-w-[85%] leading-relaxed text-[11px] font-semibold text-right shadow-xs ${
                                isSystem
                                  ? 'bg-rose-50 text-rose-850 dark:bg-rose-955/20 dark:text-rose-455 text-center px-4 py-1.5 rounded-xl border border-rose-200/30 font-bold'
                                  : isAdmin
                                    ? 'bg-amber-50 dark:bg-amber-950/20 text-brand-dark dark:text-gray-200 rounded-tr-none border-r-4 border-brand-gold'
                                    : 'bg-brand-dark dark:bg-slate-800 text-white dark:text-gray-100 rounded-tl-none'
                              }`}>
                                <p className="whitespace-pre-line">{msg.message}</p>
                              </div>
                              <span className="text-[8px] text-gray-400 font-mono text-left px-1">{msg.createdAt}</span>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input Composer or Lock block */}
                      {chatTicket.status === 'closed' ? (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/15 border border-rose-200/50 dark:border-rose-900/30 rounded-xl text-center text-rose-800 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 animate-fade-in shadow-xs">
                          <Lock size={12} className="shrink-0 animate-pulse text-rose-600 dark:text-rose-400" />
                          <span>تم قفل وأرشفة هذه المحادثة من قِبل المشرف العام للفريق الفني.</span>
                        </div>
                      ) : (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSendChatMessage(chatTicket.id, chatInputText);
                          }}
                          className="flex gap-2 items-center bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1 rounded-xl"
                        >
                          <input
                            required
                            type="text"
                            value={chatInputText}
                            onChange={(e) => setChatInputText(e.target.value)}
                            placeholder="اكتب ردك أو استفسارك الإضافي هنا..."
                            className="flex-grow bg-transparent text-[11px] p-2 focus:outline-none text-brand-dark dark:text-white"
                          />
                          <button
                            type="submit"
                            className="w-8 h-8 rounded-lg bg-brand-gold hover:bg-yellow-600 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          >
                            <Send size={13} />
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })()
              ) : (
                <>
                  {/* Submission Form */}
                  <form onSubmit={handleSendSupport} className="space-y-2.5 bg-white dark:bg-slate-900 border border-gray-150 p-4 rounded-2xl">
                    {supportSuccess ? (
                      <div className="text-center py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100 animate-fade-in">
                        تم إرسال بطاقة الدعم فورا! جاري فتح كابينة المحادثة المباشرة...
                      </div>
                    ) : (
                      <>
                        <h4 className="font-extrabold text-xs text-brand-dark dark:text-white">فتح تذكرة دعم فني جديدة</h4>
                        <p className="text-[10px] text-gray-500 leading-normal">
                          اكتب سؤالك أو الشكوى الخاصة بك بخصوص المواد وسيصل إشعار تلجرام للمشرف ليقوم بمحادتك فورا!
                        </p>

                        {user.email === 'abdulmlikoog@gmail.com' && (
                          <div className="bg-amber-50 dark:bg-amber-955/20 border border-brand-gold/25 p-2.5 rounded-xl space-y-1.5 text-right">
                            <span className="text-[9px] font-black text-brand-gold block">
                              ⚙️ ميزة المشرف التجريبية: اختر هوية مرسل الاستفسار:
                            </span>
                            <div className="grid grid-cols-2 gap-1 text-[9px] font-semibold">
                              {['self', 'simulated_ahmed', 'simulated_sara', 'simulated_m_harbi'].map((role) => {
                                const labels: Record<string, string> = {
                                  self: 'أنا (المشرف)',
                                  simulated_ahmed: 'الطالب أحمد',
                                  simulated_sara: 'الطالبة سارة',
                                  simulated_m_harbi: 'الطالب محمد'
                                };
                                return (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => setSupportSenderRole(role as any)}
                                    className={`p-1 text-[9px] rounded transition-all text-center ${supportSenderRole === role ? 'bg-brand-dark text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 border border-gray-250/20'}`}
                                  >
                                    {labels[role]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <textarea 
                          required 
                          value={supportMsg} 
                          onChange={(e) => setSupportMsg(e.target.value)} 
                          rows={3} 
                          placeholder="اكتب تفاصيل استفسارك أو المشكلة ههنا للبدء بالمحادثة..."
                          className="w-full bg-white border border-gray-200 rounded-lg text-xs p-2.5 text-right font-medium focus:outline-none focus:border-brand-gold text-brand-dark dark:text-white dark:bg-slate-950 shadow-sm"
                        ></textarea>

                        <button 
                          type="submit" 
                          className="w-full py-2 bg-brand-gold hover:bg-yellow-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          إرسال التذكرة وبدء المحادثة المباشرة
                        </button>
                      </>
                    )}
                  </form>

                  {/* Historical list */}
                  {supportTickets.filter(t => user.email === 'abdulmlikoog@gmail.com' ? true : t.senderEmail === user.email).length > 0 && (
                    <div className="pt-3 border-t border-gray-150 space-y-2 text-right">
                      <p className="text-[11px] font-extrabold text-brand-dark dark:text-brand-gold flex justify-between items-center">
                        <span>سجل المحادثات الفنية الجارية والسابقة:</span>
                        {user.email === 'abdulmlikoog@gmail.com' && (
                          <span className="text-[8px] bg-red-105 text-red-700 dark:text-red-400 font-bold">كل تذاكر المنافذ</span>
                        )}
                      </p>
                      
                      <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                        {supportTickets.filter(t => user.email === 'abdulmlikoog@gmail.com' ? true : t.senderEmail === user.email).map((ticket) => (
                          <div key={ticket.id} className="p-3 bg-slate-50 dark:bg-slate-905 border border-gray-200/50 dark:border-slate-800/50 rounded-xl space-y-1.5 text-[11px] shadow-sm hover:border-brand-gold/30 transition-colors">
                            <div className="flex justify-between items-center text-[10px]">
                              <div className="flex items-center gap-1">
                                <span className="font-extrabold text-brand-dark dark:text-brand-gold truncate max-w-[120px]">{ticket.senderName}</span>
                                <span className="text-[8px] text-gray-400 font-mono">({ticket.id})</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] ${ticket.reply ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-400' : 'bg-amber-50 text-brand-gold dark:bg-amber-955/45'}`}>
                                  {ticket.reply ? '✓ تم الرد والدردشة' : '🕒 قيد الانتظار'}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] ${ticket.status === 'closed' ? 'bg-rose-55 text-rose-700 dark:bg-rose-955/45 dark:text-rose-400' : 'bg-teal-50 text-teal-700 dark:bg-teal-950/45 dark:text-teal-400'}`}>
                                  {ticket.status === 'closed' ? '🔒 مغلقة' : '🟢 مفتوحة'}
                                </span>
                              </div>
                            </div>

                            <p className="text-gray-700 dark:text-gray-300 font-semibold truncate leading-relaxed">{ticket.message}</p>
                            
                            <div className="flex items-center justify-between pt-1 border-t border-gray-100/50">
                              <span className="block text-[8px] text-gray-400 font-mono">{ticket.createdAt}</span>
                              <button
                                type="button"
                                onClick={() => setActiveChatTicketId(ticket.id)}
                                className={`px-2.5 py-1 rounded text-white font-extrabold text-[9px] hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer ${ticket.status === 'closed' ? 'bg-slate-600 hover:bg-slate-705' : 'bg-brand-gold hover:bg-yellow-600'}`}
                              >
                                {ticket.status === 'closed' ? <Lock size={10} /> : <MessageSquare size={10} />}
                                <span>{ticket.status === 'closed' ? 'افتح أرشيف المحادثة' : 'افتح المحادثة والدردشة الجارية'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-sm animate-fade-in">
        
        {/* Account Info button */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'account' ? 'none' : 'account')}
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-50 text-blue-800 rounded-xl shrink-0">
              <User size={16} className="stroke-[2.2] text-brand-blue" />
            </div>
            <span className="text-[12px] sm:text-sm font-bold text-gray-700">معلومات الحساب الدراسي</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="text-[10px] sm:text-xs font-semibold text-brand-gold truncate max-w-[80px] sm:max-w-[120px]">{user.telegram || 'مطلوب @'}</span>
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 hidden sm:inline">{user.username}</span>
            <ChevronLeft size={14} className="shrink-0" />
          </div>
        </div>

        {/* Subscriptions */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'subscription' ? 'none' : 'subscription')}
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-orange-50 text-orange-800 rounded-xl shrink-0">
              <CreditCard size={16} className="stroke-[2.2] text-brand-gold" />
            </div>
            <span className="text-[12px] sm:text-sm font-bold text-gray-700">الاشتراكات والمساقات</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">نشط ✓</span>
            <ChevronLeft size={14} className="shrink-0" />
          </div>
        </div>

        {/* Exam history list shortcut */}
        <div 
          onClick={() => onNavigateToTab('exams')}
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-800 rounded-xl shrink-0">
              <ClipboardList size={16} className="stroke-[2.2] text-emerald-700" />
            </div>
            <span className="text-[12px] sm:text-sm font-bold text-gray-700">سجل درجات الاختبارات</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 shrink-0">{examHistoryCount} محاولات</span>
            <ChevronLeft size={14} className="shrink-0" />
          </div>
        </div>

        {/* Notifications and Alerts */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'notifications' ? 'none' : 'notifications')}
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-50 text-purple-800 rounded-xl shrink-0">
              <Bell size={16} className="stroke-[2.2] text-purple-700" />
            </div>
            <span className="text-[12px] sm:text-sm font-bold text-gray-700">تفضيلات الإشعارات</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="text-[10px] sm:text-xs font-medium text-gray-400">مفعلة</span>
            <ChevronLeft size={14} className="shrink-0" />
          </div>
        </div>

        {/* Install / Download App button */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'install' ? 'none' : 'install')}
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-amber-50 text-amber-800 rounded-xl shrink-0">
              <Download size={16} className="stroke-[2.2] text-brand-gold animate-bounce" />
            </div>
            <span className="text-[12px] sm:text-sm font-bold text-gray-700">تنزيل تطبيق "بن عون"</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            {deferredPrompt ? (
              <span className="text-[9px] sm:text-[10px] font-black text-brand-gold bg-amber-50 px-1.5 py-0.5 rounded animate-pulse shrink-0">تثبيت مباشر</span>
            ) : (
              <span className="text-[10px] sm:text-xs font-medium text-gray-400 shrink-0">طريقة الحفظ</span>
            )}
            <ChevronLeft size={14} className="shrink-0" />
          </div>
        </div>

        {/* Dark Mode Toggle Switch */}
        <div 
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-indigo-50 text-indigo-800 rounded-xl shrink-0">
              {darkMode ? (
                <Sun size={16} className="stroke-[2.2] text-brand-gold" />
              ) : (
                <Moon size={16} className="stroke-[2.2] text-indigo-700" />
              )}
            </div>
            <span className="text-[12px] sm:text-sm font-bold text-gray-700">الوضع المظلم (Dark Mode)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleDarkMode(!darkMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-gray-200 transition-colors duration-200 ease-in-out focus:outline-none p-0.5 items-center ${
                darkMode ? 'bg-brand-gold justify-end' : 'bg-gray-205 bg-gray-200 justify-start'
              }`}
              type="button"
              role="switch"
              aria-checked={darkMode}
            >
              <span
                className="pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-md transition duration-200"
              />
            </button>
          </div>
        </div>

        {/* Support & Tech queries */}
        <div 
          onClick={() => setActiveSubSection(activeSubSection === 'support' ? 'none' : 'support')}
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-teal-50 text-teal-800 rounded-xl shrink-0">
              <HelpCircle size={16} className="stroke-[2.2] text-teal-700" />
            </div>
            <span className="text-[12px] sm:text-sm font-bold text-gray-700">الدعم الفني والردود الفورية</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <ChevronLeft size={14} className="shrink-0" />
          </div>
        </div>

        {/* Support & Tech queries: Admin Dashboard Option inside Menu (For Administrators Only) */}
        {user.email === 'abdulmlikoog@gmail.com' && (
          <div 
            onClick={() => setProfileViewTab('admin')}
            className="p-3 sm:p-4 flex items-center justify-between hover:bg-red-50/20 cursor-pointer transition-colors bg-red-50/5 dark:bg-red-950/5"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-red-50 dark:bg-red-950/20 text-red-800 rounded-xl shrink-0">
                <Shield size={16} className="stroke-[2.2] text-red-600 animate-pulse" />
              </div>
              <span className="text-[12px] sm:text-sm font-black text-red-705 text-red-700 dark:text-red-400">لوحة التحكم والمشرف العام</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-500">
              <span className="text-[9px] sm:text-[10px] font-bold bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full shrink-0">إدارة المنصة</span>
              <ChevronLeft size={14} className="shrink-0" />
            </div>
          </div>
        )}

        {/* Log out of the current system session */}
        {showLogoutConfirm ? (
          <div className="p-3 sm:p-4 bg-red-50/75 border-t border-red-100 flex flex-col gap-3 animate-fade-in text-center">
            <p className="text-[11px] sm:text-xs font-bold text-red-800">
              هل أنت متأكد من تسجيل الخروج من حسابك؟
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onLogout()}
                className="flex-1 py-1 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] sm:text-xs font-black transition-colors cursor-pointer"
              >
                نعم، تسجيل الخروج
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-1 px-3 bg-white hover:bg-gray-150 border border-gray-200 text-gray-700 rounded-lg text-[10px] sm:text-xs font-black transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setShowLogoutConfirm(true)}
            className="p-3 sm:p-4 flex items-center justify-between hover:bg-red-50/40 cursor-pointer transition-colors text-red-650 text-red-600"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-red-50 text-red-700 rounded-xl shrink-0">
                <LogOut size={16} className="stroke-[2.2]" />
              </div>
              <span className="text-[12px] sm:text-sm font-semibold">تسجيل الخروج الآمن</span>
            </div>
            <ChevronLeft size={14} className="text-red-300 shrink-0" />
          </div>
        )}

      </div>
      </>
    )}

    </div>
  );
}
