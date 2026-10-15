import {
  SOUNDS,
  SOUND_EFFECT_VARIANTS,
  SOUND_GALLERY_ACTION,
  DEBUG_SOUND_VARIANT_KEYS,
} from './constants.js';
import { effectVariant, setEffectVariant, previewEffect, variantLetter } from './soundEffects.js';

// Debug: the sound gallery (B). One effect is selected; N moves on, 1-5
// play a variant of it and make that variant the game's for this session,
// so it can be heard in real play too.
const EFFECTS = Object.keys(SOUND_EFFECT_VARIANTS);
let selectedIndex = 0;

console.assert(
  Object.values(SOUND_EFFECT_VARIANTS).every(({ variants }) => variants.length <= DEBUG_SOUND_VARIANT_KEYS.length),
  'Every sound variant needs a gallery key',
);

// While the game is paused play() stays silent by itself, so a press then
// only changes the selection.
export function applySoundGalleryActions(actions) {
  for (const { action, variantIndex } of actions) {
    const effect = EFFECTS[selectedIndex];
    if (action === SOUND_GALLERY_ACTION.NEXT) {
      selectedIndex = (selectedIndex + 1) % EFFECTS.length;
    } else if (variantIndex < SOUND_EFFECT_VARIANTS[effect].variants.length) {
      setEffectVariant(effect, variantIndex);
      previewEffect(effect, variantIndex);
    }
  }
}

// What the panel shows (renderer.js draws it): every effect, the selected
// one with all its variants, the active variant marked.
export function soundGalleryView() {
  return EFFECTS.map((effect, index) => {
    const { label, variants } = SOUND_EFFECT_VARIANTS[effect];
    const activeIndex = effectVariant(effect);
    return {
      label,
      activeLetter: variantLetter(activeIndex),
      isSelected: index === selectedIndex,
      variants: variants.map((name, variantIndex) => ({
        letter: variantLetter(variantIndex),
        label: SOUNDS[name].label,
        isActive: variantIndex === activeIndex,
      })),
    };
  });
}
