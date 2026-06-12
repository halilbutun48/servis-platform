export const COPILOT_EXCEL_DEMAND_IMPORT_VERSION = 'COPILOT-EXCEL-DEMAND-IMPORT-01';

export const COPILOT_EXCEL_DEMAND_IMPORT_STAGES = Object.freeze([
  Object.freeze({
    id: 'STAGE_1',
    title: 'File Understanding',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_2',
    title: 'Column Mapping',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_3',
    title: 'Data Quality',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_4',
    title: 'Address Readiness',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_5',
    title: 'Demand Preview',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_6',
    title: 'Human Approval Gate',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_7',
    title: 'Next Milestone Handoff',
    status: 'current baseline',
    futureOnly: false,
  }),
]);

export const COPILOT_EXCEL_DEMAND_IMPORT_CATEGORIES = Object.freeze([
  Object.freeze({
    id: 'READINESS_EXPLAIN',
    title: 'READINESS_EXPLAIN',
    meaning: 'Excel/CSV hazırlık durumunu açıklar',
  }),
  Object.freeze({
    id: 'COLUMN_MAP_PREPARE',
    title: 'COLUMN_MAP_PREPARE',
    meaning: 'Kolon eşleme önerisini hazırlar',
  }),
  Object.freeze({
    id: 'DATA_QUALITY_SUMMARY',
    title: 'DATA_QUALITY_SUMMARY',
    meaning: 'Veri kalite özetini hazırlar',
  }),
  Object.freeze({
    id: 'MISSING_FIELD_REPORT',
    title: 'MISSING_FIELD_REPORT',
    meaning: 'Eksik alan raporu çıkarır',
  }),
  Object.freeze({
    id: 'DUPLICATE_RISK_REPORT',
    title: 'DUPLICATE_RISK_REPORT',
    meaning: 'Tekrar ve çakışma riskini açıklar',
  }),
  Object.freeze({
    id: 'ADDRESS_READINESS_REPORT',
    title: 'ADDRESS_READINESS_REPORT',
    meaning: 'Adreslerin geocode readiness durumunu açıklar',
  }),
  Object.freeze({
    id: 'KVKK_CONSENT_WARNING',
    title: 'KVKK_CONSENT_WARNING',
    meaning: 'KVKK / izin belirsizliği uyarısı verir',
  }),
  Object.freeze({
    id: 'DEMAND_PREVIEW',
    title: 'DEMAND_PREVIEW',
    meaning: 'Talep hazırlık önizlemesini sunar',
  }),
  Object.freeze({
    id: 'HUMAN_APPROVAL_REQUIRED',
    title: 'HUMAN_APPROVAL_REQUIRED',
    meaning: 'Gerçek import/write için insan onayı gerektiğini söyler',
  }),
]);

export const COPILOT_EXCEL_DEMAND_IMPORT_COLUMN_MODEL = Object.freeze({
  required: Object.freeze([
    'ad soyad / personel adı',
    'adres / servis adresi / durak adresi',
  ]),
  optional: Object.freeze([
    'telefon',
    'departman / grup / sınıf / organizasyon birimi',
    'vardiya tarihi',
    'vardiya saati',
    'yön: sabah inbound / akşam outbound',
    'not / özel ihtiyaç',
    'servis tipi',
    'KVKK / izin sinyali',
    'şirket / okul / organizasyon lokasyonu',
  ]),
  derived: Object.freeze([
    'kapasite / kişi sayısı',
    'geocode readiness',
    'demand preview summary',
  ]),
  ambiguous: Object.freeze([
    'birim',
    'grup',
    'sınıf',
    'lokasyon',
    'adres',
    'servis adresi',
  ]),
  risky: Object.freeze([
    'ad soyad',
    'telefon',
    'adres',
    'KVKK / izin',
    'organizasyon içi / dışı ayrımı',
    'özel ihtiyaç',
  ]),
  humanApprovalRequired: Object.freeze([
    'import execute',
    'geocode commit',
    'route draft apply',
    'cross-organization write',
    'personel / öğrenci eşleştirme',
  ]),
});

export const COPILOT_EXCEL_DEMAND_IMPORT_QUALITY_CHECKS = Object.freeze([
  'empty name / address',
  'duplicate person',
  'duplicate address',
  'missing phone',
  'missing shift time',
  'missing direction',
  'ambiguous address',
  'missing city / district',
  'too long / too short address',
  'KVKK / consent ambiguity',
  'cross-organization data risk',
  'capacity estimate ambiguity',
]);

export const COPILOT_EXCEL_DEMAND_IMPORT_ADDRESS_READINESS_STATES = Object.freeze([
  'geocode ready',
  'missing',
  'risky',
  'human review required',
]);

export const COPILOT_EXCEL_DEMAND_IMPORT_GUARD_REQUIREMENTS = Object.freeze([
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
  'no file upload endpoint',
  'no import executor',
  'no route/service/schema mutation',
  'no Prisma write',
  'no runtime AI action',
  'no tool execution',
  'no write-action dispatcher',
  'KVKK / privacy minimization',
]);

export const COPILOT_EXCEL_DEMAND_IMPORT_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Tek tıkla dosya yükle ve her şey otomatik olsun vaadi yok.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi hazırlık ve önizleme üretir; gerçek import/write ayrı human approval milestone’larına kalır.',
  'Nihai karar kullanıcıdadır.',
  'Testle kanıtlanmamış runtime import kabiliyeti public dokümanda vaat edilmez.',
]);

export const COPILOT_EXCEL_DEMAND_IMPORT_BLOCKED_ACTIONS = Object.freeze([
  'runtime Excel/CSV import execute',
  'file upload endpoint',
  'DB write',
  'demand create execute',
  'shift create execute',
  'stop create execute',
  'route draft create/apply',
  'geocode execute/commit',
  'lat/lng write',
  'OSRM route apply',
  'RFQ send',
  'offer accept/reject',
  'agreement/contract execute',
  'dispatch apply',
  'payment/hakediş execute',
  'SMS/email/push',
  'provider credential management',
  'user/account/admin write-action',
  'cross-organization write',
  'supplier auto-selection',
  'driver/vehicle assignment',
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
]);

export const COPILOT_EXCEL_DEMAND_IMPORT_NEVER_AUTOMATE = Object.freeze([
  'dosya yüklenince otomatik kayıt',
  'otomatik talep oluşturma',
  'otomatik geocode commit',
  'otomatik durak / route apply',
  'otomatik RFQ gönderimi',
  'otomatik teklif kabulü',
  'otomatik sözleşme bağlama',
  'otomatik dispatch uygulama',
  'otomatik ödeme / hakediş',
  'otomatik mesaj gönderimi',
  'otomatik provider credential yönetimi',
  'otomatik kullanıcı / rol / admin yazma',
]);

export const COPILOT_EXCEL_DEMAND_IMPORT_HANOFFS = Object.freeze([
  'ADDRESS-GEOCODING-CONFIDENCE-01',
  'COPILOT-STOP-ROUTE-DRAFT-01',
  'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
  'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
  'COPILOT-DEMAND-INTAKE-01',
]);

function buildExcelDemandImportRole(role, config) {
  return Object.freeze({
    role,
    visible: config.visible !== false,
    READINESS_EXPLAIN: Object.freeze(Array.isArray(config.READINESS_EXPLAIN) ? [...config.READINESS_EXPLAIN] : []),
    COLUMN_MAP_PREPARE: Object.freeze(Array.isArray(config.COLUMN_MAP_PREPARE) ? [...config.COLUMN_MAP_PREPARE] : []),
    DATA_QUALITY_SUMMARY: Object.freeze(Array.isArray(config.DATA_QUALITY_SUMMARY) ? [...config.DATA_QUALITY_SUMMARY] : []),
    MISSING_FIELD_REPORT: Object.freeze(Array.isArray(config.MISSING_FIELD_REPORT) ? [...config.MISSING_FIELD_REPORT] : []),
    DUPLICATE_RISK_REPORT: Object.freeze(Array.isArray(config.DUPLICATE_RISK_REPORT) ? [...config.DUPLICATE_RISK_REPORT] : []),
    ADDRESS_READINESS_REPORT: Object.freeze(Array.isArray(config.ADDRESS_READINESS_REPORT) ? [...config.ADDRESS_READINESS_REPORT] : []),
    KVKK_CONSENT_WARNING: Object.freeze(Array.isArray(config.KVKK_CONSENT_WARNING) ? [...config.KVKK_CONSENT_WARNING] : []),
    DEMAND_PREVIEW: Object.freeze(Array.isArray(config.DEMAND_PREVIEW) ? [...config.DEMAND_PREVIEW] : []),
    HUMAN_APPROVAL_REQUIRED: Object.freeze(Array.isArray(config.HUMAN_APPROVAL_REQUIRED) ? [...config.HUMAN_APPROVAL_REQUIRED] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...COPILOT_EXCEL_DEMAND_IMPORT_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...COPILOT_EXCEL_DEMAND_IMPORT_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const COPILOT_EXCEL_DEMAND_IMPORT_POLICY = Object.freeze({
  SUPER_ADMIN: buildExcelDemandImportRole('SUPER_ADMIN', {
    READINESS_EXPLAIN: [
      'platform-wide import readiness standard',
      'cross-tenant risk signals',
      'KVKK / privacy risk',
    ],
    COLUMN_MAP_PREPARE: [
      'standard column family for import readiness',
      'column alias normalization',
    ],
    DATA_QUALITY_SUMMARY: [
      'quality summary and risk controls',
    ],
    MISSING_FIELD_REPORT: [
      'missing required field list',
    ],
    DUPLICATE_RISK_REPORT: [
      'duplicate / overlap risk summary',
    ],
    ADDRESS_READINESS_REPORT: [
      'organization-level address readiness',
      'cross-tenant location risk',
    ],
    KVKK_CONSENT_WARNING: [
      'tenant / consent uncertainty',
    ],
    DEMAND_PREVIEW: [
      'platform import readiness overview',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization import approval',
      'risk sign-off',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'user/account/admin write-action',
      'cross-organization write',
      'provider credential management',
    ],
  }),
  COMPANY: buildExcelDemandImportRole('COMPANY', {
    READINESS_EXPLAIN: [
      'personnel service demand import readiness',
      'what is missing before import',
    ],
    COLUMN_MAP_PREPARE: [
      'name, address, phone, shift and direction mapping',
      'company-level column alias suggestions',
    ],
    DATA_QUALITY_SUMMARY: [
      'company demand quality summary',
    ],
    MISSING_FIELD_REPORT: [
      'missing name / address / shift detail report',
    ],
    DUPLICATE_RISK_REPORT: [
      'duplicate person or duplicate address risk',
    ],
    ADDRESS_READINESS_REPORT: [
      'geocode readiness for company addresses',
    ],
    KVKK_CONSENT_WARNING: [
      'consent ambiguity and privacy warning',
    ],
    DEMAND_PREVIEW: [
      'company demand preview and counts',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'real import',
      'talep oluşturma',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'demand create execute',
      'Excel/CSV import execute',
      'shift create execute',
      'route draft create/apply',
    ],
  }),
  ROOM: buildExcelDemandImportRole('ROOM', {
    READINESS_EXPLAIN: [
      'operator-facing demand preparation signals',
      'future route and stop quality cues',
    ],
    COLUMN_MAP_PREPARE: [
      'stop, route and driver-readiness related aliases',
    ],
    DATA_QUALITY_SUMMARY: [
      'operational quality summary',
    ],
    MISSING_FIELD_REPORT: [
      'missing address / direction / shift detail',
    ],
    DUPLICATE_RISK_REPORT: [
      'duplicate address or duplicate rider risk',
    ],
    ADDRESS_READINESS_REPORT: [
      'geocode readiness without commit',
    ],
    KVKK_CONSENT_WARNING: [
      'private data and consent warning',
    ],
    DEMAND_PREVIEW: [
      'route preparation preview',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'route draft review',
      'import execution approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'dispatch apply',
      'route apply',
      'driver/vehicle assignment',
      'stop create execute',
    ],
  }),
  DRIVER: buildExcelDemandImportRole('DRIVER', {
    visible: false,
    READINESS_EXPLAIN: [
      'roadmap hidden for driver-facing surface',
    ],
    COLUMN_MAP_PREPARE: [
      'not exposed',
    ],
    DATA_QUALITY_SUMMARY: [
      'not exposed',
    ],
    MISSING_FIELD_REPORT: [
      'not exposed',
    ],
    DUPLICATE_RISK_REPORT: [
      'not exposed',
    ],
    ADDRESS_READINESS_REPORT: [
      'not exposed',
    ],
    KVKK_CONSENT_WARNING: [
      'not exposed',
    ],
    DEMAND_PREVIEW: [
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
      'driver-side demand import roadmap exposure',
    ],
  }),
  PERSONEL: buildExcelDemandImportRole('PERSONEL', {
    visible: false,
    READINESS_EXPLAIN: [
      'roadmap hidden for personel-facing surface',
    ],
    COLUMN_MAP_PREPARE: [
      'not exposed',
    ],
    DATA_QUALITY_SUMMARY: [
      'not exposed',
    ],
    MISSING_FIELD_REPORT: [
      'not exposed',
    ],
    DUPLICATE_RISK_REPORT: [
      'not exposed',
    ],
    ADDRESS_READINESS_REPORT: [
      'not exposed',
    ],
    KVKK_CONSENT_WARNING: [
      'KVKK / privacy warning only',
    ],
    DEMAND_PREVIEW: [
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
  PARENT: buildExcelDemandImportRole('PARENT', {
    visible: false,
    READINESS_EXPLAIN: [
      'roadmap hidden for parent-facing surface',
    ],
    COLUMN_MAP_PREPARE: [
      'not exposed',
    ],
    DATA_QUALITY_SUMMARY: [
      'not exposed',
    ],
    MISSING_FIELD_REPORT: [
      'not exposed',
    ],
    DUPLICATE_RISK_REPORT: [
      'not exposed',
    ],
    ADDRESS_READINESS_REPORT: [
      'not exposed',
    ],
    KVKK_CONSENT_WARNING: [
      'KVKK / privacy warning only',
    ],
    DEMAND_PREVIEW: [
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
  SCHOOL: buildExcelDemandImportRole('SCHOOL', {
    READINESS_EXPLAIN: [
      'school transport plan readiness',
      'personnel / student data readiness',
    ],
    COLUMN_MAP_PREPARE: [
      'class / group / student / parent aliases',
    ],
    DATA_QUALITY_SUMMARY: [
      'school plan quality summary',
    ],
    MISSING_FIELD_REPORT: [
      'missing class / group / location details',
    ],
    DUPLICATE_RISK_REPORT: [
      'duplicate class, student or address risk',
    ],
    ADDRESS_READINESS_REPORT: [
      'school address readiness',
    ],
    KVKK_CONSENT_WARNING: [
      'student / parent privacy warning',
    ],
    DEMAND_PREVIEW: [
      'school demand preview',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'public / shared dışı karar',
      'import execution approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'cross-organization data access',
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
    ],
  }),
  ORGANIZATION: buildExcelDemandImportRole('ORGANIZATION', {
    READINESS_EXPLAIN: [
      'organization transport plan readiness',
      'personnel / group data readiness',
    ],
    COLUMN_MAP_PREPARE: [
      'group / unit / location aliases',
    ],
    DATA_QUALITY_SUMMARY: [
      'organization plan quality summary',
    ],
    MISSING_FIELD_REPORT: [
      'missing group / unit / location details',
    ],
    DUPLICATE_RISK_REPORT: [
      'duplicate group or duplicate address risk',
    ],
    ADDRESS_READINESS_REPORT: [
      'organization address readiness',
    ],
    KVKK_CONSENT_WARNING: [
      'cross-tenant privacy warning',
    ],
    DEMAND_PREVIEW: [
      'organization demand preview',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'public / shared dışı karar',
      'import execution approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'cross-organization data access',
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
    ],
  }),
});

export function listCopilotExcelDemandImportRoles() {
  return Object.freeze(Object.keys(COPILOT_EXCEL_DEMAND_IMPORT_POLICY));
}

export function getCopilotExcelDemandImportPolicy(role) {
  return COPILOT_EXCEL_DEMAND_IMPORT_POLICY[String(role || '').trim().toUpperCase()] || null;
}
