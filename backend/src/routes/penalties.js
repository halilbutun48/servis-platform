import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { prisma } from "../prisma.js";
import { cancelPenalty, createNoShowPenalty, normalizePenalty } from "../lib/penalties.js";

export function penaltiesRouter(_io) {
  const r = express.Router();

  r.post('/no-show', authRequired(), requireRole('ROOM', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const row = await createNoShowPenalty({
        driverId: req.body?.driverId,
        shiftId: req.body?.shiftId,
        reason: req.body?.reason,
        durationDays: req.body?.durationDays,
        createdByUserId: req.user?.id,
      });
      await audit(req, { action: 'DRIVER_NO_SHOW_CREATE', entity: 'DriverPenalty', entityId: row.id, meta: { driverId: row.driverId, shiftId: row.shiftId, endsAt: row.endsAt } });
      return res.json({ ok: true, item: row });
    } catch (e) {
      return res.status(e?.status || 500).json({ error: e?.message || 'Penalty create failed', code: e?.code || null, penalty: e?.penalty || null });
    }
  });

  r.get('/drivers/:driverId', authRequired(), requireRole('ROOM', 'COMPANY', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const driverId = Number(req.params.driverId || 0);
      if (!driverId) return res.status(400).json({ error: 'bad driverId' });
      const rows = await prisma.driverPenalty.findMany({
        where: { driverId },
        include: { shift: true, createdBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: [{ createdAt: 'desc' }],
      });
      return res.json({ ok: true, items: rows.map(normalizePenalty) });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  });

  r.post('/:id/cancel', authRequired(), requireRole('ROOM', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const row = await cancelPenalty(req.params.id);
      await audit(req, { action: 'DRIVER_NO_SHOW_CANCEL', entity: 'DriverPenalty', entityId: row.id, meta: { driverId: row.driverId } });
      return res.json({ ok: true, item: row });
    } catch (e) {
      return res.status(e?.status || 500).json({ error: String(e?.message || e) });
    }
  });

  return r;
}

export default penaltiesRouter;
