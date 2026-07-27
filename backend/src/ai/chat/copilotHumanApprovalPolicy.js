export const COPILOT_HUMAN_APPROVAL_VERSION = 'COPILOT-HUMAN-APPROVAL-01';

export const COPILOT_HUMAN_APPROVAL_CATEGORIES = Object.freeze([
  Object.freeze({
    id: 'READ',
    title: 'READ',
    meaning: 'Mevcut verileri ve sinyalleri okur',
  }),
  Object.freeze({
    id: 'EXPLAIN',
    title: 'EXPLAIN',
    meaning: 'Durumu ve bağlamı açıklar',
  }),
  Object.freeze({
    id: 'RECOMMEND',
    title: 'RECOMMEND',
    meaning: 'Güvenli sonraki adımı önerir',
  }),
  Object.freeze({
    id: 'PREPARE',
    title: 'PREPARE',
    meaning: 'Checklist, özet ve karar notu hazırlar',
  }),
  Object.freeze({
    id: 'DRAFT',
    title: 'DRAFT',
    meaning: 'Kullanıcıya gösterilecek taslak metni hazırlar',
  }),
  Object.freeze({
    id: 'RISK_SUMMARY',
    title: 'RISK_SUMMARY',
    meaning: 'Riskleri ve eksikleri özetler',
  }),
  Object.freeze({
    id: 'NEXT_STEP',
    title: 'NEXT_STEP',
    meaning: 'Sıradaki güvenli adımı önerir',
  }),
  Object.freeze({
    id: 'HUMAN_APPROVAL_REQUIRED',
    title: 'HUMAN_APPROVAL_REQUIRED',
    meaning: 'Kritik adımlar için insan onayı gerektiğini söyler',
  }),
]);

export const COPILOT_HUMAN_APPROVAL_CHECKLIST = Object.freeze([
  'Action summary',
  'Role / actor',
  'Scope',
  'Data source',
  'Confidence',
  'Missing data',
  'Risk summary',
  'Impact preview',
  'Reversibility',
  'Audit expectation',
  'Human confirmation phrase',
  'Safe fallback',
]);

export const COPILOT_HUMAN_APPROVAL_BLOCKED_ACTIONS = Object.freeze([
  'Demand create execute',
  'Excel/CSV import execute',
  'Address/geocode sonucu kalıcı kaydetme',
  'Stop/route draft’ı operasyona uygulama',
  'RFQ send',
  'Supplier auto-selection',
  'Offer accept/reject',
  'Negotiation message gönderimi',
  'Agreement/contract execute',
  'Dispatch apply',
  'Route apply',
  'Driver/vehicle assignment',
  'Stop reached/skipped/complete',
  'Payment/hakediş execute',
  'SMS/email/push gönderimi',
  'Provider credential yönetimi',
  'User/account/admin write-action',
  'KVKK/consent etkisi olan değişiklikler',
  'Cross-organization data access',
  'Voice command ile saha aksiyonu',
  'Autopilot önerisinin gerçek aksiyona dönüşmesi',
]);

export const COPILOT_HUMAN_APPROVAL_NEVER_AUTOMATE = Object.freeze([
  'Payment/billing/hakediş execute',
  'Contract/agreement execute',
  'Supplier auto-selection and commit',
  'User/account/admin write-action',
  'Provider credential management',
  'SMS/email/push broadcast',
  'Cross-tenant/cross-organization write',
  'Safe autopilot real-world action',
  'Driver/vehicle assignment execute',
  'Route apply execute',
]);

export const COPILOT_HUMAN_APPROVAL_VOICE_BOUNDARIES = Object.freeze([
  'voice command alone must not execute critical actions',
  'second explicit confirmation is required for critical voice actions',
  'wrong-interpretation risk stops the action',
  'proactive Copilot only suggests / warns',
  'safe autopilot does not open real-world action',
  'real autopilot action only after separate milestone + audit + rollback + explicit human approval guard',
]);

export const COPILOT_HUMAN_APPROVAL_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Tek tıkla her şeyi halleder gibi bir overclaim yok.',
  'Sefer Abi karar verici değil, karar destekleyici ve hazırlayıcıdır.',
  'İnsan onayı olmadan kritik işlem yapılmaz.',
  'Testle kanıtlanmamış kabiliyet public dokümanda vaat edilmez.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Kritik işlemler ayrı milestone, guard, audit log ve rollback modeli olmadan açılmaz.',
]);

export const COPILOT_HUMAN_APPROVAL_FUTURE_LINES = Object.freeze([
  'COPILOT-EXCEL-DEMAND-IMPORT-01',
  'ADDRESS-GEOCODING-CONFIDENCE-01',
  'COPILOT-STOP-ROUTE-DRAFT-01',
  'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
  'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
  'COPILOT-DEMAND-INTAKE-01',
  'COPILOT-RFQ-PREP-01',
  'SUPPLIER-MATCHING-01',
  'SUPPLIER-OFFER-COLLECT-01',
  'COPILOT-OFFER-ANALYSIS-01',
  'COPILOT-NEGOTIATION-ASSIST-01',
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
  'COPILOT-ACTION-PREP-01',
  'VOICE-COPILOT-CONFIRMATION-01',
  'COPILOT-SAFE-AUTOPILOT-01',
]);

function buildHumanApprovalRole(role, config) {
  return Object.freeze({
    role,
    READ: Object.freeze(Array.isArray(config.READ) ? [...config.READ] : []),
    EXPLAIN: Object.freeze(Array.isArray(config.EXPLAIN) ? [...config.EXPLAIN] : []),
    RECOMMEND: Object.freeze(Array.isArray(config.RECOMMEND) ? [...config.RECOMMEND] : []),
    PREPARE: Object.freeze(Array.isArray(config.PREPARE) ? [...config.PREPARE] : []),
    DRAFT: Object.freeze(Array.isArray(config.DRAFT) ? [...config.DRAFT] : []),
    RISK_SUMMARY: Object.freeze(Array.isArray(config.RISK_SUMMARY) ? [...config.RISK_SUMMARY] : []),
    NEXT_STEP: Object.freeze(Array.isArray(config.NEXT_STEP) ? [...config.NEXT_STEP] : []),
    HUMAN_APPROVAL_REQUIRED: Object.freeze(Array.isArray(config.HUMAN_APPROVAL_REQUIRED) ? [...config.HUMAN_APPROVAL_REQUIRED] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...COPILOT_HUMAN_APPROVAL_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...COPILOT_HUMAN_APPROVAL_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const COPILOT_HUMAN_APPROVAL_POLICY = Object.freeze({
  SUPER_ADMIN: buildHumanApprovalRole('SUPER_ADMIN', {
    READ: [
      'platform / marketplace / supplier verification / public lead / onboarding signals',
      'policy and cross-tenant risk signals',
      'approval queue health',
    ],
    EXPLAIN: [
      'hangi kritik işlemin neden beklediğini açıklar',
      'hangi role / actor onay vermesi gerektiğini açıklar',
      'hangi veri eksik olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi onayın önce alınacağını önerir',
      'hangi riskin önce kontrol edilmesi gerektiğini önerir',
      'hangi güvenli next stepin seçileceğini önerir',
    ],
    PREPARE: [
      'onay özeti',
      'risk özeti',
      'audit expectation notu',
    ],
    DRAFT: [
      'karar özeti taslağı',
      'onay metni taslağı',
    ],
    RISK_SUMMARY: [
      'platform ve cross-tenant risk özeti',
      'policy etkisi ve KVKK notu',
    ],
    NEXT_STEP: [
      'insan onayını iste',
      'önizleme ve kontrolü göster',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization policy değişikliği',
      'user/account/admin write-action',
      'supplier verification sonucu',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'user/account/admin write-action execute',
      'cross-organization write',
      'provider credential management',
    ],
  }),
  COMPANY: buildHumanApprovalRole('COMPANY', {
    READ: [
      'talep, teklif, agreement ve payment hazırlık sinyalleri',
    ],
    EXPLAIN: [
      'hangi talep / teklif / sözleşme adımının beklediğini açıklar',
      'hangi veri eksik olduğunu açıklar',
    ],
    RECOMMEND: [
      'hangi talep önce tamamlanmalı',
      'hangi teklif önce incelenmeli',
    ],
    PREPARE: [
      'talep özeti',
      'teklif karşılaştırma özeti',
      'onay checklisti',
    ],
    DRAFT: [
      'karar notu taslağı',
      'kullanıcıya gösterilecek açıklama taslağı',
    ],
    RISK_SUMMARY: [
      'kalite, finans ve saha riski özeti',
    ],
    NEXT_STEP: [
      'onaya sun',
      'güvenli hazırlık adımına geç',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'demand create',
      'offer accept/reject',
      'agreement/contract execute',
      'payment/hakediş execute',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'demand create execute',
      'Excel/CSV import execute',
      'RFQ send',
      'offer accept/reject',
    ],
  }),
  ROOM: buildHumanApprovalRole('ROOM', {
    READ: [
      'RFQ hazırlık sinyalleri',
      'vehicle / driver readiness',
      'telematics / safe-drive readiness',
    ],
    EXPLAIN: [
      'hangi aday uygun görünüyor',
      'hangi readiness eksik',
    ],
    RECOMMEND: [
      'hangi readiness kontrol edilmeli',
      'hangi güvenli next step seçilmeli',
    ],
    PREPARE: [
      'dispatch checklist',
      'route review notu',
    ],
    DRAFT: [
      'sürücü / araç hazırlık taslağı',
    ],
    RISK_SUMMARY: [
      'dispatch, route ve telematics riski',
    ],
    NEXT_STEP: [
      'insan onayını bekle',
      'preview göster',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'dispatch apply',
      'route apply',
      'driver/vehicle assignment',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'dispatch apply',
      'route apply',
      'driver/vehicle assignment execute',
      'stop reached/skipped/complete',
    ],
  }),
  DRIVER: buildHumanApprovalRole('DRIVER', {
    READ: [
      'görev, rota, check-in ve güvenli sürüş sinyalleri',
    ],
    EXPLAIN: [
      'sıradaki adımın ne olduğunu açıklar',
      'neden durduğunu veya beklediğini açıklar',
    ],
    RECOMMEND: [
      'güvenli next step önerir',
      'ikinci confirmation gerekiyorsa belirtir',
    ],
    PREPARE: [
      'görev özeti',
      'sesli confirmation notu',
    ],
    DRAFT: [
      'sürücüye gösterilecek kısa açıklama',
    ],
    RISK_SUMMARY: [
      'yanlış anlama riski',
      'rota / check-in / safety riski',
    ],
    NEXT_STEP: [
      'onay iste',
      'güvenli duruma geri dön',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'route apply',
      'stop reached/skipped/complete',
      'driver/vehicle assignment',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'voice command critical action execute',
      'route apply',
      'stop reached/skipped/complete',
      'driver/vehicle assignment execute',
    ],
  }),
  PERSONEL: buildHumanApprovalRole('PERSONEL', {
    READ: [
      'servis durumu ve canlı takip sinyalleri',
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
    DRAFT: [
      'durum açıklama taslağı',
    ],
    RISK_SUMMARY: [
      'gecikme ve görünürlük riski',
    ],
    NEXT_STEP: [
      'güvenli destek adımı öner',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'başkası adına görünürlük talebi',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route / payment / contract write-action',
    ],
  }),
  PARENT: buildHumanApprovalRole('PARENT', {
    READ: [
      'servis durumu ve canlı takip sinyalleri',
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
    DRAFT: [
      'durum açıklama taslağı',
    ],
    RISK_SUMMARY: [
      'gecikme ve görünürlük riski',
    ],
    NEXT_STEP: [
      'güvenli destek adımı öner',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'başkası adına görünürlük talebi',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route / payment / contract write-action',
    ],
  }),
  SCHOOL: buildHumanApprovalRole('SCHOOL', {
    READ: [
      'plan readiness ve eksik veri sinyalleri',
    ],
    EXPLAIN: [
      'hangi veri eksik açıklar',
    ],
    RECOMMEND: [
      'hangi planın önce kontrol edileceğini önerir',
    ],
    PREPARE: [
      'plan kontrol notu',
      'eksik veri listesi',
    ],
    DRAFT: [
      'route review taslağı',
    ],
    RISK_SUMMARY: [
      'plan ve veri güveni riski',
    ],
    NEXT_STEP: [
      'onay bekle',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization data access',
      'route apply',
      'payment/hakediş execute',
    ],
  }),
  ORGANIZATION: buildHumanApprovalRole('ORGANIZATION', {
    READ: [
      'plan readiness ve eksik veri sinyalleri',
    ],
    EXPLAIN: [
      'hangi veri eksik açıklar',
    ],
    RECOMMEND: [
      'hangi planın önce kontrol edileceğini önerir',
    ],
    PREPARE: [
      'plan kontrol notu',
      'eksik veri listesi',
    ],
    DRAFT: [
      'route review taslağı',
    ],
    RISK_SUMMARY: [
      'plan ve veri güveni riski',
    ],
    NEXT_STEP: [
      'onay bekle',
    ],
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization data access',
      'route apply',
      'payment/hakediş execute',
    ],
  }),
});

export function listCopilotHumanApprovalRoles() {
  return Object.freeze(Object.keys(COPILOT_HUMAN_APPROVAL_POLICY));
}

export function getCopilotHumanApprovalPolicy(role) {
  return COPILOT_HUMAN_APPROVAL_POLICY[role] || null;
}
