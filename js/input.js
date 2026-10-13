import { KEY_BINDINGS, DEBUG_ENABLED_AT_START, DEBUG_TOGGLE_KEY, START_KEY } from './constants.js';

// Input only records what the player wants; Pac-Man decides when that is
// possible. Key events arrive at random times, while movement runs in the
// fixed-step update.
let requestedDirection = null;
let debugEnabled = DEBUG_ENABLED_AT_START;
// A single press, not a held key: it stays true until the game reads it.
let startPressed = false;

export function setupInput() {
  window.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(event) {
  if (event.code === DEBUG_TOGGLE_KEY) {
    // A held key repeats keydown; without this, debug would flicker on and off.
    if (!event.repeat) {
      debugEnabled = !debugEnabled;
    }
    return;
  }
  if (event.code === START_KEY) {
    event.preventDefault();
    if (!event.repeat) {
      startPressed = true;
    }
    return;
  }
  const direction = KEY_BINDINGS[event.code];
  if (!direction) {
    return;
  }
  // Arrow keys would otherwise scroll the page.
  event.preventDefault();
  requestedDirection = direction;
}

// The last direction stays requested, like a held arcade joystick.
export function getRequestedDirection() {
  return requestedDirection;
}

// Forgets the held direction, so an arrow pressed on an earlier screen
// does not start the game by itself.
export function clearRequestedDirection() {
  requestedDirection = null;
}

// True once per press: reading it also clears it, so one press of Enter
// cannot count twice.
export function consumeStartPress() {
  const wasPressed = startPressed;
  startPressed = false;
  return wasPressed;
}

export function isDebugEnabled() {
  return debugEnabled;
}
