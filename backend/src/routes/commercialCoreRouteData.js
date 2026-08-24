import { prisma } from "../prisma.js";
import { z } from "zod";
import { readSettlementReconciliationRecords } from "../ops/settlementReconciliationDesk.js";
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
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["companyId"],
      message: "companyId gerekli",
    });
  }

  if (value.ownerType === "ROOM" && !(Number(value.roomId || 0) > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roomId"],
      message: "roomId gerekli",
    });
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

  if (["AGREEMENT", "SHIFT_SERIES"].includes(typeUp)) {
    where.sourceType = typeUp;
  }

  const companyIdNum = Number(query.companyId || 0);
  if (companyIdNum > 0) {
    where.companyId = companyIdNum;
  }

  const roomIdNum = Number(query.roomId || 0);
  if (roomIdNum > 0) {
    where.roomId = roomIdNum;
  }

  const paymentModeRaw = String(query.paymentMode || "").trim();
  if (paymentModeRaw && paymentModeRaw.toUpperCase() !== "ALL") {
    where.paymentModeSnapshot = paymentModeRaw.toUpperCase();
  }

  const settlementStatusRaw = String(query.settlementStatus || "").trim();
  const settlementStatusUp = settlementStatusRaw.toUpperCase();

  if (settlementStatusUp && settlementStatusUp !== "ALL") {
    where.settlementStatus = settlementStatusUp;
  }

  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();

  if (from || to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const createdAt = {};

    if (from && !Number.isNaN(fromDate.getTime())) {
      createdAt.gte = fromDate;
    }

    if (to && !Number.isNaN(toDate.getTime())) {
      createdAt.lte = toDate;
    }

    if (Object.keys(createdAt).length) {
      where.createdAt = createdAt;
    }
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

  if (/^[=+\-@]/.test(s)) {
    s = `'${s}`;
  }

  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }

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

  if (
    v === "COMPANY_CHARGE" ||
    v === "PLATFORM_COMMISSION" ||
    v === "PROVIDER_PAYOUT"
  ) {
    return v;
  }

  return v || "UNKNOWN";
}

function deriveLedgerReconciliationStatus(entry, record) {
  const recordStatus = String(record?.status || "").trim().toUpperCase();

  if (recordStatus) {
    return recordStatus;
  }

  const entryStatus = String(entry?.entryStatus || "").trim().toUpperCase();
  const providerRef = String(entry?.providerRef || "").trim();

  if (entryStatus === "EXECUTED" && providerRef) {
    return "BEKLIYOR";
  }

  if (entryStatus === "PLANNED" && entry?.dueAt) {
    const dueAt = new Date(entry.dueAt);

    if (!Number.isNaN(dueAt.getTime()) && dueAt.getTime() < Date.now()) {
      return "INCELEME_GEREKLI";
    }
  }

  return "BEKLIYOR";
}

function buildSettlementLedgerCsvRow(row) {
  return settlementLedgerExportColumns
    .map((key) => csvEscapeLedger(row?.[key] ?? ""))
    .join(",");
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
      settlementPlans: {
        orderBy: { id: "asc" },
        include: { entries: true },
      },
    },
  });

  const reconciliationRecords = await readSettlementReconciliationRecords();
  const recordMap = new Map();

  for (const record of Array.isArray(reconciliationRecords) ? reconciliationRecords : []) {
    const entryId = Number(record?.entryId || 0);

    if (entryId > 0 && !recordMap.has(entryId)) {
      recordMap.set(entryId, record);
    }
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
          paymentMode:
            source.paymentModeSnapshot ||
            plan.paymentModeSnapshot ||
            "OFF",
          commissionBps: Number(
            plan.commissionBpsSnapshot ||
            source.commissionBpsSnapshot ||
            0
          ),
          settlementPlanId: plan.id,
          settlementPlanStatus: String(plan.status || "DORMANT").toUpperCase(),
          settlementEntryId: entry.id,
          entryType,
          entryStatus,
          grossAmount: Number(plan.grossAmount || 0),
          commissionAmount: Number(plan.commissionAmount || 0),
          providerAmount: Number(plan.providerNetAmount || 0),
          entryAmount: Number(entry.amount || 0),
          currency:
            entry.currencyCode ||
            plan.currencyCode ||
            source.currencyCode ||
            "TRY",
          dueAt: formatLedgerDate(entry.dueAt),
          providerRef: entry.providerRef || "",
          executedAt:
            entryStatus === "EXECUTED"
              ? formatLedgerDate(entry.updatedAt)
              : "",
          cancelledAt:
            entryStatus === "CANCELLED"
              ? formatLedgerDate(entry.updatedAt)
              : "",
          reconciliationStatus: deriveLedgerReconciliationStatus(
            {
              entryStatus,
              dueAt: entry.dueAt,
              providerRef: entry.providerRef,
            },
            recordMap.get(Number(entry.id || 0))
          ),
          updatedAt: formatLedgerDate(entry.updatedAt),
          note: entry.note || "",
        };

        if (
          entryStatusFilter &&
          entryStatusFilter !== "ALL" &&
          entryStatus !== entryStatusFilter
        ) {
          continue;
        }

        if (
          entryTypeFilter &&
          entryTypeFilter !== "ALL" &&
          entryType !== entryTypeFilter
        ) {
          continue;
        }

        if (
          reconciliationStatusFilter &&
          reconciliationStatusFilter !== "ALL" &&
          row.reconciliationStatus !== reconciliationStatusFilter
        ) {
          continue;
        }

        if (fromDate || toDate) {
          const updatedAt = entry.updatedAt
            ? new Date(entry.updatedAt)
            : null;

          if (
            fromDate &&
            (
              !updatedAt ||
              Number.isNaN(updatedAt.getTime()) ||
              updatedAt.getTime() < fromDate.getTime()
            )
          ) {
            continue;
          }

          if (
            toDate &&
            (
              !updatedAt ||
              Number.isNaN(updatedAt.getTime()) ||
              updatedAt.getTime() > toDate.getTime()
            )
          ) {
            continue;
          }
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

          if (!haystack.includes(q)) {
            continue;
          }
        }

        rows.push(row);
      }
    }
  }

  rows.sort(
    (a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) ||
      Number(b.settlementEntryId || 0) -
        Number(a.settlementEntryId || 0)
  );

  return rows;
}

export {
  globalRuleSchema,
  roomRuleSchema,
  sourceIdsSchema,
  settlementEntryActionSchema,
  reconciliationRecordSchema,
  paymentAccountSchema,
  paymentPreviewTake,
  toCommercialSourceCsvRow,
  parseCommercialSourceQuery,
  parseSettlementLedgerExportQuery,
  settlementLedgerExportColumns,
  buildSettlementLedgerCsvRow,
  listSettlementLedgerExportRows,
};
