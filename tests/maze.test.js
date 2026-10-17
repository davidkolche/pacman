import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAZE_COLUMNS,
  MAZE_ROWS,
  TILE,
  TILE_SIZE,
  HUD_TOP_ROWS,
  TUNNEL_ROW,
} from '../js/constants.js';
import {
  resetMaze,
  isInsideMaze,
  tileAt,
  takeFood,
  nearestTile,
  isWall,
  isTunnel,
  isBlockedForPacman,
  isBlockedForGhost,
  tileToPixel,
  tileCenterPixel,
  pixelToTile,
  countTiles,
} from '../js/maze.js';

// The maze is one shared grid (module state), and takeFood changes it, so
// every test starts from the full original maze.
beforeEach(() => {
  resetMaze();
});

describe('maze data', () => {
  test('the maze is 28 columns by 31 rows', () => {
    assert.equal(MAZE_COLUMNS, 28);
    assert.equal(MAZE_ROWS, 31);
  });

  test('every tile of the grid is a known tile type', () => {
    const knownTiles = Object.values(TILE);
    for (let row = 0; row < MAZE_ROWS; row++) {
      for (let col = 0; col < MAZE_COLUMNS; col++) {
        assert.ok(knownTiles.includes(tileAt(col, row)), `unknown tile at (${col}, ${row})`);
      }
    }
  });

  test('a full maze has 240 dots and 4 power pellets', () => {
    assert.equal(countTiles(TILE.DOT), 240);
    assert.equal(countTiles(TILE.POWER_PELLET), 4);
  });

  test('the power pellets are in the four corners of the arcade maze', () => {
    for (const { col, row } of [{ col: 1, row: 3 }, { col: 26, row: 3 }, { col: 1, row: 23 }, { col: 26, row: 23 }]) {
      assert.equal(tileAt(col, row), TILE.POWER_PELLET, `no pellet at (${col}, ${row})`);
    }
  });

  test('the ghost door is two tiles above the house', () => {
    assert.equal(tileAt(13, 12), TILE.GHOST_DOOR);
    assert.equal(tileAt(14, 12), TILE.GHOST_DOOR);
    assert.equal(countTiles(TILE.GHOST_DOOR), 2);
  });
});

describe('isInsideMaze', () => {
  test('the four corner tiles are inside', () => {
    assert.equal(isInsideMaze(0, 0), true);
    assert.equal(isInsideMaze(MAZE_COLUMNS - 1, 0), true);
    assert.equal(isInsideMaze(0, MAZE_ROWS - 1), true);
    assert.equal(isInsideMaze(MAZE_COLUMNS - 1, MAZE_ROWS - 1), true);
  });

  test('one step past any edge is outside', () => {
    assert.equal(isInsideMaze(-1, 0), false);
    assert.equal(isInsideMaze(MAZE_COLUMNS, 0), false);
    assert.equal(isInsideMaze(0, -1), false);
    assert.equal(isInsideMaze(0, MAZE_ROWS), false);
  });
});

describe('tileAt and isWall', () => {
  test('reads walls, dots and empty tiles', () => {
    assert.equal(tileAt(0, 0), TILE.WALL);
    assert.equal(tileAt(1, 1), TILE.DOT);
    assert.equal(tileAt(0, TUNNEL_ROW), TILE.EMPTY);
  });

  test('outside the maze counts as empty, so the tunnel leads off-screen', () => {
    assert.equal(tileAt(-1, TUNNEL_ROW), TILE.EMPTY);
    assert.equal(tileAt(MAZE_COLUMNS, TUNNEL_ROW), TILE.EMPTY);
    assert.equal(tileAt(5, -1), TILE.EMPTY);
    assert.equal(tileAt(5, MAZE_ROWS), TILE.EMPTY);
  });

  test('isWall is true only for wall tiles, never outside the maze', () => {
    assert.equal(isWall(0, 0), true);
    assert.equal(isWall(1, 1), false);
    assert.equal(isWall(13, 12), false);
    assert.equal(isWall(-1, 0), false);
  });
});

describe('isTunnel', () => {
  // TUNNEL_LENGTH_TILES is 6: columns 0-5 and 22-27 of row 14.
  test('the slow zone covers the first and last 6 columns of the tunnel row', () => {
    assert.equal(isTunnel(0, TUNNEL_ROW), true);
    assert.equal(isTunnel(5, TUNNEL_ROW), true);
    assert.equal(isTunnel(22, TUNNEL_ROW), true);
    assert.equal(isTunnel(27, TUNNEL_ROW), true);
  });

  test('the tunnel ends right after its edges', () => {
    assert.equal(isTunnel(6, TUNNEL_ROW), false);
    assert.equal(isTunnel(21, TUNNEL_ROW), false);
  });

  test('off-screen columns of the tunnel row still count as tunnel', () => {
    assert.equal(isTunnel(-1, TUNNEL_ROW), true);
    assert.equal(isTunnel(-2, TUNNEL_ROW), true);
    assert.equal(isTunnel(MAZE_COLUMNS, TUNNEL_ROW), true);
    assert.equal(isTunnel(MAZE_COLUMNS + 1, TUNNEL_ROW), true);
  });

  test('the rows above and below the tunnel are not tunnel', () => {
    assert.equal(isTunnel(0, TUNNEL_ROW - 1), false);
    assert.equal(isTunnel(0, TUNNEL_ROW + 1), false);
  });
});

describe('isBlockedForPacman and isBlockedForGhost', () => {
  test('walls and the ghost door block both', () => {
    for (const isBlocked of [isBlockedForPacman, isBlockedForGhost]) {
      assert.equal(isBlocked(0, 0), true);
      assert.equal(isBlocked(13, 12), true);
    }
  });

  test('dots, empty tiles and off-screen tunnel tiles are open for both', () => {
    for (const isBlocked of [isBlockedForPacman, isBlockedForGhost]) {
      assert.equal(isBlocked(1, 1), false);
      assert.equal(isBlocked(0, TUNNEL_ROW), false);
      assert.equal(isBlocked(-1, TUNNEL_ROW), false);
    }
  });
});

describe('pixel conversions', () => {
  // The maze starts below the top HUD: maze row 0 is screen pixel row 24.
  const mazeTop = HUD_TOP_ROWS * TILE_SIZE;

  test('tileToPixel gives the top-left pixel, below the HUD', () => {
    assert.deepEqual(tileToPixel(0, 0), { x: 0, y: mazeTop });
    assert.deepEqual(tileToPixel(1, 2), { x: 8, y: mazeTop + 16 });
  });

  test('tileCenterPixel is half a tile in from the top-left', () => {
    assert.deepEqual(tileCenterPixel(0, 0), { x: 4, y: mazeTop + 4 });
  });

  test('a fractional column gives a point between two tiles (Pac-Man start)', () => {
    assert.deepEqual(tileCenterPixel(13.5, 23), { x: 112, y: 212 });
  });

  test('pixelToTile: every pixel of a tile belongs to that tile', () => {
    assert.deepEqual(pixelToTile(0, mazeTop), { col: 0, row: 0 });
    assert.deepEqual(pixelToTile(7.99, mazeTop + 7.99), { col: 0, row: 0 });
    assert.deepEqual(pixelToTile(8, mazeTop + 8), { col: 1, row: 1 });
  });

  test('pixelToTile goes off the maze: negative columns in the tunnel, HUD rows above', () => {
    assert.deepEqual(pixelToTile(-1, mazeTop), { col: -1, row: 0 });
    assert.deepEqual(pixelToTile(0, 0), { col: 0, row: -HUD_TOP_ROWS });
  });

  test('pixelToTile undoes tileCenterPixel', () => {
    for (const tile of [{ col: 0, row: 0 }, { col: 13, row: 23 }, { col: 27, row: 30 }]) {
      const { x, y } = tileCenterPixel(tile.col, tile.row);
      assert.deepEqual(pixelToTile(x, y), tile);
    }
  });
});

describe('takeFood and nearestTile', () => {
  test('takeFood removes a dot once and reports it', () => {
    assert.equal(takeFood(1, 1), TILE.DOT);
    assert.equal(tileAt(1, 1), TILE.EMPTY);
    assert.equal(takeFood(1, 1), null);
    assert.equal(countTiles(TILE.DOT), 239);
  });

  test('takeFood reports a power pellet, and nothing on a wall or outside', () => {
    assert.equal(takeFood(1, 3), TILE.POWER_PELLET);
    assert.equal(takeFood(0, 0), null);
    assert.equal(takeFood(-1, TUNNEL_ROW), null);
  });

  test('resetMaze puts the eaten food back', () => {
    takeFood(1, 1);
    takeFood(1, 3);
    resetMaze();
    assert.equal(countTiles(TILE.DOT), 240);
    assert.equal(countTiles(TILE.POWER_PELLET), 4);
  });

  test('nearestTile finds the closest tile of a type, or null when none is left', () => {
    assert.deepEqual(nearestTile(TILE.POWER_PELLET, 0, 0), { col: 1, row: 3 });
    for (const { col, row } of [{ col: 1, row: 3 }, { col: 26, row: 3 }, { col: 1, row: 23 }, { col: 26, row: 23 }]) {
      takeFood(col, row);
    }
    assert.equal(nearestTile(TILE.POWER_PELLET, 0, 0), null);
  });
});
