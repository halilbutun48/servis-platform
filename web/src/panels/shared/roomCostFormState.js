const PERIODIC_CATEGORIES = new Set([
  "EMPLOYER_MONTHLY_COST",
  "RENT",
  "DEPRECIATION",
  "MTV_TAX",
  "TRAFFIC_INSURANCE",
  "CASCO",
  "INSPECTION",
  "EMISSION_TEST",
  "MANDATORY_DOCUMENT",
  "FINANCE_CHARGE",
  "LEASING",
  "GPS",
  "CAMERA",
  "VEHICLE_EQUIPMENT",
]);
const CORRECTION_FIELDS = Object.freeze([
  "categoryKey",
  "amountMajor",
  "currencyCode",
  "vatMode",
  "vatClassification",
  "vatAmountMajor",
  "vatDeductibility",
  "vatEvidenceRef",
  "vatClassificationReason",
  "recordKind",
  "occurredAt",
  "occurrenceKind",
  "periodStart",
  "periodEnd",
  "description",
  "evidenceRef",
  "sourceRef",
  "vehicleId",
  "driverId",
  "shiftId",
]);
const CORRECTION_UPPERCASE_FIELDS = new Set([
  "categoryKey",
  "currencyCode",
  "vatMode",
  "vatClassification",
  "vatDeductibility",
  "recordKind",
  "occurrenceKind",
]);

const DIRECT_TRIP_CATEGORIES = new Set(["HGS_TOLL", "PARKING", "SERVICE_DIRECT", "ROUTE_FEE"]);
const INELIGIBLE_SHIFT_STATUSES = new Set(["CANCELLED", "REJECTED", "DECLINED"]);

export const SIMPLE_CORRECTION_CONFIRMATION_TOKEN = "ROOM_USER_CONFIRMED";

export function defaultExpenseComposerMode({ resumeBatch = false } = {}) {
  return resumeBatch ? "batch" : "single";
}

export function freshSingleExpenseComposerState() {
  return {
    draftItem: null,
    editingDraft: false,
    confirmationText: "",
  };
}

export function buildSimpleCorrectionConfirmation({ hasChanges = false } = {}) {
  if (!hasChanges) {
    return {
      canConfirm: false,
      confirmed: false,
      confirmationToken: "",
      message: "Henüz bir değişiklik yapmadınız.",
    };
  }
  return {
    canConfirm: true,
    confirmed: true,
    confirmationToken: SIMPLE_CORRECTION_CONFIRMATION_TOKEN,
    message: "",
  };
}

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function directTripCategory(categoryKey) {
  return DIRECT_TRIP_CATEGORIES.has(String(categoryKey || "").trim().toUpperCase());
}

function shiftLabel(shift) {
  const start = shift?.startAt ? new Date(shift.startAt) : null;
  const dateLabel = start && !Number.isNaN(start.getTime())
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(start)
    : "Tarihi belirtilmemiş";
  const vehicleLabel = shift?.vehicle?.plate ? ` · ${shift.vehicle.plate}` : "";
  const agreementLabel = shift?.agreement?.name || shift?.agreement?.title ? ` · ${shift.agreement.name || shift.agreement.title}` : "";
  return `${dateLabel}${vehicleLabel}${agreementLabel}`;
}

export function buildExpenseContext({ categoryKey, focusShiftId = null, formShiftId = null, candidates = [] } = {}) {
  const directTrip = directTripCategory(categoryKey);
  if (!directTrip) return { directTrip: false, shiftId: null, question: null, candidates: [], needsSelection: false, noCandidateReason: null };

  const eligible = (Array.isArray(candidates) ? candidates : [])
    .filter((shift) => positiveId(shift?.id) && !INELIGIBLE_SHIFT_STATUSES.has(String(shift?.status || "").trim().toUpperCase()))
    .map((shift) => ({ ...shift, id: positiveId(shift.id), label: shiftLabel(shift) }));
  const requestedId = positiveId(formShiftId) || positiveId(focusShiftId);
  const selected = requestedId ? eligible.find((shift) => shift.id === requestedId) : (eligible.length === 1 ? eligible[0] : null);
  return {
    directTrip: true,
    shiftId: selected?.id || null,
    question: selected || !eligible.length ? null : "Bu gider hangi sefere ait?",
    candidates: eligible,
    needsSelection: !selected && eligible.length > 1,
    noCandidateReason: !selected && !eligible.length ? "Bu tarihe uygun yetkili sefer bulunamadı; gider bağlantısı daha sonra tamamlanabilir." : null,
  };
}

export function clearStaleExpenseContext(previous = {}, nextCategoryKey = "") {
  if (directTripCategory(nextCategoryKey)) return { ...previous };
  return { ...previous, shiftId: "", agreementId: "" };
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

export function formPatchForFocusedCategory(categoryKey, previous = {}) {
  const normalizedCategory = String(categoryKey || "").trim().toUpperCase();

  return {
    ...previous,
    categoryKey: normalizedCategory,
    occurrenceKind: PERIODIC_CATEGORIES.has(normalizedCategory) ? "PERIODIC" : "ONE_OFF",
  };
}

export function validateRoomCostDraft({ form = {}, payload = {}, requiresShift = false, scopeKind = "COMPANY", focusOfferId = null } = {}) {
  const missing = [];
  const normalizedScope = String(scopeKind || "COMPANY").trim().toUpperCase();
  if (normalizedScope === "OFFER" && String(payload.recordKind || "").toUpperCase() !== "FORECAST") missing.push({ field: "scope", message: "Teklif/iş kapsamı yalnız tahmini maliyet olarak kaydedilir." });
  if (!payload.categoryKey) missing.push({ field: "category", message: "Önce gider türünü seçin." });
  if (!payload.amountMinor) missing.push({ field: "amount", message: "Tutarı girin." });
  if (!payload.currencyCode) missing.push({ field: "currencyCode", message: "Para birimini girin." });
  if (!payload.occurredAt) missing.push({ field: "occurredAt", message: "Tarihi girin." });
  if (form.occurrenceKind === "PERIODIC") {
    if (!form.periodStart) missing.push({ field: "periodStart", message: "Dönem başlangıcını girin." });
    if (!form.periodEnd) missing.push({ field: "periodEnd", message: "Dönem bitişini girin." });
  }
  if (requiresShift && !payload.shiftId && !(normalizedScope === "OFFER" && positiveId(focusOfferId))) {
    missing.push({ field: "shift", message: "İlgili seferi seçin." });
  }
  if (normalizedScope === "VEHICLE" && !payload.vehicleId) missing.push({ field: "scope", message: "Bu kayıt için ilgili aracı seçin." });
  if (normalizedScope === "DRIVER" && !payload.driverId) missing.push({ field: "scope", message: "Bu kayıt için ilgili sürücüyü seçin." });
  if (normalizedScope === "SHIFT" && !payload.shiftId) missing.push({ field: "scope", message: "Bu kayıt için ilgili vardiyayı seçin." });
  if (normalizedScope === "OFFER" && !payload.shiftId && !payload.agreementId && !positiveId(focusOfferId)) missing.push({ field: "scope", message: "Teklif/iş kapsamı için açık iş bağlantısı gerekir." });

  return {
    ok: missing.length === 0,
    missing,
    field: missing[0]?.field || "",
    message: missing[0]?.message || "",
  };
}

export function formFromDraftItem(item = {}) {
  const sourceRef = String(item.sourceRef || "");
  return {
    categoryKey: String(item.categoryKey || "").toUpperCase(),
    amountMajor: item.amountMinor == null ? "" : String(Number(item.amountMinor) / 100),
    currencyCode: String(item.currencyCode || "TRY").toUpperCase(),
    vatMode: String(item.vatMode || "UNKNOWN").toUpperCase(),
    vatClassification: String(item.vatClassification || "UNKNOWN").toUpperCase(),
    vatAmountMajor: item.vatAmountMinor == null ? "" : String(Number(item.vatAmountMinor) / 100),
    vatDeductibility: String(item.vatDeductibility || "UNKNOWN").toUpperCase(),
    vatEvidenceRef: String(item.vatEvidenceRef || ""),
    vatClassificationReason: String(item.vatClassificationReason || ""),
    recordKind: String(item.recordKind || "ACTUAL").toUpperCase(),
    occurredAt: dateInputValue(item.occurredAt),
    occurrenceKind: String(item.occurrenceKind || "ONE_OFF").toUpperCase(),
    periodStart: dateInputValue(item.periodStart),
    periodEnd: dateInputValue(item.periodEnd),
    description: String(item.description || ""),
    evidenceRef: String(item.evidenceRef || ""),
    sourceRef: String(item.sourceRef || ""),
    vehicleId: item.vehicleId == null ? "" : String(item.vehicleId),
    driverId: item.driverId == null ? "" : String(item.driverId),
    shiftId: item.shiftId == null ? "" : String(item.shiftId),
    agreementId: item.agreementId == null ? "" : String(item.agreementId),
    scopeKind: sourceRef.startsWith("ROOM-QUOTE-FORECAST-")
      ? "OFFER"
      : item.shiftId != null
        ? "SHIFT"
        : item.vehicleId != null
          ? "VEHICLE"
          : item.driverId != null
            ? "DRIVER"
            : "COMPANY",
  };
}

export function mergeLoadedExpenseForm(previous = {}, {
  formVehicleId = null,
  formDriverId = null,
  focusShiftId = null,
  defaultCategoryKey = "",
  planningNeedsCategory = false,
} = {}) {
  const vehicleId = Number(formVehicleId);
  const driverId = Number(formDriverId);
  const shiftId = Number(focusShiftId);
  return {
    ...previous,
    categoryKey: previous.categoryKey || (planningNeedsCategory ? "" : String(defaultCategoryKey || "").toUpperCase()),
    vehicleId: Number.isSafeInteger(vehicleId) && vehicleId > 0 ? String(vehicleId) : (previous.vehicleId || ""),
    driverId: Number.isSafeInteger(driverId) && driverId > 0 ? String(driverId) : (previous.driverId || ""),
    shiftId: previous.shiftId || (Number.isSafeInteger(shiftId) && shiftId > 0 ? String(shiftId) : ""),
    agreementId: previous.agreementId || "",
    scopeKind: previous.scopeKind || "",
  };
}

function parseMajorForComparison(value) {
  const text = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : null;
}

function normalizedCorrectionValue(form, field) {
  if (field === "amountMajor") return parseMajorForComparison(form?.[field]);
  const value = String(form?.[field] ?? "").trim();
  return CORRECTION_UPPERCASE_FIELDS.has(field) ? value.toUpperCase() : value;
}

export function correctionHasChanges(current = {}, original = {}) {
  return CORRECTION_FIELDS.some(
    (field) => normalizedCorrectionValue(current, field) !== normalizedCorrectionValue(original, field),
  );
}

export function userFacingDraftError(error, fallback = "Gider işlemi tamamlanamadı.") {
  const message = String(error?.message || error || "").trim();
  if (!message || /failed to fetch|networkerror|load failed/i.test(message)) return fallback;
  return message;
}
