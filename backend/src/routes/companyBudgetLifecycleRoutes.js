import { asyncHandler } from "../middleware/asyncHandler.js";
import { buildFinancialOperationsCompanyKindDeniedPreview } from "../finance/companyBudgetAndServiceCost.js";
import {
  activateCompanyBudgetPlan,
  approveCompanyBudgetPlan,
  archiveCompanyBudgetPlan,
  getCompanyBudgetPlanOverview,
  saveCompanyBudgetPlanDraft,
  submitCompanyBudgetPlan,
} from "../services/financialOperationsLifecycle.js";

function deniedPreview(req, company) {
  return buildFinancialOperationsCompanyKindDeniedPreview({
    role: req.user?.role,
    companyKind: company?.kind,
    scope: "COMPANY",
  });
}

export function attachCompanyBudgetLifecycleRoutes(
  r,
  {
    resolveTargetCompany,
    isBlockedCompanyKindForWrite,
  } = {}
) {
  if (typeof resolveTargetCompany !== "function") {
    throw new Error("resolveTargetCompany is required.");
  }

  if (typeof isBlockedCompanyKindForWrite !== "function") {
    throw new Error("isBlockedCompanyKindForWrite is required.");
  }

  r.get(
    "/financial-operations/budget-plans/current",
    asyncHandler(async (req, res) => {
      const company = await resolveTargetCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      if (isBlockedCompanyKindForWrite(req, company)) {
        return res.status(403).json(deniedPreview(req, company));
      }

      const overview = await getCompanyBudgetPlanOverview(company.id);

      return res.json({
        ok: true,
        companyId: company.id,
        current: overview.current,
        active: overview.active,
        draft: overview.draft,
        items: overview.items,
      });
    })
  );

  r.post(
    "/financial-operations/budget-plans",
    asyncHandler(async (req, res) => {
      const company = await resolveTargetCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      if (isBlockedCompanyKindForWrite(req, company)) {
        return res.status(403).json(deniedPreview(req, company));
      }

      const saved = await saveCompanyBudgetPlanDraft({
        companyId: company.id,
        actorUserId: req.user?.id || null,
        payload: req.body || {},
      });

      return res.status(201).json({
        ok: true,
        item: saved,
      });
    })
  );

  r.patch(
    "/financial-operations/budget-plans/:id",
    asyncHandler(async (req, res) => {
      const company = await resolveTargetCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      if (isBlockedCompanyKindForWrite(req, company)) {
        return res.status(403).json(deniedPreview(req, company));
      }

      const saved = await saveCompanyBudgetPlanDraft({
        companyId: company.id,
        planId: Number(req.params.id || 0),
        expectedVersion: req.body?.version,
        actorUserId: req.user?.id || null,
        payload: req.body || {},
      });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );

  r.post(
    "/financial-operations/budget-plans/:id/submit",
    asyncHandler(async (req, res) => {
      const company = await resolveTargetCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      if (isBlockedCompanyKindForWrite(req, company)) {
        return res.status(403).json(deniedPreview(req, company));
      }

      const saved = await submitCompanyBudgetPlan({
        companyId: company.id,
        planId: Number(req.params.id || 0),
        expectedVersion: req.body?.version,
        actorUserId: req.user?.id || null,
      });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );

  r.post(
    "/financial-operations/budget-plans/:id/approve",
    asyncHandler(async (req, res) => {
      const company = await resolveTargetCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      if (isBlockedCompanyKindForWrite(req, company)) {
        return res.status(403).json(deniedPreview(req, company));
      }

      const saved = await approveCompanyBudgetPlan({
        companyId: company.id,
        planId: Number(req.params.id || 0),
        expectedVersion: req.body?.version,
        actorUserId: req.user?.id || null,
      });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );

  r.post(
    "/financial-operations/budget-plans/:id/activate",
    asyncHandler(async (req, res) => {
      const company = await resolveTargetCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      if (isBlockedCompanyKindForWrite(req, company)) {
        return res.status(403).json(deniedPreview(req, company));
      }

      const saved = await activateCompanyBudgetPlan({
        companyId: company.id,
        planId: Number(req.params.id || 0),
        expectedVersion: req.body?.version,
        actorUserId: req.user?.id || null,
      });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );

  r.post(
    "/financial-operations/budget-plans/:id/archive",
    asyncHandler(async (req, res) => {
      const company = await resolveTargetCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      if (isBlockedCompanyKindForWrite(req, company)) {
        return res.status(403).json(deniedPreview(req, company));
      }

      const saved = await archiveCompanyBudgetPlan({
        companyId: company.id,
        planId: Number(req.params.id || 0),
        expectedVersion: req.body?.version,
        actorUserId: req.user?.id || null,
      });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );
}
