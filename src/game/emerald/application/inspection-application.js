import { inventoryCounts } from "../../../engine/inventory.js";
import { questFor } from "../../../packs/emerald/pack.js";
import { bindApplicationPorts } from "./ports.js";
export const INSPECTION_PORTS = Object.freeze([
  "timeView",
  "weatherView",
  "battle",
  "busy",
  "db",
  "field",
  "fieldCapabilities",
  "state",
  "storyBusy",
  "transitions",
  "ui",
  "world",
]);
/** inspection use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class InspectionApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, INSPECTION_PORTS);
  }
  inspect() {
    const p = this.state.position;
    return {
      time: this.timeView(),
      weather: this.weatherView(),
      location: this.world.map.title,
      movement: {
        mode: this.state.movement.mode,
        capabilities: this.fieldCapabilities(),
      },
      position: { ...p },
      mode: this.transitions.busy
        ? "transition"
        : this.battle
          ? "battle"
          : this.ui.dialog
            ? "dialogue"
            : this.storyBusy
              ? "cutscene"
              : this.ui.modalType || "exploration",
      quest: questFor(this.state),
      flags: { ...this.state.flags },
      dialogue: this.ui.dialog
        ? {
            name: this.ui.dialog.name,
            text: this.ui.dialog.lines[this.ui.dialog.index],
          }
        : null,
      nearby: this.field.npcs
        .objects(p.map)
        .filter((o) => Math.abs(o.x - p.x) <= 8 && Math.abs(o.y - p.y) <= 7)
        .map((o) => ({ name: o.name, kind: o.kind, x: o.x, y: o.y })),
      tiles: Array.from({ length: 11 }, (_, row) =>
        Array.from({ length: 15 }, (_, col) => {
          const x = p.x + col - 7,
            y = p.y + row - 5,
            c = this.world.cell(x, y);
          return c
            ? {
                x,
                y,
                collision: c.collision,
                behavior: c.behavior,
                warp: this.world.map.warps.some((w) => w.x === x && w.y === y),
              }
            : null;
        }),
      ),
      party: this.state.party.map((m) => ({
        name: this.db.species[m.species].name,
        species: m.species,
        level: m.level,
        hp: m.hp,
        maxHP: m.stats.hp,
        moves: m.moves.map((s) => ({
          id: s.id,
          name: this.db.moves[s.id].name,
          pp: s.pp,
        })),
      })),
      bag: inventoryCounts(this.state.bag),
      battle: this.battle
        ? {
            busy: this.busy,
            trainer: this.battle.trainer,
            decision: this.battle.decisionView().decision,
            combatants: this.battle.snapshot().combatants,
            winner: this.battle.winner,
            enemy: this.battle.enemy
              ? {
                  name: this.db.species[this.battle.enemy.species].name,
                  hp: this.battle.enemy.hp,
                  maxHP: this.battle.enemy.stats.hp,
                }
              : null,
            active: this.battle.active,
            enemyTeam: {
              remaining: this.battle.enemyParty.filter((m) => m.hp > 0).length,
              total: this.battle.enemyParty.length,
            },
          }
        : null,
    };
  }
}
