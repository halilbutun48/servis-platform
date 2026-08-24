import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { audit } from "../audit.js";
import {
  buildPaymentBackboneStatus,
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
  assertPaymentBackboneWriteEnabled,
} from "../services/paymentBackbone.js";
import {
  buildSettlementReconciliationStatus,
  listSettlementReconciliationQueue,
  upsertSettlementReconciliationRecord,
} from "../ops/settlementReconciliationDesk.js";
import {
  globalRuleSchema,
  roomRuleSchema,
  sourceIdsSchema,
  settlementEntryActionSchema,
  reconciliationRecordSchema,
  paymentAccountSchema,
} from "./commercialCoreRouteData.js";
import {
  attachCommercialCorePaymentSourceReportRoutes,
  attachCommercialCorePaymentReadinessPreviewRoutes,
} from "./commercialCorePaymentReportsRoutes.js";
const superAdminWrite = [authRequired(), requireStepUpWrite("SUPER_ADMIN"), requireRole("SUPER_ADMIN")];

const paymentBackboneWriteGuard = (req, res, next) => {
  try {
    assertPaymentBackboneWriteEnabled();
    return next();
  } catch (error) {
    return res.status(error?.status || 403).json({
      error: error?.code || "PAYMENT_BACKBONE_WRITE_DISABLED",
      message: error?.message || "Aktif ödeme kapalı. Bu ekran ödeme başlatmaz.",
    });
  }
};

const paymentBackboneWrite = [...superAdminWrite, paymentBackboneWriteGuard];

async function auditCommercialCoreWrite(req, action, entity, entityId, meta = {}) {
  return audit(req, { action, entity, entityId: entityId ?? null, meta });
}


export function attachCommercialCorePaymentRoutes(r) {
  r.get("/payment-backbone/status",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (_req, res) => {
      return res.json(await buildPaymentBackboneStatus());
    }
  );

  r.get("/payment-backbone/settings",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (_req, res) => {
      return res.json(await buildPaymentBackboneSettings());
    }
  );

  r.post("/payment-backbone/settings/global",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = globalRuleSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_GLOBAL_PAYMENT_RULE",
          issues: parsed.error.issues,
        });
      }

      const item = await upsertGlobalCommissionRule(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_RULE_UPDATE",
        "CommissionRule",
        item.id,
        {
          scopeType: "GLOBAL",
          paymentMode: item.paymentMode,
          commissionBps: item.commissionBps,
          note: item.note || null,
        }
      );

      return res.json({
        ok: true,
        item,
        message: "Global ticari ayar kaydedildi",
      });
    }
  );

  r.post("/payment-backbone/settings/room",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = roomRuleSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_ROOM_PAYMENT_RULE",
          issues: parsed.error.issues,
        });
      }

      const item = await upsertRoomCommissionRule(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_ROOM_RULE_UPDATE",
        "CommissionRule",
        item.id,
        {
          scopeType: "ROOM",
          roomId: item.roomId,
          paymentMode: item.paymentMode,
          commissionBps: item.commissionBps,
          note: item.note || null,
        }
      );

      return res.json({
        ok: true,
        item,
        message: "Oda bazlı ticari ayar kaydedildi",
      });
    }
  );

  r.delete("/payment-backbone/settings/room/:roomId",
    ...paymentBackboneWrite,
    async (req, res) => {
      const roomId = Number(req.params.roomId || 0);

      if (roomId <= 0) {
        return res.status(400).json({
          error: "INVALID_ROOM_ID",
        });
      }

      const result = await disableRoomCommissionRule(roomId);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_ROOM_RULE_UPDATE",
        "CommissionRule",
        roomId,
        {
          scopeType: "ROOM",
          roomId,
          disabledCount: result.disabledCount,
          action: "DISABLE",
        }
      );

      return res.json({
        ok: true,
        ...result,
        message: "Oda override kapatıldı",
      });
    }
  );

  attachCommercialCorePaymentSourceReportRoutes(r);

  r.get("/payment-backbone/pilot/status",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (_req, res) => {
      return res.json(await buildOptionalPaymentPilotStatus());
    }
  );

  r.get("/payment-backbone/pilot/candidates",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const take = Number(req.query.take || 30);

      return res.json({
        items: await listOptionalPaymentPilotCandidates({ take }),
      });
    }
  );

  r.post("/payment-backbone/pilot/activate",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = sourceIdsSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_OPTIONAL_PILOT_SOURCE_IDS",
          issues: parsed.error.issues,
        });
      }

      const result = await activateOptionalPaymentPilot(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_PILOT_ACTIVATE",
        "CommercialSource",
        null,
        {
          sourceIds: parsed.data.sourceIds,
          changedCount:
            result?.changedCount ??
            result?.count ??
            null,
        }
      );

      return res.json({
        ok: true,
        ...result,
        message:
          "Opsiyonel ödeme pilotu kaynakları READY durumuna alındı",
      });
    }
  );

  r.post("/payment-backbone/pilot/deactivate",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = sourceIdsSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_OPTIONAL_PILOT_SOURCE_IDS",
          issues: parsed.error.issues,
        });
      }

      const result = await deactivateOptionalPaymentPilot(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_PILOT_DEACTIVATE",
        "CommercialSource",
        null,
        {
          sourceIds: parsed.data.sourceIds,
          changedCount:
            result?.changedCount ??
            result?.count ??
            null,
        }
      );

      return res.json({
        ok: true,
        ...result,
        message:
          "Opsiyonel ödeme pilotu kaynakları DORMANT durumuna alındı",
      });
    }
  );

  r.get("/payment-backbone/required/status",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (_req, res) => {
      return res.json(await buildRequiredPaymentRolloutStatus());
    }
  );

  r.get("/payment-backbone/required/candidates",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const take = Number(req.query.take || 30);

      return res.json({
        items: await listRequiredPaymentRolloutCandidates({ take }),
      });
    }
  );

  r.post("/payment-backbone/required/activate",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = sourceIdsSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_REQUIRED_ROLLOUT_SOURCE_IDS",
          issues: parsed.error.issues,
        });
      }

      const result = await activateRequiredPaymentRollout(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_REQUIRED_ACTIVATE",
        "CommercialSource",
        null,
        {
          sourceIds: parsed.data.sourceIds,
          changedCount:
            result?.changedCount ??
            result?.count ??
            null,
        }
      );

      return res.json({
        ok: true,
        ...result,
        message:
          "Zorunlu ödeme rollout kaynakları ACTIVE durumuna alındı",
      });
    }
  );

  r.post("/payment-backbone/required/deactivate",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = sourceIdsSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_REQUIRED_ROLLOUT_SOURCE_IDS",
          issues: parsed.error.issues,
        });
      }

      const result = await deactivateRequiredPaymentRollout(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_REQUIRED_DEACTIVATE",
        "CommercialSource",
        null,
        {
          sourceIds: parsed.data.sourceIds,
          changedCount:
            result?.changedCount ??
            result?.count ??
            null,
        }
      );

      return res.json({
        ok: true,
        ...result,
        message:
          "Zorunlu ödeme rollout kaynakları DISABLED durumuna alındı",
      });
    }
  );

  r.get("/payment-backbone/accounts/status",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (_req, res) => {
      return res.json(await buildPaymentAccountReadinessStatus());
    }
  );

  r.get("/payment-backbone/accounts/candidates",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const take = Number(req.query.take || 30);

      return res.json({
        items: await listPaymentAccountReadinessCandidates({ take }),
      });
    }
  );

  r.post("/payment-backbone/accounts/upsert",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = paymentAccountSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_PAYMENT_ACCOUNT_PAYLOAD",
          issues: parsed.error.issues,
        });
      }

      const item = await upsertPaymentAccountMetadata(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_ACCOUNT_UPSERT",
        "PaymentAccount",
        item.id ?? null,
        {
          ownerType: item.ownerType,
          companyId: item.companyId ?? null,
          roomId: item.roomId ?? null,
          providerKey: item.providerKey,
          status: item.status,
        }
      );

      return res.json({
        ok: true,
        item,
        message: "Ödeme hesabı metadata kaydedildi",
      });
    }
  );

  attachCommercialCorePaymentReadinessPreviewRoutes(r);

  r.get("/payment-backbone/settlement/status",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (_req, res) => {
      return res.json(await buildSettlementOperationsStatus());
    }
  );

  r.get("/payment-backbone/settlement/queue",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const take = Number(req.query.take || 30);

      return res.json({
        items: await listSettlementOperationQueue({ take }),
      });
    }
  );

  r.post("/payment-backbone/settlement/entries/plan",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = settlementEntryActionSchema.safeParse(
        req.body || {}
      );

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_SETTLEMENT_PLAN_PAYLOAD",
          issues: parsed.error.issues,
        });
      }

      const result = await planSettlementEntries(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "SETTLEMENT_ENTRY_PLAN",
        "SettlementEntry",
        null,
        {
          entryIds: parsed.data.entryIds,
          dueAt: parsed.data.dueAt || null,
          note: parsed.data.note || null,
          changedCount: result?.changedCount ?? null,
        }
      );

      return res.json({
        ok: true,
        ...result,
        message:
          "Settlement entry satırları PLANNED durumuna alındı",
      });
    }
  );

  r.post("/payment-backbone/settlement/entries/execute",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = settlementEntryActionSchema.safeParse(
        req.body || {}
      );

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_SETTLEMENT_EXECUTE_PAYLOAD",
          issues: parsed.error.issues,
        });
      }

      const result = await executeSettlementEntries(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "SETTLEMENT_ENTRY_EXECUTE",
        "SettlementEntry",
        null,
        {
          entryIds: parsed.data.entryIds,
          providerRef: parsed.data.providerRef || null,
          note: parsed.data.note || null,
          changedCount: result?.changedCount ?? null,
        }
      );

      return res.json({
        ok: true,
        ...result,
        message:
          "Settlement entry satırları EXECUTED durumuna alındı",
      });
    }
  );

  r.post("/payment-backbone/settlement/entries/cancel",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = settlementEntryActionSchema.safeParse(
        req.body || {}
      );

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_SETTLEMENT_CANCEL_PAYLOAD",
          issues: parsed.error.issues,
        });
      }

      const result = await cancelSettlementEntries(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "SETTLEMENT_ENTRY_CANCEL",
        "SettlementEntry",
        null,
        {
          entryIds: parsed.data.entryIds,
          note: parsed.data.note || null,
          changedCount: result?.changedCount ?? null,
        }
      );

      return res.json({
        ok: true,
        ...result,
        message:
          "Settlement entry satırları CANCELLED durumuna alındı",
      });
    }
  );

  r.post("/payment-backbone/settlement/entries/ready",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = settlementEntryActionSchema.safeParse(
        req.body || {}
      );

      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_SETTLEMENT_READY_PAYLOAD",
          issues: parsed.error.issues,
        });
      }

      const result = await readySettlementEntries(parsed.data);

      await auditCommercialCoreWrite(
        req,
        "SETTLEMENT_ENTRY_READY",
        "SettlementEntry",
        null,
        {
          entryIds: parsed.data.entryIds,
          dueAt: parsed.data.dueAt || null,
          note: parsed.data.note || null,
          changedCount: result?.changedCount ?? null,
        }
      );

      return res.json({
        ok: true,
        ...result,
        message:
          "Settlement entry satırları READY durumuna alındı",
      });
    }
  );

  r.get(
    "/payment-backbone/reconciliation/status",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (_req, res) => {
      return res.json(
        await buildSettlementReconciliationStatus()
      );
    }
  );

  r.get(
    "/payment-backbone/reconciliation/queue",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const take = Number(req.query.take || 40);

      return res.json({
        items: await listSettlementReconciliationQueue({
          take,
        }),
      });
    }
  );

  r.post("/payment-backbone/reconciliation/records/upsert",
    ...paymentBackboneWrite,
    async (req, res) => {
      const parsed = reconciliationRecordSchema.safeParse(
        req.body || {}
      );

      if (!parsed.success) {
        return res.status(400).json({
          error:
            "INVALID_SETTLEMENT_RECONCILIATION_PAYLOAD",
          issues: parsed.error.issues,
        });
      }

      const item =
        await upsertSettlementReconciliationRecord(
          parsed.data,
          req.user
        );

      await auditCommercialCoreWrite(
        req,
        "SETTLEMENT_RECONCILIATION_UPSERT",
        "SettlementEntry",
        item.entryId ?? null,
        {
          entryId: item.entryId,
          status: item.status,
          providerRef: item.providerRef || null,
          externalRef: item.externalRef || null,
          note: item.note || null,
        }
      );

      return res.json({
        ok: true,
        item,
        message:
          "Settlement mutabakat kaydı güncellendi",
      });
    }
  );

  return r;
}
