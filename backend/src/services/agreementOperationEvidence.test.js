import test from "node:test";
import assert from "node:assert/strict";
import { buildOperationEvidencePlan } from "./agreementOperationEvidence.js";

const agreement = {
  id: 207,
  status: "REQUESTED",
  companyId: 1,
  roomId: 1,
  startDate: "2026-11-03",
  endDate: "2026-11-09",
};

function assertNoInternalCostFields(value) {
  const serialized = JSON.stringify(value);
  for (const field of [
    "periodPlanningCostMinor",
    "quoteFloorMinor",
    "salary",
    "vehicleCost",
    "margin",
  ]) {
    assert.equal(serialized.includes(field), false, `unexpected internal field: ${field}`);
  }
}

test("COMPANY kabulünden sonra REQUESTED durumunu ROOM son onayı olarak açıklar", () => {
  const plan = buildOperationEvidencePlan({
    agreement,
    companyDecision: {
      decision: "ACCEPT",
      finalStatus: "REQUESTED",
      roomOfferAmountMinor: 1500000,
    },
    actorRole: "ROOM",
  });

  assert.equal(plan.statusKey, "ROOM_APPROVAL_PENDING_NO_OPERATION");
  assert.match(plan.statusLabel, /karşı teklif kabul edildi/i);
  assert.match(plan.statusLabel, /son onay/i);
  assert.match(plan.why, /araç ve sürücü/i);
  assert.equal(plan.primaryAction?.key, "ACCEPT_AGREEMENT");
  assert.equal(plan.primaryAction?.label, "Sözleşmeyi son onayla");
  assert.equal(plan.sourceContext?.isOperationalEvidence, false);
  assertNoInternalCostFields(plan);
});

test("COMPANY reddinden sonra REQUESTED durumunu yeni teklif bekleyişi olarak açıklar", () => {
  const plan = buildOperationEvidencePlan({
    agreement: { ...agreement, roomOfferAmount: null },
    companyDecision: {
      decision: "REJECT",
      finalStatus: "REQUESTED",
      roomOfferAmountMinor: 1500000,
    },
    actorRole: "ROOM",
  });

  assert.equal(plan.statusKey, "COUNTER_REJECTED_NO_OPERATION");
  assert.match(plan.statusLabel, /karşı teklif reddedildi/i);
  assert.match(plan.statusLabel, /yeni teklif/i);
  assert.match(plan.why, /operasyon başlamaz/i);
  assert.equal(plan.primaryAction, null);
  assert.equal(plan.sourceContext?.isOperationalEvidence, false);
  assertNoInternalCostFields(plan);
});

test("karar audit'i yoksa mevcut REQUESTED açıklaması korunur", () => {
  const plan = buildOperationEvidencePlan({
    agreement,
    actorRole: "ROOM",
  });

  assert.equal(plan.statusKey, "REQUESTED_NO_OPERATION");
  assert.match(plan.statusLabel, /kabul kararı bekleniyor/i);
  assertNoInternalCostFields(plan);
});
