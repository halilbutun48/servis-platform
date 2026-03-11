import express from "express";
import { authRequired, requireRole, requireStepUp } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { parseCopilotRequest } from "../ai/schemas.js";
import { runCopilotFoundation } from "../ai/service.js";
import { ENV } from "../env.js";

export function aiRouter() {
  const r = express.Router();

  r.post(
    "/copilot",
    authRequired(),
    requireRole("SUPER_ADMIN", "ROOM", "COMPANY"),
    requireStepUp("SUPER_ADMIN", "ROOM"),
    async (req, res) => {
      try {
        if (!ENV.AI_COPILOT_ENABLED) {
          return res.status(503).json({ error: "AI_COPILOT_DISABLED", code: "AI_COPILOT_DISABLED" });
        }

        const parsed = parseCopilotRequest(req.body || {});
        if (!parsed.success) {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            code: "VALIDATION_ERROR",
            details: parsed.error.flatten(),
          });
        }

        const payload = await runCopilotFoundation({
          ...parsed.data,
          user: req.user,
        });

        await audit(req, {
          action: "AI_COPILOT_QUERY",
          entity: String(parsed.data.entityType || "ai").toUpperCase(),
          entityId: Number(parsed.data.entityId),
          meta: {
            intent: parsed.data.intent,
            entityType: parsed.data.entityType,
            provider: payload.provider,
            mode: payload.mode,
          },
        });

        return res.json(payload);
      } catch (e) {
        return res.status(e.status || 500).json({ error: e.code || e.message || "AI_COPILOT_FAILED" });
      }
    }
  );

  return r;
}

export default aiRouter;
