import {
  TILE_SIZE,
  MAZE_COLUMNS,
  MAZE_ROWS,
  TILE,
  COLORS,
  WALL_THICKNESS,
  WALL_LINE_PIXEL,
  DOUBLE_WALL_SPACING,
  DOT_SIZE,
  GHOST_DOOR_THICKNESS,
  PELLET_COLOR,
  PELLET_MIN_RADIUS,
  PELLET_MAX_RADIUS,
  PELLET_PULSE_PERIOD_MS,
  PACMAN_DIAMETER,
  CHOMP_MOUTH_HALF_ANGLES_DEGREES,
  CHOMP_CYCLE_PX,
  ONE_UP_BLINK_FRAMES,
  HUD_FONT,
  HUD_LABEL_ROW,
  HUD_SCORE_ROW,
  ONE_UP_LABEL,
  ONE_UP_COL,
  HIGH_SCORE_LABEL,
  HIGH_SCORE_LABEL_COL,
  SCORE_LAST_DIGIT_COL,
  HIGH_SCORE_LAST_DIGIT_COL,
  MIN_SCORE_DIGITS,
  DIRECTION,
  GHOST_SIZE,
  GHOST_EYE_WIDTH,
  GHOST_EYE_HEIGHT,
  GHOST_PUPIL_SIZE,
  GHOST_EYE_SPACING,
  GHOST_EYES,
  GHOST_STATE_LABELS,
  DEBUG_LABEL_FONT,
  DEBUG_TARGET_SIZE,
  NO_UP_TURN_TILES,
} from './constants.js';
import { tileAt, isWall, tileToPixel, tileCenterPixel } from './maze.js';
import { getWallLines } from './wallShapes.js';

// The door sits in the ghost house's double top wall, centered between its lines.
const GHOST_DOOR_TOP =
  WALL_LINE_PIXEL + (DOUBLE_WALL_SPACING + WALL_THICKNESS - GHOST_DOOR_THICKNESS) / 2;

// A bigger pellet would spill out of its tile and over the walls next to it.
console.assert(
  PELLET_MAX_RADIUS <= TILE_SIZE / 2,
  'PELLET_MAX_RADIUS must fit inside one tile',
);

const FULL_CIRCLE = 2 * Math.PI;

// True during the "on" half of a blink cycle that is halfFrames long per half.
function isBlinkOn(frameCount, halfFrames) {
  return Math.floor(frameCount / halfFrames) % 2 === 0;
}

// Math.sin swings smoothly between -1 and 1, slowing down at both ends like
// a pendulum. Shifted to 0..1, it blends between the smallest and largest radius.
function pelletRadius(elapsedMs) {
  const angle = (elapsedMs / PELLET_PULSE_PERIOD_MS) * FULL_CIRCLE;
  const wave = (1 + Math.sin(angle)) / 2;
  return PELLET_MIN_RADIUS + (PELLET_MAX_RADIUS - PELLET_MIN_RADIUS) * wave;
}

export function drawMaze(context, elapsedMs) {
  drawWalls(context);
  // Same size for every pellet this frame, so it is computed once.
  const radius = pelletRadius(elapsedMs);
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLUMNS; col++) {
      drawTileContent(context, col, row, radius);
    }
  }
}

function drawTileContent(context, col, row, pelletRadiusNow) {
  const tile = tileAt(col, row);
  if (tile === TILE.DOT) {
    drawDot(context, col, row);
  } else if (tile === TILE.POWER_PELLET) {
    drawPowerPellet(context, col, row, pelletRadiusNow);
  } else if (tile === TILE.GHOST_DOOR) {
    drawGhostDoor(context, col, row);
  }
}

function drawWalls(context) {
  context.fillStyle = COLORS.WALL;
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLUMNS; col++) {
      if (isWall(col, row)) {
        drawWallTile(context, col, row);
      }
    }
  }
}

function drawWallTile(context, col, row) {
  const { x, y } = tileToPixel(col, row);
  for (const line of getWallLines(col, row)) {
    drawWallLine(context, x, y, line);
  }
}

// Corners are rounded; straight walls and T-junctions are drawn arm by arm.
function drawWallLine(context, x, y, line) {
  if (line.corner) {
    drawRoundedCorner(context, x, y, line);
  } else {
    for (const arm of line.arms) {
      drawArm(context, x, y, line, arm);
    }
  }
}

// The pixel at the tile edge in a direction: 0 going back, TILE_SIZE - 1 going forward.
function edgePixel(direction) {
  return direction > 0 ? TILE_SIZE - 1 : 0;
}

// Fills the pixels between two offsets (both included) inside a tile,
// along the line's row or column.
function fillHorizontalRun(context, x, y, lineY, fromPixel, toPixel) {
  const start = Math.min(fromPixel, toPixel);
  const length = Math.abs(toPixel - fromPixel) + 1;
  context.fillRect(x + start, y + lineY, length, WALL_THICKNESS);
}

function fillVerticalRun(context, x, y, lineX, fromPixel, toPixel) {
  const start = Math.min(fromPixel, toPixel);
  const length = Math.abs(toPixel - fromPixel) + 1;
  context.fillRect(x + lineX, y + start, WALL_THICKNESS, length);
}

// An arm goes from the line's crossing point to the tile edge, so it meets
// the neighbor's arm pixel-to-pixel with no gap.
function drawArm(context, x, y, { lineX, lineY }, { deltaCol, deltaRow }) {
  if (deltaCol !== 0) {
    fillHorizontalRun(context, x, y, lineY, lineX, edgePixel(deltaCol));
  } else {
    fillVerticalRun(context, x, y, lineX, lineY, edgePixel(deltaRow));
  }
}

// Both arms stop `cornerRadius` pixels before the corner point, and a
// quarter circle of pixels joins them.
function drawRoundedCorner(context, x, y, { lineX, lineY, cornerRadius, corner }) {
  const { horizontalDirection, verticalDirection } = corner;
  const runStartX = lineX + horizontalDirection * cornerRadius;
  const runStartY = lineY + verticalDirection * cornerRadius;
  fillHorizontalRun(context, x, y, lineY, runStartX, edgePixel(horizontalDirection));
  fillVerticalRun(context, x, y, lineX, runStartY, edgePixel(verticalDirection));

  for (const { alongHorizontal, alongVertical } of cornerArcPixels(cornerRadius)) {
    context.fillRect(
      x + lineX + horizontalDirection * alongHorizontal,
      y + lineY + verticalDirection * alongVertical,
      WALL_THICKNESS,
      WALL_THICKNESS,
    );
  }
}

const arcPixelsByRadius = new Map();

// Pixels of a quarter circle that bends from the horizontal arm into the
// vertical one, measured from the corner point along each arm. Uses the
// Bresenham midpoint circle algorithm: whole pixels, one pixel thick, no
// gaps, and arcs of different radii share a center so parallel lines stay
// evenly spaced.
function cornerArcPixels(radius) {
  if (arcPixelsByRadius.has(radius)) {
    return arcPixelsByRadius.get(radius);
  }

  const pixels = [];
  let circleX = 0;
  let circleY = radius;
  let decision = 3 - 2 * radius;
  // One eighth of the circle is computed; mirroring it on the diagonal gives
  // the quarter we need.
  while (circleX <= circleY) {
    pixels.push({ alongHorizontal: radius - circleX, alongVertical: radius - circleY });
    pixels.push({ alongHorizontal: radius - circleY, alongVertical: radius - circleX });
    if (decision < 0) {
      decision += 4 * circleX + 6;
    } else {
      decision += 4 * (circleX - circleY) + 10;
      circleY--;
    }
    circleX++;
  }

  arcPixelsByRadius.set(radius, pixels);
  return pixels;
}

function drawDot(context, col, row) {
  const { x, y } = tileToPixel(col, row);
  const inset = (TILE_SIZE - DOT_SIZE) / 2;
  context.fillStyle = COLORS.DOT;
  context.fillRect(x + inset, y + inset, DOT_SIZE, DOT_SIZE);
}

// The one intentional exception to "whole pixels only": an anti-aliased arc
// can grow by fractions of a pixel, so the pulse is smooth instead of jumping
// between a few pixel sizes. Its edges look slightly soft when scaled up.
function drawPowerPellet(context, col, row, radius) {
  const { x, y } = tileCenterPixel(col, row);
  context.fillStyle = PELLET_COLOR;
  context.beginPath();
  context.arc(x, y, radius, 0, FULL_CIRCLE);
  context.fill();
}

function drawGhostDoor(context, col, row) {
  const { x, y } = tileToPixel(col, row);
  context.fillStyle = COLORS.GHOST_DOOR;
  context.fillRect(x, y + GHOST_DOOR_TOP, TILE_SIZE, GHOST_DOOR_THICKNESS);
}

// The middle pixel of Pac-Man's (odd-sized) sprite sits on his position.
const PACMAN_CENTER_PIXEL = (PACMAN_DIAMETER - 1) / 2;
const PACMAN_RADIUS = PACMAN_DIAMETER / 2;
const DEGREES_PER_HALF_TURN = 180;
const CHOMP_MOUTH_HALF_ANGLES = CHOMP_MOUTH_HALF_ANGLES_DEGREES.map(
  (degrees) => degrees * Math.PI / DEGREES_PER_HALF_TURN,
);

// One list of lit pixels per direction and chomp frame, built on first use.
const pacmanPixelsCache = new Map();

// How far through the current chomp cycle Pac-Man is (0 up to, not
// including, 1), spread evenly over the mouth frames.
function chompFrame(pacman) {
  const cycleProgress = (pacman.distanceTraveled % CHOMP_CYCLE_PX) / CHOMP_CYCLE_PX;
  return Math.floor(cycleProgress * CHOMP_MOUTH_HALF_ANGLES.length);
}

// Lit pixels of a circle with a wedge cut out in the facing direction.
function pacmanPixels(direction, frame) {
  const cacheKey = `${direction.x},${direction.y},${frame}`;
  if (pacmanPixelsCache.has(cacheKey)) {
    return pacmanPixelsCache.get(cacheKey);
  }

  const mouthHalfAngle = CHOMP_MOUTH_HALF_ANGLES[frame];
  const pixels = [];
  for (let pixelRow = 0; pixelRow < PACMAN_DIAMETER; pixelRow++) {
    for (let pixelCol = 0; pixelCol < PACMAN_DIAMETER; pixelCol++) {
      const offsetX = pixelCol - PACMAN_CENTER_PIXEL;
      const offsetY = pixelRow - PACMAN_CENTER_PIXEL;
      const isMouth = isInsideMouth(offsetX, offsetY, direction, mouthHalfAngle);
      if (isInsideCircle(offsetX, offsetY) && !isMouth) {
        pixels.push({ pixelCol, pixelRow });
      }
    }
  }

  pacmanPixelsCache.set(cacheKey, pixels);
  return pixels;
}

function isInsideCircle(offsetX, offsetY) {
  return offsetX * offsetX + offsetY * offsetY <= PACMAN_RADIUS * PACMAN_RADIUS;
}

// The angle between the pixel and the facing direction comes from the dot
// product (how much they agree) and the cross product (how much they differ).
// A closed mouth (angle 0) cuts nothing, which leaves a full circle.
function isInsideMouth(offsetX, offsetY, direction, mouthHalfAngle) {
  if (offsetX === 0 && offsetY === 0) {
    return false;
  }
  const dot = offsetX * direction.x + offsetY * direction.y;
  const cross = offsetX * direction.y - offsetY * direction.x;
  return Math.abs(Math.atan2(cross, dot)) < mouthHalfAngle;
}

// HUD positions are screen tiles, not maze tiles, so tileToPixel (which
// skips the HUD rows) does not apply here.
function screenTileToPixel(col, row) {
  return { x: col * TILE_SIZE, y: row * TILE_SIZE };
}

// Whole-pixel coordinates plus the 8px font keep every glyph pixel aligned
// with a game pixel, so the text scales up as crisply as the maze.
function drawHudText(context, text, col, row, align) {
  const { x, y } = screenTileToPixel(col, row);
  context.textAlign = align;
  context.fillText(text, x, y);
}

function formatScore(score) {
  return String(score).padStart(MIN_SCORE_DIGITS, '0');
}

export function drawHud(context, score, highScore, frameCount) {
  context.font = HUD_FONT;
  context.fillStyle = COLORS.HUD_TEXT;
  // 'top' puts the glyph's top edge on y, so a row of text fills exactly one tile row.
  context.textBaseline = 'top';

  if (isBlinkOn(frameCount, ONE_UP_BLINK_FRAMES)) {
    drawHudText(context, ONE_UP_LABEL, ONE_UP_COL, HUD_LABEL_ROW, 'left');
  }
  drawHudText(context, HIGH_SCORE_LABEL, HIGH_SCORE_LABEL_COL, HUD_LABEL_ROW, 'left');

  // Right-aligned text ends at x, so x is the right edge of the last digit's tile.
  drawHudText(context, formatScore(score), SCORE_LAST_DIGIT_COL + 1, HUD_SCORE_ROW, 'right');
  drawHudText(
    context, formatScore(highScore), HIGH_SCORE_LAST_DIGIT_COL + 1, HUD_SCORE_ROW, 'right',
  );
}

export function drawPacman(context, pacman) {
  const left = Math.floor(pacman.x) - PACMAN_CENTER_PIXEL;
  const top = Math.floor(pacman.y) - PACMAN_CENTER_PIXEL;
  context.fillStyle = COLORS.PACMAN;
  for (const { pixelCol, pixelRow } of pacmanPixels(pacman.direction, chompFrame(pacman))) {
    context.fillRect(left + pixelCol, top + pixelRow, 1, 1);
  }
}

// Ghost body, one string per pixel row, '#' = lit pixel: round top, straight
// sides and a wavy skirt. A single still frame; the moving skirt and the
// move to sprites.js come in stage 11.
const GHOST_BODY_ROWS = [
  '     ####     ',
  '   ########   ',
  '  ##########  ',
  ' ############ ',
  ' ############ ',
  ' ############ ',
  '##############',
  '##############',
  '##############',
  '##############',
  '##############',
  '##############',
  '## ###  ### ##',
  '#   ##  ##   #',
];

// Eyeball with its corners cut off, so it looks round.
const GHOST_EYE_ROWS = [
  ' ## ',
  '####',
  '####',
  '####',
  ' ## ',
];

const LIT_PIXEL = '#';

// The arrays are checked like the maze layout: one missing character would
// shift a whole row of pixels.
console.assert(
  GHOST_BODY_ROWS.length === GHOST_SIZE &&
    GHOST_BODY_ROWS.every((rowText) => rowText.length === GHOST_SIZE),
  `Ghost body must be ${GHOST_SIZE}x${GHOST_SIZE} pixels`,
);
console.assert(
  GHOST_EYE_ROWS.length === GHOST_EYE_HEIGHT &&
    GHOST_EYE_ROWS.every((rowText) => rowText.length === GHOST_EYE_WIDTH),
  `Ghost eye must be ${GHOST_EYE_WIDTH}x${GHOST_EYE_HEIGHT} pixels`,
);

// Turns rows of text into a list of lit pixels, once, at load time.
function pixelsFromRows(rows) {
  const pixels = [];
  rows.forEach((rowText, pixelRow) => {
    [...rowText].forEach((character, pixelCol) => {
      if (character === LIT_PIXEL) {
        pixels.push({ pixelCol, pixelRow });
      }
    });
  });
  return pixels;
}

const GHOST_BODY_PIXELS = pixelsFromRows(GHOST_BODY_ROWS);
const GHOST_EYE_PIXELS = pixelsFromRows(GHOST_EYE_ROWS);

// Keyed by the direction objects themselves, so the lookup compares by
// identity like the rest of the code (direction === DIRECTION.LEFT).
const GHOST_EYES_BY_DIRECTION = new Map([
  [DIRECTION.LEFT, GHOST_EYES.LEFT],
  [DIRECTION.RIGHT, GHOST_EYES.RIGHT],
  [DIRECTION.UP, GHOST_EYES.UP],
  [DIRECTION.DOWN, GHOST_EYES.DOWN],
]);

// The 14-pixel sprite has no middle pixel; this choice puts its center on
// the same pixel as Pac-Man's, so both line up on the same tile.
const GHOST_CENTER_PIXEL = GHOST_SIZE / 2 - 1;
const GHOST_EYE_COUNT = 2;

function fillPixels(context, left, top, pixels) {
  for (const { pixelCol, pixelRow } of pixels) {
    context.fillRect(left + pixelCol, top + pixelRow, 1, 1);
  }
}

// White eyeballs first, then the pupils on top. Both shift with the
// direction, so the ghost looks where it is going.
function drawGhostEyes(context, left, top, direction) {
  const { eyeCol, eyeRow, pupilCol, pupilRow } = GHOST_EYES_BY_DIRECTION.get(direction);
  for (let eye = 0; eye < GHOST_EYE_COUNT; eye++) {
    const eyeLeft = left + eyeCol + eye * GHOST_EYE_SPACING;
    const eyeTop = top + eyeRow;
    context.fillStyle = COLORS.GHOST_EYE_WHITE;
    fillPixels(context, eyeLeft, eyeTop, GHOST_EYE_PIXELS);
    context.fillStyle = COLORS.GHOST_PUPIL;
    context.fillRect(eyeLeft + pupilCol, eyeTop + pupilRow, GHOST_PUPIL_SIZE, GHOST_PUPIL_SIZE);
  }
}

function drawGhost(context, ghost) {
  const left = Math.floor(ghost.x) - GHOST_CENTER_PIXEL;
  const top = Math.floor(ghost.y) - GHOST_CENTER_PIXEL;
  context.fillStyle = ghost.color;
  fillPixels(context, left, top, GHOST_BODY_PIXELS);
  drawGhostEyes(context, left, top, ghost.direction);
}

// Debug only: the ghost's state, centered just above its sprite.
function drawGhostStateLabel(context, ghost) {
  const top = Math.floor(ghost.y) - GHOST_CENTER_PIXEL;
  context.font = DEBUG_LABEL_FONT;
  context.fillStyle = ghost.color;
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  context.fillText(GHOST_STATE_LABELS[ghost.state], Math.floor(ghost.x), top);
}

// Debug only: a square on the target tile and a line from the ghost to it.
// A plain canvas line is anti-aliased, which is fine for a debug aid; the
// 0.5 offset puts a 1-pixel line on a pixel row instead of between two.
// Targets outside the screen are simply clipped by the canvas.
function drawGhostTarget(context, ghost) {
  const target = tileCenterPixel(ghost.targetTile.col, ghost.targetTile.row);
  context.strokeStyle = ghost.color;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(Math.floor(ghost.x) + 0.5, Math.floor(ghost.y) + 0.5);
  context.lineTo(target.x + 0.5, target.y + 0.5);
  context.stroke();
  context.fillStyle = ghost.color;
  context.fillRect(
    target.x - DEBUG_TARGET_SIZE / 2,
    target.y - DEBUG_TARGET_SIZE / 2,
    DEBUG_TARGET_SIZE,
    DEBUG_TARGET_SIZE,
  );
}

// Debug only: a frame around each tile where ghosts may not turn up, to
// check by eye that the constants point at the right tiles.
function drawNoUpTurnTiles(context) {
  context.strokeStyle = COLORS.DEBUG_NO_UP_TILE;
  context.lineWidth = 1;
  for (const { col, row } of NO_UP_TURN_TILES) {
    const { x, y } = tileToPixel(col, row);
    context.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  }
}

export function drawGhosts(context, ghosts, showDebug) {
  if (showDebug) {
    drawNoUpTurnTiles(context);
  }
  for (const ghost of ghosts) {
    drawGhost(context, ghost);
  }
  // Drawn after all ghosts, so no ghost body hides another ghost's target
  // or label.
  if (showDebug) {
    for (const ghost of ghosts) {
      if (ghost.targetTile) {
        drawGhostTarget(context, ghost);
      }
      drawGhostStateLabel(context, ghost);
    }
  }
}
