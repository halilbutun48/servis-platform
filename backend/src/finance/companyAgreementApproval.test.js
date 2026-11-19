import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRoomAgreementApprovalAuditMeta,
  buildRoomAgreementApprovalReplayKey,
} from "./companyAgreementApproval.js";

test("ROOM son onay audit'i ticari ve atama bağlamını taşır, iç maliyet taşımaz", () => {
  const meta = buildRoomAgreementApprovalAuditMeta({
    agreementId: 207,
    roomId: 1,
    companyId: 1,
    vehicleId: 1,
    driverId: 1,
    finalStatus: "APPROVED",
    idempotent: false,
  });

  assert.deepEqual(meta, {
    replayKey: buildRoomAgreementApprovalReplayKey({
      agreementId: 207,
      vehicleId: 1,
      driverId: 1,
      finalStatus: "APPROVED",
    }),
    agreementId: 207,
    roomId: 1,
    companyId: 1,
    vehicleId: 1,
    driverId: 1,
    finalStatus: "APPROVED",
    idempotent: false,
  });
  assert.equal(Object.keys(meta).some((key) => /cost|margin|salary/i.test(key)), false);
});

test("aynı ROOM son onayı aynı replay anahtarını üretir", () => {
  const first = buildRoomAgreementApprovalReplayKey({
    agreementId: 207,
    vehicleId: 1,
    driverId: 1,
    finalStatus: "APPROVED",
  });
  const second = buildRoomAgreementApprovalReplayKey({
    agreementId: 207,
    vehicleId: 1,
    driverId: 1,
    finalStatus: "APPROVED",
  });
  assert.equal(first, second);
});
