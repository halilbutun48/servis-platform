import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "../../..");

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

export function gitExec(args) {
  return execFileSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function gitLines(args) {
  const out = gitExec(args);
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function gitCachedNames() {
  return gitLines(["diff", "--cached", "--name-only"]);
}

export function gitStatusNames() {
  return String(gitExec(["status", "--porcelain=v1", "--untracked-files=all"]) || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

export function gitDiffNames(paths) {
  return gitLines(["diff", "--name-only", "--", ...paths]);
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

export function gitStatusEntries(paths) {
  return String(
    gitExec(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]) || ""
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

export function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  must(files.length === 0, `${label}: ${files.join(", ") || "(none)"}`);
}

export function mustNoDiffExcept(paths, allowedFiles, label) {
  const files = gitDiffNames(paths).filter((file) => !allowedFiles.includes(file));
  must(files.length === 0, `${label}: ${files.join(", ") || "(none)"}`);
}

export function mustNoStagedPrefix(names, prefixes, label) {
  const hits = names.filter((name) => prefixes.some((prefix) => normalizePath(name).startsWith(normalizePath(prefix))));
  must(hits.length === 0, `${label}: ${hits.join(", ") || "(none)"}`);
}

export function mustExactGitPaths(paths, expectedPaths, label) {
  const actual = sortedUniquePaths(gitStatusEntries(paths).map((entry) => entry.path));
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actual.includes(file));
  must(
    unexpected.length === 0 && missing.length === 0,
    `${label}: unexpected=${unexpected.join(", ") || "(none)"} missing=${missing.join(", ") || "(none)"}`
  );
}
