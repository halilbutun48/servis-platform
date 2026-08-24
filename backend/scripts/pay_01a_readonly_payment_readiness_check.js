import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function must(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustNoMigrationMarker(marker, label) {
  const dir = path.join(repoRoot, "backend/prisma/migrations");
  if (!fs.existsSync(dir)) {
    console.log(`OK ${label}`);
    return;
  }
  const folders = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (folders.some((name) => normalize(name).includes(normalize(marker)))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

console.log("=== PAY-01A READONLY PAYMENT READINESS CHECK ===");

const rootPkg = read("package.json");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const card = read("web/src/components/PaymentReadinessReadonlyCard.jsx");
const route = read("backend/src/routes/commercialCorePaymentRoutes.js");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, '"check:pay01a": "node backend/scripts/pay_01a_readonly_payment_readiness_check.js"', "root package exposes check:pay01a");
must(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
must(rootPkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"', "root package keeps lint:web");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(panel, "PaymentReadinessReadonlyCard", "commercial core panel imports payment readiness card");
must(panel, "paymentBackbone={paymentBackbone}", "commercial core panel passes payment backbone prop");
must(panel, "settings={settings}", "commercial core panel passes settings prop");
must(panel, "activeRule={activeRule}", "commercial core panel passes active rule prop");
must(panel, "settlementStatus={settlementStatus}", "commercial core panel passes settlement status prop");
must(panel, "cards={cards}", "commercial core panel passes payment cards prop");
must(panel, "paymentBackboneEndpointStatus={paymentBackboneEndpointStatus}", "commercial core panel passes backbone status prop");
must(panel, "settingsEndpointStatus={settingsEndpointStatus}", "commercial core panel passes settings status prop");
must(panel, "OperationProofReadonlyBadge", "commercial core panel keeps operation proof badge");
mustNot(panel, "settlement execute", "commercial core panel does not expose settlement execute wording");
mustNot(panel, "raw token", "commercial core panel does not expose raw token wording");
mustNot(panel, "payload", "commercial core panel does not expose payload wording");
mustNot(panel, "hash", "commercial core panel does not expose hash wording");
mustNot(panel, "debug", "commercial core panel does not expose debug wording");

must(card, "Hakediş hazırlığı", "payment readiness card title present");
must(card, "Bu kart readonly kontrol içindir; işlem başlatmaz.", "payment readiness card keeps readonly wording");
must(card, "Ödeme omurgası hazır mı?", "payment readiness card keeps backbone readiness row");
must(card, "Sözleşme / vardiya ticari özeti var mı?", "payment readiness card keeps commercial summary row");
must(card, "Komisyon kuralı tanımlı mı?", "payment readiness card keeps commission rule row");
must(card, "Ödeme hesabı bilgisi eksik mi?", "payment readiness card keeps payment account row");
must(card, "Hazırlık", "payment readiness card keeps readiness wording");
must(card, "Eksik bilgi", "payment readiness card keeps missing-info wording");
must(card, "Kontrol gerekli", "payment readiness card keeps control-needed wording");
must(card, "Hazır değil:", "payment readiness card keeps readiness reason wording");
mustNot(card, "raw", "payment readiness card does not expose raw wording");
mustNot(card, "payload", "payment readiness card does not expose payload wording");
mustNot(card, "token", "payment readiness card does not expose token wording");
mustNot(card, "hash", "payment readiness card does not expose hash wording");
mustNot(card, "debug", "payment readiness card does not expose debug wording");
mustNot(card, "settlement execute", "payment readiness card does not expose settlement execute wording");

must(route, '"/payment-backbone/status"', "commercial core route keeps payment backbone status");
must(route, '"/payment-backbone/settings"', "commercial core route keeps payment backbone settings");
must(route, '"/payment-backbone/settlement/entries/execute"', "commercial core route keeps settlement execute endpoint");
must(route, '"/payment-backbone/accounts/upsert"', "commercial core route keeps payment account upsert endpoint");
must(route, '"/payment-backbone/reconciliation/records/upsert"', "commercial core route keeps reconciliation upsert endpoint");
must(route, "executeSettlementEntries", "commercial core route keeps settlement execute behavior");
must(route, "upsertPaymentAccountMetadata", "commercial core route keeps payment account behavior");
must(route, "upsertGlobalCommissionRule", "commercial core route keeps commission behavior");
mustNot(route, "pay01a", "commercial core route does not add pay01a route marker");

must(schema, "model PaymentAccount", "schema keeps payment account model");
must(schema, "model CommissionRule", "schema keeps commission rule model");
must(schema, "model SettlementPlan", "schema keeps settlement plan model");
must(schema, "model SettlementEntry", "schema keeps settlement entry model");
mustNot(schema, "model PaymentReadiness", "schema does not add payment readiness model");
mustNot(schema, "model ReadonlyPaymentReadiness", "schema does not add readonly payment readiness model");
mustNot(schema, "model HakedişHazırlık", "schema does not add hakediş preparation model");
mustNoMigrationMarker("pay01a", "no pay-01a migration folder detected");

console.log("=== PAY-01A READONLY PAYMENT READINESS CHECK PASS ===");
