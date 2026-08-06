import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "../../..");

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

export function readBytes(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath));
}

export function fileSha256(relPath) {
  return crypto.createHash("sha256").update(readBytes(relPath)).digest("hex").toUpperCase();
}

export function normalizedTextSha256(relPath) {
  const bytes = readBytes(relPath);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

  must(text.charCodeAt(0) !== 0xFEFF, `${relPath}: BOM not allowed`);
  must(!/\r(?!\n)/.test(text), `${relPath}: bare CR not allowed`);

  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

export function mustFileSha256(relPath, expectedHash, label) {
  const wanted = String(expectedHash || "").toUpperCase();
  must(fileSha256(relPath) === wanted, label);
}

export function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const wanted = String(expectedHash || "").toUpperCase();
  must(normalizedTextSha256(relPath) === wanted, label);
}

export function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(repoRoot, relPath);
  const stat = fs.lstatSync(absPath);
  must(stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs
    .readdirSync(absPath, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  must(entries.length === 1 && entries[0] === "migration.sql", `${label} has exactly one migration.sql`);
}
