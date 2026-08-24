import { wrapAsyncRouterMethods } from "../middleware/asyncHandler.js";
import { authRequired } from "../auth/middleware.js";
import { getCommercialCoreManifest, buildCommercialLifecycleTemplate } from "../ops/commercialCoreManifest.js";
import { attachCommercialCorePaymentRoutes } from "./commercialCorePaymentRoutes.js";
import { attachCommercialCoreRoomRoutes } from "./commercialCoreRoomRoutes.js";

export function attachCommercialCoreRoutes(r) {
  wrapAsyncRouterMethods(r);

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getCommercialCoreManifest());
  });

  r.get("/lifecycle-template", authRequired(), async (_req, res) => {
    return res.json(buildCommercialLifecycleTemplate());
  });

  r.get("/rules", authRequired(), async (_req, res) => {
    return res.json({
      items: getCommercialCoreManifest().rules,
    });
  });

  attachCommercialCorePaymentRoutes(r);
  attachCommercialCoreRoomRoutes(r);

  return r;
}
