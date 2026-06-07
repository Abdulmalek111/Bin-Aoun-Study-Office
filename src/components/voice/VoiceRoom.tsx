import React from 'react';
import LiveKitVoiceRoom from './LiveKitVoiceRoom';
import { VoiceRoom as VoiceRoomType } from '../../types/voice';

interface VoiceRoomProps {
  room: VoiceRoomType;
  isCurrentUserAdmin: boolean;
  onExitRoom: () => void;
}

export default function VoiceRoom(props: VoiceRoomProps) {
  return <LiveKitVoiceRoom {...props} />;
}
