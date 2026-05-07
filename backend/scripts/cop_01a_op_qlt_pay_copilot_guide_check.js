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

console.log("=== COP-01A OP QLT PAY COPILOT GUIDE CHECK ===");

const rootPkg = read("package.json");
const helpComposer = read("backend/src/ai/chat/helpComposer.js");
const goldenPack = read("backend/src/ai/chat/goldenQuestionPack.js");
const screenCatalog = read("backend/src/ai/jobGuide/screenCatalog.js");
const screenRegistry = read("web/src/copilot/screenRegistry.js");
const superAdminPanel = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
const commercialPanel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const qualityPanel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
const guideSection = helpComposer
  .split("// COP-01A: OP/QLT/PAY ekran rehberi için kısa, güvenli cevaplar.")[1]
  ?.split("export function normalizeEverydayQuestion")[0] || "";

must(rootPkg, '"check:cop01a": "node backend/scripts/cop_01a_op_qlt_pay_copilot_guide_check.js"', "root package exposes check:cop01a");
must(rootPkg, '"check:web01b": "node backend/scripts/web_01b_superadmin_system_mode_summary_check.js"', "root package keeps check:web01b");
must(rootPkg, '"check:web01a": "node backend/scripts/web_01a_flow_summary_polish_check.js"', "root package keeps check:web01a");
must(rootPkg, '"check:pay01e": "node backend/scripts/pay_01e_payment_readonly_closure_check.js"', "root package keeps check:pay01e");
must(rootPkg, '"check:qlt04a": "node backend/scripts/qlt_04a_quality_layout_polish_check.js"', "root package keeps check:qlt04a");
must(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
must(rootPkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"', "root package keeps lint:web");
must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(helpComposer, "composeOpsQualityPaymentGuideReply", "helpComposer has COP-01A guide helper");
must(helpComposer, "OP/QLT/PAY ekran rehberi", "helpComposer carries COP-01A guide marker");
must(helpComposer, "İlk bakılacak yer: Sistem durumu bandı.", "helpComposer has system status guidance");
must(helpComposer, "İlk bakılacak yer: Ticari akış özeti.", "helpComposer has commercial flow guidance");
must(helpComposer, "İlk bakılacak yer: Kalite akış özeti.", "helpComposer has quality flow guidance");
must(helpComposer, "İlk bakılacak yer: Servis Kanıtı kartı.", "helpComposer has proof guidance");
must(helpComposer, "Bu ekran ödeme başlatmaz.", "helpComposer keeps payment non-final wording");
must(helpComposer, "Ödeme, settlement ve komisyon kapalıdır.", "helpComposer keeps closed-payment wording");
must(helpComposer, "Bu bilgi kesin kalite puanı değildir.", "helpComposer keeps non-final quality wording");
must(helpComposer, "Sağlayıcı sıralaması değildir.", "helpComposer keeps no-ranking wording");
must(helpComposer, "Hakediş veya komisyon hesabını etkilemez.", "helpComposer keeps no-payment-impact wording");
must(helpComposer, "Servis Kanıtı operasyon görünürlüğü sağlar.", "helpComposer keeps proof visibility wording");
must(helpComposer, "Sistem durumu bandı", "helpComposer keeps system status marker");
must(helpComposer, "Ticari akış özeti", "helpComposer keeps commercial flow marker");
must(helpComposer, "Kalite akış özeti", "helpComposer keeps quality flow marker");

must(screenCatalog, "Ticari Akış", "superadmin overview exposes commercial flow quick action");
must(screenCatalog, "Güven ve Kalite", "superadmin overview exposes trust-quality quick action");
must(screenCatalog, "/superadmin/commercial-core", "screen catalog keeps commercial core context");
must(screenCatalog, "/superadmin/trust-quality", "screen catalog keeps trust quality context");

must(goldenPack, "superadmin-system-status-band", "golden pack includes system status example");
must(goldenPack, "superadmin-commercial-core-readiness", "golden pack includes commercial readiness example");
must(goldenPack, "superadmin-commercial-core-csv-preview", "golden pack includes csv preview example");
must(goldenPack, "superadmin-quality-score-finite", "golden pack includes quality score example");
must(goldenPack, "superadmin-proof-purpose", "golden pack includes proof purpose example");
must(goldenPack, "Bu sistem durumu ne demek?", "golden pack keeps system question");
must(goldenPack, "Ödeme neden kapalı?", "golden pack keeps commercial question");
must(goldenPack, "CSV taslağı ne işe yarıyor?", "golden pack keeps csv question");
must(goldenPack, "Kalite puanı kesin mi?", "golden pack keeps quality question");
must(goldenPack, "Servis kanıtı ne işe yarar?", "golden pack keeps proof question");
must(goldenPack, "Ticari akış özeti", "golden pack keeps commercial marker");
must(goldenPack, "Kalite akış özeti", "golden pack keeps quality marker");
must(goldenPack, "Sistem durumu", "golden pack keeps system status marker");

must(screenRegistry, "/superadmin/commercial-core", "screen registry keeps commercial core screen");
must(screenRegistry, "/superadmin/trust-quality", "screen registry keeps trust quality screen");

must(superAdminPanel, "SystemModeSummaryBand", "super admin panel keeps system mode band");
must(commercialPanel, "FlowSummaryStrip", "commercial core panel keeps flow summary strip");
must(commercialPanel, "Ticari akış özeti", "commercial core panel keeps flow summary copy");
must(commercialPanel, "PaymentReadonlySafetyBadge", "commercial core panel keeps payment safety badge");
must(qualityPanel, "FlowSummaryStrip", "trust quality panel keeps flow summary strip");
must(qualityPanel, "Kalite akış özeti", "trust quality panel keeps flow summary copy");
must(qualityPanel, "QualityProofReadonlyCard", "trust quality panel keeps proof card");
must(qualityPanel, "QualityDraftScoreCard", "trust quality panel keeps draft score card");
must(qualityPanel, "QualityReviewDecisionCard", "trust quality panel keeps review decision card");
must(qualityPanel, "QualityReviewHistoryCard", "trust quality panel keeps review history card");

mustNot(guideSection, "raw token", "copilot guide block does not expose raw token wording");
mustNot(guideSection, "raw payload", "copilot guide block does not expose raw payload wording");
mustNot(guideSection, "payload", "copilot guide block does not expose payload wording");
mustNot(guideSection, "hash", "copilot guide block does not expose hash wording");
mustNot(guideSection, "debug", "copilot guide block does not expose debug wording");
mustNot(guideSection, "driver GPS", "copilot guide block keeps driver GPS out of visible wording");
mustNot(guideSection, "agreement", "copilot guide block keeps agreement out of visible wording");

console.log("=== COP-01A OP QLT PAY COPILOT GUIDE CHECK PASS ===");
