import { objectSchema } from "../../engine/extensions/values.js";
const id = { type: "string", minLength: 1, maxLength: 128 };
const empty = objectSchema();
const byUid = objectSchema({ uid: id }, ["uid"]);
/** Public mutations resolve stable identities at execution time; raw domain methods stay private to composition. */
export function registerEmeraldCommands(game, bus) {
  const field = () => !game.busy && !game.battle && !game.ui?.dialog;
  const partyIndex = (uid) => game.state.party.findIndex((m) => m.uid === uid);
  const boxIndex = (uid) => game.state.box.findIndex((m) => m.uid === uid);
  const domainPermissions = {
    time: "time",
    crop: "crops",
    actor: "actors",
    field: "movement",
    world: "world",
    device: "world",
    movement: "movement",
    battle: "battle",
    starter: "starter",
    box: "storage",
    daycare: "daycare",
    trade: "trade",
    save: "save",
    growth: "evolution",
  };
  const commandPermissions = {
    "item.use": "useItem",
    "item.equip": "equip",
    "item.buy": "buyItem",
    "growth.learn": "learnMove",
  };
  const permissionFor = (name) => {
    const permission =
      commandPermissions[name] || domainPermissions[name.split(".")[0]];
    return permission ? { plugin: true, permission } : {};
  };
  const register = (
    name,
    schema,
    run,
    { mode = "instant", network = true, ready = field, ...rest } = {},
  ) =>
    bus.register("core." + name, {
      schema,
      run,
      mode,
      network,
      ready,
      ...permissionFor(name),
      ...rest,
    });
  register(
    "field.input",
    objectSchema({
      direction: { type: "string", enum: ["up", "down", "left", "right"] },
      secondary: { type: "boolean" },
      running: { type: "boolean" },
    }),
    ({ direction = null, secondary = false, running = false }) =>
      game.handleFieldInput({ direction, secondary, running }),
    { concurrent: true, ready: () => true },
  );
  register(
    "field.input-reset",
    empty,
    () => {
      game.resetFieldInput();
      return true;
    },
    { concurrent: true, ready: () => true },
  );
  const actorPosition = objectSchema(
    {
      map: id,
      x: { type: "integer", minimum: 0 },
      y: { type: "integer", minimum: 0 },
      dir: { type: "string", enum: ["up", "down", "left", "right"] },
      elevation: { type: "integer", minimum: 0, maximum: 14 },
      previousElevation: { type: "integer", minimum: 0, maximum: 14 },
    },
    ["map", "x", "y", "dir"],
  );
  register(
    "actor.spawn",
    objectSchema({ template: id, position: actorPosition }, [
      "template",
      "position",
    ]),
    ({ template, position }) => game.actors.spawn(template, position),
  );
  register(
    "actor.update",
    objectSchema(
      {
        uid: id,
        position: actorPosition,
        data: { type: "string", maxLength: 8192 },
        pose: id,
        hidden: { type: "boolean" },
      },
      ["uid"],
    ),
    ({ uid, data, ...changes }) =>
      game.actors.update(uid, {
        ...changes,
        ...(data !== undefined ? { data: JSON.parse(data) } : {}),
      }),
  );
  register("device.interact", objectSchema({ id }, ["id"]), ({ id }) =>
    game.applications.devices.interact(id),
  );
  register("actor.remove", byUid, ({ uid }) => game.actors.remove(uid));
  register(
    "crop.action",
    objectSchema(
      {
        id,
        action: { type: "string", enum: ["plant", "water", "harvest"] },
        kind: id,
      },
      ["id", "action"],
    ),
    ({ id, action, kind }) => game.cropAction(id, action, kind),
  );
  register("creature.form.restore", byUid, ({ uid }) => game.restoreForm(uid), {
    plugin: true,
    permission: "forms",
  });
  register(
    "creature.form",
    objectSchema({ uid: id, form: id }, ["uid", "form"]),
    ({ uid, form }) => game.changeForm(uid, form),
    { plugin: true, permission: "forms" },
  );
  register(
    "world.patch",
    objectSchema({ operations: { type: "string", maxLength: 65536 } }, [
      "operations",
    ]),
    ({ operations }) => game.patchWorld(JSON.parse(operations)),
  );
  register(
    "presentation.play",
    objectSchema({ id, payload: { type: "string", maxLength: 4096 } }, ["id"]),
    ({ id, payload }) =>
      game.playPresentation(id, payload ? JSON.parse(payload) : {}),
    { mode: "async", plugin: true, permission: "presentation" },
  );
  register("field.interact", empty, () => game.interact(), {
    ready: () =>
      !!game.ui?.dialog || (!game.busy && !game.battle && !game.ui?.blocked),
  });
  register(
    "starter.choose",
    objectSchema(
      { species: { type: "string", enum: ["treecko", "torchic", "mudkip"] } },
      ["species"],
    ),
    ({ species }) => {
      game.ui?.closeModal();
      return game.chooseStarter(species);
    },
    {
      mode: "async",
      ready: () =>
        field() && !!game.state.flags.heardBirch && !game.state.flags.starter,
    },
  );
  register(
    "battle.start",
    objectSchema({ trainerId: id }, ["trainerId"]),
    ({ trainerId }) => game.startTrainerBattle(trainerId),
    { mode: "async", ready: field, permission: "battle" },
  );
  register(
    "battle.action",
    objectSchema(
      {
        kind: {
          type: "string",
          enum: [
            "move",
            "switch",
            "item",
            "potion",
            "ball",
            "run",
            "cancel",
            "form",
          ],
        },
        index: { type: "integer", minimum: -1, maximum: 5 },
        item: id,
        form: id,
        seat: id,
        actor: id,
        target: objectSchema(
          {
            kind: { type: "string", enum: ["seat", "side", "self", "field"] },
            id,
          },
          ["kind"],
        ),
      },
      ["kind"],
    ),
    (action) => game.turn(action),
    { mode: "async", ready: () => !!game.battle && !game.busy },
  );
  register(
    "item.use",
    objectSchema({ uid: id, item: id }, ["uid", "item"]),
    ({ uid, item }) => game.useItem(item, partyIndex(uid)),
  );
  register(
    "item.equip",
    objectSchema({ uid: id, item: id, remove: { type: "boolean" } }, ["uid"]),
    ({ uid, item, remove }) => {
      if (remove === true ? item !== undefined : !item)
        throw new Error("Specify an item or remove equipment");
      return game.equipItem(uid, remove ? null : item);
    },
  );
  register("item.buy", objectSchema({ item: id }, ["item"]), ({ item }) =>
    game.buyItem(item),
  );
  register("box.deposit", byUid, ({ uid }) => game.depositBox(partyIndex(uid)));
  register("box.withdraw", byUid, ({ uid }) => game.withdrawBox(boxIndex(uid)));
  register(
    "box.exchange",
    objectSchema({ boxUid: id, partyUid: id }, ["boxUid", "partyUid"]),
    ({ boxUid, partyUid }) =>
      game.exchangeBox(boxIndex(boxUid), partyIndex(partyUid)),
  );
  register("daycare.deposit", byUid, ({ uid }) => game.depositDaycare(uid));
  register("daycare.withdraw", byUid, ({ uid }) => game.withdrawDaycare(uid));
  register("daycare.collect", empty, () => game.collectEgg(), {
    mode: "async",
  });
  register("trade.prepare", empty, () => game.prepareTradePartner());
  register(
    "trade.exchange",
    objectSchema({ uid: id, partnerUid: id }, ["uid", "partnerUid"]),
    ({ uid, partnerUid }) => game.performTrade(uid, partnerUid),
    { mode: "async" },
  );
  register("movement.mode", objectSchema({ mode: id }, ["mode"]), ({ mode }) =>
    game.setMovementMode(mode),
  );
  register("movement.surf", empty, () => game.boardSurf(), { mode: "async" });
  register(
    "movement.fly",
    objectSchema({ destination: id }, ["destination"]),
    ({ destination }) => game.flyTo(destination),
    { mode: "async" },
  );
  register("movement.equipment", empty, () => game.claimFieldEquipment());
  register(
    "movement.technique",
    objectSchema({ technique: id }, ["technique"]),
    ({ technique }) => game.setMovementTechnique(technique),
  );
  register(
    "field.action",
    objectSchema({ id, input: { type: "string", maxLength: 4096 } }, ["id"]),
    ({ id, input }) =>
      game.performFieldAction(id, input ? JSON.parse(input) : {}),
    { mode: "async" },
  );
  register(
    "field.fishing-input",
    objectSchema({ cancel: { type: "boolean" } }),
    (input) => game.reelFishing(input),
    { concurrent: true, ready: () => !!game.fishing },
  );
  register(
    "growth.learn",
    objectSchema(
      {
        uid: id,
        index: { type: "integer", minimum: 0, maximum: 3 },
        skip: { type: "boolean" },
      },
      ["uid"],
    ),
    ({ uid, index, skip }) => {
      if (skip === true ? index !== undefined : index === undefined)
        throw new Error("Specify a move slot or skip learning");
      return game.learnMove(
        game.state.party[partyIndex(uid)],
        skip ? null : index,
      );
    },
  );
  const evolutionSchema = objectSchema(
    {
      uid: id,
      trigger: { type: "string", enum: ["level", "item"] },
      item: id,
      from: id,
      to: id,
    },
    ["uid", "trigger", "from", "to"],
  );
  const evolution = (args) => {
    const mon = game.state.party[partyIndex(args.uid)],
      plan =
        mon &&
        game.evolutionPlan(mon, {
          trigger: args.trigger,
          ...(args.item ? { item: args.item } : {}),
        });
    if (!plan || plan.from !== args.from || plan.to !== args.to)
      throw new Error("Evolution conditions changed");
    return { mon, plan };
  };
  register(
    "growth.evolve",
    evolutionSchema,
    (args) => {
      const { mon, plan } = evolution(args);
      return game.animateEvolution(mon, plan);
    },
    { mode: "async" },
  );
  register("growth.cancel", evolutionSchema, (args) => {
    const { mon, plan } = evolution(args);
    return game.evolve(mon, { cancel: true, plan });
  });
  register(
    "save.write",
    objectSchema({ show: { type: "boolean" } }),
    ({ show = false }) => game.save(show) ?? null,
    { ready: () => true, concurrent: true },
  );
  // Import/reset require the normal local review flow; network callers cannot replace a whole save.
  register(
    "save.import",
    objectSchema(
      { document: { type: "string", minLength: 1, maxLength: 1048576 } },
      ["document"],
    ),
    ({ document }) => {
      game.loadDocument(JSON.parse(document));
      return true;
    },
    { network: false, plugin: false, maxInputBytes: 2097152 },
  );
  register(
    "time.start",
    objectSchema(
      {
        hour: { type: "integer", minimum: 0, maximum: 23 },
        minute: { type: "integer", minimum: 0, maximum: 59 },
      },
      ["hour", "minute"],
    ),
    ({ hour, minute }) => game.startClock(hour, minute),
  );
  register(
    "time.schedule",
    objectSchema(
      {
        definition: id,
        delayMs: {
          type: "integer",
          minimum: 0,
          maximum: Number.MAX_SAFE_INTEGER,
        },
        data: { type: "string", maxLength: 8192 },
      },
      ["definition", "delayMs"],
    ),
    ({ definition, delayMs, data }) =>
      game.scheduleTimeTask(definition, delayMs, data ? JSON.parse(data) : {}),
  );
  register("time.cancel", objectSchema({ id }, ["id"]), ({ id }) =>
    game.cancelTimeTask(id),
  );
  register(
    "time.advance",
    objectSchema(
      { ms: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } },
      ["ms"],
    ),
    ({ ms }) => game.advanceWorldTime(ms),
    { permission: "timeControl" },
  );
  register("save.reset", empty, () => game.reset(), {
    network: false,
    plugin: false,
  });
  register(
    "session.play-time",
    empty,
    () => {
      game.syncTime();
      return true;
    },
    { network: false, concurrent: true, ready: () => true },
  );
}
