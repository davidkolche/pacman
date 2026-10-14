import {
  GHOST_STATE,
  GHOST_NAME,
  FRUIT,
  MS_PER_SECOND,
  TARGET_UPDATES_PER_SECOND,
} from './constants.js';

// Everything here changes with the level number (The Pac-Man Dossier,
// Table A.1 and the scatter/chase table). Values that never change live in
// constants.js. Each table is a list of rows; a row holds from its
// `fromLevel` until the next row starts, and the last row repeats forever.
// The Dossier groups each kind of value differently, so there are three
// tables instead of one wide one. Times are in seconds, as in the Dossier,
// so every row can be compared with it line by line.

// Fractions of MAX_SPEED_PIXELS_PER_SECOND. The *Dots columns are reference
// values only: the Dossier's "~71%" is what the dot pause (1 frame per dot)
// does to the normal speed, so applying them as well would slow Pac-Man
// down twice. null: from level 21 ghosts never turn blue, so there is no
// frightened speed.
const SPEED_ROWS = [
  {
    fromLevel: 1,
    speeds: {
      pacman: 0.8, pacmanDots: 0.71, pacmanFright: 0.9, pacmanFrightDots: 0.79,
      ghost: 0.75, ghostTunnel: 0.4, ghostFright: 0.5,
    },
  },
  {
    fromLevel: 2,
    speeds: {
      pacman: 0.9, pacmanDots: 0.79, pacmanFright: 0.95, pacmanFrightDots: 0.83,
      ghost: 0.85, ghostTunnel: 0.45, ghostFright: 0.55,
    },
  },
  {
    fromLevel: 5,
    speeds: {
      pacman: 1, pacmanDots: 0.87, pacmanFright: 1, pacmanFrightDots: 0.87,
      ghost: 0.95, ghostTunnel: 0.5, ghostFright: 0.6,
    },
  },
  {
    fromLevel: 21,
    speeds: {
      pacman: 0.9, pacmanDots: 0.79, pacmanFright: null, pacmanFrightDots: null,
      ghost: 0.95, ghostTunnel: 0.5, ghostFright: null,
    },
  },
];

// One game frame: in levels 2+ the last scatter lasts a single frame, so
// the ghosts only turn around twice and go straight back to chasing.
const ONE_FRAME_SECONDS = 1 / TARGET_UPDATES_PER_SECOND;

// Scatter/chase waves, counted from the first key press; frightened pauses
// them. The last chase never ends.
const MODE_SCHEDULE_ROWS = [
  { fromLevel: 1, scatterChaseSeconds: [7, 20, 7, 20, 5, 20, 5, Infinity] },
  { fromLevel: 2, scatterChaseSeconds: [7, 20, 7, 20, 5, 1033, ONE_FRAME_SECONDS, Infinity] },
  { fromLevel: 5, scatterChaseSeconds: [5, 20, 5, 20, 5, 1037, ONE_FRAME_SECONDS, Infinity] },
];

// frightSeconds 0: a power pellet only makes the ghosts turn around; they
// never turn blue (and then frightFlashes is 0 as well).
// Levels 1-4 are longer than the Dossier (8/6/5/4 s instead of 6/5/4/3), a
// deliberate change for a gentler start; from level 5 on, the original.
// fruit is stored for stage 9.
const LEVEL_ROWS = [
  { fromLevel: 1, frightSeconds: 8, frightFlashes: 5, fruit: FRUIT.CHERRIES, fruitPoints: 100 },
  { fromLevel: 2, frightSeconds: 6, frightFlashes: 5, fruit: FRUIT.STRAWBERRY, fruitPoints: 300 },
  { fromLevel: 3, frightSeconds: 5, frightFlashes: 5, fruit: FRUIT.PEACH, fruitPoints: 500 },
  { fromLevel: 4, frightSeconds: 4, frightFlashes: 5, fruit: FRUIT.PEACH, fruitPoints: 500 },
  { fromLevel: 5, frightSeconds: 2, frightFlashes: 5, fruit: FRUIT.APPLE, fruitPoints: 700 },
  { fromLevel: 6, frightSeconds: 5, frightFlashes: 5, fruit: FRUIT.APPLE, fruitPoints: 700 },
  { fromLevel: 7, frightSeconds: 2, frightFlashes: 5, fruit: FRUIT.GRAPES, fruitPoints: 1000 },
  { fromLevel: 8, frightSeconds: 2, frightFlashes: 5, fruit: FRUIT.GRAPES, fruitPoints: 1000 },
  { fromLevel: 9, frightSeconds: 1, frightFlashes: 3, fruit: FRUIT.GALAXIAN, fruitPoints: 2000 },
  { fromLevel: 10, frightSeconds: 5, frightFlashes: 5, fruit: FRUIT.GALAXIAN, fruitPoints: 2000 },
  { fromLevel: 11, frightSeconds: 2, frightFlashes: 5, fruit: FRUIT.BELL, fruitPoints: 3000 },
  { fromLevel: 12, frightSeconds: 1, frightFlashes: 3, fruit: FRUIT.BELL, fruitPoints: 3000 },
  { fromLevel: 13, frightSeconds: 1, frightFlashes: 3, fruit: FRUIT.KEY, fruitPoints: 5000 },
  { fromLevel: 14, frightSeconds: 3, frightFlashes: 5, fruit: FRUIT.KEY, fruitPoints: 5000 },
  { fromLevel: 15, frightSeconds: 1, frightFlashes: 3, fruit: FRUIT.KEY, fruitPoints: 5000 },
  { fromLevel: 16, frightSeconds: 1, frightFlashes: 3, fruit: FRUIT.KEY, fruitPoints: 5000 },
  { fromLevel: 17, frightSeconds: 0, frightFlashes: 0, fruit: FRUIT.KEY, fruitPoints: 5000 },
  { fromLevel: 18, frightSeconds: 1, frightFlashes: 3, fruit: FRUIT.KEY, fruitPoints: 5000 },
  { fromLevel: 19, frightSeconds: 0, frightFlashes: 0, fruit: FRUIT.KEY, fruitPoints: 5000 },
];

// Leaving the ghost house (Dossier). dotLimits: personal dot counters; the
// first ghost still waiting counts the dots Pac-Man eats and leaves when its
// count reaches its limit. Blinky starts in our house too, with limit 0.
// noDotSeconds: if Pac-Man eats nothing for this long, the waiting ghost
// leaves anyway.
const HOUSE_ROWS = [
  {
    fromLevel: 1,
    dotLimits: {
      [GHOST_NAME.BLINKY]: 0, [GHOST_NAME.PINKY]: 0, [GHOST_NAME.INKY]: 30, [GHOST_NAME.CLYDE]: 60,
    },
    noDotSeconds: 4,
  },
  {
    fromLevel: 2,
    dotLimits: {
      [GHOST_NAME.BLINKY]: 0, [GHOST_NAME.PINKY]: 0, [GHOST_NAME.INKY]: 0, [GHOST_NAME.CLYDE]: 50,
    },
    noDotSeconds: 4,
  },
  {
    fromLevel: 3,
    dotLimits: {
      [GHOST_NAME.BLINKY]: 0, [GHOST_NAME.PINKY]: 0, [GHOST_NAME.INKY]: 0, [GHOST_NAME.CLYDE]: 0,
    },
    noDotSeconds: 4,
  },
  {
    fromLevel: 5,
    dotLimits: {
      [GHOST_NAME.BLINKY]: 0, [GHOST_NAME.PINKY]: 0, [GHOST_NAME.INKY]: 0, [GHOST_NAME.CLYDE]: 0,
    },
    noDotSeconds: 3,
  },
];

// A row out of order would make rowForLevel pick the wrong one silently.
for (const rows of [SPEED_ROWS, MODE_SCHEDULE_ROWS, LEVEL_ROWS, HOUSE_ROWS]) {
  console.assert(rows[0].fromLevel === 1, 'Every level table must start at level 1');
  rows.forEach((row, index) => {
    console.assert(
      index === 0 || row.fromLevel > rows[index - 1].fromLevel,
      `Level table rows must be in order (fromLevel ${row.fromLevel})`,
    );
  });
}

// The row that holds for this level: the last one that has started.
function rowForLevel(rows, level) {
  return rows.findLast((row) => row.fromLevel <= level);
}

// Scatter first, then they alternate; the same format ModeTimer takes.
function modeSchedule(scatterChaseSeconds) {
  return Object.freeze(
    scatterChaseSeconds.map((seconds, index) =>
      Object.freeze({
        mode: index % 2 === 0 ? GHOST_STATE.SCATTER : GHOST_STATE.CHASE,
        durationMs: seconds * MS_PER_SECOND,
      }),
    ),
  );
}

// Everything the game needs to know about one level, in game units (ms).
export function getLevelConfig(level) {
  const { speeds } = rowForLevel(SPEED_ROWS, level);
  const { scatterChaseSeconds } = rowForLevel(MODE_SCHEDULE_ROWS, level);
  const { frightSeconds, frightFlashes, fruit, fruitPoints } = rowForLevel(LEVEL_ROWS, level);
  const { dotLimits, noDotSeconds } = rowForLevel(HOUSE_ROWS, level);
  console.assert(
    frightSeconds === 0 || (speeds.pacmanFright !== null && speeds.ghostFright !== null),
    `Level ${level} has a frightened time but no frightened speeds`,
  );
  return Object.freeze({
    level,
    speeds: Object.freeze(speeds),
    modeSchedule: modeSchedule(scatterChaseSeconds),
    frightTimeMs: frightSeconds * MS_PER_SECOND,
    frightFlashes,
    fruit,
    fruitPoints,
    houseDotLimits: Object.freeze(dotLimits),
    noDotTimeMs: noDotSeconds * MS_PER_SECOND,
  });
}
