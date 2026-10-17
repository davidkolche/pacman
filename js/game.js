import {
  GAME_STATE,
  GHOST_NAME,
  GHOST_STATE,
  EVENTS,
  START_LEVEL,
  FRIGHTENED_ONE_FLASH_MS,
  FRIGHTENED_FLASH_INTERVAL_MS,
  GHOST_EATEN_POINTS,
  GHOST_EATEN_FREEZE_MS,
  DEATH_FREEZE_MS,
  DEATH_ANIMATION_MS,
  DEATH_AFTER_MS,
  LEVEL_COMPLETE_FREEZE_MS,
  MAZE_FLASH_COUNT,
  MAZE_FLASH_INTERVAL_MS,
  GAME_OVER_SCREEN_MS,
  ATTRACT_CHARACTERS_PHASE_MS,
  INPUT_MODE,
  NAME_ACTION,
  DEBUG_ADD_POINTS,
  COLORS,
} from './constants.js';
import { getLevelConfig } from './levels.js';
import { ModeTimer, isFrightenedFlashWhite } from './modeTimer.js';
import {
  getRequestedDirection,
  clearRequestedDirection,
  consumeStartPress,
  consumeClearDotsPress,
  consumeAddPointsPress,
  consumeNameActions,
  consumePausePress,
  consumeMutePress,
  setInputMode,
} from './input.js';
import { toggleMuted } from './audio.js';
import { emit } from './events.js';
import { resetMaze, clearAllFood } from './maze.js';
import {
  getLives,
  getDotsRemaining,
  resetScore,
  recountFood,
  addDebugPoints,
  isTopScore,
  addTopScore,
} from './score.js';
import { NameEntry } from './nameEntry.js';
import { Pacman } from './pacman.js';
import { createGhosts } from './ghost.js';
import { GhostHouse } from './ghostHouse.js';
import { Fruit, recentLevelFruits } from './fruit.js';

// Moments inside DYING, measured from its start.
const DEATH_ANIMATION_START_MS = DEATH_FREEZE_MS;
const DEATH_ANIMATION_END_MS = DEATH_ANIMATION_START_MS + DEATH_ANIMATION_MS;
const DEATH_END_MS = DEATH_ANIMATION_END_MS + DEATH_AFTER_MS;

// Moments inside LEVEL_COMPLETE: one flash is white then blue.
const MAZE_FLASH_START_MS = LEVEL_COMPLETE_FREEZE_MS;
const LEVEL_COMPLETE_END_MS = MAZE_FLASH_START_MS + MAZE_FLASH_COUNT * 2 * MAZE_FLASH_INTERVAL_MS;

function isSameTile(first, second) {
  return first.col === second.col && first.row === second.row;
}

// The top of the chain of command. The game decides WHETHER the world runs
// this frame and at which level; the mode timer decides scatter, chase or
// frightened; each ghost decides by itself how to follow a mode change.
// The game never sets a ghost's state directly (it asks, e.g.
// becomeEaten()), and a ghost never knows which state the game is in.
// Every pause is counted here in game time, never with setTimeout, so it
// stops, resets and is tested together with the rest of the game.
export class Game {
  constructor() {
    // Where the attract screen's alternation starts (see attractTimeMs).
    this.attractOffsetMs = 0;
    // The name being entered, only during NAME_ENTRY.
    this.nameEntry = null;
    // A flag, not a state of its own: a paused game is still PLAYING and is
    // drawn exactly like one (plus the PAUSED overlay).
    this.isPaused = false;
    this.enterState(GAME_STATE.START);
    this.startLevel(START_LEVEL);
  }

  // Every state change goes through here, so the state's clock always
  // starts at zero.
  enterState(state) {
    this.state = state;
    this.stateTimeMs = 0;
  }

  // The ghost house and the fruit belong to the level, not to a life: their
  // counters survive a death and start again at zero only with a new level.
  startLevel(level) {
    this.level = level;
    this.levelConfig = getLevelConfig(level);
    this.ghostHouse = new GhostHouse(this.levelConfig);
    this.fruit = new Fruit(this.levelConfig);
    // Cruise Elroy is paused after a lost life until Clyde leaves the house.
    this.isElroySuspended = false;
    // The bottom HUD's fruit row changes only with the level.
    this.levelFruits = recentLevelFruits(level);
    this.resetActors();
  }

  // Fresh characters and a fresh mode clock: at a level's start and after a
  // lost life (the Dossier resets the scatter/chase clock then too). The
  // maze is not touched, so eaten dots stay eaten.
  resetActors() {
    this.pacman = new Pacman(this.levelConfig);
    this.ghosts = createGhosts(this.levelConfig);
    // Inky's chase target depends on where Blinky is.
    this.blinky = this.ghosts.find((ghost) => ghost.name === GHOST_NAME.BLINKY);
    this.clyde = this.ghosts.find((ghost) => ghost.name === GHOST_NAME.CLYDE);
    this.modeTimer = new ModeTimer(this.levelConfig.modeSchedule, this.levelConfig.frightTimeMs);
    // How many ghosts this power pellet has eaten so far (sets the points).
    this.ghostsEatenChain = 0;
    // While above zero, nothing moves (the pause after eating a ghost).
    this.freezeRemainingMs = 0;
    // The eaten ghost and its points, shown during that pause; else null.
    this.eatenGhostDisplay = null;
  }

  // A brand new game: full maze, score 0, all lives (the high score stays).
  resetGame() {
    resetMaze();
    resetScore();
    this.startLevel(START_LEVEL);
  }

  // Each state checks for itself when it is time to move on, like the ghosts.
  // While paused, only the pause and mute keys are read: every clock (the
  // state's, the modes', the fruit's, the ghost house's, Elroy's dot count)
  // lives in the updates below, so returning here stops them all at once.
  update(deltaMs) {
    this.handleMuteToggle();
    this.handlePauseToggle();
    if (this.isPaused) {
      // Debug presses must not pile up and fire when play resumes.
      consumeClearDotsPress();
      consumeAddPointsPress();
      return;
    }
    this.stateTimeMs += deltaMs;
    // The debug keys only mean something during play; a press in any other
    // state is dropped, so it cannot fire when play starts.
    if (this.state !== GAME_STATE.PLAYING) {
      consumeClearDotsPress();
      consumeAddPointsPress();
    }
    switch (this.state) {
      case GAME_STATE.START:
        // The reset happens here, not at GAME OVER, so the attract screen
        // still shows the last game's score (like the arcade).
        if (consumeStartPress()) {
          this.resetGame();
          this.enterReady();
          emit(EVENTS.GAME_STARTED);
        }
        break;
      case GAME_STATE.READY:
        this.updateReady(deltaMs);
        break;
      case GAME_STATE.PLAYING:
        this.updatePlaying(deltaMs);
        break;
      case GAME_STATE.DYING:
        this.updateDying(deltaMs);
        break;
      case GAME_STATE.LEVEL_COMPLETE:
        this.updateLevelComplete();
        break;
      case GAME_STATE.GAME_OVER:
        this.updateGameOver();
        break;
      case GAME_STATE.NAME_ENTRY:
        this.updateNameEntry();
        break;
    }
  }

  updateGameOver() {
    if (this.stateTimeMs < GAME_OVER_SCREEN_MS) {
      return;
    }
    if (isTopScore()) {
      this.enterNameEntry();
    } else {
      this.enterAttract({ showTopScoresFirst: false });
    }
  }

  // From here on every key belongs to the name (input.js), so typing D or C
  // cannot move Pac-Man or fire a debug key.
  enterNameEntry() {
    this.nameEntry = new NameEntry();
    setInputMode(INPUT_MODE.NAME);
    this.enterState(GAME_STATE.NAME_ENTRY);
  }

  // Enter with an empty name does nothing: the table needs a name.
  updateNameEntry() {
    for (const action of consumeNameActions()) {
      if (action.action !== NAME_ACTION.CONFIRM) {
        this.nameEntry.apply(action);
      } else if (!this.nameEntry.isEmpty()) {
        addTopScore(this.nameEntry.name());
        this.nameEntry = null;
        setInputMode(INPUT_MODE.GAME);
        this.enterAttract({ showTopScoresFirst: true });
        return;
      }
    }
  }

  // An Enter pressed on the GAME OVER screen must not start the next game
  // the moment the attract screen appears.
  enterAttract({ showTopScoresFirst }) {
    consumeStartPress();
    this.attractOffsetMs = showTopScoresFirst ? ATTRACT_CHARACTERS_PHASE_MS : 0;
    this.enterState(GAME_STATE.START);
  }

  // The attract screen's own clock: the state's clock, moved forward past
  // the characters when the table should come first.
  attractTimeMs() {
    return this.stateTimeMs + this.attractOffsetMs;
  }

  // P pauses and resumes only during play; a press in any other state is
  // dropped. PLAYING includes the short freeze after eating a ghost.
  handlePauseToggle() {
    if (consumePausePress() && this.state === GAME_STATE.PLAYING) {
      this.isPaused = !this.isPaused;
    }
  }

  // When the tab is hidden (main.js). Coming back does not resume by
  // itself: the player presses P when ready.
  pauseIfPlaying() {
    if (this.state === GAME_STATE.PLAYING) {
      this.isPaused = true;
    }
  }

  // Works on every screen and while paused (not during the name entry,
  // where M is a letter: input.js never reports it there).
  handleMuteToggle() {
    if (consumeMutePress()) {
      toggleMuted();
    }
  }

  enterReady() {
    clearRequestedDirection();
    this.enterState(GAME_STATE.READY);
  }

  // Nothing moves and no clock runs until the player's first direction key;
  // only the ghosts in the house bob. That key starts the game in this same
  // update, so no frame is lost.
  updateReady(deltaMs) {
    if (getRequestedDirection()) {
      this.enterState(GAME_STATE.PLAYING);
      emit(EVENTS.PLAY_STARTED);
      this.updatePlaying(deltaMs);
      return;
    }
    this.updateGhosts(deltaMs, { checkCollisions: false });
  }

  // A collision is checked after Pac-Man moves and again after each ghost
  // moves: checking only once a frame would miss a ghost that steps onto
  // Pac-Man's tile. Once one happens (death or a ghost-eating pause), the
  // rest of the frame stops.
  updatePlaying(deltaMs) {
    if (this.freezeRemainingMs > 0) {
      this.updateFreeze(deltaMs);
      return;
    }
    this.pacman.requestDirection(getRequestedDirection());
    this.pacman.update(deltaMs, this.modeTimer.isFrightened());
    this.handleDebugClearDots();
    this.handleDebugAddPoints();
    // Eating the last dot wins over a ghost touching Pac-Man in the same frame.
    if (getDotsRemaining() === 0) {
      this.enterState(GAME_STATE.LEVEL_COMPLETE);
      return;
    }
    // After the freeze check, so eating a ghost stops the fruit's clock too.
    this.fruit.update(deltaMs);
    this.fruit.tryEat(this.pacman.currentTile());
    for (const ghost of this.ghosts) {
      this.checkCollision(ghost);
      if (this.isWorldStopped()) {
        return;
      }
    }
    this.ghostHouse.update(deltaMs, this.ghosts, this.modeTimer.isFrightened());
    this.updateElroySuspension();
    this.updateGhostMode(deltaMs);
    this.updateGhosts(deltaMs, { checkCollisions: true });
  }

  // Debug only (the key works only while debug is on): eats every dot at
  // once, so the level ends on the next check.
  handleDebugClearDots() {
    if (consumeClearDotsPress()) {
      clearAllFood();
      recountFood();
    }
  }

  // Debug only: points from nowhere, to reach the extra life quickly.
  handleDebugAddPoints() {
    if (consumeAddPointsPress()) {
      addDebugPoints(DEBUG_ADD_POINTS);
    }
  }

  // The whole world waits, including the frightened clock, so eating a
  // ghost does not cost the player frightened time.
  updateFreeze(deltaMs) {
    this.freezeRemainingMs = Math.max(0, this.freezeRemainingMs - deltaMs);
    if (this.freezeRemainingMs === 0) {
      this.eatenGhostDisplay = null;
    }
  }

  isWorldStopped() {
    return this.state !== GAME_STATE.PLAYING || this.freezeRemainingMs > 0;
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
  // same moment. While the game runs, each ghost's move is followed by a
  // collision check.
  updateGhosts(deltaMs, { checkCollisions }) {
    const world = {
      mode: this.modeTimer.currentMode(),
      scatterChaseMode: this.modeTimer.scatterChaseMode(),
      pacmanTile: this.pacman.currentTile(),
      pacmanDirection: this.pacman.direction,
      blinkyTile: this.blinky.currentTile(),
      elroyLevel: this.elroyLevel(),
    };
    for (const ghost of this.ghosts) {
      ghost.update(deltaMs, world);
      if (checkCollisions) {
        this.checkCollision(ghost);
        if (this.isWorldStopped()) {
          return;
        }
      }
    }
  }

  // Same tile = they touch. What happens depends only on the ghost's own
  // state: the mode timer may already say "chase" while a revived ghost is
  // still on its way out.
  checkCollision(ghost) {
    if (!isSameTile(ghost.currentTile(), this.pacman.currentTile())) {
      return;
    }
    if (ghost.isEdible()) {
      this.eatGhost(ghost);
    } else if (ghost.isDangerous()) {
      emit(EVENTS.PACMAN_DIED);
      this.enterState(GAME_STATE.DYING);
    }
  }

  // chainIndex: 0 for the first ghost of this power pellet, up to 3.
  eatGhost(ghost) {
    const chainIndex = this.ghostsEatenChain;
    const points = GHOST_EATEN_POINTS[chainIndex];
    this.ghostsEatenChain++;
    // Remembered before the ghost turns into eyes and moves away.
    this.eatenGhostDisplay = { ghost, points, x: ghost.x, y: ghost.y };
    ghost.becomeEaten();
    emit(EVENTS.GHOST_EATEN, { name: ghost.name, points, chainIndex });
    this.freezeRemainingMs = GHOST_EATEN_FREEZE_MS;
  }

  // A freeze with everything still visible, then the death animation, then
  // a moment of empty maze. Then the next life, or the end.
  updateDying(deltaMs) {
    // Announced on the one update whose time step crosses the start, so the
    // death sound starts with the animation's first frame.
    const previousTimeMs = this.stateTimeMs - deltaMs;
    if (previousTimeMs < DEATH_ANIMATION_START_MS && this.stateTimeMs >= DEATH_ANIMATION_START_MS) {
      emit(EVENTS.DEATH_ANIMATION_STARTED);
    }
    if (this.stateTimeMs < DEATH_END_MS) {
      return;
    }
    if (getLives() > 0) {
      this.ghostHouse.onLifeLost();
      this.fruit.onLifeLost();
      this.isElroySuspended = true;
      this.resetActors();
      this.enterReady();
    } else {
      this.enterState(GAME_STATE.GAME_OVER);
    }
  }

  // A freeze, then the ghosts vanish and the walls flash. Then a full maze,
  // the next level's numbers and everyone back at the start. Score and
  // lives carry over.
  updateLevelComplete() {
    if (this.stateTimeMs < LEVEL_COMPLETE_END_MS) {
      return;
    }
    resetMaze();
    recountFood();
    this.startLevel(this.level + 1);
    this.enterReady();
  }

  isMazeFlashing() {
    return this.state === GAME_STATE.LEVEL_COMPLETE && this.stateTimeMs >= MAZE_FLASH_START_MS;
  }

  // White on the first half of each flash (the marquee's bulbs follow it too).
  isWallFlashOn() {
    if (!this.isMazeFlashing()) {
      return false;
    }
    const flashTimeMs = this.stateTimeMs - MAZE_FLASH_START_MS;
    const interval = Math.floor(flashTimeMs / MAZE_FLASH_INTERVAL_MS);
    return interval % 2 === 0;
  }

  // The walls' color right now.
  wallColor() {
    return this.isWallFlashOn() ? COLORS.WALL_FLASH : COLORS.WALL;
  }

  // The ghost door vanishes while the walls flash, as in the arcade.
  isGhostDoorVisible() {
    return !this.isMazeFlashing();
  }

  // Every dot and power pellet counts toward the ghost house and the fruit.
  handleDotEaten() {
    this.ghostHouse.onDotEaten(this.ghosts);
    this.fruit.onDotEaten();
  }

  // The pause after a lost life ends for good once Clyde is out.
  updateElroySuspension() {
    if (this.isElroySuspended && !this.clyde.isWaitingInHouse()) {
      this.isElroySuspended = false;
    }
  }

  // Cruise Elroy (Dossier): 1 when few dots are left, 2 at half of that.
  // After a lost life it waits until Clyde has left the house (arcade rule;
  // the ghosts are all back inside then, so Clyde leaves last). Whether it
  // applies to Blinky right now (out of the house, not blue) is his own
  // business: see Ghost.activeElroyLevel().
  elroyLevel() {
    if (this.isElroySuspended) {
      return 0;
    }
    const dotsRemaining = getDotsRemaining();
    if (dotsRemaining <= this.levelConfig.elroy2Dots) {
      return 2;
    }
    if (dotsRemaining <= this.levelConfig.elroy1Dots) {
      return 1;
    }
    return 0;
  }

  // 0 before the animation starts, 1 once it is over.
  deathProgress() {
    const animationTimeMs = this.stateTimeMs - DEATH_ANIMATION_START_MS;
    return Math.min(1, Math.max(0, animationTimeMs / DEATH_ANIMATION_MS));
  }

  // In late levels the frightened time is 0: the ghosts still turn around,
  // but never turn blue. Entering the mode they are already in does exactly
  // that (ghosts in the house save the reversal for later).
  handlePowerPelletEaten() {
    this.handleDotEaten();
    this.ghostsEatenChain = 0;
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

  // What to show is decided here, so the drawing code needs no timing rules.
  // Pac-Man hides while an eaten ghost's points are shown, and is drawn by
  // the death animation while dying.
  isPacmanVisible() {
    return this.eatenGhostDisplay === null;
  }

  // The fruit and its points show only during play: they vanish at once
  // when Pac-Man dies, and stay hidden while the maze flashes.
  isFruitVisible() {
    return this.state === GAME_STATE.PLAYING && this.fruit.isVisible();
  }

  isFruitPointsVisible() {
    return this.state === GAME_STATE.PLAYING && this.fruit.isShowingPoints();
  }

  isDying() {
    return this.state === GAME_STATE.DYING;
  }

  isLevelComplete() {
    return this.state === GAME_STATE.LEVEL_COMPLETE;
  }

  // During DYING and LEVEL_COMPLETE the ghosts vanish once the freeze is over.
  isGhostVisible(ghost) {
    if (this.isDying() && this.stateTimeMs >= DEATH_ANIMATION_START_MS) {
      return false;
    }
    if (this.isMazeFlashing()) {
      return false;
    }
    return this.eatenGhostDisplay === null || this.eatenGhostDisplay.ghost !== ghost;
  }

  // Lives in reserve: not the one being played. A lost life's icon goes
  // only when the next life starts, as in the arcade, so while dying (lives
  // already counted down) the icons still show the old number.
  reserveLives() {
    const lives = this.isDying() ? getLives() : getLives() - 1;
    // After the last life (GAME_OVER) there is nothing left, not minus one.
    return Math.max(0, lives);
  }

  // For the background loop (soundEffects.js getActiveLoop): blue or
  // flashing ghosts on the board right now.
  isAnyGhostFrightened() {
    return this.ghosts.some((ghost) => ghost.state === GHOST_STATE.FRIGHTENED);
  }

  // The 1 s stop after a ghost is eaten (the points are shown).
  isGhostEatenFreeze() {
    return this.state === GAME_STATE.PLAYING && this.freezeRemainingMs > 0;
  }

  // The last part of frightened, where the ghosts flash (the same time the
  // flashing below is counted from).
  isFrightFlashing() {
    return this.modeTimer.isFrightened()
      && this.modeTimer.remainingMs() <= this.levelConfig.frightFlashes * FRIGHTENED_ONE_FLASH_MS;
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
