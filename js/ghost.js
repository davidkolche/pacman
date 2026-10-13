import {
  TILE_SIZE,
  MAZE_COLUMNS,
  MS_PER_SECOND,
  MAX_SPEED_PIXELS_PER_SECOND,
  DIRECTION,
  TUNNEL_OFFSCREEN_TILES,
  GHOST_STATE,
  GHOST_STARTS,
  GHOST_HOUSE_EXIT_TILE,
  GHOST_HOUSE_EXIT_DIRECTION,
  GHOST_HOUSE_BOB_RANGE_PX,
  GHOST_HOUSE_SPEED,
  GHOST_SPEED_LEVEL_1,
} from './constants.js';
import { tileCenterPixel, pixelToTile, isInsideMaze, isBlockedForGhost } from './maze.js';

// Copied from pacman.js on purpose: these grid helpers move to a shared
// entity.js at the start of stage 7, once both sides are known.
const MAZE_WIDTH = MAZE_COLUMNS * TILE_SIZE;
const TUNNEL_MARGIN = TUNNEL_OFFSCREEN_TILES * TILE_SIZE;
const TUNNEL_WRAP_DISTANCE = MAZE_WIDTH + 2 * TUNNEL_MARGIN;

const HOUSE_EXIT = tileCenterPixel(GHOST_HOUSE_EXIT_TILE.col, GHOST_HOUSE_EXIT_TILE.row);
const ALL_DIRECTIONS = Object.values(DIRECTION);

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

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export class Ghost {
  constructor({ name, color, tile, direction, state, bobsInHouse, releaseAfterMs }) {
    this.name = name;
    this.color = color;
    // (x, y) is the center of the ghost's body, in screen pixels.
    const start = tileCenterPixel(tile.col, tile.row);
    this.x = start.x;
    this.y = start.y;
    // The eyes always look this way, so it is kept even while standing still.
    this.direction = direction;
    this.state = state;
    // Bobbing swings around the start row, not around wherever the ghost is.
    this.houseCenterY = start.y;
    this.bobsInHouse = bobsInHouse;
    this.releaseAfterMs = releaseAfterMs;
    this.timeInHouseMs = 0;
  }

  // The state decides the behavior, and each state checks for itself when
  // it is time to move on to the next one. Before the game clock runs
  // (the first key press), ghosts in the house only bob.
  update(deltaMs, isClockRunning) {
    const distance = this.currentSpeed() * deltaMs / MS_PER_SECOND;
    switch (this.state) {
      case GHOST_STATE.IN_HOUSE:
        this.bobInHouse(distance);
        if (isClockRunning) {
          this.waitForRelease(deltaMs);
        }
        break;
      case GHOST_STATE.LEAVING_HOUSE:
        this.leaveHouse(distance);
        break;
      case GHOST_STATE.SCATTER:
      case GHOST_STATE.CHASE:
        // Stage 7: head for a target tile instead of turning at random.
        this.roam(distance);
        break;
      case GHOST_STATE.FRIGHTENED:
        // Stage 7: blue, and slower; random turns are already arcade behavior.
        this.roam(distance);
        break;
      case GHOST_STATE.EATEN:
        // Stage 8: only the eyes, hurrying back to the house.
        break;
    }
  }

  currentSpeed() {
    const isInsideHouse =
      this.state === GHOST_STATE.IN_HOUSE || this.state === GHOST_STATE.LEAVING_HOUSE;
    const speedFraction = isInsideHouse ? GHOST_HOUSE_SPEED : GHOST_SPEED_LEVEL_1;
    return MAX_SPEED_PIXELS_PER_SECOND * speedFraction;
  }

  // TODO (stage 8): replace this timer with the arcade dot counters.
  waitForRelease(deltaMs) {
    this.timeInHouseMs += deltaMs;
    if (this.timeInHouseMs >= this.releaseAfterMs) {
      this.state = GHOST_STATE.LEAVING_HOUSE;
    }
  }

  // Moves up or down and turns around at the edge of the range. Turning the
  // direction (not just the movement) is what makes the eyes follow.
  bobInHouse(distance) {
    if (!this.bobsInHouse) {
      return;
    }
    const isMovingUp = this.direction === DIRECTION.UP;
    const edgeY = isMovingUp
      ? this.houseCenterY - GHOST_HOUSE_BOB_RANGE_PX
      : this.houseCenterY + GHOST_HOUSE_BOB_RANGE_PX;
    this.y = approach(this.y, edgeY, distance);
    if (this.y === edgeY) {
      this.direction = isMovingUp ? DIRECTION.DOWN : DIRECTION.UP;
    }
  }

  // A fixed path, one leg at a time: back to the middle row (bobbing may
  // have left the ghost above or below it), across to the door's column,
  // then straight up through the door to the exit.
  leaveHouse(distance) {
    if (this.x !== HOUSE_EXIT.x && this.y !== this.houseCenterY) {
      this.moveVerticallyTo(this.houseCenterY, distance);
    } else if (this.x !== HOUSE_EXIT.x) {
      this.moveHorizontallyTo(HOUSE_EXIT.x, distance);
    } else {
      this.moveVerticallyTo(HOUSE_EXIT.y, distance);
      if (this.y === HOUSE_EXIT.y) {
        this.state = GHOST_STATE.SCATTER;
        this.direction = GHOST_HOUSE_EXIT_DIRECTION;
      }
    }
  }

  // Only called while the ghost is not there yet, so the direction (and the
  // eyes) always points toward the target.
  moveVerticallyTo(targetY, distance) {
    this.direction = targetY < this.y ? DIRECTION.UP : DIRECTION.DOWN;
    this.y = approach(this.y, targetY, distance);
  }

  moveHorizontallyTo(targetX, distance) {
    this.direction = targetX < this.x ? DIRECTION.LEFT : DIRECTION.RIGHT;
    this.x = approach(this.x, targetX, distance);
  }

  // Like Pac-Man, moves in steps that never pass a tile center, because a
  // center is where the ghost picks its next direction. No cornering and no
  // stopping: a ghost always has somewhere to go.
  roam(distance) {
    let remainingDistance = distance;
    while (remainingDistance > 0) {
      if (this.isAtTileCenter()) {
        this.chooseDirection();
      }
      const step = Math.min(remainingDistance, this.distanceToNextCenter());
      this.moveForward(step);
      remainingDistance -= step;
      this.wrapThroughTunnel();
    }
  }

  // Ghosts never reverse on their own, so in a corridor there is only one
  // choice; a real choice happens only at intersections. The maze has no
  // dead ends, but if a ghost were ever stuck, reversing beats freezing.
  chooseDirection() {
    const allowed = ALL_DIRECTIONS.filter(
      (direction) => !isOpposite(direction, this.direction) && this.canMove(direction),
    );
    this.direction = allowed.length > 0 ? pickRandom(allowed) : this.reverseDirection();
  }

  // Looked up in DIRECTION (not built as a new object) so comparisons by
  // identity, like direction === DIRECTION.UP, keep working.
  reverseDirection() {
    return ALL_DIRECTIONS.find((direction) => isOpposite(direction, this.direction));
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

  canMove(direction) {
    const { col, row } = this.currentTile();
    // Off-screen in the tunnel every tile reads as open, so only the tunnel's
    // own direction is allowed there.
    if (!isInsideMaze(col, row)) {
      return direction.y === 0;
    }
    return !isBlockedForGhost(col + direction.x, row + direction.y);
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

  // Approaching the next center (instead of adding the distance) lands on it
  // exactly, with no floating-point drift, so isAtTileCenter() works.
  moveForward(distance) {
    const distanceAhead = this.distanceToNextCenter();
    if (this.direction.x !== 0) {
      this.x = approach(this.x, this.x + this.direction.x * distanceAhead, distance);
    } else {
      this.y = approach(this.y, this.y + this.direction.y * distanceAhead, distance);
    }
  }

  wrapThroughTunnel() {
    if (this.x < -TUNNEL_MARGIN) {
      this.x += TUNNEL_WRAP_DISTANCE;
    } else if (this.x > MAZE_WIDTH + TUNNEL_MARGIN) {
      this.x -= TUNNEL_WRAP_DISTANCE;
    }
  }
}

// A function rather than a fixed array, so a new set of ghosts can be made
// whenever a life is lost or a level starts (stage 8).
export function createGhosts() {
  return GHOST_STARTS.map((start) => new Ghost(start));
}
