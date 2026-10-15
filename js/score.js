import {
  TILE,
  EVENTS,
  DOT_POINTS,
  POWER_PELLET_POINTS,
  STARTING_LIVES,
  EXTRA_LIFE_SCORE,
} from './constants.js';
import { on, emit } from './events.js';
import { countTiles } from './maze.js';

let score = 0;
let dotsRemaining = 0;
let lives = STARTING_LIVES;
// Only one extra life per game, even if the score keeps growing.
let extraLifeAwarded = false;
// Kept in memory only, so a page refresh resets it (saving comes in stage 10).
let highScore = 0;

// Named functions (not inline arrows) so they can be removed later with off().
function handleDotEaten() {
  addPoints(DOT_POINTS);
  dotsRemaining--;
}

function handlePowerPelletEaten() {
  addPoints(POWER_PELLET_POINTS);
  dotsRemaining--;
}

// The game decides how much a ghost is worth (it knows the chain), so the
// points come with the event.
function handleGhostEaten({ points }) {
  addPoints(points);
}

// Each level's fruit has its own value (levels.js), sent with the event.
function handleFruitEaten({ points }) {
  addPoints(points);
}

function handlePacmanDied() {
  lives--;
}

// Every kind of points (dots, ghosts, fruit, debug) comes through here, so
// this is the one place that notices the score reaching the extra life.
function addPoints(points) {
  score += points;
  highScore = Math.max(highScore, score);
  if (!extraLifeAwarded && score >= EXTRA_LIFE_SCORE) {
    extraLifeAwarded = true;
    lives++;
    emit(EVENTS.EXTRA_LIFE);
  }
}

// Debug only: points from nowhere, to test the extra life quickly.
export function addDebugPoints(points) {
  addPoints(points);
}

// Counted from the maze itself (240 dots + 4 power pellets) instead of a
// hard-coded 244, so it stays right if the layout ever changes.
function countFood() {
  return countTiles(TILE.DOT) + countTiles(TILE.POWER_PELLET);
}

// Must run before the game loop starts: an event emitted before anyone
// subscribes is simply lost.
export function setupScoring() {
  dotsRemaining = countFood();
  on(EVENTS.DOT_EATEN, handleDotEaten);
  on(EVENTS.POWER_PELLET_EATEN, handlePowerPelletEaten);
  on(EVENTS.GHOST_EATEN, handleGhostEaten);
  on(EVENTS.FRUIT_EATEN, handleFruitEaten);
  on(EVENTS.PACMAN_DIED, handlePacmanDied);
}

// A new game: everything back to the start except the high score. Call it
// after the maze is reset, so the food count is full again.
export function resetScore() {
  score = 0;
  lives = STARTING_LIVES;
  extraLifeAwarded = false;
  recountFood();
}

// After the maze changed without events (refilled for a new level, or
// cleared by the debug key), the count is taken from the maze again.
export function recountFood() {
  dotsRemaining = countFood();
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

// Including the life being played now.
export function getLives() {
  return lives;
}
