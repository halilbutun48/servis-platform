import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function assertContains(relPath, needles, failures) {
  if (!exists(relPath)) {
    failures.push(`${relPath}: missing file`);
    return;
  }
  const text = read(relPath);
  for (const needle of needles) {
    if (!String(text || "").includes(needle)) {
      failures.push(`${relPath}: missing "${needle}"`);
    }
  }
}

function assertNotContains(relPath, needles, failures) {
  if (!exists(relPath)) return;
  const text = read(relPath);
  for (const needle of needles) {
    if (String(text || "").includes(needle)) {
      failures.push(`${relPath}: unexpected "${needle}"`);
    }
  }
}

function main() {
  const failures = [];
  const requiredFiles = [
    "docs/DYNAMIC_SAVINGS_01.md",
    "web/src/panels/shared/DynamicSavingsPreviewCard.jsx",
    "web/src/utils/routePreviewSummary.js",
    "web/src/utils/agreementCopilotFacts.js",
    "web/src/utils/copilotFacts.js",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/company/companyAgreementsRouteRefreshPendingSection.jsx",
    "web/src/panels/room/roomAgreementsPanelSections.jsx",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/intentRouter.js",
    "backend/src/ai/chat/answerQualityPolicy.js",
    "backend/src/ai/chat/goldenQuestionPack.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
  ];

  for (const relPath of requiredFiles) {
    if (!exists(relPath)) failures.push(`${relPath}: missing file`);
  }

  assertContains("package.json", ['"check:dynamicsavings01": "node backend/scripts/dynamic_savings_01_check.js"'], failures);
  assertContains("backend/scripts/run_product_extensions_check_chain.js", ["check:dynamicsavings01"], failures);
  assertContains("backend/scripts/verify_chain_01_product_extensions_check.js", ["check:dynamicsavings01", "DYNAMIC-SAVINGS-01"], failures);
  assertContains("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md", ["DYNAMIC-SAVINGS-01", "check:dynamicsavings01"], failures);
  assertContains("docs/DYNAMIC_SAVINGS_01.md", [
    "readonly dinamik tasarruf önizlemesi",
    "Tasarruf hesabı için yeterli veri yok",
    "Route apply yok",
    "Ödeme yok",
    "Settlement yok",
    "SMS yok",
    "Push notification yok",
    "Driver refresh yok",
    "Schema / migration yok",
    "Sefer Abi yalnızca readonly tasarruf sinyalini açıklar.",
  ], failures);
  assertContains("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md", ["DYNAMIC-SAVINGS-01"], failures);
  assertContains("web/src/utils/routePreviewSummary.js", ["buildDynamicSavingsPreview", "Tasarruf hesabı için yeterli veri yok", "Sadece önizleme"], failures);
  assertContains("web/src/panels/shared/DynamicSavingsPreviewCard.jsx", ["Tasarruf hesabı için yeterli veri yok", "Sadece önizleme"], failures);
  assertContains("web/src/utils/agreementCopilotFacts.js", ["dynamicSavingsSummaryText", "copilotSummary"], failures);
  assertContains("web/src/utils/copilotFacts.js", ["DYNAMIC_SAVINGS_PREVIEW", "isDynamicSavingsPreview"], failures);
  assertContains("backend/src/ai/chat/helpComposer.js", ["DYNAMIC_SAVINGS_PREVIEW", "Dinamik tasarruf önizlemesi", "Tasarruf önizlemesini netleştirmek"], failures);
  assertContains("backend/src/ai/chat/intentRouter.js", ["DYNAMIC_SAVINGS_PREVIEW", "dynamic-savings-path"], failures);
  assertContains("backend/src/ai/chat/answerQualityPolicy.js", ["DYNAMIC_SAVINGS_PREVIEW", "Tasarruf önizlemesini aç"], failures);
  assertContains("backend/src/ai/chat/goldenQuestionPack.js", ["room-agreements-dynamic-savings-preview", "company-agreements-dynamic-savings-preview"], failures);
  assertContains("backend/scripts/script_harness_consolidation_01_check.js", ["DYNAMIC-SAVINGS-01", "check:dynamicsavings01"], failures);

  const banned = [
    "createStopAssignment",
    "updateStopAssignment",
    "sendSms(",
    "sendNotification(",
    "pushNotification(",
    "driverRouteRefresh(",
    "route.apply(",
    "payment execute",
    "settlement execute",
    "prisma migrate",
    "runtime-data/",
  ];
  for (const relPath of [
    "docs/DYNAMIC_SAVINGS_01.md",
    "web/src/panels/shared/DynamicSavingsPreviewCard.jsx",
    "web/src/utils/routePreviewSummary.js",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/intentRouter.js",
    "backend/src/ai/chat/answerQualityPolicy.js",
    "backend/src/ai/chat/goldenQuestionPack.js",
  ]) {
    assertNotContains(relPath, banned, failures);
  }

  if (failures.length) {
    console.error("=== DYNAMIC-SAVINGS-01 CHECK FAIL ===");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("=== DYNAMIC-SAVINGS-01 CHECK PASS ===");
}

main();
