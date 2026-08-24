import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { submitPublicLead } from "../services/publicLeadService.js";
import { sanitizeRequestUrl } from "../lib/requestUrl.js";

export function publicLeadsRouter() {
  const r = express.Router();

  r.post(
    "/",
    asyncHandler(async (req, res) => {
      const result = await submitPublicLead(req.body ?? {}, {
        ip: req.ip || req.socket?.remoteAddress || "",
        userAgent: req.get("user-agent") || "",
        sourceRoute: sanitizeRequestUrl(req.originalUrl || "/api/public/leads"),
      });

      return res.json(result);
    })
  );

  return r;
}
