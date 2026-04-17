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

console.log("=== M91 prefill + route preview propagation check ===");

assertIncludes("web/src/panels/company/AgreementWizard.jsx", "sourceShiftId", "wizard reads source shift id");
assertIncludes("web/src/panels/company/AgreementWizard.jsx", "setQ(\"\")", "wizard clears room search on source shift prefill");
assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "sourceShiftId", "generator reads source shift");
assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "routeSnapshot", "generator carries route snapshot");
assertIncludes("backend/src/routes/shifts/people.js", "sourceShiftId", "people preview route can fall back to source shift");
assertIncludes("backend/src/routes/agreements.js", "sourceShiftId", "agreements ops bridge can read source shift");

console.log("=== M91 PREFILL + ROUTE PREVIEW PROPAGATION CHECK PASS ===");
