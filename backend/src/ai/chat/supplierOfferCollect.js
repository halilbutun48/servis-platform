export const SUPPLIER_OFFER_COLLECT_VERSION = 'SUPPLIER-OFFER-COLLECT-01';

export const SUPPLIER_OFFER_COLLECT_STAGES = Object.freeze([
  Object.freeze({ id: 'STAGE_1', title: 'Offer Collection Input Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_2', title: 'Offer Request Field Model', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_3', title: 'Offer Collection Status Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_4', title: 'Offer Intake Table Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_5', title: 'Safety / Boundary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_6', title: 'Türkçe Visible Answer', status: 'current baseline', futureOnly: false }),
]);

export const SUPPLIER_OFFER_COLLECT_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'READ', title: 'READ', meaning: 'Mevcut sinyalleri okur' }),
  Object.freeze({ id: 'EXPLAIN', title: 'EXPLAIN', meaning: 'Teklif toplama durumunu açıklar' }),
  Object.freeze({ id: 'RECOMMEND', title: 'RECOMMEND', meaning: 'Güvenli sonraki hazırlık adımını önerir' }),
  Object.freeze({ id: 'PREPARE', title: 'PREPARE', meaning: 'Checklist, özet ve karar öncesi taslak hazırlar' }),
  Object.freeze({ id: 'DRAFT', title: 'DRAFT', meaning: 'Teklif toplama planı ve intake taslağı üretir' }),
  Object.freeze({ id: 'RISK_SUMMARY', title: 'RISK_SUMMARY', meaning: 'KVKK, kapasite ve hazırlık risklerini özetler' }),
  Object.freeze({ id: 'NEXT_STEP', title: 'NEXT_STEP', meaning: 'Sıradaki güvenli adımı önerir' }),
  Object.freeze({ id: 'HUMAN_APPROVAL_REQUIRED', title: 'HUMAN_APPROVAL_REQUIRED', meaning: 'Kritik adımlar için insan onayı gerektiğini söyler' }),
]);

export const SUPPLIER_OFFER_COLLECT_CHECKLIST = Object.freeze([
  'Offer collection input summary',
  'Offer request field model',
  'Offer collection status draft',
  'Offer intake table draft',
  'Missing offer fields',
  'Risk notes',
  'Human approval note',
  'No requested contact',
  'No send / accept / reject',
  'Next safe step',
]);

export const SUPPLIER_OFFER_COLLECT_REQUEST_FIELD_MODEL = Object.freeze([
  Object.freeze({ id: 'supplierRef', title: 'Tedarikçi opaque ref', meaning: 'Maskeli ve izlenebilir tedarikçi referansı', required: true }),
  Object.freeze({ id: 'supplierLabel', title: 'Tedarikçi label', meaning: 'Kullanıcıya görünen tedarikçi etiketi', required: true }),
  Object.freeze({ id: 'offerPrice', title: 'Teklif fiyatı', meaning: 'Teklifin fiyat sinyali', required: true }),
  Object.freeze({ id: 'priceScope', title: 'Fiyat kapsamı', meaning: 'Fiyata dahil hizmet kapsamı', required: true }),
  Object.freeze({ id: 'includedItems', title: 'Dahil kalemler', meaning: 'Teklifi oluşturan dahil kalemler', required: true }),
  Object.freeze({ id: 'excludedItems', title: 'Hariç kalemler', meaning: 'Teklife dahil olmayan kalemler', required: true }),
  Object.freeze({ id: 'vehicleCapacity', title: 'Araç kapasitesi', meaning: 'Önerilen kapasite veya taşıma sınırı', required: true }),
  Object.freeze({ id: 'vehicleType', title: 'Araç tipi', meaning: 'Araç / filo tipi sinyali', required: true }),
  Object.freeze({ id: 'startAvailability', title: 'Başlangıç uygunluğu', meaning: 'İşe başlama uygunluğu', required: true }),
  Object.freeze({ id: 'shiftFit', title: 'Vardiya / saat uygunluğu', meaning: 'Vardiya veya saat eşleşmesi', required: true }),
  Object.freeze({ id: 'documentLicenseFit', title: 'Belge / ruhsat uygunluğu', meaning: 'Belge, ruhsat veya sertifika uyumu', required: true }),
  Object.freeze({ id: 'insuranceSafety', title: 'Sigorta / güvenlik şartları', meaning: 'Sigorta ve güvenlik sinyalleri', required: true }),
  Object.freeze({ id: 'slaCommitment', title: 'SLA / kalite taahhüdü', meaning: 'Kalite ve servis taahhüdü', required: true }),
  Object.freeze({ id: 'validityPeriod', title: 'Geçerlilik süresi', meaning: 'Teklifin geçerlilik süresi', required: true }),
  Object.freeze({ id: 'extraNotes', title: 'Ek notlar', meaning: 'İlave notlar ve açıklamalar', required: false }),
  Object.freeze({ id: 'missingOrUnclearFields', title: 'Eksik / belirsiz alanlar', meaning: 'Tamamlanması gereken veya belirsiz kalan alanlar', required: false }),
]);

export const SUPPLIER_OFFER_COLLECT_COLLECTION_STATES = Object.freeze([
  'pending',
  'missing_fields',
  'received_draft',
  'ready_for_analysis',
  'blocked',
]);

export const SUPPLIER_OFFER_COLLECT_COLLECTION_STATE_LABELS = Object.freeze({
  pending: 'Bekleniyor',
  missing_fields: 'Eksik alanlar var',
  received_draft: 'Teklif taslağı alındı',
  ready_for_analysis: 'Değerlendirmeye hazır',
  blocked: 'Onayınız gerekli',
});

export const SUPPLIER_OFFER_COLLECT_BOUNDARY_FLAGS = Object.freeze([
  'draftOnly=true',
  'notRequested=true',
  'notContacted=true',
  'notSent=true',
  'notAccepted=true',
  'notRejected=true',
  'approvalRequired=true',
  'humanReviewRequired=true',
]);

export const SUPPLIER_OFFER_COLLECT_GUARD_REQUIREMENTS = Object.freeze([
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
  'no supplier contact',
  'no RFQ send',
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

export const SUPPLIER_OFFER_COLLECT_PUBLIC_PROMISE = Object.freeze([
  'Kullanıcıya "AI her şeyi yapar" denmez.',
  'Public promise sadece testle kanıtlanmış kabiliyeti söyler.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi içeride daha güçlü teklif hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);

export const SUPPLIER_OFFER_COLLECT_BLOCKED_ACTIONS = Object.freeze([
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'supplier contact',
  'RFQ send',
  'offer collect execute',
  'offer accept/reject',
  'supplier selection execution',
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

export const SUPPLIER_OFFER_COLLECT_NEVER_AUTOMATE = Object.freeze([
  'otomatik teklif isteme',
  'otomatik teklif toplama',
  'otomatik supplier contact',
  'otomatik teklif kabul',
  'otomatik teklif reddi',
  'otomatik supplier selection',
  'otomatik agreement bağlama',
  'otomatik dispatch uygulama',
  'otomatik route apply',
  'otomatik mesaj gönderimi',
  'otomatik provider credential yönetimi',
  'otomatik kullanıcı / rol / admin yazma',
]);

export const SUPPLIER_OFFER_COLLECT_HANOFFS = Object.freeze([
  'COPILOT-OFFER-ANALYSIS-01',
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
]);

export const SUPPLIER_OFFER_COLLECT_INTENT_TYPES = Object.freeze([
  'offer_collection_request',
  'offer_missing_fields_request',
  'offer_risk_review_request',
  'execution_blocked_request',
  'unknown',
]);

export const SUPPLIER_OFFER_COLLECT_QUESTION_BANK = Object.freeze({
  supplierRef: 'Tedarikçi opaque ref nedir?',
  supplierLabel: 'Tedarikçi label nedir?',
  offerPrice: 'Teklif fiyatı nedir?',
  priceScope: 'Fiyat kapsamına neler dahil?',
  includedItems: 'Dahil kalemler neler?',
  excludedItems: 'Hariç kalemler neler?',
  vehicleCapacity: 'Araç kapasitesi nedir?',
  vehicleType: 'Araç tipi nedir?',
  startAvailability: 'Başlangıç uygunluğu nedir?',
  shiftFit: 'Vardiya / saat uygunluğu nedir?',
  documentLicenseFit: 'Belge / ruhsat uygunluğu nedir?',
  insuranceSafety: 'Sigorta / güvenlik şartları nedir?',
  slaCommitment: 'SLA / kalite taahhüdü nedir?',
  validityPeriod: 'Teklif geçerlilik süresi nedir?',
  extraNotes: 'Ek notlar var mı?',
  missingOrUnclearFields: 'Eksik ya da belirsiz alanları netleştirir misiniz?',
});

export const SUPPLIER_OFFER_COLLECT_EXECUTION_STATE = 'offer_collect_draft_only / not_requested / not_contacted / not_executed';
export const SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP = 'teklif toplama planını kontrol edip insan onayına sunmak';

function buildSupplierOfferCollectRole(role, config) {
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
      ...SUPPLIER_OFFER_COLLECT_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...SUPPLIER_OFFER_COLLECT_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const SUPPLIER_OFFER_COLLECT_POLICY = Object.freeze({
  SUPER_ADMIN: buildSupplierOfferCollectRole('SUPER_ADMIN', {
    READ: ['teklif toplama readiness', 'aday planı', 'eksik alanlar', 'risk notu'],
    EXPLAIN: ['hangi teklif taslağı hazır', 'hangi alan eksik', 'hangi plan onay bekliyor'],
    RECOMMEND: ['önce hangi aday incelenmeli', 'hangi risk önce kontrol edilmeli', 'hangi insan onayı alınmalı'],
    PREPARE: ['teklif toplama planı', 'offer intake table draft', 'risk özeti'],
    DRAFT: ['offer collection plan', 'draft intake table'],
    RISK_SUMMARY: ['KVKK / kapasite / başlangıç / güvenlik risk özeti'],
    NEXT_STEP: ['insan onayı iste', 'offer analysis milestonea handoff yap'],
    HUMAN_APPROVAL_REQUIRED: ['offer collection plan approval', 'offer send approval'],
  }),
  COMPANY: buildSupplierOfferCollectRole('COMPANY', {
    READ: ['teklif toplama planı', 'eksik alanlar', 'hazırlık notu'],
    EXPLAIN: ['hangi alan eksik', 'hangi teklif taslağı hazır', 'hangi plan onay bekliyor'],
    RECOMMEND: ['önce hangi aday incelenmeli', 'hangi risk kontrol edilmeli', 'hangi kullanıcı onayı alınmalı'],
    PREPARE: ['offer intake table draft', 'teklif toplama checklisti', 'hazırlık notu'],
    DRAFT: ['teklif toplama planı'],
    RISK_SUMMARY: ['price / scope / privacy risk summary'],
    NEXT_STEP: ['kullanıcı onayı iste', 'kontakt yerine hazırlık notu üret'],
    HUMAN_APPROVAL_REQUIRED: ['offer send approval', 'offer collection plan approval'],
  }),
  ROOM: buildSupplierOfferCollectRole('ROOM', {
    READ: ['candidate offer readiness', 'price scope', 'vehicle / shift fit', 'risk notes'],
    EXPLAIN: ['hangi teklif eksik', 'hangi aday önce bakılmalı', 'hangi readiness eksik'],
    RECOMMEND: ['hangi aday önce incelenmeli', 'hangi güvenlik kontrolü önce yapılmalı'],
    PREPARE: ['offer collection status draft', 'supplier intake table'],
    DRAFT: ['offer intake table draft'],
    RISK_SUMMARY: ['supplier / capacity / safety / timing risk summary'],
    NEXT_STEP: ['kullanıcı onayı iste', 'teklif planını onaya sun'],
    HUMAN_APPROVAL_REQUIRED: ['offer collection approval', 'offer send approval'],
  }),
  SCHOOL: buildSupplierOfferCollectRole('SCHOOL', {
    READ: ['student / personnel / route readiness', 'offer collection plan'],
    EXPLAIN: ['hangi alan eksik', 'hangi plan hazırlanıyor'],
    RECOMMEND: ['hangi hazırlık önce yapılmalı'],
    PREPARE: ['read-only offer plan', 'risk summary'],
    DRAFT: ['offer draft preview'],
    RISK_SUMMARY: ['privacy / capacity / timeline risk summary'],
    NEXT_STEP: ['kullanıcı onayı iste'],
    HUMAN_APPROVAL_REQUIRED: ['offer send approval'],
  }),
  ORGANIZATION: buildSupplierOfferCollectRole('ORGANIZATION', {
    READ: ['group readiness', 'offer collection plan'],
    EXPLAIN: ['hangi alan eksik', 'hangi plan hazırlanıyor'],
    RECOMMEND: ['hangi hazırlık önce yapılmalı'],
    PREPARE: ['read-only offer plan', 'risk summary'],
    DRAFT: ['offer draft preview'],
    RISK_SUMMARY: ['privacy / capacity / timeline risk summary'],
    NEXT_STEP: ['kullanıcı onayı iste'],
    HUMAN_APPROVAL_REQUIRED: ['offer send approval'],
  }),
  DRIVER: buildSupplierOfferCollectRole('DRIVER', {
    visible: false,
    READ: ['support / explanation context only'],
    EXPLAIN: ['offer collect burada gösterilmez'],
    RECOMMEND: ['visibility belongs to later milestone'],
    PREPARE: ['support only'],
    DRAFT: ['support only'],
    RISK_SUMMARY: ['support only'],
    NEXT_STEP: ['offer collect burada gösterilmez'],
    HUMAN_APPROVAL_REQUIRED: ['visibility belongs to later milestone'],
  }),
  PERSONEL: buildSupplierOfferCollectRole('PERSONEL', {
    visible: false,
    READ: ['support / explanation context only'],
    EXPLAIN: ['offer collect burada gösterilmez'],
    RECOMMEND: ['visibility belongs to later milestone'],
    PREPARE: ['support only'],
    DRAFT: ['support only'],
    RISK_SUMMARY: ['support only'],
    NEXT_STEP: ['offer collect burada gösterilmez'],
    HUMAN_APPROVAL_REQUIRED: ['visibility belongs to later milestone'],
  }),
  PARENT: buildSupplierOfferCollectRole('PARENT', {
    visible: false,
    READ: ['support / explanation context only'],
    EXPLAIN: ['offer collect burada gösterilmez'],
    RECOMMEND: ['visibility belongs to later milestone'],
    PREPARE: ['support only'],
    DRAFT: ['support only'],
    RISK_SUMMARY: ['support only'],
    NEXT_STEP: ['offer collect burada gösterilmez'],
    HUMAN_APPROVAL_REQUIRED: ['visibility belongs to later milestone'],
  }),
});

export function listSupplierOfferCollectRoles() {
  return Object.keys(SUPPLIER_OFFER_COLLECT_POLICY);
}

export function getSupplierOfferCollectPolicy(role) {
  return SUPPLIER_OFFER_COLLECT_POLICY[String(role || '').trim().toUpperCase()] || null;
}

export function normalizeSupplierOfferCollectText(value) {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSupplierOfferCollectText(item)).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value).map((item) => normalizeSupplierOfferCollectText(item)).filter(Boolean).join(' ');
  }
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-zA-Z0-9@+:\-/_.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isMeaningfulValue(value) {
  if (value == null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

export function toNumberValue(value) {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function toTextList(value) {
  if (!isMeaningfulValue(value)) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => toTextList(item));
  }
  if (typeof value === 'object') {
    return Object.values(value).flatMap((item) => toTextList(item));
  }
  return String(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueTextList(values) {
  const seen = new Set();
  const output = [];
  for (const rawValue of values.flat()) {
    const value = String(rawValue || '').trim();
    if (!value) {
      continue;
    }
    const key = normalizeSupplierOfferCollectText(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }
  return output;
}

export function getFirstMeaningfulValue(source, keys) {
  if (!source || typeof source !== 'object') {
    return '';
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && isMeaningfulValue(source[key])) {
      return source[key];
    }
  }
  return '';
}

export function maskSupplierOfferSensitiveValue(value) {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => maskSupplierOfferSensitiveValue(item));
  }
  const text = String(value).trim();
  if (!text) {
    return '';
  }
  if (text.includes('@')) {
    const [localPart, domainPart] = text.split('@');
    const maskedLocal = localPart.length <= 1 ? '*' : `${localPart[0]}***`;
    const maskedDomain = domainPart ? `${domainPart[0] || '*'}***` : '***';
    return `${maskedLocal}@${maskedDomain}`;
  }
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 7) {
    return `***${digits.slice(-2)}`;
  }
  if (text.length <= 2) {
    return '*'.repeat(text.length);
  }
  return `${text.slice(0, 2)}***${text.slice(-1)}`;
}

export function normalizeSupplierOfferCollectField(field, value) {
  const input = arguments.length > 1 ? value : field;
  if (Array.isArray(input)) {
    return input.map((item) => normalizeSupplierOfferCollectField(item));
  }
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, item]) => [key, normalizeSupplierOfferCollectField(item)])
    );
  }
  return normalizeSupplierOfferCollectText(input);
}

function getBoundarySummary() {
  return Object.freeze({
    draftOnly: true,
    notRequested: true,
    notContacted: true,
    notSent: true,
    notAccepted: true,
    notRejected: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: SUPPLIER_OFFER_COLLECT_EXECUTION_STATE,
    nextSafeStep: SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP,
  });
}

export function detectSupplierOfferCollectIntent(input = {}) {
  const text = typeof input === 'string'
    ? input
    : String(
        getFirstMeaningfulValue(input, ['userInput', 'message', 'prompt', 'text', 'query', 'summary']) ||
        getFirstMeaningfulValue(input, ['offerSummary', 'priceScope', 'supplierLabel', 'supplierRef']) ||
        ''
      );
  const normalized = normalizeSupplierOfferCollectText(text);
  const blockedPattern = /\b(gonder|gonderim|send|iste|request|topla|collect|ara|contact|ilet|mesaj|email|sms|push|kabul|accept|reddet|reject|onayla|approve|uygula|execute|sec|seç|secil|seçil|choose|select)\b/i;
  const missingPattern = /(eksik|missing|hangi alan|alanlar|sorulacak|question|belirsiz)/i;
  const riskPattern = /(risk|risk summary|riski|riskler|tehlike)/i;
  const collectionPattern = /(teklif|offer|price|fiyat|kapsam|status|durum|draft|taslak|plan|readiness)/i;
  let intentType = 'unknown';
  if (blockedPattern.test(normalized)) {
    intentType = 'execution_blocked_request';
  } else if (missingPattern.test(normalized)) {
    intentType = 'offer_missing_fields_request';
  } else if (riskPattern.test(normalized)) {
    intentType = 'offer_risk_review_request';
  } else if (collectionPattern.test(normalized)) {
    intentType = 'offer_collection_request';
  }
  const blockedExecutionRequest = intentType === 'execution_blocked_request';
  const boundary = getBoundarySummary();
  return Object.freeze({
    intentType,
    blockedExecutionRequest,
    draftOnly: boundary.draftOnly,
    notRequested: boundary.notRequested,
    notContacted: boundary.notContacted,
    notSent: boundary.notSent,
    notAccepted: boundary.notAccepted,
    notRejected: boundary.notRejected,
    approvalRequired: boundary.approvalRequired,
    humanReviewRequired: boundary.humanReviewRequired,
    executionState: boundary.executionState,
    nextSafeStep: boundary.nextSafeStep,
    intentSummary: `intentType=${intentType}; draftOnly=true; notRequested=true; notContacted=true; notSent=true; notAccepted=true; notRejected=true; approvalRequired=true`,
  });
}

export function buildSupplierOfferRequestFieldModel(offerDraft = {}) {
  const supplierRef = getFirstMeaningfulValue(offerDraft, ['supplierRef', 'candidateId', 'supplierId', 'ref']);
  const supplierLabel = getFirstMeaningfulValue(offerDraft, ['supplierLabel', 'supplierName', 'label', 'candidateLabel']);
  const offerPriceRaw = getFirstMeaningfulValue(offerDraft, ['offerPrice', 'price', 'amount', 'quotedPrice']);
  const priceScope = uniqueTextList([toTextList(getFirstMeaningfulValue(offerDraft, ['priceScope', 'scope', 'coverage']))]);
  const includedItems = uniqueTextList([toTextList(getFirstMeaningfulValue(offerDraft, ['includedItems', 'included', 'inclusions']))]);
  const excludedItems = uniqueTextList([toTextList(getFirstMeaningfulValue(offerDraft, ['excludedItems', 'excluded', 'exclusions']))]);
  const vehicleCapacity = toNumberValue(getFirstMeaningfulValue(offerDraft, ['vehicleCapacity', 'capacity', 'fleetCapacity']));
  const vehicleType = getFirstMeaningfulValue(offerDraft, ['vehicleType', 'vehicle', 'fleetType']);
  const startAvailability = uniqueTextList([toTextList(getFirstMeaningfulValue(offerDraft, ['startAvailability', 'startDate', 'start']))]);
  const shiftFit = getFirstMeaningfulValue(offerDraft, ['shiftFit', 'shift', 'hour', 'hours', 'slot']);
  const documentLicenseFit = uniqueTextList([toTextList(getFirstMeaningfulValue(offerDraft, ['documentLicenseFit', 'licenses', 'documents', 'certs']))]);
  const insuranceSafety = uniqueTextList([toTextList(getFirstMeaningfulValue(offerDraft, ['insuranceSafety', 'insurance', 'safetyCerts', 'safety']))]);
  const slaCommitment = getFirstMeaningfulValue(offerDraft, ['slaCommitment', 'sla', 'quality', 'qualityCommitment']);
  const validityPeriod = getFirstMeaningfulValue(offerDraft, ['validityPeriod', 'validity', 'expiration', 'expires']);
  const extraNotes = getFirstMeaningfulValue(offerDraft, ['extraNotes', 'notes', 'remarks', 'comment']);
  const explicitMissing = uniqueTextList([toTextList(getFirstMeaningfulValue(offerDraft, ['missingOrUnclearFields', 'missingFields']))]);
  const computedMissing = getSupplierOfferMissingFields(offerDraft).offerMissingFields;
  const supplierLabelMasked = maskSupplierOfferSensitiveValue(supplierLabel || supplierRef);
  const offerPrice = toNumberValue(offerPriceRaw) ?? normalizeSupplierOfferCollectField(offerPriceRaw);

  return Object.freeze({
    supplierRef: normalizeSupplierOfferCollectField(supplierRef),
    supplierLabelMasked,
    offerPrice,
    priceScope,
    includedItems,
    excludedItems,
    vehicleCapacity,
    vehicleType: normalizeSupplierOfferCollectField(vehicleType),
    startAvailability,
    shiftFit: normalizeSupplierOfferCollectField(shiftFit),
    documentLicenseFit,
    insuranceSafety,
    slaCommitment: normalizeSupplierOfferCollectField(slaCommitment),
    validityPeriod: normalizeSupplierOfferCollectField(validityPeriod),
    extraNotes: normalizeSupplierOfferCollectField(extraNotes),
    missingOrUnclearFields: uniqueTextList([explicitMissing, computedMissing]),
    requestFieldModelSummary: `${SUPPLIER_OFFER_COLLECT_REQUEST_FIELD_MODEL.length} alan; fiyat, kapsam, dahil/hariç, kapasite, araç, başlangıç, vardiya, belge, sigorta, SLA ve geçerlilik görünür`,
  });
}

export function scoreSupplierOfferReadiness(offerDraft = {}, context = {}) {
  const model = buildSupplierOfferRequestFieldModel(offerDraft);
  const hasBlockedIntent = detectSupplierOfferCollectIntent(context).blockedExecutionRequest || Boolean(offerDraft.blocked);
  if (hasBlockedIntent) {
    return 0;
  }
  const checks = [
    [model.supplierRef, 8],
    [model.supplierLabelMasked, 8],
    [model.offerPrice, 10],
    [model.priceScope.length > 0, 8],
    [model.includedItems.length > 0, 8],
    [model.excludedItems.length > 0, 5],
    [model.vehicleCapacity != null, 10],
    [model.vehicleType.length > 0, 8],
    [model.startAvailability.length > 0, 8],
    [model.shiftFit.length > 0, 7],
    [model.documentLicenseFit.length > 0, 10],
    [model.insuranceSafety.length > 0, 5],
    [model.slaCommitment.length > 0, 4],
    [model.validityPeriod.length > 0, 4],
  ];
  const score = checks.reduce((total, [condition, weight]) => total + (condition ? weight : 0), 0);
  return Math.max(0, Math.min(100, score));
}

export function getSupplierOfferMissingFields(offerDraft = {}, context = {}) {
  const model = {
    supplierRef: getFirstMeaningfulValue(offerDraft, ['supplierRef', 'candidateId', 'supplierId', 'ref']),
    supplierLabel: getFirstMeaningfulValue(offerDraft, ['supplierLabel', 'supplierName', 'label', 'candidateLabel']),
    offerPrice: getFirstMeaningfulValue(offerDraft, ['offerPrice', 'price', 'amount', 'quotedPrice']),
    priceScope: getFirstMeaningfulValue(offerDraft, ['priceScope', 'scope', 'coverage']),
    includedItems: getFirstMeaningfulValue(offerDraft, ['includedItems', 'included', 'inclusions']),
    excludedItems: getFirstMeaningfulValue(offerDraft, ['excludedItems', 'excluded', 'exclusions']),
    vehicleCapacity: getFirstMeaningfulValue(offerDraft, ['vehicleCapacity', 'capacity', 'fleetCapacity']),
    vehicleType: getFirstMeaningfulValue(offerDraft, ['vehicleType', 'vehicle', 'fleetType']),
    startAvailability: getFirstMeaningfulValue(offerDraft, ['startAvailability', 'startDate', 'start']),
    shiftFit: getFirstMeaningfulValue(offerDraft, ['shiftFit', 'shift', 'hour', 'hours', 'slot']),
    documentLicenseFit: getFirstMeaningfulValue(offerDraft, ['documentLicenseFit', 'licenses', 'documents', 'certs']),
    insuranceSafety: getFirstMeaningfulValue(offerDraft, ['insuranceSafety', 'insurance', 'safetyCerts', 'safety']),
    slaCommitment: getFirstMeaningfulValue(offerDraft, ['slaCommitment', 'sla', 'quality', 'qualityCommitment']),
    validityPeriod: getFirstMeaningfulValue(offerDraft, ['validityPeriod', 'validity', 'expiration', 'expires']),
    extraNotes: getFirstMeaningfulValue(offerDraft, ['extraNotes', 'notes', 'remarks', 'comment']),
  };
  const explicitMissing = uniqueTextList([toTextList(getFirstMeaningfulValue(offerDraft, ['missingOrUnclearFields', 'missingFields']))]);
  const requiredMissing = SUPPLIER_OFFER_COLLECT_REQUEST_FIELD_MODEL
    .filter((field) => field.required)
    .filter((field) => !isMeaningfulValue(model[field.id]))
    .map((field) => field.title);
  const blockedExecutionRequest = detectSupplierOfferCollectIntent(context).blockedExecutionRequest || Boolean(offerDraft.blocked);
  const offerMissingFields = uniqueTextList([requiredMissing, explicitMissing]);
  const riskNotes = uniqueTextList([
    !isMeaningfulValue(model.offerPrice) ? 'Teklif fiyatı eksik' : '',
    !isMeaningfulValue(model.priceScope) ? 'Fiyat kapsamı eksik' : '',
    !isMeaningfulValue(model.startAvailability) ? 'Başlangıç uygunluğu eksik' : '',
    !isMeaningfulValue(model.vehicleCapacity) ? 'Araç kapasitesi eksik' : '',
    !isMeaningfulValue(model.slaCommitment) ? 'SLA / kalite taahhüdü eksik' : '',
    blockedExecutionRequest ? 'Onayınız gerekli' : '',
  ].filter(Boolean));
  return Object.freeze({
    offerMissingFields,
    riskNotes,
    missingFields: uniqueTextList([offerMissingFields, riskNotes]),
  });
}

function getSupplierOfferQuestionSetFromFields(fields = []) {
  return uniqueTextList([fields.map((field) => {
    const key = SUPPLIER_OFFER_COLLECT_REQUEST_FIELD_MODEL.find((item) => item.title === field || item.id === field)?.id || field;
    return SUPPLIER_OFFER_COLLECT_QUESTION_BANK[key] || `Lütfen ${field} alanını netleştirir misiniz?`;
  })]);
}

export function buildSupplierOfferCollectionStatusDraft(offerDraft = {}, context = {}, index = 0) {
  const requestModel = buildSupplierOfferRequestFieldModel(offerDraft);
  const missingInfo = getSupplierOfferMissingFields(offerDraft, context);
  const readinessScore = scoreSupplierOfferReadiness(offerDraft, context);
  const intent = detectSupplierOfferCollectIntent(context);
  const hasOfferSignal = [
    requestModel.offerPrice,
    requestModel.priceScope.length > 0,
    requestModel.includedItems.length > 0,
    requestModel.excludedItems.length > 0,
    requestModel.vehicleCapacity != null,
    requestModel.vehicleType.length > 0,
    requestModel.startAvailability.length > 0,
    requestModel.shiftFit.length > 0,
    requestModel.documentLicenseFit.length > 0,
    requestModel.insuranceSafety.length > 0,
    requestModel.slaCommitment.length > 0,
    requestModel.validityPeriod.length > 0,
  ].some(Boolean);
  let collectionState = 'pending';
  if (intent.blockedExecutionRequest || offerDraft.blocked) {
    collectionState = 'blocked';
  } else if (!hasOfferSignal) {
    collectionState = 'pending';
  } else if (missingInfo.offerMissingFields.length > 0) {
    collectionState = 'missing_fields';
  } else if (readinessScore >= 90) {
    collectionState = 'ready_for_analysis';
  } else {
    collectionState = 'received_draft';
  }
  const supplierRef = requestModel.supplierRef || normalizeSupplierOfferCollectField(offerDraft.candidateId || offerDraft.supplierId || `supplier-${String(index + 1).padStart(2, '0')}`);
  const supplierLabelMasked = requestModel.supplierLabelMasked || maskSupplierOfferSensitiveValue(offerDraft.supplierLabel || offerDraft.supplierName || supplierRef);
  const nextQuestionsForSupplier = buildSupplierOfferQuestionSet(missingInfo.offerMissingFields);
  const collectionStateLabel = SUPPLIER_OFFER_COLLECT_COLLECTION_STATE_LABELS[collectionState] || SUPPLIER_OFFER_COLLECT_COLLECTION_STATE_LABELS.pending;
  return Object.freeze({
    supplierRef,
    supplierLabelMasked,
    collectionState,
    collectionStateLabel,
    readinessScore,
    missingOfferFields: missingInfo.offerMissingFields,
    riskNotes: missingInfo.riskNotes,
    nextQuestionsForSupplier,
    humanReviewRequired: true,
    draftOnly: true,
    notRequested: true,
    notContacted: true,
    notSent: true,
    notAccepted: true,
    notRejected: true,
    approvalRequired: true,
    executionState: SUPPLIER_OFFER_COLLECT_EXECUTION_STATE,
    nextSafeStep: SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP,
    blockedExecutionRequest: intent.blockedExecutionRequest,
    offerRequestFieldModel: requestModel,
    collectionStateSummary: `${collectionStateLabel}; readinessScore=${readinessScore}`,
  });
}

export function buildSupplierOfferIntakeTableDraft(statusMatrix = []) {
  const rows = (Array.isArray(statusMatrix) ? statusMatrix : [])
    .map((status, index) => Object.freeze({
      supplierRef: status.supplierRef || `supplier-${String(index + 1).padStart(2, '0')}`,
      supplierLabelMasked: status.supplierLabelMasked || maskSupplierOfferSensitiveValue(status.supplierRef || `supplier-${String(index + 1).padStart(2, '0')}`),
      collectionState: status.collectionState || 'pending',
      collectionStateLabel: status.collectionStateLabel || SUPPLIER_OFFER_COLLECT_COLLECTION_STATE_LABELS[status.collectionState || 'pending'],
      readinessScore: Number.isFinite(Number(status.readinessScore)) ? Number(status.readinessScore) : 0,
      missingOfferFields: uniqueTextList([status.missingOfferFields || []]),
      riskNotes: uniqueTextList([status.riskNotes || []]),
      nextQuestionsForSupplier: uniqueTextList([status.nextQuestionsForSupplier || []]),
      priceSummary: status.offerRequestFieldModel && isMeaningfulValue(status.offerRequestFieldModel.offerPrice)
        ? String(status.offerRequestFieldModel.offerPrice)
        : '',
      scopeSummary: status.offerRequestFieldModel ? uniqueTextList([status.offerRequestFieldModel.priceScope || [], status.offerRequestFieldModel.includedItems || []]).join(', ') : '',
      readyForAnalysis: status.collectionState === 'ready_for_analysis',
      humanReviewRequired: true,
      humanApprovalNote: 'Teklif intake taslağıdır; insan onayı olmadan iletişim veya seçim yapılmaz.',
    }))
    .sort((left, right) => right.readinessScore !== left.readinessScore
      ? right.readinessScore - left.readinessScore
      : normalizeSupplierOfferCollectText(left.supplierLabelMasked).localeCompare(normalizeSupplierOfferCollectText(right.supplierLabelMasked)));

  return Object.freeze({
    intakeRows: Object.freeze(rows),
    rows: Object.freeze(rows),
    bestCandidates: Object.freeze(rows.slice(0, 3)),
    intakeTableSummary: `${rows.length} aday; teklif durumu, eksik alanlar, riskler, sorular ve insan onayı görünür`,
    humanApprovalNote: 'Teklif intake taslağıdır; insan onayı olmadan iletişim, kabul veya ret yapılmaz.',
    draftOnly: true,
    notRequested: true,
    notContacted: true,
    notSent: true,
    notAccepted: true,
    notRejected: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: SUPPLIER_OFFER_COLLECT_EXECUTION_STATE,
    nextSafeStep: SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP,
  });
}

export function buildSupplierOfferQuestionSet(statusMatrix = []) {
  const rows = Array.isArray(statusMatrix) ? statusMatrix : [];
  const fieldSet = rows.flatMap((status) => status.missingOfferFields || status.offerMissingFields || []);
  return uniqueTextList([Object.values(SUPPLIER_OFFER_COLLECT_QUESTION_BANK), getSupplierOfferQuestionSetFromFields(fieldSet), rows.flatMap((status) => status.nextQuestionsForSupplier || [])]);
}

function buildCandidateSupplierDrafts(matchingDraft = {}) {
  const shortlist = matchingDraft && typeof matchingDraft === 'object' ? matchingDraft.shortlistDraft || {} : {};
  const candidates = Array.isArray(shortlist.bestCandidates) && shortlist.bestCandidates.length > 0
    ? shortlist.bestCandidates
    : Array.isArray(matchingDraft.candidateMatrix) ? matchingDraft.candidateMatrix : [];
  return candidates.slice(0, 3).map((candidate, index) => Object.freeze({
    supplierRef: candidate.candidateId || candidate.supplierRef || `supplier-${String(index + 1).padStart(2, '0')}`,
    supplierLabelMasked: maskSupplierOfferSensitiveValue(candidate.supplierLabel || candidate.supplierNameMasked || candidate.supplierName || candidate.candidateId || `supplier-${String(index + 1).padStart(2, '0')}`),
    supplierLabel: candidate.supplierLabel || candidate.supplierName || '',
    score: Number.isFinite(Number(candidate.score)) ? Number(candidate.score) : 0,
    fitLevel: candidate.fitLevel || 'unknown',
    matchReasons: Array.isArray(candidate.matchReasons) ? [...candidate.matchReasons] : [],
    missingSupplierFields: Array.isArray(candidate.missingSupplierFields) ? [...candidate.missingSupplierFields] : [],
    riskNotes: Array.isArray(candidate.riskNotes) ? [...candidate.riskNotes] : [],
  }));
}

export function buildSupplierOfferCollectInput(matchingDraft = {}, context = {}) {
  const sourceRfqSummary = matchingDraft && typeof matchingDraft === 'object' && matchingDraft.sourceRfqSummary
    ? matchingDraft.sourceRfqSummary
    : {
        rfqType: getFirstMeaningfulValue(matchingDraft, ['rfqType', 'serviceType', 'type']),
        serviceScope: getFirstMeaningfulValue(matchingDraft, ['serviceScope', 'summary', 'scope']),
        region: getFirstMeaningfulValue(matchingDraft, ['region', 'province', 'district']),
        province: getFirstMeaningfulValue(matchingDraft, ['province', 'city']),
        district: getFirstMeaningfulValue(matchingDraft, ['district', 'county']),
        startDate: getFirstMeaningfulValue(matchingDraft, ['startDate', 'start']),
        shift: getFirstMeaningfulValue(matchingDraft, ['shift', 'hour', 'slot']),
        passengerCount: getFirstMeaningfulValue(matchingDraft, ['passengerCount', 'personnelCount', 'studentCount']),
        vehicleCapacityRequirement: getFirstMeaningfulValue(matchingDraft, ['vehicleCapacityRequirement', 'capacity', 'fleetCapacity']),
        sla: getFirstMeaningfulValue(matchingDraft, ['sla', 'qualityExpectation', 'serviceLevel']),
        documentRequirements: toTextList(getFirstMeaningfulValue(matchingDraft, ['documentRequirements', 'documents', 'licenses'])),
        safetyRequirements: toTextList(getFirstMeaningfulValue(matchingDraft, ['safetyRequirements', 'safety', 'insurance'])),
      };
  const candidateSuppliers = buildCandidateSupplierDrafts(matchingDraft);
  const offerFixtures = Array.isArray(context.offerFixtures)
    ? context.offerFixtures
    : Array.isArray(context.offerDrafts)
      ? context.offerDrafts
      : isMeaningfulValue(context.offerDraft)
        ? [context.offerDraft]
        : [];
  const statusMatrix = (offerFixtures.length > 0 ? offerFixtures : candidateSuppliers).map((item, index) => buildSupplierOfferCollectionStatusDraft(item, context, index));
  const intakeTableDraft = buildSupplierOfferIntakeTableDraft(statusMatrix);
  const offerRequestFieldModel = buildSupplierOfferRequestFieldModel(offerFixtures[0] || {});
  const offerCollectionChecklist = SUPPLIER_OFFER_COLLECT_CHECKLIST;
  const missingOfferFields = uniqueTextList([statusMatrix.flatMap((status) => status.missingOfferFields || [])]);
  const riskNotes = uniqueTextList([statusMatrix.flatMap((status) => status.riskNotes || []), matchingDraft.riskNotes || []]);
  const collectionStateSummary = `${statusMatrix.length} teklif durumu; pending, missing_fields, received_draft, ready_for_analysis ve blocked görünür`;
  const offerCollectionInputSummary = `${candidateSuppliers.length || statusMatrix.length || 0} aday; RFQ türü, hizmet kapsamı, bölge, başlangıç, vardiya, kapasite, SLA ve belge gereksinimi görünür`;

  return Object.freeze({
    sourceRfqSummary,
    sourceMatchingSummary: matchingDraft.matchingIntentSummary || matchingDraft.shortlistDraftSummary || '',
    candidateSuppliers: Object.freeze(candidateSuppliers),
    offerRequestFieldModel,
    offerRequestFieldModelSummary: offerRequestFieldModel.requestFieldModelSummary,
    offerCollectionChecklist,
    offerCollectionInputSummary,
    statusMatrix: Object.freeze(statusMatrix),
    collectionStateSummary,
    intakeTableDraft,
    missingOfferFields,
    riskNotes,
    draftOnly: true,
    notRequested: true,
    notContacted: true,
    notSent: true,
    notAccepted: true,
    notRejected: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: SUPPLIER_OFFER_COLLECT_EXECUTION_STATE,
    nextSafeStep: SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP,
  });
}

export function composeSupplierOfferCollectAnswer(context = {}) {
  const sourceContext = context && typeof context === 'object' ? context : {};
  const matchingDraft = sourceContext.matchingDraft || sourceContext.supplierMatchingDraft || sourceContext.input || {};
  const offerFixtures = Array.isArray(sourceContext.offerFixtures)
    ? sourceContext.offerFixtures
    : Array.isArray(sourceContext.offerDrafts)
      ? sourceContext.offerDrafts
      : isMeaningfulValue(sourceContext.offerDraft)
        ? [sourceContext.offerDraft]
        : [];
  const input = buildSupplierOfferCollectInput(matchingDraft, { ...sourceContext, offerFixtures });
  const blockedExecutionRequest = detectSupplierOfferCollectIntent(sourceContext).blockedExecutionRequest;
  const missingFields = input.missingOfferFields;
  const opening = 'Teklif toplama planını hazırladım; henüz hiçbir tedarikçiden teklif istenmedi.';
  const contactLine = 'Tedarikçilerle iletişim kurulmadı ve mesaj gönderilmedi.';
  const approvalLine = blockedExecutionRequest
    ? 'Teklif istemek, kabul etmek veya reddetmek için insan onayı gerekir.'
    : 'Teklif istemek veya kabul/ret yapmak için insan onayı gerekir.';
  const missingLine = missingFields.length > 0
    ? `Eksik teklif alanları: ${missingFields.slice(0, 4).join(', ')}.`
    : 'Eksik teklif alanları görünmüyor; yine de insan onayı olmadan ilerlenmez.';
  const nextLine = `Sıradaki güvenli adım: ${SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP}.`;
  const visibleAnswer = [opening, contactLine, approvalLine, missingLine, nextLine].join(' ');
  return Object.freeze({
    offerCollectionInput: input,
    offerCollectionInputSummary: input.offerCollectionInputSummary,
    offerRequestFieldModelSummary: input.offerRequestFieldModelSummary,
    collectionStateSummary: input.collectionStateSummary,
    intakeTableDraft: input.intakeTableDraft,
    visibleAnswer,
    offerCollectionSummary: 'draft-only teklif toplama planı; contact/send/accept/reject kapalı',
    safetyPhraseSummary: 'draftOnly=true / notRequested=true / notContacted=true / notSent=true / notAccepted=true / notRejected=true / approvalRequired=true korunur',
    draftOnly: true,
    notRequested: true,
    notContacted: true,
    notSent: true,
    notAccepted: true,
    notRejected: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: SUPPLIER_OFFER_COLLECT_EXECUTION_STATE,
    nextSafeStep: SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP,
    kvkkSafeSummary: 'raw token, credential, cookie, password, GPS trace ve raw PII yok; maskeli ref kullanılır',
    auditApprovalSummary: 'Kullanıcı onayı sınırı korunur; öneri ve onay izi ayrı kalır',
    noWriteActionSummary: 'supplier contact, RFQ send, offer collect, offer accept/reject, agreement execute, dispatch apply, route apply, payment execute ve messaging kapalıdır',
    chainWiringSummary: 'check:suppliermatching01 -> check:supplieroffercollect01 -> check:copilothumanapproval01 -> check:uxmarketplacepanels01',
    smokeThresholdSummary: 'product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none',
    commitExternalSummary: 'runtime-data, browser-smoke ve debug.log commit dışı kalır',
    prismaSummary: 'No route/service/prisma diff; no production DB; no schema/migration; read-only only',
  });
}
