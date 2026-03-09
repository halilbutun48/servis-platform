// backend/src/services/planSolve.js
// ✅ M33.2: Plan Builder Stage-2 (OR-Tools via optional solver service)
//
// Primary: call solver service (Python + OR-Tools) via HTTP.
// Fallback: nearest-neighbor heuristic (keeps UX usable even if solver is down).
//
// Env:
// - PLAN_SOLVER_URL: e.g. http://solver:8000 (no trailing slash)

import { ENV } from "../env.js";

function cleanBase(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/g, "");
}

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function safeCost(v) {
  if (v == null) return 1e9;
  const n = Number(v);
  return Number.isFinite(n) ? n : 1e9;
}

export function solveNearestNeighbor(durationsSec, { depotIndex = 0, returnToDepot = false } = {}) {
  const n = Array.isArray(durationsSec) ? durationsSec.length : 0;
  if (n < 2) return { ok: false, error: "notEnoughPoints" };
  const depot = Math.min(Math.max(0, Number(depotIndex) || 0), n - 1);

  const unvisited = new Set();
  for (let i = 0; i < n; i++) if (i !== depot) unvisited.add(i);

  const order = [depot];
  let cur = depot;
  while (unvisited.size) {
    let best = null;
    let bestCost = Infinity;
    for (const j of unvisited) {
      const c = safeCost(durationsSec?.[cur]?.[j]);
      if (c < bestCost) {
        bestCost = c;
        best = j;
      }
    }
    if (best == null) break;
    order.push(best);
    unvisited.delete(best);
    cur = best;
  }
  if (returnToDepot) order.push(depot);
  return { ok: true, solver: "heuristic", order };
}

function computeTotals(order, durationsSec, distancesM) {
  let totalS = 0;
  let totalM = 0;
  for (let k = 0; k < order.length - 1; k++) {
    const i = order[k];
    const j = order[k + 1];
    const ds = durationsSec?.[i]?.[j];
    if (!isFiniteNumber(ds)) return { ok: false, error: "unreachable" };
    totalS += ds;
    if (distancesM) {
      const dm = distancesM?.[i]?.[j];
      if (isFiniteNumber(dm)) totalM += dm;
    }
  }
  return { ok: true, totalDurationSec: Math.round(totalS), totalDistanceM: distancesM ? Math.round(totalM) : null };
}

export async function solveTsp(durationsSec, distancesM, opts = {}) {
  const { depotIndex = 0, returnToDepot = false, preferOrtools = true, timeoutMs = 2500 } = opts || {};
  const n = Array.isArray(durationsSec) ? durationsSec.length : 0;
  if (n < 2) return { ok: false, error: "notEnoughPoints" };

  const base = cleanBase(ENV.PLAN_SOLVER_URL) || "http://solver:8000";
  if (preferOrtools) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(`${base}/solve-tsp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationsSec, depotIndex, returnToDepot }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const json = await r.json().catch(() => null);
      if (r.ok && json?.ok && Array.isArray(json?.order)) {
        const totals = computeTotals(json.order, durationsSec, distancesM);
        if (!totals.ok) return { ok: false, error: totals.error, solver: "ortools" };
        return {
          ok: true,
          solver: "ortools",
          order: json.order,
          totalDurationSec: totals.totalDurationSec,
          totalDistanceM: totals.totalDistanceM,
        };
      }
      // fallthrough
    } catch {
      // fallthrough to heuristic
    }
  }

  const nn = solveNearestNeighbor(durationsSec, { depotIndex, returnToDepot });
  if (!nn.ok) return nn;
  const totals = computeTotals(nn.order, durationsSec, distancesM);
  if (!totals.ok) return { ok: false, error: totals.error, solver: nn.solver };
  return { ok: true, solver: nn.solver, order: nn.order, ...totals };
}
