import { validateEmeraldIntent } from "./extension-intents.js";
import { CommandBus } from "../../engine/extensions/command-bus.js";
import { objectSchema } from "../../engine/extensions/values.js";
import { createMonster } from "../../engine/model.js";
import { grantReward } from "../../engine/story.js";
const uid = { type: "string", minLength: 1, maxLength: 128 };
/** Narrow public application ports. Plugins receive projections and validated intents, never this facade. */
export function attachEmeraldExtensions(game, host) {
  const owned = () => [
    ...game.state.party,
    ...game.state.box,
    ...game.state.tradePartner,
    ...game.state.daycare.slots.map((s) => s.mon),
    ...(game.state.daycare.egg ? [game.state.daycare.egg] : []),
  ];
  const query = () => ({
    busy: !!game.busy,
    battle: game.battle ? game.battle.snapshot() : null,
    position: { ...game.state.position },
    movement: { ...game.state.movement },
    party: game.state.party.map((m) => ({
      ...m,
      name: game.db.species[m.species].name,
    })),
    box: game.state.box.map((m) => ({
      ...m,
      name: game.db.species[m.species].name,
    })),
    bag: { ...game.state.bag },
    money: game.state.money,
    flags: { ...game.state.flags },
    seen: [...game.state.seen],
    caught: [...game.state.caught],
    story: structuredClone(game.state.story),
    daycare: structuredClone(game.state.daycare),
    objects: game.field.npcs.objects(game.state.position.map).map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      dir: o.dir,
      actor: o.actor,
      kind: o.kind,
    })),
  });
  const bus = new CommandBus({
    ready: (command, source, args) =>
      command.id === "core.query" ||
      (!game.busy &&
        !game.battle &&
        !game.ui?.dialog &&
        (!command.ready || command.ready(source, args))),
    onComplete: (id, args, result) =>
      host.events.emit("core:command-complete", {
        id,
        args,
        result: result ?? null,
      }),
  });
  bus.register("core.query", {
    schema: objectSchema(),
    concurrent: true,
    plugin: true,
    network: true,
    id: "core.query",
    ready: () => true,
    run: query,
  });
  bus.register("core.field.move", {
    schema: objectSchema(
      {
        direction: { type: "string", enum: ["up", "down", "left", "right"] },
        running: { type: "boolean" },
      },
      ["direction"],
    ),
    plugin: true,
    network: true,
    run: ({ direction, running = false }) => game.move(direction, { running }),
  });
  bus.register("core.party.lead", {
    schema: objectSchema({ uid }, ["uid"]),
    plugin: true,
    permission: "setLead",
    network: true,
    run: ({ uid }) =>
      game.setLead(game.state.party.findIndex((m) => m.uid === uid)),
  });
  const runtime = host.attach({
    bus,
    ports: {
      state: () => game.state,
      random: () => game.rng,
      query,
      hasUid: (uid) => owned().some((m) => m.uid === uid),
      changed: () => {
        game.ui?.updateSide();
        game.ui?.extensions?.refresh();
        game.save();
      },
      present: (id, payload) => game.ui?.extensions?.present(id, payload),
      validateIntent: (intent, owner) =>
        validateEmeraldIntent(intent, owner, game.itemDefinitions),
      applyIntent: (intent, owner) => {
        validateEmeraldIntent(intent, owner, game.itemDefinitions);
        const mon = owned().find((m) => m.uid === intent.uid);
        switch (intent.kind) {
          case "friendship":
            if (
              !mon ||
              mon.egg ||
              !Number.isInteger(intent.amount) ||
              Math.abs(intent.amount) > 20
            )
              throw new Error("Invalid friendship intent");
            return game.friendship.change(mon, "plugin", {
              party: game.state.party,
              amount: intent.amount,
            });
          case "useItem":
            return game.useItem(
              intent.item,
              game.state.party.findIndex((m) => m.uid === intent.uid),
            );
          case "equip":
            return game.equipItem(intent.uid, intent.item);
          case "setLead":
            return game.setLead(
              game.state.party.findIndex((m) => m.uid === intent.uid),
            );
          case "reward":
            if (!intent.reward?.id?.startsWith(owner + ":"))
              throw new Error("Plugin reward requires namespace");
            return {
              ok: grantReward(game.state, intent.reward, {
                items: game.itemDefinitions,
              }),
            };
          case "createMonster": {
            if (
              !game.db.species[intent.species] ||
              !Number.isInteger(intent.level) ||
              intent.level < 1 ||
              intent.level > 100 ||
              !["party", "box"].includes(intent.placement)
            )
              throw new Error("Invalid creature creation intent");
            const target = game.state[intent.placement];
            if (target.length >= (intent.placement === "party" ? 6 : 200))
              throw new Error("No creature capacity");
            const created = createMonster(
              intent.species,
              intent.level,
              game.db,
              game.rng,
            );
            target.push(created);
            game.seen(created.species, true);
            return { ok: true, uid: created.uid };
          }
          default:
            throw new Error("Unknown core intent");
        }
      },
    },
  });
  game.commandBus = bus;
  return { bus, runtime, query };
}
