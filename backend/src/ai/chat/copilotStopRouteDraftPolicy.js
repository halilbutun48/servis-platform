export const COPILOT_STOP_ROUTE_DRAFT_VERSION = 'COPILOT-STOP-ROUTE-DRAFT-01';

export const COPILOT_STOP_ROUTE_DRAFT_STAGES = Object.freeze([
  Object.freeze({
    id: 'STAGE_1',
    label: 'STAGE 1 — Signal Intake',
    title: 'Signal Intake',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_2',
    label: 'STAGE 2 — Inbound / Outbound Direction Model',
    title: 'Inbound / Outbound Direction Model',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_3',
    label: 'STAGE 3 — Stop Draft Scoping',
    title: 'Stop Draft Scoping',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_4',
    label: 'STAGE 4 — Hub Readiness',
    title: 'Hub Readiness',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_5',
    label: 'STAGE 5 — Capacity Readiness',
    title: 'Capacity Readiness',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_6',
    label: 'STAGE 6 — Human Review Gate',
    title: 'Human Review Gate',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_7',
    label: 'STAGE 7 — Route Review Handoff',
    title: 'Route Review Handoff',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_8',
    label: 'STAGE 8 — Next Milestone Handoff',
    title: 'Next Milestone Handoff',
    status: 'current baseline',
    futureOnly: false,
  }),
]);

export const COPILOT_STOP_ROUTE_DRAFT_DIRECTION_MODEL = Object.freeze({
  INBOUND: Object.freeze([
    'sabah inbound servis yönü',
    'okula / kampüse giriş odaklı akış',
    'pickup öncelikli stop sırası',
  ]),
  OUTBOUND: Object.freeze([
    'akşam outbound servis yönü',
    'ev dönüş odaklı akış',
    'dropoff öncelikli stop sırası',
  ]),
  MIXED: Object.freeze([
    'mixed / iki yönlü plan',
    'aynı hat üzerinde inbound ve outbound ayrı taslak',
  ]),
  UNKNOWN: Object.freeze([
    'direction sinyali eksik',
    'manuel kontrol gerekir',
  ]),
});

export const COPILOT_STOP_ROUTE_DRAFT_HUB_READINESS = Object.freeze([
  'TELEMATICS_HUB_READY',
  'ROUTE_DRAFT_PREVIEW_READY',
  'VEHICLE_DRIVER_READINESS_READY',
  'HUMAN_REVIEW_REQUIRED',
]);

export const COPILOT_STOP_ROUTE_DRAFT_CAPACITY_READINESS = Object.freeze([
  'CAPACITY_READY',
  'CAPACITY_TIGHT',
  'CAPACITY_CONSTRAINED',
  'CAPACITY_UNKNOWN',
]);

export const COPILOT_STOP_ROUTE_DRAFT_TASK_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'READ', title: 'READ', meaning: 'Mevcut sinyalleri okur' }),
  Object.freeze({ id: 'EXPLAIN', title: 'EXPLAIN', meaning: 'Direction, hub ve capacity durumunu açıklar' }),
  Object.freeze({ id: 'RECOMMEND', title: 'RECOMMEND', meaning: 'Sıradaki güvenli hazırlık adımını önerir' }),
  Object.freeze({ id: 'PREPARE', title: 'PREPARE', meaning: 'Checklist, preview ve route review notu hazırlar' }),
  Object.freeze({ id: 'DRAFT', title: 'DRAFT', meaning: 'Stop / route draft metni hazırlar' }),
  Object.freeze({ id: 'RISK_SUMMARY', title: 'RISK_SUMMARY', meaning: 'Rota ve kapasite risklerini özetler' }),
  Object.freeze({ id: 'NEXT_STEP', title: 'NEXT_STEP', meaning: 'Sıradaki güvenli milestone’u işaretler' }),
  Object.freeze({ id: 'HUMAN_APPROVAL_REQUIRED', title: 'HUMAN_APPROVAL_REQUIRED', meaning: 'İnsan onayı gerektiğini söyler' }),
]);

export const COPILOT_STOP_ROUTE_DRAFT_GUARD_REQUIREMENTS = Object.freeze([
  'explicit human approval',
  'role / RBAC scope check',
  'tenant / organization boundary check',
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
  'no route/service/schema mutation',
  'no Prisma write',
  'no stop create',
  'no route draft apply',
  'no geocode execute',
  'no OSRM call',
  'no driver/vehicle assignment',
  'no SMS/email/push',
  'KVKK / privacy minimization',
]);

export const COPILOT_STOP_ROUTE_DRAFT_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Tek tıkla stop create veya route apply vaadi yok.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);

export const COPILOT_STOP_ROUTE_DRAFT_BLOCKED_ACTIONS = Object.freeze([
  'runtime stop create execute',
  'route draft create/apply',
  'route apply',
  'dispatch apply',
  'driver/vehicle assignment',
  'geocode execute',
  'OSRM route apply',
  'lat/lng write',
  'DB write',
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

export const COPILOT_STOP_ROUTE_DRAFT_NEVER_AUTOMATE = Object.freeze([
  'otomatik durak oluşturma',
  'otomatik route draft apply',
  'otomatik route apply',
  'otomatik dispatch uygulama',
  'otomatik atama',
  'otomatik mesaj gönderimi',
  'otomatik provider credential yönetimi',
  'otomatik kullanıcı / rol / admin yazma',
]);

export const COPILOT_STOP_ROUTE_DRAFT_HANOFFS = Object.freeze([
  'ADDRESS-GEOCODING-CONFIDENCE-01',
  'COPILOT-EXCEL-DEMAND-IMPORT-01',
  'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
  'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
  'COPILOT-DEMAND-INTAKE-01',
  'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01',
]);

function buildStopRouteDraftRole(role, config) {
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
      ...COPILOT_STOP_ROUTE_DRAFT_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...COPILOT_STOP_ROUTE_DRAFT_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
    DIRECTION_MODEL: Object.freeze(Array.isArray(config.DIRECTION_MODEL) ? [...config.DIRECTION_MODEL] : []),
    HUB_READINESS: Object.freeze(Array.isArray(config.HUB_READINESS) ? [...config.HUB_READINESS] : []),
    CAPACITY_READINESS: Object.freeze(Array.isArray(config.CAPACITY_READINESS) ? [...config.CAPACITY_READINESS] : []),
  });
}

export const COPILOT_STOP_ROUTE_DRAFT_POLICY = Object.freeze({
  SUPER_ADMIN: buildStopRouteDraftRole('SUPER_ADMIN', {
    READ: [
      'platform route draft readiness',
      'telematics hub / provider readiness',
      'capacity and route review signals',
    ],
    EXPLAIN: [
      'hangi direction modeli seçildiğini açıklar',
      'hangi hub readiness eksik olduğunu açıklar',
      'hangi capacity sinyalinin riskli olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi hazırlığın önce yapılacağını önerir',
      'hangi human review gate’in önce açılacağını önerir',
      'hangi güvenli handoff’un sonraki adım olduğunu önerir',
    ],
    PREPARE: [
      'route draft review note',
      'capacity risk summary',
      'hub readiness checklist',
    ],
    DRAFT: [
      'review-ready route draft note',
      'capacity preview note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization route review sign-off',
      'stop/route draft approval',
    ],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'MIXED', 'UNKNOWN'],
    HUB_READINESS: ['TELEMATICS_HUB_READY', 'ROUTE_DRAFT_PREVIEW_READY', 'VEHICLE_DRIVER_READINESS_READY', 'HUMAN_REVIEW_REQUIRED'],
    CAPACITY_READINESS: ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'],
    BLOCKED_RUNTIME_ACTION: [
      'route apply execute',
      'stop create execute',
      'driver/vehicle assignment execute',
      'provider credential management',
    ],
  }),
  COMPANY: buildStopRouteDraftRole('COMPANY', {
    READ: [
      'demand direction summary',
      'route draft preview',
      'capacity fit preview',
    ],
    EXPLAIN: [
      'sabah inbound / akşam outbound farkını açıklar',
      'hangi stop draftının riskli olduğunu açıklar',
      'hangi capacity sinyalinin eksik olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi direction modelinin seçileceğini önerir',
      'hangi preview alanının inceleneceğini önerir',
      'hangi human approval gate’in gerektiğini önerir',
    ],
    PREPARE: [
      'route preview note',
      'capacity check list',
      'direction explanation note',
    ],
    DRAFT: [
      'kullanıcıya gösterilecek taslak açıklama',
      'route review için kısa özet',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'stop/route draft sign-off',
      'route review sign-off',
    ],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'MIXED'],
    HUB_READINESS: ['ROUTE_DRAFT_PREVIEW_READY', 'VEHICLE_DRIVER_READINESS_READY', 'HUMAN_REVIEW_REQUIRED'],
    CAPACITY_READINESS: ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'stop create',
      'driver/vehicle assignment',
      'geocode execute',
      'OSRM route apply',
    ],
  }),
  ROOM: buildStopRouteDraftRole('ROOM', {
    READ: [
      'vehicle / driver readiness',
      'stop draft preview',
      'telematics hub readiness',
    ],
    EXPLAIN: [
      'hangi araç / sürücü uygun görünüyor',
      'hangi stop order riskli',
      'hangi hub readiness sinyali eksik',
    ],
    RECOMMEND: [
      'hangi review adımının önce yapılacağını önerir',
      'hangi capacity kontrolünün önce yapılacağını önerir',
      'hangi handoff’un next step olduğunu önerir',
    ],
    PREPARE: [
      'route review checklist',
      'vehicle / driver readiness note',
    ],
    DRAFT: [
      'review note',
      'capacity preview note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'dispatch / route review sign-off',
      'vehicle assignment review sign-off',
    ],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'MIXED', 'UNKNOWN'],
    HUB_READINESS: ['TELEMATICS_HUB_READY', 'ROUTE_DRAFT_PREVIEW_READY', 'VEHICLE_DRIVER_READINESS_READY'],
    CAPACITY_READINESS: ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'driver/vehicle assignment',
      'dispatch apply',
      'stop create',
      'OSRM route apply',
    ],
  }),
  DRIVER: buildStopRouteDraftRole('DRIVER', {
    READ: [
      'route draft preview',
      'stop order',
      'safe-drive / telematics hints',
    ],
    EXPLAIN: [
      'hangi stop’un neden sırada olduğunu açıklar',
      'hangi direction modelinin kullanıldığını açıklar',
    ],
    RECOMMEND: [
      'güvenli sürüşe dair hangi kontrolün yapılacağını önerir',
      'hangi review notunun paylaşılması gerektiğini önerir',
    ],
    PREPARE: [
      'driver-facing route note',
      'safe-drive reminder text',
    ],
    DRAFT: [
      'sürücüye gösterilecek açıklama',
      'checklist özeti',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'route change request',
      'task handoff confirmation',
    ],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'MIXED', 'UNKNOWN'],
    HUB_READINESS: ['ROUTE_DRAFT_PREVIEW_READY', 'VEHICLE_DRIVER_READINESS_READY'],
    CAPACITY_READINESS: ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'stop create',
      'reached/skipped/complete execute',
      'driver/vehicle assignment',
    ],
  }),
  PERSONEL: buildStopRouteDraftRole('PERSONEL', {
    READ: [
      'ride / live tracking preview',
      'pickup / dropoff direction',
      'route status explanation',
    ],
    EXPLAIN: [
      'hangi direction modelinin geçerli olduğunu açıklar',
      'hangi stop draftının ne anlama geldiğini açıklar',
    ],
    RECOMMEND: [
      'hangi güvenli kontrolün yapılacağını önerir',
      'hangi support adımının seçileceğini önerir',
    ],
    PREPARE: [
      'support message draft',
      'service status note',
    ],
    DRAFT: [
      'kullanıcıya gösterilecek durum açıklaması',
      'destek metni taslağı',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'visibility request',
      'data access request',
    ],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'MIXED', 'UNKNOWN'],
    HUB_READINESS: ['ROUTE_DRAFT_PREVIEW_READY'],
    CAPACITY_READINESS: ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'driver/vehicle assignment',
      'provider credential management',
      'SMS/email/push',
      'admin action',
    ],
  }),
  PARENT: buildStopRouteDraftRole('PARENT', {
    READ: [
      'ride / live tracking preview',
      'pickup / dropoff direction',
      'route status explanation',
    ],
    EXPLAIN: [
      'hangi direction modelinin geçerli olduğunu açıklar',
      'hangi stop draftının ne anlama geldiğini açıklar',
    ],
    RECOMMEND: [
      'hangi güvenli kontrolün yapılacağını önerir',
      'hangi support adımının seçileceğini önerir',
    ],
    PREPARE: [
      'support message draft',
      'service status note',
    ],
    DRAFT: [
      'kullanıcıya gösterilecek durum açıklaması',
      'destek metni taslağı',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'visibility request',
      'data access request',
    ],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'MIXED', 'UNKNOWN'],
    HUB_READINESS: ['ROUTE_DRAFT_PREVIEW_READY'],
    CAPACITY_READINESS: ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'driver/vehicle assignment',
      'provider credential management',
      'SMS/email/push',
      'admin action',
    ],
  }),
  SCHOOL: buildStopRouteDraftRole('SCHOOL', {
    READ: [
      'organization / school route plan readiness',
      'capacity fit summary',
      'route review signals',
    ],
    EXPLAIN: [
      'hangi direction modelinin geçerli olduğunu açıklar',
      'hangi capacity sinyalinin riskli olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi planın önce kontrol edileceğini önerir',
      'hangi review notunun hazırlanacağını önerir',
    ],
    PREPARE: [
      'plan check note',
      'capacity and readiness summary',
    ],
    DRAFT: [
      'route review note',
      'direction explanation note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization data access',
      'route review sign-off',
    ],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'MIXED', 'UNKNOWN'],
    HUB_READINESS: ['TELEMATICS_HUB_READY', 'ROUTE_DRAFT_PREVIEW_READY'],
    CAPACITY_READINESS: ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'],
    BLOCKED_RUNTIME_ACTION: [
      'provider credential management',
      'route apply',
      'driver/vehicle assignment',
      'payment/contract execute',
      'SMS/email/push',
      'runtime AI action',
    ],
  }),
  ORGANIZATION: buildStopRouteDraftRole('ORGANIZATION', {
    READ: [
      'organization route plan readiness',
      'capacity fit summary',
      'route review signals',
    ],
    EXPLAIN: [
      'hangi direction modelinin geçerli olduğunu açıklar',
      'hangi capacity sinyalinin riskli olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi planın önce kontrol edileceğini önerir',
      'hangi review notunun hazırlanacağını önerir',
    ],
    PREPARE: [
      'plan check note',
      'capacity and readiness summary',
    ],
    DRAFT: [
      'route review note',
      'direction explanation note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization data access',
      'route review sign-off',
    ],
    DIRECTION_MODEL: ['INBOUND', 'OUTBOUND', 'MIXED', 'UNKNOWN'],
    HUB_READINESS: ['TELEMATICS_HUB_READY', 'ROUTE_DRAFT_PREVIEW_READY'],
    CAPACITY_READINESS: ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'],
    BLOCKED_RUNTIME_ACTION: [
      'provider credential management',
      'route apply',
      'driver/vehicle assignment',
      'payment/contract execute',
      'SMS/email/push',
      'runtime AI action',
    ],
  }),
});

export function listCopilotStopRouteDraftRoles() {
  return Object.freeze(Object.keys(COPILOT_STOP_ROUTE_DRAFT_POLICY));
}

export function getCopilotStopRouteDraftPolicy() {
  return COPILOT_STOP_ROUTE_DRAFT_POLICY;
}
