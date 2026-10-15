
/* ==========================================================
   Snake - Audio Manager
   ========================================================== */

// Audio assets are stored in public/audio.
// Vite's BASE_URL supports local development and GitHub Pages.

const AUDIO_PATH = `${import.meta.env.BASE_URL}audio/`;

const MUTE_STORAGE_KEY = 'snake-audio-muted';

// Sound effects used by the game.
const SOUND_FILES = {
  start: 'start',
  eat: 'eat',
  pause: 'pause',
  resume: 'pause',
  collision: 'collision',
  gameOver: 'game-over',
  highScore: 'high-score'
};

// Individual sound volume adjustments.
const SOUND_VOLUMES = {
  start: 0.45,
  eat: 0.5,
  pause: 0.35,
  resume: 0.35,
  collision: 0.55,
  gameOver: 0.55,
  highScore: 0.55
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
    if (!AudioContextClass) return null;

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

    if (!filename || !ctx) return null;

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

  // Load all sounds after the first interaction.
  let preloadStarted = false;

  function preloadSounds() {
    if (preloadStarted || muted) return;

    preloadStarted = true;

    for (const name of Object.keys(SOUND_FILES)) {
      loadSound(name).catch(error => {
        console.warn(`Could not preload ${name}:`, error);
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
  // iOS Audio Activation
  // --------------------------------------------------------

  function unlockAudio() {
    if (muted) return;

    const ctx = getContext();

    if (!ctx) return;

    // Call resume directly within the user gesture.
    // Do not await it before starting the silent source.
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {
        // A later user interaction can retry.
      });
    }

    // Start a silent buffer immediately during the gesture.
    // This helps initialize Web Audio on iOS Safari.
    try {
      const silentBuffer = ctx.createBuffer(
        1,
        1,
        ctx.sampleRate
      );

      const silentSource = ctx.createBufferSource();
      silentSource.buffer = silentBuffer;
      silentSource.connect(ctx.destination);
      silentSource.start(0);

      silentSource.onended = () => {
        silentSource.disconnect();
      };
    } catch {
      // The next interaction can retry activation.
    }

    preloadSounds();
  }

  // Capture the earliest available interaction so audio
  // is unlocked before gameplay processes that gesture.
  document.addEventListener('touchstart', unlockAudio, {
    passive: true,
    capture: true
  });

  document.addEventListener('pointerdown', unlockAudio, {
    capture: true
  });

  document.addEventListener('keydown', unlockAudio, {
    capture: true
  });

  // Safari may suspend audio when switching apps or tabs.
  // A later interaction will unlock it again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !muted) {
      const ctx = getContext();

      if (ctx && ctx.state !== 'running') {
        ctx.resume().catch(() => {
          // A later gesture can retry.
        });
      }
    }
  });

  // --------------------------------------------------------
  // Sound Playback
  // --------------------------------------------------------

  async function play(name) {
    if (muted) return;

    if (!SOUND_FILES[name]) {
      console.warn(`Unknown sound: ${name}`);
      return;
    }

    const generation = playbackGeneration;

    try {
      const ctx = getContext();

      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const buffer = await loadSound(name);

      if (
        muted ||
        generation !== playbackGeneration ||
        !buffer
      ) {
        return;
      }

      // If Safari suspended the context while loading,
      // attempt to resume it again.
      if (ctx.state !== 'running') {
        await ctx.resume();
      }

      if (
        muted ||
        generation !== playbackGeneration ||
        ctx.state !== 'running'
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
      console.warn(`Audio playback failed: ${name}`, error);
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
