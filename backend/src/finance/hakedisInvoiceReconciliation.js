import { prisma } from "../prisma.js";

export const HAKEDIS_INVOICE_RECONCILIATION_VERSION = "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01";

const ACTIVE_HAKEDIS_STATUSES = new Set(["READY", "FINALIZED"]);
const ACTIVE_INVOICE_STATUSES = new Set(["ISSUED", "PAID"]);
const AUTHORITATIVE_SOURCES = new Set(["INTERNAL_ACTUAL"]);

const STATUS_LABELS = {
  MATCHED: "Uyumlu",
  UNDER_INVOICED: "Eksik faturalandırma",
  OVER_INVOICED: "Fazla faturalandırma",
  NO_AGREEMENT: "Sözleşme verisi yok",
  NO_OPERATION: "Operasyon kanıtı yok",
  NO_HAKEDIS: "Hakediş verisi yok",
  NO_INVOICE: "Fatura verisi yok",
  PARTIAL_OPERATION_EVIDENCE: "Operasyon kanıtı eksik",
  PERIOD_MISMATCH: "Dönem uyuşmazlığı",
  DUPLICATE_HAKEDIS: "Birden fazla hakediş kaydı",
  DUPLICATE_INVOICE: "Birden fazla fatura kaydı",
  CURRENCY_MISMATCH: "Para birimi uyuşmazlığı",
  NON_AUTHORITATIVE_DATA: "Bu kayıt gerçek mutabakat kanıtı olarak kullanılamaz.",
  REVIEW_REQUIRED: "İncelenmeli",
  INVALID_PERIOD: "Geçersiz dönem",
};

const REASON_LABELS = {
  NO_AGREEMENT: "Sözleşme bulunamadı.",
  NO_OPERATION: "Seçilen dönemde sözleşmeye bağlı operasyon kanıtı bulunamadı.",
  NO_HAKEDIS: "Bu dönem için karşılaştırılabilir hakediş kaydı bulunamadı.",
  NO_INVOICE: "Bu dönem için karşılaştırılabilir fatura kaydı bulunamadı.",
  PARTIAL_OPERATION_EVIDENCE: "Operasyon kayıtlarının tamamlanma kanıtı eksik.",
  PERIOD_MISMATCH: "Kayıtların dönemleri aynı değil; karşılaştırma güvenli biçimde yapılamadı.",
  DUPLICATE_HAKEDIS: "Aynı dönem için birden fazla hakediş kaydı bulundu.",
  DUPLICATE_INVOICE: "Aynı dönem için birden fazla fatura kaydı bulundu.",
  CURRENCY_MISMATCH: "Hakediş ve fatura para birimleri aynı değil.",
  NON_AUTHORITATIVE_DATA: "Demo veya test kaydı gerçek mutabakat kanıtı olarak kullanılamaz.",
  UNDER_INVOICED: "Fatura tutarı hakediş tutarının altında.",
  OVER_INVOICED: "Fatura tutarı hakediş tutarının üzerinde.",
};

function asInteger(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

function ymdFromDate(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isValidYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizePeriod(start, end) {
  const periodStart = ymdFromDate(start);
  const periodEnd = ymdFromDate(end);
  if (!periodStart || !periodEnd || !isValidYmd(periodStart) || !isValidYmd(periodEnd)) {
    return { periodStart, periodEnd, valid: false };
  }
  return { periodStart, periodEnd, valid: periodStart <= periodEnd };
}

function uniqueValues(items) {
  return [...new Set((items || []).filter((value) => value != null).map((value) => String(value)))];
}

function reason(code, detail = null) {
  return {
    code,
    label: REASON_LABELS[code] || "Ek inceleme gerekiyor.",
    ...(detail ? { detail: String(detail) } : {}),
  };
}

function missing(code) {
  return { code, label: STATUS_LABELS[code] || "Eksik veri" };
}

function statusFor({ agreement, operations, hakedisRecords, invoiceRecords, periodMismatch, hakedisPeriodMismatch, invoicePeriodMismatch }) {
  if (!agreement) return "NO_AGREEMENT";
  if (periodMismatch || hakedisPeriodMismatch || invoicePeriodMismatch) return "PERIOD_MISMATCH";
  if (!operations.length) return "NO_OPERATION";
  if (hakedisRecords.length > 1) return "DUPLICATE_HAKEDIS";
  if (invoiceRecords.length > 1) return "DUPLICATE_INVOICE";
  if (!hakedisRecords.length) return "NO_HAKEDIS";
  if (!invoiceRecords.length) return "NO_INVOICE";
  if (hakedisRecords.some((record) => !isAuthoritativeSource(record?.source)) || invoiceRecords.some((record) => !isAuthoritativeSource(record?.source))) return "REVIEW_REQUIRED";
  const completed = operations.filter((item) => item.completed).length;
  if (completed !== operations.length) return "PARTIAL_OPERATION_EVIDENCE";
  const hakedisCurrency = String(hakedisRecords[0]?.currencyCode || "TRY").toUpperCase();
  const invoiceCurrency = String(invoiceRecords[0]?.currencyCode || "TRY").toUpperCase();
  if (hakedisCurrency !== invoiceCurrency) return "CURRENCY_MISMATCH";
  const expected = asInteger(hakedisRecords[0]?.amountMinor);
  const invoice = asInteger(invoiceRecords[0]?.amountMinor);
  if (expected == null || invoice == null) return "REVIEW_REQUIRED";
  if (invoice === expected) return "MATCHED";
  return invoice < expected ? "UNDER_INVOICED" : "OVER_INVOICED";
}

function isAuthoritativeSource(value) {
  return AUTHORITATIVE_SOURCES.has(String(value || "").trim().toUpperCase());
}

export function buildReconciliationPreview(input = {}) {
  const agreement = input.agreement || null;
  const period = normalizePeriod(input.periodStart, input.periodEnd);
  const operations = Array.isArray(input.operations) ? input.operations : [];
  const hakedisRecords = (Array.isArray(input.hakedisRecords) ? input.hakedisRecords : [])
    .filter((record) => ACTIVE_HAKEDIS_STATUSES.has(String(record?.status || "READY").toUpperCase()));
  const invoiceRecords = (Array.isArray(input.invoiceRecords) ? input.invoiceRecords : [])
    .filter((record) => ACTIVE_INVOICE_STATUSES.has(String(record?.status || "ISSUED").toUpperCase()));
  const periodMismatch = input.periodMismatch === true;
  const hakedisPeriodMismatch = input.hakedisPeriodMismatch === true;
  const invoicePeriodMismatch = input.invoicePeriodMismatch === true;
  const status = period.valid ? statusFor({ agreement, operations, hakedisRecords, invoiceRecords, periodMismatch, hakedisPeriodMismatch, invoicePeriodMismatch }) : "INVALID_PERIOD";
  const hakedis = agreement && hakedisRecords.length === 1 ? hakedisRecords[0] : null;
  const invoice = agreement && invoiceRecords.length === 1 ? invoiceRecords[0] : null;
  const hakedisIsAuthoritative = hakedis && isAuthoritativeSource(hakedis.source);
  const invoiceIsAuthoritative = invoice && isAuthoritativeSource(invoice.source);
  const expectedAmountMinor = hakedisIsAuthoritative ? asInteger(hakedis.amountMinor) : null;
  const invoiceAmountMinor = invoiceIsAuthoritative ? asInteger(invoice.amountMinor) : null;
  const currencies = {
    hakedis: String(hakedis?.currencyCode || "TRY").toUpperCase(),
    invoice: String(invoice?.currencyCode || "TRY").toUpperCase(),
  };
  const canCompare = ["MATCHED", "UNDER_INVOICED", "OVER_INVOICED"].includes(status)
    && expectedAmountMinor != null
    && invoiceAmountMinor != null
    && Number.isSafeInteger(expectedAmountMinor)
    && Number.isSafeInteger(invoiceAmountMinor);
  const differenceMinor = canCompare ? invoiceAmountMinor - expectedAmountMinor : null;
  const completedCount = operations.filter((item) => item.completed).length;
  const shiftIds = uniqueValues(operations.map((item) => item.id));
  const reasons = [];
  if (status !== "MATCHED" && REASON_LABELS[status] && !["UNDER_INVOICED", "OVER_INVOICED"].includes(status)) reasons.push(reason(status));
  if (status === "MATCHED") reasons.push({ code: "MATCHED", label: "Hakediş ve fatura aynı tutarı gösteriyor." });
  if (status === "UNDER_INVOICED" || status === "OVER_INVOICED") reasons.push(reason(status));
  const missingData = [];
  if (status === "NO_AGREEMENT") missingData.push(missing("NO_AGREEMENT"));
  if (status === "NO_OPERATION") missingData.push(missing("NO_OPERATION"));
  if (["NO_HAKEDIS", "DUPLICATE_HAKEDIS"].includes(status)) missingData.push(missing("NO_HAKEDIS"));
  if (["NO_INVOICE", "DUPLICATE_INVOICE"].includes(status)) missingData.push(missing("NO_INVOICE"));
  if (status === "PARTIAL_OPERATION_EVIDENCE") missingData.push(missing("PARTIAL_OPERATION_EVIDENCE"));
  if (status === "PERIOD_MISMATCH") missingData.push(missing("PERIOD_MISMATCH"));
  if (status === "CURRENCY_MISMATCH") missingData.push(missing("CURRENCY_MISMATCH"));
  if (status === "REVIEW_REQUIRED" && (hakedis && !isAuthoritativeSource(hakedis.source) || invoice && !isAuthoritativeSource(invoice.source))) missingData.push(missing("NON_AUTHORITATIVE_DATA"));

  return {
    ok: true,
    data: {
      previewOnly: true,
      calculationVersion: HAKEDIS_INVOICE_RECONCILIATION_VERSION,
      status,
      statusLabel: STATUS_LABELS[status] || STATUS_LABELS.REVIEW_REQUIRED,
      period: { start: period.periodStart || null, end: period.periodEnd || null },
      agreement: agreement ? {
        id: agreement.id ?? null,
        reference: agreement.reference || `Sözleşme #${agreement.id}`,
        status: agreement.status || null,
        companyId: agreement.companyId ?? null,
        roomId: agreement.roomId ?? null,
        agreementValue: {
          companyChargeMinor: asInteger(agreement.companyOfferAmount),
          providerPayoutMinor: asInteger(agreement.roomOfferAmount),
          currencyCode: String(agreement.currencyCode || "TRY").toUpperCase(),
          source: "AGREEMENT_CONTRACT",
        },
      } : null,
      expectedAmount: expectedAmountMinor == null ? null : {
        amountMinor: expectedAmountMinor,
        currencyCode: currencies.hakedis,
        source: "HAKEDIS_RECORD",
        reference: hakedis.reference || null,
      },
      hakedisPreview: {
        exists: !!hakedis,
        id: hakedis?.id ?? null,
        reference: hakedis?.reference || null,
        amountMinor: expectedAmountMinor,
        currencyCode: currencies.hakedis,
        status: hakedis?.status || null,
        source: hakedis?.source || null,
      },
      invoice: {
        exists: !!invoice,
        id: invoice?.id ?? null,
        reference: invoice?.reference || null,
        amountMinor: invoiceAmountMinor,
        currencyCode: currencies.invoice,
        status: invoice?.status || null,
        source: invoice?.source || null,
      },
      difference: {
        amountMinor: differenceMinor,
        absoluteAmountMinor: differenceMinor == null ? null : Math.abs(differenceMinor),
        direction: differenceMinor == null || differenceMinor === 0 ? "NONE" : differenceMinor < 0 ? "INVOICE_UNDER" : "INVOICE_OVER",
      },
      reasons,
      evidence: {
        agreement: agreement ? {
          id: agreement.id ?? null,
          reference: agreement.reference || `Sözleşme #${agreement.id}`,
          periodStart: ymdFromDate(agreement.startDate),
          periodEnd: ymdFromDate(agreement.endDate),
        } : null,
        operations: {
          shiftIds,
          eligibleCount: operations.length,
          completedCount,
          partialCount: Math.max(0, operations.length - completedCount),
          dateRange: { start: period.periodStart || null, end: period.periodEnd || null },
        },
        hakedis: hakedis ? { id: hakedis.id ?? null, reference: hakedis.reference || null, periodStart: ymdFromDate(hakedis.periodStart), periodEnd: ymdFromDate(hakedis.periodEnd) } : null,
        invoice: invoice ? { id: invoice.id ?? null, reference: invoice.reference || null, periodStart: ymdFromDate(invoice.periodStart), periodEnd: ymdFromDate(invoice.periodEnd) } : null,
      },
      missingData,
      confidence: status === "MATCHED" || status === "UNDER_INVOICED" || status === "OVER_INVOICED" ? "HIGH" : status === "PARTIAL_OPERATION_EVIDENCE" ? "MEDIUM" : "LOW",
      nextAction: status === "MATCHED" ? "İnceleme gerekmiyor" : status === "NO_AGREEMENT" || status === "NO_OPERATION" || status === "NO_HAKEDIS" || status === "NO_INVOICE" || status === "PARTIAL_OPERATION_EVIDENCE" ? "Eksik veriyi tamamla" : "Farkı incele",
      externalReferenceUsedForTruth: false,
      demoFixtureUsedForTruth: false,
      safety: {
        paymentExecution: false,
        invoiceApproval: false,
        hakedisFinalization: false,
        accountingPosting: false,
      },
    },
  };
}

function periodDateStart(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function periodDateEndExclusive(ymd) {
  const date = periodDateStart(ymd);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function dateRangeWhere(periodStart, periodEnd) {
  return {
    gte: periodDateStart(periodStart),
    lt: periodDateEndExclusive(periodEnd),
  };
}

function recordPeriodMatches(record, period) {
  return ymdFromDate(record?.periodStart) === period.periodStart && ymdFromDate(record?.periodEnd) === period.periodEnd;
}

export async function buildAgreementReconciliationPreview({ agreementId, invoiceId = null, hakedisId = null, periodStart = null, periodEnd = null } = {}) {
  const agreement = agreementId
    ? await prisma.agreement.findUnique({
      where: { id: Number(agreementId) },
      select: {
        id: true,
        companyId: true,
        roomId: true,
        startDate: true,
        endDate: true,
        status: true,
        companyOfferAmount: true,
        roomOfferAmount: true,
      },
    })
    : null;
  if (!agreement) {
    return buildReconciliationPreview({ periodStart, periodEnd, agreement: null });
  }

  const period = normalizePeriod(periodStart || agreement.startDate, periodEnd || agreement.endDate);
  if (!period.valid) return buildReconciliationPreview({ periodStart: period.periodStart, periodEnd: period.periodEnd, agreement });

  const [shifts, allHakedis, allInvoices] = await Promise.all([
    prisma.shift.findMany({
      where: {
        agreementId: agreement.id,
        startAt: dateRangeWhere(period.periodStart, period.periodEnd),
        status: { notIn: ["DRAFT", "REJECTED"] },
      },
      select: { id: true, status: true, startAt: true, endAt: true, progress: { select: { completedAt: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.hakedisRecord.findMany({ where: { agreementId: agreement.id, status: { not: "CANCELLED" } }, orderBy: { id: "asc" } }),
    prisma.invoiceRecord.findMany({ where: { agreementId: agreement.id, status: { not: "CANCELLED" } }, orderBy: { id: "asc" } }),
  ]);

  const hakedisCandidates = hakedisId
    ? allHakedis.filter((record) => Number(record.id) === Number(hakedisId))
    : allHakedis.filter((record) => recordPeriodMatches(record, period));
  const invoiceCandidates = invoiceId
    ? allInvoices.filter((record) => Number(record.id) === Number(invoiceId))
    : allInvoices.filter((record) => recordPeriodMatches(record, period));
  return buildReconciliationPreview({
    agreement,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    operations: shifts.map((shift) => ({
      id: shift.id,
      status: shift.status,
      startAt: shift.startAt,
      endAt: shift.endAt,
      completed: String(shift.status || "").toUpperCase() === "DONE" || !!shift.progress?.completedAt,
    })),
    hakedisRecords: hakedisCandidates,
    invoiceRecords: invoiceCandidates,
    hakedisPeriodMismatch: !!(hakedisId ? hakedisCandidates[0] && !recordPeriodMatches(hakedisCandidates[0], period) : allHakedis.length && !hakedisCandidates.length),
    invoicePeriodMismatch: !!(invoiceId ? invoiceCandidates[0] && !recordPeriodMatches(invoiceCandidates[0], period) : allInvoices.length && !invoiceCandidates.length),
  });
}

export function reconciliationStatusLabels() {
  return { ...STATUS_LABELS };
}
