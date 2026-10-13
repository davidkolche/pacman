import {
  TILE_SIZE,
  SCREEN_ROWS,
  MAZE_COLUMNS,
  MAZE_ROWS,
  HUD_TOP_ROWS,
  HUD_BOTTOM_ROWS,
  TILE,
} from './constants.js';

// The original arcade maze, one string per row, one character per tile.
// '#' wall, '.' dot, 'o' power pellet, ' ' empty, '-' ghost-house door.
// Row 14 is the side tunnel: it is open at both ends.
const MAZE_LAYOUT = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

// A typo in the layout (one missing character) would silently shift a whole
// row, so we check the shape as soon as the module loads.
console.assert(
  MAZE_LAYOUT.length === MAZE_ROWS,
  `Maze must have ${MAZE_ROWS} rows, found ${MAZE_LAYOUT.length}`,
);
MAZE_LAYOUT.forEach((rowText, row) => {
  console.assert(
    rowText.length === MAZE_COLUMNS,
    `Maze row ${row} must have ${MAZE_COLUMNS} columns, found ${rowText.length}`,
  );
});
console.assert(
  HUD_TOP_ROWS + MAZE_ROWS + HUD_BOTTOM_ROWS === SCREEN_ROWS,
  'HUD rows plus maze rows must fill the whole screen',
);

// Strings in JavaScript cannot be changed, so the live maze is a grid of
// single characters built from the layout. MAZE_LAYOUT stays the untouched
// original, ready for resetting the maze later.
const tiles = MAZE_LAYOUT.map((rowText) => [...rowText]);

export function isInsideMaze(col, row) {
  return col >= 0 && col < MAZE_COLUMNS && row >= 0 && row < MAZE_ROWS;
}

// Callers always pass (col, row) like (x, y); this is the only place where
// the order flips to [row][col], because the array is a list of rows.
export function tileAt(col, row) {
  if (!isInsideMaze(col, row)) {
    // Outside the maze counts as open space, so the tunnels lead off-screen.
    return TILE.EMPTY;
  }
  return tiles[row][col];
}

// Removes a dot or power pellet and reports which one it was, or null when
// there was nothing to eat.
export function takeFood(col, row) {
  const tile = tileAt(col, row);
  if (tile !== TILE.DOT && tile !== TILE.POWER_PELLET) {
    return null;
  }
  tiles[row][col] = TILE.EMPTY;
  return tile;
}

export function isWall(col, row) {
  return tileAt(col, row) === TILE.WALL;
}

// Only ghosts may pass through the ghost-house door.
export function isBlockedForPacman(col, row) {
  const tile = tileAt(col, row);
  return tile === TILE.WALL || tile === TILE.GHOST_DOOR;
}

// Ghosts in the maze cannot pass the door from outside either; only ghosts
// leaving the house cross it, on a fixed path that never asks the maze.
// Same rule as Pac-Man for now, but separate because ghosts get rules of
// their own in stage 7 (zones where they may not turn up).
export function isBlockedForGhost(col, row) {
  const tile = tileAt(col, row);
  return tile === TILE.WALL || tile === TILE.GHOST_DOOR;
}

// Top-left screen pixel of a maze tile; the maze starts below the top HUD.
export function tileToPixel(col, row) {
  return {
    x: col * TILE_SIZE,
    y: (row + HUD_TOP_ROWS) * TILE_SIZE,
  };
}

// Characters move along the centers of tiles. A fractional column (e.g. 13.5)
// gives a point between two tiles, which is where Pac-Man starts.
export function tileCenterPixel(col, row) {
  const { x, y } = tileToPixel(col, row);
  return { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 };
}

// The maze tile that contains a screen pixel.
export function pixelToTile(x, y) {
  return {
    col: Math.floor(x / TILE_SIZE),
    row: Math.floor(y / TILE_SIZE) - HUD_TOP_ROWS,
  };
}

export function countTiles(tileType) {
  let count = 0;
  for (const rowTiles of tiles) {
    for (const tile of rowTiles) {
      if (tile === tileType) {
        count++;
      }
    }
  }
  return count;
}
