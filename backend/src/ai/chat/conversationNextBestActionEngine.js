import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  ensureVisibleSentence,
  isPlanningCenterPath,
  looksLikeCompanyPlanningSurfaceText,
  looksLikeNextBestActionQuestion as looksLikeNextBestActionQuestionShared,
  normalizeLooseText,
  normalizeVisibleReplyFragment,
  prettyRoleName,
  prettyScreenLabel,
} from './conversationTaskStateShared.js';

export const NEXT_BEST_ACTION_ENGINE_VERSION = 'COPILOT-NEXT-BEST-ACTION-ENGINE-01';

export const NEXT_BEST_ACTION_RELEVANT_QUESTION_TYPES = Object.freeze(['NEXT_BEST_ACTION']);

export const NEXT_BEST_ACTION_TRIGGER_PHRASES = Object.freeze([
  'sıradaki en doğru güvenli adım',
  'siradaki en dogru guvenli adim',
  'önce yapılacak güvenli kontrol',
  'once yapilacak guvenli kontrol',
  'en güvenli sonraki adım',
  'en guvenli sonraki adim',
  'sıradaki güvenli adım',
  'siradaki guvenli adim',
  'hangi güvenli kontrol',
  'hangi guvenli kontrol',
  'hangi adımı önce kontrol etmeliyim',
  'hangi adimi once kontrol etmeliyim',
  'hangi kaydı önce doğrulamalıyım',
  'hangi kaydi once dogrulamaliyim',
]);

export const NEXT_BEST_ACTION_GUARD_REQUIREMENTS = Object.freeze([
  'sadece okur',
  'yazma yok',
  'uygulama yok',
  'insan onayı',
  'önce güvenli kontrol',
  'kayıt ve sinyal okuması',
  'işlem emri değil',
  'sahte başarı yok',
]);

export const NEXT_BEST_ACTION_NO_WRITE_ACTIONS = Object.freeze([
  'yaptım',
  'oluşturdum',
  'başlattım',
  'gönderdim',
  'kabul ettim',
  'uyguladım',
  'atadım',
  'sildim',
  'güncelledim',
  'kaydettim',
  'açtım',
  'kapattım',
  'değiştirdim',
  'ekledim',
  'çıkardım',
  'devreye aldım',
  'otomatik yaptım',
  'route apply',
  'dispatch apply',
  'db write',
  'tool execution',
]);

export const NEXT_BEST_ACTION_TERMINOLOGY = Object.freeze([
  'sıradaki en doğru güvenli adım',
  'önce yapılacak güvenli kontrol',
  'insan onayı gerekir',
  'seçili kayıt',
  'eksik sinyal',
  'güvenli kontrol',
  'Planlama Merkezi',
  'Vardiyalar',
  'Konum sinyali',
  'Son konum bilgisi',
  'Riskli cihaz',
  'Açık sorun',
  'Şirket Operasyon Panosu',
  'Şirket Vardiyalar',
  'Şirket Sözleşmeler',
  'Oda Operasyon Panosu',
  'Oda Vardiyalar',
  'Oda Harita / Araçlar',
  'Eksik atama',
  'Güncel olmayan konum bilgisi',
  'Eksik rota / durak',
  'Gecikme ihtimali',
  'Kapasite belirsizliği',
  'Vardiya saati belirsizliği',
  'Atanmış servis yokluğu',
  'Araç / sürücü eşleşmesi',
  'Canlı takip güvenilirliği',
  'Yetki / veri kapsamı',
  'Eksik adres',
  'Sözleşme kapsamı',
  'Plan uygulama onayı',
  'Başlatma öncesi kontrol',
  'Sıradaki durak',
]);

export const NEXT_BEST_ACTION_PRIORITIZATION_ASSERTIONS = Object.freeze([
  'eksik atama',
  'güncel olmayan konum bilgisi',
  'eksik rota / durak',
  'gecikme ihtimali',
  'kapasite belirsizliği',
  'vardiya saati belirsizliği',
  'atanmış servis yokluğu',
  'araç / sürücü eşleşmesi',
  'canlı takip güvenilirliği',
  'yetki / veri kapsamı',
  'eksik adres',
  'sözleşme kapsamı',
  'plan uygulama onayı',
  'başlatma öncesi kontrol',
  'sıradaki durak',
]);

export const NEXT_BEST_ACTION_SINGLE_ACTION_ASSERTIONS = Object.freeze([
  'tek güvenli adım',
  'tek kontrol',
  'tek onay',
  'tek rota',
  'tek durak',
  'tek vardiya',
  'tek servis',
  'tek eşleşme',
  'tek canlı takip',
  'tek yetki sınırı',
]);

export const NEXT_BEST_ACTION_REGRESSION_BOUNDARIES = Object.freeze([
  'workflow reasoning ayrı',
  'plan review ayrı',
  'risk scoring ayrı',
  'root cause ayrı',
  'smart diagnostic ayrı',
  'dynamic question ayrı',
  'clarifying question ayrı',
  'operation health ayrı',
  'screen analyzer ayrı',
]);

export const NEXT_BEST_ACTION_HEALTH_SIGNAL_ASSERTIONS = Object.freeze([
  'summary',
  'reasoningLead',
  'nextBestAction',
  'safestNextStep',
  'selectedSummaryText',
  'selectedRecordStatus',
  'blockers',
  'missingData',
  'evidence',
  'healthSignals',
  'chips',
  'reply',
]);

export const NEXT_BEST_ACTION_ROLE_COVERAGE = Object.freeze([
  'COMPANY',
  'ORGANIZATION',
  'SCHOOL',
  'ROOM',
  'DRIVER',
  'PERSONEL',
  'PARENT',
  'SUPER_ADMIN',
]);

function profile(key, label, config) {
  return Object.freeze({ key, label, ...config });
}

export const NEXT_BEST_ACTION_SURFACE_PROFILES = Object.freeze([
  profile('COMPANY_PLAN_CENTER', 'Planlama Merkezi', {
    paths: ['/company', '/company/shifts', '/company/agreements'],
    roleKeys: ['COMPANY'],
    visibleNeedles: ['planlama merkezi', 'yeni plan oluştur', 'rehberi başlat', 'vardiya', 'teklif', 'sözleşme'],
    reviewLead: 'Planlama Merkezi için önce planı güvenli taraftan doğruluyorum.',
    summaryFallback: 'Planlama Merkezi yeni işi kurma ve planlama için kullanılır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: paket, tarih, saat, servis yönü ve kapsamı doğrula.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: personel, adres / konum ve durak satırlarını gözden geçir.',
    compareHint: 'Planlama Merkezi işlem kararı değil, güvenli hazırlık yüzeyidir; Vardiyalar ekranında takip ayrı kalır.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Paket / tarih / saat', 'Personel satırı', 'Adres / konum', 'İnsan onayı'],
    healthSignals: ['paket', 'tarih', 'saat', 'servis yönü', 'kapsam'],
  }),
  profile('COMPANY_DASHBOARD_OPERATIONS', 'Şirket Operasyon Panosu', {
    paths: ['/company/dashboard', '/company/operations'],
    roleKeys: ['COMPANY'],
    visibleNeedles: ['operasyon panosu', 'dashboard', 'eksik atama', 'plan onayı', 'konum bilgisi'],
    reviewLead: 'Şirket operasyon panosunda önce eksik atama ve güncel olmayan konum bilgisini okuyorum.',
    summaryFallback: 'Şirket operasyon panosu canlı operasyon ve öncelik takibi için kullanılır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: eksik atamayı ve plan uygulama onayını kontrol et.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: güncel olmayan konum bilgisi ile sıradaki durak satırını birlikte aç.',
    compareHint: 'Şirket operasyon panosu işlem kararı değil, güvenli hazırlık yüzeyidir.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Eksik atama', 'Güncel olmayan konum', 'Plan onayı', 'İnsan onayı'],
    healthSignals: ['eksik atama', 'güncel olmayan konum bilgisi', 'plan uygulama onayı', 'başlatma öncesi kontrol'],
  }),
  profile('COMPANY_SHIFTS', 'Şirket Vardiyalar', {
    paths: ['/company/shifts'],
    roleKeys: ['COMPANY'],
    visibleNeedles: ['vardiya', 'atama', 'saat', 'sıradaki durak'],
    reviewLead: 'Şirket vardiyalarında önce saat ve atama sinyalini okuyorum.',
    summaryFallback: 'Şirket vardiyalarında plan uygulaması ve sıradaki durak birlikte okunur.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: vardiya saati belirsizliğini ve atanmış servis yokluğunu netleştir.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: sıradaki durak ve vardiya saatini birlikte gözden geçir.',
    compareHint: 'Şirket vardiyalarında canlı takip değil, öncelik ve atama kontrolü yapılır.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Vardiya saati', 'Atanmış servis', 'Sıradaki durak', 'Başlatma öncesi kontrol'],
    healthSignals: ['vardiya saati belirsizliği', 'atanmış servis yokluğu', 'sıradaki durak', 'başlatma öncesi kontrol'],
  }),
  profile('COMPANY_AGREEMENTS', 'Şirket Sözleşmeler', {
    paths: ['/company/agreements'],
    roleKeys: ['COMPANY'],
    visibleNeedles: ['sözleşme', 'kapsam', 'onay', 'yetki'],
    reviewLead: 'Şirket sözleşmelerinde önce kapsam ve onay sinyalini okuyorum.',
    summaryFallback: 'Şirket sözleşmeleri plan uygulama ve yetki sınırı için kullanılır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: sözleşme kapsamı ile yetki / veri kapsamını karşılaştır.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: plan uygulama onayını ve eksik adres satırını doğrula.',
    compareHint: 'Şirket sözleşmeleri uygulama kararı değil, kapsam kontrolü yüzeyidir.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Sözleşme kapsamı', 'Yetki / veri', 'Eksik adres', 'Plan onayı'],
    healthSignals: ['sözleşme kapsamı', 'yetki / veri kapsamı', 'eksik adres', 'plan uygulama onayı'],
  }),
  profile('ORGANIZATION_PLAN_CENTER', 'Organizasyon Planlama', {
    paths: ['/organization', '/organization/shifts', '/organization/agreements'],
    roleKeys: ['ORGANIZATION'],
    visibleNeedles: ['organizasyon', 'planlama', 'vardiya', 'sözleşme'],
    reviewLead: 'Organizasyon planı için önce güvenli kontrolü okuyorum.',
    summaryFallback: 'Organizasyon tarafında plan, konum ve onay birlikte okunur.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: plan kapsamını, tarih / saat uyumunu ve vardiya bağını doğrula.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: konum, personel ve rota önizlemesini birlikte kontrol et.',
    compareHint: 'Bu yüzey plan hazırlığı içindir; Vardiyalar ekranında takip ayrı kalır ve uygulama için insan onayı gerekir.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Plan kapsamı', 'Konum doğrulama', 'Rota önizleme', 'İnsan onayı'],
    healthSignals: ['plan kapsamı', 'tarih', 'saat', 'vardiya bağı'],
  }),
  profile('SCHOOL_PLAN_CENTER', 'Okul Planlama', {
    paths: ['/school', '/school/shifts', '/school/agreements'],
    roleKeys: ['SCHOOL'],
    visibleNeedles: ['okul', 'planlama', 'vardiya', 'servis'],
    reviewLead: 'Okul tarafında önce güvenli hazırlık sinyalini okuyorum.',
    summaryFallback: 'Okul yüzeyinde servis planı ve onay birlikte okunur.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: servis planını, katılımcı etkisini ve onay noktasını doğrula.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: yetkili okul görünümündeki eksik bilgiyi aç.',
    compareHint: 'Okul yüzeyi hazırlık ve yetki sınırı içindir.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Servis planı', 'Katılımcı etkisi', 'Yetkili görünüm', 'İnsan onayı'],
    healthSignals: ['servis planı', 'yetki', 'onay', 'eksik bilgi'],
  }),
  profile('ROOM_OPERATION_HEALTH', 'Oda Operasyon Sağlığı', {
    paths: ['/room/operation-health', '/room/shifts', '/room/map', '/room/vehicles'],
    roleKeys: ['ROOM'],
    visibleNeedles: ['operasyon sağlığı', 'canlılık', 'riskli cihaz', 'açık sorun', 'konum sinyali'],
    reviewLead: 'Oda operasyonu için önce canlı sinyal ve riskleri okuyorum.',
    summaryFallback: 'Oda operasyon sağlığı canlılık ve risk kontrolü için kullanılır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: riskli cihazı ve konum sinyali güncel değil / çevrim dışı satırını aç.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: açık sorunları sırala ve aktif sürücü satırını kontrol et.',
    compareHint: 'Oda operasyonu tek başına karar yüzeyi değildir; önce sinyal okunur.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Riskli cihaz', 'Konum sinyali', 'Açık sorunlar', 'Aktif sürücü'],
    healthSignals: ['riskli cihaz', 'konum sinyali', 'açık sorun', 'aktif sürücü'],
  }),
  profile('ROOM_DASHBOARD_OPERATIONS', 'Oda Operasyon Panosu', {
    paths: ['/room/dashboard', '/room/operations'],
    roleKeys: ['ROOM'],
    visibleNeedles: ['oda operasyon', 'dashboard', 'canlı takip', 'gecikme', 'konum'],
    reviewLead: 'Oda operasyon panosunda önce canlı takip ve gecikme sinyalini okuyorum.',
    summaryFallback: 'Oda operasyon panosu canlı operasyon ve gecikme kontrolü için kullanılır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: canlı takip güvenilirliğini ve gecikme ihtimalini kontrol et.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: güncel olmayan konum bilgisi ile açık sorunları birlikte aç.',
    compareHint: 'Oda operasyon panosu karar yüzeyi değil, canlı sinyal yüzeyidir.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Canlı takip', 'Gecikme ihtimali', 'Konum sinyali', 'Açık sorun'],
    healthSignals: ['canlı takip güvenilirliği', 'gecikme ihtimali', 'güncel olmayan konum bilgisi', 'açık sorun'],
  }),
  profile('ROOM_SHIFTS', 'Oda Vardiyalar', {
    paths: ['/room/shifts'],
    roleKeys: ['ROOM'],
    visibleNeedles: ['oda vardiya', 'atama', 'kapasite', 'servis'],
    reviewLead: 'Oda vardiyalarında önce kapasite ve atama sinyalini okuyorum.',
    summaryFallback: 'Oda vardiyaları canlı planlama ve servis kapasitesi için kullanılır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: vardiya saati belirsizliğini ve kapasite belirsizliğini netleştir.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: atanmış servis yokluğu ile sıradaki durak bilgisini birlikte aç.',
    compareHint: 'Oda vardiyaları operasyon dağıtımı içindir; tek adımda netleştirme gerekir.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Vardiya saati', 'Kapasite', 'Atanmış servis', 'Sıradaki durak'],
    healthSignals: ['vardiya saati belirsizliği', 'kapasite belirsizliği', 'atanmış servis yokluğu', 'sıradaki durak'],
  }),
  profile('ROOM_MAP_VEHICLES', 'Oda Harita / Araçlar', {
    paths: ['/room/map', '/room/vehicles'],
    roleKeys: ['ROOM'],
    visibleNeedles: ['harita', 'araç', 'sürücü', 'konum', 'rota'],
    reviewLead: 'Oda harita / araçlar görünümünde önce rota ve eşleşme sinyalini okuyorum.',
    summaryFallback: 'Oda harita / araçlar görünümü eşleşme ve konum kontrolü içindir.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: araç / sürücü eşleşmesini ve eksik rota / durak bilgisini doğrula.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: güncel olmayan konum bilgisi ile sıradaki durağı birlikte kontrol et.',
    compareHint: 'Oda harita / araçlar görünümü canlı takip için kullanılır; yazma açmaz.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Araç / sürücü', 'Sıradaki durak', 'Konum bilgisi', 'Rota'],
    healthSignals: ['araç / sürücü eşleşmesi', 'eksik rota / durak', 'güncel olmayan konum bilgisi', 'sıradaki durak'],
  }),
  profile('DRIVER_ROUTE', 'Sürücü Rotası', {
    paths: ['/driver', '/driver/today', '/driver/route', '/driver/map'],
    roleKeys: ['DRIVER'],
    visibleNeedles: ['rota', 'durak', 'telefon gps', 'son konum', 'sürücü'],
    reviewLead: 'Sürücü rotasında önce en güvenli kontrolü okuyorum.',
    summaryFallback: 'Sürücü rotası günlük akışı ve sıradaki durak için kullanılır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: aktif rota, son konum ve sıradaki durak bilgisini doğrula.',
    safestNextStep: "Önce yapılacak güvenli kontrol: sürücünün telefon GPS'i ve son konum bilgisini birlikte kontrol et.",
    compareHint: 'Sürücü yüzeyi canlı takip içindir; yazma ve atama açmaz.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Aktif rota', 'Son konum', 'Sıradaki durak', 'Telefon GPS'],
    healthSignals: ['aktif rota', 'son konum', 'sıradaki durak', 'telefon gps'],
  }),
  profile('PERSONEL_LIVE', 'Personel Canlı', {
    paths: ['/personel/live', '/personel/my'],
    roleKeys: ['PERSONEL'],
    visibleNeedles: ['personel', 'servis durumu', 'kvkk', 'canlı'],
    reviewLead: 'Personel canlı görünümünde önce yetkili sinyali okuyorum.',
    summaryFallback: 'Personel canlı yüzeyi yetkili servis takibi içindir.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: yetkili servis görünümünü ve KVKK kapsamını doğrula.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: seçili servis kaydını ve son durum satırını aç.',
    compareHint: 'Personel yüzeyi kişisel veri sınırıyla çalışır; paylaşım genişletmez.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Servis durumu', 'KVKK kapsamı', 'Seçili servis', 'Son durum'],
    healthSignals: ['servis durumu', 'kvkk', 'seçili servis', 'son durum'],
  }),
  profile('PARENT_LIVE', 'Veli Canlı', {
    paths: ['/parent/live'],
    roleKeys: ['PARENT'],
    visibleNeedles: ['veli', 'öğrenci servisi', 'çocuğum', 'canlı'],
    reviewLead: 'Veli görünümünde önce yetkili servis sinyalini okuyorum.',
    summaryFallback: 'Veli canlı yüzeyi öğrencinin servisini güvenli takip için kullanılır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: yetkili öğrenci servis görünümünü aç ve canlı durumu doğrula.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: tahmini varış bilgisi ve araç bağlantısını birlikte kontrol et.',
    compareHint: 'Veli yüzeyi yalnız yetkili görünümle okunur.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Yetkili görünüm', 'Canlı servis', 'Tahmini varış', 'Araç bağlantısı'],
    healthSignals: ['yetkili görünüm', 'canlı servis', 'tahmini varış', 'araç bağlantısı'],
  }),
  profile('SUPERADMIN_OPERATIONS', 'Süper Yönetici Operasyonları', {
    paths: ['/superadmin/operations', '/superadmin/observability', '/superadmin/trust-quality'],
    roleKeys: ['SUPER_ADMIN'],
    visibleNeedles: ['operasyon', 'audit', 'kanıt', 'risk', 'canlılık'],
    reviewLead: 'Süper yönetici operasyonlarında önce sistem sinyalini okuyorum.',
    summaryFallback: 'Süper yönetici yüzeyi denetim ve canlı sinyal okuması içindir.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: sistem durumu, açık riskler ve audit / kanıt satırlarını kontrol et.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: canlılık, izin ve oturum sinyallerini birlikte oku.',
    compareHint: 'Süper yönetici yüzeyi denetim içindir; doğrudan işlem yüzeyi değildir.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Sistem durumu', 'Açık riskler', 'Audit / kanıt', 'Oturum sinyali'],
    healthSignals: ['sistem durumu', 'açık riskler', 'audit', 'kanıt'],
  }),
  profile('GENERIC', 'Güvenli Kontrol', {
    paths: [],
    roleKeys: [],
    visibleNeedles: [],
    reviewLead: 'Önce seçili kayıt ve eksik sinyali birlikte okuyorum.',
    summaryFallback: 'Sıradaki güvenli kontrol, seçili kayıt ve eksik sinyali okumaktır.',
    nextBestAction: 'Sıradaki en doğru güvenli adım: seçili kayıt ve eksik sinyali birlikte kontrol et.',
    safestNextStep: 'Önce yapılacak güvenli kontrol: ilgili ekranı açıp aynı kaydı doğrula.',
    compareHint: 'Genel yüzeyde işlem emri değil, güvenli kontrol veririm.',
    blocker: 'İnsan onayı gerekir.',
    chips: ['Seçili kayıt', 'Eksik sinyal', 'İlgili ekran', 'İnsan onayı'],
    healthSignals: ['seçili kayıt', 'eksik sinyal', 'ilgili ekran'],
  }),
]);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function textHas(text = '', needles = []) {
  const haystack = normalizeText(text);
  return (Array.isArray(needles) ? needles : []).some((needle) => haystack.includes(normalizeText(needle)));
}

function firstText(...values) {
  return firstNonEmpty(...values);
}

function uniqueTextList(values = []) {
  return uniqueStrings((Array.isArray(values) ? values : []).map((value) => firstText(value, '')).filter(Boolean));
}

function selectedRows(screenContext, key) {
  return (Array.isArray(screenContext?.[key]) ? screenContext[key] : []).map((row) => ({
    label: firstText(row?.label, row?.key, row?.title, row?.name, ''),
    value: firstText(row?.value, row?.text, row?.summary, '-'),
  })).filter((row) => row.label);
}

function selectedStatusText(screenContext) {
  return firstText(
    screenContext?.selectedRecordStatus,
    selectedRows(screenContext, 'selectedFields')[0]?.value,
    selectedRows(screenContext, 'selectedBadges')[0]?.value,
    '',
  );
}

function selectedSummaryValue(screenContext) {
  return firstText(
    screenContext?.selectedSummary,
    screenContext?.selectedLabel,
    '',
  );
}

function profileForRole(roleKey = '', screenPath = '', screenLabel = '', screenText = '') {
  const role = normalizeText(roleKey);
  const path = normalizeText(screenPath);
  const text = `${normalizeText(screenLabel)} • ${normalizeText(screenText)}`;

  if (path.includes('/company/dashboard') || path.includes('/company/operations') || textHas(text, ['şirket operasyon panosu', 'şirket dashboard', 'company dashboard', 'company operations'])) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'COMPANY_DASHBOARD_OPERATIONS');
  }
  if (path.includes('/company/shifts') || textHas(text, ['şirket vardiyalar', 'company shifts'])) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'COMPANY_SHIFTS');
  }
  if (path.includes('/company/agreements') || textHas(text, ['şirket sözleşmeler', 'company agreements'])) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'COMPANY_AGREEMENTS');
  }
  if (path.includes('/room/operation-health') || textHas(text, ['operasyon sağlığı', 'canlılık', 'riskli cihaz', 'açık sorun'])) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'ROOM_OPERATION_HEALTH');
  }
  if (path.includes('/room/dashboard') || path.includes('/room/operations') || textHas(text, ['oda operasyon panosu', 'oda dashboard', 'room dashboard', 'room operations'])) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'ROOM_DASHBOARD_OPERATIONS');
  }
  if (path.includes('/room/shifts') || textHas(text, ['oda vardiyalar', 'room shifts'])) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'ROOM_SHIFTS');
  }
  if (path.includes('/room/map') || path.includes('/room/vehicles') || textHas(text, ['oda harita', 'oda araçlar', 'room map', 'room vehicles'])) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'ROOM_MAP_VEHICLES');
  }
  if (path.includes('/driver/')) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'DRIVER_ROUTE');
  }
  if (path.includes('/personel/live') || path.includes('/personel/my')) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'PERSONEL_LIVE');
  }
  if (path.includes('/parent/live')) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'PARENT_LIVE');
  }
  if (path.includes('/superadmin/')) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'SUPERADMIN_OPERATIONS');
  }
  if (path.includes('/organization') || role === 'organization') {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'ORGANIZATION_PLAN_CENTER');
  }
  if (path.includes('/school') || role === 'school') {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'SCHOOL_PLAN_CENTER');
  }
  if (path.includes('/company') || role === 'company' || isPlanningCenterPath(path) || looksLikeCompanyPlanningSurfaceText(`${screenLabel} ${screenText}`)) {
    return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'COMPANY_PLAN_CENTER');
  }
  return NEXT_BEST_ACTION_SURFACE_PROFILES.find((item) => item.key === 'GENERIC');
}

function normalizeSafeControl(text) {
  return normalizeVisibleReplyFragment(firstText(text, ''))
    .replace(/\bnext best action\b/gi, 'sıradaki en doğru güvenli adım')
    .replace(/\bsıradaki doğru işlem\b/gi, 'sıradaki en doğru güvenli adım')
    .replace(/\bsıradaki doğru adım\b/gi, 'sıradaki en doğru güvenli adım')
    .replace(/\bsonraki adımı\b/gi, 'öndeki güvenli kontrolü')
    .trim();
}

function buildLead(label, control) {
  const text = normalizeSafeControl(control);
  return text ? `${label}: ${ensureVisibleSentence(text)}` : '';
}

function collectEvidence(surface, screenContext, analysis, contextPriority, screenLabel, roleText, selectedSummary, selectedStatus) {
  return uniqueTextList([
    `Yüzey: ${surface.label}`,
    roleText ? `Rol: ${roleText}` : '',
    screenLabel ? `Ekran: ${screenLabel}` : '',
    selectedSummary ? `Seçili kayıt: ${selectedSummary}` : '',
    selectedStatus ? `Durum: ${selectedStatus}` : '',
    analysis?.reasoningLead ? `Reasoning: ${analysis.reasoningLead}` : '',
    analysis?.nextBestAction ? `Öneri: ${analysis.nextBestAction}` : '',
    analysis?.safestNextStep ? `Güvenli kontrol: ${analysis.safestNextStep}` : '',
    contextPriority?.bestNextAction ? `Context: ${contextPriority.bestNextAction}` : '',
    contextPriority?.followUpPrompt ? `Follow-up: ${contextPriority.followUpPrompt}` : '',
    ...(Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields.slice(0, 4).map((row) => `${firstText(row?.label, row?.key, '')}: ${firstText(row?.value, row?.text, '-')}`) : []),
    ...(Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges.slice(0, 4).map((row) => `${firstText(row?.label, row?.key, '')}: ${firstText(row?.value, row?.text, '-')}`) : []),
  ]);
}

function collectHealthSignals(surface, selectedSummary, selectedStatus, analysis, contextPriority, reply) {
  return uniqueTextList([
    surface.key,
    surface.label,
    selectedSummary ? `selectedSummary:${selectedSummary}` : '',
    selectedStatus ? `selectedStatus:${selectedStatus}` : '',
    analysis?.reasoningLead ? 'analysis.reasoningLead' : '',
    analysis?.nextBestAction ? 'analysis.nextBestAction' : '',
    analysis?.safestNextStep ? 'analysis.safestNextStep' : '',
    analysis?.blockers?.length ? 'analysis.blockers' : '',
    analysis?.missingData?.length ? 'analysis.missingData' : '',
    analysis?.evidence?.length ? 'analysis.evidence' : '',
    contextPriority?.bestNextAction ? 'contextPriority.bestNextAction' : '',
    contextPriority?.followUpPrompt ? 'contextPriority.followUpPrompt' : '',
    reply ? 'reply' : '',
  ]);
}

function buildControlTexts(surface, analysis = null, contextPriority = null, guide = null) {
  const primary = firstText(
    analysis?.safestNextStep,
    analysis?.nextBestAction,
    contextPriority?.bestNextAction,
    contextPriority?.followUpPrompt,
    guide?.whatToDoNow,
    guide?.whatToDoNext,
    surface.nextBestAction,
    surface.summaryFallback,
    '',
  );
  const secondary = firstText(
    surface.safestNextStep,
    surface.compareHint,
    guide?.whyBlocked,
    guide?.doNotDo,
    '',
  );
  return {
    primary: normalizeSafeControl(primary),
    secondary: normalizeSafeControl(secondary),
  };
}

export function detectNextBestActionSurface(options = {}) {
  const screenPath = firstText(
    options?.screenPath,
    options?.screenDefinition?.path,
    options?.screenContext?.path,
    options?.sourceScreenDefinition?.path,
    options?.sourceScreenContext?.path,
    '',
  );
  const screenLabel = firstText(
    options?.screenDefinition?.label,
    options?.screenContext?.label,
    options?.sourceScreenDefinition?.label,
    options?.sourceScreenContext?.label,
    '',
  );
  const screenText = [
    options?.screenDefinition?.menuPurpose,
    options?.screenContext?.menuPurpose,
    options?.sourceScreenDefinition?.menuPurpose,
    options?.sourceScreenContext?.menuPurpose,
    options?.conversationState?.screenPurpose,
    options?.conversationState?.uiSurface?.pageTitles?.join(' '),
    options?.conversationState?.uiSurface?.modalTitles?.join(' '),
  ].filter(Boolean).join(' • ');
  return profileForRole(
    options?.userRole || options?.user?.role || options?.roleMode || '',
    screenPath,
    screenLabel,
    screenText,
  );
}

export function looksLikeNextBestActionQuestion(message, questionType = '', interactionIntentFamily = '', options = {}) {
  const normalizedQuestionType = String(questionType || '').trim();
  if (NEXT_BEST_ACTION_RELEVANT_QUESTION_TYPES.includes(normalizedQuestionType)) return true;
  if (looksLikeNextBestActionQuestionShared(message)) return true;
  const text = normalizeLooseText(firstText(message, options?.rawMessage, ''));
  if (!text) return false;
  if (textHas(text, NEXT_BEST_ACTION_TRIGGER_PHRASES)) return true;
  if (String(interactionIntentFamily || '').toUpperCase() === 'DELEGATE_SAFE') return false;
  return false;
}

export function buildNextBestActionState({
  message = '',
  rawMessage = message,
  questionType = '',
  interactionIntentFamily = '',
  roleMode = 'OPERATIONS',
  userRole = '',
  user = null,
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  analysis = null,
  contextPriority = null,
  conversationState = null,
  guidedTaskMeta = null,
  entityType = 'screen',
  context = null,
  taskState = null,
  guide = null,
} = {}) {
  const normalizedMessage = firstText(message, rawMessage, '');
  const surface = detectNextBestActionSurface({
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
    userRole,
    user,
    roleMode,
  });
  const normalizedQuestionType = String(questionType || '').trim();
  const supportedQuestion = looksLikeNextBestActionQuestion(normalizedMessage, normalizedQuestionType, interactionIntentFamily, {
    rawMessage,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
    userRole,
    user,
    roleMode,
  });
  const blockedFamily = ['PLAN_REVIEW', 'RISK_LIST', 'ROOT_CAUSE', 'SMART_DIAGNOSTIC', 'DYNAMIC_QUESTION', 'CLARIFYING_QUESTION', 'WORKFLOW_REASONING'];
  const shouldRespond = Boolean(
    supportedQuestion
    && surface.key !== 'GENERIC'
    && !blockedFamily.includes(String(interactionIntentFamily || '').trim())
    && !blockedFamily.includes(String(normalizedQuestionType || '').trim())
  );
  const roleText = prettyRoleName(firstText(userRole, user?.role, roleMode, ''));
  const screenLabel = prettyScreenLabel(firstText(
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    surface.label,
    'Bu ekran',
  ));
  const selectedSummaryText = firstText(
    selectedSummaryValue(screenContext),
    selectedSummaryValue(sourceScreenContext),
    contextPriority?.selectedSummary,
    taskState?.selectedSummary,
    '',
  );
  const selectedRecordStatus = firstText(
    selectedStatusText(screenContext),
    selectedStatusText(sourceScreenContext),
    analysis?.selectedRecordStatus,
    contextPriority?.selectedRecordStatus,
    taskState?.selectedRecordStatus,
    '',
  );
  const controls = buildControlTexts(surface, analysis, contextPriority, guide);
  const nextBestAction = controls.primary
    ? buildLead('Sıradaki en doğru güvenli adım', controls.primary)
    : '';
  const safestNextStep = controls.secondary
    ? buildLead('Önce yapılacak güvenli kontrol', controls.secondary)
    : '';
  const blockers = uniqueTextList([
    ...(Array.isArray(analysis?.blockers) ? analysis.blockers : []),
    ...(surface.blocker ? [surface.blocker] : []),
    ...(selectedRecordStatus ? [] : ['Seçili kayıt görünmüyor.']),
  ]);
  const missingData = uniqueTextList([
    ...(Array.isArray(analysis?.missingData) ? analysis.missingData : []),
    ...(!selectedSummaryText ? ['Seçili kayıt özeti görünmüyor.'] : []),
  ]);
  const evidence = collectEvidence(surface, screenContext, analysis, contextPriority, screenLabel, roleText, selectedSummaryText, selectedRecordStatus);
  const healthSignals = collectHealthSignals(surface, selectedSummaryText, selectedRecordStatus, analysis, contextPriority, '');
  const chips = buildNextBestActionChips({
    message,
    rawMessage,
    questionType,
    interactionIntentFamily,
    roleMode,
    userRole,
    user,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    analysis,
    contextPriority,
    conversationState,
    guidedTaskMeta,
    entityType,
    context,
    taskState,
    surface,
    selectedSummaryText,
    selectedRecordStatus,
  });
  const summary = firstText(
    surface.reviewLead,
    nextBestAction,
    safestNextStep,
    surface.summaryFallback,
    'Sıradaki güvenli kontrol belirleniyor.',
  );
  const compareHint = firstText(surface.compareHint, '');
  const reply = shouldRespond
    ? normalizeVisibleReplyFragment(uniqueStrings([
      roleText ? `${roleText} açısından:` : '',
      surface.label ? `${surface.label} için` : '',
      selectedSummaryText ? `Seçili kayıt: ${selectedSummaryText}.` : '',
      selectedRecordStatus ? `Durum: ${selectedRecordStatus}.` : '',
      nextBestAction,
      safestNextStep,
      compareHint || '',
      blockers.length ? 'İnsan onayı gerekir.' : '',
    ]).join(' '))
    : '';
  return Object.freeze({
    engineVersion: NEXT_BEST_ACTION_ENGINE_VERSION,
    shouldRespond,
    surfaceKey: surface.key,
    surfaceLabel: surface.label,
    surfacePurpose: firstText(surface.summaryFallback, ''),
    roleText,
    screenLabel,
    selectedSummaryText,
    selectedRecordStatus,
    summary,
    reasoningLead: summary,
    nextBestAction,
    safestNextStep,
    compareHint,
    blockers,
    missingData,
    evidence,
    healthSignals: uniqueTextList([
      ...healthSignals,
      ...surface.healthSignals,
      ...NEXT_BEST_ACTION_HEALTH_SIGNAL_ASSERTIONS,
    ]),
    chips,
    reply,
    questionType: normalizedQuestionType,
    interactionIntentFamily: String(interactionIntentFamily || ''),
    userRole: String(userRole || ''),
    roleMode: String(roleMode || ''),
    entityType: String(entityType || 'screen'),
    guidedTaskMeta,
    context,
  });
}

export function buildNextBestActionReply(options = {}) {
  return buildNextBestActionState(options).reply;
}

export function buildNextBestActionChips(options = {}) {
  const surface = options?.surface || detectNextBestActionSurface(options);
  const chips = [
    ...(Array.isArray(surface.chips) ? surface.chips : []),
    ...(options?.selectedSummaryText ? ['Seçili kayıt'] : []),
    ...(options?.selectedRecordStatus ? ['Durum satırı'] : []),
    ...(surface.key === 'GENERIC' ? ['İlgili ekran', 'İnsan onayı'] : []),
  ];
  return uniqueTextList(chips).slice(0, String(options?.roleMode || '') === 'SIMPLE' ? 3 : 5);
}
