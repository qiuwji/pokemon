import { objectSchema } from "../../engine/extensions/values.js";
import { frontCell } from "../../engine/extensions/field-utils.js";
import { isWater } from "../../engine/extensions/terrain-utils.js";

// Viewport is 240x160 (host logical pixels); all drawing stays inside it.
const VIEW_WIDTH = 240;
const PLAY_LEFT = 20;
const PLAY_WIDTH = 200;
const TOP = 24;
const PADDLE_WIDTH = 44;
const PADDLE_HEIGHT = 8;
const PADDLE_Y = 140;
const PADDLE_SPEED = 3.2;
const STAR_RADIUS = 6;

// Deterministic 32-bit LCG: business state stays replayable without host randomness in step.
const advanceSeed = (seed) => (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
const unit = (seed) => advanceSeed(seed) / 4294967296;

/** Host-driven real-time mini-game: steer the paddle to catch falling stars. */
export const starCatch = {
  id: "star-catch", apiVersion: 1, version: "1.0.0", dataVersion: 1,
  permissions: ["reward"],
  setup(api) {
    const finish = api.actions.register("finish", {
      schema: objectSchema({
        instance: { type: "string", minLength: 1, maxLength: 128 },
        context: objectSchema({
          map: { type: "string" },
          position: objectSchema({
            map: { type: "string" }, x: { type: "integer" }, y: { type: "integer" }, dir: { type: "string" },
          }, ["map", "x", "y", "dir"]),
        }, ["map", "position"]),
        outcome: { type: "string", enum: ["success", "failure"] },
        result: objectSchema({
          score: { type: "integer", minimum: 0 },
          misses: { type: "integer", minimum: 0 },
        }, ["score", "misses"]),
      }, ["instance", "context", "outcome", "result"]),
      run(ctx, input) {
        ctx.store.set("plays", (ctx.store.get("plays") || 0) + 1);
        if (input.outcome !== "success") return;
        ctx.store.set("wins", (ctx.store.get("wins") || 0) + 1);
        ctx.intent({ kind: "reward", reward: { id: "star-catch:win", money: 200 } });
      },
    });

    const interaction = api.interactions.register("catch", {
      version: 1,
      parameters: objectSchema({
        target: { type: "integer", minimum: 1, maximum: 50 },
        lives: { type: "integer", minimum: 1, maximum: 9 },
        speed: { type: "number", minimum: 0.1, maximum: 5 },
      }),
      state: objectSchema({
        paddle: { type: "number" },
        starX: { type: "number" },
        starY: { type: "number" },
        score: { type: "integer", minimum: 0 },
        misses: { type: "integer", minimum: 0 },
        seed: { type: "integer", minimum: 0 },
        target: { type: "integer", minimum: 1, maximum: 50 },
        lives: { type: "integer", minimum: 1, maximum: 9 },
        speed: { type: "number", minimum: 0.1, maximum: 5 },
      }, ["paddle", "starX", "starY", "score", "misses", "seed", "target", "lives", "speed"]),
      result: objectSchema({
        score: { type: "integer", minimum: 0 },
        misses: { type: "integer", minimum: 0 },
      }, ["score", "misses"]),
      inputs: ["left", "right"],
      completion: finish,
      init(_context, parameters, random) {
        const target = parameters.target ?? 5;
        const lives = parameters.lives ?? 3;
        const speed = parameters.speed ?? 1.1;
        const seed = (random.int(0x7fffffff) || 1) >>> 0;
        return {
          paddle: Math.round(PLAY_LEFT + (PLAY_WIDTH - PADDLE_WIDTH) / 2),
          starX: Math.round(PLAY_LEFT + STAR_RADIUS + unit(seed) * (PLAY_WIDTH - STAR_RADIUS * 2)),
          starY: TOP,
          score: 0, misses: 0, seed: advanceSeed(seed), target, lives, speed,
        };
      },
      step(state, frame) {
        let paddle = state.paddle;
        const left = frame.input.held.includes("left");
        const right = frame.input.held.includes("right");
        if (left !== right) paddle += right ? PADDLE_SPEED : -PADDLE_SPEED;
        paddle = Math.max(PLAY_LEFT, Math.min(PLAY_LEFT + PLAY_WIDTH - PADDLE_WIDTH, paddle));

        let starY = state.starY + state.speed;
        let { starX, score, misses, seed } = state;
        if (starY + STAR_RADIUS >= PADDLE_Y) {
          const center = paddle + PADDLE_WIDTH / 2;
          if (Math.abs(starX - center) <= PADDLE_WIDTH / 2 + STAR_RADIUS) score += 1;
          else misses += 1;
          seed = advanceSeed(seed);
          starX = Math.round(PLAY_LEFT + STAR_RADIUS + unit(seed) * (PLAY_WIDTH - STAR_RADIUS * 2));
          starY = TOP;
        }

        const next = { ...state, paddle, starX, starY, score, misses, seed };
        if (score >= state.target)
          return { kind: "terminal", state: next, outcome: "success", result: { score, misses } };
        if (misses >= state.lives)
          return { kind: "terminal", state: next, outcome: "failure", result: { score, misses } };
        return { kind: "running", state: next };
      },
      view(state) {
        return {
          nodes: [
            { kind: "panel", x: 0, y: 0, width: VIEW_WIDTH, height: 160, background: "#0b1020", border: "#4c6fff", borderWidth: 1 },
            { kind: "line", x1: PLAY_LEFT, y1: TOP - 6, x2: PLAY_LEFT + PLAY_WIDTH, y2: TOP - 6, width: 1, color: "#27324d" },
            { kind: "circle", x: state.starX, y: state.starY, radius: STAR_RADIUS, color: "#f2d94e", fill: true },
            { kind: "rect", x: state.paddle, y: PADDLE_Y, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, color: "#5ee0ff" },
            { kind: "text", x: 120, y: 8, text: `接星星  ${state.score}/${state.target}   剩余 ${state.lives - state.misses}`, align: "center", size: 8, color: "#ffffff" },
            { kind: "text", x: 120, y: 150, text: "← → 移动，接住星星", align: "center", size: 8, color: "#9fb3d1" },
          ],
          statusText: `得分 ${state.score}`,
        };
      },
    });

    const probe = (c) => {
      const p = frontCell(c.position);
      if (p.x < 0 || p.y < 0 || p.x >= c.map.width || p.y >= c.map.height) return null;
      const index = p.y * c.map.width + p.x;
      return { x: p.x, y: p.y, collision: (c.map.blocks[index] >> 10) & 3, behavior: c.map.behavior[index] };
    };

    // Confirm-key entry: face an empty walkable tile with nothing to talk to.
    // Objects, water and blockers keep their native interaction.
    api.content.register("fieldActions", "play", {
      name: "接星星（小游戏）", cue: "field-impact", duration: 0,
      triggers: ["interact"], schema: objectSchema(),
      allowed: () => true,
      target: (c) => {
        const cell = probe(c);
        if (!cell || cell.collision !== 0 || isWater(cell.behavior)) return null;
        if (c.objects.some((o) => o.x === cell.x && o.y === cell.y)) return null;
        const device = Object.values(c.devices.devices).some(
          (d) => d.map === c.position.map &&
            d.footprint.some((f) => d.x + f.dx === cell.x && d.y + f.dy === cell.y),
        );
        if (device) return null;
        return { map: c.position.map, x: cell.x, y: cell.y };
      },
      plan: () => ({ kind: "interaction", id: interaction, source: "star-catch:field" }),
    });

    api.queries.register("status", {
      schema: objectSchema(),
      read: (view) => ({ plays: view.store.get("plays") || 0, wins: view.store.get("wins") || 0 }),
    });
  },
};
