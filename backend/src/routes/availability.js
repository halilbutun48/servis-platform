// backend/src/routes/availability.js
import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { checkShiftConflicts, conflictResponse } from "../services/shiftConflict.js";

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

r.get(
  "/",
  authRequired(),
  requireRole("ROOM", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const driverId = toIntOrNull(req.query.driverId);
      const vehicleId = toIntOrNull(req.query.vehicleId);
      const excludeShiftId = toIntOrNull(req.query.excludeShiftId);

      const startAt = toIsoOrNull(req.query.startAt);
      const endAt = toIsoOrNull(req.query.endAt);

      if (!startAt || !endAt) {
        return res.status(400).json({ error: "startAt/endAt required" });
      }
      if (!driverId && !vehicleId) {
        return res.status(400).json({ error: "driverId or vehicleId required" });
      }

      const conflicts = await checkShiftConflicts({
        driverId: driverId ?? undefined,
        vehicleId: vehicleId ?? undefined,
        startAt,
        endAt,
        excludeShiftId: excludeShiftId ?? undefined,
      });

      const cr = conflictResponse(conflicts);
      if (cr) return res.status(409).json(cr);

      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  }
);

export default r;
