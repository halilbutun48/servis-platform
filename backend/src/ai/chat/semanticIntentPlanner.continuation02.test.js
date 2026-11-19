import assert from "node:assert/strict";
import test from "node:test";

import { resolveSemanticIntent } from "./semanticIntentPlanner.js";

const user = { id: 1, role: "COMPANY", companyKind: "COMPANY", companyId: 1 };
const screenContext = {
  path: "/company/shifts",
  role: "COMPANY",
  uiHints: {
    semanticBlocks: [
      {
        blockKey: "company-shifts:step3:address-block",
        semanticId: "company-shifts:step3:address-block",
        label: "Personel ve durak bilgileri",
        order: 1,
      },
    ],
    workflowState: {
      workflowId: "COMPANY_GUIDED_NEW_PLAN",
      activeStepOrdinal: 3,
      currentTargetKey: "company-shifts:step3:address-next",
      currentTargetLabel: "Adres Temizle ve İlerle",
      source: "LIVE_UI",
    },
  },
};
const conversationState = {
  guidedTarget: {
    status: "FOUND",
    targetKind: "CONTROL",
    targetKey: "company-shifts:step3:address-next",
    blockKey: "company-shifts:step3:address-block",
  },
  activeGuidedTask: {
    semanticPlan: {
      family: "UI_GUIDANCE",
      workflowIntent: "CREATE_SHIFT",
      workflowModel: { goal: "CREATE_SHIFT" },
      workflowStepReference: { ordinal: 3, key: "PERSONNEL_STOPS", label: "Personel + Durak" },
    },
  },
};

test("live guided block keeps step-by-step follow-up on the current block", () => {
  const plan = resolveSemanticIntent({
    message: "burayı adım adım anlat",
    user,
    screenContext,
    conversationState,
  });

  assert.equal(plan.family, "EXPLAIN_CURRENT_TARGET");
  assert.equal(plan.targetKind, "BLOCK");
  assert.equal(plan.blockKey, "company-shifts:step3:address-block");
});
