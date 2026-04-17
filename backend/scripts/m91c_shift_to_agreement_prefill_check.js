import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function ok(label) {
  console.log(`OK ${label}`);
}

function assertIncludes(rel, needle, label) {
  const text = read(rel);
  if (!text.includes(needle)) throw new Error(`ASSERT_FAIL: ${label}`);
  ok(label);
}

console.log("=== M91C shift to agreement prefill check ===");
assertIncludes("web/src/utils/agreementPrefill.js", "buildAgreementPrefillFromShift", "agreement prefill util");
assertIncludes("web/src/utils/agreementPrefill.js", "stashAgreementPrefill", "agreement prefill stash");
assertIncludes("web/src/panels/company/AgreementWizard.jsx", "launchPrefill", "wizard launchPrefill prop");
assertIncludes("web/src/panels/company/AgreementWizard.jsx", "autoOpenNonce", "wizard autoOpenNonce prop");
assertIncludes("web/src/panels/company/AgreementWizard.jsx", "guessPackKey", "wizard prefill pack resolver");
assertIncludes("web/src/panels/company/ShiftsPanel.jsx", "convertShiftToAgreement", "shifts convert handler");
assertIncludes("web/src/panels/company/ShiftsPanel.jsx", "stashAgreementPrefill", "shifts stash prefill usage");
assertIncludes("web/src/panels/company/companyShiftsPanelRows.jsx", "Sözleşmeye Dönüştür", "row convert button");
assertIncludes("web/src/panels/company/companyShiftsPanelSections.jsx", "onConvertShiftToAgreement", "sections pass convert handler");
assertIncludes("web/src/panels/company/CompanyShiftsPanelTrackView.jsx", "onConvertShiftToAgreement", "track view pass convert handler");
console.log("=== M91C CHECK PASS ===");
