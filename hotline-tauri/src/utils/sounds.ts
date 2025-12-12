// Sound playback utility

export type SoundType =
  | 'chat-message'
  | 'error'
  | 'logged-in'
  | 'new-news'
  | 'server-message'
  | 'transfer-complete'
  | 'user-login'
  | 'user-logout';

const soundCache: Map<SoundType, HTMLAudioElement> = new Map();

// Preload sounds
export function preloadSounds() {
  const soundTypes: SoundType[] = [
    'chat-message',
    'error',
    'logged-in',
    'new-news',
    'server-message',
    'transfer-complete',
    'user-login',
    'user-logout',
  ];

  soundTypes.forEach((soundType) => {
    const audio = new Audio(`/sounds/${soundType}.aiff`);
    audio.volume = 0.75; // Match Swift app volume
    audio.preload = 'auto';
    soundCache.set(soundType, audio);
  });
}

// Play a sound effect
export function playSound(soundType: SoundType) {
  const audio = soundCache.get(soundType);
  if (audio) {
    // Reset to beginning if already playing
    audio.currentTime = 0;
    audio.play().catch((error) => {
      // Silently fail if sound can't play (e.g., user interaction required)
      console.debug('Failed to play sound:', error);
    });
  }
}

// Preload on module load
if (typeof window !== 'undefined') {
  preloadSounds();
}

