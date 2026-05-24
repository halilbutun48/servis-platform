export function summarizeRoutePreview(payload) {
  const summary = payload?.summary || {};
  const stops = Array.isArray(payload?.stops) ? payload.stops : [];
  const people = Array.isArray(payload?.people) ? payload.people : [];

  const distanceCandidates = [
    summary?.distanceM,
    summary?.routeDistanceM,
    summary?.routeSnapshotDistanceM,
    payload?.routeSnapshotDistanceM,
    Number.isFinite(Number(summary?.distanceKmSnapshot)) ? Number(summary.distanceKmSnapshot) * 1000 : null,
    Number.isFinite(Number(summary?.distanceKmLearned)) ? Number(summary.distanceKmLearned) * 1000 : null,
    Number.isFinite(Number(summary?.distanceKm)) ? Number(summary.distanceKm) * 1000 : null,
  ];
  const durationCandidates = [
    summary?.durationSec,
    summary?.routeDurationSec,
    summary?.routeSnapshotDurationSec,
    payload?.routeSnapshotDurationSec,
    Number.isFinite(Number(summary?.durationMinSnapshot)) ? Number(summary.durationMinSnapshot) * 60 : null,
    Number.isFinite(Number(summary?.durationMinLearned)) ? Number(summary.durationMinLearned) * 60 : null,
    Number.isFinite(Number(summary?.durationMin)) ? Number(summary.durationMin) * 60 : null,
  ];
  const firstFinite = (list) => {
    for (const value of list) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  };

  return {
    peopleCount: Math.max(0, Number(summary?.peopleCount ?? people.length ?? 0) || 0),
    stopCount: Math.max(0, Number(summary?.stopCount ?? stops.length ?? 0) || 0),
    distanceM: Math.max(0, firstFinite(distanceCandidates)),
    durationSec: Math.max(0, firstFinite(durationCandidates)),
  };
}

export function formatKm(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  const km = n / 1000;
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

export function formatDuration(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${Math.round(n / 60)} dk`;
}

export function routeSummaryText(summary, fallback = null) {
  const src = summary || fallback || {};
  return [
    `${Math.max(0, Number(src?.peopleCount || 0))} personel`,
    `${Math.max(0, Number(src?.stopCount || 0))} durak`,
    formatKm(src?.distanceM),
    formatDuration(src?.durationSec),
  ].join(" · ");
}

export function routeDiffText(currentSummary, proposedSummary, options = {}) {
  const current = currentSummary || {};
  const proposed = proposedSummary || {};
  const emptyText = options.emptyText || "Kişi / durak / km / süre farkı yok";
  const showNegativeMetricSign = options.showNegativeMetricSign !== false;
  const metricPrefix = (delta) => {
    if (delta > 0) return "+";
    return showNegativeMetricSign ? "-" : "";
  };
  const parts = [];
  const peopleDelta = Number(proposed?.peopleCount || 0) - Number(current?.peopleCount || 0);
  const stopDelta = Number(proposed?.stopCount || 0) - Number(current?.stopCount || 0);
  const distanceDelta = Number(proposed?.distanceM || 0) - Number(current?.distanceM || 0);
  const durationDelta = Number(proposed?.durationSec || 0) - Number(current?.durationSec || 0);
  if (peopleDelta) parts.push(`${peopleDelta > 0 ? "+" : ""}${peopleDelta} personel`);
  if (stopDelta) parts.push(`${stopDelta > 0 ? "+" : ""}${stopDelta} durak`);
  if (distanceDelta) parts.push(`${metricPrefix(distanceDelta)}${formatKm(Math.abs(distanceDelta))}`);
  if (durationDelta) parts.push(`${metricPrefix(durationDelta)}${formatDuration(Math.abs(durationDelta))}`);
  return parts.length ? parts.join(" · ") : emptyText;
}

export function buildDynamicSavingsPreview({
  currentSummary = null,
  proposedSummary = null,
  title = "Dinamik tasarruf önizlemesi",
  fallbackText = "Tasarruf hesabı için yeterli veri yok",
  previewOnlyNote = "Readonly önizleme: Bu sadece önizlemedir. Uygulama, ödeme ve settlement yok.",
  nextBestAction = "Bu sadece önizlemedir; teklif / kabul akışını doğrula.",
  costRatePerKm = 12,
  costRatePerMinute = 1.5,
} = {}) {
  const current = {
    peopleCount: Math.max(0, Number(currentSummary?.peopleCount || 0) || 0),
    stopCount: Math.max(0, Number(currentSummary?.stopCount || 0) || 0),
    distanceM: Math.max(0, Number(currentSummary?.distanceM || 0) || 0),
    durationSec: Math.max(0, Number(currentSummary?.durationSec || 0) || 0),
  };
  const proposed = {
    peopleCount: Math.max(0, Number(proposedSummary?.peopleCount || 0) || 0),
    stopCount: Math.max(0, Number(proposedSummary?.stopCount || 0) || 0),
    distanceM: Math.max(0, Number(proposedSummary?.distanceM || 0) || 0),
    durationSec: Math.max(0, Number(proposedSummary?.durationSec || 0) || 0),
  };

  const hasDistance = Number.isFinite(current.distanceM) && Number.isFinite(proposed.distanceM) && current.distanceM > 0 && proposed.distanceM > 0;
  const hasDuration = Number.isFinite(current.durationSec) && Number.isFinite(proposed.durationSec) && current.durationSec > 0 && proposed.durationSec > 0;
  const hasCoreData = hasDistance && hasDuration;
  const currentRouteText = routeSummaryText(current);
  const proposedRouteText = routeSummaryText(proposed);

  if (!hasCoreData) {
    return {
      ok: false,
      title,
      fallbackText,
      summaryText: fallbackText,
      previewOnlyNote,
      nextBestAction,
      currentRouteText,
      proposedRouteText,
      diffText: fallbackText,
      kmSavingsText: fallbackText,
      durationSavingsText: fallbackText,
      capacityEffectText: fallbackText,
      approxCostText: fallbackText,
      reliability: "Yetersiz veri",
      warnings: ["Tasarruf hesabı için yeterli veri yok"],
      currentSummary: current,
      proposedSummary: proposed,
      currentPeopleCount: current.peopleCount,
      proposedPeopleCount: proposed.peopleCount,
      currentStopCount: current.stopCount,
      proposedStopCount: proposed.stopCount,
      currentDistanceKm: current.distanceM / 1000,
      proposedDistanceKm: proposed.distanceM / 1000,
      distanceDeltaKm: (current.distanceM - proposed.distanceM) / 1000,
      currentDurationMin: current.durationSec / 60,
      proposedDurationMin: proposed.durationSec / 60,
      durationDeltaMin: (current.durationSec - proposed.durationSec) / 60,
    };
  }

  const distanceDeltaKm = (current.distanceM - proposed.distanceM) / 1000;
  const durationDeltaMin = (current.durationSec - proposed.durationSec) / 60;
  const peopleDelta = current.peopleCount - proposed.peopleCount;
  const stopDelta = current.stopCount - proposed.stopCount;
  const savingsParts = [];
  const formatDeltaKm = (value) => {
    const n = Math.abs(Number(value || 0));
    if (!Number.isFinite(n) || n <= 0) return "";
    return n >= 10 ? `${Math.round(n)} km` : `${n.toFixed(1)} km`;
  };
  const formatDeltaMin = (value) => {
    const n = Math.abs(Number(value || 0));
    if (!Number.isFinite(n) || n <= 0) return "";
    return `${Math.round(n)} dk`;
  };
  const formatMoney = (value) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.abs(Math.round(Number(value || 0))));

  if (distanceDeltaKm !== 0) {
    savingsParts.push(distanceDeltaKm > 0 ? `${formatDeltaKm(distanceDeltaKm)} km tasarruf` : `${formatDeltaKm(distanceDeltaKm)} km artış`);
  }
  if (durationDeltaMin !== 0) {
    savingsParts.push(durationDeltaMin > 0 ? `${formatDeltaMin(durationDeltaMin)} dk tasarruf` : `${formatDeltaMin(durationDeltaMin)} dk artış`);
  }

  const capacityParts = [];
  if (peopleDelta !== 0) capacityParts.push(peopleDelta > 0 ? `${peopleDelta} kişi daha az` : `${Math.abs(peopleDelta)} kişi daha fazla`);
  if (stopDelta !== 0) capacityParts.push(stopDelta > 0 ? `${stopDelta} durak daha az` : `${Math.abs(stopDelta)} durak daha fazla`);

  const approxCostDelta = Math.round((distanceDeltaKm * Number(costRatePerKm || 0)) + (durationDeltaMin * Number(costRatePerMinute || 0)));
  const approxCostText = approxCostDelta > 0
    ? `Yaklaşık ₺${formatMoney(approxCostDelta)} tasarruf`
    : approxCostDelta < 0
      ? `Yaklaşık ₺${formatMoney(approxCostDelta)} maliyet artışı`
      : "Yaklaşık maliyet etkisi nötr";

  const diffText = savingsParts.length ? savingsParts.join(" • ") : "Belirgin tasarruf farkı yok";
  const capacityEffectText = capacityParts.length ? capacityParts.join(" • ") : "Belirgin kapasite etkisi yok";
  const summaryText = [title, diffText, capacityEffectText, approxCostText].filter(Boolean).join(" • ");

  return {
    ok: true,
    title,
    summaryText,
    previewOnlyNote,
    nextBestAction,
    currentRouteText,
    proposedRouteText,
    diffText,
    kmSavingsText: distanceDeltaKm !== 0 ? (distanceDeltaKm > 0 ? `${formatDeltaKm(distanceDeltaKm)} km tasarruf` : `${formatDeltaKm(distanceDeltaKm)} km artış`) : "Belirgin km farkı yok",
    durationSavingsText: durationDeltaMin !== 0 ? (durationDeltaMin > 0 ? `${formatDeltaMin(durationDeltaMin)} dk tasarruf` : `${formatDeltaMin(durationDeltaMin)} dk artış`) : "Belirgin süre farkı yok",
    capacityEffectText,
    approxCostText,
    reliability: "Tahmini",
    warnings: [],
    currentSummary: current,
    proposedSummary: proposed,
    currentPeopleCount: current.peopleCount,
    proposedPeopleCount: proposed.peopleCount,
    currentStopCount: current.stopCount,
    proposedStopCount: proposed.stopCount,
    currentDistanceKm: current.distanceM / 1000,
    proposedDistanceKm: proposed.distanceM / 1000,
    distanceDeltaKm,
    currentDurationMin: current.durationSec / 60,
    proposedDurationMin: proposed.durationSec / 60,
    durationDeltaMin,
  };
}
