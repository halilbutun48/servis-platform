import express from "express";
import { authRequired } from "../auth/middleware.js";
import { getObservabilityManifest, buildObservabilitySkeletonSummary } from "../ops/observabilityManifest.js";

export function observabilityRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getObservabilityManifest());
  });

  r.get("/health-summary", authRequired(), async (_req, res) => {
    return res.json(buildObservabilitySkeletonSummary());
  });

  r.get("/event-types", authRequired(), async (_req, res) => {
    return res.json({
      items: getObservabilityManifest().mobileHealthEventTypes,
      gpsSource: "SURUCUNUN_TELEFON_GPSI",
    });
  });

  return r;
}
