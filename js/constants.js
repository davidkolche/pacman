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

// Developer tools (the FPS/UPS overlay and ghost state labels). Off for normal
// play; the toggle key switches them at runtime. Backquote (`) because D
// already moves Pac-Man right (WASD).
export const DEBUG_ENABLED_AT_START = false;
export const DEBUG_TOGGLE_KEY = 'Backquote';
// Debug labels are tiny and slightly blurry: they are for us, not the player.
export const DEBUG_LABEL_FONT = '5px monospace';
// Side of the square marking a ghost's target tile in debug mode.
export const DEBUG_TARGET_SIZE = 4;

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
// "Not moving anywhere yet." Kept outside DIRECTION so code that loops over
// the four real directions (like a ghost choosing a turn) never picks it.
export const DIRECTION_NONE = Object.freeze({ x: 0, y: 0 });

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

// Pac-Man starts between two tiles, just below the ghost house, standing
// still until the player presses a direction (a deliberate change: the
// arcade starts him moving left).
export const PACMAN_START_TILE = { col: 13.5, row: 23 };
export const PACMAN_START_DIRECTION = DIRECTION_NONE;

// Every ghost is always in exactly one of these states. Frozen, like
// DIRECTION, so states are compared by name (ghost.state === GHOST_STATE.CHASE)
// and a typo gives undefined instead of a silently new state.
export const GHOST_STATE = Object.freeze({
  IN_HOUSE: 'inHouse',
  LEAVING_HOUSE: 'leavingHouse',
  SCATTER: 'scatter',
  CHASE: 'chase',
  FRIGHTENED: 'frightened',
  EATEN: 'eaten',
});

// Short names for the debug labels: the three ghosts in the house are close
// together, and full names would overlap.
export const GHOST_STATE_LABELS = Object.freeze({
  [GHOST_STATE.IN_HOUSE]: 'HOME',
  [GHOST_STATE.LEAVING_HOUSE]: 'EXIT',
  [GHOST_STATE.SCATTER]: 'SCAT',
  [GHOST_STATE.CHASE]: 'CHAS',
  [GHOST_STATE.FRIGHTENED]: 'FRIT',
  [GHOST_STATE.EATEN]: 'EATN',
});

// The spot just above the door, between two tiles. Every ghost leaving the
// house ends here and enters the maze facing left.
export const GHOST_HOUSE_EXIT_TILE = Object.freeze({ col: 13.5, row: 11 });
export const GHOST_HOUSE_EXIT_DIRECTION = DIRECTION.LEFT;

// Ghost names drive their personalities (each has its own chase target), so
// they are compared through these constants: a typo gives undefined instead
// of a ghost that silently never matches.
export const GHOST_NAME = Object.freeze({
  BLINKY: 'Blinky',
  PINKY: 'Pinky',
  INKY: 'Inky',
  CLYDE: 'Clyde',
});

// Start positions. All four ghosts start in the house (a deliberate change:
// the arcade starts Blinky outside). The house is only 49x25 pixels inside,
// too small for four 14x14 ghosts, so Blinky waits in the doorway, in the
// door's column, without bobbing. Row 11.75 is the lowest spot where he does
// not touch Pinky at the top of her bob. Inky, Pinky and Clyde keep their
// arcade spots, Pinky looking down and Inky and Clyde looking up.
// releaseAfterMs: time in the house (counted from the first key press)
// before leaving, so they come out one by one: Blinky, Pinky, Inky, Clyde.
// A simple stand-in for the arcade dot counters.
// scatterTile: each ghost's home corner (Dossier). Two lie above the maze
// and two below it, outside any reachable tile, so a ghost heading there
// circles the block of walls nearest that corner.
export const GHOST_STARTS = Object.freeze([
  Object.freeze({
    name: GHOST_NAME.BLINKY,
    color: '#FF0000',
    tile: Object.freeze({ col: 13.5, row: 11.75 }),
    direction: DIRECTION.LEFT,
    state: GHOST_STATE.IN_HOUSE,
    bobsInHouse: false,
    releaseAfterMs: 0,
    scatterTile: Object.freeze({ col: 25, row: -3 }),
  }),
  Object.freeze({
    name: GHOST_NAME.PINKY,
    color: '#FFB8FF',
    tile: Object.freeze({ col: 13.5, row: 14 }),
    direction: DIRECTION.DOWN,
    state: GHOST_STATE.IN_HOUSE,
    bobsInHouse: true,
    releaseAfterMs: 2000,
    scatterTile: Object.freeze({ col: 2, row: -3 }),
  }),
  Object.freeze({
    name: GHOST_NAME.INKY,
    color: '#00FFFF',
    tile: Object.freeze({ col: 11.5, row: 14 }),
    direction: DIRECTION.UP,
    state: GHOST_STATE.IN_HOUSE,
    bobsInHouse: true,
    releaseAfterMs: 4000,
    scatterTile: Object.freeze({ col: 27, row: 32 }),
  }),
  Object.freeze({
    name: GHOST_NAME.CLYDE,
    color: '#FFB852',
    tile: Object.freeze({ col: 15.5, row: 14 }),
    direction: DIRECTION.UP,
    state: GHOST_STATE.IN_HOUSE,
    bobsInHouse: true,
    releaseAfterMs: 6000,
    scatterTile: Object.freeze({ col: 0, row: 32 }),
  }),
]);

// Ghost targeting (The Pac-Man Dossier). At an intersection a ghost takes
// the open direction whose next tile is closest to its target; on a tie the
// first one in this order wins.
export const GHOST_DIRECTION_PRIORITY = Object.freeze([
  DIRECTION.UP,
  DIRECTION.LEFT,
  DIRECTION.DOWN,
  DIRECTION.RIGHT,
]);
// Above and below the ghost house: here ghosts may not turn up (unless
// frightened), which is why some routes are safer for the player.
export const NO_UP_TURN_TILES = Object.freeze([
  Object.freeze({ col: 12, row: 11 }),
  Object.freeze({ col: 15, row: 11 }),
  Object.freeze({ col: 12, row: 23 }),
  Object.freeze({ col: 15, row: 23 }),
]);
// How far ahead of Pac-Man Pinky aims, and the point Inky's vector goes through.
export const PINKY_TILES_AHEAD = 4;
export const INKY_TILES_AHEAD = 2;
// Closer than this (in tiles), Clyde gives up and heads for his corner.
export const CLYDE_SHY_DISTANCE_TILES = 8;

// Level 1 scatter/chase waves (Dossier), counted from the first key press.
// The last chase never ends. Moves to levels.js in stage 8.
export const GHOST_MODE_SCHEDULE_LEVEL_1 = Object.freeze([
  Object.freeze({ mode: GHOST_STATE.SCATTER, durationMs: 7000 }),
  Object.freeze({ mode: GHOST_STATE.CHASE, durationMs: 20000 }),
  Object.freeze({ mode: GHOST_STATE.SCATTER, durationMs: 7000 }),
  Object.freeze({ mode: GHOST_STATE.CHASE, durationMs: 20000 }),
  Object.freeze({ mode: GHOST_STATE.SCATTER, durationMs: 5000 }),
  Object.freeze({ mode: GHOST_STATE.CHASE, durationMs: 20000 }),
  Object.freeze({ mode: GHOST_STATE.SCATTER, durationMs: 5000 }),
  Object.freeze({ mode: GHOST_STATE.CHASE, durationMs: Infinity }),
]);
// Temporary: the real frightened time depends on the level (stage 8).
export const FRIGHTENED_DURATION_MS = 6000;
// Frightened ghosts flash white near the end, as a warning. Counted back
// from the end (not forward from the start), so it stays right for any
// frightened duration. Each color is shown for one interval; white first.
export const FRIGHTENED_FLASH_TIME_MS = 2000;
export const FRIGHTENED_FLASH_INTERVAL_MS = 200;

// Ghost speed in the maze (Dossier, level 1). Moves to levels.js in stage 8.
export const GHOST_SPEED_LEVEL_1 = 0.75;
export const GHOST_FRIGHTENED_SPEED_LEVEL_1 = 0.5;

// Ghosts waiting in the house bob up and down around their start row, at
// most this many pixels each way (keeps the sprite off the house walls).
export const GHOST_HOUSE_BOB_RANGE_PX = 4;
// Speed inside the house (bobbing and leaving). Approximation: the Dossier
// does not list it.
export const GHOST_HOUSE_SPEED = 0.5;

// Ghost sprite: a 14x14 body. The eyes are 4x5 white eyeballs with a 2x2
// pupil; GHOST_EYES gives, per direction, the top-left of the first eyeball
// inside the sprite and the pupil's top-left inside each eyeball.
export const GHOST_SIZE = 14;
export const GHOST_EYE_WIDTH = 4;
export const GHOST_EYE_HEIGHT = 5;
export const GHOST_PUPIL_SIZE = 2;
// Horizontal distance from the first eyeball's left edge to the second's.
export const GHOST_EYE_SPACING = 6;
export const GHOST_EYES = Object.freeze({
  LEFT: Object.freeze({ eyeCol: 1, eyeRow: 3, pupilCol: 0, pupilRow: 2 }),
  RIGHT: Object.freeze({ eyeCol: 3, eyeRow: 3, pupilCol: 2, pupilRow: 2 }),
  UP: Object.freeze({ eyeCol: 2, eyeRow: 2, pupilCol: 1, pupilRow: 0 }),
  DOWN: Object.freeze({ eyeCol: 2, eyeRow: 4, pupilCol: 1, pupilRow: 3 }),
});

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
  GHOST_EYE_WHITE: '#FFFFFF',
  GHOST_PUPIL: '#2121FF',
  // A frightened ghost has its own face (small eyes and a wavy mouth); the
  // flash swaps both colors at once.
  GHOST_FRIGHTENED: '#2121FF',
  GHOST_FRIGHTENED_FACE: '#FFB8AE',
  GHOST_FLASH: '#FFFFFF',
  GHOST_FLASH_FACE: '#FF0000',
  DEBUG_NO_UP_TILE: '#FFFFFF',
};
