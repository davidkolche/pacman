import { GLOBAL_DOT_LIMITS, MS_PER_SECOND } from './constants.js';

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
  }

  // Runs only while the game is playing, so no counter or timer moves before
  // the player's first key. At most one ghost leaves per update.
  update(deltaMs, ghosts) {
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
    return `HOUSE ${mode} ${counts.join(' ')}  NO DOT ${noDotSeconds}s`;
  }
}

function preferredGhost(ghosts) {
  return ghosts.find((ghost) => ghost.isWaitingInHouse());
}
