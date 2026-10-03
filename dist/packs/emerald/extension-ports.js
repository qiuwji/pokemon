import { registerEmeraldCommands } from "./application-commands.js";
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
    busy: !!game.busy || !!game.commandBus?.active,
    battle: game.battle ? game.battle.snapshot() : null,
    facilities: game.facilityView(),
    time: game.timeView(),
    weather: game.weatherView(),
    actors: game.actors.list(),
    actorRoutines: game.actors.routines(),
    fieldEffects: game.fieldEffectView(),
    contacts: game.contactView(),
    encounters: game.encounterView(),
    schedule: game.schedule.view(),
    crops: Object.fromEntries(
      Object.keys(game.catalog.berryPlots || {}).map((id) => [
        id,
        game.cropView(id),
      ]),
    ),
    position: { ...game.state.position },
    devices: game.applications.devices.view(),
    movement: { ...game.state.movement },
    movementTechnique: game.movement.technique,
    fieldActions: game.fieldActionOptions(),
    registeredItem: game.registeredItemView(),
    itemActions: Object.fromEntries(
      Object.entries(game.bagView().counts)
        .filter(([, count]) => count > 0)
        .map(([id]) => [id, game.itemActionOptions(id)])
        .filter(([, actions]) => actions.length),
    ),
    party: game.state.party.map((m) => ({
      ...m,
      name: game.db.species[m.species].name,
    })),
    box: game.state.box.map((m) => ({
      ...m,
      name: game.db.species[m.species].name,
    })),
    bag: game.bagView().counts,
    inventory: game.bagView(),
    money: game.state.money,
    flags: { ...game.state.flags },
    seen: [...game.state.seen],
    caught: [...game.state.caught],
    story: structuredClone(game.state.story),
    forms: structuredClone(game.state.forms),
    effectiveParty: game.state.party.map((mon) => game.forms.view(mon)),
    worldState: game.worldState.view(),
    daycare: structuredClone(game.state.daycare),
    objects: game.field.npcs.objects(game.state.position.map).map((o) =>
      Object.fromEntries(
        Object.entries({
          id: o.id,
          x: o.x,
          y: o.y,
          dir: o.dir,
          actor: o.actor,
          kind: o.kind,
        }).filter(([, value]) => value !== undefined),
      ),
    ),
  });
  const bus = new CommandBus({
    onError: host.onError,
    ready: (command, source, args) =>
      command.ready
        ? command.ready(source, args)
        : !game.facilityActive &&
          !game.busy &&
          !game.battle &&
          !game.ui?.dialog,
    onComplete: (id, args, result) => {
      game.flushContacts();
      host.events.emit("core:command-complete", {
        id,
        args,
        result: result ?? null,
      });
    },
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
    permission: "movement",
    ready: () =>
      !game.facilityActive && !game.busy && !game.battle && !game.ui?.blocked,
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
  registerEmeraldCommands(game, bus);
  const runtime = host.attach({
    bus,
    ports: {
      state: () => game.state,
      ready: () =>
        !game.facilityActive && !game.busy && !game.battle && !game.ui?.dialog,
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
          case "weather":
            return intent.clear
              ? game.clearWeather(intent.map)
              : game.setWeather(
                  intent.map,
                  intent.weather,
                  intent.durationMs ?? null,
                );
          case "learnMove":
            return game.teachMove(intent.method, intent.uid, intent.index);
          case "useItem":
            return game.useItem(
              intent.item,
              game.state.party.findIndex((m) => m.uid === intent.uid),
            );
          case "equip":
            return game.equipItem(
              intent.uid,
              intent.remove ? null : intent.item,
            );
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
                inventory: game.inventory,
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
