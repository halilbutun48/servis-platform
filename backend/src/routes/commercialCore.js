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
    const take = Number(req.query.take || 20);
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    return res.json({ items: await listCommercialSources({ type, take }) });
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
