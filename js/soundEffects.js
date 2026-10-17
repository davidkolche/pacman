import { EVENTS, GAME_STATE, FRIGHTENED_FLASH_LOOP_RATE } from './constants.js';
import { SOUND } from './soundManifest.js';
import { on } from './events.js';
import { play } from './audio.js';

// The game's sounds: this module listens to the game's events (like
// score.js) and decides what plays. Pac-Man, the ghosts and the game only
// announce what happened; none of them knows sound exists.
//
// One-shots end by themselves, so a pause (the whole context freezes), a
// death, a level's end or game over can never leave one playing. Each sound
// has its own voices, so one never cuts another short.
export function setupSoundEffects() {
  // One hit per dot, right as it is eaten, so the sound follows Pac-Man's
  // real rhythm (corners, gaps, faster levels).
  on(EVENTS.DOT_EATEN, () => play(SOUND.DOT));
  on(EVENTS.POWER_PELLET_EATEN, playPowerPellet);
}

// Played for every pellet, also on levels whose frightened time is 0 (the
// ghosts only turn around there): the player still ate it.
// TODO (level complete sound): when this pellet was the level's last food,
// the level-complete sound should win. score.js counts the food before this
// listener runs (it subscribes first), so getDotsRemaining() === 0 here means
// it was the last one.
function playPowerPellet() {
  play(SOUND.POWER_PELLET);
}

// The background loop: the one place that decides which loop plays, from a
// snapshot of the game (main.js builds it every frame):
//   { state, isAnyGhostFrightened, isFrightFlashing }
// Pure: the same snapshot always gives the same answer, and audio.js
// (setBackgroundLoop) only acts when the answer changes. A loop is never
// started or stopped anywhere else.
//
// Only PLAYING has a loop: READY (also before the first direction key),
// DYING, LEVEL_COMPLETE, GAME_OVER and the screens never do. A pause is not
// a reason to return null: it suspends the whole audio clock, so the loop
// freezes mid-note and goes on from there after P; null would fade it out
// and restart it from its beginning.
export function getActiveLoop({ state, isAnyGhostFrightened }) {
  if (state !== GAME_STATE.PLAYING) {
    return null;
  }
  // Blue or flashing, any ghost: not ones already eaten (eyes) or still in
  // the house.
  return isAnyGhostFrightened ? SOUND.FRIGHTENED : null;
}

// How much faster the active loop plays: a little while the ghosts flash.
export function activeLoopRateFactor({ isFrightFlashing }) {
  return isFrightFlashing ? FRIGHTENED_FLASH_LOOP_RATE : 1;
}
