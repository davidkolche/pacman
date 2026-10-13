import { TILE, EVENTS, DOT_POINTS, POWER_PELLET_POINTS } from './constants.js';
import { on } from './events.js';
import { countTiles } from './maze.js';

let score = 0;
let dotsRemaining = 0;
// Kept in memory only, so a page refresh resets it (saving comes in stage 10).
let highScore = 0;

// Named functions (not inline arrows) so they can be removed later with off().
function handleDotEaten() {
  addPoints(DOT_POINTS);
}

function handlePowerPelletEaten() {
  addPoints(POWER_PELLET_POINTS);
}

function addPoints(points) {
  score += points;
  dotsRemaining--;
  highScore = Math.max(highScore, score);
}

// Must run before the game loop starts: an event emitted before anyone
// subscribes is simply lost.
export function setupScoring() {
  // Counted from the maze itself (240 dots + 4 power pellets) instead of a
  // hard-coded 244, so it stays right if the layout ever changes.
  dotsRemaining = countTiles(TILE.DOT) + countTiles(TILE.POWER_PELLET);
  on(EVENTS.DOT_EATEN, handleDotEaten);
  on(EVENTS.POWER_PELLET_EATEN, handlePowerPelletEaten);
}

export function getScore() {
  return score;
}

export function getHighScore() {
  return highScore;
}

export function getDotsRemaining() {
  return dotsRemaining;
}
