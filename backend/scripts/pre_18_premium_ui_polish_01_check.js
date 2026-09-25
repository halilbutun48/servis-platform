import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-premium-ui-polish-01");
const reportPath = path.join(evidenceRoot, "report.json");
const protectedRuntime = [
  "backend/artifacts/runtime-data/password-change-requirements.json",
  "backend/artifacts/runtime-data/username-directory.json",
  "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
  "backend/artifacts/runtime-data/public-leads.json",
  "backend/artifacts/runtime-data/quality-review-decisions.json",
  "backend/artifacts/runtime-data/region-failover-drill-state.json",
];

function read(relativePath) { return fs.readFileSync(path.join(repoRoot, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(`FAIL ${message}`); console.log(`OK ${message}`); }
function trackedNames(args) { return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).split(/\r?\n/).map((value) => value.trim()).filter(Boolean).map((value) => value.replace(/\\/g, "/")); }

console.log("=== PRE-#18 PREMIUM UI POLISH — REAL RENDERED CHECK ===");
assert(fs.existsSync(reportPath), "dedicated rendered report exists");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
assert(report.source === "REAL_PLAYWRIGHT_RENDERED_BROWSER", "report identifies real Playwright rendering");
assert(report.sourceHead === execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(), "report is current-HEAD evidence");
assert((report.screenshots || []).length >= 75, "all PRE-#18 matrix and named typography screenshots exist");
for (const screenshot of report.screenshots || []) {
  const fullPath = path.join(repoRoot, screenshot);
  assert(fs.existsSync(fullPath) && fs.statSync(fullPath).size > 1000, `rendered screenshot is non-empty: ${screenshot}`);
}

const counters = report.counters || {};
for (const [name, minimum] of [
  ["PRE_18_PREMIUM_UI_BROWSER_PASS_COUNT", 72],
  ["SEFER_ABI_QUICK_PANEL_RESPONSIVE_PASS_COUNT", 3],
  ["LOGIN_TYPOGRAPHY_RESPONSIVE_PASS_COUNT", 3],
  ["PRE_18_TYPOGRAPHY_TARGET_PASS_COUNT", 3],
  ["PRE_18_SEMANTIC_TYPOGRAPHY_ROLE_COUNT", 16],
  ["SAFE_INTERACTION_TARGET_COUNT", 14],
  ["SAFE_INTERACTION_PASS_COUNT", 14],
]) assert(Number(counters[name] || 0) >= minimum, `${name} >= ${minimum}`);
for (const name of [
  "PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT",
  "RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT",
  "RESPONSIVE_TERMINOLOGY_LEAK_COUNT",
  "ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT",
  "AUTHENTICATED_DUPLICATE_OVERSIZED_BRAND_COUNT",
  "RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT",
  "CRITICAL_LABEL_CLIPPING_COUNT",
  "TYPOGRAPHY_COMPETING_SYSTEM_COUNT",
  "TYPOGRAPHY_UNEXPLAINED_ONE_OFF_OVERRIDE_COUNT",
  "VISIBLE_HEADING_HIERARCHY_DEFECT_COUNT",
  "RESPONSIVE_TEXT_CLIP_COUNT",
  "BUTTON_LABEL_TYPOGRAPHY_DRIFT_COUNT",
  "SIDEBAR_NAV_TYPOGRAPHY_DRIFT_COUNT",
  "CARD_TITLE_BODY_HIERARCHY_DEFECT_COUNT",
  "OVERSIZED_PAGE_TITLE_COUNT",
  "OVERSIZED_SECTION_TITLE_COUNT",
  "VISIBLE_CONTENT_COMPRESSION_BY_TYPOGRAPHY_COUNT",
  "PREMIUM_5_SECOND_FAIL_COUNT",
  "SAFE_INTERACTION_FAIL_COUNT",
  "ACCESSIBILITY_BLOCKER_COUNT",
  "NAVDOCK_ACTIVE_STATE_DEFECT_COUNT",
  "NAVDOCK_ACCESSIBLE_NAME_DEFECT_COUNT",
  "NAVDOCK_KEYBOARD_DEFECT_COUNT",
  "NAVDOCK_SAFE_AREA_DEFECT_COUNT",
  "NAVDOCK_OVERLAP_DEFECT_COUNT",
  "NAVDOCK_ROLE_VISIBILITY_DEFECT_COUNT",
  "PRE_18_UNPROVEN_REQUIRED_VIEWPORT_REQUIREMENT_COUNT",
  "consoleErrorCount",
  "pageErrorCount",
  "HTTP_500_COUNT",
]) assert(Number(counters[name] || 0) === 0, `${name}=0`);
assert(report.pass === true, "dedicated PRE-#18 browser acceptance is green");
assert(report.navDockFinal?.pass === true && (report.navDockFinal?.probes || []).length === 2, "final NavDock desktop and mobile interaction acceptance is green");
assert((report.contexts || []).length === 24, "eight contexts rendered at desktop, tablet and mobile");
assert((report.states || []).filter((item) => item.name === "task-workspace").length === 8, "expanded task workspace is rendered for every context");
assert((report.states || []).filter((item) => item.name === "sefer-abi-quick-panel").length === 3, "Sefer Abi quick panel is rendered across responsive and desktop contexts");
assert((report.states || []).filter((item) => item.name === "typography-target").length === 3, "named typography target screens are rendered");
assert((report.states || []).filter((item) => item.name === "navigation-probe").length === 2, "responsive navigation is rendered in tablet and mobile contexts");
assert((report.states || []).filter((item) => item.name === "modal").length === 2, "modal typography is rendered at desktop and mobile");
assert((report.states || []).filter((item) => item.name === "login").length === 3, "login typography is rendered at desktop, tablet and mobile");
assert([...report.contexts, ...report.states].every((item) => item.pass), "every rendered matrix state passes");
assert((report.viewportMatrix || "").includes("desktop 1440x900") && (report.viewportMatrix || "").includes("tablet 1024x900") && (report.viewportMatrix || "").includes("mobile 390x844"), "desktop/tablet/mobile viewport matrix is explicit");

const css = read("web/src/index.css");
const mapShellCss = read("web/src/components/map/mapShell.css");
const notifications = read("web/src/panels/shared/NotificationsPanel.jsx");
const shell = read("web/src/layout/AppShell.jsx");
const roleTask = read("web/src/components/RoleTaskHome.jsx");
const copilot = read("web/src/components/copilot/FloatingCopilotDrawer.jsx");
const roleNavigation = read("web/src/utils/roleNavigation.js");
const terminology = read("web/src/utils/terminology.js");
const displayStatus = read("web/src/utils/displayStatus.js");
const commercialSummary = read("web/src/components/CommercialReadonlySummary.jsx");
const commercialShiftCard = read("web/src/panels/shared/CommercialShiftCardPresentation.jsx");
const roomCommercial = read("web/src/panels/room/CommercialFlowPanel.jsx");
const companyCommercial = read("web/src/panels/company/CommercialFlowPanel.jsx");
const commercialCore = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const collapsible = read("web/src/components/CollapsibleSection.jsx");
const personelLive = read("web/src/panels/personel/LivePanel.jsx");
const parentLive = read("web/src/panels/parent/LivePanel.jsx");
assert(css.includes("PRE-#18 — premium typography and responsive hierarchy polish"), "single PRE-#18 typography layer is present");
assert(css.includes("--pre18-type-family: Inter, system-ui, Arial, sans-serif"), "canonical Inter typography family token is present");
assert(css.includes("--pre18-type-page-title-size: 36px") && css.includes("--pre18-type-page-title-line: 1.14"), "balanced page-title scale is present");
assert(css.includes("--pre18-type-section-title-size: 24px") && css.includes("--pre18-type-card-title-size: 17px"), "balanced section/card scale is present");
assert(css.includes("--pre18-type-body-size: 14px") && css.includes("--pre18-type-helper-size: 12px"), "body/helper scale is present");
for (const selector of [".panelTitle", ".roleSectionTitle", ".card > h3", ".navLabel", ".tbl th", ".tbl td", ".copilotDrawerTitle", ".pre18-type-meta"]) {
  assert(css.includes(selector), `canonical semantic typography selector is present: ${selector}`);
}
assert(!css.includes("ui-sans-serif") && !css.includes("ui-monospace") && !css.includes("monospace"), "visible web CSS has no competing implementation font family");
assert(mapShellCss.includes("font-family:var(--pre18-type-family, Inter, system-ui, Arial, sans-serif)") && !mapShellCss.includes("ui-sans-serif") && !mapShellCss.includes("ui-monospace"), "map/Command Center uses the canonical font family");
assert(notifications.includes("font-family: Inter, system-ui, Arial, sans-serif") && !notifications.includes("ui-monospace"), "notification technical detail uses the canonical family");
assert(shell.includes("shellTopBrand") && shell.includes('variant="mark"'), "authenticated topbar keeps only compact brand symbol");
assert(roleTask.includes('data-details="task-workspace"'), "task-home disclosure owner remains intact");
assert(copilot.includes("Sefer Abi’ye Sor") && copilot.includes("copilotDrawer"), "Sefer Abi single entry and quick/full owner remain intact");
assert(read("backend/prisma/schema/identity.prisma").includes("enum Role"), "backend role model remains in place");
assert(!trackedNames(["diff", "--name-only", "HEAD"]).some((file) => file === "backend/prisma/schema/identity.prisma"), "terminology polish did not modify auth role schema");

const premiumUxAssertions = [
  [roleNavigation.includes('label: "Ticari Çalışma Alanı"') && !roleNavigation.includes('label: "Ticari Akışım"'), "UX-R1 keeps ROOM commercial work visible in the primary information architecture"],
  [roleNavigation.includes('homeLabel: isSchool ? "Okul Merkezi" : "Planlama Merkezi"') && roleNavigation.includes('label: "Organizasyon Planları"'), "UX-R1 distinguishes the organization decision center from record-level plans"],
  [roleNavigation.includes('if (!ctx.isSchool)') && roleNavigation.includes('title: "FİNANS VE TİCARİ AKIŞ"'), "UX-R6 keeps company commercial complexity out of the SCHOOL primary navigation"],
  [roleNavigation.includes('label: "Canlı İzleme", path: "/superadmin/observability"') && roleNavigation.includes('advanced: [{ label: "İşlem Kayıtları"'), "UX-R6 places deep Super Admin observability in advanced navigation"],
  [roleTask.includes('data-primary-cta="true"') && read("web/src/components/OperationsCommandCenter.jsx").includes('events.slice(0, 5)') && read("web/src/components/OperationsCommandCenter.jsx").includes('Tüm gelişmeleri göster'), "UX-R1 preserves one primary task-home CTA and at most five first-layer actionable items"],
  [terminology.includes('export const STATUS_LABELS') && displayStatus.includes('import { STATUS_LABELS, userFacingStatusLabel }') && terminology.includes('"Tanımlı olmayan durum"'), "UX-R2 uses one canonical status presentation map and an explicit unknown-status boundary"],
  [commercialSummary.includes('Sözleşme ödeme hazırlığı:') && commercialSummary.includes('Taşımacılık Firması ödeme hazırlığı — önizleme') && !commercialSummary.includes('başarı payı oranı — önizleme') && commercialShiftCard.includes('Taşımacılık Firması karşı teklifi'), "UX-R3 labels payment preparation, offer and provider preview by their current source meaning"],
  [roomCommercial.includes('Hakediş hazırlık özeti') && commercialCore.includes('const showCommercialExecutionControls = false;') && commercialCore.includes('data-commercial-preparation-readonly="true"') && commercialCore.includes('showCommercialExecutionControls ? ('), "UX-R3 keeps the payment-preparation preview visible while execution controls remain explicitly unavailable"],
  [collapsible.includes('data-disclosure-layer={layer}') && read("web/src/components/PanelChrome.jsx").includes('data-panel-primary-action="true"'), "UX-R4 provides shared primary-action and details-layer contracts"],
  [!copilot.includes('modeMeta(') && !copilot.includes('setMode(') && !copilot.includes('drawerMode:') && copilot.includes('buildSuggestions(path, selection, screenContext, me)') && copilot.includes('}).slice(0, 3)'), "Sefer Abi removes redundant persistent modes while keeping three contextual suggestions"],
  [copilot.includes('if (q) return q;') && copilot.includes('copilotContextSuggestions') && copilot.includes('aria-expanded={suggestionsOpen}') && copilot.includes('setSuggestionsOpen((previous) => !previous)'), "Sefer Abi preserves natural-language capability with an accessible suggestion accordion"],
  [css.includes('.companyCommercialFlowTable') && css.includes('companyCommercialFlowTable > table > tbody > tr > td:nth-child(6)::before'), "UX-R5 converts the commercial table to a labelled compact decision list on mobile"],
  [personelLive.includes('function etaEstimateKind') && personelLive.includes('Hesaplanan tahmini süre') && parentLive.includes('Son konum güncellemesi'), "UX-R6 labels derived personnel estimates and parent freshness plainly"],
];
for (const [condition, message] of premiumUxAssertions) assert(condition, message);
console.log(`PRE_18_PREMIUM_UX_SOURCE_ASSERTION_COUNT=${premiumUxAssertions.length}`);
console.log(`PRE_18_PREMIUM_UX_SOURCE_PASS_COUNT=${premiumUxAssertions.length}`);
console.log("PRE_18_PREMIUM_UX_SOURCE_FAIL_COUNT=0");

const changed = new Set(trackedNames(["diff", "--name-only", "HEAD"]));
const staged = trackedNames(["diff", "--cached", "--name-only"]);
assert(staged.every((file) => !protectedRuntime.includes(file)), "protected runtime files are not staged");
assert(staged.every((file) => !protectedRuntime.includes(file)), "protected runtime files are not part of the staged PRE-#18 change set");
assert(fs.existsSync(path.join(repoRoot, "docs", "PRE_18_PREMIUM_UI_POLISH_01.md")), "bounded PRE-#18 evidence owner exists");

for (const [name, value] of Object.entries(counters)) console.log(`${name}=${value}`);
console.log("PRE_18_PREMIUM_UI_POLISH_GREEN");
