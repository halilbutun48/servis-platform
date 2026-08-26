import { buildConversationTaskState, buildSelectedRecordText } from './conversationTaskState.js';
import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  companyPlanningCenterSurfaceText,
  companyPlanningUiSurfaceText,
  companyPlanningCenterPurposeReply,
  isPlanningCenterPath,
  looksLikeCompanyPlanningSurfaceText,
  normalizeLooseText,
  normalizeText,
  normalizeVisibleReplyFragment,
  prettyRoleName,
  prettyScreenLabel,
} from './conversationTaskStateShared.js';
import { hasBoardingChangeRequestEntrySignal } from './intentRouterCore.js';

export const PLAN_REVIEW_ENGINE_VERSION = 'COPILOT-PLAN-REVIEW-ENGINE-01';

export const PLAN_REVIEW_RELEVANT_QUESTION_TYPES = Object.freeze([
  'PLAN_REVIEW',
]);

export const PLAN_REVIEW_TRIGGER_PHRASES = Object.freeze([
  'bu plan doğru mu',
  'bu plan dogru mu',
  'planı kontrol eder misin',
  'plani kontrol eder misin',
  'planı incele',
  'plani incele',
  'bu plan uygulanabilir mi',
  'plan uygulanabilir mi',
  'plan mantıklı mı',
  'plan mantikli mi',
  'plan uygun mu',
  'plan hazır mı',
  'plan hazir mi',
  'planı onaylamadan önce ne kontrol edilmeli',
  'plani onaylamadan önce ne kontrol edilmeli',
  'planı uygulamadan önce neye bakmalıyım',
  'plani uygulamadan önce neye bakmalıyım',
  'hangi alanlar eksik',
  'eksik alanlar neler',
  'vardiya planında eksik var mı',
  'vardiya planinda eksik var mi',
  'saatler çakışıyor mu',
  'saatler cakisiyor mu',
  'saat çakışıyor mu',
  'saat cakisiyor mu',
  'bu rota mantıklı mı',
  'bu rota mantikli mi',
  'güzergah mantıklı mı',
  'guzergah mantikli mi',
  'rota önizlemesini değerlendir',
  'rota onizlemesini degerlendir',
  'bu personeller bu araca sığar mı',
  'bu personeller bu araca sigar mi',
  'bu plan neden riskli',
  'bu planı onaylamadan önce ne kontrol edilmeli',
  'bu plani onaylamadan önce ne kontrol edilmeli',
  'bu sözleşmeden vardiya çıkar mı',
  'bu sozlesmeden vardiya cikar mi',
  'vardiya hazırlığı tamam mı',
  'vardiya hazirligi tamam mi',
]);

export const PLAN_REVIEW_GUARD_REQUIREMENTS = Object.freeze([
  'sadece okur',
  'yazma yok',
  'uygulama yok',
  'onay öncesi kontrol',
  'belirsiz alanları göster',
  'kapasite, zaman, adres ve rota kontrolü',
  'araç / sürücü uyumu kontrolü',
  'insan onayı',
  'sonraki güvenli kontrol',
]);

export const PLAN_REVIEW_NO_WRITE_ACTIONS = Object.freeze([
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
  'yürürlüğe aldım',
  'devreye aldım',
  'aktif ettim',
  'otomatik yaptım',
]);

export const PLAN_REVIEW_TERMINOLOGY = Object.freeze([
  'Planlama Merkezi',
  'vardiya',
  'teklif',
  'sözleşme',
  'rota',
  'güzergah',
  'durak',
  'adres',
  'konum',
  'araç',
  'sürücü',
  'kapasite',
  'tarih',
  'saat',
  'onay',
  'onayınız gerekli',
  'eksik',
  'belirsiz',
  'yetkili görünüm',
  'sonraki güvenli kontrol',
  'KVKK',
  'canlı takip',
]);

export const PLAN_REVIEW_REGRESSION_BOUNDARIES = Object.freeze([
  'workflow reasoning ayrı',
  'risk scoring ayrı',
  'root cause ayrı',
  'smart diagnostic ayrı',
  'clarifying question ayrı',
  'dynamic question ayrı',
  'route review ayrı',
]);

export const PLAN_REVIEW_SURFACE_PROFILES = Object.freeze({
  COMPANY_PLAN_CENTER: Object.freeze({
    key: 'COMPANY_PLAN_CENTER',
    label: 'Planlama Merkezi',
    purpose: 'plan taslağını, eksikleri ve onay noktasını gözden geçirme',
    paths: ['/company', '/organization', '/school'],
    reviewLead: 'Planlama Merkezi tarafında plan taslağını güvenli taraftan okuyorum.',
    approvalText: 'Plan uygulanabilir görünse bile insan onayı gerekir.',
    followUpText: 'İlgili plan ekranını açıp eksik alanları tek tek kontrol et.',
    chipLabels: ['Eksikleri göster', 'Kapasiteyi kontrol et', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Paket, tarih, saat ve servis yönü net mi?',
      'Teklif ve güzergah sinyalleri net mi?',
      'Personel, adres / konum ve duraklar tam mı?',
      'Kapasite ve araç / sürücü uyumu yeterli mi?',
      'Rota önizlemesinde çakışma var mı?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  COMPANY_SHIFTS: Object.freeze({
    key: 'COMPANY_SHIFTS',
    label: 'Vardiyalar',
    purpose: 'vardiya planını, atama uyumunu ve onay sınırını gözden geçirme',
    paths: ['/company/shifts', '/organization/shifts'],
    reviewLead: 'Vardiyalar tarafında planı, atamayı ve güvenli onay noktasını okuyorum.',
    approvalText: 'Vardiya planı hazır görünse bile insan onayı gerekir.',
    followUpText: 'Vardiya satırını açıp saat, atama ve kapasiteyi tekrar kontrol et.',
    chipLabels: ['Atamayı kontrol et', 'Saat uyumu', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Vardiya saati ve tarih net mi?',
      'Atanan personel, araç ve sürücü uyumlu mu?',
      'Konum / durak bilgisi tamam mı?',
      'Çakışma veya eksik alan var mı?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  COMPANY_AGREEMENTS: Object.freeze({
    key: 'COMPANY_AGREEMENTS',
    label: 'Sözleşmeler',
    purpose: 'sözleşme ile vardiya bağını ve rota etkisini gözden geçirme',
    paths: ['/company/agreements', '/organization/agreements', '/school/agreements', '/room/agreements'],
    reviewLead: 'Sözleşmeler tarafında vardiya bağını ve güvenli geçiş noktasını okuyorum.',
    approvalText: 'Sözleşme uygun görünse bile insan onayı gerekir.',
    followUpText: 'Sözleşme satırını açıp vardiya ve rota etkisini kontrol et.',
    chipLabels: ['Sözleşme bağı', 'Rota etkisi', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Sözleşme ile vardiya bağı net mi?',
      'Yeni rota veya değişiklik varsa fark açık mı?',
      'Kapasite, saat ve adres etkisi anlaşılır mı?',
      'Eksik şart veya belirsiz nokta var mı?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  ROOM_SHIFTS: Object.freeze({
    key: 'ROOM_SHIFTS',
    label: 'Vardiyalar',
    purpose: 'oda tarafındaki vardiya planı ve eşleşme uyumunu gözden geçirme',
    paths: ['/room/shifts'],
    reviewLead: 'Oda tarafındaki vardiya planını, eşleşmeyi ve güvenli kontrolü okuyorum.',
    approvalText: 'Vardiya uygun görünse bile insan onayı gerekir.',
    followUpText: 'Vardiya kaydını açıp araç, sürücü ve durak uyumunu kontrol et.',
    chipLabels: ['Eşleşmeyi kontrol et', 'Saat ve rota', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Araç / sürücü / vardiya eşleşmesi doğru mu?',
      'Saat ve rota sırası uygun mu?',
      'Durak ve kapasite bilgisi tam mı?',
      'Eksik ya da çakışan alan var mı?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  ROOM_MAP: Object.freeze({
    key: 'ROOM_MAP',
    label: 'Canlı Takip',
    purpose: 'harita, konum ve rota doğruluğunu gözden geçirme',
    paths: ['/room/map'],
    reviewLead: 'Canlı Takip tarafında konum, harita ve rota uyumunu okuyorum.',
    approvalText: 'Harita görünümü uygun görünse bile insan onayı gerekir.',
    followUpText: 'Harita kaydını açıp konum ve rota bilgilerini tekrar kontrol et.',
    chipLabels: ['Konumu kontrol et', 'Rota uyumu', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Konum doğruluğu yeterli mi?',
      'Haritadaki araç ile kayıt eşleşiyor mu?',
      'Adres / durak ve rota bilgisi net mi?',
      'Sinyal ya da veri gecikmesi var mı?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  ROOM_VEHICLES: Object.freeze({
    key: 'ROOM_VEHICLES',
    label: 'Araçlar',
    purpose: 'araç, sürücü ve kapasite uyumunu gözden geçirme',
    paths: ['/room/vehicles'],
    reviewLead: 'Araçlar tarafında araç, sürücü ve kapasite uyumunu okuyorum.',
    approvalText: 'Araç uygun görünse bile insan onayı gerekir.',
    followUpText: 'Araç kaydını açıp kapasite, cihaz ve eşleşme bilgilerini kontrol et.',
    chipLabels: ['Araç / sürücü', 'Kapasite', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Araç / sürücü eşleşmesi doğru mu?',
      'Kapasite ve cihaz bilgisi tam mı?',
      'Konum ve sinyal durumu yeterli mi?',
      'Eksik alan var mı?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  DRIVER_ROUTE: Object.freeze({
    key: 'DRIVER_ROUTE',
    label: 'Sürücü Rotası',
    purpose: 'günlük rota, durak sırası ve zaman uyumunu gözden geçirme',
    paths: ['/driver/route', '/driver/today', '/driver/map'],
    reviewLead: 'Sürücü rotasında günlük akışı, durak sırasını ve güvenli kontrolü okuyorum.',
    approvalText: 'Rota uygun görünse bile insan onayı gerekir.',
    followUpText: 'Rota kaydını açıp saat, durak ve kapasiteyi kontrol et.',
    chipLabels: ['Durak sırası', 'Saat uyumu', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Günlük rota ve durak sırası net mi?',
      'Saat ve konum uyumu doğru mu?',
      'Araç ve sürücü uygun mu?',
      'Eksik adres veya durak var mı?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  PERSONEL_LIVE: Object.freeze({
    key: 'PERSONEL_LIVE',
    label: 'Canlı',
    purpose: 'yetkili görünüm ve KVKK sınırı içinde servis planını gözden geçirme',
    paths: ['/personel/live', '/personel/my'],
    reviewLead: 'Personel canlı görünümünde yetkili alanı ve güvenli sınırı okuyorum.',
    approvalText: 'Yetkili görünüm doğru görünse bile insan onayı gerekir.',
    followUpText: 'Yetkili servis görünümünü açıp servis saati ve konum bilgisini kontrol et.',
    chipLabels: ['Yetkili görünüm', 'KVKK sınırı', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Yetkili görünüm doğru mu?',
      'Servis bilgisi ve saat yeterli mi?',
      'Adres / konum ve durak doğruluğu tamam mı?',
      'KVKK / yetki sınırı korunuyor mu?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  PARENT_LIVE: Object.freeze({
    key: 'PARENT_LIVE',
    label: 'Canlı',
    purpose: 'yetkili öğrenci görünümü içinde servis planını gözden geçirme',
    paths: ['/parent/live'],
    reviewLead: 'Veli canlı görünümünde yetkili görünüm ve öğrenci servisi okuyorum.',
    approvalText: 'Yetkili öğrenci görünümü doğru görünse bile insan onayı gerekir.',
    followUpText: 'Yetkili öğrenci servis görünümünü açıp servis saati ve rota bilgisini kontrol et.',
    chipLabels: ['Yetkili görünüm', 'Servis saati', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Yetkili öğrenci görünümü doğru mu?',
      'Servis, saat ve durak bilgisi net mi?',
      'Adres / konum ve rota uyumu yeterli mi?',
      'Başkasının verisi görünmüyor mu?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  SUPERADMIN: Object.freeze({
    key: 'SUPERADMIN',
    label: 'Süper Yönetici',
    purpose: 'sistem, kalite ve risk sinyali üzerinden planı denetleme',
    paths: ['/superadmin', '/superadmin/operations', '/superadmin/commercial-core', '/superadmin/trust-quality', '/superadmin/operation-verification', '/superadmin/observability', '/superadmin/acceptance', '/superadmin/telematics'],
    reviewLead: 'Süper Yönetici tarafında sistem, kalite ve risk sinyalini okuyorum.',
    approvalText: 'Kritik adımda insan onayı gerekir.',
    followUpText: 'İlgili denetim panelini açıp eksik ya da çelişkili sinyalleri kontrol et.',
    chipLabels: ['Sistem özeti', 'Risk sinyali', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Sistem, kalite ve risk sinyali net mi?',
      'Eksik veya çelişkili veri var mı?',
      'Plan hangi yüzeyi etkiliyor?',
      'Gerekli onay ve iz kayıtları tamam mı?',
      'İşleme geçmeden önce insan onayı al.',
    ],
  }),
  DEFAULT: Object.freeze({
    key: 'DEFAULT',
    label: 'Bu plan',
    purpose: 'plan taslağını güvenli taraftan gözden geçirme',
    paths: [],
    reviewLead: 'Bu planı güvenli taraftan okuyorum.',
    approvalText: 'Plan uygulanabilir görünse bile insan onayı gerekir.',
    followUpText: 'İlgili plan ekranını açıp eksik alanları tek tek kontrol et.',
    chipLabels: ['Eksikleri göster', 'Kapasiteyi kontrol et', 'İnsan onayı', 'Sonraki güvenli kontrol'],
    checklist: [
      'Eksik veya belirsiz alanları sırala.',
      'Kapasite, zaman ve adres uyumunu kontrol et.',
      'Araç / sürücü ve rota eşleşmesini kontrol et.',
      'İnsan onayı olmadan ilerleme.',
    ],
  }),
});

const PLAN_REVIEW_BLOCKED_QUESTION_TYPES = new Set([
  'PRODUCT_OVERVIEW_HELP',
  'ROLE_EXPLANATION_HELP',
  'SCREEN_EXPLANATION_HELP',
  'HOW_TO_HELP',
  'FIELD_BUTTON_HELP',
  'CLARIFYING_QUESTION',
  'RISK_LIST',
  'ROOT_CAUSE',
  'WHY_BLOCKED',
  'NEXT_STEP',
  'NEXT_SCREEN',
  'NEXT_BEST_ACTION',
  'FIRST_CONTROL',
  'SAFE_NEXT_STEP',
  'DETAIL_FLOW',
  'READINESS_CHECK',
  'STATUS_HELP',
  'MISSING_DATA_HELP',
  'CONTRACT_TO_SHIFT',
  'CONTRACT_SHIFT_TODAY',
  'AGREEMENT_ROUTE_REFRESH',
  'SEFER_SCORE_PREVIEW',
  'MARKETPLACE_FREE_TO_OPERATE_PREVIEW',
  'PAYMENT_READINESS',
  'PAYMENT_MISSING',
  'QUALITY_SIGNAL',
  'TRUST_QUALITY',
  'FEEDBACK_STATUS',
  'NOTIFICATION_SOURCE',
  'KVKK_VISIBILITY',
  'DRIVER_PHONE_GPS',
  'LOCATION_HELP',
  'WHO_CAN_DO',
  'ROLE_BOUNDARY',
  'BOARDING_CHANGE_REQUEST_ENTRY',
  'BOARDING_CHANGE_APPLICATION',
  'BOARDING_ROUTE_IMPACT_PREVIEW',
  'DYNAMIC_SAVINGS_PREVIEW',
  'ROUTE_REVIEW_HUMAN_APPROVAL',
  'ROUTE_PREP_EXCEL',
  'ROUTE_PREP_ADDRESS',
  'ROUTE_PREP_OSRM',
  'ROUTE_APPLY_BLOCKED',
  'IMPORT_WRITE_BLOCKED',
  'FAKE_SUCCESS_REQUEST_BLOCKED',
]);

const PLAN_REVIEW_BLOCKED_INTENT_FAMILIES = new Set([
  'STEP_ENTERED',
  'RESULT_CHECK',
  'ALTERNATIVE_PATH',
  'CONTINUE_FLOW',
  'DELEGATE_SAFE',
  'OVERVIEW_START',
  'ROLE_START',
  'SCREEN_START',
  'STEP_BY_STEP',
  'FIELD_BUTTON',
  'ROUTE_REVIEW_APPROVAL',
]);

const PLAN_REVIEW_BLOCKED_GUIDED_TASK_PATTERNS = Object.freeze([
  /(?:excel|exel|csv|tablo|liste|dosya|personel|kişi|kisiler|kişiler|ogrenci|öğrenci|adres|konum|koordinat).*(?:rota|güzergâh|güzergah|guzergah|servis|durak|plan).*(?:çıkar|cikar|hazırla|hazirla|kur|yap|çevir|cevir|oluştur|olustur|öner|oner)/i,
  /(?:rota|güzergâh|güzergah|guzergah|servis|durak|plan|adres|konum|koordinat).*(?:excel|exel|csv|tablo|liste|dosya).*(?:çıkar|cikar|hazırla|hazirla|kur|yap|çevir|cevir|oluştur|olustur|öner|oner)/i,
  /(?:liste|adres|konum|kişi|kisiler|kişiler|personel|öğrenci|ogrenci).*(?:rota|güzergâh|güzergah|guzergah|servis|durak|plan).*(?:çıkar|cikar|hazırla|hazirla|kur|yap|çevir|cevir|oluştur|olustur|öner|oner)/i,
  /(?:vardiya|teklif|sözleşme|sozlesme|servis|rota|güzergâh|güzergah|guzergah|adres|konum|koordinat|kişi|kisiler|kişiler|personel|araç|arac|sürücü|surucu|plan).*(?:istiyorum|yapmak istiyorum|oluşturmak istiyorum|olusturmak istiyorum|açmak istiyorum|acmak istiyorum|planlamak istiyorum|kurmak istiyorum|hazırla|hazirla|gönder|gonder|göster|goster|ata|çevir|cevir|çıkar|cikar|yap|kur|oluştur|olustur|\b(?:aç|ac)\b)/i,
  /(?:adres|konum|koordinat).*(?:haritada noktala|haritaya dök|haritaya dok|işle|isle|bul|çevir|cevir|göster|goster|çıkar|cikar)/i,
  /(?:km|süre|sure|mesafe).*(?:çıkar|cikar|hesapla|söyle|soyle)/i,
  /(?:polyline çiz|polyline ciz|osrm ile bak|güzergahı hesapla|guzergahi hesapla|rota süresini söyle|rota suresini soyle|yol hesabı yap|yol hesabi yap)/i,
  /(?:rotayı devreye al|rota kaydını oluştur|durakları oluştur|bunu sisteme uygula|onayı boşver, uygula|yaptım de, gerçekten yapma|fake success|sahte başarı|olmuş gibi söyle|başarmış gibi anlat|simüle et ama yapma|uydur)/i,
  /(?:bu excel.?i sisteme kaydet|bu exceli sisteme kaydet|toplu ekle|personel oluştur|db.?ye bas|kayıtları yaz)/i,
]);

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePath(value) {
  return normalizeText(String(value || '').split('?')[0]);
}

function pathMatches(path, patterns = []) {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return false;
  return (Array.isArray(patterns) ? patterns : []).some((pattern) => {
    const normalizedPattern = normalizePath(pattern);
    if (!normalizedPattern) return false;
    return normalizedPath === normalizedPattern || normalizedPath.startsWith(normalizedPattern);
  });
}

function matchesPhrase(text, phrases = []) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(phrases) ? phrases : []).some((phrase) => {
    const normalized = normalizeLooseText(phrase);
    if (!normalized) return false;
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalized)}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    return pattern.test(value);
  });
}

function compactPlanReviewText(value) {
  return normalizeLooseText(value).replace(/\s+/g, ' ');
}

function isBlockedGuidedTaskText(text) {
  const value = compactPlanReviewText(text);
  if (!value) return false;
  if (hasBoardingChangeRequestEntrySignal(value)) return true;
  return PLAN_REVIEW_BLOCKED_GUIDED_TASK_PATTERNS.some((pattern) => pattern.test(value));
}

function isDirectPlanExecutionCommand(text) {
  const value = normalizeText(text);
  if (!value) return false;
  return /\b(?:uygula|devreye al|isleme al|onayla|kaydet|olustur|gonder|ata|kabul et|aktif et|c[ıi]kar|haz[ıi]rla|cevir|kur|baslat|yap|oner)\b/.test(value);
}

function isContractShiftProductionQuestion(text) {
  const value = compactPlanReviewText(text);
  if (!value) return false;
  if (!/(?:sözleşme|sozlesme|contract)/.test(value)) return false;
  return /(?:vardiya|shift|üretim|uretim|üretildi|uretildi|oluştu|olustu|hazır|hazir|hazırlık|hazirlik|başlat|baslat|ödeme|odeme|hakediş|hakedis|kanıt|kanit|komisyon|tahsilat|fatura|payment|proof)/.test(value);
}

function isPaymentOrProofQuestion(text) {
  const value = compactPlanReviewText(text);
  if (!value) return false;
  return /(?:hakediş|hakedis|ödeme|odeme|komisyon|tahsilat|fatura|payment|kanıt|kanit|proof)/.test(value);
}

function normalizeRoleKey(value) {
  return normalizeText(value).replace(/[_\s]+/g, '');
}

function collectPlanReviewSurfaceText(options = {}) {
  return compactPlanReviewText(uniqueStrings([
    companyPlanningCenterSurfaceText({
      screenPath: options?.screenPath,
      screenDefinition: options?.screenDefinition,
      screenContext: options?.screenContext,
      sourceScreenDefinition: options?.sourceScreenDefinition,
      sourceScreenContext: options?.sourceScreenContext,
      conversationState: options?.conversationState,
    }),
    companyPlanningUiSurfaceText(options?.conversationState || null),
    options?.screenDefinition?.label,
    options?.screenContext?.label,
    options?.sourceScreenDefinition?.label,
    options?.sourceScreenContext?.label,
    options?.screenDefinition?.menuPurpose,
    options?.screenContext?.menuPurpose,
    options?.sourceScreenDefinition?.menuPurpose,
    options?.sourceScreenContext?.menuPurpose,
  ]).join(' • '));
}

function profileForPath(screenPath = '', surfaceText = '', roleKey = '') {
  const path = normalizePath(screenPath);
  const text = compactPlanReviewText(surfaceText);
  if (pathMatches(path, ['/company/agreements', '/organization/agreements', '/school/agreements', '/room/agreements'])) return PLAN_REVIEW_SURFACE_PROFILES.COMPANY_AGREEMENTS;
  if (pathMatches(path, ['/company/shifts', '/organization/shifts'])) return PLAN_REVIEW_SURFACE_PROFILES.COMPANY_SHIFTS;
  if (pathMatches(path, ['/room/shifts'])) return PLAN_REVIEW_SURFACE_PROFILES.ROOM_SHIFTS;
  if (pathMatches(path, ['/room/map'])) return PLAN_REVIEW_SURFACE_PROFILES.ROOM_MAP;
  if (pathMatches(path, ['/room/vehicles'])) return PLAN_REVIEW_SURFACE_PROFILES.ROOM_VEHICLES;
  if (pathMatches(path, ['/driver/route', '/driver/today', '/driver/map'])) return PLAN_REVIEW_SURFACE_PROFILES.DRIVER_ROUTE;
  if (pathMatches(path, ['/personel/live', '/personel/my'])) return PLAN_REVIEW_SURFACE_PROFILES.PERSONEL_LIVE;
  if (pathMatches(path, ['/parent/live'])) return PLAN_REVIEW_SURFACE_PROFILES.PARENT_LIVE;
  if (pathMatches(path, ['/superadmin', '/superadmin/operations', '/superadmin/commercial-core', '/superadmin/trust-quality', '/superadmin/operation-verification', '/superadmin/observability', '/superadmin/acceptance', '/superadmin/telematics'])) return PLAN_REVIEW_SURFACE_PROFILES.SUPERADMIN;
  if (path === '/company' || path === '/organization' || path === '/school') return PLAN_REVIEW_SURFACE_PROFILES.COMPANY_PLAN_CENTER;
  if (looksLikeCompanyPlanningSurfaceText(text) || isPlanningCenterPath(path) || /planlama merkezi/.test(text) || /plan.*merkezi/.test(text)) return PLAN_REVIEW_SURFACE_PROFILES.COMPANY_PLAN_CENTER;
  if (normalizeRoleKey(roleKey) === 'superadmin') return PLAN_REVIEW_SURFACE_PROFILES.SUPERADMIN;
  return PLAN_REVIEW_SURFACE_PROFILES.DEFAULT;
}

export function detectPlanReviewSurface(options = {}) {
  const surfaceText = collectPlanReviewSurfaceText(options);
  const roleKey = String(firstNonEmpty(options?.userRole, options?.user?.role, '') || '').trim();
  const profile = profileForPath(options?.screenPath || '', surfaceText, roleKey);
  return Object.freeze({
    ...profile,
    screenLabel: prettyScreenLabel(firstNonEmpty(
      options?.screenDefinition?.label,
      options?.screenContext?.label,
      options?.sourceScreenDefinition?.label,
      options?.sourceScreenContext?.label,
      profile.label,
    )),
    roleLabel: prettyRoleName(firstNonEmpty(options?.userRole, options?.user?.role, '')),
    screenPath: firstNonEmpty(
      options?.screenPath,
      options?.screenDefinition?.path,
      options?.screenContext?.path,
      options?.sourceScreenDefinition?.path,
      options?.sourceScreenContext?.path,
      '',
    ),
    surfaceText,
  });
}

function buildPlanReviewChecklist(surface, text = '') {
  const checklist = uniqueStrings([...(Array.isArray(surface?.checklist) ? surface.checklist : [])]);
  if (checklist.length) return checklist.slice(0, 5);
  const fallback = [];
  if (/kapasite|sığar|sigar|kaç kişi|kac kişi|kaç personel|araç kapasite|yer yeter|koltuk/.test(text)) fallback.push('Kapasite ve kişi sayısı yeterli mi?');
  if (/tarih|saat|zaman|bugün|bugun|yarın|yarin|vardiya/.test(text)) fallback.push('Tarih ve saat net mi?');
  if (/adres|konum|harita|durak|lokasyon/.test(text)) fallback.push('Adres ve konum doğruluğu tamam mı?');
  if (/rota|güzergah|guzergah|durak sırası|durak sirasi/.test(text)) fallback.push('Rota ve durak sırası uygun mu?');
  if (/araç|arac|sürücü|surucu|eşleşme|eslesme/.test(text)) fallback.push('Araç ve sürücü uyumu doğru mu?');
  if (/onay|uygula|işleme al|isleme al|kabul/.test(text)) fallback.push('İnsan onayı alınmış mı?');
  fallback.push('İşleme geçmeden önce eksik alanları aç.');
  return uniqueStrings(fallback).slice(0, 5);
}

function buildPlanReviewMissingText(surface, checklist, text = '') {
  const textValue = compactPlanReviewText(text);
  const explicitMissing = [];
  if (/eksik|belirsiz|boş|bos|uygunsuz|çakış|cakış|karışık|karisik/.test(textValue)) {
    explicitMissing.push('eksik ya da belirsiz alanlar');
  }
  if (/kapasite|sığar|sigar/.test(textValue)) explicitMissing.push('kapasite');
  if (/tarih|saat|zaman/.test(textValue)) explicitMissing.push('tarih / saat');
  if (/adres|konum|harita/.test(textValue)) explicitMissing.push('adres / konum');
  if (/rota|güzergah|guzergah|durak/.test(textValue)) explicitMissing.push('rota / durak');
  if (/araç|arac|sürücü|surucu/.test(textValue)) explicitMissing.push('araç / sürücü');
  if (/KVKK|yetki|izin|privacy/.test(textValue)) explicitMissing.push('yetki / KVKK');
  const surfaceMissing = uniqueStrings([
    ...(Array.isArray(checklist) ? checklist.slice(0, 4) : []),
    ...explicitMissing,
    surface?.followUpText ? surface.followUpText : '',
  ]);
  return surfaceMissing.slice(0, 4).join(' • ');
}

function buildPlanReviewApprovalText(surface, text = '', missingText = '') {
  const textValue = compactPlanReviewText(text);
  const hasGaps = Boolean(missingText) || /eksik|belirsiz|boş|bos|uygunsuz|çakış|cakış|karışık|karisik|tam değil|tam degil|hazır değil|hazir degil/.test(textValue);
  if (hasGaps) {
    return 'Önce eksik ya da belirsiz alanları netleştir; sonra insan onayı gerekir.';
  }
  return firstNonEmpty(surface?.approvalText, 'Plan uygulanabilir görünse bile insan onayı gerekir.');
}

function buildPlanReviewNextControlText(surface, text = '') {
  const value = compactPlanReviewText(text);
  if (/kapasite|sığar|sigar/.test(value)) return 'kapasite ve kişi sayısını seçili kayıtla birlikte kontrol et';
  if (/tarih|saat|zaman/.test(value)) return 'tarih ve saat bilgisini seçili kayıtla birlikte kontrol et';
  if (/adres|konum|harita/.test(value)) return 'adres ve konum doğruluğunu seçili kayıtla birlikte kontrol et';
  if (/rota|güzergah|guzergah|durak/.test(value)) return 'rota ve durak sırasını seçili kayıtla birlikte kontrol et';
  if (/araç|arac|sürücü|surucu/.test(value)) return 'araç ve sürücü uyumunu seçili kayıtla birlikte kontrol et';
  if (/yetki|KVKK/.test(value)) return 'yetkili görünüm ve KVKK sınırını seçili kayıtla birlikte kontrol et';
  return firstNonEmpty(surface?.followUpText, 'ilgili plan ekranını açıp eksik alanları tek tek kontrol et');
}

function buildPlanReviewChipsInternal(surface, text = '', roleMode = 'OPERATIONS') {
  const genericChips = [
    'Eksikleri göster',
    'Kapasiteyi kontrol et',
    'Saatleri kontrol et',
    'Adres / konumu kontrol et',
    'Araç / sürücü uyumu',
    'İnsan onayı',
  ];
  const surfaceChips = uniqueStrings([...(Array.isArray(surface?.chipLabels) ? surface.chipLabels : []), ...genericChips]);
  if (/yetki|KVKK/.test(compactPlanReviewText(text))) {
    surfaceChips.unshift('Yetkili görünüm');
  }
  const maxItems = String(roleMode || '').toUpperCase() === 'SIMPLE' ? 4 : 6;
  return surfaceChips.map((chip) => normalizeVisibleReplyFragment(chip)).slice(0, maxItems);
}

function buildPlanReviewReplyParts({
  roleText,
  surfaceLabel,
  reviewLead,
  selectedSummaryText,
  checklist,
  missingText,
  approvalText,
  nextControlText,
}) {
  const checklistText = Array.isArray(checklist) && checklist.length
    ? checklist.map((item, index) => `${index + 1}. ${item}`).join(' ')
    : '';
  return uniqueStrings([
    roleText ? `${roleText} açısından planı inceliyorum.` : 'Planı inceliyorum.',
    surfaceLabel ? `${surfaceLabel} tarafına bakıyorum.` : '',
    reviewLead ? `Şu kısmı inceliyorum: ${reviewLead}` : '',
    selectedSummaryText ? `Seçili kayıt: ${selectedSummaryText}.` : 'Önce ilgili satırı açıp planı o kayıt üzerinden kontrol et.',
    checklistText ? `Kontrol listesi: ${checklistText}` : '',
    missingText ? `Eksik ya da belirsiz görünenler: ${missingText}.` : '',
    approvalText ? approvalText : '',
    nextControlText ? `Sonraki güvenli kontrol: ${nextControlText}.` : '',
  ]).join(' ');
}

export function looksLikePlanReviewQuestion(message, questionType = '', interactionIntentFamily = '', options = {}) {
  const normalizedQuestionType = String(questionType || '').trim();
  if (PLAN_REVIEW_BLOCKED_QUESTION_TYPES.has(normalizedQuestionType)) return false;
  if (PLAN_REVIEW_BLOCKED_INTENT_FAMILIES.has(String(interactionIntentFamily || ''))) return false;
  if (PLAN_REVIEW_RELEVANT_QUESTION_TYPES.includes(normalizedQuestionType)) return true;
  const surface = detectPlanReviewSurface({
    ...options,
    message,
    questionType,
    interactionIntentFamily,
  });
  const text = compactPlanReviewText(firstNonEmpty(message, options?.rawMessage, ''));
  if (!text) return false;
  if (/(?:gps|eta|offline|konum\s+sinyali|son\s+konum|canli\s+takip|canlı\s+takip|takip\s+sinyali|gecik|hesaplanamiyor|hesaplanamıyor)/.test(text)) return false;
  if (
    /(görünmüyor|gorunmuyor|görünmez|gorunmez|nerede|yok|bekliyor|bekliyor|takıldı|takildi)/.test(text)
    && /(harita|haritada|canli\s+takip|canlı\s+takip|konum|gps|araç|arac|sürücü|surucu|servis|servisim)/.test(text)
  ) return false;
  if (/(?:route\s+review|rota\s+review)/.test(text)) return false;
  if (isBlockedGuidedTaskText(text)) return false;
  if (isDirectPlanExecutionCommand(text)) return false;
  if (isPaymentOrProofQuestion(text)) return false;
  if (isContractShiftProductionQuestion(text)) return false;
  if (matchesPhrase(text, PLAN_REVIEW_TRIGGER_PHRASES)) return true;
  if (surface?.key !== 'DEFAULT' && /(?:plan|vardiya|rota|güzergah|guzergah|sözleşme|sozlesme|adres|konum|araç|arac|sürücü|surucu|durak|kapasite|onay)/.test(text)) return true;
  return /(?:plan|vardiya|rota|güzergah|guzergah|sözleşme|sozlesme|planlama merkezi).*(?:doğru mu|dogru mu|uygun mu|hazır mı|hazir mi|mantıklı mı|mantikli mi|incele|kontrol et|değerlendir|degerlendir)/.test(text);
}

export function buildPlanReviewState({
  message = '',
  rawMessage = message,
  questionType = '',
  interactionIntentFamily = '',
  guide = null,
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
  const normalizedMessage = firstNonEmpty(message, rawMessage, '');
  const resolvedTaskState = taskState || buildConversationTaskState({
    message: normalizedMessage,
    rawMessage,
    questionType,
    conversationState,
    screenContext,
    sourceScreenContext,
    screenDefinition,
    sourceScreenDefinition,
    guidedTaskMeta,
    contextPriority,
    analysis,
    roleMode,
    userRole,
    entityType,
    screenPath,
  });
  const surface = detectPlanReviewSurface({
    message: normalizedMessage,
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
    conversationState,
    contextPriority,
    analysis,
    guidedTaskMeta,
    entityType,
    context,
    taskState: resolvedTaskState,
  });
  const supportedQuestion = looksLikePlanReviewQuestion(normalizedMessage, questionType, interactionIntentFamily, {
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
    userRole,
    user,
    contextPriority,
    analysis,
    guidedTaskMeta,
    entityType,
  });
  const shouldRespond = Boolean(
    surface
    && supportedQuestion
    && !PLAN_REVIEW_BLOCKED_QUESTION_TYPES.has(String(questionType || ''))
    && !PLAN_REVIEW_BLOCKED_INTENT_FAMILIES.has(String(interactionIntentFamily || ''))
  );
  const selectedSummaryText = normalizeVisibleReplyFragment(firstNonEmpty(
    (() => {
      const summary = firstNonEmpty(
        screenContext?.selectedSummary,
        sourceScreenContext?.selectedSummary,
        contextPriority?.evidenceConfidence,
        '',
      );
      const status = firstNonEmpty(
        screenContext?.selectedRecordStatus,
        sourceScreenContext?.selectedRecordStatus,
        analysis?.selectedRecordStatus,
        buildSelectedRecordText({
          screenContext,
          analysis,
          contextPriority,
        }),
        '',
      );
      if (summary && status && normalizeText(summary) !== normalizeText(status)) {
        return `${summary} / ${status}`;
      }
      return firstNonEmpty(summary, status, '');
    })(),
    buildSelectedRecordText({
      screenContext,
      analysis,
      contextPriority,
    }),
  ));
  const roleText = firstNonEmpty(
    surface?.roleLabel ? `${surface.roleLabel}` : '',
    prettyRoleName(userRole),
    '',
  );
  const screenLabel = firstNonEmpty(
    surface?.screenLabel,
    prettyScreenLabel(screenDefinition?.label),
    prettyScreenLabel(screenContext?.label),
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
    prettyScreenLabel(surface?.label),
    'Bu plan',
  );
  const surfaceLabel = firstNonEmpty(screenLabel, surface?.label, prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(screenContext?.label), prettyScreenLabel(sourceScreenDefinition?.label), prettyScreenLabel(sourceScreenContext?.label), 'Bu plan');
  const surfacePurpose = firstNonEmpty(
    surface?.purpose,
    guide?.screenExplanation,
    guide?.plainSummary,
    guide?.summary,
    '',
  );
  const reviewLead = firstNonEmpty(
    surface?.reviewLead,
    surfacePurpose,
    companyPlanningCenterPurposeReply(),
  );
  const checklist = buildPlanReviewChecklist(surface, compactPlanReviewText([
    normalizedMessage,
    surfacePurpose,
    selectedSummaryText,
    surface?.screenLabel,
    surface?.roleLabel,
  ].filter(Boolean).join(' • ')));
  const missingText = buildPlanReviewMissingText(surface, checklist, normalizedMessage);
  const approvalText = buildPlanReviewApprovalText(surface, normalizedMessage, missingText);
  const nextControlText = buildPlanReviewNextControlText(surface, normalizedMessage);
  const chips = buildPlanReviewChipsInternal(surface, normalizedMessage, roleMode);
  const reply = shouldRespond
    ? normalizeVisibleReplyFragment(buildPlanReviewReplyParts({
      roleText,
      surfaceLabel,
      reviewLead,
      selectedSummaryText,
      checklist,
      missingText,
      approvalText,
      nextControlText,
    }))
    : '';
  return Object.freeze({
    engineVersion: PLAN_REVIEW_ENGINE_VERSION,
    shouldRespond,
    surfaceKey: shouldRespond ? (surface?.key || '') : undefined,
    surfaceLabel,
    surfacePurpose,
    roleText,
    reviewLead,
    selectedSummaryText,
    checklist,
    missingText,
    approvalText,
    nextControlText,
    chips,
    reply,
    summary: normalizeVisibleReplyFragment(firstNonEmpty(reviewLead, missingText, approvalText, nextControlText, surfacePurpose, '')),
    screenPath: firstNonEmpty(
      screenPath,
      screenDefinition?.path,
      screenContext?.path,
      sourceScreenDefinition?.path,
      sourceScreenContext?.path,
      '',
    ),
    screenLabel,
    questionType: String(questionType || ''),
    interactionIntentFamily: String(interactionIntentFamily || ''),
    userRole: String(userRole || ''),
    roleMode: String(roleMode || ''),
  });
}

export function buildPlanReviewChips(options = {}) {
  const surface = detectPlanReviewSurface(options);
  return buildPlanReviewChipsInternal(surface, firstNonEmpty(options?.message, options?.rawMessage, ''), options?.roleMode || 'OPERATIONS');
}

export function buildPlanReviewReply(options = {}) {
  return buildPlanReviewState(options).reply;
}
