import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";
import { buildAuthorizedProductAwarenessAnswer } from "../../services/authorizedProductAwareness.js";

const companyUser = {
  id: 981,
  role: "COMPANY",
  companyId: 1,
  companyKind: "COMPANY",
  sessionVersion: 1,
};

function selectedAccessLinksScreen(path = "/company/access-links", companyKind = "COMPANY") {
  return {
    id: 2104,
    path,
    label: companyKind === "SCHOOL" ? "Öğrenci canlı bağlantıları" : "Personel canlı bağlantıları",
    role: "COMPANY",
    companyKind,
    selectedEntityType: "shift",
    selectedEntityId: 27,
    selectedLabel: "Vardiya #27",
    selectedFields: [],
    selectedBadges: [],
    uiHints: { visibleSuggestions: [] },
  };
}

test("selected access-link status stays in the Passenger Live Link record scope", () => {
  const message = "Seçili vardiyadaki canlı bağlantının durumu nedir?";
  const screenContext = selectedAccessLinksScreen();
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: companyUser,
    screenContext,
    conversationState: {
      lastScreenPath: "/company/access-links",
      selectedEntityId: 27,
      selectedEntityType: "shift",
    },
  });
  const plan = resolveSemanticIntent({
    message,
    user: companyUser,
    screenContext,
    conversationState: {
      lastScreenPath: "/company/access-links",
      selectedEntityId: 27,
      selectedEntityType: "shift",
    },
    canonicalRequest,
  });

  assert.notEqual(plan.workflowIntent, "REPORT_STATUS_GUIDANCE");
  assert.equal(plan.scopeTarget, "SELECTED_RECORD");
  assert.equal(plan.entities?.[0]?.type, "shift");
  assert.equal(plan.entities?.[0]?.id, 27);
  assert.equal(
    plan.requestedFields?.some((field) => String(field?.key || field || "").toUpperCase() === "PASSENGER_LIVE_LINK_STATUS"),
    true,
    "access-link status must remain an explicit selected-link field lookup",
  );
});

test("access-link status without a selected shift never falls back to monthly reports", () => {
  const message = "Seçili vardiyadaki canlı bağlantının durumu nedir?";
  const screenContext = {
    ...selectedAccessLinksScreen(),
    selectedEntityType: "",
    selectedEntityId: null,
    selectedLabel: "",
  };
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/access-links" },
  });
  const plan = resolveSemanticIntent({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/access-links" },
    canonicalRequest,
  });

  assert.notEqual(plan.workflowIntent, "REPORT_STATUS_GUIDANCE");
  assert.equal(plan.planStatus, "AMBIGUOUS");
  assert.equal(plan.clarificationNeed, "CANONICAL_SCOPE_REQUIRES_CLARIFICATION");
});

test("selected access-link status reads the authorized link state without exposing a token or writing", async () => {
  const message = "Seçili vardiyadaki canlı bağlantının durumu nedir?";
  const screenContext = selectedAccessLinksScreen();
  const conversationState = {
    lastScreenPath: "/company/access-links",
    selectedEntityId: 27,
    selectedEntityType: "shift",
  };
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: companyUser,
    screenContext,
    conversationState,
  });
  const plan = resolveSemanticIntent({
    message,
    user: companyUser,
    screenContext,
    conversationState,
    canonicalRequest,
  });
  const result = await buildAuthorizedProductAwarenessAnswer({
    user: companyUser,
    message,
    screenContext,
    conversationState,
    semanticPlan: plan,
  });

  assert.match(result.reply, /canlı takip bağlantısı|canlı bağlantı/iu);
  assert.doesNotMatch(result.reply, /Bu ay COMPANY kapsamındaki/iu);
  assert.doesNotMatch(result.reply, /token=|eyJ|EJkXq|NaoHh/iu);
  assert.equal(result.navigationTarget, undefined);
});

test("a two-turn access-link follow-up keeps the Passenger Live Link semantic scope", async () => {
  const message = "Peki bu bağlantı hâlâ geçerli mi?";
  const screenContext = selectedAccessLinksScreen();
  const conversationState = {
    lastScreenPath: "/company/access-links",
    selectedEntityId: 27,
    selectedEntityType: "shift",
    recentMessages: [
      { role: "user", text: "Seçili vardiyadaki canlı bağlantının durumu nedir?" },
      { role: "assistant", text: "Seçili vardiya için bağlantı durumunu kontrol ettim." },
    ],
    lastSettledResult: {
      semanticPlan: {
        accessLinkStatusIntent: true,
        requestedFields: ["PASSENGER_LIVE_LINK_STATUS"],
      },
    },
  };
  const canonicalRequest = resolveCanonicalConversationRequest({ message, user: companyUser, screenContext, conversationState });
  const plan = resolveSemanticIntent({ message, user: companyUser, screenContext, conversationState, canonicalRequest });
  const result = await buildAuthorizedProductAwarenessAnswer({
    user: companyUser,
    message,
    screenContext,
    conversationState,
    semanticPlan: plan,
  });

  assert.doesNotMatch(result.reply, /Planlama Merkezi|Teklifleri topla/iu);
  assert.match(result.reply, /geçerli canlı takip bağlantısı|bağlantı durumu/iu);
  assert.doesNotMatch(result.reply, /token=|eyJ/iu);
});
