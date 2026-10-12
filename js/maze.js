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

function isInsideMaze(col, row) {
  return col >= 0 && col < MAZE_COLUMNS && row >= 0 && row < MAZE_ROWS;
}

// Callers always pass (col, row) like (x, y); this is the only place where
// the order flips to [row][col], because the array is a list of rows.
export function tileAt(col, row) {
  if (!isInsideMaze(col, row)) {
    // Outside the maze counts as open space, so the tunnels lead off-screen.
    return TILE.EMPTY;
  }
  return MAZE_LAYOUT[row][col];
}

export function isWall(col, row) {
  return tileAt(col, row) === TILE.WALL;
}

// Top-left screen pixel of a maze tile; the maze starts below the top HUD.
export function tileToPixel(col, row) {
  return {
    x: col * TILE_SIZE,
    y: (row + HUD_TOP_ROWS) * TILE_SIZE,
  };
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
  for (const rowText of MAZE_LAYOUT) {
    for (const tile of rowText) {
      if (tile === tileType) {
        count++;
      }
    }
  }
  return count;
}
