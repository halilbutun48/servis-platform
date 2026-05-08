import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function must(condition, message) {
  if (!condition) throw new Error(message);
}

function include(text, needle, message) {
  must(text.includes(needle), message);
}

function ordered(text, needles, label) {
  let last = -1;
  for (const needle of needles) {
    const idx = text.indexOf(needle);
    must(idx >= 0, `${label}: missing marker ${needle}`);
    must(idx > last, `${label}: wrong order for ${needle}`);
    last = idx;
  }
}

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  must(start >= 0, `missing section start: ${startMarker}`);
  const end = endMarker ? text.indexOf(endMarker, start + startMarker.length) : -1;
  return text.slice(start, end >= 0 ? end : undefined);
}

function main() {
  const pkg = read("package.json");
  const commercial = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  const trust = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
  const service = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
  const flow = read("web/src/components/FlowSummaryStrip.jsx");
  const css = read("web/src/index.css");

  include(pkg, "\"check:web01a\": \"node backend/scripts/web_01a_flow_summary_polish_check.js\"", "package check:web01a missing");
  include(pkg, "\"check:pay01e\":", "package check:pay01e missing");
  include(pkg, "\"check:qlt04a\":", "package check:qlt04a missing");
  include(pkg, "\"check:web-mobile\":", "package check:web-mobile missing");
  include(pkg, "\"lint:web\":", "package lint:web missing");
  include(pkg, "\"verify:final\":", "package verify:final missing");

  include(flow, "function FlowSummaryStrip", "FlowSummaryStrip component missing");
  include(flow, "title", "FlowSummaryStrip title prop missing");
  include(flow, "description", "FlowSummaryStrip description prop missing");
  include(flow, "steps", "FlowSummaryStrip steps prop missing");
  include(flow, "statusText", "FlowSummaryStrip statusText prop missing");
  include(flow, "tone", "FlowSummaryStrip tone prop missing");
  include(flow, "flow-summary-strip", "FlowSummaryStrip marker missing");
  include(flow, "flow-summary-steps", "FlowSummaryStrip steps marker missing");
  include(flow, "flow-summary-chip", "FlowSummaryStrip chip marker missing");
  include(flow, "flow-summary-status", "FlowSummaryStrip status marker missing");
  must(!flow.includes("fetch("), "FlowSummaryStrip must not fetch data");
  must(!flow.includes("api("), "FlowSummaryStrip must not call API");

  include(commercial, "FlowSummaryStrip", "CommercialCorePanel missing FlowSummaryStrip import or usage");
  include(commercial, "Ticari akış özeti", "CommercialCorePanel flow title missing");
  include(commercial, "Bu ekran ödeme başlatmaz. Hakediş hazırlığı, önizleme ve kanıt durumunu birlikte gösterir.", "CommercialCorePanel flow description missing");
  include(commercial, "1. Hazırlık", "CommercialCorePanel step 1 missing");
  include(commercial, "2. Önizleme", "CommercialCorePanel step 2 missing");
  include(commercial, "3. CSV taslağı", "CommercialCorePanel step 3 missing");
  include(commercial, "4. Son kontrol", "CommercialCorePanel step 4 missing");
  include(commercial, "Ödeme kapalı", "CommercialCorePanel payment closed text missing");
  ordered(
    commercial,
    [
      "<PaymentReadonlySafetyBadge",
      "<PaymentReadinessReadonlyCard",
      "<PaymentPreviewReadonlyCard",
      "<OperationProofReadonlyBadge",
    ],
    "CommercialCorePanel card order",
  );

  include(trust, "FlowSummaryStrip", "TrustQualityPanel missing FlowSummaryStrip import or usage");
  include(trust, "Kalite akış özeti", "TrustQualityPanel flow title missing");
  include(trust, "Bu ekran kesin kalite puanı vermez. Kanıt, taslak skor, inceleme kararı ve denetim izini birlikte gösterir.", "TrustQualityPanel flow description missing");
  include(trust, "1. Kanıt", "TrustQualityPanel step 1 missing");
  include(trust, "2. Taslak skor", "TrustQualityPanel step 2 missing");
  include(trust, "3. İnceleme", "TrustQualityPanel step 3 missing");
  include(trust, "4. Denetim izi", "TrustQualityPanel step 4 missing");
  include(trust, "Kesin puan yok", "TrustQualityPanel status text missing");
  ordered(
    trust,
    [
      "<OperationProofReadonlyBadge",
      "<QualityDraftScoreCard",
      "<QualityReviewDecisionCard",
      "<QualityReviewHistoryCard",
    ],
    "TrustQualityPanel card order",
  );
  include(trust, "quality-summary-grid", "TrustQualityPanel quality summary grid missing");
  include(trust, "quality-detail-layout", "TrustQualityPanel quality detail layout missing");

  include(service, "FlowSummaryStrip", "ServiceEvaluationPanel missing FlowSummaryStrip import or usage");
  include(service, "Değerlendirme akışı", "ServiceEvaluationPanel flow title missing");
  include(service, "Bu alan kalite değerlendirmesine yardımcı olur; ödeme veya komisyon başlatmaz.", "ServiceEvaluationPanel flow description missing");
  include(service, "Kanıt", "ServiceEvaluationPanel step marker missing");
  include(service, "Taslak", "ServiceEvaluationPanel step marker missing");
  include(service, "İnceleme", "ServiceEvaluationPanel step marker missing");
  include(service, "Geçmiş", "ServiceEvaluationPanel step marker missing");
  include(service, "quality-summary-grid", "ServiceEvaluationPanel quality summary grid missing");
  include(service, "quality-detail-layout", "ServiceEvaluationPanel quality detail layout missing");
  ordered(
    service,
    [
      "<QualityProofReadonlyCard",
      "<QualityDraftScoreCard",
      "<QualityReviewDecisionCard",
      "<QualityReviewHistoryCard",
    ],
    "ServiceEvaluationPanel card order",
  );

  include(css, ".flow-summary-strip", "CSS flow-summary-strip missing");
  include(css, ".flow-summary-steps", "CSS flow-summary-steps missing");
  include(css, ".flow-summary-chip", "CSS flow-summary-chip missing");
  include(css, ".flow-summary-status", "CSS flow-summary-status missing");

  include(css, ".quality-summary-grid", "Existing quality summary grid missing");
  include(css, ".quality-detail-layout", "Existing quality detail layout missing");
  include(css, ".quality-card-shell", "Existing quality card shell missing");
  include(css, ".quality-metric-grid", "Existing quality metric grid missing");

  const web01aVisibleText = section(commercial, "<FlowSummaryStrip", "/>");
  must(!web01aVisibleText.includes("raw"), "WEB-01A visible text should not show raw");
  must(!web01aVisibleText.includes("payload"), "WEB-01A visible text should not show payload");
  must(!web01aVisibleText.includes("token"), "WEB-01A visible text should not show token");
  must(!web01aVisibleText.includes("hash"), "WEB-01A visible text should not show hash");
  must(!web01aVisibleText.includes("debug"), "WEB-01A visible text should not show debug");

  console.log("=== WEB-01A FLOW SUMMARY POLISH CHECK ===");
  console.log("OK flow summary strips and panel order are present");
  console.log("=== WEB-01A FLOW SUMMARY POLISH CHECK PASS ===");
}

main();
