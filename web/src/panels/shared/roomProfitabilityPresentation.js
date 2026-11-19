import { financeUserFacingText } from "./financeUserFacingLabels.js";

function finiteMinor(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function resultToneForMinor(value) {
  const numeric = finiteMinor(value);
  if (numeric == null) return "danger";
  return numeric >= 0 ? "good" : "danger";
}

export function scenarioVariantDecisionDisplay({ variant = null, costCoverageStatus = "" } = {}) {
  const complete = String(costCoverageStatus || "").toUpperCase() === "COMPLETE";
  if (!variant || !complete || variant.estimatedCost === null || variant.estimatedCost === undefined) {
    return {
      estimatedCost: null,
      rationale: "Eksik maliyet kanıtı nedeniyle en uygun plan sıralaması yayımlanmadı.",
      tone: "warm",
    };
  }
  return {
    estimatedCost: variant.estimatedCost,
    rationale: variant.rationale || "Tam maliyet kanıtıyla karşılaştırıldı.",
    tone: "good",
  };
}

const DECISION_STATUS_LABELS = Object.freeze({
  READY_FOR_REVIEW: "İnceleme için hazır",
  PROVISIONAL_ACTIVITY_RESULT: "Geçici faaliyet sonucu",
  NOT_PROVEN: "Kesinleştirilemedi",
  PERIOD_REQUIRED: "Dönem ve kayıt seçimi bekleniyor",
});

const DECISION_CATEGORY_LABELS = Object.freeze({
  FUEL: "Yakıt",
  DRIVER: "Sürücü",
  MAINTENANCE: "Bakım",
  REPAIR: "Onarım",
  TIRES: "Lastik",
  INSURANCE: "Sigorta",
  TAX: "Vergi",
  VEHICLE_LEASE: "Araç kirası",
  ROUTE_FEE: "Rota gideri",
  SERVICE_DIRECT: "Servis gideri",
  OPERATIONS_OVERHEAD: "Operasyon genel gideri",
  OTHER_OPERATION: "Diğer operasyon gideri",
});

const DECISION_MISSING_LABELS = Object.freeze({
  vehicleId: "Araç seçimi",
  focusVehicleId: "Araç seçimi",
  focusAgreementId: "Sözleşme seçimi",
  periodStart: "Dönem başlangıcı",
  periodEnd: "Dönem bitişi",
  "periodStart/periodEnd": "Dönem başlangıcı ve bitişi",
  focusPeriodStart: "Dönem başlangıcı",
  focusPeriodEnd: "Dönem bitişi",
  vehicleMonthServiceEvidence: "Araçla ilişkili hizmet kaydı",
  "vehicleId/driverId": "Araç veya sürücü seçimi",
  earnedIncomeEvidence: "Kazanılmış dönem geliri",
  earnedRevenueEvidence: "Kazanılmış dönem geliri",
  realizedActualCostEvidence: "Gerçekleşmiş gider kanıtı",
  actualCostEvidence: "Gerçekleşmiş gider kanıtı",
  actualCostCurrency: "Gerçekleşmiş gider para birimi",
  operationalCoverage: "Aylık çalışma kapsamı",
  emptyDistanceKm: "Boş kilometre bilgisi",
  manualBaselineOperationalCostMinor: "Maliyet tabanı",
  targetContributionBps: "Hedef katkı marjı",
  riskReserveBps: "Risk payı",
});

const DECISION_BLOCKER_LABELS = Object.freeze({
  VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN: "KDV durumu bilinmiyor; kesin net kâr doğrulanmadı",
  VAT_UNKNOWN_NET_ROLLUP: "KDV durumu bilinmiyor; net toplam belirsiz",
  MIXED_CURRENCIES: "Birden fazla para birimi var; ortak toplam doğrulanmadı",
  COST_ALLOCATION_EVIDENCE_PENDING: "Gider dağıtım kanıtı bekliyor",
  ACCOUNTING_PERIOD_NOT_CLOSED: "Muhasebe dönemi açık; kesin net kâr için dönem kapanışı bekleniyor",
  SOURCE_OWNER_ALLOCATION_MISMATCH: "Gider sahibi ile dağıtım kaydı eşleşmiyor",
  EARNED_INCOME_VEHICLE_RELATION_AMBIGUOUS: "Kazanılmış gelir birden fazla araçla ilişkili",
  AMBIGUOUS_AGREEMENT_DRIVER: "Kazanılmış gelir birden fazla sürücüyle ilişkili",
  EARNED_INCOME_VEHICLE_RELATION_MISSING: "Kazanılmış gelirin araç ilişkisi eksik",
  ACTUAL_COST_CURRENCY_MISSING: "Gerçekleşmiş giderin para birimi eksik",
  OPERATIONAL_COVERAGE_NOT_PROVEN: "Aylık çalışma kapsamı doğrulanmadı; kalan süre boş kabul edilmedi",
});

const PERIOD_PLANNING_MISSING_LABELS = Object.freeze({
  "Doğrulanmış boş kilometre bilgisi": "Boş kilometre bilgisi",
  "Doğrulanmış rota şablonu": "Doğrulanmış rota",
  "Tekrarlanan hizmet günleri için tek rota şablonu": "Tekrarlanan günler için rota şablonu",
  "Sürücü planlama maliyeti": "Sürücü planlama maliyeti",
  "Araç dönem maliyeti": "Araç dönem maliyeti",
  "Planlanan araç": "Planlanan araç",
  "Planlanan sürücü": "Planlanan sürücü",
  "Hizmet dönemi ve sıklığı": "Hizmet dönemi ve sıklığı",
  "Günlük hizmet saati": "Günlük hizmet saati",
  manualBaselineOperationalCostMinor: "Maliyet tabanı",
  targetContributionBps: "Hedef katkı varsayımı",
  riskReserveBps: "Risk payı varsayımı",
});

const ACCOUNTING_PERIOD_STATUS_LABELS = Object.freeze({
  OPEN: "Açık",
  REVIEW: "İncelemede",
  READY_TO_CLOSE: "Kapanış hazırlığı hazır",
  CLOSED: "Kapalı",
  REOPEN_REQUESTED: "Yeniden açma talebi",
  REOPENED: "Yeniden açıldı",
});

const ACCOUNTING_PERIOD_BLOCKER_LABELS = Object.freeze({
  VAT_UNKNOWN: "KDV sınıflandırması bekliyor",
  MIXED_CURRENCIES: "Para birimleri mutabakatı bekliyor",
  COST_ALLOCATION_PENDING: "Gider dağıtım kanıtı bekliyor",
  ACCRUAL_RECONCILIATION_REQUIRED: "Tahakkuk mahsup bağlantısı bekliyor",
  INCOME_EVIDENCE_MISSING: "Kazanılmış gelir kanıtı bekliyor",
});

export function accountingPeriodStatusLabel(value) {
  const key = String(value || "OPEN").trim().toUpperCase();
  return ACCOUNTING_PERIOD_STATUS_LABELS[key] || "Açık";
}

export function accountingPeriodBlockerLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  return ACCOUNTING_PERIOD_BLOCKER_LABELS[key] || "Ek muhasebe kanıtı bekliyor";
}

function decisionList(value) {
  return Array.isArray(value) ? value : [];
}

function decisionLabel(value, labels, fallback = "Ek doğrulama gerekiyor") {
  const key = String(value || "").trim();
  return labels[key] || financeUserFacingText(key, fallback) || fallback;
}

function decisionStatusLabel(status) {
  return decisionLabel(String(status || "").toUpperCase(), DECISION_STATUS_LABELS, "Durum doğrulanıyor");
}

function decisionCategoryLabel(categoryKey) {
  const key = String(categoryKey || "OTHER_OPERATION").trim().toUpperCase();
  return DECISION_CATEGORY_LABELS[key] || "Diğer operasyon gideri";
}

function decisionComponents(value) {
  return decisionList(value).map((component) => ({
    label: decisionCategoryLabel(component?.categoryKey),
    amountMinor: finiteMinor(component?.amountMinor),
    distributedAmountMinor: finiteMinor(component?.distributedAmountMinor),
    pendingAmountMinor: finiteMinor(component?.pendingAmountMinor),
    sourceCount: decisionList(component?.sourceEntryIds).length,
  }));
}

function decisionMissing(value) {
  return decisionList(value).map((item) => decisionLabel(item, DECISION_MISSING_LABELS));
}

function decisionBlockers(value) {
  return decisionList(value).map((item) => decisionLabel(item, DECISION_BLOCKER_LABELS));
}

function normalizeOperationalCoverage(value) {
  if (!value || typeof value !== "object") return null;
  const status = String(value.status || "UNKNOWN").trim().toUpperCase();
  return {
    status,
    statusLabel: status === "COMPLETE"
      ? "Dönemin tamamı doğrulandı"
      : status === "PARTIAL"
        ? "Dönem kısmen doğrulandı"
        : "Dönemin tamamı doğrulanmadı",
    verifiedUsageMinutes: finiteMinor(value.verifiedUsageMinutes),
    verifiedIdleMinutes: finiteMinor(value.verifiedIdleMinutes),
    unknownScope: value.unknownScope !== false,
    coverageComplete: value.coverageComplete === true,
  };
}

function selectedDriverOperationalCoverage(source) {
  const operationalCoverage = source?.operationalCoverage;
  const drivers = decisionList(operationalCoverage?.drivers);
  if (!drivers.length) return null;
  const selectedDriverId = finiteMinor(source?.driverId);
  const matchingDriver = selectedDriverId == null
    ? (drivers.length === 1 ? drivers[0] : null)
    : drivers.find((item) => Number(item?.subjectId || 0) === Number(selectedDriverId));
  return normalizeOperationalCoverage(matchingDriver);
}

function incomeLineHasExplicitVehicleEvidence(line, source) {
  const selectedVehicleId = finiteMinor(source?.vehicleId);
  if (selectedVehicleId == null) return true;
  const explicitVehicleIds = [
    line?.vehicleId,
    line?.assignedVehicleId,
    line?.vehicle?.id,
    line?.assignment?.vehicleId,
    line?.shift?.vehicleId,
  ].map(finiteMinor).filter((value) => value != null);
  if (explicitVehicleIds.some((value) => value === selectedVehicleId)) return true;
  const lineShiftId = finiteMinor(line?.shiftId);
  return lineShiftId != null
    && decisionList(source?.shiftIds).some((value) => Number(value) === lineShiftId);
}

function vehicleIncomeAttributionStatus(source) {
  const selectedVehicleId = finiteMinor(source?.vehicleId);
  const scopedVehicleIds = decisionList(source?.vehicleIds)
    .map(finiteMinor)
    .filter((value) => value != null);
  const effectiveVehicleId = selectedVehicleId ?? (scopedVehicleIds.length === 1 ? scopedVehicleIds[0] : null);
  if (effectiveVehicleId == null) return "NOT_PROVEN";
  const scopedSource = selectedVehicleId == null ? { ...source, vehicleId: effectiveVehicleId } : source;
  const lines = decisionList(source?.incomeEvidence?.lines ?? source?.incomeEvidence);
  const countedLines = lines.filter((line) => line?.counted !== false);
  if (!countedLines.length) return "NOT_PROVEN";
  return countedLines.every((line) => incomeLineHasExplicitVehicleEvidence(line, scopedSource))
    ? "PROVEN"
    : "NOT_PROVEN";
}

function normalizeDecision(decision, kind, { requireVehicleIncomeAttribution = false } = {}) {
  const source = decision && typeof decision === "object" ? decision : {};
  const status = String(source.status || "").toUpperCase();
  const incomeAttributionStatus = kind === "vehicle-month" && requireVehicleIncomeAttribution
    ? vehicleIncomeAttributionStatus(source)
    : "NOT_APPLICABLE";
  const vehicleIncomeNotProven = kind === "vehicle-month"
    && requireVehicleIncomeAttribution
    && incomeAttributionStatus === "NOT_PROVEN"
    && (finiteMinor(source.earnedIncomeMinor ?? source.earnedRevenueMinor) != null
      || decisionList(source.incomeEvidence?.lines ?? source.incomeEvidence).length > 0);
  const blockerKeys = [
    ...decisionList(source.blockers),
    ...(vehicleIncomeNotProven ? ["EARNED_INCOME_VEHICLE_RELATION_MISSING"] : []),
  ];
  return {
    kind,
    status: vehicleIncomeNotProven ? "NOT_PROVEN" : status,
    statusLabel: decisionStatusLabel(vehicleIncomeNotProven ? "NOT_PROVEN" : status),
    vehicleId: finiteMinor(source.vehicleId),
    driverId: finiteMinor(source.driverId),
    vehicleIds: decisionList(source.vehicleIds),
    driverIds: decisionList(source.driverIds),
    shiftIds: decisionList(source.shiftIds),
    agreementIds: decisionList(source.agreementIds),
    realizedOnly: source.realizedOnly === true,
    realizedShiftCount: finiteMinor(source.realizedShiftCount),
    verifiedUsageMinutes: finiteMinor(source.verifiedUsageMinutes),
    verifiedDistanceM: finiteMinor(source.verifiedDistanceM),
    customerIds: decisionList(source.customerIds),
    customerLabels: decisionList(source.customerLabels).map((item) => ({
      id: finiteMinor(item?.id),
      name: String(item?.name || "").trim(),
    })).filter((item) => item.name),
    earnedIncomeMinor: vehicleIncomeNotProven ? null : finiteMinor(source.earnedIncomeMinor ?? source.earnedRevenueMinor),
    earnedRevenueMinor: vehicleIncomeNotProven ? null : finiteMinor(source.earnedRevenueMinor ?? source.earnedIncomeMinor),
    grossActualCostMinor: finiteMinor(source.grossActualCostMinor ?? source.realizedActualCostMinor),
    distributedActualCostMinor: finiteMinor(source.distributedActualCostMinor),
    activityResultMinor: vehicleIncomeNotProven ? null : finiteMinor(source.activityResultMinor),
    confirmedNetProfitMinor: vehicleIncomeNotProven ? null : finiteMinor(source.confirmedNetProfitMinor),
    contractTotalMinor: finiteMinor(source.contractTotalMinor),
    plannedCostMinor: finiteMinor(source.plannedCostMinor),
    collectedCashMinor: finiteMinor(source.collectedCashMinor),
    receivableMinor: finiteMinor(source.receivableMinor),
    costComponents: decisionComponents(source.costComponents),
    operationalCoverage: normalizeOperationalCoverage(
      source.operationalCoverage?.primary
        || source.operationalCoverage?.vehicle
        || source.operationalCoverage,
    ),
    driverOperationalCoverage: selectedDriverOperationalCoverage(source),
    missingLabels: decisionMissing(source.missing || source.missingFields),
    blockerLabels: decisionBlockers(blockerKeys),
    incomeAttributionStatus,
    readOnly: source.readOnly === true,
    previewOnly: source.previewOnly === true,
    writeAction: source.writeAction === true,
  };
}

/**
 * Converts server-owned decision fields to safe Turkish UI data. Null values
 * stay null so the UI cannot turn missing revenue or evidence into zero.
 */
export function buildRoomDecisionLayerDisplay({
  vehicleMonthDecision = null,
  contractMonthDecision = null,
  newOfferDecision = null,
  requireVehicleIncomeAttribution = true,
} = {}) {
  const offer = newOfferDecision && typeof newOfferDecision === "object"
    ? newOfferDecision
    : {};
  const offerStatus = String(offer.status || "").toUpperCase();
  const offerMissingLabels = decisionMissing(offer.missingFields || offer.missing);
  const offerBaselineSource = String(offer.baselineSource || "").trim().toUpperCase().replace(/[- ]+/g, "_");
  const offerQuoteFloorDefinitive = offer.computed === true
    && offerMissingLabels.length === 0
    && ["CANONICAL_PERIOD_PLAN", "ROOM_COST_LEDGER_ACTUAL", "ACTUAL_LEDGER", "COMPLETE", "READY"].includes(offerBaselineSource);
  return {
    vehicle: normalizeDecision(vehicleMonthDecision, "vehicle-month", { requireVehicleIncomeAttribution }),
    contract: normalizeDecision(contractMonthDecision, "contract-month"),
    offer: {
      kind: "new-offer",
      status: offerStatus,
      computed: offer.computed === true,
      baselineSource: offer.baselineSource || null,
      quoteFloorDefinitive: offerQuoteFloorDefinitive,
      statusLabel: decisionStatusLabel(offerStatus),
      riskAdjustedCostMinor: finiteMinor(offer.riskAdjustedCostMinor),
      quoteFloorMinor: finiteMinor(offer.quoteFloorMinor),
      scenarioOfferMinor: finiteMinor(offer.scenarioOfferMinor),
      scenarioActivityResultMinor: finiteMinor(offer.scenarioActivityResultMinor),
      scenarioContributionMarginBps: finiteMinor(offer.scenarioContributionMarginBps),
      targetContributionBps: finiteMinor(offer.targetContributionBps),
      riskReserveBps: finiteMinor(offer.riskReserveBps),
      missingLabels: offerMissingLabels,
      blockerLabels: decisionBlockers(offer.blockers),
      marginBasisLabel: "Hedef katkı marjı (teklif fiyatının yüzdesi)",
      scenarioOfferLabel: "Senaryo teklif tutarı",
      scenarioOfferNote: "Bu önizleme için girilen tutar",
      scenarioResultLabel: "Maliyet sonrası fark (hedef/risk öncesi)",
      scenarioResultNote: "Teklif − temel tahmini maliyet; kesin net kâr değildir",
      quoteFloorNote: offerQuoteFloorDefinitive
        ? "Risk ayarlı maliyet + hedef katkı; teklif gönderimi yok"
        : "Kısmi planlama önizlemesi; tam ekonomik kanıt yok, kesin teklif tabanı değildir",
      planningGainNote: "Teklif − hedef katkı ve risk payı içeren planlama tabanı",
      offerSubmissionLabel: offer.offerSubmissionAllowed === true ? "Yetkili kullanıcı onayı bekliyor" : "Teklif gönderimi yok",
      readOnly: offer.readOnly === true,
      previewOnly: offer.previewOnly === true,
      writeAction: offer.writeAction === true,
    },
  };
}

export function buildPeriodPlanningDisplay({
  periodPlanning = null,
  selectedShiftQuoteFloorMinor = null,
} = {}) {
  const source = periodPlanning && typeof periodPlanning === "object" ? periodPlanning : {};
  const missing = Array.isArray(source.missing)
    ? source.missing
    : periodPlanning
      ? []
      : ["Araç dönem maliyeti"];
  return {
    status: String(source.status || "NOT_PROVEN").toUpperCase(),
    statusLabel: source.comparisonAllowed === true
      ? "Dönem planı hesaplanabilir"
      : source.periodCostReady === true
        ? "Dönem maliyeti hesaplandı; teklif varsayımları bekleniyor"
      : "Hizmet döneminin tamamı için maliyet henüz hesaplanamadı",
    comparisonAllowed: source.comparisonAllowed === true,
    periodCostReady: source.periodCostReady === true,
    periodStart: source.periodStart || null,
    periodEnd: source.periodEnd || null,
    scheduledServiceDayCount: finiteMinor(source.scheduledServiceDayCount),
    plannedMovementCount: finiteMinor(source.plannedMovementCount),
    observedLinkedShiftCount: finiteMinor(source.observedLinkedShiftCount),
    selectedShiftQuoteFloorMinor: finiteMinor(selectedShiftQuoteFloorMinor),
    knownRoutePlanningCostMinor: finiteMinor(source.knownRoutePlanningCostMinor),
    periodPlanningCostMinor: finiteMinor(source.periodPlanningCostMinor),
    periodQuoteFloorMinor: finiteMinor(source.periodQuoteFloorMinor),
    periodExpectedGainMinor: finiteMinor(source.periodExpectedGainMinor),
    missingLabels: missing.map((item) => PERIOD_PLANNING_MISSING_LABELS[item] || "Ek dönem maliyet kanıtı"),
    assumptions: Array.isArray(source.assumptions) ? source.assumptions.map((item) => String(item || "").trim()).filter(Boolean) : [],
  };
}

/**
 * A selected vehicle scenario owns its own planning context. The generic
 * preview period must not be used as a fallback for that scenario: it may
 * describe a different scope and turn an unknown amount into a misleading
 * zero. An explicit zero remains valid only when the source proves that the
 * period cost is ready.
 */
export function resolveSelectedScenarioPeriodPlanning({
  selectedScenarioQuoteActive = false,
  selectedScenario = null,
  previewPeriodPlanning = null,
} = {}) {
  if (!selectedScenarioQuoteActive) return previewPeriodPlanning;

  const source = selectedScenario?.periodPlanning;
  if (!source || typeof source !== "object") return null;

  const rawPeriodCostMinor = finiteMinor(source.periodPlanningCostMinor);
  const periodCostReady = source.periodCostReady === true && rawPeriodCostMinor != null;
  const periodPlanningCostMinor = periodCostReady ? rawPeriodCostMinor : null;
  const rawQuoteFloorMinor = finiteMinor(source.periodQuoteFloorMinor);
  const comparisonAllowed = source.comparisonAllowed === true
    && periodCostReady
    && rawQuoteFloorMinor != null;
  const missing = Array.isArray(source.missing) ? [...source.missing] : [];
  if (!periodCostReady && !missing.includes("Araç dönem maliyeti")) missing.push("Araç dönem maliyeti");

  return {
    ...source,
    periodCostReady,
    comparisonAllowed,
    periodPlanningCostMinor,
    periodQuoteFloorMinor: comparisonAllowed ? rawQuoteFloorMinor : null,
    periodExpectedGainMinor: comparisonAllowed ? finiteMinor(source.periodExpectedGainMinor) : null,
    missing,
  };
}

export function buildRoomDecisionRequestParams({
  form = {},
  focusedContext = false,
  serviceCostContextRequired = false,
  roomCostFocus = {},
} = {}) {
  if (!focusedContext) return { ...form };
  return {
    ...form,
    ...(serviceCostContextRequired ? { serviceCostContextRequired: "true" } : {}),
    ...(roomCostFocus.vehicleId ? { focusVehicleId: roomCostFocus.vehicleId } : {}),
    ...(roomCostFocus.driverId ? { focusDriverId: roomCostFocus.driverId } : {}),
    ...(roomCostFocus.shiftId ? { focusShiftId: roomCostFocus.shiftId } : {}),
    ...(roomCostFocus.agreementId ? { focusAgreementId: roomCostFocus.agreementId } : {}),
    ...(roomCostFocus.focusOfferId ? { focusOfferId: roomCostFocus.focusOfferId } : {}),
    ...(roomCostFocus.periodStart ? { focusPeriodStart: roomCostFocus.periodStart } : {}),
    ...(roomCostFocus.periodEnd ? { focusPeriodEnd: roomCostFocus.periodEnd } : {}),
    ...(roomCostFocus.filterVehicleId ? { filterVehicleId: roomCostFocus.filterVehicleId } : {}),
    ...(roomCostFocus.filterDriverId ? { filterDriverId: roomCostFocus.filterDriverId } : {}),
    ...(roomCostFocus.filterPeriodStart ? { filterPeriodStart: roomCostFocus.filterPeriodStart } : {}),
    ...(roomCostFocus.filterPeriodEnd ? { filterPeriodEnd: roomCostFocus.filterPeriodEnd } : {}),
    ...(roomCostFocus.operationalScope ? { operationalScope: roomCostFocus.operationalScope } : {}),
  };
}

export function effectiveOperationalDecisionCost({ decision = null, costOverrideMinor = null } = {}) {
  return finiteMinor(costOverrideMinor) ?? finiteMinor(decision?.grossActualCostMinor);
}

export function resolveOperationalDecisionForScope({
  vehicleMonthDecision = null,
  contractMonthDecision = null,
  serviceCostScope = null,
  selectedServiceShift = null,
  selectedServiceAgreement = null,
} = {}) {
  const selectedAgreementId = Number(serviceCostScope?.selectedAgreementId || 0);
  const selectedShiftId = Number(serviceCostScope?.selectedShiftId || 0);
  const hasSelectedService = [selectedAgreementId, selectedShiftId].some((value) => Number.isSafeInteger(value) && value > 0);
  const contractStatus = String(contractMonthDecision?.status || "").toUpperCase();

  if (hasSelectedService && contractMonthDecision && contractStatus !== "PERIOD_REQUIRED") {
    const shiftId = Number(selectedServiceShift?.id || selectedShiftId || 0);
    const agreementId = Number(selectedServiceAgreement?.id || selectedAgreementId || 0);
    const shiftStart = Date.parse(String(selectedServiceShift?.startAt || ""));
    const shiftEnd = Date.parse(String(selectedServiceShift?.endAt || ""));
    const shiftDurationMinutes = Number.isFinite(shiftStart)
      && Number.isFinite(shiftEnd)
      && shiftEnd >= shiftStart
      ? Math.round((shiftEnd - shiftStart) / 60000)
      : null;
    const shiftDistanceM = finiteMinor(
      selectedServiceShift?.routeSnapshotDistanceM
      ?? selectedServiceShift?.routeDistanceM,
    );
    const earnedIncomeMinor = finiteMinor(
      contractMonthDecision.earnedRevenueMinor
      ?? contractMonthDecision.earnedIncomeMinor,
    );
    const realizedActualCostMinor = finiteMinor(
      contractMonthDecision.realizedActualCostMinor
      ?? contractMonthDecision.grossActualCostMinor,
    );
    const customerId = finiteMinor(
      selectedServiceShift?.companyId
      ?? selectedServiceShift?.customerId
      ?? selectedServiceAgreement?.companyId
      ?? selectedServiceAgreement?.customerId,
    );
    const customerName = String(
      selectedServiceAgreement?.company?.name
      || selectedServiceAgreement?.customer?.name
      || selectedServiceAgreement?.companyName
      || selectedServiceAgreement?.customerName
      || "",
    ).trim();
    const hasShift = Number.isSafeInteger(shiftId) && shiftId > 0;
    const hasAgreement = Number.isSafeInteger(agreementId) && agreementId > 0;
    const selectedShiftIsDone = String(selectedServiceShift?.status || "").toUpperCase() === "DONE";

    return {
      ...vehicleMonthDecision,
      ...contractMonthDecision,
      earnedIncomeMinor,
      earnedRevenueMinor: earnedIncomeMinor,
      grossActualCostMinor: realizedActualCostMinor,
      distributedActualCostMinor: finiteMinor(
        contractMonthDecision.distributedActualCostMinor,
      ) ?? realizedActualCostMinor,
      ...(hasShift ? {
        shiftIds: [shiftId],
        realizedShiftCount: selectedServiceShift
          ? (selectedShiftIsDone ? 1 : 0)
          : contractMonthDecision.realizedShiftCount,
      } : {}),
      ...(hasAgreement ? { agreementIds: [agreementId] } : {}),
      ...(customerId != null
        ? {
          customerIds: [customerId],
          customerLabels: customerName ? [{ id: customerId, name: customerName }] : [],
        }
        : selectedServiceShift
          ? { customerIds: [], customerLabels: [] }
          : {}),
      ...(shiftDurationMinutes != null ? { verifiedUsageMinutes: shiftDurationMinutes } : {}),
      ...(shiftDistanceM != null ? { verifiedDistanceM: shiftDistanceM } : {}),
      realizedOnly: selectedServiceShift ? selectedShiftIsDone : contractMonthDecision.realizedOnly === true,
    };
  }
  return vehicleMonthDecision;
}

function decisionScopeDate(value) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 10) : "";
}

export function resolveVehicleComparisonCostMinor({
  primaryCostMinor = null,
  vehicleMonthDecision = null,
  focus = {},
} = {}) {
  const primary = finiteMinor(primaryCostMinor);
  if (primary != null) return primary;

  const fallback = finiteMinor(vehicleMonthDecision?.grossActualCostMinor);
  if (fallback == null) return null;

  const filterVehicleId = Number(focus?.filterVehicleId || 0);
  const selectedVehicleId = filterVehicleId || Number(focus?.vehicleId || 0);
  const decisionVehicleId = Number(vehicleMonthDecision?.vehicleId || 0);
  if (!Number.isSafeInteger(selectedVehicleId) || selectedVehicleId <= 0 || decisionVehicleId !== selectedVehicleId) {
    return null;
  }

  const hasFilterPeriod = Boolean(focus?.filterPeriodStart || focus?.filterPeriodEnd);
  if (hasFilterPeriod && (!focus?.filterPeriodStart || !focus?.filterPeriodEnd)) return null;
  const periodStart = hasFilterPeriod ? focus.filterPeriodStart : focus?.periodStart;
  const periodEnd = hasFilterPeriod ? focus.filterPeriodEnd : focus?.periodEnd;
  if (!periodStart || !periodEnd) return null;
  if (decisionScopeDate(vehicleMonthDecision?.periodStart) !== decisionScopeDate(periodStart)) return null;
  if (decisionScopeDate(vehicleMonthDecision?.periodEnd) !== decisionScopeDate(periodEnd)) return null;

  return fallback;
}

export function buildRoomProfitabilityDisplay({
  currentOfferMinor = null,
  quoteFloorMinor = null,
  quoteFloorComputed = false,
  actualOperationalCostMinor = null,
  scenarioOfferMinor = null,
} = {}) {
  const offerMinor = finiteMinor(currentOfferMinor);
  const planningOfferMinor = finiteMinor(scenarioOfferMinor) ?? offerMinor;
  const planningFloorMinor = finiteMinor(quoteFloorMinor);
  const actualCostMinor = finiteMinor(actualOperationalCostMinor);

  return {
    planningExpectedGainMinor: quoteFloorComputed && planningOfferMinor != null && planningFloorMinor != null
      ? planningOfferMinor - planningFloorMinor
      : null,
    actualExpenseGapMinor: offerMinor != null && actualCostMinor != null
      ? offerMinor - actualCostMinor
      : null,
  };
}

export function describePlanningBucket({
  status = "",
  entryCount = 0,
  grossAmountMinor = null,
  blockers = [],
} = {}) {
  const blockerKeys = Array.isArray(blockers)
    ? blockers.map((value) => String(value || "").toUpperCase()).filter(Boolean)
    : [];
  const grossKnown = grossAmountMinor != null && Number.isFinite(Number(grossAmountMinor));
  const netOnlyUnknown = String(status).toUpperCase() === "INSUFFICIENT_DATA"
    && grossKnown
    && Number(entryCount) > 0
    && blockerKeys.length > 0
    && blockerKeys.every((value) => value === "VAT_UNKNOWN_NET_ROLLUP");

  if (netOnlyUnknown) {
    return { label: "Brüt hazır · net belirsiz", netOnlyUnknown: true };
  }
  return {
    label: String(status).toUpperCase() === "READY"
      ? "Hazır"
      : String(status).toUpperCase() === "INSUFFICIENT_DATA"
        ? "Eksik veri"
        : String(status).toUpperCase() === "MISSING"
          ? "Kayıt yok"
          : "Belirsiz",
    netOnlyUnknown: false,
  };
}
