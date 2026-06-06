export interface VoiceRoom {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  ownerId: string;
  maxUsers: number;
  isLocked: boolean;
  allowedRoles: string[]; // e.g. ['admin', 'moderator', 'teacher', 'student']
  createdAt: string;
  updatedAt: string;
}

export interface VoiceMember {
  uid: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'moderator' | 'teacher' | 'student';
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  joinedAt: string;
  lastSeen: string;
  socketId: string;
}

export interface VoiceBan {
  uid: string;
  bannedBy: string;
  reason: string;
  createdAt: string;
}

export interface VoiceEvent {
  type: string;
  uid: string;
  targetUid?: string;
  createdAt: string;
  metadata?: any;
}
