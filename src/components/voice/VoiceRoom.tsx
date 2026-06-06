import React, { useEffect } from 'react';
import { VoiceRoom as VoiceRoomType } from '../../types/voice';
import { useVoiceRoom } from '../../hooks/useVoiceRoom';
import VoiceUserList from './VoiceUserList';
import VoiceControls from './VoiceControls';
import { Shield, Lock, Unlock, HelpCircle, AlertCircle } from 'lucide-react';

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
    banMember
  } = useVoiceRoom(room.id);

  // Auto-connect on mounting
  useEffect(() => {
    if (room && !joined) {
      joinRoom(room);
    }
  }, [room, joined, joinRoom]);

  const handleDisconnect = () => {
    leaveRoom();
    onExitRoom();
  };

  return (
    <div className="w-full flex flex-col gap-6 select-none bg-white min-h-[500px]">
      
      {/* 1. Header Information of Joined Room */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-gray-100 pb-4">
        
        <div className="text-right space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-lg md:text-xl text-brand-dark leading-tight flex items-center gap-2">
              حلقة النقاش الصوتي: <span className="text-brand-blue font-extrabold">{room.name}</span>
            </h3>
            {room.isLocked ? (
              <Lock size={16} className="text-amber-500 fill-amber-500/10" title="مغلقة بكلمة سر أو كلياً" />
            ) : (
              <Unlock size={16} className="text-emerald-500" title="متاحة للمشاركة العامة" />
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{room.description}</p>
        </div>

        {/* Exit Button fallback indicator */}
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap self-stretch md:self-auto text-center"
        >
          خروج للرئيسية
        </button>
      </div>

      {/* 2. Error Prompt Block */}
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
            <h4 className="font-black text-sm text-brand-dark text-center leading-tight">جاري تهيئة قناة الاتصال الصوتي...</h4>
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
          
          {/* Quick interactive scholastic tips */}
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
