import {
  AUDIO_BUS,
  AUDIO_BUS_VOLUMES,
  AUDIO_REVERB_SENDS,
  AUDIO_REVERB_RETURN,
  AUDIO_REVERB_SECONDS,
  AUDIO_REVERB_DECAY_POWER,
  AUDIO_REVERB_LOW_CUT_HZ,
  AUDIO_GLUE_COMPRESSOR,
  AUDIO_LIMITER,
} from './constants.js';

const STEREO_CHANNELS = 2;

console.assert(
  Object.values(AUDIO_BUS).every((bus) => bus in AUDIO_BUS_VOLUMES && bus in AUDIO_REVERB_SENDS),
  'Every audio bus needs a volume and a reverb send',
);

// The mixing desk, built once per AudioContext:
//   bus (sfx / music / ui) --dry-----------------------------> master
//                          \--send--> low cut -> reverb -> return -/
//   master -> glue compressor -> limiter -> speakers
// Sounds connect to a bus; the master is the one knob mute ramps.
export function createMixer(context, { masterVolume }) {
  const limiter = createCompressor(context, AUDIO_LIMITER);
  limiter.connect(context.destination);
  const glue = createCompressor(context, AUDIO_GLUE_COMPRESSOR);
  glue.connect(limiter);
  const masterGain = createGain(context, masterVolume);
  masterGain.connect(glue);
  const reverbInput = createReverb(context, masterGain);
  const busInputs = {};
  for (const bus of Object.values(AUDIO_BUS)) {
    busInputs[bus] = createBus(context, bus, masterGain, reverbInput);
  }
  return { masterGain, busInputs };
}

function createGain(context, value) {
  const gain = context.createGain();
  gain.gain.value = value;
  return gain;
}

function createCompressor(context, settings) {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = settings.thresholdDb;
  compressor.knee.value = settings.kneeDb;
  compressor.ratio.value = settings.ratio;
  compressor.attack.value = settings.attackSeconds;
  compressor.release.value = settings.releaseSeconds;
  return compressor;
}

// One reverb shared by every bus (a room is one room): returns the node
// the buses send into.
function createReverb(context, masterGain) {
  const lowCut = context.createBiquadFilter();
  lowCut.type = 'highpass';
  lowCut.frequency.value = AUDIO_REVERB_LOW_CUT_HZ;
  const convolver = context.createConvolver();
  convolver.buffer = createImpulseResponse(context);
  const reverbReturn = createGain(context, AUDIO_REVERB_RETURN);
  lowCut.connect(convolver);
  convolver.connect(reverbReturn);
  reverbReturn.connect(masterGain);
  return lowCut;
}

// A recorded room "clap" would be a file; random noise that fades out sounds
// close to one. Each channel gets its own noise, so the space feels wide.
// The convolver normalizes its buffer, so the level is set by the gains.
export function createImpulseResponse(context) {
  const length = Math.round(AUDIO_REVERB_SECONDS * context.sampleRate);
  const impulse = context.createBuffer(STEREO_CHANNELS, length, context.sampleRate);
  for (let channel = 0; channel < STEREO_CHANNELS; channel++) {
    const samples = impulse.getChannelData(channel);
    for (let index = 0; index < length; index++) {
      const remaining = 1 - index / length;
      samples[index] = (Math.random() * 2 - 1) * remaining ** AUDIO_REVERB_DECAY_POWER;
    }
  }
  return impulse;
}

function createBus(context, bus, masterGain, reverbInput) {
  const busGain = createGain(context, AUDIO_BUS_VOLUMES[bus]);
  busGain.connect(masterGain);
  const send = createGain(context, AUDIO_REVERB_SENDS[bus]);
  busGain.connect(send);
  send.connect(reverbInput);
  return busGain;
}
