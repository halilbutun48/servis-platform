import crypto from "node:crypto";
import { prisma } from "../prisma.js";
import { httpError } from "../errors/http.js";
import {
  resolveEffectiveIncomePeriod,
  shouldExcludeInvoiceForCorrectedHakedis,
} from "./incomePeriodCorrection.js";

export const ACCOUNTING_EXPORT_CONTRACT_VERSION = "ACCOUNTING_EXPORT_CONTRACT_V1";
export const ACCOUNTING_EXPORT_SOURCE_SYSTEM = "SeferPakt";
export const ACCOUNTING_EXPORT_FORMATS = Object.freeze(["CSV", "XLSX", "JSON"]);

const ACTUAL_HAKEDIS_STATUSES = new Set(["READY", "FINALIZED"]);
const ACTUAL_INVOICE_STATUSES = new Set(["ISSUED", "PAID"]);
const ACTUAL_SOURCE = "INTERNAL_ACTUAL";
const TEST_SIMULATED_SOURCE = "TEST_SIMULATED";

export function deriveOfferLineage(agreement = {}) {
  const acceptedOffers = [];
  for (const shift of Array.isArray(agreement?.shifts) ? agreement.shifts : []) {
    for (const offer of Array.isArray(shift?.offers) ? shift.offers : []) {
      if (upperText(offer?.status) !== "ACCEPTED") continue;
      const offerId = Number(offer?.id || 0);
      if (!Number.isSafeInteger(offerId) || offerId <= 0) continue;
      acceptedOffers.push({
        id: offerId,
        shiftId: Number(shift?.id || 0) || null,
        status: upperText(offer.status) || null,
        amountCompany: Number.isSafeInteger(Number(offer?.amountCompany)) ? Number(offer.amountCompany) : null,
        amountRoom: Number.isSafeInteger(Number(offer?.amountRoom)) ? Number(offer.amountRoom) : null,
      });
    }
  }
  const uniqueOffers = [...new Map(acceptedOffers.map((offer) => [offer.id, offer])).values()];
  if (!uniqueOffers.length) {
    return {
      status: "NOT_PROVEN",
      offerId: null,
      offerShiftId: null,
      offerStatus: null,
      offerAmountCompanyMinor: null,
      offerAmountRoomMinor: null,
    };
  }
  if (uniqueOffers.length !== 1) {
    return {
      status: "AMBIGUOUS",
      offerId: null,
      offerShiftId: null,
      offerStatus: null,
      offerAmountCompanyMinor: null,
      offerAmountRoomMinor: null,
    };
  }
  const [offer] = uniqueOffers;
  return {
    status: "READY",
    offerId: offer.id,
    offerShiftId: offer.shiftId,
    offerStatus: offer.status,
    offerAmountCompanyMinor: offer.amountCompany,
    offerAmountRoomMinor: offer.amountRoom,
  };
}

export const ACCOUNTING_EXPORT_COLUMNS = Object.freeze([
  "exportId",
  "contractVersion",
  "periodStart",
  "periodEnd",
  "scope",
  "companyId",
  "companyName",
  "companyLegalName",
  "companyTaxNo",
  "roomId",
  "roomName",
  "agreementId",
  "agreementReference",
  "shiftReferences",
  "hakedisReference",
  "invoiceReference",
  "sourceEntityType",
  "sourceEntityId",
  "amountMinor",
  "currencyCode",
  "amountSemantics",
  "estimateType",
  "completeness",
  "confidence",
  "reconciliationStatus",
  "costCenter",
  "department",
  "project",
  "externalReference",
  "provenance",
  "approvalAuditReference",
]);

const safeText = (value, fallback = "") => String(value ?? fallback).replace(/\s+/g, " ").trim();
const upperText = (value, fallback = "") => safeText(value, fallback).toUpperCase();

function isSafeInteger(value) {
  return Number.isSafeInteger(Number(value));
}

function iso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function startDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endDateExclusive(value) {
  const date = startDate(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function validYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeFormat(value) {
  const format = upperText(value, "JSON");
  return ACCOUNTING_EXPORT_FORMATS.includes(format) ? format : format;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function hasUnsafeText(value) {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(String(value ?? ""));
}

function actualHakedis(row, { allowTestSimulated = false } = {}) {
  const source = upperText(row?.source);
  return ACTUAL_HAKEDIS_STATUSES.has(upperText(row?.status))
    && (source === ACTUAL_SOURCE || (allowTestSimulated && source === TEST_SIMULATED_SOURCE));
}

function actualInvoice(row, { allowTestSimulated = false } = {}) {
  const source = upperText(row?.source);
  return ACTUAL_INVOICE_STATUSES.has(upperText(row?.status))
    && (source === ACTUAL_SOURCE || (allowTestSimulated && source === TEST_SIMULATED_SOURCE));
}

function selectCompany() {
  return {
    id: true,
    name: true,
    kind: true,
    legalName: true,
    taxNo: true,
    taxOffice: true,
    regionId: true,
    region: { select: { id: true, name: true } },
  };
}

function selectRoom() {
  return {
    id: true,
    name: true,
    regionId: true,
    region: { select: { id: true, name: true } },
  };
}

function selectAgreement() {
  return {
    id: true,
    companyId: true,
    roomId: true,
    startDate: true,
    endDate: true,
    status: true,
    companyOfferAmount: true,
    roomOfferAmount: true,
    company: { select: selectCompany() },
    room: { select: selectRoom() },
  };
}

function selectHakedis() {
  return {
    id: true,
    reference: true,
    agreementId: true,
    companyId: true,
    roomId: true,
    periodStart: true,
    periodEnd: true,
    amountMinor: true,
    currencyCode: true,
    status: true,
    source: true,
    createdAt: true,
    updatedAt: true,
    agreement: { select: selectAgreement() },
  };
}

function selectInvoice() {
  return {
    id: true,
    reference: true,
    agreementId: true,
    companyId: true,
    roomId: true,
    periodStart: true,
    periodEnd: true,
    amountMinor: true,
    currencyCode: true,
    status: true,
    source: true,
    issuedAt: true,
    createdAt: true,
    updatedAt: true,
    agreement: { select: selectAgreement() },
  };
}

function periodWhere(periodStart, periodEnd) {
  return {
    periodStart: { gte: startDate(periodStart) },
    periodEnd: { lte: startDate(periodEnd) },
  };
}

async function loadScopeData({ scope, companyId, roomId, periodStart, periodEnd }) {
  if (!validYmd(periodStart) || !validYmd(periodEnd) || periodStart > periodEnd) {
    return { company: null, room: null, agreements: [], hakedisRecords: [], invoiceRecords: [], budgetPlan: null };
  }

  const companyWhere = companyId ? { id: companyId } : undefined;
  const roomWhere = roomId ? { id: roomId } : undefined;
  const agreementWhere = scope === "COMPANY"
    ? { companyId, startDate: { lte: endDateExclusive(periodEnd) }, endDate: { gte: startDate(periodStart) } }
    : { roomId, startDate: { lte: endDateExclusive(periodEnd) }, endDate: { gte: startDate(periodStart) } };
  const recordScope = scope === "COMPANY" ? { companyId } : { roomId };

  const [company, room, agreements, hakedisRecords, invoiceRecords, budgetPlan] = await Promise.all([
    companyWhere ? prisma.company.findUnique({ where: companyWhere, select: selectCompany() }) : null,
    roomWhere ? prisma.room.findUnique({ where: roomWhere, select: selectRoom() }) : null,
    prisma.agreement.findMany({ where: agreementWhere, orderBy: { id: "asc" }, select: selectAgreement() }),
    prisma.hakedisRecord.findMany({ where: { ...recordScope, ...periodWhere(periodStart, periodEnd) }, orderBy: { id: "asc" }, select: selectHakedis() }),
    prisma.invoiceRecord.findMany({ where: { ...recordScope, ...periodWhere(periodStart, periodEnd) }, orderBy: { id: "asc" }, select: selectInvoice() }),
    scope === "COMPANY"
      ? prisma.companyBudgetPlan.findFirst({
        where: { companyId, status: { not: "ARCHIVED" } },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: { id: true, version: true, status: true, currencyCode: true, budgetAmountMinor: true, periodStart: true, periodEnd: true, updatedAt: true },
      })
      : null,
  ]);

  return { company, room, agreements, hakedisRecords, invoiceRecords, budgetPlan };
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function containedIncomePeriod(record, periodStart, periodEnd) {
  const recordStart = dateKey(record?.periodStart);
  const recordEnd = dateKey(record?.periodEnd);
  return Boolean(recordStart && recordEnd && recordStart >= periodStart && recordEnd <= periodEnd);
}

function incomeLineKey(record) {
  return `${Number(record?.agreementId || 0) || "none"}:${dateKey(record?.periodStart) || "none"}:${dateKey(record?.periodEnd) || "none"}`;
}

async function buildCollectionEvidence({ providedPrisma, roomId, actualInvoiceRows }) {
  const unavailable = (reason) => ({
    collectionEvidence: {
      kind: "COLLECTION",
      status: "UNAVAILABLE",
      amountMinor: null,
      currencyCode: null,
      recordCount: 0,
      records: [],
      reason,
    },
    receivableEvidence: {
      kind: "RECEIVABLE",
      status: "UNAVAILABLE",
      amountMinor: null,
      currencyCode: null,
      recordCount: 0,
      records: [],
      reason: "Kalan alacak için doğrulanmış tahsilat kaydı bulunamadı.",
    },
  });

  if (!providedPrisma?.invoiceCollection?.findMany || !actualInvoiceRows.length) {
    return unavailable("Bu ROOM ve dönem için canonical tahsilat kaydı bulunamadı.");
  }

  let rows;
  try {
    rows = await providedPrisma.invoiceCollection.findMany({
      where: {
        roomId,
        invoiceId: { in: actualInvoiceRows.map((row) => Number(row.id)).filter((id) => Number.isSafeInteger(id) && id > 0) },
      },
      orderBy: [{ collectedAt: "asc" }, { id: "asc" }],
    });
  } catch (error) {
    if (String(error?.code || "") === "P2021" || /invoicecollection/i.test(String(error?.message || ""))) {
      return unavailable("Tahsilat altyapısı bu çalışma ortamında henüz kurulmadı.");
    }
    throw error;
  }

  const confirmed = (Array.isArray(rows) ? rows : []).filter((row) => String(row?.status || "").toUpperCase() === "CONFIRMED");
  if (!confirmed.length) return unavailable("Bu ROOM ve dönem için doğrulanmış tahsilat kaydı bulunamadı.");

  const invoiceById = new Map(actualInvoiceRows.map((row) => [Number(row.id), row]));
  const currencies = new Set();
  const records = [];
  let collectedAmountMinor = 0;
  for (const row of confirmed) {
    const invoice = invoiceById.get(Number(row?.invoiceId));
    const amountMinor = Number(row?.amountMinor);
    const currencyCode = upperText(row?.currencyCode);
    if (!invoice || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !/^[A-Z]{3}$/.test(currencyCode)) {
      return unavailable("Tahsilat kaydı fatura kapsamı veya tutarıyla doğrulanamıyor.");
    }
    currencies.add(currencyCode);
    collectedAmountMinor += String(row?.direction || "COLLECTION").toUpperCase() === "REVERSAL" ? -amountMinor : amountMinor;
    records.push({
      id: Number(row.id),
      invoiceId: Number(row.invoiceId),
      amountMinor,
      currencyCode,
      direction: upperText(row.direction || "COLLECTION"),
      status: upperText(row.status),
      // Tahsilat V1'de banka sağlayıcısı bağlı değil. BANK_TRANSFER ödeme
      // yöntemidir; kaydı banka tarafından doğrulanmış gibi göstermeyiz.
      verificationMode: "MANUAL",
      verificationStatus: "NOT_BANK_VERIFIED",
      collectedAt: dateKey(row.collectedAt),
      paymentMethod: upperText(row.paymentMethod),
      sourceRef: safeText(row.sourceRef) || null,
      reversalOfId: Number(row.reversalOfId || 0) || null,
    });
  }

  const invoiceAmountMinor = actualInvoiceRows.reduce((sum, row) => sum + Number(row.amountMinor || 0), 0);
  const invoiceCurrency = upperText(actualInvoiceRows[0]?.currencyCode);
  if (currencies.size !== 1 || [...currencies][0] !== invoiceCurrency || collectedAmountMinor < 0 || collectedAmountMinor > invoiceAmountMinor) {
    return unavailable("Tahsilat ve fatura tutarları mutabık değil.");
  }

  return {
    collectionEvidence: {
      kind: "COLLECTION",
      status: "AVAILABLE",
      amountMinor: collectedAmountMinor,
      currencyCode: invoiceCurrency,
      recordCount: confirmed.length,
      records,
      reason: null,
    },
    receivableEvidence: {
      kind: "RECEIVABLE",
      status: "AVAILABLE",
      amountMinor: invoiceAmountMinor - collectedAmountMinor,
      currencyCode: invoiceCurrency,
      recordCount: confirmed.length,
      records,
      reason: null,
    },
  };
}

/**
 * Read-only realized-income evidence for the existing accounting source.
 * Hakedis and matching invoice rows represent one economic income line, never two.
 */
export async function buildRealizedIncomeEvidence({ roomId, periodStart, periodEnd, periodScope = "", asOfDate = new Date(), allowTestSimulated = false, prisma: providedPrisma = prisma } = {}) {
  const normalizedRoomId = Number(roomId);
  const start = safeText(periodStart);
  const end = safeText(periodEnd);
  const normalizedPeriodScope = upperText(periodScope) === "ALL" ? "ALL" : "RANGE";
  const allPeriods = normalizedPeriodScope === "ALL";
  const asOf = dateKey(asOfDate) || dateKey(new Date());
  const unavailableEvidence = (kind) => ({
    kind,
    status: "UNAVAILABLE",
    amountMinor: null,
    currencyCode: null,
    recordCount: 0,
    records: [],
  });
  const empty = {
    status: "UNAVAILABLE",
    authoritative: false,
    amountMinor: null,
    currencyCode: null,
    periodStart: validYmd(start) ? start : null,
    periodEnd: validYmd(end) ? end : null,
    periodScope: normalizedPeriodScope,
    scopeKey: Number.isSafeInteger(normalizedRoomId) && normalizedRoomId > 0 ? `ROOM:${normalizedRoomId}` : null,
    includedCount: 0,
    excludedReasons: [],
    sourceType: allowTestSimulated ? `${ACTUAL_SOURCE}_OR_${TEST_SIMULATED_SOURCE}` : ACTUAL_SOURCE,
    hakedisEvidence: unavailableEvidence("HAKEDIS"),
    invoiceEvidence: unavailableEvidence("INVOICE"),
    collectionEvidence: {
      kind: "COLLECTION",
      status: "UNAVAILABLE",
      amountMinor: null,
      currencyCode: null,
      recordCount: 0,
      records: [],
      reason: "Bu ROOM ve dönem için canonical tahsilat kaydı bulunamadı.",
    },
    receivableEvidence: {
      kind: "RECEIVABLE",
      status: "UNAVAILABLE",
      amountMinor: null,
      currencyCode: null,
      recordCount: 0,
      records: [],
      reason: "Bu ROOM ve dönem için canonical alacak kaydı bulunamadı.",
    },
    lines: [],
  };
  if (!Number.isSafeInteger(normalizedRoomId) || normalizedRoomId <= 0) {
    return { ...empty, excludedReasons: ["Gerçekleşen gelir için geçerli ROOM kapsamı yok."] };
  }
  if (!allPeriods && (!validYmd(start) || !validYmd(end))) {
    return { ...empty, status: "PERIOD_REQUIRED", excludedReasons: ["Geliri incelemek için geçerli bir dönem seçin."] };
  }
  if (!allPeriods && start > end) {
    return { ...empty, status: "INVALID_PERIOD", excludedReasons: ["Gelir dönemi başlangıcı bitiş tarihinden sonra olamaz."] };
  }
  if (allPeriods && (start || end)) {
    return { ...empty, status: "INVALID_SCOPE", excludedReasons: ["Tüm dönemler kapsamı tarih aralığıyla birlikte kullanılamaz."] };
  }

  const [hakedisRecords, invoiceRecords, correctionRecords] = await Promise.all([
    providedPrisma.hakedisRecord.findMany({
      where: { roomId: normalizedRoomId },
      orderBy: { id: "asc" },
      include: { agreement: { select: { company: { select: { id: true, name: true } }, shifts: { select: { id: true, offers: { where: { status: "ACCEPTED" }, select: { id: true, status: true, amountCompany: true, amountRoom: true } } } } } } },
    }),
    providedPrisma.invoiceRecord.findMany({
      where: { roomId: normalizedRoomId },
      orderBy: { id: "asc" },
      include: { agreement: { select: { company: { select: { id: true, name: true } }, shifts: { select: { id: true, offers: { where: { status: "ACCEPTED" }, select: { id: true, status: true, amountCompany: true, amountRoom: true } } } } } } },
    }),
    providedPrisma.hakedisIncomePeriodCorrection?.findMany
      ? providedPrisma.hakedisIncomePeriodCorrection.findMany({
        where: { roomId: normalizedRoomId, status: "ACTIVE" },
        orderBy: [{ hakedisId: "asc" }, { version: "desc" }, { id: "desc" }],
      })
      : Promise.resolve([]),
  ]);
  const activeCorrections = Array.isArray(correctionRecords) ? correctionRecords : [];
  const correctionByHakedisId = new Map();
  for (const correction of activeCorrections) {
    const hakedisId = Number(correction?.hakedisId || 0);
    if (hakedisId > 0 && !correctionByHakedisId.has(hakedisId)) correctionByHakedisId.set(hakedisId, correction);
  }
  const allHakedis = (Array.isArray(hakedisRecords) ? hakedisRecords : [])
    .filter((record) => Number(record?.roomId) === normalizedRoomId);
  const allInvoices = (Array.isArray(invoiceRecords) ? invoiceRecords : [])
    .filter((record) => Number(record?.roomId) === normalizedRoomId);
  const effectiveHakedis = allHakedis.map((record) => {
    const correction = correctionByHakedisId.get(Number(record?.id || 0)) || null;
    const effective = resolveEffectiveIncomePeriod(record, correction);
    return {
      ...record,
      sourceRecord: record,
      correction,
      periodStart: effective.recognizedPeriodStart ? startDate(effective.recognizedPeriodStart) : record.periodStart,
      periodEnd: effective.recognizedPeriodEnd ? startDate(effective.recognizedPeriodEnd) : record.periodEnd,
      sourcePeriodStart: effective.sourcePeriodStart,
      sourcePeriodEnd: effective.sourcePeriodEnd,
      recognizedPeriodStart: effective.recognizedPeriodStart,
      recognizedPeriodEnd: effective.recognizedPeriodEnd,
      correctionId: Number(correction?.id || 0) || null,
      correctionEvidenceRef: safeText(correction?.evidenceRef) || null,
      correctionReason: safeText(correction?.reason) || null,
    };
  });
  const scopedHakedis = effectiveHakedis.filter((record) => allPeriods || containedIncomePeriod(record, start, end));
  const scopedInvoiceCandidates = allInvoices.filter((record) => allPeriods || containedIncomePeriod(record, start, end));
  const actualHakedisRows = scopedHakedis.filter((record) => actualHakedis(record, { allowTestSimulated }));
  const actualAllInvoices = allInvoices.filter((record) => actualInvoice(record, { allowTestSimulated }));
  const excludedCorrectedInvoiceIds = new Set();
  for (const hakedis of effectiveHakedis) {
    if (!hakedis.correction) continue;
    for (const invoice of actualAllInvoices) {
      if (shouldExcludeInvoiceForCorrectedHakedis(invoice, hakedis.sourceRecord, hakedis.correction)) {
        excludedCorrectedInvoiceIds.add(Number(invoice.id));
      }
    }
  }
  const linkedInvoiceByHakedisId = new Map();
  for (const hakedis of actualHakedisRows) {
    if (!hakedis.correction) continue;
    const linkedInvoice = actualAllInvoices.find((invoice) => shouldExcludeInvoiceForCorrectedHakedis(
      invoice,
      hakedis.sourceRecord,
      hakedis.correction,
    ));
    if (linkedInvoice) linkedInvoiceByHakedisId.set(Number(hakedis.id), linkedInvoice);
  }
  const actualInvoiceRows = Array.from(new Map([
    ...scopedInvoiceCandidates.filter((invoice) => actualInvoice(invoice, { allowTestSimulated }))
      .filter((invoice) => !excludedCorrectedInvoiceIds.has(Number(invoice.id)))
      .map((invoice) => [Number(invoice.id), invoice]),
    ...Array.from(linkedInvoiceByHakedisId.values()).map((invoice) => [Number(invoice.id), invoice]),
  ]).values());
  const excludedReasons = [];
  if (scopedHakedis.some((record) => !actualHakedisRows.includes(record))) excludedReasons.push("Yetkili gerçekleşmiş hakediş kaynağı dışındaki kayıtlar dahil edilmedi.");
  if (scopedInvoiceCandidates.some((record) => !actualInvoiceRows.includes(record))) excludedReasons.push("Teklif, bütçe veya tahmin faturası gerçekleşmiş gelir sayılmadı.");
  if (excludedCorrectedInvoiceIds.size) excludedReasons.push("Dönemi düzeltilen hakedişin eski fatura dönemi eski kapsamda ikinci kez sayılmadı.");

  const summarizeEvidence = (kind, rows) => {
    const records = rows.map((record) => ({
      id: Number(record?.id || 0) || null,
      reference: safeText(record?.reference) || null,
      agreementId: Number(record?.agreementId || 0) || null,
      status: upperText(record?.status) || null,
      source: upperText(record?.source) || null,
      amountMinor: Number.isSafeInteger(Number(record?.amountMinor)) && Number(record.amountMinor) >= 0 ? Number(record.amountMinor) : null,
      currencyCode: upperText(record?.currencyCode) || null,
      periodStart: dateKey(record?.periodStart),
      periodEnd: dateKey(record?.periodEnd),
      sourcePeriodStart: dateKey(record?.sourcePeriodStart) || null,
      sourcePeriodEnd: dateKey(record?.sourcePeriodEnd) || null,
      recognizedPeriodStart: dateKey(record?.recognizedPeriodStart) || dateKey(record?.periodStart),
      recognizedPeriodEnd: dateKey(record?.recognizedPeriodEnd) || dateKey(record?.periodEnd),
      correctionId: Number(record?.correctionId || 0) || null,
      correctionEvidenceRef: safeText(record?.correctionEvidenceRef) || null,
    }));
    const validAmounts = records.every((record) => record.amountMinor != null);
    const currencies = new Set(records.map((record) => record.currencyCode).filter(Boolean));
    const statuses = [...new Set(records.map((record) => record.status).filter(Boolean))];
    return {
      kind,
      status: records.some((record) => upperText(record.source) === TEST_SIMULATED_SOURCE)
        ? TEST_SIMULATED_SOURCE
        : records.length ? statuses.length === 1 ? statuses[0] : "MULTIPLE" : "UNAVAILABLE",
      amountMinor: records.length && validAmounts ? records.reduce((sum, record) => sum + record.amountMinor, 0) : null,
      currencyCode: currencies.size === 1 ? [...currencies][0] : null,
      recordCount: records.length,
      records,
    };
  };
  const hakedisEvidence = summarizeEvidence("HAKEDIS", actualHakedisRows);
  const invoiceEvidence = summarizeEvidence("INVOICE", actualInvoiceRows);

  const hakedisKeys = new Set(actualHakedisRows.map(incomeLineKey));
  const invoiceKeys = new Set(actualInvoiceRows.map(incomeLineKey));
  if (hakedisKeys.size !== actualHakedisRows.length || invoiceKeys.size !== actualInvoiceRows.length) {
    return { ...empty, status: "RECONCILIATION_MISMATCH", hakedisEvidence, invoiceEvidence, excludedReasons: [...excludedReasons, "Aynı dönem ve sözleşme için birden fazla gelir kaydı bulundu."] };
  }

  const usedInvoices = new Set();
  const lines = [];
  for (const hakedis of actualHakedisRows) {
    const linkedInvoice = linkedInvoiceByHakedisId.get(Number(hakedis.id)) || null;
    const matchingInvoices = linkedInvoice
      ? [linkedInvoice]
      : actualInvoiceRows.filter((invoice) => !usedInvoices.has(invoice.id)
        && incomeLineKey(invoice) === incomeLineKey(hakedis));
    const invoice = matchingInvoices.find((candidate) => !usedInvoices.has(candidate.id)) || null;
    if (invoice) {
      usedInvoices.add(invoice.id);
      if (Number(invoice.amountMinor) !== Number(hakedis.amountMinor) || upperText(invoice.currencyCode) !== upperText(hakedis.currencyCode)) {
        return {
          ...empty,
          status: "RECONCILIATION_MISMATCH",
          hakedisEvidence,
          invoiceEvidence,
          lines: [{
            agreementId: Number(hakedis.agreementId || invoice.agreementId || 0) || null,
            hakedisId: Number(hakedis.id || 0) || null,
            invoiceId: Number(invoice.id || 0) || null,
            periodStart: dateKey(hakedis.periodStart),
            periodEnd: dateKey(hakedis.periodEnd),
            sourcePeriodStart: dateKey(hakedis.sourcePeriodStart) || null,
            sourcePeriodEnd: dateKey(hakedis.sourcePeriodEnd) || null,
            recognizedPeriodStart: dateKey(hakedis.recognizedPeriodStart) || dateKey(hakedis.periodStart),
            recognizedPeriodEnd: dateKey(hakedis.recognizedPeriodEnd) || dateKey(hakedis.periodEnd),
            correctionId: Number(hakedis.correctionId || 0) || null,
            reconciliationStatus: "MISMATCH",
          }],
          excludedReasons: [...excludedReasons, "Hakediş ve fatura tutarı aynı gerçekleşmiş geliri doğrulamıyor."],
        };
      }
    }
    const amountMinor = Number(hakedis.amountMinor);
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      return { ...empty, status: "INCOME_INVALID", hakedisEvidence, invoiceEvidence, excludedReasons: [...excludedReasons, "Gerçekleşen gelir tutarı güvenli bir minor-unit sayı değil."] };
    }
    const offerLineage = deriveOfferLineage(hakedis?.agreement || invoice?.agreement || {});
    lines.push({
      amountMinor,
      currencyCode: upperText(hakedis.currencyCode) || "TRY",
      companyName: safeText(hakedis?.agreement?.company?.name || invoice?.agreement?.company?.name) || null,
      companyId: Number(hakedis?.agreement?.company?.id || invoice?.agreement?.company?.id || 0) || null,
      agreementId: Number(hakedis.agreementId || 0) || null,
      hakedisId: Number(hakedis.id || 0) || null,
      invoiceId: Number(invoice?.id || 0) || null,
      periodStart: dateKey(hakedis.periodStart),
      periodEnd: dateKey(hakedis.periodEnd),
      sourcePeriodStart: dateKey(hakedis.sourcePeriodStart) || null,
      sourcePeriodEnd: dateKey(hakedis.sourcePeriodEnd) || null,
      recognizedPeriodStart: dateKey(hakedis.recognizedPeriodStart) || dateKey(hakedis.periodStart),
      recognizedPeriodEnd: dateKey(hakedis.recognizedPeriodEnd) || dateKey(hakedis.periodEnd),
      correctionId: Number(hakedis.correctionId || 0) || null,
      correctionEvidenceRef: safeText(hakedis.correctionEvidenceRef) || null,
      correctionReason: safeText(hakedis.correctionReason) || null,
      source: upperText(hakedis.source) || null,
      offerLineageStatus: offerLineage.status,
      ...offerLineage,
      reconciliationStatus: invoice ? "MATCHED" : "HAKEDIS_ONLY",
    });
  }
  for (const invoice of actualInvoiceRows) {
    if (usedInvoices.has(invoice.id)) continue;
    const amountMinor = Number(invoice.amountMinor);
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      return { ...empty, status: "INCOME_INVALID", hakedisEvidence, invoiceEvidence, excludedReasons: [...excludedReasons, "Gerçekleşen fatura tutarı güvenli bir minor-unit sayı değil."] };
    }
    const offerLineage = deriveOfferLineage(invoice?.agreement || {});
    lines.push({
      amountMinor,
      currencyCode: upperText(invoice.currencyCode) || "TRY",
      companyName: safeText(invoice?.agreement?.company?.name) || null,
      companyId: Number(invoice?.agreement?.company?.id || 0) || null,
      agreementId: Number(invoice.agreementId || 0) || null,
      hakedisId: null,
      invoiceId: Number(invoice.id || 0) || null,
      periodStart: dateKey(invoice.periodStart),
      periodEnd: dateKey(invoice.periodEnd),
      source: upperText(invoice.source) || null,
      offerLineageStatus: offerLineage.status,
      ...offerLineage,
      reconciliationStatus: "INVOICE_ONLY",
    });
  }
  const currencies = new Set(lines.map((line) => line.currencyCode));
  if (currencies.size > 1) return { ...empty, status: "SCOPE_MISMATCH", hakedisEvidence, invoiceEvidence, lines, excludedReasons: [...excludedReasons, "Gerçekleşen gelir kayıtları farklı para birimleri içeriyor."] };
  if (!lines.length) return { ...empty, hakedisEvidence, invoiceEvidence, excludedReasons: [...excludedReasons, "Aynı ROOM ve dönemde doğrulanmış gerçekleşmiş gelir kaydı bulunamadı."] };
  if (start > asOf) {
    return {
      ...empty,
      status: "FUTURE_NOT_REALIZED",
      hakedisEvidence,
      invoiceEvidence,
      lines,
      excludedReasons: [...excludedReasons, `Seçilen dönem ${asOf} tarihinden sonra; bugünün gerçekleşmiş geliri olarak kullanılamaz.`],
    };
  }

  const collectionEvidence = await buildCollectionEvidence({
    providedPrisma,
    roomId: normalizedRoomId,
    actualInvoiceRows,
  });

  const hasTestSimulatedSource = lines.some((line) => upperText(line.source) === TEST_SIMULATED_SOURCE);
  return {
    ...empty,
    status: hasTestSimulatedSource ? TEST_SIMULATED_SOURCE : "AVAILABLE",
    authoritative: !hasTestSimulatedSource,
    amountMinor: lines.reduce((sum, line) => sum + line.amountMinor, 0),
    currencyCode: lines[0].currencyCode,
    includedCount: lines.length,
    hakedisEvidence,
    invoiceEvidence,
    ...collectionEvidence,
    sourceType: hasTestSimulatedSource ? TEST_SIMULATED_SOURCE : ACTUAL_SOURCE,
    lines,
    excludedReasons,
  };
}

function createLine({ scope, company, room, agreement, hakedis = null, invoice = null, periodStart, periodEnd, role }) {
  const hakedisIsActual = actualHakedis(hakedis);
  const invoiceIsActual = actualInvoice(invoice);
  const amountSource = hakedisIsActual ? hakedis : invoiceIsActual ? invoice : null;
  const amountMinor = amountSource && isSafeInteger(amountSource.amountMinor) && Number(amountSource.amountMinor) >= 0
    ? Number(amountSource.amountMinor)
    : null;
  const currencyCode = upperText(amountSource?.currencyCode || hakedis?.currencyCode || invoice?.currencyCode || "TRY");
  const bothAmounts = hakedisIsActual && invoiceIsActual && isSafeInteger(hakedis?.amountMinor) && isSafeInteger(invoice?.amountMinor);
  const reconciliationStatus = bothAmounts
    ? Number(hakedis.amountMinor) === Number(invoice.amountMinor)
      ? "MATCHED"
      : Number(invoice.amountMinor) < Number(hakedis.amountMinor) ? "UNDER_INVOICED" : "OVER_INVOICED"
    : hakedisIsActual || invoiceIsActual ? "REVIEW_REQUIRED" : "NON_AUTHORITATIVE_DATA";
  const sourceEntity = amountSource || hakedis || invoice || agreement;
  const sourceEntityType = hakedis ? "HAKEDIS_RECORD" : invoice ? "INVOICE_RECORD" : "AGREEMENT";
  const sourceEntityId = Number(sourceEntity?.id || 0) || null;
  const actualAvailable = Boolean(hakedisIsActual || invoiceIsActual);
  const complete = Boolean(hakedisIsActual && invoiceIsActual && reconciliationStatus === "MATCHED");
  const ownCompany = role === "COMPANY" || role === "SUPER_ADMIN" && scope === "COMPANY";
  const safeCompany = company || agreement?.company || null;
  const safeRoom = room || agreement?.room || null;
  const sourceRevision = [hakedis?.updatedAt, invoice?.updatedAt, agreement?.updatedAt]
    .map(iso).filter(Boolean).sort().at(-1) || null;

  return {
    lineId: `line_${sourceEntityType.toLowerCase()}_${sourceEntityId || "none"}`,
    companyId: Number(safeCompany?.id || agreement?.companyId || 0) || null,
    companyName: safeText(safeCompany?.name),
    companyLegalName: ownCompany ? safeText(safeCompany?.legalName) || null : null,
    companyTaxNo: ownCompany ? safeText(safeCompany?.taxNo) || null : null,
    roomId: Number(safeRoom?.id || agreement?.roomId || 0) || null,
    roomName: safeText(safeRoom?.name),
    agreementId: Number(agreement?.id || hakedis?.agreementId || invoice?.agreementId || 0) || null,
    agreementReference: agreement?.id ? `Agreement #${agreement.id}` : null,
    shiftReferences: [],
    hakedisReference: safeText(hakedis?.reference) || null,
    invoiceReference: safeText(invoice?.reference) || null,
    sourceEntityType,
    sourceEntityId,
    amountMinor,
    currencyCode: /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : null,
    amountSemantics: actualAvailable ? "ACTUAL_APPROVED_OR_ISSUED_SOURCE" : null,
    estimateType: actualAvailable ? "ACTUAL" : "REFERENCE_OR_UNAVAILABLE",
    completeness: complete ? "COMPLETE" : actualAvailable ? "PARTIAL" : "UNAVAILABLE",
    confidence: complete ? "HIGH" : actualAvailable ? "MEDIUM" : "LOW",
    reconciliationStatus,
    costCenter: null,
    department: null,
    project: null,
    externalReference: null,
    provenance: {
      canonicalOwner: "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01",
      scope,
      sourceEntityType,
      sourceEntityId,
      hakedisReference: safeText(hakedis?.reference) || null,
      invoiceReference: safeText(invoice?.reference) || null,
      sourceRevision,
      periodStart,
      periodEnd,
      approvedSource: actualAvailable,
    },
    approvalAuditReference: null,
  };
}

function buildLines({ scope, company, room, agreements, hakedisRecords, invoiceRecords, periodStart, periodEnd, role }) {
  const lines = [];
  const usedInvoices = new Set();
  const agreementById = new Map(agreements.map((item) => [Number(item.id), item]));
  const invoiceFor = (agreementId) => invoiceRecords.find((item) => !usedInvoices.has(item.id) && Number(item.agreementId || 0) === Number(agreementId || 0));

  for (const hakedis of hakedisRecords) {
    const agreement = agreementById.get(Number(hakedis.agreementId)) || hakedis.agreement || null;
    const invoice = invoiceFor(hakedis.agreementId);
    if (invoice) usedInvoices.add(invoice.id);
    lines.push(createLine({ scope, company, room, agreement, hakedis, invoice, periodStart, periodEnd, role }));
  }

  for (const invoice of invoiceRecords) {
    if (usedInvoices.has(invoice.id)) continue;
    const agreement = agreementById.get(Number(invoice.agreementId)) || invoice.agreement || null;
    lines.push(createLine({ scope, company, room, agreement, invoice, periodStart, periodEnd, role }));
  }

  if (!lines.length) {
    for (const agreement of agreements) {
      lines.push(createLine({ scope, company, room, agreement, periodStart, periodEnd, role }));
    }
  }

  return lines.sort((a, b) => String(a.lineId).localeCompare(String(b.lineId)));
}

function finding(severity, code, message, field = null) {
  return { severity, code, message, ...(field ? { field } : {}) };
}

export function validateAccountingExportContract(contract, { format = "JSON" } = {}) {
  const findings = [];
  const periodStart = contract?.period?.periodStart;
  const periodEnd = contract?.period?.periodEnd;
  if (!validYmd(periodStart) || !validYmd(periodEnd)) findings.push(finding("BLOCKING_ERROR", "INVALID_PERIOD", "Geçerli bir dönem başlangıcı ve bitişi seçin.", "period"));
  else if (periodStart > periodEnd) findings.push(finding("BLOCKING_ERROR", "INVALID_PERIOD", "Dönem başlangıcı bitişten sonra olamaz.", "period"));
  if (!ACCOUNTING_EXPORT_FORMATS.includes(normalizeFormat(format))) findings.push(finding("BLOCKING_ERROR", "UNSUPPORTED_FORMAT", "Bu dışa aktarım formatı desteklenmiyor.", "format"));
  if (!contract?.tenant?.tenantId) findings.push(finding("BLOCKING_ERROR", "TENANT_SCOPE_MISSING", "Tenant kapsamı doğrulanamadı.", "tenant"));
  if (!Array.isArray(contract?.records) || contract.records.length === 0) findings.push(finding("BLOCKING_ERROR", "NO_RECORDS", "Seçilen dönemde dışa aktarılabilir kayıt bulunamadı.", "records"));

  const seen = new Set();
  for (const record of contract?.records || []) {
    if (!record?.lineId || seen.has(record.lineId)) findings.push(finding("BLOCKING_ERROR", "DUPLICATE_RECORD", "Aynı kayıt birden fazla kez hazırlanmış.", "records"));
    seen.add(record?.lineId);
    if (!record?.sourceEntityType || !record?.sourceEntityId) findings.push(finding("BLOCKING_ERROR", "SOURCE_REFERENCE_MISSING", "Finansal satırın canonical kaynak referansı eksik.", "records"));
    if (!record?.companyId || !record?.roomId) findings.push(finding("BLOCKING_ERROR", "PARTY_ID_MISSING", "Firma ve taşımacılık firması kimliği eksik.", "records"));
    if (record?.amountMinor !== null && (!isSafeInteger(record.amountMinor) || Number(record.amountMinor) < 0)) findings.push(finding("BLOCKING_ERROR", "INVALID_AMOUNT", "Tutar canonical tam sayı para birimi semantiğini karşılamıyor.", "amountMinor"));
    if (!/^[A-Z]{3}$/.test(String(record?.currencyCode || ""))) findings.push(finding("BLOCKING_ERROR", "INVALID_CURRENCY", "Para birimi kodu geçersiz.", "currencyCode"));
    if (record?.estimateType !== "ACTUAL" && record?.amountMinor !== null) findings.push(finding("BLOCKING_ERROR", "ESTIMATE_AS_ACTUAL", "Tahmini veya referans değer actual muhasebe tutarı olarak dışa aktarılamaz.", "amountMinor"));
    for (const field of ["companyName", "roomName", "agreementReference", "hakedisReference", "invoiceReference"]) {
      if (hasUnsafeText(record?.[field])) findings.push(finding("BLOCKING_ERROR", "UNSAFE_TEXT", "Kontrol karakteri içeren metin dışa aktarılamaz.", field));
    }
    if (!record?.costCenter) findings.push(finding("WARNING", "OPTIONAL_COST_CENTER_MISSING", "Canonical maliyet merkezi bulunmadığı için alan boş bırakıldı.", "costCenter"));
    if (!record?.companyTaxNo) findings.push(finding("INFO", "OPTIONAL_TAX_ID_UNAVAILABLE", "Vergi bilgisi kayıtlı veya bu rolde görünür değil; değer üretilmedi.", "companyTaxNo"));
    if (record?.completeness !== "COMPLETE") findings.push(finding("WARNING", "RECONCILIATION_INCOMPLETE", "Satırın mutabakat/tamlık kapsamı eksik; kayıt semantiği korunuyor.", "completeness"));
  }

  const hasBlocking = findings.some((item) => item.severity === "BLOCKING_ERROR");
  const hasWarning = findings.some((item) => item.severity === "WARNING");
  return {
    status: hasBlocking ? "BLOCKED" : hasWarning ? "WARNING" : "READY",
    findings,
    counts: {
      blockingErrors: findings.filter((item) => item.severity === "BLOCKING_ERROR").length,
      warnings: findings.filter((item) => item.severity === "WARNING").length,
      infos: findings.filter((item) => item.severity === "INFO").length,
    },
  };
}

export const ACCOUNTING_EXPORT_CONTRACT_V1_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: ACCOUNTING_EXPORT_CONTRACT_VERSION,
  type: "object",
  required: ["exportId", "contractVersion", "generatedAt", "sourceSystem", "tenant", "period", "records", "validation", "idempotency", "safety"],
  properties: {
    contractVersion: { const: ACCOUNTING_EXPORT_CONTRACT_VERSION },
    records: { type: "array" },
    safety: { type: "object" },
  },
});

export async function buildAccountingExportContract({ role, scope, companyId = null, roomId = null, periodStart = null, periodEnd = null, format = "JSON", dryRun = true, actorUserId = null } = {}) {
  const normalizedScope = upperText(scope);
  const normalizedFormat = normalizeFormat(format);
  const period = { periodStart: safeText(periodStart) || null, periodEnd: safeText(periodEnd) || null, timezone: "UTC" };
  const data = await loadScopeData({ scope: normalizedScope, companyId, roomId, periodStart, periodEnd });
  const company = data.company || data.agreements[0]?.company || data.hakedisRecords[0]?.agreement?.company || data.invoiceRecords[0]?.agreement?.company || null;
  const room = data.room || data.agreements[0]?.room || data.hakedisRecords[0]?.agreement?.room || data.invoiceRecords[0]?.agreement?.room || null;
  const tenantId = normalizedScope === "COMPANY" ? Number(companyId || company?.id || 0) || null : Number(roomId || room?.id || 0) || null;
  const lines = buildLines({ scope: normalizedScope, company, room, agreements: data.agreements, hakedisRecords: data.hakedisRecords, invoiceRecords: data.invoiceRecords, periodStart, periodEnd, role });
  const stableScope = stableValue({
    contractVersion: ACCOUNTING_EXPORT_CONTRACT_VERSION,
    scope: normalizedScope,
    tenantId,
    period,
    budgetPlanRevision: data.budgetPlan ? { id: data.budgetPlan.id, version: data.budgetPlan.version, updatedAt: iso(data.budgetPlan.updatedAt) } : null,
    records: lines.map((line) => ({
      lineId: line.lineId,
      sourceEntityType: line.sourceEntityType,
      sourceEntityId: line.sourceEntityId,
      amountMinor: line.amountMinor,
      currencyCode: line.currencyCode,
      completeness: line.completeness,
      sourceRevision: line.provenance?.sourceRevision,
    })),
  });
  const fingerprint = sha256(stableScope);
  const exportId = `acctexp_${fingerprint.slice(0, 20)}`;
  const contract = {
    exportId,
    contractVersion: ACCOUNTING_EXPORT_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: actorUserId ? { userId: Number(actorUserId), role: role || null } : { userId: null, role: role || null },
    tenant: {
      scope: normalizedScope,
      tenantId,
      companyId: Number(company?.id || companyId || 0) || null,
      companyName: safeText(company?.name) || null,
      roomId: Number(room?.id || roomId || 0) || null,
      roomName: safeText(room?.name) || null,
      companyKind: upperText(company?.kind) || null,
    },
    sourceSystem: ACCOUNTING_EXPORT_SOURCE_SYSTEM,
    dryRun: Boolean(dryRun),
    idempotency: {
      key: `${ACCOUNTING_EXPORT_CONTRACT_VERSION}:${fingerprint}`,
      scopeFingerprint: fingerprint,
      derivation: "tenant + period + canonical source revision + canonical record identity",
    },
    period,
    records: lines,
    references: {
      budgetPlanId: data.budgetPlan?.id ?? null,
      budgetPlanVersion: data.budgetPlan?.version ?? null,
      sourceRevision: data.budgetPlan ? iso(data.budgetPlan.updatedAt) : null,
    },
    validation: null,
    audit: {
      required: true,
      reference: `audit:${exportId}`,
    },
    safety: {
      previewOnly: Boolean(dryRun),
      integrationPreparation: true,
      accountingPosting: false,
      paymentExecution: false,
      legalFinalization: false,
      externalProviderSubmission: false,
      userApprovalRequiredForGeneration: true,
    },
  };
  contract.validation = validateAccountingExportContract(contract, { format: normalizedFormat });
  contract.contractChecksum = sha256(stableValue({ ...contract, contractChecksum: undefined }));
  return contract;
}

export function assertContractScope(contract, { scope, companyId = null, roomId = null } = {}) {
  if (upperText(contract?.tenant?.scope) !== upperText(scope)) throw httpError(403, "ACCOUNTING_EXPORT_SCOPE_MISMATCH", "Dışa aktarım kapsamı doğrulanamadı.");
  if (upperText(scope) === "COMPANY" && Number(contract?.tenant?.companyId || 0) !== Number(companyId || 0)) throw httpError(403, "ACCOUNTING_EXPORT_SCOPE_MISMATCH", "Bu firmanın dışa aktarım kapsamına erişim yok.");
  if (upperText(scope) === "ROOM" && Number(contract?.tenant?.roomId || 0) !== Number(roomId || 0)) throw httpError(403, "ACCOUNTING_EXPORT_SCOPE_MISMATCH", "Bu taşımacılık firmasının dışa aktarım kapsamına erişim yok.");
  return contract;
}
