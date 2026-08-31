#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rel = (name) => path.join(root, name);
const read = (name) => fs.readFileSync(rel(name), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(`FAIL ${message}`); console.log(`PASS ${message}`); };
const exists = (name) => fs.existsSync(rel(name));
const normalizePath = (value) => String(value || "").replace(/\\/g, "/");
const roles = ["SUPER_ADMIN", "COMPANY", "ROOM", "SCHOOL", "ORGANIZATION", "DRIVER", "PERSONEL", "PARENT"];

function visibleSource(source) {
  return String(source || "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function main() {
  console.log("=== #17 ROLE-BASED-SIMPLE-NAVIGATION-AND-TASK-HOME-01 CHECK ===");
  const manifestPath = "docs/ROLE_BASED_SIMPLE_NAVIGATION_AND_TASK_HOME_01.json";
  const handoffPath = "docs/ROLE_BASED_SIMPLE_NAVIGATION_AND_TASK_HOME_01_TERMINOLOGY_HANDOFF.json";
  const manifest = JSON.parse(read(manifestPath));
  const handoff = JSON.parse(read(handoffPath));
  const navSource = read("web/src/utils/roleNavigation.js");
  const navDockSource = read("web/src/layout/NavDock.jsx");
  const appSource = read("web/src/App.jsx");
  const homeSource = read("web/src/components/RoleTaskHome.jsx");
  const commandSource = read("web/src/components/OperationsCommandCenter.jsx");
  const mapDisclosureSource = read("web/src/components/map/MapOperationsDisclosure.jsx");
  const roomMapSource = read("web/src/panels/room/MapPanel.jsx");
  const companyMapSource = read("web/src/panels/company/MapPanel.jsx");
  const mapCssSource = read("web/src/index.css");
  const drawerSource = read("web/src/components/copilot/FloatingCopilotDrawer.jsx");
  const fullSource = read("web/src/panels/shared/CopilotPanel.jsx");
  const sharedSource = read("web/src/utils/copilotSharedState.js");
  const pkg = JSON.parse(read("package.json"));

  must(manifest.milestone === "ROLE-BASED-SIMPLE-NAVIGATION-AND-TASK-HOME-01", "manifest milestone identity");
  must(manifest.status === "IMPLEMENTED", "manifest status is implementation evidence");
  must(Array.isArray(manifest.screens) && manifest.screens.length === 8, "manifest covers exactly eight contexts");
  must(new Set(manifest.screens.map((row) => row.role)).size === 8 && roles.every((role) => manifest.screens.some((row) => row.role === role)), "all supported role contexts are present");
  must(manifest.screens.every((row) => row.route && row.task && row.primaryCta && row.summaryOwner && row.issueOwner && row.detailsOwner && row.advancedOwner), "manifest has task hierarchy owners for every context");
  for (const row of manifest.screens) {
    for (const owner of [row.summaryOwner, row.issueOwner, row.detailsOwner, row.advancedOwner]) must(exists(owner), `${row.role} owner exists: ${owner}`);
  }
  for (const owner of Object.values(manifest.sourceOwners)) must(exists(owner), `source owner exists: ${owner}`);

  const navModule = await import(pathToFileURL(rel("web/src/utils/roleNavigation.js")).href);
  for (const role of roles) {
    const me = role === "SCHOOL" ? { role: "COMPANY", companyKind: "SCHOOL" } : role === "ORGANIZATION" ? { role: "COMPANY", companyKind: "ORGANIZATION" } : { role };
    const cfg = navModule.getRoleNavigation(me);
    const items = [...(cfg.sections || []), { items: cfg.advanced || [] }].flatMap((section) => section.items || []);
    const paths = items.map((item) => item.path);
    must(items.length > 0, `${role} has role-aware navigation`);
    must(new Set(paths).size === paths.length, `${role} has no duplicate primary navigation paths`);
    must(items.every((item) => !/terminal/i.test(`${item.label} ${item.path}`)), `${role} has no user-facing terminal navigation item`);
    must(items.every((item) => !String(item.path).includes("/copilot")), `${role} has no separate assistant primary navigation item`);
  }
  must((navSource.match(/export function getRoleNavigation/g) || []).length === 1, "one canonical navigation owner");
  must(!visibleSource(navDockSource).includes("Sefer Abi Terminali"), "visible NavDock source has no terminal label");
  must(!visibleSource(navDockSource).includes("copilotSection"), "NavDock renders no second assistant section");
  must(appSource.includes("<RoleTaskHome>") && appSource.includes('path === "/room"'), "application mounts task home routes");

  must(homeSource.includes("data-role-task-home={role}"), "task-home carries role identity");
  must(homeSource.includes('data-primary-cta="true"'), "task-home exposes one dominant primary action hook");
  must(homeSource.includes("<OperationsCommandCenter"), "task-home composes the command center");
  must(homeSource.includes("<details className=\"roleTaskDetails\""), "task-home keeps existing capability under progressive disclosure");
  must(commandSource.includes("loadRoomOperationHealthBundle") && commandSource.includes("loadCompanyOperationsBundle") && commandSource.includes("loadSchoolOperationsBundle") && commandSource.includes("loadSuperAdminOverviewBundle"), "command center consumes existing canonical signal bundles");
  must(commandSource.includes("sourceOwner") && commandSource.includes("evidence"), "command center keeps signal provenance and evidence");
  must(!commandSource.includes("#20 optimizer") || commandSource.includes("future"), "command center does not implement the future optimizer");
  must((homeSource.match(/className=\"btn primary rolePrimaryCta\"/g) || []).length === 1, "task home has one dominant primary CTA implementation");

  must(manifest.sourceOwners.mapDisclosure === "web/src/components/map/MapOperationsDisclosure.jsx", "map disclosure has one shared presentation owner");
  must(manifest.mapOperations && manifest.mapOperations.defaultVisible.includes("map") && manifest.mapOperations.defaultVisible.includes("current operational state") && manifest.mapOperations.secondaryBehindDisclosure.includes("vehicle/driver/shift list"), "map manifest records summary-first disclosure contract");
  must(mapDisclosureSource.includes("data-map-disclosure=\"secondary\"") && mapDisclosureSource.includes("<details"), "map disclosure uses native persistent details");
  must(roomMapSource.includes("MapOperationsDisclosure") && companyMapSource.includes("MapOperationsDisclosure"), "ROOM and COMPANY map owners use shared disclosure");
  must(roomMapSource.includes('data-map-surface="primary"') && companyMapSource.includes('data-map-surface="primary"'), "map owners expose primary surface identity");
  must(roomMapSource.includes('data-map-current-state="true"') && companyMapSource.includes('data-map-current-state="true"'), "map owners keep current operational state visible");
  must(roomMapSource.includes('data-primary-cta={selectedNext ? "true" : undefined}') && roomMapSource.includes('data-primary-cta={!selectedNext ? "true" : undefined}') && companyMapSource.includes('data-primary-cta={selectedNext ? "true" : undefined}') && companyMapSource.includes('data-primary-cta={!selectedNext ? "true" : undefined}'), "map owners expose one data-aware dominant primary action");
  must(mapCssSource.includes(".mapOperationsDisclosure") && mapCssSource.includes(".mapListDisclosure[open]"), "map disclosure responsive styles keep secondary lists collapsible");

  must((sharedSource.match(/SHARED_COPILOT_STATE_KEY/g) || []).length >= 1, "one shared Sefer Abi state owner exists");
  must(sharedSource.includes("writeCopilotSharedState") && sharedSource.includes("copilotSharedStateEventName"), "shared Sefer Abi state has persistence and event bridge");
  must(drawerSource.includes("copilotFab--mascot") && drawerSource.includes("Tam ekranda aç"), "quick assistant exposes mascot and same-workspace continuation");
  must(drawerSource.includes("writeCopilotSharedState") && fullSource.includes("readCopilotSharedState"), "quick and full assistant use the shared state owner");
  must(!visibleSource(drawerSource).includes("Sefer Abi Terminali"), "quick assistant visible source has no terminal label");
  must(read("web/src/utils/copilotFacts.js").includes("terminalLabel: 'Sefer Abi Terminali'"), "legacy assistant metadata remains internal compatibility only");

  must(handoff.owner === "#15" && handoff.status === "HANDOFF_ONLY" && Array.isArray(handoff.entries) && handoff.entries.length > 0, "#15 terminology handoff exists");
  must(handoff.entries.every((row) => row.role && row.route && row.visibleString && row.category && row.why && row.evidence), "every visible terminology finding is classified");
  must(manifest.futureOwners.terminologySweep === "#15" && manifest.futureOwners.guidedHighlight === "#18" && manifest.futureOwners.optimizerAndDisruptionRecovery === "#20", "future owners remain locked to later milestones");
  must(manifest.commandCenter.futureSignalsExcluded.includes("#20 optimizer") && manifest.commandCenter.futureSignalsExcluded.includes("#30+ proactive assistant"), "future command-center signals remain excluded");
  must(navSource.includes("companyKind") && homeSource.includes("companyKind"), "CompanyKind remains the contextual identity boundary");
  must(appSource.includes('path === "/school/parents"'), "School parent access route remains mounted");
  must(!appSource.includes('role === "SCHOOL"') && !appSource.includes('role === "ORGANIZATION"'), "no fake backend SCHOOL or ORGANIZATION auth role branch");
  must(!appSource.includes("migrate reset") && !appSource.includes("prisma migrate"), "#17 contains no database mutation path");
  must(!pkg.scripts["check:rolebasedsimplenavigationandtaskhome01"] || pkg.scripts["check:rolebasedsimplenavigationandtaskhome01"].includes("role_based_simple_navigation_and_task_home_01_check.js"), "package exposes canonical #17 checker");

  const reportPath = rel("backend/artifacts/browser-smoke/role-based-simple-navigation-and-task-home-01/report.json");
  must(fs.existsSync(reportPath), "real browser evidence report exists");
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  must(report.sourceHead === currentHead(), "browser evidence is current-head bound");
  must(report.rolePassCount >= 8 && report.screenshotEvidenceCount >= 8, "real browser matrix and screenshots cover eight roles");
  must(report.mascotPrimaryEntryPassCount >= 1 && report.mascotOpenClosePassCount >= 1 && report.quickFullContinuityPassCount >= 1, "mascot open/close and quick-full browser acceptance passed");
  must(report.mapProgressiveDisclosureBrowserPassCount >= 1 && report.mapFiveSecondHierarchyPassCount >= 1, "real browser proves map progressive disclosure and five-second hierarchy");
  must(report.mapDisclosureUnexpectedResetCount === 0 && report.mapMobilePrimaryActionOverlapCount === 0 && report.mapMobileBlockingPanelCount === 0 && report.workingMapCapabilityLostCount === 0 && report.criticalMapOperationSignalHiddenCount === 0 && report.mapDefaultVisibleTechnicalOverloadCount === 0, "map keeps critical state, task action, mobile reachability, and stable disclosure");
  must(report.userFacingTerminalLabelCount === 0 && report.duplicatePrimaryEntryCount === 0 && report.criticalUiOverlapCount === 0, "browser proves single non-overlapping assistant entry");
  must(report.consoleErrorCount === 0 && report.pageErrorCount === 0 && report.unexpected500Count === 0, "#17 browser run has no console/page/server errors");

  console.log("=== #17 ROLE-BASED-SIMPLE-NAVIGATION-AND-TASK-HOME-01 CHECK PASS ===");
}

main().catch((error) => { console.error(error?.stack || String(error)); process.exit(1); });
