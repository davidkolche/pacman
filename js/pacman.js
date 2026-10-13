import {
  MAX_SPEED_PIXELS_PER_SECOND,
  PACMAN_START_TILE,
  PACMAN_START_DIRECTION,
  DIRECTION_NONE,
  TILE,
  EVENTS,
  DOT_PAUSE_FRAMES,
  POWER_PELLET_PAUSE_FRAMES,
} from './constants.js';
import { isInsideMaze, isBlockedForPacman, takeFood } from './maze.js';
import { emit } from './events.js';
import { Entity, isOpposite, approach } from './entity.js';

export class Pacman extends Entity {
  constructor(levelConfig) {
    // The direction is kept even while stopped, so the mouth still faces the
    // wall he ran into. DIRECTION_NONE at the start: he waits for the
    // player's first key.
    super(PACMAN_START_TILE, PACMAN_START_DIRECTION);
    this.speeds = levelConfig.speeds;
    this.queuedDirection = null;
    this.isMoving = false;
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
  update(deltaMs, isFrightened) {
    this.speed = this.currentSpeed(isFrightened);
    if (this.pauseFramesRemaining > 0) {
      this.pauseFramesRemaining--;
      return;
    }
    // Without a direction the movement code below would still pull him to
    // the center of his tile, so he stays put until the first open direction
    // the player asks for.
    if (this.direction === DIRECTION_NONE) {
      this.tryQueuedTurn();
      if (this.direction === DIRECTION_NONE) {
        return;
      }
    }

    let remainingDistance = this.distanceThisUpdate(deltaMs);

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

  // Faster while the ghosts are blue. There is no separate "eating" speed:
  // the dot pause alone makes him slower in corridors full of dots.
  currentSpeed(isFrightened) {
    const fraction = isFrightened ? this.speeds.pacmanFright : this.speeds.pacman;
    return MAX_SPEED_PIXELS_PER_SECOND * fraction;
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

  // Only along the direction, not on both axes: after an early corner turn
  // he is still off the center line of the other axis.
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
}
