import { KEY_BINDINGS, DEBUG_ENABLED_AT_START, DEBUG_TOGGLE_KEY } from './constants.js';

// Input only records what the player wants; Pac-Man decides when that is
// possible. Key events arrive at random times, while movement runs in the
// fixed-step update.
let requestedDirection = null;
let debugEnabled = DEBUG_ENABLED_AT_START;

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

export function isDebugEnabled() {
  return debugEnabled;
}
