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
  path: "/organization/checkin",
  role: "ORGANIZATION",
  selectedEntityType: "shift",
  selectedEntityId: "34",
  contextSummary: "Seçili kayıt: Vardiya #34 • Aktif • Biniş 0 • İniş 0",
  selectedSummary: "Vardiya #34 • Aktif • Biniş 0 • İniş 0",
};

test("selected organization check-in shift explains active QR/NFC credentials", () => {
  const message = "Bu seçili vardiyada hangi erişim kodları aktif?";
  const canonicalRequest = resolveCanonicalConversationRequest({ message, user, screenContext });
  const semanticPlan = resolveSemanticIntent({ message, user, screenContext, canonicalRequest });

  assert.ok(semanticPlan.requestedFields.some((field) => field.key === "ACCESS_CREDENTIALS"));

  const result = buildChatHelpResponse({
    entityType: "shift",
    entityId: 34,
    user,
    message,
    screenContext,
    semanticPlan,
    context: {
      id: 34,
      type: "shift",
      accessCredentials: { activeCount: 2, types: ["QR", "NFC"], personelCount: 1 },
    },
  });

  assert.match(result.reply, /Vardiya #34/i);
  assert.match(result.reply, /2 aktif erişim kodu/i);
  assert.match(result.reply, /QR.*NFC|NFC.*QR/i);
  assert.match(result.reply, /kodların kendisini.*göstermiyorum/i);
});
