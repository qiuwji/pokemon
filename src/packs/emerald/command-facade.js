/** Trusted UI command adapter: route application mutations through the shared bus. */
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
    resumeStory: () => ["story.resume", {}],
    enterFacility: (id, team) => ["facility.enter", { id, team }],
    facilityAction: (action, input = {}) => [
      "facility.action",
      { action, input: JSON.stringify(input) },
    ],
    claimFacility: () => ["facility.claim", {}],
    quitFacility: () => ["facility.quit", {}],
    setWeather: (map, weather, durationMs = null) => [
      "weather.set",
      { map, weather, ...(durationMs !== null ? { durationMs } : {}) },
    ],
    clearWeather: (map) => ["weather.clear", { map }],
    teachMove: (method, uid, index, slot) => [
      "learning.teach",
      {
        method,
        uid,
        ...(index !== undefined ? { index } : {}),
        ...(slot ? { slot } : {}),
      },
    ],
    cropAction: (id, action, kind) => [
      "crop.action",
      { id, action, ...(kind ? { kind } : {}) },
    ],
    playPresentation: (id, payload = {}) => [
      "presentation.play",
      { id, payload: JSON.stringify(payload) },
    ],
    handleFieldInput: ({ direction, secondary, running }) => [
      "field.input",
      { ...(direction ? { direction } : {}), secondary, running },
    ],
    resetFieldInput: () => ["field.input-reset", {}],
    move: (direction, { running = false } = {}) => [
      "field.move",
      { direction, running },
    ],
    interact: () => ["field.interact", {}],
    chooseStarter: (species) => ["starter.choose", { species }],
    turn: (action) => ["battle.action", action],
    swapParty: (firstUid, secondUid) => ["party.swap", {firstUid,secondUid}],
    usePartyFieldMove: (uid, move, destination) => ["movement.party-action", {uid,move,...(destination ? {destination} : {})}],
    setLead: (index) => ["party.lead", { uid: uidAt(game.state.party, index) }],
    useItem: (item, index, slot) => [
      "item.use",
      { item, uid: uidAt(game.state.party, index), ...(slot ? { slot } : {}) },
    ],
    performItemAction: (item, action) => ["item.action", { item, action }],
    registerItem: (item, action) => ["item.register", { item, action }],
    unregisterItem: () => ["item.unregister", {}],
    useRegisteredItem: () => ["item.shortcut", {}],
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
    swapBox: (first, second) => ["box.swap", {
      firstUid: uidAt(game.state.box, first), secondUid: uidAt(game.state.box, second),
    }],
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
    startClock: (hour, minute) => ["time.start", { hour, minute }],
    advancePlayTime: () => ["session.play-time", {}],
  };
  const objectFailures = new Set([
    "enterFacility",
    "facilityAction",
    "claimFacility",
    "quitFacility",
    "startClock",
    "cropAction",
    "playPresentation",
    "teachMove",
    "useItem",
    "performItemAction",
    "registerItem",
    "unregisterItem",
    "useRegisteredItem",
    "equipItem",
    "depositDaycare",
    "withdrawDaycare",
    "collectEgg",
    "performTrade",
    "setMovementMode",
    "usePartyFieldMove",
    "performFieldAction",
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
            return name === "move" ? result.accepted : result;
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
