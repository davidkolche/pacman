import { GHOST_STATE } from './constants.js';

// Pure, and fed by the one shared frightened clock, so all four ghosts
// get the same answer in the same frame and flash in sync. The time into
// the flash decides the color: even intervals white, odd ones blue.
export function isFrightenedFlashWhite(remainingMs, flashTimeMs, flashIntervalMs) {
  if (remainingMs > flashTimeMs) {
    return false;
  }
  const flashInterval = Math.floor((flashTimeMs - remainingMs) / flashIntervalMs);
  return flashInterval % 2 === 0;
}

// One clock for all four ghosts: it only knows which mode the game is in
// and for how long. It never moves a ghost; each ghost's own state machine
// decides how to follow a change (see Ghost.enterMode).
export class ModeTimer {
  constructor(schedule, frightenedDurationMs) {
    this.schedule = schedule;
    this.frightenedDurationMs = frightenedDurationMs;
    this.phaseIndex = 0;
    this.phaseElapsedMs = 0;
    this.frightenedRemainingMs = 0;
  }

  // Frightened sits on top of the schedule: while it lasts, the scatter/chase
  // clock is paused, and afterwards it continues where it stopped.
  isFrightened() {
    return this.frightenedRemainingMs > 0;
  }

  currentMode() {
    return this.isFrightened() ? GHOST_STATE.FRIGHTENED : this.scatterChaseMode();
  }

  scatterChaseMode() {
    return this.schedule[this.phaseIndex].mode;
  }

  // Infinity during the last, endless chase.
  remainingMs() {
    if (this.isFrightened()) {
      return this.frightenedRemainingMs;
    }
    return this.schedule[this.phaseIndex].durationMs - this.phaseElapsedMs;
  }

  // A new power pellet restarts the full time, even if one is still active.
  startFrightened() {
    this.frightenedRemainingMs = this.frightenedDurationMs;
  }

  update(deltaMs) {
    if (this.isFrightened()) {
      this.frightenedRemainingMs = Math.max(0, this.frightenedRemainingMs - deltaMs);
      return;
    }
    this.phaseElapsedMs += deltaMs;
    const isLastPhase = this.phaseIndex === this.schedule.length - 1;
    if (!isLastPhase && this.phaseElapsedMs >= this.schedule[this.phaseIndex].durationMs) {
      // The overshoot is carried over, so no time is lost between phases.
      this.phaseElapsedMs -= this.schedule[this.phaseIndex].durationMs;
      this.phaseIndex++;
    }
  }
}
