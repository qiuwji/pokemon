import fs from "node:fs";
import {
  contentFiles,
  assembleContent,
} from "../dist/engine/content-manifest.js";
export const CONTENT_MANIFEST = new URL(
  "../dist/content/manifest.json",
  import.meta.url,
);
/** Node tools and tests consume exactly the same manifest and merge contract as the browser. */
export function loadContentSync(url = CONTENT_MANIFEST) {
  const manifest = JSON.parse(fs.readFileSync(url, "utf8"));
  const values = contentFiles(manifest).map((entry) => {
    const location = new URL(entry.path, url);
    try {
      return JSON.parse(fs.readFileSync(location, "utf8"));
    } catch (error) {
      throw new Error(`Content ${entry.section}: failed ${location}`, {
        cause: error,
      });
    }
  });
  return assembleContent(manifest, values);
}
