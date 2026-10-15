import { FIXED_TIMESTEP_MS, MAX_FRAME_TIME_MS } from './constants.js';

// Runs update() at a fixed rate and render() once per browser frame,
// so game speed does not depend on the monitor's refresh rate.
export function startGameLoop(update, render) {
  let previousTimestamp = null;
  let accumulatedTime = 0;

  function frame(timestamp) {
    // The first frame has no previous time to compare against.
    if (previousTimestamp === null) {
      previousTimestamp = timestamp;
    }

    const frameGap = timestamp - previousTimestamp;
    previousTimestamp = timestamp;
    // A hidden tab gets no frames at all, so the first frame back sees a
    // gap of seconds or minutes. That time is dropped, with no burst of
    // catch-up updates: the game goes on exactly where it was left.
    if (frameGap > MAX_FRAME_TIME_MS) {
      accumulatedTime = 0;
    } else {
      accumulatedTime += frameGap;
    }

    while (accumulatedTime >= FIXED_TIMESTEP_MS) {
      update(FIXED_TIMESTEP_MS);
      accumulatedTime -= FIXED_TIMESTEP_MS;
    }

    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
