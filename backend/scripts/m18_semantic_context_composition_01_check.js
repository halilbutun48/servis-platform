#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCanonicalSemanticContext } from "../src/ai/chat/canonicalSemanticContext.js";

const company = { id: 990601, role: "COMPANY", companyKind: "COMPANY", companyId: 1, sessionVersion: 1 };

function screen(path, label = path) {
  return { id: 601, path, label, role: "COMPANY" };
}

function context(message, conversationState, screenContext = screen("/company/vardiyalar", "Vardiyalar"), user = company) {
  return buildCanonicalSemanticContext({ message, user, screenContext, conversationState });
}

function assertNoDecisionOutput(value, label) {
  const forbidden = new Set([
    "canonicalRequest",
    "authorizationDecision",
    "authorizationStatus",
    "capability",
    "permission",
    "intent",
    "operation",
    "semanticAction",
    "actionClass",
    "objectClass",
    "workflowIntent",
    "lastResolvedIntent",
    "lastSemanticAction",
    "lastSemanticTarget",
  ]);
  const visit = (current, path, seen) => {
    if (!current || typeof current !== "object" || seen.has(current)) return;
    seen.add(current);
    for (const [key, child] of Object.entries(current)) {
      assert.equal(forbidden.has(key), false, `${label} does not expose ${path}.${key}`);
      visit(child, `${path}.${key}`, seen);
    }
  };
  visit(value, label, new Set());
}

function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function run() {
  const staleState = {
    authScopeVersion: 4,
    activeDomain: "SHIFTS",
    activeGuidedTask: {
      taskId: "stale-shift-task",
      screenPath: "/company/vardiyalar",
      semanticPlan: { family: "UI_GUIDANCE", workflowIntent: "CREATE_SHIFT" },
      taskState: { status: "STALE" },
    },
    uniqueDiscourseReferent: { type: "SHIFT", id: 41, source: "REFERENCE_HISTORY" },
    productContext: { semanticPlan: { family: "UI_GUIDANCE", workflowIntent: "CREATE_SHIFT" } },
    lastSettledResult: { semanticPlan: { family: "UNCLEAR_OR_AMBIGUOUS" } },
  };
  const explicit = context(
    "Yeni sözleşmeye bak",
    staleState,
    screen("/company/agreements", "Sözleşmeler"),
  );
  assert.equal(explicit.continuity?.precedence, "EXPLICIT_INPUT", "new explicit input outranks stale task/reference state");
  assert.equal(explicit.continuity?.task?.status, "REJECTED_STALE", "stale task is rejected");
  assert.equal(explicit.continuity?.reference?.status, "OVERRIDDEN_BY_EXPLICIT", "stale reference is overridden by explicit input");
  assert.equal(explicit.continuity?.clarification?.status, "SUPERSEDED", "superseded clarification does not resurrect");
  assert.equal(explicit.referenceState?.uniqueReferent, null, "explicit input does not retain stale discourse referent");
  assert.notEqual(explicit.currentDomain, "SHIFTS", "stale stored domain cannot outrank the live surface");

  const explicitCarry = context(
    "Yeni vardiyaya bak",
    {
      uniqueDiscourseReferent: { type: "SHIFT", id: 44, source: "REFERENCE_HISTORY" },
      guidedTarget: { targetKey: "company:guided-shift-next", screenPath: "/company/vardiyalar", status: "FOUND" },
      activeGuidedTask: { taskId: "old-shift-task", screenPath: "/company/vardiyalar", semanticPlan: { family: "UI_GUIDANCE" }, taskState: { status: "ACTIVE" } },
      productContext: { semanticPlan: { family: "UI_GUIDANCE" } },
    },
  );
  assert.equal(explicitCarry.continuity?.precedence, "EXPLICIT_INPUT", "explicit input marks same-domain context as superseded");
  assert.equal(explicitCarry.freshness?.currentDomain, "EXPLICIT_INPUT", "explicit input marks current domain freshness");
  assert.equal(explicitCarry.currentDomain, null, "explicit input clears retained current domain projection");
  assert.equal(explicitCarry.activeTask, null, "explicit input clears retained active task projection");
  assert.equal(explicitCarry.workflowState, null, "explicit input clears retained workflow state projection");
  assert.equal(explicitCarry.continuationState?.active, false, "explicit input clears retained continuation activity");
  assert.equal(explicitCarry.referenceState?.selectedEntity, null, "explicit input clears retained selected entity projection");
  assert.equal(explicitCarry.referenceState?.currentTarget, null, "explicit input clears retained current target projection");
  assert.equal(explicitCarry.lastSemanticTarget, null, "explicit input clears last semantic target projection");
  assert.equal(explicitCarry.referenceState?.uniqueReferent, null, "explicit input clears unique reference projection");
  assert.equal(explicitCarry.recoveryState?.active, false, "explicit input clears recovery target projection");
  assert.equal(explicitCarry.recoveryState?.targetKey, null, "explicit input clears retained recovery target");
  assert.equal(explicitCarry.freshness?.activeTask, false, "explicit input clears active-task freshness");
  assert.equal(explicitCarry.contextUsed.some((entry) => entry.source === "ACTIVE_TASK"), false, "overridden task is not context-used");
  assert.equal(explicitCarry.continuity?.provenance.includes("ACTIVE_TASK"), false, "overridden task has no active-task provenance");

  const unique = context(
    "Buna bak",
    {
      uniqueDiscourseReferent: { type: "SHIFT", id: 42, source: "REFERENCE_HISTORY" },
      activeDomain: "SHIFTS",
    },
  );
  assert.equal(unique.continuity?.reference?.status, "UNIQUE", "unique discourse reference resolves");
  assert.deepEqual(unique.continuity?.reference?.referent, { type: "SHIFT", id: 42 }, "unique reference preserves typed identity only");
  assert.equal(unique.continuity?.reference?.freshness, "FRESH", "unique reference carries freshness evidence");

  const ambiguous = context(
    "Buna bak",
    {
      selectedEntitySet: [
        { type: "SHIFT", id: 42, source: "LIVE_UI" },
        { type: "SHIFT", id: 43, source: "LIVE_UI" },
      ],
      activeEntitySet: [
        { type: "SHIFT", id: 42, source: "LIVE_UI" },
        { type: "SHIFT", id: 43, source: "LIVE_UI" },
      ],
    },
  );
  assert.equal(ambiguous.continuity?.reference?.status, "AMBIGUOUS", "ambiguous reference requires clarification");
  assert.equal(ambiguous.continuity?.reference?.referent, null, "ambiguous reference has no fabricated target");
  assert.equal(ambiguous.continuity?.clarification?.status, "REQUIRED", "ambiguous reference produces clarification evidence");

  const continuationState = {
    activeGuidedTask: {
      taskId: "guided-shift-1",
      screenPath: "/company/vardiyalar",
      semanticPlan: { family: "UI_GUIDANCE", workflowIntent: "CREATE_SHIFT" },
      taskState: { status: "ACTIVE" },
    },
    guidedTarget: { targetKey: "company:guided-shift-next", semanticId: "guided-shift-next", screenPath: "/company/vardiyalar", status: "FOUND" },
    productContext: { semanticPlan: { family: "UI_GUIDANCE" } },
  };
  for (const [message, relation] of [["Sonraki adım", "NEXT"], ["Önceki adım", "PREVIOUS"], ["Bunu bulamadım", "RECOVER"]]) {
    const continuation = context(message, continuationState);
    assert.equal(continuation.continuity?.continuation?.status, "VALID", `${relation} continuation is valid`);
    assert.equal(continuation.continuity?.continuation?.relation, relation, `${relation} continuation is typed`);
    assert.equal(continuation.contextUsed.some((entry) => entry.source === "ACTIVE_TASK" && entry.used), true, `${relation} uses an effective active task`);
    assert.equal(continuation.continuity?.provenance.includes("ACTIVE_TASK"), true, `${relation} preserves effective active-task provenance`);
  }

  const validLiveTarget = context(
    "Bunu bulamadım",
    continuationState,
    {
      ...screen("/company/vardiyalar", "Vardiyalar"),
      uiHints: { currentTarget: { targetKey: "company:guided-shift-next", semanticId: "guided-shift-next", screenPath: "/company/vardiyalar", status: "FRESH" } },
    },
  );
  assert.equal(validLiveTarget.continuity?.recovery?.status, "AVAILABLE", "recovery accepts a fresh live target");
  assert.deepEqual(validLiveTarget.continuity?.recovery?.evidence, { targetKey: "company:guided-shift-next", source: "LIVE_UI" }, "recovery preserves live target provenance");

  const invalidTarget = context(
    "Bunu bulamadım",
    { ...continuationState, guidedTarget: { targetKey: "", screenPath: "/company/vardiyalar", status: "STALE" } },
    {
      ...screen("/company/vardiyalar", "Vardiyalar"),
      uiHints: { currentTarget: { targetKey: "stale-target", semanticId: "stale-target", screenPath: "/company/other", status: "STALE" } },
    },
  );
  assert.equal(invalidTarget.continuity?.recovery?.status, "NONE", "recovery rejects invalid or stale targets");
  assert.equal(invalidTarget.continuity?.recovery?.evidence, null, "invalid or stale target cannot become recovery evidence");
  assert.equal(invalidTarget.recoveryState?.active, false, "invalid or stale target is absent from public recovery projection");
  assert.equal(invalidTarget.referenceState?.currentTarget, null, "invalid or stale target is absent from reference projection");

  const missingTargetIdentity = context(
    "Bunu bulamadım",
    { ...continuationState, guidedTarget: { targetKey: "company:guided-shift-next", screenPath: "/company/vardiyalar", status: "FOUND" } },
    {
      ...screen("/company/vardiyalar", "Vardiyalar"),
      uiHints: { currentTarget: { targetKey: "company:guided-shift-next", screenPath: "/company/vardiyalar", status: "FOUND" } },
    },
  );
  assert.equal(missingTargetIdentity.continuity?.recovery?.status, "NONE", "target without semantic identity is rejected");
  assert.equal(missingTargetIdentity.recoveryState?.active, false, "target without semantic identity is not public recovery state");

  const staleTargetStatus = context(
    "Bunu bulamadım",
    { ...continuationState, guidedTarget: { targetKey: "company:guided-shift-next", semanticId: "guided-shift-next", screenPath: "/company/vardiyalar", status: "STALE" } },
    {
      ...screen("/company/vardiyalar", "Vardiyalar"),
      uiHints: { currentTarget: { targetKey: "company:guided-shift-next", semanticId: "guided-shift-next", screenPath: "/company/vardiyalar", status: "STALE" } },
    },
  );
  assert.equal(staleTargetStatus.continuity?.recovery?.status, "NONE", "stale target status is rejected");

  const mismatchedTargetPath = context(
    "Bunu bulamadım",
    { ...continuationState, guidedTarget: { targetKey: "company:guided-shift-next", semanticId: "guided-shift-next", screenPath: "/company/other", status: "FOUND" } },
    {
      ...screen("/company/vardiyalar", "Vardiyalar"),
      uiHints: { currentTarget: { targetKey: "company:guided-shift-next", semanticId: "guided-shift-next", screenPath: "/company/other", status: "FOUND" } },
    },
  );
  assert.equal(mismatchedTargetPath.continuity?.recovery?.status, "NONE", "target on a different screen path is rejected");

  const staleClarification = context(
    "Devam et",
    { revalidationRequired: true, lastSettledResult: { semanticPlan: { family: "UNCLEAR_OR_AMBIGUOUS" } } },
  );
  assert.equal(staleClarification.continuity?.clarification?.status, "REJECTED_STALE", "stale clarification is rejected before availability");
  assert.equal(explicit.continuity?.provenance.includes("ACTIVE_TASK"), false, "stale task has no active-task provenance");
  assert.equal(explicit.contextUsed.some((entry) => entry.source === "ACTIVE_TASK"), false, "stale task is not context-used");

  const roleAndSurfaceOnly = context("Bana ne yapabileceğimi anlat", null, screen("/company/vardiyalar", "Vardiyalar"));
  assert.equal(roleAndSurfaceOnly.continuity?.precedence, "CONTEXT_ONLY", "role and surface remain context-only");
  assert.equal(roleAndSurfaceOnly.continuity?.explicitIntent, false, "role and surface cannot invent explicit intent");
  assert.equal(roleAndSurfaceOnly.continuity?.authorizationEffect, "NONE", "context cannot grant permission");
  assert.equal(roleAndSurfaceOnly.continuity?.capabilityEffect, "NONE", "context cannot invent capability");
  assertNoDecisionOutput(roleAndSurfaceOnly.continuity, "typed context projection");
  assertNoDecisionOutput(roleAndSurfaceOnly, "canonical semantic context");
  assert.ok(roleAndSurfaceOnly.contextUsed.some((entry) => entry.source === "AUTH_CONTEXT" && entry.used), "role provenance is preserved");
  assert.ok(roleAndSurfaceOnly.contextUsed.some((entry) => entry.source === "SURFACE_CONTEXT" && entry.used), "surface provenance is preserved");

  const historyOnly = context(
    "Buna bak",
    { uniqueDiscourseReferent: { type: "SHIFT", id: 55, source: "REFERENCE_HISTORY" } },
    null,
    {},
  );
  assert.equal(historyOnly.contextUsed.some((entry) => entry.source === "AUTH_CONTEXT"), false, "history-only context does not claim auth provenance");
  assert.equal(historyOnly.contextUsed.some((entry) => entry.source === "SURFACE_CONTEXT"), false, "history-only context does not claim surface provenance");
  assert.deepEqual(historyOnly.continuity?.reference?.provenance, ["REFERENCE_HISTORY"], "history reference preserves history provenance");

  const liveReference = context(
    "Buna bak",
    null,
    { ...screen("/company/vardiyalar", "Vardiyalar"), selectedEntity: { type: "SHIFT", id: 56, source: "LIVE_UI" } },
  );
  assert.deepEqual(liveReference.continuity?.reference?.provenance, ["SURFACE_CONTEXT"], "live selection preserves live-surface provenance");
  assert.equal(liveReference.contextUsed.find((entry) => entry.dimension === "reference")?.source, "SURFACE_CONTEXT", "context-used reference source is live surface");

  const currentSurfaceSelection = context(
    "Bu ekrandaki açık sorunları açıkla",
    {
      lastScreenPath: "/room/shifts",
      selectedEntityType: "shift",
      selectedEntityId: 168,
      entityContext: { selectedEntity: { type: "SHIFT", id: 168, source: "REFERENCE_HISTORY" } },
      uniqueDiscourseReferent: { type: "SHIFT", id: 168, source: "REFERENCE_HISTORY" },
    },
    {
      id: 1114,
      path: "/room/operation-health",
      label: "Operasyon Sağlığı",
      role: "ROOM",
      selectedEntityType: "screen",
      selectedEntityId: 1114,
    },
    { id: 990602, role: "ROOM", roomId: 1, companyKind: "ROOM" },
  );
  assert.equal(currentSurfaceSelection.currentEntity, null, "a non-record screen selection cannot become a typed record");
  assert.equal(currentSurfaceSelection.referenceState?.selectedEntity, null, "current screen selection blocks stale record inheritance");
  assert.equal(currentSurfaceSelection.continuity?.reference?.referent, null, "operation-health surface cannot inherit Shift 168");

  const changedSurfaceWithoutSelection = context(
    "Bunu açıkla",
    {
      lastScreenPath: "/room/shifts",
      selectedEntityType: "shift",
      selectedEntityId: 168,
      entityContext: { selectedEntity: { type: "SHIFT", id: 168, source: "REFERENCE_HISTORY" } },
    },
    { path: "/room/commercial-flow", label: "Ticari Akış", role: "ROOM", selectedEntityType: "", selectedEntityId: null },
    { id: 990602, role: "ROOM", roomId: 1, companyKind: "ROOM" },
  );
  assert.equal(changedSurfaceWithoutSelection.currentEntity, null, "route change without a live record clears retained selection");

  const sameSurfaceFollowUp = context(
    "Bunu açıkla",
    {
      lastScreenPath: "/room/drivers",
      selectedEntityType: "driver",
      selectedEntityId: 1,
      entityContext: { selectedEntity: { type: "DRIVER", id: 1, source: "REFERENCE_HISTORY" } },
    },
    { path: "/room/drivers", label: "Sürücüler", role: "ROOM", selectedEntityType: "", selectedEntityId: null },
    { id: 990602, role: "ROOM", roomId: 1, companyKind: "ROOM" },
  );
  assert.deepEqual(sameSurfaceFollowUp.currentEntity, { type: "DRIVER", id: 1 }, "same-surface deictic follow-up preserves one typed record");

  const contextSource = readFileSync(new URL("../src/ai/chat/canonicalSemanticContext.js", import.meta.url), "utf8");
  const forbiddenIoPatterns = [
    /from\s+["']node:(?:fs|http|https|net|child_process)["']/u,
    /\b(?:fetch|XMLHttpRequest)\s*\(/u,
    /\b(?:writeFile|appendFile|exec|spawn)\s*\(/u,
  ];
  const forbiddenIoPatternCount = forbiddenIoPatterns.filter((pattern) => pattern.test(contextSource)).length;
  assert.equal(forbiddenIoPatternCount, 0, "context projection has no I/O or process side-effect path");
  const frozenInput = deepFreeze({ message: "Buna bak", user: { ...company }, screenContext: screen("/company/vardiyalar", "Vardiyalar"), conversationState: { uniqueDiscourseReferent: { type: "SHIFT", id: 57 } } });
  const beforeInput = JSON.stringify(frozenInput);
  const originalFetch = globalThis.fetch;
  let externalNetworkCallCount = 0;
  globalThis.fetch = async () => { externalNetworkCallCount += 1; throw new Error("unexpected fetch"); };
  let frozenProjection;
  try {
    frozenProjection = buildCanonicalSemanticContext(frozenInput);
  } finally {
    globalThis.fetch = originalFetch;
  }
  const afterInput = JSON.stringify(frozenInput);
  const sideEffectAudit = {
    inputMutationCount: beforeInput === afterInput ? 0 : 1,
    externalNetworkCallCount,
    forbiddenIoPatternCount,
    unfrozenProjectionCount: Object.isFrozen(frozenProjection) && Object.isFrozen(frozenProjection.continuity) ? 0 : 1,
  };
  assert.deepEqual(sideEffectAudit, { inputMutationCount: 0, externalNetworkCallCount: 0, forbiddenIoPatternCount: 0, unfrozenProjectionCount: 0 }, "context projection is pure and side-effect free");

  console.log(JSON.stringify({
    status: "PASS",
    cases: ["explicit-overrides-stale", "stale-rejected", "clarification-superseded", "unique-reference", "ambiguous-reference", "continuation-next", "continuation-previous", "recovery", "auth-surface-evidence-only"],
    semanticAuthorityCount: 0,
    authorizationOutputCount: 0,
    businessWriteCount: sideEffectAudit.inputMutationCount + sideEffectAudit.forbiddenIoPatternCount,
    externalLlmNetworkCallCount: sideEffectAudit.externalNetworkCallCount,
  }, null, 2));
}

try {
  run();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
