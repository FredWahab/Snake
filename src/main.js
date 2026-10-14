
import './style.css';

import { createGame } from './game.js';
import { setupInput } from './input.js';
import { createAudioManager } from './audio.js';

// ==========================================================
// HTML Structure
// ==========================================================

document.querySelector('#app').innerHTML = `
  <main class="game">

    <!-- Header and Scoreboard -->
    <header class="game-header">
      <h1>Snake</h1>

      <div class="header-controls">

        <div class="scoreboard">
          <div class="score">
            Score:
            <span id="score">0</span>
          </div>

          <div class="high-score">
            Best:
            <span id="high-score">0</span>
          </div>
        </div>

        <!-- Audio Mute Button -->
        <button
          id="mute-button"
          class="mute-button"
          type="button"
          aria-label="Mute sound"
          aria-pressed="false"
          title="Mute sound">

          <!-- Sound Enabled -->
          <svg
            class="sound-icon sound-on"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">

            <path d="M11 5 6 9H3v6h3l5 4V5Z"/>
            <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
            <path d="M19 5a10 10 0 0 1 0 14"/>
          </svg>

          <!-- Sound Muted -->
          <svg
            class="sound-icon sound-off"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            hidden>

            <!-- Speaker -->
            <path d="M11 5 6 9H3v6h3l5 4V5Z"/>

            <!-- Large X -->
            <path d="M16 9l5 6"/>
            <path d="M21 9l-5 6"/>
          </svg>

        </button>
      </div>
    </header>

    <!-- Game Board -->
    <div class="board-container">
      <canvas
        id="game-board"
        width="600"
        height="600">
      </canvas>

      <div
        id="game-status"
        class="game-status">
      </div>
    </div>

    <!-- Portfolio Attribution -->
    <footer class="game-footer">
      Made by
      <a
        href="https://fredwahab.com"
        target="_blank"
        rel="noopener noreferrer">
        fredwahab.com
      </a>
    </footer>

  </main>
`;

// ==========================================================
// DOM References
// ==========================================================

const canvas = document.querySelector('#game-board');

const scoreDisplay = document.querySelector('#score');

const highScoreDisplay = document.querySelector('#high-score');

const statusDisplay = document.querySelector('#game-status');

const muteButton = document.querySelector('#mute-button');

const soundOnIcon = muteButton.querySelector('.sound-on');

const soundOffIcon = muteButton.querySelector('.sound-off');

// ==========================================================
// Audio Initialization
// ==========================================================

const audio = createAudioManager();

// Update the button to reflect the current mute preference.
function updateMuteButton() {
  const muted = audio.isMuted();

  soundOnIcon.hidden = muted;
  soundOffIcon.hidden = !muted;

  muteButton.setAttribute(
    'aria-label',
    muted ? 'Unmute sound' : 'Mute sound'
  );

  muteButton.setAttribute(
    'aria-pressed',
    String(muted)
  );

  muteButton.title = muted ? 'Unmute sound' : 'Mute sound';
}

// Set the correct icon when the page first loads.
updateMuteButton();

// Handle mouse clicks and touchscreen taps.
muteButton.addEventListener('click', () => {
  audio.toggleMute();
  updateMuteButton();
});

// ==========================================================
// Game Initialization
// ==========================================================

// Create the game and its internal systems.
const game = createGame(
  canvas,
  scoreDisplay,
  statusDisplay,
  highScoreDisplay,
  audio
);

// Connect keyboard and touchscreen controls.
setupInput(canvas, game);

// Initialize game state and start the animation loop.
game.initialize();
