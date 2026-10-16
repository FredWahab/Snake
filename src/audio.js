
/* ==========================================================
   Snake - Audio Manager

   Audio playback powered by Howler.js.

   Features:
   - Preloaded and decoded MP3 effects
   - Mobile Safari audio unlocking
   - Independent overlapping sounds
   - No delayed playback of unloaded effects
   - Persistent mute preference
   - Priority sounds
   ========================================================== */

import { Howl, Howler } from 'howler';

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
  // Howler Configuration
  // --------------------------------------------------------

  // Automatically unlock audio on mobile interactions.
  Howler.autoUnlock = true;

  // Avoid automatic context suspension between effects.
  Howler.autoSuspend = false;

  // --------------------------------------------------------
  // Sound Loading
  // --------------------------------------------------------

  const sounds = new Map();

  for (const [name, filename] of Object.entries(SOUND_FILES)) {

    const sound = new Howl({
      src: [`${AUDIO_PATH}${filename}.mp3`],

      // Use Web Audio for short game effects.
      html5: false,

      // Begin loading and decoding immediately.
      preload: true,

      volume: SOUND_VOLUMES[name] ?? 0.5,

      loop: false,

      onloaderror(id, error) {
        console.warn(
          `Could not load Snake sound: ${name}`,
          error
        );
      },

      onplayerror(id, error) {
        console.warn(
          `Could not play Snake sound: ${name}`,
          error
        );
      }
    });

    sounds.set(name, sound);
  }

  // --------------------------------------------------------
  // Stop Playback
  // --------------------------------------------------------

  function stopAll() {
    for (const sound of sounds.values()) {
      sound.stop();
    }
  }

  // --------------------------------------------------------
  // Mobile Audio Activation
  // --------------------------------------------------------

  function unlockAudio() {
    if (muted) return;

    // Howler handles mobile unlocking automatically.
    // Also request context resumption synchronously
    // during the user's touch event.
    const context = Howler.ctx;

    if (context && context.state === 'suspended') {
      context.resume().catch(() => {
        // Howler can retry on another interaction.
      });
    }
  }

  // --------------------------------------------------------
  // Sound Playback
  // --------------------------------------------------------

  function play(name) {
    if (muted) return;

    const sound = sounds.get(name);

    if (!sound) {
      console.warn(`Unknown Snake sound: ${name}`);
      return;
    }

    // Do not queue effects that could play late.
    // Once loaded, the decoded audio is reusable.
    if (sound.state() !== 'loaded') {
      return;
    }

    if (PRIORITY_SOUNDS.has(name)) {
      stopAll();
    }

    const id = sound.play();

    // Preserve the slightly slower resume effect.
    if (name === 'resume') {
      sound.rate(0.85, id);
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
