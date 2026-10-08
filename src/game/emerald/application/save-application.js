import { createSaveContentResolver } from "../assembly/save/content-resolver.js";
import { emptyAppearances } from "../../../engine/appearances.js";
import { sampleSelection } from "../../../engine/random-selection.js";
import { emptyEncounterTickets } from "../../../engine/encounter-tickets.js";
import { emptyFacilities } from "../../../engine/facilities.js";
import { emptyFieldEffects } from "../../../engine/field-effects.js";
import { emptyWeather } from "../../../engine/weather.js";
import { emptyInventory } from "../../../engine/inventory.js";
import { emptyFieldDevices } from "../../../engine/field-devices.js";
import { emptyActors } from "../../../engine/actor-repository.js";
import { emptyCrops } from "../domain/crop-growth.js";
import { emptyWorldClock } from "../../../engine/world-clock.js";
import { emptyWorldSchedule } from "../../../engine/world-schedule.js";
import { emptyWorldState } from "../../../engine/world-state.js";
import { Random } from "../../../engine/model.js";
import { SaveStore } from "../../../engine/save-store.js";
import { PACK } from "../../../packs/emerald/pack.js";
import { validateSave } from "../assembly/save-contract.js";
import { emptyStoryProgress } from "../../../engine/story.js";
import { validateStoryResume, storyDependencies, } from "../../../engine/story-session.js";
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
    "storyCatalog",
    "story",
    "ui",
]);
/** save use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class SaveApplication {
    constructor(ports) {
        bindApplicationPorts(this, ports, SAVE_PORTS);
        const validate = s => this.validState(s);
        this.contentResolver = createSaveContentResolver({ db: this.db, catalog: this.catalog, plugins: this.plugins, validate });
        this.saveStore = new SaveStore(this.storage, PACK.id, validate, PACK.version, {
            prepare: state => this.contentResolver.resolve(state),
            diagnose: (state) => {
                const missing = (state?.contentDependencies || []).filter((id) => !this.plugins?.manifests.has(id));
                return missing.length
                    ? { code: "missing_dependency", dependencies: missing }
                    : null;
            },
        });
        const loaded = this.saveStore.load();
        this.saveProtected =
            this.saveStore.lastIssue !== null &&
                ["missing_dependency", "invalid_state", "unsupported_version", "storage_unavailable"].includes(this.saveStore.lastIssue?.code);
        this.saveWarning = this.saveProtected
            ? this.saveStore.lastIssue.code === "storage_unavailable"
                ? "浏览器暂时无法读取存档，已暂停覆盖。请恢复存储权限后刷新。"
                : this.saveStore.lastIssue.code === "unsupported_version"
                    ? "开发存档版本已更新。原存档已保留，可导出备份或从菜单开始新冒险。"
                    : this.saveStore.lastIssue.code === "missing_dependency"
                        ? "存档需要插件：" +
                            this.saveStore.lastIssue.dependencies.join("、") +
                            "。原存档已保留，请恢复插件或从菜单明确开始新冒险。"
                        : "存档数据未通过检查。原存档已保留，请导出备份，或从菜单明确开始新冒险。"
            : null;
        this.state = loaded?.state || this.newState();
        this.lastSave = loaded?.savedAt || 0;
        if (loaded)
            this.saveWarning = this.contentWarning();
    }
    validState(s) {
        return validateSave(s, this.db, this.catalog, this.plugins) &&
            s.story.session?.status !== "battle" &&
            (s.story.session?.actors || []).every(a => this.db.actors[a.actor] && a.x < this.db.maps[s.position.map].width && a.y < this.db.maps[s.position.map].height) &&
            validateStoryResume(this.storyCatalog, s.story.session, this.story.events);
    }
    contentWarning() {
        const count = this.state.suspendedContent?.records.length || 0;
        return count ? `已继续原存档；${count} 项插件内容暂停保管，重新启用插件后会检查恢复。` : null;
    }
    newState() {
        return {
            playerGender: "male",
            playerName: "训练家",
            facilities: emptyFacilities(),
            encounters: emptyEncounterTickets(),
            appearances: emptyAppearances(),
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
            // visitMap records eligible travel destinations during field binding.
            // The starting map may be an interior with no travel destination.
            movement: { mode: "walk", visited: [] },
            growth: { hatchTick: 0 },
            daycare: { slots: [], egg: null, steps: 0 },
            tradePartner: [],
            randomSeed: Date.now() >>> 0,
        };
    }
    sampleRandom(values, count) {
        const seed = this.rng.seed;
        let result;
        try {
            result = sampleSelection(values, count, this.rng);
        }
        catch (error) {
            this.rng.seed = seed;
            throw error;
        }
        this.save();
        return result;
    }
    save(show = false) {
        if (this.ui?.saveBlocked) return false;
        if (this.facilityActive) {
            if (show)
                this.ui?.toast("请先完成或退出设施，再保存。");
            return false;
        }
        this.forms?.reconcile();
        if (this.saveProtected) {
            if (show)
                this.ui?.toast(this.saveWarning);
            return false;
        }
        if (this.ui?.saveBlocked || this.battle ||
            this.busy ||
            this.ui?.dialog ||
            this.ui?.modalType === "starter" ||
            this.storyBusy) {
            if (show)
                this.ui.toast("请在移动、对话或战斗结束后保存。");
            return false;
        }
        try {
            this.syncTime();
            this.state.randomSeed = this.rng.seed;
            if (this.plugins)
                this.state.contentDependencies = [
                    ...new Set([
                        ...this.plugins.catalog.dependencies(this.state),
                        ...storyDependencies(this.state, this.plugins),
                    ]),
                ];
            this.lastSave = this.saveStore.save(this.state);
            this.saveWarning = this.contentWarning();
            this.ui?.updateSide();
            this.onSave(this.lastSave);
            if (show)
                this.ui.toast("进度已保存在当前浏览器。");
            return true;
        }
        catch (error) {
            if (error.code === "save_conflict") {
                this.saveProtected = true;
                this.saveWarning =
                    "另一个游戏页面已保存进度。本页暂停覆盖存档；可导出本页进度，或明确读取另一页的存档。";
                this.saveConflict = true;
                this.ui?.toast(this.saveWarning);
                this.ui?.updateSide();
            }
            else {
                const warning = error.code === "invalid_state"
                    ? "当前进度未通过存档检查，未覆盖上一次存档。请导出进度并报告问题。"
                    : "浏览器无法保存，未覆盖上一次存档。请从存档菜单导出进度。";
                if (show || warning !== this.saveWarning)
                    this.ui?.toast(warning);
                this.saveWarning = warning;
                this.ui?.updateSide();
            }
            return false;
        }
    }
    loadDocument(d) {
        const compatible = this.saveStore.decode(d);
        if (!this.canManageParty() || (d.pack && d.pack !== PACK.id) || !compatible)
            throw new Error("Invalid save");
        if (this.saveStore.preparedChanged)
            this.saveStore.backup(JSON.stringify(d));
        this.saveStore.acceptCurrent();
        this.saveProtected = false;
        this.saveWarning = null;
        this.saveConflict = false;
        this.state = compatible.state;
        this.saveWarning = this.contentWarning();
        this.bindField();
    }
    exportDocument() {
        if (this.state.story.session?.status === "battle")
            throw new Error("请在剧情战斗结束后导出，当前可恢复检查点位于战斗前。");
        if (this.facilityActive)
            throw new Error("请先完成或退出设施，再导出存档。");
        if (this.saveProtected && !this.saveConflict) {
            const raw = this.saveStore.raw();
            if (raw) {
                try {
                    return JSON.parse(raw);
                }
                catch {
                    return { recoveryRaw: raw };
                }
            }
        }
        this.syncTime();
        const state = structuredClone(this.state);
        state.randomSeed = this.rng.seed;
        if (this.plugins)
            state.contentDependencies = [
                ...new Set([
                    ...this.plugins.catalog.dependencies(state),
                    ...storyDependencies(state, this.plugins),
                ]),
            ];
        return { version: PACK.version, pack: PACK.id, savedAt: Date.now(), state };
    }
    reset() {
        if (!this.canManageParty())
            return false;
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
