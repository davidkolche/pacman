import { TILE_SIZE, MAZE_COLUMNS, MS_PER_SECOND, TUNNEL_OFFSCREEN_TILES } from './constants.js';
import { tileCenterPixel, pixelToTile } from './maze.js';

const MAZE_WIDTH = MAZE_COLUMNS * TILE_SIZE;
const TUNNEL_MARGIN = TUNNEL_OFFSCREEN_TILES * TILE_SIZE;
// Wrapping jumps a whole number of tiles, so characters stay on the tile-center rail.
const TUNNEL_WRAP_DISTANCE = MAZE_WIDTH + 2 * TUNNEL_MARGIN;

export function isOpposite(first, second) {
  return first.x === -second.x && first.y === -second.y;
}

// Moves a coordinate toward a target by at most maxStep, landing on it exactly.
export function approach(value, target, maxStep) {
  if (Math.abs(target - value) <= maxStep) {
    return target;
  }
  return value + Math.sign(target - value) * maxStep;
}

// What Pac-Man and the ghosts have in common: a position on the tile grid,
// a direction and a speed. How each one decides where to go stays in its
// own class.
export class Entity {
  constructor(startTile, startDirection) {
    // (x, y) is the center of the body, in screen pixels. It can be a
    // fraction: at 80% speed Pac-Man moves about 1.01 pixels per update.
    const start = tileCenterPixel(startTile.col, startTile.row);
    this.x = start.x;
    this.y = start.y;
    this.direction = startDirection;
    // In pixels per second; each subclass sets its own.
    this.speed = 0;
  }

  distanceThisUpdate(deltaMs) {
    return this.speed * deltaMs / MS_PER_SECOND;
  }

  currentTile() {
    return pixelToTile(this.x, this.y);
  }

  currentTileCenter() {
    const { col, row } = this.currentTile();
    return tileCenterPixel(col, row);
  }

  isAtTileCenter() {
    const center = this.currentTileCenter();
    return this.x === center.x && this.y === center.y;
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

  wrapThroughTunnel() {
    if (this.x < -TUNNEL_MARGIN) {
      this.x += TUNNEL_WRAP_DISTANCE;
    } else if (this.x > MAZE_WIDTH + TUNNEL_MARGIN) {
      this.x -= TUNNEL_WRAP_DISTANCE;
    }
  }
}
