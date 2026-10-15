import {
  SCORES_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  TOP_SCORES_COUNT,
  TOP_SCORE_NAME_MAX_LENGTH,
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

// 1 to TOP_SCORE_NAME_MAX_LENGTH characters from NAME_ALPHABET, and no
// blank at either end (names are saved trimmed, see NameEntry.name()).
function isValidName(value) {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= TOP_SCORE_NAME_MAX_LENGTH &&
    value === value.trim() &&
    [...value].every((character) => NAME_ALPHABET.includes(character))
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

// The saved value under this key, or null when there is nothing usable:
// nothing saved yet, storage blocked or broken JSON.
function readJson(key) {
  let text;
  try {
    text = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// True if the value was saved. A failure is not an error for the game: the
// value still lives in memory until the page closes.
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Anything unusable or of the wrong shape simply means "start from the
// defaults".
export function loadScores() {
  const data = readJson(SCORES_STORAGE_KEY);
  return isValidScores(data) ? cleanScores(data) : defaultScores();
}

export function saveScores(scores) {
  return writeJson(SCORES_STORAGE_KEY, scores);
}

function defaultSettings() {
  return { muted: false };
}

function isValidSettings(data) {
  return typeof data === 'object' && data !== null && typeof data.muted === 'boolean';
}

// Like the scores: only the known field is kept, anything else -> defaults.
export function loadSettings() {
  const data = readJson(SETTINGS_STORAGE_KEY);
  return isValidSettings(data) ? { muted: data.muted } : defaultSettings();
}

export function saveSettings(settings) {
  return writeJson(SETTINGS_STORAGE_KEY, settings);
}
