function normalizedSource(value) {
  return String(value || "").trim().toUpperCase();
}

function hasPositiveOperationId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0;
}

function userFacingSourceLabel(source) {
  const normalized = normalizedSource(source);
  if (!normalized) return "Kaynak bilgisi yok";
  if (normalized === "TEST_SIMULATED") return "Kontrollü DEMO simülasyonu";
  if (normalized === "DEMO_FIXTURE" || normalized.startsWith("M18_DEMO")) return "Demo/test kaydı";
  if (normalized === "INTERNAL_ACTUAL") return "SeferPakt iç kaydı";
  if (normalized === "EXTERNAL_REFERENCE") return "Dış referans";
  return "Kayıt kaynağı";
}

export function formatReconciliationRecord({ kind, exists, source } = {}) {
  const recordLabel = kind === "invoice" ? "Fatura kaydı" : "Hakediş kaydı";
  return {
    recordLabel: exists ? `${recordLabel} mevcut` : `${recordLabel} bulunamadı`,
    sourceLabel: exists ? userFacingSourceLabel(source) : "Kayıt yok",
  };
}

export function getReconciliationPrimaryAction({ status, operationShiftIds = [], canOpenOperation = false } = {}) {
  const normalizedStatus = String(status || "").toUpperCase();
  const hasOperation = Array.isArray(operationShiftIds) && operationShiftIds.some(hasPositiveOperationId);

  if (["NO_OPERATION", "PARTIAL_OPERATION_EVIDENCE"].includes(normalizedStatus)) {
    if (hasOperation && canOpenOperation) return { kind: "open-operation", label: "Operasyon kaydını aç" };
    return { kind: "explain-missing-operation", label: normalizedStatus === "NO_OPERATION" ? "Kanıt koşullarını gör" : "Eksik kanıtı gör" };
  }
  if (["NO_HAKEDIS", "NO_INVOICE"].includes(normalizedStatus)) return { kind: "review-missing-record", label: "Eksikliği incele" };
  if (normalizedStatus === "MATCHED") return null;
  return { kind: "review", label: "Farkı incele" };
}

export function getOperationEvidenceMessage({ status, hasOperation = false } = {}) {
  const normalizedStatus = String(status || "").toUpperCase();
  if (normalizedStatus === "NO_OPERATION") {
    return "Bu dönem için sözleşmeye bağlı gerçek bir vardiya/operasyon kaydı bulunmuyor. Kanıt, gerçek operasyon kaydı oluştuğunda görünür; sahte kanıt oluşturulmaz.";
  }
  if (normalizedStatus === "PARTIAL_OPERATION_EVIDENCE") {
    return hasOperation
      ? "Bağlı vardiya kaydı var; eksik tamamlanma kanıtını gerçek operasyon kaydında kontrol edin."
      : "Tamamlanma kanıtı bulunamadı; gerçek vardiya/operasyon kaydı oluşmadan kanıt tamamlanmış sayılmaz.";
  }
  if (normalizedStatus === "INCOME_SERVICE_SCOPE_NOT_PROVEN") {
    return hasOperation
      ? "Sözleşme dönemi için planlı hizmetlerin tamamı kanıtlanmadı; kayıtlı hakediş otomatik hesap kanıtı değildir."
      : "Sözleşme dönemi için planlı hizmet kanıtı bulunamadı; kayıtlı hakediş otomatik hesap kanıtı değildir.";
  }
  return "";
}

export function getRoomAgreementSummary({
  status,
  statusLabel,
  operations = {},
  canOpenOperation = false,
  canOpenAgreementShifts = false,
} = {}) {
  const normalizedStatus = String(status || "").toUpperCase();
  const operationShiftIds = Array.isArray(operations.shiftIds)
    ? operations.shiftIds.filter(hasPositiveOperationId)
    : [];
  const eligibleCount = Number(operations.eligibleCount || 0);
  const completedCount = Number(operations.completedCount || 0);
  const hasOperation = operationShiftIds.length > 0;
  const hasCompleteOperationEvidence = hasOperation && eligibleCount > 0 && completedCount >= eligibleCount;

  if (!hasOperation) {
    return {
      statusLabel: statusLabel || "Operasyon kanıtı yok",
      reason: "Bu dönem için sözleşmeye bağlı gerçek bir vardiya/operasyon kaydı bulunmuyor.",
      primaryAction: canOpenAgreementShifts
        ? { kind: "open-agreement-shifts", label: "Vardiyaları kontrol et" }
        : null,
      showDisclosure: false,
    };
  }

  if (normalizedStatus === "INCOME_SERVICE_SCOPE_NOT_PROVEN") {
    return {
      statusLabel: statusLabel || "Hizmet kapsamı doğrulanmadı",
      reason: "Sözleşme dönemi için planlı hizmetlerin tamamı kanıtlanmadı; kayıtlı hakediş otomatik hesap kanıtı değildir.",
      primaryAction: canOpenAgreementShifts
        ? { kind: "open-agreement-shifts", label: "Planlı hizmetleri kontrol et" }
        : canOpenOperation
          ? { kind: "open-operation", label: "Operasyon kaydını aç" }
          : null,
      showDisclosure: false,
    };
  }

  if (canOpenOperation && !["MATCHED", "UNDER_INVOICED", "OVER_INVOICED"].includes(normalizedStatus)) {
    return {
      statusLabel: hasCompleteOperationEvidence ? "Operasyon kaydı bağlı" : (statusLabel || "Operasyon kanıtı eksik"),
      reason: hasCompleteOperationEvidence
        ? `Bu sözleşmeye bağlı ${operationShiftIds.length} vardiya bulundu.`
        : "Bağlı vardiya kaydı var; eksik tamamlanma kanıtını gerçek operasyon kaydında kontrol edin.",
      primaryAction: { kind: "open-operation", label: "Operasyon kaydını aç" },
      showDisclosure: false,
    };
  }

  return {
    statusLabel: statusLabel || "İncelenmeli",
    reason: hasCompleteOperationEvidence
      ? `Bu sözleşmeye bağlı ${operationShiftIds.length} vardiya bulundu.`
      : "Bağlı vardiya kaydı var; operasyon kanıtını kontrol edin.",
    primaryAction: getReconciliationPrimaryAction({
      status: normalizedStatus,
      operationShiftIds,
      canOpenOperation: false,
    }),
    showDisclosure: false,
  };
}
