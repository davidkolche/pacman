import {
  AUDIO_MASTER_VOLUME,
  AUDIO_MUTE_RAMP_SECONDS,
  AUDIO_UNLOCK_EVENTS,
  AUDIO_DEFAULT_MAX_VOICES,
  AUDIO_VOICE_STEAL_SECONDS,
  AUDIO_LOOP_FADE_SECONDS,
  AUDIO_DECODE_SAMPLE_RATE,
  AUDIO_DECODE_CHANNELS,
  AUDIO_DECODE_LENGTH_FRAMES,
  SOUND_LOAD_STATE,
} from './constants.js';
import { SOUND_MANIFEST, soundFilePath } from './soundManifest.js';
import { loadSettings, saveSettings } from './storage.js';
import { createMixer } from './audioMixer.js';

// The sound manager: one AudioContext for the whole game. Every sound is a
// file from soundManifest.js, decoded once at startup into an AudioBuffer;
// each play is a cheap AudioBufferSourceNode reading that buffer:
//   source -> gain (the sound's volume) -> [panner] -> bus -> mixer
// where one knob (the master) mutes everything and each bus has its own level.
let muted = false;
// Null until the player's first key or click: a context made earlier stays
// locked by the browser's autoplay policy and warns in the console.
let context = null;
let masterGain = null;
let busInputs = {};
let isGamePaused = false;
// Decoded files by sound name, and where each file stands (SOUND_LOAD_STATE).
const buffers = new Map();
const loadStates = new Map();
// Each one-shot's plays that are still sounding, oldest first (polyphony).
const playsByName = new Map();
// Loops the game wants (startLoop) and the ones really sounding. A loop
// asked for before the first key or before its file arrived starts as soon
// as both are there.
const wantedLoops = new Set();
const runningLoops = new Map();

// Before the first frame, so the mute icon is right from the start.
export function setupAudio() {
  muted = loadSettings().muted;
  for (const eventName of AUDIO_UNLOCK_EVENTS) {
    window.addEventListener(eventName, unlockAudio);
  }
  // A hidden tab gets no frames (render() does not run), so the sound
  // listens for it itself, on every screen, not only during play.
  document.addEventListener('visibilitychange', applySuspension);
  preloadSounds();
}

// Every file is fetched and decoded now, not at its first play: a dot
// eaten while its file is still downloading would be heard late or not at
// all. Not awaited: the game starts at once, and a sound simply stays
// silent until its file is ready. Decoding needs a context, and the real
// one may not exist before the first key; an OfflineAudioContext (one
// that renders into memory, never to the speakers) is never locked, and
// the buffers it decodes play in any context.
function preloadSounds() {
  const decoder = new OfflineAudioContext(
    AUDIO_DECODE_CHANNELS, AUDIO_DECODE_LENGTH_FRAMES, AUDIO_DECODE_SAMPLE_RATE,
  );
  for (const name of Object.keys(SOUND_MANIFEST)) {
    loadSound(decoder, name);
  }
}

// A missing or broken file must never break the game: one clear warning,
// then that sound stays silent. Never throws.
async function loadSound(decoder, name) {
  const path = soundFilePath(name);
  loadStates.set(name, SOUND_LOAD_STATE.LOADING);
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    buffers.set(name, await decoder.decodeAudioData(await response.arrayBuffer()));
    loadStates.set(name, SOUND_LOAD_STATE.READY);
    startWantedLoops();
  } catch (error) {
    loadStates.set(name, SOUND_LOAD_STATE.MISSING);
    console.warn(`Sound "${name}": could not load ${path} (${error.message}). It will stay silent.`);
  }
}

// Runs inside the player's gesture, the only moment the browser lets a
// context start. Kept until the context really runs.
function unlockAudio() {
  if (context === null) {
    createAudioGraph();
    startWantedLoops();
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
  ({ masterGain, busInputs } = createMixer(context, { masterVolume: masterVolume() }));
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
    rampTo(masterGain.gain, masterVolume(), AUDIO_MUTE_RAMP_SECONDS);
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

// Suspending stops the audio clock itself: every sound (loops too) freezes
// mid-note and goes on from there on resume. Both calls return promises
// that may reject (a context the browser still holds locked); that is not
// an error for the game, so it must not reach the console either.
function applySuspension() {
  if (context === null) {
    return;
  }
  const change = shouldRun() ? context.resume() : context.suspend();
  change.catch(() => {});
}

// From wherever the value is now (maybe halfway through another ramp) to
// the target, in a straight line: no jump, so no click.
function rampTo(param, target, durationSeconds) {
  const now = context.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + durationSeconds);
}

// Plays a one-shot from soundManifest.js by name. The game never knows
// which file it is; it only names it.
//   delaySeconds: later on the audio clock (in sync with the game: both
//                 stop while the tab is hidden)
//   pan:          -1 left .. 1 right
// Skipped before the first gesture, while its file is not ready, and while
// the game wants silence (it would otherwise wait and sound on resume). A
// context that should run but is still starting (the very first key, or
// right after P) plays it as soon as it does, so neither the first sound
// nor the "unpause" is lost.
export function play(name, options = {}) {
  console.assert(!SOUND_MANIFEST[name].loop, `Sound ${name} is a loop: use startLoop`);
  if (context === null || !shouldRun() || !buffers.has(name)) {
    return;
  }
  if (context.state === 'running') {
    startOneShot(name, options);
    return;
  }
  context.resume().then(() => startOneShot(name, options), () => {});
}

function startOneShot(name, { delaySeconds = 0, pan = 0 }) {
  const sound = SOUND_MANIFEST[name];
  const startTime = context.currentTime + delaySeconds;
  const voice = createVoice(name, { loop: false, pan });
  voice.source.start(startTime);
  const playback = {
    startTime,
    endTime: startTime + voice.source.buffer.duration / sound.playbackRate,
    voice,
  };
  makeRoomFor(name, sound, playback);
  playsByName.set(name, [...soundingPlays(name, context.currentTime), playback]);
}

// One playing copy of a sound: its source, and the gain that carries the
// sound's volume (and its fades). The whole chain unplugs itself when the
// source ends, so finished plays leave nothing behind.
function createVoice(name, { loop, pan = 0 }) {
  const sound = SOUND_MANIFEST[name];
  const source = context.createBufferSource();
  source.buffer = buffers.get(name);
  source.loop = loop;
  source.playbackRate.value = sound.playbackRate;
  const gain = context.createGain();
  gain.gain.value = sound.volume;
  source.connect(gain);
  const nodes = [source, gain];
  if (pan !== 0) {
    const panner = context.createStereoPanner();
    panner.pan.value = clampPan(pan);
    nodes.push(panner);
    gain.connect(panner);
  }
  nodes.at(-1).connect(busInputs[sound.bus]);
  source.addEventListener('ended', () => nodes.forEach((node) => node.disconnect()));
  return { source, gain };
}

function clampPan(pan) {
  return Math.min(1, Math.max(-1, pan));
}

// Plays of one sound still sounding at a time (some may be scheduled for
// later); finished ones are simply forgotten here.
function soundingPlays(name, time) {
  return (playsByName.get(name) ?? []).filter((playback) => playback.endTime > time);
}

// Polyphony: at most maxVoices plays of one sound at once. When a new one
// would be one too many, the oldest still sounding fades out quickly the
// moment the new one starts, so fast events never pile up into a harsh,
// loud smear.
function makeRoomFor(name, sound, newPlay) {
  const overlapping = soundingPlays(name, newPlay.startTime)
    .filter((playback) => playback.startTime <= newPlay.startTime);
  const extra = overlapping.length + 1 - (sound.maxVoices ?? AUDIO_DEFAULT_MAX_VOICES);
  for (const playback of overlapping.slice(0, Math.max(0, extra))) {
    fadeOutAt(playback, newPlay.startTime, sound.volume);
  }
}

// A one-shot's gain is its plain volume until a fade, so the fade can be
// scheduled ahead, even at a moment that has not come yet.
function fadeOutAt(playback, time, volume) {
  const fadeEnd = time + AUDIO_VOICE_STEAL_SECONDS;
  const { gain, source } = playback.voice;
  gain.gain.setValueAtTime(volume, time);
  gain.gain.linearRampToValueAtTime(0, fadeEnd);
  source.stop(fadeEnd);
  playback.endTime = Math.min(playback.endTime, fadeEnd);
}

// Stops every play of a one-shot (the gallery's STOP), with the same
// short fade as a stolen voice; plays still waiting never start.
export function stopSound(name) {
  if (context === null) {
    return;
  }
  const now = context.currentTime;
  for (const playback of soundingPlays(name, now)) {
    if (playback.startTime > now) {
      playback.voice.source.stop();
      playback.endTime = now;
    } else {
      fadeOutAt(playback, now, SOUND_MANIFEST[name].volume);
    }
  }
}

// A loop (siren, music) that plays until stopLoop, fading in. Asking for
// one that already runs does nothing. While paused it is started anyway:
// the whole context is suspended, so it begins on resume.
export function startLoop(name) {
  console.assert(SOUND_MANIFEST[name].loop, `Sound ${name} is not a loop: use play`);
  wantedLoops.add(name);
  startWantedLoops();
}

// Fades the loop out, then stops it. A loop not yet started is simply no
// longer wanted.
export function stopLoop(name) {
  wantedLoops.delete(name);
  const voice = runningLoops.get(name);
  if (voice === undefined) {
    return;
  }
  runningLoops.delete(name);
  rampTo(voice.gain.gain, 0, AUDIO_LOOP_FADE_SECONDS);
  voice.source.stop(context.currentTime + AUDIO_LOOP_FADE_SECONDS);
}

// Starts every wanted loop that can start now: after startLoop, after the
// first key made the context, after a file arrived.
function startWantedLoops() {
  if (context === null) {
    return;
  }
  for (const name of wantedLoops) {
    if (!runningLoops.has(name) && buffers.has(name)) {
      runningLoops.set(name, startLoopVoice(name));
    }
  }
}

function startLoopVoice(name) {
  const voice = createVoice(name, { loop: true });
  voice.gain.gain.value = 0;
  rampTo(voice.gain.gain, SOUND_MANIFEST[name].volume, AUDIO_LOOP_FADE_SECONDS);
  voice.source.start();
  return voice;
}

// For the gallery: the sound's length as heard (its playback rate counted),
// or null while its file is not ready.
export function soundDuration(name) {
  const buffer = buffers.get(name);
  return buffer === undefined ? null : buffer.duration / SOUND_MANIFEST[name].playbackRate;
}

export function soundLoadState(name) {
  return loadStates.get(name) ?? SOUND_LOAD_STATE.LOADING;
}

// Whether the sound is heard now: a running loop, or a play under way.
export function isSoundPlaying(name) {
  if (context === null) {
    return false;
  }
  if (runningLoops.has(name)) {
    return true;
  }
  const now = context.currentTime;
  return soundingPlays(name, now).some((playback) => playback.startTime <= now);
}

// One-shot plays of every sound that sound right now (not the ones waiting).
function voiceCount() {
  const now = context.currentTime;
  let count = 0;
  for (const plays of playsByName.values()) {
    count += plays.filter((playback) => playback.startTime <= now && playback.endTime > now).length;
  }
  return count;
}

function readyFileCount() {
  return [...loadStates.values()].filter((state) => state === SOUND_LOAD_STATE.READY).length;
}

// For the debug overlay: "AUDIO LOCKED  FILES 1/1",
// "AUDIO RUNNING  MUTED  VOICES 2  LOOPS 1  FILES 3/4"...
export function audioDebugText() {
  const filesText = `FILES ${readyFileCount()}/${Object.keys(SOUND_MANIFEST).length}`;
  if (context === null) {
    return `AUDIO LOCKED  ${filesText}`;
  }
  const muteText = muted ? '  MUTED' : '';
  return `AUDIO ${context.state.toUpperCase()}${muteText}  VOICES ${voiceCount()}  LOOPS ${runningLoops.size}  ${filesText}`;
}
