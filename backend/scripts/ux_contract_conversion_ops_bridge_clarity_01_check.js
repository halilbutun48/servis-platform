#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
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

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx === -1) fail(`${label}: missing ${needle}`);
    if (idx < cursor) fail(`${label}: wrong order for ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

function stagedNames() {
  try {
    return execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

console.log("=== UX-CONTRACT-CONVERSION-AND-OPS-BRIDGE-CLARITY-01 CHECK ===");

const pkg = read("package.json");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const doc = read("docs/UX_CONTRACT_CONVERSION_OPS_BRIDGE_CLARITY_01.md");
const companyShiftsPanel = read("web/src/panels/company/ShiftsPanel.jsx");
const companyAgreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
const agreementWizard = read("web/src/panels/company/AgreementWizard.jsx");
const companyShiftRows = read("web/src/panels/company/companyShiftsPanelRows.jsx");
const bridgeCard = read("web/src/components/AgreementOpsBridgeCard.jsx");
const roomAgreementsPanel = read("web/src/panels/room/AgreementsPanel.jsx");
const staged = stagedNames();

must(pkg, '"check:uxcontractconversionopsbridgeclarity01": "node backend/scripts/ux_contract_conversion_ops_bridge_clarity_01_check.js"', "package.json exposes contract conversion clarity check");
must(runner, "check:uxcontractconversionopsbridgeclarity01", "product extensions runner includes contract conversion clarity check");
must(verifyChain, '"check:uxcontractconversionopsbridgeclarity01": "node backend/scripts/ux_contract_conversion_ops_bridge_clarity_01_check.js"', "verify chain exposes contract conversion clarity check");
must(harnessCheck, "check:uxcontractconversionopsbridgeclarity01", "script harness check knows contract conversion clarity alias");
must(harnessCheck, "docs/UX_CONTRACT_CONVERSION_OPS_BRIDGE_CLARITY_01.md", "script harness check knows contract conversion clarity doc");
must(harnessCheck, "UX-CONTRACT-CONVERSION-AND-OPS-BRIDGE-CLARITY-01", "script harness check knows contract conversion clarity milestone");

must(harnessDoc, "root:check:uxcontractconversionopsbridgeclarity01", "script harness doc indexes contract conversion clarity root alias");
must(harnessDoc, "check:uxcontractconversionopsbridgeclarity01", "script harness doc indexes contract conversion clarity check");
must(harnessDoc, "UX-CONTRACT-CONVERSION-AND-OPS-BRIDGE-CLARITY-01", "script harness doc names contract conversion clarity milestone");

ordered(
  runner,
  [
    "check:boardingops01a",
    "check:bugrouteimpactpreviewbutton01",
    "check:uxrouteimpactpreviewcompact01",
    "check:uxcontractconversionopsbridgeclarity01",
    "check:shiftdispatchapprovalfix01",
  ],
  "product extensions runner keeps contract conversion clarity between compact preview and dispatch approval",
);
ordered(
  verifyChain,
  [
    "check:boardingops01a",
    "check:bugrouteimpactpreviewbutton01",
    "check:uxrouteimpactpreviewcompact01",
    "check:uxcontractconversionopsbridgeclarity01",
    "check:shiftdispatchapprovalfix01",
  ],
  "verify chain keeps contract conversion clarity between compact preview and dispatch approval",
);

must(guide, "UX-CONTRACT-CONVERSION-AND-OPS-BRIDGE-CLARITY-01", "milestone guide mentions contract conversion clarity milestone");
must(guide, "check:uxcontractconversionopsbridgeclarity01", "milestone guide exposes contract conversion clarity check");
must(guide, "Sözleşme taslağını gözden geçir", "milestone guide keeps contract draft guidance");
must(guide, "Operasyon Köprüsü", "milestone guide covers operations bridge summary-first copy");
must(guide, "Summary-first", "milestone guide states summary-first principle");

must(doc, "Problem", "milestone doc includes problem section");
must(doc, "Hedef", "milestone doc includes target section");
must(doc, "Company Akışı", "milestone doc includes company flow section");
must(doc, "Room Akışı", "milestone doc includes room flow section");
must(doc, "Summary-First Yapı", "milestone doc includes summary-first section");
must(doc, "Detay Görünüm", "milestone doc includes detail view section");
must(doc, "Readonly Sınırı", "milestone doc includes readonly boundary section");
must(doc, "Sözleşme taslağını gözden geçir", "milestone doc includes contract draft guidance");
must(doc, "Eksik alanları tamamla", "milestone doc includes missing-fields guidance");
must(doc, "Onaya hazırla", "milestone doc includes approval-readiness guidance");
must(doc, "Detayı aç", "milestone doc keeps details toggle language");
must(doc, "Operasyon kaydını aç", "milestone doc keeps operation record action language");

for (const [scopeName, text] of [
  ["company agreements panel", companyAgreementsPanel],
  ["agreement wizard", agreementWizard],
  ["bridge card", bridgeCard],
  ["room agreements panel", roomAgreementsPanel],
]) {
  mustNot(text, "payment execute", `${scopeName} does not advertise payment execution`);
  mustNot(text, "billing execute", `${scopeName} does not advertise billing execution`);
  mustNot(text, "collection execute", `${scopeName} does not advertise collection execution`);
  mustNot(text, "contract execute", `${scopeName} does not advertise contract execution`);
  mustNot(text, "contract execute/sign", `${scopeName} does not advertise contract execution/signing`);
  mustNot(text, "invite send", `${scopeName} does not advertise invite sending`);
  mustNot(text, "user create", `${scopeName} does not advertise user creation`);
  mustNot(text, "supplier verification auto", `${scopeName} does not advertise automatic supplier verification`);
  mustNot(text, "settlement execute", `${scopeName} does not advertise settlement execution`);
}

must(companyShiftsPanel, "stashAgreementPrefill(prefill)", "company shifts panel stores agreement prefill");
must(companyShiftsPanel, "navigate(companyPath(me, \"/agreements\"));", "company shifts panel routes to agreements");
must(companyShiftRows, "Sözleşmeye Dönüştür", "company shift rows expose convert action");
must(companyShiftRows, "onConvertShiftToAgreement?.(shift)", "company shift rows wire convert action");

must(companyAgreementsPanel, "consumeAgreementPrefill()", "company agreements panel consumes agreement prefill");
must(companyAgreementsPanel, "useLayoutEffect", "company agreements panel uses layout effect for prefill");
must(companyAgreementsPanel, "setViewMode(\"wizard\")", "company agreements panel auto-opens wizard view");
must(companyAgreementsPanel, "viewMode === \"wizard\"", "company agreements panel keeps wizard view branch");
must(companyAgreementsPanel, "AgreementWizard", "company agreements panel renders agreement wizard");
must(companyAgreementsPanel, "launchPrefill={wizardPrefill}", "company agreements panel passes launch prefill");
must(companyAgreementsPanel, "autoOpenNonce={wizardPrefillNonce}", "company agreements panel passes auto open nonce");

must(agreementWizard, "Doğrudan sözleşme açma kapalı. Önce vardiyada “Sözleşmeye Dönüştür” kullan.", "agreement wizard keeps guarded entry");
must(agreementWizard, "launchPrefill?.sourceShiftId", "agreement wizard expects source shift context");

must(bridgeCard, "Kısa karar", "bridge card keeps short decision summary");
must(bridgeCard, "Detayı aç", "bridge card keeps details toggle open label");
must(bridgeCard, "Detayı kapat", "bridge card keeps details toggle close label");
must(bridgeCard, "Operasyon kaydını aç", "bridge card keeps open operation action");
must(bridgeCard, "Eksikleri tamamla", "bridge card keeps fill-gaps action");
must(bridgeCard, "Durum", "bridge card keeps status chip");
must(bridgeCard, "Etki", "bridge card keeps impact chip");
must(bridgeCard, "Risk", "bridge card keeps risk chip");
must(bridgeCard, "Sıradaki işlem", "bridge card keeps next-step chip");

must(roomAgreementsPanel, "CollapsibleSection", "room agreements panel uses collapsible section for heavy previews");
must(roomAgreementsPanel, "Kalite / hakediş önizlemesi", "room agreements panel groups payment preview under compact section");
must(roomAgreementsPanel, "defaultOpen={false}", "room agreements panel keeps heavy preview collapsed by default");
must(roomAgreementsPanel, "compact", "room agreements panel keeps preview section compact");
must(roomAgreementsPanel, "QualityPaymentBridgePreviewCard", "room agreements panel keeps quality preview inside collapsible");
must(roomAgreementsPanel, "SeferScorePreviewCard", "room agreements panel keeps score preview inside collapsible");
must(roomAgreementsPanel, "PlatformFeePreviewCard", "room agreements panel keeps fee preview inside collapsible");

mustNot(staged, "backend/artifacts/runtime-data", "runtime-data is not staged");
mustNot(staged, "public-leads.json", "public leads runtime data is not staged");

console.log("=== UX-CONTRACT-CONVERSION-AND-OPS-BRIDGE-CLARITY-01 CHECK PASS ===");
