import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function markdown(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? markdown(target) : entry.name.endsWith(".md") ? [target] : [];
  });
}
const files = [
  ...fs.readdirSync(root).filter(name => name.endsWith(".md")).map(name => path.join(root, name)),
  ...["docs", "skills", "examples"].flatMap(name => markdown(path.join(root, name))),
];
const errors = [];
let links = 0, examples = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8"), label = path.relative(root, file);
  // Code fences are not Markdown links. Historical prose is checked, evidence JSON is immutable.
  const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
  for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const reference = match[1].replace(/^<|>$/g, "").split(/\s+"/)[0];
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(reference)) continue;
    const target = decodeURIComponent(reference.split("#")[0]);
    links++;
    if (!fs.existsSync(path.resolve(path.dirname(file), target))) errors.push(`${label}: missing ${target}`);
  }
  for (const match of source.matchAll(/<!-- runnable-example: ([^\n]+) -->\n```js\n([\s\S]*?)\n```/g)) {
    examples++;
    const target = path.resolve(root, match[1]), snippet = match[2].trim();
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) {
      errors.push(`${label}: missing example ${match[1]}`);
      continue;
    }
    if (snippet !== fs.readFileSync(target, "utf8").trim()) errors.push(`${label}: stale example ${match[1]}`);
    const lines = snippet.split("\n").length;
    if (lines < 20 || lines > 30) errors.push(`${label}: example has ${lines} lines, expected 20–30`);
  }
}
for (const entry of fs.readdirSync(path.join(root, "skills"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(root, "skills", entry.name, "SKILL.md");
  if (!fs.existsSync(file)) { errors.push(`skills/${entry.name}: missing SKILL.md`); continue; }
  const source = fs.readFileSync(file, "utf8");
  if (!source.startsWith(`---\nname: ${entry.name}\ndescription: `)) errors.push(`skills/${entry.name}: invalid metadata header`);
  if (!source.includes("<!-- runnable-example:")) errors.push(`skills/${entry.name}: missing executable example`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log(`Documentation: ${files.length} Markdown files, ${links} local links, ${examples} synchronized examples valid`);
