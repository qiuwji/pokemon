import { sampleSpriteAnimation } from "../presentation/sprite-animation.js";
import {
  drawWeather,
  drawDaylight,
} from "../presentation/environment-canvas.js";
import { drawBattle } from "../presentation/battle-canvas.js";
import { drawFieldEmote } from "../presentation/field-canvas.js";
import { drawFieldAction } from "../presentation/field-action-canvas.js";
import { createDefaultPresentation } from "../presentation/default-presentation.js";
import { SceneGraph, GridMotion, actorFrame } from "../engine/motion.js";
// Draw each 8x8 source tile into a 16x16 map grid. No pre-rendered scene images.
export class Renderer {
  constructor(
    canvas,
    db,
    assets,
    {
      playerActors = { walk: "Player", run: "PlayerRun" },
      cameraRig = null,
      travelActor = null,
      environment = () => ({ weather: null, hour: 12 }),
      reducedMotion = () => false,
      fieldPriority = () => 2,
      presentation = createDefaultPresentation(),
    } = {},
  ) {
    Object.assign(this, {
      canvas,
      db,
      assets,
      playerActors,
      cameraRig,
      travelActor,
      environment,
      reducedMotion,
      fieldPriority,
      presentation,
    });
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.graph = new SceneGraph(db.maps);
    this.motion = new GridMotion(this.graph);
    this.camera = { x: 0, y: 0 };
  }
  moving(now = performance.now()) {
    return this.motion.moving(now);
  }
  moved(from, to, jump = false, { running = false } = {}) {
    const smooth = this.motion.begin(from, to, performance.now(), {
      running,
      jump,
    });
  }
  actor(
    name,
    x,
    y,
    dir = "down",
    progress = 1,
    foot = 0,
    moving = false,
    animation = {},
  ) {
    const image = this.assets[`actor-${name}`],
      def = this.db.actors[name];
    if (!image || !def) return;
    if (def.underlay)
      this.actor(
        def.underlay.actor,
        x,
        y + (def.underlay.offsetY || 0),
        dir,
        progress,
        foot,
        moving,
      );
    let frame =
      sampleSpriteAnimation(
        def.animations,
        animation.pose,
        dir,
        animation.timeMs || 0,
        moving,
        { reducedMotion: this.reducedMotion() },
      ) || actorFrame(dir, progress, foot, moving, def.frames);
    if (frame.index * def.w >= image.width) frame = { index: 0, flip: false };
    const c = this.ctx,
      dx = Math.round(x + (def.offsetX || 0)),
      dy = Math.round(y + (def.offsetY || 0));
    c.save();
    if (frame.flip) {
      c.translate(dx + def.w, dy);
      c.scale(-1, 1);
      c.drawImage(
        image,
        frame.index * def.w,
        0,
        def.w,
        def.h,
        0,
        0,
        def.w,
        def.h,
      );
    } else
      c.drawImage(
        image,
        frame.index * def.w,
        0,
        def.w,
        def.h,
        dx,
        dy,
        def.w,
        def.h,
      );
    c.restore();
  }
  tile(pack, value, x, y, now) {
    const base = value & ~3072;
    const animation = pack.animations[base];
    const index = animation
      ? animation.frames[
          Math.floor(now / animation.ms) % animation.frames.length
        ]
      : pack.lookup[base];
    if (index === undefined) return;
    const image = this.assets["tiles-" + pack.id];
    const sx = (index % pack.columns) * 8,
      sy = Math.floor(index / pack.columns) * 8;
    const c = this.ctx;
    if (value & 3072) {
      c.save();
      c.translate(x + (value & 1024 ? 8 : 0), y + (value & 2048 ? 8 : 0));
      c.scale(value & 1024 ? -1 : 1, value & 2048 ? -1 : 1);
      c.drawImage(image, sx, sy, 8, 8, 0, 0, 8, 8);
      c.restore();
    } else c.drawImage(image, sx, sy, 8, 8, x, y, 8, 8);
  }
  grid(pack, id, x, y, overlay, now) {
    id &= 1023;
    const vals = pack.metatiles[id];
    if (!vals) return;
    const layer = pack.attributes[id] >> 12;
    if (overlay && layer === 1) return;
    if (!overlay) {
      this.ctx.fillStyle = `rgb(${pack.background.join(",")})`;
      this.ctx.fillRect(x, y, 16, 16);
    }
    for (let i = overlay ? 4 : 0; i < 8; i++)
      this.tile(
        pack,
        vals[i],
        x + (i % 2) * 8,
        y + Math.floor((i % 4) / 2) * 8,
        now,
      );
  }
  drawMap(id, overlay, now) {
    const m = this.mapProvider?.(id) || this.db.maps[id],
      origin = this.graph.placements[id],
      pack = this.db.tilesets[m.tileset];
    const minX = Math.max(0, Math.floor(this.camera.x / 16) - origin.x),
      maxX = Math.min(
        m.width,
        Math.ceil((this.camera.x + 320) / 16) - origin.x,
      ),
      minY = Math.max(0, Math.floor(this.camera.y / 16) - origin.y),
      maxY = Math.min(
        m.height,
        Math.ceil((this.camera.y + 224) / 16) - origin.y,
      );
    for (let y = minY; y < maxY; y++)
      for (let x = minX; x < maxX; x++)
        this.grid(
          pack,
          m.appearances?.[y * m.width + x] ?? m.blocks[y * m.width + x],
          Math.round((origin.x + x) * 16 - this.camera.x),
          Math.round((origin.y + y) * 16 - this.camera.y),
          overlay,
          now,
        );
  }
  cameraAt(position, now) {
    const player = this.motion.sample(position, now);
    const focus = this.cameraRig?.sample(player, now) || player;
    return { x: Math.round(focus.x - 152), y: Math.round(focus.y - 104) };
  }
  world(
    world,
    npcs,
    now = performance.now(),
    { emotes = [], movementMode = "walk", travel = null, action = null } = {},
  ) {
    this.mapProvider = (id) => world.maps[id];
    const p = world.position,
      m = world.map,
      player = this.motion.sample(p, now, {
        reducedMotion: this.reducedMotion(),
      }),
      c = this.ctx;
    this.camera = this.cameraAt(p, now);
    const ids = this.graph.visible(p.map, this.camera),
      pack = this.db.tilesets[m.tileset];
    // Borders use the same metatile grid, including animated source tiles.
    const origin = this.graph.placements[p.map];
    const startX = Math.floor(this.camera.x / 16),
      startY = Math.floor(this.camera.y / 16);
    for (let y = startY; y < startY + 15; y++)
      for (let x = startX; x < startX + 21; x++) {
        const bx = (((x - origin.x) % 2) + 2) % 2,
          by = (((y - origin.y) % 2) + 2) % 2;
        this.grid(
          pack,
          m.border[by * 2 + bx],
          x * 16 - this.camera.x,
          y * 16 - this.camera.y,
          false,
          now,
        );
      }
    for (const id of ids) this.drawMap(id, false, now);
    const all = ids.flatMap((id) => {
      const o = this.graph.placements[id];
      return npcs
        .view(id, now, { reducedMotion: this.reducedMotion() })
        .map((n) => ({
          ...n,
          map: id,
          px: n.px + o.x * 16,
          py: n.py + o.y * 16,
        }));
    });
    all.push({
      ...player,
      id: "player",
      map: p.map,
      player: true,
      px: player.x,
      py: player.y,
    });
    const priority = (n) =>
      this.fieldPriority(n.previousElevation ?? n.elevation ?? 0);
    all.sort((a, b) => priority(b) - priority(a) || a.py - b.py);
    const drawActors = (actors) => {
      for (const n of actors) {
        const avatar = n.player ? action?.player || {} : {};
        const x = n.px - this.camera.x + (avatar.x || 0),
          y = n.py - this.camera.y + (avatar.y || 0);
        if (x < -32 || x > 352 || y < -32 || y > 256) continue;
        c.save();
        c.globalAlpha *= avatar.opacity ?? 1;
        if (avatar.scale !== undefined || avatar.rotation !== undefined) {
          c.translate(x + 8, y + 8);
          c.rotate(avatar.rotation || 0);
          c.scale(avatar.scale ?? 1, avatar.scale ?? 1);
          c.translate(-x - 8, -y - 8);
        }
        // Shadows are visual poses; height never changes grid occupancy.
        if (n.actor !== "BirchsBag") {
          c.save();
          c.globalAlpha *= 0.2;
          c.fillStyle = "#182838";
          c.fillRect(Math.round(x + 2), Math.round(y + 11), 12, 3);
          c.fillRect(Math.round(x + 4), Math.round(y + 10), 8, 5);
          c.restore();
        }
        if (n.player) {
          if (travel?.carrier && this.travelActor)
            this.actor(this.travelActor, x, y - 24 - travel.lift, "down");
          this.actor(
            this.playerActors[
              travel
                ? "walk"
                : n.moving
                  ? this.playerActors[n.pose]
                    ? n.pose
                    : n.mode
                  : movementMode
            ] || this.playerActors.walk,
            x,
            y -
              16 -
              n.lift -
              (travel?.lift || 0) +
              (movementMode === "surf"
                ? Math.round(Math.sin(now / 180) * 1.5)
                : 0),
            n.dir,
            n.progress,
            n.foot,
            n.moving && !n.freezeAnimation,
            { pose: n.pose, timeMs: n.animationTimeMs },
          );
        } else if (n.species) {
          const image = this.assets[n.species + "-front"];
          if (image) {
            const hop =
              n.movement?.mode === "jog" ? Math.sin(now / 80) * 1.3 : 0;
            c.drawImage(
              image,
              0,
              0,
              64,
              64,
              x - 1,
              y - 6 - hop - (n.lift || 0),
              20,
              20,
            );
          }
        } else
          this.actor(
            n.actor,
            x,
            y - ((this.db.actors[n.actor]?.h || 16) - 16) - (n.lift || 0),
            n.dir,
            n.progress,
            n.foot,
            n.moving,
            { pose: n.pose, timeMs: now },
          );
        c.restore();
      }
    };
    drawActors(all.filter((n) => priority(n) >= 2));
    for (const id of ids) this.drawMap(id, true, now);
    drawActors(all.filter((n) => priority(n) < 2));
    if (action?.target.map) {
      const p = this.graph.point(action.target);
      drawFieldAction(
        c,
        action,
        {
          x: p.x - this.camera.x + 8,
          y: p.y - this.camera.y + 8,
        },
        this.presentation,
      );
    }
    const environment = this.environment(m, now);
    drawDaylight(c, environment.hour, { indoor: m.indoor });
    drawWeather(c, m.indoor ? null : environment.weather, now, {
      height: 224,
      reducedMotion: this.reducedMotion(),
    });
    for (const cue of emotes) {
      const n = all.find((n) => n.id === cue.actor && n.map === cue.map);
      if (!n) continue;
      drawFieldEmote(c, {
        kind: cue.kind,
        x: n.px - this.camera.x + 8,
        y:
          n.py -
          this.camera.y -
          (n.player ? 16 : (this.db.actors[n.actor]?.h || 32) - 16),
      });
    }
  }
  battle(frame) {
    drawBattle(this.ctx, this.assets, frame);
  }
}
export async function loadAssets(db) {
  for (const [id, pack] of Object.entries(db.tilesets))
    if (!Object.isFrozen(pack)) pack.id = id;
  const ids = [
    "battle-bg",
    ...Object.keys(db.resources || {}),
    ...Object.keys(db.tilesets).map((k) => "tiles-" + k),
    ...Object.keys(db.actors).map((k) => "actor-" + k),
    ...Object.keys(db.species).flatMap((k) => [k + "-front", k + "-back"]),
  ];
  const loaded = {};
  await Promise.all(
    [...new Set(ids)].map(
      (id) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            loaded[id] = image;
            resolve();
          };
          image.onerror = () => reject(new Error(`无法加载图像 ${id}`));
          image.src = db.resources?.[id] || `assets/${id}.png`;
        }),
    ),
  );
  return loaded;
}
