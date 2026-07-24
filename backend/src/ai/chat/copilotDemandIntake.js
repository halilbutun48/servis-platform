export const COPILOT_DEMAND_INTAKE_VERSION = 'COPILOT-DEMAND-INTAKE-01';

export const COPILOT_DEMAND_INTAKE_GUARD_REQUIREMENTS = Object.freeze([
  'draft-only intake',
  'explicit human approval',
  'role / scope awareness',
  'KVKK / privacy minimization',
  'no silent execution',
  'no hidden background action',
  'no secret / token exposure',
  'no production DB',
  'no destructive query',
  'no schema / migration',
  'no route / service / prisma diff',
  'no stage / commit / tag / push',
]);

export const COPILOT_DEMAND_INTAKE_PUBLIC_PROMISE = Object.freeze([
  'Kullanıcıya "AI her şeyi yapar" denmez.',
  'Bu helper yalnızca draft-only intake üretir.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi ham PII, secret ve token taşımadan çalışır.',
  'Nihai karar kullanıcıdadır.',
  "Kritik yazma adımları ayrı human approval gate'e gider.",
]);

export const COPILOT_DEMAND_INTAKE_BLOCKED_EXECUTION_PHRASES = Object.freeze([
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'Demand create execute',
  'Excel/CSV import execute',
  'route apply',
  'dispatch apply',
  'agreement/contract execute',
  'payment/hakediş execute',
  'RFQ send',
  'offer accept/reject',
  'driver/vehicle assignment',
  'provider credential management',
  'user/account/admin write-action',
  'backend route/service/schema',
  'Prisma/schema/migration',
]);

export const COPILOT_DEMAND_INTAKE_NEVER_AUTOMATE = Object.freeze([
  'otomatik talep oluşturma',
  'otomatik import',
  'otomatik rota uygulama',
  'otomatik dispatch uygulama',
  'otomatik RFQ gönderimi',
  'otomatik teklif kabulü',
  'otomatik sözleşme',
  'otomatik ödeme / hakediş',
  'otomatik sürücü / araç atama',
  'otomatik kullanıcı / rol / admin yazma',
]);

export const COPILOT_DEMAND_INTAKE_REQUIRED_FIELDS = Object.freeze([
  'organization',
  'serviceType',
  'location',
  'headcount',
  'direction',
  'dateOrFrequency',
  'consentSignal',
]);

export const COPILOT_DEMAND_INTAKE_OPTIONAL_FIELDS = Object.freeze([
  'requesterRole',
  'contactName',
  'contactPhone',
  'contactEmail',
  'notes',
  'routeRef',
  'shiftRef',
  'schoolName',
  'existingContractRef',
  'effectiveDate',
  'capacityTarget',
  'currentCapacity',
  'currentRouteRef',
  'changeReason',
]);

export const COPILOT_DEMAND_INTAKE_FIELD_HINTS = Object.freeze({
  organization: 'Hangi kurum / şirket / okul / organizasyon için?',
  serviceType: 'Servis tipi tam olarak nedir?',
  location: 'Başlangıç, varış veya servis bölgesi nedir?',
  headcount: 'Kaç kişi için kapasite gerekiyor?',
  direction: 'Sabah inbound mı, akşam outbound mı?',
  dateOrFrequency: 'Tek seferlik tarih mi, düzenli sıklık mı?',
  consentSignal: 'KVKK / izin sinyali var mı?',
  requesterRole: 'Talebi hangi rol başlattı?',
  contactName: 'İrtibat kişisi kim?',
  contactPhone: 'İrtibat telefonu nedir?',
  contactEmail: 'İrtibat e-postası nedir?',
  notes: 'Özel not veya kısıt var mı?',
  routeRef: 'Hangi hat / rota referansı etkileniyor?',
  shiftRef: 'Hangi vardiya referansı etkileniyor?',
  schoolName: 'Hangi okul / kampüs için?',
  existingContractRef: 'Mevcut sözleşme referansı nedir?',
  effectiveDate: 'Değişiklik ne zaman yürürlüğe girsin?',
  capacityTarget: 'Hedef kapasite nedir?',
  currentCapacity: 'Mevcut kapasite nedir?',
  currentRouteRef: 'Mevcut rota referansı nedir?',
  changeReason: 'Değişiklik nedeni nedir?',
});

export const COPILOT_DEMAND_INTAKE_SAFETY_NOTES = Object.freeze([
  'Draft only; no runtime write action.',
  'Raw PII is masked before output.',
  'No hidden background action.',
  'No production DB, no destructive query, no schema / migration.',
  'No route / service / prisma diff.',
  'Human approval is required before any write path.',
]);

export const COPILOT_DEMAND_INTAKE_SUPPORTED_DEMAND_TYPES = Object.freeze([
  Object.freeze({
    id: 'PERSONEL_SERVICE',
    title: 'Personel servis talebi',
    keywords: Object.freeze(['personel servis', 'personel servisi', 'çalışan servisi', 'personel taşıma', 'servis talebi']),
    requiredFields: Object.freeze(['organization', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    optionalFields: Object.freeze(['requesterRole', 'contactName', 'contactPhone', 'contactEmail', 'notes']),
    clarifyingFields: Object.freeze(['organization', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    riskNotes: Object.freeze(['Kişisel veri ve vardiya hassasiyeti var.', 'Toplu personel bilgisi KVKK-safe tutulmalıdır.']),
  }),
  Object.freeze({
    id: 'SCHOOL_SERVICE',
    title: 'Okul / öğrenci servis talebi',
    keywords: Object.freeze(['okul servisi', 'öğrenci servisi', 'öğrenci taşıma', 'veli', 'okul', 'kampüs']),
    requiredFields: Object.freeze(['organization', 'schoolName', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    optionalFields: Object.freeze(['requesterRole', 'contactName', 'contactPhone', 'contactEmail', 'notes']),
    clarifyingFields: Object.freeze(['organization', 'schoolName', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    riskNotes: Object.freeze(['Öğrenci / veli verisi hassastır.', 'Adres ve iletişim bilgileri maskelenmelidir.']),
  }),
  Object.freeze({
    id: 'SHIFT_BASED_SERVICE',
    title: 'Vardiya bazlı servis talebi',
    keywords: Object.freeze(['vardiya servisi', 'vardiya bazlı', 'shift', 'mesai', 'vardiya']),
    requiredFields: Object.freeze(['organization', 'shiftRef', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    optionalFields: Object.freeze(['requesterRole', 'contactName', 'contactPhone', 'contactEmail', 'notes']),
    clarifyingFields: Object.freeze(['organization', 'shiftRef', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    riskNotes: Object.freeze(['Vardiya zamanı ve kapasite birlikte doğrulanmalıdır.']),
  }),
  Object.freeze({
    id: 'REGULAR_ROUTE',
    title: 'Düzenli hat / rota talebi',
    keywords: Object.freeze(['düzenli hat', 'düzenli rota', 'hat talebi', 'rota talebi', 'güzergah', 'guzergah']),
    requiredFields: Object.freeze(['organization', 'routeRef', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    optionalFields: Object.freeze(['requesterRole', 'contactName', 'contactPhone', 'contactEmail', 'notes']),
    clarifyingFields: Object.freeze(['organization', 'routeRef', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    riskNotes: Object.freeze(['Hat / rota referansı net değilse clarifying soru gerekir.']),
  }),
  Object.freeze({
    id: 'ONE_TIME_SERVICE',
    title: 'Tek seferlik servis talebi',
    keywords: Object.freeze([
      'tek seferlik servis talebi',
      'tek seferlik',
      'bir kerelik',
      'günübirlik',
      'tek kullanım',
      'geçici ulaşım',
      'gecici ulasim',
      'one time',
    ]),
    requiredFields: Object.freeze(['organization', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    optionalFields: Object.freeze(['requesterRole', 'contactName', 'contactPhone', 'contactEmail', 'notes']),
    clarifyingFields: Object.freeze(['organization', 'location', 'headcount', 'direction', 'dateOrFrequency', 'consentSignal']),
    riskNotes: Object.freeze(['Geçici taleplerde tarih/saat netliği önemlidir.']),
  }),
  Object.freeze({
    id: 'CONTRACT_ADD_ON',
    title: 'Mevcut sözleşmeye ek hat / ek vardiya talebi',
    keywords: Object.freeze(['ek hat', 'ek vardiya', 'ilave hat', 'ilave vardiya', 'mevcut sözleşme', 'sözleşmeye ek']),
    requiredFields: Object.freeze(['organization', 'existingContractRef', 'serviceType', 'headcount', 'effectiveDate', 'consentSignal']),
    optionalFields: Object.freeze(['requesterRole', 'contactName', 'contactPhone', 'contactEmail', 'notes', 'routeRef', 'shiftRef']),
    clarifyingFields: Object.freeze(['organization', 'existingContractRef', 'serviceType', 'headcount', 'effectiveDate', 'consentSignal']),
    riskNotes: Object.freeze(['Mevcut sözleşme referansı olmadan ekleme taslağı eksik kalır.']),
  }),
  Object.freeze({
    id: 'CAPACITY_INCREASE',
    title: 'Kapasite artırma talebi',
    keywords: Object.freeze(['kapasite artırma', 'kapasite artışı', 'daha büyük araç', 'ek kapasite', 'kapasite yükseltme']),
    requiredFields: Object.freeze(['organization', 'currentCapacity', 'capacityTarget', 'effectiveDate', 'consentSignal']),
    optionalFields: Object.freeze(['requesterRole', 'contactName', 'contactPhone', 'contactEmail', 'notes', 'routeRef']),
    clarifyingFields: Object.freeze(['organization', 'currentCapacity', 'capacityTarget', 'effectiveDate', 'consentSignal']),
    riskNotes: Object.freeze(['Mevcut ve hedef kapasite birlikte okunmalıdır.']),
  }),
  Object.freeze({
    id: 'ROUTE_CHANGE',
    title: 'Güzergah değişikliği talebi',
    keywords: Object.freeze([
      'güzergah değişikliği talebi',
      'güzergah değişikliği',
      'guzergah degisikligi',
      'rota değişikliği talebi',
      'rota değişikliği',
      'mevcut rotayı güncelle',
      'mevcut rotayi guncelle',
      'route change',
      'hat değişikliği',
    ]),
    requiredFields: Object.freeze(['organization', 'routeRef', 'changeReason', 'effectiveDate', 'consentSignal']),
    optionalFields: Object.freeze(['requesterRole', 'contactName', 'contactPhone', 'contactEmail', 'notes', 'currentRouteRef']),
    clarifyingFields: Object.freeze(['organization', 'routeRef', 'changeReason', 'effectiveDate', 'consentSignal']),
    riskNotes: Object.freeze(['Route change mevcut operasyonla ilişkili olduğu için rollback notu gerekir.']),
  }),
]);

export const COPILOT_DEMAND_INTAKE_ROLE_GUIDANCE = Object.freeze({
  SUPER_ADMIN: Object.freeze({
    focus: Object.freeze(['tenant-wide intake health', 'policy consistency', 'cross-tenant safety']),
    blocked: Object.freeze(['unsafe write-action', 'cross-tenant leakage']),
  }),
  COMPANY: Object.freeze({
    focus: Object.freeze(['demand summary', 'missing fields', 'schedule readiness']),
    blocked: Object.freeze(['auto-accept', 'contract execute', 'payment execute']),
  }),
  ROOM: Object.freeze({
    focus: Object.freeze(['route / vehicle readiness', 'dispatch preparation', 'capacity fit']),
    blocked: Object.freeze(['dispatch apply', 'driver/vehicle assignment', 'route apply']),
  }),
  DRIVER: Object.freeze({
    focus: Object.freeze(['visibility only', 'safe explanation', 'next safe step']),
    blocked: Object.freeze(['self execute', 'route change', 'assignment change']),
  }),
  PERSONEL: Object.freeze({
    focus: Object.freeze(['own ride / service visibility', 'support wording', 'privacy-safe status']),
    blocked: Object.freeze(['foreign data access', 'write-action', 'admin action']),
  }),
  PARENT: Object.freeze({
    focus: Object.freeze(['linked child / ride-safe visibility', 'support wording', 'privacy-safe status']),
    blocked: Object.freeze(['foreign data access', 'write-action', 'admin action']),
  }),
  SCHOOL: Object.freeze({
    focus: Object.freeze(['plan readiness', 'missing data', 'privacy-safe school scope']),
    blocked: Object.freeze(['cross-organization write', 'route apply', 'contract execute']),
  }),
  ORGANIZATION: Object.freeze({
    focus: Object.freeze(['plan readiness', 'missing data', 'privacy-safe organization scope']),
    blocked: Object.freeze(['cross-organization write', 'route apply', 'contract execute']),
  }),
});

function normalizeDemandIntakeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9\s/+\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectDemandIntakeText(value, seen = new Set()) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (seen.has(value)) return '';
  if (Array.isArray(value)) {
    seen.add(value);
    return value.map((item) => collectDemandIntakeText(item, seen)).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    seen.add(value);
    return Object.values(value).map((item) => collectDemandIntakeText(item, seen)).filter(Boolean).join(' ');
  }
  return '';
}

function isLikelyEmail(text) {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(text || ''));
}

function isLikelyPhone(text) {
  const digits = String(text || '').replace(/\D/g, '');
  return digits.length >= 7;
}

function isSensitiveTokenLike(text) {
  const normalized = normalizeDemandIntakeText(text);
  return (
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('cookie') ||
    normalized.includes('credential') ||
    normalized.includes('tckn') ||
    normalized.includes('gps') ||
    normalized.includes('lat') ||
    normalized.includes('lng') ||
    normalized.includes('coordinate')
  );
}

function maskLocationValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (isLikelyEmail(text) || isLikelyPhone(text) || isSensitiveTokenLike(text)) return '[REDACTED]';
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length <= 3) return tokens.join(' ');
  return `${tokens.slice(0, 3).join(' ')} …`;
}

export function maskDemandIntakeSensitiveValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (isLikelyEmail(text) || isLikelyPhone(text) || isSensitiveTokenLike(text)) return '[REDACTED]';
  if (text.length > 120) return `${text.slice(0, 120)}…`;
  return text;
}

function normalizeDirectionValue(value) {
  const text = normalizeDemandIntakeText(value);
  if (!text) return '';
  if (text.includes('inbound') || text.includes('sabah') || text.includes('giris') || text.includes('gidis')) return 'inbound';
  if (text.includes('outbound') || text.includes('aksam') || text.includes('cikis') || text.includes('donus')) return 'outbound';
  return maskDemandIntakeSensitiveValue(value);
}

function normalizeConsentSignalValue(value) {
  const text = normalizeDemandIntakeText(value);
  if (!text) return '';
  if (text.includes('var') || text.includes('present') || text.includes('ok') || text.includes('onay') || text.includes('consent')) {
    return 'kvkk-consent-present';
  }
  if (text.includes('yok') || text.includes('missing') || text.includes('belirsiz') || text.includes('unclear')) {
    return 'kvkk-consent-unclear';
  }
  return maskDemandIntakeSensitiveValue(value);
}

function normalizeNumericValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const digits = text.replace(/[^\d]/g, '');
  if (!digits) return maskDemandIntakeSensitiveValue(text);
  return String(Number.parseInt(digits, 10));
}

function normalizeDemandTypeField(field, value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const normalized = normalizeDemandIntakeText(text);
  if (field === 'serviceType' || field === 'demandType') return text.toUpperCase();
  if (field === 'organization' || field === 'schoolName' || field === 'routeRef' || field === 'shiftRef' || field === 'existingContractRef' || field === 'currentRouteRef') {
    return maskDemandIntakeSensitiveValue(text);
  }
  if (field === 'location' || field === 'origin' || field === 'destination' || field === 'routeArea') {
    return maskLocationValue(text);
  }
  if (field === 'direction') return normalizeDirectionValue(text);
  if (field === 'consentSignal') return normalizeConsentSignalValue(text);
  if (field === 'headcount' || field === 'currentCapacity' || field === 'capacityTarget') return normalizeNumericValue(text);
  if (field === 'contactName' || field === 'contactPhone' || field === 'contactEmail' || field === 'requesterRole') return '[REDACTED]';
  if (field === 'effectiveDate' || field === 'dateOrFrequency' || field === 'changeReason') return maskDemandIntakeSensitiveValue(text);
  if (normalized.includes('phone') || normalized.includes('email') || normalized.includes('token') || normalized.includes('secret') || normalized.includes('password') || normalized.includes('cookie')) {
    return '[REDACTED]';
  }
  return maskDemandIntakeSensitiveValue(text);
}

export function normalizeDemandIntakeField(field, value) {
  return normalizeDemandTypeField(field, value);
}

function normalizeTypedText(value) {
  return normalizeDemandIntakeText(value).replace(/[^a-z0-9\s/]+/g, ' ');
}

function scoreDemandType(text, demandType) {
  const normalized = normalizeTypedText(text);
  let score = 0;
  for (const keyword of demandType.keywords) {
    const needle = normalizeTypedText(keyword);
    if (!needle) continue;
    if (normalized.includes(needle)) score += 3;
    else if (needle.split(' ').some((part) => part && normalized.includes(part))) score += 1;
  }
  if (normalized.includes(normalizeTypedText(demandType.id))) score += 2;
  return score;
}

function resolveDemandTypeDefinition(input) {
  const explicit = normalizeTypedText(input);
  const direct = COPILOT_DEMAND_INTAKE_SUPPORTED_DEMAND_TYPES.find((type) => normalizeTypedText(type.id) === explicit || normalizeTypedText(type.title) === explicit);
  if (direct) return direct;

  const text = collectDemandIntakeText(input);
  let best = null;
  let bestScore = 0;
  for (const demandType of COPILOT_DEMAND_INTAKE_SUPPORTED_DEMAND_TYPES) {
    const score = scoreDemandType(text, demandType);
    if (score > bestScore) {
      best = demandType;
      bestScore = score;
    }
  }
  return best;
}

function computeIntentType(text) {
  const normalized = normalizeTypedText(text);
  if (!normalized) return 'UNCLASSIFIED';
  if (normalized.includes('netlestir') || normalized.includes('eksik') || normalized.includes('sor') || normalized.includes('hangi') || normalized.includes('var mi') || normalized.includes('clarify')) {
    return 'CLARIFYING';
  }
  if (normalized.includes('taslak') || normalized.includes('hazirla') || normalized.includes('ozet') || normalized.includes('draft')) {
    return 'DRAFT_ONLY';
  }
  return 'INTAKE_REQUEST';
}

function getRequiredFieldsForDemandType(demandTypeId) {
  const definition = COPILOT_DEMAND_INTAKE_SUPPORTED_DEMAND_TYPES.find((item) => item.id === demandTypeId);
  return definition ? [...definition.requiredFields] : [...COPILOT_DEMAND_INTAKE_REQUIRED_FIELDS];
}

function getOptionalFieldsForDemandType(demandTypeId) {
  const definition = COPILOT_DEMAND_INTAKE_SUPPORTED_DEMAND_TYPES.find((item) => item.id === demandTypeId);
  return definition ? [...definition.optionalFields] : [...COPILOT_DEMAND_INTAKE_OPTIONAL_FIELDS];
}

export function detectDemandIntakeIntent(input) {
  const sourceText = collectDemandIntakeText(input);
  const demandTypeDefinition = resolveDemandTypeDefinition(
    input?.demandType || input?.serviceType || input?.requestType || sourceText,
  );
  const intentType = computeIntentType(sourceText);
  const normalizedSource = normalizeTypedText(sourceText);
  const matchedKeywords = demandTypeDefinition
    ? demandTypeDefinition.keywords.filter((keyword) => normalizedSource.includes(normalizeTypedText(keyword)))
    : [];

  return Object.freeze({
    version: COPILOT_DEMAND_INTAKE_VERSION,
    intentType,
    demandType: demandTypeDefinition?.id || 'UNCLASSIFIED',
    demandTypeLabel: demandTypeDefinition?.title || 'Belirsiz talep',
    confidence: demandTypeDefinition ? Math.min(0.99, 0.4 + matchedKeywords.length * 0.12) : 0.2,
    sourceText,
    normalizedSource,
    matchedKeywords: Object.freeze([...matchedKeywords]),
    executionState: 'draft_only',
    approvalRequired: true,
  });
}

export function getDemandIntakeMissingFields(draft) {
  const requiredFields = Array.isArray(draft?.requiredFields) ? draft.requiredFields : [];
  const collectedFields = draft?.collectedFields || {};
  return Object.freeze(requiredFields.filter((field) => {
    const value = collectedFields[field];
    return value === null || value === undefined || String(value).trim() === '';
  }));
}

function buildDemandIntakeSummary(draft) {
  const missing = draft.missingFields.length;
  const topMissing = missing > 0 ? `Eksik alanlar: ${draft.missingFields.join(', ')}` : 'Eksik alan yok.';
  return `${draft.demandTypeLabel} için draft-only intake hazırlandı. ${topMissing}`;
}

export function buildDemandIntakeClarifyingQuestions(draft) {
  const questionKeys = Array.isArray(draft?.missingFields) ? draft.missingFields : [];
  const questions = questionKeys.map((field) => {
    const hint = COPILOT_DEMAND_INTAKE_FIELD_HINTS[field];
    if (hint) return hint;
    return `Bu alanı netleştirir misiniz: ${field}?`;
  });
  return Object.freeze([...new Set(questions)]);
}

export function buildDemandIntakeDraft(context = {}) {
  const detection = detectDemandIntakeIntent(context);
  const demandTypeDefinition = resolveDemandTypeDefinition(
    context.demandType || context.serviceType || detection.demandType,
  );
  const requiredFields = getRequiredFieldsForDemandType(demandTypeDefinition?.id || detection.demandType);
  const optionalFields = getOptionalFieldsForDemandType(demandTypeDefinition?.id || detection.demandType);

  const collectedFields = Object.freeze({
    requesterRole: normalizeDemandTypeField('requesterRole', context.requesterRole || context.role),
    organization: normalizeDemandTypeField('organization', context.organization || context.company || context.organizationName),
    serviceType: normalizeDemandTypeField('serviceType', context.serviceType || demandTypeDefinition?.title || ''),
    location: normalizeDemandTypeField('location', context.location || context.address || context.routeArea || context.origin || context.destination),
    headcount: normalizeDemandTypeField('headcount', context.headcount || context.peopleCount || context.capacity || context.requestedCapacity),
    direction: normalizeDemandTypeField('direction', context.direction || context.flow || context.shiftDirection),
    dateOrFrequency: normalizeDemandTypeField('dateOrFrequency', context.dateOrFrequency || context.date || context.frequency || context.schedule),
    consentSignal: normalizeDemandTypeField('consentSignal', context.consentSignal || context.kvkkSignal || context.privacySignal),
    contactName: normalizeDemandTypeField('contactName', context.contactName || context.name || context.requestor),
    contactPhone: normalizeDemandTypeField('contactPhone', context.contactPhone || context.phone),
    contactEmail: normalizeDemandTypeField('contactEmail', context.contactEmail || context.email),
    notes: normalizeDemandTypeField('notes', context.notes || context.note || context.comment),
    routeRef: normalizeDemandTypeField('routeRef', context.routeRef),
    shiftRef: normalizeDemandTypeField('shiftRef', context.shiftRef),
    schoolName: normalizeDemandTypeField('schoolName', context.schoolName),
    existingContractRef: normalizeDemandTypeField('existingContractRef', context.existingContractRef || context.contractRef),
    effectiveDate: normalizeDemandTypeField('effectiveDate', context.effectiveDate || context.startDate || context.targetDate),
    capacityTarget: normalizeDemandTypeField('capacityTarget', context.capacityTarget || context.requestedCapacity),
    currentCapacity: normalizeDemandTypeField('currentCapacity', context.currentCapacity),
    currentRouteRef: normalizeDemandTypeField('currentRouteRef', context.currentRouteRef),
    changeReason: normalizeDemandTypeField('changeReason', context.changeReason || context.reason),
  });

  const draft = {
    version: COPILOT_DEMAND_INTAKE_VERSION,
    intentType: detection.intentType,
    demandType: demandTypeDefinition?.id || detection.demandType,
    demandTypeLabel: demandTypeDefinition?.title || 'Belirsiz talep',
    confidence: detection.confidence,
    executionState: 'draft_only',
    approvalRequired: true,
    sourceText: detection.sourceText,
    normalizedSource: detection.normalizedSource,
    matchedKeywords: detection.matchedKeywords,
    requiredFields: Object.freeze([...requiredFields]),
    optionalFields: Object.freeze([...optionalFields]),
    collectedFields,
  };

  const missingFields = getDemandIntakeMissingFields(draft);
  const clarifyingQuestions = buildDemandIntakeClarifyingQuestions({ missingFields });
  const safetyNotes = Object.freeze([
    ...COPILOT_DEMAND_INTAKE_SAFETY_NOTES,
    ...(demandTypeDefinition ? demandTypeDefinition.riskNotes : []),
  ]);
  const roleKey = normalizeDemandIntakeText(context.role || context.requesterRole || '');
  const roleGuidance = COPILOT_DEMAND_INTAKE_ROLE_GUIDANCE[
    Object.keys(COPILOT_DEMAND_INTAKE_ROLE_GUIDANCE).find((key) => normalizeDemandIntakeText(key) === roleKey) || ''
  ];

  const result = Object.freeze({
    ...draft,
    missingFields,
    clarifyingQuestions,
    safetyNotes,
    roleGuidance: roleGuidance || null,
    draftSummary: buildDemandIntakeSummary({
      ...draft,
      missingFields,
      demandTypeLabel: draft.demandTypeLabel,
    }),
    classificationSummary: `${draft.intentType} | ${draft.demandType}`,
    privacySummary: 'PII masked, raw secret exposure blocked',
    handoffSummary: 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01 | COPILOT-HUMAN-APPROVAL-01 | COPILOT-EXCEL-DEMAND-IMPORT-01',
    blockedActions: Object.freeze([...COPILOT_DEMAND_INTAKE_BLOCKED_EXECUTION_PHRASES]),
    neverAutomate: Object.freeze([...COPILOT_DEMAND_INTAKE_NEVER_AUTOMATE]),
    nextSafeStep: missingFields.length > 0
      ? 'Eksik alanları netleştir, sonra yalnız taslak olarak yeni milestonelara taşı.'
      : 'Taslak olarak gözden geçir ve gerekirse insan onaylı hazırlık hattına taşı.',
  });

  return result;
}

export function composeDemandIntakeAnswer(context = {}) {
  const draft = buildDemandIntakeDraft(context);
  return Object.freeze({
    version: COPILOT_DEMAND_INTAKE_VERSION,
    intentType: draft.intentType,
    demandType: draft.demandType,
    demandTypeLabel: draft.demandTypeLabel,
    executionState: draft.executionState,
    approvalRequired: draft.approvalRequired,
    collectedFields: draft.collectedFields,
    missingFields: draft.missingFields,
    clarifyingQuestions: draft.clarifyingQuestions,
    safetyNotes: draft.safetyNotes,
    blockedActions: draft.blockedActions,
    neverAutomate: draft.neverAutomate,
    draftSummary: draft.draftSummary,
    classificationSummary: draft.classificationSummary,
    privacySummary: draft.privacySummary,
    handoffSummary: draft.handoffSummary,
    nextSafeStep: draft.nextSafeStep,
    roleGuidance: draft.roleGuidance,
  });
}

export function listCopilotDemandIntakeTypes() {
  return Object.freeze(COPILOT_DEMAND_INTAKE_SUPPORTED_DEMAND_TYPES.map((type) => type.id));
}

export function getCopilotDemandIntakePolicy() {
  return Object.freeze({
    version: COPILOT_DEMAND_INTAKE_VERSION,
    supportedDemandTypes: COPILOT_DEMAND_INTAKE_SUPPORTED_DEMAND_TYPES,
    requiredFields: COPILOT_DEMAND_INTAKE_REQUIRED_FIELDS,
    optionalFields: COPILOT_DEMAND_INTAKE_OPTIONAL_FIELDS,
    fieldHints: COPILOT_DEMAND_INTAKE_FIELD_HINTS,
    guardRequirements: COPILOT_DEMAND_INTAKE_GUARD_REQUIREMENTS,
    publicPromise: COPILOT_DEMAND_INTAKE_PUBLIC_PROMISE,
    blockedExecutionPhrases: COPILOT_DEMAND_INTAKE_BLOCKED_EXECUTION_PHRASES,
    neverAutomate: COPILOT_DEMAND_INTAKE_NEVER_AUTOMATE,
    safetyNotes: COPILOT_DEMAND_INTAKE_SAFETY_NOTES,
    roleGuidance: COPILOT_DEMAND_INTAKE_ROLE_GUIDANCE,
  });
}

export const COPILOT_DEMAND_INTAKE_POLICY = getCopilotDemandIntakePolicy();
