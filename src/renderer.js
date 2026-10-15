import {
  getGridDimensions,
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

  const GRID_COLOR = '#35414d';
  const CORNER_RADIUS = 0.35;

  // High Score Mode grid colors.
  const HIGH_SCORE_GRID_COLOR = '#b89645';
  const HIGH_SCORE_FLASH_COLOR = '#ffe49a';
  const HIGH_SCORE_FLASH_DURATION = 1600;

  let highScoreMode = false;
  let highScoreFlashStart = -1;

  // Snake changes color every 10 points.
  const SNAKE_COLORS = [
    '#4ade80', // Green
    '#38bdf8', // Blue
    '#a78bfa', // Purple
    '#f472b6', // Pink
    '#fbbf24'  // Gold
  ];

  const COLOR_TRANSITION_DURATION = 1000;

  let currentColor = SNAKE_COLORS[0];
  let previousColor = SNAKE_COLORS[0];
  let targetColor = SNAKE_COLORS[0];
  let transitionStart = 0;

  // ========================================================
  // Head Animation Configuration
  // ========================================================

  const BLINK_DURATION = 170;
  const TONGUE_DURATION = 420;
  const EAT_DURATION = 320;
  const COLLISION_DURATION = 750;

  const HEAD_EYE_COLOR = '#17212b';
  const TONGUE_COLOR = '#fb7185';

  let nextBlinkTime = 0;
  let blinkStartTime = -1;

  let nextTongueTime = 0;
  let tongueStartTime = -1;

  let eatStartTime = -1;
  let collisionStartTime = -1;

  // ========================================================
  // General Helpers
  // ========================================================

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function smoothstep(value) {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  }

  function getCellSize() {
    const { cols, rows } = getGridDimensions();

    return Math.min(
      canvas.width / cols,
      canvas.height / rows
    );
  }

  function toCanvas(point, cellSize) {
    return {
      x: point.x * cellSize + cellSize / 2,
      y: point.y * cellSize + cellSize / 2
    };
  }

  function interpolate(start, end, alpha) {
    return {
      x: start.x + (end.x - start.x) * alpha,
      y: start.y + (end.y - start.y) * alpha
    };
  }

  // ========================================================
  // Color Helpers
  // ========================================================

  function hexToRgb(hex) {
    const value = hex.replace('#', '');

    return {
      r: parseInt(value.substring(0, 2), 16),
      g: parseInt(value.substring(2, 4), 16),
      b: parseInt(value.substring(4, 6), 16)
    };
  }

  function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b]
      .map(value =>
        Math.round(value).toString(16).padStart(2, '0')
      )
      .join('');
  }

  function blendColors(start, end, amount) {
    const a = hexToRgb(start);
    const b = hexToRgb(end);
    const t = clamp(amount);

    return rgbToHex({
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t
    });
  }

  function updateSnakeColor(score, timestamp) {
    const colorIndex =
      Math.floor(score / 10) % SNAKE_COLORS.length;

    const nextColor = SNAKE_COLORS[colorIndex];

    if (nextColor !== targetColor) {
      previousColor = currentColor;
      targetColor = nextColor;
      transitionStart = timestamp;
    }

    const progress = clamp(
      (timestamp - transitionStart) /
      COLOR_TRANSITION_DURATION
    );

    currentColor = blendColors(
      previousColor,
      targetColor,
      smoothstep(progress)
    );

    return currentColor;
  }

  // ========================================================
  // High Score Mode
  // ========================================================

  function activateHighScoreMode(
    timestamp = performance.now(),
    playFlash = true
  ) {
    highScoreMode = true;

    // A restored game keeps its glow without replaying
    // the initial celebration.
    highScoreFlashStart = playFlash ? timestamp : -1;
  }

  function resetHighScoreMode() {
    highScoreMode = false;
    highScoreFlashStart = -1;
  }

  function getGridAppearance(timestamp) {
    if (!highScoreMode) {
      return {
        color: GRID_COLOR,
        glow: false,
        flash: 0
      };
    }

    let flash = 0;

    if (highScoreFlashStart >= 0) {
      const progress = clamp(
        (timestamp - highScoreFlashStart) /
        HIGH_SCORE_FLASH_DURATION
      );

      // Two quick pulses that fade into the persistent glow.
      flash =
        Math.pow(1 - progress, 2) *
        Math.pow(Math.sin(progress * Math.PI * 3), 2);

      if (progress >= 1) {
        highScoreFlashStart = -1;
      }
    }

    return {
      color: blendColors(
        HIGH_SCORE_GRID_COLOR,
        HIGH_SCORE_FLASH_COLOR,
        flash
      ),
      glow: true,
      flash
    };
  }

  // ========================================================
  // Head Animation State
  // ========================================================

  function updateHeadAnimations(timestamp) {
    // Schedule blinking at irregular intervals.
    if (nextBlinkTime === 0) {
      nextBlinkTime = timestamp + randomBetween(1800, 4800);
    }

    if (
      blinkStartTime < 0 &&
      timestamp >= nextBlinkTime
    ) {
      blinkStartTime = timestamp;
    }

    if (
      blinkStartTime >= 0 &&
      timestamp - blinkStartTime >= BLINK_DURATION
    ) {
      blinkStartTime = -1;
      nextBlinkTime = timestamp + randomBetween(1800, 4800);
    }

    // Schedule tongue flicks independently.
    if (nextTongueTime === 0) {
      nextTongueTime = timestamp + randomBetween(1400, 4200);
    }

    if (
      tongueStartTime < 0 &&
      timestamp >= nextTongueTime
    ) {
      tongueStartTime = timestamp;
    }

    if (
      tongueStartTime >= 0 &&
      timestamp - tongueStartTime >= TONGUE_DURATION
    ) {
      tongueStartTime = -1;
      nextTongueTime = timestamp + randomBetween(1400, 4200);
    }
  }

  function getBlinkAmount(timestamp) {
    if (blinkStartTime < 0) return 0;

    const progress = clamp(
      (timestamp - blinkStartTime) / BLINK_DURATION
    );

    // Close and reopen in a single animation.
    return Math.sin(progress * Math.PI);
  }

  function getTongueAmount(timestamp) {
    if (tongueStartTime < 0) return 0;

    const progress = clamp(
      (timestamp - tongueStartTime) / TONGUE_DURATION
    );

    // Fast extension followed by retraction.
    return Math.sin(progress * Math.PI);
  }

  function getEatAmount(timestamp) {
    if (eatStartTime < 0) return 0;

    const progress =
      (timestamp - eatStartTime) / EAT_DURATION;

    if (progress >= 1) {
      eatStartTime = -1;
      return 0;
    }

    return Math.sin(clamp(progress) * Math.PI);
  }

  function getCollisionProgress(timestamp) {
    if (collisionStartTime < 0) return -1;

    return clamp(
      (timestamp - collisionStartTime) /
      COLLISION_DURATION
    );
  }

  function triggerEat(timestamp = performance.now()) {
    eatStartTime = timestamp;
  }

  function triggerCollision(timestamp = performance.now()) {
    collisionStartTime = timestamp;
    eatStartTime = -1;
    tongueStartTime = -1;
  }

  function resetHeadAnimations() {
    nextBlinkTime = 0;
    blinkStartTime = -1;

    nextTongueTime = 0;
    tongueStartTime = -1;

    eatStartTime = -1;
    collisionStartTime = -1;
  }

  // ========================================================
  // Grid Rendering
  // ========================================================

  function drawGrid(cellSize, timestamp) {
    const { cols, rows } = getGridDimensions();
    const appearance = getGridAppearance(timestamp);

    ctx.save();

    ctx.strokeStyle = appearance.color;
    ctx.lineWidth = 1;

    if (appearance.glow) {
      ctx.shadowColor = HIGH_SCORE_FLASH_COLOR;
      ctx.shadowBlur = 4 + appearance.flash * 9;
    }

    ctx.beginPath();

    for (let x = 1; x < cols; x++) {
      const position = x * cellSize;

      ctx.moveTo(position, 0);
      ctx.lineTo(position, canvas.height);
    }

    for (let y = 1; y < rows; y++) {
      const position = y * cellSize;

      ctx.moveTo(0, position);
      ctx.lineTo(canvas.width, position);
    }

    ctx.stroke();
    ctx.restore();
  }

  // ========================================================
  // Rounded Path Geometry
  // ========================================================

  function drawRoundedPath(points, cellSize) {
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

      if (Math.abs(cross) < 0.001 || dot < -0.999) {
        ctx.lineTo(current.x, current.y);
        continue;
      }

      const radius = Math.min(
        CORNER_RADIUS * cellSize,
        length1 / 2,
        length2 / 2
      );

      ctx.lineTo(
        current.x - inX * radius,
        current.y - inY * radius
      );

      ctx.quadraticCurveTo(
        current.x,
        current.y,
        current.x + outX * radius,
        current.y + outY * radius
      );
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  // ========================================================
  // Eye Rendering
  // ========================================================

  function drawEyes(
    cellSize,
    blinkAmount,
    collisionProgress
  ) {
    const eyeX = cellSize * 0.16;
    const eyeY = cellSize * 0.19;
    const eyeRadius = cellSize * 0.085;

    ctx.strokeStyle = HEAD_EYE_COLOR;
    ctx.fillStyle = HEAD_EYE_COLOR;
    ctx.lineCap = 'round';

    for (const side of [-1, 1]) {
      const y = eyeY * side;

      // X eyes after a collision.
      if (collisionProgress >= 0) {
        const size = eyeRadius * 0.85;

        ctx.lineWidth = cellSize * 0.065;
        ctx.beginPath();

        ctx.moveTo(eyeX - size, y - size);
        ctx.lineTo(eyeX + size, y + size);

        ctx.moveTo(eyeX + size, y - size);
        ctx.lineTo(eyeX - size, y + size);

        ctx.stroke();
        continue;
      }

      // Closed eyelid.
      if (blinkAmount > 0.85) {
        ctx.lineWidth = cellSize * 0.06;
        ctx.beginPath();

        ctx.moveTo(eyeX - eyeRadius, y);
        ctx.quadraticCurveTo(
          eyeX,
          y + side * eyeRadius * 0.4,
          eyeX + eyeRadius,
          y
        );

        ctx.stroke();
        continue;
      }

      // Animated eye height during blinking.
      const eyeHeight = Math.max(
        eyeRadius * 0.08,
        eyeRadius * (1 - blinkAmount)
      );

      ctx.beginPath();
      ctx.ellipse(
        eyeX,
        y,
        eyeRadius,
        eyeHeight,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Small highlight when the eyes are open.
      if (blinkAmount < 0.3) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();

        ctx.arc(
          eyeX + eyeRadius * 0.25,
          y - eyeRadius * 0.3,
          eyeRadius * 0.22,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.fillStyle = HEAD_EYE_COLOR;
      }
    }
  }

  // ========================================================
  // Tongue Rendering
  // ========================================================

  function drawTongue(cellSize, amount) {
    if (amount <= 0.01) return;

    const baseX = cellSize * 0.39;
    const length = cellSize * 0.32 * amount;

    const tipX = baseX + length;
    const forkLength = cellSize * 0.11 * amount;

    ctx.strokeStyle = TONGUE_COLOR;
    ctx.lineWidth = cellSize * 0.055;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(baseX, 0);
    ctx.lineTo(tipX, 0);

    ctx.moveTo(tipX - forkLength * 0.4, 0);
    ctx.lineTo(tipX + forkLength, -forkLength * 0.6);

    ctx.moveTo(tipX - forkLength * 0.4, 0);
    ctx.lineTo(tipX + forkLength, forkLength * 0.6);

    ctx.stroke();
  }

  // ========================================================
  // Mouth Rendering
  // ========================================================

  function drawMouth(cellSize, eatAmount) {
    if (eatAmount <= 0.01) return;

    const mouthX = cellSize * 0.4;
    const mouthWidth = cellSize * 0.12;
    const mouthHeight = cellSize * 0.24 * eatAmount;

    ctx.fillStyle = '#6b2737';

    ctx.beginPath();
    ctx.ellipse(
      mouthX,
      0,
      mouthWidth,
      mouthHeight,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // ========================================================
  // Animated Head Rendering
  // ========================================================

  function drawHead(
    head,
    facing,
    cellSize,
    bodyColor,
    timestamp
  ) {
    const collisionProgress =
      getCollisionProgress(timestamp);

    const isColliding = collisionProgress >= 0;

    const blinkAmount = isColliding
      ? 0
      : getBlinkAmount(timestamp);

    const tongueAmount = isColliding
      ? 0
      : getTongueAmount(timestamp);

    const eatAmount = isColliding
      ? 0
      : getEatAmount(timestamp);

    // Direction of travel becomes the local X axis.
    const angle = Math.atan2(facing.y, facing.x);

    const headColor = blendColors(
      bodyColor,
      '#ffffff',
      0.2
    );

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);

    // Subtle recoil and wobble on collision.
    if (isColliding) {
      const decay = 1 - collisionProgress;

      const recoil =
        Math.sin(collisionProgress * Math.PI) *
        cellSize * 0.12;

      const wobble =
        Math.sin(collisionProgress * Math.PI * 8) *
        0.1 * decay;

      ctx.translate(-recoil, 0);
      ctx.rotate(wobble);
    }

    // Brief expansion when eating.
    const scale = 1 + eatAmount * 0.16;
    ctx.scale(scale, scale);

    let finalHeadColor = headColor;

    // Flash toward white during collision.
    if (isColliding) {
      const flash =
        Math.pow(1 - collisionProgress, 2) *
        (0.5 + 0.5 *
          Math.sin(collisionProgress * Math.PI * 12));

      finalHeadColor = blendColors(
        headColor,
        '#ffffff',
        clamp(flash * 0.65)
      );
    }

    // Elongated rounded head, facing right in local space.
    ctx.fillStyle = finalHeadColor;

    ctx.beginPath();
    ctx.ellipse(
      cellSize * 0.035,
      0,
      cellSize * 0.46,
      cellSize * 0.41,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // A subtle highlight over the snout.
    ctx.fillStyle = blendColors(
      finalHeadColor,
      '#ffffff',
      0.13
    );

    ctx.beginPath();
    ctx.ellipse(
      cellSize * 0.23,
      -cellSize * 0.10,
      cellSize * 0.12,
      cellSize * 0.08,
      -0.25,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw mouth and tongue behind facial details.
    drawMouth(cellSize, eatAmount);

    if (!isColliding && eatAmount < 0.35) {
      drawTongue(cellSize, tongueAmount);
    }

    drawEyes(
      cellSize,
      blinkAmount,
      collisionProgress
    );

    ctx.restore();
  }

  // ========================================================
  // Snake Rendering
  // ========================================================

  function drawSnake(alpha, cellSize, bodyColor, timestamp) {
    const path = getSnakePath();
    const length = getSnakeLength();

    if (path.length === 0) return;

    const progress = clamp(alpha);

    const headStart = path[1] ?? path[0];
    const headEnd = path[0];

    const headPosition = interpolate(
      headStart,
      headEnd,
      progress
    );

    const tailStartIndex = Math.min(
      length,
      path.length - 1
    );

    const tailEndIndex = Math.min(
      length - 1,
      path.length - 1
    );

    const tailPosition = didGrowLastMove()
      ? path[tailEndIndex]
      : interpolate(
          path[tailStartIndex],
          path[tailEndIndex],
          progress
        );

    const route = [tailPosition];

    for (let i = tailEndIndex; i >= 1; i--) {
      route.push(path[i]);
    }

    route.push(headPosition);

    const points = route.map(point =>
      toCanvas(point, cellSize)
    );

    const filtered = points.filter((point, index) => {
      if (index === 0) return true;

      const previous = points[index - 1];

      return (
        Math.abs(point.x - previous.x) > 0.001 ||
        Math.abs(point.y - previous.y) > 0.001
      );
    });

    // Continuous rounded snake body.
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = cellSize * 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawRoundedPath(filtered, cellSize);
    ctx.stroke();

    const head = toCanvas(headPosition, cellSize);

    drawHead(
      head,
      getSnakeDirection(),
      cellSize,
      bodyColor,
      timestamp
    );
  }

  // ========================================================
  // Food Rendering
  // ========================================================

  function drawFood(food, cellSize, timestamp) {
    if (food === null) return;

    const centerX =
      food.x * cellSize + cellSize / 2;

    const centerY =
      food.y * cellSize + cellSize / 2;

    const color = food.color ?? '#38bdf8';

    const pulse = (
      Math.sin(timestamp * 0.004) + 1
    ) / 2;

    const radius =
      cellSize * (0.20 + pulse * 0.045);

    const glowRadius =
      cellSize * (0.4 + pulse * 0.3);

    ctx.save();

    const glow = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      glowRadius
    );

    glow.addColorStop(0, `${color}99`);
    glow.addColorStop(0.35, `${color}55`);
    glow.addColorStop(1, `${color}00`);

    ctx.fillStyle = glow;
    ctx.beginPath();

    ctx.arc(
      centerX,
      centerY,
      glowRadius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.shadowColor = color;
    ctx.shadowBlur =
      cellSize * (0.5 + pulse * 0.35);

    ctx.fillStyle = color;
    ctx.beginPath();

    ctx.arc(
      centerX,
      centerY,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';

    ctx.beginPath();

    ctx.arc(
      centerX - radius * 0.25,
      centerY - radius * 0.25,
      radius * 0.25,
      0,
      Math.PI * 2
    );

    ctx.fill();
    ctx.restore();
  }

  // ========================================================
  // Main Render Function
  // ========================================================

  function render(
    food,
    alpha = 1,
    score = 0,
    timestamp = performance.now(),
    showSnake = true
  ) {
    const cellSize = getCellSize();

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const bodyColor = updateSnakeColor(
      score,
      timestamp
    );

    drawGrid(cellSize, timestamp);

    if (showSnake) {
      updateHeadAnimations(timestamp);

      drawFood(food, cellSize, timestamp);

      drawSnake(
        alpha,
        cellSize,
        bodyColor,
        timestamp
      );
    }
  }

  return {
    render,
    triggerEat,
    triggerCollision,
    resetHeadAnimations,
    activateHighScoreMode,
    resetHighScoreMode,
    COLLISION_DURATION
  };
}