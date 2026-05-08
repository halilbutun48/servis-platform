import express from "express";
import { authRequired, requireStepUp } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { normalizeCopilotRequestInput, parseCopilotRequest } from "../ai/schemas.js";
import { runCopilotFoundation } from "../ai/service.js";
import { ENV } from "../env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { httpError } from "../errors/http.js";

export function aiRouter() {
  const r = express.Router();

  r.post(
    "/copilot",
    authRequired(),
    requireStepUp("SUPER_ADMIN", "ROOM"),
    asyncHandler(async (req, res) => {
      if (!ENV.AI_COPILOT_ENABLED) {
        throw httpError(503, "AI_COPILOT_DISABLED", "AI_COPILOT_DISABLED");
      }

      const normalizedBody = normalizeCopilotRequestInput(req.body || {});
      const parsed = parseCopilotRequest(normalizedBody);
      if (!parsed.success) {
        throw httpError(400, "VALIDATION_ERROR", "Bunu anlayamadım. Kısaca ne yapmak istediğini yazabilir misin?", parsed.error.flatten());
      }

      const role = String(req.user?.role || "");
      const isCoreRole = ["SUPER_ADMIN", "ROOM", "COMPANY"].includes(role);
      const isSimpleGuideRole = ["DRIVER", "PERSONEL", "PARENT"].includes(role)
        && parsed.data.intent === "JOB_GUIDE"
        && parsed.data.entityType === "screen"
        && ["SCREEN_MENU_GUIDE", "BUTTON_ACTION_GUIDE", "ROLE_HELP_GUIDE"].includes(String(parsed.data.jobType || ""));
      const isSimpleChatRole = ["DRIVER", "PERSONEL", "PARENT"].includes(role)
        && parsed.data.intent === "CHAT_HELP"
        && parsed.data.entityType === "screen";
      if (!isCoreRole && !isSimpleGuideRole && !isSimpleChatRole) {
        throw httpError(403, "FORBIDDEN", "Forbidden");
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
          jobType: parsed.data.jobType || null,
          guideLevel: parsed.data.guideLevel || null,
          messageLength: String(parsed.data.message || "").length || 0,
        },
      });

      return res.json(payload);
    })
  );

  return r;
}

export default aiRouter;

// M46.6-C route markers: driver | personel | parent
