export const ADDRESS_GEOCODING_CONFIDENCE_VERSION = 'ADDRESS-GEOCODING-CONFIDENCE-01';

export const ADDRESS_GEOCODING_CONFIDENCE_STAGES = Object.freeze([
  Object.freeze({
    id: 'STAGE_1',
    title: 'Address Intake Readiness',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_2',
    title: 'Address Normalization Signals',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_3',
    title: 'Confidence Bands',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_4',
    title: 'Risk Categories',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_5',
    title: 'Human Review Gate',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_6',
    title: 'Handoff to Next Milestones',
    status: 'current baseline',
    futureOnly: false,
  }),
]);

export const ADDRESS_GEOCODING_CONFIDENCE_QUALITY_DICTIONARY = Object.freeze([
  Object.freeze({ id: 'CITY', title: 'city', meaning: 'İl sinyali' }),
  Object.freeze({ id: 'DISTRICT', title: 'district', meaning: 'İlçe sinyali' }),
  Object.freeze({ id: 'NEIGHBORHOOD', title: 'neighborhood', meaning: 'Mahalle / semt sinyali' }),
  Object.freeze({ id: 'STREET', title: 'street / avenue', meaning: 'Sokak / cadde sinyali' }),
  Object.freeze({ id: 'BUILDING_NUMBER', title: 'building number', meaning: 'Bina no sinyali' }),
  Object.freeze({ id: 'APARTMENT_FLOOR_BLOCK', title: 'block / floor / apartment', meaning: 'Daire / kat / blok sinyali' }),
  Object.freeze({ id: 'LANDMARK', title: 'landmark', meaning: 'Tarif veya buluşma noktası sinyali' }),
  Object.freeze({ id: 'POSTAL_CODE', title: 'postal code', meaning: 'Posta kodu sinyali' }),
  Object.freeze({ id: 'TENANT_LABEL', title: 'organization / tenant label', meaning: 'Şirket / okul / organizasyon etiketi' }),
  Object.freeze({ id: 'DUPLICATE_CANDIDATE', title: 'duplicate candidate', meaning: 'Tekrarlı adres adayı' }),
  Object.freeze({ id: 'TYPO_RISK', title: 'typo risk', meaning: 'Yazım hatası riski' }),
  Object.freeze({ id: 'TURKISH_CHARACTER_RISK', title: 'Turkish character / typing risk', meaning: 'Türkçe karakter / yazım riski' }),
  Object.freeze({ id: 'KVKK_EXPOSURE', title: 'KVKK / privacy exposure', meaning: 'Kişisel veri ve gizlilik sinyali' }),
]);

export const ADDRESS_GEOCODING_CONFIDENCE_READINESS_MODEL = Object.freeze({
  INTAKE: Object.freeze([
    'raw address text',
    'role context',
    'tenant boundary',
    'consent / privacy hint',
  ]),
  NORMALIZATION: Object.freeze([
    'city / district / neighborhood signal',
    'street / avenue / building signal',
    'landmark / meetup point signal',
    'duplicate and typo signal',
  ]),
  SCORING: Object.freeze([
    'HIGH_CONFIDENCE',
    'MEDIUM_CONFIDENCE',
    'LOW_CONFIDENCE',
    'BLOCKED_FOR_GEOCODING',
  ]),
  REVIEW: Object.freeze([
    'HUMAN_REVIEW_REQUIRED',
    'KVKK_REVIEW_REQUIRED',
    'CROSS_ORGANIZATION_REVIEW_REQUIRED',
  ]),
  HANDOFF: Object.freeze([
    'COPILOT-EXCEL-DEMAND-IMPORT-01',
    'COPILOT-STOP-ROUTE-DRAFT-01',
    'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
    'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
    'COPILOT-DEMAND-INTAKE-01',
  ]),
});

export const ADDRESS_GEOCODING_CONFIDENCE_BANDS = Object.freeze([
  Object.freeze({
    id: 'HIGH_CONFIDENCE',
    title: 'HIGH_CONFIDENCE',
    meaning: 'Şehir / ilçe / sokak sinyali güçlü ve review gerekmiyor',
  }),
  Object.freeze({
    id: 'MEDIUM_CONFIDENCE',
    title: 'MEDIUM_CONFIDENCE',
    meaning: 'Adres anlaşılır fakat doğrulama önerilir',
  }),
  Object.freeze({
    id: 'LOW_CONFIDENCE',
    title: 'LOW_CONFIDENCE',
    meaning: 'Adres belirsiz; human review gerekir',
  }),
  Object.freeze({
    id: 'BLOCKED_FOR_GEOCODING',
    title: 'BLOCKED_FOR_GEOCODING',
    meaning: 'KVKK, çapraz organizasyon veya eksik alan nedeniyle bloklanır',
  }),
]);

export const ADDRESS_GEOCODING_CONFIDENCE_RISK_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'MISSING_CITY', title: 'MISSING_CITY', meaning: 'İl eksik' }),
  Object.freeze({ id: 'MISSING_DISTRICT', title: 'MISSING_DISTRICT', meaning: 'İlçe eksik' }),
  Object.freeze({ id: 'MISSING_STREET_OR_NEIGHBORHOOD', title: 'MISSING_STREET_OR_NEIGHBORHOOD', meaning: 'Sokak / mahalle eksik' }),
  Object.freeze({ id: 'AMBIGUOUS_LANDMARK', title: 'AMBIGUOUS_LANDMARK', meaning: 'Tarif / landmark belirsiz' }),
  Object.freeze({ id: 'DUPLICATE_ADDRESS', title: 'DUPLICATE_ADDRESS', meaning: 'Tekrarlı adres' }),
  Object.freeze({ id: 'POSSIBLE_MULTI_MATCH', title: 'POSSIBLE_MULTI_MATCH', meaning: 'Birden fazla eşleşme olasılığı' }),
  Object.freeze({ id: 'PERSONAL_DATA_EXPOSURE', title: 'PERSONAL_DATA_EXPOSURE', meaning: 'Kişisel veri maruziyeti' }),
  Object.freeze({ id: 'CROSS_ORGANIZATION_RISK', title: 'CROSS_ORGANIZATION_RISK', meaning: 'Çapraz organizasyon riski' }),
  Object.freeze({ id: 'KVKK_CONSENT_UNKNOWN', title: 'KVKK_CONSENT_UNKNOWN', meaning: 'KVKK / izin belirsiz' }),
  Object.freeze({ id: 'TOO_SHORT_ADDRESS', title: 'TOO_SHORT_ADDRESS', meaning: 'Adres çok kısa' }),
  Object.freeze({ id: 'TOO_LONG_FREE_TEXT', title: 'TOO_LONG_FREE_TEXT', meaning: 'Serbest metin çok uzun' }),
  Object.freeze({ id: 'TURKISH_CHARACTER_OR_TYPING_RISK', title: 'TURKISH_CHARACTER_OR_TYPING_RISK', meaning: 'Türkçe karakter / yazım riski' }),
  Object.freeze({ id: 'MANUAL_REVIEW_REQUIRED', title: 'MANUAL_REVIEW_REQUIRED', meaning: 'Manuel inceleme gerekiyor' }),
]);

export const ADDRESS_GEOCODING_CONFIDENCE_HUMAN_REVIEW_STATES = Object.freeze([
  Object.freeze({ id: 'HUMAN_REVIEW_REQUIRED', title: 'HUMAN_REVIEW_REQUIRED', meaning: 'İnsan incelemesi gerekir' }),
  Object.freeze({ id: 'KVKK_REVIEW_REQUIRED', title: 'KVKK_REVIEW_REQUIRED', meaning: 'KVKK / veri güvenliği incelemesi gerekir' }),
  Object.freeze({ id: 'CROSS_ORGANIZATION_REVIEW_REQUIRED', title: 'CROSS_ORGANIZATION_REVIEW_REQUIRED', meaning: 'Çapraz organizasyon incelemesi gerekir' }),
  Object.freeze({ id: 'AMBIGUOUS_ADDRESS_REVIEW_REQUIRED', title: 'AMBIGUOUS_ADDRESS_REVIEW_REQUIRED', meaning: 'Adres belirsizliği incelenmelidir' }),
  Object.freeze({ id: 'BLOCKED_FOR_GEOCODING', title: 'BLOCKED_FOR_GEOCODING', meaning: 'Geocoding için bloklu durum' }),
]);

export const ADDRESS_GEOCODING_CONFIDENCE_TASK_CATEGORIES = Object.freeze([
  Object.freeze({
    id: 'ADDRESS_READINESS_EXPLAIN',
    title: 'ADDRESS_READINESS_EXPLAIN',
    meaning: 'Adres hazır mı açıklar',
  }),
  Object.freeze({
    id: 'CONFIDENCE_CLASSIFY',
    title: 'CONFIDENCE_CLASSIFY',
    meaning: 'Confidence band sınıflar',
  }),
  Object.freeze({
    id: 'RISK_FLAG_SUMMARY',
    title: 'RISK_FLAG_SUMMARY',
    meaning: 'Risk flag özetini çıkarır',
  }),
  Object.freeze({
    id: 'MISSING_ADDRESS_FIELD_REPORT',
    title: 'MISSING_ADDRESS_FIELD_REPORT',
    meaning: 'Eksik adres alanlarını listeler',
  }),
  Object.freeze({
    id: 'DUPLICATE_ADDRESS_HINT',
    title: 'DUPLICATE_ADDRESS_HINT',
    meaning: 'Tekrarlı adres ipuçlarını gösterir',
  }),
  Object.freeze({
    id: 'MANUAL_REVIEW_LIST',
    title: 'MANUAL_REVIEW_LIST',
    meaning: 'Manuel inceleme listesini hazırlar',
  }),
  Object.freeze({
    id: 'GEOCODE_PREP_CHECKLIST',
    title: 'GEOCODE_PREP_CHECKLIST',
    meaning: 'Geocode hazırlık checklisti hazırlar',
  }),
  Object.freeze({
    id: 'NEXT_STEP_RECOMMENDATION',
    title: 'NEXT_STEP_RECOMMENDATION',
    meaning: 'Sıradaki güvenli adımı önerir',
  }),
  Object.freeze({
    id: 'HUMAN_APPROVAL_REQUIRED',
    title: 'HUMAN_APPROVAL_REQUIRED',
    meaning: 'İnsan onayı gerektiğini söyler',
  }),
]);

export const ADDRESS_GEOCODING_CONFIDENCE_GUARD_REQUIREMENTS = Object.freeze([
  'explicit human approval',
  'role / RBAC scope check',
  'tenant / organization boundary check',
  'field-level privacy minimization',
  'dry-run / preview payload',
  'risk summary',
  'audit log',
  'before/after snapshot',
  'rollback / undo note',
  'no silent execution',
  'no hidden background action',
  'no secret / token exposure',
  'no geocode provider call',
  'no map API call',
  'no OSRM call',
  'no DB write',
  'no lat/lng persistence',
  'no route apply',
  'no stop create',
  'no SMS/email/push',
  'no runtime AI action',
  'no tool execution',
  'no write-action dispatcher',
  'KVKK / privacy minimization',
]);

export const ADDRESS_GEOCODING_CONFIDENCE_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Tek tıkla geocoding, route draft ve karar üretir gibi bir overclaim yok.',
  'Sefer Abi adresi yorumlar; kesin geocode sonucu vaat etmez.',
  'Testle kanıtlanmamış runtime geocoding public dokümanda vaat edilmez.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Kritik işlemler ayrı milestone, guard, audit log ve rollback modeli olmadan açılmaz.',
]);

export const ADDRESS_GEOCODING_CONFIDENCE_BLOCKED_ACTIONS = Object.freeze([
  'runtime geocode execute',
  'geocode provider call',
  'map API call',
  'OSRM route apply',
  'lat/lng write',
  'DB write',
  'stop create execute',
  'route draft create/apply',
  'Excel/CSV import execute',
  'demand create execute',
  'shift/personel create execute',
  'RFQ send',
  'offer accept/reject',
  'agreement/contract execute',
  'dispatch apply',
  'payment/hakediş execute',
  'SMS/email/push',
  'provider credential management',
  'user/account/admin write-action',
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'cross-organization write',
]);

export const ADDRESS_GEOCODING_CONFIDENCE_NEVER_AUTOMATE = Object.freeze([
  'otomatik geocode commit',
  'otomatik lat/lng write',
  'otomatik route apply',
  'otomatik stop create',
  'otomatik RFQ gönderimi',
  'otomatik teklif kabulü',
  'otomatik sözleşme bağlama',
  'otomatik dispatch uygulama',
  'otomatik ödeme / hakediş',
  'otomatik mesaj gönderimi',
  'otomatik provider credential yönetimi',
  'otomatik kullanıcı / rol / admin yazma',
  'otomatik cross-organization erişim',
]);

export const ADDRESS_GEOCODING_CONFIDENCE_HANOFFS = Object.freeze([
  'COPILOT-EXCEL-DEMAND-IMPORT-01',
  'COPILOT-STOP-ROUTE-DRAFT-01',
  'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
  'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
  'COPILOT-DEMAND-INTAKE-01',
]);

export const ADDRESS_GEOCODING_CONFIDENCE_COMPATIBILITY = Object.freeze([
  'COPILOT-EXCEL-DEMAND-IMPORT-01',
  'COPILOT-HUMAN-APPROVAL-01',
  'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01',
]);

function buildAddressGeocodingConfidenceRole(role, config) {
  return Object.freeze({
    role,
    visible: config.visible !== false,
    ADDRESS_READINESS_EXPLAIN: Object.freeze(Array.isArray(config.ADDRESS_READINESS_EXPLAIN) ? [...config.ADDRESS_READINESS_EXPLAIN] : []),
    NORMALIZATION_SIGNALS: Object.freeze(Array.isArray(config.NORMALIZATION_SIGNALS) ? [...config.NORMALIZATION_SIGNALS] : []),
    CONFIDENCE_BANDS: Object.freeze(Array.isArray(config.CONFIDENCE_BANDS) ? [...config.CONFIDENCE_BANDS] : []),
    RISK_CATEGORIES: Object.freeze(Array.isArray(config.RISK_CATEGORIES) ? [...config.RISK_CATEGORIES] : []),
    HUMAN_APPROVAL_REQUIRED: Object.freeze(Array.isArray(config.HUMAN_APPROVAL_REQUIRED) ? [...config.HUMAN_APPROVAL_REQUIRED] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...ADDRESS_GEOCODING_CONFIDENCE_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...ADDRESS_GEOCODING_CONFIDENCE_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const ADDRESS_GEOCODING_CONFIDENCE_POLICY = Object.freeze({
  SUPER_ADMIN: buildAddressGeocodingConfidenceRole('SUPER_ADMIN', {
    ADDRESS_READINESS_EXPLAIN: [
      'platform-wide address quality dictionary',
      'cross-tenant risk signals',
      'review queue health',
    ],
    NORMALIZATION_SIGNALS: [
      'city / district completeness',
      'duplicate and privacy exposure',
      'typing / Turkish character risk',
    ],
    CONFIDENCE_BANDS: [
      'high / medium / low / blocked',
    ],
    RISK_CATEGORIES: [
      'cross-organization risk',
      'KVKK / privacy exposure',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-tenant review decision',
      'privacy escalation',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'runtime geocode execute',
      'map API call',
      'OSRM route apply',
      'user/account/admin write-action',
    ],
  }),
  COMPANY: buildAddressGeocodingConfidenceRole('COMPANY', {
    ADDRESS_READINESS_EXPLAIN: [
      'personel service address readiness',
      'missing city / district / street / landmark',
    ],
    NORMALIZATION_SIGNALS: [
      'company location label',
      'duplicate address hint',
      'typo / Turkish character risk',
    ],
    CONFIDENCE_BANDS: [
      'high / medium / low / blocked',
    ],
    RISK_CATEGORIES: [
      'missing city',
      'missing district',
      'KVKK / privacy exposure',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'geocode commit',
      'route draft apply',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'runtime geocode execute',
      'lat/lng write',
      'route apply',
      'demand create execute',
    ],
  }),
  ROOM: buildAddressGeocodingConfidenceRole('ROOM', {
    ADDRESS_READINESS_EXPLAIN: [
      'stop / route draft readiness',
      'address quality and confidence preview',
    ],
    NORMALIZATION_SIGNALS: [
      'landmark / meetup point',
      'duplicate route candidate',
      'multi-match risk',
    ],
    CONFIDENCE_BANDS: [
      'high / medium / low / blocked',
    ],
    RISK_CATEGORIES: [
      'ambiguous landmark',
      'possible multi match',
      'manual review required',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'stop / route draft review',
      'geocode handoff approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'dispatch apply',
      'route apply',
      'stop create execute',
      'runtime geocode execute',
    ],
  }),
  DRIVER: buildAddressGeocodingConfidenceRole('DRIVER', {
    visible: false,
    ADDRESS_READINESS_EXPLAIN: [
      'driver-facing roadmap is hidden',
    ],
    NORMALIZATION_SIGNALS: [
      'not exposed',
    ],
    CONFIDENCE_BANDS: [
      'not exposed',
    ],
    RISK_CATEGORIES: [
      'not exposed',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'not exposed',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'stop reached/skipped/complete',
      'driver/vehicle assignment',
    ],
    NEVER_AUTOMATE: [
      'driver-side address geocoding roadmap exposure',
    ],
  }),
  PERSONEL: buildAddressGeocodingConfidenceRole('PERSONEL', {
    visible: false,
    ADDRESS_READINESS_EXPLAIN: [
      'personel-facing roadmap is hidden',
    ],
    NORMALIZATION_SIGNALS: [
      'not exposed',
    ],
    CONFIDENCE_BANDS: [
      'not exposed',
    ],
    RISK_CATEGORIES: [
      'not exposed',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'hidden visibility request',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
      'admin action',
    ],
    NEVER_AUTOMATE: [
      'başka kişi adına erişim',
    ],
  }),
  PARENT: buildAddressGeocodingConfidenceRole('PARENT', {
    visible: false,
    ADDRESS_READINESS_EXPLAIN: [
      'parent-facing roadmap is hidden',
    ],
    NORMALIZATION_SIGNALS: [
      'not exposed',
    ],
    CONFIDENCE_BANDS: [
      'not exposed',
    ],
    RISK_CATEGORIES: [
      'not exposed',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'hidden visibility request',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
      'admin action',
    ],
    NEVER_AUTOMATE: [
      'başka kişi adına erişim',
    ],
  }),
  SCHOOL: buildAddressGeocodingConfidenceRole('SCHOOL', {
    ADDRESS_READINESS_EXPLAIN: [
      'school transport plan address readiness',
      'cross-organization risk boundary',
    ],
    NORMALIZATION_SIGNALS: [
      'campus / class / group address cues',
      'privacy / consent signal',
    ],
    CONFIDENCE_BANDS: [
      'high / medium / low / blocked',
    ],
    RISK_CATEGORIES: [
      'cross-organization risk',
      'KVKK / consent unknown',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'public / shared dışı karar',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'cross-organization write',
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
    ],
  }),
  ORGANIZATION: buildAddressGeocodingConfidenceRole('ORGANIZATION', {
    ADDRESS_READINESS_EXPLAIN: [
      'organization transport plan address readiness',
      'cross-organization risk boundary',
    ],
    NORMALIZATION_SIGNALS: [
      'unit / location address cues',
      'privacy / consent signal',
    ],
    CONFIDENCE_BANDS: [
      'high / medium / low / blocked',
    ],
    RISK_CATEGORIES: [
      'cross-organization risk',
      'KVKK / consent unknown',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'public / shared dışı karar',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'cross-organization write',
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
    ],
  }),
});

export function listAddressGeocodingConfidenceRoles() {
  return Object.keys(ADDRESS_GEOCODING_CONFIDENCE_POLICY);
}

export function getAddressGeocodingConfidencePolicy(role) {
  return ADDRESS_GEOCODING_CONFIDENCE_POLICY[String(role || '').trim().toUpperCase()] || null;
}
