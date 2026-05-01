export function gpsSourceLabelFromKey(source, { cached = false } = {}) {
  const key = String(source || '').trim().toUpperCase();
  if (key === 'DRIVER_PHONE') return cached ? "Önbellekteki sürücünün telefon GPS'i" : "Sürücünün telefon GPS'i";
  if (key === 'LOCAL_DEVICE_PREVIEW') return cached ? 'Önbellekteki yerel telefon önizlemesi' : 'Yerel telefon önizlemesi';
  if (key === 'CACHED_BACKEND_VEHICLE_GPS') return "Önbellekteki resmi araç GPS'i";
  return cached ? "Önbellekteki resmi araç GPS'i" : 'Araç GPS’i';
}
