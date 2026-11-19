import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import { buildChatHelpResponse } from "./helpComposer.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";

const user = {
  id: 3,
  role: "ORGANIZATION",
  companyKind: "ORGANIZATION",
  companyId: 3,
};

const screenContext = {
  path: "/organization",
  role: "ORGANIZATION",
  selectedEntityType: "shift",
  selectedEntityId: "55",
  contextSummary: "Seçili kayıt: Taslak vardiya #55 • Durum taslak • 1 durak",
  selectedSummary: "Taslak vardiya #55 • Durum taslak • 1 durak",
  selectedFields: [
    { label: "Vardiya", value: "#55" },
    { label: "Durum", value: "Taslak" },
    { label: "Durak", value: "1" },
  ],
};

test("organization draft stop-count follow-up uses the selected draft context", () => {
  const message = "Peki bu taslakta kaç durak var?";
  const canonicalRequest = resolveCanonicalConversationRequest({ message, user, screenContext });
  const semanticPlan = resolveSemanticIntent({ message, user, screenContext, canonicalRequest });
  assert.deepEqual(canonicalRequest.request.requestedFields, ["STOP_COUNT"]);
  assert.deepEqual(semanticPlan.requestedFields, [{ key: "STOP_COUNT", domain: "OPERATIONS" }]);
  const result = buildChatHelpResponse({
    entityType: "shift",
    entityId: 55,
    user,
    message,
    screenContext,
    semanticPlan,
  });

  assert.match(result.reply, /Taslak vardiya #55/i);
  assert.match(result.reply, /1 durak/i);
  assert.doesNotMatch(result.reply, /hangi kayıt veya konuyu kastettiğini/i);
});
