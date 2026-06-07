import { useLiveKitVoiceRoom } from './useLiveKitVoiceRoom';

export function useVoiceRoom(roomId: string | undefined) {
  return useLiveKitVoiceRoom(roomId);
}
