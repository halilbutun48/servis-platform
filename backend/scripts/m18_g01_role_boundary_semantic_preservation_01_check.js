#!/usr/bin/env node

import assert from "node:assert/strict";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";
import { authorizeSemanticRequest } from "../src/ai/chat/authorizationGate.js";
import { runCopilotFoundation } from "../src/ai/service.js";

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = "NEW";

const screenContext = { path: "/role-boundary", label: "ROLE_BOUNDARY", role: "ROOM", companyKind: "ROOM" };

function resolve(message, role) {
  const user = { role, companyId: 2, companyKind: role };
  return resolveCanonicalConversationRequest({
    message,
    user,
    screenContext: { ...screenContext, role, companyKind: role },
    interpreterMode: "DETERMINISTIC",
  });
}

function assertMeaning(result, expectedAction, expectedObject, label) {
  assert.equal(result.request.semanticAction.actionClass, expectedAction, `${label} action`);
  assert.equal(result.request.semanticAction.objectClass, expectedObject, `${label} object`);
  assert.equal(result.request.semanticAction.resolutionStatus, "RESOLVED", `${label} resolution`);
  assert.equal(result.request.safety.writeBoundary, "NO_BUSINESS_WRITE", `${label} write boundary`);
}

async function main() {
  const createCases = [
    { id: "ROOM_CREATE_SHIFT", role: "ROOM", message: "Yeni vardiya oluşturmak istiyorum.", object: "SHIFT" },
    { id: "ROOM_PLAN_SHIFT", role: "ROOM", message: "Yeni vardiya planlamak istiyorum.", object: "SHIFT" },
    { id: "PARENT_CREATE_SHIFT", role: "PARENT", message: "Yeni vardiya oluşturmak istiyorum.", object: "SHIFT" },
    { id: "DRIVER_CREATE_AGREEMENT", role: "DRIVER", message: "Yeni sözleşme oluşturmak istiyorum.", object: "AGREEMENT" },
    { id: "COMPANY_CREATE_SHIFT", role: "COMPANY", message: "Yeni vardiya oluşturmak istiyorum.", object: "SHIFT" },
  ];

  const results = [];
  for (const testCase of createCases) {
    const result = resolve(testCase.message, testCase.role);
    const authorization = await authorizeSemanticRequest({
      user: { role: testCase.role, companyId: 2, companyKind: testCase.role },
      request: result.request,
    });
    assertMeaning(result, "CREATE", testCase.object, testCase.id);
    if (["ROOM_CREATE_SHIFT", "ROOM_PLAN_SHIFT"].includes(testCase.id)) {
      assert.equal(
        authorization.authorizationStatus,
        "AUTHORIZED",
        `${testCase.id} authorizes the existing read-only surface only`,
      );
      assert.equal(
        result.request.operation,
        "OPEN_EXISTING_SHIFT_OPERATIONS",
        `${testCase.id} must not resolve to a business-create operation`,
      );
      assert.equal(
        result.canonicalShape?.roleCapabilityBoundary,
        "ROOM_CREATE_UNSUPPORTED",
        `${testCase.id} keeps the ROOM capability boundary`,
      );
    } else {
      assert.equal(authorization.authorizationStatus, "REQUIRES_CLARIFICATION", `${testCase.id} authorization boundary`);
      assert.notEqual(authorization.authorizationStatus, "AUTHORIZED", `${testCase.id} must not grant execution permission`);
    }
    results.push({
      id: testCase.id,
      role: testCase.role,
      action: result.request.semanticAction.actionClass,
      object: result.request.semanticAction.objectClass,
      operation: result.request.operation,
      authorization: authorization.authorizationStatus,
      writeBoundary: result.request.safety.writeBoundary,
      roleCapabilityBoundary: result.canonicalShape?.roleCapabilityBoundary || null,
    });
  }

  const explainCases = [
    // The current NEW_TYPED_EVIDENCE contract keeps a how-to creation
    // question as authorized surface guidance.  The CREATE candidate is
    // retained as typed evidence while the executable operation remains a
    // read-only surface explanation.
    { id: "CREATE_EXPLANATION_QUESTION", role: "ROOM", message: "Yeni vardiya nasıl oluşturulur.", action: "CREATE", object: "SHIFT" },
    { id: "CREATE_EXPLANATION_REQUEST", role: "ROOM", message: "Vardiya oluşturma sürecini anlat.", object: "SURFACE" },
  ];
  for (const testCase of explainCases) {
    const result = resolve(testCase.message, testCase.role);
    assertMeaning(result, testCase.action || "EXPLAIN", testCase.object, testCase.id);
    if (testCase.id === "CREATE_EXPLANATION_QUESTION") {
      assert.equal(result.request.operation, "OPEN_EXISTING_SHIFT_OPERATIONS", `${testCase.id} operation`);
      assert.equal(result.request.capability, "OPEN_SHIFT_SURFACE", `${testCase.id} capability`);
      assert.equal(result.canonicalShape?.taskType, "SCREEN_CONTEXT", `${testCase.id} surface task`);
      assert.equal(result.canonicalShape?.roleCapabilityBoundary, "ROOM_CREATE_UNSUPPORTED", `${testCase.id} capability boundary`);
      assert.equal(result.request.safety.actionPolicy, "SAFE_UI_ONLY", `${testCase.id} action policy`);
      assert.equal(result.request.safety.writeBoundary, "NO_BUSINESS_WRITE", `${testCase.id} write boundary`);
    }
    results.push({
      id: testCase.id,
      role: testCase.role,
      action: result.request.semanticAction.actionClass,
      object: result.request.semanticAction.objectClass,
      operation: result.request.operation,
    });
  }

  const continuationSession = `m18-room-capability-continuity-${Date.now()}`;
  const roomUser = { id: 884001, role: "ROOM", roomId: 1, companyId: 2, companyKind: "ROOM" };
  const roomEntry = await runCopilotFoundation({
    intent: "CHAT_HELP",
    entityType: "screen",
    entityId: 0,
    user: roomUser,
    message: "Ben vardiya oluşturmak istiyorum.",
    screenContext: { path: "/room", label: "Taşımacılık Firması Merkezi", role: "ROOM" },
    authSessionId: continuationSession,
  });
  assert.equal(
    roomEntry?.semanticPlan?.roleCapabilityBoundary,
    "ROOM_CREATE_UNSUPPORTED",
    "ROOM create entry keeps the capability boundary",
  );
  const continuationReplies = new Map();
  for (const message of ["Adım adım anlat.", "Devam.", "Geri.", "Bulamadım."]) {
    const continuation = await runCopilotFoundation({
      intent: "CHAT_HELP",
      entityType: "screen",
      entityId: 0,
      user: roomUser,
      message,
      screenContext: { path: "/room/shifts", label: "Vardiyalar", role: "ROOM" },
      authSessionId: continuationSession,
    });
    assert.notEqual(
      continuation?.semanticPlan?.family,
      "ROLE_EXPLANATION_HELP",
      `ROOM capability continuation is not generic role help for ${message}`,
    );
    const boundary = continuation?.semanticPlan?.roleCapabilityBoundary
      || continuation?.semanticPlan?.continuationBasePlan?.roleCapabilityBoundary;
    assert.equal(
      boundary,
      "ROOM_CREATE_UNSUPPORTED",
      `ROOM capability boundary remains attached for ${message}`,
    );
    const expectedContinuationAction = message.startsWith("Geri")
      ? "BACK"
      : message.startsWith("Bulamadım")
        ? "RECOVER"
        : "CONTINUE";
    assert.equal(
      continuation?.semanticPlan?.continuationAction
        || continuation?.semanticPlan?.typedRequest?.continuationAction,
      expectedContinuationAction,
      `ROOM continuation action remains typed for ${message}`,
    );
    assert.match(
      String(continuation?.reply || ""),
      message === "Adım adım anlat."
        ? /Vardiyalar.*oluşturulmaz|oluşturulmaz.*Vardiyalar/iu
        : /Vardiyalar/iu,
      `ROOM capability boundary remains visible for ${message}`,
    );
    assert.equal(
      continuation?.semanticPlan?.canonicalRequest?.safety?.writeBoundary,
      "NO_BUSINESS_WRITE",
      `ROOM continuation stays read-only for ${message}`,
    );
    continuationReplies.set(message, String(continuation?.reply || ""));
  }
  assert.equal(
    continuationReplies.get("Geri."),
    continuationReplies.get("Adım adım anlat."),
    "ROOM BACK restores the previous server-owned guidance step",
  );
  assert.doesNotMatch(
    continuationReplies.get("Geri."),
    /devam adımındasın/iu,
    "ROOM BACK does not re-render the current continuation step",
  );

  console.log(JSON.stringify({
    status: "PASS",
    semanticAuthority: "NEW_TYPED_EVIDENCE",
    roleBoundary: "SEMANTIC_MEANING_BEFORE_AUTHORIZATION",
    cases: results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
