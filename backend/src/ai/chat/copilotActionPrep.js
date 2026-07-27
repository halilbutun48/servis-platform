import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import * as dispatchActionPrep from './copilotDispatchActionPrep.js';
import * as shiftToAgreementPrep from './copilotShiftToAgreementPrep.js';
import * as humanApproval from './copilotHumanApprovalPolicy.js';

export const COPILOT_ACTION_PREP_VERSION = 'COPILOT-ACTION-PREP-01';

const DEFAULT_VISIBLE_LEAD = 'Aksiyon hazırlık taslağını oluşturdum; henüz hiçbir işlem uygulanmadı.';
const DEFAULT_SAFE_STEP = 'hazırlık paketini insan onayına sunmak';
const DEFAULT_EXECUTION_STATE = 'action_prep_draft_only / no_write_action / no_dispatch_apply / no_route_apply / no_agreement_execute / no_payment_execute / no_message_send / human_approval_required';
const COMMON_SAFE_ACTIONS = Object.freeze(['Eksik alanları sor', 'İnsan onayını iste']);
const COMMON_RISK_ACTIONS = Object.freeze(['Riskleri göster', 'İnsan onayını iste']);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mergeStrings(...lists) {
  return uniqueStrings(lists.flatMap((list) => (Array.isArray(list) ? list : [list])));
}

function freezeStrings(...lists) {
  return Object.freeze(mergeStrings(...lists));
}

function normalizeRole(role) {
  return String(role || 'COMPANY').trim().toUpperCase() || 'COMPANY';
}

function simpleHash(text) {
  let hash = 2166136261;
  for (const char of String(text || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function limitText(value, maxLength = 900) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeApprovalType(value, fallback = 'review_only') {
  const text = String(value || '').trim().toLowerCase();
  return COPILOT_ACTION_PREP_APPROVAL_TYPES.includes(text) ? text : fallback;
}

function normalizeStatus(value, fallback = 'needs_clarification') {
  const text = String(value || '').trim().toLowerCase();
  return COPILOT_ACTION_PREP_CARD_STATUSES.includes(text) ? text : fallback;
}

function maskEmail(value) {
  return String(value || '').replace(/([\w.+-])[\w.+-]*(@[\w-]+(?:\.[\w-]+)+)/g, '$1***$2');
}

function maskPhone(value) {
  return String(value || '').replace(/(\+?\d[\d\s().-]{6,}\d)/g, (match) => match.replace(/\d(?=\D*\d{2})/g, '*'));
}

function maskLongId(value) {
  return String(value || '').replace(/\b(\d{4,})\b/g, (match) => `${match.slice(0, 2)}***`);
}

export function maskActionPrepSensitiveValue(value) {
  return maskLongId(maskPhone(maskEmail(String(value || '').trim()))).trim();
}

export function normalizeActionPrepField(field, value) {
  if (Array.isArray(value)) return Object.freeze(mergeStrings(value));
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  const text = String(value || '').trim();
  if (!text) return '';
  if (field === 'role') return normalizeRole(text);
  if (field === 'approvalType') return normalizeApprovalType(text);
  if (field === 'status') return normalizeStatus(text);
  return text;
}

function listFromValue(value) {
  if (Array.isArray(value)) return mergeStrings(value);
  const text = String(value || '').trim();
  return text ? [text] : [];
}

function compactActionPrepText(value) {
  return normalizeText(value).replace(/[^a-z0-9ığüşöçı]+/g, '');
}

export const COPILOT_ACTION_PREP_SOURCE_CAPABILITIES = Object.freeze([
  'demand_intake',
  'rfq_prep',
  'supplier_matching',
  'supplier_offer_collect',
  'offer_analysis',
  'negotiation_assist',
  'offer_recommendation',
  'shift_to_agreement_prep',
  'dispatch_action_prep',
  'generic',
]);

export const COPILOT_ACTION_PREP_TYPES = Object.freeze([
  'demand_to_rfq_prep',
  'rfq_to_supplier_matching_prep',
  'supplier_to_offer_collection_prep',
  'offer_collection_to_analysis_prep',
  'offer_to_negotiation_prep',
  'offer_to_recommendation_prep',
  'recommendation_to_agreement_prep',
  'agreement_to_dispatch_prep',
  'dispatch_to_human_approval_prep',
  'generic_blocker_resolution_prep',
  'missing_field_collection_prep',
  'risk_review_prep',
]);

export const COPILOT_ACTION_PREP_CARD_STATUSES = Object.freeze([
  'ready_for_review',
  'needs_clarification',
  'risky',
  'blocked',
]);

export const COPILOT_ACTION_PREP_APPROVAL_TYPES = Object.freeze([
  'review_only',
  'draft_review',
  'missing_field_review',
  'risk_review',
  'final_human_approval_required',
]);

export const COPILOT_ACTION_PREP_BLOCKED_EXECUTION_PHRASES = Object.freeze([
  'Gönderdim.',
  'Uyguladım.',
  'Onayladım.',
  'Teklifi kabul ettim.',
  'Teklifi reddettim.',
  'Tedarikçiyi seçtim.',
  'Sözleşme oluşturdum.',
  'Sözleşmeyi execute ettim.',
  'Dispatch yaptım.',
  'Vardiya oluşturdum.',
  'Rotayı uyguladım.',
  'Sürücü atadım.',
  'Araç atadım.',
  'Ödeme/hakediş başlattım.',
  'Mesaj gönderdim.',
  'RFQ gönderdim.',
]);

export const COPILOT_ACTION_PREP_VISIBLE_ANSWER_TEMPLATES = Object.freeze([
  'Aksiyon hazırlık taslağını oluşturdum; henüz hiçbir işlem uygulanmadı.',
  'Bu sonuç karar değil, insan onayına sunulacak hazırlık paketidir.',
  'Eksik bilgiler tamamlanmadan işlem yapılamaz.',
  'Teklif kabul edilmedi, tedarikçi seçilmedi, sözleşme oluşturulmadı.',
  'Dispatch uygulanmadı, vardiya/rota oluşturulmadı, araç veya sürücü atanmadı.',
  'Sıradaki güvenli adım: hazırlık paketini kontrol edip insan onayına sunmak.',
]);

export const COPILOT_ACTION_PREP_SAFETY_NOTES = Object.freeze([
  'draftOnly=true',
  'approvalRequired=true',
  'noWriteAction=true',
  'notExecuted=true',
  'humanReviewRequired=true',
  'KVKK / PII maskesi uygulanır',
  'route/service/prisma diff açılmaz',
  'runtime model/network call yapılmaz',
  'No route / service / prisma diff.',
]);

export const COPILOT_ACTION_PREP_SOURCE_TO_TYPE = Object.freeze({
  demand_intake: 'demand_to_rfq_prep',
  rfq_prep: 'rfq_to_supplier_matching_prep',
  supplier_matching: 'supplier_to_offer_collection_prep',
  supplier_offer_collect: 'offer_collection_to_analysis_prep',
  offer_analysis: 'offer_to_negotiation_prep',
  negotiation_assist: 'offer_to_recommendation_prep',
  offer_recommendation: 'recommendation_to_agreement_prep',
  shift_to_agreement_prep: 'agreement_to_dispatch_prep',
  dispatch_action_prep: 'dispatch_to_human_approval_prep',
  generic: 'generic_blocker_resolution_prep',
});

const ACTION_PREP_TYPE_TO_SOURCE = Object.freeze(
  Object.fromEntries(Object.entries(COPILOT_ACTION_PREP_SOURCE_TO_TYPE).map(([sourceCapability, actionPrepType]) => [actionPrepType, sourceCapability])),
);

function resolveSourceCapability(value) {
  const raw = typeof value === 'object' && value
    ? firstNonEmpty(value.sourceCapability, value.actionPrepType, value.source, value.type, '')
    : value;
  const text = normalizeText(raw);
  if (!text) return 'generic';
  if (COPILOT_ACTION_PREP_SOURCE_CAPABILITIES.includes(text)) return text;
  if (ACTION_PREP_TYPE_TO_SOURCE[text]) return ACTION_PREP_TYPE_TO_SOURCE[text];
  if (/(demand|talep|istek|intake)/.test(text)) return 'demand_intake';
  if (/(rfq|quote request)/.test(text)) return 'rfq_prep';
  if (/(supplier matching|tedarikçi eşleştirme|tedarikci eslestirme|matching|shortlist)/.test(text)) return 'supplier_matching';
  if (/(offer collect|teklif toplama|supplier contact|teklif topla)/.test(text)) return 'supplier_offer_collect';
  if (/(analysis|analiz|comparison|karsilastir|karşılaştır|risk summary)/.test(text)) return 'offer_analysis';
  if (/(negotiation|pazarlık|pazarlik|counter offer|karşı teklif|karsi teklif)/.test(text)) return 'negotiation_assist';
  if (/(recommendation|öneri|oneri|suggest)/.test(text)) return 'offer_recommendation';
  if (/(agreement|contract|sözleşme|sozlesme|agreement prep|contract prep)/.test(text)) return 'shift_to_agreement_prep';
  if (/(dispatch|route|vardiya|shift)/.test(text)) return 'dispatch_action_prep';
  return 'generic';
}

function createActionPrepBlueprint(config) {
  const actionPrepType = normalizeActionPrepField('actionPrepType', config.actionPrepType);
  const sourceCapability = resolveSourceCapability(config.sourceCapability);
  return Object.freeze({
    actionPrepType,
    sourceCapability,
    sourceLabel: normalizeActionPrepField('sourceLabel', config.sourceLabel),
    cardTitle: normalizeActionPrepField('cardTitle', config.cardTitle),
    cardSubtitle: normalizeActionPrepField('cardSubtitle', config.cardSubtitle),
    summary: normalizeActionPrepField('summary', config.summary),
    primarySafeActionLabel: normalizeActionPrepField('primarySafeActionLabel', config.primarySafeActionLabel),
    secondarySafeActionLabels: Object.freeze(mergeStrings(config.secondarySafeActionLabels || [])),
    missingFieldHints: Object.freeze(mergeStrings(config.missingFieldHints || [])),
    riskHints: Object.freeze(mergeStrings(config.riskHints || [])),
    requiredHumanChecks: Object.freeze(mergeStrings(config.requiredHumanChecks || [])),
    blockedWriteActions: Object.freeze(mergeStrings(config.blockedWriteActions || [])),
    blockedPhrases: Object.freeze(mergeStrings(config.blockedPhrases || [])),
    visibleAnswerLead: normalizeActionPrepField('visibleAnswerLead', config.visibleAnswerLead || DEFAULT_VISIBLE_LEAD),
    nextSafeStep: normalizeActionPrepField('nextSafeStep', config.nextSafeStep || DEFAULT_SAFE_STEP),
    approvalType: normalizeApprovalType(config.approvalType, 'review_only'),
    defaultStatus: normalizeStatus(config.defaultStatus, 'needs_clarification'),
    safetyNotes: Object.freeze(mergeStrings(config.safetyNotes || [])),
  });
}

const ACTION_PREP_BLUEPRINT_ROWS = [
  { actionPrepType: 'demand_to_rfq_prep', sourceCapability: 'demand_intake', sourceLabel: 'Talep -> RFQ hazırlık', cardTitle: 'RFQ hazırlık taslağı', cardSubtitle: 'Talep akışını RFQ hazırlığa dönüştürür.', summary: 'Talebi RFQ ön hazırlık paketine çevirir.', primarySafeActionLabel: 'RFQ taslağını aç', secondarySafeActionLabels: COMMON_SAFE_ACTIONS, missingFieldHints: ['talep kapsamı', 'servis tarihi', 'hat / bölge', 'onay sahibi'], riskHints: ['Eksik talep bilgisi yanlış RFQ çıkarabilir.'], requiredHumanChecks: ['talep kapsamı doğrulama', 'onay sahibi', 'KVKK sınırı'], blockedWriteActions: ['RFQ send', 'supplier selection', 'offer accept/reject', 'agreement/contract execute'], blockedPhrases: ['RFQ gönder', 'teklif toplama yürüt', 'tedarikçi seç', 'sözleşme oluştur'], visibleAnswerLead: DEFAULT_VISIBLE_LEAD, nextSafeStep: 'Talep alanlarını doğrulayıp RFQ taslağını insan onayına sunmak', approvalType: 'draft_review', defaultStatus: 'needs_clarification', safetyNotes: ['RFQ send kapalıdır.', 'Talep taslak seviyesinde kalır.'] },
  { actionPrepType: 'rfq_to_supplier_matching_prep', sourceCapability: 'rfq_prep', sourceLabel: 'RFQ -> tedarikçi eşleştirme', cardTitle: 'Eşleştirme hazırlık taslağı', cardSubtitle: 'RFQ çıktısını aday eşleştirme paketine dönüştürür.', summary: 'RFQ hazırlığını tedarikçi eşleştirme taslağına çevirir.', primarySafeActionLabel: 'Adayları sırala', secondarySafeActionLabels: COMMON_SAFE_ACTIONS, missingFieldHints: ['uygunluk kriteri', 'bölge', 'kapsam', 'teknik yeterlilik'], riskHints: ['Eksik filtreler yanlış kısa liste oluşturabilir.'], requiredHumanChecks: ['uygunluk kriteri', 'KVKK maskesi', 'insan onayı'], blockedWriteActions: ['supplier selection', 'RFQ send', 'offer collect execute', 'provider credential use'], blockedPhrases: ['tedarikçi seç', 'RFQ gönder', 'teklif topla', 'paylaş'], visibleAnswerLead: DEFAULT_VISIBLE_LEAD, nextSafeStep: 'RFQ çıktısını kısa liste taslağına çevirip insan onayına sunmak', approvalType: 'draft_review', defaultStatus: 'needs_clarification', safetyNotes: ['RFQ send açılmaz.', 'Kısa liste taslağı read-only kalır.'] },
  { actionPrepType: 'supplier_to_offer_collection_prep', sourceCapability: 'supplier_matching', sourceLabel: 'Tedarikçi -> teklif toplama', cardTitle: 'Teklif toplama hazırlık taslağı', cardSubtitle: 'Eşleşen adayları teklif toplama paketine dönüştürür.', summary: 'Kısa listeyi teklif toplama paketine çevirir.', primarySafeActionLabel: 'Teklif toplama paketini aç', secondarySafeActionLabels: COMMON_SAFE_ACTIONS, missingFieldHints: ['aday kısa liste', 'iletişim kapsamı', 'yetki sınırı'], riskHints: ['İletişim sınırı yanlış uygulanırsa veri sızıntısı olur.'], requiredHumanChecks: ['supplier contact sınırı', 'RFQ send sınırı', 'insan onayı'], blockedWriteActions: ['supplier contact', 'offer collect execute', 'offer accept/reject', 'provider credential use'], blockedPhrases: ['teklif topla', 'iletişim kur', 'kabul et', 'reddet'], visibleAnswerLead: DEFAULT_VISIBLE_LEAD, nextSafeStep: 'Kısa listeyi teklif toplama paketi olarak insan onayına sunmak', approvalType: 'draft_review', defaultStatus: 'needs_clarification', safetyNotes: ['Teklif toplama execute açılmaz.', 'İletişim yalnızca hazırlıkta kalır.'] },
  { actionPrepType: 'offer_collection_to_analysis_prep', sourceCapability: 'supplier_offer_collect', sourceLabel: 'Teklif toplama -> analiz', cardTitle: 'Teklif analiz taslağı', cardSubtitle: 'Teklifleri karşılaştırma ve risk özetine dönüştürür.', summary: 'Toplanan teklifleri karşılaştırma ve risk taslağına çevirir.', primarySafeActionLabel: 'Analiz özetini aç', secondarySafeActionLabels: COMMON_SAFE_ACTIONS, missingFieldHints: ['teklif tamlığı', 'kıyas ölçütü', 'kalite sinyali'], riskHints: ['Eksik kıyas kriteri yanlış analiz oluşturabilir.'], requiredHumanChecks: ['kalite sinyali', 'kıyas ölçütü', 'insan onayı'], blockedWriteActions: ['offer analysis execute', 'offer accept/reject', 'supplier selection'], blockedPhrases: ['teklifi analiz et', 'karşılaştırmayı uygula', 'kabul et', 'seç'], visibleAnswerLead: 'Bu sonuç karar değil, insan onayına sunulacak hazırlık paketidir.', nextSafeStep: 'Teklifleri karşılaştırma ve risk özeti olarak insan onayına sunmak', approvalType: 'risk_review', defaultStatus: 'needs_clarification', safetyNotes: ['Analiz taslak seviyesinde kalır.', 'Kabul/ret kararı açılmaz.'] },
  { actionPrepType: 'offer_to_negotiation_prep', sourceCapability: 'offer_analysis', sourceLabel: 'Teklif -> pazarlık', cardTitle: 'Pazarlık hazırlık taslağı', cardSubtitle: 'Analiz çıktısını pazarlık sorularına çevirir.', summary: 'Analizden pazarlık notu ve soru seti üretir.', primarySafeActionLabel: 'Pazarlık notunu aç', secondarySafeActionLabels: COMMON_SAFE_ACTIONS, missingFieldHints: ['karşı teklif sınırı', 'risk / benefit dengesi', 'onay sorumlusu'], riskHints: ['Karşı teklif sınırı aşılırsa yetki ihlali oluşur.'], requiredHumanChecks: ['karşı teklif sınırı', 'insan onayı', 'KVKK sınırı'], blockedWriteActions: ['negotiation message', 'offer accept/reject', 'agreement/contract execute'], blockedPhrases: ['pazarlık yap', 'karşı teklif gönder', 'kabul et', 'reddet'], visibleAnswerLead: 'Bu sonuç karar değil, insan onayına sunulacak hazırlık paketidir.', nextSafeStep: 'Pazarlık notunu ve soru setini insan onayına sunmak', approvalType: 'risk_review', defaultStatus: 'needs_clarification', safetyNotes: ['Pazarlık taslağı write-action değildir.', 'Mesaj gönderimi kapalıdır.'] },
  { actionPrepType: 'offer_to_recommendation_prep', sourceCapability: 'negotiation_assist', sourceLabel: 'Teklif -> öneri', cardTitle: 'Teklif öneri paketi', cardSubtitle: 'Pazarlık çıktısını öneri taslağına dönüştürür.', summary: 'Pazarlık taslağını öneri paketine çevirir.', primarySafeActionLabel: 'Öneri paketini aç', secondarySafeActionLabels: COMMON_SAFE_ACTIONS, missingFieldHints: ['onay sahibi', 'öneri kapsamı', 'risk seviyesi'], riskHints: ['Öneri paketi karar yerine geçmez.'], requiredHumanChecks: ['öneri kapsamı', 'insan onayı', 'KVKK sınırı'], blockedWriteActions: ['offer accept/reject', 'supplier selection', 'agreement/contract execute'], blockedPhrases: ['öneriyi uygula', 'kabul et', 'reddet', 'seç'], visibleAnswerLead: DEFAULT_VISIBLE_LEAD, nextSafeStep: 'Öneri paketini insan onayına sunmak', approvalType: 'review_only', defaultStatus: 'ready_for_review', safetyNotes: ['Öneri paketi read-only kalır.', 'Kabul/ret kapalıdır.'] },
  { actionPrepType: 'recommendation_to_agreement_prep', sourceCapability: 'offer_recommendation', sourceLabel: 'Öneri -> sözleşme hazırlık', cardTitle: 'Sözleşme hazırlık taslağı', cardSubtitle: 'Öneri paketini agreement taslağına dönüştürür.', summary: 'Öneriyi sözleşme ön hazırlığına çevirir.', primarySafeActionLabel: 'Sözleşme hazırlığını aç', secondarySafeActionLabels: COMMON_SAFE_ACTIONS, missingFieldHints: ['sözleşme kapsamı', 'başlangıç tarihi', 'onay sahibi'], riskHints: ['Eksik sözleşme alanı yanlış hazırlık oluşturabilir.'], requiredHumanChecks: ['sözleşme kapsamı', 'KVKK sınırı', 'insan onayı'], blockedWriteActions: ['agreement/contract execute', 'supplier selection', 'RFQ send'], blockedPhrases: ['sözleşme oluştur', 'sözleşmeyi execute et', 'kabul et', 'seç'], visibleAnswerLead: 'Bu sonuç karar değil, insan onayına sunulacak hazırlık paketidir.', nextSafeStep: 'Sözleşme hazırlık paketini insan onayına sunmak', approvalType: 'draft_review', defaultStatus: 'needs_clarification', safetyNotes: ['Sözleşme create/execute açılmaz.', 'İnsan onayı olmadan ilerlenmez.'] },
  { actionPrepType: 'agreement_to_dispatch_prep', sourceCapability: 'shift_to_agreement_prep', sourceLabel: 'Sözleşme -> dispatch hazırlık', cardTitle: 'Dispatch hazırlık taslağı', cardSubtitle: 'Sözleşme ön hazırlığını dispatch hazırlığına dönüştürür.', summary: 'Sözleşme hazırlığını dispatch readiness paketine çevirir.', primarySafeActionLabel: 'Dispatch hazırlığını aç', secondarySafeActionLabels: COMMON_SAFE_ACTIONS, missingFieldHints: ['vardiya bağlamı', 'rota özeti', 'araç / sürücü readiness'], riskHints: ['Eksik readiness alanı yanlış dispatch taslağı doğurabilir.'], requiredHumanChecks: ['dispatch readiness', 'rota uygunluğu', 'insan onayı'], blockedWriteActions: ['dispatch apply', 'route apply', 'driver/vehicle assignment'], blockedPhrases: ['dispatch yap', 'rotayı uygula', 'sürücü ata', 'araç ata'], visibleAnswerLead: 'Dispatch hazırlık taslağını oluşturdum; henüz hiçbir işlem uygulanmadı.', nextSafeStep: 'Dispatch hazırlık paketini insan onayına sunmak', approvalType: 'draft_review', defaultStatus: 'needs_clarification', safetyNotes: ['Dispatch apply açılmaz.', 'Rota ve atama write-action değildir.'] },
  { actionPrepType: 'dispatch_to_human_approval_prep', sourceCapability: 'dispatch_action_prep', sourceLabel: 'Dispatch -> insan onayı', cardTitle: 'Onay paketi taslağı', cardSubtitle: 'Dispatch hazırlığını human approval paketine dönüştürür.', summary: 'Dispatch çıktısını insan onayı paketine çevirir.', primarySafeActionLabel: 'Onay paketini aç', secondarySafeActionLabels: ['İnsan onayını iste', 'Riskleri göster'], missingFieldHints: ['onay sahibi', 'risk özeti', 'hazırlık paketi'], riskHints: ['İnsan onayı olmadan dispatch / route uygulanamaz.'], requiredHumanChecks: ['son güvenli kontrol', 'human approval', 'KVKK sınırı'], blockedWriteActions: ['dispatch apply', 'route apply', 'driver/vehicle assignment', 'payment/hakediş execute'], blockedPhrases: ['uygula', 'onayla', 'dispatch yaptım', 'rota uyguladım'], visibleAnswerLead: DEFAULT_VISIBLE_LEAD, nextSafeStep: 'Hazırlık paketini insan onayına sunmak', approvalType: 'final_human_approval_required', defaultStatus: 'blocked', safetyNotes: ['İnsan onayı olmadan kritik işlem yok.', 'Write-action boundary korunur.'] },
  { actionPrepType: 'generic_blocker_resolution_prep', sourceCapability: 'generic', sourceLabel: 'Genel engel çözümü', cardTitle: 'Engel çözüm taslağı', cardSubtitle: 'Belirsiz istekleri güvenli hazırlık paketine dönüştürür.', summary: 'Genel blocker çözümünde eksik alanları ve riskleri toparlar.', primarySafeActionLabel: 'Eksikleri topla', secondarySafeActionLabels: COMMON_RISK_ACTIONS, missingFieldHints: ['istek tipi', 'rol', 'kayıt referansı'], riskHints: ['Belirsiz istek yanlış eylem üretebilir.'], requiredHumanChecks: ['istek netliği', 'insan onayı', 'KVKK sınırı'], blockedWriteActions: ['write-action', 'DB write', 'dispatch apply', 'route apply'], blockedPhrases: ['uygula', 'gönder', 'onayla', 'kabul et', 'reddet'], visibleAnswerLead: 'Bu sonuç karar değil, insan onayına sunulacak hazırlık paketidir.', nextSafeStep: 'Eksik bilgileri toparlayıp insan onayına sunmak', approvalType: 'review_only', defaultStatus: 'needs_clarification', safetyNotes: ['Belirsiz istek execution’a çevrilmez.', 'Hazırlık paketi read-only kalır.'] },
  { actionPrepType: 'missing_field_collection_prep', sourceCapability: 'generic', sourceLabel: 'Eksik bilgi toplama', cardTitle: 'Eksik alan taslağı', cardSubtitle: 'Eksik bilgileri toplayıp onay paketine dönüştürür.', summary: 'Eksik alanları ve gerekli veri toplama adımlarını listeler.', primarySafeActionLabel: 'Eksik alanları sırala', secondarySafeActionLabels: COMMON_RISK_ACTIONS, missingFieldHints: ['eksik alan', 'kayıp referans', 'zorunlu onay'], riskHints: ['Eksik bilgi tamamlanmadan işlem yapılamaz.'], requiredHumanChecks: ['eksik bilgi onayı', 'KVKK sınırı', 'insan onayı'], blockedWriteActions: ['write-action', 'DB write', 'agreement/contract execute'], blockedPhrases: ['tamamla ve uygula', 'eksikleri atla', 'kabul et'], visibleAnswerLead: 'Eksik bilgiler tamamlanmadan işlem yapılamaz.', nextSafeStep: 'Eksik bilgileri toplayıp yeniden insan onayına sunmak', approvalType: 'missing_field_review', defaultStatus: 'needs_clarification', safetyNotes: ['Eksik alanlar giderilmeden ilerlenmez.', 'Write-action kapalıdır.'] },
  { actionPrepType: 'risk_review_prep', sourceCapability: 'generic', sourceLabel: 'Risk inceleme', cardTitle: 'Risk inceleme taslağı', cardSubtitle: 'Riskleri ve blokajları güvenli taslakta toplar.', summary: 'Riskleri özetleyip insan onayına sunar.', primarySafeActionLabel: 'Risk özetini aç', secondarySafeActionLabels: COMMON_RISK_ACTIONS, missingFieldHints: ['risk kapsamı', 'etki alanı', 'karar sahibi'], riskHints: ['Risk netleşmeden uygulama yapılmaz.'], requiredHumanChecks: ['risk inceleme', 'insan onayı', 'KVKK sınırı'], blockedWriteActions: ['dispatch apply', 'route apply', 'payment/hakediş execute'], blockedPhrases: ['riski uygula', 'onayla', 'yürürlüğe al', 'dispatch yap'], visibleAnswerLead: 'Bu sonuç karar değil, insan onayına sunulacak hazırlık paketidir.', nextSafeStep: 'Risk özetini inceleyip insan onayına sunmak', approvalType: 'risk_review', defaultStatus: 'risky', safetyNotes: ['Risk inceleme taslak seviyesinde kalır.', 'Uygulama açılmaz.'] },
];

const ACTION_PREP_TYPE_BLUEPRINTS = Object.freeze(Object.fromEntries(
  ACTION_PREP_BLUEPRINT_ROWS.map((row) => [row.actionPrepType, createActionPrepBlueprint(row)]),
));

export const COPILOT_ACTION_PREP_OWNER_STACK = Object.freeze([
  shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_VERSION,
  dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_VERSION,
  humanApproval.COPILOT_HUMAN_APPROVAL_VERSION,
]);

export const COPILOT_ACTION_PREP_ROLE_NAMES = Object.freeze(mergeStrings(
  dispatchActionPrep.listCopilotDispatchActionPrepRoles(),
  shiftToAgreementPrep.listCopilotShiftToAgreementPrepRoles(),
  humanApproval.listCopilotHumanApprovalRoles(),
));

export const COPILOT_ACTION_PREP_BLOCKED_ACTIONS = Object.freeze(mergeStrings(
  dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BLOCKED_ACTIONS,
  shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_ACTIONS,
  humanApproval.COPILOT_HUMAN_APPROVAL_BLOCKED_ACTIONS,
  ['shared action-prep owner mutation'],
));

export const COPILOT_ACTION_PREP_NEVER_AUTOMATE = Object.freeze(mergeStrings(
  dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_NEVER_AUTOMATE,
  shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_NEVER_AUTOMATE,
  humanApproval.COPILOT_HUMAN_APPROVAL_NEVER_AUTOMATE,
  ['otomatik shared action-prep owner atama'],
));

export const COPILOT_ACTION_PREP_PUBLIC_PROMISE = Object.freeze(mergeStrings(
  dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_PUBLIC_PROMISE,
  shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_PUBLIC_PROMISE,
  humanApproval.COPILOT_HUMAN_APPROVAL_PUBLIC_PROMISE,
  [
    'Action prep is a read-only owner layer.',
    'Action prep keeps dispatch, shift and human approval in view.',
  ],
));

export const COPILOT_ACTION_PREP_TURKISH_VISIBLE_PHRASES = Object.freeze(mergeStrings(
  dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_TURKISH_VISIBLE_PHRASES,
  shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES,
  [
    'Action prep owner katmanını hazırladım; dispatch, shift ve human approval sınırları tek yerde toplandı.',
    'Bu çıktı karar değil, read-only hazırlık taslağıdır.',
    'Sıradaki güvenli adım: hazırlık paketini insan onayına sunmak.',
  ],
));

export const COPILOT_ACTION_PREP_BOUNDARY_FLAGS = Object.freeze(mergeStrings(
  dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BOUNDARY_FLAGS,
  shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS,
  [
    'sharedOwner=true',
    'readOnly=true',
    'humanApprovalRequired=true',
    'noHumanApprovalBypass=true',
    'noWriteAction=true',
  ],
));

export const COPILOT_ACTION_PREP_EXECUTION_STATE = DEFAULT_EXECUTION_STATE;
export const COPILOT_ACTION_PREP_NEXT_SAFE_STEP = DEFAULT_SAFE_STEP;

export const COPILOT_ACTION_PREP_OWNER = Object.freeze({
  role: 'ACTION_PREP_OWNER',
  visible: true,
  sharedOwner: true,
  version: COPILOT_ACTION_PREP_VERSION,
  sourceMilestones: COPILOT_ACTION_PREP_OWNER_STACK,
});

function buildActionPrepPolicyForRole(role) {
  const normalizedRole = normalizeRole(role);
  return Object.freeze({
    role: normalizedRole,
    visible: true,
    sharedOwner: true,
    version: COPILOT_ACTION_PREP_VERSION,
    owner: COPILOT_ACTION_PREP_OWNER,
    ownerStack: COPILOT_ACTION_PREP_OWNER_STACK,
    sourceCapabilities: COPILOT_ACTION_PREP_SOURCE_CAPABILITIES,
    blockedRuntimeAction: COPILOT_ACTION_PREP_BLOCKED_ACTIONS,
    neverAutomate: COPILOT_ACTION_PREP_NEVER_AUTOMATE,
    publicPromise: COPILOT_ACTION_PREP_PUBLIC_PROMISE,
    turkishVisiblePhrases: COPILOT_ACTION_PREP_TURKISH_VISIBLE_PHRASES,
    boundaryFlags: COPILOT_ACTION_PREP_BOUNDARY_FLAGS,
    executionState: COPILOT_ACTION_PREP_EXECUTION_STATE,
    nextSafeStep: COPILOT_ACTION_PREP_NEXT_SAFE_STEP,
    dispatchPolicy: dispatchActionPrep.getCopilotDispatchActionPrepPolicy(normalizedRole),
    shiftPolicy: shiftToAgreementPrep.getCopilotShiftToAgreementPrepPolicy(normalizedRole),
    humanApprovalPolicy: humanApproval.getCopilotHumanApprovalPolicy(normalizedRole),
    humanApprovalChecklist: humanApproval.COPILOT_HUMAN_APPROVAL_CHECKLIST,
    humanApprovalFutureLines: humanApproval.COPILOT_HUMAN_APPROVAL_FUTURE_LINES,
  });
}

export const COPILOT_ACTION_PREP_POLICY = Object.freeze(Object.fromEntries(
  COPILOT_ACTION_PREP_ROLE_NAMES.map((role) => [role, buildActionPrepPolicyForRole(role)]),
));

function isEnvelopeLike(value) {
  return Boolean(value && typeof value === 'object' && (value.actionPrepId || value.proposedPreparation || value.safetyBoundary || value.visibleAnswer || value.chips));
}

export function listCopilotActionPrepSourceCapabilities() {
  return [...COPILOT_ACTION_PREP_SOURCE_CAPABILITIES];
}

export function listCopilotActionPrepTypes() {
  return [...COPILOT_ACTION_PREP_TYPES];
}

export function listBlockedActionPrepWriteActions() {
  return mergeStrings(
    COPILOT_ACTION_PREP_BLOCKED_ACTIONS,
    dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BLOCKED_ACTIONS,
    shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_ACTIONS,
    humanApproval.COPILOT_HUMAN_APPROVAL_BLOCKED_ACTIONS,
    COPILOT_ACTION_PREP_BLOCKED_EXECUTION_PHRASES,
    ACTION_PREP_BLUEPRINT_ROWS.flatMap((row) => row.blockedWriteActions || []),
  );
}

export function isActionPrepWriteActionBlocked(value) {
  const text = compactActionPrepText(value);
  if (!text) return false;
  return listBlockedActionPrepWriteActions().some((entry) => text.includes(compactActionPrepText(entry)));
}

export function detectActionPrepIntent(input = {}) {
  const text = normalizeText(firstNonEmpty(
    input.message,
    input.rawMessage,
    input.rawReply,
    input.prompt,
    input.query,
    input.text,
    '',
  ));
  const questionType = String(firstNonEmpty(input.questionType, input.intentType, input.flowType, '')).trim().toUpperCase();
  const matchedRule = ACTION_PREP_INTENT_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(text)));
  const blockedExecution = isActionPrepWriteActionBlocked(text);
  const sourceCapability = resolveSourceCapability(firstNonEmpty(matchedRule?.sourceCapability, input.sourceCapability, input.source, input.actionPrepType, 'generic'));
  const actionPrepType = firstNonEmpty(matchedRule?.actionPrepType, COPILOT_ACTION_PREP_SOURCE_TO_TYPE[sourceCapability], blockedExecution ? 'generic_blocker_resolution_prep' : 'generic_blocker_resolution_prep');
  return Object.freeze({
    explicit: Boolean(matchedRule || blockedExecution || /action[-_ ]?prep|hazırlık/.test(text) || /ACTION_PREP/i.test(questionType)),
    detected: Boolean(matchedRule),
    blockedExecution,
    message: text,
    questionType,
    matchedSignal: firstNonEmpty(matchedRule?.actionPrepType, blockedExecution ? 'blocked_write_action' : ''),
    sourceCapability,
    actionPrepType: ACTION_PREP_TYPE_BLUEPRINTS[actionPrepType] ? actionPrepType : 'generic_blocker_resolution_prep',
    role: normalizeRole(firstNonEmpty(input.role, input.effectiveRole, input.userRole, 'COMPANY')),
    approvalType: normalizeApprovalType(firstNonEmpty(input.approvalType, 'review_only')),
    confidence: matchedRule ? 1 : (blockedExecution ? 0.8 : 0.3),
  });
}

export function normalizeActionPrepSource(value) {
  const sourceCapability = resolveSourceCapability(value);
  const actionPrepType = COPILOT_ACTION_PREP_SOURCE_TO_TYPE[sourceCapability] || 'generic_blocker_resolution_prep';
  return Object.freeze({
    sourceCapability,
    actionPrepType,
    blueprint: ACTION_PREP_TYPE_BLUEPRINTS[actionPrepType] || ACTION_PREP_TYPE_BLUEPRINTS.generic_blocker_resolution_prep,
  });
}

function resolveActionPrepBlueprint(actionPrepType, sourceCapability, input = {}) {
  const normalizedType = String(actionPrepType || '').trim();
  if (ACTION_PREP_TYPE_BLUEPRINTS[normalizedType]) return ACTION_PREP_TYPE_BLUEPRINTS[normalizedType];
  const source = resolveSourceCapability(sourceCapability);
  const mappedType = COPILOT_ACTION_PREP_SOURCE_TO_TYPE[source];
  if (mappedType && ACTION_PREP_TYPE_BLUEPRINTS[mappedType]) return ACTION_PREP_TYPE_BLUEPRINTS[mappedType];
  const detectedType = detectActionPrepIntent(input).actionPrepType;
  return ACTION_PREP_TYPE_BLUEPRINTS[detectedType] || ACTION_PREP_TYPE_BLUEPRINTS.generic_blocker_resolution_prep;
}

export function buildActionPrepInput(input = {}) {
  const role = normalizeRole(firstNonEmpty(input.role, input.effectiveRole, input.userRole, 'COMPANY'));
  const message = firstNonEmpty(input.message, input.rawMessage, input.rawReply, input.prompt, input.query, input.text, '');
  const normalizedSource = normalizeActionPrepSource(firstNonEmpty(input.sourceCapability, input.actionPrepType, input.source, 'generic'));
  const detected = detectActionPrepIntent({ ...input, message, role, sourceCapability: normalizedSource.sourceCapability });
  const blueprint = resolveActionPrepBlueprint(firstNonEmpty(input.actionPrepType, detected.actionPrepType, normalizedSource.actionPrepType), firstNonEmpty(input.sourceCapability, normalizedSource.sourceCapability), input);
  return Object.freeze({
    role,
    message,
    locale: firstNonEmpty(input.locale, 'tr'),
    sourceCapability: blueprint.sourceCapability,
    actionPrepType: blueprint.actionPrepType,
    blueprint,
    currentState: input.currentState && typeof input.currentState === 'object'
      ? Object.freeze({
        ...input.currentState,
        role,
        sourceCapability: blueprint.sourceCapability,
        actionPrepType: blueprint.actionPrepType,
      })
      : Object.freeze({
        role,
        sourceCapability: blueprint.sourceCapability,
        actionPrepType: blueprint.actionPrepType,
      }),
    sourceRef: firstNonEmpty(input.sourceRef, input.reference, ''),
    explicitPrep: Boolean(input.explicitPrep || detected.explicit),
    detected: detected.detected,
    blockedExecution: Boolean(input.blockedExecution || detected.blockedExecution),
    matchedSignal: detected.matchedSignal,
    confidence: Number(firstNonEmpty(input.confidence, detected.confidence, 0.5)),
    approvalType: normalizeApprovalType(firstNonEmpty(input.approvalType, blueprint.approvalType, 'review_only')),
    status: normalizeStatus(firstNonEmpty(input.status, blueprint.defaultStatus, 'needs_clarification'), blueprint.defaultStatus),
    missingFields: Object.freeze(mergeStrings(listFromValue(input.missingFields))),
    blockers: Object.freeze(mergeStrings(listFromValue(input.blockers))),
    risks: Object.freeze(mergeStrings(listFromValue(input.risks))),
    requiredHumanChecks: Object.freeze(mergeStrings(listFromValue(input.requiredHumanChecks))),
    roleProfile: input.roleProfile || null,
    screenContext: input.screenContext || null,
    contextPriority: input.contextPriority || null,
    analysis: input.analysis || null,
    taskState: input.taskState || null,
    conversationState: input.conversationState || null,
    nextSafeStep: firstNonEmpty(input.nextSafeStep, blueprint.nextSafeStep, DEFAULT_SAFE_STEP),
  });
}

export function buildActionPrepSafetyBoundary(input = {}) {
  const envelope = isEnvelopeLike(input) ? input : buildActionPrepEnvelope(input);
  return Object.freeze({
    sharedOwner: true,
    readOnly: true,
    approvalRequired: true,
    draftOnly: true,
    noWriteAction: true,
    notExecuted: true,
    noDispatchApply: true,
    noRouteApply: true,
    noAgreementExecute: true,
    noPaymentExecute: true,
    noMessageSend: true,
    noProviderCredentialUse: true,
    blockedRuntimeAction: Object.freeze(listBlockedActionPrepWriteActions()),
    blockedPhrases: Object.freeze(mergeStrings(
      COPILOT_ACTION_PREP_BLOCKED_EXECUTION_PHRASES,
      envelope.blueprint?.blockedPhrases || [],
    )),
    boundaryFlags: Object.freeze(mergeStrings(COPILOT_ACTION_PREP_BOUNDARY_FLAGS, ['noWriteAction=true'])),
    executionState: DEFAULT_EXECUTION_STATE,
    nextSafeStep: firstNonEmpty(envelope.nextSafeStep, DEFAULT_SAFE_STEP),
  });
}

export function buildActionPrepMissingFieldSummary(input = {}) {
  const envelope = isEnvelopeLike(input) ? input : buildActionPrepEnvelope(input);
  const missingFields = mergeStrings(envelope.missingFields, envelope.blueprint?.missingFieldHints);
  return Object.freeze({
    title: `${firstNonEmpty(envelope.cardTitle, envelope.blueprint?.cardTitle, 'Hazırlık')} eksik alan özeti`,
    summary: missingFields.length
      ? `Eksik alanlar: ${missingFields.map(maskActionPrepSensitiveValue).join(', ')}.`
      : 'Eksik alan bulunmadı.',
    items: Object.freeze(missingFields.map(maskActionPrepSensitiveValue)),
    blocked: missingFields.length > 0,
    nextSafeStep: firstNonEmpty(envelope.nextSafeStep, DEFAULT_SAFE_STEP),
    approvalType: firstNonEmpty(envelope.approvalType, 'review_only'),
  });
}

export function buildActionPrepRiskSummary(input = {}) {
  const envelope = isEnvelopeLike(input) ? input : buildActionPrepEnvelope(input);
  const risks = mergeStrings(envelope.risks, envelope.blueprint?.riskHints);
  const blockers = mergeStrings(envelope.blockers, envelope.blueprint?.blockedWriteActions);
  return Object.freeze({
    title: `${firstNonEmpty(envelope.cardTitle, envelope.blueprint?.cardTitle, 'Hazırlık')} risk özeti`,
    summary: risks.length
      ? `Riskler: ${risks.map(maskActionPrepSensitiveValue).join(', ')}.`
      : 'Risk özeti var ama blokaj yok.',
    items: Object.freeze(risks.map(maskActionPrepSensitiveValue)),
    blockers: Object.freeze(blockers.map(maskActionPrepSensitiveValue)),
    severity: envelope.status === 'risky' ? 'high' : 'medium',
    nextSafeStep: firstNonEmpty(envelope.nextSafeStep, DEFAULT_SAFE_STEP),
  });
}

export function buildActionPrepHumanApprovalHandoff(input = {}) {
  const envelope = isEnvelopeLike(input) ? input : buildActionPrepEnvelope(input);
  return Object.freeze({
    approvalType: firstNonEmpty(envelope.approvalType, 'review_only'),
    needsHumanApproval: true,
    reviewerRole: envelope.role,
    reviewerLabel: envelope.roleProfile?.label || envelope.role,
    handoffText: `İnsan onayı gerekli: ${firstNonEmpty(envelope.nextSafeStep, DEFAULT_SAFE_STEP)}.`,
    summary: firstNonEmpty(
      envelope.visibleAnswerLead,
      envelope.blueprint?.summary,
      'Hazırlık paketi insan onayına sunulur.',
    ),
    checklist: humanApproval.COPILOT_HUMAN_APPROVAL_CHECKLIST,
    futureLines: humanApproval.COPILOT_HUMAN_APPROVAL_FUTURE_LINES,
    nextSafeStep: firstNonEmpty(envelope.nextSafeStep, DEFAULT_SAFE_STEP),
  });
}

export function buildActionPrepCardDraft(input = {}) {
  const envelope = isEnvelopeLike(input) ? input : buildActionPrepEnvelope(input);
  return Object.freeze({
    title: firstNonEmpty(envelope.cardTitle, envelope.blueprint?.cardTitle, 'Hazırlık kartı'),
    subtitle: firstNonEmpty(envelope.cardSubtitle, envelope.blueprint?.cardSubtitle, ''),
    summary: firstNonEmpty(envelope.summary, envelope.blueprint?.summary, ''),
    sourceLabel: firstNonEmpty(envelope.sourceLabel, envelope.blueprint?.sourceLabel, ''),
    actionPrepType: envelope.actionPrepType,
    sourceCapability: envelope.sourceCapability,
    status: normalizeStatus(firstNonEmpty(envelope.status, envelope.blueprint?.defaultStatus, 'needs_clarification'), 'needs_clarification'),
    approvalType: firstNonEmpty(envelope.approvalType, envelope.blueprint?.approvalType, 'review_only'),
    draftOnly: true,
    approvalRequired: true,
    primarySafeActionLabel: firstNonEmpty(envelope.blueprint?.primarySafeActionLabel, ''),
    secondarySafeActionLabels: Object.freeze(mergeStrings(envelope.blueprint?.secondarySafeActionLabels || [])),
  });
}

export function buildActionPrepSafetyNotes(input = {}) {
  const envelope = isEnvelopeLike(input) ? input : buildActionPrepEnvelope(input);
  return Object.freeze(mergeStrings(
    COPILOT_ACTION_PREP_SAFETY_NOTES,
    envelope.blueprint?.safetyNotes || [],
    envelope.missingFields?.length ? [`missing=${envelope.missingFields.join('|')}`] : [],
    envelope.risks?.length ? [`risk=${envelope.risks.join('|')}`] : [],
    envelope.blockers?.length ? [`blocker=${envelope.blockers.join('|')}`] : [],
  ));
}

export function buildActionPrepVisibleAnswer(input = {}) {
  const envelope = isEnvelopeLike(input) ? input : buildActionPrepEnvelope(input);
  const missingFields = (envelope.missingFields || []).slice(0, 3);
  const risks = (envelope.risks || []).slice(0, 2);
  const blockers = (envelope.blockers || []).slice(0, 3);
  const parts = [
    firstNonEmpty(envelope.visibleAnswerLead, envelope.blueprint?.visibleAnswerLead, COPILOT_ACTION_PREP_VISIBLE_ANSWER_TEMPLATES[0], DEFAULT_VISIBLE_LEAD),
    firstNonEmpty(envelope.blueprint?.cardTitle, envelope.cardTitle, 'Hazırlık kartı') + ' hazırlandı.',
    `Kaynak: ${firstNonEmpty(envelope.blueprint?.sourceLabel, envelope.sourceLabel, envelope.sourceCapability)}.`,
    `Durum: ${envelope.status === 'blocked' ? 'insan onayı bekleyen blokaj taslağı' : 'read-only hazırlık'}.`,
    'No write-action.',
    'No dispatch apply.',
    'No route apply.',
    'No agreement / contract execute.',
    'No payment / hakediş execute.',
    'No messaging / email / SMS / push.',
    'No DB write.',
    'No audit event write.',
    'No provider credential management.',
    'No route / service / prisma diff.',
    missingFields.length ? `Eksikler: ${missingFields.map(maskActionPrepSensitiveValue).join(', ')}.` : '',
    risks.length ? `Riskler: ${risks.map(maskActionPrepSensitiveValue).join(', ')}.` : '',
    blockers.length ? `Blokajlar: ${blockers.map(maskActionPrepSensitiveValue).join(', ')}.` : '',
    `Sıradaki güvenli adım: ${firstNonEmpty(envelope.nextSafeStep, DEFAULT_SAFE_STEP)}.`,
  ];
  return limitText(mergeStrings(parts).join(' '), 1200);
}

export function buildActionPrepChips(input = {}) {
  const envelope = isEnvelopeLike(input) ? input : buildActionPrepEnvelope(input);
  const chips = mergeStrings([
    envelope.role,
    envelope.sourceCapability,
    envelope.actionPrepType,
    envelope.status,
    envelope.approvalType,
    envelope.draftOnly ? 'draftOnly' : '',
    envelope.noWriteAction ? 'noWriteAction' : '',
    envelope.approvalRequired ? 'humanApprovalRequired' : '',
    envelope.nextSafeStep ? `next:${envelope.nextSafeStep}` : '',
    ...(envelope.missingFields || []).slice(0, 2).map((item) => `missing:${item}`),
    ...(envelope.risks || []).slice(0, 2).map((item) => `risk:${item}`),
    ...(envelope.blockers || []).slice(0, 2).map((item) => `blocker:${item}`),
  ]);
  return Object.freeze(chips);
}

export function buildActionPrepEnvelope(input = {}) {
  const normalizedInput = buildActionPrepInput(input);
  const blueprint = normalizedInput.blueprint || resolveActionPrepBlueprint(normalizedInput.actionPrepType, normalizedInput.sourceCapability, normalizedInput);
  const role = normalizedInput.role;
  const missingFields = freezeStrings(normalizedInput.missingFields, blueprint.missingFieldHints);
  const blockers = freezeStrings(normalizedInput.blockers, blueprint.blockedWriteActions, listBlockedActionPrepWriteActions());
  const risks = freezeStrings(normalizedInput.risks, blueprint.riskHints);
  const requiredHumanChecks = freezeStrings(normalizedInput.requiredHumanChecks, blueprint.requiredHumanChecks);
  const approvalType = normalizeApprovalType(firstNonEmpty(normalizedInput.approvalType, blueprint.approvalType, 'review_only'));
  const status = normalizeStatus(firstNonEmpty(normalizedInput.status, blueprint.defaultStatus, 'needs_clarification'), blueprint.defaultStatus);
  const actionPrepId = `ap-${normalizedInput.sourceCapability}-${blueprint.actionPrepType}-${simpleHash([
    role,
    normalizedInput.sourceCapability,
    blueprint.actionPrepType,
    normalizedInput.sourceRef,
    normalizedInput.currentState?.selectedRecordSummary || '',
    missingFields.join('|'),
    blockers.join('|'),
    risks.join('|'),
  ].join('|')).slice(0, 12)}`;

  const envelope = {
    actionPrepId,
    version: COPILOT_ACTION_PREP_VERSION,
    role,
    sourceCapability: blueprint.sourceCapability,
    actionPrepType: blueprint.actionPrepType,
    sourceLabel: blueprint.sourceLabel,
    cardTitle: blueprint.cardTitle,
    cardSubtitle: blueprint.cardSubtitle,
    summary: blueprint.summary,
    status,
    approvalType,
    defaultStatus: blueprint.defaultStatus,
    explicitPrep: Boolean(normalizedInput.explicitPrep),
    detected: Boolean(normalizedInput.detected),
    blockedExecution: Boolean(normalizedInput.blockedExecution),
    matchedSignal: normalizedInput.matchedSignal,
    confidence: normalizedInput.confidence,
    message: normalizedInput.message,
    currentState: Object.freeze({
      ...normalizedInput.currentState,
      role,
      sourceCapability: blueprint.sourceCapability,
      actionPrepType: blueprint.actionPrepType,
      missingFields,
      blockers,
      risks,
      requiredHumanChecks,
      approvalRequired: true,
      draftOnly: true,
      writeAction: false,
      noWriteAction: true,
      notExecuted: true,
      nextSafeStep: firstNonEmpty(normalizedInput.nextSafeStep, blueprint.nextSafeStep, DEFAULT_SAFE_STEP),
    }),
    proposedPreparation: Object.freeze({
      title: blueprint.cardTitle,
      subtitle: blueprint.cardSubtitle,
      summary: blueprint.summary,
      sourceLabel: blueprint.sourceLabel,
      primarySafeActionLabel: blueprint.primarySafeActionLabel,
      secondarySafeActionLabels: blueprint.secondarySafeActionLabels,
      draftOnly: true,
    }),
    missingFields,
    blockers,
    risks,
    requiredHumanChecks,
    approvalRequired: true,
    draftOnly: true,
    writeAction: false,
    noWriteAction: true,
    notExecuted: true,
    executionState: DEFAULT_EXECUTION_STATE,
    nextSafeStep: firstNonEmpty(normalizedInput.nextSafeStep, blueprint.nextSafeStep, DEFAULT_SAFE_STEP),
    visibleAnswerLead: blueprint.visibleAnswerLead,
    visibleAnswer: '',
    chips: [],
    safetyNotes: [],
    policy: getCopilotActionPrepPolicy(role),
    humanApprovalPolicy: humanApproval.getCopilotHumanApprovalPolicy(role),
    dispatchActionPrep: dispatchActionPrep.composeDispatchActionPrepAnswer({ input: normalizedInput, role, locale: normalizedInput.locale || 'tr' }),
    shiftToAgreementPrep: shiftToAgreementPrep.buildShiftToAgreementPrepPack({ ...normalizedInput, role }),
    roleProfile: normalizedInput.roleProfile || null,
    locale: normalizedInput.locale || 'tr',
    sourceRef: normalizedInput.sourceRef,
  };

  envelope.safetyNotes = buildActionPrepSafetyNotes(envelope);
  envelope.visibleAnswer = buildActionPrepVisibleAnswer(envelope);
  envelope.chips = buildActionPrepChips(envelope);

  return Object.freeze(envelope);
}

export function buildActionPrepOwnerPack(input = {}) {
  const envelope = buildActionPrepEnvelope(input);
  return Object.freeze({
    owner: COPILOT_ACTION_PREP_OWNER,
    ownerStack: COPILOT_ACTION_PREP_OWNER_STACK,
    policy: getCopilotActionPrepPolicy(envelope.role),
    humanApprovalPolicy: humanApproval.getCopilotHumanApprovalPolicy(envelope.role),
    humanApprovalChecklist: humanApproval.COPILOT_HUMAN_APPROVAL_CHECKLIST,
    humanApprovalFutureLines: humanApproval.COPILOT_HUMAN_APPROVAL_FUTURE_LINES,
    actionPrepEnvelope: envelope,
    actionCardDraft: buildActionPrepCardDraft(envelope),
    missingFieldSummary: buildActionPrepMissingFieldSummary(envelope),
    riskSummary: buildActionPrepRiskSummary(envelope),
    humanApprovalHandoff: buildActionPrepHumanApprovalHandoff(envelope),
    safetyBoundary: buildActionPrepSafetyBoundary(envelope),
    safetyNotes: envelope.safetyNotes,
    visibleAnswer: envelope.visibleAnswer,
    chips: envelope.chips,
    nextSafeStep: envelope.nextSafeStep,
    actionPrepId: envelope.actionPrepId,
    role: envelope.role,
    sourceCapability: envelope.sourceCapability,
    actionPrepType: envelope.actionPrepType,
    dispatchActionPrep: envelope.dispatchActionPrep,
    shiftToAgreementPrep: envelope.shiftToAgreementPrep,
    blockedActions: COPILOT_ACTION_PREP_BLOCKED_ACTIONS,
    neverAutomate: COPILOT_ACTION_PREP_NEVER_AUTOMATE,
    publicPromise: COPILOT_ACTION_PREP_PUBLIC_PROMISE,
    turkishVisiblePhrases: COPILOT_ACTION_PREP_TURKISH_VISIBLE_PHRASES,
    boundaryFlags: COPILOT_ACTION_PREP_BOUNDARY_FLAGS,
    executionState: COPILOT_ACTION_PREP_EXECUTION_STATE,
  });
}

export function composeActionPrepAnswer(input = {}) {
  const envelope = buildActionPrepEnvelope(input);
  const cardDraft = buildActionPrepCardDraft(envelope);
  const missingFieldSummary = buildActionPrepMissingFieldSummary(envelope);
  const riskSummary = buildActionPrepRiskSummary(envelope);
  const humanApprovalHandoff = buildActionPrepHumanApprovalHandoff(envelope);
  const safetyBoundary = buildActionPrepSafetyBoundary(envelope);
  return Object.freeze({
    intentType: envelope.actionPrepType,
    actionPrepType: envelope.actionPrepType,
    sourceCapability: envelope.sourceCapability,
    role: envelope.role,
    actionPrepEnvelope: envelope,
    actionCardDraft: cardDraft,
    missingFieldSummary,
    riskSummary,
    humanApprovalHandoff,
    safetyBoundary,
    safetyNotes: envelope.safetyNotes,
    nextSafeStep: envelope.nextSafeStep,
    approvalRequired: true,
    draftOnly: true,
    writeAction: false,
    noWriteAction: true,
    notExecuted: true,
    executionState: envelope.executionState,
    visibleAnswer: envelope.visibleAnswer,
    chips: envelope.chips,
  });
}

function rule(actionPrepType, sourceCapability, patterns) {
  return Object.freeze({
    actionPrepType,
    sourceCapability,
    patterns: Object.freeze(patterns),
  });
}

const ACTION_PREP_INTENT_RULES = Object.freeze([
  rule('demand_to_rfq_prep', 'demand_intake', [
    /(?:rfq|talep|demand|intake).*(?:hazırla|hazirla|taslak|önizle|onizle|paket)/i,
    /(?:hazırla|hazirla|taslak).*(?:rfq|talep|istek)/i,
  ]),
  rule('rfq_to_supplier_matching_prep', 'rfq_prep', [
    /(?:rfq).*(?:eşleştir|eslestir|matching|aday|shortlist)/i,
    /(?:supplier matching|tedarikçi eşleştirme|tedarikci eslestirme)/i,
  ]),
  rule('supplier_to_offer_collection_prep', 'supplier_matching', [
    /(?:teklif topla|offer collect|offer collection|teklif toplama)/i,
    /(?:kısa liste|kisa liste).*(?:teklif|offer)/i,
  ]),
  rule('offer_collection_to_analysis_prep', 'supplier_offer_collect', [
    /(?:teklif|offer).*(?:analiz|analysis|karşılaştır|karsilastir|risk)/i,
    /(?:comparison matrix|risk summary|teklif analizi)/i,
  ]),
  rule('offer_to_negotiation_prep', 'offer_analysis', [
    /(?:pazarlık|negotiation|counter offer|karşı teklif|karsi teklif)/i,
  ]),
  rule('offer_to_recommendation_prep', 'negotiation_assist', [
    /(?:öneri|oneri|recommendation|öneri paketi|teklif öner)/i,
  ]),
  rule('recommendation_to_agreement_prep', 'offer_recommendation', [
    /(?:sözleşme|sozlesme|agreement|contract).*(?:hazırla|hazirla|taslak|paket)/i,
    /(?:agreement prep|contract prep|sözleşme hazırlık)/i,
  ]),
  rule('agreement_to_dispatch_prep', 'shift_to_agreement_prep', [
    /(?:dispatch|rota|route|vardiya|shift).*(?:hazırla|hazirla|taslak|paket)/i,
    /(?:dispatch prep|route prep|shift prep)/i,
  ]),
  rule('dispatch_to_human_approval_prep', 'dispatch_action_prep', [
    /(?:insan onayı|human approval|onay paketi|review only)/i,
    /(?:onay).*?(?:dispatch|route|agreement|sözleşme|sozlesme)/i,
  ]),
  rule('missing_field_collection_prep', 'generic', [
    /(?:eksik alan|missing field|hangi bilgi|hangi alan)/i,
    /(?:eksikleri|eksik bilgileri).*(?:topla|listele|sırala|sirala)/i,
  ]),
  rule('risk_review_prep', 'generic', [
    /(?:risk|uyarı|uyari|blokaj|engel).*(?:özet|ozet|incele|review)/i,
    /(?:risk review|risk summary)/i,
  ]),
  rule('generic_blocker_resolution_prep', 'generic', [
    /(?:belirsiz|genel engel|blocked|engel çözümü|engel cozum)/i,
  ]),
]);

export function listCopilotActionPrepRoles() {
  return [...COPILOT_ACTION_PREP_ROLE_NAMES];
}

export function getCopilotActionPrepPolicy(role) {
  const normalizedRole = normalizeRole(role);
  return COPILOT_ACTION_PREP_POLICY[normalizedRole] || COPILOT_ACTION_PREP_POLICY.COMPANY || null;
}
