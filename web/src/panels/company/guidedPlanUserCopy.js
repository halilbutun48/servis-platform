export function guidedDraftInfoText({ resumed = false, createdIds = [], hydrationInfo = "" } = {}) {
  const ids = (Array.isArray(createdIds) ? createdIds : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => `#${value}`)
    .join(", ");

  if (resumed) {
    return `Taslak ${ids || "kayıt"} korundu; aynı kayıt üzerinden 3. adıma geçildi.`;
  }

  return `Taslak vardiya oluşturuldu: ${ids}${hydrationInfo || ""}`;
}

export function guidedRoomText(selectedShift, roomsById) {
  if (!selectedShift) return "Henüz vardiya seçilmedi";
  const roomId = Number(selectedShift.roomId || 0);
  const room = roomsById?.get ? roomsById.get(roomId) : null;
  const name = String(room?.name || room?.title || "").trim();
  if (name) return name;
  if (roomId > 0) return "Taşımacılık firması seçildi";
  return "Henüz taşımacılık firması seçilmedi";
}
