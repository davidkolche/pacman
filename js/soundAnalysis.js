import {
  SOUND_ANALYSIS_WINDOW_SECONDS,
  SOUND_ANALYSIS_HIT_ON_SHARE,
  SOUND_ANALYSIS_HIT_OFF_SHARE,
  SOUND_ANALYSIS_EDGE_SHARE,
  SOUND_ANALYSIS_DECIMALS,
  AUDIO_SILENCE_LEVEL,
} from './constants.js';

// Measures decoded sound files; reads the samples only, plays nothing.
// audio.js uses audibleRange to find a file's silence at load; the rest is
// debug (gallery key 4): the length, the silence at the start and end, the
// separate hits (to choose a slice) and, for a loop, how smooth its seam is.

// Where the sound really is: the first and last sample (of any channel)
// above the level, in seconds; null for a file that is silent throughout.
export function audibleRange(buffer, level) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const isHeardAt = (index) => channels.some((channel) => Math.abs(channel[index]) > level);
  let first = 0;
  while (first < buffer.length && !isHeardAt(first)) {
    first++;
  }
  if (first === buffer.length) {
    return null;
  }
  let last = buffer.length - 1;
  while (!isHeardAt(last)) {
    last--;
  }
  return { startSeconds: first / buffer.sampleRate, endSeconds: (last + 1) / buffer.sampleRate };
}

// Prints a summary line and one table row per hit (start, peak, end,
// length, gap to the previous start). For a loop ({ buffer: its own copy of
// the samples, as audio.js plays it, startSeconds, endSeconds }) a seam
// line too.
export function logSoundAnalysis(name, buffer, loop) {
  const windowSeconds = SOUND_ANALYSIS_WINDOW_SECONDS;
  const samples = monoSamples(buffer);
  const loudness = windowLoudness(samples, Math.round(windowSeconds * buffer.sampleRate));
  const hits = findHits(loudness).map((hit) => ({
    startSeconds: hit.start * windowSeconds,
    peakSeconds: hit.peak * windowSeconds,
    endSeconds: hit.end * windowSeconds,
  }));
  const rows = hits.map((hit, index) => ({
    start: round(hit.startSeconds),
    peak: round(hit.peakSeconds),
    end: round(hit.endSeconds),
    length: round(hit.endSeconds - hit.startSeconds),
    gap: index === 0 ? null : round(hit.startSeconds - hits[index - 1].startSeconds),
  }));
  console.log(
    `Sound "${name}": ${round(buffer.duration)} s, ${silenceText(buffer)}, `
    + `${hits.length} hits${spacingText(hits)}`,
  );
  console.table(rows);
  if (loop !== undefined) {
    console.log(`Sound "${name}": ${seamText(buffer, loop)}`);
  }
}

function silenceText(buffer) {
  const range = audibleRange(buffer, AUDIO_SILENCE_LEVEL);
  if (range === null) {
    return 'silent throughout';
  }
  const endSilence = buffer.duration - range.endSeconds;
  return `silence ${round(range.startSeconds)} s at the start and ${round(endSilence)} s at the end`
    + ` (audible ${round(range.startSeconds)}-${round(range.endSeconds)} s)`;
}

// A click is a jump between two neighbouring samples far bigger than the
// music ever makes: the seam (the loop's last sample -> its first) is
// compared with the biggest jump inside the loop, in the file as it is and
// in the loop's own copy with the seam fades.
function seamText(fileBuffer, { buffer: loopBuffer, startSeconds, endSeconds }) {
  const first = Math.round(startSeconds * fileBuffer.sampleRate);
  const last = Math.round(endSeconds * fileBuffer.sampleRate) - 1;
  const seamJump = (samples) => Math.abs(samples[first] - samples[last]);
  const fileSamples = monoSamples(fileBuffer);
  let biggestInside = 0;
  for (let index = first + 1; index <= last; index++) {
    biggestInside = Math.max(biggestInside, Math.abs(fileSamples[index] - fileSamples[index - 1]));
  }
  return `loop ${round(startSeconds)}-${round(endSeconds)} s (${round(endSeconds - startSeconds)} s), `
    + `jump at the seam ${round(seamJump(fileSamples))} in the file, `
    + `${round(seamJump(monoSamples(loopBuffer)))} with the seam fades `
    + `(biggest jump inside the loop ${round(biggestInside)})`;
}

function spacingText(hits) {
  if (hits.length < 2) {
    return '';
  }
  const meanGap = (hits.at(-1).startSeconds - hits[0].startSeconds) / (hits.length - 1);
  return `, one every ${round(meanGap)} s on average (${round(1 / meanGap)} per second)`;
}

// Both channels averaged: a hit counts wherever it is heard.
function monoSamples(buffer) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const mono = new Float32Array(buffer.length);
  for (const channel of channels) {
    for (let index = 0; index < buffer.length; index++) {
      mono[index] += channel[index] / channels.length;
    }
  }
  return mono;
}

// Loudness (RMS) of each short window: one number per window instead of a
// jagged wave.
function windowLoudness(samples, windowLength) {
  const loudness = [];
  for (let start = 0; start + windowLength <= samples.length; start += windowLength) {
    let sumOfSquares = 0;
    for (let index = start; index < start + windowLength; index++) {
      sumOfSquares += samples[index] ** 2;
    }
    loudness.push(Math.sqrt(sumOfSquares / windowLength));
  }
  return loudness;
}

// A hit is on from the moment the loudness passes the ON level until it
// falls under the lower OFF level (window indexes). Its start and end are
// then widened to where it is EDGE x its own peak, never into the hit
// before it.
function findHits(loudness) {
  const loudest = Math.max(...loudness);
  const hits = [];
  let current = null;
  loudness.forEach((level, index) => {
    if (current === null && level >= loudest * SOUND_ANALYSIS_HIT_ON_SHARE) {
      current = { on: index, peak: index };
    } else if (current !== null && level > loudness[current.peak]) {
      current.peak = index;
    } else if (current !== null && level < loudest * SOUND_ANALYSIS_HIT_OFF_SHARE) {
      hits.push(withEdges(loudness, current, hits.at(-1)?.end ?? 0));
      current = null;
    }
  });
  if (current !== null) {
    hits.push(withEdges(loudness, current, hits.at(-1)?.end ?? 0));
  }
  return hits;
}

function withEdges(loudness, { on, peak }, earliestStart) {
  const edge = loudness[peak] * SOUND_ANALYSIS_EDGE_SHARE;
  let start = on;
  while (start > earliestStart && loudness[start - 1] > edge) {
    start--;
  }
  let end = peak;
  while (end < loudness.length - 1 && loudness[end] > edge) {
    end++;
  }
  return { start, peak, end };
}

function round(seconds) {
  return Number(seconds.toFixed(SOUND_ANALYSIS_DECIMALS));
}
