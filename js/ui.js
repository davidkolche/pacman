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
  ATTRACT_CHARACTERS_PHASE_MS,
  ATTRACT_TOP_SCORES_PHASE_MS,
  TOP_SCORE_NAME_MAX_LENGTH,
  TOP_SCORES_TITLE,
  TOP_SCORES_TITLE_ROW,
  TOP_SCORES_COLUMN_LABELS,
  TOP_SCORES_LABEL_ROW,
  TOP_SCORES_FIRST_ROW,
  TOP_SCORES_ROW_SPACING,
  TOP_SCORES_RANK_END_COL,
  TOP_SCORES_SCORE_END_COL,
  TOP_SCORES_NAME_COL,
  TOP_SCORES_RANK_SUFFIX,
  TOP_SCORES_SCORE_DIGITS,
  TOP_SCORES_EMPTY_TEXT,
  TOP_SCORES_EMPTY_ROW,
  NAME_BLANK,
  NAME_ENTRY_TITLE,
  NAME_ENTRY_TITLE_ROW,
  NAME_ENTRY_SCORE_LABEL,
  NAME_ENTRY_SCORE_ROW,
  NAME_ENTRY_PROMPT,
  NAME_ENTRY_PROMPT_ROW,
  NAME_ENTRY_NAME_ROW,
  NAME_ENTRY_EMPTY_SLOT,
  NAME_ENTRY_CURSOR_BLINK_MS,
  NAME_ENTRY_HELP_LINES,
  NAME_ENTRY_FIRST_HELP_ROW,
  NAME_ENTRY_HELP_ROW_SPACING,
} from './constants.js';
import {
  isBlinkOn,
  screenTileToPixel,
  drawGhostShape,
  ghostSkirtFrame,
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

// What is on screen is worked out from the clock on every frame, not added
// step by step, so there is nothing to reset: each characters phase starts
// its clock (and so the whole reveal) from zero.
export function revealedGhostCount(phaseTimeMs) {
  const count = Math.floor(phaseTimeMs / ATTRACT_GHOST_DELAY_MS);
  return Math.min(GHOST_STARTS.length, Math.max(0, count));
}

export function isAttractPointsVisible(phaseTimeMs) {
  return phaseTimeMs >= ATTRACT_POINTS_SHOW_MS;
}

// Text on a screen tile: by default it starts at the tile's left edge;
// 'center' centers it on that edge, 'right' ends it there.
function drawTextAt(context, text, col, row, color, align = 'left') {
  const { x, y } = screenTileToPixel(col, row);
  context.font = HUD_FONT;
  context.fillStyle = color;
  context.textBaseline = 'top';
  context.textAlign = align;
  context.fillText(text, x, y);
}

// The picture, then the character and the nickname in the ghost's own color.
// Ghosts face right, like the arcade's portraits, and their skirts walk in
// place.
function drawCharacterLine(context, { name, color }, index, skirtFrame) {
  const row = ATTRACT_FIRST_GHOST_ROW + index * ATTRACT_GHOST_ROW_SPACING;
  const { x, y } = screenTileToPixel(ATTRACT_GHOST_ICON_COL, row);
  drawGhostShape(context, x, y + TILE_SIZE / 2, color, DIRECTION.RIGHT, skirtFrame);
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

const SCREEN_CENTER_COL = SCREEN_COLUMNS / 2;
const ATTRACT_CYCLE_MS = ATTRACT_CHARACTERS_PHASE_MS + ATTRACT_TOP_SCORES_PHASE_MS;

// The phase must leave time to see the whole reveal.
console.assert(
  ATTRACT_POINTS_SHOW_MS < ATTRACT_CHARACTERS_PHASE_MS,
  'ATTRACT_CHARACTERS_PHASE_MS ends before the characters are all shown',
);
// The widest table row: the rank, a full score and the longest name, in
// order and inside the screen.
console.assert(
  TOP_SCORES_RANK_END_COL < TOP_SCORES_SCORE_END_COL - TOP_SCORES_SCORE_DIGITS &&
    TOP_SCORES_SCORE_END_COL < TOP_SCORES_NAME_COL &&
    TOP_SCORES_NAME_COL + TOP_SCORE_NAME_MAX_LENGTH <= SCREEN_COLUMNS,
  'a top scores row does not fit on the screen',
);

// Which half of the alternation is showing, and how far into it. Pure, from
// the attract clock alone, like revealedGhostCount: each new characters
// phase replays the reveal from the start.
export function attractPhase(attractTimeMs) {
  const cycleTimeMs = attractTimeMs % ATTRACT_CYCLE_MS;
  if (cycleTimeMs < ATTRACT_CHARACTERS_PHASE_MS) {
    return { isTopScores: false, phaseTimeMs: cycleTimeMs };
  }
  return { isTopScores: true, phaseTimeMs: cycleTimeMs - ATTRACT_CHARACTERS_PHASE_MS };
}

function drawCharactersPhase(context, phaseTimeMs, elapsedMs) {
  drawTextAt(context, ATTRACT_HEADER_TEXT, ATTRACT_HEADER_COL, ATTRACT_HEADER_ROW, COLORS.ATTRACT_TEXT);
  const ghostCount = revealedGhostCount(phaseTimeMs);
  const skirtFrame = ghostSkirtFrame(elapsedMs);
  for (let index = 0; index < ghostCount; index++) {
    drawCharacterLine(context, GHOST_STARTS[index], index, skirtFrame);
  }
  if (isAttractPointsVisible(phaseTimeMs)) {
    drawPointsTable(context, elapsedMs);
  }
}

function drawTopScoresRow(context, { name, score }, index) {
  const row = TOP_SCORES_FIRST_ROW + index * TOP_SCORES_ROW_SPACING;
  const color = COLORS.TOP_SCORES_ROW;
  const rank = `${index + 1}${TOP_SCORES_RANK_SUFFIX}`;
  drawTextAt(context, rank, TOP_SCORES_RANK_END_COL, row, color, 'right');
  drawTextAt(context, String(score), TOP_SCORES_SCORE_END_COL, row, color, 'right');
  drawTextAt(context, name, TOP_SCORES_NAME_COL, row, color);
}

function drawTopScoresPhase(context, topScores) {
  drawTextAt(context, TOP_SCORES_TITLE, SCREEN_CENTER_COL, TOP_SCORES_TITLE_ROW, COLORS.TOP_SCORES_TITLE, 'center');
  if (topScores.length === 0) {
    drawTextAt(context, TOP_SCORES_EMPTY_TEXT, SCREEN_CENTER_COL, TOP_SCORES_EMPTY_ROW, COLORS.TOP_SCORES_ROW, 'center');
    return;
  }
  const labels = TOP_SCORES_COLUMN_LABELS;
  const labelColor = COLORS.TOP_SCORES_LABELS;
  drawTextAt(context, labels.rank, TOP_SCORES_RANK_END_COL, TOP_SCORES_LABEL_ROW, labelColor, 'right');
  drawTextAt(context, labels.score, TOP_SCORES_SCORE_END_COL, TOP_SCORES_LABEL_ROW, labelColor, 'right');
  drawTextAt(context, labels.name, TOP_SCORES_NAME_COL, TOP_SCORES_LABEL_ROW, labelColor);
  topScores.forEach((entry, index) => drawTopScoresRow(context, entry, index));
}

// attractTimeMs drives the alternation, the reveal and the blinking;
// elapsedMs (the game's running time) drives the pellet's pulse, the same
// clock as in the maze. The prompt shows in both phases, but in the
// characters phase only once the reveal is over.
export function drawAttractScreen(context, { attractTimeMs, elapsedMs, topScores }) {
  const { isTopScores, phaseTimeMs } = attractPhase(attractTimeMs);
  if (isTopScores) {
    drawTopScoresPhase(context, topScores);
  } else {
    drawCharactersPhase(context, phaseTimeMs, elapsedMs);
  }
  const isPromptShown = isTopScores || isAttractPointsVisible(phaseTimeMs);
  if (isPromptShown && isBlinkOn(attractTimeMs, ATTRACT_PROMPT_BLINK_MS)) {
    drawTextAt(context, PRESS_START_TEXT, SCREEN_CENTER_COL, ATTRACT_PROMPT_ROW, COLORS.START_TEXT, 'center');
  }
}

// One tile per slot, the whole row centered. An empty slot shows a mark;
// the slot under the cursor blinks (mark or character).
function drawNameSlots(context, nameEntry, stateTimeMs) {
  const firstCol = SCREEN_CENTER_COL - nameEntry.slots.length / 2;
  const isCursorOn = isBlinkOn(stateTimeMs, NAME_ENTRY_CURSOR_BLINK_MS);
  nameEntry.slots.forEach((character, index) => {
    if (index === nameEntry.cursor && !isCursorOn) {
      return;
    }
    const shown = character === NAME_BLANK ? NAME_ENTRY_EMPTY_SLOT : character;
    drawTextAt(context, shown, firstCol + index, NAME_ENTRY_NAME_ROW, COLORS.NAME_ENTRY_NAME);
  });
}

// Its own black screen, like the arcade's initials entry (no maze).
export function drawNameEntryScreen(context, { score, nameEntry, stateTimeMs }) {
  drawTextAt(context, NAME_ENTRY_TITLE, SCREEN_CENTER_COL, NAME_ENTRY_TITLE_ROW, COLORS.NAME_ENTRY_TITLE, 'center');
  drawTextAt(
    context, `${NAME_ENTRY_SCORE_LABEL} ${score}`, SCREEN_CENTER_COL, NAME_ENTRY_SCORE_ROW,
    COLORS.NAME_ENTRY_TEXT, 'center',
  );
  drawTextAt(context, NAME_ENTRY_PROMPT, SCREEN_CENTER_COL, NAME_ENTRY_PROMPT_ROW, COLORS.NAME_ENTRY_TEXT, 'center');
  drawNameSlots(context, nameEntry, stateTimeMs);
  NAME_ENTRY_HELP_LINES.forEach((line, index) => {
    const row = NAME_ENTRY_FIRST_HELP_ROW + index * NAME_ENTRY_HELP_ROW_SPACING;
    drawTextAt(context, line, SCREEN_CENTER_COL, row, COLORS.NAME_ENTRY_HELP, 'center');
  });
}
