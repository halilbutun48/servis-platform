import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { audit } from "../../audit.js";
import { emitStopProgressNotifs } from \"../../notifications/stopProgressNotifs.js\";

// NOTE: this file implements DRIVER endpoints under /api/shifts/*
// (pack scripts expect /api/shifts/:id/reached with body {order})

import { reachedSchema } from "./schemas.js";
// Avoid named imports from helpers to prevent hard crashes at module-load time in edge environments.
import * as H from "./helpers.js";

const getShiftAndCheckScopeOrThrow = H.getShiftAndCheckScopeOrThrow;
const emitShift = H.emitShift;

function normalizeStopState(raw) {
  const v = String(raw ?? "").toUpperCase();
  // backwards compat: some callers send status/state; "REOPEN" means go back to PENDING
  if (v === "REOPEN") return "PENDING";
  if (v === "REACHED" || v === "SKIPPED" || v === "PENDING") return v;
  // default
  return "REACHED";
}

function stopUpdateDataForState(state) {
  const now = new Date();
  if (state === "REACHED") return { state, reachedAt: now, skippedAt: null };
  if (state === "SKIPPED") return { state, skippedAt: now, reachedAt: null };
  // PENDING
  return { state: "PENDING", reachedAt: null, skippedAt: null };
}

export function attachShiftDriverRoutes(r, io) {
  // DRIVER: stop progress (REACHED/SKIPPED/PENDING)
  const reachedHandler = async (req, res) => {
    try {
      const shiftId = Number(req.params.id);
      if (!Number.isFinite(shiftId)) {
        return res.status(400).json({ error: "bad shiftId" });
      }

      const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

      if (shift.status !== "ACTIVE") {
        return res
          .status(400)
          .json({ error: "Shift must be ACTIVE to mark reached" });
      }

      // Pack scripts send: { order: 1 }
      const parsed = reachedSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: parsed.error?.issues?.[0]?.message ?? "bad payload" });
      }

      const order = Number(parsed.data.order);
      if (!Number.isFinite(order) || order < 1) {
        return res.status(400).json({ error: "bad order" });
      }

      // Optional compatibility: allow caller to override state/status.
      const state = normalizeStopState(req.body?.state ?? req.body?.status);

      const stop = await prisma.stop.findFirst({ where: { shiftId, order } });
      if (!stop) return res.status(404).json({ error: "Stop not found" });

      const updated = await prisma.stop.update({
        where: { id: stop.id },
        data: stopUpdateDataForState(state),
      });

      await audit(req, {
        action: "STOP_PROGRESS",
        entity: "Stop",
        entityId: updated.id,
        meta: { shiftId: shift.id, order, state: updated.state },
      });

      // notify route progress
      emitShift(io, shift, \"route:progress\", {
        stopId: updated.id,
        order,
        state: updated.state,
        reachedAt: updated.reachedAt,
        skippedAt: updated.skippedAt,
      });

      await emitStopProgressNotifs({ io, shiftId: shift.id, stop: updated, state: updated.state, source: \"DRIVER_REACHED\" });

      return res.json({ ok: true, stop: updated });
    } catch (e) {
      return res
        .status(e?.status ?? 500)
        .json({ error: String(e?.message ?? e) });
    }
  };

  r.post("/:id/reached", authRequired(), requireRole("DRIVER"), reachedHandler);
  r.post(
    "/:id/progress/reached",
    authRequired(),
    requireRole("DRIVER"),
    reachedHandler
  );
}
