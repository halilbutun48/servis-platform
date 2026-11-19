export function hasPendingServiceAllocation({ pendingAmountMinor = null } = {}) {
  const amountMinor = Number(pendingAmountMinor);
  return Number.isFinite(amountMinor) && amountMinor > 0;
}

export function hasServiceAllocationEvidence(line = {}) {
  const serviceAmount = Number(line?.serviceAllocatedAmountMinor);
  if (Number.isSafeInteger(serviceAmount) && serviceAmount > 0) return true;
  const serviceLines = Array.isArray(line?.serviceAllocationLines) ? line.serviceAllocationLines : [];
  if (serviceLines.some((item) => Number(item?.allocatedAmountMinor) > 0)) return true;
  const allocationLines = Array.isArray(line?.allocationLines) ? line.allocationLines : [];
  if (allocationLines.some((item) => Number(item?.allocatedAmountMinor) > 0)) return true;
  return line?.shiftId != null
    && line?.allocationQuantity != null
    && Boolean(line?.allocationUnit)
    && line?.allocationUnitRateMinor != null;
}

export function describeServiceCostDistributionStatus(line = {}) {
  if (String(line?.allocation || "DIRECT").toUpperCase() === "EXCLUDED_FROM_ROLLUP") {
    return { label: "Servise dağıtılmadı", detail: "Bu hesap bu kalemi seçili maliyet kapsamına almıyor.", tone: "danger" };
  }
  if (String(line?.allocation || "DIRECT").toUpperCase() === "DIRECT" && line?.shiftId != null) {
    return { label: "Servise dağıtıldı", detail: "Gider seçili vardiya ile doğrudan ilişkili; ayrı dağıtım hesabı gerekmiyor.", tone: "good" };
  }
  const sourceAmountMinor = Number(line?.amountMinor ?? line?.grossAmountMinor);
  const serviceAmountMinor = Number(line?.serviceAllocatedAmountMinor);
  const allocationLines = Array.isArray(line?.allocationLines) ? line.allocationLines : [];
  const allocatedElsewhereMinor = allocationLines.reduce((sum, item) => {
    const amount = Number(item?.allocatedAmountMinor);
    return Number.isSafeInteger(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
  if (Number.isSafeInteger(sourceAmountMinor) && sourceAmountMinor > 0
    && allocatedElsewhereMinor >= sourceAmountMinor) {
    return {
      label: "Servise dağıtıldı",
      detail: "Giderin tamamı doğrulanmış sefer paylarına ayrıldı; seçili servisin payı yukarıda gösterilir.",
      tone: "good",
    };
  }
  if (Number.isSafeInteger(serviceAmountMinor) && serviceAmountMinor > 0
    && Number.isSafeInteger(sourceAmountMinor) && serviceAmountMinor < sourceAmountMinor) {
    return {
      label: "Kısmi dağıtıldı · kalan pay bekliyor",
      detail: "Seçili vardiyaya kanıtlı pay ayrıldı; kaynak giderin kalan bölümü henüz dağıtılmadı.",
      tone: "warm",
    };
  }
  if (hasServiceAllocationEvidence(line)) {
    return { label: "Servise dağıtıldı", detail: "Seçili vardiya için dağıtım kanıtı mevcut.", tone: "good" };
  }
  if (allocatedElsewhereMinor > 0) {
    return { label: "Başka vardiyaya ayrılmış pay", detail: "Kaynak giderin dağıtılmış payı seçili vardiya yerine başka vardiyalara bağlı.", tone: "warm" };
  }
  return { label: "Dağıtım bekliyor", detail: "Belirli servis/vardiya payı henüz doğrulanmadı.", tone: "warm" };
}
