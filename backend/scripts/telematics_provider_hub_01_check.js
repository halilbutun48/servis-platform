#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";
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

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
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
function mustNoDiffExcept(paths, allowedFiles, label) {
  const files = gitDiffNames(paths).filter((file) => !allowedFiles.includes(file));
  if (files.length > 0) {
    fail(`${label}: ${files.join(', ')}`);
  }
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
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/TELEMATICS_PROVIDER_HUB_01.md");
  const navDock = read("web/src/utils/roleNavigation.js");
  const app = read("web/src/App.jsx");
  const superAdminOverview = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
  const telematicsHubPanel = read("web/src/panels/superadmin/TelematicsHubPanel.jsx");
  const roomTelematics = read("web/src/panels/room/roomVehiclesPanelSections.jsx");
  const roomRows = read("web/src/panels/room/roomVehiclesPanelRows.jsx");
  const roomHook = read("web/src/panels/room/useRoomVehicleTelematics.js");
  const vehiclesPanel = read("web/src/panels/room/VehiclesPanel.jsx");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const screenRegistry = read("web/src/copilot/screenRegistry.js");
  const screenCatalog = read("backend/src/ai/jobGuide/screenCatalog.js");
  const cachedNames = gitCachedNames();
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:telematicsproviderhub01": "node backend/scripts/telematics_provider_hub_01_check.js"', "package.json exposes telematics provider hub check");
  assertProductExtensionsIncludes("check:telematicsproviderhub01", "product extensions registry includes telematics provider hub check", registryScripts);
  assertProductExtensionsOrder(["check:m44telematicst1t5", "check:telematicsproviderhub01", "check:pay01e"], "product extensions registry places telematics provider hub after M44", registryScripts);

  must(guide, "TELEMATICS-PROVIDER-HUB-01", "milestone guide mentions telematics provider hub milestone");
  must(guide, "check:telematicsproviderhub01", "milestone guide exposes telematics provider hub check");
  must(guide, "node backend\\scripts\\telematics_provider_hub_01_check.js", "milestone guide includes telematics provider hub command");
  must(guide, "docs/TELEMATICS_PROVIDER_HUB_01.md", "milestone guide includes telematics provider hub doc");
  ordered(guide, ["M44-TELEMATICS-T1-T5", "TELEMATICS-PROVIDER-HUB-01", "SAFE-DRIVE-01"], "milestone guide keeps telematics provider hub after M44 before safe drive");

  must(doc, "# TELEMATICS-PROVIDER-HUB-01", "telematics provider hub doc title present");
  must(doc, "Telematik / GPS Sağlayıcıları", "telematics provider hub doc keeps super admin route label");
  must(doc, "provider katalogu", "telematics provider hub doc keeps provider catalog wording");
  must(doc, "adapter şablonları", "telematics provider hub doc keeps adapter template wording");
  must(doc, "security / KVKK", "telematics provider hub doc keeps security wording");
  must(doc, "room self-service", "telematics provider hub doc keeps room self-service wording");
  must(doc, "LIVE / STALE / OFFLINE", "telematics provider hub doc keeps freshness wording");
  must(doc, "plate / IMEI / deviceId / externalDeviceId / serial", "telematics provider hub doc keeps room matching fields");
  must(doc, "secret/token/API key", "telematics provider hub doc keeps secret boundary wording");
  must(doc, "no real provider integration", "telematics provider hub doc keeps no real provider boundary");
  must(doc, "no webhook ingest", "telematics provider hub doc keeps webhook ingest boundary");
  must(doc, "no polling job", "telematics provider hub doc keeps polling boundary");
  must(doc, "no TCP bridge", "telematics provider hub doc keeps TCP bridge boundary");
  must(doc, "no Prisma/schema/migration", "telematics provider hub doc keeps Prisma boundary");
  must(doc, "no backend route/service/schema", "telematics provider hub doc keeps backend boundary");
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
  must(navDock, "advanced:", "canonical navigation keeps advanced administration section");
  must(navDock, "Konum veri sağlayıcıları", "canonical navigation exposes telematics provider hub route");
  must(navDock, "Başvuru İncelemesi", "canonical navigation exposes onboarding review route");

  must(app, 'if (path === "/superadmin/telematics") return { layout: true, node: <SuperTelematicsHubPanel /> };', "App routes telematics hub panel");
  must(app, 'if (path === "/superadmin")', "App keeps super admin overview route");
  must(app, "<SuperAdminPanel />", "App keeps super admin overview panel");
  must(app, 'if (path === "/superadmin/onboarding-review") return { layout: true, node: <SuperPublicLeadReviewPanel /> };', "App keeps onboarding review route");
  must(app, 'if (path === "/superadmin/public-leads") return { layout: true, node: <SuperPublicLeadReviewPanel /> };', "App keeps public leads alias");

  must(superAdminOverview, "Entegrasyonlar özeti", "super admin overview keeps integrations summary");
  must(superAdminOverview, 'navigate("/superadmin/telematics")', "super admin overview links to telematics hub");
  must(superAdminOverview, "Başvuru İncelemesi", "super admin overview keeps onboarding quick access");
  mustNot(superAdminOverview, "TelematicsProviderHubCard", "super admin overview no longer renders the old telematics hub card");
  mustNot(superAdminOverview, "goToTelematicsHub", "super admin overview no longer scrolls to telematics hub");
  mustNot(superAdminOverview, "telematicsHubRef", "super admin overview no longer keeps telematics ref");

  must(telematicsHubPanel, "Konum veri sağlayıcıları", "telematics hub panel title present");
  must(telematicsHubPanel, "Sağlayıcı kataloğu", "telematics hub panel keeps provider catalog wording");
  must(telematicsHubPanel, "Bağlantı tipleri", "telematics hub panel keeps connection type wording");
  must(telematicsHubPanel, "Şablon durumu", "telematics hub panel keeps readiness wording");
  must(telematicsHubPanel, "Güvenlik / KVKK", "telematics hub panel keeps security wording");
  must(telematicsHubPanel, "Gizli anahtar politikası", "telematics hub panel keeps secret policy wording");
  must(telematicsHubPanel, "Veri bildirimi doğrulaması", "telematics hub panel keeps webhook signature wording");
  must(telematicsHubPanel, "İstek sınırı", "telematics hub panel keeps rate limit wording");
  must(telematicsHubPanel, "İzinli ağ listesi", "telematics hub panel keeps IP allowlist wording");
  must(telematicsHubPanel, "KVKK / veri minimizasyonu", "telematics hub panel keeps KVKK wording");
  must(telematicsHubPanel, "Ham veriyi maskeleme", "telematics hub panel keeps payload masking wording");
  must(telematicsHubPanel, "Özel sağlayıcı incelemesi", "telematics hub panel keeps review wording");
  must(telematicsHubPanel, "Taşımacılık Firması işlemleri notu", "telematics hub panel keeps room self-service note");
  must(telematicsHubPanel, "onboarding-review", "telematics hub panel links review queue");
  must(telematicsHubPanel, "Genel Bakış", "telematics hub panel keeps overview fallback wording");
  must(telematicsHubPanel, "Taşımacılık Firması kendi konum hesabını yalnızca onaylı sağlayıcı kataloğu üzerinden bağlar", "telematics hub panel keeps room self-service boundary");

  must(roomTelematics, "GPS eşleştirme / cihaz bağlantısı", "room telematics keeps matching title");
  must(roomTelematics, "Onaylı veri sağlayıcısı kataloğu", "room telematics keeps approved provider catalog wording");
  must(roomTelematics, "Veri sağlayıcısı kataloğu ve güvenlik kuralları Süper Yönetici tarafından yönetilir.", "room telematics keeps super admin boundary note");
  must(roomTelematics, "Eşleştirme hazırlığı", "room telematics keeps preparation CTA");
  must(roomTelematics, "Test eşleştirme", "room telematics keeps test CTA");
  must(roomTelematics, "IMEI", "room telematics keeps imei field");
  must(roomTelematics, "deviceId", "room telematics keeps deviceId field");
  must(roomTelematics, "externalDeviceId", "room telematics keeps externalDeviceId field");
  must(roomTelematics, "Serial", "room telematics keeps serial field");
  must(roomTelematics, "Bağlı değil", "room telematics keeps freshness status wording");
  must(roomTelematics, "Gizli erişim anahtarı görünmez.", "room telematics keeps secret boundary wording");
  must(roomTelematics, "RoomTelematicsReadinessCard", "room telematics keeps readiness card");
  must(roomTelematics, "Taşımacılık Firması kendi GPS hesabını onaylı sağlayıcı kataloğu üzerinden bağlar", "room telematics keeps room self-service wording");
  must(roomTelematics, "Plaka", "room telematics keeps plate field");
  must(roomTelematics, "Veri sağlayıcısı", "room telematics keeps provider field");

  must(roomRows, "İnceleme için hazırla", "room telematics rows keep review action");
  mustNot(roomRows, "Token rotate", "room telematics rows no longer show token rotate wording");
  mustNot(roomRows, "Device ekle", "room telematics rows no longer show device ekle wording");

  must(roomHook, "Eşleştirme hazırlığı kaydedildi", "room telematics hook keeps matching prep toast");
  must(roomHook, "İnceleme için hazırlandı", "room telematics hook keeps review toast");
  mustNot(roomHook, "tokenReveal", "room telematics hook no longer exposes token reveal state");
  mustNot(roomHook, "copyToken", "room telematics hook no longer exposes token copy flow");

  must(vehiclesPanel, "GPS eşleştirme detayları", "vehicles panel keeps updated telematics tab title");
  must(vehiclesPanel, "Onaylı veri sağlayıcısı, eşleştirme alanları ve son veri görünümü.", "vehicles panel keeps updated telematics subtitle");
  mustNot(vehiclesPanel, "tokenReveal", "vehicles panel no longer wires token reveal");
  mustNot(vehiclesPanel, "copyToken", "vehicles panel no longer wires token copy");

  must(harnessCheck, "check:telematicsproviderhub01", "script harness check knows telematics provider hub alias");
  must(harnessCheck, "telematics_provider_hub_01_check.js", "script harness check knows telematics provider hub file");
  must(harnessCheck, "TELEMATICS-PROVIDER-HUB-01", "script harness check knows telematics provider hub milestone");
  must(harnessDoc, "root:check:telematicsproviderhub01", "script harness doc lists telematics provider hub root check");
  must(harnessDoc, "telematics_provider_hub_01_check.js", "script harness doc lists telematics provider hub check");
  must(harnessDoc, "docs/TELEMATICS_PROVIDER_HUB_01.md", "script harness doc lists telematics provider hub doc");
  must(harnessDoc, "TELEMATICS-PROVIDER-HUB-01", "script harness doc lists telematics provider hub milestone");

  must(screenRegistry, "/superadmin/telematics", "screen registry includes telematics hub route");
  must(screenRegistry, "Konum veri sağlayıcıları", "screen registry keeps telematics hub label");
  must(screenCatalog, "/superadmin/telematics", "screen catalog includes telematics hub route");
  must(screenCatalog, "Telematik / GPS Sağlayıcıları", "screen catalog keeps telematics hub label");

  mustNoDiffExceptWithIdentity(["backend/src/routes", "backend/src/services", "prisma"], CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF, "backend route/service/schema and Prisma diff limited to approved concurrent runtime paths");
  mustNoStagedPrefix(cachedNames, ["backend/src/routes/", "backend/src/services/", "prisma/"], "backend route/service/schema and Prisma stay unstaged");
  mustNoStagedPrefix(cachedNames, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== TELEMATICS-PROVIDER-HUB-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
