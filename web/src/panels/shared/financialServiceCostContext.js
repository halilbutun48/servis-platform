export function filterServiceShiftsForAgreement(shifts, agreementId, options = {}) {
  const items = Array.isArray(shifts) ? shifts : [];
  const selectedAgreementId = Number(agreementId || 0);
  if (!Number.isSafeInteger(selectedAgreementId) || selectedAgreementId <= 0) return items;
  return items.filter((shift) => Number(shift?.agreementId || 0) === selectedAgreementId
    || (options?.includeUnlinked === true && !Number(shift?.agreementId || 0)));
}

export function serviceContextRelationStatus({
  serviceAgreementId,
  shiftAgreementId,
  serviceVehicleId,
  shiftVehicleId,
} = {}) {
  const agreementId = Number(serviceAgreementId || 0);
  const linkedAgreementId = Number(shiftAgreementId || 0);
  const vehicleId = Number(serviceVehicleId || 0);
  const linkedVehicleId = Number(shiftVehicleId || 0);

  if (!agreementId && !linkedAgreementId && vehicleId && linkedVehicleId && vehicleId === linkedVehicleId) {
    return "Sözleşmesiz vardiya · araç doğrulandı";
  }
  if (!agreementId || !linkedAgreementId || !vehicleId || !linkedVehicleId) {
    return "Doğrulama bekliyor";
  }
  if (agreementId !== linkedAgreementId) {
    return "Seçim uyuşmuyor; dağıtım bekliyor";
  }
  if (vehicleId !== linkedVehicleId) {
    return "Seçim uyuşmuyor; dağıtım bekliyor";
  }
  return "Doğrulandı";
}
