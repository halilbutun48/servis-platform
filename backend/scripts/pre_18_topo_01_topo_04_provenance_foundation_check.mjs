#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(
  repoRoot,
  "backend/scripts/lib/pre_18_harness_topology_provenance_registry.mjs",
);

let registryApi = null;
let registryImportError = null;
try {
  registryApi = await import(pathToFileURL(libraryPath).href);
} catch (error) {
  registryImportError = error;
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

function api() {
  assert.equal(
    registryImportError,
    null,
    `TOPOLOGY_REGISTRY_API_MISSING:${registryImportError?.code || registryImportError?.message}`,
  );
  return registryApi;
}

const fixtureSnapshot = Object.freeze({
  repositoryId: "fixture-repository",
  files: [
    {
      path: "backend/scripts/canonical_runner.mjs",
      repositoryState: "TRACKED",
      sourceText: "import './lib/shared.mjs';\nfs.writeFileSync('backend/artifacts/demo/results.json', '{}');\n",
    },
    {
      path: "backend/scripts/compat_runner.mjs",
      repositoryState: "TRACKED",
      sourceText: "// compatibility wrapper\nawait import('./canonical_runner.mjs');\n",
    },
    {
      path: "backend/scripts/old_runner.mjs",
      repositoryState: "TRACKED",
      sourceText: "// historical runner\n",
      supersessionEvidence: [
        {
          source: "docs/RUNBOOK.md",
          replacement: "backend/scripts/canonical_runner.mjs",
          statement: "old_runner is superseded by canonical_runner",
        },
      ],
    },
    {
      path: "backend/scripts/pre_18_lonely_corrective_check.mjs",
      repositoryState: "UNTRACKED",
      sourceText: "fs.readFileSync('backend/artifacts/demo/evidence.json', 'utf8');\n",
    },
    {
      path: "backend/scripts/pre_18_captured_historical_check.mjs",
      repositoryState: "UNTRACKED",
      sourceText: "assert.equal(true, true);\n",
      repositoryHistoryEvidence: [
        {
          evidenceKind: "EXACT_BLOB_IN_REPOSITORY_CAPTURE",
          evidenceReference: "git-tree:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:backend/scripts/pre_18_captured_historical_check.mjs",
          objectOid: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          path: "backend/scripts/pre_18_captured_historical_check.mjs",
        },
      ],
    },
    {
      path: "backend/scripts/lib/shared.mjs",
      repositoryState: "TRACKED",
      sourceText: "export const shared = true;\n",
    },
  ],
  packageCommands: [
    {
      packageId: "root",
      packagePath: "package.json",
      name: "check:canonical",
      command: "node backend/scripts/canonical_runner.mjs",
    },
    {
      packageId: "root",
      packagePath: "package.json",
      name: "check:canonical:alias",
      command: "node backend/scripts/canonical_runner.mjs",
    },
  ],
  ciEntrypoints: [
    {
      workflowPath: ".github/workflows/verify.yml",
      job: "verify",
      step: "Canonical check",
      command: "npm run check:canonical",
    },
  ],
  documentation: [
    {
      path: "docs/RUNBOOK.md",
      text: "Run backend/scripts/compat_runner.mjs for compatibility. old_runner is superseded by canonical_runner.",
    },
  ],
});

let fixtureBundlePromise = null;
function fixtureBundle() {
  fixtureBundlePromise ||= Promise.resolve(api().buildRegistryFromSnapshot(fixtureSnapshot));
  return fixtureBundlePromise;
}

let repositoryBundlePromise = null;
function repositoryBundle() {
  repositoryBundlePromise ||= api().buildRepositoryRegistry(repoRoot);
  return repositoryBundlePromise;
}

test("exports the complete bounded lifecycle vocabulary", () => {
  const expected = [
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
  ];
  assert.deepEqual(api().LIFECYCLE_CLASSES, expected);
});

test("exports only the approved provenance conclusions", () => {
  const expected = [
    "PROVEN_ACTIVE",
    "PROVEN_WRAPPER",
    "PROVEN_COMPATIBILITY",
    "PROVEN_HISTORICAL",
    "PROVEN_SUPERSEDED",
    "PROVEN_ORPHAN",
    "MANUAL_CANONICAL_USE_PROVEN",
    "MANUAL_USE_POSSIBLE_NOT_PROVEN",
    "UNKNOWN_REQUIRES_PROOF",
  ];
  assert.deepEqual(api().PROVENANCE_CONCLUSIONS, expected);
});

test("canonical JSON is byte deterministic across equivalent input order", () => {
  const first = api().canonicalJson({ z: [{ b: 2, a: 1 }], a: true });
  const second = api().canonicalJson({ a: true, z: [{ a: 1, b: 2 }] });
  assert.equal(first, second);
});

test("registry output excludes timestamps run ids and absolute repository paths", async () => {
  const serialized = api().canonicalJson(await fixtureBundle());
  assert.equal(serialized.includes("generatedAt"), false);
  assert.equal(serialized.includes("runId"), false);
  assert.equal(serialized.includes(repoRoot.replaceAll("\\", "/")), false);
});

test("zero caller evidence never proves orphan or safe removal", async () => {
  const bundle = await fixtureBundle();
  const record = bundle.provenance.records.find(
    (entry) => entry.path === "backend/scripts/pre_18_lonely_corrective_check.mjs",
  );
  assert.equal(record.provenanceConclusion, "MANUAL_USE_POSSIBLE_NOT_PROVEN");
  assert.equal(record.removalSafety, "NOT_PROVEN_SAFE");
});

test("exact repository capture history resolves an untracked no-caller asset as historical retain", async () => {
  const bundle = await fixtureBundle();
  const record = bundle.provenance.records.find(
    (entry) => entry.path === "backend/scripts/pre_18_captured_historical_check.mjs",
  );
  assert.equal(record.provenanceConclusion, "PROVEN_HISTORICAL");
  assert.equal(record.repositoryHistoryEvidence.length, 1);
  assert.equal(record.removalSafety, "NOT_PROVEN_SAFE");
  assert.equal(bundle.provenance.sets.provenRetainRecordKeys.includes(record.recordKey), true);
});

test("positive replacement evidence is required for proven supersession", async () => {
  const bundle = await fixtureBundle();
  const oldRecord = bundle.provenance.records.find(
    (entry) => entry.path === "backend/scripts/old_runner.mjs",
  );
  const lonelyRecord = bundle.provenance.records.find(
    (entry) => entry.path === "backend/scripts/pre_18_lonely_corrective_check.mjs",
  );
  assert.equal(oldRecord.provenanceConclusion, "PROVEN_SUPERSEDED");
  assert.equal(oldRecord.replacementEvidence[0].replacement, "backend/scripts/canonical_runner.mjs");
  assert.notEqual(lonelyRecord.provenanceConclusion, "PROVEN_SUPERSEDED");
});

test("compatibility wrapper retains wrapper and replacement evidence", async () => {
  const bundle = await fixtureBundle();
  const record = bundle.provenance.records.find(
    (entry) => entry.path === "backend/scripts/compat_runner.mjs",
  );
  assert.equal(record.lifecycle, "COMPATIBILITY");
  assert.equal(record.provenanceConclusion, "PROVEN_COMPATIBILITY");
  assert.deepEqual(record.staticReferences, ["backend/scripts/canonical_runner.mjs"]);
});

test("package commands sharing one target form a deterministic alias group", async () => {
  const bundle = await fixtureBundle();
  assert.equal(bundle.topology.packageAliasGroups.length, 1);
  assert.equal(bundle.topology.packageAliasGroups[0].directTarget, "backend/scripts/canonical_runner.mjs");
  assert.equal(bundle.topology.packageAliasGroups[0].entries.length, 2);
  assert.equal(bundle.topology.summary.packageAliasEntryCount, 1);
});

test("CI package invocation resolves to its canonical package command", async () => {
  const bundle = await fixtureBundle();
  assert.equal(bundle.topology.ciEntrypoints[0].resolution, "PACKAGE_COMMAND");
  assert.equal(bundle.topology.ciEntrypoints[0].resolvedTargets[0], "backend/scripts/canonical_runner.mjs");
  assert.equal(bundle.validation.ciEntrypointNotCanonicalCount, 0);
});

test("static import references resolve relative to the owning script", async () => {
  const bundle = await fixtureBundle();
  const runner = bundle.topology.scripts.find(
    (entry) => entry.path === "backend/scripts/canonical_runner.mjs",
  );
  assert.deepEqual(runner.staticReferences, ["backend/scripts/lib/shared.mjs"]);
});

test("documentation references are recorded but never used as discovery authority", async () => {
  const bundle = await fixtureBundle();
  const wrapper = bundle.topology.scripts.find(
    (entry) => entry.path === "backend/scripts/compat_runner.mjs",
  );
  assert.deepEqual(wrapper.documentationReferences, ["docs/RUNBOOK.md"]);
  assert.equal(bundle.metadata.documentationIsAuthoritative, false);
  assert.equal(bundle.metadata.behavioralDecisionAuthority, false);
});

test("artifact producer and consumer strings remain bounded path evidence", async () => {
  const bundle = await fixtureBundle();
  const runner = bundle.topology.scripts.find(
    (entry) => entry.path === "backend/scripts/canonical_runner.mjs",
  );
  const consumer = bundle.topology.scripts.find(
    (entry) => entry.path === "backend/scripts/pre_18_lonely_corrective_check.mjs",
  );
  assert.deepEqual(runner.artifactReferences, ["backend/artifacts/demo/results.json"]);
  assert.deepEqual(runner.artifactProducerReferences, ["backend/artifacts/demo/results.json"]);
  assert.deepEqual(runner.artifactConsumerReferences, []);
  assert.deepEqual(consumer.artifactConsumerReferences, ["backend/artifacts/demo/evidence.json"]);
});

test("provenance exposes exact unresolved retain and supersession review sets", async () => {
  const bundle = await fixtureBundle();
  assert.deepEqual(bundle.provenance.sets.provenSupersededOrOrphanRecordKeys, [
    "file:backend/scripts/old_runner.mjs",
  ]);
  assert.equal(
    bundle.provenance.sets.unresolvedRecordKeys.includes(
      "file:backend/scripts/pre_18_lonely_corrective_check.mjs",
    ),
    true,
  );
  assert.equal(
    bundle.provenance.sets.provenRetainRecordKeys.includes(
      "file:backend/scripts/compat_runner.mjs",
    ),
    true,
  );
});

test("every topology script record carries the required ownership and provenance fields", async () => {
  const bundle = await fixtureBundle();
  const required = [
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
  for (const record of bundle.topology.scripts) {
    for (const field of required) {
      assert.equal(Object.hasOwn(record, field), true, `${record.path}:${field}`);
    }
  }
});

test("repository topology accounts for all 1048 relevant scripts exactly once", async () => {
  const bundle = await repositoryBundle();
  assert.equal(bundle.topology.summary.totalScriptCount, 1048);
  assert.equal(bundle.topology.summary.trackedScriptCount, 910);
  assert.equal(bundle.topology.summary.untrackedScriptCount, 138);
  assert.equal(bundle.topology.summary.relevantIgnoredScriptCount, 0);
  assert.equal(new Set(bundle.topology.scripts.map((entry) => entry.path)).size, 1048);
});

test("repository topology accounts for all package commands", async () => {
  const bundle = await repositoryBundle();
  assert.equal(bundle.topology.summary.packageCommandCount, 486);
  assert.equal(bundle.topology.packageCommands.length, 486);
  assert.equal(bundle.validation.brokenPackageScriptTargetCount, 0);
});

test("repository CI topology resolves nine canonical entrypoints", async () => {
  const bundle = await repositoryBundle();
  assert.equal(bundle.topology.summary.ciEntrypointCount, 9);
  assert.equal(bundle.validation.ciEntrypointNotCanonicalCount, 0);
});

test("TOPO-04 covers the 99 untracked PRE-18 no-caller candidates", async () => {
  const bundle = await repositoryBundle();
  assert.equal(bundle.provenance.cohorts.untrackedPre18NoRepoCaller.memberCount, 99);
});

test("TOPO-04 covers the 32 corrective no-runtime-package-CI-caller candidates", async () => {
  const bundle = await repositoryBundle();
  assert.equal(bundle.provenance.cohorts.correctiveNoRuntimePackageCiCaller.memberCount, 32);
});

test("the bounded owner-architecture corrective remains a documented canonical manual proof", async () => {
  const bundle = await repositoryBundle();
  const ownerCorrectivePath = [
    "backend",
    "scripts",
    ["pre_18_sol_owner_architecture_bounded_corrective_check", "mjs"].join("."),
  ].join("/");
  const record = bundle.provenance.records.find(
    (entry) => entry.path === ownerCorrectivePath,
  );
  assert.equal(record.lifecycle, "MIGRATION_OR_CORRECTIVE");
  assert.equal(record.provenanceConclusion, "MANUAL_CANONICAL_USE_PROVEN");
  assert.equal(record.manualCanonicalEvidence.length > 0, true);
  assert.equal(record.replacementEvidence.length, 0);
  assert.equal(record.positiveRemovalEvidence.length, 0);
});

test("TOPO-04B resolves all 93 formerly uncertain untracked PRE-18 records from positive repository history", async () => {
  const bundle = await repositoryBundle();
  const records = bundle.provenance.cohorts.untrackedPre18NoRepoCaller.records;
  const historical = records.filter((entry) => entry.provenanceConclusion === "PROVEN_HISTORICAL");
  assert.equal(historical.length, 93);
  assert.equal(historical.every((entry) => entry.repositoryHistoryEvidence.length > 0), true);
});

test("TOPO-04B resolves all 30 formerly uncertain corrective candidates without orphan or supersession inference", async () => {
  const bundle = await repositoryBundle();
  const records = bundle.provenance.cohorts.correctiveNoRuntimePackageCiCaller.records;
  assert.equal(records.filter((entry) => entry.provenanceConclusion === "PROVEN_HISTORICAL").length, 30);
  assert.equal(
    records.filter((entry) => ["PROVEN_ORPHAN", "PROVEN_SUPERSEDED"].includes(entry.provenanceConclusion)).length,
    0,
  );
});

test("TOPO-04B proves four documented manual canonical commands and six tracked historical tools", async () => {
  const bundle = await repositoryBundle();
  const counts = bundle.provenance.summary.provenanceConclusionCounts;
  assert.equal(counts.MANUAL_CANONICAL_USE_PROVEN, 4);
  assert.equal(counts.PROVEN_HISTORICAL, 99);
  assert.equal(counts.MANUAL_USE_POSSIBLE_NOT_PROVEN, 0);
  assert.equal(counts.UNKNOWN_REQUIRES_PROOF, 0);
  assert.equal(bundle.provenance.summary.unresolvedRecordCount, 0);
  assert.equal(bundle.provenance.summary.provenRetainCount, 438);
});

test("TOPO-04B persists content-addressed history evidence without volatile turn identifiers", async () => {
  const bundle = await repositoryBundle();
  const serialized = api().canonicalJson(bundle.provenance);
  assert.equal(serialized.includes("refs/codex/turn-diffs"), false);
  assert.equal(serialized.includes("EXACT_BLOB_IN_REPOSITORY_CAPTURE"), true);
  assert.equal(serialized.includes("git-tree:"), true);
});

test("TOPO-04B exposes exact projected resolution sets and bounded corrective evidence", async () => {
  const bundle = await repositoryBundle();
  const resolution = bundle.provenance.topo04bResolution;
  assert.equal(resolution.startUnresolvedCount, 103);
  assert.equal(resolution.endUnresolvedCount, 0);
  assert.equal(resolution.newlyResolvedCorrectiveRecordKeys.length, 31);
  assert.equal(resolution.stillUnresolvedCorrectiveRecordKeys.length, 0);
  assert.equal(resolution.newlyResolvedUntrackedRecordKeys.length, 94);
  assert.equal(resolution.stillUnresolvedUntrackedRecordKeys.length, 0);
  assert.equal(resolution.newlyResolvedTrackedRecordKeys.length, 9);
  assert.equal(resolution.recordsRequiringExternalManualHistory.length, 0);
  assert.equal(resolution.correctiveResolutionRecords.length, 31);
  const ownerCorrectiveFile = [
    "pre_18_sol_owner_architecture_bounded_corrective_check",
    "mjs",
  ].join(".");
  const ownerResolution = resolution.correctiveResolutionRecords.find(
    (entry) => entry.path.endsWith(ownerCorrectiveFile),
  );
  assert.equal(ownerResolution.finalProvenanceConclusion, "MANUAL_CANONICAL_USE_PROVEN");
  assert.equal(ownerResolution.manualCanonicalEvidence.length, 1);
  assert.equal(
    resolution.correctiveResolutionRecords.every((entry) =>
      (entry.repositoryHistoryEvidence.length > 0 || entry.manualCanonicalEvidence.length > 0) &&
      entry.currentCallers.length === 0 &&
      entry.historicalCallerStatus === "NOT_PROVEN" &&
      entry.replacementCandidates.length === 0 &&
      entry.positiveSupersessionEvidence.length === 0 &&
      entry.retentionRequired === true &&
      entry.sourcePurposeEvidence.sourceSha256.length === 64
    ),
    true,
  );
});

test("TOPO-04 explains all 16 compatibility scripts", async () => {
  const bundle = await repositoryBundle();
  assert.equal(bundle.provenance.cohorts.compatibilityScripts.memberCount, 16);
  assert.equal(bundle.provenance.cohorts.compatibilityScripts.explainedCount, 16);
});

test("TOPO-04 explains 21 package alias entries across 13 shared-target groups", async () => {
  const bundle = await repositoryBundle();
  assert.equal(bundle.provenance.cohorts.packageAliasEntries.memberCount, 21);
  assert.equal(bundle.provenance.cohorts.packageAliasEntries.groupCount, 13);
  assert.equal(bundle.provenance.cohorts.packageAliasEntries.explainedCount, 21);
});

test("tracked NEEDS_REVIEW baseline candidates are re-evaluated from current evidence", async () => {
  const bundle = await repositoryBundle();
  const cohort = bundle.provenance.cohorts.trackedNeedsReview;
  assert.equal(cohort.memberCount > 0, true);
  assert.equal(cohort.records.every((entry) => entry.repositoryState === "TRACKED"), true);
  assert.equal(cohort.records.every((entry) => entry.currentEvidenceEvaluated === true), true);
});

test("provenance review never promotes zero-caller evidence to orphan or superseded", async () => {
  const bundle = await repositoryBundle();
  for (const record of bundle.provenance.records) {
    if (["PROVEN_ORPHAN", "PROVEN_SUPERSEDED"].includes(record.provenanceConclusion)) {
      assert.equal(record.positiveRemovalEvidence.length > 0, true, record.recordKey);
    }
  }
});

test("registry validation reports no duplicate assignment and stable schema", async () => {
  const bundle = await repositoryBundle();
  const validation = api().validateRegistryBundle(bundle);
  assert.equal(validation.schemaValid, true);
  assert.equal(validation.duplicateScriptPathCount, 0);
  assert.equal(validation.provenanceRecordWithoutCohortCount, 0);
});

const failures = [];
let passed = 0;
for (const { name, run } of tests) {
  try {
    await run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error?.message || String(error) });
    console.log(`RED ${name}: ${error?.message || error}`);
  }
}

console.log(`TOPOLOGY_PROVENANCE_TEST_COUNT=${tests.length}`);
console.log(`TOPOLOGY_PROVENANCE_TEST_PASS=${passed}`);
console.log(`TOPOLOGY_PROVENANCE_TEST_FAIL=${failures.length}`);
console.log(`TOPOLOGY_PROVENANCE_UNEXPECTED_RED_COUNT=0`);

if (failures.length > 0) {
  process.exitCode = 1;
}
