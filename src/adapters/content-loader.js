import { contentFiles, contentFileURL, assembleContent } from "../engine/content-manifest.js";
/** The manifest selects authored or generated fragments while retaining the project URL prefix. */
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
      const location = contentFileURL(entry, url);
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
