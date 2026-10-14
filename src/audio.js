
/* ==========================================================
   Snake - Audio Manager
   ========================================================== */

// Audio assets are stored in public/audio.
// Vite's BASE_URL ensures compatibility with GitHub Pages.

const AUDIO_PATH = `${import.meta.env.BASE_URL}audio/`;

const MUTE_STORAGE_KEY = 'snake-audio-muted';

// Sound effects available to the game.
const SOUND_FILES = {
  start: 'start',
  eat: 'eat',
  pause: 'pause',
  resume: 'resume',
  collision: 'collision',
  gameOver: 'game-over',
  highScore: 'high-score',
  victory: 'victory'
};

// Individual sound volume adjustments.
const SOUND_VOLUMES = {
  start: 0.45,
  eat: 0.5,
  pause: 0.35,
  resume: 0.35,
  collision: 0.55,
  gameOver: 0.55,
  highScore: 0.55,
  victory: 0.6
};

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

  // --------------------------------------------------------
  // Audio Format Detection
  // --------------------------------------------------------

  const formatTester = document.createElement('audio');

  const supportsOgg = formatTester.canPlayType(
    'audio/ogg; codecs="vorbis"'
  ) !== '';

  const extension = supportsOgg ? 'ogg' : 'mp3';

  // --------------------------------------------------------
  // Sound Loading
  // --------------------------------------------------------

  const sounds = {};

  for (const [name, filename] of Object.entries(SOUND_FILES)) {
    const audio = new Audio(
      `${AUDIO_PATH}${filename}.${extension}`
    );

    audio.preload = 'auto';

    sounds[name] = audio;
  }

  // --------------------------------------------------------
  // Active Sound Tracking
  // --------------------------------------------------------

  // Keep track of currently playing audio so the mute
  // button can stop sounds immediately.
  const activeSounds = new Set();

  function stopAll() {
    for (const sound of activeSounds) {
      sound.pause();
      sound.currentTime = 0;
    }

    activeSounds.clear();
  }

  // --------------------------------------------------------
  // Sound Playback
  // --------------------------------------------------------

  function play(name) {
    if (muted) return;

    const source = sounds[name];

    if (!source) {
      console.warn(`Unknown sound: ${name}`);
      return;
    }

    // Clone the audio element to allow overlapping effects.
    const sound = source.cloneNode(true);

    sound.volume = SOUND_VOLUMES[name] ?? 0.5;

    // Track this sound until playback finishes.
    activeSounds.add(sound);

    function cleanup() {
      activeSounds.delete(sound);

      sound.removeEventListener('ended', cleanup);
      sound.removeEventListener('error', cleanup);
    }

    sound.addEventListener('ended', cleanup);
    sound.addEventListener('error', cleanup);

    // Browsers may block audio until user interaction.
    const playPromise = sound.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Playback was blocked or interrupted.
        cleanup();
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

    // Immediately stop anything already playing.
    if (muted) {
      stopAll();
    }

    try {
      localStorage.setItem(
        MUTE_STORAGE_KEY,
        String(muted)
      );
    } catch {
      // The preference remains active for this session.
    }
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  return {
    play,
    stopAll,
    isMuted,
    setMuted,
    toggleMute
  };
}
