function formatMoneyMinor(value, currencyCode = "TRY") {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  const amountMinor = Number(value);
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) return "-";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(amountMinor / 100)}${suffix}`;
}

function offerStatusLabel(status) {
  return {
    OPEN: "Açık teklif",
    COUNTERED: "Karşı teklif",
    ACCEPTED: "Kabul edilmiş teklif",
  }[String(status || "").toUpperCase()] || "Teklif";
}

function hasMovementFrequency(conditions = {}) {
  return [conditions.movementCount, conditions.dailyMovementCount, conditions.weeklyMovementCount, conditions.tripCount, conditions.frequencyLabel]
    .some((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function hasVatScope(conditions = {}) {
  return [conditions.vatScope, conditions.taxBasis, conditions.vatIncluded, conditions.vatClassification]
    .some((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function offerScopeLabel(scopeStatus, conditions = {}) {
  const scopeLabel = String(scopeStatus || "").toLowerCase() === "full_period"
    ? "Hizmet dönemi bütçe dönemiyle eşleşiyor."
    : "Tek vardiya kapsamı; tam dönem bütçe eşleşmesi doğrulanmadı.";
  const missing = [];
  if (!hasMovementFrequency(conditions)) missing.push("Sefer sıklığı belirtilmedi");
  if (!hasVatScope(conditions)) missing.push("KDV kapsamı belirtilmedi");
  return [scopeLabel, ...missing].join(" · ");
}

function offerPeriodLabel(start, end) {
  const values = [start, end].map((value) => String(value || "").slice(0, 10));
  if (!values[0] && !values[1]) return "Dönem bilgisi yok";
  if (values[0] === values[1]) return values[0] || "Dönem bilgisi yok";
  return `${values[0] || "-"} - ${values[1] || "-"}`;
}

function serviceConditionsLabel(conditions = {}) {
  const parts = [];
  if (conditions.passengerCount != null) parts.push(`${conditions.passengerCount} kişi`);
  if (conditions.stopCount != null) parts.push(`${conditions.stopCount} durak`);
  if (conditions.distanceKm != null) parts.push(`${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(conditions.distanceKm)} km`);
  if (conditions.durationMinutes != null) parts.push(`${conditions.durationMinutes} dk`);
  if (hasMovementFrequency(conditions)) {
    const frequency = conditions.frequencyLabel
      ?? conditions.movementCount
      ?? conditions.dailyMovementCount
      ?? conditions.weeklyMovementCount
      ?? conditions.tripCount;
    parts.push(`Sefer sıklığı: ${frequency}`);
  } else {
    parts.push("Sefer sıklığı: belirtilmedi");
  }
  if (hasVatScope(conditions)) {
    const vat = conditions.vatScope ?? conditions.taxBasis ?? (conditions.vatIncluded === true ? "KDV dahil" : "KDV hariç");
    parts.push(`KDV kapsamı: ${vat}`);
  } else {
    parts.push("KDV kapsamı: belirtilmedi");
  }
  return parts.length ? `Hizmet koşulları: ${parts.join(" · ")}` : "Hizmet koşulları dönem ve teklif kaydıyla sınırlı gösteriliyor.";
}

export function buildOfferBudgetComparisonPresentation({ comparison, currencyCode = "TRY" } = {}) {
  const candidates = Array.isArray(comparison?.candidates) ? comparison.candidates : [];
  return {
    visible: Boolean(comparison),
    title: "Teklif ve bütçe karşılaştırması",
    summaryText: String(comparison?.summaryText || "Karşılaştırma için doğrulanabilir teklif bulunamadı."),
    candidates: candidates.map((candidate) => ({
      offerId: candidate.offerId,
      providerName: String(candidate.providerName || "Hizmet sağlayıcı belirtilmedi"),
      statusLabel: offerStatusLabel(candidate.status),
      amountLabel: candidate.amountSourceLabel
        ? `${candidate.amountSourceLabel}: ${formatMoneyMinor(candidate.amountMinor, currencyCode)}`
        : formatMoneyMinor(candidate.amountMinor, currencyCode),
      periodLabel: offerPeriodLabel(candidate.periodStart, candidate.periodEnd),
      serviceConditionsLabel: serviceConditionsLabel(candidate.serviceConditions),
      scopeLabel: offerScopeLabel(candidate.scopeStatus, candidate.serviceConditions),
      possibleRemainingLabel: candidate.possibleRemainingBudgetMinor == null
        ? "Bu teklif için tam dönem bütçe farkı hesaplanmadı."
        : formatMoneyMinor(candidate.possibleRemainingBudgetMinor, currencyCode),
      economicNote: "Bu tutar kesin sözleşme taahhüdü veya gerçekleşmiş harcama değildir.",
      isCommitment: candidate.isCommitment === true,
      isActualSpend: candidate.isActualSpend === true,
    })),
  };
}
