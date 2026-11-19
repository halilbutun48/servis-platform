import assert from "node:assert/strict";
import test from "node:test";

import { buildCanonicalSemanticContext } from "./canonicalSemanticContext.js";
import { inferCanonicalSemanticRequest } from "./canonicalSemanticRequest.js";
import { getCanonicalConversationState } from "./canonicalConversationState.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";
import { buildSelectedNotificationContextReply } from "../../services/authorizedProductAwareness.js";

const notificationScreen = {
  path: "/shared/notifications",
  label: "Bildirimler",
  role: "SUPER_ADMIN",
  selectedEntityType: "notification",
  selectedEntityId: 41,
  selectedLabel: "Bildirim #41 • Sözleşme iptal edildi",
  structuredFacts: {
    screenType: "SHARED_NOTIFICATIONS",
    notificationId: 41,
    notificationType: "agreement:cancelled",
    title: "Sözleşme iptal edildi",
    summary: "Sözleşme #6 iptal edildi.",
  },
};

test("selected notification is preserved as an authorized semantic record context", () => {
  const message = "Bu seçili bildirim neyle ilgili?";
  const user = { role: "SUPER_ADMIN" };
  const context = buildCanonicalSemanticContext({ message, user, screenContext: notificationScreen, conversationState: {} });
  const inferred = inferCanonicalSemanticRequest({ message, user, screenContext: notificationScreen, conversationState: {} });
  const plan = resolveSemanticIntent({
    message,
    user,
    screenContext: notificationScreen,
    conversationState: {},
    canonicalRequest: { canonicalShape: inferred },
  });

  assert.deepEqual(context.currentEntity, { type: "NOTIFICATION", id: 41 });
  assert.equal(inferred.uiContext.selectedType, "NOTIFICATION");
  assert.equal(inferred.uiContext.selectedId, 41);
  assert.equal(inferred.taskType, "SELECTED_RECORD_CONTEXT");
  assert.equal(inferred.domain, "NOTIFICATIONS");
  assert.equal(inferred.scopeTarget, "SELECTED_RECORD");
  assert.deepEqual(plan.entities, [{ type: "notification", id: 41, source: "SCREEN_RECORD" }]);
  assert.deepEqual(plan.requestedDomains, ["NOTIFICATIONS"]);
});

test("selected notification answer uses the authorized record fact instead of generic clarification", () => {
  const result = buildSelectedNotificationContextReply({
    selectedId: 41,
    notificationRead: {
      facts: [{
        notificationId: 41,
        type: "agreement:cancelled",
        label: "Sözleşme iptal edildi",
        summary: "Sözleşme #6 iptal edildi.",
      }],
      records: ["Bildirim #41 • Sözleşme iptal edildi • Sözleşme #6 iptal edildi."],
      nextAction: "Seçili bildirim #41 bu olayı anlatıyor: Sözleşme #6 iptal edildi.",
    },
  });

  assert.match(result.reply, /Bildirim #41/);
  assert.match(result.reply, /Sözleşme #6 iptal edildi/);
  assert.equal(result.hasAuthorizedRecord, true);
  assert.doesNotMatch(result.reply, /hangi kayıt|netleştir/iu);
});

test("canonical conversation state preserves the selected notification identity", () => {
  const state = getCanonicalConversationState({
    user: { id: 1, role: "SUPER_ADMIN" },
    screenContext: notificationScreen,
    authSessionId: "continuation76-notification-regression",
  });

  assert.deepEqual(state.screenContext.selectedEntity, { type: "notification", id: 41, source: "CONVERSATION_CONTEXT" });
  assert.deepEqual(state.entityContext.selectedEntity, { type: "notification", id: 41, source: "CONVERSATION_CONTEXT" });
  assert.equal(state.selectedEntityType, "notification");
  assert.equal(state.selectedEntityId, 41);
});
