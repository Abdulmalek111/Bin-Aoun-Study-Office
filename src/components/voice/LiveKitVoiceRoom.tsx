import React, { useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { VoiceRoom as VoiceRoomType } from '../../types/voice';
import { useLiveKitVoiceRoom } from '../../hooks/useLiveKitVoiceRoom';
import VoiceUserList from './VoiceUserList';
import VoiceControls from './VoiceControls';
import { Shield, Lock, Unlock, HelpCircle, AlertCircle, Terminal, Radio } from 'lucide-react';
import '@livekit/components-styles';

interface LiveKitVoiceRoomProps {
  room: VoiceRoomType;
  isCurrentUserAdmin: boolean;
  onExitRoom: () => void;
}

export default function LiveKitVoiceRoom({
  room,
  isCurrentUserAdmin,
  onExitRoom
}: LiveKitVoiceRoomProps) {
  
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  // Use the brand new LiveKit voice room hook
  const {
    joined,
    members,
    isMuted,
    isDeafened,
    handRaised,
    isSpeaking,
    loading,
    error,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleDeafen,
    toggleHandRaise,
    kickMember,
    banMember,
    
    // Diagnostics indicators
    socketStatus,
    socketId,
    connectedPeers,
    firestoreStatus,
    webrtcStatus,
    microphoneStatus,
    autoplayBlocked,
    resumeAudioPlayback,

    liveKitToken,
    liveKitUrl,

    tokenDiagnostics,
    roomInstance
  } = useLiveKitVoiceRoom(room.id);

  // Auto-connect room on mount
  useEffect(() => {
    if (room && !joined) {
      joinRoom(room);
    }
  }, [room, joined, joinRoom]);

  const handleResetConnection = () => {
    leaveRoom();
    setTimeout(() => {
      joinRoom(room);
    }, 600);
  };

  const handleDisconnect = () => {
    leaveRoom();
    onExitRoom();
  };

  return (
    <div className="w-full flex flex-col gap-6 select-none bg-white min-h-[500px]" id="livekit-voice-room-container">
      
      {/* 1. Header with joined room metadata */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-gray-100 pb-4" id="livekit-voice-room-header">
        <div className="text-right space-y-1">
          <div className="flex items-center gap-2 text-right">
            <h3 className="font-black text-lg md:text-xl text-brand-dark leading-tight flex items-center gap-2">
              حلقة النقاش الصوتي (LiveKit): <span className="text-[#C59C4B] font-extrabold">{room.name}</span>
            </h3>
            {room.isLocked ? (
              <span title="مغلقة بكلمة سر"><Lock size={16} className="text-amber-500 fill-amber-500/10" /></span>
            ) : (
              <span title="متاحة للمشاركة العامة"><Unlock size={16} className="text-emerald-500" /></span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed text-right">{room.description}</p>
        </div>

        <button
          id="exit-livekit-room-btn"
          onClick={handleDisconnect}
          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap self-stretch md:self-auto text-center font-bold"
        >
          خروج للرئيسية
        </button>
      </div>

      {/* 2. Brand New LiveKit Status Panel (Trace elements) */}
      <div className="bg-gray-50/55 border border-gray-100 rounded-[24px] p-4 flex flex-col gap-3 select-none text-right" id="livekit-diagnostics-panel">
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="flex justify-between items-center w-full focus:outline-none"
        >
          <div className="flex items-center gap-2 text-brand-dark">
            <Terminal size={14} className="text-violet-600" />
            <h4 className="font-extrabold text-xs">لوحة تتبع وتشخيص LiveKit الصوتية (LiveKit Status Panel)</h4>
          </div>
          <span className="text-[10px] text-violet-700 font-black bg-violet-500/5 border border-violet-500/10 px-2.5 py-1 rounded-full hover:bg-violet-500/10 transition-all font-mono">
            {showDiagnostics ? 'إخفاء لوحة التتبع ▴' : 'عرض لوحة التتبع ▾'}
          </span>
        </button>

        {showDiagnostics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-150/60 animate-fade-in text-[10px] text-right">
            
            {/* LiveKit URL existence check */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">الرابط متوفر (LiveKit URL exists)</span>
              <span className={`font-black px-2 py-0.5 rounded-md self-start text-[9px] ${tokenDiagnostics?.liveKitUrlExists ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 animate-pulse'}`}>
                {tokenDiagnostics?.liveKitUrlExists ? 'نعم (متوفر)' : 'لا (مفقود ⚠️)'}
              </span>
            </div>

            {/* Token API request status */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">طلب التوكن (Token API status)</span>
              <span className={`font-black px-2 py-0.5 rounded-md self-start text-[9px] ${
                tokenDiagnostics?.apiStatus === 'success' ? 'bg-emerald-50 text-emerald-600' :
                tokenDiagnostics?.apiStatus === 'fetching' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                'bg-gray-50 text-gray-500'
              }`}>
                {tokenDiagnostics?.apiStatus === 'success' ? 'ناجح / Success' :
                 tokenDiagnostics?.apiStatus === 'fetching' ? 'جاري الطلب...' : 'خامل / Idle'}
              </span>
            </div>

            {/* Token reception confirmation */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">استلام التوكن (Token received)</span>
              <span className={`font-black px-2 py-0.5 rounded-md self-start text-[9px] ${tokenDiagnostics?.tokenReceived ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-55 bg-gray-100 text-gray-400'}`}>
                {tokenDiagnostics?.tokenReceived ? 'نعم / True' : 'لا / False'}
              </span>
            </div>

            {/* Room Connection indicators */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">اتصال الغرفة (Room connected)</span>
              <span className={`font-black px-2 py-0.5 rounded-md self-start text-[9px] ${tokenDiagnostics?.roomConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                {tokenDiagnostics?.roomConnected ? 'متصل / Connected' : 'غير متصل / Offline'}
              </span>
            </div>

            {/* Local mic audio publish enabled state */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">نشر الصوت المحلي (Local audio)</span>
              <span className={`font-black px-2 py-0.5 rounded-md self-start text-[9px] ${tokenDiagnostics?.localAudioEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-700'}`}>
                {tokenDiagnostics?.localAudioEnabled ? 'نشط / Enabled' : 'مكتوم أو متوقف'}
              </span>
            </div>

            {/* Remote participants count */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">المستمعين (Remote count)</span>
              <span className="font-extrabold text-violet-600 text-xs self-start">
                {tokenDiagnostics?.remoteParticipantsCount} مستخدمين متصلين
              </span>
            </div>

            {/* Audio Renderer active trigger state */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">مكبر الصوت (Audio renderer)</span>
              <span className={`font-black px-2 py-0.5 rounded-md self-start text-[9px] ${tokenDiagnostics?.audioRendererActive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {tokenDiagnostics?.audioRendererActive ? 'نشط تلقائي / Active' : 'معطل'}
              </span>
            </div>

            {/* UID and General diagnostics reset */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">معرف UID الخاص بي</span>
              <span className="font-mono text-[9px] text-gray-700 truncate" dir="ltr">
                {socketId || 'Loading...'}
              </span>
            </div>

            {tokenDiagnostics?.lastError && (
              <div className="col-span-full bg-rose-50 border border-rose-100 rounded-xl p-3 text-[10px] text-rose-700 font-bold text-right space-y-1">
                <span className="text-rose-800 font-black block">تفاصيل آخر خطأ تتبع (Last Error):</span>
                <p className="font-mono text-[9px] text-left" dir="ltr">{tokenDiagnostics.lastError}</p>
              </div>
            )}

            <div className="col-span-full flex justify-end gap-2 mt-1">
              <button
                id="reset-livekit-connection-btn"
                onClick={handleResetConnection}
                className="px-4 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-100 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer font-bold"
              >
                إعادة تهيئة شبكة الصوت (Reset Connection) 🔄
              </button>
            </div>

          </div>
        )}
      </div>

      {/* 3. Browser Autoplay blocker prompt */}
      {autoplayBlocked && (
        <div className="bg-amber-500/10 text-amber-700 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 text-right text-xs items-start sm:items-center justify-between leading-relaxed animate-fade-in shadow-sm" id="autoplay-blocker-banner">
          <div className="flex gap-3 items-center">
            <Radio className="shrink-0 text-amber-500 animate-pulse" size={18} />
            <div>
              <p className="font-extrabold pb-0.5 text-amber-800">صوت الغرفة محجوب من المتصفح (Autoplay Blocked):</p>
              <p className="font-medium text-[11px] leading-relaxed">المتصفح يمنع تشغيل الصوت تلفائياً بدون تفاعل منك. يرجى الضغط على زر تفعيل تشغيل الصوت لسماع جميع المتحدثين.</p>
            </div>
          </div>
          <button
            id="unblock-autoplay-btn"
            onClick={resumeAudioPlayback}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white border border-amber-500/10 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap text-center font-bold"
          >
            تسمع الغرفة (تشغيل الصوت) 🔊
          </button>
        </div>
      )}

      {/* 4. Connection Error Alert */}
      {error && (
        <div className="bg-red-505 bg-red-50 text-red-500 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 text-right text-xs items-start sm:items-center justify-between leading-relaxed" id="livekit-error-container">
          <div className="flex gap-3 items-center">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <div>
              <p className="font-extrabold pb-0.5 text-red-700">خطأ في الاتصال الصوتي:</p>
              <p className="font-medium text-red-650">{error}</p>
            </div>
          </div>
          {!joined && !loading && (
            <button
              id="retry-livekit-room-btn"
              onClick={() => joinRoom(room)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap text-center animate-pulse"
            >
              إعادة المحاولة 🔄
            </button>
          )}
        </div>
      )}

      {/* 5. Loading Overlay status screen */}
      {loading && !joined && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4" id="livekit-loading-overlay">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin"></div>
            <Shield size={16} className="absolute inset-0 m-auto text-violet-600 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h4 className="font-black text-sm text-brand-dark text-center leading-tight">جاري تهيئة الاتصال والمنظومة الصوتية (LiveKit)...</h4>
            <p className="text-[10px] text-gray-400 font-bold font-mono">Authenticating and Subscribing WebRTC Stream</p>
          </div>
        </div>
      )}

      {/* 6. Inactive or connect failed manual bypass triggers */}
      {!joined && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-gray-200 rounded-3xl bg-gray-50/30" id="livekit-unconnected-stage">
          <AlertCircle size={32} className="text-violet-500/80" />
          <div className="text-center space-y-1">
            <h4 className="font-black text-sm text-brand-dark">لم يتم الاتصال بقناة الصوت (LiveKit)</h4>
            <p className="text-[10px] text-gray-400 font-bold">يرجى السماح بصلاحية الميكروفون وتأكيد الاتصال للانضمام للمحادثة.</p>
          </div>
          <button
            id="join-livekit-manual-btn"
            onClick={() => joinRoom(room)}
            className="px-6 py-2.5 bg-brand-dark hover:bg-violet-700 text-white rounded-xl text-xs font-black transition-all duration-300 transform active:scale-95 cursor-pointer shadow-md"
          >
            الانضمام للاتصال الصوتي المباشر 🎙️
          </button>
        </div>
      )}

      {/* 7. Active Joined Room Screen with LiveKit wrappers */}
      {joined && liveKitToken && liveKitUrl && roomInstance && (
        <LiveKitRoom
          room={roomInstance}
          token={liveKitToken}
          serverUrl={liveKitUrl}
          connect={true}
          audio={true}
          video={false}
        >
          {/* Audio Renderer for LiveKit multi-peer audios */}
          <RoomAudioRenderer />

          <div className="flex-grow flex flex-col gap-6 min-h-[300px]" id="livekit-active-interface">
            {/* Synchronized voice members grid */}
            <VoiceUserList
              members={members}
              ownerId={room.ownerId}
              isCurrentUserAdmin={isCurrentUserAdmin}
              onKickMember={kickMember}
              onBanMember={banMember}
            />

            {/* Quick tips panel */}
            <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 flex gap-3 items-center select-none mt-auto">
              <HelpCircle size={16} className="text-brand-gold/80 shrink-0" />
              <p className="text-[10px] md:text-xs text-gray-500 text-right leading-relaxed font-bold">
                <span className="text-brand-dark font-black">نصيحة تعليمية:</span> يرجى استخدام سماعات الرأس لضمان أفضل عزل وموثوقية، كما يمكن كتم ميكروفونك ورفع يدك لطلب إلقاء سؤال أو مشاركة دراسية.
              </p>
            </div>

            {/* Standard control interface buttons */}
            <VoiceControls
              isMuted={isMuted}
              isDeafened={isDeafened}
              handRaised={handRaised}
              isSpeaking={isSpeaking}
              connectionState={joined ? 'connected' : loading ? 'connecting' : 'idle'}
              onToggleMute={toggleMute}
              onToggleDeafen={toggleDeafen}
              onToggleHandRaise={toggleHandRaise}
              onDisconnect={handleDisconnect}
            />
          </div>
        </LiveKitRoom>
      )}

    </div>
  );
}
