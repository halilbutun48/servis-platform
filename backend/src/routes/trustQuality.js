import express from "express";
import { authRequired } from "../auth/middleware.js";
import {
  getTrustQualityManifest,
  buildServiceEvaluationTemplate,
  buildProviderSignalTemplate,
} from "../ops/trustQualityManifest.js";

export function trustQualityRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getTrustQualityManifest());
  });

  r.get("/evaluation-template", authRequired(), async (_req, res) => {
    return res.json(buildServiceEvaluationTemplate());
  });

  r.get("/provider-signal-template", authRequired(), async (_req, res) => {
    return res.json(buildProviderSignalTemplate());
  });

  return r;
}
