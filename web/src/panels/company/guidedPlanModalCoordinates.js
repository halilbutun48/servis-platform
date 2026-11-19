export function validateGuidedHubCoordinates(rawLat, rawLng) {
  const lat = rawLat === "" || rawLat == null ? null : Number(rawLat);
  const lng = rawLng === "" || rawLng == null ? null : Number(rawLng);
  if (lat == null && lng == null) {
    return { ok: false, message: "Önce hizmet konumunu belirle." };
  }
  if (lat == null || lng == null) {
    return { ok: false, message: "Konum enlem ve boylamı birlikte olmalı." };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, message: "Konum bilgisi geçerli değil." };
  }
  if (lat === 0 || lng === 0) {
    return { ok: false, message: "Konum 0,0 olamaz." };
  }
  return { ok: true, hubLat: lat, hubLng: lng };
}
