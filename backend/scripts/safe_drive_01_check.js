#!/usr/bin/env node

import { CANONICAL_PRISMA_SCHEMA_PATH as ACCEPTED_SCHEMA_PATH, CANONICAL_PRISMA_SCHEMA_RAW_SHA256 as ACCEPTED_SCHEMA_SHA256 } from "./lib/prismaSchemaIdentity.js";

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mustDiffEmptyOrExactlyWithIdentity, mustStatusEmptyOrExactlyWithIdentity } from "./lib/guardGitScope.js";
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
const safeDirectory = root.replace(/\\/g, "/");
const approvedSafeDriveRouteEntries = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) =>
  entryPath.startsWith("backend/src/routes/"),
);
const approvedSafeDriveServiceEntries = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) =>
  entryPath.startsWith("backend/src/services/"),
);

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
  const out = execFileSync("git", ["-c", `safe.directory=${safeDirectory}`, "diff", "--name-only", "--", ...paths], {
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
  return gitStatusEntries(["."])
    .filter((entry) => entry.code && entry.code[0] !== " " && entry.code !== "??")
    .map((entry) => entry.path);
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

function normalizePath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((pathText) => normalizePath(pathText)))].sort(compareText);
}

function gitStatusEntries(paths) {
  const out = execFileSync("git", ["-c", `safe.directory=${safeDirectory}`, "status", "--porcelain=v1", "--untracked-files=all", "--", ...paths], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { code, path: normalizePath(pathText), raw: line };
    });
}

function mustExactGitPaths(paths, expectedPaths, label) {
  const actual = sortedUniquePaths(gitStatusEntries(paths).map((entry) => entry.path));
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((pathText) => !expected.includes(pathText));
  const missing = expected.filter((pathText) => !actual.includes(pathText));
  if (unexpected.length > 0 || missing.length > 0) {
    fail(
      `${label}: ${[
        unexpected.length > 0 ? `unexpected=${unexpected.join(", ")}` : "",
        missing.length > 0 ? `missing=${missing.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("; ")}`
    );
  }
  ok(label);
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  if (actual !== String(expectedHash || "").toUpperCase()) {
    fail(`${label}: ${actual} != ${String(expectedHash || "").toUpperCase()}`);
  }
  ok(label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      fail(`${relPath}: unexpected bare CR`);
    }
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(`${relPath}: invalid UTF-8`);
  }
  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const actual = normalizedTextSha256(relPath);
  if (actual !== String(expectedHash || "").toUpperCase()) {
    fail(`${label}: ${actual} != ${String(expectedHash || "").toUpperCase()}`);
  }
  ok(label);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
  ok(label);
}

function assertIncludes(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) {
    fail(`${label}: missing ${needle}`);
  }
  ok(label);
}

function assertNotIncludes(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) {
    fail(`${label}: unexpected ${needle}`);
  }
  ok(label);
}

function windowText(text, startNeedle, endNeedle, label) {
  const haystack = normalize(text);
  const startNeedleNorm = normalize(startNeedle);
  const endNeedleNorm = normalize(endNeedle);
  const start = haystack.indexOf(startNeedleNorm);
  if (start < 0) fail(`${label}: missing ${startNeedle}`);
  const end = haystack.indexOf(endNeedleNorm, start + startNeedleNorm.length);
  if (end < 0) fail(`${label}: missing ${endNeedle}`);
  return haystack.slice(start, end);
}

function mergeDeep(base, patch) {
  if (patch == null || typeof patch !== "object" || Array.isArray(patch)) {
    return patch;
  }
  const baseObject = base && typeof base === "object" && !Array.isArray(base) ? base : {};
  const out = Array.isArray(base) ? [...base] : { ...baseObject };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = mergeDeep(baseObject[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function loadSafeDriveSummaryContract() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "safe-drive-summary-"));
  const safeDriveSource = read("web/src/utils/safeDriveSummary.js").replace(
    'from "./etaSanity";',
    'from "./etaSanity.mjs";',
  ).replace(
    'from "./gpsSource";',
    'from "./gpsSource.mjs";',
  );
  fs.writeFileSync(path.join(tempDir, "safeDriveSummary.mjs"), safeDriveSource, "utf8");
  fs.writeFileSync(path.join(tempDir, "etaSanity.mjs"), read("web/src/utils/etaSanity.js"), "utf8");
  fs.writeFileSync(path.join(tempDir, "gpsSource.mjs"), read("web/src/utils/gpsSource.js"), "utf8");
  return import(pathToFileURL(path.join(tempDir, "safeDriveSummary.mjs")).href);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(`${label}: not an ordinary directory`);
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") {
    fail(`${label}: unexpected contents=${entries.join(", ")}`);
  }
  ok(label);
}

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

async function main() {
  console.log("=== SAFE-DRIVE-01 CHECK ===");

  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
  const doc = read("docs/SAFE_DRIVE_01.md");
  const helper = read("web/src/utils/safeDriveSummary.js");
  const card = read("web/src/panels/shared/SafeDriveSummaryCard.jsx");
  const commercialCore = read("backend/src/routes/commercialCore.js");
  const commercialCoreRoomRoutes = read("backend/src/routes/commercialCoreRoomRoutes.js");
  const operationProof = read("backend/src/routes/operationProof.js");
  const trustQuality = read("backend/src/routes/trustQuality.js");
  const driverRoute = read("web/src/panels/driver/RoutePanel.jsx");
  const driverMap = read("web/src/panels/driver/MapPanel.jsx");
  const companyMap = read("web/src/panels/company/MapPanel.jsx");
  const roomMap = read("web/src/panels/room/MapPanel.jsx");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const cachedNames = gitCachedNames();
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:safedrive01": "node backend/scripts/safe_drive_01_check.js"', "package.json exposes safe drive check");
  assertProductExtensionsIncludes("check:safedrive01", "product extensions registry includes safe drive check", registryScripts);
  assertProductExtensionsOrder(["check:telematicsproviderhub01", "check:safedrive01", "check:pay01e"], "product extensions registry places safe drive after telematics provider hub", registryScripts);

  must(guide, "SAFE-DRIVE-01", "milestone guide mentions safe drive milestone");
  must(guide, "check:safedrive01", "milestone guide exposes safe drive check");
  must(guide, "node backend\\scripts\\safe_drive_01_check.js", "milestone guide includes safe drive command");
  must(guide, "docs/SAFE_DRIVE_01.md", "milestone guide includes safe drive doc");
  must(guide, "Güvenli sürüş özeti", "milestone guide keeps safe drive copy");
  must(guide, "Risk sinyali", "milestone guide keeps risk signal wording");
  must(guide, "İnsan onayı gerekir", "milestone guide keeps approval wording");
  ordered(guide, ["M44-TELEMATICS-T1-T5", "TELEMATICS-PROVIDER-HUB-01", "SAFE-DRIVE-01"], "milestone guide keeps telematics provider hub before safe drive");

  must(primer, "SAFE-DRIVE-01", "primer mentions safe drive milestone");
  must(primer, "docs/SAFE_DRIVE_01.md", "primer links safe drive doc");
  must(primer, "readonly safe-drive risk summary", "primer keeps safe drive wording");
  must(primer, "Güvenli sürüş özeti", "primer keeps safe drive copy");

  must(roadmap, "SAFE-DRIVE-01", "roadmap keeps safe drive milestone");
  must(roadmap, "readonly safe-drive risk summary", "roadmap keeps safe drive summary wording");
  must(roadmap, "İnsan onayı gerekir", "roadmap keeps human approval wording");

  must(doc, "# SAFE-DRIVE-01", "safe drive doc title present");
  must(doc, "Güvenli sürüş özeti", "safe drive doc keeps summary wording");
  must(doc, "Risk sinyali", "safe drive doc keeps risk wording");
  must(doc, "Kontrol edilmeli", "safe drive doc keeps control wording");
  must(doc, "GPS güvenilirliği", "safe drive doc keeps GPS wording");
  must(doc, "Hız riski", "safe drive doc keeps speed wording");
  must(doc, "Rota ilerleme sinyali", "safe drive doc keeps route wording");
  must(doc, "Kanıt / check-in durumu", "safe drive doc keeps proof wording");
  must(doc, "Operasyon kontrol önerisi", "safe drive doc keeps control recommendation wording");
  must(doc, "İnsan onayı gerekir", "safe drive doc keeps human approval wording");
  must(doc, "M44-TELEMATICS-T1-T5", "safe drive doc keeps M44 anchor");
  must(doc, "TELEMATICS-PROVIDER-HUB-01", "safe drive doc keeps provider hub anchor");
  must(doc, "Rota uygulanmaz", "safe drive doc keeps readonly boundary");
  must(doc, "sürücü/araç ataması değiştirilmez", "safe drive doc keeps assignment boundary");
  must(doc, "ödeme/hakediş başlatılmaz", "safe drive doc keeps payment boundary");
  must(doc, "sözleşme bağlanmaz", "safe drive doc keeps contract boundary");
  must(doc, "otomatik yönlendirme verilmez", "safe drive doc keeps automation boundary");

  must(helper, "Güvenli sürüş özeti", "safe drive helper keeps summary wording");
  must(helper, "Risk sinyali", "safe drive helper keeps risk wording");
  must(helper, "Kontrol edilmeli", "safe drive helper keeps control wording");
  must(helper, "GPS güvenilirliği", "safe drive helper keeps GPS wording");
  must(helper, "Hız riski", "safe drive helper keeps speed wording");
  must(helper, "Rota ilerleme sinyali", "safe drive helper keeps route wording");
  must(helper, "Kanıt / check-in durumu", "safe drive helper keeps proof wording");
  must(helper, "Operasyon kontrol önerisi", "safe drive helper keeps control recommendation wording");
  must(helper, "Kullanıcı onayı gerekir", "safe drive helper keeps human approval wording");
  must(helper, "normalizeGpsFreshness", "safe drive helper reuses GPS freshness helper");
  must(helper, "getGpsReliabilityLabel", "safe drive helper reuses GPS reliability helper");
  must(helper, "getGpsAgeText", "safe drive helper reuses GPS age helper");

  must(card, "SafeDriveSummaryCard", "safe drive card file exports card");
  must(card, "Güvenli sürüş özeti", "safe drive card keeps summary wording");
  must(card, "Risk sinyali", "safe drive card keeps risk wording");
  must(card, "Kontrol edilmeli", "safe drive card keeps control wording");
  must(card, "Kullanıcı onayı gerekir", "safe drive card keeps human approval wording");
  must(card, "Kanıt / check-in durumu", "safe drive card keeps proof wording");

  must(driverRoute, "SafeDriveSummaryCard", "driver route panel wires safe drive card");
  must(driverRoute, "summaryParams", "driver route panel passes safe drive summary params");
  must(driverMap, "SafeDriveSummaryCard", "driver map panel wires safe drive card");
  must(driverMap, "summaryParams", "driver map panel passes safe drive summary params");
  must(companyMap, "SafeDriveSummaryCard", "company map panel wires safe drive card");
  must(companyMap, "summaryParams", "company map panel passes safe drive summary params");
  must(roomMap, "SafeDriveSummaryCard", "room map panel wires safe drive card");
  must(roomMap, "summaryParams", "room map panel passes safe drive summary params");

  must(harnessCheck, "check:safedrive01", "script harness check knows safe drive alias");
  must(harnessCheck, "safe_drive_01_check.js", "script harness check knows safe drive file");
  must(harnessCheck, "SAFE-DRIVE-01", "script harness check knows safe drive milestone");
  must(harnessCheck, "docs/SAFE_DRIVE_01.md", "script harness check knows safe drive doc");
  must(harnessCheck, "web/src/utils/safeDriveSummary.js", "script harness check knows safe drive helper");
  must(harnessCheck, "web/src/panels/shared/SafeDriveSummaryCard.jsx", "script harness check knows safe drive card");

  must(harnessDoc, "root:check:safedrive01", "script harness doc lists safe drive root check");
  must(harnessDoc, "safe_drive_01_check.js", "script harness doc lists safe drive check");
  must(harnessDoc, "docs/SAFE_DRIVE_01.md", "script harness doc lists safe drive doc");
  must(harnessDoc, "SAFE-DRIVE-01", "script harness doc lists safe drive milestone");
  must(harnessDoc, "web/src/utils/safeDriveSummary.js", "script harness doc lists safe drive helper");
  must(harnessDoc, "web/src/panels/shared/SafeDriveSummaryCard.jsx", "script harness doc lists safe drive card");

  const commercialCorePreviewBlock = windowText(
    commercialCoreRoomRoutes,
    "const [ room, roomSummary, latestShift, latestAgreement, ] = await Promise.all([",
    "prisma.shift.findFirst({",
    "commercialCore preview block",
  );
  assertIncludes(commercialCorePreviewBlock, "prisma.room.findunique", "commercialCore preview keeps room lookup");
  assertIncludes(commercialCorePreviewBlock, "select: { id: true, name: true, }", "commercialCore preview drops invalid room kind projection");
  assertNotIncludes(commercialCorePreviewBlock, "kind: true", "commercialCore preview window does not reintroduce room kind projection");

  assertIncludes(operationProof, "const gpsState = shift?.vehicle?.gpsState || null;", "operationProof keeps gpsState alias");
  assertIncludes(operationProof, 'const sourceKey = normalizeUpper(gpsState?.lastSource) || "BACKEND_VEHICLE_GPS";', "operationProof keeps lastSource fallback");
  assertIncludes(operationProof, "gpsSeen: Boolean(gpsLastAt || gpsState?.lastSource)", "operationProof keeps gpsSeen fallback");
  assertIncludes(operationProof, "lastSource: true", "operationProof preserves lastSource Prisma selection");

  assertIncludes(trustQuality, "const gpsState = shift?.vehicle?.gpsState || null;", "trustQuality keeps gpsState alias");
  assertIncludes(trustQuality, 'const sourceKey = normalizeUpper(gpsState?.lastSource) || "BACKEND_VEHICLE_GPS";', "trustQuality keeps lastSource fallback");
  assertIncludes(trustQuality, "gpsSeen: Boolean(gpsLastAt || gpsState?.lastSource)", "trustQuality keeps gpsSeen fallback");
  assertIncludes(trustQuality, "lastSource: true", "trustQuality preserves lastSource Prisma selection");
  assertIncludes(trustQuality, "wrapAsyncRouterMethods(r);", "trustQuality keeps async router wrapping");

  mustStatusEmptyOrExactlyWithIdentity(
    ["backend/src/routes"],
    approvedSafeDriveRouteEntries,
    "backend route ownership matches approved Safe Drive current head policy",
  );
  mustStatusEmptyOrExactlyWithIdentity(
    ["backend/src/services"],
    approvedSafeDriveServiceEntries,
    "backend service ownership matches approved Safe Drive current head policy",
  );
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend prisma diff empty");
  mustFileSha256("backend/src/routes/commercialCore.js", "14D111ADCF9C3005DACF0D7CE246EEA22109B1D2C4EDC4DA9380F2DA0461265F", "approved commercialCore.js SHA matches");
  mustFileSha256("backend/src/routes/commercialCoreRoomRoutes.js", "CA2B42085F02A2DFEB03ED3992FE47583152EE424FF39DDF73C9699B99D6D2FF", "approved commercialCoreRoomRoutes.js SHA matches");
  mustFileSha256("backend/src/routes/operationProof.js", "E5F3539A3660E70AF31DAA93203C1F4018ED4FDDF469BB74CDC3D8B73DBCA6E0", "approved operationProof.js SHA matches");
  mustFileSha256("backend/src/routes/trustQuality.js", "FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD", "approved trustQuality.js SHA matches");
  mustFileSha256("backend/src/services/dashboardBulk.js", "E3BF830BD2DF41A158FB60ED766C9A0C25A789C85F722443A37CEA61618A1A0E", "approved dashboardBulk.js SHA matches");
  mustFileSha256("backend/src/services/qualityPaymentBridgeService.js", "935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83", "approved qualityPaymentBridgeService.js SHA matches");
  const { getSafeDriveSummary } = await loadSafeDriveSummaryContract();
  const freshAt = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const staleAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const healthyFixture = {
    gpsStatus: "LIVE",
    gpsLast: { at: freshAt },
    speedKmh: 40,
    speedLimitKmh: 60,
    routeProgressState: "active",
    nextStopName: "Durak 1",
    proofStatus: "READY",
    gpsSourceLabel: "Canli",
    selectedVehicle: {
      gpsState: {
        lastSource: "Canli",
        sourceLabel: "Canli",
      },
    },
  };
  const buildFixture = (patch = {}) => mergeDeep(healthyFixture, patch);
  const semanticCases = [
    {
      name: "healthy-ready",
      input: buildFixture(),
      check(summary) {
        assertEqual(summary.status, "READY", "healthy-ready summary status");
        assertEqual(summary.statusText, "Hazır", "healthy-ready status text");
        assertEqual(summary.summaryText, "Güvenli sürüş özeti: canlı sinyaller uyumlu görünüyor.", "healthy-ready summary text");
        assertEqual(summary.requiresHumanApproval, false, "healthy-ready human approval");
        assertEqual(summary.gps?.status, "READY", "healthy-ready gps status");
        assertEqual(summary.speed?.status, "READY", "healthy-ready speed status");
        assertEqual(summary.route?.status, "READY", "healthy-ready route status");
        assertEqual(summary.proof?.status, "READY", "healthy-ready proof status");
        assertEqual(summary.provider?.status, "READY", "healthy-ready provider status");
        assertEqual(summary.provider?.value, "Canlı", "healthy-ready provider value");
        assertEqual(summary.signals.length, 6, "healthy-ready signal count");
      },
    },
    {
      name: "healthy-boundary",
      input: buildFixture(),
      check(summary) {
        assertEqual(summary.status, "READY", "healthy-boundary summary status");
        assertEqual(summary.requiresHumanApproval, false, "healthy-boundary human approval");
        assertEqual(summary.nextBestAction, "Operasyon kontrol önerisi: canlı izlemeyi sürdür, uygulama yapma.", "healthy-boundary next best action");
        assertEqual(
          summary.boundaryNote,
          "Salt okunur sınır: sadece okur ve özetler; rota uygulanmaz, sürücü/araç ataması değiştirilmez, ödeme/hakediş başlatılmaz, otomatik yönlendirme verilmez.",
          "healthy-boundary readonly note",
        );
      },
    },
    {
      name: "stale-gps",
      input: buildFixture({
        gpsStatus: "STALE",
        gpsLast: { at: staleAt },
      }),
      check(summary) {
        assertEqual(summary.status, "REVIEW_NEEDED", "stale-gps summary status");
        assertEqual(summary.summaryText, "Kontrol edilmeli: GPS güncel değil.", "stale-gps summary text");
        assertEqual(summary.requiresHumanApproval, true, "stale-gps human approval");
        assertEqual(summary.gps?.status, "REVIEW_NEEDED", "stale-gps gps status");
        assertEqual(summary.provider?.status, "READY", "stale-gps provider status");
        assertEqual(summary.nextBestAction, "Onayınız gerekli: GPS güncel değil.", "stale-gps next best action");
      },
    },
    {
      name: "missing-gps",
      input: buildFixture({
        gpsStatus: null,
        gpsLast: null,
        speedKmh: null,
        speedLimitKmh: null,
        routeProgressState: null,
        nextStopName: null,
        proofStatus: "missing",
        gpsSourceLabel: null,
        selectedVehicle: {
          gpsState: {
            lastSource: null,
            sourceLabel: null,
          },
        },
      }),
      check(summary) {
        assertEqual(summary.status, "REVIEW_NEEDED", "missing-gps summary status");
        assertEqual(summary.summaryText, "Kontrol edilmeli: Kanıt kontrol edilmeli.", "missing-gps summary text");
        assertEqual(summary.requiresHumanApproval, true, "missing-gps human approval");
        assertEqual(summary.gps?.status, "INSUFFICIENT_DATA", "missing-gps gps status");
        assertEqual(summary.speed?.status, "INSUFFICIENT_DATA", "missing-gps speed status");
        assertEqual(summary.route?.status, "INSUFFICIENT_DATA", "missing-gps route status");
        assertEqual(summary.provider, null, "missing-gps provider fallback");
      },
    },
    {
      name: "proof-present",
      input: buildFixture({ proofStatus: "READY" }),
      check(summary) {
        assertEqual(summary.status, "READY", "proof-present summary status");
        assertEqual(summary.proof?.status, "READY", "proof-present proof status");
        assertEqual(summary.proof?.value, "Hazır", "proof-present proof value");
      },
    },
    {
      name: "proof-missing",
      input: buildFixture({ proofStatus: "missing" }),
      check(summary) {
        assertEqual(summary.status, "REVIEW_NEEDED", "proof-missing summary status");
        assertEqual(summary.proof?.status, "REVIEW_NEEDED", "proof-missing proof status");
        assertEqual(summary.proof?.value, "Kontrol edilmeli", "proof-missing proof value");
        assertEqual(summary.summaryText, "Kontrol edilmeli: Kanıt kontrol edilmeli.", "proof-missing summary text");
        assertEqual(summary.nextBestAction, "Onayınız gerekli: Kanıt kontrol edilmeli.", "proof-missing next best action");
      },
    },
    {
      name: "checkin-present",
      input: buildFixture({
        proofStatus: null,
        checkinStatus: "VERIFIED",
      }),
      check(summary) {
        assertEqual(summary.status, "READY", "checkin-present summary status");
        assertEqual(summary.proof?.status, "READY", "checkin-present proof status");
        assertEqual(summary.proof?.value, "Hazır", "checkin-present proof value");
      },
    },
    {
      name: "checkin-missing",
      input: buildFixture({
        proofStatus: null,
        checkinStatus: "missing",
      }),
      check(summary) {
        assertEqual(summary.status, "REVIEW_NEEDED", "checkin-missing summary status");
        assertEqual(summary.proof?.status, "REVIEW_NEEDED", "checkin-missing proof status");
        assertEqual(summary.proof?.value, "Kontrol edilmeli", "checkin-missing proof value");
        assertEqual(summary.summaryText, "Kontrol edilmeli: Kanıt kontrol edilmeli.", "checkin-missing summary text");
      },
    },
    {
      name: "last-source-present",
      input: buildFixture({
        gpsSourceLabel: null,
        selectedVehicle: {
          gpsState: {
            lastSource: "Canli",
            sourceLabel: null,
          },
        },
      }),
      check(summary) {
        assertEqual(summary.status, "READY", "last-source-present summary status");
        assertEqual(summary.provider?.status, "READY", "last-source-present provider status");
        assertEqual(summary.provider?.value, "Canlı", "last-source-present provider value");
      },
    },
    {
      name: "last-source-missing",
      input: buildFixture({
        gpsSourceLabel: null,
        selectedVehicle: {
          gpsState: {
            lastSource: null,
            sourceLabel: null,
          },
        },
      }),
      check(summary) {
        assertEqual(summary.status, "READY", "last-source-missing summary status");
        assertEqual(summary.provider, null, "last-source-missing provider fallback");
      },
    },
    {
      name: "multiple-risk-signals",
      input: buildFixture({
        gpsStatus: "OFFLINE",
        gpsLast: { at: staleAt },
        speedKmh: 80,
        speedLimitKmh: 60,
        routeProgressState: "off route",
        proofStatus: "missing",
        gpsSourceLabel: null,
        selectedVehicle: {
          gpsState: {
            lastSource: null,
            sourceLabel: null,
          },
        },
      }),
      check(summary) {
        assertEqual(summary.status, "RISKY", "multiple-risk-signals summary status");
        assertEqual(summary.summaryText, "Risk sinyali: GPS çevrim dışı. Kontrol edilmeli.", "multiple-risk-signals summary text");
        assertEqual(summary.requiresHumanApproval, true, "multiple-risk-signals human approval");
        assertEqual(summary.gps?.status, "RISKY", "multiple-risk-signals gps status");
        assertEqual(summary.speed?.status, "RISKY", "multiple-risk-signals speed status");
        assertEqual(summary.route?.status, "RISKY", "multiple-risk-signals route status");
        assertEqual(summary.proof?.status, "REVIEW_NEEDED", "multiple-risk-signals proof status");
        assertEqual(summary.riskReasons.length, 3, "multiple-risk-signals risk reason count");
        assertEqual(summary.signals.length, 5, "multiple-risk-signals signal count");
        assertEqual(summary.nextBestAction, "Onayınız gerekli: GPS çevrim dışı.", "multiple-risk-signals next best action");
      },
    },
    {
      name: "insufficient-data",
      input: buildFixture({
        gpsStatus: "UNKNOWN",
        gpsLast: null,
        speedKmh: null,
        speedLimitKmh: null,
        routeProgressState: "pending",
        nextStopName: null,
        proofStatus: "missing",
        gpsSourceLabel: null,
        selectedVehicle: {
          gpsState: {
            lastSource: null,
            sourceLabel: null,
          },
        },
      }),
      check(summary) {
        assertEqual(summary.status, "REVIEW_NEEDED", "insufficient-data summary status");
        assertEqual(summary.gps?.status, "INSUFFICIENT_DATA", "insufficient-data gps status");
        assertEqual(summary.speed?.status, "INSUFFICIENT_DATA", "insufficient-data speed status");
        assertEqual(summary.route?.status, "REVIEW_NEEDED", "insufficient-data route status");
        assertEqual(summary.provider, null, "insufficient-data provider fallback");
      },
    },
  ];

  let passCount = 0;
  for (const testCase of semanticCases) {
    const summary = getSafeDriveSummary(testCase.input);
    testCase.check(summary);
    passCount += 1;
    ok(`semantic case ${testCase.name}`);
  }
  console.log(`semanticCases=${semanticCases.length} passCount=${passCount} failCount=${semanticCases.length - passCount}`);

  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const migration of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(migration.path, migration.sha256, `accepted Prisma migration SHA matches ${migration.path}`);
    mustMigrationDirectoryShape(path.posix.dirname(normalizePath(migration.path)), `accepted Prisma migration directory shape ${migration.path}`);
  }
  if (gitCachedNames().length !== 0) fail(`stage stays empty: ${gitCachedNames().join(", ")}`);
  ok("stage stays empty");
  mustNoStagedPrefix(cachedNames, ["backend/src/routes/", "backend/src/services/", "backend/prisma/", "prisma/"], "backend route/service/schema and Prisma stay unstaged");
  mustNoStagedPrefix(cachedNames, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== SAFE-DRIVE-01 CHECK PASS ===");
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
