import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, RefreshCw, Sparkles, CreditCard, Send, MessageCircle } from 'lucide-react';
import { User } from '../types';
import { PaidWorkItem } from '../data';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  item: PaidWorkItem;
  user: User | null;
  onSubmitPayment: (payload: { senderName: string; telegram: string; notes: string }) => Promise<void>;
}

export default function PurchaseModal({
  isOpen,
  onClose,
  subjectId,
  item,
  user,
  onSubmitPayment,
}: PurchaseModalProps) {
  const [senderName, setSenderName] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setTelegramUsername(user.telegram || '');
      setSenderName('');
      setPaymentNotes('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCopyCard = () => {
    navigator.clipboard.writeText('220010500228419');
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) {
      alert('يرجى كتابة اسم المرسِل المحوّل ثلاثياً بشكل صحيح لتسهيل مطابقة الحوالة المباشرة.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitPayment({
        senderName: senderName.trim(),
        telegram: telegramUsername.trim(),
        notes: paymentNotes.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-55 animate-fade-in text-right" 
      style={{ direction: 'rtl' }}
    >
      {/* Modal Card */}
      <div 
        id="purchase-modal-card"
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 border border-brand-gold/20 shadow-2xl relative flex flex-col justify-between max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden"
      >
        {/* Modal Header & Close button */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-3">
          <div className="space-y-0.5">
            <div className="inline-flex py-0.5 px-2 bg-brand-gold/10 text-brand-gold rounded-full text-[9px] sm:text-[10px] font-black items-center gap-1">
              <Sparkles size={11} className="animate-pulse" />
              <span>طلب وإتمام تفعيل الملف المعتمد</span>
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white mt-0.5">تأكيد عملية التحويل وتلقي التفعيل</h3>
          </div>
          
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-full bg-gray-50 hover:bg-gray-150 text-gray-400 hover:text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Outer Container */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 pl-0.5 mb-3 select-none">
          <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-300 font-bold leading-normal">
            يرجى التحويل المباشر لقيمة المادة إلى الحساب الدراسي أدناه، ثم إرسال معلومات التحويل لتفعيل الملف فور مراجعته بواسطة الإدارة العامة.
          </p>

          {/* Product description card */}
          <div className="p-3 bg-gray-50 dark:bg-slate-850 rounded-xl sm:rounded-2xl flex justify-between items-center border border-gray-150/60 dark:border-slate-800 text-xs gap-3">
            <div className="space-y-0.5 text-right flex-1 min-w-0">
              <span className="text-[8px] sm:text-[9px] text-brand-gold font-extrabold block">الملف المطلوب تفعيله:</span>
              <p className="font-black text-brand-dark dark:text-white text-[11px] sm:text-[13px] truncate leading-tight">{item.name}</p>
            </div>
            <div className="text-left shrink-0 bg-white dark:bg-slate-800 py-1.5 px-3 rounded-lg border border-gray-100 dark:border-slate-700">
              <span className="text-[8px] sm:text-[9px] text-gray-400 font-bold block text-center">القيمة الإجمالية:</span>
              <span className="font-sans font-black text-xs sm:text-sm text-brand-gold block">{item.price} RUB</span>
            </div>
          </div>

          {/* Payment Account Credentials */}
          <div className="bg-gradient-to-l from-brand-blue/5 to-white dark:from-slate-805 dark:to-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-brand-blue/15 space-y-3">
            
            {/* Account card container */}
            <div className="flex flex-row items-center justify-between gap-2.5 bg-white dark:bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-gray-150/80 dark:border-slate-800">
              <div className="text-right flex-1 min-w-0">
                <span className="text-[7.5px] sm:text-[8px] text-gray-400 font-bold block">رقم بطاقة الدفع (Sberbank / T-Bank):</span>
                <span className="font-sans font-black text-xs sm:text-sm text-brand-blue select-all tracking-wider block truncate mt-0.5">220010500228419</span>
              </div>
              
              <button
                type="button"
                onClick={handleCopyCard}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-brand-blue hover:bg-blue-700 text-white rounded-lg text-[9px] sm:text-[10px] font-black flex items-center gap-1 cursor-pointer transition shadow-xs whitespace-nowrap shrink-0"
              >
                {copiedCard ? <Check size={10} className="stroke-white" /> : <Copy size={10} className="stroke-white" />}
                <span>{copiedCard ? 'تم النسخ!' : 'نسخ البطاقة'}</span>
              </button>
            </div>

            {/* QR Code and Instructions representation */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-xl border border-gray-150 shrink-0">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=220010500228419"
                  alt="Payment QR Code 220010500228419"
                  className="w-14 h-14 sm:w-20 sm:h-20"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-0.5 sm:space-y-1 text-[#444444] dark:text-gray-300 text-right flex-1">
                <p className="text-[9px] sm:text-[10px] font-black flex items-center justify-end gap-1 text-brand-blue">
                  <QrCode size={11} />
                  <span>امسح الـ QR أو انسخ رقم البطاقة مباشرة</span>
                </p>
                <p className="text-[8px] sm:text-[9px] font-bold leading-normal text-gray-400">
                  يمكنك توجيه تطبيق البنك الروسي الخاص بك (Tinkoff, Sberbank) إلى رمز الاستجابة السريع للاتصال مباشرة برقم بطاقة الدفع وإتمام التحويل بطريقة يدوية سلسة.
                </p>
              </div>
            </div>

          </div>

          {/* Form Fields for submission */}
          <form onSubmit={handleSubmit} id="purchase-notification-form" className="space-y-2.5 text-right">
            
            <div className="space-y-0.5 sm:space-y-1">
              <label className="text-[9px] sm:text-[10px] font-extrabold text-gray-700 dark:text-gray-300 block">
                اسم المرسل المحوّل ثلاثياً (دقيق كما يظهر في إيصال البنك) *
              </label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="مثال: أحمد عبد الله الـ..."
                className="w-full p-2 text-[11px] sm:text-xs rounded-lg sm:rounded-xl border border-gray-150 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white font-heavy focus:border-brand-gold outline-hidden focus:ring-1 focus:ring-brand-gold transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-0.5 sm:space-y-1">
                <label className="text-[9px] sm:text-[10px] font-extrabold text-gray-700 dark:text-gray-300 block">
                  حساب التليجرام الخاص بك (ضروري للتواصل)
                </label>
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="@YourUsername"
                  className="w-full p-2 text-[11px] sm:text-xs rounded-lg sm:rounded-xl border border-gray-250 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white font-sans focus:border-brand-gold outline-hidden transition-colors"
                />
              </div>
              
              <div className="space-y-0.5 sm:space-y-1">
                <label className="text-[9px] sm:text-[10px] font-extrabold text-gray-700 dark:text-gray-300 block">
                  ملاحظات التحويل (اختياري)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="مثال: باقة الفيزياء كاملة"
                  className="w-full p-2 text-[11px] sm:text-xs rounded-lg sm:rounded-xl border border-gray-250 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white font-heavy focus:border-brand-gold outline-hidden transition-colors"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Modal Actions Footer */}
        <div className="border-t border-gray-100 dark:border-slate-800 pt-3 mt-1 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-250 text-gray-600 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition cursor-pointer dark:bg-slate-800 dark:text-slate-300"
          >
            إلغاء
          </button>
          
          <button
            type="submit"
            form="purchase-notification-form"
            disabled={submitting}
            className="flex-[2] py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <RefreshCw size={11} className="animate-spin text-white" />
                <span>جاري إرسال الإشعار...</span>
              </>
            ) : (
              <>
                <Send size={11} className="text-white" />
                <span>أرسلت الدفع ✓ تأكيد الطلب</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
