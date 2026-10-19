import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_JINGLE_STOP_FADE_SECONDS, GAME_STATE } from '../js/constants.js';
import { SOUND, SOUND_MANIFEST } from '../js/soundManifest.js';
import { getActiveLoop } from '../js/soundEffects.js';

// REVIEW B2: a play() that waits (for its file, or for the context to
// resume) must still obey stopSound, and a sound must not arrive after its
// moment. audio.js needs Web Audio, a window, a document and fetch; Node has
// none of them, so each test installs small fakes. A fake buffer source
// remembers start(): a started source is a sound the player hears.

// Only what the code reads: a value, and ramps it may schedule (ignored).
function fakeParam(value = 0) {
  return {
    value,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}

function fakeNode(extra = {}) {
  return {
    connect() {},
    disconnect() {},
    addEventListener() {},
    ...extra,
  };
}

// A decoded file: one channel of samples, all heard (no silence to trim),
// tagged with its file so a test knows which sound a source plays.
class FakeAudioBuffer {
  constructor({ numberOfChannels = 1, length, sampleRate, file = null, level = 0 }) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.file = file;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length).fill(level));
  }

  get duration() {
    return this.length / this.sampleRate;
  }

  getChannelData(channel) {
    return this.channels[channel];
  }

  copyToChannel(samples, channel) {
    this.channels[channel].set(samples);
  }
}

// Small and fast to scan: 2 s at 1 kHz.
const FAKE_FILE_SAMPLE_RATE = 1000;
const FAKE_FILE_SECONDS = 2;
const FAKE_FILE_LEVEL = 0.5;
const FAKE_CONTEXT_SAMPLE_RATE = 48000;

function createdPromise() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

// Everything one test sees: the sources the code made, the window's
// listeners, the held files and the gate of the context's resume().
function installFakes({ heldFiles, contextState }) {
  const world = {
    sources: [],
    windowListeners: new Map(),
    heldFetches: new Map(),
    resumeGate: createdPromise(),
  };

  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = FAKE_CONTEXT_SAMPLE_RATE;
      this.state = contextState;
      this.destination = fakeNode();
      world.context = this;
    }

    // The test opens the gate (openResume) when the browser would be done.
    resume() {
      return world.resumeGate.promise;
    }

    suspend() {
      return Promise.resolve();
    }

    // audio.js listens for 'statechange' only to learn that sound is allowed
    // (isAudioUnlocked); these tests set the state themselves.
    addEventListener() {}

    createGain() {
      return fakeNode({ gain: fakeParam(1) });
    }

    createStereoPanner() {
      return fakeNode({ pan: fakeParam() });
    }

    createDynamicsCompressor() {
      return fakeNode({
        threshold: fakeParam(), knee: fakeParam(), ratio: fakeParam(), attack: fakeParam(), release: fakeParam(),
      });
    }

    createBiquadFilter() {
      return fakeNode({ type: 'lowpass', frequency: fakeParam() });
    }

    createConvolver() {
      return fakeNode({ buffer: null });
    }

    createBuffer(numberOfChannels, length, sampleRate) {
      return new FakeAudioBuffer({ numberOfChannels, length, sampleRate });
    }

    createBufferSource() {
      const source = fakeNode({
        buffer: null,
        loop: false,
        playbackRate: fakeParam(1),
        startArguments: null,
        start(...startArguments) {
          this.startArguments = startArguments;
        },
        stop() {},
      });
      world.sources.push(source);
      return source;
    }
  }

  class FakeOfflineAudioContext {
    decodeAudioData(data) {
      return Promise.resolve(new FakeAudioBuffer({
        length: FAKE_FILE_SECONDS * FAKE_FILE_SAMPLE_RATE,
        sampleRate: FAKE_FILE_SAMPLE_RATE,
        file: data.file,
        level: FAKE_FILE_LEVEL,
      }));
    }
  }

  // A held file answers only when the test calls arrive(file): a slow
  // network for exactly that file, at exactly the moment the test picks.
  function fakeFetch(path) {
    const file = path.split('/').at(-1);
    const response = { ok: true, status: 200, arrayBuffer: async () => ({ file }) };
    if (!heldFiles.includes(file)) {
      return Promise.resolve(response);
    }
    const held = createdPromise();
    world.heldFetches.set(file, () => held.resolve(response));
    return held.promise;
  }

  globalThis.AudioContext = FakeAudioContext;
  globalThis.OfflineAudioContext = FakeOfflineAudioContext;
  globalThis.AudioBuffer = FakeAudioBuffer;
  globalThis.fetch = fakeFetch;
  globalThis.window = {
    addEventListener(type, listener) {
      if (!world.windowListeners.has(type)) {
        world.windowListeners.set(type, new Set());
      }
      world.windowListeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      world.windowListeners.get(type)?.delete(listener);
    },
  };
  globalThis.document = { hidden: false, addEventListener() {} };
  return world;
}

// Lets every pending promise (fetch, decode, resume) finish its chain.
function settle() {
  return new Promise((resolve) => setImmediate(resolve));
}

// audio.js keeps its state in the module (one context, the plays, the
// loadings). A different query string makes Node load a new copy, so every
// test starts from a page that was just opened.
let caseNumber = 0;

// The page opens (setupAudio starts loading every file), the player presses
// a first key (the context is made), and the files that are not held arrive.
async function openPage({ heldFiles = [], contextState = 'running' } = {}) {
  const world = installFakes({ heldFiles, contextState });
  caseNumber++;
  const audio = await import(`../js/audio.js?case=${caseNumber}`);
  audio.setupAudio();
  for (const listener of [...(world.windowListeners.get('keydown') ?? [])]) {
    listener();
  }
  await settle();

  async function arrive(file) {
    world.heldFetches.get(file)();
    await settle();
  }

  async function openResume() {
    world.context.state = 'running';
    world.resumeGate.resolve();
    await settle();
  }

  function startedSources(file) {
    return world.sources.filter((source) => source.startArguments !== null && source.buffer?.file === file);
  }

  // A loop plays its own copy of the file (with the seam fades), which has no tag.
  function startedLoops() {
    return world.sources.filter((source) => source.startArguments !== null && source.loop);
  }

  return { audio, arrive, openResume, startedSources, startedLoops };
}

const fileOf = (name) => SOUND_MANIFEST[name].file;

// main.js builds this snapshot every frame for getActiveLoop.
function snapshot(overrides = {}) {
  return {
    state: GAME_STATE.PLAYING,
    isAnyGhostFrightened: false,
    isFrightFlashing: false,
    isGhostEatenFreeze: false,
    isJinglePlaying: false,
    extraLifePlayedSeconds: null,
    ...overrides,
  };
}

describe('a sound whose file is still loading (REVIEW B2)', () => {
  // Enter, then an arrow before game-start.mp3 arrived: PLAY_STARTED stops
  // the jingle (soundEffects.js stopGameStart), so it must never start.
  test('1. the jingle stopped before its file arrives never starts', async () => {
    const page = await openPage({ heldFiles: [fileOf(SOUND.GAME_START)] });
    page.audio.play(SOUND.GAME_START);
    page.audio.stopSound(SOUND.GAME_START, { fadeSeconds: AUDIO_JINGLE_STOP_FADE_SECONDS });
    await page.arrive(fileOf(SOUND.GAME_START));
    assert.equal(page.startedSources(fileOf(SOUND.GAME_START)).length, 0);
  });

  // Dots eaten before dot-eat.mp3 arrived belong to moments that are gone:
  // played on arrival they would all hit at once (one loud burst).
  test('2. dots eaten while their file loads do not all play when it arrives', async () => {
    const page = await openPage({ heldFiles: [fileOf(SOUND.DOT)] });
    for (let dot = 0; dot < 10; dot++) {
      page.audio.play(SOUND.DOT);
    }
    await page.arrive(fileOf(SOUND.DOT));
    assert.equal(page.startedSources(fileOf(SOUND.DOT)).length, 0);
  });

  // A death sound that arrives late would sound after the death is over.
  test('3. a death sound whose file arrives late is not heard', async () => {
    const page = await openPage({ heldFiles: [fileOf(SOUND.DEATH)] });
    page.audio.play(SOUND.DEATH);
    await page.arrive(fileOf(SOUND.DEATH));
    assert.equal(page.startedSources(fileOf(SOUND.DEATH)).length, 0);
  });

  // The decision of stage 12.7: the jingle is never lost to a slow file.
  test('guard: a jingle nobody stopped plays when its file arrives', async () => {
    const page = await openPage({ heldFiles: [fileOf(SOUND.GAME_START)] });
    page.audio.play(SOUND.GAME_START);
    assert.equal(page.startedSources(fileOf(SOUND.GAME_START)).length, 0);
    await page.arrive(fileOf(SOUND.GAME_START));
    assert.equal(page.startedSources(fileOf(SOUND.GAME_START)).length, 1);
  });
});

describe('a sound waiting for the context to resume (REVIEW B2)', () => {
  // The very first key, or right after P: the file is ready, but the
  // context is still starting. A stopSound meanwhile must win.
  test('4. a play stopped before resume() ends never starts', async () => {
    const page = await openPage({ contextState: 'suspended' });
    page.audio.play(SOUND.DEATH);
    page.audio.stopSound(SOUND.DEATH);
    await page.openResume();
    assert.equal(page.startedSources(fileOf(SOUND.DEATH)).length, 0);
  });
});

describe('a background loop whose file arrives late (REVIEW B2)', () => {
  const frightened = snapshot({ isAnyGhostFrightened: true });
  const frightOver = snapshot({ isAnyGhostFrightened: false });

  test('5a. it starts on arrival while getActiveLoop still wants it', async () => {
    const page = await openPage({ heldFiles: [fileOf(SOUND.FRIGHTENED)] });
    page.audio.setBackgroundLoop(getActiveLoop(frightened));
    assert.equal(page.startedLoops().length, 0);
    page.audio.setBackgroundLoop(getActiveLoop(frightened));
    await page.arrive(fileOf(SOUND.FRIGHTENED));
    assert.equal(page.startedLoops().length, 1);
  });

  test('5b. it does not start when the game moved on before it arrived', async () => {
    const page = await openPage({ heldFiles: [fileOf(SOUND.FRIGHTENED)] });
    page.audio.setBackgroundLoop(getActiveLoop(frightened));
    page.audio.setBackgroundLoop(getActiveLoop(frightOver));
    await page.arrive(fileOf(SOUND.FRIGHTENED));
    assert.equal(page.startedLoops().length, 0);
  });
});
