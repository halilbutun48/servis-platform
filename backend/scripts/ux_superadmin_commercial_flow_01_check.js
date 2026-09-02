import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

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

function normalizeText(value) {
  return String(value || "")
    .replace(/[İI]/g, "i")
    .replace(/ı/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[—–]/g, "-")
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includes(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}

function mustInclude(text, needle, label) {
  if (includes(text, needle)) ok(label);
  else fail(label);
}

function mustNotInclude(text, needle, label) {
  if (includes(text, needle)) fail(label);
  else ok(label);
}

function mustOrder(text, needles, label) {
  const haystack = normalizeText(text);
  let lastIndex = -1;
  for (const needle of needles) {
    const target = normalizeText(needle);
    const index = haystack.indexOf(target, lastIndex + 1);
    if (index === -1) {
      fail(`${label}: missing ${needle}`);
      return;
    }
    if (index < lastIndex) {
      fail(`${label}: wrong order at ${needle}`);
      return;
    }
    lastIndex = index;
  }
  ok(label);
}

const pkg = read("package.json");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");

mustInclude(pkg, '"check:uxsuperadmincommercialflow01": "node backend/scripts/ux_superadmin_commercial_flow_01_check.js"', "package.json exposes check:uxsuperadmincommercialflow01");
mustInclude(panel, "FlowSummaryStrip", "commercial panel keeps summary strip");
mustInclude(panel, "PaymentReadonlySafetyBadge", "commercial panel keeps readonly safety badge");
mustInclude(panel, "PanelSegmentTabs", "commercial panel keeps functional tabs");
mustInclude(panel, "function MetricTile", "commercial panel defines metric tile helper");
mustInclude(panel, 'ariaLabel="Ticari akış bölümleri"', "commercial panel labels tab region");
mustInclude(panel, 'viewTab === "summary"', "summary tab conditional render");
mustInclude(panel, 'viewTab === "billing"', "billing tab conditional render");
mustInclude(panel, 'viewTab === "prep"', "prep tab conditional render");
mustInclude(panel, 'viewTab === "commission"', "commission tab conditional render");
mustInclude(panel, 'viewTab === "proof"', "proof tab conditional render");
mustInclude(panel, 'viewTab === "risk"', "risk tab conditional render");
mustInclude(panel, 'viewTab === "history"', "history tab conditional render");
mustInclude(panel, "Ticari Akış Özeti", "commercial summary title preserved");
mustInclude(panel, "Bu ekran ödeme başlatmaz", "readonly payment boundary preserved");
mustInclude(panel, "Aktif ödeme kapalı", "safe payment notice preserved");
mustInclude(panel, "Hakediş sadece önizleme modunda", "preview-only boundary preserved");
mustInclude(panel, "PaymentReadinessReadonlyCard", "billing readiness card preserved");
mustInclude(panel, "PaymentPreviewReadonlyCard", "proof preview card preserved");
mustInclude(panel, "OperationProofReadonlyBadge", "proof badge preserved");
mustInclude(panel, "Ödeme listesi ve dışa aktarım", "billing export section preserved");
mustInclude(panel, "Ödeme hazırlık omurgası durumu", "prep payment backbone section preserved");
mustInclude(panel, "Aktivasyon checklist", "prep activation checklist preserved");
mustInclude(panel, "Mutabakat hazırlığı", "prep settlement readiness preserved");
mustInclude(panel, "Aktif komisyon kuralı", "commission section preserved");
mustInclude(panel, "Kaynak sayaçları", "commission source counters preserved");
mustInclude(panel, "Gelecek faz", "history future phase kept collapsed");
mustNotInclude(panel, "EXECUTED yap", "commercial panel must not expose settlement execute action");
mustNotInclude(panel, "markSettlementExecuted", "commercial panel must not wire settlement execute action");
mustOrder(panel, [
  "PaymentReadonlySafetyBadge",
  "PaymentReadinessReadonlyCard",
  "PaymentPreviewReadonlyCard",
  "OperationProofReadonlyBadge",
], "readonly payment preview order preserved");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK ux_superadmin_commercial_flow_01_check passed");
