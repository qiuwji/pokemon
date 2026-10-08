import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { Renderer } from "../src/adapters/canvas-renderer.js";
import { emeraldReflectionSurface, emeraldReflectionVisible, emeraldReflectionResource } from "../src/packs/emerald/field-reflections.js";

test("Route104 bridge deck suppresses reflections while nearby banks and water keep them", () => {
  const { game: g, db } = session(), reflection = {}, draws = [];
  const ctx = { globalAlpha: 1, save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, rect() {}, clip() {}, fillRect() {} };
  const renderer = new Renderer({ width: 240, height: 160, getContext: () => ctx }, db, { "reflection-MayNormal": reflection }, {
    environment: () => ({ hour: 12, weather: null }), reflectionSurface: emeraldReflectionSurface,
    reflectionVisible: emeraldReflectionVisible, reflectionResource: emeraldReflectionResource,
    appearanceView: () => ({ bounds: { left: 0, right: 16, top: -16, bottom: 16 }, layers: [{ kind: "actor", actor: "MayNormal", y: -16 }] }),
  });
  renderer.grid = () => {}; renderer.drawMap = () => {};
  renderer.actor = function(actor) { if (this.assets[`actor-${actor}`] === reflection) draws.push(actor); };
  const sample = (x,y) => {
    assert(g.enter({ map: "Route104", x, y, dir: "down" }));
    draws.length = 0; renderer.world(g.world, { view: () => [] }, 0); return draws.length;
  };
  assert.equal(sample(24,8), 0, "north approach above bridge water");
  assert.equal(sample(24,9), 0, "standing on bridge deck");
  assert.equal(sample(24,16), 0, "south end above adjacent ordinary pond");
  assert(sample(23,8) > 0, "bank west of bridge still reflects");
  assert.equal(emeraldReflectionVisible({ behavior: 0x2b }, { behavior: 0x2b, elevation: 1 }), true, "water plane under bridge");
  assert.equal(emeraldReflectionSurface(0x15), null, "ocean does not reflect");
});

test("Native water, shores and waterfalls sample imported animation frames instead of painting all water alike", () => {
  const { db } = session(), map = db.maps.Route104, pack = { ...db.tilesets[map.tileset], id: map.tileset }, drawn = [];
  const renderer = Object.create(Renderer.prototype);
  Object.assign(renderer, { assets: { [`tiles-${pack.id}`]: {} }, pixelBounds: (x,y,width,height) => ({ x,y,width,height }), ctx: { drawImage: (...args) => drawn.push(args) } });
  const sample = (tile,time) => { renderer.tile(pack,tile,0,0,time); return drawn.at(-1).slice(1,3).join(","); };
  const water = Object.entries(pack.animations).find(([id]) => (+id & 1023) === 432);
  assert(water); const [id,anim] = water;
  assert.equal(anim.frames.length,8); assert.equal(anim.ms,16*1000/60);
  assert.equal(sample(+id,0), sample(+id,16*1000/60));
  assert.notEqual(sample(+id,0),sample(+id,17*1000/60+0.001));
  assert.equal(sample(+id,0),sample(+id,129*1000/60+0.001));
  const shore = Object.entries(pack.animations).find(([id]) => (+id & 1023) === 464)[1];
  assert.equal(shore.frames.length,8); assert.equal(shore.frames[0],shore.frames[7]);
  assert.equal(Object.entries(pack.animations).find(([id]) => (+id & 1023) === 496)[1].ms,16*1000/60);
  const staticTile = Object.keys(pack.lookup).find(key => !pack.animations[key]);
  assert.equal(sample(+staticTile,0),sample(+staticTile,10000));
  const waterTiles = map.blocks.filter((_,i) => map.behavior[i] === 0x15).flatMap(block => pack.metatiles[block & 1023]);
  assert(waterTiles.some(tile => pack.animations[tile & ~3072]), "actual Route104 ocean references animated tiles");
});

test("The Route104 diagonal pond in the screenshot has Rustboro's staggered eight-frame water", () => {
  const { db } = session(), map = db.maps.Route104, pack = db.tilesets[map.tileset];
  const used = map.blocks.flatMap((block,i) => map.behavior[i] === 0x10 ? pack.metatiles[block & 1023] : []);
  const windy = used.find(tile => (tile & 1023) >= 640 && (tile & 1023) < 672);
  assert.notEqual(windy, undefined);
  const a = pack.animations[windy & ~3072];
  assert(a, "secondary Rustboro pond frames must be exported, not just General ocean frames");
  assert.equal(a.frames.length,8); assert.equal(a.ms,8*1000/60);
  assert(new Set(a.frames).size > 1);
  const calls=[], renderer=Object.create(Renderer.prototype), picture={};
  Object.assign(renderer,{ assets:{[`tiles-${map.tileset}`]:picture},pixelBounds:(x,y,width,height)=>({x,y,width,height}),ctx:{drawImage:(_image,sx,sy)=>calls.push([sx,sy])}});
  for(const time of [a.offsetMs, a.offsetMs+a.ms+0.001]) renderer.tile({...pack,id:map.tileset},windy,0,0,time);
  assert.notDeepEqual(calls[0],calls[1], "the exact pond metatile changes its sampled source rectangle");
});
