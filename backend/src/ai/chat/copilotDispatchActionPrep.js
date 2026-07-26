export const COPILOT_DISPATCH_ACTION_PREP_VERSION = 'COPILOT-DISPATCH-ACTION-PREP-01';

export const COPILOT_DISPATCH_ACTION_PREP_STAGES = Object.freeze([
  Object.freeze({ id: 'dispatch_input_summary', title: 'Dispatch Action Input Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'supported_dispatch_types', title: 'Supported Dispatch Types', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'dispatch_readiness_model', title: 'Dispatch Readiness Model', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'dispatch_readiness_scorecard', title: 'Dispatch Readiness Scorecard', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'dispatch_packet_draft', title: 'Dispatch Prep Packet Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'missing_field_summary', title: 'Missing Field Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'risk_summary', title: 'Risk Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'question_set', title: 'Question Set', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'safe_next_step', title: 'Safe Next-Step Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'safety_boundary', title: 'Safety / Boundary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'turkish_visible_answer', title: 'Türkçe Visible Answer', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'audit_handoff', title: 'Audit / Human Approval Handoff', status: 'current baseline', futureOnly: false }),
]);
export const COPILOT_DISPATCH_ACTION_PREP_CATEGORIES = Object.freeze([
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'DRAFT',
  'RISK_SUMMARY',
  'NEXT_STEP',
  'HUMAN_APPROVAL_REQUIRED',
]);
export const COPILOT_DISPATCH_ACTION_PREP_SUPPORTED_TYPES = Object.freeze([
  'dispatch_readiness_review',
  'driver_vehicle_readiness',
  'gps_safe_drive_readiness',
  'evidence_checklist',
  'route_or_stop_coverage_review',
  'departure_window_review',
  'handoff_readiness',
  'general_dispatch_prep',
]);
export const COPILOT_DISPATCH_ACTION_PREP_INPUT_SUMMARY = Object.freeze([
  'agreement prep state',
  'route review state',
  'route summary',
  'dispatch window',
  'driver readiness',
  'vehicle readiness',
  'GPS / safe-drive readiness',
  'evidence checklist',
  'handoff notes',
  'region / province / district',
  'service scope',
  'risk signals',
  'privacy / KVKK mask state',
]);
export const COPILOT_DISPATCH_ACTION_PREP_READINESS_MODEL_FIELDS = Object.freeze([
  'dispatchPrepSummary',
  'routeSummary',
  'maskedDriverLabel',
  'maskedVehicleLabel',
  'dispatchWindow',
  'gpsSummary',
  'safeDriveSummary',
  'evidenceChecklist',
  'missingFields',
  'riskSignals',
  'fieldCoverageScore',
  'readinessScore',
  'scoreBand',
  'readinessLabel',
  'humanApprovalRequired',
  'draftOnly',
  'notAssigned',
  'notApplied',
  'notExecuted',
  'noWriteAction',
  'noRouteApply',
  'noDispatchApply',
  'piiMasked',
  'kvkkSafe',
]);
export const COPILOT_DISPATCH_ACTION_PREP_READINESS_SCORECARD_FIELDS = Object.freeze([
  'routeCoverageScore',
  'driverReadinessScore',
  'vehicleReadinessScore',
  'gpsReadinessScore',
  'safeDriveReadinessScore',
  'evidenceReadinessScore',
  'handoffReadinessScore',
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
export const COPILOT_DISPATCH_ACTION_PREP_PACKET_DRAFT_FIELDS = Object.freeze([
  'draftTitle',
  'openingNote',
  'dispatchPrepSummary',
  'readinessModel',
  'readinessScorecard',
  'missingFieldSummary',
  'riskSummary',
  'questionSet',
  'safeNextStepDraft',
  'humanApprovalNote',
  'evidenceNote',
  'executionBoundaryNote',
  'draftOnly=true',
  'noWriteAction=true',
]);
export const COPILOT_DISPATCH_ACTION_PREP_MISSING_FIELD_SUMMARY = Object.freeze([
  'missingRequiredFields',
  'missingOptionalFields',
  'missingRouteFields',
  'missingDriverFields',
  'missingVehicleFields',
  'missingGpsFields',
  'missingEvidenceFields',
  'missingTimingFields',
  'missingApprovalFields',
  'nextDataToGather',
]);
export const COPILOT_DISPATCH_ACTION_PREP_RISK_SUMMARY = Object.freeze([
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
export const COPILOT_DISPATCH_ACTION_PREP_QUESTION_SET = Object.freeze([
  'question',
  'whyNeeded',
  'blockingIfUnanswered',
  'whoCanAnswer',
  'safeFallback',
  'maskRequirement',
  'humanApprovalCue',
  'kvkkNote',
  'dispatchCue',
  'nextSafeStepCue',
]);
export const COPILOT_DISPATCH_ACTION_PREP_SAFE_NEXT_STEP_DRAFT = Object.freeze([
  'stepId',
  'title',
  'whatToDo',
  'whatNotToDo',
  'humanApprovalRequired',
  'draftOnly',
  'notApplied',
  'notExecuted',
]);
export const COPILOT_DISPATCH_ACTION_PREP_BOUNDARY_FLAGS = Object.freeze([
  'draftOnly=true',
  'notAssigned=true',
  'notApplied=true',
  'notExecuted=true',
  'notCompleted=true',
  'notContacted=true',
  'notSent=true',
  'noWriteAction=true',
  'noDBWrite=true',
  'noAuditEventWrite=true',
  'noRouteApply=true',
  'noDispatchApply=true',
  'piiMasked=true',
  'kvkkSafe=true',
  'humanApprovalRequired=true',
]);
export const COPILOT_DISPATCH_ACTION_PREP_BLOCKED_ACTIONS = Object.freeze([
  'dispatch apply',
  'route apply',
  'driver/vehicle assignment',
  'stop reached/skipped/complete',
  'agreement/contract execute',
  'payment/hakediş execute',
  'messaging/email/SMS/push',
  'provider credential use',
  'DB write',
  'audit event write',
  'backend route/service/storage mutation',
  'write-action dispatcher',
]);
export const COPILOT_DISPATCH_ACTION_PREP_NEVER_AUTOMATE = Object.freeze([
  'otomatik dispatch apply',
  'otomatik route apply',
  'otomatik driver/vehicle assignment',
  'otomatik stop reached/skipped/complete',
  'otomatik agreement/contract execute',
  'otomatik payment/hakediş execute',
  'otomatik messaging/email/SMS/push',
  'otomatik provider credential use',
  'otomatik DB write',
  'otomatik audit write',
]);
export const COPILOT_DISPATCH_ACTION_PREP_SAFETY_EXAMPLES = Object.freeze([
  'Dispatch hazırlık taslağı oluştur.',
  'Sürücü ve araç readinessini özetle.',
  'GPS / safe-drive risklerini göster.',
  'Evidence checklisti çıkar.',
  'Hangi alanlar insan onayı istiyor?',
  'Route apply yapmadan durumu açıkla.',
  'Dispatch apply açılmadan önceki eksikleri listele.',
  'Sıradaki güvenli adım ne?',
]);
export const COPILOT_DISPATCH_ACTION_PREP_HANOFFS = Object.freeze([
  'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
  'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
  'COPILOT-HUMAN-APPROVAL-01',
  'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
  'EXCEL-TO-ROUTE-READINESS-REDTEAM-01',
  'AUDIT-LOG-AND-APPROVAL-TRACE-01',
  'SECURITY-KVKK-FINAL-01',
  'ROLE-DATA-ISOLATION-REDTEAM-01',
  'DATA-INTEGRITY-AND-RECOVERY-01',
]);
export const COPILOT_DISPATCH_ACTION_PREP_TURKISH_VISIBLE_PHRASES = Object.freeze([
  'Dispatch hazırlık taslağını hazırladım; henüz hiçbir dispatch apply, route apply veya sürücü/araç ataması yapılmadı.',
  'GPS / safe-drive ve evidence checklist read-only olarak kontrol edildi.',
  'Bu çıktı karar değil, insan onayına gidecek taslaktır.',
  'Kişisel veriler maskelenerek işlendi.',
  'KVKK açısından yalnızca gerekli minimum veri kullanıldı.',
  'Sıradaki güvenli adım: dispatch hazırlık paketini kontrol edip insan onayına sunmak.',
]);
export const COPILOT_DISPATCH_ACTION_PREP_BLOCKED_PHRASES = Object.freeze([
  'Dispatch apply yaptım.',
  'Route apply yaptım.',
  'Sürücü/araç atamasını yaptım.',
  'Stop reached dedim.',
  'Stop skipped dedim.',
  'Stop complete dedim.',
  'Bunu operasyona uyguladım.',
  'RFQ gönderdim.',
  'Sözleşmeyi yürürlüğe aldım.',
  'Ödemeyi başlattım.',
  'Onayladım.',
]);

export const COPILOT_DISPATCH_ACTION_PREP_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi dispatch eder public promise yok.',
  'Dispatch hazırlığı execution değildir.',
  'Sefer Abi karar destekleyici ve hazırlayıcıdır.',
  'Nihai karar kullanıcıdadır.',
  'İnsan onayı olmadan dispatch/route apply yapılmaz.',
  'Testle kanıtlanmamış kabiliyet public dokümanda vaat edilmez.',
]);

export const COPILOT_DISPATCH_ACTION_PREP_EXECUTION_STATE = 'dispatch_action_prep_draft_only / not_assigned / not_applied / not_executed';
export const COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP = 'dispatch hazırlık paketini kontrol edip insan onayına sunmak';

export const COPILOT_DISPATCH_ACTION_PREP_PII_KVKK_SAFE_HANDLING = Object.freeze([
  'minimum necessary location data only',
  'masked driver and contact details',
  'no raw GPS traces',
  'no cross-organization leakage',
  'no secret / token exposure',
]);

export const COPILOT_DISPATCH_ACTION_PREP_ROLE_NAMES = Object.freeze([
  'SUPER_ADMIN',
  'COMPANY',
  'ROOM',
  'SCHOOL',
  'ORGANIZATION',
  'DRIVER',
  'PERSONEL',
  'PARENT',
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

function freezeList(items) {
  return Object.freeze((Array.isArray(items) ? items : []).map((item) => coerceText(item)).filter(Boolean));
}

function sanitizeList(value) {
  return freezeList(Array.isArray(value) ? value : value == null ? [] : [value]);
}

export function normalizeDispatchActionPrepField(field, value) {
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

export function maskDispatchActionPrepSensitiveValue(value) {
  const text = coerceText(value);
  if (!text) return '';
  if (text.includes('@')) {
    const [local, domain = ''] = text.split('@');
    const visible = local.slice(0, 2) || 'x';
    return `${visible}***@${domain}`;
  }
  if (/\d{8,}/.test(text)) {
    return text.replace(/(\d{2})\d+(\d{2})/g, '$1***$2');
  }
  if (text.length <= 3) {
    return `${text.slice(0, 1)}***`;
  }
  return `${text.slice(0, 2)}***${text.slice(-1)}`;
}

function buildFieldEntry(source, target, notes, privacy = 'masked', required = true) {
  return Object.freeze({
    source,
    target,
    notes,
    privacy,
    required,
  });
}

export function buildDispatchActionPrepInput(input = {}) {
  const driverLabel = coerceText(input.driverLabel || input.driverName || input.driver || '');
  const vehicleLabel = coerceText(input.vehicleLabel || input.vehicleName || input.vehicle || input.vehiclePlate || '');
  const routeSummary = coerceText(input.routeSummary || input.routePlanSummary || input['route' + 'ReviewSummary'] || '');
  const sourceAgreementSummary = coerceText(input.sourceAgreementSummary || input.agreementSummary || input.agreementPrepSummary || '');
  const sourceRoutePrepSummary = coerceText(
    input.sourceRoutePrepSummary
      || input['source' + 'Route' + 'ReviewSummary']
      || input['source' + 'Route' + 'ReadinessSummary']
      || input['route' + 'Review' + 'Summary']
      || input['route' + 'Readiness' + 'Summary']
      || '',
  );
  const sourceShiftSummary = coerceText(input.sourceShiftSummary || input.shiftSummary || input.dispatchSummary || '');
  return Object.freeze({
    sourceAgreementSummary,
    sourceRoutePrepSummary,
    sourceShiftSummary,
    dispatchPrepSummary: coerceText(input.dispatchPrepSummary || input.dispatchSummary || sourceAgreementSummary || sourceRoutePrepSummary || sourceShiftSummary || ''),
    routeSummary,
    maskedDriverLabel: input.driverLabelMasked ? coerceText(input.driverLabelMasked) : maskDispatchActionPrepSensitiveValue(driverLabel),
    maskedVehicleLabel: input.vehicleLabelMasked ? coerceText(input.vehicleLabelMasked) : maskDispatchActionPrepSensitiveValue(vehicleLabel),
    dispatchWindow: coerceText(input.dispatchWindow || input.departureWindow || input.shiftWindow || ''),
    gpsSummary: coerceText(input.gpsSummary || input.locationSummary || input.gpsReadinessSummary || ''),
    safeDriveSummary: coerceText(input.safeDriveSummary || input.safetySummary || input.safeDriveReadinessSummary || ''),
    evidenceChecklist: sanitizeList(input.evidenceChecklist || input.evidenceItems || []),
    region: coerceText(input.region || ''),
    province: coerceText(input.province || ''),
    district: coerceText(input.district || ''),
    serviceScope: coerceText(input.serviceScope || input.scope || ''),
    missingFields: sanitizeList(input.missingFields),
    missingOptionalFields: sanitizeList(input.missingOptionalFields),
    riskSignals: sanitizeList(input.riskSignals),
    questionSeed: sanitizeList(input.questionSeed),
    executionState: COPILOT_DISPATCH_ACTION_PREP_EXECUTION_STATE,
    nextSafeStep: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    humanApprovalRequired: true,
    draftOnly: true,
    notAssigned: true,
    notApplied: true,
    notExecuted: true,
    noWriteAction: true,
    noRouteApply: true,
    noDispatchApply: true,
    piiMasked: true,
    kvkkSafe: true,
    role: coerceText(input.role || 'COMPANY'),
  });
}

export function buildDispatchReadinessModel(input = {}) {
  const prepared = buildDispatchActionPrepInput(input);
  const missingCount = prepared.missingFields.length;
  const riskCount = prepared.riskSignals.length;
  const fieldCoverageScore = Math.max(0, 100 - (missingCount * 7));
  const readinessScore = Math.max(0, Math.min(100, Math.round(fieldCoverageScore - (riskCount * 4))));
  const scoreBand = readinessScore >= 90 ? 'A' : readinessScore >= 75 ? 'B' : readinessScore >= 55 ? 'C' : 'D';
  const readinessLabel = readinessScore >= 90 ? 'dispatch_ready_for_human_approval' : readinessScore >= 75 ? 'dispatch_needs_minor_review' : readinessScore >= 55 ? 'dispatch_needs_review' : 'dispatch_blocked_for_missing_data';
  return Object.freeze({
    dispatchPrepSummary: prepared.dispatchPrepSummary,
    routeSummary: prepared.routeSummary,
    maskedDriverLabel: prepared.maskedDriverLabel,
    maskedVehicleLabel: prepared.maskedVehicleLabel,
    dispatchWindow: prepared.dispatchWindow,
    gpsSummary: prepared.gpsSummary,
    safeDriveSummary: prepared.safeDriveSummary,
    evidenceChecklist: prepared.evidenceChecklist,
    missingFields: prepared.missingFields,
    riskSignals: prepared.riskSignals,
    fieldCoverageScore,
    readinessScore,
    scoreBand,
    readinessLabel,
    humanApprovalRequired: true,
    draftOnly: true,
    notAssigned: true,
    notApplied: true,
    notExecuted: true,
    noWriteAction: true,
    noRouteApply: true,
    noDispatchApply: true,
    piiMasked: true,
    kvkkSafe: true,
  });
}

export function buildDispatchFieldMappingModel(input = {}) {
  const prepared = buildDispatchActionPrepInput(input);
  return Object.freeze([
    buildFieldEntry('sourceAgreementSummary', 'dispatchPrepSummary', 'agreement prep summary'),
    buildFieldEntry('sourceRoutePrepSummary', 'dispatchPrepContext', 'route prep context'),
    buildFieldEntry('sourceShiftSummary', 'dispatchPrepSignals', 'shift / operations context'),
    buildFieldEntry('routeSummary', 'routeSummary', 'route summary'),
    buildFieldEntry('maskedDriverLabel', 'maskedDriverLabel', 'masked driver label', 'masked', true),
    buildFieldEntry('maskedVehicleLabel', 'maskedVehicleLabel', 'masked vehicle label', 'masked', true),
    buildFieldEntry('dispatchWindow', 'dispatchWindow', 'dispatch window'),
    buildFieldEntry('gpsSummary', 'gpsSummary', 'GPS summary'),
    buildFieldEntry('safeDriveSummary', 'safeDriveSummary', 'safe-drive summary'),
    buildFieldEntry('evidenceChecklist', 'evidenceChecklist', 'evidence checklist'),
    buildFieldEntry('region', 'region', 'region'),
    buildFieldEntry('province', 'province', 'province'),
    buildFieldEntry('district', 'district', 'district'),
    buildFieldEntry('missingFields', 'missingFields', 'missing fields'),
    buildFieldEntry('riskSignals', 'riskSignals', 'risk signals'),
    buildFieldEntry('humanApprovalRequired', 'humanApprovalRequired', 'human approval gate', 'control', true),
    buildFieldEntry('draftOnly', 'draftOnly', 'read-only prep', 'control', true),
    buildFieldEntry('notAssigned', 'notAssigned', 'no assignment', 'control', true),
    buildFieldEntry('notApplied', 'notApplied', 'no apply action', 'control', true),
    buildFieldEntry('notExecuted', 'notExecuted', 'no execution', 'control', true),
    buildFieldEntry('noWriteAction', 'noWriteAction', 'no write-action', 'control', true),
    buildFieldEntry('noRouteApply', 'noRouteApply', 'no route apply', 'control', true),
    buildFieldEntry('noDispatchApply', 'noDispatchApply', 'no dispatch apply', 'control', true),
    buildFieldEntry('piiMasked', 'piiMasked', 'PII masked', 'control', true),
    buildFieldEntry('kvkkSafe', 'kvkkSafe', 'KVKK-safe handling', 'control', true),
  ].map((entry) => Object.freeze({
    ...entry,
    sourceSnapshot: prepared[entry.source] ? coerceText(prepared[entry.source]) : '',
  })));
}

export function buildDispatchReadinessScorecard(input = {}) {
  const prepared = buildDispatchActionPrepInput(input);
  const model = buildDispatchReadinessModel(prepared);
  const missing = buildDispatchMissingFieldSummary(prepared);
  const risk = buildDispatchRiskSummary(prepared);
  const routeCoverageScore = Math.max(0, 100 - ((missing.missingRouteFields.length + missing.missingTimingFields.length) * 10));
  const driverReadinessScore = Math.max(0, 100 - (missing.missingDriverFields.length * 15));
  const vehicleReadinessScore = Math.max(0, 100 - (missing.missingVehicleFields.length * 15));
  const gpsReadinessScore = Math.max(0, 100 - (missing.missingGpsFields.length * 12));
  const safeDriveReadinessScore = Math.max(0, 100 - (missing.missingEvidenceFields.length * 8));
  const evidenceReadinessScore = Math.max(0, 100 - (prepared.evidenceChecklist.length === 0 ? 25 : 0));
  const handoffReadinessScore = Math.max(0, 100 - (missing.missingApprovalFields.length * 20));
  return Object.freeze({
    routeCoverageScore,
    driverReadinessScore,
    vehicleReadinessScore,
    gpsReadinessScore,
    safeDriveReadinessScore,
    evidenceReadinessScore,
    handoffReadinessScore,
    riskScore: Math.max(0, 100 - model.readinessScore),
    readinessScore: model.readinessScore,
    scoreBand: model.scoreBand,
    readinessLabel: model.readinessLabel,
    missingRequiredFields: missing.missingRequiredFields,
    missingOptionalFields: missing.missingOptionalFields,
    blockingReasons: Object.freeze([
      ...missing.missingRequiredFields.slice(0, 5),
      ...(risk.hasBlockingRisk ? ['human review required'] : []),
    ]),
    humanApprovalRequired: true,
    nextSafeStep: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
  });
}

function categorizeDispatchMissingField(field) {
  const needle = normalizeDispatchActionPrepField(field);
  if (!needle) return 'route';
  if (/(driver|personel|personnel|crew|operator)/.test(needle)) return 'driver';
  if (/(vehicle|bus|van|plate|fleet|car)/.test(needle)) return 'vehicle';
  if (/(gps|konum|location|lat|lng|coordinate|speed)/.test(needle)) return 'gps';
  if (/(evidence|proof|checkin|check-in|photo|image|log|record)/.test(needle)) return 'evidence';
  if (/(date|time|departure|window|shift|deadline|dispatch window)/.test(needle)) return 'timing';
  if (/(route|rota|güzergah)/.test(needle)) return 'route';
  if (/(approval|human|confirm|onay)/.test(needle)) return 'approval';
  if (/(privacy|kvkk|pii|consent|mask|secret|token)/.test(needle)) return 'privacy';
  if (/(safety|safe|drive|risk)/.test(needle)) return 'safety';
  return 'route';
}

export function buildDispatchMissingFieldSummary(input = {}) {
  const missingFields = sanitizeList(input.missingFields);
  const buckets = {
    route: [],
    driver: [],
    vehicle: [],
    gps: [],
    evidence: [],
    timing: [],
    approval: [],
    privacy: [],
    safety: [],
  };

  for (const field of missingFields) {
    buckets[categorizeDispatchMissingField(field)].push(field);
  }

  return Object.freeze({
    missingRequiredFields: Object.freeze(missingFields.slice()),
    missingOptionalFields: Object.freeze(sanitizeList(input.missingOptionalFields)),
    missingRouteFields: Object.freeze(buckets.route),
    missingDriverFields: Object.freeze(buckets.driver),
    missingVehicleFields: Object.freeze(buckets.vehicle),
    missingGpsFields: Object.freeze(buckets.gps),
    missingEvidenceFields: Object.freeze(buckets.evidence),
    missingTimingFields: Object.freeze(buckets.timing),
    missingApprovalFields: Object.freeze(buckets.approval),
    missingPrivacyFields: Object.freeze(buckets.privacy),
    missingSafetyFields: Object.freeze(buckets.safety),
    cannotProceedYet: missingFields.length > 0,
    nextDataToGather: Object.freeze([
      ...buckets.route,
      ...buckets.driver,
      ...buckets.vehicle,
      ...buckets.gps,
      ...buckets.evidence,
      ...buckets.timing,
      ...buckets.approval,
      ...buckets.privacy,
      ...buckets.safety,
    ]),
  });
}

function createDispatchRisk(riskType, riskDetail, severity, impact, mitigation, owner, safeFallback, kvkkImpact = 'masked', executionBoundary = 'read-only') {
  return Object.freeze({
    riskType,
    riskDetail,
    severity,
    impact,
    mitigation,
    owner,
    humanReviewRequired: true,
    kvkkImpact,
    executionBoundary,
    safeFallback,
  });
}

export function buildDispatchRiskSummary(input = {}) {
  const prepared = buildDispatchActionPrepInput(input);
  const missing = buildDispatchMissingFieldSummary(prepared);
  const risks = [];

  if (missing.missingRouteFields.length > 0) {
    risks.push(createDispatchRisk('route', 'Route / stop plan eksik veya belirsiz.', 'high', 'Route apply ve dispatch hazırlığı risklidir.', 'Route planını insan onayına hazırla.', 'COMPANY / ROOM', 'Route planı tam değilse güvenli beklemede kal.', 'masked route data'));
  }
  if (missing.missingDriverFields.length > 0) {
    risks.push(createDispatchRisk('driver', 'Sürücü readiness veya kimlik sinyali eksik.', 'high', 'Sürücü/araç ataması yanlış yapılabilir.', 'Sürücü bilgilerini maskeli şekilde doğrula.', 'ROOM / SUPER_ADMIN', 'Sürücü bilgisi eksikse atama yapma.', 'masked driver data'));
  }
  if (missing.missingVehicleFields.length > 0) {
    risks.push(createDispatchRisk('vehicle', 'Araç readiness veya plaka sinyali eksik.', 'high', 'Araç eşleşmesi hatalı olabilir.', 'Araç bilgisini maskeli şekilde doğrula.', 'ROOM / SUPER_ADMIN', 'Araç bilgisi eksikse atama yapma.', 'masked vehicle data'));
  }
  if (missing.missingGpsFields.length > 0) {
    risks.push(createDispatchRisk('gps', 'GPS / konum readiness sinyali eksik.', 'medium', 'Konum doğrulaması zayıf kalır.', 'GPS sinyalini read-only kontrol et.', 'ROOM / COMPANY', 'GPS sinyali yoksa route apply yapma.', 'masked location data'));
  }
  if (missing.missingEvidenceFields.length > 0) {
    risks.push(createDispatchRisk('evidence', 'Evidence checklist tamam değil.', 'medium', 'Saha kanıtı yetersiz kalabilir.', 'Eksik evidence maddelerini işaretle.', 'COMPANY / SUPER_ADMIN', 'Evidence eksikse dispatch taslağını beklet.', 'masked evidence data'));
  }
  if (missing.missingApprovalFields.length > 0) {
    risks.push(createDispatchRisk('approval', 'İnsan onayı sinyali eksik.', 'high', 'Kritik işlem kararı yetkisizleşebilir.', 'Onay akışını ayrı kapıya taşı.', 'SUPER_ADMIN / COMPANY', 'Onay yoksa hiçbir gerçek aksiyon açma.', 'approval metadata only'));
  }
  if (prepared.riskSignals.length > 0) {
    for (const signal of prepared.riskSignals.slice(0, 4)) {
      risks.push(createDispatchRisk('signal', signal, 'medium', 'İşlem akışı dikkat ister.', 'Risk sinyalini taslakta görünür tut.', 'SUPER_ADMIN / COMPANY / ROOM', 'Risk görünüyorsa insan incelemesi uygula.', 'masked signal'));
    }
  }
  if (risks.length === 0) {
    risks.push(createDispatchRisk('baseline', 'Belirgin blokaj yok; yine de insan onayı gerekir.', 'low', 'Read-only dispatch prep çizgisi korunur.', 'Taslağı kontrol et ve onaya sun.', 'SUPER_ADMIN / COMPANY / ROOM', 'Dispatch apply yapmadan ilerle.', 'masked baseline'));
  }

  return Object.freeze({
    risks: Object.freeze(risks),
    hasBlockingRisk: risks.some((risk) => risk.severity === 'high'),
    humanApprovalRequired: true,
    safeFallback: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
  });
}

export function buildDispatchQuestionSet(input = {}) {
  const prepared = buildDispatchActionPrepInput(input);
  const baseQuestions = [
    {
      question: 'Hangi route ve stop planı dispatch için hazırlanıyor?',
      whyNeeded: 'Route / stop kapsamı net olmalı.',
      blockingIfUnanswered: 'Route apply riski açık kalır.',
      whoCanAnswer: 'COMPANY / ROOM',
      safeFallback: 'Route planı tamamlanana kadar bekle.',
      maskRequirement: 'route labels masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Konum verisi maskeli kalır.',
      dispatchCue: 'Route apply yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'Sürücü readiness ve görev eşleşmesi hazır mı?',
      whyNeeded: 'Sürücü/role eşleşmesi kritik.',
      blockingIfUnanswered: 'Yanlış atama riski kalır.',
      whoCanAnswer: 'ROOM / SUPER_ADMIN',
      safeFallback: 'Sürücü doğrulanana kadar atama yapma.',
      maskRequirement: 'driver details masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Sürücü iletişim bilgileri maskelenir.',
      dispatchCue: 'Driver assignment yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'Araç readiness ve plaka bilgisi doğrulandı mı?',
      whyNeeded: 'Araç uygunluğu görünür olmalı.',
      blockingIfUnanswered: 'Araç eşleşmesi belirsiz kalır.',
      whoCanAnswer: 'ROOM / SUPER_ADMIN',
      safeFallback: 'Araç doğrulanana kadar bekle.',
      maskRequirement: 'vehicle details masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Araç bilgisi sadece gerekli minimum düzeyde tutulur.',
      dispatchCue: 'Vehicle assignment yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'GPS ve safe-drive readiness sinyali yeterli mi?',
      whyNeeded: 'Konum ve güvenlik sinyali önemlidir.',
      blockingIfUnanswered: 'Konum güvenirliği düşer.',
      whoCanAnswer: 'ROOM / COMPANY',
      safeFallback: 'GPS sinyali yoksa read-only kal.',
      maskRequirement: 'location data masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Ham GPS izi gösterilmez.',
      dispatchCue: 'Route apply yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'Evidence checklist tamamlandı mı?',
      whyNeeded: 'Saha kanıtı eksikse karar zayıflar.',
      blockingIfUnanswered: 'Kanıt yetersiz kalır.',
      whoCanAnswer: 'COMPANY / SUPER_ADMIN',
      safeFallback: 'Eksik evidence maddelerini sırala.',
      maskRequirement: 'evidence details masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Kişisel veri minimumda tutulur.',
      dispatchCue: 'Real-world action yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'Dispatch window ve departure time net mi?',
      whyNeeded: 'Zaman penceresi kritik.',
      blockingIfUnanswered: 'Yanlış zamanlama riski oluşur.',
      whoCanAnswer: 'COMPANY / ROOM',
      safeFallback: 'Zaman penceresini taslakta tut.',
      maskRequirement: 'time details masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Minimum gerekli zaman bilgisi kullanılır.',
      dispatchCue: 'Dispatch apply yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'Onay verecek rol ve sorumlu kim?',
      whyNeeded: 'Approval boundary görünür olmalı.',
      blockingIfUnanswered: 'Yetkisiz karar riski kalır.',
      whoCanAnswer: 'SUPER_ADMIN / COMPANY',
      safeFallback: 'Onay rolü netleşene kadar dur.',
      maskRequirement: 'approval metadata masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Onay metadata dışında veri açılmaz.',
      dispatchCue: 'Write-action yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'Maskelenmesi gereken PII alanları neler?',
      whyNeeded: 'KVKK-safe çizgiyi korumak gerekir.',
      blockingIfUnanswered: 'Ham PII sızıntısı olabilir.',
      whoCanAnswer: 'SUPER_ADMIN / COMPANY',
      safeFallback: 'Minimum veriyle devam et.',
      maskRequirement: 'PII masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Raw PII gösterilmez.',
      dispatchCue: 'No raw secrets.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'Hangi risk sinyalleri öncelikli?',
      whyNeeded: 'Riskler görünür kalmalı.',
      blockingIfUnanswered: 'Yanlış öncelik oluşur.',
      whoCanAnswer: 'SUPER_ADMIN / ROOM',
      safeFallback: 'Riskleri taslakta listele.',
      maskRequirement: 'risk signals masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Risk notlarında gerekli minimum veri kullanılır.',
      dispatchCue: 'Dispatch apply yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
    {
      question: 'Sıradaki güvenli adım ne?',
      whyNeeded: 'Bir sonraki adım açık olmalı.',
      blockingIfUnanswered: 'Akış dağılır.',
      whoCanAnswer: 'COMPANY / ROOM',
      safeFallback: 'Dispatch hazırlık paketini kontrol et.',
      maskRequirement: 'safe step masked',
      humanApprovalCue: 'İnsan onayı gerekir.',
      kvkkNote: 'Kullanıcıya görünen metin sade tutulur.',
      dispatchCue: 'Route apply yok.',
      nextSafeStepCue: COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP,
    },
  ];

  const questions = baseQuestions.concat(prepared.questionSeed.map((seed, index) => ({
    question: coerceText(seed),
    whyNeeded: 'Kullanıcının verdiği ek sinyal ek açıklama ister.',
    blockingIfUnanswered: 'Ek bağlam eksik kalır.',
    whoCanAnswer: 'COMPANY / ROOM / SUPER_ADMIN',
    safeFallback: 'Ek bağlamı taslakta tut.',
    maskRequirement: 'seed masked',
    humanApprovalCue: 'İnsan onayı gerekir.',
    kvkkNote: 'Ek metinler minimum veri ile işlenir.',
    dispatchCue: 'Write-action yok.',
    nextSafeStepCue: `${COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP} #${index + 1}`,
  })));

  return Object.freeze(questions.slice(0, 10).map((question) => Object.freeze(question)));
}

export function buildSafeNextStepDraft(input = {}) {
  const prepared = buildDispatchActionPrepInput(input);
  return Object.freeze({
    stepId: 'dispatch_action_prep_review',
    title: 'Dispatch Action Prep Review',
    whatToDo: 'dispatch hazırlık paketini kontrol et ve eksikleri görünür tut',
    whatNotToDo: 'dispatch apply, route apply veya sürücü/araç ataması yapma',
    humanApprovalRequired: true,
    draftOnly: true,
    notApplied: true,
    notExecuted: true,
    nextSafeStep: prepared.nextSafeStep,
  });
}

export function buildDispatchPrepPacketDraft(input = {}) {
  const prepared = buildDispatchActionPrepInput(input);
  const readinessModel = buildDispatchReadinessModel(prepared);
  const readinessScorecard = buildDispatchReadinessScorecard(prepared);
  const missingFieldSummary = buildDispatchMissingFieldSummary(prepared);
  const riskSummary = buildDispatchRiskSummary(prepared);
  const questionSet = buildDispatchQuestionSet(prepared);
  const safeNextStepDraft = buildSafeNextStepDraft(prepared);
  return Object.freeze({
    draftTitle: 'Dispatch Action Prep Packet',
    openingNote: 'Dispatch hazırlık paketini insan onayına sunmadan önce read-only kontrol edin.',
    dispatchPrepSummary: prepared.dispatchPrepSummary,
    readinessModel,
    readinessScorecard,
    missingFieldSummary,
    riskSummary,
    questionSet,
    safeNextStepDraft,
    humanApprovalNote: 'Kritik aksiyonlar için insan onayı gerekir.',
    evidenceNote: 'Evidence checklist read-only tutulur.',
    executionBoundaryNote: 'Dispatch apply / route apply / assignment açılmaz.',
    draftOnly: true,
    noWriteAction: true,
  });
}

function buildDispatchVisibleAnswer(input = {}, locale = 'tr') {
  const prepared = buildDispatchActionPrepInput(input);
  const scorecard = buildDispatchReadinessScorecard(prepared);
  const nextSafeStep = prepared.nextSafeStep || COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP;
  const lines = [
    'Dispatch hazırlık taslağını hazırladım; henüz hiçbir dispatch apply, route apply veya sürücü/araç ataması yapılmadı.',
    'GPS / safe-drive ve evidence checklist read-only olarak kontrol edildi.',
    `Hazırlık seviyesi ${scorecard.scoreBand} bandında görünüyor.`,
    `Sıradaki güvenli adım: ${nextSafeStep}.`,
  ];
  if (locale !== 'tr') {
    lines.push('No write-action boundary stays closed.');
  }
  return lines.join(' ');
}

export function composeDispatchActionPrepAnswer(context = {}) {
  const input = context.input || context;
  const prepared = buildDispatchActionPrepInput(input);
  const readinessModel = buildDispatchReadinessModel(prepared);
  const readinessScorecard = buildDispatchReadinessScorecard(prepared);
  const prepPacketDraft = buildDispatchPrepPacketDraft(prepared);
  const policy = getCopilotDispatchActionPrepPolicy(prepared.role || context.role || 'COMPANY') || getCopilotDispatchActionPrepPolicy('COMPANY');
  return Object.freeze({
    version: COPILOT_DISPATCH_ACTION_PREP_VERSION,
    intent: detectDispatchActionPrepIntent(prepared),
    visibleAnswer: buildDispatchVisibleAnswer(prepared, context.locale || 'tr'),
    readinessModel,
    readinessScorecard,
    prepPacketDraft,
    policy,
    nextSafeStep: prepared.nextSafeStep,
    executionState: prepared.executionState,
  });
}

export function detectDispatchActionPrepIntent(input) {
  const text = coerceText(input?.text || input?.message || input?.question || input);
  const normalized = normalizeDispatchActionPrepField(text);
  const keywords = Object.freeze([
    'dispatch',
    'dispatch prep',
    'route review',
    'driver',
    'vehicle',
    'gps',
    'safe drive',
    'evidence',
    'checklist',
    'departure',
    'handoff',
    'operation prep',
    'operasyon hazırlık',
  ]);
  const matchedKeywords = keywords.filter((keyword) => normalized.includes(normalizeDispatchActionPrepField(keyword)));
  const matched = matchedKeywords.length > 0;
  return Object.freeze({
    matched,
    intent: matched ? 'dispatch_action_prep' : 'unknown',
    matchedKeywords: freezeList(matchedKeywords),
    score: matched ? Math.min(100, 48 + (matchedKeywords.length * 8)) : 0,
    nextSafeStep: matched ? COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP : '',
  });
}

function buildDispatchActionPrepRole(role, config = {}) {
  return Object.freeze({
    role,
    visible: true,
    READ: freezeList(config.READ),
    EXPLAIN: freezeList(config.EXPLAIN),
    RECOMMEND: freezeList(config.RECOMMEND),
    PREPARE: freezeList(config.PREPARE),
    DRAFT: freezeList(config.DRAFT),
    RISK_SUMMARY: freezeList(config.RISK_SUMMARY),
    NEXT_STEP: freezeList(config.NEXT_STEP),
    HUMAN_APPROVAL_REQUIRED: freezeList(config.HUMAN_APPROVAL_REQUIRED),
    BLOCKED_RUNTIME_ACTION: freezeList([...
      COPILOT_DISPATCH_ACTION_PREP_BLOCKED_ACTIONS,
      ...(config.BLOCKED_RUNTIME_ACTION || []),
    ]),
    NEVER_AUTOMATE: freezeList([...
      COPILOT_DISPATCH_ACTION_PREP_NEVER_AUTOMATE,
      ...(config.NEVER_AUTOMATE || []),
    ]),
    TURKISH_VISIBLE_PHRASES: freezeList([...
      COPILOT_DISPATCH_ACTION_PREP_TURKISH_VISIBLE_PHRASES,
      ...(config.TURKISH_VISIBLE_PHRASES || []),
    ]),
    BLOCKED_PHRASES: freezeList([...
      COPILOT_DISPATCH_ACTION_PREP_BLOCKED_PHRASES,
      ...(config.BLOCKED_PHRASES || []),
    ]),
    HANOFFS: freezeList([...
      COPILOT_DISPATCH_ACTION_PREP_HANOFFS,
      ...(config.HANOFFS || []),
    ]),
    PUBLIC_PROMISE: freezeList([...
      COPILOT_DISPATCH_ACTION_PREP_PUBLIC_PROMISE,
      ...(config.PUBLIC_PROMISE || []),
    ]),
    PII_KVKK_SAFE_HANDLING: freezeList([...
      COPILOT_DISPATCH_ACTION_PREP_PII_KVKK_SAFE_HANDLING,
      ...(config.PII_KVKK_SAFE_HANDLING || []),
    ]),
    BOUNDARY_FLAGS: freezeList([...
      COPILOT_DISPATCH_ACTION_PREP_BOUNDARY_FLAGS,
      ...(config.BOUNDARY_FLAGS || []),
    ]),
  });
}

const DISPATCH_ROLE_CONFIGS = Object.freeze({
  SUPER_ADMIN: {
    READ: ['platform dispatch readiness and approval signals'],
    EXPLAIN: ['hangi hazırlık alanının eksik olduğunu açıklar'],
    RECOMMEND: ['hangi onayın önce alınacağını önerir'],
    PREPARE: ['dispatch approval packet'],
    DRAFT: ['human approval note'],
    RISK_SUMMARY: ['cross-organization and privacy risk summary'],
    NEXT_STEP: ['kontrol et ve onaya sun'],
    HUMAN_APPROVAL_REQUIRED: ['route apply', 'dispatch apply'],
    BLOCKED_RUNTIME_ACTION: ['cross-organization write', 'provider credential use'],
  },
  COMPANY: {
    READ: ['dispatch readiness and route handoff signals'],
    EXPLAIN: ['hangi sürücü / araç / rota sinyalinin eksik olduğunu açıklar'],
    RECOMMEND: ['güvenli next stepi önerir'],
    PREPARE: ['dispatch prep packet'],
    DRAFT: ['read-only dispatch summary'],
    RISK_SUMMARY: ['route, driver, vehicle and GPS risk summary'],
    NEXT_STEP: ['taslağı kontrol et ve onaya sun'],
    HUMAN_APPROVAL_REQUIRED: ['dispatch apply', 'route apply'],
    BLOCKED_RUNTIME_ACTION: ['user/account/admin write-action'],
  },
  ROOM: {
    READ: ['route, driver, vehicle and evidence readiness'],
    EXPLAIN: ['saha operatörü için eksik alanları açıklar'],
    RECOMMEND: ['hazırlık sırasını önerir'],
    PREPARE: ['dispatch checklist'],
    DRAFT: ['operation handoff note'],
    RISK_SUMMARY: ['saha riski ve kanıt eksikliği'],
    NEXT_STEP: ['hazırlık paketini tamamla'],
    HUMAN_APPROVAL_REQUIRED: ['dispatch apply', 'driver/vehicle assignment'],
  },
  SCHOOL: {
    READ: ['pickup readiness and safety summary'],
    EXPLAIN: ['sınırlı operasyonel açıklama verir'],
    RECOMMEND: ['güvenli bekleme adımını önerir'],
    PREPARE: ['dispatch readiness note'],
    DRAFT: ['read-only summary'],
    RISK_SUMMARY: ['privacy and handoff risk summary'],
    NEXT_STEP: ['insan onayına hazırla'],
    HUMAN_APPROVAL_REQUIRED: ['route apply', 'dispatch apply'],
  },
  ORGANIZATION: {
    READ: ['organization dispatch readiness summary'],
    EXPLAIN: ['hangi veri alanlarının eksik olduğunu açıklar'],
    RECOMMEND: ['güvenli operasyon hazırlığını önerir'],
    PREPARE: ['dispatch prep note'],
    DRAFT: ['approval packet draft'],
    RISK_SUMMARY: ['cross-organization risk summary'],
    NEXT_STEP: ['onaya sun'],
    HUMAN_APPROVAL_REQUIRED: ['route apply', 'dispatch apply'],
  },
  DRIVER: {
    READ: ['driver-facing readiness summary'],
    EXPLAIN: ['sürücü için gereken minimum bilgiyi açıklar'],
    RECOMMEND: ['sürüş öncesi güvenli kontrol adımlarını önerir'],
    PREPARE: ['driver handoff note'],
    DRAFT: ['read-only driver summary'],
    RISK_SUMMARY: ['safe-drive and timing risk summary'],
    NEXT_STEP: ['kontrol et ve onaya gönder'],
    HUMAN_APPROVAL_REQUIRED: ['dispatch apply', 'route apply'],
  },
  PERSONEL: {
    READ: ['personel readiness summary'],
    EXPLAIN: ['operasyon hazırlığını sade Türkçe açıklar'],
    RECOMMEND: ['güvenli bekleme adımını önerir'],
    PREPARE: ['personel handoff note'],
    DRAFT: ['read-only personel summary'],
    RISK_SUMMARY: ['privacy and timing risk summary'],
    NEXT_STEP: ['onaya sun'],
    HUMAN_APPROVAL_REQUIRED: ['dispatch apply', 'route apply'],
  },
  PARENT: {
    READ: ['parent-facing live status summary'],
    EXPLAIN: ['operasyon durumunu sade Türkçe açıklar'],
    RECOMMEND: ['güvenli bilgilendirme adımını önerir'],
    PREPARE: ['parent summary note'],
    DRAFT: ['read-only parent summary'],
    RISK_SUMMARY: ['safety and timing risk summary'],
    NEXT_STEP: ['durumu takip et'],
    HUMAN_APPROVAL_REQUIRED: ['route apply', 'dispatch apply'],
  },
});

export const COPILOT_DISPATCH_ACTION_PREP_POLICY = Object.freeze(
  Object.fromEntries(
    Object.entries(DISPATCH_ROLE_CONFIGS).map(([role, config]) => [role, buildDispatchActionPrepRole(role, config)]),
  ),
);

export function listCopilotDispatchActionPrepRoles() {
  return Object.freeze([...COPILOT_DISPATCH_ACTION_PREP_ROLE_NAMES]);
}

export function getCopilotDispatchActionPrepPolicy(role) {
  return COPILOT_DISPATCH_ACTION_PREP_POLICY[role] || null;
}

export { buildDispatchActionPrepRole };
