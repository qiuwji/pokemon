import assert from "node:assert/strict";
import { Timeline } from "../../src/engine/timeline.js";
export function manualStoryClock(start = 1000) {
  let time = start;
  const waits = [];
  const timeline = new Timeline({
    now: () => time,
    wait: (ms) =>
      new Promise((resolve) => waits.push({ at: time + ms, resolve })),
  });
  return {
    timeline,
    waits,
    async advance(ms) {
      time += ms;
      for (const w of [...waits])
        if (w.at <= time) {
          waits.splice(waits.indexOf(w), 1);
          w.resolve();
        }
      await new Promise(setImmediate);
    },
    async drain(job, tick = () => {}) {
      let done = false,
        failure;
      job.then(
        () => {
          done = true;
        },
        (e) => {
          failure = e;
          done = true;
        },
      );
      for (let i = 0; i < 1000 && !done; i++) {
        await new Promise(setImmediate);
        if (done) break;
        assert(waits.length, "Scene is stalled without a clock wait");
        await this.advance(
          Math.max(0, Math.min(...waits.map((w) => w.at)) - time),
        );
        tick(time);
      }
      assert(done, "Scene exceeded its bounded execution budget");
      if (failure) throw failure;
    },
  };
}
