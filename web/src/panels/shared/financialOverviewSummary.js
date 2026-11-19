const CATEGORY_LABELS = {
  FUEL: "Yakıt",
  ADBLUE: "AdBlue",
  MAINTENANCE: "Bakım",
  REPAIR: "Onarım",
  TIRE_RIM: "Lastik / jant",
  MTV_TAX: "Motorlu taşıt vergisi",
  TRAFFIC_INSURANCE: "Trafik sigortası",
  CASCO: "Kasko",
  INSPECTION: "Muayene",
  EMISSION_TEST: "Emisyon testi",
  MANDATORY_DOCUMENT: "Zorunlu belge",
  LOAN_PRINCIPAL: "Kredi anaparası",
  FINANCE_CHARGE: "Finansman gideri",
  LEASING: "Leasing",
  RENT: "Kira",
  DEPRECIATION: "Amortisman",
  HGS_TOLL: "HGS / geçiş",
  PARKING: "Park",
  CLEANING: "Temizlik",
  ROADSIDE_ASSISTANCE: "Yol yardım",
  GPS: "GPS",
  CAMERA: "Kamera",
  VEHICLE_EQUIPMENT: "Araç ekipmanı",
  OTHER_VEHICLE: "Diğer araç gideri",
  EMPLOYER_MONTHLY_COST: "İşveren maliyeti",
  BASE_SALARY: "Sürücü ücreti",
  BENEFIT: "Yan hak",
  OVERTIME: "Fazla mesai",
  PER_DIEM: "Yolluk",
  MEAL_ALLOWANCE: "Yemek desteği",
  SOCIAL_COST: "Sosyal maliyet",
  OTHER_DRIVER: "Diğer sürücü gideri",
  SERVICE_DIRECT: "Doğrudan servis gideri",
  ROUTE_FEE: "Rota ücreti",
  OPERATIONS_OVERHEAD: "Operasyon genel gideri",
  OTHER_OPERATION: "Diğer operasyon gideri",
};

function text(value) {
  return String(value ?? "").trim();
}

function positiveAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(value) {
  const date = dateValue(value);
  if (!date) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatPeriodDate(value) {
  const date = dateOnly(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function periodLabel(periodStart, periodEnd) {
  if (!periodStart && !periodEnd) return "Tüm dönemler";
  return `${formatPeriodDate(periodStart) || "Başlangıç yok"} – ${formatPeriodDate(periodEnd) || "Bitiş yok"}`;
}

function entryDate(entry) {
  return entry?.periodStart || entry?.occurredAt || entry?.periodEnd || entry?.confirmedAt || entry?.createdAt || null;
}

function entryTieBreak(entry) {
  const numericId = Number(entry?.id);
  if (Number.isSafeInteger(numericId)) return `0:${String(numericId).padStart(16, "0")}`;
  return `1:${text(entry?.id) || text(entry?.sourceRef) || text(entry?.createdAt) || ""}`;
}

function compareRecentEntries(left, right) {
  const leftDate = dateValue(entryDate(left))?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightDate = dateValue(entryDate(right))?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (rightDate !== leftDate) return rightDate - leftDate;
  return entryTieBreak(right).localeCompare(entryTieBreak(left), "en");
}

function entryMatchesPeriod(entry, periodStart, periodEnd) {
  if (!periodStart && !periodEnd) return true;
  const candidate = dateOnly(entryDate(entry));
  if (!candidate) return false;
  const start = periodStart ? dateOnly(periodStart) : null;
  const end = periodEnd ? dateOnly(periodEnd) : null;
  return (!start || candidate.getTime() >= start.getTime()) && (!end || candidate.getTime() <= end.getTime());
}

function hasShiftEvidence(entry) {
  if (Number.isSafeInteger(Number(entry?.shiftId)) && Number(entry.shiftId) > 0) return true;
  if (text(entry?.display?.shiftLabel)) return true;
  return Array.isArray(entry?.allocationLines)
    && entry.allocationLines.some((line) => String(line?.targetKind || "").toUpperCase() === "SHIFT" || (Number.isSafeInteger(Number(line?.shiftId)) && Number(line.shiftId) > 0));
}

function pushWarning(warnings, warning) {
  if (!warnings.some((item) => item.key === warning.key)) warnings.push(warning);
}

function isConfirmedActual(entry) {
  return String(entry?.recordKind || "").toUpperCase() === "ACTUAL"
    && String(entry?.lifecycle || "").toUpperCase() === "CONFIRMED";
}

export function buildFinancialOverviewQuery({ periodStart = "", periodEnd = "", periodScope = "" } = {}) {
  const normalizedScope = text(periodScope).toUpperCase() || (!text(periodStart) && !text(periodEnd) ? "ALL" : "RANGE");
  return {
    recordKind: "ACTUAL",
    includeSalary: "true",
    periodScope: normalizedScope,
    ...(text(periodStart) ? { periodStart: text(periodStart) } : {}),
    ...(text(periodEnd) ? { periodEnd: text(periodEnd) } : {}),
  };
}

export function financialOverviewScopeCopy() {
  return {
    selectedVehicle: false,
    expenseTitle: "Firma geneli gerçekleşen gider",
    expenseNotePrefix: "Firma geneli · ",
    incomeScopeLabel: "Firma geneli",
    incomeScopeNote: "Firma geneli finans kaydı.",
    differenceTitle: "Geçici gelir–gider farkı",
    differenceNotePrefix: "Mevcut kayıtların farkıdır; kesin net kâr değildir.",
    vehicleProfitabilityTitle: "Araç kârlılığı",
    vehicleProfitabilityNote: "Seçili araca bağlanmış kazanılmış gelir kanıtı bulunmadığı için araç kârlılığı hesaplanamıyor.",
  };
}

export function financialOverviewMetricGroups() {
  return {
    primary: ["expense", "realized", "difference"],
    companyWide: ["hakedis", "invoiced", "collected", "receivable"],
  };
}

export function initialFinancialOverviewPeriod({ initialPeriodStart = "", initialPeriodEnd = "" } = {}) {
  return {
    periodStart: text(initialPeriodStart).slice(0, 10),
    periodEnd: text(initialPeriodEnd).slice(0, 10),
  };
}

export function buildFinancialOverviewSummary({ summary = null, entries = [], periodStart = "", periodEnd = "", now = new Date() } = {}) {
  const actualBucket = summary?.buckets?.ACTUAL || {};
  const knownActual = Array.isArray(summary?.known)
    ? summary.known.filter((item) => String(item?.recordKind || "").toUpperCase() === "ACTUAL")
    : [];
  const categoryMap = new Map();
  for (const item of knownActual) {
    const key = text(item?.categoryKey).toUpperCase() || "OTHER_OPERATION";
    const amountMinor = positiveAmount(item?.amountMinor);
    if (amountMinor == null) continue;
    categoryMap.set(key, (categoryMap.get(key) || 0) + amountMinor);
  }
  const sortedCategories = [...categoryMap.entries()]
    .map(([key, amountMinor]) => ({ key, label: CATEGORY_LABELS[key] || "Kategori belirtilmemiş", amountMinor }))
    .sort((left, right) => right.amountMinor - left.amountMinor || left.label.localeCompare(right.label, "tr") || left.key.localeCompare(right.key, "en"));
  const canonicalTotalMinor = positiveAmount(actualBucket.grossAmountMinor);
  const topCategories = sortedCategories.slice(0, 5);
  const topCategoryTotalMinor = topCategories.reduce((total, item) => total + item.amountMinor, 0);
  const nonTopCategoryTotalMinor = sortedCategories.slice(5).reduce((total, item) => total + item.amountMinor, 0);
  const otherAmountMinor = canonicalTotalMinor == null ? nonTopCategoryTotalMinor : canonicalTotalMinor - topCategoryTotalMinor;
  const categories = [...topCategories];
  if (otherAmountMinor !== 0) {
    categories.push({
      key: "__OTHER__",
      label: "Diğer giderler",
      amountMinor: otherAmountMinor,
      isOther: true,
      sourceCategoryCount: Math.max(0, sortedCategories.length - topCategories.length),
    });
  }

  const actualEntries = (Array.isArray(entries) ? entries : []).filter((entry) => isConfirmedActual(entry) && entryMatchesPeriod(entry, periodStart, periodEnd));
  const recentEntries = [...actualEntries]
    .sort(compareRecentEntries)
    .slice(0, 5);
  const today = dateOnly(now) || dateOnly(new Date());
  const reclassifiedFutureEntries = (Array.isArray(entries) ? entries : []).filter((entry) => (
    String(entry?.recordKind || "").toUpperCase() === "FORECAST"
    && String(entry?.originalRecordKind || "").toUpperCase() === "ACTUAL"
  ));
  const futureActualCount = reclassifiedFutureEntries.length + actualEntries.filter((entry) => {
    const candidate = dateOnly(entryDate(entry));
    return Boolean(candidate && today && candidate.getTime() > today.getTime());
  }).length;

  const warnings = [];
  const informationNotes = [];
  if (futureActualCount > 0) {
    pushWarning(warnings, {
      key: "future-actual",
      title: `${futureActualCount} planlanan gider ileri tarihli`,
      impact: "Bu kayıtlar gerçekleşen gider toplamına alınmaz; planlama veya kontrollü DEMO kapsamı olarak ayrıca incelenir.",
      action: "expenses",
      actionTarget: "expenses",
      count: futureActualCount,
      expenseFilter: "future-actual",
      actionLabel: "Giderlerim'de incele",
    });
  }
  const unknownVatCount = actualEntries.filter((entry) => String(entry?.vatClassification || "UNKNOWN").toUpperCase() === "UNKNOWN").length;
  if (unknownVatCount > 0) {
    const unknownVatEntries = actualEntries.filter((entry) => String(entry?.vatClassification || "UNKNOWN").toUpperCase() === "UNKNOWN");
    informationNotes.push({
      key: "vat-unknown",
      title: `${unknownVatCount} giderde KDV ayrıca belirtilmedi`,
      impact: "Bu giderler kayıtlı brüt tutarlarıyla hesaba dahil edildi; KDV %0 veya istisna varsayılmadı. İsterseniz ayrıntıyı Giderlerim ekranında inceleyebilirsiniz.",
      count: unknownVatCount,
      expenseFilter: unknownVatCount > 1 ? "vat-unknown" : null,
      focusEntryId: unknownVatEntries.length === 1 ? unknownVatEntries[0]?.id || null : null,
    });
  }
  if (actualBucket.netRollupBlocked && unknownVatCount === 0) {
    pushWarning(warnings, {
      key: "net-rollup-blocked",
      title: "Net toplam doğrulaması bekliyor",
      impact: "Gerekli finans kanıtları tamamlanmadan net toplam ve kesin kârlılık doğrulanamaz; kayıtlı brüt gider korunur.",
    });
  }
  if (summary?.salaryRedacted) {
    pushWarning(warnings, {
      key: "salary-redacted",
      title: "Bazı personel maliyetleri yetki kapsamı dışında",
      impact: "Toplam yalnızca erişilebilen kayıtları içerir.",
      action: "expenses",
      actionTarget: "expenses",
      actionLabel: "Giderlerim'i aç",
    });
  }
  const missingEvidenceCount = actualEntries.filter((entry) => !text(entry?.evidenceRef)).length;
  if (missingEvidenceCount > 0) {
    pushWarning(warnings, {
      key: "source-evidence",
      title: `${missingEvidenceCount} giderde kaynak kanıtı eksik`,
      impact: "Maliyet kaynağı doğrulanmadan kesin sonuç üretilemez.",
      action: "expenses",
      actionTarget: "expenses",
      count: missingEvidenceCount,
      expenseFilter: "missing-evidence",
      actionLabel: "Giderlerim'de tamamla",
    });
  }
  const pendingAllocationCount = actualEntries.filter((entry) => !hasShiftEvidence(entry)).length;
  if (!summary || (!actualEntries.length && !actualBucket.entryCount)) {
    pushWarning(warnings, {
      key: "no-actuals",
      title: "Seçili dönemde onaylı gerçekleşen gider bulunamadı",
      impact: "Bu kapsam için gerçekleşen gider toplamı doğrulanamıyor.",
      action: "expenses",
      actionLabel: "Giderlerim'i aç",
    });
  }
  if (canonicalTotalMinor != null && topCategoryTotalMinor + otherAmountMinor !== canonicalTotalMinor) {
    pushWarning(warnings, {
      key: "category-coverage",
      title: "Kategori dağılımı doğrulama bekliyor",
      impact: "Kategoriler aynı gerçekleşen gider kapsamıyla eşleşmiyor.",
      action: "expenses",
      actionLabel: "Giderlerim'i incele",
    });
  }

  return {
    totalMinor: actualBucket.grossAmountMinor ?? null,
    recordCount: Number.isFinite(Number(actualBucket.entryCount)) ? Number(actualBucket.entryCount) : 0,
    currencyCode: text(actualBucket.currencyCode) || "TRY",
    categories,
    categoryInvariant: canonicalTotalMinor != null && categories.reduce((total, item) => total + item.amountMinor, 0) === canonicalTotalMinor,
    categoryKnownTotalMinor: sortedCategories.reduce((total, item) => total + item.amountMinor, 0),
    categoryOtherAmountMinor: otherAmountMinor,
    recentEntries,
    futureActualCount,
    missingEvidenceCount,
    unknownVatCount,
    pendingAllocationCount,
    warnings,
    informationNotes,
    periodLabel: periodLabel(periodStart, periodEnd),
    liveSourceConfirmed: Boolean(summary && Array.isArray(summary?.known) && summary?.readOnly === true),
  };
}

function incomeEvidenceReason(status) {
  switch (String(status || "").toUpperCase()) {
    case "PERIOD_REQUIRED":
      return "Geliri incelemek için dönem seçin.";
    case "FUTURE_NOT_REALIZED":
      return "Bu dönem gelecekte; bugünün gerçekleşmiş geliri olarak kullanılamaz.";
    case "TEST_SIMULATED":
      return "Bu kayıt yalnız canonical DEMO kabulü için kontrollü simülasyondur; gerçek saha, GPS veya banka kanıtı değildir.";
    case "RECONCILIATION_MISMATCH":
      return "Hakediş ve fatura tutarları aynı ekonomik geliri doğrulamıyor.";
    case "SCOPE_MISMATCH":
      return "Gelir kayıtlarının dönemi veya para birimi aynı kapsamda değil.";
    case "INCOME_INVALID":
      return "Gelir tutarı doğrulanmış kaynaktan okunamadı.";
    default:
      return "Bu kapsamda doğrulanmış gerçekleşmiş gelir bulunamadı.";
  }
}

function incomeEvidenceCard({ kind, evidence, unavailableNote }) {
  const status = String(evidence?.status || "UNAVAILABLE").toUpperCase();
  const amountMinor = evidence?.amountMinor != null && Number.isSafeInteger(Number(evidence.amountMinor)) ? Number(evidence.amountMinor) : null;
  return {
    kind,
    status,
    amountMinor,
    currencyCode: text(evidence?.currencyCode) || "TRY",
    recordCount: Number.isSafeInteger(Number(evidence?.recordCount)) ? Number(evidence.recordCount) : 0,
    note: amountMinor == null ? (unavailableNote || incomeEvidenceReason(status)) : "Doğrulanmış kaynak kaydı mevcut.",
  };
}

export function buildIncomeOverviewSummary({ incomeEvidence = null, periodStart = "", periodEnd = "", periodScope = "", agreementRecords = [] } = {}) {
  const allPeriods = text(periodScope).toUpperCase() === "ALL" || text(incomeEvidence?.periodScope).toUpperCase() === "ALL";
  const status = String(incomeEvidence?.status || (allPeriods ? "UNAVAILABLE" : periodStart && periodEnd ? "UNAVAILABLE" : "PERIOD_REQUIRED")).toUpperCase();
  const noPeriod = !allPeriods && (!text(periodStart) || !text(periodEnd));
  const agreementMap = new Map(
    (Array.isArray(agreementRecords) ? agreementRecords : [])
      .map((agreement) => [Number(agreement?.id || 0), agreement])
      .filter(([agreementId]) => agreementId > 0),
  );
  const hakedis = incomeEvidenceCard({
    kind: "HAKEDIS",
    evidence: incomeEvidence?.hakedisEvidence,
    unavailableNote: noPeriod ? "Geliri görmek için dönem seçin." : "Bu dönemde doğrulanmış hakediş kaydı bulunamadı.",
  });
  const invoiced = incomeEvidenceCard({
    kind: "INVOICE",
    evidence: incomeEvidence?.invoiceEvidence,
    unavailableNote: noPeriod ? "Geliri görmek için dönem seçin." : "Bu dönemde doğrulanmış fatura kaydı bulunamadı.",
  });
  const realized = {
    kind: "REALIZED_INCOME",
    status: status === "AVAILABLE" && incomeEvidence?.authoritative === true ? "AVAILABLE" : status,
    amountMinor: status === "AVAILABLE" && incomeEvidence?.authoritative === true && incomeEvidence?.amountMinor != null && Number.isSafeInteger(Number(incomeEvidence?.amountMinor))
      ? Number(incomeEvidence.amountMinor)
      : null,
    currencyCode: text(incomeEvidence?.currencyCode) || "TRY",
    note: status === "AVAILABLE" && incomeEvidence?.authoritative === true
      ? "Hakediş ve fatura aynı ekonomik iş olarak eşleşti."
      : incomeEvidenceReason(status),
  };
  const unavailableFinancialCard = (kind, label) => ({
    ...(() => {
      const evidence = incomeEvidence?.[kind === "COLLECTED" ? "collectionEvidence" : "receivableEvidence"] || null;
      const evidenceStatus = String(evidence?.status || "UNAVAILABLE").toUpperCase();
      const amountMinor = !noPeriod && evidenceStatus === "AVAILABLE" && Number.isSafeInteger(Number(evidence?.amountMinor))
        ? Number(evidence.amountMinor)
        : null;
      return {
        kind,
        status: evidenceStatus,
        amountMinor,
        currencyCode: text(evidence?.currencyCode) || "TRY",
        note: amountMinor != null
          ? (kind === "COLLECTED" ? "Doğrulanmış tahsilat kaydı." : "Faturadan kalan doğrulanmış alacak.")
          : (noPeriod ? "Geliri görmek için dönem seçin." : text(evidence?.reason) || `${label} için bu kapsamda doğrulanmış kayıt bulunamıyor.`),
      };
    })(),
  });
  const links = (Array.isArray(incomeEvidence?.lines) ? incomeEvidence.lines : [])
    .filter((line) => Number.isSafeInteger(Number(line?.agreementId)) && Number(line.agreementId) > 0)
    .map((line) => {
      const agreementId = Number(line.agreementId);
      const agreement = agreementMap.get(agreementId);
      const hakedisId = Number(line.hakedisId || 0) || null;
      const invoiceId = Number(line.invoiceId || 0) || null;
      const recordTypes = [
        hakedisId ? `Hakediş kaydı #${hakedisId}` : null,
        invoiceId ? `Fatura kaydı #${invoiceId}` : null,
      ].filter(Boolean);
      return {
        agreementId,
        hakedisId,
        invoiceId,
        companyId: Number(line.companyId || agreement?.company?.id || 0) || null,
        amountMinor: positiveAmount(line.amountMinor),
        currencyCode: text(line.currencyCode) || "TRY",
        customerLabel: text(line?.companyName) || text(agreement?.company?.name) || "Müşteri bilgisi bulunamadı",
        agreementLabel: `Sözleşme #${agreementId}`,
        recordTypeLabel: recordTypes.join(" · ") || "Gelir kaydı",
        periodStart: text(line.periodStart) || null,
        periodEnd: text(line.periodEnd) || null,
        sourcePeriodStart: text(line.sourcePeriodStart) || text(line.periodStart) || null,
        sourcePeriodEnd: text(line.sourcePeriodEnd) || text(line.periodEnd) || null,
        recognizedPeriodStart: text(line.recognizedPeriodStart) || text(line.periodStart) || null,
        recognizedPeriodEnd: text(line.recognizedPeriodEnd) || text(line.periodEnd) || null,
        correctionId: Number(line.correctionId || 0) || null,
        offerLineageStatus: text(line.offerLineageStatus).toUpperCase() || "NOT_PROVEN",
        offerId: Number(line.offerId || 0) || null,
        offerShiftId: Number(line.offerShiftId || 0) || null,
        offerStatus: text(line.offerStatus).toUpperCase() || null,
        offerAmountCompanyMinor: positiveAmount(line.offerAmountCompanyMinor),
        offerAmountRoomMinor: positiveAmount(line.offerAmountRoomMinor),
        source: text(line.source) || null,
        sourceLabel: String(line.source || "").toUpperCase() === "TEST_SIMULATED"
          ? "Kontrollü DEMO simülasyonu · gerçek saha/banka kanıtı değil"
          : null,
        label: "Mutabakatı incele",
      };
    });
  return {
    status: noPeriod ? "PERIOD_REQUIRED" : status,
    periodRequired: noPeriod,
    message: noPeriod ? "Geliri incelemek için dönem seçin." : incomeEvidenceReason(status),
    hakedis,
    invoiced,
    realized,
    collected: unavailableFinancialCard("COLLECTED", "Tahsilat"),
    receivable: unavailableFinancialCard("RECEIVABLE", "Kalan alacak"),
    links,
  };
}

export function selectRoomCollectionInvoiceLinks(links = [], { role = "" } = {}) {
  if (String(role || "").toUpperCase() !== "ROOM") return [];
  const seenInvoiceIds = new Set();
  return (Array.isArray(links) ? links : []).filter((link) => {
    const invoiceId = Number(link?.invoiceId || 0);
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0 || seenInvoiceIds.has(invoiceId)) return false;
    seenInvoiceIds.add(invoiceId);
    return true;
  });
}

function normalizeBoundary(value) {
  const normalized = text(value);
  return normalized ? normalized.slice(0, 10) : null;
}

function normalizeCurrency(value) {
  return text(value).toUpperCase() || null;
}

function safeMinor(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function sameScope(scope, incomeEvidence) {
  const requestedRoomId = Number(scope?.roomId);
  const incomeRoomId = Number(incomeEvidence?.roomId);
  if (Number.isSafeInteger(requestedRoomId) && Number.isSafeInteger(incomeRoomId) && requestedRoomId !== incomeRoomId) return false;
  const requestedScopeKey = text(scope?.scopeKey);
  const incomeScopeKey = text(incomeEvidence?.scopeKey);
  return Boolean(requestedScopeKey && incomeScopeKey && requestedScopeKey === incomeScopeKey);
}

function hasVehicleIncomeEvidence(scope, incomeEvidence) {
  const selectedVehicleId = Number(scope?.vehicleId);
  if (!Number.isSafeInteger(selectedVehicleId) || selectedVehicleId <= 0) return true;
  const lines = Array.isArray(incomeEvidence?.lines) ? incomeEvidence.lines : [];
  return lines.some((line) => [
    line?.vehicleId,
    line?.assignedVehicleId,
    line?.vehicle?.id,
    line?.assignment?.vehicleId,
    line?.shift?.vehicleId,
  ].some((value) => Number.isSafeInteger(Number(value)) && Number(value) === selectedVehicleId));
}

export function buildProvisionalProfitability({
  expenseMinor,
  expenseCurrency = "TRY",
  period = {},
  scope = {},
  incomeEvidence = null,
} = {}) {
  const normalizedExpense = safeMinor(expenseMinor);
  const currencyCode = normalizeCurrency(expenseCurrency);
  const requestedPeriod = {
    start: normalizeBoundary(period?.start ?? period?.periodStart),
    end: normalizeBoundary(period?.end ?? period?.periodEnd),
  };
  const base = {
    status: "INCOME_UNAVAILABLE",
    incomeMinor: null,
    expenseMinor: normalizedExpense,
    differenceMinor: null,
    currencyCode,
    includedCounts: { income: 0, expense: normalizedExpense == null ? 0 : 1 },
    excludedReasons: [],
  };
  if (normalizedExpense == null || !currencyCode) {
    return { ...base, status: "EXPENSE_SCOPE_INVALID", excludedReasons: ["Gider kapsamı veya para birimi doğrulanamadı."] };
  }
  if (!incomeEvidence) {
    return { ...base, excludedReasons: ["Aynı kapsamda doğrulanmış gerçekleşen gelir kaydı bulunamadı."] };
  }
  if (incomeEvidence.status !== "AVAILABLE" || incomeEvidence.authoritative !== true) {
    return { ...base, status: "INCOME_NOT_AUTHORITATIVE", excludedReasons: ["Gelir kaynağı gerçekleşmiş ve yetkili bir kayıt olarak doğrulanmadı."] };
  }
  if (incomeEvidence.sourceType && String(incomeEvidence.sourceType).toUpperCase() !== "INTERNAL_ACTUAL") {
    return { ...base, status: "INCOME_NOT_AUTHORITATIVE", excludedReasons: ["Teklif, bütçe veya tahmin kaydı gerçekleşmiş gelir olarak kullanılamaz."] };
  }
  const incomeMinor = safeMinor(incomeEvidence.amountMinor);
  if (incomeMinor == null) {
    return { ...base, status: "INCOME_INVALID", excludedReasons: ["Gerçekleşen gelir tutarı doğrulanamadı."] };
  }
  if (normalizeCurrency(incomeEvidence.currencyCode) !== currencyCode) {
    return { ...base, status: "INCOME_SCOPE_MISMATCH", excludedReasons: ["Gelir ve gider para birimi aynı değil."] };
  }
  if (normalizeBoundary(incomeEvidence.periodStart) !== requestedPeriod.start || normalizeBoundary(incomeEvidence.periodEnd) !== requestedPeriod.end) {
    return { ...base, status: "INCOME_SCOPE_MISMATCH", excludedReasons: ["Gelir ve gider dönemi aynı değil."] };
  }
  if (!scope?.vehicleId && scope?.firmExpenseScopeProven !== true) {
    return {
      ...base,
      status: "FIRM_EXPENSE_SCOPE_NOT_PROVEN",
      excludedReasons: ["Firma geneli gider kapsamı tam doğrulanmadığı için gelir–gider sonucu gösterilmiyor."],
    };
  }
  if (!sameScope(scope, incomeEvidence)) {
    return { ...base, status: "INCOME_SCOPE_MISMATCH", excludedReasons: ["Gelir ve gider finansal kapsamı aynı değil."] };
  }
  if (!hasVehicleIncomeEvidence(scope, incomeEvidence)) {
    return { ...base, status: "VEHICLE_INCOME_NOT_PROVEN", excludedReasons: ["Seçili araca bağlanmış kazanılmış gelir kanıtı bulunmadığı için araç kârlılığı hesaplanamıyor."] };
  }
  return {
    ...base,
    status: "AVAILABLE",
    incomeMinor,
    differenceMinor: incomeMinor - normalizedExpense,
    includedCounts: {
      income: Number.isSafeInteger(Number(incomeEvidence.includedCount)) ? Number(incomeEvidence.includedCount) : 1,
      expense: normalizedExpense == null ? 0 : 1,
    },
    excludedReasons: [],
  };
}

export function financialCategoryLabel(key) {
  return CATEGORY_LABELS[text(key).toUpperCase()] || "Kategori belirtilmemiş";
}
