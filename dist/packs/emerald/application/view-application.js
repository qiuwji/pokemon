import { bindApplicationPorts } from "./ports.js";
import {
  CameraProfiles,
  cameraProjection,
  projectWorld,
  unprojectScreen,
} from "../../../engine/camera-view.js";
import { EnvironmentLayers } from "../../../engine/environment-layers.js";
import { VisualLeases } from "../../../engine/visual-leases.js";
import { readOnly } from "../../../engine/extensions/values.js";
export const VIEW_PORTS = Object.freeze([
  "catalog",
  "db",
  "state",
  "motion",
  "camera",
  "timeline",
  "sceneDirector",
]);
/** Coordinates presentation configuration; each registry and lease owns only its own data. */
export class ViewApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, VIEW_PORTS);
    this.cameras = new CameraProfiles(
      this.catalog.cameraProfiles || {
        "emerald-default": { name: "原作视口", columns: 15, rows: 10, zoom: 1 },
      },
    );
    this.layers = new EnvironmentLayers(this.catalog.environmentLayers || {});
    this.cameraLeases = new VisualLeases("camera", {
      limit: 16,
      exclusive: true,
    });
    this.layerLeases = new VisualLeases("environment");
  }
  acquireCamera({ profile, focus, priority = 0, scope = "visit" }) {
    this.cameras.get(profile);
    if (focus) {
      const m = this.db.maps[focus.map];
      if (
        !m ||
        Object.keys(focus).some((k) => !["map", "x", "y"].includes(k)) ||
        !Number.isSafeInteger(focus.x) ||
        !Number.isSafeInteger(focus.y) ||
        focus.x < 0 ||
        focus.y < 0 ||
        focus.x >= m.width ||
        focus.y >= m.height
      )
        throw new Error("Invalid camera focus");
      if (
        this.motion.graph.placements[focus.map].zone !==
        this.motion.graph.placements[this.state.position.map].zone
      )
        throw new Error("Camera focus is in a disconnected scene");
    }
    return {
      token: this.cameraLeases.acquire(
        { profile, ...(focus ? { focus } : {}) },
        { priority, scope, map: this.state.position.map },
      ),
    };
  }
  projection(size, now = this.timeline.now()) {
    const player = this.motion.sample(this.state.position, now),
      focus = this.camera.sample(player, now),
      configuration = this.config(),
      visual = this.sceneDirector?.fieldTransform(now) || {
        x: 0,
        y: 0,
        zoom: 1,
      };
    return cameraProjection(
      { ...configuration, zoom: configuration.zoom * visual.zoom },
      { ...focus, x: focus.x + visual.x, y: focus.y + visual.y },
      size,
    );
  }
  project(point, size) {
    return projectWorld(point, this.projection(size));
  }
  unproject(point, size) {
    return unprojectScreen(point, this.projection(size));
  }
  releaseCamera(token) {
    return this.cameraLeases.release(token);
  }
  config() {
    const lease = this.cameraLeases.list().at(-1);
    return readOnly({
      profile: lease?.value.profile || "emerald-default",
      ...this.cameras.get(lease?.value.profile || "emerald-default"),
      focus: lease?.value.focus || null,
    });
  }
  focus(player) {
    const c = this.config();
    if (!c.focus) return player;
    const point = this.motion.graph.point(c.focus);
    return point.zone === player.zone ? point : player;
  }
  acquireLayer({ layer, data, scope = "visit" }) {
    const selection = this.layers.selection(layer, data);
    return {
      token: this.layerLeases.acquire(selection, {
        map: this.state.position.map,
        scope,
        priority: selection.order,
      }),
    };
  }
  releaseLayer(token) {
    return this.layerLeases.release(token);
  }
  frames() {
    return readOnly(this.layerLeases.list().map((r) => r.value));
  }
  view() {
    return readOnly({
      camera: this.config(),
      cameraLeases: this.cameraLeases.list(),
      environment: this.layerLeases.list(),
    });
  }
  visit(map) {
    this.cameraLeases.visit(map);
    this.layerLeases.visit(map);
  }
  reset() {
    this.cameraLeases.reset();
    this.layerLeases.reset();
  }
}
