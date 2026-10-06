/** Optional grid-plane policy. No rendering or game-specific map/behavior identifiers. */
export class ElevationPolicy {
  constructor({ transition = 0, multiLevel = 15, max = 15 } = {}) {
    if (
      ![transition, multiLevel, max].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 15,
      ) ||
      transition === multiLevel ||
      Math.max(transition, multiLevel) > max
    )
      throw new Error("Invalid elevation policy");
    Object.assign(this, { transition, multiLevel, max });
    Object.freeze(this);
  }
  validate(position) {
    for (const key of ["elevation", "previousElevation"])
      if (
        position[key] !== undefined &&
        (!Number.isInteger(position[key]) ||
          position[key] < 0 ||
          position[key] > this.max ||
          position[key] === this.multiLevel)
      )
        throw new Error("Invalid actor elevation");
  }
  tile(map, position) {
    return (map.blocks[position.y * map.width + position.x] >> 12) & 15;
  }
  level(position, map) {
    return (
      position.elevation ??
      (this.tile(map, position) === this.multiLevel
        ? this.transition
        : this.tile(map, position))
    );
  }
  initialize(position, map) {
    this.validate(position);
    const level = this.level(position, map);
    position.elevation = level;
    position.previousElevation ??= level;
    return position;
  }
  canEnter(level, tile) {
    return (
      level === this.transition ||
      tile === this.transition ||
      tile === this.multiLevel ||
      level === tile
    );
  }
  compatible(a, b) {
    return a === this.transition || b === this.transition || a === b;
  }
  advance(position, source, destination) {
    if (source === this.multiLevel || destination === this.multiLevel) return;
    position.elevation = destination;
    if (destination !== this.transition)
      position.previousElevation = destination;
  }
  occupies(map, object, x, y, level, { reservations = true } = {}) {
    if (
      object.x === x &&
      object.y === y &&
      this.compatible(level, this.level(object, map))
    )
      return true;
    return (
      reservations &&
      !!object.reserved?.some(
        (p) =>
          p.x === x &&
          p.y === y &&
          this.compatible(level, p.elevation ?? this.level(object, map)),
      )
    );
  }
}
