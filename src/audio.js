
/* ==========================================================
   Snake - Audio Manager

   HTML5 Audio implementation.

   Features:
   - MP3 sound effects
   - Independent overlapping playback
   - Persistent mute preference
   - Immediate sound cleanup
   - Compatible with existing game and input modules
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

  const sounds = {};

  for (const [name, filename] of Object.entries(SOUND_FILES)) {
    const audio = new Audio(
      `${AUDIO_PATH}${filename}.mp3`
    );

    audio.preload = 'auto';

    sounds[name] = audio;
  }

  // --------------------------------------------------------
  // Active Sound Tracking
  // --------------------------------------------------------

  const activeSounds = new Set();

  function stopAll() {
    for (const sound of activeSounds) {
      sound.pause();

      try {
        sound.currentTime = 0;
      } catch {
        // Seeking may not be available yet.
      }
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
      console.warn(`Unknown Snake sound: ${name}`);
      return;
    }

    // Each playback gets an independent audio element.
    // This matches the original working implementation.
    const sound = source.cloneNode(true);

    sound.volume = SOUND_VOLUMES[name] ?? 0.5;

    // Preserve the lower-pitched resume sound.
    sound.playbackRate = name === 'resume' ? 0.85 : 1;

    activeSounds.add(sound);

    function cleanup() {
      activeSounds.delete(sound);

      sound.removeEventListener('ended', cleanup);
      sound.removeEventListener('error', cleanup);
    }

    sound.addEventListener('ended', cleanup);
    sound.addEventListener('error', cleanup);

    // Playback is requested synchronously.
    // No asynchronous loading or AudioContext resume.
    const playPromise = sound.play();

    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Log failures while investigating Safari.
        console.warn(
          `Audio playback failed: ${name}`,
          error
        );

        cleanup();
      });
    }
  }

  // --------------------------------------------------------
  // Compatibility With Existing Input Module
  // --------------------------------------------------------

  function unlockAudio() {
    // HTML5 Audio playback is requested directly from
    // game events. Keep this method because input.js
    // currently calls audio.unlockAudio().
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
