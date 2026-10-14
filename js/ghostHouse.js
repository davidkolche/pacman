import { GLOBAL_DOT_LIMITS, EATEN_GHOST_EXIT_DELAY_MS, MS_PER_SECOND } from './constants.js';

// Decides when each waiting ghost may leave the house (The Pac-Man Dossier).
// Only the first ghost still waiting (in start-list order) is "preferred";
// the dots Pac-Man eats count toward its release:
// - personal counters (normal): each ghost has its own count and a limit
//   per level. Kept here by name, not on the ghosts, because the ghosts are
//   recreated after every death while the counts must survive it;
// - a global counter (after a lost life): one shared count, compared with
//   GLOBAL_DOT_LIMITS. The personal counts are paused, not reset;
// - a no-dot timer: when Pac-Man eats nothing for a while, the preferred
//   ghost leaves anyway.
// Separately (our own rule, not the arcade's), it lets out the eaten ghosts
// that revived during frightened and wait for it to end. They have their
// own list and clock and never touch the dot counters.
// It never moves a ghost: it only calls release(), and the ghost's own state
// machine does the rest. A new level gets a new GhostHouse (all at zero).
export class GhostHouse {
  constructor(levelConfig) {
    this.dotLimits = levelConfig.houseDotLimits;
    this.noDotTimeMs = levelConfig.noDotTimeMs;
    this.personalCounts = Object.fromEntries(
      Object.keys(this.dotLimits).map((name) => [name, 0]),
    );
    this.isGlobalActive = false;
    this.globalCount = 0;
    this.noDotElapsedMs = 0;
    // Time until the next ghost waiting for frightened to end may leave.
    this.frightExitDelayMs = 0;
  }

  // Power pellets count as dots too.
  onDotEaten(ghosts) {
    this.noDotElapsedMs = 0;
    if (this.isGlobalActive) {
      this.globalCount++;
      return;
    }
    const preferred = preferredGhost(ghosts);
    if (preferred) {
      this.personalCounts[preferred.name]++;
    }
  }

  onLifeLost() {
    this.isGlobalActive = true;
    this.globalCount = 0;
    this.noDotElapsedMs = 0;
    this.frightExitDelayMs = 0;
  }

  // Runs only while the game is playing, so no counter or timer moves before
  // the player's first key. At most one ghost leaves per update through the
  // dot counters, and the fright waiters have their own pace.
  update(deltaMs, ghosts, isFrightened) {
    this.updateDotCounters(deltaMs, ghosts);
    this.updateFrightWaiters(deltaMs, ghosts, isFrightened);
  }

  updateDotCounters(deltaMs, ghosts) {
    this.noDotElapsedMs += deltaMs;
    const preferred = preferredGhost(ghosts);
    if (!preferred) {
      return;
    }
    if (this.isGlobalActive) {
      this.checkGlobalCounter(preferred, ghosts);
    }
    if (!this.isGlobalActive && this.personalCounts[preferred.name] >= this.dotLimits[preferred.name]) {
      this.release(preferred);
      return;
    }
    if (this.noDotElapsedMs >= this.noDotTimeMs) {
      this.release(preferred);
    }
  }

  // An exact match, as in the arcade. The last ghost (Clyde) is not released
  // by it: reaching his value with him still inside switches the global
  // counter off, and his own personal count takes over. If he already left
  // (through the no-dot timer), the global counter never switches off again
  // in this level: an arcade quirk we keep.
  checkGlobalCounter(preferred, ghosts) {
    if (this.globalCount !== GLOBAL_DOT_LIMITS[preferred.name]) {
      return;
    }
    if (preferred === ghosts.at(-1)) {
      this.isGlobalActive = false;
      this.globalCount = 0;
    } else {
      this.release(preferred);
    }
  }

  release(ghost) {
    ghost.release();
    this.noDotElapsedMs = 0;
  }

  // While frightened lasts nobody leaves, and the clock stays at zero so the
  // first waiter goes the moment it ends. After that, one every
  // EATEN_GHOST_EXIT_DELAY_MS, in start-list order.
  updateFrightWaiters(deltaMs, ghosts, isFrightened) {
    if (isFrightened) {
      this.frightExitDelayMs = 0;
      return;
    }
    this.frightExitDelayMs = Math.max(0, this.frightExitDelayMs - deltaMs);
    const waiter = ghosts.find((ghost) => ghost.isWaitingForFrightEnd());
    if (waiter && this.frightExitDelayMs === 0) {
      waiter.release();
      this.frightExitDelayMs = EATEN_GHOST_EXIT_DELAY_MS;
    }
  }

  // Debug overlay: one line, e.g. "HOUSE PERSONAL I 12/30 C 0/60  NO DOT 1.3s".
  debugText(ghosts) {
    const waiting = ghosts.filter((ghost) => ghost.isWaitingInHouse());
    const counts = waiting.map((ghost) => {
      const initial = ghost.name[0];
      return this.isGlobalActive
        ? `${initial}@${GLOBAL_DOT_LIMITS[ghost.name]}`
        : `${initial} ${this.personalCounts[ghost.name]}/${this.dotLimits[ghost.name]}`;
    });
    const mode = this.isGlobalActive ? `GLOBAL ${this.globalCount}` : 'PERSONAL';
    const noDotSeconds = (this.noDotElapsedMs / MS_PER_SECOND).toFixed(1);
    const frightWaiters = ghosts
      .filter((ghost) => ghost.isWaitingForFrightEnd())
      .map((ghost) => ghost.name[0]);
    const waitText = frightWaiters.length > 0 ? `  FRIGHT WAIT ${frightWaiters.join(',')}` : '';
    return `HOUSE ${mode} ${counts.join(' ')}  NO DOT ${noDotSeconds}s${waitText}`;
  }
}

function preferredGhost(ghosts) {
  return ghosts.find((ghost) => ghost.isWaitingInHouse());
}
