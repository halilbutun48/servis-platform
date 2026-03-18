import express from "express";
import { authRequired } from "../auth/middleware.js";
import {
  getFieldAcceptanceManifest,
  buildFieldAcceptanceSkeletonSession,
} from "../ops/fieldAcceptanceManifest.js";

export function fieldAcceptanceRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getFieldAcceptanceManifest());
  });

  r.get("/session-template", authRequired(), async (_req, res) => {
    return res.json(buildFieldAcceptanceSkeletonSession());
  });

  r.get("/decision-options", authRequired(), async (_req, res) => {
    return res.json({ items: getFieldAcceptanceManifest().decisions });
  });

  return r;
}
