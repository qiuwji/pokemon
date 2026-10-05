import { objectSchema } from '../../engine/extensions/values.js';
const schema = objectSchema();
// field_special_scene.c: GetTruckCameraBobbingY / GetTruckBoxYMovement, 60 Hz.
const frame = (f) => Math.floor((f.progress * f.duration - 1500) * 60 / 1000);
const boxBounce = (n) => (n >= 0 && (n + 120) % 180 === 0 ? -1 : 0);
const boxes = [
  ['truck.box.top', 30, 4], ['truck.box.left', 0, 2], ['truck.box.right', 0, 4],
];
const stopping = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, -1, -1, -1, 0];
const stopSample = (f) => {
  const n = Math.floor(f.progress * f.duration * 60 / 1000);
  const step = Math.min(18, Math.floor((n + 1) / 6));
  return { n, x: stopping[step], y: step < 9 ? (n % 120 === 0 ? -1 : n % 10 <= 4 ? 1 : 0) : 0, step };
};
export const OPENING_SCENES = new Map([
  ['emerald:actor-hop', {
    duration: 400,
    schema: objectSchema({ map: { type: 'string' }, actor: { type: 'string' } }, ['map', 'actor']),
    objects: (frame) => [{ map: frame.payload.map, id: frame.payload.actor, x: 0,
      y: -Math.round(8 * Math.sin(frame.progress * Math.PI)) }],
  }],
  ['emerald:truck-ride', {
    duration: 9000, schema,
    field: (f) => {
      const n = frame(f);
      return { y: n < 0 ? 0 : (n + 1) % 120 === 0 ? -1 : (n + 1) % 10 <= 4 ? 1 : 0 };
    },
    objects: (f) => boxes.map(([id, phase, amplitude]) => ({
      map: 'InsideOfTruck', id, x: 0, y: boxBounce(frame(f) + phase) * amplitude,
    })),
    draw: (ctx, f) => {
      // Original starts covered and reveals the truck after 90+150 frames.
      ctx.fillStyle = `rgba(0,0,0,${f.reducedMotion ? 0 : Math.max(0, Math.min(1, (4400 - f.progress * f.duration) / 400))})`;
      ctx.fillRect(0, 0, 320, 224);
    },
  }],
  ['emerald:truck-stop', {
    duration: 1900, schema,
    field: (f) => { const { x, y } = stopSample(f); return { x, y }; },
    objects: (f) => {
      const { n, x, step } = stopSample(f);
      return boxes.map(([id, phase, amplitude]) => ({
        map: 'InsideOfTruck', id, x: -x, y: step < 9 ? boxBounce(n + phase) * amplitude : 0,
      }));
    },
  }],
]);
