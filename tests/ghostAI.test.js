import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTION, GHOST_NAME, GHOST_STARTS, NO_UP_TURN_TILES } from '../js/constants.js';
import { isInsideMaze } from '../js/maze.js';
import {
  tilesAhead,
  blinkyChaseTarget,
  pinkyChaseTarget,
  inkyChaseTarget,
  clydeChaseTarget,
  getChaseTarget,
  chooseDirection,
} from '../js/ghostAI.js';

// chooseDirection asks the caller whether a tile is open, so a test can hand
// it a fake maze: an open field, or one with a few blocked tiles.
const openField = () => true;

function walls(...blockedTiles) {
  const blocked = new Set(blockedTiles);
  return (col, row) => !blocked.has(`${col},${row}`);
}

function scatterTileOf(name) {
  return GHOST_STARTS.find((start) => start.name === name).scatterTile;
}

// One situation shape for every ghost; each test overrides only what it checks.
function situation(overrides = {}) {
  return {
    ghostTile: { col: 13, row: 11 },
    scatterTile: scatterTileOf(GHOST_NAME.CLYDE),
    pacmanTile: { col: 13, row: 23 },
    pacmanDirection: DIRECTION.LEFT,
    blinkyTile: { col: 13, row: 11 },
    ...overrides,
  };
}

const ghostTile = { col: 10, row: 10 };

describe('chooseDirection', () => {
  test('the open direction whose next tile is closest to the target wins', () => {
    assert.equal(chooseDirection(ghostTile, DIRECTION.LEFT, { col: 5, row: 10 }, openField), DIRECTION.LEFT);
    assert.equal(chooseDirection(ghostTile, DIRECTION.LEFT, { col: 10, row: 20 }, openField), DIRECTION.DOWN);
  });

  // The target on the ghost's own tile puts every next tile at distance 1.
  test('a tie goes to up, then left, then down, then right', () => {
    assert.equal(chooseDirection(ghostTile, DIRECTION.LEFT, ghostTile, openField), DIRECTION.UP);
    assert.equal(chooseDirection(ghostTile, DIRECTION.LEFT, ghostTile, walls('10,9')), DIRECTION.LEFT);
    assert.equal(chooseDirection(ghostTile, DIRECTION.RIGHT, ghostTile, walls('10,9')), DIRECTION.DOWN);
    assert.equal(chooseDirection(ghostTile, DIRECTION.RIGHT, ghostTile, walls('10,9', '10,11')), DIRECTION.RIGHT);
  });

  test('never reverses, even when the target is straight behind', () => {
    const behind = { col: 0, row: 10 };
    const chosen = chooseDirection(ghostTile, DIRECTION.RIGHT, behind, openField);
    assert.notEqual(chosen, DIRECTION.LEFT);
    assert.equal(chosen, DIRECTION.UP);
  });

  test('never steps into a wall, even toward the target', () => {
    const chosen = chooseDirection(ghostTile, DIRECTION.LEFT, { col: 5, row: 10 }, walls('9,10'));
    assert.notEqual(chosen, DIRECTION.LEFT);
    assert.equal(chosen, DIRECTION.UP);
  });

  test('in a dead end the ghost turns back', () => {
    const deadEnd = walls('10,9', '9,10', '10,11');
    assert.equal(chooseDirection(ghostTile, DIRECTION.LEFT, { col: 0, row: 10 }, deadEnd), DIRECTION.RIGHT);
  });

  test('no turn up on the four restricted tiles, even with the target straight above', () => {
    assert.equal(NO_UP_TURN_TILES.length, 4);
    for (const tile of NO_UP_TURN_TILES) {
      const above = { col: tile.col, row: tile.row - 10 };
      assert.equal(
        chooseDirection(tile, DIRECTION.LEFT, above, openField),
        DIRECTION.LEFT,
        `turned up on (${tile.col}, ${tile.row})`,
      );
    }
  });

  test('a tile next to a restricted one still allows up', () => {
    const tile = { col: 13, row: 11 };
    assert.equal(chooseDirection(tile, DIRECTION.LEFT, { col: 13, row: 1 }, openField), DIRECTION.UP);
  });
});

describe('chase targets', () => {
  const pacmanTile = { col: 13, row: 23 };

  test('Blinky targets Pac-Man\'s own tile', () => {
    assert.deepEqual(blinkyChaseTarget(pacmanTile), { col: 13, row: 23 });
  });

  test('Pinky targets 4 tiles ahead of Pac-Man', () => {
    assert.deepEqual(pinkyChaseTarget(pacmanTile, DIRECTION.LEFT), { col: 9, row: 23 });
    assert.deepEqual(pinkyChaseTarget(pacmanTile, DIRECTION.RIGHT), { col: 17, row: 23 });
    assert.deepEqual(pinkyChaseTarget(pacmanTile, DIRECTION.DOWN), { col: 13, row: 27 });
  });

  test('Pinky facing up: 4 up and also 4 left (the arcade overflow bug)', () => {
    assert.deepEqual(pinkyChaseTarget(pacmanTile, DIRECTION.UP), { col: 9, row: 19 });
    assert.deepEqual(tilesAhead(pacmanTile, DIRECTION.UP, 1), { col: 12, row: 22 });
  });

  test('Inky doubles the vector from Blinky to 2 tiles ahead of Pac-Man', () => {
    // Pivot (11, 23); Blinky (15, 20) -> pivot + (pivot - Blinky) = (7, 26).
    assert.deepEqual(inkyChaseTarget(pacmanTile, DIRECTION.LEFT, { col: 15, row: 20 }), { col: 7, row: 26 });
  });

  test('Inky facing up uses the overflowed pivot', () => {
    // Pivot (11, 21) instead of (13, 21); Blinky (15, 25) -> (7, 17).
    assert.deepEqual(inkyChaseTarget(pacmanTile, DIRECTION.UP, { col: 15, row: 25 }), { col: 7, row: 17 });
  });

  test('Inky with Blinky on the pivot targets the pivot itself', () => {
    assert.deepEqual(inkyChaseTarget(pacmanTile, DIRECTION.LEFT, { col: 11, row: 23 }), { col: 11, row: 23 });
  });

  const clydeCorner = scatterTileOf(GHOST_NAME.CLYDE);

  test('Clyde farther than 8 tiles chases Pac-Man', () => {
    assert.deepEqual(clydeChaseTarget({ col: 13, row: 11 }, pacmanTile, clydeCorner), { col: 13, row: 23 });
  });

  test('Clyde closer than 8 tiles heads for his corner', () => {
    assert.deepEqual(clydeChaseTarget({ col: 13, row: 20 }, pacmanTile, clydeCorner), { col: 0, row: 32 });
  });

  // Dossier: Clyde turns to his corner only when closer than 8 tiles.
  test('Clyde exactly 8 tiles away still chases Pac-Man', () => {
    assert.deepEqual(clydeChaseTarget({ col: 13, row: 15 }, pacmanTile, clydeCorner), { col: 13, row: 23 });
  });

  test('getChaseTarget sends each ghost to its own rule', () => {
    const blinkyTile = { col: 15, row: 20 };
    const state = situation({ blinkyTile, ghostTile: { col: 13, row: 20 } });
    assert.deepEqual(getChaseTarget(GHOST_NAME.BLINKY, state), { col: 13, row: 23 });
    assert.deepEqual(getChaseTarget(GHOST_NAME.PINKY, state), { col: 9, row: 23 });
    assert.deepEqual(getChaseTarget(GHOST_NAME.INKY, state), { col: 7, row: 26 });
    assert.deepEqual(getChaseTarget(GHOST_NAME.CLYDE, state), { col: 0, row: 32 });
  });
});

describe('scatter corners', () => {
  test('each ghost has its Dossier corner', () => {
    assert.deepEqual(scatterTileOf(GHOST_NAME.BLINKY), { col: 25, row: -3 });
    assert.deepEqual(scatterTileOf(GHOST_NAME.PINKY), { col: 2, row: -3 });
    assert.deepEqual(scatterTileOf(GHOST_NAME.INKY), { col: 27, row: 32 });
    assert.deepEqual(scatterTileOf(GHOST_NAME.CLYDE), { col: 0, row: 32 });
  });

  test('every corner lies outside the maze, so it can never be reached', () => {
    for (const { name, scatterTile } of GHOST_STARTS) {
      assert.equal(isInsideMaze(scatterTile.col, scatterTile.row), false, `${name}'s corner is inside`);
    }
  });
});
