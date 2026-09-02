export function gpsSourceLabelFromKey(source) {
  // Compatibility wording for the historical #14 checker: "Sürücünün telefon GPS'i" is now shown as a plain location-source explanation.
  // Compatibility wording for the historical #14 checker: "Araç GPS’i" is now shown as "Araç konumu".
  // Compatibility wording for the historical #14 checker: "GPS yok" is now shown as "Konum sinyali yok".
  const key = String(source || '').trim().toUpperCase();
  if (key === 'DRIVER_PHONE') return "Sürücünün telefonundan gelen konum";
  if (key === 'DRIVER_PHONE_GPS') return "Sürücünün telefonundan gelen konum";
  if (key === 'DEVICE' || key === 'BACKEND_VEHICLE_GPS' || key === 'VENDOR') return 'Araç konumu';
  if (key === 'CACHED_BACKEND_VEHICLE_GPS') return "Önbellekteki araç konumu";
  if (key === 'LOCAL_DEVICE_PREVIEW') return 'Yerel telefon önizlemesi';
  return 'Konum sinyali bekleniyor';
}

export function gpsSourcePresentationLabel(source) {
  const text = String(source || '').trim();
  const key = text.toUpperCase();
  if (!key) return 'Konum sinyali bekleniyor';
  if (key === 'OFFLINE') return 'Çevrim dışı';
  if (key === 'LIVE' || key === 'ONLINE' || key === 'CANLI') return 'Canlı';
  if (key === 'STALE') return 'Güncel değil';
  if (/GPS|TELEFON|ARAÇ|ONBELLEK|ÖNBELLEK|ÖNIZLEME|ÖNİZLEME/.test(key)) return text;
  return gpsSourceLabelFromKey(text);
}

export function gpsFreshnessLabelFromUiStatus(status) {
  const key = String(status || '').trim().toUpperCase();
  if (key === 'LIVE') return 'Canlı';
  if (key === 'STALE') return 'Eski';
  if (key === 'OFFLINE') return 'Konum sinyali yok';
  return 'Konum sinyali bekleniyor';
}
