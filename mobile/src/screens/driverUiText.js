const TEXT_MAP = new Map([
  ['driver', 'Sürücü'],
  ['approved', 'Onaylı'],
  ['ok', 'Hazır'],
  ['ready', 'Hazır'],
  ['online', 'Bağlantı var'],
  ['local-emulator', 'Yerel test'],
  ['local-apk', 'Yerel test'],
  ['preview-internal', 'Önizleme'],
  ['preview', 'Önizleme'],
  ['production', 'Yayın'],
  ['expo go', 'Canlı test'],
  ['eas build', 'Derleme'],
  ['internal build', 'iç derleme'],
  ['preview apk', 'Android önizleme'],
  ['android preview', 'Android önizleme'],
  ['production aab', 'Yayın paketi'],
  ['production bundle', 'Yayın paketi'],
  ['build profiles', 'Yayın profilleri'],
  ['undetermined', 'İzin sorulmadı'],
  ['stopped', 'Durduruldu'],
  ['blocked', 'Gönderim kapalı'],
  ['blocking', 'Gönderim kapalı'],
  ['up', 'Hazır'],
  ['active', 'Aktif'],
  ['pending', 'Bekliyor'],
  ['completed', 'Tamamlandı'],
  ['done', 'Tamamlandı'],
  ['offline', 'Bağlantı yok'],
  ['warning', 'Dikkat'],
  ['warn', 'Dikkat'],
  ['critical', 'Kritik'],
  ['error', 'Hata'],
  ['retry', 'Yeniden denenecek'],
  ['unknown', 'Bilinmiyor'],
  ['no_data', 'Veri yok'],
  ['no data', 'Veri yok'],
  ['ready for job', 'Yeni iş alabilir'],
  ['ready_for_job', 'Yeni iş alabilir'],
  ['not available', 'Yeni iş istemiyor'],
  ['not_available', 'Yeni iş istemiyor'],
  ['closed today', 'Günü kapat'],
  ['closed_today', 'Günü kapat'],
]);

const TOKEN_REPLACEMENTS = [
  [/\bdriver\b/gi, 'Sürücü'],
  [/\bapproved\b/gi, 'Onaylı'],
  [/\bok\b/gi, 'Hazır'],
  [/\bonline\b/gi, 'Bağlantı var'],
  [/\bready\b/gi, 'Hazır'],
  [/\blocal-emulator\b/gi, 'Yerel test'],
  [/\bexpo go\b/gi, 'Canlı test'],
  [/\beas build\b/gi, 'Derleme'],
  [/\binternal build\b/gi, 'iç derleme'],
  [/\bpreview apk\b/gi, 'Android önizleme'],
  [/\bandroid preview\b/gi, 'Android önizleme'],
  [/\bproduction aab\b/gi, 'Yayın paketi'],
  [/\bproduction bundle\b/gi, 'Yayın paketi'],
  [/\bbuild profiles\b/gi, 'Yayın profilleri'],
  [/\bundetermined\b/gi, 'İzin sorulmadı'],
  [/\bstopped\b/gi, 'Durduruldu'],
  [/\bblocked\b/gi, 'Gönderim kapalı'],
  [/\bblocking\b/gi, 'Gönderim kapalı'],
  [/\bup\b/gi, 'Hazır'],
  [/\bactive\b/gi, 'Aktif'],
  [/\bpending\b/gi, 'Bekliyor'],
  [/\bcompleted\b/gi, 'Tamamlandı'],
  [/\bdone\b/gi, 'Tamamlandı'],
  [/\boffline\b/gi, 'Bağlantı yok'],
  [/\bwarning\b/gi, 'Dikkat'],
  [/\bwarn\b/gi, 'Dikkat'],
  [/\bcritical\b/gi, 'Kritik'],
  [/\berror\b/gi, 'Hata'],
  [/\bretry\b/gi, 'Yeniden denenecek'],
  [/\bunknown\b/gi, 'Bilinmiyor'],
  [/\bno_data\b/gi, 'Veri yok'],
  [/\bno data\b/gi, 'Veri yok'],
  [/\bready for job\b/gi, 'Yeni iş alabilir'],
  [/\bready_for_job\b/gi, 'Yeni iş alabilir'],
  [/\bnot available\b/gi, 'Yeni iş istemiyor'],
  [/\bnot_available\b/gi, 'Yeni iş istemiyor'],
  [/\bclosed today\b/gi, 'Günü kapat'],
  [/\bclosed_today\b/gi, 'Günü kapat'],
];

export function humanizeDriverUiText(value, fallback = '-') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  const mapped = TEXT_MAP.get(raw.toLowerCase()) || TEXT_MAP.get(raw) || TEXT_MAP.get(raw.replace(/\s+/g, ' ').toLowerCase());
  if (mapped) return mapped;
  return TOKEN_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), raw);
}

export function driverAvailabilityActionLabel(mode) {
  switch (String(mode || '').trim().toUpperCase()) {
    case 'DRIVING':
      return 'Molaya çık';
    case 'BREAK':
      return 'Devam et';
    case 'AVAILABLE':
      return 'Müsaitim';
    case 'READY_FOR_JOB':
      return 'Yeni iş alabilir';
    case 'NOT_AVAILABLE':
    case 'CLOSED_TODAY':
      return 'Günü kapat';
    default:
      return 'Güncelle';
  }
}

export function driverGpsPrimaryActionLabel({
  gpsNeedsPermission = false,
  backgroundTaskRunning = false,
} = {}) {
  if (gpsNeedsPermission) return 'GPS izni ver';
  if (!backgroundTaskRunning) return "Sürücünün telefon GPS'ini başlat";
  return 'Konumu şimdi gönder';
}

export function driverGpsStatusLabel({
  gpsNeedsPermission = false,
  backgroundPermissionGranted = true,
  backgroundTaskRunning = false,
  publishState = '',
} = {}) {
  if (gpsNeedsPermission) return 'GPS izni bekleniyor';
  if (!backgroundPermissionGranted) return 'Arka plan izni gerekli';
  if (!backgroundTaskRunning) return 'GPS gönderimi kapalı';
  const status = String(publishState || '').trim().toLowerCase();
  if (status === 'ok') return 'GPS gönderimi aktif';
  if (status === 'retry') return 'GPS gönderimi yeniden denenecek';
  if (status === 'blocked') return 'GPS gönderimi kapalı';
  return 'Sürücünün telefon GPS’i hazır';
}
