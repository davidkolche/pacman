import {
  DIRECTION,
  GHOST_NAME,
  GHOST_DIRECTION_PRIORITY,
  NO_UP_TURN_TILES,
  PINKY_TILES_AHEAD,
  INKY_TILES_AHEAD,
  CLYDE_SHY_DISTANCE_TILES,
} from './constants.js';
import { isOpposite } from './entity.js';

// Ghost "brains" (The Pac-Man Dossier). Every function here is pure: it only
// reads its arguments (and frozen constants) and returns a new value. Nothing
// here knows about Ghost, Pacman or the canvas, so each rule can be checked
// by calling it with a few numbers.

// Comparing squared distances gives the same order as real distances
// (a < b exactly when a² < b²), without the cost of a square root.
export function squaredDistance(first, second) {
  const deltaCol = first.col - second.col;
  const deltaRow = first.row - second.row;
  return deltaCol * deltaCol + deltaRow * deltaRow;
}

// count tiles in front of a tile. When facing up, the arcade code overflows
// into the other axis and the point also moves count tiles left; the bug is
// kept on purpose, because it shapes how Pinky and Inky really play.
export function tilesAhead(tile, direction, count) {
  const overflowCol = direction === DIRECTION.UP ? -count : 0;
  return {
    col: tile.col + direction.x * count + overflowCol,
    row: tile.row + direction.y * count,
  };
}

// Blinky chases Pac-Man directly.
export function blinkyChaseTarget(pacmanTile) {
  return { col: pacmanTile.col, row: pacmanTile.row };
}

// Pinky aims at where Pac-Man is going, to cut him off from the front.
export function pinkyChaseTarget(pacmanTile, pacmanDirection) {
  return tilesAhead(pacmanTile, pacmanDirection, PINKY_TILES_AHEAD);
}

// Inky doubles the vector from Blinky to a point just ahead of Pac-Man
// (target = pivot + (pivot - blinky)), so he closes in from the side
// opposite Blinky and the two trap Pac-Man between them.
export function inkyChaseTarget(pacmanTile, pacmanDirection, blinkyTile) {
  const pivot = tilesAhead(pacmanTile, pacmanDirection, INKY_TILES_AHEAD);
  return {
    col: 2 * pivot.col - blinkyTile.col,
    row: 2 * pivot.row - blinkyTile.row,
  };
}

// Clyde chases like Blinky from far away, but once he gets close he turns
// back toward his corner, so he never quite catches Pac-Man on his own.
export function clydeChaseTarget(clydeTile, pacmanTile, scatterTile) {
  const shyDistanceSquared = CLYDE_SHY_DISTANCE_TILES * CLYDE_SHY_DISTANCE_TILES;
  if (squaredDistance(clydeTile, pacmanTile) > shyDistanceSquared) {
    return blinkyChaseTarget(pacmanTile);
  }
  return { col: scatterTile.col, row: scatterTile.row };
}

const CHASE_TARGETS = Object.freeze({
  [GHOST_NAME.BLINKY]: ({ pacmanTile }) => blinkyChaseTarget(pacmanTile),
  [GHOST_NAME.PINKY]: ({ pacmanTile, pacmanDirection }) =>
    pinkyChaseTarget(pacmanTile, pacmanDirection),
  [GHOST_NAME.INKY]: ({ pacmanTile, pacmanDirection, blinkyTile }) =>
    inkyChaseTarget(pacmanTile, pacmanDirection, blinkyTile),
  [GHOST_NAME.CLYDE]: ({ ghostTile, pacmanTile, scatterTile }) =>
    clydeChaseTarget(ghostTile, pacmanTile, scatterTile),
});

// situation: { ghostTile, scatterTile, pacmanTile, pacmanDirection, blinkyTile }.
// One shape for every ghost; each personality picks the parts it needs.
export function getChaseTarget(ghostName, situation) {
  return CHASE_TARGETS[ghostName](situation);
}

function isNoUpTurnTile(tile) {
  return NO_UP_TURN_TILES.some(({ col, row }) => col === tile.col && row === tile.row);
}

// Greedy choice: the ghost looks only one tile ahead and takes the open
// direction whose next tile is closest to the target in a straight line. It
// never plans a whole route, which is what makes ghosts predictable.
// Reversing is never a choice. isWalkable(col, row) comes from the caller, so
// this works with any maze, including a tiny fake one in a test.
export function chooseDirection(currentTile, currentDirection, targetTile, isWalkable) {
  let bestDirection = null;
  let bestDistance = Infinity;
  for (const direction of GHOST_DIRECTION_PRIORITY) {
    if (isOpposite(direction, currentDirection)) {
      continue;
    }
    if (direction === DIRECTION.UP && isNoUpTurnTile(currentTile)) {
      continue;
    }
    const nextTile = { col: currentTile.col + direction.x, row: currentTile.row + direction.y };
    if (!isWalkable(nextTile.col, nextTile.row)) {
      continue;
    }
    const distance = squaredDistance(nextTile, targetTile);
    // Strictly smaller: on a tie the earlier direction in the priority stays.
    if (distance < bestDistance) {
      bestDirection = direction;
      bestDistance = distance;
    }
  }
  // Only in a dead end (our maze has none): turning back beats freezing.
  return bestDirection ?? reverseOf(currentDirection);
}

// Looked up in DIRECTION (not built as a new object) so comparisons by
// identity, like direction === DIRECTION.UP, keep working.
function reverseOf(direction) {
  return Object.values(DIRECTION).find((candidate) => isOpposite(candidate, direction));
}
