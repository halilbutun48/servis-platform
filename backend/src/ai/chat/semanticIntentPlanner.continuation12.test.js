import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";

test("vardiya oluşturma yerini bulamadım sorusu gerçek yönlendirme akışında kalır", () => {
  const plan = resolveSemanticIntent({
    message: "Vardiya oluşturma yerini bulamadım",
    user: { role: "COMPANY", companyId: 10 },
    screenContext: {
      path: "/company/shifts",
      label: "Vardiyalar",
      role: "COMPANY",
      uiHints: {
        visibleButtons: [
          { label: "Vardiyalar", semanticType: "button", disabled: false },
          { label: "Rehberi Başlat", semanticType: "button", targetKey: "company:guided-plan-start", disabled: false },
        ],
        activeTabs: [],
      },
    },
    conversationState: null,
  });

  assert.equal(plan.family, "UI_GUIDANCE");
  assert.equal(plan.workflowIntent, "CREATE_SHIFT");
  assert.equal(plan.typedRequest?.explicitTaskIntent, true);
});

test("aktif yönlendirme bağlamında adım adım anlat devam konuşması olarak kalır", () => {
  const plan = resolveSemanticIntent({
    message: "Adım adım anlat",
    user: { role: "COMPANY", companyId: 10 },
    screenContext: { path: "/company", label: "Planlama Merkezi", role: "COMPANY" },
    conversationState: {
      lastSettledResult: {
        semanticPlan: {
          family: "UI_GUIDANCE",
          intentFamily: "UI_GUIDANCE",
          workflowIntent: "CREATE_SHIFT",
          requestedDomains: ["SHIFTS"],
          entities: [],
        },
      },
      authorizedProductContext: {
        semanticPlan: {
          family: "UI_GUIDANCE",
          intentFamily: "UI_GUIDANCE",
          workflowIntent: "CREATE_SHIFT",
          requestedDomains: ["SHIFTS"],
          entities: [],
        },
      },
      guidedTarget: null,
    },
  });

  assert.equal(plan.family, "CONTINUE_CURRENT_REASONING");
  assert.equal(plan.workflowIntent, "CREATE_SHIFT");
  assert.equal(plan.continuationAction, "EXPAND");
});

test("ROOM canlı takip sorusu görünür canlı takip hedefine bağlanır", () => {
  const plan = resolveSemanticIntent({
    message: "Canlı takibi nereden açarım?",
    user: { role: "ROOM", roomId: 1 },
    screenContext: {
      path: "/room",
      label: "Taşımacılık Firması Merkezi",
      role: "ROOM",
      uiHints: {
        visibleButtons: [
          { label: "Canlı Takip", semanticType: "menu", targetKey: "room:map", identitySource: "CANONICAL" },
        ],
      },
    },
    conversationState: null,
  });

  assert.equal(plan.family, "UI_GUIDANCE");
  assert.equal(plan.workflowIntent, "OPEN_MAP_SURFACE");
});

test("ROOM harita büyütme sorusu canlı map-picker hedefinde kalır", () => {
  const args = {
    message: "Bu haritayı nasıl büyütebilirim? Adım adım göster.",
    user: { role: "ROOM", roomId: 1 },
    screenContext: {
      path: "/room/hub",
      label: "Taşımacılık Firması Konumu",
      role: "ROOM",
      uiHints: {
        visibleButtons: [
          {
            label: "Büyük Haritada İşaretle",
            semanticType: "button",
            targetKey: "room:hub:map-picker-open",
            identitySource: "CANONICAL",
            disabled: false,
          },
          {
            label: "Zoom in",
            semanticType: "button",
            targetKey: "room:hub:map-zoom-in",
            identitySource: "CANONICAL",
            disabled: false,
          },
        ],
      },
    },
    conversationState: null,
  };
  const canonicalRequest = resolveCanonicalConversationRequest(args);
  const plan = resolveSemanticIntent({ ...args, canonicalRequest });

  assert.equal(["SCREEN_CONTEXT", "UI_GUIDANCE"].includes(plan.family), true);
  assert.equal(plan.workflowIntent, "OPEN_MAP_SURFACE");
  assert.equal(plan.canonicalRequest?.semanticAction?.targetCandidate?.targetKey, "room:hub:map-picker-open");
  assert.equal(plan.canonicalRequest?.workflowRef?.workflowIntent, "OPEN_MAP_SURFACE");
});

test("Sefer Abi başlangıç çipi sıradaki doğru kontrol sorusunu next-action akışına bağlar", () => {
  const args = {
    message: "Sıradaki doğru kontrol ne?",
    user: { role: "COMPANY", companyId: 1 },
    screenContext: {
      path: "/company/copilot",
      label: "Sefer Abi",
      role: "COMPANY",
      uiHints: { visibleSuggestions: ["Sıradaki doğru kontrol ne?"] },
    },
    conversationState: null,
  };
  const canonicalRequest = resolveCanonicalConversationRequest(args);
  const plan = resolveSemanticIntent({ ...args, canonicalRequest });

  assert.equal(plan.family, "NEXT_STEP");
  assert.equal(plan.taskVariant, "IMMEDIATE_NEXT_STEP");
  assert.equal(plan.requestedTasks.includes("NEXT_ACTION"), true);
});

test("PARENT canlı konum çipi yetkili konum yardımına bağlanır", () => {
  const plan = resolveSemanticIntent({
    message: "Canlı konum neden yok?",
    user: { role: "PARENT", parentId: 21, tenantId: 7 },
    screenContext: {
      path: "/parent/live",
      label: "Canlı Servis Takibi",
      role: "PARENT",
      uiHints: {
        visibleButtons: [
          { label: "Canlı konum neden yok?", semanticType: "chip", targetKey: "parent:live-location-help" },
        ],
      },
    },
    conversationState: null,
  });

  assert.equal(plan.family, "CONTEXTUAL_PUBLIC_TYPE");
  assert.equal(plan.publicQuestionType, "LOCATION_HELP");
  assert.notEqual(plan.conversationRoute, "GENERAL_KNOWLEDGE");
});

test("PARENT canlı konum çipi kanonik istek zarfında da yardım akışında kalır", () => {
  const args = {
    message: "Canlı konum neden yok?",
    user: { role: "PARENT", parentId: 21, tenantId: 7 },
    screenContext: {
      path: "/parent/live",
      label: "Canlı Servis Takibi",
      role: "PARENT",
      uiHints: {
        visibleButtons: [
          { label: "Canlı konum neden yok?", semanticType: "chip", targetKey: "parent:live-location-help" },
        ],
      },
    },
    conversationState: null,
  };
  const canonicalRequest = resolveCanonicalConversationRequest(args);
  const plan = resolveSemanticIntent({ ...args, canonicalRequest });

  assert.equal(plan.family, "CONTEXTUAL_PUBLIC_TYPE");
  assert.equal(plan.publicQuestionType, "LOCATION_HELP");
  assert.notEqual(plan.conversationRoute, "GENERAL_KNOWLEDGE");
});
