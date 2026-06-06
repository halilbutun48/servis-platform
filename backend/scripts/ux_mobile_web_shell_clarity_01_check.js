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

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function mustNotList(files, needle, label) {
  if (files.some((file) => normalize(file).includes(normalize(needle)))) fail(label);
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

function main() {
  console.log("=== UX-MOBILE-WEB-SHELL-CLARITY-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md");
  const appShell = read("web/src/layout/AppShell.jsx");
  const navDock = read("web/src/layout/NavDock.jsx");
  const css = read("web/src/index.css");

  mustTrue(exists("backend/scripts/ux_mobile_web_shell_clarity_01_check.js"), "mobile web shell clarity check exists");
  mustTrue(exists("docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md"), "mobile web shell clarity doc exists");

  must(pkg, '"check:uxmobilewebshellclarity01": "node backend/scripts/ux_mobile_web_shell_clarity_01_check.js"', "package.json exposes mobile web shell clarity check");
  ordered(runner, ["check:uxnav01", "check:uxmobilewebshellclarity01", "check:uxdensity01"], "product extensions runner keeps mobile web shell clarity between nav and density");
  ordered(verify, ["check:uxnav01", "check:uxmobilewebshellclarity01", "check:uxdensity01"], "verify chain keeps mobile web shell clarity between nav and density");

  must(harnessCheck, "UX-MOBILE-WEB-SHELL-CLARITY-01", "script harness check knows mobile web shell clarity milestone");
  must(harnessCheck, "check:uxmobilewebshellclarity01", "script harness check knows mobile web shell clarity alias");
  must(harnessCheck, "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md", "script harness check knows mobile web shell clarity doc");
  must(harnessDoc, "UX-MOBILE-WEB-SHELL-CLARITY-01", "script harness doc lists mobile web shell clarity milestone");
  must(harnessDoc, "check:uxmobilewebshellclarity01", "script harness doc lists mobile web shell clarity alias");
  must(harnessDoc, "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md", "script harness doc lists mobile web shell clarity doc");

  must(guide, "UX-MOBILE-WEB-SHELL-CLARITY-01", "milestone guide mentions mobile web shell clarity milestone");
  must(guide, "check:uxmobilewebshellclarity01", "milestone guide exposes mobile web shell clarity check");
  must(guide, "node backend\\scripts\\ux_mobile_web_shell_clarity_01_check.js", "milestone guide includes mobile web shell clarity command");
  must(guide, "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md", "milestone guide includes mobile web shell clarity doc");

  must(doc, "UX-MOBILE-WEB-SHELL-CLARITY-01", "mobile web shell clarity doc title present");
  must(doc, "default closed", "mobile web shell clarity doc keeps default closed wording");
  must(doc, "drawer", "mobile web shell clarity doc keeps drawer wording");
  must(doc, "backdrop", "mobile web shell clarity doc keeps backdrop wording");
  must(doc, "content-first", "mobile web shell clarity doc keeps content-first wording");
  must(doc, "shellTopMenu", "mobile web shell clarity doc mentions shellTopMenu");
  must(doc, "navDockBackdrop", "mobile web shell clarity doc mentions navDockBackdrop");
  must(doc, "shell--has-copilot-fab", "mobile web shell clarity doc keeps copilot fab shell class");
  must(doc, "shell--nav-open", "mobile web shell clarity doc keeps nav-open shell class");
  must(doc, "Sefer Abi Terminali", "mobile web shell clarity doc keeps terminal label");
  must(doc, "Sefer Abi’ye Sor", "mobile web shell clarity doc keeps drawer label");
  must(doc, "Copilot launcher", "mobile web shell clarity doc mentions copilot launcher");
  must(doc, "safe-area", "mobile web shell clarity doc mentions safe-area");
  must(doc, "desktop unchanged", "mobile web shell clarity doc keeps desktop unchanged wording");
  must(doc, "Backend route/write-path değişmedi.", "mobile web shell clarity doc keeps backend boundary");
  must(doc, "Schema/migration yok.", "mobile web shell clarity doc keeps schema boundary");
  must(doc, "Playwright runner policy değişmedi.", "mobile web shell clarity doc keeps runner boundary");
  must(doc, "Coverage matrix check değişmedi.", "mobile web shell clarity doc keeps coverage boundary");
  must(doc, "runtime-data", "mobile web shell clarity doc keeps runtime-data boundary");
  must(doc, "browser-smoke", "mobile web shell clarity doc keeps browser-smoke boundary");

  must(appShell, "mobileNavPath", "app shell keeps mobile nav path state");
  must(appShell, "mobileNavOpen", "app shell keeps mobile nav open state");
  must(appShell, "shellTopMenu", "app shell keeps mobile menu button");
  must(appShell, "mobileOpen={mobileNavOpen}", "app shell passes mobile open state to NavDock");
  must(appShell, "shell--has-copilot-fab", "app shell keeps copilot fab shell class");
  must(appShell, "shell--nav-open", "app shell keeps nav-open shell class");
  must(appShell, "mobileNavPath === path", "app shell keeps mobile nav closed when the route changes");
  must(appShell, "setMobileNavPath((current) => (current === path ? null : path))", "app shell toggles mobile nav against the current route");
  must(appShell, "onMobileClose={() => setMobileNavPath(null)}", "app shell closes mobile nav from the drawer");
  must(appShell, 'document.body.style.overflow = "hidden";', "app shell locks body scroll when nav is open");

  must(navDock, "mobileOpen = false", "nav dock keeps mobileOpen default false");
  must(navDock, "navDockBackdrop", "nav dock keeps backdrop button");
  must(navDock, "navDock--mobileOpen", "nav dock keeps mobile open class");
  must(navDock, "navDock--mobileClosed", "nav dock keeps mobile closed class");
  must(navDock, "onMobileClose?.();", "nav dock closes mobile drawer");
  must(navDock, "onSelect?.();", "nav dock closes after item select");
  must(navDock, "id=\"shell-nav-dock\"", "nav dock exposes shell nav id");
  must(navDock, "Sefer Abi Terminali", "nav dock keeps terminal label visible");

  must(css, ".shellTopMenu { display: none; }", "css keeps desktop menu button hidden by default");
  must(css, ".navDockBackdrop { display: none; }", "css keeps backdrop hidden by default");
  must(css, ".shell--has-copilot-fab .shellContent", "css keeps copilot fab bottom clearance");
  must(css, "z-index: 4400", "css keeps mobile nav drawer z-index");
  must(css, "z-index: 4390", "css keeps mobile backdrop z-index");
  must(css, "visibility: hidden;", "css keeps mobile closed drawer hidden");
  must(css, "pointer-events: none;", "css keeps mobile closed drawer non-interactive");
  must(css, ".copilotFabSubtitle { display: none; }", "css hides copilot fab subtitle on mobile");
  must(css, ".copilotFabStatus { display: none; }", "css hides copilot fab status on mobile");
  must(css, ".navDockBrand { display: grid; }", "css keeps mobile nav brand visible");
  must(css, ".navSectionTitle { display: inline-flex; }", "css keeps mobile section titles visible");
  must(css, ".shell--agreements-detail .shellContent", "css keeps agreements detail shell override");

  const status = statusNames();
  const exactAllowed = new Set([
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "package.json",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "web/src/index.css",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "tools/repo_contract_state.json",
  ]);
  allWithin(status, exactAllowed, ["backend/artifacts/runtime-data/"], "working tree stays within mobile web shell clarity scope");
  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  mustNotList(status, "backend/prisma/", "backend schema/migration files are untouched");

  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "Prisma", "backend/prisma"]);
  mustTrue(routeDiff.length === 0, "backend route/service/schema diff stays empty");

  console.log("=== UX-MOBILE-WEB-SHELL-CLARITY-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
