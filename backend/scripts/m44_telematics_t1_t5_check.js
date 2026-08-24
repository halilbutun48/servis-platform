#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";
import {
  assertProductExtensionsIncludes,
  assertProductExtensionsOrder,
  productExtensionsChecks,
} from "./lib/productExtensionsRegistry.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";

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

function mustAny(text, needles, label) {
  if (needles.some((needle) => normalize(text).includes(normalize(needle)))) {
    ok(label);
    return;
  }
  fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) fail(`${label}: missing ${needle}`);
    cursor = index + target.length;
  }
  ok(label);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustNoDiff(paths, label) {
  const files = gitLines(["diff", "--name-only", "--", ...paths]);
  if (files.length > 0) fail(`${label}: ${files.join(", ")}`);
  ok(label);
}
function gitDiffNames(paths) {
  return gitLines(["diff", "--name-only", "--", ...paths]);
}
function mustNoDiffExcept(paths, allowedFiles, label) {
  const files = gitDiffNames(paths).filter((file) => !allowedFiles.includes(file));
  if (files.length > 0) {
    fail(`${label}: ${files.join(', ')}`);
  }
  ok(label);
}
function mustNoStagedPrefix(prefixes, label) {
  const staged = gitLines(["diff", "--cached", "--name-only"]);
  const hits = staged.filter((name) => prefixes.some((prefix) => normalize(name).startsWith(normalize(prefix))));
  if (hits.length > 0) fail(`${label}: ${hits.join(", ")}`);
  ok(label);
}

function main() {
  console.log("=== M44 TELEMATICS T1/T5 CHECK ===");

  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
  const backlog = read("docs/NEXT_BACKLOG_V1.md");
  const registry = read("docs/MILESTONE_REGISTRY_V1.md");
  const state = read("tools/repo_contract_state.json");
  const doc = read("docs/M44_TELEMATICS_T1_T5.md");
  const apiSpec = read("docs/API_SPEC_V1.md");
  const schema = read("docs/DB_SCHEMA_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const legacyPack = read("backend/scripts/m44_telematics_check.js");
  const helperCheck = read("backend/scripts/ux_room_vehicles_telematics_counts_fix_check.js");
  const telematicsRoute = read("backend/src/routes/telematics.js");
  const telematicsService = read("backend/src/telematics/service.js");
  const telematicsProviders = read("backend/src/telematics/providers.js");
  const telematicsHash = read("backend/src/telematics/hash.js");
  const vehiclesPanel = read("web/src/panels/room/VehiclesPanel.jsx");
  const etaSanity = read("web/src/utils/etaSanity.js");
  const gpsVisibility = read("web/src/utils/gpsSourceVisibility.js");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:m44telematicst1t5": "node backend/scripts/m44_telematics_t1_t5_check.js"', "package.json exposes check:m44telematicst1t5");
  assertProductExtensionsIncludes("check:m44telematicst1t5", "product extensions registry includes M44 telematics check", registryScripts);
  assertProductExtensionsOrder([
    "check:marketplacefreetooperate01",
    "check:m44telematicst1t5",
    "check:pay01e",
  ], "product extensions registry places M44 telematics after marketplace free-to-operate", registryScripts);

  must(guide, "M44-TELEMATICS-T1-T5", "milestone guide mentions M44 telematics T1/T5");
  must(guide, "check:m44telematicst1t5", "milestone guide exposes M44 telematics T1/T5 check");
  must(guide, "node backend\\scripts\\m44_telematics_t1_t5_check.js", "milestone guide includes M44 telematics T1/T5 command");
  must(guide, "docs/M44_TELEMATICS_T1_T5.md", "milestone guide includes M44 telematics T1/T5 doc");

  must(primer, "M44-TELEMATICS-T1-T5", "primer mentions M44 telematics T1/T5");
  must(primer, "docs/M44_TELEMATICS_T1_T5.md", "primer links M44 telematics T1/T5 doc");

  must(roadmap, "M44-TELEMATICS-T1-T5", "roadmap keeps M44 telematics T1/T5");
  must(roadmap, "SAFE-DRIVE-01", "roadmap keeps safe drive next step");
  must(roadmap, "OFFER-RANKING-QUALITY-01", "roadmap keeps offer ranking quality next step");

  must(backlog, "M44-T1/T5", "backlog keeps compatibility alias for M44 telematics");
  must(registry, "M44-T1/T5", "registry keeps compatibility alias for M44 telematics");
  must(state, "M44-T1/T5", "repo contract state keeps compatibility alias for M44 telematics");

  must(doc, "# M44-TELEMATICS-T1-T5", "telematics baseline doc title present");
  must(doc, "read-only baseline", "telematics baseline doc keeps read-only wording");
  must(doc, "T1", "telematics baseline doc includes T1");
  must(doc, "T2", "telematics baseline doc includes T2");
  must(doc, "T3", "telematics baseline doc includes T3");
  must(doc, "T4", "telematics baseline doc includes T4");
  must(doc, "T5", "telematics baseline doc includes T5");
  must(doc, "compatibility alias", "telematics baseline doc mentions compatibility alias");
  must(doc, "backend route/service/schema", "telematics baseline doc keeps backend boundary");
  must(doc, "Prisma/migration", "telematics baseline doc keeps prisma boundary");
  must(doc, "runtime-data", "telematics baseline doc keeps runtime-data boundary");
  must(doc, "browser-smoke", "telematics baseline doc keeps browser-smoke boundary");
  must(doc, "SAFE-DRIVE-01", "telematics baseline doc names safe drive next step");
  must(doc, "OFFER-RANKING-QUALITY-01", "telematics baseline doc names offer ranking quality next step");
  must(doc, "check:m44telematicst1t5", "telematics baseline doc exposes check alias");
  must(doc, "check:m44_telematics_check", "telematics baseline doc mentions legacy M44 pack");
  must(doc, "tek bir GPS firmasına bağlı olmayan provider-agnostic telematics mimarisini hedefler", "telematics baseline doc keeps provider-agnostic vision");
  must(doc, "adapter contract üzerinden", "telematics baseline doc keeps adapter contract vision");
  must(doc, "normalized telematics event formatına", "telematics baseline doc keeps normalized event vision");
  must(doc, "gerçek provider entegrasyonu açılmaz", "telematics baseline doc keeps no-real-provider boundary");
  must(doc, "adapter mimarisi, normalized event sözleşmesi ve readonly T1-T5 risk/quality sınırı kilitlenir", "telematics baseline doc keeps readonly risk boundary");
  must(doc, "GPS provider adapter", "telematics baseline doc keeps gps provider adapter wording");
  must(doc, "vehicle tracking software", "telematics baseline doc keeps vehicle tracking software wording");
  must(doc, "provider registry", "telematics baseline doc keeps provider registry wording");
  must(doc, "providerId", "telematics baseline doc keeps providerId field");
  must(doc, "providerName", "telematics baseline doc keeps providerName field");
  must(doc, "externalDeviceId", "telematics baseline doc keeps externalDeviceId field");
  must(doc, "eventTime", "telematics baseline doc keeps eventTime field");
  must(doc, "receivedAt", "telematics baseline doc keeps receivedAt field");
  must(doc, "sourceType: webhook / polling / file / manual / tcp-bridge", "telematics baseline doc keeps sourceType field family");
  must(doc, "quality flags", "telematics baseline doc keeps quality flags field");
  must(doc, "stale/offline/live status", "telematics baseline doc keeps stale/offline/live status");
  must(doc, "error/warning notes", "telematics baseline doc keeps error and warning notes");
  must(doc, "provider key/name", "telematics baseline doc keeps provider key/name");
  must(doc, "supported connection type", "telematics baseline doc keeps supported connection type");
  must(doc, "connection status: NOT_CONNECTED / READY / ACTIVE / ERROR / DISABLED", "telematics baseline doc keeps registry statuses");
  must(doc, "last data time", "telematics baseline doc keeps last data time");
  must(doc, "data delay", "telematics baseline doc keeps data delay");
  must(doc, "matched vehicle count", "telematics baseline doc keeps matched vehicle count");
  must(doc, "unmatched device count", "telematics baseline doc keeps unmatched device count");
  must(doc, "error count", "telematics baseline doc keeps error count");
  must(doc, "health status", "telematics baseline doc keeps health status");
  must(doc, "file/CSV/Excel import", "telematics baseline doc keeps file/CSV/Excel import wording");
  must(doc, "deviceId / IMEI / plate mapping", "telematics baseline doc keeps device mapping wording");
  must(doc, "no provider secret in repo", "telematics baseline doc keeps provider secret boundary");
  must(doc, "no real provider integration in this milestone", "telematics baseline doc keeps no real provider boundary");
  must(doc, "no Prisma/schema/migration", "telematics baseline doc keeps no Prisma/schema/migration wording");
  must(doc, "readonly T1-T5 boundary", "telematics baseline doc keeps readonly T1-T5 boundary wording");
  must(doc, "kullanıcı GPS entegrasyon akışı", "telematics baseline doc keeps user GPS integration flow");
  must(doc, "Telematik Entegrasyonları", "telematics baseline doc keeps telematics integrations screen wording");
  must(doc, "test bağlantısı", "telematics baseline doc keeps connection test wording");
  must(doc, "cihaz eşleştirme", "telematics baseline doc keeps device matching wording");
  must(doc, "plaka / IMEI / deviceId mapping", "telematics baseline doc keeps plate IMEI deviceId mapping wording");
  must(doc, "eşleşmeyen cihazlar", "telematics baseline doc keeps unmatched device wording");
  must(doc, "entegrasyon durumu", "telematics baseline doc keeps integration status wording");
  must(doc, "secret/API key/token repo'ya yazılmaz", "telematics baseline doc keeps secret storage boundary wording");
  must(doc, "readonly telematics signals", "telematics baseline doc keeps readonly telematics signals wording");
  mustAny(doc, ["NOT_CONNECTED", "CONFIG_REQUIRED", "TESTING", "READY", "ACTIVE", "ERROR", "DISABLED"], "telematics baseline doc keeps integration statuses");
  mustAny(doc, ["MATCHED", "NEEDS_REVIEW", "UNMATCHED", "DUPLICATE_MATCH", "DISABLED"], "telematics baseline doc keeps vehicle matching statuses");
  must(doc, "TELEMATICS-PROVIDER-HUB-01", "telematics baseline doc keeps provider hub future milestone");
  must(doc, "TELEMATICS-PROVIDER-ADAPTER-CONTRACT-01", "telematics baseline doc keeps provider adapter contract future milestone");
  must(doc, "TELEMATICS-WEBHOOK-INGEST-01", "telematics baseline doc keeps webhook ingest future milestone");
  must(doc, "TELEMATICS-POLLING-CONNECTOR-01", "telematics baseline doc keeps polling connector future milestone");
  must(doc, "TELEMATICS-FILE-IMPORT-01", "telematics baseline doc keeps file import future milestone");
  must(doc, "TELEMATICS-DEVICE-MAPPING-01", "telematics baseline doc keeps device mapping future milestone");
  must(doc, "TELEMATICS-PROVIDER-HEALTH-DASHBOARD-01", "telematics baseline doc keeps provider health dashboard future milestone");
  must(doc, "TELEMATICS-NORMALIZED-EVENT-QUALITY-01", "telematics baseline doc keeps normalized event quality future milestone");

  must(apiSpec, "## M44 — Telematics", "API spec keeps M44 telematics section");
  must(apiSpec, "POST /api/telematics/push", "API spec keeps telematics push endpoint");
  must(apiSpec, "telematics:update", "API spec keeps telematics update event");

  must(schema, "## M44 — GpsDevice", "DB schema doc keeps M44 GpsDevice section");
  must(schema, "model GpsDevice", "DB schema doc keeps GpsDevice model");

  must(checklist, "M44 — Telematics", "checklist keeps M44 telematics green");

  must(legacyPack, "M44 TELEMATICS CHECK", "legacy M44 pack remains available");
  mustAny(legacyPack, ["POST /api/telematics/push", "POST /api/telematics/vendor/:provider", "/api/telematics/vendor/generic"], "legacy M44 pack keeps telematics runtime endpoints");
  must(helperCheck, "check:uxroomvehiclestelematicsfix", "room vehicle telematics counts fix check remains available");

  mustAny(telematicsRoute, ["r.get(\"/devices\")", "r.post(\"/devices\")", "r.post(\"/devices/:id/rotate\")", "r.post(\"/push\")", "r.post(\"/vendor/:provider\")", "/devices", "/push", "/vendor/:provider"], "telematics route exposes provisioning and push endpoints");
  mustAny(telematicsRoute, ["authRequired", "requireStepUpWrite", "requireRole", "ensureEnabled"], "telematics route keeps limiter guard");
  mustAny(telematicsService, ["GpsDevice", "GpsLast", "GpsPoint"], "telematics service keeps normalized GPS entities");
  mustAny(telematicsService, ["telematics:update", "GPS_DEVICE_INGEST", "GPS_VENDOR_INGEST"], "telematics service keeps ingest audit/event naming");
  mustAny(telematicsProviders, ["generic", "traccar"], "telematics providers keep supported adapters");
  must(telematicsHash, "hashTelematicsToken", "telematics hash helper remains available");

  mustAny(vehiclesPanel, ["RoomVehicleTelematicsSection", "telematicsCounts = {}", "telematicsRows = []"], "room vehicles panel keeps telematics section and safe fallback");
  mustAny(vehiclesPanel, ["Object.values(telematicsCounts || {})", "useRoomVehicleTelematics({"], "room vehicles panel keeps telematics summary wiring");
  mustAny(etaSanity, ["güncel değil", "hesaplanamıyor"], "ETA sanity helper keeps safe wording");
  mustAny(gpsVisibility, ["gpsSourceVisibilityTextFromVehicle", "gpsSourceLabelFromKey"], "GPS visibility helper keeps source visibility wording");

  mustNoDiffExceptWithIdentity(["backend/src/routes", "backend/src/services", "backend/src/telematics", "prisma"], CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF, "backend route/service/schema and Prisma diff limited to approved concurrent runtime paths");
  mustNoStagedPrefix(["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== M44 TELEMATICS T1/T5 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
