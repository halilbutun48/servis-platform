const ACTIONABLE_BLOCKERS = new Map([
  ["ALLOCATION_EVIDENCE_INCOMPLETE", "allocation"],
  ["COST_ALLOCATION_EVIDENCE_PENDING", "allocation"],
  ["ALLOCATION_EVIDENCE_PENDING", "allocation"],
]);

const EXPLICIT_EXPENSE_FIELDS = new Set(["amount", "vehicle", "driver", "shift", "period", "vat"]);

const EXPENSE_FIELD_LABELS = new Map([
  ["amount", "Tutar"],
  ["vehicle", "Araç"],
  ["driver", "Sürücü"],
  ["shift", "Sefer"],
  ["period", "Dönem"],
  ["vat", "KDV bilgisi"],
]);

const EXPENSE_FIELD_ACTION_LABELS = new Map([
  ["amount", "Tutarı düzelt"],
  ["vehicle", "İlgili aracı seç"],
  ["driver", "Sürücüyü seç"],
  ["shift", "İlgili seferi seç"],
  ["period", "Eksik dönemi gir"],
  ["vat", "KDV bilgisini tamamla"],
]);

export function classifyServiceCostBlocker(value) {
  const key = String(value || "").trim().toUpperCase();
  const action = ACTIONABLE_BLOCKERS.get(key) || null;
  return action ? { kind: "USER_ACTION", action } : { kind: "INFORMATION", action: null };
}

export function expenseMissingFieldLabel(field) {
  return EXPENSE_FIELD_LABELS.get(String(field || "").trim().toLowerCase()) || null;
}

export function expenseMissingFieldActionLabel(field) {
  return EXPENSE_FIELD_ACTION_LABELS.get(String(field || "").trim().toLowerCase()) || null;
}

export function unallocatedServiceCostAmountMinor(line) {
  if (String(line?.allocation || "DIRECT").trim().toUpperCase() !== "COUNT_IN_ROLLUP") return 0;
  const sourceAmountMinor = Number(line?.amountMinor ?? line?.grossAmountMinor);
  if (!Number.isSafeInteger(sourceAmountMinor) || sourceAmountMinor <= 0) return null;
  const allocatedAmountMinor = (Array.isArray(line?.allocationLines) ? line.allocationLines : []).reduce((sum, allocationLine) => {
    const amount = Number(allocationLine?.allocatedAmountMinor);
    return sum + (Number.isSafeInteger(amount) && amount > 0 ? amount : 0);
  }, 0);
  return Math.max(0, sourceAmountMinor - allocatedAmountMinor);
}

export function buildExpenseFocusTarget(line, { returnTo = null } = {}) {
  const entryId = Number(line?.entryId);
  const fields = Array.isArray(line?.missingFields)
    ? line.missingFields.map((field) => String(field || "").trim().toLowerCase()).filter(Boolean)
    : [];
  const field = fields.find((candidate) => EXPLICIT_EXPENSE_FIELDS.has(candidate));
  if (!Number.isSafeInteger(entryId) || entryId <= 0 || !field) return null;
  return {
    focusEntryId: entryId,
    field,
    periodStart: line?.periodStart || null,
    periodEnd: line?.periodEnd || null,
    returnTo: returnTo || null,
  };
}
