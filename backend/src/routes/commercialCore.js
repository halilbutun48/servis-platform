import express from "express";
import { authRequired } from "../auth/middleware.js";
import {
  getCommercialCoreManifest,
  buildCommercialLifecycleTemplate,
} from "../ops/commercialCoreManifest.js";

export function commercialCoreRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getCommercialCoreManifest());
  });

  r.get("/lifecycle-template", authRequired(), async (_req, res) => {
    return res.json(buildCommercialLifecycleTemplate());
  });

  r.get("/rules", authRequired(), async (_req, res) => {
    return res.json({ items: getCommercialCoreManifest().rules });
  });

  return r;
}
