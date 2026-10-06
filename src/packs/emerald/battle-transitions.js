/** Opening normal-landscape transitions, ported from battle_setup.c / battle_transition.c.
 * Pure 60 Hz sampling; no RNG, DOM or battle-rule mutation. GBA scanline masks are
 * scaled by the adapter; hardware palette blending and BG displacement are not emulated.
 */
const FPS = 60, INTRO_FRAMES = 48;
const TRAIL_DELAYS = [0, 32, 64, 18, 48];
const WHITE_DELAYS = [0, 20, 15, 40, 10, 25, 35, 5];
const ANGLES = [
  [56, 0, 0, 160, 0], [104, 160, 240, 88, 1], [240, 72, 56, 0, 1],
  [0, 32, 144, 160, 0], [144, 160, 184, 0, 1],
  [56, 0, 168, 160, 0], [168, 160, 48, 0, 1],
];
const ANGLE_DELAYS = [8, 4, 2, 1, 1, 1, 0];
const clamp = (n, max = 1) => Math.max(0, Math.min(max, n));

// InitBlackWipe/UpdateBlackWipe: retain the strict '>' accumulator comparison.
function wipePoints([x, y, endX, endY]) {
  const dx = Math.abs(endX - x), dy = Math.abs(endY - y),
    sx = endX < x ? -1 : 1, sy = endY < y ? -1 : 1, points = [];
  let temp = 0, done = false;
  while (!done) {
    points.push([x, y]);
    if (dx > dy) {
      x += sx; temp += dy;
      if (temp > dx) { y += sy; temp -= dx; }
    } else {
      y += sy; temp += dx;
      if (temp > dy) { x += sx; temp -= dy; }
    }
    const xDone = sx > 0 ? x >= endX : x <= endX,
      yDone = sy > 0 ? y >= endY : y <= endY;
    if (xDone) x = endX;
    if (yDone) y = endY;
    done = xDone && yDone;
  }
  points.push([x, y]);
  return points;
}
function angledFrames() {
  const left = Array(160).fill(0), right = Array(160).fill(240), frames = [];
  ANGLES.forEach((angle, index) => {
    const points = wipePoints(angle);
    for (let start = 0; start < points.length; start += 16) {
      for (const [x, y] of points.slice(start, start + 16)) {
        if (y < 0 || y >= 160) continue;
        if (angle[4] === 0) left[y] = Math.min(right[y], Math.max(left[y], x));
        else right[y] = Math.max(left[y], Math.min(right[y], x));
      }
      frames.push({ left: [...left], right: [...right] });
    }
    for (let n = 0; n < ANGLE_DELAYS[index]; n++) frames.push(frames.at(-1));
  });
  frames.push({ left: Array(160).fill(240), right: Array(160).fill(240) });
  return frames;
}
const ANGLED = angledFrames();
function sliceFrames() {
  const frames = [0];
  let speed = 256, acceleration = 1, x = 0;
  while (x < 240) {
    x = Math.min(240, x + (speed >> 8));
    if (speed <= 0xfff) speed += acceleration;
    if (acceleration < 128) acceleration <<= 1;
    frames.push(x);
  }
  return frames;
}
const SLICE = sliceFrames();
const LENGTH = { 'pokeballs-trail': 100, 'angled-wipes': ANGLED.length, slice: SLICE.length, 'white-bars': 91 };
export function openingBattleTransition({ trainer, party, opponents }) {
  const playerLevel = party.find(m => !m.egg && m.hp > 0)?.level ?? 0,
    enemyLevel = opponents.find(m => !m.egg)?.level ?? 0,
    weaker = enemyLevel < playerLevel,
    pattern = trainer ? (weaker ? 'pokeballs-trail' : 'angled-wipes') : (weaker ? 'slice' : 'white-bars');
  return { kind: 'emerald:' + pattern, coverMs: (INTRO_FRAMES + LENGTH[pattern]) * 1000 / FPS, revealMs: 220 };
}
export function sampleOpeningTransition(pattern, progress) {
  if (!Object.hasOwn(LENGTH, pattern)) throw new Error('Unknown opening battle transition');
  const frame = Math.floor(clamp(progress) * (INTRO_FRAMES + LENGTH[pattern]));
  if (frame < INTRO_FRAMES) {
    const phase = frame % 16;
    return { gray: (phase < 8 ? phase * 2 : (16 - phase) * 2) / 16 };
  }
  const n = frame - INTRO_FRAMES;
  if (pattern === 'angled-wipes') return { mask: ANGLED[Math.min(n, ANGLED.length - 1)] };
  if (pattern === 'slice') return { slice: SLICE[Math.min(n, SLICE.length - 1)] };
  if (pattern === 'white-bars') return {
    bars: WHITE_DELAYS.map(delay => ({ x: clamp(240 - (n - delay) * 16, 240), alpha: clamp((n - delay) / 32) })),
    black: clamp((n - 74) / 17),
  };
  return { balls: TRAIL_DELAYS.map((delay, index) => ({
    x: index % 2 ? 256 - Math.max(0, n - delay) * 8 : -16 + Math.max(0, n - delay) * 8,
    y: index * 32 + 16, rightward: index % 2 === 0,
  })) };
}
export const OPENING_TRANSITION_PATTERNS = Object.freeze(Object.keys(LENGTH));
