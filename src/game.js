
import {
  GRID_SIZE,
  TICK_RATE,
  snake,
  resetSnake,
  moveSnake,
  queueDirection,
  getGridDimensions,
  setGridDimensions,
  saveSnakeState,
  restoreSnakeState
} from './snake.js';

import { createRenderer } from './renderer.js';

// ==========================================================
// Game Setup
// ==========================================================

export function createGame(
  canvas,
  scoreDisplay,
  statusDisplay,
  highScoreDisplay = null
) {
  const renderer = createRenderer(canvas);

  // ========================================================
  // Configuration
  // ========================================================

  const BOARD_CONFIGS = {
    desktop: { cols: GRID_SIZE, rows: GRID_SIZE },
    portrait: { cols: 10, rows: 16 },
    landscape: { cols: 18, rows: 10 }
  };

  const FOOD_COLORS = [
    '#38bdf8',
    '#f472b6',
    '#fbbf24',
    '#a78bfa',
    '#4ade80',
    '#fb7185',
    '#22d3ee'
  ];

  const HIGH_SCORE_KEY = 'snake-high-score';
  const LOGICAL_CELL_SIZE = 40;

  // ========================================================
  // Game State
  // ========================================================

  let food = null;
  let score = 0;
  let highScore = loadHighScore();

  // ready, running, paused, dying, gameover
  let gameState = 'ready';
  let gameStarted = false;
  let gameWon = false;

  let lastFrameTime = null;
  let elapsedTime = 0;
  let animationStarted = false;

  // Time at which the collision reaction began.
  let collisionStartTime = null;

  // The orientation associated with the active game.
  let activeLayout = null;

  // The orientation currently displayed on screen.
  let displayedLayout = null;

  // Original game preserved during a rotation.
  let suspendedGame = null;

  let awaitingOrientationChoice = false;
  let orientationFrame = null;

  // ========================================================
  // Device and Layout Detection
  // ========================================================

  function isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  function getLayout() {
    if (!isTouchDevice()) {
      return 'desktop';
    }

    return window.innerWidth > window.innerHeight
      ? 'landscape'
      : 'portrait';
  }

  // ========================================================
  // High Score
  // ========================================================

  function loadHighScore() {
    try {
      const stored = Number(
        localStorage.getItem(HIGH_SCORE_KEY)
      );

      return Number.isFinite(stored) && stored > 0
        ? Math.floor(stored)
        : 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      localStorage.setItem(
        HIGH_SCORE_KEY,
        String(highScore)
      );
    } catch {
      // The game remains playable without storage.
    }
  }

  function updateScoreDisplay() {
    scoreDisplay.textContent = score;

    if (highScoreDisplay) {
      highScoreDisplay.textContent = highScore;
    }
  }

  // ========================================================
  // Status Overlay Helpers
  // ========================================================

  function spaceKeyInstruction(action) {
    return `
      <div class="instruction-row">
        <span class="key space-key">SPACE</span>
        <span>to ${action}</span>
      </div>
    `;
  }

  function showStatus(content, useHTML = false) {
    if (useHTML) {
      statusDisplay.innerHTML = content;
    } else {
      statusDisplay.textContent = content;
    }

    statusDisplay.classList.remove('hidden');
  }

  function hideStatus() {
    statusDisplay.classList.add('hidden');
  }

  function showStartMessage() {
    if (isTouchDevice()) {
      showStatus('Tap to Start\nSwipe to Move');
      return;
    }

    showStatus(`
      <div class="start-instructions">
        ${spaceKeyInstruction('Start')}

        <div class="instruction-row">
          <div class="arrow-keys">
            <span class="key arrow-up">↑</span>
            <span class="key arrow-left">←</span>
            <span class="key arrow-down">↓</span>
            <span class="key arrow-right">→</span>
          </div>
          <span>to Move</span>
        </div>
      </div>
    `, true);
  }

  function showPauseMessage() {
    if (isTouchDevice()) {
      showStatus('Paused\nTap to Resume');
      return;
    }

    showStatus(`
      <div class="start-instructions">
        <div>Paused</div>
        ${spaceKeyInstruction('Resume')}
      </div>
    `, true);
  }

  function showEndMessage(won) {
    const result = won ? 'You Win!' : 'Game Over!';

    if (isTouchDevice()) {
      showStatus(
        `${result}\nScore: ${score}\nTap to Restart`
      );
      return;
    }

    showStatus(`
      <div class="start-instructions">
        <div>${result}</div>
        <div>Score: ${score}</div>
        ${spaceKeyInstruction('Restart')}
      </div>
    `, true);
  }

  function showOrientationMessage() {
    const layoutName =
      displayedLayout === 'landscape'
        ? 'Landscape'
        : displayedLayout === 'portrait'
          ? 'Portrait'
          : 'Desktop';

    const instruction = isTouchDevice()
      ? 'Tap to Start New Game'
      : 'Press Space to Start New Game';

    showStatus(
      `Orientation Changed\n${layoutName} Mode\n${instruction}\nRotate Back to Resume Previous Game`
    );
  }

  // ========================================================
  // Canvas and Board Dimensions
  // ========================================================

  function resizeCanvas(cols, rows) {
    canvas.width = cols * LOGICAL_CELL_SIZE;
    canvas.height = rows * LOGICAL_CELL_SIZE;

    const boardContainer = canvas.parentElement;

    if (boardContainer) {
      boardContainer.style.aspectRatio = `${cols} / ${rows}`;
    }
  }

  function configureBoard(layout) {
    const config = BOARD_CONFIGS[layout];

    setGridDimensions(config.cols, config.rows);
    resizeCanvas(config.cols, config.rows);

    displayedLayout = layout;
  }

  // ========================================================
  // Food Spawning
  // ========================================================

  function spawnFood() {
    const { cols, rows } = getGridDimensions();
    const emptyCells = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
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

    const colorIndex = Math.floor(
      Math.random() * FOOD_COLORS.length
    );

    food = {
      ...emptyCells[randomIndex],
      color: FOOD_COLORS[colorIndex]
    };
  }

  // ========================================================
  // Game State Preservation
  // ========================================================

  function saveGameState() {
    return {
      snakeState: saveSnakeState(),
      food: food ? { ...food } : null,
      score,
      gameState,
      gameStarted,
      gameWon,
      activeLayout,
      elapsedTime
    };
  }

  function restoreGameState(saved) {
    restoreSnakeState(saved.snakeState);

    food = saved.food ? { ...saved.food } : null;
    score = saved.score;
    gameStarted = saved.gameStarted;
    gameWon = saved.gameWon;

    activeLayout = saved.activeLayout;
    displayedLayout = saved.activeLayout;

    // Never resume movement automatically.
    // A collision in progress resolves to Game Over.
    if (saved.gameState === 'running') {
      gameState = 'paused';
    } else if (saved.gameState === 'dying') {
      gameState = 'gameover';
      gameWon = false;
    } else {
      gameState = saved.gameState;
    }

    elapsedTime = 0;
    lastFrameTime = null;
    collisionStartTime = null;

    const { cols, rows } = getGridDimensions();
    resizeCanvas(cols, rows);

    // Don't carry unfinished visual reactions
    // across an orientation change.
    renderer.resetHeadAnimations();

    updateScoreDisplay();

    awaitingOrientationChoice = false;
    suspendedGame = null;

    if (gameState === 'paused') {
      showPauseMessage();
    } else if (gameState === 'gameover') {
      showEndMessage(gameWon);
    } else {
      showStartMessage();
    }
  }

  // ========================================================
  // Orientation Handling
  // ========================================================

  function handleOrientationChange() {
    const newLayout = getLayout();

    if (newLayout === displayedLayout) {
      return;
    }

    // Return to the original game.
    if (
      suspendedGame &&
      newLayout === suspendedGame.activeLayout
    ) {
      restoreGameState(suspendedGame);
      return;
    }

    // Before gameplay starts, simply switch boards.
    if (!gameStarted && !suspendedGame) {
      activeLayout = newLayout;

      configureBoard(newLayout);
      resetGame();
      showStartMessage();

      return;
    }

    // Preserve the original game once.
    if (!suspendedGame) {
      suspendedGame = saveGameState();
    }

    // Freeze gameplay and display the new board.
    gameState = 'paused';
    awaitingOrientationChoice = true;

    configureBoard(newLayout);

    elapsedTime = 0;
    lastFrameTime = null;
    collisionStartTime = null;

    showOrientationMessage();
  }

  function scheduleOrientationCheck() {
    if (orientationFrame !== null) {
      cancelAnimationFrame(orientationFrame);
    }

    orientationFrame = requestAnimationFrame(() => {
      orientationFrame = null;
      handleOrientationChange();
    });
  }

  function startNewGameInCurrentOrientation() {
    suspendedGame = null;
    awaitingOrientationChoice = false;

    activeLayout = displayedLayout;

    configureBoard(activeLayout);
    resetGame();
    startGame();
  }

  // ========================================================
  // Game States
  // ========================================================

  function startGame() {
    if (awaitingOrientationChoice) {
      startNewGameInCurrentOrientation();
      return;
    }

    if (
      gameState === 'running' ||
      gameState === 'dying'
    ) {
      return;
    }

    if (gameState === 'gameover') {
      resetGame();
    }

    gameState = 'running';
    gameStarted = true;

    hideStatus();

    lastFrameTime = null;
    elapsedTime = 0;
  }

  function pauseGame() {
    if (gameState !== 'running') return;

    gameState = 'paused';
    showPauseMessage();
  }

  function endGame(won = false) {
    gameState = 'gameover';
    gameWon = won;

    elapsedTime = 0;
    collisionStartTime = null;

    showEndMessage(won);
  }

  // ========================================================
  // Collision Animation
  // ========================================================

  function beginCollision(timestamp) {
    // Movement stops immediately.
    gameState = 'dying';
    gameWon = false;

    elapsedTime = 0;
    collisionStartTime = timestamp;

    // Trigger the renderer's recoil, flash,
    // and X-shaped eyes.
    renderer.triggerCollision(timestamp);

    // Leave the board unobstructed until the
    // collision animation has finished.
    hideStatus();
  }

  function updateCollisionAnimation(timestamp) {
    if (
      gameState !== 'dying' ||
      collisionStartTime === null
    ) {
      return;
    }

    const elapsed = timestamp - collisionStartTime;

    if (elapsed >= renderer.COLLISION_DURATION) {
      endGame(false);
    }
  }

  // ========================================================
  // Reset and Input
  // ========================================================

  function resetGame() {
    resetSnake();

    score = 0;
    gameStarted = false;
    gameWon = false;

    updateScoreDisplay();

    elapsedTime = 0;
    lastFrameTime = null;
    collisionStartTime = null;

    // Remove old blinking, eating, or collision
    // animations before beginning a new game.
    renderer.resetHeadAnimations();

    spawnFood();

    gameState = 'ready';
  }

  function toggleGame() {
    if (awaitingOrientationChoice) {
      startNewGameInCurrentOrientation();
      return;
    }

    // Ignore taps and Space while the collision
    // reaction is playing.
    if (gameState === 'dying') {
      return;
    }

    if (gameState === 'running') {
      pauseGame();
    } else {
      startGame();
    }
  }

  function changeDirection(newDirection) {
    if (
      awaitingOrientationChoice ||
      gameState === 'dying'
    ) {
      return;
    }

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

  function updateGame(timestamp) {
    const result = moveSnake(food);

    if (result.collision) {
      beginCollision(timestamp);
      return;
    }

    if (result.ateFood) {
      score++;

      // Tell the renderer to animate the bite.
      renderer.triggerEat(timestamp - 100);

      if (score > highScore) {
        highScore = score;
        saveHighScore();
      }

      updateScoreDisplay();

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
        updateGame(timestamp);
      }
    }

    // Collision animation uses real elapsed time,
    // independent of the snake's movement tick.
    updateCollisionAnimation(timestamp);

    let alpha = 1;

    if (gameState === 'running') {
      alpha = Math.min(
        elapsedTime / TICK_RATE,
        1
      );
    }

    // The collision reaction should display the
    // last valid snake position, not interpolate
    // into the wall or its own body.
    if (gameState === 'dying') {
      alpha = 0;
    }

    // Show only the empty board when the player
    // rotates away from the original game.
    if (awaitingOrientationChoice) {
      renderer.render(
        null,
        1,
        score,
        timestamp,
        false
      );
    } else {
      renderer.render(
        food,
        alpha,
        score,
        timestamp
      );
    }

    requestAnimationFrame(animationLoop);
  }

  // ========================================================
  // Initialization
  // ========================================================

  function initialize() {
    activeLayout = getLayout();

    configureBoard(activeLayout);
    resetGame();
    showStartMessage();

    window.addEventListener(
      'resize',
      scheduleOrientationCheck
    );

    window.addEventListener(
      'orientationchange',
      scheduleOrientationCheck
    );

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
