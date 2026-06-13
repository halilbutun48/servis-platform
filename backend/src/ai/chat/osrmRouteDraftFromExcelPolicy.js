export const OSRM_ROUTE_DRAFT_FROM_EXCEL_VERSION = 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01';

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_STAGES = Object.freeze([
  Object.freeze({ id: 'STAGE_1', label: 'STAGE 1 — Source Draft Readiness', title: 'Source Draft Readiness', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_2', label: 'STAGE 2 — Coordinate Readiness', title: 'Coordinate Readiness', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_3', label: 'STAGE 3 — Direction-Specific OSRM Input Model', title: 'Direction-Specific OSRM Input Model', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_4', label: 'STAGE 4 — Hub and Stop Sequence Readiness', title: 'Hub and Stop Sequence Readiness', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_5', label: 'STAGE 5 — OSRM Risk Categories', title: 'OSRM Risk Categories', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_6', label: 'STAGE 6 — Route Draft Preview Readiness', title: 'Route Draft Preview Readiness', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_7', label: 'STAGE 7 — Human Review Gate', title: 'Human Review Gate', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_8', label: 'STAGE 8 — Handoff to Next Milestones', title: 'Handoff to Next Milestones', status: 'current baseline', futureOnly: false }),
]);

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_DIRECTION_MODEL = Object.freeze({
  INBOUND: Object.freeze(['sabah inbound servis yönü', 'durak/adres adayları -> hub', 'pickup odaklı hazırlık']),
  OUTBOUND: Object.freeze(['akşam outbound servis yönü', 'hub -> durak/adres adayları', 'dropoff odaklı hazırlık']),
  NO_RING_ASSUMPTION: Object.freeze(['ring varsayımı yok']),
  NO_DEPOT_ASSUMPTION: Object.freeze(['araç deposu zorunlu varsayımı yok']),
  MISSING_DIRECTION: Object.freeze(['direction eksikse manual review required']),
});

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_COORDINATE_READINESS = Object.freeze([
  'HIGH_CONFIDENCE',
  'MEDIUM_CONFIDENCE',
  'LOW_CONFIDENCE',
  'BLOCKED_FOR_GEOCODING',
]);

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_RISK_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'MISSING_COORDINATE', title: 'MISSING_COORDINATE', meaning: 'Güvenilir lat/lng eksik' }),
  Object.freeze({ id: 'LOW_CONFIDENCE_COORDINATE', title: 'LOW_CONFIDENCE_COORDINATE', meaning: 'Coordinate güveni düşük' }),
  Object.freeze({ id: 'BLOCKED_ADDRESS', title: 'BLOCKED_ADDRESS', meaning: 'Adres geocoding için bloklu' }),
  Object.freeze({ id: 'MISSING_HUB', title: 'MISSING_HUB', meaning: 'Hub konumu eksik' }),
  Object.freeze({ id: 'MISSING_DIRECTION', title: 'MISSING_DIRECTION', meaning: 'Direction sinyali eksik' }),
  Object.freeze({ id: 'TOO_FEW_STOPS', title: 'TOO_FEW_STOPS', meaning: 'Yetersiz durak sayısı' }),
  Object.freeze({ id: 'TOO_MANY_STOPS', title: 'TOO_MANY_STOPS', meaning: 'Aşırı durak sayısı' }),
  Object.freeze({ id: 'DUPLICATE_WAYPOINT', title: 'DUPLICATE_WAYPOINT', meaning: 'Tekrarlı waypoint' }),
  Object.freeze({ id: 'POSSIBLE_OUTLIER_STOP', title: 'POSSIBLE_OUTLIER_STOP', meaning: 'Aykırı durak olasılığı' }),
  Object.freeze({ id: 'CROSS_ORGANIZATION_ROUTE_RISK', title: 'CROSS_ORGANIZATION_ROUTE_RISK', meaning: 'Çapraz organizasyon rota riski' }),
  Object.freeze({ id: 'KVKK_CONSENT_UNKNOWN', title: 'KVKK_CONSENT_UNKNOWN', meaning: 'KVKK / izin belirsiz' }),
  Object.freeze({ id: 'MANUAL_REVIEW_REQUIRED', title: 'MANUAL_REVIEW_REQUIRED', meaning: 'Manuel inceleme gerekiyor' }),
  Object.freeze({ id: 'OSRM_EXECUTION_NOT_ALLOWED', title: 'OSRM_EXECUTION_NOT_ALLOWED', meaning: 'OSRM execution bu milestone’da açılmaz' }),
]);

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_TASK_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'OSRM_READINESS_EXPLAIN', title: 'OSRM_READINESS_EXPLAIN', meaning: 'OSRM route draft readiness durumunu açıklar' }),
  Object.freeze({ id: 'COORDINATE_READINESS_REPORT', title: 'COORDINATE_READINESS_REPORT', meaning: 'lat/lng readiness raporu üretir' }),
  Object.freeze({ id: 'DIRECTION_OSRM_INPUT_EXPLAIN', title: 'DIRECTION_OSRM_INPUT_EXPLAIN', meaning: 'sabah inbound / akşam outbound modelini açıklar' }),
  Object.freeze({ id: 'HUB_AND_STOP_SEQUENCE_READINESS', title: 'HUB_AND_STOP_SEQUENCE_READINESS', meaning: 'Hub ve stop sequence hazırlığını özetler' }),
  Object.freeze({ id: 'OSRM_RISK_SUMMARY', title: 'OSRM_RISK_SUMMARY', meaning: 'OSRM input risklerini listeler' }),
  Object.freeze({ id: 'OUTLIER_STOP_HINT', title: 'OUTLIER_STOP_HINT', meaning: 'Olası aykırı durakları işaretler' }),
  Object.freeze({ id: 'MANUAL_REVIEW_LIST', title: 'MANUAL_REVIEW_LIST', meaning: 'İnsan kontrolü gereken adayları listeler' }),
  Object.freeze({ id: 'ROUTE_PREVIEW_READINESS', title: 'ROUTE_PREVIEW_READINESS', meaning: 'Route preview için hazır olup olmadığını açıklar' }),
  Object.freeze({ id: 'HUMAN_APPROVAL_REQUIRED', title: 'HUMAN_APPROVAL_REQUIRED', meaning: 'İnsan onayı gerektiğini söyler' }),
]);

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_GUARD_REQUIREMENTS = Object.freeze([
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
  'no runtime AI action',
  'no tool execution',
  'no write-action dispatcher',
  'no OSRM call',
  'no route preview executor',
  'no route apply',
  'no route draft create',
  'no stop create',
  'no geocode execute',
  'no lat/lng persistence',
  'no DB write',
  'KVKK / privacy minimization',
]);

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Tek tıkla Excel’den otomatik rota oluşturur vaadi yok.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_BLOCKED_ACTIONS = Object.freeze([
  'runtime OSRM route calculation',
  'OSRM table/match/route call',
  'route preview generation',
  'distance/duration/polyline generation',
  'route draft create',
  'route draft apply',
  'route apply',
  'stop create',
  'geocode execute',
  'lat/lng write',
  'DB write',
  'demand create execute',
  'shift/personel create execute',
  'driver/vehicle assignment',
  'dispatch apply',
  'RFQ send',
  'offer accept/reject',
  'agreement/contract execute',
  'payment/hakediş execute',
  'SMS/email/push',
  'provider credential management',
  'user/account/admin write-action',
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'backend route/service/schema change',
  'Prisma/schema/migration change',
]);

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_NEVER_AUTOMATE = Object.freeze([
  'otomatik OSRM route calculation',
  'otomatik route preview üretimi',
  'otomatik distance/duration/polyline üretimi',
  'otomatik route draft create',
  'otomatik route apply',
  'otomatik stop create',
  'otomatik geocode commit',
  'otomatik lat/lng write',
  'otomatik dispatch uygulama',
  'otomatik atama',
  'otomatik mesaj gönderimi',
  'otomatik provider credential yönetimi',
  'otomatik kullanıcı / rol / admin yazma',
]);

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_HANOFFS = Object.freeze([
  'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
  'COPILOT-DEMAND-INTAKE-01',
  'COPILOT-RFQ-PREP-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
]);

function buildOsrmRouteDraftFromExcelRole(role, config) {
  return Object.freeze({
    role,
    visible: config.visible !== false,
    READ: Object.freeze(Array.isArray(config.READ) ? [...config.READ] : []),
    EXPLAIN: Object.freeze(Array.isArray(config.EXPLAIN) ? [...config.EXPLAIN] : []),
    RECOMMEND: Object.freeze(Array.isArray(config.RECOMMEND) ? [...config.RECOMMEND] : []),
    PREPARE: Object.freeze(Array.isArray(config.PREPARE) ? [...config.PREPARE] : []),
    DRAFT: Object.freeze(Array.isArray(config.DRAFT) ? [...config.DRAFT] : []),
    HUMAN_APPROVAL_REQUIRED: Object.freeze(Array.isArray(config.HUMAN_APPROVAL_REQUIRED) ? [...config.HUMAN_APPROVAL_REQUIRED] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...OSRM_ROUTE_DRAFT_FROM_EXCEL_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...OSRM_ROUTE_DRAFT_FROM_EXCEL_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
    DIRECTION_MODEL: Object.freeze(Array.isArray(config.DIRECTION_MODEL) ? [...config.DIRECTION_MODEL] : []),
    COORDINATE_READINESS: Object.freeze(Array.isArray(config.COORDINATE_READINESS) ? [...config.COORDINATE_READINESS] : []),
    RISK_CATEGORIES: Object.freeze(Array.isArray(config.RISK_CATEGORIES) ? [...config.RISK_CATEGORIES] : []),
    TASK_CATEGORIES: Object.freeze(Array.isArray(config.TASK_CATEGORIES) ? [...config.TASK_CATEGORIES] : []),
  });
}

export const OSRM_ROUTE_DRAFT_FROM_EXCEL_POLICY = Object.freeze({
  SUPER_ADMIN: buildOsrmRouteDraftFromExcelRole('SUPER_ADMIN', {
    READ: ['platform route draft readiness standard', 'cross-tenant OSRM risk and manual review queue', 'route preview readiness summary'],
    EXPLAIN: ['hangi coordinate veya hub eksik olduğunu açıklar', 'hangi direction modelinin riskli olduğunu açıklar', 'hangi OSRM input riskinin öncelikli olduğunu açıklar'],
    RECOMMEND: ['hangi safety check’in önce yapılacağını önerir', 'hangi manual review list’in açılacağını önerir', 'hangi güvenli handoff’un sonraki adım olduğunu önerir'],
    PREPARE: ['OSRM readiness note', 'route preview readiness note', 'manual review checklist'],
    DRAFT: ['readiness summary note', 'route preview explanation note'],
    HUMAN_APPROVAL_REQUIRED: ['cross-organization route readiness sign-off', 'OSRM route draft readiness approval'],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'NO_RING_ASSUMPTION', 'NO_DEPOT_ASSUMPTION', 'MISSING_DIRECTION'],
    COORDINATE_READINESS: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'BLOCKED_FOR_GEOCODING'],
    RISK_CATEGORIES: ['MISSING_COORDINATE', 'LOW_CONFIDENCE_COORDINATE', 'BLOCKED_ADDRESS', 'MISSING_HUB', 'MISSING_DIRECTION', 'TOO_FEW_STOPS', 'TOO_MANY_STOPS', 'DUPLICATE_WAYPOINT', 'POSSIBLE_OUTLIER_STOP', 'CROSS_ORGANIZATION_ROUTE_RISK', 'KVKK_CONSENT_UNKNOWN', 'MANUAL_REVIEW_REQUIRED', 'OSRM_EXECUTION_NOT_ALLOWED'],
    TASK_CATEGORIES: ['OSRM_READINESS_EXPLAIN', 'COORDINATE_READINESS_REPORT', 'DIRECTION_OSRM_INPUT_EXPLAIN', 'HUB_AND_STOP_SEQUENCE_READINESS', 'OSRM_RISK_SUMMARY', 'OUTLIER_STOP_HINT', 'MANUAL_REVIEW_LIST', 'ROUTE_PREVIEW_READINESS', 'HUMAN_APPROVAL_REQUIRED'],
  }),
  COMPANY: buildOsrmRouteDraftFromExcelRole('COMPANY', {
    READ: ['Excel/import source draft readiness', 'address confidence summary', 'stop / route draft readiness'],
    EXPLAIN: ['sabah inbound / akşam outbound farkını açıklar', 'ring varsayımı olmadığını açıklar', 'araç deposu zorunlu varsayımı olmadığını açıklar'],
    RECOMMEND: ['hangi missing data önce tamamlanmalı önerir', 'hangi outlier stop önce incelenmeli önerir'],
    PREPARE: ['OSRM route draft readiness note', 'manual review list'],
    DRAFT: ['route preview readiness note'],
    HUMAN_APPROVAL_REQUIRED: ['route preview sign-off', 'OSRM readiness sign-off'],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'NO_RING_ASSUMPTION', 'NO_DEPOT_ASSUMPTION', 'MISSING_DIRECTION'],
    COORDINATE_READINESS: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'BLOCKED_FOR_GEOCODING'],
    RISK_CATEGORIES: ['MISSING_COORDINATE', 'LOW_CONFIDENCE_COORDINATE', 'BLOCKED_ADDRESS', 'MISSING_HUB', 'MISSING_DIRECTION', 'TOO_FEW_STOPS', 'TOO_MANY_STOPS', 'DUPLICATE_WAYPOINT', 'POSSIBLE_OUTLIER_STOP', 'CROSS_ORGANIZATION_ROUTE_RISK', 'KVKK_CONSENT_UNKNOWN', 'MANUAL_REVIEW_REQUIRED', 'OSRM_EXECUTION_NOT_ALLOWED'],
    TASK_CATEGORIES: ['OSRM_READINESS_EXPLAIN', 'COORDINATE_READINESS_REPORT', 'DIRECTION_OSRM_INPUT_EXPLAIN', 'HUB_AND_STOP_SEQUENCE_READINESS', 'OSRM_RISK_SUMMARY', 'OUTLIER_STOP_HINT', 'MANUAL_REVIEW_LIST', 'ROUTE_PREVIEW_READINESS', 'HUMAN_APPROVAL_REQUIRED'],
  }),
  SCHOOL: buildOsrmRouteDraftFromExcelRole('SCHOOL', {
    READ: ['personel / öğrenci / veli address readiness summary', 'KVKK and privacy risk summary'],
    EXPLAIN: ['LOW_CONFIDENCE coordinate neden manuel inceleme gerektirdiğini açıklar', 'cross-organization risk neden blok olduğunu açıklar'],
    RECOMMEND: ['hangi kayıtların manuel review gerektiğini önerir', 'hangi safety check önce yapılmalı önerir'],
    PREPARE: ['privacy review note', 'manual review checklist'],
    HUMAN_APPROVAL_REQUIRED: ['KVKK belirsizliği onayı', 'cross-organization route review'],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'NO_RING_ASSUMPTION', 'NO_DEPOT_ASSUMPTION', 'MISSING_DIRECTION'],
    COORDINATE_READINESS: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'BLOCKED_FOR_GEOCODING'],
    RISK_CATEGORIES: ['MISSING_COORDINATE', 'LOW_CONFIDENCE_COORDINATE', 'BLOCKED_ADDRESS', 'MISSING_HUB', 'MISSING_DIRECTION', 'TOO_FEW_STOPS', 'TOO_MANY_STOPS', 'DUPLICATE_WAYPOINT', 'POSSIBLE_OUTLIER_STOP', 'CROSS_ORGANIZATION_ROUTE_RISK', 'KVKK_CONSENT_UNKNOWN', 'MANUAL_REVIEW_REQUIRED', 'OSRM_EXECUTION_NOT_ALLOWED'],
    TASK_CATEGORIES: ['OSRM_READINESS_EXPLAIN', 'COORDINATE_READINESS_REPORT', 'DIRECTION_OSRM_INPUT_EXPLAIN', 'HUB_AND_STOP_SEQUENCE_READINESS', 'OSRM_RISK_SUMMARY', 'OUTLIER_STOP_HINT', 'MANUAL_REVIEW_LIST', 'ROUTE_PREVIEW_READINESS', 'HUMAN_APPROVAL_REQUIRED'],
  }),
  ORGANIZATION: buildOsrmRouteDraftFromExcelRole('ORGANIZATION', {
    READ: ['group / team route readiness summary', 'cross-organization boundary summary'],
    EXPLAIN: ['hangi route adayının riskli olduğunu açıklar', 'hangi boundary sorununun blok olduğunu açıklar'],
    RECOMMEND: ['hangi manual review list önce açılmalı önerir', 'hangi input düzeltmesi önce yapılmalı önerir'],
    PREPARE: ['route readiness summary', 'risk summary'],
    HUMAN_APPROVAL_REQUIRED: ['cross-organization risk sign-off'],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'NO_RING_ASSUMPTION', 'NO_DEPOT_ASSUMPTION', 'MISSING_DIRECTION'],
    COORDINATE_READINESS: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'BLOCKED_FOR_GEOCODING'],
    RISK_CATEGORIES: ['MISSING_COORDINATE', 'LOW_CONFIDENCE_COORDINATE', 'BLOCKED_ADDRESS', 'MISSING_HUB', 'MISSING_DIRECTION', 'TOO_FEW_STOPS', 'TOO_MANY_STOPS', 'DUPLICATE_WAYPOINT', 'POSSIBLE_OUTLIER_STOP', 'CROSS_ORGANIZATION_ROUTE_RISK', 'KVKK_CONSENT_UNKNOWN', 'MANUAL_REVIEW_REQUIRED', 'OSRM_EXECUTION_NOT_ALLOWED'],
    TASK_CATEGORIES: ['OSRM_READINESS_EXPLAIN', 'COORDINATE_READINESS_REPORT', 'DIRECTION_OSRM_INPUT_EXPLAIN', 'HUB_AND_STOP_SEQUENCE_READINESS', 'OSRM_RISK_SUMMARY', 'OUTLIER_STOP_HINT', 'MANUAL_REVIEW_LIST', 'ROUTE_PREVIEW_READINESS', 'HUMAN_APPROVAL_REQUIRED'],
  }),
  ROOM: buildOsrmRouteDraftFromExcelRole('ROOM', {
    READ: ['route preview quality summary', 'manual review queue', 'hub and stop sequence readiness'],
    EXPLAIN: ['hangi route preview eksik olduğunu açıklar', 'hangi stop sequence riskli olduğunu açıklar'],
    RECOMMEND: ['hangi preview notu önce incelenmeli önerir', 'hangi hub readiness eksikliği önce bakılmalı önerir'],
    PREPARE: ['operator route readiness note'],
    HUMAN_APPROVAL_REQUIRED: ['route preview sign-off'],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'NO_RING_ASSUMPTION', 'NO_DEPOT_ASSUMPTION', 'MISSING_DIRECTION'],
    COORDINATE_READINESS: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'BLOCKED_FOR_GEOCODING'],
    RISK_CATEGORIES: ['MISSING_COORDINATE', 'LOW_CONFIDENCE_COORDINATE', 'BLOCKED_ADDRESS', 'MISSING_HUB', 'MISSING_DIRECTION', 'TOO_FEW_STOPS', 'TOO_MANY_STOPS', 'DUPLICATE_WAYPOINT', 'POSSIBLE_OUTLIER_STOP', 'CROSS_ORGANIZATION_ROUTE_RISK', 'KVKK_CONSENT_UNKNOWN', 'MANUAL_REVIEW_REQUIRED', 'OSRM_EXECUTION_NOT_ALLOWED'],
    TASK_CATEGORIES: ['OSRM_READINESS_EXPLAIN', 'COORDINATE_READINESS_REPORT', 'DIRECTION_OSRM_INPUT_EXPLAIN', 'HUB_AND_STOP_SEQUENCE_READINESS', 'OSRM_RISK_SUMMARY', 'OUTLIER_STOP_HINT', 'MANUAL_REVIEW_LIST', 'ROUTE_PREVIEW_READINESS', 'HUMAN_APPROVAL_REQUIRED'],
  }),
  DRIVER: buildOsrmRouteDraftFromExcelRole('DRIVER', {
    visible: false,
    READ: ['driver-facing route explanation will happen later'],
    EXPLAIN: ['roadmap burada gösterilmez'],
    RECOMMEND: ['no autonomous driver action'],
    HUMAN_APPROVAL_REQUIRED: ['driver route explanation requires later milestone'],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'NO_RING_ASSUMPTION', 'NO_DEPOT_ASSUMPTION', 'MISSING_DIRECTION'],
    COORDINATE_READINESS: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'BLOCKED_FOR_GEOCODING'],
    RISK_CATEGORIES: ['MISSING_COORDINATE', 'LOW_CONFIDENCE_COORDINATE', 'BLOCKED_ADDRESS', 'MISSING_HUB', 'MISSING_DIRECTION', 'TOO_FEW_STOPS', 'TOO_MANY_STOPS', 'DUPLICATE_WAYPOINT', 'POSSIBLE_OUTLIER_STOP', 'CROSS_ORGANIZATION_ROUTE_RISK', 'KVKK_CONSENT_UNKNOWN', 'MANUAL_REVIEW_REQUIRED', 'OSRM_EXECUTION_NOT_ALLOWED'],
    TASK_CATEGORIES: ['OSRM_READINESS_EXPLAIN', 'COORDINATE_READINESS_REPORT', 'DIRECTION_OSRM_INPUT_EXPLAIN', 'HUB_AND_STOP_SEQUENCE_READINESS', 'OSRM_RISK_SUMMARY', 'OUTLIER_STOP_HINT', 'MANUAL_REVIEW_LIST', 'ROUTE_PREVIEW_READINESS', 'HUMAN_APPROVAL_REQUIRED'],
  }),
  PERSONEL: buildOsrmRouteDraftFromExcelRole('PERSONEL', {
    visible: false,
    READ: ['support / explanation context only'],
    EXPLAIN: ['kişisel veri görünürlüğü yok'],
    RECOMMEND: ['support channel only'],
    HUMAN_APPROVAL_REQUIRED: ['route visibility belongs to later milestone'],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'NO_RING_ASSUMPTION', 'NO_DEPOT_ASSUMPTION', 'MISSING_DIRECTION'],
    COORDINATE_READINESS: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'BLOCKED_FOR_GEOCODING'],
    RISK_CATEGORIES: ['MISSING_COORDINATE', 'LOW_CONFIDENCE_COORDINATE', 'BLOCKED_ADDRESS', 'MISSING_HUB', 'MISSING_DIRECTION', 'TOO_FEW_STOPS', 'TOO_MANY_STOPS', 'DUPLICATE_WAYPOINT', 'POSSIBLE_OUTLIER_STOP', 'CROSS_ORGANIZATION_ROUTE_RISK', 'KVKK_CONSENT_UNKNOWN', 'MANUAL_REVIEW_REQUIRED', 'OSRM_EXECUTION_NOT_ALLOWED'],
    TASK_CATEGORIES: ['OSRM_READINESS_EXPLAIN', 'COORDINATE_READINESS_REPORT', 'DIRECTION_OSRM_INPUT_EXPLAIN', 'HUB_AND_STOP_SEQUENCE_READINESS', 'OSRM_RISK_SUMMARY', 'OUTLIER_STOP_HINT', 'MANUAL_REVIEW_LIST', 'ROUTE_PREVIEW_READINESS', 'HUMAN_APPROVAL_REQUIRED'],
  }),
  PARENT: buildOsrmRouteDraftFromExcelRole('PARENT', {
    visible: false,
    READ: ['support / explanation context only'],
    EXPLAIN: ['kişisel veri görünürlüğü yok'],
    RECOMMEND: ['support channel only'],
    HUMAN_APPROVAL_REQUIRED: ['route visibility belongs to later milestone'],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'NO_RING_ASSUMPTION', 'NO_DEPOT_ASSUMPTION', 'MISSING_DIRECTION'],
    COORDINATE_READINESS: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'BLOCKED_FOR_GEOCODING'],
    RISK_CATEGORIES: ['MISSING_COORDINATE', 'LOW_CONFIDENCE_COORDINATE', 'BLOCKED_ADDRESS', 'MISSING_HUB', 'MISSING_DIRECTION', 'TOO_FEW_STOPS', 'TOO_MANY_STOPS', 'DUPLICATE_WAYPOINT', 'POSSIBLE_OUTLIER_STOP', 'CROSS_ORGANIZATION_ROUTE_RISK', 'KVKK_CONSENT_UNKNOWN', 'MANUAL_REVIEW_REQUIRED', 'OSRM_EXECUTION_NOT_ALLOWED'],
    TASK_CATEGORIES: ['OSRM_READINESS_EXPLAIN', 'COORDINATE_READINESS_REPORT', 'DIRECTION_OSRM_INPUT_EXPLAIN', 'HUB_AND_STOP_SEQUENCE_READINESS', 'OSRM_RISK_SUMMARY', 'OUTLIER_STOP_HINT', 'MANUAL_REVIEW_LIST', 'ROUTE_PREVIEW_READINESS', 'HUMAN_APPROVAL_REQUIRED'],
  }),
});

export function listOsrmRouteDraftFromExcelRoles() {
  return Object.freeze(Object.keys(OSRM_ROUTE_DRAFT_FROM_EXCEL_POLICY));
}

export function getOsrmRouteDraftFromExcelPolicy() {
  return OSRM_ROUTE_DRAFT_FROM_EXCEL_POLICY;
}
