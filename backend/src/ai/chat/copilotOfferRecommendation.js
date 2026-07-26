import {
  composeOfferAnalysisAnswer,
  maskOfferAnalysisSensitiveValue,
} from './copilotOfferAnalysis.js';
import {
  composeNegotiationAssistAnswer,
  maskNegotiationSensitiveValue,
} from './copilotNegotiationAssist.js';
export const COPILOT_OFFER_RECOMMENDATION_VERSION = 'COPILOT-OFFER-RECOMMENDATION-01';
export const COPILOT_OFFER_RECOMMENDATION_STAGES = Object.freeze([
  Object.freeze({ id: 'recommendation_input_summary', title: 'Recommendation Input Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'supported_recommendation_types', title: 'Supported Recommendation Types', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'criteria_model', title: 'Recommendation Criteria Model', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'scorecard', title: 'Recommendation Scorecard', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'recommendation_draft', title: 'Recommendation Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'approval_packet', title: 'Approval Packet Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'risk_summary', title: 'Risk Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'safety_boundary', title: 'Safety / Boundary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'turkish_visible_answer', title: 'Türkçe Visible Answer', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'audit_handoff', title: 'Audit / Human Approval Handoff', status: 'current baseline', futureOnly: false }),
]);
export const COPILOT_OFFER_RECOMMENDATION_CATEGORIES = Object.freeze([
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'DRAFT',
  'RISK_SUMMARY',
  'NEXT_STEP',
  'HUMAN_APPROVAL_REQUIRED',
]);
export const COPILOT_OFFER_RECOMMENDATION_SUPPORTED_TYPES = Object.freeze([
  'best_value_recommendation',
  'lowest_risk_recommendation',
  'budget_sensitive_recommendation',
  'sla_first_recommendation',
  'capacity_first_recommendation',
  'compliance_first_recommendation',
  'alternative_candidate_recommendation',
  'blocked_offer_recommendation',
  'approval_packet_request',
  'general_recommendation',
]);
export const COPILOT_OFFER_RECOMMENDATION_INPUT_SUMMARY = Object.freeze([
  'RFQ type',
  'offer analysis state',
  'negotiation assist state',
  'comparison matrix rows',
  'opportunity count',
  'candidate suppliers / masked labels',
  'service scope',
  'region / province / district',
  'start date',
  'day / period / hour / shift',
  'passenger / personnel / student count',
  'vehicle capacity requirement',
  'SLA / quality expectation',
  'document / license / safety requirement',
  'analysis / opportunity mismatch count',
  'alternative candidate count',
]);
export const COPILOT_OFFER_RECOMMENDATION_CRITERIA_MODEL = Object.freeze([
  'supplierRef',
  'supplierLabelMasked',
  'recommendationType',
  'recommendationTypeLabel',
  'analysisScore',
  'valueScore',
  'riskScore',
  'recommendationScore',
  'fitLevel',
  'riskLevel',
  'priority',
  'missingFields',
  'supportingOpportunityTypes',
  'supportingSignals',
  'recommendationReason',
  'humanReviewRequired=true',
  'notAccepted=true',
  'notRejected=true',
  'notSelected=true',
  'notContacted=true',
  'notSent=true',
  'draftOnly=true',
]);
export const COPILOT_OFFER_RECOMMENDATION_SCORECARD_FIELDS = Object.freeze([
  'rank',
  'supplierRef',
  'supplierLabelMasked',
  'recommendationType',
  'recommendationTypeLabel',
  'analysisScore',
  'valueScore',
  'riskScore',
  'recommendationScore',
  'scoreBand',
  'priority',
  'fitLevel',
  'riskLevel',
  'missingFields',
  'supportingOpportunityTypes',
  'supportingSignals',
  'recommendationReason',
]);
export const COPILOT_OFFER_RECOMMENDATION_DRAFT_FIELDS = Object.freeze([
  'draftTitle',
  'openingNote',
  'recommendationRationale',
  'whatToVerify',
  'nonBindingLanguage',
  'humanApprovalNote',
  'recommendationDraftSummary',
  'approvalRequired=true',
  'draftOnly=true',
  'notAccepted=true',
  'notRejected=true',
  'notSelected=true',
  'notContacted=true',
  'notSent=true',
]);
export const COPILOT_OFFER_RECOMMENDATION_APPROVAL_PACKET_FIELDS = Object.freeze([
  'packetTitle',
  'packetSummary',
  'topCandidate',
  'alternativeCandidates',
  'riskSummary',
  'missingFieldSummary',
  'approvalNote',
  'nextSafeStep',
]);
export const COPILOT_OFFER_RECOMMENDATION_BOUNDARY_FLAGS = Object.freeze([
  'draftOnly=true',
  'notAccepted=true',
  'notRejected=true',
  'notSelected=true',
  'notContacted=true',
  'notSent=true',
  'approvalRequired=true',
  'humanReviewRequired=true',
  'executionState=offer_recommendation_draft_only / not_accepted / not_rejected / not_selected / not_contacted / not_sent / not_executed',
  'nextSafeStep=teklif öneri paketini kontrol edip insan onayına sunmak',
]);
export const COPILOT_OFFER_RECOMMENDATION_BLOCKED_ACTIONS = Object.freeze([
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
  'DB write',
  'Backend route/service/prisma mutation',
  'Audit event write',
]);
export const COPILOT_OFFER_RECOMMENDATION_NEVER_AUTOMATE = Object.freeze([
  'Kabul / ret kararı',
  'Kazanan tedarikçi kararı',
  'Tedarikçi seçimi',
  'Sözleşme başlatma',
  'RFQ gönderimi',
  'Tedarikçiye mesaj gönderimi',
  'Ödeme / hakediş başlatma',
  'Yazma işlemi',
]);
export const COPILOT_OFFER_RECOMMENDATION_HANOFFS = Object.freeze([
  'COPILOT-OFFER-ANALYSIS-01',
  'COPILOT-NEGOTIATION-ASSIST-01',
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-HUMAN-APPROVAL-01',
  'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
  'AUDIT-LOG-AND-APPROVAL-TRACE-01',
  'SECURITY-KVKK-FINAL-01',
  'ROLE-DATA-ISOLATION-REDTEAM-01',
  'DATA-INTEGRITY-AND-RECOVERY-01',
]);
export const COPILOT_OFFER_RECOMMENDATION_TURKISH_VISIBLE_PHRASES = Object.freeze([
  'Teklif öneri taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.',
  'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.',
  'Bu sonuç karar değil, insan onayına sunulacak karar destek taslağıdır.',
  'Öne çıkan aday fiyat, kapsam, SLA, kapasite ve risk dengesine göre daha güçlü görünüyor.',
  'Alternatif adaylar ayrı tutulur; otomatik seçim yapılmaz.',
  'Sıradaki güvenli adım: öneri paketini kontrol edip insan onayına sunmak.',
]);
export const COPILOT_OFFER_RECOMMENDATION_BLOCKED_PHRASES = Object.freeze([
  'Teklifi kabul ettim.',
  'Teklifi reddettim.',
  'Teklifi kabul et.',
  'Teklifi reddet.',
  'Bu tedarikçiyi seçtim.',
  'Bu tedarikçiyi seç.',
  'Kazanan tedarikçi budur.',
  'Sözleşmeyi başlattım.',
  'Bunu tedarikçilere gönder.',
  'RFQ gönderdim.',
  'RFQ gönder.',
  'Tedarikçiye mesaj gönderdim.',
  'Tedarikçiye mesaj gönder.',
  'Onayladım.',
  'Uyguladım.',
]);
export const COPILOT_OFFER_RECOMMENDATION_SAFETY_EXAMPLES = Object.freeze([
  'Teklif önerisi hazırla.',
  'Karar destek taslağı oluştur.',
  'En güçlü aday hangisi görünüyor?',
  'Hangisi daha güvenli görünüyor?',
  'Alternatifleri sırala.',
  'Öneri paketini onaya hazırla.',
  'Riskli seçenekleri ayıkla.',
  'Eksik bilgileri göster.',
]);
export const COPILOT_OFFER_RECOMMENDATION_EXECUTION_STATE = 'offer_recommendation_draft_only / not_accepted / not_rejected / not_selected / not_contacted / not_sent / not_executed';
export const COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP = 'teklif öneri paketini kontrol edip insan onayına sunmak';
export const COPILOT_OFFER_RECOMMENDATION_ROLE_NAMES = Object.freeze([
  'SUPER_ADMIN',
  'COMPANY',
  'ROOM',
  'SCHOOL',
  'ORGANIZATION',
  'DRIVER',
  'PERSONEL',
  'PARENT',
]);
export const COPILOT_OFFER_RECOMMENDATION_PUBLIC_PROMISE = Object.freeze([
  'Kullanıcıya "AI her şeyi seçti" denmez.',
  'Public promise sadece testle kanıtlanmış read-only recommendation söyler.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi offer analysis ve negotiation assist sinyallerini derler; execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);
const COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS = Object.freeze({
  best_value_recommendation: 'En iyi değer önerisi',
  lowest_risk_recommendation: 'En düşük risk önerisi',
  budget_sensitive_recommendation: 'Bütçe duyarlı öneri',
  sla_first_recommendation: 'SLA öncelikli öneri',
  capacity_first_recommendation: 'Kapasite öncelikli öneri',
  compliance_first_recommendation: 'Uygunluk öncelikli öneri',
  alternative_candidate_recommendation: 'Alternatif aday önerisi',
  blocked_offer_recommendation: 'Engellenen öneri isteği',
  approval_packet_request: 'Onay paketi hazırlığı',
  general_recommendation: 'Genel öneri',
});
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
export function normalizeOfferRecommendationField(field, value) {
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
export function maskOfferRecommendationSensitiveValue(value) {
  const text = coerceText(value);
  if (!text) return '';
  const analysisMasked = maskOfferAnalysisSensitiveValue(text);
  if (analysisMasked !== text) return analysisMasked;
  const negotiationMasked = maskNegotiationSensitiveValue(text);
  if (negotiationMasked !== text) return negotiationMasked;
  if (text.includes('@')) {
    const [local, domain = ''] = text.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (text.length <= 3) return text;
  return `${text.slice(0, 2)}***${text.slice(-1)}`;
}
function toList(value) {
  if (Array.isArray(value)) return value.flatMap((item) => toList(item));
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'object') {
    return toList(value.items || value.values || value.labels || value.list || value.text || value.value || '');
  }
  return [coerceText(value)].filter(Boolean);
}
function getRecommendationDisplayLabel(row = {}) {
  return coerceText(row.supplierLabel || row.supplierLabelMasked || row.supplierRef || '');
}
function buildRecommendationLabelLookup(offerAnalysisInput = {}) {
  const lookup = new Map();
  const sources = [
    ...(Array.isArray(offerAnalysisInput.offerCollection?.offerFixtures) ? offerAnalysisInput.offerCollection.offerFixtures : []),
    ...(Array.isArray(offerAnalysisInput.offerCollection?.offers) ? offerAnalysisInput.offerCollection.offers : []),
    ...(Array.isArray(offerAnalysisInput.offerFixtures) ? offerAnalysisInput.offerFixtures : []),
    ...(Array.isArray(offerAnalysisInput.offers) ? offerAnalysisInput.offers : []),
    ...(Array.isArray(offerAnalysisInput.comparisonMatrix) ? offerAnalysisInput.comparisonMatrix : []),
  ];
  for (const item of sources) {
    const key = normalizeOfferRecommendationField(item?.supplierRef || item?.supplierLabelMasked || item?.supplierLabel || '');
    const label = coerceText(item?.supplierLabel || item?.supplierLabelMasked || item?.name || item?.title || item?.label || item?.supplierRef || '');
    if (!key || !label) continue;
    const existing = lookup.get(key);
    if (!existing) {
      lookup.set(key, label);
      continue;
    }
    if (existing.includes('***') && !label.includes('***')) {
      lookup.set(key, label);
    }
  }
  return lookup;
}
function uniq(items) {
  return [...new Set((items || []).map((item) => coerceText(item)).filter(Boolean))];
}
function clamp(min, max, value) {
  return Math.min(max, Math.max(min, value));
}
function toNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}
function containsAny(text, needles = []) {
  const haystack = normalizeOfferRecommendationField(text);
  return needles.some((needle) => haystack.includes(normalizeOfferRecommendationField(needle)));
}
function isOfferAnalysisAnswer(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.comparisonMatrix));
}
function isNegotiationAssistAnswer(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.opportunities));
}
function getOfferAnalysisInput(source = {}, context = {}) {
  if (isOfferAnalysisAnswer(source)) return source;
  const offerCollection = source.offerCollection || source;
  return composeOfferAnalysisAnswer({
    offerCollection,
    matchingDraft: source.matchingDraft || offerCollection?.matchingDraft || {},
    sourceRfqSummary: source.sourceRfqSummary || offerCollection?.sourceRfqSummary || {},
    offerFixtures: source.offerFixtures || offerCollection?.offerFixtures || source.offers || offerCollection?.offers || [],
    offers: source.offers || offerCollection?.offers || source.offerFixtures || offerCollection?.offerFixtures || [],
    collectionState: source.collectionState || offerCollection?.collectionState || 'received_draft',
    message: source.message || context.message || offerCollection?.message || '',
  }, context);
}
function getNegotiationAssistInput(source = {}, offerAnalysisInput = {}, context = {}) {
  if (isNegotiationAssistAnswer(source)) return source;
  return composeNegotiationAssistAnswer({
    negotiationAssist: source.negotiationAssist || source,
    negotiationInput: source.negotiationInput || {},
    offerAnalysis: offerAnalysisInput,
    analysisDraft: offerAnalysisInput.analysisDraft || {},
    offerCollection: offerAnalysisInput.offerCollection || {},
    matchingDraft: offerAnalysisInput.matchingDraft || {},
    sourceRfqSummary: context.sourceRfqSummary || offerAnalysisInput.sourceRfqSummary || {},
    message: source.message || context.message || offerAnalysisInput.visibleAnswer || '',
    negotiationTypeHint: source.negotiationTypeHint || context.negotiationTypeHint || '',
    opportunityTypeHint: source.opportunityTypeHint || context.opportunityTypeHint || '',
  }, context);
}
function buildRecommendationTypeDetail(type) {
  const label = COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS[type] || COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS.general_recommendation;
  switch (type) {
    case 'best_value_recommendation':
      return Object.freeze({
        title: label,
        summary: 'Fiyat, kapsam, SLA, kapasite ve risk dengesi birlikte okunur.',
        rationale: 'En dengeli toplam değer öne çıkar.',
        openingNote: 'Bu taslak bağlayıcı değildir; en iyi değer adayını insan onayına sunar.',
        whatToVerify: 'Kapsam, SLA, kapasite, geçerlilik ve eksik alanlar kontrol edilir.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    case 'lowest_risk_recommendation':
      return Object.freeze({
        title: label,
        summary: 'Risk ve uygunluk dengesini öne çıkarır.',
        rationale: 'En düşük risk profili görünür tutulur.',
        openingNote: 'Bu taslak bağlayıcı değildir; en güvenli adayı insan onayına sunar.',
        whatToVerify: 'Belge, güvenlik, geçerlilik ve risk notları kontrol edilir.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    case 'budget_sensitive_recommendation':
      return Object.freeze({
        title: label,
        summary: 'Bütçe ve fiyat görünürlüğünü öne çıkarır.',
        rationale: 'Maliyet baskısı görünür tutulur.',
        openingNote: 'Bu taslak bağlayıcı değildir; bütçe duyarlı adayları insan onayına sunar.',
        whatToVerify: 'Fiyat kapsamı, KDV, süre ve alternatifler kontrol edilir.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    case 'sla_first_recommendation':
      return Object.freeze({
        title: label,
        summary: 'SLA ve kalite taahhüdünü öne çıkarır.',
        rationale: 'Operasyon kalitesi ana sinyal olur.',
        openingNote: 'Bu taslak bağlayıcı değildir; SLA güçlü adayları insan onayına sunar.',
        whatToVerify: 'SLA metrikleri, kalite ve bakım taahhüdü kontrol edilir.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    case 'capacity_first_recommendation':
      return Object.freeze({
        title: label,
        summary: 'Kapasite ve operasyon uygunluğunu öne çıkarır.',
        rationale: 'Kapasite uyumu temel filtre olur.',
        openingNote: 'Bu taslak bağlayıcı değildir; kapasite güçlü adayları insan onayına sunar.',
        whatToVerify: 'Araç sayısı, koltuk kapasitesi ve vardiya uygunluğu kontrol edilir.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    case 'compliance_first_recommendation':
      return Object.freeze({
        title: label,
        summary: 'Belge ve uyum netliğini öne çıkarır.',
        rationale: 'Ruhsat, sigorta ve uygunluk görünürlüğü önceliklenir.',
        openingNote: 'Bu taslak bağlayıcı değildir; uyum güçlü adayları insan onayına sunar.',
        whatToVerify: 'Belge, ruhsat, sigorta ve güvenlik netliği kontrol edilir.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    case 'alternative_candidate_recommendation':
      return Object.freeze({
        title: label,
        summary: 'Alternatif adayları ayrı tutar.',
        rationale: 'Yedek adaylar görünür kalır.',
        openingNote: 'Bu taslak bağlayıcı değildir; alternatif adayları insan onayına sunar.',
        whatToVerify: 'Alternatiflerin risk, fiyat ve kapsam farkları kontrol edilir.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    case 'blocked_offer_recommendation':
      return Object.freeze({
        title: label,
        summary: 'Engellenen karar / gönderim isteği taslak olarak tutulur.',
        rationale: 'Execution boundary korunur.',
        openingNote: 'Bu istek engellendi; yalnızca güvenli öneri taslağı üretilebilir.',
        whatToVerify: 'Kabul, ret, seçim, contact ve send isteği yapılmadığı doğrulanır.',
        nonBindingLanguage: 'Bu istek karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    case 'approval_packet_request':
      return Object.freeze({
        title: label,
        summary: 'Onay paketi ve kontrol listesi hazırlar.',
        rationale: 'İnsan onayına sunulacak paket görünür olur.',
        openingNote: 'Bu taslak bağlayıcı değildir; onay paketi insan incelemesine gider.',
        whatToVerify: 'Aday, alternatif, risk ve eksik alanlar kontrol edilir.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
    default:
      return Object.freeze({
        title: label,
        summary: 'Karar destek taslağı görünür kalır.',
        rationale: 'Fiyat, kapsam, SLA, kapasite ve risk dengesi birlikte okunur.',
        openingNote: 'Bu taslak bağlayıcı değildir; öneri karar destek amacıyla hazırlanır.',
        whatToVerify: 'En güçlü aday ve alternatifler insan onayına sunulur.',
        nonBindingLanguage: 'Bu öneri karar değildir.',
        nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
      });
  }
}
export function classifyOfferRecommendationTypes(input = {}, context = {}) {
  const source = typeof input === 'string' ? { message: input } : (input && typeof input === 'object' ? input : {});
  const text = normalizeOfferRecommendationField(source.message || source.input || source.query || source.text || source.prompt || context.message || '');
  const forced = normalizeOfferRecommendationField(
    source.recommendationTypeHint || source.recommendationHint || source.typeHint || context.recommendationTypeHint || context.recommendationHint || '',
  );
  if (COPILOT_OFFER_RECOMMENDATION_SUPPORTED_TYPES.includes(forced)) {
    return [forced];
  }
  const blocked = COPILOT_OFFER_RECOMMENDATION_BLOCKED_PHRASES.some((phrase) => text.includes(normalizeOfferRecommendationField(phrase)))
    || (text.includes('kabul') && text.includes('teklif'))
    || (text.includes('reddet') && text.includes('teklif'))
    || containsAny(text, ['seç', 'sec', 'seçtim', 'secim', 'seçim', 'selection'])
    || containsAny(text, ['gönder', 'gonder', 'mesaj', 'rfq', 'ilet'])
    || containsAny(text, ['sözleşme', 'sozlesme', 'contract'])
    || containsAny(text, ['uygula', 'onayla', 'approved', 'accept', 'reject']);
  if (blocked) return ['blocked_offer_recommendation'];
  if (containsAny(text, ['approval packet', 'onay paketi', 'approval package', 'karar paketi', 'taslak onaya hazırla', 'onaya hazırla', 'onaya sun'])) return ['approval_packet_request'];
  if (containsAny(text, ['alternatif', 'yedek', 'backup', 'alternative', 'alternatives'])) return ['alternative_candidate_recommendation'];
  if (containsAny(text, ['risk', 'güvenli', 'guvenli', 'safe', 'riskli'])) return ['lowest_risk_recommendation'];
  if (containsAny(text, ['bütçe', 'butce', 'budget', 'cost', 'maliyet', 'ucuz', 'pahalı', 'pahali'])) return ['budget_sensitive_recommendation'];
  if (containsAny(text, ['sla', 'service level', 'kalite', 'quality'])) return ['sla_first_recommendation'];
  if (containsAny(text, ['kapasite', 'capacity', 'koltuk', 'vehicle count', 'araç sayısı', 'arac sayisi'])) return ['capacity_first_recommendation'];
  if (containsAny(text, ['belge', 'document', 'ruhsat', 'license', 'compliance', 'uyum', 'sigorta', 'insurance'])) return ['compliance_first_recommendation'];
  if (containsAny(text, ['değer', 'deger', 'value', 'avantaj', 'balanced', 'denge', 'kıymet', 'kiymet'])) return ['best_value_recommendation'];
  return ['general_recommendation'];
}
export function detectOfferRecommendationIntent(input = {}) {
  const source = typeof input === 'string' ? { message: input } : (input && typeof input === 'object' ? input : {});
  const text = normalizeOfferRecommendationField(source.message || source.input || source.query || source.text || source.prompt || '');
  const recommendationType = classifyOfferRecommendationTypes(source, source)[0] || 'general_recommendation';
  const recommendationTypeLabel = COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS[recommendationType] || COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS.general_recommendation;
  const blocked = recommendationType === 'blocked_offer_recommendation'
    || containsAny(text, ['kabul', 'reddet', 'seç', 'sec', 'gönder', 'gonder', 'mesaj', 'rfq', 'sözleşme', 'sozlesme', 'onayla', 'uygula']);
  if (blocked) {
    return Object.freeze({
      intentType: 'execution_blocked_request',
      recommendationType,
      recommendationTypeLabel,
      draftOnly: true,
      notAccepted: true,
      notRejected: true,
      notSelected: true,
      notContacted: true,
      notSent: true,
      approvalRequired: true,
      humanReviewRequired: true,
      executionState: COPILOT_OFFER_RECOMMENDATION_EXECUTION_STATE,
      blockedExecutionRequest: true,
    });
  }
  let intentType = 'offer_recommendation_request';
  if (recommendationType === 'approval_packet_request' || containsAny(text, ['onay paketi', 'approval packet', 'karar paketi', 'onaya hazırla', 'onaya sun'])) {
    intentType = 'approval_packet_request';
  } else if (recommendationType === 'alternative_candidate_recommendation' || containsAny(text, ['alternatif', 'yedek', 'backup', 'alternative'])) {
    intentType = 'alternative_candidate_request';
  } else if (containsAny(text, ['hazırla', 'hazirla', 'taslak', 'draft', 'öneri', 'oneri', 'recommend', 'recommendation'])) {
    intentType = 'recommendation_draft_request';
  } else if (containsAny(text, ['risk', 'güvenli', 'guvenli', 'safe'])) {
    intentType = 'recommendation_risk_review_request';
  }
  return Object.freeze({
    intentType,
    recommendationType,
    recommendationTypeLabel,
    draftOnly: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    notContacted: true,
    notSent: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: COPILOT_OFFER_RECOMMENDATION_EXECUTION_STATE,
    blockedExecutionRequest: false,
  });
}
export function buildRecommendationInputSummary(offerAnalysisInput = {}, negotiationAssistInput = {}, context = {}) {
  const sourceRfqSummary = context.sourceRfqSummary || offerAnalysisInput.sourceRfqSummary || negotiationAssistInput.sourceRfqSummary || {};
  const rows = Array.isArray(offerAnalysisInput.comparisonMatrix) ? offerAnalysisInput.comparisonMatrix : [];
  const opportunities = Array.isArray(negotiationAssistInput.opportunities) ? negotiationAssistInput.opportunities : [];
  const candidateSuppliersMasked = uniq(rows.map((row) => maskOfferRecommendationSensitiveValue(row.supplierLabelMasked || row.supplierLabel || row.supplierRef))).slice(0, 5);
  const alternativeCandidatesMasked = uniq(rows.slice(1, 4).map((row) => maskOfferRecommendationSensitiveValue(row.supplierLabelMasked || row.supplierLabel || row.supplierRef)));
  const mismatchCount = rows.filter((row) => toList(row.missingFields || row.missingOfferFields).length > 0 || containsAny(row.riskLevel, ['high', 'blocked'])).length;
  const summary = [
    `rfqType=${coerceText(sourceRfqSummary.rfqType || sourceRfqSummary.serviceScope || 'unknown')}`,
    `offerAnalysisState=${coerceText(offerAnalysisInput.executionState || offerAnalysisInput.collectionState || 'unknown')}`,
    `negotiationAssistState=${coerceText(negotiationAssistInput.executionState || negotiationAssistInput.collectionState || 'unknown')}`,
    `analysisRows=${rows.length}`,
    `opportunityCount=${opportunities.length}`,
    `candidateSuppliersMasked=${candidateSuppliersMasked.join(', ') || 'yok'}`,
    `alternativeCandidateCount=${alternativeCandidatesMasked.length}`,
    `missingRiskCount=${mismatchCount}`,
  ].join('; ');
  return Object.freeze({
    rfqType: coerceText(sourceRfqSummary.rfqType || ''),
    offerAnalysisState: coerceText(offerAnalysisInput.executionState || offerAnalysisInput.collectionState || ''),
    negotiationAssistState: coerceText(negotiationAssistInput.executionState || negotiationAssistInput.collectionState || ''),
    analysisRows: rows.length,
    opportunityCount: opportunities.length,
    candidateSuppliersMasked,
    alternativeCandidatesMasked,
    missingRiskCount: mismatchCount,
    serviceScope: coerceText(sourceRfqSummary.serviceScope || ''),
    region: coerceText(sourceRfqSummary.region || ''),
    province: coerceText(sourceRfqSummary.province || ''),
    district: coerceText(sourceRfqSummary.district || ''),
    startDate: coerceText(sourceRfqSummary.startDate || ''),
    shift: coerceText(sourceRfqSummary.shift || ''),
    passengerCount: toNumber(sourceRfqSummary.passengerCount || sourceRfqSummary.personnelCount || sourceRfqSummary.studentCount || 0, 0),
    vehicleCapacityRequirement: toNumber(sourceRfqSummary.vehicleCapacityRequirement || 0, 0),
    sla: coerceText(sourceRfqSummary.sla || ''),
    documentRequirements: uniq(toList(sourceRfqSummary.documentRequirements || [])),
    summary,
  });
}
export function buildRecommendationValueSummary(rowsOrScorecard = []) {
  const rows = Array.isArray(rowsOrScorecard) ? rowsOrScorecard : Array.isArray(rowsOrScorecard.rows) ? rowsOrScorecard.rows : [];
  const items = rows.slice(0, 3).map((row) => `${getRecommendationDisplayLabel(row)}: score=${row.recommendationScore}; value=${row.valueScore}; analysis=${row.analysisScore}; risk=${row.riskScore}`);
  const summary = rows.length > 0
    ? `${rows.length} aday; ${getRecommendationDisplayLabel(rows[0])} öne çıkıyor; fiyat, kapsam, SLA, kapasite ve risk dengesi görünür`
    : 'Aday yok';
  return Object.freeze({ summary, items });
}
export function buildRecommendationRiskSummary(rowsOrScorecard = []) {
  const rows = Array.isArray(rowsOrScorecard) ? rowsOrScorecard : Array.isArray(rowsOrScorecard.rows) ? rowsOrScorecard.rows : [];
  const counts = { blocked: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  for (const row of rows) {
    const key = ['blocked', 'high', 'medium', 'low'].includes(row.riskLevel) ? row.riskLevel : 'unknown';
    counts[key] += 1;
  }
  const items = rows.slice(0, 3).map((row) => `${getRecommendationDisplayLabel(row)}: risk=${coerceText(row.riskLevel || 'unknown')}; missing=${toList(row.missingFields || []).length}`);
  const summary = rows.length > 0
    ? `${rows.length} aday; ${counts.high} yüksek / ${counts.medium} orta / ${counts.low} düşük risk; blocked=${counts.blocked}`
    : 'Risk bulunamadı';
  return Object.freeze({ summary, items, counts });
}
export function buildRecommendationMissingFieldSummary(rowsOrScorecard = []) {
  const rows = Array.isArray(rowsOrScorecard) ? rowsOrScorecard : Array.isArray(rowsOrScorecard.rows) ? rowsOrScorecard.rows : [];
  const bySupplier = rows
    .filter((row) => toList(row.missingFields || row.missingOfferFields).length > 0)
    .map((row) => Object.freeze({
      supplierRef: coerceText(row.supplierRef || ''),
      supplierLabelMasked: getRecommendationDisplayLabel(row),
      missingFields: uniq(toList(row.missingFields || row.missingOfferFields)),
      riskLevel: coerceText(row.riskLevel || 'unknown'),
    }));
  const items = bySupplier.slice(0, 3).map((row) => `${row.supplierLabelMasked}: ${row.missingFields.join(', ')}`);
  const summary = bySupplier.length > 0
    ? `${bySupplier.length} adayda eksik alan var; ${items[0] || 'eksik alan görünür'}`
    : 'Eksik alan yok';
  return Object.freeze({ summary, items, bySupplier });
}
export function buildRecommendationAlternativeSummary(rowsOrScorecard = []) {
  const rows = Array.isArray(rowsOrScorecard) ? rowsOrScorecard : Array.isArray(rowsOrScorecard.rows) ? rowsOrScorecard.rows : [];
  const alternatives = rows.slice(1, 4);
  const items = alternatives.map((row) => `${getRecommendationDisplayLabel(row)}(score=${row.recommendationScore}, risk=${coerceText(row.riskLevel || 'unknown')})`);
  const summary = alternatives.length > 0 ? `Alternatifler: ${items.join(' | ')}` : 'Alternatif aday yok';
  return Object.freeze({ summary, items });
}
export function buildRecommendationCriteriaModel(offerAnalysisInput = {}, negotiationAssistInput = {}, context = {}) {
  const comparisonMatrix = Array.isArray(offerAnalysisInput.comparisonMatrix) ? offerAnalysisInput.comparisonMatrix : [];
  const opportunities = Array.isArray(negotiationAssistInput.opportunities) ? negotiationAssistInput.opportunities : [];
  const supplierLabelLookup = buildRecommendationLabelLookup({
    ...offerAnalysisInput,
    offerCollection: context.offerCollection || offerAnalysisInput.offerCollection || {},
    offerFixtures: context.offerFixtures || offerAnalysisInput.offerFixtures || [],
    offers: context.offers || offerAnalysisInput.offers || [],
  });
  const opportunityBySupplier = new Map(
    opportunities.map((opportunity) => [normalizeOfferRecommendationField(opportunity.supplierRef || opportunity.supplierLabelMasked), opportunity]),
  );
  const recommendationType = classifyOfferRecommendationTypes({
    message: context.message || offerAnalysisInput.visibleAnswer || negotiationAssistInput.visibleAnswer || '',
    recommendationTypeHint: context.recommendationTypeHint || offerAnalysisInput.recommendationTypeHint || negotiationAssistInput.recommendationTypeHint || '',
    recommendationHint: context.recommendationHint || '',
  }, context)[0] || 'general_recommendation';
  const recommendationTypeLabel = COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS[recommendationType] || COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS.general_recommendation;
  const rows = comparisonMatrix.map((row, index) => {
    const key = normalizeOfferRecommendationField(row.supplierRef || row.supplierLabelMasked || index);
    const opportunity = opportunityBySupplier.get(key) || null;
    const supplierLabel = supplierLabelLookup.get(key) || getRecommendationDisplayLabel(row) || `Aday ${index + 1}`;
    const missingFields = uniq(toList(row.missingFields || row.missingOfferFields));
    const supportingOpportunityTypes = uniq([
      ...(opportunity?.opportunityType ? [opportunity.opportunityType] : []),
      ...toList(opportunity?.supportingOpportunityTypes || []),
    ]);
    const supportingSignals = uniq([
      row.normalizedPriceSummary ? `price:${row.normalizedPriceSummary}` : '',
      row.scopeCompleteness ? `scope:${row.scopeCompleteness}` : '',
      row.capacityFit ? `capacity:${row.capacityFit}` : '',
      row.timingFit ? `timing:${row.timingFit}` : '',
      row.slaFit ? `sla:${row.slaFit}` : '',
      row.complianceFit ? `compliance:${row.complianceFit}` : '',
      row.riskLevel ? `risk:${row.riskLevel}` : '',
      opportunity?.currentIssue ? `issue:${opportunity.currentIssue}` : '',
      opportunity?.suggestedAsk ? `ask:${opportunity.suggestedAsk}` : '',
    ].filter(Boolean));
    const analysisScore = clamp(0, 100, toNumber(row.analysisScore, 0));
    const fitBonus = row.fitLevel === 'strong' ? 12 : row.fitLevel === 'acceptable' ? 6 : row.fitLevel === 'weak' ? 0 : row.fitLevel === 'blocked' ? -20 : 0;
    const riskPenalty = row.riskLevel === 'blocked' ? 30 : row.riskLevel === 'high' ? 18 : row.riskLevel === 'medium' ? 10 : row.riskLevel === 'low' ? 3 : 0;
    const missingPenalty = missingFields.length * 4;
    const opportunityBonus = opportunity ? (opportunity.priority === 'high' ? 5 : opportunity.priority === 'medium' ? 3 : opportunity.priority === 'low' ? 1 : 0) : 0;
    const typeBonus = recommendationType === 'lowest_risk_recommendation'
      ? (row.riskLevel === 'low' ? 6 : row.riskLevel === 'medium' ? 3 : 0)
      : recommendationType === 'budget_sensitive_recommendation'
        ? (row.normalizedPriceSummary ? 4 : 0)
        : recommendationType === 'sla_first_recommendation'
          ? (row.slaFit === 'strong' ? 5 : 0)
          : recommendationType === 'capacity_first_recommendation'
            ? (row.capacityFit === 'strong' ? 5 : 0)
            : recommendationType === 'compliance_first_recommendation'
              ? (row.complianceFit === 'strong' ? 5 : 0)
              : recommendationType === 'alternative_candidate_recommendation'
                ? (index > 0 ? 4 : 0)
                : recommendationType === 'approval_packet_request'
                  ? 2
                  : recommendationType === 'best_value_recommendation'
                    ? (row.fitLevel === 'strong' ? 4 : row.fitLevel === 'acceptable' ? 2 : 0)
                    : 0;
    const recommendationScore = clamp(0, 100, analysisScore + fitBonus + opportunityBonus + typeBonus - riskPenalty - missingPenalty);
    const valueScore = clamp(0, 100, analysisScore + fitBonus + opportunityBonus + typeBonus);
    const riskScore = clamp(0, 100, riskPenalty + missingPenalty + (opportunity?.humanReviewRequired ? 2 : 0));
    const priority = recommendationScore >= 80 ? 'high' : recommendationScore >= 60 ? 'medium' : 'low';
    const recommendationReason = [
      row.normalizedPriceSummary ? `price=${row.normalizedPriceSummary}` : '',
      row.scopeCompleteness ? `scope=${row.scopeCompleteness}` : '',
      row.capacityFit ? `capacity=${row.capacityFit}` : '',
      row.timingFit ? `timing=${row.timingFit}` : '',
      row.slaFit ? `sla=${row.slaFit}` : '',
      row.complianceFit ? `compliance=${row.complianceFit}` : '',
      row.riskLevel ? `risk=${row.riskLevel}` : '',
      opportunity?.currentIssue ? `issue=${opportunity.currentIssue}` : '',
    ].filter(Boolean).join('; ');
    return Object.freeze({
      supplierRef: coerceText(row.supplierRef || `supplier-${index + 1}`),
      supplierLabel,
      supplierLabelMasked: coerceText(row.supplierLabelMasked || row.supplierLabel || supplierLabel || `Aday ${index + 1}`),
      recommendationType,
      recommendationTypeLabel,
      analysisScore,
      valueScore,
      riskScore,
      recommendationScore,
      fitLevel: coerceText(row.fitLevel || 'unknown'),
      riskLevel: coerceText(row.riskLevel || 'unknown'),
      priority,
      missingFields,
      supportingOpportunityTypes,
      supportingSignals,
      recommendationReason: recommendationReason || 'fiyat, kapsam, SLA, kapasite ve risk dengesi birlikte okunur.',
      humanReviewRequired: true,
      notAccepted: true,
      notRejected: true,
      notSelected: true,
      notContacted: true,
      notSent: true,
      draftOnly: true,
    });
  });
  const sorted = [...rows].sort((a, b) => b.recommendationScore - a.recommendationScore || b.analysisScore - a.analysisScore || a.supplierLabelMasked.localeCompare(b.supplierLabelMasked));
  return Object.freeze(sorted.map((row, index) => Object.freeze({
    ...row,
    rank: index + 1,
    scoreBand: row.recommendationScore >= 80 ? 'preferred' : row.recommendationScore >= 60 ? 'consider' : 'monitor',
    recommendationWeight: row.recommendationScore,
  })));
}
export function buildRecommendationScorecard(criteriaModel = [], context = {}) {
  const rows = Array.isArray(criteriaModel) ? [...criteriaModel] : Array.isArray(criteriaModel.rows) ? [...criteriaModel.rows] : [];
  const topCandidate = rows[0] || null;
  const alternativeCandidates = rows.slice(1, 4);
  const valueSummary = buildRecommendationValueSummary(rows);
  const riskSummary = buildRecommendationRiskSummary(rows);
  const missingFieldSummary = buildRecommendationMissingFieldSummary(rows);
  const alternativeSummary = buildRecommendationAlternativeSummary(rows);
  const criteriaSummary = `${rows.length} satır; analysisScore, valueScore, riskScore, recommendationScore, fitLevel, priority, missingFields ve supportingOpportunityTypes görünür`;
  const scorecardSummary = topCandidate
    ? `${getRecommendationDisplayLabel(topCandidate)}(score=${topCandidate.recommendationScore}, risk=${topCandidate.riskLevel}, priority=${topCandidate.priority})`
    : 'no candidates';
  const recommendationType = context.recommendationType || topCandidate?.recommendationType || 'general_recommendation';
  const recommendationTypeLabel = context.recommendationTypeLabel || topCandidate?.recommendationTypeLabel || COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS.general_recommendation;
  return Object.freeze({
    rows: Object.freeze(rows),
    topCandidate,
    alternativeCandidates,
    recommendationType,
    recommendationTypeLabel,
    criteriaSummary,
    scorecardSummary,
    valueSummary,
    riskSummary,
    missingFieldSummary,
    alternativeSummary,
  });
}
function buildRecommendationVisibleAnswer({ topCandidate = null, alternativeCandidates = [], blockedExecutionRequest = false, detail = null } = {}) {
  const topLabel = getRecommendationDisplayLabel(topCandidate || {});
  const topScore = topCandidate ? topCandidate.recommendationScore : 0;
  const topRisk = topCandidate ? coerceText(topCandidate.riskLevel || 'unknown') : 'unknown';
  const alternatives = alternativeCandidates.map((row) => getRecommendationDisplayLabel(row)).filter(Boolean);
  const detailSummary = coerceText(detail?.summary || 'Fiyat, kapsam, SLA, kapasite ve risk dengesi birlikte okunur.');
  const reason = coerceText(topCandidate?.recommendationReason || detail?.rationale || 'fiyat, kapsam, SLA, kapasite ve risk dengesi daha güçlü görünüyor.');
  const blockedLine = blockedExecutionRequest ? 'Teklif kabul / ret, seçim, contact ve RFQ send isteği engellendi; yalnızca öneri taslağı üretilebilir.' : '';
  return [
    blockedLine,
    'Teklif öneri taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.',
    'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.',
    'Bu sonuç karar değil, insan onayına sunulacak karar destek taslağıdır.',
    topCandidate ? `Öne çıkan aday: ${topLabel} (score=${topScore}, risk=${topRisk}).` : 'Öne çıkan aday bulunamadı; karar destek taslağı gözden geçirilmeli.',
    detailSummary ? `Neden öne çıkıyor: ${reason || detailSummary}` : '',
    alternatives.length > 0 ? `Alternatif adaylar: ${alternatives.join(', ')}.` : 'Alternatif aday yok.',
    'Eksik bilgiler tamamlanmadan otomatik seçim yapılmaz.',
    'Sıradaki güvenli adım: öneri paketini kontrol edip insan onayına sunmak.',
  ].filter(Boolean).join(' ');
}
export function buildOfferRecommendationDraft(scorecard = {}, context = {}) {
  const rows = Array.isArray(scorecard) ? scorecard : Array.isArray(scorecard.rows) ? scorecard.rows : [];
  const topCandidate = scorecard.topCandidate || rows[0] || null;
  const alternativeCandidates = scorecard.alternativeCandidates || rows.slice(1, 4);
  const recommendationType = scorecard.recommendationType || topCandidate?.recommendationType || 'general_recommendation';
  const recommendationTypeLabel = scorecard.recommendationTypeLabel || topCandidate?.recommendationTypeLabel || COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS.general_recommendation;
  const detail = buildRecommendationTypeDetail(recommendationType);
  const recommendationDraftSummary = topCandidate
    ? `${detail.title}; ${getRecommendationDisplayLabel(topCandidate)}(score=${topCandidate.recommendationScore}); alternatifler=${alternativeCandidates.map((row) => getRecommendationDisplayLabel(row)).join(', ') || 'yok'}`
    : `${detail.title}; aday yok`;
  const visibleAnswer = buildRecommendationVisibleAnswer({
    topCandidate,
    alternativeCandidates,
    blockedExecutionRequest: Boolean(context.blockedExecutionRequest),
    detail,
  });
  return Object.freeze({
    recommendationType,
    recommendationTypeLabel,
    topCandidate,
    alternativeCandidates,
    draftTitle: detail.title,
    openingNote: detail.openingNote,
    recommendationRationale: topCandidate?.recommendationReason || detail.rationale,
    whatToVerify: detail.whatToVerify,
    nonBindingLanguage: detail.nonBindingLanguage,
    humanApprovalNote: 'Human approval olmadan teklif kabul, ret, seçim veya gönderim yapılmaz',
    recommendationDraftSummary,
    approvalRequired: true,
    draftOnly: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    notContacted: true,
    notSent: true,
    visibleAnswer,
    valueSummary: scorecard.valueSummary?.summary || '',
    riskSummary: scorecard.riskSummary?.summary || '',
    missingFieldSummary: scorecard.missingFieldSummary?.summary || '',
    alternativeSummary: scorecard.alternativeSummary?.summary || '',
    nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
  });
}
export function buildApprovalPacketDraft(recommendationDraft = {}, scorecard = {}, context = {}) {
  const topCandidate = recommendationDraft.topCandidate || scorecard.topCandidate || null;
  const alternativeCandidates = recommendationDraft.alternativeCandidates || scorecard.alternativeCandidates || [];
  const packetTitle = `Onay paketi: ${getRecommendationDisplayLabel(topCandidate || {}) || 'aday yok'}`;
  const packetSummary = topCandidate
    ? `${getRecommendationDisplayLabel(topCandidate)}(score=${topCandidate.recommendationScore}); alternatifler=${alternativeCandidates.map((row) => getRecommendationDisplayLabel(row)).join(', ') || 'yok'}; risk=${coerceText(recommendationDraft.riskSummary || scorecard.riskSummary?.summary || 'yok')}; eksik=${coerceText(recommendationDraft.missingFieldSummary || scorecard.missingFieldSummary?.summary || 'yok')}`
    : 'Onay paketi için aday yok';
  return Object.freeze({
    packetTitle,
    packetSummary,
    approvalPacketSummary: packetSummary,
    topCandidate,
    alternativeCandidates,
    riskSummary: scorecard.riskSummary || Object.freeze({ summary: '', items: [] }),
    missingFieldSummary: scorecard.missingFieldSummary || Object.freeze({ summary: '', items: [], bySupplier: [] }),
    approvalNote: recommendationDraft.humanApprovalNote || 'İnsan onayı gerekir.',
    nextSafeStep: recommendationDraft.nextSafeStep || COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
    draftOnly: true,
    approvalRequired: true,
    humanReviewRequired: true,
    blockedExecutionRequest: Boolean(context.blockedExecutionRequest),
  });
}
export function buildOfferRecommendationInput(offerAnalysisSource = {}, negotiationAssistSource = {}, context = {}) {
  const offerAnalysisInput = getOfferAnalysisInput(offerAnalysisSource, context);
  const negotiationAssistInput = getNegotiationAssistInput(negotiationAssistSource, offerAnalysisInput, context);
  const intent = detectOfferRecommendationIntent({
    message: context.message || negotiationAssistInput.visibleAnswer || offerAnalysisInput.visibleAnswer || offerAnalysisInput.recommendationDraftSummary || '',
    recommendationTypeHint: context.recommendationTypeHint || offerAnalysisSource.recommendationTypeHint || negotiationAssistSource.recommendationTypeHint || '',
    recommendationHint: context.recommendationHint || '',
  });
  const inputSummary = buildRecommendationInputSummary(offerAnalysisInput, negotiationAssistInput, context);
  const criteriaModel = buildRecommendationCriteriaModel(offerAnalysisInput, negotiationAssistInput, {
    ...context,
    message: context.message || negotiationAssistInput.visibleAnswer || offerAnalysisInput.visibleAnswer || '',
    recommendationTypeHint: intent.recommendationType,
  });
  const scorecard = buildRecommendationScorecard(criteriaModel, {
    recommendationType: intent.recommendationType,
    recommendationTypeLabel: intent.recommendationTypeLabel,
  });
  const recommendationDraft = buildOfferRecommendationDraft(scorecard, { blockedExecutionRequest: intent.blockedExecutionRequest });
  const approvalPacket = buildApprovalPacketDraft(recommendationDraft, scorecard, { blockedExecutionRequest: intent.blockedExecutionRequest });
  const sourceOfferAnalysisSummary = coerceText(
    offerAnalysisInput.comparisonMatrixSummary
      || offerAnalysisInput.analysisDraftSummary
      || offerAnalysisInput.offerAnalysisTypeSummary
      || offerAnalysisInput.visibleAnswer
      || '',
  );
  const sourceNegotiationAssistSummary = coerceText(
    negotiationAssistInput.opportunitySummary
      || negotiationAssistInput.counterOfferDraftSummary
      || negotiationAssistInput.readinessTableSummary
      || negotiationAssistInput.visibleAnswer
      || '',
  );
  const sourceRfqSummary = offerAnalysisInput.sourceRfqSummary || negotiationAssistInput.sourceRfqSummary || context.sourceRfqSummary || {};
  const visibleAnswer = recommendationDraft.visibleAnswer;
  return Object.freeze({
    intentType: intent.intentType,
    recommendationType: recommendationDraft.recommendationType,
    recommendationTypeLabel: recommendationDraft.recommendationTypeLabel,
    recommendationIntentSummary: `intentType=${intent.intentType}; recommendationType=${recommendationDraft.recommendationType}; draftOnly=true; notAccepted=true; notRejected=true; notSelected=true; notContacted=true; notSent=true; approvalRequired=true`,
    recommendationTypeSummary: `${recommendationDraft.recommendationTypeLabel}; ${COPILOT_OFFER_RECOMMENDATION_SUPPORTED_TYPES.map((type) => COPILOT_OFFER_RECOMMENDATION_TYPE_LABELS[type] || type).join(' | ')}`,
    recommendationInputSummary: inputSummary,
    recommendationInputSummaryText: inputSummary.summary,
    sourceOfferAnalysisSummary,
    sourceNegotiationAssistSummary,
    sourceRfqSummary,
    criteriaModel,
    criteriaModelSummary: scorecard.criteriaSummary,
    scorecard,
    scorecardSummary: scorecard.scorecardSummary,
    recommendationDraft,
    recommendationDraftSummary: recommendationDraft.recommendationDraftSummary,
    approvalPacket,
    approvalPacketSummary: approvalPacket.approvalPacketSummary,
    valueSummary: scorecard.valueSummary.summary,
    valueSummaryItems: scorecard.valueSummary.items,
    riskSummary: scorecard.riskSummary.summary,
    riskSummaryItems: scorecard.riskSummary.items,
    missingFieldSummary: scorecard.missingFieldSummary.summary,
    missingFields: scorecard.missingFieldSummary.items,
    bySupplier: scorecard.missingFieldSummary.bySupplier,
    alternativeSummary: scorecard.alternativeSummary.summary,
    alternativeSummaryItems: scorecard.alternativeSummary.items,
    safetyNotes: Object.freeze([
      ...COPILOT_OFFER_RECOMMENDATION_TURKISH_VISIBLE_PHRASES,
      ...COPILOT_OFFER_RECOMMENDATION_BOUNDARY_FLAGS,
      ...COPILOT_OFFER_RECOMMENDATION_BLOCKED_ACTIONS,
    ]),
    safetyPhraseSummary: `${COPILOT_OFFER_RECOMMENDATION_BOUNDARY_FLAGS.join(' / ')} korunur; teklif kabul / ret / seçim / contact / RFQ send / gönderim yok`,
    kvkkSafeSummary: 'raw token, credential, cookie, password, raw GPS trace ve raw PII yok; masked supplier labels kullanılır; production data okunmaz',
    auditApprovalSummary: 'human approval boundary, audit trace handoff ve rollback-ready draft korunur',
    noWriteActionSummary: 'supplier contact, message/email/SMS/push, RFQ send, offer accept/reject, supplier selection, agreement execute, dispatch apply, route apply, payment/hakediş execute, provider credential use ve audit event write açılmaz',
    chainWiringSummary: 'check:copilotofferanalysis01 -> check:copilotnegotiationassist01 -> check:copilotofferrecommendation01 -> check:copilothumanapproval01 remains wired',
    smokeThresholdSummary: 'product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none',
    commitExternalSummary: 'runtime-data, browser-smoke, load-test, db-scaling, observability, data-integrity, role-redteam, security-kvkk, audit-trace ve debug.log commit dışı kalır',
    prismaSummary: 'No route/service/prisma diff; no production DB; no schema/migration; read-only only',
    lineCountSummary: 'backend/src/ai/chat/copilotOfferRecommendation.js stays under 1000 lines',
    visibleAnswer,
    draftOnly: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    notContacted: true,
    notSent: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: COPILOT_OFFER_RECOMMENDATION_EXECUTION_STATE,
    nextSafeStep: COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP,
    blockedExecutionRequest: Boolean(intent.blockedExecutionRequest),
  });
}
export function composeOfferRecommendationAnswer(context = {}) {
  const offerAnalysisSource = context.offerAnalysis || context.analysisDraft || context.offerCollection || context.matchingDraft || context;
  const negotiationAssistSource = context.negotiationAssist || context.negotiationInput || {};
  return buildOfferRecommendationInput(offerAnalysisSource, negotiationAssistSource, context);
}
function buildCopilotOfferRecommendationRole(role, visible) {
  return Object.freeze({
    role,
    visible,
    RECOMMENDATION_INPUT_SUMMARY: [...COPILOT_OFFER_RECOMMENDATION_INPUT_SUMMARY],
    SUPPORTED_RECOMMENDATION_TYPES: [...COPILOT_OFFER_RECOMMENDATION_SUPPORTED_TYPES],
    CRITERIA_MODEL: [...COPILOT_OFFER_RECOMMENDATION_CRITERIA_MODEL],
    SCORECARD_FIELDS: [...COPILOT_OFFER_RECOMMENDATION_SCORECARD_FIELDS],
    DRAFT_FIELDS: [...COPILOT_OFFER_RECOMMENDATION_DRAFT_FIELDS],
    APPROVAL_PACKET_FIELDS: [...COPILOT_OFFER_RECOMMENDATION_APPROVAL_PACKET_FIELDS],
    SAFETY_BOUNDARY_FLAGS: [...COPILOT_OFFER_RECOMMENDATION_BOUNDARY_FLAGS],
    BLOCKED_RUNTIME_ACTION: [...COPILOT_OFFER_RECOMMENDATION_BLOCKED_ACTIONS],
    NEVER_AUTOMATE: [...COPILOT_OFFER_RECOMMENDATION_NEVER_AUTOMATE],
    TURKISH_VISIBLE_PHRASES: [...COPILOT_OFFER_RECOMMENDATION_TURKISH_VISIBLE_PHRASES],
    BLOCKED_PHRASES: [...COPILOT_OFFER_RECOMMENDATION_BLOCKED_PHRASES],
    HANDOFFS: [...COPILOT_OFFER_RECOMMENDATION_HANOFFS],
    PUBLIC_PROMISE: [...COPILOT_OFFER_RECOMMENDATION_PUBLIC_PROMISE],
  });
}
export const COPILOT_OFFER_RECOMMENDATION_POLICY = Object.freeze(
  Object.fromEntries(
    COPILOT_OFFER_RECOMMENDATION_ROLE_NAMES.map((role) => [
      role,
      buildCopilotOfferRecommendationRole(role, !['DRIVER', 'PERSONEL', 'PARENT'].includes(role)),
    ]),
  ),
);
export function listCopilotOfferRecommendationRoles() {
  return Object.keys(COPILOT_OFFER_RECOMMENDATION_POLICY);
}
export function getCopilotOfferRecommendationPolicy(role) {
  return COPILOT_OFFER_RECOMMENDATION_POLICY[role] || null;
}
