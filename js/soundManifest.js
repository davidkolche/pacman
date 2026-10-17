import { AUDIO_BUS } from './constants.js';

// Every sound of the game, by name, and the file it plays. The game and the
// sound manager only ever use the names; this table is the only place in
// the code that knows a file name. A new sound = a file in assets/audio/,
// a line here and a line in assets/audio/CREDITS.md.
//   file:         inside SOUND_FILES_FOLDER
//   label:        the name the debug gallery shows
//   bus:          the mixer bus it plays through (AUDIO_BUS)
//   volume:       a gain on top of the bus: 1 = the file as it is
//   loop:         true = started with startLoop / stopped with stopLoop
//                 (siren, music); false = a one-shot for play()
//   playbackRate: 1 = as recorded; 2 = twice as fast and an octave higher
//   maxVoices:    one-shots only: how many plays of it may sound at once
//                 (default AUDIO_DEFAULT_MAX_VOICES)
//   slice:        optional, one-shots only: play just this part of the file
//                 ({ offsetSeconds, durationSeconds }, in the file's own time)
//   pitchVariationCents: optional: each play is up to this much higher or
//                 lower at random, so a sound repeated fast is never the
//                 exact same copy
export const SOUND_FILES_FOLDER = 'assets/audio/';

// The names the game plays, so a typo fails loudly instead of silently.
export const SOUND = Object.freeze({
  DOT: 'dot',
});

export const SOUND_MANIFEST = Object.freeze({
  // dot-eat.mp3 holds 14 coin hits about 0.37 s apart, far slower than the
  // 6.7 dots per second Pac-Man eats on level 1; one hit is cut out and
  // played once per dot (stage 12.1, see CLAUDE.md). The first hit is clean
  // (nothing before it) and is over (-20 dB) after 0.33 s.
  [SOUND.DOT]: Object.freeze({
    file: 'dot-eat.mp3', label: 'DOT', bus: AUDIO_BUS.SFX,
    volume: 0.5, loop: false, playbackRate: 1, maxVoices: 3,
    slice: Object.freeze({ offsetSeconds: 0.015, durationSeconds: 0.335 }),
    pitchVariationCents: 15,
  }),
});

export function soundFilePath(name) {
  return SOUND_FILES_FOLDER + SOUND_MANIFEST[name].file;
}

console.assert(
  Object.values(SOUND).every((name) => name in SOUND_MANIFEST),
  'Every SOUND name needs a manifest entry',
);
for (const [name, sound] of Object.entries(SOUND_MANIFEST)) {
  console.assert(typeof sound.file === 'string' && sound.file.length > 0, `Sound ${name}: no file`);
  console.assert(Object.values(AUDIO_BUS).includes(sound.bus), `Sound ${name}: unknown bus`);
  console.assert(sound.volume >= 0, `Sound ${name}: volume below 0`);
  console.assert(sound.playbackRate > 0, `Sound ${name}: playback rate must be above 0`);
  console.assert(typeof sound.loop === 'boolean', `Sound ${name}: loop must be true or false`);
  console.assert(
    sound.slice === undefined
      || (!sound.loop && sound.slice.offsetSeconds >= 0 && sound.slice.durationSeconds > 0),
    `Sound ${name}: a slice needs a one-shot, an offset >= 0 and a duration > 0`,
  );
  console.assert((sound.pitchVariationCents ?? 0) >= 0, `Sound ${name}: pitch variation below 0`);
}
