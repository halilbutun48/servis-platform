export function roomOfferScopeNote(offer = {}) {
  const source = String(offer?.source || "").trim().toUpperCase();
  if (source === "AGREEMENT_ROOM_OFFER") {
    return "Sözleşme geneli ROOM teklifi; seçili vardiya geliri değildir.";
  }
  if (source === "SHIFT_ROOM_OFFER") return "Seçili vardiya ROOM teklifi.";
  return "Teklif kapsamı doğrulanamadı.";
}

export function roomOfferTitle(offer = {}) {
  const status = String(offer?.marketOfferStatus || offer?.offerStatus || "").trim().toUpperCase();
  if (status === "COUNTERED") return "Karşı teklif";
  if (status === "OPEN") return "Açık teklif";
  if (status === "ACCEPTED") return "Kabul edilmiş teklif";
  return "Kayıtlı teklif";
}
