import { EVENTS } from './constants.js';
import { SOUND } from './soundManifest.js';
import { on } from './events.js';
import { play } from './audio.js';

// The game's sounds: this module listens to the game's events (like
// score.js) and decides what plays. Pac-Man, the ghosts and the game only
// announce what happened; none of them knows sound exists.
//
// Only one-shots so far: each ends by itself, so a pause (the whole context
// freezes), a death, a level's end or game over can never leave one playing.
export function setupSoundEffects() {
  // One hit per dot, right as it is eaten, so the sound follows Pac-Man's
  // real rhythm (corners, gaps, faster levels). Power pellets get their own
  // sound later.
  on(EVENTS.DOT_EATEN, () => play(SOUND.DOT));
}
