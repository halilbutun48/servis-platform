#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { mustNormalizedTextSha256 } from "./lib/guardTextIntegrity.js";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const paths = {
  packageJson: "package.json",
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

function gitCapture(args) {
  return execFileSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
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
  const out = gitCapture(args);
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizePath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((text) => normalizePath(text)))].sort(compareText);
}

function gitStatusEntries(paths) {
  return String(
    gitCapture(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]) || ""
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

function mustExactGitPaths(paths, expectedPaths, label) {
  const actual = sortedUniquePaths(gitStatusEntries(paths).map((entry) => entry.path));
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actual.includes(file));
  must(
    unexpected.length === 0 && missing.length === 0,
    `${label}: unexpected=${unexpected.join(", ") || "(none)"} missing=${missing.join(", ") || "(none)"}`
  );
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  must(fileSha256(relPath) === String(expectedHash || "").toUpperCase(), label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  must(stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  must(entries.length === 1 && entries[0] === "migration.sql", `${label} has exactly one migration.sql`);
}

const ACCEPTED_SCHEMA_PATH = "backend/prisma/schema.prisma";
const ACCEPTED_SCHEMA_SHA256 = "7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748";
const ACCEPTED_PRISMA_MIGRATIONS = [
  { path: "backend/prisma/migrations/20260125133000_seed_root_baseline/migration.sql", sha256: "27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD" },
  { path: "backend/prisma/migrations/20260125133100_organization_shift_import_baseline/migration.sql", sha256: "864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD" },
  { path: "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/migration.sql", sha256: "E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5" },
  { path: "backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/migration.sql", sha256: "6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB" },
  { path: "backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/migration.sql", sha256: "CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F" },
  { path: "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/migration.sql", sha256: "B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90" },
  { path: "backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/migration.sql", sha256: "734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005" },
  { path: "backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/migration.sql", sha256: "85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17" },
  { path: "backend/prisma/migrations/20260731120000_financial_operations_persistence_01/migration.sql", sha256: "3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0" },
  { path: "backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/migration.sql", sha256: "24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198" },
  { path: "backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/migration.sql", sha256: "A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202" },
  { path: "backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/migration.sql", sha256: "0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A" },
  { path: "backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/migration.sql", sha256: "D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF" },
  { path: "backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/migration.sql", sha256: "8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A" },
  { path: "backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/migration.sql", sha256: "F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A" },
  { path: "backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/migration.sql", sha256: "025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0" },
  { path: "backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/migration.sql", sha256: "D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E" },
  { path: "backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/migration.sql", sha256: "C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54" },
  { path: "backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/migration.sql", sha256: "FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D" },
  { path: "backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/migration.sql", sha256: "E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90" },
  { path: "backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/migration.sql", sha256: "7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007" },
  { path: "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/migration.sql", sha256: "285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27" },
  { path: "backend/prisma/migrations/20260801211000_room_company_cleanup_01/migration.sql", sha256: "E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5" },
  { path: "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/migration.sql", sha256: "3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36" },
  { path: "backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/migration.sql", sha256: "59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA" },
  { path: "backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/migration.sql", sha256: "F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528" },
  { path: "backend/prisma/migrations/20260801215000_consent_surface_bridge_01/migration.sql", sha256: "423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581" },
  { path: "backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/migration.sql", sha256: "252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79" },
  { path: "backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/migration.sql", sha256: "168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F" },
  { path: "backend/prisma/migrations/20260801217000_personel_credential_bridge_01/migration.sql", sha256: "BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC" },
  { path: "backend/prisma/migrations/20260801218000_operational_fk_bridge_01/migration.sql", sha256: "2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924" },
  { path: "backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/migration.sql", sha256: "939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5" },
];
const ACCEPTED_PRISMA_FILES = [
  { path: ACCEPTED_SCHEMA_PATH, sha256: ACCEPTED_SCHEMA_SHA256 },
  ...ACCEPTED_PRISMA_MIGRATIONS,
];
const ACCEPTED_PRISMA_PATH_SET = new Set(ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path)));

function mustAcceptedPrismaManifest() {
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

function main() {
  console.log("=== DASHBOARD-BULK-ENDPOINT-01 CHECK ===");

  const pkg = read(paths.packageJson);
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
  const cachedNames = gitLines(["diff", "--cached", "--name-only"]);

  must(cachedNames.length === 0, "stage stays empty");
  mustAcceptedPrismaManifest();

  const cases = [];

  addContains(cases, "package.json exposes dashboard bulk endpoint alias", pkg, '"check:dashboardbulkendpoint01": "node backend/scripts/dashboard_bulk_endpoint_01_check.js"');
  addCase(cases, "product extensions registry includes dashboard bulk endpoint check", () => {
    assertProductExtensionsIncludes("check:dashboardbulkendpoint01", "product extensions registry includes dashboard bulk endpoint check");
  });
  addCase(cases, "verify chain registry includes dashboard bulk endpoint check", () => {
    assertProductExtensionsIncludes("check:dashboardbulkendpoint01", "verify chain registry includes dashboard bulk endpoint check");
  });

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
    const prismaDiff = sortedUniquePaths(gitLines(["diff", "--name-only", "--", "prisma", "backend/prisma"]));
    const residualPrismaDiff = prismaDiff.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file)));
    must(residualPrismaDiff.length === 0, "prisma diff is empty");
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
