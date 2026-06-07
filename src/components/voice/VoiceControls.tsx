import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Hand, Activity, CheckCircle } from 'lucide-react';

interface VoiceControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  handRaised: boolean;
  isSpeaking: boolean;
  connectionState: 'connected' | 'connecting' | 'idle';
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleHandRaise: () => void;
  onDisconnect: () => void;
}

export default function VoiceControls({
  isMuted,
  isDeafened,
  handRaised,
  isSpeaking,
  connectionState,
  onToggleMute,
  onToggleDeafen,
  onToggleHandRaise,
  onDisconnect
}: VoiceControlsProps) {
  return (
    <div className="w-full bg-brand-dark border border-white/5 shadow-xl rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between z-10 transition-all duration-300">
      
      {/* 1. Connection Diagnostic Status Left-Rail */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-3 w-3">
          {connectionState === 'connected' ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </>
          ) : connectionState === 'connecting' ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 animate-spin"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
          )}
        </div>
        
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold leading-none">مستوى الاتصال الصوتي</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs select-none">
            {connectionState === 'connected' ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-1 text-[11px]">
                <CheckCircle size={10} />
                Agora Voice Connected (متصل صوتياً)
              </span>
            ) : connectionState === 'connecting' ? (
              <span className="text-amber-400 font-bold animate-pulse">جاري الاتصال بـ Agora...</span>
            ) : (
              <span className="text-slate-500 font-medium font-mono text-[10px]">غير متصل / Offline</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Primary Control Deck */}
      <div className="flex items-center gap-3">
        
        {/* Toggle Microphone */}
        <button
          onClick={onToggleMute}
          disabled={connectionState === 'idle'}
          className={`relative p-3.5 rounded-full cursor-pointer transition-all duration-300 transform active:scale-95 flex items-center justify-center ${
            isMuted 
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold' 
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
          } ${isSpeaking && !isMuted ? 'ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-500/20' : ''}`}
          title={isMuted ? 'تم كتم الصوت - اضغط للتشغيل' : 'الميكروفون نشط - اضغط للكتم'}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          {isSpeaking && !isMuted && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border border-brand-dark" />
          )}
        </button>

        {/* Toggle Deafen */}
        <button
          onClick={onToggleDeafen}
          disabled={connectionState === 'idle'}
          className={`p-3.5 rounded-full cursor-pointer transition-all duration-300 transform active:scale-95 flex items-center justify-center ${
            isDeafened 
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold' 
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
          }`}
          title={isDeafened ? 'صوت المخرجات معطل - انقر للتفعيل' : 'انقر لتعطيل صوت الغرفة بالكامل'}
        >
          {isDeafened ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Raise Hand */}
        <button
          onClick={onToggleHandRaise}
          disabled={connectionState === 'idle'}
          className={`p-3.5 rounded-full cursor-pointer transition-all duration-300 transform active:scale-95 flex items-center justify-center ${
            handRaised 
              ? 'bg-brand-gold hover:bg-brand-gold-hover text-brand-dark shadow-md shadow-brand-gold/10 font-black' 
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
          }`}
          title={handRaised ? 'خفض اليد' : 'طلب دور للحديث'}
        >
          <Hand size={18} className={handRaised ? 'animate-bounce' : ''} />
        </button>

        {/* Separator */}
        <div className="w-px h-8 bg-white/10 mx-1"></div>

        {/* Disconnect Phone */}
        <button
          onClick={onDisconnect}
          disabled={connectionState === 'idle'}
          className="p-3.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-full cursor-pointer shadow-lg shadow-red-600/20 transition-all duration-300 transform active:scale-95 flex items-center justify-center"
          title="مغادرة الغرفة الصوتية"
        >
          <PhoneOff size={18} />
        </button>
      </div>

      {/* 3. Stream Quality Status metrics Right-Rail */}
      <div className="hidden md:flex items-center gap-2 font-mono text-[9px] text-slate-400 border-r border-white/10 pr-4 select-none">
        <Activity size={12} className="text-brand-gold/80" />
        <span className="font-sans font-bold text-slate-300">ترميز الصوت:</span>
        <span>OPUS High-Fidelity</span>
        <span>|</span>
        <span>48kHz Stereo</span>
      </div>

    </div>
  );
}
