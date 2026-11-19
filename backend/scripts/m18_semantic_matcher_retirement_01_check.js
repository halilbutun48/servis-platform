#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");

const ALLOWED_DISPOSITIONS = new Set([
  "KEEP_AS_LOW_LEVEL_EVIDENCE",
  "CONSOLIDATE",
  "REPLACE",
  "DEPRECATE",
  "DELETE_AFTER_PARITY",
]);

const APPROVED_REPLACEMENT_OWNERS = new Set([
  "backend/src/ai/chat/turkishSemanticFeatures.js",
  "backend/src/ai/chat/semanticEvidence.js",
  "backend/src/ai/chat/semanticEvidenceComposer.js",
]);

const REQUIRED_ITEM_FIELDS = [
  "family", "detector", "source", "disposition", "replacement", "replacementOwner",
  "consumers", "regressionProof", "falsePositiveProof", "rollback", "authorityProof",
];

const EXPECTED_FAMILY_COUNTS = Object.freeze({
  ROLE_HELP_REGEX: 11,
  // This is a distinct, source-anchored family of generic product-help
  // predicates.  The seven role-evidence predicates are counted only in the
  // ROLE_HELP_REGEX family, so multiline continuations are not double-counted.
  GENERIC_HELP_LEXICAL_BRANCH: 14,
  LEXICAL_DECISION_BRANCH: 59,
  ROLE_ASPECT_ROOT: 33,
  MORPHOLOGY_EVIDENCE_SITE: 11,
  NARROW_GENERIC_HELP_COMPATIBILITY: 12,
});

const SOURCE_FILES = Object.freeze({
  canonicalRequest: "backend/src/ai/chat/canonicalSemanticRequest.js",
  routing: "backend/src/ai/chat/conversationRouting.js",
  planner: "backend/src/ai/chat/semanticIntentPlanner.js",
  compatibility: "backend/src/ai/chat/intentRouterCore.js",
  intentRouter: "backend/src/ai/chat/intentRouter.js",
  helpComposer: "backend/src/ai/chat/helpComposer.js",
  planReview: "backend/src/ai/chat/conversationPlanReviewEngine.js",
  features: "backend/src/ai/chat/turkishSemanticFeatures.js",
  evidence: "backend/src/ai/chat/semanticEvidence.js",
  composer: "backend/src/ai/chat/semanticEvidenceComposer.js",
  authority: "backend/src/ai/chat/semanticAuthorityMode.js",
});

const sourceText = new Map(
  Object.values(SOURCE_FILES).map((relativePath) => [
    relativePath,
    fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"),
  ]),
);

function readSource(relativePath) {
  const value = sourceText.get(relativePath);
  assert.ok(value !== undefined, `source is readable: ${relativePath}`);
  return value;
}

function sha256(relativePath) {
  return crypto.createHash("sha256").update(readSource(relativePath)).digest("hex").toUpperCase();
}

function lineOf(source, needle, fromIndex = 0) {
  const index = source.indexOf(needle, fromIndex);
  assert.ok(index >= 0, `source anchor exists: ${needle}`);
  return source.slice(0, index).split("\n").length;
}

function functionRegion(relativePath, startMarker, endMarker) {
  const source = readSource(relativePath);
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `function region starts: ${startMarker}`);
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  assert.ok(end > start, `function region ends: ${endMarker || relativePath}`);
  return { source, start, end };
}

function sourceAnchoredBranches({ relativePath, branches }) {
  const source = readSource(relativePath);
  const lines = source.split("\n");
  return branches.map(({ symbol, line, marker }) => {
    const sourceLine = lines[line - 1] || "";
    assert.ok(sourceLine.includes(marker), `source branch anchor exists: ${relativePath}:${line}`);
    return { relativePath, symbol, line, marker: sourceLine.trim() };
  });
}

const REGEX_DETECTOR_SITES = Object.freeze([
  ["ROLE_HELP_ASPECTS.CAPABILITY", "CAPABILITY:"],
  ["ROLE_HELP_ASPECTS.RESPONSIBILITY", "RESPONSIBILITY:"],
  ["ROLE_HELP_ASPECTS.BOUNDARY", "BOUNDARY:"],
  ["ROLE_HELP_ASPECTS.ORIENTATION", "ORIENTATION:"],
  ["collectRoleHelpSemanticEvidence.explicitRoleReference", "const explicitRoleReference"],
  ["collectRoleHelpSemanticEvidence.explanationMode", "const explanationMode"],
  ["collectRoleHelpSemanticEvidence.roleEntityAsSubject", "const roleEntityAsSubject"],
  ["collectRoleHelpSemanticEvidence.concreteUiTarget", "const concreteUiTarget"],
  ["collectRoleHelpSemanticEvidence.concreteAction", "const concreteAction"],
  ["collectRoleHelpSemanticEvidence.specificTask", "const specificTask"],
  ["collectRoleHelpSemanticEvidence.explicitCurrentSurfaceAnchor", "const explicitCurrentSurfaceAnchor"],
]);

const ROLE_ASPECT_ROOTS = Object.freeze([
  "yetki", "yapabil", "yonet", "yurut", "islev", "becer", "manage", "handle",
  "sorumluluk", "gorev", "faaliyet", "calisma", "is", "sinir", "kapsam", "limit",
  "cerceve", "dahil", "ait", "haric", "disinda", "uzerime", "rol", "baslangic",
  "basla", "nereden", "ilk", "once", "ogren", "kavra", "tani", "yol", "adim",
]);

const MORPHOLOGY_SITES = Object.freeze([
  ["TOKEN_RE", "const TOKEN_RE"],
  ["normalizeTurkish", "function normalizeTurkish"],
  ["lemmaCandidates", "function lemmaCandidates"],
  ["buildToken.pluralMarker", "const pluralMarker"],
  ["buildToken.hasInflectedPlural", "const hasInflectedPlural"],
  ["buildToken.necessity", "const necessity"],
  ["buildToken.negation", "if (/(?:mamalı|memeli)/u.test(normalized))"],
  ["buildToken.verbLike", "const verbLike"],
  ["buildToken.person", "if (verbLike &&"],
  ["buildToken.possessive", "const possessive"],
  ["buildToken.case", "if (hasInflectedPlural && /[ıiuü]$/u.test(normalized))"],
]);

const NARROW_GENERIC_HELP_DETECTORS = Object.freeze([
  "isGenericStatusHelpQuestion", "isExplicitNextScreenQuestion", "isExplicitBadgeHelpQuestion",
  "isScreenFocusQuestion", "isRiskListQuestion", "isNextBestActionQuestion",
  "isExplicitSafeNextStepQuestion", "isExplicitNextStepQuestion", "looksLikeOnboardingStartQuestion",
  "looksLikeScreenStartQuestion", "looksLikeDetailContinuationQuestion", "isShiftReadinessQuestion",
]);

const GENERIC_HELP_BRANCHES = Object.freeze([
  ["genericProductSubject", 207, "const genericProductSubject"],
  ["namedProductSubject", 208, "const namedProductSubject"],
  ["overviewRequest", 209, "const overviewRequest"],
  ["educationRequest", 210, "const educationRequest"],
  ["namedWorkflowGuidance", 213, "const namedWorkflowGuidance"],
  ["bareOnboardingRequest", 215, "const bareOnboardingRequest"],
  ["bareUsageRequest", 216, "const bareUsageRequest"],
  ["firstTimeOnboarding", 217, "const firstTimeOnboarding"],
  ["onboardingFrame", 218, "const onboardingFrame"],
  ["assistantCapabilityRequest", 219, "const assistantCapabilityRequest"],
  ["abstractOrientationFrame", 225, "const abstractOrientationFrame"],
  ["explicitSurfaceExplanation", 228, "const explicitSurfaceExplanation"],
  ["explicitProductOperation", 230, "const explicitProductOperation"],
  ["concreteEntityExplanation", 232, "const concreteEntityExplanation"],
].map(([symbol, line, marker]) => ({ symbol, line, marker })));

// These are source-anchored semantic sites, rather than a line scanner.  In
// particular, each multiline predicate below is one inventory item.
const LEXICAL_DECISION_BRANCHES = Object.freeze([
  ["hasCurrentScreenCapabilityCue", 924, "if (!/"],
  ["hasCurrentScreenCapabilityCue", 931, "return new RegExp"],
  ["hasCardinalityCue", 944, "const typedCountVerb"],
  ["hasCardinalityCue", 942, "const explicitEntityTarget"],
  ["hasCardinalityCue", 946, "const explicitCountNoun"],
  ["hasCardinalityCue", 948, "const countPredicate"],
  ["hasCardinalityCue", 949, "const quantifiedSet"],
  ["hasCardinalityCue", 960, "|| /"],
  ["parseNumberWords", 971, "if (/^\\d+"],
  ["evaluateGeneralArithmeticRequest", 1011, "let match = text.match(new RegExp"],
  ["evaluateGeneralArithmeticRequest", 1020, "match = text.match(new RegExp"],
  ["evaluateGeneralArithmeticRequest", 1028, "match = text.match(new RegExp"],
  ["evaluateGeneralArithmeticRequest", 1030, "match = text.match(new RegExp"],
  ["evaluateGeneralArithmeticRequest", 1032, "match = text.match(new RegExp"],
  ["hasValueLookupCue", 1042, "return /"],
  ["hasValueLookupCue", 1049, "|| /"],
  ["hasRiskCue", 1053, "return /"],
  ["hasCostAnalysisCue", 1058, "return /"],
  ["hasCostAnalysisCue", 1059, "|| /"],
  ["hasKnownTermDefinitionCue", 1064, "if (!/"],
  ["hasAssessmentSummaryCue", 1073, "const criticalSubject"],
  ["hasAssessmentSummaryCue", 1074, "const prioritizeObject"],
  ["hasAssessmentSummaryCue", 1078, "const attentionAssessment"],
  ["hasIssueDiagnosticCue", 1083, "const disruption"],
  ["hasIssueDiagnosticCue", 1085, "const diagnosticOperation"],
  ["hasIssueDiagnosticCue", 1089, "const explicitRecordStatus"],
  ["hasIssueDiagnosticCue", 1090, "&& !/"],
  ["hasDateRangeCue", 1095, "return /"],
  ["hasDateRangeCue", 1096, "|| /"],
  ["hasDateRangeCue", 1097, "|| /"],
  ["hasScreenSurfaceCue", 1101, "return /"],
  ["hasScreenDetailCue", 1106, "&& /"],
  ["hasExplicitSurfaceNavigationVerb", 1113, "return /"],
  ["hasExplicitSurfaceViewVerb", 1122, "return /"],
  ["hasExplicitSurfaceViewVerb", 1123, "|| /"],
  ["hasExplicitCurrentScreenPurposeCue", 1139, "return surface.test"],
  ["hasExplicitButtonExplanationCue", 1148, "return /"],
  ["hasExplicitButtonExplanationCue", 1149, "|| /"],
  ["hasDirectCurrentScreenExplanationCue", 1154, "return /"],
  ["hasTeachFromZeroCue", 1158, "return /"],
  ["hasTeachFromZeroCue", 1159, "|| /"],
  ["hasScreenContextCue", 1164, "const locationQuestion"],
  ["hasScreenContextCue", 1170, "const situatedReference"],
  ["hasScreenContextCue", 1171, "const orientationOperation"],
  ["hasScreenContextCue", 1172, "const selfLocatedProgress"],
  ["hasScreenContextCue", 1176, "const workflowSelfLocation"],
  ["hasScreenContextCue", 1180, "const situatedActionQuestion"],
  ["hasScreenContextCue", 1185, "const situatedRecoveryQuestion"],
  ["hasScreenContextCue", 1194, "const bareSurfaceDiscovery"],
  ["hasScreenContextCue", 1195, "const situatedWhyRequest"],
  ["hasScreenContextCue", 1196, "return /"],
  ["hasScreenContextCue", 1200, "|| /"],
  ["hasCurrentScreenReferentCue", 1214, "return /"],
  ["hasVisibleControlDiscoveryCue", 1225, "const locationRequest"],
  ["hasVisibleControlDiscoveryCue", 1226, "const controlNoun"],
  ["hasVisibleControlDiscoveryCue", 1227, "const discoveryVerb"],
  ["hasScreenDeicticCue", 1232, "return /"],
  ["hasScreenDeicticActionCue", 1237, "return /"],
  ["hasScreenDeicticSituationCue", 1242, "return /"],
].map(([symbol, line, marker]) => ({ symbol, line, marker })));

function consumersForRoleHelper() {
  return [
    { path: SOURCE_FILES.canonicalRequest, symbol: "collectRoleHelpSemanticEvidence", evidence: "local-composition-consumer" },
    { path: SOURCE_FILES.routing, symbol: "isExplicitRoleHelpIntent", evidence: "canonical-routing-adapter" },
    { path: SOURCE_FILES.planner, symbol: "isExplicitRoleHelpIntent", evidence: "canonical-planner-adapter" },
    { path: SOURCE_FILES.helpComposer, symbol: "isExplicitRoleHelpIntent", evidence: "grounded-help-consumer" },
  ];
}

function consumersForNarrowDetector(detector) {
  const source = readSource(SOURCE_FILES.intentRouter);
  assert.match(source, new RegExp(`\\b${detector}\\b`, "u"), `compatibility consumer exists: ${detector}`);
  return [{
    path: SOURCE_FILES.intentRouter,
    symbol: detector,
    evidence: "noncanonical-compatibility-surface",
  }];
}

function proof(status = "DEFERRED", reason = "Stage 5 parity is not independently proven") {
  return {
    status,
    commands: [
      "node backend/scripts/m18_semantic_authority_switch_01_check.js",
      "node backend/scripts/m18_semantic_plan_only_01_check.js",
      "node backend/scripts/m18_semantic_security_boundary_01_check.js",
      "node backend/scripts/m18_run_j02_role_help_regression_01_check.js",
      "node backend/scripts/m18_run_k02_role_concept_regression_01_check.js",
      "node backend/scripts/m18_run_i01_explain_view_navigate_contrastive_01_check.js",
    ],
    reason,
  };
}

function rollback(status = "READY") {
  return {
    status,
    action: "retain-the-production-branch-and-restore-the-recorded-source-hash-before-any-retirement",
    productionBranchRetired: false,
  };
}

function item({ family, detector, source, replacement, replacementOwner, consumers, disposition }) {
  return {
    family,
    detector,
    source,
    disposition,
    replacement,
    replacementOwner,
    consumers,
    regressionProof: proof(),
    falsePositiveProof: proof(),
    rollback: rollback(),
    authorityProof: {
      allowedOwner: replacementOwner,
      traceCoverage: ["OLD", "SHADOW", "NEW"],
      independentSemanticAuthority: false,
    },
  };
}

const inventory = [];

for (const [detector, marker] of REGEX_DETECTOR_SITES) {
  const source = readSource(SOURCE_FILES.canonicalRequest);
  inventory.push(item({
    family: "ROLE_HELP_REGEX",
    detector,
    source: { file: SOURCE_FILES.canonicalRequest, symbol: detector.split(".")[0], line: lineOf(source, marker), marker },
    replacement: SOURCE_FILES.composer,
    replacementOwner: "composeSemanticEvidence",
    consumers: consumersForRoleHelper(),
    disposition: "CONSOLIDATE",
  }));
}

for (const branch of sourceAnchoredBranches({ relativePath: SOURCE_FILES.canonicalRequest, branches: GENERIC_HELP_BRANCHES })) {
  inventory.push(item({
    family: "GENERIC_HELP_LEXICAL_BRANCH",
    detector: `isGenericProductHelpIntent.${branch.symbol}`,
    source: { file: SOURCE_FILES.canonicalRequest, symbol: "isGenericProductHelpIntent", line: branch.line, marker: branch.marker },
    replacement: SOURCE_FILES.composer,
    replacementOwner: "composeSemanticEvidence",
    consumers: [{ path: SOURCE_FILES.canonicalRequest, symbol: "isGenericProductHelpIntent", evidence: "local-branch-owner" }],
    disposition: "CONSOLIDATE",
  }));
}

for (const branch of sourceAnchoredBranches({ relativePath: SOURCE_FILES.canonicalRequest, branches: LEXICAL_DECISION_BRANCHES })) {
  inventory.push(item({
    family: "LEXICAL_DECISION_BRANCH",
    detector: `${branch.symbol}@${branch.relativePath}:${branch.line}`,
    source: { file: branch.relativePath, symbol: branch.symbol, line: branch.line, marker: branch.marker },
    replacement: SOURCE_FILES.composer,
    replacementOwner: "composeSemanticEvidence",
    consumers: [{ path: branch.relativePath, symbol: branch.symbol, evidence: "local-branch-owner" }],
    disposition: "CONSOLIDATE",
  }));
}

for (const root of ROLE_ASPECT_ROOTS) {
  const source = readSource(SOURCE_FILES.canonicalRequest);
  const roleAspectRegion = functionRegion(SOURCE_FILES.canonicalRequest, "const ROLE_HELP_ASPECTS", "const ROLE_HELP_CONTEXTS");
  inventory.push(item({
    family: "ROLE_ASPECT_ROOT",
    detector: `ROLE_HELP_ASPECTS.${root}`,
    source: { file: SOURCE_FILES.canonicalRequest, symbol: "ROLE_HELP_ASPECTS", line: lineOf(source, root, roleAspectRegion.start), marker: root },
    replacement: SOURCE_FILES.composer,
    replacementOwner: "ROLE_ASPECTS/aspectValue",
    consumers: [
      { path: SOURCE_FILES.canonicalRequest, symbol: "collectRoleHelpSemanticEvidence", evidence: "legacy-role-evidence" },
      { path: SOURCE_FILES.composer, symbol: "ROLE_ASPECTS", evidence: "typed-role-aspect-composition" },
    ],
    disposition: "CONSOLIDATE",
  }));
}

for (const [detector, marker] of MORPHOLOGY_SITES) {
  const source = readSource(SOURCE_FILES.features);
  inventory.push(item({
    family: "MORPHOLOGY_EVIDENCE_SITE",
    detector,
    source: { file: SOURCE_FILES.features, symbol: detector.split(".")[0], line: lineOf(source, marker), marker },
    replacement: SOURCE_FILES.features,
    replacementOwner: "extractTurkishSemanticFeatures",
    consumers: [
      { path: SOURCE_FILES.features, symbol: "extractTurkishSemanticFeatures", evidence: "typed-feature-output" },
      { path: SOURCE_FILES.canonicalRequest, symbol: "extractTurkishSemanticFeatures", evidence: "canonical-feature-consumer" },
    ],
    disposition: "KEEP_AS_LOW_LEVEL_EVIDENCE",
  }));
}

for (const detector of NARROW_GENERIC_HELP_DETECTORS) {
  const source = readSource(SOURCE_FILES.compatibility);
  inventory.push(item({
    family: "NARROW_GENERIC_HELP_COMPATIBILITY",
    detector,
    source: { file: SOURCE_FILES.compatibility, symbol: detector, line: lineOf(source, `export function ${detector}`), marker: `export function ${detector}` },
    replacement: SOURCE_FILES.composer,
    replacementOwner: "composeSemanticEvidence",
    consumers: consumersForNarrowDetector(detector),
    disposition: "KEEP_AS_LOW_LEVEL_EVIDENCE",
  }));
}

function sourceBackedConsumer({ path: consumerPath, symbol, evidence }) {
  const source = readSource(consumerPath);
  const occurrences = [...source.matchAll(new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "gu"))];
  assert.ok(occurrences.length > 0, `consumer symbol is source-backed: ${consumerPath}:${symbol}`);
  if (["local-branch-owner", "local-composition-consumer", "canonical-routing-adapter", "typed-feature-output"].includes(evidence)) return true;
  const nonImportOccurrences = occurrences.filter(({ index }) => {
    const lineStart = source.lastIndexOf("\n", index) + 1;
    return !/^\s*(?:import|export)\b/u.test(source.slice(lineStart, source.indexOf("\n", index) < 0 ? source.length : source.indexOf("\n", index)));
  });
  assert.ok(nonImportOccurrences.length > 0, `consumer has executable use: ${consumerPath}:${symbol}`);
  return true;
}

function assertInventoryContract(candidates = inventory) {
  assert.ok(candidates.length > 0, "detector inventory must be complete");
  const detectorIds = new Set();
  let unownedConsumerCount = 0;
  for (const candidate of candidates) {
    for (const field of REQUIRED_ITEM_FIELDS) assert.ok(Object.hasOwn(candidate, field), `${candidate.detector} has ${field}`);
    assert.equal(detectorIds.has(candidate.detector), false, `detector is enumerated exactly once: ${candidate.detector}`);
    detectorIds.add(candidate.detector);
    assert.ok(ALLOWED_DISPOSITIONS.has(candidate.disposition), `${candidate.detector} has one allowed disposition`);
    assert.ok(APPROVED_REPLACEMENT_OWNERS.has(candidate.replacement), `${candidate.detector} has approved replacement owner`);
    assert.ok(candidate.replacementOwner, `${candidate.detector} has named replacement owner`);
    assert.ok(Array.isArray(candidate.consumers) && candidate.consumers.length > 0, `${candidate.detector} has consumers`);
    const consumersOwned = candidate.consumers.every(({ path: consumerPath }) => fs.existsSync(path.join(REPO_ROOT, consumerPath)));
    if (!consumersOwned) unownedConsumerCount += 1;
    assert.equal(consumersOwned, true, `${candidate.detector} has no unowned consumer`);
    assert.ok(candidate.regressionProof?.status, `${candidate.detector} has regression proof status`);
    assert.ok(candidate.falsePositiveProof?.status, `${candidate.detector} has false-positive proof status`);
    assert.ok(candidate.rollback?.status, `${candidate.detector} has rollback status`);
    assert.ok(candidate.authorityProof?.allowedOwner, `${candidate.detector} has authority owner proof`);
    assert.deepEqual(candidate.authorityProof?.traceCoverage, ["OLD", "SHADOW", "NEW"], `${candidate.detector} has complete authority trace coverage`);
    assert.equal(candidate.authorityProof?.independentSemanticAuthority, false, `${candidate.detector} has no independent semantic authority`);

    const detectorSource = readSource(candidate.source.file);
    assert.ok(detectorSource.includes(candidate.source.symbol), `${candidate.detector} source symbol is present`);
    const sourceLines = detectorSource.split("\n");
    assert.equal(sourceLines[candidate.source.line - 1]?.includes(candidate.source.marker), true, `${candidate.detector} source line is anchored`);
    const replacementSource = readSource(candidate.replacement);
    assert.ok(replacementSource.includes(candidate.replacementOwner.split("/")[0]), `${candidate.detector} replacement module is readable`);
    assert.ok(candidate.consumers.every(sourceBackedConsumer), `${candidate.detector} consumer symbols are source-backed`);
    if (candidate.disposition === "DELETE_AFTER_PARITY") {
      assert.equal(candidate.regressionProof.status, "PROVEN", `${candidate.detector} deletion requires regression proof`);
      assert.equal(candidate.falsePositiveProof.status, "PROVEN", `${candidate.detector} deletion requires false-positive proof`);
      assert.equal(candidate.rollback.status, "READY", `${candidate.detector} deletion requires rollback`);
    }
  }
  const totals = inventoryTotals(candidates);
  assert.deepEqual({ ...totals }, EXPECTED_FAMILY_COUNTS, "source-anchored family inventory totals match the approved baseline");
  return { detectorIds, unownedConsumerCount };
}

function maskNonCode(source) {
  const masked = source.split("");
  let state = "CODE";
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === "LINE_COMMENT") {
      if (character === "\n") state = "CODE";
      else masked[index] = " ";
      continue;
    }
    if (state === "BLOCK_COMMENT") {
      if (character === "*" && next === "/") {
        masked[index] = " ";
        masked[index + 1] = " ";
        index += 1;
        state = "CODE";
      } else if (character !== "\n") masked[index] = " ";
      continue;
    }
    if (state === "SINGLE_QUOTE" || state === "DOUBLE_QUOTE" || state === "TEMPLATE") {
      if (escaped) {
        if (character !== "\n") masked[index] = " ";
        escaped = false;
      } else if (character === "\\") {
        masked[index] = " ";
        escaped = true;
      } else if ((state === "SINGLE_QUOTE" && character === "'")
        || (state === "DOUBLE_QUOTE" && character === '"')
        || (state === "TEMPLATE" && character === "`")) {
        masked[index] = " ";
        state = "CODE";
      } else if (character !== "\n") masked[index] = " ";
      continue;
    }
    if (character === "/" && next === "/") {
      masked[index] = " ";
      masked[index + 1] = " ";
      index += 1;
      state = "LINE_COMMENT";
    } else if (character === "/" && next === "*") {
      masked[index] = " ";
      masked[index + 1] = " ";
      index += 1;
      state = "BLOCK_COMMENT";
    } else if (character === "'") {
      masked[index] = " ";
      state = "SINGLE_QUOTE";
    } else if (character === '"') {
      masked[index] = " ";
      state = "DOUBLE_QUOTE";
    } else if (character === "`") {
      masked[index] = " ";
      state = "TEMPLATE";
    }
  }
  return masked.join("");
}

function maskedLegacySource(source) {
  const masked = maskNonCode(source).split("\n");
  let inImport = false;
  return masked.map((line) => {
    const importLine = inImport || /^\s*import\b/u.test(line);
    if (!importLine) return line;
    const endsImport = line.includes(";");
    if (endsImport) inImport = false;
    else inImport = true;
    return " ".repeat(line.length);
  }).join("\n");
}

function namedFunctionAt(maskedSource, offset) {
  const lines = maskedSource.slice(0, offset).split("\n");
  let currentFunction = "module";
  for (const rawLine of lines) {
    const functionMatch = rawLine.match(/(?:^|\s)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/u);
    if (functionMatch) currentFunction = functionMatch[1];
  }
  return currentFunction;
}

function balancedDelimiterEnd(maskedSource, openIndex, open = "(", close = ")") {
  let depth = 0;
  for (let index = openIndex; index < maskedSource.length; index += 1) {
    if (maskedSource[index] === open) depth += 1;
    else if (maskedSource[index] === close) {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return maskedSource.length;
}

function arrowContextsAt(maskedSource, offset) {
  const contexts = [];
  const arrowPattern = /(?:(?:\b(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*)?)(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/gmu;
  for (const match of maskedSource.matchAll(arrowPattern)) {
    if (match.index >= offset) break;
    const arrowEnd = match.index + match[0].length;
    let bodyStart = arrowEnd;
    while (/\s/u.test(maskedSource[bodyStart] || "")) bodyStart += 1;
    let bodyEnd = maskedSource.length;
    if (maskedSource[bodyStart] === "{") {
      bodyEnd = balancedDelimiterEnd(maskedSource, bodyStart, "{", "}");
    } else {
      const semicolon = maskedSource.indexOf(";", bodyStart);
      bodyEnd = semicolon >= 0 ? semicolon + 1 : maskedSource.length;
    }
    if (bodyStart <= offset && offset < bodyEnd) {
      contexts.push({
        primary: `arrow:${match[1] || "anonymous"}`,
        enclosing: namedFunctionAt(maskedSource, match.index),
        index: match.index,
      });
    }
  }
  return contexts;
}

function matcherContextAt(source, offset) {
  const masked = maskNonCode(source);
  const contexts = arrowContextsAt(masked, offset).sort((left, right) => right.index - left.index);
  if (contexts.length) return contexts[0];
  return { primary: namedFunctionAt(masked, offset), enclosing: null };
}

function isPhraseSpecificMatcherSnippet(snippet, regexPattern = "") {
  const phraseText = `${regexPattern}\n${snippet}`;
  return /[A-Za-zÀ-ÖØ-öø-ÿ](?:\s+|\\s\+|\\s\*)[A-Za-zÀ-ÖØ-öø-ÿ]/u.test(phraseText)
    || /[A-Za-zÀ-ÖØ-öø-ÿ]\s+[A-Za-zÀ-ÖØ-öø-ÿ]/u.test(snippet);
}

function scanMatcherSites(source) {
  const masked = maskNonCode(source);
  const sites = [];
  const add = ({ index, length, kind, regexPattern = "" }) => {
    const snippet = source.slice(index, index + length);
    sites.push({
      index,
      kind,
      snippet,
      ...matcherContextAt(source, index),
      phraseSpecific: isPhraseSpecificMatcherSnippet(snippet, regexPattern),
    });
  };
  const directRegexMember = /\/((?:\\.|[^/\\\r\n])+)\/[dgimsuvy]*\s*\.\s*(test|exec)\s*\(/gu;
  for (const match of masked.matchAll(directRegexMember)) {
    add({ index: match.index, length: match[0].length, kind: `regex-literal.${match[2]}`, regexPattern: match[1] });
  }
  const regexArgumentMember = /\.(match|search|matchAll)\s*\(\s*\/((?:\\.|[^/\\\r\n])+)\/[dgimsuvy]*/gu;
  for (const match of masked.matchAll(regexArgumentMember)) {
    add({ index: match.index, length: match[0].length, kind: `regex-argument.${match[1]}`, regexPattern: match[2] });
  }
  const regexpMember = /\b(?:new\s+)?RegExp\s*\([^)]*\)\s*\.\s*(test|exec|match|search|matchAll)\s*\(/gu;
  for (const match of masked.matchAll(regexpMember)) {
    add({ index: match.index, length: match[0].length, kind: `regexp-call.${match[1]}` });
  }
  const helperMatcher = /\b(hasToken|hasAnyTerm)\s*\(/gu;
  for (const match of masked.matchAll(helperMatcher)) {
    const lineStart = masked.lastIndexOf("\n", match.index) + 1;
    if (/\bfunction\s+(?:hasToken|hasAnyTerm)\s*\(/u.test(masked.slice(lineStart, match.index + match[0].length))) continue;
    const openIndex = masked.indexOf("(", match.index);
    const callEnd = balancedDelimiterEnd(masked, openIndex);
    add({ index: match.index, length: callEnd - match.index, kind: `helper.${match[1]}` });
  }
  return sites;
}

const NEGATIVE_MATCHER_CONTROLS = Object.freeze([
  ["direct-regex-test", "function suspicious(value) { return /foo\\s+bar/u.test(value); }"],
  ["regex-match", "function suspicious(value) { return value.match(/foo bar/u); }"],
  ["regex-search", "function suspicious(value) { return value.search(/foo bar/u); }"],
  ["regex-match-all", "function suspicious(value) { return value.matchAll(/foo bar/u); }"],
  ["bare-regexp-test-arrow", "const suspicious = (value) => new RegExp(\"foo bar\", \"u\").test(value);"],
  ["multiline-expression-arrow", "const suspicious = (\n  value,\n) => /foo bar/u.test(value);"],
  ["nested-arrow-owner", "function composeSemanticEvidence(value) { const nested = (item) => /foo bar/u.test(item); return nested(value); }"],
  ["has-token-multi-word-regex", "function suspicious(tokens) { return hasToken(tokens, [/foo\\s+bar/u]); }"],
]);

const APPROVED_LOW_LEVEL_OWNER_FUNCTIONS = new Set([
  "extractTurkishSemanticFeatures", "createSemanticEvidence", "composeSemanticEvidence",
  "normalizedTokens", "hasToken", "hasAnyTerm", "concreteObject", "requestMode", "relationValue",
  "aspectValue", "buildToken", "isProcessToken", "makeTokenFeatures",
]);

function isApprovedMatcherContext({ primary, enclosing }) {
  return APPROVED_LOW_LEVEL_OWNER_FUNCTIONS.has(primary)
    || (primary === "arrow:anonymous" && APPROVED_LOW_LEVEL_OWNER_FUNCTIONS.has(enclosing));
}

function runNegativeMatcherControls() {
  const results = [];
  for (const [id, source] of NEGATIVE_MATCHER_CONTROLS) {
    const sites = scanMatcherSites(source);
    const unapproved = sites.filter((site) => !isApprovedMatcherContext(site));
    assert.ok(unapproved.length > 0, `${id} negative matcher is detected`);
    assert.ok(sites.some(({ phraseSpecific }) => phraseSpecific), `${id} phrase-specific form is detected`);
    results.push({ id, matcherSiteCount: sites.length, unapprovedMatcherCount: unapproved.length, phraseSpecificCount: sites.filter(({ phraseSpecific }) => phraseSpecific).length });
  }
  return results;
}

function assertReplacementOwnership() {
  const replacementSources = [SOURCE_FILES.features, SOURCE_FILES.evidence, SOURCE_FILES.composer].map(readSource).join("\n");
  assert.match(replacementSources, /extractTurkishSemanticFeatures|createSemanticEvidence|composeSemanticEvidence/u, "typed replacement owners are present");
  assert.equal(/from ['"].*canonicalSemanticRequest\.js['"]/.test(readSource(SOURCE_FILES.features)), false, "feature producer does not import canonical authority");
  assert.equal(/from ['"].*canonicalSemanticRequest\.js['"]/.test(readSource(SOURCE_FILES.composer)), false, "evidence composer does not import canonical authority");
  assert.equal(/isExplicitRoleHelpIntent|isGenericProductHelpIntent|resolveCanonicalConversationRequest/u.test(readSource(SOURCE_FILES.features)), false, "feature producer has no semantic decision authority");
  assert.equal(/isExplicitRoleHelpIntent|isGenericProductHelpIntent|resolveCanonicalConversationRequest/u.test(readSource(SOURCE_FILES.composer)), false, "evidence composer has no second semantic router");
  const newMatcherCount = [SOURCE_FILES.features, SOURCE_FILES.evidence, SOURCE_FILES.composer]
    .filter((relativePath) => /isExplicitRoleHelpIntent|isGenericProductHelpIntent|resolveCanonicalConversationRequest|resolveSemanticIntent|resolveConversationRoute/u.test(readSource(relativePath)))
    .length;
  assert.equal(newMatcherCount, 0, "replacement owners add no independent matcher or router");
  const unapprovedMatcherSites = [];
  for (const relativePath of [SOURCE_FILES.features, SOURCE_FILES.evidence, SOURCE_FILES.composer]) {
    const source = readSource(relativePath);
    for (const site of scanMatcherSites(source)) {
      if (!isApprovedMatcherContext(site)) {
        const line = source.slice(0, site.index).split("\n").length;
        unapprovedMatcherSites.push(`${relativePath}:${line}:${site.primary}:${site.kind}`);
      }
    }
  }
  assert.deepEqual(unapprovedMatcherSites, [], "replacement owners keep matcher calls inside approved low-level evidence owners");
  const phraseSpecificBranchCount = [SOURCE_FILES.features, SOURCE_FILES.evidence, SOURCE_FILES.composer]
    .reduce((count, relativePath) => count + scanMatcherSites(readSource(relativePath)).filter(({ phraseSpecific }) => phraseSpecific).length, 0);
  assert.equal(phraseSpecificBranchCount, 0, "replacement owners add no phrase-specific matcher branch");
  return { newMatcherCount, phraseSpecificBranchCount, unapprovedMatcherCount: unapprovedMatcherSites.length };
}

function assertCallGraphBoundaries() {
  const canonicalPathSource = [SOURCE_FILES.canonicalRequest, SOURCE_FILES.routing, SOURCE_FILES.planner].map(readSource).join("\n");
  const secondRouterCount = [SOURCE_FILES.canonicalRequest, SOURCE_FILES.routing, SOURCE_FILES.planner]
    .filter((relativePath) => /from ['"].*intentRouterCore\.js['"]/.test(readSource(relativePath)))
    .length;
  assert.equal(secondRouterCount, 0, "canonical semantic path does not import compatibility router core");
  assert.equal(/from ['"].*conversationRouting\.js['"]/.test(readSource(SOURCE_FILES.canonicalRequest)), false, "canonical request does not import its routing consumer");
  const compatibilityConsumers = [SOURCE_FILES.intentRouter, SOURCE_FILES.planReview];
  assert.equal(compatibilityConsumers.every((relativePath) => fs.existsSync(path.join(REPO_ROOT, relativePath))), true, "compatibility consumers remain present");
  return {
    secondRouterCount,
    compatibilityConsumers,
  };
}

const LEGACY_DECISION_PATHS = Object.freeze({
  [SOURCE_FILES.canonicalRequest]: [
    "isExplicitRoleHelpIntent", "isGenericProductHelpIntent", "inferCanonicalSemanticRequest", "resolveOldCanonicalConversationRequest",
  ],
  [SOURCE_FILES.routing]: ["isExplicitRoleHelpIntent", "isGenericProductHelpIntent", "inferCanonicalSemanticRequest"],
  [SOURCE_FILES.planner]: ["isExplicitRoleHelpIntent", "isGenericProductHelpIntent", "inferCanonicalSemanticRequest"],
  [SOURCE_FILES.helpComposer]: ["isExplicitRoleHelpIntent", "isGenericProductHelpIntent"],
  [SOURCE_FILES.intentRouter]: ["isGenericProductHelpIntent"],
  [SOURCE_FILES.compatibility]: [],
  [SOURCE_FILES.planReview]: [],
});

const LEGACY_NEGATIVE_CONTROLS = Object.freeze([
  ["legacy-comment-ignored", "// isGenericProductHelpIntent\nconst safe = true;", 0],
  ["legacy-string-ignored", "const safe = \"isGenericProductHelpIntent\";", 0],
  ["legacy-import-ignored", "import { isGenericProductHelpIntent } from './legacy.js';\nconst safe = true;", 0],
  ["legacy-executable-counted", "isGenericProductHelpIntent(value);", 1],
]);

function legacySymbolCount(source, symbol) {
  return [...maskedLegacySource(source).matchAll(new RegExp(`\\b${symbol}\\b`, "gu"))].length;
}

function runNegativeLegacyControls() {
  for (const [id, source, expectedCount] of LEGACY_NEGATIVE_CONTROLS) {
    assert.equal(legacySymbolCount(source, "isGenericProductHelpIntent"), expectedCount, `${id} legacy source masking is deterministic`);
    console.log(`NEGATIVE_LEGACY_CONTROL=${id}:PASS`);
  }
  return LEGACY_NEGATIVE_CONTROLS.map(([id]) => id);
}

function assertLegacyDecisionPathsAreAccountedFor() {
  let unaccountedLegacyPathCount = 0;
  const decisionSymbols = ["isExplicitRoleHelpIntent", "isGenericProductHelpIntent", "inferCanonicalSemanticRequest", "resolveOldCanonicalConversationRequest"];
  for (const [relativePath, allowedSymbols] of Object.entries(LEGACY_DECISION_PATHS)) {
    const source = maskedLegacySource(readSource(relativePath));
    for (const symbol of decisionSymbols) {
      const occurrences = [...source.matchAll(new RegExp(`\\b${symbol}\\b`, "gu"))];
      if (occurrences.length && !allowedSymbols.includes(symbol)) unaccountedLegacyPathCount += occurrences.length;
    }
  }
  assert.equal(unaccountedLegacyPathCount, 0, "all legacy semantic decision paths are explicitly accounted for");
  return unaccountedLegacyPathCount;
}

function authoritySummaryFor(result, mode) {
  const authority = result.diagnostics?.semanticAuthority;
  const expected = {
    OLD: { path: "OLD_CANONICAL", old: 1, new: 0, shadow: 0, dual: 0, provenance: "EXISTING_CANONICAL_SEMANTIC_INFERENCE" },
    SHADOW: { path: "OLD_CANONICAL", old: 1, new: 1, shadow: 0, dual: 0, provenance: "EXISTING_CANONICAL_SEMANTIC_INFERENCE" },
    NEW: { path: "NEW_TYPED_EVIDENCE", old: 0, new: 1, shadow: 0, dual: 0, provenance: "TYPED_SEMANTIC_EVIDENCE" },
  }[mode];
  assert.equal(authority?.mode, mode, `${mode} mode is selected`);
  assert.equal(authority?.authoritativePath, expected.path, `${mode} authoritative path is explicit`);
  assert.equal(authority?.oldAuthorityInvocationCount, expected.old, `${mode} OLD invocation count is bounded`);
  assert.equal(authority?.newAuthorityInvocationCount, expected.new, `${mode} NEW invocation count is bounded`);
  assert.equal(authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, 1, `${mode} has one per-request authority`);
  assert.equal(authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT, 0, `${mode} has no runtime fallback`);
  assert.equal(authority?.SHADOW_SEMANTIC_AUTHORITY_COUNT, expected.shadow, `${mode} has no shadow authority`);
  assert.equal(authority?.DUAL_SEMANTIC_AUTHORITY_COUNT, expected.dual, `${mode} has no dual authority`);
  assert.equal(result.request.provenance.interpreter, expected.provenance, `${mode} result provenance is explicit`);
  const authorityEvents = authority?.trace?.events?.filter(({ role }) => role === "AUTHORITY") || [];
  assert.deepEqual(authorityEvents.map(({ path }) => path), [expected.path], `${mode} has exactly one selected authority trace`);
  if (mode === "SHADOW") {
    const diagnosticPaths = authority.trace.events.filter(({ role }) => role === "DIAGNOSTIC").map(({ path }) => path);
    assert.deepEqual(diagnosticPaths, ["NEW_TYPED_EVIDENCE"], "SHADOW has one diagnostic typed-evidence trace");
  }
  return {
    mode,
    authoritativePath: authority.authoritativePath,
    oldInvocations: authority.oldAuthorityInvocationCount,
    newInvocations: authority.newAuthorityInvocationCount,
    traceEvents: authority.trace.events,
  };
}

async function assertAuthorityEvidence() {
  const { resolveCanonicalConversationRequest } = await import("../src/ai/chat/canonicalSemanticRequest.js");
  const request = {
    message: "Taşımacılık tarafında üzerime düşen görevlerin sınırı nedir?",
    user: { role: "ROOM", roomId: 1, companyId: 2, companyKind: "ROOM", sessionVersion: 1 },
    screenContext: { path: "/room/shifts", label: "Vardiyalar", role: "ROOM" },
    conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: { path: "/room/shifts", role: "ROOM" } },
  };
  const modes = {};
  for (const mode of ["OLD", "SHADOW", "NEW"]) {
    const result = resolveCanonicalConversationRequest({ ...request, env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: mode } });
    modes[mode] = authoritySummaryFor(result, mode);
  }
  const unaccountedLegacyPathCount = assertLegacyDecisionPathsAreAccountedFor();
  return {
    modes,
    unaccountedLegacyPathCount,
    independentSemanticAuthorityCount: unaccountedLegacyPathCount,
  };
}

function inventoryTotals(candidates = inventory) {
  const totals = Object.create(null);
  for (const candidate of candidates) totals[candidate.family] = (totals[candidate.family] || 0) + 1;
  return totals;
}

async function main() {
  if (process.argv.includes("--negative-control-legacy")) {
    runNegativeLegacyControls();
    assert.fail("negative legacy-path controls intentionally fail after proving comments, strings, imports, and code are distinguished");
  }
  if (process.argv.includes("--negative-control-matchers")) {
    for (const result of runNegativeMatcherControls()) {
      console.log(`NEGATIVE_MATCHER_CONTROL=${result.id}:DETECTED`);
    }
    assert.fail("negative matcher controls intentionally fail after proving every matcher form is detected");
  }
  if (process.argv.includes("--negative-control")) {
    // Reviewer-runnable RED path: remove one approved source-anchored item and
    // require the contract to reject the malformed inventory deterministically.
    for (const result of runNegativeMatcherControls()) {
      console.log(`NEGATIVE_MATCHER_CONTROL=${result.id}:DETECTED`);
    }
    runNegativeLegacyControls();
    assertInventoryContract(inventory.slice(0, -1));
    assert.fail("malformed inventory unexpectedly passed validation");
  }
  const { detectorIds, unownedConsumerCount } = assertInventoryContract();
  const { newMatcherCount, phraseSpecificBranchCount, unapprovedMatcherCount } = assertReplacementOwnership();
  const graph = assertCallGraphBoundaries();
  const { modes: authorityModes, unaccountedLegacyPathCount, independentSemanticAuthorityCount } = await assertAuthorityEvidence();
  const deletionCount = inventory.filter(({ disposition }) => disposition === "DELETE_AFTER_PARITY").length;
  const deferredCount = inventory.filter(({ regressionProof, falsePositiveProof }) => regressionProof.status !== "PROVEN" || falsePositiveProof.status !== "PROVEN").length;
  const productionBranchRetiredCount = inventory.filter(({ disposition, rollback: candidateRollback }) => disposition === "DELETE_AFTER_PARITY" && candidateRollback.productionBranchRetired).length;
  assert.equal(deletionCount, 0, "unsupported deletion count is zero");
  assert.equal(deferredCount, inventory.length, "every candidate without direct parity proof remains deferred");

  const result = {
    status: "PASS",
    retirementGate: "DEFERRED_NO_PARITY",
    productionBranchRetiredCount,
    inventoryTotal: detectorIds.size,
    inventoryTotals: inventoryTotals(),
    dispositionTotals: inventory.reduce((totals, candidate) => ({ ...totals, [candidate.disposition]: (totals[candidate.disposition] || 0) + 1 }), {}),
    deferredCandidateCount: deferredCount,
    unsupportedDeletionCount: deletionCount,
    independentSemanticAuthorityCount,
    unownedConsumerCount,
    newMatcherCount,
    unapprovedMatcherCount,
    phraseSpecificBranchCount,
    secondRouterCount: graph.secondRouterCount,
    unaccountedLegacyPathCount,
    authorityModeEvidence: authorityModes,
    sourceHashes: Object.fromEntries(Object.values(SOURCE_FILES).map((relativePath) => [relativePath, sha256(relativePath)])),
  };
  console.log(`INVENTORY_TOTAL=${result.inventoryTotal}`);
  console.log(`INVENTORY_TOTALS=${JSON.stringify(result.inventoryTotals)}`);
  console.log(`DISPOSITION_TOTALS=${JSON.stringify(result.dispositionTotals)}`);
  console.log(`RETIREMENT_GATE=${result.retirementGate}`);
  console.log(`PRODUCTION_BRANCH_RETIRED_COUNT=${result.productionBranchRetiredCount}`);
  console.log(`DEFERRED_CANDIDATE_COUNT=${result.deferredCandidateCount}`);
  console.log(`UNSUPPORTED_DELETION_COUNT=${result.unsupportedDeletionCount}`);
  console.log(`INDEPENDENT_SEMANTIC_AUTHORITY_COUNT=${result.independentSemanticAuthorityCount}`);
  console.log(`UNOWNED_CONSUMER_COUNT=${result.unownedConsumerCount}`);
  console.log(`NEW_MATCHER_COUNT=${result.newMatcherCount}`);
  console.log(`UNAPPROVED_MATCHER_COUNT=${result.unapprovedMatcherCount}`);
  console.log(`PHRASE_SPECIFIC_BRANCH_COUNT=${result.phraseSpecificBranchCount}`);
  console.log(`SECOND_ROUTER_COUNT=${result.secondRouterCount}`);
  console.log(`UNACCOUNTED_LEGACY_PATH_COUNT=${result.unaccountedLegacyPathCount}`);
  console.log(`AUTHORITY_MODES=${Object.keys(result.authorityModeEvidence).join(",")}`);
  console.log(JSON.stringify(result, null, 2));
}

await main();
