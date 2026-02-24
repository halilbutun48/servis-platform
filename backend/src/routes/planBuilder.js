// backend/src/routes/planBuilder.js
// ✅ M33.1: Plan Builder helpers (Stage-1)
// - OSRM table duration/distance matrix

import express from "express";
import { z } from "zod";
import { authRequired, requireRole } from "../auth/middleware.js";
import { osrmTable } from "../services/osrmTable.js";
import { solveTsp } from "../services/planSolve.js";

const tableSchema = z.object({
  profile: z.enum(["driving", "car", "bike", "foot"]).optional(), // tolerate variants
  points: z
    .array(
      z.object({
        id: z.any().optional(),
        lat: z.number(),
        lng: z.number(),
      })
    )
    .min(2)
    .max(80),
});

const solveSchema = z.object({
  durationsSec: z.array(z.array(z.number().nullable())).min(2).max(80),
  distancesM: z.array(z.array(z.number().nullable())).optional(),
  pointIds: z.array(z.any()).optional(),
  depotIndex: z.number().int().min(0).optional(),
  returnToDepot: z.boolean().optional(),
  preferOrtools: z.boolean().optional(),
});

export function planBuilderRouter() {
  const r = express.Router();

  r.use(authRequired(), requireRole("COMPANY", "SUPER_ADMIN"));

  // POST /api/plan-builder/osrm-table
  // body: { points:[{lat,lng,id?}], profile?:"driving" }
  r.post("/osrm-table", async (req, res) => {
    const parsed = tableSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

    const profileRaw = String(parsed.data.profile || "driving").toLowerCase();
    const profile = profileRaw === "car" ? "driving" : profileRaw;

    const out = await osrmTable(parsed.data.points, { profile });
    // Keep OSRM optional: return 200 with ok=false on OSRM failures
    return res.json(out);
  });

  // POST /api/plan-builder/solve-vrp
  // Stage-2: single-vehicle TSP/VRP solve (order)
  // body: { durationsSec:[][], distancesM?:[][], pointIds?:[], depotIndex?:0, returnToDepot?:false, preferOrtools?:true }
  r.post("/solve-vrp", async (req, res) => {
    const parsed = solveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

    const { durationsSec, distancesM } = parsed.data;
    const n = Array.isArray(durationsSec) ? durationsSec.length : 0;
    // ensure square
    for (let i = 0; i < n; i++) {
      if (!Array.isArray(durationsSec[i]) || durationsSec[i].length !== n) {
        return res.status(400).json({ ok: false, error: "matrixNotSquare" });
      }
      if (distancesM && (!Array.isArray(distancesM[i]) || distancesM[i].length !== n)) {
        return res.status(400).json({ ok: false, error: "distanceMatrixNotSquare" });
      }
    }

    const depotIndex = Math.min(Math.max(0, Number(parsed.data.depotIndex ?? 0)), n - 1);
    const returnToDepot = Boolean(parsed.data.returnToDepot ?? false);
    const preferOrtools = parsed.data.preferOrtools !== false;

    const out = await solveTsp(durationsSec, distancesM || null, { depotIndex, returnToDepot, preferOrtools });
    if (!out?.ok) return res.json(out);

    const pointIds = Array.isArray(parsed.data.pointIds) && parsed.data.pointIds.length === n ? parsed.data.pointIds : null;
    const orderPointIds = pointIds ? out.order.map((i) => pointIds[i]) : null;

    return res.json({
      ok: true,
      solver: out.solver,
      order: out.order,
      orderPointIds,
      totalDurationSec: out.totalDurationSec,
      totalDistanceM: out.totalDistanceM,
    });
  });

  return r;
}
