import express from "express";
import { authRequired } from "../auth/middleware.js";
import {
  getNaturalCopilotManifest,
  buildNaturalReplyTemplate,
  buildCopilotFeedbackTemplate,
} from "../ops/naturalCopilotManifest.js";

export function naturalCopilotRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getNaturalCopilotManifest());
  });

  r.get("/reply-template", authRequired(), async (_req, res) => {
    return res.json(buildNaturalReplyTemplate());
  });

  r.get("/feedback-template", authRequired(), async (_req, res) => {
    return res.json(buildCopilotFeedbackTemplate());
  });

  return r;
}
