import { DOOR_ANIMATIONS_BY_TILESET } from "../../../../generated/packs/emerald/generated/door-anims.js";
import { DIRECTIONS } from "../../../engine/world.js";

/** src/field_door.c holds each door frame for four native ticks at 60 fps. */
export const DOOR_FRAME_MS = 1000 / 15;
/** sDoorOpenAnimFrames: closed first, then the three painted frames in the atlas. */
export const DOOR_OPEN_FRAMES = Object.freeze([null, 0, 1, 2]);
/** sDoorCloseAnimFrames: the reverse, ending on the untouched tileset metatile. */
export const DOOR_CLOSE_FRAMES = Object.freeze([2, 1, 0, null]);

/**
 * Plays the reference door metatile animation over the map. Nothing here writes world state:
 * collision, behavior and warps keep the original metatile, exactly like field_door.c copying
 * tiles into VRAM. The host only reads `sample(now)`.
 */
export class DoorDirector {
  constructor({ timeline, maps, reducedMotion = () => false }) {
    Object.assign(this, { timeline, maps, reducedMotion });
    this.active = null;
    this.hidden = false;
  }
  /**
   * Task_DoDoorWarp hides the player behind the closing door and only LoadMapFromWarp
   * shows him again, so the latch outlives the closing animation instead of ending with
   * it -- otherwise he pops back into view in front of his own front door.
   */
  hide() {
    this.hidden = true;
  }
  show() {
    this.hidden = false;
  }
  /** The reference animation for the untouched metatile of this map cell, or null. */
  door({ map, x, y } = {}) {
    const m = this.maps[map];
    if (!m || !Number.isInteger(x) || !Number.isInteger(y)) return null;
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return null;
    return DOOR_ANIMATIONS_BY_TILESET[m.tileset]?.[m.blocks[y * m.width + x] & 1023] || null;
  }
  frameMs() {
    return this.reducedMotion() ? 100 : DOOR_FRAME_MS;
  }
  /** Holds one frame open until the next request replaces it. */
  hold({ map, x, y, data, index = data.open.length - 1 }) {
    this.active = {
      map,
      x,
      y,
      data,
      steps: [index],
      start: this.timeline.now(),
      frameMs: Infinity,
    };
  }
  /**
   * Swaps through `steps` and resolves once the last one has been shown. The last frame
   * stays on screen afterwards -- Task_AnimateDoor leaves the copied door tiles in place --
   * so an opened door does not snap shut while the player walks through it. A final `null`
   * step means the untouched map metatile, which needs nothing drawn.
   */
  async play({ map, x, y, data, steps }) {
    const frameMs = this.frameMs();
    this.active = { map, x, y, data, steps, start: this.timeline.now(), frameMs };
    try {
      await this.timeline.wait(steps.length * frameMs);
    } finally {
      if (this.active?.steps === steps) {
        const last = steps[steps.length - 1];
        if (last === null) this.active = null;
        else this.hold({ map, x, y, data, index: last });
      }
    }
  }
  sample(now = this.timeline.now()) {
    const a = this.active;
    // Between two doors there is a frame with nothing to draw: the reference keeps the
    // player invisible from the closing door until the arrival, so only that carries over.
    if (!a) return this.hidden ? { top: null, bottom: null, hidePlayer: true } : null;
    const step = Math.floor((now - a.start) / a.frameMs);
    const index = a.steps[Math.min(a.steps.length - 1, Math.max(0, step))];
    const pair = index === null ? null : a.data.open[index];
    return {
      map: a.map,
      x: a.x,
      y: a.y,
      top: pair ? pair[0] : null,
      bottom: pair ? pair[1] : null,
      hidePlayer: this.hidden,
    };
  }
  clear() {
    this.active = null;
  }
}

/**
 * FieldSession door port. Detection reads the base map, so a story that already paints the
 * door open does not change whether a warp animates.
 */
export function createDoorWarp({ director, sound = () => {}, reducedMotion = () => false }) {
  const openMs = () => (reducedMotion() ? 100 : DOOR_FRAME_MS) * DOOR_OPEN_FRAMES.length;
  return {
    /**
     * Returns the hold before the player may step in, plus the close that runs behind him.
     * The reference only opens a door from the north (field_control_avatar.c TryDoorWarp).
     */
    enter: ({ map, direction, door }) => {
      if (direction !== "up") return null;
      const data = director.door({ map, x: door.x, y: door.y });
      if (!data) return null;
      sound(data.sound === "sliding" ? "emerald:slidingDoor" : "emerald:door");
      const target = { map, x: door.x, y: door.y, data };
      void director.play({ ...target, steps: DOOR_OPEN_FRAMES });
      return {
        holdMs: openMs(),
        // He walks in visibly and is hidden only as the door shuts behind him, the way
        // Task_DoDoorWarp sets visibility after IsPlayerStandingStill.
        close: () => {
          director.hide();
          return director.play({ ...target, steps: DOOR_CLOSE_FRAMES });
        },
        // A coordinate script took the step instead; the swing goes back to the map tile.
        cancel: () => director.clear(),
      };
    },
    /** The new map is up: drop the old map's door and give the player back. */
    arrive: () => {
      director.clear();
      director.show();
    },
    /**
     * The screen uncovers with the door he just came out of already open, and it closes
     * behind him without hiding him (Task_ExitDoor). Doors are solid, so he stands on the
     * mat beside it -- warpArrival keeps arrival cells passable and never lands on the door.
     */
    exit: ({ map, position }) => {
      const target = { map, ...neighbourDoor(director, map, position) };
      if (!target.data) return null;
      return {
        open: () => {
          director.show();
          director.hold(target);
        },
        close: () => director.play({ ...target, steps: DOOR_CLOSE_FRAMES }),
      };
    },
  };
}

/** The door this arrival cell came out of: the cell itself, then straight behind, then any neighbour. */
function neighbourDoor(director, map, position) {
  const [bx, by] = DIRECTIONS[position.dir] || [0, 1];
  const offset = [-bx, -by];
  const order = [
    [0, 0],
    offset,
    ...Object.values(DIRECTIONS).filter(([dx, dy]) => dx !== offset[0] || dy !== offset[1]),
  ];
  for (const [dx, dy] of order) {
    const at = { map, x: position.x + dx, y: position.y + dy };
    const data = director.door(at);
    if (data) return { ...at, data };
  }
  return { data: null };
}
