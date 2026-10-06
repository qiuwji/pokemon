import { validateContentReferences } from "./content-references.js";
/** Content files are data fragments, never executable imports. No I/O in this module. */
export const CONTENT_SECTIONS = Object.freeze([
  "maps",
  "tilesets",
  "species",
  "moves",
  "actors",
  "evolutions",
  "typeChart",
  "references",
  "stories",
]);
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const safeKey = (key) =>
  typeof key === "string" &&
  key.length > 0 &&
  !["__proto__", "prototype", "constructor"].includes(key);
/** Generated fragments keep their own tree beside src; paths within either tree stay constrained. */
export function contentFileURL(entry, manifestURL) {
  const base = entry.generated
    ? new URL("../../generated/content/", manifestURL)
    : manifestURL;
  return new URL(entry.path, base);
}
export function contentFiles(manifest) {
  if (
    !record(manifest) ||
    Object.keys(manifest).some((key) => !["version", "files"].includes(key)) ||
    manifest.version !== 1 ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0 ||
    manifest.files.length > 10000
  )
    throw new Error("Invalid content manifest");
  const paths = new Set(),
    sections = new Set();
  for (const entry of manifest.files) {
    if (
      !record(entry) ||
      Object.keys(entry).some(
        (key) => !["section", "path", "key", "generated"].includes(key),
      ) ||
      !CONTENT_SECTIONS.includes(entry.section) ||
      typeof entry.path !== "string" ||
      !/^[A-Za-z0-9_./-]+\.json$/.test(entry.path) ||
      entry.path.startsWith("/") ||
      entry.path
        .split("/")
        .some((part) => !part || part === "." || part === "..") ||
      paths.has(entry.path) ||
      (entry.key !== undefined && !safeKey(entry.key)) ||
      (entry.generated !== undefined && typeof entry.generated !== "boolean")
    )
      throw new Error(`Invalid content file: ${entry?.path}`);
    paths.add(entry.path);
    sections.add(entry.section);
  }
  for (const section of CONTENT_SECTIONS)
    if (section !== "stories" && !sections.has(section))
      throw new Error(`Missing content section: ${section}`);
  return manifest.files;
}
export function assembleContent(manifest, values) {
  const files = contentFiles(manifest);
  if (!Array.isArray(values) || files.length !== values.length)
    throw new Error("Content manifest/file count mismatch");
  const db = Object.fromEntries(
    CONTENT_SECTIONS.map((section) => [section, {}]),
  );
  for (let i = 0; i < files.length; i++) {
    const { section, key, path } = files[i],
      value = values[i];
    if (!record(value)) throw new Error(`Expected content object: ${path}`);
    const target = key === undefined ? db[section] : (db[section][key] ||= {});
    for (const [field, data] of Object.entries(value)) {
      if (!safeKey(field) || Object.hasOwn(target, field))
        throw new Error(
          `Duplicate or unsafe content field: ${section}.${key ? key + "." : ""}${field} (${path})`,
        );
      target[field] = data;
    }
  }
  const errors = validateContentReferences(db);
  if (errors.length)
    throw new Error(
      "Invalid content references: " + errors.slice(0, 12).join(", "),
    );
  return db;
}
