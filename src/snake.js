
 // ==========================================================
 // Snake State and Movement
 // ==========================================================

 export const GRID_SIZE = 20;
 export const TICK_RATE = 200;

 const STARTING_SNAKE = [
   { x: 10, y: 10 },
   { x: 9, y: 10 },
   { x: 8, y: 10 }
 ];

 export const snake = [];

 export let direction = { x: 1, y: 0 };

 let pendingDirection = null;

  // Whether the most recent movement caused the snake to grow.
  let grewLastMove = false;

  export function didGrowLastMove() {
    return grewLastMove;
  }

 // History of grid positions traveled by the head.
 // Newest position is always at index 0.
 //
 // Unlike the logical snake array, this history retains
 // previous positions so the renderer can reconstruct
 // the exact route around corners.
 const pathHistory = [];

 function copyPoint(point) {
   return { x: point.x, y: point.y };
 }

 export function resetSnake() {
   snake.length = 0;
   grewLastMove = false;

   for (const segment of STARTING_SNAKE) {
     snake.push(copyPoint(segment));
   }

   direction = { x: 1, y: 0 };
   pendingDirection = null;

   pathHistory.length = 0;

   for (const segment of STARTING_SNAKE) {
     pathHistory.push(copyPoint(segment));
   }
 }

 // ==========================================================
 // Direction Controls
 // ==========================================================

 export function queueDirection(newDirection) {
   // Prevent multiple turns during a single game tick.
   if (pendingDirection !== null) return false;

   // Prevent reversing directly into the body.
   if (
     newDirection.x === -direction.x &&
     newDirection.y === -direction.y
   ) {
     return false;
   }

   // No need to queue the direction we're already moving.
   if (
     newDirection.x === direction.x &&
     newDirection.y === direction.y
   ) {
     return true;
   }

   pendingDirection = copyPoint(newDirection);
   return true;
 }

 // ==========================================================
 // Collision Detection
 // ==========================================================

 function checkCollision(newHead, ateFood) {
   // Wall collision.
   if (
     newHead.x < 0 ||
     newHead.x >= GRID_SIZE ||
     newHead.y < 0 ||
     newHead.y >= GRID_SIZE
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

 // ==========================================================
 // Snake Movement
 // ==========================================================

 export function moveSnake(food) {
   if (pendingDirection !== null) {
     direction = pendingDirection;
     pendingDirection = null;
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
       ateFood: false,
       won: false
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
   // one additional point for smooth tail movement.
   const maxHistory = snake.length + 2;

   if (pathHistory.length > maxHistory) {
     pathHistory.length = maxHistory;
   }

   return {
     collision: false,
     ateFood,
     won: snake.length === GRID_SIZE * GRID_SIZE
   };
 }

 // ==========================================================
 // Rendering Data
 // ==========================================================

 export function getSnakePath() {
   return pathHistory;
 }

 export function getSnakeLength() {
   return snake.length;
 }

 export function getSnakeDirection() {
   return direction;
 }

 // Initialize the starting snake.
 resetSnake();
