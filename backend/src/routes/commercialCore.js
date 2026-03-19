import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import {
  getCommercialCoreManifest,
  buildCommercialLifecycleTemplate,
  buildRoomCommercialSummary,
  buildRoomCommercialItems,
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

  r.get("/room/summary", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    return res.json(await buildRoomCommercialSummary(req.user));
  });

  r.get("/room/items", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    return res.json({ items: await buildRoomCommercialItems(req.user) });
  });

  return r;
}
