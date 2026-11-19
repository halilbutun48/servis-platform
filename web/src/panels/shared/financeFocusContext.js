const FOCUSED_FINANCE_VIEWS = new Set([
  "service-cost",
  "vehicle-comparison",
  "quote-profitability",
]);

export const ROOM_FINANCE_CONTEXT_QUERY_KEYS = Object.freeze([
  "focusVehicleId",
  "focusDriverId",
  "focusShiftId",
  "focusAgreementId",
  "focusOfferId",
  "focusEntryId",
  "focusCostCategory",
  "focusField",
  "focusPeriodStart",
  "focusPeriodEnd",
  "filterVehicleId",
  "filterDriverId",
  "filterPeriodStart",
  "filterPeriodEnd",
  "operationalScope",
  "focusRecordKind",
  "prefillVehicleId",
  "prefillDriverId",
  "expenseFilter",
  "contextSource",
]);

export const ROOM_FINANCE_SERVICE_CONTEXT_QUERY_KEYS = Object.freeze([
  "serviceCostContextRequired",
  "focusVehicleId",
  "focusDriverId",
  "focusShiftId",
  "focusAgreementId",
  "focusOfferId",
  "focusCostCategory",
  "focusField",
  "contextSource",
]);

export function clearRoomFinanceContextParams(input) {
  const params = input instanceof URLSearchParams
    ? new URLSearchParams(input)
    : new URLSearchParams(String(input || ""));
  for (const key of ROOM_FINANCE_CONTEXT_QUERY_KEYS) params.delete(key);
  return params;
}

export function clearRoomFinanceContextParamsPreservingOperationalFilters(input) {
  const source = input instanceof URLSearchParams
    ? new URLSearchParams(input)
    : new URLSearchParams(String(input || ""));
  const params = clearRoomFinanceContextParams(source);
  for (const key of ["filterVehicleId", "filterDriverId", "filterPeriodStart", "filterPeriodEnd", "operationalScope"]) {
    if (source.has(key)) params.set(key, source.get(key));
  }
  return params;
}

export function clearRoomFinanceServiceContextParams(input) {
  const params = input instanceof URLSearchParams
    ? new URLSearchParams(input)
    : new URLSearchParams(String(input || ""));
  for (const key of ROOM_FINANCE_SERVICE_CONTEXT_QUERY_KEYS) params.delete(key);
  return params;
}

export function operationalFilterValuesFromUrl(input, fallback = {}) {
  const params = input instanceof URLSearchParams
    ? input
    : new URLSearchParams(String(input || ""));
  return {
    filterVehicleId: params.has("filterVehicleId") ? params.get("filterVehicleId") : (fallback.filterVehicleId ?? null),
    filterDriverId: params.has("filterDriverId") ? params.get("filterDriverId") : (fallback.filterDriverId ?? null),
    filterPeriodStart: params.has("filterPeriodStart") ? params.get("filterPeriodStart") : (fallback.filterPeriodStart ?? null),
    filterPeriodEnd: params.has("filterPeriodEnd") ? params.get("filterPeriodEnd") : (fallback.filterPeriodEnd ?? null),
  };
}

export function operationalPeriodMonthValue(periodStart, periodEnd) {
  const start = String(periodStart || "").trim().slice(0, 10);
  const end = String(periodEnd || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(start) || !/^\d{4}-\d{2}-\d{2}$/u.test(end)) return "";
  return start.slice(0, 7) === end.slice(0, 7) ? start.slice(0, 7) : "";
}

function dateOnly(year, monthIndex, day) {
  const normalized = new Date(Date.UTC(year, monthIndex, day));
  return `${normalized.getUTCFullYear()}-${String(normalized.getUTCMonth() + 1).padStart(2, "0")}-${String(normalized.getUTCDate()).padStart(2, "0")}`;
}

export function financePeriodPresetRange(preset, referenceDate = new Date()) {
  const date = referenceDate instanceof Date ? new Date(referenceDate.getTime()) : new Date(referenceDate);
  if (Number.isNaN(date.getTime())) return { periodStart: null, periodEnd: null };
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  if (preset === "current-month") {
    return {
      periodStart: dateOnly(year, monthIndex, 1),
      periodEnd: dateOnly(year, monthIndex + 1, 0),
    };
  }
  if (preset === "previous-month") {
    return {
      periodStart: dateOnly(year, monthIndex - 1, 1),
      periodEnd: dateOnly(year, monthIndex, 0),
    };
  }
  return { periodStart: null, periodEnd: null };
}

export function financePeriodPresetValue(periodStart, periodEnd, referenceDate = new Date()) {
  const start = String(periodStart || "").trim().slice(0, 10);
  const end = String(periodEnd || "").trim().slice(0, 10);
  if (!start && !end) return "all";
  const current = financePeriodPresetRange("current-month", referenceDate);
  if (start === current.periodStart && end === current.periodEnd) return "current-month";
  const previous = financePeriodPresetRange("previous-month", referenceDate);
  if (start === previous.periodStart && end === previous.periodEnd) return "previous-month";
  return "custom";
}

export function mergeRoomServiceContextWithoutOverwritingOperationalFilters(nextFocus = {}, previousFocus = {}, { blocked = false } = {}) {
  if (blocked) return nextFocus;
  return {
    ...nextFocus,
    vehicleId: previousFocus.vehicleId || nextFocus.vehicleId || null,
    driverId: previousFocus.driverId || nextFocus.driverId || null,
    shiftId: previousFocus.shiftId || nextFocus.shiftId || null,
    agreementId: previousFocus.agreementId || nextFocus.agreementId || null,
    periodStart: previousFocus.periodStart || nextFocus.periodStart || null,
    periodEnd: previousFocus.periodEnd || nextFocus.periodEnd || null,
  };
}

export function isExpenseEntryContext(input) {
  const params = input instanceof URLSearchParams
    ? input
    : new URLSearchParams(String(input || ""));
  return params.get("contextSource") === "expense-entry";
}

export function markRoomExpenseEntryContext(input) {
  const params = input instanceof URLSearchParams
    ? new URLSearchParams(input)
    : new URLSearchParams(String(input || ""));
  params.set("contextSource", "expense-entry");
  return params;
}

export function financeViewUsesFocusedContext(view) {
  return FOCUSED_FINANCE_VIEWS.has(String(view || "").trim());
}

export function roomServiceContextRequiredForView({
  view,
  hasExplicitServiceSelection = false,
  filterVehicleId = null,
  filterDriverId = null,
  filterPeriodStart = null,
  filterPeriodEnd = null,
} = {}) {
  if (hasExplicitServiceSelection) return false;
  const normalizedView = String(view || "").trim();
  if (normalizedView === "service-cost") return true;
  if (!financeViewUsesFocusedContext(normalizedView)) return false;
  return [filterVehicleId, filterDriverId, filterPeriodStart, filterPeriodEnd]
    .some((value) => String(value ?? "").trim() !== "");
}

export function roomExpenseLedgerFocusFromContext(focus = {}) {
  return {
    vehicleId: focus.vehicleId || focus.filterVehicleId || null,
    driverId: focus.driverId || focus.filterDriverId || null,
    periodStart: focus.periodStart || focus.filterPeriodStart || null,
    periodEnd: focus.periodEnd || focus.filterPeriodEnd || null,
  };
}

export function roomExpenseLedgerFocusForView(focus = {}, { preserveExpenseEntryContext = false } = {}) {
  if (preserveExpenseEntryContext) return roomExpenseLedgerFocusFromContext(focus);
  return roomExpenseLedgerFocusFromContext({
    filterVehicleId: focus.filterVehicleId,
    filterDriverId: focus.filterDriverId,
    filterPeriodStart: focus.filterPeriodStart,
    filterPeriodEnd: focus.filterPeriodEnd,
  });
}

function periodMonthPart(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}(?:-\d{2})?$/u.test(text) ? text.slice(0, 7) : "";
}

export function shouldClearRoomServiceContextForOperationalPeriodChange({
  hasExplicitServiceSelection = false,
  currentPeriodStart = null,
  currentPeriodEnd = null,
  nextPeriodStart = null,
  nextPeriodEnd = null,
} = {}) {
  if (!hasExplicitServiceSelection) return false;
  const currentStartMonth = periodMonthPart(currentPeriodStart);
  const currentEndMonth = periodMonthPart(currentPeriodEnd) || currentStartMonth;
  const nextStart = String(nextPeriodStart || "").trim().slice(0, 10);
  const nextEnd = String(nextPeriodEnd || nextPeriodStart || "").trim().slice(0, 10);
  const currentStart = String(currentPeriodStart || "").trim().slice(0, 10);
  const currentEnd = String(currentPeriodEnd || currentPeriodStart || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(nextStart) && /^\d{4}-\d{2}-\d{2}$/u.test(nextEnd)
    && /^\d{4}-\d{2}-\d{2}$/u.test(currentStart) && /^\d{4}-\d{2}-\d{2}$/u.test(currentEnd)) {
    return nextStart !== currentStart || nextEnd !== currentEnd;
  }
  const nextMonth = periodMonthPart(nextPeriodStart) || periodMonthPart(nextPeriodEnd);
  if (!nextMonth || !currentStartMonth || !currentEndMonth) return true;
  return nextMonth < currentStartMonth || nextMonth > currentEndMonth;
}

export function shouldClearRoomServiceContextForOperationalVehicleChange({
  hasExplicitServiceSelection = false,
  currentVehicleId = null,
  nextVehicleId = null,
} = {}) {
  if (!hasExplicitServiceSelection) return false;
  const current = Number(currentVehicleId || 0);
  const next = Number(nextVehicleId || 0);
  if (!Number.isSafeInteger(next) || next <= 0) return true;
  return current !== next;
}

export function shouldClearRoomServiceContextForOperationalFilterChange({
  hasExplicitServiceSelection = false,
  currentVehicleId = null,
  nextVehicleId,
  currentPeriodStart = null,
  currentPeriodEnd = null,
  nextPeriodStart,
  nextPeriodEnd,
} = {}) {
  if (!hasExplicitServiceSelection) return false;
  const vehicleChanged = nextVehicleId !== undefined
    && shouldClearRoomServiceContextForOperationalVehicleChange({
      hasExplicitServiceSelection,
      currentVehicleId,
      nextVehicleId,
    });
  const periodChanged = (nextPeriodStart !== undefined || nextPeriodEnd !== undefined)
    && shouldClearRoomServiceContextForOperationalPeriodChange({
      hasExplicitServiceSelection,
      currentPeriodStart,
      currentPeriodEnd,
      nextPeriodStart,
      nextPeriodEnd,
    });
  return vehicleChanged || periodChanged;
}

export function vehicleFitLabel({ passengerCount, vehicleCapacity } = {}) {
  const passengers = Number(passengerCount);
  const capacity = Number(vehicleCapacity);
  if (!Number.isFinite(passengers) || passengers <= 0 || !Number.isFinite(capacity) || capacity <= 0) return null;
  return capacity >= passengers ? "Uygun kapasite" : "Kapasite yetersiz";
}
