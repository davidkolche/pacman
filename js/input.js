import {
  KEY_BINDINGS,
  DEBUG_ENABLED_AT_START,
  DEBUG_TOGGLE_KEY,
  DEBUG_CLEAR_DOTS_KEY,
  DEBUG_FRUIT_GALLERY_KEY,
  DEBUG_SPRITE_GALLERY_KEY,
  DEBUG_ADD_POINTS_KEY,
  DEBUG_MARQUEE_PATTERN_KEY,
  DEBUG_SOUND_GALLERY_KEY,
  DEBUG_SOUND_GALLERY_NEXT_KEY,
  DEBUG_SOUND_VARIANT_KEYS,
  SOUND_GALLERY_ACTION,
  START_KEY,
  PAUSE_KEY,
  MUTE_KEY,
  INPUT_MODE,
  NAME_ACTION,
  NAME_ENTRY_KEYS,
  NAME_ALPHABET,
  LETTER_KEY_PREFIX,
  DIGIT_KEY_PREFIXES,
  SPACE_KEY,
  NAME_BLANK,
} from './constants.js';

// Input only records what the player wants; Pac-Man decides when that is
// possible. Key events arrive at random times, while movement runs in the
// fixed-step update.
let requestedDirection = null;
let debugEnabled = DEBUG_ENABLED_AT_START;
// Single presses, not held keys: each stays true until the game reads it.
let startPressed = false;
let clearDotsPressed = false;
let addPointsPressed = false;
let pausePressed = false;
let mutePressed = false;
let marqueePatternPressed = false;
// A view switch, not a game action: it stays until pressed again.
let fruitGalleryOpen = false;
let spriteGalleryOpen = false;
let soundGalleryOpen = false;
// The sound gallery's key presses in order, read once per frame.
let soundGalleryActions = [];
let inputMode = INPUT_MODE.GAME;
// Name entry actions in the order they were pressed; the game reads them
// all in its next update (several keys may arrive between two updates).
let nameActions = [];

export function setupInput() {
  window.addEventListener('keydown', handleKeyDown);
}

// Switching mode drops everything still waiting from the other mode, so a
// key pressed on one screen never acts on the next one.
export function setInputMode(mode) {
  inputMode = mode;
  nameActions = [];
  startPressed = false;
  clearDotsPressed = false;
  addPointsPressed = false;
  pausePressed = false;
  mutePressed = false;
  marqueePatternPressed = false;
  soundGalleryActions = [];
  requestedDirection = null;
}

function handleKeyDown(event) {
  // Checked first: while a name is entered, no key reaches the game.
  if (inputMode === INPUT_MODE.NAME) {
    handleNameKey(event);
    return;
  }
  if (event.code === DEBUG_TOGGLE_KEY) {
    // A held key repeats keydown; without this, debug would flicker on and off.
    if (!event.repeat) {
      debugEnabled = !debugEnabled;
    }
    return;
  }
  // Ignored while debug is off, so a stray key can never end a level.
  if (event.code === DEBUG_CLEAR_DOTS_KEY && debugEnabled) {
    if (!event.repeat) {
      clearDotsPressed = true;
    }
    return;
  }
  if (event.code === DEBUG_ADD_POINTS_KEY && debugEnabled) {
    if (!event.repeat) {
      addPointsPressed = true;
    }
    return;
  }
  if (event.code === DEBUG_MARQUEE_PATTERN_KEY && debugEnabled) {
    if (!event.repeat) {
      marqueePatternPressed = true;
    }
    return;
  }
  // The galleries share the middle of the screen: opening one closes the others.
  if (event.code === DEBUG_FRUIT_GALLERY_KEY && debugEnabled) {
    if (!event.repeat) {
      fruitGalleryOpen = !fruitGalleryOpen;
      spriteGalleryOpen = false;
      soundGalleryOpen = false;
    }
    return;
  }
  if (event.code === DEBUG_SPRITE_GALLERY_KEY && debugEnabled) {
    if (!event.repeat) {
      spriteGalleryOpen = !spriteGalleryOpen;
      fruitGalleryOpen = false;
      soundGalleryOpen = false;
    }
    return;
  }
  if (event.code === DEBUG_SOUND_GALLERY_KEY && debugEnabled) {
    if (!event.repeat) {
      soundGalleryOpen = !soundGalleryOpen;
      fruitGalleryOpen = false;
      spriteGalleryOpen = false;
    }
    return;
  }
  if (debugEnabled && soundGalleryOpen && handleSoundGalleryKey(event)) {
    return;
  }
  if (event.code === START_KEY) {
    event.preventDefault();
    if (!event.repeat) {
      startPressed = true;
    }
    return;
  }
  // Reached only in GAME mode: during the name entry P and M are letters.
  if (event.code === PAUSE_KEY) {
    if (!event.repeat) {
      pausePressed = true;
    }
    return;
  }
  if (event.code === MUTE_KEY) {
    if (!event.repeat) {
      mutePressed = true;
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

// N and 1-5 mean something only while the sound gallery is open. Returns
// whether the key was one of them.
function handleSoundGalleryKey(event) {
  const variantIndex = DEBUG_SOUND_VARIANT_KEYS.indexOf(event.code);
  if (event.code !== DEBUG_SOUND_GALLERY_NEXT_KEY && variantIndex === -1) {
    return false;
  }
  if (!event.repeat) {
    soundGalleryActions.push(
      variantIndex === -1
        ? { action: SOUND_GALLERY_ACTION.NEXT }
        : { action: SOUND_GALLERY_ACTION.PLAY, variantIndex },
    );
  }
  return true;
}

// The character a key types, or null. By physical key: "KeyD" -> "D",
// "Digit7" and "Numpad7" -> "7", "Space" -> a blank. The alphabet check
// drops the rest ("NumpadAdd" gives "Add", which is not one character).
function typedCharacter(code) {
  if (code === SPACE_KEY) {
    return NAME_BLANK;
  }
  const prefix = [LETTER_KEY_PREFIX, ...DIGIT_KEY_PREFIXES].find((start) => code.startsWith(start));
  if (!prefix) {
    return null;
  }
  const character = code.slice(prefix.length);
  return character.length === 1 && NAME_ALPHABET.includes(character) ? character : null;
}

// Held keys repeat (deleting or stepping through letters quickly), except
// Enter: one press confirms once. Keys that do nothing here are ignored
// and keep their normal browser behavior (F5, F12...).
function handleNameKey(event) {
  // Browser shortcuts (Ctrl+R, Alt+Tab...) are not typing.
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  const action = NAME_ENTRY_KEYS[event.code];
  const character = action ? null : typedCharacter(event.code);
  if (!action && character === null) {
    return;
  }
  // Space and the arrows would scroll the page, Backspace may go back.
  event.preventDefault();
  if (action === NAME_ACTION.CONFIRM && event.repeat) {
    return;
  }
  nameActions.push(action ? { action } : { action: NAME_ACTION.TYPE, character });
}

// All name actions since the last call, oldest first; reading clears them.
export function consumeNameActions() {
  const actions = nameActions;
  nameActions = [];
  return actions;
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

export function consumeClearDotsPress() {
  const wasPressed = clearDotsPressed;
  clearDotsPressed = false;
  return wasPressed;
}

export function consumeAddPointsPress() {
  const wasPressed = addPointsPressed;
  addPointsPressed = false;
  return wasPressed;
}

export function consumePausePress() {
  const wasPressed = pausePressed;
  pausePressed = false;
  return wasPressed;
}

export function consumeMutePress() {
  const wasPressed = mutePressed;
  mutePressed = false;
  return wasPressed;
}

export function consumeMarqueePatternPress() {
  const wasPressed = marqueePatternPressed;
  marqueePatternPressed = false;
  return wasPressed;
}

// All sound gallery actions since the last call, oldest first.
export function consumeSoundGalleryActions() {
  const actions = soundGalleryActions;
  soundGalleryActions = [];
  return actions;
}

export function isDebugEnabled() {
  return debugEnabled;
}

// Shown only while debug is on too (main.js checks both).
export function isFruitGalleryOpen() {
  return fruitGalleryOpen;
}

export function isSpriteGalleryOpen() {
  return spriteGalleryOpen;
}

export function isSoundGalleryOpen() {
  return soundGalleryOpen;
}
