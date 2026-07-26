export const COPILOT_SHIFT_TO_AGREEMENT_PREP_VERSION = 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01';

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_STAGES = Object.freeze([
  Object.freeze({ id: 'shift_input_summary', title: 'Shift-to-Agreement Input Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'field_mapping_model', title: 'Agreement Field Mapping Model', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'readiness_scorecard', title: 'Agreement Readiness Scorecard', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'prep_packet_draft', title: 'Agreement Prep Packet Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'missing_field_summary', title: 'Missing Field Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'risk_summary', title: 'Risk Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'question_set', title: 'Question Set', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'safe_next_step', title: 'Safe Next-Step Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'safety_boundary', title: 'Safety / Boundary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'kvkk_safe_handling', title: 'PII / KVKK Safe Handling', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'turkish_visible_answer', title: 'Türkçe Visible Answer', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'audit_handoff', title: 'Audit / Human Approval Handoff', status: 'current baseline', futureOnly: false }),
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_CATEGORIES = Object.freeze([
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'DRAFT',
  'RISK_SUMMARY',
  'NEXT_STEP',
  'HUMAN_APPROVAL_REQUIRED',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_SUPPORTED_TYPES = Object.freeze([
  'agreement_prep_draft',
  'agreement_field_mapping_review',
  'agreement_readiness_scorecard',
  'missing_field_summary',
  'risk_summary',
  'question_set',
  'safe_next_step_draft',
  'approval_packet_request',
  'kvkk_safe_prep',
  'general_shift_to_agreement_prep',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_INPUT_SUMMARY = Object.freeze([
  'offer recommendation state',
  'negotiation assist state',
  'offer analysis state',
  'supplier ref / masked label',
  'agreement type',
  'agreement scope',
  'service scope',
  'region / province / district',
  'start date',
  'term / validity',
  'pricing summary',
  'billing summary',
  'SLA / service quality',
  'legal / compliance documents',
  'privacy / KVKK mask state',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_FIELD_MAPPING_MODEL = Object.freeze([
  'sourceRecommendationSummary -> agreementPrepSummary',
  'sourceNegotiationSummary -> agreementPrepContext',
  'sourceOfferAnalysisSummary -> agreementPrepSignals',
  'supplierRef -> supplierRef',
  'supplierLabelMasked -> supplierLabelMasked',
  'agreementType -> agreementType',
  'agreementScope -> agreementScope',
  'serviceScope -> serviceScope',
  'region -> region',
  'province -> province',
  'district -> district',
  'startDate -> effectiveDate',
  'validityPeriod -> termSummary',
  'pricingSummary -> pricingSummary',
  'billingSummary -> billingSummary',
  'slaSummary -> slaSummary',
  'legalTermsSummary -> legalTermsSummary',
  'complianceSummary -> complianceSummary',
  'privacySummary -> privacySummary',
  'missingFields -> missingFields',
  'riskSignals -> riskSignals',
  'humanApprovalRequired=true',
  'draftOnly=true',
  'notCreated=true',
  'notApproved=true',
  'notSigned=true',
  'notExecuted=true',
  'noWriteAction=true',
  'noAuditEventWrite=true',
  'piiMasked=true',
  'kvkkSafe=true',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_READINESS_SCORECARD_FIELDS = Object.freeze([
  'fieldCoverageScore',
  'legalReadinessScore',
  'privacyReadinessScore',
  'operationalReadinessScore',
  'pricingReadinessScore',
  'riskScore',
  'readinessScore',
  'scoreBand',
  'readinessLabel',
  'missingRequiredFields',
  'missingOptionalFields',
  'blockingReasons',
  'humanApprovalRequired',
  'nextSafeStep',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_PACKET_DRAFT_FIELDS = Object.freeze([
  'draftTitle',
  'openingNote',
  'agreementPrepSummary',
  'fieldMappingModel',
  'readinessScorecard',
  'missingFieldSummary',
  'riskSummary',
  'questionSet',
  'safeNextStepDraft',
  'humanApprovalNote',
  'piiKvkkNote',
  'executionBoundaryNote',
  'draftOnly=true',
  'noWriteAction=true',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_MISSING_FIELD_SUMMARY = Object.freeze([
  'missingRequiredFields',
  'missingOptionalFields',
  'missingLegalFields',
  'missingOperationalFields',
  'missingPrivacyFields',
  'missingPricingFields',
  'missingTimingFields',
  'missingApprovalFields',
  'cannotProceedYet',
  'nextDataToGather',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_RISK_SUMMARY = Object.freeze([
  'riskType',
  'riskDetail',
  'severity',
  'impact',
  'mitigation',
  'owner',
  'humanReviewRequired',
  'kvkkImpact',
  'executionBoundary',
  'safeFallback',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_QUESTION_SET = Object.freeze([
  'question',
  'whyNeeded',
  'blockingIfUnanswered',
  'whoCanAnswer',
  'safeFallback',
  'maskRequirement',
  'humanApprovalCue',
  'kvkkNote',
  'agreementScopeCue',
  'nextSafeStepCue',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_SAFE_NEXT_STEP_DRAFT = Object.freeze([
  'stepId',
  'title',
  'whatToDo',
  'whatNotToDo',
  'humanApprovalRequired',
  'draftOnly',
  'notCreated',
  'notExecuted',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS = Object.freeze([
  'draftOnly=true',
  'notCreated=true',
  'notApproved=true',
  'notSigned=true',
  'notExecuted=true',
  'notSelected=true',
  'notContacted=true',
  'notSent=true',
  'noWriteAction=true',
  'noDBWrite=true',
  'noAuditEventWrite=true',
  'noRouteServicePrismaMutation=true',
  'piiMasked=true',
  'kvkkSafe=true',
  'humanApprovalRequired=true',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_ACTIONS = Object.freeze([
  'agreement/contract create',
  'agreement/contract approve',
  'agreement/contract execute',
  'signature execute',
  'supplier selection',
  'supplier contact',
  'RFQ send',
  'offer accept/reject',
  'message/email/SMS/push',
  'provider credential use',
  'DB write',
  'audit event write',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_NEVER_AUTOMATE = Object.freeze([
  'otomatik sözleşme oluşturma',
  'otomatik sözleşme onayı',
  'otomatik sözleşme imzası',
  'otomatik tedarikçi seçimi',
  'otomatik tedarikçi iletişimi',
  'otomatik RFQ gönderimi',
  'otomatik teklif kabulü',
  'otomatik mesaj gönderimi',
  'otomatik DB write',
  'otomatik audit event yazma',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES = Object.freeze([
  'Sözleşme ön hazırlığını hazırladım; henüz hiçbir sözleşme oluşturulmadı, onaylanmadı veya yürütülmedi.',
  'Tedarikçi seçimi, contact ve RFQ send açılmadı.',
  'Bu çıktı karar değil, insan onayına gidecek taslaktır.',
  'Kişisel veriler maskelenerek işlendi.',
  'KVKK açısından yalnızca gerekli minimum veri kullanıldı.',
  'Sıradaki güvenli adım: sözleşme taslağını kontrol edip insan onayına sunmak.',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_PHRASES = Object.freeze([
  'Sözleşmeyi oluşturdum.',
  'Sözleşmeyi onayladım.',
  'Sözleşmeyi imzaladım.',
  'Bu tedarikçiyi seçtim.',
  'Bu tedarikçiye mesaj gönderdim.',
  'RFQ gönderdim.',
  'Teklifi kabul ettim.',
  'Teklifi reddettim.',
  'Ödeme başlattım.',
  'Hakediş başlattım.',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_SAFETY_EXAMPLES = Object.freeze([
  'Bu aday için sözleşme ön hazırlığını çıkar.',
  'Eksik sözleşme alanlarını listele.',
  'KVKK açısından maskelenmesi gereken alanları göster.',
  'Onay paketini hazırla.',
  'Hangi alanlar insan onayı istiyor?',
  'Bu taslakta hiçbir write-action açılmadığını doğrula.',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_HANOFFS = Object.freeze([
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-HUMAN-APPROVAL-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
  'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01',
  'AUDIT-LOG-AND-APPROVAL-TRACE-01',
  'SECURITY-KVKK-FINAL-01',
  'ROLE-DATA-ISOLATION-REDTEAM-01',
  'DATA-INTEGRITY-AND-RECOVERY-01',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Sözleşme ön hazırlığı execution değildir.',
  'Sefer Abi karar destekleyici ve hazırlayıcıdır.',
  'Nihai karar kullanıcıdadır.',
  'İnsan onayı olmadan agreement execute edilmez.',
  'Testle kanıtlanmamış kabiliyet public dokümanda vaat edilmez.',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_EXECUTION_STATE = 'shift_to_agreement_prep_draft_only / not_created / not_approved / not_signed / not_executed';
export const COPILOT_SHIFT_TO_AGREEMENT_PREP_NEXT_SAFE_STEP = 'sözleşme taslağını kontrol edip insan onayına sunmak';
export const COPILOT_SHIFT_TO_AGREEMENT_PREP_PII_KVKK_SAFE_HANDLING = Object.freeze([
  'minimum necessary data only',
  'masked contact details',
  'no raw secrets',
  'no cross-organization leakage',
]);

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_ROLE_NAMES = Object.freeze([
  'SUPER_ADMIN',
  'COMPANY',
  'ROOM',
  'DRIVER',
  'PERSONEL',
  'PARENT',
  'SCHOOL',
  'ORGANIZATION',
]);

function coerceText(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return coerceText(value.label || value.name || value.title || value.value || value.text || value.summary || '');
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function sanitizeList(value) {
  return (Array.isArray(value) ? value : value == null ? [] : [value])
    .map((item) => coerceText(item))
    .filter(Boolean);
}

export function normalizeShiftToAgreementField(field, value) {
  const input = arguments.length === 1 ? field : value;
  return coerceText(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ıİ]/g, 'i')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function maskShiftToAgreementSensitiveValue(value) {
  const text = coerceText(value);
  if (!text) return '';
  if (text.includes('@')) {
    const [local, domain = ''] = text.split('@');
    const visible = local.slice(0, 2) || 'x';
    return `${visible}***@${domain}`;
  }
  if (/\d{8,}/.test(text)) {
    return text.replace(/(\d{2})\d+(\d{2})/, '$1***$2');
  }
  if (text.length <= 3) {
    return `${text.slice(0, 1)}***`;
  }
  return `${text.slice(0, 2)}***${text.slice(-1)}`;
}

export function buildShiftToAgreementPrepInput(input = {}) {
  const supplierLabel = coerceText(input.supplierLabel || input.supplierName || input.supplierLabelMasked || '');
  const maskedSupplierLabel = input.supplierLabelMasked ? coerceText(input.supplierLabelMasked) : maskShiftToAgreementSensitiveValue(supplierLabel);
  const contactSummary = sanitizeList([
    input.contactName,
    input.contactEmail,
    input.contactPhone,
    input.contactAddress,
  ]).map((item) => maskShiftToAgreementSensitiveValue(item));

  return Object.freeze({
    sourceRecommendationSummary: coerceText(input.sourceRecommendationSummary || input.recommendationSummary || ''),
    sourceNegotiationSummary: coerceText(input.sourceNegotiationSummary || input.negotiationSummary || ''),
    sourceOfferAnalysisSummary: coerceText(input.sourceOfferAnalysisSummary || input.offerAnalysisSummary || ''),
    supplierRef: coerceText(input.supplierRef || input.supplierId || ''),
    supplierLabelMasked: maskedSupplierLabel,
    agreementType: coerceText(input.agreementType || 'service_agreement'),
    agreementScope: coerceText(input.agreementScope || input.scope || ''),
    serviceScope: coerceText(input.serviceScope || input.service || ''),
    region: coerceText(input.region || ''),
    province: coerceText(input.province || ''),
    district: coerceText(input.district || ''),
    startDate: coerceText(input.startDate || input.effectiveDate || ''),
    termSummary: coerceText(input.termSummary || input.validityPeriod || input.duration || ''),
    pricingSummary: coerceText(input.pricingSummary || input.priceSummary || ''),
    billingSummary: coerceText(input.billingSummary || input.invoiceSummary || ''),
    slaSummary: coerceText(input.slaSummary || input.serviceLevelSummary || ''),
    legalTermsSummary: coerceText(input.legalTermsSummary || input.legalSummary || ''),
    complianceSummary: coerceText(input.complianceSummary || input.complianceNotes || ''),
    privacySummary: coerceText(input.privacySummary || input.kvkkSummary || ''),
    contactSummary,
    missingFields: sanitizeList(input.missingFields),
    riskSignals: sanitizeList(input.riskSignals),
    questionSeed: sanitizeList(input.questionSeed),
    executionState: COPILOT_SHIFT_TO_AGREEMENT_PREP_EXECUTION_STATE,
    nextSafeStep: COPILOT_SHIFT_TO_AGREEMENT_PREP_NEXT_SAFE_STEP,
    piiKvkkSafeHandling: Object.freeze([...COPILOT_SHIFT_TO_AGREEMENT_PREP_PII_KVKK_SAFE_HANDLING]),
    humanApprovalRequired: true,
    draftOnly: true,
    piiMasked: true,
    kvkkSafe: true,
  });
}

function buildFieldMappingEntry(source, target, notes, privacy = 'masked', required = true) {
  return Object.freeze({
    source,
    target,
    notes,
    privacy,
    required,
  });
}

export function buildAgreementFieldMappingModel(input = {}) {
  const prepared = buildShiftToAgreementPrepInput(input);
  return Object.freeze([
    buildFieldMappingEntry('sourceRecommendationSummary', 'agreementPrepSummary', 'recommended agreement context'),
    buildFieldMappingEntry('sourceNegotiationSummary', 'agreementPrepContext', 'negotiation context'),
    buildFieldMappingEntry('sourceOfferAnalysisSummary', 'agreementPrepSignals', 'offer analysis context'),
    buildFieldMappingEntry('supplierRef', 'supplierRef', 'stable reference', 'masked', true),
    buildFieldMappingEntry('supplierLabelMasked', 'supplierLabelMasked', 'masked supplier label', 'masked', true),
    buildFieldMappingEntry('agreementType', 'agreementType', 'agreement type'),
    buildFieldMappingEntry('agreementScope', 'agreementScope', 'agreement scope'),
    buildFieldMappingEntry('serviceScope', 'serviceScope', 'service scope'),
    buildFieldMappingEntry('region / province / district', 'locationSummary', 'coverage geography'),
    buildFieldMappingEntry('startDate', 'effectiveDate', 'effective date'),
    buildFieldMappingEntry('termSummary', 'termSummary', 'term / validity'),
    buildFieldMappingEntry('pricingSummary', 'pricingSummary', 'commercial terms'),
    buildFieldMappingEntry('billingSummary', 'billingSummary', 'billing / invoicing'),
    buildFieldMappingEntry('slaSummary', 'slaSummary', 'service level'),
    buildFieldMappingEntry('legalTermsSummary', 'legalTermsSummary', 'legal terms'),
    buildFieldMappingEntry('complianceSummary', 'complianceSummary', 'compliance'),
    buildFieldMappingEntry('privacySummary', 'privacySummary', 'privacy / KVKK'),
    buildFieldMappingEntry('contactSummary', 'maskedContactSummary', 'masked contact signals'),
    buildFieldMappingEntry('missingFields', 'missingFields', 'missing field list'),
    buildFieldMappingEntry('riskSignals', 'riskSignals', 'risk list'),
    buildFieldMappingEntry('humanApprovalRequired', 'humanApprovalRequired', 'approval gate', 'control', true),
    buildFieldMappingEntry('draftOnly', 'draftOnly', 'read-only prep', 'control', true),
    buildFieldMappingEntry('notCreated', 'notCreated', 'no contract creation', 'control', true),
    buildFieldMappingEntry('notApproved', 'notApproved', 'no contract approval', 'control', true),
    buildFieldMappingEntry('notSigned', 'notSigned', 'no signature action', 'control', true),
    buildFieldMappingEntry('notExecuted', 'notExecuted', 'no execution', 'control', true),
    buildFieldMappingEntry('noWriteAction', 'noWriteAction', 'no write-action', 'control', true),
    buildFieldMappingEntry('noAuditEventWrite', 'noAuditEventWrite', 'no audit write', 'control', true),
    buildFieldMappingEntry('piiMasked', 'piiMasked', 'PII masked', 'control', true),
    buildFieldMappingEntry('kvkkSafe', 'kvkkSafe', 'KVKK-safe handling', 'control', true),
  ].map((entry) => Object.freeze({
    ...entry,
    sourceSnapshot: prepared[entry.source] ? coerceText(prepared[entry.source]) : '',
  })));
}

function classifyAgreementMissingField(field) {
  const needle = normalizeShiftToAgreementField(field);
  if (!needle) return 'operational';
  if (/(legal|contract|signature|approval|approval gate|sign|signing)/.test(needle)) return 'legal';
  if (/(privacy|kvkk|pii|consent|data|minimization|mask)/.test(needle)) return 'privacy';
  if (/(price|pricing|billing|invoice|payment|fee|commercial|commercial terms)/.test(needle)) return 'pricing';
  if (/(date|time|term|validity|start|deadline|window|duration)/.test(needle)) return 'timing';
  if (/(contact|phone|email|address|person|name)/.test(needle)) return 'contact';
  if (/(scope|service|operation|route|shift|capacity|sla|quality)/.test(needle)) return 'operational';
  return 'operational';
}

export function buildAgreementMissingFieldSummary(input = {}) {
  const missingFields = sanitizeList(input.missingFields);
  const buckets = {
    legal: [],
    privacy: [],
    pricing: [],
    timing: [],
    contact: [],
    operational: [],
  };

  for (const field of missingFields) {
    buckets[classifyAgreementMissingField(field)].push(field);
  }

  return Object.freeze({
    missingRequiredFields: Object.freeze(missingFields.slice()),
    missingOptionalFields: Object.freeze(sanitizeList(input.missingOptionalFields)),
    missingLegalFields: Object.freeze(buckets.legal),
    missingOperationalFields: Object.freeze(buckets.operational),
    missingPrivacyFields: Object.freeze(buckets.privacy),
    missingPricingFields: Object.freeze(buckets.pricing),
    missingTimingFields: Object.freeze(buckets.timing),
    missingApprovalFields: Object.freeze(sanitizeList(input.missingApprovalFields)),
    cannotProceedYet: missingFields.length > 0,
    nextDataToGather: Object.freeze([
      ...buckets.legal,
      ...buckets.privacy,
      ...buckets.pricing,
      ...buckets.timing,
      ...buckets.contact,
      ...buckets.operational,
    ]),
  });
}

function classifyAgreementRiskSignal(signal) {
  const needle = normalizeShiftToAgreementField(signal);
  if (!needle) return { type: 'general', severity: 'low' };
  if (/(privacy|kvkk|pii|consent|mask|contact|phone|email|address)/.test(needle)) {
    return { type: 'privacy', severity: 'high' };
  }
  if (/(legal|contract|signature|approval|sign|approve)/.test(needle)) {
    return { type: 'legal', severity: 'high' };
  }
  if (/(price|pricing|billing|invoice|payment|fee)/.test(needle)) {
    return { type: 'commercial', severity: 'medium' };
  }
  if (/(date|time|term|validity|start|deadline|duration)/.test(needle)) {
    return { type: 'timing', severity: 'medium' };
  }
  if (/(scope|service|route|shift|capacity|sla|quality)/.test(needle)) {
    return { type: 'operational', severity: 'medium' };
  }
  return { type: 'general', severity: 'low' };
}

export function buildAgreementRiskSummary(input = {}) {
  const riskSignals = sanitizeList([
    ...sanitizeList(input.riskSignals),
    ...sanitizeList(input.missingFields).map((field) => `missing ${field}`),
  ]);

  const rows = riskSignals.map((signal) => {
    const risk = classifyAgreementRiskSignal(signal);
    return Object.freeze({
      riskType: risk.type,
      riskDetail: signal,
      severity: risk.severity,
      impact: risk.type === 'privacy' ? 'KVKK exposure if raw data is exposed' : risk.type === 'legal' ? 'agreement cannot be treated as ready' : 'needs human review',
      mitigation: risk.type === 'privacy' ? 'mask raw PII and keep minimum data' : 'collect missing data and review with human approval',
      owner: risk.type === 'legal' ? 'legal / approval owner' : 'preparation owner',
      humanReviewRequired: true,
      kvkkImpact: risk.type === 'privacy',
      executionBoundary: 'draft-only / no create / no approve / no sign / no execute',
      safeFallback: 'keep the prep packet read-only and hand off for human approval',
    });
  });

  return Object.freeze({
    rows: Object.freeze(rows),
    highestSeverity: rows.some((row) => row.severity === 'high') ? 'high' : rows.some((row) => row.severity === 'medium') ? 'medium' : 'low',
    humanReviewRequired: true,
    kvkkImpact: rows.some((row) => row.kvkkImpact),
    executionBoundary: 'draft-only / no write-action / no execution',
    safeFallback: 'prepare a human-approval packet only',
  });
}

function buildQuestionForMissingField(field) {
  const needle = normalizeShiftToAgreementField(field);
  if (/(legal|contract|signature|approval|sign)/.test(needle)) {
    return 'Bu sözleşme için imza ve onay yetkisi kimde?';
  }
  if (/(privacy|kvkk|pii|consent|mask)/.test(needle)) {
    return 'Hangi kişisel veriler maskelenmeli ve neden?';
  }
  if (/(price|pricing|billing|invoice|payment|fee)/.test(needle)) {
    return 'Fiyat ve faturalama modeli nedir?';
  }
  if (/(date|time|term|validity|start|deadline|duration)/.test(needle)) {
    return 'Sözleşme başlangıç tarihi ve süresi nedir?';
  }
  if (/(contact|phone|email|address|person|name)/.test(needle)) {
    return 'İletişim bilgileri yerine masked label yeterli mi?';
  }
  if (/(scope|service|route|shift|capacity|sla|quality)/.test(needle)) {
    return 'Hizmet kapsamı ve SLA beklentisi tam olarak nedir?';
  }
  return 'Bu alanın insan onayıyla tamamlanması gerekiyor mu?';
}

export function buildAgreementQuestionSet(input = {}) {
  const questions = sanitizeList([
    ...sanitizeList(input.questionSeed),
    ...sanitizeList(input.missingFields).map((field) => buildQuestionForMissingField(field)),
  ]);

  const uniqueQuestions = [];
  for (const question of questions) {
    if (!uniqueQuestions.includes(question)) uniqueQuestions.push(question);
  }

  return Object.freeze(uniqueQuestions.map((question) => Object.freeze({
    question,
    whyNeeded: 'agreement prep packet should only move forward when the field is clear',
    blockingIfUnanswered: true,
    whoCanAnswer: 'human owner / legal / operations',
    safeFallback: 'keep the field in the missing summary',
    maskRequirement: true,
    humanApprovalCue: true,
    kvkkNote: 'use masked data only',
    agreementScopeCue: true,
    nextSafeStepCue: 'human approval packet only',
  })));
}

export function buildAgreementReadinessScorecard(input = {}) {
  const missingSummary = buildAgreementMissingFieldSummary(input);
  const riskSummary = buildAgreementRiskSummary(input);
  const fieldCoverageScore = Math.max(0, 100 - (missingSummary.missingRequiredFields.length * 15) - (missingSummary.missingOptionalFields.length * 4));
  const privacyReadinessScore = missingSummary.missingPrivacyFields.length > 0 ? 55 : 100;
  const legalReadinessScore = missingSummary.missingLegalFields.length > 0 ? 40 : 100;
  const operationalReadinessScore = missingSummary.missingOperationalFields.length > 0 ? 65 : 100;
  const pricingReadinessScore = missingSummary.missingPricingFields.length > 0 ? 70 : 100;
  const riskScore = Math.max(0, 100 - (riskSummary.rows.filter((row) => row.severity === 'high').length * 20) - (riskSummary.rows.filter((row) => row.severity === 'medium').length * 8));
  const readinessScore = Math.round((fieldCoverageScore + privacyReadinessScore + legalReadinessScore + operationalReadinessScore + pricingReadinessScore + riskScore) / 6);
  const scoreBand = readinessScore >= 85 ? 'ready_for_human_review' : readinessScore >= 65 ? 'needs_review' : 'blocked';

  const rows = Object.freeze([
    Object.freeze({ dimension: 'field coverage', score: fieldCoverageScore, status: fieldCoverageScore >= 85 ? 'ready' : 'review', note: 'core agreement fields' }),
    Object.freeze({ dimension: 'privacy / KVKK', score: privacyReadinessScore, status: privacyReadinessScore >= 85 ? 'ready' : 'review', note: 'masking and minimum data' }),
    Object.freeze({ dimension: 'legal readiness', score: legalReadinessScore, status: legalReadinessScore >= 85 ? 'ready' : 'review', note: 'contract / signature / approval' }),
    Object.freeze({ dimension: 'operational readiness', score: operationalReadinessScore, status: operationalReadinessScore >= 85 ? 'ready' : 'review', note: 'scope / service / timing' }),
    Object.freeze({ dimension: 'pricing readiness', score: pricingReadinessScore, status: pricingReadinessScore >= 85 ? 'ready' : 'review', note: 'commercial terms / billing' }),
    Object.freeze({ dimension: 'risk balance', score: riskScore, status: riskScore >= 85 ? 'ready' : 'review', note: 'risk density and mitigations' }),
  ]);

  return Object.freeze({
    readinessScore,
    scoreBand,
    readinessLabel: scoreBand === 'ready_for_human_review' ? 'hazir' : scoreBand === 'needs_review' ? 'inceleme gerekli' : 'blocked',
    fieldCoverageScore,
    legalReadinessScore,
    privacyReadinessScore,
    operationalReadinessScore,
    pricingReadinessScore,
    riskScore,
    rows,
    missingRequiredFields: missingSummary.missingRequiredFields,
    missingOptionalFields: missingSummary.missingOptionalFields,
    blockingReasons: Object.freeze([
      ...missingSummary.missingRequiredFields.map((field) => `missing: ${field}`),
      ...riskSummary.rows.filter((row) => row.severity === 'high').map((row) => `risk: ${row.riskDetail}`),
    ]),
    humanApprovalRequired: true,
    nextSafeStep: COPILOT_SHIFT_TO_AGREEMENT_PREP_NEXT_SAFE_STEP,
  });
}

export function buildAgreementPrepPacketDraft(input = {}) {
  const prepared = buildShiftToAgreementPrepInput(input);
  const scorecard = buildAgreementReadinessScorecard(prepared);
  const missingSummary = buildAgreementMissingFieldSummary(prepared);
  const riskSummary = buildAgreementRiskSummary(prepared);
  const questionSet = buildAgreementQuestionSet(prepared);

  return Object.freeze({
    draftTitle: 'Agreement Prep Packet Draft',
    openingNote: 'This packet is read-only and ready for human approval review.',
    agreementPrepSummary: prepared.sourceRecommendationSummary || prepared.sourceNegotiationSummary || prepared.sourceOfferAnalysisSummary || 'agreement prep summary unavailable',
    fieldMappingModel: buildAgreementFieldMappingModel(prepared),
    readinessScorecard: scorecard,
    missingFieldSummary: missingSummary,
    riskSummary,
    questionSet,
    safeNextStepDraft: buildSafeNextStepDraft(prepared),
    humanApprovalNote: 'Human approval is required before any agreement/contract execution.',
    piiKvkkNote: prepared.piiMasked ? 'PII is masked and only minimum data is shown.' : 'PII masking should be applied before sharing.',
    executionBoundaryNote: 'No create / approve / sign / execute / write-action is opened.',
    boundaryFlags: COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS,
  });
}

export function buildSafeNextStepDraft(input = {}) {
  const prepared = buildShiftToAgreementPrepInput(input);
  const missingSummary = buildAgreementMissingFieldSummary(prepared);
  const needsMoreData = missingSummary.cannotProceedYet;

  return Object.freeze({
    stepId: 'safe_next_step',
    title: needsMoreData ? 'Eksik alanları tamamla ve onay paketini hazırla' : 'Sözleşme taslağını gözden geçirip insan onayına sun',
    whatToDo: Object.freeze([
      'agreement prep packet draft topla',
      'field mapping modeli kontrol et',
      'PII / KVKK mask state doğrula',
      'human approval packet hazırla',
    ]),
    whatNotToDo: Object.freeze([
      'agreement create',
      'agreement approve',
      'agreement sign',
      'agreement execute',
      'supplier contact',
      'RFQ send',
      'write-action',
    ]),
    humanApprovalRequired: true,
    draftOnly: true,
    notCreated: true,
    notExecuted: true,
    nextSafeStep: COPILOT_SHIFT_TO_AGREEMENT_PREP_NEXT_SAFE_STEP,
  });
}

export function buildShiftToAgreementPrepPack(input = {}) {
  const prepared = buildShiftToAgreementPrepInput(input);
  return Object.freeze({
    version: COPILOT_SHIFT_TO_AGREEMENT_PREP_VERSION,
    inputSummary: COPILOT_SHIFT_TO_AGREEMENT_PREP_INPUT_SUMMARY,
    fieldMappingModel: buildAgreementFieldMappingModel(prepared),
    readinessScorecard: buildAgreementReadinessScorecard(prepared),
    packetDraft: buildAgreementPrepPacketDraft(prepared),
    missingFieldSummary: buildAgreementMissingFieldSummary(prepared),
    riskSummary: buildAgreementRiskSummary(prepared),
    questionSet: buildAgreementQuestionSet(prepared),
    safeNextStepDraft: buildSafeNextStepDraft(prepared),
    boundaryFlags: COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS,
    turkishVisiblePhrases: COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES,
    piiKvkkNote: 'PII is masked and KVKK-safe minimum data is used.',
  });
}

function joinBulletList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function joinObjectList(items, mapper) {
  return items.map((item) => `- ${mapper(item)}`).join('\n');
}

export function composeShiftToAgreementPrepAnswer(input = {}) {
  const pack = buildShiftToAgreementPrepPack(input);
  const scorecard = pack.readinessScorecard;
  const missing = pack.missingFieldSummary;
  const risk = pack.riskSummary;
  const questionSet = pack.questionSet;
  const safeNextStep = pack.safeNextStepDraft;

  return [
    `# ${COPILOT_SHIFT_TO_AGREEMENT_PREP_VERSION}`,
    '',
    '## Agreement prep input summary',
    joinBulletList(pack.inputSummary),
    '',
    '## Agreement field mapping model',
    joinObjectList(pack.fieldMappingModel, (row) => `${row.source} -> ${row.target} (${row.privacy}; ${row.notes})`),
    '',
    '## Agreement readiness scorecard',
    joinObjectList(scorecard.rows, (row) => `${row.dimension}: ${row.score} (${row.status})`),
    `- overall: ${scorecard.readinessScore} (${scorecard.scoreBand})`,
    '',
    '## Agreement prep packet draft',
    joinBulletList([
      pack.packetDraft.draftTitle,
      pack.packetDraft.openingNote,
      pack.packetDraft.humanApprovalNote,
      pack.packetDraft.piiKvkkNote,
      pack.packetDraft.executionBoundaryNote,
    ]),
    '',
    '## Missing field summary',
    joinBulletList([
      `required: ${missing.missingRequiredFields.join(', ') || 'none'}`,
      `optional: ${missing.missingOptionalFields.join(', ') || 'none'}`,
      `legal: ${missing.missingLegalFields.join(', ') || 'none'}`,
      `privacy: ${missing.missingPrivacyFields.join(', ') || 'none'}`,
      `pricing: ${missing.missingPricingFields.join(', ') || 'none'}`,
      `timing: ${missing.missingTimingFields.join(', ') || 'none'}`,
      `approval: ${missing.missingApprovalFields.join(', ') || 'none'}`,
    ]),
    '',
    '## Risk summary',
    joinObjectList(risk.rows, (row) => `${row.riskType}: ${row.riskDetail} (${row.severity})`),
    '',
    '## Question set',
    joinObjectList(questionSet, (row) => row.question),
    '',
    '## Safe next-step draft',
    joinBulletList([
      safeNextStep.title,
      ...safeNextStep.whatToDo,
      ...safeNextStep.whatNotToDo.map((item) => `do not: ${item}`),
    ]),
    '',
    '## Safety / boundary',
    joinBulletList(COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS),
    '',
    '## PII / KVKK safe handling',
    joinBulletList([
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_PII_KVKK_SAFE_HANDLING,
      'raw contact details are masked',
      'cross-organization data stays separated',
      'no secret / token exposure',
    ]),
    '',
    '## Türkçe visible answer',
    joinBulletList(COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES),
  ].join('\n');
}

export function detectShiftToAgreementPrepIntent(text) {
  const haystack = normalizeShiftToAgreementField(text);
  if (!haystack) return 'general_shift_to_agreement_prep';
  if (/(agreement|contract|sözleşme|sozlesme|taslak|draft|onay paketi|field mapping|kvkk|privacy)/.test(haystack)) {
    return 'agreement_prep_draft';
  }
  if (/(score|scorecard|readiness|hazırlık|hazirlik)/.test(haystack)) {
    return 'agreement_readiness_scorecard';
  }
  if (/(question|soru|missing|eksik)/.test(haystack)) {
    return 'question_set';
  }
  return 'general_shift_to_agreement_prep';
}

export function buildShiftToAgreementPrepRole(role, config) {
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
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_ACTIONS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
    TURKISH_VISIBLE_PHRASES: Object.freeze([
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES,
      ...(Array.isArray(config.TURKISH_VISIBLE_PHRASES) ? config.TURKISH_VISIBLE_PHRASES : []),
    ]),
    BLOCKED_PHRASES: Object.freeze([
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_PHRASES,
      ...(Array.isArray(config.BLOCKED_PHRASES) ? config.BLOCKED_PHRASES : []),
    ]),
    HANOFFS: Object.freeze([
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_HANOFFS,
      ...(Array.isArray(config.HANOFFS) ? config.HANOFFS : []),
    ]),
    PUBLIC_PROMISE: Object.freeze([
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_PUBLIC_PROMISE,
      ...(Array.isArray(config.PUBLIC_PROMISE) ? config.PUBLIC_PROMISE : []),
    ]),
    PII_KVKK_SAFE_HANDLING: Object.freeze([
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_PII_KVKK_SAFE_HANDLING,
    ]),
    BOUNDARY_FLAGS: Object.freeze([
      ...COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS,
      ...(Array.isArray(config.BOUNDARY_FLAGS) ? config.BOUNDARY_FLAGS : []),
    ]),
  });
}

const SHIFT_ROLE_TEMPLATE = Object.freeze({
  READ: [
    'agreement prep summary',
    'masked supplier / company labels',
    'read-only scorecard',
  ],
  EXPLAIN: [
    'hangi alanlar eksik',
    'hangi riskler var',
    'neden insan onayı gerekir',
  ],
  RECOMMEND: [
    'next safe step',
    'human approval packet',
    'mask-first handling',
  ],
  PREPARE: [
    'agreement field mapping model',
    'readiness scorecard',
    'question set',
  ],
  DRAFT: [
    'agreement prep packet',
    'safe next-step draft',
  ],
  RISK_SUMMARY: [
    'privacy risk',
    'legal risk',
    'operational risk',
  ],
  NEXT_STEP: [
    'kontrol et ve insan onayına sun',
  ],
  HUMAN_APPROVAL_REQUIRED: [
    'agreement create / approve / sign / execute before human approval is blocked',
  ],
  BLOCKED_RUNTIME_ACTION: [
    'agreement create',
    'agreement approve',
    'agreement execute',
    'supplier contact',
    'RFQ send',
    'DB write',
    'audit event write',
  ],
  NEVER_AUTOMATE: [
    'otomatik agreement execute',
    'otomatik sözleşme onayı',
    'otomatik tedarikçi seçimi',
  ],
  TURKISH_VISIBLE_PHRASES: COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES,
  BLOCKED_PHRASES: COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_PHRASES,
  HANOFFS: COPILOT_SHIFT_TO_AGREEMENT_PREP_HANOFFS,
  PUBLIC_PROMISE: COPILOT_SHIFT_TO_AGREEMENT_PREP_PUBLIC_PROMISE,
  BOUNDARY_FLAGS: COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS,
});

export const COPILOT_SHIFT_TO_AGREEMENT_PREP_POLICY = Object.freeze(
  Object.fromEntries(
    COPILOT_SHIFT_TO_AGREEMENT_PREP_ROLE_NAMES.map((role) => [role, buildShiftToAgreementPrepRole(role, SHIFT_ROLE_TEMPLATE)]),
  ),
);

export function listCopilotShiftToAgreementPrepRoles() {
  return [...COPILOT_SHIFT_TO_AGREEMENT_PREP_ROLE_NAMES];
}

export function getCopilotShiftToAgreementPrepPolicy(role) {
  return COPILOT_SHIFT_TO_AGREEMENT_PREP_POLICY[role] || null;
}
