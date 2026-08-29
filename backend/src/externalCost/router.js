import express from "express";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import {
  createExternalCostReference,
  getExternalCostReference,
  listExternalReferenceFamilies,
  refreshExternalCostReference,
  getReferenceLayers,
} from "./externalCostReferenceService.js";

export function externalCostReferenceRouter() {
  const router = express.Router();

  // References are readable evidence; they are never the actual-cost API.
  router.get("/families", authRequired(), async (_req, res, next) => {
    try {
      return res.json({ ok: true, items: await listExternalReferenceFamilies() });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/", authRequired(), async (req, res, next) => {
    try {
      if (String(req.query.layers || "").toLowerCase() === "true" || req.query.scope || req.query.regionName) {
        return res.json(await getReferenceLayers(req.query || {}, req.user));
      }
      return res.json(await getExternalCostReference({
        family: req.query.family,
        unit: req.query.unit,
        providerKey: req.query.providerKey,
        currencyCode: req.query.currencyCode,
        regionCode: req.query.regionCode,
        scopeType: req.query.scopeType,
        scopeKey: req.query.scopeKey,
      }));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/refresh", authRequired(), async (req, res, next) => {
    try {
      return res.json(await refreshExternalCostReference({
        family: req.query.family,
        unit: req.query.unit,
        providerKey: req.query.providerKey,
        currencyCode: req.query.currencyCode,
        regionCode: req.query.regionCode,
        scopeType: req.query.scopeType,
        scopeKey: req.query.scopeKey,
      }, req.user));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/layers", authRequired(), async (req, res, next) => {
    try {
      return res.json(await getReferenceLayers(req.query || {}, req.user));
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/",
    authRequired(),
    requireStepUpWrite("SUPER_ADMIN"),
    requireRole("SUPER_ADMIN"),
    async (req, res, next) => {
      try {
        const reference = await createExternalCostReference(req.body || {}, req.user);
        return res.status(201).json({ ok: true, marketReference: reference });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

export default externalCostReferenceRouter;
