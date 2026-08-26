#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

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
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^\\p{L}\\p{N}])`, "iu");
    const slice = haystack.slice(last + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = last + 1 + (match.index || 0);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function stagedNames() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustNotStaged(files, needle, label) {
  const hit = files.some((file) => normalize(file).includes(normalize(needle)));
  if (hit) fail(label);
  ok(label);
}

function mustNotStagedUnless(files, needle, allowed, label) {
  const hit = files.some(
    (file) => normalize(file).includes(normalize(needle)) && !allowed.has(file.replace(/\\/g, "/")),
  );
  if (hit) fail(label);
  ok(label);
}

function main() {
  console.log("=== UX-SUPERADMIN-PANEL-CLARITY-01 CHECK ===");

  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const harness = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const doc = read("docs/UX_SUPERADMIN_PANEL_CLARITY_01.md");
  const overview = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
  const observability = read("web/src/panels/superadmin/ObservabilityPanel.jsx");
  const operations = read("web/src/panels/superadmin/OperationsPanel.jsx");
  const auditLogs = read("web/src/panels/superadmin/AuditLogsPanel.jsx");
  const logExport = read("web/src/panels/superadmin/LogExportPanel.jsx");
  const commercial = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  const onboarding = read("web/src/panels/superadmin/PublicLeadReviewPanel.jsx");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  must(pkg, '"check:uxsuperadminpanelclarity01": "node backend/scripts/ux_superadmin_panel_clarity_01_check.js"', "package.json exposes Super Admin clarity check");
  assertProductExtensionsIncludes("check:uxsuperadminpanelclarity01", "product extensions registry includes Super Admin clarity check", registryScripts);
  assertProductExtensionsIncludes("check:uxsuperadminpanelclarity01", "verify-chain registry includes Super Admin clarity check", registryScripts);
  must(guide, "UX-SUPERADMIN-PANEL-CLARITY-01", "milestone guide mentions Super Admin clarity milestone");
  must(guide, "check:uxsuperadminpanelclarity01", "milestone guide exposes Super Admin clarity check");
  must(guide, "node backend\\scripts\\ux_superadmin_panel_clarity_01_check.js", "milestone guide includes Super Admin clarity command");
  must(harness, "docs/UX_SUPERADMIN_PANEL_CLARITY_01.md", "harness script indexes Super Admin clarity doc");
  must(harnessDoc, "docs/UX_SUPERADMIN_PANEL_CLARITY_01.md", "harness doc lists Super Admin clarity doc");
  must(harnessDoc, "check:uxsuperadminpanelclarity01", "harness doc lists Super Admin clarity check");
  must(doc, "Problem", "clarity doc problem section present");
  must(doc, "Analysis format", "clarity doc analysis format present");
  must(doc, "Technical detail standard", "clarity doc technical detail section present");
  must(doc, "Words to suppress or downplay", "clarity doc visible terms section present");
  must(doc, "Out of scope", "clarity doc out-of-scope section present");
  must(doc, "Super Admin ekranlarında kullanıcıya görünen debug, token, null, raw", "clarity doc problem statement present");
  mustNot(doc, "Autopilot", "clarity doc does not suggest autopilot positioning");

  must(overview, "Süper Yönetici", "overview title present");
  must(overview, "SystemModeSummaryBand", "overview keeps system mode band");
  must(overview, "Kritik geri bildirim", "overview keeps critical feedback band");
  must(overview, "Hızlı erişim", "overview keeps quick access");
  must(overview, "Özet", "overview keeps summary");
  must(overview, "Bölüm rehberi", "overview keeps section guide");
  must(overview, "Alt detay alanları", "overview keeps detail area");
  must(overview, "PanelSegmentTabs", "overview uses detail tabs");
  must(overview, "Sistem Detayları", "overview keeps system details tab");
  must(overview, "Geri Bildirimler", "overview keeps feedback tab");
  must(overview, "Demo Hesapları", "overview keeps demo accounts tab");
  mustNot(overview, "Demo / Debug", "overview removes demo/debug wording");
  ordered(overview, [
    "SystemModeSummaryBand",
    "Kritik geri bildirim",
    "Alt detay alanları",
    "PanelSegmentTabs",
    "Hızlı erişim",
    "Bölüm rehberi",
  ], "overview remains summary-first");

  must(observability, "Canlı Sağlık ve Risk Özeti", "live monitoring title present");
  must(observability, "PanelKvkkHint panelKey=\"observability\"", "live monitoring keeps KVKK hint");
  must(observability, "Sistem kanıtı", "live monitoring keeps system proof tab");
  must(observability, "Kayıt ayrıştırılamadı", "live monitoring keeps safe parse wording");
  must(observability, "Kanıt anahtarı:", "live monitoring keeps safe proof key wording");
  must(observability, "PanelSegmentTabs", "live monitoring keeps functional tabs");
  mustNot(observability, "Claims hash:", "live monitoring removes raw claims hash label");
  mustNot(observability, "Raw parse error:", "live monitoring removes raw parse error label");

  must(operations, "Denetim Paneli", "operations panel title present");
  must(operations, "Sistem kanıtı", "operations panel keeps safe proof label");
  must(operations, "Zaman, kişi, işlem, kayıt türü, kayıt no ve sistem kanıtı", "operations panel subtitle is Turkish and clear");
  must(operations, "Audit / Log Kayıtları", "operations panel keeps audit tab");
  mustNot(operations, "JSON.stringify(row.meta)", "operations panel no raw JSON stringify in visible table");

  must(auditLogs, "Sistem kanıtı", "audit logs uses system proof label");
  mustNot(auditLogs, "JSON.stringify(x.meta)", "audit logs no raw JSON stringify in visible table");

  must(logExport, "Önizleme (son 250)", "log export preview label is Turkish");
  must(logExport, "kanıt=", "log export uses safe proof summary");
  must(logExport, "sistem kanıtı hazır", "log export safe fallback visible");
  mustNot(logExport, "meta=${JSON.stringify", "log export no raw meta dump");

  must(commercial, "FlowSummaryStrip", "commercial core keeps summary strip");
  must(commercial, "PaymentReadonlySafetyBadge", "commercial core keeps readonly safety badge");
  must(commercial, "PanelSegmentTabs", "commercial core keeps functional tabs");
  must(commercial, "CollapsibleSection", "commercial core keeps collapsible details");
  must(commercial, "Ödeme kapalı", "commercial core shows safe payment boundary");

  must(onboarding, "Başvuru İnceleme Kuyruğu", "onboarding review title present");
  must(onboarding, "İnceleme sınırı aktif", "onboarding review summary band present");
  must(onboarding, "Sadece inceleme", "onboarding review only-review badge present");
  must(onboarding, "Kullanıcı onayı gerekli", "onboarding review human approval badge present");
  must(onboarding, "İncelemeye al", "onboarding review action present");
  must(onboarding, "Ek bilgi gerekli", "onboarding review action present");
  must(onboarding, "Invite için uygun", "onboarding review invite-ready action present");
  must(onboarding, "Reddet", "onboarding review reject action present");
  must(onboarding, "Notları kaydet", "onboarding review save-notes action present");
  must(onboarding, "Bu yüzey davet, kullanıcı, ödeme, sözleşme veya tedarikçi doğrulama başlatmaz.", "onboarding review boundary copy present");
  mustNot(onboarding, "0/3 actions", "onboarding review does not show opaque action counter");

  const staged = stagedNames();
  mustNotStaged(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotStaged(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotStaged(staged, "debug.log", "debug.log is not staged");
  mustNotStaged(staged, "backend/src/routes/drivers.js", "room driver route is not staged");
  mustNotStaged(staged, "backend/src/routes/vehicles.js", "room vehicles route is not staged");
  mustNotStaged(staged, "backend/src/services/agreementSourceLineageService.js", "agreement source lineage service is not staged");
  mustNotStagedUnless(
    staged,
    "web/src/panels/room/DriversPanel.jsx",
    new Set([
      "web/src/panels/room/DriversPanel.jsx",
      "web/src/panels/room/ShiftsPanel.jsx",
      "web/src/panels/room/roomShiftsPanelSections.jsx",
      "web/src/panels/room/AgreementsPanel.jsx",
      "web/src/panels/room/RoomDriversEditModal.jsx",
      "web/src/panels/room/RoomDriversShiftsTable.jsx",
      "web/src/panels/room/RoomDriversStatusTable.jsx",
      "web/src/index.css",
      "backend/scripts/ux_premium_critical_fix_room_01_check.js",
      "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    ]),
    "room drivers panel is not staged",
  );
  mustNotStagedUnless(
    staged,
    "web/src/panels/room/VehiclesPanel.jsx",
    new Set(["web/src/panels/room/VehiclesPanel.jsx"]),
    "room vehicles panel is not staged"
  );
  mustNotStagedUnless(
    staged,
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    new Set(["web/src/panels/room/roomVehiclesPanelCards.jsx"]),
    "room vehicle cards are not staged"
  );
  mustNotStagedUnless(
    staged,
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    new Set(["web/src/panels/room/roomVehiclesPanelSections.jsx"]),
    "room vehicle sections are not staged"
  );
  mustNotStagedUnless(
    staged,
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    new Set(["backend/scripts/ux_live_panel_smoke_audit_01_check.js"]),
    "live smoke audit check is not staged"
  );
  mustNotStaged(staged, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live smoke audit doc is not staged");

  console.log("=== UX-SUPERADMIN-PANEL-CLARITY-01 CHECK PASS ===");
}

main();
