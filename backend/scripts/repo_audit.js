import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const args = process.argv.slice(2);
const strict = args.includes("--strict");

function argValue(name, fallback) {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return fallback;
}

const reportDir = path.resolve(repoRoot, argValue("--report-dir", path.join("artifacts", "repo-audit")));
const reportPath = path.resolve(reportDir, argValue("--json-out", "repo_audit_latest.json"));

const allowedTextExt = new Set([
  ".ps1", ".js", ".cjs", ".mjs", ".jsx", ".ts", ".tsx", ".md", ".json", ".yml", ".yaml", ".html", ".css"
]);

const skipDirNames = new Set([
  ".git", "node_modules", "artifacts", ".next", "dist", "build", "coverage", "_archive", "_backup"
]);
const skipDirPatterns = [
  /^_/i,
  /^overlay_/i,
];

function norm(p) {
  return p.replace(/\\/g, "/");
}

function shouldSkipDir(name) {
  return skipDirNames.has(name) || skipDirPatterns.some((rx) => rx.test(name));
}

const exactDuplicateIgnore = new Set([
  "docs/CHECKLIST_SSOT.md||tools/CHECKLIST_SSOT.md",
  "docs/PRIMER_SSOT.md||tools/PRIMER_SNAPSHOT.md"
]);

function rel(p) {
  return norm(path.relative(repoRoot, p));
}

function sha1(buf) {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function walk(dir, bag = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldSkipDir(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, bag);
    } else {
      bag.push(full);
    }
  }
  return bag;
}

function readUtf8(p) {
  return fs.readFileSync(p, "utf8");
}

function normalizePwsh(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/g, "").trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/["'][^"']*["']/g, '"STR"')
        .replace(/\bM\d+(?:\.\d+)?\b/gi, "MXX")
        .replace(/\bm\d+(?:[_\.]\d+)?(?:check)?\b/gi, "mxx")
        .replace(/\d+/g, "0")
    )
    .join("\n");
}

function normalizeJs(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*/g, "").trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '"STR"')
        .replace(/\bM\d+(?:\.\d+)?\b/gi, "MXX")
        .replace(/\bm\d+(?:[_\.]\d+)?(?:check)?\b/gi, "mxx")
        .replace(/\d+/g, "0")
    )
    .join("\n");
}

function groupByNormalized(paths, normalizeFn) {
  const map = new Map();
  for (const p of paths) {
    const key = sha1(Buffer.from(normalizeFn(readUtf8(p)), "utf8"));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(rel(p));
  }
  return [...map.values()].filter((group) => group.length > 1).sort((a, b) => b.length - a.length);
}

function basenameReferenced(targetRel, textMap) {
  const base = path.basename(targetRel);
  for (const [fileRel, text] of textMap.entries()) {
    if (fileRel === targetRel) continue;
    if (fileRel === "backend/scripts/repo_audit.js") continue;
    if (text.includes(base)) return true;
  }
  return false;
}

const allFiles = walk(repoRoot);
const textFiles = allFiles.filter((p) => allowedTextExt.has(path.extname(p).toLowerCase()));
const textMap = new Map(textFiles.map((p) => [rel(p), readUtf8(p)]));

const exactByHash = new Map();
for (const p of textFiles) {
  const key = sha1(fs.readFileSync(p));
  if (!exactByHash.has(key)) exactByHash.set(key, []);
  exactByHash.get(key).push(rel(p));
}

const exactDuplicates = [...exactByHash.values()]
  .filter((group) => group.length > 1)
  .filter((group) => {
    const sorted = [...group].sort();
    const pairKey = sorted.join("||");
    return !exactDuplicateIgnore.has(pairKey);
  })
  .sort((a, b) => b.length - a.length);

const toolPs1Files = textFiles.filter((p) => norm(p).includes("/tools/") && path.extname(p).toLowerCase() === ".ps1");
const packFiles = toolPs1Files.filter((p) => path.basename(p).startsWith("pack_"));
const checkFiles = toolPs1Files.filter((p) => path.basename(p).startsWith("check_"));
const backendScriptFiles = textFiles.filter((p) => norm(p).includes("/backend/scripts/") && path.extname(p).toLowerCase() === ".js");

const duplicatePackGroups = groupByNormalized(packFiles, normalizePwsh);
const duplicateCheckGroups = groupByNormalized(checkFiles, normalizePwsh);
const duplicateBackendScriptGroups = groupByNormalized(backendScriptFiles, normalizeJs);

const orphanCandidates = [];
for (const p of allFiles) {
  const relPath = rel(p);
  const name = path.basename(p);
  if (relPath.includes("/_archive/")) continue;
  if (name === ".gitkeep") continue;
  if (
    relPath === "backend/_dmmf_shift_offer.cjs" ||
    relPath === "backend/_shift_offer_fields.cjs" ||
    name.startsWith("_")
  ) {
    if (!basenameReferenced(relPath, textMap)) {
      orphanCandidates.push(relPath);
    }
  }
}
orphanCandidates.sort();

const tinyFiles = allFiles
  .map((p) => ({ file: rel(p), size: fs.statSync(p).size }))
  .filter((x) => x.size <= 20 && !x.file.endsWith(".gitkeep"))
  .sort((a, b) => a.size - b.size);

const archiveShadowPairs = [];
const liveByBase = new Map();
const archiveByBase = new Map();
for (const p of textFiles) {
  const r = rel(p);
  const base = path.basename(p);
  if (r.includes("/_archive/")) {
    if (!archiveByBase.has(base)) archiveByBase.set(base, []);
    archiveByBase.get(base).push(r);
  } else {
    if (!liveByBase.has(base)) liveByBase.set(base, []);
    liveByBase.get(base).push(r);
  }
}
for (const [base, liveList] of liveByBase.entries()) {
  if (!archiveByBase.has(base)) continue;
  archiveShadowPairs.push({
    basename: base,
    live: liveList.sort(),
    archive: archiveByBase.get(base).sort()
  });
}
archiveShadowPairs.sort((a, b) => a.basename.localeCompare(b.basename));

function countPattern(rootRel, regex) {
  const baseDir = path.join(repoRoot, rootRel);
  const hits = [];
  if (!fs.existsSync(baseDir)) return hits;
  for (const p of walk(baseDir, [])) {
    if (!allowedTextExt.has(path.extname(p).toLowerCase())) continue;
    const txt = readUtf8(p);
    const count = (txt.match(regex) || []).length;
    if (count > 0) hits.push({ file: rel(p), count });
  }
  return hits.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
}

const performanceSmells = {
  webUseEffect: countPattern("web/src", /\buseEffect\s*\(/g),
  webSetInterval: countPattern("web/src", /\bsetInterval\s*\(/g),
  webAddEventListener: countPattern("web/src", /\baddEventListener\s*\(/g),
  mobileSetInterval: countPattern("mobile/src", /\bsetInterval\s*\(/g),
  mobileAddEventListener: countPattern("mobile/src", /\baddEventListener\s*\(/g),
  backendSocketOn: countPattern("backend/src", /\.on\s*\(/g),
  backendSetInterval: countPattern("backend/src", /\bsetInterval\s*\(/g)
};

const summary = {
  ignoredDirPatterns: [...skipDirNames, ...skipDirPatterns.map(String)],
  exactDuplicateGroupCount: exactDuplicates.length,
  exactDuplicateFileCount: exactDuplicates.reduce((n, g) => n + g.length, 0),
  duplicatePackGroupCount: duplicatePackGroups.length,
  duplicateCheckGroupCount: duplicateCheckGroups.length,
  duplicateBackendScriptGroupCount: duplicateBackendScriptGroups.length,
  orphanCandidateCount: orphanCandidates.length,
  tinyFileCount: tinyFiles.length,
  archiveShadowPairCount: archiveShadowPairs.length
};

const report = {
  generatedAt: new Date().toISOString(),
  repoRoot: norm(repoRoot),
  summary,
  exactDuplicates,
  duplicatePackGroups,
  duplicateCheckGroups,
  duplicateBackendScriptGroups,
  orphanCandidates,
  tinyFiles,
  archiveShadowPairs,
  performanceSmells
};

ensureDir(reportDir);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("\n=== REPO AUDIT ===");
console.log(`INFO report => ${rel(reportPath)}`);
console.log(`INFO ignored dirs => ${summary.ignoredDirPatterns.join(", ")}`);
console.log(`INFO exact duplicate groups: ${summary.exactDuplicateGroupCount}`);
console.log(`INFO pack consolidation groups: ${summary.duplicatePackGroupCount}`);
console.log(`INFO check consolidation groups: ${summary.duplicateCheckGroupCount}`);
console.log(`INFO backend script consolidation groups: ${summary.duplicateBackendScriptGroupCount}`);
console.log(`INFO orphan candidates: ${summary.orphanCandidateCount}`);
console.log(`INFO tiny files: ${summary.tinyFileCount}`);
console.log(`INFO archive/live shadow pairs: ${summary.archiveShadowPairCount}`);

if (exactDuplicates.length > 0) {
  console.log("\nDUPLICATE FILE GROUPS");
  for (const group of exactDuplicates.slice(0, 5)) {
    console.log(`- ${group.join(" | ")}`);
  }
}

if (orphanCandidates.length > 0) {
  console.log("\nORPHAN CANDIDATES");
  for (const file of orphanCandidates.slice(0, 10)) {
    console.log(`- ${file}`);
  }
}

if (strict && (exactDuplicates.length > 0 || orphanCandidates.length > 0)) {
  process.exit(1);
}
