
/* ==========================================================
   Snake - Audio Manager

   Based on the working Minesweeper audio implementation.

   Responsible for:
   - Loading and decoding sound effects with Web Audio
   - Playing gameplay sound effects
   - Managing mute state and saved preferences
   - Supporting overlapping sounds
   - Handling mobile browser audio restrictions

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
  // Audio Context
  // --------------------------------------------------------

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  let context = null;

  function getContext() {
    if (!AudioContextClass) {
      return null;
    }

    if (!context) {
      context = new AudioContextClass();
    }

    return context;
  }

  // --------------------------------------------------------
  // Sound Loading
  // --------------------------------------------------------

  const buffers = new Map();
  const loading = new Map();

  async function loadSound(name) {
    if (buffers.has(name)) {
      return buffers.get(name);
    }

    if (loading.has(name)) {
      return loading.get(name);
    }

    const filename = SOUND_FILES[name];
    const ctx = getContext();

    if (!filename || !ctx) {
      return null;
    }

    const promise = (async () => {
      const response = await fetch(
        `${AUDIO_PATH}${filename}.mp3`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load ${filename}.mp3: ${response.status}`
        );
      }

      const data = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(data);

      buffers.set(name, buffer);

      return buffer;
    })();

    loading.set(name, promise);

    try {
      return await promise;
    } finally {
      loading.delete(name);
    }
  }

  // --------------------------------------------------------
  // Sound Preloading
  // --------------------------------------------------------

  let preloadStarted = false;

  function preloadSounds() {
    if (preloadStarted || muted) {
      return;
    }

    preloadStarted = true;

    for (const name of Object.keys(SOUND_FILES)) {
      loadSound(name).catch(error => {
        console.warn(
          `Could not preload ${name}:`,
          error
        );
      });
    }
  }

  // --------------------------------------------------------
  // Active Sound Tracking
  // --------------------------------------------------------

  const activeSounds = new Set();
  let playbackGeneration = 0;

  function stopAll() {
    playbackGeneration++;

    for (const source of activeSounds) {
      try {
        source.stop();
      } catch {
        // Sound may have already finished.
      }
    }

    activeSounds.clear();
  }

  // --------------------------------------------------------
  // Mobile Audio Activation
  // --------------------------------------------------------

  function unlockAudio() {
    if (muted) {
      return;
    }

    const ctx = getContext();

    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // A later interaction can retry.
      });
    }

    preloadSounds();
  }

  document.addEventListener(
    'pointerdown',
    unlockAudio
  );

  document.addEventListener(
    'touchstart',
    unlockAudio,
    { passive: true }
  );

  document.addEventListener(
    'keydown',
    unlockAudio
  );

  // --------------------------------------------------------
  // Sound Playback
  // --------------------------------------------------------

  async function play(name) {
    if (muted) {
      return;
    }

    if (!SOUND_FILES[name]) {
      console.warn(
        `Unknown Snake sound: ${name}`
      );
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

    const generation = playbackGeneration;

    try {
      const ctx = getContext();

      if (!ctx) {
        return;
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const buffer = await loadSound(name);

      if (
        muted ||
        generation !== playbackGeneration ||
        !buffer ||
        ctx.state !== 'running'
      ) {
        return;
      }

      if (
        !isPriority &&
        activeSounds.size >= MAX_SIMULTANEOUS_SOUNDS
      ) {
        return;
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;

      // Resume uses the pause sound at a lower pitch.
      source.playbackRate.value =
        name === 'resume' ? 0.85 : 1;

      gain.gain.value = SOUND_VOLUMES[name] ?? 0.5;

      source.connect(gain);
      gain.connect(ctx.destination);

      source.onended = () => {
        activeSounds.delete(source);

        source.disconnect();
        gain.disconnect();
      };

      activeSounds.add(source);

      source.start(0);

    } catch (error) {
      console.warn(
        `Audio playback failed: ${name}`,
        error
      );
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
