import {
  buildActionSimulationWording,
  buildCopilotSignalSummary,
  buildDiagnosticPriority,
  normalizeCopilotSignal,
} from "./copilotFacts.js";

function compactText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || String(fallback || "").trim();
}

function compactList(items = [], limit = 6) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = compactText(item, "");
    if (!text) continue;
    const key = text.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function safeInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function formatDateTimeTR(value) {
  const text = compactText(value, "");
  if (!text) return "";
  if (/^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}/.test(text)) {
    return text.replace(/\s*[—–-]\s*/g, " - ");
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.day}.${map.month}.${map.year} ${map.hour}:${map.minute}`;
}

function formatRangeTR(start, end) {
  const left = formatDateTimeTR(start);
  const right = formatDateTimeTR(end);
  if (!left && !right) return "";
  if (!left) return right;
  if (!right) return left;
  return `${left} - ${right}`;
}

const ROUTE_REFRESH_STATE_LABELS = {
  PENDING: "Bekliyor",
  COUNTERED: "Karşı teklif",
  ACCEPTED: "Kabul edildi",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
  CLOSED: "Kapandı",
};

function routeRefreshStatusLabel(value) {
  const key = compactText(value, "").toUpperCase();
  return ROUTE_REFRESH_STATE_LABELS[key] || compactText(value, "");
}

function buildSelectedSummary({
  statusText,
  roomName,
  startDate,
  endDate,
  sourceShiftId,
  generatedShiftCount,
  lastGeneratedShiftId,
  lastGeneratedShiftStatus,
  lastGeneratedShiftStart,
  lastGeneratedShiftEnd,
  personelCount,
  stopCount,
}) {
  return [
    statusText,
    roomName,
    formatRangeTR(startDate, endDate),
    sourceShiftId ? `Kaynak vardiya #${sourceShiftId}` : "",
    Number(generatedShiftCount || 0) > 0 ? `Üretilen vardiya: ${Number(generatedShiftCount)}` : "",
    lastGeneratedShiftId ? `Son üretilen vardiya #${lastGeneratedShiftId}` : "",
    lastGeneratedShiftStatus ? compactText(lastGeneratedShiftStatus) : "",
    formatRangeTR(lastGeneratedShiftStart, lastGeneratedShiftEnd),
    Number.isFinite(Number(personelCount)) && Number(personelCount) > 0 ? `Personel: ${Number(personelCount)}` : "",
    Number.isFinite(Number(stopCount)) && Number(stopCount) > 0 ? `Durak: ${Number(stopCount)}` : "",
  ]
    .map((item) => compactText(item))
    .filter(Boolean)
    .join(" • ");
}

export function buildAgreementCopilotFacts(item, summary = {}) {
  const statusText = compactText(summary.selectedRecordStatus || item?.status || "");
  const screenPath = compactText(summary.screenPath || "/company/agreements", "/company/agreements");
  const screenTitle = compactText(summary.screenTitle || "Sözleşmeler");
  const selectedRecordType = compactText(summary.selectedRecordType || item?.type || "agreement");
  const selectedRecordLabel = compactText(summary.selectedRecordLabel || item?.label || `Sözleşme #${item?.id || "-"}`);
  const selectedRecordId = safeInt(summary.selectedRecordId || item?.id || 0) || null;
  const roomName = compactText(summary.roomName || item?.roomName || summary.roomLabel || "");
  const routeRefreshState = compactText(summary.routeRefreshState || summary.routeRefreshStatus || "");
  const routeRefreshRequestId = safeInt(summary.routeRefreshRequestId || summary.routeRefreshId || 0);
  const routeRefreshLabel = compactText(summary.routeRefreshLabel || (routeRefreshState ? (routeRefreshRequestId > 0 ? `Rota güncelleme #${routeRefreshRequestId}` : 'Rota güncellemesi') : ""));
  const routeRefreshNote = compactText(summary.routeRefreshNote || routeRefreshStatusLabel(routeRefreshState) || "", "");
  const routeRefreshChangeType = compactText(summary.routeRefreshChangeType || item?.changeType || item?.type || "");
  const routeRefreshCurrentText = compactText(summary.routeRefreshCurrentText || "");
  const routeRefreshProposedText = compactText(summary.routeRefreshProposedText || "");
  const routeRefreshDiffText = compactText(summary.routeRefreshDiffText || "");
  const routeRefreshPriceImpactText = compactText(summary.routeRefreshPriceImpactText || "");
  const routeRefreshRoomCounterText = compactText(summary.routeRefreshRoomCounterText || "");
  const routeRefreshCurrentPreviewShiftId = safeInt(summary.routeRefreshCurrentPreviewShiftId || 0);
  const routeRefreshProposedPreviewShiftId = safeInt(summary.routeRefreshProposedPreviewShiftId || 0);
  const routeRefreshSummaryText = compactText(summary.routeRefreshSummaryText || [
    routeRefreshLabel,
    routeRefreshNote ? `Durum: ${routeRefreshNote}` : "",
    routeRefreshChangeType ? `Tür: ${routeRefreshChangeType}` : "",
    routeRefreshCurrentText ? `Mevcut rota: ${routeRefreshCurrentText}` : "",
    routeRefreshProposedText ? `Yeni rota: ${routeRefreshProposedText}` : "",
    routeRefreshDiffText ? `Fark: ${routeRefreshDiffText}` : "",
    routeRefreshPriceImpactText ? `Ücret etkisi: ${routeRefreshPriceImpactText}` : "",
    routeRefreshRoomCounterText ? `Oda karşı teklifi: ${routeRefreshRoomCounterText}` : "",
  ].filter(Boolean).join(" • "), "");
  const dynamicSavingsPreview = summary.dynamicSavingsPreview && typeof summary.dynamicSavingsPreview === "object"
    ? summary.dynamicSavingsPreview
    : null;
  const dynamicSavingsSummaryText = compactText(summary.dynamicSavingsSummaryText || summary.dynamicSavingsPreviewText || dynamicSavingsPreview?.summaryText || "");
  const dynamicSavingsCurrentText = compactText(summary.dynamicSavingsCurrentText || dynamicSavingsPreview?.currentRouteText || "");
  const dynamicSavingsProposedText = compactText(summary.dynamicSavingsProposedText || dynamicSavingsPreview?.proposedRouteText || "");
  const dynamicSavingsDiffText = compactText(summary.dynamicSavingsDiffText || dynamicSavingsPreview?.diffText || "");
  const dynamicSavingsKmSavingsText = compactText(summary.dynamicSavingsKmSavingsText || dynamicSavingsPreview?.kmSavingsText || "");
  const dynamicSavingsDurationSavingsText = compactText(summary.dynamicSavingsDurationSavingsText || dynamicSavingsPreview?.durationSavingsText || "");
  const dynamicSavingsCapacityEffectText = compactText(summary.dynamicSavingsCapacityEffectText || dynamicSavingsPreview?.capacityEffectText || "");
  const dynamicSavingsApproxCostText = compactText(summary.dynamicSavingsApproxCostText || dynamicSavingsPreview?.approxCostText || "");
  const dynamicSavingsBoundaryText = compactText(summary.dynamicSavingsPreviewOnlyNote || dynamicSavingsPreview?.previewOnlyNote || "");
  const dynamicSavingsNextBestAction = compactText(summary.dynamicSavingsNextBestAction || dynamicSavingsPreview?.nextBestAction || "");
  const dynamicSavingsReliability = compactText(summary.dynamicSavingsReliability || dynamicSavingsPreview?.reliability || "");
  const qualityPaymentBridgePreview = summary.qualityPaymentBridgePreview && typeof summary.qualityPaymentBridgePreview === "object"
    ? summary.qualityPaymentBridgePreview
    : null;
  const qualityPaymentBridgeSummaryText = compactText(summary.qualityPaymentBridgeSummaryText || qualityPaymentBridgePreview?.summaryText || qualityPaymentBridgePreview?.previewOnlyNote || "");
  const qualityPaymentBridgeStatus = compactText(summary.qualityPaymentBridgeStatus || qualityPaymentBridgePreview?.qualityStatus || "");
  const qualityPaymentBridgeProofCompleteness = Number(summary.qualityPaymentBridgeProofCompleteness ?? qualityPaymentBridgePreview?.proofCompleteness ?? NaN);
  const qualityPaymentBridgeSettlementReadiness = compactText(summary.qualityPaymentBridgeSettlementReadiness || qualityPaymentBridgePreview?.settlementReadiness || "");
  const qualityPaymentBridgeImpactStatus = compactText(summary.qualityPaymentBridgeImpactStatus || qualityPaymentBridgePreview?.paymentPreviewImpact?.status || "");
  const qualityPaymentBridgeImpactReason = compactText(summary.qualityPaymentBridgeImpactReason || qualityPaymentBridgePreview?.paymentPreviewImpact?.reason || "");
  const qualityPaymentBridgeMissingProofs = compactList(summary.qualityPaymentBridgeMissingProofs || qualityPaymentBridgePreview?.missingProofs || [], 6);
  const qualityPaymentBridgeRiskReasons = compactList(summary.qualityPaymentBridgeRiskReasons || qualityPaymentBridgePreview?.riskReasons || [], 6);
  const qualityPaymentBridgeNextAction = compactText(summary.qualityPaymentBridgeNextAction || qualityPaymentBridgePreview?.nextBestAction || "");
  const qualityPaymentBridgePreviewNote = compactText(summary.qualityPaymentBridgePreviewNote || qualityPaymentBridgePreview?.previewOnlyNote || "Readonly önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.");
  const seferScorePreview = summary.seferScorePreview && typeof summary.seferScorePreview === "object"
    ? summary.seferScorePreview
    : null;
  const seferScoreSummaryText = compactText(summary.seferScoreSummaryText || seferScorePreview?.summaryText || seferScorePreview?.safeExplanation || "");
  const seferScoreValue = Number(summary.seferScoreValue ?? seferScorePreview?.score ?? NaN);
  const seferScoreMax = Number(summary.seferScoreMax ?? seferScorePreview?.scoreMax ?? 5) || 5;
  const seferScoreLevel = compactText(summary.seferScoreLevel || seferScorePreview?.level || "");
  const seferScoreConfidence = compactText(summary.seferScoreConfidence || seferScorePreview?.confidence || "");
  const seferScoreStatus = compactText(summary.seferScoreStatus || seferScorePreview?.status || "");
  const seferScoreSupplierLabel = compactText(summary.seferScoreSupplierLabel || seferScorePreview?.supplierLabel || "");
  const seferScorePositiveReasons = compactList(summary.seferScorePositiveReasons || seferScorePreview?.positiveReasons || [], 6);
  const seferScoreRiskReasons = compactList(summary.seferScoreRiskReasons || seferScorePreview?.riskReasons || [], 6);
  const seferScoreMissingSignals = compactList(summary.seferScoreMissingSignals || seferScorePreview?.missingSignals || [], 6);
  const seferScoreNextAction = compactText(summary.seferScoreNextAction || seferScorePreview?.nextBestAction || "");
  const seferScoreSafeExplanation = compactText(summary.seferScoreSafeExplanation || seferScorePreview?.safeExplanation || "Readonly kalite puanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.");
  const selectedRecordSummary = compactText([
    summary.selectedRecordSummary || buildSelectedSummary({
      statusText,
      roomName: roomName || compactText(summary.roomName || `Oda #${item?.roomId || "-"}`),
      startDate: summary.startDate || item?.startDate || "",
      endDate: summary.endDate || item?.endDate || "",
      sourceShiftId: safeInt(summary.sourceShiftId || summary.sourceShift?.id || item?.sourceShiftId || 0),
      generatedShiftCount: safeInt(summary.generatedShiftCount ?? summary.generatedCount ?? item?.generatedCount ?? 0),
      lastGeneratedShiftId: safeInt(summary.lastGeneratedShiftId || summary.lastGeneratedShift?.id || summary.lastShift?.id || item?.lastShift?.id || 0),
      lastGeneratedShiftStatus: summary.lastGeneratedShiftStatus || summary.lastGeneratedShift?.status || summary.lastShift?.status || "",
      lastGeneratedShiftStart: summary.lastGeneratedShiftStart || summary.lastGeneratedShift?.startAt || summary.lastShift?.startAt || "",
      lastGeneratedShiftEnd: summary.lastGeneratedShiftEnd || summary.lastGeneratedShift?.endAt || summary.lastShift?.endAt || "",
      personelCount: summary.personelCount ?? summary.lastGeneratedShift?.peopleCount ?? summary.lastShift?.peopleCount ?? 0,
      stopCount: summary.stopCount ?? summary.lastGeneratedShift?.stopCount ?? summary.lastShift?.stopCount ?? 0,
    }),
    routeRefreshSummaryText,
    qualityPaymentBridgeSummaryText ? `Kalite / hakediş: ${qualityPaymentBridgeSummaryText}` : "",
    seferScoreSummaryText ? `SeferPuanı: ${seferScoreSummaryText}` : "",
  ].filter(Boolean).join(" • "), "");

  const sourceShiftId = safeInt(summary.sourceShiftId || summary.sourceShift?.id || item?.sourceShiftId || 0);
  const generatedShiftCount = safeInt(summary.generatedShiftCount ?? summary.generatedCount ?? item?.generatedCount ?? 0);
  const lastGeneratedShiftId = safeInt(summary.lastGeneratedShiftId || summary.lastGeneratedShift?.id || summary.lastShift?.id || item?.lastShift?.id || 0);
  const lastGeneratedShiftStatus = compactText(summary.lastGeneratedShiftStatus || summary.lastGeneratedShift?.status || summary.lastShift?.status || "");
  const lastGeneratedShiftStart = compactText(summary.lastGeneratedShiftStart || summary.lastGeneratedShift?.startAt || summary.lastShift?.startAt || "");
  const lastGeneratedShiftEnd = compactText(summary.lastGeneratedShiftEnd || summary.lastGeneratedShift?.endAt || summary.lastShift?.endAt || "");
  const personelCount = safeInt(summary.personelCount ?? summary.lastGeneratedShift?.peopleCount ?? summary.lastShift?.peopleCount ?? 0);
  const stopCount = safeInt(summary.stopCount ?? summary.lastGeneratedShift?.stopCount ?? summary.lastShift?.stopCount ?? 0);
  const todayGeneratedShift = Boolean(summary.todayGeneratedShift ?? generatedShiftCount > 0);
  const pendingCount = safeInt(summary.pendingCount || 0);
  const otherCount = safeInt(summary.otherCount || 0);
  const extendCount = safeInt(summary.extendCount || 0);
  const shiftCount = safeInt(summary.shiftCount ?? generatedShiftCount ?? 0);
  const vehicleLabel = compactText(summary.vehicleLabel || summary.agreementVehicleLabel || (item?.vehicleId ? `#${item.vehicleId}` : ""));
  const driverLabel = compactText(summary.driverLabel || summary.agreementDriverLabel || (item?.driverId ? `#${item.driverId}` : ""));
  const hasProductionSignal = generatedShiftCount > 0 || todayGeneratedShift || Boolean(lastGeneratedShiftId);
  const status = compactText(statusText, "-");
  const roomLabel = compactText(summary.roomLabel || roomName || `Oda #${item?.roomId || "-"}`);
  const todayProductionSummary = todayGeneratedShift ? "Bugün üretim: Var" : "Bugün üretim: Yok";
  const productionSummary = hasProductionSignal
    ? `Bu sözleşme için bugün vardiya üretim sinyali görünüyor. Üretilen vardiya sayısı ${generatedShiftCount}${lastGeneratedShiftId ? ` • Son üretilen vardiya #${lastGeneratedShiftId}` : ""}`
    : "Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.";

  const signals = [
    { id: "screen-title", label: "Ekran", value: screenTitle, note: "Köprü yüzeyi." },
    { id: "selected-record", label: "Seçili kayıt", value: selectedRecordLabel, note: status ? `Durum: ${status}` : "Seçili sözleşme kaydı." },
    routeRefreshState || routeRefreshLabel || routeRefreshSummaryText ? { id: "route-refresh", label: "Rota güncellemesi", value: routeRefreshState || routeRefreshNote || "Yok", note: routeRefreshSummaryText || "Rota değişikliği sinyali okunuyor." } : null,
    dynamicSavingsSummaryText || dynamicSavingsCurrentText || dynamicSavingsProposedText ? {
      id: "dynamic-savings",
      label: "Tasarruf önizlemesi",
      value: dynamicSavingsReliability || (dynamicSavingsPreview?.ok ? "Tahmini" : "Yetersiz veri"),
      note: dynamicSavingsSummaryText || "Readonly tasarruf önizlemesi.",
    } : null,
    qualityPaymentBridgeSummaryText || qualityPaymentBridgeStatus || qualityPaymentBridgeSettlementReadiness || qualityPaymentBridgeNextAction ? {
      id: "quality-payment-bridge",
      label: "Kalite / hakediş",
      value: qualityPaymentBridgeStatus || (qualityPaymentBridgePreview?.previewOnly ? "Readonly önizleme" : "Yetersiz veri"),
      note: compactList([
        qualityPaymentBridgeSummaryText,
        qualityPaymentBridgeImpactStatus ? `Etkisi: ${qualityPaymentBridgeImpactStatus}` : "",
        qualityPaymentBridgeNextAction ? `Sıradaki işlem: ${qualityPaymentBridgeNextAction}` : "",
      ], 3).join(" • ") || qualityPaymentBridgePreviewNote || "Readonly kalite / hakediş önizlemesi.",
    } : null,
    seferScoreSummaryText || seferScoreStatus || seferScoreNextAction ? {
      id: "sefer-score",
      label: "SeferPuanı",
      value: Number.isFinite(seferScoreValue) ? `${seferScoreValue.toFixed(2)} / ${seferScoreMax.toFixed(0)}` : (seferScoreLevel || "Yetersiz veri"),
      note: compactList([
        seferScoreSummaryText,
        seferScoreStatus ? `Durum: ${seferScoreStatus}` : "",
        seferScoreNextAction ? `Sıradaki işlem: ${seferScoreNextAction}` : "",
      ], 3).join(" • ") || seferScoreSafeExplanation || "Readonly kalite puanı önizlemesi.",
    } : null,
    { id: "source-shift", label: "Kaynak vardiya", value: sourceShiftId ? `#${sourceShiftId}` : "Yok", note: sourceShiftId ? "Üretim kökü okunur." : "Kaynak vardiya bağlantısı görünmüyor." },
    { id: "generated-count", label: "Üretilen vardiya", value: generatedShiftCount > 0 ? String(generatedShiftCount) : "Yok", note: generatedShiftCount > 0 ? "Bugün üretim sinyali var." : "Bugün üretim sinyali görünmüyor." },
    { id: "last-generated", label: "Son üretilen vardiya", value: lastGeneratedShiftId ? `#${lastGeneratedShiftId}` : "Yok", note: lastGeneratedShiftStatus ? `Durum: ${lastGeneratedShiftStatus}` : "Son vardiya görünmüyor." },
    { id: "last-generated-time", label: "Son saat", value: formatRangeTR(lastGeneratedShiftStart, lastGeneratedShiftEnd) || "-", note: "Son üretim saat penceresi." },
    { id: "personel-count", label: "Personel", value: personelCount > 0 ? String(personelCount) : "-", note: personelCount > 0 ? "Vardiya personeli okunur." : "Personel bilgisi yok." },
    { id: "stop-count", label: "Durak", value: stopCount > 0 ? String(stopCount) : "-", note: stopCount > 0 ? "Vardiya durak sayısı okunur." : "Durak bilgisi yok." },
    { id: "today-generated", label: "Bugün üretim", value: todayGeneratedShift ? "Var" : "Yok", note: todayGeneratedShift ? "Bugün üretim sinyali var." : "Bugün üretim sinyali yok." },
    vehicleLabel ? { id: "vehicle", label: "Araç", value: vehicleLabel, note: "Atanan araç." } : null,
    driverLabel ? { id: "driver", label: "Sürücü", value: driverLabel, note: "Atanan sürücü." } : null,
  ].filter(Boolean);

  const diagnosticPriority = buildDiagnosticPriority({
    screenType: "AGREEMENTS",
    stage: status,
    readiness: hasProductionSignal ? "READY" : "REVIEW_NEEDED",
    selectedRecordStatus: status,
    summary: selectedRecordSummary,
    blockers: hasProductionSignal ? [] : ["Üretim geçmişi görünmüyor"],
    evidence: [
      selectedRecordSummary ? `Seçili kayıt: ${selectedRecordSummary}` : "",
      routeRefreshSummaryText ? `Rota güncellemesi: ${routeRefreshSummaryText}` : "",
      sourceShiftId ? `Kaynak vardiya #${sourceShiftId}` : "",
      generatedShiftCount > 0 ? `Üretilen vardiya: ${generatedShiftCount}` : "",
      lastGeneratedShiftId ? `Son üretilen vardiya #${lastGeneratedShiftId}` : "",
      formatRangeTR(lastGeneratedShiftStart, lastGeneratedShiftEnd) ? `Son zaman: ${formatRangeTR(lastGeneratedShiftStart, lastGeneratedShiftEnd)}` : "",
      personelCount > 0 ? `Personel: ${personelCount}` : "",
      stopCount > 0 ? `Durak: ${stopCount}` : "",
      hasProductionSignal ? `Bugün üretim: Var` : `Bugün üretim: Yok`,
    ].filter(Boolean),
    copilotSignals: signals,
    counters: {
      pendingCount,
      otherCount,
      extendCount,
      shiftCount,
      sourceShiftId,
      generatedShiftCount,
      lastGeneratedShiftId,
      personelCount,
      stopCount,
      todayGeneratedShift: todayGeneratedShift ? 1 : 0,
    },
  });

  const liveFactConfidence = {
    summary: [
      hasProductionSignal
        ? "Ekrandan gelen sinyal var. Seçili kayıttan gelen sinyal var. Genel workflow bilgisi var. Üretim köprüsü açık."
        : "Ekrandan gelen sinyal var. Seçili kayıttan gelen sinyal var. Genel workflow bilgisi var. Sinyal eksik, bu yüzden kesin konuşulamaz.",
      dynamicSavingsSummaryText ? "Tasarruf önizlemesi de okunuyor." : "",
    ].filter(Boolean).join(" "),
    rows: [
      normalizeCopilotSignal({
        id: "screen-signal",
        label: "Ekrandaki sinyal",
        value: screenTitle,
        note: "Köprü ekranı okunuyor.",
      }),
      normalizeCopilotSignal({
        id: "selected-record",
        label: "Seçili kayıt",
        value: selectedRecordLabel,
        note: status ? `Durum: ${status}` : "Seçili kayıt okunuyor.",
      }),
      ...(routeRefreshState || routeRefreshLabel || routeRefreshSummaryText ? [normalizeCopilotSignal({
        id: "route-refresh",
        label: "Rota güncellemesi",
        value: routeRefreshState || routeRefreshNote || "Yok",
        note: routeRefreshSummaryText || "Rota değişikliği sinyali okunuyor.",
      })] : []),
      ...(dynamicSavingsSummaryText || dynamicSavingsCurrentText || dynamicSavingsProposedText ? [normalizeCopilotSignal({
        id: "dynamic-savings",
        label: "Tasarruf önizlemesi",
        value: dynamicSavingsReliability || (dynamicSavingsPreview?.ok ? "Tahmini" : "Yetersiz veri"),
        note: dynamicSavingsSummaryText || "Readonly tasarruf önizlemesi.",
      })] : []),
      ...(qualityPaymentBridgeSummaryText || qualityPaymentBridgeStatus || qualityPaymentBridgeSettlementReadiness || qualityPaymentBridgeNextAction ? [normalizeCopilotSignal({
        id: "quality-payment-bridge",
        label: "Kalite / hakediş",
        value: qualityPaymentBridgeStatus || (qualityPaymentBridgePreview?.previewOnly ? "Readonly önizleme" : "Yetersiz veri"),
        note: qualityPaymentBridgeSummaryText || qualityPaymentBridgePreviewNote || "Readonly kalite / hakediş önizlemesi.",
      })] : []),
      ...(seferScoreSummaryText || seferScoreStatus || seferScoreNextAction ? [normalizeCopilotSignal({
        id: "sefer-score",
        label: "SeferPuanı",
        value: Number.isFinite(seferScoreValue) ? `${seferScoreValue.toFixed(2)} / ${seferScoreMax.toFixed(0)}` : (seferScoreLevel || "Yetersiz veri"),
        note: seferScoreSummaryText || seferScoreSafeExplanation || "Readonly kalite puanı önizlemesi.",
      })] : []),
      normalizeCopilotSignal({
        id: "workflow-signal",
        label: "Genel workflow",
        value: hasProductionSignal ? "Üretim köprüsü açık" : "Kontrol gerekli",
        note: hasProductionSignal ? "Sözleşme → vardiya üretim yolu okunuyor." : "Üretim yolu henüz doğrulanmıyor.",
      }),
      normalizeCopilotSignal({
        id: "missing-signal",
        label: "Sinyal eksik",
        value: hasProductionSignal ? "Belirgin eksik yok" : "Üretim geçmişi",
        note: hasProductionSignal ? "Kesinleşen üretim sinyali var." : "Kesinleşen üretim sinyali yok.",
      }),
    ],
  };

  const actionSimulation = buildActionSimulationWording({
    screenType: "AGREEMENTS",
    diagnosticPriority,
  });

  return {
    screenType: "AGREEMENTS",
    screenPath,
    screenTitle,
    selectedRecordType,
    selectedRecordLabel,
    selectedRecordId,
    selectedRecordStatus: status,
    selectedRecordSummary,
    stage: status,
    readiness: hasProductionSignal ? "READY" : (["ACTIVE", "APPROVED"].includes(status) ? "READY" : "REVIEW_NEEDED"),
    readinessScore: hasProductionSignal ? 90 : (["ACTIVE", "APPROVED"].includes(status) ? 80 : 66),
    blockers: hasProductionSignal ? [] : compactText(summary.blockers?.[0] || "Üretim geçmişi görünmüyor", "Üretim geçmişi görünmüyor") ? [compactText(summary.blockers?.[0] || "Üretim geçmişi görünmüyor", "Üretim geçmişi görünmüyor")] : [],
    missing: hasProductionSignal ? [] : ["Üretim geçmişi"],
    counters: {
      pendingCount,
      otherCount,
      extendCount,
      shiftCount,
      sourceShiftId,
      generatedShiftCount,
      lastGeneratedShiftId,
      personelCount,
      stopCount,
      todayGeneratedShift: todayGeneratedShift ? 1 : 0,
    },
    evidence: signals.slice(0, 8).map((signal) => `${signal.label}: ${signal.value}`),
    reasoningLead: hasProductionSignal
      ? "Bu sözleşmede üretim köprüsü açık; önce üretim geçmişi ve bugünkü vardiyaları birlikte oku."
      : "Bu sözleşmede önce üretim geçmişi ve bugünkü vardiyalar kontrol edilmeli.",
    nextBestAction: hasProductionSignal
      ? "Üretim geçmişini aç, bugünkü vardiyalar listesini kontrol et ve son üretilen vardiyayı doğrula."
      : "Üretim geçmişini veya bugünkü vardiyalar listesini kontrol et.",
    safestNextStep: hasProductionSignal
      ? "En risksiz adım, ilgili sözleşmede üretim geçmişini ve bugünkü vardiyaları birlikte kontrol etmektir."
      : "En risksiz adım, üretim geçmişini veya bugünkü vardiyalar listesini açmaktır.",
    compareHint: "Sözleşme onayı, üretim köprüsü ve bugünkü vardiya aynı şey değildir; köprü sinyali ayrı okunur.",
    liveFactConfidence,
    diagnosticPriority,
    actionSimulation: String(actionSimulation || '')
      .replace(/^(?:Önerilen adım|Öneri)\s*:\s*/i, '')
      .replace(/^(?:Önerilen adım|Öneri)\s+/i, '')
      .trim(),
    copilotSignals: signals,
    copilotSummary: [
      productionSummary,
      todayProductionSummary,
      dynamicSavingsSummaryText,
      buildCopilotSignalSummary(signals, 5),
    ].filter(Boolean).join(' • '),
    copilotBoundary: [
      "Sözleşme",
      "Rota güncellemesi",
      "Sürücünün telefon GPS’i",
      "Araç GPS’i",
      "Hakediş önizlemesi",
    ],
    summary: productionSummary,
    vehicleLabel,
    driverLabel,
    generationHistory: Array.isArray(summary.generationHistory) ? summary.generationHistory.slice(0, 3) : [],
    productionSignal: productionSummary,
    todayGeneratedShift: todayGeneratedShift ? "Var" : "Yok",
    sourceShiftId,
    generatedShiftCount,
    lastGeneratedShiftId,
    lastGeneratedShiftStatus,
    lastGeneratedShiftStart,
    lastGeneratedShiftEnd,
    personelCount,
    stopCount,
    roomLabel,
    routeRefreshState,
    routeRefreshLabel,
    routeRefreshNote,
    routeRefreshSummaryText,
    routeRefreshChangeType,
    routeRefreshCurrentText,
    routeRefreshProposedText,
    routeRefreshDiffText,
    routeRefreshPriceImpactText,
    routeRefreshRoomCounterText,
    routeRefreshCurrentPreviewShiftId,
    routeRefreshProposedPreviewShiftId,
    routeRefreshRequestId,
    dynamicSavingsPreview,
    dynamicSavingsSummaryText,
    dynamicSavingsCurrentText,
    dynamicSavingsProposedText,
    dynamicSavingsDiffText,
    dynamicSavingsKmSavingsText,
    dynamicSavingsDurationSavingsText,
    dynamicSavingsCapacityEffectText,
    dynamicSavingsApproxCostText,
    dynamicSavingsBoundaryText,
    dynamicSavingsNextBestAction,
    dynamicSavingsReliability,
    qualityPaymentBridgePreview,
    qualityPaymentBridgeSummaryText,
    qualityPaymentBridgeStatus,
    qualityPaymentBridgeProofCompleteness,
    qualityPaymentBridgeSettlementReadiness,
    qualityPaymentBridgeImpactStatus,
    qualityPaymentBridgeImpactReason,
    qualityPaymentBridgeMissingProofs,
    qualityPaymentBridgeRiskReasons,
    qualityPaymentBridgeNextAction,
    qualityPaymentBridgePreviewNote,
    seferScorePreview,
    seferScoreSummaryText,
    seferScoreValue,
    seferScoreMax,
    seferScoreLevel,
    seferScoreConfidence,
    seferScoreStatus,
    seferScoreSupplierLabel,
    seferScorePositiveReasons,
    seferScoreRiskReasons,
    seferScoreMissingSignals,
    seferScoreNextAction,
    seferScoreSafeExplanation,
  };
}
