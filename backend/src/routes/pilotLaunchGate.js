import { Router } from "express";
import { getPilotLaunchGateManifest } from "../ops/pilotLaunchGateManifest.js";

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

