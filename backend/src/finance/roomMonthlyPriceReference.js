import { resolveAgreementCommercialEvidence } from "./agreementCommercialEvidence.js";
import { evaluatePlatformAgreementReferenceGate } from "./platformAgreementPriceReference.js";

const HISTORICAL_AGREEMENT_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE"]);

const COMPONENT_LABELS = Object.freeze({
  fuel: "Yakıt",
  vehicle_fixed_allocated: "Kira, sigorta, vergi ve araç sabit gider payı",
  vehicle_fixed: "Araç sabit gideri",
  vehicle_variable: "Bakım, lastik ve diğer araç kullanım giderleri",
  driver_labor: "Sürücü planlama maliyeti",
  waiting_and_overtime: "Bekleme ve ek çalışma",
  waiting_overtime: "Bekleme ve ek çalışma",
  route_fees: "HGS, otoyol, otopark ve diğer rota ücretleri",
  operations_overhead: "Operasyon genel gideri",
  other_direct_cost: "Diğer doğrudan gider",
});

const COMPONENT_SOURCE_LABELS = Object.freeze({
  fuel: "Onaylı rota ve yakıt referansı",
  vehicle_fixed_allocated: "Onaylı araç dönem gider payı",
  vehicle_variable: "Onaylı araç kullanım gideri",
  driver_labor: "Onaylı sürücü planlama referansı",
  waiting_and_overtime: "Onaylı hizmet süresi referansı",
  route_fees: "Onaylı rota ücretleri",
  operations_overhead: "Onaylı operasyon gideri",
  other_direct_cost: "Onaylı doğrudan gider kaynağı",
});

const COMPONENT_KIND_LABELS = Object.freeze({
  fuel: "Kullanıma bağlı",
  vehicle_fixed_allocated: "Dönem sabit payı",
  vehicle_fixed: "Dönem sabit gideri",
  vehicle_variable: "Kullanıma bağlı",
  driver_labor: "Hizmet hareketine bağlı",
  waiting_and_overtime: "Süreye bağlı",
  waiting_overtime: "Süreye bağlı",
  route_fees: "Rota kullanımına bağlı",
  operations_overhead: "Genel gider payı",
  other_direct_cost: "Belirlenemedi",
});

function safeMinor(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function dateText(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeSnapshotDate(value) {
  return dateText(value);
}

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizedStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function agreementShapeReasons(selected, historical) {
  const reasons = [];
  if (selected?.weekMask != null && historical?.weekMask != null && Number(selected.weekMask) !== Number(historical.weekMask)) {
    reasons.push("hizmet sıklığı farklı");
  }
  if (selected?.pattern && historical?.pattern && selected.pattern !== historical.pattern) {
    reasons.push("rota düzeni farklı");
  }
  if (selected?.direction && historical?.direction && selected.direction !== historical.direction) {
    reasons.push("hizmet yönü farklı");
  }
  const selectedVehicleType = selected?.vehicle?.type || selected?.vehicleType || null;
  const historicalVehicleType = historical?.vehicle?.type || historical?.vehicleType || null;
  if (selectedVehicleType && historicalVehicleType && selectedVehicleType !== historicalVehicleType) {
    reasons.push("araç sınıfı farklı");
  }
  const selectedCapacity = positiveId(selected?.vehicle?.capacity || selected?.vehicleCapacity);
  const historicalCapacity = positiveId(historical?.vehicle?.capacity || historical?.vehicleCapacity);
  if (selectedCapacity && historicalCapacity && selectedCapacity !== historicalCapacity) {
    reasons.push("araç kapasitesi farklı");
  }
  return reasons;
}

function shiftStats(agreement) {
  const shifts = Array.isArray(agreement?.shifts) ? agreement.shifts : [];
  const distances = shifts
    .map((shift) => Number(shift?.routeSnapshotDistanceM))
    .filter((distance) => Number.isFinite(distance) && distance > 0);
  const durations = shifts
    .map((shift) => Number(shift?.routeSnapshotDurationSec))
    .filter((duration) => Number.isFinite(duration) && duration > 0);
  const serviceDates = new Set(
    shifts.map((shift) => normalizeSnapshotDate(shift?.startAt)).filter(Boolean),
  );
  const routeInputHashes = [...new Set(
    shifts.map((shift) => String(shift?.routeSnapshotInputHash || "").trim()).filter(Boolean),
  )];
  return {
    observedShiftCount: shifts.length,
    observedServiceDayCount: serviceDates.size || null,
    observedDistanceKm: distances.length
      ? Number((distances.reduce((sum, distance) => sum + distance, 0) / 1000).toFixed(2))
      : null,
    distancePerMovementKm: distances.length
      ? Number((distances.reduce((sum, distance) => sum + distance, 0) / distances.length / 1000).toFixed(3))
      : null,
    observedDurationMinutes: durations.length
      ? Number((durations.reduce((sum, duration) => sum + duration, 0) / 60).toFixed(1))
      : null,
    durationPerMovementMinutes: durations.length
      ? Number((durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 60).toFixed(2))
      : null,
    routeInputHash: routeInputHashes.length === 1 ? routeInputHashes[0] : null,
  };
}

function addPeriodShapeReasons(reasons, stats, periodPlanning) {
  const plannedMovements = safeNumber(periodPlanning?.plannedMovementCount);
  const plannedDays = safeNumber(periodPlanning?.scheduledServiceDayCount);
  if (plannedMovements != null && stats.observedShiftCount > 0 && plannedMovements !== stats.observedShiftCount) {
    reasons.push("hareket sayısı farklı");
  }
  if (plannedDays != null && stats.observedServiceDayCount != null && plannedDays !== stats.observedServiceDayCount) {
    reasons.push("çalışma günü kapsamı farklı");
  }
  const currentRoute = periodPlanning?.routeTemplate || null;
  if (currentRoute?.inputHash && stats.routeInputHash && currentRoute.inputHash !== stats.routeInputHash) {
    reasons.push("rota kanıtı farklı");
  }
  const currentDistanceKm = safeNumber(currentRoute?.distanceM) == null ? null : safeNumber(currentRoute.distanceM) / 1000;
  if (currentDistanceKm != null && stats.distancePerMovementKm != null
    && Math.abs(currentDistanceKm - stats.distancePerMovementKm) > Math.max(0.01, currentDistanceKm * 0.01)) {
    reasons.push("hareket başına kilometre farklı");
  }
  const currentDurationMinutes = safeNumber(currentRoute?.durationSec) == null ? null : safeNumber(currentRoute.durationSec) / 60;
  if (currentDurationMinutes != null && stats.durationPerMovementMinutes != null
    && Math.abs(currentDurationMinutes - stats.durationPerMovementMinutes) > Math.max(0.1, currentDurationMinutes * 0.01)) {
    reasons.push("hareket başına süre farklı");
  }
  const currentTotalDistanceKm = currentDistanceKm != null && plannedMovements != null
    ? currentDistanceKm * plannedMovements
    : null;
  if (currentTotalDistanceKm != null && stats.observedDistanceKm != null
    && Math.abs(currentTotalDistanceKm - stats.observedDistanceKm) > Math.max(0.01, currentTotalDistanceKm * 0.01)) {
    reasons.push("toplam hizmet kilometresi farklı");
  }
}

function historicalScopeEvidence({ agreement, stats }) {
  const missing = [];
  if (!dateText(agreement?.startDate) || !dateText(agreement?.endDate)) missing.push("geçmiş hizmet dönemi");
  if (!Number.isInteger(Number(agreement?.weekMask)) || Number(agreement.weekMask) <= 0) missing.push("hizmet sıklığı");
  if (!agreement?.pattern || !agreement?.direction) missing.push("hizmet şekli");
  const vehicle = agreement?.vehicle || {};
  if (!vehicle?.type) missing.push("araç tipi");
  if (positiveId(vehicle?.capacity) == null) missing.push("araç kapasitesi");
  if (!Number.isInteger(Number(stats?.observedShiftCount)) || stats.observedShiftCount <= 0) missing.push("gözlenen hareket sayısı");
  if (!Number.isFinite(Number(stats?.observedServiceDayCount)) || stats.observedServiceDayCount <= 0) missing.push("gözlenen hizmet günleri");
  if (!Number.isFinite(Number(stats?.observedDistanceKm)) || stats.observedDistanceKm <= 0) missing.push("toplam hizmet kilometresi");
  if (!Number.isFinite(Number(stats?.observedDurationMinutes)) || stats.observedDurationMinutes <= 0) missing.push("hizmet süresi");
  return [...new Set(missing)];
}

function currentScopeEvidence({ selectedAgreement, periodPlanning }) {
  const missing = [];
  if (!dateText(periodPlanning?.periodStart) || !dateText(periodPlanning?.periodEnd)) missing.push("hizmet dönemi");
  if (!Number.isFinite(Number(periodPlanning?.plannedMovementCount)) || Number(periodPlanning.plannedMovementCount) <= 0) missing.push("planlı hareket sayısı");
  if (!Number.isFinite(Number(periodPlanning?.scheduledServiceDayCount)) || Number(periodPlanning.scheduledServiceDayCount) <= 0) missing.push("planlı hizmet günleri");
  if (!Number.isFinite(Number(periodPlanning?.routeTemplate?.distanceM)) || Number(periodPlanning.routeTemplate.distanceM) <= 0) missing.push("toplam rota kilometresi");
  if (!Number.isFinite(Number(periodPlanning?.routeTemplate?.durationSec)) || Number(periodPlanning.routeTemplate.durationSec) <= 0) missing.push("hizmet süresi");
  const vehicle = selectedAgreement?.vehicle || {};
  if (!vehicle?.type) missing.push("güncel araç tipi");
  if (positiveId(vehicle?.capacity) == null) missing.push("güncel araç kapasitesi");
  return [...new Set(missing)];
}

function historicalReferenceFor({ roomId, selectedAgreement, historicalAgreements, periodPlanning }) {
  const selectedId = positiveId(selectedAgreement?.id);
  const selectedStart = dateText(selectedAgreement?.startDate);
  const candidates = (Array.isArray(historicalAgreements) ? historicalAgreements : [])
    .filter((agreement) => positiveId(agreement?.roomId) === positiveId(roomId))
    .filter((agreement) => positiveId(agreement?.id) && positiveId(agreement.id) !== selectedId)
    .filter((agreement) => HISTORICAL_AGREEMENT_STATUSES.has(normalizedStatus(agreement?.status)))
    .map((agreement) => {
      const evidence = agreement?.commercialEvidence || resolveAgreementCommercialEvidence({
        agreement,
        auditLogs: agreement?.auditLogs || [],
      });
      return {
        agreement,
        evidence,
        amountMinor: safeMinor(evidence?.commercialReference?.amountMinor),
        reasons: agreementShapeReasons(selectedAgreement, agreement),
      };
    })
    .filter(({ amountMinor }) => amountMinor != null && amountMinor > 0)
    .filter(({ agreement }) => {
      const end = dateText(agreement?.endDate);
      return !selectedStart || !end || end < selectedStart;
    })
    .sort((left, right) => {
      const leftDate = dateText(left.agreement?.endDate) || "";
      const rightDate = dateText(right.agreement?.endDate) || "";
      return left.reasons.length - right.reasons.length
        || rightDate.localeCompare(leftDate)
        || Number(right.agreement.id) - Number(left.agreement.id);
    });

  const chosen = candidates[0];
  if (!chosen) return null;
  const stats = shiftStats(chosen.agreement);
  const evidenceMissing = historicalScopeEvidence({ agreement: chosen.agreement, stats });
  const currentEvidenceMissing = currentScopeEvidence({ selectedAgreement, periodPlanning });
  const reasons = [
    ...chosen.reasons,
    ...evidenceMissing,
    ...currentEvidenceMissing.map((item) => `güncel ${item}`),
  ];
  addPeriodShapeReasons(reasons, stats, periodPlanning);
  const uniqueReasons = [...new Set(reasons)];
  const comparable = uniqueReasons.length === 0;
  return {
    agreementId: Number(chosen.agreement.id),
    statusLabel: "Kabul edilmiş geçmiş ticari fiyat",
    periodStart: dateText(chosen.agreement.startDate),
    periodEnd: dateText(chosen.agreement.endDate),
    amountMinor: chosen.amountMinor,
    currencyCode: "TRY",
    observedShiftCount: stats.observedShiftCount,
    observedServiceDayCount: stats.observedServiceDayCount,
    observedDistanceKm: stats.observedDistanceKm,
    distancePerMovementKm: stats.distancePerMovementKm,
    observedDurationMinutes: stats.observedDurationMinutes,
    durationPerMovementMinutes: stats.durationPerMovementMinutes,
    routeInputHash: stats.routeInputHash,
    commercialReference: {
      ...chosen.evidence.commercialReference,
      comparability: comparable ? "COMPARABLE" : "LIMITED",
    },
    negotiationEvidence: chosen.evidence.negotiationEvidence,
    operationalEvidence: chosen.evidence.operationalEvidence,
    evidenceMissing: [...new Set([...evidenceMissing, ...currentEvidenceMissing.map((item) => `güncel ${item}`)])],
    pricePerKmMinor: comparable && stats.observedDistanceKm > 0
      ? Math.round(chosen.amountMinor / stats.observedDistanceKm)
      : null,
    comparability: comparable ? "COMPARABLE" : "LIMITED",
    comparabilityLabel: comparable ? "Benzer hizmet kapsamı" : "Sınırlı karşılaştırma",
    comparabilityNote: uniqueReasons.length
      ? `Geçmiş fiyat doğrudan teklif tabanı değildir; karşılaştırma için ${uniqueReasons.join(", ")} kanıtı eşleşmiyor veya eksik.`
      : "Geçmiş fiyat yalnız aynı ROOM'un benzer hizmet kaydı olarak gösterilir.",
  };
}

export function buildComparableCommercialReference({ roomId = null, selectedAgreement = null, historicalAgreements = [] } = {}) {
  const selectedShifts = Array.isArray(selectedAgreement?.shifts) ? selectedAgreement.shifts : [];
  const selectedStats = shiftStats(selectedAgreement);
  const firstShift = selectedShifts.find((shift) => Number(shift?.routeSnapshotDistanceM) > 0 && Number(shift?.routeSnapshotDurationSec) > 0);
  const periodPlanning = {
    periodStart: dateText(selectedAgreement?.startDate),
    periodEnd: dateText(selectedAgreement?.endDate),
    plannedMovementCount: selectedStats.observedShiftCount > 0 ? selectedStats.observedShiftCount : null,
    scheduledServiceDayCount: selectedStats.observedServiceDayCount,
    routeTemplate: firstShift
      ? {
        distanceM: Number(firstShift.routeSnapshotDistanceM),
        durationSec: Number(firstShift.routeSnapshotDurationSec),
        inputHash: firstShift.routeSnapshotInputHash || null,
      }
      : null,
  };
  return historicalReferenceFor({ roomId, selectedAgreement, historicalAgreements, periodPlanning });
}

function publicComponent(component, { periodCostReady = false, periodStart = null, periodEnd = null, periodScopeLabel = null } = {}) {
  const key = String(component?.componentKey || "");
  if (!key || key === "external_preview_adjustments") return null;
  const included = component?.includedInBaseline === true;
  const amountMinor = included ? safeMinor(component?.amountMinor) : null;
  const includedInPeriodTotal = periodCostReady && included && amountMinor != null;
  const statusLabel = includedInPeriodTotal
    ? "Hesaba dahil"
    : included && amountMinor != null
      ? "Kısmi bilgi"
      : component?.status === "incomplete"
        ? "Eksik"
        : "Ayrı tutuldu";
  return {
    componentKey: key,
    label: COMPONENT_LABELS[key] || component?.label || "Diğer maliyet",
    amountMinor,
    statusLabel,
    includedInPeriodTotal,
    sourceLabel: COMPONENT_SOURCE_LABELS[key] || "Onaylı maliyet kaynağı",
    costKindLabel: COMPONENT_KIND_LABELS[key] || "Belirlenemedi",
    confidenceLabel: included && periodCostReady
      ? (component?.confidence === "high" ? "Yüksek" : component?.confidence === "medium" ? "Orta" : "Düşük")
      : "Belirsiz",
    periodStart,
    periodEnd,
    scopeLabel: periodScopeLabel,
    note: includedInPeriodTotal
      ? "Onaylı dönem önizlemesine dahil edildi."
      : included && amountMinor != null
        ? "Bilinen kısım; tam dönem toplamına dahil edilmedi."
        : "Eksik veya kapsam dışı olduğu için sıfır kabul edilmedi.",
  };
}

function buildCostComponents(periodPreview, periodPlanning) {
  const periodCostReady = periodPlanning?.periodCostReady === true;
  const periodScopeLabel = periodPlanning?.plannedMovementCount
    ? `${periodPlanning.plannedMovementCount} planlı hareket`
    : null;
  return (Array.isArray(periodPreview?.operationalCostModel?.components) ? periodPreview.operationalCostModel.components : [])
    .map((component) => publicComponent(component, {
      periodCostReady,
      periodStart: periodPlanning?.periodStart || null,
      periodEnd: periodPlanning?.periodEnd || null,
      periodScopeLabel,
    }))
    .filter(Boolean);
}

function buildCanonicalPeriodCostSnapshot(periodPreview, periodPlanning) {
  const periodCostReady = periodPlanning?.periodCostReady === true;
  const estimatedCostMinor = periodCostReady
    ? safeMinor(periodPlanning?.periodPlanningCostMinor ?? periodPreview?.operationalCostModel?.baselineOperationalCostMinor)
    : null;
  const quoteFloorMinor = periodCostReady
    ? safeMinor(periodPlanning?.periodQuoteFloorMinor ?? periodPreview?.quoteFloor?.quoteFloorMinor)
    : null;
  const allComponents = buildCostComponents(periodPreview, periodPlanning);
  const components = allComponents.filter((component) => component.includedInPeriodTotal === true);
  const componentKeys = new Set(components.map((component) => component?.key || component?.componentKey || component?.label).filter(Boolean));
  const complete = estimatedCostMinor != null
    && quoteFloorMinor != null
    && components.length > 0
    && components.every((component) => component.amountMinor != null)
    && componentKeys.size === components.length;
  return {
    complete,
    periodStart: periodPlanning?.periodStart || null,
    periodEnd: periodPlanning?.periodEnd || null,
    estimatedCostMinor,
    quoteFloorMinor,
    components,
  };
}

function buildMonthlyCostChange({
  historicalReference,
  currentPeriod,
  currentPeriodPlanning,
  currentPeriodPreview,
  historicalPeriodPlanning,
  historicalPeriodPreview,
} = {}) {
  const notProven = (missing = []) => Object.freeze({
    status: "NOT_PROVEN",
    currentPeriodCostMinor: null,
    historicalPeriodCostMinor: null,
    costDifferenceMinor: null,
    costChangePercentBps: null,
    currentQuoteFloorMinor: null,
    historicalQuoteFloorMinor: null,
    quoteFloorDifferenceMinor: null,
    components: [],
    currentPeriod: null,
    historicalPeriod: null,
    missing: [...new Set(missing.filter(Boolean))],
  });

  if (historicalReference?.comparability !== "COMPARABLE") {
    return notProven(["Aynı hizmet kapsamına ait karşılaştırılabilir geçmiş kayıt"]);
  }

  const currentSnapshot = buildCanonicalPeriodCostSnapshot(currentPeriodPreview, currentPeriodPlanning);
  const historicalSnapshot = buildCanonicalPeriodCostSnapshot(historicalPeriodPreview, historicalPeriodPlanning);
  if (!currentSnapshot.complete || !historicalSnapshot.complete) {
    return notProven([
      ...(!currentSnapshot.complete ? ["Güncel dönemin eksiksiz maliyet bileşenleri"] : []),
      ...(!historicalSnapshot.complete ? ["Geçmiş dönemin eksiksiz maliyet bileşenleri"] : []),
    ]);
  }
  if (historicalSnapshot.estimatedCostMinor <= 0) {
    return notProven(["Geçmiş dönem maliyetinin pozitif toplamı"]);
  }

  const currentByKey = new Map(currentSnapshot.components.map((component) => [component.componentKey, component]));
  const historicalByKey = new Map(historicalSnapshot.components.map((component) => [component.componentKey, component]));
  const keys = [...new Set([...currentByKey.keys(), ...historicalByKey.keys()])];
  if (keys.some((key) => !currentByKey.has(key) || !historicalByKey.has(key))) {
    return notProven(["İki dönemde de aynı maliyet bileşeni kapsamı"]);
  }

  const components = keys.map((componentKey) => {
    const current = currentByKey.get(componentKey);
    const historical = historicalByKey.get(componentKey);
    return {
      componentKey,
      label: current.label,
      currentAmountMinor: current.amountMinor,
      historicalAmountMinor: historical.amountMinor,
      differenceMinor: current.amountMinor - historical.amountMinor,
      currentSourceLabel: current.sourceLabel,
      historicalSourceLabel: historical.sourceLabel,
    };
  });
  const costDifferenceMinor = currentSnapshot.estimatedCostMinor - historicalSnapshot.estimatedCostMinor;
  const quoteFloorDifferenceMinor = currentSnapshot.quoteFloorMinor - historicalSnapshot.quoteFloorMinor;
  return Object.freeze({
    status: "READY",
    currentPeriodCostMinor: currentSnapshot.estimatedCostMinor,
    historicalPeriodCostMinor: historicalSnapshot.estimatedCostMinor,
    costDifferenceMinor,
    costChangePercentBps: Math.round((costDifferenceMinor / historicalSnapshot.estimatedCostMinor) * 10000),
    currentQuoteFloorMinor: currentSnapshot.quoteFloorMinor,
    historicalQuoteFloorMinor: historicalSnapshot.quoteFloorMinor,
    quoteFloorDifferenceMinor,
    components,
    currentPeriod: {
      periodStart: currentSnapshot.periodStart || currentPeriod?.periodStart || null,
      periodEnd: currentSnapshot.periodEnd || currentPeriod?.periodEnd || null,
    },
    historicalPeriod: {
      periodStart: historicalSnapshot.periodStart || null,
      periodEnd: historicalSnapshot.periodEnd || null,
    },
    missing: [],
  });
}

function planningInputAssumptions(inputs = {}) {
  const assumptions = [];
  const emptyDistanceKm = safeNumber(inputs.emptyDistanceKm);
  const fuelUnitPriceMinor = safeMinor(inputs.fuelUnitPriceMinor);
  const consumption = safeNumber(inputs.fuelConsumptionLitersPer100Km);
  const driverBaseMinor = safeMinor(inputs.driverBasePerShiftMinor);
  const fixedVehicleMinor = safeMinor(inputs.fixedVehicleCostMonthlyMinor);
  const allocationDays = safeNumber(inputs.allocationServiceDaysPerMonth);
  if (emptyDistanceKm != null) assumptions.push(`Boş kilometre: ${emptyDistanceKm.toLocaleString("tr-TR")} km/hareket (planlama varsayımı).`);
  if (fuelUnitPriceMinor != null) assumptions.push(`Yakıt fiyatı: ${(fuelUnitPriceMinor / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL/L (planlama varsayımı).`);
  if (consumption != null) assumptions.push(`Yakıt tüketimi: ${consumption.toLocaleString("tr-TR")} L/100 km (planlama referansı).`);
  if (driverBaseMinor != null) assumptions.push(`Sürücü planlama maliyeti: ${(driverBaseMinor / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL/hareket.`);
  if (fixedVehicleMinor != null) {
    const monthly = (fixedVehicleMinor / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 });
    assumptions.push(`Paylaşımlı araç sabit gideri: ${monthly} TL/ay${allocationDays != null ? `; ${allocationDays.toLocaleString("tr-TR")} hizmet günü paydası.` : "."}`);
  }
  return assumptions;
}

function storedPlanningReferenceFor({ roomId, selectedAgreement, savedPlanningDraft }) {
  if (!savedPlanningDraft || Number(savedPlanningDraft.roomId || 0) !== Number(roomId || 0)) return null;
  const snapshot = savedPlanningDraft.inputSnapshot;
  const serviceContext = snapshot?.serviceContext || null;
  if (!serviceContext || Number(serviceContext.roomId || 0) !== Number(roomId || 0)) return null;
  if (Number(serviceContext.agreementId || 0) !== Number(selectedAgreement?.id || 0)) return null;
  const periodPlanning = snapshot?.computed?.periodPlanning || null;
  const estimatedCostMinor = safeMinor(periodPlanning?.periodPlanningCostMinor);
  const quoteFloorMinor = safeMinor(periodPlanning?.periodQuoteFloorMinor);
  if (estimatedCostMinor == null || quoteFloorMinor == null) return null;
  const planningInputs = snapshot?.computed?.planningInputs || {};
  return {
    draftId: Number(savedPlanningDraft.id || 0) || null,
    version: Number(savedPlanningDraft.version || 0) || null,
    updatedAt: savedPlanningDraft.updatedAt || null,
    statusLabel: "Kayıtlı planlama senaryosu",
    sourceLabel: "ROOM teklif planlama kaydı",
    periodStart: periodPlanning.periodStart || normalizeSnapshotDate(serviceContext.periodStart),
    periodEnd: periodPlanning.periodEnd || normalizeSnapshotDate(serviceContext.periodEnd),
    plannedMovementCount: Number(periodPlanning.plannedMovementCount || 0) || null,
    scheduledServiceDayCount: Number(periodPlanning.scheduledServiceDayCount || 0) || null,
    estimatedCostMinor,
    quoteFloorMinor,
    riskAdjustedCostMinor: safeMinor(snapshot?.computed?.riskAdjustedCostMinor),
    scenarioOfferMinor: safeMinor(planningInputs.quoteScenarioAmountMinor),
    expectedDifferenceMinor: safeNumber(periodPlanning.periodExpectedGainMinor),
    assumptions: [...new Set([
      ...(Array.isArray(periodPlanning.assumptions) ? periodPlanning.assumptions : []),
      ...planningInputAssumptions(planningInputs),
    ])],
    notRealizedCost: true,
    notActualLedger: true,
    readOnly: true,
    previewOnly: true,
    noPersistence: true,
  };
}

export function buildRoomMonthlyPriceReference({
  roomId = null,
  selectedAgreement = null,
  historicalAgreements = [],
  periodPlanning = null,
  periodPreview = null,
  historicalPeriodPlanning = null,
  historicalPeriodPreview = null,
  singleShiftPreview = null,
  selectedPeriodStart = null,
  selectedPeriodEnd = null,
  savedPlanningDraft = null,
  platformObservations = [],
  platformPolicy = null,
} = {}) {
  const periodCostReady = periodPlanning?.periodCostReady === true;
  const comparisonAllowed = periodPlanning?.comparisonAllowed === true;
  const estimatedCostMinor = periodCostReady ? safeMinor(periodPlanning?.periodPlanningCostMinor) : null;
  const quoteFloorMinor = comparisonAllowed ? safeMinor(periodPlanning?.periodQuoteFloorMinor) : null;
  const singleShiftCostMinor = safeMinor(
    singleShiftPreview?.quoteFloor?.baselineOperationalCostMinor
      ?? (!periodCostReady ? periodPreview?.operationalCostModel?.baselineOperationalCostMinor : null),
  );
  const historicalReference = historicalReferenceFor({ roomId, selectedAgreement, historicalAgreements, periodPlanning });
  const selectedCommercialEvidence = selectedAgreement?.commercialEvidence || resolveAgreementCommercialEvidence({
    agreement: selectedAgreement,
    auditLogs: selectedAgreement?.auditLogs || [],
  });
  const platformReference = evaluatePlatformAgreementReferenceGate({
    observations: platformObservations,
    policy: platformPolicy,
  });
  const missing = [];
  if (estimatedCostMinor == null) missing.push("Güncel hizmet döneminin tahmini maliyeti");
  if (quoteFloorMinor == null) missing.push("Güncel dönem teklif tabanı");
  for (const item of Array.isArray(periodPlanning?.missing) ? periodPlanning.missing : []) {
    if (item && !missing.includes(item)) missing.push(item);
  }
  const assumptions = Array.isArray(periodPlanning?.assumptions) ? [...periodPlanning.assumptions] : [];
  if (singleShiftCostMinor != null) assumptions.push("Tek vardiya maliyeti aylık dönem maliyeti yerine kullanılmadı.");
  const currentPeriod = {
    periodStart: periodPlanning?.periodStart || dateText(selectedAgreement?.startDate) || dateText(selectedPeriodStart),
    periodEnd: periodPlanning?.periodEnd || dateText(selectedAgreement?.endDate) || dateText(selectedPeriodEnd),
    plannedMovementCount: Number(periodPlanning?.plannedMovementCount || 0) || null,
    scheduledServiceDayCount: Number(periodPlanning?.scheduledServiceDayCount || 0) || null,
    observedLinkedShiftCount: Number(periodPlanning?.observedLinkedShiftCount || 0) || null,
    estimatedCostMinor,
    quoteFloorMinor,
    singleShiftCostMinor,
    singleShiftIsMonthly: false,
    comparisonAllowed,
    periodCostReady,
    knownPartialCostMinor: safeMinor(periodPlanning?.knownRoutePlanningCostMinor),
    costSourceLabel: estimatedCostMinor != null ? "Onaylı dönem planlama önizlemesi" : "Yeterli dönem maliyeti kanıtı yok",
  };
  const storedPlanningScenario = storedPlanningReferenceFor({ roomId, selectedAgreement, savedPlanningDraft });
  const currentCostComponents = buildCostComponents(periodPreview, periodPlanning);
  const comparableHistory = historicalReference?.comparability === "COMPARABLE";
  const currentReady = estimatedCostMinor != null && quoteFloorMinor != null && periodCostReady && comparisonAllowed;
  const referenceMissing = historicalReference ? [] : ["Geçmiş ROOM anlaşması bulunamadı; güncel hesap geçmiş fiyata bağlı değildir."];
  const factors = [];
  if (currentPeriod.plannedMovementCount != null && historicalReference?.observedShiftCount != null) {
    factors.push(currentPeriod.plannedMovementCount === historicalReference.observedShiftCount
      ? "Planlı hareket sayısı geçmiş gözlenen vardiya sayısıyla aynı görünüyor."
      : "Planlı hareket sayısı ile geçmişte gözlenen vardiya sayısı farklı; fiyatlar doğrudan eşitlenmedi.");
  }
  if (periodPlanning?.routeTemplate?.serviceDistanceKm != null) factors.push("Rota mesafesi onaylı dönem planından alındı.");
  if (periodPlanning?.routeTemplate?.emptyDistanceKm != null) factors.push("Boş kilometre açık planlama verisiyle ayrı değerlendirildi.");
  if (periodPlanning?.routeTemplate?.durationMinutes != null) factors.push("Hizmet süresi onaylı dönem planında kullanıldı.");
  const comparison = {
    status: currentReady && comparableHistory ? "READY" : "NOT_PROVEN",
    currentEstimatedCostMinusHistoricalPriceMinor: currentReady && comparableHistory
      ? estimatedCostMinor - historicalReference.amountMinor
      : null,
    currentQuoteFloorMinusHistoricalPriceMinor: currentReady && comparableHistory
      ? quoteFloorMinor - historicalReference.amountMinor
      : null,
    monthlyChangePercentBps: currentReady && comparableHistory && historicalReference.amountMinor > 0
      ? Math.round(((estimatedCostMinor - historicalReference.amountMinor) / historicalReference.amountMinor) * 10000)
      : null,
    note: historicalReference
      ? "Geçmiş anlaşma fiyatı yalnız yeterli kapsam eşleşmesi varsa dönem değişimiyle kıyaslanır."
      : "Geçmiş anlaşma bulunmadı; güncel maliyet hesabı bağımsız yürütülür.",
  };
  const monthlyCostChange = buildMonthlyCostChange({
    historicalReference,
    currentPeriod,
    currentPeriodPlanning: periodPlanning,
    currentPeriodPreview: periodPreview,
    historicalPeriodPlanning,
    historicalPeriodPreview,
  });
  return Object.freeze({
    status: currentReady ? "READY" : "INSUFFICIENT_DATA",
    statusLabel: currentReady
      ? "Güncel dönem fiyat hesabı hazır"
      : "Güncel dönem fiyat hesabı belirsiz",
    currencyCode: "TRY",
    commercialReference: selectedCommercialEvidence.commercialReference,
    negotiationEvidence: selectedCommercialEvidence.negotiationEvidence,
    operationalEvidence: selectedCommercialEvidence.operationalEvidence,
    platformReference,
    historicalReference,
    currentPeriod,
    currentCostComponents,
    monthlyCostChange,
    storedPlanningScenario,
    comparison,
    referenceMissing,
    factors,
    assumptions: [...new Set(assumptions)],
    missing: [...new Set(missing)],
    risk: currentReady
      ? { status: "GREEN", tone: "good", icon: "✓", label: "Güncel tahmini baz hazır", description: historicalReference ? "Güncel dönem hesabı hazır; geçmiş fiyat yalnız kapsamı uyuyorsa kıyaslanır." : "Güncel dönem hesabı hazır; geçmiş anlaşma olmadan bağımsız hesaplandı." }
      : { status: "GRAY", tone: "muted", icon: "○", label: "Ekonomik kanıt eksik", description: "Eksik kapsam nedeniyle güncel dönem fiyatı kesinleştirilmedi." },
    safety: Object.freeze({ readOnly: true, previewOnly: true, noPersistence: true, noLiveMutation: true, confirmedNetProfitMinor: null }),
  });
}
