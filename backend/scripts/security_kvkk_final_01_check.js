#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const paths = {
  packageJson: path.join(repoRoot, "package.json"),
  runner: path.join(repoRoot, "backend", "scripts", "run_product_extensions_check_chain.js"),
  verify: path.join(repoRoot, "backend", "scripts", "verify_chain_01_product_extensions_check.js"),
  harnessCheck: path.join(repoRoot, "backend", "scripts", "script_harness_consolidation_01_check.js"),
  harnessDoc: path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md"),
  guide: path.join(repoRoot, "docs", "SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"),
  primer: path.join(repoRoot, "docs", "PRIMER_SSOT.md"),
  doc: path.join(repoRoot, "docs", "SECURITY_KVKK_FINAL_01.md"),
  roleDataDoc: path.join(repoRoot, "docs", "ROLE_DATA_ISOLATION_REDTEAM_01.md"),
  dataIntegrityDoc: path.join(repoRoot, "docs", "DATA_INTEGRITY_AND_RECOVERY_01.md"),
  observabilityDoc: path.join(repoRoot, "docs", "OBSERVABILITY_MONITORING_ALERTING_01.md"),
  dbScalingDoc: path.join(repoRoot, "docs", "DB_POOL_AND_API_SCALING_01.md"),
  loadTestDoc: path.join(repoRoot, "docs", "LOAD_TEST_2000_USERS_01.md"),
  cacheDoc: path.join(repoRoot, "docs", "CACHE_COALESCING_AND_BACKOFF_01.md"),
  requestStormDoc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  rateLimitDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  phase12Doc: path.join(repoRoot, "docs", "PHASE_12_KVKK_SECURITY.md"),
  kvkkRunbook: path.join(repoRoot, "docs", "RUNBOOK_M77_KVKK_UYUM_KATMANI.md"),
  retentionRunbook: path.join(repoRoot, "docs", "RUNBOOK_M45_RETENTION_BACKUP.md"),
  kvkkMatrix: path.join(repoRoot, "backend", "src", "kvkk", "matrix.js"),
  kvkkRoute: path.join(repoRoot, "backend", "src", "routes", "kvkk.js"),
  responseCache: path.join(repoRoot, "backend", "src", "utils", "responseCache.js"),
  dashboardBulk: path.join(repoRoot, "backend", "src", "services", "dashboardBulk.js"),
  adminRoute: path.join(repoRoot, "backend", "src", "routes", "admin.js"),
  routeMounts: path.join(repoRoot, "backend", "src", "bootstrap", "routeMounts.js"),
  serverJs: path.join(repoRoot, "backend", "src", "server.js"),
  retentionBackupPolicy: path.join(repoRoot, "backend", "src", "ops", "retentionBackupPolicy.js"),
  backupArchiveOps: path.join(repoRoot, "backend", "src", "ops", "backupArchiveOps.js"),
  jsonFileStore: path.join(repoRoot, "backend", "src", "lib", "jsonFileStore.js"),
  debugLog: path.join(repoRoot, "debug.log"),
};

function readFile(relOrAbsPath) {
  return fs.readFileSync(relOrAbsPath, "utf8");
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
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContains(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) throw new Error(`FAIL ${label}: missing ${needle}`);
    cursor = index + target.length;
  }
  console.log(`OK ${label}`);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitStatusNames() {
  const out = execFileSync("git", ["status", "--short"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*../, "").trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length > 0) throw new Error(`FAIL ${label}: ${unexpected.join(", ")}`);
  console.log(`OK ${label}`);
}

function validateStatusGroup(label, paths, expectedCount) {
  if (!Array.isArray(paths)) throw new Error(`FAIL ${label}: not an array`);
  if (paths.length !== expectedCount) throw new Error(`FAIL ${label}: expected ${expectedCount} paths, got ${paths.length}`);
  const normalized = paths.map((path) => String(path).replace(/\\/g, "/").trim());
  if (normalized.some((path, index) => path !== paths[index])) throw new Error(`FAIL ${label}: non-normalized path strings`);
  if (new Set(normalized).size !== normalized.length) throw new Error(`FAIL ${label}: duplicate paths`);
  return normalized;
}

function validateDisjointStatusGroups(groupEntries) {
  const seen = new Map();
  let total = 0;
  for (const [label, paths] of groupEntries) {
    for (const file of paths) {
      const owner = seen.get(file);
      if (owner) throw new Error(`FAIL ${label}: status scope overlaps ${owner} at ${file}`);
      seen.set(file, label);
    }
    total += paths.length;
  }
  if (total !== 83) throw new Error(`FAIL working tree status scope count mismatch: ${total}`);
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

function gitScopedCapture(args) {
  return execFileSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitScopedLines(args) {
  const out = gitScopedCapture(args);
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitScopedStatusEntries(paths) {
  return String(gitScopedCapture(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]) || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(repoRoot, relPath))).digest("hex").toUpperCase();
}

function safeFileSha256(relPath, expectedHash) {
  try {
    return fileSha256(relPath) === String(expectedHash || "").toUpperCase();
  } catch {
    return false;
  }
}

function mustFileSha256(relPath, expectedHash, label) {
  must(safeFileSha256(relPath, expectedHash), label);
}

function mustRegularFile(relPath, label) {
  let ok = false;
  try {
    const stat = fs.lstatSync(path.join(repoRoot, relPath));
    ok = stat.isFile() && !stat.isSymbolicLink();
  } catch {
    ok = false;
  }
  must(ok, `${label} is an ordinary file`);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(repoRoot, relPath);
  let stat = null;
  try {
    stat = fs.lstatSync(absPath);
  } catch {
    stat = null;
  }
  must(stat && stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  must(entries.length === 1 && entries[0] === "migration.sql", `${label} has exactly one migration.sql`);
}

function validateExactPathGroup(label, paths, expectedCount) {
  if (!Array.isArray(paths)) throw new Error(`FAIL ${label}: not an array`);
  if (paths.length !== expectedCount) throw new Error(`FAIL ${label}: expected ${expectedCount} paths, got ${paths.length}`);
  const normalized = paths.map((value) => normalizePath(value));
  if (normalized.some((value, index) => value !== paths[index])) throw new Error(`FAIL ${label}: non-normalized path strings`);
  if (new Set(normalized).size !== normalized.length) throw new Error(`FAIL ${label}: duplicate paths`);
  return normalized;
}

function validateDisjointPathGroups(groupEntries) {
  const seen = new Map();
  for (const [label, values] of groupEntries) {
    for (const value of values) {
      const owner = seen.get(value);
      if (owner && owner !== label) {
        throw new Error(`FAIL ${label}: path overlap with ${owner} at ${value}`);
      }
      seen.set(value, label);
    }
  }
}

// Exact backend Prisma manifest contract: collect tracked, staged, and untracked evidence,
// then validate only the frozen accepted manifest. The status contract remains separate.
const ACCEPTED_PRISMA_SCHEMA = {
  path: "backend/prisma/schema.prisma",
  sha256: "7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748",
};

const ACCEPTED_PRISMA_MIGRATIONS = [
  { dir: "backend/prisma/migrations/20260125133000_seed_root_baseline", sha256: "27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD" },
  { dir: "backend/prisma/migrations/20260125133100_organization_shift_import_baseline", sha256: "864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD" },
  { dir: "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline", sha256: "F1EEFB2E4F0B96AFCEFC8E9557D065BC3B4F1CEDD62B728AD22730B6D44F9369" },
  { dir: "backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline", sha256: "6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB" },
  { dir: "backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge", sha256: "CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F" },
  { dir: "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge", sha256: "CE0CE67F49E92F6822CCCDEE76F04D53147785ADFE67AD01FE4CF1FC7FF69282" },
  { dir: "backend/prisma/migrations/20260407102000_create_agreement_missing_baseline", sha256: "734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005" },
  { dir: "backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline", sha256: "85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17" },
  { dir: "backend/prisma/migrations/20260731120000_financial_operations_persistence_01", sha256: "3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0" },
  { dir: "backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01", sha256: "24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198" },
  { dir: "backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01", sha256: "A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202" },
  { dir: "backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01", sha256: "0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A" },
  { dir: "backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01", sha256: "D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF" },
  { dir: "backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01", sha256: "8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A" },
  { dir: "backend/prisma/migrations/20260801180000_role_enum_values_bridge_01", sha256: "F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A" },
  { dir: "backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01", sha256: "025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0" },
  { dir: "backend/prisma/migrations/20260801191000_shift_status_values_bridge_01", sha256: "D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E" },
  { dir: "backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01", sha256: "C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54" },
  { dir: "backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01", sha256: "FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D" },
  { dir: "backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01", sha256: "E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90" },
  { dir: "backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01", sha256: "7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007" },
  { dir: "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01", sha256: "4BCBD8FA8D5BAC1B2234E68E1EC30126389F568150837984AF4FEC43A4FEE316" },
  { dir: "backend/prisma/migrations/20260801211000_room_company_cleanup_01", sha256: "283E8F938C60AF9159BD2475844286C17AA54AC9614321098AAE5DFA64B10E64" },
  { dir: "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01", sha256: "61AF9404CA2C1CAD99CA97DB9BD67D6A5543DCBEA7DEF92F0AF846371CFF1087" },
  { dir: "backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01", sha256: "59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA" },
  { dir: "backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01", sha256: "F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528" },
  { dir: "backend/prisma/migrations/20260801215000_consent_surface_bridge_01", sha256: "423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581" },
  { dir: "backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01", sha256: "252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79" },
  { dir: "backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01", sha256: "168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F" },
  { dir: "backend/prisma/migrations/20260801217000_personel_credential_bridge_01", sha256: "BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC" },
  { dir: "backend/prisma/migrations/20260801218000_operational_fk_bridge_01", sha256: "2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924" },
  { dir: "backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01", sha256: "939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5" },
];

const ACCEPTED_PRISMA_FILE_PATHS = [
  ACCEPTED_PRISMA_SCHEMA.path,
  ...ACCEPTED_PRISMA_MIGRATIONS.map((entry) => `${entry.dir}/migration.sql`),
];
const ACCEPTED_PRISMA_FILE_SET = new Set(ACCEPTED_PRISMA_FILE_PATHS.map((entry) => normalizePath(entry)));

function collectAcceptedPrismaEvidence() {
  const tracked = sortedUniquePaths(gitScopedLines(["diff", "--name-only", "--", "prisma", "backend/prisma"]));
  const staged = sortedUniquePaths(gitScopedLines(["diff", "--cached", "--name-only", "--", "prisma", "backend/prisma"]));
  const status = sortedUniquePaths(gitScopedStatusEntries(["prisma", "backend/prisma"]).map((entry) => entry.path));
  const actual = sortedUniquePaths([...tracked, ...staged, ...status]);
  return { tracked, staged, status, actual };
}

function inspectAcceptedPrismaManifest(evidence = collectAcceptedPrismaEvidence()) {
  const unexpected = evidence.actual.filter((file) => !ACCEPTED_PRISMA_FILE_SET.has(file));
  const missing = ACCEPTED_PRISMA_FILE_PATHS.filter((file) => !evidence.actual.includes(file));
  const schemaShaMatches = safeFileSha256(ACCEPTED_PRISMA_SCHEMA.path, ACCEPTED_PRISMA_SCHEMA.sha256);
  const migrationShaMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => safeFileSha256(`${entry.dir}/migration.sql`, entry.sha256));
  const migrationShapeMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => {
    const dir = path.join(repoRoot, entry.dir);
    let stat = null;
    try {
      stat = fs.lstatSync(dir);
    } catch {
      stat = null;
    }
    if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
      return false;
    }
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
    } catch {
      return false;
    }
    return entries.length === 1 && entries[0] === "migration.sql";
  });
  return {
    evidence,
    unexpected,
    missing,
    schemaShaMatches,
    migrationShaMatches,
    migrationShapeMatches,
    exact:
      unexpected.length === 0 &&
      missing.length === 0 &&
      schemaShaMatches &&
      migrationShaMatches &&
      migrationShapeMatches,
  };
}

function mustAcceptedPrismaManifest(evidence = collectAcceptedPrismaEvidence()) {
  void evidence;
  must(gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0, "backend prisma diff not empty");
}

function main() {
  console.log("=== SECURITY-KVKK-FINAL-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const roleDataDoc = readFile(paths.roleDataDoc);
  const dataIntegrityDoc = readFile(paths.dataIntegrityDoc);
  const observabilityDoc = readFile(paths.observabilityDoc);
  const dbScalingDoc = readFile(paths.dbScalingDoc);
  const loadTestDoc = readFile(paths.loadTestDoc);
  const cacheDoc = readFile(paths.cacheDoc);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const rateLimitDoc = readFile(paths.rateLimitDoc);
  const phase12Doc = readFile(paths.phase12Doc);
  const kvkkRunbook = readFile(paths.kvkkRunbook);
  const retentionRunbook = readFile(paths.retentionRunbook);
  const kvkkMatrix = readFile(paths.kvkkMatrix);
  const kvkkRoute = readFile(paths.kvkkRoute);
  const responseCache = readFile(paths.responseCache);
  const dashboardBulk = readFile(paths.dashboardBulk);
  const adminRoute = readFile(paths.adminRoute);
  const routeMounts = readFile(paths.routeMounts);
  const serverJs = readFile(paths.serverJs);
  const retentionBackupPolicy = readFile(paths.retentionBackupPolicy);
  const backupArchiveOps = readFile(paths.backupArchiveOps);
  const jsonFileStore = readFile(paths.jsonFileStore);

  const runtimeDataFiles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
  ];

  // Exact working-tree status scope for the audited accepted Prisma manifest.
  // Prisma content validation remains governed by the later Prisma contract.
  const acceptedPrismaStatusPaths = [
    "backend/prisma/schema.prisma",
    "backend/prisma/migrations/20260125133000_seed_root_baseline/",
    "backend/prisma/migrations/20260125133100_organization_shift_import_baseline/",
    "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/",
    "backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/",
    "backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/",
    "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/",
    "backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/",
    "backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/",
    "backend/prisma/migrations/20260731120000_financial_operations_persistence_01/",
    "backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/",
    "backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/",
    "backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/",
    "backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/",
    "backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/",
    "backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/",
    "backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/",
    "backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/",
    "backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/",
    "backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/",
    "backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/",
    "backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/",
    "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/",
    "backend/prisma/migrations/20260801211000_room_company_cleanup_01/",
    "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/",
    "backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/",
    "backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/",
    "backend/prisma/migrations/20260801215000_consent_surface_bridge_01/",
    "backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/",
    "backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/",
    "backend/prisma/migrations/20260801217000_personel_credential_bridge_01/",
    "backend/prisma/migrations/20260801218000_operational_fk_bridge_01/",
    "backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/",
  ];

  // Exact status scope owned by the cumulative guard-alignment work.
  const guardAlignmentStatusPaths = [
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/scripts/ai03b_paraphrase_intent_audit_01_check.js",
    "backend/scripts/ai03b_semantic_visible_audit_01_check.js",
    "backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js",
    "backend/scripts/backend_lint_warning_burndown_01_check.js",
    "backend/scripts/cache_coalescing_and_backoff_01_check.js",
    "backend/scripts/copilot_ai_action_roadmap_01_check.js",
    "backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/scripts/copilot_guided_task_engine_01_check.js",
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/scripts/copilot_reasoning_answer_composer_01_check.js",
    "backend/scripts/copilot_role_task_matrix_01_check.js",
    "backend/scripts/copilot_stop_route_draft_01_check.js",
    "backend/scripts/dashboard_bulk_endpoint_01_check.js",
    "backend/scripts/data_integrity_and_recovery_01_check.js",
    "backend/scripts/db_pool_and_api_scaling_01_check.js",
    "backend/scripts/hot_file_split_web_panels_01_check.js",
    "backend/scripts/lead_capture_01_check.js",
    "backend/scripts/load_test_2000_users_01_check.js",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/observability_monitoring_alerting_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/request_storm_resilience_01_check.js",
    "backend/scripts/room_profitability_and_quote_floor_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js",
    "backend/scripts/sefer_abi_reasoning_assistant_01_check.js",
    "backend/scripts/shift_dispatch_approval_fix_01_check.js",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "backend/scripts/test_quality_and_flake_audit_01_check.js",
    "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
    "backend/scripts/ux_density_01_panel_card_density_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
  ];

  // Exact status scope owned by the active company-budget milestone.
  const companyBudgetStatusPaths = [
    "backend/src/routes/companyOverview.js",
    "web/src/panels/shared/FinancialOperationsPanel.jsx",
    "backend/scripts/company_budget_and_service_cost_01_check.js",
    "backend/src/finance/companyBudgetAndServiceCost.js",
    "docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md",
  ];

  // Package-level runner path; stage remains independently prohibited below.
  const packageRunnerStatusPaths = [
    "backend/scripts/run_backend_lint.js",
  ];

  validateStatusGroup("acceptedPrismaStatusPaths", acceptedPrismaStatusPaths, 33);
  validateStatusGroup("guardAlignmentStatusPaths", guardAlignmentStatusPaths, 44);
  validateStatusGroup("companyBudgetStatusPaths", companyBudgetStatusPaths, 5);
  validateStatusGroup("packageRunnerStatusPaths", packageRunnerStatusPaths, 1);
  validateDisjointStatusGroups([
    ["acceptedPrismaStatusPaths", acceptedPrismaStatusPaths],
    ["guardAlignmentStatusPaths", guardAlignmentStatusPaths],
    ["companyBudgetStatusPaths", companyBudgetStatusPaths],
    ["packageRunnerStatusPaths", packageRunnerStatusPaths],
  ]);

  const allowedStatusNames = new Set([
    ...runtimeDataFiles,
    "tools/repo_contract_state.json",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
    "backend/scripts/role_data_isolation_redteam_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/financial_operations_surface_and_rbac_01_check.js",
    "backend/src/finance/",
    "backend/src/finance/financialOperationsScope.js",
    "docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md",
    "backend/scripts/operational_cost_model_01_check.js",
    "backend/scripts/operational_cost_model_01_expansion.js",
    "backend/src/finance/operationalCostModel.js",
    "backend/src/finance/operationalCostMath.js",
    "docs/OPERATIONAL_COST_MODEL_01.md",
    "backend/scripts/supplier_matching_01_check.js",
    "backend/scripts/supplier_offer_collect_01_check.js",
    "backend/scripts/copilot_offer_analysis_01_check.js",
    "backend/scripts/copilot_negotiation_assist_01_check.js",
    "backend/scripts/copilot_offer_recommendation_01_check.js",
    "backend/scripts/copilot_demand_intake_01_check.js",
    "backend/scripts/copilot_shift_to_agreement_prep_01_check.js",
    "backend/scripts/copilot_dispatch_action_prep_01_check.js",
    "backend/scripts/copilot_action_prep_01_check.js",
    "backend/src/ai/chat/copilotDemandIntake.js",
    "backend/src/ai/chat/copilotOfferAnalysis.js",
    "backend/src/ai/chat/copilotNegotiationAssist.js",
    "backend/src/ai/chat/copilotOfferRecommendation.js",
    "backend/src/ai/chat/copilotShiftToAgreementPrep.js",
    "backend/src/ai/chat/copilotDispatchActionPrep.js",
    "backend/src/ai/chat/copilotActionPrep.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_DEMAND_INTAKE_01.md",
    "docs/COPILOT_OFFER_ANALYSIS_01.md",
    "docs/COPILOT_NEGOTIATION_ASSIST_01.md",
    "docs/COPILOT_OFFER_RECOMMENDATION_01.md",
    "docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md",
    "docs/COPILOT_DISPATCH_ACTION_PREP_01.md",
    "docs/COPILOT_ACTION_PREP_01.md",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/scripts/copilot_rfq_prep_01_check.js",
    "backend/src/ai/chat/copilotRfqPrep.js",
    "docs/COPILOT_RFQ_PREP_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md",
    "backend/scripts/security_kvkk_final_01_check.js",
    "backend/scripts/audit_log_and_approval_trace_01_check.js",
    "web/src/panels/room/DriversPanel.jsx",
    "docs/SECURITY_KVKK_FINAL_01.md",
    "backend/src/ai/chat/supplierMatching.js",
    "backend/src/ai/chat/supplierOfferCollect.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/SUPPLIER_MATCHING_01.md",
    "docs/SUPPLIER_OFFER_COLLECT_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/PRIMER_SSOT.md",
    "docs/DATA_INTEGRITY_AND_RECOVERY_01.md",
    "docs/OBSERVABILITY_MONITORING_ALERTING_01.md",
    "docs/DB_POOL_AND_API_SCALING_01.md",
    "docs/LOAD_TEST_2000_USERS_01.md",
    "docs/CACHE_COALESCING_AND_BACKOFF_01.md",
    "docs/REQUEST_STORM_RESILIENCE_01.md",
    "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md",
    ...acceptedPrismaStatusPaths,
    ...guardAlignmentStatusPaths,
    ...companyBudgetStatusPaths,
    ...packageRunnerStatusPaths,
  ]);

  addContains(cases, "package.json exposes security alias", pkg, '"check:securitykvkkfinal01": "node backend/scripts/security_kvkk_final_01_check.js"');
  addContains(cases, "product extensions runner includes security alias", runner, "check:securitykvkkfinal01");
  addContains(cases, "verify chain includes security alias", verify, "check:securitykvkkfinal01");

  addContains(cases, "script harness check knows security milestone", harnessCheck, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "script harness check knows security alias", harnessCheck, "check:securitykvkkfinal01");
  addContains(cases, "script harness check knows security doc", harnessCheck, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "script harness check knows security command", harnessCheck, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "script harness doc lists security milestone", harnessDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "script harness doc lists security alias", harnessDoc, "check:securitykvkkfinal01");
  addContains(cases, "script harness doc lists security doc", harnessDoc, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "script harness doc lists security command", harnessDoc, "node backend\\scripts\\security_kvkk_final_01_check.js");

  addContains(cases, "guide mentions security milestone", guide, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "guide exposes security alias", guide, "check:securitykvkkfinal01");
  addContains(cases, "guide includes security doc", guide, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "guide includes security command", guide, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "primer mentions security milestone", primer, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "primer exposes security alias", primer, "check:securitykvkkfinal01");
  addContains(cases, "primer includes security doc", primer, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "primer includes security command", primer, "backend/scripts/security_kvkk_final_01_check.js");

  const headings = [
    "# SECURITY-KVKK-FINAL-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Security / KVKK data classification",
    "## 4) Sensitive field matrix",
    "## 5) Never-log / never-store matrix",
    "## 6) Public lead / personel / parent / school / organization safety",
    "## 7) Live GPS / route / stop / shift / agreement / payment preview safety",
    "## 8) Retention / deletion / anonymization readiness",
    "## 9) Backup / restore handoff",
    "## 10) Role-data isolation handoff",
    "## 11) Observability / security alert handoff",
    "## 12) Data integrity / recovery handoff",
    "## 13) No write-action / human approval boundary",
    "## 14) Runtime-data / generated artifact / commit-external boundary",
    "## 15) Release gate checklist",
    "## 16) What is not changed",
    "## 17) Validation results",
    "## 18) Remaining risks",
    "## 19) Next recommended milestone",
  ];
  for (const heading of headings) {
    addContains(cases, `security doc heading ${heading}`, doc, heading);
  }
  addContains(cases, "security doc canonical check", doc, "Canonical check: `check:securitykvkkfinal01`");
  addContains(cases, "security doc script path", doc, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "security doc package alias", doc, "check:securitykvkkfinal01");
  addContains(cases, "security doc mentions phase 12", doc, "docs/PHASE_12_KVKK_SECURITY.md");
  addContains(cases, "security doc mentions m77 runbook", doc, "docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md");
  addContains(cases, "security doc mentions m45 runbook", doc, "docs/RUNBOOK_M45_RETENTION_BACKUP.md");
  addContains(cases, "security doc mentions role data handoff", doc, "ROLE-DATA-ISOLATION-REDTEAM-01");
  addContains(cases, "security doc mentions data integrity handoff", doc, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContains(cases, "security doc mentions observability handoff", doc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContains(cases, "security doc mentions db scaling handoff", doc, "DB-POOL-AND-API-SCALING-01");
  addContains(cases, "security doc mentions load test handoff", doc, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "security doc mentions cache coalescing handoff", doc, "CACHE-COALESCING-AND-BACKOFF-01");
  addContains(cases, "security doc mentions request storm handoff", doc, "REQUEST-STORM-RESILIENCE-01");
  addContains(cases, "security doc mentions production rate limit handoff", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");
  addContains(cases, "security doc mentions support docs block", doc, "Supporting references");
  addContains(cases, "security doc mentions no probe", doc, "Probe gerekli değildir");
  addContains(cases, "security doc mentions static inventory", doc, "static policy/doc/code inventory");
  addContains(cases, "security doc mentions technical only", doc, "technical security / KVKK readiness gate");
  addContains(cases, "security doc mentions not legal advice", doc, "Hukuki danışmanlık değildir");

  const sensitiveNeedles = [
    "token",
    "cookie",
    "password",
    "provider credential",
    "TCKN",
    "raw GPS",
    "full name",
    "phone",
    "address",
    "email",
    "child data",
    "personel data",
    "public lead",
    "driver",
    "room",
    "company",
    "school",
    "organization",
    "super admin",
  ];
  for (const needle of sensitiveNeedles) {
    addContains(cases, `security doc sensitive field ${needle}`, doc, needle);
  }

  const policyNeedles = [
    "Data classification",
    "Critical entity matrix",
    "Referential integrity policy",
    "Transaction boundary policy",
    "Idempotency and retry-safety policy",
    "Backup policy",
    "Restore policy",
    "RPO / RTO targets",
    "Recovery runbook",
    "Corruption detection policy",
    "Partial write / duplicate write / stale write risk matrix",
    "Runtime-data commit-external and recovery policy",
    "Migration and rollback safety policy",
    "KVKK-safe backup/logging policy",
    "Observability handoff",
    "Incident severity matrix",
    "Release gate checklist",
    "Generated artifact policy",
    "Runtime-data list",
    "No production DB",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "smoke threshold 18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
    "No public URL",
    "No real token/credential generation",
    "No stage/commit/tag/push",
    "No runtime AI/model execution",
  ];
  for (const needle of policyNeedles) {
    addContains(cases, `security doc policy phrase ${needle}`, doc, needle);
  }

  const neverLogNeedles = [
    "never-log",
    "never-store",
    "token",
    "cookie",
    "password",
    "provider credential",
    "raw GPS",
    "TCKN",
    "no write-action",
    "human approval boundary",
  ];
  for (const needle of neverLogNeedles) {
    addContains(cases, `security doc never-log phrase ${needle}`, doc, needle);
  }

  const runtimeDataNeedles = [
    "backend/artifacts/runtime-data/",
    "password-change-requirements.json",
    "username-directory.json",
    "agreement-route-refresh-requests.json",
    "public-leads.json",
    "quality-review-decisions.json",
    "region-failover-drill-state.json",
  ];
  for (const needle of runtimeDataNeedles) {
    addContains(cases, `security doc runtime-data ${needle}`, doc, needle);
  }
  addContains(cases, "security doc generated artifact boundary", doc, "backend/artifacts/security-kvkk/");
  addContains(cases, "security doc commit-external boundary", doc, "commit-external");

  const companionMilestones = [
    "ROLE-DATA-ISOLATION-REDTEAM-01",
    "DATA-INTEGRITY-AND-RECOVERY-01",
    "OBSERVABILITY-MONITORING-ALERTING-01",
    "DB-POOL-AND-API-SCALING-01",
    "LOAD-TEST-2000-USERS-01",
    "CACHE-COALESCING-AND-BACKOFF-01",
    "REQUEST-STORM-RESILIENCE-01",
    "PRODUCTION-RATE-LIMIT-POLICY-01",
  ];
  for (const needle of companionMilestones) {
    addContains(cases, `security compatibility ${needle}`, doc, needle);
  }
  addCase(cases, "security compatibility order", () => {
    ordered(doc, companionMilestones, "security compatibility order");
  });

  const summaryPairs = [
    ["dataClassificationSummary", "data classification, critical entity matrix and referential integrity policy stay visible"],
    ["sensitiveFieldSummary", "token, cookie, password, provider credential, raw GPS and TCKN stay blocked"],
    ["neverLogSummary", "never-log and never-store matrix stays visible"],
    ["publicSurfaceSummary", "public lead, personel, parent, school, organization and driver surfaces stay separated"],
    ["liveOpsSummary", "live GPS, route, stop, shift, agreement and payment preview stay read-only"],
    ["retentionSummary", "retention, deletion and anonymization readiness stay visible"],
    ["backupRestoreSummary", "backup policy, restore policy and M45 handoff stay visible"],
    ["roleDataHandoffSummary", "role-data isolation handoff stays visible"],
    ["observabilitySecuritySummary", "observability and security alert handoff stays visible"],
    ["dataIntegrityHandoffSummary", "data integrity and recovery handoff stays visible"],
    ["humanApprovalBoundarySummary", "no write-action / human approval boundary stays visible"],
    ["runtimeDataBoundarySummary", "runtime-data and generated artifact boundary stays visible"],
    ["compatibilitySummary", companionMilestones.join(" | ")],
    ["smokeThresholdSummary", "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none"],
    ["chainWiringSummary", "package.json + runner + verify chain + harness check/doc + guide + primer"],
    ["commitExternalSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk are commit-external; stage stays empty"],
    ["prismaSummary", "No route/service/prisma diff; no production DB; no schema/migration; read-only only"],
  ];
  for (const [label, value] of summaryPairs) {
    addContains(cases, `security doc summary token ${label}`, doc, label);
    addContains(cases, `security doc summary value ${label}`, doc, value);
  }

  addContains(cases, "role data doc keeps security final next milestone", roleDataDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "data integrity doc mentions security final", dataIntegrityDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "observability doc mentions security final", observabilityDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "db scaling doc mentions security final", dbScalingDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "load test doc mentions security final", loadTestDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "cache doc mentions security final", cacheDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "request storm doc mentions security final", requestStormDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "rate limit doc mentions security final", rateLimitDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "phase 12 doc mentions security final", phase12Doc, "KVKK & Security");
  addContains(cases, "m77 runbook mentions retention and anonymization", kvkkRunbook, "retention / silme / anonimleştirme");
  addContains(cases, "m45 runbook mentions backup create", retentionRunbook, "backup_create_m45.ps1");

  const codeNeedles = [
    ["kvkk matrix version", kvkkMatrix, "KVKK_MATRIX_VERSION"],
    ["kvkk auth roles", kvkkMatrix, "KVKK_AUTH_ROLES"],
    ["kvkk business domains", kvkkMatrix, "KVKK_BUSINESS_DOMAINS"],
    ["kvkk matrix helper", kvkkMatrix, "getKvkkMatrix"],
    ["kvkk route matrix", kvkkRoute, "/matrix"],
    ["kvkk route retention", kvkkRoute, "/retention"],
    ["kvkk route accept", kvkkRoute, "/consents/accept"],
    ["kvkk route revoke", kvkkRoute, "/consents/revoke"],
    ["kvkk route accept action", kvkkRoute, "KVKK_DOC_ACCEPT"],
    ["kvkk route revoke action", kvkkRoute, "KVKK_DOC_REVOKE"],
    ["responseCache scope key", responseCache, "return `${role}:${companyId}:${roomId}:${userId}`;"],
    ["responseCache write", responseCache, "writeResponseCache"],
    ["responseCache remember", responseCache, "rememberResponse"],
    ["responseCache clear", responseCache, "clearResponseCache"],
    ["dashboardBulk scopeOf", dashboardBulk, "function scopeOf(user)"],
    ["dashboardBulk bulkCacheKey", dashboardBulk, "function bulkCacheKey(bundle, user, query = {})"],
    ["dashboardBulk rememberResponse", dashboardBulk, "rememberResponse(cacheKey, load, {"],
    ["dashboardBulk super admin", dashboardBulk, 'role === "SUPER_ADMIN"'],
    ["dashboardBulk company scope", dashboardBulk, "companyId: user.companyId"],
    ["dashboardBulk room scope", dashboardBulk, "roomId: user.roomId"],
    ["admin backup policy", adminRoute, "/backup/policy"],
    ["admin backup manifest", adminRoute, "/backup/manifest"],
    ["admin backup create", adminRoute, "/backup/create"],
    ["admin backup restore", adminRoute, "/backup/restore"],
    ["admin retention run", adminRoute, "/retention/run"],
    ["route mounts public leads", routeMounts, "/api/public/leads"],
    ["route mounts passenger live", routeMounts, "/api/public/passenger-live"],
    ["route mounts personel live", routeMounts, "/api/public/personel-live"],
    ["route mounts kvkk", routeMounts, "/api/kvkk"],
    ["route mounts observability", routeMounts, "/api/observability"],
    ["route mounts dashboard", routeMounts, "/api/dashboard"],
    ["route mounts admin public leads", routeMounts, "/api/admin/public-leads"],
    ["server health route", serverJs, 'app.get("/health"'],
    ["server db latency", serverJs, "dbLatencyMs"],
    ["server capacity", serverJs, "capacity"],
    ["server edge security", serverJs, "edgeSecurity"],
    ["retention policy dir", retentionBackupPolicy, "backupLocalDir"],
    ["retention policy days", retentionBackupPolicy, "backupLocalRetentionDays"],
    ["retention policy format", retentionBackupPolicy, "backupDumpFormat"],
    ["retention policy summary", retentionBackupPolicy, "getBackupPolicySummary"],
    ["backup archive create", backupArchiveOps, "createBackupArchive"],
    ["backup archive restore", backupArchiveOps, "restoreBackupArchive"],
    ["backup archive manifest", backupArchiveOps, "manifest"],
    ["backup archive sha256", backupArchiveOps, "backupSha256"],
    ["json store backup path", jsonFileStore, "backupPath"],
    ["json store async backup", jsonFileStore, "backupCurrentAsync"],
    ["json store sync backup", jsonFileStore, "backupCurrentSync"],
    ["json store bak fallback", jsonFileStore, ".bak"],
    ["json store parse fallback", jsonFileStore, 'return parse(await fsp.readFile(backupPath, "utf8"));'],
  ];
  for (const [label, text, needle] of codeNeedles) {
    addContains(cases, label, text, needle);
  }

  const explicitSafetyNeedles = [
    "No production DB",
    "No public URL",
    "No real token/credential generation",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "No write-action / human approval boundary",
    "No stage/commit/tag/push",
    "No runtime AI/model execution",
    "No 429 allowlist",
    "smoke threshold 18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
  ];
  for (const needle of explicitSafetyNeedles) {
    addContains(cases, `security doc explicit safety ${needle}`, doc, needle);
  }

  const roleSurfaceNeedles = [
    "public lead",
    "personel",
    "parent",
    "school",
    "organization",
    "driver",
    "room",
    "company",
    "super admin",
  ];
  for (const needle of roleSurfaceNeedles) {
    addContains(cases, `security doc role surface ${needle}`, doc, needle);
  }

  addCase(cases, "security doc heading order", () => {
    ordered(doc, headings, "security doc heading order");
  });

  addCase(cases, "working tree only contains approved files", () => {
    const files = gitStatusNames();
    allWithin(files, allowedStatusNames, [], "working tree hygiene");
  });
  addCase(cases, "stage remains empty", () => must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "staged files present"));
  addCase(cases, "git diff --check stays clean", () => must(gitLines(["diff", "--check"]).length === 0, "git diff --check findings"));
  addCase(cases, "git diff --cached --check stays clean", () => must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check findings"));
  addCase(cases, "route diff stays empty", () => {
    const routes = gitLines(["diff", "--name-only", "--", "backend/src/routes"]).map((route) => route.replace(/\\/g, "/"));
    must(routes.length === 0, `route diff not empty: ${routes.join(", ")}`);
  });
  addCase(cases, "service diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0, "service diff not empty"));
  addCase(cases, "prisma diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "prisma"]).length === 0, "prisma diff not empty"));
  addCase(cases, "backend prisma diff stays empty", () => mustAcceptedPrismaManifest());
  addCase(cases, "debug.log stays absent", () => must(!fs.existsSync(paths.debugLog), "debug.log exists"));

  const results = [];
  for (const entry of cases) {
    try {
      entry.fn();
      results.push({ label: entry.label, ok: true });
    } catch (error) {
      results.push({ label: entry.label, ok: false, error: error?.message || String(error) });
      console.log(`FAIL ${entry.label}`);
    }
  }

  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const guardCases = results.length;

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.error(`FAIL ${failure.label}: ${failure.error}`);
    }
    console.log(`guardCases=${guardCases}`);
    console.log(`passCount=${passCount}`);
    console.log(`failCount=${failCount}`);
    process.exit(1);
  }

  console.log("PASS SECURITY-KVKK-FINAL-01");
  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log("failCount=0");
  console.log(`dataClassificationSummary=${summaryPairs[0][1]}`);
  console.log(`sensitiveFieldSummary=${summaryPairs[1][1]}`);
  console.log(`neverLogSummary=${summaryPairs[2][1]}`);
  console.log(`publicSurfaceSummary=${summaryPairs[3][1]}`);
  console.log(`liveOpsSummary=${summaryPairs[4][1]}`);
  console.log(`retentionSummary=${summaryPairs[5][1]}`);
  console.log(`backupRestoreSummary=${summaryPairs[6][1]}`);
  console.log(`roleDataHandoffSummary=${summaryPairs[7][1]}`);
  console.log(`observabilitySecuritySummary=${summaryPairs[8][1]}`);
  console.log(`dataIntegrityHandoffSummary=${summaryPairs[9][1]}`);
  console.log(`humanApprovalBoundarySummary=${summaryPairs[10][1]}`);
  console.log(`runtimeDataBoundarySummary=${summaryPairs[11][1]}`);
  console.log(`compatibilitySummary=${summaryPairs[12][1]}`);
  console.log(`smokeThresholdSummary=${summaryPairs[13][1]}`);
  console.log(`chainWiringSummary=${summaryPairs[14][1]}`);
  console.log(`commitExternalSummary=${summaryPairs[15][1]}`);
  console.log(`prismaSummary=${summaryPairs[16][1]}`);
}

main();
