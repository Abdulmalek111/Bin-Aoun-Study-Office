import React from 'react';
import { VoiceMember } from '../../types/voice';
import { MicOff, VolumeX, Hand, ShieldAlert, Ban, Gavel } from 'lucide-react';
import { auth } from '../../lib/firebase';

interface VoiceUserListProps {
  members: VoiceMember[];
  ownerId: string;
  isCurrentUserAdmin: boolean;
  onKickMember: (targetSocketId: string) => void;
  onBanMember: (uid: string, targetSocketId: string) => void;
}

export default function VoiceUserList({
  members,
  ownerId,
  isCurrentUserAdmin,
  onKickMember,
  onBanMember
}: VoiceUserListProps) {
  
  const currentUid = auth.currentUser?.uid;

  // Render role badges matching scholastic system theme
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] font-black px-2 py-0.5 rounded-full select-none shrink-0">
            مشرف المنصة 👑
          </span>
        );
      case 'teacher':
        return (
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-black px-2 py-0.5 rounded-full select-none shrink-0">
            أستاذ المادة 📚
          </span>
        );
      case 'moderator':
        return (
          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[9px] font-black px-2 py-0.5 rounded-full select-none shrink-0">
            مراقب الغرفة 🛡️
          </span>
        );
      default:
        return (
          <span className="bg-brand-blue/10 text-brand-gold border border-brand-gold/20 text-[9px] font-bold px-2 py-0.5 rounded-full select-none shrink-0">
            دارِس 🎓
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2 select-none">
        <h4 className="font-extrabold text-xs text-brand-dark leading-none">مستمعين متواجدين حالياً ({members.length})</h4>
        <span className="text-[10px] text-gray-400 font-bold font-mono">Live Mesh Queue</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((member) => {
          const isSelf = member.uid === currentUid;
          const isOwner = member.uid === ownerId;
          const showModeratorPowers = (isCurrentUserAdmin || currentUid === ownerId) && !isSelf && member.role !== 'admin';

          return (
            <div
              key={member.socketId || member.uid}
              className={`p-3 rounded-2xl border transition-all duration-300 relative flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 group ${
                member.isSpeaking && !member.isMuted
                  ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/5'
                  : 'border-gray-100'
              }`}
            >
              
              {/* User Profile Left Area */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Glowing speaking ring wrapping photo */}
                <div className="relative shrink-0">
                  <div className={`absolute -inset-1 rounded-full opacity-0 blur-[3px] transition-all duration-300 ${
                    member.isSpeaking && !member.isMuted 
                      ? 'bg-emerald-400 opacity-80 animate-pulse' 
                      : ''
                  }`} />
                  <img
                    src={member.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.displayName || 'Stud')}`}
                    alt={member.displayName}
                    className={`relative w-10 h-10 rounded-full object-cover border bg-white ${
                      member.isSpeaking && !member.isMuted
                        ? 'border-emerald-500 scale-95'
                        : 'border-gray-200'
                    }`}
                    referrerPolicy="referrer"
                  />
                  
                  {/* Speaking micro soundwave particles indicators */}
                  {member.isSpeaking && !member.isMuted && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-white animate-bounce flex gap-0.5 items-end justify-center w-4 h-4">
                      <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      <span className="w-0.5 h-2.5 bg-white rounded-full animate-pulse delay-75"></span>
                      <span className="w-0.5 h-1 bg-white rounded-full animate-pulse delay-100"></span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex flex-col text-right">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-extrabold text-xs truncate text-brand-dark">
                      {member.displayName}
                      {isSelf && <span className="text-[10px] text-gray-400 font-normal mr-1 select-none">(أنت)</span>}
                    </span>
                    {isOwner && (
                      <span className="text-[10px]" title="مؤسس الغرفة الصوتية">👑</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {renderRoleBadge(member.role)}
                    
                    {/* Tiny responsive mute/deafen status icons */}
                    <div className="flex gap-1">
                      {member.isMuted && (
                        <MicOff size={11} className="text-red-400" title="مكتوم الصوت" />
                      )}
                      {member.isDeafened && (
                        <VolumeX size={11} className="text-red-400" title="معطل السماع لتجنب الضوضاء" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Icons Right area (Hand Raises and Moderation) */}
              <div className="flex items-center gap-2">
                {/* Hand raise alert */}
                {member.handRaised && (
                  <div className="bg-brand-gold/15 text-brand-gold rounded-full p-2 animate-bounce border border-brand-gold/10" title="طلب الحديث">
                    <Hand size={14} fill="currentColor" />
                  </div>
                )}

                {/* Moderation Dropdown tools hovered only for owners/admins */}
                {showModeratorPowers && (
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Kick */}
                    <button
                      onClick={() => onKickMember(member.socketId)}
                      className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-lg border border-amber-500/10 transition-colors cursor-pointer"
                      title="طرد مستخدم مؤقتاً"
                    >
                      <ShieldAlert size={12} />
                    </button>
                    {/* Ban */}
                    <button
                      onClick={() => onBanMember(member.uid, member.socketId)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg border border-red-500/10 transition-colors cursor-pointer"
                      title="حظر مستخدم نهائياً"
                    >
                      <Ban size={12} />
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
