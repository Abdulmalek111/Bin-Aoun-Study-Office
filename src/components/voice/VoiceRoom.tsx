import React, { useEffect, useState } from 'react';
import { VoiceRoom as VoiceRoomType } from '../../types/voice';
import { useVoiceRoom } from '../../hooks/useVoiceRoom';
import VoiceUserList from './VoiceUserList';
import VoiceControls from './VoiceControls';
import { Shield, Lock, Unlock, HelpCircle, AlertCircle, Terminal, Wifi, HardDrive, Radio } from 'lucide-react';

interface VoiceRoomProps {
  room: VoiceRoomType;
  isCurrentUserAdmin: boolean;
  onExitRoom: () => void;
}

export default function VoiceRoom({
  room,
  isCurrentUserAdmin,
  onExitRoom
}: VoiceRoomProps) {
  
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  // Custom Hook managing active connections
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
    peerSignalingStates,
    peerIceConnectionStates
  } = useVoiceRoom(room.id);

  // Auto-connect on mounting
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
    <div className="w-full flex flex-col gap-6 select-none bg-white min-h-[500px]">
      
      {/* 1. Header Information of Joined Room */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-gray-100 pb-4">
        
        <div className="text-right space-y-1">
          <div className="flex items-center gap-2 text-right">
            <h3 className="font-black text-lg md:text-xl text-brand-dark leading-tight flex items-center gap-2">
              حلقة النقاش الصوتي: <span className="text-brand-blue font-extrabold">{room.name}</span>
            </h3>
            {room.isLocked ? (
              <Lock size={16} className="text-amber-500 fill-amber-500/10" title="مغلقة بكلمة سر أو كلياً" />
            ) : (
              <Unlock size={16} className="text-emerald-500" title="متاحة للمشاركة العامة" />
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed text-right">{room.description}</p>
        </div>

        {/* Exit Button fallback indicator */}
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap self-stretch md:self-auto text-center font-bold"
        >
          خروج للرئيسية
        </button>
      </div>

      {/* 2. Diagnostics Dashboard */}
      <div className="bg-gray-50/55 border border-gray-100 rounded-[24px] p-4 flex flex-col gap-3 select-none text-right">
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="flex justify-between items-center w-full focus:outline-none"
        >
          <div className="flex items-center gap-2 text-brand-dark">
            <Terminal size={14} className="text-emerald-600" />
            <h4 className="font-extrabold text-xs">لوحة تشخيص وتكامل الأنظمة الحية (System Status Panel)</h4>
          </div>
          <span className="text-[10px] text-emerald-700 font-black bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-full hover:bg-emerald-500/10 transition-all font-mono">
            {showDiagnostics ? 'إخفاء اللوحة ▴' : 'عرض اللوحة ▾'}
          </span>
        </button>

        {showDiagnostics && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pt-2 border-t border-gray-150/60 animate-fade-in text-[10px] text-right">
            {/* Socket connection status with ping light */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm">
              <span className="text-gray-400 font-extrabold flex items-center gap-1 justify-end">
                Socket.IO
                <Wifi size={11} className="text-blue-500" />
              </span>
              <div className="flex items-center gap-2 justify-end">
                <span className="font-black text-brand-dark">
                  {socketStatus === 'connected' ? 'متصل' : socketStatus === 'connecting' ? 'جاري الاتصال' : 'غير متصل'}
                </span>
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                  socketStatus === 'connected' ? 'bg-emerald-500 animate-ping' : socketStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-400'
                }`}></span>
              </div>
            </div>

            {/* Socket Identifier ID */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm">
              <span className="text-gray-400 font-extrabold">مُعرّف السوكيت ID</span>
              <span className="font-black text-brand-dark font-mono truncate text-[9px] text-left leading-none" dir="ltr">
                {socketId || 'لا يوجد / N/A'}
              </span>
            </div>

            {/* Firestore synchronization status */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-405 font-extrabold flex items-center gap-1 justify-end">
                قاعدة البيانات
                <HardDrive size={11} className="text-emerald-500" />
              </span>
              <span className="font-black text-brand-dark truncate leading-none">
                {firestoreStatus}
              </span>
            </div>

            {/* WebRTC audio mesh connection */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm">
              <span className="text-gray-400 font-extrabold flex items-center gap-1 justify-end">
                صوت WebRTC P2P
                <Radio size={11} className="text-indigo-500" />
              </span>
              <span className={`font-black truncate ${connectedPeers.length > 0 ? 'text-emerald-600' : 'text-amber-500'} leading-none`}>
                {webrtcStatus}
              </span>
            </div>

            {/* Peer Connections Count */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm">
              <span className="text-gray-400 font-extrabold">عدد القرناء (Peers)</span>
              <span className="font-black font-mono text-brand-dark text-[11px]">
                {connectedPeers.length} متصلين
              </span>
            </div>

            {/* Audio microphone capture status */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm font-bold">
              <span className="text-gray-400 font-extrabold">صلاحية الميكروفون</span>
              <span className="font-black text-brand-dark leading-none">
                {microphoneStatus}
              </span>
            </div>
          </div>

          {connectedPeers.length > 0 && (
            <div className="mt-3 bg-white border border-gray-150 rounded-2xl p-4 flex flex-col gap-2">
              <span className="text-gray-400 font-extrabold text-[10px]">مسارات الربط المباشر النشطة (WebRTC Active P2P Links)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px] font-mono">
                {connectedPeers.map(peerId => {
                  const m = members.find(mbr => mbr.socketId === peerId);
                  const sigState = peerSignalingStates?.[peerId] || 'unknown';
                  const iceState = peerIceConnectionStates?.[peerId] || 'unknown';
                  return (
                    <div key={peerId} className="flex justify-between items-center bg-gray-50/70 border border-gray-100 rounded-xl p-2.5">
                      <span className="text-brand-dark font-black font-sans text-right">
                        {m ? m.displayName : `مجهول (${peerId.slice(0, 5)})`}
                      </span>
                      <div className="flex gap-2 items-center">
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                          signaling: {sigState}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          iceState === 'connected' || iceState === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          ice: {iceState}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleResetConnection}
              className="px-4 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer font-bold"
            >
              إعادة تهيئة الاتصال وحل الأخطاء (Reset Connection) 🔄
            </button>
          </div>
        </>
      )}
      </div>

      {/* 2.5 Error Prompt Block */}
      {error && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 text-right text-xs items-start sm:items-center justify-between leading-relaxed">
          <div className="flex gap-3 items-center">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <div>
              <p className="font-extrabold pb-0.5 text-red-700">خطأ في الاتصال الصوتي:</p>
              <p className="font-medium text-red-650">{error}</p>
            </div>
          </div>
          {!joined && !loading && (
            <button
              onClick={() => joinRoom(room)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap text-center animate-pulse"
            >
              إعادة المحاولة 🔄
            </button>
          )}
        </div>
      )}

      {/* 3. Loading Indicator Overlay */}
      {loading && !joined && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-brand-gold/20 border-t-brand-gold animate-spin"></div>
            <Shield size={16} className="absolute inset-0 m-auto text-brand-dark animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h4 className="font-black text-sm text-brand-dark text-center leading-tight">جاري تهيئة الاتصال والشبكة الصوتية...</h4>
            <p className="text-[10px] text-gray-400 font-bold font-mono">Connecting P2P WebRTC Signaling Sockets</p>
          </div>
        </div>
      )}

      {/* 3.5 Handlers when Not Joined and Not Loading */}
      {!joined && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-gray-200 rounded-3xl bg-gray-50/30">
          <AlertCircle size={32} className="text-red-500/80" />
          <div className="text-center space-y-1">
            <h4 className="font-black text-sm text-brand-dark">لم يتم الاتصال بقناة الصوت</h4>
            <p className="text-[10px] text-gray-400 font-bold">يرجى السماح بصلاحية الميكروفون وتأكيد الاتصال للانضمام للمحادثة.</p>
          </div>
          <button
            onClick={() => joinRoom(room)}
            className="px-6 py-2.5 bg-brand-dark hover:bg-brand-gold hover:text-brand-dark text-white rounded-xl text-xs font-black transition-all duration-300 transform active:scale-95 cursor-pointer shadow-md"
          >
            الانضمام للاتصال الصوتي المباشر 🎙️
          </button>
        </div>
      )}

      {/* 4. Active Members list Deck */}
      {joined && (
        <div className="flex-grow flex flex-col gap-6 min-h-[300px]">
          
          {/* User list grids */}
          <VoiceUserList
            members={members}
            ownerId={room.ownerId}
            isCurrentUserAdmin={isCurrentUserAdmin}
            onKickMember={kickMember}
            onBanMember={banMember}
          />
          
          {/* Quick scholastic tips */}
          <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 flex gap-3 items-center select-none mt-auto">
            <HelpCircle size={16} className="text-brand-gold/80 shrink-0" />
            <p className="text-[10px] md:text-xs text-gray-500 text-right leading-relaxed font-bold">
              <span className="text-brand-dark font-black">نصيحة تعليمية:</span> يرجى استخدام سماعات الرأس لضمان أفضل عزل وموثوقية، كما يمكن كتم ميكروفونك ورفع يدك لطلب إلقاء سؤال أو مشاركة دراسية.
            </p>
          </div>

          {/* 5. Bottom Fluid controls matching Discord style */}
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
      )}

    </div>
  );
}
