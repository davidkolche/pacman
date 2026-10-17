import {
  AUDIO_MASTER_VOLUME,
  AUDIO_MUTE_RAMP_SECONDS,
  AUDIO_UNLOCK_EVENTS,
  AUDIO_DEFAULT_MAX_VOICES,
  AUDIO_VOICE_STEAL_SECONDS,
  SOUNDS,
  VOICES,
} from './constants.js';
import { loadSettings, saveSettings } from './storage.js';
import { createMixer } from './audioMixer.js';
import { startNote, rampTo, centsToRatio } from './audioVoices.js';

// The sound manager: one AudioContext for the whole game. Each sound runs
//   its notes (audioVoices.js) -> bus (sfx, music or ui) -> mixer (audioMixer.js),
// where one knob (the master) mutes everything and each bus has its own level.
let muted = false;
// Null until the player's first key or click: a context made earlier stays
// locked by the browser's autoplay policy and warns in the console.
let context = null;
let masterGain = null;
let busInputs = {};
let reverbInput = null;
// Sounds with their own reverb send: one input each, made at first play.
const soundInputs = new Map();
// Each sound's plays that are still sounding, oldest first (polyphony).
const instancesByName = new Map();
let isGamePaused = false;

// Before the first frame, so the mute icon is right from the start.
export function setupAudio() {
  muted = loadSettings().muted;
  for (const eventName of AUDIO_UNLOCK_EVENTS) {
    window.addEventListener(eventName, unlockAudio);
  }
  // A hidden tab gets no frames (render() does not run), so the sound
  // listens for it itself, on every screen, not only during play.
  document.addEventListener('visibilitychange', applySuspension);
}

// Runs inside the player's gesture, the only moment the browser lets a
// context start. Kept until the context really runs.
function unlockAudio() {
  if (context === null) {
    createAudioGraph();
  }
  if (context.state === 'running') {
    for (const eventName of AUDIO_UNLOCK_EVENTS) {
      window.removeEventListener(eventName, unlockAudio);
    }
    return;
  }
  applySuspension();
}

function createAudioGraph() {
  context = new AudioContext();
  ({ masterGain, busInputs, reverbInput } = createMixer(context, { masterVolume: masterVolume() }));
}

function masterVolume() {
  return muted ? 0 : AUDIO_MASTER_VOLUME;
}

export function isMuted() {
  return muted;
}

// Saved at once: it changes rarely, only on a key press.
export function toggleMuted() {
  muted = !muted;
  saveSettings({ muted });
  if (context !== null) {
    rampTo(context, masterGain.gain, masterVolume(), AUDIO_MUTE_RAMP_SECONDS);
  }
}

// Called by main.js every frame, like the marquee; acts only on a change.
export function setAudioPaused(isPaused) {
  if (isPaused === isGamePaused) {
    return;
  }
  isGamePaused = isPaused;
  applySuspension();
}

// Whether the game wants sound right now: not while paused, not while the
// tab is hidden.
function shouldRun() {
  return !isGamePaused && !document.hidden;
}

// Suspending stops the audio clock itself: every sound freezes mid-note and
// goes on from there on resume. Both calls return promises that may reject
// (a context the browser still holds locked); that is not an error for the
// game, so it must not reach the console either.
function applySuspension() {
  if (context === null) {
    return;
  }
  const change = shouldRun() ? context.resume() : context.suspend();
  change.catch(() => {});
}

// Plays a sound from constants.js SOUNDS by name. The game never knows how
// a sound is made; it only names it.
//   delaySeconds:   later on the audio clock (in sync with the game: both
//                   stop while the tab is hidden)
//   frequencyRatio: every note higher or lower (a scale step, a chain)
//   pan:            added to each note's own pan, -1 left .. 1 right
// Skipped before the first gesture and while the game wants silence (it
// would otherwise wait and sound on resume). A context that should run but
// is still starting (the very first key, or right after P) plays the sound
// as soon as it does, so neither the first sound nor the "unpause" is lost.
export function play(name, options = {}) {
  if (context === null || !shouldRun()) {
    return;
  }
  if (context.state === 'running') {
    scheduleSound(name, options);
    return;
  }
  context.resume().then(() => scheduleSound(name, options), () => {});
}

function scheduleSound(name, { delaySeconds = 0, frequencyRatio = 1, pan = 0 }) {
  const sound = SOUNDS[name];
  const startTime = context.currentTime + delaySeconds;
  const variation = randomVariation(sound.variation);
  const notes = sound.notes.map((note) =>
    startNote(context, soundInput(name, sound), VOICES[note.voice], {
      startTime: startTime + note.atSeconds,
      frequencyHz: note.frequencyHz * frequencyRatio * variation.frequencyRatio,
      durationSeconds: note.durationSeconds,
      peakVolume: note.volume * variation.volumeFactor,
      pan: clampPan((note.pan ?? 0) + pan),
      pitchPath: note.pitchPath,
    }),
  );
  const instance = {
    startTime,
    endTime: Math.max(...notes.map((note) => note.endTime)),
    notes,
  };
  makeRoomFor(name, sound, instance);
  instancesByName.set(name, [...soundingInstances(name, context.currentTime), instance]);
}

// Where a sound's notes go: its bus, or, for a sound with its own
// `reverbSend`, a node that feeds the bus and, on top of the bus's own
// send, the shared reverb. Made once per sound and kept: the plays come
// and go, the node stays plugged in.
function soundInput(name, sound) {
  if (!sound.reverbSend) {
    return busInputs[sound.bus];
  }
  if (!soundInputs.has(name)) {
    const input = context.createGain();
    const send = context.createGain();
    send.gain.value = sound.reverbSend;
    input.connect(busInputs[sound.bus]);
    input.connect(send);
    send.connect(reverbInput);
    soundInputs.set(name, input);
  }
  return soundInputs.get(name);
}

// One random draw per play, shared by all of its notes, so a chord stays
// in tune with itself while each play is a little different.
function randomVariation({ pitchCents, volume }) {
  return {
    frequencyRatio: centsToRatio(randomBetween(-pitchCents, pitchCents)),
    volumeFactor: 1 + randomBetween(-volume, volume),
  };
}

function randomBetween(low, high) {
  return low + Math.random() * (high - low);
}

function clampPan(pan) {
  return Math.min(1, Math.max(-1, pan));
}

// Plays of one sound still sounding at a time (some may be scheduled for
// later); finished ones are simply forgotten here.
function soundingInstances(name, time) {
  return (instancesByName.get(name) ?? []).filter((instance) => instance.endTime > time);
}

// Polyphony: at most maxVoices plays of one sound at once. When a new one
// would be one too many, the oldest still sounding fades out quickly the
// moment the new one starts, so fast events never pile up into a harsh,
// loud smear.
function makeRoomFor(name, sound, newInstance) {
  const overlapping = soundingInstances(name, newInstance.startTime)
    .filter((instance) => instance.startTime <= newInstance.startTime);
  const extra = overlapping.length + 1 - (sound.maxVoices ?? AUDIO_DEFAULT_MAX_VOICES);
  for (const instance of overlapping.slice(0, Math.max(0, extra))) {
    for (const note of instance.notes) {
      note.stopAt(newInstance.startTime, AUDIO_VOICE_STEAL_SECONDS);
    }
    instance.endTime = newInstance.startTime + AUDIO_VOICE_STEAL_SECONDS;
  }
}

// Plays of every sound that sound right now (not the ones still waiting).
function voiceCount() {
  const now = context.currentTime;
  let count = 0;
  for (const instances of instancesByName.values()) {
    count += instances.filter((instance) => instance.startTime <= now && instance.endTime > now).length;
  }
  return count;
}

// For the debug overlay: "AUDIO LOCKED", "AUDIO RUNNING  MUTED  VOICES 2"...
export function audioDebugText() {
  if (context === null) {
    return 'AUDIO LOCKED';
  }
  const muteText = muted ? '  MUTED' : '';
  return `AUDIO ${context.state.toUpperCase()}${muteText}  VOICES ${voiceCount()}`;
}
