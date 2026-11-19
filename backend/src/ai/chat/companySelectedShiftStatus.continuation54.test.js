import test from "node:test";
import assert from "node:assert/strict";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";
import { executeSemanticQueryPlan } from "../../services/queryPlanExecutor.js";

const companyUser = {
  id: 981,
  role: "COMPANY",
  companyId: 1,
  companyKind: "COMPANY",
  sessionVersion: 1,
};

function selectedShiftScreen(path = "/company/shifts") {
  return {
    id: 44,
    path,
    label: "Vardiyalar",
    role: "COMPANY",
    companyKind: "COMPANY",
    selectedEntityType: "shift",
    selectedEntityId: 27,
    selectedLabel: "Vardiya #27",
    selectedFields: [],
    selectedBadges: [],
    uiHints: { visibleSuggestions: [] },
  };
}

test("selected COMPANY shift status question stays record-scoped instead of monthly report guidance", () => {
  const message = "Bu vardiyanın durumu ne, hangi taşımacılık firmasında?";
  const screenContext = selectedShiftScreen();
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/shifts" },
  });
  const plan = resolveSemanticIntent({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/shifts" },
    canonicalRequest,
  });

  assert.notEqual(plan.workflowIntent, "REPORT_STATUS_GUIDANCE");
  assert.equal(plan.scopeTarget, "SELECTED_RECORD");
  assert.equal(plan.entities?.[0]?.type, "shift");
  assert.equal(plan.entities?.[0]?.id, 27);
  assert.equal(
    plan.requestedFields?.some((field) => String(field?.key || "").toUpperCase() === "ROOM"),
    true,
    "selected shift carrier lookup must remain an explicit requested field",
  );
});

test("selected COMPANY reports shift row stays record-scoped", () => {
  const message = "Bu vardiyanın durumu ne, hangi taşımacılık firmasında?";
  const screenContext = selectedShiftScreen("/company/reports");
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/reports" },
  });
  const plan = resolveSemanticIntent({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/reports" },
    canonicalRequest,
  });

  assert.notEqual(plan.workflowIntent, "REPORT_STATUS_GUIDANCE");
  assert.equal(plan.scopeTarget, "SELECTED_RECORD");
  assert.deepEqual(plan.entities?.[0], { type: "shift", id: 27, source: "SCREEN_RECORD" });
  assert.equal(
    plan.requestedFields?.some((field) => String(field?.key || "").toUpperCase() === "ROOM"),
    true,
  );
});

test("unscoped COMPANY shift status question keeps monthly report guidance", () => {
  const message = "Vardiya durumları nasıl?";
  const screenContext = {
    ...selectedShiftScreen(),
    selectedEntityType: "",
    selectedEntityId: null,
    selectedLabel: "",
  };
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/shifts" },
  });
  const plan = resolveSemanticIntent({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/shifts" },
    canonicalRequest,
  });

  assert.equal(plan.workflowIntent, "REPORT_STATUS_GUIDANCE");
  assert.equal(plan.scopeTarget, "CURRENT_SCREEN");
});

test("selected shift field execution renders the authorized carrier name", async () => {
  const message = "Bu vardiyanın durumu ne, hangi taşımacılık firmasında?";
  const screenContext = selectedShiftScreen();
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/shifts" },
  });
  const plan = resolveSemanticIntent({
    message,
    user: companyUser,
    screenContext,
    conversationState: { lastScreenPath: "/company/shifts" },
    canonicalRequest,
  });
  const execution = await executeSemanticQueryPlan({
    plan,
    allowedDomains: ["SHIFTS"],
    readDomain: async () => ({
      domain: "SHIFTS",
      count: 1,
      records: ["Vardiya #27"],
      facts: [{
        id: 27,
        shiftId: 27,
        status: "APPROVED",
        statusText: "Onaylandı",
        roomId: 1,
        roomName: "DemoRoom",
      }],
    }),
  });

  assert.match(execution.reply, /durum: Onaylandı/);
  assert.match(execution.reply, /taşımacılık firması: DemoRoom/);
});
