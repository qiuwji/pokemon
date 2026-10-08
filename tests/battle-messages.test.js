import test from "node:test";
import assert from "node:assert/strict";
import { session, manifest } from "./helpers/session.js";
import { createMonster } from "../src/engine/model.js";
import {
  battleMessage,
  BATTLE_MESSAGE_IDS,
} from "../src/packs/emerald/battle-messages.js";
import { createEmeraldPresentation } from "../src/game/emerald/assembly/animations.js";

test("Battle messages resolve from stable ids and format placeholders", () => {
  assert.equal(battleMessage("trainer-challenge"), "训练家发起了挑战！");
  assert.equal(
    battleMessage("used-move", { mon: "木守宫", move: "撞击" }),
    "木守宫 使用了 撞击！",
  );
  assert.equal(
    battleMessage("stage", { name: "木守宫", stat: "def", amount: -1 }),
    "木守宫的防御降低了！",
  );
  assert.equal(
    battleMessage("captured", { mon: "蛇纹熊" }),
    "太好了！捉到了 蛇纹熊！",
  );
  assert.equal(battleMessage("confused"), "陷入了混乱！");
  assert.equal(battleMessage("form-changed"), "形态发生了变化！");
  assert.equal(battleMessage("weather-calm"), "天气恢复了平静。");
  assert.throws(() => battleMessage("not-a-message"), /Unknown battle message/);
  assert(BATTLE_MESSAGE_IDS.includes("used-move"));
});

test("Plugins can register and override battle messages through the public API", () => {
  const plugin = manifest("msg-demo", (api) => {
    api.presentation.message("win", {
      target: "used-move",
      format: ({ move }) => `【${move}】`,
    });
  });
  const s = session([plugin]);
  const registry = createEmeraldPresentation({ host: s.host });
  assert.equal(
    registry.resolveMessage({
      message: { id: "used-move", params: { mon: "x", move: "撞击" } },
    }),
    "【撞击】",
  );
  // An unregistered message id falls back to the event's text, never throws.
  assert.equal(
    registry.resolveMessage({ message: { id: "custom", params: {} }, text: "原文本" }),
    "原文本",
  );
});

test("A stage change carries a message id that matches its displayed text", async () => {
  const s = session();
  await s.game.startBattle(createMonster("poochyena", 5, s.db, s.game.rng));
  const battle = s.game.battle;
  battle.changeStage(1, "def", -1, { sourceSeat: 0 });
  const event = battle.events.at(-1);
  assert.equal(event.message.id, "stage");
  assert.equal(battleMessage(event.message.id, event.message.params), event.text);
});

test("Battle events carry a message id the host resolves through the catalog", async () => {
  const s = session();
  await s.game.startBattle(createMonster("poochyena", 5, s.db, s.game.rng));
  const battle = s.game.battle;
  await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  const event = battle.events.find((e) => e.kind === "move");
  assert(event, "a move event is recorded");
  assert.equal(event.message.id, "used-move");
  assert(event.message.params.move);
  assert.equal(battleMessage(event.message.id, event.message.params), event.text);
});

test("Every migrated battle event resolves back to its displayed text", async () => {
  const s = session();
  // A foe that neither KOs nor is KO'd in one exchange keeps the battle alive, so the
  // move/hurt events are always present regardless of the random seed drawn for this session.
  await s.game.startBattle(createMonster("poochyena", 12, s.db, s.game.rng));
  await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  const migrated = s.game.battle.events.filter((e) => e.message);
  assert(migrated.length >= 2, "move and hurt carry message ids");
  for (const event of migrated)
    assert.equal(
      battleMessage(event.message.id, event.message.params),
      event.text,
    );
});
