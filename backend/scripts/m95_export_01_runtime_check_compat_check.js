import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

function includes(text, needle) {
  return String(text || "").includes(needle);
}

function mustIncludes(text, needle, msg) {
  must(includes(text, needle), msg);
}

function readGitIndexTrackedPaths() {
  const indexPath = path.join(repoRoot, ".git", "index");
  if (!fs.existsSync(indexPath)) {
    return [];
  }

  const buffer = fs.readFileSync(indexPath);
  if (buffer.toString("utf8", 0, 4) !== "DIRC") {
    return [];
  }

  const version = buffer.readUInt32BE(4);
  const entryCount = buffer.readUInt32BE(8);
  if (version !== 2 && version !== 3) {
    throw new Error(`FAIL unsupported git index version: ${version}`);
  }

  const tracked = [];
  let offset = 12;
  for (let i = 0; i < entryCount; i++) {
    offset += 62;
    const pathStart = offset;
    while (offset < buffer.length && buffer[offset] !== 0) offset += 1;
    const trackedPath = buffer.toString("utf8", pathStart, offset);
    tracked.push(trackedPath);
    offset += 1;
    while (offset % 8 !== 0) offset += 1;
  }

  return tracked;
}

console.log("=== M95-EXPORT-01 RUNTIME CHECK COMPAT CHECK ===");

const rootPkg = read("package.json");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const gitignore = read(".gitignore");
const e25 = read("backend/scripts/m95_e25_mobile_field_acceptance_check.js");
const e27 = read("backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js");
const state = read("tools/repo_contract_state.json");

mustIncludes(rootPkg, '"check:m95export01": "node backend/scripts/m95_export_01_runtime_check_compat_check.js"', "package.json exposes check:m95export01");
mustIncludes(rootPkg, '"check:m95e25": "node backend/scripts/m95_e25_mobile_field_acceptance_check.js"', "package.json keeps check:m95e25");
mustIncludes(rootPkg, '"check:m95e27": "node backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js"', "package.json keeps check:m95e27");
mustIncludes(rootPkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"', "package.json keeps check:verifychain01");
mustIncludes(rootPkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', "package.json keeps check:product-extensions");
mustIncludes(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "package.json keeps verify:final");

mustIncludes(primer, "M95-EXPORT-01", "primer exposes M95-EXPORT-01 visibility");
mustIncludes(primer, "export zip / runtime check uyumu", "primer describes M95-EXPORT-01");
mustIncludes(primer, "shareable export paketinde runtime JSON yokluğu INFO/SKIP kabul edilir", "primer keeps export/shareable runtime wording");

mustIncludes(registry, "M95-EXPORT-01 - active/next", "registry exposes M95-EXPORT-01 visibility");
mustIncludes(registry, "node backend/scripts/m95_export_01_runtime_check_compat_check.js", "registry keeps M95-EXPORT-01 command");

mustIncludes(guide, "node backend\\scripts\\m95_export_01_runtime_check_compat_check.js", "script guide references check:m95export01");
mustIncludes(guide, "M95-EXPORT-01 — export zip / runtime check uyumu [CHECK]", "script guide has M95-EXPORT-01 section");

mustIncludes(backlog, "M95-EXPORT-01", "backlog exposes M95-EXPORT-01");
mustIncludes(backlog, "VERIFY-CHAIN-01", "backlog keeps VERIFY-CHAIN-01 visible");
mustIncludes(backlog, "shareable export paketinde runtime JSON yokluğunu INFO/SKIP kabul edecek şekilde korunur.", "backlog keeps export/shareable wording");

mustIncludes(gitignore, "artifacts/*", ".gitignore keeps artifacts wildcard exclusion");
mustIncludes(gitignore, "backend/data/*.json", ".gitignore keeps backend data json exclusion");

mustIncludes(e25, "isShareableExportMode", "M95-E25 uses shareable export mode helper");
mustIncludes(e25, "INFO runtime JSON export paketinde beklenmez", "M95-E25 keeps export INFO wording");
mustIncludes(e25, "checkRuntimeArtifact", "M95-E25 uses runtime artifact helper");

mustIncludes(e27, "isShareableExportMode", "M95-E27 uses shareable export mode helper");
mustIncludes(e27, "INFO runtime JSON export paketinde beklenmez", "M95-E27 keeps export INFO wording");
mustIncludes(e27, "checkRuntimeArtifact", "M95-E27 uses runtime artifact helper");

const trackedRuntime = readGitIndexTrackedPaths().filter((trackedPath) =>
  trackedPath.startsWith("backend/artifacts/runtime-data/") ||
  trackedPath.startsWith("artifacts/runtime-data/"),
);
must(trackedRuntime.length === 0, "runtime JSON files are not git-tracked");

mustIncludes(state, '"nextProductMilestone"', "state keeps next product milestone field");
mustIncludes(state, "VERIFY-CHAIN-01", "state keeps VERIFY-CHAIN-01 as next product milestone");
mustIncludes(state, '"recentProductClosures"', "state keeps recent product closures");

console.log("=== M95-EXPORT-01 RUNTIME CHECK COMPAT CHECK PASS ===");
