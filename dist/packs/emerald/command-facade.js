/** Trusted UI compatibility adapter: preserve method names while routing mutations through the shared bus. */
export function createEmeraldCommandFacade(
  game,
  bus,
  { onError = console.error } = {},
) {
  const uidAt = (collection, index) => collection[index]?.uid || "missing";
  const evolutionArgs = (mon, plan) => ({
    uid: mon.uid,
    trigger: plan.trigger,
    ...(plan.item ? { item: plan.item } : {}),
    from: plan.from,
    to: plan.to,
  });
  const routes = {
    playPresentation: (id, payload = {}) => [
      "presentation.play",
      { id, payload: JSON.stringify(payload) },
    ],
    move: (direction, { running = false } = {}) => [
      "field.move",
      { direction, running },
    ],
    interact: () => ["field.interact", {}],
    chooseStarter: (species) => ["starter.choose", { species }],
    turn: (action) => ["battle.action", action],
    setLead: (index) => ["party.lead", { uid: uidAt(game.state.party, index) }],
    useItem: (item, index) => [
      "item.use",
      { item, uid: uidAt(game.state.party, index) },
    ],
    usePotion: (index) => [
      "item.use",
      { item: "potion", uid: uidAt(game.state.party, index) },
    ],
    equipItem: (uid, item) => [
      "item.equip",
      { uid, ...(item ? { item } : { remove: true }) },
    ],
    buyItem: (item) => ["item.buy", { item }],
    withdrawBox: (index) => [
      "box.withdraw",
      { uid: uidAt(game.state.box, index) },
    ],
    depositBox: (index) => [
      "box.deposit",
      { uid: uidAt(game.state.party, index) },
    ],
    exchangeBox: (boxIndex, partyIndex) => [
      "box.exchange",
      {
        boxUid: uidAt(game.state.box, boxIndex),
        partyUid: uidAt(game.state.party, partyIndex),
      },
    ],
    depositDaycare: (uid) => ["daycare.deposit", { uid }],
    withdrawDaycare: (uid) => ["daycare.withdraw", { uid }],
    collectEgg: () => ["daycare.collect", {}],
    prepareTradePartner: () => ["trade.prepare", {}],
    performTrade: (uid, partnerUid) => ["trade.exchange", { uid, partnerUid }],
    setMovementMode: (mode) => ["movement.mode", { mode }],
    boardSurf: () => ["movement.surf", {}],
    flyTo: (destination) => ["movement.fly", { destination }],
    claimFieldEquipment: () => ["movement.equipment", {}],
    learnMove: (mon, index) => [
      "growth.learn",
      { uid: mon.uid, ...(index === null ? { skip: true } : { index }) },
    ],
    animateEvolution: (mon, plan) => [
      "growth.evolve",
      evolutionArgs(mon, plan),
    ],
    evolve: (mon, options = {}) => {
      if (!options.cancel)
        throw new Error("UI evolution must use presentation command");
      return [
        "growth.cancel",
        evolutionArgs(mon, options.plan || game.evolutionPlan(mon)),
      ];
    },
    save: (show = false) => ["save.write", { show }],
    loadDocument: (document) => [
      "save.import",
      { document: JSON.stringify(document) },
    ],
    reset: () => ["save.reset", {}],
    advancePlayTime: () => ["session.play-time", {}],
  };
  const objectFailures = new Set([
    "playPresentation",
    "useItem",
    "equipItem",
    "depositDaycare",
    "withdrawDaycare",
    "collectEgg",
    "performTrade",
    "setMovementMode",
    "boardSurf",
    "flyTo",
    "animateEvolution",
  ]);
  const failure = (name, error) => {
    if (error.code !== "busy") onError(error);
    if (["loadDocument", "reset"].includes(name)) throw error;
    return objectFailures.has(name)
      ? {
          ok: false,
          reason: error.code === "busy" ? "请先结束当前行动。" : error.message,
        }
      : false;
  };
  const bound = new Map();
  return new Proxy(game, {
    get(target, name) {
      if (bound.has(name)) return bound.get(name);
      if (Object.hasOwn(routes, name)) {
        const command = (...args) => {
          try {
            const [id, input] = routes[name](...args),
              fullId = "core." + id;
            if (bus.definition(fullId).mode === "async")
              return bus
                .execute(fullId, input, "ui")
                .catch((error) => failure(name, error));
            const result = bus.executeSync(fullId, input, "ui");
            return name === "usePotion" ? !!result?.ok : result;
          } catch (error) {
            return failure(name, error);
          }
        };
        bound.set(name, command);
        return command;
      }
      const value = Reflect.get(target, name, target);
      if (typeof value === "function") {
        const method = value.bind(target);
        bound.set(name, method);
        return method;
      }
      return value;
    },
  });
}
