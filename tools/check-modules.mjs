import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walk(file)
      : file.endsWith(".js")
        ? [file]
        : [];
  });
}
const files = ["src", "generated"].flatMap(tree => walk(new URL(`../${tree}/`, import.meta.url).pathname));
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(1);
  }
}
console.log(`Module syntax valid: ${files.length} files.`);
