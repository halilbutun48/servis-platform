// backend/src/routes/planBuilder.js
// ✅ M33.1: Plan Builder helpers (Stage-1)
// - OSRM table duration/distance matrix

import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
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


function companyIdOf(req) {
  const v = req.user?.companyId ?? req.me?.companyId ?? req.auth?.companyId;
  return v == null ? null : Number(v);
}

async function pingSolver(base, timeoutMs = 900) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(`${base}/health`, { method: "GET", signal: ctrl.signal });
    clearTimeout(t);
    return { reachable: true, ok: r.ok, status: r.status };
  } catch (e) {
    return { reachable: false, ok: false, error: e?.message || String(e) };
  }
}


export function planBuilderRouter() {
  const r = express.Router();

  r.use(authRequired(), requireRole("COMPANY", "SUPER_ADMIN"));


// GET /api/plan-builder/precheck
// Step-0 shared contract for Guided Flow
r.get("/precheck", async (req, res) => {
  const companyId = companyIdOf(req);
  if (!companyId) return res.status(400).json({ ok: false, error: "companyId missing" });

  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, hubLat: true, hubLng: true, name: true } });
  if (!c) return res.status(404).json({ ok: false, error: "Company not found" });

  const hubOk = c.hubLat != null && c.hubLng != null && !(Number(c.hubLat) === 0 && Number(c.hubLng) === 0);

  const total = await prisma.personel.count({ where: { companyId } });
  const missing = await prisma.personel.count({ where: { companyId, OR: [{ homeLat: null }, { homeLng: null }] } });
  const zero = await prisma.personel.count({ where: { companyId, homeLat: 0, homeLng: 0 } });
  const needsReview = await prisma.personel.count({ where: { companyId, geoStatus: "NEEDS_REVIEW" } });
  const failed = await prisma.personel.count({ where: { companyId, geoStatus: "FAILED" } });

  // OSRM is optional in default pack (compose profile not active)
  const osrmConfigured = Boolean(String(process.env.OSRM_URL || "").trim());
  let osrm = { configured: osrmConfigured, reachable: false, ok: false, error: null };
  if (osrmConfigured) {
    try {
      const out = await osrmTable(
        [
          { lat: 41.0082, lng: 28.9784 },
          { lat: 41.0122, lng: 28.9760 },
        ],
        { profile: "driving", timeoutMs: 1200 }
      );
      osrm = {
        configured: true,
        reachable: Boolean(out?.ok),
        ok: Boolean(out?.ok),
        error: out?.ok ? null : out?.error,
        detail: out?.detail,
      };
    } catch (e) {
      osrm = { configured: true, reachable: false, ok: false, error: "osrm:exception", detail: e?.message || String(e) };
    }
  }

  // Solver is optional; heuristic fallback exists
  const solverBase = String(process.env.PLAN_SOLVER_URL || "").trim().replace(/\/+$/g, "");
  const solverConfigured = Boolean(solverBase);
  const solverPing = solverConfigured ? await pingSolver(solverBase) : { reachable: false, ok: false, status: null };

  const durationsSec = [
    [0, 10, 20],
    [10, 0, 15],
    [20, 15, 0],
  ];
  const solved = await solveTsp(durationsSec, null, { preferOrtools: true, timeoutMs: 900 });

  return res.json({
    ok: true,
    companyId: c.id,
    companyName: c.name,
    companyHub: { ok: hubOk, hubLat: c.hubLat, hubLng: c.hubLng },
    personels: { total, missingLatLng: missing, zeroLatLng: zero, needsReview, failed },
    osrm,
    solver: {
      configured: solverConfigured,
      reachable: Boolean(solverPing.reachable),
      ok: Boolean(solverPing.ok),
      pingStatus: solverPing.status ?? null,
      mode: solved?.ok ? solved.solver : "unknown",
    },
    hints: [
      !hubOk ? "Company hub eksik/0,0 (Company → Hub ayarla)" : null,
      missing > 0 ? "Personel konumu eksik (geocode/import düzelt)" : null,
      zero > 0 ? "Personel konumu 0,0 var (geocode/import düzelt)" : null,
      needsReview > 0 ? "geoStatus=NEEDS_REVIEW personel var" : null,
      failed > 0 ? "geoStatus=FAILED personel var" : null,
      !osrm.ok ? "OSRM aktif değil (compose --profile osrm)" : null,
      !solverPing.ok ? "Solver aktif değil (compose --profile osrm)" : null,
    ].filter(Boolean),
  });
});

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
