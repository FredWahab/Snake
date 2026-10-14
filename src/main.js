
import './style.css';

import { createGame } from './game.js';
import { setupInput } from './input.js';

// ==========================================================
// HTML Structure
// ==========================================================

document.querySelector('#app').innerHTML = `
  <main class="game">
    <header class="game-header">
      <h1>Snake</h1>

      <div class="score">
        Score: <span id="score">0</span>
      </div>
    </header>

    <div class="board-container">
      <canvas
        id="game-board"
        width="600"
        height="600">
      </canvas>

      <div id="game-status" class="game-status"></div>
    </div>

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
const statusDisplay = document.querySelector('#game-status');

// ==========================================================
// Game Initialization
// ==========================================================

// Create the game and its internal systems.
const game = createGame(
  canvas,
  scoreDisplay,
  statusDisplay
);

// Connect keyboard and touchscreen controls.
setupInput(canvas, game);

// Initialize game state and start the animation loop.
game.initialize();
