/**
 * E2E scenario support. Goes only through the public plugin surface so each engine
 * module can be exercised in a purpose-built scene without replaying the story.
 *
 *  - destinations: each E2E scene joins the game's own 旅行与移动 fast-travel list,
 *    so a controller can jump straight into a scene instead of walking there.
 *  - items + learningMethods: field machines, so a granted creature can legitimately
 *    come to know Surf/Fly/Dive/Waterfall and satisfy the surf/fly capability gates.
 *  - actions: scenario arming, exposed as network commands.
 *
 * Item and badge unlocking goes through the reward intent (items + flags), the only
 * documented way a plugin may hand the player field equipment. Rewards are idempotent
 * per id, so each unlock mints a fresh id from plugin-owned state.
 */
import { objectSchema } from "../engine/extensions/values.js";

const SCENES = [
  { id: "terrain", map: "E2ETestField", name: "地形测试场", x: 8, y: 1 },
  { id: "bike", map: "E2EBikeField", name: "自行车测试场", x: 8, y: 1 },
  { id: "surf", map: "E2ESurfField", name: "冲浪测试场", x: 8, y: 1 },
  { id: "fly", map: "E2EFlyField", name: "飞行测试场", x: 8, y: 1 },
  { id: "hub", map: "E2ETestHub", name: "测试中枢", x: 8, y: 8 },
];

// One machine per field move; `machines` pocket, reusable so repeated drills are free.
const MACHINES = [
  { id: "surf", move: "surf", label: "冲浪" },
  { id: "fly", move: "fly", label: "飞翔" },
  { id: "dive", move: "dive", label: "潜水" },
  { id: "waterfall", move: "waterfall", label: "攀瀑" },
];

export const e2eSupport = {
  id: "e2e-support",
  apiVersion: 1,
  version: "1.1.0",
  dataVersion: 1,
  permissions: ["createMonster", "reward", "world", "save", "movement"],
  validateData() {},
  setup(api) {
    for (const scene of SCENES)
      api.content.register("destinations", scene.id, {
        name: scene.name,
        position: { map: scene.map, x: scene.x, y: scene.y, dir: "down" },
      });

    for (const m of MACHINES) {
      const item = `e2e-tm-${m.id}`;
      api.content.register("items", item, {
        name: `${m.label}机`,
        pocket: "machines",
        price: 0,
        contexts: ["field"],
        target: "party",
        effects: [],
        icon: "◎",
        description: `E2E 场景用。教会${m.label}。`,
      });
      api.content.register("learningMethods", m.id, {
        move: m.move,
        item,
        consume: 0,
        protectMove: true,
        friendship: false,
        eligible: () => true,
      });
    }

    // grantReward is idempotent per id, so each call needs a fresh one.
    const nextRewardId = (ctx) => {
      const n = (ctx.store.get("unlockSeq") || 0) + 1;
      ctx.store.set("unlockSeq", n);
      return `e2e:unlock-${n}`;
    };

    api.actions.register("unlock", {
      schema: objectSchema({
        items: {
          type: "array",
          maxItems: 32,
          items: { type: "string", minLength: 1, maxLength: 64 },
        },
        flags: {
          type: "array",
          maxItems: 32,
          items: { type: "string", minLength: 1, maxLength: 64 },
        },
        money: { type: "integer", minimum: 0, maximum: 999999 },
      }),
      network: true,
      concurrent: true,
      ready: () => true,
      run(ctx, input) {
        const items = {};
        for (const id of input.items || []) items[id] = 1;
        const flags = {};
        for (const key of input.flags || []) flags[key] = true;
        if (Object.keys(items).length || Object.keys(flags).length || input.money)
          ctx.intent({
            kind: "reward",
            reward: {
              id: nextRewardId(ctx),
              items,
              flags,
              money: input.money || 0,
            },
          });
        return { items: Object.keys(items), flags: Object.keys(flags) };
      },
    });

    api.actions.register(
      "arm",
      {
        schema: objectSchema({
          species: { type: "string", minLength: 1, maxLength: 32 },
          level: { type: "integer", minimum: 1, maximum: 100 },
        }),
        network: true,
        concurrent: true,
        ready: () => true,
        run(ctx, input) {
          ctx.intent({
            kind: "createMonster",
            species: input.species,
            level: input.level || 5,
            placement: "party",
          });
          return { armed: input.species, level: input.level || 5 };
        },
      },
    );
  },
};

export const E2E_SCENES = SCENES;
export const E2E_MACHINES = MACHINES;
