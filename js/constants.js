// Screen geometry, matching the original arcade hardware.
export const TILE_SIZE = 8;
export const SCREEN_COLUMNS = 28;
export const SCREEN_ROWS = 36;
export const SCREEN_WIDTH = SCREEN_COLUMNS * TILE_SIZE;
export const SCREEN_HEIGHT = SCREEN_ROWS * TILE_SIZE;

// The maze fills the screen between the score rows on top and the
// lives/fruit rows at the bottom.
export const MAZE_COLUMNS = 28;
export const MAZE_ROWS = 31;
export const HUD_TOP_ROWS = 3;
export const HUD_BOTTOM_ROWS = 2;

// One character per tile in the maze layout.
export const TILE = {
  WALL: '#',
  DOT: '.',
  POWER_PELLET: 'o',
  EMPTY: ' ',
  GHOST_DOOR: '-',
};

// Maze drawing sizes, in game pixels. Everything is drawn with whole-pixel
// rectangles: canvas paths and arcs are anti-aliased, and the half-transparent
// edge pixels look blurry once the screen is scaled up.
export const WALL_THICKNESS = 1;
// The wall line runs through this pixel column/row inside an 8x8 tile.
export const WALL_LINE_PIXEL = 3;
export const WALL_CORNER_RADIUS = 3;
// The outer border and the ghost house have a second, parallel line with
// this many empty pixels between the two lines.
export const DOUBLE_WALL_GAP = 2;
// Distance from one line to the other (line thickness plus the gap).
export const DOUBLE_WALL_SPACING = WALL_THICKNESS + DOUBLE_WALL_GAP;
export const DOT_SIZE = 2;
export const GHOST_DOOR_THICKNESS = 2;
// Power pellets pulse (grow and shrink) instead of blinking like the arcade:
// an intentional design change. The largest radius is half a tile, so the
// pellet always stays inside its own tile and never touches a wall.
export const PELLET_COLOR = '#00FF00';
export const PELLET_MIN_RADIUS = 1.5;
export const PELLET_MAX_RADIUS = TILE_SIZE / 2;
// Time for one full small -> large -> small cycle.
export const PELLET_PULSE_PERIOD_MS = 1500;

// Blinking is counted in game updates (60 per second), not rendered frames,
// so it blinks at the same rate on any monitor. The value is the length of
// one half of the cycle (on, then off). Approximate arcade rate: the Dossier
// does not list it.
export const ONE_UP_BLINK_FRAMES = 16;

// HUD text uses the 8x8 pixel font at exactly one tile per character, so
// every glyph pixel lands on one game pixel.
export const HUD_FONT_SIZE = TILE_SIZE;
export const HUD_FONT = `${HUD_FONT_SIZE}px "Press Start 2P"`;
// Arcade HUD layout, in screen tiles (row 0 is the very top of the screen).
export const HUD_LABEL_ROW = 0;
export const HUD_SCORE_ROW = 1;
export const ONE_UP_LABEL = '1UP';
export const ONE_UP_COL = 3;
export const HIGH_SCORE_LABEL = 'HIGH SCORE';
export const HIGH_SCORE_LABEL_COL = 9;
// Scores are right-aligned: the last digit always stays in the same column
// while the number grows to the left.
export const SCORE_LAST_DIGIT_COL = 6;
export const HIGH_SCORE_LAST_DIGIT_COL = 16;
// The arcade shows a zero score as "00", never as a single "0".
export const MIN_SCORE_DIGITS = 2;

// Developer tools (the FPS/UPS overlay). Off for normal play; a key to toggle
// it at runtime comes in stage 7.
export const DEBUG = false;

// The arcade resolution is tiny on modern monitors, so we enlarge it on screen.
// This is the desired scale in CSS pixels; the real scale is rounded down to a
// whole number of physical pixels so every game pixel has the same size.
export const DISPLAY_SCALE = 3;
export const MIN_PHYSICAL_SCALE = 1;

// Directions as unit steps on the grid. Frozen so a direction can safely be
// compared by identity (direction === DIRECTION.LEFT).
export const DIRECTION = Object.freeze({
  UP: Object.freeze({ x: 0, y: -1 }),
  DOWN: Object.freeze({ x: 0, y: 1 }),
  LEFT: Object.freeze({ x: -1, y: 0 }),
  RIGHT: Object.freeze({ x: 1, y: 0 }),
});

// Keyed by event.code (the physical key), so WASD also works with a Hebrew
// keyboard layout.
export const KEY_BINDINGS = Object.freeze({
  ArrowUp: DIRECTION.UP,
  ArrowDown: DIRECTION.DOWN,
  ArrowLeft: DIRECTION.LEFT,
  ArrowRight: DIRECTION.RIGHT,
  KeyW: DIRECTION.UP,
  KeyS: DIRECTION.DOWN,
  KeyA: DIRECTION.LEFT,
  KeyD: DIRECTION.RIGHT,
});

// Speeds (The Pac-Man Dossier): every speed in the game is a percentage of
// this maximum.
export const MAX_SPEED_PIXELS_PER_SECOND = 75.75757625;
export const PACMAN_SPEED_LEVEL_1 = 0.8;

// Pac-Man starts between two tiles, just below the ghost house.
export const PACMAN_START_TILE = { col: 13.5, row: 23 };
export const PACMAN_START_DIRECTION = DIRECTION.LEFT;

// How far (in tiles) Pac-Man walks off-screen in the side tunnel before he
// reappears on the other side.
export const TUNNEL_OFFSCREEN_TILES = 2;

export const PACMAN_DIAMETER = 13;
// A simple chomp: the mouth cycles closed, half open, open, half open.
// Each value is half of the mouth's opening angle.
export const CHOMP_MOUTH_HALF_ANGLES_DEGREES = [0, 25, 45, 25];
// Pixels of movement for one full open-close cycle (16 px = two tiles, so one
// chomp per two dots). Driven by distance, not time, so the mouth stops when
// Pac-Man stops.
export const CHOMP_CYCLE_PX = 2 * TILE_SIZE;

// Event names live here because a typo in a plain string ('dotEatn') fails
// silently: the event is sent, but nobody is listening to that name.
export const EVENTS = Object.freeze({
  DOT_EATEN: 'dotEaten',
  POWER_PELLET_EATEN: 'powerPelletEaten',
});

// Points (The Pac-Man Dossier).
export const DOT_POINTS = 10;
export const POWER_PELLET_POINTS = 50;

// Arcade "dot pause" (Dossier): Pac-Man stands still for this many frames
// after eating, so he is slower in corridors full of dots.
export const DOT_PAUSE_FRAMES = 1;
export const POWER_PELLET_PAUSE_FRAMES = 3;

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
  WALL: '#2121DE',
  DOT: '#FFB8AE',
  GHOST_DOOR: '#FFB8FF',
  PACMAN: '#FFFF00',
  HUD_TEXT: '#FFFFFF',
};
