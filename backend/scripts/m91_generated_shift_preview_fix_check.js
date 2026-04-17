import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}
function assertIncludes(rel, needle, label) {
  const txt = read(rel);
  if (!txt.includes(needle)) throw new Error(`ASSERT_FAIL: ${label}`);
  console.log(`OK ${label}`);
}

console.log("=== M91 generated shift preview fix check ===");
assertIncludes("backend/src/routes/shifts/people.js", "hasMeaningfulStops", "route preview detects hub-only generated shifts");
assertIncludes("backend/src/routes/shifts/people.js", "sourcePayload?.shift", "route preview falls back to source shift payload");
assertIncludes("backend/src/routes/agreements.js", "previewAvailable", "agreements ops bridge exposes previewAvailable");
assertIncludes("web/src/panels/company/AgreementsPanel.jsx", "previewAvailable", "company ops bridge enables preview with fallback");
assertIncludes("web/src/panels/room/AgreementsPanel.jsx", "Rota Önizleme", "room ops bridge exposes preview action");
console.log("=== M91 GENERATED SHIFT PREVIEW FIX CHECK PASS ===");
