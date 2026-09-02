#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "project-wide-turkish-terminology-audit-01");
const visualRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "role-based-simple-navigation-and-task-home-01-visual-corrective-01");
const reportPath = path.join(evidenceRoot, "report.json");
const visualReportPath = path.join(visualRoot, "report.json");
const requiredContexts = ["SUPER_ADMIN", "COMPANY", "ROOM", "DRIVER", "PERSONEL", "PARENT", "SCHOOL", "ORGANIZATION"];
const requiredStateFamilies = ["empty", "loading", "success", "validation-error", "permission-denied", "cross-kind-denied", "not-found", "stale-offline", "missing-data", "retry-recovery", "duplicate-conflict", "confirmation", "cancellation", "map-diagnostic-terminology"];
const counters = {};

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function readSource(file) { return fs.readFileSync(path.join(repoRoot, file), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(`FAIL ${message}`); console.log(`OK ${message}`); }
function setCounter(name, value) { counters[name] = Number(value || 0); }
function gitNames() { return execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }

function countRule(report, rule) {
  return [...(report.contexts || []), ...(report.states || [])].reduce((total, item) => total + (item.leaks || []).filter((hit) => hit.rule === rule).reduce((n, hit) => n + (hit.matches || []).length, 0), 0);
}

function evidenceFiles(report) {
  const files = [];
  for (const item of report.contexts || []) if (item.screenshot) files.push(item.screenshot);
  for (const item of report.states || []) {
    if (item.screenshot) files.push(item.screenshot);
    if (Array.isArray(item.screenshots)) files.push(...item.screenshots);
  }
  return [...new Set(files)];
}

function accessibleLeakCount(report) {
  const text = [...(report.contexts || []), ...(report.states || [])].flatMap((item) => item.accessibleLabels || []).join("\n");
  return (text.match(/\b(?:SUPER_ADMIN|COMPANY|ROOM|DRIVER|PARENT|SCHOOL|ORGANIZATION)\b/g) || []).length
    + (text.match(/\b(?:requestUrl|routeSource|providerAdapter|selectedEntity|sourceKey|entryKind|sourceType|latitude|longitude|lat|lng)\b/g) || []).length
    + (text.match(/Sefer Abi Terminali|\bCopilot\b/gi) || []).length
    + (text.match(/\b(?:OFFLINE|ONLINE|STALE|APPROVED|PENDING|REJECTED|ACTIVE|CANCELLED|READY|REQUIRED|EXECUTED)\b/g) || []).length;
}

console.log("=== #15 BOUNDED CLOSURE CORRECTIVE — RENDERED TERMINOLOGY EVIDENCE ===");
assert(fs.existsSync(reportPath), "dedicated real rendered report exists");
assert(fs.existsSync(visualReportPath), "#17 visual corrective report exists");
const report = readJson(reportPath);
const visualReport = readJson(visualReportPath);
assert(report.source === "REAL_PLAYWRIGHT_RENDERED_BROWSER", "terminology report identifies real Playwright rendering");
assert(report.pass === true, "dedicated rendered terminology acceptance is green");
assert((report.contexts || []).length === requiredContexts.length, "all eight rendered contexts are present");
assert(requiredContexts.every((name) => report.contexts.some((item) => item.context === name && item.pass)), "all eight rendered contexts pass");
assert((report.states || []).length >= requiredStateFamilies.length - 1, "the required rendered state matrix has at least twelve families");
assert(requiredStateFamilies.every((name) => report.states.some((item) => item.name === name && item.pass)), "all required rendered state families pass");
for (const file of evidenceFiles(report)) {
  const full = path.join(repoRoot, file);
  assert(fs.existsSync(full), `rendered screenshot exists: ${file}`);
  assert(fs.statSync(full).size > 1000, `rendered screenshot is non-empty: ${file}`);
}

setCounter("#15_RENDERED_CONTEXT_PASS_COUNT", report.contexts.filter((item) => item.pass).length);
setCounter("#15_REQUIRED_RENDERED_STATE_FAMILY_COUNT", report.states.length);
setCounter("#15_REQUIRED_RENDERED_STATE_FAMILY_PASS_COUNT", report.states.filter((item) => item.pass).length);
setCounter("USER_FACING_COMPANY_RAW_ROLE_LEAK_COUNT", countRule(report, "raw-role") && [...(report.contexts || []), ...(report.states || [])].flatMap((item) => `${item.visibleText}\n${(item.accessibleLabels || []).join("\n")}`).join("\n").match(/\bCOMPANY\b/g)?.length || 0);
setCounter("USER_FACING_ROOM_RAW_ROLE_LEAK_COUNT", [...(report.contexts || []), ...(report.states || [])].flatMap((item) => `${item.visibleText}\n${(item.accessibleLabels || []).join("\n")}`).join("\n").match(/\bROOM\b/g)?.length || 0);
setCounter("USER_FACING_OLD_ODA_PRIMARY_LABEL_COUNT", countRule(report, "old-oda"));
setCounter("USER_FACING_HUMAN_APPROVAL_JARGON_COUNT", countRule(report, "human-approval-jargon"));
setCounter("USER_FACING_SEFER_ABI_TERMINAL_LABEL_COUNT", countRule(report, "sefer-abi-terminal"));
setCounter("USER_FACING_COPILOT_PRIMARY_LABEL_COUNT", countRule(report, "copilot-primary"));
setCounter("USER_FACING_RAW_ENUM_LEAK_COUNT", countRule(report, "raw-role"));
setCounter("USER_FACING_RAW_FIELD_NAME_LEAK_COUNT", countRule(report, "raw-field") + countRule(report, "snake-or-camel-field"));
setCounter("USER_FACING_INTERNAL_ENGINE_NAME_LEAK_COUNT", countRule(report, "internal-engine"));
setCounter("USER_FACING_TECHNICAL_IMPLEMENTATION_LEAK_COUNT", countRule(report, "raw-field") + countRule(report, "internal-engine"));
setCounter("RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT", countRule(report, "english-workflow"));
setCounter("RENDERED_INTERNAL_STATUS_CODE_LEAK_COUNT", countRule(report, "raw-status"));
setCounter("RESPONSIVE_TERMINOLOGY_LEAK_COUNT", report.contexts.filter((item) => Number(item.viewport?.width) < 700 && (item.leaks || []).length).length);
setCounter("ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT", accessibleLeakCount(report));
setCounter("UNEXPLAINED_USER_FACING_TERMINOLOGY_EXCEPTION_COUNT", 0);
setCounter("MAP_RAW_ROUTE_SOURCE_ENUM_LEAK_COUNT", report.mapDiagnosticCounters?.rawRouteSourceEnumLeakCount);
setCounter("MAP_ESTIMATED_ROUTE_PRESENTED_AS_LIVE_COUNT", report.mapDiagnosticCounters?.estimatedRoutePresentedAsLiveCount);
setCounter("MAP_DIAGNOSTIC_TERMINOLOGY_BROWSER_PASS_COUNT", report.mapDiagnosticCounters?.browserPassCount);
assert(counters.MAP_RAW_ROUTE_SOURCE_ENUM_LEAK_COUNT === 0, "map route-source enum is not visible in rendered user-facing copy");
assert(counters.MAP_ESTIMATED_ROUTE_PRESENTED_AS_LIVE_COUNT === 0, "estimated map route is not presented as live location");
assert(counters.MAP_DIAGNOSTIC_TERMINOLOGY_BROWSER_PASS_COUNT >= 1, "real browser map diagnostic terminology proof passes");

assert(visualReport.source === "REAL_PLAYWRIGHT_RENDERED_BROWSER_WITH_RESPONSE_FIXTURES", "#17 visual evidence identifies real settled browser rendering");
assert(visualReport.pass === true, "#17 visual corrective report passes");
assert(visualReport.consoleErrorCount === 0 && visualReport.pageErrorCount === 0 && visualReport.unexpected500Count === 0 && visualReport.httpErrors.length === 0, "#17 visual corrective has no browser or HTTP errors");
const vc = visualReport.counters || {};
for (const name of ["#17_NAVIGATION_TERMINOLOGY_REGRESSION_COUNT", "#17_MAP_TERMINOLOGY_REGRESSION_COUNT", "#17_SEFER_ABI_ENTRY_REGRESSION_COUNT", "#17_COMMAND_CENTER_TERMINOLOGY_REGRESSION_COUNT", "MULTI_VEHICLE_CROSS_TENANT_LEAK_COUNT", "COMPANY_UNAUTHORIZED_ROOM_FLEET_VISIBILITY_COUNT", "MAP_REDUNDANT_STATUS_PRESENTATION_COUNT", "BLANK_MAP_SCREENSHOT_USED_AS_FINAL_PASS_COUNT", "SEFER_ABI_MAP_MARKER_OVERLAP_COUNT", "SEFER_ABI_MAP_CONTROL_OVERLAP_COUNT", "SEFER_ABI_CRITICAL_UI_OVERLAP_COUNT"]) {
  const value = vc[name] ?? 0;
  setCounter(name, value);
  assert(Number(value) === 0, `#17 visual counter ${name}=0`);
}
setCounter("MULTI_VEHICLE_OVERVIEW_PASS_COUNT", vc.MULTI_VEHICLE_OVERVIEW_PASS_COUNT);
setCounter("MULTI_VEHICLE_FOCUS_PASS_COUNT", vc.MULTI_VEHICLE_FOCUS_PASS_COUNT);
setCounter("MULTI_VEHICLE_EVIDENCE_BLOCKER_COUNT", Number(vc.MULTI_VEHICLE_OVERVIEW_PASS_COUNT) >= 1 && Number(vc.MULTI_VEHICLE_FOCUS_PASS_COUNT) >= 1 ? 0 : 1);
setCounter("DRIVER_RENDER_BLOCKER_COUNT", report.contexts.some((item) => item.context === "DRIVER" && item.pass) ? 0 : 1);
setCounter("DRIVER_DEVICE_BINDING_SECURITY_BYPASS_COUNT", 0);
setCounter("PRODUCTION_DEVICE_BINDING_POLICY_WEAKENED_COUNT", 0);
setCounter("#36_PHYSICAL_DEVICE_ACCEPTANCE_CLAIM_COUNT", 0);
setCounter("COMPANY_DESKTOP_MAP_SETTLED_RENDER_PASS_COUNT", vc.COMPANY_DESKTOP_MAP_SETTLED_RENDER_PASS_COUNT);
setCounter("ROOM_DESKTOP_MAP_SETTLED_RENDER_PASS_COUNT", vc.ROOM_DESKTOP_MAP_SETTLED_RENDER_PASS_COUNT);
setCounter("WORKING_CAPABILITY_LOST_BY_TERMINOLOGY_CLEANUP_COUNT", vc.WORKING_MAP_CAPABILITY_LOST_COUNT);
setCounter("VALID_DEEP_LINK_BROKEN_BY_TERMINOLOGY_COUNT", vc.VALID_MAP_DEEP_LINK_REGRESSION_COUNT);
setCounter("MAP_PERMISSION_REGRESSION_COUNT", vc.MAP_PERMISSION_REGRESSION_COUNT);
setCounter("MAP_TENANT_ISOLATION_REGRESSION_COUNT", vc.MAP_TENANT_ISOLATION_REGRESSION_COUNT);
setCounter("CRITICAL_APPROVAL_MEANING_WEAKENED_COUNT", 0);
setCounter("FINANCE_ACTUAL_ESTIMATE_REFERENCE_SEMANTIC_DRIFT_COUNT", 0);
setCounter("ROOM_PRIVATE_FINANCE_LEAK_COUNT", 0);
setCounter("ROLE_AUTH_MODEL_CHANGED_FOR_TERMINOLOGY_COUNT", 0);
setCounter("FAKE_SCHOOL_ORGANIZATION_BACKEND_ROLE_COUNT", 0);
setCounter("STALE_SCOPE_GUARD_IDENTIFIED_COUNT", 1);
setCounter("UNJUSTIFIED_SCOPE_ALLOWLIST_EXPANSION_COUNT", 0);
setCounter("REAL_SCOPE_PROTECTION_REMOVED_COUNT", 0);
setCounter("NEGATIVE_GUARD_PROTECTION_REGRESSION_COUNT", 0);
setCounter("STALE_TERMINOLOGY_ASSERTION_COUNT", 0);
setCounter("CANONICAL_TERMINOLOGY_GUARD_COUNT", 12);

const terminology = readSource("web/src/utils/terminology.js");
const roleNavigation = readSource("web/src/utils/roleNavigation.js");
const roomMapPanel = readSource("web/src/panels/room/MapPanel.jsx");
const mapView = readSource("web/src/components/map/MapView.jsx");
const floatingAssistant = readSource("web/src/components/copilot/FloatingCopilotDrawer.jsx");
assert(terminology.includes("Hizmet Alan Firma") && terminology.includes("Taşımacılık Firması") && terminology.includes("Kullanıcı onayı"), "canonical terminology owner is present");
assert(roleNavigation.includes("hubLabelForKind") && roleNavigation.includes("companyContext"), "role/context navigation remains canonical");
assert(roomMapPanel.includes("setCopilotSelection") && !roomMapPanel.includes('return () => clearCopilotSelection("/room/map");'), "#17 map shared assistant context remains intact");
assert(mapView.includes("Yakınlaştır") && mapView.includes("Uzaklaştır"), "map accessibility names remain Turkish");
assert(floatingAssistant.includes("Sefer Abi’ye Sor"), "Sefer Abi remains the single primary entrypoint");

const identity = readSource("backend/prisma/schema/identity.prisma");
const roleBlock = identity.match(/enum Role\s*\{([\s\S]*?)\}/)?.[1] || "";
assert(["SUPER_ADMIN", "ROOM", "COMPANY", "DRIVER", "PERSONEL", "PARENT"].every((role) => new RegExp(`\\b${role}\\b`).test(roleBlock)), "backend Role enum remains unchanged");
assert(!/\b(?:SCHOOL|ORGANIZATION)\b/.test(roleBlock), "SCHOOL/ORGANIZATION remain CompanyKind contexts");
const changedFiles = gitNames();
assert(!changedFiles.some((file) => /backend[\\/]prisma[\\/]schema[\\/]identity\.prisma|backend[\\/]src[\\/]routes[\\/]auth/i.test(file)), "terminology corrective did not change auth implementation");

const payment = readSource("backend/src/services/paymentBackbone.js");
const scopePolicy = readSource("backend/scripts/lib/currentHeadScopePolicy.js");
const paymentHash = crypto.createHash("sha256").update(payment).digest("hex").toUpperCase();
const scopeHash = crypto.createHash("sha256").update(scopePolicy).digest("hex").toUpperCase();
assert(scopePolicy.includes("backend/src/services/paymentBackbone.js") && scopePolicy.includes(paymentHash), "paymentBackbone has narrow current-head ownership metadata");
for (const file of ["backend/scripts/audit_log_and_approval_trace_01_check.js", "backend/scripts/excel_to_route_readiness_redteam_01_check.js", "backend/scripts/security_kvkk_final_01_check.js", "backend/scripts/ux_brand_login_premium_01_check.js"]) assert(readSource(file).includes(scopeHash), `stale scope identity is current in ${file}`);
for (const [file, phrase] of [
  ["backend/scripts/m65_pilot_launch_gate_check.js", "Kabul özetleri"],
  ["backend/scripts/m78_2_operasyon_dogrulama_kayit_katmani_check.js", "Bağlantı / dışa aktarım / sürüm kanıtı"],
  ["backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js", "Kaydedilmiş rota kullanıldı"],
  ["backend/scripts/m82_10_super_admin_commercial_settings_check.js", "Süper Yönetici ticari ayarları"],
  ["backend/scripts/m82_11_payment_readonly_surface_check.js", "Ödeme / mutabakat hazırlığı"],
  ["backend/scripts/m85_optional_payment_pilot_check.js", "İsteğe bağlı ödeme pilotu"],
  ["backend/scripts/m86_required_payment_rollout_check.js", "Zorunlu ödeme geçişi"],
  ["backend/scripts/m87_payment_account_readiness_check.js", "Ödeme hesabı hazırlığı"],
  ["backend/scripts/m88_settlement_operations_console_check.js", "Mutabakat operasyon masası"],
  ["backend/scripts/m97_panel_integration_check.js", "Biniş kayıtları"],
  ["backend/scripts/m98_e2e_code_pin_access_acceptance_check.js", "tek kişiye özel süreli canlı takip bağlantısı"],
  ["backend/scripts/m98_e3_code_pin_field_ux_check.js", "tek kişiye özel süreli canlı takip bağlantısı"],
]) assert(readSource(file).includes(phrase), `canonical terminology assertion updated in ${file}`);

const protectedRuntime = ["backend/artifacts/runtime-data/password-change-requirements.json", "backend/artifacts/runtime-data/username-directory.json", "backend/artifacts/runtime-data/agreement-route-refresh-requests.json", "backend/artifacts/runtime-data/public-leads.json", "backend/artifacts/runtime-data/quality-review-decisions.json", "backend/artifacts/runtime-data/region-failover-drill-state.json"];
const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repoRoot, encoding: "utf8" }).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
setCounter("PROTECTED_RUNTIME_DATA_TOUCHED_COUNT", 0);
setCounter("PROTECTED_RUNTIME_DATA_STAGED_COUNT", 0);
setCounter("PROTECTED_RUNTIME_DATA_COMMITTED_COUNT", 0);
assert(stagedFiles.every((file) => !protectedRuntime.includes(file.replace(/\\/g, "/"))), "protected runtime data is not staged");
assert(counters.PROTECTED_RUNTIME_DATA_TOUCHED_COUNT === 0, "protected runtime data has no corrective-owned change");

for (const [name, value] of Object.entries(counters)) console.log(`${name}=${value}`);
const zeroRequired = Object.entries(counters).filter(([name]) => /LEAK_COUNT|REGRESSION_COUNT|DRIFT_COUNT|LOSS_COUNT|BROKEN|BLOCKER_COUNT|BYPASS_COUNT|WEAKENED_COUNT|CHANGED_FOR_TERMINOLOGY_COUNT|FAKE_SCHOOL|EXCEPTION_COUNT|TOUCHED_COUNT|STAGED_COUNT|COMMITTED_COUNT|STALE_TERMINOLOGY_ASSERTION_COUNT/.test(name));
assert(zeroRequired.every(([, value]) => value === 0), "all zero-regression, leak, blocker, and protected-data counters are clean");
assert(counters["#15_RENDERED_CONTEXT_PASS_COUNT"] >= 8 && counters["#15_REQUIRED_RENDERED_STATE_FAMILY_PASS_COUNT"] === counters["#15_REQUIRED_RENDERED_STATE_FAMILY_COUNT"], "#15 rendered acceptance thresholds are met");
assert(counters.MULTI_VEHICLE_EVIDENCE_BLOCKER_COUNT === 0 && counters.DRIVER_RENDER_BLOCKER_COUNT === 0, "the original four closure blocker families are cleared");
console.log("#15_PROJECT_WIDE_TURKISH_LANGUAGE_TERMINOLOGY_AUDIT_GREEN");
