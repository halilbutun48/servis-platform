import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { getApiErrorInfo } from "../../utils/apiContract";
import {
  buildSimpleCorrectionConfirmation,
  correctionHasChanges,
  defaultExpenseComposerMode,
  formFromDraftItem,
  freshSingleExpenseComposerState,
  SIMPLE_CORRECTION_CONFIRMATION_TOKEN,
  buildExpenseContext,
  clearStaleExpenseContext,
  formPatchForFocusedCategory,
  mergeLoadedExpenseForm,
  userFacingDraftError,
  validateRoomCostDraft,
} from "./roomCostFormState.js";
import { focusedExpenseEditorKind, normalizeExpensePrefill, resolveFocusedExpenseEntry, shouldWaitForFocusedExpenseAuthorization } from "./roomCostLedgerFocus.js";
import { resolveExpenseOwnership } from "./roomCostOwnership.mjs";
import { financeUserFacingError, financeUserFacingText } from "./financeUserFacingLabels.js";
import { buildExpenseRowPresentation, buildExpenseSummaryNotes, expenseMatchesOwner } from "./roomCostLedgerPresentation.js";
import { operationalPeriodMonthValue } from "./financeFocusContext.js";
import { navigate } from "../../router";

const COSTS_BASE = "/api/commercial-core/room/financial-operations/costs";

const VEHICLE_CATEGORIES = new Set([
  "FUEL", "ADBLUE", "MAINTENANCE", "REPAIR", "TIRE_RIM", "MTV_TAX", "TRAFFIC_INSURANCE", "CASCO",
  "INSPECTION", "EMISSION_TEST", "MANDATORY_DOCUMENT", "LOAN_PRINCIPAL", "FINANCE_CHARGE", "LEASING",
  "RENT", "DEPRECIATION", "HGS_TOLL", "PARKING", "CLEANING", "ROADSIDE_ASSISTANCE", "GPS", "CAMERA",
  "VEHICLE_EQUIPMENT", "OTHER_VEHICLE",
]);

const DRIVER_CATEGORIES = new Set([
  "EMPLOYER_MONTHLY_COST", "BASE_SALARY", "BENEFIT", "OVERTIME", "PER_DIEM", "MEAL_ALLOWANCE", "SOCIAL_COST", "OTHER_DRIVER",
]);

const SALARY_CATEGORIES = new Set(["EMPLOYER_MONTHLY_COST", "BASE_SALARY", "BENEFIT", "OVERTIME", "PER_DIEM", "MEAL_ALLOWANCE", "SOCIAL_COST"]);

const BUCKET_LABELS = {
  ACTUAL: "Gerçekleşen",
  BUDGET: "Bütçe",
  FORECAST: "Tahmin",
  ACCRUAL: "Karşılık",
};

const VAT_LABELS = {
  INCLUDED: "KDV dahil",
  EXCLUDED: "KDV hariç",
  NOT_APPLICABLE: "KDV uygulanmaz",
  UNKNOWN: "KDV bilinmiyor",
};

const VAT_CLASSIFICATION_LABELS = {
  UNKNOWN: "KDV durumu bilinmiyor",
  DOCUMENTED_VAT: "Belgeli KDV'li işlem",
  OUT_OF_SCOPE: "KDV kapsamı dışı",
  DOCUMENTED_EXEMPT: "Belgeli KDV istisnası",
  VERIFIED_ZERO_RATE: "Dayanağı doğrulanmış sıfır oran",
};

const VAT_DEDUCTIBILITY_LABELS = {
  UNKNOWN: "İndirilebilirlik bilinmiyor",
  DEDUCTIBLE: "İndirilebilir KDV",
  NON_DEDUCTIBLE: "İndirilemeyen KDV",
  NOT_APPLICABLE: "Uygulanmaz",
};

const CORRECTION_FIELD_LABELS = {
  category: "Gider türü",
  amount: "Tutar",
  currency: "Para birimi",
  vat: "KDV durumu",
  period: "Tarih / dönem",
  relations: "Araç / sürücü / servis",
  source: "Kaynak bilgisi",
  description: "Açıklama",
};

const CATEGORY_LABELS = {
  FUEL: "Yakıt", ADBLUE: "AdBlue", MAINTENANCE: "Periyodik bakım", REPAIR: "Arıza ve onarım",
  TIRE_RIM: "Lastik ve jant", MTV_TAX: "MTV ve araç vergileri", TRAFFIC_INSURANCE: "Trafik sigortası",
  CASCO: "Kasko", INSPECTION: "Muayene", EMISSION_TEST: "Egzoz ölçümü", MANDATORY_DOCUMENT: "Zorunlu belge",
  LOAN_PRINCIPAL: "Kredi anaparası", FINANCE_CHARGE: "Finansman gideri", LEASING: "Leasing", RENT: "Kira",
  DEPRECIATION: "Amortisman", HGS_TOLL: "HGS ve geçiş", PARKING: "Otopark", CLEANING: "Temizlik",
  ROADSIDE_ASSISTANCE: "Yol yardımı", GPS: "GPS", CAMERA: "Kamera", VEHICLE_EQUIPMENT: "Araç ekipmanı",
  OTHER_VEHICLE: "Diğer araç gideri", EMPLOYER_MONTHLY_COST: "Aylık işveren maliyeti", BASE_SALARY: "Temel maaş",
  BENEFIT: "Yan hak", OVERTIME: "Fazla mesai", PER_DIEM: "Harcırah", MEAL_ALLOWANCE: "Yemek desteği",
  SOCIAL_COST: "Sosyal maliyet", OTHER_DRIVER: "Diğer sürücü gideri", SERVICE_DIRECT: "Doğrudan servis gideri",
  ROUTE_FEE: "Güzergâh gideri", OPERATIONS_OVERHEAD: "Operasyon genel gideri", OTHER_OPERATION: "Diğer operasyon gideri",
};

const LIFECYCLE_LABELS = { CONFIRMED: "Onaylı gider", DRAFT: "Taslak", CANCELLED: "İptal edildi" };

const EXPENSE_ENTRY_ACTIONS = Object.freeze([
  {
    key: "driver-monthly-cost",
    label: "Sürücü aylık maliyetini ekle",
    categoryKey: "EMPLOYER_MONTHLY_COST",
    occurrenceKind: "PERIODIC",
    focusField: "driver",
    description: "Sürücüyü seçin, aylık toplam işveren maliyetini ve dönemini gerçek gider olarak kaydedin.",
    protected: true,
  },
  {
    key: "vehicle-rent",
    label: "Araç kira gideri ekle",
    categoryKey: "RENT",
    occurrenceKind: "PERIODIC",
    focusField: "vehicle",
    description: "Plakayı seçin; aylık kira bedeli, dönem, belge ve KDV durumunu girin.",
  },
  {
    key: "fuel",
    label: "Yakıt gideri ekle",
    categoryKey: "FUEL",
    occurrenceKind: "ONE_OFF",
    focusField: "vehicle",
    description: "Yakıt giderini ilgili plaka, tarih ve belgeyle kaydedin.",
  },
  {
    key: "maintenance-tire",
    label: "Bakım / lastik gideri ekle",
    categoryKey: "MAINTENANCE",
    occurrenceKind: "ONE_OFF",
    focusField: "vehicle",
    description: "Bakım veya lastik giderini ilgili plaka ve belgeyle kaydedin.",
  },
  {
    key: "tax-insurance",
    label: "Vergi / sigorta gideri ekle",
    categoryKey: "TRAFFIC_INSURANCE",
    occurrenceKind: "PERIODIC",
    focusField: "vehicle",
    description: "Vergi veya sigorta giderini plaka, tarih ve KDV durumuyla kaydedin.",
  },
  {
    key: "other",
    label: "Diğer gider ekle",
    categoryKey: "OTHER_VEHICLE",
    occurrenceKind: "ONE_OFF",
    focusField: "vehicle",
    description: "Listede olmayan araç giderini plaka, açıklama ve kanıtıyla kaydedin.",
  },
]);

const ADDITIONAL_EXPENSE_ENTRY_ACTIONS = Object.freeze([
  { key: "adblue", label: "AdBlue gideri ekle", categoryKey: "ADBLUE", occurrenceKind: "ONE_OFF", description: "AdBlue giderini ilgili plaka, tarih ve belgeyle kaydedin." },
  { key: "repair", label: "Onarım gideri ekle", categoryKey: "REPAIR", occurrenceKind: "ONE_OFF", description: "Arıza veya onarım giderini ilgili plaka ve belgeyle kaydedin." },
  { key: "tire", label: "Lastik gideri ekle", categoryKey: "TIRE_RIM", occurrenceKind: "ONE_OFF", description: "Lastik ve jant giderini ilgili plaka ve belgeyle kaydedin." },
  { key: "casco", label: "Kasko gideri ekle", categoryKey: "CASCO", occurrenceKind: "PERIODIC", description: "Kasko giderini ilgili plaka, dönem ve belgeyle kaydedin." },
  { key: "inspection", label: "Muayene gideri ekle", categoryKey: "INSPECTION", occurrenceKind: "ONE_OFF", description: "Muayene giderini ilgili plaka, tarih ve belgeyle kaydedin." },
  { key: "hgs", label: "HGS gideri ekle", categoryKey: "HGS_TOLL", occurrenceKind: "ONE_OFF", focusField: "shift", description: "HGS ve geçiş giderini ilgili sefer, tarih ve belgeyle kaydedin." },
  { key: "parking", label: "Otopark gideri ekle", categoryKey: "PARKING", occurrenceKind: "ONE_OFF", description: "Otopark giderini ilgili plaka, tarih ve belgeyle kaydedin." },
]);

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newAutomaticSourceRef() {
  const uuid = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `ROOM-UI-ENTRY-${uuid}`;
}

function initialForm(vehicleId, driverId, recordKind = "ACTUAL", occurredAt = today(), shiftId = null, {
  scopeKind = "",
  agreementId = null,
  offerId = null,
  periodStart = "",
  periodEnd = "",
} = {}) {
  const normalizedScope = normalizeCostScope(scopeKind, { focusOfferId: offerId, focusShiftId: shiftId, vehicleId, driverId });
  return {
    categoryKey: "",
    amountMajor: "",
    currencyCode: "TRY",
    vatMode: "UNKNOWN",
    vatClassification: "UNKNOWN",
    vatAmountMajor: "",
    vatDeductibility: "UNKNOWN",
    vatEvidenceRef: "",
    vatClassificationReason: "",
    recordKind: ["ACTUAL", "BUDGET", "FORECAST", "ACCRUAL"].includes(String(recordKind || "").toUpperCase())
      ? String(recordKind).toUpperCase()
      : "ACTUAL",
    occurredAt: String(occurredAt || today()).slice(0, 10),
    occurrenceKind: "ONE_OFF",
    periodStart: String(periodStart || "").slice(0, 10),
    periodEnd: String(periodEnd || "").slice(0, 10),
    description: "",
    evidenceRef: "",
    sourceRef: positiveId(offerId)
      ? quoteCostSourceRef({ offerId, shiftId, categoryKey: "OTHER_OPERATION" })
      : newAutomaticSourceRef(),
    vehicleId: vehicleId ? String(vehicleId) : "",
    driverId: driverId ? String(driverId) : "",
    shiftId: shiftId ? String(shiftId) : "",
    agreementId: agreementId ? String(agreementId) : "",
    scopeKind: normalizedScope,
  };
}

function formatMinor(value, currencyCode = "TRY") {
  if (value === null || value === undefined || String(value).trim() === "") return "Belirsiz";
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) return "Belirsiz";
  const currency = String(currencyCode || "TRY").toUpperCase();
  const formatted = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100);
  return `${formatted} ${currency === "TRY" ? "₺" : currency}`;
}

function vatClassificationLabel(value) {
  return VAT_CLASSIFICATION_LABELS[String(value || "UNKNOWN").toUpperCase()] || VAT_CLASSIFICATION_LABELS.UNKNOWN;
}

function parseMajor(value) {
  const text = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : null;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("tr-TR");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("tr-TR");
}

function correctionSnapshotSummary(snapshot) {
  if (!snapshot) return "Kayıt bilgisi bulunamadı";
  const dateLabel = snapshot.periodStart && snapshot.periodEnd
    ? `${formatDate(snapshot.periodStart)} – ${formatDate(snapshot.periodEnd)}`
    : formatDate(snapshot.occurredAt || snapshot.periodStart);
  return `${snapshot.categoryLabel || "Gider"} · ${formatMinor(snapshot.amountMinor, snapshot.currencyCode)} · ${dateLabel}`;
}

function queryString({ vehicleId, driverId, includeSalary = false }) {
  const query = new URLSearchParams();
  if (vehicleId) query.set("vehicleId", String(vehicleId));
  if (driverId) query.set("driverId", String(driverId));
  if (includeSalary) query.set("includeSalary", "true");
  const text = query.toString();
  return text ? `?${text}` : "";
}

function readExpenseAction() {
  if (typeof window === "undefined") return "";
  const hashQuery = String(window.location.hash || "").split("?")[1] || "";
  return String(new URLSearchParams(hashQuery).get("action") || "").trim().toLowerCase();
}

function errorMessage(error, fallback) {
  const apiMessage = getApiErrorInfo(error, fallback).message || fallback;
  return financeUserFacingError({ message: userFacingDraftError({ message: apiMessage }, fallback) }, fallback);
}

function categoryDomain(categoryKey) {
  if (VEHICLE_CATEGORIES.has(categoryKey)) return "VEHICLE";
  if (DRIVER_CATEGORIES.has(categoryKey)) return "DRIVER";
  return "OPERATION";
}

const COST_SCOPE_LABELS = Object.freeze({
  COMPANY: "Firma geneli",
  VEHICLE: "Araç",
  DRIVER: "Sürücü",
  OFFER: "Teklif / iş",
  SHIFT: "Vardiya / sefer",
});

const COST_SCOPE_KEYS = new Set(Object.keys(COST_SCOPE_LABELS));

function normalizeCostScope(value, { focusOfferId = null, focusShiftId = null, vehicleId = null, driverId = null } = {}) {
  const normalized = String(value || "").trim().toUpperCase();
  if (COST_SCOPE_KEYS.has(normalized)) return normalized;
  if (positiveId(focusOfferId)) return "OFFER";
  if (positiveId(focusShiftId)) return "SHIFT";
  if (positiveId(vehicleId)) return "VEHICLE";
  if (positiveId(driverId)) return "DRIVER";
  return "COMPANY";
}

function quoteCostSourceRef({ offerId = null, shiftId = null, categoryKey = "" } = {}) {
  const owner = positiveId(offerId) ? `OFFER-${positiveId(offerId)}` : `SHIFT-${positiveId(shiftId) || "UNKNOWN"}`;
  const category = String(categoryKey || "OTHER_OPERATION").trim().toUpperCase() || "OTHER_OPERATION";
  return `ROOM-QUOTE-FORECAST-${owner}-${category}`;
}

function humanMissing(value) {
  const text = String(value || "").trim();
  const labels = {
    amountMinor: "tutar",
    period: "dönem veya tarih",
    currencyCode: "para birimi",
    evidenceRef: "kanıt referansı",
    category: "kategori",
    "confirmed cost entries": "onaylanmış gider kaydı",
  };
  return labels[text] || financeUserFacingText(text, "bilinmeyen alan");
}

function reasonLabel(reason) {
  const labels = {
    VAT_UNKNOWN_NET_ROLLUP: "KDV ayrıştırması bekliyor",
    EXCLUDED_FROM_ROLLUP: "Kapsam dışında bırakıldı",
    NOT_CONFIRMED: "Taslak henüz onaylanmadı",
    MIXED_CURRENCIES: "Para birimleri karışık",
    ALLOCATION_EVIDENCE_INCOMPLETE: "Dağıtım kanıtı eksik",
    DUPLICATE_ROLLUP_LINEAGE: "Aynı kaynak daha önce dağıtılmış",
    COMPONENT_LINEAGE_AMOUNT_MISMATCH: "Bileşen toplamı ana giderle eşleşmiyor",
    FORECAST_SEPARATE_BUCKET: "Tahmin ayrı gösterilir",
    BUDGET_SEPARATE_BUCKET: "Bütçe ayrı gösterilir",
    ACCRUAL_SEPARATE_BUCKET: "Karşılık ayrı gösterilir",
  };
  return labels[String(reason || "").trim()] || "Net toplam kapsamı doğrulanamadı";
}

function allocationFieldLabel(value) {
  const labels = {
    vehicleId: "araç", driverId: "sürücü", agreementId: "sözleşme", shiftId: "vardiya/sefer",
    "shiftId (canonical vardiya/sefer kaydı)": "vardiya/sefer", allocationQuantity: "miktar",
    allocationUnitRateMinor: "birim tutarı", allocationUnit: "birim", "ilişkili kayıt veya açık dönem": "ilişkili kayıt veya dönem",
    "occurredAt or periodStart/periodEnd": "işlem tarihi veya açık dönem",
    "periodStart/periodEnd": "dönem başlangıcı ve bitişi",
  };
  return labels[String(value || "").trim()] || financeUserFacingText(value, "bilinmeyen bilgi");
}

function allocationBlockerLabel(value) {
  const labels = {
    MIXED_CURRENCIES: "Para birimleri için dönüşüm kanıtı gerekiyor",
    ALLOCATION_AMOUNT_MISMATCH: "Miktar ve birim tutarı toplamla eşleşmiyor",
    COMPONENT_LINEAGE_AMOUNT_MISMATCH: "Bileşen toplamı ana giderle eşleşmiyor",
    QUANTITY_RATE_NOT_PERSISTED: "Miktar ve birim tutarı henüz kaydedilmemiş",
    TRIP_OPERATION_OWNER_UNAVAILABLE: "Vardiya/sefer ilişkisi doğrulanamadı",
    OCCURRENCE_KIND_UNSUPPORTED: "Giderin dönem türü tanınmıyor",
    INCOMPLETE_AMOUNT_OR_CURRENCY: "Tutar veya para birimi eksik",
    DUPLICATE_ROLLUP_LINEAGE: "Aynı kaynak daha önce dağıtım hesabına alınmış",
  };
  return labels[String(value || "").trim()] || "Dağıtım için ek doğrulama gerekiyor";
}

function allocationLineHasTarget(line, targetKind) {
  return Array.isArray(line?.targets) && line.targets.some((target) => String(target?.type || "").toUpperCase() === targetKind);
}

function allocationLinePeriodLabel(line) {
  if (line?.periodStart && line?.periodEnd) return `${formatDate(line.periodStart)} – ${formatDate(line.periodEnd)}`;
  if (line?.occurredAt) return formatDate(line.occurredAt);
  return "Dönem veya tarih belirtilmemiş";
}

function allocationLineTargetSummary(line) {
  if (Array.isArray(line?.targets) && line.targets.length) return line.targets.map(targetLabel).join(" • ");
  return "Araç, sürücü veya vardiya bağlantısı yok";
}

function allocationLineScopeLabel(line) {
  const scope = [];
  if (allocationLineHasTarget(line, "VEHICLE")) scope.push("araç");
  if (allocationLineHasTarget(line, "DRIVER")) scope.push("sürücü");
  if (allocationLineHasTarget(line, "AGREEMENT")) scope.push("sözleşme");
  if (allocationLineHasTarget(line, "SHIFT")) scope.push("vardiya/sefer");
  if (line?.periodStart && line?.periodEnd) scope.push("açık dönem");
  else if (line?.occurredAt) scope.push("işlem tarihi");
  return scope.length ? scope.join(" + ") : "İlişki veya dönem kanıtı eksik";
}

function allocationLineMethodLabel(line) {
  if (line?.quantity && line?.unit && line?.unitRateMinor == null && String(line?.evidenceRef || "").startsWith("CANONICAL_SHIFT_USAGE:")) {
    return `${line.quantity} saat · kanıtlı vardiya süre payı`;
  }
  if (line?.quantity && line?.unit && line?.unitRateMinor != null) {
    return `${line.quantity} ${String(line.unit).toLocaleLowerCase("tr-TR")} × ${formatMinor(line.unitRateMinor, line.currencyCode)}`;
  }
  const labels = {
    ONE_OFF: "Tek seferlik gider; işlem tarihi üzerinden",
    PERIODIC: "Dönemsel gider; açık dönem üzerinden",
    RECURRING: "Tekrarlayan gider; açık dönem üzerinden",
    PER_KM: "Kilometre ve birim tutarı üzerinden",
    PER_TRIP: "Vardiya/sefer ve miktar üzerinden",
    PER_SHIFT: "Doğrudan vardiya üzerinden",
  };
  return labels[String(line?.occurrenceKind || "").toUpperCase()] || "Mevcut dönem ve ilişki kanıtı üzerinden";
}

function allocationLineStatusLabel(line) {
  const recordKind = String(line?.recordKind || "").toUpperCase();
  if (line?.lifecycle !== "CONFIRMED") return LIFECYCLE_LABELS[line?.lifecycle] || "Onay bekliyor";
  if (recordKind !== "ACTUAL") return `${BUCKET_LABELS[recordKind] || "Ayrı kayıt"} ayrı kapsam`;
  if (line?.included && allocationLineHasTarget(line, "SHIFT")) return "Vardiyaya dağıtıldı";
  return "Dağıtım bekliyor";
}

function allocationLineStatusDetail(line) {
  const recordKind = String(line?.recordKind || "").toUpperCase();
  if (line?.lifecycle !== "CONFIRMED") return "Bu satır gider defterinde henüz onaylı gider olarak kullanılmıyor.";
  if (recordKind !== "ACTUAL") return `${BUCKET_LABELS[recordKind] || "Bu kayıt"} gerçekleşen gider toplamından ayrı tutulur.`;
  if (!line?.included) return `${reasonLabel(line?.excludedReason || "ALLOCATION_EVIDENCE_INCOMPLETE")}. Bu kayıt operasyonel dağıtım hesabına alınmadı.`;
  if (!allocationLineHasTarget(line, "SHIFT")) return "Araç/sürücü ve dönem kapsamı bulunuyor; belirli bir vardiya payı onaylı kayıtta doğrulanmadı.";
  return "Giderin vardiya/sefer bağlantısı onaylı kayıtta doğrulandı.";
}

function allocationLineEvidenceLabel(line) {
  const evidence = Array.isArray(line?.evidence) ? line.evidence.filter(Boolean) : [];
  const source = line?.sourceRef ? "Kaynak referansı bağlı" : "Kaynak referansı bulunmuyor";
  return [source, ...evidence].join(" • ");
}

function targetLabel(target) {
  if (target?.label) return target.label;
  const labels = { VEHICLE: "Araç kaydı", DRIVER: "Sürücü kaydı", AGREEMENT: "Sözleşme", SHIFT: "Vardiya/sefer", PERIOD: "Dönem" };
  return labels[String(target?.type || "").toUpperCase()] || "İlişkili kayıt";
}

function relationSummary(display = {}) {
  return [display.vehicleLabel, display.driverLabel, display.agreementLabel, display.shiftLabel].filter(Boolean).join(" • ") || "Açık ilişki yok";
}

function offerForecastLabel(entry) {
  const sourceRef = String(entry?.sourceRef || "").trim();
  const match = sourceRef.match(/^ROOM-QUOTE-FORECAST-OFFER-(\d+)-/i);
  return match ? `Bu teklif için tahmini gider · Teklif #${match[1]}` : "";
}

function initialExpenseFilters(vehicleId, driverId, { expenseFilter = "", periodStart = "", periodEnd = "" } = {}) {
  return {
    period: operationalPeriodMonthValue(periodStart, periodEnd),
    vehicleId: vehicleId ? String(vehicleId) : "",
    categoryKey: "",
    driverId: driverId ? String(driverId) : "",
    shift: "",
    lifecycle: "",
    recordKind: "",
    vatMode: expenseFilter === "vat-unknown" ? "UNKNOWN" : "",
    special: expenseFilter,
    periodStart: periodStart || "",
    periodEnd: periodEnd || "",
  };
}

function entryDateValue(entry) {
  return entry?.periodStart || entry?.occurredAt || entry?.periodEnd || null;
}

function entryPeriodKey(entry) {
  const value = entryDateValue(entry);
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period) {
  if (!period) return "Tüm dönemler";
  const [year, month] = String(period).split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function entryHasShiftEvidence(entry) {
  return Boolean(
    positiveId(entry?.shiftId)
      || (Array.isArray(entry?.allocationLines) && entry.allocationLines.some((line) => positiveId(line?.shiftId) || String(line?.targetKind || "").toUpperCase() === "SHIFT")),
  );
}

function isFutureActualEntry(entry, now = new Date()) {
  if (String(entry?.lifecycle || "").toUpperCase() !== "CONFIRMED") return false;
  const originalKind = String(entry?.originalRecordKind || "").toUpperCase();
  const recordKind = String(entry?.recordKind || "").toUpperCase();
  if (recordKind !== "ACTUAL" && !(recordKind === "FORECAST" && originalKind === "ACTUAL")) return false;
  const entryDate = entryDateValue(entry);
  if (!entryDate) return false;
  const candidate = new Date(entryDate);
  const current = new Date(now);
  if (Number.isNaN(candidate.getTime()) || Number.isNaN(current.getTime())) return false;
  candidate.setUTCHours(0, 0, 0, 0);
  current.setUTCHours(0, 0, 0, 0);
  return candidate.getTime() > current.getTime();
}

function entryLifecycleShort(entry) {
  const labels = { CONFIRMED: "Onaylı", DRAFT: "Taslak", CANCELLED: "İptal" };
  return labels[String(entry?.lifecycle || "").toUpperCase()] || "Durum bilinmiyor";
}

function entryRecordSortValue(entry) {
  const values = [entry?.createdAt, entry?.occurredAt, entry?.periodEnd, entry?.periodStart];
  for (const value of values) {
    const timestamp = Date.parse(String(value || ""));
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
}

function compareExpenseEntries(left, right) {
  const timeDifference = entryRecordSortValue(right) - entryRecordSortValue(left);
  if (timeDifference) return timeDifference;
  return Number(right?.id || 0) - Number(left?.id || 0);
}

function entryOwnerLabel(entry) {
  const summary = relationSummary(entry?.display);
  return summary === "Açık ilişki yok" ? "Firma geneli" : summary;
}

function categoryIcon(categoryKey) {
  const icons = {
    FUEL: "⌁", ADBLUE: "≈", MAINTENANCE: "⌁", REPAIR: "⌁", TIRE_RIM: "◌", RENT: "▱",
    TRAFFIC_INSURANCE: "◇", CASCO: "◇", MTV_TAX: "△", INSPECTION: "□", HGS_TOLL: "↔", PARKING: "P",
    CLEANING: "□", DEPRECIATION: "◫", FINANCE_CHARGE: "₺", EMPLOYER_MONTHLY_COST: "◉",
  };
  return icons[String(categoryKey || "").toUpperCase()] || "•";
}

function BucketCard({ kind, bucket }) {
  const safeBucket = bucket || {};
  const netValue = safeBucket.netAmountMinor == null ? "Belirsiz" : formatMinor(safeBucket.netAmountMinor, safeBucket.currencyCode);
  return (
    <div className="card" data-cost-bucket={kind} style={{ minWidth: 0 }}>
      <div className="panelSectionTitle">{BUCKET_LABELS[kind]}</div>
      <div style={{ marginTop: 8, fontWeight: 800 }}>{safeBucket.grossAmountMinor == null ? "Belirsiz" : formatMinor(safeBucket.grossAmountMinor, safeBucket.currencyCode)}</div>
      <div className="panelMeta" style={{ marginTop: 6 }}>Brüt görünüm</div>
      <div className="muted" style={{ marginTop: 8 }}>Net: {netValue}</div>
      {safeBucket.netRollupBlocked ? <div className="muted" style={{ marginTop: 6 }}>KDV doğrulanmadı; net toplam hesaplanmadı.</div> : null}
      <div className="panelMeta" style={{ marginTop: 6 }}>Kayıt: {safeBucket.entryCount ?? "Belirsiz"}</div>
    </div>
  );
}

function allocationStatusLabel(status, { pendingCount = 0, linkedCount = 0 } = {}) {
  if (pendingCount > 0 && linkedCount > 0) return "Dağıtım kısmi; pay bekleyen kayıtlar var";
  if (pendingCount > 0) return "Dağıtım payı bekliyor";
  const labels = {
    READY: "Dağıtım kanıtı tamam",
    PARTIAL: "Dağıtım kanıtı kısmi",
    INCOMPLETE: "Dağıtım kanıtı için veri eksik",
    BLOCKED: "Dağıtım güvenli biçimde durdu",
  };
  return labels[String(status || "").toUpperCase()] || "Dağıtım durumu bilinmiyor";
}

function AllocationPreview({ allocation }) {
  if (!allocation) return null;
  const lines = Array.isArray(allocation.lines) ? allocation.lines : [];
  const missing = Array.isArray(allocation.missing) ? allocation.missing : [];
  const blockers = Array.isArray(allocation.blockers) ? allocation.blockers : [];
  const confirmedLines = lines.filter((line) => line.lifecycle === "CONFIRMED");
  const actualLines = confirmedLines.filter((line) => String(line.recordKind || "").toUpperCase() === "ACTUAL");
  const shiftLinkedLines = actualLines.filter((line) => line.included && allocationLineHasTarget(line, "SHIFT"));
  const pendingShiftLines = actualLines.filter((line) => !line.included || !allocationLineHasTarget(line, "SHIFT"));
  return (
    <div className="card" data-copilot-target="room:financial-operations:cost-allocation" data-copilot-semantic-id="product:room:financial-operations:cost-allocation" style={{ marginTop: 12, border: "1px solid rgba(98,117,255,0.3)" }}>
      <div className="panelSectionTitle">Maliyet dağıtım görünümü</div>
      <div className="muted" style={{ marginTop: 6 }}>{allocationStatusLabel(allocation.status, { pendingCount: pendingShiftLines.length, linkedCount: shiftLinkedLines.length })} • Bu bölüm kayıtların dağıtım kanıtını gösterir; firma geneli brüt gider toplamı değildir.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 10 }}>
        <div className="panelMeta">Kayıtlı gider: <b>{confirmedLines.length}</b></div>
        <div className="panelMeta">Onaylı gerçekleşen: <b>{actualLines.length}</b></div>
        <div className="panelMeta">Vardiyaya dağıtılan: <b>{shiftLinkedLines.length}</b></div>
        <div className="panelMeta">Vardiya payı bekleyen: <b>{pendingShiftLines.length}</b></div>
        <div className="panelMeta">Operasyonel hesaba alınan brüt gerçekleşen gider: <b>{allocation.grossAmountMinor == null ? "Belirsiz" : formatMinor(allocation.grossAmountMinor, allocation.currencyCode)}</b></div>
      </div>
      {allocation.netRollupBlocked ? <div className="muted" style={{ marginTop: 8 }}>KDV sınıflandırması bilinmiyor veya kanıtı eksik; kayıtlı brüt tutar korunur, doğrulanmış net toplam ve net kârlılık sonucu kesinleştirilemez.</div> : <div className="muted" style={{ marginTop: 8 }}>Doğrulanmış net toplam: {allocation.netAmountMinor == null ? "Belirsiz" : formatMinor(allocation.netAmountMinor, allocation.currencyCode)}</div>}
      {allocation.componentLineageSupported === false ? <div className="muted" style={{ marginTop: 8 }}>Bu görünümde bileşen bağlantısı bulunmuyor; ilişkisiz kayıtlar ayrı tutuluyor.</div> : null}
      {missing.length ? <div className="muted" style={{ marginTop: 8 }}>Eksik dağıtım kanıtı: {missing.map(allocationFieldLabel).join(", ")}. Eksik bilgi sıfır kabul edilmedi.</div> : null}
      {blockers.length ? <div className="muted" style={{ marginTop: 8 }}>Güvenli hesap sınırı: {blockers.map(allocationBlockerLabel).join("; ")}</div> : null}
      {lines.length ? (
        <div className="finance-v21-allocation-lines">
          {lines.map((line) => {
            const categoryLabel = CATEGORY_LABELS[String(line.categoryKey || "").toUpperCase()] || line.categoryKey || "Diğer gider";
            const hasShift = allocationLineHasTarget(line, "SHIFT");
            const isShiftDistributed = line.included && hasShift && String(line.recordKind || "").toUpperCase() === "ACTUAL";
            const distributedAmount = isShiftDistributed
              ? formatMinor(line.grossAmountMinor, line.currencyCode)
              : "Vardiya payı doğrulanmadı";
            return <details className="finance-v21-allocation-line" key={line.entryId}>
              <summary>
                <span className="finance-v21-allocation-line-main"><strong>{categoryLabel}</strong><small>{allocationLineTargetSummary(line)} · {allocationLinePeriodLabel(line)}</small></span>
                <span className="finance-v21-allocation-line-amount">{formatMinor(line.grossAmountMinor, line.currencyCode)}</span>
                <span className={`finance-v21-status ${isShiftDistributed ? "finance-v21-status--positive" : "finance-v21-status--warning"}`}>{allocationLineStatusLabel(line)}</span>
              </summary>
              <div className="finance-v21-allocation-line-detail">
                <div><span>Durum</span><strong>{line.lifecycle === "CONFIRMED" ? "Kayıtlı gider" : (LIFECYCLE_LABELS[line.lifecycle] || "Onay bekliyor")}</strong><small>{allocationLineStatusDetail(line)}</small></div>
                <div><span>Gerçek tutar</span><strong>{formatMinor(line.grossAmountMinor, line.currencyCode)}</strong><small>{BUCKET_LABELS[line.recordKind] || "Kayıt türü belirtilmedi"} · {vatClassificationLabel(line.vatClassification)}</small></div>
                <div><span>Bağlı kayıt</span><strong>{allocationLineTargetSummary(line)}</strong><small>{allocationLineScopeLabel(line)}</small></div>
                <div><span>Dönem</span><strong>{allocationLinePeriodLabel(line)}</strong><small>{allocationLineMethodLabel(line)}</small></div>
        <div><span>Vardiyaya bağlı pay</span><strong>{distributedAmount}</strong><small>{hasShift ? "Vardiya/sefer ilişkisi onaylı kayıtta var." : "Belirli vardiya ilişkisi onaylı kayıtta yok."}</small></div>
                <div><span>Kaynak ve kanıt</span><strong>{allocationLineEvidenceLabel(line)}</strong><small>{line.sourceRef ? "Kaynak referansı kayıtla birlikte okunuyor." : "Kaynak referansı bulunmuyor."}</small></div>
                {line.missing?.length ? <div className="finance-v21-allocation-line-warning"><span>Tamamlanması gereken bilgi</span><strong>{line.missing.map(allocationFieldLabel).join(", ")}</strong></div> : null}
                {line.blockers?.length ? <div className="finance-v21-allocation-line-warning"><span>Bu kaydın hesaba alınmama nedeni</span><strong>{line.blockers.map(allocationBlockerLabel).join("; ")}</strong></div> : null}
              </div>
            </details>;
          })}
        </div>
      ) : <div className="muted" style={{ marginTop: 10 }}>Dağıtılabilir onaylı gerçekleşen gider yok.</div>}
      <div className="muted" style={{ marginTop: 8 }}>Bu görünüm salt okunurdur; dağıtım kaydı oluşturmaz.</div>
    </div>
  );
}

export default function RoomCostLedgerPanel({ token, roomId, focusVehicleId, focusDriverId, prefillVehicleId, prefillDriverId, focusCostCategory, focusField, focusExpenseFilter, focusEntryId, focusPeriodStart, focusPeriodEnd, focusRecordKind, focusAgreementId, focusShiftId, focusOfferId, focusContextLabel, returnTo, onClearExpenseFocus, onLedgerChanged }) {
  const vehicleId = positiveId(focusVehicleId);
  const driverId = positiveId(focusDriverId);
  const entryPrefill = normalizeExpensePrefill({ vehicleId: prefillVehicleId, driverId: prefillDriverId });
  const formVehicleId = vehicleId || positiveId(entryPrefill.vehicleId);
  const formDriverId = driverId || positiveId(entryPrefill.driverId);
  const addActionRequested = readExpenseAction() === "add";
  const roomContextKey = String(roomId ?? "").trim();
  const focusEntryTargetId = positiveId(focusEntryId);
  const normalizedRecordKind = ["ACTUAL", "BUDGET", "FORECAST", "ACCRUAL"].includes(String(focusRecordKind || "").toUpperCase())
    ? String(focusRecordKind).toUpperCase()
    : "ACTUAL";
  const planningNeedsCategory = normalizedRecordKind !== "ACTUAL" && Boolean(focusRecordKind);
  const focusedOccurrenceDate = String(focusPeriodStart || "").slice(0, 10) || today();
  const focusedCategoryDomain = categoryDomain(String(focusCostCategory || "").trim().toUpperCase());
  const defaultScopeKind = positiveId(focusOfferId)
    ? "OFFER"
    : positiveId(focusShiftId)
      ? "SHIFT"
      : focusCostCategory
        ? (focusedCategoryDomain === "VEHICLE" ? "VEHICLE" : focusedCategoryDomain === "DRIVER" ? "DRIVER" : "COMPANY")
        : normalizeCostScope("", { vehicleId: formVehicleId, driverId: formDriverId });
  const quoteScopeActive = defaultScopeKind === "OFFER";
  const createFreshForm = useCallback((overrides = {}) => initialForm(
    formVehicleId,
    formDriverId,
    quoteScopeActive ? "FORECAST" : normalizedRecordKind,
    focusedOccurrenceDate,
    focusShiftId,
    {
      scopeKind: defaultScopeKind,
      agreementId: focusAgreementId,
      offerId: focusOfferId,
      periodStart: focusPeriodStart,
      periodEnd: focusPeriodEnd,
      ...overrides,
    },
  ), [defaultScopeKind, focusAgreementId, focusOfferId, focusPeriodEnd, focusPeriodStart, focusShiftId, focusedOccurrenceDate, formDriverId, formVehicleId, normalizedRecordKind, quoteScopeActive]);
  const contextKey = `${roomContextKey}:${vehicleId || ""}:${driverId || ""}:${formVehicleId || ""}:${formDriverId || ""}:${positiveId(focusShiftId) || ""}:${focusExpenseFilter || ""}:${focusEntryTargetId || ""}:${focusPeriodStart || ""}:${focusPeriodEnd || ""}:${normalizedRecordKind}`;
  const currentContextRef = useRef({ roomId: roomContextKey, contextKey, vehicleId, driverId, focusShiftId: positiveId(focusShiftId) });
  const pendingControllersRef = useRef(new Set());
  const fieldRefs = useRef({});
  const composerScrollYRef = useRef(0);
  const autoOpenedFocusEntryRef = useRef("");
  currentContextRef.current = { roomId: roomContextKey, contextKey, vehicleId, driverId, focusShiftId: positiveId(focusShiftId) };
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [salaryRedacted, setSalaryRedacted] = useState(true);
  const [salaryAccessResolved, setSalaryAccessResolved] = useState(false);
  const [form, setForm] = useState(() => createFreshForm());
  const [draftItem, setDraftItem] = useState(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [correctionEntry, setCorrectionEntry] = useState(null);
  const [batchMode, setBatchMode] = useState(addActionRequested);
  const [singleMode, setSingleMode] = useState(!addActionRequested && Boolean(focusCostCategory));
  const [composerOpen, setComposerOpen] = useState(Boolean(focusCostCategory) || addActionRequested);
  const [composerFocusField, setComposerFocusField] = useState("amount");
  const [batchDraftId, setBatchDraftId] = useState("");
  const [batchItems, setBatchItems] = useState([]);
  const [batchEditingItem, setBatchEditingItem] = useState(null);
  const [batchConfirmationText, setBatchConfirmationText] = useState("");
  const [filters, setFilters] = useState(() => initialExpenseFilters(vehicleId, driverId, { expenseFilter: focusExpenseFilter, periodStart: focusPeriodStart, periodEnd: focusPeriodEnd }));
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [entryPage, setEntryPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [validationField, setValidationField] = useState("");
  const [directory, setDirectory] = useState({ vehicles: [], drivers: [], shifts: [] });

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    Promise.all([
      api.get("/api/vehicles", { token }),
      api.get("/api/drivers", { token }),
      api.get("/api/shifts?take=200&includeOffered=1", { token }),
    ])
      .then(([vehicles, drivers, shifts]) => {
        if (!active) return;
        setDirectory({
          vehicles: Array.isArray(vehicles?.items) ? vehicles.items : (Array.isArray(vehicles) ? vehicles : []),
          drivers: Array.isArray(drivers?.items) ? drivers.items : (Array.isArray(drivers) ? drivers : []),
          shifts: Array.isArray(shifts?.items) ? shifts.items : (Array.isArray(shifts) ? shifts : []),
        });
      })
      .catch(() => { if (active) setDirectory({ vehicles: [], drivers: [], shifts: [] }); });
    return () => { active = false; };
  }, [token]);

  const selectedVehicle = useMemo(() => directory.vehicles.find((item) => Number(item?.id) === vehicleId) || null, [directory.vehicles, vehicleId]);
  const selectedDriver = useMemo(() => directory.drivers.find((item) => Number(item?.id) === driverId) || null, [directory.drivers, driverId]);
  const selectedVehicleLabel = selectedVehicle?.plate ? `Araç • ${selectedVehicle.plate}` : (vehicleId ? "Seçili araç" : null);
  const selectedDriverLabel = selectedDriver?.fullName ? `Sürücü • ${selectedDriver.fullName}` : (driverId ? "Seçili sürücü" : null);

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item?.key || "").toUpperCase() === String(form.categoryKey || "").toUpperCase()) || null,
    [categories, form.categoryKey],
  );
  const selectedCategoryKey = String(selectedCategory?.key || form.categoryKey || "").toUpperCase();
  const selectedDomain = categoryDomain(selectedCategoryKey);
  const selectedScopeKind = normalizeCostScope(form.scopeKind, {
    focusOfferId: focusOfferId,
    focusShiftId: form.shiftId || focusShiftId,
    vehicleId: form.vehicleId || formVehicleId,
    driverId: form.driverId || formDriverId,
  });
  const scopeRequiresShift = selectedScopeKind === "SHIFT" || selectedScopeKind === "OFFER";
  const salaryCategorySelected = SALARY_CATEGORIES.has(selectedCategoryKey);
  const shiftCandidates = useMemo(() => {
    const occurredDate = String(form.occurredAt || "").slice(0, 10);
    return directory.shifts.filter((shift) => {
      const status = String(shift?.status || "").toUpperCase();
      if (["CANCELLED", "REJECTED", "DECLINED"].includes(status)) return false;
      if (!occurredDate) return true;
      const startDate = String(shift?.startAt || "").slice(0, 10);
      const endDate = String(shift?.endAt || shift?.startAt || "").slice(0, 10);
      return !startDate || (occurredDate >= startDate && occurredDate <= endDate);
    });
  }, [directory.shifts, form.occurredAt]);
  const expenseContext = useMemo(() => buildExpenseContext({
    categoryKey: selectedCategoryKey,
    focusShiftId,
    formShiftId: form.shiftId,
    candidates: shiftCandidates,
  }), [focusShiftId, form.shiftId, selectedCategoryKey, shiftCandidates]);
  const correctionChanged = correctionEntry
    ? correctionHasChanges(form, formFromDraftItem(correctionEntry))
    : false;
  const correctionConfirmation = buildSimpleCorrectionConfirmation({ hasChanges: correctionChanged });

  useEffect(() => {
    const requestedCategory = String(focusCostCategory || "").trim().toUpperCase();
    if (!requestedCategory || !categories.length) return undefined;
    if (salaryRedacted && SALARY_CATEGORIES.has(requestedCategory)) return undefined;
    if (!categories.some((item) => String(item?.key || "").toUpperCase() === requestedCategory)) return undefined;
    setForm((previous) => formPatchForFocusedCategory(requestedCategory, previous));
    const timer = window.setTimeout(() => {
      const field = fieldRefs.current[String(focusField || "amount")] || fieldRefs.current.amount;
      field?.focus?.();
      field?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [categories, focusCostCategory, focusField, salaryRedacted]);

  useEffect(() => {
    for (const controller of pendingControllersRef.current) controller.abort();
    pendingControllersRef.current.clear();
    setForm(createFreshForm());
    setDraftItem(null);
    setEditingDraft(false);
    setConfirmationText("");
    const requestedAdd = readExpenseAction() === "add";
    setBatchMode(requestedAdd);
    setSingleMode(!requestedAdd && Boolean(focusCostCategory));
    setComposerOpen(Boolean(focusCostCategory) || requestedAdd);
    setComposerFocusField(String(focusField || "amount"));
    setBatchDraftId("");
    setBatchItems([]);
    setBatchEditingItem(null);
    setBatchConfirmationText("");
    setNotice("");
    setError("");
    setValidationField("");
    setBusy("");
    setFilters(initialExpenseFilters(vehicleId, driverId, { expenseFilter: focusExpenseFilter, periodStart: focusPeriodStart, periodEnd: focusPeriodEnd }));
    setShowAllEntries(false);
    setEntryPage(1);
    setSelectedEntry(null);
  }, [contextKey, createFreshForm, driverId, focusCostCategory, focusEntryTargetId, focusExpenseFilter, focusField, focusOfferId, focusPeriodEnd, focusPeriodStart, focusShiftId, focusedOccurrenceDate, formDriverId, formVehicleId, normalizedRecordKind, roomContextKey, vehicleId]);

  useEffect(() => {
    if (!composerOpen) return undefined;
    const timer = window.setTimeout(() => {
      const field = fieldRefs.current[composerFocusField] || fieldRefs.current.amount;
      field?.focus?.({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [composerFocusField, composerOpen]);

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setSalaryAccessResolved(false);
      setError("");
      try {
        let categoryResponse;
        try {
          categoryResponse = await api.get(`${COSTS_BASE}/categories?includeSalary=true`, { token, signal: controller.signal });
          if (active) setSalaryRedacted(Boolean(categoryResponse?.salaryRedacted));
        } catch (categoryError) {
          const info = getApiErrorInfo(categoryError, "Gider kategorileri okunamadı.");
          if (info.status !== 403) throw categoryError;
          categoryResponse = await api.get(`${COSTS_BASE}/categories`, { token, signal: controller.signal });
          if (active) setSalaryRedacted(true);
        }

        let includeSalary = true;
        let listResponse;
        let summaryResponse;
        try {
          const suffix = queryString({ vehicleId, driverId, includeSalary });
          [listResponse, summaryResponse] = await Promise.all([
            api.get(`${COSTS_BASE}${suffix}`, { token, signal: controller.signal }),
            api.get(`${COSTS_BASE}/summary${suffix}`, { token, signal: controller.signal }),
          ]);
        } catch (ledgerError) {
          const info = getApiErrorInfo(ledgerError, "Gider listesi okunamadı.");
          if (info.status !== 403) throw ledgerError;
          includeSalary = false;
          const suffix = queryString({ vehicleId, driverId });
          [listResponse, summaryResponse] = await Promise.all([
            api.get(`${COSTS_BASE}${suffix}`, { token, signal: controller.signal }),
            api.get(`${COSTS_BASE}/summary${suffix}`, { token, signal: controller.signal }),
          ]);
        }
        if (!active) return;
        const nextCategories = Array.isArray(categoryResponse?.items) ? categoryResponse.items : [];
        const nextSalaryRedacted = Boolean(categoryResponse?.salaryRedacted || listResponse?.salaryRedacted || summaryResponse?.salaryRedacted || !includeSalary);
        const visibleCategories = nextCategories.filter((item) => !(nextSalaryRedacted && SALARY_CATEGORIES.has(String(item?.key || "").toUpperCase())));
        const nextEntries = Array.isArray(listResponse?.entries || listResponse?.items) ? (listResponse.entries || listResponse.items) : [];
        setCategories(visibleCategories);
        setEntries(nextEntries.filter((entry) => !(nextSalaryRedacted && SALARY_CATEGORIES.has(String(entry?.categoryKey || "").toUpperCase()))));
        setSummary(summaryResponse || null);
        setSalaryRedacted(nextSalaryRedacted);
        setSalaryAccessResolved(true);
        try {
          const batchResponse = await api.get(`${COSTS_BASE}/draft-batches/current`, { token, signal: controller.signal });
          const currentItems = Array.isArray(batchResponse?.items) ? batchResponse.items : [];
          setBatchDraftId(String(batchResponse?.draftBatchId || ""));
          setBatchItems(currentItems);
        } catch (batchError) {
          if (batchError?.name === "AbortError") throw batchError;
          setBatchDraftId("");
          setBatchItems([]);
        }
        setForm((previous) => mergeLoadedExpenseForm(previous, {
          formVehicleId,
          formDriverId,
          focusShiftId,
          defaultCategoryKey: visibleCategories[0]?.key || "",
          planningNeedsCategory,
        }));
      } catch (loadError) {
        if (loadError?.name === "AbortError" || controller.signal.aborted) return;
        if (active) setError(errorMessage(loadError, "Gider yönetimi verileri okunamadı."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [driverId, focusShiftId, formDriverId, formVehicleId, planningNeedsCategory, roomContextKey, token, vehicleId]);

  function captureContext() {
    return { ...currentContextRef.current };
  }

  function contextIsCurrent(requestContext) {
    const current = currentContextRef.current;
    return Boolean(requestContext)
      && current.roomId === requestContext.roomId
      && current.contextKey === requestContext.contextKey
      && current.vehicleId === requestContext.vehicleId
      && current.driverId === requestContext.driverId;
  }

  function beginRequest() {
    const controller = new AbortController();
    pendingControllersRef.current.add(controller);
    return controller;
  }

  function endRequest(controller) {
    pendingControllersRef.current.delete(controller);
  }

  function updateField(name, value) {
    if (validationField === name || (validationField === "vehicle" && name === "vehicleId") || (validationField === "driver" && name === "driverId")) {
      setValidationField("");
      setError("");
    }
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleCategoryChange(value) {
    const nextCategory = String(value || "").toUpperCase();
    setValidationField("");
    setError("");
    setForm((previous) => {
      const nextScope = normalizeCostScope(previous.scopeKind, {
        focusOfferId,
        focusShiftId: previous.shiftId || focusShiftId,
        vehicleId: previous.vehicleId || formVehicleId,
        driverId: previous.driverId || formDriverId,
      });
      const nextState = clearStaleExpenseContext(previous, nextCategory);
      return {
      ...nextState,
      categoryKey: nextCategory,
      vehicleId: ["VEHICLE", "OFFER", "SHIFT"].includes(nextScope)
        ? (previous.vehicleId || (nextScope === "OFFER" ? String(formVehicleId || "") : ""))
        : "",
      driverId: ["DRIVER", "OFFER", "SHIFT"].includes(nextScope)
        ? (previous.driverId || (nextScope === "OFFER" ? String(formDriverId || "") : ""))
        : "",
      shiftId: ["OFFER", "SHIFT"].includes(nextScope) ? previous.shiftId : nextState.shiftId,
      agreementId: ["OFFER", "SHIFT"].includes(nextScope) ? previous.agreementId : nextState.agreementId,
      };
    });
  }

  function handleScopeChange(value) {
    const nextScope = normalizeCostScope(value);
    setValidationField("");
    setError("");
    setForm((previous) => ({
      ...previous,
      scopeKind: nextScope,
      recordKind: nextScope === "OFFER" ? "FORECAST" : previous.recordKind,
      vehicleId: ["VEHICLE", "OFFER", "SHIFT"].includes(nextScope)
        ? (previous.vehicleId || (nextScope === "OFFER" ? String(formVehicleId || "") : ""))
        : "",
      driverId: ["DRIVER", "OFFER", "SHIFT"].includes(nextScope)
        ? (previous.driverId || (nextScope === "OFFER" ? String(formDriverId || "") : ""))
        : "",
      shiftId: ["OFFER", "SHIFT"].includes(nextScope)
        ? (previous.shiftId || String(focusShiftId || ""))
        : "",
      agreementId: ["OFFER", "SHIFT"].includes(nextScope)
        ? (previous.agreementId || String(focusAgreementId || ""))
        : "",
    }));
  }

  function handleShiftChange(value) {
    const candidates = expenseContext.candidates.length ? expenseContext.candidates : shiftCandidates;
    const selected = candidates.find((shift) => positiveId(shift?.id) === positiveId(value)) || null;
    setValidationField("");
    setError("");
    setForm((previous) => ({
      ...previous,
      shiftId: value || "",
      vehicleId: selected?.vehicleId ? String(selected.vehicleId) : (value ? "" : previous.vehicleId),
      driverId: selected?.driverId ? String(selected.driverId) : (value ? "" : previous.driverId),
      agreementId: selected?.agreementId ? String(selected.agreementId) : (value ? "" : previous.agreementId),
      scopeKind: previous.scopeKind === "OFFER" ? "OFFER" : "SHIFT",
    }));
  }

  useEffect(() => {
    if (!expenseContext.directTrip || !expenseContext.shiftId || form.shiftId) return;
    const selected = expenseContext.candidates.find((shift) => positiveId(shift?.id) === positiveId(expenseContext.shiftId)) || null;
    if (!selected) return;
    setForm((previous) => {
      if (previous.shiftId || previous.categoryKey !== selectedCategoryKey) return previous;
      return {
        ...previous,
        shiftId: String(expenseContext.shiftId),
        vehicleId: selected?.vehicleId ? String(selected.vehicleId) : previous.vehicleId,
        driverId: selected?.driverId ? String(selected.driverId) : previous.driverId,
        agreementId: selected?.agreementId ? String(selected.agreementId) : previous.agreementId,
      };
    });
  }, [expenseContext.candidates, expenseContext.directTrip, expenseContext.shiftId, form.shiftId, selectedCategoryKey]);

  function chooseExpenseEntryAction(action) {
    const requestedCategory = String(action?.categoryKey || "").trim().toUpperCase();
    if (!requestedCategory) return;
    if (action?.protected && salaryRedacted) {
      setError("");
      setNotice("Bu gider türü yalnız kendi ROOM firmanızdaki kullanıcıya açılır; ayrıntı ve tutar kapsam dışında gösterilmez.");
      return;
    }
    if (!categories.some((item) => String(item?.key || "").toUpperCase() === requestedCategory)) {
      setError("Bu gider türü mevcut kullanıcı yetkisiyle açılamıyor.");
      return;
    }
    const nextDomain = categoryDomain(requestedCategory);
    composerScrollYRef.current = window.scrollY;
    setError("");
    setValidationField("");
    setBatchMode(true);
    setSingleMode(false);
    setComposerOpen(true);
    setComposerFocusField(action.focusField || "amount");
    setNotice(`${action.label} için onaylı gider formu hazırlandı.`);
    setForm((previous) => ({
      ...clearStaleExpenseContext(previous, requestedCategory),
      categoryKey: requestedCategory,
      occurrenceKind: action.occurrenceKind || "ONE_OFF",
      periodStart: action.occurrenceKind === "PERIODIC" ? "" : previous.periodStart,
      periodEnd: action.occurrenceKind === "PERIODIC" ? "" : previous.periodEnd,
      vehicleId: nextDomain === "VEHICLE" ? (formVehicleId ? String(formVehicleId) : previous.vehicleId) : "",
      driverId: nextDomain === "DRIVER" ? (formDriverId ? String(formDriverId) : previous.driverId) : "",
      shiftId: previous.shiftId || (positiveId(focusShiftId) ? String(focusShiftId) : ""),
    }));
  }

  function draftPayload() {
    const amountMinor = parseMajor(form.amountMajor);
    const candidates = expenseContext.candidates.length ? expenseContext.candidates : shiftCandidates;
    const selectedShift = candidates.find((shift) => positiveId(shift?.id) === positiveId(form.shiftId)) || null;
    const incomingOfferShift = selectedScopeKind === "OFFER" && selectedShift && selectedShift.roomId == null;
    const resolvedShiftId = incomingOfferShift
      ? null
      : positiveId(form.shiftId) || (scopeRequiresShift ? positiveId(focusShiftId) : null);
    const resolvedAgreementId = positiveId(form.agreementId) || (scopeRequiresShift ? positiveId(focusAgreementId) : null) || positiveId(selectedShift?.agreementId);
    const resolvedRecordKind = selectedScopeKind === "OFFER" ? "FORECAST" : String(form.recordKind || "ACTUAL").toUpperCase();
    const ownerScopedActual = resolvedRecordKind === "ACTUAL"
      && (selectedScopeKind === "VEHICLE" || selectedScopeKind === "DRIVER")
      && !resolvedShiftId;
    const resolvedSourceRef = selectedScopeKind === "OFFER"
      ? quoteCostSourceRef({ offerId: focusOfferId, shiftId: resolvedShiftId, categoryKey: selectedCategoryKey })
      : String(form.sourceRef || "").trim();
    const payload = {
      categoryKey: selectedCategoryKey,
      amountMinor,
      currencyCode: String(form.currencyCode || "").trim().toUpperCase(),
      vatMode: form.vatMode,
      vatClassification: form.vatClassification,
      vatAmountMinor: form.vatClassification === "DOCUMENTED_VAT" ? parseMajor(form.vatAmountMajor) : undefined,
      vatDeductibility: form.vatDeductibility,
      vatEvidenceRef: String(form.vatEvidenceRef || "").trim(),
      vatClassificationReason: String(form.vatClassificationReason || "").trim(),
      recordKind: resolvedRecordKind,
      occurrenceKind: form.occurrenceKind,
      allocation: ownerScopedActual ? "COUNT_IN_ROLLUP" : (resolvedShiftId ? "DIRECT" : undefined),
      occurredAt: form.occurredAt ? `${form.occurredAt}T00:00:00.000Z` : undefined,
      periodStart: form.occurrenceKind === "PERIODIC" ? form.periodStart : undefined,
      periodEnd: form.occurrenceKind === "PERIODIC" ? form.periodEnd : undefined,
      description: String(form.description || "").trim(),
      evidenceRef: String(form.evidenceRef || "").trim(),
      sourceRef: resolvedSourceRef,
      sourceType: selectedScopeKind === "OFFER" ? "ROOM_QUOTE_FORECAST" : undefined,
      ...(resolvedAgreementId ? { agreementId: resolvedAgreementId } : {}),
      ...(resolvedShiftId ? { shiftId: resolvedShiftId } : {}),
      ...((selectedScopeKind === "VEHICLE" || selectedScopeKind === "OFFER" || selectedScopeKind === "SHIFT") && (form.vehicleId || selectedShift?.vehicleId) ? { vehicleId: Number(form.vehicleId || selectedShift.vehicleId) } : {}),
      ...((selectedScopeKind === "DRIVER" || selectedScopeKind === "OFFER" || selectedScopeKind === "SHIFT") && (form.driverId || selectedShift?.driverId) ? { driverId: Number(form.driverId || selectedShift.driverId) } : {}),
    };
    return payload;
  }

  function focusValidationField(field) {
    window.setTimeout(() => {
      const target = fieldRefs.current[field] || fieldRefs.current.amount;
      target?.focus?.();
      target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }, 0);
  }

  function openBatchComposer() {
    if (defaultExpenseComposerMode({ resumeBatch: batchItems.length > 0 }) === "single") {
      openSingleComposer();
      return;
    }
    composerScrollYRef.current = window.scrollY;
    setBatchMode(true);
    setSingleMode(false);
    setComposerOpen(true);
    setComposerFocusField("amount");
    setBatchEditingItem(null);
    setError("");
    setNotice(batchItems.length ? "Devam eden toplu taslağı düzenleyebilirsiniz." : "Birden fazla gideri hazırlayın; hepsi tek UYGULA ile kaydedilir.");
    if (!form.categoryKey && categories[0]?.key && !planningNeedsCategory) setForm((previous) => ({ ...previous, categoryKey: String(categories[0].key).toUpperCase() }));
  }

  function closeComposer() {
    if (batchItems.length) setNotice("Toplu taslak korunuyor. Daha sonra Taslağa Devam Et ile açabilirsiniz.");
    else if (draftItem && String(draftItem.lifecycle || "").toUpperCase() === "DRAFT") setNotice("Taslak korunuyor. Gider listesindeki DÜZENLE işlemiyle yeniden açabilirsiniz.");
    setComposerOpen(false);
    setBatchMode(false);
    setSingleMode(false);
    setBatchEditingItem(null);
    setBatchConfirmationText("");
    setCorrectionEntry(null);
    window.setTimeout(() => window.scrollTo({ top: composerScrollYRef.current, behavior: "auto" }), 0);
  }

  function closeBatchComposer() {
    closeComposer();
  }

  function closeSingleComposer() {
    closeComposer();
  }

  function openSingleComposer() {
    composerScrollYRef.current = window.scrollY;
    setBatchMode(false);
    setSingleMode(true);
    setComposerOpen(true);
    setComposerFocusField("amount");
    const freshState = freshSingleExpenseComposerState();
    setDraftItem(freshState.draftItem);
    setEditingDraft(freshState.editingDraft);
    setConfirmationText(freshState.confirmationText);
    setCorrectionEntry(null);
    setError("");
    setValidationField("");
    setNotice("Tek gider taslağı için gerekli alanları doldurun; kaydetmeden önce tekrar inceleyebilirsiniz.");
    if (!form.categoryKey && categories[0]?.key && !planningNeedsCategory) {
      setForm((previous) => ({ ...previous, categoryKey: String(categories[0].key).toUpperCase() }));
    }
  }

  function updateExpenseFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
    setEntryPage(1);
    setSelectedEntry(null);
  }

  function clearExpenseFilters() {
    setFilters(initialExpenseFilters(vehicleId, driverId));
    setEntryPage(1);
    setSelectedEntry(null);
    onClearExpenseFocus?.();
  }

  async function addBatchRow() {
    setError("");
    setNotice("");
    setValidationField("");
    const payload = draftPayload();
    const validation = validateRoomCostDraft({ form, payload, selectedDomain, requiresShift: expenseContext.directTrip || scopeRequiresShift, scopeKind: selectedScopeKind, focusOfferId });
    if (!validation.ok) {
      setValidationField(validation.field);
      setError(validation.message);
      focusValidationField(validation.field);
      return;
    }
    const requestContext = captureContext();
    const requestController = beginRequest();
    setBusy("batch-row");
    try {
      const endpoint = batchDraftId
        ? `${COSTS_BASE}/draft-batches/${encodeURIComponent(batchDraftId)}/rows`
        : `${COSTS_BASE}/draft-batches`;
      const response = await api.post(endpoint, payload, { token, signal: requestController.signal });
      if (!contextIsCurrent(requestContext)) return;
      setBatchDraftId(String(response?.draftBatchId || batchDraftId));
      setBatchItems((previous) => [...previous, response?.item].filter(Boolean));
      setBatchEditingItem(null);
      setForm({ ...createFreshForm(), categoryKey: String(categories[0]?.key || "").toUpperCase() });
      setNotice("Gider satırı toplu taslağa eklendi. Başka satır ekleyebilir veya topluca inceleyebilirsiniz.");
    } catch (batchError) {
      if (batchError?.name !== "AbortError" && contextIsCurrent(requestContext)) setError(errorMessage(batchError, "Gider satırı taslağa eklenemedi."));
    } finally {
      endRequest(requestController);
      if (contextIsCurrent(requestContext)) setBusy("");
    }
  }

  function editBatchItem(item) {
    if (!item?.id || String(item.lifecycle || "").toUpperCase() !== "DRAFT") return;
    setBatchEditingItem(item);
    setForm(formFromDraftItem(item));
    setError("");
    setValidationField("");
    setNotice("Toplu taslak satırı düzenleniyor. Kaydettiğinizde satırın özeti güncellenir.");
    focusValidationField("amount");
  }

  async function updateBatchRow() {
    if (!batchEditingItem?.id || !batchDraftId) return;
    setError("");
    setNotice("");
    setValidationField("");
    const payload = draftPayload();
    const validation = validateRoomCostDraft({ form, payload, selectedDomain, requiresShift: expenseContext.directTrip || scopeRequiresShift, scopeKind: selectedScopeKind, focusOfferId });
    if (!validation.ok) {
      setValidationField(validation.field);
      setError(validation.message);
      focusValidationField(validation.field);
      return;
    }
    const requestContext = captureContext();
    const requestController = beginRequest();
    setBusy("batch-update");
    try {
      const response = await api.patch(`${COSTS_BASE}/draft-batches/${encodeURIComponent(batchDraftId)}/rows/${Number(batchEditingItem.id)}`, { ...payload, version: batchEditingItem.version }, { token, signal: requestController.signal });
      if (!contextIsCurrent(requestContext)) return;
      setBatchItems((previous) => previous.map((item) => item.id === response?.item?.id ? response.item : item));
      setBatchEditingItem(null);
      setForm({ ...createFreshForm(), categoryKey: String(categories[0]?.key || "").toUpperCase() });
      setNotice("Toplu taslak satırı güncellendi.");
    } catch (batchError) {
      if (batchError?.name !== "AbortError" && contextIsCurrent(requestContext)) setError(errorMessage(batchError, "Toplu taslak satırı güncellenemedi."));
    } finally {
      endRequest(requestController);
      if (contextIsCurrent(requestContext)) setBusy("");
    }
  }

  async function removeBatchItem(item) {
    if (!item?.id || !batchDraftId) return;
    setError("");
    setNotice("");
    const requestContext = captureContext();
    const requestController = beginRequest();
    setBusy("batch-remove");
    try {
      await api.del(`${COSTS_BASE}/draft-batches/${encodeURIComponent(batchDraftId)}/rows/${Number(item.id)}`, { token, signal: requestController.signal, body: { version: item.version } });
      if (!contextIsCurrent(requestContext)) return;
      setBatchItems((previous) => previous.filter((candidate) => candidate.id !== item.id));
      if (batchEditingItem?.id === item.id) setBatchEditingItem(null);
      setNotice("Gider satırı taslaktan çıkarıldı; kayıt silinmedi.");
    } catch (batchError) {
      if (batchError?.name !== "AbortError" && contextIsCurrent(requestContext)) setError(errorMessage(batchError, "Gider satırı çıkarılamadı."));
    } finally {
      endRequest(requestController);
      if (contextIsCurrent(requestContext)) setBusy("");
    }
  }

  async function applyBatch() {
    if (!batchDraftId || !batchItems.length) {
      setError("Uygulamak için en az bir gider satırı ekleyin.");
      return;
    }
    if (batchConfirmationText.trim().toUpperCase() !== "UYGULA") {
      setError("Toplu kaydı tamamlamak için UYGULA yazın.");
      return;
    }
    setError("");
    setNotice("");
    const requestContext = captureContext();
    const requestController = beginRequest();
    setBusy("batch-apply");
    try {
      const response = await api.post(`${COSTS_BASE}/draft-batches/${encodeURIComponent(batchDraftId)}/apply`, { confirmed: true, confirmationToken: "TOPLU_UYGULA" }, { token, signal: requestController.signal });
      if (!contextIsCurrent(requestContext)) return;
      const count = Array.isArray(response?.items) ? response.items.length : batchItems.length;
      setBatchDraftId("");
      setBatchItems([]);
      setBatchEditingItem(null);
      setBatchConfirmationText("");
      setBatchMode(false);
      setSingleMode(false);
      setNotice(`${count} gider kaydedildi. Maliyetler güncellendi.`);
      await refreshLedger(requestContext);
      if (typeof onLedgerChanged === "function") onLedgerChanged({ categoryKey: response?.items?.[0]?.categoryKey || selectedCategoryKey, vehicleId, driverId });
      if (returnTo) navigate(String(returnTo));
    } catch (batchError) {
      if (batchError?.name !== "AbortError" && contextIsCurrent(requestContext)) setError(errorMessage(batchError, "Toplu giderler kaydedilemedi; taslak satırlarınız korunuyor."));
    } finally {
      endRequest(requestController);
      if (contextIsCurrent(requestContext)) setBusy("");
    }
  }

  async function createDraft() {
    setError("");
    setNotice("");
    setValidationField("");
    const payload = draftPayload();
    const validation = validateRoomCostDraft({ form, payload, selectedDomain, requiresShift: expenseContext.directTrip || scopeRequiresShift, scopeKind: selectedScopeKind, focusOfferId });
    if (!validation.ok) {
      setValidationField(validation.field);
      setError(validation.message);
      window.setTimeout(() => {
        const field = fieldRefs.current[validation.field] || fieldRefs.current.amount;
        field?.focus?.();
        field?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }, 0);
      return;
    }
    const requestContext = captureContext();
    const requestController = beginRequest();
    setBusy("draft");
    try {
      const response = await api.post(`${COSTS_BASE}/drafts`, payload, { token, signal: requestController.signal });
      if (!contextIsCurrent(requestContext)) return;
      setDraftItem(response?.item || null);
      setEditingDraft(false);
      setNotice("Taslak oluşturuldu. Taslak inceleme tamamlanmadan gider onaylanmaz.");
      await refreshLedger(requestContext);
    } catch (draftError) {
      if (draftError?.name !== "AbortError" && contextIsCurrent(requestContext)) {
        setError(errorMessage(draftError, "Gider taslağı oluşturulamadı."));
      }
    } finally {
      endRequest(requestController);
      if (contextIsCurrent(requestContext)) setBusy("");
    }
  }

  function editDraft() {
    if (!draftItem?.id) return;
    setBatchMode(false);
    setSingleMode(true);
    setForm(formFromDraftItem(draftItem));
    setEditingDraft(true);
    setConfirmationText("");
    setError("");
    setValidationField("");
    setNotice("Taslak düzenleme modunda. Değişiklikleri kaydettiğinizde taslak güncellenir.");
    window.setTimeout(() => {
      const field = fieldRefs.current.amount;
      field?.focus?.();
      field?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }, 0);
  }

  function openExistingDraft(entry) {
    if (!entry?.id || String(entry.lifecycle || "").toUpperCase() !== "DRAFT") return false;
    composerScrollYRef.current = window.scrollY;
    setBatchMode(false);
    setSingleMode(true);
    setComposerOpen(true);
    setComposerFocusField("amount");
    setDraftItem(entry);
    setForm(formFromDraftItem(entry));
    setEditingDraft(true);
    setConfirmationText("");
    setError("");
    setValidationField("");
    setNotice("Mevcut taslak açıldı. Değişiklikleri kaydedip açıkça onaylayabilirsiniz.");
    return true;
  }

  const openCorrection = useCallback((entry) => {
    if (!entry?.id || String(entry.lifecycle || "").toUpperCase() !== "CONFIRMED" || entry.isReversal) return false;
    const entryIsSalary = SALARY_CATEGORIES.has(String(entry.categoryKey || "").toUpperCase());
    if (entryIsSalary && salaryRedacted) {
      setNotice("Bu sürücü maliyeti yalnız yetkili ROOM kullanıcısının kendi firma kapsamından düzeltilebilir.");
      return false;
    }
    composerScrollYRef.current = window.scrollY;
    setBatchMode(false);
    setSingleMode(true);
    setComposerOpen(true);
    setComposerFocusField("amount");
    setCorrectionEntry(entry);
    setDraftItem(null);
    setEditingDraft(false);
    setForm(formFromDraftItem(entry));
    setError("");
    setValidationField("");
    setNotice("Onaylı giderin eski kaydı korunur; değişiklik yeni bir düzeltme zinciri olarak kaydedilir.");
    return true;
  }, [salaryRedacted]);

  async function updateDraft() {
    if (!draftItem?.id) return;
    setError("");
    setNotice("");
    setValidationField("");
    const payload = draftPayload();
    const validation = validateRoomCostDraft({ form, payload, selectedDomain, requiresShift: expenseContext.directTrip || scopeRequiresShift, scopeKind: selectedScopeKind, focusOfferId });
    if (!validation.ok) {
      setValidationField(validation.field);
      setError(validation.message);
      window.setTimeout(() => {
        const field = fieldRefs.current[validation.field] || fieldRefs.current.amount;
        field?.focus?.();
        field?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }, 0);
      return;
    }
    const requestContext = captureContext();
    const requestController = beginRequest();
    setBusy("update-draft");
    try {
      const response = await api.patch(`${COSTS_BASE}/drafts/${Number(draftItem.id)}`, {
        ...payload,
        version: draftItem.version,
      }, { token, signal: requestController.signal });
      if (!contextIsCurrent(requestContext)) return;
      setDraftItem(response?.item || null);
      setEditingDraft(false);
      setNotice("Taslak güncellendi. Açık onay bekleniyor.");
      await refreshLedger(requestContext);
    } catch (updateError) {
      if (updateError?.name !== "AbortError" && contextIsCurrent(requestContext)) {
        setError(errorMessage(updateError, "Taslak güncellenemedi."));
      }
    } finally {
      endRequest(requestController);
      if (contextIsCurrent(requestContext)) setBusy("");
    }
  }

  async function submitCorrection() {
    if (!correctionEntry?.id || !correctionConfirmation.canConfirm) {
      setError(correctionConfirmation.message || "Düzeltilecek bir değişiklik bulunamadı.");
      return;
    }
    setError("");
    setNotice("");
    setValidationField("");
    const payload = draftPayload();
    const validation = validateRoomCostDraft({ form, payload, selectedDomain, requiresShift: expenseContext.directTrip || scopeRequiresShift, scopeKind: selectedScopeKind, focusOfferId });
    if (!validation.ok) {
      setValidationField(validation.field);
      setError(validation.message);
      focusValidationField(validation.field);
      return;
    }
    const requestContext = captureContext();
    const requestController = beginRequest();
    setBusy("correction");
    try {
      const correctionRef = `ROOM_COST_UI_CORRECTION_${correctionEntry.id}_${correctionEntry.version}`;
      const response = await api.post(`${COSTS_BASE}/${Number(correctionEntry.id)}/correction`, {
        ...payload,
        version: correctionEntry.version,
        correctionRef,
        confirmed: correctionConfirmation.confirmed,
        confirmationToken: correctionConfirmation.confirmationToken || SIMPLE_CORRECTION_CONFIRMATION_TOKEN,
      }, { token, signal: requestController.signal });
      if (!contextIsCurrent(requestContext)) return;
      const replacement = response?.replacement;
      setCorrectionEntry(null);
      setComposerOpen(false);
      setSingleMode(false);
      setNotice(response?.idempotent ? "Bu düzeltme daha önce kaydedilmişti; aynı sonuç yeniden gösterildi." : "Gider düzeltmesi kaydedildi. Eski kayıt korundu, maliyetler yeniden değerlendirildi.");
      await refreshLedger(requestContext);
      if (typeof onLedgerChanged === "function") {
        onLedgerChanged({
          categoryKey: replacement?.categoryKey || correctionEntry.categoryKey || selectedCategoryKey,
          vehicleId: replacement?.vehicleId || vehicleId,
          driverId: replacement?.driverId || driverId,
        });
      }
      if (returnTo) navigate(String(returnTo));
    } catch (correctionError) {
      if (correctionError?.name !== "AbortError" && contextIsCurrent(requestContext)) setError(errorMessage(correctionError, "Gider düzeltmesi kaydedilemedi; eski kayıt korunuyor."));
    } finally {
      endRequest(requestController);
      if (contextIsCurrent(requestContext)) setBusy("");
    }
  }

  async function confirmDraft() {
    if (!draftItem?.id || confirmationText.trim().toUpperCase() !== "ONAYLA") {
      setError("Açıkça onayla: devam etmek için ONAYLA yazmalısın.");
      return;
    }
    setError("");
    setNotice("");
    const requestContext = captureContext();
    const requestController = beginRequest();
    setBusy("confirm");
    try {
      const response = await api.post(`${COSTS_BASE}/drafts/${Number(draftItem.id)}/confirm`, {
        version: draftItem.version,
        confirmed: true,
        confirmationToken: confirmationText.trim().toUpperCase(),
      }, { token, signal: requestController.signal });
      if (!contextIsCurrent(requestContext)) return;
      setDraftItem(response?.item || null);
      setEditingDraft(false);
      setConfirmationText("");
      setNotice("Gider açıkça onaylandı ve merkezi deftere eklendi.");
      await refreshLedger(requestContext);
      if (typeof onLedgerChanged === "function") {
        onLedgerChanged({
          categoryKey: response?.item?.categoryKey || draftItem?.categoryKey || selectedCategoryKey,
          vehicleId,
          driverId,
        });
      }
      if (returnTo) navigate(String(returnTo));
    } catch (confirmError) {
      if (confirmError?.name !== "AbortError" && contextIsCurrent(requestContext)) {
        setError(errorMessage(confirmError, "Gider onayı tamamlanamadı."));
      }
    } finally {
      endRequest(requestController);
      if (contextIsCurrent(requestContext)) setBusy("");
    }
  }

  async function refreshLedger(requestContext) {
    if (!contextIsCurrent(requestContext)) return false;
    const refreshController = beginRequest();
    try {
      let includeSalary = true;
      let listResponse;
      let summaryResponse;
      try {
        const suffix = queryString({ vehicleId, driverId, includeSalary });
        [listResponse, summaryResponse] = await Promise.all([
          api.get(`${COSTS_BASE}${suffix}`, { token, signal: refreshController.signal }),
          api.get(`${COSTS_BASE}/summary${suffix}`, { token, signal: refreshController.signal }),
        ]);
      } catch (ledgerError) {
        const info = getApiErrorInfo(ledgerError, "Gider listesi okunamadı.");
        if (ledgerError?.name === "AbortError" || !contextIsCurrent(requestContext)) return false;
        if (info.status !== 403) throw ledgerError;
        includeSalary = false;
        const suffix = queryString({ vehicleId, driverId });
        [listResponse, summaryResponse] = await Promise.all([
          api.get(`${COSTS_BASE}${suffix}`, { token, signal: refreshController.signal }),
          api.get(`${COSTS_BASE}/summary${suffix}`, { token, signal: refreshController.signal }),
        ]);
      }
      if (refreshController.signal.aborted || !contextIsCurrent(requestContext)) return false;
      const nextSalaryRedacted = Boolean(listResponse?.salaryRedacted || summaryResponse?.salaryRedacted || !includeSalary);
      const nextEntries = Array.isArray(listResponse?.entries || listResponse?.items) ? (listResponse.entries || listResponse.items) : [];
      setEntries(nextEntries.filter((entry) => !(nextSalaryRedacted && SALARY_CATEGORIES.has(String(entry?.categoryKey || "").toUpperCase()))));
      setSummary(summaryResponse || null);
      setSalaryRedacted(nextSalaryRedacted);
      try {
        const batchResponse = await api.get(`${COSTS_BASE}/draft-batches/current`, { token, signal: refreshController.signal });
        setBatchDraftId(String(batchResponse?.draftBatchId || ""));
        setBatchItems(Array.isArray(batchResponse?.items) ? batchResponse.items : []);
      } catch (batchError) {
        if (batchError?.name === "AbortError") throw batchError;
      }
      return true;
    } finally {
      endRequest(refreshController);
    }
  }

  const actualBucket = useMemo(() => summary?.buckets?.ACTUAL || {}, [summary?.buckets?.ACTUAL]);
  const planningBucket = useMemo(() => {
    const buckets = [summary?.buckets?.BUDGET, summary?.buckets?.FORECAST].filter(Boolean);
    const activeBuckets = buckets.filter((bucket) => Number(bucket?.entryCount || 0) > 0);
    const known = activeBuckets.flatMap((bucket) => Array.isArray(bucket?.known) ? bucket.known : []);
    const amounts = activeBuckets.map((bucket) => Number(bucket?.grossAmountMinor)).filter((amount) => Number.isSafeInteger(amount));
    const currencies = [...new Set(activeBuckets.map((bucket) => bucket?.currencyCode).filter(Boolean))];
    return {
      entryCount: activeBuckets.reduce((total, bucket) => total + Number(bucket?.entryCount || 0), 0),
      grossAmountMinor: activeBuckets.length > 0 && amounts.length === activeBuckets.length && currencies.length <= 1 ? amounts.reduce((total, amount) => total + amount, 0) : null,
      currencyCode: currencies.length === 1 ? currencies[0] : "TRY",
      known,
    };
  }, [summary?.buckets?.BUDGET, summary?.buckets?.FORECAST]);
  const planningBucketLabel = planningBucket.entryCount ? "Planlanan / tahmin" : "Planlanan gider yok";
  const missing = Array.isArray(summary?.missing) ? summary.missing : [];
  const excluded = Array.isArray(summary?.excluded) ? summary.excluded : [];
  const confirmed = String(draftItem?.lifecycle || "").toUpperCase() === "CONFIRMED";
  const draftIsSalary = SALARY_CATEGORIES.has(String(draftItem?.categoryKey || "").toUpperCase());
  const fieldInvalid = (field) => validationField === field;
  const vehicleOptions = useMemo(() => directory.vehicles.filter((item) => entries.some((entry) => expenseMatchesOwner(entry, { vehicleId: item?.id, shifts: directory.shifts }))), [directory.shifts, directory.vehicles, entries]);
  const driverOptions = useMemo(() => directory.drivers.filter((item) => entries.some((entry) => expenseMatchesOwner(entry, { driverId: item?.id, shifts: directory.shifts }))), [directory.drivers, directory.shifts, entries]);
  const selectedFilterVehicle = useMemo(
    () => vehicleOptions.find((item) => positiveId(item?.id) === positiveId(filters.vehicleId)) || null,
    [filters.vehicleId, vehicleOptions],
  );
  const selectedFilterDriver = useMemo(
    () => driverOptions.find((item) => positiveId(item?.id) === positiveId(filters.driverId)) || null,
    [driverOptions, filters.driverId],
  );
  const filteredEntries = useMemo(() => entries.filter((entry) => {
    if (filters.period && entryPeriodKey(entry) !== filters.period) return false;
    const candidateDate = entryDateValue(entry);
    if (filters.periodStart && (!candidateDate || String(candidateDate).slice(0, 10) < String(filters.periodStart).slice(0, 10))) return false;
    if (filters.periodEnd && (!candidateDate || String(candidateDate).slice(0, 10) > String(filters.periodEnd).slice(0, 10))) return false;
    if (filters.vehicleId && !expenseMatchesOwner(entry, { vehicleId: filters.vehicleId, shifts: directory.shifts })) return false;
    if (filters.categoryKey && String(entry?.categoryKey || "").toUpperCase() !== String(filters.categoryKey).toUpperCase()) return false;
    if (filters.driverId && !expenseMatchesOwner(entry, { driverId: filters.driverId, shifts: directory.shifts })) return false;
    if (filters.lifecycle && String(entry?.lifecycle || "").toUpperCase() !== String(filters.lifecycle).toUpperCase()) return false;
    if (filters.recordKind && String(entry?.recordKind || "").toUpperCase() !== String(filters.recordKind).toUpperCase()) return false;
    if (filters.vatMode && String(entry?.vatMode || "").toUpperCase() !== String(filters.vatMode).toUpperCase()) return false;
    if (filters.shift === "linked" && !entryHasShiftEvidence(entry)) return false;
    if (filters.shift === "pending" && entryHasShiftEvidence(entry)) return false;
    if (filters.special === "future-actual" && !isFutureActualEntry(entry)) return false;
    if (filters.special === "missing-evidence" && String(entry?.evidenceRef || "").trim()) return false;
    return true;
  }), [directory.shifts, entries, filters]);
  const filterCount = filteredEntries.length;
  const orderedEntries = useMemo(() => [...filteredEntries].sort(compareExpenseEntries), [filteredEntries]);
  const actualFilteredCount = orderedEntries.filter((entry) => String(entry?.lifecycle || "").toUpperCase() === "CONFIRMED" && String(entry?.recordKind || "").toUpperCase() === "ACTUAL").length;
  const displayedActualBucket = useMemo(() => {
    if (!filters.vehicleId) return actualBucket;
    const actualEntries = filteredEntries.filter((entry) => (
      String(entry?.lifecycle || "").toUpperCase() === "CONFIRMED"
      && String(entry?.recordKind || "").toUpperCase() === "ACTUAL"
    ));
    const amounts = actualEntries.map((entry) => Number(entry?.amountMinor));
    const knownAmounts = amounts.every((amount) => Number.isSafeInteger(amount));
    return {
      ...actualBucket,
      grossAmountMinor: knownAmounts ? amounts.reduce((total, amount) => total + amount, 0) : null,
      entryCount: actualEntries.length,
      currencyCode: actualBucket.currencyCode || "TRY",
    };
  }, [actualBucket, filteredEntries, filters.vehicleId]);
  const unknownVatCount = filteredEntries.filter((entry) => (
    String(entry?.vatClassification || "UNKNOWN").toUpperCase() === "UNKNOWN"
      && String(entry?.lifecycle || "").toUpperCase() === "CONFIRMED"
      && String(entry?.recordKind || "").toUpperCase() === "ACTUAL"
  )).length;
  const pendingShiftCount = entries.filter((entry) => String(entry?.lifecycle || "").toUpperCase() === "CONFIRMED" && String(entry?.recordKind || "").toUpperCase() === "ACTUAL" && !entryHasShiftEvidence(entry)).length;
  const netRollupMessages = [];
  if (unknownVatCount) {
    netRollupMessages.push(`KDV bilgisi belirtilmeyen ${unknownVatCount} gider var. Bu giderler kayıtlı tutarlarıyla hesaba dahil edildi; KDV ayrıştırılmadı.`);
  }
  const otherRollupMessages = [...new Set(
    excluded
      .filter((item) => String(item?.reason || "").toUpperCase() !== "VAT_UNKNOWN_NET_ROLLUP")
      .map((item) => reasonLabel(item?.reason)),
  )];
  netRollupMessages.push(...otherRollupMessages);
  const entryPageCount = Math.max(1, Math.ceil(orderedEntries.length / 10));
  const currentEntryPage = Math.min(entryPage, entryPageCount);
  const visibleEntries = useMemo(() => {
    if (!showAllEntries) return orderedEntries.slice(0, 10);
    const start = (currentEntryPage - 1) * 10;
    return orderedEntries.slice(start, start + 10);
  }, [currentEntryPage, orderedEntries, showAllEntries]);
  useEffect(() => {
    if (!focusEntryTargetId || !orderedEntries.length) return undefined;
    const target = resolveFocusedExpenseEntry(orderedEntries, focusEntryTargetId);
    const targetIndex = target ? orderedEntries.findIndex((entry) => positiveId(entry?.id) === focusEntryTargetId) : -1;
    if (targetIndex < 0) {
      if (!loading && salaryAccessResolved) setNotice("Uyarının bağlı olduğu gider bu tenant veya seçili dönem kapsamında bulunamadı.");
      return undefined;
    }
    setShowAllEntries(true);
    setEntryPage(Math.floor(targetIndex / 10) + 1);
    setSelectedEntry(target);
    const focusKey = String(focusEntryTargetId);
    if (shouldWaitForFocusedExpenseAuthorization(target, { salaryRedacted, salaryAccessResolved })) return undefined;
    if (autoOpenedFocusEntryRef.current !== focusKey) {
      const editorKind = focusedExpenseEditorKind(target, { salaryRedacted });
      const opened = editorKind === "DRAFT"
        ? openExistingDraft(target)
        : editorKind === "CORRECTION"
          ? openCorrection(target)
          : false;
      if (opened) autoOpenedFocusEntryRef.current = focusKey;
      else if (String(target?.lifecycle || "").toUpperCase() === "CONFIRMED") {
        setNotice("Bu gider için düzeltme formu bu kullanıcı yetkisiyle açılamıyor.");
      }
    }
    const timer = window.setTimeout(() => {
      document.querySelector(`[data-finance-expense-row="${focusEntryTargetId}"]`)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusEntryTargetId, loading, openCorrection, orderedEntries, salaryAccessResolved, salaryRedacted]);
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const scopeLabel = filters.vehicleId
    ? (selectedFilterVehicle?.plate ? `Araç • ${selectedFilterVehicle.plate}` : "Seçili araç")
    : (filters.driverId
      ? (selectedFilterDriver?.fullName ? `Sürücü • ${selectedFilterDriver.fullName}` : "Seçili sürücü")
      : "Firma geneli · tüm kayıt dönemleri");
  const activeFilterLabels = [
    filters.special === "future-actual" ? "İleri tarihli onaylı giderler" : null,
    filters.special === "missing-evidence" ? "Kaynak kanıtı eksik giderler" : null,
    filters.vatMode === "UNKNOWN" ? "KDV görünümü bilinmiyor" : null,
    filters.periodStart || filters.periodEnd ? `Dönem: ${filters.periodStart || "başlangıç yok"} – ${filters.periodEnd || "bitiş yok"}` : null,
    filters.period ? `Dönem: ${periodLabel(filters.period)}` : null,
    filters.vehicleId ? selectedVehicleLabel : null,
    filters.driverId ? selectedDriverLabel : null,
    filters.categoryKey ? (categories.find((item) => String(item?.key || "").toUpperCase() === String(filters.categoryKey).toUpperCase())?.label || CATEGORY_LABELS[filters.categoryKey] || "Gider türü") : null,
    filters.recordKind ? (BUCKET_LABELS[filters.recordKind] || "Kayıt türü") : null,
  ].filter(Boolean);

  return (
    <section className="finance-v21-expenses" data-finance-expenses-premium data-copilot-target="room:financial-operations:cost-ledger" data-copilot-semantic-id="product:room:financial-operations:cost-ledger">
      <header className="finance-v21-expenses-head">
        <div>
          <div className="finance-v21-eyebrow">Gider kayıtları</div>
          <h2>Giderlerim</h2>
          <p>Gerçekleşen giderler ile planlanan/tahmini giderler ayrı tutulur.</p>
        </div>
        <div className="finance-v21-expenses-head-actions">
          <button type="button" className="btn primary" data-finance-batch-open onClick={openBatchComposer} disabled={loading || busy !== ""}>
            ＋ {batchItems.length ? "Taslağa Devam Et" : "Gider Ekle"}
          </button>
        </div>
      </header>

      <section className="finance-v21-expenses-summary finance-v21-expenses-summary--compact" data-finance-expense-summary>
        <div className="finance-v21-expenses-total">
          <span>Gerçekleşen brüt gider</span>
          <strong>{displayedActualBucket.grossAmountMinor == null ? "Henüz kayıt yok" : formatMinor(displayedActualBucket.grossAmountMinor, displayedActualBucket.currencyCode)}</strong>
          <small>{scopeLabel} · {displayedActualBucket.entryCount || 0} onaylı gerçekleşen gider · geçmiş kullanım</small>
        </div>
        <div className="finance-v21-expenses-scope">
          <strong>Gider görünümü</strong>
          <span>{filters.vehicleId ? "Açık araç filtresi seçili kapsam toplamını ve listeyi birlikte gösterir." : "Filtreler yalnız aşağıdaki listeyi değiştirir; firma geneli ana toplam ayrı kapsamdır."}</span>
          <span>Gerçekleşen, bütçe, tahmin ve karşılık kayıtları ayrı gösterilir.</span>
          {displayedActualBucket.netRollupBlocked ? <b>KDV ayrıştırılmadı; kayıtlı brüt gider korunuyor, doğrulanmış net toplam ayrıca gösterilmiyor.</b> : null}
        </div>
      </section>

      <section className="finance-v21-expenses-summary" data-testid="finance-expense-bucket-summary" aria-label="Gerçekleşen ve planlanan gider özeti">
        <div className="finance-v21-expenses-total" data-testid="finance-expense-actual-summary">
          <span>Gerçekleşen gider</span>
          <strong>{displayedActualBucket.grossAmountMinor == null ? "Henüz kayıt yok" : formatMinor(displayedActualBucket.grossAmountMinor, displayedActualBucket.currencyCode)}</strong>
          <small>{displayedActualBucket.entryCount || 0} gerçekleşmiş gider · geçmiş kullanım</small>
        </div>
        <div className="finance-v21-expenses-total" data-testid="finance-expense-planned-summary">
          <span>{planningBucketLabel}</span>
          <strong>{planningBucket.grossAmountMinor == null ? "Henüz kayıt yok" : formatMinor(planningBucket.grossAmountMinor, planningBucket.currencyCode)}</strong>
          <small>{planningBucket.entryCount || 0} planlanan/tahmini gider · teklif planlaması; gerçekleşmiş gider değildir</small>
        </div>
      </section>

      <div className="finance-v21-expenses-workspace">
        <section className="finance-v21-expenses-list-card" data-finance-expense-list>
          <div className="finance-v21-card-head">
            <div>
              <h3>Gider kayıtları</h3>
              <p>Son giderler — toplam giderin tamamı değildir.</p>
            </div>
            <div className="finance-v21-expense-list-meta" data-finance-list-count>
              <span>{showAllEntries ? `${Math.min((currentEntryPage - 1) * 10 + 1, filterCount)}–${Math.min(currentEntryPage * 10, filterCount)} / ${filterCount} kayıt` : `${Math.min(10, filterCount)} / ${filterCount} kayıt gösteriliyor`}</span>
              <span>{actualFilteredCount} onaylı gerçekleşen gider</span>
              {filterCount > 10 ? <button type="button" className="btn sm ghost" data-finance-show-all onClick={() => { setShowAllEntries((previous) => !previous); setEntryPage(1); }}>{showAllEntries ? "İlk 10 kaydı göster" : "Tümünü Gör"}</button> : null}
            </div>
          </div>

          {buildExpenseSummaryNotes({ unknownVatCount, pendingShiftCount }).map((note) => <div key={note} className="finance-v21-form-note finance-v21-expense-summary-note">{note}</div>)}

          <div className="finance-v21-expense-filters" data-finance-expense-filters>
            <span className="finance-v21-filter-label">Hızlı filtre</span>
            <select aria-label="Gider türü filtresi" value={filters.categoryKey} onChange={(event) => updateExpenseFilter("categoryKey", event.target.value)}>
              <option value="">Tüm giderler</option>
              {categories.map((item) => <option key={item.key} value={item.key}>{item.label || CATEGORY_LABELS[item.key] || "Diğer gider"}</option>)}
            </select>
            <button type="button" className="btn sm ghost" onClick={clearExpenseFilters} disabled={!hasActiveFilters}>Temizle</button>
          </div>
          <details className="finance-v21-expense-advanced">
            <summary>Diğer filtreler · gerektiğinde aç</summary>
            <div className="finance-v21-expense-advanced-grid">
              <select aria-label="Sürücü filtresi" value={filters.driverId} onChange={(event) => updateExpenseFilter("driverId", event.target.value)}>
                <option value="">Tüm sürücüler</option>
                {driverOptions.map((item) => <option key={item.id} value={item.id}>{item.fullName || "Adı olmayan sürücü"}</option>)}
              </select>
              <select aria-label="Vardiya filtresi" value={filters.shift} onChange={(event) => updateExpenseFilter("shift", event.target.value)}>
                <option value="">Tüm vardiya durumları</option>
                <option value="linked">Vardiya bağlantısı kanıtlananlar</option>
                <option value="pending">Dağıtım kanıtı bekleyenler</option>
              </select>
              <select aria-label="Kayıt durumu filtresi" value={filters.lifecycle} onChange={(event) => updateExpenseFilter("lifecycle", event.target.value)}>
                <option value="">Tüm kayıt durumları</option>
                <option value="CONFIRMED">Onaylı gider</option>
                <option value="DRAFT">Taslak</option>
              </select>
              <select aria-label="Kayıt türü filtresi" value={filters.recordKind} onChange={(event) => updateExpenseFilter("recordKind", event.target.value)}>
                <option value="">Tüm kayıt türleri</option>
                <option value="ACTUAL">Gerçekleşen</option>
                <option value="BUDGET">Bütçe</option>
                <option value="FORECAST">Tahmin</option>
                <option value="ACCRUAL">Karşılık</option>
              </select>
              <select aria-label="KDV filtresi" value={filters.vatMode} onChange={(event) => updateExpenseFilter("vatMode", event.target.value)}>
                <option value="">Tüm KDV durumları</option>
                <option value="UNKNOWN">KDV bilgisi eksik</option>
              </select>
            </div>
          </details>
          {activeFilterLabels.length ? (
            <div className="finance-v21-active-filters" data-finance-active-filters aria-live="polite">
              <span className="finance-v21-active-filters-label">Aktif filtre</span>
              {activeFilterLabels.map((label) => <span key={label} className={`finance-v21-active-filter ${filters.special === "future-actual" ? "finance-v21-active-filter--warning" : ""}`}>{label}</span>)}
            </div>
          ) : null}

          {visibleEntries.length ? (
            <div className="finance-v21-expense-list">
              {visibleEntries.map((entry) => {
                const entrySalary = SALARY_CATEGORIES.has(String(entry?.categoryKey || "").toUpperCase());
                const hiddenAmount = salaryRedacted && entrySalary;
                const shiftEvidence = entryHasShiftEvidence(entry);
                const ownership = resolveExpenseOwnership(entry);
                const offerLabel = offerForecastLabel(entry);
                const rowPresentation = buildExpenseRowPresentation(entry, {
                  special: filters.special,
                  serviceEvidenceMissing: !shiftEvidence,
                });
                const warningRow = rowPresentation.rowTone === "warning";
                return (
                  <article
                    className={`finance-v21-expense-row ${selectedEntry?.id === entry.id ? "finance-v21-expense-row--detail-open" : ""} ${warningRow ? "finance-v21-expense-row--warning" : ""}`}
                    key={entry.id}
                    data-finance-expense-row={entry.id}
                    data-finance-warning-row={warningRow ? "true" : undefined}
                    onClick={(event) => {
                      if (selectedEntry?.id !== entry.id) return;
                      if (event.target.closest("button, a, input, select, textarea, details, summary, .finance-v21-expense-inline-detail")) return;
                      setSelectedEntry(null);
                    }}
                  >
                    <span className="finance-v21-expense-icon" aria-hidden="true">{categoryIcon(entry.categoryKey)}</span>
                    <div className="finance-v21-expense-main">
                      <strong>{hiddenAmount ? "Sürücü maliyeti" : (entry.categoryLabel || CATEGORY_LABELS[entry.categoryKey] || "Diğer gider")}</strong>
                      <span>{entryOwnerLabel(entry)} · {entry.periodStart && entry.periodEnd ? `${formatDate(entry.periodStart)} – ${formatDate(entry.periodEnd)}` : formatDate(entry.occurredAt || entry.periodStart)}</span>
                      <span>{hiddenAmount ? "Ayrıntı yetkili kullanıcıya açıktır" : (offerLabel || rowPresentation.sourceLabel)}</span>
                      <span className="finance-v21-status-row">
                        <span className="finance-v21-status finance-v21-status--positive">{ownership.label}</span>
                        {shiftEvidence ? <span className="finance-v21-status finance-v21-status--positive">Vardiya bağlantısı doğrulandı</span> : null}
                        <span className="finance-v21-status finance-v21-status--positive">{entryLifecycleShort(entry)}</span>
                          {entry.correctionHistory?.status === "CORRECTED" ? <span className="finance-v21-status finance-v21-status--positive">Düzeltildi</span> : null}
                        {rowPresentation.vatStatus.label ? <span className="finance-v21-status finance-v21-status--neutral">{rowPresentation.vatStatus.label}</span> : <span className="finance-v21-status finance-v21-status--positive">{vatClassificationLabel(entry.vatClassification)}</span>}
                      </span>
                    </div>
                     <div className="finance-v21-expense-amount">{hiddenAmount ? "Gizli" : formatMinor(entry.amountMinor, entry.currencyCode)}<small> · {BUCKET_LABELS[entry.recordKind] || "Kayıt"}</small></div>
                     <div className="finance-v21-expense-actions" aria-label="Gider işlemleri">
                       <button type="button" className="btn sm ghost finance-v21-expense-detail-button" data-finance-expense-detail-trigger={entry.id} onClick={(event) => { event.stopPropagation(); setSelectedEntry(entry); }}>Ayrıntı</button>
                       {entry.lifecycle === "DRAFT" ? <button type="button" className="btn sm ghost finance-v21-expense-edit-button" onClick={(event) => { event.stopPropagation(); openExistingDraft(entry); }}>DÜZENLE</button> : null}
                       {entry.lifecycle === "CONFIRMED" && !entry.isReversal && !(entrySalary && salaryRedacted) ? <button type="button" className="btn sm ghost finance-v21-expense-edit-button" onClick={(event) => { event.stopPropagation(); openCorrection(entry); }}>Düzeltme Yap</button> : null}
                     </div>
                     {selectedEntry?.id === entry.id ? (
                       <div className="finance-v21-expense-inline-detail" data-finance-expense-detail aria-label="Gider ayrıntısı">
                         <div className="finance-v21-card-head">
                           <div><div className="finance-v21-eyebrow">Gider ayrıntısı</div><h3>{entry.categoryLabel || CATEGORY_LABELS[entry.categoryKey] || "Diğer gider"}</h3></div>
                           <button type="button" className="btn sm ghost" onClick={(event) => { event.stopPropagation(); setSelectedEntry(null); }}>Kapat</button>
                         </div>
                         <div className="finance-v21-detail-grid">
                           <div><span>Sahibi</span><strong>{entryOwnerLabel(entry)}</strong></div>
                           <div><span>Tutar</span><strong>{hiddenAmount ? "Gizli" : formatMinor(entry.amountMinor, entry.currencyCode)}</strong></div>
                           <div><span>Dönem</span><strong>{entry.periodStart && entry.periodEnd ? `${formatDate(entry.periodStart)} – ${formatDate(entry.periodEnd)}` : formatDate(entry.occurredAt || entry.periodStart)}</strong></div>
                           <div><span>Gider kapsamı</span><strong>{offerLabel || (String(entry.recordKind || "").toUpperCase() === "FORECAST" ? "Planlanan maliyet" : BUCKET_LABELS[entry.recordKind] || "Gider kaydı")}</strong></div>
                           <div><span>KDV görünümü</span><strong>{VAT_LABELS[entry.vatMode] || "KDV bilgisi yok"}</strong></div>
                           <div><span>KDV bilgisi</span><strong>{rowPresentation.vatStatus.label || vatClassificationLabel(entry.vatClassification)}</strong><small>{rowPresentation.vatStatus.label ? "Gider brüt tutarıyla işlendi; KDV ayrıştırılmadı." : (entry.vatEvidenceRef ? "Belge veya kaynak bilgisi kaydedildi" : "Belge bilgisi eklenmedi")}</small></div>
                           <div><span>Gider sahipliği</span><strong>{ownership.label}</strong></div>
                           <div><span>Servis / vardiya ilişkisi</span><strong>{ownership.allocationLabel}</strong></div>
                         </div>
                         <div className="finance-v21-evidence-note"><strong>Bu gider nereye ait?</strong><span>{ownership.detail}</span>{shiftEvidence ? <span>Vardiya bağlantısı onaylı kayıtta bulunuyor; dağıtım payı ayrıca hesaplama kapsamından okunur.</span> : null}<span>{entry.description || "Ek açıklama bulunmuyor."}</span></div>
                         {entry.correctionHistory?.status === "CORRECTED" ? <details className="finance-v21-correction-history"><summary>Düzeltme geçmişi</summary><div className="finance-v21-detail-grid"><div><span>Durum</span><strong>Düzeltme uygulandı</strong></div><div><span>Önceki değer</span><strong>{correctionSnapshotSummary(entry.correctionHistory.original)}</strong></div><div><span>Güncel değer</span><strong>{correctionSnapshotSummary(entry.correctionHistory.current)}</strong></div><div><span>Önceki KDV</span><strong>{VAT_LABELS[entry.correctionHistory.original?.vatMode] || "KDV bilgisi yok"}</strong></div><div><span>Güncel KDV</span><strong>{VAT_LABELS[entry.correctionHistory.current?.vatMode] || "KDV bilgisi yok"}</strong></div><div><span>Güncel sınıflandırma</span><strong>{vatClassificationLabel(entry.correctionHistory.current?.vatClassification)}</strong></div><div><span>Değişen alanlar</span><strong>{entry.correctionHistory.changedFields?.map((field) => CORRECTION_FIELD_LABELS[field] || financeUserFacingText(field, "ilgili alan")).join(", ") || "Belirtilmedi"}</strong></div><div><span>Düzeltme zamanı</span><strong>{formatDateTime(entry.correctionHistory.correctedAt)}</strong></div><div><span>Yetkili kullanıcı</span><strong>{entry.correctionHistory.correctedByName || "Yetkili ROOM kullanıcısı"}</strong></div></div></details> : null}
                         {entry.lifecycle === "CONFIRMED" && !entry.isReversal && !(entrySalary && salaryRedacted) ? <button type="button" className="btn sm ghost" onClick={(event) => { event.stopPropagation(); openCorrection(entry); }}>Düzeltme Yap</button> : null}
                       </div>
                     ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
        <div className="finance-v21-expense-empty"><strong>Bu filtrelerle eşleşen gider yok.</strong><span>Filtreleri temizleyin veya yalnız gerçek onaylı kayıtların kapsamını genişletin.</span><button type="button" className="btn sm ghost" onClick={clearExpenseFilters}>Filtreleri temizle</button></div>
          )}

          {showAllEntries && entryPageCount > 1 ? <nav className="finance-v21-expense-pagination" data-finance-expense-pagination aria-label="Gider kayıtları sayfalama">
            <button type="button" className="btn sm ghost" onClick={() => setEntryPage((previous) => Math.max(1, previous - 1))} disabled={currentEntryPage <= 1}>Önceki</button>
            <span>Sayfa {currentEntryPage} / {entryPageCount}</span>
            <button type="button" className="btn sm ghost" onClick={() => setEntryPage((previous) => Math.min(entryPageCount, previous + 1))} disabled={currentEntryPage >= entryPageCount}>Sonraki</button>
          </nav> : null}

        </section>

        <aside className="finance-v21-expenses-side">
          <section className="finance-v21-side-section"><h3>Bu gider nereye ait?</h3><p>Her satırda ekonomik sahibi, dönemi ve varsa doğrulanmış sefer ilişkisi ayrı okunur.</p><div className="finance-v21-legend"><span><i className="finance-v21-dot finance-v21-dot--good" />Araç / sürücü / firma sahibi</span><span><i className="finance-v21-dot finance-v21-dot--warning" />Servis payı ayrıca doğrulanmadı</span><span><i className="finance-v21-dot finance-v21-dot--danger" />Net sonuç kapalı</span></div></section>
          <section className="finance-v21-side-section"><h3>Toplamı doğru okuyun</h3><p>{formatMinor(displayedActualBucket.grossAmountMinor, displayedActualBucket.currencyCode)} {scopeLabel.toLocaleLowerCase("tr-TR")} gerçekleşen brüt gideridir. Araç filtresi açıkça seçildiğinde toplam aynı araç kapsamına iner; diğer liste ayrıntıları bu kapsamı değiştirmez.</p></section>
          <section className="finance-v21-side-section"><h3>Sonraki iş</h3><p>Gider ekleyin, satırları taslakta inceleyin ve yalnız açık onayla kaydedin.</p><p className="muted">Tek veya toplu giriş için üstteki <strong>Gider Ekle</strong> işlemini kullanın.</p></section>
        </aside>
      </div>

      {salaryRedacted ? <div className="finance-v21-expense-security">Sürücü maliyeti tutarları yalnız kendi ROOM firmanızın yetkili kullanıcı kapsamındaki kayıtlarda gösterilir.</div> : null}
      {error ? <div className="finance-v21-expense-message finance-v21-expense-message--error" role="alert" data-finance-form-error>{error}</div> : null}
      {notice ? <div className="finance-v21-expense-message" role="status">{notice}</div> : null}

      {composerOpen ? <div className="finance-v21-expense-composer-drawer-layer" data-finance-expense-composer-drawer>
        <button type="button" className="finance-v21-expense-composer-backdrop" aria-label="Gider girişini kapat" onClick={closeComposer} disabled={busy !== ""} />
        <aside className="finance-v21-expense-composer-drawer" role="dialog" aria-modal="true" aria-label="Gider hazırlama paneli">
      {focusContextLabel ? <div className="finance-v21-form-note" data-finance-expense-context>
        Bu kayıt şu seçili kapsam için hazırlanıyor: <strong>{focusContextLabel}</strong>. Bu ilişki gider kaydıyla birlikte korunur; kullanıcı teknik kayıt numarası girmek zorunda değildir.
      </div> : null}
      {batchMode ? <section className="finance-v21-expense-composer" data-finance-batch-composer data-copilot-target="room:financial-operations:cost-entry-form" data-copilot-semantic-id="product:room:financial-operations:cost-entry-form">
        <div className="finance-v21-card-head"><div><h3>Toplu gider hazırlama</h3><p>Satırlar aynı onaylı taslakta tutulur; kullanıcı onayı olmadan gider defterine yazılmaz.</p></div><div className="finance-v21-entry-actions"><button type="button" className="btn sm ghost" data-finance-single-open onClick={openSingleComposer} disabled={busy !== ""}>Tek gider formuna geç</button><button type="button" className="btn sm ghost" onClick={closeBatchComposer} disabled={busy !== ""}>Kapat</button></div></div>
        <details className="finance-v21-expense-advanced finance-v21-expense-composer-shortcuts"><summary>Hızlı kategori seçimi · isteğe bağlı</summary><div className="finance-v21-expense-shortcuts">
          {EXPENSE_ENTRY_ACTIONS.map((action) => <button key={action.key} type="button" className="finance-v21-expense-shortcut" data-finance-expense-action={action.key} onClick={() => chooseExpenseEntryAction(action)} disabled={loading}><span className="finance-v21-expense-icon" aria-hidden="true">{categoryIcon(action.categoryKey)}</span><span><strong>{action.label}</strong><small>{action.protected && salaryRedacted ? "Yetkili kullanıcı için; tutar gösterilmez." : action.description}</small></span></button>)}
        </div><details className="finance-v21-expense-advanced"><summary>Diğer gider türleri · gerektiğinde aç</summary><div className="finance-v21-expense-shortcuts">{ADDITIONAL_EXPENSE_ENTRY_ACTIONS.map((action) => <button key={action.key} type="button" className="finance-v21-expense-shortcut" data-finance-expense-action={action.key} onClick={() => chooseExpenseEntryAction(action)} disabled={loading}><span className="finance-v21-expense-icon" aria-hidden="true">{categoryIcon(action.categoryKey)}</span><span><strong>{action.label}</strong><small>{action.description}</small></span></button>)}</div></details></details>
        <div className="finance-v21-form-grid">
           <label>Kapsam<select ref={(node) => { fieldRefs.current.scope = node; }} data-finance-expense-scope value={selectedScopeKind} onChange={(event) => handleScopeChange(event.target.value)} disabled={loading || quoteScopeActive}><option value="COMPANY">Firma geneli</option><option value="VEHICLE">Araç</option><option value="DRIVER">Sürücü</option><option value="OFFER">Teklif / iş</option><option value="SHIFT">Vardiya / sefer</option></select></label>
           <label>Kayıt türü<select data-finance-expense-record-kind value={form.recordKind} onChange={(event) => updateField("recordKind", event.target.value)} disabled={selectedScopeKind === "OFFER"}><option value="ACTUAL">Gerçekleşen gider</option><option value="BUDGET">Bütçe</option><option value="FORECAST">Tahmini maliyet</option><option value="ACCRUAL">Karşılık</option></select></label>
           {selectedScopeKind === "OFFER" ? <div className="finance-v21-form-note finance-v21-form-full" data-finance-quote-cost-scope>Bu tutar seçili iş/teklif için tahmini maliyet olarak kaydedilir; gerçekleşen gider veya tahsilat değildir. Aynı teklif ve gider türü için ikinci kayıt açılmaz.</div> : null}
           <label>Gider türü<select ref={(node) => { fieldRefs.current.category = node; }} value={form.categoryKey} onChange={(event) => handleCategoryChange(event.target.value)} disabled={loading || !categories.length}><option value="">Gider türünü seçin</option>{categories.map((item) => <option key={item.key} value={item.key}>{item.label || CATEGORY_LABELS[item.key] || "Diğer gider"}</option>)}</select></label>
           <label>Tutar<input ref={(node) => { fieldRefs.current.amount = node; }} inputMode="decimal" value={form.amountMajor} onChange={(event) => updateField("amountMajor", event.target.value)} placeholder="örn. 1.000" aria-invalid={fieldInvalid("amount")} /></label>
           <label>Tarih<input ref={(node) => { fieldRefs.current.occurredAt = node; fieldRefs.current.date = node; }} type="date" value={form.occurredAt} onChange={(event) => updateField("occurredAt", event.target.value)} aria-invalid={fieldInvalid("occurredAt")} /></label>
          <label>Dönem türü<select value={form.occurrenceKind} onChange={(event) => updateField("occurrenceKind", event.target.value)}><option value="ONE_OFF">Tek seferlik</option><option value="PERIODIC">Aylık / dönemli</option></select></label>
           {form.occurrenceKind === "PERIODIC" ? <><label>Dönem başlangıcı<input ref={(node) => { fieldRefs.current.periodStart = node; }} type="date" value={form.periodStart} onChange={(event) => updateField("periodStart", event.target.value)} /></label><label>Dönem bitişi<input ref={(node) => { fieldRefs.current.periodEnd = node; }} type="date" value={form.periodEnd} onChange={(event) => updateField("periodEnd", event.target.value)} /></label></> : null}
           {(expenseContext.directTrip || scopeRequiresShift) ? <div className="finance-v21-form-full finance-v21-expense-context-question" data-finance-expense-shift-question><label>İlgili vardiya / sefer<select ref={(node) => { fieldRefs.current.shift = node; }} value={form.shiftId} onChange={(event) => handleShiftChange(event.target.value)} aria-invalid={fieldInvalid("shift")} disabled={selectedScopeKind === "OFFER" && Boolean(focusShiftId)}><option value="">{selectedScopeKind === "OFFER" ? "Seçili işin vardiyası" : (expenseContext.question || (expenseContext.noCandidateReason ? "Sefer seçimi" : "Sefer seçin"))}</option>{(expenseContext.candidates.length ? expenseContext.candidates : shiftCandidates).map((shift) => <option key={shift.id} value={shift.id}>{shift.label}</option>)}</select></label>{selectedScopeKind === "OFFER" ? <div className="finance-v21-form-note" role="status">Teklif/iş bağlantısı korunuyor; bu seçim değiştirilemez.</div> : expenseContext.question ? <div className="finance-v21-form-note" role="status">{expenseContext.question}</div> : null}{expenseContext.noCandidateReason ? <div className="finance-v21-form-note">{expenseContext.noCandidateReason}</div> : null}{form.shiftId ? <div className="finance-v21-form-note">Vardiya seçildi; ilişki ve dönem bilgisi kayda taşınır.</div> : null}</div> : null}
          {["VEHICLE", "OFFER", "SHIFT"].includes(selectedScopeKind) ? <label>Araç (plaka)<select ref={(node) => { fieldRefs.current.vehicle = node; }} value={form.vehicleId} onChange={(event) => updateField("vehicleId", event.target.value)} aria-invalid={fieldInvalid("vehicle")}><option value="">Araç seçin</option>{directory.vehicles.map((item) => <option key={item.id} value={item.id}>{item.plate || "Plakası olmayan araç"}</option>)}</select></label> : null}
          {["DRIVER", "OFFER", "SHIFT"].includes(selectedScopeKind) ? <label>Sürücü<select ref={(node) => { fieldRefs.current.driver = node; }} value={form.driverId} onChange={(event) => updateField("driverId", event.target.value)} aria-invalid={fieldInvalid("driver")}><option value="">Sürücü seçin</option>{directory.drivers.map((item) => <option key={item.id} value={item.id}>{item.fullName || "Adı olmayan sürücü"}</option>)}</select></label> : null}
           <details className="finance-v21-expense-advanced finance-v21-simple-advanced">
             <summary>Diğer bilgiler (isteğe bağlı)</summary>
             <div className="finance-v21-form-grid">
               <label>KDV görünümü<select value={form.vatMode} onChange={(event) => updateField("vatMode", event.target.value)}>{Object.entries(VAT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
               <label>KDV sınıflandırması<select value={form.vatClassification} onChange={(event) => updateField("vatClassification", event.target.value)}>{Object.entries(VAT_CLASSIFICATION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
               <label className="finance-v21-form-full">Açıklama<textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={2} /></label>
               <label>Kanıt referansı<input value={form.evidenceRef} onChange={(event) => updateField("evidenceRef", event.target.value)} placeholder="İsteğe bağlı belge veya fiş bilgisi" /></label>
               <label>Kaynak referansı<input value={form.sourceRef} onChange={(event) => updateField("sourceRef", event.target.value)} placeholder="İsteğe bağlı kaynak bilgisi" readOnly={selectedScopeKind === "OFFER"} /></label>
               {form.vatClassification !== "UNKNOWN" ? <><label>KDV kanıt referansı<input value={form.vatEvidenceRef} onChange={(event) => updateField("vatEvidenceRef", event.target.value)} placeholder="Belge veya yetkili değerlendirme referansı" /></label><label className="finance-v21-form-full">KDV sınıflandırma gerekçesi<textarea value={form.vatClassificationReason} onChange={(event) => updateField("vatClassificationReason", event.target.value)} rows={2} placeholder="Bu sınıflandırmanın dayanağını açıklayın" /></label>{form.vatClassification === "DOCUMENTED_VAT" ? <><label>KDV tutarı (₺)<input inputMode="decimal" value={form.vatAmountMajor} onChange={(event) => updateField("vatAmountMajor", event.target.value)} placeholder="Belgedeki KDV tutarı" /></label><label>KDV'nin maliyet etkisi<select value={form.vatDeductibility} onChange={(event) => updateField("vatDeductibility", event.target.value)}>{Object.entries(VAT_DEDUCTIBILITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></> : null}</> : null}
             </div>
           </details>
        </div>
         {form.vatClassification === "UNKNOWN" ? <div className="finance-v21-form-note">KDV ayrı hesaplanmadı. Giderin tamamı üzerinden hesap yapılıyor; KDV %0 varsayılmıyor.</div> : null}
        {String(form.recordKind || "ACTUAL").toUpperCase() === "ACTUAL" && ["VEHICLE", "DRIVER"].includes(selectedScopeKind) && !positiveId(focusShiftId) ? <div className="finance-v21-form-note">Bu araç/sürücü dönem gideri, doğrulanmış gerçek kullanım verilerine göre otomatik dağıtılır; aynı gider ikinci kez sayılmaz.</div> : null}
        {fieldInvalid(validationField) ? <div className="finance-v21-expense-message finance-v21-expense-message--error">{error}</div> : null}
        <div className="finance-v21-form-actions"><button type="button" className="btn primary" data-finance-batch-add-row onClick={batchEditingItem ? updateBatchRow : addBatchRow} disabled={busy !== "" || loading || (salaryCategorySelected && salaryRedacted)}>{busy === "batch-row" ? "Satır ekleniyor..." : busy === "batch-update" ? "Satır güncelleniyor..." : batchEditingItem ? "Satırı güncelle" : "Satırı taslağa ekle"}</button>{batchEditingItem ? <button type="button" className="btn sm ghost" onClick={() => { setBatchEditingItem(null); setForm({ ...createFreshForm(), categoryKey: String(categories[0]?.key || "").toUpperCase() }); }} disabled={busy !== ""}>Düzenlemeyi iptal et</button> : null}</div>
        {batchItems.length ? <div className="finance-v21-batch-review" data-finance-batch-review><div className="finance-v21-card-head"><div><h3>Toplu inceleme</h3><p>{batchItems.length} gider satırı · kayıt türleri ayrı tutulur.</p></div><strong>{batchItems.filter((item) => item.recordKind === "ACTUAL").length} gerçekleşen</strong></div><div className="finance-v21-draft-list">{batchItems.map((item) => <div className="finance-v21-draft-row" key={item.id}><div><strong>{item.categoryLabel || CATEGORY_LABELS[item.categoryKey] || "Diğer gider"}</strong><small>{relationSummary(item.display)} · {BUCKET_LABELS[item.recordKind] || "Kayıt"} · {formatDate(item.occurredAt || item.periodStart)}</small></div><b>{formatMinor(item.amountMinor, item.currencyCode)}</b><button type="button" className="btn sm ghost" onClick={() => editBatchItem(item)} disabled={busy !== ""}>DÜZENLE</button><button type="button" className="btn sm ghost" onClick={() => removeBatchItem(item)} disabled={busy !== ""}>ÇIKAR</button></div>)}</div><div className="finance-v21-form-note">KDV bilinmeyen satırlar net toplamda kesinleştirilmez.</div><div className="finance-v21-apply-row"><label>Açık onay<input value={batchConfirmationText} onChange={(event) => setBatchConfirmationText(event.target.value)} placeholder="UYGULA" /></label><button type="button" className="btn primary" data-finance-batch-apply onClick={applyBatch} disabled={busy !== "" || loading}>{busy === "batch-apply" ? "Uygulanıyor..." : "UYGULA"}</button></div></div> : null}
      </section> : null}

      {singleMode ? <section className="finance-v21-expense-composer" data-copilot-target="room:financial-operations:cost-entry-form" data-copilot-semantic-id="product:room:financial-operations:cost-entry-form">
        <div className="finance-v21-card-head"><div><h3>{correctionEntry ? "Onaylı gideri düzelt" : editingDraft ? "Gider taslağını düzenle" : "Tek gider taslağı"}</h3><p>{correctionEntry ? "Eski kayıt değişmez; yeni değerler açık onaydan sonra ters kayıt ve düzeltilmiş kayıt olarak işlenir." : "Taslak oluşturulur; açık onay vermeden merkezi deftere eklenmez."}</p></div><button type="button" className="btn sm ghost" onClick={closeSingleComposer} disabled={busy !== ""}>Kapat</button></div>
        <div className="finance-v21-form-grid">
          <label>Kapsam<select ref={(node) => { fieldRefs.current.scope = node; }} data-finance-expense-scope value={selectedScopeKind} onChange={(event) => handleScopeChange(event.target.value)} disabled={loading || quoteScopeActive}><option value="COMPANY">Firma geneli</option><option value="VEHICLE">Araç</option><option value="DRIVER">Sürücü</option><option value="OFFER">Teklif / iş</option><option value="SHIFT">Vardiya / sefer</option></select></label>
          <label>Kayıt türü<select data-finance-expense-record-kind value={form.recordKind} onChange={(event) => updateField("recordKind", event.target.value)} disabled={selectedScopeKind === "OFFER"}><option value="ACTUAL">Gerçekleşen gider</option><option value="BUDGET">Bütçe</option><option value="FORECAST">Tahmini maliyet</option><option value="ACCRUAL">Karşılık</option></select></label>
          {selectedScopeKind === "OFFER" ? <div className="finance-v21-form-note finance-v21-form-full" data-finance-quote-cost-scope>Bu tutar seçili iş/teklif için tahmini maliyet olarak kaydedilir; gerçekleşen gider veya tahsilat değildir. Aynı teklif ve gider türü için ikinci kayıt açılmaz.</div> : null}
          <label>Gider türü<select ref={(node) => { fieldRefs.current.category = node; }} value={form.categoryKey} onChange={(event) => handleCategoryChange(event.target.value)} disabled={loading || !categories.length}>{!categories.length ? <option value="">Kategori verisi bekleniyor</option> : <option value="">Gider türünü seçin</option>}{categories.map((item) => <option key={item.key} value={item.key}>{item.label || CATEGORY_LABELS[item.key] || "Diğer gider"}</option>)}</select></label>
          {planningNeedsCategory && !form.categoryKey ? <div className="finance-v21-form-note" data-finance-planning-category-required>Bu plan kaydı için önce hangi gider türünün bütçeleneceğini veya tahmin edileceğini seçin. Gerçekleşmiş giderler otomatik olarak plan kaydı gibi tekrar yazılmaz.</div> : null}
          <label>Tutar (₺)<input ref={(node) => { fieldRefs.current.amount = node; }} inputMode="decimal" value={form.amountMajor} onChange={(event) => updateField("amountMajor", event.target.value)} placeholder="örn. 12.500" aria-invalid={fieldInvalid("amount")} /></label>
          <label>Tarih<input ref={(node) => { fieldRefs.current.date = node; }} type="date" value={form.occurredAt} onChange={(event) => updateField("occurredAt", event.target.value)} aria-invalid={fieldInvalid("occurredAt")} /></label>
          <label>Dönem türü<select value={form.occurrenceKind} onChange={(event) => updateField("occurrenceKind", event.target.value)}><option value="ONE_OFF">Tek seferlik</option><option value="PERIODIC">Aylık / dönemli</option></select></label>
           {form.occurrenceKind === "PERIODIC" ? <><label>Dönem başlangıcı<input ref={(node) => { fieldRefs.current.periodStart = node; }} type="date" value={form.periodStart} onChange={(event) => updateField("periodStart", event.target.value)} aria-invalid={fieldInvalid("periodStart")} /></label><label>Dönem bitişi<input ref={(node) => { fieldRefs.current.periodEnd = node; }} type="date" value={form.periodEnd} onChange={(event) => updateField("periodEnd", event.target.value)} aria-invalid={fieldInvalid("periodEnd")} /></label></> : null}
           {(expenseContext.directTrip || scopeRequiresShift) ? <div className="finance-v21-form-full finance-v21-expense-context-question" data-finance-expense-shift-question><label>İlgili vardiya / sefer<select ref={(node) => { fieldRefs.current.shift = node; }} value={form.shiftId} onChange={(event) => handleShiftChange(event.target.value)} aria-invalid={fieldInvalid("shift")} disabled={selectedScopeKind === "OFFER" && Boolean(focusShiftId)}><option value="">{selectedScopeKind === "OFFER" ? "Seçili işin vardiyası" : (expenseContext.question || (expenseContext.noCandidateReason ? "Sefer seçimi" : "Sefer seçin"))}</option>{(expenseContext.candidates.length ? expenseContext.candidates : shiftCandidates).map((shift) => <option key={shift.id} value={shift.id}>{shift.label}</option>)}</select></label>{selectedScopeKind === "OFFER" ? <div className="finance-v21-form-note" role="status">Teklif/iş bağlantısı korunuyor; bu seçim değiştirilemez.</div> : expenseContext.question ? <div className="finance-v21-form-note" role="status">{expenseContext.question}</div> : null}{expenseContext.noCandidateReason ? <div className="finance-v21-form-note">{expenseContext.noCandidateReason}</div> : null}{form.shiftId ? <div className="finance-v21-form-note">Vardiya seçildi; ilişki ve dönem bilgisi kayda taşınır.</div> : null}</div> : null}
          {["VEHICLE", "OFFER", "SHIFT"].includes(selectedScopeKind) ? <label>Araç (plaka)<select ref={(node) => { fieldRefs.current.vehicle = node; }} value={form.vehicleId} onChange={(event) => updateField("vehicleId", event.target.value)} aria-invalid={fieldInvalid("vehicle")}><option value="">Araç seçin</option>{directory.vehicles.map((item) => <option key={item.id} value={item.id}>{item.plate || "Plakası olmayan araç"}</option>)}</select></label> : null}
          {["DRIVER", "OFFER", "SHIFT"].includes(selectedScopeKind) ? <label>Sürücü<select ref={(node) => { fieldRefs.current.driver = node; }} value={form.driverId} onChange={(event) => updateField("driverId", event.target.value)} aria-invalid={fieldInvalid("driver")}><option value="">Sürücü seçin</option>{directory.drivers.map((item) => <option key={item.id} value={item.id}>{item.fullName || "Adı olmayan sürücü"}</option>)}</select></label> : null}
           <details className="finance-v21-expense-advanced finance-v21-simple-advanced">
             <summary>Diğer bilgiler (isteğe bağlı)</summary>
             <div className="finance-v21-form-grid">
               <label>KDV görünümü<select value={form.vatMode} onChange={(event) => updateField("vatMode", event.target.value)}>{Object.entries(VAT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
               <label>KDV sınıflandırması<select value={form.vatClassification} onChange={(event) => updateField("vatClassification", event.target.value)}>{Object.entries(VAT_CLASSIFICATION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
               <label className="finance-v21-form-full">Açıklama<textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={2} /></label>
               <label>Kanıt referansı<input value={form.evidenceRef} onChange={(event) => updateField("evidenceRef", event.target.value)} placeholder="İsteğe bağlı belge veya fiş bilgisi" /></label>
               <label>Kaynak referansı<input value={form.sourceRef} onChange={(event) => updateField("sourceRef", event.target.value)} placeholder="İsteğe bağlı kaynak bilgisi" readOnly={selectedScopeKind === "OFFER"} /></label>
               {form.vatClassification !== "UNKNOWN" ? <><label>KDV kanıt referansı<input value={form.vatEvidenceRef} onChange={(event) => updateField("vatEvidenceRef", event.target.value)} placeholder="Belge veya yetkili değerlendirme referansı" /></label><label className="finance-v21-form-full">KDV sınıflandırma gerekçesi<textarea value={form.vatClassificationReason} onChange={(event) => updateField("vatClassificationReason", event.target.value)} rows={2} placeholder="Bu sınıflandırmanın dayanağını açıklayın" /></label>{form.vatClassification === "DOCUMENTED_VAT" ? <><label>KDV tutarı (₺)<input inputMode="decimal" value={form.vatAmountMajor} onChange={(event) => updateField("vatAmountMajor", event.target.value)} placeholder="Belgedeki KDV tutarı" /></label><label>KDV'nin maliyet etkisi<select value={form.vatDeductibility} onChange={(event) => updateField("vatDeductibility", event.target.value)}>{Object.entries(VAT_DEDUCTIBILITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></> : null}</> : null}
             </div>
           </details>
        </div>
         {form.vatClassification === "UNKNOWN" ? <div className="finance-v21-form-note">KDV ayrı hesaplanmadı. Giderin tamamı üzerinden hesap yapılıyor; KDV %0 varsayılmıyor.</div> : null}
        {String(form.recordKind || "ACTUAL").toUpperCase() === "ACTUAL" && ["VEHICLE", "DRIVER"].includes(selectedScopeKind) && !positiveId(focusShiftId) ? <div className="finance-v21-form-note">Bu araç/sürücü dönem gideri, doğrulanmış gerçek kullanım verilerine göre otomatik dağıtılır; aynı gider ikinci kez sayılmaz.</div> : null}
         {correctionEntry ? <div className="finance-v21-correction-preview" data-finance-correction-preview><strong>Düzeltme önizlemesi</strong><span>Eski kayıt: {correctionEntry.categoryLabel || CATEGORY_LABELS[correctionEntry.categoryKey] || "Gider"} · {salaryRedacted && SALARY_CATEGORIES.has(String(correctionEntry.categoryKey || "").toUpperCase()) ? "Gizli" : formatMinor(correctionEntry.amountMinor, correctionEntry.currencyCode)}</span><span>Yeni kayıt: {salaryRedacted && SALARY_CATEGORIES.has(String(form.categoryKey || "").toUpperCase()) ? "Gizli" : (form.amountMajor ? `${form.amountMajor} ${form.currencyCode}` : "Tutar girilmedi")}</span><small>Eski gider silinmez ve sessizce değiştirilmez. Aynı ekonomik gider iki kez sayılmaması için ters kayıt ve yeni kayıt birlikte işlenir.</small>{!correctionConfirmation.canConfirm ? <div className="finance-v21-form-note" role="status">{correctionConfirmation.message}</div> : null}</div> : null}
        {fieldInvalid(validationField) ? <div className="finance-v21-expense-message finance-v21-expense-message--error">{error}</div> : null}
         {correctionEntry ? <div className="finance-v21-apply-row"><button type="button" className="btn primary" data-finance-correction-apply data-finance-correction-confirm onClick={submitCorrection} disabled={busy !== "" || loading || !correctionConfirmation.canConfirm || (salaryCategorySelected && salaryRedacted)}>{busy === "correction" ? "Düzeltiliyor..." : "Değişikliği onayla"}</button></div> : <div className="finance-v21-form-actions"><button type="button" className="btn primary" onClick={editingDraft ? updateDraft : createDraft} disabled={busy !== "" || loading || (salaryCategorySelected && salaryRedacted)}>{busy === "draft" ? "Taslak hazırlanıyor..." : busy === "update-draft" ? "Taslak güncelleniyor..." : editingDraft ? "Değişiklikleri kaydet" : "Taslak oluştur"}</button></div>}
        {draftItem ? <div className="finance-v21-draft-review" data-finance-draft-review><div className="finance-v21-card-head"><div><h3>Taslak inceleme</h3><p>{draftItem.categoryLabel || CATEGORY_LABELS[draftItem.categoryKey] || "Diğer gider"} · {salaryRedacted && draftIsSalary ? "Gizli" : formatMinor(draftItem.amountMinor, draftItem.currencyCode)} · {formatDate(draftItem.occurredAt)}</p></div><strong>{confirmed ? "Onaylı gider" : "Taslak"}</strong></div>{salaryRedacted && draftIsSalary ? <div className="finance-v21-form-note">Bu kayıt kendi ROOM firmanızın kapsamı dışındaki kullanıcıya gösterilmez.</div> : <><div className="finance-v21-form-note">{String(draftItem.vatClassification || "UNKNOWN").toUpperCase() === "UNKNOWN" ? "KDV sınıflandırması bilinmiyor; kayıtlı brüt tutar korunur, KDV %0 veya istisna varsayılmaz." : vatClassificationLabel(draftItem.vatClassification)}</div>{!confirmed ? <div className="finance-v21-apply-row"><label>Açık onay<input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} placeholder="ONAYLA" /></label><button type="button" className="btn sm ghost" onClick={editDraft} disabled={busy !== "" || loading}>DÜZENLE</button><button type="button" className="btn primary" onClick={confirmDraft} disabled={busy !== "" || loading}>{busy === "confirm" ? "Onaylanıyor..." : "ONAYLA"}</button></div> : <div className="finance-v21-form-note">Bu kayıt açık onayla merkezi deftere eklendi.</div>}</>}</div> : null}
      </section> : null}
        </aside>
      </div> : null}

      <div className="finance-v21-expense-support">
        <div className="card" data-finance-ledger-validity><div className="panelSectionTitle">Mevcut kayıtların gider durumu</div><div className="muted" style={{ marginTop: 8 }}>{missing.length ? missing.map(humanMissing).join(", ") : "Zorunlu alanları tamamlanan mevcut kayıtlar geçerli; bu yalnız kayıtların geçerliliğini gösterir, maliyet hesabı kontrol listesini kapatmaz."}</div></div>
        <div className="card"><div className="panelSectionTitle">Net toplam ayrıştırması</div><div className="muted" style={{ marginTop: 8 }}>{netRollupMessages.length ? netRollupMessages.join(" ") : "Şu an net toplamı ayrıştırmayı bekleyen kalem yok."}</div></div>
      </div>
      {summary?.allocation ? <details className="finance-v21-allocation-disclosure"><summary>Maliyet dağıtım ayrıntıları · gerektiğinde aç</summary><AllocationPreview allocation={summary.allocation} /></details> : null}
    </section>
  );
}
