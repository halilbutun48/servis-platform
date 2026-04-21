import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function normalizeRel(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function convertGlobToRegex(glob) {
  const normalized = normalizeRel(glob);
  let escaped = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  escaped = escaped.replace(/\*\*/g, "__DOUBLE_STAR__");
  escaped = escaped.replace(/\*/g, "[^/]*");
  escaped = escaped.replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function walkFiles(dir, bag = []) {
  if (!fs.existsSync(dir)) return bag;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, bag);
    } else {
      bag.push(normalizeRel(path.relative(repoRoot, full)));
    }
  }
  return bag;
}

function matchExact(relPath, patterns = []) {
  const normalized = normalizeRel(relPath);
  return patterns.find((pattern) => normalized.localeCompare(normalizeRel(pattern), undefined, { sensitivity: "accent" }) === 0) || null;
}

function matchPrefix(relPath, patterns = []) {
  const normalized = normalizeRel(relPath);
  return patterns.find((pattern) => normalized.startsWith(normalizeRel(pattern))) || null;
}

function matchGlob(relPath, patterns = []) {
  const normalized = normalizeRel(relPath);
  return patterns.find((pattern) => convertGlobToRegex(pattern).test(normalized)) || null;
}

function matchRule(relPath, ruleSet = {}) {
  return (
    matchExact(relPath, ruleSet.exactFiles) ||
    matchPrefix(relPath, ruleSet.pathPrefixes) ||
    matchGlob(relPath, ruleSet.globFiles) ||
    null
  );
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const state = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools", "repo_contract_state.json"), "utf8"));
const policy = state.physicalSnapshotHygiene || {};
const reportPath = path.join(repoRoot, normalizeRel(policy.reportPath || "artifacts/repo-audit/physical_snapshot_hygiene_latest.json"));
const reportDir = path.dirname(reportPath);

const allowRules = {
  exactFiles: policy.allowExactFiles || [],
  pathPrefixes: policy.allowPathPrefixes || [],
  globFiles: policy.allowGlobFiles || [],
};
const failRules = {
  exactFiles: policy.hardFailExactFiles || [],
  pathPrefixes: policy.hardFailPathPrefixes || [],
  globFiles: policy.hardFailGlobFiles || [],
};
const warningRules = {
  exactFiles: policy.warningExactFiles || [],
  pathPrefixes: policy.warningPathPrefixes || [],
  globFiles: policy.warningGlobFiles || [],
};

const files = walkFiles(repoRoot);
const results = {
  generatedAt: new Date().toISOString(),
  repoRoot: normalizeRel(repoRoot),
  command: policy.primaryCommand || "npm run verify:snapshot",
  softGate: Boolean(policy.softGate),
  fail: [],
  warning: [],
  allowed: [],
};

for (const relPath of files) {
  const allowedBy = matchRule(relPath, allowRules);
  if (allowedBy) {
    results.allowed.push({ file: relPath, rule: allowedBy });
    continue;
  }

  const failedBy = matchRule(relPath, failRules);
  if (failedBy) {
    results.fail.push({ file: relPath, rule: failedBy });
    continue;
  }

  const warnedBy = matchRule(relPath, warningRules);
  if (warnedBy) {
    results.warning.push({ file: relPath, rule: warnedBy });
  }
}

results.summary = {
  failCount: results.fail.length,
  warningCount: results.warning.length,
  allowedCount: results.allowed.length,
};

ensureDir(reportDir);
fs.writeFileSync(reportPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

console.log("=== M90C.10 PHYSICAL SNAPSHOT HYGIENE CHECK ===");
console.log(`INFO soft gate mode: ${results.softGate ? "ON" : "OFF"}`);
console.log(`INFO fail findings: ${results.summary.failCount}`);
console.log(`INFO warning findings: ${results.summary.warningCount}`);
console.log(`INFO allowlisted matches: ${results.summary.allowedCount}`);
console.log(`INFO report: ${normalizeRel(path.relative(repoRoot, reportPath))}`);

const preview = (items) => items.slice(0, 8).map((item) => `${item.file} <= ${item.rule}`);

if (results.fail.length > 0) {
  console.log("FAIL CLASSIFIED FINDINGS");
  for (const line of preview(results.fail)) console.log(` - ${line}`);
}

if (results.warning.length > 0) {
  console.log("WARNING CLASSIFIED FINDINGS");
  for (const line of preview(results.warning)) console.log(` - ${line}`);
}

if (results.softGate) {
  console.log("M90C.10 PHYSICAL SNAPSHOT HYGIENE SOFT-GATE PASS");
} else if (results.fail.length > 0) {
  process.exit(1);
} else {
  console.log("M90C.10 PHYSICAL SNAPSHOT HYGIENE CHECK PASS");
}
