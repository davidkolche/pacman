import {
  MAX_SPEED_PIXELS_PER_SECOND,
  DIRECTION,
  GHOST_STATE,
  GHOST_NAME,
  GHOST_STARTS,
  GHOST_HOUSE_EXIT_TILE,
  GHOST_HOUSE_EXIT_DIRECTION,
  GHOST_HOUSE_BOB_RANGE_PX,
  GHOST_HOUSE_SPEED,
  GHOST_HOUSE_CENTER_TILE,
  GHOST_EATEN_SPEED,
  EATEN_GHOST_WAITS_FOR_FRIGHT_END,
} from './constants.js';
import { tileCenterPixel, isInsideMaze, isBlockedForGhost, isTunnel } from './maze.js';
import { Entity, isOpposite, approach } from './entity.js';
import { getChaseTarget, chooseDirection } from './ghostAI.js';

const HOUSE_EXIT = tileCenterPixel(GHOST_HOUSE_EXIT_TILE.col, GHOST_HOUSE_EXIT_TILE.row);
const HOUSE_CENTER = tileCenterPixel(GHOST_HOUSE_CENTER_TILE.col, GHOST_HOUSE_CENTER_TILE.row);
// The exit point lies between two tiles; eyes reaching the center of either
// one are right above the door.
const ABOVE_DOOR_COLS = [
  Math.floor(GHOST_HOUSE_EXIT_TILE.col),
  Math.ceil(GHOST_HOUSE_EXIT_TILE.col),
];
const ALL_DIRECTIONS = Object.values(DIRECTION);

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function isWalkableForGhost(col, row) {
  return !isBlockedForGhost(col, row);
}

export class Ghost extends Entity {
  constructor(
    { name, color, tile, direction, state, bobsInHouse, scatterTile },
    levelConfig,
  ) {
    // The eyes always look in the direction, so it is kept even while standing still.
    super(tile, direction);
    this.speeds = levelConfig.speeds;
    this.name = name;
    this.color = color;
    this.state = state;
    // Bobbing swings around the start row, not around wherever the ghost is.
    this.houseCenterY = this.y;
    this.bobsInHouse = bobsInHouse;
    this.scatterTile = scatterTile;
    // The tile the ghost is heading for, or null while it is not targeting
    // (in the house, or turning at random). Kept so debug mode can draw it.
    this.targetTile = null;
    // A mode change that came while the ghost could not turn around (in the
    // house or on its way out); it turns around as it comes out.
    this.pendingReversal = false;
    // Set when Pac-Man eats it: once revived, it comes out of the house in
    // scatter or chase, never blue, even if frightened is still running.
    this.wasEaten = false;
    // Cruise Elroy (Dossier) is Blinky's alone. elroyLevel is what the game
    // says this update (0, 1 or 2); activeElroyLevel() decides if it applies.
    this.canBeElroy = name === GHOST_NAME.BLINKY;
    this.elroyLevel = 0;
  }

  // The state decides the behavior, and each state checks for itself when
  // it is time to move on to the next one. The one exception is leaving the
  // house: that is decided by the house's dot counters (ghostHouse.js),
  // which call release().
  // world: { mode, scatterChaseMode, pacmanTile,
  // pacmanDirection, blinkyTile, elroyLevel }, where mode is the mode timer's
  // current mode and scatterChaseMode the one under frightened.
  update(deltaMs, world) {
    // Read before the speed, which depends on it.
    this.elroyLevel = this.canBeElroy ? world.elroyLevel : 0;
    this.speed = this.currentSpeed();
    const distance = this.distanceThisUpdate(deltaMs);
    this.targetTile = null;
    switch (this.state) {
      case GHOST_STATE.IN_HOUSE:
        if (this.bobsInHouse) {
          this.bobAround(this.houseCenterY, distance);
        }
        break;
      case GHOST_STATE.LEAVING_HOUSE:
        this.leaveHouse(distance, this.wasEaten ? world.scatterChaseMode : world.mode);
        break;
      case GHOST_STATE.SCATTER:
        // Cruise Elroy keeps chasing Pac-Man instead of going to his corner.
        this.targetTile = this.activeElroyLevel() > 0 ? this.chaseTargetTile(world) : this.scatterTile;
        this.roam(distance);
        break;
      case GHOST_STATE.CHASE:
        // Recomputed every update (not only at intersections) so the debug
        // line follows Pac-Man smoothly; only the value at a center matters.
        this.targetTile = this.chaseTargetTile(world);
        this.roam(distance);
        break;
      case GHOST_STATE.FRIGHTENED:
        // No target: chooseDirectionAtCenter() turns at random, which is
        // arcade behavior and also ignores the no-up tiles.
        this.roam(distance);
        break;
      case GHOST_STATE.EATEN:
        // Only the eyes, hurrying to the spot above the door. A fractional
        // target is fine for the greedy choice: it only compares distances.
        this.targetTile = GHOST_HOUSE_EXIT_TILE;
        this.roam(distance);
        break;
      case GHOST_STATE.ENTERING_HOUSE:
        this.enterHouse(distance, world.mode);
        break;
      case GHOST_STATE.WAITING_FOR_FRIGHT_END:
        // Revived, but kept inside until frightened ends (ghostHouse.js lets
        // it out). Every ghost bobs here, Blinky too: this is not his doorway.
        this.bobAround(HOUSE_CENTER.y, distance);
        break;
    }
  }

  chaseTargetTile(world) {
    return getChaseTarget(this.name, {
      ghostTile: this.currentTile(),
      scatterTile: this.scatterTile,
      pacmanTile: world.pacmanTile,
      pacmanDirection: world.pacmanDirection,
      blinkyTile: world.blinkyTile,
    });
  }

  // Elroy applies only while Blinky is out hunting (scatter or chase): not
  // in the house or on his way out (he starts inside in our version), not
  // as eyes, not while waiting for frightened to end, and not when blue.
  activeElroyLevel() {
    return this.isDangerous() ? this.elroyLevel : 0;
  }

  // Called by the game whenever the mode timer's mode changes. The timer
  // says what the mode is; the ghost's own state decides how to follow it.
  enterMode(mode, shouldReverse) {
    // Waiting for frightened to end: a new power pellet only makes the wait
    // longer. It neither turns blue nor saves a reversal, so it comes out
    // without turning around.
    if (this.isWaitingForFrightEnd()) {
      return;
    }
    if (this.isInsideHouse()) {
      // It joins the current mode as it comes out (leaveHouse).
      this.pendingReversal = this.pendingReversal || shouldReverse;
      return;
    }
    if (this.isEyes()) {
      return;
    }
    this.state = mode;
    if (shouldReverse) {
      this.direction = this.reverseDirection();
    }
  }

  isInsideHouse() {
    return this.state === GHOST_STATE.IN_HOUSE || this.state === GHOST_STATE.LEAVING_HOUSE;
  }

  // Only the eyes are left, on their way back into the house.
  isEyes() {
    return this.state === GHOST_STATE.EATEN || this.state === GHOST_STATE.ENTERING_HOUSE;
  }

  // Touching Pac-Man: a ghost in scatter or chase kills him, a blue one is
  // eaten, and every other state (in the house, leaving it, eyes) passes by.
  isDangerous() {
    return this.state === GHOST_STATE.SCATTER || this.state === GHOST_STATE.CHASE;
  }

  isEdible() {
    return this.state === GHOST_STATE.FRIGHTENED;
  }

  becomeEaten() {
    this.state = GHOST_STATE.EATEN;
    this.wasEaten = true;
  }

  currentSpeed() {
    return MAX_SPEED_PIXELS_PER_SECOND * this.currentSpeedFraction();
  }

  // The first rule that applies wins. The tunnel comes before frightened:
  // a blue ghost in the tunnel is slowed down like any other (Dossier).
  currentSpeedFraction() {
    // Eyes are never slowed down, not even in the tunnel.
    if (this.isEyes()) {
      return GHOST_EATEN_SPEED;
    }
    if (this.isInsideHouse() || this.isWaitingForFrightEnd()) {
      return GHOST_HOUSE_SPEED;
    }
    const { col, row } = this.currentTile();
    if (isTunnel(col, row)) {
      return this.speeds.ghostTunnel;
    }
    if (this.state === GHOST_STATE.FRIGHTENED) {
      return this.speeds.ghostFright;
    }
    return this.normalSpeedFraction();
  }

  // Cruise Elroy only replaces the normal speed: the tunnel and frightened
  // still slow him down (Dossier).
  normalSpeedFraction() {
    const elroyLevel = this.activeElroyLevel();
    if (elroyLevel === 2) {
      return this.speeds.elroy2;
    }
    if (elroyLevel === 1) {
      return this.speeds.elroy1;
    }
    return this.speeds.ghost;
  }

  // Waiting for its dot counter: only these count dots (ghostHouse.js).
  isWaitingInHouse() {
    return this.state === GHOST_STATE.IN_HOUSE;
  }

  // Eaten, revived, and kept inside until frightened ends. Not part of the
  // dot counters, so it never holds up a ghost waiting for its dots.
  isWaitingForFrightEnd() {
    return this.state === GHOST_STATE.WAITING_FOR_FRIGHT_END;
  }

  // Asked by the ghost house when this ghost may go: its dot counter (or the
  // no-dot timer) says so, or frightened has ended.
  release() {
    if (this.isWaitingInHouse() || this.isWaitingForFrightEnd()) {
      this.state = GHOST_STATE.LEAVING_HOUSE;
    }
  }

  // Moves up or down around centerY and turns around at the edge of the
  // range. Turning the direction (not just the movement) is what makes the
  // eyes follow.
  bobAround(centerY, distance) {
    const isMovingUp = this.direction === DIRECTION.UP;
    const edgeY = isMovingUp
      ? centerY - GHOST_HOUSE_BOB_RANGE_PX
      : centerY + GHOST_HOUSE_BOB_RANGE_PX;
    this.y = approach(this.y, edgeY, distance);
    if (this.y === edgeY) {
      this.direction = isMovingUp ? DIRECTION.DOWN : DIRECTION.UP;
    }
  }

  // A fixed path, one leg at a time: back to the middle row (bobbing may
  // have left the ghost above or below it), across to the door's column,
  // then straight up through the door to the exit, where the ghost joins
  // whatever mode the game is in now.
  leaveHouse(distance, mode) {
    if (this.x !== HOUSE_EXIT.x && this.y !== this.houseCenterY) {
      this.moveVerticallyTo(this.houseCenterY, distance);
    } else if (this.x !== HOUSE_EXIT.x) {
      this.moveHorizontallyTo(HOUSE_EXIT.x, distance);
    } else {
      this.moveVerticallyTo(HOUSE_EXIT.y, distance);
      if (this.y === HOUSE_EXIT.y) {
        this.state = mode;
        this.wasEaten = false;
        this.direction = GHOST_HOUSE_EXIT_DIRECTION;
        // A reversal saved up in the house: it comes out heading right.
        if (this.pendingReversal) {
          this.direction = this.reverseDirection();
          this.pendingReversal = false;
        }
      }
    }
  }

  // The reverse of leaving: across to the door's column, then straight down
  // through the door to the middle of the house. There the ghost comes back
  // to life and leaves at once (Dossier), from a spot leaveHouse() already
  // knows how to leave from. Our change: while frightened still runs, it
  // waits inside instead (EATEN_GHOST_WAITS_FOR_FRIGHT_END).
  enterHouse(distance, mode) {
    if (this.x !== HOUSE_EXIT.x) {
      this.moveHorizontallyTo(HOUSE_EXIT.x, distance);
      return;
    }
    this.moveVerticallyTo(HOUSE_CENTER.y, distance);
    if (this.y !== HOUSE_CENTER.y) {
      return;
    }
    const shouldWait = EATEN_GHOST_WAITS_FOR_FRIGHT_END && mode === GHOST_STATE.FRIGHTENED;
    this.state = shouldWait ? GHOST_STATE.WAITING_FOR_FRIGHT_END : GHOST_STATE.LEAVING_HOUSE;
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
        // The door blocks ghosts in the maze, so eyes switch to a fixed path
        // once they are right above it.
        if (this.state === GHOST_STATE.EATEN && this.isAboveDoor()) {
          this.state = GHOST_STATE.ENTERING_HOUSE;
          return;
        }
        this.chooseDirectionAtCenter();
      }
      const step = Math.min(remainingDistance, this.distanceToNextCenter());
      this.moveForward(step);
      remainingDistance -= step;
      this.wrapThroughTunnel();
    }
  }

  isAboveDoor() {
    const { col, row } = this.currentTile();
    return row === GHOST_HOUSE_EXIT_TILE.row && ABOVE_DOOR_COLS.includes(col);
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
export function createGhosts(levelConfig) {
  return GHOST_STARTS.map((start) => new Ghost(start, levelConfig));
}
