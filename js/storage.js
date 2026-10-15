import {
  SCORES_STORAGE_KEY,
  TOP_SCORES_COUNT,
  TOP_SCORE_NAME_LENGTH,
  NAME_ALPHABET,
} from './constants.js';

// The only module that touches localStorage. The browser may refuse it at
// any moment (blocked site data, some private modes, a full quota), and what
// it returns may be broken (hand-edited, left by an old version). So every
// access is wrapped in try/catch and everything loaded is checked: the game
// itself never sees an error, at worst the scores are simply not kept.

// A fresh object every time, so no caller can change the defaults.
function defaultScores() {
  return { highScore: 0, topScores: [] };
}

function isValidScore(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isValidName(value) {
  return (
    typeof value === 'string' &&
    value.length === TOP_SCORE_NAME_LENGTH &&
    [...value].every((letter) => NAME_ALPHABET.includes(letter))
  );
}

function isValidEntry(entry) {
  return (
    typeof entry === 'object' && entry !== null &&
    isValidName(entry.name) && isValidScore(entry.score)
  );
}

function isValidScores(data) {
  return (
    typeof data === 'object' && data !== null &&
    isValidScore(data.highScore) &&
    Array.isArray(data.topScores) &&
    data.topScores.length <= TOP_SCORES_COUNT &&
    data.topScores.every(isValidEntry)
  );
}

// Only the known fields are copied (anything extra is dropped), the table
// is put in order, and the high score is never below the table's best.
function cleanScores(data) {
  const topScores = data.topScores
    .map(({ name, score }) => ({ name, score }))
    .sort((first, second) => second.score - first.score);
  const bestInTable = topScores.length > 0 ? topScores[0].score : 0;
  return { highScore: Math.max(data.highScore, bestInTable), topScores };
}

// Nothing saved yet, storage blocked, broken JSON or the wrong shape: all of
// them simply mean "start from the defaults".
export function loadScores() {
  let text;
  try {
    text = localStorage.getItem(SCORES_STORAGE_KEY);
  } catch {
    return defaultScores();
  }
  if (text === null) {
    return defaultScores();
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return defaultScores();
  }
  return isValidScores(data) ? cleanScores(data) : defaultScores();
}

// True if the scores were saved. A failure is not an error for the game:
// the scores still live in memory until the page closes.
export function saveScores(scores) {
  try {
    localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
    return true;
  } catch {
    return false;
  }
}
