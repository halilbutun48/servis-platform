import express from "express";
import { z } from "zod";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import {
  getCommercialCoreManifest,
  buildCommercialLifecycleTemplate,
  buildRoomCommercialSummary,
  buildRoomCommercialItems,
} from "../ops/commercialCoreManifest.js";
import {
  buildPaymentBackboneStatus,
  listCommercialSources,
  buildPaymentBackboneSettings,
  upsertGlobalCommissionRule,
  upsertRoomCommissionRule,
  disableRoomCommissionRule,
  buildOptionalPaymentPilotStatus,
  listOptionalPaymentPilotCandidates,
  activateOptionalPaymentPilot,
  deactivateOptionalPaymentPilot,
  buildRequiredPaymentRolloutStatus,
  listRequiredPaymentRolloutCandidates,
  activateRequiredPaymentRollout,
  deactivateRequiredPaymentRollout,
  buildPaymentAccountReadinessStatus,
  listPaymentAccountReadinessCandidates,
  upsertPaymentAccountMetadata,
  buildSettlementOperationsStatus,
  listSettlementOperationQueue,
  planSettlementEntries,
  executeSettlementEntries,
  cancelSettlementEntries,
  readySettlementEntries,
} from "../services/paymentBackbone.js";
import {
  buildSettlementReconciliationStatus,
  listSettlementReconciliationQueue,
  upsertSettlementReconciliationRecord,
} from "../ops/settlementReconciliationDesk.js";
import { audit } from "../audit.js";
import { buildKvkkExportAuditMeta } from "../kvkk/retention.js";

const globalRuleSchema = z.object({
  paymentMode: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),
  commissionBps: z.coerce.number().int().min(0).max(10000),
  note: z.string().trim().max(500).optional().nullable(),
});

const roomRuleSchema = z.object({
  roomId: z.coerce.number().int().positive(),
  paymentMode: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),
  commissionBps: z.coerce.number().int().min(0).max(10000),
  note: z.string().trim().max(500).optional().nullable(),
});

const sourceIdsSchema = z.object({
  sourceIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
});


const settlementEntryActionSchema = z.object({
  entryIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  dueAt: z.string().trim().min(1).max(64).optional().nullable(),
  providerRef: z.string().trim().min(1).max(120).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

const reconciliationRecordSchema = z.object({
  entryId: z.coerce.number().int().positive(),
  status: z.enum(["BEKLIYOR", "ESLESTI", "INCELEME_GEREKLI", "UYUSMAZLIK", "KAPANDI"]),
  note: z.string().trim().max(500).optional().nullable(),
  providerRef: z.string().trim().max(120).optional().nullable(),
  externalRef: z.string().trim().max(120).optional().nullable(),
  expectedAmount: z.coerce.number().finite().optional().nullable(),
  receivedAmount: z.coerce.number().finite().optional().nullable(),
});

const paymentAccountSchema = z.object({
  ownerType: z.enum(["PLATFORM", "COMPANY", "ROOM"]),
  companyId: z.coerce.number().int().positive().optional().nullable(),
  roomId: z.coerce.number().int().positive().optional().nullable(),
  providerKey: z.string().trim().min(1).max(50).optional().default("DORMANT"),
  status: z.enum(["INACTIVE", "ACTIVE", "VERIFIED", "ERROR"]),
  label: z.string().trim().max(120).optional().nullable(),
  maskedIban: z.string().trim().max(64).optional().nullable(),
  accountRef: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.ownerType === "COMPANY" && !(Number(value.companyId || 0) > 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyId"], message: "companyId gerekli" });
  }
  if (value.ownerType === "ROOM" && !(Number(value.roomId || 0) > 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roomId"], message: "roomId gerekli" });
  }
});

const sourceListQuerySchema = z.object({
  type: z.string().trim().optional().nullable(),
  sourceType: z.string().trim().optional().nullable(),
  companyId: z.coerce.number().int().positive().optional().nullable(),
  roomId: z.coerce.number().int().positive().optional().nullable(),
  paymentMode: z.string().trim().optional().nullable(),
  settlementStatus: z.string().trim().optional().nullable(),
  q: z.string().trim().optional().nullable(),
  from: z.string().trim().optional().nullable(),
  to: z.string().trim().optional().nullable(),
  take: z.coerce.number().int().min(1).max(1000).optional().default(20),
});

function csvEscape(value) {
  let s = String(value ?? "");
  if (/^[=+\-@]/.test(s)) {
    s = `'${s}`;
  }
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDateIso(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

function toCommercialSourceCsvRow(item) {
  return [
    item.id,
    item.sourceType,
    item.sourceKey,
    item.companyId ?? "",
    item.companyName || "",
    item.roomId ?? "",
    item.roomName || "",
    item.agreementId ?? "",
    item.shiftRootId ?? "",
    item.shiftGroupKey || "",
    item.paymentModeSnapshot || "",
    item.commissionBpsSnapshot ?? 0,
    item.settlementStatus || "",
    item.providerAdapterKey || "",
    item.amountCompanySnapshot ?? "",
    item.amountProviderSnapshot ?? "",
    item.currencyCode || "TRY",
    formatDateIso(item.createdAt),
    formatDateIso(item.updatedAt),
  ].map(csvEscape).join(",");
}

function parseCommercialSourceQuery(raw = {}, { take = 20 } = {}) {
  const parsed = sourceListQuerySchema.safeParse({ ...raw, take });
  if (!parsed.success) {
    const error = new Error("INVALID_COMMERCIAL_SOURCE_QUERY");
    error.status = 400;
    error.issues = parsed.error.issues;
    throw error;
  }
  return parsed.data;
}

export function commercialCoreRouter() {
  const r = express.Router();
  const superAdminWrite = [authRequired(), requireStepUpWrite("SUPER_ADMIN"), requireRole("SUPER_ADMIN")];

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getCommercialCoreManifest());
  });

  r.get("/lifecycle-template", authRequired(), async (_req, res) => {
    return res.json(buildCommercialLifecycleTemplate());
  });

  r.get("/rules", authRequired(), async (_req, res) => {
    return res.json({ items: getCommercialCoreManifest().rules });
  });

  r.get("/payment-backbone/status", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    return res.json(await buildPaymentBackboneStatus());
  });

  r.get("/payment-backbone/settings", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    return res.json(await buildPaymentBackboneSettings());
  });

  r.post("/payment-backbone/settings/global", ...superAdminWrite, async (req, res) => {
    const parsed = globalRuleSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_GLOBAL_PAYMENT_RULE", issues: parsed.error.issues });
    }
    const item = await upsertGlobalCommissionRule(parsed.data);
    return res.json({ ok: true, item, message: "Global ticari ayar kaydedildi" });
  });

  r.post("/payment-backbone/settings/room", ...superAdminWrite, async (req, res) => {
    const parsed = roomRuleSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_ROOM_PAYMENT_RULE", issues: parsed.error.issues });
    }
    const item = await upsertRoomCommissionRule(parsed.data);
    return res.json({ ok: true, item, message: "Oda bazlı ticari ayar kaydedildi" });
  });

  r.delete("/payment-backbone/settings/room/:roomId", ...superAdminWrite, async (req, res) => {
    const roomId = Number(req.params.roomId || 0);
    if (roomId <= 0) return res.status(400).json({ error: "INVALID_ROOM_ID" });
    const result = await disableRoomCommissionRule(roomId);
    return res.json({ ok: true, ...result, message: "Oda override kapatıldı" });
  });

  r.get("/payment-backbone/sources", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const query = parseCommercialSourceQuery(req.query, { take: req.query?.take ?? 20 });
    const items = await listCommercialSources(query);
    return res.json({
      ok: true,
      items,
      summary: {
        total: items.length,
        sourceType: query.sourceType || query.type || "ALL",
        paymentMode: query.paymentMode || "ALL",
        settlementStatus: query.settlementStatus || "ALL",
      },
    });
  });

  r.get("/payment-backbone/sources/export.csv", authRequired(), requireStepUpWrite("SUPER_ADMIN"), requireRole("SUPER_ADMIN"), async (req, res) => {
    const query = parseCommercialSourceQuery(req.query, { take: 1000 });
    const items = await listCommercialSources(query);
    await audit(req, {
      action: "PAYMENT_BACKBONE_EXPORT",
      entity: "CommercialSource",
      meta: buildKvkkExportAuditMeta({
        endpoint: "/api/commercial-core/payment-backbone/sources/export.csv",
        kind: "payment_backbone_sources",
        format: "csv",
        take: query.take,
        rowCount: items.length,
        reason: "Commercial source / settlement export",
        filters: {
          type: query.type || null,
          sourceType: query.sourceType || null,
          companyId: query.companyId || null,
          roomId: query.roomId || null,
          paymentMode: query.paymentMode || null,
          settlementStatus: query.settlementStatus || null,
          q: query.q || null,
          from: query.from || null,
          to: query.to || null,
        },
      }),
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    res.setHeader("Content-Disposition", `attachment; filename="payment_sources_${stamp}.csv"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const header = [
      "id",
      "sourceType",
      "sourceKey",
      "companyId",
      "companyName",
      "roomId",
      "roomName",
      "agreementId",
      "shiftRootId",
      "shiftGroupKey",
      "paymentMode",
      "commissionBps",
      "settlementStatus",
      "providerAdapterKey",
      "amountCompany",
      "amountProvider",
      "currencyCode",
      "createdAt",
      "updatedAt",
    ].join(",");
    const body = items.map((item) => toCommercialSourceCsvRow(item)).join("\n");
    return res.send(`${header}\n${body}\n`);
  });

  r.get("/payment-backbone/pilot/status", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    return res.json(await buildOptionalPaymentPilotStatus());
  });

  r.get("/payment-backbone/pilot/candidates", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const take = Number(req.query.take || 30);
    return res.json({ items: await listOptionalPaymentPilotCandidates({ take }) });
  });

  r.post("/payment-backbone/pilot/activate", ...superAdminWrite, async (req, res) => {
    const parsed = sourceIdsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_OPTIONAL_PILOT_SOURCE_IDS", issues: parsed.error.issues });
    }
    const result = await activateOptionalPaymentPilot(parsed.data);
    return res.json({ ok: true, ...result, message: "Opsiyonel ödeme pilotu kaynakları READY durumuna alındı" });
  });

  r.post("/payment-backbone/pilot/deactivate", ...superAdminWrite, async (req, res) => {
    const parsed = sourceIdsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_OPTIONAL_PILOT_SOURCE_IDS", issues: parsed.error.issues });
    }
    const result = await deactivateOptionalPaymentPilot(parsed.data);
    return res.json({ ok: true, ...result, message: "Opsiyonel ödeme pilotu kaynakları DORMANT durumuna alındı" });
  });

  r.get("/payment-backbone/required/status", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    return res.json(await buildRequiredPaymentRolloutStatus());
  });

  r.get("/payment-backbone/required/candidates", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const take = Number(req.query.take || 30);
    return res.json({ items: await listRequiredPaymentRolloutCandidates({ take }) });
  });

  r.post("/payment-backbone/required/activate", ...superAdminWrite, async (req, res) => {
    const parsed = sourceIdsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_REQUIRED_ROLLOUT_SOURCE_IDS", issues: parsed.error.issues });
    }
    const result = await activateRequiredPaymentRollout(parsed.data);
    return res.json({ ok: true, ...result, message: "Zorunlu odeme rollout kaynaklari ACTIVE durumuna alindi" });
  });

  r.post("/payment-backbone/required/deactivate", ...superAdminWrite, async (req, res) => {
    const parsed = sourceIdsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_REQUIRED_ROLLOUT_SOURCE_IDS", issues: parsed.error.issues });
    }
    const result = await deactivateRequiredPaymentRollout(parsed.data);
    return res.json({ ok: true, ...result, message: "Zorunlu odeme rollout kaynaklari DISABLED durumuna alindi" });
  });

  r.get("/payment-backbone/accounts/status", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    return res.json(await buildPaymentAccountReadinessStatus());
  });

  r.get("/payment-backbone/accounts/candidates", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const take = Number(req.query.take || 30);
    return res.json({ items: await listPaymentAccountReadinessCandidates({ take }) });
  });

  r.post("/payment-backbone/accounts/upsert", ...superAdminWrite, async (req, res) => {
    const parsed = paymentAccountSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_PAYMENT_ACCOUNT_PAYLOAD", issues: parsed.error.issues });
    }
    const item = await upsertPaymentAccountMetadata(parsed.data);
    return res.json({ ok: true, item, message: "Odeme hesabi metadata kaydedildi" });
  });

  r.get("/payment-backbone/settlement/status", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    return res.json(await buildSettlementOperationsStatus());
  });

  r.get("/payment-backbone/settlement/queue", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const take = Number(req.query.take || 30);
    return res.json({ items: await listSettlementOperationQueue({ take }) });
  });

  r.post("/payment-backbone/settlement/entries/plan", ...superAdminWrite, async (req, res) => {
    const parsed = settlementEntryActionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SETTLEMENT_PLAN_PAYLOAD", issues: parsed.error.issues });
    }
    const result = await planSettlementEntries(parsed.data);
    return res.json({ ok: true, ...result, message: "Settlement entry satirlari PLANNED durumuna alindi" });
  });

  r.post("/payment-backbone/settlement/entries/execute", ...superAdminWrite, async (req, res) => {
    const parsed = settlementEntryActionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SETTLEMENT_EXECUTE_PAYLOAD", issues: parsed.error.issues });
    }
    const result = await executeSettlementEntries(parsed.data);
    return res.json({ ok: true, ...result, message: "Settlement entry satirlari EXECUTED durumuna alindi" });
  });

  r.post("/payment-backbone/settlement/entries/cancel", ...superAdminWrite, async (req, res) => {
    const parsed = settlementEntryActionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SETTLEMENT_CANCEL_PAYLOAD", issues: parsed.error.issues });
    }
    const result = await cancelSettlementEntries(parsed.data);
    return res.json({ ok: true, ...result, message: "Settlement entry satirlari CANCELLED durumuna alindi" });
  });

  r.post("/payment-backbone/settlement/entries/ready", ...superAdminWrite, async (req, res) => {
    const parsed = settlementEntryActionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SETTLEMENT_READY_PAYLOAD", issues: parsed.error.issues });
    }
    const result = await readySettlementEntries(parsed.data);
    return res.json({ ok: true, ...result, message: "Settlement entry satirlari READY durumuna alindi" });
  });

  r.get("/payment-backbone/reconciliation/status", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    return res.json(await buildSettlementReconciliationStatus());
  });

  r.get("/payment-backbone/reconciliation/queue", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const take = Number(req.query.take || 40);
    return res.json({ items: await listSettlementReconciliationQueue({ take }) });
  });

  r.post("/payment-backbone/reconciliation/records/upsert", ...superAdminWrite, async (req, res) => {
    const parsed = reconciliationRecordSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SETTLEMENT_RECONCILIATION_PAYLOAD", issues: parsed.error.issues });
    }
    const item = await upsertSettlementReconciliationRecord(parsed.data, req.user);
    return res.json({ ok: true, item, message: "Settlement mutabakat kaydi guncellendi" });
  });

  r.get("/room/summary", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    return res.json(await buildRoomCommercialSummary(req.user));
  });

  r.get("/room/items", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    return res.json({ items: await buildRoomCommercialItems(req.user) });
  });

  return r;
}
