const CONFIRMED_AGREEMENT_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE"]);

function idOrNull(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function minorOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function signedMinorOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : null;
}

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function dateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function numericMetric(metrics, key) {
  const value = Number(metrics?.[key]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function budgetEffect({ budgetPlan, commitmentSummary }) {
  const budgetAmountMinor = minorOrNull(budgetPlan?.budgetAmountMinor ?? commitmentSummary?.budgetAmountMinor);
  const committedAmountMinor = minorOrNull(commitmentSummary?.committedAmountMinor);
  const remainingBudgetMinor = signedMinorOrNull(commitmentSummary?.remainingBudgetMinor);
  const status = budgetAmountMinor === null || committedAmountMinor === null || remainingBudgetMinor === null
    ? "INCOMPLETE"
    : remainingBudgetMinor < 0
      ? "OVER_BUDGET"
      : "WITHIN_BUDGET";
  return {
    budgetAmountMinor,
    committedAmountMinor,
    remainingBudgetMinor,
    currencyCode: text(commitmentSummary?.currencyCode || budgetPlan?.currencyCode) || "TRY",
    budgetStatus: String(budgetPlan?.status || "UNKNOWN").toUpperCase(),
    status,
  };
}

function offerEffect({ offerBudgetComparison, selectedAgreement, selectedOfferId = null }) {
  const candidates = Array.isArray(offerBudgetComparison?.candidates) ? offerBudgetComparison.candidates : [];
  const candidate = candidates.find((item) => idOrNull(item?.offerId) === idOrNull(selectedOfferId)) || candidates[0] || null;
  const excluded = Array.isArray(offerBudgetComparison?.excluded) ? offerBudgetComparison.excluded : [];
  const alreadyCommitted = excluded.find((item) => item?.reasonCode === "ALREADY_COMMITTED" || item?.reasonCode === "AGREEMENT_LINKED_NOT_COMPARABLE");
  if (!candidate && alreadyCommitted) {
    return {
      status: "ALREADY_COMMITTED",
      amountMinor: null,
      currencyCode: null,
      possibleRemainingBudgetMinor: null,
      isCommitment: false,
      isActualSpend: false,
      reason: "Bu teklif mevcut sözleşme taahhüdüyle zaten kapsanıyor; ikinci kez bütçe etkisi hesaplanmadı.",
    };
  }
  if (!candidate) {
    return {
      status: selectedAgreement ? "CONFIRMED_AGREEMENT" : "NO_OFFER",
      amountMinor: null,
      currencyCode: null,
      possibleRemainingBudgetMinor: null,
      isCommitment: Boolean(selectedAgreement),
      isActualSpend: false,
      reason: selectedAgreement
        ? "Seçili sözleşme taahhüt toplamında bir kez yer alıyor; yeni teklif etkisi eklenmedi."
        : "Karşılaştırılabilir güncel teklif bulunamadı.",
    };
  }
  const fullPeriod = String(candidate.scopeStatus || "").toLowerCase() === "full_period";
  const possibleRemainingBudgetMinor = signedMinorOrNull(candidate.possibleRemainingBudgetMinor);
  const ready = fullPeriod && possibleRemainingBudgetMinor !== null;
  return {
    status: ready ? "READY" : "NOT_PROVEN",
    amountMinor: minorOrNull(candidate.amountMinor),
    currencyCode: text(candidate.amountCurrency || candidate.currencyCode) || "TRY",
    possibleRemainingBudgetMinor: ready ? possibleRemainingBudgetMinor : null,
    isCommitment: false,
    isActualSpend: false,
    offerId: idOrNull(candidate.offerId),
    scopeStatus: candidate.scopeStatus || null,
    reason: ready
      ? "Bu tutar yalnız teklif kabul edilirse oluşabilecek bütçe etkisidir; kesin taahhüt veya harcama değildir."
      : "Teklifin bütçe dönemi kapsamı tam doğrulanmadı; olası etki gösteriliyor, kesin kalan bütçe hesaplanmadı.",
  };
}

function offerComparison({ offerBudgetComparison } = {}) {
  const candidates = Array.isArray(offerBudgetComparison?.candidates) ? offerBudgetComparison.candidates : [];
  return {
    status: candidates.length > 0 && candidates.every((item) => item?.scopeStatus === "full_period" && item?.possibleRemainingBudgetMinor != null)
      ? "READY"
      : candidates.length > 0 ? "SCOPE_UNPROVEN" : "NOT_PROVEN",
    candidates: candidates.map((item) => ({
      offerId: idOrNull(item?.offerId),
      providerName: text(item?.providerName) || "Taşımacılık firması",
      amountMinor: minorOrNull(item?.amountMinor),
      currencyCode: text(item?.amountCurrency || item?.currencyCode) || "TRY",
      possibleRemainingBudgetMinor: signedMinorOrNull(item?.possibleRemainingBudgetMinor),
      scopeStatus: text(item?.scopeStatus),
    })),
    reason: offerBudgetComparison?.summaryText || "Karşılaştırılabilir güncel teklif bulunamadı.",
  };
}

function comparable(left, right) {
  const leftMetrics = left?.metrics || {};
  const rightMetrics = right?.metrics || {};
  const required = ["serviceDays", "shiftCount", "distanceKm", "vehicleType", "vehicleCapacity"];
  if (required.some((key) => numericMetric(leftMetrics, key) === null && key !== "vehicleType")) return false;
  if (required.some((key) => key === "vehicleType" && !text(leftMetrics[key]))) return false;
  if (required.some((key) => numericMetric(rightMetrics, key) === null && key !== "vehicleType")) return false;
  if (required.some((key) => key === "vehicleType" && !text(rightMetrics[key]))) return false;
  if (numericMetric(leftMetrics, "serviceDays") !== numericMetric(rightMetrics, "serviceDays")) return false;
  if (numericMetric(leftMetrics, "shiftCount") !== numericMetric(rightMetrics, "shiftCount")) return false;
  if (numericMetric(leftMetrics, "vehicleCapacity") !== numericMetric(rightMetrics, "vehicleCapacity")) return false;
  if (text(leftMetrics.vehicleType).toUpperCase() !== text(rightMetrics.vehicleType).toUpperCase()) return false;
  const leftDistance = numericMetric(leftMetrics, "distanceKm");
  const rightDistance = numericMetric(rightMetrics, "distanceKm");
  const tolerance = Math.max(0.5, Math.max(leftDistance, rightDistance) * 0.05);
  return Math.abs(leftDistance - rightDistance) <= tolerance;
}

function historyComparison({ companyId, selectedAgreement, agreementHistory }) {
  const targetId = idOrNull(selectedAgreement?.id);
  const targetCompanyId = idOrNull(selectedAgreement?.companyId ?? companyId);
  const targetAmountMinor = minorOrNull(selectedAgreement?.amountMinor ?? selectedAgreement?.companyOfferAmount);
  const history = Array.isArray(agreementHistory) ? agreementHistory : [];
  const eligible = history.filter((item) => {
    const itemId = idOrNull(item?.id);
    return idOrNull(item?.companyId) === targetCompanyId
      && itemId !== null
      && itemId !== targetId
      && CONFIRMED_AGREEMENT_STATUSES.has(String(item?.status || "").toUpperCase())
      && minorOrNull(item?.amountMinor ?? item?.companyOfferAmount) !== null
      && String(item?.currencyCode || "TRY").toUpperCase() === String(selectedAgreement?.currencyCode || "TRY").toUpperCase();
  });
  const comparableItems = eligible.filter((item) => comparable(selectedAgreement, item));
  if (!targetId || targetAmountMinor === null) {
    return {
      status: "NOT_PROVEN",
      comparableCount: 0,
      comparableItems: [],
      reason: "Seçili hizmetin tutar ve kapsam kanıtı olmadan geçmiş fiyat karşılaştırması yapılmadı.",
    };
  }
  if (!comparableItems.length) {
    return {
      status: "NOT_PROVEN",
      comparableCount: 0,
      comparableItems: [],
      reason: "Aynı hizmet kapsamını doğrulayan karşılaştırılabilir geçmiş satın alma kaydı bulunmadığı için fiyat karşılaştırması yapılmadı.",
    };
  }
  return {
    status: "READY",
    comparableCount: comparableItems.length,
    comparableItems: comparableItems.map((item) => ({
      agreementId: idOrNull(item.id),
      amountMinor: minorOrNull(item.amountMinor ?? item.companyOfferAmount),
      currencyCode: String(item.currencyCode || "TRY").toUpperCase(),
      periodStart: dateOnly(item.periodStart ?? item.startDate),
      periodEnd: dateOnly(item.periodEnd ?? item.endDate),
    })),
    reason: "Aynı hizmet kapsamını doğrulayan COMPANY satın alma kayıtları karşılaştırmaya hazır.",
  };
}

export function buildCompanyPriceBudgetAdvisory({
  companyId = null,
  budgetPlan = null,
  commitmentSummary = {},
  offerBudgetComparison = {},
  selectedAgreement = null,
  selectedOfferId = null,
  agreementHistory = [],
} = {}) {
  const budget = budgetEffect({ budgetPlan, commitmentSummary });
  const offer = offerEffect({ offerBudgetComparison, selectedAgreement, selectedOfferId });
  const comparison = offerComparison({ offerBudgetComparison });
  const history = historyComparison({ companyId, selectedAgreement, agreementHistory });
  const status = budget.status === "OVER_BUDGET"
    ? history.status === "READY" ? "BUDGET_RISK_HISTORY_READY" : "BUDGET_RISK_HISTORY_NOT_PROVEN"
    : history.status === "READY" ? "READY" : "HISTORY_NOT_PROVEN";
  return {
    status,
    budgetEffect: budget,
    offerEffect: offer,
    offerComparison: comparison,
    historyComparison: history,
    readOnly: true,
    noRoomInternalCost: true,
    noRoomMargin: true,
    writeAction: false,
  };
}
