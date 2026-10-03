import { emptyFacilities } from "../../../engine/facilities.js";
import { emptyFieldEffects } from "../../../engine/field-effects.js";
import { emptyWeather } from "../../../engine/weather.js";
import { emptyInventory } from "../../../engine/inventory.js";
import { emptyFieldDevices } from "../../../engine/field-devices.js";
import { emptyActors } from "../../../engine/actor-repository.js";
import { emptyCrops } from "../../../engine/crop-growth.js";
import { emptyWorldClock } from "../../../engine/world-clock.js";
import { emptyWorldSchedule } from "../../../engine/world-schedule.js";
import { emptyWorldState } from "../../../engine/world-state.js";
import { Random } from "../../../engine/model.js";
import { SaveStore } from "../../../engine/save-store.js";
import { PACK, validateSave } from "../pack.js";
import { emptyStoryProgress } from "../../../engine/story.js";
import { bindApplicationPorts } from "./ports.js";
export const SAVE_PORTS = Object.freeze([
  "facilityActive",
  "syncTime",
  "battle",
  "bindField",
  "busy",
  "canManageParty",
  "catalog",
  "db",
  "forms",
  "itemDefinitions",
  "onSave",
  "plugins",
  "storage",
  "storyBusy",
  "ui",
]);
/** save use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class SaveApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, SAVE_PORTS);
    this.saveStore = new SaveStore(
      this.storage,
      PACK.id,
      (s) => validateSave(s, this.db, this.catalog, this.plugins),
      PACK.version,
      {
        diagnose: (state) => {
          const missing = (state?.contentDependencies || []).filter(
            (id) => !this.plugins?.manifests.has(id),
          );
          return missing.length
            ? { code: "missing_dependency", dependencies: missing }
            : null;
        },
      },
    );
    const loaded = this.saveStore.load();
    this.saveProtected =
      this.saveStore.lastIssue !== null &&
      ["missing_dependency", "invalid_state", "unsupported_version"].includes(
        this.saveStore.lastIssue?.code,
      );
    this.saveWarning = this.saveProtected
      ? this.saveStore.lastIssue.code === "unsupported_version"
        ? "开发存档版本已更新。原存档已保留，可导出备份或从菜单开始新冒险。"
        : this.saveStore.lastIssue.code === "missing_dependency"
          ? "存档需要插件：" +
            this.saveStore.lastIssue.dependencies.join("、") +
            "。原存档已保留，请恢复插件或从菜单明确开始新冒险。"
          : "存档数据未通过检查。原存档已保留，请导出备份，或从菜单明确开始新冒险。"
      : null;
    this.state = loaded?.state || this.newState();
    this.lastSave = loaded?.savedAt || 0;
  }
  newState() {
    return {
      facilities: emptyFacilities(),
      fieldEffects: emptyFieldEffects(),
      position: { ...PACK.start },
      party: [],
      box: [],
      registeredItem: null,
      bag: emptyInventory(),
      story: emptyStoryProgress(),
      worldState: emptyWorldState(),
      devices: emptyFieldDevices(),
      flags: {},
      money: 3000,
      seen: [],
      caught: [],
      playSeconds: 0,
      clock: emptyWorldClock(),
      weather: emptyWeather(),
      schedule: emptyWorldSchedule(),
      crops: emptyCrops(),
      actors: emptyActors(),
      friendshipSteps: 0,
      movement: { mode: "walk", visited: [PACK.start.map] },
      growth: { hatchTick: 0 },
      daycare: { slots: [], egg: null, steps: 0 },
      tradePartner: [],
      randomSeed: Date.now() >>> 0,
    };
  }
  save(show = false) {
    if (this.facilityActive) {
      if (show) this.ui?.toast("请先完成或退出设施，再保存。");
      return false;
    }
    this.forms?.reconcile();
    if (this.saveProtected) {
      if (show) this.ui?.toast(this.saveWarning);
      return;
    }
    if (
      this.battle ||
      this.busy ||
      this.ui?.dialog ||
      this.ui?.modalType === "starter" ||
      this.storyBusy
    ) {
      if (show) this.ui.toast("请在移动、对话或战斗结束后保存。");
      return;
    }
    try {
      this.syncTime();
      this.state.randomSeed = this.rng.seed;
      if (this.plugins)
        this.state.contentDependencies = this.plugins.catalog.dependencies(
          this.state,
        );
      this.lastSave = this.saveStore.save(this.state);
      this.onSave(this.lastSave);
      if (show) this.ui.toast("进度已保存在当前浏览器。");
    } catch (error) {
      if (error.code === "save_conflict") {
        this.saveProtected = true;
        this.saveWarning =
          "另一个游戏页面已保存进度。本页暂停覆盖存档；可导出本页进度，或明确读取另一页的存档。";
        this.saveConflict = true;
        this.ui?.toast(this.saveWarning);
        this.ui?.updateSide();
      } else if (show) this.ui.toast("浏览器无法保存，请从存档菜单导出进度。");
    }
  }
  loadDocument(d) {
    const missing = (d?.state?.contentDependencies || []).filter(
      (id) => !this.plugins?.manifests.has(id),
    );
    if (missing.length) throw new Error("存档需要插件：" + missing.join("、"));
    const compatible = this.saveStore.decode(d);
    if (!this.canManageParty() || (d.pack && d.pack !== PACK.id) || !compatible)
      throw new Error("Invalid save");
    this.saveStore.acceptCurrent();
    this.saveProtected = false;
    this.saveWarning = null;
    this.saveConflict = false;
    this.state = compatible.state;
    this.bindField();
  }
  exportDocument() {
    if (this.facilityActive)
      throw new Error("请先完成或退出设施，再导出存档。");
    if (this.saveProtected && !this.saveConflict) {
      const raw = this.saveStore.raw();
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          return { recoveryRaw: raw };
        }
      }
    }
    this.syncTime();
    const state = structuredClone(this.state);
    state.randomSeed = this.rng.seed;
    if (this.plugins)
      state.contentDependencies = this.plugins.catalog.dependencies(state);
    return { version: PACK.version, pack: PACK.id, savedAt: Date.now(), state };
  }
  reset() {
    if (!this.canManageParty()) return false;
    this.saveStore.acceptCurrent();
    this.saveProtected = false;
    this.saveWarning = null;
    this.saveConflict = false;
    this.state = this.newState();
    this.bindField();
    return true;
  }
  reseed() {
    this.rng = new Random(this.state.randomSeed);
  }
}
