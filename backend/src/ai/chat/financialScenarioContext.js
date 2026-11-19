const FINANCE_PATH = "/room/financial-operations";

function text(value) {
  return String(value ?? "").trim();
}
function normalized(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/[’‘\x60]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function positiveId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function minor(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : null;
}

function positiveMinor(value) {
  const amount = minor(value);
  return amount !== null && amount > 0 ? amount : null;
}

function decimal(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function money(value, currencyCode = "TRY") {
  const amount = minor(value);
  if (amount === null) return "belirsiz";
  const code = text(currencyCode).toUpperCase() || "TRY";
  const formatted = (amount / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted + " " + (code === "TRY" ? "TL" : code);
}

function percentage(bps) {
  const value = Number(bps);
  if (!Number.isFinite(value)) return "belirsiz";
  return "%" + (value / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function periodBounds(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: year + "-" + String(month).padStart(2, "0") + "-01",
    end: year + "-" + String(month).padStart(2, "0") + "-" + String(lastDay).padStart(2, "0"),
  };
}

function currentMonthBounds(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) return null;
  return periodBounds(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

function periodLabel(start, end) {
  const value = text(start);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return "belirsiz dönem";
  const date = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime())) return "belirsiz dönem";
  const label = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  if (!end || text(end) === value) return label;
  return label + " (" + value + " – " + text(end) + ")";
}

function samePeriod(leftStart, leftEnd, rightStart, rightEnd) {
  return text(leftStart) === text(rightStart) && text(leftEnd) === text(rightEnd);
}

function factsFrom(screenContext = {}) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : screenContext?.liveFacts && typeof screenContext.liveFacts === "object"
      ? screenContext.liveFacts
      : {};
  return {
    roomId: positiveId(facts.roomId),
    financeView: text(facts.financeView || facts.activeTab).toLowerCase(),
    vehicleId: positiveId(facts.selectedVehicleId || facts.vehicleId),
    vehicleLabel: text(facts.selectedVehicleLabel || facts.selectedVehiclePlate || facts.vehiclePlate || facts.vehicleName || screenContext?.selectedLabel),
    agreementId: positiveId(facts.selectedAgreementId || facts.agreementId),
    shiftId: positiveId(facts.selectedShiftId || facts.shiftId),
    periodStart: text(facts.periodStart || facts.focusPeriodStart) || null,
    periodEnd: text(facts.periodEnd || facts.focusPeriodEnd) || null,
    routeDistanceKm: decimal(facts.routeDistanceKm ?? facts.serviceDistanceKm),
    routeDurationMinutes: decimal(facts.routeDurationMin ?? facts.routeDurationMinutes),
    serviceDayCount: decimal(facts.serviceDayCount),
    tripCount: decimal(facts.tripCount ?? facts.dailyTripCount),
    sourceEntryIds: [...new Set((Array.isArray(facts.sourceEntryIds) ? facts.sourceEntryIds : [])
      .map(positiveId)
      .filter(Boolean))],
    hasExplicitActualCost: Object.prototype.hasOwnProperty.call(facts, "actualCostMinor"),
    actualCostMinor: positiveMinor(facts.actualCostMinor),
  };
}

function questionKind(message, questionIntent) {
  const value = normalized(message);
  if (/(?:gecici\s+gelir.?gider\s+farki.*kesin\s+net\s+kar|kesin\s+(?:net\s+)?kar\s+(?:var\s+mi|hesaplan|hesaplanmadi|hesaplanmiyor|nedir))/u.test(value)) {
    return "NET_PROFIT_STATUS";
  }
  if (/(?:bu\s+arac|bu\s+aracin|bu\s+aracla)[^.!?\n]{0,80}(?:bu\s+ay|ay)[^.!?\n]{0,60}(?:para\s+kazan|kar|zarar|kazanc)/u.test(value)
    || (/(?:bu\s+ay)[^.!?\n]{0,50}(?:arac|aracin)/u.test(value) && /(?:kaz|kar|zarar)/u.test(value))) {
    return "VEHICLE_MONTH";
  }
  if (/(?:bu\s+sozlesme|bu\s+anlasma)[^.!?\n]{0,100}(?:bu\s+ay|ay)[^.!?\n]{0,60}(?:kar|zarar|kazanc|ettim)/u.test(value)
    || questionIntent === "CONTRACT_PROFITABILITY") {
    return "CONTRACT_MONTH";
  }
  if (/(?:yeni\s+(?:bir\s+)?(?:anlasma|sozlesme)|(?:anlasma|sozlesme)[^.!?\n]{0,50}(?:kac|hangi).*(?:fiyat|tl|teklif)|hangi\s+fiyatla\s+(?:anlasma|sozlesme))/u.test(value)
    || /(?:teklif\s+tabani|minimum\s+teklif|hangi\s+fiyat)/u.test(value)
    || /(?:rota|guzergah|mesafe|km)[^.!?\n]{0,60}(?:kac|hangi|yeni\s+fiyat|fiyat\s+ne)[^.!?\n]{0,40}(?:lira|tl|fiyat|teklif)/u.test(value)
    || /(?:yeni\s+fiyat|fiyat\s+ne)[^.!?\n]{0,40}(?:rota|guzergah|mesafe|km)/u.test(value)
    || questionIntent === "OFFER_PROFITABILITY") {
    return "NEW_OFFER";
  }
  if (/(?:kvd|kdv'yi|kdvyi)[^.!?\n]{0,80}(?:kar|kâr|zarar)/u.test(value)
    || /(?:kar|kâr)[^.!?\n]{0,80}(?:hesaplanamiyor|hesaplanamıyor|neden)/u.test(value)
    || /(?:eksik\s+(?:gider|maliyet)|bos\s+kilometre|boş\s+kilometre)[^.!?\n]{0,100}(?:goster|göster|nereden|tamamla|bilgi)/u.test(value)) {
    return questionIntent === "CONTRACT_PROFITABILITY" ? "CONTRACT_MONTH" : "VEHICLE_MONTH";
  }
  return null;
}

export function isRoomFinancialDecisionQuestion({ user = {}, message = "", screenContext = null } = {}) {
  const path = text(screenContext?.path).split("?")[0];
  return text(user?.role).toUpperCase() === "ROOM"
    && path === FINANCE_PATH
    && Boolean(questionKind(message, ""));
}

function blockerLabel(value) {
  const key = text(value).toUpperCase();
  return {
    VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN: "KDV bilgisi veya kesin net kâr kanıtı eksik",
    VAT_DEDUCTIBILITY_NOT_PROVEN: "KDV'nin maliyet etkisi için dayanak eksik",
    VERIFIED_TAX_BASIS_MISSING: "Vergi sonrası tahmin için doğrulanmış vergi girdisi eksik",
    EARNED_REVENUE_CURRENCY_MISSING: "Kazanılmış gelirin para birimi eksik",
    ACTUAL_COST_CURRENCY_MISSING: "Gerçekleşmiş maliyetin para birimi eksik",
    REALIZED_INCOME_LINE_INVALID: "Kazanılmış gelir kaydı geçersiz",
    EARNED_REVENUE_AMOUNT_INVALID: "Kazanılmış gelir tutarı geçersiz",
    AMBIGUOUS_AGREEMENT_VEHICLE: "Sözleşme ve araç bağlantısı belirsiz",
    AMBIGUOUS_AGREEMENT_DRIVER: "Sözleşme ve sürücü bağlantısı belirsiz",
    EARNED_INCOME_VEHICLE_RELATION_AMBIGUOUS: "Kazanılmış gelir ile araç bağlantısı belirsiz",
    EARNED_INCOME_VEHICLE_RELATION_MISSING: "Kazanılmış gelir ile araç bağlantısı eksik",
    SOURCE_OWNER_ALLOCATION_MISMATCH: "Gider sahibi ile dağıtım kaydı uyuşmuyor",
    REALIZED_REVENUE_MISSING: "kazanılmış gelir kanıtı eksik",
    EARNED_REVENUE_EVIDENCE: "kazanılmış gelir kanıtı eksik",
    REALIZED_ACTUAL_COST_EVIDENCE: "gerçekleşmiş maliyet kanıtı eksik",
    COST_ALLOCATION_EVIDENCE_PENDING: "Gider dağıtımı için kanıt bekliyor",
    ACCOUNTING_PERIOD_NOT_CLOSED: "Muhasebe dönemi henüz kapanmadı",
    OPERATIONAL_COVERAGE_NOT_PROVEN: "Tam operasyon kapsamı doğrulanmadı",
    COLLECTION_SCOPE_MISMATCH: "Tahsilat kapsamı dönemle eşleşmiyor",
    PERIOD_COVERAGE_SOURCE_MISSING: "Dönem kapsamı kaynağı eksik",
    SERVIS_VARDIYA_AGREEMENT_MISMATCH: "Servis, vardiya ve sözleşme bağlantısı uyuşmuyor",
    SERVIS_VARDIYA_AGREEMENT_REQUIRED: "Servis, vardiya ve sözleşme bağlantısı gerekli",
    SERVIS_VARDIYA_TENANT_OR_CONTEXT_MISMATCH: "Servis ve seçili hesap bağlamı uyuşmuyor",
    SERVIS_VARDIYA_VEHICLE_MISMATCH: "Servis ve araç bağlantısı uyuşmuyor",
    UNASSIGNED_OR_GENERAL_OVERHEAD: "Henüz servise dağıtılmamış genel gider",
    OTHER_OWNER_OR_UNRELATED_ALLOCATION: "Başka sahiplikte veya bu hizmet kapsamı dışında dağıtım",
    OTHER_OPERATION: "Diğer operasyon kaydı",
    ROOM_OPERATIONAL_FILTER_SCOPE_FORBIDDEN: "Bu finans filtresi operasyon kapsamına uygulanamaz",
    AGREEMENT_NOT_SELECTED: "Sözleşme seçimi eksik",
    NOT_PROVEN: "Henüz doğrulanmadı",
    PROVISIONAL_ACTIVITY_RESULT: "Geçici faaliyet sonucu",
    EXCLUDED_FROM_ROLLUP: "Toplama dahil değil",
    OUT_OF_SCOPE: "Kapsam dışı",
    INSUFFICIENT_DATA: "Yeterli veri yok",
    INCOMPLETE_REFERENCE: "Referans eksik",
    EMPTY_KM_MISSING: "boş kilometre bilgisi eksik",
    FOCUS_PERIOD_REQUIRED: "dönem seçimi eksik",
    PERIOD_REQUIRED: "dönem seçimi eksik",
    MIXED_CURRENCIES: "para birimleri karşılaştırılabilir değil",
  }[key] || text(value);
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function missingText(blockers = [], missing = []) {
  const labels = unique([...blockers, ...missing].map(blockerLabel));
  return labels.length ? labels.join(", ") : "kanıtlanmış bir eksik veri görünmüyor";
}

function actionFor(kind, facts) {
  const params = new URLSearchParams({
    view: kind === "VEHICLE_MONTH" ? "vehicle-comparison" : "quote-profitability",
  });
  if (facts.vehicleId) params.set("focusVehicleId", String(facts.vehicleId));
  if (facts.agreementId) params.set("focusAgreementId", String(facts.agreementId));
  if (facts.periodStart) params.set("focusPeriodStart", facts.periodStart);
  if (facts.periodEnd) params.set("focusPeriodEnd", facts.periodEnd);
  return {
    actionKind: "OPEN_ROUTE",
    label: kind === "NEW_OFFER" ? "Teklif ve Kârlılık kararını aç" : "Finans karar ayrıntısını aç",
    path: FINANCE_PATH + "?" + params.toString(),
    safeNavigation: true,
    criticalActionExecution: false,
    writeAction: false,
  };
}
function securityBlocked() {
  return {
    handled: true,
    status: "SECURITY_BLOCK",
    resultText: "Bu finansal sonuç için yetkili ROOM kapsamı doğrulanamadı; ayrıntı göstermiyorum.",
    reasonText: "Yetkili ROOM tenantı dışında finansal kayıt, tutar veya kaynak bağlantısı gösterilmedi.",
    recommendation: "Yetkili ROOM Finansal Operasyonlar ekranında devam et.",
    evidence: { sourceEntryIds: [], calculationSource: "FAIL_CLOSED", offerSubmissionAllowed: false },
    quickAction: null,
    readOnly: true,
    writeAction: false,
  };
}

function missingSelectionResult({ kind, facts }) {
  const subject = kind === "VEHICLE_MONTH" ? "araç/ay" : "sözleşme/ay";
  return {
    handled: true,
    status: "NOT_PROVEN",
    resultText: subject + " açıklaması için ekranda yetkili seçili kayıt ve dönem kanıtı bulunmuyor; başka bir araç veya sözleşmenin tutarını bu soruya taşımıyorum.",
    reasonText: "Seçili kayıt olmadan server-owned maliyet veya gelir tutarı gösterilmedi; yanlış finansal bağlam riski fail-closed tutuldu.",
    recommendation: kind === "VEHICLE_MONTH"
      ? "Araç Karşılaştır ekranını açıp araç ve ayı seç; sonra aynı soruyu yeniden sor."
      : "Teklif ve Kârlılık ekranını açıp sözleşme ve ayı seç; sonra aynı soruyu yeniden sor.",
    evidence: {
      vehicleId: kind === "VEHICLE_MONTH" ? facts.vehicleId : null,
      agreementId: kind === "CONTRACT_MONTH" ? facts.agreementId : null,
      periodStart: facts.periodStart,
      periodEnd: facts.periodEnd,
      sourceEntryIds: facts.sourceEntryIds,
      calculationSource: "FAIL_CLOSED",
      offerSubmissionAllowed: false,
    },
    quickAction: actionFor(kind, facts),
    readOnly: true,
    writeAction: false,
  };
}

function periodMismatchResult({ requested, actual, facts, kind }) {
  const scope = kind === "VEHICLE_MONTH" && facts.vehicleLabel ? facts.vehicleLabel + " aracı" : "seçili finans kaydı";
  return {
    handled: true,
    status: "NOT_PROVEN",
    resultText: scope + " için “bu ay” isteği " + periodLabel(requested.start, requested.end)
      + " dönemini gerektiriyor; ekrandaki kanıt " + periodLabel(actual.start, actual.end)
      + " dönemine ait. Aralık verisini Ekim cevabı olarak kullanmıyorum ve kâr/zarar hükmü vermiyorum.",
    reasonText: "İstenen dönem ile seçili ekran döneminin eşleşmediği görüldü; başka bir dönemin tutarı taşınmadı.",
    recommendation: "Önce Finansal Operasyonlar ekranında istenen ayı seçip aynı soruyu yeniden sor.",
    evidence: {
      periodStart: actual.start,
      periodEnd: actual.end,
      requestedPeriodStart: requested.start,
      requestedPeriodEnd: requested.end,
      sourceEntryIds: facts.sourceEntryIds,
      calculationSource: "SERVER_OWNED_DECISION_LAYER",
      offerSubmissionAllowed: false,
    },
    quickAction: actionFor(kind, facts),
    readOnly: true,
    writeAction: false,
  };
}

export function buildRoomFinancialDecisionExplanation({
  user = {},
  message = "",
  questionIntent = "",
  screenContext = null,
  decisionLayer = null,
  financePreview = null,
  commercialContext = null,
  routeAdvice = null,
  now = new Date(),
} = {}) {
  const path = text(screenContext?.path).split("?")[0];
  const facts = factsFrom(screenContext);
  const defaultKind = questionKind(message, questionIntent);
  const explicitNewOfferRequest = /(?:yeni\s+(?:bir\s+)?(?:anlaşma|anlasma|sözleşme|sozlesme)|teklif\s+tabanı|minimum\s+teklif|hangi\s+fiyatla\s+(?:anlaşma|anlasma|sözleşme|sozlesme))/iu.test(message);
  const selectedServiceDecisionQuestion = facts.financeView === "service-cost"
    && facts.shiftId
    && facts.agreementId
    && questionIntent === "OFFER_PROFITABILITY"
    && !explicitNewOfferRequest;
  const kind = selectedServiceDecisionQuestion ? "CONTRACT_MONTH" : defaultKind;
  if (!kind || path !== FINANCE_PATH) return null;

  if (text(user?.role).toUpperCase() !== "ROOM" || (facts.roomId && facts.roomId !== positiveId(user?.roomId))) {
    return securityBlocked();
  }

  const vehicleDecision = decisionLayer?.vehicleMonthDecision || {};
  const contractDecision = decisionLayer?.contractMonthDecision || {};
  const offerDecision = decisionLayer?.newOfferDecision || {};
  const actualPeriod = {
    start: text(vehicleDecision.periodStart || contractDecision.periodStart || facts.periodStart) || null,
    end: text(vehicleDecision.periodEnd || contractDecision.periodEnd || facts.periodEnd) || null,
  };
  const requestedPeriod = /\bbu\s+ay\b/iu.test(normalized(message)) ? currentMonthBounds(now) : null;
  if (requestedPeriod && actualPeriod.start && actualPeriod.end
    && !samePeriod(requestedPeriod.start, requestedPeriod.end, actualPeriod.start, actualPeriod.end)) {
    return periodMismatchResult({ requested: requestedPeriod, actual: actualPeriod, facts, kind });
  }
  if (requestedPeriod && (!actualPeriod.start || !actualPeriod.end)) {
    return {
      handled: true,
      status: "NOT_PROVEN",
      resultText: "“Bu ay” sorusu için seçili dönem kanıtı bulunmuyor; başka bir dönemin maliyetini bu aya taşımıyorum.",
      reasonText: "Dönem sınırı doğrulanmadan araç veya sözleşme kârlılığı açıklanmadı.",
      recommendation: "Finansal Operasyonlar ekranında ay başlangıcı ve bitişini seçip yeniden sor.",
      evidence: { sourceEntryIds: facts.sourceEntryIds, calculationSource: "FAIL_CLOSED", offerSubmissionAllowed: false },
      quickAction: actionFor(kind, facts),
      readOnly: true,
      writeAction: false,
    };
  }

  const currencyCode = text(financePreview?.currencyCode || "TRY").toUpperCase();
  const decisionSourceEntryIds = [
    ...(Array.isArray(vehicleDecision.sourceEntryIds) ? vehicleDecision.sourceEntryIds : []),
    ...(Array.isArray(contractDecision.sourceEntryIds) ? contractDecision.sourceEntryIds : []),
    ...(Array.isArray(vehicleDecision.lineage) ? vehicleDecision.lineage.map((row) => row?.entryId) : []),
    ...(Array.isArray(contractDecision.costLineage) ? contractDecision.costLineage.map((row) => row?.entryId) : []),
    ...(Array.isArray(vehicleDecision.costComponents) ? vehicleDecision.costComponents.flatMap((row) => row?.sourceEntryIds || []) : []),
    ...(Array.isArray(contractDecision.costComponents) ? contractDecision.costComponents.flatMap((row) => row?.sourceEntryIds || []) : []),
    ...(Array.isArray(vehicleDecision.vatAdjustedProfitability?.profitabilityEvidence?.actualCostSourceIds)
      ? vehicleDecision.vatAdjustedProfitability.profitabilityEvidence.actualCostSourceIds : []),
    ...(Array.isArray(vehicleDecision.vatAdjustedProfitability?.profitabilityEvidence?.earnedIncomeSourceIds)
      ? vehicleDecision.vatAdjustedProfitability.profitabilityEvidence.earnedIncomeSourceIds : []),
    ...(Array.isArray(contractDecision.vatAdjustedProfitability?.profitabilityEvidence?.actualCostSourceIds)
      ? contractDecision.vatAdjustedProfitability.profitabilityEvidence.actualCostSourceIds : []),
    ...(Array.isArray(contractDecision.vatAdjustedProfitability?.profitabilityEvidence?.earnedIncomeSourceIds)
      ? contractDecision.vatAdjustedProfitability.profitabilityEvidence.earnedIncomeSourceIds : []),
  ].map(positiveId).filter(Boolean);
  const sourceEntryIds = [...new Set([...facts.sourceEntryIds, ...decisionSourceEntryIds])];
  const period = actualPeriod.start ? periodLabel(actualPeriod.start, actualPeriod.end) : "seçili dönem";
  const vehicleLabel = facts.vehicleLabel || "seçili araç";
  const blockers = unique(selectedServiceDecisionQuestion
    ? (Array.isArray(contractDecision.blockers) ? contractDecision.blockers : [])
    : [
      ...(Array.isArray(vehicleDecision.blockers) ? vehicleDecision.blockers : []),
      ...(Array.isArray(contractDecision.blockers) ? contractDecision.blockers : []),
    ]);

  if (kind === "NET_PROFIT_STATUS") {
    return {
      handled: true,
      status: "NOT_PROVEN",
      resultText: "Hayır. Ekrandaki geçici gelir-gider farkı mevcut kayıtların geçici farkıdır; kesin net kâr değildir. Gerekli dönem, vergi ve diğer muhasebe kanıtları tamamlanmadığı için kesin net kâr hesaplanmadı.",
      reasonText: "ROOM Finans ekranındaki geçici fark ile kanıtlanmış kesin net kâr ayrı tutuldu; eksik ekonomik kanıt sıfır veya olumlu sonuç varsayımıyla tamamlanmadı.",
      recommendation: "Kesin net kâr iddiası yerine kaynak ve dönem kanıtlarını Finansal Operasyonlar ekranında tamamla.",
      evidence: {
        confirmedNetProfitMinor: null,
        sourceEntryIds,
        blockers,
        calculationSource: "SERVER_OWNED_DECISION_LAYER",
        offerSubmissionAllowed: false,
      },
      quickAction: null,
      readOnly: true,
      writeAction: false,
    };
  }

  if (kind === "VEHICLE_MONTH") {
    if (!facts.vehicleId && !positiveId(vehicleDecision.vehicleId)) {
      return missingSelectionResult({ kind, facts });
    }
    const actualCost = facts.hasExplicitActualCost
      ? facts.actualCostMinor
      : [
        vehicleDecision.distributedActualCostMinor,
        vehicleDecision.grossActualCostMinor,
        financePreview?.roomProfitability?.actualOperationalCostMinor,
      ]
        .map(positiveMinor)
        .find((value) => value !== null) ?? null;
    const earnedRevenue = minor(vehicleDecision.earnedRevenueMinor);
    const activityResult = minor(vehicleDecision.activityResultMinor);
    const vatProfitability = vehicleDecision.vatAdjustedProfitability || null;
    const vatAdjustedProfit = minor(vatProfitability?.vatAdjustedOperatingProfitMinor);
    const afterTaxProfit = minor(vatProfitability?.estimatedAfterTaxNetProfitMinor);
    const resultText = vatAdjustedProfit !== null
      ? vehicleLabel + " için " + period + " döneminde KDV ayrıştırılmış faaliyet kârı " + money(vatAdjustedProfit, currencyCode)
        + ". Vergi sonrası tahmini net kâr " + (afterTaxProfit === null ? "hesaplanamadı" : money(afterTaxProfit, currencyCode)) + "."
      : earnedRevenue !== null && activityResult !== null
      ? vehicleLabel + " için " + period + " döneminde kazanılmış gelir " + money(earnedRevenue, currencyCode)
        + ", dağıtılmış gerçekleşmiş maliyet " + money(actualCost, currencyCode)
        + " ve geçici faaliyet sonucu " + money(activityResult, currencyCode) + ". Bu sonuç kesin net kâr değildir."
      : actualCost !== null
      ? vehicleLabel + " için " + period + " döneminde dağıtılmış gerçekleşmiş maliyet " + money(actualCost, currencyCode)
        + ". Kazanılmış gelir kanıtı bulunmadığı için bu aracın para kazandırdığı veya zarar ettirdiği hükmünü vermiyorum."
      : vehicleLabel + " için " + period + " döneminde gerçekleşmiş maliyet kanıtı bulunamadı. Planlama maliyeti gerçekleşmiş gider olarak gösterilmiyor; bu aracın para kazandırdığı veya zarar ettirdiği hükmünü vermiyorum.";
    return {
      handled: true,
      status: vatAdjustedProfit !== null || (earnedRevenue !== null && activityResult !== null) ? "PROVISIONAL_ACTIVITY_RESULT" : "NOT_PROVEN",
      resultText,
      reasonText: "Araç/ay sonucu seçili dönem, araç bağlamı ve server-owned karar çıktısından okunuyor. "
        + missingText(blockers, earnedRevenue === null ? ["EARNED_REVENUE_EVIDENCE"] : []) + ".",
      recommendation: earnedRevenue !== null && activityResult !== null
        ? "Kesin net kâr için KDV, dönem kapanışı ve diğer muhasebe kanıtlarını ayrıca doğrula."
        : "Kazanılmış gelir ve eksik maliyet kanıtlarını Finansal Operasyonlar ekranında tamamla.",
      evidence: {
        vehicleId: facts.vehicleId,
        vehicleLabel,
        periodStart: actualPeriod.start,
        periodEnd: actualPeriod.end,
        distributedActualCostMinor: actualCost,
        earnedRevenueMinor: earnedRevenue,
        activityResultMinor: activityResult,
        vatAdjustedOperatingProfitMinor: vatAdjustedProfit,
        estimatedAfterTaxNetProfitMinor: afterTaxProfit,
        vatProfitability: vatProfitability?.profitabilityEvidence || null,
        sourceEntryIds,
        calculationSource: "SERVER_OWNED_DECISION_LAYER",
        offerSubmissionAllowed: false,
      },
      quickAction: actionFor(kind, facts),
      readOnly: true,
      writeAction: false,
    };
  }

  if (kind === "CONTRACT_MONTH") {
    const agreementId = positiveId(contractDecision.agreementId || facts.agreementId || commercialContext?.id);
    if (!agreementId) {
      return missingSelectionResult({ kind, facts });
    }
    const contractTotal = minor(contractDecision.contractTotalMinor
      ?? commercialContext?.roomOfferAmount
      ?? commercialContext?.companyOfferAmount);
    const earnedRevenue = minor(contractDecision.earnedRevenueMinor);
    const actualCost = minor(contractDecision.realizedActualCostMinor);
    const plannedCost = minor(contractDecision.plannedCostMinor);
    const collected = minor(contractDecision.collectedCashMinor);
    const vatProfitability = contractDecision.vatAdjustedProfitability || null;
    const vatAdjustedProfit = minor(vatProfitability?.vatAdjustedOperatingProfitMinor);
    const afterTaxProfit = minor(vatProfitability?.estimatedAfterTaxNetProfitMinor);
    const resultText = vatAdjustedProfit !== null
      ? "Sözleşme #" + (agreementId || "?") + " için " + period + " döneminde KDV ayrıştırılmış faaliyet kârı " + money(vatAdjustedProfit, currencyCode)
        + ". Vergi sonrası tahmini net kâr " + (afterTaxProfit === null ? "hesaplanamadı" : money(afterTaxProfit, currencyCode)) + "."
      : earnedRevenue !== null && actualCost !== null
      ? "Sözleşme #" + (agreementId || "?") + " için " + period + " döneminde kazanılmış gelir " + money(earnedRevenue, currencyCode)
        + ", gerçekleşmiş maliyet " + money(actualCost, currencyCode)
        + ". Bu geçici faaliyet sonucudur; kesin net kâr değildir. Tahsilat " + (collected === null ? "belirsiz" : money(collected, currencyCode))
        + " ve PLAN maliyeti " + (plannedCost === null ? "belirsiz" : money(plannedCost, currencyCode)) + " ayrı tutulur."
      : "Sözleşme #" + (agreementId || "?") + " için sözleşme toplamı " + money(contractTotal, currencyCode)
        + "; bu tutar " + period + " döneminin kazanılmış geliri değildir. Kazanılmış gelir ve karşılaştırılabilir gerçekleşmiş maliyet kanıtı eksik olduğu için bu ay kâr/zarar hükmü vermiyorum.";
    return {
      handled: true,
      status: vatAdjustedProfit !== null || (earnedRevenue !== null && actualCost !== null) ? "PROVISIONAL_ACTIVITY_RESULT" : "NOT_PROVEN",
      resultText,
      reasonText: "Sözleşme toplamı, kazanılmış gelir, gerçekleşmiş maliyet, PLAN maliyeti ve tahsilat birbirinden ayrıldı. "
        + missingText(blockers, earnedRevenue === null || actualCost === null ? ["EARNED_REVENUE_EVIDENCE"] : []) + ".",
      recommendation: earnedRevenue !== null && actualCost !== null
        ? "Bu geçici sonucu kesin net kâr olarak kullanmadan KDV ve dönem kapanış kanıtlarını doğrula."
        : "Sözleşmenin ilgili dönemini ve kazanılmış gelir/gerçekleşmiş maliyet kanıtlarını Finansal Operasyonlar ekranında tamamla.",
      evidence: {
        agreementId,
        periodStart: actualPeriod.start,
        periodEnd: actualPeriod.end,
        contractTotalMinor: contractTotal,
        earnedRevenueMinor: earnedRevenue,
        realizedActualCostMinor: actualCost,
        plannedCostMinor: plannedCost,
        collectedCashMinor: collected,
        vatAdjustedOperatingProfitMinor: vatAdjustedProfit,
        estimatedAfterTaxNetProfitMinor: afterTaxProfit,
        vatProfitability: vatProfitability?.profitabilityEvidence || null,
        sourceEntryIds,
        calculationSource: "SERVER_OWNED_DECISION_LAYER",
        offerSubmissionAllowed: false,
      },
      quickAction: actionFor(kind, facts),
      readOnly: true,
      writeAction: false,
    };
  }

  const quoteFloor = minor(offerDecision.quoteFloorMinor ?? financePreview?.quoteFloor?.quoteFloorMinor);
  const baselineCost = minor(offerDecision.baselineOperationalCostMinor ?? financePreview?.quoteFloor?.baselineOperationalCostMinor);
  const confirmedGrossCost = facts.hasExplicitActualCost
    ? facts.actualCostMinor
    : positiveMinor(
      financePreview?.roomProfitability?.actualOperationalCostMinor
        ?? offerDecision.distributedActualCostMinor
        ?? offerDecision.grossActualCostMinor
        ?? vehicleDecision.distributedActualCostMinor
        ?? vehicleDecision.grossActualCostMinor
        ?? contractDecision.realizedActualCostMinor
        ?? null,
    );
  const confirmedGrossCostText = confirmedGrossCost === null
    ? ""
    : ` Seçili vardiyanın doğrulanmış brüt gerçekleşen maliyeti ${money(confirmedGrossCost, currencyCode)}; bu tutar kesin net kâr değildir.`;
  const riskAdjusted = minor(offerDecision.riskAdjustedCostMinor);
  const targetContributionBps = offerDecision.targetContributionBps ?? financePreview?.quoteFloor?.targetContributionBps ?? null;
  const riskReserveBps = offerDecision.riskReserveBps ?? financePreview?.quoteFloor?.riskReserveBps ?? null;
  const scenarioOffer = minor(offerDecision.scenarioOfferMinor);
  const scenarioResult = minor(offerDecision.scenarioActivityResultMinor);
  const offerReady = text(offerDecision.status || "").toUpperCase() === "READY_FOR_REVIEW" || quoteFloor !== null;
  const routeComponentText = Array.isArray(routeAdvice?.scenarioCostComponents)
    ? routeAdvice.scenarioCostComponents
      .filter((item) => minor(item?.amountMinor) !== null && minor(item?.amountMinor) > 0)
      .map((item) => `${text(item?.labelTr) || "Maliyet kalemi"} ${money(item.amountMinor, currencyCode)}`)
      .join("; ")
    : "";
  const routeAssumptionText = routeAdvice?.independent === true
    ? [
      routeAdvice.vehicleLabel ? `araç ${text(routeAdvice.vehicleLabel)}` : "",
      routeAdvice.passengerCount !== null && routeAdvice.passengerCount !== undefined ? `${routeAdvice.passengerCount} kişi` : "",
      routeAdvice.shiftCount !== null && routeAdvice.shiftCount !== undefined ? `günde ${routeAdvice.shiftCount} hareket` : "",
      routeAdvice.routeDistanceKm !== null && routeAdvice.routeDistanceKm !== undefined ? `günlük hizmet mesafesi ${routeAdvice.routeDistanceKm} km` : "",
      routeAdvice.emptyDistanceKm !== null && routeAdvice.emptyDistanceKm !== undefined ? `boş kilometre ${routeAdvice.emptyDistanceKm} km` : "",
      routeAdvice.serviceDayCount !== null && routeAdvice.serviceDayCount !== undefined ? `${routeAdvice.serviceDayCount} hizmet günü` : "",
    ].filter(Boolean).join(", ")
    : "";
  const routeDetailText = routeAdvice?.independent === true
    ? `${routeComponentText ? ` Ana kalemler: ${routeComponentText}.` : ""}${routeAssumptionText ? ` Varsayımlar: ${routeAssumptionText}.` : ""}${routeAdvice.confidenceText ? ` Güven seviyesi: ${text(routeAdvice.confidenceText)}.` : ""}${routeAdvice.economicReliabilityText ? ` Ekonomik güvenilirlik: ${text(routeAdvice.economicReliabilityText)}` : ""} Bu tahmini planlama maliyetidir; gerçekleşmiş gider ve kesin net kâr değildir.`
    : "";
  const routeAdvicePrefix = routeAdvice?.independent === true
    ? `Güncel rota için geçmiş anlaşma fiyatı kullanılmadı${(routeAdvice.routeDistanceKm ?? facts.routeDistanceKm) !== null ? `; günlük rota ${routeAdvice.routeDistanceKm ?? facts.routeDistanceKm} km` : ""}${routeAdvice.routeTotalDistanceKm !== null && routeAdvice.routeTotalDistanceKm !== undefined ? `, dönem toplamı ${routeAdvice.routeTotalDistanceKm} km` : ""}${routeAdvice.serviceDayCount !== null && routeAdvice.serviceDayCount !== undefined ? `, ${routeAdvice.serviceDayCount} hizmet günü` : ""}. `
    : "";
  const resultText = offerReady && quoteFloor !== null
    ? routeAdvicePrefix + "Yeni anlaşma için kanonik teklif tabanı " + money(quoteFloor, currencyCode)
      + ". Maliyet tabanı " + money(baselineCost, currencyCode)
      + ", risk düzeltilmiş maliyet " + money(riskAdjusted, currencyCode)
      + ", hedef katkı " + percentage(targetContributionBps)
      + " ve risk rezervi " + percentage(riskReserveBps) + ". "
      + (scenarioOffer !== null && scenarioResult !== null
        ? money(scenarioOffer, currencyCode) + " senaryosunun geçici faaliyet sonucu " + money(scenarioResult, currencyCode) + "."
        : "Senaryo teklif tutarı ayrıca girilmedi.")
      + routeDetailText + " Teklif gönderimi yapılmıyor."
    : routeAdvice?.independent === true
      ? routeAdvicePrefix + "Bu rota için doğrulanabilir tam maliyet ve teklif tabanı oluşmadı; "
        + (routeAdvice.missingCostQuestion || "eksik kritik girdiyi tamamlamadan fiyat uydurmuyorum.")
      : confirmedGrossCostText + " Yeni anlaşma teklif tabanı için doğrulanabilir maliyet, hedef katkı veya risk girdisi bulunmadı; fiyat uydurmuyorum.";
  return {
    handled: true,
    status: offerReady && quoteFloor !== null ? "READY_FOR_REVIEW" : "NOT_PROVEN",
    resultText,
    reasonText: `${routeAdvice?.independent === true ? "Güncel rota senaryosu mevcut canonical maliyet önizlemesiyle yeniden değerlendirildi; geçmiş anlaşma zorunlu tutulmadı. " : ""}Teklif tabanı mevcut ROOM kârlılık/teklif preview çıktısından okunuyor; açıklama katmanı yeniden hesaplama yapmıyor. PLAN ve gerçekleşmiş maliyet aynı kalem gibi birleştirilmiyor.`,
    recommendation: offerReady && quoteFloor !== null
      ? "Teklif tabanını kullanıcı olarak gözden geçir; teklif gönderimi ve sözleşme değişikliği bu salt-okunur yanıtta kapalıdır."
      : "Eksik rota, maliyet, hedef katkı veya risk girdisini yetkili Finansal Operasyonlar ekranında tamamla.",
    evidence: {
      periodStart: actualPeriod.start,
      periodEnd: actualPeriod.end,
      baselineOperationalCostMinor: baselineCost,
      riskAdjustedCostMinor: riskAdjusted,
      targetContributionBps,
      riskReserveBps,
      quoteFloorMinor: quoteFloor,
      scenarioOfferMinor: scenarioOffer,
      scenarioActivityResultMinor: scenarioResult,
      independentRouteQuoteAdvice: routeAdvice?.independent === true,
      routeDistanceKm: routeAdvice?.routeDistanceKm ?? facts.routeDistanceKm,
      routeDurationMinutes: routeAdvice?.routeDurationMinutes ?? facts.routeDurationMinutes,
      scenarioStatus: routeAdvice?.scenarioStatus || null,
      scenarioCostCoverage: routeAdvice?.scenarioCostCoverage || null,
      sourceEntryIds,
      calculationSource: "SERVER_OWNED_DECISION_LAYER",
      offerSubmissionAllowed: false,
    },
    quickAction: actionFor(kind, facts),
    readOnly: true,
    writeAction: false,
  };
}
