import { usePreferencesStore } from '../stores/preferencesStore';
import { playSound, SoundType } from '../utils/sounds';

export function useSound() {
  const {
    playSounds,
    playChatSound,
    playFileTransferCompleteSound,
    playPrivateMessageSound,
    playJoinSound,
    playLeaveSound,
    playLoggedInSound,
    playErrorSound,
    playServerMessageSound,
    playNewNewsSound,
  } = usePreferencesStore();

  const playSoundIfEnabled = (soundType: SoundType, enabled: boolean) => {
    if (playSounds && enabled) {
      playSound(soundType);
    }
  };

  return {
    playChatSound: () => playSoundIfEnabled('chat-message', playChatSound),
    playFileTransferCompleteSound: () => playSoundIfEnabled('transfer-complete', playFileTransferCompleteSound),
    playPrivateMessageSound: () => playSoundIfEnabled('chat-message', playPrivateMessageSound), // Use chat sound for private messages
    playJoinSound: () => playSoundIfEnabled('user-login', playJoinSound),
    playLeaveSound: () => playSoundIfEnabled('user-logout', playLeaveSound),
    playLoggedInSound: () => playSoundIfEnabled('logged-in', playLoggedInSound),
    playErrorSound: () => playSoundIfEnabled('error', playErrorSound),
    playServerMessageSound: () => playSoundIfEnabled('server-message', playServerMessageSound),
    playNewNewsSound: () => playSoundIfEnabled('new-news', playNewNewsSound),
  };
}

