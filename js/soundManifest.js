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
//   trimStartSeconds / trimEndSeconds: optional, not with a slice: where the
//                 sound really starts and ends in the file. Detected at load
//                 from the samples (first / last above AUDIO_SILENCE_LEVEL;
//                 gallery key 4 prints it); a value here wins. A loop repeats
//                 exactly this part.
//   fadeOutSeconds: optional, one-shots without a slice: the last this many
//                 seconds (file time) of the played part fade to silence,
//                 for a file that stops abruptly at full volume
export const SOUND_FILES_FOLDER = 'assets/audio/';

// The names the game plays, so a typo fails loudly instead of silently.
export const SOUND = Object.freeze({
  DOT: 'dot',
  POWER_PELLET: 'powerPellet',
  FRIGHTENED: 'frightened',
  GHOST_EATEN: 'ghostEaten',
  DEATH: 'death',
  GAME_START: 'gameStart',
  LEVEL_COMPLETE: 'levelComplete',
  GAME_OVER: 'gameOver',
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
  // 1.87 s: about 1 s of sound, then silence; 23 ms of encoder silence first.
  [SOUND.POWER_PELLET]: Object.freeze({
    file: 'power-pellet.mp3', label: 'POWER PELLET', bus: AUDIO_BUS.SFX,
    volume: 0.5, loop: false, playbackRate: 1, maxVoices: 2,
    trimStartSeconds: 0.023,
  }),
  // The background loop while ghosts are frightened (soundEffects.js
  // getActiveLoop). A 10.000 s loop shifted by the MP3 encoder's delay (1105
  // samples = 23 ms at 48 kHz): it starts with a hard attack at 0.023 s and
  // ends at 10.023 s. Set by hand: the detection finds the encoder's faint
  // pre-echo at 0.006 s, and 17 ms of it every round is heard as a gap.
  [SOUND.FRIGHTENED]: Object.freeze({
    file: 'frightened-loop.mp3', label: 'FRIGHTENED', bus: AUDIO_BUS.MUSIC,
    volume: 0.6, loop: true, playbackRate: 1,
    trimStartSeconds: 0.023, trimEndSeconds: 10.023,
  }),
  // At the start of the 1 s freeze, higher and louder with each ghost of
  // the chain (soundEffects.js). 1.75 s: 46 ms of silence first (found by
  // the detection), loud for 0.25 s, then softer until about 1.7 s, so it
  // goes on past the freeze. A quiet file (its loudest 0.3 s at -20 dB RMS,
  // the frightened loop at -10 dB), so its volume is above 1: measured, at
  // 0.5 it was 6 dB under the loop and lost in it. Two voices: a second
  // ghost a freeze later is heard over the first one's tail without piling up.
  [SOUND.GHOST_EATEN]: Object.freeze({
    file: 'ghost-eat.mp3', label: 'GHOST EATEN', bus: AUDIO_BUS.SFX,
    volume: 1.4, loop: false, playbackRate: 1, maxVoices: 2,
    pitchVariationCents: 10,
  }),
  // With the death animation (soundEffects.js). 1.39 s: 45 ms of silence
  // first (found by the detection), sound until 1.36 s, so about 1.32 s is
  // heard: it fits in the 1.5 s animation and ends just before the pop is
  // over. A very quiet file (peak 0.25, -25 dB RMS: at volume 1 it would be
  // quieter than one dot), so its volume is well above 1 (heard about -18 dB,
  // like the ghost eaten sound).
  [SOUND.DEATH]: Object.freeze({
    file: 'death.mp3', label: 'DEATH', bus: AUDIO_BUS.SFX,
    volume: 2.6, loop: false, playbackRate: 1, maxVoices: 1,
  }),
  // The new game's jingle, on its first READY (soundEffects.js). 6.94 s: 45 ms
  // of silence first (detected), then two phrases of 3.43 s (8 beats of
  // 0.43 s) at full level to the very last sample: the file stops abruptly,
  // so its last 0.3 s fade out. Loud enough as it is (-15 dB RMS); on the
  // music bus. It stops (fading) when the player presses the first
  // direction (soundEffects.js), so it only fills the wait in READY.
  [SOUND.GAME_START]: Object.freeze({
    file: 'game-start.mp3', label: 'GAME START', bus: AUDIO_BUS.MUSIC,
    volume: 1.2, loop: false, playbackRate: 1, maxVoices: 1,
    fadeOutSeconds: 0.3,
  }),
  // With the maze flash (soundEffects.js). 5.02 s: the attack is at 0.105 s
  // after silence and a soft pre-echo (the detection finds 0.061 s; 44 ms of
  // it would put the music late on the flash, so the start is set by hand),
  // full level until about 3.3 s, then a fade until 4.77 s. The flash is only
  // 2 s, so the music fades when the next level's READY starts. A loud file
  // (-11 dB RMS); on the music bus.
  [SOUND.LEVEL_COMPLETE]: Object.freeze({
    file: 'level-complete.mp3', label: 'LEVEL COMPLETE', bus: AUDIO_BUS.MUSIC,
    volume: 1.2, loop: false, playbackRate: 1, maxVoices: 1,
    trimStartSeconds: 0.1,
  }),
  // When GAME OVER starts (soundEffects.js), after the death sound. 2.11 s:
  // 69 ms of silence first (detected), sound until 1.83 s, so about 1.76 s
  // is heard: always over before the 3 s GAME OVER screen ends. A quiet file
  // (-19 dB RMS); on the music bus like the other jingles.
  [SOUND.GAME_OVER]: Object.freeze({
    file: 'game-over.mp3', label: 'GAME OVER', bus: AUDIO_BUS.MUSIC,
    volume: 2.5, loop: false, playbackRate: 1, maxVoices: 1,
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
  console.assert(
    sound.fadeOutSeconds === undefined || (sound.fadeOutSeconds > 0 && !sound.loop && sound.slice === undefined),
    `Sound ${name}: fadeOutSeconds must be above 0, on a one-shot without a slice`,
  );
  console.assert(
    (sound.trimStartSeconds === undefined && sound.trimEndSeconds === undefined) || sound.slice === undefined,
    `Sound ${name}: a trim cannot go with a slice (the slice already says what to play)`,
  );
  console.assert(
    (sound.trimStartSeconds ?? 0) >= 0
      && (sound.trimEndSeconds === undefined || sound.trimEndSeconds > (sound.trimStartSeconds ?? 0)),
    `Sound ${name}: the trim must start at 0 or later and end after it starts`,
  );
}
