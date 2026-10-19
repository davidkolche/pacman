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

describe('getActiveLoop on the attract screen', () => {
  test('START (characters and top 10 table alike) plays the attract music', () => {
    assert.equal(getActiveLoop(snapshot({ state: GAME_STATE.START })), SOUND.ATTRACT_MUSIC);
  });

  // The snapshot's other fields belong to play; on START they cannot change
  // the answer (after GAME OVER the last game's values may still be read).
  test('nothing from the last game changes it', () => {
    const leftovers = snapshot({
      state: GAME_STATE.START,
      isAnyGhostFrightened: true,
      isFrightFlashing: true,
      isGhostEatenFreeze: true,
      isJinglePlaying: true,
      extraLifePlayedSeconds: 0.2,
    });
    assert.equal(getActiveLoop(leftovers), SOUND.ATTRACT_MUSIC);
  });

  test('a new game (READY) and play have no attract music', () => {
    assert.notEqual(getActiveLoop(snapshot({ state: GAME_STATE.READY })), SOUND.ATTRACT_MUSIC);
    assert.notEqual(getActiveLoop(snapshot({ state: GAME_STATE.PLAYING })), SOUND.ATTRACT_MUSIC);
    assert.notEqual(getActiveLoop(snapshot({ isAnyGhostFrightened: true })), SOUND.ATTRACT_MUSIC);
  });

  // The flow after the last life: DYING -> GAME_OVER -> NAME_ENTRY (a top 10
  // score) -> START. Only START has the music back.
  test('the game over screen and the name entry stay silent', () => {
    for (const state of [GAME_STATE.DYING, GAME_STATE.GAME_OVER, GAME_STATE.NAME_ENTRY]) {
      assert.equal(getActiveLoop(snapshot({ state })), null, state);
    }
  });
});

describe('getActiveLoop outside play and the attract screen', () => {
  const SILENT_STATES = NOT_PLAYING_STATES.filter((state) => state !== GAME_STATE.START);

  test('every state but PLAYING and START has no loop, even with a frightened ghost', () => {
    assert.deepEqual([...SILENT_STATES].sort(), [
      GAME_STATE.DYING, GAME_STATE.GAME_OVER, GAME_STATE.LEVEL_COMPLETE,
      GAME_STATE.NAME_ENTRY, GAME_STATE.READY,
    ].sort());
    for (const state of SILENT_STATES) {
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
    const mutedAttract = snapshot({ state: GAME_STATE.START, isMuted: true });
    assert.equal(getActiveLoop(mutedAttract), SOUND.ATTRACT_MUSIC);
  });
});

describe('getActiveLoop is pure', () => {
  test('the same snapshot always gives the same answer, and it is not changed', () => {
    const situation = Object.freeze(snapshot({ isAnyGhostFrightened: true }));
    assert.equal(getActiveLoop(situation), getActiveLoop(situation));
  });

  test('it never answers with anything but the frightened loop, the attract music or null', () => {
    const answers = new Set();
    for (const state of Object.values(GAME_STATE)) {
      for (const isAnyGhostFrightened of [false, true]) {
        for (const isJinglePlaying of [false, true]) {
          answers.add(getActiveLoop(snapshot({ state, isAnyGhostFrightened, isJinglePlaying })));
        }
      }
    }
    assert.deepEqual([...answers].sort(), [SOUND.FRIGHTENED, SOUND.ATTRACT_MUSIC, null].sort());
  });
});
