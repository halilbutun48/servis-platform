/*
 * Canonical ownership authority for numbered milestones after PRE-#18.
 *
 * PRE-#18's package manifest remains an immutable historical snapshot. This
 * module is the single active consumer that layers one explicitly registered
 * numbered milestone on top of that snapshot. Future milestones replace the
 * active descriptor only after their own bounded acceptance; they never edit
 * the historical PRE-#18 records.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MILESTONE_OWNERSHIP_AUTHORITY_VERSION = "MILESTONE_OWNERSHIP_AUTHORITY_V1";
export const PRE18_IMMUTABLE_CLOSURE_TAG = "v2026.09.25-pre18-immutable-closure";
export const PRE18_IMMUTABLE_CLOSURE_SHA = "9838211e416649d7be69009da0411bf779a5ac21";

const authorityDescriptors = Object.freeze([
  Object.freeze({
    milestoneId: "PRE_18_IMMUTABLE_CLOSURE",
    kind: "IMMUTABLE_HISTORICAL_CLOSURE",
    manifestFile: "packageOwnershipDeltaManifest.json",
    contractVersion: "PACKAGE_OWNERSHIP_DELTA_V1",
    active: false,
  }),
  Object.freeze({
    milestoneId: "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01",
    kind: "ACTIVE_NUMBERED_MILESTONE",
    manifestFile: "m18CopilotUiElementAnchorOwnershipManifest.json",
    contractVersion: "MILESTONE_OWNERSHIP_V1",
    milestone: "#18",
    active: true,
  }),
]);

function fail(message) {
  throw new Error(`MILESTONE_OWNERSHIP_AUTHORITY_FAIL ${message}`);
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function readDescriptorManifest(descriptor) {
  const manifestPath = path.join(__dirname, descriptor.manifestFile);
  if (!fs.existsSync(manifestPath)) fail(`missing manifest ${descriptor.manifestFile}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.contractVersion !== descriptor.contractVersion) fail(`wrong contract version ${descriptor.manifestFile}`);
  return { descriptor, manifest, manifestPath };
}

function assertNoWildcardPath(record, label) {
  const relativePath = normalizePath(record?.path);
  if (!relativePath || relativePath.includes("*") || relativePath.includes("..")) fail(`${label} invalid path ${relativePath || "(empty)"}`);
  return relativePath;
}

function assertNumberedMilestoneManifest({ descriptor, manifest }) {
  if (manifest.milestoneId !== descriptor.milestoneId) fail(`milestone id mismatch ${descriptor.manifestFile}`);
  if (manifest.milestone !== descriptor.milestone) fail(`milestone number mismatch ${descriptor.manifestFile}`);
  if (manifest.baseImmutableTag !== PRE18_IMMUTABLE_CLOSURE_TAG) fail(`wrong immutable tag ${descriptor.manifestFile}`);
  if (manifest.baseImmutableHead !== PRE18_IMMUTABLE_CLOSURE_SHA) fail(`wrong immutable head ${descriptor.manifestFile}`);
  const expectedStatus = descriptor.active ? "ACTIVE" : "IMMUTABLY_CLOSED";
  if (manifest.status !== expectedStatus) fail(`wrong milestone status ${descriptor.manifestFile}`);
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) fail(`missing active entries ${descriptor.manifestFile}`);

  const seen = new Set();
  for (const entry of manifest.entries) {
    const relativePath = assertNoWildcardPath(entry, descriptor.manifestFile);
    if (seen.has(relativePath)) fail(`duplicate active path ${relativePath}`);
    seen.add(relativePath);
    if (!entry.owner || entry.owner === "UNKNOWN") fail(`missing owner ${relativePath}`);
    if (entry.acceptance !== "PASS" || !entry.acceptanceEvidence) fail(`missing acceptance evidence ${relativePath}`);
    if (entry.identityRegistered !== true) fail(`identity not registered ${relativePath}`);
    if (!entry.lifecycle || entry.lifecycle === "UNKNOWN") fail(`missing lifecycle ${relativePath}`);
    if (entry.identityMode === "CONTRACT_SELF") {
      if (relativePath !== `backend/scripts/lib/${descriptor.manifestFile}`) fail(`contract-self limited to manifest ${relativePath}`);
    } else if (!entry.rawSha256 || !entry.normalizedSha256) {
      fail(`missing exact identity ${relativePath}`);
    }
    if (entry.supersedesHistoricalIdentity === true && !entry.historicalOwner) {
      fail(`missing historical owner ${relativePath}`);
    }
    if (entry.supersedesHistoricalIdentity !== true && entry.historicalOwner) {
      fail(`historical owner without explicit supersession ${relativePath}`);
    }
    if (entry.historicalAuthority !== undefined) {
      if (entry.supersedesHistoricalIdentity !== true) fail(`historical authority without explicit supersession ${relativePath}`);
      if (entry.historicalAuthority !== "PRE18_CURRENT_HEAD_POLICY") fail(`unsupported historical authority ${relativePath}`);
      if (!/^[A-F0-9]{64}$/.test(String(entry.historicalRawSha256 || ""))) fail(`missing historical raw identity ${relativePath}`);
      if (!/^[A-F0-9]{64}$/.test(String(entry.historicalNormalizedSha256 || ""))) fail(`missing historical normalized identity ${relativePath}`);
    }
    if (entry.currentHeadScope !== true && entry.currentHeadScope !== false) fail(`missing current-head scope ${relativePath}`);
    if (entry.gateTopology !== undefined) {
      if (entry.lifecycle !== "ACTIVE_MILESTONE_HARNESS") {
        fail(`gate topology requires harness lifecycle ${relativePath}`);
      }
      if (!entry.gateTopology || typeof entry.gateTopology !== "object" || Array.isArray(entry.gateTopology)) {
        fail(`invalid gate topology ${relativePath}`);
      }
      const topology = entry.gateTopology;
      if (normalizePath(topology.path) !== relativePath) fail(`gate topology path mismatch ${relativePath}`);
      if (topology.ownerFamily !== entry.owner) fail(`gate topology owner mismatch ${relativePath}`);
      if (topology.lifecycle !== "VALIDATION_CHECK") fail(`gate topology lifecycle mismatch ${relativePath}`);
      if (topology.provenanceConclusion !== "PROVEN_ACTIVE") fail(`gate topology must be active ${relativePath}`);
      if (topology.executionAuthority !== "DECLARED_ENTRYPOINT") fail(`gate topology execution authority mismatch ${relativePath}`);
      if (topology.decisionAuthority !== "NOT_BEHAVIORAL_DECISION_AUTHORITY") fail(`gate topology decision authority mismatch ${relativePath}`);
      if (topology.provenanceConfidence !== "HIGH") fail(`gate topology confidence mismatch ${relativePath}`);
      if (topology.removalSafety !== "NOT_PROVEN_SAFE") fail(`gate topology removal safety mismatch ${relativePath}`);
      if (!Array.isArray(topology.staticReferences)) fail(`gate topology static references missing ${relativePath}`);
      for (const reference of topology.staticReferences) assertNoWildcardPath({ path: reference }, `${relativePath} gate topology`);
    }
  }
}

function assertHistoricalManifest({ descriptor, manifest }) {
  if (manifest.packageId !== "PRE_18_VERIFY_CHAIN_PACKAGE_OWNERSHIP_DELTA_GATE_01") fail(`wrong historical package ${descriptor.manifestFile}`);
  if (manifest.baseHead !== "e3bec6177f32263325bd14e876502faacac7a5b0") fail(`wrong historical base head ${descriptor.manifestFile}`);
  if (!Array.isArray(manifest.baselineStatusEntries) || !Array.isArray(manifest.touchedPaths)) fail(`malformed historical manifest ${descriptor.manifestFile}`);
}

export function readMilestoneOwnershipAuthority() {
  const loaded = authorityDescriptors.map(readDescriptorManifest);
  const active = loaded.filter(({ descriptor }) => descriptor.active);
  const immutableClosures = loaded.filter(({ descriptor }) => descriptor.kind === "IMMUTABLE_HISTORICAL_CLOSURE");
  const retainedMilestones = loaded.filter(({ descriptor }) => descriptor.kind === "RETAINED_NUMBERED_MILESTONE");
  if (active.length !== 1) fail(`expected one active milestone, found ${active.length}`);
  if (immutableClosures.length !== 1) fail(`expected one immutable closure, found ${immutableClosures.length}`);
  assertHistoricalManifest(immutableClosures[0]);
  for (const retained of retainedMilestones) assertNumberedMilestoneManifest(retained);
  for (const activeMilestone of active) assertNumberedMilestoneManifest(activeMilestone);
  return Object.freeze({
    version: MILESTONE_OWNERSHIP_AUTHORITY_VERSION,
    immutableClosure: Object.freeze(immutableClosures[0]),
    retainedMilestones: Object.freeze(retainedMilestones),
    activeMilestone: Object.freeze(active[0]),
  });
}

export function activeMilestoneTouchedPaths(authority = readMilestoneOwnershipAuthority()) {
  return Object.freeze(authority.activeMilestone.manifest.entries.map((entry) => Object.freeze({
    ...entry,
    path: normalizePath(entry.path),
    milestoneId: authority.activeMilestone.descriptor.milestoneId,
  })));
}

export function activeMilestoneCurrentHeadEntries(authority = readMilestoneOwnershipAuthority()) {
  return Object.freeze(
    activeMilestoneTouchedPaths(authority)
      .filter((entry) => entry.currentHeadScope)
      .map((entry) => Object.freeze({
        path: entry.path,
        sha256: entry.rawSha256,
        owner: entry.owner,
        milestoneId: entry.milestoneId,
      })),
  );
}

/**
 * Returns the explicit, active-milestone topology records that may participate
 * in the existing gate-policy projection.  PRE-#18's generated topology
 * artifact remains an immutable historical snapshot; a later milestone never
 * writes into that snapshot to make a new checker current.
 */
export function activeMilestoneGateTopologyRecords(authority = readMilestoneOwnershipAuthority()) {
  const records = activeMilestoneTouchedPaths(authority)
    .filter((entry) => entry.gateTopology)
    .map((entry) => Object.freeze({
      ...entry.gateTopology,
      path: normalizePath(entry.gateTopology.path),
      staticReferences: Object.freeze(entry.gateTopology.staticReferences.map((reference) => normalizePath(reference))),
      milestoneId: entry.milestoneId,
      acceptanceEvidence: entry.acceptanceEvidence,
    }));
  const paths = records.map((record) => record.path);
  if (paths.length !== new Set(paths).size) fail("duplicate active milestone gate topology path");
  return Object.freeze(records);
}

export function assertMilestoneOwnershipAuthorityIntegrity() {
  const authority = readMilestoneOwnershipAuthority();
  const activeEntries = activeMilestoneTouchedPaths(authority);
  const currentHeadEntries = activeMilestoneCurrentHeadEntries(authority);
  const gateTopologyRecords = activeMilestoneGateTopologyRecords(authority);
  return Object.freeze({
    version: MILESTONE_OWNERSHIP_AUTHORITY_VERSION,
    immutableClosureId: authority.immutableClosure.descriptor.milestoneId,
    activeMilestoneId: authority.activeMilestone.descriptor.milestoneId,
    activeEntryCount: activeEntries.length,
    currentHeadEntryCount: currentHeadEntries.length,
    activeGateTopologyCount: gateTopologyRecords.length,
  });
}

function fileIdentity(relativePath) {
  const repoRoot = path.resolve(__dirname, "../../..");
  const absolute = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return { rawSha256: null, normalizedSha256: null };
  const raw = fs.readFileSync(absolute);
  const text = raw.toString("utf8");
  const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
  return Object.freeze({
    rawSha256: sha256(raw),
    normalizedSha256: sha256(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
  });
}

export function assertActiveMilestoneCurrentHeadIdentities(authority = readMilestoneOwnershipAuthority()) {
  const failures = [];
  for (const entry of activeMilestoneTouchedPaths(authority).filter((candidate) => candidate.currentHeadScope)) {
    if (entry.identityMode === "CONTRACT_SELF") continue;
    const actual = fileIdentity(entry.path);
    if (actual.rawSha256 !== entry.rawSha256 || actual.normalizedSha256 !== entry.normalizedSha256) {
      failures.push(`${entry.path} expected ${entry.rawSha256}/${entry.normalizedSha256} got ${actual.rawSha256}/${actual.normalizedSha256}`);
    }
  }
  if (failures.length) fail(`active current-head identity mismatch: ${failures.join(", ")}`);
  return Object.freeze({ count: activeMilestoneCurrentHeadEntries(authority).length });
}
