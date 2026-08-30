import express from "express";
import crypto from "node:crypto";
import { authRequired, requireRole } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
import { prisma } from "../prisma.js";
import {
  ACCOUNTING_EXPORT_CONTRACT_VERSION,
  ACCOUNTING_EXPORT_FORMATS,
  buildAccountingExportContract,
} from "../finance/accountingExportContract.js";
import {
  formatContentType,
  safeExportFilename,
  serializeAccountingExport,
} from "../finance/accountingExportFormats.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const BLOCKED_COMPANY_KINDS = new Set(["SCHOOL", "ORGANIZATION"]);

function scopeText(value) {
  return String(value || "").trim().toUpperCase();
}

function requestedScope(req) {
  const fromBody = scopeText(req.body?.scope);
  if (fromBody) return fromBody;
  return scopeText(req.user?.role) === "ROOM" ? "ROOM" : "COMPANY";
}

async function resolveScope(req) {
  const role = scopeText(req.user?.role);
  const scope = requestedScope(req);
  if (!['COMPANY', 'ROOM'].includes(scope)) throw httpError(400, "ACCOUNTING_EXPORT_SCOPE_INVALID", "Dışa aktarım kapsamı COMPANY veya ROOM olmalıdır.");
  if (role === "COMPANY" && scope !== "COMPANY") throw httpError(403, "ACCOUNTING_EXPORT_SCOPE_FORBIDDEN", "Bu rol için yalnızca kendi firma kapsamı kullanılabilir.");
  if (role === "ROOM" && scope !== "ROOM") throw httpError(403, "ACCOUNTING_EXPORT_SCOPE_FORBIDDEN", "Bu rol için yalnızca kendi taşımacılık firması kapsamı kullanılabilir.");

  const requestedCompanyId = Number(req.body?.companyId || req.query?.companyId || 0) || null;
  const requestedRoomId = Number(req.body?.roomId || req.query?.roomId || 0) || null;
  const companyId = scope === "COMPANY"
    ? role === "COMPANY" ? Number(req.user?.companyId || 0) || null : requestedCompanyId
    : null;
  const roomId = scope === "ROOM"
    ? role === "ROOM" ? Number(req.user?.roomId || 0) || null : requestedRoomId
    : null;

  if (!companyId && !roomId) throw httpError(400, "ACCOUNTING_EXPORT_SCOPE_MISSING", "Dışa aktarım için yetkili tenant kapsamı seçilmelidir.");
  if (role === "COMPANY" && companyId !== Number(req.user?.companyId || 0)) throw httpError(403, "ACCOUNTING_EXPORT_SCOPE_FORBIDDEN", "Bu firmanın dışa aktarım kapsamına erişim yok.");
  if (role === "ROOM" && roomId !== Number(req.user?.roomId || 0)) throw httpError(403, "ACCOUNTING_EXPORT_SCOPE_FORBIDDEN", "Bu taşımacılık firmasının dışa aktarım kapsamına erişim yok.");

  const company = companyId
    ? await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, kind: true } })
    : null;
  const room = roomId
    ? await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, name: true } })
    : null;
  if (companyId && !company) throw httpError(404, "ACCOUNTING_EXPORT_TENANT_NOT_FOUND", "Firma kapsamı bulunamadı.");
  if (roomId && !room) throw httpError(404, "ACCOUNTING_EXPORT_TENANT_NOT_FOUND", "Taşımacılık firması kapsamı bulunamadı.");
  if (scope === "COMPANY" && BLOCKED_COMPANY_KINDS.has(scopeText(company?.kind))) {
    throw httpError(403, "ACCOUNTING_EXPORT_NOT_APPLICABLE", "School ve Organization hesapları için muhasebe dışa aktarımı bu aşamada uygulanamaz.");
  }
  return { role, scope, companyId, roomId, company, room };
}

function responsePayload(contract) {
  return {
    ok: true,
    contractVersion: ACCOUNTING_EXPORT_CONTRACT_VERSION,
    contract,
    availableFormats: ACCOUNTING_EXPORT_FORMATS,
    nextStep: contract.validation.status === "BLOCKED" ? "Eksikleri düzeltin" : "Önizlemeyi kontrol edin ve kullanıcı onayıyla dosya oluşturun",
  };
}

async function buildForRequest(req, { dryRun = true } = {}) {
  const target = await resolveScope(req);
  const contract = await buildAccountingExportContract({
    role: target.role,
    scope: target.scope,
    companyId: target.companyId,
    roomId: target.roomId,
    periodStart: req.body?.periodStart,
    periodEnd: req.body?.periodEnd,
    format: req.body?.format || "JSON",
    dryRun,
    actorUserId: req.user?.id || null,
  });
  return { target, contract };
}

async function auditExport(req, contract, format, action) {
  await audit(req, {
    action,
    entity: "AccountingExport",
    entityId: null,
    meta: {
      exportId: contract.exportId,
      contractVersion: contract.contractVersion,
      scope: contract.tenant.scope,
      tenantId: contract.tenant.tenantId,
      periodStart: contract.period.periodStart,
      periodEnd: contract.period.periodEnd,
      format,
      dryRun: contract.dryRun,
      idempotencyKey: contract.idempotency.key,
      validationStatus: contract.validation.status,
      recordCount: contract.records.length,
    },
  });
}

export function accountingExportsRouter() {
  const r = express.Router();
  r.use(authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"));

  r.get("/contract", asyncHandler(async (_req, res) => {
    return res.json({
      ok: true,
      contractVersion: ACCOUNTING_EXPORT_CONTRACT_VERSION,
      availableFormats: ACCOUNTING_EXPORT_FORMATS,
      description: "Yetkili finans verilerinin provider-independent, önizleme/dry-run dışa aktarım sözleşmesi.",
    });
  }));

  r.post("/validate", asyncHandler(async (req, res) => {
    const { contract } = await buildForRequest(req, { dryRun: true });
    return res.json(responsePayload(contract));
  }));

  r.post("/preview", asyncHandler(async (req, res) => {
    const { contract } = await buildForRequest(req, { dryRun: true });
    await auditExport(req, contract, scopeText(req.body?.format) || "JSON", "ACCOUNTING_EXPORT_PREVIEW");
    return res.json(responsePayload(contract));
  }));

  r.post("/generate", asyncHandler(async (req, res) => {
    if (req.body?.userApproval !== true) {
      return sendErrorResponse(res, httpError(409, "USER_APPROVAL_REQUIRED", "Dışa aktarmadan önce kullanıcı onayı gereklidir."));
    }
    const format = scopeText(req.body?.format || "JSON");
    const { contract } = await buildForRequest(req, { dryRun: false });
    if (contract.validation.status === "BLOCKED") {
      return sendErrorResponse(res, httpError(422, "ACCOUNTING_EXPORT_VALIDATION_BLOCKED", "Dışa aktarım doğrulaması engellendi.", contract.validation));
    }
    const bytes = serializeAccountingExport(contract, format);
    const checksum = crypto.createHash("sha256").update(bytes).digest("hex");
    await auditExport(req, contract, format, "ACCOUNTING_EXPORT_GENERATED");
    res.setHeader("Content-Type", formatContentType(format));
    res.setHeader("Content-Disposition", `attachment; filename="${safeExportFilename(contract, format)}"`);
    res.setHeader("X-Accounting-Export-Id", contract.exportId);
    res.setHeader("X-Accounting-Contract-Version", contract.contractVersion);
    res.setHeader("X-Accounting-Idempotency-Key", contract.idempotency.key);
    res.setHeader("X-Accounting-Checksum", checksum);
    return res.send(bytes);
  }));

  return r;
}
