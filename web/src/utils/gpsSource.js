export function gpsSourceLabelFromKey(source) {
  const key = String(source || '').trim().toUpperCase();
  if (key === 'DRIVER_PHONE') return "Sürücünün telefon GPS'i";
  if (key === 'DRIVER_PHONE_GPS') return "Sürücünün telefon GPS'i";
  if (key === 'DEVICE' || key === 'BACKEND_VEHICLE_GPS' || key === 'VENDOR') return 'Araç GPS’i';
  if (key === 'CACHED_BACKEND_VEHICLE_GPS') return "Önbellekteki araç GPS’i";
  if (key === 'LOCAL_DEVICE_PREVIEW') return 'Yerel telefon önizlemesi';
  return 'GPS bekleniyor';
}

export function gpsFreshnessLabelFromUiStatus(status) {
  const key = String(status || '').trim().toUpperCase();
  if (key === 'LIVE') return 'Canlı';
  if (key === 'STALE') return 'Eski';
  if (key === 'OFFLINE') return 'GPS yok';
  return 'GPS bekleniyor';
}
