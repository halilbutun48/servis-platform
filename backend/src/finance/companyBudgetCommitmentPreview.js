import { normalizeCurrencyCode, roundMinor, safeNumber } from "./operationalCostMath.js";

const CONFIRMED_AGREEMENT_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE"]);

function minorOrNull(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = safeNumber(value);
    if (!Number.isFinite(n)) continue;
    return roundMinor(n);
  }
  return null;
}

function wholeOrNull(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = safeNumber(value);
    if (!Number.isFinite(n)) continue;
    const rounded = Math.round(n);
    if (rounded >= 0) return rounded;
  }
  return null;
}

function dateIsoOrNull(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizePositiveId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeIdList(values) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = normalizePositiveId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function nullableMinor(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = safeNumber(value);
  return Number.isSafeInteger(n) ? n : null;
}

function countOrZero(value) {
  const n = safeNumber(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

function uniqueEvidenceLabels(items) {
  return [...new Set((Array.isArray(items) ? items : [])
    .map((item) => String(item?.label || item || "").trim())
    .filter(Boolean))];
}

function summarizeEvidenceItem(item, preview) {
  const evidenceWrapper = preview || {};
  const canonicalPreview = evidenceWrapper.reconciliation || evidenceWrapper;
  const paymentSummary = evidenceWrapper.payment || canonicalPreview?.payment || null;
  const operations = canonicalPreview?.evidence?.operations || {};
  const eligibleCount = countOrZero(operations.eligibleCount);
  const completedCount = countOrZero(operations.completedCount);
  const partialCount = countOrZero(operations.partialCount);
  const hakedisExists = canonicalPreview?.hakedisPreview?.exists === true;
  const invoiceExists = canonicalPreview?.invoice?.exists === true;
  const hakedisAmountMinor = hakedisExists
    ? nullableMinor(canonicalPreview?.expectedAmount?.amountMinor ?? canonicalPreview?.hakedisPreview?.amountMinor)
    : null;
  const invoiceAmountMinor = invoiceExists ? nullableMinor(canonicalPreview?.invoice?.amountMinor) : null;
  const paymentAvailable = String(paymentSummary?.status || "").toUpperCase() === "AVAILABLE"
    && nullableMinor(paymentSummary?.amountMinor) !== null;
  const paymentAmountMinor = paymentAvailable ? nullableMinor(paymentSummary.amountMinor) : null;
  const collectionDates = [...new Set((Array.isArray(paymentSummary?.collectionDates) ? paymentSummary.collectionDates : [])
    .map(dateIsoOrNull)
    .filter(Boolean))].sort();
  const missingData = uniqueEvidenceLabels(canonicalPreview?.missingData);
  const commercialPriceStatus = String(item?.commercialPriceStatus || "NOT_PROVEN").toUpperCase();
  const commercialAmountMinor = nullableMinor(item?.commercialAmountMinor);
  const companyContractAmountMinor = commercialPriceStatus === "READY" ? commercialAmountMinor : null;
  const companyContractAmountSource = companyContractAmountMinor === null
    ? null
    : String(item?.commercialPriceSource || "CANONICAL_ACCEPTED_PRICE");
  const companyContractCurrencyCode = String(item?.currencyCode || "TRY").toUpperCase();

  if (companyContractAmountMinor === null) missingData.push("Kabul edilmiş ticari fiyat kanıtı eksik.");

  if (eligibleCount > completedCount) missingData.push("Gerçekleşen hizmet kanıtı eksik.");
  if (!hakedisExists) missingData.push("Hakediş kaydı yok.");
  if (!invoiceExists) missingData.push("Fatura kaydı yok.");
  if (!paymentAvailable) missingData.push("Doğrulanmış ödeme/tahsilat kaydı yok.");

  return {
    agreementId: Number(item.agreementId),
    // Bu tutar COMPANY'nin kabul ettiği sözleşme bedelidir. ROOM hakedişi ve
    // ROOM tedarikçi faturası ayrı taraf kanıtlarıdır; COMPANY gideri olarak
    // doğrudan bunlardan biri kullanılmaz.
    companyContractAmountMinor,
    companyContractAmountSource,
    companyContractCurrencyCode,
    period: canonicalPreview?.period || null,
    status: String(evidenceWrapper.status || canonicalPreview?.status || "EVIDENCE_MISSING").toUpperCase(),
    statusLabel: String(canonicalPreview?.statusLabel || "Finansal kanıt eksik"),
    serviceEvidence: {
      eligibleCount,
      completedCount,
      partialCount,
      complete: eligibleCount > 0 && eligibleCount === completedCount,
    },
    hakedis: {
      exists: hakedisExists,
      amountMinor: hakedisAmountMinor,
      currencyCode: String(canonicalPreview?.expectedAmount?.currencyCode || canonicalPreview?.hakedisPreview?.currencyCode || "TRY").toUpperCase(),
      status: canonicalPreview?.hakedisPreview?.status || null,
      reference: canonicalPreview?.hakedisPreview?.reference || null,
    },
    invoice: {
      exists: invoiceExists,
      amountMinor: invoiceAmountMinor,
      currencyCode: String(canonicalPreview?.invoice?.currencyCode || "TRY").toUpperCase(),
      status: canonicalPreview?.invoice?.status || null,
      reference: canonicalPreview?.invoice?.reference || null,
      matchStatus: ["MATCHED", "UNDER_INVOICED", "OVER_INVOICED"].includes(String(canonicalPreview?.status || evidenceWrapper.status || "").toUpperCase())
        ? String(canonicalPreview?.status || evidenceWrapper.status).toUpperCase()
        : null,
    },
    payment: {
      status: paymentAvailable ? "AVAILABLE" : String(preview?.payment?.status || "UNAVAILABLE").toUpperCase(),
      amountMinor: paymentAmountMinor,
      currencyCode: String(paymentSummary?.currencyCode || canonicalPreview?.invoice?.currencyCode || "TRY").toUpperCase(),
      recordCount: countOrZero(paymentSummary?.recordCount),
      collectionDates,
      reason: paymentSummary?.reason || null,
    },
    missingData: [...new Set(missingData)],
    missingDataText: [...new Set(missingData)].join(" "),
  };
}

export function buildCompanyBudgetFinancialEvidenceSummary({ included = [], reconciliationByAgreementId = {} } = {}) {
  const seen = new Set();
  const items = [];
  for (const item of Array.isArray(included) ? included : []) {
    const agreementId = normalizePositiveId(item?.agreementId);
    if (!agreementId || seen.has(agreementId)) continue;
    seen.add(agreementId);
    const preview = reconciliationByAgreementId?.[String(agreementId)] || reconciliationByAgreementId?.[agreementId] || null;
    items.push(summarizeEvidenceItem(item, preview));
  }

  const allHaveHakedis = items.length > 0 && items.every((item) => item.hakedis.amountMinor !== null);
  const allHaveInvoice = items.length > 0 && items.every((item) => item.invoice.amountMinor !== null);
  const allHavePayment = items.length > 0 && items.every((item) => item.payment.amountMinor !== null);
  const statusValues = items.map((item) => item.status);
  const hasMismatch = statusValues.some((status) => [
    "UNDER_INVOICED",
    "OVER_INVOICED",
    "PERIOD_MISMATCH",
    "CURRENCY_MISMATCH",
    "DUPLICATE_HAKEDIS",
    "DUPLICATE_INVOICE",
    "REVIEW_REQUIRED",
  ].includes(status));
  const hasMissingEvidence = items.some((item) => item.hakedis.amountMinor === null || item.invoice.amountMinor === null);
  const hasPaymentGap = items.some((item) => item.payment.amountMinor === null);
  const realizedEvidenceItems = items.filter((item) => {
    const hakedisStatus = String(item.hakedis.status || "").toUpperCase();
    const invoiceStatus = String(item.invoice.status || "").toUpperCase();
    const activeHakedis = ["READY", "FINALIZED"].includes(hakedisStatus);
    const activeInvoice = ["ISSUED", "PAID"].includes(invoiceStatus);
    return item.serviceEvidence.complete
      && item.hakedis.amountMinor !== null
      && item.invoice.amountMinor !== null
      && item.invoice.matchStatus === "MATCHED"
      && item.hakedis.currencyCode === item.invoice.currencyCode
      && item.companyContractAmountMinor !== null
      && activeHakedis
      && activeInvoice;
  });
  // COMPANY'nin gerçekleşen gideri, tamamlanmış hizmet kanıtı bulunan
  // COMPANY sözleşme bedelinden okunur. ROOM hakedişi/faturası ve tahsilat
  // karşı tarafın kanıtlarıdır; COMPANY gideri olarak ikinci kez kopyalanmaz.
  const realizedServiceAmountMinor = items.length > 0 && realizedEvidenceItems.length === items.length
    ? realizedEvidenceItems.reduce((sum, item) => sum + item.companyContractAmountMinor, 0)
    : null;
  const status = !items.length
    ? "NO_SELECTED_AGREEMENT"
    : hasMismatch
      ? "REVIEW_REQUIRED"
      : hasMissingEvidence
        ? "EVIDENCE_MISSING"
        : hasPaymentGap
          ? "PAYMENT_UNPROVEN"
          : "MATCHED";

  return {
    status,
    source: "CANONICAL_RECONCILIATION",
    items,
    evidenceTotals: {
      agreementCount: items.length,
      serviceEligibleCount: items.reduce((sum, item) => sum + item.serviceEvidence.eligibleCount, 0),
      serviceCompletedCount: items.reduce((sum, item) => sum + item.serviceEvidence.completedCount, 0),
      hakedisAmountMinor: allHaveHakedis ? items.reduce((sum, item) => sum + item.hakedis.amountMinor, 0) : null,
      invoiceAmountMinor: allHaveInvoice ? items.reduce((sum, item) => sum + item.invoice.amountMinor, 0) : null,
      paidAmountMinor: allHavePayment ? items.reduce((sum, item) => sum + item.payment.amountMinor, 0) : null,
      realizedServiceAmountMinor,
      realizedServiceSource: realizedServiceAmountMinor === null ? null : "COMPANY_AGREEMENT_PRICE",
      financialLineCount: items.filter((item) => item.hakedis.amountMinor !== null && item.invoice.amountMinor !== null).length,
    },
  };
}

function commitmentReason(reasonCode, reason) {
  return { reasonCode, reason };
}

export function buildCompanyBudgetCommitmentPreview({ budgetPlan = null, agreements = [], evidenceByAgreementId = {} } = {}) {
  const companyId = normalizePositiveId(budgetPlan?.companyId);
  const budgetAmountMinor = minorOrNull(budgetPlan?.budgetAmountMinor);
  const periodStart = dateIsoOrNull(budgetPlan?.periodStart);
  const periodEnd = dateIsoOrNull(budgetPlan?.periodEnd);
  const selectedIds = normalizeIdList(
    budgetPlan?.agreementIds ?? budgetPlan?.scope?.selectedAgreementIds,
  );
  const byId = new Map();
  for (const item of Array.isArray(agreements) ? agreements : []) {
    const agreementId = normalizePositiveId(item?.agreementId ?? item?.id);
    if (!agreementId || byId.has(agreementId)) continue;
    byId.set(agreementId, item);
  }

  const included = [];
  const excluded = [];
  for (const agreementId of selectedIds) {
    const item = byId.get(agreementId);
    if (!item) {
      excluded.push({ agreementId, ...commitmentReason("SOURCE_MISSING", "Sözleşme kapsam kaynağı yeniden doğrulanamadı.") });
      continue;
    }
    if (normalizePositiveId(item.companyId) !== companyId) {
      excluded.push({ agreementId, ...commitmentReason("TENANT_MISMATCH", "Sözleşme bu firmaya ait değil.") });
      continue;
    }
    const status = String(item.status || "").toUpperCase();
    if (!CONFIRMED_AGREEMENT_STATUSES.has(status)) {
      excluded.push({ agreementId, status, ...commitmentReason("STATUS_NOT_CONFIRMED", "Sözleşme henüz onaylanmış değil.") });
      continue;
    }
    const agreementStart = dateIsoOrNull(item.periodStart ?? item.startDate);
    const agreementEnd = dateIsoOrNull(item.periodEnd ?? item.endDate);
    const coverage = String(item.periodCoverage || "").toLowerCase();
    const isFullPeriod = coverage
      ? coverage === "full"
      : Boolean(periodStart && periodEnd && agreementStart && agreementEnd && agreementStart >= periodStart && agreementEnd <= periodEnd);
    if (!isFullPeriod) {
      excluded.push({ agreementId, ...commitmentReason("PARTIAL_PERIOD", "Sözleşme dönemi bütçe dönemiyle tam eşleşmiyor.") });
      continue;
    }
    const commercialPriceStatus = String(item.commercialPriceStatus || "NOT_PROVEN").toUpperCase();
    const amountMinor = commercialPriceStatus === "READY"
      ? minorOrNull(item.commercialAmountMinor)
      : null;
    const commercialPriceSource = String(item.commercialPriceSource || "").trim();
    if (amountMinor === null || !commercialPriceSource) {
      excluded.push({ agreementId, ...commitmentReason("COMMERCIAL_PRICE_NOT_PROVEN", "Kabul edilmiş ticari fiyat kanıtı bulunamadı.") });
      continue;
    }
    if (amountMinor < 0) {
      excluded.push({ agreementId, ...commitmentReason("AMOUNT_INVALID", "Sözleşme tutarı geçersiz.") });
      continue;
    }
    const currencyCode = normalizeCurrencyCode(item.currencyCode || budgetPlan?.currencyCode || "TRY") || "TRY";
    const budgetCurrencyCode = normalizeCurrencyCode(budgetPlan?.currencyCode || "TRY") || "TRY";
    if (currencyCode !== budgetCurrencyCode) {
      excluded.push({ agreementId, ...commitmentReason("CURRENCY_MISMATCH", "Sözleşme para birimi bütçe para birimiyle eşleşmiyor.") });
      continue;
    }
    included.push({
      agreementId,
      amountMinor,
      currencyCode,
      commercialAmountMinor: amountMinor,
      commercialPriceSource,
      commercialPriceStatus,
      plannedServiceCount: wholeOrNull(item.plannedServiceCount, item.serviceCount),
    });
  }

  const commitmentIncomplete = excluded.some((item) => [
    "SOURCE_MISSING",
    "PARTIAL_PERIOD",
    "AMOUNT_MISSING",
    "COMMERCIAL_PRICE_NOT_PROVEN",
    "AMOUNT_INVALID",
    "CURRENCY_MISMATCH",
  ].includes(item.reasonCode));
  const commitmentComplete = !commitmentIncomplete;
  const committedAmountMinor = commitmentComplete
    ? included.reduce((sum, item) => sum + item.amountMinor, 0)
    : null;
  const remainingBudgetMinor = budgetAmountMinor !== null && committedAmountMinor !== null
    ? budgetAmountMinor - committedAmountMinor
    : null;
  const evidenceCounts = included.reduce((counts, item) => {
    const evidence = evidenceByAgreementId?.[String(item.agreementId)] || evidenceByAgreementId?.[item.agreementId] || {};
    counts.hakedisCount += Number(evidence.hakedisCount || 0) || 0;
    counts.invoiceCount += Number(evidence.invoiceCount || 0) || 0;
    counts.paymentCount += Number(evidence.paymentCount || 0) || 0;
    return counts;
  }, { hakedisCount: 0, invoiceCount: 0, paymentCount: 0 });
  const hasSeparateEvidence = Object.values(evidenceCounts).some((value) => value > 0);
  const financialEvidence = buildCompanyBudgetFinancialEvidenceSummary({
    included,
    reconciliationByAgreementId: evidenceByAgreementId,
  });

  return {
    status: budgetAmountMinor === null ? "budget_missing" : commitmentComplete ? "complete" : "incomplete",
    budgetAmountMinor,
    committedAmountMinor,
    remainingBudgetMinor,
    currencyCode: normalizeCurrencyCode(budgetPlan?.currencyCode || "TRY") || "TRY",
    budgetPlanId: normalizePositiveId(budgetPlan?.id),
    companyId,
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
    selectedAgreementCount: selectedIds.length,
    commitmentCount: included.length,
    serviceCount: included.reduce((sum, item) => sum + (item.plannedServiceCount || 0), 0),
    included,
    excluded,
    evidenceCounts,
    evidenceStatus: hasSeparateEvidence ? "separate_evidence_present" : "no_hakedis_invoice_payment",
    financialEvidence: financialEvidence.items,
    financialEvidenceStatus: financialEvidence.status,
    evidenceTotals: financialEvidence.evidenceTotals,
    realizedSpendMinor: financialEvidence.evidenceTotals.realizedServiceAmountMinor,
    invoiceAmountMinor: null,
    paidAmountMinor: null,
    readOnly: true,
    previewOnly: true,
    notInvoiced: true,
    notPaid: true,
  };
}
