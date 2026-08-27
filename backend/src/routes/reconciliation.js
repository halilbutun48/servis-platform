import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
import { wrapAsyncRouterMethods } from "../middleware/asyncHandler.js";
import { prisma } from "../prisma.js";
import { buildAgreementReconciliationPreview } from "../finance/hakedisInvoiceReconciliation.js";

function positiveInt(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function assertPeriod(periodStart, periodEnd) {
  if ((periodStart && !isYmd(periodStart)) || (periodEnd && !isYmd(periodEnd))) {
    throw httpError(400, "INVALID_PERIOD", "Dönem tarihleri YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (periodStart && periodEnd && periodStart > periodEnd) {
    throw httpError(400, "INVALID_PERIOD", "Dönem başlangıcı bitiş tarihinden sonra olamaz.");
  }
}

async function assertScope(req, agreement) {
  const role = String(req.user?.role || "").toUpperCase();
  if (role === "SUPER_ADMIN") return;
  if (role === "COMPANY") {
    const company = await prisma.company.findUnique({ where: { id: agreement.companyId }, select: { id: true, kind: true } });
    if (company?.kind !== "COMPANY" || Number(agreement.companyId) !== Number(req.user?.companyId)) {
      throw httpError(403, "RECONCILIATION_NOT_APPLICABLE", "Bu hesap için mutabakat önizlemesi kullanılamaz.");
    }
    return;
  }
  if (role === "ROOM" && Number(agreement.roomId) === Number(req.user?.roomId)) return;
  throw httpError(403, "FORBIDDEN", "Bu sözleşmenin mutabakat kanıtlarına erişim yok.");
}

export function reconciliationRouter() {
  const router = express.Router();
  wrapAsyncRouterMethods(router);

  router.get("/preview", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    try {
      const agreementId = positiveInt(req.query.agreementId);
      const invoiceId = positiveInt(req.query.invoiceId);
      const hakedisId = positiveInt(req.query.hakedisId);
      const periodStart = String(req.query.periodStart || "").trim() || null;
      const periodEnd = String(req.query.periodEnd || "").trim() || null;
      assertPeriod(periodStart, periodEnd);

      if (!agreementId) {
        if (String(req.user?.role || "").toUpperCase() === "COMPANY") {
          const company = await prisma.company.findUnique({ where: { id: Number(req.user.companyId) }, select: { kind: true } });
          if (company?.kind !== "COMPANY") {
            return sendErrorResponse(res, httpError(403, "RECONCILIATION_NOT_APPLICABLE", "Bu hesap için mutabakat önizlemesi kullanılamaz."));
          }
        }
        return res.json(await buildAgreementReconciliationPreview({ periodStart, periodEnd }));
      }

      const agreement = await prisma.agreement.findUnique({ where: { id: agreementId }, select: { id: true, companyId: true, roomId: true } });
      if (!agreement) return res.json(await buildAgreementReconciliationPreview({ periodStart, periodEnd }));
      await assertScope(req, agreement);
      return res.json(await buildAgreementReconciliationPreview({ agreementId, invoiceId, hakedisId, periodStart, periodEnd }));
    } catch (error) {
      return sendErrorResponse(res, error);
    }
  });

  return router;
}
