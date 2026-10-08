import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { loadContentSync } from "../tools/content-io.mjs";
import { MACHINES } from "../generated/engine/rules/gen3/machine-learning.js";
import { createMonster, Random } from "../src/engine/model.js";
import { summaryPage } from "../src/ui/emerald/ui/summary-view.js";
import {
  bagPockets,
  bagPicture,
  itemIconURL,
  listNavigation,
} from "../src/ui/emerald/ui/native-view.js";
import { ITEMS } from "../src/packs/emerald/items.js";
import { session } from "./helpers/session.js";
import { readOnly } from "../src/engine/extensions/values.js";
const root = new URL("../", import.meta.url);
test("All exported native assets match the tracked provenance manifest and item selections resolve real files", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("generated/assets/ui/source.json", root)),
  );
  assert.equal(manifest.revision, "731ad5bfd6e6f265508d0efcca0ba42f9dcf5881");
  for (const [file, hash] of Object.entries(manifest.outputs)) {
    const data = fs.readFileSync(new URL("generated/assets/ui/" + file, root));
    assert.equal(
      crypto.createHash("sha256").update(data).digest("hex"),
      hash,
      file,
    );
  }
  for (const id of Object.keys(ITEMS))
    assert(fs.existsSync(new URL("" + itemIconURL(id), root)), id);
  for (const [id, machine] of Object.entries(MACHINES))
    assert(
      itemIconURL(id).endsWith(
        `${machine.kind}${String(machine.number).padStart(2, "0")}.png`,
      ),
      id,
    );
  assert.equal(
    itemIconURL("plugin:custom", { "plugin:custom-icon": "assets/custom.png" }),
    "assets/custom.png",
  );
});
test("Pocket order and sprite selection remain native without dropping plugin pockets", () => {
  const custom = { slots: [] },
    pockets = {
      key: {},
      machines: {},
      berries: {},
      items: {},
      balls: {},
      custom,
    };
  const result = bagPockets(pockets);
  assert.deepEqual(
    result.map(([id]) => id),
    ["items", "balls", "machines", "berries", "key", "custom"],
  );
  assert.equal(result.at(-1)[1], custom);
  for (const pocket of ["items", "balls", "machines", "berries", "key"])
    for (const gender of ["male", "female"])
      assert(
        fs.existsSync(new URL("" + bagPicture(pocket, gender), root)),
      );
  assert(
    bagPicture("custom", "female").endsWith("bag-sprite-female-items.png"),
  );
});
test("Summary pages expose full stats, current move PP and accurate ownership without modifying the frozen monster", () => {
  const db = loadContentSync(),
    mon = readOnly(createMonster("mudkip", 12, db, new Random(3))),
    before = JSON.stringify(mon);
  const render = (page) =>
    summaryPage(mon, {
      db,
      items: ITEMS,
      page,
      escapeHTML: String,
      playerName: "小遥",
    });
  assert.match(render(0), /小遥/);
  for (const key of ["hp", "atk", "def", "spa", "spd", "spe"])
    assert(render(1).includes(String(mon.stats[key])));
  for (const slot of mon.moves) {
    assert(render(2).includes(db.moves[slot.id].name));
    assert(render(2).includes(`PP ${slot.pp}/${db.moves[slot.id].pp}`));
  }
  assert.equal(JSON.stringify(mon), before);
  const traded = readOnly({ ...mon, originalTrainer: "other" });
  const html = summaryPage(traded, {
    db,
    items: ITEMS,
    page: 0,
    escapeHTML: String,
    playerName: "小遥",
  });
  assert(!html.includes("训练家 小遥"));
  assert(html.includes("其他训练家"));
});
test("Native list navigation skips disabled items, wraps, reveals the focused row and routes horizontal pocket changes", () => {
  const doc = { activeElement: null },
    calls = [],
    rows = Array.from({ length: 3 }, (_, index) => ({
      disabled: index === 1,
      focus() {
        doc.activeElement = this;
      },
      scrollIntoView() {
        calls.push(index);
      },
    }));
  const root = { querySelectorAll: () => rows };
  listNavigation(root, doc, "button", "down");
  assert.equal(doc.activeElement, rows[0]);
  listNavigation(root, doc, "button", "down");
  assert.equal(doc.activeElement, rows[2]);
  listNavigation(root, doc, "button", "down");
  assert.equal(doc.activeElement, rows[0]);
  const turns = [];
  listNavigation(root, doc, "button", "left", (delta) => turns.push(delta));
  assert.deepEqual(turns, [-1]);
  assert.deepEqual(calls, [0, 2, 0]);
});
test("Sign content is immediate while ordinary character dialogue remains typewritten through the real catalog", () => {
  const signs = JSON.parse(
      fs.readFileSync(new URL("src/content/stories/signs.json", root)),
    ),
    common = JSON.parse(
      fs.readFileSync(new URL("src/content/stories/dialogues.json", root)),
    );
  const catalog = session().game.storyCatalog;
  for (const id of Object.keys(signs.dialogues))
    assert.equal(
      catalog.resolveDialogue({ dialogue: `${signs.id}.${id}` }, {}).mode,
      "instant",
    );
  assert.equal(common.dialogues["common.interactions.2"].mode, "instant");
  assert.notEqual(
    catalog.resolveDialogue(
      { dialogue: "emerald:dialogues.rescue.dont-leave" },
      {},
    ).mode,
    "instant",
  );
});
