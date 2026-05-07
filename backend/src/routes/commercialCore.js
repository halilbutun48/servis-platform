import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
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
  readSettlementReconciliationRecords,
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

const settlementLedgerExportQuerySchema = sourceListQuerySchema.extend({
  entryStatus: z.string().trim().optional().nullable(),
  entryType: z.string().trim().optional().nullable(),
  reconciliationStatus: z.string().trim().optional().nullable(),
  take: z.coerce.number().int().min(1).max(1000).optional().default(1000),
});

const paymentPreviewTake = 120;
const paymentPreviewVisibleCount = 5;

function upperText(value, fallback = "") {
  const v = String(value || fallback).trim().toUpperCase();
  return v || fallback;
}

function normalizePreviewNote(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function formatPreviewAmount(amount, currencyCode = "TRY") {
  const n = Number(amount || 0);
  const safeAmount = Number.isFinite(n) ? n : 0;
  const currency = String(currencyCode || "TRY").trim() || "TRY";
  return `${safeAmount.toLocaleString("tr-TR")} ${currency}`;
}

function resolvePreviewFinanceReady(item = {}) {
  if (typeof item.financeReady === "boolean") return item.financeReady;
  if (typeof item.accountReady === "boolean") return item.accountReady;
  if (typeof item.companyAccountReady === "boolean" || typeof item.roomAccountReady === "boolean") {
    return Boolean(item.companyAccountReady && item.roomAccountReady);
  }
  const status = upperText(item.entryStatus || item?.settlementPlan?.status || item.settlementStatus, "");
  return status === "READY" || status === "EXECUTED";
}

function classifyPreviewItem(item = {}) {
  const status = upperText(item.entryStatus || item?.settlementPlan?.status || item.settlementStatus, "");
  const financeReady = resolvePreviewFinanceReady(item);
  if (financeReady && status === "READY") {
    return { bucket: "READY", statusText: "Hazır görünen kayıt" };
  }
  if (!financeReady) {
    return { bucket: "MISSING_INFO", statusText: "Eksik bilgi" };
  }
  return { bucket: "CONTROL_NEEDED", statusText: "Kontrol gerekli" };
}

function buildPreviewTitle(item = {}) {
  const pieces = [
    String(item?.companyName || item?.settlementPlan?.commercialSource?.company?.name || "").trim(),
    String(item?.roomName || item?.settlementPlan?.commercialSource?.room?.name || "").trim(),
  ].filter(Boolean);
  if (pieces.length) return pieces.join(" • ");
  return String(item?.sourceKey || item?.sourceType || "").trim() || "Hakediş kaydı";
}

function buildPreviewSubtitle(item = {}) {
  const pieces = [
    String(item?.sourceType || item?.settlementPlan?.commercialSource?.sourceType || "").trim(),
    String(item?.sourceKey || item?.settlementPlan?.commercialSource?.sourceKey || "").trim(),
  ].filter(Boolean);
  return pieces.join(" • ");
}

function mapPreviewItem(item = {}) {
  const classification = classifyPreviewItem(item);
  const amount = Number(item?.amount || item?.grossAmount || item?.settlementPlan?.grossAmount || 0);
  const currencyCode = item?.currencyCode || item?.currency || item?.settlementPlan?.currencyCode || "TRY";
  const entryStatusText = upperText(item.entryStatus || item?.settlementPlan?.status || item.settlementStatus, "DORMANT");
  return {
    id: String(item?.entryId || item?.id || item?.sourceKey || `${item?.companyId || "row"}-${item?.roomId || "scope"}`),
    title: buildPreviewTitle(item),
    subtitle: buildPreviewSubtitle(item),
    status: classification.bucket,
    statusText: classification.statusText,
    entryStatusText: entryStatusText === "EXECUTED"
      ? "Tamamlandı"
      : entryStatusText === "READY"
      ? "Hazır"
      : entryStatusText === "PLANNED" || entryStatusText === "DORMANT"
      ? "Taslak"
      : "Kontrol gerekli",
    amountText: formatPreviewAmount(amount, currencyCode),
    notePreview: normalizePreviewNote(item?.notePreview || item?.note || item?.settlementPlan?.note || ""),
  };
}

function buildPaymentPreviewSummary(rows = [], sourceLabel = "hakediş kuyruğu") {
  const mapped = (Array.isArray(rows) ? rows : []).map((item) => mapPreviewItem(item));
  const draftCount = mapped.length;
  const readyCount = mapped.filter((item) => item.status === "READY").length;
  const missingInfoCount = mapped.filter((item) => item.status === "MISSING_INFO").length;
  const controlNeededCount = mapped.filter((item) => item.status === "CONTROL_NEEDED").length;
  const status = draftCount ? "DRAFT" : "EMPTY";

  return {
    version: "PAY_01B",
    title: "Hakediş önizlemesi",
    status,
    summaryText: draftCount
      ? `Bu önizleme ${sourceLabel} içindeki taslak kayıtları gösterir. Ödeme başlatılmaz.`
      : "Hakediş önizlemesi için görünür kayıt yok.",
    draftCount,
    readyCount,
    missingInfoCount,
    controlNeededCount,
    items: mapped.slice(0, paymentPreviewVisibleCount),
    nextAction: missingInfoCount > 0
      ? "Eksik bilgi olan kayıtlar önce kontrol edilir."
      : controlNeededCount > 0
      ? "Kontrol gerekli kayıtlar gözden geçirilir."
      : draftCount > 0
      ? "Ödeme başlatılmaz. Bu yalnızca taslak önizlemedir."
      : "Ticari kayıt eklendiğinde önizleme güncellenir.",
    nonFinalText: "Ödeme başlatılmaz",
  };
}

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

function parseSettlementLedgerExportQuery(raw = {}, { take = 1000 } = {}) {
  const parsed = settlementLedgerExportQuerySchema.safeParse({ ...raw, take });
  if (!parsed.success) {
    const error = new Error("INVALID_SETTLEMENT_LEDGER_EXPORT_QUERY");
    error.status = 400;
    error.issues = parsed.error.issues;
    throw error;
  }
  return parsed.data;
}

function buildCommercialSourceWhere(query = {}) {
  const where = {};
  const typeRaw = String(query.sourceType || query.type || "").trim();
  const typeUp = typeRaw.toUpperCase();
  if (["AGREEMENT", "SHIFT_SERIES"].includes(typeUp)) where.sourceType = typeUp;
  const companyIdNum = Number(query.companyId || 0);
  if (companyIdNum > 0) where.companyId = companyIdNum;
  const roomIdNum = Number(query.roomId || 0);
  if (roomIdNum > 0) where.roomId = roomIdNum;
  const paymentModeRaw = String(query.paymentMode || "").trim();
  if (paymentModeRaw && paymentModeRaw.toUpperCase() !== "ALL") where.paymentModeSnapshot = paymentModeRaw.toUpperCase();
  const settlementStatusRaw = String(query.settlementStatus || "").trim();
  const settlementStatusUp = settlementStatusRaw.toUpperCase();
  if (settlementStatusUp && settlementStatusUp !== "ALL") where.settlementStatus = settlementStatusUp;
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  if (from || to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const createdAt = {};
    if (from && !Number.isNaN(fromDate.getTime())) createdAt.gte = fromDate;
    if (to && !Number.isNaN(toDate.getTime())) createdAt.lte = toDate;
    if (Object.keys(createdAt).length) where.createdAt = createdAt;
  }
  const q = String(query.q || "").trim();
  if (q) {
    where.OR = [
      { sourceKey: { contains: q, mode: "insensitive" } },
      { shiftGroupKey: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } },
      { room: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

function csvEscapeLedger(value) {
  let s = String(value ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const settlementLedgerExportColumns = [
  "commercialSourceId",
  "sourceType",
  "sourceKey",
  "companyId",
  "companyName",
  "roomId",
  "roomName",
  "paymentMode",
  "commissionBps",
  "settlementPlanId",
  "settlementPlanStatus",
  "settlementEntryId",
  "entryType",
  "entryStatus",
  "grossAmount",
  "commissionAmount",
  "providerAmount",
  "entryAmount",
  "currency",
  "dueAt",
  "providerRef",
  "executedAt",
  "cancelledAt",
  "reconciliationStatus",
  "updatedAt",
];

function formatLedgerDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

function normalizeLedgerEntryType(kind) {
  const v = String(kind || "").trim().toUpperCase();
  if (v === "COMPANY_CHARGE" || v === "PLATFORM_COMMISSION" || v === "PROVIDER_PAYOUT") return v;
  return v || "UNKNOWN";
}

function deriveLedgerReconciliationStatus(entry, record) {
  const recordStatus = String(record?.status || "").trim().toUpperCase();
  if (recordStatus) return recordStatus;
  const entryStatus = String(entry?.entryStatus || "").trim().toUpperCase();
  const providerRef = String(entry?.providerRef || "").trim();
  if (entryStatus === "EXECUTED" && providerRef) return "BEKLIYOR";
  if (entryStatus === "PLANNED" && entry?.dueAt) {
    const dueAt = new Date(entry.dueAt);
    if (!Number.isNaN(dueAt.getTime()) && dueAt.getTime() < Date.now()) return "INCELEME_GEREKLI";
  }
  return "BEKLIYOR";
}

function buildSettlementLedgerCsvRow(row) {
  return settlementLedgerExportColumns.map((key) => csvEscapeLedger(row?.[key] ?? "")).join(",");
}

async function listSettlementLedgerExportRows(query = {}) {
  const sourceWhere = buildCommercialSourceWhere(query);
  const sources = await prisma.commercialSource.findMany({
    where: sourceWhere,
    orderBy: { updatedAt: "desc" },
    take: Math.min(1000, Math.max(1, Number(query.take || 1000))),
    include: {
      company: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      settlementPlans: { orderBy: { id: "asc" }, include: { entries: true } },
    },
  });

  const reconciliationRecords = await readSettlementReconciliationRecords();
  const recordMap = new Map();
  for (const record of Array.isArray(reconciliationRecords) ? reconciliationRecords : []) {
    const entryId = Number(record?.entryId || 0);
    if (entryId > 0 && !recordMap.has(entryId)) recordMap.set(entryId, record);
  }

  const entryStatusFilter = String(query.entryStatus || "").trim().toUpperCase();
  const entryTypeFilter = String(query.entryType || "").trim().toUpperCase();
  const reconciliationStatusFilter = String(query.reconciliationStatus || "").trim().toUpperCase();
  const fromDate = String(query.from || "").trim() ? new Date(query.from) : null;
  const toDate = String(query.to || "").trim() ? new Date(query.to) : null;
  const q = String(query.q || "").trim().toLowerCase();
  const rows = [];

  for (const source of sources) {
    for (const plan of source.settlementPlans || []) {
      for (const entry of plan.entries || []) {
        const entryType = normalizeLedgerEntryType(entry.kind);
        const entryStatus = String(entry.status || "").trim().toUpperCase();
        const row = {
          commercialSourceId: source.id,
          sourceType: source.sourceType,
          sourceKey: source.sourceKey,
          companyId: source.companyId,
          companyName: source.company?.name || null,
          roomId: source.roomId ?? null,
          roomName: source.room?.name || null,
          paymentMode: source.paymentModeSnapshot || plan.paymentModeSnapshot || "OFF",
          commissionBps: Number(plan.commissionBpsSnapshot || source.commissionBpsSnapshot || 0),
          settlementPlanId: plan.id,
          settlementPlanStatus: String(plan.status || "DORMANT").toUpperCase(),
          settlementEntryId: entry.id,
          entryType,
          entryStatus,
          grossAmount: Number(plan.grossAmount || 0),
          commissionAmount: Number(plan.commissionAmount || 0),
          providerAmount: Number(plan.providerNetAmount || 0),
          entryAmount: Number(entry.amount || 0),
          currency: entry.currencyCode || plan.currencyCode || source.currencyCode || "TRY",
          dueAt: formatLedgerDate(entry.dueAt),
          providerRef: entry.providerRef || "",
          executedAt: entryStatus === "EXECUTED" ? formatLedgerDate(entry.updatedAt) : "",
          cancelledAt: entryStatus === "CANCELLED" ? formatLedgerDate(entry.updatedAt) : "",
          reconciliationStatus: deriveLedgerReconciliationStatus({ entryStatus, dueAt: entry.dueAt, providerRef: entry.providerRef }, recordMap.get(Number(entry.id || 0))),
          updatedAt: formatLedgerDate(entry.updatedAt),
          note: entry.note || "",
        };

        if (entryStatusFilter && entryStatusFilter !== "ALL" && entryStatus !== entryStatusFilter) continue;
        if (entryTypeFilter && entryTypeFilter !== "ALL" && entryType !== entryTypeFilter) continue;
        if (reconciliationStatusFilter && reconciliationStatusFilter !== "ALL" && row.reconciliationStatus !== reconciliationStatusFilter) continue;
        if (fromDate || toDate) {
          const updatedAt = entry.updatedAt ? new Date(entry.updatedAt) : null;
          if (fromDate && (!updatedAt || Number.isNaN(updatedAt.getTime()) || updatedAt.getTime() < fromDate.getTime())) continue;
          if (toDate && (!updatedAt || Number.isNaN(updatedAt.getTime()) || updatedAt.getTime() > toDate.getTime())) continue;
        }
        if (q) {
          const haystack = [
            row.sourceKey,
            row.companyName,
            row.roomName,
            row.entryType,
            row.entryStatus,
            row.reconciliationStatus,
            row.providerRef,
            row.note,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) continue;
        }

        rows.push(row);
      }
    }
  }

  rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || Number(b.settlementEntryId || 0) - Number(a.settlementEntryId || 0));
  return rows;
}

export function commercialCoreRouter() {
  const r = express.Router();
  const superAdminWrite = [authRequired(), requireStepUpWrite("SUPER_ADMIN"), requireRole("SUPER_ADMIN")];
  async function auditCommercialCoreWrite(req, action, entity, entityId, meta = {}) {
    return audit(req, { action, entity, entityId: entityId ?? null, meta });
  }

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
    await auditCommercialCoreWrite(req, "PAYMENT_RULE_UPDATE", "CommissionRule", item.id, {
      scopeType: "GLOBAL",
      paymentMode: item.paymentMode,
      commissionBps: item.commissionBps,
      note: item.note || null,
    });
    return res.json({ ok: true, item, message: "Global ticari ayar kaydedildi" });
  });

  r.post("/payment-backbone/settings/room", ...superAdminWrite, async (req, res) => {
    const parsed = roomRuleSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_ROOM_PAYMENT_RULE", issues: parsed.error.issues });
    }
    const item = await upsertRoomCommissionRule(parsed.data);
    await auditCommercialCoreWrite(req, "PAYMENT_ROOM_RULE_UPDATE", "CommissionRule", item.id, {
      scopeType: "ROOM",
      roomId: item.roomId,
      paymentMode: item.paymentMode,
      commissionBps: item.commissionBps,
      note: item.note || null,
    });
    return res.json({ ok: true, item, message: "Oda bazlı ticari ayar kaydedildi" });
  });

  r.delete("/payment-backbone/settings/room/:roomId", ...superAdminWrite, async (req, res) => {
    const roomId = Number(req.params.roomId || 0);
    if (roomId <= 0) return res.status(400).json({ error: "INVALID_ROOM_ID" });
    const result = await disableRoomCommissionRule(roomId);
    await auditCommercialCoreWrite(req, "PAYMENT_ROOM_RULE_UPDATE", "CommissionRule", roomId, {
      scopeType: "ROOM",
      roomId,
      disabledCount: result.disabledCount,
      action: "DISABLE",
    });
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

  r.get("/payment-backbone/settlement/ledger/export.csv", authRequired(), requireStepUpWrite("SUPER_ADMIN"), requireRole("SUPER_ADMIN"), async (req, res) => {
    const query = parseSettlementLedgerExportQuery(req.query, { take: 1000 });
    const items = await listSettlementLedgerExportRows(query);
    await auditCommercialCoreWrite(req, "PAYMENT_LEDGER_EXPORT", "SettlementEntry", null, {
      endpoint: "/api/commercial-core/payment-backbone/settlement/ledger/export.csv",
      kind: "settlement_ledger",
      format: "csv",
      take: query.take,
      rowCount: items.length,
      reason: "Settlement ledger export",
      filters: {
        type: query.type || null,
        sourceType: query.sourceType || null,
        companyId: query.companyId || null,
        roomId: query.roomId || null,
        paymentMode: query.paymentMode || null,
        settlementStatus: query.settlementStatus || null,
        entryStatus: query.entryStatus || null,
        entryType: query.entryType || null,
        reconciliationStatus: query.reconciliationStatus || null,
        q: query.q || null,
        from: query.from || null,
        to: query.to || null,
      },
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    res.setHeader("Content-Disposition", `attachment; filename="settlement_ledger_${stamp}.csv"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const header = settlementLedgerExportColumns.join(",");
    const body = items.map((item) => buildSettlementLedgerCsvRow(item)).join("\n");
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
    await auditCommercialCoreWrite(req, "PAYMENT_PILOT_ACTIVATE", "CommercialSource", null, {
      sourceIds: parsed.data.sourceIds,
      changedCount: result?.changedCount ?? result?.count ?? null,
    });
    return res.json({ ok: true, ...result, message: "Opsiyonel ödeme pilotu kaynakları READY durumuna alındı" });
  });

  r.post("/payment-backbone/pilot/deactivate", ...superAdminWrite, async (req, res) => {
    const parsed = sourceIdsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_OPTIONAL_PILOT_SOURCE_IDS", issues: parsed.error.issues });
    }
    const result = await deactivateOptionalPaymentPilot(parsed.data);
    await auditCommercialCoreWrite(req, "PAYMENT_PILOT_DEACTIVATE", "CommercialSource", null, {
      sourceIds: parsed.data.sourceIds,
      changedCount: result?.changedCount ?? result?.count ?? null,
    });
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
    await auditCommercialCoreWrite(req, "PAYMENT_REQUIRED_ACTIVATE", "CommercialSource", null, {
      sourceIds: parsed.data.sourceIds,
      changedCount: result?.changedCount ?? result?.count ?? null,
    });
    return res.json({ ok: true, ...result, message: "Zorunlu ödeme rollout kaynakları ACTIVE durumuna alındı" });
  });

  r.post("/payment-backbone/required/deactivate", ...superAdminWrite, async (req, res) => {
    const parsed = sourceIdsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_REQUIRED_ROLLOUT_SOURCE_IDS", issues: parsed.error.issues });
    }
    const result = await deactivateRequiredPaymentRollout(parsed.data);
    await auditCommercialCoreWrite(req, "PAYMENT_REQUIRED_DEACTIVATE", "CommercialSource", null, {
      sourceIds: parsed.data.sourceIds,
      changedCount: result?.changedCount ?? result?.count ?? null,
    });
    return res.json({ ok: true, ...result, message: "Zorunlu ödeme rollout kaynakları DISABLED durumuna alındı" });
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
    await auditCommercialCoreWrite(req, "PAYMENT_ACCOUNT_UPSERT", "PaymentAccount", item.id ?? null, {
      ownerType: item.ownerType,
      companyId: item.companyId ?? null,
      roomId: item.roomId ?? null,
      providerKey: item.providerKey,
      status: item.status,
    });
    return res.json({ ok: true, item, message: "Ödeme hesabı metadata kaydedildi" });
  });

  r.get("/payment-backbone/readiness/preview", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    const queueRows = await listSettlementOperationQueue({ take: paymentPreviewTake });
    const sourceRows = queueRows.length
      ? queueRows
      : await listCommercialSources({ take: paymentPreviewTake });
    const sourceLabel = queueRows.length ? "hakediş kuyruğu" : "ticari omurga";
    return res.json(buildPaymentPreviewSummary(sourceRows, sourceLabel));
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
    await auditCommercialCoreWrite(req, "SETTLEMENT_ENTRY_PLAN", "SettlementEntry", null, {
      entryIds: parsed.data.entryIds,
      dueAt: parsed.data.dueAt || null,
      note: parsed.data.note || null,
      changedCount: result?.changedCount ?? null,
    });
    return res.json({ ok: true, ...result, message: "Settlement entry satırları PLANNED durumuna alındı" });
  });

  r.post("/payment-backbone/settlement/entries/execute", ...superAdminWrite, async (req, res) => {
    const parsed = settlementEntryActionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SETTLEMENT_EXECUTE_PAYLOAD", issues: parsed.error.issues });
    }
    const result = await executeSettlementEntries(parsed.data);
    await auditCommercialCoreWrite(req, "SETTLEMENT_ENTRY_EXECUTE", "SettlementEntry", null, {
      entryIds: parsed.data.entryIds,
      providerRef: parsed.data.providerRef || null,
      note: parsed.data.note || null,
      changedCount: result?.changedCount ?? null,
    });
    return res.json({ ok: true, ...result, message: "Settlement entry satırları EXECUTED durumuna alındı" });
  });

  r.post("/payment-backbone/settlement/entries/cancel", ...superAdminWrite, async (req, res) => {
    const parsed = settlementEntryActionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SETTLEMENT_CANCEL_PAYLOAD", issues: parsed.error.issues });
    }
    const result = await cancelSettlementEntries(parsed.data);
    await auditCommercialCoreWrite(req, "SETTLEMENT_ENTRY_CANCEL", "SettlementEntry", null, {
      entryIds: parsed.data.entryIds,
      note: parsed.data.note || null,
      changedCount: result?.changedCount ?? null,
    });
    return res.json({ ok: true, ...result, message: "Settlement entry satırları CANCELLED durumuna alındı" });
  });

  r.post("/payment-backbone/settlement/entries/ready", ...superAdminWrite, async (req, res) => {
    const parsed = settlementEntryActionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SETTLEMENT_READY_PAYLOAD", issues: parsed.error.issues });
    }
    const result = await readySettlementEntries(parsed.data);
    await auditCommercialCoreWrite(req, "SETTLEMENT_ENTRY_READY", "SettlementEntry", null, {
      entryIds: parsed.data.entryIds,
      dueAt: parsed.data.dueAt || null,
      note: parsed.data.note || null,
      changedCount: result?.changedCount ?? null,
    });
    return res.json({ ok: true, ...result, message: "Settlement entry satırları READY durumuna alındı" });
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
    await auditCommercialCoreWrite(req, "SETTLEMENT_RECONCILIATION_UPSERT", "SettlementEntry", item.entryId ?? null, {
      entryId: item.entryId,
      status: item.status,
      providerRef: item.providerRef || null,
      externalRef: item.externalRef || null,
      note: item.note || null,
    });
    return res.json({ ok: true, item, message: "Settlement mutabakat kaydı güncellendi" });
  });

  r.get("/room/summary", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    return res.json(await buildRoomCommercialSummary(req.user));
  });

  r.get("/room/items", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    return res.json({ items: await buildRoomCommercialItems(req.user) });
  });

  return r;
}
