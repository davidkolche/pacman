import {
  SCREEN_WIDTH,
  SCREEN_COLUMNS,
  TILE_SIZE,
  DIRECTION,
  GHOST_STARTS,
  MS_PER_SECOND,
  TITLE_FONT_SIZE,
  TITLE_FIRST_ROW,
  TITLE_END_ROW,
  TITLE_PEEK_GHOST,
  TITLE_PEEK_RISE,
  TITLE_PEEK_SHIFT,
  TITLE_SHINE_PERIOD_MS,
  TITLE_SHINE_SWEEP_MS,
  TITLE_CHASE_PACMAN_SPEED,
  TITLE_CHASE_GHOST_SPEED,
  TITLE_CHASE_FLEE_SPEED,
  TITLE_CHASE_OFFSCREEN,
  TITLE_CHASE_FIRST_GAP,
  TITLE_CHASE_GHOST_SPACING,
  TITLE_CHASE_PELLET_COL,
  TITLE_CHASE_PAUSE_MS,
} from './constants.js';
import {
  screenTileToPixel,
  drawGhostShape,
  drawFrightenedGhostShape,
  drawPacman,
  drawDotAt,
  drawPowerPelletAt,
  ghostSkirtFrame,
} from './renderer.js';
import { GHOST_PICTURE_SIZE } from './sprites.js';
import {
  TITLE_LETTERS_WIDTH,
  TITLE_LETTERS_HEIGHT,
  TITLE_LETTERS_MARGIN,
  TITLE_DASH_INDEX,
  TITLE_LAST_LETTER_INDEX,
  titleCellCenterX,
  drawTitleLetters,
  drawTitleShine,
} from './titleArt.js';

// The attract screen's animated title: where each part goes and when it
// moves. Everything is derived from the game's running time (elapsedMs),
// like the pellets' pulse, so there is no state to update or reset: the
// same time always gives the same picture. The pictures come from the
// caches (titleArt.js for the letters, sprites.js for the characters).

// ---------- Layout ----------

// One empty pixel between the title's parts and the edges of its rows.
const BREATHING_ROOM = 1;
const AREA_TOP = screenTileToPixel(0, TITLE_FIRST_ROW).y;
const AREA_BOTTOM = screenTileToPixel(0, TITLE_END_ROW).y;
// The chase lane's center line: a tile and two pixels above the area's
// bottom, so a ghost (half a picture each way) ends a few pixels above the
// next section's text.
const LANE_Y = AREA_BOTTOM - TILE_SIZE - 2 * BREATHING_ROOM;
const LANE_TOP = LANE_Y - GHOST_PICTURE_SIZE / 2;
// The letters' faces start low enough for the peeking ghost's head.
const FACE_TOP = AREA_TOP + BREATHING_ROOM + TITLE_PEEK_RISE;
const LETTERS_LEFT = Math.floor((SCREEN_WIDTH - TITLE_LETTERS_WIDTH) / 2);
const LETTERS_TOP = FACE_TOP - TITLE_LETTERS_MARGIN;

console.assert(
  LETTERS_TOP + TITLE_LETTERS_HEIGHT + BREATHING_ROOM <= LANE_TOP &&
    LANE_Y + GHOST_PICTURE_SIZE / 2 <= AREA_BOTTOM &&
    TITLE_LETTERS_WIDTH <= SCREEN_WIDTH,
  'The title and its chase lane must fit in their rows',
);

// Pac-Man chomps in the dash's cell, on the letters' middle line.
const DASH_X = LETTERS_LEFT + titleCellCenterX(TITLE_DASH_INDEX);
const DASH_Y = FACE_TOP + TITLE_FONT_SIZE / 2;

// The peeking ghost stands behind the last letter, a little to the right;
// only the part above the letters' faces shows.
const PEEK_COLOR = GHOST_STARTS.find((start) => start.name === TITLE_PEEK_GHOST).color;
const PEEK_X = LETTERS_LEFT + titleCellCenterX(TITLE_LAST_LETTER_INDEX) + TITLE_PEEK_SHIFT;
const PEEK_Y = FACE_TOP - TITLE_PEEK_RISE + GHOST_PICTURE_SIZE / 2;

// ---------- The chase's timeline ----------

// Pac-Man enters and leaves at ENTER_X; the power pellet sits in a column.
const ENTER_X = SCREEN_WIDTH + TITLE_CHASE_OFFSCREEN;
const PELLET_X = screenTileToPixel(TITLE_CHASE_PELLET_COL, 0).x + TILE_SIZE / 2;
const RUN_SECONDS = (ENTER_X - PELLET_X) / TITLE_CHASE_PACMAN_SPEED;
// Back out takes as long: the same distance at the same speed.
const RUN_MS = RUN_SECONDS * MS_PER_SECOND;
const CYCLE_MS = 2 * RUN_MS + TITLE_CHASE_PAUSE_MS;
// The ghosts gain on him steadily, so they are closest at the pellet.
const CLOSEST_GAP = TITLE_CHASE_FIRST_GAP - (TITLE_CHASE_GHOST_SPEED - TITLE_CHASE_PACMAN_SPEED) * RUN_SECONDS;

console.assert(
  CLOSEST_GAP >= GHOST_PICTURE_SIZE && TITLE_CHASE_FLEE_SPEED > TITLE_CHASE_PACMAN_SPEED,
  'In the title chase the ghosts must never reach Pac-Man',
);

function ghostStartX(index) {
  return ENTER_X + TITLE_CHASE_FIRST_GAP + index * TITLE_CHASE_GHOST_SPACING;
}

// Where everybody is at a moment (pure, exported for tests). First Pac-Man
// runs left with the ghosts behind him, eating the dots; at the pellet they
// all turn around: the blue ghosts flee right, Pac-Man follows. During the
// pause they are all off the right edge.
export function titleChaseAt(timeMs) {
  const cycleMs = timeMs % CYCLE_MS;
  if (cycleMs < RUN_MS) {
    const seconds = cycleMs / MS_PER_SECOND;
    return {
      pacmanX: ENTER_X - TITLE_CHASE_PACMAN_SPEED * seconds,
      direction: DIRECTION.LEFT,
      distanceTraveled: TITLE_CHASE_PACMAN_SPEED * seconds,
      ghostXs: GHOST_STARTS.map((start, index) => ghostStartX(index) - TITLE_CHASE_GHOST_SPEED * seconds),
      isPelletEaten: false,
    };
  }
  const seconds = (cycleMs - RUN_MS) / MS_PER_SECOND;
  return {
    pacmanX: PELLET_X + TITLE_CHASE_PACMAN_SPEED * seconds,
    direction: DIRECTION.RIGHT,
    distanceTraveled: TITLE_CHASE_PACMAN_SPEED * (RUN_SECONDS + seconds),
    ghostXs: GHOST_STARTS.map((start, index) =>
      ghostStartX(index) - TITLE_CHASE_GHOST_SPEED * RUN_SECONDS + TITLE_CHASE_FLEE_SPEED * seconds),
    isPelletEaten: true,
  };
}

// The shine's progress (0..1) while it sweeps, or null between sweeps.
export function titleShineProgress(timeMs) {
  const sweepTimeMs = timeMs % TITLE_SHINE_PERIOD_MS;
  return sweepTimeMs < TITLE_SHINE_SWEEP_MS ? sweepTimeMs / TITLE_SHINE_SWEEP_MS : null;
}

// The peeking ghost watches the chase: down while Pac-Man passes under it,
// otherwise toward him.
export function peekEyesDirection(pacmanX) {
  const offset = pacmanX - PEEK_X;
  if (Math.abs(offset) < TILE_SIZE) {
    return DIRECTION.DOWN;
  }
  return offset < 0 ? DIRECTION.LEFT : DIRECTION.RIGHT;
}

// ---------- Drawing ----------

function drawPeekingGhost(context, pacmanX) {
  context.save();
  context.beginPath();
  context.rect(0, 0, SCREEN_WIDTH, FACE_TOP);
  context.clip();
  drawGhostShape(context, PEEK_X, PEEK_Y, PEEK_COLOR, peekEyesDirection(pacmanX), 0);
  context.restore();
}

// Dots still ahead of Pac-Man (left of him) until he eats the pellet.
function drawLaneFood(context, chase, elapsedMs) {
  if (chase.isPelletEaten) {
    return;
  }
  const tileTop = LANE_Y - TILE_SIZE / 2;
  for (let col = TITLE_CHASE_PELLET_COL + 1; col < SCREEN_COLUMNS; col++) {
    const { x } = screenTileToPixel(col, 0);
    if (x + TILE_SIZE / 2 < chase.pacmanX) {
      drawDotAt(context, x, tileTop);
    }
  }
  drawPowerPelletAt(context, PELLET_X, LANE_Y, elapsedMs);
}

// Ghosts after Pac-Man: in the game, too, they are drawn over him.
function drawLane(context, chase, elapsedMs) {
  drawLaneFood(context, chase, elapsedMs);
  drawPacman(context, {
    x: chase.pacmanX,
    y: LANE_Y,
    direction: chase.direction,
    distanceTraveled: chase.distanceTraveled,
  });
  const skirtFrame = ghostSkirtFrame(elapsedMs);
  GHOST_STARTS.forEach(({ color }, index) => {
    const x = chase.ghostXs[index];
    if (chase.isPelletEaten) {
      drawFrightenedGhostShape(context, x, LANE_Y, false, skirtFrame);
    } else {
      drawGhostShape(context, x, LANE_Y, color, chase.direction, skirtFrame);
    }
  });
}

// Back to front: the ghost behind the letters, the letters, the shine on
// them, the dash Pac-Man (chomping as if he ran at the chase's speed), and
// the lane.
export function drawTitle(context, elapsedMs) {
  const chase = titleChaseAt(elapsedMs);
  drawPeekingGhost(context, chase.pacmanX);
  drawTitleLetters(context, LETTERS_LEFT, LETTERS_TOP);
  const shineProgress = titleShineProgress(elapsedMs);
  if (shineProgress !== null) {
    drawTitleShine(context, LETTERS_LEFT, LETTERS_TOP, shineProgress);
  }
  drawPacman(context, {
    x: DASH_X,
    y: DASH_Y,
    direction: DIRECTION.RIGHT,
    distanceTraveled: (elapsedMs / MS_PER_SECOND) * TITLE_CHASE_PACMAN_SPEED,
  });
  drawLane(context, chase, elapsedMs);
}
