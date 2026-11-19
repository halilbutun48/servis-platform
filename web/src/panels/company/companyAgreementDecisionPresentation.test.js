import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPANY_DECISION_CONFIRMATION_TOKEN,
  buildCompanyDecisionPayload,
  buildCompanyDecisionSummary,
} from "./companyAgreementDecisionPresentation.js";

const agreement = {
  id: 207,
  status: "COUNTERED",
  startDate: "2026-11-03T00:00:00.000Z",
  endDate: "2026-11-09T00:00:00.000Z",
  roomOfferAmount: 1500000,
  updatedAt: "2026-10-28T13:54:56.721Z",
  roomOfferNote: "Maliyetli teklif notu",
};

test("company decision payload carries explicit confirmation and current offer version", () => {
  assert.deepEqual(
    buildCompanyDecisionPayload({
      agreement,
      decision: "ACCEPT",
      confirmed: true,
      confirmationToken: COMPANY_DECISION_CONFIRMATION_TOKEN,
    }),
    {
      confirmed: true,
      confirmationToken: "ONAYLA",
      expectedRoomOfferAmountMinor: 1500000,
      expectedUpdatedAt: "2026-10-28T13:54:56.721Z",
    },
  );
});

test("company decision summary contains only commercial context", () => {
  const summary = buildCompanyDecisionSummary({ agreement, roomName: "Taşımacılık Firması" });
  assert.deepEqual(summary, {
    agreementLabel: "Sözleşme #207",
    roomName: "Taşımacılık Firması",
    periodText: "03.11.2026 → 09.11.2026",
    offerText: "15.000,00 TL",
    statusText: "Karşı teklif",
  });
  assert.equal(Object.prototype.hasOwnProperty.call(summary, "roomOfferNote"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(summary, "periodPlanningCostMinor"), false);
});
