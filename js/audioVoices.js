import {
  AUDIO_ENVELOPE_TIME_CONSTANTS,
  AUDIO_NOISE_BUFFER_SECONDS,
  FILTER_UNIT,
} from './constants.js';

const SEMITONES_PER_OCTAVE = 12;
const CENTS_PER_OCTAVE = 1200;
const MONO_CHANNELS = 1;

// The building blocks of every synthesized sound. A voice (constants.js
// VOICES) is how one note sounds: oscillator layers and/or noise, a filter
// that may move, a volume envelope. A note says when, how high, how long.
//   layers + noise -> filter (+ its envelope) -> volume envelope -> panner -> bus

// Frequency ratio of a number of semitones: 12 semitones = an octave = x2.
export function semitonesToRatio(semitones) {
  return 2 ** (semitones / SEMITONES_PER_OCTAVE);
}

export function centsToRatio(cents) {
  return 2 ** (cents / CENTS_PER_OCTAVE);
}

// From wherever the value is now (maybe halfway through another ramp) to
// the target, in a straight line: no jump, so no click.
export function rampTo(context, param, target, durationSeconds) {
  const now = context.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + durationSeconds);
}

// setTargetAtTime never quite arrives: it closes the same share of the gap
// every moment, like a plucked string fading. Within a stage's time it has
// covered all but a trace of the way.
function timeConstant(stageSeconds) {
  return stageSeconds / AUDIO_ENVELOPE_TIME_CONSTANTS;
}

// One second of white noise per context, shared by every noisy note (each
// starts at a random spot, so two hits never sound identical).
const noiseBuffers = new WeakMap();

function noiseBuffer(context) {
  if (!noiseBuffers.has(context)) {
    const length = Math.round(AUDIO_NOISE_BUFFER_SECONDS * context.sampleRate);
    const buffer = context.createBuffer(MONO_CHANNELS, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index++) {
      samples[index] = Math.random() * 2 - 1;
    }
    noiseBuffers.set(context, buffer);
  }
  return noiseBuffers.get(context);
}

// Plays one note of a voice into destination, scheduled in full at once:
// the caller only keeps the handle to cut it short (voice stealing).
//   frequencyHz: already multiplied by every ratio (scale step, variation)
//   peakVolume:  the envelope's top, already varied
//   pan:         -1 (left) .. 1 (right)
export function startNote(context, destination, voice, note) {
  const { startTime, frequencyHz, durationSeconds, peakVolume, pan } = note;
  const gateEnd = startTime + durationSeconds;
  const endTime = gateEnd + voice.envelope.releaseSeconds;
  const envelope = createEnvelope(context, voice.envelope, peakVolume, startTime, gateEnd);
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  envelope.connect(panner);
  panner.connect(destination);
  const input = voice.filter
    ? createFilter(context, voice.filter, frequencyHz, startTime, envelope)
    : envelope;
  const sources = [
    ...createLayers(context, voice.layers ?? [], note, input),
    ...createNoise(context, voice.noise, input),
  ];
  for (const { node, offsetSeconds } of sources) {
    node.start(startTime, offsetSeconds);
    node.stop(endTime);
  }
  // All sources stop together; once the first has ended the chain is
  // silent and can go.
  sources[0].node.addEventListener('ended', () => {
    for (const { node } of sources) {
      node.disconnect();
    }
    envelope.disconnect();
    panner.disconnect();
  });
  return {
    startTime,
    endTime,
    // A short fade from `time` on instead of a cut, which would click.
    stopAt(time, fadeSeconds) {
      envelope.gain.cancelScheduledValues(time);
      envelope.gain.setTargetAtTime(0, time, timeConstant(fadeSeconds));
      for (const { node } of sources) {
        node.stop(time + fadeSeconds);
      }
    },
  };
}

// Attack: a straight rise to the peak (a curve would sound late). Decay:
// down toward the sustain level. Release: from the gate's end to silence.
function createEnvelope(context, shape, peakVolume, startTime, gateEnd) {
  const envelope = context.createGain();
  const gain = envelope.gain;
  const decayStart = startTime + shape.attackSeconds;
  gain.setValueAtTime(0, startTime);
  gain.linearRampToValueAtTime(peakVolume, decayStart);
  gain.setTargetAtTime(peakVolume * shape.sustain, decayStart, timeConstant(shape.decaySeconds));
  gain.setTargetAtTime(0, Math.max(gateEnd, decayStart), timeConstant(shape.releaseSeconds));
  return envelope;
}

// The filter's cutoff moves too: from start up (or down) to peak over its
// attack, then toward end. A lowpass that closes fast is what makes a
// "pluck": bright at the touch, mellow right after.
function createFilter(context, shape, frequencyHz, startTime, output) {
  const filter = context.createBiquadFilter();
  filter.type = shape.type;
  filter.Q.value = shape.q;
  const scale = shape.unit === FILTER_UNIT.NOTE ? frequencyHz : 1;
  const cutoff = filter.frequency;
  const peakTime = startTime + shape.attackSeconds;
  cutoff.setValueAtTime(shape.start * scale, startTime);
  cutoff.linearRampToValueAtTime(shape.peak * scale, peakTime);
  cutoff.setTargetAtTime(shape.end * scale, peakTime, timeConstant(shape.decaySeconds));
  filter.connect(output);
  return filter;
}

// Several oscillators on one note: a second one a few cents off makes the
// sound wider and warmer than a single pure tone. A pitch path bends the
// note on its way (a slide into it, a drop, a bounce).
function createLayers(context, layers, note, output) {
  return layers.map((layer) => {
    const oscillator = context.createOscillator();
    oscillator.type = layer.waveform;
    oscillator.detune.value = layer.detuneCents ?? 0;
    const layerHz = note.frequencyHz * (layer.ratio ?? 1);
    if (note.pitchPath) {
      followPitchPath(oscillator.frequency, layerHz, note.pitchPath, note.startTime);
    } else {
      oscillator.frequency.setValueAtTime(layerHz, note.startTime);
    }
    return { node: connectThroughGain(context, oscillator, layer.gain, output), offsetSeconds: 0 };
  });
}

// Points of { atSeconds, ratio } x the pitch, from the note's start. The
// pitch slides between them exponentially: the ear hears equal ratios as
// equal steps, so a straight line in Hz would seem to rush at the bottom.
function followPitchPath(frequency, layerHz, [first, ...rest], startTime) {
  frequency.setValueAtTime(layerHz * first.ratio, startTime + first.atSeconds);
  for (const point of rest) {
    frequency.exponentialRampToValueAtTime(layerHz * point.ratio, startTime + point.atSeconds);
  }
}

function createNoise(context, noise, output) {
  if (!noise) {
    return [];
  }
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  source.loop = true;
  const offsetSeconds = Math.random() * AUDIO_NOISE_BUFFER_SECONDS;
  return [{ node: connectThroughGain(context, source, noise.gain, output), offsetSeconds }];
}

// Each source gets its own level, so layers can be mixed; the gain node is
// unplugged together with its source.
function connectThroughGain(context, source, level, output) {
  const gain = context.createGain();
  gain.gain.value = level;
  source.connect(gain);
  gain.connect(output);
  source.addEventListener('ended', () => gain.disconnect());
  return source;
}
