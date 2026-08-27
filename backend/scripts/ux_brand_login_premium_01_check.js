#!/usr/bin/env node

import { CANONICAL_PRISMA_SCHEMA_PATH as ACCEPTED_SCHEMA_PATH, CANONICAL_PRISMA_SCHEMA_RAW_SHA256 as ACCEPTED_SCHEMA_SHA256 } from "./lib/prismaSchemaIdentity.js";

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { assertProductExtensionsOrder, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";
import {
  APP_JSX_ROLE_TENANT_SCOPE_PATHS,
  BATCH10_DOC_WORKTREE_CLOSURE_PATHS,
  BATCH11_INDEX_WORKTREE_SCOPE_PATHS,
  isM80M89ContractSweepRepoContractPath,
  mustNoDiffExceptWithIdentity,
} from "./lib/guardGitScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(cond, label) {
  if (!cond) fail(label);
  ok(label);
}

function mustContains(text, needle, label) {
  must(String(text).includes(needle), label);
}

function mustNotContains(text, needle, label) {
  must(!String(text).includes(needle), label);
}

function ordered(text, needles, label) {
  const source = String(text || "");
  let cursor = 0;
  for (const needle of needles) {
    const idx = source.indexOf(needle, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + needle.length;
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

function statusNames() {
  const out = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.slice(3).replace(/\\/g, "/").trim())
    .filter(Boolean);
}

function stagedNames() {
  return gitLines(["diff", "--cached", "--name-only"]).map((line) => line.replace(/\\/g, "/"));
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function mustNotList(files, needle, label) {
  const normalizedNeedle = String(needle || "").replace(/\\/g, "/");
  if (files.some((file) => file.includes(normalizedNeedle))) fail(label);
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
    .map((line) => line.trimEnd())
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
  const wanted = String(expectedHash || "").toUpperCase();
  if (actual !== wanted) fail(`${label}: ${actual} != ${wanted}`);
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
  must(actual === wanted, `${label}: ${actual} != ${wanted}`);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`${label}: not an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") fail(`${label}: unexpected contents=${entries.join(", ")}`);
  ok(label);
}

const APPROVED_TERMINOLOGY_PRESENTATION = [
  { path: "backend/src/ai/jobGuide/levels.js", sha256: "5E75C97EEB12975244E4634DDA4AFF9F3016DA7FAC9732756CEB4035569259AB" },
  { path: "mobile/src/screens/ParentActivationCard.js", sha256: "84FD1481A050B5757C8FA54BAED869B46EC4B15BB86F20017BD7C33DDA914E5E" },
  { path: "web/src/components/PaymentReadinessReadonlyCard.jsx", sha256: "DCFA5652EF4B23A2E4BDA052EB1492FCBD4001DFC5CEF53F43BE9F2063D237EC" },
  { path: "web/src/panels/driver/CheckinPanel.jsx", sha256: "7737404647D0FCE22198BFA3A143DC185702E98FEC5AAEA00DBFBFA13C357FDB" },
  { path: "web/src/panels/organization/PlansPanel.jsx", sha256: "EF3A8A027E833B6534FCA788F274B96CB2A367688FA059E6F42D0512E40F4D8A" },
  { path: "web/src/panels/organization/organizationPlansShared.jsx", sha256: "4BC15C534A9399FFBB56C31AE256DAA5339D792CCB37A3211519DCE9E19D572C" },
  { path: "web/src/panels/public/PassengerLivePanel.jsx", sha256: "79E4AEAF56B106F966E923701CD07B85A97C8959A47F477872426B60F91944DF" },
  { path: "web/src/panels/company/CheckinPanel.jsx", sha256: "EE5AFE21578A32E69AA8748E38A1976329EE98088EDBFA0449625A957B9C9588" },
  { path: "web/src/panels/company/GeoReviewPanel.jsx", sha256: "D283A0EB5722232669AE9D9D63EE77A9A52567751E517ACDB1035C286FBF76F8" },
  { path: "web/src/panels/company/HubPanel.jsx", sha256: "68E237BA03F6DA83A91C49EAE170BEB3D6F398A6882417A17AFAF8376AAE359E" },
  { path: "web/src/panels/company/ServiceEvaluationPanel.jsx", sha256: "BBEA2130687645E8ADE39EC3559F0A9C61E6FAEE8A74E7AEEAB47DBAD641E59C" },
  { path: "web/src/panels/company/ShiftTemplatesPanel.jsx", sha256: "934055EEB7407E6AEA43566302A6FFB9689E445A7771AC1C41F6217689A0673E" },
  { path: "web/src/panels/company/ShiftsPanel.jsx", sha256: "9C37254ACA2907EA15C575BD91D5A020DE27991F0BCC1FC1FA62179165368BF5" },
  { path: "web/src/panels/company/companyShiftsPanelActions.js", sha256: "BA93A4ADE7F75C6B575A3BCC2B3188CA01166B5746B7F4DCC7CEA9223E34D218" },
  { path: "web/src/panels/company/companyShiftsPanelFilters.jsx", sha256: "2606B60E3524B61287C619D4587CE28E137B4E1FAE0249E5ACCC48FEAC86C9B4" },
  { path: "web/src/panels/company/planBuilderPanelActions.js", sha256: "9897F8A0D0F48AD04E1A188F86E7573B257E3EC3DE44637E92A7E5855F122AB8" },
  { path: "web/src/panels/company/planBuilderPanelSections.jsx", sha256: "B6C0BC2E56DCD8C932F8D7F63BBAE4166E234C13059B7651A8B75D68A380E855" },
  { path: "web/src/panels/company/shiftsPanelOfferUtils.js", sha256: "A4979AD7BD0B3CAFA40D7DF750262CB985B04A589E264967FBF7AEBE41030B88" },
  { path: "web/src/panels/organization/CenterPanel.jsx", sha256: "AA242BEB3D7E8B4CC64EE2685E0014832288E4EDE4EE931D63BDC405C8427DE0" },
  { path: "web/src/panels/public/PublicLandingPage.jsx", sha256: "0C5C4FA0BD3239D86466BCC032FF693C946040B9940C1606D7F361C977FDBBD2" },
  { path: "web/src/panels/room/HubPanel.jsx", sha256: "5D862BDA535D75AB91F788C63D9AD9B0F33DEB93BC288162D62E3F7845BA0C4E" },
  { path: "web/src/panels/room/roomShiftsMainSections.jsx", sha256: "54492ACB7BDA42CBD10122A5891C6D12E44B271C06CF0B9B7ACD45F37D6FB854" },
  { path: "web/src/panels/room/roomShiftsPanelCards.jsx", sha256: "676EBDF58A97169715581AC857EB51DEA3280BE6DD9CE26D1A363F4C3B059BDF" },
  { path: "web/src/panels/room/roomShiftsPanelMobileCards.jsx", sha256: "012306CE28A65467D41605957CE82006374386301FA82594F32626C7A7F24878" },
  { path: "web/src/panels/room/roomShiftsPanelRows.jsx", sha256: "1A5FF81F47851A7EB44AA20E55BEEDE70F5F5275D68CBB4BFDEF8E87CE702549" },
  { path: "web/src/panels/room/roomShiftsPanelUtils.js", sha256: "F75CE13DF998CEF7C100CD315F9C1196674671B289289D3598B88795077F2078" },
  { path: "web/src/panels/shared/KvkkPanel.jsx", sha256: "DA76C50480A5FE02FD12CDDC34707E2E213831117ED00268AFA31AA2BD60A653" },
  { path: "web/src/panels/shared/NotificationsPanel.jsx", sha256: "99FEA93C853E268B36938E3A16F12E88DCBDAA9D450AF56FDB68870711991BF6" },
  { path: "web/src/panels/shared/PlatformFeePreviewCard.jsx", sha256: "552FCB7B157D01E32E0FF38057097F7D7FD137BF9C11038F107345672DEDC829" },
  { path: "web/src/panels/shared/ReportsPanel.jsx", sha256: "1C887505BA91EDA5310D70A71B3CA50B9952F22D42F08C0318142717740BB9C4" },
  { path: "web/src/panels/shared/TotpStepUpCard.jsx", sha256: "21ACB25DB2AFF07643D401AC5C1E16F9E3E2AC0CF028610D895AC38786F48998" },
  { path: "web/src/panels/shared/boardingChangeUi.js", sha256: "01A06C914530EFE950F9FA0E22BE39A411D69C065C226416E4B73E426FF3D175" },
  { path: "web/src/panels/shared/operationsDigestUtils.js", sha256: "7C5921796E17B9708151EA7954FD9B4438591701962588C9DFE98A9F83383DF8" },
  { path: "web/src/panels/superadmin/AuditLogsPanel.jsx", sha256: "2F839DAB142DAEF2BEC4BDD4E6667F4836CCE6E9A44568AFDC8CE555931634FE" },
  { path: "web/src/panels/superadmin/CommercialCorePanel.jsx", sha256: "3A0392D66E6AF3AAA70DEC456A435B0A78A4828EDB9FF11F1554F1E0FB13E123" },
  { path: "web/src/panels/superadmin/commercialCorePanelShared.jsx", sha256: "9FAE47E7E24DB70A0ADB6F89E41C1BABD8868FDEF9A690CFEAE9D64F8CC9896D" },
  { path: "web/src/lib/markers/vehicleMarkerC.js", sha256: "8C7EA82D00D4E0C9A8D823855629292B894937D60545FBC1C428D0373550B964" },
  { path: "web/src/panels/driver/TodayPanel.jsx", sha256: "ACB5EB64D24F958A725D751EBE2F1DDAA2F6818D50605B0849F55CB828E11F02" },
];
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
  console.log("=== UX-BRAND-LOGIN-PREMIUM-01 CHECK ===");

  const pkg = read("package.json");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_BRAND_LOGIN_PREMIUM_01.md");
  const app = read(APP_JSX_ROLE_TENANT_SCOPE_PATHS[0]);
  const appShell = read("web/src/layout/AppShell.jsx");
  const navDock = read("web/src/layout/NavDock.jsx");
  const brandMark = read("web/src/components/BrandMark.jsx");
  const brandComponent = read("web/src/components/brand/SeferPaktLogo.jsx");
  const css = read("web/src/index.css");
  const favicon = read("web/public/vardis-favicon.svg");
  const logoSvg = read("web/public/vardis-logo.svg");
  const indexHtml = read("web/index.html");

  must(exists("backend/scripts/ux_brand_login_premium_01_check.js"), "brand/login premium check exists");
  must(exists("docs/UX_BRAND_LOGIN_PREMIUM_01.md"), "brand/login premium doc exists");
  must(exists("web/public/seferpakt-lockup.png"), "lockup asset exists");
  must(exists("web/public/seferpakt-app-icon.png"), "app icon asset exists");
  must(exists("web/public/seferpakt-favicon.png"), "favicon asset exists");
  mustFileSha256(
    "backend/scripts/lib/currentHeadScopePolicy.js",
    "92FC2E86B735C730F27E033AF15C0A6A759EFE936E4B7724A9C9309E0D01F103",
    "current-head policy snapshot remains pinned"
  );

  must(pkg.includes('"check:uxbrandloginpremium01": "node backend/scripts/ux_brand_login_premium_01_check.js"'), "package.json exposes brand/login premium check");
  assertProductExtensionsOrder(
    ["check:uxnav01", "check:uxbrandloginpremium01", "check:uxmobilewebshellclarity01"],
    "product extensions registry keeps brand/login premium between nav and mobile shell clarity",
    registryScripts
  );

  mustContains(harnessCheck, "UX-BRAND-LOGIN-PREMIUM-01", "script harness check knows brand/login premium milestone");
  mustContains(harnessCheck, "check:uxbrandloginpremium01", "script harness check knows brand/login premium alias");
  mustContains(harnessCheck, "docs/UX_BRAND_LOGIN_PREMIUM_01.md", "script harness check knows brand/login premium doc");
  mustContains(harnessDoc, "UX-BRAND-LOGIN-PREMIUM-01", "script harness doc lists brand/login premium milestone");
  mustContains(harnessDoc, "check:uxbrandloginpremium01", "script harness doc lists brand/login premium alias");
  mustContains(harnessDoc, "docs/UX_BRAND_LOGIN_PREMIUM_01.md", "script harness doc lists brand/login premium doc");
  mustContains(guide, "UX-BRAND-LOGIN-PREMIUM-01", "milestone guide mentions brand/login premium milestone");
  mustContains(guide, "check:uxbrandloginpremium01", "milestone guide exposes brand/login premium check");
  mustContains(guide, "node backend\\scripts\\ux_brand_login_premium_01_check.js", "milestone guide includes brand/login premium command");
  mustContains(guide, "docs/UX_BRAND_LOGIN_PREMIUM_01.md", "milestone guide includes brand/login premium doc");

  mustContains(doc, "UX-BRAND-LOGIN-PREMIUM-01", "brand/login premium doc title present");
  mustContains(doc, "SeferPaktLogo", "brand/login premium doc mentions SeferPaktLogo");
  mustContains(doc, "authDemoDetails", "brand/login premium doc keeps demo details wording");
  mustContains(doc, "authHeroCard", "brand/login premium doc keeps hero card wording");
  mustContains(doc, "authPanelCard", "brand/login premium doc keeps panel card wording");
  mustContains(doc, "SP + kalkan + iş birliği", "brand/login premium doc keeps logo direction wording");
  mustContains(doc, "sağ yukarı ok", "brand/login premium doc keeps arrow direction wording");
  mustContains(doc, "Demo erişim bilgileri", "brand/login premium doc keeps demo details wording");
  mustContains(doc, "brand component", "brand/login premium doc keeps brand component wording");
  mustContains(doc, "favicon", "brand/login premium doc keeps favicon wording");
  mustContains(doc, "desktop", "brand/login premium doc keeps desktop wording");
  mustContains(doc, "mobile", "brand/login premium doc keeps mobile wording");
  mustContains(doc, "seferpakt-lockup.png", "brand/login premium doc mentions lockup asset");
  mustContains(doc, "seferpakt-app-icon.png", "brand/login premium doc mentions app icon asset");
  mustContains(doc, "seferpakt-favicon.png", "brand/login premium doc mentions favicon asset");
  mustContains(doc, "kırpılmış gerçek asset", "brand/login premium doc keeps cropped asset wording");
  mustContains(doc, "runtime-data", "brand/login premium doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "brand/login premium doc keeps browser-smoke boundary");
  mustContains(doc, "Backend route/service davranışı değiştirilmez", "brand/login premium doc keeps backend boundary wording");
  mustContains(doc, "Prisma", "brand/login premium doc keeps prisma boundary wording");

  mustContains(brandComponent, "seferpakt-lockup.png", "brand component file uses lockup asset");
  mustContains(brandComponent, "seferpakt-app-icon.png", "brand component file uses app icon asset");
  mustContains(brandComponent, "variant === \"mark\"", "brand component file keeps mark variant");
  mustContains(brandComponent, "variant === \"login\"", "brand component file keeps login variant");
  mustContains(brandComponent, "variant === \"compact\"", "brand component file keeps compact variant");
  mustContains(brandComponent, "variant === \"full\"", "brand component file keeps full variant");
  mustNotContains(brandComponent, "ShieldMark", "brand component no longer hand-draws shield mark");
  mustNotContains(brandComponent, "linearGradient", "brand component no longer defines gradients");
  mustNotContains(brandComponent, "strokeWidth=\"11\"", "brand component no longer hand-draws the old arrow/handshake paths");

  mustContains(brandMark, "SeferPaktLogo", "brand mark wrapper uses SeferPaktLogo");
  mustNotContains(brandMark, "/vardis-logo.svg", "brand mark wrapper no longer uses legacy raster wrapper directly");

  mustContains(app, 'variant="login"', "login screen uses login brand variant");
  mustContains(app, "authShell", "login screen keeps auth shell layout");
  mustContains(app, "authHeroCard", "login screen keeps hero card");
  mustContains(app, "authPanelCard", "login screen keeps panel card");
  mustContains(app, "authHighlightsGrid", "login screen keeps hero highlights grid");
  mustContains(app, "authDemoDetails", "login screen keeps collapsible demo details");
  mustContains(app, "Demo erişim bilgileri", "login screen keeps demo summary");
  mustContains(app, "LOGIN_HIGHLIGHTS", "login screen keeps value proposition copy");
  mustContains(app, "SeferPakt", "login screen keeps SeferPakt copy");

  mustContains(appShell, "BrandMark compact", "app shell keeps compact brand block");
  mustContains(appShell, "shellTopBrand", "app shell keeps top brand area");
  mustContains(navDock, "BrandMark compact", "nav dock keeps compact brand block");
  mustContains(navDock, "navDockBrand", "nav dock keeps brand area");

  mustContains(css, ".seferpaktLogo", "index.css defines brand container");
  mustContains(css, ".seferpaktLogoAsset", "index.css defines brand asset class");
  mustContains(css, ".seferpaktLogoSubtitle", "index.css defines brand subtitle class");
  mustContains(css, ".authShell", "index.css defines auth shell");
  mustContains(css, ".authHeroCard", "index.css defines auth hero card");
  mustContains(css, ".authPanelCard", "index.css defines auth panel card");
  mustContains(css, ".authHeroTitle", "index.css defines auth hero title");
  mustContains(css, ".authHighlightsGrid", "index.css defines auth highlights grid");
  mustContains(css, ".authDemoDetails", "index.css defines auth demo details");
  mustContains(css, ".authSubmit", "index.css defines auth submit button");
  mustContains(css, ".authError", "index.css defines auth error block");

  mustContains(favicon, "seferpakt-favicon.png", "favicon wrapper uses cropped favicon asset");
  mustContains(logoSvg, "seferpakt-lockup.png", "logo wrapper uses cropped lockup asset");
  mustContains(indexHtml, "/vardis-favicon.svg", "index html keeps favicon reference");

  const staged = stagedNames();
  must(staged.length === 0, "stage remains empty");

  const status = statusNames();
  const exactAllowed = new Set([
    ...APPROVED_TERMINOLOGY_PRESENTATION.map((entry) => entry.path),
    "backend/scripts/ai03b_semantic_visible_audit_01_check.js",
    "backend/scripts/copilot_context_memory_task_state_01_check.js",
    "backend/src/ai/chat/conversationTaskState.js",
    "backend/src/ai/chat/conversationTaskStateResponses.js",
    "backend/src/ai/chat/conversationTaskStateShared.js",
    "backend/src/ai/chat/conversationTaskStateClarifiers.js",
    "backend/src/ai/chat/conversationTaskStateSelectedRecord.js",
    "backend/src/ai/chat/conversationTaskStateFollowUps.js",
    "backend/src/ai/chat/conversationTaskStateBuilders.js",
    "backend/src/ai/chat/conversationTaskStateCompanyReplies.js",
    "backend/src/ai/chat/conversationTaskStateRoomReplies.js",
    "backend/src/ai/chat/screenStateAnalyzer.js",
    "backend/src/ai/jobGuide/screenCatalog.roomCompany.js",
    "backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js",
    "docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    ".gitignore",
    "backend/scripts/load_test_2000_users_01_check.js",
    "backend/scripts/load_test_2000_users_01_harness.js",
    "docs/LOAD_TEST_2000_USERS_01.md",
    "backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/onboarding_review_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/ONBOARDING_REVIEW_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md",
    "docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md",
    "backend/scripts/sefer_abi_reasoning_assistant_01_check.js",
    "backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js",
    "backend/src/ai/chat/seferAbiReasoningAssistant.js",
    "backend/src/ai/chat/conversationTaskStateDynamicQuestions.js",
    "docs/SEFER_ABI_REASONING_ASSISTANT_01.md",
    "docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md",
    "docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md",
    "backend/scripts/copilot_smart_diagnostic_engine_01_check.js",
    "backend/src/ai/chat/conversationSmartDiagnostics.js",
    "docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md",
    "tools/PRIMER_SNAPSHOT.md",
    "package.json",
    ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
    "mobile/src/app/kvkkVisibilityMatrixState.js",
    "mobile/src/app/notificationState.js",
    "mobile/src/lib/roleSurface.js",
    "mobile/src/screens/DriverAvailabilityCard.js",
    "mobile/src/screens/DriverTaskSummaryCard.js",
    "web/src/components/PanelFeedbackEntryCard.jsx",
    "web/src/components/PaymentPreviewReadonlyCard.jsx",
    "web/src/components/ProviderScoreBadge.jsx",
    "web/src/components/ShiftReassignModal.jsx",
    "web/src/components/TabletOpsQuickBar.jsx",
    "web/src/components/public/PublicLeadCaptureModal.jsx",
    "web/src/layout/AppShell.jsx",
    "web/src/panels/company/AgreementWizard.jsx",
    "web/src/panels/company/CompanyShiftsPanelIntro.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/companyAgreementsOverviewSection.jsx",
    "web/src/panels/company/companyShiftsPanelMobileCards.jsx",
    "web/src/panels/company/companyShiftsPanelRows.jsx",
    "web/src/panels/company/companyShiftsPanelSummaryCells.jsx",
    "web/src/panels/personel/MyRidePanel.jsx",
    "web/src/panels/room/CheckinPanel.jsx",
    "web/src/panels/room/roomAgreementsPanelSections.jsx",
    "web/src/panels/room/roomOperationsBoard.jsx",
    "web/src/panels/shared/AgreementRouteChangePreviewCard.jsx",
    "web/src/panels/shared/BoardingChangeRequestEntryCard.jsx",
    "web/src/panels/shared/CopilotPanel.jsx",
    "web/src/panels/superadmin/CompaniesPanel.jsx",
    "web/src/panels/superadmin/RegionsPanel.jsx",
    "web/src/panels/superadmin/RoomsPanel.jsx",
    "web/src/panels/superadmin/UsersPanel.jsx",
    "web/src/components/BrandMark.jsx",
    "web/src/components/brand/SeferPaktLogo.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/RoutePreviewModal.jsx",
    "web/src/components/geo/GeoLocationPicker.jsx",
    "web/src/components/geo/HubMapPicker.jsx",
    "web/src/components/map/MapView.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/components/map/mapTileAssets.js",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "backend/scripts/copilot_stop_route_draft_01_check.js",
    "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
    "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
    "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js",
    "docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md",
    "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
    "backend/src/ai/chat/excelToRouteReadinessRedteamPack.js",
    "docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md",
    "backend/scripts/copilot_clarifying_question_engine_01_check.js",
    "docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md",
    "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/WorkflowPanel.jsx",
    "web/src/panels/company/companyShiftsPanelCards.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/company/PersonelAccessPanel.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/index.css",
    "web/public/vardis-favicon.svg",
    "web/public/vardis-logo.svg",
    "web/public/seferpakt-lockup.png",
    "web/public/seferpakt-app-icon.png",
    "web/public/seferpakt-favicon.png",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
    "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/copilot_dynamic_question_engine_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_zero_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/sefer_abi_terminal_humanize_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/SAFE_DRIVE_01.md",
    "docs/OFFER_RANKING_QUALITY_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_SMOKE_PASS_MINUS_ZERO_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "web/src/copilot/screenRegistry.js",
    "web/src/layout/NavDock.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/OffersPanel.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsPanelWorkflow.js",
    "web/src/panels/room/roomVehiclesPanelActions.js",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/room/OperationHealthPanel.jsx",
    "web/src/panels/room/roomShiftsPanelActions.js",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/panels/driver/MapPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/shared/SafeDriveSummaryCard.jsx",
    "web/src/panels/shared/OfferQualityRankingCard.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/shared/KvkkConsentGate.jsx",
    "web/src/utils/safeDriveSummary.js",
    "web/src/utils/offerQualityRanking.js",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "tools/repo_contract_state.json",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/bug_route_impact_preview_button_01_check.js",
    "backend/scripts/copilot_reasoning_answer_composer_01_check.js",
    "backend/src/ai/chat/copilotReasoningAnswerComposer.js",
    "backend/src/ai/schemas.js",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/scripts/bug_route_impact_preview_button_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/plan_center_guided_flow_persistence_01_check.js",
    "web/src/components/copilot/FloatingCopilotDrawer.jsx",
    "web/src/components/copilot/uiSurface.js",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/GuidedPlanModal.jsx",
    "web/src/panels/company/ShiftPeopleTab.jsx",
    "web/src/panels/company/guidedPlanModalActions.js",
    "web/src/panels/company/guidedPlanModalCards.jsx",
    "web/src/panels/company/guidedPlanModalDestinationCards.jsx",
    "web/src/panels/company/guidedPlanModalPeopleStep.jsx",
    "web/src/panels/company/guidedPlanModalPlanCards.jsx",
    "web/src/panels/company/guidedPlanModalSections.jsx",
    "web/src/panels/company/guidedPlanModalShell.jsx",
    "web/src/panels/company/guidedPlanModalUtils.js",
    "web/src/panels/company/shiftPeopleTabActions.js",
    "web/src/panels/company/shiftPeopleTabSections.jsx",
    "web/src/utils/planCenterOverlayLayer.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/scripts/copilot_role_task_matrix_01_check.js",
    "backend/scripts/copilot_ai_action_roadmap_01_check.js",
    "backend/src/ai/chat/copilotRoleTaskMatrix.js",
    "backend/src/ai/chat/copilotAiActionRoadmap.js",
    "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
    "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
    "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
    "backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js",
    "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js",
    "backend/src/ai/chat/answerQualityPolicy.js",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/intentRouter.js",
    "backend/src/ai/chat/intentRouterCore.js",
    "backend/src/ai/chat/conversationRootCauseEngine.js",
    "backend/src/ai/chat/conversationRiskScoringEngine.js",
    "backend/src/ai/chat/copilotGuidedTaskEngine.js",
    "backend/src/ai/chat/goldenQuestionPack.js",
    "backend/src/ai/chat/qualityScorer.js",
    "backend/scripts/copilot_guided_task_engine_01_check.js",
    "backend/scripts/copilot_root_cause_engine_01_check.js",
    "backend/scripts/copilot_risk_scoring_engine_01_check.js",
    "docs/COPILOT_GUIDED_TASK_ENGINE_01.md",
    "docs/COPILOT_ROOT_CAUSE_ENGINE_01.md",
    "docs/COPILOT_RISK_SCORING_ENGINE_01.md",
    "web/src/panels/company/companyAgreementsBridgeSection.jsx",
    "web/src/panels/company/companyAgreementsPanelHelpers.js",
    "web/src/panels/room/roomAgreementsBridgeSection.jsx",
    "web/src/panels/room/roomAgreementsPanelHelpers.js",
    "web/src/utils/uiDataCache.js",
    "backend/src/utils/responseCache.js",
    "backend/src/bootstrap/routeMounts.js",
    "backend/src/server.js",
    "web/src/api.js",
    { path: "backend/src/routes/dashboardBulk.js", sha256: "C1FA734271C1B3FF73CA3393B781EAF966710A66AD57BC31290B829CFFF5754F" },
    { path: "backend/src/routes/companyOverview.js", sha256: "EB2E7956FD7C02891687815D389AB9E9C5374CAB2FD684E2ADE7CE42C83F8528" },
    { path: "backend/src/services/dashboardBulk.js", sha256: "07C4CBADCB6DF266FA981A0089F5E80E80A0659C646E040148BB1E62B8D78751" },
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/room/OperationHealthPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/shared/FinancialOperationsPanel.jsx",
    "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    "web/src/panels/shared/ExternalReferenceCard.jsx",
    "web/src/panels/shared/financialOperationsPresentation.js",
    { path: "web/src/panels/shared/financialOperationsPresentation.js", sha256: "A6DBDE150443AE56D5C4B009F9E6BBE8A8CFF72FC5FCC9EDD293F45B8EA7612A" },
  ]);

  mustAcceptedPrismaManifest();
  const statusWithoutAcceptedPrisma = status.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file)));
  const approvedConcurrentBackendDiff = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF;
  const approvedConcurrentBackendPaths = new Set(approvedConcurrentBackendDiff.map((entry) => normalizePath(entry.path)));
  const statusWithoutApprovedConcurrent = statusWithoutAcceptedPrisma.filter((file) => !approvedConcurrentBackendPaths.has(normalizePath(file)));
  const statusWithinBrandLoginScope = statusWithoutApprovedConcurrent.filter((file) => {
    const normalized = normalizePath(file);
    if (isM80M89ContractSweepRepoContractPath(normalized)) {
      return false;
    }
    return !new Set([
      "backend/README.md",
      "backend/package.json",
      "backend/src/bootstrap/rateLimits.js",
      "backend/src/ops/trustQualityManifest.js",
      "backend/src/lib/requestUrl.js",
      "backend/src/middleware/apiRequestLog.js",
      "backend/src/middleware/asyncHandler.js",
      "infra/docker-compose.yml",
      ...BATCH10_DOC_WORKTREE_CLOSURE_PATHS,
      ...BATCH11_INDEX_WORKTREE_SCOPE_PATHS,
    ]).has(normalized);
  });
  allWithin(statusWithinBrandLoginScope, exactAllowed, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/", "backend/scripts/", "backend/src/ai/chat/", "backend/src/finance/", "web/src/utils/", "docs/"], "working tree stays within brand/login premium scope");
  mustNoDiffExceptWithIdentity(
    APPROVED_TERMINOLOGY_PRESENTATION.map((entry) => entry.path),
    APPROVED_TERMINOLOGY_PRESENTATION,
    "terminology presentation diff stays within approved identities"
  );
  mustNoDiffExceptWithIdentity(["backend/src/routes", "backend/src/services"], approvedConcurrentBackendDiff, "approved NEW-01 backend diff is identity-locked");
  mustNotList(statusWithoutApprovedConcurrent.filter((file) => file !== "backend/src/routes/dashboardBulk.js" && file !== "backend/src/routes/companyOverview.js" && file !== "backend/src/services/dashboardBulk.js"), "backend/src/routes/", "backend routes are untouched");
  mustNotList(statusWithoutApprovedConcurrent.filter((file) => file !== "backend/src/routes/dashboardBulk.js" && file !== "backend/src/services/dashboardBulk.js"), "backend/src/services/", "backend services are untouched");
  mustNotList(statusWithoutAcceptedPrisma, "prisma/", "schema/migration files are untouched");
  mustNotList(statusWithoutAcceptedPrisma, "backend/prisma/", "backend schema/migration files are untouched");
  mustNotList(status, "debug.log", "debug.log is untouched");
  must(!status.some((file) => file.includes("24152(4).png")), "reference screenshot is not committed");

  console.log("=== UX-BRAND-LOGIN-PREMIUM-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
