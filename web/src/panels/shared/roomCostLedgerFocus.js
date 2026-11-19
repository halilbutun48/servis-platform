const SALARY_CATEGORIES = new Set([
  "EMPLOYER_MONTHLY_COST",
  "BASE_SALARY",
  "BENEFIT",
  "OVERTIME",
  "PER_DIEM",
  "MEAL_ALLOWANCE",
  "SOCIAL_COST",
]);

export function resolveFocusedExpenseEntry(entries = [], focusEntryId) {
  const requestedId = Number(focusEntryId);
  if (!Number.isSafeInteger(requestedId) || requestedId <= 0) return null;
  return (Array.isArray(entries) ? entries : []).find((entry) => Number(entry?.id) === requestedId) || null;
}

export function focusedExpenseEditorKind(entry, { salaryRedacted = false } = {}) {
  if (!entry || entry.isReversal) return null;
  const lifecycle = String(entry.lifecycle || "").toUpperCase();
  if (lifecycle === "DRAFT") return "DRAFT";
  if (lifecycle !== "CONFIRMED") return null;
  const categoryKey = String(entry.categoryKey || "").toUpperCase();
  if (salaryRedacted && SALARY_CATEGORIES.has(categoryKey)) return null;
  return "CORRECTION";
}

export function shouldWaitForFocusedExpenseAuthorization(entry, { salaryRedacted = false, salaryAccessResolved = true } = {}) {
  const categoryKey = String(entry?.categoryKey || "").toUpperCase();
  return Boolean(entry && salaryRedacted && !salaryAccessResolved && SALARY_CATEGORIES.has(categoryKey));
}

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function normalizeExpensePrefill({ vehicleId, driverId } = {}) {
  const vehicle = positiveId(vehicleId);
  const driver = positiveId(driverId);
  return {
    vehicleId: vehicle ? String(vehicle) : "",
    driverId: driver ? String(driver) : "",
  };
}
