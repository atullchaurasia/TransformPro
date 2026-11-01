// Haptics + optional sound on a check-in result (spec §10.4). Every native call is wrapped:
// a missing capability (simulator, Expo Go quirk) must never break check-in (§2).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import { logger } from '@/utils/logger';

export type FeedbackKind = 'ok' | 'warning' | 'blocked';

const SOUNDS = {
  ok: require('../../assets/sounds/checkin-ok.wav') as number,
  blocked: require('../../assets/sounds/checkin-blocked.wav') as number,
};

let players: { ok: AudioPlayer; blocked: AudioPlayer } | null = null;

function getPlayers() {
  if (!players) {
    // The front desk may have the iPhone on silent — then it stays silent.
    void setAudioModeAsync({ playsInSilentMode: false }).catch((e: unknown) => logger.warn('Audio mode failed', e));
    players = { ok: createAudioPlayer(SOUNDS.ok), blocked: createAudioPlayer(SOUNDS.blocked) };
  }
  return players;
}

export async function checkinFeedback(kind: FeedbackKind, withSound: boolean): Promise<void> {
  try {
    const type =
      kind === 'ok' ? Haptics.NotificationFeedbackType.Success : kind === 'warning' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error;
    await Haptics.notificationAsync(type);
  } catch (e) {
    logger.warn('Haptics failed', e);
  }
  if (!withSound) return;
  try {
    const player = getPlayers()[kind === 'blocked' ? 'blocked' : 'ok'];
    await player.seekTo(0);
    player.play();
  } catch (e) {
    logger.warn('Check-in sound failed', e);
  }
}
