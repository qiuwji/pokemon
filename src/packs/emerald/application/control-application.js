import { ObservationJournal } from "../../../engine/observation-journal.js";
import { ControlWalk } from "../../../engine/control-walk.js";
import { bindApplicationPorts } from "./ports.js";
import { monsterDetails, taskDetails, bagDetails, objectDetails, battleDetails } from "../control-observation.js";
export const CONTROL_PORTS = Object.freeze([
  "state", "db", "field", "world", "move", "timeline", "ui", "busy", "battle", "combat",
  "story", "storyBusy", "transitions", "travelDirector", "growthDirector", "growthBusy",
  "actionBusy", "sceneDirector", "facilityActive", "playActive", "commandBus", "bagView",
  "itemDefinitions", "itemActionOptions", "forms", "devicePending",
]);
/** Owns control receipts, readiness and observation facts, never game rules or duplicate game state. */
export class ControlApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, CONTROL_PORTS);
    this.journal = new ObservationJournal({ now: () => this.timeline.now() });
    this.walker = new ControlWalk({ move: (dir, options) => this.step(dir, options, true),
      availability: () => this.availability(true), settle: options => this.settle(options),
      position: () => this.state.position, events: options => this.journal.read(options), now: () => this.timeline.now() });
    this.interaction = null; this.lastBattle = null;
  }
  record(type, data) { return this.journal.record(type, data); }
  availability(ownRoute = false) {
    const blockers = [];
    const block = (reason, resume, remainingMs = null) => blockers.push({ reason, resume, remainingMs });
    if (!this.playActive()) block("hidden", "bring-game-to-foreground");
    if (this.commandBus?.active && !(ownRoute && this.commandBus.active === "core.control.walk")) block("command", "command-complete");
    if (this.walker.active && !ownRoute) block("route-active", "route-complete-or-cancel");
    if (this.ui?.dialog) block("dialogue", "confirm-dialogue");
    if (this.ui?.modalType === "story-choice") block("choice", "select-option");
    else if (this.ui?.blocked) block("modal", "close-or-complete-menu");
    if (this.battle) block("battle", "finish-battle");
    if (this.facilityActive) block("facility", "finish-or-exit-facility");
    if (this.storyBusy) block("story", "story-complete");
    else if (this.state.story.session) block("pending-story", "core.story.resume");
    if (this.devicePending()) block("device", "finish-device-interaction");
    if (this.transitions.busy) block("transition", "transition-complete");
    if (this.field.busy) block("animation", "field-step-complete",
      this.field.motion.moving(this.timeline.now()) ? Math.max(0, Math.ceil(this.field.motion.start + this.field.motion.duration - this.timeline.now())) : null);
    if (this.actionBusy || this.travelDirector.busy || this.growthDirector.busy || this.growthBusy || this.sceneDirector?.busy || this.combat.busy)
      block("presentation", "presentation-complete");
    if (this.busy && !blockers.length) block("busy", "current-action-complete");
    return { canMove: blockers.length === 0, reason: blockers[0]?.reason || null,
      remainingMs: blockers.length === 1 ? blockers[0].remainingMs : null, blockers,
      canBattleAct: !!this.battle && !this.busy && (!this.commandBus?.active || ownRoute),
      canUIInput: !!this.ui, routeActive: !!this.walker.active };
  }
  step(direction, { running = false } = {}, ownRoute = false) {
    const from = { ...this.state.position }, available = this.availability(ownRoute);
    if (!available.canMove) return { status: available.reason === "animation" ? "animating" : "busy",
      moved: false, accepted: false, reason: available.reason, from, to: { ...from }, availability: available };
    const accepted = this.move(direction, { running }), outcome = this.field.lastMove;
    const moved = outcome?.moved === true;
    const result = { status: moved ? "moved" : accepted ? "interacted" : "blocked", moved,
      accepted: !!accepted, reason: moved ? null : accepted ? "interaction" : outcome?.reason || "busy",
      ...(outcome?.objectId ? { objectId: outcome.objectId } : {}), from, to: { ...this.state.position },
      availability: this.availability(ownRoute) };
    this.record("movement.result", { direction, status: result.status, moved, reason: result.reason, from, to: result.to });
    return result;
  }
  async settle({ deadline, cancelled }) {
    while (this.field.busy) {
      if (cancelled()) return "cancelled";
      if (this.timeline.now() >= deadline) return "timeout";
      const a = this.availability(true), boundary = a.blockers.find(b => !["animation", "transition"].includes(b.reason));
      if (boundary) return boundary.reason;
      const ms = Math.min(Math.max(1, a.blockers.find(b => b.reason === "animation")?.remainingMs || 16), 50, deadline - this.timeline.now());
      await this.timeline.wait(ms);
      // Uses the same field completion owner as the frame pump. No extra game-time or RNG advancement.
      if (this.playActive()) this.field.tick(this.timeline.now());
    }
    return null;
  }
  beginInteraction(object) {
    const token = { map: this.state.position.map, id: object.id };
    this.interaction = token; this.record("interaction.started", token); return token;
  }
  endInteraction(token) { if (this.interaction === token) this.interaction = null; }
  battleChanged(battle) {
    if (battle !== this.lastBattle) {
      this.record(battle ? "battle.started" : "battle.ended", battle ? { seats: battle.roster.seats.size } : { result: this.lastBattle?.result || null });
      this.lastBattle = battle;
    }
    if (battle) for (const e of battle.events) {
      if (e.sequence <= (this.battleSequence || 0)) continue;
      this.record("battle.event", { kind: e.kind, text: e.text, round: e.round });
      this.battleSequence = e.sequence;
    }
    if (!battle) this.battleSequence = 0;
  }
  observation() {
    const { state, db } = this;
    const frontId = this.world.interact()?.id;
    const dexEntry = id => ({ id, name: db.species[id].name });
    const talked = id => state.story.interactions?.includes(JSON.stringify([state.position.map, id])) || false;
    return { availability: this.availability(), tasks: taskDetails(this.story, state),
      events: this.journal.read({ limit: 256 }),
      party: state.party.map(m => monsterDetails(m, db, this.forms.effective(m))),
      box: state.box.map(m => monsterDetails(m, db)),
      dex: { seenCount: state.seen.length, caughtCount: state.caught.length,
        seen: state.seen.map(dexEntry), caught: state.caught.map(dexEntry) },
      bag: bagDetails(this.bagView().counts, this.itemDefinitions, id => this.itemActionOptions(id)),
      battle: battleDetails(this.battle, db),
      objects: [...this.field.npcs.objects(state.position.map), ...(this.world.map.signs || []).map(s => ({ ...s, kind: "sign" }))]
        .map(o => objectDetails(o, { world: this.world, story: this.story, state, talked, frontId })) };
  }
}
