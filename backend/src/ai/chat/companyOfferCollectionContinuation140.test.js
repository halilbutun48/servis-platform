import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";
import { isCompanyOfferCollectionReadPlan } from "../../services/authorizedProductAwareness.js";

const companyUser = {
  id: 2,
  role: "COMPANY",
  companyId: 1,
  companyKind: "COMPANY",
  sessionVersion: 1,
};

const operationsScreen = {
  id: 2117,
  path: "/company/operations",
  label: "Operasyon Paneli",
  role: "COMPANY",
  companyKind: "COMPANY",
  selectedEntityType: "",
  selectedEntityId: null,
  selectedLabel: "",
  selectedFields: [],
  selectedBadges: [],
  uiHints: { visibleSuggestions: [] },
};

test("COMPANY offer follow-up selects the authorized offer collection instead of planning-home guidance", () => {
  const message = "Peki tekliflerden hangileri bekliyor?";
  const conversationState = {
    lastScreenPath: "/company/operations",
    lastScreenLabel: "Operasyon Paneli",
    recentMessages: [
      { role: "user", text: "Bugün hangi sözleşme inceleme bekliyor?" },
      { role: "assistant", text: "İnceleme bekleyen 1 yetkili sözleşme kaydı var." },
    ],
  };
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: companyUser,
    screenContext: operationsScreen,
    conversationState,
  });
  const semanticPlan = resolveSemanticIntent({
    message,
    user: companyUser,
    screenContext: operationsScreen,
    conversationState,
    canonicalRequest,
  });

  assert.equal(semanticPlan.workflowIntent, "OPEN_OFFER_SURFACE");
  assert.deepEqual(semanticPlan.requestedDomains, ["OFFERS"]);
  assert.equal(isCompanyOfferCollectionReadPlan({ role: companyUser.role, semanticPlan }), true);
  assert.equal(isCompanyOfferCollectionReadPlan({
    role: companyUser.role,
    semanticPlan: { ...semanticPlan, entity: { type: "offer", id: 20 } },
  }), false);
});
