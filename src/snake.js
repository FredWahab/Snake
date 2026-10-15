
/* ==========================================================
   Snake State and Movement
   ========================================================== */

// Default desktop grid dimensions.
export const GRID_SIZE = 15;
export const TICK_RATE = 200;

// Active grid dimensions.
// These can change for mobile portrait and landscape.
export let GRID_COLS = GRID_SIZE;
export let GRID_ROWS = GRID_SIZE;

export const snake = [];

export let direction = { x: 1, y: 0 };

// Store up to two upcoming turns.
// One direction is consumed per movement tick.
const MAX_QUEUED_TURNS = 2;
const directionQueue = [];

// Whether the most recent movement caused growth.
let grewLastMove = false;

// History of grid positions traveled by the head.
// Newest position is always at index 0.
//
// Unlike the logical snake array, this history retains
// previous positions so the renderer can reconstruct
// the exact route around corners.
const pathHistory = [];

/* ==========================================================
   Utility Functions
   ========================================================== */

function copyPoint(point) {
  return { x: point.x, y: point.y };
}

function copyPoints(points) {
  return points.map(copyPoint);
}

/* ==========================================================
   Grid Configuration
   ========================================================== */

// Change the logical board dimensions.
// This does not reset the snake automatically.
export function setGridDimensions(cols, rows) {
  if (
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < 3 ||
    rows < 3
  ) {
    throw new Error('Invalid Snake grid dimensions.');
  }

  GRID_COLS = cols;
  GRID_ROWS = rows;
}

export function getGridDimensions() {
  return {
    cols: GRID_COLS,
    rows: GRID_ROWS
  };
}

/* ==========================================================
   Snake Initialization
   ========================================================== */

export function resetSnake() {
  snake.length = 0;
  grewLastMove = false;

  // Center the snake within the current board.
  const centerX = Math.floor(GRID_COLS / 2);
  const centerY = Math.floor(GRID_ROWS / 2);

  const startingSnake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY }
  ];

  for (const segment of startingSnake) {
    snake.push(copyPoint(segment));
  }

  direction = { x: 1, y: 0 };
  directionQueue.length = 0;

  pathHistory.length = 0;

  for (const segment of startingSnake) {
    pathHistory.push(copyPoint(segment));
  }
}

/* ==========================================================
   Game State Preservation
   ========================================================== */

// Capture everything needed to restore the snake after
// an orientation change.
export function saveSnakeState() {
  return {
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    segments: copyPoints(snake),
    direction: copyPoint(direction),
    directionQueue: copyPoints(directionQueue),
    grewLastMove,
    pathHistory: copyPoints(pathHistory)
  };
}

// Restore a previously saved snake without resetting
// its position, direction, or movement history.
export function restoreSnakeState(state) {
  if (!state) {
    throw new Error('Cannot restore an empty Snake state.');
  }

  setGridDimensions(state.gridCols, state.gridRows);

  snake.length = 0;
  snake.push(...copyPoints(state.segments));

  direction = copyPoint(state.direction);

  // Restore any queued turns so quick inputs are not
  // lost when returning to the original orientation.
  directionQueue.length = 0;

  if (Array.isArray(state.directionQueue)) {
    directionQueue.push(
      ...copyPoints(
        state.directionQueue.slice(0, MAX_QUEUED_TURNS)
      )
    );
  } else if (state.pendingDirection) {
    // Compatibility with previously saved state.
    directionQueue.push(copyPoint(state.pendingDirection));
  }

  grewLastMove = state.grewLastMove;

  pathHistory.length = 0;
  pathHistory.push(...copyPoints(state.pathHistory));
}

/* ==========================================================
   Direction Controls
   ========================================================== */

export function queueDirection(newDirection) {
  // Validate against the last queued turn, or the
  // current movement direction if the queue is empty.
  //
  // Example:
  // Moving right -> queue up -> queue left
  // Both turns are valid and execute on separate ticks.

  const lastDirection = directionQueue.length > 0
    ? directionQueue[directionQueue.length - 1]
    : direction;

  // Ignore repeated inputs in the same direction.
  // They should not consume buffer space.
  if (
    newDirection.x === lastDirection.x &&
    newDirection.y === lastDirection.y
  ) {
    return true;
  }

  // Prevent a direct 180-degree reversal.
  // Checking against the last queued direction
  // allows valid rapid cornering without reversing.
  if (
    newDirection.x === -lastDirection.x &&
    newDirection.y === -lastDirection.y
  ) {
    return false;
  }

  // Only allow cardinal movement directions.
  if (
    !(
      (Math.abs(newDirection.x) === 1 && newDirection.y === 0) ||
      (newDirection.x === 0 && Math.abs(newDirection.y) === 1)
    )
  ) {
    return false;
  }

  // Do not accumulate more than two future turns.
  if (directionQueue.length >= MAX_QUEUED_TURNS) {
    return false;
  }

  directionQueue.push(copyPoint(newDirection));
  return true;
}

/* ==========================================================
   Collision Detection
   ========================================================== */

function checkCollision(newHead, ateFood) {
  // Wall collision.
  if (
    newHead.x < 0 ||
    newHead.x >= GRID_COLS ||
    newHead.y < 0 ||
    newHead.y >= GRID_ROWS
  ) {
    return true;
  }

  // The tail moves away unless we're eating.
  const body = ateFood ? snake : snake.slice(0, -1);

  return body.some(segment =>
    segment.x === newHead.x &&
    segment.y === newHead.y
  );
}

/* ==========================================================
   Snake Movement
   ========================================================== */

export function moveSnake(food) {
  // Apply exactly one queued direction per tick.
  // Additional buffered turns remain for later ticks.
  if (directionQueue.length > 0) {
    direction = directionQueue.shift();
  }

  const head = snake[0];

  const newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  const ateFood =
    food !== null &&
    newHead.x === food.x &&
    newHead.y === food.y;

  // Check collision before modifying the snake.
  if (checkCollision(newHead, ateFood)) {
    return {
      collision: true,
      ateFood: false
    };
  }

  // Record whether this movement caused growth.
  grewLastMove = ateFood;

  // Record the exact grid route followed by the head.
  pathHistory.unshift(copyPoint(newHead));

  snake.unshift(newHead);

  if (!ateFood) {
    snake.pop();
  }

  // Keep enough history for the entire body, plus
  // additional points for smooth tail movement.
  const maxHistory = snake.length + 2;

  if (pathHistory.length > maxHistory) {
    pathHistory.length = maxHistory;
  }

  return {
    collision: false,
    ateFood
  };
}

/* ==========================================================
   Rendering Data
   ========================================================== */

export function getSnakePath() {
  return pathHistory;
}

export function getSnakeLength() {
  return snake.length;
}

export function getSnakeDirection() {
  return direction;
}

export function didGrowLastMove() {
  return grewLastMove;
}

/* ==========================================================
   Initial Setup
   ========================================================== */

resetSnake();
