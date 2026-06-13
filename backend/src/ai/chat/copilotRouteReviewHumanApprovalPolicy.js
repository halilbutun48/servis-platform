export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_VERSION = 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01';

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_STAGES = Object.freeze([
  Object.freeze({
    id: 'STAGE_1',
    title: 'Route Review Input Readiness',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_2',
    title: 'Review Evidence Checklist',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_3',
    title: 'Human Approval Decision States',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_4',
    title: 'Approval Checklist',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_5',
    title: 'Review Boundaries',
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

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_DECISION_STATES = Object.freeze([
  Object.freeze({ id: 'READY_FOR_HUMAN_REVIEW', title: 'READY_FOR_HUMAN_REVIEW', meaning: 'Required readiness evidence exists and no blocked risk remains.' }),
  Object.freeze({ id: 'NEEDS_DATA_FIX', title: 'NEEDS_DATA_FIX', meaning: 'Missing address, coordinate, hub, direction, or capacity data must be fixed first.' }),
  Object.freeze({ id: 'MANUAL_REVIEW_REQUIRED', title: 'MANUAL_REVIEW_REQUIRED', meaning: 'Low confidence, duplicate, outlier, KVKK, or cross-organization risk requires manual review.' }),
  Object.freeze({ id: 'BLOCKED_FOR_ROUTE_ACTION', title: 'BLOCKED_FOR_ROUTE_ACTION', meaning: 'Blocked address, missing hub, or critical boundary risk stops route action.' }),
  Object.freeze({ id: 'APPROVAL_REQUIRED_BEFORE_EXECUTION', title: 'APPROVAL_REQUIRED_BEFORE_EXECUTION', meaning: 'Preview, OSRM, route apply, dispatch, or agreement links require explicit human approval before execution.' }),
]);

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_CHECKLIST = Object.freeze([
  'route summary',
  'source data lineage',
  'affected people/stops/hub',
  'direction',
  'address/coordinate confidence',
  'missing data',
  'route risk summary',
  'KVKK/cross-organization risk',
  'operational impact',
  'reversibility',
  'audit expectation',
  'safe fallback',
  'explicit confirmation phrase',
]);

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_TASK_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'ROUTE_REVIEW_READINESS_EXPLAIN', title: 'ROUTE_REVIEW_READINESS_EXPLAIN', meaning: 'Rota incelemeye hazır mı açıklar.' }),
  Object.freeze({ id: 'REVIEW_EVIDENCE_SUMMARY', title: 'REVIEW_EVIDENCE_SUMMARY', meaning: 'Route review kanıtlarını özetler.' }),
  Object.freeze({ id: 'ROUTE_APPROVAL_CHECKLIST_PREPARE', title: 'ROUTE_APPROVAL_CHECKLIST_PREPARE', meaning: 'İnsan onayı checklist’i hazırlar.' }),
  Object.freeze({ id: 'ROUTE_RISK_SUMMARY', title: 'ROUTE_RISK_SUMMARY', meaning: 'Route / OSRM / coordinate / hub / direction risklerini özetler.' }),
  Object.freeze({ id: 'MANUAL_REVIEW_LIST', title: 'MANUAL_REVIEW_LIST', meaning: 'İnsan kontrolü gereken adayları listeler.' }),
  Object.freeze({ id: 'SAFE_FALLBACK_RECOMMENDATION', title: 'SAFE_FALLBACK_RECOMMENDATION', meaning: 'Eksik veya riskli durumda güvenli sonraki adımı önerir.' }),
  Object.freeze({ id: 'EXPLICIT_CONFIRMATION_PHRASE_PREPARE', title: 'EXPLICIT_CONFIRMATION_PHRASE_PREPARE', meaning: 'Açık onay cümlesi taslağı hazırlar.' }),
  Object.freeze({ id: 'HUMAN_APPROVAL_REQUIRED', title: 'HUMAN_APPROVAL_REQUIRED', meaning: 'Route / OSRM / apply / dispatch için insan onayı gerektiğini belirtir.' }),
]);

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_GUARD_REQUIREMENTS = Object.freeze([
  'explicit human approval',
  'role / RBAC scope check',
  'entity ownership / IDOR guard',
  'dry-run / preview payload',
  'risk summary',
  'audit log',
  'before/after snapshot',
  'rollback / undo note',
  'no silent execution',
  'no hidden background action',
  'no secret / token exposure',
  'KVKK / privacy minimization',
  'no runtime AI action',
  'no tool execution',
  'no write-action dispatcher',
]);

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_BLOCKED_ACTIONS = Object.freeze([
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
  'review decision persistent write',
  'shift/demand/personel create execute',
  'driver/vehicle assignment execute',
  'dispatch apply',
  'RFQ send',
  'offer accept/reject',
  'agreement/contract execute',
  'payment/hakediş execute',
  'SMS/email/push send',
  'provider credential management',
  'user/account/admin write-action',
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'backend route/service/schema change',
  'schema/migration change',
]);

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_NEVER_AUTOMATE = Object.freeze([
  'otomatik route preview üretimi',
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

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Tek tıkla rotayı otomatik uygular vaadi yok.',
  'Public promise overclaim yok.',
  'Fake success yasaktır.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_HANOFFS = Object.freeze([
  'COPILOT-DEMAND-INTAKE-01',
  'COPILOT-RFQ-PREP-01',
  'SUPPLIER-MATCHING-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
  'EXCEL-TO-ROUTE-READINESS-REDTEAM-01',
]);

function buildRouteReviewHumanApprovalRole(role, config) {
  return Object.freeze({
    role,
    visible: config.visible !== false,
    READ: Object.freeze(Array.isArray(config.READ) ? [...config.READ] : []),
    EXPLAIN: Object.freeze(Array.isArray(config.EXPLAIN) ? [...config.EXPLAIN] : []),
    RECOMMEND: Object.freeze(Array.isArray(config.RECOMMEND) ? [...config.RECOMMEND] : []),
    PREPARE: Object.freeze(Array.isArray(config.PREPARE) ? [...config.PREPARE] : []),
    HUMAN_APPROVAL_REQUIRED: Object.freeze(Array.isArray(config.HUMAN_APPROVAL_REQUIRED) ? [...config.HUMAN_APPROVAL_REQUIRED] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_POLICY = Object.freeze({
  SUPER_ADMIN: buildRouteReviewHumanApprovalRole('SUPER_ADMIN', {
    READ: [
      'platform route review readiness health',
      'cross-tenant route risk and manual review queue',
      'route approval standard',
    ],
    EXPLAIN: [
      'hangi route review neden bekliyor',
      'hangi role / actor insan onayı vermeli',
      'hangi veri eksik veya riskli',
    ],
    RECOMMEND: [
      'hangi manual review önce açılmalı',
      'hangi güvenli fallback seçilmeli',
      'hangi approval önce alınmalı',
    ],
    PREPARE: [
      'route review note',
      'risk summary',
      'audit expectation note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization route review sign-off',
      'route preview readiness sign-off',
      'OSRM route draft readiness approval',
    ],
  }),
  COMPANY: buildRouteReviewHumanApprovalRole('COMPANY', {
    READ: [
      'route summary',
      'address confidence summary',
      'stop / hub readiness summary',
    ],
    EXPLAIN: [
      'hangi route adayının riskli olduğunu açıklar',
      'hangi missing data önce tamamlanmalı açıklar',
    ],
    RECOMMEND: [
      'hangi review candidate önce incelenmeli',
      'hangi approval checklist önce hazırlanmalı',
    ],
    PREPARE: [
      'route review summary',
      'approval checklist',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'route preview sign-off',
      'route review approval',
    ],
  }),
  SCHOOL: buildRouteReviewHumanApprovalRole('SCHOOL', {
    READ: [
      'personel / öğrenci / veli address readiness summary',
      'KVKK and privacy risk summary',
    ],
    EXPLAIN: [
      'low confidence coordinate neden manuel inceleme gerektirdiğini açıklar',
      'cross-organization risk neden blok olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi kayıtların manuel review gerektiğini önerir',
      'hangi safety check önce yapılmalı önerir',
    ],
    PREPARE: [
      'privacy review note',
      'manual review checklist',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'KVKK belirsizliği onayı',
      'cross-organization route review',
    ],
  }),
  ORGANIZATION: buildRouteReviewHumanApprovalRole('ORGANIZATION', {
    READ: [
      'group / team route readiness summary',
      'cross-organization boundary summary',
    ],
    EXPLAIN: [
      'hangi route adayının riskli olduğunu açıklar',
      'hangi boundary sorununun blok olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi manual review list önce açılmalı önerir',
      'hangi input düzeltmesi önce yapılmalı önerir',
    ],
    PREPARE: [
      'route readiness summary',
      'risk summary',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization risk sign-off',
    ],
  }),
  ROOM: buildRouteReviewHumanApprovalRole('ROOM', {
    READ: [
      'route preview quality summary',
      'manual review queue',
      'hub and stop sequence readiness',
    ],
    EXPLAIN: [
      'hangi route preview eksik olduğunu açıklar',
      'hangi stop sequence riskli olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi route review candidate önce açılmalı',
      'hangi readiness check önce yapılmalı',
    ],
    PREPARE: [
      'dispatch preparation note',
      'route review note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'dispatch apply',
      'route apply',
      'driver/vehicle assignment',
    ],
  }),
  DRIVER: buildRouteReviewHumanApprovalRole('DRIVER', {
    visible: false,
    READ: [
      'route and task reminder only',
    ],
    EXPLAIN: [
      'neden review beklediğini kısa açıklar',
    ],
    RECOMMEND: [
      'safe wait / safe confirm action önerir',
    ],
    PREPARE: [
      'short confirmation note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'route change confirmation',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'stop reached/skipped/complete',
      'driver/vehicle assignment',
    ],
  }),
  PERSONEL: buildRouteReviewHumanApprovalRole('PERSONEL', {
    visible: false,
    READ: [
      'service status and support context only',
    ],
    EXPLAIN: [
      'servis neden görünmüyor açıklar',
    ],
    RECOMMEND: [
      'destek ile iletişime geç',
    ],
    PREPARE: [
      'destek mesajı taslağı',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'başkası adına görünürlük talebi',
    ],
  }),
  PARENT: buildRouteReviewHumanApprovalRole('PARENT', {
    visible: false,
    READ: [
      'service status and support context only',
    ],
    EXPLAIN: [
      'servis neden görünmüyor açıklar',
    ],
    RECOMMEND: [
      'destek ile iletişime geç',
    ],
    PREPARE: [
      'destek mesajı taslağı',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'başkası adına görünürlük talebi',
    ],
  }),
});

export function listCopilotRouteReviewHumanApprovalRoles() {
  return Object.freeze(Object.keys(COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_POLICY));
}

export function getCopilotRouteReviewHumanApprovalPolicy(role) {
  return COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_POLICY[role] || null;
}
