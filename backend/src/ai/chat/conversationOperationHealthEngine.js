import {
  ensureVisibleSentence,
  normalizeVisibleReplyFragment,
  prettyRoleName,
  prettyScreenLabel,
} from './conversationTaskStateShared.js';
import { uniqueStrings } from './replyShapes.js';

export const OPERATION_HEALTH_ENGINE_VERSION = 'COPILOT-OPERATION-HEALTH-ENGINE-01';

export const OPERATION_HEALTH_RELEVANT_QUESTION_TYPES = Object.freeze([
  'SCREEN_PURPOSE',
  'SCREEN_FOCUS',
  'WHY_BLOCKED',
  'STATUS_HELP',
  'NEXT_STEP',
  'NEXT_BEST_ACTION',
  'FIRST_CONTROL',
  'SAFE_NEXT_STEP',
  'READINESS_CHECK',
]);

export const OPERATION_HEALTH_TRIGGER_PHRASES = Object.freeze([
  'operasyon sağlığı',
  'operasyon sagligi',
  'canlılık',
  'canlilik',
  'riskli cihaz',
  'riskli cihazlar',
  'aktif sürücü',
  'aktif surucu',
  'açık sorun',
  'acik sorun',
  'konum sinyali',
  'konum bilgisi',
  'çevrim dışı',
  'cevrim disi',
  'operasyon sağlığı sorun ne',
  'operasyon sagligi sorun ne',
  'sorun ne',
  'sorunu ne',
  'neyde sorun var',
  'hangi risk',
  'canlılık ve cihaz riski',
  'canlilik ve cihaz riski',
  'saha güveni',
  'canlı durum',
  'canli durum',
  'son olay',
  'cihaz riski',
  'oturum riski',
  'izin riski',
]);

export const OPERATION_HEALTH_GUARD_REQUIREMENTS = Object.freeze([
  'sadece okur',
  'yazma yok',
  'uygulama yok',
  'onay öncesi kontrol',
  'canlılık ve risk okuması',
  'konum sinyali ve cihaz durumu',
  'sonraki güvenli kontrol',
  'insan onayı',
]);

export const OPERATION_HEALTH_NO_WRITE_ACTIONS = Object.freeze([
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
  'işledim',
  'açtım',
  'kapattım',
  'düzenledim',
  'değiştirdim',
  'ekledim',
  'çıkardım',
  'aktif ettim',
  'devreye aldım',
  'otomatik yaptım',
]);

export const OPERATION_HEALTH_TERMINOLOGY = Object.freeze([
  'Operasyon Sağlığı',
  'Canlılık',
  'Riskli cihaz',
  'Konum sinyali güncel değil / çevrim dışı',
  'Açık sorun',
  'Aktif sürücü',
  'Konum sinyali',
  'Son konum bilgisi',
  'Son konum kaydı',
  'Son olay',
  'Sahadaki risk',
  'Saha güveni',
  'Sonraki güvenli kontrol',
  'İnsan onayı',
  'İlgili satırı aç',
  'Durum satırı',
  'Canlı takip',
  'Sürücü rotası',
  'Vardiya',
  'Araç bağlantısı',
  'Sürücü durumu',
  'Operasyon kanıtı',
]);

export const OPERATION_HEALTH_REGRESSION_BOUNDARIES = Object.freeze([
  'workflow reasoning ayrı',
  'plan review ayrı',
  'risk scoring ayrı',
  'root cause ayrı',
  'smart diagnostic ayrı',
  'dynamic question ayrı',
  'clarifying question ayrı',
  'route review ayrı',
]);

export const OPERATION_HEALTH_HEALTH_SIGNAL_ASSERTIONS = Object.freeze([
  'summary',
  'nextBestAction',
  'safestNextStep',
  'compareHint',
  'selectedRecordStatus',
  'healthSignals',
  'blockers',
  'evidence',
  'chips',
  'reply',
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

function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\u0307/g, '');
}

function pathHas(path = '', needles = []) {
  const haystack = normalizeText(path);
  return (Array.isArray(needles) ? needles : []).some((needle) => haystack.includes(normalizeText(needle)));
}

function textHas(text = '', needles = []) {
  const haystack = normalizeLooseText(text);
  return (Array.isArray(needles) ? needles : []).some((needle) => haystack.includes(normalizeLooseText(needle)));
}

function firstNonBlank(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function uniqueTextList(values = []) {
  return uniqueStrings((Array.isArray(values) ? values : []).map((value) => firstNonBlank(value, '')).filter(Boolean));
}

function selectedRows(screenContext, key) {
  return (Array.isArray(screenContext?.[key]) ? screenContext[key] : []).map((row) => ({
    label: firstNonBlank(row?.label, row?.key, row?.title, row?.name, ''),
    value: firstNonBlank(row?.value, row?.text, row?.summary, '-'),
    note: firstNonBlank(row?.note, row?.help, row?.reason, ''),
  })).filter((row) => row.label);
}

function findRowValue(rows, needles) {
  const wanted = (Array.isArray(needles) ? needles : [needles]).map((item) => normalizeText(item));
  const hit = (Array.isArray(rows) ? rows : []).find((row) => wanted.some((needle) => normalizeText(`${row.label} ${row.value}`).includes(needle)));
  return hit ? String(hit.value || '').trim() : '';
}

function readCount(value) {
  if (value == null || value === '') return Number.NaN;
  if (Number.isFinite(value)) return Number(value);
  const parsed = Number(String(value).replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function structuredFacts(screenContext) {
  const facts = screenContext?.structuredFacts;
  return facts && typeof facts === 'object' ? facts : null;
}

export const OPERATION_HEALTH_SURFACE_PROFILES = Object.freeze([
  Object.freeze({
    key: 'ROOM_OPERATION_HEALTH',
    label: 'Operasyon Sağlığı',
    purpose: 'canlılık, riskli cihaz, açık sorun ve konum sinyalini birlikte okuma',
    paths: ['/room/operation-health'],
    visibleNeedles: ['operasyon sağlığı', 'canlılık', 'riskli cihaz', 'açık sorun'],
    reviewLead: 'Operasyon Sağlığı tarafında canlılık ve risk özetini okuyorum.',
    summaryFallback: 'Operasyon sağlığı, canlılık ve risk okuması için kullanılır.',
    nextBestAction: 'Riskli cihazı aç, konum sinyali güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.',
    safestNextStep: 'En risksiz adım, önce riskli cihaz ve konum sinyali güncel değil / çevrim dışı satırını açmaktır.',
    compareHint: 'Operasyon sağlığı canlılık ve risk okuması içindir; tek başına işlem kararı değildir.',
    blocker: 'Önce açık veya riskli kayıt var mı bak.',
    chips: ['Riskli cihazı göster', 'Konum sinyali güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'],
    forceHealthSurface: true,
  }),
  Object.freeze({
    key: 'SUPERADMIN_OPERATIONS',
    label: 'Super Admin Operasyonları',
    purpose: 'genel operasyon riskini ve canlılık zincirini birlikte okuma',
    paths: ['/superadmin/operations'],
    visibleNeedles: ['operasyon paneli', 'operasyon sağlığı', 'canlılık'],
    reviewLead: 'Süper yönetici operasyonlarında canlılık ve risk satırlarını okuyorum.',
    summaryFallback: 'Operasyon paneli, canlı risk ve bağlantı okumak için kullanılır.',
    nextBestAction: 'Önce aktif vardiya ve konum sinyalini kontrol et. Sonra araç / sürücü bağlantısını ve açık sorunları aç.',
    safestNextStep: 'En risksiz adım, önce aktif vardiya ve son konum bilgisini birlikte okumaktır.',
    compareHint: 'Bu ekran karar yüzeyi değil; canlı operasyon ve risk okumak içindir.',
    blocker: 'Önce aktif veya riskli kayıt var mı bak.',
    chips: ['Riskli cihazı göster', 'Konum sinyali güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'],
    forceHealthSurface: true,
  }),
  Object.freeze({
    key: 'OBSERVABILITY',
    label: 'Canlı İzleme',
    purpose: 'canlı durum, konum sinyali güveni ve son olayları birlikte okuma',
    paths: ['/observability', '/superadmin/observability'],
    visibleNeedles: ['observability', 'canlı durum', 'gps güven', 'son olay'],
    reviewLead: 'Canlı izleme tarafında durum ve son olayları okuyorum.',
    summaryFallback: 'Canlı izleme, veri kalitesi ve son olay okumak için kullanılır.',
    nextBestAction: 'Önce canlı durum ile konum sinyali güvenini birlikte oku. Sonra cihaz riski ve son olaya geç.',
    safestNextStep: 'En risksiz adım, önce canlı durum ve son olayı birlikte okumaktır.',
    compareHint: 'Canlı durum ve konum sinyali güveni aynı şey değildir; biri akışı, diğeri veri kalitesini gösterir.',
    blocker: 'Önce canlı durum ve son olay var mı bak.',
    chips: ['Canlı durumu aç', 'Konum sinyali güvenini kontrol et', 'Cihaz riskini göster', 'Son olayı aç'],
    forceHealthSurface: true,
  }),
  Object.freeze({
    key: 'TRUST_QUALITY',
    label: 'Kalite Sinyali',
    purpose: 'kanıt, taslak skor ve inceleme kararını birlikte okuma',
    paths: ['/trust-quality', '/superadmin/trust-quality'],
    visibleNeedles: ['trust quality', 'kalite', 'sağlayıcı', 'saglayici'],
    reviewLead: 'Kalite sinyali tarafında kanıt ve karar satırlarını okuyorum.',
    summaryFallback: 'Kalite sinyali, kanıt ve inceleme kararını birlikte okumak için kullanılır.',
    nextBestAction: 'Önce kanıt, taslak skor ve inceleme kararını birlikte oku. Sonra sağlayıcı detayına geç.',
    safestNextStep: 'En risksiz adım, önce kanıt özetini açmaktır.',
    compareHint: 'Taslak skor ile inceleme kararı aynı şey değildir; ikisi birlikte okunur.',
    blocker: 'Önce hangi kalite sinyalinin eksik kaldığını netleştir.',
    chips: ['İlgili kontrol kartını aç', 'Bu ne demek?', 'Sıradaki adımı göster', 'İlgili yere götür'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'COMPANY_OPERATIONS',
    label: 'Şirket Operasyonları',
    purpose: 'şirket operasyon riskini ve açık talepleri birlikte okuma',
    paths: ['/company/operations'],
    visibleNeedles: ['şirket operasyon', 'operasyon paneli', 'açık talep'],
    reviewLead: 'Şirket operasyonlarında açık talep ve yetki satırlarını okuyorum.',
    summaryFallback: 'Şirket operasyonu, açık talep ve yetki okumak için kullanılır.',
    nextBestAction: 'Önce açık talep, yetki sınırı ve eksik veriyi kontrol et.',
    safestNextStep: 'En risksiz adım, önce açık talep ve eksik veri satırlarını okumaktır.',
    compareHint: 'Bu ekran karar yerine açık talep ve yetki görünürlüğü sağlar.',
    blocker: 'Önce açık talep var mı bak.',
    chips: ['Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri ne?', 'Bu rolde ne görünür?'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'COMPANY_SHIFTS',
    label: 'Vardiyalar',
    purpose: 'vardiya canlılığı, atama ve başlatma akışını birlikte okuma',
    paths: ['/company/shifts', '/organization/shifts'],
    visibleNeedles: ['vardiya', 'shift', 'başlatma'],
    reviewLead: 'Vardiyalar tarafında atama ve saat uyumunu okuyorum.',
    summaryFallback: 'Vardiyalar, atama ve başlatma akışı okumak için kullanılır.',
    nextBestAction: 'Önce vardiya zamanı, araç / sürücü ataması ve konum sinyalini kontrol et.',
    safestNextStep: 'En risksiz adım, önce vardiya satırını açmaktır.',
    compareHint: 'Vardiya akışı ile canlı operasyon aynı şey değildir; biri planı, diğeri sahayı gösterir.',
    blocker: 'Önce vardiya ve saat satırını aç.',
    chips: ['Vardiya zamanı', 'Araç-sürücü ataması', 'Operasyon hazırlığı', 'Başlatma akışı'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'ROOM_SHIFTS',
    label: 'Oda Vardiyaları',
    purpose: 'oda tarafındaki vardiya planı ve canlı başlangıcı birlikte okuma',
    paths: ['/room/shifts'],
    visibleNeedles: ['vardiya', 'shift', 'canlı başlangıç'],
    reviewLead: 'Oda vardiyaları tarafında araç, sürücü ve durak uyumunu okuyorum.',
    summaryFallback: 'Oda vardiyaları, canlı başlangıç ve eşleşme okumak için kullanılır.',
    nextBestAction: 'Önce araç / sürücü bağlantısını ve başlatma zamanını kontrol et.',
    safestNextStep: 'En risksiz adım, önce vardiya kaydını açmaktır.',
    compareHint: 'Vardiya uygun görünse bile canlı başlangıç akışı ayrıca kontrol edilmelidir.',
    blocker: 'Önce başlatma zamanı ve bağlantı durumunu kontrol et.',
    chips: ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'ROOM_MAP',
    label: 'Canlı Takip',
    purpose: 'konum sinyali ve canlı hareketi birlikte okuma',
    paths: ['/room/map', '/room/live'],
    visibleNeedles: ['canlı takip', 'harita', 'konum', 'gps'],
    reviewLead: 'Canlı Takip tarafında konum ve rota uyumunu okuyorum.',
    summaryFallback: 'Canlı takip, konum ve rota okumak için kullanılır.',
    nextBestAction: 'Önce son konum bilgisi ile konum sinyalini karşılaştır. Sonra araç bağlantısını aç.',
    safestNextStep: 'En risksiz adım, önce son konum bilgisini okumaktır.',
    compareHint: 'Canlı takip ile rota planı aynı şey değildir; biri saha verisini gösterir.',
    blocker: 'Önce son konum ve rota bilgisini kontrol et.',
    chips: ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'ROOM_VEHICLES',
    label: 'Araçlar',
    purpose: 'araç, sürücü ve cihaz riskini birlikte okuma',
    paths: ['/room/vehicles'],
    visibleNeedles: ['araç', 'vehicle'],
    reviewLead: 'Araçlar tarafında araç, sürücü ve kapasite uyumunu okuyorum.',
    summaryFallback: 'Araçlar, araç ve sürücü riskini okumak için kullanılır.',
    nextBestAction: 'Önce araç / sürücü eşleşmesi ve son konum bilgisini kontrol et.',
    safestNextStep: 'En risksiz adım, önce araç kaydını açmaktır.',
    compareHint: 'Araç görünürlüğü ile canlı takip aynı şey değildir; kaynak ve eşleşme ayrı okunur.',
    blocker: 'Önce araç ve sürücü eşleşmesini kontrol et.',
    chips: ['Araç / sürücü', 'Kapasite', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'DRIVER_ROUTE',
    label: 'Sürücü Rotası',
    purpose: 'günlük rota, durak sırası ve zaman uyumunu birlikte okuma',
    paths: ['/driver/route', '/driver/today', '/driver/map'],
    visibleNeedles: ['sürücü rotası', 'rota', 'durak'],
    reviewLead: 'Sürücü rotasında günlük akışı ve durak sırasını okuyorum.',
    summaryFallback: 'Sürücü rotası, günlük rota ve konum okumak için kullanılır.',
    nextBestAction: 'Önce sıradaki durağı ve konum sinyalini kontrol et. Sonra rota akışına devam et.',
    safestNextStep: 'En risksiz adım, önce aktif görev ve sıradaki durağı doğrulamaktır.',
    compareHint: 'Rota ile canlı konum aynı şey değildir; biri planı, diğeri anlık akışı gösterir.',
    blocker: 'Önce aktif görev ve sıradaki durak bilgisini kontrol et.',
    chips: ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak nerede?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'PERSONEL_LIVE',
    label: 'Personel Canlı',
    purpose: 'servis, konum ve erişim riskini birlikte okuma',
    paths: ['/personel/live', '/personel/my'],
    visibleNeedles: ['personel', 'servis', 'my ride'],
    reviewLead: 'Personel canlı yüzeyinde servis ve konum satırlarını okuyorum.',
    summaryFallback: 'Personel canlı, servis ve konum okumak için kullanılır.',
    nextBestAction: 'Önce servis durumu ve son konum bilgisi zamanını kontrol et.',
    safestNextStep: 'En risksiz adım, önce servis satırını açmaktır.',
    compareHint: 'Personel canlı ile rota planı aynı şey değildir; biri servis görünürlüğüdür.',
    blocker: 'Önce servis durumunu ve son konum bilgisini kontrol et.',
    chips: ['Servis nerede?', 'Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'PARENT_LIVE',
    label: 'Veli Canlı',
    purpose: 'öğrenci servis canlılığını ve güvenli takip sinyalini birlikte okuma',
    paths: ['/parent/live'],
    visibleNeedles: ['veli', 'çocuk', 'servis'],
    reviewLead: 'Veli canlı yüzeyinde öğrencinin servis ve konum satırlarını okuyorum.',
    summaryFallback: 'Veli canlı, öğrenci servisi ve konum okumak için kullanılır.',
    nextBestAction: 'Önce son konum bilgisi ve tahmini varış süresini kontrol et.',
    safestNextStep: 'En risksiz adım, önce servis satırını açmaktır.',
    compareHint: 'Veli canlı ile rota planı aynı şey değildir; biri takip görünürlüğüdür.',
    blocker: 'Önce servis satırı ve son konum bilgisini kontrol et.',
    chips: ['Son konum bilgisi ne zaman geldi?', 'Tahmini varış süresi nedir?', 'Araç bağlantısı var mı?', 'Sürücünün telefonundan konum sinyali devrede mi?'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'SCHOOL_OPERATIONS',
    label: 'Okul Operasyonları',
    purpose: 'okul servis operasyon riskini ve açık sinyalleri birlikte okuma',
    paths: ['/school/operations'],
    visibleNeedles: ['okul operasyon', 'school operations'],
    reviewLead: 'Okul operasyonlarında açık talep ve yetki satırlarını okuyorum.',
    summaryFallback: 'Okul operasyonu, açık talep ve yetki okumak için kullanılır.',
    nextBestAction: 'Önce açık talep, yetki sınırı ve eksik veriyi kontrol et.',
    safestNextStep: 'En risksiz adım, önce açık talep ve eksik veri satırlarını okumaktır.',
    compareHint: 'Bu ekran karar yerine operasyon görünürlüğü sağlar.',
    blocker: 'Önce açık talep var mı bak.',
    chips: ['Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri ne?', 'Bu rolde ne görünür?'],
    forceHealthSurface: false,
  }),
  Object.freeze({
    key: 'ORGANIZATION_OPERATIONS',
    label: 'Organizasyon Operasyonları',
    purpose: 'organizasyon servis operasyon riskini ve açık sinyalleri birlikte okuma',
    paths: ['/organization/operations'],
    visibleNeedles: ['organizasyon operasyon', 'organization operations'],
    reviewLead: 'Organizasyon operasyonlarında açık talep ve yetki satırlarını okuyorum.',
    summaryFallback: 'Organizasyon operasyonu, açık talep ve yetki okumak için kullanılır.',
    nextBestAction: 'Önce açık talep, yetki sınırı ve eksik veriyi kontrol et.',
    safestNextStep: 'En risksiz adım, önce açık talep ve eksik veri satırlarını okumaktır.',
    compareHint: 'Bu ekran karar yerine operasyon görünürlüğü sağlar.',
    blocker: 'Önce açık talep var mı bak.',
    chips: ['Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri ne?', 'Bu rolde ne görünür?'],
    forceHealthSurface: false,
  }),
]);

function detectSurfaceProfile({ screenPath = '', screenDefinition = null, screenContext = null, sourceScreenDefinition = null, sourceScreenContext = null, conversationState = null } = {}) {
  const path = normalizeText(firstNonBlank(
    screenPath,
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  ));
  const visibleText = normalizeLooseText(uniqueTextList([
    firstNonBlank(screenDefinition?.label, ''),
    firstNonBlank(screenContext?.label, ''),
    firstNonBlank(sourceScreenDefinition?.label, ''),
    firstNonBlank(sourceScreenContext?.label, ''),
    firstNonBlank(screenDefinition?.menuPurpose, ''),
    firstNonBlank(screenContext?.menuPurpose, ''),
    firstNonBlank(sourceScreenDefinition?.menuPurpose, ''),
    firstNonBlank(sourceScreenContext?.menuPurpose, ''),
    firstNonBlank(screenDefinition?.screenExplanation, ''),
    firstNonBlank(screenContext?.screenExplanation, ''),
    firstNonBlank(sourceScreenDefinition?.screenExplanation, ''),
    firstNonBlank(sourceScreenContext?.screenExplanation, ''),
    firstNonBlank(screenContext?.selectedSummary, ''),
    firstNonBlank(screenContext?.selectedRecordStatus, ''),
    firstNonBlank(sourceScreenContext?.selectedSummary, ''),
    firstNonBlank(sourceScreenContext?.selectedRecordStatus, ''),
    firstNonBlank(conversationState?.uiSurface?.summary, ''),
  ]).join(' • '));
  return OPERATION_HEALTH_SURFACE_PROFILES.find((profile) => pathHas(path, profile.paths) || textHas(visibleText, profile.visibleNeedles)) || Object.freeze({
    key: 'GENERIC',
    label: 'Operasyon Sağlığı',
    purpose: 'canlılık ve risk sinyalini birlikte okuma',
    paths: [],
    visibleNeedles: [],
    reviewLead: 'Operasyon sağlığı tarafında canlılık ve risk özetini okuyorum.',
    summaryFallback: 'Bu ekranda operasyon sağlığı sinyali görünmüyor.',
    nextBestAction: 'Önce açık sorun, riskli cihaz, aktif sürücü ve konum sinyali satırlarını kontrol et.',
    safestNextStep: 'En risksiz adım, önce açık sorun ve konum sinyali satırlarını okumaktır.',
    compareHint: 'Operasyon sağlığı canlılık ve risk okuması içindir; tek başına işlem kararı değildir.',
    blocker: 'Önce açık veya riskli kayıt var mı bak.',
    chips: ['Riskli cihazı göster', 'Konum sinyali güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'],
    forceHealthSurface: false,
  });
}

function getOperationHealthCounters({ screenContext = null, sourceScreenContext = null } = {}) {
  const screenFacts = structuredFacts(screenContext);
  const sourceFacts = structuredFacts(sourceScreenContext);
  const facts = screenFacts || sourceFacts || {};
  const counters = facts?.counters && typeof facts.counters === 'object'
    ? facts.counters
    : facts?.counts && typeof facts.counts === 'object'
      ? facts.counts
      : facts?.metrics && typeof facts.metrics === 'object'
        ? facts.metrics
        : {};
  const selectedFieldRowsAll = [...selectedRows(screenContext, 'selectedFields'), ...selectedRows(sourceScreenContext, 'selectedFields')];
  const selectedBadgeRowsAll = [...selectedRows(screenContext, 'selectedBadges'), ...selectedRows(sourceScreenContext, 'selectedBadges')];
  const activeDrivers = readCount(firstNonBlank(
    counters.activeDrivers,
    findRowValue(selectedFieldRowsAll, ['aktif sürücü', 'active drivers']),
    findRowValue(selectedBadgeRowsAll, ['aktif sürücü', 'active drivers']),
    '',
  ));
  const riskyDevices = readCount(firstNonBlank(
    counters.riskyDevices,
    findRowValue(selectedFieldRowsAll, ['riskli cihaz']),
    findRowValue(selectedBadgeRowsAll, ['riskli cihaz']),
    '',
  ));
  const staleOrOffline = readCount(firstNonBlank(
    counters.staleOrOffline,
    findRowValue(selectedFieldRowsAll, ['konum sinyali güncel değil / çevrim dışı', 'stale / offline', 'stale', 'offline']),
    findRowValue(selectedBadgeRowsAll, ['konum sinyali güncel değil / çevrim dışı', 'stale / offline', 'stale', 'offline']),
    '',
  ));
  const openIssues = readCount(firstNonBlank(
    counters.openIssues,
    findRowValue(selectedFieldRowsAll, ['açık sorun', 'acik sorun']),
    findRowValue(selectedBadgeRowsAll, ['açık sorun', 'acik sorun']),
    '',
  ));
  const sampleDriver = firstNonBlank(
    counters.sampleDriver,
    counters.driverName,
    findRowValue(selectedFieldRowsAll, ['örnek sürücü', 'ornek surucu']),
    findRowValue(selectedBadgeRowsAll, ['örnek sürücü', 'ornek surucu']),
    '',
  );
  const sampleIssue = firstNonBlank(
    counters.sampleIssue,
    counters.issueTitle,
    findRowValue(selectedFieldRowsAll, ['örnek sorun', 'ornek sorun']),
    findRowValue(selectedBadgeRowsAll, ['örnek sorun', 'ornek sorun']),
    '',
  );
  const hasSignal = [activeDrivers, riskyDevices, staleOrOffline, openIssues].some((value) => Number.isFinite(value));
  return {
    counters: {
      activeDrivers,
      riskyDevices,
      staleOrOffline,
      openIssues,
    },
    sampleDriver,
    sampleIssue,
    hasSignal,
    fields: selectedFieldRowsAll,
    badges: selectedBadgeRowsAll,
  };
}

function buildHealthSignals(counters, sampleDriver = '', sampleIssue = '') {
  return uniqueTextList([
    `Aktif sürücü: ${Number.isFinite(counters.activeDrivers) ? counters.activeDrivers : 0}`,
    `Riskli cihaz: ${Number.isFinite(counters.riskyDevices) ? counters.riskyDevices : 0}`,
    `Konum sinyali güncel değil / çevrim dışı: ${Number.isFinite(counters.staleOrOffline) ? counters.staleOrOffline : 0}`,
    `Açık sorun: ${Number.isFinite(counters.openIssues) ? counters.openIssues : 0}`,
    sampleDriver ? `Örnek sürücü: ${sampleDriver}` : '',
    sampleIssue ? `Örnek sorun: ${sampleIssue}` : '',
  ]).map((text) => {
    const [label, ...rest] = text.split(': ');
    return {
      id: normalizeText(label),
      label,
      value: rest.join(': ') || '-',
      note: label === 'Örnek sürücü'
        ? 'Canlı görünen sürücü örneği.'
        : label === 'Örnek sorun'
          ? 'Takip edilmesi gereken örnek sorun.'
          : '',
    };
  });
}

function hasHealthSignalText(text = '') {
  return textHas(text, OPERATION_HEALTH_TRIGGER_PHRASES);
}

export function detectOperationHealthSurface(options = {}) {
  return detectSurfaceProfile(options);
}

export function looksLikeOperationHealthQuestion(message, questionType = '', interactionIntentFamily = '', options = {}) {
  const normalizedQuestionType = String(questionType || '').trim();
  if (['PLAN_REVIEW', 'RISK_LIST', 'ROOT_CAUSE', 'SMART_DIAGNOSTIC', 'DYNAMIC_QUESTION', 'CLARIFYING_QUESTION', 'SCREEN_EXPLANATION_HELP'].includes(normalizedQuestionType)) {
    return false;
  }
  if (OPERATION_HEALTH_RELEVANT_QUESTION_TYPES.includes(normalizedQuestionType)) {
    const surface = detectSurfaceProfile(options);
    return Boolean(surface.forceHealthSurface || hasHealthSignalText(message));
  }
  if (['PLAN_REVIEW', 'RISK_LIST', 'ROOT_CAUSE', 'SMART_DIAGNOSTIC', 'DYNAMIC_QUESTION', 'CLARIFYING_QUESTION'].includes(String(interactionIntentFamily || '').trim())) {
    return false;
  }
  const surface = detectSurfaceProfile(options);
  const text = normalizeLooseText(firstNonBlank(message, options?.rawMessage, ''));
  if (!text) return false;
  if (surface.key !== 'GENERIC' && surface.forceHealthSurface) return true;
  if (surface.key !== 'GENERIC' && hasHealthSignalText(text)) return true;
  return false;
}

function buildOperationHealthCoreReply({
  surface,
  roleText,
  selectedSummaryText,
  selectedRecordStatus,
  summary,
  nextBestAction,
  safestNextStep,
  compareHint,
  replyTail = '',
  _questionType = '',
}) {
  const screenPurposeLead = surface?.label ? `${surface.label} tarafı takip için kullanılır.` : '';
  return normalizeVisibleReplyFragment(uniqueTextList([
    roleText ? `${roleText} açısından:` : '',
    surface?.label ? `${surface.label} tarafında` : '',
    screenPurposeLead,
    selectedSummaryText ? `Seçili kayıt: ${selectedSummaryText}.` : '',
    selectedRecordStatus ? `Durum: ${selectedRecordStatus}.` : '',
    summary,
    nextBestAction ? `Önce: ${ensureVisibleSentence(nextBestAction)}` : '',
    safestNextStep ? `En güvenli kontrol: ${ensureVisibleSentence(safestNextStep)}` : '',
    compareHint || '',
    replyTail || '',
  ]).join(' '));
}

export function buildOperationHealthState({
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
} = {}) {
  const normalizedMessage = firstNonBlank(message, rawMessage, '');
  const surface = detectSurfaceProfile({
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  });
  const countersState = getOperationHealthCounters({
    screenContext,
    sourceScreenContext,
  });
  const selectedSummaryText = firstNonBlank(
    screenContext?.selectedSummary,
    sourceScreenContext?.selectedSummary,
    contextPriority?.selectedSummary,
    taskState?.selectedSummary,
    '',
  );
  const selectedRecordStatus = firstNonBlank(
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedRecordStatus,
    analysis?.selectedRecordStatus,
    contextPriority?.selectedRecordStatus,
    taskState?.selectedRecordStatus,
    countersState.hasSignal
      ? `Aktif sürücü ${Number.isFinite(countersState.counters.activeDrivers) ? countersState.counters.activeDrivers : 0} • Riskli cihaz ${Number.isFinite(countersState.counters.riskyDevices) ? countersState.counters.riskyDevices : 0} • Konum sinyali güncel değil / çevrim dışı ${Number.isFinite(countersState.counters.staleOrOffline) ? countersState.counters.staleOrOffline : 0} • Açık sorun ${Number.isFinite(countersState.counters.openIssues) ? countersState.counters.openIssues : 0}`
      : '',
    '',
  );
  const roleText = firstNonBlank(
    prettyRoleName(userRole),
    user?.role ? prettyRoleName(user.role) : '',
    '',
  );
  const screenLabel = firstNonBlank(
    prettyScreenLabel(screenDefinition?.label),
    prettyScreenLabel(screenContext?.label),
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
    surface.label,
    'Bu ekran',
  );
  const countSummary = countersState.hasSignal
    ? `Şimdi: En kritik sorun canlılık ve cihaz riski. Aktif sürücü ${Number.isFinite(countersState.counters.activeDrivers) ? countersState.counters.activeDrivers : 0}, riskli cihaz ${Number.isFinite(countersState.counters.riskyDevices) ? countersState.counters.riskyDevices : 0}, konum sinyali güncel değil / çevrim dışı ${Number.isFinite(countersState.counters.staleOrOffline) ? countersState.counters.staleOrOffline : 0} ve açık sorun ${Number.isFinite(countersState.counters.openIssues) ? countersState.counters.openIssues : 0} görünüyor.`
    : `Şimdi: Bu ekranda somut operasyon sağlığı sinyali görünmüyor; açık sorun, riskli cihaz, aktif sürücü ve konum sinyali güncel değil / çevrim dışı satırlarını kontrol et.`;
  const specificNextBestAction = countersState.hasSignal
    ? 'Riskli cihazı aç, konum sinyali güncel değil / çevrim dışı satırını aç ve açık sorunları sırala.'
    : firstNonBlank(
      countersState.sampleIssue ? 'Önce örnek sorunu aç. Sonra hangi ekrana gitmen gerektiğini netleştir.' : '',
      countersState.sampleDriver ? 'Önce örnek sürücünün canlılık, izin ve oturum durumunu birlikte kontrol et.' : '',
      surface.nextBestAction,
    );
  const specificSafestNextStep = firstNonBlank(
    surface.safestNextStep,
    countersState.hasSignal
      ? 'En risksiz adım, önce riskli cihaz ve konum sinyali güncel değil / çevrim dışı satırını açmaktır.'
      : '',
  );
  const compareHint = firstNonBlank(
    surface.compareHint,
    countersState.hasSignal ? 'Operasyon sağlığı canlılık ve risk okuması içindir; tek başına işlem kararı değildir.' : '',
  );
  const blockers = uniqueTextList([
    ...(countersState.hasSignal && Number.isFinite(countersState.counters.openIssues) && countersState.counters.openIssues > 0 ? ['Açık sorunlar var.'] : []),
    ...(countersState.hasSignal && Number.isFinite(countersState.counters.riskyDevices) && countersState.counters.riskyDevices > 0 ? ['Riskli cihazlar var.'] : []),
    ...(countersState.hasSignal && Number.isFinite(countersState.counters.staleOrOffline) && countersState.counters.staleOrOffline > 0 ? ['Konum sinyali güncel değil / çevrim dışı kayıtlar var.'] : []),
    ...(countersState.hasSignal ? [] : [surface.blocker]),
  ]);
  const missingData = uniqueTextList([
    !countersState.hasSignal ? 'Operasyon sağlığı özeti boş görünüyor.' : '',
    !selectedRecordStatus && !countersState.hasSignal ? 'Seçili kayıt özeti görünmüyor.' : '',
  ]);
  const evidence = uniqueTextList([
    `Ekran: ${screenLabel}`,
    `Yüzey: ${surface.label}`,
    `Durum özeti: ${countSummary}`,
    ...countersState.fields.slice(0, 4).map((row) => `${row.label}: ${row.value}`),
    ...countersState.badges.slice(0, 4).map((row) => `${row.label}: ${row.value}`),
    countersState.sampleDriver ? `Örnek sürücü: ${countersState.sampleDriver}` : '',
    countersState.sampleIssue ? `Örnek sorun: ${countersState.sampleIssue}` : '',
  ]);
  const healthSignals = buildHealthSignals(countersState.counters, countersState.sampleDriver, countersState.sampleIssue);
  const shouldRespond = Boolean(
    surface.key !== 'GENERIC'
    && looksLikeOperationHealthQuestion(normalizedMessage, questionType, interactionIntentFamily, {
      message: normalizedMessage,
      rawMessage,
      questionType,
      interactionIntentFamily,
      screenPath,
      screenDefinition,
      screenContext,
      sourceScreenDefinition,
      sourceScreenContext,
      conversationState,
      entityType,
      context,
      taskState,
    }),
  );
  const summary = firstNonBlank(
    surface.reviewLead,
    countSummary,
    surface.summaryFallback,
    '',
  );
  const roomOperationHealthTail = surface.key === 'ROOM_OPERATION_HEALTH'
    ? 'Riskli cihazı aç, konum sinyali güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.'
    : '';
  const replyTail = blockers.length
    ? (roomOperationHealthTail ? `İnsan onayı gerekir. ${roomOperationHealthTail}` : 'İnsan onayı gerekir.')
    : roomOperationHealthTail;
  const reply = shouldRespond
    ? buildOperationHealthCoreReply({
      surface,
      roleText,
      selectedSummaryText,
      selectedRecordStatus,
      summary,
      nextBestAction: specificNextBestAction,
      safestNextStep: specificSafestNextStep,
      compareHint,
      replyTail,
      questionType,
    })
    : '';
  const chips = buildOperationHealthChips({
    message: normalizedMessage,
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
  });
  return Object.freeze({
    engineVersion: OPERATION_HEALTH_ENGINE_VERSION,
    shouldRespond,
    surfaceKey: surface.key,
    surfaceLabel: surface.label,
    surfacePurpose: surface.purpose,
    roleText,
    screenLabel,
    selectedSummaryText,
    selectedRecordStatus,
    summary,
    reasoningLead: summary,
    nextBestAction: specificNextBestAction,
    safestNextStep: specificSafestNextStep,
    compareHint,
    blockers,
    missingData,
    evidence,
    healthSignals,
    chips,
    reply,
    questionType: String(questionType || ''),
    interactionIntentFamily: String(interactionIntentFamily || ''),
    userRole: String(userRole || ''),
    roleMode: String(roleMode || ''),
    counters: countersState.counters,
    sampleDriver: countersState.sampleDriver,
    sampleIssue: countersState.sampleIssue,
  });
}

export function buildOperationHealthReply(options = {}) {
  return buildOperationHealthState(options).reply;
}

export function buildOperationHealthChips(options = {}) {
  const surface = detectSurfaceProfile(options);
  const questionType = String(options?.questionType || '').trim();
  if (questionType === 'BOARDING_CHANGE_APPLICATION') {
    return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
  }
  if (questionType === 'BOARDING_ROUTE_IMPACT_PREVIEW') {
    return ['Rota etkisini önizle', 'Kişi farkını göster', 'Km/süre farkını açıkla', 'Kapasite etkisini göster'];
  }
  return [...surface.chips];
}
