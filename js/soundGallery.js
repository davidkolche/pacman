import { SOUND_GALLERY_ACTION, SOUND_LOAD_STATE } from './constants.js';
import { SOUND_MANIFEST } from './soundManifest.js';
import {
  play,
  stopSound,
  startLoop,
  stopLoop,
  soundDuration,
  soundLoadState,
  isSoundPlaying,
} from './audio.js';

// Debug: the sound gallery (B). Every sound of the manifest, one selected;
// N moves on, 1 plays it (a loop starts and keeps going), 2 stops it.
const NAMES = Object.keys(SOUND_MANIFEST);
let selectedIndex = 0;

// While the game is paused play() stays silent by itself and a loop waits
// for the resume, so a press then only changes the selection or the loop.
export function applySoundGalleryActions(actions) {
  if (NAMES.length === 0) {
    return;
  }
  for (const { action } of actions) {
    const name = NAMES[selectedIndex];
    const isLoop = SOUND_MANIFEST[name].loop;
    if (action === SOUND_GALLERY_ACTION.NEXT) {
      selectedIndex = (selectedIndex + 1) % NAMES.length;
    } else if (action === SOUND_GALLERY_ACTION.PLAY) {
      playSelected(name, isLoop);
    } else if (action === SOUND_GALLERY_ACTION.STOP) {
      stopSelected(name, isLoop);
    }
  }
}

function playSelected(name, isLoop) {
  if (isLoop) {
    startLoop(name);
  } else {
    play(name);
  }
}

function stopSelected(name, isLoop) {
  if (isLoop) {
    stopLoop(name);
  } else {
    stopSound(name);
  }
}

// What the panel shows (renderer.js draws it): one line per sound.
export function soundGalleryView() {
  return NAMES.map((name, index) => ({
    label: SOUND_MANIFEST[name].label,
    isSelected: index === selectedIndex,
    loadState: soundLoadState(name),
    durationSeconds: soundDuration(name),
    isLoop: SOUND_MANIFEST[name].loop,
    isPlaying: soundLoadState(name) === SOUND_LOAD_STATE.READY && isSoundPlaying(name),
  }));
}
