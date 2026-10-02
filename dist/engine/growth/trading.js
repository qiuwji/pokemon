/** Local parties exchange stable identities. Transport and the exchange animation are separate ports. */
export class TradeService {
  constructor({ db }) {
    this.db = db;
  }
  exchange({ partyA, partyB, uidA, uidB, trainerA, trainerB }) {
    const ia = partyA.findIndex((m) => m.uid === uidA),
      ib = partyB.findIndex((m) => m.uid === uidB),
      a = partyA[ia],
      b = partyB[ib];
    if (
      partyA === partyB ||
      !a ||
      !b ||
      a.uid === b.uid ||
      !trainerA ||
      !trainerB ||
      [...partyA, ...partyB].length !==
        new Set([...partyA, ...partyB].map((m) => m.uid)).size ||
      !this.db.species[a.species] ||
      !this.db.species[b.species]
    )
      return { ok: false, reason: "交换对象已发生变化。" };
    const usable = (m) => !m.egg && m.hp > 0;
    if (
      (!partyA.some((m, i) => i !== ia && usable(m)) && !usable(b)) ||
      (!partyB.some((m, i) => i !== ib && usable(m)) && !usable(a))
    )
      return { ok: false, reason: "请为双方都保留一位能战斗的伙伴。" };
    for (const [mon, trainer] of [
      [a, trainerB],
      [b, trainerA],
    ]) {
      if (!mon.egg) mon.friendship = 70;
      mon.traded = mon.originalTrainer !== trainer;
    }
    partyA[ia] = b;
    partyB[ib] = a;
    return { ok: true, receivedA: b.uid, receivedB: a.uid };
  }
}
