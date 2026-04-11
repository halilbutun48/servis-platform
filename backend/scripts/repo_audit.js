import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Ä°I]/g, "i")
    .replace(/[Ä±]/g, "i")
    .replace(/[ÅÅŸ]/g, "s")
    .replace(/[ÄÄŸ]/g, "g")
    .replace(/[ÃœÃ¼]/g, "u")
    .replace(/[Ã–Ã¶]/g, "o")
    .replace(/[Ã‡Ã§]/g, "c")
    .replace(/[â€™â€˜`]/g, "'")
    .replace(/[â€œâ€]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}

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
  ".ps1", ".js", ".cjs", ".mjs", ".jsx", ".ts", ".tsx", ".md", ".json", ".yml", ".yaml", ".html", ".css", ".prisma", ".sql"
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

function gitTrackedRelSet() {
  try {
    const out = execSync("git ls-files -z", { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return new Set(out.split("\0").filter(Boolean).map(norm));
  } catch {
    return null;
  }
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


function normalizePwshSemantic(text) {
  const lines = String(text || "").split(/\r?\n/);
  const refs = [];
  for (const line of lines) {
    if (/^\s*#\s*(compatibility_alias|canonical_target)\s*:/i.test(line)) continue;
    const matches = line.matchAll(/([A-Za-z0-9_./\\-]+\.(?:ps1|js))/g);
    for (const m of matches) refs.push(norm(m[1]).toLowerCase());
  }
  const normalizedLines = lines
    .map((line) => line.replace(/#.*/g, "").trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/\bM\d+(?:\.\d+)?\b/gi, "MXX")
        .replace(/\bm\d+(?:[_\.]\d+)?(?:check)?\b/gi, "mxx")
        .replace(/\d+/g, "0")
    )
    .join("\n");
  const semanticRefs = [...new Set(refs)].sort();
  return JSON.stringify({ semanticRefs, normalizedLines });
}
function parseCompatibilityAliasMeta(relPath, text) {
  if (!/^tools\/(?:check_|pack_).+\.ps1$/i.test(relPath)) return null;
  const isAlias = /^\s*#\s*compatibility_alias\s*:\s*(?:true|1|yes)\s*$/im.test(text);
  if (!isAlias) return null;
  const targetMatch = text.match(/^\s*#\s*canonical_target\s*:\s*(.+?)\s*$/im);
  return {
    canonicalTarget: targetMatch ? norm(String(targetMatch[1]).trim()) : null
  };
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
    const key = sha1(Buffer.from(normalizeFn(readUtf8(p), p), "utf8"));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(rel(p));
  }
  return [...map.values()].filter((group) => group.length > 1).sort((a, b) => b.length - a.length);
}


function countLines(text) {
  return String(text || "").split(/\r?\n/).length;
}

function countDocContractRefs(relPath, text) {
  if (!/\.(ps1|js|cjs|mjs)$/i.test(relPath)) return 0;
  const matches = String(text).match(/(?:docs|tools)[\/][^"'`\r\n]+?\.md|README\.md/g) || [];
  return matches.length;
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

const generatedLargeFileIgnore = [
  /(^|\/)package-lock\.json$/i,
];

function isGeneratedLargeFile(relPath) {
  return generatedLargeFileIgnore.some((rx) => rx.test(relPath));
}

const intentionalTinyFileIgnore = [
  /^infra\/\.env$/i,
  /^tools\/STABLE_TO\.txt$/i,
  /^backend\/data\/[^/]+\.json$/i,
];

function isIntentionalTinyFile(relPath) {
  return intentionalTinyFileIgnore.some((rx) => rx.test(relPath));
}

const allFiles = walk(repoRoot);
const trackedRelSet = gitTrackedRelSet();
const trackedFilter = (p) => !trackedRelSet || trackedRelSet.has(rel(p));
const trackedAllFiles = allFiles.filter(trackedFilter);
const textFiles = trackedAllFiles.filter((p) => allowedTextExt.has(path.extname(p).toLowerCase()));
const textMap = new Map(textFiles.map((p) => [rel(p), readUtf8(p)]));

const largeFileWarnThreshold = 1000;
const largeFileBlockThreshold = 1200;

const fileLineStats = [...textMap.entries()]
  .map(([fileRel, text]) => ({ file: fileRel, lines: countLines(text) }))
  .filter((item) => !isGeneratedLargeFile(item.file))
  .sort((a, b) => b.lines - a.lines);

const largeFiles = fileLineStats
  .filter((item) => item.lines >= largeFileBlockThreshold)
  .slice(0, 20);

const warningHotFiles = fileLineStats
  .filter((item) => item.lines >= largeFileWarnThreshold && item.lines < largeFileBlockThreshold)
  .slice(0, 20);
const activeDocContractRefs = [...textMap.entries()]
  .map(([fileRel, text]) => ({ file: fileRel, refs: countDocContractRefs(fileRel, text) }))
  .filter((item) => item.refs > 0 && !item.file.includes('/_archive/') && !item.file.startsWith('tools/_archive/'))
  .sort((a, b) => b.refs - a.refs);
const runtimeJsonFiles = trackedAllFiles
  .map((p) => rel(p))
  .filter((p) => p.startsWith('backend/data/') && p.endsWith('.json'));


const exactByHash = new Map();
for (const p of textFiles) {
  const key = sha1(fs.readFileSync(p));
  if (!exactByHash.has(key)) exactByHash.set(key, []);
  exactByHash.get(key).push(rel(p));
}

const exactDuplicates = [...exactByHash.values()]
  .filter((group) => group.length > 1)
  .filter((group) => !group.every((file) => file.startsWith("backend/data/") && file.endsWith(".json")))
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

const compatibilityAliasPacks = packFiles
  .map((p) => ({ fullPath: p, file: rel(p), meta: parseCompatibilityAliasMeta(rel(p), readUtf8(p)) }))
  .filter((item) => item.meta)
  .map((item) => ({
    file: item.file,
    canonicalTarget: item.meta.canonicalTarget
  }))
  .sort((a, b) => a.file.localeCompare(b.file));
const compatibilityAliasPackSet = new Set(compatibilityAliasPacks.map((item) => item.file));
const duplicatePackGroups = groupByNormalized(
  packFiles.filter((p) => !compatibilityAliasPackSet.has(rel(p))),
  (text) => normalizePwshSemantic(text)
);
const compatibilityAliasChecks = checkFiles
  .map((p) => ({ fullPath: p, file: rel(p), meta: parseCompatibilityAliasMeta(rel(p), readUtf8(p)) }))
  .filter((item) => item.meta)
  .map((item) => ({
    file: item.file,
    canonicalTarget: item.meta.canonicalTarget
  }))
  .sort((a, b) => a.file.localeCompare(b.file));
const compatibilityAliasCheckSet = new Set(compatibilityAliasChecks.map((item) => item.file));
const duplicateCheckGroups = groupByNormalized(
  checkFiles.filter((p) => !compatibilityAliasCheckSet.has(rel(p))),
  (text) => normalizePwshSemantic(text)
);
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
  .filter((x) => x.size <= 20 && !x.file.endsWith(".gitkeep") && !isIntentionalTinyFile(x.file))
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
  compatibilityAliasPackCount: compatibilityAliasPacks.length,
  duplicateCheckGroupCount: duplicateCheckGroups.length,
  compatibilityAliasCheckCount: compatibilityAliasChecks.length,
  duplicateBackendScriptGroupCount: duplicateBackendScriptGroups.length,
  orphanCandidateCount: orphanCandidates.length,
  tinyFileCount: tinyFiles.length,
  archiveShadowPairCount: archiveShadowPairs.length,
  largeFileCount: largeFiles.length,
  largeFileWarningCount: warningHotFiles.length,
  activeDocContractRefCount: activeDocContractRefs.length,
  runtimeJsonFileCount: runtimeJsonFiles.length
};

const report = {
  generatedAt: new Date().toISOString(),
  repoRoot: norm(repoRoot),
  summary,
  exactDuplicates,
  duplicatePackGroups,
  compatibilityAliasPacks,
  duplicateCheckGroups,
  compatibilityAliasChecks,
  duplicateBackendScriptGroups,
  orphanCandidates,
  tinyFiles,
  archiveShadowPairs,
  largeFiles,
  warningHotFiles,
  activeDocContractRefs,
  runtimeJsonFiles,
  performanceSmells
};

ensureDir(reportDir);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("\n=== REPO AUDIT ===");
console.log(`INFO report => ${rel(reportPath)}`);
console.log(`INFO ignored dirs => ${summary.ignoredDirPatterns.join(", ")}`);
console.log(`INFO exact duplicate groups: ${summary.exactDuplicateGroupCount}`);
console.log(`INFO pack consolidation groups: ${summary.duplicatePackGroupCount}`);
console.log(`INFO compatibility alias packs excluded: ${summary.compatibilityAliasPackCount}`);
console.log(`INFO check consolidation groups: ${summary.duplicateCheckGroupCount}`);
console.log(`INFO compatibility alias checks excluded: ${summary.compatibilityAliasCheckCount}`);
console.log(`INFO backend script consolidation groups: ${summary.duplicateBackendScriptGroupCount}`);
console.log(`INFO orphan candidates: ${summary.orphanCandidateCount}`);
console.log(`INFO tiny files: ${summary.tinyFileCount}`);
console.log(`INFO archive/live shadow pairs: ${summary.archiveShadowPairCount}`);
console.log(`INFO hot files >=${largeFileWarnThreshold} and <${largeFileBlockThreshold} lines: ${summary.largeFileWarningCount}`);
console.log(`INFO large files >=${largeFileBlockThreshold} lines: ${summary.largeFileCount}`);
console.log(`INFO active docs-contract refs: ${summary.activeDocContractRefCount}`);
console.log(`INFO runtime json files tracked: ${summary.runtimeJsonFileCount}`);

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
