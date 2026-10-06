import { PartyTraits } from "../rules/party-traits.js";
/** Friendship uses domain clocks/events, never presentation timers. Rules are injected by the game. */
export const FRIENDSHIP_EVENTS = Object.freeze({
  level: [5, 3, 2],
  vitamin: [5, 3, 2],
  battleItem: [1, 1, 0],
  league: [3, 2, 1],
  learn: [1, 1, 0],
  walk: [1, 1, 1],
  faint: [-1, -1, -1],
  fieldPoison: [-5, -5, -10],
  largeFaint: [-5, -5, -10],
});
export class FriendshipService {
  constructor({ abilities, heldItems, hooks = [], events = FRIENDSHIP_EVENTS }) {
    Object.assign(this, { abilities, heldItems, events, hooks });
  }
  change(
    mon,
    event,
    { party = [mon], sameLocation = false, luxuryBall = false, amount } = {},
  ) {
    if (!this.events[event] && amount === undefined)
      throw new Error(`Unknown friendship event ${event}`);
    if (mon.egg)
      return {
        uid: mon.uid,
        before: mon.friendship,
        after: mon.friendship,
        delta: 0,
      };
    const before = mon.friendship ?? 70,
      bracket = before < 100 ? 0 : before < 200 ? 1 : 2;
    let delta = amount ?? this.events[event][bracket];
    if (!Number.isInteger(delta)) throw new Error("Invalid friendship change");
    const traits = new PartyTraits({
      party,
      abilities: this.abilities,
      heldItems: this.heldItems,
      hooks: this.hooks,
    });
    if (delta > 0) {
      delta = Math.floor(
        traits.calculate("friendship-modifier", delta, mon, { event }),
      );
      if (sameLocation) delta++;
      if (luxuryBall) delta++;
    }
    const after = Math.max(0, Math.min(255, before + delta));
    mon.friendship = after;
    return { uid: mon.uid, before, after, delta: after - before };
  }
}
