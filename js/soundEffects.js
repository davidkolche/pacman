import {
  EVENTS,
  GAME_STATE,
  FRIGHTENED_FLASH_LOOP_RATE,
  AUDIO_LOOP_DUCK_VOLUME,
  AUDIO_GHOST_CHAIN_RATE_STEP,
  AUDIO_GHOST_CHAIN_VOLUME_STEP,
  AUDIO_JINGLE_STOP_FADE_SECONDS,
} from './constants.js';
import { SOUND } from './soundManifest.js';
import { on } from './events.js';
import { play, stopSound } from './audio.js';

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
  // Emitted right as the freeze starts, so the sound starts with it.
  on(EVENTS.GHOST_EATEN, ({ chainIndex }) => play(SOUND.GHOST_EATEN, ghostChainOptions(chainIndex)));
  // The collision: the last dots' hits stop at once (a short fade, no
  // click). The loops stop by themselves in the same frame: the state is
  // DYING now, so getActiveLoop says null.
  on(EVENTS.PACMAN_DIED, () => stopSound(SOUND.DOT));
  // Not at the collision: after the death freeze, with the animation.
  on(EVENTS.DEATH_ANIMATION_STARTED, () => play(SOUND.DEATH));
  // A new game only (its own event, not every READY). Enter is often the
  // page's first key, the one that creates the AudioContext; play() waits
  // for it to start (and for the file, right after a refresh).
  on(EVENTS.GAME_STARTED, () => play(SOUND.GAME_START));
  // The jingle belongs to the wait in READY: the first direction key ends
  // it (a fade, not a cut). After a death or on a new level it is not
  // playing, and this does nothing.
  on(EVENTS.PLAY_STARTED, () => stopSound(SOUND.GAME_START, { fadeSeconds: AUDIO_JINGLE_STOP_FADE_SECONDS }));
}

// Each ghost of the chain a step above the one before: faster (higher and a
// little shorter) and louder, so 200-400-800-1600 builds up. The small
// random pitch of every play (manifest) is far smaller than a step.
export function ghostChainOptions(chainIndex) {
  return {
    rateFactor: AUDIO_GHOST_CHAIN_RATE_STEP ** chainIndex,
    volumeFactor: AUDIO_GHOST_CHAIN_VOLUME_STEP ** chainIndex,
  };
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
//   { state, isAnyGhostFrightened, isFrightFlashing, isGhostEatenFreeze,
//     isJinglePlaying }
// Pure: the same snapshot always gives the same answer, and audio.js
// (setBackgroundLoop) only acts when the answer changes. A loop is never
// started or stopped anywhere else.
//
// Only PLAYING has a loop: READY (also before the first direction key),
// DYING, LEVEL_COMPLETE, GAME_OVER and the screens never do. A pause is not
// a reason to return null: it suspends the whole audio clock, so the loop
// freezes mid-note and goes on from there after P; null would fade it out
// and restart it from its beginning.
// The new game's jingle has the floor: no loop starts on top of it, also
// during its short fade after the first direction key.
export function getActiveLoop({ state, isAnyGhostFrightened, isJinglePlaying }) {
  if (state !== GAME_STATE.PLAYING || isJinglePlaying) {
    return null;
  }
  // Blue or flashing, any ghost: not ones already eaten (eyes) or still in
  // the house.
  return isAnyGhostFrightened ? SOUND.FRIGHTENED : null;
}

// How the active loop plays, on top of the manifest ({ rate, volume }
// factors): a little faster while the ghosts flash, ducked while the game
// freezes on an eaten ghost so the eating sound stands out. The loop itself
// goes on: only its speed and volume glide (audio.js setBackgroundLoop).
export function activeLoopMix({ isFrightFlashing, isGhostEatenFreeze }) {
  return {
    rate: isFrightFlashing ? FRIGHTENED_FLASH_LOOP_RATE : 1,
    volume: isGhostEatenFreeze ? AUDIO_LOOP_DUCK_VOLUME : 1,
  };
}
