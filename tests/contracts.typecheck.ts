import type {
  PluginManifest,
  NetworkCommand,
  MoveAnimation,
  MovementDefinition,
  Creature,
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
// @ts-expect-error Future protocol versions require a separate contract.
const badMessage: NetworkCommand = { ...message, protocol: 2 };
function immutableInput(mon: Readonly<Creature>) {
  // @ts-expect-error Query consumers do not mutate creature identity.
  mon.uid = "replacement";
}
void [plugin, message, mode, badMessage, immutableInput];
