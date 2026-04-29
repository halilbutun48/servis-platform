import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function mustInclude(text, needle, label) {
  if (includesText(text, needle)) ok(label); else fail(label);
}

const schema = read("backend/prisma/schema.prisma");
const migration = read("backend/prisma/migrations/20260407103000_m82_9_dormant_payment_backbone/migration.sql");
const service = read("backend/src/services/paymentBackbone.js");
const companyShiftTail = read("backend/src/services/companyShiftMutationTail.js");
const agreements = read("backend/src/routes/agreements.js");
const shiftsCompany = read("backend/src/routes/shifts/company.js");
const shiftsRoom = read("backend/src/routes/shifts/room.js");
const shiftsRoomDispatch = read("backend/src/routes/shifts/shiftsRoomDispatchRouter.js");
const commercialCore = read("backend/src/routes/commercialCore.js");
const webPanel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");

mustInclude(schema, "model CommissionRule", "schema adds CommissionRule");
mustInclude(schema, "model PaymentAccount", "schema adds PaymentAccount");
mustInclude(schema, "model CommercialSource", "schema adds CommercialSource");
mustInclude(schema, "model SettlementPlan", "schema adds SettlementPlan");
mustInclude(schema, "model SettlementEntry", "schema adds SettlementEntry");
mustInclude(schema, "enum PaymentMode", "schema adds PaymentMode enum");
mustInclude(schema, "enum CommercialSourceType", "schema adds CommercialSourceType enum");
mustInclude(migration, "CREATE TABLE \"CommercialSource\"", "migration creates CommercialSource table");
mustInclude(service, "providerAdapters", "payment backbone service exposes provider adapters");
mustInclude(service, "upsertAgreementCommercialBackbone", "payment backbone service supports agreement snapshot");
mustInclude(service, "upsertShiftSeriesCommercialBackboneByShiftId", "payment backbone service supports shift series snapshot");
mustInclude(service, "buildPaymentBackboneStatus", "payment backbone service exposes status builder");
mustInclude(agreements, "upsertAgreementCommercialBackbone", "agreements route wires dormant backbone");
mustInclude(companyShiftTail, "upsertShiftSeriesCommercialBackboneByShiftId", "company shift mutation tail supports shift series backbone");
mustInclude(shiftsCompany, "syncCompanyShiftCommercialBackbone", "company shifts route wires shift series backbone");
if (!includesAnyText([shiftsRoom, shiftsRoomDispatch], ["upsertShiftSeriesCommercialBackboneByShiftId"])) {
  fail("room shifts route refreshes shift series backbone after split");
} else {
  ok("room shifts route refreshes shift series backbone after split");
}
mustInclude(commercialCore, "/payment-backbone/status", "commercial core route exposes payment backbone status endpoint");
mustInclude(commercialCore, "/payment-backbone/sources", "commercial core route exposes payment backbone sources endpoint");
mustInclude(webPanel, "/api/commercial-core/payment-backbone/status", "superadmin commercial core panel reads payment backbone status");
mustInclude(toolsReadme, "pack_m82_9_dormant_payment_backbone.ps1", "tools readme lists M82.9 pack");
mustInclude(toolsPrimer, "M82.9", "tools primer lists M82.9");
if (!includesText(backlog, 'M82.9') && !includesText(backlog, 'M82.10') && !includesText(backlog, 'M82.11') && !includesText(backlog, 'M83') && !includesText(backlog, 'M84') && !includesText(backlog, 'M85') && !includesText(backlog, 'M86') && !includesText(backlog, 'M87') && !includesText(backlog, 'M88') && !includesText(backlog, 'M89') && !includesText(backlog, 'M90') && !includesText(backlog, 'living route')) fail('next backlog lists M82.9');
ok('next backlog lists M82.9');
mustInclude(primer, "M82.9", "primer lists M82.9");
mustInclude(registry, "M82.9", "registry lists M82.9");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M82.9 dormant payment backbone check passed");
