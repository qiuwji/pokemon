import { frontCell } from "../dist/engine/extensions/field-utils.js";
import type {
  PluginManifest,
  NetworkCommand,
  MoveAnimation,
  MovementDefinition,
  Creature,
  FieldActionDefinition,
  FieldEffectDefinition,
  TerrainRuleDefinition,
  MovementInputDefinition,
  FieldMechanismDefinition,
  FieldDeviceDefinition,
  LearningMethodDefinition,
  InventoryView,
  InventoryFailure,
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
    api.queries.register("snapshot", { schema: { type: "object", properties: {}, additionalProperties: false },
      network: true, read: view => view.store.get("counter") });
    api.queries.register("async-snapshot", { schema: { type: "object", properties: {}, additionalProperties: false },
      // @ts-expect-error Query readers are synchronous and cannot return a Promise.
      read: async () => ({ count: 1 }) });

    const fieldEffect: FieldEffectDefinition = {
      scope: "world",
      schema: {
        type: "object",
        properties: { radius: { type: "integer", minimum: 0, maximum: 512 } },
        required: ["radius"],
        additionalProperties: false,
      },
      retain: (context) => context.reason !== "travel" && context.map.indoor,
      presentation: (data) => ({ kind: "light-radius", radius: data.radius }),
    };
    const fieldEffectId = api.content.register(
      "fieldEffects",
      "light",
      fieldEffect,
    );
    const activateLight: FieldActionDefinition = {
      name: "Light",
      cue: "field-flash",
      duration: 240,
      triggers: ["interact"],
      priority: 10,
      allowed: (c) => !!c.map.darkness && !c.effects.records[fieldEffectId],
      target: (c) => frontCell(c.position),
      plan: () => ({ kind: "effect", id: fieldEffectId, data: { radius: 80 } }),
    };
    api.content.register("fieldActions", "light", activateLight);
    const pocket: import("../dist/engine/contracts.js").InventoryPocketDefinition =
      {
        label: "材料",
        capacity: 12,
        stackLimit: 50,
        allowDuplicates: true,
      };
    api.content.register("inventoryPockets", "materials", pocket);
    api.presentation.scene("focus", {
      duration: 800,
      schema: { type: "object", properties: {}, additionalProperties: false },
      field: (frame) => {
        // @ts-expect-error Scene frames cannot be rewritten by plugins.
        frame.progress = 0;
        return { zoom: 1 + Math.sin(frame.progress * Math.PI) };
      },
    });
    api.presentation.sprite("detail", {
      width: 64,
      height: 64,
      loop: true,
      match: { species: "mudkip", view: "detail" },
      frames: [
        {
          resource: "mudkip-front",
          durationMs: 125,
          rect: { x: 0, y: 0, width: 64, height: 64 },
        },
      ],
    });
    const visual = api.presentation.register("portrait", {
      duration: 1000,
      loop: true,
      draw(_ctx, frame) {
        const phase: number = frame.progress;
        // @ts-expect-error Visual frame data is not a state write port.
        frame.payload.mood = phase;
        // @ts-expect-error Playback time cannot be rewritten by plugins.
        frame.elapsedMs = 0;
      },
    });
    api.ui.region("portrait", {
      slot: "monster.content",
      render: () => ({
        kind: "canvas",
        visual,
        width: 200,
        height: 200,
        alt: "互动画像",
      }),
    });
    api.presentation.textEffect("float", {
      sample(parameters, context) {
        // @ts-expect-error Visual contexts cannot be rewritten by plugins.
        context.elapsedMs = 0;
        // @ts-expect-error Text-effect parameters are read-only.
        parameters.height = 10;
        return { y: Math.sin(context.elapsedMs / 100) };
      },
    });
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
const workerSchedule: import("../dist/engine/contracts.js").ActorScheduleDefinition =
  {
    offscreen: "hold",
    entries: [
      {
        id: "work",
        start: 0,
        days: [0, 1, 2, 3, 4, 5, 6],
        position: { map: "garden:work", x: 2, y: 3, dir: "up" },
        behavior: "still",
        radius: 1,
      },
    ],
  };
const workerTemplate: import("../dist/engine/contracts.js").ActorTemplateDefinition =
  {
    name: "Worker",
    actor: "ProfBirch",
    behavior: "still",
    schedule: "garden:worker",
  };
const stormBattle: import("../dist/engine/contracts.js").BattleWeatherDefinition =
  { residual: { divisor: 16, immuneTypes: ["steel"] } };
const regionWeather: import("../dist/engine/contracts.js").MapWeatherDefinition =
  { default: "clear", regions: [{ x: 1, y: 1, weather: "garden:storm" }] };
void [storm, stormBattle, regionWeather];

const selectedRemoval: import("../dist/engine/contracts.js").InventoryOperation =
  {
    kind: "remove",
    item: "potion",
    count: 1,
    slot: { pocket: "items", item: "potion", index: 3 },
  };
const invalidSlotAddition: import("../dist/engine/contracts.js").InventoryOperation =
  {
    kind: "add",
    item: "potion",
    count: 1,
    // @ts-expect-error additions fill existing stacks; a selected slot only applies to removal
    slot: { pocket: "items", item: "potion", index: 3 },
  };
void [selectedRemoval, invalidSlotAddition];

function inventoryReader(view: InventoryView, failure: InventoryFailure) {
  const count: number = view.counts.potion || 0;
  const code: "full" | "insufficient" | "stale-slot" = failure.code;
  // @ts-expect-error Inventory projections never provide a write port.
  view.counts.potion = count;
  // @ts-expect-error Nested slot projections are immutable as well.
  view.pockets.items.slots[0]!.count = count;
  return { count, code };
}
void inventoryReader;

const augment: import("../dist/engine/contracts.js").BattleAugmentDefinition = {
  name: "Burst",
  moves: ["demo:burst"],
  select: () => "demo:burst",
  requires: (context) => context.sourceMove.power > 0 && context.actor.hp > 0,
  limit: { scope: "controller", max: 1 },
  cost: { pp: 1 },
};
const augmentedAction: import("../dist/engine/contracts.js").BattleAction = {
  kind: "move",
  index: 0,
  augment: "demo:burst",
};
void augment;
void augmentedAction;

const region: import("../dist/engine/contracts.js").UIRegionDefinition = {
  slot: "bag.content",
  when: (view) => view.context.inBattle === false,
  render: () => ({
    kind: "form",
    action: "demo:note",
    children: [
      {
        kind: "input",
        name: "title",
        label: "Title",
        value: "Trip",
        maxLength: 40,
      },
      { kind: "checkbox", name: "pinned", value: false },
      { kind: "button", text: "Save", submit: true },
    ],
  }),
};
void region;

const encounterPolicy: import("../dist/engine/contracts.js").EncounterPolicyDefinition =
  {
    channel: "step",
    priority: 100,
    when: (context) => context.position.map === "demo:field",
    decide: (context) => {
      // @ts-expect-error Policy queries cannot mutate party members.
      context.party[0].hp = 1;
      return null;
    },
  };
void encounterPolicy;

declare const visualAPI: import("../dist/engine/contracts.js").PluginAPI;
const layeredAppearance: import("../dist/engine/contracts.js").AppearanceDefinition =
  {
    name: "outfit",
    variants: {
      default: {
        layers: [
          { kind: "actor", actor: "ProfBirch" },
          {
            kind: "image",
            resource: "tailor:shirt",
            size: { width: 16, height: 32 },
          },
        ],
      },
    },
  };
visualAPI.content.register("appearances", "outfit", layeredAppearance);
const wideCamera: import("../dist/engine/contracts.js").CameraProfileDefinition =
  { name: "wide", columns: 30, rows: 20 };
visualAPI.content.register("cameraProfiles", "wide", wideCamera);
const fogLayer: import("../dist/engine/contracts.js").EnvironmentLayerDefinition =
  { name: "fog", visual: "weather.fog", opacity: 0.2 };
visualAPI.content.register("environmentLayers", "mist", fogLayer);

const jsonFacility: import("../dist/engine/extensions/facility-content.js").FacilityContentPack = {
  version: 1, facilities: [{ id: "tower", name: "Tower", template: "battle-sequence",
    parameters: { trainers: ["mod:trainer"], money: 10 }, team: { min: 1,max: 3 } }],
};
void jsonFacility;
const wrongJSONFacility: import("../dist/engine/extensions/facility-content.js").JSONFacilityDefinition = {
  id: "slots", name: "Slots", template: "reel-machine",
  // @ts-expect-error Reel parameters cannot use battle-sequence fields.
  parameters: { trainers: ["trainer"], money: 20 },
};
void wrongJSONFacility;
