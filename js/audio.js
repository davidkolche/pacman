import { loadSettings, saveSettings } from './storage.js';

// Sound effects come in stage 12; for now only the mute switch, so the
// player's choice is already remembered between visits.
let muted = false;

// Before the first frame, so the mute icon is right from the start.
export function setupAudio() {
  muted = loadSettings().muted;
}

export function isMuted() {
  return muted;
}

// Saved at once: it changes rarely, only on a key press.
export function toggleMuted() {
  muted = !muted;
  saveSettings({ muted });
}
