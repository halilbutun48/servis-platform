import { Router } from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { getPilotLaunchGateManifest } from "../ops/pilotLaunchGateManifest.js";
import { buildFieldPrepPacket } from "../ops/fieldPrepPacket.js";
import { buildFieldFeedbackLoopPacket, getFieldFeedbackRecordById, listFieldFeedbackRecords, updateFieldFeedbackRecordStatus, upsertFieldFeedbackRecord } from "../ops/fieldFeedbackLoop.js";

export const pilotLaunchGateRouter = Router();

pilotLaunchGateRouter.get('/manifest', (_req, res) => {
  res.json({ ok: true, manifest: getPilotLaunchGateManifest() });
});

pilotLaunchGateRouter.get('/decision-template', (_req, res) => {
  res.json({ ok: true, decision: { status: 'LIMITED_GO', reason: 'Checklist tamamlanmadi', blockingItems: [], notes: [] } });
});

pilotLaunchGateRouter.get('/risk-template', (_req, res) => {
  res.json({ ok: true, risks: [{ severity: 'MEDIUM', title: 'Ornek risk', owner: 'SUPER_ADMIN' }] });
});

pilotLaunchGateRouter.get('/field-prep-packet', authRequired(), requireRole('SUPER_ADMIN'), async (_req, res, next) => {
  try {
    const packet = await buildFieldPrepPacket();
    return res.json({ ok: true, packet });
  } catch (error) {
    return next(error);
  }
});


pilotLaunchGateRouter.get('/field-feedback-loop', authRequired(), requireRole('SUPER_ADMIN'), async (_req, res, next) => {
  try {
    const packet = await buildFieldFeedbackLoopPacket();
    return res.json({ ok: true, packet });
  } catch (error) {
    return next(error);
  }
});

pilotLaunchGateRouter.get('/field-feedback-loop/records', authRequired(), requireRole('SUPER_ADMIN', 'ROOM', 'COMPANY', 'DRIVER'), async (req, res, next) => {
  try {
    const requestedRole = String(req.query?.role || '').trim().toUpperCase();
    const roleFilter = req.user?.role === 'SUPER_ADMIN' ? requestedRole || 'ALL' : String(req.user?.role || '').trim().toUpperCase();
    const items = await listFieldFeedbackRecords({
      roleId: roleFilter,
      status: req.query?.status,
      severity: req.query?.severity,
      surface: req.query?.surface,
      query: req.query?.query,
    });
    return res.json({ ok: true, items });
  } catch (error) {
    return next(error);
  }
});

pilotLaunchGateRouter.post('/field-feedback-loop/records', authRequired(), requireRole('SUPER_ADMIN', 'ROOM', 'COMPANY', 'DRIVER'), async (req, res, next) => {
  try {
    const payload = { ...(req.body || {}) };
    if (req.user?.role !== 'SUPER_ADMIN') {
      payload.reportedByRole = req.user?.role;
      payload.ownerRole = req.user?.role;
      if (String(payload.status || '').trim().toUpperCase() === 'KAPANDI') payload.status = 'GORULDU';
    }
    const saved = await upsertFieldFeedbackRecord(payload, req.user);
    return res.status(201).json({ ok: true, item: saved });
  } catch (error) {
    return next(error);
  }
});

pilotLaunchGateRouter.post('/field-feedback-loop/records/:id/status', authRequired(), requireRole('SUPER_ADMIN', 'ROOM', 'COMPANY'), async (req, res, next) => {
  try {
    const current = await getFieldFeedbackRecordById(req.params.id);
    if (!current) return res.status(404).json({ error: 'FIELD_FEEDBACK_NOT_FOUND' });
    const actorRole = String(req.user?.role || '').trim().toUpperCase();
    if (actorRole !== 'SUPER_ADMIN' && actorRole !== String(current.ownerRole || '').trim().toUpperCase() && actorRole !== String(current.reportedByRole || '').trim().toUpperCase()) {
      return res.status(403).json({ error: 'FIELD_FEEDBACK_STATUS_FORBIDDEN' });
    }
    const saved = await updateFieldFeedbackRecordStatus(req.params.id, req.body?.status, req.body?.note, req.user);
    return res.json({ ok: true, item: saved });
  } catch (error) {
    return next(error);
  }
});
