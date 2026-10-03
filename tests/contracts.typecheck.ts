import type {
  PluginManifest,
  NetworkCommand,
  MoveAnimation,
  MovementDefinition,
  Creature,
  FieldActionDefinition,
  TerrainRuleDefinition,
  MovementInputDefinition,
  FieldMechanismDefinition,
  FieldDeviceDefinition,
  LearningMethodDefinition,
} from "../dist/engine/contracts.js";
const animation: MoveAnimation = {
  duration: 800,
  tracks: [{ effect: "demo:trail", anchor: "targets", start: 0, end: 1 }],
};
const plugin: PluginManifest = {
  id: "demo",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: [],
  setup(api) {
    const cue = api.presentation.audio("confirm", {
      kind: "sound",
      source: "assets/audio/bicycle-bell.wav",
      volume: 0.3,
      loop: false,
      maxVoices: 2,
    });
    api.events.on("demo:finished", () => api.presentation.sound(cue));
    api.presentation.audio("music", {
      kind: "music",
      source: "assets/demo.ogg",
      volume: 0.5,
      loop: true,
      loopStart: 2,
      loopEnd: 30,
      fadeInMs: 200,
      fadeOutMs: 200,
    });
    api.content.register("fieldDevices", "paired", {
      map: "MyMap",
      x: 2,
      y: 3,
      footprint: [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
      ],
      mechanism: "log-bridge",
      config: {
        tiles: [
          { floating: 0, half: 1, submerged: 2 },
          { floating: 3, half: 4, submerged: 5 },
        ],
      },
    });
    const effect = api.presentation.effect("trail", { draw: () => {} });
    api.presentation.move("water", {
      moveId: "water_gun",
      animation: {
        ...animation,
        tracks: [{ effect, anchor: "targets", start: 0, end: 1 }],
      },
    });
    api.actions.register("pet", {
      schema: {
        type: "object",
        properties: { uid: { type: "string" } },
        required: ["uid"],
        additionalProperties: false,
      },
      run(ctx) {
        ctx.store.set("mood", 55);
        ctx.states.attach("demo:happy", "uid", {
          duration: 128,
          data: { mood: 55 },
        });
        return { ok: true };
      },
    });
    api.presentation.battle("mega", {
      kind: "form",
      match: { formId: "demo:mega" },
      animation: {
        duration: 900,
        tracks: [],
        poses: [
          {
            anchor: "actor",
            start: 0,
            end: 1,
            keyframes: [
              { at: 0, values: { scale: 1 } },
              { at: 1, values: { scale: 1.3 } },
            ],
          },
        ],
      },
    });
    // @ts-expect-error State writes use the public states API, not a mutable state object.
    api.state.party.push({});
    api.presentation.move("bad", {
      moveId: "tackle",
      animation: {
        duration: 500,
        // @ts-expect-error Unknown visual anchors are not supported.
        tracks: [{ effect, anchor: "opponent", start: 0, end: 1 }],
      },
    });
  },
};
const message: NetworkCommand = {
  protocol: 1,
  type: "command",
  session: "s",
  id: "c1",
  sequence: 1,
  command: "demo:pet",
  input: { uid: "uid" },
};
const mode: MovementDefinition = {
  actor: "actor",
  durations: [160, 96],
  allowed: () => true,
  traverse: () => true,
};
const fieldAction: FieldActionDefinition<{ objectId: string }> = {
  name: "Clear object",
  cue: "field-cut",
  duration: 600,
  allowed: (context) => !!context.flags.key,
  target: (context) =>
    context.objects[0] ? { objectId: context.objects[0].id } : null,
  plan: (context, target) => {
    // @ts-expect-error Domain query coordinates cannot be assigned by content callbacks.
    context.position.x = 2;
    return {
      kind: "world",
      operations: [
        {
          kind: "object",
          map: context.position.map,
          id: target.objectId,
          hidden: true,
        },
      ],
    };
  },
};
// @ts-expect-error Future protocol versions require a separate contract.
const badMessage: NetworkCommand = { ...message, protocol: 2 };
function immutableInput(mon: Readonly<Creature>) {
  // @ts-expect-error Query consumers do not mutate creature identity.
  mon.uid = "replacement";
}
void [plugin, message, mode, fieldAction, badMessage, immutableInput];

const terrain: TerrainRuleDefinition = {
  when: (context) => context.cell.behavior === 64,
  after(context) {
    // @ts-expect-error Rules cannot mutate live terrain snapshots.
    context.cell.behavior = 0;
    return { direction: "right", pose: "slide" };
  },
};
void terrain;

const timer: import("../dist/engine/contracts.js").TimeTaskDefinition = {
  intervalMs: 60000,
  catchUp: "aggregate",
};
void timer;

const crop: import("../dist/engine/contracts.js").CropDefinition = {
  item: "oran_berry",
  name: "Oran",
  durationMinutes: 180,
  minYield: 2,
  maxYield: 3,
};
const plot: import("../dist/engine/contracts.js").BerryPlotDefinition = {
  map: "garden:field",
  objectId: "soil",
};
void [crop, plot];

const worker: import("../dist/engine/contracts.js").ActorTemplateDefinition = {
  name: "Worker",
  actor: "ProfBirch",
  behavior: "still",
};
const navigationIntent: import("../dist/engine/contracts.js").NPCIntent = {
  move: false,
  pose: "walk",
  goal: { map: "meadow", x: 1, y: 2, adjacent: true },
  state: { phase: "work" },
};
void [worker, navigationIntent];

const actorPose: import("../dist/engine/contracts.js").NPCPoseDefinition = {
  height: 4,
  periodMs: 400,
  actor: "Boy1",
};
void actorPose;

const devicePolicy: FieldMechanismDefinition = {
  scope: "permanent",
  interact(context) {
    return {
      state: { mode: context.mode },
      timers: [{ key: "reset", delayMs: 20 }],
      requests: [
        { key: "fall", action: "fall", input: { device: context.device.id } },
      ],
    };
  },
};
const device: FieldDeviceDefinition = {
  map: "Lab",
  x: 1,
  y: 1,
  mechanism: "demo:switch",
};
void devicePolicy;
void device;

const movementInput: MovementInputDefinition = {
  decide(context) {
    return {
      state: {},
      action:
        context.busy || !context.input.direction
          ? null
          : {
              kind: "step",
              direction: context.input.direction,
              durationMs: 70,
            },
    };
  },
};
void movementInput;

const learningMethod: LearningMethodDefinition = {
  move: "demo:move",
  consume: 0,
  eligible: (context) => context.mon.level >= 10,
};

const asyncLearning: LearningMethodDefinition = {
  move: "demo:move",
  consume: 0,
  // @ts-expect-error learning eligibility is synchronous and boolean
  eligible: async () => true,
};

const readonlyLearning: LearningMethodDefinition = {
  move: "demo:move",
  consume: 0,
  eligible: (context) => {
    // @ts-expect-error learning policies cannot mutate creature values
    context.mon.hp = 0;
    // @ts-expect-error learning policies cannot replace moves
    context.mon.moves.push({ id: "tackle", pp: 1 });
    return true;
  },
};

const storm: import("../dist/engine/contracts.js").WeatherDefinition = {
  label: "自定义风暴",
  visual: "garden:storm",
  battle: "garden:storm",
};
const stormBattle: import("../dist/engine/contracts.js").BattleWeatherDefinition =
  { residual: { divisor: 16, immuneTypes: ["steel"] } };
const regionWeather: import("../dist/engine/contracts.js").MapWeatherDefinition =
  { default: "clear", regions: [{ x: 1, y: 1, weather: "garden:storm" }] };
void [storm, stormBattle, regionWeather];
