#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const paths = {
  packageJson: "package.json",
  runner: "backend/scripts/run_product_extensions_check_chain.js",
  verify: "backend/scripts/verify_chain_01_product_extensions_check.js",
  harnessCheck: "backend/scripts/script_harness_consolidation_01_check.js",
  harnessDoc: "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
  guide: "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  primer: "docs/PRIMER_SSOT.md",
  doc: "docs/DASHBOARD_BULK_ENDPOINT_01.md",
  requestStormDoc: "docs/REQUEST_STORM_RESILIENCE_01.md",
  policyDoc: "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md",
  route: "backend/src/routes/dashboardBulk.js",
  service: "backend/src/services/dashboardBulk.js",
  server: "backend/src/server.js",
  routeMounts: "backend/src/bootstrap/routeMounts.js",
  uiHelper: "web/src/utils/dashboardBulk.js",
  companyPanel: "web/src/panels/company/OperationsPanel.jsx",
  schoolPanel: "web/src/panels/school/OperationsPanel.jsx",
  roomHealthPanel: "web/src/panels/room/OperationHealthPanel.jsx",
  roomCommercialPanel: "web/src/panels/room/CommercialFlowPanel.jsx",
  superadminPanel: "web/src/panels/superadmin/SuperAdminPanel.jsx",
  debugLog: "debug.log",
};

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
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

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContains(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function addNotContains(cases, label, text, needle) {
  addCase(cases, label, () => must(!contains(text, needle), `${label} unexpectedly contains ${needle}`));
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

function main() {
  console.log("=== DASHBOARD-BULK-ENDPOINT-01 CHECK ===");

  const pkg = read(paths.packageJson);
  const runner = read(paths.runner);
  const verify = read(paths.verify);
  const harnessCheck = read(paths.harnessCheck);
  const harnessDoc = read(paths.harnessDoc);
  const guide = read(paths.guide);
  const primer = read(paths.primer);
  const doc = read(paths.doc);
  const requestStormDoc = read(paths.requestStormDoc);
  const policyDoc = read(paths.policyDoc);
  const route = read(paths.route);
  const service = read(paths.service);
  const server = read(paths.server);
  const routeMounts = read(paths.routeMounts);
  const uiHelper = read(paths.uiHelper);
  const companyPanel = read(paths.companyPanel);
  const schoolPanel = read(paths.schoolPanel);
  const roomHealthPanel = read(paths.roomHealthPanel);
  const roomCommercialPanel = read(paths.roomCommercialPanel);
  const superadminPanel = read(paths.superadminPanel);

  const cases = [];

  addContains(cases, "package.json exposes dashboard bulk endpoint alias", pkg, '"check:dashboardbulkendpoint01": "node backend/scripts/dashboard_bulk_endpoint_01_check.js"');
  addContains(cases, "product extensions runner includes dashboard bulk endpoint check", runner, "check:dashboardbulkendpoint01");
  addContains(cases, "verify chain includes dashboard bulk endpoint check", verify, '"check:dashboardbulkendpoint01"');

  addContains(cases, "script harness check knows dashboard bulk endpoint milestone", harnessCheck, "DASHBOARD-BULK-ENDPOINT-01");
  addContains(cases, "script harness check knows dashboard bulk endpoint alias", harnessCheck, "check:dashboardbulkendpoint01");
  addContains(cases, "script harness check knows dashboard bulk endpoint doc", harnessCheck, "docs/DASHBOARD_BULK_ENDPOINT_01.md");
  addContains(cases, "script harness check knows dashboard bulk endpoint command", harnessCheck, "backend/scripts/dashboard_bulk_endpoint_01_check.js");

  addContains(cases, "script harness doc lists dashboard bulk endpoint milestone", harnessDoc, "DASHBOARD-BULK-ENDPOINT-01");
  addContains(cases, "script harness doc lists dashboard bulk endpoint alias", harnessDoc, "check:dashboardbulkendpoint01");
  addContains(cases, "script harness doc lists dashboard bulk endpoint doc", harnessDoc, "docs/DASHBOARD_BULK_ENDPOINT_01.md");
  addContains(cases, "script harness doc lists dashboard bulk endpoint command", harnessDoc, "node backend\\scripts\\dashboard_bulk_endpoint_01_check.js");

  addContains(cases, "milestone guide mentions dashboard bulk endpoint milestone", guide, "DASHBOARD-BULK-ENDPOINT-01");
  addContains(cases, "milestone guide exposes dashboard bulk endpoint check", guide, "check:dashboardbulkendpoint01");
  addContains(cases, "milestone guide includes dashboard bulk endpoint command", guide, "node backend\\scripts\\dashboard_bulk_endpoint_01_check.js");
  addContains(cases, "milestone guide includes dashboard bulk endpoint doc", guide, "docs/DASHBOARD_BULK_ENDPOINT_01.md");

  addContains(cases, "primer mentions dashboard bulk endpoint milestone", primer, "DASHBOARD-BULK-ENDPOINT-01");
  addContains(cases, "primer exposes dashboard bulk endpoint check", primer, "check:dashboardbulkendpoint01");
  addContains(cases, "primer links dashboard bulk endpoint doc", primer, "docs/DASHBOARD_BULK_ENDPOINT_01.md");
  addContains(cases, "primer links dashboard bulk endpoint command", primer, "backend/scripts/dashboard_bulk_endpoint_01_check.js");

  addContains(cases, "dashboard bulk doc title present", doc, "# DASHBOARD-BULK-ENDPOINT-01");
  addContains(cases, "dashboard bulk doc purpose heading present", doc, "## 1) Purpose");
  addContains(cases, "dashboard bulk doc problem statement heading present", doc, "## 2) Problem statement");
  addContains(cases, "dashboard bulk doc bulk policy heading present", doc, "## 3) Bulk policy");
  addContains(cases, "dashboard bulk doc backend implementation heading present", doc, "## 4) Backend implementation");
  addContains(cases, "dashboard bulk doc frontend integration heading present", doc, "## 5) Frontend integration");
  addContains(cases, "dashboard bulk doc new guard script heading present", doc, "## 6) New guard script");
  addContains(cases, "dashboard bulk doc validation heading present", doc, "## 7) Validation");
  addContains(cases, "dashboard bulk doc smoke expectations heading present", doc, "## 8) Smoke expectations");
  addContains(cases, "dashboard bulk doc diff safety heading present", doc, "## 9) Diff / boundary safety");
  addContains(cases, "dashboard bulk doc remaining risks heading present", doc, "## 10) Remaining risks");
  addContains(cases, "dashboard bulk doc next milestone heading present", doc, "## 11) Next recommended milestone");
  addContains(cases, "dashboard bulk doc read-only wording present", doc, "read-only bulk endpoint");
  addContains(cases, "dashboard bulk doc write-action boundary present", doc, "write-action");
  addContains(cases, "dashboard bulk doc human approval boundary present", doc, "human approval");
  addContains(cases, "dashboard bulk doc route boundary present", doc, "backend/src/routes");
  addContains(cases, "dashboard bulk doc service boundary present", doc, "backend/src/services");
  addContains(cases, "dashboard bulk doc prisma boundary present", doc, "prisma");
  addContains(cases, "dashboard bulk doc backend prisma boundary present", doc, "backend/prisma");
  addContains(cases, "dashboard bulk doc runtime-data boundary present", doc, "runtime-data");
  addContains(cases, "dashboard bulk doc browser-smoke boundary present", doc, "browser-smoke");
  addContains(cases, "dashboard bulk doc debug.log boundary present", doc, "debug.log");
  addContains(cases, "dashboard bulk doc request storm reference present", doc, "REQUEST-STORM-RESILIENCE-01");
  addContains(cases, "dashboard bulk doc production policy reference present", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");
  addContains(cases, "dashboard bulk doc canonical check present", doc, "check:dashboardbulkendpoint01");
  addContains(cases, "dashboard bulk doc command present", doc, "backend/scripts/dashboard_bulk_endpoint_01_check.js");
  addContains(cases, "dashboard bulk doc mentions company operations bundle", doc, "company-operations");
  addContains(cases, "dashboard bulk doc mentions school operations bundle", doc, "school-operations");
  addContains(cases, "dashboard bulk doc mentions room operation health bundle", doc, "room-operation-health");
  addContains(cases, "dashboard bulk doc mentions room commercial flow bundle", doc, "room-commercial-flow");
  addContains(cases, "dashboard bulk doc mentions superadmin overview bundle", doc, "superadmin-overview");
  addContains(cases, "dashboard bulk doc references request storm resilience", doc, "REQUEST-STORM-RESILIENCE-01");
  addContains(cases, "dashboard bulk doc references production rate limit policy", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");
  addContains(cases, "request storm doc references dashboard bulk endpoint", requestStormDoc, "DASHBOARD-BULK-ENDPOINT-01");
  addContains(cases, "production policy doc references dashboard bulk endpoint", policyDoc, "DASHBOARD-BULK-ENDPOINT-01");

  addContains(cases, "route file exposes auth guarded bulk route", route, 'r.get("/bulk", authRequired()');
  addContains(cases, "route file exposes dashboard bulk bundle builder", route, "buildDashboardBulkBundle");
  addContains(cases, "route file exposes dashboard bulk bundle names", route, "getDashboardBulkBundleNames");
  addContains(cases, "route file uses dashboard bulk failure code", route, "DASHBOARD_BULK_FAILED");
  addNotContains(cases, "route file stays read-only", route, "r.post(");
  addNotContains(cases, "route file stays read-only 2", route, "r.put(");
  addNotContains(cases, "route file stays read-only 3", route, "r.patch(");
  addNotContains(cases, "route file stays read-only 4", route, "r.delete(");

  addContains(cases, "service file imports rememberResponse", service, "rememberResponse");
  addContains(cases, "service file defines buildDashboardBulkBundle", service, "export async function buildDashboardBulkBundle");
  addContains(cases, "service file defines getDashboardBulkBundleNames", service, "export function getDashboardBulkBundleNames");
  addContains(cases, "service file defines BUNDLE_LOADERS", service, "const BUNDLE_LOADERS = {");
  addContains(cases, "service file defines BUNDLE_ROLES", service, "const BUNDLE_ROLES = {");
  addContains(cases, "service file includes company operations bundle", service, '"company-operations": buildCompanyOperationsBundle');
  addContains(cases, "service file includes school operations bundle", service, '"school-operations": buildSchoolOperationsBundle');
  addContains(cases, "service file includes room operation health bundle", service, '"room-operation-health": buildRoomOperationHealthBundle');
  addContains(cases, "service file includes room commercial flow bundle", service, '"room-commercial-flow": buildRoomCommercialFlowBundle');
  addContains(cases, "service file includes superadmin overview bundle", service, '"superadmin-overview": buildSuperAdminOverviewBundle');
  addContains(cases, "service file keeps read-only cache key", service, "dashboard-bulk:");
  addContains(cases, "service file keeps scope enforcement", service, "assertBundleAccess");

  addContains(cases, "server wires dashboard bulk router", server, "dashboardBulkRouter");
  addContains(cases, "route mounts dashboard bulk router under api dashboard", routeMounts, 'app.use("/api/dashboard", dashboardBulkRouter())');

  addContains(cases, "ui helper exposes bulk loader", uiHelper, "loadDashboardBulkBundle");
  addContains(cases, "ui helper hits dashboard bulk endpoint", uiHelper, "/api/dashboard/bulk");
  addContains(cases, "ui helper exposes company operations bundle", uiHelper, "loadCompanyOperationsBundle");
  addContains(cases, "ui helper exposes school operations bundle", uiHelper, "loadSchoolOperationsBundle");
  addContains(cases, "ui helper exposes room operation health bundle", uiHelper, "loadRoomOperationHealthBundle");
  addContains(cases, "ui helper exposes room commercial flow bundle", uiHelper, "loadRoomCommercialFlowBundle");
  addContains(cases, "ui helper exposes superadmin overview bundle", uiHelper, "loadSuperAdminOverviewBundle");

  addContains(cases, "company operations panel uses bulk helper", companyPanel, "loadCompanyOperationsBundle");
  addContains(cases, "company operations panel uses bulk-first load", companyPanel, "const bulk = await loadCompanyOperationsBundle");
  addContains(cases, "school operations panel uses bulk helper", schoolPanel, "loadSchoolOperationsBundle");
  addContains(cases, "school operations panel uses bulk-first load", schoolPanel, "const bulk = await loadSchoolOperationsBundle");
  addContains(cases, "room operation health panel uses bulk helper", roomHealthPanel, "loadRoomOperationHealthBundle");
  addContains(cases, "room operation health panel uses bulk-first load", roomHealthPanel, "const bulk = await loadRoomOperationHealthBundle");
  addContains(cases, "room commercial flow panel uses bulk helper", roomCommercialPanel, "loadRoomCommercialFlowBundle");
  addContains(cases, "room commercial flow panel uses bulk-first load", roomCommercialPanel, "const bulk = await loadRoomCommercialFlowBundle");
  addContains(cases, "superadmin panel uses bulk helper", superadminPanel, "loadSuperAdminOverviewBundle");
  addContains(cases, "superadmin panel uses bulk-first load", superadminPanel, "const bulk = await loadSuperAdminOverviewBundle");

  addCase(cases, "dashboard bulk route file exists", () => must(fs.existsSync(path.join(root, paths.route)), "dashboard bulk route file exists"));
  addCase(cases, "dashboard bulk service file exists", () => must(fs.existsSync(path.join(root, paths.service)), "dashboard bulk service file exists"));
  addCase(cases, "dashboard bulk helper file exists", () => must(fs.existsSync(path.join(root, paths.uiHelper)), "dashboard bulk helper file exists"));

  addCase(cases, "prisma diff is empty", () => {
    const prismaDiff = gitLines(["diff", "--name-only", "--", "prisma", "backend/prisma"]);
    must(prismaDiff.length === 0, "prisma diff is empty");
  });

  addCase(cases, "debug.log remains absent", () => {
    must(!fs.existsSync(path.join(root, paths.debugLog)), "debug.log absent");
  });

  let passCount = 0;
  for (const testCase of cases) {
    testCase.fn();
    passCount += 1;
  }

  console.log(`PASS DASHBOARD-BULK-ENDPOINT-01 ${passCount}/${cases.length}`);
}

main();
