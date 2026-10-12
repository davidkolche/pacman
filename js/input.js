import { KEY_BINDINGS } from './constants.js';

// Input only records what the player wants; Pac-Man decides when that is
// possible. Key events arrive at random times, while movement runs in the
// fixed-step update.
let requestedDirection = null;

export function setupInput() {
  window.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(event) {
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
