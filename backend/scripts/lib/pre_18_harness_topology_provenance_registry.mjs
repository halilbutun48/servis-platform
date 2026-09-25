import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const LIFECYCLE_CLASSES = Object.freeze([
  "CANONICAL_ENTRYPOINT",
  "CANONICAL_LIBRARY",
  "WRAPPER",
  "COMPATIBILITY",
  "DIAGNOSTIC",
  "VALIDATION_CHECK",
  "FIXTURE_SUPPORT",
  "PROFILE_OR_SELECTION",
  "DURABLE_EVIDENCE",
  "CLOSURE_OR_RECOVERY",
  "MIGRATION_OR_CORRECTIVE",
  "HISTORICAL_EVIDENCE_TOOL",
  "GENERATED_OR_BUILD_HELPER",
  "OBSOLETE_CANDIDATE",
  "ORPHAN_CANDIDATE",
  "DUPLICATE_AUTHORITY_CANDIDATE",
  "UNKNOWN_REQUIRES_PROOF",
]);

export const PROVENANCE_CONCLUSIONS = Object.freeze([
  "PROVEN_ACTIVE",
  "PROVEN_WRAPPER",
  "PROVEN_COMPATIBILITY",
  "PROVEN_HISTORICAL",
  "PROVEN_SUPERSEDED",
  "PROVEN_ORPHAN",
  "MANUAL_CANONICAL_USE_PROVEN",
  "MANUAL_USE_POSSIBLE_NOT_PROVEN",
  "UNKNOWN_REQUIRES_PROOF",
]);

const SCRIPT_ROOTS = Object.freeze([
  "backend/scripts/",
  "web/scripts/",
  "mobile/scripts/",
  "tools/",
]);
const SCRIPT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".ps1",
  ".sh",
  ".cmd",
  ".bat",
]);
const PACKAGE_SOURCES = Object.freeze([
  { packageId: "root", packagePath: "package.json", directory: "" },
  { packageId: "backend", packagePath: "backend/package.json", directory: "backend" },
  { packageId: "web", packagePath: "web/package.json", directory: "web" },
  { packageId: "mobile", packagePath: "mobile/package.json", directory: "mobile" },
]);
const FOUNDATION_PATHS = new Set([
  "backend/scripts/lib/pre_18_harness_topology_provenance_registry.mjs",
  "backend/scripts/pre_18_topo_01_topo_04_provenance_foundation.mjs",
  "backend/scripts/pre_18_topo_01_topo_04_provenance_foundation_check.mjs",
]);
const REGISTRY_VERSION = "PRE_18_TOPO_01_TOPO_04_V1";

function slash(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b, "en"))
      .map((key) => [key, sortObject(value[key])]),
  );
}

export function canonicalJson(value) {
  return `${JSON.stringify(sortObject(value), null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobOid(buffer) {
  return crypto
    .createHash("sha1")
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest("hex");
}

function isRelevantScript(filePath) {
  const normalized = slash(filePath);
  return (
    SCRIPT_ROOTS.some((root) => normalized.startsWith(root)) &&
    SCRIPT_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase())
  );
}

function splitNull(text) {
  return String(text || "")
    .split("\0")
    .map(slash)
    .filter(Boolean);
}

function gitList(repoRoot, args) {
  return splitNull(
    execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
}

function safeReadText(repoRoot, relativePath) {
  try {
    return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  } catch {
    return "";
  }
}

function collectRepositoryCaptureHistory(repoRoot, filePaths) {
  const wantedPaths = new Set(filePaths.map(slash));
  const evidenceByPath = new Map(filePaths.map((filePath) => [slash(filePath), []]));
  let refOutput = "";
  try {
    refOutput = execFileSync(
      "git",
      [
        "for-each-ref",
        "--format=%(objecttype)%09%(objectname)",
        "refs/codex/turn-diffs",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch {
    return evidenceByPath;
  }
  const treeOids = uniqueSorted(
    refOutput
      .split(/\r?\n/)
      .map((line) => line.trim().split("\t"))
      .filter(([objectType, objectOid]) => objectType === "tree" && /^[0-9a-f]{40}$/.test(objectOid))
      .map(([, objectOid]) => objectOid),
  );
  const currentBlobByPath = new Map();
  for (const filePath of wantedPaths) {
    try {
      currentBlobByPath.set(
        filePath,
        gitBlobOid(fs.readFileSync(path.join(repoRoot, filePath))),
      );
    } catch {
      // A missing current file cannot have exact current-content capture evidence.
    }
  }
  for (const treeOid of treeOids) {
    let treeOutput;
    try {
      treeOutput = execFileSync("git", ["ls-tree", "-r", "-z", treeOid], {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      continue;
    }
    for (const entry of treeOutput.split("\0")) {
      if (!entry) continue;
      const tabIndex = entry.indexOf("\t");
      if (tabIndex < 0) continue;
      const [mode, objectType, objectOid] = entry.slice(0, tabIndex).split(" ");
      const filePath = slash(entry.slice(tabIndex + 1));
      if (
        mode !== "160000" &&
        objectType === "blob" &&
        wantedPaths.has(filePath) &&
        currentBlobByPath.get(filePath) === objectOid
      ) {
        evidenceByPath.get(filePath).push({
          evidenceKind: "EXACT_BLOB_IN_REPOSITORY_CAPTURE",
          evidenceReference: `git-tree:${treeOid}:${filePath}`,
          objectOid,
          path: filePath,
        });
      }
    }
  }
  for (const [filePath, evidence] of evidenceByPath) {
    const unique = new Map(evidence.map((entry) => [entry.evidenceReference, entry]));
    evidenceByPath.set(
      filePath,
      [...unique.values()].sort((a, b) => a.evidenceReference.localeCompare(b.evidenceReference, "en")),
    );
  }
  return evidenceByPath;
}

function collectCurrentCommitHistory(repoRoot, filePaths) {
  const wantedPaths = new Set(filePaths.map(slash));
  const evidenceByPath = new Map(filePaths.map((filePath) => [slash(filePath), []]));
  if (wantedPaths.size === 0) return evidenceByPath;
  let output = "";
  try {
    output = execFileSync(
      "git",
      ["log", "--format=@@@%H%x09%s", "--name-only", "HEAD", "--", ...wantedPaths],
      {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch {
    return evidenceByPath;
  }
  let commitOid = "";
  let commitSubject = "";
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("@@@")) {
      const [oid, ...subjectParts] = line.slice(3).split("\t");
      commitOid = oid;
      commitSubject = subjectParts.join("\t");
      continue;
    }
    const filePath = slash(line);
    if (
      !filePath ||
      !wantedPaths.has(filePath) ||
      evidenceByPath.get(filePath).length > 0 ||
      !/^[0-9a-f]{40}$/.test(commitOid)
    ) {
      continue;
    }
    evidenceByPath.get(filePath).push({
      commitOid,
      commitSubject,
      evidenceKind: "CURRENT_BRANCH_COMMIT_HISTORY",
      evidenceReference: `git-commit:${commitOid}:${filePath}`,
      path: filePath,
    });
  }
  return evidenceByPath;
}

function manualCanonicalEvidenceFor(filePath, documentation) {
  const normalizedPath = slash(filePath);
  const forward = normalizedPath;
  const backward = normalizedPath.replaceAll("/", "\\");
  const evidence = [];
  const explicitCommandPattern = /(?:proof command|tercih edilen komut|doğrulama yolu|clean[- ]clone verification)/iu;
  const structuredOwnerPattern = /"(?:checkOwner|path)"\s*:\s*"[^"]+".*"(?:purpose|when|proves)"/iu;
  for (const document of documentation) {
    if (document.path.endsWith("SCRIPT_HARNESS_CONSOLIDATION_01.md")) continue;
    const lines = document.text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.includes(forward) && !line.includes(backward)) continue;
      if (!explicitCommandPattern.test(line) && !structuredOwnerPattern.test(line)) continue;
      evidence.push({
        evidenceKind: "DOCUMENTED_MANUAL_CANONICAL_ENTRYPOINT",
        evidenceReference: `${document.path}:${index + 1}`,
        source: document.path,
        statement: line.trim(),
      });
    }
  }
  return evidence.sort((a, b) => a.evidenceReference.localeCompare(b.evidenceReference, "en"));
}

function resolveRepoPath(ownerPath, candidate) {
  const raw = String(candidate || "")
    .replaceAll("\\", "/")
    .replace(/^['"`]+|['"`]+$/g, "");
  if (!raw || /^\w+:\/\//.test(raw) || raw.startsWith("node:")) {
    return null;
  }
  if (SCRIPT_ROOTS.some((root) => raw.startsWith(root))) {
    return path.posix.normalize(raw);
  }
  if (raw.startsWith("./") || raw.startsWith("../")) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(ownerPath), raw));
  }
  return null;
}

function pathCandidatesFromText(text) {
  const candidates = [];
  const explicit = /(?:backend\/scripts|web\/scripts|mobile\/scripts|tools\/)[A-Za-z0-9_./-]+\.(?:js|mjs|cjs|ts|tsx|ps1|sh|cmd|bat)/gi;
  const relative = /['"`]((?:\.\.\/|\.\/)[^'"`\s]+\.(?:js|mjs|cjs|ts|tsx|ps1|sh|cmd|bat))['"`]/gi;
  for (const match of text.matchAll(explicit)) {
    candidates.push(match[0]);
  }
  for (const match of text.matchAll(relative)) {
    candidates.push(match[1]);
  }
  return candidates;
}

function extractStaticReferences(file, knownPaths, uniquePathByBasename) {
  const references = pathCandidatesFromText(file.sourceText || "")
    .map((candidate) => resolveRepoPath(file.path, candidate))
    .filter((candidate) => candidate && candidate !== file.path && knownPaths.has(candidate));
  const filenamePattern = /[A-Za-z0-9_.-]+\.(?:js|mjs|cjs|ts|tsx|ps1|sh|cmd|bat)/gi;
  for (const match of String(file.sourceText || "").matchAll(filenamePattern)) {
    const target = uniquePathByBasename.get(match[0]);
    if (target && target !== file.path) references.push(target);
  }
  return uniqueSorted(references);
}

function extractArtifactReferences(text) {
  const matches = [];
  const pattern = /(?:backend\/)?artifacts\/[A-Za-z0-9_./*?-]+/gi;
  for (const match of String(text || "").matchAll(pattern)) {
    matches.push(slash(match[0]).replace(/[),;]+$/g, ""));
  }
  return uniqueSorted(matches);
}

function extractArtifactReferenceDetails(text) {
  const source = String(text || "");
  const producer = [];
  const consumer = [];
  const unknown = [];
  const pattern = /(?:backend\/)?artifacts\/[A-Za-z0-9_./*?-]+/gi;
  for (const match of source.matchAll(pattern)) {
    const artifactPath = slash(match[0]).replace(/[),;]+$/g, "");
    const start = Math.max(0, match.index - 160);
    const end = Math.min(source.length, match.index + match[0].length + 160);
    const context = source.slice(start, end);
    const isProducer = /(?:writeFile|appendFile|outputPath|artifactPath|persist|save|mkdir)/i.test(context);
    const isConsumer = /(?:readFile|inputPath|sourcePath|load|consume|JSON\.parse)/i.test(context);
    if (isProducer) producer.push(artifactPath);
    if (isConsumer) consumer.push(artifactPath);
    if (!isProducer && !isConsumer) unknown.push(artifactPath);
  }
  return {
    artifactReferences: extractArtifactReferences(source),
    artifactProducerReferences: uniqueSorted(producer),
    artifactConsumerReferences: uniqueSorted(consumer),
    artifactDirectionUnknownReferences: uniqueSorted(unknown),
  };
}

function commandPathCandidates(command) {
  const values = [];
  const pattern = /(?:^|[\s'"=])((?:\.\.\/|\.\/)?(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.(?:js|mjs|cjs|ts|tsx|ps1|sh|cmd|bat))(?=$|[\s'";&|)])/gi;
  for (const match of String(command || "").replaceAll("\\", "/").matchAll(pattern)) {
    values.push(match[1]);
  }
  return uniqueSorted(values);
}

function resolveCommandTargets(command, packageDirectory, knownPaths, includeMissing = false) {
  const owner = packageDirectory ? `${packageDirectory}/package.json` : "package.json";
  return uniqueSorted(
    commandPathCandidates(command)
      .map((candidate) => {
        if (SCRIPT_ROOTS.some((root) => candidate.startsWith(root))) {
          return path.posix.normalize(candidate);
        }
        return path.posix.normalize(path.posix.join(path.posix.dirname(owner), candidate));
      })
      .filter((candidate) => isRelevantScript(candidate) && (includeMissing || knownPaths.has(candidate))),
  );
}

function packageCommandKey(entry) {
  return `${entry.packageId}:${entry.name}`;
}

function collectPackageCommands(repoRoot, knownPaths) {
  const commands = [];
  for (const source of PACKAGE_SOURCES) {
    const packageJson = JSON.parse(safeReadText(repoRoot, source.packagePath));
    for (const name of Object.keys(packageJson.scripts || {}).sort((a, b) => a.localeCompare(b, "en"))) {
      const command = String(packageJson.scripts[name]);
      const directTargets = resolveCommandTargets(command, source.directory, knownPaths, true);
      commands.push({
        packageId: source.packageId,
        packagePath: source.packagePath,
        packageDirectory: source.directory,
        name,
        command,
        directTargets,
        directScriptTarget: directTargets[0] || null,
      });
    }
  }
  return commands.sort((a, b) => packageCommandKey(a).localeCompare(packageCommandKey(b), "en"));
}

function parseNpmInvocations(command, defaultPackageId = "root") {
  const invocations = [];
  const pattern = /npm(?:\.cmd)?(?:\s+--prefix\s+([^\s&|]+))?\s+run\s+([^\s&|]+)/gi;
  for (const match of String(command || "").matchAll(pattern)) {
    const prefix = slash((match[1] || "").replace(/^['"]|['"]$/g, ""));
    const packageId = prefix
      ? PACKAGE_SOURCES.find((source) => source.directory === prefix)?.packageId || prefix
      : defaultPackageId;
    invocations.push({ packageId, name: match[2] });
  }
  return invocations;
}

function resolvePackageTargets(commandKey, commandMap, seen = new Set()) {
  if (seen.has(commandKey)) {
    return [];
  }
  seen.add(commandKey);
  const entry = commandMap.get(commandKey);
  if (!entry) {
    return [];
  }
  const targets = [...entry.directTargets];
  for (const invocation of parseNpmInvocations(entry.command, entry.packageId)) {
    targets.push(...resolvePackageTargets(`${invocation.packageId}:${invocation.name}`, commandMap, seen));
  }
  return uniqueSorted(targets);
}

function buildPackageAliases(packageCommands) {
  const grouped = new Map();
  for (const entry of packageCommands) {
    if (!entry.directScriptTarget || /^bench:/i.test(entry.name)) continue;
    const signature = `target:${entry.directScriptTarget}`;
    const key = `${entry.packageId}|${signature}`;
    const list = grouped.get(key) || [];
    list.push(entry);
    grouped.set(key, list);
  }
  const groups = [];
  for (const [key, entries] of grouped) {
    if (entries.length < 2) continue;
    const ordered = [...entries].sort((a, b) => {
      const aPenalty = /(?:compat|legacy|alias|internal|chain)/i.test(a.name) ? 1 : 0;
      const bPenalty = /(?:compat|legacy|alias|internal|chain)/i.test(b.name) ? 1 : 0;
      return aPenalty - bPenalty || a.name.length - b.name.length || a.name.localeCompare(b.name, "en");
    });
    const canonical = ordered[0];
    groups.push({
      groupId: `PACKAGE_ALIAS_${sha256(key).slice(0, 12).toUpperCase()}`,
      packageId: canonical.packageId,
      directTarget: canonical.directScriptTarget,
      normalizedCommand: canonical.directScriptTarget ? null : canonical.command.trim().replace(/\s+/g, " "),
      canonicalCommand: packageCommandKey(canonical),
      entries: ordered.map((entry, index) => ({
        commandKey: packageCommandKey(entry),
        name: entry.name,
        command: entry.command,
        relationship: index === 0 ? "GROUP_PRIMARY" : "ALIAS_OR_MODE",
      })),
    });
  }
  return groups.sort((a, b) => a.groupId.localeCompare(b.groupId, "en"));
}

function parseWorkflowRuns(workflowPath, text) {
  const lines = String(text || "").split(/\r?\n/);
  const results = [];
  let job = "unknown";
  let step = "unnamed";
  let workingDirectory = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch && jobMatch[1] !== "on") {
      job = jobMatch[1];
    }
    const stepMatch = line.match(/^\s+- name:\s*(.+?)\s*$/);
    if (stepMatch) {
      step = stepMatch[1].replace(/^['"]|['"]$/g, "");
      workingDirectory = "";
      continue;
    }
    const directoryMatch = line.match(/^\s+working-directory:\s*(.+?)\s*$/);
    if (directoryMatch) {
      workingDirectory = slash(directoryMatch[1].replace(/^['"]|['"]$/g, ""));
      continue;
    }
    const inlineRun = line.match(/^\s+run:\s*([^|>].*?)\s*$/);
    if (inlineRun) {
      results.push({ workflowPath, job, step, workingDirectory, command: inlineRun[1] });
      continue;
    }
    if (/^\s+run:\s*[|>]\s*$/.test(line)) {
      const indent = line.match(/^\s*/)[0].length;
      const block = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const next = lines[cursor];
        const nextIndent = next.match(/^\s*/)[0].length;
        if (next.trim() && nextIndent <= indent) break;
        if (next.trim()) block.push(next.trim().replace(/\\\s*$/, ""));
        cursor += 1;
      }
      for (const command of block) {
        if (/^(?:set |if |for |done$|fi$|then$|else$|cleanup|trap |echo |exit |break$|mkdir |container_name=|evidence_dir=|health_status=)/.test(command)) {
          continue;
        }
        results.push({ workflowPath, job, step, workingDirectory, command });
      }
      index = cursor - 1;
    }
  }
  return results;
}

function collectCiEntrypoints(snapshot, packageCommands, knownPaths) {
  const commandMap = new Map(packageCommands.map((entry) => [packageCommandKey(entry), entry]));
  const records = new Map();
  for (const workflow of snapshot.ciRuns || []) {
    const defaultPackageId = PACKAGE_SOURCES.find(
      (source) => source.directory === workflow.workingDirectory,
    )?.packageId || "root";
    const resolvedTargets = [];
    const packageKeys = [];
    for (const invocation of parseNpmInvocations(workflow.command, defaultPackageId)) {
      const key = `${invocation.packageId}:${invocation.name}`;
      packageKeys.push(key);
      resolvedTargets.push(...resolvePackageTargets(key, commandMap));
    }
    resolvedTargets.push(
      ...resolveCommandTargets(workflow.command, workflow.workingDirectory, knownPaths, false),
    );
    const targets = uniqueSorted(resolvedTargets);
    if (targets.length === 0 && packageKeys.length === 0) continue;
    const identity = targets.length > 0
      ? `targets:${targets.join(",")}`
      : `packages:${uniqueSorted(packageKeys).join(",")}`;
    const existing = records.get(identity);
    const caller = `${workflow.workflowPath}#${workflow.job}#${workflow.step}`;
    if (existing) {
      existing.callers = uniqueSorted([...existing.callers, caller]);
      existing.commands = uniqueSorted([...existing.commands, workflow.command]);
      continue;
    }
    records.set(identity, {
      ciEntrypointId: `CI_${sha256(identity).slice(0, 12).toUpperCase()}`,
      workflowPath: workflow.workflowPath,
      job: workflow.job,
      step: workflow.step,
      command: workflow.command,
      commands: [workflow.command],
      callers: [caller],
      packageCommands: uniqueSorted(packageKeys),
      resolvedTargets: targets,
      resolution: targets.length > 0
        ? packageKeys.length > 0 ? "PACKAGE_COMMAND" : "DIRECT_SCRIPT"
        : "UNRESOLVED_PACKAGE_COMMAND",
    });
  }
  return [...records.values()].sort((a, b) => a.ciEntrypointId.localeCompare(b.ciEntrypointId, "en"));
}

function documentationReferencesFor(scriptPath, documentation) {
  const forward = scriptPath;
  const backward = scriptPath.replaceAll("/", "\\");
  return uniqueSorted(
    documentation
      .filter((doc) => doc.text.includes(forward) || doc.text.includes(backward))
      .map((doc) => doc.path),
  );
}

function parseLegacyBaseline(documentation) {
  const needsReview = new Set();
  const compatibility = new Set();
  for (const document of documentation) {
    if (!document.path.endsWith("SCRIPT_HARNESS_CONSOLIDATION_01.md")) continue;
    for (const line of document.text.split(/\r?\n/)) {
      if (!line.startsWith("|")) continue;
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      const scriptPath = cells.find((cell) => isRelevantScript(cell));
      if (!scriptPath) continue;
      if (cells.includes("NEEDS_REVIEW")) needsReview.add(slash(scriptPath));
      if (cells.includes("LEGACY_COMPAT")) compatibility.add(slash(scriptPath));
    }
  }
  return {
    needsReviewPaths: uniqueSorted([...needsReview]),
    compatibilityPaths: uniqueSorted([...compatibility]),
  };
}

function ownerFamilyFor(filePath) {
  const normalized = slash(filePath);
  const base = path.posix.basename(normalized).replace(/\.[^.]+$/, "");
  if (base.startsWith("pre_18_room_")) return "PRE_18_ROOM";
  if (base.startsWith("pre_18_superadmin_")) return "PRE_18_SUPERADMIN";
  if (base.startsWith("pre_18_")) return "PRE_18_FOUNDATION";
  if (normalized.startsWith("tools/")) return "TOOLS_GOVERNANCE";
  if (normalized.startsWith("web/scripts/")) return "WEB_HARNESS";
  if (normalized.startsWith("mobile/scripts/")) return "MOBILE_HARNESS";
  const prefix = base.split("_").slice(0, 3).join("_").toUpperCase();
  return `BACKEND_${prefix || "UNCLASSIFIED"}`;
}

function isThinWrapper(file, staticReferences) {
  if (staticReferences.length !== 1) return false;
  const source = String(file.sourceText || "")
    .replace(/^#!.*$/m, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .trim();
  const executableLines = source.split(/\r?\n/).filter((line) => line.trim()).length;
  return executableLines <= 20 || /(?:wrapper|compat|delegate|forward)/i.test(file.path + source);
}

function lifecycleFor(file, facts) {
  const lower = file.path.toLowerCase();
  const base = path.posix.basename(lower);
  if (facts.legacyCompatibility || /(?:^|[_-])compat(?:ibility)?(?:[_-]|\.)/.test(base) || lower.includes("/wrappers/")) {
    return "COMPATIBILITY";
  }
  if (facts.thinWrapper) return "WRAPPER";
  if (/(?:fixture|mock|stub|fake)/.test(lower)) return "FIXTURE_SUPPORT";
  if (/(?:profile|selection|lineage)/.test(lower)) return "PROFILE_OR_SELECTION";
  if (/(?:closure|recovery)/.test(lower)) return "CLOSURE_OR_RECOVERY";
  if (/(?:migration|corrective|hotfix)/.test(lower)) return "MIGRATION_OR_CORRECTIVE";
  if (/(?:diagnostic|probe|audit|browser|smoke|canary)/.test(lower)) return "DIAGNOSTIC";
  if (/(?:_check|check\.)/.test(lower)) return "VALIDATION_CHECK";
  if (/(?:generate|generator|build|pack|export)/.test(lower)) return "GENERATED_OR_BUILD_HELPER";
  if (lower.includes("/lib/") && facts.staticCallers.length > 0) return "CANONICAL_LIBRARY";
  if (facts.packageCallers.length > 0 || facts.ciCallers.length > 0) return "CANONICAL_ENTRYPOINT";
  if (/(?:historical|legacy|round_[0-9]+)/.test(lower)) return "HISTORICAL_EVIDENCE_TOOL";
  return "UNKNOWN_REQUIRES_PROOF";
}

function authorityFor(lifecycle, facts) {
  const executionAuthority = facts.packageCallers.length > 0 || facts.ciCallers.length > 0
    ? "DECLARED_ENTRYPOINT"
    : ["WRAPPER", "COMPATIBILITY"].includes(lifecycle)
      ? "DELEGATED_EXECUTION"
      : facts.staticCallers.length > 0
        ? "CALLED_SUPPORT"
        : "UNKNOWN_REQUIRES_PROOF";
  const decisionAuthority = ["VALIDATION_CHECK", "DIAGNOSTIC", "FIXTURE_SUPPORT", "COMPATIBILITY", "WRAPPER"].includes(lifecycle)
    ? "NOT_BEHAVIORAL_DECISION_AUTHORITY"
    : lifecycle === "CANONICAL_LIBRARY"
      ? "RUNTIME_AUTHORITY_REQUIRES_CODE_REVIEW"
      : "UNKNOWN_REQUIRES_PROOF";
  return { executionAuthority, decisionAuthority };
}

function conclusionFor(record, file) {
  if (record.replacementEvidence.some((entry) => entry.evidenceKind === "EXPLICIT_SUPERSESSION")) {
    return "PROVEN_SUPERSEDED";
  }
  if (record.lifecycle === "COMPATIBILITY") return "PROVEN_COMPATIBILITY";
  if (record.lifecycle === "WRAPPER") return "PROVEN_WRAPPER";
  if (record.lifecycle === "HISTORICAL_EVIDENCE_TOOL" && record.documentationReferences.length > 0) {
    return "PROVEN_HISTORICAL";
  }
  if (record.packageCallers.length > 0 || record.ciCallers.length > 0 || record.staticCallers.length > 0) {
    return "PROVEN_ACTIVE";
  }
  if (file.manualCanonicalEvidence?.length > 0) return "MANUAL_CANONICAL_USE_PROVEN";
  if (file.repositoryHistoryEvidence?.length > 0) return "PROVEN_HISTORICAL";
  if (record.repositoryState === "UNTRACKED") return "MANUAL_USE_POSSIBLE_NOT_PROVEN";
  return "UNKNOWN_REQUIRES_PROOF";
}

function provenanceConfidenceFor(conclusion, record) {
  if (["PROVEN_ACTIVE", "PROVEN_WRAPPER", "PROVEN_SUPERSEDED"].includes(conclusion)) return "HIGH";
  if (["PROVEN_COMPATIBILITY", "PROVEN_HISTORICAL", "MANUAL_CANONICAL_USE_PROVEN"].includes(conclusion)) return "MEDIUM";
  if (record.documentationReferences.length > 0) return "MEDIUM";
  return "LOW";
}

function replacementEvidenceFor(file, facts) {
  const explicit = Array.isArray(file.supersessionEvidence) ? file.supersessionEvidence : [];
  return explicit
    .filter((entry) => entry && entry.replacement && entry.source && entry.statement)
    .map((entry) => ({
      source: slash(entry.source),
      replacement: slash(entry.replacement),
      statement: String(entry.statement),
      evidenceKind: "EXPLICIT_SUPERSESSION",
    }))
    .concat(
      facts.legacyCompatibility && facts.thinWrapper
        ? facts.staticReferences.map((replacement) => ({
            source: file.path,
            replacement,
            statement: "Current compatibility wrapper delegates to this repository target.",
            evidenceKind: "DELEGATION_TARGET",
          }))
        : [],
    )
    .sort((a, b) => `${a.source}|${a.replacement}`.localeCompare(`${b.source}|${b.replacement}`, "en"));
}

function sourcePurposeEvidenceFor(file) {
  const source = String(file.sourceText || "");
  const declaredTerminalSignals = uniqueSorted(
    [...source.matchAll(/["'`]([A-Z][A-Z0-9_:-]{7,})["'`]/g)]
      .map((match) => match[1])
      .filter((token) => /(?:PRE_18|STATUS|GREEN|BLOCK|READY|PASS|CLOSED|ROOT|FINAL|CORRECT)/.test(token)),
  ).slice(0, 24);
  return {
    assertionSignalCount: [...source.matchAll(/\bassert(?:\.[A-Za-z_$][\w$]*)?\s*\(/g)].length,
    browserHarnessReference: /(?:@playwright\/test|playwright-core|chromium\.launch)/.test(source),
    declaredTerminalSignals,
    sourceSha256: sha256(source),
  };
}

function createScriptRecords(snapshot, packageCommands, ciEntrypoints, packageAliasGroups) {
  const knownPaths = new Set(snapshot.files.map((file) => file.path));
  const pathsByBasename = new Map();
  for (const file of snapshot.files) {
    const basename = path.posix.basename(file.path);
    const paths = pathsByBasename.get(basename) || [];
    paths.push(file.path);
    pathsByBasename.set(basename, paths);
  }
  const uniquePathByBasename = new Map(
    [...pathsByBasename.entries()]
      .filter(([, paths]) => paths.length === 1)
      .map(([basename, paths]) => [basename, paths[0]]),
  );
  const ambiguousPathsByBasename = new Map(
    [...pathsByBasename.entries()].filter(([, paths]) => paths.length > 1),
  );
  const staticByPath = new Map(
    snapshot.files.map((file) => [
      file.path,
      extractStaticReferences(file, knownPaths, uniquePathByBasename),
    ]),
  );
  const callersByPath = new Map(snapshot.files.map((file) => [file.path, []]));
  const ambiguousCallersByPath = new Map(snapshot.files.map((file) => [file.path, []]));
  for (const [caller, references] of staticByPath) {
    for (const target of references) {
      callersByPath.get(target)?.push(caller);
    }
  }
  const filenamePattern = /[A-Za-z0-9_.-]+\.(?:js|mjs|cjs|ts|tsx|ps1|sh|cmd|bat)/gi;
  for (const file of snapshot.files) {
    for (const match of String(file.sourceText || "").matchAll(filenamePattern)) {
      for (const target of ambiguousPathsByBasename.get(match[0]) || []) {
        if (target !== file.path) ambiguousCallersByPath.get(target)?.push(file.path);
      }
    }
  }
  const aliasByCommand = new Map();
  for (const group of packageAliasGroups) {
    for (const entry of group.entries) {
      aliasByCommand.set(entry.commandKey, {
        groupId: group.groupId,
        canonicalCommand: group.canonicalCommand,
        relationship: entry.relationship,
      });
    }
  }
  return snapshot.files
    .map((file) => {
      const packageCallers = packageCommands
        .filter((entry) => entry.directTargets.includes(file.path))
        .map(packageCommandKey);
      const ciCallers = ciEntrypoints
        .filter((entry) => entry.resolvedTargets.includes(file.path))
        .flatMap((entry) => entry.callers);
      const packageAliasRelationships = packageCallers
        .map((key) => aliasByCommand.get(key))
        .filter(Boolean)
        .sort((a, b) => a.groupId.localeCompare(b.groupId, "en"));
      const staticReferences = staticByPath.get(file.path) || [];
      const staticCallers = uniqueSorted(callersByPath.get(file.path) || []);
      const ambiguousBasenameCallers = uniqueSorted(ambiguousCallersByPath.get(file.path) || []);
      const documentationReferences = documentationReferencesFor(file.path, snapshot.documentation || []);
      const legacyCompatibility = snapshot.baselineCompatibilityPaths?.includes(file.path) || false;
      const thinWrapper = isThinWrapper(file, staticReferences);
      const facts = {
        packageCallers: uniqueSorted(packageCallers),
        ciCallers: uniqueSorted(ciCallers),
        staticReferences,
        staticCallers,
        ambiguousBasenameCallers,
        legacyCompatibility,
        thinWrapper,
      };
      const lifecycle = lifecycleFor(file, facts);
      const authority = authorityFor(lifecycle, facts);
      const replacementEvidence = replacementEvidenceFor(file, facts);
      const artifactEvidence = extractArtifactReferenceDetails(file.sourceText);
      const record = {
        path: file.path,
        repositoryState: file.repositoryState,
        fileType: path.posix.extname(file.path).slice(1).toUpperCase(),
        packageCallers: facts.packageCallers,
        packageAliasRelationships,
        directScriptTarget: facts.packageCallers.length > 0,
        ciCallers: facts.ciCallers,
        staticReferences,
        staticCallers,
        ambiguousBasenameCallers,
        documentationReferences,
        ...artifactEvidence,
        lifecycle,
        executionAuthority: authority.executionAuthority,
        decisionAuthority: authority.decisionAuthority,
        ownerFamily: ownerFamilyFor(file.path),
        replacementEvidence,
        sourcePurposeEvidence: sourcePurposeEvidenceFor(file),
        repositoryHistoryEvidence: Array.isArray(file.repositoryHistoryEvidence)
          ? file.repositoryHistoryEvidence
          : [],
        manualCanonicalEvidence: Array.isArray(file.manualCanonicalEvidence)
          ? file.manualCanonicalEvidence
          : [],
        provenanceConfidence: "LOW",
        removalSafety: "NOT_PROVEN_SAFE",
        manualOrExternalUse: file.manualCanonicalEvidence?.length > 0 ? "PROVEN" : "UNKNOWN",
      };
      const provenanceConclusion = conclusionFor(record, file);
      record.provenanceConfidence = provenanceConfidenceFor(provenanceConclusion, record);
      record.provenanceConclusion = provenanceConclusion;
      record.removalSafety = ["PROVEN_SUPERSEDED", "PROVEN_ORPHAN"].includes(provenanceConclusion) && replacementEvidence.length > 0
        ? "REVIEW_ELIGIBLE_NOT_REMOVED"
        : "NOT_PROVEN_SAFE";
      return record;
    })
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
}

function milestoneFamilyFor(record) {
  const base = path.posix.basename(record.path || record.recordKey).replace(/\.[^.]+$/, "");
  if (base.startsWith("pre_18_")) return "PRE_18";
  const match = base.match(/^(m\d+|[a-z]+(?:_[a-z]+){0,2})/i);
  return (match?.[1] || "UNKNOWN").toUpperCase();
}

function toFileProvenanceRecord(script, cohortIds) {
  const positiveRemovalEvidence = script.replacementEvidence.filter(
    (entry) => entry.evidenceKind === "EXPLICIT_SUPERSESSION",
  );
  const retentionReason = script.packageCallers.length > 0 || script.ciCallers.length > 0
    ? "Declared package or CI entrypoint is current positive retention evidence."
    : script.staticCallers.length > 0
      ? "Current repository caller is positive retention evidence."
      : script.manualCanonicalEvidence.length > 0
        ? "Current repository documentation explicitly identifies this manual canonical entrypoint."
        : script.repositoryHistoryEvidence.length > 0
          ? "Content-addressed repository history proves the current file's historical evidence role; no removal proof exists."
      : script.lifecycle === "COMPATIBILITY"
        ? "Compatibility surface remains present; caller migration or external-use proof is outside this package."
        : "No repository caller is not removal proof; manual or external use remains unknown.";
  return {
    recordKey: `file:${script.path}`,
    recordType: "SCRIPT_FILE",
    path: script.path,
    repositoryState: script.repositoryState,
    cohortIds: uniqueSorted(cohortIds),
    packageCallers: script.packageCallers,
    ciCallers: script.ciCallers,
    staticCallers: script.staticCallers,
    ambiguousBasenameCallers: script.ambiguousBasenameCallers,
    staticReferences: script.staticReferences,
    documentationReferences: script.documentationReferences,
    artifactReferences: script.artifactReferences,
    artifactProducerReferences: script.artifactProducerReferences,
    artifactConsumerReferences: script.artifactConsumerReferences,
    artifactDirectionUnknownReferences: script.artifactDirectionUnknownReferences,
    lifecycle: script.lifecycle,
    executionAuthority: script.executionAuthority,
    decisionAuthority: script.decisionAuthority,
    ownerFamily: script.ownerFamily,
    milestoneFamily: milestoneFamilyFor(script),
    functionalUniqueness: script.staticCallers.length > 0 || script.packageCallers.length > 0
      ? "CURRENT_CALL_PATH_PRESENT"
      : script.repositoryHistoryEvidence.length > 0
        ? "HISTORICAL_REGRESSION_ROLE_PRESENT"
      : "UNKNOWN_REQUIRES_PROOF",
    replacementEvidence: script.replacementEvidence,
    sourcePurposeEvidence: script.sourcePurposeEvidence,
    repositoryHistoryEvidence: script.repositoryHistoryEvidence,
    manualCanonicalEvidence: script.manualCanonicalEvidence,
    supersessionProof: positiveRemovalEvidence.length > 0 ? "POSITIVE_EVIDENCE_PRESENT" : "NOT_PROVEN",
    manualOrExternalUse: script.manualOrExternalUse,
    provenanceConclusion: script.provenanceConclusion,
    provenanceConfidence: script.provenanceConfidence,
    positiveRemovalEvidence,
    retentionReason,
    removalSafety: script.removalSafety,
    currentEvidenceEvaluated: true,
  };
}

function buildProvenanceRegistry(topology, snapshot) {
  const scriptByPath = new Map(topology.scripts.map((record) => [record.path, record]));
  const noRepoCaller = (record) =>
    record.packageCallers.length === 0 &&
    record.ciCallers.length === 0 &&
    record.staticCallers.length === 0 &&
    record.ambiguousBasenameCallers.length === 0;
  const cohortAPaths = topology.scripts
    .filter((record) =>
      record.repositoryState === "UNTRACKED" &&
      path.posix.basename(record.path).startsWith("pre_18_") &&
      noRepoCaller(record) &&
      !FOUNDATION_PATHS.has(record.path),
    )
    .map((record) => record.path);
  const cohortBPaths = topology.scripts
    .filter((record) =>
      record.repositoryState === "UNTRACKED" &&
      /(?:^|_)(?:corrective|fix|regression|final|(?:remaining|residual)\d*)(?:_|\.|$)/i.test(
        path.posix.basename(record.path),
      ) &&
      noRepoCaller(record) &&
      !FOUNDATION_PATHS.has(record.path),
    )
    .map((record) => record.path);
  const cohortCPaths = uniqueSorted(
    (snapshot.baselineCompatibilityPaths || []).filter((filePath) => scriptByPath.has(filePath)),
  );
  const cohortEPaths = uniqueSorted(
    (snapshot.baselineNeedsReviewPaths || []).filter(
      (filePath) => scriptByPath.get(filePath)?.repositoryState === "TRACKED",
    ),
  );
  const cohortsByPath = new Map();
  const addPaths = (cohortId, paths) => {
    for (const filePath of paths) {
      const ids = cohortsByPath.get(filePath) || [];
      ids.push(cohortId);
      cohortsByPath.set(filePath, ids);
    }
  };
  addPaths("UNTRACKED_PRE18_NO_REPO_CALLER", cohortAPaths);
  addPaths("CORRECTIVE_NO_RUNTIME_PACKAGE_CI_CALLER", cohortBPaths);
  addPaths("COMPATIBILITY_SCRIPT", cohortCPaths);
  addPaths("TRACKED_NEEDS_REVIEW", cohortEPaths);
  addPaths(
    "EVIDENCE_DRIVEN_PROVENANCE",
    topology.scripts
      .filter((record) =>
        record.replacementEvidence.length > 0 ||
        ["COMPATIBILITY", "WRAPPER"].includes(record.lifecycle),
      )
      .map((record) => record.path),
  );

  const records = [...cohortsByPath.entries()].map(([filePath, cohortIds]) =>
    toFileProvenanceRecord(scriptByPath.get(filePath), cohortIds),
  );
  const packageAliasRecords = [];
  for (const group of topology.packageAliasGroups) {
    for (const entry of group.entries.filter((candidate) => candidate.relationship === "ALIAS_OR_MODE")) {
      const packageEntry = topology.packageCommands.find(
        (candidate) => packageCommandKey(candidate) === entry.commandKey,
      );
      packageAliasRecords.push({
        recordKey: `package:${entry.commandKey}`,
        recordType: "PACKAGE_ALIAS_OR_MODE",
        path: packageEntry.packagePath,
        repositoryState: "TRACKED",
        cohortIds: ["PACKAGE_ALIAS_OR_MODE_ENTRY"],
        packageCallers: [entry.commandKey],
        ciCallers: [],
        staticCallers: [],
        staticReferences: packageEntry.directTargets,
        documentationReferences: [],
        artifactReferences: [],
        lifecycle: "COMPATIBILITY",
        executionAuthority: "DELEGATED_EXECUTION",
        decisionAuthority: "NOT_BEHAVIORAL_DECISION_AUTHORITY",
        ownerFamily: `PACKAGE_${packageEntry.packageId.toUpperCase()}`,
        milestoneFamily: "PACKAGE_ALIAS",
        functionalUniqueness: "SHARED_TARGET_OR_COMMAND",
        replacementEvidence: [{
          source: packageEntry.packagePath,
          replacement: group.canonicalCommand,
          statement: "Current package entries share the same direct target or exact command.",
        }],
        supersessionProof: "NOT_PROVEN",
        manualOrExternalUse: "UNKNOWN",
        provenanceConclusion: "PROVEN_COMPATIBILITY",
        provenanceConfidence: "HIGH",
        positiveRemovalEvidence: [],
        retentionReason: "Alias or mode remains declared in the current package manifest.",
        removalSafety: "NOT_PROVEN_SAFE",
        currentEvidenceEvaluated: true,
        packageAliasGroupId: group.groupId,
        packageCommand: packageEntry.command,
        directScriptTarget: packageEntry.directScriptTarget,
      });
    }
  }
  records.push(...packageAliasRecords);
  records.sort((a, b) => a.recordKey.localeCompare(b.recordKey, "en"));

  const fileRecordsFor = (paths) => paths.map((filePath) =>
    records.find((record) => record.recordKey === `file:${filePath}`),
  ).filter(Boolean);
  const explained = (record) => record.currentEvidenceEvaluated && (
    record.provenanceConclusion !== "UNKNOWN_REQUIRES_PROOF" ||
    record.retentionReason.length > 0
  );
  const cohort = (id, cohortRecords, extra = {}) => ({
    cohortId: id,
    memberCount: cohortRecords.length,
    explainedCount: cohortRecords.filter(explained).length,
    records: cohortRecords,
    ...extra,
  });
  const compatibilityRecords = fileRecordsFor(cohortCPaths);
  const aliasRecords = records.filter((record) => record.recordType === "PACKAGE_ALIAS_OR_MODE");
  const conclusions = Object.fromEntries(
    PROVENANCE_CONCLUSIONS.map((conclusion) => [
      conclusion,
      records.filter((record) => record.provenanceConclusion === conclusion).length,
    ]),
  );
  const provenRetainRecordKeys = records
    .filter((record) =>
      [
        "PROVEN_ACTIVE",
        "PROVEN_WRAPPER",
        "PROVEN_COMPATIBILITY",
        "PROVEN_HISTORICAL",
        "MANUAL_CANONICAL_USE_PROVEN",
      ].includes(
        record.provenanceConclusion,
      ),
    )
    .map((record) => record.recordKey);
  const provenSupersededOrOrphanRecordKeys = records
    .filter((record) => ["PROVEN_SUPERSEDED", "PROVEN_ORPHAN"].includes(record.provenanceConclusion))
    .map((record) => record.recordKey);
  const unresolvedRecordKeys = records
    .filter((record) =>
      ["MANUAL_USE_POSSIBLE_NOT_PROVEN", "UNKNOWN_REQUIRES_PROOF"].includes(record.provenanceConclusion),
    )
    .map((record) => record.recordKey);
  const noCurrentCaller = (record) =>
    record.packageCallers.length === 0 &&
    record.ciCallers.length === 0 &&
    record.staticCallers.length === 0;
  const newlyResolvedRecords = records.filter((record) =>
    record.recordType === "SCRIPT_FILE" &&
    noCurrentCaller(record) &&
    ["PROVEN_HISTORICAL", "MANUAL_CANONICAL_USE_PROVEN"].includes(record.provenanceConclusion) &&
    (record.repositoryHistoryEvidence.length > 0 || record.manualCanonicalEvidence.length > 0),
  );
  const newlyResolvedRecordKeys = new Set(newlyResolvedRecords.map((record) => record.recordKey));
  const newlyResolvedCorrectiveRecords = fileRecordsFor(cohortBPaths).filter((record) =>
    newlyResolvedRecordKeys.has(record.recordKey),
  );
  const newlyResolvedUntrackedRecords = fileRecordsFor(cohortAPaths).filter((record) =>
    newlyResolvedRecordKeys.has(record.recordKey),
  );
  const correctiveRecordKeys = new Set(fileRecordsFor(cohortBPaths).map((record) => record.recordKey));
  const untrackedRecordKeys = new Set(fileRecordsFor(cohortAPaths).map((record) => record.recordKey));
  const currentCallersFor = (record) => uniqueSorted([
    ...record.packageCallers,
    ...record.ciCallers,
    ...record.staticCallers,
  ]);
  const correctiveResolutionRecords = newlyResolvedCorrectiveRecords.map((record) => ({
    artifactEvidenceDependencies: record.artifactReferences,
    confidence: record.provenanceConfidence,
    currentCallers: currentCallersFor(record),
    finalProvenanceConclusion: record.provenanceConclusion,
    historicalCallerStatus: "NOT_PROVEN",
    historicalCallers: [],
    lastKnownPurpose: record.sourcePurposeEvidence.declaredTerminalSignals[0]
      || `${record.milestoneFamily}:${record.lifecycle}`,
    lifecycle: record.lifecycle,
    milestoneFamily: record.milestoneFamily,
    manualCanonicalEvidence: record.manualCanonicalEvidence,
    path: record.path,
    positiveSupersessionEvidence: record.positiveRemovalEvidence,
    repositoryHistoryEvidence: record.repositoryHistoryEvidence,
    replacementCandidates: record.replacementEvidence.map((entry) => entry.replacement),
    retentionReason: record.retentionReason,
    retentionRequired: record.removalSafety === "NOT_PROVEN_SAFE",
    sourcePurposeEvidence: record.sourcePurposeEvidence,
    uniqueRegressionValue: record.sourcePurposeEvidence.assertionSignalCount > 0
      ? "SOURCE_ENCODES_ASSERTION_SIGNALS"
      : record.sourcePurposeEvidence.browserHarnessReference
        ? "SOURCE_ENCODES_BROWSER_EVIDENCE_FLOW"
        : "SOURCE_ENCODES_STANDALONE_EVIDENCE_FLOW",
  }));
  const topo04bResolution = {
    baselineProvenanceSha256: "3c310872d17d0ba7083ef75025b4e7cb93c4f845b0ccecc1b1be0994babe67ff",
    correctiveResolutionRecords,
    endUnresolvedCount: unresolvedRecordKeys.length,
    newlyResolvedCorrectiveRecordKeys: newlyResolvedCorrectiveRecords.map((record) => record.recordKey),
    newlyResolvedTrackedRecordKeys: newlyResolvedRecords
      .filter((record) => record.repositoryState === "TRACKED")
      .map((record) => record.recordKey),
    newlyResolvedUntrackedRecordKeys: newlyResolvedUntrackedRecords.map((record) => record.recordKey),
    recordsRequiringExternalManualHistory: unresolvedRecordKeys,
    startUnresolvedCount: newlyResolvedRecords.length + unresolvedRecordKeys.length,
    stillUnresolvedCorrectiveRecordKeys: unresolvedRecordKeys.filter((recordKey) =>
      correctiveRecordKeys.has(recordKey),
    ),
    stillUnresolvedUntrackedRecordKeys: unresolvedRecordKeys.filter((recordKey) =>
      untrackedRecordKeys.has(recordKey),
    ),
  };
  return {
    registryVersion: REGISTRY_VERSION,
    scope: "TOPO_04_PROVENANCE_FIRST_LEGACY_REVIEW",
    records,
    sets: {
      provenRetainRecordKeys,
      provenSupersededOrOrphanRecordKeys,
      unresolvedRecordKeys,
    },
    topo04bResolution,
    cohorts: {
      untrackedPre18NoRepoCaller: cohort(
        "UNTRACKED_PRE18_NO_REPO_CALLER",
        fileRecordsFor(cohortAPaths),
      ),
      correctiveNoRuntimePackageCiCaller: cohort(
        "CORRECTIVE_NO_RUNTIME_PACKAGE_CI_CALLER",
        fileRecordsFor(cohortBPaths),
      ),
      compatibilityScripts: cohort("COMPATIBILITY_SCRIPT", compatibilityRecords),
      packageAliasEntries: cohort("PACKAGE_ALIAS_OR_MODE_ENTRY", aliasRecords, {
        groupCount: topology.packageAliasGroups.length,
      }),
      trackedNeedsReview: cohort("TRACKED_NEEDS_REVIEW", fileRecordsFor(cohortEPaths)),
    },
    summary: {
      totalReviewRecordCount: records.length,
      provenanceConclusionCounts: conclusions,
      provenRetainCount: provenRetainRecordKeys.length,
      provenSupersededOrOrphanCount: provenSupersededOrOrphanRecordKeys.length,
      unresolvedRecordCount: unresolvedRecordKeys.length,
    },
  };
}

export function buildRegistryFromSnapshot(inputSnapshot) {
  const snapshot = {
    repositoryId: inputSnapshot.repositoryId || "servis-platform",
    files: [...(inputSnapshot.files || [])]
      .map((file) => ({ ...file, path: slash(file.path) }))
      .filter((file) => isRelevantScript(file.path))
      .sort((a, b) => a.path.localeCompare(b.path, "en")),
    packageCommands: [...(inputSnapshot.packageCommands || [])],
    ciRuns: inputSnapshot.ciRuns || inputSnapshot.ciEntrypoints || [],
    documentation: [...(inputSnapshot.documentation || [])]
      .map((document) => ({ ...document, path: slash(document.path) }))
      .sort((a, b) => a.path.localeCompare(b.path, "en")),
    baselineNeedsReviewPaths: inputSnapshot.baselineNeedsReviewPaths || [],
    baselineCompatibilityPaths: inputSnapshot.baselineCompatibilityPaths || [],
  };
  if (!inputSnapshot.baselineNeedsReviewPaths && !inputSnapshot.baselineCompatibilityPaths) {
    const baseline = parseLegacyBaseline(snapshot.documentation);
    snapshot.baselineNeedsReviewPaths = baseline.needsReviewPaths;
    snapshot.baselineCompatibilityPaths = baseline.compatibilityPaths;
  }
  const knownPaths = new Set(snapshot.files.map((file) => file.path));
  const packageCommands = snapshot.packageCommands.length > 0
    ? snapshot.packageCommands.map((entry) => {
        const packageDirectory = entry.packageDirectory ?? PACKAGE_SOURCES.find(
          (source) => source.packageId === entry.packageId,
        )?.directory ?? "";
        const directTargets = entry.directTargets || resolveCommandTargets(
          entry.command,
          packageDirectory,
          knownPaths,
          true,
        );
        return {
          ...entry,
          packageDirectory,
          directTargets,
          directScriptTarget: entry.directScriptTarget || directTargets[0] || null,
        };
      })
    : [];
  packageCommands.sort((a, b) => packageCommandKey(a).localeCompare(packageCommandKey(b), "en"));
  const packageAliasGroups = buildPackageAliases(packageCommands);
  const ciEntrypoints = collectCiEntrypoints(snapshot, packageCommands, knownPaths);
  const scripts = createScriptRecords(snapshot, packageCommands, ciEntrypoints, packageAliasGroups);
  const missingTargets = uniqueSorted(
    packageCommands.flatMap((entry) => entry.directTargets).filter((target) => !knownPaths.has(target)),
  );
  const topology = {
    registryVersion: REGISTRY_VERSION,
    scope: "TOPO_01_MACHINE_READABLE_HARNESS_TOPOLOGY",
    scripts,
    packageCommands,
    packageAliasGroups,
    ciEntrypoints,
    summary: {
      totalScriptCount: scripts.length,
      trackedScriptCount: scripts.filter((record) => record.repositoryState === "TRACKED").length,
      untrackedScriptCount: scripts.filter((record) => record.repositoryState === "UNTRACKED").length,
      relevantIgnoredScriptCount: scripts.filter((record) => record.repositoryState === "RELEVANT_IGNORED").length,
      packageCommandCount: packageCommands.length,
      packageAliasGroupCount: packageAliasGroups.length,
      packageAliasEntryCount: packageAliasGroups.reduce((sum, group) => sum + group.entries.length - 1, 0),
      ciEntrypointCount: ciEntrypoints.length,
    },
  };
  const provenance = buildProvenanceRegistry(topology, snapshot);
  const validation = {
    schemaValid: true,
    duplicateScriptPathCount: scripts.length - new Set(scripts.map((record) => record.path)).size,
    brokenPackageScriptTargetCount: missingTargets.length,
    brokenPackageScriptTargets: missingTargets,
    ciEntrypointNotCanonicalCount: ciEntrypoints.filter((entry) => entry.resolution === "UNRESOLVED_PACKAGE_COMMAND").length,
    provenanceRecordWithoutCohortCount: provenance.records.filter((record) => record.cohortIds.length === 0).length,
    behavioralAuthorityChanged: false,
  };
  const metadata = {
    registryVersion: REGISTRY_VERSION,
    repositoryId: snapshot.repositoryId,
    behavioralDecisionAuthority: false,
    documentationIsAuthoritative: false,
    sourcePrecedence: [
      "CURRENT_GIT_AND_FILESYSTEM",
      "CURRENT_PACKAGE_MANIFESTS",
      "CURRENT_CI_WORKFLOWS",
      "CURRENT_STATIC_REFERENCES",
      "CURRENT_ARTIFACT_REFERENCES",
      "DOCUMENTATION_REFERENCE_OR_BASELINE_ONLY",
    ],
    volatilityPolicy: "TIME_RUN_AND_MACHINE_LOCAL_FIELDS_OMITTED",
  };
  return { metadata, topology, provenance, validation };
}

function collectRepositorySnapshot(repoRoot) {
  const scopedRoots = ["--", "backend/scripts", "web/scripts", "mobile/scripts", "tools"];
  const tracked = gitList(repoRoot, ["ls-files", "-z", "--cached", ...scopedRoots]);
  const untracked = gitList(repoRoot, ["ls-files", "-z", "--others", "--exclude-standard", ...scopedRoots]);
  const ignored = gitList(repoRoot, ["ls-files", "-z", "--others", "--ignored", "--exclude-standard", ...scopedRoots]);
  const states = new Map();
  for (const filePath of tracked.filter(isRelevantScript)) states.set(filePath, "TRACKED");
  for (const filePath of untracked.filter(isRelevantScript)) states.set(filePath, "UNTRACKED");
  for (const filePath of ignored.filter(isRelevantScript)) states.set(filePath, "RELEVANT_IGNORED");
  const files = [...states.entries()]
    .map(([filePath, repositoryState]) => ({
      path: filePath,
      repositoryState,
      sourceText: safeReadText(repoRoot, filePath),
    }))
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
  const knownPaths = new Set(files.map((file) => file.path));
  const packageCommands = collectPackageCommands(repoRoot, knownPaths);
  const repositoryTracked = gitList(repoRoot, ["ls-files", "-z", "--cached"]);
  const repositoryUntracked = gitList(repoRoot, ["ls-files", "-z", "--others", "--exclude-standard"]);
  const docPaths = uniqueSorted(
    [...repositoryTracked, ...repositoryUntracked].filter((filePath) =>
      /(?:^|\/)(?:README[^/]*|docs\/[^/]+\.(?:md|json))$/i.test(filePath),
    ),
  );
  const documentation = docPaths.map((filePath) => ({
    path: filePath,
    text: safeReadText(repoRoot, filePath),
  }));
  const baseline = parseLegacyBaseline(documentation);
  const repositoryCaptureHistory = collectRepositoryCaptureHistory(
    repoRoot,
    files.filter((file) => file.repositoryState === "UNTRACKED").map((file) => file.path),
  );
  const currentCommitHistory = collectCurrentCommitHistory(
    repoRoot,
    baseline.needsReviewPaths.filter((filePath) => states.get(filePath) === "TRACKED"),
  );
  for (const file of files) {
    file.repositoryHistoryEvidence = [
      ...(repositoryCaptureHistory.get(file.path) || []),
      ...(currentCommitHistory.get(file.path) || []),
    ].sort((a, b) => a.evidenceReference.localeCompare(b.evidenceReference, "en"));
    file.manualCanonicalEvidence = manualCanonicalEvidenceFor(file.path, documentation);
  }
  const workflowPaths = uniqueSorted(
    [...repositoryTracked, ...repositoryUntracked].filter((filePath) => /^\.github\/workflows\/.*\.ya?ml$/i.test(filePath)),
  );
  const ciRuns = workflowPaths.flatMap((workflowPath) =>
    parseWorkflowRuns(workflowPath, safeReadText(repoRoot, workflowPath)),
  );
  return {
    repositoryId: path.basename(repoRoot),
    files,
    packageCommands,
    ciRuns,
    documentation,
    baselineNeedsReviewPaths: baseline.needsReviewPaths,
    baselineCompatibilityPaths: baseline.compatibilityPaths,
  };
}

export async function buildRepositoryRegistry(repoRoot) {
  return buildRegistryFromSnapshot(collectRepositorySnapshot(path.resolve(repoRoot)));
}

export function validateRegistryBundle(bundle) {
  const lifecycle = new Set(LIFECYCLE_CLASSES);
  const conclusions = new Set(PROVENANCE_CONCLUSIONS);
  const scripts = bundle?.topology?.scripts || [];
  const records = bundle?.provenance?.records || [];
  const requiredScriptFields = [
    "path",
    "repositoryState",
    "fileType",
    "packageCallers",
    "packageAliasRelationships",
    "directScriptTarget",
    "ciCallers",
    "staticReferences",
    "staticCallers",
    "documentationReferences",
    "artifactReferences",
    "artifactProducerReferences",
    "artifactConsumerReferences",
    "lifecycle",
    "executionAuthority",
    "decisionAuthority",
    "ownerFamily",
    "replacementEvidence",
    "provenanceConfidence",
    "removalSafety",
  ];
  const invalidScriptShapeCount = scripts.filter((record) =>
    requiredScriptFields.some((field) => !Object.hasOwn(record, field)) || !lifecycle.has(record.lifecycle),
  ).length;
  const invalidConclusionCount = records.filter((record) =>
    !conclusions.has(record.provenanceConclusion),
  ).length;
  const unsafeUnprovenRemovalCount = records.filter((record) =>
    record.removalSafety !== "NOT_PROVEN_SAFE" && record.positiveRemovalEvidence.length === 0,
  ).length;
  return {
    schemaValid: invalidScriptShapeCount === 0 && invalidConclusionCount === 0,
    invalidScriptShapeCount,
    invalidConclusionCount,
    unsafeUnprovenRemovalCount,
    duplicateScriptPathCount: scripts.length - new Set(scripts.map((record) => record.path)).size,
    duplicateProvenanceRecordCount: records.length - new Set(records.map((record) => record.recordKey)).size,
    provenanceRecordWithoutCohortCount: records.filter((record) => record.cohortIds.length === 0).length,
  };
}

export function getRegistryPaths(repoRoot) {
  const directory = path.join(
    path.resolve(repoRoot),
    "backend/artifacts/harness-topology/pre-18-topo-01-topo-04",
  );
  return {
    directory,
    topology: path.join(directory, "topology-registry.json"),
    provenance: path.join(directory, "provenance-registry.json"),
    summary: path.join(directory, "summary.json"),
  };
}

export async function writeRegistryBundle(repoRoot) {
  const bundle = await buildRepositoryRegistry(repoRoot);
  const validation = validateRegistryBundle(bundle);
  if (!validation.schemaValid || validation.unsafeUnprovenRemovalCount > 0) {
    throw new Error(`REGISTRY_VALIDATION_FAILED:${JSON.stringify(validation)}`);
  }
  const paths = getRegistryPaths(repoRoot);
  fs.mkdirSync(paths.directory, { recursive: true });
  const topologyText = canonicalJson({ metadata: bundle.metadata, topology: bundle.topology, validation: bundle.validation });
  const provenanceText = canonicalJson({ metadata: bundle.metadata, provenance: bundle.provenance });
  const summary = {
    registryVersion: REGISTRY_VERSION,
    topologySha256: sha256(topologyText),
    provenanceSha256: sha256(provenanceText),
    topologySummary: bundle.topology.summary,
    provenanceSummary: bundle.provenance.summary,
    validation: { ...bundle.validation, ...validation },
  };
  fs.writeFileSync(paths.topology, topologyText, "utf8");
  fs.writeFileSync(paths.provenance, provenanceText, "utf8");
  fs.writeFileSync(paths.summary, canonicalJson(summary), "utf8");
  return { bundle, paths, summary };
}
