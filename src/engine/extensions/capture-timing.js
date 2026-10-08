export const CAPTURE_TIMING = Object.freeze({
  settle: 250,
  shake: 420,
  release: 450,
});

// The fourth successful rule check means capture; the original displays three shakes.
export const captureShakes = (event) =>
  event.caught ? Math.min(3, event.shakes) : event.shakes;
