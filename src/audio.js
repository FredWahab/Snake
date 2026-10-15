
/* ==========================================================
   Snake - Audio Manager

   HTML5 Audio implementation with reusable sound pools.

   Features:
   - Preloaded MP3 sound effects
   - Reusable audio players
   - Overlapping playback
   - iPhone Safari compatibility
   - Persistent mute preference
   - Priority sounds
   ========================================================== */

const AUDIO_PATH = `${import.meta.env.BASE_URL}audio/`;

const MUTE_STORAGE_KEY = 'snake-audio-muted';

// ----------------------------------------------------------
// Sound Configuration
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
      // Continue without persistent storage.
    }
  }

  // --------------------------------------------------------
  // Audio Pools
  // --------------------------------------------------------

  const soundPools = new Map();
  const activeSounds = new Set();

  // Two players per cue allow limited overlap.
  // Frequently played sounds get additional players.
  const POOL_SIZES = {
    start: 2,
    eat: 4,
    pause: 2,
    resume: 2,
    collision: 2,
    gameOver: 2,
    highScore: 2
  };

  function createPlayer(filename) {
    const player = new Audio();

    player.preload = 'auto';
    player.src = `${AUDIO_PATH}${filename}.mp3`;

    // Request media loading immediately.
    player.load();

    return player;
  }

  for (const [name, filename] of Object.entries(SOUND_FILES)) {
    const size = POOL_SIZES[name] ?? 2;
    const pool = [];

    for (let i = 0; i < size; i++) {
      pool.push(createPlayer(filename));
    }

    soundPools.set(name, pool);
  }

  // --------------------------------------------------------
  // Stop and Cleanup
  // --------------------------------------------------------

  function stopPlayer(player) {
    player.pause();

    try {
      player.currentTime = 0;
    } catch {
      // Seeking may be unavailable before loading.
    }

    activeSounds.delete(player);
  }

  function stopAll() {
    for (const player of [...activeSounds]) {
      stopPlayer(player);
    }
  }

  // --------------------------------------------------------
  // Mobile Audio Activation
  // --------------------------------------------------------

  function unlockAudio() {
    if (muted) return;

    // Loading is requested when the manager is created.
    // This method remains available to input.js and
    // provides another loading opportunity after a tap.
    for (const pool of soundPools.values()) {
      for (const player of pool) {
        if (player.networkState === HTMLMediaElement.NETWORK_EMPTY) {
          player.load();
        }
      }
    }
  }

  // --------------------------------------------------------
  // Sound Playback
  // --------------------------------------------------------

  function play(name) {
    if (muted) return;

    const pool = soundPools.get(name);

    if (!pool) {
      console.warn(`Unknown Snake sound: ${name}`);
      return;
    }

    const isPriority = PRIORITY_SOUNDS.has(name);

    if (isPriority) {
      stopAll();
    } else if (activeSounds.size >= MAX_SIMULTANEOUS_SOUNDS) {
      return;
    }

    // Prefer an idle player from the existing pool.
    let player = pool.find(
      candidate => !activeSounds.has(candidate)
    );

    // If every player is busy, reuse the first one.
    if (!player) {
      player = pool[0];
      stopPlayer(player);
    }

    player.volume = SOUND_VOLUMES[name] ?? 0.5;
    player.playbackRate = name === 'resume' ? 0.85 : 1;

    try {
      player.currentTime = 0;
    } catch {
      // Some browsers restrict seeking until loaded.
    }

    activeSounds.add(player);

    const playback = player.play();

    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => {
        activeSounds.delete(player);

        if (error.name !== 'NotAllowedError' &&
            error.name !== 'AbortError') {
          console.warn(
            `Audio playback failed: ${name}`,
            error
          );
        }
      });
    }
  }

  // --------------------------------------------------------
  // Player Event Cleanup
  // --------------------------------------------------------

  for (const pool of soundPools.values()) {
    for (const player of pool) {
      player.addEventListener('ended', () => {
        activeSounds.delete(player);
      });

      player.addEventListener('error', () => {
        activeSounds.delete(player);
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
