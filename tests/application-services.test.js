import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  bindApplicationPorts,
  liveApplicationPorts,
} from "../dist/packs/emerald/application/ports.js";
import {
  PartyApplication,
  PARTY_PORTS,
} from "../dist/packs/emerald/application/party-application.js";
import { exposeCompatibilityFields } from "../dist/packs/emerald/application/compatibility.js";
test("Application dependencies are explicit, live across state replacement, and cannot be overwritten or broadened", () => {
  let state = { seen: [], caught: [] };
  const ports = liveApplicationPorts(
    (name) => (name === "state" ? state : null),
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
test("Compatibility fields forward to one owning service, including story lock assignments used by existing hosts", () => {
  const owner = {},
    applications = { save: { state: {} }, story: { storyBusy: false } };
  exposeCompatibilityFields(owner, applications);
  assert.equal(owner.state, applications.save.state);
  owner.storyBusy = true;
  assert.equal(applications.story.storyBusy, true);
  const state = {};
  applications.save.state = state;
  assert.equal(owner.state, state);
});
test("Adventure remains a composition facade; application services cannot import it or reach sibling services", () => {
  const base = new URL("../dist/packs/emerald/", import.meta.url),
    source = fs.readFileSync(new URL("adventure.js", base), "utf8");
  assert(
    source.split("\n").length < 400,
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
