import { assertPackContent } from "../dist/packs/emerald/content.js";
import { validateContentReferences } from "../dist/engine/content-references.js";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const content = assertPackContent(JSON.parse(input));
const errors = validateContentReferences(content);
if (errors.length) throw new Error(errors.join("\n"));
