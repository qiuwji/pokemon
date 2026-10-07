import {
  CropRegistry,
  CropService,
  emptyCrops,
} from "../../../engine/crop-growth.js";
import { Random } from "../../../engine/model.js";
import {
  EMERALD_CROP_POLICY,
  EMERALD_CROPS,
  EMERALD_NATIVE_BERRIES,
  emeraldBerryYield,
} from "../berries.js";
import { bindApplicationPorts } from "./ports.js";
export const CROP_PORTS = Object.freeze([
  "state",
  "inventory",
  "catalog",
  "rng",
  "canManageParty",
  "clock",
  "plugins",
  "world",
  "motion",
  "cameraProjection",
  "ui",
]);
/** Coordinates inventory and tree commits; growth itself never reaches a bag or application facade. */
export class CropApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, CROP_PORTS);
  }
  bind() {
    this.state.crops ||= emptyCrops();
    this.crops = new CropService({
      registry: new CropRegistry(this.catalog.crops || EMERALD_CROPS, {
        items: this.catalog.items,
      }),
      state: this.state.crops,
      policy: EMERALD_CROP_POLICY,
      calculateYield: emeraldBerryYield,
    });
    for (const p of EMERALD_NATIVE_BERRIES) {
      const initialized = `nativeBerryInitialized.${p.id}`;
      if (!this.catalog.berryPlots?.[p.id] || this.state.flags[initialized]) continue;
      if (p.initial && !this.state.crops.trees[p.id])
        this.crops.plant(p.id, p.initial, { stage: "ripe", stopped: true });
      this.state.flags[initialized] = true;
    }
  }
  observeCrops() {
    const projection = this.cameraProjection({ width: 240, height: 160 });
    const player = this.motion.graph.point(this.state.position);
    for (const [id, plot] of Object.entries(this.catalog.berryPlots || {})) {
      if (!this.state.crops.trees[id]?.stopped) continue;
      const object = this.catalog.maps[plot.map].elements.find(o => o.id === plot.objectId);
      const point = this.motion.graph.point({ ...object, map: plot.map });
      if (point.zone === player.zone && point.x + 16 > projection.x && point.x < projection.x + projection.width &&
          point.y + 16 > projection.y && point.y < projection.y + projection.height) this.crops.release(id);
    }
  }
  cropView(id) {
    return this.crops.view(id);
  }
  advanceCrops(minutes) {
    const rng = new Random(this.rng.seed),
      changes = this.crops.advance(minutes, () => rng.int(65536));
    this.rng.seed = rng.seed;
    for (const change of changes)
      this.plugins?.events.emit("core:crop-changed", change);
  }
  accessible(id) {
    const plot = this.catalog.berryPlots?.[id],
      target = this.world.interact();
    return (
      this.canManageParty() &&
      this.clock.state.initialized &&
      !!plot &&
      plot.map === this.state.position.map &&
      target?.id === plot.objectId &&
      target?.plotId === id
    );
  }
  cropAction(id, action, kind) {
    if (!this.accessible(id))
      return { ok: false, reason: "请先设定时钟，并面对树果土壤。" };
    const before = this.crops.view(id);
    if (action === "water") {
      if (!this.state.flags.wailmerPail)
        return { ok: false, reason: "需要吼吼鲸喷壶。" };
      if (!this.crops.water(id))
        return { ok: false, reason: "现在不需要浇水。" };
    } else if (action === "plant") {
      const d = this.crops.registry.get(kind);
      if (
        before.stage !== "empty" ||
        !(this.inventory.quantity(this.state.bag, d.item) > 0)
      )
        return { ok: false, reason: "需要空土壤和一颗树果。" };
      const cost = this.inventory.prepare(this.state.bag, [
        { kind: "remove", item: d.item, count: 1 },
      ]);
      if (!cost.ok) return cost;
      this.crops.plant(id, kind);
      this.inventory.commit(cost, this.state.bag);
    } else if (action === "harvest") {
      if (!before.harvestable) return { ok: false, reason: "树果尚未成熟。" };
      const result = this.inventory.apply(this.state.bag, [
        { kind: "add", item: before.item, count: before.yield },
      ]);
      if (!result.ok) return result;
      this.crops.remove(id);
    } else throw new Error("Unknown crop action");
    const after = this.crops.view(id);
    this.plugins?.events.emit("core:crop-action", {
      id,
      action,
      before,
      after,
    });
    this.ui?.updateSide();
    return { ok: true, crop: after };
  }
}
