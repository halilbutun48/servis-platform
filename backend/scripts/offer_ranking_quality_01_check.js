#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mustDiffEmptyOrExactlyWithIdentity, mustStatusEmptyOrExactlyWithIdentity } from "./lib/guardGitScope.js";
import {
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
} from "./lib/currentHeadScopePolicy.js";
import {
  assertProductExtensionsIncludes,
  assertProductExtensionsOrder,
  productExtensionsChecks,
} from "./lib/productExtensionsRegistry.js";

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

function mustEqual(actual, expected, label) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText === expectedText) ok(label);
  else fail(`${label}: ${actualText} != ${expectedText}`);
}

function mustCondition(condition, label) {
  if (condition) ok(label);
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

function mustNoStagedPrefix(names, prefixes, label) {
  const hits = names.filter((name) => prefixes.some((prefix) => normalize(name).startsWith(normalize(prefix))));
  if (hits.length > 0) fail(`${label}: ${hits.join(", ")}`);
  ok(label);
}

async function loadOfferQualityRankingModule() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "offer-ranking-quality-"));

  const writePatchedCopy = (sourceRel, targetRel, replacements = []) => {
    let text = fs.readFileSync(path.join(root, sourceRel), "utf8");
    for (const [pattern, replacement] of replacements) {
      text = text.replace(pattern, replacement);
    }
    fs.writeFileSync(path.join(tempDir, targetRel), text, "utf8");
  };

  try {
    writePatchedCopy("web/src/utils/etaSanity.js", "etaSanity.js");
    writePatchedCopy("web/src/utils/safeDriveSummary.js", "safeDriveSummary.js", [
      [/from\s+["']\.\/etaSanity["']/g, 'from "./etaSanity.js"'],
    ]);
    writePatchedCopy("web/src/utils/offerQualityRanking.js", "offerQualityRanking.js", [
      [/from\s+["']\.\/safeDriveSummary["']/g, 'from "./safeDriveSummary.js"'],
    ]);

    return await import(pathToFileURL(path.join(tempDir, "offerQualityRanking.js")).href);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function normalizePath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((pathText) => normalizePath(pathText)))].sort(compareText);
}

function gitStatusEntries(paths) {
  const out = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { code, path: normalizePath(pathText), raw: line };
    });
}

function mustExactGitPaths(paths, expectedPaths, label) {
  const actual = sortedUniquePaths(gitStatusEntries(paths).map((entry) => entry.path));
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((pathText) => !expected.includes(pathText));
  const missing = expected.filter((pathText) => !actual.includes(pathText));
  if (unexpected.length > 0 || missing.length > 0) {
    fail(
      `${label}: ${[
        unexpected.length > 0 ? `unexpected=${unexpected.join(", ")}` : "",
        missing.length > 0 ? `missing=${missing.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("; ")}`
    );
  }
  ok(label);
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  if (actual !== String(expectedHash || "").toUpperCase()) {
    fail(`${label}: ${actual} != ${String(expectedHash || "").toUpperCase()}`);
  }
  ok(label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      fail(`${relPath}: unexpected bare CR`);
    }
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(`${relPath}: invalid UTF-8`);
  }
  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const actual = normalizedTextSha256(relPath);
  if (actual !== String(expectedHash || "").toUpperCase()) {
    fail(`${label}: ${actual} != ${String(expectedHash || "").toUpperCase()}`);
  }
  ok(label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(`${label}: not an ordinary directory`);
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") {
    fail(`${label}: unexpected contents=${entries.join(", ")}`);
  }
  ok(label);
}

const ACCEPTED_SCHEMA_PATH = "backend/prisma/schema.prisma";
const ACCEPTED_SCHEMA_SHA256 = "7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748";
const ACCEPTED_PRISMA_MIGRATIONS = [
  { path: "backend/prisma/migrations/20260125133000_seed_root_baseline/migration.sql", sha256: "27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD" },
  { path: "backend/prisma/migrations/20260125133100_organization_shift_import_baseline/migration.sql", sha256: "864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD" },
  { path: "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/migration.sql", sha256: "E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5" },
  { path: "backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/migration.sql", sha256: "6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB" },
  { path: "backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/migration.sql", sha256: "CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F" },
  { path: "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/migration.sql", sha256: "B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90" },
  { path: "backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/migration.sql", sha256: "734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005" },
  { path: "backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/migration.sql", sha256: "85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17" },
  { path: "backend/prisma/migrations/20260731120000_financial_operations_persistence_01/migration.sql", sha256: "3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0" },
  { path: "backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/migration.sql", sha256: "24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198" },
  { path: "backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/migration.sql", sha256: "A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202" },
  { path: "backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/migration.sql", sha256: "0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A" },
  { path: "backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/migration.sql", sha256: "D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF" },
  { path: "backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/migration.sql", sha256: "8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A" },
  { path: "backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/migration.sql", sha256: "F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A" },
  { path: "backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/migration.sql", sha256: "025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0" },
  { path: "backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/migration.sql", sha256: "D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E" },
  { path: "backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/migration.sql", sha256: "C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54" },
  { path: "backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/migration.sql", sha256: "FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D" },
  { path: "backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/migration.sql", sha256: "E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90" },
  { path: "backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/migration.sql", sha256: "7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007" },
  { path: "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/migration.sql", sha256: "285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27" },
  { path: "backend/prisma/migrations/20260801211000_room_company_cleanup_01/migration.sql", sha256: "E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5" },
  { path: "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/migration.sql", sha256: "3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36" },
  { path: "backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/migration.sql", sha256: "59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA" },
  { path: "backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/migration.sql", sha256: "F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528" },
  { path: "backend/prisma/migrations/20260801215000_consent_surface_bridge_01/migration.sql", sha256: "423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581" },
  { path: "backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/migration.sql", sha256: "252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79" },
  { path: "backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/migration.sql", sha256: "168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F" },
  { path: "backend/prisma/migrations/20260801217000_personel_credential_bridge_01/migration.sql", sha256: "BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC" },
  { path: "backend/prisma/migrations/20260801218000_operational_fk_bridge_01/migration.sql", sha256: "2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924" },
  { path: "backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/migration.sql", sha256: "939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5" },
];
const ACCEPTED_PRISMA_FILES = [
  { path: ACCEPTED_SCHEMA_PATH, sha256: ACCEPTED_SCHEMA_SHA256 },
  ...ACCEPTED_PRISMA_MIGRATIONS,
];
const ACCEPTED_PRISMA_PATHS = ACCEPTED_PRISMA_FILES.map((entry) => entry.path);

async function main() {
  console.log("=== OFFER-RANKING-QUALITY-01 CHECK ===");

  const pkg = read("package.json");
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
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const approvedRouteEntries = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) =>
    entryPath.startsWith("backend/src/routes/"),
  );
  const approvedServiceEntries = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) =>
    entryPath.startsWith("backend/src/services/"),
  );

  must(pkg, '"check:offerrankingquality01": "node backend/scripts/offer_ranking_quality_01_check.js"', "package.json exposes offer ranking quality check");
  assertProductExtensionsIncludes("check:offerrankingquality01", "product extensions registry includes offer ranking quality check", registryScripts);
  assertProductExtensionsOrder(["check:safedrive01", "check:offerrankingquality01", "check:pay01e"], "product extensions registry places offer ranking quality after safe drive", registryScripts);

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

  const { buildOfferQualityRanking } = await loadOfferQualityRankingModule();
  mustCondition(typeof buildOfferQualityRanking === "function", "offer ranking helper exports buildOfferQualityRanking");

  const readySafeDrive = {
    status: "READY",
    summaryText: "Güvenli sürüş özeti: canlı sinyaller uyumlu görünüyor.",
    nextBestAction: "Operasyon kontrol önerisi: canlı izlemeyi sürdür, uygulama yapma.",
    signals: [
      { label: "GPS güvenilirliği", value: "Canlı" },
      { label: "Hız riski", value: "Sınır içinde" },
      { label: "Rota ilerleme sinyali", value: "Normal" },
      { label: "Kanıt / check-in durumu", value: "Hazır" },
      { label: "Kaynak", value: "Canlı" },
    ],
    riskReasons: [],
    controlNotes: [],
  };

  const reviewSafeDrive = {
    status: "REVIEW_NEEDED",
    summaryText: "Kontrol edilmeli: sinyallerin bir kısmı eksik görünüyor.",
    nextBestAction: "İnsan onayı gerekir: önce GPS, hız ve rota sinyallerini birlikte kontrol et.",
    signals: [
      { label: "GPS güvenilirliği", value: "Kontrol edilmeli" },
      { label: "Hız riski", value: "Kontrol edilmeli" },
    ],
    riskReasons: [],
    controlNotes: ["GPS güncel değil"],
  };

  const riskySafeDrive = {
    status: "RISKY",
    summaryText: "Risk sinyali: GPS çevrim dışı. Kontrol edilmeli.",
    nextBestAction: "İnsan onayı gerekir: önce GPS, hız ve rota sinyallerini birlikte kontrol et.",
    signals: [
      { label: "GPS güvenilirliği", value: "Risk sinyali" },
      { label: "Hız riski", value: "Risk sinyali" },
    ],
    riskReasons: ["GPS çevrim dışı"],
    controlNotes: [],
  };

  const readyProof = {
    status: "READY_FOR_REVIEW",
    summaryText: "Kanıt / check-in hazır",
    nextAction: "Kanıtı incele ve sonraki adıma geç",
    checklist: [
      { done: true, label: "Kanıt" },
      { done: true, label: "Check-in" },
    ],
  };

  const readyDraft = {
    status: "DRAFT_READY_FOR_REVIEW",
    summaryText: "Taslak kalite skoru hazır",
    nextAction: "Taslak kaliteyi hazırla",
    checklist: [{ done: true, label: "Taslak" }],
  };

  const reviewedDecision = {
    reviewStatus: "REVIEWED",
    summaryText: "İncelendi",
    nextAction: "İnceleme kararını kontrol et",
    checklist: [{ done: true, label: "İnceleme" }],
  };

  const mkOffer = (overrides = {}) => ({
    id: overrides.id ?? 1,
    roomId: overrides.roomId ?? 11,
    amountCompany: overrides.amountCompany ?? 100,
    amountRoom: overrides.amountRoom ?? 120,
    updatedAt: overrides.updatedAt ?? "2026-08-01T10:00:00Z",
    room: { id: overrides.roomId ?? 11, name: overrides.roomName ?? "Room A" },
    shift: {
      status: overrides.shiftStatus ?? "ready",
      proofStatus: overrides.proofStatus ?? "READY",
      checkinStatus: overrides.checkinStatus ?? "READY",
      evidenceStatus: overrides.evidenceStatus ?? "READY",
      routeStatus: overrides.routeStatus ?? "READY",
      gpsSourceLabel: overrides.gpsSourceLabel ?? "GPS",
      providerStatus: overrides.providerStatus ?? "active",
      speedKmh: overrides.speedKmh ?? 40,
      speedLimitKmh: overrides.speedLimitKmh ?? 50,
    },
  });

  const normalComparable = buildOfferQualityRanking({
    offers: [
      mkOffer({ id: 1, roomId: 11, roomName: "Room A", amountCompany: 100, amountRoom: 120 }),
      mkOffer({ id: 2, roomId: 12, roomName: "Room B", amountCompany: 150, amountRoom: 140 }),
    ],
    roomScores: {
      11: { averageScore: 4.8, evaluationCount: 20, recommendRate: 95 },
      12: { averageScore: 4.2, evaluationCount: 10, recommendRate: 80 },
    },
    safeDriveSummary: readySafeDrive,
    proofSummary: readyProof,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "COMPANY" },
  });
  mustEqual(normalComparable.rows.map((row) => row.id), [1, 2], "case 1 normal comparable offers resolve deterministically");
  mustEqual(normalComparable.confidence, 77, "case 1 normal comparable offers keep confidence");
  mustEqual(normalComparable.rows[0].qualityLabel, "Kalite destekli teklif karşılaştırması", "case 1 normal comparable offers keep quality label");
  mustCondition(normalComparable.rows[0].comparisonSummary.includes("Güvenli sürüş özeti: canlı sinyaller uyumlu görünüyor."), "case 1 normal comparable offers keep safe-drive readiness");
  mustCondition(normalComparable.rows[0].humanApprovalRequired, "case 1 normal comparable offers keep human approval");
  mustCondition(normalComparable.rows[0].autoSelectionBlocked, "case 1 normal comparable offers keep auto-selection blocked");
  mustCondition(normalComparable.rows[0].autoAcceptBlocked, "case 1 normal comparable offers keep auto-accept blocked");
  mustCondition(normalComparable.rows[0].comparisonSummary.includes("Kanıt / check-in hazır"), "case 1 normal comparable offers keep evidence summary");
  mustEqual(normalComparable.nextReviewStep, "Operasyon kontrol önerisi: canlı izlemeyi sürdür, uygulama yapma.", "case 1 normal comparable offers keep next review step");

  const betterQualityWins = buildOfferQualityRanking({
    offers: [
      mkOffer({ id: 1, roomId: 11, roomName: "Room A", amountCompany: 100, amountRoom: 120 }),
      mkOffer({ id: 2, roomId: 12, roomName: "Room B", amountCompany: 100, amountRoom: 120 }),
    ],
    roomScores: {
      11: { averageScore: 4.2, evaluationCount: 5, recommendRate: 80 },
      12: { averageScore: 4.9, evaluationCount: 25, recommendRate: 98 },
    },
    safeDriveSummary: readySafeDrive,
    proofSummary: readyProof,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "COMPANY" },
  });
  mustEqual(betterQualityWins.rows.map((row) => row.id), [2, 1], "case 2 better quality signal changes ranking appropriately");
  mustEqual(betterQualityWins.rows[0].roomScore.average, 4.9, "case 2 better quality signal preserves room score contribution");
  mustEqual(betterQualityWins.rows[0].roomScore.evaluationCount, 25, "case 2 better quality signal keeps evaluation count");

  const priceSafety = buildOfferQualityRanking({
    offers: [
      mkOffer({ id: 1, amountCompany: 100, amountRoom: 90, providerStatus: "offline", gpsSourceLabel: "Offline" }),
      mkOffer({ id: 2, amountCompany: 100, amountRoom: 120, providerStatus: "active", gpsSourceLabel: "GPS" }),
    ],
    roomScores: {
      11: { averageScore: 4.9, evaluationCount: 25, recommendRate: 98 },
      12: { averageScore: 4.2, evaluationCount: 10, recommendRate: 80 },
    },
    safeDriveSummary: readySafeDrive,
    proofSummary: readyProof,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "COMPANY" },
  });
  mustEqual(priceSafety.rows.map((row) => row.id), [2, 1], "case 3 price signal contributes but does not bypass safety");
  mustEqual(priceSafety.rows[0].priceSignal.value, "+20 ₺", "case 3 safe offer keeps visible price signal");
  mustEqual(priceSafety.rows[1].priceSignal.value, "-10 ₺", "case 3 risky cheaper offer keeps visible price signal");
  mustEqual(priceSafety.rows[1].qualityLabel, "Risk sinyali", "case 3 risky cheaper offer remains risky");
  mustCondition(priceSafety.rows[0].comparisonSummary.includes("Güvenli sürüş özeti: canlı sinyaller uyumlu görünüyor."), "case 3 safety contract keeps ready safe-drive summary");

  const proofPresent = buildOfferQualityRanking({
    offers: [mkOffer({ id: 1 }), mkOffer({ id: 2 })],
    roomScores: {
      11: { averageScore: 4.8, evaluationCount: 20, recommendRate: 95 },
      12: { averageScore: 4.2, evaluationCount: 10, recommendRate: 80 },
    },
    safeDriveSummary: readySafeDrive,
    proofSummary: readyProof,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "COMPANY" },
  });
  const proofMissing = buildOfferQualityRanking({
    offers: [mkOffer({ id: 1 }), mkOffer({ id: 2 })],
    roomScores: {
      11: { averageScore: 4.8, evaluationCount: 20, recommendRate: 95 },
      12: { averageScore: 4.2, evaluationCount: 10, recommendRate: 80 },
    },
    safeDriveSummary: readySafeDrive,
    proofSummary: null,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "COMPANY" },
  });
  mustCondition(proofPresent.missingSignals.length === 0, "case 4 proof/evidence present keeps missing signals empty");
  mustCondition(proofPresent.rows[0].comparisonSummary.includes("Kanıt / check-in hazır"), "case 4 proof/evidence present keeps proof summary");
  mustCondition(proofMissing.missingSignals.includes("Check-in / evidence readiness"), "case 5 proof/evidence missing keeps missing signal");
  mustCondition(proofPresent.confidence > proofMissing.confidence, "case 5 proof/evidence missing lowers confidence safely");
  mustEqual(proofMissing.rows[0].summaryText, "İnceleme önerilir.", "case 5 proof/evidence missing keeps low-confidence summary");

  const reviewNeeded = buildOfferQualityRanking({
    offers: [
      mkOffer({ id: 1, providerStatus: "pending", gpsSourceLabel: "pending" }),
      mkOffer({ id: 2 }),
    ],
    safeDriveSummary: reviewSafeDrive,
    proofSummary: readyProof,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "COMPANY" },
  });
  mustEqual(reviewNeeded.rows.map((row) => row.id), [2, 1], "case 6 review-needed signal keeps safer row first");
  mustEqual(reviewNeeded.rows[1].qualityLabel, "Risk sinyali", "case 6 review-needed signal keeps risk label");
  mustCondition(reviewNeeded.rows[1].nextReviewStep.includes("Kaynak kontrol edilmeli"), "case 6 review-needed signal keeps approval boundary");
  mustEqual(reviewNeeded.confidence, 38, "case 6 review-needed signal keeps confidence bounded");

  const missingSignalsNoFalseHigh = buildOfferQualityRanking({
    offers: [
      mkOffer({ id: 1, updatedAt: "2026-08-01T09:00:00Z" }),
      mkOffer({ id: 2, updatedAt: "2026-08-01T09:00:00Z" }),
    ],
    safeDriveSummary: readySafeDrive,
    proofSummary: readyProof,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "SUPER_ADMIN" },
  });
  mustEqual(missingSignalsNoFalseHigh.confidence, 50, "case 7 missing signals do not create false high confidence");
  mustEqual(missingSignalsNoFalseHigh.qualityLabel, "İnceleme önerilir", "case 7 missing signals keep low-information label");

  const tiedDeterministic = buildOfferQualityRanking({
    offers: [mkOffer({ id: 1, updatedAt: "2026-08-01T09:00:00Z" }), mkOffer({ id: 2, updatedAt: "2026-08-01T09:00:00Z" })],
    safeDriveSummary: readySafeDrive,
    proofSummary: readyProof,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "SUPER_ADMIN" },
  });
  mustEqual(tiedDeterministic.rows.map((row) => row.id), [1, 2], "case 8 equal offers resolve deterministically");

  mustCondition(normalComparable.rows[0].positiveSignals.includes("Kanıt / check-in hazır"), "case 9 room score contribution keeps positive signals visible");
  mustCondition(normalComparable.positiveSignals.includes("Telematics hazır"), "case 9 room score contribution keeps telematics signal visible");
  mustCondition(normalComparable.rows[0].comparisonSummary.includes("Kanıt / check-in hazır"), "case 10 safe-drive/evidence signal contribution preserved");
  mustCondition(normalComparable.rows[0].humanApprovalRequired, "case 11 readonly result keeps human approval required");
  mustCondition(normalComparable.rows[0].autoSelectionBlocked, "case 11 readonly result keeps auto-selection blocked");
  mustCondition(normalComparable.rows[0].autoAcceptBlocked, "case 11 readonly result keeps auto-accept blocked");
  const riskyApproval = buildOfferQualityRanking({
    offers: [mkOffer({ id: 1, shiftStatus: "RISKY", providerStatus: "offline", gpsSourceLabel: "Offline" })],
    proofSummary: readyProof,
    draftScoreSummary: readyDraft,
    reviewDecisionSummary: reviewedDecision,
    summaryParams: { role: "COMPANY" },
  });
  mustCondition(riskyApproval.nextReviewStep.includes("İnsan onayı gerekir"), "case 12 human approval remains required");

  mustStatusEmptyOrExactlyWithIdentity(["backend/src/routes", "backend/src/services"], [...approvedRouteEntries, ...approvedServiceEntries], "backend route/service status stays current-head approved");
  mustDiffEmptyOrExactlyWithIdentity(["backend/prisma", "prisma"], [], "backend prisma diff stays empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.posix.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  if (cachedNames.length !== 0) fail(`stage stays empty: ${cachedNames.join(", ")}`);
  ok("stage stays empty");
  mustNoStagedPrefix(cachedNames, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== OFFER-RANKING-QUALITY-01 CHECK PASS ===");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
