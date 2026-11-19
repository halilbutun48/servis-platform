#!/usr/bin/env node

import assert from "node:assert/strict";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const USER_BY_ROLE = Object.freeze({
  COMPANY: { id: 980001, role: "COMPANY", companyId: 1, companyKind: "COMPANY", sessionVersion: 1 },
  ROOM: { id: 980002, role: "ROOM", roomId: 1, companyId: null, sessionVersion: 1 },
  DRIVER: { id: 980003, role: "DRIVER", companyId: 1, sessionVersion: 1 },
  PERSONEL: { id: 980004, role: "PERSONEL", companyId: 1, sessionVersion: 1 },
});

const PATH_BY_ROLE = Object.freeze({
  COMPANY: "/company/operations",
  ROOM: "/room/shifts",
  DRIVER: "/driver/today",
  PERSONEL: "/personel/live",
});

const CASES = Object.freeze([
  {
    id: "OFFICIAL_DECISION_RESPONSIBILITY_FAMILY",
    role: "COMPANY",
    message: "Planlama ekranında karar verirken hangi ölçütlere dikkat etmeliyim?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "OFFICIAL_STARTING_GUIDANCE_FAMILY",
    role: "PERSONEL",
    message: "Bu ekrana ilk geldiğimde hangi göstergeleri tanımalıyım?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "DECISION_RESPONSIBILITY_WITH_NAMED_SURFACE",
    role: "COMPANY",
    message: "Planlama ekranında karar verirken hangi ölçütleri değerlendirmeliyim?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "STARTING_GUIDANCE_WITH_CONTEXTUAL_SURFACE",
    role: "PERSONEL",
    message: "Bu ekrana ilk geldiğimde hangi işaretleri tanımam gerekir?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "DIRECT_ROLE_HELP",
    role: "COMPANY",
    message: "Şirket tarafında hangi görevler bana ait?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "EXPLICIT_SCREEN_EXPLANATION",
    role: "COMPANY",
    message: "Bu ekran nasıl çalışıyor?",
    expected: { roleHelp: false, action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE" },
  },
  {
    id: "CONTEXTUAL_SECTION_PURPOSE",
    role: "COMPANY",
    message: "Bu bölüm ne işe yarıyor?",
    expected: { roleHelp: false, action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE" },
  },
  {
    id: "NAMED_SCREEN_EXPLANATION",
    role: "COMPANY",
    message: "Planlama ekranını açıklar mısın?",
    expected: { roleHelp: false, action: "EXPLAIN", object: "SURFACE" },
  },
  {
    id: "EXPLICIT_SURFACE_SUBREFERENCE",
    role: "COMPANY",
    message: "Planlama ekranındaki bu bölümü açıklar mısın?",
    expected: { roleHelp: false, action: "EXPLAIN", object: "SURFACE" },
  },
  {
    id: "RECORD_DETAILS_CONTROL",
    role: "ROOM",
    message: "Bu vardiyanın ayrıntılarını açıklar mısın?",
    expected: { roleHelp: false, action: "EXPLAIN", object: "SHIFT", operation: "LOOK_UP_FIELD" },
  },
  {
    id: "CONTEXTUAL_ROLE_HELP",
    role: "COMPANY",
    message: "Burada hangi sorumluluklarım var?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "ROLE_BOUNDARY",
    role: "DRIVER",
    message: "Bu rolde hangi sınırlarım var?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "MULTI_ROLE_CONTEXT",
    role: "COMPANY",
    message: "Şirket rolümde hangi görevler bana ait?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "POLITE_ROLE_HELP",
    role: "COMPANY",
    message: "Şirket tarafında hangi görevler bana ait, açıklar mısın?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
  {
    id: "SURFACE_CONTENT_NOT_ROLE_HELP",
    role: "COMPANY",
    message: "Planlama ekranında bu vardiyanın durumu nedir?",
    expected: { roleHelp: false, action: "NONE" },
  },
  {
    id: "KVKK_ACCESS_BOUNDARY_CURRENT_SURFACE",
    role: "ROOM",
    path: "/shared/kvkk",
    message: "Erişim neden kapalı?",
    expected: { roleHelp: false, action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE", screenKnowledgeKind: "KVKK_VISIBILITY" },
  },
  {
    id: "KVKK_ACCESS_BOUNDARY_VARIANT",
    role: "ROOM",
    path: "/shared/kvkk",
    message: "Bu KVKK görünürlüğü neden kısıtlı?",
    expected: { roleHelp: false, action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE", screenKnowledgeKind: "KVKK_VISIBILITY" },
  },
  {
    id: "ACCESS_BOUNDARY_OUTSIDE_KVKK_REMAINS_ROLE_HELP",
    role: "ROOM",
    path: "/room/shifts",
    message: "Erişim neden kapalı?",
    expected: { roleHelp: true, action: "EXPLAIN", operation: "GENERAL_INFORMATION" },
  },
]);

function canonicalFor(item) {
  const screenContext = {
    path: item.path || PATH_BY_ROLE[item.role],
    label: `${item.role} surface`,
    role: item.role,
  };
  const result = resolveCanonicalConversationRequest({
    message: item.message,
    user: USER_BY_ROLE[item.role],
    screenContext,
    conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext },
    interpreterMode: "DETERMINISTIC",
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
  const request = result.request;
  const action = request.semanticAction || {};
  return {
    roleHelp: result.canonicalShape?.roleHelpIntent === true,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    screenKnowledgeKind: result.canonicalShape?.screenKnowledgeKind || null,
    typedRoleHelpCandidate: request.typedEvidence?.quality?.roleHelpCandidate === true,
  };
}

let passed = 0;
for (const item of CASES) {
  const actual = canonicalFor(item);
  assert.equal(actual.roleHelp, item.expected.roleHelp, `${item.id} role-help classification`);
  assert.equal(actual.action, item.expected.action, `${item.id} action`);
  if (Object.hasOwn(item.expected, "object")) assert.equal(actual.object, item.expected.object, `${item.id} object`);
  if (Object.hasOwn(item.expected, "operation")) assert.equal(actual.operation, item.expected.operation, `${item.id} operation`);
  if (Object.hasOwn(item.expected, "screenKnowledgeKind")) assert.equal(actual.screenKnowledgeKind, item.expected.screenKnowledgeKind, `${item.id} screen knowledge kind`);
  passed += 1;
}

console.log(JSON.stringify({
  status: "PASS",
  testCount: CASES.length,
  passCount: passed,
  caseIds: CASES.map(({ id }) => id),
  businessWriteExecution: 0,
  externalLlmProviderCount: 0,
}, null, 2));
