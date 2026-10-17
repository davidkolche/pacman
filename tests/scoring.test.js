import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS,
  DOT_POINTS,
  POWER_PELLET_POINTS,
  GHOST_EATEN_POINTS,
  EXTRA_LIFE_SCORE,
  STARTING_LIVES,
  FRUIT_TILE,
} from '../js/constants.js';
import { on, off, emit } from '../js/events.js';
import { resetMaze } from '../js/maze.js';
import { getLevelConfig } from '../js/levels.js';
import {
  setupScoring,
  resetScore,
  setDebugScore,
  getScore,
  getLives,
  getDotsRemaining,
} from '../js/score.js';
import { Fruit } from '../js/fruit.js';
import { Game } from '../js/game.js';
// The game's keys; none are pressed here (these tests never call update).
import * as input from '../js/input.js';

// score.js keeps one score for the whole program and subscribes to the game's
// events. setupScoring must run only once (a second call would not double the
// points, its listeners are in a Set, but once is how main.js does it).
// Without localStorage in Node, storage.js falls back to an empty table.
setupScoring();

// Every test starts a new game: full maze, score 0, 3 lives, no extra life yet.
beforeEach(() => {
  resetMaze();
  resetScore();
});

// Counts how many times an event is emitted while fn runs, and with what data.
function recordEvents(eventName, fn) {
  const received = [];
  const listener = (data) => received.push(data);
  on(eventName, listener);
  try {
    fn();
  } finally {
    off(eventName, listener);
  }
  return received;
}

describe('dots and power pellets', () => {
  test('a dot is worth 10 points', () => {
    assert.equal(DOT_POINTS, 10);
    emit(EVENTS.DOT_EATEN, { col: 1 });
    assert.equal(getScore(), 10);
  });

  test('a power pellet is worth 50 points', () => {
    assert.equal(POWER_PELLET_POINTS, 50);
    emit(EVENTS.POWER_PELLET_EATEN);
    assert.equal(getScore(), 50);
  });

  test('both count down the food left (240 dots + 4 pellets)', () => {
    assert.equal(getDotsRemaining(), 244);
    emit(EVENTS.DOT_EATEN, { col: 1 });
    emit(EVENTS.POWER_PELLET_EATEN);
    assert.equal(getDotsRemaining(), 242);
    assert.equal(getScore(), 60);
  });
});

describe('ghost chain', () => {
  let game;

  beforeEach(() => {
    game = new Game({ input });
  });

  // Each game subscribes to the eating events; a finished test's game must
  // not hear the next test's dots.
  afterEach(() => {
    game.disconnect();
  });

  test('the table is 200 / 400 / 800 / 1600', () => {
    assert.deepEqual([...GHOST_EATEN_POINTS], [200, 400, 800, 1600]);
  });

  test('four ghosts on one power pellet give 200, 400, 800, 1600 (3000 in all)', () => {
    game.handlePowerPelletEaten();
    const scoreBefore = getScore();
    const eaten = recordEvents(EVENTS.GHOST_EATEN, () => {
      for (const ghost of game.ghosts) {
        game.eatGhost(ghost);
      }
    });
    assert.deepEqual(eaten.map(({ points }) => points), [200, 400, 800, 1600]);
    assert.deepEqual(eaten.map(({ chainIndex }) => chainIndex), [0, 1, 2, 3]);
    assert.equal(getScore() - scoreBefore, 3000);
  });

  test('a new power pellet starts the chain again at 200', () => {
    game.handlePowerPelletEaten();
    const eaten = recordEvents(EVENTS.GHOST_EATEN, () => {
      game.eatGhost(game.ghosts[0]);
      game.eatGhost(game.ghosts[1]);
      game.handlePowerPelletEaten();
      game.eatGhost(game.ghosts[2]);
    });
    assert.deepEqual(eaten.map(({ points }) => points), [200, 400, 200]);
  });

  test('a lost life starts the chain again too (fresh characters)', () => {
    game.handlePowerPelletEaten();
    game.eatGhost(game.ghosts[0]);
    game.resetActors();
    game.handlePowerPelletEaten();
    const eaten = recordEvents(EVENTS.GHOST_EATEN, () => game.eatGhost(game.ghosts[0]));
    assert.equal(eaten[0].points, 200);
  });
});

describe('fruit', () => {
  // Dossier values, level -> points (level 13 and on: the key, 5000).
  const FRUIT_POINTS_BY_LEVEL = [
    [1, 100], [2, 300], [3, 500], [4, 500], [5, 700], [6, 700], [7, 1000], [8, 1000],
    [9, 2000], [10, 2000], [11, 3000], [12, 3000], [13, 5000], [20, 5000], [50, 5000],
  ];
  const fruitTile = { col: Math.floor(FRUIT_TILE.col), row: FRUIT_TILE.row };

  for (const [level, points] of FRUIT_POINTS_BY_LEVEL) {
    test(`level ${level}: the fruit is worth ${points}`, () => {
      const fruit = new Fruit(getLevelConfig(level));
      fruit.show();
      const eaten = recordEvents(EVENTS.FRUIT_EATEN, () => fruit.tryEat(fruitTile));
      assert.equal(eaten.length, 1);
      assert.equal(eaten[0].points, points);
      assert.equal(getScore(), points);
    });
  }

  test('a fruit that is not out gives nothing', () => {
    const fruit = new Fruit(getLevelConfig(1));
    const eaten = recordEvents(EVENTS.FRUIT_EATEN, () => fruit.tryEat(fruitTile));
    assert.equal(eaten.length, 0);
    assert.equal(getScore(), 0);
  });
});

describe('extra life', () => {
  test('no extra life one dot before 10,000', () => {
    setDebugScore(EXTRA_LIFE_SCORE - 2 * DOT_POINTS);
    const awarded = recordEvents(EVENTS.EXTRA_LIFE, () => emit(EVENTS.DOT_EATEN, { col: 1 }));
    assert.equal(getScore(), 9990);
    assert.equal(awarded.length, 0);
    assert.equal(getLives(), STARTING_LIVES);
  });

  test('exactly at 10,000: one more life and one EXTRA_LIFE event', () => {
    setDebugScore(EXTRA_LIFE_SCORE - DOT_POINTS);
    const awarded = recordEvents(EVENTS.EXTRA_LIFE, () => emit(EVENTS.DOT_EATEN, { col: 1 }));
    assert.equal(getScore(), 10000);
    assert.equal(awarded.length, 1);
    assert.equal(getLives(), STARTING_LIVES + 1);
  });

  test('only once per game, however far the score goes', () => {
    setDebugScore(EXTRA_LIFE_SCORE - DOT_POINTS);
    const awarded = recordEvents(EVENTS.EXTRA_LIFE, () => {
      emit(EVENTS.DOT_EATEN, { col: 1 });
      emit(EVENTS.FRUIT_EATEN, { points: 5000 });
      emit(EVENTS.GHOST_EATEN, { points: 1600 });
      setDebugScore(EXTRA_LIFE_SCORE - DOT_POINTS);
      emit(EVENTS.DOT_EATEN, { col: 1 });
    });
    assert.equal(awarded.length, 1);
    assert.equal(getLives(), STARTING_LIVES + 1);
  });

  test('a jump over 10,000 (a ghost) still gives it', () => {
    setDebugScore(9900);
    const awarded = recordEvents(EVENTS.EXTRA_LIFE, () => emit(EVENTS.GHOST_EATEN, { points: 400 }));
    assert.equal(getScore(), 10300);
    assert.equal(awarded.length, 1);
  });

  test('a new game can earn it again', () => {
    setDebugScore(EXTRA_LIFE_SCORE - DOT_POINTS);
    emit(EVENTS.DOT_EATEN, { col: 1 });
    resetScore();
    assert.equal(getLives(), STARTING_LIVES);
    setDebugScore(EXTRA_LIFE_SCORE - DOT_POINTS);
    const awarded = recordEvents(EVENTS.EXTRA_LIFE, () => emit(EVENTS.DOT_EATEN, { col: 1 }));
    assert.equal(awarded.length, 1);
    assert.equal(getLives(), STARTING_LIVES + 1);
  });
});
