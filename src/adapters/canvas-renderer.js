import { cameraProjection, unprojectScreen } from "../engine/camera-view.js";
import { drawEnvironmentLayers } from "../presentation/environment-layers-canvas.js";
import { drawAppearance } from "../presentation/appearance-canvas.js";
import { WeatherDirector } from "../presentation/weather-director.js";
import { LightingDirector, drawLighting } from "../presentation/lighting.js";
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
      projection = () => null,
      appearanceView = () => null,
      movementPresentation = () => ({}),
      cameraConfiguration = () => ({ columns: 20, rows: 14, zoom: 1 }),
      environmentLayers = () => [],
      objectTransforms = () => [],
      cameraRig = null,
      travelActor = null,
      environment = () => ({ weather: null, hour: 12 }),
      reducedMotion = () => false,
      fieldPriority = () => 2,
      presentation = createDefaultPresentation(),
      battleBackgrounds = {},
    } = {},
  ) {
    Object.assign(this, {
      canvas,
      db,
      assets,
      battleBackgrounds,
      projection,
      appearanceView,
      movementPresentation,
      cameraConfiguration,
      environmentLayers,
      objectTransforms,
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
    this.weatherDirector = new WeatherDirector();
    this.lightingDirector = new LightingDirector();
  }
  resizeSurface(width, height) {
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }
  moving(now = performance.now()) {
    return this.motion.moving(now);
  }
  moved(from, to, jump = false, { running = false } = {}) {
    this.motion.begin(from, to, performance.now(), {
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
        { reducedMotion: this.reducedMotion(), progress, foot },
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
  pixelBounds(x, y, width, height) {
    // Snap shared edges, not individual widths: fractional viewport scales must
    // not expose the background between adjacent tiles or their overlay layers.
    const { scale = 1, offsetX = 0, offsetY = 0 } = this.camera;
    const left = Math.round(offsetX + x * scale),
      top = Math.round(offsetY + y * scale),
      right = Math.round(offsetX + (x + width) * scale),
      bottom = Math.round(offsetY + (y + height) * scale);
    return {
      x: (left - offsetX) / scale,
      y: (top - offsetY) / scale,
      width: (right - left) / scale,
      height: (bottom - top) / scale,
    };
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
    const c = this.ctx,
      bounds = this.pixelBounds(x, y, 8, 8);
    if (value & 3072) {
      c.save();
      c.translate(
        bounds.x + (value & 1024 ? bounds.width : 0),
        bounds.y + (value & 2048 ? bounds.height : 0),
      );
      c.scale(value & 1024 ? -1 : 1, value & 2048 ? -1 : 1);
      c.drawImage(image, sx, sy, 8, 8, 0, 0, bounds.width, bounds.height);
      c.restore();
    } else
      c.drawImage(image, sx, sy, 8, 8, bounds.x, bounds.y, bounds.width, bounds.height);
  }
  grid(pack, id, x, y, overlay, now) {
    id &= 1023;
    const vals = pack.metatiles[id];
    if (!vals) return;
    const layer = pack.attributes[id] >> 12;
    if (overlay && layer === 1) return;
    if (!overlay) {
      const bounds = this.pixelBounds(x, y, 16, 16);
      this.ctx.fillStyle = `rgb(${pack.background.join(",")})`;
      this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
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
        Math.ceil((this.camera.x + this.camera.width) / 16) - origin.x,
      ),
      minY = Math.max(0, Math.floor(this.camera.y / 16) - origin.y),
      maxY = Math.min(
        m.height,
        Math.ceil((this.camera.y + this.camera.height) / 16) - origin.y,
      );
    for (let y = minY; y < maxY; y++)
      for (let x = minX; x < maxX; x++)
        this.grid(
          pack,
          m.appearances?.[y * m.width + x] ?? m.blocks[y * m.width + x],
          (origin.x + x) * 16 - this.camera.x,
          (origin.y + y) * 16 - this.camera.y,
          overlay,
          now,
        );
  }
  /** Transient door frames from the field session; never part of the saved map. */
  doorTiles(frame, now) {
    // A hidden player between two doors carries no tile to draw.
    if (frame.top == null && frame.bottom == null) return;
    const m = this.mapProvider?.(frame.map),
      origin = this.graph.placements[frame.map];
    if (!m || !origin) return;
    const pack = this.db.tilesets[m.tileset],
      x = (origin.x + frame.x) * 16 - this.camera.x,
      y = (origin.y + frame.y) * 16 - this.camera.y;
    // A door is two metatiles tall: the upper half paints the wall tile above the doorway.
    if (frame.top !== null) this.grid(pack, frame.top, x, y - 16, false, now);
    if (frame.bottom !== null) this.grid(pack, frame.bottom, x, y, false, now);
  }
  cameraAt(position, now) {
    const size = { width: this.canvas.width, height: this.canvas.height, raster: true };
    const supplied = this.projection(size, now);
    if (supplied) return supplied;
    const player = this.motion.sample(position, now);
    const focus = this.cameraRig?.sample(player, now) || player;
    return cameraProjection(this.cameraConfiguration(), focus, size);
  }
  visibleMaps(position, now) {
    const view = this.cameraAt(position, now);
    return this.graph.visible(position.map, view, view.width, view.height);
  }
  screenToWorld(point) {
    return unprojectScreen(point, this.camera);
  }
  world(
    world,
    npcs,
    now = performance.now(),
    { emotes = [], movementMode = "walk", travel = null, action = null, door = null } = {},
  ) {
    this.mapProvider = (id) => world.maps[id];
    const p = world.position,
      m = world.map,
      player = this.motion.sample(p, now, {
        reducedMotion: this.reducedMotion(),
      }),
      c = this.ctx;
    this.camera = this.cameraAt(p, now);
    c.fillStyle = "#101820";
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.save();
    try {
      c.translate(this.camera.offsetX, this.camera.offsetY);
      c.scale(this.camera.scale, this.camera.scale);
      c.beginPath();
      c.rect(0, 0, this.camera.width, this.camera.height);
      c.clip();
      const ids = this.graph.visible(
          p.map,
          this.camera,
          this.camera.width,
          this.camera.height,
        ),
        pack = this.db.tilesets[m.tileset];
      // Borders use the same metatile grid, including animated source tiles.
      const origin = this.graph.placements[p.map];
      const startX = Math.floor(this.camera.x / 16),
        startY = Math.floor(this.camera.y / 16);
      for (
        let y = startY;
        y < startY + Math.ceil(this.camera.height / 16) + 1;
        y++
      )
        for (
          let x = startX;
          x < startX + Math.ceil(this.camera.width / 16) + 1;
          x++
        ) {
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
      // The door swap draws into the background layer, so it sits under every object.
      if (door) this.doorTiles(door, now);
      const offsets = this.objectTransforms(now);
      const all = ids.flatMap((id) => {
        const o = this.graph.placements[id];
        return npcs
          .view(id, now, { reducedMotion: this.reducedMotion() })
          .map((n) => {
            const move = action?.objects?.find(
              (e) => e.map === id && e.id === n.id,
            );
            const visual = offsets.find((v) => v.map === id && v.id === n.id);
            return {
              ...n,
              map: id,
              px: n.px + o.x * 16 + (move?.x || 0) + (visual?.x || 0),
              py: n.py + o.y * 16 + (move?.y || 0) + (visual?.y || 0),
            };
          });
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
          // The reference hides the player while the door closes over him.
          if (n.player && door?.hidePlayer) continue;
          const avatar = n.player ? action?.player || {} : {};
          const x = n.px - this.camera.x + (avatar.x || 0),
            y = n.py - this.camera.y + (avatar.y || 0);
          const target = n.player
            ? { kind: "player" }
            : n._actorUid
              ? { kind: "actor", uid: n._actorUid }
              : { kind: "object", map: n.map, id: n.id };
          const visual = {
            actor: n.actor,
            species: n.species,
            mode: n.player
              ? travel
                ? "walk"
                : n.moving
                  ? n.mode
                  : movementMode
              : n.movement?.mode,
            pose: n.pose,
            moving: !!n.moving,
          };
          // Omit absent optional fields before crossing the JSON/read-only boundary.
          const frame = this.appearanceView(
            target,
            Object.fromEntries(
              Object.entries(visual).filter(([, v]) => v !== undefined),
            ),
          );
          n.appearanceFrame = frame;
          const lift = (n.lift || 0) + (n.player ? travel?.lift || 0 : 0),
            bounds = frame?.bounds || {
              left: 0,
              top: 0,
              right: 16,
              bottom: 16,
            };
          if (
            x + bounds.right < 0 ||
            x + bounds.left > this.camera.width ||
            y - lift + bounds.bottom < 0 ||
            y - lift + bounds.top > this.camera.height
          )
            continue;
          c.save();
          c.globalAlpha *= avatar.opacity ?? 1;
          if (avatar.scale !== undefined || avatar.rotation !== undefined) {
            c.translate(x + 8, y + 8);
            c.rotate(avatar.rotation || 0);
            c.scale(avatar.scale ?? 1, avatar.scale ?? 1);
            c.translate(-x - 8, -y - 8);
          }
          // Shadows are visual poses; height never changes grid occupancy.
          if (frame?.shadow) {
            c.save();
            c.globalAlpha *= 0.2;
            c.fillStyle = "#182838";
            c.fillRect(Math.round(x + 2), Math.round(y + 11), 12, 3);
            c.fillRect(Math.round(x + 4), Math.round(y + 10), 8, 5);
            c.restore();
          }
          if (n.player && travel?.carrier && this.travelActor)
            this.actor(this.travelActor, x, y - 24 - travel.lift, "down");
          drawAppearance(
            this,
            frame,
            {
              dir: n.dir,
              progress: n.progress ?? 1,
              foot: n.foot ?? 0,
              moving: !!n.moving,
              freezeAnimation: !!n.freezeAnimation,
              pose: n.pose,
              timeMs: n.animationTimeMs ?? now,
            },
            x,
            y - lift,
            { reducedMotion: this.reducedMotion() },
          );
          c.restore();
        }
      };
      const aboveTerrain = this.movementPresentation().aboveTerrain;
      drawActors(all.filter((n) => !(n.player && aboveTerrain) && priority(n) >= 2));
      for (const id of ids) this.drawMap(id, true, now);
      drawActors(all.filter((n) => !(n.player && aboveTerrain) && priority(n) < 2));
      if (aboveTerrain) drawActors(all.filter(n=>n.player));
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
      const environment = this.environment(m, now, p.map);
      drawDaylight(c, environment.hour, {
        indoor: m.indoor,
        width: this.camera.width,
        height: this.camera.height,
      });
      for (const layer of this.weatherDirector.sample(
        now,
        environment.weather,
        {
          reducedMotion: this.reducedMotion(),
        },
      ))
        drawWeather(c, layer.visual, now, {
          width: this.camera.width,
          height: this.camera.height,
          opacity: layer.opacity,
          reducedMotion: this.reducedMotion(),
          registry: this.presentation,
        });
      drawEnvironmentLayers(c, this.environmentLayers(), now, {
        width: this.camera.width,
        height: this.camera.height,
        reducedMotion: this.reducedMotion(),
        registry: this.presentation,
      });
      for (const cue of emotes) {
        const n = all.find((n) => n.id === cue.actor && n.map === cue.map);
        if (!n) continue;
        drawFieldEmote(c, {
          kind: cue.kind,
          x: n.px - this.camera.x + 8,
          y: n.py - this.camera.y - -(n.appearanceFrame?.emoteY ?? -16),
        });
      }
      const lighting = this.lightingDirector.sample(
        p.map,
        now,
        m.darkness,
        Object.values(environment.fieldEffects?.records || {}).map(
          (r) => r.presentation,
        ),
        { reducedMotion: this.reducedMotion() },
      );
      if (lighting)
        drawLighting(c, {
          width: this.camera.width,
          height: this.camera.height,
          opacity: lighting.opacity,
          lights: [
            {
              x: player.x - this.camera.x + 8,
              y: player.y - this.camera.y + 8,
              radius: lighting.radius,
            },
          ],
        });
    } finally {
      c.restore();
    }
  }
  battle(frame) {
    this.ctx.save();
    try {
      // Battle layout, HUD and plugin anchors retain their 320x224 reference.
      this.ctx.scale(this.canvas.width / 320, this.canvas.height / 224);
      drawBattle(this.ctx, this.assets, frame, this.battleBackgrounds);
    } finally { this.ctx.restore(); }
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
          image.src = db.resources?.[id] || `generated/assets/${id}.png`;
        }),
    ),
  );
  return loaded;
}
