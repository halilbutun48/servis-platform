// web/src/components/StopTimeline.jsx
import { useMemo } from "react";

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function isReached(s) {
  const st = String(s?.status || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || Boolean(s?.reachedAt) || Boolean(s?.reached);
}

/**
 * Pick NEXT stop by smallest remainingKm (preferred), fallback to smallest etaMin.
 * Ignores reached stops.
 */
export function pickNextStopByRemainingKmOrEta(stops) {
  const arr = Array.isArray(stops) ? stops : [];
  const cand = arr.filter((s) => s && !isReached(s));

  let best = null;
  // 1) remainingKm
  for (const s of cand) {
    const km = asNum(s?.remainingKm);
    if (km == null) continue;
    if (!best || km < asNum(best?.remainingKm)) best = s;
  }
  if (best) return best;

  // 2) etaMin fallback
  for (const s of cand) {
    const eta = asNum(s?.etaMin);
    if (eta == null) continue;
    if (!best || eta < asNum(best?.etaMin)) best = s;
  }
  return best;
}

export default function StopTimeline({ stops, nextStopId, selectedStopId, compact = true, onSelect }) {
  const items = useMemo(() => (Array.isArray(stops) ? stops : []), [stops]);

  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {items.map((s, i) => {
        const id = s?.id ?? `${i}`;
        const order = s?.order ?? (i + 1);
        const name = s?.name ?? s?.title ?? `Durak ${order}`;
        const reached = isReached(s);
        const isNext = nextStopId != null && String(nextStopId) === String(id);
        const isSel = selectedStopId != null && String(selectedStopId) === String(id);

        const style = {
          width: compact ? 26 : 30,
          height: compact ? 26 : 30,
          padding: 0,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #334155",
          background: "rgba(148,163,184,.10)",
          color: "#e7eefc",
          fontWeight: 900,
          cursor: "pointer",
          userSelect: "none",
          outline: isSel ? "2px solid rgba(148,163,184,.55)" : "none",
          outlineOffset: 1,
          ...(reached
            ? { borderColor: "#22c55e", background: "rgba(34,197,94,.16)", color: "#bbf7d0" }
            : {}),
          ...(isNext
            ? { borderColor: "#f59e0b", background: "rgba(245,158,11,.16)", color: "#fde68a" }
            : {}),
        };

        return (
          <button
            key={String(id)}
            type="button"
            className="pill"
            style={style}
            title={name}
            onClick={() => onSelect?.(s)}
          >
            {order}
          </button>
        );
      })}
    </div>
  );
}
