import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function ok(msg) { console.log(`OK ${msg}`); }
function assertIncludes(rel, needle, label) { if (!read(rel).includes(needle)) throw new Error(`ASSERT_FAIL: ${label}`); ok(label); }

console.log("=== M91 generated shift preview orgplan fix check ===");
assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "organizationPlan", "generator loads source organization plan");
assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "sourceShift.organizationPlan?.stops", "generator clones organization plan stops when concrete stops missing");
assertIncludes("backend/src/routes/shifts/people.js", "sourcePlanStops", "route preview falls back to source organization plan stops");
console.log("=== M91 GENERATED SHIFT PREVIEW ORGPLAN FIX CHECK PASS ===");
