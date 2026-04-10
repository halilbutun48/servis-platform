// web/src/components/stopTimelineUtils.js
function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isReached(s) {
  const st = String(s?.status || s?.state || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || st === "COMPLETED" || Boolean(s?.reachedAt) || Boolean(s?.reached);
}

/**
 * Pick NEXT stop by smallest remainingKm (preferred), fallback to smallest etaMin.
 * Ignores reached stops.
 */
export function pickNextStopByRemainingKmOrEta(stops) {
  const arr = Array.isArray(stops) ? stops : [];
  const cand = arr.filter((s) => s && !isReached(s));

  let best = null;
  for (const s of cand) {
    const km = asNum(s?.remainingKm);
    if (km == null) continue;
    if (!best || km < asNum(best?.remainingKm)) best = s;
  }
  if (best) return best;

  for (const s of cand) {
    const eta = asNum(s?.etaMin);
    if (eta == null) continue;
    if (!best || eta < asNum(best?.etaMin)) best = s;
  }
  return best;
}
