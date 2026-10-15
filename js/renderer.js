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
  GHOST_STATE,
  GHOST_SKIRT_FRAME_MS,
  GHOST_STATE_LABELS,
  DEBUG_LABEL_FONT,
  DEBUG_TARGET_SIZE,
  DEBUG_ELROY_LABEL,
  DEBUG_CENTER_DOT_REACH_DEVICE_PX,
  NO_UP_TURN_TILES,
  MESSAGE_ROW,
  MESSAGE_CENTER_COL,
  DEATH_ANIMATION_FRAMES,
  LIVES_ROW,
  LIVES_FIRST_COL,
  LIVES_ICON_SPACING_TILES,
  HUD_FONT_SIZE,
  HUD_LEVEL_CENTER_COL,
  LEVEL_LABEL,
  FRUIT_TILE,
  FRUIT_HUD_RIGHT_COL,
  FRUIT_HUD_SPACING_TILES,
  FRUIT,
  FRUIT_ART_SIZE,
  FRUIT_GALLERY_ZOOM,
  FRUIT_GALLERY_COLUMNS,
  FRUIT_GALLERY_GAP,
  FRUIT_GALLERY_LABEL_HEIGHT,
  FRUIT_GALLERY_BACKGROUND,
  FRUIT_GALLERY_BORDER,
  FRUIT_GALLERY_LABEL_COLOR,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PAUSED_TEXT,
  PAUSE_HINT_TEXT,
  PAUSED_ROW,
  PAUSE_HINT_ROW,
  MUTE_ICON_COL,
  MUTE_ICON_ROW,
} from './constants.js';
import { tileAt, isWall, tileToPixel, tileCenterPixel } from './maze.js';
import { getWallLines } from './wallShapes.js';
import { getFruitImage } from './fruitArt.js';
import {
  getPacmanImage,
  getGhostImage,
  getFrightenedGhostImage,
  getGhostEyesImage,
  GHOST_SKIRT_FRAME_COUNT,
  GHOST_PICTURE_SIZE,
} from './sprites.js';

// The door sits in the ghost house's double top wall, centered between its lines.
const GHOST_DOOR_TOP =
  WALL_LINE_PIXEL + (DOUBLE_WALL_SPACING + WALL_THICKNESS - GHOST_DOOR_THICKNESS) / 2;

// A bigger pellet would spill out of its tile and over the walls next to it.
console.assert(
  PELLET_MAX_RADIUS <= TILE_SIZE / 2,
  'PELLET_MAX_RADIUS must fit inside one tile',
);

const FULL_CIRCLE = 2 * Math.PI;

// True during the "on" half of a blink cycle that is halfPeriod long per
// half. Works with any counter: update frames (the HUD) or milliseconds.
export function isBlinkOn(time, halfPeriod) {
  return Math.floor(time / halfPeriod) % 2 === 0;
}

// Math.sin swings smoothly between -1 and 1, slowing down at both ends like
// a pendulum. Shifted to 0..1, it blends between the smallest and largest radius.
function pelletRadius(elapsedMs) {
  const angle = (elapsedMs / PELLET_PULSE_PERIOD_MS) * FULL_CIRCLE;
  const wave = (1 + Math.sin(angle)) / 2;
  return PELLET_MIN_RADIUS + (PELLET_MAX_RADIUS - PELLET_MIN_RADIUS) * wave;
}

// wallColor and isDoorVisible change only while the maze flashes at the end
// of a level (the door vanishes then, as in the arcade).
export function drawMaze(context, elapsedMs, { wallColor, isDoorVisible }) {
  drawWalls(context, wallColor);
  // Same size for every pellet this frame, so it is computed once.
  const radius = pelletRadius(elapsedMs);
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLUMNS; col++) {
      drawTileContent(context, col, row, radius, isDoorVisible);
    }
  }
}

function drawTileContent(context, col, row, pelletRadiusNow, isDoorVisible) {
  const tile = tileAt(col, row);
  if (tile === TILE.DOT) {
    drawDot(context, col, row);
  } else if (tile === TILE.POWER_PELLET) {
    drawPowerPellet(context, col, row, pelletRadiusNow);
  } else if (tile === TILE.GHOST_DOOR && isDoorVisible) {
    drawGhostDoor(context, col, row);
  }
}

function drawWalls(context, wallColor) {
  context.fillStyle = wallColor;
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
  drawDotAt(context, x, y);
}

// A dot in the tile whose top-left corner is (x, y): also used off the maze
// (the attract screen's points table).
export function drawDotAt(context, x, y) {
  const inset = (TILE_SIZE - DOT_SIZE) / 2;
  context.fillStyle = COLORS.DOT;
  context.fillRect(x + inset, y + inset, DOT_SIZE, DOT_SIZE);
}

function drawPowerPellet(context, col, row, radius) {
  const { x, y } = tileCenterPixel(col, row);
  fillPowerPellet(context, x, y, radius);
}

// A pulsing pellet centered on (x, y), off the maze (the attract screen).
export function drawPowerPelletAt(context, x, y, elapsedMs) {
  fillPowerPellet(context, x, y, pelletRadius(elapsedMs));
}

// The one intentional exception to "whole pixels only": an anti-aliased arc
// can grow by fractions of a pixel, so the pulse is smooth instead of jumping
// between a few pixel sizes. Its edges look slightly soft when scaled up.
function fillPowerPellet(context, x, y, radius) {
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

// A character's position is its tile's center, but the corridor's middle
// lies this much further left and up: wall lines run through pixel
// WALL_LINE_PIXEL of their tiles, half a pixel before the tile's middle.
// A one-tile corridor is open from 8 pixels before the position to 7 after.
const CORRIDOR_CENTER_SHIFT = TILE_SIZE / 2 - (WALL_LINE_PIXEL + WALL_THICKNESS / 2);

// The box a character's picture fills when centered on the corridor's middle
// next to a screen point. Whole-pixel corners keep the copy 1:1. Shared
// with the debug box, so the box always shows exactly what is drawn.
function spriteBox(x, y, size) {
  const reach = size / 2 + CORRIDOR_CENTER_SHIFT;
  return { left: Math.floor(x) - reach, top: Math.floor(y) - reach, size };
}

// A half-pixel reach would put the picture between real pixels and blur it.
console.assert(
  [PACMAN_DIAMETER, GHOST_PICTURE_SIZE].every((size) => Number.isInteger(size / 2 + CORRIDOR_CENTER_SHIFT)),
  'Character pictures must land on whole pixels',
);
const DEGREES_PER_HALF_TURN = 180;
const CHOMP_MOUTH_HALF_ANGLES = CHOMP_MOUTH_HALF_ANGLES_DEGREES.map(
  (degrees) => degrees * Math.PI / DEGREES_PER_HALF_TURN,
);
// The life icons show Pac-Man facing left with his mouth half open.
const LIFE_ICON_MOUTH_HALF_ANGLE = CHOMP_MOUTH_HALF_ANGLES[1];

// How far through the current chomp cycle Pac-Man is (0 up to, not
// including, 1), spread evenly over the mouth frames.
function chompFrame(pacman) {
  const cycleProgress = (pacman.distanceTraveled % CHOMP_CYCLE_PX) / CHOMP_CYCLE_PX;
  return Math.floor(cycleProgress * CHOMP_MOUTH_HALF_ANGLES.length);
}

// The canvas transform tells how many real pixels one game pixel has, so a
// cached picture (sprites.js, fruitArt.js) is made at exactly that
// resolution and copied 1:1.
function deviceScale(context) {
  return context.getTransform().a;
}

// HUD positions are screen tiles, not maze tiles, so tileToPixel (which
// skips the HUD rows) does not apply here.
export function screenTileToPixel(col, row) {
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

// The points for an eaten ghost, centered where the ghost was. 'top' with
// a whole-tile offset (not 'middle') keeps the glyphs on whole pixels.
export function drawGhostPoints(context, x, y, points) {
  context.font = HUD_FONT;
  context.fillStyle = COLORS.GHOST_POINTS;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  context.fillText(String(points), Math.floor(x), Math.floor(y) - TILE_SIZE / 2);
}

// Short messages ("PRESS ENTER", "GAME OVER", the level intro), centered on
// the maze, by default in the empty row under the ghost house. "READY!" is
// drawn one row lower (READY_ROW), because the level intro takes this row.
// The center is a tile edge, so an even-length text like "READY!" fills
// whole tiles (columns 11-16, the arcade's columns) and every text starts on
// a whole pixel. hasBackground clears the text's own tiles first, for a
// message placed over a wall.
export function drawMessage(context, text, color, { row = MESSAGE_ROW, hasBackground = false } = {}) {
  const { x, y } = tileToPixel(MESSAGE_CENTER_COL, row);
  context.font = HUD_FONT;
  if (hasBackground) {
    const width = context.measureText(text).width;
    context.fillStyle = COLORS.BACKGROUND;
    context.fillRect(x - width / 2, y, width, TILE_SIZE);
  }
  context.fillStyle = color;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  context.fillText(text, x, y);
}

// The permanent "LEVEL n" in the bottom HUD, centered between the lives and
// the fruits and on the same middle line as the two-tile-tall life icons.
export function drawLevel(context, level) {
  const { x, y: iconsMiddleY } = screenTileToPixel(HUD_LEVEL_CENTER_COL, LIVES_ROW + 1);
  context.font = HUD_FONT;
  context.fillStyle = COLORS.HUD_TEXT;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  context.fillText(`${LEVEL_LABEL} ${level}`, x, iconsMiddleY - HUD_FONT_SIZE / 2);
}

// Pac-Man (13 pixels) gets one empty pixel to each wall of a corridor.
function pacmanSpriteBox(x, y) {
  return spriteBox(x, y, PACMAN_DIAMETER);
}

function drawPacmanShape(context, x, y, direction, mouthHalfAngle) {
  const { left, top, size } = pacmanSpriteBox(x, y);
  const image = getPacmanImage(direction, mouthHalfAngle, deviceScale(context));
  context.drawImage(image, left, top, size, size);
}

// Debug only: Pac-Man's logical position and his picture's box.
export function drawPacmanDebug(context, pacman) {
  drawSpriteDebug(context, pacman.x, pacman.y, pacmanSpriteBox(pacman.x, pacman.y));
}

// Debug only: a frame along the inside of the picture's box and a dot on
// the logical position (x, y), both one real screen pixel thin, so a picture
// that is off-center shows as a dot away from the frame's middle.
function drawSpriteDebug(context, x, y, { left, top, size }) {
  const hairline = 1 / deviceScale(context);
  context.fillStyle = COLORS.DEBUG_SPRITE_BOX;
  context.fillRect(left, top, size, hairline);
  context.fillRect(left, top + size - hairline, size, hairline);
  context.fillRect(left, top, hairline, size);
  context.fillRect(left + size - hairline, top, hairline, size);
  const reach = DEBUG_CENTER_DOT_REACH_DEVICE_PX * hairline;
  context.fillStyle = COLORS.DEBUG_SPRITE_CENTER;
  context.fillRect(x - reach, y - reach, 2 * reach, 2 * reach);
}

export function drawPacman(context, pacman) {
  const mouthHalfAngle = CHOMP_MOUTH_HALF_ANGLES[chompFrame(pacman)];
  drawPacmanShape(context, pacman.x, pacman.y, pacman.direction, mouthHalfAngle);
}

// Placeholder death (real sprites in stage 11): facing up like the arcade,
// the mouth opens wider in DEATH_ANIMATION_FRAMES steps until the whole
// circle is gone; in the last step nothing is left. progress runs 0..1.
export function drawPacmanDying(context, pacman, progress) {
  const lastFrame = DEATH_ANIMATION_FRAMES - 1;
  const frame = Math.min(lastFrame, Math.floor(progress * DEATH_ANIMATION_FRAMES));
  if (frame === lastFrame) {
    return;
  }
  const mouthHalfAngle = Math.PI * (frame + 1) / DEATH_ANIMATION_FRAMES;
  drawPacmanShape(context, pacman.x, pacman.y, DIRECTION.UP, mouthHalfAngle);
}

// The fruit centered on a screen point (a tile corner or an edge between
// two tiles, so the even-sized picture lands on whole pixels). zoom only
// enlarges the drawing (the debug gallery).
function drawFruitShape(context, x, y, fruit, zoom = 1) {
  const size = FRUIT_ART_SIZE * zoom;
  const image = getFruitImage(fruit, deviceScale(context) * zoom);
  context.drawImage(image, Math.floor(x) - size / 2, Math.floor(y) - size / 2, size, size);
}

// The bonus fruit on its spot under the ghost house.
export function drawFruit(context, fruit) {
  const { x, y } = tileCenterPixel(FRUIT_TILE.col, FRUIT_TILE.row);
  drawFruitShape(context, x, y, fruit);
}

// The eaten fruit's points, on the fruit's spot.
export function drawFruitPoints(context, points) {
  const { x, y } = tileCenterPixel(FRUIT_TILE.col, FRUIT_TILE.row);
  context.font = HUD_FONT;
  context.fillStyle = COLORS.FRUIT_POINTS;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  context.fillText(String(points), Math.floor(x), Math.floor(y) - TILE_SIZE / 2);
}

// The level fruits in the bottom HUD, newest first, laid out from the right
// edge leftward, so the oldest one is on the right like the arcade. Each
// icon is two tiles wide and tall, centered on their shared corner.
export function drawLevelFruits(context, fruits) {
  const oldestFirst = [...fruits].reverse();
  oldestFirst.forEach((fruit, index) => {
    const iconRightCol = FRUIT_HUD_RIGHT_COL - index * FRUIT_HUD_SPACING_TILES;
    const { x, y } = screenTileToPixel(iconRightCol - 1, LIVES_ROW + 1);
    drawFruitShape(context, x, y, fruit);
  });
}

// Debug: every fruit enlarged, in a grid on a dark panel in the middle of the
// screen, each with its name underneath.
const GALLERY_CELL = FRUIT_ART_SIZE * FRUIT_GALLERY_ZOOM;
const GALLERY_FRUITS = Object.values(FRUIT);
const GALLERY_ROWS = Math.ceil(GALLERY_FRUITS.length / FRUIT_GALLERY_COLUMNS);
const GALLERY_STEP_X = GALLERY_CELL + FRUIT_GALLERY_GAP;
const GALLERY_STEP_Y = GALLERY_CELL + FRUIT_GALLERY_LABEL_HEIGHT + FRUIT_GALLERY_GAP;
const GALLERY_WIDTH = FRUIT_GALLERY_COLUMNS * GALLERY_STEP_X + FRUIT_GALLERY_GAP;
const GALLERY_HEIGHT = GALLERY_ROWS * GALLERY_STEP_Y + FRUIT_GALLERY_GAP;
const GALLERY_LEFT = Math.floor((SCREEN_WIDTH - GALLERY_WIDTH) / 2);
const GALLERY_TOP = Math.floor((SCREEN_HEIGHT - GALLERY_HEIGHT) / 2);

export function drawFruitGallery(context) {
  context.fillStyle = FRUIT_GALLERY_BACKGROUND;
  context.fillRect(GALLERY_LEFT, GALLERY_TOP, GALLERY_WIDTH, GALLERY_HEIGHT);
  context.fillStyle = FRUIT_GALLERY_BORDER;
  drawFrame(context, GALLERY_LEFT, GALLERY_TOP, GALLERY_WIDTH, GALLERY_HEIGHT);
  context.font = DEBUG_LABEL_FONT;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  GALLERY_FRUITS.forEach((fruit, index) => {
    const cellLeft = GALLERY_LEFT + FRUIT_GALLERY_GAP + (index % FRUIT_GALLERY_COLUMNS) * GALLERY_STEP_X;
    const cellTop = GALLERY_TOP + FRUIT_GALLERY_GAP + Math.floor(index / FRUIT_GALLERY_COLUMNS) * GALLERY_STEP_Y;
    const centerX = cellLeft + GALLERY_CELL / 2;
    drawFruitShape(context, centerX, cellTop + GALLERY_CELL / 2, fruit, FRUIT_GALLERY_ZOOM);
    context.fillStyle = FRUIT_GALLERY_LABEL_COLOR;
    context.fillText(fruit.toUpperCase(), centerX, cellTop + GALLERY_CELL + 1);
  });
}

// A one-pixel frame inside the given rectangle, in the current fillStyle.
function drawFrame(context, left, top, width, height) {
  context.fillRect(left, top, width, 1);
  context.fillRect(left, top + height - 1, width, 1);
  context.fillRect(left, top, 1, height);
  context.fillRect(left + width - 1, top, 1, height);
}

// One icon per life in reserve, bottom left, two tiles apart.
export function drawLives(context, count) {
  for (let life = 0; life < count; life++) {
    const iconLeftCol = LIVES_FIRST_COL + life * LIVES_ICON_SPACING_TILES;
    // The icon is two tiles wide and tall; its center is their shared corner.
    const { x, y } = screenTileToPixel(iconLeftCol + 1, LIVES_ROW + 1);
    drawPacmanShape(context, x, y, DIRECTION.LEFT, LIFE_ICON_MOUTH_HALF_ANGLE);
  }
}

// The mute indicator: a speaker with an X, one tile, '#' = lit pixel. It
// stays pixel art: a small HUD symbol, like the text.
const MUTE_ICON_ROWS = [
  '   #    ',
  '  ##    ',
  '#### # #',
  '####  # ',
  '#### # #',
  '  ##    ',
  '   #    ',
  '        ',
];

const LIT_PIXEL = '#';

// Checked like the maze layout: one missing character would shift a whole
// row of pixels.
console.assert(
  MUTE_ICON_ROWS.length === TILE_SIZE && MUTE_ICON_ROWS.every((rowText) => rowText.length === TILE_SIZE),
  `Mute icon must be ${TILE_SIZE}x${TILE_SIZE} pixels`,
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

const MUTE_ICON_PIXELS = pixelsFromRows(MUTE_ICON_ROWS);

function fillPixels(context, left, top, pixels) {
  for (const { pixelCol, pixelRow } of pixels) {
    context.fillRect(left + pixelCol, top + pixelRow, 1, 1);
  }
}

// The ghost (14 pixels, in a picture with a half-pixel margin, see
// sprites.js) gets half an empty pixel to each wall of a corridor.
function ghostSpriteBox(x, y) {
  return spriteBox(x, y, GHOST_PICTURE_SIZE);
}

function drawGhostImage(context, x, y, image) {
  const { left, top, size } = ghostSpriteBox(x, y);
  context.drawImage(image, left, top, size, size);
}

// Which skirt frame to show after walking this long: the next one every
// GHOST_SKIRT_FRAME_MS, round and round. Any clock works: a ghost's
// walkTimeMs in the game, the running time on the attract screen.
export function ghostSkirtFrame(walkTimeMs) {
  return Math.floor(walkTimeMs / GHOST_SKIRT_FRAME_MS) % GHOST_SKIRT_FRAME_COUNT;
}

// The flash only changes the picture; the ghost itself never knows.
function drawGhost(context, ghost, isFlashWhite) {
  const scale = deviceScale(context);
  if (ghost.isEyes()) {
    drawGhostImage(context, ghost.x, ghost.y, getGhostEyesImage(ghost.direction, scale));
    return;
  }
  const skirtFrame = ghostSkirtFrame(ghost.walkTimeMs);
  if (ghost.state === GHOST_STATE.FRIGHTENED) {
    const image = getFrightenedGhostImage(isFlashWhite, skirtFrame, scale);
    drawGhostImage(context, ghost.x, ghost.y, image);
    return;
  }
  drawGhostShape(context, ghost.x, ghost.y, ghost.color, ghost.direction, skirtFrame);
}

// A normal ghost (body and eyes) centered on a screen point. Needs no Ghost
// object, so the attract screen can use it for its portraits.
export function drawGhostShape(context, x, y, color, direction, skirtFrame) {
  const image = getGhostImage(color, direction, skirtFrame, deviceScale(context));
  drawGhostImage(context, x, y, image);
}

// Debug only: the ghost's state, centered just above its sprite.
function drawGhostStateLabel(context, ghost) {
  const { top } = ghostSpriteBox(ghost.x, ghost.y);
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
  const elroyLevel = ghost.activeElroyLevel();
  if (elroyLevel > 0) {
    context.font = DEBUG_LABEL_FONT;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(`${DEBUG_ELROY_LABEL} ${elroyLevel}`, target.x + DEBUG_TARGET_SIZE, target.y);
  }
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

// isFlashWhite comes from the shared frightened clock, one value for all.
// The game decides which ghosts are visible (isVisible), e.g. the one just
// eaten hides while its points are shown.
export function drawGhosts(context, ghosts, showDebug, isFlashWhite, isVisible) {
  if (showDebug) {
    drawNoUpTurnTiles(context);
  }
  for (const ghost of ghosts) {
    if (isVisible(ghost)) {
      drawGhost(context, ghost, isFlashWhite);
    }
  }
  // Drawn after all ghosts, so no ghost body hides another ghost's target
  // or label.
  if (showDebug) {
    for (const ghost of ghosts) {
      if (ghost.targetTile) {
        drawGhostTarget(context, ghost);
      }
      if (isVisible(ghost)) {
        drawSpriteDebug(context, ghost.x, ghost.y, ghostSpriteBox(ghost.x, ghost.y));
      }
      drawGhostStateLabel(context, ghost);
    }
  }
}

// Over the finished frame while paused: the game stays visible behind a dark
// veil (the one semi-transparent fill), with the message on top. The
// middle rows cross the ghost house, so the text gets a black band from its
// first to its last row to stay readable.
export function drawPauseOverlay(context) {
  context.fillStyle = COLORS.PAUSE_DIM;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  const bandTop = screenTileToPixel(0, PAUSED_ROW).y;
  const bandBottom = screenTileToPixel(0, PAUSE_HINT_ROW + 1).y;
  context.fillStyle = COLORS.BACKGROUND;
  context.fillRect(0, bandTop, SCREEN_WIDTH, bandBottom - bandTop);
  context.font = HUD_FONT;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  const centerX = SCREEN_WIDTH / 2;
  context.fillStyle = COLORS.PAUSED_TEXT;
  context.fillText(PAUSED_TEXT, centerX, bandTop);
  context.fillStyle = COLORS.PAUSE_HINT_TEXT;
  context.fillText(PAUSE_HINT_TEXT, centerX, screenTileToPixel(0, PAUSE_HINT_ROW).y);
}

// Shown on every screen while muted, in the HUD's empty top-right corner.
export function drawMuteIndicator(context) {
  const { x, y } = screenTileToPixel(MUTE_ICON_COL, MUTE_ICON_ROW);
  context.fillStyle = COLORS.MUTE_ICON;
  fillPixels(context, x, y, MUTE_ICON_PIXELS);
}
