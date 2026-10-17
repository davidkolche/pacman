import {
  EVENTS,
  FRUIT_TILE,
  FRUIT_APPEAR_DOTS,
  FRUIT_MIN_SHOW_MS,
  FRUIT_MAX_SHOW_MS,
  FRUIT_POINTS_SHOW_MS,
  FRUIT_HUD_SLOTS,
  MS_PER_SECOND,
} from './constants.js';
import { emit } from './events.js';
import { getLevelConfig } from './levels.js';

// The fruit sits between two tiles, so Pac-Man touches it from either one.
const FRUIT_EAT_COLUMNS = [Math.floor(FRUIT_TILE.col), Math.ceil(FRUIT_TILE.col)];

// The level's bonus fruit (The Pac-Man Dossier): it appears after
// FRUIT_APPEAR_DOTS dots, stays for 9-10 seconds, and is worth the level's
// fruitPoints. Like GhostHouse it belongs to the level: a new level gets a
// new Fruit, while a death only hides it and keeps the dot count.
// It never listens to events itself (the Game passes the dots on), so an
// old level's Fruit cannot keep counting after it is replaced.
export class Fruit {
  constructor(levelConfig) {
    this.fruit = levelConfig.fruit;
    this.points = levelConfig.fruitPoints;
    this.dotsEaten = 0;
    // Time left on screen; the fruit is visible while above zero.
    this.remainingMs = 0;
    // Time left for the points shown after eating it.
    this.pointsRemainingMs = 0;
  }

  // Power pellets count too.
  onDotEaten() {
    this.dotsEaten++;
    if (FRUIT_APPEAR_DOTS.includes(this.dotsEaten)) {
      this.show();
    }
  }

  // Also the debug key's way in (Game.handleDebugSpawnFruit).
  show() {
    this.remainingMs = randomShowTimeMs();
    emit(EVENTS.FRUIT_APPEARED, { fruit: this.fruit, points: this.points });
  }

  // Called only while the game is playing, so the clock follows the game's.
  update(deltaMs) {
    this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    this.pointsRemainingMs = Math.max(0, this.pointsRemainingMs - deltaMs);
  }

  tryEat(pacmanTile) {
    if (!this.isVisible() || !isOnFruit(pacmanTile)) {
      return;
    }
    this.remainingMs = 0;
    this.pointsRemainingMs = FRUIT_POINTS_SHOW_MS;
    emit(EVENTS.FRUIT_EATEN, { fruit: this.fruit, points: this.points });
  }

  // A lost life takes the fruit (and its points) off the screen; the dots
  // eaten so far still count toward the next fruit.
  onLifeLost() {
    this.remainingMs = 0;
    this.pointsRemainingMs = 0;
  }

  isVisible() {
    return this.remainingMs > 0;
  }

  isShowingPoints() {
    return this.pointsRemainingMs > 0;
  }

  debugText() {
    const seconds = (this.remainingMs / MS_PER_SECOND).toFixed(1);
    const shown = this.isVisible() ? `  SHOW ${seconds}s` : '';
    return `FRUIT DOTS ${this.dotsEaten}${shown}`;
  }
}

function randomShowTimeMs() {
  return FRUIT_MIN_SHOW_MS + Math.random() * (FRUIT_MAX_SHOW_MS - FRUIT_MIN_SHOW_MS);
}

function isOnFruit(tile) {
  return tile.row === FRUIT_TILE.row && FRUIT_EAT_COLUMNS.includes(tile.col);
}

// The fruits of this level and the ones before it, newest first, as many as
// the bottom HUD has room for.
export function recentLevelFruits(level) {
  const fruits = [];
  for (let shownLevel = level; shownLevel >= 1 && fruits.length < FRUIT_HUD_SLOTS; shownLevel--) {
    fruits.push(getLevelConfig(shownLevel).fruit);
  }
  return fruits;
}
