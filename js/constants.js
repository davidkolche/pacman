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
// pellet always stays inside its own tile and never touches a wall. Its
// color is COLORS.PELLET.
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
// Debug only (works while debug is on): eats every remaining dot at once,
// without points, to test level completion quickly.
export const DEBUG_CLEAR_DOTS_KEY = 'KeyC';
// Debug only: shows or hides a large gallery of all the fruit drawings.
export const DEBUG_FRUIT_GALLERY_KEY = 'KeyF';
// Debug only: shows or hides a gallery of the ghost drawings, every skirt
// frame side by side plus a live row that walks, for tuning the skirt.
export const DEBUG_SPRITE_GALLERY_KEY = 'KeyG';
// Debug only: adds points, to reach the extra life quickly. O, because P
// is the pause key.
export const DEBUG_ADD_POINTS_KEY = 'KeyO';
export const DEBUG_ADD_POINTS = 1000;
// Debug labels are tiny and slightly blurry: they are for us, not the player.
export const DEBUG_LABEL_FONT = '5px monospace';
// Side of the square marking a ghost's target tile in debug mode.
export const DEBUG_TARGET_SIZE = 4;
// The logical-position dot reaches this many real screen pixels to each side
// of the point, so it stays small and sharp at every scale.
export const DEBUG_CENTER_DOT_REACH_DEVICE_PX = 2;
// Debug label next to Blinky's target while he is Cruise Elroy ("ELROY 2").
export const DEBUG_ELROY_LABEL = 'ELROY';

// The arcade resolution is tiny on modern monitors, so the screen is
// enlarged as much as the window allows: by a whole number of physical
// pixels per game pixel (every game pixel the same size, so it stays
// crisp), never below this. A small margin keeps it off the window's edges.
export const MIN_PHYSICAL_SCALE = 1;
export const WINDOW_MARGIN_CSS_PX = 8;

// Pause (only while playing) and mute (any screen but the name entry,
// where P and M are letters).
export const PAUSE_KEY = 'KeyP';
export const MUTE_KEY = 'KeyM';
export const PAUSED_TEXT = 'PAUSED';
export const PAUSE_HINT_TEXT = 'PRESS P TO CONTINUE';
// Screen rows, both centered: the middle of the 36-row screen.
export const PAUSED_ROW = 17;
export const PAUSE_HINT_ROW = 19;
// The mute icon (drawn in renderer.js) sits in the top-right corner while
// muted, in the HUD's empty columns.
export const MUTE_ICON_COL = 26;
export const MUTE_ICON_ROW = 0;

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
  // The eyes' fixed path from above the door down into the house: the
  // reverse of LEAVING_HOUSE.
  ENTERING_HOUSE: 'enteringHouse',
  // Revived in the house while frightened is still running: waits there
  // until it ends (see EATEN_GHOST_WAITS_FOR_FRIGHT_END).
  WAITING_FOR_FRIGHT_END: 'waitingForFrightEnd',
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
  [GHOST_STATE.ENTERING_HOUSE]: 'ENTR',
  [GHOST_STATE.WAITING_FOR_FRIGHT_END]: 'WAIT',
});

// The spot just above the door, between two tiles. Every ghost leaving the
// house ends here and enters the maze facing left.
export const GHOST_HOUSE_EXIT_TILE = Object.freeze({ col: 13.5, row: 11 });
export const GHOST_HOUSE_EXIT_DIRECTION = DIRECTION.LEFT;
// Where the eyes of an eaten ghost come back to life: the middle of the house.
export const GHOST_HOUSE_CENTER_TILE = Object.freeze({ col: 13.5, row: 14 });

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
// The order of this list is also the order in which they leave the house
// (Blinky, Pinky, Inky, Clyde): the first one still waiting is the one whose
// dot counter runs (ghostHouse.js).
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
    scatterTile: Object.freeze({ col: 25, row: -3 }),
  }),
  Object.freeze({
    name: GHOST_NAME.PINKY,
    color: '#FFB8FF',
    tile: Object.freeze({ col: 13.5, row: 14 }),
    direction: DIRECTION.DOWN,
    state: GHOST_STATE.IN_HOUSE,
    bobsInHouse: true,
    scatterTile: Object.freeze({ col: 2, row: -3 }),
  }),
  Object.freeze({
    name: GHOST_NAME.INKY,
    color: '#00FFFF',
    tile: Object.freeze({ col: 11.5, row: 14 }),
    direction: DIRECTION.UP,
    state: GHOST_STATE.IN_HOUSE,
    bobsInHouse: true,
    scatterTile: Object.freeze({ col: 27, row: 32 }),
  }),
  Object.freeze({
    name: GHOST_NAME.CLYDE,
    color: '#FFB852',
    tile: Object.freeze({ col: 15.5, row: 14 }),
    direction: DIRECTION.UP,
    state: GHOST_STATE.IN_HOUSE,
    bobsInHouse: true,
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

// Frightened ghosts flash white near the end, as a warning. Each color is
// shown for one interval, white first; one flash is white plus blue. How
// many flashes depends on the level (levels.js), and they are counted back
// from the end, so the flashing ends exactly when frightened does.
export const FRIGHTENED_FLASH_INTERVAL_MS = 200;
export const FRIGHTENED_ONE_FLASH_MS = 2 * FRIGHTENED_FLASH_INTERVAL_MS;

// Ghosts waiting in the house bob up and down around their start row, at
// most this many pixels each way (keeps the sprite off the house walls).
export const GHOST_HOUSE_BOB_RANGE_PX = 4;
// Speed inside the house (bobbing and leaving). Approximation: the Dossier
// does not list it.
export const GHOST_HOUSE_SPEED = 0.5;
// Global dot counter, used after a life is lost (Dossier, same in every
// level): a ghost leaves when the shared count of dots eaten since the death
// equals its value. Blinky waits in our house too, so he goes at once. When
// the count reaches Clyde's value with Clyde still inside, the global counter
// switches off and the personal counters take over again.
export const GLOBAL_DOT_LIMITS = Object.freeze({
  [GHOST_NAME.BLINKY]: 0,
  [GHOST_NAME.PINKY]: 7,
  [GHOST_NAME.INKY]: 17,
  [GHOST_NAME.CLYDE]: 32,
});

// A deliberate change from the arcade: a ghost that revives in the house
// while frightened is still running stays inside (bobbing, normal color,
// harmless) until frightened ends, and then the waiting ghosts leave one by
// one, this far apart (in start-list order). false = arcade behavior: it
// leaves at once.
export const EATEN_GHOST_WAITS_FOR_FRIGHT_END = true;
export const EATEN_GHOST_EXIT_DELAY_MS = 500;

// Eyes hurrying home. Approximation: the Dossier only says they are fast,
// so about twice a normal ghost.
export const GHOST_EATEN_SPEED = 1.5;

// Ghost sprite: a 14x14 body. The eyes are 4x5 white eyeballs (ovals) with a
// 2-pixel round pupil; GHOST_EYES gives, per direction, the top-left of the
// first eyeball inside the sprite and the pupil's top-left inside each eyeball.
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
// The skirt: one entry per animation frame, each the number of rounded feet
// along the ghost's bottom. Different counts move the notches between the
// feet from frame to frame, so the stepping is easy to see (the arcade's
// idea). Any number of frames works.
export const GHOST_SKIRT_FEET_PER_FRAME = Object.freeze([3, 4]);
// How far the notches between the feet reach up into the body, in game pixels.
export const GHOST_SKIRT_DEPTH = 3;
// While a ghost moves, its skirt moves on to the next frame this often, so it
// seems to walk. Approximation of the arcade's rate (about 8 frames).
export const GHOST_SKIRT_FRAME_MS = 130;

// How far (in tiles) Pac-Man walks off-screen in the side tunnel before he
// reappears on the other side.
export const TUNNEL_OFFSCREEN_TILES = 2;
// The side tunnel: the first and last tiles of this maze row, where ghosts
// slow down (Pac-Man does not).
export const TUNNEL_ROW = 14;
export const TUNNEL_LENGTH_TILES = 6;

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
  GHOST_EATEN: 'ghostEaten',
  PACMAN_DIED: 'pacmanDied',
  FRUIT_EATEN: 'fruitEaten',
  EXTRA_LIFE: 'extraLife',
});

// Points (The Pac-Man Dossier).
export const DOT_POINTS = 10;
export const POWER_PELLET_POINTS = 50;
// Each ghost eaten on the same power pellet is worth double the one before.
export const GHOST_EATEN_POINTS = Object.freeze([200, 400, 800, 1600]);

// Saved scores (storage.js). The version is part of the key: if the saved
// shape ever changes, a new key ("pacman.v2...") starts clean instead of
// misreading the old data.
export const SCORES_STORAGE_KEY = 'pacman.v1.scores';
// Player settings (mute), in their own key: a broken settings entry must not
// cost the scores, and the other way round.
export const SETTINGS_STORAGE_KEY = 'pacman.v1.settings';
// The best scores table. A score must beat the last entry of a full table.
export const TOP_SCORES_COUNT = 10;
// A deliberate change from the arcade's 3 letters: up to 10 characters, the
// most a 28-tile table row can hold next to the rank and a 7-digit score.
export const TOP_SCORE_NAME_MAX_LENGTH = 10;
// The characters a name may use, in the order the up/down arrows step
// through them. The blank comes last, so "up" from a blank gives "A".
export const NAME_BLANK = ' ';
export const NAME_ALPHABET = `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789${NAME_BLANK}`;

export const STARTING_LIVES = 3;
// One extra life per game, the first time the score reaches this (Dossier).
export const EXTRA_LIFE_SCORE = 10000;

// Pauses, counted in game time inside the update (approximations: the
// Dossier gives no exact values). Eating a ghost freezes everything while
// its points are shown. Dying: a freeze with everything still visible, then
// the ghosts vanish and the death animation plays, then a moment of empty maze.
export const GHOST_EATEN_FREEZE_MS = 1000;
export const DEATH_FREEZE_MS = 1000;
export const DEATH_ANIMATION_MS = 1500;
export const DEATH_AFTER_MS = 500;
// The death animation, in two parts. First Pac-Man folds away, facing up
// like the arcade: his mouth opens wider in DEATH_COLLAPSE_FRAMES steps until
// only a thin sliver is left (fixed steps keep the picture cache small).
// Then a small "pop": DEATH_POP_RAYS short rays fly out from his middle and
// shrink to nothing. DEATH_POP_SHARE is the pop's part of DEATH_ANIMATION_MS.
export const DEATH_COLLAPSE_FRAMES = 10;
export const DEATH_POP_SHARE = 0.2;
export const DEATH_POP_RAYS = 8;
// Where the rays start and end, as distances from the middle (game pixels).
export const DEATH_POP_START_RADIUS = 2;
export const DEATH_POP_END_RADIUS = 7;
// Each ray starts this long and shrinks to nothing on its way out.
export const DEATH_POP_RAY_LENGTH = 3;
export const DEATH_POP_LINE_WIDTH = 1;
// Level complete: a freeze with everything visible, then the ghosts vanish
// and the maze walls flash white and blue this many times (white first),
// each color shown for one interval (approximations).
export const LEVEL_COMPLETE_FREEZE_MS = 1000;
export const MAZE_FLASH_COUNT = 4;
export const MAZE_FLASH_INTERVAL_MS = 250;

// Arcade "dot pause" (Dossier): Pac-Man stands still for this many frames
// after eating, so he is slower in corridors full of dots.
export const DOT_PAUSE_FRAMES = 1;
export const POWER_PELLET_PAUSE_FRAMES = 3;

// The game as a whole is always in exactly one of these states (game.js).
// Frozen for the same reason as GHOST_STATE.
export const GAME_STATE = Object.freeze({
  START: 'start',
  READY: 'ready',
  PLAYING: 'playing',
  DYING: 'dying',
  LEVEL_COMPLETE: 'levelComplete',
  GAME_OVER: 'gameOver',
  NAME_ENTRY: 'nameEntry',
});

// Who receives the keys (input.js). In NAME every key belongs to the name
// entry, so a letter like D or C never moves Pac-Man or fires a debug key.
export const INPUT_MODE = Object.freeze({
  GAME: 'game',
  NAME: 'name',
});
// What a key does while a name is entered (besides typing a character).
export const NAME_ACTION = Object.freeze({
  TYPE: 'type',
  DELETE: 'delete',
  LETTER_UP: 'letterUp',
  LETTER_DOWN: 'letterDown',
  CURSOR_LEFT: 'cursorLeft',
  CURSOR_RIGHT: 'cursorRight',
  CONFIRM: 'confirm',
});
// Keyed by event.code, like KEY_BINDINGS. Only the arrows: WASD types letters here.
export const NAME_ENTRY_KEYS = Object.freeze({
  ArrowUp: NAME_ACTION.LETTER_UP,
  ArrowDown: NAME_ACTION.LETTER_DOWN,
  ArrowLeft: NAME_ACTION.CURSOR_LEFT,
  ArrowRight: NAME_ACTION.CURSOR_RIGHT,
  Backspace: NAME_ACTION.DELETE,
  Enter: NAME_ACTION.CONFIRM,
  NumpadEnter: NAME_ACTION.CONFIRM,
});
// Typed characters come from the physical key (event.code, e.g. "KeyD",
// "Digit7", "Numpad7", "Space"), so a Hebrew layout still types Latin letters.
export const LETTER_KEY_PREFIX = 'Key';
export const DIGIT_KEY_PREFIXES = Object.freeze(['Digit', 'Numpad']);
export const SPACE_KEY = 'Space';

// The game begins at this level. Changing it for a moment is the quickest
// way to try a later level by hand; keep it at 1 for normal play.
export const START_LEVEL = 1;
// Starts a new game from the START (attract) screen.
export const START_KEY = 'Enter';

// Short messages ("READY!") sit in the empty maze row just below the ghost
// house, centered on the maze, like the arcade.
export const MESSAGE_ROW = 17;
export const MESSAGE_CENTER_COL = MAZE_COLUMNS / 2;
export const READY_TEXT = 'READY!';
// A deliberate change from the arcade: the level number is shown. In READY
// it takes the message row, so "READY!" moves one row down, onto the wall
// block below; a black box behind it keeps the wall line from showing
// through the letters.
export const LEVEL_LABEL = 'LEVEL';
export const LEVEL_INTRO_ROW = MESSAGE_ROW;
export const READY_ROW = MESSAGE_ROW + 1;
// The permanent "LEVEL n" sits in the middle of the bottom HUD, between the
// lives (left) and the level fruits (right).
export const HUD_LEVEL_CENTER_COL = SCREEN_COLUMNS / 2;
export const GAME_OVER_TEXT = 'GAME OVER';
// GAME OVER stays this long, then comes the name entry (for a top score) or
// the attract screen, by itself.
export const GAME_OVER_SCREEN_MS = 3000;

// The name entry screen (NAME_ENTRY), in screen tiles, every line centered.
// The name has one slot per character; empty slots show a mark, and the
// slot under the cursor blinks.
export const NAME_ENTRY_TITLE = `YOU MADE THE TOP ${TOP_SCORES_COUNT}!`;
export const NAME_ENTRY_TITLE_ROW = 7;
export const NAME_ENTRY_SCORE_LABEL = 'SCORE';
export const NAME_ENTRY_SCORE_ROW = 10;
export const NAME_ENTRY_PROMPT = 'ENTER YOUR NAME';
export const NAME_ENTRY_PROMPT_ROW = 14;
export const NAME_ENTRY_NAME_ROW = 17;
export const NAME_ENTRY_EMPTY_SLOT = '_';
export const NAME_ENTRY_CURSOR_BLINK_MS = 250;
export const NAME_ENTRY_HELP_LINES = Object.freeze([
  'TYPE OR USE ARROWS',
  'BACKSPACE DELETES',
  'ENTER CONFIRMS',
]);
export const NAME_ENTRY_FIRST_HELP_ROW = 22;
export const NAME_ENTRY_HELP_ROW_SPACING = 2;

// The attract screen's title (title.js, pictures in titleArt.js): our own
// design, not the official logo. "PAC-MAN" in the HUD font at twice its
// size, yellow-to-orange letters with a blue outline in the maze wall color
// and a 3D block behind them; our Pac-Man chomps in place of the dash, a
// ghost peeks over the last letter and follows the chase with its eyes, and
// a shine sweeps across the letters now and then. Under it, a lane where
// Pac-Man runs left along a row of dots with the four ghosts behind him,
// eats the power pellet at the end, and chases the blue ghosts back out.
// It all fills the rows from TITLE_FIRST_ROW up to, not including,
// TITLE_END_ROW (title.js asserts that it fits); both attract phases start
// under it. Sizes are game pixels, speeds game pixels per second.
export const TITLE_TEXT = 'PAC-MAN';
export const TITLE_FONT_SIZE = 2 * TILE_SIZE;
export const TITLE_FONT = `${TITLE_FONT_SIZE}px "Press Start 2P"`;
export const TITLE_FIRST_ROW = 2;
export const TITLE_END_ROW = 9;
// The outline's full width (half of it lies outside the letters).
export const TITLE_OUTLINE_WIDTH = 2;
// How far the 3D block reaches back (down and right), built from copies of
// the letters this far apart, darker the further back.
export const TITLE_EXTRUDE_DEPTH = 4;
export const TITLE_EXTRUDE_STEP = 0.5;
// The ghost that peeks over the last letter: how much of it shows above the
// letters and how far right of the letter's middle it stands.
export const TITLE_PEEK_GHOST = GHOST_NAME.INKY;
export const TITLE_PEEK_RISE = 9;
export const TITLE_PEEK_SHIFT = 3;
// The shine: one sweep across the letters every PERIOD, taking SWEEP, as a
// slanted band this wide.
export const TITLE_SHINE_PERIOD_MS = 4000;
export const TITLE_SHINE_SWEEP_MS = 800;
export const TITLE_SHINE_WIDTH = 12;
// The chase lane. Pac-Man starts this far off the right edge and runs left
// to the power pellet in TITLE_CHASE_PELLET_COL; the first ghost starts
// FIRST_GAP behind him, the others SPACING apart, a little faster than him
// (title.js asserts they never catch him). After the pellet everybody turns
// around: the blue ghosts flee right faster than Pac-Man follows. When he is
// off the right edge again, the lane stays empty for PAUSE, then it repeats.
// Pac-Man's mouth chomps by distance like in the game; the dash Pac-Man in
// the title chomps as if running at the same speed.
export const TITLE_CHASE_PACMAN_SPEED = 40;
export const TITLE_CHASE_GHOST_SPEED = 44;
export const TITLE_CHASE_FLEE_SPEED = 52;
export const TITLE_CHASE_OFFSCREEN = 2 * TILE_SIZE;
export const TITLE_CHASE_FIRST_GAP = 40;
export const TITLE_CHASE_GHOST_SPACING = 18;
export const TITLE_CHASE_PELLET_COL = 2;
export const TITLE_CHASE_PAUSE_MS = 1500;

// The arcade "marquee": a lit sign above the canvas, in HTML and CSS
// (marquee.js, css/style.css), in the same style as the attract-screen
// title. It is shown only when it costs the game nothing: if reserving its
// height plus the gap would drop the canvas to a smaller whole-number
// scale, it hides and the game gets the full height (main.js). CSS pixels.
// The look (colors, frame, glow, bulb size) is in CSS variables on
// #marquee; the sizes JS needs for layout are here and passed to CSS.
export const MARQUEE_HEIGHT_CSS_PX = 60;
export const MARQUEE_GAP_CSS_PX = 6;
export const MARQUEE_LETTER_SIZE_CSS_PX = 24;
// The chrome frame's width; the bulbs sit on its middle line, one about
// every BULB_SPACING CSS pixels around the sign.
export const MARQUEE_FRAME_CSS_PX = 8;
export const MARQUEE_BULB_SPACING_CSS_PX = 14;
// Copies of our own cached sprites: Pac-Man in the dash's place (mouth open
// this wide), and ghosts peeking in at the left and right edges.
export const MARQUEE_PACMAN_MOUTH_DEGREES = 40;
export const MARQUEE_PEEK_GHOSTS = Object.freeze({ left: GHOST_NAME.BLINKY, right: GHOST_NAME.CLYDE });
// How the peeking ghosts look: their own colors, or frightened like the
// ghosts in the maze (blue, flashing white near the end).
export const MARQUEE_GHOST_LOOK = Object.freeze({
  NORMAL: 'normal',
  FRIGHTENED: 'frightened',
  FLASH: 'flash',
});

// The top scores table on the attract screen. Rank and score are right-
// aligned against the left edge of their END_COL: "10." in cols 3-5, a
// 7-digit score in cols 7-13; the name starts at NAME_COL (10 characters,
// cols 16-25), leaving 2 empty columns on the right. Rows start under the
// title, and the last row (10th) ends above the prompt (checked in ui.js).
export const TOP_SCORES_TITLE = `TOP ${TOP_SCORES_COUNT} SCORES`;
export const TOP_SCORES_TITLE_ROW = TITLE_END_ROW;
export const TOP_SCORES_COLUMN_LABELS = Object.freeze({ rank: 'RANK', score: 'SCORE', name: 'NAME' });
export const TOP_SCORES_LABEL_ROW = TOP_SCORES_TITLE_ROW + 3;
export const TOP_SCORES_FIRST_ROW = TOP_SCORES_TITLE_ROW + 5;
export const TOP_SCORES_ROW_SPACING = 2;
export const TOP_SCORES_RANK_END_COL = 6;
export const TOP_SCORES_SCORE_END_COL = 14;
export const TOP_SCORES_NAME_COL = 16;
export const TOP_SCORES_RANK_SUFFIX = '.';
// Room kept for the score column (the arcade's best possible score,
// 3,333,360, has 7 digits; checked in ui.js).
export const TOP_SCORES_SCORE_DIGITS = 7;
export const TOP_SCORES_EMPTY_TEXT = 'NO SCORES YET';
export const TOP_SCORES_EMPTY_ROW = TOP_SCORES_TITLE_ROW + 10;

// The attract screen (the START state), arcade style: a header, then the
// ghosts one by one, then the points table and the prompt, all under the
// title. Positions are screen tiles (row 0 is the top of the screen), not
// maze tiles.

export const ATTRACT_HEADER_TEXT = 'CHARACTER / NICKNAME';
export const ATTRACT_HEADER_ROW = TITLE_END_ROW;
export const ATTRACT_HEADER_COL = 7;
// A deliberate change from the arcade: our own names on the attract screen.
// Display text only, keyed by the internal ids, which stay Blinky, Pinky,
// Inky and Clyde everywhere in the code. The order and colors come from
// GHOST_STARTS, so they are set in one place.
export const GHOST_DISPLAY_NAMES = Object.freeze({
  [GHOST_NAME.BLINKY]: Object.freeze({ character: 'NAFTALI', nickname: 'BENNET' }),
  [GHOST_NAME.PINKY]: Object.freeze({ character: 'MANSOR', nickname: 'ABBAS' }),
  [GHOST_NAME.INKY]: Object.freeze({ character: 'AVIGDOR', nickname: 'LIBERMAN' }),
  [GHOST_NAME.CLYDE]: Object.freeze({ character: 'YAIR', nickname: 'GOLAN' }),
});
// Each line reads: -CHARACTER    "NICKNAME".
export const ATTRACT_CHARACTER_PREFIX = '-';
export const ATTRACT_NICKNAME_QUOTE = '"';
export const ATTRACT_FIRST_GHOST_ROW = ATTRACT_HEADER_ROW + 3;
export const ATTRACT_GHOST_ROW_SPACING = 3;
// The ghost picture is centered on this column's left edge (cols 4-5).
export const ATTRACT_GHOST_ICON_COL = 5;
// The longest line: "-AVIGDOR" in cols 7-14, "\"LIBERMAN\"" in cols 17-26,
// ending in the same column as the header (checked in ui.js).
export const ATTRACT_CHARACTER_COL = 7;
export const ATTRACT_NICKNAME_COL = 17;
// Points table: the dot or pellet in one tile, its points two tiles right.
export const ATTRACT_DOT_ROW = ATTRACT_HEADER_ROW + 18;
export const ATTRACT_PELLET_ROW = ATTRACT_DOT_ROW + 2;
export const ATTRACT_POINTS_ICON_COL = 10;
export const ATTRACT_POINTS_TEXT_COL = 12;
export const PTS_LABEL = 'PTS';
export const PRESS_START_TEXT = 'PRESS ENTER TO START';
// The attract screen has no bottom HUD, so the prompt can use row 34.
export const ATTRACT_PROMPT_ROW = 34;
// Ghost n (0..3, GHOST_STARTS order) appears at (n + 1) delays; the points table and the prompt
// one more delay after the last ghost. Enter works at any moment.
export const ATTRACT_GHOST_DELAY_MS = 1000;
export const ATTRACT_POINTS_DELAY_MS = 1000;
// Half of the prompt's blink cycle (on, then off).
export const ATTRACT_PROMPT_BLINK_MS = 400;
// The attract screen alternates: the characters (the whole reveal, then a
// pause), then the top scores table, and again. Right after a name was
// entered it starts with the table, so the player sees the new entry.
export const ATTRACT_CHARACTERS_PHASE_MS = 10000;
export const ATTRACT_TOP_SCORES_PHASE_MS = 8000;

// Lives in reserve (not the one being played, like the arcade): small
// Pac-Man icons in the bottom HUD rows, one every two tiles.
export const LIVES_ROW = SCREEN_ROWS - HUD_BOTTOM_ROWS;
export const LIVES_FIRST_COL = 2;
export const LIVES_ICON_SPACING_TILES = 2;

// Bonus fruit names (Dossier); which fruit and its points come per level from
// levels.js. Frozen like GHOST_NAME, so a typo gives undefined.
export const FRUIT = Object.freeze({
  CHERRIES: 'cherries',
  STRAWBERRY: 'strawberry',
  PEACH: 'peach',
  APPLE: 'apple',
  GRAPES: 'grapes',
  GALAXIAN: 'galaxian',
  BELL: 'bell',
  KEY: 'key',
});

// The bonus fruit appears in the empty row under the ghost house, centered
// between two tiles (the arcade's spot), after this many dots and power
// pellets eaten in the level. The count belongs to the level: a death does
// not reset it.
export const FRUIT_TILE = Object.freeze({ col: 13.5, row: 17 });
export const FRUIT_APPEAR_DOTS = Object.freeze([70, 170]);
// It stays for a random time in this range (Dossier: 9 to 10 seconds).
export const FRUIT_MIN_SHOW_MS = 9000;
export const FRUIT_MAX_SHOW_MS = 10000;
// After it is eaten, its points stay on its spot this long (approximation).
export const FRUIT_POINTS_SHOW_MS = 2000;

// The fruit drawings (fruitArt.js, a deliberate change from the arcade's
// pixel art): smooth canvas paths at full device resolution, 16x16 game
// pixels (two by two tiles, like the arcade's sprites). PEACH is drawn as the
// arcade's orange-colored fruit, GRAPES as a melon, and GALAXIAN as a
// spaceship of our own design. Every round part shares the same lighting:
// light, then body, then shade, from the top left to the bottom right.
export const FRUIT_ART_SIZE = 2 * TILE_SIZE;
export const FRUIT_ART_COLORS = Object.freeze({
  [FRUIT.CHERRIES]: Object.freeze({
    light: '#FF7A7A',
    body: '#E8101E',
    shade: '#8C0010',
    outline: '#4A0008',
    highlight: '#FFFFFF',
    stem: '#8A5A2B',
    leaf: '#3FB83F',
    leafVein: '#1E6E1E',
  }),
  [FRUIT.STRAWBERRY]: Object.freeze({
    light: '#FF8080',
    body: '#F01830',
    shade: '#900018',
    outline: '#4A0008',
    highlight: '#FFFFFF',
    seed: '#FFE680',
    seedShade: '#B89A2E',
    leaf: '#3FB83F',
    leafVein: '#1E6E1E',
  }),
  [FRUIT.PEACH]: Object.freeze({
    light: '#FFD98A',
    body: '#FF9A1F',
    shade: '#B85A00',
    outline: '#5A2C00',
    highlight: '#FFFFFF',
    dimple: '#C86A00',
    stem: '#6B4A22',
    leaf: '#3FB83F',
    leafVein: '#1E6E1E',
  }),
  [FRUIT.APPLE]: Object.freeze({
    light: '#FF8A8A',
    body: '#D8101E',
    shade: '#7A0010',
    outline: '#3E0008',
    highlight: '#FFFFFF',
    stem: '#6B4A22',
    leaf: '#3FB83F',
    leafVein: '#1E6E1E',
  }),
  [FRUIT.GRAPES]: Object.freeze({
    light: '#C8F58A',
    body: '#4CB82E',
    shade: '#1E6614',
    outline: '#0E3A0A',
    highlight: '#FFFFFF',
    stripe: '#1E6614',
    stem: '#6B4A22',
  }),
  [FRUIT.GALAXIAN]: Object.freeze({
    light: '#FFFFFF',
    body: '#FFE14A',
    shade: '#B88A00',
    outline: '#3A2A00',
    highlight: '#FFFFFF',
    wingLight: '#7FB2FF',
    wing: '#2E6BFF',
    wingShade: '#12308A',
    cockpitLight: '#FFB0B0',
    cockpit: '#E8101E',
    cockpitShade: '#7A0010',
    flame: '#FF9A1F',
    flameCore: '#FFF3A0',
  }),
  [FRUIT.BELL]: Object.freeze({
    light: '#FFF9C0',
    body: '#FFD800',
    shade: '#A87A00',
    outline: '#4A3600',
    highlight: '#FFFFFF',
    clapperLight: '#C8F0FF',
    clapper: '#40B8F0',
    clapperShade: '#1A5A8A',
  }),
  [FRUIT.KEY]: Object.freeze({
    light: '#C8F6FF',
    body: '#22C4F0',
    shade: '#006B8A',
    outline: '#00303E',
    highlight: '#FFFFFF',
    bladeLight: '#FFFFFF',
    blade: '#C8C8D4',
    bladeShade: '#6E6E80',
  }),
});
// Thickness of the dark outline around each fruit, in game pixels.
export const FRUIT_OUTLINE_WIDTH = 0.6;

// Debug galleries (F fruits, G ghosts): a dark framed panel in the middle of
// the screen, with this gap around every cell and a label line above or
// under each picture. Colors: COLORS.DEBUG_GALLERY_*, frame in COLORS.WALL.
export const DEBUG_GALLERY_GAP = 4;
export const DEBUG_GALLERY_LABEL_HEIGHT = 8;
// The fruit gallery: every fruit, this many times larger, in a grid.
export const FRUIT_GALLERY_ZOOM = 3;
export const FRUIT_GALLERY_COLUMNS = 4;
// The ghost gallery: ghosts are enlarged less than the fruits, so six fit
// across the screen.
export const SPRITE_GALLERY_ZOOM = 2;

// The level fruits in the bottom HUD, drawn from the right edge leftward,
// one every two tiles (the oldest on the right, like the arcade). The right
// edge mirrors the lives' left margin. Measured: with "LEVEL n" centered at
// column 14 (up to "LEVEL 99" = columns 10-18), columns 18-26 hold 4 icons.
export const FRUIT_HUD_SLOTS = 4;
export const FRUIT_HUD_RIGHT_COL = SCREEN_COLUMNS - LIVES_FIRST_COL;
export const FRUIT_HUD_SPACING_TILES = 2;

// Timing
export const MS_PER_SECOND = 1000;
export const TARGET_UPDATES_PER_SECOND = 60;
export const FIXED_TIMESTEP_MS = MS_PER_SECOND / TARGET_UPDATES_PER_SECOND;
// A gap between two frames longer than this is a stall, not a slow frame
// (hidden tab, debugger, sleep): its time is dropped, with no catch-up
// updates at all. Shorter gaps are caught up, at most this much at once,
// which also stops the "spiral of death" on a slow computer.
export const MAX_FRAME_TIME_MS = 250;
export const FPS_SAMPLE_INTERVAL_MS = 1000;

// Colors
export const COLORS = {
  BACKGROUND: '#000000',
  WALL: '#2121DE',
  WALL_FLASH: '#FFFFFF',
  DOT: '#FFB8AE',
  PELLET: '#00FF00',
  GHOST_DOOR: '#FFB8FF',
  PACMAN: '#FFFF00',
  HUD_TEXT: '#FFFFFF',
  READY_TEXT: '#FFFF00',
  LEVEL_INTRO_TEXT: '#00FFFF',
  START_TEXT: '#FFFFFF',
  ATTRACT_TEXT: '#FFFFFF',
  TOP_SCORES_TITLE: '#FFFF00',
  TOP_SCORES_LABELS: '#00FFFF',
  TOP_SCORES_ROW: '#FFFFFF',
  NAME_ENTRY_TITLE: '#FFFF00',
  NAME_ENTRY_TEXT: '#FFFFFF',
  NAME_ENTRY_NAME: '#FFB852',
  NAME_ENTRY_HELP: '#00FFFF',
  // Over the whole screen while paused: the game stays visible, dimmed.
  PAUSE_DIM: 'rgba(0, 0, 0, 0.6)',
  PAUSED_TEXT: '#FFFF00',
  PAUSE_HINT_TEXT: '#FFFFFF',
  MUTE_ICON: '#FFFFFF',
  GAME_OVER_TEXT: '#FF0000',
  GHOST_POINTS: '#00FFFF',
  FRUIT_POINTS: '#FFB8FF',
  GHOST_EYE_WHITE: '#FFFFFF',
  GHOST_PUPIL: '#2121FF',
  // A frightened ghost has its own face (small eyes and a wavy mouth); the
  // flash swaps both colors at once.
  GHOST_FRIGHTENED: '#2121FF',
  GHOST_FRIGHTENED_FACE: '#FFB8AE',
  GHOST_FLASH: '#FFFFFF',
  GHOST_FLASH_FACE: '#FF0000',
  // Shading laid over Pac-Man's and the ghosts' plain colors (sprites.js):
  // see-through, so one set works for every character color.
  SPRITE_LIGHT: 'rgba(255, 255, 255, 0.45)',
  SPRITE_PLAIN: 'rgba(255, 255, 255, 0)',
  SPRITE_SHADE: 'rgba(0, 0, 0, 0.3)',
  DEBUG_NO_UP_TILE: '#FFFFFF',
  // Attract-screen title: the letters' gradient (top to bottom), the 3D
  // block behind them from its front edge to its back, and the shine band
  // (its middle, and its see-through edges).
  TITLE_LIGHT: '#FFF7B0',
  TITLE_BODY: '#FFE000',
  TITLE_SHADE: '#FF8C1A',
  TITLE_EXTRUDE_NEAR: '#C05A00',
  TITLE_EXTRUDE_FAR: '#3A1400',
  TITLE_SHINE: 'rgba(255, 255, 255, 0.8)',
  TITLE_SHINE_CLEAR: 'rgba(255, 255, 255, 0)',
  // Debug galleries: a see-through dark panel, so the game shows faintly behind.
  DEBUG_GALLERY_BACKGROUND: 'rgba(0, 0, 0, 0.85)',
  DEBUG_GALLERY_LABEL: '#FFFFFF',
  // Debug: a character's logical position and the box its picture fills.
  DEBUG_SPRITE_CENTER: '#FFFFFF',
  DEBUG_SPRITE_BOX: '#FF00FF',
};
