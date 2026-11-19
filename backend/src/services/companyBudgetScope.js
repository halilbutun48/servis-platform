import { prisma } from "../prisma.js";
import { httpError } from "../errors/http.js";
import { resolveAgreementCommercialEvidence } from "../finance/agreementCommercialEvidence.js";

const ELIGIBLE_AGREEMENT_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE"]);
const INVALID_AGREEMENT_STATUSES = new Set(["CANCELLED", "REJECTED"]);

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function dateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  const text = compactText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizeDateRange({ periodStart, periodEnd }) {
  const start = dateOnly(periodStart);
  const end = dateOnly(periodEnd);
  return {
    start,
    end,
    valid: Boolean(start && end && start <= end),
  };
}

export function normalizeAgreementIdList(values) {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];
  for (const value of source) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function statusLabel(status) {
  const key = String(status || "").toUpperCase();
  if (key === "APPROVED") return "Onaylandı";
  if (key === "ACTIVE") return "Aktif";
  if (key === "DONE") return "Tamamlandı";
  if (key === "REQUESTED") return "Onay bekliyor";
  if (key === "COUNTERED") return "Karşı teklif bekliyor";
  if (key === "CANCELLED") return "İptal edildi";
  if (key === "REJECTED") return "Reddedildi";
  return "Durum bilinmiyor";
}

function summarizeAgreement(agreement, { selected, coverage }) {
  const serviceCount = Number(agreement?._count?.shifts || 0);
  const roomName = compactText(agreement?.room?.name) || "Hizmet kaydı";
  const start = dateOnly(agreement?.startDate) || "-";
  const end = dateOnly(agreement?.endDate) || "-";
  const coverageLabel = coverage === "partial" ? "Kısmi dönem kesişimi" : "Dönemin tamamı";
  return {
    agreementId: Number(agreement.id),
    companyId: Number(agreement.companyId),
    roomName,
    status: String(agreement.status || "").toUpperCase(),
    statusLabel: statusLabel(agreement.status),
    periodStart: start,
    periodEnd: end,
    periodCoverage: coverage,
    periodCoverageLabel: coverageLabel,
    serviceCount,
    companyOfferAmountMinor: agreement?.companyOfferAmount === null || agreement?.companyOfferAmount === undefined
      ? null
      : Number(agreement.companyOfferAmount),
    commercialAmountMinor: agreement?.commercialAmountMinor == null
      ? null
      : Number(agreement.commercialAmountMinor),
    commercialPriceSource: agreement?.commercialPriceSource || null,
    commercialPriceStatus: agreement?.commercialPriceStatus || "NOT_PROVEN",
    commercialPriceMissing: Array.isArray(agreement?.commercialPriceMissing)
      ? agreement.commercialPriceMissing
      : [],
    currencyCode: "TRY",
    selected: Boolean(selected),
    summaryText: `${roomName} • ${start} – ${end} • ${serviceCount} planlı hizmet`,
  };
}

function classifyAgreement(agreement, { companyId, periodStart, periodEnd, selectedIds }) {
  if (Number(agreement?.companyId || 0) !== Number(companyId || 0)) return null;

  const id = Number(agreement?.id || 0);
  const status = String(agreement?.status || "").toUpperCase();
  const selected = selectedIds.has(id);
  const range = normalizeDateRange({ periodStart, periodEnd });
  const agreementRange = normalizeDateRange({ periodStart: agreement?.startDate, periodEnd: agreement?.endDate });

  if (!range.valid) {
    return {
      bucket: "excluded",
      item: summarizeAgreement(agreement, { selected, coverage: "unknown" }),
      reason: "Önce geçerli bir bütçe dönemi seçin",
    };
  }
  if (!agreementRange.valid) {
    return {
      bucket: "excluded",
      item: summarizeAgreement(agreement, { selected, coverage: "unknown" }),
      reason: "Sözleşme dönemi eksik",
    };
  }
  if (INVALID_AGREEMENT_STATUSES.has(status)) {
    return {
      bucket: "excluded",
      item: summarizeAgreement(agreement, { selected, coverage: "unknown" }),
      reason: "Sözleşme iptal edilmiş veya geçersiz",
    };
  }
  if (!ELIGIBLE_AGREEMENT_STATUSES.has(status)) {
    return {
      bucket: "excluded",
      item: summarizeAgreement(agreement, { selected, coverage: "unknown" }),
      reason: "Sözleşme henüz onaylı değil",
    };
  }
  if (agreementRange.end < range.start || agreementRange.start > range.end) {
    return {
      bucket: "excluded",
      item: summarizeAgreement(agreement, { selected, coverage: "unknown" }),
      reason: "Bütçe dönemi dışında",
    };
  }

  const coverage = agreementRange.start >= range.start && agreementRange.end <= range.end ? "full" : "partial";
  return {
    bucket: "eligible",
    item: summarizeAgreement(agreement, { selected, coverage }),
    reason: coverage === "partial" ? "Sözleşme dönemi bütçeyle kısmen kesişiyor" : null,
  };
}

export function buildCompanyBudgetScopeView({ companyId, periodStart, periodEnd, agreements = [], selectedAgreementIds = [] }) {
  const selectedIds = new Set(normalizeAgreementIdList(selectedAgreementIds));
  const eligible = [];
  const excluded = [];

  for (const agreement of Array.isArray(agreements) ? agreements : []) {
    const classified = classifyAgreement(agreement, { companyId, periodStart, periodEnd, selectedIds });
    if (!classified) continue;
    const item = { ...classified.item, reason: classified.reason };
    if (classified.bucket === "eligible") eligible.push(item);
    else excluded.push(item);
  }

  const eligibleIds = new Set(eligible.map((item) => item.agreementId));
  const selected = normalizeAgreementIdList(selectedAgreementIds).filter((id) => eligibleIds.has(id));
  return {
    companyId: Number(companyId || 0) || null,
    periodStart: dateOnly(periodStart) || null,
    periodEnd: dateOnly(periodEnd) || null,
    selectedAgreementIds: selected,
    eligible,
    excluded,
    summaryText: selected.length
      ? `${selected.length} sözleşme bütçe kapsamına bağlı.`
      : "Bu bütçeye henüz sözleşme bağlanmadı.",
  };
}

export function validateCompanyBudgetScopeSelection({ companyId, periodStart, periodEnd, agreements = [], selectedAgreementIds = [] }) {
  const requested = normalizeAgreementIdList(selectedAgreementIds);
  const view = buildCompanyBudgetScopeView({ companyId, periodStart, periodEnd, agreements, selectedAgreementIds: requested });
  const eligibleIds = new Set(view.eligible.map((item) => item.agreementId));
  const excludedById = new Map(view.excluded.map((item) => [item.agreementId, item]));

  for (const agreementId of requested) {
    if (eligibleIds.has(agreementId)) continue;
    const excluded = excludedById.get(agreementId);
    if (excluded?.reason) {
      throw httpError(409, "COMPANY_BUDGET_SCOPE_INVALID", `Bu sözleşme bütçeye eklenemedi: ${excluded.reason}.`);
    }
    throw httpError(409, "COMPANY_BUDGET_SCOPE_UNAUTHORIZED", "Seçilen kayıt bu firmaya ait yetkili bir sözleşme değil.");
  }

  return {
    selectedAgreementIds: requested,
    view,
  };
}

function agreementScopeSelect() {
  return {
    id: true,
    companyId: true,
    status: true,
    startDate: true,
    endDate: true,
    companyOfferAmount: true,
    roomOfferAmount: true,
    room: { select: { id: true, name: true } },
    _count: { select: { shifts: true } },
  };
}

export async function enrichAgreementCommercialEvidence(db = prisma, agreements = []) {
  const rows = Array.isArray(agreements) ? agreements : [];
  const agreementIds = rows
    .map((agreement) => Number(agreement?.id))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  if (!agreementIds.length) return rows;

  const auditLogs = await db.auditLog.findMany({
    where: { entity: "Agreement", entityId: { in: agreementIds } },
    select: { id: true, entityId: true, action: true, meta: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const logsByAgreementId = new Map();
  for (const log of auditLogs) {
    const id = Number(log.entityId);
    if (!logsByAgreementId.has(id)) logsByAgreementId.set(id, []);
    logsByAgreementId.get(id).push(log);
  }

  return rows.map((agreement) => {
    const evidence = resolveAgreementCommercialEvidence({
      agreement,
      auditLogs: logsByAgreementId.get(Number(agreement.id)) || [],
    });
    const reference = evidence.commercialReference;
    return {
      ...agreement,
      commercialAmountMinor: reference.amountMinor,
      commercialPriceCurrencyCode: reference.currencyCode,
      commercialPriceSource: reference.source,
      commercialPriceStatus: reference.status,
      commercialPriceMissing: reference.missing,
      commercialPriceConflicts: reference.conflicts,
    };
  });
}

export async function listCompanyBudgetScopeAgreements(db = prisma, companyId) {
  const agreements = await db.agreement.findMany({
    where: { companyId: Number(companyId) },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    select: agreementScopeSelect(),
  });
  return enrichAgreementCommercialEvidence(db, agreements);
}

export function buildCompanyBudgetScopeRelations(selectedAgreementIds, actorUserId = null) {
  return normalizeAgreementIdList(selectedAgreementIds).map((agreementId) => ({
    agreementId,
    createdByUserId: actorUserId ? Number(actorUserId) : null,
  }));
}
