import express from "express";
import { authRequired } from "../auth/middleware.js";
import { buildDashboardBulkBundle, getDashboardBulkBundleNames } from "../services/dashboardBulk.js";
import { wrapAsyncRouterMethods } from "../middleware/asyncHandler.js";

export function dashboardBulkRouter() {
  const r = express.Router();
  wrapAsyncRouterMethods(r);

  r.get("/bulk", authRequired(), async (req, res) => {
    try {
      const bundle = String(req.query.bundle || "").trim();
      if (!bundle) {
        return res.status(400).json({
          ok: false,
          error: "DASHBOARD_BUNDLE_REQUIRED",
          bundles: getDashboardBulkBundleNames(),
        });
      }

      const payload = await buildDashboardBulkBundle(bundle, req.user, req.query || {});
      return res.json({
        ok: true,
        ...payload,
      });
    } catch (error) {
      return res.status(error?.status || 500).json({
        ok: false,
        error: error?.code || error?.message || "DASHBOARD_BULK_FAILED",
        message: error?.message || "Dashboard bulk failed",
      });
    }
  });

  return r;
}
