import {
  TILE_SIZE,
  MAZE_COLUMNS,
  MS_PER_SECOND,
  MAX_SPEED_PIXELS_PER_SECOND,
  PACMAN_SPEED_LEVEL_1,
  PACMAN_START_TILE,
  PACMAN_START_DIRECTION,
  TUNNEL_OFFSCREEN_TILES,
  TILE,
  EVENTS,
  DOT_PAUSE_FRAMES,
  POWER_PELLET_PAUSE_FRAMES,
} from './constants.js';
import {
  tileCenterPixel,
  pixelToTile,
  isInsideMaze,
  isBlockedForPacman,
  takeFood,
} from './maze.js';
import { emit } from './events.js';

const MAZE_WIDTH = MAZE_COLUMNS * TILE_SIZE;
const TUNNEL_MARGIN = TUNNEL_OFFSCREEN_TILES * TILE_SIZE;
// Wrapping jumps a whole number of tiles, so Pac-Man stays on the tile-center rail.
const TUNNEL_WRAP_DISTANCE = MAZE_WIDTH + 2 * TUNNEL_MARGIN;

function isOpposite(first, second) {
  return first.x === -second.x && first.y === -second.y;
}

// Moves a coordinate toward a target by at most maxStep, landing on it exactly.
function approach(value, target, maxStep) {
  if (Math.abs(target - value) <= maxStep) {
    return target;
  }
  return value + Math.sign(target - value) * maxStep;
}

export class Pacman {
  constructor() {
    // (x, y) is the center of Pac-Man's body, in screen pixels. It can be a
    // fraction: at 80% speed he moves about 1.01 pixels per update.
    const start = tileCenterPixel(PACMAN_START_TILE.col, PACMAN_START_TILE.row);
    this.x = start.x;
    this.y = start.y;
    // Kept even while stopped, so the mouth still faces the wall he ran into.
    this.direction = PACMAN_START_DIRECTION;
    this.queuedDirection = null;
    this.isMoving = true;
    this.speed = MAX_SPEED_PIXELS_PER_SECOND * PACMAN_SPEED_LEVEL_1;
    // Drives the chomp animation; it grows only while Pac-Man actually moves.
    this.distanceTraveled = 0;
    // Counted in fixed updates, which are exactly the arcade's 60 frames per second.
    this.pauseFramesRemaining = 0;
  }

  // A reversal is always possible (the tile behind him is the one he came
  // from), so it happens at once; other turns wait until the tile allows them.
  requestDirection(direction) {
    if (!direction) {
      return;
    }
    if (isOpposite(direction, this.direction)) {
      this.direction = direction;
    }
    this.queuedDirection = direction;
  }

  // Moves in steps that never pass a tile center, because a center is where
  // Pac-Man may have to stop at a wall.
  update(deltaMs) {
    if (this.pauseFramesRemaining > 0) {
      this.pauseFramesRemaining--;
      return;
    }

    let remainingDistance = this.speed * deltaMs / MS_PER_SECOND;

    while (remainingDistance > 0) {
      this.tryQueuedTurn();
      // Checked after the turn: an early corner turn puts him on the center
      // line of the new direction without ever reaching the center along the old one.
      this.eatAtTileCenter();
      this.isMoving = !(this.isAtCenterAlongDirection() && !this.canMove(this.direction));
      if (!this.isMoving) {
        return;
      }
      const step = Math.min(remainingDistance, this.distanceToNextCenter());
      this.moveBy(step);
      remainingDistance -= step;
      this.wrapThroughTunnel();
      // A step always ends exactly on the next center, so no center is skipped.
      this.eatAtTileCenter();
    }
  }

  // Pac-Man only announces what he ate; points and everything else that
  // reacts to eating live in the modules that listen for these events.
  eatAtTileCenter() {
    if (!this.isAtCenterAlongDirection()) {
      return;
    }
    const { col, row } = this.currentTile();
    const food = takeFood(col, row);
    if (food === TILE.DOT) {
      this.pauseFramesRemaining = DOT_PAUSE_FRAMES;
      emit(EVENTS.DOT_EATEN, { col, row });
    } else if (food === TILE.POWER_PELLET) {
      this.pauseFramesRemaining = POWER_PELLET_PAUSE_FRAMES;
      emit(EVENTS.POWER_PELLET_EATEN, { col, row });
    }
  }

  // Cornering: the turn is taken anywhere inside the current tile (up to 4
  // pixels before its center or 3 after), as soon as the tile in the new
  // direction is open. moveBy() then cuts the corner diagonally.
  tryQueuedTurn() {
    const turn = this.queuedDirection;
    if (turn && turn !== this.direction && this.canMove(turn)) {
      this.direction = turn;
    }
  }

  currentTile() {
    return pixelToTile(this.x, this.y);
  }

  currentTileCenter() {
    const { col, row } = this.currentTile();
    return tileCenterPixel(col, row);
  }

  isAtCenterAlongDirection() {
    const center = this.currentTileCenter();
    return this.direction.x !== 0 ? this.x === center.x : this.y === center.y;
  }

  canMove(direction) {
    const { col, row } = this.currentTile();
    // Off-screen in the tunnel every tile reads as open, so only the tunnel's
    // own direction is allowed there.
    if (!isInsideMaze(col, row)) {
      return direction.y === 0;
    }
    return !isBlockedForPacman(col + direction.x, row + direction.y);
  }

  // Distance along the current direction to the next tile center ahead.
  // Exactly at a center, the next one is a full tile away.
  distanceToNextCenter() {
    const center = this.currentTileCenter();
    const offset = this.direction.x !== 0 ? this.x - center.x : this.y - center.y;
    const step = this.direction.x + this.direction.y;
    const offsetAlongDirection = offset * step;
    return offsetAlongDirection < 0 ? -offsetAlongDirection : TILE_SIZE - offsetAlongDirection;
  }

  // Moves forward and, after a corner cut, also back toward the center line
  // of the other axis by the same distance. Both happen in the same step,
  // which is the diagonal shortcut that makes cornering faster.
  // Approaching the next center (instead of adding the distance) lands on it
  // exactly, with no floating-point drift, so isAtCenterAlongDirection() works.
  moveBy(distance) {
    const center = this.currentTileCenter();
    const distanceAhead = this.distanceToNextCenter();
    if (this.direction.x !== 0) {
      this.x = approach(this.x, this.x + this.direction.x * distanceAhead, distance);
      this.y = approach(this.y, center.y, distance);
    } else {
      this.y = approach(this.y, this.y + this.direction.y * distanceAhead, distance);
      this.x = approach(this.x, center.x, distance);
    }
    this.distanceTraveled += distance;
  }

  wrapThroughTunnel() {
    if (this.x < -TUNNEL_MARGIN) {
      this.x += TUNNEL_WRAP_DISTANCE;
    } else if (this.x > MAZE_WIDTH + TUNNEL_MARGIN) {
      this.x -= TUNNEL_WRAP_DISTANCE;
    }
  }
}
