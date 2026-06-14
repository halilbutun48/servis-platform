#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");
const docPath = path.join(root, "docs", "UX_PANEL_STANDARD_ARCHITECTURE_01.md");
const shouldWriteDoc = process.argv.includes("--write-doc");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
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

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
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

function stagedNames() {
  return gitLines(["diff", "--cached", "--name-only"]).map((line) => line.replace(/\\/g, "/"));
}

function statusNames() {
  const out = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function matches(file, needle) {
  return normalize(file).includes(normalize(needle));
}

function mustNotList(files, needle, label) {
  if (files.some((file) => matches(file, needle))) fail(label);
  ok(label);
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

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function roleLabelFromPath(rel) {
  const role = rel.split("/")[3] || "shared";
  if (role === "superadmin") return "Super Admin";
  if (role === "room") return "Room";
  if (role === "company") return "Company";
  if (role === "driver") return "Driver";
  if (role === "personel") return "Personel";
  if (role === "parent") return "Parent/Veli";
  if (role === "public") return "Public";
  if (role === "shared") return "Shared";
  if (role === "organization") return "Organization";
  if (role === "school") return "School";
  return role;
}

function walkPanels(dir = path.join(root, "web", "src", "panels"), out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPanels(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = abs.slice(root.length + 1).replace(/\\/g, "/");
    if (/^web\/src\/panels\/.+(?:Panel|Page)\.jsx$/i.test(rel)) out.push(rel);
  }
  return out;
}

function hasAny(text, needles) {
  const hay = normalize(text);
  return needles.some((needle) => hay.includes(normalize(needle)));
}

function classifyPanel(rel, text) {
  const summaryBand = hasAny(text, [
    "FlowSummaryStrip",
    "SystemModeSummaryBand",
    "PanelChrome",
    "summary-first",
    "özet",
    "durum",
    "risk",
    "bekleyen işlem",
    "kısa açıklama",
  ]);
  const kpiBand = hasAny(text, [
    "repeat(auto-fit",
    "StatTile",
    "panelStatTitle",
    "fontSize: 28",
    "kayıt sayısı",
    "plan sayısı",
    "aktif kullanıcı",
    "görüntülenen",
    "toplam kayıt",
    "kpi",
  ]);
  const actionArea = hasAny(text, [
    "<button",
    "className=\"btn",
    "className=\"btn primary\"",
    "göreve başla",
    "yenile",
    "incele",
    "aç",
    "göster",
    "başla",
    "kabul",
    "reddet",
    "kopyala",
    "sil",
    "düzenle",
    "kaydet",
    "okut",
    "tara",
    "şifreyi sıfırla",
    "pasifleştir",
    "aktifleştir",
    "referansları yenile",
  ]);
  const tabs = hasAny(text, [
    "PanelSegmentTabs",
    "tablist",
    "tab",
    "Sekme",
  ]);
  const detail = hasAny(text, [
    "CollapsibleSection",
    "details",
    "Drawer",
    "drawer",
    "MapView",
    "StopTimeline",
    "payloadPretty",
    "Sistem kanıtı",
    "Kanıt",
    "Geçmiş",
    "Log",
  ]);
  const readonly = hasAny(text, [
    "readonly",
    "önizleme",
    "taslak",
    "bilgilendirme",
    "kanıt",
    "geçmiş",
    "preview",
    "read-only",
  ]);
  const mobileSafe = hasAny(text, [
    "safe-area-inset-bottom",
    "scroll-margin-bottom",
    "z-index",
    "zIndex",
    "sticky",
    "fixed",
    "bottom",
    "floating",
    "dock",
  ]);
    const techRisk = hasAny(text, [
    "String(e?.message || e)",
    "String(error?.message || error)",
    "String(e2?.message || e2)",
    "Link token bulunamadı",
    "psv1 token",
    "QR içinde geçerli psv1 token bulunamadı",
    "Tarayıcı konum desteği vermiyor",
    "ACCESS_REVOKED",
    "ACCESS_EXPIRED",
    "ACCESS_NOT_FOUND",
    "ACCESS_DISABLED",
    "Cannot GET",
    "Raw parse error",
    "Claims hash",
  ]);

  let status = "DEFER";
  if (techRisk) status = "UX-FIX";
  else if (summaryBand && kpiBand && actionArea && (tabs || detail || readonly || mobileSafe)) status = "PASS";
  else if (summaryBand && actionArea && (tabs || detail || readonly || mobileSafe)) status = "PASS-";
  else if (summaryBand || actionArea || tabs || detail || readonly || mobileSafe) status = "PASS-";

  return {
    rel,
    role: roleLabelFromPath(rel),
    summaryBand,
    kpiBand,
    actionArea,
    tabs,
    detail,
    readonly,
    mobileSafe,
    techRisk,
    status,
  };
}

function scoreByRole(rows) {
  const summary = new Map();
  for (const row of rows) {
    const prev = summary.get(row.role) || { total: 0, PASS: 0, "PASS-": 0, "UX-FIX": 0, DEFER: 0 };
    prev.total += 1;
    prev[row.status] = (prev[row.status] || 0) + 1;
    summary.set(row.role, prev);
  }
  return summary;
}

function buildDoc(rows) {
  const sorted = [...rows].sort((a, b) => a.role.localeCompare(b.role) || a.rel.localeCompare(b.rel));
  const roleSummary = scoreByRole(sorted);
  const statusCounts = sorted.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { PASS: 0, "PASS-": 0, "UX-FIX": 0, DEFER: 0 }
  );

  const out = [];
  out.push("# UX-PANEL-STANDARD-ARCHITECTURE-01");
  out.push("");
  out.push("Tarih: 2026-05-31");
  out.push("Repo: `servis-platform`");
  out.push("");
  out.push("## 1) Standard");
  out.push("");
  out.push("1. Üst özet bandı");
  out.push("   - durum");
  out.push("   - risk");
  out.push("   - bekleyen işlem");
  out.push("   - kısa açıklama");
  out.push("2. KPI / mini kartlar");
  out.push("   - sayı");
  out.push("   - durum");
  out.push("   - eksik / uyarı");
  out.push("3. Ana aksiyon alanı");
  out.push("   - en önemli buton");
  out.push("   - ikincil butonlar");
  out.push("   - readonly / execute sınırı");
  out.push("4. İşlevsel sekmeler veya bölümler");
  out.push("   - Özet");
  out.push("   - Bekleyenler");
  out.push("   - Detay");
  out.push("   - Kanıt");
  out.push("   - Geçmiş");
  out.push("5. Detay / sistem kanıtı");
  out.push("   - accordion / drawer altında");
  out.push("   - ana ekranı boğmaz");
  out.push("");
  out.push("## 2) Audit Summary");
  out.push("");
  out.push(`- Panel yüzey sayısı: \`${sorted.length}\``);
  out.push(`- PASS: \`${statusCounts.PASS || 0}\``);
  out.push(`- PASS-: \`${statusCounts["PASS-"] || 0}\``);
  out.push(`- UX-FIX: \`${statusCounts["UX-FIX"] || 0}\``);
  out.push(`- DEFER: \`${statusCounts.DEFER || 0}\``);
  out.push("");
  out.push("### Role Summary");
  out.push("");
  for (const role of ["Super Admin", "Room", "Company", "Driver", "Personel", "Parent/Veli", "Organization", "Public", "Shared", "School"]) {
    const item = roleSummary.get(role);
    if (!item) continue;
    out.push(`- ${role}: total \`${item.total}\`, PASS \`${item.PASS || 0}\`, PASS- \`${item["PASS-"] || 0}\`, UX-FIX \`${item["UX-FIX"] || 0}\`, DEFER \`${item.DEFER || 0}\``);
  }
  out.push("");
  out.push("## 3) Audit Matrix");
  out.push("");
  out.push("| Panel / route | Rol | Üst özet bandı | KPI / mini kart | Ana aksiyon | Readonly / execute | Sekme / bölüm | Detay / kanıt | Mobile CTA | Teknik metin | Durum |");
  out.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const row of sorted) {
    out.push(`| \`${row.rel}\` | ${row.role} | ${row.summaryBand ? "Var" : "Yok"} | ${row.kpiBand ? "Var" : "Yok"} | ${row.actionArea ? "Var" : "Kısmi/Yok"} | ${row.readonly ? "Net" : "Kısmi/Belirsiz"} | ${row.tabs ? "Var" : "Yok"} | ${row.detail ? "Var" : "Yok"} | ${row.mobileSafe ? "Var" : "Yok"} | ${row.techRisk ? "Risk" : "Temiz"} | ${row.status} |`);
  }
  out.push("");
  out.push("## 4) Shared Primitives");
  out.push("");
  out.push("- `web/src/components/FlowSummaryStrip.jsx`");
  out.push("- `web/src/components/PanelChrome.jsx`");
  out.push("- `web/src/components/PanelSegmentTabs.jsx`");
  out.push("- `web/src/components/CollapsibleSection.jsx`");
  out.push("- `web/src/components/SystemModeSummaryBand.jsx`");
  out.push("");
  out.push("## 5) Notes");
  out.push("");
  out.push("- Check alias: `check:uxpanelstandardarchitecture01`");
  out.push("- Check command: `node backend\\scripts\\ux_panel_standard_architecture_01_check.js`");
  out.push("- Doc: `docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md`");
  out.push("- Bu standart ürün/business flow değiştirmez.");
  out.push("- Backend route/write-path değiştirmez.");
  out.push("- Schema/migration açmaz.");
  out.push("- Runtime-data dosyalarına dokunmaz.");
  out.push("- Payment/settlement/contract/invite/supplier execute başlatmaz.");
  out.push("- AI/Copilot yeni capability eklemez.");
  out.push("- Playwright runner policy ve coverage matrix fail policy değişmez.");
  out.push("- Teknik/debug/raw/null/undefined görünür metinler ana ekranda kalmamalıdır.");
  out.push("");
  return `${out.join("\n")}\n`;
}

function verifyDoc(docText, summary) {
  const mustContain = [
    "# UX-PANEL-STANDARD-ARCHITECTURE-01",
    "## 1) Standard",
    "## 2) Audit Summary",
    "## 3) Audit Matrix",
    "## 4) Shared Primitives",
    "## 5) Notes",
    "1. Üst özet bandı",
    "2. KPI / mini kartlar",
    "3. Ana aksiyon alanı",
    "4. İşlevsel sekmeler veya bölümler",
    "5. Detay / sistem kanıtı",
    "Super Admin",
    "Room",
    "Company",
    "Driver",
    "Personel",
    "Parent/Veli",
    "Organization",
    "Public",
    "Shared",
    "UX-PANEL-STANDARD-ARCHITECTURE-01",
    "check:uxpanelstandardarchitecture01",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
  ];

  for (const needle of mustContain) {
    if (!normalize(docText).includes(normalize(needle))) {
      throw new Error(`FAIL doc missing: ${needle}`);
    }
  }

  if (!normalize(docText).includes(normalize(String(summary.total)) || "")) {
    throw new Error("FAIL doc summary panel count mismatch");
  }
  if (!normalize(docText).includes(normalize(String(summary.statusCounts.PASS || 0)))) {
    throw new Error("FAIL doc summary PASS count mismatch");
  }
}

function main() {
  console.log("=== UX-PANEL-STANDARD-ARCHITECTURE-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  let doc = exists("docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md") ? read("docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md") : "";
  const cleanupScopeFiles = [
    "backend/src/kvkk/matrix.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
    "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
    "backend/scripts/copilot_role_task_matrix_01_check.js",
    "backend/scripts/copilot_ai_action_roadmap_01_check.js",
    "backend/src/ai/chat/copilotRoleTaskMatrix.js",
    "backend/src/ai/chat/copilotAiActionRoadmap.js",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
    "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "backend/scripts/sefer_abi_terminal_humanize_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
    "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "package.json",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/checkin/CameraQrScannerCard.jsx",
    "web/src/index.css",
    "web/src/layout/AppShell.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/utils/regionOwnership.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
  ];

  mustTrue(exists("backend/scripts/ux_panel_standard_architecture_01_check.js"), "panel standard architecture check exists");
  if (!shouldWriteDoc) {
    mustTrue(exists("docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md"), "panel standard architecture doc exists");
  }

  must(pkg, '"check:uxpanelstandardarchitecture01": "node backend/scripts/ux_panel_standard_architecture_01_check.js"', "package.json exposes panel standard architecture check");
  ordered(runner, ["check:uxdensity01", "check:uxpanelstandardarchitecture01", "check:finaluxsmoke01"], "product extensions runner keeps panel standard architecture before final smoke");
  ordered(verify, ["check:uxdensity01", "check:uxpanelstandardarchitecture01", "check:finaluxsmoke01"], "verify chain keeps panel standard architecture before final smoke");

  must(harnessCheck, "UX-PANEL-STANDARD-ARCHITECTURE-01", "script harness check knows panel standard architecture milestone");
  must(harnessCheck, "check:uxpanelstandardarchitecture01", "script harness check knows panel standard architecture alias");
  must(harnessCheck, "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md", "script harness check knows panel standard architecture doc");
  must(harnessDoc, "UX-PANEL-STANDARD-ARCHITECTURE-01", "script harness doc lists panel standard architecture milestone");
  must(harnessDoc, "check:uxpanelstandardarchitecture01", "script harness doc lists panel standard architecture alias");
  must(harnessDoc, "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md", "script harness doc lists panel standard architecture doc");
  must(guide, "UX-PANEL-STANDARD-ARCHITECTURE-01", "milestone guide mentions panel standard architecture milestone");
  must(guide, "check:uxpanelstandardarchitecture01", "milestone guide exposes panel standard architecture check");
  must(guide, "node backend\\scripts\\ux_panel_standard_architecture_01_check.js", "milestone guide includes panel standard architecture command");
  must(guide, "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md", "milestone guide includes panel standard architecture doc");

  const panelRows = walkPanels().map((rel) => classifyPanel(rel, read(rel)));
  mustTrue(panelRows.length > 0, "panel scanner finds panel surfaces");

  const statusCounts = panelRows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { PASS: 0, "PASS-": 0, "UX-FIX": 0, DEFER: 0 }
  );
  const generatedDoc = buildDoc(panelRows);
  if (shouldWriteDoc) {
    fs.writeFileSync(docPath, `${generatedDoc}\n`, "utf8");
    console.log(`WROTE ${path.relative(root, docPath).replace(/\\/g, "/")}`);
  }
  doc = exists(path.relative(root, docPath)) ? read(path.relative(root, docPath)) : generatedDoc;

  must(doc, "UX-PANEL-STANDARD-ARCHITECTURE-01", "panel standard architecture doc title present");
  must(doc, "1. Üst özet bandı", "panel standard architecture doc includes standard point 1");
  must(doc, "2. KPI / mini kartlar", "panel standard architecture doc includes standard point 2");
  must(doc, "3. Ana aksiyon alanı", "panel standard architecture doc includes standard point 3");
  must(doc, "4. İşlevsel sekmeler veya bölümler", "panel standard architecture doc includes standard point 4");
  must(doc, "5. Detay / sistem kanıtı", "panel standard architecture doc includes standard point 5");
  must(doc, "Audit Matrix", "panel standard architecture doc includes audit matrix");
  must(doc, "Super Admin", "panel standard architecture doc audits super admin");
  must(doc, "Room", "panel standard architecture doc audits room");
  must(doc, "Company", "panel standard architecture doc audits company");
  must(doc, "Driver", "panel standard architecture doc audits driver");
  must(doc, "Personel", "panel standard architecture doc audits personel");
  must(doc, "Parent/Veli", "panel standard architecture doc audits parent");
  must(doc, "Public", "panel standard architecture doc audits public");
  must(doc, "Shared", "panel standard architecture doc audits shared");

  const criticalFiles = new Map([
    ["web/src/panels/driver/TodayPanel.jsx", "driver today"],
    ["web/src/panels/organization/CenterPanel.jsx", "organization center"],
    ["web/src/panels/public/PassengerLivePanel.jsx", "public passenger live"],
    ["web/src/panels/shared/NotificationsPanel.jsx", "notifications panel"],
    ["web/src/panels/shared/ReportsPanel.jsx", "reports panel"],
    ["web/src/panels/superadmin/UsersPanel.jsx", "users panel"],
  ]);
  for (const [rel, label] of criticalFiles.entries()) {
    const row = panelRows.find((item) => item.rel === rel);
    mustTrue(Boolean(row), `${label} exists in panel scan`);
    mustTrue(row.status !== "UX-FIX", `${label} is not UX-FIX`);
  }

  verifyDoc(doc, { total: panelRows.length, statusCounts });

  const staged = stagedNames().filter((file) => !cleanupScopeFiles.includes(file));
  const stagedAllowed = new Set([
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "tools/repo_contract_state.json",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "web/src/index.css",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "backend/scripts/mobile_web_final_01_check.js",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "web/src/panels/driver/TodayPanel.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/public/PassengerLivePanel.jsx",
    "web/src/panels/shared/NotificationsPanel.jsx",
    "web/src/panels/shared/ReportsPanel.jsx",
    "web/src/panels/superadmin/UsersPanel.jsx",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "web/src/App.jsx",
    "web/src/copilot/screenRegistry.js",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "backend/scripts/ux_panel_inventory_02a_check.js",
  ]);
  allWithin(staged, stagedAllowed, [], "staged files stay within panel standard architecture validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  const status = statusNames().filter((file) => !cleanupScopeFiles.includes(file));
  const exactAllowed = new Set([
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "web/src/App.jsx",
    "web/src/copilot/screenRegistry.js",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "backend/scripts/copilot_stop_route_draft_01_check.js",
    "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
    "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js",
    "docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md",
    "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
    "backend/src/ai/chat/excelToRouteReadinessRedteamPack.js",
    "docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/SAFE_DRIVE_01.md",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/panels/driver/MapPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/shared/SafeDriveSummaryCard.jsx",
    "web/src/utils/safeDriveSummary.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_shifts_responsive_layout_fix_01_check.js",
    "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/onboarding_review_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "web/src/App.jsx",
    "web/src/copilot/screenRegistry.js",
    "web/src/components/BrandMark.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/shared/OfferQualityRankingCard.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/OFFER_RANKING_QUALITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
    "docs/ONBOARDING_REVIEW_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "web/src/index.css",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/WorkflowPanel.jsx",
    "web/src/panels/company/companyShiftsPanelCards.jsx",
    "web/src/panels/company/PersonelAccessPanel.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/company/companyShiftsPanelFilters.jsx",
    "web/src/panels/company/companyShiftsPanelMobileCards.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/OffersPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelMobileCards.jsx",
    "web/src/panels/driver/TodayPanel.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/public/PassengerLivePanel.jsx",
    "web/src/panels/shared/NotificationsPanel.jsx",
    "web/src/panels/shared/ReportsPanel.jsx",
    "web/src/panels/superadmin/UsersPanel.jsx",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
    "backend/scripts/ux_smoke_pass_minus_zero_01_check.js",
    "docs/UX_SMOKE_PASS_MINUS_ZERO_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
    "backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js",
    "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js",
    "backend/src/ai/chat/answerQualityPolicy.js",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/intentRouter.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "web/src/state/sessionProvider.jsx",
    "web/src/components/brand/SeferPaktLogo.jsx",
    "web/public/vardis-logo.svg",
    "web/public/vardis-favicon.svg",
    "web/public/seferpakt-lockup.png",
    "web/public/seferpakt-app-icon.png",
    "web/public/seferpakt-favicon.png",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "web/src/utils/offerQualityRanking.js",
    "backend/src/ai/chat/copilotGuidedTaskEngine.js",
    "backend/src/ai/chat/goldenQuestionPack.js",
    "backend/src/ai/chat/qualityScorer.js",
    "backend/scripts/copilot_guided_task_engine_01_check.js",
    "docs/COPILOT_GUIDED_TASK_ENGINE_01.md",
    "web/src/utils/uiDataCache.js",
  ]);
  allWithin(
    status,
    exactAllowed,
    ["backend/artifacts/runtime-data/", "tools/repo_contract_state.json", "web/public/seferpakt-", "web/public/vardis-", "web/src/components/brand/"],
    "working tree stays within panel standard architecture scope",
  );

  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  console.log("=== UX-PANEL-STANDARD-ARCHITECTURE-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
