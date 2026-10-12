import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  DISPLAY_SCALE,
  MIN_PHYSICAL_SCALE,
  FPS_SAMPLE_INTERVAL_MS,
  MS_PER_SECOND,
  COLORS,
  TILE,
} from './constants.js';
import { startGameLoop } from './gameLoop.js';
import { countTiles } from './maze.js';
import { drawMaze, drawPacman } from './renderer.js';
import { setupInput, getRequestedDirection } from './input.js';
import { Pacman } from './pacman.js';

const canvas = document.getElementById('game-canvas');
const debugOverlay = document.getElementById('debug-overlay');
const context = setupCanvas();
const pacman = new Pacman();

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
  pacman.requestDirection(getRequestedDirection());
  pacman.update(deltaMs);
}

function render() {
  debugStats.framesThisSample++;
  refreshDebugStats();

  context.fillStyle = COLORS.BACKGROUND;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  drawMaze(context);
  drawPacman(context, pacman);
}

// The original maze has 240 dots and 4 power pellets; a different count
// means the layout has a typo.
console.log(
  `Maze: ${countTiles(TILE.DOT)} dots, ${countTiles(TILE.POWER_PELLET)} power pellets`,
);

// Browser zoom and moving the window to another monitor change devicePixelRatio
// and fire a resize event.
window.addEventListener('resize', applyPixelPerfectScale);
applyPixelPerfectScale();
setupInput();
startGameLoop(update, render);
