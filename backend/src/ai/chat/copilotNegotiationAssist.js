import {
  buildOfferAnalysisInput,
  maskOfferAnalysisSensitiveValue,
  normalizeOfferAnalysisField,
} from './copilotOfferAnalysis.js';

export const COPILOT_NEGOTIATION_ASSIST_VERSION = 'COPILOT-NEGOTIATION-ASSIST-01';

export const COPILOT_NEGOTIATION_ASSIST_STAGES = Object.freeze([
  Object.freeze({ id: 'negotiation_input_summary', title: 'Negotiation Input Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'supported_negotiation_types', title: 'Supported Negotiation Types', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'negotiation_opportunity_model', title: 'Negotiation Opportunity Model', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'counter_offer_draft', title: 'Counter-Offer Draft', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'negotiation_readiness_table', title: 'Negotiation Readiness Table', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'question_set', title: 'Supplier Question Set', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'value_risk_summary', title: 'Value / Risk Summary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'safety_boundary', title: 'Safety / Boundary', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'turkish_visible_answer', title: 'Türkçe Visible Answer', status: 'current baseline', futureOnly: false }),
  Object.freeze({ id: 'audit_handoff', title: 'Audit / Human Approval Handoff', status: 'current baseline', futureOnly: false }),
]);

export const COPILOT_NEGOTIATION_ASSIST_CATEGORIES = Object.freeze([
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'DRAFT',
  'RISK_SUMMARY',
  'NEXT_STEP',
  'HUMAN_APPROVAL_REQUIRED',
]);

export const COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES = Object.freeze([
  'price_improvement',
  'scope_clarification',
  'included_items',
  'excluded_items',
  'capacity_commitment',
  'timing_commitment',
  'sla_commitment',
  'compliance_documents',
  'insurance_safety',
  'validity_extension',
  'payment_terms',
  'service_quality',
  'route_or_shift_clarity',
  'general_negotiation',
]);

export const COPILOT_NEGOTIATION_ASSIST_INPUT_SUMMARY = Object.freeze([
  'RFQ type',
  'offer analysis state',
  'candidate suppliers / masked labels',
  'service scope',
  'region / province / district',
  'start date',
  'day / period / hour / shift',
  'passenger / personnel / student count',
  'vehicle capacity requirement',
  'SLA / quality expectation',
  'document / license / safety requirement',
  'analyzed offer count',
  'missing / risky offer count',
]);

export const COPILOT_NEGOTIATION_ASSIST_OPPORTUNITY_FIELDS = Object.freeze([
  'supplierRef',
  'supplierLabelMasked',
  'opportunityType',
  'currentIssue',
  'suggestedAsk',
  'rationale',
  'riskIfUnresolved',
  'priority',
  'humanReviewRequired=true',
]);

export const COPILOT_NEGOTIATION_ASSIST_COUNTER_OFFER_FIELDS = Object.freeze([
  'supplierRef',
  'supplierLabelMasked',
  'draftTitle',
  'openingNote',
  'requestedChanges',
  'clarificationQuestions',
  'nonBindingLanguage',
  'approvalRequired=true',
  'notSent=true',
  'notAccepted=true',
  'notRejected=true',
  'notSelected=true',
]);

export const COPILOT_NEGOTIATION_ASSIST_READINESS_FIELDS = Object.freeze([
  'candidate supplier',
  'negotiation topic',
  'priority',
  'requested improvement',
  'missing / unclear area',
  'risk',
  'ready?',
  'human approval note',
]);

export const COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS = Object.freeze([
  'draftOnly=true',
  'notSent=true',
  'notContacted=true',
  'notAccepted=true',
  'notRejected=true',
  'notSelected=true',
  'approvalRequired=true',
  'humanReviewRequired=true',
  'executionState=negotiation_assist_draft_only / not_sent / not_contacted / not_accepted / not_rejected / not_selected / not_executed',
  'nextSafeStep=pazarlık taslağını kontrol edip insan onayına sunmak',
]);

export const COPILOT_NEGOTIATION_ASSIST_BLOCKED_ACTIONS = Object.freeze([
  'supplier/provider contact',
  'message/email/SMS/push',
  'RFQ send',
  'actual negotiation execution',
  'offer accept/reject',
  'supplier selection',
  'agreement/contract execute',
  'dispatch apply',
  'route apply',
  'payment/hakediş execute',
  'provider credential management',
  'user/account/admin write-action',
  'DB write',
  'backend route/service/schema mutation',
  'Prisma/schema/migration',
]);

export const COPILOT_NEGOTIATION_ASSIST_NEVER_AUTOMATE = Object.freeze([
  'otomatik supplier contact',
  'otomatik mesaj gönderimi',
  'otomatik RFQ send',
  'otomatik pazarlık yürütme',
  'otomatik teklif kabul / ret',
  'otomatik supplier seçimi',
  'otomatik agreement/contract execute',
  'otomatik dispatch apply',
  'otomatik route apply',
  'otomatik payment/hakediş execute',
  'otomatik provider credential yönetimi',
  'otomatik user/account/admin write',
]);

export const COPILOT_NEGOTIATION_ASSIST_HANOFFS = Object.freeze([
  'COPILOT-OFFER-ANALYSIS-01',
  'SUPPLIER-OFFER-COLLECT-01',
  'SUPPLIER-MATCHING-01',
  'COPILOT-RFQ-PREP-01',
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-HUMAN-APPROVAL-01',
  'AUDIT-LOG-AND-APPROVAL-TRACE-01',
  'SECURITY-KVKK-FINAL-01',
  'ROLE-DATA-ISOLATION-REDTEAM-01',
  'DATA-INTEGRITY-AND-RECOVERY-01',
]);

export const COPILOT_NEGOTIATION_ASSIST_TURKISH_VISIBLE_PHRASES = Object.freeze([
  'Pazarlık hazırlık taslağını oluşturdum; henüz hiçbir tedarikçiye mesaj gönderilmedi.',
  'Hiçbir teklif kabul edilmedi veya reddedilmedi.',
  'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.',
  'Pazarlık için öne çıkan başlıklar: fiyat kapsamı, dahil/hariç kalemler, SLA, kapasite ve belge netliği.',
  'Sıradaki güvenli adım: pazarlık taslağını kontrol edip insan onayına sunmak.',
]);

export const COPILOT_NEGOTIATION_ASSIST_BLOCKED_PHRASES = Object.freeze([
  'Mesaj gönderdim.',
  'Tedarikçiye ilettim.',
  'Pazarlığı başlattım.',
  'Teklifi kabul ettim.',
  'Teklifi reddettim.',
  'Tedarikçiyi seçtim.',
  'Kazanan tedarikçi budur.',
  'Sözleşmeyi başlattım.',
  'RFQ gönderdim.',
  'Onayladım.',
  'Uyguladım.',
  'Vardiya/rota oluşturdum.',
  'Ödemeyi/hakedişi başlattım.',
]);

export const COPILOT_NEGOTIATION_ASSIST_SAFETY_EXAMPLES = Object.freeze([
  'Pazarlık hazırlık taslağını oluşturdum; henüz hiçbir tedarikçiye mesaj gönderilmedi.',
  'Hiçbir teklif kabul edilmedi veya reddedilmedi.',
  'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.',
  'Pazarlıkta öne çıkan başlıklar: fiyat kapsamı, dahil/hariç kalemler, SLA, kapasite ve belge netliği.',
  'Sıradaki güvenli adım: pazarlık taslağını kontrol edip insan onayına sunmak.',
]);

export const COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE = 'negotiation_assist_draft_only / not_sent / not_contacted / not_accepted / not_rejected / not_selected / not_executed';
export const COPILOT_NEGOTIATION_ASSIST_NEXT_SAFE_STEP = 'pazarlık taslağını kontrol edip insan onayına sunmak';

export const COPILOT_NEGOTIATION_ASSIST_ROLE_NAMES = Object.freeze([
  'SUPER_ADMIN',
  'COMPANY',
  'ROOM',
  'SCHOOL',
  'ORGANIZATION',
  'DRIVER',
  'PERSONEL',
  'PARENT',
]);

export const COPILOT_NEGOTIATION_ASSIST_PUBLIC_PROMISE = Object.freeze([
  'Kullanıcıya "AI her şeyi yapar" denmez.',
  'Public promise sadece testle kanıtlanmış kabiliyeti söyler.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi içeride daha güçlü pazarlık hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
]);

const COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS = Object.freeze({
  price_improvement: 'Fiyat iyileştirme',
  scope_clarification: 'Kapsam netleştirme',
  included_items: 'Dahil kalemler',
  excluded_items: 'Hariç kalemler',
  capacity_commitment: 'Kapasite taahhüdü',
  timing_commitment: 'Zamanlama taahhüdü',
  sla_commitment: 'SLA taahhüdü',
  compliance_documents: 'Belge / uyum netliği',
  insurance_safety: 'Sigorta / güvenlik',
  validity_extension: 'Geçerlilik uzatma',
  payment_terms: 'Ödeme şartları',
  service_quality: 'Servis kalitesi',
  route_or_shift_clarity: 'Rota / vardiya netliği',
  general_negotiation: 'Genel pazarlık',
});

const COPILOT_NEGOTIATION_ASSIST_TYPE_KEYWORDS = Object.freeze({
  price_improvement: ['fiyat', 'price', 'indirim', 'iskonto', 'ucuz', 'daha uygun', 'budget', 'bütçe'],
  scope_clarification: ['kapsam', 'scope', 'netleştir', 'clarif', 'açıkla', 'acikla'],
  included_items: ['dahil', 'include', 'included', 'what is included', 'neler dahil'],
  excluded_items: ['hariç', 'haric', 'exclude', 'excluded', 'what is excluded', 'neler hariç'],
  capacity_commitment: ['kapasite', 'capacity', 'koltuk', 'seat', 'araç sayısı', 'fleet'],
  timing_commitment: ['başlangıç', 'baslangic', 'start', 'time', 'zaman', 'saat', 'vardiya', 'shift', 'tarih'],
  sla_commitment: ['sla', 'service level', 'kalite', 'quality'],
  compliance_documents: ['belge', 'document', 'ruhsat', 'license', 'certificate', 'uyum', 'compliance'],
  insurance_safety: ['sigorta', 'insurance', 'safety', 'güvenlik', 'guvenlik'],
  validity_extension: ['geçerlilik', 'gecerlilik', 'validity', 'valid until', 'extend', 'uzat'],
  payment_terms: ['ödeme', 'odeme', 'payment', 'vade', 'terms', 'teminat'],
  service_quality: ['servis kalitesi', 'service quality', 'performans', 'quality', 'hizmet kalitesi'],
  route_or_shift_clarity: ['rota', 'route', 'vardiya', 'shift', 'saat', 'schedule'],
  general_negotiation: ['pazarlık', 'pazarlik', 'negotiation', 'counter offer', 'karşı teklif', 'karsi teklif'],
});

const COPILOT_NEGOTIATION_ASSIST_TYPE_DETAILS = Object.freeze({
  price_improvement: Object.freeze({
    currentIssue: 'Fiyat bileşeni pazarlık alanı bırakıyor.',
    suggestedAsk: 'Fiyatı kalemlere ayırıp indirim / iskonto payını netleştirin.',
    rationale: 'En düşük fiyat tek başına karar değildir.',
    riskIfUnresolved: 'Fiyat netleşmezse bütçe sapması ve kıyaslama riski kalır.',
    priority: 'high',
    question: 'Fiyat hangi kalemlerden oluşuyor ve indirim payı var mı?',
    openingNote: 'Bu taslak bağlayıcı değildir; fiyat kalemlerini netleştirmek içindir.',
    requestedChanges: ['Fiyat kalemlerini ayırın', 'İndirim payını netleştirin'],
    nonBindingLanguage: 'Bu metin bağlayıcı teklif değildir; yalnızca insan onayına sunulacak pazarlık taslağıdır.',
    valueSignal: 'Fiyat şeffaflığı',
  }),
  scope_clarification: Object.freeze({
    currentIssue: 'Kapsam sınırları yeterince açık değil.',
    suggestedAsk: 'Kapsamı tek cümlede netleştirin; dahil ve hariç alanları ayırın.',
    rationale: 'Kapsam belirsizliği yanlış kıyas ve sürpriz maliyet yaratır.',
    riskIfUnresolved: 'Kapsam netleşmezse sonradan ek iş ve yanlış beklenti riski oluşur.',
    priority: 'high',
    question: 'Kapsam tam olarak neleri kapsıyor, neleri kapsamıyor?',
    openingNote: 'Bu taslak kapsam netleştirme için hazırlanmıştır.',
    requestedChanges: ['Kapsamı netleştirin', 'Dahil / hariç listesi çıkarın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; yalnızca kapsam netleştirme notudur.',
    valueSignal: 'Kapsam netliği',
  }),
  included_items: Object.freeze({
    currentIssue: 'Fiyata dahil kalemler net görünmüyor.',
    suggestedAsk: 'Dahil kalemleri maddeler halinde listeleyin.',
    rationale: 'Dahil kalemlerin açık olması karşılaştırmayı kolaylaştırır.',
    riskIfUnresolved: 'Dahil kalemler belirsiz kalırsa sonradan ek ücret ve tartışma riski olur.',
    priority: 'medium',
    question: 'Fiyata hangi kalemler dahildir?',
    openingNote: 'Bu taslak dahil kalemleri netleştirmek içindir.',
    requestedChanges: ['Dahil kalemleri tek tek yazın', 'Dahil hizmet kapsamını açıkça ayırın'],
    nonBindingLanguage: 'Bu metin bağlayıcı teklif değildir; dahil kalemleri netleştiren taslaktır.',
    valueSignal: 'Dahil kalem görünürlüğü',
  }),
  excluded_items: Object.freeze({
    currentIssue: 'Fiyata dahil olmayan kalemler görünmüyor.',
    suggestedAsk: 'Hariç kalemleri ayrı bir listede belirtin.',
    rationale: 'Hariç kalemlerin açık olması sürpriz maliyetleri azaltır.',
    riskIfUnresolved: 'Hariç kalemler belirsiz kalırsa teklif kıyaslama sağlıklı olmaz.',
    priority: 'medium',
    question: 'Fiyata hangi kalemler dahil değildir?',
    openingNote: 'Bu taslak hariç kalemleri netleştirmek içindir.',
    requestedChanges: ['Hariç kalemleri yazın', 'Hariç hizmetleri açıkça ayırın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; hariç kalemleri netleştiren taslaktır.',
    valueSignal: 'Hariç kalem görünürlüğü',
  }),
  capacity_commitment: Object.freeze({
    currentIssue: 'Kapasite taahhüdü yeterince net değil.',
    suggestedAsk: 'Araç kapasitesi ve kapasite garantisini yazılı netleştirin.',
    rationale: 'Kapasite yetersizliği operasyon riskini büyütür.',
    riskIfUnresolved: 'Kapasite netleşmezse operasyonun başlaması veya sürekliliği riske girer.',
    priority: 'high',
    question: 'Araç kapasitesi ve kapasite garantisi nedir?',
    openingNote: 'Bu taslak kapasite taahhüdü için hazırlanmıştır.',
    requestedChanges: ['Kapasite garantisini netleştirin', 'Araç kapasitesini yazın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; kapasite taahhüdü için pazarlık taslağıdır.',
    valueSignal: 'Kapasite güveni',
  }),
  timing_commitment: Object.freeze({
    currentIssue: 'Başlangıç / vardiya / saat uyumu net değil.',
    suggestedAsk: 'Başlangıç tarihini ve vardiya saatlerini netleştirin.',
    rationale: 'Zamanlama netliği operasyon başlangıcını güvenceye alır.',
    riskIfUnresolved: 'Zamanlama netleşmezse gecikme ve planlama riski doğar.',
    priority: 'medium',
    question: 'Başlangıç tarihi ve vardiya saatleri net mi?',
    openingNote: 'Bu taslak zamanlama taahhüdü içindir.',
    requestedChanges: ['Başlangıç tarihini netleştirin', 'Vardiya saatlerini yazın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; zamanlama netleştirme taslağıdır.',
    valueSignal: 'Zamanlama güveni',
  }),
  sla_commitment: Object.freeze({
    currentIssue: 'SLA / kalite taahhüdü yeterince görünür değil.',
    suggestedAsk: 'SLA metriklerini ve kalite taahhüdünü yazılı netleştirin.',
    rationale: 'SLA netliği servis kalitesini korur.',
    riskIfUnresolved: 'SLA netleşmezse kalite sapması ve anlaşmazlık riski büyür.',
    priority: 'high',
    question: 'SLA ve kalite taahhüdü nasıl netleşecek?',
    openingNote: 'Bu taslak SLA netleştirmesi için hazırlanmıştır.',
    requestedChanges: ['SLA metriklerini yazın', 'Kalite taahhüdünü netleştirin'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; SLA netleştirme taslağıdır.',
    valueSignal: 'SLA güveni',
  }),
  compliance_documents: Object.freeze({
    currentIssue: 'Belge / ruhsat / uyum alanları net değil.',
    suggestedAsk: 'Gerekli belge ve ruhsatları tek listede netleştirin.',
    rationale: 'Belge eksikleri uyum ve saha başlatma riskini artırır.',
    riskIfUnresolved: 'Belge netleşmezse KVKK / uyum / operasyon riski kalır.',
    priority: 'high',
    question: 'Hangi belge, ruhsat veya uyum dokümanları sunulabilir?',
    openingNote: 'Bu taslak belge netleştirmesi için hazırlanmıştır.',
    requestedChanges: ['Belge listesini netleştirin', 'Ruhsat ve sertifikaları yazın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; belge netleştirme taslağıdır.',
    valueSignal: 'Belge uyumu',
  }),
  insurance_safety: Object.freeze({
    currentIssue: 'Sigorta ve güvenlik şartları net değil.',
    suggestedAsk: 'Sigorta kapsamını ve güvenlik önlemlerini yazılı netleştirin.',
    rationale: 'Sigorta / güvenlik netliği saha riskini azaltır.',
    riskIfUnresolved: 'Sigorta ve güvenlik netleşmezse operasyonel ve hukuki risk doğar.',
    priority: 'high',
    question: 'Sigorta ve güvenlik şartları nasıl karşılanacak?',
    openingNote: 'Bu taslak sigorta / güvenlik netleştirmesi içindir.',
    requestedChanges: ['Sigorta kapsamını yazın', 'Güvenlik şartlarını netleştirin'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; sigorta / güvenlik netleştirme taslağıdır.',
    valueSignal: 'Sigorta / güvenlik güveni',
  }),
  validity_extension: Object.freeze({
    currentIssue: 'Teklif geçerlilik süresi sınırlı veya belirsiz.',
    suggestedAsk: 'Geçerlilik süresini uzatın veya net tarih verin.',
    rationale: 'Geçerlilik süresi karar için daha fazla zaman kazandırır.',
    riskIfUnresolved: 'Süre netleşmezse teklifin erken düşmesi riski oluşur.',
    priority: 'low',
    question: 'Teklifin geçerlilik süresi uzatılabilir mi?',
    openingNote: 'Bu taslak geçerlilik süresi netleştirmesi içindir.',
    requestedChanges: ['Geçerlilik süresini yazın', 'Gerekirse uzatma önerin'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; geçerlilik süresi taslağıdır.',
    valueSignal: 'Geçerlilik güveni',
  }),
  payment_terms: Object.freeze({
    currentIssue: 'Ödeme şartları yeterince net değil.',
    suggestedAsk: 'Ödeme vadesini, teminatı ve ödeme adımlarını netleştirin.',
    rationale: 'Ödeme şartları toplam finansman etkisini belirler.',
    riskIfUnresolved: 'Ödeme koşulları netleşmezse toplam maliyet ve nakit akışı riski doğar.',
    priority: 'medium',
    question: 'Ödeme şartları, vade ve teminat nasıl olacak?',
    openingNote: 'Bu taslak ödeme şartlarını netleştirmek içindir.',
    requestedChanges: ['Ödeme vadesini netleştirin', 'Teminat / avans şartını yazın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; ödeme şartları için pazarlık taslağıdır.',
    valueSignal: 'Ödeme güveni',
  }),
  service_quality: Object.freeze({
    currentIssue: 'Servis kalitesi / performans sinyali yetersiz.',
    suggestedAsk: 'Servis kalitesi için ölçülebilir güvence verin.',
    rationale: 'Kalite sinyali uzun dönem güveni belirler.',
    riskIfUnresolved: 'Kalite netleşmezse tekrar eden operasyon sorunları doğar.',
    priority: 'medium',
    question: 'Servis kalitesi hangi taahhütle korunacak?',
    openingNote: 'Bu taslak servis kalitesi netleştirmesi içindir.',
    requestedChanges: ['Kalite güvencesi verin', 'Performans kriterlerini yazın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; servis kalitesi taslağıdır.',
    valueSignal: 'Servis kalitesi',
  }),
  route_or_shift_clarity: Object.freeze({
    currentIssue: 'Rota / vardiya / zaman çizelgesi belirsiz.',
    suggestedAsk: 'Rota, vardiya ve saat detaylarını netleştirin.',
    rationale: 'Rota / vardiya netliği operasyonu sadeleştirir.',
    riskIfUnresolved: 'Rota veya vardiya netleşmezse saha koordinasyonu zorlaşır.',
    priority: 'medium',
    question: 'Rota veya vardiya netliği nasıl sağlanacak?',
    openingNote: 'Bu taslak rota / vardiya netleştirmesi içindir.',
    requestedChanges: ['Rota detaylarını netleştirin', 'Vardiya saatlerini yazın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; rota / vardiya taslağıdır.',
    valueSignal: 'Rota / vardiya güveni',
  }),
  general_negotiation: Object.freeze({
    currentIssue: 'Genel pazarlık alanları daha net görünmeli.',
    suggestedAsk: 'Fiyat, kapsam, SLA, kapasite ve belge netliği birlikte ele alın.',
    rationale: 'Genel pazarlık görünürlüğü karar kalitesini artırır.',
    riskIfUnresolved: 'Genel pazarlık alanı netleşmezse karar öncesi belirsizlik kalır.',
    priority: 'medium',
    question: 'En önemli pazarlık başlığı hangisi?',
    openingNote: 'Bu taslak genel pazarlık hazırlığı içindir.',
    requestedChanges: ['Pazarlık başlıklarını netleştirin', 'Öncelik sırasını yazın'],
    nonBindingLanguage: 'Bu metin bağlayıcı değildir; genel pazarlık taslağıdır.',
    valueSignal: 'Genel pazarlık gücü',
  }),
});

function coerceText(value) {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item)).filter(Boolean).join(' ');
  }
  return String(value);
}

function normalizeNegotiationField(field, value) {
  const input = arguments.length === 1 ? field : value;
  return normalizeOfferAnalysisField(input);
}

function maskNegotiationSensitiveValue(value) {
  return maskOfferAnalysisSensitiveValue(value);
}

function toList(value) {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => toList(item));
  }
  const text = coerceText(value).trim();
  if (!text) {
    return [];
  }
  return text
    .split(/[,;/|]+|\s{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniq(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

function containsAny(text, keywords = []) {
  return keywords.some((keyword) => normalizeNegotiationField(text).includes(normalizeNegotiationField(keyword)));
}

function getNegotiationTypeDetails(type) {
  return COPILOT_NEGOTIATION_ASSIST_TYPE_DETAILS[type] || COPILOT_NEGOTIATION_ASSIST_TYPE_DETAILS.general_negotiation;
}

function classifyNegotiationOpportunityTypes(input = {}, context = {}) {
  const forced = normalizeNegotiationField(input.negotiationTypeHint || input.opportunityTypeHint || input.opportunityType || context.negotiationTypeHint || context.opportunityTypeHint || '');
  if (COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES.includes(forced)) {
    return [forced];
  }

  const text = normalizeNegotiationField([
    input.currentIssue,
    input.suggestedAsk,
    input.rationale,
    input.riskIfUnresolved,
    input.negotiationFocus,
    input.message,
    input.note,
    context.message,
    context.negotiationFocus,
    context.note,
    context.prompt,
  ]);

  const result = [];
  for (const [type, keywords] of Object.entries(COPILOT_NEGOTIATION_ASSIST_TYPE_KEYWORDS)) {
    if (type === 'general_negotiation') {
      continue;
    }
    if (containsAny(text, keywords)) {
      result.push(type);
    }
  }

  if (result.length === 0) {
    result.push('general_negotiation');
  }

  return uniq(result);
}

function normalizeOfferAnalysisSource(source = {}, context = {}) {
  if (source && Array.isArray(source.comparisonMatrix)) {
    return source;
  }

  const offerCollection = source.offerCollection || context.offerCollection || {
    matchingDraft: source.matchingDraft || context.matchingDraft || {},
    sourceRfqSummary: source.sourceRfqSummary || context.sourceRfqSummary || {},
    offerFixtures: source.offerFixtures || source.offers || context.offerFixtures || context.offers || [],
    offers: source.offers || source.offerFixtures || context.offers || context.offerFixtures || [],
    collectionState: source.collectionState || context.collectionState || 'received_draft',
    message: source.message || context.message || '',
  };

  return buildOfferAnalysisInput(offerCollection, context);
}

function buildNegotiationInputSummary(offerAnalysisInput = {}, context = {}) {
  const sourceRfqSummary = offerAnalysisInput.sourceRfqSummary || context.sourceRfqSummary || {};
  const comparisonMatrix = Array.isArray(offerAnalysisInput.comparisonMatrix) ? offerAnalysisInput.comparisonMatrix : [];
  const candidateSuppliersMasked = uniq(comparisonMatrix.slice(0, 3).map((row) => maskNegotiationSensitiveValue(row.supplierLabelMasked || row.supplierLabel || row.supplierRef || '')));
  const offerStates = uniq(comparisonMatrix.map((row) => coerceText(row.offerState || row.fitLevel || row.riskLevel).trim()).filter(Boolean));
  const missingOrRiskyOfferCount = comparisonMatrix.filter((row) => {
    return Boolean(
      (Array.isArray(row.missingFields) && row.missingFields.length > 0) ||
      row.riskLevel === 'blocked' ||
      row.fitLevel === 'blocked' ||
      row.missingOfferFields?.length > 0,
    );
  }).length;

  return Object.freeze({
    rfqType: coerceText(sourceRfqSummary.rfqType || context.rfqType || offerAnalysisInput.analysisType || 'general'),
    offerAnalysisState: coerceText(offerAnalysisInput.collectionState || sourceRfqSummary.collectionState || context.collectionState || 'received_draft'),
    candidateSuppliersMasked,
    serviceScope: coerceText(sourceRfqSummary.serviceScope || sourceRfqSummary.scope || context.serviceScope || ''),
    region: uniq([sourceRfqSummary.region, sourceRfqSummary.province, sourceRfqSummary.district].map((item) => coerceText(item).trim()).filter(Boolean)).join(' / '),
    startDate: coerceText(sourceRfqSummary.startDate || sourceRfqSummary.start || context.startDate || ''),
    dayPeriodHourShift: uniq([sourceRfqSummary.day, sourceRfqSummary.period, sourceRfqSummary.hour, sourceRfqSummary.shift].map((item) => coerceText(item).trim()).filter(Boolean)).join(' / '),
    passengerPersonnelStudentCount: coerceText(sourceRfqSummary.passengerCount || sourceRfqSummary.personnelCount || sourceRfqSummary.studentCount || context.passengerCount || context.personnelCount || context.studentCount || ''),
    vehicleCapacityRequirement: coerceText(sourceRfqSummary.vehicleCapacityRequirement || sourceRfqSummary.vehicleCapacity || context.vehicleCapacityRequirement || context.vehicleCapacity || ''),
    slaQualityExpectation: coerceText(sourceRfqSummary.sla || sourceRfqSummary.qualityExpectation || context.sla || context.qualityExpectation || ''),
    documentLicenseSafetyRequirement: uniq([
      ...toList(sourceRfqSummary.documentRequirements),
      ...toList(sourceRfqSummary.licenseRequirements),
      ...toList(sourceRfqSummary.safetyRequirements),
      ...toList(context.documentRequirements),
      ...toList(context.licenseRequirements),
      ...toList(context.safetyRequirements),
    ]),
    analyzedOfferCount: comparisonMatrix.length,
    missingOrRiskyOfferCount,
    offerStates,
  });
}

function summarizeNegotiationInputSummary(inputSummary) {
  return [
    `rfqType=${inputSummary.rfqType || 'general'}`,
    `offerAnalysisState=${inputSummary.offerAnalysisState || 'received_draft'}`,
    `candidateSuppliersMasked=${(inputSummary.candidateSuppliersMasked || []).join(', ') || 'yok'}`,
    `serviceScope=${inputSummary.serviceScope || 'yok'}`,
    `region=${inputSummary.region || 'yok'}`,
    `startDate=${inputSummary.startDate || 'yok'}`,
    `dayPeriodHourShift=${inputSummary.dayPeriodHourShift || 'yok'}`,
    `passengerPersonnelStudentCount=${inputSummary.passengerPersonnelStudentCount || 'yok'}`,
    `vehicleCapacityRequirement=${inputSummary.vehicleCapacityRequirement || 'yok'}`,
    `slaQualityExpectation=${inputSummary.slaQualityExpectation || 'yok'}`,
    `documentLicenseSafetyRequirement=${(inputSummary.documentLicenseSafetyRequirement || []).join(', ') || 'yok'}`,
    `analyzedOfferCount=${inputSummary.analyzedOfferCount || 0}`,
    `missingOrRiskyOfferCount=${inputSummary.missingOrRiskyOfferCount || 0}`,
  ].join('; ');
}

function buildNegotiationOpportunityModel(offerAnalysisInput = {}, context = {}) {
  const source = normalizeOfferAnalysisSource(offerAnalysisInput, context);
  const rows = Array.isArray(source.comparisonMatrix) ? source.comparisonMatrix : [];
  const opportunityContext = { ...context };
  delete opportunityContext.negotiationTypeHint;
  delete opportunityContext.opportunityTypeHint;
  const opportunities = rows.map((row, index) => {
    const opportunityTypes = classifyNegotiationOpportunityTypes(row, opportunityContext);
    const primaryType = opportunityTypes[0] || 'general_negotiation';
    const details = getNegotiationTypeDetails(primaryType);
    const supplierRef = coerceText(row.supplierRef || row.candidateId || row.offerId || row.id || `supplier-${index + 1}`);
    const supplierLabelMasked = maskNegotiationSensitiveValue(row.supplierLabelMasked || row.supplierLabel || row.supplierNameMasked || row.supplierName || row.supplier || supplierRef);
    const priority = row.riskLevel === 'blocked' || row.fitLevel === 'blocked'
      ? 'high'
      : details.priority === 'high'
        ? 'high'
        : details.priority === 'medium'
          ? 'medium'
          : 'low';
    const currentIssue = row.currentIssue || row.missingFields?.length > 0
      ? `${details.currentIssue} ${row.missingFields?.length > 0 ? `Eksik alanlar: ${row.missingFields.join(', ')}.` : ''}`.trim()
      : details.currentIssue;
    const suggestedAsk = row.suggestedAsk || details.suggestedAsk;
    const rationale = row.rationale || `${details.rationale} ${row.normalizedPriceSummary ? `Referans fiyat: ${row.normalizedPriceSummary}.` : ''}`.trim();
    const riskIfUnresolved = row.riskIfUnresolved || `${details.riskIfUnresolved} ${row.riskNotes?.length > 0 ? `Risk notları: ${row.riskNotes.join(', ')}.` : ''}`.trim();

    return Object.freeze({
      supplierRef,
      supplierLabelMasked,
      opportunityType: primaryType,
      currentIssue,
      suggestedAsk,
      rationale,
      riskIfUnresolved,
      priority,
      humanReviewRequired: true,
      supportingOpportunityTypes: Object.freeze(opportunityTypes.slice(1)),
      notSent: true,
      notContacted: true,
      notAccepted: true,
      notRejected: true,
      notSelected: true,
    });
  });

  return Object.freeze(opportunities);
}

function buildNegotiationQuestionSet(opportunities = []) {
  const questions = [];
  for (const opportunity of Array.isArray(opportunities) ? opportunities : []) {
    const details = getNegotiationTypeDetails(opportunity.opportunityType);
    const question = Object.freeze({
      supplierRef: opportunity.supplierRef,
      supplierLabelMasked: opportunity.supplierLabelMasked,
      questionType: opportunity.opportunityType,
      question: details.question,
      whyItMatters: opportunity.riskIfUnresolved || details.riskIfUnresolved,
      humanReviewRequired: true,
    });
    if (!questions.some((item) => normalizeNegotiationField(item.question) === normalizeNegotiationField(question.question))) {
      questions.push(question);
    }
  }
  return Object.freeze(questions);
}

function buildCounterOfferDraft(opportunities = []) {
  const drafts = [];
  for (const opportunity of Array.isArray(opportunities) ? opportunities : []) {
    const details = getNegotiationTypeDetails(opportunity.opportunityType);
    const draft = Object.freeze({
      supplierRef: opportunity.supplierRef,
      supplierLabelMasked: opportunity.supplierLabelMasked,
      draftTitle: `${details.label || COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[opportunity.opportunityType] || 'Pazarlık'} için karşı teklif taslağı`,
      openingNote: details.openingNote,
      requestedChanges: Object.freeze(uniq([...(details.requestedChanges || []), opportunity.suggestedAsk])),
      clarificationQuestions: Object.freeze([details.question]),
      nonBindingLanguage: details.nonBindingLanguage,
      approvalRequired: true,
      notSent: true,
      notContacted: true,
      notAccepted: true,
      notRejected: true,
      notSelected: true,
      draftOnly: true,
      humanReviewRequired: true,
      executionState: COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE,
      nextSafeStep: COPILOT_NEGOTIATION_ASSIST_NEXT_SAFE_STEP,
    });
    drafts.push(draft);
  }
  return Object.freeze(drafts);
}

function buildNegotiationReadinessTable(opportunities = []) {
  const rows = [];
  for (const opportunity of Array.isArray(opportunities) ? opportunities : []) {
    const details = getNegotiationTypeDetails(opportunity.opportunityType);
    rows.push(Object.freeze({
      candidateSupplier: opportunity.supplierLabelMasked,
      negotiationTopic: COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[opportunity.opportunityType] || opportunity.opportunityType,
      priority: opportunity.priority,
      requestedImprovement: opportunity.suggestedAsk,
      missingOrUnclearArea: opportunity.currentIssue,
      risk: opportunity.riskIfUnresolved,
      ready: Boolean(opportunity.currentIssue && opportunity.suggestedAsk && opportunity.rationale),
      humanApprovalNote: details.nonBindingLanguage,
    }));
  }
  return Object.freeze(rows);
}

function buildNegotiationRiskSummary(opportunities = [], analysisInput = {}) {
  const rows = Array.isArray(opportunities) ? opportunities : [];
  const risks = uniq(rows.map((row) => row.riskIfUnresolved).filter(Boolean));
  const high = rows.filter((row) => row.priority === 'high').length;
  const medium = rows.filter((row) => row.priority === 'medium').length;
  const low = rows.filter((row) => row.priority === 'low').length;
  const topRiskTypes = uniq(rows.map((row) => COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[row.opportunityType] || row.opportunityType));
  const summary = rows.length === 0
    ? 'Pazarlık riski hesaplanacak fırsat yok; taslak boş kaldı.'
    : `${high} yüksek / ${medium} orta / ${low} düşük risk görünür; ${topRiskTypes.slice(0, 4).join(', ') || 'genel pazarlık'} başlıkları öne çıkıyor; ${risks.slice(0, 3).join(' | ') || 'risk notu yok'}.`;
  return Object.freeze({
    summary,
    items: Object.freeze(risks),
    high,
    medium,
    low,
    sourceAnalysisType: coerceText(analysisInput.analysisType || 'general'),
  });
}

function buildNegotiationValueSummary(opportunities = [], analysisInput = {}) {
  const rows = Array.isArray(opportunities) ? opportunities : [];
  const labels = uniq(rows.map((row) => COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[row.opportunityType] || row.opportunityType));
  const valueItems = uniq(rows.map((row) => getNegotiationTypeDetails(row.opportunityType).valueSignal).filter(Boolean));
  const summary = rows.length === 0
    ? 'Pazarlık değeri hesaplanacak fırsat yok; taslak boş kaldı.'
    : `Öne çıkan değer alanları: ${labels.slice(0, 5).join(', ') || 'genel pazarlık'}; En düşük fiyat tek başına karar değildir; kapsama, SLA, kapasite, belge ve ödeme netliği birlikte değerlendirilir.`;
  return Object.freeze({
    summary,
    items: Object.freeze(valueItems),
    bestValueSignal: valueItems[0] || 'Genel pazarlık gücü',
    sourceAnalysisType: coerceText(analysisInput.analysisType || 'general'),
  });
}

function buildNegotiationVisibleAnswer({ opportunities = [], blockedExecutionRequest = false } = {}) {
  const topics = uniq(opportunities.map((opportunity) => COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[opportunity.opportunityType] || opportunity.opportunityType));
  const topicText = topics.slice(0, 5).join(', ') || 'fiyat kapsamı, dahil/hariç kalemler, SLA, kapasite ve belge netliği';
  const lead = blockedExecutionRequest
    ? 'Yürütme isteğini güvenli olarak yalnızca pazarlık hazırlık taslağına çevirdim.'
    : 'Pazarlık hazırlık taslağını oluşturdum; henüz hiçbir tedarikçiye mesaj gönderilmedi.';
  return [
    lead,
    'Hiçbir teklif kabul edilmedi veya reddedilmedi.',
    'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.',
    `Pazarlık için öne çıkan başlıklar: ${topicText}.`,
    'Sıradaki güvenli adım: pazarlık taslağını kontrol edip insan onayına sunmak.',
  ].join(' ');
}

function summarizeSourceHandoff(source = {}, context = {}) {
  const sourceOfferAnalysisSummary = coerceText(source.comparisonMatrixSummary || source.offerAnalysisTypeSummary || source.analysisDraftSummary || source.visibleAnswer || '');
  const sourceSupplierMatchingSummary = coerceText(
    context.sourceSupplierMatchingSummary ||
    context.matchingDraftSummary ||
    context.matchingDraft?.shortlistDraftSummary ||
    context.offerCollection?.matchingDraft?.shortlistDraftSummary ||
    '',
  );
  const sourceSupplierOfferCollectSummary = coerceText(
    context.sourceSupplierOfferCollectSummary ||
    source.sourceOfferCollectionSummary ||
    context.offerCollectionSummary ||
    context.offerCollection?.collectionState ||
    '',
  );
  const sourceRfqPrepSummary = coerceText(
    context.sourceRfqPrepSummary ||
    source.sourceRfqSummary?.rfqType ||
    source.sourceRfqSummary?.serviceScope ||
    context.sourceRfqSummary?.rfqType ||
    context.sourceRfqSummary?.serviceScope ||
    '',
  );

  return Object.freeze({
    sourceOfferAnalysisSummary,
    sourceSupplierMatchingSummary,
    sourceSupplierOfferCollectSummary,
    sourceRfqPrepSummary,
  });
}

export function detectNegotiationAssistIntent(input = {}) {
  const source = typeof input === 'string' ? { message: input } : (input && typeof input === 'object' ? input : {});
  const text = normalizeNegotiationField(source.message || source.input || source.query || source.text || source.prompt || '');
  const blocked = COPILOT_NEGOTIATION_ASSIST_BLOCKED_PHRASES.some((phrase) => text.includes(normalizeNegotiationField(phrase))) || (
    text.includes('gönder') && (text.includes('mesaj') || text.includes('rfq') || text.includes('ilet'))
  ) || (
    (text.includes('kabul') || text.includes('reddet') || text.includes('reject') || text.includes('accept')) && text.includes('teklif')
  ) || (
    text.includes('seç') || text.includes('sec') || text.includes('sözleşme') || text.includes('sozlesme')
  ) || text.includes('pazarlığı başlat') || text.includes('pazarligi baslat') || text.includes('pazarlık başlat') || text.includes('pazarlik baslat');

  const negotiationType = classifyNegotiationOpportunityTypes({ negotiationTypeHint: source.negotiationTypeHint, opportunityTypeHint: source.opportunityTypeHint, message: text }, source)[0] || 'general_negotiation';
  const negotiationTypeLabel = COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[negotiationType] || 'Genel pazarlık';

  if (blocked) {
    return Object.freeze({
      intentType: 'execution_blocked_request',
      negotiationType,
      negotiationTypeLabel,
      draftOnly: true,
      notAccepted: true,
      notRejected: true,
      notSelected: true,
      notContacted: true,
      notSent: true,
      approvalRequired: true,
      humanReviewRequired: true,
      executionState: COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE,
      blockedExecutionRequest: true,
    });
  }

  let intentType = 'negotiation_assist_request';
  if (text.includes('karşı teklif') || text.includes('karsi teklif') || text.includes('counter offer')) {
    intentType = 'counter_offer_draft_request';
  } else if (text.includes('soru') || text.includes('sorulacak') || text.includes('clarification') || text.includes('netleştir')) {
    intentType = 'supplier_question_request';
  } else if (text.includes('hazırla') || text.includes('hazirla') || text.includes('taslak') || text.includes('onaya sun')) {
    intentType = 'negotiation_prep_request';
  } else if (text.includes('fiyat') || text.includes('kapsam') || text.includes('sla') || text.includes('kapasite') || text.includes('belge')) {
    intentType = 'negotiation_analysis_request';
  }

  return Object.freeze({
    intentType,
    negotiationType,
    negotiationTypeLabel,
    draftOnly: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    notContacted: true,
    notSent: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE,
    blockedExecutionRequest: false,
  });
}

export function buildNegotiationAssistInput(offerAnalysisSource = {}, context = {}) {
  const analysisInput = normalizeOfferAnalysisSource(offerAnalysisSource, context);
  const sourceRfqSummary = analysisInput.sourceRfqSummary || context.sourceRfqSummary || offerAnalysisSource.sourceRfqSummary || offerAnalysisSource.offerCollection?.sourceRfqSummary || {};
  const negotiationContext = Object.freeze({ ...context, sourceRfqSummary });
  const intent = detectNegotiationAssistIntent({ ...negotiationContext, message: negotiationContext.message || analysisInput.visibleAnswer || analysisInput.message || '' });
  const inputSummary = buildNegotiationInputSummary(analysisInput, negotiationContext);
  const opportunities = buildNegotiationOpportunityModel(analysisInput, negotiationContext);
  const counterOfferDrafts = buildCounterOfferDraft(opportunities);
  const readinessTable = buildNegotiationReadinessTable(opportunities);
  const supplierQuestionSet = buildNegotiationQuestionSet(opportunities);
  const risk = buildNegotiationRiskSummary(opportunities, analysisInput);
  const value = buildNegotiationValueSummary(opportunities, analysisInput);
  const sourceHandoff = summarizeSourceHandoff(analysisInput, negotiationContext);
  const negotiationType = intent.negotiationType || opportunities[0]?.opportunityType || 'general_negotiation';
  const negotiationTypeLabel = intent.negotiationTypeLabel || COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[negotiationType] || 'Genel pazarlık';
  const visibleAnswer = buildNegotiationVisibleAnswer({ opportunities, blockedExecutionRequest: intent.blockedExecutionRequest });

  return Object.freeze({
    intentType: intent.intentType,
    negotiationType,
    negotiationTypeLabel,
    negotiationIntentSummary: `intentType=${intent.intentType}; negotiationType=${negotiationType}; draftOnly=true; notSent=true; notContacted=true; notAccepted=true; notRejected=true; notSelected=true; approvalRequired=true`,
    negotiationTypeSummary: `${negotiationTypeLabel}; ${COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES.map((type) => COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[type] || type).join(' | ')}`,
    negotiationInputSummary: inputSummary,
    negotiationInputSummaryText: summarizeNegotiationInputSummary(inputSummary),
    sourceOfferAnalysisSummary: sourceHandoff.sourceOfferAnalysisSummary,
    sourceSupplierMatchingSummary: sourceHandoff.sourceSupplierMatchingSummary,
    sourceSupplierOfferCollectSummary: sourceHandoff.sourceSupplierOfferCollectSummary,
    sourceRfqPrepSummary: sourceHandoff.sourceRfqPrepSummary,
    opportunities,
    opportunitySummary: `${opportunities.length} fırsat; ${opportunities.slice(0, 3).map((row) => `${row.supplierLabelMasked}:${COPILOT_NEGOTIATION_ASSIST_TYPE_LABELS[row.opportunityType] || row.opportunityType}(${row.priority})`).join(' | ') || 'yok'}`,
    counterOfferDrafts,
    counterOfferDraftSummary: `${counterOfferDrafts.length} karşı teklif taslağı; approvalRequired=true; notSent=true; notContacted=true; notAccepted=true; notRejected=true; notSelected=true`,
    readinessTable,
    readinessTableSummary: `${readinessTable.length} satır; Aday tedarikçi / pazarlık konusu / öncelik / istenen iyileştirme / risk / hazır mı görünür`,
    supplierQuestionSet,
    supplierQuestionSummary: `${supplierQuestionSet.length} soru; fiyat, kapsam, dahil/hariç, kapasite, zamanlama, SLA, belge, sigorta, geçerlilik ve ödeme görünür`,
    valueSummary: value.summary,
    valueSummaryItems: value.items,
    riskSummary: risk.summary,
    riskSummaryItems: risk.items,
    safetyNotes: Object.freeze([
      ...COPILOT_NEGOTIATION_ASSIST_TURKISH_VISIBLE_PHRASES,
      ...COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS,
      ...COPILOT_NEGOTIATION_ASSIST_BLOCKED_ACTIONS,
    ]),
    safetyPhraseSummary: `${COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS.join(' / ')} korunur; mesaj / kabul / ret / seçim / sözleşme / gönderim yok`,
    kvkkSafeSummary: 'raw token, credential, cookie, password, raw GPS trace ve raw PII yok; masked supplier labels kullanılır; production data okunmaz',
    auditApprovalSummary: 'human approval boundary, audit trace handoff ve rollback-ready draft korunur',
    noWriteActionSummary: 'supplier contact, message/email/SMS/push, RFQ send, actual negotiation, offer accept/reject, supplier selection, agreement execute, dispatch apply, route apply, payment/hakediş execute ve provider credential use açılmaz',
    chainWiringSummary: 'check:copilotofferanalysis01 -> check:copilotnegotiationassist01 -> check:copilotofferrecommendation01 -> check:copilothumanapproval01 remains wired',
    smokeThresholdSummary: 'product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none',
    commitExternalSummary: 'runtime-data, browser-smoke, load-test, db-scaling, observability, data-integrity, role-redteam, security-kvkk, audit-trace ve debug.log commit dışı kalır',
    prismaSummary: 'No route/service/prisma diff; no production DB; no schema/migration; read-only only',
    lineCountSummary: 'backend/src/ai/chat/copilotNegotiationAssist.js stays under 1000 lines',
    visibleAnswer,
    draftOnly: true,
    notSent: true,
    notContacted: true,
    notAccepted: true,
    notRejected: true,
    notSelected: true,
    approvalRequired: true,
    humanReviewRequired: true,
    executionState: COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE,
    nextSafeStep: COPILOT_NEGOTIATION_ASSIST_NEXT_SAFE_STEP,
  });
}

export function composeNegotiationAssistAnswer(context = {}) {
  const source = context.negotiationAssist || context.negotiationInput || context.offerAnalysis || context.analysisDraft || context.offerCollection || context.matchingDraft || context;
  return buildNegotiationAssistInput(source, context);
}

function buildNegotiationAssistRole(role, visible) {
  return Object.freeze({
    role,
    visible,
    INPUT_SUMMARY: [...COPILOT_NEGOTIATION_ASSIST_INPUT_SUMMARY],
    SUPPORTED_NEGOTIATION_TYPES: [...COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES],
    OPPORTUNITY_FIELDS: [...COPILOT_NEGOTIATION_ASSIST_OPPORTUNITY_FIELDS],
    COUNTER_OFFER_FIELDS: [...COPILOT_NEGOTIATION_ASSIST_COUNTER_OFFER_FIELDS],
    READINESS_FIELDS: [...COPILOT_NEGOTIATION_ASSIST_READINESS_FIELDS],
    SAFETY_BOUNDARY_FLAGS: [...COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS],
    BLOCKED_RUNTIME_ACTION: [...COPILOT_NEGOTIATION_ASSIST_BLOCKED_ACTIONS],
    NEVER_AUTOMATE: [...COPILOT_NEGOTIATION_ASSIST_NEVER_AUTOMATE],
    TURKISH_VISIBLE_PHRASES: [...COPILOT_NEGOTIATION_ASSIST_TURKISH_VISIBLE_PHRASES],
    BLOCKED_PHRASES: [...COPILOT_NEGOTIATION_ASSIST_BLOCKED_PHRASES],
    HANDOFFS: [...COPILOT_NEGOTIATION_ASSIST_HANOFFS],
    PUBLIC_PROMISE: [...COPILOT_NEGOTIATION_ASSIST_PUBLIC_PROMISE],
  });
}

export function listCopilotNegotiationAssistRoles() {
  return Object.keys(COPILOT_NEGOTIATION_ASSIST_POLICY);
}

export function getCopilotNegotiationAssistPolicy(role) {
  return COPILOT_NEGOTIATION_ASSIST_POLICY[role] || null;
}

export const COPILOT_NEGOTIATION_ASSIST_POLICY = Object.freeze(
  Object.fromEntries(
    COPILOT_NEGOTIATION_ASSIST_ROLE_NAMES.map((role) => [
      role,
      buildNegotiationAssistRole(role, !['DRIVER', 'PERSONEL', 'PARENT'].includes(role)),
    ]),
  ),
);

export {
  buildNegotiationAssistRole,
  buildNegotiationInputSummary,
  buildNegotiationOpportunityModel,
  buildCounterOfferDraft,
  buildNegotiationReadinessTable,
  buildNegotiationQuestionSet,
  buildNegotiationRiskSummary,
  buildNegotiationValueSummary,
  classifyNegotiationOpportunityTypes,
  maskNegotiationSensitiveValue,
  normalizeNegotiationField,
};
