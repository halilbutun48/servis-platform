import express from "express";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import {
  getTrustQualityManifest,
  buildServiceEvaluationTemplate,
  buildProviderSignalTemplate,
  buildCompanyServiceEvaluationSummary,
  buildCompanyServiceEvaluationItems,
  submitCompanyServiceEvaluation,
  getProviderScore,
} from "../ops/trustQualityManifest.js";
import { clearResponseCache, rememberResponse } from "../utils/responseCache.js";

export function trustQualityRouter() {
  const r = express.Router();

  function userScope(user) {
    return {
      role: user?.role,
      companyId: user?.companyId,
      roomId: user?.roomId,
      userId: user?.id,
    };
  }

  r.get("/manifest", authRequired(), async (_req, res) => res.json(getTrustQualityManifest()));
  r.get("/evaluation-template", authRequired(), async (req, res) => {
    const payload = await rememberResponse("trust-quality:evaluation-template", () => buildServiceEvaluationTemplate(), { ttlMs: 60000, scope: userScope(req.user) });
    return res.json(payload);
  });
  r.get("/provider-signal-template", authRequired(), async (req, res) => {
    const payload = await rememberResponse("trust-quality:provider-signal-template", () => buildProviderSignalTemplate(), { ttlMs: 60000, scope: userScope(req.user) });
    return res.json(payload);
  });

  r.get("/company/summary", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    const payload = await rememberResponse("trust-quality:company-summary", () => buildCompanyServiceEvaluationSummary(req.user), { ttlMs: 45000, scope: userScope(req.user) });
    return res.json(payload);
  });
  function applyTakeLimit(list, take) {
    return list.slice(0, take);
  }

  r.get("/company/items", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    const q = String(req.query?.q || "").trim().toLowerCase();
    const take = Math.min(200, Math.max(1, Number(req.query?.take || 60) || 60));
    const pendingOnly = String(req.query?.pendingOnly || "") === "1" || String(req.query?.pendingOnly || "").toLowerCase() === "true";

    const cacheKey = `trust-quality:company-items:${take}:${pendingOnly ? 1 : 0}:${q}`;
    const list = await rememberResponse(cacheKey, async () => {
      return buildCompanyServiceEvaluationItems(req.user, { pendingOnly, q, take });
    }, { ttlMs: 45000, scope: userScope(req.user) });
    const items = applyTakeLimit(list, take);
    return res.json({ items, meta: { take, pendingOnly, q } });
  });
  r.post("/company/evaluations", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), requireStepUpWrite("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    try {
      const saved = await submitCompanyServiceEvaluation(req.user, req.body || {});
      clearResponseCache("trust-quality:", userScope(req.user));
      return res.json({ ok: true, item: saved });
    } catch (e) {
      return res.status(400).json({ ok: false, message: e?.message || String(e) });
    }
  });
  r.get("/provider-score/:roomId", authRequired(), requireRole("COMPANY", "SCHOOL", "ORGANIZATION", "SUPER_ADMIN"), async (req, res) => {
    const roomId = Number(req.params.roomId || 0) || 0;
    const payload = await rememberResponse(`trust-quality:provider-score:${roomId}`, () => getProviderScore(roomId), { ttlMs: 45000, scope: userScope(req.user) });
    return res.json(payload);
  });
  r.get("/provider-scores", authRequired(), requireRole("COMPANY", "SCHOOL", "ORGANIZATION", "SUPER_ADMIN"), async (req, res) => {
    const ids = String(req.query.roomIds || '')
      .split(',')
      .map((x) => Number(x || 0))
      .filter((x) => Number.isFinite(x) && x > 0)
      .slice(0, 200);
    const uniqueIds = Array.from(new Set(ids));
    const byId = {};
    await Promise.all(uniqueIds.map(async (roomId) => {
      byId[String(roomId)] = await rememberResponse(`trust-quality:provider-score:${roomId}`, () => getProviderScore(roomId), { ttlMs: 45000, scope: userScope(req.user) });
    }));
    return res.json({ byId, count: uniqueIds.length });
  });

  return r;
}
