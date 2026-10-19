import {
  AUDIO_MASTER_VOLUME,
  AUDIO_MUTE_RAMP_SECONDS,
  AUDIO_UNLOCK_EVENTS,
  AUDIO_DEFAULT_MAX_VOICES,
  AUDIO_VOICE_STEAL_SECONDS,
  AUDIO_LOOP_FADE_SECONDS,
  AUDIO_SLICE_FADE_SECONDS,
  AUDIO_SILENCE_LEVEL,
  AUDIO_LOOP_SEAM_FADE_SECONDS,
  AUDIO_LOOP_RATE_RAMP_SECONDS,
  AUDIO_LOOP_DUCK_DOWN_SECONDS,
  AUDIO_LOOP_DUCK_UP_SECONDS,
  CENTS_PER_OCTAVE,
  AUDIO_DECODE_SAMPLE_RATE,
  AUDIO_DECODE_CHANNELS,
  AUDIO_DECODE_LENGTH_FRAMES,
  SOUND_LOAD_STATE,
} from './constants.js';
import { SOUND_MANIFEST, soundFilePath } from './soundManifest.js';
import { loadSettings, saveSettings } from './storage.js';
import { createMixer } from './audioMixer.js';
import { audibleRange } from './soundAnalysis.js';

// The sound manager: one AudioContext for the whole game. Every sound is a
// file from soundManifest.js, decoded once at startup into an AudioBuffer;
// each play is a cheap AudioBufferSourceNode reading that buffer:
//   source -> gain (the sound's volume) -> [panner] -> bus -> mixer
// where one knob (the master) mutes everything and each bus has its own level.
let muted = false;
// Null until the player's first key or click: a context made earlier stays
// locked by the browser's autoplay policy and warns in the console.
let context = null;
// True once the context has really run: the browser let the page play sound.
// Not the same as a context existing (a first key the browser does not
// count, like Escape, makes one that stays locked), nor as running now (a
// hidden tab suspends it, but sound is still allowed).
let hasRun = false;
let masterGain = null;
let busInputs = {};
let isGamePaused = false;
// Decoded files by sound name, where each file stands (SOUND_LOAD_STATE),
// and the promise that settles when its loading is over (either way).
const buffers = new Map();
const loadStates = new Map();
const loadings = new Map();
// Where each sound really is in its file ({ startSeconds, endSeconds,
// detected }), found at load; and each loop's own copy of its samples, with
// the seam fades (the decoded file itself is never changed).
const trims = new Map();
const loopBuffers = new Map();
// Each one-shot's plays that are still sounding, oldest first (polyphony).
const playsByName = new Map();
// Each one-shot's plays still waiting to start (for the file, or for the
// context to resume), as tokens: stopSound clears them, so a play it
// stopped never starts late.
const pendingPlays = new Map();
// Loops the game wants (startLoop, by name -> its start options) and the
// ones really sounding. A loop asked for before the first key or before its
// file arrived starts as soon as both are there.
const wantedLoops = new Map();
const runningLoops = new Map();
// The background loop getActiveLoop chose (soundEffects.js), and each
// loop's mix on top of the manifest: { rate, volume } factors (1 = as in
// the manifest; faster while the ghosts flash, quieter during a freeze).
let backgroundLoop = null;
const NEUTRAL_LOOP_MIX = Object.freeze({ rate: 1, volume: 1 });
const loopMixes = new Map();
// Playback rates set live in the debug gallery, by sound name; they win over
// the manifest for this session only.
const rateOverrides = new Map();

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
    loadings.set(name, loadSound(decoder, name));
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
    const buffer = await decoder.decodeAudioData(await response.arrayBuffer());
    trims.set(name, findTrim(name, buffer));
    if (SOUND_MANIFEST[name].loop) {
      loopBuffers.set(name, createLoopBuffer(buffer, trims.get(name)));
    }
    buffers.set(name, buffer);
    loadStates.set(name, SOUND_LOAD_STATE.READY);
    startWantedLoops();
  } catch (error) {
    loadStates.set(name, SOUND_LOAD_STATE.MISSING);
    console.warn(`Sound "${name}": could not load ${path} (${error.message}). It will stay silent.`);
  }
}

// Where the sound is in its file: the manifest's trim where it sets one,
// else what the samples show. A file that is silent throughout keeps all of
// itself (and stays silent).
function findTrim(name, buffer) {
  const sound = SOUND_MANIFEST[name];
  const detected = audibleRange(buffer, AUDIO_SILENCE_LEVEL) ?? { startSeconds: 0, endSeconds: buffer.duration };
  return {
    startSeconds: sound.trimStartSeconds ?? detected.startSeconds,
    endSeconds: Math.min(sound.trimEndSeconds ?? detected.endSeconds, buffer.duration),
    detected,
  };
}

// A loop plays from loopStart to loopEnd, then jumps straight back to
// loopStart, forever: the silence outside them is never heard. The jump
// joins two samples that were never next to each other; if they are at
// different heights the speaker cone has to jump too, which is heard as a
// click. So the loop gets its own copy of the file, faded to zero over a
// few samples at both loop points: the jump is then from zero to zero.
function createLoopBuffer(buffer, { startSeconds, endSeconds }) {
  const { sampleRate, numberOfChannels, length } = buffer;
  const first = Math.round(startSeconds * sampleRate);
  const end = Math.round(endSeconds * sampleRate);
  const fadeLength = Math.min(Math.round(AUDIO_LOOP_SEAM_FADE_SECONDS * sampleRate), Math.floor((end - first) / 2));
  const copy = new AudioBuffer({ numberOfChannels, length, sampleRate });
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel).slice();
    for (let index = 0; index < fadeLength; index++) {
      const gain = index / fadeLength;
      samples[first + index] *= gain;
      samples[end - 1 - index] *= gain;
    }
    copy.copyToChannel(samples, channel);
  }
  return copy;
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
  noteIfRunning();
  context.addEventListener('statechange', noteIfRunning);
}

function noteIfRunning() {
  if (context.state === 'running') {
    hasRun = true;
  }
}

// Whether the browser lets the page play sound yet (the attract screen's
// hint shows until it does).
export function isAudioUnlocked() {
  return hasRun;
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
//   rateFactor:   faster (higher and shorter) or slower, on top of the
//                 manifest's rate (the ghost chain)
//   volumeFactor: louder or softer, on top of the manifest's volume
// Skipped before the first gesture, for a missing file, and while the game
// wants silence (it would otherwise wait and sound on resume). A file still
// loading: only a sound with waitsForFile (the jingle, Enter right after a
// refresh) plays when it arrives; any other is dropped, since a dot or a
// death heard after its moment is worse than silence. A context that should
// run but is still starting (the very first key, or right after P) plays it
// once it does. stopSound cancels both kinds of wait.
export function play(name, options = {}) {
  const sound = SOUND_MANIFEST[name];
  console.assert(!sound.loop, `Sound ${name} is a loop: use startLoop`);
  if (context === null || !shouldRun()) {
    return;
  }
  if (soundLoadState(name) === SOUND_LOAD_STATE.LOADING) {
    if (sound.waitsForFile) {
      startAfter(name, loadings.get(name), () => play(name, options));
    }
    return;
  }
  if (!buffers.has(name)) {
    return;
  }
  if (context.state === 'running') {
    startOneShot(name, options);
    return;
  }
  startAfter(name, context.resume(), () => startOneShot(name, options));
}

// Runs start once the wait is over, unless stopSound cleared the play's
// token meanwhile. A rejected wait (a context the browser keeps locked)
// starts nothing and is no error.
function startAfter(name, wait, start) {
  const token = {};
  if (!pendingPlays.has(name)) {
    pendingPlays.set(name, new Set());
  }
  const pending = pendingPlays.get(name);
  pending.add(token);
  wait.then(() => {
    if (pending.delete(token)) {
      start();
    }
  }, () => pending.delete(token));
}

// The source's start() takes the slice in the file's own time; how long it
// is heard depends on the rate.
function startOneShot(name, { delaySeconds = 0, pan = 0, rateFactor = 1, volumeFactor = 1 }) {
  const sound = SOUND_MANIFEST[name];
  const startTime = context.currentTime + delaySeconds;
  const variation = rateFactor * randomPitchVariation(sound.pitchVariationCents ?? 0);
  const volume = sound.volume * volumeFactor;
  const voice = createVoice(name, { loop: false, pan, rateFactor: variation, volume });
  const { offsetSeconds, durationSeconds } = playedPart(name);
  const endTime = startTime + durationSeconds / voice.source.playbackRate.value;
  voice.source.start(startTime, offsetSeconds, durationSeconds);
  if (sound.slice) {
    fadeSliceEdges(voice.gain.gain, volume, startTime, endTime);
  } else if (sound.fadeOutSeconds) {
    fadeOutEnd(voice.gain.gain, volume, endTime, sound.fadeOutSeconds / voice.source.playbackRate.value);
  }
  const playback = { startTime, endTime, voice, variation, volume };
  makeRoomFor(name, sound, playback);
  playsByName.set(name, [...soundingPlays(name, context.currentTime), playback]);
}

// The part of the file a play uses: its slice, or its trim (the file
// without the silence at either end).
function playedPart(name) {
  const sound = SOUND_MANIFEST[name];
  if (sound.slice) {
    return sound.slice;
  }
  const { startSeconds, endSeconds } = trims.get(name);
  return { offsetSeconds: startSeconds, durationSeconds: endSeconds - startSeconds };
}

function fadeSliceEdges(param, volume, startTime, endTime) {
  param.setValueAtTime(0, startTime);
  param.linearRampToValueAtTime(volume, startTime + AUDIO_SLICE_FADE_SECONDS);
  param.setValueAtTime(volume, endTime - AUDIO_SLICE_FADE_SECONDS);
  param.linearRampToValueAtTime(0, endTime);
}

// The manifest's fade is in file time; a faster play hears it shorter.
function fadeOutEnd(param, volume, endTime, heardSeconds) {
  param.setValueAtTime(volume, endTime - heardSeconds);
  param.linearRampToValueAtTime(0, endTime);
}

// A rate factor: a faster rate is a higher pitch, so a few cents up or down
// is a different copy of the same sound.
function randomPitchVariation(cents) {
  const offsetCents = (Math.random() * 2 - 1) * cents;
  return 2 ** (offsetCents / CENTS_PER_OCTAVE);
}

function effectiveRate(name) {
  return rateOverrides.get(name) ?? SOUND_MANIFEST[name].playbackRate;
}

// One playing copy of a sound: its source, and the gain that carries the
// sound's volume (and its fades). The whole chain unplugs itself when the
// source ends, so finished plays leave nothing behind.
function createVoice(name, {
  loop, pan = 0, rateFactor = 1, volume = SOUND_MANIFEST[name].volume, buffer = buffers.get(name),
}) {
  const sound = SOUND_MANIFEST[name];
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  source.playbackRate.value = effectiveRate(name) * rateFactor;
  const gain = context.createGain();
  gain.gain.value = volume;
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
    fadeOutAt(playback, newPlay.startTime);
  }
}

// A one-shot's gain is its plain volume between its edges, so the fade can
// be scheduled ahead, even at a moment that has not come yet. A slice's own
// fade at its end is dropped first: the steal fade replaces it.
function fadeOutAt(playback, time) {
  const fadeEnd = time + AUDIO_VOICE_STEAL_SECONDS;
  const { gain, source } = playback.voice;
  gain.gain.cancelScheduledValues(time);
  gain.gain.setValueAtTime(playback.volume, time);
  gain.gain.linearRampToValueAtTime(0, fadeEnd);
  source.stop(fadeEnd);
  playback.endTime = Math.min(playback.endTime, fadeEnd);
}

// Stops every play of a one-shot, fading out from wherever its volume is
// now (maybe inside its own end fade) over fadeSeconds: by default the
// short steal fade (the gallery's STOP, the dots at a death), longer for
// music. Plays still waiting never start: the ones scheduled for later on
// the audio clock, and the ones waiting for their file or for resume().
export function stopSound(name, { fadeSeconds = AUDIO_VOICE_STEAL_SECONDS } = {}) {
  pendingPlays.get(name)?.clear();
  if (context === null) {
    return;
  }
  const now = context.currentTime;
  for (const playback of soundingPlays(name, now)) {
    if (playback.startTime > now) {
      playback.voice.source.stop();
      playback.endTime = now;
    } else {
      rampTo(playback.voice.gain.gain, 0, fadeSeconds);
      playback.voice.source.stop(now + fadeSeconds);
      playback.endTime = Math.min(playback.endTime, now + fadeSeconds);
    }
  }
}

// A loop (siren, music) that plays until stopLoop, fading in. A new start
// is always from the loop's beginning (or fromSeconds). Asking for
// one that is already wanted does nothing (it goes on, not from the start).
// While paused it is started anyway: the whole context is suspended, so it
// begins on resume.
//   fromSeconds: where in the file the first round begins (the gallery
//                starts just before the seam); default the loop's start
export function startLoop(name, { fromSeconds } = {}) {
  console.assert(SOUND_MANIFEST[name].loop, `Sound ${name} is not a loop: use play`);
  if (!wantedLoops.has(name)) {
    wantedLoops.set(name, { fromSeconds });
  }
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
  const fadeSeconds = loopFadeOutSeconds(name);
  rampTo(voice.gain.gain, 0, fadeSeconds);
  voice.source.stop(context.currentTime + fadeSeconds);
}

// A loop may set its own fades in the manifest (the attract music comes in
// slowly and goes quickly); every other loop uses the short default.
function loopFadeInSeconds(name) {
  return SOUND_MANIFEST[name].loopFadeInSeconds ?? AUDIO_LOOP_FADE_SECONDS;
}

function loopFadeOutSeconds(name) {
  return SOUND_MANIFEST[name].loopFadeOutSeconds ?? AUDIO_LOOP_FADE_SECONDS;
}

// Starts every wanted loop that can start now: after startLoop, after the
// first key made the context, after a file arrived.
function startWantedLoops() {
  if (context === null) {
    return;
  }
  for (const [name, options] of wantedLoops) {
    if (!runningLoops.has(name) && loopBuffers.has(name)) {
      runningLoops.set(name, startLoopVoice(name, options));
    }
  }
}

// loopStart / loopEnd are the trim: after loopEnd the source goes on at
// loopStart, never at the file's start or into its silent end.
function startLoopVoice(name, { fromSeconds }) {
  const { startSeconds, endSeconds } = trims.get(name);
  const mix = loopMix(name);
  const voice = createVoice(name, { loop: true, rateFactor: mix.rate, buffer: loopBuffers.get(name) });
  voice.source.loopStart = startSeconds;
  voice.source.loopEnd = endSeconds;
  voice.gain.gain.value = 0;
  rampTo(voice.gain.gain, SOUND_MANIFEST[name].volume * mix.volume, loopFadeInSeconds(name));
  const from = Math.min(Math.max(fromSeconds ?? startSeconds, startSeconds), endSeconds);
  voice.source.start(context.currentTime, from);
  return voice;
}

function loopMix(name) {
  return loopMixes.get(name) ?? NEUTRAL_LOOP_MIX;
}

// Called by main.js every frame with getActiveLoop's answer (null = none)
// and its mix ({ rate, volume }, soundEffects.js activeLoopMix). It acts
// only on a change: a new name crossfades (the old loop fades out while the
// new one fades in); the same name keeps playing untouched, so a second
// power pellet never restarts the frightened loop. A new mix only glides the
// running loop's speed and volume: a duck during a freeze, and back.
export function setBackgroundLoop(name, mix = NEUTRAL_LOOP_MIX) {
  if (name !== backgroundLoop) {
    if (backgroundLoop !== null) {
      stopLoop(backgroundLoop);
    }
    backgroundLoop = name;
    if (name !== null) {
      loopMixes.set(name, mix);
      startLoop(name);
    }
    return;
  }
  if (name === null) {
    return;
  }
  const previous = loopMix(name);
  loopMixes.set(name, mix);
  const voice = runningLoops.get(name);
  if (voice === undefined) {
    return;
  }
  if (mix.rate !== previous.rate) {
    rampTo(voice.source.playbackRate, effectiveRate(name) * mix.rate, AUDIO_LOOP_RATE_RAMP_SECONDS);
  }
  if (mix.volume !== previous.volume) {
    const rampSeconds = mix.volume < previous.volume ? AUDIO_LOOP_DUCK_DOWN_SECONDS : AUDIO_LOOP_DUCK_UP_SECONDS;
    rampTo(voice.gain.gain, SOUND_MANIFEST[name].volume * mix.volume, rampSeconds);
  }
}

// For the gallery: the sound's length as heard (its slice and playback rate
// counted), or null while its file is not ready.
export function soundDuration(name) {
  return buffers.has(name) ? playedPart(name).durationSeconds / effectiveRate(name) : null;
}

export function soundPlaybackRate(name) {
  return effectiveRate(name);
}

// Debug gallery: a new rate for this session, heard at once, on the plays
// sounding or waiting and on the running loop. Their planned end times and
// slice fades stay as they were: close enough for tuning by ear, and the
// next plays are exact.
export function setPlaybackRateOverride(name, rate) {
  rateOverrides.set(name, rate);
  if (context === null) {
    return;
  }
  const loopRate = rate * loopMix(name).rate;
  runningLoops.get(name)?.source.playbackRate.setValueAtTime(loopRate, context.currentTime);
  for (const playback of soundingPlays(name, context.currentTime)) {
    playback.voice.source.playbackRate.setValueAtTime(rate * playback.variation, context.currentTime);
  }
}

// Debug (soundAnalysis.js): the decoded file, and a loop's own copy with
// the seam fades; undefined while not ready.
export function soundBuffer(name) {
  return buffers.get(name);
}

export function soundLoopBuffer(name) {
  return loopBuffers.get(name);
}

// Debug gallery: { startSeconds, endSeconds, detected }, or undefined.
export function soundTrim(name) {
  return trims.get(name);
}

export function soundLoadState(name) {
  return loadStates.get(name) ?? SOUND_LOAD_STATE.LOADING;
}

// How long until the sound's plays have all ended (0 when none sounds), on
// the audio clock: a sound that must not play on top of it can wait that long.
export function soundRemainingSeconds(name) {
  if (context === null) {
    return 0;
  }
  const now = context.currentTime;
  return Math.max(0, ...soundingPlays(name, now).map((playback) => playback.endTime - now));
}

// How long the newest play of a one-shot has been heard, in the audio clock
// (it stands still while paused), or null when none is heard now.
export function soundPlayedSeconds(name) {
  if (context === null) {
    return null;
  }
  const now = context.currentTime;
  const started = soundingPlays(name, now).filter((playback) => playback.startTime <= now);
  if (started.length === 0) {
    return null;
  }
  return now - Math.max(...started.map((playback) => playback.startTime));
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
