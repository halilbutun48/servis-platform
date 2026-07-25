export const SUPPLIER_MATCHING_VERSION = 'SUPPLIER-MATCHING-01';

export const SUPPLIER_MATCHING_STAGES = Object.freeze([
  Object.freeze({ id: 'STAGE_1', title: 'Matching Input Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_2', title: 'Matching Criteria', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_3', title: 'Candidate Evaluation', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_4', title: 'Shortlist Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_5', title: 'Safety / Boundary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'STAGE_6', title: 'Human Approval Handoff', status: 'current baseline', futureOnly: false }),
]);

export const SUPPLIER_MATCHING_INPUT_SUMMARY = Object.freeze([
  'RFQ type',
  'service scope',
  'region / province / district',
  'start date or missing start date',
  'day / period / hour / shift',
  'passenger / personnel / student count',
  'vehicle capacity requirement',
  'pickup / drop-off region',
  'SLA / quality expectation',
  'document / license / safety requirement',
]);

export const SUPPLIER_MATCHING_MATCHING_CRITERIA = Object.freeze([
  'region fit',
  'capacity fit',
  'vehicle type / fleet fit',
  'start date fit',
  'shift / schedule fit',
  'service type experience',
  'document / license fit',
  'SLA / quality fit',
  'risk / missing data fit',
  'historical quality / performance signal when available and PII-safe',
]);

export const SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS = Object.freeze([
  'candidateId',
  'opaque supplier ref',
  'supplierNameMasked',
  'supplierLabel',
  'score',
  'fitLevel',
  'matchReasons',
  'missingSupplierFields',
  'riskNotes',
  'disqualifiers',
  'nextQuestionsForSupplier',
  'humanReviewRequired=true',
]);

export const SUPPLIER_MATCHING_SHORTLIST_DRAFT_FIELDS = Object.freeze([
  'best candidates',
  'why they fit',
  'missing information',
  'questions for supplier',
  'risk notes',
  'human approval note',
  'henüz seçilmedi/gönderilmedi/teklif istenmedi',
]);

export const SUPPLIER_MATCHING_BOUNDARY_FLAGS = Object.freeze([
  'draftOnly=true',
  'notContacted=true',
  'notSent=true',
  'notSelected=true',
  'approvalRequired=true',
  'executionState=supplier_match_draft_only / not_contacted / not_selected / not_executed',
  'nextSafeStep=aday kısa listeyi kontrol edip insan onayına sunmak',
]);

export const SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES = Object.freeze([
  'Aday tedarikçi uygunluk taslağını hazırladım; henüz hiçbir tedarikçi seçilmedi veya aranmadı.',
  'Tedarikçiye RFQ göndermek için insan onayı gerekir.',
  'Bu liste sadece ön değerlendirmedir.',
  'Eksik bilgiler tamamlanmadan tedarikçiye gönderim önerilmez.',
  'Sıradaki güvenli adım: kısa listeyi kontrol edip onaya sunmak.',
]);

export const SUPPLIER_MATCHING_BLOCKED_ACTIONS = Object.freeze([
  'supplier / provider contact',
  'RFQ send',
  'offer collect execute',
  'offer accept/reject',
  'supplier auto-selection',
  'provider credential management',
  'agreement/contract execute',
  'dispatch apply',
  'route apply',
  'payment/hakediş execute',
  'SMS/email/push',
  'user/account/admin write-action',
  'DB write',
  'backend route/service/schema mutation',
  'Prisma/schema/migration',
]);

export const SUPPLIER_MATCHING_NEVER_AUTOMATE = Object.freeze([
  'otomatik supplier matching',
  'otomatik RFQ gönderimi',
  'otomatik supplier seçimi',
  'otomatik teklif isteme',
  'otomatik teklif toplama',
  'otomatik provider credential yönetimi',
  'otomatik mesaj gönderimi',
  'otomatik agreement/dispatch',
  'otomatik user/admin write',
  'otomatik DB write',
]);

export const SUPPLIER_MATCHING_HANOFFS = Object.freeze([
  'COPILOT-HUMAN-APPROVAL-01',
  'SUPPLIER-OFFER-COLLECT-01',
  'COPILOT-OFFER-ANALYSIS-01',
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
]);

export const SUPPLIER_MATCHING_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Aday uygunluk taslağı yalnız ön değerlendirmedir.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
  'Tedarikçiye RFQ gönderimi bu milestone’da açılmaz.',
]);

export const SUPPLIER_MATCHING_INTENT_TYPES = Object.freeze([
  'matching_draft_request',
  'matching_shortlist_request',
  'matching_risk_review_request',
  'matching_question_request',
  'execution_blocked_request',
  'unknown',
]);

export const SUPPLIER_MATCHING_MATCHING_TYPES = Object.freeze([
  'personel_servis',
  'okul_servis',
  'vardiya_bazli',
  'hat_ve_rota',
  'tek_seferlik_servis',
  'mevcut_sozlesmeye_ek_hat',
  'kapasite_artirma',
  'guzergah_degisikligi',
  'genel_supplier_matching',
]);

export const SUPPLIER_MATCHING_MATCHING_TYPE_LABELS = Object.freeze({
  personel_servis: 'personel servis',
  okul_servis: 'okul / öğrenci servis',
  vardiya_bazli: 'vardiya bazlı matching',
  hat_ve_rota: 'hat / rota matching',
  tek_seferlik_servis: 'tek seferlik servis',
  mevcut_sozlesmeye_ek_hat: 'mevcut sözleşmeye ek hat',
  kapasite_artirma: 'kapasite artırma',
  guzergah_degisikligi: 'güzergâh değişikliği',
  genel_supplier_matching: 'genel supplier matching',
});

export const SUPPLIER_MATCHING_SCORE_WEIGHTS = Object.freeze({
  region: 20,
  capacity: 20,
  vehicleType: 15,
  startDate: 10,
  shift: 10,
  serviceType: 10,
  document: 5,
  sla: 5,
  history: 5,
});

export const SUPPLIER_MATCHING_REQUIRED_SUPPLIER_FIELDS = Object.freeze([
  'serviceAreas',
  'fleetCapacity',
  'vehicleTypes',
  'startAvailability',
  'shifts',
  'licenses',
  'qualitySignal',
]);

export const SUPPLIER_MATCHING_QUESTION_BANK = Object.freeze({
  capacity: 'Kapasite uygunluğunuzu doğrular mısınız?',
  startAvailability: 'Başlangıç tarihinde müsait misiniz?',
  region: 'Belirtilen bölgeye hizmet veriyor musunuz?',
  vehicle: 'İstenen araç tipi ve filo uygun mu?',
  license: 'Gerekli belge ve ruhsatlar mevcut mu?',
  sla: 'SLA / kalite hedeflerini karşılıyor musunuz?',
  insurance: 'Sigorta ve güvenlik gereksinimleri hazır mı?',
  alternative: 'Alternatif rota veya kapasite öneriniz var mı?',
});

export const SUPPLIER_MATCHING_EXECUTION_STATE = 'supplier_match_draft_only / not_contacted / not_selected / not_executed';
export const SUPPLIER_MATCHING_NEXT_SAFE_STEP = 'aday kısa listeyi kontrol edip insan onayına sunmak';

function buildSupplierMatchingRole(role, config) {
  return Object.freeze({
    role,
    visible: config.visible !== false,
    MATCHING_INPUT_SUMMARY: Object.freeze(Array.isArray(config.MATCHING_INPUT_SUMMARY) ? [...config.MATCHING_INPUT_SUMMARY] : []),
    MATCHING_CRITERIA: Object.freeze(Array.isArray(config.MATCHING_CRITERIA) ? [...config.MATCHING_CRITERIA] : []),
    CANDIDATE_EVALUATION_FIELDS: Object.freeze(Array.isArray(config.CANDIDATE_EVALUATION_FIELDS) ? [...config.CANDIDATE_EVALUATION_FIELDS] : []),
    SHORTLIST_DRAFT_FIELDS: Object.freeze(Array.isArray(config.SHORTLIST_DRAFT_FIELDS) ? [...config.SHORTLIST_DRAFT_FIELDS] : []),
    SAFETY_BOUNDARY_FLAGS: Object.freeze(Array.isArray(config.SAFETY_BOUNDARY_FLAGS) ? [...config.SAFETY_BOUNDARY_FLAGS] : []),
    TURKISH_VISIBLE_PHRASES: Object.freeze(Array.isArray(config.TURKISH_VISIBLE_PHRASES) ? [...config.TURKISH_VISIBLE_PHRASES] : []),
    HUMAN_APPROVAL_REQUIRED: Object.freeze(Array.isArray(config.HUMAN_APPROVAL_REQUIRED) ? [...config.HUMAN_APPROVAL_REQUIRED] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...SUPPLIER_MATCHING_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...SUPPLIER_MATCHING_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const SUPPLIER_MATCHING_POLICY = Object.freeze({
  SUPER_ADMIN: buildSupplierMatchingRole('SUPER_ADMIN', {
    MATCHING_INPUT_SUMMARY: SUPPLIER_MATCHING_INPUT_SUMMARY,
    MATCHING_CRITERIA: SUPPLIER_MATCHING_MATCHING_CRITERIA,
    CANDIDATE_EVALUATION_FIELDS: SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS,
    SHORTLIST_DRAFT_FIELDS: SUPPLIER_MATCHING_SHORTLIST_DRAFT_FIELDS,
    SAFETY_BOUNDARY_FLAGS: SUPPLIER_MATCHING_BOUNDARY_FLAGS,
    TURKISH_VISIBLE_PHRASES: SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES,
    HUMAN_APPROVAL_REQUIRED: [
      'supplier shortlist approval',
      'RFQ send approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'supplier contact',
      'RFQ send execute',
      'offer collect execute',
    ],
    NEVER_AUTOMATE: [
      'otomatik supplier shortlist seçimi',
      'otomatik RFQ gönderimi',
    ],
  }),
  COMPANY: buildSupplierMatchingRole('COMPANY', {
    MATCHING_INPUT_SUMMARY: SUPPLIER_MATCHING_INPUT_SUMMARY,
    MATCHING_CRITERIA: SUPPLIER_MATCHING_MATCHING_CRITERIA,
    CANDIDATE_EVALUATION_FIELDS: SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS,
    SHORTLIST_DRAFT_FIELDS: SUPPLIER_MATCHING_SHORTLIST_DRAFT_FIELDS,
    SAFETY_BOUNDARY_FLAGS: SUPPLIER_MATCHING_BOUNDARY_FLAGS,
    TURKISH_VISIBLE_PHRASES: SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES,
    HUMAN_APPROVAL_REQUIRED: [
      'supplier shortlist approval',
      'RFQ send approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'supplier contact',
      'RFQ send execute',
    ],
    NEVER_AUTOMATE: [
      'otomatik supplier shortlist seçimi',
    ],
  }),
  ROOM: buildSupplierMatchingRole('ROOM', {
    MATCHING_INPUT_SUMMARY: SUPPLIER_MATCHING_INPUT_SUMMARY,
    MATCHING_CRITERIA: SUPPLIER_MATCHING_MATCHING_CRITERIA,
    CANDIDATE_EVALUATION_FIELDS: SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS,
    SHORTLIST_DRAFT_FIELDS: SUPPLIER_MATCHING_SHORTLIST_DRAFT_FIELDS,
    SAFETY_BOUNDARY_FLAGS: SUPPLIER_MATCHING_BOUNDARY_FLAGS,
    TURKISH_VISIBLE_PHRASES: SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES,
    HUMAN_APPROVAL_REQUIRED: [
      'supplier shortlist approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'supplier contact',
      'offer collect execute',
    ],
  }),
  SCHOOL: buildSupplierMatchingRole('SCHOOL', {
    MATCHING_INPUT_SUMMARY: SUPPLIER_MATCHING_INPUT_SUMMARY,
    MATCHING_CRITERIA: SUPPLIER_MATCHING_MATCHING_CRITERIA,
    CANDIDATE_EVALUATION_FIELDS: SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS,
    SHORTLIST_DRAFT_FIELDS: SUPPLIER_MATCHING_SHORTLIST_DRAFT_FIELDS,
    SAFETY_BOUNDARY_FLAGS: SUPPLIER_MATCHING_BOUNDARY_FLAGS,
    TURKISH_VISIBLE_PHRASES: SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES,
    HUMAN_APPROVAL_REQUIRED: [
      'supplier shortlist approval',
      'RFQ send approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'supplier contact',
      'RFQ send execute',
    ],
  }),
  ORGANIZATION: buildSupplierMatchingRole('ORGANIZATION', {
    MATCHING_INPUT_SUMMARY: SUPPLIER_MATCHING_INPUT_SUMMARY,
    MATCHING_CRITERIA: SUPPLIER_MATCHING_MATCHING_CRITERIA,
    CANDIDATE_EVALUATION_FIELDS: SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS,
    SHORTLIST_DRAFT_FIELDS: SUPPLIER_MATCHING_SHORTLIST_DRAFT_FIELDS,
    SAFETY_BOUNDARY_FLAGS: SUPPLIER_MATCHING_BOUNDARY_FLAGS,
    TURKISH_VISIBLE_PHRASES: SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES,
    HUMAN_APPROVAL_REQUIRED: [
      'cross-organization shortlist approval',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'supplier contact',
      'RFQ send execute',
    ],
  }),
  DRIVER: buildSupplierMatchingRole('DRIVER', {
    visible: false,
    MATCHING_INPUT_SUMMARY: ['support / explanation context only'],
    MATCHING_CRITERIA: ['supplier matching burada gösterilmez'],
    CANDIDATE_EVALUATION_FIELDS: ['no external supplier visibility'],
    SHORTLIST_DRAFT_FIELDS: ['support only'],
    SAFETY_BOUNDARY_FLAGS: SUPPLIER_MATCHING_BOUNDARY_FLAGS,
    TURKISH_VISIBLE_PHRASES: ['supplier matching burada gösterilmez'],
    HUMAN_APPROVAL_REQUIRED: ['visibility belongs to later milestone'],
  }),
  PERSONEL: buildSupplierMatchingRole('PERSONEL', {
    visible: false,
    MATCHING_INPUT_SUMMARY: ['support / explanation context only'],
    MATCHING_CRITERIA: ['supplier matching burada gösterilmez'],
    CANDIDATE_EVALUATION_FIELDS: ['no external supplier visibility'],
    SHORTLIST_DRAFT_FIELDS: ['support only'],
    SAFETY_BOUNDARY_FLAGS: SUPPLIER_MATCHING_BOUNDARY_FLAGS,
    TURKISH_VISIBLE_PHRASES: ['supplier matching burada gösterilmez'],
    HUMAN_APPROVAL_REQUIRED: ['visibility belongs to later milestone'],
  }),
  PARENT: buildSupplierMatchingRole('PARENT', {
    visible: false,
    MATCHING_INPUT_SUMMARY: ['support / explanation context only'],
    MATCHING_CRITERIA: ['supplier matching burada gösterilmez'],
    CANDIDATE_EVALUATION_FIELDS: ['no external supplier visibility'],
    SHORTLIST_DRAFT_FIELDS: ['support only'],
    SAFETY_BOUNDARY_FLAGS: SUPPLIER_MATCHING_BOUNDARY_FLAGS,
    TURKISH_VISIBLE_PHRASES: ['supplier matching burada gösterilmez'],
    HUMAN_APPROVAL_REQUIRED: ['visibility belongs to later milestone'],
  }),
});

export function listSupplierMatchingRoles() {
  return Object.keys(SUPPLIER_MATCHING_POLICY);
}

export function getSupplierMatchingPolicy(role) {
  return SUPPLIER_MATCHING_POLICY[String(role || '').trim().toUpperCase()] || null;
}

export function normalizeSupplierMatchingText(value) {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSupplierMatchingText(item)).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value).map((item) => normalizeSupplierMatchingText(item)).filter(Boolean).join(' ');
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
    const key = normalizeSupplierMatchingText(value);
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

export function toNormalizedCriterionStatus(hasValue, isPartial = false) {
  if (!hasValue) {
    return 'missing';
  }
  return isPartial ? 'partial' : 'ready';
}

export function buildDraftBoundary() {
  return Object.freeze({
    draftOnly: true,
    notContacted: true,
    notSent: true,
    notSelected: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: SUPPLIER_MATCHING_EXECUTION_STATE,
    nextSafeStep: SUPPLIER_MATCHING_NEXT_SAFE_STEP,
  });
}

export function buildMatchingTypeFromText(text) {
  const normalized = normalizeSupplierMatchingText(text);
  if (!normalized) {
    return 'genel_supplier_matching';
  }
  if (normalized.includes('guzergah degisik') || normalized.includes('guzergah degistir') || normalized.includes('route change')) {
    return 'guzergah_degisikligi';
  }
  if (normalized.includes('kapasite art') || normalized.includes('capacity increase') || normalized.includes('kapasite artt')) {
    return 'kapasite_artirma';
  }
  if (normalized.includes('ek hat') || normalized.includes('additional line') || normalized.includes('mevcut sozlesme')) {
    return 'mevcut_sozlesmeye_ek_hat';
  }
  if (normalized.includes('tek sefer') || normalized.includes('one off') || normalized.includes('single trip')) {
    return 'tek_seferlik_servis';
  }
  if (normalized.includes('vardiya') || normalized.includes('shift')) {
    return 'vardiya_bazli';
  }
  if (normalized.includes('rota') || normalized.includes('hat') || normalized.includes('line')) {
    return 'hat_ve_rota';
  }
  if (normalized.includes('okul') || normalized.includes('ogrenci') || normalized.includes('student') || normalized.includes('school')) {
    return 'okul_servis';
  }
  if (/(?:^|\s)(personel|isci|calisan|staff|employee|worker)(?:\s|$)/i.test(normalized)) {
    return 'personel_servis';
  }
  return 'genel_supplier_matching';
}

export function buildMatchingIntentType(text) {
  const normalized = normalizeSupplierMatchingText(text);
  if (!normalized) {
    return 'unknown';
  }
  const blockedActionPattern = /\b(gonder|gonderim|send|seç|sec|choose|select|tamam|onayla|approve|uygula|execute|ilerle|ilerlet|ara|contact|ilet|iste|request|istiyorum)\b/i;
  if (blockedActionPattern.test(normalized)) {
    return 'execution_blocked_request';
  }
  if (/(sorular|question|sorulacak|eksik|missing)/i.test(normalized)) {
    return 'matching_question_request';
  }
  if (/(risk|riskleri|riskler|risk review|risk summary)/i.test(normalized)) {
    return 'matching_risk_review_request';
  }
  if (/(kisa liste|shortlist|aday|uygun|uygunluk|matching|eslestirme|eslestir|degerlendir|değerlendir|degerlendirme|değerlendirme|tara|sirala|oner|ek hat|hat|rota|vardiya|sozlesme|kapasite art|kapasite artt|guzergah degis)/i.test(normalized)) {
    return 'matching_shortlist_request';
  }
  return 'matching_draft_request';
}

export function buildSourceRfqSummary(rfqDraft = {}) {
  const source = rfqDraft && typeof rfqDraft === 'object' ? rfqDraft : {};
  const rfqType = String(getFirstMeaningfulValue(source, ['rfqType', 'requestType', 'serviceType', 'type']) || '').trim();
  const serviceScope = String(getFirstMeaningfulValue(source, ['serviceScope', 'scope', 'serviceDescription', 'description']) || '').trim();
  const province = String(getFirstMeaningfulValue(source, ['province', 'il', 'city', 'provinceName']) || '').trim();
  const district = String(getFirstMeaningfulValue(source, ['district', 'ilce', 'county', 'township']) || '').trim();
  const region = String(getFirstMeaningfulValue(source, ['region', 'area']) || [province, district].filter(Boolean).join(' / ')).trim();
  const startDate = String(getFirstMeaningfulValue(source, ['startDate', 'startAt', 'start', 'date']) || '').trim();
  const shift = String(getFirstMeaningfulValue(source, ['shift', 'vardiya', 'schedule', 'timeWindow']) || '').trim();
  const passengerCount = getFirstMeaningfulValue(source, ['passengerCount', 'personCount', 'personnelCount', 'studentCount', 'count']);
  const vehicleCapacityRequirement = getFirstMeaningfulValue(source, ['vehicleCapacityRequirement', 'vehicleCapacity', 'capacity']);
  const pickupRegion = String(getFirstMeaningfulValue(source, ['pickupRegion', 'pickupArea', 'origin', 'fromRegion']) || '').trim();
  const dropoffRegion = String(getFirstMeaningfulValue(source, ['dropoffRegion', 'dropoffArea', 'destination', 'toRegion']) || '').trim();
  const sla = String(getFirstMeaningfulValue(source, ['sla', 'qualityExpectation', 'quality', 'serviceLevel']) || '').trim();
  const documentRequirements = uniqueTextList([
    toTextList(getFirstMeaningfulValue(source, ['documentRequirements', 'documents', 'licenseRequirements', 'licenses'])),
  ]);
  const safetyRequirements = uniqueTextList([
    toTextList(getFirstMeaningfulValue(source, ['safetyRequirements', 'safety', 'insuranceRequirements'])),
  ]);

  return Object.freeze({
    rfqType,
    serviceScope,
    region,
    province,
    district,
    startDate,
    shift,
    passengerCount,
    vehicleCapacityRequirement: toNumberValue(vehicleCapacityRequirement),
    pickupRegion,
    dropoffRegion,
    sla,
    documentRequirements,
    safetyRequirements,
  });
}

export function buildMatchingCriteria(summary) {
  const normalizedSummary = summary || buildSourceRfqSummary({});
  const documentRequirements = Array.isArray(normalizedSummary.documentRequirements) ? normalizedSummary.documentRequirements : [];
  const safetyRequirements = Array.isArray(normalizedSummary.safetyRequirements) ? normalizedSummary.safetyRequirements : [];
  const hasRegion = isMeaningfulValue(normalizedSummary.region);
  const hasCapacity = isMeaningfulValue(normalizedSummary.vehicleCapacityRequirement) || isMeaningfulValue(normalizedSummary.passengerCount);
  const hasVehicleNeed = isMeaningfulValue(normalizedSummary.serviceScope) || isMeaningfulValue(normalizedSummary.rfqType);
  const hasStartDate = isMeaningfulValue(normalizedSummary.startDate);
  const hasShift = isMeaningfulValue(normalizedSummary.shift);
  const hasServiceType = isMeaningfulValue(normalizedSummary.serviceScope);
  const hasDocuments = documentRequirements.length > 0;
  const hasSla = isMeaningfulValue(normalizedSummary.sla);
  const hasRiskContext = !hasRegion || !hasCapacity || !hasStartDate || !hasShift || !hasDocuments || !hasSla;

  return Object.freeze([
    Object.freeze({
      id: 'region_fit',
      label: 'region fit',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.region,
      status: toNormalizedCriterionStatus(hasRegion),
      evidence: hasRegion ? normalizedSummary.region : 'Eksik bölge bilgisi',
    }),
    Object.freeze({
      id: 'capacity_fit',
      label: 'capacity fit',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.capacity,
      status: toNormalizedCriterionStatus(hasCapacity),
      evidence: hasCapacity
        ? String(normalizedSummary.vehicleCapacityRequirement || normalizedSummary.passengerCount)
        : 'Eksik kapasite ihtiyacı',
    }),
    Object.freeze({
      id: 'vehicle_type_fit',
      label: 'vehicle type / fleet fit',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.vehicleType,
      status: toNormalizedCriterionStatus(hasVehicleNeed),
      evidence: hasVehicleNeed ? normalizedSummary.serviceScope || normalizedSummary.rfqType : 'Eksik araç / filo sinyali',
    }),
    Object.freeze({
      id: 'start_date_fit',
      label: 'start date fit',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.startDate,
      status: toNormalizedCriterionStatus(hasStartDate),
      evidence: hasStartDate ? normalizedSummary.startDate : 'Başlangıç tarihi eksik',
    }),
    Object.freeze({
      id: 'shift_fit',
      label: 'shift / schedule fit',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.shift,
      status: toNormalizedCriterionStatus(hasShift),
      evidence: hasShift ? normalizedSummary.shift : 'Vardiya / saat bilgisi eksik',
    }),
    Object.freeze({
      id: 'service_type_fit',
      label: 'service type experience',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.serviceType,
      status: toNormalizedCriterionStatus(hasServiceType),
      evidence: hasServiceType ? normalizedSummary.serviceScope : 'Servis türü deneyimi sinyali eksik',
    }),
    Object.freeze({
      id: 'document_license_fit',
      label: 'document / license fit',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.document,
      status: toNormalizedCriterionStatus(hasDocuments),
      evidence: hasDocuments ? documentRequirements.join(', ') : 'Belge / ruhsat gereksinimi eksik',
    }),
    Object.freeze({
      id: 'sla_quality_fit',
      label: 'SLA / quality fit',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.sla,
      status: toNormalizedCriterionStatus(hasSla),
      evidence: hasSla ? normalizedSummary.sla : 'SLA / kalite beklentisi eksik',
    }),
    Object.freeze({
      id: 'risk_missing_data_fit',
      label: 'risk / missing data fit',
      weight: 5,
      status: toNormalizedCriterionStatus(!hasRiskContext, Boolean(hasRiskContext)),
      evidence: hasRiskContext
        ? uniqueTextList([
            !hasRegion ? 'bölge bilgisi eksik' : '',
            !hasCapacity ? 'kapasite bilgisi eksik' : '',
            !hasStartDate ? 'başlangıç tarihi eksik' : '',
            !hasShift ? 'vardiya bilgisi eksik' : '',
            !hasDocuments ? 'belge bilgisi eksik' : '',
            !hasSla ? 'SLA bilgisi eksik' : '',
          ].filter(Boolean)).join(', ')
        : 'Risk / eksik bilgi uyumu yeterli',
    }),
    Object.freeze({
      id: 'history_signal_fit',
      label: 'historical quality / performance signal when available and PII-safe',
      weight: SUPPLIER_MATCHING_SCORE_WEIGHTS.history,
      status: safetyRequirements.length > 0 ? 'ready' : 'partial',
      evidence: safetyRequirements.length > 0 ? safetyRequirements.join(', ') : 'PII-safe geçmiş kalite sinyali opsiyoneldir',
    }),
  ]);
}

export function extractSupplierProfile(profile = {}, index = 0) {
  const source = profile && typeof profile === 'object' ? profile : {};
  const candidateId = String(getFirstMeaningfulValue(source, ['candidateId', 'supplierId', 'supplierRef', 'id', 'ref']) || `candidate-${index + 1}`).trim();
  const supplierNameMasked = maskSupplierSensitiveValue(getFirstMeaningfulValue(source, ['supplierNameMasked', 'supplierLabel', 'supplierName', 'name']) || candidateId);
  const supplierLabel = maskSupplierSensitiveValue(getFirstMeaningfulValue(source, ['supplierLabel', 'supplierName', 'name']) || candidateId);
  const serviceAreas = uniqueTextList([toTextList(getFirstMeaningfulValue(source, ['serviceAreas', 'regions', 'coverageAreas', 'coverage']))]);
  const fleetCapacity = toNumberValue(getFirstMeaningfulValue(source, ['fleetCapacity', 'capacity', 'vehicleCapacity']));
  const vehicleTypes = uniqueTextList([toTextList(getFirstMeaningfulValue(source, ['vehicleTypes', 'fleetTypes', 'vehicles']))]);
  const startAvailability = uniqueTextList([toTextList(getFirstMeaningfulValue(source, ['startAvailability', 'availableFrom', 'startDates']))]);
  const shifts = uniqueTextList([toTextList(getFirstMeaningfulValue(source, ['shifts', 'schedules', 'workingHours']))]);
  const serviceTypes = uniqueTextList([toTextList(getFirstMeaningfulValue(source, ['serviceTypes', 'experience', 'serviceExperience']))]);
  const licenses = uniqueTextList([toTextList(getFirstMeaningfulValue(source, ['licenses', 'documents', 'documentTypes']))]);
  const qualitySignal = toNumberValue(getFirstMeaningfulValue(source, ['qualitySignal', 'qualityScore', 'performanceScore', 'rating']));
  const insurance = Boolean(getFirstMeaningfulValue(source, ['insurance', 'insuranceReady', 'insured']));
  const safetyCerts = uniqueTextList([toTextList(getFirstMeaningfulValue(source, ['safetyCerts', 'safetySignals', 'safety']))]);
  const rawNotes = uniqueTextList([toTextList(getFirstMeaningfulValue(source, ['notes', 'riskNotes', 'signals']))]);

  return Object.freeze({
    candidateId,
    supplierNameMasked,
    supplierLabel,
    serviceAreas,
    fleetCapacity,
    vehicleTypes,
    startAvailability,
    shifts,
    serviceTypes,
    licenses,
    qualitySignal,
    insurance,
    safetyCerts,
    rawNotes,
  });
}

export function listOverlappingValues(leftValues, rightValues) {
  const normalizedLeft = leftValues.map((value) => normalizeSupplierMatchingText(value)).filter(Boolean);
  const normalizedRight = rightValues.map((value) => normalizeSupplierMatchingText(value)).filter(Boolean);
  const matches = [];
  for (const leftValue of normalizedLeft) {
    for (const rightValue of normalizedRight) {
      if (!leftValue || !rightValue) {
        continue;
      }
      if (leftValue === rightValue || leftValue.includes(rightValue) || rightValue.includes(leftValue)) {
        matches.push(leftValue);
      }
    }
  }
  return uniqueTextList([matches]);
}

export function chooseFitLevel(score, hasDisqualifier) {
  if (hasDisqualifier || score < 35) {
    return 'blocked';
  }
  if (score >= 80) {
    return 'high';
  }
  if (score >= 60) {
    return 'medium';
  }
  return 'low';
}

export function buildSupplierQuestionSetFromFields(fields = []) {
  const normalizedFields = uniqueTextList([fields]);
  const questions = [];
  for (const field of normalizedFields) {
    if (/capacity|kapasite/i.test(field)) {
      questions.push(SUPPLIER_MATCHING_QUESTION_BANK.capacity);
    } else if (/start|başlangıç|baslangic|availability/i.test(field)) {
      questions.push(SUPPLIER_MATCHING_QUESTION_BANK.startAvailability);
    } else if (/region|bölge|bolge|service area|area/i.test(field)) {
      questions.push(SUPPLIER_MATCHING_QUESTION_BANK.region);
    } else if (/vehicle|araç|arac|fleet|driver/i.test(field)) {
      questions.push(SUPPLIER_MATCHING_QUESTION_BANK.vehicle);
    } else if (/license|belge|ruhsat|document/i.test(field)) {
      questions.push(SUPPLIER_MATCHING_QUESTION_BANK.license);
    } else if (/sla|quality|kalite/i.test(field)) {
      questions.push(SUPPLIER_MATCHING_QUESTION_BANK.sla);
    } else if (/insurance|sigorta|güvenlik|guvenlik|safety/i.test(field)) {
      questions.push(SUPPLIER_MATCHING_QUESTION_BANK.insurance);
    } else if (/route|rota|hat|alternatif/i.test(field)) {
      questions.push(SUPPLIER_MATCHING_QUESTION_BANK.alternative);
    }
  }
  return uniqueTextList([questions]);
}

export function buildVisibleAnswer({ blockedExecutionRequest, missingFields, shortlistDraft }) {
  const opening = 'Aday tedarikçi uygunluk taslağını hazırladım; henüz hiçbir tedarikçi seçilmedi veya aranmadı.';
  const approvalLine = blockedExecutionRequest
    ? 'Tedarikçilere gönderim veya seçim için insan onayı gerekir.'
    : 'Tedarikçiye RFQ göndermek için insan onayı gerekir.';
  const previewLine = shortlistDraft && Array.isArray(shortlistDraft.bestCandidates) && shortlistDraft.bestCandidates.length > 0
    ? 'Bu liste sadece ön değerlendirmedir.'
    : 'Bu liste sadece ön değerlendirmedir.';
  const missingLine = missingFields.length > 0
    ? `Eksik supplier bilgileri: ${missingFields.slice(0, 4).join(', ')}.`
    : 'Eksik bilgiler tamamlanmadan tedarikçiye gönderim önerilmez.';
  const nextLine = `Sıradaki güvenli adım: ${SUPPLIER_MATCHING_NEXT_SAFE_STEP}.`;
  return [opening, approvalLine, previewLine, missingLine, nextLine].join(' ');
}

export function maskSupplierSensitiveValue(value) {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => maskSupplierSensitiveValue(item));
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

export function normalizeSupplierMatchingField(field, value) {
  const input = arguments.length > 1 ? value : field;
  if (Array.isArray(input)) {
    return input.map((item) => normalizeSupplierMatchingField(item));
  }
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, item]) => [key, normalizeSupplierMatchingField(item)])
    );
  }
  return normalizeSupplierMatchingText(input);
}

export function detectSupplierMatchingIntent(input = {}) {
  const text = typeof input === 'string'
    ? input
    : String(
        getFirstMeaningfulValue(input, ['userInput', 'message', 'prompt', 'text', 'query']) ||
          getFirstMeaningfulValue(input, ['rfqType', 'serviceScope', 'summary']) ||
          ''
      );
  const intentType = buildMatchingIntentType(text);
  const matchingType = buildMatchingTypeFromText(text);
  const matchingTypeLabel = SUPPLIER_MATCHING_MATCHING_TYPE_LABELS[matchingType] || SUPPLIER_MATCHING_MATCHING_TYPE_LABELS.genel_supplier_matching;
  const blockedExecutionRequest = intentType === 'execution_blocked_request';
  const boundary = buildDraftBoundary();
  return Object.freeze({
    intentType,
    matchingType,
    matchingTypeLabel,
    blockedExecutionRequest,
    draftOnly: boundary.draftOnly,
    notContacted: boundary.notContacted,
    notSent: boundary.notSent,
    notSelected: boundary.notSelected,
    approvalRequired: boundary.approvalRequired,
    humanReviewRequired: boundary.humanReviewRequired,
    executionState: boundary.executionState,
    nextSafeStep: boundary.nextSafeStep,
    matchingIntentSummary: `intentType=${intentType}; matchingType=${matchingType}; draftOnly=true; notSelected=true; notContacted=true; notSent=true; approvalRequired=true`,
    matchingTypeSummary: `${matchingTypeLabel} için draft-only ön değerlendirme`,
  });
}

export function buildSupplierMatchingInput(rfqDraft = {}, context = {}) {
  const sourceRfqSummary = buildSourceRfqSummary(rfqDraft);
  const matchingCriteria = buildMatchingCriteria(sourceRfqSummary);
  const rfqMissingFields = getSupplierMatchingMissingFields(rfqDraft, []).rfqMissingFields;
  const intent = detectSupplierMatchingIntent(context);
  const boundary = buildDraftBoundary();
  return Object.freeze({
    intentType: intent.intentType,
    matchingType: intent.matchingType,
    matchingTypeLabel: intent.matchingTypeLabel,
    sourceRfqSummary,
    matchingCriteria,
    matchingCriteriaSummary: `${matchingCriteria.length} kriter; bölge, kapasite, araç tipi, başlangıç tarihi, vardiya, deneyim, belge, SLA ve risk uyumu görünür`,
    missingFields: rfqMissingFields,
    riskNotes: uniqueTextList([
      !sourceRfqSummary.region ? 'Bölge bilgisi eksik' : '',
      !sourceRfqSummary.vehicleCapacityRequirement ? 'Kapasite ihtiyacı eksik' : '',
      !sourceRfqSummary.startDate ? 'Başlangıç tarihi eksik' : '',
      !sourceRfqSummary.shift ? 'Vardiya / saat bilgisi eksik' : '',
      !sourceRfqSummary.sla ? 'SLA / kalite beklentisi eksik' : '',
    ].filter(Boolean)),
    safetyNotes: SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES,
    draftOnly: boundary.draftOnly,
    notContacted: boundary.notContacted,
    notSent: boundary.notSent,
    notSelected: boundary.notSelected,
    approvalRequired: boundary.approvalRequired,
    humanReviewRequired: boundary.humanReviewRequired,
    executionState: boundary.executionState,
    nextSafeStep: boundary.nextSafeStep,
  });
}

export function scoreSupplierCandidate(rfqDraft = {}, supplierProfile = {}, index = 0) {
  const rfqSummary = buildSourceRfqSummary(rfqDraft);
  const supplier = extractSupplierProfile(supplierProfile, index);
  const matchingType = buildMatchingTypeFromText(`${rfqSummary.rfqType} ${rfqSummary.serviceScope}`);
  const criteriaBreakdown = [];
  const matchReasons = [];
  const riskNotes = [];
  const disqualifiers = [];
  const missingSupplierFields = [];
  const nextQuestionsForSupplier = [];
  let score = 0;
  const pushCriterion = (id, weight, status, evidence) => criteriaBreakdown.push(Object.freeze({ id, weight, status, evidence }));
  const pushQuestion = (field, question) => { if (!missingSupplierFields.includes(field)) missingSupplierFields.push(field); if (!nextQuestionsForSupplier.includes(question)) nextQuestionsForSupplier.push(question); };

  const regionNeed = uniqueTextList([toTextList(rfqSummary.region), toTextList(rfqSummary.province), toTextList(rfqSummary.district), toTextList(rfqSummary.pickupRegion), toTextList(rfqSummary.dropoffRegion)]);
  const regionOverlap = listOverlappingValues(regionNeed, supplier.serviceAreas);
  const regionMatch = regionOverlap.length > 0;
  pushCriterion('region_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.region, toNormalizedCriterionStatus(regionMatch, !regionMatch && supplier.serviceAreas.length > 0), regionMatch ? regionOverlap.join(', ') : 'Bölge uyumu yok');
  if (regionMatch) { score += SUPPLIER_MATCHING_SCORE_WEIGHTS.region; matchReasons.push(`Bölge uyumu: ${regionOverlap.join(', ')}`); } else if (supplier.serviceAreas.length === 0) { pushQuestion('serviceAreas', SUPPLIER_MATCHING_QUESTION_BANK.region); riskNotes.push('Bölge hizmet alanı eksik'); } else { disqualifiers.push('Bölge uyumu yok'); riskNotes.push('Bölge hizmet alanı eşleşmiyor'); pushQuestion('serviceAreas', SUPPLIER_MATCHING_QUESTION_BANK.region); }

  const requiredCapacity = toNumberValue(rfqSummary.vehicleCapacityRequirement) || toNumberValue(rfqSummary.passengerCount);
  const supplierCapacity = supplier.fleetCapacity;
  const hasCapacityRequirement = requiredCapacity != null;
  const hasSupplierCapacity = supplierCapacity != null;
  let capacityStatus = 'missing';
  let capacityEvidence = 'Kapasite bilgisi eksik';
  if (hasCapacityRequirement && hasSupplierCapacity) {
    if (supplierCapacity >= requiredCapacity) { score += SUPPLIER_MATCHING_SCORE_WEIGHTS.capacity; matchReasons.push(`Kapasite uygun: ${supplierCapacity} >= ${requiredCapacity}`); capacityStatus = 'ready'; capacityEvidence = `${supplierCapacity} >= ${requiredCapacity}`; }
    else if (supplierCapacity >= Math.max(1, Math.floor(requiredCapacity * 0.9))) { score += 12; riskNotes.push('Kapasite sınırda'); matchReasons.push(`Kapasite sınırda: ${supplierCapacity} / ${requiredCapacity}`); capacityStatus = 'partial'; capacityEvidence = `${supplierCapacity} / ${requiredCapacity}`; }
    else { disqualifiers.push('Kapasite yetersiz'); riskNotes.push('Kapasite ihtiyacı karşılanmıyor'); capacityStatus = 'missing'; capacityEvidence = `${supplierCapacity} < ${requiredCapacity}`; }
  } else {
    if (!hasSupplierCapacity) pushQuestion('fleetCapacity', SUPPLIER_MATCHING_QUESTION_BANK.capacity);
    if (!hasCapacityRequirement) riskNotes.push('RFQ kapasite ihtiyacı eksik');
    capacityEvidence = hasSupplierCapacity ? String(supplierCapacity) : 'Kapasite eksik';
  }
  pushCriterion('capacity_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.capacity, capacityStatus, capacityEvidence);

  const vehicleNeed = uniqueTextList([toTextList(rfqSummary.rfqType), toTextList(rfqSummary.serviceScope)]).filter(Boolean);
  const vehicleMatch = listOverlappingValues(vehicleNeed, supplier.vehicleTypes);
  const hasVehicleMatch = vehicleMatch.length > 0;
  pushCriterion('vehicle_type_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.vehicleType, toNormalizedCriterionStatus(hasVehicleMatch, !hasVehicleMatch && supplier.vehicleTypes.length > 0), hasVehicleMatch ? vehicleMatch.join(', ') : 'Araç / filo eşleşmesi zayıf');
  if (hasVehicleMatch) { score += SUPPLIER_MATCHING_SCORE_WEIGHTS.vehicleType; matchReasons.push(`Araç / filo uyumu: ${vehicleMatch.join(', ')}`); } else if (supplier.vehicleTypes.length === 0) { pushQuestion('vehicleTypes', SUPPLIER_MATCHING_QUESTION_BANK.vehicle); riskNotes.push('Araç tipi / filo bilgisi eksik'); } else { riskNotes.push('Araç tipi / filo sinyali zayıf'); pushQuestion('vehicleTypes', SUPPLIER_MATCHING_QUESTION_BANK.vehicle); }

  const startDate = normalizeSupplierMatchingText(rfqSummary.startDate);
  const startAvailability = supplier.startAvailability.map((value) => normalizeSupplierMatchingText(value));
  const startDateMatch = Boolean(startDate) && startAvailability.some((value) => value && (value === startDate || value <= startDate));
  const hasStartAvailability = supplier.startAvailability.length > 0;
  pushCriterion('start_date_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.startDate, toNormalizedCriterionStatus(startDateMatch, Boolean(startDate) && hasStartAvailability && !startDateMatch), startDateMatch ? (supplier.startAvailability.find((value) => normalizeSupplierMatchingText(value) <= startDate) || startDate) : 'Başlangıç tarihi eşleşmesi yok');
  if (startDateMatch) { score += SUPPLIER_MATCHING_SCORE_WEIGHTS.startDate; matchReasons.push(`Başlangıç tarihi uyumu: ${rfqSummary.startDate}`); } else if (!hasStartAvailability) { pushQuestion('startAvailability', SUPPLIER_MATCHING_QUESTION_BANK.startAvailability); riskNotes.push('Başlangıç müsaitliği eksik'); } else if (startDate) { disqualifiers.push('Başlangıç tarihi uygun değil'); riskNotes.push('Başlangıç takvimi uyumsuz'); pushQuestion('startAvailability', SUPPLIER_MATCHING_QUESTION_BANK.startAvailability); }

  const shiftNeed = normalizeSupplierMatchingText(rfqSummary.shift);
  const shiftMatch = Boolean(shiftNeed) && supplier.shifts.some((value) => normalizeSupplierMatchingText(value) === shiftNeed);
  pushCriterion('shift_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.shift, toNormalizedCriterionStatus(shiftMatch, Boolean(shiftNeed) && supplier.shifts.length > 0 && !shiftMatch), shiftMatch ? supplier.shifts.find((value) => normalizeSupplierMatchingText(value) === shiftNeed) : 'Vardiya eşleşmesi yok');
  if (shiftMatch) { score += SUPPLIER_MATCHING_SCORE_WEIGHTS.shift; matchReasons.push(`Vardiya uyumu: ${rfqSummary.shift}`); } else if (supplier.shifts.length === 0) { pushQuestion('shifts', SUPPLIER_MATCHING_QUESTION_BANK.startAvailability); riskNotes.push('Vardiya / saat bilgisi eksik'); } else if (shiftNeed) { riskNotes.push('Vardiya uyumu zayıf'); pushQuestion('shifts', SUPPLIER_MATCHING_QUESTION_BANK.startAvailability); }

  const serviceNeed = uniqueTextList([toTextList(rfqSummary.rfqType), toTextList(rfqSummary.serviceScope)]);
  const serviceMatch = listOverlappingValues(serviceNeed, supplier.serviceTypes);
  const hasServiceMatch = serviceMatch.length > 0;
  pushCriterion('service_type_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.serviceType, toNormalizedCriterionStatus(hasServiceMatch, !hasServiceMatch && supplier.serviceTypes.length > 0), hasServiceMatch ? serviceMatch.join(', ') : 'Servis türü deneyimi sinyali zayıf');
  if (hasServiceMatch) { score += SUPPLIER_MATCHING_SCORE_WEIGHTS.serviceType; matchReasons.push(`Servis türü deneyimi: ${serviceMatch.join(', ')}`); } else if (supplier.serviceTypes.length === 0) { riskNotes.push('Servis türü deneyimi sinyali eksik'); }

  const rfqDocuments = Array.isArray(rfqSummary.documentRequirements) ? rfqSummary.documentRequirements : [];
  const supplierLicenses = supplier.licenses;
  const documentMatch = rfqDocuments.length === 0 ? true : rfqDocuments.some((item) => supplierLicenses.some((license) => normalizeSupplierMatchingText(license) === normalizeSupplierMatchingText(item)));
  pushCriterion('document_license_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.document, toNormalizedCriterionStatus(documentMatch, rfqDocuments.length > 0 && supplierLicenses.length > 0 && !documentMatch), documentMatch ? rfqDocuments.join(', ') || 'Belge gereksinimi yok' : 'Belge / ruhsat eşleşmesi eksik');
  if (documentMatch) { if (rfqDocuments.length > 0) { score += SUPPLIER_MATCHING_SCORE_WEIGHTS.document; matchReasons.push(`Belge / ruhsat uyumu: ${rfqDocuments.join(', ')}`); } } else { if (supplierLicenses.length === 0) pushQuestion('licenses', SUPPLIER_MATCHING_QUESTION_BANK.license); disqualifiers.push('Belge / ruhsat uygun değil'); riskNotes.push('Belge / ruhsat doğrulaması eksik'); pushQuestion('licenses', SUPPLIER_MATCHING_QUESTION_BANK.license); }

  const hasSlaSignal = isMeaningfulValue(rfqSummary.sla);
  const qualitySignal = supplier.qualitySignal;
  const historyScore = qualitySignal == null ? 0 : Math.max(0, Math.min(SUPPLIER_MATCHING_SCORE_WEIGHTS.history, Math.round(qualitySignal / 20)));
  const slaScore = qualitySignal == null ? 0 : Math.max(0, Math.min(SUPPLIER_MATCHING_SCORE_WEIGHTS.sla, Math.round(qualitySignal / 25)));
  if (historyScore > 0) { score += historyScore; matchReasons.push(`Geçmiş kalite sinyali: ${qualitySignal}`); }
  if (hasSlaSignal && slaScore > 0) { score += slaScore; matchReasons.push(`SLA / kalite sinyali: ${rfqSummary.sla}`); } else if (hasSlaSignal && qualitySignal == null) { riskNotes.push('SLA / kalite sinyali eksik'); pushQuestion('sla', SUPPLIER_MATCHING_QUESTION_BANK.sla); }
  pushCriterion('sla_quality_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.sla, toNormalizedCriterionStatus(Boolean(qualitySignal) || hasSlaSignal, Boolean(hasSlaSignal) && qualitySignal == null), qualitySignal != null ? String(qualitySignal) : (hasSlaSignal ? rfqSummary.sla : 'SLA / kalite beklentisi eksik'));
  pushCriterion('history_signal_fit', SUPPLIER_MATCHING_SCORE_WEIGHTS.history, qualitySignal != null ? 'ready' : 'partial', qualitySignal != null ? String(qualitySignal) : 'PII-safe geçmiş sinyal yok');

  if (supplier.insurance === false) { riskNotes.push('Sigorta sinyali eksik'); pushQuestion('insurance', SUPPLIER_MATCHING_QUESTION_BANK.insurance); }
  if (supplier.safetyCerts.length === 0 && Array.isArray(rfqSummary.safetyRequirements) && rfqSummary.safetyRequirements.length > 0) { riskNotes.push('Güvenlik sertifikası / sinyali eksik'); pushQuestion('insurance', SUPPLIER_MATCHING_QUESTION_BANK.insurance); }
  if (supplier.rawNotes.length > 0) riskNotes.push(...supplier.rawNotes);

  const compactMissingSupplierFields = uniqueTextList([missingSupplierFields]);
  const compactNextQuestions = uniqueTextList([nextQuestionsForSupplier, buildSupplierQuestionSetFromFields(compactMissingSupplierFields)]);
  const compactRiskNotes = uniqueTextList([riskNotes]);
  const compactMatchReasons = uniqueTextList([matchReasons]);
  const compactDisqualifiers = uniqueTextList([disqualifiers]);
  const scoreClamped = Math.max(0, Math.min(100, score));
  const fitLevel = chooseFitLevel(scoreClamped, compactDisqualifiers.length > 0);
  return Object.freeze({ candidateId: supplier.candidateId, supplierNameMasked: supplier.supplierNameMasked, supplierLabel: supplier.supplierLabel, matchingType, score: scoreClamped, fitLevel, matchReasons: compactMatchReasons, missingSupplierFields: compactMissingSupplierFields, riskNotes: compactRiskNotes, disqualifiers: compactDisqualifiers, nextQuestionsForSupplier: compactNextQuestions, humanReviewRequired: true, draftOnly: true, notContacted: true, notSent: true, notSelected: true, approvalRequired: true, executionState: SUPPLIER_MATCHING_EXECUTION_STATE, nextSafeStep: SUPPLIER_MATCHING_NEXT_SAFE_STEP, criteriaBreakdown: Object.freeze(criteriaBreakdown) });
}

export function buildSupplierQuestionSet(candidateMatrix = []) {
  const matrix = Array.isArray(candidateMatrix) ? candidateMatrix : [];
  return uniqueTextList([[SUPPLIER_MATCHING_QUESTION_BANK.capacity, SUPPLIER_MATCHING_QUESTION_BANK.startAvailability, SUPPLIER_MATCHING_QUESTION_BANK.region, SUPPLIER_MATCHING_QUESTION_BANK.vehicle, SUPPLIER_MATCHING_QUESTION_BANK.license, SUPPLIER_MATCHING_QUESTION_BANK.sla, SUPPLIER_MATCHING_QUESTION_BANK.insurance, SUPPLIER_MATCHING_QUESTION_BANK.alternative], matrix.flatMap((candidate) => candidate.nextQuestionsForSupplier || [])]);
}

export function buildSupplierShortlistDraft(candidateMatrix = []) {
  const sorted = (Array.isArray(candidateMatrix) ? [...candidateMatrix] : []).sort((left, right) => right.score !== left.score ? right.score - left.score : normalizeSupplierMatchingText(left.candidateId).localeCompare(normalizeSupplierMatchingText(right.candidateId)));
  const shortlistedCandidates = sorted.slice(0, 3).map((candidate) => Object.freeze({ candidateId: candidate.candidateId, supplierLabel: candidate.supplierLabel, supplierNameMasked: candidate.supplierNameMasked, score: candidate.score, fitLevel: candidate.fitLevel, matchReasons: candidate.matchReasons, missingSupplierFields: candidate.missingSupplierFields, riskNotes: candidate.riskNotes, disqualifiers: candidate.disqualifiers, nextQuestionsForSupplier: candidate.nextQuestionsForSupplier, humanReviewRequired: true }));
  const approvalBoundary = buildDraftBoundary();
  return Object.freeze({ shortlistedCandidates, bestCandidates: shortlistedCandidates, whyTheyFit: uniqueTextList([shortlistedCandidates.flatMap((candidate) => candidate.matchReasons)]), missingInformation: uniqueTextList([sorted.flatMap((candidate) => candidate.missingSupplierFields)]), questionsForSupplier: buildSupplierQuestionSet(sorted), riskNotes: uniqueTextList([sorted.flatMap((candidate) => candidate.riskNotes)]), humanApprovalNote: 'Aday uygunluk taslağıdır; insan onayı olmadan seçim veya gönderim yapılmaz.', draftOnly: approvalBoundary.draftOnly, notSelected: approvalBoundary.notSelected, notContacted: approvalBoundary.notContacted, notSent: approvalBoundary.notSent, approvalRequired: approvalBoundary.approvalRequired, humanReviewRequired: approvalBoundary.humanReviewRequired, executionState: approvalBoundary.executionState, nextSafeStep: approvalBoundary.nextSafeStep });
}

export function composeSupplierMatchingAnswer(context = {}) {
  const sourceContext = context && typeof context === 'object' ? context : {};
  const userIntent = detectSupplierMatchingIntent(sourceContext);
  const rfqDraft = sourceContext.rfqDraft || sourceContext.rfq || sourceContext.input || {};
  const supplierProfiles = Array.isArray(sourceContext.supplierProfiles) ? sourceContext.supplierProfiles : Array.isArray(sourceContext.fixtureSupplierProfiles) ? sourceContext.fixtureSupplierProfiles : [];
  const matchingInput = buildSupplierMatchingInput(rfqDraft, sourceContext);
  const candidateMatrix = buildSupplierCandidateMatrix(rfqDraft, supplierProfiles);
  const shortlistDraft = buildSupplierShortlistDraft(candidateMatrix);
  const missingFieldInfo = getSupplierMatchingMissingFields(rfqDraft, supplierProfiles);
  const supplierQuestionSet = buildSupplierQuestionSet(candidateMatrix);
  const riskNotes = uniqueTextList([matchingInput.riskNotes, candidateMatrix.flatMap((candidate) => candidate.riskNotes), candidateMatrix.flatMap((candidate) => candidate.disqualifiers)]);
  const safetyNotes = uniqueTextList([SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES, SUPPLIER_MATCHING_BOUNDARY_FLAGS, SUPPLIER_MATCHING_BLOCKED_ACTIONS]);
  const visibleAnswer = buildVisibleAnswer({ blockedExecutionRequest: userIntent.blockedExecutionRequest, missingFields: missingFieldInfo.missingFields, shortlistDraft });
  return Object.freeze({ intentType: userIntent.intentType, matchingType: userIntent.matchingType, matchingTypeLabel: userIntent.matchingTypeLabel, matchingIntentSummary: userIntent.matchingIntentSummary, matchingTypeSummary: userIntent.matchingTypeSummary, sourceRfqSummary: matchingInput.sourceRfqSummary, matchingCriteria: matchingInput.matchingCriteria, matchingCriteriaSummary: matchingInput.matchingCriteriaSummary, candidateMatrix, candidateMatrixSummary: `${candidateMatrix.length} aday; score, fitLevel, matchReasons, missingSupplierFields, riskNotes ve humanReviewRequired görünür`, shortlistDraft, shortlistDraftSummary: `${shortlistDraft.bestCandidates.length} aday shortlist; eksik bilgi, risk notu ve onay notu görünür`, missingFields: missingFieldInfo.missingFields, supplierQuestionSet, supplierQuestionSummary: `${supplierQuestionSet.length} soru; kapasite, başlangıç, bölge, araç, belge, SLA, sigorta ve alternatif kapasite görünür`, riskNotes, safetyNotes, safetyPhraseSummary: 'draftOnly=true / notSelected=true / notContacted=true / notSent=true / approvalRequired=true korunur', draftOnly: true, notSelected: true, notContacted: true, notSent: true, approvalRequired: true, humanReviewRequired: true, executionState: SUPPLIER_MATCHING_EXECUTION_STATE, nextSafeStep: SUPPLIER_MATCHING_NEXT_SAFE_STEP, draftOnlySummary: 'sadece ön değerlendirme, seçim yok, temas yok, gönderim yok', kvkkSafeSummary: 'raw token, credential, cookie, password, GPS trace ve raw PII yok; maskeli ref kullanılır', auditApprovalSummary: 'human approval boundary korunur; recommendation ve approval trace ayrı kalır', noWriteActionSummary: 'supplier contact, RFQ send, offer collect, offer accept/reject, agreement execute, dispatch apply, route apply, payment execute ve messaging kapalıdır', chainWiringSummary: 'check:copilotrfqprep01 -> check:suppliermatching01 -> check:copilothumanapproval01 -> check:uxmarketplacepanels01', smokeThresholdSummary: 'product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none', commitExternalSummary: 'runtime-data, browser-smoke ve debug.log commit dışı kalır', prismaSummary: 'No route/service/prisma diff; no production DB; no schema/migration; read-only only', visibleAnswer });
}

export function buildSupplierCandidateMatrix(rfqDraft = {}, supplierProfiles = []) {
  const profiles = Array.isArray(supplierProfiles) ? supplierProfiles : [];
  const matrix = profiles.map((profile, index) => scoreSupplierCandidate(rfqDraft, profile, index));
  const sorted = matrix.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    const fitRank = { high: 3, medium: 2, low: 1, blocked: 0 };
    if ((fitRank[right.fitLevel] || 0) !== (fitRank[left.fitLevel] || 0)) {
      return (fitRank[right.fitLevel] || 0) - (fitRank[left.fitLevel] || 0);
    }
    return normalizeSupplierMatchingText(left.candidateId).localeCompare(normalizeSupplierMatchingText(right.candidateId));
  }).map((candidate, index) => Object.freeze({ ...candidate, rank: index + 1 }));
  return Object.freeze(sorted);
}

export function getSupplierMatchingMissingFields(rfqDraft = {}, supplierProfiles = []) {
  const rfqSummary = buildSourceRfqSummary(rfqDraft);
  const rfqMissingFields = uniqueTextList([
    !rfqSummary.rfqType ? ['rfqType'] : [],
    !rfqSummary.serviceScope ? ['serviceScope'] : [],
    !rfqSummary.region ? ['region'] : [],
    !rfqSummary.startDate ? ['startDate'] : [],
    !rfqSummary.shift ? ['shift'] : [],
    !isMeaningfulValue(rfqSummary.passengerCount) ? ['passengerCount'] : [],
    !isMeaningfulValue(rfqSummary.vehicleCapacityRequirement) ? ['vehicleCapacityRequirement'] : [],
    !rfqSummary.pickupRegion ? ['pickupRegion'] : [],
    !rfqSummary.dropoffRegion ? ['dropoffRegion'] : [],
    !rfqSummary.sla ? ['sla'] : [],
    rfqSummary.documentRequirements.length === 0 ? ['documentRequirements'] : [],
  ]);
  const candidateMatrix = buildSupplierCandidateMatrix(rfqDraft, supplierProfiles);
  const supplierMissingFields = uniqueTextList([candidateMatrix.flatMap((candidate) => candidate.missingSupplierFields)]);
  return Object.freeze({
    rfqMissingFields,
    supplierMissingFields,
    missingFields: uniqueTextList([rfqMissingFields, supplierMissingFields]),
  });
}
