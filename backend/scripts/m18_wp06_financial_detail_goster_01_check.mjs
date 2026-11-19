#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  buildSeferAbiCostAnalysisResponse,
  financialSurfaceNavigationAction,
} from "../src/ai/chat/seferAbiCostAnalysisAssistant.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";

const user = { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 };
const screenContext = {
  path: "/room/financial-operations",
  role: "ROOM",
  surfaceRole: "ROOM",
  label: "Finansal Operasyonlar",
};
const message = "Hakedişlerimi göster.";
const canonicalRequestResult = resolveCanonicalConversationRequest({
  message,
  user,
  screenContext,
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});

assert.equal(canonicalRequestResult.validation?.status, "VALID");
assert.equal(canonicalRequestResult.request?.domain, "FINANCE");
assert.equal(canonicalRequestResult.request?.operation, "LOOK_UP_FIELD");

const response = await buildSeferAbiCostAnalysisResponse({
  baseResponse: {
    ok: true,
    provider: "local-foundation",
    providerSummary: "cost-analysis-authorized-route",
    semanticPlan: { canonicalRequest: canonicalRequestResult.request },
    screenPath: screenContext.path,
    screenLabel: screenContext.label,
  },
  user,
  message,
  screenContext,
});

assert.match(
  String(response.reply || response.summary || ""),
  /hakediş|hakediş listesi|doğrulanabilir.*hedef/i,
  "unsupported ROOM finance display request must return a grounded limitation instead of an empty reply",
);
assert.equal(response.safety?.writeAction ?? false, false);
assert.equal(response.guidedTarget?.status ?? "NOT_FOUND", "NOT_FOUND");

const agreementScreenContext = {
  path: "/room/agreements",
  role: "ROOM",
  surfaceRole: "ROOM",
  label: "Sözleşmeler",
  selectedRecord: { type: "agreement", id: 184 },
};
const detailMessage = "Finansal detayı göster";
assert.ok(
  financialSurfaceNavigationAction({ message: detailMessage, screenPath: agreementScreenContext.path })?.actionKind === "OPEN_ROUTE"
    && financialSurfaceNavigationAction({ message: detailMessage, screenPath: agreementScreenContext.path })?.path === "/room/financial-operations",
  "explicit financial detail requests from an authorized non-financial surface expose the read-only financial route",
);
assert.ok(
  financialSurfaceNavigationAction({ message: "Mali ayrıntıları aç", screenPath: agreementScreenContext.path })?.path === "/room/financial-operations",
  "equivalent Turkish display wording keeps the same authorized financial route",
);
const variationCanonicalRequest = resolveCanonicalConversationRequest({
  message: "Mali ayrıntıları aç",
  user,
  screenContext: agreementScreenContext,
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert.equal(variationCanonicalRequest.request?.domain, "FINANCE");
assert.equal(variationCanonicalRequest.request?.operation, "VIEW_AUTHORIZED_SURFACE");
assert.equal(variationCanonicalRequest.request?.semanticAction?.objectClass, "FINANCIAL");
const variationPlan = resolveSemanticIntent({
  message: "Mali ayrıntıları aç",
  user,
  screenContext: agreementScreenContext,
  conversationState: {},
  canonicalRequest: variationCanonicalRequest,
});
assert.equal(variationPlan.requestedDomains?.includes("FINANCE"), true);
assert.equal(variationPlan.family, "SCREEN_CONTEXT");
assert.notEqual(variationPlan.family, "RECORD_DETAILS");
const lookupVariation = resolveCanonicalConversationRequest({
  message: "Mali detayları göster",
  user,
  screenContext: agreementScreenContext,
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
const lookupPlan = resolveSemanticIntent({
  message: "Mali detayları göster",
  user,
  screenContext: agreementScreenContext,
  conversationState: {},
  canonicalRequest: lookupVariation,
});
assert.equal(lookupVariation.request?.domain, "FINANCE");
assert.equal(lookupPlan.requestedDomains?.includes("FINANCE"), true);
assert.equal(
  financialSurfaceNavigationAction({ message: "Mali detayları göster", screenPath: agreementScreenContext.path })?.path,
  "/room/financial-operations",
);
assert.equal(
  financialSurfaceNavigationAction({ message: "Finansal detayı anlat", screenPath: agreementScreenContext.path }),
  null,
  "explanation-only financial questions do not fabricate navigation",
);
assert.equal(
  financialSurfaceNavigationAction({ message: detailMessage, screenPath: "/room/financial-operations" }),
  null,
  "financial detail requests already on the canonical surface do not expose a self-navigation action",
);

console.log("PASS m18 WP06 unsupported financial surface has a truthful read-only response");
