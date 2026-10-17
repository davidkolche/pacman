import {
  SOUND_GALLERY_ACTION,
  SOUND_LOAD_STATE,
  SOUND_GALLERY_RATE_MIN,
  SOUND_GALLERY_RATE_MAX,
  SOUND_GALLERY_RATE_STEP,
  SOUND_GALLERY_RATE_DECIMALS,
  SOUND_GALLERY_DOT_RUN_COUNT,
  SOUND_GALLERY_DOT_RUN_LEVEL,
  SOUND_GALLERY_SEAM_LEAD_SECONDS,
  SOUND_ANALYSIS_DECIMALS,
  MAX_SPEED_PIXELS_PER_SECOND,
  TILE_SIZE,
  DOT_PAUSE_FRAMES,
  FIXED_TIMESTEP_MS,
  MS_PER_SECOND,
} from './constants.js';
import { SOUND_MANIFEST } from './soundManifest.js';
import { getLevelConfig } from './levels.js';
import {
  play,
  stopSound,
  startLoop,
  stopLoop,
  soundDuration,
  soundLoadState,
  isSoundPlaying,
  soundPlaybackRate,
  setPlaybackRateOverride,
  soundBuffer,
  soundLoopBuffer,
  soundTrim,
} from './audio.js';
import { logSoundAnalysis } from './soundAnalysis.js';

// Debug: the sound gallery (B). Every sound of the manifest, one selected;
// N moves on, 1 plays it (a loop starts and keeps going), 2 stops it, 3
// plays a run of it at the rhythm dots are eaten, 4 prints its file's hits
// to the console. An HTML slider under the canvas sets its playback rate
// live, heard in the game too, for this session.
const NAMES = Object.keys(SOUND_MANIFEST);
let selectedIndex = 0;
// The slider is built the first time the gallery opens.
let rateControl = null;

function selectedName() {
  return NAMES[selectedIndex];
}

// While the game is paused play() stays silent by itself and a loop waits
// for the resume, so a press then only changes the selection or the loop.
export function applySoundGalleryActions(actions) {
  if (NAMES.length === 0) {
    return;
  }
  for (const { action } of actions) {
    const name = selectedName();
    const isLoop = SOUND_MANIFEST[name].loop;
    if (action === SOUND_GALLERY_ACTION.NEXT) {
      selectedIndex = (selectedIndex + 1) % NAMES.length;
      showSelectedRate();
    } else if (action === SOUND_GALLERY_ACTION.PLAY) {
      playSelected(name, isLoop);
    } else if (action === SOUND_GALLERY_ACTION.STOP) {
      stopSelected(name, isLoop);
    } else if (action === SOUND_GALLERY_ACTION.DOT_RUN && !isLoop) {
      playDotRun(name);
    } else if (action === SOUND_GALLERY_ACTION.ANALYZE) {
      analyze(name);
    }
  }
}

// A loop starts a little before its end, so the seam is heard at once and
// then once every round, for as long as it runs.
function playSelected(name, isLoop) {
  if (isLoop) {
    const trim = soundTrim(name);
    const fromSeconds = trim && Math.max(trim.startSeconds, trim.endSeconds - SOUND_GALLERY_SEAM_LEAD_SECONDS);
    startLoop(name, { fromSeconds });
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

// As if Pac-Man ate a straight corridor of dots: all plays are scheduled at
// once on the audio clock, so a pause freezes the run with the game and 2
// cancels the plays still waiting.
function playDotRun(name) {
  const interval = dotIntervalSeconds(SOUND_GALLERY_DOT_RUN_LEVEL);
  for (let index = 0; index < SOUND_GALLERY_DOT_RUN_COUNT; index++) {
    play(name, { delaySeconds: index * interval });
  }
}

// One tile at Pac-Man's speed, plus the frame he stops on each dot.
function dotIntervalSeconds(level) {
  const speed = MAX_SPEED_PIXELS_PER_SECOND * getLevelConfig(level).speeds.pacman;
  return TILE_SIZE / speed + (DOT_PAUSE_FRAMES * FIXED_TIMESTEP_MS) / MS_PER_SECOND;
}

function analyze(name) {
  const buffer = soundBuffer(name);
  if (buffer === undefined) {
    console.warn(`Sound "${name}": not loaded (${soundLoadState(name)}), nothing to analyze.`);
    return;
  }
  const loopBuffer = soundLoopBuffer(name);
  const loop = loopBuffer && { buffer: loopBuffer, ...soundTrim(name) };
  logSoundAnalysis(name, buffer, loop);
}

// Called by main.js every frame; the slider is shown only with the gallery.
export function setSoundGalleryShown(isShown) {
  if (rateControl === null) {
    if (!isShown || NAMES.length === 0) {
      return;
    }
    rateControl = buildRateControl();
    showSelectedRate();
  }
  if (rateControl.container.hidden === isShown) {
    rateControl.container.hidden = !isShown;
  }
}

function buildRateControl() {
  const container = document.createElement('div');
  container.id = 'sound-rate';
  const label = document.createElement('label');
  const nameText = document.createElement('span');
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(SOUND_GALLERY_RATE_MIN);
  input.max = String(SOUND_GALLERY_RATE_MAX);
  input.step = String(SOUND_GALLERY_RATE_STEP);
  const valueText = document.createElement('span');
  label.append(nameText, input, valueText);
  container.append(label);
  document.getElementById('game-container').append(container);
  input.addEventListener('input', () => {
    setPlaybackRateOverride(selectedName(), Number(input.value));
    showSelectedRate();
  });
  // Once the slider is let go: the value to copy into the manifest.
  input.addEventListener('change', () => {
    console.log(`Sound "${selectedName()}": playbackRate ${input.value} (to keep it, set it in soundManifest.js)`);
  });
  return { container, nameText, input, valueText };
}

function showSelectedRate() {
  if (rateControl === null) {
    return;
  }
  const name = selectedName();
  const rate = soundPlaybackRate(name);
  rateControl.nameText.textContent = `${SOUND_MANIFEST[name].label} RATE `;
  rateControl.input.value = String(rate);
  rateControl.valueText.textContent = ` x${rate.toFixed(SOUND_GALLERY_RATE_DECIMALS)}`;
}

// What the panel shows (renderer.js draws it): one line per sound.
export function soundGalleryView() {
  return NAMES.map((name, index) => ({
    label: SOUND_MANIFEST[name].label,
    isSelected: index === selectedIndex,
    loadState: soundLoadState(name),
    durationSeconds: soundDuration(name),
    playbackRate: soundPlaybackRate(name),
    isLoop: SOUND_MANIFEST[name].loop,
    isPlaying: soundLoadState(name) === SOUND_LOAD_STATE.READY && isSoundPlaying(name),
    trimText: index === selectedIndex ? trimText(name) : null,
  }));
}

// Under the selected sound: the part of the file it plays, and what the
// detection found ("SET" = the manifest's own value wins).
function trimText(name) {
  const trim = soundTrim(name);
  if (trim === undefined || SOUND_MANIFEST[name].slice) {
    return null;
  }
  const sound = SOUND_MANIFEST[name];
  const isSet = sound.trimStartSeconds !== undefined || sound.trimEndSeconds !== undefined;
  const range = (start, end) => `${start.toFixed(SOUND_ANALYSIS_DECIMALS)}-${end.toFixed(SOUND_ANALYSIS_DECIMALS)}`;
  return `TRIM ${range(trim.startSeconds, trim.endSeconds)}${isSet ? ' SET' : ''}`
    + `  FOUND ${range(trim.detected.startSeconds, trim.detected.endSeconds)}`;
}
