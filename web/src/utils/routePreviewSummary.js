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
