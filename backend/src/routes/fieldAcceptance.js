import express from "express";
import { authRequired } from "../auth/middleware.js";
import {
  getFieldAcceptanceManifest,
} from "../ops/fieldAcceptanceManifest.js";
import {
  createFieldAcceptanceSession,
  getCurrentFieldAcceptanceSession,
  persistFieldAcceptanceDecision,
  saveFieldAcceptanceSession,
  updateFieldAcceptanceChecklistItemStatus,
} from "../ops/fieldAcceptanceState.js";

function wrapManifest(manifest) {
  return { ok: true, manifest };
}

function wrapSession(session) {
  return { ok: true, session, currentSession: session };
}

function unwrapBody(body) {
  return body?.session || body || {};
}

export function fieldAcceptanceRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(wrapManifest(getFieldAcceptanceManifest()));
  });

  r.get("/session", authRequired(), async (_req, res, next) => {
    try {
      const session = await getCurrentFieldAcceptanceSession();
      return res.json(wrapSession(session));
    } catch (error) {
      return next(error);
    }
  });

  r.post("/session", authRequired(), async (req, res, next) => {
    try {
      const session = await createFieldAcceptanceSession(unwrapBody(req.body), req.user);
      return res.status(201).json(wrapSession(session));
    } catch (error) {
      return next(error);
    }
  });

  r.put("/session", authRequired(), async (req, res, next) => {
    try {
      const session = await saveFieldAcceptanceSession(unwrapBody(req.body), req.user);
      return res.json(wrapSession(session));
    } catch (error) {
      return next(error);
    }
  });

  r.patch("/session/decision", authRequired(), async (req, res, next) => {
    try {
      const session = await persistFieldAcceptanceDecision(unwrapBody(req.body), req.user);
      return res.json(wrapSession(session));
    } catch (error) {
      return next(error);
    }
  });

  r.patch("/session/checklist/:itemId", authRequired(), async (req, res, next) => {
    try {
      const session = await updateFieldAcceptanceChecklistItemStatus(
        req.params.itemId,
        req.body?.status,
        req.body?.note,
        req.user
      );
      return res.json(wrapSession(session));
    } catch (error) {
      return next(error);
    }
  });

  r.get("/decision-options", authRequired(), async (_req, res) => {
    return res.json({ ok: true, items: getFieldAcceptanceManifest().decisions });
  });

  return r;
}
