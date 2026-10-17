import {
  EVENTS,
  MAZE_COLUMNS,
  SOUNDS,
  VOICES,
  SOUND_EFFECT,
  SOUND_EFFECT_VARIANTS,
  AUDIO_DOT_PAN_WIDTH,
  AUDIO_DOT_PREVIEW_COUNT,
  AUDIO_DOT_PREVIEW_SPACING_SECONDS,
  AUDIO_GHOST_CHAIN_SEMITONES,
  AUDIO_GHOST_PREVIEW_SPACING_SECONDS,
  GHOST_EATEN_POINTS,
} from './constants.js';
import { on } from './events.js';
import { play } from './audio.js';
import { semitonesToRatio } from './audioVoices.js';

// Every variant names a sound, and every note of a sound names a voice.
for (const effect of Object.values(SOUND_EFFECT_VARIANTS)) {
  console.assert(
    effect.variants.every((name) => name in SOUNDS) && effect.chosen < effect.variants.length,
    `Sound effect ${effect.label}: unknown variant`,
  );
}
console.assert(
  AUDIO_GHOST_CHAIN_SEMITONES.length === GHOST_EATEN_POINTS.length,
  'Every ghost of the chain needs a pitch',
);
for (const [name, sound] of Object.entries(SOUNDS)) {
  console.assert(sound.notes.every((note) => note.voice in VOICES), `Sound ${name}: unknown voice`);
}

// The game's sounds: this module listens to the game's events (like
// score.js) and decides what plays. Pac-Man, the ghosts and the game only
// announce what happened; none of them knows sound exists.

// The variant each effect plays now: constants.js's choice, or the one
// picked in the gallery during this session.
const activeVariants = new Map(
  Object.entries(SOUND_EFFECT_VARIANTS).map(([effect, { chosen }]) => [effect, chosen]),
);

export function setupSoundEffects() {
  on(EVENTS.DOT_EATEN, ({ col }) => playDot(col));
  on(EVENTS.GHOST_EATEN, ({ points }) => playGhostEaten(GHOST_EATEN_POINTS.indexOf(points)));
}

export function effectVariant(effect) {
  return activeVariants.get(effect);
}

export function setEffectVariant(effect, variantIndex) {
  activeVariants.set(effect, variantIndex);
}

function variantSound(effect) {
  return SOUND_EFFECT_VARIANTS[effect].variants[effectVariant(effect)];
}

function playDot(col) {
  play(variantSound(SOUND_EFFECT.DOT), { pan: dotPan(col) });
}

// The chain's place (0 for the first ghost of a pellet) is read back from
// the points, which already count it. Only sounds that follow the chain
// rise with it.
function playGhostEaten(chainIndex, { name = variantSound(SOUND_EFFECT.GHOST_EATEN), delaySeconds = 0 } = {}) {
  const semitones = SOUNDS[name].followsChain ? AUDIO_GHOST_CHAIN_SEMITONES[chainIndex] : 0;
  play(name, { delaySeconds, frequencyRatio: semitonesToRatio(semitones) });
}

// Left edge -> a little left, right edge -> a little right.
export function dotPan(col) {
  return (col / (MAZE_COLUMNS - 1) * 2 - 1) * AUDIO_DOT_PAN_WIDTH;
}

// The gallery's sample of an effect, played with the given variant.
export function previewEffect(effect, variantIndex) {
  const name = SOUND_EFFECT_VARIANTS[effect].variants[variantIndex];
  if (effect === SOUND_EFFECT.DOT) {
    previewDotRun(name);
  } else if (effect === SOUND_EFFECT.GHOST_EATEN) {
    previewGhostChain(name);
  }
}

// All four ghosts of one pellet, one after another.
function previewGhostChain(name) {
  AUDIO_GHOST_CHAIN_SEMITONES.forEach((_, chainIndex) => {
    playGhostEaten(chainIndex, { name, delaySeconds: chainIndex * AUDIO_GHOST_PREVIEW_SPACING_SECONDS });
  });
}

// A run of dots sweeping left to right, as if eaten along a corridor.
function previewDotRun(name) {
  for (let index = 0; index < AUDIO_DOT_PREVIEW_COUNT; index++) {
    const col = Math.round((index / (AUDIO_DOT_PREVIEW_COUNT - 1)) * (MAZE_COLUMNS - 1));
    play(name, { delaySeconds: index * AUDIO_DOT_PREVIEW_SPACING_SECONDS, pan: dotPan(col) });
  }
}

// For the debug overlay: every effect's variant letter, "SFX A B".
export function soundEffectsDebugText() {
  const letters = Object.keys(SOUND_EFFECT_VARIANTS).map((effect) => variantLetter(effectVariant(effect)));
  return `SFX ${letters.join(' ')}`;
}

export function variantLetter(index) {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}
