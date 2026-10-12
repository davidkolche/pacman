import {
  TILE_SIZE,
  MAZE_COLUMNS,
  MAZE_ROWS,
  TILE,
  WALL_LINE_PIXEL,
  WALL_CORNER_RADIUS,
  DOUBLE_WALL_SPACING,
} from './constants.js';
import { tileAt } from './maze.js';

// Decides how every wall tile should look (which lines, where, which corner
// radius). It draws nothing: renderer.js turns these descriptions into pixels.
// The maze never changes, so everything is computed once when the module loads.

// The second line must still fit inside the tile on both sides of the first.
console.assert(
  DOUBLE_WALL_SPACING <= WALL_LINE_PIXEL && WALL_LINE_PIXEL + DOUBLE_WALL_SPACING < TILE_SIZE,
  'DOUBLE_WALL_GAP is too large: the second wall line would leave its tile',
);

const ARM_DIRECTIONS = [
  { deltaCol: 0, deltaRow: -1 }, // up
  { deltaCol: 0, deltaRow: 1 }, // down
  { deltaCol: -1, deltaRow: 0 }, // left
  { deltaCol: 1, deltaRow: 0 }, // right
];

function tileKey(col, row) {
  return `${col},${row}`;
}

function isInsideMaze(col, row) {
  return col >= 0 && col < MAZE_COLUMNS && row >= 0 && row < MAZE_ROWS;
}

function findTiles(isWanted) {
  const tiles = [];
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLUMNS; col++) {
      if (isWanted(col, row)) {
        tiles.push({ col, row });
      }
    }
  }
  return tiles;
}

// Breadth-first "paint bucket": starting from some tiles, keep spreading to
// up/down/left/right neighbors that canEnter allows, until nothing new is reached.
function floodFill(startTiles, canEnter) {
  const reached = new Set();
  const queue = [];
  for (const { col, row } of startTiles) {
    reached.add(tileKey(col, row));
    queue.push({ col, row });
  }

  while (queue.length > 0) {
    const { col, row } = queue.shift();
    for (const { deltaCol, deltaRow } of ARM_DIRECTIONS) {
      const nextCol = col + deltaCol;
      const nextRow = row + deltaRow;
      const key = tileKey(nextCol, nextRow);
      if (isInsideMaze(nextCol, nextRow) && !reached.has(key) && canEnter(nextCol, nextRow)) {
        reached.add(key);
        queue.push({ col: nextCol, row: nextRow });
      }
    }
  }
  return reached;
}

const isWallTile = (col, row) => tileAt(col, row) === TILE.WALL;
const isDoorTile = (col, row) => tileAt(col, row) === TILE.GHOST_DOOR;
const isOnGridEdge = (col, row) =>
  col === 0 || row === 0 || col === MAZE_COLUMNS - 1 || row === MAZE_ROWS - 1;

const playfieldStart = findTiles((col, row) => tileAt(col, row) === TILE.DOT).slice(0, 1);

// Corridors and tunnels: everywhere Pac-Man can go. The boxes outside the
// maze and the ghost-house interior are walled off, so they are not included.
const mainField = floodFill(
  playfieldStart,
  (col, row) => !isWallTile(col, row) && !isDoorTile(col, row),
);

// Like mainField, but ghosts pass the door, so this also reaches the
// ghost-house interior. The door itself still counts as solid wall.
const openTiles = floodFill(playfieldStart, (col, row) => !isWallTile(col, row));
findTiles(isDoorTile).forEach(({ col, row }) => openTiles.delete(tileKey(col, row)));

// Every wall connected to the edge of the grid belongs to the outer border.
const outerBorderWalls = floodFill(
  findTiles((col, row) => isWallTile(col, row) && isOnGridEdge(col, row)),
  isWallTile,
);

const doorNeighborWalls = findTiles(isDoorTile).flatMap(({ col, row }) =>
  ARM_DIRECTIONS
    .map(({ deltaCol, deltaRow }) => ({ col: col + deltaCol, row: row + deltaRow }))
    .filter((tile) => isWallTile(tile.col, tile.row)),
);
const ghostHouseWalls = floodFill(doorNeighborWalls, isWallTile);

function isMainField(col, row) {
  return mainField.has(tileKey(col, row));
}

// Outside the grid counts as solid, so the border has no lines along the
// screen edge, but tunnel walls still reach it.
function isSolid(col, row) {
  return !openTiles.has(tileKey(col, row));
}

// An arm connects this wall tile to a neighboring solid tile, but only along
// the edge of a wall block. Inside a thick block both sides of the pair are
// solid too, so no line is drawn there and the block looks hollow.
function hasWallArm(col, row, deltaCol, deltaRow) {
  const neighborCol = col + deltaCol;
  const neighborRow = row + deltaRow;
  if (!isSolid(neighborCol, neighborRow)) {
    return false;
  }
  return pairSideTiles(col, row, deltaCol, deltaRow)
    .flat()
    .some(({ col: sideCol, row: sideRow }) => !isSolid(sideCol, sideRow));
}

// The tiles on both sides of an arm (perpendicular to it): the side with
// smaller coordinates first (above / left), then the other side.
function pairSideTiles(col, row, deltaCol, deltaRow) {
  const neighborCol = col + deltaCol;
  const neighborRow = row + deltaRow;
  const sideCol = deltaRow === 0 ? 0 : 1;
  const sideRow = deltaCol === 0 ? 0 : 1;
  return [
    [
      { col: col - sideCol, row: row - sideRow },
      { col: neighborCol - sideCol, row: neighborRow - sideRow },
    ],
    [
      { col: col + sideCol, row: row + sideRow },
      { col: neighborCol + sideCol, row: neighborRow + sideRow },
    ],
  ];
}

// The second line moves away from the main corridors: toward the screen edge
// or outside box for the border, toward the inside for the ghost house.
// Returns -1, 0 or 1 along the axis perpendicular to the arm.
function awayFromMainField(col, row, arm) {
  const [smallerSide, largerSide] = pairSideTiles(col, row, arm.deltaCol, arm.deltaRow);
  const touchesMainField = (side) => side.some((tile) => isMainField(tile.col, tile.row));
  if (touchesMainField(smallerSide)) {
    return 1;
  }
  if (touchesMainField(largerSide)) {
    return -1;
  }
  return 0;
}

function secondLineOffset(col, row, horizontalArm, verticalArm) {
  return {
    x: verticalArm ? awayFromMainField(col, row, verticalArm) : 0,
    y: horizontalArm ? awayFromMainField(col, row, horizontalArm) : 0,
  };
}

// Two parallel lines around a corner are circles with the same center, so
// the radii differ by exactly the spacing: the line on the outside of the
// turn gets a bigger radius, the line on the inside a smaller one.
function secondLineRadius(corner, offset) {
  const isOutsideOfTurn = offset.x === -corner.horizontalDirection;
  if (isOutsideOfTurn) {
    return WALL_CORNER_RADIUS + DOUBLE_WALL_SPACING;
  }
  return Math.max(0, WALL_CORNER_RADIUS - DOUBLE_WALL_SPACING);
}

function describeWallTile(col, row) {
  const arms = ARM_DIRECTIONS.filter(
    ({ deltaCol, deltaRow }) => hasWallArm(col, row, deltaCol, deltaRow),
  );
  const horizontalArm = arms.find((arm) => arm.deltaCol !== 0);
  const verticalArm = arms.find((arm) => arm.deltaRow !== 0);
  // Exactly one horizontal and one vertical arm is a corner, which gets rounded.
  const corner = arms.length === 2 && horizontalArm && verticalArm
    ? { horizontalDirection: horizontalArm.deltaCol, verticalDirection: verticalArm.deltaRow }
    : null;

  const lines = [{
    arms,
    corner,
    lineX: WALL_LINE_PIXEL,
    lineY: WALL_LINE_PIXEL,
    cornerRadius: WALL_CORNER_RADIUS,
  }];

  const key = tileKey(col, row);
  if (outerBorderWalls.has(key) || ghostHouseWalls.has(key)) {
    const offset = secondLineOffset(col, row, horizontalArm, verticalArm);
    lines.push({
      arms,
      corner,
      lineX: WALL_LINE_PIXEL + offset.x * DOUBLE_WALL_SPACING,
      lineY: WALL_LINE_PIXEL + offset.y * DOUBLE_WALL_SPACING,
      cornerRadius: corner ? secondLineRadius(corner, offset) : WALL_CORNER_RADIUS,
    });
  }
  return lines;
}

const wallLinesByTile = new Map(
  findTiles(isWallTile).map(({ col, row }) => [tileKey(col, row), describeWallTile(col, row)]),
);

// The lines to draw for one wall tile (one for inner walls, two for the outer
// border and the ghost house). Non-wall tiles have none.
export function getWallLines(col, row) {
  return wallLinesByTile.get(tileKey(col, row)) ?? [];
}
