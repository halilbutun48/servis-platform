export const COPILOT_AI_ACTION_ROADMAP_VERSION = 'COPILOT-AI-ACTION-ROADMAP-01';

export const COPILOT_AI_ACTION_PHASES = Object.freeze([
  Object.freeze({
    id: 'PHASE_0',
    title: 'READ / EXPLAIN',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'PHASE_1',
    title: 'RECOMMEND',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'PHASE_2',
    title: 'PREPARE',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'PHASE_3',
    title: 'HUMAN_APPROVAL_REQUIRED',
    status: 'current baseline',
    futureOnly: false,
  }),
  Object.freeze({
    id: 'PHASE_4',
    title: 'GUARDED_EXECUTION',
    status: 'future only',
    futureOnly: true,
  }),
  Object.freeze({
    id: 'PHASE_5',
    title: 'AUDIT_AND_MONITOR',
    status: 'future only',
    futureOnly: true,
  }),
]);

export const COPILOT_AI_ACTION_CATEGORIES = Object.freeze([
  Object.freeze({
    id: 'LOW_RISK_ASSISTIVE',
    title: 'Low-risk assistive actions',
    examples: Object.freeze([
      'metin taslağı',
      'kontrol checklist’i',
      'risk özeti',
      'ekran yönlendirmesi',
      'kullanıcıya önerilen sonraki adım',
    ]),
  }),
  Object.freeze({
    id: 'MEDIUM_RISK_PREPARATION',
    title: 'Medium-risk preparation actions',
    examples: Object.freeze([
      'teklif karşılaştırma özeti',
      'vardiya hazırlık notu',
      'sözleşme hazırlık kontrol listesi',
      'GPS eşleştirme kontrol listesi',
      'dispatch hazırlık payload preview',
      'kalite / risk inceleme notu',
    ]),
  }),
  Object.freeze({
    id: 'HIGH_RISK_GUARDED',
    title: 'High-risk guarded actions, future only',
    examples: Object.freeze([
      'offer accept / reject',
      'agreement / contract execute',
      'route apply',
      'dispatch apply',
      'driver / vehicle assignment',
      'supplier verification decision',
      'provider activation',
      'payment / hakediş approval',
      'SMS / email / push send',
      'user / account / admin changes',
    ]),
  }),
  Object.freeze({
    id: 'NEVER_AUTONOMOUS',
    title: 'Never-autonomous actions',
    examples: Object.freeze([
      'ödeme / hakediş kesinleştirme',
      'sözleşme yürürlüğe alma',
      'kullanıcı / rol / admin yetkisi değiştirme',
      'provider credential / secret yönetimi',
      'KVKK / privacy policy değiştirme',
      'tedarikçiyi otomatik eleme',
      'sürücüye ceza / yaptırım oluşturma',
      'başka kullanıcının gizli verisini açma',
    ]),
  }),
]);

export const COPILOT_AI_ACTION_GUARD_REQUIREMENTS = Object.freeze([
  'explicit human approval',
  'role / RBAC scope check',
  'entity ownership / IDOR guard',
  'idempotency key',
  'dry-run / preview payload',
  'risk summary',
  'irreversible-effect warning',
  'rate limit',
  'audit log',
  'before/after snapshot',
  'rollback / undo note',
  'failure fallback',
  'no silent execution',
  'no hidden background action',
  'no secret / token exposure',
  'KVKK / privacy minimization',
]);

export const COPILOT_AI_ACTION_PUBLIC_PROMISE = Object.freeze([
  'Kullanıcıya "AI her şeyi yapar" denmez.',
  'Public promise sadece testle kanıtlanmış kabiliyeti söyler.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);

export const COPILOT_AI_ACTION_BLOCKED_ACTIONS = Object.freeze([
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'payment / billing / hakediş execute',
  'contract / agreement execute',
  'offer auto-accept',
  'supplier auto-selection',
  'route apply',
  'driver / vehicle assignment execute',
  'provider credential management',
  'user / account / admin write-action',
  'Prisma / schema / migration',
]);

export const COPILOT_AI_ACTION_NEVER_AUTONOMOUS = Object.freeze([
  'ödeme / hakediş kesinleştirme',
  'sözleşme yürürlüğe alma',
  'kullanıcı / rol / admin yetkisi değiştirme',
  'provider credential / secret yönetimi',
  'KVKK / privacy policy değiştirme',
  'tedarikçiyi otomatik eleme',
  'sürücüye ceza / yaptırım oluşturma',
  'başka kullanıcının gizli verisini açma',
]);

export const COPILOT_AI_ACTION_ROADMAP = Object.freeze({
  SUPER_ADMIN: Object.freeze({
    prepare: Object.freeze([
      'onboarding review note',
      'supplier verification checklist',
      'provider review checklist',
      'audit risk summary',
    ]),
    futureGuarded: Object.freeze([
      'supplier verification decision',
      'provider catalog status change',
    ]),
    blockedNow: Object.freeze([
      'user/account write',
      'provider ACTIVE execute',
      'payment/contract/security policy changes',
    ]),
  }),
  ROOM: Object.freeze({
    prepare: Object.freeze([
      'dispatch checklist',
      'vehicle/driver suitability note',
      'GPS mapping checklist',
      'offer response draft',
    ]),
    futureGuarded: Object.freeze([
      'dispatch apply',
      'driver/vehicle assignment',
      'GPS mapping save',
    ]),
    blockedNow: Object.freeze([
      'route apply',
      'stop complete / reached / skipped',
      'provider credential changes',
      'offer auto-submit',
    ]),
  }),
  COMPANY: Object.freeze({
    prepare: Object.freeze([
      'demand summary',
      'offer comparison summary',
      'agreement prep checklist',
    ]),
    futureGuarded: Object.freeze([
      'offer accept',
      'agreement preparation request',
    ]),
    blockedNow: Object.freeze([
      'supplier auto-selection',
      'contract execute',
      'payment / hakediş',
    ]),
  }),
  DRIVER: Object.freeze({
    prepare: Object.freeze([
      'route/task explanation',
      'safe-drive reminder text',
      'check-in evidence reminder',
    ]),
    futureGuarded: Object.freeze([
      'very limited; no autonomous driver action',
    ]),
    blockedNow: Object.freeze([
      'reached / skipped / complete',
      'route change',
      'assignment changes',
    ]),
  }),
  PERSONEL: Object.freeze({
    prepare: Object.freeze([
      'support message draft',
      'ride status explanation',
    ]),
    futureGuarded: Object.freeze([
      'very limited request updates only',
    ]),
    blockedNow: Object.freeze([
      'assignment / route / payment / contract / provider / admin actions',
    ]),
  }),
  PARENT: Object.freeze({
    prepare: Object.freeze([
      'support message draft',
      'ride status explanation',
    ]),
    futureGuarded: Object.freeze([
      'very limited request updates only',
    ]),
    blockedNow: Object.freeze([
      'assignment / route / payment / contract / provider / admin actions',
    ]),
  }),
  SCHOOL: Object.freeze({
    prepare: Object.freeze([
      'plan readiness summary',
      'missing data checklist',
      'risk review note',
    ]),
    futureGuarded: Object.freeze([
      'plan request submission, if role exists and scoped',
    ]),
    blockedNow: Object.freeze([
      'cross-organization data access',
      'route apply',
      'payment / contract',
      'provider credentials',
    ]),
  }),
  ORGANIZATION: Object.freeze({
    prepare: Object.freeze([
      'plan readiness summary',
      'missing data checklist',
      'risk review note',
    ]),
    futureGuarded: Object.freeze([
      'plan request submission, if role exists and scoped',
    ]),
    blockedNow: Object.freeze([
      'cross-organization data access',
      'route apply',
      'payment / contract',
      'provider credentials',
    ]),
  }),
});

export function listCopilotAiActionRoadmapRoles() {
  return Object.keys(COPILOT_AI_ACTION_ROADMAP);
}

export function getCopilotAiActionRoadmap(role) {
  return COPILOT_AI_ACTION_ROADMAP[String(role || '').trim().toUpperCase()] || null;
}
