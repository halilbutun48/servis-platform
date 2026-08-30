import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCanonicalPrismaSchemaSource } from "./lib/prismaSchemaSource.js";

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

console.log("=== PAY-01E PAYMENT READONLY CLOSURE CHECK ===");

const rootPkg = read("package.json");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const safetyBadge = read("web/src/components/PaymentReadonlySafetyBadge.jsx");
const readinessCard = read("web/src/components/PaymentReadinessReadonlyCard.jsx");
const previewCard = read("web/src/components/PaymentPreviewReadonlyCard.jsx");
const route = read("backend/src/routes/commercialCorePaymentReportsRoutes.js");
const schema = readCanonicalPrismaSchemaSource(repoRoot);

must(rootPkg, '"check:pay01e": "node backend/scripts/pay_01e_payment_readonly_closure_check.js"', "root package exposes check:pay01e");
must(rootPkg, '"check:pay01d": "node backend/scripts/pay_01d_payment_preview_csv_export_check.js"', "root package keeps check:pay01d");
must(rootPkg, '"check:pay01c": "node backend/scripts/pay_01c_payment_preview_detail_filter_check.js"', "root package keeps check:pay01c");
must(rootPkg, '"check:pay01b": "node backend/scripts/pay_01b_payment_preview_readonly_check.js"', "root package keeps check:pay01b");
must(rootPkg, '"check:pay01a": "node backend/scripts/pay_01a_readonly_payment_readiness_check.js"', "root package keeps check:pay01a");
must(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
must(rootPkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"', "root package keeps lint:web");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(panel, "PaymentReadonlySafetyBadge", "commercial core panel imports readonly safety badge");
must(panel, "<PaymentReadonlySafetyBadge />", "commercial core panel renders readonly safety badge");
must(panel, "PaymentReadinessReadonlyCard", "commercial core panel keeps payment readiness card");
must(panel, "PaymentPreviewReadonlyCard", "commercial core panel keeps payment preview card");
must(panel, "OperationProofReadonlyBadge", "commercial core panel keeps operation proof badge");

must(safetyBadge, "Hakediş güvenli modda", "safety badge title present");
must(safetyBadge, "Sadece hazırlık, önizleme ve CSV taslağı", "safety badge keeps readonly scope wording");
must(safetyBadge, "Ödeme başlatılmaz", "safety badge keeps non-final wording");
must(safetyBadge, "Son kontrol: aktif ödeme kapalı", "safety badge keeps active-payment closed wording");
must(safetyBadge, "Hazırlık", "safety badge keeps preparation chip");
must(safetyBadge, "Önizleme", "safety badge keeps preview chip");
must(safetyBadge, "CSV taslağı", "safety badge keeps csv draft chip");
mustNot(safetyBadge, "execute", "safety badge does not expose execute wording");
mustNot(safetyBadge, "settlement execute", "safety badge does not expose settlement execute wording");
mustNot(safetyBadge, "raw", "safety badge does not expose raw wording");
mustNot(safetyBadge, "payload", "safety badge does not expose payload wording");
mustNot(safetyBadge, "token", "safety badge does not expose token wording");
mustNot(safetyBadge, "hash", "safety badge does not expose hash wording");
mustNot(safetyBadge, "debug", "safety badge does not expose debug wording");
mustNot(safetyBadge, "ödemeyi başlat", "safety badge does not expose start-payment wording");
mustNot(safetyBadge, "çalıştır", "safety badge does not expose execute wording");

must(readinessCard, "Hakediş hazırlığı", "readiness card remains present");
must(readinessCard, "Bu kart salt okunur kontrol içindir; işlem başlatmaz.", "readiness card remains readonly");
must(readinessCard, "Ödeme omurgası hazır mı?", "readiness card keeps backbone readiness wording");
must(readinessCard, "Sözleşme / vardiya ticari özeti var mı?", "readiness card keeps commercial summary wording");
must(readinessCard, "Komisyon kuralı tanımlı mı?", "readiness card keeps commission rule wording");
must(readinessCard, "Ödeme hesabı bilgisi eksik mi?", "readiness card keeps payment account wording");

must(previewCard, "Hakediş önizlemesi", "payment preview card remains present");
must(previewCard, "CSV taslağı indir", "payment preview card keeps csv download wording");
must(previewCard, "Ödeme başlatılmaz", "payment preview card keeps non-final wording");
must(previewCard, "Filtrele", "payment preview card keeps filter wording");
must(previewCard, "Detayı gör", "payment preview card keeps detail action");
mustNot(previewCard, "settlement execute", "payment preview card does not expose settlement execute wording");
mustNot(previewCard, "raw", "payment preview card does not expose raw wording");
mustNot(previewCard, "payload", "payment preview card does not expose payload wording");
mustNot(previewCard, "hash", "payment preview card does not expose hash wording");
mustNot(previewCard, "debug", "payment preview card does not expose debug wording");
mustNot(previewCard, "ödemeyi başlat", "payment preview card does not expose start-payment wording");

must(route, 'r.get("/payment-backbone/readiness/preview", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {', "commercial core payment route keeps readonly payment preview GET endpoint");
must(route, 'r.get("/payment-backbone/readiness/preview.csv", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {', "commercial core payment route keeps readonly payment preview CSV GET endpoint");
mustNot(route, 'r.post("/payment-backbone/readiness/preview.csv"', "commercial core payment route does not add payment preview CSV POST endpoint");
mustNot(route, 'r.put("/payment-backbone/readiness/preview.csv"', "commercial core payment route does not add payment preview CSV PUT endpoint");
mustNot(route, 'r.patch("/payment-backbone/readiness/preview.csv"', "commercial core payment route does not add payment preview CSV PATCH endpoint");
mustNot(route, 'r.delete("/payment-backbone/readiness/preview.csv"', "commercial core payment route does not add payment preview CSV DELETE endpoint");

must(schema, "model PaymentAccount", "schema keeps payment account model");
must(schema, "model CommissionRule", "schema keeps commission rule model");
must(schema, "model SettlementPlan", "schema keeps settlement plan model");
must(schema, "model SettlementEntry", "schema keeps settlement entry model");
mustNot(schema, "model PaymentSafety", "schema does not add payment safety model");
mustNot(schema, "model PaymentReadonlySafety", "schema does not add payment readonly safety model");
mustNoMigrationMarker("pay01e", "no pay-01e migration folder detected");

console.log("=== PAY-01E PAYMENT READONLY CLOSURE CHECK PASS ===");
