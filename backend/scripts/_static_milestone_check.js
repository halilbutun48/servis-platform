import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "..", "..");

export function banner(title) {
  console.log(`
=== ${title} ===`);
}

export function must(label, ok) {
  if (!ok) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

export function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

export function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

export function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}
