import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import {
  getTrustQualityManifest,
  buildServiceEvaluationTemplate,
  buildProviderSignalTemplate,
  buildCompanyServiceEvaluationSummary,
  buildCompanyServiceEvaluationItems,
  submitCompanyServiceEvaluation,
  getProviderScore,
} from "../ops/trustQualityManifest.js";

export function trustQualityRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => res.json(getTrustQualityManifest()));
  r.get("/evaluation-template", authRequired(), async (_req, res) => res.json(buildServiceEvaluationTemplate()));
  r.get("/provider-signal-template", authRequired(), async (_req, res) => res.json(buildProviderSignalTemplate()));

  r.get("/company/summary", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    return res.json(await buildCompanyServiceEvaluationSummary(req.user));
  });
  r.get("/company/items", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    return res.json({ items: await buildCompanyServiceEvaluationItems(req.user) });
  });
  r.post("/company/evaluations", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    try {
      const saved = await submitCompanyServiceEvaluation(req.user, req.body || {});
      return res.json({ ok: true, item: saved });
    } catch (e) {
      return res.status(400).json({ ok: false, message: e?.message || String(e) });
    }
  });
  r.get("/provider-score/:roomId", authRequired(), requireRole("COMPANY", "SCHOOL", "ORGANIZATION", "SUPER_ADMIN"), async (req, res) => {
    return res.json(await getProviderScore(req.params.roomId));
  });

  return r;
}
