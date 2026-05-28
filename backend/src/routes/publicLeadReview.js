import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authRequired, requireRole, requireStepUp } from "../auth/middleware.js";
import {
  listPublicLeadReviewQueue,
  updatePublicLeadReviewDecision,
} from "../services/publicLeadService.js";

export function publicLeadReviewRouter() {
  const r = express.Router();
  const superAdminGuard = [authRequired(), requireStepUp("SUPER_ADMIN"), requireRole("SUPER_ADMIN")];

  r.get(
    "/",
    ...superAdminGuard,
    asyncHandler(async (req, res) => {
      const result = await listPublicLeadReviewQueue({
        status: req.query?.status,
        type: req.query?.type,
        q: req.query?.q,
        limit: req.query?.limit,
        take: req.query?.take,
      });

      return res.json(result);
    })
  );

  r.patch(
    "/:leadId",
    ...superAdminGuard,
    asyncHandler(async (req, res) => {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const patch = {};
      if (Object.prototype.hasOwnProperty.call(body, "status")) patch.status = body.status;
      if (Object.prototype.hasOwnProperty.call(body, "reviewNote")) patch.reviewNote = body.reviewNote;
      if (Object.prototype.hasOwnProperty.call(body, "operationNote")) patch.operationNote = body.operationNote;

      const item = await updatePublicLeadReviewDecision(req.params.leadId, patch, req.user || {});

      return res.json({
        ok: true,
        item,
        message: "İnceleme kaydı güncellendi.",
      });
    })
  );

  return r;
}
