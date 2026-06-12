export const COPILOT_DEMAND_TO_AGREEMENT_VERSION = 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01';

export const COPILOT_DEMAND_TO_AGREEMENT_STAGES = Object.freeze([
  Object.freeze({
    id: 'STAGE_1',
    title: 'Demand Intake',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_2',
    title: 'Data Readiness',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_3',
    title: 'Stop / Route Draft Readiness',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_4',
    title: 'RFQ / Offer Prep',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_5',
    title: 'Offer Comparison',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_6',
    title: 'Negotiation / Clarification Prep',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_7',
    title: 'Agreement Prep',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'STAGE_8',
    title: 'Dispatch / Operation Prep',
    status: 'current baseline',
    futureOnly: false,
  }),
]);

export const COPILOT_DEMAND_TO_AGREEMENT_CATEGORIES = Object.freeze([
  Object.freeze({
    id: 'READ',
    title: 'READ',
    meaning: 'Mevcut sinyalleri okur',
  }),
  Object.freeze({
    id: 'EXPLAIN',
    title: 'EXPLAIN',
    meaning: 'Talep / teklif / sözleşme / operasyon durumunu açıklar',
  }),
  Object.freeze({
    id: 'RECOMMEND',
    title: 'RECOMMEND',
    meaning: 'Sıradaki kontrol adımını önerir',
  }),
  Object.freeze({
    id: 'PREPARE',
    title: 'PREPARE',
    meaning: 'Checklist, özet, karşılaştırma notu ve karar öncesi taslak hazırlar',
  }),
  Object.freeze({
    id: 'HUMAN_APPROVAL_REQUIRED',
    title: 'HUMAN_APPROVAL_REQUIRED',
    meaning: 'Kritik adımlar için insan onayı gerektiğini söyler',
  }),
]);

export const COPILOT_DEMAND_TO_AGREEMENT_GUARD_REQUIREMENTS = Object.freeze([
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
]);

export const COPILOT_DEMAND_TO_AGREEMENT_PUBLIC_PROMISE = Object.freeze([
  'Kullanıcıya "AI her şeyi yapar" denmez.',
  'Public promise sadece testle kanıtlanmış kabiliyeti söyler.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);

export const COPILOT_DEMAND_TO_AGREEMENT_BLOCKED_ACTIONS = Object.freeze([
  'runtime AI action',
  'tool execution',
  'demand create execute',
  'Excel/CSV import execute',
  'route apply',
  'RFQ send',
  'offer accept/reject',
  'supplier auto-selection',
  'agreement/contract execute',
  'dispatch apply',
  'driver/vehicle assignment',
  'stop reached/skipped/complete',
  'payment/hakediş execute',
  'SMS/email/push',
  'provider credential management',
  'user/account/admin write-action',
  'Backend route/service/schema',
  'Prisma/schema/migration',
]);

export const COPILOT_DEMAND_TO_AGREEMENT_NEVER_AUTOMATE = Object.freeze([
  'otomatik talep oluşturma',
  'otomatik RFQ gönderimi',
  'otomatik teklif kabulü',
  'otomatik sözleşme bağlama',
  'otomatik dispatch uygulama',
  'otomatik atama',
  'otomatik ödeme / hakediş',
  'otomatik mesaj gönderimi',
  'otomatik provider credential yönetimi',
  'otomatik kullanıcı / rol / admin yazma',
]);

function buildDemandRoadmapRole(role, config) {
  return Object.freeze({
    role,
    visible: config.visible !== false,
    READ: Object.freeze(Array.isArray(config.READ) ? [...config.READ] : []),
    EXPLAIN: Object.freeze(Array.isArray(config.EXPLAIN) ? [...config.EXPLAIN] : []),
    RECOMMEND: Object.freeze(Array.isArray(config.RECOMMEND) ? [...config.RECOMMEND] : []),
    PREPARE: Object.freeze(Array.isArray(config.PREPARE) ? [...config.PREPARE] : []),
    HUMAN_APPROVAL_REQUIRED: Object.freeze(Array.isArray(config.HUMAN_APPROVAL_REQUIRED) ? [...config.HUMAN_APPROVAL_REQUIRED] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...COPILOT_DEMAND_TO_AGREEMENT_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...COPILOT_DEMAND_TO_AGREEMENT_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const COPILOT_DEMAND_TO_AGREEMENT_ROADMAP = Object.freeze({
  SUPER_ADMIN: buildDemandRoadmapRole('SUPER_ADMIN', {
    READ: [
      'funnel health',
      'talep / teklif / sözleşme hazırlığı',
      'verified supplier / marketplace readiness',
      'offer quality / risk signals',
    ],
    EXPLAIN: [
      'hangi demand hazır değil',
      'hangi RFQ / offer hazırlığı bekliyor',
      'hangi sözleşme öncesi kontrol eksik',
      'hangi operasyon hazırlık sinyali riskli',
    ],
    RECOMMEND: [
      'önce hangi funnel adımı kontrol edilmeli',
      'hangi risk sinyali öncelikli',
      'hangi checklist hazırlanmalı',
      'hangi human approval önce alınmalı',
    ],
    PREPARE: [
      'risk özeti',
      'kontrol checklisti',
      'onay notu',
      'funnel health summary',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'supplier verification decision',
      'offer comparison sign-off',
      'agreement prep sign-off',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'supplier verification execute',
      'provider ACTIVE change',
      'contract/agreement execute',
      'payment/hakediş execute',
    ],
    NEVER_AUTOMATE: [
      'otomatik tedarikçi seçimi',
      'otomatik sözleşme bağlama',
    ],
  }),
  COMPANY: buildDemandRoadmapRole('COMPANY', {
    READ: [
      'demand intake summary',
      'offer comparison summary',
      'agreement prep checklist',
      'operation readiness summary',
    ],
    EXPLAIN: [
      'hangi talep eksik',
      'hangi teklif karşılaştırılmalı',
      'hangi sözleşme öncesi kontrol eksik',
      'hangi operasyon hazırlık adımı sırada',
    ],
    RECOMMEND: [
      'hangi talep önce tamamlanmalı',
      'hangi teklif önce incelenmeli',
      'hangi checklist hazırlanmalı',
      'hangi human approval alınmalı',
    ],
    PREPARE: [
      'talep özeti',
      'teklif karşılaştırma notu',
      'agreement prep checklist',
      'operation prep note',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'teklif kabulü',
      'sözleşme onayı',
      'operation prep sign-off',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'demand create execute',
      'RFQ send',
      'offer accept/reject',
      'agreement/contract execute',
      'payment/hakediş execute',
    ],
    NEVER_AUTOMATE: [
      'otomatik kabul',
      'otomatik sözleşme',
    ],
  }),
  ROOM: buildDemandRoadmapRole('ROOM', {
    READ: [
      'RFQ prep',
      'supplier candidate readiness',
      'vehicle / driver readiness',
      'telematics / safe-drive readiness',
    ],
    EXPLAIN: [
      'hangi aday uygun görünüyor',
      'hangi telematics readiness eksik',
      'hangi capacity fit sorunu var',
      'hangi dispatch checklist eksik',
    ],
    RECOMMEND: [
      'hangi aday önce hazırlanmeli',
      'hangi checklist hazırlanmalı',
      'hangi risk sinyali öne çıkarılmalı',
      'hangi human approval alınmalı',
    ],
    PREPARE: [
      'RFQ prep note',
      'dispatch checklist',
      'vehicle / driver readiness note',
      'safe-drive reminder text',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'dispatch readiness sign-off',
      'route draft sign-off',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'RFQ send',
      'dispatch apply',
      'route apply',
      'driver/vehicle assignment',
      'supplier auto-selection',
    ],
    NEVER_AUTOMATE: [
      'otomatik atama',
      'otomatik dispatch',
      'otomatik route apply',
    ],
  }),
  DRIVER: buildDemandRoadmapRole('DRIVER', {
    visible: false,
    READ: [
      'driver task explanation only',
    ],
    EXPLAIN: [
      'roadmap shown only as task / route / check-in support',
    ],
    RECOMMEND: [
      'next safe step only',
    ],
    PREPARE: [
      'brief task summary',
      'safe-drive reminder text',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'route change approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'stop reached/skipped/complete',
      'driver/vehicle assignment',
    ],
    NEVER_AUTOMATE: [
      'kendi adına durum kapatma',
    ],
  }),
  PERSONEL: buildDemandRoadmapRole('PERSONEL', {
    visible: false,
    READ: [
      'roadmap hidden; ride / live tracking only',
    ],
    EXPLAIN: [
      'support message only',
    ],
    RECOMMEND: [
      'support guidance only',
    ],
    PREPARE: [
      'support message draft',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'hidden visibility request',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
    ],
    NEVER_AUTOMATE: [
      'başka kişi adına erişim',
    ],
  }),
  PARENT: buildDemandRoadmapRole('PARENT', {
    visible: false,
    READ: [
      'roadmap hidden; ride / live tracking only',
    ],
    EXPLAIN: [
      'support message only',
    ],
    RECOMMEND: [
      'support guidance only',
    ],
    PREPARE: [
      'support message draft',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'hidden visibility request',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
    ],
    NEVER_AUTOMATE: [
      'başka kişi adına erişim',
    ],
  }),
  SCHOOL: buildDemandRoadmapRole('SCHOOL', {
    READ: [
      'plan readiness',
      'missing data checklist',
      'quality / risk signals',
    ],
    EXPLAIN: [
      'hangi plan eksik',
      'hangi veri hazırlanmalı',
      'hangi risk kontrol edilmeli',
    ],
    RECOMMEND: [
      'önce hangi plan incelenmeli',
      'hangi eksik veri tamamlanmalı',
      'hangi checklist hazırlanmalı',
    ],
    PREPARE: [
      'plan readiness note',
      'missing data checklist',
      'risk summary',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'public / shared dışı karar',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
    ],
    NEVER_AUTOMATE: [
      'gizli öğrenci / personel verisini otomatik görünür kılma',
    ],
  }),
  ORGANIZATION: buildDemandRoadmapRole('ORGANIZATION', {
    READ: [
      'plan readiness',
      'missing data checklist',
      'quality / risk signals',
    ],
    EXPLAIN: [
      'hangi plan eksik',
      'hangi veri hazırlanmalı',
      'hangi risk kontrol edilmeli',
    ],
    RECOMMEND: [
      'önce hangi plan incelenmeli',
      'hangi eksik veri tamamlanmalı',
      'hangi checklist hazırlanmalı',
    ],
    PREPARE: [
      'plan readiness note',
      'missing data checklist',
      'risk summary',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'public / shared dışı karar',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route apply',
      'payment/hakediş execute',
      'contract/agreement execute',
    ],
    NEVER_AUTOMATE: [
      'gizli öğrenci / personel verisini otomatik görünür kılma',
    ],
  }),
});

export function listCopilotDemandToAgreementRoadmapRoles() {
  return Object.keys(COPILOT_DEMAND_TO_AGREEMENT_ROADMAP);
}

export function getCopilotDemandToAgreementRoadmap(role) {
  return COPILOT_DEMAND_TO_AGREEMENT_ROADMAP[String(role || '').trim().toUpperCase()] || null;
}
