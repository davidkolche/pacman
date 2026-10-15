import {
  TILE_SIZE,
  SCREEN_COLUMNS,
  HUD_FONT,
  COLORS,
  DIRECTION,
  GHOST_STARTS,
  DOT_POINTS,
  POWER_PELLET_POINTS,
  ATTRACT_HEADER_TEXT,
  ATTRACT_HEADER_ROW,
  ATTRACT_HEADER_COL,
  GHOST_DISPLAY_NAMES,
  ATTRACT_CHARACTER_PREFIX,
  ATTRACT_NICKNAME_QUOTE,
  ATTRACT_FIRST_GHOST_ROW,
  ATTRACT_GHOST_ROW_SPACING,
  ATTRACT_GHOST_ICON_COL,
  ATTRACT_CHARACTER_COL,
  ATTRACT_NICKNAME_COL,
  ATTRACT_DOT_ROW,
  ATTRACT_PELLET_ROW,
  ATTRACT_POINTS_ICON_COL,
  ATTRACT_POINTS_TEXT_COL,
  PTS_LABEL,
  PRESS_START_TEXT,
  ATTRACT_PROMPT_ROW,
  ATTRACT_GHOST_DELAY_MS,
  ATTRACT_POINTS_DELAY_MS,
  ATTRACT_PROMPT_BLINK_MS,
} from './constants.js';
import {
  isBlinkOn,
  screenTileToPixel,
  drawGhostShape,
  drawDotAt,
  drawPowerPelletAt,
} from './renderer.js';

// The points table and the prompt come one delay after the last ghost.
const ATTRACT_POINTS_SHOW_MS =
  GHOST_STARTS.length * ATTRACT_GHOST_DELAY_MS + ATTRACT_POINTS_DELAY_MS;

// The texts as they appear on screen, e.g. -AVIGDOR and "LIBERMAN".
function characterText(name) {
  return `${ATTRACT_CHARACTER_PREFIX}${GHOST_DISPLAY_NAMES[name].character}`;
}

function nicknameText(name) {
  const quote = ATTRACT_NICKNAME_QUOTE;
  return `${quote}${GHOST_DISPLAY_NAMES[name].nickname}${quote}`;
}

// Every ghost needs its display names, or the screen would show "undefined".
console.assert(
  GHOST_STARTS.every((start) => GHOST_DISPLAY_NAMES[start.name]),
  'every ghost in GHOST_STARTS needs an entry in GHOST_DISPLAY_NAMES',
);

// One character per tile, so a text's length is its width in tiles. The
// longest character must end before the nickname column (at least one empty
// tile between them), and the longest nickname inside the screen.
const LONGEST_CHARACTER = Math.max(...GHOST_STARTS.map((start) => characterText(start.name).length));
const LONGEST_NICKNAME = Math.max(...GHOST_STARTS.map((start) => nicknameText(start.name).length));
console.assert(
  ATTRACT_CHARACTER_COL + LONGEST_CHARACTER < ATTRACT_NICKNAME_COL,
  'the longest character name runs into the nickname column',
);
console.assert(
  ATTRACT_NICKNAME_COL + LONGEST_NICKNAME <= SCREEN_COLUMNS,
  'the longest nickname does not fit on the screen',
);

// What is on screen is worked out from the state's clock on every frame, not
// added step by step, so there is nothing to reset: entering START again
// starts the clock (and so the whole sequence) from zero.
export function revealedGhostCount(stateTimeMs) {
  const count = Math.floor(stateTimeMs / ATTRACT_GHOST_DELAY_MS);
  return Math.min(GHOST_STARTS.length, Math.max(0, count));
}

export function isAttractPointsVisible(stateTimeMs) {
  return stateTimeMs >= ATTRACT_POINTS_SHOW_MS;
}

// Text on a screen tile: by default it starts at the tile's left edge;
// 'center' centers it on that edge instead.
function drawTextAt(context, text, col, row, color, align = 'left') {
  const { x, y } = screenTileToPixel(col, row);
  context.font = HUD_FONT;
  context.fillStyle = color;
  context.textBaseline = 'top';
  context.textAlign = align;
  context.fillText(text, x, y);
}

// The picture, then the character and the nickname in the ghost's own color.
// Ghosts face right, like the arcade's portraits.
function drawCharacterLine(context, { name, color }, index) {
  const row = ATTRACT_FIRST_GHOST_ROW + index * ATTRACT_GHOST_ROW_SPACING;
  const { x, y } = screenTileToPixel(ATTRACT_GHOST_ICON_COL, row);
  drawGhostShape(context, x, y + TILE_SIZE / 2, color, DIRECTION.RIGHT);
  drawTextAt(context, characterText(name), ATTRACT_CHARACTER_COL, row, color);
  drawTextAt(context, nicknameText(name), ATTRACT_NICKNAME_COL, row, color);
}

function drawPointsTable(context, elapsedMs) {
  const dotTile = screenTileToPixel(ATTRACT_POINTS_ICON_COL, ATTRACT_DOT_ROW);
  drawDotAt(context, dotTile.x, dotTile.y);
  drawTextAt(
    context, `${DOT_POINTS} ${PTS_LABEL}`, ATTRACT_POINTS_TEXT_COL, ATTRACT_DOT_ROW,
    COLORS.ATTRACT_TEXT,
  );
  const pelletTile = screenTileToPixel(ATTRACT_POINTS_ICON_COL, ATTRACT_PELLET_ROW);
  const halfTile = TILE_SIZE / 2;
  drawPowerPelletAt(context, pelletTile.x + halfTile, pelletTile.y + halfTile, elapsedMs);
  drawTextAt(
    context, `${POWER_PELLET_POINTS} ${PTS_LABEL}`, ATTRACT_POINTS_TEXT_COL, ATTRACT_PELLET_ROW,
    COLORS.ATTRACT_TEXT,
  );
}

// stateTimeMs drives the reveal and the blinking; elapsedMs (the game's
// running time) drives the pellet's pulse, the same clock as in the maze.
export function drawAttractScreen(context, { stateTimeMs, elapsedMs }) {
  drawTextAt(context, ATTRACT_HEADER_TEXT, ATTRACT_HEADER_COL, ATTRACT_HEADER_ROW, COLORS.ATTRACT_TEXT);
  const ghostCount = revealedGhostCount(stateTimeMs);
  for (let index = 0; index < ghostCount; index++) {
    drawCharacterLine(context, GHOST_STARTS[index], index);
  }
  if (!isAttractPointsVisible(stateTimeMs)) {
    return;
  }
  drawPointsTable(context, elapsedMs);
  if (isBlinkOn(stateTimeMs, ATTRACT_PROMPT_BLINK_MS)) {
    drawTextAt(
      context, PRESS_START_TEXT, SCREEN_COLUMNS / 2, ATTRACT_PROMPT_ROW, COLORS.START_TEXT, 'center',
    );
  }
}
