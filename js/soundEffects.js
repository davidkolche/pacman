import {
  EVENTS,
  GAME_STATE,
  FRIGHTENED_FLASH_LOOP_RATE,
  AUDIO_LOOP_DUCK_VOLUME,
  AUDIO_EXTRA_LIFE_DUCK_SECONDS,
  AUDIO_GHOST_CHAIN_RATE_STEP,
  AUDIO_GHOST_CHAIN_VOLUME_STEP,
  AUDIO_JINGLE_STOP_FADE_SECONDS,
  AUDIO_LAST_DOT_FADE_SECONDS,
  AUDIO_LEVEL_COMPLETE_STOP_FADE_SECONDS,
  AUDIO_GAME_OVER_STOP_FADE_SECONDS,
  AUDIO_FRUIT_EAT_RATES,
  FRUIT,
  GHOST_EATEN_POINTS,
} from './constants.js';
import { SOUND } from './soundManifest.js';
import { on } from './events.js';
import { play, stopSound, soundRemainingSeconds } from './audio.js';
import { getDotsRemaining } from './score.js';

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
  on(EVENTS.GAME_STARTED, () => {
    stopGameOver();
    play(SOUND.GAME_START);
  });
  // The jingle belongs to the wait in READY: the first direction key ends
  // it (a fade, not a cut). After a death or on a new level it is not
  // playing, and this does nothing.
  on(EVENTS.PLAY_STARTED, () => stopSound(SOUND.GAME_START, { fadeSeconds: AUDIO_JINGLE_STOP_FADE_SECONDS }));
  // The last food: the dots' hits fade (the loops stop by themselves, the
  // state is LEVEL_COMPLETE now); a ghost-eaten sound still playing is left
  // to finish. The music comes with the flash, after the freeze.
  on(EVENTS.LEVEL_COMPLETED, () => stopSound(SOUND.DOT, { fadeSeconds: AUDIO_LAST_DOT_FADE_SECONDS }));
  on(EVENTS.MAZE_FLASH_STARTED, () => play(SOUND.LEVEL_COMPLETE));
  // The next level's READY is silent: the music is longer than the flash and
  // fades out here; no jingle (that is GAME_STARTED only).
  on(EVENTS.NEXT_LEVEL_STARTED, () => {
    stopSound(SOUND.LEVEL_COMPLETE, { fadeSeconds: AUDIO_LEVEL_COMPLETE_STOP_FADE_SECONDS });
  });
  // After the last life. The death sound is normally over long before (it
  // ends 0.7 s before GAME OVER), but if it still sounds, game over waits
  // for it instead of playing on top of it.
  on(EVENTS.GAME_OVER_STARTED, () => {
    play(SOUND.GAME_OVER, { delaySeconds: soundRemainingSeconds(SOUND.DEATH) });
  });
  // The music is shorter than the GAME OVER screen, so these only matter if
  // it started late: it never plays under the typing, the attract screen or
  // the new game's jingle.
  on(EVENTS.NAME_ENTRY_STARTED, () => {
    stopGameOver();
    // A new-high-score sound would go here (skipped at stage 12.14, see
    // CLAUDE.md): the moment the score is known to enter the top 10.
  });
  on(EVENTS.ATTRACT_STARTED, stopGameOver);
  // The fruit: quietly when it appears, its own sound (higher for the later
  // fruits) when eaten, with the floating points. Neither ducks nor stops
  // anything: the frightened loop and a ghost-eaten sound go on as they are.
  // Nothing plays when it goes away uneaten.
  on(EVENTS.FRUIT_APPEARED, () => play(SOUND.FRUIT_APPEAR));
  on(EVENTS.FRUIT_EATEN, ({ fruit }) => play(SOUND.FRUIT_EAT, { rateFactor: AUDIO_FRUIT_EAT_RATES[fruit] }));
  // score.js emits it once per game, inside the points of the dot, pellet,
  // ghost or fruit that crossed 10,000, so it comes right before that
  // item's own sound in the same frame: both play (own voices), and the
  // loop ducks under its first chime (activeLoopMix). Nothing stops it: on
  // the last dot it rings on into the maze flash, with the level-complete
  // music.
  on(EVENTS.EXTRA_LIFE, () => play(SOUND.EXTRA_LIFE));
}

console.assert(
  Object.values(FRUIT).every((fruit) => fruit in AUDIO_FRUIT_EAT_RATES),
  'Every fruit needs a fruit-eaten sound rate',
);

// Debug gallery (key 5): a sound's pitch steps, as the game plays them, or
// null for a sound without steps.
export function soundSteps(name) {
  if (name === SOUND.GHOST_EATEN) {
    return GHOST_EATEN_POINTS.map((_, chainIndex) => ghostChainOptions(chainIndex));
  }
  if (name === SOUND.FRUIT_EAT) {
    return Object.values(FRUIT).map((fruit) => ({ rateFactor: AUDIO_FRUIT_EAT_RATES[fruit] }));
  }
  return null;
}

function stopGameOver() {
  stopSound(SOUND.GAME_OVER, { fadeSeconds: AUDIO_GAME_OVER_STOP_FADE_SECONDS });
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
// ghosts only turn around there): the player still ate it. Not for the
// level's last food: then the level-complete music has the floor (and the
// frightened loop never starts, since the state is LEVEL_COMPLETE). score.js
// counts the food before this listener runs (it subscribes first), so 0
// left here means this pellet was the last one.
function playPowerPellet() {
  if (getDotsRemaining() === 0) {
    return;
  }
  play(SOUND.POWER_PELLET);
}

// The background loop: the one place that decides which loop plays, from a
// snapshot of the game (main.js builds it every frame):
//   { state, isAnyGhostFrightened, isFrightFlashing, isGhostEatenFreeze,
//     isJinglePlaying, extraLifePlayedSeconds }
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
// freezes on an eaten ghost so the eating sound stands out, and under the
// extra-life sound's first chime (extraLifePlayedSeconds: null when it is
// not playing). The loop itself goes on: only its speed and volume glide
// (audio.js setBackgroundLoop).
export function activeLoopMix({ isFrightFlashing, isGhostEatenFreeze, extraLifePlayedSeconds }) {
  const isExtraLifeChime = extraLifePlayedSeconds !== null
    && extraLifePlayedSeconds < AUDIO_EXTRA_LIFE_DUCK_SECONDS;
  return {
    rate: isFrightFlashing ? FRIGHTENED_FLASH_LOOP_RATE : 1,
    volume: isGhostEatenFreeze || isExtraLifeChime ? AUDIO_LOOP_DUCK_VOLUME : 1,
  };
}
