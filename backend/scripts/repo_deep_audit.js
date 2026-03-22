#!/usr/bin/env node
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

const STATIC_IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "_archive", "artifacts", "coverage", ".next", "build"
]);
const IGNORE_DIR_PATTERNS = [
  /^_/i,
  /^overlay_/i,
];
const JS_EXTS = new Set([".js", ".jsx", ".cjs", ".mjs"]);
const TEXT_EXTS = new Set([
  ".js", ".jsx", ".cjs", ".mjs", ".json", ".md", ".ps1", ".ts", ".tsx", ".yml", ".yaml", ".html", ".css", ".txt"
]);
const MAX_TEXT_BYTES = 1024 * 1024; // 1 MB cap for exact duplicate text hashing
const EXACT_DUPLICATE_IGNORE = new Set([
  "docs/CHECKLIST_SSOT.md||tools/CHECKLIST_SSOT.md",
  "docs/PRIMER_SSOT.md||tools/PRIMER_SNAPSHOT.md",
]);


function norm(p) {
  return p.replace(/\\/g, "/");
}

function shouldIgnoreDir(name) {
  return STATIC_IGNORE_DIRS.has(name) || IGNORE_DIR_PATTERNS.some((rx) => rx.test(name));
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = norm(path.relative(root, full));
    if (ent.isDirectory()) {
      if (shouldIgnoreDir(ent.name)) continue;
      walk(full, out);
    } else {
      out.push(rel);
    }
  }
  return out;
}

const allFiles = walk(root);
const jsFiles = allFiles.filter((f) => JS_EXTS.has(path.extname(f).toLowerCase()));
const jsFilesSet = new Set(jsFiles);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function stat(rel) {
  return fs.statSync(path.join(root, rel));
}

function sha1(buf) {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

function resolveImport(srcRel, spec) {
  if (!spec.startsWith(".")) return null;
  const srcAbs = path.join(root, srcRel);
  const base = path.resolve(path.dirname(srcAbs), spec);
  const candidates = [];
  if (path.extname(base)) {
    candidates.push(base);
  } else {
    for (const ext of [".js", ".jsx", ".cjs", ".mjs"]) candidates.push(base + ext);
    for (const idx of ["index.js", "index.jsx", "index.cjs", "index.mjs"]) candidates.push(path.join(base, idx));
  }
  for (const cand of candidates) {
    const rel = norm(path.relative(root, cand));
    if (jsFilesSet.has(rel)) return rel;
  }
  return null;
}

const importPatterns = [
  /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /export\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  /import\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const inbounds = new Map();
for (const rel of jsFiles) {
  const text = read(rel);
  for (const pattern of importPatterns) {
    for (const m of text.matchAll(pattern)) {
      const dep = resolveImport(rel, m[1]);
      if (!dep) continue;
      if (!inbounds.has(dep)) inbounds.set(dep, new Set());
      inbounds.get(dep).add(rel);
    }
  }
}

const entryFiles = new Set([
  "backend/src/server.js",
  "backend/src/index.js",
  "mobile/App.js",
  "web/src/main.jsx",
  "web/src/App.jsx",
].filter((f) => jsFilesSet.has(f)));
for (const rel of jsFiles) {
  if (rel.startsWith("backend/scripts/") || rel.startsWith("mobile/scripts/") || rel.startsWith("web/scripts/")) {
    entryFiles.add(rel);
  }
}
for (const pkgRel of allFiles.filter((f) => path.basename(f) === "package.json")) {
  try {
    const pkg = JSON.parse(read(pkgRel));
    if (pkg.main) {
      const rel = norm(path.relative(root, path.resolve(path.dirname(path.join(root, pkgRel)), pkg.main)));
      if (jsFilesSet.has(rel)) entryFiles.add(rel);
    }
    for (const val of Object.values(pkg.scripts || {})) {
      const matches = String(val).match(/[\w./\\-]+\.(?:js|jsx|cjs|mjs)/g) || [];
      for (const token of matches) {
        const rel = norm(path.relative(root, path.resolve(path.dirname(path.join(root, pkgRel)), token)));
        if (jsFilesSet.has(rel)) entryFiles.add(rel);
      }
    }
  } catch {}
}

const orphanCandidates = jsFiles.filter((f) => !entryFiles.has(f) && !(inbounds.get(f)?.size)).sort();

const byHash = new Map();
for (const rel of allFiles) {
  const ext = path.extname(rel).toLowerCase();
  if (rel.startsWith("artifacts/")) continue;
  if (!TEXT_EXTS.has(ext)) continue;
  const fileStat = stat(rel);
  if (fileStat.size > MAX_TEXT_BYTES) continue;
  const buf = fs.readFileSync(path.join(root, rel));
  const h = sha1(buf);
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(rel);
}
const exactDuplicates = [...byHash.values()]
  .filter((g) => g.length > 1)
  .map((g) => g.sort())
  .filter((g) => !EXACT_DUPLICATE_IGNORE.has(g.join("||")))
  .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));

const deprecatedMarkers = jsFiles.filter((rel) => /deprecated|no-op|legacy|geriye dönük uyumluluk/i.test(read(rel))).sort();

const findings = {
  generatedAt: new Date().toISOString(),
  ignoredDirPatterns: [...STATIC_IGNORE_DIRS, ...IGNORE_DIR_PATTERNS.map(String)],
  exactDuplicateTextMaxBytes: MAX_TEXT_BYTES,
  orphanCandidates,
  exactDuplicates: exactDuplicates.slice(0, 50),
  deprecatedMarkers,
  buildArtifactsPresent: exists("web/dist"),
  hasGitignore: exists(".gitignore"),
  highConfidenceCleanupApplied: [
    "backend/_dmmf_shift_offer.cjs",
    "backend/_shift_offer_fields.cjs",
    "web/src/socket.js",
    "web/src/panels/room/LiveProgressPanel.jsx",
  ].map((file) => ({ file, exists: exists(file) })),
  deferredReview: [
  ],
};

fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/repo_deep_audit_latest.json"), JSON.stringify(findings, null, 2));

const md = [
  "# Repo Deep Audit",
  "",
  `Generated: ${findings.generatedAt}`,
  "",
  `Ignored dirs: ${findings.ignoredDirPatterns.join(", ")}`,
  `Exact duplicate text cap: ${MAX_TEXT_BYTES} bytes`,
  "",
  "## High-confidence orphan candidates",
  ...(findings.orphanCandidates.length ? findings.orphanCandidates.map((f) => `- ${f}`) : ["- none"]),
  "",
  "## Deprecated / legacy markers",
  ...(findings.deprecatedMarkers.length ? findings.deprecatedMarkers.map((f) => `- ${f}`) : ["- none"]),
  "",
  "## Exact duplicate groups",
  ...(findings.exactDuplicates.length ? findings.exactDuplicates.slice(0, 20).map((g) => `- ${g.join(" | ")}`) : ["- none"]),
  "",
  "## Build / hygiene",
  `- .gitignore present: ${findings.hasGitignore ? "YES" : "NO"}`,
  `- web/dist present: ${findings.buildArtifactsPresent ? "YES" : "NO"}`,
  "",
  "## Deferred review",
  ...findings.deferredReview.map((f) => `- ${f}`),
  "",
].join("\n");
fs.writeFileSync(path.join(root, "artifacts/repo_deep_audit_latest.md"), md);
console.log("OK repo deep audit written");
