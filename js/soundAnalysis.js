import {
  SOUND_ANALYSIS_WINDOW_SECONDS,
  SOUND_ANALYSIS_HIT_ON_SHARE,
  SOUND_ANALYSIS_HIT_OFF_SHARE,
  SOUND_ANALYSIS_EDGE_SHARE,
  SOUND_ANALYSIS_DECIMALS,
} from './constants.js';

// Debug (gallery key 4): finds the separate hits in a decoded sound file and
// prints them to the console, to choose a slice (offset + duration) for
// soundManifest.js. Reads the buffer only; plays nothing.

// Prints one table row per hit (start, peak, end, length, gap to the
// previous start) and a summary line.
export function logSoundHits(name, buffer) {
  const windowSeconds = SOUND_ANALYSIS_WINDOW_SECONDS;
  const loudness = windowLoudness(monoSamples(buffer), Math.round(windowSeconds * buffer.sampleRate));
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
  console.log(`Sound "${name}": ${round(buffer.duration)} s, ${hits.length} hits${spacingText(hits)}`);
  console.table(rows);
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
