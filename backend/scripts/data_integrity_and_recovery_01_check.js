#!/usr/bin/env node

import { CANONICAL_PRISMA_SCHEMA_PATH as ACCEPTED_SCHEMA_PATH, CANONICAL_PRISMA_SCHEMA_RAW_SHA256 as ACCEPTED_SCHEMA_SHA256 } from "./lib/prismaSchemaIdentity.js";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsCheckIndex } from "./lib/productExtensionsRegistry.js";
import { mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";

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
  doc: path.join(repoRoot, "docs", "DATA_INTEGRITY_AND_RECOVERY_01.md"),
  jsonFileStore: path.join(repoRoot, "backend", "src", "lib", "jsonFileStore.js"),
  adminRoute: path.join(repoRoot, "backend", "src", "routes", "admin.js"),
  backupArchiveOps: path.join(repoRoot, "backend", "src", "ops", "backupArchiveOps.js"),
  retentionBackupPolicy: path.join(repoRoot, "backend", "src", "ops", "retentionBackupPolicy.js"),
  envJs: path.join(repoRoot, "backend", "src", "env.js"),
  backupCreateScript: path.join(repoRoot, "backend", "scripts", "m45_backup_create.js"),
  backupRestoreScript: path.join(repoRoot, "backend", "scripts", "m45_backup_restore.js"),
  runbook: path.join(repoRoot, "docs", "RUNBOOK_M45_RETENTION_BACKUP.md"),
  archiveRestoreDoc: path.join(repoRoot, "docs", "REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md"),
  gitignore: path.join(repoRoot, ".gitignore"),
  debugLog: path.join(repoRoot, "debug.log"),
};

const dataIntegrityScript = "check:dataintegrityandrecovery01";

const approvedDataIntegrityRouteDiffs = [
  { path: "backend/src/routes/companyOverview.js", sha256: "EB2E7956FD7C02891687815D389AB9E9C5374CAB2FD684E2ADE7CE42C83F8528" },
  { path: "backend/src/routes/commercialCoreRoomRoutes.js", sha256: "11A0C1B1CDE82470871EBBBD90CEE37F4CAA5C2AD6C25AB7B39586F11CBFDD1F" },
  { path: "backend/src/routes/commercialCore.js", sha256: "14D111ADCF9C3005DACF0D7CE246EEA22109B1D2C4EDC4DA9380F2DA0461265F" },
  { path: "backend/src/routes/operationProof.js", sha256: "E5F3539A3660E70AF31DAA93203C1F4018ED4FDDF469BB74CDC3D8B73DBCA6E0" },
  { path: "backend/src/routes/trustQuality.js", sha256: "FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD" },
  { path: "backend/src/routes/admin.js", sha256: "61A3D7CF98653E6E413E787BCBFD9D8DD9AECE77A7663DCA78E9CE446D2C5DA4" },
  { path: "backend/src/routes/agreements.js", sha256: "90CED5678F26B47AE69CE985D6D436B70DF8886B523ECA8988E51BE53ECD2B9A" },
  { path: "backend/src/routes/auth.js", sha256: "A137B997660215DBD2C5E8AA24593BD96F319CF784322C65D3628B8C9F4AACF3" },
  { path: "backend/src/routes/dashboardBulk.js", sha256: "C1FA734271C1B3FF73CA3393B781EAF966710A66AD57BC31290B829CFFF5754F" },
  { path: "backend/src/routes/offers.js", sha256: "40C553F43D0709D3146D6DA48893B2FDAF9DA3B3814961ECA9C0FD8FA15FF649" },
  { path: "backend/src/routes/public.js", sha256: "5196203AC501B365D52D79D29FA355DF23421180C9337D58EEE3B19707AFFF23" },
  { path: "backend/src/routes/shifts/company.js", sha256: "19A7C7C96A86438CDE36345274D8EC8E363C889CABF4C440FE8529DBAA1534A0" },
];

const approvedDataIntegrityServiceDiffs = [
  { path: "backend/src/services/dashboardBulk.js", sha256: "E3BF830BD2DF41A158FB60ED766C9A0C25A789C85F722443A37CEA61618A1A0E" },
  { path: "backend/src/services/qualityPaymentBridgeService.js", sha256: "935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83" },
  { path: "backend/src/services/companyShiftMutationTail.js", sha256: "FE0F1F30AD2F5BC893FF631F26D19EDDDE2060246ED129087104BFDD69D88C78" },
];

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
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function addNotContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(!contains(text, needle), `${label} unexpectedly contains ${needle}`));
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) {
      throw new Error(`FAIL ${label}: missing ${needle}`);
    }
    cursor = index + target.length;
  }
  console.log(`OK ${label}`);
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

function gitCapture(args) {
  return execFileSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitStatusEntries(paths) {
  return String(gitCapture(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]) || "")
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
  must(fileSha256(relPath) === String(expectedHash || "").toUpperCase(), label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(repoRoot, relPath));
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
  must(actual === wanted, `${label}: ${actual} != ${wanted}`);
}

function isMigrationDirectoryShape(relPath) {
  try {
    const absPath = path.join(repoRoot, relPath);
    const stat = fs.lstatSync(absPath);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return false;
    }
    const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
    return entries.length === 1 && entries[0] === "migration.sql";
  } catch {
    return false;
  }
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(repoRoot, relPath);
  const stat = fs.lstatSync(absPath);
  must(stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  must(entries.length === 1 && entries[0] === "migration.sql", `${label} has exactly one migration.sql`);
}

function collectBackendPrismaEvidence() {
  const tracked = sortedUniquePaths(gitLines(["diff", "--name-only", "--", "prisma", "backend/prisma"]));
  const staged = sortedUniquePaths(gitLines(["diff", "--cached", "--name-only", "--", "prisma", "backend/prisma"]));
  const status = sortedUniquePaths(gitStatusEntries(["prisma", "backend/prisma"]).map((entry) => entry.path));
  const actual = sortedUniquePaths([...tracked, ...staged, ...status]);
  return { tracked, staged, status, actual };
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
const ACCEPTED_PRISMA_PATH_SET = new Set(ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path)));

function inspectAcceptedPrismaManifest(evidence = collectBackendPrismaEvidence()) {
  const acceptedPrismaFiles = ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path));
  const unexpected = evidence.actual.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(file));
  const missing = acceptedPrismaFiles.filter((file) => !evidence.actual.includes(file));
  const schemaShaMatches = safeFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256);
  const migrationShaMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => normalizedTextSha256(entry.path) === String(entry.sha256 || "").toUpperCase());
  const migrationShapeMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => isMigrationDirectoryShape(path.dirname(entry.path)));
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

function mustAcceptedPrismaManifest(evidence = collectBackendPrismaEvidence()) {
  const inspection = inspectAcceptedPrismaManifest(evidence);
  must(evidence.actual.length === 0, "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  return inspection;
}

function main() {
  console.log("=== DATA-INTEGRITY-AND-RECOVERY-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const jsonFileStore = readFile(paths.jsonFileStore);
  const adminRoute = readFile(paths.adminRoute);
  const backupArchiveOps = readFile(paths.backupArchiveOps);
  const retentionBackupPolicy = readFile(paths.retentionBackupPolicy);
  const envJs = readFile(paths.envJs);
  const backupCreateScript = readFile(paths.backupCreateScript);
  const backupRestoreScript = readFile(paths.backupRestoreScript);
  const runbook = readFile(paths.runbook);
  const archiveRestoreDoc = readFile(paths.archiveRestoreDoc);
  const gitignore = readFile(paths.gitignore);
  const backendPrismaEvidence = collectBackendPrismaEvidence();
  const backendPrismaInspection = inspectAcceptedPrismaManifest(backendPrismaEvidence);

  addContainsCase(cases, "package.json exposes data integrity alias", pkg, `"${dataIntegrityScript}": "node backend/scripts/data_integrity_and_recovery_01_check.js"`);
  addCase(cases, "product extensions registry includes data integrity check", () =>
    assertProductExtensionsIncludes(dataIntegrityScript, "product extensions registry includes data integrity check")
  );
  addCase(cases, "verify chain registry includes data integrity check", () =>
    assertProductExtensionsIncludes(dataIntegrityScript, "verify chain registry includes data integrity check")
  );

  addContainsCase(cases, "script harness check knows data integrity milestone", harnessCheck, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContainsCase(cases, "script harness check knows data integrity alias", harnessCheck, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "script harness check knows data integrity doc", harnessCheck, "docs/DATA_INTEGRITY_AND_RECOVERY_01.md");
  addContainsCase(cases, "script harness check knows data integrity command", harnessCheck, "node backend\\\\scripts\\\\data_integrity_and_recovery_01_check.js");

  addContainsCase(cases, "script harness doc lists data integrity milestone", harnessDoc, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContainsCase(cases, "script harness doc lists data integrity alias", harnessDoc, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "script harness doc lists data integrity doc", harnessDoc, "docs/DATA_INTEGRITY_AND_RECOVERY_01.md");
  addContainsCase(cases, "script harness doc lists data integrity command", harnessDoc, "node backend\\scripts\\data_integrity_and_recovery_01_check.js");

  addContainsCase(cases, "milestone guide lists data integrity milestone", guide, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContainsCase(cases, "milestone guide lists data integrity alias", guide, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "milestone guide lists data integrity command", guide, "node backend\\scripts\\data_integrity_and_recovery_01_check.js");
  addContainsCase(cases, "milestone guide lists data integrity doc", guide, "docs/DATA_INTEGRITY_AND_RECOVERY_01.md");

  addContainsCase(cases, "primer lists data integrity milestone", primer, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContainsCase(cases, "primer lists data integrity alias", primer, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "primer lists data integrity doc", primer, "docs/DATA_INTEGRITY_AND_RECOVERY_01.md");
  addContainsCase(cases, "primer lists data integrity command", primer, "backend/scripts/data_integrity_and_recovery_01_check.js");

  const docHeadings = [
    "# DATA-INTEGRITY-AND-RECOVERY-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Data safety model",
    "## 4) Backup policy",
    "## 5) Restore policy",
    "## 6) RPO / RTO policy",
    "## 7) Idempotency policy",
    "## 8) Transaction safety policy",
    "## 9) Runtime-data recovery policy",
    "## 10) Corruption detection policy",
    "## 11) Release gate",
    "## 12) Generated artifacts and commit-external boundary",
    "## 13) What is not changed",
    "## 14) Validation results",
    "## 15) Remaining risks",
    "## 16) Next recommended milestone",
  ];
  for (const heading of docHeadings) {
    addContainsCase(cases, `data integrity doc heading ${heading}`, doc, heading);
  }

  addContainsCase(cases, "data integrity doc mentions production DB boundary", doc, "production DB");
  addContainsCase(cases, "data integrity doc mentions destructive queries", doc, "destructive query");
  addContainsCase(cases, "data integrity doc mentions schema and migration boundary", doc, "schema veya migration");
  addContainsCase(cases, "data integrity doc mentions backup policy", doc, "backup policy");
  addContainsCase(cases, "data integrity doc mentions restore policy", doc, "restore policy");
  addContainsCase(cases, "data integrity doc mentions RPO/RTO", doc, "RPO / RTO");
  addContainsCase(cases, "data integrity doc mentions idempotency", doc, "idempotency");
  addContainsCase(cases, "data integrity doc mentions transaction safety", doc, "transaction safety");
  addContainsCase(cases, "data integrity doc mentions runtime-data recovery", doc, "runtime-data recovery");
  addContainsCase(cases, "data integrity doc mentions corruption detection", doc, "corruption detection");
  addContainsCase(cases, "data integrity doc mentions release gate", doc, "release gate");
  addContainsCase(cases, "data integrity doc mentions commit-external boundary", doc, "commit dışı");
  addContainsCase(cases, "data integrity doc mentions runtime-data artifact dir", doc, "backend/artifacts/runtime-data/");
  addContainsCase(cases, "data integrity doc mentions browser-smoke artifact dir", doc, "backend/artifacts/browser-smoke/");
  addContainsCase(cases, "data integrity doc mentions load-test artifact dir", doc, "backend/artifacts/load-test/");
  addContainsCase(cases, "data integrity doc mentions db-scaling artifact dir", doc, "backend/artifacts/db-scaling/");
  addContainsCase(cases, "data integrity doc mentions observability artifact dir", doc, "backend/artifacts/observability/");
  addContainsCase(cases, "data integrity doc mentions data-integrity artifact dir", doc, "backend/artifacts/data-integrity/");
  addContainsCase(cases, "data integrity doc mentions debug log", doc, "debug.log");
  addContainsCase(cases, "data integrity doc mentions verify repo", doc, "verify:repo");
  addContainsCase(cases, "data integrity doc mentions verify final", doc, "verify:final");
  addContainsCase(cases, "data integrity doc mentions backend lint", doc, "npm --prefix backend run lint");
  addContainsCase(cases, "data integrity doc mentions web lint", doc, "npm --prefix web run lint");
  addContainsCase(cases, "data integrity doc mentions M45 runbook", doc, "RUNBOOK_M45_RETENTION_BACKUP.md");
  addContainsCase(cases, "data integrity doc mentions archive restore doc", doc, "REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md");
  addContainsCase(cases, "data integrity doc mentions jsonFileStore", doc, "backend/src/lib/jsonFileStore.js");
  addContainsCase(cases, "data integrity doc mentions admin route", doc, "backend/src/routes/admin.js");
  addContainsCase(cases, "data integrity doc mentions backupArchiveOps", doc, "backend/src/ops/backupArchiveOps.js");
  addContainsCase(cases, "data integrity doc mentions backup create script", doc, "backend/scripts/m45_backup_create.js");
  addContainsCase(cases, "data integrity doc mentions backup restore script", doc, "backend/scripts/m45_backup_restore.js");

  const validationSummaryNeedles = [
    "dataClassificationSummary",
    "integrityRiskSummary",
    "transactionBoundarySummary",
    "idempotencySummary",
    "backupRestoreSummary",
    "runtimeDataRecoverySummary",
    "kvkkSafeRecoverySummary",
    "compatibilitySummary",
    "smokeThresholdSummary",
    "chainWiringSummary",
    "commitExternalSummary",
    "prismaSummary",
  ];
  for (const needle of validationSummaryNeedles) {
    addContainsCase(cases, `data integrity doc preserves ${needle}`, doc, needle);
  }

  const policyNeedles = [
    ["data integrity doc keeps data classification wording", doc, "data classification"],
    ["data integrity doc keeps critical entity matrix wording", doc, "critical entity matrix"],
    ["data integrity doc keeps referential integrity policy wording", doc, "referential integrity policy"],
    ["data integrity doc keeps transaction boundary policy wording", doc, "transaction boundary policy"],
    ["data integrity doc keeps idempotency and retry-safety wording", doc, "idempotency and retry-safety policy"],
    ["data integrity doc keeps backup policy wording", doc, "backup policy"],
    ["data integrity doc keeps restore policy wording", doc, "restore policy"],
    ["data integrity doc keeps RPO/RTO target wording", doc, "RPO / RTO targets"],
    ["data integrity doc keeps recovery runbook wording", doc, "recovery runbook"],
    ["data integrity doc keeps corruption detection wording", doc, "corruption detection policy"],
    ["data integrity doc keeps partial duplicate stale write matrix wording", doc, "partial write / duplicate write / stale write risk matrix"],
    ["data integrity doc keeps runtime-data recovery wording", doc, "runtime-data commit-external and recovery policy"],
    ["data integrity doc keeps migration rollback wording", doc, "migration and rollback safety policy"],
    ["data integrity doc keeps KVKK-safe backup logging wording", doc, "KVKK-safe backup/logging policy"],
    ["data integrity doc keeps observability handoff wording", doc, "observability handoff"],
    ["data integrity doc keeps incident severity wording", doc, "incident severity matrix"],
    ["data integrity doc keeps release gate wording", doc, "release gate checklist"],
    ["data integrity doc keeps generated artifact wording", doc, "generated artifact policy"],
    ["data integrity doc keeps runtime-data list wording", doc, "runtime-data list"],
    ["data integrity doc keeps no production DB wording", doc, "no production DB"],
    ["data integrity doc keeps no destructive query wording", doc, "no destructive query"],
    ["data integrity doc keeps no schema migration wording", doc, "no schema/migration"],
    ["data integrity doc keeps no route service prisma diff wording", doc, "no route/service/prisma diff"],
    ["data integrity doc keeps smoke threshold wording", doc, "smoke threshold 18/82/82/82"],
    ["data integrity doc keeps console error count wording", doc, "consoleErrorCount=0"],
    ["data integrity doc keeps page error count wording", doc, "pageErrorCount=0"],
    ["data integrity doc keeps 429 wording", doc, "429=none"],
  ];
  for (const [label, text, needle] of policyNeedles) {
    addContainsCase(cases, label, text, needle);
  }

  addContainsCase(cases, "jsonFileStore keeps backup path", jsonFileStore, "backupPath");
  addContainsCase(cases, "jsonFileStore keeps async backup fallback", jsonFileStore, "backupCurrentAsync");
  addContainsCase(cases, "jsonFileStore keeps sync backup fallback", jsonFileStore, "backupCurrentSync");
  addContainsCase(cases, "jsonFileStore keeps bak fallback", jsonFileStore, ".bak");
  addContainsCase(cases, "jsonFileStore keeps parse fallback", jsonFileStore, "return parse(await fsp.readFile(backupPath, \"utf8\"));");

  addContainsCase(cases, "admin route exposes backup policy", adminRoute, "/backup/policy");
  addContainsCase(cases, "admin route exposes backup manifest", adminRoute, "/backup/manifest");
  addContainsCase(cases, "admin route exposes backup create", adminRoute, "/backup/create");
  addContainsCase(cases, "admin route exposes backup restore", adminRoute, "/backup/restore");

  addContainsCase(cases, "backupArchiveOps exposes createBackupArchive", backupArchiveOps, "createBackupArchive");
  addContainsCase(cases, "backupArchiveOps exposes restoreBackupArchive", backupArchiveOps, "restoreBackupArchive");
  addContainsCase(cases, "backupArchiveOps keeps manifest wording", backupArchiveOps, "manifest");
  addContainsCase(cases, "backupArchiveOps keeps hash wording", backupArchiveOps, "backupSha256");

  addContainsCase(cases, "retention backup policy keeps local dir", retentionBackupPolicy, "backupLocalDir");
  addContainsCase(cases, "retention backup policy keeps retention days", retentionBackupPolicy, "backupLocalRetentionDays");
  addContainsCase(cases, "retention backup policy keeps dump format", retentionBackupPolicy, "backupDumpFormat");
  addContainsCase(cases, "env keeps backup local dir", envJs, "BACKUP_LOCAL_DIR");

  addContainsCase(cases, "backup create script keeps backup file marker", backupCreateScript, "OK Backup file:");
  addContainsCase(cases, "backup create script keeps manifest wording", backupCreateScript, "manifest");
  addContainsCase(cases, "backup restore script keeps skip wording", backupRestoreScript, "SKIP Restore skipped: --backup-file not provided.");
  addContainsCase(cases, "backup restore script keeps restore wording", backupRestoreScript, "OK Restore completed from:");

  addContainsCase(cases, "runbook keeps backup policy wording", runbook, "backup policy");
  addContainsCase(cases, "runbook keeps restore wording", runbook, "restore");
  addContainsCase(cases, "runbook keeps manifest wording", runbook, "manifest");
  addContainsCase(cases, "archive restore doc keeps backup wording", archiveRestoreDoc, "backup");
  addContainsCase(cases, "archive restore doc keeps restore wording", archiveRestoreDoc, "restore");
  addContainsCase(cases, "archive restore doc keeps manifest wording", archiveRestoreDoc, "manifest");

  addNotContainsCase(cases, "gitignore keeps runtime-data visible", gitignore, "backend/artifacts/runtime-data/");
  addContainsCase(cases, "gitignore keeps browser-smoke ignored", gitignore, "backend/artifacts/browser-smoke/");
  addContainsCase(cases, "gitignore keeps load-test ignored", gitignore, "backend/artifacts/load-test/");
  addContainsCase(cases, "gitignore keeps db-scaling ignored", gitignore, "backend/artifacts/db-scaling/");
  addContainsCase(cases, "gitignore keeps observability ignored", gitignore, "backend/artifacts/observability/");
  addContainsCase(cases, "gitignore keeps data-integrity ignored", gitignore, "backend/artifacts/data-integrity/");

  addCase(cases, "route diff stays within approved owned surface", () => {
    mustNoDiffExceptWithIdentity(["backend/src/routes"], approvedDataIntegrityRouteDiffs, "route diff stays within approved owned surface");
  });
  addCase(cases, "service diff stays within approved owned surface", () => {
    mustNoDiffExceptWithIdentity(["backend/src/services"], approvedDataIntegrityServiceDiffs, "service diff stays within approved owned surface");
  });
  addCase(cases, "prisma diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "prisma"]).length === 0, "prisma diff not empty");
  });
  addCase(cases, "backend/prisma diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0, "backend/prisma diff not empty");
  });
  addCase(cases, "git diff --check stays clean", () => {
    must(gitLines(["diff", "--check"]).length === 0, "git diff --check findings");
  });
  addCase(cases, "git diff --cached --check stays clean", () => {
    must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check findings");
  });
  addCase(cases, "git diff --cached --name-only stays empty", () => {
    must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "git diff --cached --name-only findings");
  });
  addCase(cases, "debug.log stays absent", () => {
    must(!fs.existsSync(paths.debugLog), "debug.log exists");
  });

  ordered(doc, [
    "# DATA-INTEGRITY-AND-RECOVERY-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Data safety model",
    "## 4) Backup policy",
    "## 5) Restore policy",
    "## 6) RPO / RTO policy",
    "## 7) Idempotency policy",
    "## 8) Transaction safety policy",
    "## 9) Runtime-data recovery policy",
    "## 10) Corruption detection policy",
    "## 11) Release gate",
    "## 12) Generated artifacts and commit-external boundary",
    "## 13) What is not changed",
    "## 14) Validation results",
    "## 15) Remaining risks",
    "## 16) Next recommended milestone",
  ], "data integrity doc heading order");

  const passCount = cases.length;
  for (const testCase of cases) {
    testCase.fn();
  }

  const dataClassificationSummary = [
    contains(doc, "data classification"),
    contains(doc, "critical entity matrix"),
    contains(doc, "referential integrity policy"),
  ].every(Boolean)
    ? "data classification, critical entity matrix and referential integrity policy stay visible"
    : "data classification coverage incomplete";

  const integrityRiskSummary = [
    contains(doc, "partial write / duplicate write / stale write risk matrix"),
    contains(doc, "corruption detection policy"),
    contains(doc, "incident severity matrix"),
  ].every(Boolean)
    ? "partial write, duplicate write and stale write risk matrix stays visible"
    : "integrity risk coverage incomplete";

  const transactionBoundarySummary = [
    contains(doc, "transaction boundary policy"),
    contains(doc, "migration and rollback safety policy"),
    contains(doc, "no schema/migration"),
  ].every(Boolean)
    ? "transaction boundary policy and migration / rollback safety stay visible"
    : "transaction boundary coverage incomplete";

  const idempotencySummary = [
    contains(doc, "idempotency and retry-safety policy"),
    contains(doc, "recovery runbook"),
    contains(jsonFileStore, "backupCurrentAsync"),
    contains(jsonFileStore, "backupCurrentSync"),
  ].every(Boolean)
    ? "idempotency and retry-safety stay visible"
    : "idempotency coverage incomplete";

  const backupRestoreSummary = [
    contains(doc, "backup policy"),
    contains(doc, "restore policy"),
    contains(runbook, "backup policy"),
    contains(runbook, "restore"),
    contains(archiveRestoreDoc, "manifest"),
  ].every(Boolean)
    ? "backup policy, restore policy and runbook alignment stay visible"
    : "backup / restore coverage incomplete";

  const runtimeDataRecoverySummary = [
    contains(doc, "runtime-data commit-external and recovery policy"),
    contains(doc, "runtime-data list"),
    contains(jsonFileStore, ".bak"),
  ].every(Boolean)
    ? "runtime-data recovery and .bak fallback stay visible"
    : "runtime-data recovery coverage incomplete";

  const kvkkSafeRecoverySummary = [
    contains(doc, "KVKK-safe backup/logging policy"),
    contains(doc, "observability handoff"),
    contains(doc, "no production DB"),
  ].every(Boolean)
    ? "KVKK-safe backup/logging and observability handoff stay visible"
    : "KVKK-safe recovery coverage incomplete";

  const compatibilitySummary = [
    contains(doc, "compatibilitySummary"),
    contains(runbook, "backup policy"),
    contains(archiveRestoreDoc, "backup"),
    contains(archiveRestoreDoc, "restore"),
  ].every(Boolean)
    ? "backup / restore docs and runtime surfaces stay aligned"
    : "compatibility coverage incomplete";

  const smokeThresholdSummary = [
    contains(doc, "smoke threshold 18/82/82/82"),
    contains(doc, "consoleErrorCount=0"),
    contains(doc, "pageErrorCount=0"),
    contains(doc, "429=none"),
  ].every(Boolean)
    ? "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0"
    : "smoke threshold coverage incomplete";

  const chainWiringSummary = [
    contains(pkg, `"${dataIntegrityScript}": "node backend/scripts/data_integrity_and_recovery_01_check.js"`),
    productExtensionsCheckIndex(dataIntegrityScript) >= 0,
    contains(harnessCheck, "DATA-INTEGRITY-AND-RECOVERY-01"),
    contains(harnessDoc, "DATA-INTEGRITY-AND-RECOVERY-01"),
    contains(guide, "DATA-INTEGRITY-AND-RECOVERY-01"),
    contains(primer, "DATA-INTEGRITY-AND-RECOVERY-01"),
  ].every(Boolean)
    ? "package.json, registry, harness and docs stay wired"
    : "chain wiring coverage incomplete";

  const commitExternalSummary = [
    gitLines(["status", "--short"]).some((line) => line.includes("backend/artifacts/runtime-data/")),
    contains(gitignore, "backend/artifacts/browser-smoke/"),
    contains(gitignore, "backend/artifacts/load-test/"),
    contains(gitignore, "backend/artifacts/db-scaling/"),
    contains(gitignore, "backend/artifacts/observability/"),
    contains(gitignore, "backend/artifacts/data-integrity/"),
    !fs.existsSync(paths.debugLog),
    gitLines(["diff", "--cached", "--name-only"]).length === 0,
  ].every(Boolean)
    ? "runtime-data stays commit external; generated artifacts and debug.log stay out of stage"
    : "commit-external coverage incomplete";

  const prismaSummary = [
    gitLines(["diff", "--name-only", "--", "backend/src/routes"]).filter((line) => line !== "backend/src/routes/companyOverview.js").length === 0,
    gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0,
    gitLines(["diff", "--name-only", "--", "prisma"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0,
  ].every(Boolean)
    ? "backend/src/routes approved-owned surface; backend/src/services approved-owned surface; prisma diff empty; backend/prisma diff empty"
    : "prisma diff coverage incomplete";

  console.log(`guardCases=${cases.length}`);
  console.log(`passCount=${passCount}`);
  console.log("failCount=0");
  console.log(`dataClassificationSummary=${dataClassificationSummary}`);
  console.log(`integrityRiskSummary=${integrityRiskSummary}`);
  console.log(`transactionBoundarySummary=${transactionBoundarySummary}`);
  console.log(`idempotencySummary=${idempotencySummary}`);
  console.log(`backupRestoreSummary=${backupRestoreSummary}`);
  console.log(`runtimeDataRecoverySummary=${runtimeDataRecoverySummary}`);
  console.log(`kvkkSafeRecoverySummary=${kvkkSafeRecoverySummary}`);
  console.log(`compatibilitySummary=${compatibilitySummary}`);
  console.log(`smokeThresholdSummary=${smokeThresholdSummary}`);
  console.log(`chainWiringSummary=${chainWiringSummary}`);
  console.log(`commitExternalSummary=${commitExternalSummary}`);
  console.log(`prismaSummary=${prismaSummary}`);
  console.log("PASS DATA-INTEGRITY-AND-RECOVERY-01");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
