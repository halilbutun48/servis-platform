function detailText({ date, vehiclePlate, driverName }) {
  return [date, vehiclePlate, driverName].filter((value) => String(value || "").trim()).join(" · ") || "Bağlam bilgisi bekleniyor";
}

function positiveId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function companyScenarioFocusFromPreview(preview = null) {
  const snapshot = preview?.snapshot || {};
  const resolution = preview?.contextResolution || {};
  return {
    focusShiftId: positiveId(snapshot.shiftId ?? resolution.selectedShiftId),
    focusAgreementId: positiveId(snapshot.agreementId ?? resolution.selectedAgreementId),
  };
}

export function planningPreviewContext({ explicitlySelected = false, date, vehiclePlate, driverName } = {}) {
  const details = detailText({ date, vehiclePlate, driverName });
  if (explicitlySelected) {
    return {
      heading: "Seçili hizmet için planlama önizlemesi",
      title: "Seçili vardiya",
      details,
      note: "Bu önizleme seçili gerçekleşen hizmetin bağlamını kullanır; sonuç yine planlama önizlemesidir.",
    };
  }
  return {
    heading: "Bağımsız planlama önizlemesi",
    title: "Planlama örneği",
    details,
    note: "Bu tarih, üstteki gerçekleşen dönem filtresinden bağımsızdır; gerçekleşen sonucu göstermez.",
  };
}
