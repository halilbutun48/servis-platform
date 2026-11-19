import test from "node:test";
import assert from "node:assert/strict";
import {
  clearCanonicalConversationState,
  commitCanonicalConversationState,
  getCanonicalConversationState,
} from "./canonicalConversationState.js";
import { inferCanonicalSemanticRequest } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";

const companyUser = {
  id: 981,
  role: "COMPANY",
  companyId: 1,
  companyKind: "COMPANY",
  sessionVersion: 1,
};
const authSessionId = "company-selected-record-recovery";

function agreementScreen(id) {
  return {
    id: 88,
    path: "/company/agreements",
    label: "Sözleşmeler",
    role: "COMPANY",
    selectedEntityType: id ? "agreement" : "",
    selectedEntityId: id || null,
    selectedEntity: id ? { type: "agreement", id } : null,
    selectedLabel: id ? `Sözleşme #${id}` : "",
    structuredFacts: id ? { selectedAgreementId: id } : {},
  };
}

test("COMPANY follow-up binds to the newly selected agreement instead of the stale one", () => {
  clearCanonicalConversationState(companyUser, authSessionId);

  const firstScreen = agreementScreen(207);
  const firstState = getCanonicalConversationState({
    user: companyUser,
    screenContext: firstScreen,
    authSessionId,
  });
  commitCanonicalConversationState({
    user: companyUser,
    screenContext: firstState.screenContext,
    message: "Bu sözleşmenin durumu nedir?",
    payload: {
      semanticPlan: {
        family: "FIELD_LOOKUP",
        entity: { type: "agreement", id: 207, source: "EXPLICIT_QUERY" },
        entities: [{ type: "agreement", id: 207, source: "EXPLICIT_QUERY" }],
        dialogueTopic: "PRODUCT",
      },
      reply: "Sözleşme #207 için durum: Onaylandı.",
    },
    authSessionId,
  });

  const secondScreen = agreementScreen(195);
  const secondState = getCanonicalConversationState({
    user: companyUser,
    screenContext: secondScreen,
    authSessionId,
  });
  const result = inferCanonicalSemanticRequest({
    message: "Peki bunun tarihi nedir?",
    user: companyUser,
    screenContext: secondState.screenContext,
    conversationState: secondState,
  });

  assert.equal(result.discourseReferentFieldFollowUp, true);
  assert.equal(result.targetEntityType, "AGREEMENT");
  assert.equal(result.uiContext.selectedId, 195);
  assert.equal(secondState.uniqueDiscourseReferent.id, 207);
});

test("COMPANY empty selection does not resurrect the previous agreement", () => {
  clearCanonicalConversationState(companyUser, authSessionId);

  const firstScreen = agreementScreen(207);
  const firstState = getCanonicalConversationState({
    user: companyUser,
    screenContext: firstScreen,
    authSessionId,
  });
  commitCanonicalConversationState({
    user: companyUser,
    screenContext: firstState.screenContext,
    message: "Bu sözleşmenin durumu nedir?",
    payload: {
      semanticPlan: {
        family: "FIELD_LOOKUP",
        entity: { type: "agreement", id: 207, source: "EXPLICIT_QUERY" },
        entities: [{ type: "agreement", id: 207, source: "EXPLICIT_QUERY" }],
        dialogueTopic: "PRODUCT",
      },
      reply: "Sözleşme #207 için durum: Onaylandı.",
    },
    authSessionId,
  });

  const emptyState = getCanonicalConversationState({
    user: companyUser,
    screenContext: agreementScreen(null),
    authSessionId,
  });
  const result = inferCanonicalSemanticRequest({
    message: "Peki bunun tarihi nedir?",
    user: companyUser,
    screenContext: emptyState.screenContext,
    conversationState: emptyState,
  });

  assert.notEqual(result.discourseReferentFieldFollowUp, true);
  assert.equal(result.uiContext.selectedId, null);
  assert.equal(result.uiContext.selectionHistoricalSuppressed, true);
});

test("COMPANY planner keeps a polite deictic follow-up on the live selection", () => {
  clearCanonicalConversationState(companyUser, authSessionId);

  const firstScreen = agreementScreen(207);
  const firstState = getCanonicalConversationState({
    user: companyUser,
    screenContext: firstScreen,
    authSessionId,
  });
  commitCanonicalConversationState({
    user: companyUser,
    screenContext: firstState.screenContext,
    message: "Bu sözleşmenin durumu nedir?",
    payload: {
      semanticPlan: {
        family: "FIELD_LOOKUP",
        entity: { type: "agreement", id: 207, source: "EXPLICIT_QUERY" },
        entities: [{ type: "agreement", id: 207, source: "EXPLICIT_QUERY" }],
        dialogueTopic: "PRODUCT",
      },
      reply: "Sözleşme #207 için durum: Onaylandı.",
    },
    authSessionId,
  });

  const secondScreen = agreementScreen(195);
  const secondState = getCanonicalConversationState({
    user: companyUser,
    screenContext: secondScreen,
    authSessionId,
  });
  const canonicalRequest = inferCanonicalSemanticRequest({
    message: "Peki bunun tarihi nedir?",
    user: companyUser,
    screenContext: secondState.screenContext,
    conversationState: secondState,
  });
  const plan = resolveSemanticIntent({
    message: "Peki bunun tarihi nedir?",
    user: companyUser,
    screenContext: secondState.screenContext,
    conversationState: secondState,
    canonicalRequest: { canonicalShape: canonicalRequest },
  });

  assert.deepEqual(plan.entities, [{ type: "agreement", id: 195, source: "SCREEN_RECORD" }]);
});

test("COMPANY cross-tenant agreement request is denied before selected-record fallback", () => {
  const message = "Başka tenanta ait sözleşme #207'nin durumunu göster";
  const screenContext = agreementScreen(195);
  const conversationState = { uniqueDiscourseReferent: { type: "agreement", id: 195 } };
  const canonicalRequest = inferCanonicalSemanticRequest({
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
    canonicalRequest: { canonicalShape: canonicalRequest },
  });

  assert.equal(plan.planStatus, "UNAUTHORIZED");
  assert.equal(plan.crossTenantRequested, true);
  assert.deepEqual(plan.deniedDomains, ["AGREEMENTS"]);
  assert.notDeepEqual(plan.entities, [{ type: "agreement", id: 195, source: "SCREEN_RECORD" }]);
});
