// backend/src/routes/availability.js
import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { checkShiftConflicts, conflictResponse } from "../services/shiftConflict.js";
import {
  findAgreementConflictForRange,
  agreementConflictResponse,
} from "../services/agreementConflict.js";

const r = express.Router();

function toIntOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function toIsoOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function slimConflict(c) {
  if (!c) return null;
  const out = { code: c.code, message: c.message };
  if (c.conflictingShift?.id) out.conflictingShiftId = c.conflictingShift.id;
  if (c.conflictingAgreement?.id) out.conflictingAgreementId = c.conflictingAgreement.id;
  return out;
}

async function checkOne({ vehicleId, driverId, startAt, endAt, excludeShiftId }) {
  const row = {
    vehicleId: vehicleId ?? null,
    driverId: driverId ?? null,
    vehicleOk: true,
    vehicleConflict: null,
    driverOk: true,
    driverConflict: null,
  };

  // ✅ Agreement-first (deterministik)
  if (driverId) {
    const agDriver = await findAgreementConflictForRange({ driverId, startAt, endAt });
    if (agDriver) {
      row.driverOk = false;
      row.driverConflict = slimConflict(
        agreementConflictResponse({ kind: "driver", agreement: agDriver })
      );
    }
  }
  if (vehicleId) {
    const agVehicle = await findAgreementConflictForRange({ vehicleId, startAt, endAt });
    if (agVehicle) {
      row.vehicleOk = false;
      row.vehicleConflict = slimConflict(
        agreementConflictResponse({ kind: "vehicle", agreement: agVehicle })
      );
    }
  }

  // Shift conflict (sadece agreement OK ise)
  if (driverId && row.driverOk) {
    const cr = conflictResponse(
      await checkShiftConflicts({ driverId, startAt, endAt, excludeShiftId: excludeShiftId ?? undefined })
    );
    if (cr) {
      row.driverOk = false;
      row.driverConflict = slimConflict(cr);
    }
  }
  if (vehicleId && row.vehicleOk) {
    const cr = conflictResponse(
      await checkShiftConflicts({ vehicleId, startAt, endAt, excludeShiftId: excludeShiftId ?? undefined })
    );
    if (cr) {
      row.vehicleOk = false;
      row.vehicleConflict = slimConflict(cr);
    }
  }

  return row;
}

// GET /api/availability?startAt..&endAt..&driverId.. OR vehicleId..
// agreement-first
r.get("/", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  try {
    const driverId = toIntOrNull(req.query.driverId);
    const vehicleId = toIntOrNull(req.query.vehicleId);
    const excludeShiftId = toIntOrNull(req.query.excludeShiftId);

    const startAt = toIsoOrNull(req.query.startAt);
    const endAt = toIsoOrNull(req.query.endAt);

    if (!startAt || !endAt) return res.status(400).json({ error: "startAt/endAt required" });
    if (!driverId && !vehicleId) return res.status(400).json({ error: "driverId or vehicleId required" });

    const row = await checkOne({ vehicleId, driverId, startAt, endAt, excludeShiftId });

    if (vehicleId && !row.vehicleOk) return res.status(409).json(row.vehicleConflict);
    if (driverId && !row.driverOk) return res.status(409).json(row.driverConflict);

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// POST /api/availability/batch
// Body:
// { startAt, endAt, items:[{ vehicleId, driverId? }], excludeShiftId? }
r.post("/batch", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  try {
    const startAt = toIsoOrNull(req.body?.startAt);
    const endAt = toIsoOrNull(req.body?.endAt);
    const excludeShiftId = toIntOrNull(req.body?.excludeShiftId);

    if (!startAt || !endAt) return res.status(400).json({ error: "startAt/endAt required" });
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return res.status(400).json({ error: "endAt must be > startAt" });
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "items[] required" });
    if (items.length > 500) return res.status(400).json({ error: "items too large (max 500)" });

    // basit concurrency limit
    const limit = 10;
    let idx = 0;
    const out = [];

    async function worker() {
      while (idx < items.length) {
        const i = idx++;
        const it = items[i] || {};
        const vehicleId = toIntOrNull(it.vehicleId);
        const driverId = toIntOrNull(it.driverId);

        if (!vehicleId && !driverId) continue;

        const row = await checkOne({ vehicleId, driverId, startAt, endAt, excludeShiftId });
        out.push(row);
      }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));

    // stable order: vehicleId asc
    out.sort((a, b) => Number(a.vehicleId || 0) - Number(b.vehicleId || 0));

    return res.json({ ok: true, startAt, endAt, items: out });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
});

export default r;