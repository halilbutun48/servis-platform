import express from "express";
import { authRequired } from "../auth/middleware.js";
import {
  getSsotAlignmentManifest,
  buildSsotAlignmentSummaryTemplate,
} from "../ops/ssotAlignmentManifest.js";

export function ssotAlignmentRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getSsotAlignmentManifest());
  });

  r.get("/summary-template", authRequired(), async (_req, res) => {
    return res.json(buildSsotAlignmentSummaryTemplate());
  });

  r.get("/route", authRequired(), async (_req, res) => {
    return res.json({ items: getSsotAlignmentManifest().route });
  });

  return r;
}
