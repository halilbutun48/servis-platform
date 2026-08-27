#!/usr/bin/env node

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS,
} from "./lib/currentHeadScopePolicy.js";
import { mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";
import { assertProductExtensionsOrder } from "./lib/productExtensionsRegistry.js";

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

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
}

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
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
  const out = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
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
  if (unexpected.length > 0 || missing.length > 0) {
    fail(`${label}: unexpected=${unexpected.join(", ") || "(none)"} missing=${missing.join(", ") || "(none)"}`);
  }
  ok(label);
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  if (actual !== wanted) {
    fail(`${label}: ${actual} != ${wanted}`);
  }
  ok(label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(typeof repoRoot !== "undefined" ? repoRoot : root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      throw new Error(`FAIL ${relPath}: bare CR`);
    }
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const actual = normalizedTextSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  if (actual !== wanted) {
    fail(`${label}: ${actual} != ${wanted}`);
  }
  ok(label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(`${label}: not an ordinary directory`);
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") {
    fail(`${label}: unexpected contents=${entries.join(", ")}`);
  }
  ok(label);
}

const ACCEPTED_SCHEMA_PATH = "backend/prisma/schema.prisma";
const ACCEPTED_SCHEMA_SHA256 = "D67FB93C705C1597598D67ECD46806A676703E2153BCE6EF76E0AA10E5E37784";
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
const ACCEPTED_PRISMA_PATHS = ACCEPTED_PRISMA_FILES.map((entry) => entry.path);
const ACCEPTED_PRISMA_PATH_SET = new Set(ACCEPTED_PRISMA_PATHS.map(normalizePath));

function mustAcceptedPrismaManifest() {
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

function main() {
  console.log("=== UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02 CHECK ===");

  const pkg = read("package.json");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md");
  const css = read("web/src/index.css");
  const miniMap = read("web/src/components/map/ReadableMiniRouteMap.jsx");
  const orgPlansShared = read("web/src/panels/organization/organizationPlansShared.jsx");
  const plansPanel = read("web/src/panels/organization/PlansPanel.jsx");
  const boardingImpact = read("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx");
  const companyFilters = read("web/src/panels/company/companyShiftsPanelFilters.jsx");
  const companySections = read("web/src/panels/company/companyShiftsPanelSections.jsx");
  const companyAgreements = read("web/src/panels/company/AgreementsPanel.jsx");
  const roomSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");

  mustTrue(exists("backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js"), "mobile overflow mini-map polish check exists");
  mustTrue(exists("docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md"), "mobile overflow mini-map polish doc exists");

  must(pkg, '"check:uxmobileoverflowminimappolish02": "node backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js"', "package.json exposes mobile overflow mini-map polish check");
  assertProductExtensionsOrder(
    ["check:uxmobileoverflowminimapreadability01", "check:uxmobileoverflowminimappolish02", "check:uxdensity01"],
    "product extensions registry keeps mobile overflow mini-map polish after readability"
  );
  assertProductExtensionsOrder(
    ["check:uxmobileoverflowminimapreadability01", "check:uxmobileoverflowminimappolish02", "check:uxdensity01"],
    "verify chain registry keeps mobile overflow mini-map polish after readability"
  );

  must(harnessCheck, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02", "script harness check knows mobile overflow mini-map polish milestone");
  must(harnessCheck, "check:uxmobileoverflowminimappolish02", "script harness check knows mobile overflow mini-map polish alias");
  must(harnessCheck, "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md", "script harness check knows mobile overflow mini-map polish doc");
  must(harnessDoc, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02", "script harness doc lists mobile overflow mini-map polish milestone");
  must(harnessDoc, "check:uxmobileoverflowminimappolish02", "script harness doc lists mobile overflow mini-map polish alias");
  must(harnessDoc, "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md", "script harness doc lists mobile overflow mini-map polish doc");

  must(guide, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02", "milestone guide mentions mobile overflow mini-map polish milestone");
  must(guide, "check:uxmobileoverflowminimappolish02", "milestone guide exposes mobile overflow mini-map polish check");
  must(guide, "node backend\\scripts\\ux_mobile_overflow_minimap_polish_02_check.js", "milestone guide includes mobile overflow mini-map polish command");
  must(guide, "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md", "milestone guide includes mobile overflow mini-map polish doc");

  must(doc, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02", "mobile overflow mini-map polish doc title present");
  must(doc, "Room / Vardiyalar", "mobile overflow mini-map polish doc covers room surface");
  must(doc, "Company / Vardiyalar", "mobile overflow mini-map polish doc covers company surface");
  must(doc, "Organization / Planlama", "mobile overflow mini-map polish doc covers organization surface");
  must(doc, "ReadableMiniRouteMap", "mobile overflow mini-map polish doc references shared map component");
  must(doc, "MapContainer", "mobile overflow mini-map polish doc references Leaflet map container");
  must(doc, "TileLayer", "mobile overflow mini-map polish doc references real tile layer");
  must(doc, "fitBounds", "mobile overflow mini-map polish doc references viewport fit");
  must(doc, "tileerror", "mobile overflow mini-map polish doc references tile failure fallback");
  must(doc, "tableWrap", "mobile overflow mini-map polish doc mentions tableWrap");
  must(doc, "organizationPlansLayout", "mobile overflow mini-map polish doc mentions organization plans layout");
  must(doc, "organizationPlansSidebar", "mobile overflow mini-map polish doc mentions organization plans sidebar");
  must(doc, "map-preview-pill", "mobile overflow mini-map polish doc mentions map preview pills");
  must(doc, "Haritayı büyüt", "mobile overflow mini-map polish doc keeps map expand wording");
  must(doc, "Haritayı kapat", "mobile overflow mini-map polish doc keeps map close wording");
  must(doc, "OpenStreetMap contributors", "mobile overflow mini-map polish doc keeps tile attribution wording");
  must(doc, "390x844", "mobile overflow mini-map polish doc keeps mobile audit viewport");
  must(doc, "UX-FIX 0", "mobile overflow mini-map polish doc keeps UX-FIX target");
  must(doc, "BLOCKER 0", "mobile overflow mini-map polish doc keeps blocker target");
  must(doc, "NOT-FOUND 0", "mobile overflow mini-map polish doc keeps not-found target");
  must(doc, "Backend route/write-path değişmedi.", "mobile overflow mini-map polish doc keeps backend boundary");
  must(doc, "Schema/migration yok.", "mobile overflow mini-map polish doc keeps schema boundary");
  must(doc, "runtime-data", "mobile overflow mini-map polish doc keeps runtime-data boundary");
  must(doc, "browser-smoke", "mobile overflow mini-map polish doc keeps browser-smoke boundary");
  must(doc, "Sefer Abi", "mobile overflow mini-map polish doc keeps Sefer Abi reference");

  must(css, ".tableWrap {", "global css defines tableWrap");
  must(css, "overflow-x: clip", "global css clips desktop table overflow");
  must(css, "table-layout: fixed", "global css fixes table layout for wrapping");
  must(css, "overflow-wrap: anywhere", "global css allows long cell wrapping");
  must(css, ".organizationPlansLayout {", "global css defines organization plans layout");
  must(css, ".organizationPlansSidebar {", "global css defines organization plans sidebar");
  must(css, "overflow-x: auto", "global css restores mobile table scrolling");

  must(miniMap, "expandable && showOpenMapButton", "shared mini map only overlays when expandable");
  must(miniMap, "onClick={openModal}", "shared mini map overlay opens modal");
  must(miniMap, "routePreviewShiftId", "shared mini map fetches route preview by shift");
  must(miniMap, "routeModeLabel", "shared mini map accepts route mode label");
  must(miniMap, "allowWheelZoomInModal", "shared mini map supports modal wheel zoom toggle");
  must(miniMap, "Haritayı büyüt", "shared mini map keeps expand wording");
  must(miniMap, "Haritayı kapat", "shared mini map keeps close wording");
  must(miniMap, "fitBounds", "shared mini map fits viewport");
  must(miniMap, "tileerror", "shared mini map exposes tile fallback");
  must(miniMap, "map-preview-pill", "shared mini map renders legend pills");

  must(orgPlansShared, "routePreviewShiftId", "organization mini map passes route preview shift");
  must(orgPlansShared, "expandedTitle", "organization mini map sets expanded title");
  must(orgPlansShared, "showOpenMapButton", "organization mini map shows open button");
  must(plansPanel, "publishedShiftId", "organization plans panel passes shift id");

  must(boardingImpact, "mapExpanded", "boarding preview tracks expanded map state");
  must(boardingImpact, "routePreviewShiftId", "boarding preview passes route preview shift");
  must(boardingImpact, "routeModeLabel", "boarding preview passes route mode label");
  must(boardingImpact, "decisionOwnerNoteText", "boarding preview renders decision owner note text");
  must(boardingImpact, "Haritada göster", "boarding preview keeps map toggle wording");

  must(companyFilters, 'width: "min(100%, 220px)"', "company filters use responsive market width");
  must(companyFilters, 'width: "min(100%, 240px)"', "company filters use responsive pending/status width");
  must(companySections, 'width: "min(100%, 240px)"', "company sections use responsive extend width");
  must(companySections, 'flex: "1 1 260px", minWidth: 0', "company sections use responsive note width");
  must(companySections, 'width: "min(100%, 220px)"', "company sections use responsive room search width");
  must(companySections, 'width: "min(100%, 180px)"', "company sections use responsive amount width");
  must(companySections, 'flex: "1 1 240px", minWidth: 0', "company sections use responsive note width 2");
  mustNot(companyAgreements, "minWidth: 980", "company agreements removes hardcoded wide table width");
  must(roomSections, 'width: "min(100%, 280px)"', "room shifts uses responsive pending search width");
  must(roomSections, 'width: "min(100%, 320px)"', "room shifts uses responsive list search width");
  mustNot(roomSections, "minWidth: 280", "room shifts removes hardcoded pending search width");
  mustNot(roomSections, "minWidth: 320", "room shifts removes hardcoded list search width");

  mustNot(companyFilters, "minWidth: 220", "company filters remove fixed market width");
  mustNot(companyFilters, "minWidth: 240", "company filters remove fixed pending/status width");
  mustNot(companySections, "minWidth: 240", "company sections remove fixed extend width");
  mustNot(companySections, "minWidth: 260", "company sections remove fixed note width");
  mustNot(companySections, "minWidth: 220", "company sections remove fixed room search width");
  mustNot(companySections, "minWidth: 180", "company sections remove fixed amount width");
  mustNot(companySections, "minWidth: 240", "company sections remove second fixed note width");
  mustNot(companyAgreements, "minWidth: 980", "company agreements removes fixed table width");

  const staged = gitLines(["diff", "--cached", "--name-only"]);
  mustTrue(staged.length === 0, "stage remains empty");
  mustAcceptedPrismaManifest();
  const approvedConcurrentBackendPaths = new Set(CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS);
  mustNoDiffExceptWithIdentity(
    ["backend/src/routes", "backend/src/services"],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
    "approved NEW-01 backend diff is identity-locked"
  );

  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "prisma", "backend/prisma"]).filter(
    (line) =>
      line !== "backend/src/routes/companyOverview.js" &&
      !approvedConcurrentBackendPaths.has(normalizePath(line)) &&
      !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(line))
  );
  mustTrue(routeDiff.length === 0, "backend route/service/schema diff stays empty");

  console.log("=== UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
