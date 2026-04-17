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

console.log("=== M91 company agreement from shift only check ===");

assertIncludes(
  "web/src/panels/company/AgreementsPanel.jsx",
  "Sözleşme yalnız vardiyadan oluşturulur",
  "company agreements info card"
);

assertIncludes(
  "web/src/panels/company/AgreementsPanel.jsx",
  "Sözleşme oluşturmak için önce vardiya oluşturun",
  "company agreements direct create removed"
);

assertIncludes(
  "web/src/panels/company/AgreementWizard.jsx",
  "sourceShiftId",
  "wizard checks source shift id"
);

assertIncludes(
  "web/src/panels/company/AgreementWizard.jsx",
  "Sözleşme sadece vardiyadan oluşturulabilir.",
  "wizard blocks non-shift create"
);

console.log("=== M91 COMPANY AGREEMENT FROM SHIFT ONLY CHECK PASS ===");
