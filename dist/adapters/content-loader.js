import { contentFiles, assembleContent } from "../engine/content-manifest.js";
/** The URL of the manifest is the base for every fragment; deployment prefixes are preserved. */
export async function loadContent(
  url,
  {
    readJSON = async (location) => {
      const response = await fetch(location);
      if (!response.ok)
        throw new Error(
          `Content unavailable: ${location} (${response.status})`,
        );
      return response.json();
    },
  } = {},
) {
  const manifest = await readJSON(url);
  const files = contentFiles(manifest);
  const values = await Promise.all(
    files.map(async (entry) => {
      const location = new URL(entry.path, url);
      try {
        return await readJSON(location);
      } catch (error) {
        throw new Error(`Content ${entry.section}: failed ${location}`, {
          cause: error,
        });
      }
    }),
  );
  return assembleContent(manifest, values);
}
