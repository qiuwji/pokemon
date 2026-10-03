import { WeatherRegistry, WorldWeather } from "../../../engine/weather.js";
import {
  GEN3_WORLD_WEATHER,
  GEN3_BATTLE_WEATHER,
} from "../../../engine/rules/gen3/weather.js";
import { bindApplicationPorts } from "./ports.js";
export const WEATHER_PORTS = Object.freeze([
  "state",
  "db",
  "catalog",
  "plugins",
  "ui",
  "canManageParty",
  "timeView",
]);
/** Owns weather lifecycle and notifications. No renderer, combat instance or sibling application access. */
export class WeatherApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, WEATHER_PORTS);
  }
  bind() {
    this.weather = new WorldWeather({
      state: this.state.weather,
      maps: this.db.maps,
      registry: new WeatherRegistry(
        this.catalog.weather || GEN3_WORLD_WEATHER,
        {
          defaultWeather: "clear",
          battleKinds: this.catalog.battleWeather || GEN3_BATTLE_WEATHER,
        },
      ),
    });
    this.weather.expire(this.state.clock.localMs);
    if (
      !this.weather.state.active ||
      this.weather.state.active.map !== this.state.position.map
    )
      this.weather.enter(this.state.position.map, this.state.clock.localMs);
    this.lastTick = null;
    this.wasActive = false;
    this.lastRevision = this.weather.state.revision;
  }
  weatherView(map = this.state.position.map) {
    return this.weather.view(map);
  }
  notify(map = this.state.position.map) {
    if (this.plugins?.runtime?.active) return;
    if (this.lastRevision === this.weather.state.revision) return;
    this.lastRevision = this.weather.state.revision;
    this.plugins?.events.emit("core:weather-changed", this.weatherView(map));
    this.ui?.updateWeather?.(this.weatherView());
  }
  enter(map) {
    this.weather.enter(map, this.state.clock.localMs);
    this.notify();
  }
  step(position) {
    this.weather.step(position);
    this.notify();
  }
  days(days) {
    this.weather.advanceDays(days);
    this.notify();
  }
  tick(now, active = true) {
    if (
      active &&
      this.wasActive &&
      this.lastTick !== null &&
      Number.isFinite(now) &&
      now >= this.lastTick
    )
      this.weather.advance(now - this.lastTick);
    this.lastTick = Number.isFinite(now) ? now : null;
    this.wasActive = active;
    this.weather.expire(this.state.clock.localMs);
    this.notify();
  }
  validateStory(command) {
    if (Object.keys(command).some((k) => !["type", "weather"].includes(k)))
      throw new Error("Invalid story weather command");
    this.weather.registry.get(command.weather);
  }
  story(command) {
    this.validateStory(command);
    this.weather.select(this.state.position.map, command.weather, "script");
    this.notify();
  }
  setWeather(map, kind, durationMs = null) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    if (durationMs !== null && !this.timeView().initialized)
      return { ok: false, reason: "请先设定游戏时钟。" };
    this.weather.set(map, kind, { now: this.state.clock.localMs, durationMs });
    this.notify(map);
    return { ok: true, weather: this.weatherView(map) };
  }
  clearWeather(map) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    this.weather.clear(map);
    this.notify(map);
    return { ok: true, weather: this.weatherView(map) };
  }
}
