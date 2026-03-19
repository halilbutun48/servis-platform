import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { getObservabilityManifest, buildObservabilitySkeletonSummary, buildRoomObservabilitySummary, buildRoomObservabilityDrivers, buildRoomObservabilityIssues } from "../ops/observabilityManifest.js";

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

r.get("/room/summary", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  return res.json(await buildRoomObservabilitySummary(req.user));
});

r.get("/room/drivers", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  return res.json({ items: await buildRoomObservabilityDrivers(req.user) });
});

r.get("/room/issues", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  return res.json({ items: await buildRoomObservabilityIssues(req.user) });
});

  return r;
}
