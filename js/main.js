import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  MIN_PHYSICAL_SCALE,
  WINDOW_MARGIN_CSS_PX,
  MARQUEE_HEIGHT_CSS_PX,
  MARQUEE_GAP_CSS_PX,
  FPS_SAMPLE_INTERVAL_MS,
  MS_PER_SECOND,
  COLORS,
  HUD_FONT,
  GAME_STATE,
  READY_TEXT,
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
  drawPacmanMouthClosed,
  drawPacmanDebug,
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
  drawSpriteGallery,
  drawPauseOverlay,
  drawMuteIndicator,
} from './renderer.js';
import { clearFruitImageCache } from './fruitArt.js';
import { clearSpriteCache } from './sprites.js';
import { setupMarquee, layoutMarquee, setMarqueePaused } from './marquee.js';
import { setupAudio, isMuted } from './audio.js';
import { drawAttractScreen, drawNameEntryScreen } from './ui.js';
import { setupInput, isDebugEnabled, isFruitGalleryOpen, isSpriteGalleryOpen } from './input.js';
import {
  setupScoring,
  saveHighScore,
  getScore,
  getHighScore,
  getDotsRemaining,
  getTopScores,
} from './score.js';
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

// What applyPixelPerfectScale last set up (null until the first call).
const appliedScale = { physicalScale: null, pixelRatio: null, isMarqueeShown: null };
// The marquee's share of the window's height when it is shown.
const MARQUEE_RESERVED_CSS_PX = MARQUEE_HEIGHT_CSS_PX + MARQUEE_GAP_CSS_PX;

// The canvas size is set in applyPixelPerfectScale, which also runs on resize.
function setupCanvas() {
  return canvas.getContext('2d');
}

// How many physical pixels per game pixel would fit the window (minus a
// margin, and minus reservedHeightCss for something above the canvas),
// checked on both sides so the 224x288 shape is kept. Not rounded yet.
// Example: a 1920x1080 window at 125% has about 1330 physical pixels of
// height: 1330 / 288 = 4.6.
function roomForScale(pixelRatio, reservedHeightCss) {
  const margin = 2 * WINDOW_MARGIN_CSS_PX;
  const widthScale = ((window.innerWidth - margin) * pixelRatio) / SCREEN_WIDTH;
  const heightScale = ((window.innerHeight - margin - reservedHeightCss) * pixelRatio) / SCREEN_HEIGHT;
  return Math.min(widthScale, heightScale);
}

// The largest whole number that fits (4 in the example), never below the
// minimum.
function fittingPhysicalScale(pixelRatio) {
  return Math.max(MIN_PHYSICAL_SCALE, Math.floor(roomForScale(pixelRatio, 0)));
}

// The marquee may only take height the game does not need: it shows when
// the window still holds the same whole-number scale without that height.
function isMarqueeAffordable(pixelRatio, physicalScale) {
  return roomForScale(pixelRatio, MARQUEE_RESERVED_CSS_PX) >= physicalScale;
}

// With Windows display scaling (e.g. 125%) one CSS pixel is not one screen pixel.
// We pick a whole number of *physical* pixels per game pixel, then convert it
// back to CSS pixels, so every game pixel is drawn with exactly the same size.
// The canvas has one pixel per physical pixel (full device resolution), and
// setTransform makes every drawing call still think in game pixels: whole-
// pixel rectangles stay sharp squares, while curves (the fruits, the
// pellets) get the full resolution instead of being enlarged blocks.
// Resizing fires many events: the canvas is rebuilt only when the scale,
// the pixel ratio or the marquee's place really changed (a new size also
// clears the canvas).
function applyPixelPerfectScale() {
  const pixelRatio = window.devicePixelRatio;
  const physicalScale = fittingPhysicalScale(pixelRatio);
  const isMarqueeShown = isMarqueeAffordable(pixelRatio, physicalScale);
  if (
    physicalScale === appliedScale.physicalScale &&
    pixelRatio === appliedScale.pixelRatio &&
    isMarqueeShown === appliedScale.isMarqueeShown
  ) {
    return;
  }
  appliedScale.physicalScale = physicalScale;
  appliedScale.pixelRatio = pixelRatio;
  appliedScale.isMarqueeShown = isMarqueeShown;
  // The fruit and character pictures were painted for the old size.
  clearFruitImageCache();
  clearSpriteCache();

  canvas.width = SCREEN_WIDTH * physicalScale;
  canvas.height = SCREEN_HEIGHT * physicalScale;
  const widthCss = SCREEN_WIDTH * physicalScale / pixelRatio;
  canvas.style.width = `${widthCss}px`;
  canvas.style.height = `${SCREEN_HEIGHT * physicalScale / pixelRatio}px`;
  // Changing the canvas size resets the whole context, these two included.
  context.setTransform(physicalScale, 0, 0, physicalScale, 0, 0);
  context.imageSmoothingEnabled = false;
  debugStats.physicalScale = physicalScale;
  // After the caches were cleared: the sign copies its sprites at the new size.
  layoutMarquee({ isShown: isMarqueeShown, widthCss });
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
    `DPR ${window.devicePixelRatio}  x${debugStats.physicalScale}\n${layoutDebugText()}`;

  debugStats.framesThisSample = 0;
  debugStats.updatesThisSample = 0;
  debugStats.sampleStartTime = now;
}

// The real numbers of this window: the canvas in CSS pixels, whether the
// marquee is shown, and the height left over (what a taller marquee could use).
function layoutDebugText() {
  const { width, height } = canvas.getBoundingClientRect();
  const marqueeHeight = appliedScale.isMarqueeShown ? MARQUEE_RESERVED_CSS_PX : 0;
  const free = Math.floor(window.innerHeight - 2 * WINDOW_MARGIN_CSS_PX - height - marqueeHeight);
  const marquee = appliedScale.isMarqueeShown ? 'ON' : 'OFF';
  return `WINDOW ${window.innerWidth}x${window.innerHeight}  CANVAS ${Math.round(width)}x${Math.round(height)}\n` +
    `MARQUEE ${marquee}  FREE ${free}px`;
}

function stateDebugText() {
  const paused = game.isPaused ? ' (PAUSED)' : '';
  return `STATE ${game.state.toUpperCase()}${paused}`;
}

// Whole seconds, counting down like a kitchen timer; the last chase never ends.
function modeDebugText() {
  const remainingMs = game.modeTimer.remainingMs();
  const remaining =
    remainingMs === Infinity ? 'forever' : `${Math.ceil(remainingMs / MS_PER_SECOND)}s`;
  return `MODE ${game.modeTimer.currentMode().toUpperCase()} ${remaining}`;
}

// Cruise Elroy as the game sees it, whether or not Blinky is out to use it.
function elroyDebugText() {
  if (game.isElroySuspended) {
    return 'ELROY OFF (WAIT CLYDE)';
  }
  const level = game.elroyLevel();
  const state = level > 0 ? `${level}` : 'OFF';
  return `ELROY ${state}  DOTS ${getDotsRemaining()}/${game.levelConfig.elroy1Dots}`;
}

// Written to HTML (not the canvas) so the text is sharp. The text changes
// at most about once a second, so the DOM is touched only when it differs.
function showDebugText() {
  const text =
    `${debugStats.statsText}\n${stateDebugText()}\n${modeDebugText()}\n` +
    `${game.ghostHouse.debugText(game.ghosts)}\n${game.fruit.debugText()}\n${elroyDebugText()}`;
  if (debugOverlay.textContent !== text) {
    debugOverlay.textContent = text;
  }
}

// The game is updated even while paused, so it can read the P and M keys
// (it does nothing else then). The screen's own clocks (1UP blink, pellet
// pulse) stop with it: a paused picture stands completely still.
function update(deltaMs) {
  debugStats.updatesThisSample++;
  game.update(deltaMs);
  if (game.isPaused) {
    return;
  }
  frameCount++;
  elapsedMs += deltaMs;
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
    if (game.isLevelComplete()) {
      // From the last dot through the maze flash: mouth shut, done eating.
      drawPacmanMouthClosed(context, game.pacman);
    } else {
      drawPacman(context, game.pacman);
    }
  }
  if (debugEnabled && (game.isDying() || game.isPacmanVisible())) {
    drawPacmanDebug(context, game.pacman);
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
  // A new devicePixelRatio with the same window size (moving to a monitor
  // with other display scaling) fires no resize event, and media query
  // events for it arrive late or not at all, so every frame compares the
  // ratio itself: one number, far cheaper than drawing at the wrong size.
  if (window.devicePixelRatio !== appliedScale.pixelRatio) {
    applyPixelPerfectScale();
  }
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
  setMarqueePaused(game.isPaused);
  // Over the finished picture: the paused game stays visible underneath.
  if (game.isPaused) {
    drawPauseOverlay(context);
  }
  if (isMuted()) {
    drawMuteIndicator(context);
  }
  // On top of everything, in every state.
  if (debugEnabled && isFruitGalleryOpen()) {
    drawFruitGallery(context);
  }
  if (debugEnabled && isSpriteGalleryOpen()) {
    drawSpriteGallery(context, elapsedMs);
  }
}

// The game screen for the current state.
function drawScene(debugEnabled) {
  context.fillStyle = COLORS.BACKGROUND;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  drawHud(context, getScore(), getHighScore(), frameCount);
  // START (the attract screen) and NAME_ENTRY are screens of their own: the
  // scores on top, no maze. Every other state shows the maze, the level
  // number, the lives and the level fruits, and all but GAME_OVER the
  // characters.
  if (game.state === GAME_STATE.START) {
    drawAttractScreen(context, {
      attractTimeMs: game.attractTimeMs(),
      elapsedMs,
      topScores: getTopScores(),
    });
    return;
  }
  if (game.state === GAME_STATE.NAME_ENTRY) {
    drawNameEntryScreen(context, {
      score: getScore(),
      nameEntry: game.nameEntry,
      stateTimeMs: game.stateTimeMs,
    });
    return;
  }
  drawLevel(context, game.level);
  drawMaze(context, elapsedMs, {
    wallColor: game.wallColor(),
    isDoorVisible: game.isGhostDoorVisible(),
  });
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

// Resizing the window and most browser zooms fire a resize event. A new
// devicePixelRatio alone does not (see render()).
window.addEventListener('resize', applyPixelPerfectScale);
// A hidden tab gets no frames; leaving one mid-game pauses it, and it waits
// for P when the player comes back.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.pauseIfPlaying();
  }
});
// Closing or leaving the page in the middle of a game must not lose a new
// high score. pagehide also fires where unload does not (mobile, bfcache).
window.addEventListener('pagehide', saveHighScore);
setupMarquee();
applyPixelPerfectScale();
debugOverlay.hidden = !isDebugEnabled();
setupInput();
setupScoring();
setupAudio();
on(EVENTS.DOT_EATEN, () => game.handleDotEaten());
on(EVENTS.POWER_PELLET_EATEN, () => game.handlePowerPelletEaten());
// Canvas text is painted once and never redrawn by the browser, so text drawn
// before the web font arrives would stay in a fallback font. Browsers also only
// download a font when something asks for it, and load() is that request.
await document.fonts.load(HUD_FONT);
startGameLoop(update, render);
