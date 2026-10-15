import {
  AUDIO_MASTER_VOLUME,
  AUDIO_SFX_VOLUME,
  AUDIO_LOOP_VOLUME,
  AUDIO_BUS,
  AUDIO_MUTE_RAMP_SECONDS,
  AUDIO_UNLOCK_EVENTS,
} from './constants.js';
import { loadSettings, saveSettings } from './storage.js';

// The sound manager: one AudioContext for the whole game, built as a chain
//   sound -> its envelope -> bus (sfx or loop) -> master -> speakers,
// so one knob (the master) mutes everything and each bus has its own level.
let muted = false;
// Null until the player's first key or click: a context made earlier stays
// locked by the browser's autoplay policy and warns in the console.
let context = null;
let masterGain = null;
const busGains = {};
// The one background sound playing now ({ oscillator, envelope }), or null.
let currentLoop = null;
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
  masterGain = context.createGain();
  masterGain.gain.value = masterVolume();
  masterGain.connect(context.destination);
  busGains[AUDIO_BUS.SFX] = createBus(AUDIO_SFX_VOLUME);
  busGains[AUDIO_BUS.LOOP] = createBus(AUDIO_LOOP_VOLUME);
}

function createBus(volume) {
  const bus = context.createGain();
  bus.gain.value = volume;
  bus.connect(masterGain);
  return bus;
}

function masterVolume() {
  return muted ? 0 : AUDIO_MASTER_VOLUME;
}

// From wherever the value is now (maybe halfway through another ramp) to
// the target, in a straight line: no jump, so no click.
function rampTo(param, target, durationSeconds) {
  const now = context.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + durationSeconds);
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

// Suspending stops the audio clock itself: every sound freezes mid-note and
// goes on from there on resume. Both calls return promises that may reject
// (a context the browser still holds locked); that is not an error for the
// game, so it must not reach the console either.
function applySuspension() {
  if (context === null) {
    return;
  }
  const shouldRun = !isGamePaused && !document.hidden;
  const change = shouldRun ? context.resume() : context.suspend();
  change.catch(() => {});
}

// Starts one oscillator through an envelope that rises from silence to the
// sound's volume over its attack. The caller decides when it ends.
function startVoice(sound, bus) {
  const startTime = context.currentTime;
  const oscillator = context.createOscillator();
  oscillator.type = sound.waveform;
  oscillator.frequency.value = sound.frequencyHz;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, startTime);
  envelope.gain.linearRampToValueAtTime(sound.volume, startTime + sound.attackSeconds);
  oscillator.connect(envelope);
  envelope.connect(busGains[bus]);
  // A stopped oscillator can never play again; unplug it so it can go.
  oscillator.addEventListener('ended', () => envelope.disconnect());
  oscillator.start(startTime);
  return { oscillator, envelope };
}

// Fades a voice out over the sound's release and stops it after the fade.
function releaseVoice(voice, sound) {
  rampTo(voice.envelope.gain, 0, sound.releaseSeconds);
  voice.oscillator.stop(context.currentTime + sound.releaseSeconds);
}

// A one-shot sound, scheduled in full at once on the audio clock: attack,
// hold, release. Silently skipped before the first gesture and while
// suspended (it would otherwise wait and sound on resume).
export function playSound(sound, bus = AUDIO_BUS.SFX) {
  if (context === null || context.state !== 'running') {
    return;
  }
  const voice = startVoice(sound, bus);
  const releaseStart = context.currentTime + sound.attackSeconds + sound.holdSeconds;
  const end = releaseStart + sound.releaseSeconds;
  voice.envelope.gain.setValueAtTime(sound.volume, releaseStart);
  voice.envelope.gain.linearRampToValueAtTime(0, end);
  voice.oscillator.stop(end);
}

// The background sound, one at a time: a new one replaces the old. It plays
// until stopLoop(). Unlike a one-shot it may start while suspended: it then
// begins when the sound resumes.
export function startLoop(sound) {
  if (context === null) {
    return;
  }
  stopLoop();
  currentLoop = { sound, ...startVoice(sound, AUDIO_BUS.LOOP) };
}

export function stopLoop() {
  if (currentLoop === null) {
    return;
  }
  releaseVoice(currentLoop, currentLoop.sound);
  currentLoop = null;
}

// For the debug overlay: "AUDIO LOCKED", "AUDIO RUNNING  MUTED  LOOP"...
export function audioDebugText() {
  if (context === null) {
    return 'AUDIO LOCKED';
  }
  const muteText = muted ? '  MUTED' : '';
  const loopText = currentLoop !== null ? '  LOOP' : '';
  return `AUDIO ${context.state.toUpperCase()}${muteText}${loopText}`;
}
