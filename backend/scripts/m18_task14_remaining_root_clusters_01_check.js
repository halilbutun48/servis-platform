#!/usr/bin/env node

import assert from "node:assert/strict";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = "NEW";

const company = { role: "COMPANY", companyId: 1, companyKind: "COMPANY" };
const surface = {
  id: 2101,
  path: "/company/operations",
  label: "Operasyon Paneli",
  role: "COMPANY",
};

function resolve(message, {
  screenContext = surface,
  conversationState = { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext },
  user = company,
} = {}) {
  return resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState,
    interpreterMode: "DETERMINISTIC",
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
}

function shape(result) {
  const request = result.request || {};
  const action = request.semanticAction || {};
  return {
    scope: request.semanticScope?.class || null,
    requestMode: action.requestMode || result.canonicalShape?.typedEvidence?.requestMode || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    reference: request.typedEvidence?.reference?.value || request.typedEvidence?.reference || null,
    resolutionStatus: action.resolutionStatus || null,
    task: result.canonicalShape?.taskType || null,
    operation: request.operation || null,
  };
}

function check(id, message, expected, options = {}) {
  const actual = shape(resolve(message, options));
  const failures = [];
  for (const [field, value] of Object.entries(expected)) {
    if (actual[field] !== value) failures.push({ field, expected: value, actual: actual[field] });
  }
  return { id, message, expected, actual, failures };
}

const cluster1 = [
  check("G01_D_CONTEXTUAL_SURFACE", "Buradaki bölümün işleyişini açıklar mısın.", {
    action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE",
  }),
  check("SURFACE_EXPLAIN_SECTION_PURPOSE", "Bu bölüm ne işe yarıyor?", {
    action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE",
  }),
  check("SURFACE_EXPLAIN_SCREEN_WORKING", "Buradaki ekranın çalışma mantığını anlat.", {
    action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE",
  }),
  check("SURFACE_EXPLAIN_PAGE", "Bu sayfayı açıklar mısın.", {
    action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE",
  }),
  check("FIELD_LOOKUP_RECORD_STATUS", "Bu kaydın durumunu anlat.", {
    action: "EXPLAIN", object: "RECORD", operation: "LOOK_UP_FIELD",
  }, {
    conversationState: {
      recentMessages: [],
      activeGuidedTask: null,
      uiSurface: surface,
      uniqueDiscourseReferent: { type: "SHIFT", id: 42 },
    },
  }),
  check("FIELD_LOOKUP_PAYMENT_AMOUNT", "Ödeme tutarı nedir.", {
    action: "EXPLAIN", object: "RECORD", operation: "LOOK_UP_FIELD",
  }),
  check("FIELD_LOOKUP_AGREEMENT_START", "Bu sözleşmenin başlangıç tarihi nedir.", {
    action: "EXPLAIN", object: "AGREEMENT", operation: "LOOK_UP_FIELD",
  }, {
    conversationState: {
      recentMessages: [],
      activeGuidedTask: null,
      uiSurface: surface,
      uniqueDiscourseReferent: { type: "AGREEMENT", id: 84 },
    },
  }),
  check("GENERIC_USAGE_INCIDENTAL_SURFACE", "Nasıl kullanırım?", {
    action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE",
  }),
  check("GENERIC_ROLE_HELP_INCIDENTAL_SURFACE", "Bu rolde hangi işleri öğrenerek başlamalıyım?", {
    action: "EXPLAIN", object: "SURFACE", operation: "GENERAL_INFORMATION",
  }),
  check("EXPLICIT_SURFACE_PURPOSE", "Bu ekran ne işe yarıyor?", {
    action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE",
  }),
  check("INVALID_DEICTIC_SURFACE", "Burayı nasıl kullanırım", {
    action: "NONE", object: null, operation: "CLARIFY_SEMANTIC_REQUEST",
  }, { screenContext: null, conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: null } }),
  check("EXPLICIT_VIEW", "Vardiya listesini görüntüle.", {
    action: "VIEW", object: "SHIFT",
  }),
  check("EXPLICIT_NAVIGATE", "Sözleşmeler sayfasına geçelim.", {
    action: "NAVIGATE", object: "SURFACE",
  }),
];

const cluster2 = [
  check("I01_E_TRUE_RECORD_VIEW", "Bu haftanın sefer kayıtlarını incelemek istiyorum.", {
    action: "VIEW", object: "SHIFT", reference: "ABSENT", resolutionStatus: "RESOLVED", operation: "VIEW_AUTHORIZED_SURFACE",
  }),
  check("PLAN_ONLY_RECORD_VIEW", "Bu haftanın sefer kayıtlarını incelemek istiyorum.", {
    action: "VIEW", object: "SHIFT", reference: "ABSENT", resolutionStatus: "RESOLVED", operation: "VIEW_AUTHORIZED_SURFACE",
  }),
  check("TEMPORAL_THIS_MONTH", "Bu ayın seferlerini görüntüle.", {
    action: "VIEW", object: "SHIFT", reference: "ABSENT", resolutionStatus: "RESOLVED", operation: "VIEW_AUTHORIZED_SURFACE",
  }),
  check("TEMPORAL_TODAY", "Bugünkü vardiyaları göster.", {
    action: "VIEW", object: "SHIFT", reference: "ABSENT", resolutionStatus: "RESOLVED", operation: "VIEW_AUTHORIZED_SURFACE",
  }),
  check("TEMPORAL_TOMORROW", "Yarınki seferleri incelemek istiyorum.", {
    action: "VIEW", object: "SHIFT", reference: "ABSENT", resolutionStatus: "RESOLVED", operation: "VIEW_AUTHORIZED_SURFACE",
  }),
  check("TEMPORAL_LAST_WEEK", "Geçen haftanın sefer kayıtlarını göster.", {
    action: "VIEW", object: "SHIFT", reference: "ABSENT", resolutionStatus: "RESOLVED", operation: "VIEW_AUTHORIZED_SURFACE",
  }),
  check("DEICTIC_RECORD_MISSING", "Bu kaydı göster.", {
    action: "NONE", object: null, reference: "UNRESOLVED", resolutionStatus: "UNRESOLVED", operation: "CLARIFY_SEMANTIC_REQUEST",
  }),
  check("DEICTIC_AGREEMENT_MISSING", "Şu sözleşmenin durumunu anlat.", {
    action: "NONE", object: null, reference: "UNRESOLVED", resolutionStatus: "UNRESOLVED", operation: "CLARIFY_SEMANTIC_REQUEST",
  }),
  check("DEICTIC_BUNU_MISSING", "Bunu görüntüle.", {
    action: "NONE", object: null, reference: "UNRESOLVED", resolutionStatus: "UNRESOLVED", operation: "CLARIFY_SEMANTIC_REQUEST",
  }),
  check("DEICTIC_RECORD_VALID", "Bu kaydın durumunu göster.", {
    action: "VIEW", object: "RECORD", reference: "UNIQUE", resolutionStatus: "RESOLVED", operation: "VIEW_AUTHORIZED_SURFACE",
  }, {
    conversationState: {
      recentMessages: [],
      activeGuidedTask: null,
      uiSurface: surface,
      uniqueDiscourseReferent: { type: "SHIFT", id: 42 },
    },
  }),
];

const family = process.argv[2];
if (family !== "cluster1" && family !== "cluster2") {
  throw new Error("usage: node m18_task14_remaining_root_clusters_01_check.js cluster1|cluster2");
}

const results = family === "cluster1" ? cluster1 : cluster2;
const failures = results.flatMap((result) => result.failures.map((failure) => ({ ...failure, id: result.id, message: result.message })));
console.log(JSON.stringify({
  status: failures.length === 0 ? "PASS" : "EXPECTED_RED",
  family,
  caseCount: results.length,
  failedCaseCount: new Set(failures.map((failure) => failure.id)).size,
  results,
}, null, 2));
process.exitCode = failures.length === 0 ? 0 : 1;
