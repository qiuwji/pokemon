import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  bindApplicationPorts,
  liveApplicationPorts,
} from "../src/game/emerald/application/ports.js";
import {
  PartyApplication,
  PARTY_PORTS,
} from "../src/game/emerald/application/party-application.js";
import {
  exposeApplicationPorts,
  APPLICATION_FIELDS,
  APPLICATION_METHODS,
} from "../src/game/emerald/application/public-ports.js";
test("Application dependencies are explicit, live across state replacement, and cannot be overwritten or broadened", () => {
  let state = { seen: [], caught: [] };
  const ports = liveApplicationPorts(
    (name) =>
      ({
        state,
        db: { moves: {}, species: {} },
        catalog: { items: {}, learningMethods: {} },
      })[name] ?? null,
    PARTY_PORTS,
  );
  const service = new PartyApplication(ports);
  service.seen("treecko", true);
  assert.deepEqual(state.caught, ["treecko"]);
  const previous = state;
  state = { seen: [], caught: [] };
  service.seen("mudkip", true);
  assert.deepEqual(state.seen, ["mudkip"]);
  assert.deepEqual(previous.seen, ["treecko"]);
  assert.throws(() => (service.state = {}), TypeError);
  assert.throws(
    () => new PartyApplication({ ...ports, arbitraryFacade: {} }),
    /contract mismatch/,
  );
  assert.throws(
    () => liveApplicationPorts(() => null, PARTY_PORTS, { typo: 1 }),
    /Unknown/,
  );
  assert.throws(
    () =>
      bindApplicationPorts(
        {},
        {
          get x() {
            return 1;
          },
          set x(value) {},
        },
        ["x"],
      ),
    /read-only/,
  );
});
test("Application fields forward to one owning service, including the explicitly writable host story lock", () => {
  const owner = {},
    applications = { save: { state: {} }, story: { storyBusy: false } };
  exposeApplicationPorts(owner, applications);
  assert.equal(owner.state, applications.save.state);
  owner.storyBusy = true;
  assert.equal(applications.story.storyBusy, true);
  const state = {};
  applications.save.state = state;
  assert.equal(owner.state, state);
});
test("Adventure remains a composition facade; application services cannot import it or reach sibling services", () => {
  const base = new URL("../src/game/emerald/", import.meta.url),
    source = fs.readFileSync(new URL("adventure.js", base), "utf8");
  assert(
    source.split("\n").length < 160,
    "Facade exceeded its architectural budget; move new use cases into an owning service",
  );
  assert(
    !/createMonster\(|grantReward\(|new (BattleSession|GrowthSession|FieldSession)|this\.state\./.test(
      source,
    ),
  );
  const directory = new URL("application/", base);
  for (const name of fs
    .readdirSync(directory)
    .filter((n) => n.endsWith("-application.js"))) {
    const text = fs.readFileSync(new URL(name, directory), "utf8");
    assert(
      !/from\s+["'][^"']*adventure\.js|this\.applications\./.test(text),
      name,
    );
    for (const match of text.matchAll(/from\s+["']([^"']+)["']/g))
      assert(
        !path.basename(match[1]).endsWith("-application.js"),
        `${name} directly imports a sibling instead of a declared port`,
      );
  }
});

test("Every public method uses its declared owner, preserves receivers/results and follows replacement services", async () => {
  const target = {},
    applications = {};
  for (const [name, [owner, method]] of Object.entries(APPLICATION_METHODS)) {
    assert(
      !Object.hasOwn(APPLICATION_FIELDS, name),
      `Duplicate public port: ${name}`,
    );
    applications[owner] ??= { owner };
    applications[owner][method] = function (...args) {
      return { receiver: this, args };
    };
  }
  exposeApplicationPorts(target, applications);
  for (const [name, [owner]] of Object.entries(APPLICATION_METHODS)) {
    assert(Object.isFrozen(APPLICATION_METHODS[name]));
    const input = { name },
      result = target[name](input, 42);
    assert.equal(result.receiver, applications[owner]);
    assert.deepEqual(result.args, [input, 42]);
    assert.throws(() => {
      target[name] = () => {};
    }, TypeError);
  }
  const saved = target.useItem;
  const result = { ok: true };
  applications.inventory = {
    useItem: async function (value) {
      assert.equal(this, applications.inventory);
      return value;
    },
  };
  assert.equal(await saved(result), result);
  const failure = new Error("Domain failure");
  applications.inventory.useItem = () => {
    throw failure;
  };
  assert.throws(
    () => saved(),
    (error) => error === failure,
  );
  applications.time = { clock: {} };
  assert.equal(target.clock, applications.time.clock);
  assert.throws(() => {
    target.clock = {};
  }, TypeError);
});
