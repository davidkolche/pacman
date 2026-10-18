import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_STATE } from '../js/constants.js';
import { SOUND } from '../js/soundManifest.js';
import { getActiveLoop } from '../js/soundEffects.js';

// getActiveLoop is pure: it gets the snapshot main.js builds every frame
// (backgroundLoopSituation) and returns the loop's name or null. A test only
// builds that object; no AudioContext and no game are needed.
// Defaults: playing, no ghost blue, no jingle; each test changes what it checks.
function snapshot(overrides = {}) {
  return {
    state: GAME_STATE.PLAYING,
    isAnyGhostFrightened: false,
    isFrightFlashing: false,
    isGhostEatenFreeze: false,
    isJinglePlaying: false,
    extraLifePlayedSeconds: null,
    ...overrides,
  };
}

const NOT_PLAYING_STATES = Object.values(GAME_STATE).filter((state) => state !== GAME_STATE.PLAYING);

describe('getActiveLoop while playing', () => {
  test('a frightened ghost (blue) plays the frightened loop', () => {
    assert.equal(getActiveLoop(snapshot({ isAnyGhostFrightened: true })), SOUND.FRIGHTENED);
  });

  test('flashing ghosts are still frightened: same loop', () => {
    assert.equal(
      getActiveLoop(snapshot({ isAnyGhostFrightened: true, isFrightFlashing: true })),
      SOUND.FRIGHTENED,
    );
  });

  test('the ghost-eaten freeze and the extra life only duck it, they never change it', () => {
    const situation = snapshot({ isAnyGhostFrightened: true, isGhostEatenFreeze: true, extraLifePlayedSeconds: 0.2 });
    assert.equal(getActiveLoop(situation), SOUND.FRIGHTENED);
  });

  // The siren (background-loop) was skipped at stage 12.14.
  test('normal play with no frightened ghost has no loop (no siren)', () => {
    assert.equal(getActiveLoop(snapshot()), null);
  });

  // The eyes-return loop was skipped at stage 12.14. Eaten ghosts (eyes) are
  // not FRIGHTENED, so with only eyes left isAnyGhostFrightened is false.
  test('only eyes flying home: no loop (no eyes-return loop)', () => {
    assert.equal(getActiveLoop(snapshot({ isAnyGhostFrightened: false })), null);
  });

  test('the new game\'s jingle has the floor: no loop on top of it', () => {
    assert.equal(getActiveLoop(snapshot({ isJinglePlaying: true })), null);
    assert.equal(getActiveLoop(snapshot({ isAnyGhostFrightened: true, isJinglePlaying: true })), null);
  });
});

describe('getActiveLoop outside play', () => {
  test('every state but PLAYING has no loop, even with a frightened ghost', () => {
    assert.deepEqual(NOT_PLAYING_STATES.sort(), [
      GAME_STATE.DYING, GAME_STATE.GAME_OVER, GAME_STATE.LEVEL_COMPLETE,
      GAME_STATE.NAME_ENTRY, GAME_STATE.READY, GAME_STATE.START,
    ].sort());
    for (const state of NOT_PLAYING_STATES) {
      assert.equal(getActiveLoop(snapshot({ state, isAnyGhostFrightened: true })), null, state);
    }
  });

  // Pause and mute are not part of the snapshot on purpose: a pause suspends
  // the whole AudioContext (the loop freezes mid-note and goes on after P),
  // and mute only fades the master. Returning null would restart the loop
  // from its beginning. A paused game is still PLAYING.
  test('pause and mute do not change the answer', () => {
    const paused = snapshot({ isAnyGhostFrightened: true, isPaused: true, isMuted: true });
    assert.equal(getActiveLoop(paused), SOUND.FRIGHTENED);
  });
});

describe('getActiveLoop is pure', () => {
  test('the same snapshot always gives the same answer, and it is not changed', () => {
    const situation = Object.freeze(snapshot({ isAnyGhostFrightened: true }));
    assert.equal(getActiveLoop(situation), getActiveLoop(situation));
  });

  test('it never answers with anything but the frightened loop or null', () => {
    const answers = new Set();
    for (const state of Object.values(GAME_STATE)) {
      for (const isAnyGhostFrightened of [false, true]) {
        for (const isJinglePlaying of [false, true]) {
          answers.add(getActiveLoop(snapshot({ state, isAnyGhostFrightened, isJinglePlaying })));
        }
      }
    }
    assert.deepEqual([...answers].sort(), [SOUND.FRIGHTENED, null].sort());
  });
});
