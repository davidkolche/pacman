// Screen geometry, matching the original arcade hardware.
export const TILE_SIZE = 8;
export const MAZE_COLUMNS = 28;
export const MAZE_ROWS = 36;
export const SCREEN_WIDTH = MAZE_COLUMNS * TILE_SIZE;
export const SCREEN_HEIGHT = MAZE_ROWS * TILE_SIZE;

// The arcade resolution is tiny on modern monitors, so we enlarge it on screen.
// This is the desired scale in CSS pixels; the real scale is rounded down to a
// whole number of physical pixels so every game pixel has the same size.
export const DISPLAY_SCALE = 3;
export const MIN_PHYSICAL_SCALE = 1;

// Timing
export const MS_PER_SECOND = 1000;
export const TARGET_UPDATES_PER_SECOND = 60;
export const FIXED_TIMESTEP_MS = MS_PER_SECOND / TARGET_UPDATES_PER_SECOND;
// After a long pause (e.g. background tab) we drop the extra time instead of
// running hundreds of catch-up updates at once (the "spiral of death").
export const MAX_FRAME_TIME_MS = 250;
export const FPS_SAMPLE_INTERVAL_MS = 1000;

// Colors
export const COLORS = {
  BACKGROUND: '#000000',
};
