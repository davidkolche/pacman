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
} from './constants.js';
import { on } from './events.js';
import { play } from './audio.js';

// Every variant names a sound, and every note of a sound names a voice.
for (const effect of Object.values(SOUND_EFFECT_VARIANTS)) {
  console.assert(
    effect.variants.every((name) => name in SOUNDS) && effect.chosen < effect.variants.length,
    `Sound effect ${effect.label}: unknown variant`,
  );
}
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

// Left edge -> a little left, right edge -> a little right.
export function dotPan(col) {
  return (col / (MAZE_COLUMNS - 1) * 2 - 1) * AUDIO_DOT_PAN_WIDTH;
}

// The gallery's sample of an effect, played with the given variant.
export function previewEffect(effect, variantIndex) {
  const name = SOUND_EFFECT_VARIANTS[effect].variants[variantIndex];
  if (effect === SOUND_EFFECT.DOT) {
    previewDotRun(name);
  }
}

// A run of dots sweeping left to right, as if eaten along a corridor.
function previewDotRun(name) {
  for (let index = 0; index < AUDIO_DOT_PREVIEW_COUNT; index++) {
    const col = Math.round((index / (AUDIO_DOT_PREVIEW_COUNT - 1)) * (MAZE_COLUMNS - 1));
    play(name, { delaySeconds: index * AUDIO_DOT_PREVIEW_SPACING_SECONDS, pan: dotPan(col) });
  }
}

// For the debug overlay: "DOT B WOOD".
export function soundEffectsDebugText() {
  const index = effectVariant(SOUND_EFFECT.DOT);
  return `DOT ${variantLetter(index)} ${SOUNDS[variantSound(SOUND_EFFECT.DOT)].label}`;
}

export function variantLetter(index) {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}
