import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";
import { executeSemanticQueryPlan } from "../../services/queryPlanExecutor.js";

const roomUser = {
  id: 991,
  role: "ROOM",
  roomId: 1,
  companyKind: "ROOM",
  sessionVersion: 1,
};

function selectedOfferScreen() {
  return {
    id: 1102,
    path: "/room/offers",
    label: "Teklifler",
    role: "ROOM",
    selectedEntityType: "offer",
    selectedEntityId: 21,
    selectedLabel: "Teklif #21",
    selectedFields: [{ key: "STATUS", label: "Teklif Durumu", value: "OPEN" }],
    selectedBadges: [{ label: "Vardiya ACTIVE" }],
    selectedRelatedEntityType: "shift",
    selectedRelatedEntityId: 29,
    uiHints: { visibleSuggestions: [] },
  };
}

test("selected ROOM offer approval question remains a status lookup", async () => {
  const message = "Peki bu teklif kabul edildi mi?";
  const screenContext = selectedOfferScreen();
  const conversationState = {
    lastScreenPath: "/room/offers",
    selectedEntityType: "offer",
    selectedEntityId: 21,
  };
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: roomUser,
    screenContext,
    conversationState,
  });
  const plan = resolveSemanticIntent({
    message,
    user: roomUser,
    screenContext,
    conversationState,
    canonicalRequest,
  });

  assert.equal(plan.scopeTarget, "SELECTED_RECORD");
  assert.equal(plan.entities?.[0]?.type, "offer");
  assert.equal(plan.entities?.[0]?.id, 21);
  assert.equal(plan.requestedFields?.some((field) => field.key === "STATUS" && field.domain === "OFFERS"), true);

  const execution = await executeSemanticQueryPlan({
    plan,
    allowedDomains: ["OFFERS"],
    readDomain: async () => ({
      domain: "OFFERS",
      count: 1,
      records: ["Teklif #21"],
      facts: [{
        id: 21,
        offerId: 21,
        shiftId: 29,
        status: "OPEN",
        statusText: "Açık",
      }],
    }),
  });

  assert.match(execution.reply, /Teklif #21/);
  assert.match(execution.reply, /durum: Açık/);
});
