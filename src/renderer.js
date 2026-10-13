
import {
  GRID_SIZE,
  getSnakePath,
  getSnakeLength,
  getSnakeDirection,
  didGrowLastMove
} from './snake.js';

// ==========================================================
// Renderer Setup
// ==========================================================

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const CELL_SIZE = canvas.width / GRID_SIZE;

  const BODY_COLOR = '#4ade80';
  const HEAD_COLOR = '#6ee7a0';
  const GRID_COLOR = '#35414d';

  // Radius of rounded turns in grid-cell units.
  const CORNER_RADIUS = 0.35;

  // ========================================================
  // Coordinate Helpers
  // ========================================================

  function toCanvas(point) {
    return {
      x: point.x * CELL_SIZE + CELL_SIZE / 2,
      y: point.y * CELL_SIZE + CELL_SIZE / 2
    };
  }

  function interpolate(start, end, alpha) {
    return {
      x: start.x + (end.x - start.x) * alpha,
      y: start.y + (end.y - start.y) * alpha
    };
  }

  // ========================================================
  // Grid Rendering
  // ========================================================

  function drawGrid() {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    ctx.beginPath();

    for (let i = 1; i < GRID_SIZE; i++) {
      const position = i * CELL_SIZE;

      ctx.moveTo(position, 0);
      ctx.lineTo(position, canvas.height);

      ctx.moveTo(0, position);
      ctx.lineTo(canvas.width, position);
    }

    ctx.stroke();
  }

  // ========================================================
  // Rounded Path Geometry
  // ========================================================

  function drawRoundedPath(points) {
    if (points.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      ctx.lineTo(points[0].x, points[0].y);
      return;
    }

    for (let i = 1; i < points.length - 1; i++) {
      const previous = points[i - 1];
      const current = points[i];
      const next = points[i + 1];

      const dx1 = current.x - previous.x;
      const dy1 = current.y - previous.y;

      const dx2 = next.x - current.x;
      const dy2 = next.y - current.y;

      const length1 = Math.hypot(dx1, dy1);
      const length2 = Math.hypot(dx2, dy2);

      if (length1 === 0 || length2 === 0) {
        ctx.lineTo(current.x, current.y);
        continue;
      }

      const inX = dx1 / length1;
      const inY = dy1 / length1;
      const outX = dx2 / length2;
      const outY = dy2 / length2;

      const cross = inX * outY - inY * outX;
      const dot = inX * outX + inY * outY;

      // Straight section: no curve needed.
      if (Math.abs(cross) < 0.001 || dot < -0.999) {
        ctx.lineTo(current.x, current.y);
        continue;
      }

      const radius = Math.min(
        CORNER_RADIUS * CELL_SIZE,
        length1 / 2,
        length2 / 2
      );

      const entryX = current.x - inX * radius;
      const entryY = current.y - inY * radius;

      const exitX = current.x + outX * radius;
      const exitY = current.y + outY * radius;

      ctx.lineTo(entryX, entryY);

      ctx.quadraticCurveTo(
        current.x,
        current.y,
        exitX,
        exitY
      );
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  // ========================================================
  // Snake Rendering
  // ========================================================

  function drawSnake(alpha) {
    const path = getSnakePath();
    const length = getSnakeLength();

    if (path.length === 0) return;

    // Alpha measures progress through the current movement.
    const progress = Math.max(0, Math.min(alpha, 1));

    // The head moves from its previous grid position
    // toward its current grid position.
    const headStart = path[1] ?? path[0];
    const headEnd = path[0];

    const headPosition = interpolate(
      headStart,
      headEnd,
      progress
    );

    // The tail follows the same route, separated
    // from the head by the snake's body length.
    const tailStartIndex = Math.min(length, path.length - 1);
    const tailEndIndex = Math.min(length - 1, path.length - 1);

    // When eating, the tail stays in place while the head
    // moves forward, creating smooth, continuous growth.
    const tailPosition = didGrowLastMove()
      ? path[tailEndIndex]
      : interpolate(
          path[tailStartIndex],
          path[tailEndIndex],
          progress
        );

    // Build the visible route from tail to head.
    const route = [tailPosition];

    for (let i = tailEndIndex; i >= 1; i--) {
      route.push(path[i]);
    }

    route.push(headPosition);

    // Convert all route points to canvas pixels.
    const points = route.map(toCanvas);

    // Remove duplicate neighboring points.
    const filtered = points.filter((point, index) => {
      if (index === 0) return true;

      const previous = points[index - 1];

      return (
        Math.abs(point.x - previous.x) > 0.001 ||
        Math.abs(point.y - previous.y) > 0.001
      );
    });

    // Draw the continuous body.
    ctx.strokeStyle = BODY_COLOR;
    ctx.lineWidth = CELL_SIZE * 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawRoundedPath(filtered);
    ctx.stroke();

    // Draw the head at the moving endpoint.
    const head = toCanvas(headPosition);
    const headRadius = CELL_SIZE * 0.4;

    ctx.fillStyle = HEAD_COLOR;
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
    ctx.fill();

    drawEyes(head.x, head.y, getSnakeDirection());
  }

  // ========================================================
  // Eyes
  // ========================================================

  function drawEyes(headX, headY, facing) {
    const eyeRadius = CELL_SIZE * 0.075;
    const forwardOffset = CELL_SIZE * 0.2;
    const sideOffset = CELL_SIZE * 0.17;

    const perpendicular = {
      x: -facing.y,
      y: facing.x
    };

    ctx.fillStyle = '#17212b';

    for (const side of [-1, 1]) {
      const eyeX =
        headX +
        facing.x * forwardOffset +
        perpendicular.x * sideOffset * side;

      const eyeY =
        headY +
        facing.y * forwardOffset +
        perpendicular.y * sideOffset * side;

      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ========================================================
  // Food Rendering
  // ========================================================

  function drawFood(food) {
    if (food === null) return;

    const centerX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = food.y * CELL_SIZE + CELL_SIZE / 2;
    const radius = CELL_SIZE * 0.22;

    ctx.save();

    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = CELL_SIZE * 0.5;

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e0f2fe';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ========================================================
  // Main Render Function
  // ========================================================

  function render(food, alpha = 1) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawFood(food);
    drawSnake(alpha);
  }

  return { render };
}
