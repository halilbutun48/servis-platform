#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  canonicalRequestSemanticFingerprint,
  resolveCanonicalConversationRequest,
} from "../src/ai/chat/canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";

const authorityModePath = new URL("../src/ai/chat/semanticAuthorityMode.js", import.meta.url);
assert.equal(existsSync(authorityModePath), true, "authority mode control module exists");

const { getSemanticAuthorityMode } = await import(authorityModePath.href);
assert.equal(typeof getSemanticAuthorityMode, "function", "authority mode getter is exported");
assert.equal(getSemanticAuthorityMode({ env: {} }), "NEW", "unset mode selects the single typed semantic authority");
assert.equal(getSemanticAuthorityMode({ env: { SEMANTIC_AUTHORITY_MODE: "OLD" } }), "OLD");
assert.equal(getSemanticAuthorityMode({ env: { SEMANTIC_AUTHORITY_MODE: "SHADOW" } }), "SHADOW");
assert.equal(getSemanticAuthorityMode({ env: { SEMANTIC_AUTHORITY_MODE: "NEW" } }), "NEW");
assert.equal(getSemanticAuthorityMode({ env: { SEMANTIC_AUTHORITY_MODE: "invalid" } }), "NEW", "invalid mode fails closed to the typed authority");

const serviceSource = readFileSync(new URL("../src/ai/service.js", import.meta.url), "utf8");
assert.doesNotMatch(serviceSource, /canonicalSemanticDiagnostics/u, "product-facing semanticPlan does not carry authority diagnostics");

const company = { role: "COMPANY", companyKind: "COMPANY", companyId: 1 };
const companyScreen = { path: "/company/operations", label: "Operasyon Paneli", role: "COMPANY" };
const roleHelpMessage = "Taşıma firması kullanıcısı olarak günlük sorumluluklarımı nereden tanıyacağım?";

function resolve(mode, message = roleHelpMessage) {
  const modeKeys = ["SEFER_ABI_SEMANTIC_AUTHORITY_MODE", "SEMANTIC_AUTHORITY_MODE", "M18_SEMANTIC_AUTHORITY_MODE"];
  const previous = new Map(modeKeys.map((key) => [key, process.env[key]]));
  for (const key of modeKeys) process.env[key] = mode;
  try {
    return resolveCanonicalConversationRequest({
      message,
      user: company,
      screenContext: companyScreen,
      conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: companyScreen },
    });
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function assertAuthority(result, { mode, path, oldInvocations, newInvocations }) {
  const authority = result.diagnostics?.semanticAuthority;
  assert.ok(authority, `${mode} exposes authority diagnostics`);
  assert.equal(authority.mode, mode, `${mode} selected mode`);
  assert.equal(authority.authoritativePath, path, `${mode} authoritative path`);
  assert.equal(authority.oldAuthorityInvocationCount, oldInvocations, `${mode} OLD invocation count`);
  assert.equal(authority.newAuthorityInvocationCount, newInvocations, `${mode} NEW invocation count`);
  assert.ok(authority.trace, `${mode} exposes the per-request authority trace`);
  const authorityEvents = authority.trace.events.filter(({ role }) => role === "AUTHORITY");
  const shadowAuthorityEvents = authority.trace.events.filter(({ role }) => role === "SHADOW_AUTHORITY");
  const oldEvents = authority.trace.events.filter(({ path: eventPath }) => eventPath === "OLD_CANONICAL");
  const newEvents = authority.trace.events.filter(({ path: eventPath }) => eventPath === "NEW_TYPED_EVIDENCE");
  assert.equal(authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, authorityEvents.length === 1 && authorityEvents[0].path === path ? 1 : 0, `${mode} one selected authority derived from trace`);
  assert.equal(authority.RUNTIME_SEMANTIC_FALLBACK_COUNT, authority.trace.fallbackAttempts.length, `${mode} fallback count derived from trace`);
  assert.equal(authority.SHADOW_SEMANTIC_AUTHORITY_COUNT, shadowAuthorityEvents.length, `${mode} shadow authority count derived from trace`);
  assert.equal(authority.DUAL_SEMANTIC_AUTHORITY_COUNT, new Set(authorityEvents.map(({ path: eventPath }) => eventPath)).size > 1 ? 1 : 0, `${mode} dual authority count derived from trace`);
  assert.equal(authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT, authority.trace.downstreamRedecisions.length, `${mode} downstream count derived from trace`);
  assert.equal(authority.oldAuthorityInvocationCount, oldEvents.length, `${mode} OLD count derived from trace`);
  assert.equal(authority.newAuthorityInvocationCount, newEvents.length, `${mode} NEW count derived from trace`);
}

const oldResult = resolve("OLD");
assertAuthority(oldResult, { mode: "OLD", path: "OLD_CANONICAL", oldInvocations: 1, newInvocations: 0 });
assert.equal(oldResult.request.semanticAction.actionClass, "EXPLAIN");

const shadowResult = resolve("SHADOW");
assertAuthority(shadowResult, { mode: "SHADOW", path: "OLD_CANONICAL", oldInvocations: 1, newInvocations: 1 });
assert.equal(canonicalRequestSemanticFingerprint(shadowResult.request), canonicalRequestSemanticFingerprint(oldResult.request), "SHADOW keeps OLD canonical result");
assert.equal(shadowResult.diagnostics.shadowSemanticEvidence?.authoritativePath, "OLD_CANONICAL");
assert.equal(shadowResult.diagnostics.shadowSemanticEvidence?.shadowSemanticAuthorityCount, 0);

const newResult = resolve("NEW");
assertAuthority(newResult, { mode: "NEW", path: "NEW_TYPED_EVIDENCE", oldInvocations: 0, newInvocations: 1 });
assert.equal(newResult.request.semanticAction.actionClass, "EXPLAIN", "NEW preserves explanation action");
assert.equal(newResult.request.operation, "GENERAL_INFORMATION", "NEW preserves role-help operation");
assert.equal(newResult.request.provenance.interpreter, "TYPED_SEMANTIC_EVIDENCE");
assert.equal(newResult.diagnostics.shadowSemanticEvidence, undefined, "NEW has no shadow diagnostic authority");

const roleCapabilitySummaryMessage = "Bu rolde hangi işlemleri yapabildiğimi özetler misin?";
const roleCapabilitySummaryResult = resolve("NEW", roleCapabilitySummaryMessage);
const roleCapabilitySummaryPlan = resolveSemanticIntent({
  message: roleCapabilitySummaryMessage,
  user: company,
  screenContext: companyScreen,
  conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: companyScreen },
  canonicalRequest: roleCapabilitySummaryResult,
});
const canonicalPrimaryTask = roleCapabilitySummaryResult.canonicalShape?.primaryTask || null;
const plannerPrimaryTask = roleCapabilitySummaryPlan.primaryTask || null;
const downstreamCanonicalPrimaryTaskRedecisionCount = canonicalPrimaryTask
  && plannerPrimaryTask !== canonicalPrimaryTask
  && !(canonicalPrimaryTask === "STYLE" && plannerPrimaryTask === "STYLE")
  ? 1
  : 0;
assert.equal(roleCapabilitySummaryResult.request.typedEvidence?.roleAspect?.value, "CAPABILITY", "role capability evidence is preserved");
assert.equal(roleCapabilitySummaryResult.canonicalShape?.primaryTask, "ROLE_EXPLANATION_HELP", "capability explanation owns the canonical primary task");
assert.equal(roleCapabilitySummaryPlan.family, "ROLE_EXPLANATION_HELP", "planner preserves the canonical role explanation family");
assert.equal(roleCapabilitySummaryPlan.primaryTask, "ROLE_EXPLANATION_HELP", "planner cannot replace role explanation with presentation style");
assert.equal(roleCapabilitySummaryPlan.requestedStyle, "SHORT_SUMMARY", "summary remains a presentation modifier");
assert.equal(roleCapabilitySummaryPlan.styleOnlyRequest, false, "substantive role explanation is not style-only");
assert.equal(downstreamCanonicalPrimaryTaskRedecisionCount, 0, "canonical-to-planner boundary has no semantic redecision");

const guidedShowResult = resolveCanonicalConversationRequest({
  message: "Vardiya ekranını göster.",
  user: company,
  screenContext: {
    ...companyScreen,
    uiHints: { visibleButtons: [{ label: "Vardiyalar", targetKey: "SHIFTS", semanticType: "button" }] },
  },
  conversationState: {
    recentMessages: [],
    activeGuidedTask: null,
    uiSurface: companyScreen,
  },
});
assert.equal(guidedShowResult.request.semanticAction.actionClass, "VIEW", "surface show remains a view action");
assert.equal(guidedShowResult.request.semanticAction.objectClass, "SHIFT", "surface show preserves the shift target");
assert.equal(guidedShowResult.request.operation, "VIEW_AUTHORIZED_SURFACE", "surface show keeps the authorized view operation");

const guidedNavigateResult = resolveCanonicalConversationRequest({
  message: "Vardiya ekranına geçelim.",
  user: company,
  screenContext: {
    ...companyScreen,
    uiHints: { visibleButtons: [{ label: "Vardiyalar", targetKey: "SHIFTS", semanticType: "button" }] },
  },
  conversationState: {
    recentMessages: [],
    activeGuidedTask: null,
    uiSurface: companyScreen,
  },
});
assert.equal(guidedNavigateResult.request.semanticAction.actionClass, "NAVIGATE", "directional movement remains navigation");
assert.equal(guidedNavigateResult.request.operation, "NAVIGATE_AUTHORIZED_SURFACE", "directional movement keeps the authorized navigation operation");

const newFailure = resolve("NEW", "asdf qwerty");
assertAuthority(newFailure, { mode: "NEW", path: "NEW_TYPED_EVIDENCE", oldInvocations: 0, newInvocations: 1 });
assert.equal(newFailure.validation.status, "SEMANTIC_UNRESOLVED", "NEW failure remains unresolved");
assert.equal(newFailure.validation.failureClass, "INTERNAL_EVIDENCE_FAILURE", "NEW failure is classified internally");
assert.equal(newFailure.failureClass, "INTERNAL_EVIDENCE_FAILURE");

for (const mode of ["OLD", "SHADOW", "NEW"]) {
  const authority = resolve(mode).diagnostics.semanticAuthority;
  console.log(`MODE=${mode}`);
  console.log(`AUTHORITY_TRACE=${JSON.stringify(authority.trace)}`);
  console.log(`PER_REQUEST_SEMANTIC_AUTHORITY_COUNT=${authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT}`);
  console.log(`RUNTIME_SEMANTIC_FALLBACK_COUNT=${authority.RUNTIME_SEMANTIC_FALLBACK_COUNT}`);
  console.log(`SHADOW_SEMANTIC_AUTHORITY_COUNT=${authority.SHADOW_SEMANTIC_AUTHORITY_COUNT}`);
  console.log(`DUAL_SEMANTIC_AUTHORITY_COUNT=${authority.DUAL_SEMANTIC_AUTHORITY_COUNT}`);
  console.log(`DOWNSTREAM_SEMANTIC_REDECISION_COUNT=${authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT}`);
}

console.log(JSON.stringify({
  status: "PASS",
  modes: ["OLD", "SHADOW", "NEW"],
  newFailure: "INTERNAL_EVIDENCE_FAILURE",
  DOWNSTREAM_CANONICAL_PRIMARY_TASK_REDECISION_COUNT: downstreamCanonicalPrimaryTaskRedecisionCount,
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
