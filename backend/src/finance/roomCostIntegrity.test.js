import test from "node:test";
import assert from "node:assert/strict";

import { buildCorrectionIntegrityProjection } from "./roomCostIntegrity.js";

const correctionAudit = (overrides = {}) => ({
  id: 9001,
  createdAt: "2026-10-22T04:37:25.202Z",
  actorUserId: 3,
  entity: "RoomCostEntryCorrection",
  action: "ROOM_COST_CORRECTION_APPLIED",
  entityId: 33,
  ...overrides,
  meta: {
    originalEntryId: 33,
    reversalEntryId: 190,
    replacementEntryId: 191,
    correctionRef: "ROOM_FINANCE_LEGACY_CORRECTION_33_3",
    ...(overrides.meta || {}),
  },
});

test("eksik correction zinciri silinmeden tarihsel integrity incident olarak görünür", () => {
  const result = buildCorrectionIntegrityProjection({
    roomId: 1,
    roomActorIds: [3],
    audits: [correctionAudit()],
    entryRows: [],
    currentEconomicEffect: {
      activeConfirmedActualCount: 6,
      activeConfirmedActualAmountMinor: 2_280_000,
      currencyCode: "TRY",
    },
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.correctionAuditCount, 1);
  assert.equal(result.validCorrectionCount, 0);
  assert.equal(result.incidentCount, 1);
  assert.deepEqual(result.incidents[0].missingEntryIds, [33, 190, 191]);
  assert.equal(result.incidents[0].classification, "ORPHANED_CORRECTION_AUDIT");
  assert.equal(result.incidents[0].repairStatus, "BLOCKED_NO_TRUSTED_PAYLOAD");
  assert.equal(result.incidents[0].immutable, true);
  assert.equal(result.incidents[0].economicEffectStatus, "CURRENT_LEDGER_ONLY");
  assert.equal(result.currentEconomicEffect.activeConfirmedActualAmountMinor, 2_280_000);
});

test("geçerli correction zinciri aktif ekonomik kaydı değiştirmeden PASS kalır", () => {
  const result = buildCorrectionIntegrityProjection({
    roomId: 1,
    roomActorIds: [3],
    audits: [correctionAudit({
      id: 9002,
      entityId: 225,
      meta: {
        originalEntryId: 225,
        reversalEntryId: 250,
        replacementEntryId: 251,
        correctionRef: "ROOM_FINANCE_OWNER_SCOPE_REPAIR_20261023_225",
      },
    })],
    entryRows: [
      { id: 225, roomId: 1, sourceRef: "source:maintenance", isReversal: false, lifecycle: "CONFIRMED" },
      { id: 250, roomId: 1, sourceRef: "source:maintenance", isReversal: true, reversalOfEntryId: 225, lifecycle: "CONFIRMED" },
      { id: 251, roomId: 1, sourceRef: "source:maintenance", isReversal: false, lifecycle: "CONFIRMED" },
    ],
  });

  assert.equal(result.status, "PASS");
  assert.equal(result.validCorrectionCount, 1);
  assert.equal(result.incidentCount, 0);
  assert.deepEqual(result.validCorrections[0].entryIds, [225, 250, 251]);
});

test("başka ROOM aktörünün audit olayı DemoRoom incident kapsamına taşınmaz", () => {
  const result = buildCorrectionIntegrityProjection({
    roomId: 1,
    roomActorIds: [3],
    audits: [correctionAudit({ actorUserId: 99 })],
    entryRows: [],
  });

  assert.equal(result.correctionAuditCount, 0);
  assert.equal(result.incidentCount, 0);
  assert.equal(result.status, "PASS");
});
