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

    const frameTime = Math.min(timestamp - previousTimestamp, MAX_FRAME_TIME_MS);
    previousTimestamp = timestamp;
    accumulatedTime += frameTime;

    while (accumulatedTime >= FIXED_TIMESTEP_MS) {
      update(FIXED_TIMESTEP_MS);
      accumulatedTime -= FIXED_TIMESTEP_MS;
    }

    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
