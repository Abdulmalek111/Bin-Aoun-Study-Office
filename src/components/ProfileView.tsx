import React, { useState, useEffect, useRef } from 'react';
import { Settings, User, CreditCard, ClipboardList, Bell, HelpCircle, LogOut, ChevronLeft, ShieldCheck, Mail, Save, Check, Sun, Moon, Download, Shield, Send, ArrowRight, MessageSquare, Lock, Camera, Phone, GraduationCap, ShieldAlert, Copy } from 'lucide-react';
import { User as UserType, SupportTicket, ChatMessage } from '../types';
import { auth, db, storage } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  subjectLecturesMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf'; url?: string }[]>;
  onUpdateSubjectLectures: (updatedMap: Record<string, { title: string; duration: string; type: 'video' | 'pdf'; url?: string }[]>) => void;
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
  const [profileViewTab, setProfileViewTab] = useState<'profile' | 'admin'>('profile');

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(user.fullName || user.username || '');
  const [phoneInput, setPhoneInput] = useState(user.phone || '');
  const [universityInput, setUniversityInput] = useState(user.university || '');
  const [collegeInput, setCollegeInput] = useState(user.college || '');
  const [departmentInput, setDepartmentInput] = useState(user.department || '');
  const [levelInput, setLevelInput] = useState(user.level || user.academicStage || 'بكالوريوس');
  
  // Telegram & Stage selections state
  const [telegramInput, setTelegramInput] = useState(user.telegram || '');
  const [academicYearInput, setAcademicYearInput] = useState(user.academicYear || 'سنة أولى');
  const [academicSemesterInput, setAcademicSemesterInput] = useState(user.academicSemester || 'فصل أول');
  const [academicTrackInput, setAcademicTrackInput] = useState(user.academicTrack || 'علمي');

  // Avatar Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Copying state & handler for Student ID
  const [copied, setCopied] = useState(false);
  const handleCopyId = () => {
    if (user.studentId) {
      navigator.clipboard.writeText(user.studentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Student Bio states & handler
  const [bioInput, setBioInput] = useState(user.bio || '');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioSaveSuccess, setBioSaveSuccess] = useState(false);

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    setBioSaveSuccess(false);
    try {
      const userDocRef = doc(db, 'users', user.uid || auth.currentUser?.uid || '');
      await updateDoc(userDocRef, {
        bio: bioInput.trim(),
        updatedAt: serverTimestamp()
      });

      // Update parent state
      onUpdateProfile({
        ...user,
        bio: bioInput.trim()
      });
      setBioSaveSuccess(true);
    } catch (e) {
      console.error("Error saving bio:", e);
      alert("عذراً، حدث خطأ أثناء حفظ الوصف الشخصي. الرجاء المحاولة مرة أخرى.");
    } finally {
      setIsSavingBio(false);
    }
  };

  // Support & Interactive Chat states
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState('');
  const [supportSenderRole, setSupportSenderRole] = useState<'self' | 'simulated_ahmed' | 'simulated_sara' | 'simulated_m_harbi'>('self');
  const [activeChatTicketId, setActiveChatTicketId] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with incoming user prop updates
  useEffect(() => {
    setFullNameInput(user.fullName || user.username || '');
    setPhoneInput(user.phone || '');
    setUniversityInput(user.university || '');
    setCollegeInput(user.college || '');
    setDepartmentInput(user.department || '');
    setLevelInput(user.level || user.academicStage || 'بكالوريوس');
    setTelegramInput(user.telegram || '');
    setAcademicYearInput(user.academicYear || 'سنة أولى');
    setAcademicSemesterInput(user.academicSemester || 'فصل أول');
    setAcademicTrackInput(user.academicTrack || 'علمي');
    setBioInput(user.bio || '');
  }, [user]);

  const getProfileYearsList = (stage: string) => {
    if (stage === 'ماستر' || stage === 'ماجستير') {
      return ['سنة أولى', 'سنة ثانية'];
    } else if (stage === 'دكتوراة') {
      return ['سنة أولى', 'سنة ثانية', 'سنة ثالثة'];
    } else {
      return ['طالب مستجد', 'سنة أولى', 'سنة ثانية', 'سنة ثالثة', 'سنة رابعة'];
    }
  };

  const handleProfileStageChange = (newStage: string) => {
    setLevelInput(newStage);
    const allowed = getProfileYearsList(newStage);
    if (!allowed.includes(academicYearInput)) {
      setAcademicYearInput(allowed[0]);
    }
  };

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

  // Profile fields saving handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      alert('الرجاء كتابة الاسم الكامل (حقل إلزامي)');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      let formattedTelegram = telegramInput.trim();
      if (formattedTelegram && !formattedTelegram.startsWith('@')) {
        formattedTelegram = '@' + formattedTelegram;
      }

      const userDocRef = doc(db, 'users', user.uid || auth.currentUser?.uid || '');
      await updateDoc(userDocRef, {
        fullName: fullNameInput.trim(),
        username: fullNameInput.trim(), // Keep username backward compatible
        phone: phoneInput.trim(),
        university: universityInput.trim(),
        college: collegeInput.trim(),
        department: departmentInput.trim(),
        level: levelInput,
        academicStage: levelInput, // Sync legacy academic stage
        telegram: formattedTelegram,
        academicYear: academicYearInput,
        academicSemester: academicSemesterInput,
        academicTrack: academicTrackInput,
        updatedAt: serverTimestamp()
      });

      // Update parent component if needed to synchronize local storage instantly
      onUpdateProfile({
        ...user,
        username: fullNameInput.trim(),
        fullName: fullNameInput.trim(),
        phone: phoneInput.trim(),
        university: universityInput.trim(),
        college: collegeInput.trim(),
        department: departmentInput.trim(),
        level: levelInput,
        academicStage: levelInput,
        telegram: formattedTelegram,
        academicYear: academicYearInput,
        academicSemester: academicSemesterInput,
        academicTrack: academicTrackInput
      });

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error("Firestore save error: ", err);
      setSaveError('حدث خطأ أثناء حفظ التغييرات. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSaving(false);
    }
  };

  // Storage Upload Change Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Format validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG, JPEG, PNG أو WEBP.');
      return;
    }

    // Size validation - max 2MB
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 2 ميجابايت.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const uidValue = user.uid || auth.currentUser?.uid;
      if (!uidValue) {
        throw new Error("المستخدم غير مسجل دخول.");
      }

      const storageRef = ref(storage, `profile-images/${uidValue}/avatar`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Save to user Firestore
      const userDocRef = doc(db, 'users', uidValue);
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
        avatarUrl: downloadURL, // Sync sync backwards compatibility
        updatedAt: serverTimestamp()
      });

      onUpdateProfile({
        ...user,
        photoURL: downloadURL,
        avatarUrl: downloadURL
      });

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      setUploadError('تفشل رفع الصورة. تأكد من إعدادات الـ Storage والاتصال.');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
    let senderName = user.fullName || user.username;

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

  // Helper date formatter
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'غير متوفر';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    try {
      return new Date(timestamp).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'غير متوفر';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <button 
          onClick={() => alert('إعدادات عامة: تم تهيئة النظام ليعمل بالترميز العربي والمزامنة الكاملة مع Firebase')}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
          id="btn-settings"
        >
          <Settings size={20} className="stroke-[2.2]" />
        </button>
        <h1 className="text-xl font-extrabold text-brand-dark">الملف الشخصي للطالب</h1>
        <div className="w-9 h-9"></div> {/* Balancer spacer */}
      </div>

      {user.email === 'abdulmlikoog@gmail.com' && profileViewTab === 'admin' ? (
        <div className="space-y-4 animate-fade-in" id="admin-panel-container">
          <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-805/40 p-2.5 rounded-xl border border-gray-150/30">
            <span className="text-xs font-extrabold text-brand-dark dark:text-brand-gold flex items-center gap-1.5">
              <Shield size={14} className="text-brand-gold" />
              <span>لوحة التحكم والإرشاد العامة كمسؤول</span>
            </span>
            <button 
              type="button"
              onClick={() => setProfileViewTab('profile')}
              className="px-3 py-1.5 bg-brand-dark hover:bg-brand-blue text-white rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              id="btn-return-profile"
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
          {/* Main User Avatar Box with Camera Upload Feature */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center space-y-4 shadow-sm relative overflow-hidden" id="card-avatar">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-brand-gold via-brand-dark to-brand-blue"></div>
            
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-brand-gold to-brand-blue rounded-full blur opacity-40"></div>
              
              {/* Profile Image container with camera button overlay */}
              <div 
                onClick={triggerFileInput}
                className="relative w-24 h-24 rounded-full object-cover border-4 border-white shadow-md cursor-pointer overflow-hidden group"
              >
                {user.photoURL || user.avatarUrl ? (
                  <img 
                    src={user.photoURL || user.avatarUrl} 
                    alt={user.fullName || user.username} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-brand-dark text-white flex items-center justify-center font-black text-3xl">
                    {(user.fullName || user.username || 'ط').charAt(0)}
                  </div>
                )}
                
                {/* Upload Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera size={20} className="text-white mb-0.5" />
                  <span className="text-[9px] font-bold">تغيير الصورة</span>
                </div>

                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <span className="text-[10px] font-bold animate-pulse">جاري الرفع...</span>
                  </div>
                )}
              </div>

              {/* Float Trigger Button */}
              <button 
                onClick={triggerFileInput}
                className="absolute bottom-0 right-0 p-1.5 bg-gradient-to-r from-brand-gold to-yellow-600 border-2 border-white rounded-full text-white shadow hover:scale-110 transition-transform cursor-pointer"
                title="تحميل صورة شخصية جديدة"
                id="btn-upload-avatar"
              >
                <Camera size={14} className="stroke-[2.5]" />
              </button>

              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden" 
              />
            </div>

            {/* Upload statuses */}
            {uploadError && (
              <div className="bg-red-50 text-red-500 border border-red-100 text-[10px] font-bold px-2 py-1 rounded-lg max-w-xs mx-auto animate-fade-in flex items-center gap-1 justify-center">
                <ShieldAlert size={12} />
                <span>{uploadError}</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold px-2 py-1 rounded-lg max-w-xs mx-auto animate-fade-in flex items-center gap-1 justify-center">
                <Check size={12} />
                <span>تم تحديث صورتك بنجاح ✓</span>
              </div>
            )}

            <div>
              <h3 className="font-extrabold text-lg text-brand-dark flex items-center justify-center gap-1.5">
                <span>{user.fullName || user.username}</span>
                <ShieldCheck size={18} className="text-brand-gold stroke-[2.5]" />
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{user.email}</p>
              
              {user.studentId && (
                <div className="flex items-center justify-center gap-1.5 mt-2 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl max-w-xs mx-auto">
                  <span className="text-[10px] text-gray-500 font-bold">رقم الطالب / Student ID:</span>
                  <span className="font-mono text-xs font-black text-brand-dark select-all">{user.studentId}</span>
                  <button
                    onClick={handleCopyId}
                    type="button"
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-brand-gold transition-colors shrink-0 cursor-pointer"
                    title="نسخ المعرف"
                  >
                    {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
              
              {/* Badges row for Role and Account Status */}
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-extrabold bg-brand-gold/15 text-brand-blue border border-brand-gold/25 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Shield size={12} className="text-brand-gold" />
                  <span>العضوية: {user.role === 'admin' ? 'مشرف عام' : 'طالب دراسات'}</span>
                </span>
                
                <span className={`text-[10px] font-extrabold border px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm ${user.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${user.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span>حالة الحساب: {user.isActive !== false ? 'مفعل وجاهز' : 'غير نشط'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic views switch: Editing Mode or Cards Display Mode */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-5 border border-gray-150 space-y-4 shadow-sm animate-fade-in" id="form-edit-profile">
              <div className="border-b border-gray-100 pb-2.5">
                <h3 className="text-sm font-bold text-brand-dark flex items-center gap-1">
                  <User size={16} className="text-brand-gold" />
                  <span>تعديل معلومات الملف الشخصي</span>
                </h3>
              </div>

              {saveError && (
                <div className="bg-red-50 text-red-500 border border-red-100 text-xs font-bold p-2.5 rounded-xl text-center">
                  {saveError}
                </div>
              )}

              {/* Group 1: Personal info fields */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-extrabold text-brand-blue uppercase border-r-4 border-brand-blue pr-2">المعلومات الشخصية</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">الاسم الكامل (ثلاثياً كما هو في الكلية)</label>
                    <input 
                      type="text"
                      required
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-3 py-2.5 text-right font-medium focus:outline-none focus:border-brand-gold focus:bg-white transition-all shadow-inner"
                      id="input-fullname"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">رقم الهاتف الجوال (إضافة رمز الدولة)</label>
                    <input 
                      type="text"
                      placeholder="مثال: 9665xxxxxxxx"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-3 py-2.5 text-left font-mono focus:outline-none focus:border-brand-gold focus:bg-white transition-all shadow-inner"
                      id="input-phone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1 opacity-60">
                    <label className="text-[10px] font-extrabold text-gray-400 block">البريد الإلكتروني (غير قابل للتعديل)</label>
                    <input 
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-xl text-xs px-3 py-2.5 text-right font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">حساب التليجرام (مطلوب للمشرف الميداني)</label>
                    <input 
                      type="text"
                      placeholder="telegram_handle@"
                      value={telegramInput}
                      onChange={(e) => setTelegramInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-3 py-2.5 text-left font-mono focus:outline-none focus:border-brand-gold focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Academic fields */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-extrabold text-brand-gold uppercase border-r-4 border-brand-gold pr-2">المعلومات الأكاديمية</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">الجامعة المانحة</label>
                    <input 
                      type="text"
                      placeholder="جامعة الملك سعود الكريمة مثلاً"
                      value={universityInput}
                      onChange={(e) => setUniversityInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-3 py-2.5 text-right font-medium focus:outline-none focus:border-brand-gold focus:bg-white transition-all shadow-inner"
                      id="input-university"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">الكلية والمنتسب لها</label>
                    <input 
                      type="text"
                      placeholder="كلية العلوم أو الهندسة الكريمة"
                      value={collegeInput}
                      onChange={(e) => setCollegeInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-3 py-2.5 text-right font-medium focus:outline-none focus:border-brand-gold focus:bg-white transition-all shadow-inner"
                      id="input-college"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">التخصص / القسم العلمي دقيقاً</label>
                    <input 
                      type="text"
                      placeholder="الهندسة البرمجية / الكيمياء"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-3 py-2.5 text-right font-medium focus:outline-none focus:border-brand-gold focus:bg-white transition-all shadow-inner"
                      id="input-department"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">العقد / المرحلة الدراسية</label>
                    <select
                      value={levelInput}
                      onChange={(e) => handleProfileStageChange(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-1.5 py-2.5 text-right font-bold focus:outline-none focus:border-brand-gold focus:bg-white cursor-pointer shadow-sm"
                      id="input-level"
                    >
                      <option value="بكالوريوس">بكالوريوس</option>
                      <option value="ماجستير">ماجستير / ماستر</option>
                      <option value="دكتوراة">دكتوراه</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">السنة الدراسية</label>
                    <select
                      value={academicYearInput}
                      onChange={(e) => setAcademicYearInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-1.5 py-2.5 text-right font-bold focus:outline-none focus:border-brand-gold focus:bg-white cursor-pointer shadow-sm"
                    >
                      {getProfileYearsList(levelInput).map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">الفصل الدراسي الجاري</label>
                    <select
                      value={academicSemesterInput}
                      onChange={(e) => setAcademicSemesterInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-1.5 py-2.5 text-right font-bold focus:outline-none focus:border-brand-gold focus:bg-white cursor-pointer shadow-sm"
                    >
                      <option value="فصل أول">الفصل الأول</option>
                      <option value="فصل ثاني">الفصل الثاني</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 block">المسار التدريبي العلمي</label>
                    <select
                      value={academicTrackInput}
                      onChange={(e) => setAcademicTrackInput(e.target.value)}
                      className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs px-1.5 py-2.5 text-right font-bold focus:outline-none focus:border-brand-gold focus:bg-white cursor-pointer shadow-sm"
                    >
                      <option value="علمي">علمي</option>
                      <option value="أدبي">أدبي</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Editing actions buttons */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-brand-blue to-brand-dark text-white rounded-xl text-xs font-bold transition-all shadow hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn-save-profile"
                >
                  {isSaving ? (
                    <span className="animate-pulse">جاري حفظ البيانات...</span>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>حفظ التغييرات الفوري</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn-cancel-profile"
                >
                  <span>إلغاء التراجع</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 shadow-sm animate-fade-in" id="profile-detailed-cards">
              
              {/* Primary Profile edit buttons inside profile list */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-3 bg-brand-dark hover:bg-brand-blue text-white rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  id="btn-trigger-edit"
                >
                  <Save size={14} className="text-brand-gold" />
                  <span>تعديل وإكمال الملف الشخصي</span>
                </button>
              </div>

              {/* Bio / Personal Description */}
              <div className="bg-white p-4 rounded-2xl border border-gray-150 space-y-3">
                <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <span className="text-sm">📝</span>
                  <span className="font-extrabold text-xs text-brand-dark">الوصف الشخصي / Personal Description</span>
                </div>
                
                <div className="space-y-2.5">
                  <textarea
                    maxLength={160}
                    value={bioInput}
                    onChange={(e) => {
                      setBioInput(e.target.value);
                      if (bioSaveSuccess) setBioSaveSuccess(false);
                    }}
                    placeholder="اكتب نبذة مختصرة عن نفسك هنا (الحد الأقصى 160 حرفًا)..."
                    className="w-full bg-slate-50/50 border border-gray-200 rounded-xl text-xs p-3 text-right font-medium focus:outline-none focus:border-brand-gold focus:bg-white transition-all shadow-inner text-brand-dark min-h-[70px] resize-none"
                  />
                  
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-mono">{bioInput.length}/160</span>
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      disabled={isSavingBio}
                      className="px-4.5 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {isSavingBio ? (
                        <span className="animate-pulse">جاري الحفظ...</span>
                      ) : (
                        <>
                          <Check size={12} className="stroke-[2.5]" />
                          <span>حفظ الوصف الشخصي</span>
                        </>
                      )}
                    </button>
                  </div>

                  {bioSaveSuccess && (
                    <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg text-center border border-emerald-100 animate-fade-in">
                      ✓ تم تحديث الوصف الشخصي وحفظه بنجاح!
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Dynamic Popover sub-section reader */}
          {activeSubSection !== 'none' && (
            <div className="bg-amber-500/5 rounded-2xl p-4 border border-brand-gold/30 space-y-4 animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-brand-gold/10">
                <h4 className="text-xs font-black text-brand-blue">
                  {activeSubSection === 'account' ? 'تعديل معلومات الحساب' : ''}
                  {activeSubSection === 'subscription' ? 'تفاصيل الاشتراك والمسار التعليمي' : ''}
                  {activeSubSection === 'notifications' ? 'تفضيلات الإشعارات والتنبيهات' : ''}
                  {activeSubSection === 'support' ? 'مركز الدعم الفني والمساعدة والاستفسارات' : ''}
                </h4>
                <button 
                  onClick={() => setActiveSubSection('none')}
                  className="text-xs font-bold text-gray-400 hover:text-brand-dark px-2 py-0.5 rounded-lg hover:bg-gray-150"
                  id="btn-popover-cancel"
                >
                  إلغاء التراجع
                </button>
              </div>

              {/* Account Subview (detailed view with Personal, Academic, and Account information) */}
              {activeSubSection === 'account' && (
                <div className="space-y-4 animate-fade-in text-brand-dark" id="academic-account-detailed-view">
                  
                  {/* 1. Personal Information */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-150 space-y-2.5">
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-gray-100 mb-0.5">
                      <User size={14} className="text-brand-blue" />
                      <span className="font-extrabold text-[12px] text-brand-blue">👩‍🎓 المعلومات الشخصية والتواصل</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs">
                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">الاسم بالكامل:</span>
                        <span className="font-bold text-gray-700">{user.fullName || user.username || 'لم يحدد'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">البريد الإلكتروني:</span>
                        <span className="font-bold text-gray-750 font-mono text-[10px] truncate max-w-[150px] sm:max-w-none" dir="ltr">{user.email || '—'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">رقم الهاتف:</span>
                        <span className="font-bold text-gray-700 font-mono">{user.phone || '—'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold font-sans">Telegram Username:</span>
                        <span className="font-extrabold text-brand-gold bg-amber-500/5 px-1.5 py-0.5 rounded font-mono text-[10px]">{user.telegram || 'مطلوب @'}</span>
                      </div>

                      {user.studentId && (
                        <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                          <span className="text-gray-400 font-semibold">رقم الطالب / Student ID:</span>
                          <span className="font-extrabold text-brand-blue font-mono">{user.studentId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Academic Information */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-150 space-y-2.5">
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-gray-100 mb-0.5">
                      <GraduationCap size={14} className="text-emerald-700" />
                      <span className="font-extrabold text-[12px] text-emerald-700">🎓 معلومات المسار الدراسي والأكاديمي</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs">
                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">الجامعة:</span>
                        <span className="font-bold text-gray-800">{user.university || '—'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">الكلية:</span>
                        <span className="font-bold text-gray-800">{user.college || '—'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">القسم / التخصص:</span>
                        <span className="font-bold text-gray-800">{user.department || '—'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">المرحلة الدراسية:</span>
                        <span className="font-extrabold text-brand-dark bg-blue-50 text-brand-blue px-2 py-0.5 rounded text-[10px]">{user.level || user.academicStage || 'بكالوريوس'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">السنة الدراسية:</span>
                        <span className="font-bold text-gray-750">{user.academicYear || 'سنة أولى'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">الفصل الدراسي:</span>
                        <span className="font-bold text-gray-750">{user.academicSemester || 'فصل أول'}</span>
                      </div>

                      <div className="col-span-1 sm:col-span-2 flex justify-between items-center p-2 bg-brand-gold/5 rounded-lg border border-brand-gold/10">
                        <span className="text-gray-500 font-extrabold">المسار والمذاكرة الجاري:</span>
                        <span className="font-black text-brand-gold text-xs">{user.academicTrack || 'علمي'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Account Details */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-150 space-y-2.5">
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-gray-100 mb-0.5">
                      <Lock size={14} className="text-purple-700" />
                      <span className="font-extrabold text-[12px] text-purple-700">⚙️ رتبة الحساب وخيارات الأمان</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs">
                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">صلاحية الحساب:</span>
                        <span className="font-extrabold text-purple-750 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">{user.role === 'admin' ? 'مدير المنصة (Admin)' : 'طالب دراسات (Student)'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold">حالة الحساب الجاري:</span>
                        <span className="font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[10px]">
                          ✓ حساب موثق ومفعّل
                        </span>
                      </div>

                      <div className="col-span-1 sm:col-span-2 flex justify-between items-center p-2 bg-gray-55 bg-gray-50/50 rounded-lg">
                        <span className="text-gray-400 font-semibold shrink-0">معرف الحساب الموقت:</span>
                        <span className="font-mono text-[9px] text-gray-550 select-all truncate max-w-[180px] sm:max-w-none" dir="ltr">{user.uid}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-end">
                    <button 
                      onClick={() => {
                        setActiveSubSection('none');
                        setIsEditing(true);
                      }}
                      className="px-4 py-2.5 bg-brand-dark text-white rounded-xl text-xs font-bold hover:bg-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      id="btn-inline-redirect-edit"
                    >
                      <Settings size={13} className="animate-spin-slow text-brand-gold" />
                      <span>تعديل وحفظ المسار الدراسي</span>
                    </button>
                    
                    <button 
                      onClick={() => setActiveSubSection('none')}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-150 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                      id="btn-inline-close-account"
                    >
                      إغلاق التفاصيل الدراسيَّة
                    </button>
                  </div>
                </div>
              )}

              {/* Subscription Subview */}
              {activeSubSection === 'subscription' && (
                <div className="space-y-2.5 text-xs text-brand-dark">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-150">
                    <span className="font-semibold text-gray-500">حالة العضوية</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded hidden sm:inline">نشطة ✓</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-150">
                    <span className="font-semibold text-gray-500">الباقة التعليمية</span>
                    <span className="font-bold text-brand-blue font-sans">باقة المسار العلمي المطلق</span>
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
                      className="rounded text-brand-gold focus:ring-brand-gold h-4 w-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-gray-600">إشعارات رفع مذكرات أو غرف نقاش جديدة</span>
                    <input 
                      type="checkbox" 
                      checked={notifLectures} 
                      onChange={(e) => setNotifLectures(e.target.checked)} 
                      className="rounded text-brand-gold focus:ring-brand-gold h-4 w-4 cursor-pointer"
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
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${chatTicket.status === 'closed' ? 'bg-rose-100 text-rose-700 dark:bg-rose-955/45 dark:text-rose-400' : 'bg-teal-100 text-teal-700 dark:bg-teal-955/45 dark:text-teal-405'}`}>
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
                                        ? 'bg-amber-50 dark:bg-amber-955/20 text-brand-dark dark:text-gray-200 rounded-tr-none border-r-4 border-brand-gold'
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
                            <div className="p-3 bg-rose-50 dark:bg-rose-955/15 border border-rose-200/50 dark:border-rose-900/30 rounded-xl text-center text-rose-850 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 animate-fade-in shadow-xs">
                              <Lock size={12} className="shrink-0 animate-pulse text-rose-600 dark:text-rose-400" />
                              <span>تم قفل وأرشفة هذه المحادثة من قِبل المشرف العام للفريق الفني.</span>
                            </div>
                          ) : (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSendChatMessage(chatTicket.id, chatInputText);
                              }}
                              className="flex gap-2 items-center bg-gray-50 dark:bg-slate-800 border border-gray-205 dark:border-slate-700 p-1 rounded-xl"
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
                          <div className="text-center py-2.5 text-xs font-bold text-emerald-700 bg-emerald-55 rounded-xl border border-emerald-100 animate-fade-in">
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
                                        className={`p-1 text-[9px] rounded transition-all text-center ${supportSenderRole === role ? 'bg-brand-dark text-white' : 'bg-gray-100 dark:bg-slate-805 text-gray-650 border border-gray-250/20'}`}
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
                              <span className="text-[8px] bg-red-105 text-red-700 dark:text-red-400 font-bold font-sans">كل تذاكر المنافذ</span>
                            )}
                          </p>
                          
                          <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                            {supportTickets.filter(t => user.email === 'abdulmlikoog@gmail.com' ? true : t.senderEmail === user.email).map((ticket) => (
                              <div key={ticket.id} className="p-3 bg-slate-50 dark:bg-slate-905 border border-gray-200/50 dark:border-slate-805/50 rounded-xl space-y-1.5 text-[11px] shadow-sm hover:border-brand-gold/30 transition-colors">
                                <div className="flex justify-between items-center text-[10px]">
                                  <div className="flex items-center gap-1">
                                    <span className="font-extrabold text-brand-dark dark:text-brand-gold truncate max-w-[120px]">{ticket.senderName}</span>
                                    <span className="text-[8px] text-gray-400 font-mono">({ticket.id})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] ${ticket.reply ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-955/45 dark:text-emerald-400' : 'bg-amber-50 text-brand-gold dark:bg-amber-955/45'}`}>
                                      {ticket.reply ? '✓ تم الرد والدردشة' : '🕒 قيد الانتظار'}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] ${ticket.status === 'closed' ? 'bg-rose-50 text-rose-700 dark:bg-rose-955/45 dark:text-rose-450' : 'bg-teal-50 text-teal-700 dark:bg-teal-950/45 dark:text-teal-400'}`}>
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
                                    className={`px-2.5 py-1 rounded text-white font-extrabold text-[9px] hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer ${ticket.status === 'closed' ? 'bg-slate-650' : 'bg-brand-gold hover:bg-yellow-600'}`}
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
                <div className="space-y-3.5 text-xs animate-fade-in">
                  <div className="bg-white p-3.5 rounded-xl border border-gray-150 space-y-3 text-right">
                    <p className="font-bold text-gray-750 leading-normal font-sans">
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
                      <div className="text-[11px] text-gray-505 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-150 space-y-2">
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
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-sm animate-fade-in" id="profile-navigation-links">
            
            {/* Account Info button */}
            <div 
              onClick={() => {
                setActiveSubSection(activeSubSection === 'account' ? 'none' : 'account');
                setIsEditing(false);
              }}
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
                <span className="text-[10px] sm:text-xs font-medium text-gray-400 hidden sm:inline">{user.fullName || user.username}</span>
                <ChevronLeft size={14} className="shrink-0" />
              </div>
            </div>

            {/* Subscriptions */}
            <div 
              onClick={() => setActiveSubSection(activeSubSection === 'subscription' ? 'none' : 'subscription')}
              className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-orange-50 text-orange-850 rounded-xl shrink-0">
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
                <span className="text-[12px] sm:text-sm font-bold text-gray-700">سجل درجات الاختبارات التجريبية</span>
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
                <div className="p-1.5 sm:p-2 bg-amber-50 text-amber-805 rounded-xl shrink-0">
                  <Download size={16} className="stroke-[2.2] text-brand-gold animate-bounce" />
                </div>
                <span className="text-[12px] sm:text-sm font-bold text-gray-700">تنزيل تطبيق المذاكرة "بن عون"</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                {deferredPrompt ? (
                  <span className="text-[9px] sm:text-[10px] font-black text-brand-gold bg-amber-55 px-1.5 py-0.5 rounded animate-pulse shrink-0">تثبيت مباشر</span>
                ) : (
                  <span className="text-[10px] sm:text-xs font-medium text-gray-400 shrink-0 font-sans">طريقة الحفظ</span>
                )}
                <ChevronLeft size={14} className="shrink-0" />
              </div>
            </div>

            {/* Dark Mode Toggle Switch */}
            <div 
              className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-indigo-50 text-indigo-805 rounded-xl shrink-0">
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
                    darkMode ? 'bg-brand-gold justify-end' : 'bg-gray-200 justify-start'
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
                <span className="text-[12px] sm:text-sm font-bold text-gray-700">الدعم الفني والردود الفورية بموقعنا</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <ChevronLeft size={14} className="shrink-0" />
              </div>
            </div>

            {/* Admin controller links if admin authorized */}
            {user.email === 'abdulmlikoog@gmail.com' && (
              <div 
                onClick={() => setProfileViewTab('admin')}
                className="p-3 sm:p-4 flex items-center justify-between hover:bg-red-50/20 cursor-pointer transition-colors bg-red-50/5 dark:bg-red-955/5 bg-slate-50/10"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-red-50 dark:bg-red-955/20 text-red-800 rounded-xl shrink-0">
                    <Shield size={16} className="stroke-[2.2] text-red-600 animate-pulse" />
                  </div>
                  <span className="text-[12px] sm:text-sm font-black text-red-700 dark:text-red-400">لوحة التحكم والمشرف العام</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-505">
                  <span className="text-[9px] sm:text-[10px] font-bold bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full shrink-0">إدارة المنصة</span>
                  <ChevronLeft size={14} className="shrink-0" />
                </div>
              </div>
            )}

            {/* Secure logout confirmation module */}
            {showLogoutConfirm ? (
              <div className="p-4 bg-red-50 border-t border-red-150 flex flex-col gap-3 animate-fade-in text-center" id="logout-confirm-box">
                <p className="text-[11px] sm:text-xs font-bold text-red-800">
                  هل أنت متأكد رغبتك بتسجيل الخروج الآمن من حسابك؟
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => onLogout()}
                    className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] sm:text-xs font-black transition-colors cursor-pointer"
                    id="btn-confirm-logout"
                  >
                    نعم، تسجيل الخروج
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-gray-150 border border-gray-200 text-gray-700 rounded-xl text-[10px] sm:text-xs font-black transition-colors cursor-pointer"
                    id="btn-cancel-logout"
                  >
                    إلغاء التراجع
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setShowLogoutConfirm(true)}
                className="p-3 sm:p-4 flex items-center justify-between hover:bg-red-50/40 cursor-pointer transition-colors text-red-600"
                id="btn-trigger-logout"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-red-50 text-red-700 rounded-xl shrink-0">
                    <LogOut size={16} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[12px] sm:text-sm font-semibold">تسجيل الخروج الآمن من النظام</span>
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
