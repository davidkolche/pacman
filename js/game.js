import {
  GAME_STATE,
  GHOST_NAME,
  GHOST_STATE,
  START_LEVEL,
  FRIGHTENED_ONE_FLASH_MS,
  FRIGHTENED_FLASH_INTERVAL_MS,
} from './constants.js';
import { getLevelConfig } from './levels.js';
import { ModeTimer, isFrightenedFlashWhite } from './modeTimer.js';
import { getRequestedDirection, clearRequestedDirection, consumeStartPress } from './input.js';
import { Pacman } from './pacman.js';
import { createGhosts } from './ghost.js';

// The top of the chain of command. The game decides WHETHER the world runs
// this frame and at which level; the mode timer decides scatter, chase or
// frightened; each ghost decides by itself how to follow a mode change.
// The game never sets a ghost's state directly, and a ghost never knows
// which state the game is in.
export class Game {
  constructor() {
    this.state = GAME_STATE.START;
    this.startLevel(START_LEVEL);
  }

  // Fresh characters and a fresh mode clock for a level. Part B reuses this
  // after a lost life and for the next level.
  startLevel(level) {
    this.level = level;
    this.levelConfig = getLevelConfig(level);
    this.pacman = new Pacman(this.levelConfig);
    this.ghosts = createGhosts(this.levelConfig);
    // Inky's chase target depends on where Blinky is.
    this.blinky = this.ghosts.find((ghost) => ghost.name === GHOST_NAME.BLINKY);
    this.modeTimer = new ModeTimer(this.levelConfig.modeSchedule, this.levelConfig.frightTimeMs);
  }

  // Each state checks for itself when it is time to move on, like the ghosts.
  update(deltaMs) {
    switch (this.state) {
      case GAME_STATE.START:
        if (consumeStartPress()) {
          this.enterReady();
        }
        break;
      case GAME_STATE.READY:
        this.updateReady(deltaMs);
        break;
      case GAME_STATE.PLAYING:
        this.updatePlaying(deltaMs);
        break;
      case GAME_STATE.DYING:
        // Part B: the death animation, then READY or GAME_OVER.
        break;
      case GAME_STATE.LEVEL_COMPLETE:
        // Part B: the maze flashes, then the next level starts.
        break;
      case GAME_STATE.GAME_OVER:
        // Part B: "GAME OVER", then back to START.
        break;
    }
  }

  enterReady() {
    clearRequestedDirection();
    this.state = GAME_STATE.READY;
  }

  // Nothing moves and no clock runs until the player's first direction key;
  // only the ghosts in the house bob. That key starts the game in this same
  // update, so no frame is lost.
  updateReady(deltaMs) {
    if (getRequestedDirection()) {
      this.state = GAME_STATE.PLAYING;
      this.updatePlaying(deltaMs);
      return;
    }
    this.updateGhosts(deltaMs, false);
  }

  updatePlaying(deltaMs) {
    this.pacman.requestDirection(getRequestedDirection());
    this.pacman.update(deltaMs, this.modeTimer.isFrightened());
    this.updateGhostMode(deltaMs);
    this.updateGhosts(deltaMs, true);
  }

  // A mode change reverses every ghost, except when frightened ends: then
  // they just go back to scatter or chase (Dossier).
  updateGhostMode(deltaMs) {
    const previousMode = this.modeTimer.currentMode();
    this.modeTimer.update(deltaMs);
    const mode = this.modeTimer.currentMode();
    if (mode === previousMode) {
      return;
    }
    const shouldReverse = previousMode !== GHOST_STATE.FRIGHTENED;
    for (const ghost of this.ghosts) {
      ghost.enterMode(mode, shouldReverse);
    }
  }

  // The world is taken once, before any ghost moves, so all four aim at the
  // same moment.
  updateGhosts(deltaMs, isClockRunning) {
    const world = {
      isClockRunning,
      mode: this.modeTimer.currentMode(),
      pacmanTile: this.pacman.currentTile(),
      pacmanDirection: this.pacman.direction,
      blinkyTile: this.blinky.currentTile(),
    };
    for (const ghost of this.ghosts) {
      ghost.update(deltaMs, world);
    }
  }

  // In late levels the frightened time is 0: the ghosts still turn around,
  // but never turn blue. Entering the mode they are already in does exactly
  // that (ghosts in the house save the reversal for later).
  handlePowerPelletEaten() {
    if (this.levelConfig.frightTimeMs === 0) {
      for (const ghost of this.ghosts) {
        ghost.enterMode(this.modeTimer.currentMode(), true);
      }
      return;
    }
    this.modeTimer.startFrightened();
    for (const ghost of this.ghosts) {
      ghost.enterMode(GHOST_STATE.FRIGHTENED, true);
    }
  }

  // One answer for all ghosts, from the shared clock, so they flash in sync.
  // When the flashes take longer than the whole frightened time (1 s with
  // 3 flashes), the ghosts simply flash from the start.
  isFrightenedFlashWhite() {
    if (!this.modeTimer.isFrightened()) {
      return false;
    }
    return isFrightenedFlashWhite(
      this.modeTimer.remainingMs(),
      this.levelConfig.frightFlashes * FRIGHTENED_ONE_FLASH_MS,
      FRIGHTENED_FLASH_INTERVAL_MS,
    );
  }
}
