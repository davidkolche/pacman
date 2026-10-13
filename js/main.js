import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  DISPLAY_SCALE,
  MIN_PHYSICAL_SCALE,
  FPS_SAMPLE_INTERVAL_MS,
  MS_PER_SECOND,
  COLORS,
  HUD_FONT,
  GHOST_NAME,
} from './constants.js';
import { startGameLoop } from './gameLoop.js';
import { drawMaze, drawPacman, drawGhosts, drawHud } from './renderer.js';
import { setupInput, getRequestedDirection, isDebugEnabled } from './input.js';
import { Pacman } from './pacman.js';
import { createGhosts } from './ghost.js';
import { setupScoring, getScore, getHighScore } from './score.js';

const canvas = document.getElementById('game-canvas');
const debugOverlay = document.getElementById('debug-overlay');
const context = setupCanvas();
const pacman = new Pacman();
const ghosts = createGhosts();
// Inky's chase target depends on where Blinky is.
const blinky = ghosts.find((ghost) => ghost.name === GHOST_NAME.BLINKY);
// The game clock starts with the player's first direction key; until then
// Pac-Man waits and the ghosts only bob in the house.
// TODO (stage 8): becomes the READY state of the game state machine.
let gameStarted = false;
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
};

function setupCanvas() {
  // Drawing happens at arcade resolution; CSS enlarges the result on screen.
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  const canvasContext = canvas.getContext('2d');
  canvasContext.imageSmoothingEnabled = false;
  return canvasContext;
}

// With Windows display scaling (e.g. 125%) one CSS pixel is not one screen pixel.
// We pick a whole number of *physical* pixels per game pixel, then convert it
// back to CSS pixels, so every game pixel is drawn with exactly the same size.
function applyPixelPerfectScale() {
  const pixelRatio = window.devicePixelRatio;
  const physicalScale = Math.max(MIN_PHYSICAL_SCALE, Math.floor(DISPLAY_SCALE * pixelRatio));

  canvas.style.width = `${SCREEN_WIDTH * physicalScale / pixelRatio}px`;
  canvas.style.height = `${SCREEN_HEIGHT * physicalScale / pixelRatio}px`;
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
  showDebugStats(framesPerSecond, updatesPerSecond);

  debugStats.framesThisSample = 0;
  debugStats.updatesThisSample = 0;
  debugStats.sampleStartTime = now;
}

// Written to HTML (not the canvas) so the text is sharp, and only once per
// sample interval to avoid touching the DOM every frame.
function showDebugStats(framesPerSecond, updatesPerSecond) {
  debugOverlay.textContent =
    `FPS ${framesPerSecond}  UPS ${updatesPerSecond}\n` +
    `DPR ${window.devicePixelRatio}  x${debugStats.physicalScale}`;
}

function update(deltaMs) {
  debugStats.updatesThisSample++;
  frameCount++;
  elapsedMs += deltaMs;
  const requestedDirection = getRequestedDirection();
  if (requestedDirection) {
    gameStarted = true;
  }
  pacman.requestDirection(requestedDirection);
  pacman.update(deltaMs);
  // Taken once, before any ghost moves, so all four aim at the same moment.
  const chaseInfo = {
    pacmanTile: pacman.currentTile(),
    pacmanDirection: pacman.direction,
    blinkyTile: blinky.currentTile(),
  };
  for (const ghost of ghosts) {
    ghost.update(deltaMs, gameStarted, chaseInfo);
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
  }

  context.fillStyle = COLORS.BACKGROUND;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  drawHud(context, getScore(), getHighScore(), frameCount);
  drawMaze(context, elapsedMs);
  drawPacman(context, pacman);
  // Drawn last: in the arcade the ghosts appear on top of Pac-Man.
  drawGhosts(context, ghosts, debugEnabled);
}

// Browser zoom and moving the window to another monitor change devicePixelRatio
// and fire a resize event.
window.addEventListener('resize', applyPixelPerfectScale);
applyPixelPerfectScale();
debugOverlay.hidden = !isDebugEnabled();
setupInput();
setupScoring();
// Canvas text is painted once and never redrawn by the browser, so text drawn
// before the web font arrives would stay in a fallback font. Browsers also only
// download a font when something asks for it, and load() is that request.
await document.fonts.load(HUD_FONT);
startGameLoop(update, render);
