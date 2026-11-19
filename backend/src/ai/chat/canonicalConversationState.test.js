import test from "node:test";
import assert from "node:assert/strict";
import { getCanonicalConversationState } from "./canonicalConversationState.js";

test("missing financial scenario values stay null while bounded values survive sanitization", () => {
  const user = { id: 901, role: "ROOM", roomId: 1, sessionVersion: 1 };
  const state = getCanonicalConversationState({
    user,
    authSessionId: "task6-canonical-state",
    screenContext: {
      path: "/room/financial-operations",
      structuredFacts: {
        selectedVehicleId: 1,
        ledgerVehicleId: 1,
        ledgerPeriodStart: "2026-09-01",
        ledgerPeriodEnd: "2026-09-30",
        selectedAgreementId: 202,
        selectedShiftId: 318,
        targetContributionBps: 2000,
        riskReserveBps: 500,
        quoteScenarioAmountMinor: 15000000,
        selectedBudgetPlanId: 3,
        budgetAmountMinor: 300000,
        committedAmountMinor: 1500000,
        remainingBudgetMinor: -1200000,
        selectedAgreementIds: [207],
        budgetStatus: "DRAFT",
        budgetCurrencyCode: "TRY",
      },
    },
  });

  assert.equal(state.screenContext.structuredFacts.manualBaselineOperationalCostMinor, null);
  assert.equal(state.screenContext.structuredFacts.ledgerVehicleId, 1);
  assert.equal(state.screenContext.structuredFacts.ledgerPeriodStart, "2026-09-01");
  assert.equal(state.screenContext.structuredFacts.ledgerPeriodEnd, "2026-09-30");
  assert.equal(state.screenContext.structuredFacts.targetContributionBps, 2000);
  assert.equal(state.screenContext.structuredFacts.riskReserveBps, 500);
  assert.equal(state.screenContext.structuredFacts.quoteScenarioAmountMinor, 15000000);
  assert.equal(state.screenContext.structuredFacts.selectedBudgetPlanId, 3);
  assert.equal(state.screenContext.structuredFacts.selectedInvoiceId, null);
  assert.equal(state.screenContext.structuredFacts.selectedHakedisId, null);
  assert.equal(state.screenContext.structuredFacts.budgetAmountMinor, 300000);
  assert.equal(state.screenContext.structuredFacts.committedAmountMinor, 1500000);
  assert.equal(state.screenContext.structuredFacts.remainingBudgetMinor, -1200000);
  assert.deepEqual(state.screenContext.structuredFacts.selectedAgreementIds, [207]);
  assert.equal(state.screenContext.structuredFacts.budgetStatus, "DRAFT");
  assert.equal(state.screenContext.structuredFacts.budgetCurrencyCode, "TRY");
});

test("preserves bounded selected invoice context across canonical state sanitization", () => {
  const state = getCanonicalConversationState({
    user: { id: 2, role: "COMPANY", companyId: 1 },
    screenContext: {
      path: "/company/financial-operations",
      selectedEntityType: "agreement",
      selectedEntityId: 14,
      structuredFacts: {
        selectedAgreementId: 14,
        selectedInvoiceId: 6,
        selectedHakedisId: 5,
      },
    },
  });

  assert.equal(state.screenContext.structuredFacts.selectedAgreementId, 14);
  assert.equal(state.screenContext.structuredFacts.selectedInvoiceId, 6);
  assert.equal(state.screenContext.structuredFacts.selectedHakedisId, 5);
});

test("selected planning scenario survives canonical sanitization without carrying private fields", () => {
  const user = { id: 902, role: "COMPANY", companyId: 4, companyKind: "COMPANY", sessionVersion: 1 };
  const state = getCanonicalConversationState({
    user,
    authSessionId: "task6-company-scenario-state",
    screenContext: {
      path: "/company/financial-operations",
      structuredFacts: {
        screenType: "COMPANY_FINANCIAL_OPERATIONS",
        selectedScenarioOverrides: {
          passengerCount: 25,
          vehicleCount: 2,
          vehicleType: "MINIBUS",
          comparisonCostMinor: 99999999,
          roomMarginBps: 4200,
        },
        selectedScenarioStatus: "INCOMPLETE",
        selectedScenarioModelVersion: "COST-SCENARIO-FORECAST-AND-SAVINGS-01",
      },
    },
  });

  assert.deepEqual(state.screenContext.structuredFacts.selectedScenarioOverrides, {
    passengerCount: 25,
    vehicleCount: 2,
    vehicleType: "MINIBUS",
  });
  assert.equal(state.screenContext.structuredFacts.selectedScenarioStatus, "INCOMPLETE");
  assert.equal(state.screenContext.structuredFacts.selectedScenarioModelVersion, "COST-SCENARIO-FORECAST-AND-SAVINGS-01");
  assert.equal(state.screenContext.structuredFacts.comparisonCostMinor, undefined);
  assert.equal(state.screenContext.structuredFacts.roomMarginBps, undefined);
});

test("selected public lead key survives canonical sanitization for safe follow-up routing", () => {
  const user = { id: 903, role: "SUPER_ADMIN", sessionVersion: 1 };
  const state = getCanonicalConversationState({
    user,
    authSessionId: "cont208-public-lead-selection",
    screenContext: {
      path: "/superadmin/public-leads",
      structuredFacts: {
        screenType: "PUBLIC_LEAD_REVIEW",
        leadId: "lead-000001",
        privateToken: "must-not-survive",
      },
    },
  });

  assert.equal(state.screenContext.structuredFacts.leadId, "lead-000001");
  assert.equal(state.screenContext.structuredFacts.privateToken, undefined);
});
