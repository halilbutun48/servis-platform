import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWebEspree } from "./bootstrap_dependencies.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const espree = loadWebEspree();
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
  const source = fs.readFileSync(file, "utf8");
  const isCjs = path.extname(file).toLowerCase() === ".cjs";
  try {
    espree.parse(source, {
      ecmaVersion: "latest",
      sourceType: isCjs ? "script" : "module",
    });
  } catch (err) {
    failures += 1;
    console.error(`FAIL syntax ${path.relative(repoRoot, file).replace(/\\/g, "/")}`);
    const line = Number(err?.lineNumber || err?.line || 0);
    const column = Number(err?.column || err?.columnNumber || 0);
    const pos = line > 0 ? `:${line}${column > 0 ? `:${column}` : ""}` : "";
    const msg = String(err?.message || err);
    console.error(`${msg}${pos ? ` (${path.relative(repoRoot, file).replace(/\\/g, "/")}${pos})` : ""}`);
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
