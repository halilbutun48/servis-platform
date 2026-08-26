function normalizeRoleKey(role) {
  const key = String(role || '').trim().toUpperCase();
  if (key === 'DRIVER') return 'DRIVER';
  if (key === 'PERSONEL') return 'PERSONEL';
  if (key === 'PARENT') return 'PARENT';
  if (key === 'COMPANY') return 'COMPANY';
  if (key === 'SCHOOL') return 'SCHOOL';
  if (key === 'ROOM') return 'ROOM';
  if (key === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (key === 'OPERATION') return 'OPERATION';
  if (key === 'ORGANIZATION') return 'COMPANY';
  return 'PERSONEL';
}

function normalizeCompanyKind(companyKind) {
  return String(companyKind || '').trim().toUpperCase();
}

const LOGIN_COPY = Object.freeze({
  identifierLabel: 'Kullanıcı kodu',
  identifierPlaceholder: 'Örn. ABCD1234',
  helper: 'Size verilen sürücü, personel veya veli kodunu girin. PIN veya şifre ile doğrulama tamamlanır; girişten sonra rolünüze göre uygun ekran açılır.',
  buttonText: 'Giriş yap',
});

const ROLE_SURFACES = Object.freeze({
  DRIVER: {
    roleLabel: 'Sürücü',
    mode: 'driver',
    title: 'Sürücü',
    subtitle: 'Sürücü akışı ve hızlı operasyon burada görünür.',
    emptyTitle: 'Bugün sürücü için açık görev yok.',
    emptyText: 'Sürücü akışı, canlı vardiya ve görev geldiğinde görünür.',
    note: 'Sürücü akışı canlı görev ve GPS ile ilerler.',
  },
  PERSONEL: {
    roleLabel: 'Personel',
    mode: 'live',
    title: 'Personel Canlı Takip',
    subtitle: 'Bağlı servisinizin canlı durumu, sıradaki durak ve ETA bu ekranda görünür.',
    emptyTitle: 'Bugün size atanmış servis bulunmuyor.',
    emptyText: 'Canlı personel takip akışı, bağlı ve aktif servis olduğunda görünür.',
    actionLabel: 'Bugün servisi kullanmayacağım',
    actionNote: 'Bu bildirim operasyon ekibine düşer ve kayıt altına alınır.',
    note: 'Canlı servis takibi personel için burada toplanır.',
  },
  PARENT: {
    roleLabel: 'Veli',
    mode: 'live',
    title: 'Veli Canlı Takip',
    subtitle: 'Bağlı öğrencinizin servisi, sıradaki durak ve ETA bu ekranda görünür.',
    emptyTitle: 'Bugün öğrenciniz için aktif servis bulunmuyor.',
    emptyText: 'Canlı veli takip akışı, bağlı öğrenci için aktif servis olduğunda görünür.',
    actionLabel: 'Bugün öğrencim servise binmeyecek',
    actionNote: 'Bu bildirim operasyon ekibine düşer ve kayıt altına alınır.',
    note: 'Canlı takip veli için burada özetlenir.',
  },
  COMPANY: {
    roleLabel: 'Hizmet Alan Firma',
    mode: 'overview',
    title: 'Hizmet Alan Firma Özeti',
    subtitle: 'Firma servislerinin kısa özeti ve canlı durum burada görünür.',
    emptyTitle: 'Bugün firma için canlı özet bulunmuyor.',
    emptyText: 'Canlı firma özeti aktif veri geldiğinde görünür.',
    actionLabel: 'Yenile',
    actionNote: 'Ayrıntılı yönetim web panelinde açılır.',
    note: 'Ağır yönetim web panelinde, mobilde hafif özet görünür.',
  },
  SCHOOL: {
    roleLabel: 'Okul',
    mode: 'overview',
    title: 'Okul Özeti',
    subtitle: 'Okul kapsamındaki servislerin kısa özeti ve canlı durum burada görünür.',
    emptyTitle: 'Bugün okul için canlı özet bulunmuyor.',
    emptyText: 'Canlı okul özeti aktif veri geldiğinde görünür.',
    actionLabel: 'Yenile',
    actionNote: 'Ayrıntılı yönetim web panelinde açılır.',
    note: 'Okul tarafı mobilde hafif özet olarak açılır.',
  },
  ROOM: {
    roleLabel: 'Turizm/Taşımacılık Firması',
    mode: 'overview',
    title: 'Taşımacılık Firması Özeti',
    subtitle: 'Taşımacılık Firması operasyonunun kısa özeti ve canlı durum burada görünür.',
    emptyTitle: 'Bugün taşımacılık firması için canlı özet bulunmuyor.',
    emptyText: 'Canlı taşımacılık firması özeti aktif veri geldiğinde görünür.',
    actionLabel: 'Yenile',
    actionNote: 'Ayrıntılı yönetim web panelinde açılır.',
    note: 'Taşımacılık Firması operasyonu mobilde hafif özet olarak açılır.',
  },
  SUPER_ADMIN: {
    roleLabel: 'Super Admin',
    mode: 'overview',
    title: 'Denetim Özeti',
    subtitle: 'Denetim ve çapraz operasyon görünümü burada toplanır.',
    emptyTitle: 'Bugün denetim özeti bulunmuyor.',
    emptyText: 'Canlı denetim özeti aktif veri geldiğinde görünür.',
    actionLabel: 'Yenile',
    actionNote: 'Ayrıntılı yönetim web panelinde açılır.',
    note: 'Denetim görünümü mobilde hafif özet olarak açılır.',
  },
  OPERATION: {
    roleLabel: 'Operasyon',
    mode: 'overview',
    title: 'Operasyon Özeti',
    subtitle: 'Operasyon akışının kısa özeti ve canlı durum burada görünür.',
    emptyTitle: 'Bugün operasyon özeti bulunmuyor.',
    emptyText: 'Canlı operasyon özeti aktif veri geldiğinde görünür.',
    actionLabel: 'Yenile',
    actionNote: 'Ayrıntılı yönetim web panelinde açılır.',
    note: 'Operasyon paneli mobilde hafif özet olarak açılır.',
  },
});

const PREMIUM_ROLE_SURFACES = Object.freeze({
  PERSONEL: {
    roleLabel: 'Personel',
    title: 'Bugünkü servis',
    subtitle: 'Servis akışı ve kritik bilgiler tek yerde.',
    legacySubtitle: 'Personel canlı takip',
    routePreviewTitle: 'Temsilî rota özeti',
    routePreviewSubtitle: 'Gerçek yol ve trafik için navigasyonu açın.',
    notificationTitle: 'Bildirimler',
    notificationSubtitle: 'Güncel bildirimler burada toplanır.',
    serviceDetailsTitle: 'Servis detayları',
    serviceDetailsSubtitle: 'Personel canlı takip',
    selectionTitle: 'Servis seçimi',
    selectionSubtitle: 'Bağlı servisler burada görünür.',
    advancedTitle: 'Gelişmiş durum',
    advancedSubtitle: 'Kısa operasyon özeti',
    primaryActionLabel: 'Canlı takip',
    secondaryActionLabel: 'Bugün servisi kullanmayacağım',
    secondaryActionAltLabel: 'Farklı duraktan bineceğim',
    etaLabel: 'Tahmini geliş',
    boardingLabel: 'Biniş durağı',
    serviceLabel: 'Araç / servis bilgisi',
    gpsLabel: 'GPS güncelleme',
    emptyTitle: 'Bugün size atanmış servis bulunmuyor.',
    emptyText: 'Canlı servis akışı bağlı ve aktif görevle görünür.',
  },
  PARENT: {
    roleLabel: 'Veli',
    title: 'Öğrencimin servisi',
    subtitle: 'Servis akışı ve kritik bilgiler tek yerde.',
    legacySubtitle: 'Veli canlı takip',
    routePreviewTitle: 'Temsilî rota özeti',
    routePreviewSubtitle: 'Gerçek yol ve trafik için navigasyonu açın.',
    notificationTitle: 'Bildirimler',
    notificationSubtitle: 'Güncel bildirimler burada toplanır.',
    serviceDetailsTitle: 'Öğrenci / servis detayları',
    serviceDetailsSubtitle: 'Veli canlı takip',
    selectionTitle: 'Çocuk seçimi',
    selectionSubtitle: 'Bağlı öğrenciler burada görünür.',
    advancedTitle: 'Gelişmiş durum',
    advancedSubtitle: 'Kısa operasyon özeti',
    primaryActionLabel: 'Canlı takip',
    secondaryActionLabel: 'Bugün öğrencim servise binmeyecek',
    secondaryActionAltLabel: '',
    etaLabel: 'Tahmini geliş',
    boardingLabel: 'Öğrenci',
    serviceLabel: 'Araç / servis bilgisi',
    gpsLabel: 'GPS güncelleme',
    emptyTitle: 'Bugün öğrenciniz için aktif servis bulunmuyor.',
    emptyText: 'Canlı veli akışı bağlı öğrenci için görünür.',
  },
  COMPANY: {
    roleLabel: 'Firma',
    mode: 'overview',
    title: 'Firma özeti',
    subtitle: 'Bugünkü servislerin genel durumu',
    webPanelNote: 'Detaylı yönetim için web panelden devam edin.',
    primaryActionLabel: 'Web paneli aç',
    notificationTitle: 'Bildirimler',
    notificationSubtitle: 'Güncel uyarılar burada toplanır.',
    advancedTitle: 'Gelişmiş durum',
    advancedSubtitle: 'Detaylı yönetim web panelde açılır.',
    statLabels: ['Bugünkü aktif servisler', 'Canlı izlenen araçlar', 'Dikkat gerektiren durum'],
    note: 'Mobilde yalnızca hafif özet görünür.',
  },
  SCHOOL: {
    roleLabel: 'Okul',
    mode: 'overview',
    title: 'Okul özeti',
    subtitle: 'Öğrenci servislerinin genel durumu',
    webPanelNote: 'Detaylı yönetim için web panelden devam edin.',
    primaryActionLabel: 'Web paneli aç',
    notificationTitle: 'Bildirimler',
    notificationSubtitle: 'Güncel uyarılar burada toplanır.',
    advancedTitle: 'Gelişmiş durum',
    advancedSubtitle: 'Detaylı yönetim web panelde açılır.',
    statLabels: ['Bugünkü servisler', 'Canlı takip', 'Bildirimler'],
    note: 'Mobilde yalnızca hafif özet görünür.',
  },
  ROOM: {
    roleLabel: 'Taşımacılık Firması',
    mode: 'overview',
    title: 'Taşımacılık Firması özeti',
    subtitle: 'Servis operasyonunun genel görünümü',
    webPanelNote: 'Detaylı yönetim için web panelden devam edin.',
    primaryActionLabel: 'Web paneli aç',
    notificationTitle: 'Bildirimler',
    notificationSubtitle: 'Güncel uyarılar burada toplanır.',
    advancedTitle: 'Gelişmiş durum',
    advancedSubtitle: 'Detaylı yönetim web panelde açılır.',
    statLabels: ['Aktif araç', 'Bugünkü görev', 'Tamamlanan servis', 'GPS durumu'],
    note: 'Mobilde yalnızca hafif özet görünür.',
  },
  OPERATION: {
    roleLabel: 'Operasyon',
    mode: 'overview',
    title: 'Operasyon özeti',
    subtitle: 'Servis operasyonunun genel görünümü',
    webPanelNote: 'Detaylı yönetim için web panelden devam edin.',
    primaryActionLabel: 'Web paneli aç',
    notificationTitle: 'Bildirimler',
    notificationSubtitle: 'Güncel uyarılar burada toplanır.',
    advancedTitle: 'Gelişmiş durum',
    advancedSubtitle: 'Detaylı yönetim web panelde açılır.',
    statLabels: ['Aktif araç', 'Bugünkü görev', 'Tamamlanan servis', 'GPS durumu'],
    note: 'Mobilde yalnızca hafif özet görünür.',
  },
  SUPER_ADMIN: {
    roleLabel: 'Yönetim',
    mode: 'overview',
    title: 'Yönetim özeti',
    subtitle: 'Servis operasyonunun genel görünümü',
    webPanelNote: 'Detaylı yönetim için web panelden devam edin.',
    primaryActionLabel: 'Web paneli aç',
    notificationTitle: 'Bildirimler',
    notificationSubtitle: 'Güncel uyarılar burada toplanır.',
    advancedTitle: 'Gelişmiş durum',
    advancedSubtitle: 'Detaylı yönetim web panelde açılır.',
    statLabels: ['Aktif servisler', 'Canlı araçlar', 'Bildirimler'],
    note: 'Mobilde yalnızca hafif özet görünür.',
  },
});

export function getMobileLoginCopy() {
  return LOGIN_COPY;
}

export function resolveMobileRoleKey(role, companyKind = '') {
  const key = normalizeRoleKey(role);
  if (key === 'COMPANY' && normalizeCompanyKind(companyKind) === 'SCHOOL') return 'SCHOOL';
  return key;
}

export function resolveMobileRoleSurface(role, companyKind = '') {
  const key = resolveMobileRoleKey(role, companyKind);
  return {
    key,
    ...(ROLE_SURFACES[key] || ROLE_SURFACES.PERSONEL),
  };
}

export function resolveMobileRolePremiumSurface(role, companyKind = '') {
  const key = resolveMobileRoleKey(role, companyKind);
  const premium = PREMIUM_ROLE_SURFACES[key];
  if (premium) {
    return {
      key,
      ...(premium || PREMIUM_ROLE_SURFACES.PERSONEL),
    };
  }

  return resolveMobileRoleSurface(role, companyKind);
}
