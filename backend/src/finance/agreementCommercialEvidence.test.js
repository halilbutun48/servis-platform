import test from "node:test";
import assert from "node:assert/strict";
import { resolveAgreementCommercialEvidence } from "./agreementCommercialEvidence.js";

const scope = {
  id: 207,
  roomId: 1,
  companyId: 1,
  status: "APPROVED",
  startDate: "2026-11-03",
  endDate: "2026-11-09",
  companyOfferAmount: 1_500_000,
  roomOfferAmount: null,
  shifts: [],
};

test("kabul audit'i roomOfferAmount boş olan #207 için ticari final fiyatı kanıtlar", () => {
  const result = resolveAgreementCommercialEvidence({
    agreement: scope,
    auditLogs: [
      { action: "ROOM_COSTED_QUOTE_SENT", meta: { offerAmountMinor: 1_500_000 }, createdAt: "2026-10-30T08:00:00.000Z" },
      { action: "COMPANY_AGREEMENT_DECISION", meta: { decision: "ACCEPT", roomOfferAmountMinor: 1_500_000 }, createdAt: "2026-10-30T08:05:00.000Z" },
      { action: "COMPANY_AGREEMENT_DECISION_REPLAYED", meta: { decision: "ACCEPT", roomOfferAmountMinor: 1_500_000 }, createdAt: "2026-10-30T08:06:00.000Z" },
      { action: "AGREEMENT_ROOM_APPROVED", meta: {}, createdAt: "2026-10-30T08:10:00.000Z" },
    ],
  });

  assert.equal(result.commercialReference.status, "READY");
  assert.equal(result.commercialReference.amountMinor, 1_500_000);
  assert.equal(result.commercialReference.source, "COMPANY_ACCEPT_AUDIT");
  assert.equal(result.commercialReference.currencyCode, "TRY");
  assert.equal(result.negotiationEvidence.status, "PARTIAL");
  assert.equal(result.negotiationEvidence.initialCompanyOfferMinor, null);
  assert.equal(result.negotiationEvidence.steps.length, 3);
  assert.equal(result.operationalEvidence.status, "NOT_PROVEN");
  assert.equal(result.operationalEvidence.actualCostEvidence, "NOT_PROVEN");
});

test("DONE olmayan kabul edilmiş anlaşmanın ticari fiyatı operasyon kanıtından bağımsız hazırdır", () => {
  const result = resolveAgreementCommercialEvidence({
    agreement: {
      ...scope,
      id: 206,
      status: "ACTIVE",
      roomOfferAmount: 1_200_000,
      shifts: [{ id: 1, status: "PLANNED" }],
    },
    auditLogs: [],
  });

  assert.equal(result.commercialReference.status, "READY");
  assert.equal(result.commercialReference.amountMinor, 1_200_000);
  assert.equal(result.commercialReference.source, "AGREEMENT_ROOM_OFFER");
  assert.equal(result.negotiationEvidence.status, "PARTIAL");
  assert.equal(result.operationalEvidence.status, "PARTIAL");
});

test("kabul audit'i Agreement snapshot alanından önce canonical final fiyatı taşır", () => {
  const result = resolveAgreementCommercialEvidence({
    agreement: { ...scope, roomOfferAmount: 1_400_000 },
    auditLogs: [{ action: "COMPANY_AGREEMENT_DECISION", meta: { decision: "ACCEPT", roomOfferAmountMinor: 1_500_000 } }],
  });

  assert.equal(result.commercialReference.status, "READY");
  assert.equal(result.commercialReference.amountMinor, 1_500_000);
  assert.equal(result.commercialReference.source, "COMPANY_ACCEPT_AUDIT");
  assert.equal(result.commercialReference.sourceAuditId, null);
  assert.match(result.commercialReference.conflicts.join(" "), /snapshot|Agreement/i);
});

test("companyOfferAmount tek başına kabul edilmiş final fiyat sayılmaz", () => {
  const result = resolveAgreementCommercialEvidence({
    agreement: { ...scope, roomOfferAmount: null, companyOfferAmount: 1_500_000 },
    auditLogs: [],
  });

  assert.equal(result.commercialReference.status, "NOT_PROVEN");
  assert.equal(result.commercialReference.amountMinor, null);
  assert.match(result.commercialReference.missing.join(" "), /kabul edilmiş nihai/i);
});

test("kabul audit'i varsa Agreement alanı sonradan değişse de accepted audit kaynağı korunur", () => {
  const result = resolveAgreementCommercialEvidence({
    agreement: { ...scope, roomOfferAmount: null, companyOfferAmount: 2_000_000 },
    auditLogs: [{ id: 163845, action: "COMPANY_AGREEMENT_DECISION", meta: { decision: "ACCEPT", roomOfferAmountMinor: 1_500_000 } }],
  });

  assert.equal(result.commercialReference.status, "READY");
  assert.equal(result.commercialReference.amountMinor, 1_500_000);
  assert.equal(result.commercialReference.source, "COMPANY_ACCEPT_AUDIT");
  assert.equal(result.commercialReference.sourceAuditId, 163845);
});

test("kaydedilmemiş pazarlık adımları üretilmez ve replay olayları çoğaltılmaz", () => {
  const result = resolveAgreementCommercialEvidence({
    agreement: { ...scope, roomOfferAmount: 1_500_000 },
    auditLogs: [
      { action: "COMPANY_AGREEMENT_DECISION_REPLAYED", meta: { decision: "ACCEPT", roomOfferAmountMinor: 1_500_000 } },
    ],
  });

  assert.equal(result.commercialReference.status, "READY");
  assert.equal(result.negotiationEvidence.status, "PARTIAL");
  assert.equal(result.negotiationEvidence.initialCompanyOfferMinor, null);
  assert.equal(result.negotiationEvidence.steps.length, 0);
  assert.match(result.negotiationEvidence.missing.join(" "), /kabul/i);
});

test("forecast veya taslak gider kaydı gerçekleşmiş operasyon kanıtı oluşturmaz", () => {
  const result = resolveAgreementCommercialEvidence({
    agreement: {
      ...scope,
      status: "DONE",
      shifts: [{ id: 1, status: "DONE" }],
      actualCostEntries: [
        { id: 1, recordKind: "FORECAST", lifecycle: "CONFIRMED", amountMinor: 1000, currencyCode: "TRY" },
      ],
    },
    auditLogs: [],
  });

  assert.equal(result.operationalEvidence.status, "PARTIAL");
  assert.equal(result.operationalEvidence.actualCostEvidence, "NOT_PROVEN");
  assert.equal(result.operationalEvidence.actualCostEntryCount, 0);
});

test("TRY dışı para birimi güvenli biçimde yayınlanmaz", () => {
  const result = resolveAgreementCommercialEvidence({
    agreement: { ...scope, currencyCode: "EUR", roomOfferAmount: 1_500_000 },
    auditLogs: [],
  });

  assert.equal(result.commercialReference.status, "NOT_PROVEN");
  assert.equal(result.commercialReference.amountMinor, null);
  assert.equal(result.commercialReference.currencyCode, null);
});
