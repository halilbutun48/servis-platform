const COMPARABLE_OFFER_STATUSES = new Set(["OPEN", "COUNTERED", "ACCEPTED"]);

function normalizeId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeCurrency(value, fallback = "TRY") {
  const currency = String(value || fallback).trim().toUpperCase();
  return currency || fallback;
}

function dateOnly(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function minorOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) return null;
  return amount;
}

function selectedAgreementIds(budgetPlan) {
  const source = budgetPlan?.agreementIds ?? budgetPlan?.scope?.selectedAgreementIds;
  return new Set(
    (Array.isArray(source) ? source : [])
      .map(normalizeId)
      .filter(Boolean),
  );
}

function fullPeriodCoverage(offer, periodStart, periodEnd, offerStart, offerEnd) {
  const coverage = String(
    offer?.periodCoverage
      ?? offer?.servicePeriodCoverage
      ?? offer?.shift?.periodCoverage
      ?? offer?.shift?.servicePeriodCoverage
      ?? "",
  ).trim().toUpperCase();
  const exactPeriod = Boolean(periodStart && periodEnd && offerStart === periodStart && offerEnd === periodEnd);
  // Marketplace vardiyalarında ayrı bir periodCoverage alanı yoktur. Aynı
  // talep bütçe döneminin ilk ve son gününü kapsıyorsa, bu kayıt zaten
  // sunucu tarafından dönemle eşleştirilmiş bir hizmet kapsamıdır.
  return exactPeriod && (coverage === "FULL" || coverage === "FULL_PERIOD" || !coverage);
}

function serviceConditionsOf(shift) {
  const requiredPax = Number(shift?.requiredPaxOverride);
  const stopCount = Number(shift?._count?.stops);
  const distanceM = Number(shift?.routeSnapshotDistanceM);
  const durationSec = Number(shift?.routeSnapshotDurationSec);
  return {
    passengerCount: Number.isSafeInteger(requiredPax) && requiredPax > 0 ? requiredPax : null,
    stopCount: Number.isSafeInteger(stopCount) && stopCount > 0 ? stopCount : null,
    distanceKm: Number.isFinite(distanceM) && distanceM > 0 ? Number((distanceM / 1000).toFixed(2)) : null,
    durationMinutes: Number.isFinite(durationSec) && durationSec > 0 ? Math.round(durationSec / 60) : null,
  };
}

export function buildCompanyBudgetOfferComparison({
  companyId,
  budgetPlan = null,
  commitmentSummary = {},
  offers = [],
} = {}) {
  const tenantId = normalizeId(companyId ?? budgetPlan?.companyId);
  const budgetPlanId = normalizeId(budgetPlan?.id);
  const budgetCurrency = normalizeCurrency(budgetPlan?.currencyCode, "TRY");
  const periodStart = dateOnly(budgetPlan?.periodStart);
  const periodEnd = dateOnly(budgetPlan?.periodEnd);
  const selectedIds = selectedAgreementIds(budgetPlan);
  const seenOfferIds = new Set();
  const candidates = [];
  const excluded = [];

  if (!budgetPlanId || !periodStart || !periodEnd) {
    return {
      status: "budget_missing",
      budgetPlanId,
      candidates,
      excluded,
      totalPossibleImpactMinor: null,
      commitmentSummaryUnchanged: true,
      summaryText: "Bütçe dönemi veya bütçe kaydı olmadığı için teklif karşılaştırılamadı.",
    };
  }

  for (const item of Array.isArray(offers) ? offers : []) {
    const offerId = normalizeId(item?.id ?? item?.offerId);
    if (!offerId || seenOfferIds.has(offerId)) {
      excluded.push({ offerId, reasonCode: "DUPLICATE_OFFER", reason: "Teklif kaydı bir kez değerlendirilir." });
      continue;
    }
    seenOfferIds.add(offerId);

    const shift = item?.shift || {};
    const offerCompanyId = normalizeId(shift.companyId ?? item?.companyId);
    if (!tenantId || offerCompanyId !== tenantId) {
      excluded.push({ offerId, reasonCode: "TENANT_MISMATCH", reason: "Teklif bu firmaya ait değil." });
      continue;
    }

    const status = String(item?.status || "").trim().toUpperCase();
    if (!COMPARABLE_OFFER_STATUSES.has(status)) {
      excluded.push({ offerId, reasonCode: "STATUS_NOT_ACTIVE", status, reason: "Teklif aktif bir karşılaştırma adımında değil." });
      continue;
    }

    const offerStart = dateOnly(shift.startAt ?? item?.startAt);
    const offerEnd = dateOnly(shift.endAt ?? item?.endAt);
    if (!offerStart || !offerEnd || offerStart < periodStart || offerEnd > periodEnd) {
      excluded.push({ offerId, reasonCode: "PERIOD_MISMATCH", reason: "Teklif hizmet dönemi bütçe dönemiyle uyuşmuyor." });
      continue;
    }

    const agreementId = normalizeId(shift.agreementId ?? item?.agreementId);
    if (agreementId && selectedIds.has(agreementId)) {
      excluded.push({ offerId, agreementId, reasonCode: "ALREADY_COMMITTED", reason: "Bu teklif bütçeye bağlı sözleşme taahhüdüyle zaten kapsanıyor." });
      continue;
    }
    if (agreementId) {
      excluded.push({ offerId, agreementId, reasonCode: "AGREEMENT_LINKED_NOT_COMPARABLE", reason: "Teklif zaten bir sözleşmeye bağlı; bütçe etkisi yeniden hesaplanmadı." });
      continue;
    }

    const roomAmountMinor = minorOrNull(item?.amountRoom);
    const companyAmountMinor = minorOrNull(item?.amountCompany);
    const amountMinor = roomAmountMinor ?? companyAmountMinor;
    if (amountMinor === null) {
      excluded.push({ offerId, reasonCode: "AMOUNT_MISSING", reason: "Teklif tutarı bulunamadı." });
      continue;
    }

    const currencyCode = normalizeCurrency(item?.currencyCode, "TRY");
    if (currencyCode !== budgetCurrency) {
      excluded.push({ offerId, reasonCode: "CURRENCY_MISMATCH", reason: "Teklif para birimi bütçe para birimiyle eşleşmiyor." });
      continue;
    }

    const scopeStatus = fullPeriodCoverage(item, periodStart, periodEnd, offerStart, offerEnd) ? "full_period" : "shift_only";
    const canCalculatePossibleImpact = scopeStatus === "full_period"
      && Number.isSafeInteger(Number(commitmentSummary.remainingBudgetMinor));
    candidates.push({
      offerId,
      shiftId: normalizeId(item?.shiftId ?? shift.id),
      status,
      providerName: String(item?.room?.name || "Taşımacılık Firması"),
      amountMinor,
      amountMajor: amountMinor / 100,
      amountCurrency: currencyCode,
      amountSource: roomAmountMinor !== null ? "ROOM_OFFER" : "COMPANY_OFFER",
      amountSourceLabel: roomAmountMinor !== null ? "Taşımacılık firması teklifi" : "Hizmet alan firmanın teklifi",
      periodStart: offerStart,
      periodEnd: offerEnd,
      scopeStatus,
      serviceConditions: serviceConditionsOf(shift),
      possibleRemainingBudgetMinor: canCalculatePossibleImpact
        ? Number(commitmentSummary.remainingBudgetMinor) - amountMinor
        : null,
      isCommitment: false,
      isActualSpend: false,
    });
  }

  const hasFullPeriodCandidate = candidates.some((item) => item.scopeStatus === "full_period");
  return {
    status: candidates.length === 0
      ? (excluded.length ? "no_comparable_offer" : "no_offer")
      : hasFullPeriodCandidate ? "ready" : "scope_unproven",
    budgetPlanId,
    budgetPeriodStart: periodStart,
    budgetPeriodEnd: periodEnd,
    budgetCurrency,
    candidates,
    excluded,
    totalPossibleImpactMinor: null,
    commitmentSummaryUnchanged: true,
    summaryText: candidates.length
      ? hasFullPeriodCandidate
        ? "Teklif olası bütçe etkisi olarak gösteriliyor; kesin taahhüt veya harcama değildir."
        : "Teklif tutarı görülebiliyor; hizmet kapsamı tam dönemle eşleşmediği için kesin bütçe farkı hesaplanmadı."
      : excluded.length
        ? "Uygun teklif bütçe dönemi ve kapsamıyla eşleştirilemedi."
        : "Karşılaştırılacak teklif bulunamadı.",
  };
}
