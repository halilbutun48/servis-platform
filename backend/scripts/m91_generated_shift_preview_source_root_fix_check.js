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

console.log("=== M91 generated shift preview source-root fix check ===");
assertIncludes("backend/src/services/agreementSourceShift.js", "resolveAgreementSourceShiftPayload", "agreement source shift helper exists");
assertIncludes("backend/src/services/agreementSourceShift.js", "inferAgreementSourceShiftId", "agreement source shift inference exists");
assertIncludes("backend/src/services/paymentBackbone.js", "payload.shiftRootId ?? existing?.shiftRootId ?? null", "commercial backbone preserves source shift root");
assertIncludes("backend/src/services/paymentBackbone.js", "resolveAgreementSourceShiftId", "agreement backbone can recover source shift root");
assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "resolveAgreementSourceShiftPayload", "generator uses shared agreement source shift helper");
assertIncludes("backend/src/routes/shifts/people.js", "resolveAgreementSourceShiftPayload", "route preview uses shared agreement source shift helper");
console.log("=== M91 GENERATED SHIFT PREVIEW SOURCE-ROOT FIX CHECK PASS ===");
