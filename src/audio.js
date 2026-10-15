
/* ==========================================================
   Snake - Audio Manager

   Responsible for:
   - Loading sound effects using HTML5 Audio
   - Playing overlapping sound effects
   - Supporting iPhone Safari and desktop browsers
   - Managing mute state and saved preferences
   - Prioritizing important gameplay sounds

   Audio files are stored in public/audio/.
   ========================================================== */

// Vite's BASE_URL supports local development and GitHub Pages.
const AUDIO_PATH = `${import.meta.env.BASE_URL}audio/`;

const MUTE_STORAGE_KEY = 'snake-audio-muted';

// ----------------------------------------------------------
// Audio Configuration
// ----------------------------------------------------------

const SOUND_FILES = Object.freeze({
  start: 'start',
  eat: 'eat',
  pause: 'pause',
  resume: 'pause',
  collision: 'collision',
  gameOver: 'game-over',
  highScore: 'high-score'
});

const SOUND_VOLUMES = Object.freeze({
  start: 0.45,
  eat: 0.50,
  pause: 0.35,
  resume: 0.35,
  collision: 0.55,
  gameOver: 0.55,
  highScore: 0.55
});

const MAX_SIMULTANEOUS_SOUNDS = 4;

const PRIORITY_SOUNDS = new Set([
  'collision',
  'gameOver',
  'highScore'
]);

// ----------------------------------------------------------
// Audio Manager
// ----------------------------------------------------------

export function createAudioManager() {

  // --------------------------------------------------------
  // Mute Preference
  // --------------------------------------------------------

  function loadMutedPreference() {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  let muted = loadMutedPreference();

  function saveMutedPreference() {
    try {
      localStorage.setItem(
        MUTE_STORAGE_KEY,
        String(muted)
      );
    } catch {
      // Preference remains active for this session.
    }
  }

  // --------------------------------------------------------
  // Sound Loading
  // --------------------------------------------------------

  const sounds = new Map();

  for (const [name, filename] of Object.entries(SOUND_FILES)) {
    const audio = new Audio(
      `${AUDIO_PATH}${filename}.mp3`
    );

    audio.preload = 'auto';
    audio.volume = SOUND_VOLUMES[name] ?? 0.5;

    sounds.set(name, audio);
  }

  // --------------------------------------------------------
  // Active Sound Tracking
  // --------------------------------------------------------

  const activeSounds = new Set();

  function stopAll() {
    for (const audio of activeSounds) {
      audio.pause();
      audio.currentTime = 0;
    }

    activeSounds.clear();
  }

  // --------------------------------------------------------
  // Mobile Audio Activation
  // --------------------------------------------------------

  function unlockAudio() {
    if (muted) return;

    // HTML5 Audio does not require an AudioContext.
    // Actual playback is initiated by the game after
    // the user's first interaction.
    //
    // Keep this method for compatibility with input.js.
  }

  // --------------------------------------------------------
  // Sound Playback
  // --------------------------------------------------------

  function play(name) {
    if (muted) return;

    const original = sounds.get(name);

    if (!original) {
      console.warn(`Unknown Snake sound: ${name}`);
      return;
    }

    const isPriority = PRIORITY_SOUNDS.has(name);

    if (isPriority) {
      stopAll();
    } else if (
      activeSounds.size >= MAX_SIMULTANEOUS_SOUNDS
    ) {
      return;
    }

    // Clone the audio element to allow overlapping
    // instances of the same sound.
    const audio = original.cloneNode(true);

    audio.volume = SOUND_VOLUMES[name] ?? 0.5;

    // Resume uses the pause sound at a lower pitch.
    audio.playbackRate = name === 'resume' ? 0.85 : 1;

    // Track active sounds for mute and cleanup.
    activeSounds.add(audio);

    const cleanup = () => {
      activeSounds.delete(audio);
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', cleanup);
    };

    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);

    const playPromise = audio.play();

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(error => {
        cleanup();

        // Autoplay restrictions can reject playback
        // before the first user interaction.
        if (error.name !== 'NotAllowedError') {
          console.warn(
            `Audio playback failed: ${name}`,
            error
          );
        }
      });
    }
  }

  // --------------------------------------------------------
  // Mute Controls
  // --------------------------------------------------------

  function isMuted() {
    return muted;
  }

  function setMuted(value) {
    muted = Boolean(value);

    if (muted) {
      stopAll();
    } else {
      unlockAudio();
    }

    saveMutedPreference();

    return muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  // --------------------------------------------------------
  // Public Interface
  // --------------------------------------------------------

  return {
    play,
    stopAll,
    isMuted,
    setMuted,
    toggleMute,
    unlockAudio
  };
}
