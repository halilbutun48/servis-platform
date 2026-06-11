#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

function gitDiffNames(paths) {
  const out = execFileSync("git", ["diff", "--name-only", "--", ...paths], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitCachedNames() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  if (files.length > 0) fail(`${label}: ${files.join(", ")}`);
  ok(label);
}

function mustNoStagedPrefix(names, prefixes, label) {
  const hits = names.filter((name) => prefixes.some((prefix) => normalize(name).startsWith(normalize(prefix))));
  if (hits.length > 0) fail(`${label}: ${hits.join(", ")}`);
  ok(label);
}

function main() {
  console.log("=== OFFER-RANKING-QUALITY-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
  const doc = read("docs/OFFER_RANKING_QUALITY_01.md");
  const helper = read("web/src/utils/offerQualityRanking.js");
  const card = read("web/src/panels/shared/OfferQualityRankingCard.jsx");
  const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
  const companySections = read("web/src/panels/company/companyShiftsPanelSections.jsx");
  const companyCards = read("web/src/panels/company/companyShiftsPanelCards.jsx");
  const roomOffers = read("web/src/panels/room/OffersPanel.jsx");
  const trustQuality = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const cachedNames = gitCachedNames();

  must(pkg, '"check:offerrankingquality01": "node backend/scripts/offer_ranking_quality_01_check.js"', "package.json exposes offer ranking quality check");
  ordered(runner, ["check:safedrive01", "check:offerrankingquality01", "check:pay01e"], "product extensions runner places offer ranking quality after safe drive");
  ordered(verify, ["check:safedrive01", "check:offerrankingquality01", "check:pay01e"], "verify chain places offer ranking quality after safe drive");

  must(guide, "OFFER-RANKING-QUALITY-01", "milestone guide mentions offer ranking quality milestone");
  must(guide, "check:offerrankingquality01", "milestone guide exposes offer ranking quality check");
  must(guide, "node backend\\scripts\\offer_ranking_quality_01_check.js", "milestone guide includes offer ranking quality command");
  must(guide, "docs/OFFER_RANKING_QUALITY_01.md", "milestone guide includes offer ranking quality doc");
  must(guide, "Kalite, güven, telematics, evidence/check-in ve operasyon riski", "milestone guide keeps quality/risk copy");
  ordered(guide, ["SAFE-DRIVE-01", "OFFER-RANKING-QUALITY-01"], "milestone guide keeps offer ranking quality after safe drive");

  must(primer, "OFFER-RANKING-QUALITY-01", "primer mentions offer ranking quality milestone");
  must(primer, "docs/OFFER_RANKING_QUALITY_01.md", "primer links offer ranking quality doc");

  must(roadmap, "OFFER-RANKING-QUALITY-01", "roadmap keeps offer ranking quality milestone");
  must(roadmap, "readonly offer quality comparison", "roadmap keeps readonly offer quality comparison wording");
  must(roadmap, "Company / Room / Super Admin", "roadmap keeps role coverage wording");
  must(roadmap, "auto-selection", "roadmap keeps auto-selection boundary wording");
  must(roadmap, "auto-accept", "roadmap keeps auto-accept boundary wording");
  must(roadmap, "contract execute", "roadmap keeps contract boundary wording");
  must(roadmap, "payment/hakediş execute", "roadmap keeps payment boundary wording");
  must(roadmap, "AI runtime action", "roadmap keeps AI runtime boundary wording");
  ordered(roadmap, ["M44-TELEMATICS-T1-T5", "TELEMATICS-PROVIDER-HUB-01", "SAFE-DRIVE-01", "OFFER-RANKING-QUALITY-01"], "roadmap keeps offer ranking quality after safe drive");

  must(doc, "# OFFER-RANKING-QUALITY-01", "offer ranking quality doc title present");
  must(doc, "Kalite, güven, telematics, evidence/check-in ve operasyon riski", "offer ranking quality doc keeps summary wording");
  must(doc, "Company / Room / Super Admin", "offer ranking quality doc keeps role coverage wording");
  must(doc, "auto-selection", "offer ranking quality doc keeps auto-selection boundary wording");
  must(doc, "auto-accept", "offer ranking quality doc keeps auto-accept boundary wording");
  must(doc, "contract execute", "offer ranking quality doc keeps contract boundary wording");
  must(doc, "payment/hakediş execute", "offer ranking quality doc keeps payment boundary wording");
  must(doc, "AI runtime action", "offer ranking quality doc keeps AI runtime boundary wording");
  must(doc, "web/src/utils/offerQualityRanking.js", "offer ranking quality doc links helper");
  must(doc, "web/src/panels/shared/OfferQualityRankingCard.jsx", "offer ranking quality doc links shared card");
  must(doc, "docs/check milestone", "offer ranking quality doc keeps docs/check wording");

  must(helper, "buildOfferQualityRanking", "helper exposes ranking builder");
  must(helper, "buildOfferSafeDriveInput", "helper derives safe drive input from offer rows");
  must(helper, "autoAcceptBlocked", "helper exposes auto-accept blocked boundary");
  must(helper, "contractExecuteBlocked", "helper exposes contract execute blocked boundary");
  must(helper, "paymentExecuteBlocked", "helper exposes payment execute blocked boundary");
  must(helper, "aiRuntimeActionBlocked", "helper exposes AI runtime blocked boundary");
  must(helper, "Kalite, güven, telematics, kanıt/check-in ve operasyon riski", "helper keeps summary wording");

  must(card, "OfferQualityRankingCard", "shared card exports offer quality ranking component");
  must(card, "Kalite karşılaştırması", "shared card keeps quality comparison wording");
  must(card, "readonly", "shared card keeps readonly wording");
  must(card, "auto-selection", "shared card keeps auto-selection boundary wording");
  must(card, "auto-accept", "shared card keeps auto-accept boundary wording");
  must(card, "telematics", "shared card keeps telematics wording");
  must(card, "evidence/check-in", "shared card keeps evidence/check-in wording");

  must(workflow, "OfferQualityRankingCard", "workflow panel wires offer quality ranking card");
  must(workflow, "Kalite karşılaştırması", "workflow panel keeps quality comparison wording");
  must(workflow, "Kalite Karşılaştırması Özeti", "workflow panel keeps quality comparison summary wording");
  must(workflow, "Shift’i incele", "workflow panel keeps review navigation wording");
  must(workflow, "Öne çıkan kalite satırı", "workflow panel keeps top row wording");

  must(companySections, "OfferQualityRankingCard", "company offers modal wires offer quality ranking card");
  must(companySections, "Kalite karşılaştırması", "company offers modal keeps quality comparison wording");
  must(companySections, "Kalite Karşılaştırması Özeti", "company offers modal keeps summary wording");
  must(companySections, "Üstte", "company offers modal keeps upper-row wording");
  must(companySections, "İnceleyip Kabul Et", "company offers modal keeps human approval wording");

  must(companyCards, "Üstte", "company offer cards keep upper-row wording");
  must(companyCards, "Neden üstte?", "company offer cards keep human-readable reason wording");
  must(companyCards, "İnceleyip Kabul Et", "company offer cards keep human approval wording");
  must(companyCards, "İnceleyip Pakete Uygula", "company offer cards keep package approval wording");

  must(roomOffers, "OfferQualityRankingCard", "room offers panel wires offer quality ranking card");
  must(roomOffers, "Kalite karşılaştırması", "room offers panel keeps quality comparison wording");
  must(roomOffers, "Room teklif karşılaştırması", "room offers panel keeps room scope wording");

  must(trustQuality, "OfferQualityRankingCard", "trust quality panel wires offer quality ranking card");
  must(trustQuality, "Teklif kalite karşılaştırma rayı", "trust quality panel keeps super admin quality lane wording");
  must(trustQuality, "Super Admin denetim görünümü", "trust quality panel keeps super admin scope wording");

  must(harnessCheck, "check:offerrankingquality01", "script harness check knows offer ranking quality alias");
  must(harnessCheck, "offer_ranking_quality_01_check.js", "script harness check knows offer ranking quality file");
  must(harnessCheck, "OFFER-RANKING-QUALITY-01", "script harness check knows offer ranking quality milestone");
  must(harnessCheck, "docs/OFFER_RANKING_QUALITY_01.md", "script harness check knows offer ranking quality doc");
  must(harnessCheck, "web/src/utils/offerQualityRanking.js", "script harness check knows offer ranking quality helper");
  must(harnessCheck, "web/src/panels/shared/OfferQualityRankingCard.jsx", "script harness check knows offer ranking quality card");

  must(harnessDoc, "root:check:offerrankingquality01", "script harness doc lists offer ranking quality root check");
  must(harnessDoc, "offer_ranking_quality_01_check.js", "script harness doc lists offer ranking quality check");
  must(harnessDoc, "docs/OFFER_RANKING_QUALITY_01.md", "script harness doc lists offer ranking quality doc");
  must(harnessDoc, "OFFER-RANKING-QUALITY-01", "script harness doc lists offer ranking quality milestone");
  must(harnessDoc, "web/src/utils/offerQualityRanking.js", "script harness doc lists offer ranking quality helper");
  must(harnessDoc, "web/src/panels/shared/OfferQualityRankingCard.jsx", "script harness doc lists offer ranking quality card");

  mustNoDiff(["backend/src/routes", "backend/src/services", "backend/prisma", "prisma"], "backend route/service/schema and Prisma diff stays empty");
  mustNoStagedPrefix(cachedNames, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== OFFER-RANKING-QUALITY-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
