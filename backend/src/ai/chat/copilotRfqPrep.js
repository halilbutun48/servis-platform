export const COPILOT_RFQ_PREP_VERSION = 'COPILOT-RFQ-PREP-01';

export const COPILOT_RFQ_PREP_STAGES = Object.freeze([
  Object.freeze({ id: 'STAGE_1', title: 'RFQ Scope Intake', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_2', title: 'Candidate Readiness Matrix', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_3', title: 'Risk and Privacy Gate', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_4', title: 'Draft-Only RFQ Prep', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_5', title: 'Human Approval Gate', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_6', title: 'Next Milestone Handoff', status: 'current baseline', futureOnly: false }),
]);

export const COPILOT_RFQ_PREP_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'READ', title: 'READ', meaning: 'Mevcut sinyalleri okur' }),
  Object.freeze({ id: 'EXPLAIN', title: 'EXPLAIN', meaning: 'Aday ve risk durumunu açıklar' }),
  Object.freeze({ id: 'RECOMMEND', title: 'RECOMMEND', meaning: 'Güvenli sonraki hazırlık adımını önerir' }),
  Object.freeze({ id: 'PREPARE', title: 'PREPARE', meaning: 'Checklist, özet, readiness matrisi ve karar öncesi taslak hazırlar' }),
  Object.freeze({ id: 'DRAFT', title: 'DRAFT', meaning: 'RFQ hazırlık notu ve kısa taslak üretir' }),
  Object.freeze({ id: 'RISK_SUMMARY', title: 'RISK_SUMMARY', meaning: 'Quality, KVKK, capacity ve telematics risklerini özetler' }),
  Object.freeze({ id: 'NEXT_STEP', title: 'NEXT_STEP', meaning: 'Sıradaki güvenli adımı önerir' }),
  Object.freeze({ id: 'HUMAN_APPROVAL_REQUIRED', title: 'HUMAN_APPROVAL_REQUIRED', meaning: 'Kritik adımlar için insan onayı gerektiğini söyler' }),
]);

export const COPILOT_RFQ_PREP_CHECKLIST = Object.freeze([
  'Scope summary',
  'Request source',
  'Candidate pool',
  'Verified supplier signal',
  'Telematics readiness',
  'Capacity fit',
  'Quality / safety signals',
  'Missing data',
  'KVKK / privacy risk',
  'Cross-organization boundary',
  'Human approval note',
  'Handoff target',
]);

export const COPILOT_RFQ_PREP_GUARD_REQUIREMENTS = Object.freeze([
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
  'no RFQ send',
  'no supplier matching execute',
  'no supplier auto-selection',
  'no offer collect execute',
  'no offer accept/reject',
  'no agreement/contract execute',
  'no dispatch apply',
  'no route apply',
  'no payment/hakediş execute',
  'no SMS/email/push',
  'no provider credential management',
  'no backend route/service/schema mutation',
  'no schema/migration',
  'no production DB',
  'KVKK / privacy minimization',
]);

export const COPILOT_RFQ_PREP_PUBLIC_PROMISE = Object.freeze([
  'Kullanıcıya "AI her şeyi yapar" denmez.',
  'Public promise sadece testle kanıtlanmış kabiliyeti söyler.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi içeride daha güçlü analiz / hazırlık yapabilir ama kanıtlanmamış execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);

export const COPILOT_RFQ_PREP_BLOCKED_ACTIONS = Object.freeze([
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'RFQ send',
  'supplier matching execute',
  'supplier auto-selection',
  'offer collect execute',
  'offer accept/reject',
  'negotiation message gönderimi',
  'agreement/contract execute',
  'dispatch apply',
  'route apply',
  'driver/vehicle assignment',
  'payment/hakediş execute',
  'SMS/email/push',
  'provider credential management',
  'user/account/admin write-action',
  'backend route/service/schema change',
  'schema/migration change',
]);

export const COPILOT_RFQ_PREP_NEVER_AUTOMATE = Object.freeze([
  'otomatik RFQ send',
  'otomatik supplier matching',
  'otomatik offer collect',
  'otomatik offer accept',
  'otomatik agreement bağlama',
  'otomatik dispatch uygulama',
  'otomatik route apply',
  'otomatik mesaj gönderimi',
  'otomatik provider credential yönetimi',
  'otomatik kullanıcı / rol / admin yazma',
]);

export const COPILOT_RFQ_PREP_HANOFFS = Object.freeze([
  'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01',
  'COPILOT-HUMAN-APPROVAL-01',
  'SUPPLIER-MATCHING-01',
  'SUPPLIER-OFFER-COLLECT-01',
  'COPILOT-OFFER-ANALYSIS-01',
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
]);

function buildRfqPrepRole(role, config) {
  return Object.freeze({
    role,
    visible: config.visible !== false,
    READ: Object.freeze(Array.isArray(config.READ) ? [...config.READ] : []),
    EXPLAIN: Object.freeze(Array.isArray(config.EXPLAIN) ? [...config.EXPLAIN] : []),
    RECOMMEND: Object.freeze(Array.isArray(config.RECOMMEND) ? [...config.RECOMMEND] : []),
    PREPARE: Object.freeze(Array.isArray(config.PREPARE) ? [...config.PREPARE] : []),
    DRAFT: Object.freeze(Array.isArray(config.DRAFT) ? [...config.DRAFT] : []),
    RISK_SUMMARY: Object.freeze(Array.isArray(config.RISK_SUMMARY) ? [...config.RISK_SUMMARY] : []),
    NEXT_STEP: Object.freeze(Array.isArray(config.NEXT_STEP) ? [...config.NEXT_STEP] : []),
    HUMAN_APPROVAL_REQUIRED: Object.freeze(Array.isArray(config.HUMAN_APPROVAL_REQUIRED) ? [...config.HUMAN_APPROVAL_REQUIRED] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...COPILOT_RFQ_PREP_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...COPILOT_RFQ_PREP_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const COPILOT_RFQ_PREP_POLICY = Object.freeze({
  SUPER_ADMIN: buildRfqPrepRole('SUPER_ADMIN', {
    READ: [
      'RFQ pipeline readiness',
      'verified supplier readiness',
      'telematics and capacity fit signals',
      'quality / risk summary',
    ],
    EXPLAIN: [
      'hangi aday neden riskli veya hazır',
      'hangi veri eksik',
      'hangi hazırlık notu bekliyor',
    ],
    RECOMMEND: [
      'önce hangi aday incelenmeli',
      'hangi risk önce kontrol edilmeli',
      'hangi human approval alınmalı',
    ],
    PREPARE: [
      'RFQ prep note',
      'candidate readiness matrix',
      'risk summary',
    ],
    DRAFT: [
      'RFQ readiness draft',
      'candidate shortlist note',
    ],
    RISK_SUMMARY: [
      'quality / KVKK / capacity / telematics risk summary',
    ],
    NEXT_STEP: [
      'human approval iste',
      'candidate matching companion milestonea handoff yap',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'candidate shortlist approval',
      'RFQ send approval',
    ],
  }),
  COMPANY: buildRfqPrepRole('COMPANY', {
    READ: [
      'talep hazırlığı',
      'aday readiness özeti',
      'teklif çağrısı öncesi risk notu',
    ],
    EXPLAIN: [
      'hangi aday neden uygun',
      'hangi veri eksik',
      'hangi hazırlık notu bekliyor',
    ],
    RECOMMEND: [
      'önce hangi aday incelenmeli',
      'hangi risk kontrol edilmeli',
      'hangi human approval alınmalı',
    ],
    PREPARE: [
      'RFQ prep note',
      'candidate readiness matrix',
      'approval checklist',
    ],
    DRAFT: [
      'RFQ preparation note',
    ],
    RISK_SUMMARY: [
      'quality / capacity / privacy risk summary',
    ],
    NEXT_STEP: [
      'human approval iste',
      'RFQ send yerine hazırlık notu üret',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'RFQ send approval',
      'candidate shortlist approval',
    ],
  }),
  ROOM: buildRfqPrepRole('ROOM', {
    READ: [
      'supplier candidate readiness',
      'quality signals',
      'telematics readiness',
      'capacity fit',
    ],
    EXPLAIN: [
      'hangi aday neden riskli',
      'hangi readiness eksik',
      'hangi aday önce bakılmalı',
    ],
    RECOMMEND: [
      'hangi aday önce incelenmeli',
      'hangi safety check önce yapılmalı',
    ],
    PREPARE: [
      'candidate readiness matrix',
      'supplier shortlist note',
    ],
    DRAFT: [
      'RFQ prep note',
    ],
    RISK_SUMMARY: [
      'supplier / telematics / capacity / quality risk summary',
    ],
    NEXT_STEP: [
      'human approval iste',
      'shortlist hazırlığını onaya sun',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'supplier shortlist approval',
      'RFQ send approval',
    ],
  }),
  SCHOOL: buildRfqPrepRole('SCHOOL', {
    READ: [
      'student / personnel / route readiness',
      'privacy and KVKK risk summary',
    ],
    EXPLAIN: [
      'hangi aday uygun değil',
      'hangi data eksik',
      'hangi privacy riski var',
    ],
    RECOMMEND: [
      'hangi kayıtlar manuel incelenmeli',
      'hangi safety check önce yapılmalı',
    ],
    PREPARE: [
      'candidate readiness matrix',
      'privacy review note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'KVKK belirsizliği onayı',
      'candidate shortlist approval',
    ],
  }),
  ORGANIZATION: buildRfqPrepRole('ORGANIZATION', {
    READ: [
      'group / organization route readiness',
      'cross-organization boundary summary',
    ],
    EXPLAIN: [
      'hangi aday uygun değil',
      'hangi boundary sorunu var',
      'hangi veri eksik',
    ],
    RECOMMEND: [
      'hangi manual review list açılmalı',
      'hangi input düzeltmesi önce yapılmalı',
    ],
    PREPARE: [
      'candidate readiness matrix',
      'risk summary',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization shortlist approval',
    ],
  }),
  DRIVER: buildRfqPrepRole('DRIVER', {
    visible: false,
    READ: [
      'driver-facing readiness not visible here',
    ],
    EXPLAIN: [
      'roadmap burada gösterilmez',
    ],
    RECOMMEND: [
      'no autonomous driver action',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'driver route / task visibility belongs to later milestone',
    ],
  }),
  PERSONEL: buildRfqPrepRole('PERSONEL', {
    visible: false,
    READ: [
      'support / explanation context only',
    ],
    EXPLAIN: [
      'kişisel veri görünürlüğü yok',
    ],
    RECOMMEND: [
      'support channel only',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'visibility belongs to later milestone',
    ],
  }),
  PARENT: buildRfqPrepRole('PARENT', {
    visible: false,
    READ: [
      'support / explanation context only',
    ],
    EXPLAIN: [
      'kişisel veri görünürlüğü yok',
    ],
    RECOMMEND: [
      'support channel only',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'visibility belongs to later milestone',
    ],
  }),
});

export function listCopilotRfqPrepRoles() {
  return Object.keys(COPILOT_RFQ_PREP_POLICY);
}

export function getCopilotRfqPrepPolicy(role) {
  return COPILOT_RFQ_PREP_POLICY[String(role || '').trim().toUpperCase()] || null;
}
