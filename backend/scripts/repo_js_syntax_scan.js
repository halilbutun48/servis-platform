import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const includeRoots = [
  path.join(repoRoot, "backend", "scripts"),
  path.join(repoRoot, "backend", "src"),
];
const exts = new Set([".js", ".mjs", ".cjs"]);
const skipParts = new Set(["node_modules", "artifacts", "_archive", "_backup"]);

const files = [];
for (const root of includeRoots) walk(root);

let failures = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failures += 1;
    console.error(`FAIL syntax ${path.relative(repoRoot, file).replace(/\\/g, "/")}`);
    if (result.stderr) {
      const lines = result.stderr.trim().split(/\r?\n/);
      console.error(lines.slice(0, 8).join("\n"));
    }
  }
}

if (failures) {
  console.error(`Syntax scan failed: ${failures} file(s)`);
  process.exit(1);
}

console.log(`OK syntax scan (${files.length} files)`);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipParts.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs);
      continue;
    }
    if (exts.has(path.extname(entry.name).toLowerCase())) {
      files.push(abs);
    }
  }
}
