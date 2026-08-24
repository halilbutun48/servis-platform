#!/usr/bin/env node

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

function mustNotRegex(text, pattern, label) {
  if (pattern.test(String(text || ""))) throw new Error(`FAIL ${label}`);
  ok(label);
}

function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.error) {
    warn(`git ${args.join(" ")} unavailable: ${result.error.message}`);
    return "";
  }
  return String(result.stdout || "");
}

function warnOnRuntimeData(statusText, diffText) {
  const runtimeFiles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
  ];
  const combined = `${statusText}\n${diffText}`;
  const dirty = runtimeFiles.filter((file) => normalize(combined).includes(normalize(file)));
  if (dirty.length) {
    warn(`runtime-data files are already dirty outside this milestone: ${dirty.join(", ")}`);
  } else {
    ok("runtime-data files stay outside the milestone diff");
  }
}

console.log("=== SEFER-SCORE-01 CHECK ===");

const service = read("backend/src/services/seferScoreService.js");
const route = read("backend/src/routes/agreements.js");
const api = read("web/src/api.js");
const card = read("web/src/panels/shared/SeferScorePreviewCard.jsx");
const companyPanel = read("web/src/panels/company/AgreementsPanel.jsx");
const companyBridgeSection = read("web/src/panels/company/companyAgreementsBridgeSection.jsx");
const roomPanel = read("web/src/panels/room/AgreementsPanel.jsx");
const roomBridgeSection = read("web/src/panels/room/roomAgreementsBridgeSection.jsx");
const agreementFacts = read("web/src/utils/agreementCopilotFacts.js");
const copilotFacts = read("web/src/utils/copilotFacts.js");
const helpComposer = read("backend/src/ai/chat/helpComposer.js");
const intentRouter = read("backend/src/ai/chat/intentRouter.js");
const answerQualityPolicy = read("backend/src/ai/chat/answerQualityPolicy.js");
const goldenQuestionPack = read("backend/src/ai/chat/goldenQuestionPack.js");
const qltCheck = read("backend/scripts/qlt_pay_bridge_01_check.js");
const pkg = read("package.json");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const milestoneDoc = read("docs/SEFER_SCORE_01.md");
const statusText = gitOutput(["status", "--porcelain"]);
const diffText = gitOutput(["diff", "--name-only"]);

must(service, "computeSeferScorePreview", "service exports computeSeferScorePreview");
must(service, "normalizeSeferScoreSignals", "service exports normalizeSeferScoreSignals");
must(service, "classifySeferScore", "service exports classifySeferScore");
must(service, "buildSeferScoreReasons", "service exports buildSeferScoreReasons");
must(service, "buildSeferScoreNextBestAction", "service exports buildSeferScoreNextBestAction");
must(service, "previewOnly: true", "service stays readonly");
must(service, "scoreMax: 5", "service caps score at five");
must(service, "clampNumber(roundTo(scoreRaw, 2), 0, 5, 0)", "service clamps score to 0-5");
must(service, "ELITE", "service defines ELITE level");
must(service, "GOOD", "service defines GOOD level");
must(service, "STANDARD", "service defines STANDARD level");
must(service, "RISKY", "service defines RISKY level");
must(service, "CRITICAL", "service defines CRITICAL level");
must(service, "INSUFFICIENT_DATA", "service defines insufficient-data level");
must(service, "Sadece önizleme — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.", "service keeps safe boundary text");
must(service, "seferScoreSignalsPreview", "service keeps preview signal bridge");
must(service, "onTimeSignal", "service exposes onTimeSignal");
must(service, "gpsProofSignal", "service exposes gpsProofSignal");
must(service, "completionSignal", "service exposes completionSignal");
must(service, "complaintSignal", "service exposes complaintSignal");
must(service, "disputeSignal", "service exposes disputeSignal");
must(service, "documentSignal", "service exposes documentSignal");
must(service, "qualityReviewSignal", "service exposes qualityReviewSignal");

must(route, "/:id/sefer-score-preview", "agreement route exposes sefer preview endpoint");
must(route, "computeSeferScorePreview", "agreement route uses sefer score service");
must(route, "seferScorePreview", "agreement route wraps sefer preview payload");

must(api, "getAgreementSeferScorePreview", "web api exports sefer preview getter");
must(api, "sefer-score-preview", "web api points to the sefer preview endpoint");

must(card, "Sadece önizleme — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.", "sefer card keeps safe boundary wording");
must(card, "SeferPuanı", "sefer card shows SeferPuanı label");
must(card, "Güçlü sinyaller", "sefer card shows positive reasons");
must(card, "Eksik sinyaller", "sefer card shows missing signals");
must(card, "Risk nedenleri", "sefer card shows risk reasons");
must(card, "Sıradaki doğru işlem", "sefer card shows next action");

must(companyPanel, "CompanyAgreementsBridgeSection", "company panel imports split bridge section");
must(companyPanel, "getAgreementSeferScorePreview", "company panel fetches sefer preview");
must(companyPanel, "seferScorePreview", "company panel tracks sefer preview state");
must(companyBridgeSection, "SeferScorePreviewCard", "company bridge section renders sefer card");

must(roomPanel, "RoomAgreementsBridgeSection", "room panel imports split bridge section");
must(roomPanel, "getAgreementSeferScorePreview", "room panel fetches sefer preview");
must(roomPanel, "seferScorePreview", "room panel tracks sefer preview state");
must(roomBridgeSection, "SeferScorePreviewCard", "room bridge section renders sefer card");

must(agreementFacts, "seferScorePreview", "agreement facts keep sefer preview");
must(agreementFacts, "seferScoreSummaryText", "agreement facts keep sefer summary");
must(agreementFacts, "seferScorePositiveReasons", "agreement facts keep positive reasons");
must(agreementFacts, "seferScoreRiskReasons", "agreement facts keep risk reasons");
must(agreementFacts, "seferScoreMissingSignals", "agreement facts keep missing signals");
must(agreementFacts, "seferScoreNextAction", "agreement facts keep next action");
must(agreementFacts, "Sadece önizleme — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.", "agreement facts keep safe explanation");

must(copilotFacts, "Bu tedarikçinin SeferPuanı kaç?", "copilot chips include sefer score question");
must(copilotFacts, "Kalite puanı neden düşük?", "copilot chips include low-score question");
must(copilotFacts, "Eksik sinyalleri göster", "copilot chips include missing-signals question");
must(copilotFacts, "SeferPuanı nasıl yükselir?", "copilot chips include improve-score question");
must(copilotFacts, "isSeferScorePreview", "copilot detection includes sefer preview");

must(helpComposer, "SEFER_SCORE_PREVIEW", "help composer knows sefer score workflow");
must(helpComposer, "SeferPuanı önizlemesini", "help composer explains sefer preview");
must(helpComposer, "SeferPuanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.", "help composer keeps preview boundary");
must(helpComposer, "ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz", "help composer keeps safe boundary");

must(intentRouter, "SEFER_SCORE_PREVIEW", "intent router knows sefer score intent");
must(intentRouter, "sefer-score-path", "intent router scores sefer score path");
must(intentRouter, "check:seferscore01", "intent router runner is wired to new check");

must(answerQualityPolicy, "SeferPuanı önizleme rehberini aç", "answer quality policy exposes sefer guide");
must(answerQualityPolicy, "Bu tedarikçinin SeferPuanı kaç?", "answer quality policy exposes sefer question");
must(answerQualityPolicy, "SEFER_SCORE_PREVIEW", "answer quality policy knows sefer topic");

must(goldenQuestionPack, "Bu tedarikçinin SeferPuanı kaç?", "golden questions include score question");
must(goldenQuestionPack, "Kalite puanı neden düşük?", "golden questions include low-score question");
must(goldenQuestionPack, "Eksik sinyaller neler?", "golden questions include missing-signals question");
must(goldenQuestionPack, "SeferPuanı nasıl yükselir?", "golden questions include improve-score question");
must(goldenQuestionPack, "Bu puan ödeme veya teklif sıralamasını etkiliyor mu?", "golden questions include boundary question");
must(goldenQuestionPack, "Bu servis kaliteli mi?", "golden questions include quality question");

must(qltCheck, "previewOnly: true", "QLT check still guards previewOnly");
must(qltCheck, "paymentActionBlocked: true", "QLT check still guards payment blocking");
must(qltCheck, "seferScoreSignalsPreview", "QLT check still validates sefer signal bridge");

must(pkg, '"check:seferscore01": "node backend/scripts/sefer_score_01_check.js"', "package.json exposes check:seferscore01");
assertProductExtensionsIncludes("check:seferscore01", "product extensions registry includes sefer score check");
must(guide, "SEFER-SCORE-01", "script guide mentions sefer score milestone");
must(guide, "check:seferscore01", "script guide exposes check:seferscore01");
must(milestoneDoc, "Sadece önizleme — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.", "milestone doc keeps safe boundary");
must(milestoneDoc, "v2026.05.13-sefer-score-01", "milestone doc keeps recommended tag");

const safetyText = [
  service,
  route,
  api,
  card,
  companyPanel,
  roomPanel,
  agreementFacts,
  copilotFacts,
  helpComposer,
  intentRouter,
  answerQualityPolicy,
  goldenQuestionPack,
].join("\n");
const coreSafetyText = [
  service,
  route,
  api,
  card,
].join("\n");

for (const [needle, label] of [
  ["ödeme başlattım", "service/UI does not claim payment started"],
  ["hakediş onaylandı", "service/UI does not claim settlement approval"],
  ["tahsil edildi", "service/UI does not claim collection"],
  ["fatura kesildi", "service/UI does not claim invoice issuance"],
  ["ceza uygulandı", "service/UI does not claim penalty application"],
  ["tedarikçi düşürüldü", "service/UI does not claim supplier downgrade"],
  ["komisyon oranı belirlendi", "service/UI does not claim commission rate"],
  ["ödeme etkisi uygulandı", "service/UI does not claim payment effect"],
  ["teklif sırası değiştirildi", "service/UI does not claim offer ranking change"],
  ["başarı payı", "service/UI does not introduce success share wording"],
  ["platform fee", "service/UI does not introduce platform fee wording"],
  ["iyzico", "service/UI does not introduce iyzico wording"],
  ["pos", "service/UI does not introduce POS wording"],
  ["banka", "service/UI does not introduce bank wording"],
]) {
  if (needle === "pos") {
    mustNotRegex(safetyText, /(?:^|[^a-z0-9])pos(?:$|[^a-z0-9])/i, label);
    continue;
  }
  if (needle === "banka") {
    mustNotRegex(safetyText, /(?:^|[^a-z0-9])banka(?:$|[^a-z0-9])/i, label);
    continue;
  }
  if (needle === "başarı payı" || needle === "platform fee") {
    mustNot(coreSafetyText, needle, label);
    continue;
  }
  mustNot(safetyText, needle, label);
}

warnOnRuntimeData(statusText, diffText);

console.log("=== SEFER-SCORE-01 CHECK PASS ===");
