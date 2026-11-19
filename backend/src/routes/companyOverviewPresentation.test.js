import test from "node:test";
import assert from "node:assert/strict";
import {
  offerAmountLabel,
  resolveCompanyFinancialContext,
  selectCompanyBudgetPlanForPreview,
} from "./companyOverview.js";
import { selectCompanyBudgetPlanForPreview as selectSharedCompanyBudgetPlanForPreview } from "../services/financialOperationsLifecycle.js";

test("COMPANY teklif özeti minor tutarı doğru TL değerine çevirir", () => {
  assert.equal(offerAmountLabel({ amountCompany: 15000 }), "Firma: 150 ₺");
  assert.equal(offerAmountLabel({ amountCompany: 2500000 }), "Firma: 25.000 ₺");
});

test("COMPANY teklif özetinde geçerli sıfır korunur, bilinmeyen tutar gösterilmez", () => {
  assert.equal(offerAmountLabel({ amountCompany: 0 }), "Firma: 0 ₺");
  assert.equal(offerAmountLabel({ amountCompany: null }), "-");
  assert.equal(offerAmountLabel({ amountCompany: 15000, amountRoom: 2500000 }), "Firma: 150 ₺ / Oda: 25.000 ₺");
});

test("COMPANY preview aynı tenant listesinden seçilen bütçe planını kullanır", () => {
  const overview = {
    current: { id: 4, companyId: 1, budgetAmountMinor: 150_000_00 },
    items: [
      { id: 4, companyId: 1, budgetAmountMinor: 150_000_00 },
      { id: 3, companyId: 1, budgetAmountMinor: 3_000_00 },
    ],
  };

  assert.equal(selectCompanyBudgetPlanForPreview(overview, "3")?.id, 3);
  assert.equal(selectCompanyBudgetPlanForPreview(overview, "3")?.companyId, 1);
});

test("COMPANY preview geçersiz veya yabancı bütçe kimliğinde varsayılan plana döner", () => {
  const overview = {
    current: { id: 4, companyId: 1 },
    items: [
      { id: 4, companyId: 1 },
      { id: 3, companyId: 1 },
    ],
  };

  assert.equal(selectCompanyBudgetPlanForPreview(overview, "999")?.id, 4);
  assert.equal(selectCompanyBudgetPlanForPreview(overview, "203")?.id, 4);
});

test("COMPANY bütçe yaşam döngüsü okuması seçili planı aynı yardımcıyla korur", () => {
  const overview = {
    current: { id: 4, companyId: 1 },
    items: [
      { id: 4, companyId: 1 },
      { id: 3, companyId: 1 },
    ],
  };

  assert.equal(selectSharedCompanyBudgetPlanForPreview(overview, "3")?.id, 3);
  assert.equal(selectSharedCompanyBudgetPlanForPreview(overview, "999")?.id, 4);
});

test("COMPANY finans bağlamı yalnız aynı sözleşmeye bağlı vardiyadan çözülür", () => {
  const result = resolveCompanyFinancialContext({
    companyId: 1,
    candidateShifts: [
      {
        id: 1,
        companyId: 1,
        agreementId: null,
        status: "APPROVED",
        startAt: "2026-10-22T05:00:00.000Z",
      },
      {
        id: 4,
        companyId: 1,
        agreementId: 2,
        status: "APPROVED",
        startAt: "2026-10-22T05:00:00.000Z",
        agreement: {
          id: 2,
          companyId: 1,
          startDate: "2026-10-01",
          endDate: "2026-10-31",
        },
      },
    ],
  });

  assert.equal(result.status, "RESOLVED");
  assert.equal(result.shift.id, 4);
  assert.equal(result.agreement.id, 2);
});

test("COMPANY finans bağlamı sözleşmesiz veya farklı kapsamlı seçimlerde güvenli biçimde çözülmez", () => {
  const candidateShifts = [
    {
      id: 1,
      companyId: 1,
      agreementId: null,
      status: "APPROVED",
      startAt: "2026-10-22T05:00:00.000Z",
    },
    {
      id: 3,
      companyId: 1,
      agreementId: 1,
      status: "DONE",
      startAt: "2026-09-15T05:00:00.000Z",
      agreement: {
        id: 1,
        companyId: 1,
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      },
    },
  ];

  assert.equal(
    resolveCompanyFinancialContext({
      companyId: 1,
      requestedShiftId: 1,
      candidateShifts,
    }).status,
    "NO_CANONICAL_CONTEXT",
  );
  assert.equal(
    resolveCompanyFinancialContext({
      companyId: 1,
      requestedAgreementId: 2,
      requestedShiftId: 3,
      candidateShifts,
    }).status,
    "NO_CANONICAL_CONTEXT",
  );
  assert.equal(
    resolveCompanyFinancialContext({
      companyId: 2,
      candidateShifts,
    }).status,
    "NO_CANONICAL_CONTEXT",
  );
});

test("COMPANY finans bağlamı bir sözleşmenin birden fazla vardiyasını aynı kapsamda tutar", () => {
  const result = resolveCompanyFinancialContext({
    companyId: 1,
    requestedAgreementId: 1,
    candidateShifts: [
      {
        id: 3,
        companyId: 1,
        agreementId: 1,
        status: "DONE",
        startAt: "2026-09-15T05:00:00.000Z",
        agreement: {
          id: 1,
          companyId: 1,
          startDate: "2026-09-01",
          endDate: "2026-09-30",
        },
      },
      {
        id: 11,
        companyId: 1,
        agreementId: 1,
        status: "DONE",
        startAt: "2026-09-16T05:00:00.000Z",
        agreement: {
          id: 1,
          companyId: 1,
          startDate: "2026-09-01",
          endDate: "2026-09-30",
        },
      },
    ],
  });

  assert.equal(result.status, "RESOLVED");
  assert.equal(result.agreement.id, 1);
  assert.equal(result.shift.id, 11);
  assert.equal(result.relatedShiftCount, 2);
});

test("COMPANY finans bağlamı Prisma ilişki seçkisinde agreementId dönmese de ilişkili vardiyaları sayar", () => {
  const result = resolveCompanyFinancialContext({
    companyId: 1,
    candidateShifts: [
      {
        id: 4,
        companyId: 1,
        status: "APPROVED",
        startAt: "2026-10-22T05:00:00.000Z",
        agreement: {
          id: 2,
          companyId: 1,
          startDate: "2026-10-01",
          endDate: "2026-10-31",
        },
      },
    ],
  });

  assert.equal(result.status, "RESOLVED");
  assert.equal(result.relatedShiftCount, 1);
});
