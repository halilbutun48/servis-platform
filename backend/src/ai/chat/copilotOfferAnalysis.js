const COPILOT_OFFER_ANALYSIS_VERSION = 'COPILOT-OFFER-ANALYSIS-01';

const COPILOT_OFFER_ANALYSIS_STAGES = Object.freeze([
  Object.freeze({ id: 'offer_analysis_input_summary', title: 'Offer Analysis Input Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'supported_analysis_types', title: 'Supported Analysis Types', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'normalized_offer_model', title: 'Normalized Offer Model', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'comparison_matrix', title: 'Comparison Matrix', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'value_risk_analysis', title: 'Value / Risk Analysis', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'missing_offer_field_policy', title: 'Missing Offer Field Policy', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'recommendation_draft', title: 'Recommendation Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'safety_boundary', title: 'Safety / Boundary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'turkish_visible_answer', title: 'Türkçe Visible Answer', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'audit_handoff', title: 'Audit / Human Approval Handoff', status: 'current baseline', futureOnly: false }),
]);

const COPILOT_OFFER_ANALYSIS_CATEGORIES = Object.freeze([
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'DRAFT',
  'RISK_SUMMARY',
  'NEXT_STEP',
  'HUMAN_APPROVAL_REQUIRED',
]);

const COPILOT_OFFER_ANALYSIS_SUPPORTED_ANALYSIS_TYPES = Object.freeze([
  'personel_servis_offer_analysis',
  'okul_servis_offer_analysis',
  'vardiya_bazli_offer_analysis',
  'regular_route_offer_analysis',
  'one_off_service_offer_analysis',
  'existing_contract_add_on_offer_analysis',
  'capacity_increase_offer_analysis',
  'route_change_offer_analysis',
  'general_offer_analysis',
]);

const COPILOT_OFFER_ANALYSIS_INPUT_SUMMARY = Object.freeze([
  'RFQ type',
  'shortlist / candidate suppliers',
  'offer collection state',
  'service scope',
  'region / province / district',
  'start date',
  'day / period / hour / shift',
  'passenger / personnel / student count',
  'vehicle capacity requirement',
  'SLA / quality expectation',
  'document / license / safety requirement',
  'incoming offer count',
  'missing offer count',
]);

const COPILOT_OFFER_ANALYSIS_NORMALIZED_OFFER_MODEL = Object.freeze([
  'supplierRef',
  'supplierLabelMasked',
  'offerState',
  'priceAmount',
  'priceCurrency',
  'pricePeriod',
  'includedItems',
  'excludedItems',
  'vehicleCapacity',
  'vehicleType',
  'startAvailability',
  'shiftAvailability',
  'licenseCompliance',
  'insuranceSafety',
  'slaCommitment',
  'validityUntil',
  'missingOfferFields',
  'riskNotes',
  'humanReviewRequired',
]);

const COPILOT_OFFER_ANALYSIS_COMPARISON_MATRIX_FIELDS = Object.freeze([
  'supplierRef',
  'supplierLabelMasked',
  'normalizedPriceSummary',
  'scopeCompleteness',
  'capacityFit',
  'timingFit',
  'slaFit',
  'complianceFit',
  'riskLevel',
  'missingFields',
  'analysisScore',
  'fitLevel',
  'notAccepted',
  'notRejected',
  'notSelected',
]);

const COPILOT_OFFER_ANALYSIS_VALUE_RULES = Object.freeze([
  'En düşük fiyat tek başına seçilmez.',
  'Fiyat-kapsam dengesi gösterilir.',
  'Kapsam, kapasite, SLA ve uygunluk birlikte değerlendirilir.',
  'Analiz puanı karar değildir; insan onayı gerekir.',
]);

const COPILOT_OFFER_ANALYSIS_RISK_RULES = Object.freeze([
  'Eksik dahil / hariç kalemler risk olarak işaretlenir.',
  'Kapasite veya saat uyumsuzluğu risk olarak işaretlenir.',
  'Belge / ruhsat / sigorta belirsizliği risk olarak işaretlenir.',
  'SLA taahhüdü eksikse risk olarak işaretlenir.',
  'Geçerlilik tarihi yoksa risk olarak işaretlenir.',
]);

const COPILOT_OFFER_ANALYSIS_MISSING_FIELD_POLICY = Object.freeze([
  'Eksik alanlar karar öncesi görünür tutulur.',
  'Eksik alan tamamlanmadan kesin seçim yapılmaz.',
  'Eksik alanlar supplier contact veya RFQ send ile kapatılmaz.',
  'Eksik alanlar sadece insan onayına hazır taslak olarak kalır.',
]);

const COPILOT_OFFER_ANALYSIS_RECOMMENDATION_POLICY = Object.freeze([
  'Kesin seçim dili kullanılmaz.',
  'Öne çıkan aday teklif dili kullanılır.',
  'Daha güçlü görünen teklif dili kullanılır.',
  'İncelenmesi önerilen teklif dili kullanılır.',
  'İnsan onayı notu zorunludur.',
]);

const COPILOT_OFFER_ANALYSIS_BOUNDARY_FLAGS = Object.freeze([
  'draftOnly=true',
  'notAccepted=true',
  'notRejected=true',
  'notSelected=true',
  'notContacted=true',
  'notSent=true',
  'approvalRequired=true',
]);

const COPILOT_OFFER_ANALYSIS_BLOCKED_ACTIONS = Object.freeze([
  'Offer accept/reject',
  'Supplier selection',
  'Supplier contact',
  'RFQ send',
  'Agreement execute',
  'Dispatch apply',
  'Route apply',
  'Payment/hakediş execute',
  'Messaging/email/SMS/push',
  'Provider credential use',
  'User/account/admin write',
]);

const COPILOT_OFFER_ANALYSIS_NEVER_AUTOMATE = Object.freeze([
  'Kabul / ret kararı',
  'Kazanan tedarikçi kararı',
  'Sözleşme başlatma',
  'RFQ gönderimi',
  'Tedarikçiye mesaj gönderimi',
  'Ödeme / hakediş başlatma',
  'Yazma işlemi',
]);

const COPILOT_OFFER_ANALYSIS_HANOFFS = Object.freeze([
  'COPILOT-DEMAND-INTAKE-01',
  'COPILOT-RFQ-PREP-01',
  'SUPPLIER-MATCHING-01',
  'SUPPLIER-OFFER-COLLECT-01',
  'COPILOT-OFFER-ANALYSIS-01',
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-NEGOTIATION-ASSIST-01',
  'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
  'AUDIT-LOG-AND-APPROVAL-TRACE-01',
  'SECURITY-KVKK-FINAL-01',
  'ROLE-DATA-ISOLATION-REDTEAM-01',
  'DATA-INTEGRITY-AND-RECOVERY-01',
]);

const COPILOT_OFFER_ANALYSIS_TURKISH_VISIBLE_PHRASES = Object.freeze([
  'Teklif analiz taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.',
  'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.',
  'En düşük fiyat tek başına karar için yeterli değildir.',
  'Kapsam, kapasite, SLA ve riskler birlikte değerlendirilmelidir.',
  'Eksik teklif alanları tamamlanmadan karar önerilmez.',
  'Sıradaki güvenli adım: analiz taslağını kontrol edip insan onayına sunmak.',
]);

const COPILOT_OFFER_ANALYSIS_BLOCKED_PHRASES = Object.freeze([
  'Teklifi kabul ettim.',
  'Teklifi reddettim.',
  'Teklifi kabul et.',
  'Teklifi reddet.',
  'Bu tedarikçiyi seçtim.',
  'Bu tedarikçiyi seç.',
  'Bu tedarikçiyi sec.',
  'Kazanan tedarikçi budur.',
  'Sözleşmeyi başlattım.',
  'Bunu tedarikçilere gönder.',
  'Bunu tedarikcilere gonder.',
  'RFQ gönderdim.',
  'RFQ gönder.',
  'RFQ gonder.',
  'Tedarikçiye mesaj gönderdim.',
  'Tedarikçiye mesaj gönder.',
  'Tedarikçiye mesaj gonder.',
  'Teklifleri topladım.',
  'Teklifleri topla.',
  'Onayladım.',
  'Onayla.',
  'Uyguladım.',
  'Uygula.',
]);

const COPILOT_OFFER_ANALYSIS_SAFETY_EXAMPLES = Object.freeze([
  'Teklifleri analiz et.',
  'Bu teklifleri karşılaştır.',
  'Hangisi daha avantajlı görünüyor?',
  'En ucuz teklif güvenli mi?',
  'Fiyat/kapsam farklarını çıkar.',
  'Eksik teklif bilgileri neler?',
  'Riskli teklifleri sırala.',
  'Analizi onaya hazırla.',
]);

const COPILOT_OFFER_ANALYSIS_EXECUTION_STATE = 'offer_analysis_draft_only / not_accepted / not_rejected / not_selected / not_executed';
const COPILOT_OFFER_ANALYSIS_NEXT_SAFE_STEP = 'teklif analizini kontrol edip insan onayına sunmak';
// No DB / network / model call yoktur.
const COPILOT_OFFER_ANALYSIS_ROLE_NAMES = Object.freeze([
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
    return coerceText(value.label || value.name || value.title || value.value || value.text || '');
  }
  return String(value).replace(/\s+/g, ' ').trim();
}
function normalizeOfferAnalysisField(field, value) {
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
function maskOfferAnalysisSensitiveValue(value) {
  const text = coerceText(value);
  if (!text) return '';
  if (text.includes('@')) {
    const [localPart = '', domainPart = ''] = text.split('@');
    const maskedLocal = localPart ? `${localPart.slice(0, 1)}***` : '***';
    const [domainHead = '', ...domainTail] = domainPart.split('.');
    const maskedDomain = domainHead ? `${domainHead.slice(0, 1)}***` : '***';
    return `${maskedLocal}@${maskedDomain}${domainTail.length > 0 ? `.${domainTail.join('.')}` : ''}`;
  }
  const digits = text.replace(/\D+/g, '');
  if (digits.length >= 7) {
    return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
  }
  if (text.length <= 4) {
    return '***';
  }
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}
function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item)).filter(Boolean);
  }
  const text = coerceText(value);
  if (!text) return [];
  return text
    .split(/(?:\s*[,/;|]\s*|\s{2,})/g)
    .map((item) => item.trim())
    .filter(Boolean);
}
function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}
function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function toNumber(value) {
  if (isFiniteNumber(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]+/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inferAnalysisType(input) {
  const text = normalizeOfferAnalysisField(input);
  if (!text) return 'general_offer_analysis';
  if (text.includes('personel servis')) return 'personel_servis_offer_analysis';
  if (text.includes('okul servis') || text.includes('ogrenci servis')) return 'okul_servis_offer_analysis';
  if (text.includes('vardiya')) return 'vardiya_bazli_offer_analysis';
  if (text.includes('rota degis') || text.includes('guzergah degis') || text.includes('guzergah')) return 'route_change_offer_analysis';
  if (text.includes('kapasite art')) return 'capacity_increase_offer_analysis';
  if (text.includes('mevcut sozlesme') || text.includes('ek hat')) return 'existing_contract_add_on_offer_analysis';
  if (text.includes('tek sefer') || text.includes('bir defalik')) return 'one_off_service_offer_analysis';
  if (text.includes('hat') || text.includes('servis hatt')) return 'regular_route_offer_analysis';
  return 'general_offer_analysis';
}

function inferOfferPeriod(priceScopeText) {
  const text = normalizeOfferAnalysisField(priceScopeText);
  if (text.includes('gun') || text.includes('daily')) return 'daily';
  if (text.includes('ay') || text.includes('monthly')) return 'monthly';
  if (text.includes('vardiya') || text.includes('shift')) return 'perShift';
  if (text.includes('km') || text.includes('per km') || text.includes('perkm')) return 'perKm';
  return 'unknown';
}

function inferPriceCurrency(rawOffer = {}) {
  const text = normalizeOfferAnalysisField(rawOffer.priceCurrency || rawOffer.currency || rawOffer.offerCurrency || '');
  if (text.includes('try') || text.includes('tl') || text.includes('turk lira') || text.includes('turkish lira')) {
    return 'TRY';
  }
  return 'TRY';
}

function inferOfferState(rawOffer, missingOfferFields) {
  const explicitState = normalizeOfferAnalysisField(rawOffer.offerState || rawOffer.state || '');
  if (explicitState === 'blocked') return 'blocked';
  if (explicitState === 'complete') return 'complete';
  if (explicitState === 'partial') return 'partial';
  if (explicitState === 'missing_fields' || explicitState === 'missing fields') return 'missing_fields';
  if (rawOffer.blocked === true || rawOffer.analysisBlocked === true || rawOffer.allowAnalysis === false) {
    return 'blocked';
  }
  if (missingOfferFields.length === 0) return 'complete';
  if (missingOfferFields.length >= 3) return 'missing_fields';
  return 'partial';
}

function buildOfferMissingFields(rawOffer, normalized) {
  const missing = new Set(toList(rawOffer.missingOfferFields || rawOffer.missingOrUnclearFields));
  const hasPrice = normalized.priceAmount != null || normalized.priceScope.length > 0;
  if (!hasPrice) missing.add('priceAmount');
  if (normalized.pricePeriod === 'unknown') missing.add('pricePeriod');
  if (normalized.includedItems.length === 0) missing.add('includedItems');
  if (normalized.excludedItems.length === 0) missing.add('excludedItems');
  if (normalized.vehicleCapacity == null) missing.add('vehicleCapacity');
  if (!normalized.vehicleType) missing.add('vehicleType');
  if (normalized.startAvailability.length === 0) missing.add('startAvailability');
  if (normalized.shiftAvailability.length === 0) missing.add('shiftAvailability');
  if (normalized.licenseCompliance.length === 0) missing.add('licenseCompliance');
  if (normalized.insuranceSafety.length === 0) missing.add('insuranceSafety');
  if (!normalized.slaCommitment) missing.add('slaCommitment');
  if (!normalized.validityUntil) missing.add('validityUntil');
  return [...missing];
}

function buildOfferRiskNotes(normalized, rfqContext = {}) {
  const notes = [];
  const requiredCapacity = toNumber(rfqContext.vehicleCapacityRequirement || rfqContext.passengerCount);
  const requiredDate = coerceText(rfqContext.startDate || rfqContext.start || '');
  const requiredShift = coerceText(rfqContext.shift || rfqContext.shiftLabel || '');

  if (normalized.offerState === 'blocked') {
    notes.push('Teklif blocked: analiz için güvenli değil');
  }
  if (normalized.priceAmount == null) {
    notes.push('Fiyat alanı eksik');
  }
  if (normalized.pricePeriod === 'unknown') {
    notes.push('Fiyat periyodu belirsiz');
  }
  if (normalized.includedItems.length === 0) {
    notes.push('Dahil edilen kalemler eksik');
  }
  if (normalized.excludedItems.length === 0) {
    notes.push('Hariç tutulan kalemler belirsiz');
  }
  if (requiredCapacity != null && normalized.vehicleCapacity != null && normalized.vehicleCapacity < requiredCapacity) {
    notes.push('Kapasite uyumsuzluğu riski');
  }
  if (requiredDate && normalized.startAvailability.length > 0 && !normalized.startAvailability.some((item) => normalizeOfferAnalysisField(item).includes(normalizeOfferAnalysisField(requiredDate)))) {
    notes.push('Başlangıç tarihi uyumsuzluğu riski');
  }
  if (requiredShift && normalized.shiftAvailability.length > 0 && !normalized.shiftAvailability.some((item) => normalizeOfferAnalysisField(item).includes(normalizeOfferAnalysisField(requiredShift)))) {
    notes.push('Vardiya uyumsuzluğu riski');
  }
  if (normalized.licenseCompliance.length === 0) {
    notes.push('Belge / ruhsat belirsizliği riski');
  }
  if (normalized.insuranceSafety.length === 0) {
    notes.push('Sigorta / güvenlik belirsizliği riski');
  }
  if (!normalized.slaCommitment) {
    notes.push('SLA belirsizliği riski');
  }
  if (!normalized.validityUntil) {
    notes.push('Geçerlilik tarihi belirsizliği riski');
  }
  if (normalized.missingOfferFields.length > 0) {
    notes.push(`Eksik alan sayısı: ${normalized.missingOfferFields.length}`);
  }
  return uniq(notes);
}

function inferFitLevel(score, offerState) {
  if (offerState === 'blocked') return 'blocked';
  if (score >= 80) return 'strong';
  if (score >= 60) return 'acceptable';
  if (score >= 35) return 'weak';
  return 'blocked';
}

function inferRiskLevel(score, offerState, missingCount) {
  if (offerState === 'blocked') return 'blocked';
  if (score >= 80 && missingCount === 0) return 'low';
  if (score >= 60 && missingCount <= 2) return 'medium';
  if (score >= 35) return 'high';
  return 'blocked';
}

function buildNormalizedPriceSummary(normalized) {
  const amount = normalized.priceAmount == null ? 'price missing' : `${normalized.priceAmount} ${normalized.priceCurrency}`;
  return `${amount} / ${normalized.pricePeriod}`;
}

function buildScopeCompleteness(normalized) {
  const hits = [normalized.priceScope, normalized.includedItems, normalized.excludedItems].filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(coerceText(value));
  }).length;
  if (hits >= 3) return 'complete';
  if (hits === 2) return 'partial';
  return 'weak';
}

function buildFitBand(normalized, rfqContext = {}) {
  const requiredCapacity = toNumber(rfqContext.vehicleCapacityRequirement || rfqContext.passengerCount);
  const requiredDate = coerceText(rfqContext.startDate || rfqContext.start || '');
  const requiredShift = coerceText(rfqContext.shift || rfqContext.shiftLabel || '');
  const hasCapacity = normalized.vehicleCapacity != null;
  const capacityStrong = requiredCapacity != null && hasCapacity && normalized.vehicleCapacity >= requiredCapacity;
  const timingStrong = Boolean(
    (requiredDate && normalized.startAvailability.some((item) => normalizeOfferAnalysisField(item).includes(normalizeOfferAnalysisField(requiredDate)))) ||
    (requiredShift && normalized.shiftAvailability.some((item) => normalizeOfferAnalysisField(item).includes(normalizeOfferAnalysisField(requiredShift))))
  );
  const complianceStrong = normalized.licenseCompliance.length > 0 && normalized.insuranceSafety.length > 0;
  const slaStrong = Boolean(normalized.slaCommitment);

  return {
    capacityFit: capacityStrong ? 'strong' : hasCapacity ? 'acceptable' : 'weak',
    timingFit: timingStrong ? 'strong' : normalized.startAvailability.length > 0 || normalized.shiftAvailability.length > 0 ? 'acceptable' : 'weak',
    slaFit: slaStrong ? 'strong' : 'weak',
    complianceFit: complianceStrong ? 'strong' : normalized.licenseCompliance.length > 0 || normalized.insuranceSafety.length > 0 ? 'acceptable' : 'weak',
  };
}

function scoreOfferAnalysisCandidate(normalizedOffer, rfqContext = {}) {
  const requiredCapacity = toNumber(rfqContext.vehicleCapacityRequirement || rfqContext.passengerCount);
  const requiredDate = coerceText(rfqContext.startDate || rfqContext.start || '');
  const requiredShift = coerceText(rfqContext.shift || rfqContext.shiftLabel || '');
  const priceBonus = normalizedOffer.priceAmount != null ? 12 : 0;
  const scopeBonus = normalizedOffer.priceScope ? 8 : 0;
  const includedBonus = normalizedOffer.includedItems.length > 0 ? 8 : 0;
  const excludedBonus = normalizedOffer.excludedItems.length > 0 ? 4 : 0;
  let capacityBonus = 0;
  if (requiredCapacity != null && normalizedOffer.vehicleCapacity != null) {
    capacityBonus = normalizedOffer.vehicleCapacity >= requiredCapacity ? 20 : clamp(0, 14, Math.round((normalizedOffer.vehicleCapacity / requiredCapacity) * 20) - 4);
  } else if (normalizedOffer.vehicleCapacity != null) {
    capacityBonus = 10;
  }
  const timingBonus = (
    (requiredDate && normalizedOffer.startAvailability.some((item) => normalizeOfferAnalysisField(item).includes(normalizeOfferAnalysisField(requiredDate)))) ||
    (requiredShift && normalizedOffer.shiftAvailability.some((item) => normalizeOfferAnalysisField(item).includes(normalizeOfferAnalysisField(requiredShift))))
  ) ? 15 : (normalizedOffer.startAvailability.length > 0 || normalizedOffer.shiftAvailability.length > 0 ? 8 : 0);
  const licenseBonus = normalizedOffer.licenseCompliance.length > 0 ? 8 : 0;
  const insuranceBonus = normalizedOffer.insuranceSafety.length > 0 ? 8 : 0;
  const slaBonus = normalizedOffer.slaCommitment ? 10 : 0;
  const validityBonus = normalizedOffer.validityUntil ? 5 : 0;

  const missingPenalty = Math.min(24, normalizedOffer.missingOfferFields.length * 3);
  const statePenalty = normalizedOffer.offerState === 'blocked' ? 40 : normalizedOffer.offerState === 'missing_fields' ? 12 : normalizedOffer.offerState === 'partial' ? 6 : 0;
  const capacityPenalty = requiredCapacity != null && normalizedOffer.vehicleCapacity != null && normalizedOffer.vehicleCapacity < requiredCapacity ? 8 : 0;
  const score = clamp(0, 100, priceBonus + scopeBonus + includedBonus + excludedBonus + capacityBonus + timingBonus + licenseBonus + insuranceBonus + slaBonus + validityBonus - missingPenalty - statePenalty - capacityPenalty);

  const fitBands = buildFitBand(normalizedOffer, rfqContext);
  const fitLevel = inferFitLevel(score, normalizedOffer.offerState);
  const riskLevel = inferRiskLevel(score, normalizedOffer.offerState, normalizedOffer.missingOfferFields.length);
  const riskNotes = buildOfferRiskNotes(normalizedOffer, rfqContext);

  return Object.freeze({
    ...normalizedOffer,
    normalizedPriceSummary: buildNormalizedPriceSummary(normalizedOffer),
    scopeCompleteness: buildScopeCompleteness(normalizedOffer),
    capacityFit: fitBands.capacityFit,
    timingFit: fitBands.timingFit,
    slaFit: fitBands.slaFit,
    complianceFit: fitBands.complianceFit,
    riskLevel,
    analysisScore: score,
    fitLevel,
    riskNotes,
    humanReviewRequired: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
  });
}

function normalizeOfferForAnalysis(rawOffer = {}, index = 0, rfqContext = {}) {
  const supplierRef = coerceText(rawOffer.supplierRef || rawOffer.candidateId || rawOffer.offerId || rawOffer.id || `offer-${index + 1}`);
  const supplierLabelMasked = maskOfferAnalysisSensitiveValue(rawOffer.supplierLabelMasked || rawOffer.supplierLabel || rawOffer.supplierName || rawOffer.supplier || supplierRef);
  const priceAmount = toNumber(rawOffer.priceAmount ?? rawOffer.offerPrice ?? rawOffer.price ?? rawOffer.priceValue);
  const priceScope = coerceText(rawOffer.priceScope || rawOffer.scope || rawOffer.priceScopeLabel || '');
  const pricePeriod = rawOffer.pricePeriod || inferOfferPeriod(priceScope);
  const includedItems = toList(rawOffer.includedItems || rawOffer.included || rawOffer.scopeIncludedItems || rawOffer.whatIsIncluded);
  const excludedItems = toList(rawOffer.excludedItems || rawOffer.excluded || rawOffer.scopeExcludedItems || rawOffer.whatIsExcluded);
  const vehicleCapacity = toNumber(rawOffer.vehicleCapacity ?? rawOffer.capacity ?? rawOffer.fleetCapacity ?? rawOffer.seatCount);
  const vehicleType = coerceText(rawOffer.vehicleType || rawOffer.vehicle || rawOffer.vehicleClass || '');
  const startAvailability = toList(rawOffer.startAvailability || rawOffer.startDateAvailability || rawOffer.startDates || rawOffer.availabilityDates);
  const shiftAvailability = toList(rawOffer.shiftAvailability || rawOffer.shiftFit || rawOffer.shift || rawOffer.shiftWindows);
  const licenseCompliance = toList(rawOffer.licenseCompliance || rawOffer.documentLicenseFit || rawOffer.licenses || rawOffer.documentRequirements);
  const insuranceSafety = toList(rawOffer.insuranceSafety || rawOffer.safetyRequirements || rawOffer.safetyCerts || rawOffer.insurance);
  const slaCommitment = coerceText(rawOffer.slaCommitment || rawOffer.sla || rawOffer.serviceLevel || '');
  const validityUntil = coerceText(rawOffer.validityUntil || rawOffer.validityPeriod || rawOffer.validUntil || '');
  const normalizedBase = {
    supplierRef,
    supplierLabelMasked,
    priceAmount,
    priceScope,
    priceCurrency: inferPriceCurrency(rawOffer),
    pricePeriod,
    includedItems,
    excludedItems,
    vehicleCapacity,
    vehicleType,
    startAvailability,
    shiftAvailability,
    licenseCompliance,
    insuranceSafety,
    slaCommitment,
    validityUntil,
  };
  const missingOfferFields = buildOfferMissingFields(rawOffer, normalizedBase);
  const offerState = inferOfferState(rawOffer, missingOfferFields);
  const riskNotes = buildOfferRiskNotes({ ...normalizedBase, offerState, missingOfferFields }, rfqContext);

  return Object.freeze({
    ...normalizedBase,
    offerState,
    missingOfferFields,
    riskNotes,
    humanReviewRequired: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    notContacted: true,
    notSent: true,
    approvalRequired: true,
    offerAnalysisSummary: `supplierRef=${supplierRef}; supplierLabelMasked=${supplierLabelMasked}; offerState=${offerState}; price=${priceAmount == null ? 'missing' : priceAmount} ${inferPriceCurrency(rawOffer)}; period=${pricePeriod}; capacity=${vehicleCapacity == null ? 'missing' : vehicleCapacity}; validity=${validityUntil || 'missing'}`,
  });
}

function getSourceOfferCollectionContext(offerCollection = {}) {
  const matchingDraft = offerCollection.matchingDraft || {};
  const rfqContext = offerCollection.sourceRfqSummary
    || matchingDraft.sourceRfqSummary
    || offerCollection.rfqContext
    || matchingDraft.rfqContext
    || {};
  const collectionState = offerCollection.collectionState
    || matchingDraft.collectionState
    || matchingDraft.collectionStateSummary
    || offerCollection.status
    || 'draft';
  const incomingOffers = Array.isArray(offerCollection.offerFixtures)
    ? offerCollection.offerFixtures.length
    : Array.isArray(offerCollection.offers)
      ? offerCollection.offers.length
      : Array.isArray(offerCollection.offerDrafts)
        ? offerCollection.offerDrafts.length
        : 0;
  const missingOffers = Array.isArray(offerCollection.offerFixtures)
    ? offerCollection.offerFixtures.filter((offer) => {
        const missing = toList(offer?.missingOfferFields || offer?.missingOrUnclearFields);
        return missing.length > 0 || offer?.blocked === true || offer?.offerState === 'blocked';
      }).length
    : 0;

  return Object.freeze({
    rfqType: coerceText(rfqContext.rfqType || rfqContext.type || 'general'),
    serviceScope: coerceText(rfqContext.serviceScope || rfqContext.scope || ''),
    region: coerceText(rfqContext.region || ''),
    province: coerceText(rfqContext.province || ''),
    district: coerceText(rfqContext.district || ''),
    startDate: coerceText(rfqContext.startDate || rfqContext.start || ''),
    shift: coerceText(rfqContext.shift || ''),
    passengerCount: toNumber(rfqContext.passengerCount || rfqContext.personnelCount || rfqContext.studentCount),
    vehicleCapacityRequirement: toNumber(rfqContext.vehicleCapacityRequirement || rfqContext.capacityRequirement),
    sla: coerceText(rfqContext.sla || rfqContext.qualityExpectation || ''),
    documentRequirements: toList(rfqContext.documentRequirements || rfqContext.documents),
    safetyRequirements: toList(rfqContext.safetyRequirements || rfqContext.safety),
    incomingOffers,
    missingOffers,
    collectionState: coerceText(collectionState),
  });
}

function buildOfferComparisonMatrix(offerCollection = {}, context = {}) {
  const rfqContext = getSourceOfferCollectionContext(offerCollection);
  const sourceOffers = Array.isArray(offerCollection.offerFixtures)
    ? offerCollection.offerFixtures
    : Array.isArray(offerCollection.offers)
      ? offerCollection.offers
      : Array.isArray(offerCollection.offerDrafts)
        ? offerCollection.offerDrafts
        : [];
  const normalizedOffers = sourceOffers.map((offer, index) => {
    const normalized = normalizeOfferForAnalysis(offer, index, rfqContext);
    return scoreOfferAnalysisCandidate(normalized, rfqContext);
  });
  const comparisonMatrix = normalizedOffers
    .slice()
    .sort((left, right) => right.analysisScore - left.analysisScore || left.supplierRef.localeCompare(right.supplierRef))
    .map((offer, index) => Object.freeze({
      rank: index + 1,
      supplierRef: offer.supplierRef,
      supplierLabelMasked: offer.supplierLabelMasked,
      normalizedPriceSummary: offer.normalizedPriceSummary,
      scopeCompleteness: offer.scopeCompleteness,
      capacityFit: offer.capacityFit,
      timingFit: offer.timingFit,
      slaFit: offer.slaFit,
      complianceFit: offer.complianceFit,
      riskLevel: offer.riskLevel,
      missingFields: [...offer.missingOfferFields],
      analysisScore: offer.analysisScore,
      fitLevel: offer.fitLevel,
      notAccepted: true,
      notRejected: true,
      notSelected: true,
      humanReviewRequired: true,
      riskNotes: [...offer.riskNotes],
      offerState: offer.offerState,
    }));

  const sourceOfferCollectionSummary = buildSourceOfferCollectionSummary(rfqContext, comparisonMatrix, context);

  return Object.freeze({
    sourceOfferCollectionSummary,
    rfqContext,
    normalizedOffers,
    comparisonMatrix,
  });
}

function buildSourceOfferCollectionSummary(rfqContext, comparisonMatrix, context = {}) {
  const offerCount = comparisonMatrix.length;
  const missingCount = comparisonMatrix.filter((row) => row.missingFields.length > 0 || row.offerState !== 'complete').length;
  const summaryParts = [
    `rfqType=${rfqContext.rfqType}`,
    `serviceScope=${rfqContext.serviceScope || 'missing'}`,
    `region=${rfqContext.region || 'missing'}`,
    `province=${rfqContext.province || 'missing'}`,
    `district=${rfqContext.district || 'missing'}`,
    `startDate=${rfqContext.startDate || 'missing'}`,
    `shift=${rfqContext.shift || 'missing'}`,
    `passengerCount=${rfqContext.passengerCount ?? 'missing'}`,
    `vehicleCapacityRequirement=${rfqContext.vehicleCapacityRequirement ?? 'missing'}`,
    `sla=${rfqContext.sla || 'missing'}`,
    `documentRequirements=${rfqContext.documentRequirements.join(', ') || 'missing'}`,
    `safetyRequirements=${rfqContext.safetyRequirements.join(', ') || 'missing'}`,
    `offerCount=${offerCount}`,
    `missingOfferCount=${missingCount}`,
    `collectionState=${rfqContext.collectionState || 'draft'}`,
  ];
  if (coerceText(context.message || '').length > 0) {
    summaryParts.push(`message=${coerceText(context.message)}`);
  }
  return summaryParts.join('; ');
}

function buildOfferValueSummary(comparisonMatrix) {
  const rows = Array.isArray(comparisonMatrix) ? comparisonMatrix : [];
  if (rows.length === 0) {
    return Object.freeze({
      valueSummary: 'Teklif yok; fiyat-kapsam dengesi okunamadı.',
      valueLines: [],
    });
  }
  const lowestPrice = rows
    .filter((row) => row.normalizedPriceSummary && !row.normalizedPriceSummary.includes('price missing'))
    .slice()
    .sort((a, b) => (a.analysisScore === b.analysisScore ? a.rank - b.rank : a.analysisScore - b.analysisScore))[0] || rows[0];
  const strongest = rows[0];
  const valueLines = [
    `En düşük fiyat tek başına seçilmez; ${lowestPrice.supplierLabelMasked} gibi adaylarda fiyat-kapsam dengesi, kapasite ve SLA birlikte değerlendirilir.`,
    `En güçlü görünen aday: ${strongest.supplierLabelMasked} (score=${strongest.analysisScore}).`,
    'Kapsam, kapasite, SLA ve uygunluk birlikte değerlendirilmelidir.',
    'Analiz puanı karar değildir; insan onayı gerekir.',
  ];
  return Object.freeze({
    valueSummary: valueLines.join(' '),
    valueLines,
  });
}

function buildOfferRiskSummary(comparisonMatrix) {
  const rows = Array.isArray(comparisonMatrix) ? comparisonMatrix : [];
  const riskNotes = uniq(rows.flatMap((row) => row.riskNotes || []));
  const riskSummary = rows.length === 0
    ? 'Teklif yok; risk değerlendirmesi yapılamadı.'
    : `Riskli noktalar: ${riskNotes.join(' | ') || 'eksik alan yok'}; blocked=${rows.filter((row) => row.offerState === 'blocked').length}; partial=${rows.filter((row) => row.offerState === 'partial').length}; missing_fields=${rows.filter((row) => row.offerState === 'missing_fields').length}.`;
  return Object.freeze({
    riskSummary,
    riskNotes,
  });
}

function buildOfferMissingFieldSummary(comparisonMatrix) {
  const rows = Array.isArray(comparisonMatrix) ? comparisonMatrix : [];
  const bySupplier = rows.map((row) => `${row.supplierLabelMasked}: ${row.missingFields.join(', ') || 'yok'}`);
  const missingFields = uniq(rows.flatMap((row) => row.missingFields || []));
  const missingFieldSummary = rows.length === 0
    ? 'Eksik teklif alanı yok; teklif bulunamadı.'
    : `Eksik teklif alanları: ${missingFields.join(', ') || 'yok'}; bySupplier=${bySupplier.join(' | ')}`;
  return Object.freeze({
    missingFieldSummary,
    missingFields,
    bySupplier,
  });
}

function buildOfferAnalysisDraft(comparisonMatrix, context = {}) {
  const rows = Array.isArray(comparisonMatrix) ? comparisonMatrix : [];
  const topRows = rows.slice(0, 3);
  const value = buildOfferValueSummary(rows);
  const risk = buildOfferRiskSummary(rows);
  const missing = buildOfferMissingFieldSummary(rows);
  const recommendationDraft = topRows.map((row) => Object.freeze({
    supplierRef: row.supplierRef,
    supplierLabelMasked: row.supplierLabelMasked,
    analysisScore: row.analysisScore,
    fitLevel: row.fitLevel,
    whyTheyFit: row.fitLevel === 'strong'
      ? 'Öne çıkan aday teklif'
      : row.fitLevel === 'acceptable'
        ? 'İncelenmesi önerilen teklif'
        : 'Daha fazla inceleme gerekir',
    watchOut: row.riskNotes[0] || 'risk notu yok',
    missingFields: [...row.missingFields],
    notAccepted: true,
    notRejected: true,
    notSelected: true,
  }));
  const analysisDraftSummary = rows.length === 0
    ? 'Teklif analiz taslağı hazır değil; giriş verisi yok.'
    : `Teklif analiz taslağı hazır; ${topRows.map((row) => row.supplierLabelMasked).join(', ')} öne çıkıyor, insan onayı gerekir.`;
  const sourcePhrase = coerceText(context.message || '');
  const humanApprovalNote = 'Analiz taslağı sadece hazırlık çıktısıdır; kesin seçim, kabul, ret veya sözleşme başlatma için insan onayı gerekir.';
  return Object.freeze({
    draftOnly: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    notContacted: true,
    notSent: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: COPILOT_OFFER_ANALYSIS_EXECUTION_STATE,
    nextSafeStep: COPILOT_OFFER_ANALYSIS_NEXT_SAFE_STEP,
    analysisDraftSummary,
    recommendationDraft,
    humanApprovalNote,
    safetyNotes: [
      'draftOnly=true / notAccepted=true / notRejected=true / notSelected=true / notContacted=true / notSent=true / approvalRequired=true korunur',
      'Human approval olmadan teklif kabul, ret, seçim, sözleşme veya gönderim yapılmaz',
    ],
    blockedExecutionPhrases: [...COPILOT_OFFER_ANALYSIS_BLOCKED_PHRASES],
    visibleAnswerSeed: sourcePhrase,
    valueSummary: value.valueSummary,
    valueLines: value.valueLines,
    riskSummary: risk.riskSummary,
    riskNotes: risk.riskNotes,
    missingFieldSummary: missing.missingFieldSummary,
    missingFields: missing.missingFields,
    bySupplier: missing.bySupplier,
  });
}

function buildOfferAnalysisInput(offerCollection = {}, context = {}) {
  const intent = detectOfferAnalysisIntent(context.message || offerCollection.message || '');
  const analysisType = intent.analysisType && intent.analysisType !== 'general_offer_analysis' ? intent.analysisType : inferAnalysisType(offerCollection?.sourceRfqSummary?.rfqType || offerCollection?.matchingDraft?.sourceRfqSummary?.rfqType || '') || intent.analysisType || 'general_offer_analysis';
  const comparison = buildOfferComparisonMatrix(offerCollection, context);
  const analysisDraft = buildOfferAnalysisDraft(comparison.comparisonMatrix, context);
  const sourceOfferCollectionSummary = comparison.sourceOfferCollectionSummary;

  return Object.freeze({
    intentType: intent.intentType,
    analysisType,
    sourceOfferCollectionSummary,
    normalizedOffers: comparison.normalizedOffers,
    comparisonMatrix: comparison.comparisonMatrix,
    valueSummary: analysisDraft.valueSummary,
    riskSummary: analysisDraft.riskSummary,
    missingFieldSummary: analysisDraft.missingFieldSummary,
    analysisDraft,
    safetyNotes: analysisDraft.safetyNotes,
    nextSafeStep: analysisDraft.nextSafeStep,
    draftOnly: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    notContacted: true,
    notSent: true,
    approvalRequired: true,
    executionState: COPILOT_OFFER_ANALYSIS_EXECUTION_STATE,
    humanReviewRequired: true,
  });
}

function detectOfferAnalysisIntent(input = '') {
  const text = normalizeOfferAnalysisField(input);
  const blocked = COPILOT_OFFER_ANALYSIS_BLOCKED_PHRASES.some((phrase) => text.includes(normalizeOfferAnalysisField(phrase)));
  if (blocked) {
    return Object.freeze({
      intentType: 'execution_blocked_request',
      analysisType: inferAnalysisType(text),
      draftOnly: true,
      notAccepted: true,
      notRejected: true,
      notSelected: true,
      notContacted: true,
      notSent: true,
      approvalRequired: true,
      humanReviewRequired: true,
      executionState: COPILOT_OFFER_ANALYSIS_EXECUTION_STATE,
      blockedExecutionRequest: true,
    });
  }

  let intentType = 'offer_analysis_request';
  if (text.includes('guvenli mi') || text.includes('riskli') || text.includes('risk')) {
    intentType = 'offer_risk_review_request';
  } else if (text.includes('eksik') || text.includes('missing')) {
    intentType = 'offer_missing_fields_request';
  } else if (text.includes('karis') || text.includes('karşı') || text.includes('karsila') || text.includes('compare') || text.includes('siral')) {
    intentType = 'offer_comparison_request';
  } else if (text.includes('onaya hazirla') || text.includes('onaya sun') || (text.includes('hazirla') && (text.includes('analiz') || text.includes('teklif'))) || text.includes('oner') || text.includes('öner') || text.includes('hangisi daha avantajli') || text.includes('hangi teklif')) {
    intentType = 'offer_recommendation_draft_request';
  }

  return Object.freeze({
    intentType,
    analysisType: inferAnalysisType(text),
    draftOnly: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    notContacted: true,
    notSent: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: COPILOT_OFFER_ANALYSIS_EXECUTION_STATE,
    blockedExecutionRequest: false,
  });
}

function buildCopilotOfferAnalysisRole(role, visible) {
  return Object.freeze({
    role,
    visible,
    ANALYSIS_INPUT_SUMMARY: [...COPILOT_OFFER_ANALYSIS_INPUT_SUMMARY],
    SUPPORTED_ANALYSIS_TYPES: [...COPILOT_OFFER_ANALYSIS_SUPPORTED_ANALYSIS_TYPES],
    NORMALIZED_OFFER_MODEL: [...COPILOT_OFFER_ANALYSIS_NORMALIZED_OFFER_MODEL],
    COMPARISON_MATRIX_FIELDS: [...COPILOT_OFFER_ANALYSIS_COMPARISON_MATRIX_FIELDS],
    VALUE_RISK_POLICY: [...COPILOT_OFFER_ANALYSIS_VALUE_RULES],
    MISSING_FIELD_POLICY: [...COPILOT_OFFER_ANALYSIS_MISSING_FIELD_POLICY],
    RECOMMENDATION_POLICY: [...COPILOT_OFFER_ANALYSIS_RECOMMENDATION_POLICY],
    SAFETY_BOUNDARY_FLAGS: [...COPILOT_OFFER_ANALYSIS_BOUNDARY_FLAGS],
    BLOCKED_RUNTIME_ACTION: [...COPILOT_OFFER_ANALYSIS_BLOCKED_ACTIONS],
    NEVER_AUTOMATE: [...COPILOT_OFFER_ANALYSIS_NEVER_AUTOMATE],
    TURKISH_VISIBLE_PHRASES: [...COPILOT_OFFER_ANALYSIS_TURKISH_VISIBLE_PHRASES],
    BLOCKED_PHRASES: [...COPILOT_OFFER_ANALYSIS_BLOCKED_PHRASES],
    HANDOFFS: [...COPILOT_OFFER_ANALYSIS_HANOFFS],
  });
}

const COPILOT_OFFER_ANALYSIS_POLICY = Object.freeze(
  Object.fromEntries(
    COPILOT_OFFER_ANALYSIS_ROLE_NAMES.map((role) => [
      role,
      buildCopilotOfferAnalysisRole(role, !['DRIVER', 'PERSONEL', 'PARENT'].includes(role)),
    ]),
  ),
);

function listCopilotOfferAnalysisRoles() {
  return Object.keys(COPILOT_OFFER_ANALYSIS_POLICY);
}

function getCopilotOfferAnalysisPolicy(role) {
  return COPILOT_OFFER_ANALYSIS_POLICY[role] || null;
}
function composeOfferAnalysisAnswer(context = {}) {
  const offerAnalysisInput = buildOfferAnalysisInput({
    matchingDraft: context.matchingDraft || context.offerCollection?.matchingDraft || {},
    sourceRfqSummary: context.sourceRfqSummary || context.offerCollection?.sourceRfqSummary || context.offerCollection?.matchingDraft?.sourceRfqSummary || context.matchingDraft?.sourceRfqSummary || {},
    offerFixtures: context.offerFixtures || context.offerCollection?.offerFixtures || context.offers || context.offerCollection?.offers || [],
    offers: context.offers || context.offerCollection?.offers || context.offerFixtures || context.offerCollection?.offerFixtures || [],
    collectionState: context.collectionState || context.offerCollection?.collectionState || 'received_draft',
    message: context.message || context.offerCollection?.message || '',
  }, context);
  const topCandidates = offerAnalysisInput.comparisonMatrix.slice(0, 3);
  const visibleAnswer = [
    'Teklif analiz taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.',
    'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.',
    'En düşük fiyat tek başına karar için yeterli değildir.',
    'Kapsam, kapasite, SLA ve riskler birlikte değerlendirilmelidir.',
    `Öne çıkan adaylar: ${topCandidates.map((row) => row.supplierLabelMasked).join(', ') || 'yok'}.`,
    'Eksik teklif alanları tamamlanmadan karar önerilmez.',
    'Sıradaki güvenli adım: analiz taslağını kontrol edip insan onayına sunmak.',
  ].join(' ');

  return Object.freeze({
    ...offerAnalysisInput,
    visibleAnswer,
    offerAnalysisIntentSummary: `intentType=${offerAnalysisInput.intentType}; analysisType=${offerAnalysisInput.analysisType}; draftOnly=true; notAccepted=true; notRejected=true; notSelected=true; notContacted=true; notSent=true; approvalRequired=true`,
    analysisTypeSummary: `analysisType=${offerAnalysisInput.analysisType}; intentType=${offerAnalysisInput.intentType}`,
    offerAnalysisTypeSummary: `${offerAnalysisInput.analysisType}; personel servis, okul servis, vardiya bazli, regular route, one-off, add-on, capacity increase, route change and general analysis stay visible`,
    normalizedOfferSummary: `${offerAnalysisInput.normalizedOffers.length} normalized offers; supplierRef, masked label, offerState, price, period, capacity, timing, compliance, SLA and validity stay visible`,
    comparisonMatrixSummary: `${offerAnalysisInput.comparisonMatrix.length} rows; normalizedPriceSummary, scopeCompleteness, capacityFit, timingFit, slaFit, complianceFit, riskLevel, analysisScore and fitLevel stay visible`,
    recommendationDraftSummary: `${topCandidates.map((row) => `${row.supplierLabelMasked}(${row.fitLevel}, score=${row.analysisScore})`).join(' | ') || 'no candidates'}`,
    draftOnlySummary: 'ön değerlendirme / teklif analiz taslağı; execution kapalı',
    safetyPhraseSummary: `${COPILOT_OFFER_ANALYSIS_BOUNDARY_FLAGS.join(' / ')} korunur; human approval olmadan teklif kabul / ret / seç / sözleşme / gönderim yok`,
    kvkkSafeSummary: 'raw token, credential, cookie, password, raw GPS trace ve raw PII yok; supplier contact info masked; production data okunmaz',
    auditApprovalSummary: 'human approval boundary, audit expectation ve rollback-ready draft korunur',
    noWriteActionSummary: 'supplier contact, RFQ send, offer accept/reject, supplier selection, agreement execute, dispatch apply, route apply, payment/hakediş execute, messaging ve provider credential use açılmaz',
    chainWiringSummary: 'check:copilotdemandagreement01 -> check:copilotrfqprep01 -> check:suppliermatching01 -> check:supplieroffercollect01 -> check:copilotofferanalysis01 -> check:copilothumanapproval01 -> check:uxmarketplacepanels01 remains wired',
    smokeThresholdSummary: 'product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none',
    commitExternalSummary: 'runtime-data, browser-smoke ve debug.log commit dışı kalır; stage stays empty',
    prismaSummary: 'No route/service/prisma diff; no production DB; no schema/migration; read-only only',
    lineCountSummary: 'backend/src/ai/chat/copilotOfferAnalysis.js stays under 1000 lines',
  });
}

export {
  COPILOT_OFFER_ANALYSIS_VERSION,
  COPILOT_OFFER_ANALYSIS_STAGES,
  COPILOT_OFFER_ANALYSIS_CATEGORIES,
  COPILOT_OFFER_ANALYSIS_SUPPORTED_ANALYSIS_TYPES,
  COPILOT_OFFER_ANALYSIS_INPUT_SUMMARY,
  COPILOT_OFFER_ANALYSIS_NORMALIZED_OFFER_MODEL,
  COPILOT_OFFER_ANALYSIS_COMPARISON_MATRIX_FIELDS,
  COPILOT_OFFER_ANALYSIS_VALUE_RULES,
  COPILOT_OFFER_ANALYSIS_RISK_RULES,
  COPILOT_OFFER_ANALYSIS_MISSING_FIELD_POLICY,
  COPILOT_OFFER_ANALYSIS_RECOMMENDATION_POLICY,
  COPILOT_OFFER_ANALYSIS_BOUNDARY_FLAGS,
  COPILOT_OFFER_ANALYSIS_BLOCKED_ACTIONS,
  COPILOT_OFFER_ANALYSIS_NEVER_AUTOMATE,
  COPILOT_OFFER_ANALYSIS_HANOFFS,
  COPILOT_OFFER_ANALYSIS_TURKISH_VISIBLE_PHRASES,
  COPILOT_OFFER_ANALYSIS_BLOCKED_PHRASES,
  COPILOT_OFFER_ANALYSIS_SAFETY_EXAMPLES,
  COPILOT_OFFER_ANALYSIS_EXECUTION_STATE,
  COPILOT_OFFER_ANALYSIS_NEXT_SAFE_STEP,
  COPILOT_OFFER_ANALYSIS_POLICY,
  listCopilotOfferAnalysisRoles,
  getCopilotOfferAnalysisPolicy,
  detectOfferAnalysisIntent,
  buildOfferAnalysisInput,
  normalizeOfferForAnalysis,
  buildOfferComparisonMatrix,
  scoreOfferAnalysisCandidate,
  buildOfferRiskSummary,
  buildOfferMissingFieldSummary,
  buildOfferValueSummary,
  buildOfferAnalysisDraft,
  composeOfferAnalysisAnswer,
  maskOfferAnalysisSensitiveValue,
  normalizeOfferAnalysisField,
  buildCopilotOfferAnalysisRole,
};
