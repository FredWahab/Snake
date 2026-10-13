
import {
  GRID_SIZE,
  TICK_RATE,
  snake,
  resetSnake,
  moveSnake,
  queueDirection
} from './snake.js';

import { createRenderer } from './renderer.js';

// ==========================================================
// Game Setup
// ==========================================================

export function createGame(canvas, scoreDisplay, statusDisplay) {
  const renderer = createRenderer(canvas);

  let food = null;
  let score = 0;
  let gameState = 'ready';

  let lastFrameTime = null;
  let elapsedTime = 0;

  // Tracks whether the animation loop has started.
  let animationStarted = false;

  // ========================================================
  // Food Spawning
  // ========================================================

  function spawnFood() {
    const emptyCells = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const occupied = snake.some(segment =>
          segment.x === x && segment.y === y
        );

        if (!occupied) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) {
      food = null;
      return;
    }

    const randomIndex = Math.floor(
      Math.random() * emptyCells.length
    );

    food = emptyCells[randomIndex];
  }

  // ========================================================
  // Game States
  // ========================================================

  function startGame() {
    if (gameState === 'running') return;

    if (gameState === 'gameover') {
      resetGame();
    }

    gameState = 'running';
    statusDisplay.classList.add('hidden');

    // Don't count time spent paused or waiting to start.
    lastFrameTime = null;
    elapsedTime = 0;
  }

  function pauseGame() {
    if (gameState !== 'running') return;

    gameState = 'paused';

    statusDisplay.textContent =
      'Paused — Space or Tap to Resume';

    statusDisplay.classList.remove('hidden');
  }

  function endGame(won = false) {
    gameState = 'gameover';

    elapsedTime = 0;

    statusDisplay.textContent = won
      ? `You Win! Score: ${score} — Press Space or Tap to Restart`
      : `Game Over! Score: ${score} — Press Space or Tap to Restart`;

    statusDisplay.classList.remove('hidden');
  }

  function resetGame() {
    resetSnake();

    score = 0;
    scoreDisplay.textContent = score;

    elapsedTime = 0;
    lastFrameTime = null;

    spawnFood();

    gameState = 'ready';
  }

  function toggleGame() {
    if (gameState === 'running') {
      pauseGame();
    } else {
      startGame();
    }
  }

  // ========================================================
  // Direction Controls
  // ========================================================

  function changeDirection(newDirection) {
    if (gameState === 'gameover') {
      resetGame();
    }

    const accepted = queueDirection(newDirection);

    if (!accepted) return;

    if (gameState !== 'running') {
      startGame();
    }
  }

  // ========================================================
  // Logical Game Updates
  // ========================================================

  function updateGame() {
    const result = moveSnake(food);

    if (result.collision) {
      endGame();
      return;
    }

    if (result.ateFood) {
      score++;
      scoreDisplay.textContent = score;

      if (result.won) {
        food = null;
        endGame(true);
      } else {
        spawnFood();
      }
    }
  }

  // ========================================================
  // Animation Loop
  // ========================================================

  function animationLoop(timestamp) {
    if (lastFrameTime === null) {
      lastFrameTime = timestamp;
    }

    const deltaTime = Math.min(
      timestamp - lastFrameTime,
      TICK_RATE
    );

    lastFrameTime = timestamp;

    if (gameState === 'running') {
      elapsedTime += deltaTime;

      if (elapsedTime >= TICK_RATE) {
        elapsedTime -= TICK_RATE;
        updateGame();
      }
    }

    // Alpha represents movement progress between ticks.
    let alpha = 1;

    if (gameState === 'running') {
      alpha = Math.min(elapsedTime / TICK_RATE, 1);
    }

    renderer.render(food, alpha);

    requestAnimationFrame(animationLoop);
  }

  // ========================================================
  // Initialization
  // ========================================================

  function initialize() {
    resetGame();

    statusDisplay.textContent =
      'Press Space or a Direction Key to Start';

    statusDisplay.classList.remove('hidden');

    if (!animationStarted) {
      animationStarted = true;
      requestAnimationFrame(animationLoop);
    }
  }

  return {
    initialize,
    startGame,
    pauseGame,
    toggleGame,
    changeDirection
  };
}
