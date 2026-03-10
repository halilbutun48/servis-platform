// backend/scripts/m12check.js
// M12: StartPack + Pack tool dosyaları var mı? (file-system gate)

import fs from "fs";
import path from "path";

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const repoRoot = path.resolve(process.cwd(), ".."); // backend/ içinden çalışır

const required = [
  "docs/PROJECT_SPEC_V1.md",
  "docs/API_SPEC_V1.md",
  "docs/DB_SCHEMA_V1.md",
  "docs/UI_SPEC_V1.md",
  "docs/STARTPACK_V1.md",
  "tools/pack.ps1",
];

console.log("M12 check — required files");
for (const rel of required) {
  const abs = path.join(repoRoot, rel);
  assert(exists(abs), `Missing: ${rel}`);
  console.log("OK", rel);
}

console.log("OK M12 OK");

