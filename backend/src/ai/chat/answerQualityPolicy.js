function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(list) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const text = String(item || '').trim();
    if (!text) continue;
    const key = normalizeText(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

const WORKFLOW_GENERIC_CHIP_BLOCKLIST = [
  'Bu ekranı detaylı anlat',
  'Bu ekranı anlat',
  'Bu ekranın amacını göster',
  'Bu ne demek?',
  'Bu rolde ne yapabilirim?',
  'Şimdi ne yapayım',
  'Şimdi ne yapmalıyım',
  'Aynı kayıt için devam et',
  'İlgili kayıtla devam et',
  'İlgili kaydı aç',
  'İlgili yere götür',
  'İlgili ekrana git',
  'Ekran rehberini aç',
  'Sonraki adımı göster',
  'Sıradaki adımı göster',
  'Vardiya engelini sor',
  'Sıradaki doğru işlem ne?',
  'Hangi ekrana geçmeliyim?',
  'Şimdi hangi ekrana gitmeliyim?',
  'İlk neye bakayım?',
  'Burada eksik ne olabilir?',
  'Önce neyi kontrol edeyim',
  'Kontrol listesi ver',
  'Sıralı kontrol ver',
  'Yetki sınırını kontrol et',
  'Bu aksiyonu simüle et',
];

export function hasExplicitRoleBoundarySignal({ questionType, activeTopic, message }) {
  const text = normalizeLooseText(message);
  const topic = String(activeTopic || '');
  if (['ROLE_HELP', 'WHO_CAN_DO', 'ROLE_BOUNDARY', 'KVKK_VISIBILITY'].includes(String(questionType || ''))) return true;
  if (['ROLE_BOUNDARY', 'WHO_CAN_DO', 'KVKK_VISIBILITY'].includes(topic)) return true;
  return /(yetki|erişim|erisim|izin|rol|kvkk|göremez|goremeyebilir|görünmeyebilir|gorunmeyebilir|görünmüyor|gorunmuyor|403|401|permission denied|erişim kapalı|erisim kapali)/.test(text);
}

export function workflowTopicChipSet({ activeTopic = '', questionType = '', screenPath = '' } = {}) {
  const topic = String(activeTopic || questionType || '');
  const path = normalizeText(screenPath);

  if (path.includes('/room/operation-health') || path.includes('/superadmin/operations')) {
    return ['Riskli cihazı göster', 'Stale/offline satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'];
  }
  if (path.includes('/driver/today')) {
    return ['Bugünkü görevleri göster', 'Rota ne durumda?', 'Bildirimleri göster', 'PIN/GPS sınırı nedir?'];
  }
  if (path.includes('/personel/live') || path.includes('/parent/live')) {
    return ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'];
  }
  if (path.includes('/room/map') || path.includes('/room/live') || path.includes('/company/map') || path.includes('/company/live') || path.includes('/organization/map') || path.includes('/organization/live') || path.includes('/school/map') || path.includes('/school/live') || path.includes('/driver/map') || path.includes('/driver/live')) {
    return ['Son GPS ne zaman geldi?', "Sürücünün telefon GPS’i devrede mi?", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
  }
  if (path.includes('/room/shifts') || path.includes('/company/shifts') || path.includes('/organization/shifts')) {
    if (topic === 'PAYMENT_READINESS' || topic === 'PAYMENT_MISSING') {
      return ['Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?', 'Hakediş önizlemesini aç'];
    }
    if (topic === 'CONTRACT_TO_SHIFT' || topic === 'CONTRACT_SHIFT_TODAY') {
      return ['İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim geçmişini göster', 'Üretim durumunu açıkla'];
    }
    if (topic === 'QUALITY_SIGNAL' || topic === 'TRUST_QUALITY') {
      return ['Açık kalite sinyallerini göster', 'Son değerlendirmeyi aç', 'Risk nedenini açıkla', 'Kanıt durumunu kontrol et'];
    }
    if (topic === 'FEEDBACK_STATUS') {
      return ['Açık geri bildirimi göster', 'Sorumlu rolü göster', 'Geri bildirim açık', 'İlgili kaydı aç'];
    }
    if (topic === 'NOTIFICATION_SOURCE') {
      return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
    }
    if (topic === 'KVKK_VISIBILITY') {
      return ['KVKK sınırını açıkla', 'Bu rolde ne görünür?', 'Erişim neden kapalı?', 'Yetkili ekrana yönlendir'];
    }
    if (topic === 'WHO_CAN_DO' || topic === 'ROLE_BOUNDARY') {
      return ['Bu işlemi kim yapabilir?', 'Yetki sınırını açıkla', 'Bu rolde ne görünür?', 'Yetkili ekrana yönlendir'];
    }
    return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
  }
  if (path.includes('/superadmin/commercial-core')) {
    return ['Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?', 'Hakediş önizlemesini aç'];
  }
  if (path.includes('/room/commercial-flow')) {
    return ['İlgili sözleşmeyi aç', 'Hakediş önizlemesini aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
  }
  if (path.includes('/room/agreements')) {
    return ['İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim geçmişini göster', 'Üretim durumunu açıkla'];
  }
  if (path.includes('/shared/feedback')) {
    return ['Açık geri bildirimi göster', 'Sorumlu rolü göster', 'Geri bildirim açık', 'İlgili kaydı aç'];
  }
  if (path.includes('/shared/notifications')) {
    return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
  }
  if (path.includes('/shared/kvkk')) {
    return ['KVKK sınırını açıkla', 'Bu rolde ne görünür?', 'Erişim neden kapalı?', 'Yetkili ekrana yönlendir'];
  }
  if (path.includes('/room/drivers')) {
    return ['Aktif sürücüleri kontrol et', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla', 'Bu kayıtta kim görevli?'];
  }
  if (path.includes('/room/reports')) {
    return ['Bu bilgi neden görünmüyor?', 'Bu kayıt kimde?', 'Hangi rapora bakmalıyım?', 'Filtreleri nasıl kullanırım?'];
  }
  if (path.includes('/company/operations') || path.includes('/school/operations') || path.includes('/organization/operations')) {
    return ['Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri', 'Yetki sınırı'];
  }
  if (path.includes('/superadmin/trust-quality')) {
    return ['Açık kalite sinyallerini göster', 'Son değerlendirmeyi aç', 'Risk nedenini açıkla', 'Kanıt durumunu kontrol et'];
  }
  if (path.includes('/superadmin/operation-verification') || path.includes('/superadmin/acceptance') || path.includes('/superadmin/observability')) {
    return ['İlgili kontrol kartını aç', 'Bu ne demek?', 'Sıradaki adımı göster', 'İlgili yere götür'];
  }

  switch (topic) {
    case 'SHIFT_BLOCKED':
    case 'WHY_BLOCKED':
      return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
    case 'VEHICLE_NOT_VISIBLE':
    case 'DRIVER_PHONE_GPS':
      return ['Son GPS ne zaman geldi?', "Sürücünün telefon GPS’i devrede mi?", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
    case 'PAYMENT_READINESS':
    case 'PAYMENT_MISSING':
    case 'PAYMENT_PREVIEW':
      return ['Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?', 'Hakediş önizlemesini aç'];
    case 'CONTRACT_TO_SHIFT':
    case 'CONTRACT_SHIFT_TODAY':
      return ['İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim geçmişini göster', 'Üretim durumunu açıkla'];
    case 'QUALITY_SIGNAL':
    case 'TRUST_QUALITY':
      return ['Açık kalite sinyallerini göster', 'Son değerlendirmeyi aç', 'Risk nedenini açıkla', 'Kanıt durumunu kontrol et'];
    case 'FEEDBACK_STATUS':
      return ['Açık geri bildirimi göster', 'Sorumlu rolü göster', 'Geri bildirim açık', 'İlgili kaydı aç'];
    case 'NOTIFICATION_SOURCE':
      return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
    case 'KVKK_VISIBILITY':
      return ['KVKK sınırını açıkla', 'Bu rolde ne görünür?', 'Erişim neden kapalı?', 'Yetkili ekrana yönlendir'];
    case 'WHO_CAN_DO':
    case 'ROLE_BOUNDARY':
      return ['Bu işlemi kim yapabilir?', 'Yetki sınırını açıkla', 'Bu rolde ne görünür?', 'Yetkili ekrana yönlendir'];
    case 'NEXT_SCREEN':
      return ['Hangi ekrana gitmeliyim?', 'Şimdi hangi ekrana gitmeliyim?', 'Doğru ekranı aç', 'İlgili kaydı aç'];
    case 'NEXT_STEP':
    case 'FIRST_CONTROL':
    case 'SAFE_NEXT_STEP':
    case 'MISSING_DATA':
    case 'STATUS_HELP':
      return ['İlgili kaydı aç', 'Eksik alanları göster', 'Doğru ekranı aç', 'Sıralı kontrol ver'];
    default:
      return ['İlgili kaydı aç', 'Eksik alanları göster', 'Doğru ekranı aç', 'Sıralı kontrol ver'];
  }
}

export function workflowActionSpec({ activeTopic = '', questionType = '' } = {}) {
  const topic = String(activeTopic || questionType || '');
  switch (topic) {
    case 'SHIFT_BLOCKED':
    case 'WHY_BLOCKED':
      return {
        guideLabel: 'Canlı başlatma rehberini aç',
        jobType: 'ASSIGNMENT_READINESS_GUIDE',
        guideLevel: 'STEP_BY_STEP',
        reason: 'Canlı başlatma, aktif durum, GPS ve operasyon kanıtı akışını sıralar.',
        askLabel: 'Başlatma durumunu sor',
        askQuery: 'bu vardiya neden başlayamıyor',
        askReason: 'Başlayamama nedenini tekrar sorar.',
      };
    case 'VEHICLE_NOT_VISIBLE':
    case 'DRIVER_PHONE_GPS':
      return {
        guideLabel: 'GPS teşhis rehberini aç',
        jobType: 'GPS_SIGNAL_DIAGNOSIS_GUIDE',
        guideLevel: 'WHY',
        reason: 'Araç GPS’i, görev bağlantısı ve sürücünün telefon GPS’i akışını açar.',
        askLabel: 'GPS görünürlüğünü sor',
        askQuery: 'bu araç neden haritada görünmüyor',
        askReason: 'Konum görünürlüğü teşhisini tekrar sorar.',
      };
    case 'PAYMENT_READINESS':
    case 'PAYMENT_MISSING':
    case 'PAYMENT_PREVIEW':
      return {
        guideLabel: 'Hakediş önizleme rehberini aç',
        jobType: 'ASSIGNMENT_READINESS_GUIDE',
        guideLevel: 'STEP_BY_STEP',
        reason: 'Hakediş önizleme sinyallerini adım adım sıralar.',
        askLabel: 'Hakediş eksiklerini sor',
        askQuery: 'bu hakediş neden hazır değil',
        askReason: 'Hakediş eksiklerini hızlıca tekrar sorar.',
      };
    case 'CONTRACT_TO_SHIFT':
    case 'CONTRACT_SHIFT_TODAY':
      return {
        guideLabel: 'Sözleşme → vardiya rehberini aç',
        jobType: 'ASSIGNMENT_READINESS_GUIDE',
        guideLevel: 'STEP_BY_STEP',
        reason: 'Sözleşme ve vardiya bağını sıraya koyar.',
        askLabel: 'Üretim durumunu sor',
        askQuery: 'bu sözleşmeden bugün vardiya üretildi mi',
        askReason: 'Üretim bilgisini sözleşme üzerinden tekrar sorar.',
      };
    case 'QUALITY_SIGNAL':
    case 'TRUST_QUALITY':
      return {
        guideLabel: 'Kalite sinyali rehberini aç',
        jobType: 'ASSIGNMENT_READINESS_GUIDE',
        guideLevel: 'WHY',
        reason: 'Kalite, inceleme ve denetim izini birlikte açar.',
        askLabel: 'Kalite sinyalini sor',
        askQuery: 'bu sağlayıcı neden daha iyi görünüyor',
        askReason: 'Kalite sinyalini tekrar sorar.',
      };
    case 'FEEDBACK_STATUS':
      return {
        guideLabel: 'Geri bildirim durumu rehberini aç',
        jobType: 'ROLE_HELP_GUIDE',
        guideLevel: 'SHORT',
        reason: 'Açık, kritik ve sorumlu rol durumunu açıklar.',
        askLabel: 'Geri bildirim durumunu sor',
        askQuery: 'bu kayıt ne durumda',
        askReason: 'Geri bildirim durumunu tekrar sorar.',
      };
    case 'NOTIFICATION_SOURCE':
      return {
        guideLabel: 'Bildirim kaynağı rehberini aç',
        jobType: 'ROLE_HELP_GUIDE',
        guideLevel: 'SHORT',
        reason: 'Rol, bildirim ve görünürlük sınırını açıklar.',
        askLabel: 'Bildirim kaynağını sor',
        askQuery: 'bu bildirim hangi olaydan geldi',
        askReason: 'Bildirim kaynağını tekrar sorar.',
      };
    case 'KVKK_VISIBILITY':
      return {
        guideLabel: 'KVKK sınırı rehberini aç',
        jobType: 'ROLE_HELP_GUIDE',
        guideLevel: 'SHORT',
        reason: 'Rol ve görünürlük sınırını açıklar.',
        askLabel: 'KVKK sınırını sor',
        askQuery: 'bu bilgi neden görünmüyor',
        askReason: 'Görünürlük sınırını tekrar sorar.',
      };
    case 'WHO_CAN_DO':
    case 'ROLE_BOUNDARY':
      return {
        guideLabel: 'Yetki sınırı rehberini aç',
        jobType: 'ROLE_HELP_GUIDE',
        guideLevel: 'SHORT',
        reason: 'Rol ve görünürlük sınırını açıklar.',
        askLabel: 'Bu işlemi kim yapabilir?',
        askQuery: 'bunu kim yapabilir',
        askReason: 'Yetkili rolü tekrar sorar.',
      };
    case 'NEXT_SCREEN':
      return {
        guideLabel: 'Doğru ekran rehberini aç',
        jobType: 'SCREEN_MENU_GUIDE',
        guideLevel: 'SHORT',
        reason: 'İlgili ekrana yönlendirmeyi açıklar.',
        askLabel: 'Hedef ekranı sor',
        askQuery: 'hangi ekrana gitmeliyim',
        askReason: 'Bir sonraki ekranı tekrar sorar.',
      };
    case 'NEXT_STEP':
    case 'FIRST_CONTROL':
    case 'SAFE_NEXT_STEP':
    case 'MISSING_DATA':
    default:
      return {
        guideLabel: 'Sıralı kontrol rehberini aç',
        jobType: 'ASSIGNMENT_READINESS_GUIDE',
        guideLevel: 'STEP_BY_STEP',
        reason: 'İlgili kaydı konuya özel kontrollerle okumaya yardım eder.',
        askLabel: 'Eksik veriyi sor',
        askQuery: 'bu kayıtta ne eksik',
        askReason: 'Eksik veri kontrolünü tekrar sorar.',
      };
  }
}

export function filterWorkflowGenericChips(chips, { activeTopic = '', questionType = '' } = {}) {
  const workflowTopic = Boolean(String(activeTopic || questionType || '') !== '');
  if (!workflowTopic) return uniqueStrings(chips);
  return uniqueStrings(chips).filter((chip) => {
    const text = normalizeLooseText(chip);
    if (/^bunu sor(?:\s*[:：]|\b)/.test(text)) return false;
    return !WORKFLOW_GENERIC_CHIP_BLOCKLIST.some((blocked) => normalizeText(chip).includes(normalizeText(blocked)));
  });
}
