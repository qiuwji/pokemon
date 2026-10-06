import test from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../src/adapters/canvas-renderer.js";

// Capture device-space rectangles, including flip transforms, without a browser.
function surface(camera) {
  const rectangles = [], stack = [];
  let transform = [camera.scale, camera.scale, camera.offsetX, camera.offsetY];
  const record = (kind, x, y, width, height) => {
    const [sx, sy, tx, ty] = transform;
    const xs = [x * sx + tx, (x + width) * sx + tx];
    const ys = [y * sy + ty, (y + height) * sy + ty];
    rectangles.push({ kind, edges: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
  };
  return {
    rectangles,
    save() { stack.push([...transform]); },
    restore() { transform = stack.pop(); },
    translate(x, y) { transform[2] += x * transform[0]; transform[3] += y * transform[1]; },
    scale(x, y) { transform[0] *= x; transform[1] *= y; },
    fillRect(...args) { record("background", ...args); },
    drawImage(_image, _sx, _sy, _sw, _sh, ...args) { record("tile", ...args); },
  };
}

for (const scale of [1, 4 / 3, 2 / 3, 1.7])
  test(`Tile background, overlays and mirrored quadrants share device-pixel edges at scale ${scale}`, () => {
    const camera = { scale, offsetX: 3.25, offsetY: 16 / 3 };
    const ctx = surface(camera);
    const renderer = new Renderer({ getContext: () => ctx }, { maps: {} }, { "tiles-test": {} });
    renderer.camera = camera;
    const pack = { id: "test", columns: 1, lookup: [0], animations: {},
      background: [1, 2, 3], attributes: [0], metatiles: [[0, 1024, 2048, 3072, 0, 1024, 2048, 3072]] };
    for (const overlay of [false, true])
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) renderer.grid(pack, 0, x * 16 - 2.4, y * 16 - 1.7, overlay, 0);
    const rounded = ctx.rectangles.map(({ kind, edges }) => ({ kind, edges: edges.map(v => {
      assert(Math.abs(v - Math.round(v)) < 1e-8, `fractional raster edge ${v}`);
      return Math.round(v);
    }) }));
    const backgrounds = rounded.filter(r => r.kind === "background");
    assert.equal(backgrounds[0].edges[2], backgrounds[1].edges[0]);
    assert.equal(backgrounds[0].edges[3], backgrounds[2].edges[1]);
    for (let i = 0; i < 4; i++) {
      const tiles = rounded.slice(i * 9 + 1, i * 9 + 5).map(r => r.edges);
      assert.equal(tiles[0][2], tiles[1][0]);
      assert.equal(tiles[0][3], tiles[2][1]);
      assert.deepEqual([tiles[0][0], tiles[0][1], tiles[3][2], tiles[3][3]], backgrounds[i].edges);
      assert.deepEqual(rounded.slice(i * 9 + 5, i * 9 + 9).map(r => r.edges), tiles);
      assert.deepEqual(rounded.slice(36 + i * 4, 40 + i * 4).map(r => r.edges), tiles);
    }
  });
