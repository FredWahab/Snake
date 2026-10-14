
/* ==========================================================
   Snake - Audio Manager
   ========================================================== */

// Audio assets are stored in public/audio.
// Vite's BASE_URL supports local development and GitHub Pages.

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
  // Audio Context
  // --------------------------------------------------------

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    console.warn('Web Audio API is not supported.');

    return {
      play() {},
      stopAll() {},
      isMuted: () => muted,
      setMuted(value) {
        muted = Boolean(value);
      },
      toggleMute() {
        muted = !muted;
        return muted;
      }
    };
  }

  // Create the context lazily, after user interaction.
  let context = null;

  function getContext() {
    if (!context) {
      context = new AudioContextClass();
    }

    return context;
  }

  // --------------------------------------------------------
  // Audio Loading
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

    if (!filename) return null;

    const promise = (async () => {
      const ctx = getContext();

      // MP3 is supported by modern Safari and desktop browsers.
      const response = await fetch(
        `${AUDIO_PATH}${filename}.mp3`
      );

      if (!response.ok) {
        throw new Error(
          `Could not load ${filename}.mp3: ${response.status}`
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
  // Active Sound Tracking
  // --------------------------------------------------------

  const activeSounds = new Set();

  function stopAll() {
    for (const source of activeSounds) {
      try {
        source.stop();
      } catch {
        // Source may have already finished.
      }
    }

    activeSounds.clear();
  }

  // --------------------------------------------------------
  // iOS Audio Activation
  // --------------------------------------------------------

  function unlockAudio() {
    if (muted) return;

    const ctx = getContext();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // A later user interaction can retry.
      });
    }
  }

  // iOS requires audio activation through user interaction.
  // Keep these listeners so audio can recover after Safari
  // suspends the context.

  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('touchstart', unlockAudio, {
    passive: true
  });
  document.addEventListener('keydown', unlockAudio);

  // --------------------------------------------------------
  // Sound Playback
  // --------------------------------------------------------

  async function play(name) {
    if (muted) return;

    if (!SOUND_FILES[name]) {
      console.warn(`Unknown sound: ${name}`);
      return;
    }

    // Capture the current generation so a pending load
    // cannot play after mute or stopAll.
    const generation = playbackGeneration;

    try {
      const ctx = getContext();

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

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
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
      console.warn(`Audio playback failed: ${name}`, error);
    }
  }

  // --------------------------------------------------------
  // Playback Cancellation
  // --------------------------------------------------------

  let playbackGeneration = 0;

  const originalStopAll = stopAll;

  function cancelAll() {
    playbackGeneration++;
    originalStopAll();
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
      cancelAll();
    } else {
      unlockAudio();
    }

    try {
      localStorage.setItem(
        MUTE_STORAGE_KEY,
        String(muted)
      );
    } catch {
      // Preference remains active for this session.
    }
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  return {
    play,
    stopAll: cancelAll,
    isMuted,
    setMuted,
    toggleMute
  };
}
