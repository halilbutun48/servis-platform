const UNKNOWN_VAT = "UNKNOWN";

function sameId(left, right) {
  const leftId = Number(left);
  const rightId = Number(right);
  return Number.isSafeInteger(leftId) && leftId > 0 && leftId === rightId;
}

export function expenseMatchesOwner(entry = {}, { vehicleId = null, driverId = null, shifts = [] } = {}) {
  const allocationLines = Array.isArray(entry?.allocationLines) ? entry.allocationLines : [];
  const shiftById = new Map(
    (Array.isArray(shifts) ? shifts : [])
      .filter((shift) => Number.isSafeInteger(Number(shift?.id)) && Number(shift.id) > 0)
      .map((shift) => [Number(shift.id), shift]),
  );
  const matchesRelation = (relationId, entryValue, lineValue, shiftValue) => {
    if (relationId == null || relationId === "") return true;
    if (sameId(entryValue, relationId) || allocationLines.some((line) => (
      sameId(line?.[lineValue], relationId)
      || sameId(shiftById.get(Number(line?.shiftId))?.[shiftValue], relationId)
    ))) return true;
    return false;
  };
  return matchesRelation(vehicleId, entry?.vehicleId, "vehicleId", "vehicleId")
    && matchesRelation(driverId, entry?.driverId, "driverId", "driverId");
}

function isUnknownVat(entry = {}) {
  return String(entry?.vatClassification || UNKNOWN_VAT).trim().toUpperCase() === UNKNOWN_VAT;
}

export function buildExpenseRowPresentation(entry = {}, { special = "", serviceEvidenceMissing = false } = {}) {
  const vatUnknown = isUnknownVat(entry);
  return {
    rowTone: special === "future-actual" || special === "missing-evidence" ? "warning" : "default",
    sourceLabel: entry?.evidenceRef ? "Belge bilgisi eklendi" : "Belge bilgisi eklenmedi",
    vatStatus: vatUnknown
      ? { label: "KDV ayrıca belirtilmedi", tone: "neutral" }
      : { label: null, tone: "positive" },
    serviceEvidenceMissing: Boolean(serviceEvidenceMissing),
  };
}

export function buildExpenseSummaryNotes({ unknownVatCount = 0, pendingShiftCount = 0 } = {}) {
  const notes = [];
  const pendingCount = Number(pendingShiftCount);
  const unknownCount = Number(unknownVatCount);
  if (Number.isFinite(pendingCount) && pendingCount > 0) {
    notes.push(`${pendingCount} giderde servis payı ayrıca doğrulanmadı; bu bilgi yalnız ilgili giderin servis maliyetini etkiler.`);
  }
  if (Number.isFinite(unknownCount) && unknownCount > 0) {
    notes.push(`KDV bilgisi ayrıca belirtilmeyen ${unknownCount} gider var; giderler brüt tutarıyla işlendi ve KDV ayrıştırılmadı.`);
  }
  return notes;
}
