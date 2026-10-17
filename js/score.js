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
import { loadScores, saveScores } from './storage.js';
import { qualifiesForTopScores, insertTopScore } from './topScores.js';

let score = 0;
let dotsRemaining = 0;
let lives = STARTING_LIVES;
// Only one extra life per game, even if the score keeps growing.
let extraLifeAwarded = false;
// What storage holds (loaded in setupScoring). highScore runs ahead of it
// during play and is written back only at a few moments (saveHighScore).
let savedScores = { highScore: 0, topScores: [] };
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

// Every game ends with a death, so the final score is always saved here.
function handlePacmanDied() {
  lives--;
  saveHighScore();
}

// Not on every point: the high score is written only when it went up since
// the last save, at a death and when the page is closed (main.js).
export function saveHighScore() {
  if (highScore <= savedScores.highScore) {
    return;
  }
  savedScores = { ...savedScores, highScore };
  saveScores(savedScores);
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

// Debug only: the score set directly (below the extra life, to test it).
// Whether the extra life was already given this game is kept: it still
// comes once per game.
export function setDebugScore(value) {
  score = value;
  highScore = Math.max(highScore, score);
}

// Counted from the maze itself (240 dots + 4 power pellets) instead of a
// hard-coded 244, so it stays right if the layout ever changes.
function countFood() {
  return countTiles(TILE.DOT) + countTiles(TILE.POWER_PELLET);
}

// Must run before the game loop starts: an event emitted before anyone
// subscribes is simply lost.
export function setupScoring() {
  savedScores = loadScores();
  highScore = savedScores.highScore;
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

// Best first; read-only for the caller (a fresh table replaces it on change).
export function getTopScores() {
  return savedScores.topScores;
}

// Whether the current score earns a place in the table.
export function isTopScore() {
  return qualifiesForTopScores(savedScores.topScores, score);
}

// The current score under this name, saved at once together with the high
// score (a top score can never be above it).
export function addTopScore(name) {
  savedScores = {
    highScore: Math.max(highScore, savedScores.highScore),
    topScores: insertTopScore(savedScores.topScores, { name, score }),
  };
  saveScores(savedScores);
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
