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
  console.log("=== TELEMATICS-PROVIDER-HUB-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
  const doc = read("docs/TELEMATICS_PROVIDER_HUB_01.md");
  const superAdmin = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
  const roomTelematics = read("web/src/panels/room/roomVehiclesPanelSections.jsx");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const cachedNames = gitCachedNames();

  must(pkg, '"check:telematicsproviderhub01": "node backend/scripts/telematics_provider_hub_01_check.js"', "package.json exposes telematics provider hub check");
  ordered(runner, ["check:m44telematicst1t5", "check:telematicsproviderhub01", "check:pay01e"], "product extensions runner places telematics provider hub after M44");
  ordered(verify, ["check:m44telematicst1t5", "check:telematicsproviderhub01", "check:pay01e"], "verify chain places telematics provider hub after M44");

  must(guide, "TELEMATICS-PROVIDER-HUB-01", "milestone guide mentions telematics provider hub milestone");
  must(guide, "check:telematicsproviderhub01", "milestone guide exposes telematics provider hub check");
  must(guide, "node backend\\scripts\\telematics_provider_hub_01_check.js", "milestone guide includes telematics provider hub command");
  must(guide, "docs/TELEMATICS_PROVIDER_HUB_01.md", "milestone guide includes telematics provider hub doc");
  ordered(guide, ["M44-TELEMATICS-T1-T5", "TELEMATICS-PROVIDER-HUB-01", "SAFE-DRIVE-01"], "milestone guide keeps telematics provider hub after M44 before safe drive");

  must(primer, "TELEMATICS-PROVIDER-HUB-01", "primer mentions telematics provider hub milestone");
  must(primer, "docs/TELEMATICS_PROVIDER_HUB_01.md", "primer links telematics provider hub doc");
  must(primer, "provider-agnostic telematics hub", "primer keeps telematics hub wording");
  must(primer, "readonly telematics signals", "primer keeps readonly telematics wording");

  must(roadmap, "TELEMATICS-PROVIDER-HUB-01", "roadmap keeps telematics provider hub milestone");
  must(roadmap, "provider-agnostic GPS provider hub", "roadmap keeps provider-agnostic telematics hub wording");
  ordered(roadmap, ["M44-TELEMATICS-T1-T5", "TELEMATICS-PROVIDER-HUB-01", "SAFE-DRIVE-01", "OFFER-RANKING-QUALITY-01"], "roadmap keeps telematics hub before safe drive and offer ranking");

  must(doc, "# TELEMATICS-PROVIDER-HUB-01", "telematics provider hub doc title present");
  must(doc, "provider-agnostic", "telematics provider hub doc keeps provider-agnostic wording");
  must(doc, "GPS provider adapter", "telematics provider hub doc keeps GPS provider adapter wording");
  must(doc, "vehicle tracking software", "telematics provider hub doc keeps vehicle tracking software wording");
  must(doc, "normalized telematics event", "telematics provider hub doc keeps normalized event wording");
  must(doc, "provider registry", "telematics provider hub doc keeps provider registry wording");
  must(doc, "webhook", "telematics provider hub doc keeps webhook wording");
  must(doc, "polling", "telematics provider hub doc keeps polling wording");
  must(doc, "file/CSV/Excel import", "telematics provider hub doc keeps file import wording");
  must(doc, "deviceId / IMEI / plate mapping", "telematics provider hub doc keeps device mapping wording");
  must(doc, "no provider secret in repo", "telematics provider hub doc keeps provider secret boundary");
  must(doc, "no real provider integration in this milestone", "telematics provider hub doc keeps no real provider boundary");
  must(doc, "no Prisma/schema/migration", "telematics provider hub doc keeps Prisma boundary");
  must(doc, "readonly T1-T5 boundary", "telematics provider hub doc keeps readonly boundary");
  must(doc, "kullanıcı GPS entegrasyon akışı", "telematics provider hub doc keeps user GPS flow");
  must(doc, "Ayarlar / Telematik Entegrasyonları", "telematics provider hub doc keeps settings screen wording");
  must(doc, "test bağlantısı", "telematics provider hub doc keeps connection test wording");
  must(doc, "cihaz eşleştirme", "telematics provider hub doc keeps device matching wording");
  must(doc, "plaka / IMEI / deviceId mapping", "telematics provider hub doc keeps plate IMEI deviceId mapping wording");
  must(doc, "eşleşmeyen cihazlar", "telematics provider hub doc keeps unmatched devices wording");
  must(doc, "entegrasyon durumu", "telematics provider hub doc keeps integration status wording");
  must(doc, "secret/API key/token repo'ya yazılmaz", "telematics provider hub doc keeps secret boundary wording");
  must(doc, "readonly telematics signals", "telematics provider hub doc keeps readonly telematics signals wording");
  must(doc, "NOT_CONNECTED", "telematics provider hub doc keeps integration statuses");
  must(doc, "CONFIG_REQUIRED", "telematics provider hub doc keeps config required status");
  must(doc, "TESTING", "telematics provider hub doc keeps testing status");
  must(doc, "READY", "telematics provider hub doc keeps ready status");
  must(doc, "ACTIVE", "telematics provider hub doc keeps active status");
  must(doc, "ERROR", "telematics provider hub doc keeps error status");
  must(doc, "DISABLED", "telematics provider hub doc keeps disabled status");
  must(doc, "MATCHED", "telematics provider hub doc keeps matched status");
  must(doc, "NEEDS_REVIEW", "telematics provider hub doc keeps needs review status");
  must(doc, "UNMATCHED", "telematics provider hub doc keeps unmatched status");
  must(doc, "DUPLICATE_MATCH", "telematics provider hub doc keeps duplicate match status");

  must(superAdmin, "Telematik / GPS Sağlayıcıları", "super admin panel exposes telematics provider hub card");
  must(superAdmin, "Ayarlar / Telematik Entegrasyonları", "super admin panel keeps settings screen wording");
  must(superAdmin, "test bağlantısı", "super admin panel keeps connection test wording");
  must(superAdmin, "provider registry", "super admin panel keeps provider registry wording");
  must(superAdmin, "provider key/name", "super admin panel keeps provider key/name wording");
  must(superAdmin, "last data time", "super admin panel keeps last data time wording");
  must(superAdmin, "data delay", "super admin panel keeps data delay wording");
  must(superAdmin, "matched vehicle count", "super admin panel keeps matched vehicle count wording");
  must(superAdmin, "unmatched device count", "super admin panel keeps unmatched device count wording");
  must(superAdmin, "error count", "super admin panel keeps error count wording");
  must(superAdmin, "health status", "super admin panel keeps health status wording");
  must(superAdmin, "NOT_CONNECTED", "super admin panel keeps integration statuses");
  must(superAdmin, "CONFIG_REQUIRED", "super admin panel keeps config required status");
  must(superAdmin, "TESTING", "super admin panel keeps testing status");
  must(superAdmin, "READY", "super admin panel keeps ready status");
  must(superAdmin, "ACTIVE", "super admin panel keeps active status");
  must(superAdmin, "ERROR", "super admin panel keeps error status");
  must(superAdmin, "DISABLED", "super admin panel keeps disabled status");
  must(superAdmin, "secret/API key/token repo'ya yazılmaz", "super admin panel keeps secret boundary wording");
  must(superAdmin, "readonly telematics signals", "super admin panel keeps readonly telematics signals wording");

  must(roomTelematics, "GPS Eşleştirme / Telematik Bağlantısı", "room vehicles telematics section exposes provider hub readiness card");
  must(roomTelematics, "Ayarlar / Telematik Entegrasyonları", "room vehicles telematics section keeps settings screen wording");
  must(roomTelematics, "test bağlantısı", "room vehicles telematics section keeps connection test wording");
  must(roomTelematics, "cihaz eşleştirme", "room vehicles telematics section keeps device matching wording");
  must(roomTelematics, "plaka / IMEI / deviceId mapping", "room vehicles telematics section keeps plate IMEI deviceId mapping wording");
  must(roomTelematics, "eşleşmeyen cihazlar", "room vehicles telematics section keeps unmatched devices wording");
  must(roomTelematics, "entegrasyon durumu", "room vehicles telematics section keeps integration status wording");
  must(roomTelematics, "secret/API key/token repo'ya yazılmaz", "room vehicles telematics section keeps secret boundary wording");
  must(roomTelematics, "readonly telematics signals", "room vehicles telematics section keeps readonly telematics signals wording");
  must(roomTelematics, "MATCHED", "room vehicles telematics section keeps matched status");
  must(roomTelematics, "NEEDS_REVIEW", "room vehicles telematics section keeps needs review status");
  must(roomTelematics, "UNMATCHED", "room vehicles telematics section keeps unmatched status");
  must(roomTelematics, "DUPLICATE_MATCH", "room vehicles telematics section keeps duplicate match status");
  must(roomTelematics, "DISABLED", "room vehicles telematics section keeps disabled status");

  must(harnessCheck, "check:telematicsproviderhub01", "script harness check knows telematics provider hub alias");
  must(harnessCheck, "telematics_provider_hub_01_check.js", "script harness check knows telematics provider hub file");
  must(harnessCheck, "TELEMATICS-PROVIDER-HUB-01", "script harness check knows telematics provider hub milestone");
  must(harnessDoc, "root:check:telematicsproviderhub01", "script harness doc lists telematics provider hub root check");
  must(harnessDoc, "telematics_provider_hub_01_check.js", "script harness doc lists telematics provider hub check");
  must(harnessDoc, "docs/TELEMATICS_PROVIDER_HUB_01.md", "script harness doc lists telematics provider hub doc");
  must(harnessDoc, "TELEMATICS-PROVIDER-HUB-01", "script harness doc lists telematics provider hub milestone");

  mustNoDiff(["backend/src/routes", "backend/src/services", "backend/prisma", "prisma"], "backend route/service/schema and Prisma diff stays empty");
  mustNoStagedPrefix(cachedNames, ["backend/src/routes/", "backend/src/services/", "backend/prisma/", "prisma/"], "backend route/service/schema and Prisma stay unstaged");
  mustNoStagedPrefix(cachedNames, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== TELEMATICS-PROVIDER-HUB-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
