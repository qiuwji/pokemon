import { readOnly } from "./extensions/values.js";
/** Samples distinct input positions; the application owns and persists the injected seeded source. */
export function sampleSelection(values, count, random) {
  const source = readOnly(values, 65536);
  if (
    !Array.isArray(source) ||
    source.length > 4096 ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > 256 ||
    count > source.length
  )
    throw new Error("Invalid random selection");
  const pool = source.slice(),
    result = [];
  for (let i = 0; i < count; i++) {
    const index = random.int(pool.length);
    result.push(pool[index]);
    pool[index] = pool.at(-1);
    pool.pop();
  }
  return readOnly(result, 65536);
}
