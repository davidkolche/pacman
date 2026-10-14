import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  DISPLAY_SCALE,
  MIN_PHYSICAL_SCALE,
  FPS_SAMPLE_INTERVAL_MS,
  MS_PER_SECOND,
  COLORS,
  HUD_FONT,
  GAME_STATE,
  READY_TEXT,
  PRESS_START_TEXT,
  GAME_OVER_TEXT,
  LEVEL_LABEL,
  LEVEL_INTRO_ROW,
  READY_ROW,
  EVENTS,
} from './constants.js';
import { on } from './events.js';
import { startGameLoop } from './gameLoop.js';
import {
  drawMaze,
  drawPacman,
  drawPacmanDying,
  drawGhosts,
  drawGhostPoints,
  drawLives,
  drawHud,
  drawLevel,
  drawMessage,
  drawFruit,
  drawFruitPoints,
  drawLevelFruits,
  drawFruitGallery,
} from './renderer.js';
import { setupInput, isDebugEnabled, isFruitGalleryOpen } from './input.js';
import { setupScoring, getScore, getHighScore } from './score.js';
import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
const debugOverlay = document.getElementById('debug-overlay');
const context = setupCanvas();
const game = new Game();
// Counts game updates (not rendered frames) to time blinking at a steady rate.
let frameCount = 0;
// Game time, summed from fixed update steps: it runs at the same speed on
// every computer and will stop by itself whenever updates stop (e.g. a pause).
let elapsedMs = 0;

// Counting renders and updates separately shows the fixed timestep at work:
// on a fast monitor FPS goes up, but UPS stays at the target rate.
const debugStats = {
  framesThisSample: 0,
  updatesThisSample: 0,
  sampleStartTime: performance.now(),
  physicalScale: MIN_PHYSICAL_SCALE,
  // Measured once per sample; shown together with the live mode line.
  statsText: '',
};

// The canvas size is set in applyPixelPerfectScale, which also runs on resize.
function setupCanvas() {
  return canvas.getContext('2d');
}

// With Windows display scaling (e.g. 125%) one CSS pixel is not one screen pixel.
// We pick a whole number of *physical* pixels per game pixel, then convert it
// back to CSS pixels, so every game pixel is drawn with exactly the same size.
// The canvas has one pixel per physical pixel (full device resolution), and
// setTransform makes every drawing call still think in game pixels: whole-
// pixel rectangles stay sharp squares, while curves (the fruits, the
// pellets) get the full resolution instead of being enlarged blocks.
function applyPixelPerfectScale() {
  const pixelRatio = window.devicePixelRatio;
  const physicalScale = Math.max(MIN_PHYSICAL_SCALE, Math.floor(DISPLAY_SCALE * pixelRatio));

  canvas.width = SCREEN_WIDTH * physicalScale;
  canvas.height = SCREEN_HEIGHT * physicalScale;
  canvas.style.width = `${SCREEN_WIDTH * physicalScale / pixelRatio}px`;
  canvas.style.height = `${SCREEN_HEIGHT * physicalScale / pixelRatio}px`;
  // Changing the canvas size resets the whole context, these two included.
  context.setTransform(physicalScale, 0, 0, physicalScale, 0, 0);
  context.imageSmoothingEnabled = false;
  debugStats.physicalScale = physicalScale;
}

function refreshDebugStats() {
  const now = performance.now();
  const elapsed = now - debugStats.sampleStartTime;
  if (elapsed < FPS_SAMPLE_INTERVAL_MS) {
    return;
  }

  const framesPerSecond = Math.round(debugStats.framesThisSample * MS_PER_SECOND / elapsed);
  const updatesPerSecond = Math.round(debugStats.updatesThisSample * MS_PER_SECOND / elapsed);
  debugStats.statsText =
    `FPS ${framesPerSecond}  UPS ${updatesPerSecond}\n` +
    `DPR ${window.devicePixelRatio}  x${debugStats.physicalScale}`;

  debugStats.framesThisSample = 0;
  debugStats.updatesThisSample = 0;
  debugStats.sampleStartTime = now;
}

function stateDebugText() {
  return `STATE ${game.state.toUpperCase()}`;
}

// Whole seconds, counting down like a kitchen timer; the last chase never ends.
function modeDebugText() {
  const remainingMs = game.modeTimer.remainingMs();
  const remaining =
    remainingMs === Infinity ? 'forever' : `${Math.ceil(remainingMs / MS_PER_SECOND)}s`;
  return `MODE ${game.modeTimer.currentMode().toUpperCase()} ${remaining}`;
}

// Written to HTML (not the canvas) so the text is sharp. The text changes
// at most about once a second, so the DOM is touched only when it differs.
function showDebugText() {
  const text =
    `${debugStats.statsText}\n${stateDebugText()}\n${modeDebugText()}\n` +
    `${game.ghostHouse.debugText(game.ghosts)}\n${game.fruit.debugText()}`;
  if (debugOverlay.textContent !== text) {
    debugOverlay.textContent = text;
  }
}

function update(deltaMs) {
  debugStats.updatesThisSample++;
  frameCount++;
  elapsedMs += deltaMs;
  game.update(deltaMs);
}

// The game says what is visible; this only turns that into drawing calls.
function drawCharacters(debugEnabled) {
  // Under the characters: Pac-Man and the ghosts pass over the fruit.
  if (game.isFruitVisible()) {
    drawFruit(context, game.fruit.fruit);
  }
  if (game.isFruitPointsVisible()) {
    drawFruitPoints(context, game.fruit.points);
  }
  if (game.isDying()) {
    drawPacmanDying(context, game.pacman, game.deathProgress());
  } else if (game.isPacmanVisible()) {
    drawPacman(context, game.pacman);
  }
  // Drawn after Pac-Man: in the arcade the ghosts appear on top of him.
  drawGhosts(
    context,
    game.ghosts,
    debugEnabled,
    game.isFrightenedFlashWhite(),
    (ghost) => game.isGhostVisible(ghost),
  );
  const eaten = game.eatenGhostDisplay;
  if (eaten) {
    drawGhostPoints(context, eaten.x, eaten.y, eaten.points);
  }
}

function render() {
  debugStats.framesThisSample++;
  const debugEnabled = isDebugEnabled();
  // Only touched when it changes: no DOM writes at all while debug stays off.
  if (debugOverlay.hidden === debugEnabled) {
    debugOverlay.hidden = !debugEnabled;
  }
  if (debugEnabled) {
    refreshDebugStats();
    showDebugText();
  }
  drawScene(debugEnabled);
  // On top of everything, in every state.
  if (debugEnabled && isFruitGalleryOpen()) {
    drawFruitGallery(context);
  }
}

// The game screen for the current state.
function drawScene(debugEnabled) {
  context.fillStyle = COLORS.BACKGROUND;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  drawHud(context, getScore(), getHighScore(), frameCount);
  drawLevel(context, game.level);
  drawMaze(context, elapsedMs, {
    wallColor: game.wallColor(),
    isDoorVisible: game.isGhostDoorVisible(),
  });
  // START shows only the maze and its message (the real start screen comes
  // in stage 10); every other state shows the lives and the level fruits,
  // and all but GAME_OVER the characters. The level number is always shown.
  if (game.state === GAME_STATE.START) {
    drawMessage(context, PRESS_START_TEXT, COLORS.START_TEXT);
    return;
  }
  drawLives(context, game.reserveLives());
  drawLevelFruits(context, game.levelFruits);
  if (game.state === GAME_STATE.GAME_OVER) {
    drawMessage(context, GAME_OVER_TEXT, COLORS.GAME_OVER_TEXT);
    return;
  }
  drawCharacters(debugEnabled);
  // The level intro goes together with "READY!": at a level's start and
  // after a lost life.
  if (game.state === GAME_STATE.READY) {
    drawMessage(context, `${LEVEL_LABEL} ${game.level}`, COLORS.LEVEL_INTRO_TEXT, {
      row: LEVEL_INTRO_ROW,
    });
    drawMessage(context, READY_TEXT, COLORS.READY_TEXT, { row: READY_ROW, hasBackground: true });
  }
}

// Browser zoom and moving the window to another monitor change devicePixelRatio
// and fire a resize event.
window.addEventListener('resize', applyPixelPerfectScale);
applyPixelPerfectScale();
debugOverlay.hidden = !isDebugEnabled();
setupInput();
setupScoring();
on(EVENTS.DOT_EATEN, () => game.handleDotEaten());
on(EVENTS.POWER_PELLET_EATEN, () => game.handlePowerPelletEaten());
// Canvas text is painted once and never redrawn by the browser, so text drawn
// before the web font arrives would stay in a fallback font. Browsers also only
// download a font when something asks for it, and load() is that request.
await document.fonts.load(HUD_FONT);
startGameLoop(update, render);
