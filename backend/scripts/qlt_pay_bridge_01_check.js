import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";

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

function ok(label) {
  console.log(`OK ${label}`);
}

function warn(label) {
  console.log(`WARN ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else throw new Error(`FAIL ${label}`);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${label}`);
  ok(label);
}

function runGitStatus() {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.error) {
    warn(`git status unavailable: ${result.error.message}`);
    return "";
  }
  return String(result.stdout || "");
}

function checkRuntimeDataState(statusText) {
  const runtimeFiles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
  ];
  const dirty = runtimeFiles.filter((file) => normalize(statusText).includes(normalize(file)));
  if (dirty.length) {
    warn(`runtime-data files are already dirty outside this milestone: ${dirty.join(", ")}`);
  } else {
    ok("runtime-data files stay outside the milestone diff");
  }
}

console.log("=== QLT-PAY-BRIDGE-01 CHECK ===");

const service = read("backend/src/services/qualityPaymentBridgeService.js");
const companyPanel = read("web/src/panels/company/AgreementsPanel.jsx");
const roomPanel = read("web/src/panels/room/AgreementsPanel.jsx");
const bridgeCard = read("web/src/panels/shared/QualityPaymentBridgePreviewCard.jsx");
const agreementFacts = read("web/src/utils/agreementCopilotFacts.js");
const copilotFacts = read("web/src/utils/copilotFacts.js");
const helpComposer = read("backend/src/ai/chat/helpComposer.js");
const intentRouter = read("backend/src/ai/chat/intentRouter.js");
const answerQualityPolicy = read("backend/src/ai/chat/answerQualityPolicy.js");
const goldenQuestionPack = read("backend/src/ai/chat/goldenQuestionPack.js");
const pkg = read("package.json");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const milestoneDoc = read("docs/QLT_PAY_BRIDGE_01.md");
const companyBridgeSection = read("web/src/panels/company/companyAgreementsBridgeSection.jsx");
const roomBridgeSection = read("web/src/panels/room/roomAgreementsBridgeSection.jsx");
const gitStatus = runGitStatus();

must(service, "previewOnly: true", "service keeps previewOnly boundary");
must(service, "canStartPayment: false", "service blocks payment start");
must(service, "paymentActionBlocked: true", "service blocks payment actions");
must(service, "paymentPreviewImpact", "service exposes preview impact");
must(service, "seferScoreSignalsPreview", "service exposes SeferPuanı preview signals");
must(service, "onTimeSignal", "service exposes onTimeSignal");
must(service, "gpsProofSignal", "service exposes gpsProofSignal");
must(service, "completionSignal", "service exposes completionSignal");
must(service, "complaintSignal", "service exposes complaintSignal");
must(service, "disputeSignal", "service exposes disputeSignal");
must(service, "documentSignal", "service exposes documentSignal");
must(service, "qualityReviewSignal", "service exposes qualityReviewSignal");
must(service, "missingProofs", "service exposes missing proofs");
must(service, "riskReasons", "service exposes risk reasons");
must(service, "nextBestAction", "service exposes next best action");
must(service, "Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.", "service keeps safe preview boundary wording");
must(service, "Hakediş için kalite/kanıt hazırlık önizlemesi.", "service keeps bridge summary wording");
mustNot(service, "başarı payı", "service does not introduce success share wording");
mustNot(service, "%1-%3", "service does not introduce percentage fee wording");
mustNot(service, "platform fee", "service does not introduce platform fee wording");
mustNot(service, "iyzico", "service does not introduce iyzico wording");
mustNot(service, "pos", "service does not introduce POS integration wording");
mustNot(service, "banka", "service does not introduce bank integration wording");
mustNot(service, "settlement execute", "service does not introduce settlement execute wording");
mustNot(service, "execute settlement", "service does not introduce settlement execute wording");
mustNot(service, "ödeme başlattım", "service does not claim payment started");
mustNot(service, "hakediş onaylandı", "service does not claim approval");
mustNot(service, "tahsil edildi", "service does not claim collection");
mustNot(service, "fatura kesildi", "service does not claim invoice issuance");

must(bridgeCard, "Sadece önizleme — ödeme başlatılmaz", "bridge card keeps preview copy");
must(bridgeCard, "Tahsilat/fatura oluşturulmaz", "bridge card keeps no-collection copy");
must(bridgeCard, "Hakediş için kalite/kanıt hazırlık önizlemesi", "bridge card keeps preview positioning");
must(bridgeCard, "Eksik kanıt varsa önce tamamlanmalı", "bridge card keeps missing-proof guidance");
must(bridgeCard, "Kalite durumu", "bridge card shows quality status");
must(bridgeCard, "Kanıt tamlığı", "bridge card shows proof completeness");
must(bridgeCard, "Hakediş önizleme etkisi", "bridge card shows preview impact");
must(bridgeCard, "Ödeme / settlement hazırlığı", "bridge card shows settlement readiness");
must(bridgeCard, "Sıradaki doğru işlem", "bridge card shows next best action");

must(companyPanel, "CompanyAgreementsBridgeSection", "company panel imports split bridge section");
must(companyPanel, "qualityPaymentBridgePreview", "company panel fetches bridge preview");
must(companyBridgeSection, "QualityPaymentBridgePreviewCard", "company bridge section imports bridge card");
must(companyBridgeSection, "Kalite / hakediş önizlemesi", "company bridge section exposes preview section");
must(companyBridgeSection, "Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.", "company bridge section uses safe preview language");

must(roomPanel, "RoomAgreementsBridgeSection", "room panel imports split bridge section");
must(roomPanel, "qualityPaymentBridgePreview", "room panel fetches bridge preview");
must(roomBridgeSection, "QualityPaymentBridgePreviewCard", "room bridge section imports bridge card");
must(roomBridgeSection, "Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.", "room bridge section uses safe preview language");

must(agreementFacts, "qualityPaymentBridgePreview", "agreement facts keep bridge preview object");
must(agreementFacts, "qualityPaymentBridgeSummaryText", "agreement facts keep bridge summary");
must(agreementFacts, "qualityPaymentBridgeStatus", "agreement facts keep bridge status");
must(agreementFacts, "qualityPaymentBridgeProofCompleteness", "agreement facts keep proof completeness");
must(agreementFacts, "qualityPaymentBridgeSettlementReadiness", "agreement facts keep settlement readiness");
must(agreementFacts, "qualityPaymentBridgeImpactStatus", "agreement facts keep impact status");
must(agreementFacts, "qualityPaymentBridgeMissingProofs", "agreement facts keep missing proofs");
must(agreementFacts, "qualityPaymentBridgeRiskReasons", "agreement facts keep risk reasons");
must(agreementFacts, "qualityPaymentBridgeNextAction", "agreement facts keep next action");

must(copilotFacts, "Kanıt eksiklerini göster", "copilot chips include safe bridge chips");
must(copilotFacts, "Hakediş etkisini açıkla", "copilot chips include impact chip");
must(copilotFacts, "Ödeme başlatılabilir mi?", "copilot chips include blocked-payment chip");
must(copilotFacts, "Sıradaki doğru işlem ne?", "copilot chips include next-action chip");
must(copilotFacts, "qualityPaymentBridgeSummaryText", "copilot text includes bridge summary support");

must(helpComposer, "Hakediş / kanıt önizlemesi", "help composer labels payment bridge safely");
must(helpComposer, "Bu sadece önizlemedir; ödeme başlatılmaz", "help composer keeps readonly boundary");
must(helpComposer, "Önce eksik kanıtları ve kalite kontrolünü tamamla", "help composer keeps safe advice");
must(helpComposer, "Kanıt eksiklerini sor", "help composer asks about missing proofs safely");
must(helpComposer, "PAYMENT_MISSING", "help composer keeps payment missing topic");
must(helpComposer, "PAYMENT_PREVIEW", "help composer keeps payment preview topic");

must(intentRouter, "PAYMENT_MISSING", "intent router keeps payment missing intent");
must(intentRouter, "payment-missing-path", "intent router scores payment missing path");
must(intentRouter, "payment-readiness-path", "intent router scores payment readiness path");
must(intentRouter, "/agreements", "intent router covers agreements path for payment bridge");

must(answerQualityPolicy, "Kanıt eksiklerini göster", "answer quality policy uses safe bridge chips");
must(answerQualityPolicy, "Ödeme başlatılabilir mi?", "answer quality policy uses safe payment question");
must(answerQualityPolicy, "Hakediş / kanıt önizleme rehberini aç", "answer quality policy keeps safe guide label");
must(answerQualityPolicy, "ödeme başlatmaz", "answer quality policy keeps non-execution reason");

must(goldenQuestionPack, "Bu sözleşmede ödeme başlatılabilir mi?", "golden questions include payment start preview");
must(goldenQuestionPack, "Kanıt eksikleri neler?", "golden questions include missing proof preview");
must(goldenQuestionPack, "Kalite hakedişi etkiliyor mu?", "golden questions include quality impact preview");
must(goldenQuestionPack, "Bu servis kanıt açısından güvenli mi?", "golden questions include proof safety preview");

must(pkg, '"check:qltpaybridge01": "node backend/scripts/qlt_pay_bridge_01_check.js"', "package exposes qlt pay bridge check");
assertProductExtensionsIncludes("check:qltpaybridge01", "product extensions registry includes qlt pay bridge check");
must(guide, "QLT-PAY-BRIDGE-01", "script guide mentions qlt pay bridge milestone");
must(guide, "check:qltpaybridge01", "script guide exposes qlt pay bridge check");
must(milestoneDoc, "Sadece önizleme — ödeme başlatılmaz", "milestone doc keeps safe preview boundary");
must(milestoneDoc, "SeferPuanı", "milestone doc keeps SeferPuanı note");

checkRuntimeDataState(gitStatus);

console.log("=== QLT-PAY-BRIDGE-01 CHECK PASS ===");
