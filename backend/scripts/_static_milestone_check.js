import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "..", "..");


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}

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

export function includesAny(text, needles) { return includesAnyText(text, needles); }
