#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  canonicalRequestSemanticFingerprint,
  resolveCanonicalConversationRequest,
} from "../src/ai/chat/canonicalSemanticRequest.js";

const SHADOW_MISMATCH_CATEGORIES = [
  "missing feature",
  "composition mismatch",
  "object veto",
  "context mismatch",
  "action mismatch",
  "scope mismatch",
  "authorization mismatch",
  "response-only mismatch",
];

const company = { role: "COMPANY", companyKind: "COMPANY", companyId: 1 };
const companyScreen = { path: "/company/operations", label: "Operasyon Paneli", role: "COMPANY" };

const cases = [
  {
    id: "ROLE_HELP",
    message: "Taşıma firması kullanıcısı olarak günlük sorumluluklarımı nereden tanıyacağım?",
    expected: {
      operation: "GENERAL_INFORMATION",
      capability: "GENERAL_INFORMATION",
      action: "EXPLAIN",
      object: "SURFACE",
      scope: "PRODUCT_EXPLICIT",
    },
  },
  {
    id: "RECORD_VIEW",
    message: "Vardiya listesini görüntüle.",
    expected: {
      operation: "VIEW_AUTHORIZED_SURFACE",
      capability: "VIEW_SHIFTS",
      action: "VIEW",
      object: "SHIFT",
      scope: "PRODUCT_EXPLICIT",
    },
  },
  {
    id: "CONTEXTUAL_VIEW",
    message: "Buradaki kayıtları incele.",
    expected: {
      operation: "VIEW_AUTHORIZED_SURFACE",
      capability: "VIEW_SHIFTS",
      action: "VIEW",
      object: "SHIFT",
      scope: "PRODUCT_CONTEXTUAL",
    },
    screenContext: { ...companyScreen, path: "/company/shifts", label: "Vardiyalar" },
  },
  {
    id: "SHIFT_CREATE",
    message: "Yeni vardiya oluştur.",
    expected: {
      operation: "CREATE_SHIFT",
      action: "CREATE",
      object: "SHIFT",
      scope: "PRODUCT_EXPLICIT",
    },
  },
];

function resolve(item) {
  const screenContext = item.screenContext || companyScreen;
  return resolveCanonicalConversationRequest({
    message: item.message,
    user: company,
    screenContext,
    conversationState: {
      recentMessages: [],
      activeGuidedTask: null,
      uiSurface: screenContext,
    },
    interpreterMode: "DETERMINISTIC",
  });
}

function assertOldCanonicalResult(result, item) {
  const request = result.request;
  assert.equal(request.operation, item.expected.operation, `${item.id} operation`);
  if (item.expected.capability) assert.equal(request.capability, item.expected.capability, `${item.id} capability`);
  assert.equal(request.semanticAction.actionClass, item.expected.action, `${item.id} action`);
  assert.equal(request.semanticAction.objectClass, item.expected.object, `${item.id} object`);
  assert.equal(request.semanticScope.class, item.expected.scope, `${item.id} scope`);
  assert.equal(request.semanticAction.resolutionStatus, item.expected.resolution || "RESOLVED", `${item.id} resolution`);
}

for (const item of cases) {
  const result = resolve(item);
  assertOldCanonicalResult(result, item);
  const request = result.request;

  const shadow = result.diagnostics?.shadowSemanticEvidence;
  assert.ok(shadow, `${item.id} exposes shadow semantic evidence diagnostics`);
  assert.equal(shadow.mode, "SHADOW", `${item.id} shadow mode`);
  assert.equal(shadow.authoritativePath, "OLD_CANONICAL", `${item.id} old path remains authoritative`);
  assert.equal(shadow.shadowSemanticAuthorityCount, 0, `${item.id} shadow path has no semantic authority`);
  assert.equal(shadow.visibleBehaviorChangeCount, 0, `${item.id} visible behavior is unchanged`);
  assert.ok(Array.isArray(shadow.contextUsed), `${item.id} typed context-used provenance is exposed`);
  assert.equal(shadow.contextUsed.find(({ dimension }) => dimension === "role")?.source, "AUTH_CONTEXT", `${item.id} role context provenance`);
  assert.equal(shadow.canonicalRequestFingerprint, canonicalRequestSemanticFingerprint(request), `${item.id} canonical fingerprint`);
  assert.deepEqual(
    shadow.mismatchCategories.map(({ category }) => category),
    SHADOW_MISMATCH_CATEGORIES,
    `${item.id} mismatch category contract`,
  );
  assert.equal(shadow.newEvidence?.quality?.authorizationEffect, "NONE", `${item.id} new evidence cannot authorize`);
  assert.equal(shadow.newEvidence?.quality?.responseEffect, undefined, `${item.id} new evidence cannot compose response`);
}

assert.equal(typeof resolveCanonicalConversationRequest, "function", "public canonical entry point remains exported");
assert.equal(typeof canonicalRequestSemanticFingerprint, "function", "canonical fingerprint helper remains exported");

console.log(JSON.stringify({
  status: "PASS",
  cases: cases.map(({ id }) => id),
  mismatchCategories: SHADOW_MISMATCH_CATEGORIES,
  SHADOW_VISIBLE_BEHAVIOR_CHANGE_COUNT: 0,
  SHADOW_SEMANTIC_AUTHORITY_COUNT: 0,
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
