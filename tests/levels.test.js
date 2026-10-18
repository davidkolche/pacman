import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRUIT,
  GHOST_NAME,
  GHOST_STATE,
  FRIGHTENED_ONE_FLASH_MS,
  MS_PER_SECOND,
  TARGET_UPDATES_PER_SECOND,
} from '../js/constants.js';
import { getLevelConfig } from '../js/levels.js';

// levels.js exports only getLevelConfig; its four tables are private. Every
// row is reached through it: the last rows start at levels 19 (LEVEL_ROWS)
// and 21 (SPEED_ROWS), so levels 1-30 pass through every row of every table.
const LAST_TABLE_LEVEL = 21;
const CHECKED_LEVELS = Array.from({ length: 30 }, (_, index) => index + 1);
const configs = CHECKED_LEVELS.map((level) => getLevelConfig(level));

// The fields the game reads (game.js, ghost.js, pacman.js, fruit.js, ghostHouse.js, modeTimer.js).
const CONFIG_FIELDS = [
  'level', 'speeds', 'modeSchedule', 'frightTimeMs', 'frightFlashes', 'elroy1Dots',
  'elroy2Dots', 'fruit', 'fruitPoints', 'houseDotLimits', 'noDotTimeMs',
];
const SPEED_FIELDS = [
  'pacman', 'pacmanDots', 'pacmanFright', 'pacmanFrightDots',
  'ghost', 'ghostTunnel', 'ghostFright', 'elroy1', 'elroy2',
];
const FRIGHT_SPEED_FIELDS = ['pacmanFright', 'pacmanFrightDots', 'ghostFright'];
// The fastest speed in the Dossier is Elroy 2 from level 5: 105%.
const MAX_SPEED_FRACTION = 1.05;

function isWholeNumberAtLeast(value, minimum) {
  return Number.isInteger(value) && value >= minimum;
}

describe('every level has all its fields', () => {
  test('each config has exactly the fields the game reads', () => {
    for (const config of configs) {
      assert.deepEqual(Object.keys(config).sort(), [...CONFIG_FIELDS].sort(), `level ${config.level}`);
    }
  });

  test('each config knows its own level number', () => {
    configs.forEach((config, index) => assert.equal(config.level, CHECKED_LEVELS[index]));
  });

  test('each config has every speed', () => {
    for (const config of configs) {
      assert.deepEqual(Object.keys(config.speeds).sort(), [...SPEED_FIELDS].sort(), `level ${config.level}`);
    }
  });

  test('times, flashes and Elroy dots are whole numbers, never negative', () => {
    for (const config of configs) {
      const where = `level ${config.level}`;
      assert.ok(isWholeNumberAtLeast(config.frightTimeMs, 0), where);
      assert.ok(isWholeNumberAtLeast(config.frightFlashes, 0), where);
      assert.ok(isWholeNumberAtLeast(config.noDotTimeMs, 1), where);
      assert.ok(isWholeNumberAtLeast(config.elroy1Dots, 1), where);
      assert.ok(isWholeNumberAtLeast(config.elroy2Dots, 1), where);
    }
  });

  test('no fright time means no flashes, and the other way round', () => {
    for (const config of configs) {
      assert.equal(config.frightTimeMs === 0, config.frightFlashes === 0, `level ${config.level}`);
    }
  });

  test('Elroy 2 starts at half of Elroy 1\'s dots', () => {
    for (const config of configs) {
      assert.equal(config.elroy2Dots, config.elroy1Dots / 2, `level ${config.level}`);
    }
  });

  test('the fruit is a known fruit with positive points', () => {
    const knownFruits = Object.values(FRUIT);
    for (const config of configs) {
      assert.ok(knownFruits.includes(config.fruit), `level ${config.level}: ${config.fruit}`);
      assert.ok(isWholeNumberAtLeast(config.fruitPoints, 1), `level ${config.level}`);
    }
  });

  test('every ghost has a house dot limit; Blinky\'s is always 0', () => {
    for (const config of configs) {
      for (const name of Object.values(GHOST_NAME)) {
        assert.ok(isWholeNumberAtLeast(config.houseDotLimits[name], 0), `level ${config.level}, ${name}`);
      }
      assert.equal(config.houseDotLimits[GHOST_NAME.BLINKY], 0);
    }
  });

  test('the mode schedule alternates scatter / chase and its last chase never ends', () => {
    for (const config of configs) {
      const schedule = config.modeSchedule;
      assert.equal(schedule.length, 8, `level ${config.level}`);
      schedule.forEach((step, index) => {
        assert.equal(step.mode, index % 2 === 0 ? GHOST_STATE.SCATTER : GHOST_STATE.CHASE);
        assert.ok(step.durationMs > 0, `level ${config.level}, step ${index}`);
      });
      assert.equal(schedule.at(-1).durationMs, Infinity);
    }
  });
});

describe('speeds are in a valid range', () => {
  test('every speed is above 0 and at most 105%', () => {
    for (const config of configs) {
      for (const [name, speed] of Object.entries(config.speeds)) {
        if (speed === null) {
          continue;
        }
        assert.ok(speed > 0 && speed <= MAX_SPEED_FRACTION, `level ${config.level}, ${name} = ${speed}`);
      }
    }
  });

  test('only the frightened speeds can be missing (null), and only with no fright time', () => {
    for (const config of configs) {
      for (const [name, speed] of Object.entries(config.speeds)) {
        if (speed !== null) {
          continue;
        }
        assert.ok(FRIGHT_SPEED_FIELDS.includes(name), `level ${config.level}: ${name} is null`);
        assert.equal(config.frightTimeMs, 0, `level ${config.level}: fright time without ${name}`);
      }
    }
  });

  test('ghosts are slower in the tunnel and when frightened; Elroy is faster', () => {
    for (const { level, speeds } of configs) {
      const where = `level ${level}`;
      assert.ok(speeds.ghostTunnel < speeds.ghost, where);
      if (speeds.ghostFright !== null) {
        assert.ok(speeds.ghostFright < speeds.ghost, where);
      }
      assert.ok(speeds.elroy1 > speeds.ghost, where);
      assert.ok(speeds.elroy2 > speeds.elroy1, where);
    }
  });

  test('the *Dots reference speeds are below the speeds they belong to', () => {
    for (const { level, speeds } of configs) {
      assert.ok(speeds.pacmanDots < speeds.pacman, `level ${level}`);
      if (speeds.pacmanFright !== null) {
        assert.ok(speeds.pacmanFrightDots < speeds.pacmanFright, `level ${level}`);
      }
    }
  });
});

describe('levels after the end of the tables', () => {
  // The last row of every table has started by LAST_TABLE_LEVEL, so every
  // level after it must be the same level, apart from its number.
  function withoutLevel(config) {
    const { level, ...rest } = config;
    return rest;
  }

  test('levels 22, 50, 100 and 255 are all the same as level 21', () => {
    const last = withoutLevel(getLevelConfig(LAST_TABLE_LEVEL));
    for (const level of [22, 50, 100, 255]) {
      assert.deepEqual(withoutLevel(getLevelConfig(level)), last, `level ${level}`);
    }
  });

  test('from level 21: no blue ghosts, no fright speeds, the key, the last speeds', () => {
    const config = getLevelConfig(100);
    assert.equal(config.level, 100);
    assert.equal(config.frightTimeMs, 0);
    assert.equal(config.frightFlashes, 0);
    assert.equal(config.speeds.ghostFright, null);
    assert.equal(config.speeds.pacman, 0.9);
    assert.equal(config.speeds.ghost, 0.95);
    assert.equal(config.fruit, FRUIT.KEY);
    assert.equal(config.fruitPoints, 5000);
    assert.equal(config.elroy1Dots, 120);
  });

  test('a row holds until the next one: level 3 and 4 use the level-2 speeds', () => {
    assert.deepEqual(getLevelConfig(3).speeds, getLevelConfig(2).speeds);
    assert.deepEqual(getLevelConfig(4).speeds, getLevelConfig(2).speeds);
    assert.notDeepEqual(getLevelConfig(5).speeds, getLevelConfig(4).speeds);
  });

  test('levels 2 and 5 on: the last scatter is one frame long', () => {
    for (const level of [2, 4, 5, 30]) {
      assert.equal(getLevelConfig(level).modeSchedule[6].durationMs, MS_PER_SECOND / TARGET_UPDATES_PER_SECOND);
    }
  });
});

describe('our documented deviations (CLAUDE.md)', () => {
  test('fright times on levels 1-4 are 8 / 6 / 5 / 4 s (arcade: 6 / 5 / 4 / 3)', () => {
    const frightSeconds = [1, 2, 3, 4].map((level) => getLevelConfig(level).frightTimeMs / MS_PER_SECOND);
    assert.deepEqual(frightSeconds, [8, 6, 5, 4]);
  });

  test('from level 5 the fright times are the Dossier\'s', () => {
    // Dossier Table A.1, levels 5-19.
    const dossierSeconds = [2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0];
    const ours = dossierSeconds.map((_, index) => getLevelConfig(index + 5).frightTimeMs / MS_PER_SECOND);
    assert.deepEqual(ours, dossierSeconds);
  });

  test('levels 1-4 keep 5 flashes, so the flashing still fills the last 2 s', () => {
    for (const level of [1, 2, 3, 4]) {
      const { frightFlashes } = getLevelConfig(level);
      assert.equal(frightFlashes, 5);
      assert.equal(frightFlashes * FRIGHTENED_ONE_FLASH_MS, 2000);
    }
  });

  test('flashing longer than the fright time only on levels 9, 12, 13, 15, 16, 18', () => {
    const longer = CHECKED_LEVELS.filter((level) => {
      const { frightTimeMs, frightFlashes } = getLevelConfig(level);
      return frightFlashes * FRIGHTENED_ONE_FLASH_MS > frightTimeMs;
    });
    assert.deepEqual(longer, [9, 12, 13, 15, 16, 18]);
  });
});
