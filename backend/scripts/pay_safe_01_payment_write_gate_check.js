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

console.log("=== PAY-SAFE-01 PAYMENT WRITE GATE CHECK ===");

const rootPkg = read("package.json");
const route = read("backend/src/routes/commercialCorePaymentRoutes.js");
const reportsRoute = read("backend/src/routes/commercialCorePaymentReportsRoutes.js");
const service = read("backend/src/services/paymentBackbone.js");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const safetyBadge = read("web/src/components/PaymentReadonlySafetyBadge.jsx");
const readinessCard = read("web/src/components/PaymentReadinessReadonlyCard.jsx");
const previewCard = read("web/src/components/PaymentPreviewReadonlyCard.jsx");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, '"check:paysafe01": "node backend/scripts/pay_safe_01_payment_write_gate_check.js"', "root package exposes check:paysafe01");
must(rootPkg, '"check:pay01e": "node backend/scripts/pay_01e_payment_readonly_closure_check.js"', "root package keeps check:pay01e");
must(rootPkg, '"check:pay01d": "node backend/scripts/pay_01d_payment_preview_csv_export_check.js"', "root package keeps check:pay01d");
must(rootPkg, '"check:pay01c": "node backend/scripts/pay_01c_payment_preview_detail_filter_check.js"', "root package keeps check:pay01c");
must(rootPkg, '"check:pay01b": "node backend/scripts/pay_01b_payment_preview_readonly_check.js"', "root package keeps check:pay01b");
must(rootPkg, '"check:pay01a": "node backend/scripts/pay_01a_readonly_payment_readiness_check.js"', "root package keeps check:pay01a");
must(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
must(rootPkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"', "root package keeps lint:web");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(service, "isPaymentBackboneWriteEnabled", "payment backbone service exposes write-enabled helper");
must(service, "assertPaymentBackboneWriteEnabled", "payment backbone service exposes write assertion helper");
must(service, "PAYMENT_BACKBONE_ENABLED", "payment backbone service keeps activation gate env");
must(service, "Aktivasyon bayrağı", "payment backbone activation checklist remains present");
mustNoMigrationMarker("pay_safe_01", "no payment-safe migration marker added");

must(route, "paymentBackboneWriteGuard", "commercial core route defines payment write guard");
must(route, "paymentBackboneWrite", "commercial core route defines payment write middleware bundle");
must(route, "assertPaymentBackboneWriteEnabled", "commercial core route uses payment write assertion helper");
must(route, "PAYMENT_BACKBONE_WRITE_DISABLED", "commercial core route returns safe blocked error");
must(route, "Aktif ödeme kapalı", "commercial core route keeps safe blocked message");
must(route, "Bu ekran ödeme başlatmaz", "commercial core route keeps non-final blocked message");
for (const needle of [
  'r.post("/payment-backbone/settings/global", ...paymentBackboneWrite',
  'r.post("/payment-backbone/settings/room", ...paymentBackboneWrite',
  'r.delete("/payment-backbone/settings/room/:roomId", ...paymentBackboneWrite',
  'r.post("/payment-backbone/pilot/activate", ...paymentBackboneWrite',
  'r.post("/payment-backbone/pilot/deactivate", ...paymentBackboneWrite',
  'r.post("/payment-backbone/required/activate", ...paymentBackboneWrite',
  'r.post("/payment-backbone/required/deactivate", ...paymentBackboneWrite',
  'r.post("/payment-backbone/accounts/upsert", ...paymentBackboneWrite',
  'r.post("/payment-backbone/settlement/entries/plan", ...paymentBackboneWrite',
  'r.post("/payment-backbone/settlement/entries/ready", ...paymentBackboneWrite',
  'r.post("/payment-backbone/settlement/entries/execute", ...paymentBackboneWrite',
  'r.post("/payment-backbone/settlement/entries/cancel", ...paymentBackboneWrite',
  'r.post("/payment-backbone/reconciliation/records/upsert", ...paymentBackboneWrite',
]) {
  must(route, needle, `commercial core route gates write endpoint: ${needle}`);
}

for (const needle of [
  'r.get("/payment-backbone/status"',
  'r.get("/payment-backbone/settings"',
  'r.get("/payment-backbone/pilot/status"',
  'r.get("/payment-backbone/pilot/candidates"',
  'r.get("/payment-backbone/required/status"',
  'r.get("/payment-backbone/required/candidates"',
  'r.get("/payment-backbone/accounts/status"',
  'r.get("/payment-backbone/accounts/candidates"',
  'r.get("/payment-backbone/settlement/status"',
  'r.get("/payment-backbone/settlement/queue"',
]) {
  must(route, needle, `commercial core route keeps readonly endpoint: ${needle}`);
}

for (const needle of [
  "/payment-backbone/sources",
  "/payment-backbone/sources/export.csv",
  "/payment-backbone/settlement/ledger/export.csv",
  "/payment-backbone/readiness/preview",
  "/payment-backbone/readiness/preview.csv",
]) {
  mustNot(route, needle, `commercial core route keeps report endpoint out of write owner: ${needle}`);
  must(reportsRoute, needle, `commercial core payment reports route keeps report endpoint: ${needle}`);
}

for (const needle of [
  "paymentBackboneWriteGuard",
  "paymentBackboneWrite",
  "assertPaymentBackboneWriteEnabled",
  'r.post("/payment-backbone/settings/global"',
  'r.post("/payment-backbone/settings/room"',
  'r.delete("/payment-backbone/settings/room/:roomId"',
  'r.post("/payment-backbone/pilot/activate"',
  'r.post("/payment-backbone/pilot/deactivate"',
  'r.post("/payment-backbone/required/activate"',
  'r.post("/payment-backbone/required/deactivate"',
  'r.post("/payment-backbone/accounts/upsert"',
  'r.post("/payment-backbone/settlement/entries/plan"',
  'r.post("/payment-backbone/settlement/entries/ready"',
  'r.post("/payment-backbone/settlement/entries/execute"',
  'r.post("/payment-backbone/settlement/entries/cancel"',
  'r.post("/payment-backbone/reconciliation/records/upsert"',
]) {
  mustNot(reportsRoute, needle, `commercial core payment reports route keeps write owner code out: ${needle}`);
}

must(panel, "paymentBackboneWriteEnabled", "commercial core panel derives payment write gate");
must(panel, "paymentBackboneSafeMode", "commercial core panel derives safe mode state");
must(panel, "Aktif ödeme kapalı · Hakediş sadece önizleme modunda · Bu ekran ödeme başlatmaz · Canlı ödeme daha sonra açılacak", "commercial core panel shows safe mode notice");
must(panel, "Canlı ödeme kapalı", "commercial core panel shows closed-live-pay section");
must(panel, "paymentBackboneWriteEnabled ? (", "commercial core panel hides write console behind safe gate");
must(panel, "PaymentReadonlySafetyBadge", "commercial core panel keeps readonly safety badge");
must(panel, "PaymentReadinessReadonlyCard", "commercial core panel keeps readiness card");
must(panel, "PaymentPreviewReadonlyCard", "commercial core panel keeps preview card");
must(panel, "OperationProofReadonlyBadge", "commercial core panel keeps proof badge");

must(safetyBadge, "Aktif ödeme kapalı", "safety badge keeps active-payment closed wording");
must(safetyBadge, "Ödeme başlatılmaz", "safety badge keeps non-final wording");
must(safetyBadge, "Canlı ödeme daha sonra açılacak", "safety badge keeps future live-payment wording");
must(safetyBadge, "Hakediş güvenli modda", "safety badge keeps safe mode title");

must(readinessCard, "Bu kart readonly kontrol içindir; işlem başlatmaz.", "readiness card remains readonly");
must(previewCard, "Ödeme başlatılmaz", "preview card remains non-final");
must(previewCard, "CSV taslağı indir", "preview card keeps csv draft export");
must(previewCard, "Detayı gör", "preview card keeps detail view");
mustNot(previewCard, "ödemeyi başlat", "preview card avoids start-payment wording");

must(schema, "model CommercialSource", "schema still includes commercial source model");
must(schema, "model SettlementEntry", "schema still includes settlement entry model");

console.log("PASS PAY-SAFE-01 payment write gate check");
