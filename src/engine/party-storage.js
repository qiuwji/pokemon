/** Storage operations preserve creature UID and retain a usable field party. */
export class PartyStorageService {
  constructor({ partyLimit = 6, boxLimit = 200 } = {}) {
    Object.assign(this, { partyLimit, boxLimit });
  }
  canReceive(state) {
    return (
      state.party.length < this.partyLimit || state.box.length < this.boxLimit
    );
  }
  receive(state, monster) {
    if (
      !this.canReceive(state) ||
      [...state.party, ...state.box].some((m) => m.uid === monster.uid)
    )
      return false;
    (state.party.length < this.partyLimit ? state.party : state.box).push(
      monster,
    );
    return true;
  }
  withdraw(state, index) {
    if (
      !Number.isInteger(index) ||
      !state.box[index] ||
      state.party.length >= this.partyLimit
    )
      return false;
    state.party.push(state.box.splice(index, 1)[0]);
    return true;
  }
  exchange(state, boxIndex, partyIndex) {
    if (
      !Number.isInteger(boxIndex) ||
      !Number.isInteger(partyIndex) ||
      !state.box[boxIndex] ||
      !state.party[partyIndex]
    )
      return false;
    const usable = (m) => !m.egg && m.hp > 0;
    if (
      !state.party.some((m, i) => i !== partyIndex && usable(m)) &&
      !usable(state.box[boxIndex])
    )
      return false;
    [state.party[partyIndex], state.box[boxIndex]] = [
      state.box[boxIndex],
      state.party[partyIndex],
    ];
    return true;
  }
  deposit(state, index) {
    if (
      !Number.isInteger(index) ||
      !state.party[index] ||
      state.box.length >= this.boxLimit ||
      !state.party.some((m, i) => i !== index && !m.egg && m.hp > 0)
    )
      return false;
    state.box.push(state.party.splice(index, 1)[0]);
    return true;
  }
}
