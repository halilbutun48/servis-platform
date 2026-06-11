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
  console.log("=== SAFE-DRIVE-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
  const doc = read("docs/SAFE_DRIVE_01.md");
  const helper = read("web/src/utils/safeDriveSummary.js");
  const card = read("web/src/panels/shared/SafeDriveSummaryCard.jsx");
  const driverRoute = read("web/src/panels/driver/RoutePanel.jsx");
  const driverMap = read("web/src/panels/driver/MapPanel.jsx");
  const companyMap = read("web/src/panels/company/MapPanel.jsx");
  const roomMap = read("web/src/panels/room/MapPanel.jsx");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const cachedNames = gitCachedNames();

  must(pkg, '"check:safedrive01": "node backend/scripts/safe_drive_01_check.js"', "package.json exposes safe drive check");
  ordered(runner, ["check:telematicsproviderhub01", "check:safedrive01", "check:pay01e"], "product extensions runner places safe drive after telematics provider hub");
  ordered(verify, ["check:telematicsproviderhub01", "check:safedrive01", "check:pay01e"], "verify chain places safe drive after telematics provider hub");

  must(guide, "SAFE-DRIVE-01", "milestone guide mentions safe drive milestone");
  must(guide, "check:safedrive01", "milestone guide exposes safe drive check");
  must(guide, "node backend\\scripts\\safe_drive_01_check.js", "milestone guide includes safe drive command");
  must(guide, "docs/SAFE_DRIVE_01.md", "milestone guide includes safe drive doc");
  must(guide, "Güvenli sürüş özeti", "milestone guide keeps safe drive copy");
  must(guide, "Risk sinyali", "milestone guide keeps risk signal wording");
  must(guide, "İnsan onayı gerekir", "milestone guide keeps approval wording");
  ordered(guide, ["M44-TELEMATICS-T1-T5", "TELEMATICS-PROVIDER-HUB-01", "SAFE-DRIVE-01"], "milestone guide keeps telematics provider hub before safe drive");

  must(primer, "SAFE-DRIVE-01", "primer mentions safe drive milestone");
  must(primer, "docs/SAFE_DRIVE_01.md", "primer links safe drive doc");
  must(primer, "readonly safe-drive risk summary", "primer keeps safe drive wording");
  must(primer, "Güvenli sürüş özeti", "primer keeps safe drive copy");

  must(roadmap, "SAFE-DRIVE-01", "roadmap keeps safe drive milestone");
  must(roadmap, "readonly safe-drive risk summary", "roadmap keeps safe drive summary wording");
  must(roadmap, "İnsan onayı gerekir", "roadmap keeps human approval wording");

  must(doc, "# SAFE-DRIVE-01", "safe drive doc title present");
  must(doc, "Güvenli sürüş özeti", "safe drive doc keeps summary wording");
  must(doc, "Risk sinyali", "safe drive doc keeps risk wording");
  must(doc, "Kontrol edilmeli", "safe drive doc keeps control wording");
  must(doc, "GPS güvenilirliği", "safe drive doc keeps GPS wording");
  must(doc, "Hız riski", "safe drive doc keeps speed wording");
  must(doc, "Rota ilerleme sinyali", "safe drive doc keeps route wording");
  must(doc, "Kanıt / check-in durumu", "safe drive doc keeps proof wording");
  must(doc, "Operasyon kontrol önerisi", "safe drive doc keeps control recommendation wording");
  must(doc, "İnsan onayı gerekir", "safe drive doc keeps human approval wording");
  must(doc, "M44-TELEMATICS-T1-T5", "safe drive doc keeps M44 anchor");
  must(doc, "TELEMATICS-PROVIDER-HUB-01", "safe drive doc keeps provider hub anchor");
  must(doc, "Rota uygulanmaz", "safe drive doc keeps readonly boundary");
  must(doc, "sürücü/araç ataması değiştirilmez", "safe drive doc keeps assignment boundary");
  must(doc, "ödeme/hakediş başlatılmaz", "safe drive doc keeps payment boundary");
  must(doc, "sözleşme bağlanmaz", "safe drive doc keeps contract boundary");
  must(doc, "otomatik yönlendirme verilmez", "safe drive doc keeps automation boundary");

  must(helper, "Güvenli sürüş özeti", "safe drive helper keeps summary wording");
  must(helper, "Risk sinyali", "safe drive helper keeps risk wording");
  must(helper, "Kontrol edilmeli", "safe drive helper keeps control wording");
  must(helper, "GPS güvenilirliği", "safe drive helper keeps GPS wording");
  must(helper, "Hız riski", "safe drive helper keeps speed wording");
  must(helper, "Rota ilerleme sinyali", "safe drive helper keeps route wording");
  must(helper, "Kanıt / check-in durumu", "safe drive helper keeps proof wording");
  must(helper, "Operasyon kontrol önerisi", "safe drive helper keeps control recommendation wording");
  must(helper, "İnsan onayı gerekir", "safe drive helper keeps human approval wording");
  must(helper, "normalizeGpsFreshness", "safe drive helper reuses GPS freshness helper");
  must(helper, "getGpsReliabilityLabel", "safe drive helper reuses GPS reliability helper");
  must(helper, "getGpsAgeText", "safe drive helper reuses GPS age helper");

  must(card, "SafeDriveSummaryCard", "safe drive card file exports card");
  must(card, "Güvenli sürüş özeti", "safe drive card keeps summary wording");
  must(card, "Risk sinyali", "safe drive card keeps risk wording");
  must(card, "Kontrol edilmeli", "safe drive card keeps control wording");
  must(card, "İnsan onayı gerekir", "safe drive card keeps human approval wording");
  must(card, "Kanıt / check-in durumu", "safe drive card keeps proof wording");

  must(driverRoute, "SafeDriveSummaryCard", "driver route panel wires safe drive card");
  must(driverRoute, "summaryParams", "driver route panel passes safe drive summary params");
  must(driverMap, "SafeDriveSummaryCard", "driver map panel wires safe drive card");
  must(driverMap, "summaryParams", "driver map panel passes safe drive summary params");
  must(companyMap, "SafeDriveSummaryCard", "company map panel wires safe drive card");
  must(companyMap, "summaryParams", "company map panel passes safe drive summary params");
  must(roomMap, "SafeDriveSummaryCard", "room map panel wires safe drive card");
  must(roomMap, "summaryParams", "room map panel passes safe drive summary params");

  must(harnessCheck, "check:safedrive01", "script harness check knows safe drive alias");
  must(harnessCheck, "safe_drive_01_check.js", "script harness check knows safe drive file");
  must(harnessCheck, "SAFE-DRIVE-01", "script harness check knows safe drive milestone");
  must(harnessCheck, "docs/SAFE_DRIVE_01.md", "script harness check knows safe drive doc");
  must(harnessCheck, "web/src/utils/safeDriveSummary.js", "script harness check knows safe drive helper");
  must(harnessCheck, "web/src/panels/shared/SafeDriveSummaryCard.jsx", "script harness check knows safe drive card");

  must(harnessDoc, "root:check:safedrive01", "script harness doc lists safe drive root check");
  must(harnessDoc, "safe_drive_01_check.js", "script harness doc lists safe drive check");
  must(harnessDoc, "docs/SAFE_DRIVE_01.md", "script harness doc lists safe drive doc");
  must(harnessDoc, "SAFE-DRIVE-01", "script harness doc lists safe drive milestone");
  must(harnessDoc, "web/src/utils/safeDriveSummary.js", "script harness doc lists safe drive helper");
  must(harnessDoc, "web/src/panels/shared/SafeDriveSummaryCard.jsx", "script harness doc lists safe drive card");

  mustNoDiff(["backend/src/routes", "backend/src/services", "backend/prisma", "prisma"], "backend route/service/schema and Prisma diff stays empty");
  mustNoStagedPrefix(cachedNames, ["backend/src/routes/", "backend/src/services/", "backend/prisma/", "prisma/"], "backend route/service/schema and Prisma stay unstaged");
  mustNoStagedPrefix(cachedNames, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== SAFE-DRIVE-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
