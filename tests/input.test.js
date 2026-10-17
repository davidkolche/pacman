import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTION, GAME_STATE, INPUT_MODE, START_KEY } from '../js/constants.js';
import * as input from '../js/input.js';
import { Game } from '../js/game.js';

// input.js listens to the window's keydown; Node has no window, so a fake one
// catches the listener and the tests send it key events like a browser would.
const windowListeners = {};
globalThis.window = {
  addEventListener(type, listener) {
    windowListeners[type] = listener;
  },
};
input.setupInput();

// A held key sends keydown again about every 30 ms with repeat set.
function keyDown(code, { repeat = false } = {}) {
  windowListeners.keydown({ code, repeat, shiftKey: false, preventDefault() {} });
}

const FRAME_MS = 1000 / 60;

// input.js keeps one state for the program: every test starts from no keys.
beforeEach(() => {
  input.setInputMode(INPUT_MODE.GAME);
});

describe('held direction keys (REVIEW B1)', () => {
  test('a new press requests the direction', () => {
    keyDown('ArrowLeft');
    assert.equal(input.getRequestedDirection(), DIRECTION.LEFT);
  });

  test('the auto-repeat of a held key does not bring back a cleared direction', () => {
    keyDown('ArrowLeft');
    input.clearRequestedDirection();
    keyDown('ArrowLeft', { repeat: true });
    assert.equal(input.getRequestedDirection(), null);
  });

  test('a new press after the clear requests the direction again', () => {
    keyDown('ArrowLeft');
    input.clearRequestedDirection();
    keyDown('ArrowLeft');
    assert.equal(input.getRequestedDirection(), DIRECTION.LEFT);
  });
});

describe('READY waits for a new direction press (REVIEW B1)', () => {
  let game;

  beforeEach(() => {
    game = new Game({ input });
    keyDown(START_KEY);
    game.update(FRAME_MS);
  });

  afterEach(() => {
    game.disconnect();
  });

  test('Enter starts a new game in READY', () => {
    assert.equal(game.state, GAME_STATE.READY);
  });

  test('a key held from before READY does not start play', () => {
    keyDown('ArrowLeft', { repeat: true });
    game.update(FRAME_MS);
    assert.equal(game.state, GAME_STATE.READY);
  });

  test('a new press starts play', () => {
    keyDown('ArrowLeft');
    game.update(FRAME_MS);
    assert.equal(game.state, GAME_STATE.PLAYING);
  });
});
