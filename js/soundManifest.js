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
export const SOUND_FILES_FOLDER = 'assets/audio/';

export const SOUND_MANIFEST = Object.freeze({
  dot: Object.freeze({
    file: 'dot-eat.mp3', label: 'DOT', bus: AUDIO_BUS.SFX,
    volume: 0.5, loop: false, playbackRate: 1, maxVoices: 3,
  }),
});

export function soundFilePath(name) {
  return SOUND_FILES_FOLDER + SOUND_MANIFEST[name].file;
}

for (const [name, sound] of Object.entries(SOUND_MANIFEST)) {
  console.assert(typeof sound.file === 'string' && sound.file.length > 0, `Sound ${name}: no file`);
  console.assert(Object.values(AUDIO_BUS).includes(sound.bus), `Sound ${name}: unknown bus`);
  console.assert(sound.volume >= 0, `Sound ${name}: volume below 0`);
  console.assert(sound.playbackRate > 0, `Sound ${name}: playback rate must be above 0`);
  console.assert(typeof sound.loop === 'boolean', `Sound ${name}: loop must be true or false`);
}
