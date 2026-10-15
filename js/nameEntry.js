import { TOP_SCORE_NAME_MAX_LENGTH, NAME_ALPHABET, NAME_BLANK, NAME_ACTION } from './constants.js';

const LAST_SLOT = TOP_SCORE_NAME_MAX_LENGTH - 1;

// The name being entered: a fixed row of slots (one per character, blank
// when empty) and a cursor on one of them, like the arcade's initials.
// Typing and the arrows both edit the same slots, so they mix freely.
// It knows nothing about keys or drawing: input.js turns keys into actions,
// ui.js draws the slots.
export class NameEntry {
  constructor() {
    this.slots = Array(TOP_SCORE_NAME_MAX_LENGTH).fill(NAME_BLANK);
    this.cursor = 0;
  }

  // One action from input.js ({ action, character }).
  apply({ action, character }) {
    switch (action) {
      case NAME_ACTION.TYPE:
        this.type(character);
        break;
      case NAME_ACTION.DELETE:
        this.deleteCharacter();
        break;
      case NAME_ACTION.LETTER_UP:
        this.stepLetter(1);
        break;
      case NAME_ACTION.LETTER_DOWN:
        this.stepLetter(-1);
        break;
      case NAME_ACTION.CURSOR_LEFT:
        this.moveCursor(-1);
        break;
      case NAME_ACTION.CURSOR_RIGHT:
        this.moveCursor(1);
        break;
    }
  }

  // Writes into the slot and moves on; on the last slot the cursor stays,
  // so further typing replaces the last character.
  type(character) {
    this.slots[this.cursor] = character;
    this.moveCursor(1);
  }

  // Like Backspace in a text field: after typing "BOB" the cursor waits on
  // the empty fourth slot, so the B before it goes. A character under the
  // cursor itself (a full name, or one changed with the arrows) goes first.
  deleteCharacter() {
    if (this.slots[this.cursor] === NAME_BLANK) {
      this.moveCursor(-1);
    }
    this.slots[this.cursor] = NAME_BLANK;
  }

  // Up and down walk through NAME_ALPHABET and wrap around at both ends.
  stepLetter(step) {
    const index = NAME_ALPHABET.indexOf(this.slots[this.cursor]);
    const next = (index + step + NAME_ALPHABET.length) % NAME_ALPHABET.length;
    this.slots[this.cursor] = NAME_ALPHABET[next];
  }

  moveCursor(step) {
    this.cursor = Math.min(LAST_SLOT, Math.max(0, this.cursor + step));
  }

  // Blanks at either end are dropped; blanks inside stay ("AL B").
  name() {
    return this.slots.join('').trim();
  }

  isEmpty() {
    return this.name() === '';
  }
}
