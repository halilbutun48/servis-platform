import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCompanyBudgetAndServiceCostPreview } from "./companyBudgetAndServiceCost.js";
import { getFinancialOperationsAccessForRole } from "./financialOperationsScope.js";
import { buildCompanyHistoricalFinancialEvidence } from "../services/financialOperationsLifecycle.js";

function buildArgs(companyKind) {
  return {
    role: "COMPANY",
    companyKind,
    company: { id: 21, name: `Demo ${companyKind}`, kind: companyKind },
    shift: {
      id: 301,
      roomId: 11,
      companyId: 21,
      status: "ACTIVE",
      direction: "INBOUND",
      pattern: "ROUND_TRIP",
      routeSnapshotDistanceM: 9000,
      routeSnapshotDurationSec: 1800,
      requiredPaxOverride: 18,
      companyOfferAmount: 220000,
      roomOfferAmount: 200000,
      _count: { people: 17, stops: 4 },
      vehicle: { capacity: 20 },
    },
    agreement: {
      id: 401,
      roomId: 11,
      companyId: 21,
      startDate: "2026-07-01",
      endDate: "2026-07-28",
      weekMask: 31,
      startMin: 390,
      endMin: 1080,
      direction: "INBOUND",
      pattern: "ROUND_TRIP",
      companyOfferAmount: 225000,
      roomOfferAmount: 205000,
      status: "ACTIVE",
    },
    budgetInputs: {
      approvedBudgetAmountMinor: 300000,
      budgetApprovalState: "approved",
      budgetSource: "approved_budget",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-28",
      periodType: "contract_period",
      currencyCode: "TRY",
    },
    serviceCostInputs: {
      actualServiceSpendMinor: 180000,
      serviceCostSource: "actual_service_spend",
      currencyCode: "TRY",
      serviceCurrencyCode: "TRY",
      taxBasis: "contract",
      periodType: "contract_period",
      pricePeriod: "contract_period",
    },
    supplierInputs: {
      supplierRef: "safe-supplier-1",
      safeSupplierLabel: "Güvenli tedarikçi",
      supplierPriceMinor: 170000,
      supplierCurrencyCode: "TRY",
      supplierPricePeriod: "contract_period",
      verifiedSupplierState: "verified",
    },
    previewInputs: { todayIso: "2026-07-29" },
  };
}

test("okul ve organizasyon yetkili buyer finans önizlemesini aynı canonical sahibi kullanır", () => {
  for (const companyKind of ["SCHOOL", "ORGANIZATION"]) {
    const preview = buildCompanyBudgetAndServiceCostPreview(buildArgs(companyKind));
    assert.equal(preview.deniedByCompanyKind, false, companyKind);
    assert.equal(preview.scope, "COMPANY", companyKind);
    assert.ok(preview.companyBudget, companyKind);
    assert.ok(preview.companyServiceCost, companyKind);
  }
});

test("COMPANY önizlemesi eski teklif snapshot'ı yerine kabul edilmiş ticari fiyatı kullanır", () => {
  const preview = buildCompanyBudgetAndServiceCostPreview({
    ...buildArgs("COMPANY"),
    agreement: {
      ...buildArgs("COMPANY").agreement,
      companyOfferAmount: 12_000_000,
      roomOfferAmount: 10_000_000,
      commercialAmountMinor: 10_000_000,
      commercialPriceStatus: "READY",
      commercialPriceSource: "AGREEMENT_ROOM_OFFER",
    },
    serviceCostInputs: {},
  });

  assert.equal(preview.snapshot.acceptedCommercialAmountMinor, 10_000_000);
  assert.equal(preview.companyServiceCost.companyVisibleServiceSpendMinor, 10_000_000);
  assert.equal(preview.companyServiceCost.agreementPriceMinor, 10_000_000);
  assert.equal(preview.companyServiceCost.offerPriceMinor, 10_000_000);
  assert.equal(preview.companyServiceCost.commercialPriceSource, "AGREEMENT_ROOM_OFFER");
});

test("okul ve organizasyon finansı seçili hizmet bağlamını ortak önizlemeden taşır", () => {
  const schoolPreview = buildCompanyBudgetAndServiceCostPreview(buildArgs("SCHOOL"));
  assert.equal(schoolPreview.snapshot.buyerServiceContext.serviceLabel, "Öğrenci taşıma hizmeti");
  assert.equal(schoolPreview.snapshot.buyerServiceContext.participantCount, 18);
  assert.equal(schoolPreview.snapshot.buyerServiceContext.stopCount, 4);
  assert.deepEqual(schoolPreview.snapshot.buyerServiceContext.workingDays, ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"]);
  assert.equal(schoolPreview.snapshot.buyerServiceContext.period.start, "2026-07-01");
  assert.equal(schoolPreview.snapshot.buyerServiceContext.period.end, "2026-07-28");

  const organizationPreview = buildCompanyBudgetAndServiceCostPreview({
    ...buildArgs("ORGANIZATION"),
    shift: {
      ...buildArgs("ORGANIZATION").shift,
      organizationPlan: {
        id: 901,
        title: "İstanbul etkinlik planı",
        planDate: "2026-07-15",
        startMin: 480,
        endMin: 1080,
        status: "SHIFT_PUBLISHED",
        stops: [
          { id: 1, passengerCount: 12 },
          { id: 2, passengerCount: 9 },
        ],
      },
    },
  });
  assert.equal(organizationPreview.snapshot.buyerServiceContext.serviceLabel, "Etkinlik taşıma hizmeti");
  assert.equal(organizationPreview.snapshot.buyerServiceContext.participantCount, 21);
  assert.equal(organizationPreview.snapshot.buyerServiceContext.stopCount, 2);
  assert.equal(organizationPreview.snapshot.buyerServiceContext.organizationPlanId, 901);
  assert.equal(organizationPreview.snapshot.buyerServiceContext.schedule.startTime, "08:00");
  assert.equal(organizationPreview.snapshot.buyerServiceContext.schedule.endTime, "18:00");
});

test("buyer rolü kayıtları ortak bütçe yüzeyini tenant sınırı içinde tanır", () => {
  for (const role of ["COMPANY", "SCHOOL", "ORGANIZATION"]) {
    const access = getFinancialOperationsAccessForRole(role);
    assert.ok(access.visibleSurfaceIds.includes("company_budget"), role);
    assert.ok(access.visibleSurfaceIds.includes("supplier_price_quality_compare"), role);
  }
});

test("buyer finans okuması step-up zorunluluğuyla yanlışlıkla kapatılmaz", () => {
  const routeSource = fs.readFileSync(new URL("../routes/companyOverview.js", import.meta.url), "utf8");
  const previewRouteIndex = routeSource.indexOf('"/financial-operations/preview"');
  const readBoundaryIndex = routeSource.indexOf("attachCompanyBudgetLifecycleRoutes", previewRouteIndex);
  const stepUpBoundaryIndex = routeSource.indexOf("r.use(requireStepUpWrite", previewRouteIndex);

  assert.ok(previewRouteIndex >= 0, "financial operations preview route must exist");
  assert.ok(
    stepUpBoundaryIndex > previewRouteIndex && stepUpBoundaryIndex < readBoundaryIndex,
    "step-up must protect lifecycle writes after read-only buyer preview routes",
  );
});

test("COMPANY önizlemesi seçili sözleşmenin tek fatura ödeme özetini taşıyacak bağlantıyı korur", () => {
  const routeSource = fs.readFileSync(new URL("../routes/companyOverview.js", import.meta.url), "utf8");
  const previewRouteIndex = routeSource.indexOf('"/financial-operations/preview"');
  const previewSource = routeSource.slice(previewRouteIndex, routeSource.indexOf("attachCompanyBudgetLifecycleRoutes", previewRouteIndex));
  assert.match(previewSource, /invoiceRecord\.findFirst/);
  assert.match(previewSource, /agreementId: Number\(latestAgreement\.id\)/);
  assert.match(previewSource, /companyId: Number\(company\.id\)/);
  assert.match(previewSource, /buildInvoiceCollectionSummary/);
  assert.match(previewSource, /companyInvoicePayment/);
});

test("SCHOOL ve ORGANIZATION geçmiş eşleşmiş finans kanıtını seçili bütçeden bağımsız, dönemiyle taşır", () => {
  const evidence = {
    status: "MATCHED",
    hakedisCount: 1,
    invoiceCount: 1,
    paymentCount: 1,
    reconciliation: {
      status: "MATCHED",
      period: { start: "2026-09-01", end: "2026-09-30" },
      agreement: { id: 198, status: "DONE", companyId: 2, roomId: 1 },
      hakedisPreview: { exists: true, id: 193, amountMinor: 10000000, currencyCode: "TRY", status: "FINALIZED" },
      invoice: { exists: true, id: 178, amountMinor: 10000000, currencyCode: "TRY", status: "ISSUED" },
      evidence: {
        agreement: { id: 198, periodStart: "2026-09-01", periodEnd: "2026-10-31" },
        operations: { shiftIds: ["276"], eligibleCount: 1, completedCount: 1 },
        hakedis: { id: 193, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
        invoice: { id: 178, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      },
      confidence: "HIGH",
    },
    payment: {
      status: "AVAILABLE",
      amountMinor: 5000000,
      currencyCode: "TRY",
      recordCount: 1,
      collectionDates: ["2026-10-06"],
    },
  };

  const item = buildCompanyHistoricalFinancialEvidence({
    companyId: 2,
    agreement: {
      id: 198,
      companyId: 2,
      status: "DONE",
      companyOfferAmount: 15_000_000,
      commercialAmountMinor: 15_000_000,
      commercialPriceSource: "COMPANY_OFFER_ROOM_APPROVAL",
      commercialPriceStatus: "READY",
      startDate: "2026-09-01",
      endDate: "2026-10-31",
    },
    evidence,
  });

  assert.deepEqual(item, {
    agreementId: 198,
    agreementStatus: "DONE",
    companyContractAmountMinor: 15_000_000,
    companyContractAmountSource: "COMPANY_OFFER_ROOM_APPROVAL",
    companyContractCurrencyCode: "TRY",
    period: { start: "2026-09-01", end: "2026-09-30" },
    serviceEvidence: { eligibleCount: 1, completedCount: 1, shiftIds: ["276"] },
    hakedis: { id: 193, amountMinor: 10000000, currencyCode: "TRY", status: "FINALIZED", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
    invoice: { id: 178, amountMinor: 10000000, currencyCode: "TRY", status: "ISSUED", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
    payment: { status: "AVAILABLE", amountMinor: 5000000, currencyCode: "TRY", recordCount: 1, collectionDates: ["2026-10-06"] },
    confidence: "HIGH",
    source: "CANONICAL_RECONCILIATION",
  });
});

test("geçmiş finans kanıtı tenant veya eşleşme bozuksa alıcıya taşınmaz", () => {
  assert.equal(buildCompanyHistoricalFinancialEvidence({
    companyId: 2,
    agreement: { id: 198, companyId: 3, status: "DONE" },
    evidence: { status: "MATCHED" },
  }), null);
  assert.equal(buildCompanyHistoricalFinancialEvidence({
    companyId: 2,
    agreement: { id: 198, companyId: 2, status: "DONE" },
    evidence: { status: "EVIDENCE_MISSING" },
  }), null);
});
