import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0130I]/g, "i")
    .replace(/[\u0131]/g, "i")
    .replace(/[\u015e\u015f]/g, "s")
    .replace(/[\u011e\u011f]/g, "g")
    .replace(/[\u00dc\u00fc]/g, "u")
    .replace(/[\u00d6\u00f6]/g, "o")
    .replace(/[\u00c7\u00e7]/g, "c")
    .replace(/[\u2019\u2018`]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function expect(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function sorted(arr) {
  return [...arr].sort((a, b) => a.localeCompare(b));
}

console.log("=== M90C.6 HOT-FILE QUEUE POLICY CHECK ===");

const state = JSON.parse(read("tools/repo_contract_state.json"));
const report = JSON.parse(read("artifacts/repo-audit/repo_audit_latest.json"));
const primer = read("docs/PRIMER_SSOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const toolsReadme = read("tools/README.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const milestone = read("docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md");
const runbook = read("docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md");
const livingMilestone = read("docs/MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");
const livingRunbook = read("docs/RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");

const policy = state.hotFileQueuePolicy || {};
const classifications = policy.classifications || {};
const actual = sorted([
  ...report.largeFiles.map((entry) => entry.file),
  ...report.warningHotFiles.map((entry) => entry.file)
]);
const planned = sorted(Object.keys(classifications));

expect((state.activeMilestones || []).includes("M90C.6"), "state active milestones include M90C.6");
expect(Number(policy.warningThreshold) === 1000 && Number(policy.blockThreshold) === 1200, "state policy keeps repo audit thresholds");
expect(report.largeFiles.length === Number(policy.currentLargeFileCount), "repo audit large file count matches policy snapshot");
expect(report.warningHotFiles.length === Number(policy.currentWarningHotFileCount), "repo audit warning hot file count matches policy snapshot");
expect(JSON.stringify(actual) === JSON.stringify(planned), "policy classification set matches repo audit hot/large file set exactly");

const expectedClasses = {
  "backend/src/ai/chat/helpComposer.js": "justified-exception",
  "backend/src/routes/agreements.js": "acceptance-sensitive-later",
  "backend/prisma/schema.prisma": "justified-exception",
  "backend/src/routes/shifts/room.js": "acceptance-sensitive-later",
  "backend/src/routes/shifts/company.js": "acceptance-sensitive-later",
};
for (const [file, expectedClass] of Object.entries(expectedClasses)) {
  expect(classifications[file]?.class === expectedClass, `${file} classified as ${expectedClass}`);
}

const docsBundle = [primer, backlog, toolsPrimer, toolsReadme, scriptGuide, milestone, runbook, livingMilestone, livingRunbook].join("\n");
expect(includesText(docsBundle, "M90C.6"), "canonical docs mention M90C.6");
expect(includesText(docsBundle, "hot-file queue policy"), "canonical docs mention hot-file queue policy");
expect(includesText(docsBundle, "justified exception"), "canonical docs mention justified exception class");
expect(includesText(docsBundle, "safe candidate review"), "canonical docs mention safe candidate review class");
expect(includesText(docsBundle, "acceptance-sensitive / later") || includesText(docsBundle, "acceptance-sensitive-later"), "canonical docs mention acceptance-sensitive later class");
expect((includesText(backlog, "M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 kapandi") || includesText(backlog, "M90C.1, M90C.2, M90C.3, M90C.4 ve M90C.5 kapanmistir") || includesText(backlog, "M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 / M90C.7 kapandi")), "backlog preserves closure chain before and after M90C.6");
expect(includesText(primer, "M90C.6") && includesText(primer, "hot-file queue policy"), "primer preserves M90C.6 hot-file queue policy record");
expect(includesText(toolsReadme, "pack_m90_c6_hot_file_queue_policy.ps1"), "tools readme exposes M90C.6 pack command");
expect(includesText(scriptGuide, "RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md"), "script guide exposes M90C.6 runbook");

if (process.exitCode) process.exit(process.exitCode);
console.log("M90C.6 HOT-FILE QUEUE POLICY CHECK PASS");
