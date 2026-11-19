function positiveId(value) {
  const numeric = Number(value || 0);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

function dateOnly(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^\d{4}-\d{2}-\d{2}/u);
  return match ? match[0] : "";
}

export function buildRoomQuoteContextFocus({ agreement = null, shift = null } = {}) {
  const agreementId = positiveId(agreement?.id);
  const shiftId = positiveId(shift?.id);
  const vehicleId = positiveId(shift?.vehicleId || shift?.vehicle?.id || agreement?.vehicleId || agreement?.vehicle?.id);
  return {
    agreementId,
    shiftId,
    vehicleId,
    periodStart: dateOnly(agreement?.startDate || shift?.startAt),
    periodEnd: dateOnly(agreement?.endDate || shift?.endAt || shift?.startAt),
  };
}

function hasVehicle(item, shift) {
  return positiveId(shift?.vehicleId || shift?.vehicle?.id || item?.vehicleId || item?.vehicle?.id);
}

function hasDriver(item, shift) {
  return positiveId(shift?.driverId || shift?.driver?.id || item?.driverId || item?.driver?.id);
}

function hasActiveRoomOffer(shift) {
  return Array.isArray(shift?.offers)
    && shift.offers.some((offer) => ["OPEN", "COUNTERED", "ACCEPTED"].includes(String(offer?.status || "").trim().toUpperCase()));
}

export function buildRoomQuotePreviewParams(agreement, { shiftId = null } = {}) {
  const agreementId = positiveId(agreement?.id);
  if (!agreementId) return {};

  const params = {
    view: "quote-profitability",
    focusAgreementId: agreementId,
    contextSource: "customer-request",
  };
  const selectedShiftId = positiveId(shiftId);
  const agreementStatus = String(agreement?.status || "").trim().toUpperCase();
  // An approved agreement's last shift is an operational result, not the
  // planning-template scope of its costed quote draft. Keep the preview on
  // the authorized Agreement so the stored draft and its assumptions remain
  // visible after ROOM's final approval.
  if (selectedShiftId && !["APPROVED", "ACTIVE", "COMPLETED", "DONE"].includes(agreementStatus)) {
    params.focusShiftId = selectedShiftId;
  }

  const startDate = dateOnly(agreement?.startDate);
  if (startDate) {
    params.period = startDate.slice(0, 7);
  }
  return params;
}

export function buildRoomQuoteRequestContext({ agreement = null, shift = null } = {}) {
  const agreementId = positiveId(agreement?.id);
  if (!agreementId && shift && positiveId(shift.id) && hasActiveRoomOffer(shift)) {
    const missing = [];
    if (!(Number(shift.routeSnapshotDistanceM) > 0 && Number(shift.routeSnapshotDurationSec) > 0)) {
      missing.push({
        key: "route",
        label: "Başlangıç ve bitiş / rota bilgisi",
        completion: "Bu talep için doğrulanmış rota bilgisi tamamlanmadan maliyet hesaplanamaz.",
      });
    }
    return {
      agreementId: null,
      shiftId: positiveId(shift.id),
      customerLabel: shift?.company?.name || shift?.companyName || "Müşteri bilgisi doğrulanamadı",
      periodLabel: `${dateOnly(shift?.startAt) || "Tarih belirtilmedi"} – ${dateOnly(shift?.endAt || shift?.startAt) || "Tarih belirtilmedi"}`,
      status: String(shift?.status || "").trim().toUpperCase() || "UNKNOWN",
      hasQuote: shift?.roomOfferAmount != null || shift?.companyOfferAmount != null,
      missing,
      canPreviewCost: missing.length === 0,
      hasAuthorizedCompletionPath: false,
      contractless: true,
    };
  }
  if (!agreementId) return null;

  const missing = [];
  // Agreement hub coordinates describe the service plan, not a measured
  // start/end route. A route-backed shift is required before distance and
  // duration can be sent to the canonical quotation model.
  if (!shift) {
    missing.push({
      key: "route",
      label: "Başlangıç ve bitiş / rota bilgisi",
      completion: "Bu talep için mevcut yetkili rota düzenleme yolu bulunamadı.",
    });
  }
  if (!hasVehicle(agreement, shift)) {
    missing.push({
      key: "vehicle",
      label: "Araç seçimi",
      completion: "Araç, mevcut sözleşme kabul akışında seçilebilir.",
    });
  }
  if (!hasDriver(agreement, shift)) {
    missing.push({
      key: "driver",
      label: "Sürücü seçimi",
      completion: "Sürücü, mevcut sözleşme kabul akışında seçilebilir.",
    });
  }
  if (!shift) {
    missing.push({
      key: "service",
      label: "Talebe bağlı planlı hizmet kaydı",
      completion: "Talep kabul edilmeden bağlı hizmet/operasyon kaydı oluşmaz.",
    });
  }

  return {
    agreementId,
    customerLabel: agreement?.company?.name || agreement?.companyName || "Müşteri bilgisi doğrulanamadı",
    periodLabel: `${dateOnly(agreement?.startDate) || "Tarih belirtilmedi"} – ${dateOnly(agreement?.endDate) || "Tarih belirtilmedi"}`,
    status: String(agreement?.status || "").trim().toUpperCase() || "UNKNOWN",
    hasQuote: agreement?.roomOfferAmount != null || agreement?.companyOfferAmount != null,
    missing,
    canPreviewCost: missing.length === 0,
    hasAuthorizedCompletionPath: missing.some((item) => ["vehicle", "driver"].includes(item.key)),
  };
}
