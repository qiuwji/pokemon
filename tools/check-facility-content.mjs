import fs from "node:fs";
import { loadContentSync } from "./content-io.mjs";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { createFacilityContent } from "../dist/plugins/facility-content/index.js";
const input = process.argv[2] || new URL("../dist/plugins/facility-content/content.json", import.meta.url);
try {
  const pack = JSON.parse(fs.readFileSync(input, "utf8"));
  createEmeraldPlugins(loadContentSync(), [createFacilityContent(pack)]);
  console.log(`Facility content valid: ${pack.facilities.length} facilities, ${(pack.trainers || []).length} trainers; no files written`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
