import {
  MAX_SPEED_PIXELS_PER_SECOND,
  DIRECTION,
  GHOST_STATE,
  GHOST_STARTS,
  GHOST_HOUSE_EXIT_TILE,
  GHOST_HOUSE_EXIT_DIRECTION,
  GHOST_HOUSE_BOB_RANGE_PX,
  GHOST_HOUSE_SPEED,
  GHOST_SPEED_LEVEL_1,
} from './constants.js';
import { tileCenterPixel, isInsideMaze, isBlockedForGhost } from './maze.js';
import { Entity, isOpposite, approach } from './entity.js';
import { getChaseTarget, chooseDirection } from './ghostAI.js';

const HOUSE_EXIT = tileCenterPixel(GHOST_HOUSE_EXIT_TILE.col, GHOST_HOUSE_EXIT_TILE.row);
const ALL_DIRECTIONS = Object.values(DIRECTION);

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function isWalkableForGhost(col, row) {
  return !isBlockedForGhost(col, row);
}

export class Ghost extends Entity {
  constructor({ name, color, tile, direction, state, bobsInHouse, releaseAfterMs, scatterTile }) {
    // The eyes always look in the direction, so it is kept even while standing still.
    super(tile, direction);
    this.name = name;
    this.color = color;
    this.state = state;
    // Bobbing swings around the start row, not around wherever the ghost is.
    this.houseCenterY = this.y;
    this.bobsInHouse = bobsInHouse;
    this.releaseAfterMs = releaseAfterMs;
    this.timeInHouseMs = 0;
    this.scatterTile = scatterTile;
    // The tile the ghost is heading for, or null while it is not targeting
    // (in the house, or turning at random). Kept so debug mode can draw it.
    this.targetTile = null;
  }

  // The state decides the behavior, and each state checks for itself when
  // it is time to move on to the next one. Before the game clock runs
  // (the first key press), ghosts in the house only bob.
  // chaseInfo: { pacmanTile, pacmanDirection, blinkyTile }, the part of the
  // world the chase targets depend on.
  update(deltaMs, isClockRunning, chaseInfo) {
    this.speed = this.currentSpeed();
    const distance = this.distanceThisUpdate(deltaMs);
    this.targetTile = null;
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
        // Stage 7, part B: head for scatterTile, switched by the mode timer.
        this.roam(distance);
        break;
      case GHOST_STATE.CHASE:
        // Recomputed every update (not only at intersections) so the debug
        // line follows Pac-Man smoothly; only the value at a center matters.
        this.targetTile = getChaseTarget(this.name, {
          ghostTile: this.currentTile(),
          scatterTile: this.scatterTile,
          ...chaseInfo,
        });
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
        // Stage 7, part A: always CHASE; the mode timer (part B) decides later.
        this.state = GHOST_STATE.CHASE;
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
        this.chooseDirectionAtCenter();
      }
      const step = Math.min(remainingDistance, this.distanceToNextCenter());
      this.moveForward(step);
      remainingDistance -= step;
      this.wrapThroughTunnel();
    }
  }

  // With a target the choice is the arcade's greedy rule (ghostAI.js).
  // Off-screen in the tunnel every tile reads as open, so there the ghost
  // just keeps going (canMove allows only the tunnel's own direction).
  chooseDirectionAtCenter() {
    const tile = this.currentTile();
    if (this.targetTile && isInsideMaze(tile.col, tile.row)) {
      this.direction = chooseDirection(tile, this.direction, this.targetTile, isWalkableForGhost);
    } else {
      this.chooseRandomDirection();
    }
  }

  // Ghosts never reverse on their own, so in a corridor there is only one
  // choice; a real choice happens only at intersections. The maze has no
  // dead ends, but if a ghost were ever stuck, reversing beats freezing.
  chooseRandomDirection() {
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

  canMove(direction) {
    const { col, row } = this.currentTile();
    // Off-screen in the tunnel every tile reads as open, so only the tunnel's
    // own direction is allowed there.
    if (!isInsideMaze(col, row)) {
      return direction.y === 0;
    }
    return !isBlockedForGhost(col + direction.x, row + direction.y);
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
}

// A function rather than a fixed array, so a new set of ghosts can be made
// whenever a life is lost or a level starts (stage 8).
export function createGhosts() {
  return GHOST_STARTS.map((start) => new Ghost(start));
}
