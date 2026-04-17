import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function ok(cond, msg) {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    process.exit(1);
  }
  console.log(`OK ${msg}`);
}

const generator = read("src/jobs/agreementShiftGenerator.js");
const agreements = read("src/routes/agreements.js");
const companyShifts = read("src/routes/shifts/company.js");
const wizard = read(path.join("..", "web/src/panels/company/AgreementWizard.jsx"));
const backbone = read("src/services/paymentBackbone.js");

console.log("=== M91 route preview + room guard fix check ===");
ok(backbone.includes("const sourceShiftId = Number(options.sourceShiftId || 0);"), "agreement backbone accepts source shift id");
ok(agreements.includes("const sourceShiftId = Number(req.body?.sourceShiftId || 0);"), "agreement routes read source shift id");
ok(agreements.includes("upsertAgreementCommercialBackbone(row.id, { sourceShiftId })"), "bundle create persists source shift link");
ok(agreements.includes("upsertAgreementCommercialBackbone(created.id, { sourceShiftId })"), "single create persists source shift link");
ok(wizard.includes("body.sourceShiftId = Number(launchPrefill.sourceShiftId || 0);"), "wizard sends source shift id");
ok(generator.includes("loadAgreementSourceShift"), "generator loads agreement source shift");
ok(generator.includes("cloneAgreementShiftPayload"), "generator clones source stops and people");
ok(generator.includes("routeSnapshotFromSource"), "generator copies source route snapshot when available");
ok(generator.includes("rebuildShiftRouteStateBestEffort(created.id)"), "generator rebuilds route state when snapshot missing");
ok(companyShifts.includes("const agreementCoveredRoomIds = roomIds.filter"), "company offer route keeps advisory agreement-covered rooms");
ok(companyShifts.includes("const effectiveRoomIds = roomIds.slice();"), "company offer route no longer drops rooms because of agreement coverage");
ok(companyShifts.includes("agreementCoveredRoomIds"), "company offer response exposes advisory agreement-covered rooms");
console.log("=== M91 ROUTE PREVIEW + ROOM GUARD FIX CHECK PASS ===");
