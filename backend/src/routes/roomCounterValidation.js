export function roomCounterPayloadError(body) {
  if (body?.confirmed === true) return null;
  if (body?.amountRoom == null && body?.noteRoom == null) {
    return {
      code: "ROOM_COUNTER_VALUE_REQUIRED",
      message: "Karşı teklif için 0'dan büyük bir tutar veya not girilmelidir.",
    };
  }
  return null;
}
