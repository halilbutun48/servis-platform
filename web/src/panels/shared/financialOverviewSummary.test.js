import test from "node:test";
import assert from "node:assert/strict";
import { buildFinancialOverviewQuery, buildFinancialOverviewSummary, buildIncomeOverviewSummary, buildProvisionalProfitability, financialOverviewMetricGroups, financialOverviewScopeCopy, initialFinancialOverviewPeriod, selectRoomCollectionInvoiceLinks } from "./financialOverviewSummary.js";
import { invoiceLineageLabel, normalizeRoomCollectionOptions, roomCollectionCustomers, roomCollectionInvoicesForCustomer } from "./roomCollectionSelection.js";

test("ROOM Genel Durum tahsilat bağlantıları yalnız yetkili ve tekil faturaları seçer", () => {
  const links = [
    { agreementId: 10, invoiceId: 41, hakedisId: 31 },
    { agreementId: 10, invoiceId: 41, hakedisId: 31 },
    { agreementId: 11, invoiceId: 42, hakedisId: 32 },
    { agreementId: 12, invoiceId: null, hakedisId: 33 },
  ];

  assert.deepEqual(selectRoomCollectionInvoiceLinks(links, { role: "ROOM" }), [links[0], links[2]]);
  assert.deepEqual(selectRoomCollectionInvoiceLinks(links, { role: "COMPANY" }), []);
  assert.deepEqual(selectRoomCollectionInvoiceLinks([{ agreementId: 10, invoiceId: null }], { role: "ROOM" }), []);
});

test("ROOM tahsilat seçenekleri müşteriye göre ayrılır ve her faturayı tek kez gösterir", () => {
  const options = normalizeRoomCollectionOptions([
    { companyId: 3, customerLabel: "DemoCompany", invoiceId: 4, agreementId: 9, hakedisId: 4 },
    { companyId: 3, customerLabel: "DemoCompany", invoiceId: 4, agreementId: 9, hakedisId: 4 },
    { companyId: 3, customerLabel: "DemoCompany", invoiceId: 7, agreementId: 12, hakedisId: 8 },
    { companyId: 8, customerLabel: "Başka Firma", invoiceId: 11, agreementId: 15, hakedisId: 12 },
  ]);

  assert.deepEqual(roomCollectionCustomers(options), [
    { key: "company:3", label: "DemoCompany" },
    { key: "company:8", label: "Başka Firma" },
  ]);
  assert.deepEqual(roomCollectionInvoicesForCustomer(options, "company:3").map((item) => item.invoiceId), [4, 7]);
  assert.equal(options[0].customerKey, "company:3");
});

test("fatura seçeneği sözleşme/hakediş bilgisini korur ve teklif bağlantısı yoksa uydurmaz", () => {
  const [option] = normalizeRoomCollectionOptions([{
    companyId: 3,
    customerLabel: "DemoCompany",
    invoiceId: 4,
    agreementId: 9,
    hakedisId: 4,
    offerLineageStatus: "NOT_PROVEN",
  }]);
  assert.equal(option.invoiceLabel, "Fatura #4 · Sözleşme #9 · Hakediş #4");
  assert.equal(invoiceLineageLabel(option), "Teklif bağlantısı doğrulanamadı; tahsilat seçilen faturaya kaydedilir.");
});

test("overview inherits the active operational period without changing all-period behavior", () => {
  assert.deepEqual(initialFinancialOverviewPeriod({
    initialPeriodStart: "2026-09-01T00:00:00.000Z",
    initialPeriodEnd: "2026-09-30T23:59:59.999Z",
  }), {
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  });
  assert.deepEqual(initialFinancialOverviewPeriod({}), {
    periodStart: "",
    periodEnd: "",
  });
});

test("all-period overview query is explicit and does not become a missing period", () => {
  assert.deepEqual(buildFinancialOverviewQuery({}), {
    recordKind: "ACTUAL",
    includeSalary: "true",
    periodScope: "ALL",
  });
});

test("overview query is always firm-wide even when stale vehicle context is present", () => {
  assert.deepEqual(buildFinancialOverviewQuery({
    vehicleId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  }), {
    recordKind: "ACTUAL",
    includeSalary: "true",
    periodScope: "RANGE",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  });
});

test("overview scope copy stays firm-wide even when stale vehicle context is present", () => {
  assert.deepEqual(financialOverviewScopeCopy({ vehicleId: 1 }), {
    selectedVehicle: false,
    expenseTitle: "Firma geneli gerçekleşen gider",
    expenseNotePrefix: "Firma geneli · ",
    incomeScopeLabel: "Firma geneli",
    incomeScopeNote: "Firma geneli finans kaydı.",
    differenceTitle: "Geçici gelir–gider farkı",
    differenceNotePrefix: "Mevcut kayıtların farkıdır; kesin net kâr değildir.",
    vehicleProfitabilityTitle: "Araç kârlılığı",
    vehicleProfitabilityNote: "Seçili araca bağlanmış kazanılmış gelir kanıtı bulunmadığı için araç kârlılığı hesaplanamıyor.",
  });
});

test("overview keeps primary results separate from expandable company-wide accounting", () => {
  assert.deepEqual(financialOverviewMetricGroups({ vehicleId: 1 }), {
    primary: ["expense", "realized", "difference"],
    companyWide: ["hakedis", "invoiced", "collected", "receivable"],
  });
});

test("all-period income evidence remains visible without date inputs", () => {
  const summary = buildIncomeOverviewSummary({
    periodScope: "ALL",
    incomeEvidence: {
      status: "AVAILABLE",
      authoritative: true,
      periodScope: "ALL",
      amountMinor: 23000000,
      currencyCode: "TRY",
      collectionEvidence: { status: "AVAILABLE", amountMinor: 11000000, currencyCode: "TRY", recordCount: 2 },
      receivableEvidence: { status: "AVAILABLE", amountMinor: 12000000, currencyCode: "TRY", recordCount: 2 },
      hakedisEvidence: { status: "FINALIZED", amountMinor: 23000000, currencyCode: "TRY", recordCount: 2 },
      invoiceEvidence: { status: "ISSUED", amountMinor: 23000000, currencyCode: "TRY", recordCount: 2 },
      lines: [],
    },
  });

  assert.equal(summary.periodRequired, false);
  assert.equal(summary.status, "AVAILABLE");
  assert.equal(summary.realized.amountMinor, 23000000);
  assert.equal(summary.collected.amountMinor, 11000000);
  assert.equal(summary.receivable.amountMinor, 12000000);
});

test("canonical DEMO income stays visibly simulated and exposes the invoice link", () => {
  const summary = buildIncomeOverviewSummary({
    periodScope: "ALL",
    incomeEvidence: {
      status: "TEST_SIMULATED",
      authoritative: false,
      periodScope: "ALL",
      amountMinor: 1000000,
      currencyCode: "TRY",
      collectionEvidence: { status: "AVAILABLE", amountMinor: 400000, currencyCode: "TRY", recordCount: 1 },
      receivableEvidence: { status: "AVAILABLE", amountMinor: 600000, currencyCode: "TRY", recordCount: 1 },
      lines: [{ amountMinor: 1000000, currencyCode: "TRY", agreementId: 9, hakedisId: 4, invoiceId: 4, source: "TEST_SIMULATED", periodStart: "2026-11-10", periodEnd: "2026-11-16" }],
    },
    agreementRecords: [{ id: 9, company: { name: "DemoCompany" } }],
  });

  assert.equal(summary.status, "TEST_SIMULATED");
  assert.equal(summary.realized.amountMinor, null);
  assert.equal(summary.links[0].sourceLabel, "Kontrollü DEMO simülasyonu · gerçek saha/banka kanıtı değil");
  assert.equal(summary.collected.amountMinor, 400000);
  assert.equal(summary.receivable.amountMinor, 600000);
});

test("income actions carry the real customer, service period, record type and amount", () => {
  const summary = buildIncomeOverviewSummary({
    periodScope: "ALL",
    incomeEvidence: {
      status: "AVAILABLE",
      authoritative: true,
      periodScope: "ALL",
      lines: [{
        amountMinor: 14000000,
        currencyCode: "TRY",
        agreementId: 195,
        hakedisId: 191,
        invoiceId: 176,
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        sourcePeriodStart: "2026-09-01",
        sourcePeriodEnd: "2026-09-30",
        recognizedPeriodStart: "2026-10-01",
        recognizedPeriodEnd: "2026-10-31",
      }],
    },
    agreementRecords: [{
      id: 195,
      company: { name: "DemoCompany" },
      startDate: "2026-09-01T00:00:00.000Z",
      endDate: "2026-09-30T00:00:00.000Z",
    }],
  });

  assert.equal(summary.links.length, 1);
  assert.equal(summary.links[0].customerLabel, "DemoCompany");
  assert.equal(summary.links[0].agreementLabel, "Sözleşme #195");
  assert.equal(summary.links[0].recordTypeLabel, "Hakediş kaydı #191 · Fatura kaydı #176");
  assert.equal(summary.links[0].amountMinor, 14000000);
  assert.equal(summary.links[0].periodStart, "2026-10-01");
  assert.equal(summary.links[0].periodEnd, "2026-10-31");
  assert.equal(summary.links[0].sourcePeriodStart, "2026-09-01");
  assert.equal(summary.links[0].sourcePeriodEnd, "2026-09-30");
});

test("income link prefers the canonical customer name carried by the income source", () => {
  const summary = buildIncomeOverviewSummary({
    periodScope: "ALL",
    agreementRecords: [],
    incomeEvidence: {
      status: "TEST_SIMULATED",
      authoritative: false,
      periodScope: "ALL",
      lines: [{ agreementId: 9, hakedisId: 4, invoiceId: 4, amountMinor: 1000000, currencyCode: "TRY", source: "TEST_SIMULATED", companyName: "DemoCompany" }],
    },
  });

  assert.equal(summary.links[0].customerLabel, "DemoCompany");
});

test("unknown VAT is an informational note, not a mandatory overview task", () => {
  const overview = buildFinancialOverviewSummary({
    summary: {
      buckets: { ACTUAL: { grossAmountMinor: 100000, entryCount: 1, currencyCode: "TRY", netRollupBlocked: true } },
      known: [{ recordKind: "ACTUAL", categoryKey: "FUEL", amountMinor: 100000 }],
      readOnly: true,
    },
    entries: [{
      id: 338,
      recordKind: "ACTUAL",
      lifecycle: "CONFIRMED",
      categoryKey: "FUEL",
      amountMinor: 100000,
      vatClassification: "UNKNOWN",
      occurredAt: "2026-09-15",
      evidenceRef: "receipt-338",
    }],
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    now: new Date("2026-10-28T00:00:00.000Z"),
  });

  assert.equal(overview.warnings.some((item) => item.key === "vat-unknown"), false);
  assert.equal(overview.informationNotes.some((item) => item.key === "vat-unknown"), true);
  assert.equal(overview.informationNotes.find((item) => item.key === "vat-unknown").actionLabel, undefined);
});

test("future rows reclassified as planning remain visibly separate from realized expenses", () => {
  const overview = buildFinancialOverviewSummary({
    summary: {
      buckets: { ACTUAL: { grossAmountMinor: null, entryCount: 0, currencyCode: null } },
      known: [],
      readOnly: true,
    },
    entries: [{
      id: 365,
      recordKind: "FORECAST",
      originalRecordKind: "ACTUAL",
      lifecycle: "CONFIRMED",
      categoryKey: "FUEL",
      amountMinor: 120000,
      periodStart: "2026-11-03",
      periodEnd: "2026-11-09",
    }],
    now: new Date("2026-10-31T00:00:00.000Z"),
  });

  assert.equal(overview.futureActualCount, 1);
  assert.equal(overview.warnings.find((item) => item.key === "future-actual")?.title, "1 planlanan gider ileri tarihli");
});

test("vehicle-scoped overview does not turn firm-wide income into vehicle profitability", () => {
  const result = buildProvisionalProfitability({
    expenseMinor: 4090000,
    expenseCurrency: "TRY",
    period: { start: "2026-09-01", end: "2026-09-30" },
    scope: { roomId: 1, scopeKey: "ROOM:1", vehicleId: 1 },
    incomeEvidence: {
      status: "AVAILABLE",
      authoritative: true,
      amountMinor: 36000000,
      currencyCode: "TRY",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      roomId: 1,
      scopeKey: "ROOM:1",
      lines: [
        { agreementId: 4, amountMinor: 10000000 },
        { agreementId: 5, amountMinor: 12000000 },
        { agreementId: 1, amountMinor: 14000000 },
      ],
    },
  });

  assert.equal(result.status, "VEHICLE_INCOME_NOT_PROVEN");
  assert.equal(result.differenceMinor, null);
  assert.match(result.excludedReasons[0], /seçili araca bağlanmış/i);
});

test("overview primary metrics never switch to vehicle profitability", () => {
  assert.deepEqual(financialOverviewMetricGroups({ vehicleId: 1 }).primary, ["expense", "realized", "difference"]);
  assert.deepEqual(financialOverviewMetricGroups().primary, ["expense", "realized", "difference"]);
});

test("firm-wide profitability stays unavailable without explicit full-scope evidence", () => {
  const result = buildProvisionalProfitability({
    expenseMinor: 4_090_000,
    expenseCurrency: "TRY",
    period: { start: "2026-09-01", end: "2026-09-30" },
    scope: { roomId: 1, scopeKey: "ROOM:1" },
    incomeEvidence: {
      status: "AVAILABLE",
      authoritative: true,
      amountMinor: 36_000_000,
      currencyCode: "TRY",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      roomId: 1,
      scopeKey: "ROOM:1",
      lines: [],
    },
  });

  assert.equal(result.status, "FIRM_EXPENSE_SCOPE_NOT_PROVEN");
  assert.equal(result.differenceMinor, null);
  assert.match(result.excludedReasons[0], /firma geneli gider kapsamı/i);
});
