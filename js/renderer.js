import {
  TILE_SIZE,
  MAZE_COLUMNS,
  MAZE_ROWS,
  TILE,
  COLORS,
  WALL_THICKNESS,
  WALL_LINE_PIXEL,
  DOUBLE_WALL_SPACING,
  DOT_SIZE,
  GHOST_DOOR_THICKNESS,
  POWER_PELLET_PIXELS,
  LIT_PIXEL,
} from './constants.js';
import { tileAt, isWall, tileToPixel } from './maze.js';
import { getWallLines } from './wallShapes.js';

// The door sits in the ghost house's double top wall, centered between its lines.
const GHOST_DOOR_TOP =
  WALL_LINE_PIXEL + (DOUBLE_WALL_SPACING + WALL_THICKNESS - GHOST_DOOR_THICKNESS) / 2;

export function drawMaze(context) {
  drawWalls(context);
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLUMNS; col++) {
      drawTileContent(context, col, row);
    }
  }
}

function drawTileContent(context, col, row) {
  const tile = tileAt(col, row);
  if (tile === TILE.DOT) {
    drawDot(context, col, row);
  } else if (tile === TILE.POWER_PELLET) {
    drawPowerPellet(context, col, row);
  } else if (tile === TILE.GHOST_DOOR) {
    drawGhostDoor(context, col, row);
  }
}

function drawWalls(context) {
  context.fillStyle = COLORS.WALL;
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLUMNS; col++) {
      if (isWall(col, row)) {
        drawWallTile(context, col, row);
      }
    }
  }
}

function drawWallTile(context, col, row) {
  const { x, y } = tileToPixel(col, row);
  for (const line of getWallLines(col, row)) {
    drawWallLine(context, x, y, line);
  }
}

// Corners are rounded; straight walls and T-junctions are drawn arm by arm.
function drawWallLine(context, x, y, line) {
  if (line.corner) {
    drawRoundedCorner(context, x, y, line);
  } else {
    for (const arm of line.arms) {
      drawArm(context, x, y, line, arm);
    }
  }
}

// The pixel at the tile edge in a direction: 0 going back, TILE_SIZE - 1 going forward.
function edgePixel(direction) {
  return direction > 0 ? TILE_SIZE - 1 : 0;
}

// Fills the pixels between two offsets (both included) inside a tile,
// along the line's row or column.
function fillHorizontalRun(context, x, y, lineY, fromPixel, toPixel) {
  const start = Math.min(fromPixel, toPixel);
  const length = Math.abs(toPixel - fromPixel) + 1;
  context.fillRect(x + start, y + lineY, length, WALL_THICKNESS);
}

function fillVerticalRun(context, x, y, lineX, fromPixel, toPixel) {
  const start = Math.min(fromPixel, toPixel);
  const length = Math.abs(toPixel - fromPixel) + 1;
  context.fillRect(x + lineX, y + start, WALL_THICKNESS, length);
}

// An arm goes from the line's crossing point to the tile edge, so it meets
// the neighbor's arm pixel-to-pixel with no gap.
function drawArm(context, x, y, { lineX, lineY }, { deltaCol, deltaRow }) {
  if (deltaCol !== 0) {
    fillHorizontalRun(context, x, y, lineY, lineX, edgePixel(deltaCol));
  } else {
    fillVerticalRun(context, x, y, lineX, lineY, edgePixel(deltaRow));
  }
}

// Both arms stop `cornerRadius` pixels before the corner point, and a
// quarter circle of pixels joins them.
function drawRoundedCorner(context, x, y, { lineX, lineY, cornerRadius, corner }) {
  const { horizontalDirection, verticalDirection } = corner;
  const runStartX = lineX + horizontalDirection * cornerRadius;
  const runStartY = lineY + verticalDirection * cornerRadius;
  fillHorizontalRun(context, x, y, lineY, runStartX, edgePixel(horizontalDirection));
  fillVerticalRun(context, x, y, lineX, runStartY, edgePixel(verticalDirection));

  for (const { alongHorizontal, alongVertical } of cornerArcPixels(cornerRadius)) {
    context.fillRect(
      x + lineX + horizontalDirection * alongHorizontal,
      y + lineY + verticalDirection * alongVertical,
      WALL_THICKNESS,
      WALL_THICKNESS,
    );
  }
}

const arcPixelsByRadius = new Map();

// Pixels of a quarter circle that bends from the horizontal arm into the
// vertical one, measured from the corner point along each arm. Uses the
// Bresenham midpoint circle algorithm: whole pixels, one pixel thick, no
// gaps, and arcs of different radii share a center so parallel lines stay
// evenly spaced.
function cornerArcPixels(radius) {
  if (arcPixelsByRadius.has(radius)) {
    return arcPixelsByRadius.get(radius);
  }

  const pixels = [];
  let circleX = 0;
  let circleY = radius;
  let decision = 3 - 2 * radius;
  // One eighth of the circle is computed; mirroring it on the diagonal gives
  // the quarter we need.
  while (circleX <= circleY) {
    pixels.push({ alongHorizontal: radius - circleX, alongVertical: radius - circleY });
    pixels.push({ alongHorizontal: radius - circleY, alongVertical: radius - circleX });
    if (decision < 0) {
      decision += 4 * circleX + 6;
    } else {
      decision += 4 * (circleX - circleY) + 10;
      circleY--;
    }
    circleX++;
  }

  arcPixelsByRadius.set(radius, pixels);
  return pixels;
}

function drawDot(context, col, row) {
  const { x, y } = tileToPixel(col, row);
  const inset = (TILE_SIZE - DOT_SIZE) / 2;
  context.fillStyle = COLORS.DOT;
  context.fillRect(x + inset, y + inset, DOT_SIZE, DOT_SIZE);
}

function drawPowerPellet(context, col, row) {
  const { x, y } = tileToPixel(col, row);
  context.fillStyle = COLORS.POWER_PELLET;
  POWER_PELLET_PIXELS.forEach((rowPixels, pixelRow) => {
    [...rowPixels].forEach((pixel, pixelCol) => {
      if (pixel === LIT_PIXEL) {
        context.fillRect(x + pixelCol, y + pixelRow, 1, 1);
      }
    });
  });
}

function drawGhostDoor(context, col, row) {
  const { x, y } = tileToPixel(col, row);
  context.fillStyle = COLORS.GHOST_DOOR;
  context.fillRect(x, y + GHOST_DOOR_TOP, TILE_SIZE, GHOST_DOOR_THICKNESS);
}
