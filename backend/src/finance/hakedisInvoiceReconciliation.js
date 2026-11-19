import { prisma } from "../prisma.js";
import { ymdTR } from "../time/tr.js";
import { buildServicePeriodPlanningScope } from "./servicePeriodPlanning.js";

export const HAKEDIS_INVOICE_RECONCILIATION_VERSION = "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01";

const ACTIVE_HAKEDIS_STATUSES = new Set(["READY", "FINALIZED"]);
const ACTIVE_INVOICE_STATUSES = new Set(["ISSUED", "PAID"]);
const AUTHORITATIVE_SOURCES = new Set(["INTERNAL_ACTUAL"]);
const ACCEPTED_AGREEMENT_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE"]);
export const ROOM_HAKEDIS_CALCULATION_VERSION = HAKEDIS_INVOICE_RECONCILIATION_VERSION;
export const ROOM_PROPORTIONAL_SERVICE_DAY_TERM = "Eşit hizmet günü üzerinden orantılı hakediş";
const CLAIMED_SERVICE_DATES_NOTE_PREFIX = "Hakediş hizmet günleri:";

const STATUS_LABELS = {
  MATCHED: "Uyumlu",
  UNDER_INVOICED: "Eksik faturalandırma",
  OVER_INVOICED: "Fazla faturalandırma",
  NO_AGREEMENT: "Sözleşme verisi yok",
  NO_OPERATION: "Operasyon kanıtı yok",
  NO_HAKEDIS: "Hakediş verisi yok",
  NO_INVOICE: "Fatura verisi yok",
  PARTIAL_OPERATION_EVIDENCE: "Operasyon kanıtı eksik",
  INCOME_SERVICE_SCOPE_NOT_PROVEN: "Hizmet kapsamı doğrulanmadı",
  INCOME_NO_NEW_SERVICE_UNITS: "Yeni hakediş birimi yok",
  PARTIAL_HAKEDIS_HISTORY: "Kısmi hakediş geçmişi",
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
  INCOME_SERVICE_SCOPE_NOT_PROVEN: "Sözleşme dönemi için planlı hizmetlerin tamamı kanıtlanmadı; kayıtlı hakediş otomatik hesap kanıtı değildir.",
  INCOME_NO_NEW_SERVICE_UNITS: "Bu işlem için daha önce hakedişe alınmamış tamamlanmış hizmet günü bulunmuyor.",
  PARTIAL_HAKEDIS_HISTORY: "Bu sözleşme dönemi için birden fazla kısmi hakediş bulundu; yeni hesap yalnız yeni tamamlanan hizmet günlerini kapsar.",
  PERIOD_MISMATCH: "Kayıtların dönemleri aynı değil; karşılaştırma güvenli biçimde yapılamadı.",
  DUPLICATE_HAKEDIS: "Aynı dönem için birden fazla hakediş kaydı bulundu.",
  DUPLICATE_INVOICE: "Aynı dönem için birden fazla fatura kaydı bulundu.",
  CURRENCY_MISMATCH: "Hakediş ve fatura para birimleri aynı değil.",
  NON_AUTHORITATIVE_DATA: "Demo veya test kaydı gerçek mutabakat kanıtı olarak kullanılamaz.",
  REVIEW_REQUIRED: "Karşılaştırma için finansal kanıtların ayrıca incelenmesi gerekiyor.",
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
  return ymdTR(date);
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

function operationIsEligible(operation) {
  return !["DRAFT", "REJECTED", "CANCELLED"].includes(String(operation?.status || "").toUpperCase());
}

function operationIsCompleted(operation, asOfDate) {
  if (!operationIsEligible(operation)) return false;
  const completedByStatus = String(operation?.status || "").toUpperCase() === "DONE";
  const completedByProgress = Boolean(operation?.progress?.completedAt);
  if (!completedByStatus && !completedByProgress && operation?.completed !== true) return false;
  const start = ymdFromDate(operation?.startAt);
  const completedAt = operation?.progress?.completedAt ? ymdFromDate(operation.progress.completedAt) : start;
  const asOf = ymdFromDate(asOfDate);
  return Boolean(start && completedAt && asOf && start <= asOf && completedAt <= asOf);
}

function normalizedNote(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
}

export function resolveRoomHakedisPricingTerms(agreement = null) {
  const note = normalizedNote(agreement?.roomOfferNote);
  const proportionalTerm = normalizedNote(ROOM_PROPORTIONAL_SERVICE_DAY_TERM);
  if (note.includes(proportionalTerm)) {
    return {
      pricingUnit: "SERVICE_DAY_EQUAL",
      pricingUnitLabel: "Eşit hizmet günü",
      source: "AGREEMENT_ROOM_OFFER_NOTE",
      explicit: true,
    };
  }
  if (/(vardiya|sefer|saat)\s*başına|orantılı\s+hakediş/.test(note)) {
    return {
      pricingUnit: "UNSUPPORTED",
      pricingUnitLabel: "Desteklenmeyen hizmet birimi",
      source: "AGREEMENT_ROOM_OFFER_NOTE",
      explicit: true,
    };
  }
  return {
    pricingUnit: "CONTRACT_PERIOD_FLAT",
    pricingUnitLabel: "Sözleşme dönemi sabit bedeli",
    source: "AGREEMENT_ROOM_OFFER",
    explicit: false,
  };
}

function normalizedDateList(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(ymdFromDate)
    .filter((value) => value && isValidYmd(value)))].sort();
}

export function extractClaimedServiceDates(record = null) {
  const notes = String(record?.notes || "");
  const markerIndex = notes.indexOf(CLAIMED_SERVICE_DATES_NOTE_PREFIX);
  if (markerIndex < 0) return [];
  const tail = notes.slice(markerIndex + CLAIMED_SERVICE_DATES_NOTE_PREFIX.length).split(";")[0];
  return normalizedDateList(tail.split(","));
}

export function serializeClaimedServiceDates(dates = []) {
  const normalized = normalizedDateList(dates);
  return normalized.length ? `${CLAIMED_SERVICE_DATES_NOTE_PREFIX} ${normalized.join(",")}` : `${CLAIMED_SERVICE_DATES_NOTE_PREFIX}`;
}

function roundedRatioMinor(amountMinor, numerator, denominator) {
  if (!Number.isSafeInteger(amountMinor) || !Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0 || numerator < 0) return null;
  const total = BigInt(amountMinor);
  const value = total * BigInt(numerator);
  const divisor = BigInt(denominator);
  const rounded = (value + (divisor / 2n)) / divisor;
  const number = Number(rounded);
  return Number.isSafeInteger(number) ? number : null;
}

/**
 * Agreement.roomOfferNote is the existing accepted contract-terms field. A
 * strict, human-readable term in that field opts a contract into equal-service-
 * day proration. All other agreements retain the legacy full-period flat rule.
 * No free-text note is interpreted as a different unit unless it matches the
 * exact supported term above.
 */
export function calculateRoomHakedisPreview({ agreement = null, periodStart = null, periodEnd = null, operations = [], previouslyClaimedServiceDates = [], claimHistoryProven = true, asOfDate = new Date() } = {}) {
  const period = normalizePeriod(periodStart, periodEnd);
  const agreementStart = ymdFromDate(agreement?.startDate);
  const agreementEnd = ymdFromDate(agreement?.endDate);
  const currencyCode = String(agreement?.currencyCode || "TRY").toUpperCase();
  const amountMinor = asInteger(agreement?.roomOfferAmount);
  const pricingTerms = resolveRoomHakedisPricingTerms(agreement);
  const proportional = pricingTerms.pricingUnit === "SERVICE_DAY_EQUAL";
  const operationRows = (Array.isArray(operations) ? operations : [])
    .filter(operationIsEligible)
    .filter((operation) => {
      const start = ymdFromDate(operation?.startAt);
      return start && period.valid && start >= period.periodStart && start <= period.periodEnd;
    });
  const planningScope = agreement && period.valid
    ? buildServicePeriodPlanningScope({ agreement, periodStart: period.periodStart, periodEnd: period.periodEnd })
    : null;
  const fullPlanningScope = proportional && agreement && agreementStart && agreementEnd
    ? buildServicePeriodPlanningScope({ agreement, periodStart: agreementStart, periodEnd: agreementEnd })
    : planningScope;
  const requestedScheduledServiceDates = planningScope?.scheduledServiceDates || [];
  const scheduledServiceDates = fullPlanningScope?.scheduledServiceDates || [];
  const scheduledDateSet = new Set(requestedScheduledServiceDates);
  const eligibleOperations = operationRows.filter((operation) => scheduledDateSet.has(ymdFromDate(operation?.startAt)));
  const outOfScheduleOperations = operationRows.filter((operation) => !scheduledDateSet.has(ymdFromDate(operation?.startAt)));
  const operationsByDate = new Map();
  const operationsById = new Map();
  for (const operation of eligibleOperations) {
    const date = ymdFromDate(operation?.startAt);
    const dateRows = operationsByDate.get(date) || [];
    dateRows.push(operation);
    operationsByDate.set(date, dateRows);
    const id = Number(operation?.id || 0);
    if (Number.isSafeInteger(id) && id > 0) {
      const idRows = operationsById.get(id) || [];
      idRows.push(operation);
      operationsById.set(id, idRows);
    }
  }
  const missingServiceDates = scheduledServiceDates.filter((date) => !operationsByDate.has(date));
  const duplicateOperationIds = [...operationsById.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([id]) => id);
  const completedOperations = eligibleOperations.filter((operation) => operationIsCompleted(operation, asOfDate));
  const completedServiceDates = [...operationsByDate.entries()]
    .filter(([, rows]) => rows.length > 0 && rows.every((operation) => operationIsCompleted(operation, asOfDate)))
    .map(([date]) => date)
    .sort();
  const incompleteServiceDates = [...operationsByDate.entries()]
    .filter(([, rows]) => rows.length > 0 && rows.some((operation) => !operationIsCompleted(operation, asOfDate)))
    .map(([date]) => date)
    .sort();
  const claimedServiceDates = normalizedDateList(previouslyClaimedServiceDates)
    .filter((date) => scheduledServiceDates.includes(date));
  const claimedServiceDateSet = new Set(claimedServiceDates);
  const newlyCompletedServiceDates = completedServiceDates.filter((date) => !claimedServiceDateSet.has(date));
  const unearnedServiceDates = scheduledServiceDates.filter((date) => !claimedServiceDateSet.has(date) && !completedServiceDates.includes(date));
  const base = {
    calculationVersion: ROOM_HAKEDIS_CALCULATION_VERSION,
    pricingUnit: pricingTerms.pricingUnit,
    pricingUnitLabel: pricingTerms.pricingUnitLabel,
    pricingTermSource: pricingTerms.source,
    currencyCode,
    agreementAmountMinor: amountMinor,
    amountMinor: null,
    eligibleCount: eligibleOperations.length,
    completedCount: completedOperations.length,
    scheduledServiceDayCount: scheduledServiceDates.length,
    requestedScheduledServiceDayCount: requestedScheduledServiceDates.length,
    missingServiceDayCount: missingServiceDates.length,
    missingServiceDates,
    outOfScheduleCount: outOfScheduleOperations.length,
    duplicateOperationCount: duplicateOperationIds.length,
    duplicateOperationIds,
    completedShiftIds: completedOperations.map((operation) => Number(operation?.id)).filter((id) => Number.isSafeInteger(id) && id > 0),
    completedServiceDates,
    completedServiceUnitCount: completedServiceDates.length,
    incompleteServiceDates,
    previouslyClaimedServiceDates: claimedServiceDates,
    previouslyClaimedServiceUnitCount: claimedServiceDates.length,
    newlyCompletedServiceDates,
    newlyCompletedServiceUnitCount: newlyCompletedServiceDates.length,
    unearnedServiceDates,
    unearnedServiceUnitCount: unearnedServiceDates.length,
    previouslyClaimedAmountMinor: proportional ? roundedRatioMinor(amountMinor, claimedServiceDates.length, scheduledServiceDates.length) : null,
    cumulativeClaimedAmountMinor: null,
    remainingContractAmountMinor: proportional ? amountMinor : null,
    formula: "Kabul edilmiş sözleşme dönemi bedeli; planlı vardiya/sefer sayısıyla çarpılmaz.",
    source: pricingTerms.source,
  };
  if (!agreement || !period.valid || !agreementStart || !agreementEnd) {
    return { ...base, status: "BLOCKED", code: "INCOME_PERIOD_INVALID", reason: "Sözleşme veya hakediş dönemi geçerli değil." };
  }
  if (!ACCEPTED_AGREEMENT_STATUSES.has(String(agreement.status || "").toUpperCase())) {
    return { ...base, status: "BLOCKED", code: "INCOME_AGREEMENT_NOT_ACCEPTED", reason: "Kabul edilmiş ve yürürlükte bir sözleşme bulunmuyor." };
  }
  if (currencyCode !== "TRY") {
    return { ...base, status: "BLOCKED", code: "INCOME_CURRENCY_UNSUPPORTED", reason: "Sözleşmenin para birimi bu otomatik hesapta desteklenmiyor." };
  }
  if (amountMinor == null || amountMinor <= 0) {
    return { ...base, status: "BLOCKED", code: "INCOME_PRICE_NOT_PROVEN", reason: "Kabul edilmiş sözleşme fiyatı bulunmuyor." };
  }
  if (pricingTerms.pricingUnit === "UNSUPPORTED") {
    return { ...base, status: "BLOCKED", code: "INCOME_PRICING_UNIT_UNSUPPORTED", reason: "Sözleşmenin hakediş birimi bu otomatik hesapta desteklenmiyor." };
  }
  if (proportional && !claimHistoryProven) {
    return { ...base, status: "BLOCKED", code: "INCOME_CLAIM_HISTORY_NOT_PROVEN", reason: "Önceki hakedişin hangi hizmet günlerini kapsadığı doğrulanamadı; tekrar hakediş oluşturulmadı." };
  }
  if (!planningScope || !fullPlanningScope || planningScope.missing.includes("Hizmet dönemi ve sıklığı") || planningScope.missing.includes("Günlük hizmet saati") || fullPlanningScope.missing.includes("Hizmet dönemi ve sıklığı") || fullPlanningScope.missing.includes("Günlük hizmet saati") || !scheduledServiceDates.length) {
    return { ...base, status: "BLOCKED", code: "INCOME_SERVICE_SCHEDULE_NOT_PROVEN", reason: "Sözleşmenin planlı hizmet takvimi doğrulanmadan hakediş hesaplanmadı." };
  }
  if (period.periodStart < agreementStart || period.periodEnd > agreementEnd) {
    return { ...base, status: "BLOCKED", code: "INCOME_PERIOD_OUTSIDE_AGREEMENT", reason: "Hakediş dönemi sözleşme dönemi içinde olmalıdır." };
  }
  if (!proportional && (period.periodStart !== agreementStart || period.periodEnd !== agreementEnd)) {
    return { ...base, status: "BLOCKED", code: "INCOME_PRICING_PERIOD_UNSUPPORTED", reason: "Sözleşme fiyatı yalnız sözleşmenin tam dönemi için kanıtlandı; kısmi dönem payı hesaplanmadı." };
  }
  if (outOfScheduleOperations.length) {
    return { ...base, status: "BLOCKED", code: "INCOME_OPERATION_OUTSIDE_SCHEDULE", reason: "Takvim dışında kalan hizmet kaydı sözleşme hakedişine dahil edilmedi." };
  }
  if (duplicateOperationIds.length) {
    return { ...base, status: "BLOCKED", code: "INCOME_OPERATION_DUPLICATE", reason: "Aynı gerçekleşmiş hizmet kaydı birden fazla kez bulundu; hakediş kapsamı netleşmeden hesap yapılmadı." };
  }
  if (!eligibleOperations.length) {
    return { ...base, status: "BLOCKED", code: "INCOME_OPERATION_NOT_COMPLETE", reason: "Seçilen dönemde hakedişe uygun operasyon bulunmuyor." };
  }
  if (!completedOperations.length) {
    return { ...base, status: "BLOCKED", code: "INCOME_OPERATION_NOT_COMPLETE", reason: "Seçilen dönemde tamamlanmış operasyon kanıtı bulunmuyor." };
  }
  if (proportional) {
    if (incompleteServiceDates.length) {
      return { ...base, status: "BLOCKED", code: "INCOME_OPERATION_NOT_COMPLETE", reason: "Hizmet günü içindeki operasyonların tamamı gerçekleşmeden hakediş hesaplanmadı." };
    }
    if (claimedServiceDates.length > scheduledServiceDates.length) {
      return { ...base, status: "BLOCKED", code: "INCOME_CLAIM_HISTORY_INVALID", reason: "Önceki hakediş kapsamı sözleşmenin planlı hizmet günlerini aşıyor." };
    }
    if (!newlyCompletedServiceDates.length) {
      return { ...base, status: "BLOCKED", code: "INCOME_NO_NEW_SERVICE_UNITS", reason: "Bu işlem için daha önce hakedişe alınmamış tamamlanmış hizmet günü bulunmuyor." };
    }
    const previousAmountMinor = roundedRatioMinor(amountMinor, claimedServiceDates.length, scheduledServiceDates.length);
    const cumulativeClaimedAmountMinor = roundedRatioMinor(amountMinor, claimedServiceDates.length + newlyCompletedServiceDates.length, scheduledServiceDates.length);
    const currentAmountMinor = cumulativeClaimedAmountMinor == null || previousAmountMinor == null
      ? null
      : cumulativeClaimedAmountMinor - previousAmountMinor;
    if (currentAmountMinor == null || currentAmountMinor <= 0 || cumulativeClaimedAmountMinor > amountMinor) {
      return { ...base, status: "BLOCKED", code: "INCOME_AMOUNT_CAP_INVALID", reason: "Kümülatif hakediş sözleşme bedelini aşacak şekilde hesaplanamadı." };
    }
    return {
      ...base,
      status: "READY",
      amountMinor: currentAmountMinor,
      previouslyClaimedAmountMinor: previousAmountMinor,
      cumulativeClaimedAmountMinor,
      remainingContractAmountMinor: amountMinor - cumulativeClaimedAmountMinor,
      formula: "Sözleşme dönemi bedeli × yeni tamamlanan hizmet günü / sözleşmedeki toplam hizmet günü; kuruş farkı kümülatif tutarda dengelenir.",
      source: pricingTerms.source,
      reason: "Kabul edilmiş sözleşme fiyatı ve yeni tamamlanmış hizmet günleri doğrulandı.",
    };
  }
  if (completedOperations.length !== eligibleOperations.length) {
    return { ...base, status: "BLOCKED", code: "INCOME_OPERATION_SCOPE_INCOMPLETE", reason: "Dönemdeki tüm uygun operasyonların gerçekleştiği kanıtlanmadan hakediş hesaplanmadı." };
  }
  if (missingServiceDates.length) {
    return { ...base, status: "BLOCKED", code: "INCOME_OPERATION_SCOPE_INCOMPLETE", reason: "Sözleşmenin tüm planlı hizmet günleri gerçekleşmeden hakediş hesaplanmadı." };
  }
  return {
    ...base,
    status: "READY",
    amountMinor,
    reason: "Sözleşme fiyatı ve dönemdeki uygun gerçekleşmiş operasyonlar doğrulandı.",
  };
}

function activePeriodKey(record, activeStatuses) {
  if (!activeStatuses.has(String(record?.status || "").toUpperCase())) return null;
  const periodStart = ymdFromDate(record?.periodStart);
  const periodEnd = ymdFromDate(record?.periodEnd);
  if (!periodStart || !periodEnd) return null;
  return `${periodStart}|${periodEnd}`;
}

export function resolveReconciliationPeriod({
  agreement = null,
  periodStart = null,
  periodEnd = null,
  hakedisRecords = [],
  invoiceRecords = [],
} = {}) {
  const hasExplicitPeriod = periodStart != null || periodEnd != null;
  const defaultPeriod = normalizePeriod(periodStart || agreement?.startDate, periodEnd || agreement?.endDate);
  if (hasExplicitPeriod || !agreement || !defaultPeriod.valid) {
    return { period: defaultPeriod, fallbackUsed: false };
  }

  const agreementStart = ymdFromDate(agreement.startDate);
  const agreementEnd = ymdFromDate(agreement.endDate);
  const hakedisPeriods = new Set(
    (Array.isArray(hakedisRecords) ? hakedisRecords : [])
      .map((record) => activePeriodKey(record, ACTIVE_HAKEDIS_STATUSES))
      .filter(Boolean),
  );
  const invoicePeriods = new Set(
    (Array.isArray(invoiceRecords) ? invoiceRecords : [])
      .map((record) => activePeriodKey(record, ACTIVE_INVOICE_STATUSES))
      .filter(Boolean),
  );
  const commonPeriods = [...hakedisPeriods]
    .filter((key) => invoicePeriods.has(key))
    .filter((key) => {
      const [candidateStart, candidateEnd] = key.split("|");
      return candidateStart >= agreementStart && candidateEnd <= agreementEnd;
    });

  if (commonPeriods.length !== 1) {
    return { period: defaultPeriod, fallbackUsed: false };
  }
  const [candidateStart, candidateEnd] = commonPeriods[0].split("|");
  return {
    period: normalizePeriod(candidateStart, candidateEnd),
    fallbackUsed: true,
    source: "CANONICAL_INCOME_PAIR",
  };
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

function statusFor({ agreement, operations, hakedisRecords, invoiceRecords, periodMismatch, hakedisPeriodMismatch, invoicePeriodMismatch, proportionalPricing = false }) {
  if (!agreement) return "NO_AGREEMENT";
  if (periodMismatch || hakedisPeriodMismatch || invoicePeriodMismatch) return "PERIOD_MISMATCH";
  if (!operations.length) return "NO_OPERATION";
  if (hakedisRecords.length > 1) return proportionalPricing ? "PARTIAL_HAKEDIS_HISTORY" : "DUPLICATE_HAKEDIS";
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
  const pricingTerms = resolveRoomHakedisPricingTerms(agreement);
  const claimRecords = (Array.isArray(input.claimedHakedisRecords) ? input.claimedHakedisRecords : hakedisRecords)
    .filter((record) => ACTIVE_HAKEDIS_STATUSES.has(String(record?.status || "READY").toUpperCase()));
  const previouslyClaimedServiceDates = input.previouslyClaimedServiceDates == null
    ? claimRecords.flatMap((record) => extractClaimedServiceDates(record))
    : input.previouslyClaimedServiceDates;
  const claimHistoryProven = input.claimHistoryProven !== false
    && (!claimRecords.length || pricingTerms.pricingUnit !== "SERVICE_DAY_EQUAL" || claimRecords.every((record) => extractClaimedServiceDates(record).length > 0));
  let status = period.valid ? statusFor({ agreement, operations, hakedisRecords, invoiceRecords, periodMismatch, hakedisPeriodMismatch, invoicePeriodMismatch, proportionalPricing: pricingTerms.pricingUnit === "SERVICE_DAY_EQUAL" }) : "INVALID_PERIOD";
  const hakedis = agreement && hakedisRecords.length === 1 ? hakedisRecords[0] : null;
  const invoice = agreement && invoiceRecords.length === 1 ? invoiceRecords[0] : null;
  const hakedisIsAuthoritative = hakedis && isAuthoritativeSource(hakedis.source);
  const invoiceIsAuthoritative = invoice && isAuthoritativeSource(invoice.source);
  const expectedAmountMinor = hakedisIsAuthoritative ? asInteger(hakedis.amountMinor) : null;
  const invoiceAmountMinor = invoiceIsAuthoritative ? asInteger(invoice.amountMinor) : null;
  const incomeCalculation = period.valid && agreement
    ? calculateRoomHakedisPreview({ agreement, periodStart: period.periodStart, periodEnd: period.periodEnd, operations, previouslyClaimedServiceDates, claimHistoryProven })
    : null;
  if (
    incomeCalculation
    && incomeCalculation.status !== "READY"
    && ["MATCHED", "UNDER_INVOICED", "OVER_INVOICED"].includes(status)
  ) {
    status = "INCOME_SERVICE_SCOPE_NOT_PROVEN";
  }
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
  const nonAuthoritativeEvidence = Boolean(
    (hakedis && !isAuthoritativeSource(hakedis.source))
    || (invoice && !isAuthoritativeSource(invoice.source)),
  );
  const reasons = [];
  if (status !== "MATCHED" && REASON_LABELS[status] && !["UNDER_INVOICED", "OVER_INVOICED"].includes(status)) reasons.push(reason(status));
  if (status === "MATCHED") reasons.push({ code: "MATCHED", label: "Hakediş ve fatura aynı tutarı gösteriyor." });
  if (status === "UNDER_INVOICED" || status === "OVER_INVOICED") reasons.push(reason(status));
  if (status === "REVIEW_REQUIRED" && nonAuthoritativeEvidence) reasons.unshift(reason("NON_AUTHORITATIVE_DATA"));
  const missingData = [];
  if (status === "NO_AGREEMENT") missingData.push(missing("NO_AGREEMENT"));
  if (status === "NO_OPERATION") missingData.push(missing("NO_OPERATION"));
  if (["NO_HAKEDIS", "DUPLICATE_HAKEDIS"].includes(status)) missingData.push(missing("NO_HAKEDIS"));
  if (["NO_INVOICE", "DUPLICATE_INVOICE"].includes(status)) missingData.push(missing("NO_INVOICE"));
  if (status === "PARTIAL_OPERATION_EVIDENCE") missingData.push(missing("PARTIAL_OPERATION_EVIDENCE"));
  if (status === "INCOME_SERVICE_SCOPE_NOT_PROVEN") missingData.push(missing("INCOME_SERVICE_SCOPE_NOT_PROVEN"));
  if (status === "PERIOD_MISMATCH") missingData.push(missing("PERIOD_MISMATCH"));
  if (status === "CURRENCY_MISMATCH") missingData.push(missing("CURRENCY_MISMATCH"));
  if (status === "REVIEW_REQUIRED" && nonAuthoritativeEvidence) missingData.push(missing("NON_AUTHORITATIVE_DATA"));
  if (incomeCalculation?.code === "INCOME_CLAIM_HISTORY_NOT_PROVEN") missingData.push({ code: "INCOME_CLAIM_HISTORY_NOT_PROVEN", label: "Önceki hakediş kapsamı doğrulanamadı" });

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
        companyName: agreement.companyName || null,
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
      incomeCalculation,
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
      nextAction: status === "MATCHED" ? "İnceleme gerekmiyor" : status === "NO_AGREEMENT" || status === "NO_OPERATION" || status === "NO_HAKEDIS" || status === "NO_INVOICE" || status === "PARTIAL_OPERATION_EVIDENCE" || status === "INCOME_SERVICE_SCOPE_NOT_PROVEN" ? "Eksik veriyi tamamla" : "Farkı incele",
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

export async function buildAgreementReconciliationPreview({ agreementId, invoiceId = null, hakedisId = null, periodStart = null, periodEnd = null, prismaClient = prisma } = {}) {
  const db = prismaClient;
  const agreement = agreementId
    ? await db.agreement.findUnique({
      where: { id: Number(agreementId) },
      select: {
        id: true,
        companyId: true,
        company: { select: { name: true } },
        roomId: true,
        startDate: true,
        endDate: true,
        weekMask: true,
        startMin: true,
        endMin: true,
        status: true,
        companyOfferAmount: true,
        roomOfferAmount: true,
        roomOfferNote: true,
      },
    })
    : null;
  if (!agreement) {
    return buildReconciliationPreview({ periodStart, periodEnd, agreement: null });
  }

  const [allHakedis, allInvoices] = await Promise.all([
    db.hakedisRecord.findMany({ where: { agreementId: agreement.id, status: { not: "CANCELLED" } }, orderBy: { id: "asc" } }),
    db.invoiceRecord.findMany({ where: { agreementId: agreement.id, status: { not: "CANCELLED" } }, orderBy: { id: "asc" } }),
  ]);
  const periodResolution = resolveReconciliationPeriod({
    agreement,
    periodStart,
    periodEnd,
    hakedisRecords: allHakedis,
    invoiceRecords: allInvoices,
  });
  const period = periodResolution.period;
  const agreementContext = { ...agreement, companyName: agreement.company?.name || null };
  if (!period.valid) return buildReconciliationPreview({ periodStart: period.periodStart, periodEnd: period.periodEnd, agreement: agreementContext });

  const shifts = await db.shift.findMany({
    where: {
      agreementId: agreement.id,
      startAt: dateRangeWhere(period.periodStart, period.periodEnd),
      status: { notIn: ["DRAFT", "REJECTED"] },
    },
    select: { id: true, status: true, startAt: true, endAt: true, progress: { select: { completedAt: true } } },
    orderBy: { startAt: "asc" },
  });

  const hakedisCandidates = hakedisId
    ? allHakedis.filter((record) => Number(record.id) === Number(hakedisId))
    : allHakedis.filter((record) => recordPeriodMatches(record, period));
  const invoiceCandidates = invoiceId
    ? allInvoices.filter((record) => Number(record.id) === Number(invoiceId))
    : allInvoices.filter((record) => recordPeriodMatches(record, period));
  return buildReconciliationPreview({
    agreement: agreementContext,
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
    claimedHakedisRecords: allHakedis,
    previouslyClaimedServiceDates: allHakedis
      .filter((record) => ACTIVE_HAKEDIS_STATUSES.has(String(record?.status || "READY").toUpperCase()))
      .flatMap((record) => extractClaimedServiceDates(record)),
    claimHistoryProven: allHakedis
      .filter((record) => ACTIVE_HAKEDIS_STATUSES.has(String(record?.status || "READY").toUpperCase()))
      .every((record) => resolveRoomHakedisPricingTerms(agreementContext).pricingUnit !== "SERVICE_DAY_EQUAL" || extractClaimedServiceDates(record).length > 0),
    hakedisPeriodMismatch: !!(hakedisId ? hakedisCandidates[0] && !recordPeriodMatches(hakedisCandidates[0], period) : allHakedis.length && !hakedisCandidates.length),
    invoicePeriodMismatch: !!(invoiceId ? invoiceCandidates[0] && !recordPeriodMatches(invoiceCandidates[0], period) : allInvoices.length && !invoiceCandidates.length),
  });
}

export function reconciliationStatusLabels() {
  return { ...STATUS_LABELS };
}
