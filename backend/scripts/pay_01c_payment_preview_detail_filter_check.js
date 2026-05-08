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

console.log("=== PAY-01C PAYMENT PREVIEW DETAIL & FILTER CHECK ===");

const rootPkg = read("package.json");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const previewCard = read("web/src/components/PaymentPreviewReadonlyCard.jsx");
const readinessCard = read("web/src/components/PaymentReadinessReadonlyCard.jsx");
const api = read("web/src/api.js");
const route = read("backend/src/routes/commercialCore.js");
const schema = read("backend/prisma/schema.prisma");
const paymentBackbone = read("backend/src/services/paymentBackbone.js");
const paymentBackboneAccounts = read("backend/src/services/paymentBackboneAccounts.js");
const reconciliation = read("backend/src/ops/settlementReconciliationDesk.js");
const readme = read("README.md");

must(rootPkg, '"check:pay01c": "node backend/scripts/pay_01c_payment_preview_detail_filter_check.js"', "root package exposes check:pay01c");
must(rootPkg, '"check:pay01b": "node backend/scripts/pay_01b_payment_preview_readonly_check.js"', "root package keeps check:pay01b");
must(rootPkg, '"check:pay01a": "node backend/scripts/pay_01a_readonly_payment_readiness_check.js"', "root package keeps check:pay01a");
must(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
must(rootPkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"', "root package keeps lint:web");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(panel, "PaymentPreviewReadonlyCard", "commercial core panel imports payment preview card");
must(panel, "<PaymentPreviewReadonlyCard />", "commercial core panel renders payment preview card");
must(panel, "PaymentReadinessReadonlyCard", "commercial core panel keeps payment readiness card");
must(panel, "OperationProofReadonlyBadge", "commercial core panel keeps operation proof badge");

must(previewCard, "Hakediş önizlemesi", "payment preview card title present");
must(previewCard, "Taslak", "payment preview card keeps taslak wording");
must(previewCard, "Ödeme başlatılmaz", "payment preview card keeps non-final wording");
must(previewCard, "Filtrele", "payment preview card keeps filter label");
must(previewCard, "Tümü", "payment preview card keeps all filter");
must(previewCard, "Hazır görünen", "payment preview card keeps ready filter");
must(previewCard, "Eksik bilgi", "payment preview card keeps missing-info filter");
must(previewCard, "Kontrol gerekli", "payment preview card keeps control-needed filter");
must(previewCard, "Detayı gör", "payment preview card keeps detail action");
must(previewCard, "Seçili kayıt detayı", "payment preview card keeps readonly detail area");
must(previewCard, "Hakediş önizlemesi yükleniyor...", "payment preview card keeps loading wording");
must(previewCard, "Hakediş önizlemesi için görünür kayıt yok.", "payment preview card keeps empty wording");
must(previewCard, "Durum", "payment preview card keeps detail status label");
must(previewCard, "Neden hazır / neden eksik / neden kontrol gerekli", "payment preview card keeps detail reason label");
must(previewCard, "İlgili sözleşme veya vardiya özeti", "payment preview card keeps contract/shift summary label");
must(previewCard, "Komisyon durumu", "payment preview card keeps commission detail label");
must(previewCard, "Ödeme hesabı durumu", "payment preview card keeps account detail label");
must(previewCard, "Kontrol notu", "payment preview card keeps control note label");
mustNot(previewCard, "raw", "payment preview card does not expose raw wording");
mustNot(previewCard, "payload", "payment preview card does not expose payload wording");
mustNot(previewCard, "hash", "payment preview card does not expose hash wording");
mustNot(previewCard, "debug", "payment preview card does not expose debug wording");
mustNot(previewCard, "settlement execute", "payment preview card does not expose settlement execute wording");
mustNot(previewCard, "ödemeyi başlat", "payment preview card does not expose start-payment wording");
mustNot(previewCard, "çalıştır", "payment preview card does not expose execute wording");

must(api, "getPaymentBackboneReadinessPreview", "api exposes payment backbone preview helper");
must(api, "normalizePaymentPreviewError", "api exposes payment preview error helper");
must(api, "normalizePaymentPreviewErrorMessage", "api exposes payment preview error message helper");

must(route, 'r.get("/payment-backbone/readiness/preview", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {', "commercial core route mounts readonly payment preview GET endpoint");
mustNot(route, 'r.post("/payment-backbone/readiness/preview"', "commercial core route does not add payment preview POST endpoint");
mustNot(route, 'r.put("/payment-backbone/readiness/preview"', "commercial core route does not add payment preview PUT endpoint");
mustNot(route, 'r.patch("/payment-backbone/readiness/preview"', "commercial core route does not add payment preview PATCH endpoint");
mustNot(route, 'r.delete("/payment-backbone/readiness/preview"', "commercial core route does not add payment preview DELETE endpoint");

must(schema, "model PaymentAccount", "schema keeps payment account model");
must(schema, "model CommissionRule", "schema keeps commission rule model");
must(schema, "model SettlementPlan", "schema keeps settlement plan model");
must(schema, "model SettlementEntry", "schema keeps settlement entry model");
mustNot(schema, "model PaymentPreview", "schema does not add payment preview model");
mustNot(schema, "model PaymentBackbonePreview", "schema does not add payment backbone preview model");
mustNoMigrationMarker("pay01c", "no pay-01c migration folder detected");

must(paymentBackbone, "M82.9", "payment backbone keeps M82.9 marker");
must(paymentBackbone, "M85", "payment backbone keeps M85 marker");
must(paymentBackbone, "M86", "payment backbone keeps M86 marker");
must(paymentBackboneAccounts, "M87", "payment backbone accounts keep M87 marker");
must(paymentBackboneAccounts, "M88", "payment backbone accounts keep M88 marker");
must(reconciliation, "M89", "settlement reconciliation keeps M89 marker");
must(readme, "M82.10", "readme keeps M82.10 marker");
must(readme, "M82.11", "readme keeps M82.11 marker");
must(readme, "M85", "readme keeps M85 marker");
must(readme, "M86", "readme keeps M86 marker");
must(readme, "M87", "readme keeps M87 marker");
must(readme, "M88", "readme keeps M88 marker");
must(readme, "M89", "readme keeps M89 marker");

must(readinessCard, "Hakediş hazırlığı", "readiness card remains present");
must(readinessCard, "Bu kart readonly kontrol içindir; işlem başlatmaz.", "readiness card remains readonly");
must(readinessCard, "Ödeme omurgası hazır mı?", "readiness card keeps backbone readiness wording");
must(readinessCard, "Sözleşme / vardiya ticari özeti var mı?", "readiness card keeps commercial summary wording");
must(readinessCard, "Komisyon kuralı tanımlı mı?", "readiness card keeps commission rule wording");
must(readinessCard, "Ödeme hesabı bilgisi eksik mi?", "readiness card keeps payment account wording");

console.log("=== PAY-01C PAYMENT PREVIEW DETAIL & FILTER CHECK PASS ===");
