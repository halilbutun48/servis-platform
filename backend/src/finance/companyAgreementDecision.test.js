import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPANY_DECISION_CONFIRMATION_TOKEN,
  buildCompanyAgreementDecisionReplayKey,
  buildCompanyAgreementDecisionReplaySnapshot,
  buildCompanyAgreementDecisionAuditMeta,
  buildCompanyAgreementDecisionMutation,
  validateCompanyAgreementDecisionSnapshot,
} from "./companyAgreementDecision.js";

const baseInput = () => ({
  agreement: {
    id: 207,
    companyId: 1,
    roomId: 1,
    status: "COUNTERED",
    roomOfferAmount: 1500000,
    updatedAt: "2026-10-28T13:54:56.721Z",
  },
  actor: { id: 8, role: "COMPANY", companyId: 1 },
  decision: "ACCEPT",
  expectedStatus: "COUNTERED",
  expectedRoomOfferAmountMinor: 1500000,
  expectedUpdatedAt: "2026-10-28T13:54:56.721Z",
  confirmed: true,
  confirmationToken: COMPANY_DECISION_CONFIRMATION_TOKEN,
});

test("valid COMPANY accept validates the sent offer without exposing internal cost fields", () => {
  const result = validateCompanyAgreementDecisionSnapshot(baseInput());

  assert.deepEqual(result, {
    ok: true,
    agreementId: 207,
    decision: "ACCEPT",
    previousStatus: "COUNTERED",
    nextStatus: "REQUESTED",
    roomOfferAmountMinor: 1500000,
    replayKey: buildCompanyAgreementDecisionReplayKey({
      agreementId: 207,
      decision: "ACCEPT",
      roomOfferAmountMinor: 1500000,
      expectedUpdatedAt: "2026-10-28T13:54:56.721Z",
    }),
  });
  assert.equal(Object.prototype.hasOwnProperty.call(result, "periodPlanningCostMinor"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "quoteFloorMinor"), false);
});

test("COMPANY decision rejects wrong role or company tenant", () => {
  assert.equal(
    validateCompanyAgreementDecisionSnapshot({
      ...baseInput(),
      actor: { id: 3, role: "ROOM", roomId: 1 },
    }).code,
    "AGREEMENT_DECISION_FORBIDDEN",
  );
  assert.equal(
    validateCompanyAgreementDecisionSnapshot({
      ...baseInput(),
      actor: { id: 9, role: "COMPANY", companyId: 2 },
    }).code,
    "AGREEMENT_DECISION_FORBIDDEN",
  );
});

test("COMPANY decision requires current COUNTERED state, sent price and explicit confirmation", () => {
  assert.equal(
    validateCompanyAgreementDecisionSnapshot({ ...baseInput(), agreement: { ...baseInput().agreement, status: "REQUESTED" } }).code,
    "AGREEMENT_DECISION_INVALID_STATE",
  );
  assert.equal(
    validateCompanyAgreementDecisionSnapshot({ ...baseInput(), confirmationToken: "" }).code,
    "AGREEMENT_DECISION_CONFIRMATION_REQUIRED",
  );
  assert.equal(
    validateCompanyAgreementDecisionSnapshot({ ...baseInput(), expectedRoomOfferAmountMinor: 1600000 }).code,
    "AGREEMENT_DECISION_STALE_OFFER",
  );
  assert.equal(
    validateCompanyAgreementDecisionSnapshot({ ...baseInput(), expectedUpdatedAt: "2026-10-28T14:00:00.000Z" }).code,
    "AGREEMENT_DECISION_STALE_VERSION",
  );
  assert.equal(
    validateCompanyAgreementDecisionSnapshot({ ...baseInput(), expectedUpdatedAt: null }).code,
    "AGREEMENT_DECISION_VERSION_REQUIRED",
  );
});

test("decision replay key changes for decision or sent price and remains deterministic", () => {
  const accepted = buildCompanyAgreementDecisionReplayKey({
    agreementId: 207,
    decision: "ACCEPT",
    roomOfferAmountMinor: 1500000,
    expectedUpdatedAt: "2026-10-28T13:54:56.721Z",
  });
  assert.equal(
    accepted,
    buildCompanyAgreementDecisionReplayKey({
      agreementId: 207,
      decision: "ACCEPT",
      roomOfferAmountMinor: 1500000,
      expectedUpdatedAt: "2026-10-28T13:54:56.721Z",
    }),
  );
  assert.notEqual(
    accepted,
    buildCompanyAgreementDecisionReplayKey({
      agreementId: 207,
      decision: "REJECT",
      roomOfferAmountMinor: 1500000,
      expectedUpdatedAt: "2026-10-28T13:54:56.721Z",
    }),
  );
  assert.notEqual(
    accepted,
    buildCompanyAgreementDecisionReplayKey({
      agreementId: 207,
      decision: "ACCEPT",
      roomOfferAmountMinor: 1600000,
      expectedUpdatedAt: "2026-10-28T13:54:56.721Z",
    }),
  );
});

test("canonical decision mutation keeps acceptance and rejection on the existing Agreement lifecycle", () => {
  assert.deepEqual(
    buildCompanyAgreementDecisionMutation({
      decision: "ACCEPT",
      roomOfferAmountMinor: 1500000,
      roomOfferNote: "Maliyetli teklif notu",
    }),
    {
      companyOfferAmount: 1500000,
      companyOfferNote: "Maliyetli teklif notu",
      status: "REQUESTED",
    },
  );
  assert.deepEqual(
    buildCompanyAgreementDecisionMutation({ decision: "REJECT" }),
    {
      roomOfferAmount: null,
      roomOfferNote: null,
      status: "REQUESTED",
    },
  );
});

test("decision audit records commercial decision context without financial internals", () => {
  assert.deepEqual(
    buildCompanyAgreementDecisionAuditMeta({
      validation: validateCompanyAgreementDecisionSnapshot(baseInput()),
      actorUserId: 8,
      actorCompanyId: 1,
      finalStatus: "REQUESTED",
      idempotent: false,
    }),
    {
      replayKey: buildCompanyAgreementDecisionReplayKey({
        agreementId: 207,
        decision: "ACCEPT",
        roomOfferAmountMinor: 1500000,
        expectedUpdatedAt: "2026-10-28T13:54:56.721Z",
      }),
      agreementId: 207,
      actorUserId: 8,
      actorCompanyId: 1,
      decision: "ACCEPT",
      previousStatus: "COUNTERED",
      finalStatus: "REQUESTED",
      roomOfferAmountMinor: 1500000,
      idempotent: false,
    },
  );
});

test("replay validation uses the submitted version after the decision already moved status", () => {
  const replaySnapshot = buildCompanyAgreementDecisionReplaySnapshot({
    agreement: {
      ...baseInput().agreement,
      status: "REQUESTED",
      updatedAt: "2026-10-28T15:20:57.449Z",
    },
    expectedUpdatedAt: baseInput().expectedUpdatedAt,
  });

  const result = validateCompanyAgreementDecisionSnapshot({
    ...baseInput(),
    agreement: replaySnapshot,
  });

  assert.equal(result.ok, true);
  assert.equal(result.replayKey, buildCompanyAgreementDecisionReplayKey({
    agreementId: 207,
    decision: "ACCEPT",
    roomOfferAmountMinor: 1500000,
    expectedUpdatedAt: baseInput().expectedUpdatedAt,
  }));
});

test("replay validation can recover a rejected decision after its offer was cleared", () => {
  const replaySnapshot = buildCompanyAgreementDecisionReplaySnapshot({
    agreement: {
      ...baseInput().agreement,
      status: "REQUESTED",
      roomOfferAmount: null,
      updatedAt: "2026-10-28T15:20:57.449Z",
    },
    expectedRoomOfferAmountMinor: baseInput().expectedRoomOfferAmountMinor,
    expectedUpdatedAt: baseInput().expectedUpdatedAt,
  });

  const result = validateCompanyAgreementDecisionSnapshot({
    ...baseInput(),
    decision: "REJECT",
    agreement: replaySnapshot,
  });

  assert.equal(result.ok, true);
  assert.equal(result.decision, "REJECT");
});
