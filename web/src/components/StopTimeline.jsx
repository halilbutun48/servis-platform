// web/src/components/StopTimeline.jsx
import { useMemo } from "react";

function isReached(s) {
  const st = String(s?.status || s?.state || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || st === "COMPLETED" || Boolean(s?.reachedAt) || Boolean(s?.reached);
}

export default function StopTimeline({ stops, nextStopId, selectedStopId, compact = true, onSelect }) {
  const items = useMemo(() => (Array.isArray(stops) ? stops : []), [stops]);

  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {items.map((s, i) => {
        const id = s?.id ?? s?.stopId ?? s?.order ?? `${i}`;
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
