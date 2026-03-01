// web/src/components/StopTimeline.jsx
import React from "react";

function normState(s) {
  return String(s || "").toUpperCase();
}

function isDone(stop) {
  const st = normState(stop?.state);
  return st === "REACHED" || st === "SKIPPED" || st === "DONE" || Boolean(stop?.reachedAt);
}

function stopStatus(stop, nextStopId) {
  const st = normState(stop?.state);
  if (nextStopId && stop?.id === nextStopId) return "NEXT";
  if (st === "REACHED" || st === "DONE" || stop?.reachedAt) return "REACHED";
  if (st === "SKIPPED") return "SKIPPED";
  if (st === "PENDING" || !st) return "PENDING";
  return st;
}

/**
 * StopTimeline
 * - stops: [{ id, order, name/title, state, reachedAt, remainingKm, etaMin }]
 * - nextStopId: highlight NEXT
 * - selectedStopId: optional selection highlight
 * - onSelect: optional click handler (stop => void)
 */
export default function StopTimeline({
  stops = [],
  nextStopId = null,
  selectedStopId = null,
  compact = true,
  onSelect = null,
}) {
  const items = Array.isArray(stops) ? [...stops] : [];
  items.sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

  if (!items.length) return <div className="muted">Durak yok.</div>;

  return (
    <div className={compact ? "stopTimeline compact" : "stopTimeline"}>
      {items.map((s, idx) => {
        const st = stopStatus(s, nextStopId);
        const label = `${s?.order ?? idx + 1} ${s?.name ?? s?.title ?? ""}`.trim() || "-";
        const isSel = selectedStopId && String(s?.id) === String(selectedStopId);

        const commonProps = {
          key: s?.id ?? label,
          className: "pill stopPill",
          "data-status": st,
          "data-selected": isSel ? "1" : "0",
          title: label,
          style: { cursor: onSelect ? "pointer" : "default" },
          onClick: onSelect ? () => onSelect(s) : undefined,
          type: onSelect ? "button" : undefined,
        };

        const chipText = compact ? (s?.order ?? idx + 1) : label;

        return onSelect ? (
          <button {...commonProps}>{chipText}</button>
        ) : (
          <span {...commonProps}>{chipText}</span>
        );
      })}
    </div>
  );
}

export function pickNextStopByRemainingKmOrEta(stops) {
  const arr = Array.isArray(stops) ? stops : [];
  const pending = arr.filter((s) => !isDone(s));
  if (!pending.length) return null;

  const km = pending
    .map((s) => ({ s, v: Number(s?.remainingKm) }))
    .filter((x) => Number.isFinite(x.v));
  if (km.length) km.sort((a, b) => a.v - b.v);
  if (km.length) return km[0].s;

  const eta = pending
    .map((s) => ({ s, v: Number(s?.etaMin) }))
    .filter((x) => Number.isFinite(x.v));
  if (eta.length) eta.sort((a, b) => a.v - b.v);
  if (eta.length) return eta[0].s;

  // fallback to first pending by order
  pending.sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
  return pending[0] || null;
}
