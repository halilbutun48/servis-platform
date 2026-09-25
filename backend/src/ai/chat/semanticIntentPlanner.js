import { hasCrossTenantBoundarySignal, isExplicitRoleHelpIntent, isGenericProductHelpIntent, resolveConversationRoute } from "./conversationRouting.js";
import { buildCanonicalTypedRequest, inferCanonicalSemanticRequest, validateCanonicalTypedRequest } from "./canonicalSemanticRequest.js";

const INTENT_FAMILIES = [
  "SCREEN_CONTEXT", "SELECTED_RECORD_CONTEXT", "RECORD_DETAILS", "CONTINUE_CURRENT_REASONING",
  "CURRENT_SITUATION", "SCREEN_OR_SITUATION_SUMMARY", "ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "STATUS",
  "TEMPORAL_STATUS", "COUNT", "ENTITY_LOOKUP", "COMPARISON", "COST_TREND", "COMMERCIAL_SUMMARY",
  "SERVICE_SUMMARY", "LOCATION_GPS", "ETA", "PLAN_STATUS", "REQUEST_STATUS", "APPROVAL_STATUS",
  "MULTI_DOMAIN_SUMMARY", "AUTHORIZATION_BOUNDARY", "UI_GUIDANCE", "RISK_RANKING", "RELATION_LOOKUP", "STYLE", "OFF_TOPIC_SAFE", "GENERAL_KNOWLEDGE",
  "SHIFT_START_READINESS", "FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY", "RETURN_TO_PRODUCT", "ROLE_EXPLANATION_HELP",
  "LIVE_EXTERNAL_DATA", "UNCLEAR_OR_AMBIGUOUS", "GENERIC_PRODUCT_HELP", "PLAN_REVIEW", "CONTEXTUAL_PUBLIC_TYPE",
];

const ALL_READ_DOMAINS = [
  "OFFERS", "AGREEMENTS", "SHIFTS", "VEHICLES", "DRIVERS", "PERSONNEL",
  "SERVICE_REQUESTS", "OPERATIONS", "BUDGET", "FINANCE", "NOTIFICATIONS",
  "ORGANIZATION_PLANS", "TENANT_ACCESS",
];

const ROLE_DOMAIN_CAPABILITIES = {
  ROOM: {
    OFFERS: "ALLOW_READ", AGREEMENTS: "ALLOW_READ", SHIFTS: "ALLOW_READ", VEHICLES: "ALLOW_READ",
    DRIVERS: "ALLOW_READ", OPERATIONS: "ALLOW_READ", BUDGET: "ALLOW_READ", FINANCE: "ALLOW_READ", NOTIFICATIONS: "ALLOW_READ",
  },
  COMPANY: {
    OFFERS: "ALLOW_READ", AGREEMENTS: "ALLOW_READ", SHIFTS: "ALLOW_READ", VEHICLES: "ALLOW_READ",
    DRIVERS: "ALLOW_READ", PERSONNEL: "ALLOW_READ", OPERATIONS: "ALLOW_READ", BUDGET: "ALLOW_READ",
    FINANCE: "ALLOW_READ", NOTIFICATIONS: "ALLOW_READ",
  },
  SCHOOL: {
    SHIFTS: "ALLOW_READ", PERSONNEL: "ALLOW_READ", OPERATIONS: "ALLOW_READ", VEHICLES: "ALLOW_READ",
    FINANCE: "ALLOW_READ", NOTIFICATIONS: "ALLOW_READ", OFFERS: "DENY_READ", AGREEMENTS: "DENY_READ", BUDGET: "DENY_READ",
  },
  ORGANIZATION: {
    ORGANIZATION_PLANS: "ALLOW_READ", SHIFTS: "ALLOW_READ", PERSONNEL: "ALLOW_READ", OPERATIONS: "ALLOW_READ",
    VEHICLES: "ALLOW_READ", FINANCE: "ALLOW_READ", NOTIFICATIONS: "ALLOW_READ", OFFERS: "DENY_READ", AGREEMENTS: "DENY_READ", BUDGET: "DENY_READ",
  },
  DRIVER: {
    SHIFTS: "CONDITIONAL_RECORD_SCOPE", VEHICLES: "CONDITIONAL_RECORD_SCOPE", DRIVERS: "CONDITIONAL_RECORD_SCOPE",
    OPERATIONS: "CONDITIONAL_RECORD_SCOPE", NOTIFICATIONS: "CONDITIONAL_RECORD_SCOPE",
  },
  PERSONEL: {
    PERSONNEL: "CONDITIONAL_RECORD_SCOPE", SERVICE_REQUESTS: "CONDITIONAL_RECORD_SCOPE", SHIFTS: "CONDITIONAL_RECORD_SCOPE",
    VEHICLES: "CONDITIONAL_RECORD_SCOPE", OPERATIONS: "CONDITIONAL_RECORD_SCOPE", NOTIFICATIONS: "CONDITIONAL_RECORD_SCOPE",
  },
  PARENT: {
    PERSONNEL: "CONDITIONAL_RECORD_SCOPE", SERVICE_REQUESTS: "CONDITIONAL_RECORD_SCOPE", SHIFTS: "CONDITIONAL_RECORD_SCOPE",
    VEHICLES: "CONDITIONAL_RECORD_SCOPE", OPERATIONS: "CONDITIONAL_RECORD_SCOPE", NOTIFICATIONS: "CONDITIONAL_RECORD_SCOPE",
  },
  SUPER_ADMIN: Object.fromEntries(ALL_READ_DOMAINS.map((domain) => [domain, "ALLOW_READ"])),
};

const FIELD_DEFINITIONS = [
  { key: "STATUS", domain: null, words: ["durumunu", "durumu", "statüsü", "statusu", "statü", "statu", "status", "durum", "karar", "kararı", "karari", "ne durumda"] },
  { key: "DATE_RANGE", domain: null, words: ["tarih aralığı", "tarih araligi", "tarihleri", "tarihlerini", "başlangıç-bitiş", "baslangic-bitis", "başlangıç bitiş", "baslangic bitis"] },
  { key: "TIME_RANGE", domain: null, words: ["vardiya saati", "vardiya saatini", "vardiya saatleri", "sefer saati", "sefer saatini", "shift time", "saat aralığı", "saat araligi", "zaman aralığı", "zaman araligi", "zaman dilimi", "zaman dilimini", "giriş çıkış", "giris cikis"] },
  { key: "DATE", domain: null, words: ["tarih alanı", "tarih alani", "tarih", "tarihini", "tarihi", "hangi gün", "hangi gun", "gün", "gun"] },
  { key: "START_TIME", domain: null, words: ["başlangıç saati", "baslangic saati", "başlangıç zamanı", "baslangic zamani", "başlama saati", "baslama saati", "başlangıç", "baslangic"] },
  { key: "END_TIME", domain: null, words: ["bitiş saati", "bitis saati", "bitiş zamanı", "bitis zamani", "bitiş", "bitis"] },
  { key: "SERVICE_BUYER_AMOUNT", domain: "OFFERS", words: [
    "hizmet alanı bedeli", "hizmet alani bedeli", "hizmet alan tutarı", "hizmet alan tutari",
    "hizmet alan tarafın tutarı", "hizmet alan tarafin tutari", "hizmet alan tarafın girdiği bedel", "hizmet alan tarafin girdigi bedel",
    "hizmet alan firma tutarı", "hizmet alan firma tutari",
    "hizmet alanın yazdığı tutar", "hizmet alanin yazdigi tutar", "hizmet alanın rakamı", "hizmet alanin rakami",
    "hizmet alanın bedeli", "hizmet alanin bedeli", "hizmet alan tarafın parası", "hizmet alan tarafin parasi",
    "alıcı firma tutarı", "alici firma tutari", "alıcı firmanın yazdığı rakam", "alici firmanin yazdigi rakam",
    "alıcı firmanın yazdığı tutar", "alici firmanin yazdigi tutar", "alıcı tarafın tutarı", "alici tarafin tutari",
    "alıcı tarafın girdiği bedel", "alici tarafin girdigi bedel", "alıcı taraf ne yazmış", "alici taraf ne yazmis",
    "alıcı taraftaki tutar", "alici taraftaki tutar", "firmanın verdiği rakam", "firmanin verdigi rakam",
    "hizmet alan ne yazmış", "hizmet alan ne yazmis", "alıcı ne yazmış", "alici ne yazmis", "firma kaç para", "firma kac para",
    "firma kaç yazmış", "firma kac yazmis", "firma ne yazmış", "firma ne yazmis",
    "firma ne girmiş", "firma ne girmis", "müşterinin yazdığı tutar", "musterinin yazdigi tutar", "müşteri ne yazmış", "musteri ne yazmis",
    "müşteri kaç girmiş", "musteri kac girmis", "müşterinin verdiği rakam", "musterinin verdigi rakam", "müşteri parası", "musteri parasi",
    "firma bedeli", "firma tutarı", "firma tutari", "firma rakamı", "firma rakami", "müşteri tarafı tutarı", "musteri tarafi tutari",
  ] },
  { key: "CARRIER_AMOUNT", domain: "OFFERS", words: [
    "taşımacı bedeli", "tasimaci bedeli", "taşımacılık firması tutarı", "tasimacilik firmasi tutari", "taşımacı tutarı", "tasimaci tutari",
    "taşıyıcı tutarı", "tasiyici tutari", "taşıyıcı bedeli", "tasiyici bedeli", "taşımacının yazdığı rakam", "tasimacinin yazdigi rakam",
    "taşımacı kaç yazmış", "tasimaci kac yazmis", "taşımacının bedeli", "tasimacinin bedeli",
    "taşıyıcının bedeli", "tasiyicinin bedeli", "taşıyıcı taraf ne girmiş", "tasiyici taraf ne girmis",
    "taşıyıcının rakamı ne", "tasiyicinin rakami ne", "taşıyıcının yazdığı rakam", "tasiyicinin yazdigi rakam",
    "taşıyıcı firma bedeli", "tasiyici firma bedeli", "nakliyeci bedeli", "nakliyatçı bedeli", "nakliyatci bedeli",
    "nakliyecinin yazdığı", "nakliyecinin yazdigi", "nakliyeci ne yazmış", "nakliyeci ne yazmis", "nakliyat firması tutarı", "nakliyat firmasi tutari",
  ] },
  { key: "AGREEMENT_COMPANY_OFFER_AMOUNT", domain: "AGREEMENTS", words: [
    "firma teklifi", "firma teklif tutarı", "firma teklif tutari", "şirket teklifi", "sirket teklifi",
    "hizmet alan teklif", "hizmet alanın teklifi", "hizmet alanin teklifi", "anlaşmadaki firma bedeli", "anlasmadaki firma bedeli",
    "sözleşmedeki firma bedeli", "sozlesmedeki firma bedeli", "firma ne teklif etmiş", "firma ne teklif etmis",
  ] },
  { key: "QUALITY_STATE", domain: "OFFERS", words: ["kalite", "kalite durumu", "veri kalitesi", "eksik veri"] },
  { key: "RISK_STATE", domain: "OFFERS", words: ["risk durumu", "risk seviyesi", "risk düzeyi", "risk duzeyi"] },
  { key: "VEHICLE", domain: "VEHICLES", words: ["araç", "arac", "plaka", "vehicle"] },
  { key: "DRIVER", domain: "DRIVERS", words: ["sürücü", "surucu", "şoför", "sofor", "driver"] },
  { key: "ETA", domain: "OPERATIONS", words: ["eta", "tahmini süre", "tahmini sure", "kaç dakika", "kac dakika", "kaç dk", "kac dk"] },
  { key: "GPS", domain: "OPERATIONS", words: ["konum", "gps", "nerede", "takip"] },
  { key: "ROUTE", domain: "OPERATIONS", words: ["rota", "durak", "dura", "güzergah", "guzergah"] },
  { key: "STOP_COUNT", domain: "OPERATIONS", words: ["durak sayısı", "durak sayisi", "durak adedi", "kaç durak", "kac durak", "kaç durağı", "kac duragi"] },
  { key: "PERSONNEL_COUNT", domain: "OPERATIONS", words: ["personel sayısı", "personel sayisi", "personel adedi", "kaç personel", "kac personel"] },
  { key: "OFFER", domain: "OFFERS", words: ["teklif", "offer", "rfq"] },
  { key: "AGREEMENT", domain: "AGREEMENTS", words: ["sözleşme", "sozlesme", "anlaşma", "anlasma", "agreement", "contract"] },
  { key: "SHIFT", domain: "SHIFTS", words: ["vardiya", "sefer", "shift"] },
  { key: "PLAN", domain: "ORGANIZATION_PLANS", words: ["organizasyon plan", "servis plan", "gezi plan", "planım", "planim", "planlarım", "planlarim"] },
  { key: "SERVICE_REQUEST", domain: "SERVICE_REQUESTS", words: ["servis talebi", "talebim", "başvuru", "basvuru"] },
  { key: "COST", domain: "BUDGET", words: ["maliyet", "bütçe", "butce", "gider", "kârlılık", "karlilik", "gelir"] },
  { key: "PARENT_ACCESS", domain: "PERSONNEL", words: ["veli erişimi", "veli erisimi", "ebeveyn erişimi", "ebeveyn erisimi"] },
];

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function roleKey(user) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "COMPANY") {
    const kind = String(user?.companyKind || "COMPANY").toUpperCase();
    if (["SCHOOL", "ORGANIZATION"].includes(kind)) return kind;
  }
  return role;
}

function cleanContextPath(value) {
  return String(value || "").split("?")[0].trim();
}

// This is a narrow, already-authorized screen projection from helpComposer.
// It intentionally excludes user, tenant, entity id and client role hints: the
// planner receives semantic surface facts, never a second authorization input.
function semanticResolutionContext(screenContext) {
  const source = screenContext?.semanticResolutionContext;
  if (!source || typeof source !== "object") return null;
  return {
    authorizedRole: String(source.authorizedRole || "").toUpperCase(),
    requestEntityType: String(source.requestEntityType || "").toLowerCase(),
    sourceScreenPath: cleanContextPath(source.sourceScreenPath),
    effectiveScreenPath: cleanContextPath(source.effectiveScreenPath),
    sourceScreenLabel: String(source.sourceScreenLabel || "").trim(),
    effectiveScreenLabel: String(source.effectiveScreenLabel || "").trim(),
    sourceScreenMenuPurpose: String(source.sourceScreenMenuPurpose || "").trim(),
    effectiveScreenMenuPurpose: String(source.effectiveScreenMenuPurpose || "").trim(),
    selectedEntityType: String(source.selectedEntityType || "").toLowerCase(),
    planningSurfaceText: String(source.planningSurfaceText || "").trim(),
  };
}

function contextualSurfaceText(context) {
  return normalize([
    context?.effectiveScreenPath,
    context?.sourceScreenPath,
    context?.effectiveScreenLabel,
    context?.sourceScreenLabel,
    context?.effectiveScreenMenuPurpose,
    context?.sourceScreenMenuPurpose,
    context?.planningSurfaceText,
  ].filter(Boolean).join(" "));
}

function isCompanyPlanningSurface(context) {
  return /planlama merkezi|rehberli mod|yeni plan olustur|rehberi baslat|yeni plan/.test(contextualSurfaceText(context));
}

function isCompanyPlanningNextAction(text) {
  return /^(?:siradaki dogru islem|bir sonraki dogru islem|simdi ne yapayim|simdi ne yapmaliyim|simdi ne yapacagim|bundan sonra ne yapayim|bundan sonra ne yapmaliyim|nereden devam edeyim|hangi adima gececegim|devaminda ne var|burada siradaki adim hangisi|ne ile baslamaliyim|bir sonraki adim ne|burada once neyi tamamlayayim|bu kayit icin ne yapmam gerekiyor|sirada hangi islem var|burada devam etmek icin ne eksik|sonra ne olacak|simdi hangi butona basacagim|is akisinda siradaki adim nedir)\??$/.test(text);
}

function contextualPublicTypeDecision({ message, context } = {}) {
  if (!context || !context.effectiveScreenPath) return null;
  const text = normalize(message);
  const path = context.effectiveScreenPath;
  const sourcePath = context.sourceScreenPath;
  const planningSurface = isCompanyPlanningSurface(context);
  const decision = (publicQuestionType, signal, taskVariant = publicQuestionType, guidedTaskMeta = null) => ({
    publicQuestionType,
    signal,
    taskVariant,
    guidedTaskMeta,
  });

  if (
    context.requestEntityType === "shift"
    && /\/room\/shifts/.test(path)
    && /(?:bu kayitta|secili kayitta|ayni kayitta|ayni satirda|bu satirda).*(?:ne eksik|eksigi ne|eksik ne var|hangi alan bos|eksik alan|eksik veri|hangi veri eksik|burda ne eksik|burada ne eksik)/.test(text)
  ) return decision("MISSING_DATA_HELP", "selected-record-missing-data");

  if (
    path === "/superadmin/commercial-core"
    && /(?:csv|taslak|onizleme).*(?:ne ise yariyor|ne ise yarar|ne icin|ne demek)/.test(text)
  ) return decision("SCREEN_PURPOSE", "commercial-core-preview-purpose");

  if (
    /\/georeview/.test(path)
    && /^(?:konum|konum nedir|konum ne demek)$/.test(text)
    && !/(geocode|lat\/lng|lat lng|koordinat|adresi|adresleri|duzelt|cevir|harita|gps)/.test(text)
  ) return decision("LOCATION_HELP", "generic-georeview-location-help");

  if (
    path === "/company"
    && /(?:konum|adres|lokasyon|harita|gps).*(?:duzelt|eksik|yanlis|guncelle)|(?:eksik|yanlis).*(?:konum|adres|lokasyon|harita|gps)/.test(text)
  ) return decision("LOCATION_HELP", "company-location-correction");

  if (
    path === "/room/shifts"
    && /(?:bu ekran ne ise yarar|bu ekran ne ise yariyor|bu ekran ne icin|bu panel neyi gosteriyor|bu sayfa ne ise yarar|burada ne yapiyorum|ekranin amaci ne)/.test(text)
  ) return decision("SCREEN_PURPOSE", "room-shift-screen-purpose");

  if (
    path === "/room/shifts"
    && /^(?:simdi ne yapayim|simdi ne yapmaliyim|sıradaki dogru islem|siradaki dogru islem|canli baslat|canli vardiyayi baslat)\??$/.test(text)
  ) return decision("NEXT_STEP", "room-shift-next-step");

  if (
    path === "/room/shifts"
    && /^(?:konum riski|tarih\s*\/\s*saat riski)$/.test(text)
  ) return decision("ROUTE_REVIEW_HUMAN_APPROVAL", "room-shift-route-review-approval");

  if (
    path === "/company/shifts"
    && sourcePath === "/company/map"
    && /^(?:bu secili kayit icin vardiyalar ekraninda once neye bakayim)$/.test(text)
  ) return decision("FIRST_CONTROL", "company-map-shift-first-control-bridge");

  if (
    (/\/shifts/.test(path) || context.requestEntityType === "shift")
    && /^(?:bu vardiya neden baslayamiyor)\??$/.test(text)
  ) return decision("WHY_BLOCKED", "shift-start-blocked");

  if (path === "/company" && planningSurface && isCompanyPlanningNextAction(text)) {
    return decision("NEXT_BEST_ACTION", "company-planning-next-best-action");
  }

  if (
    path === "/company"
    && planningSurface
    && /^(?:vardiyayi takip et)$/.test(text)
  ) return decision("DETAIL_FLOW", "company-planning-detail-flow");

  if (
    path === "/company"
    && planningSurface
    && /^(?:plani surdur)$/.test(text)
  ) {
    const guidedTaskMeta = {
      familyId: "ROUTE_PREP_EXCEL",
      questionType: "EXCEL_ROUTE_PREVIEW",
      replyMode: "BLOCKED",
      progressCommand: "CONTINUE_FLOW",
      progressRaw: String(message || ""),
      label: "Excel / rota hazırlığı",
      summary: "Excel/import, adres readiness ve rota taslağını birlikte okur.",
      why: "Excel/import, adres readiness ve rota taslağını birlikte okudum; gerçek rota oluşturma başlatmam.",
      advice: "Excel satırlarını, eksik adresleri, koordinat readiness ve insan onayını sırayla kontrol et.",
      safeBoundary: "Sadece hazırlık, açıklama ve insan onayı konuşulur.",
      guideLabel: "Excel→rota hazırlık rehberini aç",
      confidence: 0.9,
      matchedSignals: ["ROUTE_PREP_EXCEL", "EXCEL_ROUTE_PREVIEW", "company-planning-excel-continue"],
    };
    return decision("EXCEL_ROUTE_PREVIEW", "company-planning-excel-continue", "EXCEL_ROUTE_PREVIEW", guidedTaskMeta);
  }

  if (path === "/company/operations" && /^(?:eksik veri)\??$/.test(text)) {
    return decision("MISSING_DATA_HELP", "company-operations-missing-data");
  }

  if (path === "/company/operations" && /^(?:kim onaylayacak)\??$/.test(text)) {
    return decision("ROUTE_REVIEW_HUMAN_APPROVAL", "company-operations-route-review-approval");
  }

  if (
    context.requestEntityType === "shift"
    && ["/room/agreements", "/superadmin/commercial-core"].includes(path)
  ) return decision("READINESS_CHECK", "contract-shift-today-readiness");

  return null;
}

function buildContextualPublicTypeSemanticPlan({ role, text, canonicalShape, conversationRoute, decision } = {}) {
  const requestedDomains = canonicalShape?.domain ? [canonicalShape.domain] : [];
  const typedRequest = buildCanonicalTypedRequest({
    shape: {
      ...(canonicalShape || {}),
      taskType: canonicalShape?.taskType || "SCREEN_CONTEXT",
      explicitUserTarget: Boolean(canonicalShape?.explicitUserTarget),
    },
    family: "CONTEXTUAL_PUBLIC_TYPE",
    domains: requestedDomains,
    entities: [],
    requestedFields: [],
    clarificationNeed: null,
  });
  return {
    planVersion: "SEFER_ABI_QUERY_PLAN_V2",
    planStatus: "READY",
    family: "CONTEXTUAL_PUBLIC_TYPE",
    intentFamily: "CONTEXTUAL_PUBLIC_TYPE",
    answerMode: "CONTEXTUAL_HELP",
    confidence: 0.97,
    role,
    normalizedText: text,
    requestedDomains,
    deniedDomains: [],
    conditionalDomains: [],
    entities: [],
    entity: null,
    explicitEntity: null,
    requestedFields: [],
    requestedTaskSlots: [],
    relationshipTraversal: [],
    comparisonSpec: null,
    comparison: null,
    taskVariant: decision.taskVariant,
    publicQuestionType: decision.publicQuestionType,
    guidedTaskMeta: decision.guidedTaskMeta || null,
    authorizationDecision: { status: "ALLOW", allowedDomains: requestedDomains, deniedDomains: [], conditionalDomains: [], reason: "AUTHORIZED_SEMANTIC_SURFACE_CONTEXT" },
    clarificationNeed: null,
    evidenceRequirements: requestedDomains.map((domain) => `DOMAIN:${domain}`),
    temporalMode: "UNKNOWN",
    temporalScope: { mode: "UNKNOWN", explicit: false },
    explicitUiGuidance: false,
    multiDomain: false,
    multiEntity: false,
    followUp: false,
    previousIntentFamily: null,
    dialogueTopic: "PRODUCT",
    conversationRoute: conversationRoute?.route || "PRODUCT_CONTEXT",
    routingReason: decision.signal,
    crossTenantRequested: false,
    signals: {
      authorization: "ALLOW",
      domains: requestedDomains,
      temporalMode: "UNKNOWN",
      entitySource: null,
      entityCount: 0,
      requestedFieldKeys: [],
      requestedTaskSlots: [],
      contextualPublicType: decision.publicQuestionType,
      contextualSignal: decision.signal,
    },
    typedRequest,
    typedRequestValidation: validateCanonicalTypedRequest(typedRequest),
  };
}

function hasAny(text, values) {
  return values.some((value) => text.includes(normalize(value)));
}

const BUYER_ACTOR_TERMS = ["hizmet alan", "hizmet alan taraf", "alıcı", "alici", "alıcı firma", "alici firma", "müşteri", "musteri", "müşteri tarafı", "musteri tarafi"];
const CARRIER_ACTOR_TERMS = ["taşımacı", "tasimaci", "taşıyıcı", "tasiyici", "taşımacılık firması", "tasimacilik firmasi", "taşıyıcı firma", "tasiyici firma", "nakliyeci", "nakliyatçı", "nakliyatci", "nakliyat firması", "nakliyat firmasi"];
// Commercial value is expressed with more than the UI's labels.  Keep the
// concept-level noun set here so actor + value-entry language such as
// "hizmet alan tarafın girdiği miktar" remains a value lookup rather than a
// cardinality request.
const COMMERCIAL_AMOUNT_NOUN_TERMS = ["bedel", "tutar", "rakam", "fiyat", "para", "miktar", "meblağ", "meblag"];
const VALUE_ENTRY_TERMS = [
  "ne girmiş", "ne girmis", "ne yazmış", "ne yazmis", "ne vermiş", "ne vermis", "ne belirtmiş", "ne belirtmis",
  "kaç girmiş", "kac girmis", "kaç yazmış", "kac yazmis", "kaç vermiş", "kac vermis", "ne kadar girmiş", "ne kadar girmis",
  "hangi rakamı girmiş", "hangi rakami girmis", "hangi tutarı yazmış", "hangi tutari yazmis",
  "girdiği ne", "girdigi ne", "yazdığı ne", "yazdigi ne", "verdiği ne", "verdigi ne",
];

function hasCommercialValueEntrySignal(text) {
  return hasAny(text, VALUE_ENTRY_TERMS)
    || /\b(?:ne|kac|hangi)\s+(?:\p{L}+\s+){0,2}(?:girmis|yazmis|vermis|belirtmis|girdi|yazdi|verdi|belirtti)\b/iu.test(normalize(text))
    || /\b(?:girdigi|yazdigi|verdigi|belirttigi)\s+(?:\p{L}+\s+){0,2}(?:bedel|tutar|rakam|fiyat|para|miktar|meblag)\b/iu.test(normalize(text));
}

function hasCommercialValueLookupCue(text) {
  return hasCommercialValueEntrySignal(text) || hasAny(text, COMMERCIAL_AMOUNT_NOUN_TERMS);
}

function inferCommercialValueFields(text, { role = "" } = {}) {
  if (!hasCommercialValueLookupCue(text)) return [];
  const carrierActor = hasAny(text, CARRIER_ACTOR_TERMS);
  const explicitBuyerActor = hasAny(text, BUYER_ACTOR_TERMS);
  const relativeCounterparty = hasAny(text, ["karşı taraf", "karsi taraf"]);
  const genericFirmActor = hasAny(text, ["firma"]) && !carrierActor;
  const fields = [];
  if (carrierActor) fields.push({ key: "CARRIER_AMOUNT", domain: "OFFERS" });
  if (explicitBuyerActor || genericFirmActor) fields.push({ key: "SERVICE_BUYER_AMOUNT", domain: "OFFERS" });
  // Counterparty is relative to the authenticated side of the commercial
  // relationship; it is not a generic buyer alias.  If no canonical side is
  // known for a role, leave it unresolved so the caller can clarify.
  if (relativeCounterparty && !carrierActor && !explicitBuyerActor && !genericFirmActor) {
    if (String(role).toUpperCase() === "ROOM") fields.push({ key: "SERVICE_BUYER_AMOUNT", domain: "OFFERS" });
    if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(String(role).toUpperCase())) fields.push({ key: "CARRIER_AMOUNT", domain: "OFFERS" });
  }
  // In a selected offer, a bare amount follow-up refers to the complete
  // authorized commercial amount projection. Keep both sides typed so the
  // executor can return VALUE/NO_DATA for each instead of falling back to a
  // record count or silently choosing one actor.
  if (!carrierActor && !explicitBuyerActor && !genericFirmActor && !relativeCounterparty) {
    fields.push({ key: "SERVICE_BUYER_AMOUNT", domain: "OFFERS" }, { key: "CARRIER_AMOUNT", domain: "OFFERS" });
  }
  return fields;
}

function hasEntityCountSignal(text) {
  if (hasAny(text, ["kaç tane", "kac tane", "kaç adet", "kac adet", "sayısı", "sayisi", "adedi"])) return true;
  const normalized = normalize(text);
  return /\bkac\s+(?:\p{L}+\s+){0,2}(?:teklif|kayit|vardiya|sefer|sozlesme|anlasma|arac|surucu|personel|ogrenci|veli|talep|plan|okul|organizasyon|is)\p{L}*\s+(?:var|bulunuyor|gorunuyor|mevcut|listelenmis|duruyor|bekliyor|kayitli|kaldi|kalmis)\b/iu.test(normalized);
}

function hasExplicitComparisonIntent(text) {
  return hasAny(text, [
    "karşılaştır", "karsilastir", "karşılaştırma", "karsilastirma", "fark", "arasındaki fark", "arasindaki fark",
    "ikisi arasında", "ikisi arasinda", "hangisi daha", "hangisini seç", "hangisini sec", "biri mi diğeri mi", "biri mi digeri mi",
    "yan yana", "kıyasla", "kiyasla", "kıyas", "kiyas",
  ]) || /(?:^|\s)#?\d+\p{L}*\s*(?:ile|ve|,|\/)\s*#?\d+\p{L}*(?=$|\s|[^\p{L}\p{N}])/iu.test(text)
    || /(?:^|\s)#?\d+\s*(?:mi|mı|mu|mü)\s*#?\d+\s*(?:mi|mı|mu|mü)?(?=$|\s|[^\p{L}\p{N}])/iu.test(text);
}

function hasWord(text, value) {
  const escaped = String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
}

function hasEtaSignal(text) {
  return hasWord(text, "eta")
    || ["tahmini süre", "tahmini sure", "kaç dakika", "kac dakika", "kaç dk", "kac dk"].some((phrase) => text.includes(normalize(phrase)));
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function entityKey(entity) {
  if (!entity) return "";
  return `${entity.type}:${entity.id || entity.plate || ""}`;
}

function typeForSelected(selectedType) {
  const type = String(selectedType || "").toLowerCase();
  return type.includes("shift") || type.includes("vardiya") ? "shift"
    : type.includes("vehicle") || type.includes("arac") ? "vehicle"
      : type.includes("driver") || type.includes("surucu") ? "driver"
        : type.includes("offer") || type.includes("teklif") ? "offer"
          : type.includes("agreement") || type.includes("sozlesme") ? "agreement"
            // Keep the user-facing semantic type intact. Storage mapping to
            // Personel happens only inside the authorized read model.
            : type.includes("parent") || type.includes("veli") ? "parent"
              : type.includes("student") || type.includes("ogrenci") ? "student"
                : type.includes("personnel") || type.includes("personel") ? "personnel"
                  : type.includes("plan") ? "organizationPlan"
              : type.includes("servicerequest") || type.includes("pickuprequest") || type === "request" || type.includes("talep") ? "serviceRequest" : "";
}

function parseExplicitEntities(message) {
  const original = String(message || "");
  const text = normalize(original);
  const entities = [];
  const add = (entity) => {
    if (!entity || entities.some((item) => entityKey(item) === entityKey(entity))) return;
    entities.push(entity);
  };
  const collectTypedList = (regex, type) => {
    for (const match of text.matchAll(regex)) {
      add({ type, id: Number(match[1]), source: "EXPLICIT_QUERY", token: match[0] });
      const tail = String(match[2] || "");
      for (const idMatch of tail.matchAll(/(?:ve|ile|,|\/)\s*#?\s*(\d+)\b/gu)) {
        add({ type, id: Number(idMatch[1]), source: "EXPLICIT_QUERY", token: idMatch[0].trim() });
      }
    }
  };
  // Explicit IDs may take a Turkish possessive/case suffix directly
  // ("Vardiya 151in") or after an apostrophe.  Retain the numeric entity
  // while leaving sentence semantics to the canonical request.
  collectTypedList(/\b(?:vardiya|sefer|shift)\s*#?\s*(\d+)(?:['’]?(?:in|ın|un|ün|i|ı|u|ü|e|a|de|da|den|dan))?\b((?:\s*(?:ve|ile|,|\/)\s*#?\s*\d+)*)/gu, "shift");
  const plates = original.matchAll(/\b(\d{2})\s*([A-ZÇĞİÖŞÜ]{1,3})\s*(\d{2,4})\b/giu);
  for (const match of plates) {
    // Turkish comparison particles ("35 mi 34 mü") match the visual plate
    // shape. They are syntax for a numeric choice, never a vehicle plate.
    if (["ILE", "VE", "MI", "Mİ", "MU", "MÜ"].includes(String(match[2] || "").toUpperCase())) continue;
    const plate = `${match[1]} ${match[2]} ${match[3]}`.replace(/\s+/g, " ").trim().toUpperCase();
    add({ type: "vehicle", plate, source: "EXPLICIT_QUERY", token: match[0] });
  }
  collectTypedList(/\b(?:teklif|offer|rfq)\s*#?\s*(\d+)(?:['’]?(?:in|ın|un|ün|i|ı|u|ü|e|a|de|da|den|dan))?\b((?:\s*(?:ve|ile|,|\/)\s*#?\s*\d+)*)/gu, "offer");
  collectTypedList(/\b(?:sozlesme|anlasma|agreement|contract)\s*#?\s*(\d+)(?:['’]?(?:in|ın|un|ün|i|ı|u|ü|e|a|de|da|den|dan))?\b((?:\s*(?:ve|ile|,|\/)\s*#?\s*\d+)*)/gu, "agreement");
  collectTypedList(/\b(?:ogrenci|student)\s*#?\s*(\d+)\b((?:\s*(?:ve|ile|,|\/)\s*#?\s*\d+)*)/gu, "student");
  collectTypedList(/\b(?:veli|ebeveyn|parent)\s*#?\s*(\d+)\b((?:\s*(?:ve|ile|,|\/)\s*#?\s*\d+)*)/gu, "parent");
  collectTypedList(/\b(?:plan|organizasyon plan)\s*#?\s*(\d+)\b((?:\s*(?:ve|ile|,|\/)\s*#?\s*\d+)*)/gu, "organizationPlan");
  // A typed entity establishes the comparison set; subsequent bare hash ids
  // inherit that type instead of silently disappearing from the ABI plan.
  const typedTypes = unique(entities.map((entity) => entity.type));
  if (typedTypes.length === 1) {
    for (const match of text.matchAll(/(?:^|\s)#\s*(\d+)\b/gu)) {
      add({ type: typedTypes[0], id: Number(match[1]), source: "EXPLICIT_QUERY", token: match[0].trim() });
    }
  }
  return entities;
}

function domainForEntityType(type) {
  return { shift: "SHIFTS", vehicle: "VEHICLES", driver: "DRIVERS", offer: "OFFERS", agreement: "AGREEMENTS", personnel: "PERSONNEL", student: "PERSONNEL", parent: "PERSONNEL", organizationPlan: "ORGANIZATION_PLANS", serviceRequest: "SERVICE_REQUESTS" }[type] || "";
}

function entityDomainsCompatible(type, requestedDomains = []) {
  const allowed = {
    shift: ["SHIFTS", "VEHICLES", "DRIVERS", "OPERATIONS"],
    vehicle: ["VEHICLES", "SHIFTS", "OPERATIONS"],
    driver: ["DRIVERS", "SHIFTS", "OPERATIONS"],
    offer: ["OFFERS", "AGREEMENTS", "SHIFTS", "OPERATIONS"],
    agreement: ["AGREEMENTS", "OFFERS", "SHIFTS", "OPERATIONS"],
    personnel: ["PERSONNEL", "SHIFTS", "VEHICLES", "OPERATIONS", "SERVICE_REQUESTS"],
    student: ["PERSONNEL", "SHIFTS", "VEHICLES", "OPERATIONS", "SERVICE_REQUESTS"],
    parent: ["PERSONNEL"],
    organizationPlan: ["ORGANIZATION_PLANS", "SHIFTS", "OPERATIONS"],
    serviceRequest: ["SERVICE_REQUESTS", "SHIFTS", "OPERATIONS"],
  };
  if (!requestedDomains.length) return true;
  return (allowed[type] || [domainForEntityType(type)]).some((domain) => requestedDomains.includes(domain));
}

function isReferentialRequest(message) {
  const text = String(message || "").trim();
  const normalized = normalize(text);
  // `kayıt` regularly softens to `kayd-` when inflected. Keep this as a
  // morphological noun stem, alongside the other discourse entity nouns.
  const discourseEntityNoun = "(?:kay(?:it|d)|kart|teklif|vardiya|sefer|arac|surucu|sofor|sozlesme|konu|oge)\\p{L}*";
  const discourseReference = new RegExp(`\\b(?:bahset|konus|sozunu\\s+et|degin)\\p{L}*\\s+${discourseEntityNoun}\\b`, "iu").test(normalized)
    || new RegExp(`\\b(?:az|demin|biraz)\\s+once(?:ki)?\\s+${discourseEntityNoun}\\b`, "iu").test(normalized)
    || new RegExp(`\\bdeminki\\s+${discourseEntityNoun}\\b`, "iu").test(normalized)
    || new RegExp(`\\b(?:(?:biraz|bir)\\s+)?once\\s+(?:baktigimiz|konustugumuz|gordugumuz|ele\\s+aldigimiz)\\s+${discourseEntityNoun}\\b`, "iu").test(normalized);
  return discourseReference
    || /^(?:bu|şu|su|o|hani|hani o|hani az önceki|hani az onceki|öteki|oteki|diğerini|digerini|bunun|onun|şunun|sunun|ondan|az önceki|az onceki|önceki|onceki|aynı|ayni|peki|sonra|devam|şunu|sunu|o neydi|bu neydi|hangisiydi|neydi|plakası|plakasi|durumu|tarihi|konumu|konumun|sürücüsü|surucusu|aracı|araci|vardiyanın|vardiyanin|seferin|aracın|aracin|sürücünün|surucunun|eta)\b/iu.test(text);
}

function isBareAmbiguousReference(message) {
  const text = String(message || "").trim();
  return /^(?:onun|öteki|oteki|hani(?:\s+şu|\s+su)?(?:\s+az önceki|\s+az onceki)?|az önceki şey|az onceki sey|o neydi|bu neydi|şunun|sunun|diğerini|digerini|hangisiydi|önceki|onceki|bunun|ondan|şunu|sunu)\b/iu.test(text);
}

function isDiscourseEntityReference(message) {
  const text = normalize(message);
  const discourseEntityNoun = "(?:kay(?:it|d)|kart|teklif|vardiya|sefer|arac|surucu|sofor|sozlesme|konu|oge)\\p{L}*";
  return isBareAmbiguousReference(message)
    || new RegExp(`\\b(?:bahset|konus|sozunu\\s+et|degin)\\p{L}*\\s+${discourseEntityNoun}\\b`, "iu").test(text)
    || new RegExp(`\\b(?:az|demin|biraz)\\s+once(?:ki)?\\s+${discourseEntityNoun}\\b`, "iu").test(text)
    // "deminki teklif" is the inflected single-token form of the same
    // discourse cue, not a new product entity or a generic cause question.
    || new RegExp(`\\bdeminki\\s+${discourseEntityNoun}\\b`, "iu").test(text)
    || new RegExp(`\\b(?:(?:biraz|bir)\\s+)?once\\s+(?:baktigimiz|konustugumuz|gordugumuz|ele\\s+aldigimiz)\\s+${discourseEntityNoun}\\b`, "iu").test(text);
}

function conversationEntitiesFor(state, { preferUniqueDiscourseReferent = false } = {}) {
  const uniqueDiscourseReferent = state?.uniqueDiscourseReferent;
  if (preferUniqueDiscourseReferent && uniqueDiscourseReferent) return [uniqueDiscourseReferent];
  const lastExplicit = Array.isArray(state?.lastExplicitEntitySet) ? state.lastExplicitEntitySet : [];
  if (lastExplicit.length) return lastExplicit.filter(Boolean);
  // Comparison state is a continuation register, not the default referent
  // for a later singular discourse query. A newer unique explicit record
  // must therefore win before a comparison can be considered.
  const activeComparison = Array.isArray(state?.activeComparisonSet) ? state.activeComparisonSet : [];
  if (activeComparison.length > 1) return activeComparison.filter(Boolean);
  const stored = Array.isArray(state?.entityContext?.conversationEntities) ? state.entityContext.conversationEntities : [];
  if (stored.length) return stored.filter(Boolean);
  const lastPlan = state?.authorizedProductContext?.semanticPlan || state?.lastProductSemanticPlan || state?.lastSemanticPlan;
  return Array.isArray(lastPlan?.entities) ? lastPlan.entities : lastPlan?.entity ? [lastPlan.entity] : [];
}

function parseEntity(message, selected, conversationState, screenContext, requestedDomains = []) {
  const explicit = parseExplicitEntities(message);
  if (explicit.length) return explicit[0];
  const normalizedMessage = normalize(message);
  const selectedId = Number(selected?.entityId || conversationState?.selectedEntityId || screenContext?.selectedEntityId || 0);
  const selectedType = typeForSelected(selected?.entityType || conversationState?.selectedEntityType || screenContext?.selectedEntityType);
  const selectedRecordTerms = selectedType === "vehicle"
    ? ["araç", "arac", "plaka", "eta", "konum", "gps", "durak", "rota", "takip", "durum"]
    : selectedType === "shift"
      ? ["eta", "konum", "gps", "durak", "dura", "rota", "takip", "durum", "vardiya", "vardiyanın", "vardiyanin", "araç", "arac", "plaka", "sürücü", "surucu"]
      : selectedType === "driver"
        ? ["sürücü", "surucu", "şoför", "sofor", "driver"]
      : ["araç", "arac", "plaka", "sürücü", "surucu", "eta", "konum", "gps", "durak", "rota", "teklif", "sözleşme", "sozlesme", "karar", "durum", "tarih", "tarihleri", "tarihlerini", "saat", "saatler", "zaman", "başlangıç", "baslangic", "bitiş", "bitis", "bedel", "tutar", "rakam", "fiyat", "para", "hizmet alan", "hizmet alanı", "hizmet alani", "alıcı", "alici", "firma", "müşteri", "musteri", "karşı taraf", "karsi taraf", "taşımacı", "tasimaci", "taşıyıcı", "tasiyici", "taşımacılık firması", "tasimacilik firmasi", "kalite", "risk", "vardiya", "vardiyanın", "vardiyasi", "bağlı", "bagli", "ilişkili", "iliskili", "kayıt", "kayit"];
  const selectedRecordIdentityReference = /\b(?:secil(?:i|en)?|mevcut|bu)\s+kay(?:it|din|di|da)\b|\bsecil(?:i|en)?\s+oge\b/iu.test(normalizedMessage);
  // "bu teklifin riski" and "bunun sonraki adımı" bind the selected
  // record as an entity referent. They do not ask for the selected record's
  // identity, and must stay bound even when the operation is diagnostic.
  const selectedEntityReference = /\b(?:bu|su|secil(?:i|en)?|aktif|baktigim)\s+(?:teklif|vardiya|sefer|arac|plaka|surucu|sofor|sozlesme|kayit)\p{L}*/iu.test(normalizedMessage)
    || (selectedId > 0 && /^(?:bu|bunun|su|sunun|onun|o)\b/iu.test(normalizedMessage));
  const selectedRecordReference = selectedRecordIdentityReference || selectedEntityReference;
  const selectedRelationReference = hasAny(normalizedMessage, [
    "bağlı", "bagli", "bağlı kayıt", "bagli kayit", "ilişkili", "iliskili", "vardiya", "vardiyası", "vardiyasi",
    "sözleşme", "sozlesme", "aracı", "araci", "sürücüsü", "surucusu",
  ]);
  const aggregateDiagnosticRequest = /(?:sorun|problem|sıkıntı|sikinti|risk|aksak|aksayan|ters gidiyor|ters giden)/iu.test(normalizedMessage)
    && !selectedRecordReference;
  const referencesSelectedRecord = selectedRecordReference
    || (!aggregateDiagnosticRequest && hasAny(normalizedMessage, selectedRecordTerms))
    || /^(?:vardiyanın|vardiyanin|seferin|aracın|aracin|sürücünün|surucunun)\b/iu.test(normalizedMessage);
  const screenId = Number(screenContext?.selectedEntityId || 0);
  const screenType = typeForSelected(screenContext?.selectedEntityType);
  const referential = isReferentialRequest(message);
  const discourseEntityReference = isDiscourseEntityReference(message);
  const conversationEntities = conversationEntitiesFor(conversationState, { preferUniqueDiscourseReferent: discourseEntityReference });
  const inherited = conversationEntities.length === 1 ? conversationEntities[0] : null;
  // "Onun/şunun" and named discourse references identify what was being
  // discussed. They must not silently bind to a UI card that happens to stay
  // selected after a multi-record comparison. A unique retained entity is
  // safe to restore; zero or several candidates stays unresolved so the plan
  // produces CLARIFY before any retrieval.
  if (discourseEntityReference) {
    if (inherited && entityDomainsCompatible(inherited.type, requestedDomains)) {
      return { ...inherited, source: "FOLLOW_UP_CONTEXT" };
    }
    if (conversationEntities.length !== 1) return null;
  }
  if ((selectedRecordReference || selectedRelationReference) && Number.isInteger(screenId) && screenId > 0 && screenType && entityDomainsCompatible(screenType, requestedDomains)) {
    return { type: screenType, id: screenId, source: "SCREEN_RECORD" };
  }
  const relationTargetType = hasAny(normalizedMessage, ["vardiya", "sefer", "shift"]) ? "shift"
    : hasAny(normalizedMessage, ["araç", "arac", "vehicle"]) ? "vehicle"
      : hasAny(normalizedMessage, ["sürücü", "surucu", "şoför", "sofor"]) ? "driver"
        : hasAny(normalizedMessage, ["sözleşme", "sozlesme", "agreement"]) ? "agreement"
          : "";
  const relationSourceCandidates = relationTargetType
    ? conversationEntities.filter((item) => item.type !== relationTargetType && ["offer", "agreement", "shift", "vehicle", "driver", "serviceRequest"].includes(item.type))
    : conversationEntities.filter((item) => item.type === "offer" || item.type === "agreement");
  const relationContextSource = selectedRelationReference && relationSourceCandidates.length === 1
    ? relationSourceCandidates[0]
    : null;
  const contextualOffer = conversationEntities.filter((item) => item?.type === "offer");
  if ((referential || referencesSelectedRecord) && inherited && entityDomainsCompatible(inherited.type, requestedDomains)) {
    return { ...inherited, source: "FOLLOW_UP_CONTEXT" };
  }
  if (relationContextSource && entityDomainsCompatible(relationContextSource.type, requestedDomains)) {
    return { ...relationContextSource, source: "RELATION_CONTEXT" };
  }
  if (referencesSelectedRecord && requestedDomains.includes("OFFERS") && contextualOffer.length === 1) {
    return { ...contextualOffer[0], source: "FOLLOW_UP_CONTEXT" };
  }
  const original = String(message || "").trim();
  const last = Array.isArray(conversationState?.recentMessages)
    ? [...conversationState.recentMessages].reverse().find((row) => row?.role === "user" && row?.text)
    : null;
  if (!conversationEntities.length && last && /^(bu|şu|su|ondan|bunun|onun|şunun|sunun|aynı|ayni|peki|sonra)\b/iu.test(original)) {
    const referenced = parseEntity(last.text, null, null, null, requestedDomains);
    if (referenced) return { ...referenced, source: "CONVERSATIONAL_REFERENCE" };
  }
  if (referencesSelectedRecord && !conversationEntities.length && entityDomainsCompatible(screenType, requestedDomains) && Number.isInteger(screenId) && screenId > 0 && screenType) return { type: screenType, id: screenId, source: "SCREEN_RECORD" };
  if (referencesSelectedRecord && !conversationEntities.length && entityDomainsCompatible(selectedType, requestedDomains) && Number.isInteger(selectedId) && selectedId > 0 && selectedType) return { type: selectedType, id: selectedId, source: "SELECTED_RECORD" };
  // A selected card can scope a priority decision even when the user does not
  // repeat the entity name. Bind only actual ordering grammar (first/before +
  // decision target/action), never a bare conversational pronoun.
  const selectedPriorityOperation = /(?:en\s+)?(?:ilk|once)\s+(?:olarak\s+)?(?:neyi|neye|neyle|hangis\p{L}*|hangi\s+is\p{L}*|is\p{L}*)\s+(?:(?:ele\s+al|incele|bak|coz|hallet|ugras)\p{L}*|ne(?:dir|\s+olmali)?)/iu.test(normalizedMessage)
    || /hangis\p{L}*\s+(?:once|ilk)\s+(?:olarak\s+)?(?:ele\s+al|incele|bak|coz|hallet|ugras)\p{L}*/iu.test(normalizedMessage)
    || /\bonceli\p{L}*\b.{0,24}\b(?:ne|nedir|olmali|hangis\p{L}*)\b/iu.test(normalizedMessage)
    || /(?:simdi\s+)?(?:en\s+)?ilk\s+is\p{L}*\s+ne(?:dir|\s+olmali)?/iu.test(normalizedMessage);
  const selectedActionReference = hasAny(normalizedMessage, [
    "sıradaki", "siradaki", "bir sonraki", "bundan sonra", "ilk adım", "ilk adim", "önce neyi", "once neyi",
    "hangisinden başlay", "hangisinden baslay", "neyle başlay", "neyle baslay", "hangi işi önce", "hangi isi once",
  ]) || selectedPriorityOperation;
  const explicitSelectedActionReference = referencesSelectedRecord || /\b(?:bu|su|secili|baktigim|acik)\s+(?:kayit|kart|teklif|vardiya|sefer|arac|sozlesme)\p{L}*/iu.test(normalizedMessage);
  if (selectedActionReference && explicitSelectedActionReference && Number.isInteger(selectedId) && selectedId > 0 && selectedType && entityDomainsCompatible(selectedType, requestedDomains)) {
    return { type: selectedType, id: selectedId, source: "SELECTED_ACTION_CONTEXT" };
  }
  return null;
}

function resolveEntities(message, selected, conversationState, screenContext, requestedDomains = []) {
  const explicit = parseExplicitEntities(message);
  if (explicit.length) return explicit;
  const normalizedMessage = normalize(message);
  const comparisonRequest = hasExplicitComparisonIntent(normalizedMessage);
  const activeComparisonSet = Array.isArray(conversationState?.activeComparisonSet) ? conversationState.activeComparisonSet.filter(Boolean) : [];
  const priorityComparisonSignal = (hasAny(normalizedMessage, ["önce", "once", "öncelik", "oncelik", "ilk", "sıra", "sira"])
    && hasAny(normalizedMessage, ["hangi", "hangisi", "hangisine", "bak", "incele", "değerlendir", "degerlendir", "seç", "sec", "gerekçe", "gerekce", "neden"]))
    // A ranking can use a plural/deictic target without repeating "hangi":
    // "ikisini önem sırasına koy" still operates on the active pair.
    || /\b(?:ikisi|ikisini|bu\s+ikiyi|bunlari)\s+(?:(?:onem|oncelik)\p{L}*\s+)?siras\p{L}*\s+(?:koy|ver|yap|duzenle|sirala|diz)\p{L}*\b/iu.test(normalizedMessage)
    || /\b(?:onem|oncelik)\p{L}*\s+(?:siras\p{L}*|dereces\p{L}*\s+gore)\s+(?:koy|ver|yap|duzenle|sirala|diz)\p{L}*\b/iu.test(normalizedMessage)
    || /\b(?:hangisini|kimi)\s+one\s+koy\p{L}*\b/iu.test(normalizedMessage)
    || /\baciliyet\p{L}*\s+siras\p{L}*\s+(?:yerlestir|koy|ver|sirala|diz)\p{L}*\b/iu.test(normalizedMessage)
    // Once the server-owned conversation state has an active pair, a
    // deictic plural target plus a ranking verb is an ordering request even
    // without a fixed "öncelik" phrase.
    || /\b(?:bu\s+)?(?:ikisi|ikisini|ikiliyi|bunlari|iki\s+(?:teklif|kayit|vardiya|sozlesme)\p{L}*)\b(?:\s+\p{L}+){0,8}\s+(?:sirala|diz|yerlestir|one\s+koy|onceliklendir)\p{L}*/iu.test(normalizedMessage)
    || /\bonce\s+hangi\s+(?:teklif|kayit|vardiya|sozlesme)\p{L}*\s+(?:bak|incele|ele\s+al)\p{L}*/iu.test(normalizedMessage);
  const riskComparisonSignal = hasAny(normalizedMessage, ["risk", "riskler", "tehlike"])
    && hasAny(normalizedMessage, ["hangisi", "hangileri", "önce", "once", "sırala", "sirala", "öncelik", "oncelik", "gerekçe", "gerekce"]);
  const twoEntityReasoningSignal = /\biki\s+(?:teklif|vardiya|sefer|sözleşme|sozlesme|araç|arac|kayıt|kayit)\p{L}*/iu.test(normalizedMessage)
    && hasAny(normalizedMessage, ["risk", "riskler", "tehlike", "sorun", "problem", "gerekçe", "gerekce", "neden", "fark", "durum"]);
  const activeComparisonTask = activeComparisonSet.length > 1
    && (priorityComparisonSignal || riskComparisonSignal || twoEntityReasoningSignal);
  const selectedType = typeForSelected(selected?.entityType || conversationState?.selectedEntityType || screenContext?.selectedEntityType);
  const storedCandidates = conversationEntitiesFor(conversationState);
  const uiCandidates = Array.isArray(screenContext?.selectedEntitySet) ? screenContext.selectedEntitySet.filter(Boolean) : [];
  const conversationCandidates = storedCandidates.length > 1 ? storedCandidates : uiCandidates.length > 1 ? uiCandidates : storedCandidates;
  const contextualType = selectedType || (conversationCandidates.length > 1 && unique(conversationCandidates.map((item) => item.type)).length === 1 ? conversationCandidates[0].type : "");
  const numericPair = normalizedMessage.match(/(?:^|\s)#?(\d+)\p{L}*\s*(?:ile|ve|,|\/)\s*#?(\d+)\p{L}*(?=$|\s|[^\p{L}\p{N}])/iu)
    || normalizedMessage.match(/(?:^|\s)#?(\d+)\s*(?:mi|mı|mu|mü)\s*#?(\d+)\s*(?:mi|mı|mu|mü)?(?=$|\s|[^\p{L}\p{N}])/iu);
  if (comparisonRequest && contextualType && numericPair && entityDomainsCompatible(contextualType, requestedDomains)) {
    return [Number(numericPair[1]), Number(numericPair[2])]
      .filter((id, index, ids) => Number.isInteger(id) && id > 0 && ids.indexOf(id) === index)
      .map((id) => ({ type: contextualType, id, source: "EXPLICIT_QUERY_CONTEXTUAL" }));
  }
  if ((comparisonRequest || activeComparisonTask) && conversationCandidates.length > 1 && conversationCandidates.every((item) => entityDomainsCompatible(item.type, requestedDomains))) {
    return conversationCandidates.map((item) => ({ ...item, source: "ACTIVE_COMPARISON_CONTEXT" }));
  }
  const entity = parseEntity(message, selected, conversationState, screenContext, requestedDomains);
  if (!entity) return [];
  const contextualRelated = conversationEntitiesFor(conversationState).find((candidate) => candidate && entityKey(candidate) !== entityKey(entity) && ["shift", "vehicle", "driver", "agreement"].includes(candidate.type));
  const relatedType = typeForSelected(selected?.relatedEntityType || conversationState?.selectedRelatedEntityType || screenContext?.selectedRelatedEntityType) || contextualRelated?.type || "";
  const relatedId = Number(selected?.relatedEntityId || conversationState?.selectedRelatedEntityId || screenContext?.selectedRelatedEntityId || contextualRelated?.id || 0);
  const relatedDomain = domainForEntityType(relatedType);
  const asksForRelatedEntity = relatedType
    && relatedId > 0
    && requestedDomains.includes(relatedDomain)
    && (entity.type === "offer" || entity.type === "agreement" || entity.type === "shift")
    && hasAny(normalize(message), ["karşılaştır", "karsilastir", "fark", "vardiya", "sefer", "bağlı", "bagli", "ilişkili", "iliskili"]);
  if (asksForRelatedEntity && `${relatedType}:${relatedId}` !== entityKey(entity)) {
    return [entity, { type: relatedType, id: relatedId, source: "OFFER_RELATION", ...(entity.type === "offer" ? { relatedOfferId: entity.id } : {}) }];
  }
  return [entity];
}

function resolveRelationshipIntent(text, entities, selected, conversationState, screenContext, requestedFields = []) {
  if (hasExplicitComparisonIntent(text)) return null;
  const source = entities.find((entity) => ["offer", "agreement", "shift", "vehicle", "driver", "serviceRequest"].includes(entity.type)) || null;
  if (!source) return null;
  const relationWords = ["bağlı", "bagli", "bağını", "bagini", "ait", "ilişkili", "iliskili", "ilişkilendir", "iliskilendir", "sürücüsü", "surucusu", "aracı", "araci", "vardiyası", "vardiyasi", "sözleşmesi", "sozlesmesi", "bağlantısı", "baglantisi", "kaynak", "eşleş", "esles"];
  const directFieldCue = hasAny(text, ["durum", "statü", "statu", "status", "karar", "tarih", "saat", "risk", "kalite", "konum", "rota", "durak"]);
  const explicitRelationCue = hasAny(text, ["bağlı", "bagli", "bağını", "bagini", "ait", "ilişkili", "iliskili", "ilişkilendir", "iliskilendir", "bağlantısı", "baglantisi", "sürücüsü kim", "surucusu kim", "aracı", "araci", "vardiyası", "vardiyasi"])
    || /\b(?:hangi\s+vardiyan\p{L}*|vardiya\s+(?:ilisk|bag)\p{L}*)\b/iu.test(text);
  if (directFieldCue && !explicitRelationCue) return null;
  const relationTarget = hasAny(text, [
    "vardiya", "sefer", "shift", "araç", "arac", "vehicle", "sürücü", "surucu", "şoför", "sofor", "sözleşme", "sozlesme",
    "agreement", "bağlı kayıt", "bagli kayit", "ilişkili kayıt", "iliskili kayit", "kayıt", "kayit",
  ]) || /\bkay\p{L}*/iu.test(text);
  const relationGrammar = /(?:bagl\p{L}*|ait\p{L}*|ilisk\p{L}*|baglanti\p{L}*|esles\p{L}*|kayn\p{L}*)/iu.test(text)
    || /\bhangi\s+vardiyan\p{L}*/iu.test(text)
    || /(?:hangi|ne|numarasi|no|id)\s+(?:vardiya|sefer|shift|arac\p{L}*|surucu\p{L}*|sofor\p{L}*|sozlesme\p{L}*|kayit\p{L}*)/iu.test(text)
    || /(?:vardiya|sefer|shift|arac\p{L}*|surucu\p{L}*|sofor\p{L}*|sozlesme\p{L}*|kayit\p{L}*).{0,24}(?:hangisi|ne|numarasi|no|id)/iu.test(text);
  if (!relationTarget || (!hasAny(text, relationWords) && !relationGrammar)) return null;
  const contextualTarget = conversationEntitiesFor(conversationState).find((candidate) => candidate && entityKey(candidate) !== entityKey(source) && ["shift", "vehicle", "driver", "agreement"].includes(candidate.type));
  const selectedRelatedType = typeForSelected(selected?.relatedEntityType || conversationState?.selectedRelatedEntityType || screenContext?.selectedRelatedEntityType);
  const selectedRelatedId = Number(selected?.relatedEntityId || conversationState?.selectedRelatedEntityId || screenContext?.selectedRelatedEntityId || 0);
  const mentionedRelationTypes = [
    hasAny(text, ["vardiya", "sefer", "shift"]) ? "shift" : "",
    hasAny(text, ["araç", "arac", "vehicle"]) ? "vehicle" : "",
    hasAny(text, ["sürücü", "surucu", "şoför", "sofor"]) ? "driver" : "",
    hasAny(text, ["sözleşme", "sozlesme", "agreement"]) ? "agreement" : "",
  ].filter(Boolean);
  // The selected source is often named possessively ("vardiyanın sürücüsü").
  // Prefer another explicitly mentioned type as the traversal target instead
  // of treating the source noun as both sides of the relation.
  const targetType = mentionedRelationTypes.find((type) => type !== source.type)
    || selectedRelatedType
    || (source.type === "offer" && selectedRelatedId > 0 ? "shift" : "")
    || contextualTarget?.type
    || "";
  if (!targetType || targetType === source.type) return null;
  const target = entities.find((entity) => entity.type === targetType && entityKey(entity) !== entityKey(source)) || contextualTarget || (() => {
    const relatedId = selectedRelatedId;
    return relatedId > 0 ? { type: targetType, id: relatedId, source: "SELECTED_RELATION" } : null;
  })();
  const fieldTargetType = {
    VEHICLE: "vehicle",
    DRIVER: "driver",
    SHIFT: "shift",
    OFFER: "offer",
    AGREEMENT: "agreement",
  }[requestedFields.find((field) => ["VEHICLE", "DRIVER", "SHIFT", "OFFER", "AGREEMENT"].includes(field.key))?.key || ""];
  // A relation question can name only the relation type ("vardiyanın
  // sürücüsü kim?") while the selected source record already carries the
  // authorized relation value.  A concrete target ID is therefore optional:
  // preserve a typed target descriptor so the executor can derive the value
  // from the selected source fact without widening authorization or reading
  // an arbitrary Driver record.
  const resolvedTarget = target || (targetType && targetType !== source.type
    ? { type: targetType, id: null, source: "RELATION_FIELD_TARGET" }
    : fieldTargetType && fieldTargetType !== source.type
      ? { type: fieldTargetType, id: null, source: "RELATION_FIELD_TARGET" }
      : null);
  if (!resolvedTarget) return null;
  const authorizedTarget = source.type === "offer" && resolvedTarget.type === "shift" && Number(source.id) > 0
    ? { ...resolvedTarget, source: "OFFER_RELATION", relatedOfferId: Number(source.id) }
    : resolvedTarget;
  return {
    kind: `${String(source.type).toUpperCase()}_TO_${String(resolvedTarget.type).toUpperCase()}`,
    fromEntity: source,
    toEntity: authorizedTarget,
    requestedRelation: authorizedTarget.type,
    source: source.source || "CONTEXT_RECORD",
  };
}

function resolveTemporalMode(text) {
  if (hasAny(text, ["arşiv", "arsiv"])) return "ARCHIVED";
  if (hasAny(text, ["geçmiş", "gecmis", "önceki", "onceki", "dün", "dun"])) return "HISTORICAL";
  if (hasAny(text, ["bekleyen", "bekliyor", "onay bek", "inceleme bek"])) return "PENDING";
  if (hasAny(text, ["sıradaki", "siradaki", "yaklaşan", "yaklasan", "geliyor", "gelecek"])) return "UPCOMING";
  if (hasAny(text, ["şu an", "su an", "şimdi", "simdi", "aktif", "canlı", "canli"])) return "ACTIVE_NOW";
  if (hasAny(text, ["bugün", "bugun", "bugünkü", "bugunku", "günlük", "gunluk"])) return "ACTIVE_TODAY";
  if (hasAny(text, ["tamamlanan", "tamamlandı", "tamamlandi", "bitti", "sonuçlanan", "sonuclanan"])) return "COMPLETED";
  return "UNKNOWN";
}

function resolveDomains(text, role) {
  const domains = [];
  if (hasAny(text, ["teklif", "rfq", "fiyat teklifi"])) domains.push("OFFERS");
  if (hasAny(text, ["sözleşme", "sozlesme", "anlaşma", "anlasma", "contract", "agreement"])) domains.push("AGREEMENTS");
  if (hasAny(text, ["vardiya", "sefer", "shift", "görev", "gorev"])) domains.push("SHIFTS");
  if (hasAny(text, ["araç", "arac", "plaka", "vehicle"])) domains.push("VEHICLES");
  if (hasAny(text, ["sürücü", "surucu", "şoför", "sofor", "driver"])) domains.push("DRIVERS");
  if (hasAny(text, ["öğrenci", "ogrenci", "çocuk", "cocuk", "personel", "çalışan", "calisan", "veli erişimi", "veli erisimi"])) domains.push("PERSONNEL");
  if (hasAny(text, ["servis talebi", "talebim", "talep", "taleb", "başvuru", "basvuru", "istek"])) domains.push("SERVICE_REQUESTS");
  if (hasAny(text, ["servis", "service"]) && !hasAny(text, ["servis talebi", "talebim", "talep", "taleb"])) domains.push("OPERATIONS", "SHIFTS");
  if (hasAny(text, ["servis plan", "servisim", "servis durumu", "service plan", "service status"])) domains.push("OPERATIONS", "SHIFTS");
  if (hasAny(text, ["konum", "gps", "rota", "durak", "dura", "takip", "operasyon", "gecik", "sorun", "risk"]) || hasEtaSignal(text) || hasWord(text, "nerede")) domains.push("OPERATIONS");
  if (hasAny(text, ["maliyet", "bütçe", "butce", "gider", "kârlılık", "karlilik", "gelir"])) domains.push("BUDGET");
  if (hasAny(text, ["finans", "fatura", "hakediş", "hakedis", "tahsilat", "ödeme", "odeme"])) domains.push("FINANCE");
  if (hasAny(text, ["bildirim", "uyarı", "uyari"])) domains.push("NOTIFICATIONS");
  if (hasAny(text, ["tenant erişim", "tenant erisim", "tenant sağlığı", "tenant sagligi"])) domains.push("TENANT_ACCESS");
  if (hasAny(text, ["tüm domain", "tum domain"])) domains.push(...ALL_READ_DOMAINS);
  if (role === "ORGANIZATION" && hasAny(text, ["plan", "gezi"])) domains.push("ORGANIZATION_PLANS");
  return unique(domains);
}

function resolveScreenDomains(screenContext, role) {
  const path = String(screenContext?.path || "").toLowerCase();
  if (/\/agreements\b/.test(path)) return ["AGREEMENTS"];
  if (/\/offers\b|commercial-flow/.test(path)) return ["OFFERS"];
  if (/\/shifts\b|\/route\b|\/map\b|\/live\b|\/today\b/.test(path)) return ["SHIFTS", "OPERATIONS"];
  if (/\/vehicles\b/.test(path)) return ["VEHICLES", "OPERATIONS"];
  if (/\/drivers\b/.test(path)) return ["DRIVERS", "OPERATIONS"];
  if (/\/plans\b|\/organization\b/.test(path)) return role === "ORGANIZATION" ? ["ORGANIZATION_PLANS", "OPERATIONS"] : ["OPERATIONS"];
  if (/\/operations\b|\/company\b|\/room\b|\/school\b|\/personel\b|\/parent\b|\/driver\b/.test(path)) return ["OPERATIONS", "SHIFTS"];
  return [];
}

function resolveRequestedFields(text, { inferGenericCommercialValue = false, role = "" } = {}) {
  // "karar vermek/almak" is reasoning about a decision process, not a
  // request for the STATUS field of an offer. Ordinary "teklifin kararı"
  // field lookups remain intact.
  const decisionProcessLanguage = /\bkarar\p{L}*\s+(?:ver|al)\p{L}*\b/iu.test(text);
  const fields = [
    ...FIELD_DEFINITIONS.flatMap((field) => {
      const matchedWords = field.words.filter((word) => {
        const normalizedWord = normalize(word);
        return normalizedWord.includes(" ") ? text.includes(normalizedWord) : hasWord(text, normalizedWord);
      });
      if (!matchedWords.length) return [];
      const onlyDecisionWord = matchedWords.every((word) => ["karar", "kararı", "karari"].includes(normalize(word)));
      if (field.key === "STATUS" && decisionProcessLanguage && onlyDecisionWord) return [];
      return [{ key: field.key, domain: field.domain }];
    }),
    ...(inferGenericCommercialValue ? inferCommercialValueFields(text, { role }) : []),
  ];
  // Turkish case suffixes preserve the status concept (for example
  // "durumda", "durumdaydı"). Resolve those forms as STATUS without
  // requiring one literal inflection for every user wording.
  if (/\b(?:durum|statu|status)\p{L}*\b/iu.test(text) && !fields.some((field) => field.key === "STATUS")) {
    fields.push({ key: "STATUS", domain: null });
  }
  // Turkish state-question grammar can name the status property without the
  // canonical field label in isolation ("hangi durumda", "mevcut hali").
  // Treat it as STATUS structurally so a selected-record field query is not
  // later reduced to an identity-only answer.
  if (/\b(?:hangi|ne)\s+durum\p{L}*\b|\b(?:mevcut|su\s+anki|guncel)\s+(?:hal|durum)\p{L}*\b/iu.test(text)
    && !fields.some((field) => field.key === "STATUS")) {
    fields.push({ key: "STATUS", domain: null });
  }
  if (/\bkarar\p{L}*\b/iu.test(text) && !decisionProcessLanguage && !fields.some((field) => field.key === "STATUS")) {
    fields.push({ key: "STATUS", domain: null });
  }
  if (/\b(?:acik|kapali|onayli|reddedilmis|beklemede|taslak)\s*(?:mi|mı|mu|mü)?\b/iu.test(text) && !fields.some((field) => field.key === "STATUS")) {
    fields.push({ key: "STATUS", domain: null });
  }
  const explicitDateWithTimeSignal = /\btarih\p{L}*(?:\s+\p{L}+){0,3}\s+(?:ve|ile)\s+(?:saat|zaman)\p{L}*\b/iu.test(text)
    || /\btarih\p{L}*\s+aralig\p{L}*\b/iu.test(text);
  // Keep the two endpoints adjacent in this branch.  A greedy generic-word
  // span would consume "sonuna" in "tarihini başlangıcından sonuna kadar"
  // before the endpoint matcher can see it.
  const completeDateRangeSignal = /\btarih\p{L}*\s+(?:bastan\s+sona|baslangic\p{L}*\s+(?:(?:ve|ile)\s+)?(?:bit|son)\p{L}*(?:\s+\p{L}+){0,2}|ne\s+zaman\s+basla\p{L}*(?:\s+\p{L}+){0,3}bit\p{L}*)\b/iu.test(text);
  // Turkish case and converb morphology binds the two endpoints without a
  // standalone "ve": başlangıçla bitişi, başlayıp bittiği, kaçtan kaça.
  // These are one composite temporal field, never two count-like entity
  // words.
  const startEndTimeSignal = /\b(?:baslangic|baslama|basla)\p{L}*(?:\s+|-)+(?:(?:ve|ile)\s+)?bit\p{L}*(?:\s+(?:saat|zaman)\p{L}*)?\b/iu.test(text)
    || /\b(?:baslangic|baslama)\p{L}*\s+saat\p{L}*(?:\s+\p{L}+){0,3}\s+bit\p{L}*\s+saat\p{L}*\b/iu.test(text)
    || /\b(?:kactan\s+kaca|saat\p{L}*\s+aralig\p{L}*|zaman\p{L}*\s+dilim\p{L}*|giris\p{L}*\s+cikis\p{L}*|(?:kacta\s+)?basla\p{L}*(?:\s+\p{L}+){0,3}\s+(?:kacta\s+)?bit\p{L}*)\b/iu.test(text);
  const shiftTimeRangeSignal = !explicitDateWithTimeSignal && !completeDateRangeSignal && (/\b(?:vardiya|sefer|shift)\p{L}*(?:\s+\p{L}+){0,2}\s+saat\p{L}*\b/iu.test(text)
    || /\b(?:bu|su|secili|aktif|mevcut)\s+(?:vardiya|sefer|shift)\p{L}*\s+(?:kacta|ne\s+zaman)\b/iu.test(text)
    || startEndTimeSignal);
  const dateRangeSignal = explicitDateWithTimeSignal || completeDateRangeSignal || (!shiftTimeRangeSignal
    && /(?:hangi|ne)\s+(?:saat|zaman)|(?:saatler|tarih\p{L}*(?:\s+\p{L}+){0,3}\s+(?:aralig|saat|zaman)\p{L}*)/iu.test(text));
  if (dateRangeSignal && !fields.some((field) => field.key === "DATE_RANGE")) fields.push({ key: "DATE_RANGE", domain: null });
  if (shiftTimeRangeSignal && !fields.some((field) => field.key === "TIME_RANGE")) fields.push({ key: "TIME_RANGE", domain: null });
  const compositeKeys = new Set(fields.map((field) => field.key));
  const completeFields = compositeKeys.has("DATE_RANGE") || compositeKeys.has("TIME_RANGE")
    ? fields.filter((field) => !["DATE", "START_TIME", "END_TIME"].includes(field.key))
    : fields;
  // "başlangıç-bitiş zamanı" describes a shift interval.  The date-range
  // field's textual marker must not survive beside that explicit time cue and
  // win the final composer by accident.
  const timeSpecificComposite = shiftTimeRangeSignal && /\b(?:saat|zaman|kacta|kactan)\p{L}*\b/iu.test(text);
  const explicit = parseExplicitEntities(text);
  const entityFieldByType = { shift: "SHIFT", vehicle: "VEHICLE", driver: "DRIVER", offer: "OFFER", agreement: "AGREEMENT", organizationPlan: "PLAN", serviceRequest: "SERVICE_REQUEST" };
  const entityFields = new Set(explicit.map((entity) => entityFieldByType[entity.type]).filter(Boolean));
  const carrierAmountSignal = hasAny(text, ["taşımacı", "tasimaci", "taşımacılık", "tasimacilik", "taşıyıcı", "tasiyici", "nakliyeci", "nakliyatçı", "nakliyatci", "nakliyat"]);
  const buyerAmountSignal = hasAny(text, ["hizmet alan", "alıcı", "alici", "müşteri", "musteri"]);
  return completeFields
    .filter((field) => !(timeSpecificComposite && field.key === "DATE_RANGE"))
    .filter((field) => !entityFields.has(field.key))
    .filter((field) => !(field.key === "SERVICE_BUYER_AMOUNT" && carrierAmountSignal && !buyerAmountSignal))
    .filter((field, index, all) => all.findIndex((candidate) => candidate.key === field.key) === index);
}

function removeBusinessDateFieldsForFreshness(fields, taskType) {
  if (taskType !== "FRESHNESS_CHECK") return fields;
  // The freshness executor reads canonical update/observation timestamps.
  // A generic temporal question ("ne zaman güncellendi") must not inject an
  // OFFER.DATE_RANGE request merely because it contains "ne zaman".
  return fields.filter((field) => !["DATE", "DATE_RANGE", "TIME_RANGE", "START_TIME", "END_TIME"].includes(field.key));
}

function _resolveRequestedTaskSlots(text) {
  const slots = [];
  if (hasAny(text, ["gerekçe", "gerekce", "neden", "sebep", "niye", "niçin", "nicin"])) slots.push("REASON");
  if (hasAny(text, ["risk", "riskler", "riskleri", "tehlike", "tehlikeli"])) slots.push("RISK");
  if (hasAny(text, ["sorun", "problem", "sıkıntı", "sikinti", "aksak", "aksayan", "ters gidiyor", "ters giden", "arıza", "ariza"])) slots.push("ISSUE");
  if (hasAny(text, ["kanıt", "kanit", "kanıtı", "kaniti", "delil", "dayanak", "dayanağı", "dayanagi", "dayanıyor", "dayaniyor", "evidence"])) slots.push("EVIDENCE");
  if (hasAny(text, ["etki", "etkisi", "etkileri", "sonuç", "sonuc", "sonucu"])) slots.push("IMPACT");
  if (hasAny(text, ["sonraki güvenli adım", "sonraki guvenli adim", "sonraki adım", "sonraki adim", "bir sonraki", "hemen ne yap", "ne yapmalıyım", "ne yapmaliyim", "ne yapalım", "ne yapalim", "şimdi ne", "simdi ne", "sıradaki doğru işlem", "siradaki dogru islem", "sıradaki güvenli iş", "siradaki guvenli is", "sırada ne var", "sirada ne var", "bundan sonra", "ilk adım", "ilk adim", "ilk hamle", "çözüm adımı", "cozum adimi", "takip adımı", "takip adimi", "sonraki iş", "sonraki is", "sonraki aksiyon", "sonraki action", "devamını anlat", "devamini anlat", "biraz daha anlat", "detaylandır", "detaylandir", "aksiyon", "adımı", "adimi"])) slots.push("NEXT_STEP");
  if (hasAny(text, ["öncelik", "oncelik", "ilk ilgilen", "nereden başlay", "nereden baslay", "hangisinden başlay", "hangisinden baslay", "neyle başlay", "neyle baslay", "hangi işi önce", "hangi isi once", "önce neyi", "once neyi", "acil olan", "ilk sıraya", "ilk siraya"])) slots.push("PRIORITY");
  if (hasAny(text, ["riskleri sırala", "riskleri sirala", "risk sıral", "risk siral", "öncelikli risk", "oncelikli risk", "riskleri karşılaştır", "riskleri karsilastir", "en tehlikeli", "en tehlikeli nokta", "risk görünür", "risk gorunur"])) slots.push("RISK_RANKING");
  return unique(slots);
}

function buildRequestedSlotLedger({ requestedFields = [], relationshipIntent = null, requiredOutputSlots = [] } = {}) {
  const slots = [];
  for (const field of requestedFields) {
    const key = String(field?.key || "");
    if (!key) continue;
    slots.push({
      key,
      kind: ["DATE", "DATE_RANGE", "TIME_RANGE", "START_TIME", "END_TIME"].includes(key) ? "TEMPORAL" : "SCALAR",
      order: slots.length,
    });
  }
  if (relationshipIntent) {
    const from = String(relationshipIntent?.fromEntity?.type || "record").toUpperCase();
    const to = String(relationshipIntent?.toEntity?.type || "record").toUpperCase();
    slots.push({ key: `RELATION:${from}->${to}`, kind: "RELATION", order: slots.length });
  }
  for (const key of requiredOutputSlots) {
    const normalized = String(key || "");
    if (!normalized || slots.some((slot) => slot.key === normalized)) continue;
    slots.push({ key: normalized, kind: "TASK", order: slots.length });
  }
  return slots;
}

function resolveRequestedStyle(text) {
  const normalized = String(text || "").toLocaleLowerCase("tr-TR").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
  if (hasAny(text, ["kısaca", "kisaca", "özetle", "ozetle", "özet geç", "ozet gec", "kısa cevap", "kisa cevap", "daha kısa", "daha kisa", "kısa anlat", "kisa anlat", "iki satır", "iki satırlık", "iki satir", "iki satirlik", "minicik", "ufacık", "ufacik"])
    || /\b(?:daha\s+(?:da\s+)?)?kisa(?:ca)?\b/u.test(text)) return "SHORT_SUMMARY";
  if (hasAny(text, ["madde madde", "maddeler halinde", "tek tek", "sırayla", "sirayla"])) return "BULLET_STEPS";
  if (/\b(?:\d+|bir|iki|uc|dort|bes)\s+madde(?:ye|lik)?\s+(?:ayir|bol|yap|cevir|hale\s+getir)\b/iu.test(normalized)) return "BULLET_STEPS";
  if (hasAny(text, ["tek cümle", "tek cumle", "bir cümle", "bir cumle"])) return "SINGLE_SENTENCE";
  if (hasAny(text, ["çocuk gibi", "cocuk gibi", "çocukça", "cocukca", "sade anlat", "basit anlat", "kolay anlat", "anlaşılır anlat", "anlasilir anlat"])) return "CHILD_FRIENDLY";
  if (hasAny(text, ["kanıtıyla", "kanitiyla", "kanıtla", "kanitla"])) return "EVIDENCE_FIRST";
  if (hasAny(text, ["önce sonucu", "once sonucu", "sonucu önce", "sonucu once"])) return "RESULT_FIRST";
  if (hasAny(text, ["sadece sonucu", "yalnızca sonucu", "yalnizca sonucu"])) return "RESULT_ONLY";
  if (hasAny(text, ["biraz aç", "biraz ac", "biraz açar mısın", "biraz acar misin", "biraz detay", "detaylandır", "detaylandir"])) return "EXPANDED";
  if (hasAny(text, ["başka türlü anlat", "baska turlu anlat", "farklı anlat", "farkli anlat"])) return "REPHRASED";
  // Readability and sentence-shape requests are semantic modifiers, not a
  // closed list of literal utterances.  Keep them presentation-only so a
  // retained product context is transformed rather than re-routed as a new
  // lookup or as harmless off-topic conversation.
  if (/(?:daha|biraz)\s+(?:anlasilir|sade|net|basit|acik)\s+(?:yaz|anlat|aktar|soyle|hale\s+getir)|\b(?:anlasilir|sade|net|basit|acik)\s+(?:bir\s+sekilde\s+)?(?:yaz|anlat|aktar)\b/u.test(normalized)
    || /\b(?:bunu|sunu|onu)\s+(?:sadelestir|basitlestir|netlestir|yeniden\s+yaz|farkli\s+anlat)\b/u.test(normalized)) return "REPHRASED";
  if (/\b(?:bir|iki|tek)\s+cumle(?:ye|lik)?\s+(?:indir|cevir|yap|kur|hale\s+getir)\b/u.test(normalized)
    || /\b(?:iki|bir)\s+cumle\s+(?:ile|olarak)\s+(?:yaz|anlat)\b/u.test(normalized)) return "SHORT_SUMMARY";
  return "";
}

function isDirectBlockedControlQuestion(text) {
  return /^(?:(?:bu|bunu)\s+)?(?:neden|niye)\s+(?:pasif|kapali|gorunmuyor|olmuyor)(?:\s+bu)?\??$/iu.test(text);
}

function isFieldDefinitionQuestion(text) {
  return /\b(?:ne\s+(?:işe|ise)\s+yarar|ne\s+demek)\b/iu.test(text);
}

function resolveFamily({ text, domains, entity, entities, temporalMode, relationshipIntent, requestedFields = [] }) {
  const uiWords = hasAny(text, ["ekran", "menü", "menu", "buton", "sayfa", "panel", "nereden", "nereye", "aç", "ac", "götür", "gotur", "kullan"]);
  const howWords = hasAny(text, ["nasıl", "nasil", "nereden", "hangi ekr", "hangi menü", "hangi menu"]);
  if (hasAny(text, ["bu ekranda neye bak", "bu sayfada neye bak", "ekranda neye bak", "burada neye bak"])) return "SCREEN_OR_SITUATION_SUMMARY";
  if (relationshipIntent) return "RELATION_LOOKUP";
  const commercialValueFieldRequested = requestedFields.some((field) => ["SERVICE_BUYER_AMOUNT", "CARRIER_AMOUNT"].includes(field.key));
  const asksForCardinality = hasEntityCountSignal(text);
  if (commercialValueFieldRequested && entity && !asksForCardinality) return "ENTITY_LOOKUP";
  if (hasAny(text, ["nereden başlay", "nereden baslay", "hangiyle başlay", "hangiyle baslay"])) return "PRIORITY";
  if (hasAny(text, ["ilk ilgilen", "ilk bakılacak", "ilk bakilacak", "ilk hangisi", "ilk hangisini", "önceliğim", "onceligim", "birinci öncelik", "birinci oncelik"])) return "PRIORITY";
  if (hasAny(text, ["riskleri sırala", "riskleri sirala", "risk sıral", "risk siral", "öncelikli risk", "oncelikli risk", "kritik riskleri", "en kritik risk", "en acil risk", "hangi risk önce", "hangi risk once", "riskleri karşılaştır", "riskleri karsilastir", "en tehlikeli", "risk görünür", "risk gorunur", "riskler"])
    && hasAny(text, ["sırala", "sirala", "listele", "öncelik", "oncelik", "önem sırası", "onem sirasi", "hangileri", "hangisi", "önce", "once", "acil", "kritik"])) return "RISK_RANKING";
  if (hasAny(text, ["risk görünür", "risk gorunur", "riskleri karşılaştır", "riskleri karsilastir", "en tehlikeli"])) return "RISK_RANKING";
  const evidenceOrCauseQuestion = !isDirectBlockedControlQuestion(text)
    && !isFieldDefinitionQuestion(text)
    && hasAny(text, [
    "neden", "niye", "sebep", "niçin", "nicin", "nasıl oldu", "nasil oldu",
    "kanıt", "kanit", "kanıtı", "kaniti", "dayanak", "dayanağı", "dayanagi", "delil", "evidence",
  ]) && !hasAny(text, ["sırala", "sirala", "listele", "öncelik sırası", "oncelik sirasi", "risk sıral", "risk siral"]);
  if (evidenceOrCauseQuestion) return "CAUSE_WHY";
  if (/(?:etki|sonuc)\p{L}*.{0,20}(?:ne|nedir|olur|yaratir|dogurur)/iu.test(text)) return "CAUSE_WHY";
  if (hasAny(text, ["risk", "riskler", "riskleri", "tehlike", "tehlikeli"]) && !hasAny(text, ["sorun", "problem", "sıkıntı", "sikinti", "çöz", "coz", "hallet"])) return "RISK_RANKING";
  if (uiWords && howWords) return "UI_GUIDANCE";
  if (domains.includes("BUDGET") && hasAny(text, ["arttı", "artti", "artıyor", "artiyor", "azaldı", "azaldi", "değişti", "degisti", "önceki", "onceki", "güncel", "guncel", "fark", "karşılaştır", "karsilastir", "trend", "kanıt", "kanit", "kanıtlayan", "kanitlayan", "eksik bırakan", "eksik birakan", "evidence"])) return "COST_TREND";
  const prioritizationQuestion = hasAny(text, ["öncelik", "oncelik", "önce", "once", "ilk", "sırada", "sirada", "hangisine", "hangisini"])
    && hasAny(text, ["hangi", "hangisi", "bak", "incele", "değerlendir", "degerlendir", "seç", "sec", "neden", "gerekçe", "gerekce"]);
  if (!isDirectBlockedControlQuestion(text) && !isFieldDefinitionQuestion(text)
    && hasAny(text, ["neden", "niye", "sebep", "niçin", "nicin", "nasıl oldu", "nasil oldu"])
    && !prioritizationQuestion) return "CAUSE_WHY";
  if (hasAny(text, ["çözelim", "cozelim", "çözeriz", "cozeriz", "çözmek", "cozmek", "nasıl çö", "nasil co", "ne yapalım", "ne yapalim", "nasıl halled", "nasil halled", "çözüm adımlar", "cozum adim", "çözüm plan", "cozum plan", "uygulanacak adım", "uygulanacak adim", "uygulanacak çözüm", "uygulanacak cozum", "çözüm sırası", "cozum sirasi", "hangi sırayla", "hangi sirayla", "hangi adımlarla düzelt", "hangi adimlarla duzelt", "toparlay", "toparla"])) return "RESOLUTION_PLAN";
  // Keep explicit product how-to requests in the UI-guidance family so the
  // public intent adapter can select the established HOW_TO_HELP contract
  // instead of treating the mentioned product domain as a generic summary.
  if (howWords && hasAny(text, ["vardiya nasıl oluştur", "vardiya nasil olustur", "teklif nasıl alın", "teklif nasil alin", "sözleşmeye nasıl geç", "sozlesmeye nasil gec", "servisimi nasıl takip", "servisimi nasil takip", "checkin nasıl yap", "checkin nasil yap"])) return "UI_GUIDANCE";
  if (hasAny(text, ["önce", "once", "acil", "en acil", "aciliyet", "öncelikli", "oncelikli", "öncelik", "oncelik", "hangisine el", "ilk ne", "ilk hangisi", "ilk hangisini", "ilk kontrol", "birinci kontrol", "kontrol adayı", "nereden başlay", "nereden baslay", "hangisinden başlay", "hangisinden baslay", "hangiyle başlay", "hangiyle baslay", "neyle başlay", "neyle baslay", "hangi işi önce", "hangi isi once", "önce neyi", "once neyi", "en önemli", "en onemli"])) return "PRIORITY";
  if (hasAny(text, ["sonra", "peki sonra", "ne yapayım", "ne yapayim", "ne yapmalı", "ne yapmali", "sıradaki işlem", "siradaki islem", "sıradaki doğru işlem", "siradaki dogru islem", "sıradaki güvenli", "siradaki guvenli", "sırada hangi", "sirada hangi", "sırada ne var", "sirada ne var", "bundan sonra", "şimdi ne", "simdi ne", "şimdi hangi işi", "simdi hangi isi", "ilk adım", "ilk adim", "bir sonraki güvenli", "bir sonraki guvenli", "bir sonraki işlem", "bir sonraki islem", "doğru işlem", "dogru islem", "doğru adım", "dogru adim", "adım", "adim", "devam et", "devam edelim", "devamını anlat", "devamini anlat", "biraz daha anlat", "detaylandır", "detaylandir"])) return "NEXT_STEP";
  const issueSignal = hasAny(text, ["sorun", "problem", "sıkıntı", "sikinti", "ters", "arıza", "ariza", "aksak", "aksayan", "başka ne", "baska ne"]);
  const explicitComparisonSignal = hasAny(text, ["karşılaştır", "karsilastir", "fark", "hangisi daha", "hangisini seç", "hangisini sec", "biri mi diğeri mi", "biri mi digeri mi", "mantıklı", "mantikli", "alternatif"]);
  if (issueSignal && !explicitComparisonSignal) return "ISSUE_DIAGNOSTIC";
  if (explicitComparisonSignal || (entities.length > 1 && unique(entities.map((item) => item.type)).length === 1)) return "COMPARISON";
  if (issueSignal || hasAny(text, ["risk", "riskler", "tehlike", "tehlikeli"])) return "ISSUE_DIAGNOSTIC";
  if (domains.includes("OPERATIONS") && hasEtaSignal(text)) return "ETA";
  if (domains.includes("OPERATIONS") && hasAny(text, ["konum", "gps", "rota", "durak", "dura", "takip"])) return "LOCATION_GPS";
  if (domains.includes("SERVICE_REQUESTS") && hasAny(text, ["talep", "taleb", "başvuru", "basvuru", "istek"])) return "REQUEST_STATUS";
  if (domains.includes("OPERATIONS") && hasAny(text, ["servis", "service"]) && hasAny(text, ["durum", "ne durumda", "nasıl", "nasil", "bugün", "bugun"])) return "SERVICE_SUMMARY";
  if (hasAny(text, ["onay", "onaylandı", "onaylandi", "bekleyen onay"])) return "APPROVAL_STATUS";
  if (domains.includes("ORGANIZATION_PLANS") && hasAny(text, ["plan", "gezi"])) return "PLAN_STATUS";
  if (temporalMode !== "UNKNOWN") return "TEMPORAL_STATUS";
  if (commercialValueFieldRequested && entity && hasAny(text, ["kaç", "kac"]) && !asksForCardinality) return "ENTITY_LOOKUP";
  if (asksForCardinality) return "COUNT";
  if (entity && hasAny(text, ["kim", "hangi", "hangisi", "plaka", "numara", "id", "aracı", "araci", "sürücüsü", "surucusu"])) return "ENTITY_LOOKUP";
  if (hasAny(text, ["durum", "nasıl gidiyor", "nasil gidiyor", "ne oluyor", "ne var", "özet", "ozet"])) return domains.length > 1 ? "MULTI_DOMAIN_SUMMARY" : "STATUS";
  if (domains.length > 1) return "MULTI_DOMAIN_SUMMARY";
  if (domains.includes("OFFERS") || domains.includes("AGREEMENTS")) return "COMMERCIAL_SUMMARY";
  if (domains.includes("SHIFTS") || domains.includes("OPERATIONS") || domains.includes("PERSONNEL")) return "SERVICE_SUMMARY";
  return "CURRENT_SITUATION";
}

function resolveAnswerMode(family, entities, requestedFields, clarificationNeed, deniedDomains) {
  if (deniedDomains.length) return "AUTHORIZATION_BOUNDARY";
  if (family === "RELATION_LOOKUP") return "RELATION_LOOKUP";
  if (family === "RECORD_DETAILS") return "RECORD_DETAILS";
  if (clarificationNeed) return "CLARIFICATION";
  const projectionFields = requestedFields.filter((field) => !["OFFER", "AGREEMENT", "SHIFT", "PLAN"].includes(field.key));
  if (family === "COMPARISON" || family === "COST_TREND" || ((family === "PRIORITY" || family === "RISK_RANKING") && entities.length > 1)) return "COMPARISON";
  if (entities.length > 1 && projectionFields.length) return "SIDE_BY_SIDE";
  if (entities.length > 1) return "COMPARISON";
  if (requestedFields.length && entities.length) return "DIRECT_FIELD";
  if (["ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "CAUSE_WHY", "PRIORITY", "NEXT_STEP", "RISK_RANKING", "PLAN_REVIEW"].includes(family)) return "DIAGNOSTIC";
  return "SUMMARY";
}

function resolveRelationships(entities, fields, domains) {
  const links = [];
  const add = (from, to, reason) => {
    const key = `${from}->${to}`;
    if (!links.some((item) => item.key === key)) links.push({ key, from, to, reason });
  };
  if (entities.some((entity) => entity.type === "shift") || domains.includes("SHIFTS")) {
    if (fields.some((field) => ["VEHICLE", "DRIVER"].includes(field.key)) || domains.includes("VEHICLES")) add("shift", "vehicle", "shift.vehicleId");
    if (fields.some((field) => field.key === "DRIVER") || domains.includes("DRIVERS")) add("shift", "driver", "shift.driverId");
    if (fields.some((field) => ["ROUTE", "GPS", "ETA"].includes(field.key)) || domains.includes("OPERATIONS")) add("shift", "route/gps/eta", "shift.stops + vehicle.gpsLast");
    if (fields.some((field) => field.key === "OFFER") || domains.includes("OFFERS")) add("shift", "offer", "shift.offers");
    if (fields.some((field) => field.key === "AGREEMENT") || domains.includes("AGREEMENTS")) add("shift", "agreement", "shift.agreementId");
  }
  if (entities.some((entity) => entity.type === "offer") || domains.includes("OFFERS")) add("offer", "agreement/shift", "offer.shiftId then shift.agreementId");
  if (entities.some((entity) => entity.type === "agreement") || domains.includes("AGREEMENTS")) add("agreement", "shift", "agreement.shifts");
  if (entities.some((entity) => entity.type === "organizationPlan") || domains.includes("ORGANIZATION_PLANS")) add("organizationPlan", "operations/shifts", "plan.shifts");
  if (domains.some((domain) => ["PERSONNEL", "SERVICE_REQUESTS"].includes(domain))) add("person/personnel", "service/shift", "authorized personel links");
  return links;
}

function resolveComparisonSpec(family, entities, fields, text) {
  if (family === "COST_TREND") return { kind: "CURRENT_VS_BASELINE", left: "CURRENT", right: "PRIOR_OR_BASELINE", dimensions: ["amount", "period", "status"] };
  if (!["COMPARISON", "PRIORITY", "RISK_RANKING", "NEXT_STEP", "RESOLUTION_PLAN", "ISSUE_DIAGNOSTIC", "CAUSE_WHY"].includes(family) || entities.length < 2) return null;
  const entityType = entities[0]?.type;
  const defaultDimensions = entityType === "shift"
    ? ["STATUS", "START_TIME", "VEHICLE", "DRIVER"]
    : entityType === "offer"
      ? ["STATUS", "DATE", "SHIFT", "AGREEMENT"]
      : entityType === "agreement"
        ? ["STATUS", "DATE", "SHIFT", "VEHICLE", "DRIVER"]
        : ["STATUS", "DATE"];
  const requestedDimensions = fields.map((field) => field.key);
  const dimensions = unique(requestedDimensions.length ? requestedDimensions : defaultDimensions.concat(hasAny(text, ["durum", "status"]) ? ["STATUS"] : []));
  return {
    kind: "ENTITY_COMPARISON",
    leftEntity: entities[0] || null,
    rightEntity: entities[1] || null,
    entityIds: entities.map((entity) => entity.id || entity.plate).filter(Boolean),
    dimensions,
    requestedDifference: true,
  };
}

function resolveClarification(text, entities, fields, domains) {
  const numericChoice = /(?:^|\s)#?\d+\s*(?:mi|mı|mu|mü)\s*#?\d+\s*(?:mi|mı|mu|mü)?(?=$|\s|[^\p{L}\p{N}])/iu.test(text);
  if (entities.length > 1 && !numericChoice && !hasAny(text, ["fark", "karşılaştır", "karsilastir", "hangisi", "arasındaki", "arasindaki", "biri mi", "iki taraf", "iki kaydı", "iki kaydi", "yan yana", "ve", "ile", "hangi"])) return "COMPARISON_TARGET_UNCLEAR";
  if (!entities.length && fields.length === 0 && domains.length === 0 && text.length > 0) return "DOMAIN_OR_ENTITY_UNCLEAR";
  return null;
}

export function getRoleDomainCapabilities(userOrRole) {
  const role = typeof userOrRole === "string" ? String(userOrRole).toUpperCase() : roleKey(userOrRole);
  return { role, capabilities: { ...(ROLE_DOMAIN_CAPABILITIES[role] || {}) } };
}

function buildContinuationSemanticPlan({ role, text, conversationRoute, conversationState, screenContext, previousPlan, selectedEntity } = {}) {
  const priorContinuationDepth = previousPlan?.family === "CONTINUE_CURRENT_REASONING"
    ? Number(previousPlan.continuationDepth || 0)
    : 0;
  let basePlan = previousPlan || null;
  for (let depth = 0; depth < 6 && basePlan && ["STYLE", "CONTINUE_CURRENT_REASONING"].includes(basePlan.family); depth += 1) {
    basePlan = basePlan.family === "STYLE" ? basePlan.styleTargetPlan || null : basePlan.continuationBasePlan || null;
  }
  const screenEntity = screenContext?.selectedEntityId && screenContext?.selectedEntityType
    ? [{ type: typeForSelected(screenContext.selectedEntityType), id: Number(screenContext.selectedEntityId), source: "SCREEN_RECORD" }]
    : [];
  const entities = Array.isArray(basePlan?.entities) && basePlan.entities.length
    ? basePlan.entities
    : selectedEntity?.entityId && selectedEntity?.entityType
      ? [{ type: typeForSelected(selectedEntity.entityType), id: Number(selectedEntity.entityId), source: "SELECTED_RECORD" }]
      : screenEntity;
  const requestedDomains = unique(basePlan?.requestedDomains || (screenContext?.path ? resolveScreenDomains(screenContext, role) : []));
  const requestedFields = Array.isArray(basePlan?.requestedFields) ? basePlan.requestedFields : [];
  const comparisonSpec = basePlan?.comparisonSpec || null;
  const recentMessages = Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages : [];
  const previousAnswerText = [...recentMessages].reverse().find((item) => item?.role === "assistant" && item?.text)?.text || "";
  const continuationOfFamily = basePlan?.continuationOfFamily || basePlan?.family || null;
  const continuationDepth = priorContinuationDepth > 0 ? priorContinuationDepth + 1 : 1;
  const hasGroundedBase = Boolean(basePlan && (basePlan.dialogueTopic === "PRODUCT" || basePlan.requestedDomains?.length || basePlan.entities?.length));
  const clarificationNeed = hasGroundedBase ? null : "CONTINUATION_BASE_NOT_FOUND";
  const shape = {
    taskType: "CONTINUE_CURRENT_REASONING",
    domain: requestedDomains[0] || null,
    targetEntityType: entities[0]?.type ? String(entities[0].type).toUpperCase() : null,
    continuationIntent: true,
    explicitUserTarget: hasGroundedBase,
    confidence: hasGroundedBase ? 0.98 : 0.45,
  };
  const typedRequest = buildCanonicalTypedRequest({
    shape,
    family: "CONTINUE_CURRENT_REASONING",
    domains: requestedDomains,
    entities,
    requestedFields,
    comparisonSpec,
    clarificationNeed,
  });
  return {
    planVersion: "SEFER_ABI_QUERY_PLAN_V2",
    planStatus: clarificationNeed ? "AMBIGUOUS" : "READY",
    family: "CONTINUE_CURRENT_REASONING",
    intentFamily: "CONTINUE_CURRENT_REASONING",
    answerMode: "CONTINUATION",
    confidence: shape.confidence,
    role,
    normalizedText: text,
    requestedDomains,
    semanticEntityType: entities[0]?.type ? String(entities[0].type).toUpperCase() : null,
    deniedDomains: [],
    conditionalDomains: [],
    entities,
    entity: entities[0] || null,
    explicitEntity: entities.find((entity) => entity.source === "EXPLICIT_QUERY") || null,
    entityResolution: { source: entities[0]?.source || null, confidence: hasGroundedBase ? 0.95 : 0, candidateCount: entities.length, ambiguous: Boolean(clarificationNeed) },
    requestedFields,
    requestedTaskSlots: [],
    relationshipTraversal: basePlan?.relationshipTraversal || [],
    comparisonSpec,
    comparison: comparisonSpec,
    relationshipIntent: basePlan?.relationshipIntent || null,
    relationSpec: basePlan?.relationSpec || null,
    taskVariant: "CONTINUE_CURRENT_REASONING",
    continuationOfFamily,
    continuationDepth,
    continuationBasePlan: basePlan,
    previousAnswerText,
    requestedStyle: "",
    styleOnlyRequest: false,
    dialogueTopic: "PRODUCT",
    conversationRoute: conversationRoute.route,
    routingReason: "CANONICAL_CONTINUATION_OPERATION",
    crossTenantRequested: Boolean(basePlan?.crossTenantRequested),
    authorizationDecision: { status: "ALLOW", allowedDomains: requestedDomains, deniedDomains: [], conditionalDomains: [], reason: "CONTINUATION_REAUTH_REQUIRED" },
    clarificationNeed,
    evidenceRequirements: unique([
      ...requestedDomains.map((domain) => `DOMAIN:${domain}`),
      ...entities.map((entity) => `ENTITY:${entityKey(entity)}`),
      ...requestedFields.map((field) => `FIELD:${field.key || field}`),
    ]),
    temporalMode: basePlan?.temporalMode || "UNKNOWN",
    temporalScope: basePlan?.temporalScope || { mode: "UNKNOWN", explicit: false },
    explicitUiGuidance: false,
    multiDomain: requestedDomains.length > 1,
    multiEntity: entities.length > 1,
    followUp: true,
    previousIntentFamily: continuationOfFamily,
    signals: {
      authorization: "ALLOW",
      domains: requestedDomains,
      temporalMode: basePlan?.temporalMode || "UNKNOWN",
      entitySource: entities[0]?.source || null,
      entityCount: entities.length,
      requestedFieldKeys: requestedFields.map((field) => field.key || field),
      requestedTaskSlots: [],
      taskType: "CONTINUE_CURRENT_REASONING",
      followUp: true,
      previousIntentFamily: continuationOfFamily,
      dialogueTopic: "PRODUCT",
      conversationRoute: conversationRoute.route,
    },
    typedRequest,
    typedRequestValidation: validateCanonicalTypedRequest(typedRequest),
    requestState: {
      requestedEntitySet: entities,
      requestedFields,
      requestedDomains,
      reasoningTask: "CONTINUE_CURRENT_REASONING",
      comparisonSpec,
      outputStyle: "CONTINUATION",
      typedRequest,
    },
  };
}

function buildReturnToProductSemanticPlan({ role, text, conversationRoute, conversationState } = {}) {
  const storedPlan = conversationState?.suspendedProductContext?.semanticPlan
    || conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastSettledResult?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || null;
  // Presentation-only STYLE plans wrap the actual product task. Returning to
  // the product must restore that task/entity/evidence state, not the latest
  // shortened sentence as if it were the domain operation.
  let basePlan = storedPlan;
  for (let depth = 0; depth < 4 && basePlan?.family === "STYLE" && basePlan?.styleTargetPlan; depth += 1) {
    basePlan = basePlan.styleTargetPlan;
  }
  const entities = Array.isArray(basePlan?.entities) ? basePlan.entities.filter(Boolean) : basePlan?.entity ? [basePlan.entity] : [];
  const requestedDomains = Array.isArray(basePlan?.requestedDomains) ? basePlan.requestedDomains : [];
  const requestedFields = Array.isArray(basePlan?.requestedFields) ? basePlan.requestedFields : [];
  const clarificationNeed = basePlan ? null : "PRODUCT_CONTEXT_NOT_AVAILABLE";
  const shape = {
    taskType: "RETURN_TO_PRODUCT",
    domain: requestedDomains[0] || null,
    targetEntityType: entities[0]?.type ? String(entities[0].type).toUpperCase() : null,
    returnToProductIntent: true,
    explicitTaskIntent: true,
    explicitUserTarget: Boolean(basePlan),
    confidence: basePlan ? 0.99 : 0.45,
  };
  const typedRequest = buildCanonicalTypedRequest({
    shape,
    family: "RETURN_TO_PRODUCT",
    domains: requestedDomains,
    entities,
    requestedFields,
    relationshipIntent: basePlan?.relationshipIntent || null,
    comparisonSpec: basePlan?.comparisonSpec || null,
    temporalScope: basePlan?.temporalScope || { mode: "UNKNOWN", explicit: false },
    clarificationNeed,
    productContextHint: "RESTORE_SUSPENDED_PRODUCT_CONTEXT",
  });
  return {
    ...(basePlan || {}),
    planVersion: "SEFER_ABI_QUERY_PLAN_V2",
    planStatus: clarificationNeed ? "AMBIGUOUS" : "READY",
    family: basePlan?.family || "RETURN_TO_PRODUCT",
    intentFamily: basePlan?.intentFamily || basePlan?.family || "RETURN_TO_PRODUCT",
    answerMode: "RETURN_CONFIRMATION",
    confidence: shape.confidence,
    role,
    normalizedText: text,
    requestedDomains,
    requestedFields,
    entities,
    entity: entities[0] || null,
    comparisonSpec: basePlan?.comparisonSpec || null,
    comparison: basePlan?.comparisonSpec || null,
    relationshipIntent: basePlan?.relationshipIntent || null,
    relationSpec: basePlan?.relationSpec || basePlan?.relationshipIntent || null,
    returnOperation: true,
    returnTargetFamily: basePlan?.family || null,
    returnTargetPlan: basePlan,
    primaryTask: "RETURN_TO_PRODUCT",
    productContextHint: "RESTORE_SUSPENDED_PRODUCT_CONTEXT",
    dialogueTopic: "PRODUCT",
    conversationRoute: conversationRoute.route,
    routingReason: "RESTORE_FULL_AUTHORIZED_PRODUCT_STATE",
    clarificationNeed,
    authorizationDecision: { status: "ALLOW", allowedDomains: requestedDomains, deniedDomains: [], conditionalDomains: [], reason: "RETURN_CONTEXT_REAUTH_REQUIRED" },
    followUp: true,
    previousIntentFamily: basePlan?.family || null,
    typedRequest,
    typedRequestValidation: validateCanonicalTypedRequest(typedRequest),
    requestState: {
      requestedEntitySet: entities,
      requestedFields,
      requestedDomains,
      reasoningTask: basePlan?.family || "RETURN_TO_PRODUCT",
      comparisonSpec: basePlan?.comparisonSpec || null,
      outputStyle: "RETURN_CONFIRMATION",
      typedRequest,
    },
  };
}

function buildGenericProductHelpSemanticPlan({ text } = {}) {
  const typedRequest = buildCanonicalTypedRequest({
    shape: {
      taskType: "OFF_TOPIC",
      scopeTarget: "NONE",
      domain: null,
      targetEntityType: null,
      explicitUserTarget: false,
      generalInformationIntent: true,
      primaryTask: "GENERIC_PRODUCT_HELP",
    },
    family: "OFF_TOPIC_SAFE",
    primaryTask: "GENERIC_PRODUCT_HELP",
    productContextHint: "PRESERVE_SUSPENDED_SAME_AUTH",
    topicTransition: "TEMPORARY_LEAVE_PRODUCT",
    suspendProductContext: true,
    retrieveProductData: false,
    scopeTarget: "NONE",
  });
  return {
    planVersion: "SEFER_ABI_QUERY_PLAN_V2",
    planStatus: "READY",
    family: "GENERIC_PRODUCT_HELP",
    intentFamily: "GENERIC_PRODUCT_HELP",
    answerMode: "SAFE_STATIC_INFORMATIONAL",
    confidence: 0.99,
    // This lane is intentionally independent from role and route context.
    role: "",
    normalizedText: text,
    requestedDomains: [],
    deniedDomains: [],
    conditionalDomains: [],
    entities: [],
    entity: null,
    explicitEntity: null,
    requestedFields: [],
    requestedTaskSlots: [],
    relationshipTraversal: [],
    comparisonSpec: null,
    comparison: null,
    taskVariant: "GENERIC_PRODUCT_HELP",
    authorizationDecision: { status: "ALLOW", allowedDomains: [], deniedDomains: [], conditionalDomains: [], reason: "SAFE_STATIC_PRODUCT_HELP" },
    clarificationNeed: null,
    evidenceRequirements: [],
    temporalMode: "UNKNOWN",
    temporalScope: { mode: "UNKNOWN", explicit: false },
    explicitUiGuidance: false,
    multiDomain: false,
    multiEntity: false,
    dialogueTopic: "GENERIC_PRODUCT_HELP",
    conversationRoute: "GENERIC_PRODUCT_HELP",
    routingReason: "GENERIC_PRODUCT_HELP_TEXT_SIGNAL",
    primaryTask: "GENERIC_PRODUCT_HELP",
    styleModifier: null,
    productContextHint: "PRESERVE_SUSPENDED_SAME_AUTH",
    topicTransition: "TEMPORARY_LEAVE_PRODUCT",
    suspendProductContext: true,
    retrieveProductData: false,
    crossTenantRequested: false,
    scopeTarget: "NONE",
    signals: {
      authorization: "ALLOW",
      domains: [],
      temporalMode: "UNKNOWN",
      entitySource: null,
      entityCount: 0,
      requestedFieldKeys: [],
      requestedTaskSlots: [],
      followUp: false,
      previousIntentFamily: null,
      dialogueTopic: "GENERIC_PRODUCT_HELP",
      conversationRoute: "GENERIC_PRODUCT_HELP",
    },
    followUp: false,
    previousIntentFamily: null,
    typedRequest,
    typedRequestValidation: validateCanonicalTypedRequest(typedRequest),
  };
}

function buildRoleExplanationSemanticPlan({ text, role } = {}) {
  const typedRequest = buildCanonicalTypedRequest({
    shape: {
      taskType: "OFF_TOPIC",
      scopeTarget: "ROLE_GLOBAL",
      domain: null,
      targetEntityType: null,
      explicitUserTarget: false,
      generalInformationIntent: true,
      primaryTask: "ROLE_EXPLANATION_HELP",
    },
    family: "ROLE_EXPLANATION_HELP",
    primaryTask: "ROLE_EXPLANATION_HELP",
    retrieveProductData: false,
    scopeTarget: "ROLE_GLOBAL",
  });
  return {
    planVersion: "SEFER_ABI_QUERY_PLAN_V2",
    planStatus: "READY",
    family: "ROLE_EXPLANATION_HELP",
    intentFamily: "ROLE_EXPLANATION_HELP",
    answerMode: "SAFE_ROLE_INFORMATIONAL",
    confidence: 0.99,
    role,
    normalizedText: text,
    requestedDomains: [],
    deniedDomains: [],
    conditionalDomains: [],
    entities: [],
    entity: null,
    explicitEntity: null,
    requestedFields: [],
    requestedTaskSlots: [],
    relationshipTraversal: [],
    comparisonSpec: null,
    comparison: null,
    taskVariant: "ROLE_EXPLANATION_HELP",
    authorizationDecision: { status: "ALLOW", allowedDomains: [], deniedDomains: [], conditionalDomains: [], reason: "SAFE_ROLE_HELP" },
    clarificationNeed: null,
    evidenceRequirements: [],
    temporalMode: "UNKNOWN",
    temporalScope: { mode: "UNKNOWN", explicit: false },
    explicitUiGuidance: false,
    multiDomain: false,
    multiEntity: false,
    dialogueTopic: "PRODUCT",
    conversationRoute: "PRODUCT_TASK",
    routingReason: "EXPLICIT_ROLE_HELP_TEXT_SIGNAL",
    primaryTask: "ROLE_EXPLANATION_HELP",
    productContextHint: "NONE",
    retrieveProductData: false,
    crossTenantRequested: false,
    scopeTarget: "ROLE_GLOBAL",
    signals: {
      authorization: "ALLOW",
      domains: [],
      temporalMode: "UNKNOWN",
      entitySource: null,
      entityCount: 0,
      requestedFieldKeys: [],
      requestedTaskSlots: [],
      followUp: false,
      previousIntentFamily: null,
      dialogueTopic: "PRODUCT",
      conversationRoute: "PRODUCT_TASK",
    },
    followUp: false,
    previousIntentFamily: null,
    typedRequest,
    typedRequestValidation: validateCanonicalTypedRequest(typedRequest),
  };
}

// The planner is the only semantic phrase authority.  Public composer-facing
// question types are a stable adapter over its typed plan, never a second
// competing classifier.
export function toPublicQuestionType(semanticPlan) {
  const family = String(semanticPlan?.family || "");
  if (family === "CONTEXTUAL_PUBLIC_TYPE") return String(semanticPlan?.publicQuestionType || "");
  if (family === "GENERIC_PRODUCT_HELP") return "PRODUCT_OVERVIEW_HELP";
  if (family === "ROLE_EXPLANATION_HELP") return "ROLE_EXPLANATION_HELP";
  if (family === "UNCLEAR_OR_AMBIGUOUS") return "CLARIFYING_QUESTION";
  if (family === "SCREEN_CONTEXT" && semanticPlan?.screenDetailIntent) return "SCREEN_PURPOSE";
  if (family === "SHIFT_START_READINESS") return "READINESS_CHECK";
  if (family === "RISK_RANKING") return "RISK_LIST";
  if (family === "CAUSE_WHY") return "ROOT_CAUSE";
  if (family === "PLAN_REVIEW") return "PLAN_REVIEW";
  if (family === "STATUS") return "STATUS_HELP";
  if (family === "CONTINUE_CURRENT_REASONING") return "CONTINUE_FLOW";
  if (family === "NEXT_STEP" && semanticPlan?.taskVariant === "CONTINUATION") return "CONTINUE_FLOW";
  if (family === "NEXT_STEP") return "NEXT_BEST_ACTION";
  return "";
}

export function resolveSemanticIntent({ message, user, selectedEntity, conversationState, screenContext } = {}) {
  const text = normalize(message);
  // Evaluate the one context-free public-product rule before canonical shape
  // inference, because the latter intentionally receives persisted discourse
  // state for genuine contextual follow-ups.
  if (isGenericProductHelpIntent(message)) return buildGenericProductHelpSemanticPlan({ text });
  const role = roleKey(user);
  if (isExplicitRoleHelpIntent(message)) return buildRoleExplanationSemanticPlan({ text, role });
  const canonicalShape = inferCanonicalSemanticRequest({ message, screenContext, conversationState });
  const conversationRoute = resolveConversationRoute({ message, user, conversationState, screenContext, canonicalShape });
  const transportedContext = semanticResolutionContext(screenContext);
  const contextualDecision = hasCrossTenantBoundarySignal(message)
    || (transportedContext?.authorizedRole && transportedContext.authorizedRole !== role)
    ? null
    : contextualPublicTypeDecision({ message, context: transportedContext });
  if (contextualDecision) {
    return buildContextualPublicTypeSemanticPlan({
      role,
      text,
      canonicalShape,
      conversationRoute,
      decision: contextualDecision,
    });
  }
  const requestedOwnershipScope = canonicalShape.requestedOwnershipScope || null;
  if (canonicalShape.taskType === "RETURN_TO_PRODUCT") {
    return buildReturnToProductSemanticPlan({ role, text, conversationRoute, conversationState });
  }
  if (canonicalShape.taskType === "CONTINUE_CURRENT_REASONING") {
    const previousPlan = conversationState?.lastSettledResult?.semanticPlan
      || conversationState?.authorizedProductContext?.semanticPlan
      || conversationState?.lastProductSemanticPlan
      || conversationState?.lastSemanticPlan
      || null;
    return buildContinuationSemanticPlan({ role, text, conversationRoute, conversationState, screenContext, previousPlan, selectedEntity });
  }
  if (["OFF_TOPIC_SAFE", "GENERAL_KNOWLEDGE", "LIVE_EXTERNAL_DATA", "UNCLEAR_OR_AMBIGUOUS"].includes(conversationRoute.route)) {
    const routeFamily = conversationRoute.route;
    const safeTypedRequest = buildCanonicalTypedRequest({
      shape: {
        ...canonicalShape,
        taskType: routeFamily === "UNCLEAR_OR_AMBIGUOUS" ? "CLARIFY" : "OFF_TOPIC",
        domain: null,
        targetEntityType: null,
        explicitUserTarget: false,
        countTarget: null,
        primaryTask: conversationRoute.primaryTask || "OFF_TOPIC_GENERAL_REQUEST",
      styleModifier: conversationRoute.styleModifier || "",
      productContextHint: conversationRoute.productContextHint || "NONE",
      topicTransition: conversationRoute.topicTransition || null,
      suspendProductContext: conversationRoute.suspendProductContext || false,
      retrieveProductData: conversationRoute.retrieveProductData ?? false,
      },
      family: routeFamily,
      requestedStyle: conversationRoute.styleModifier || "",
      primaryTask: conversationRoute.primaryTask || "OFF_TOPIC_GENERAL_REQUEST",
      styleModifier: conversationRoute.styleModifier || "",
      productContextHint: conversationRoute.productContextHint || "NONE",
      topicTransition: conversationRoute.topicTransition || null,
      suspendProductContext: conversationRoute.suspendProductContext || false,
      retrieveProductData: conversationRoute.retrieveProductData ?? false,
    });
    return {
      planVersion: "SEFER_ABI_QUERY_PLAN_V2",
      planStatus: routeFamily === "UNCLEAR_OR_AMBIGUOUS" ? "AMBIGUOUS" : "READY",
      family: routeFamily,
      intentFamily: routeFamily,
      answerMode: routeFamily === "UNCLEAR_OR_AMBIGUOUS" ? "CLARIFICATION" : "SAFE_ROUTING",
      confidence: routeFamily === "UNCLEAR_OR_AMBIGUOUS" ? 0.95 : 0.98,
      role,
      normalizedText: text,
      requestedDomains: [],
      deniedDomains: [],
      conditionalDomains: [],
      entities: [],
      entity: null,
      explicitEntity: null,
      requestedFields: [],
      requestedTaskSlots: [],
      relationshipTraversal: [],
      comparisonSpec: null,
      comparison: null,
      taskVariant: routeFamily,
      authorizationDecision: { status: "ALLOW", allowedDomains: [], deniedDomains: [], conditionalDomains: [], reason: "SAFE_CONVERSATION_ROUTE" },
      clarificationNeed: routeFamily === "UNCLEAR_OR_AMBIGUOUS" ? conversationRoute.reason : null,
      evidenceRequirements: [],
      temporalMode: "UNKNOWN",
      temporalScope: { mode: "UNKNOWN", explicit: false },
      explicitUiGuidance: false,
      multiDomain: false,
      multiEntity: false,
      dialogueTopic: conversationRoute.dialogueTopic,
      conversationRoute: conversationRoute.route,
      routingReason: conversationRoute.reason,
      primaryTask: conversationRoute.primaryTask || "OFF_TOPIC_GENERAL_REQUEST",
      styleModifier: conversationRoute.styleModifier || null,
      productContextHint: conversationRoute.productContextHint || "NONE",
      topicTransition: conversationRoute.topicTransition || null,
      suspendProductContext: conversationRoute.suspendProductContext || false,
      retrieveProductData: conversationRoute.retrieveProductData ?? false,
      crossTenantRequested: false,
      signals: {
        authorization: "ALLOW",
        domains: [],
        temporalMode: "UNKNOWN",
        entitySource: null,
        entityCount: 0,
        requestedFieldKeys: [],
        requestedTaskSlots: [],
        followUp: false,
        previousIntentFamily: conversationState?.lastSemanticPlan?.intentFamily || null,
        dialogueTopic: conversationRoute.dialogueTopic,
        conversationRoute: conversationRoute.route,
      },
      followUp: false,
      previousIntentFamily: conversationState?.lastSemanticPlan?.intentFamily || null,
      typedRequest: safeTypedRequest,
      typedRequestValidation: validateCanonicalTypedRequest(safeTypedRequest),
    };
  }
  const temporalMode = resolveTemporalMode(text);
  let requestedFields = removeBusinessDateFieldsForFreshness(
    resolveRequestedFields(text),
    canonicalShape.taskType,
  );
  if (canonicalShape.productGroundedWritingIntent && canonicalShape.outputAudience === "DRIVER") {
    // The addressee of the composed message is not an extra field request.
    requestedFields = requestedFields.filter((field) => field.key !== "DRIVER");
  }
  // A selected-shift writing request can mention a temporal fact with a
  // natural field synonym ("zamanı", "başlangıç/bitiş") rather than the
  // literal word "saat".  The selected shift is still the only entity and
  // its complete time interval is the canonical fact dependency.
  const selectedGroundedShiftTimeRequest = canonicalShape.productGroundedWritingIntent
    && String(canonicalShape.targetEntityType || canonicalShape.uiContext?.selectedType || "").toLowerCase() === "shift"
    && (/\b(?:saat|zaman|baslangic|bitis)\p{L}*\b/iu.test(text)
      || Boolean(canonicalShape.implicitSelectedFactDependency));
  if (selectedGroundedShiftTimeRequest) {
    // The selected-shift grounded-writing contract uses the complete time
    // interval as a single fact dependency.  Do not let an inflected time
    // word accidentally widen that bounded composition into a date read.
    requestedFields = requestedFields.filter((field) => field.key !== "DATE_RANGE");
    if (!requestedFields.some((field) => field.key === "TIME_RANGE")) {
      requestedFields.push({ key: "TIME_RANGE", domain: null });
    }
  }
  // An explicit cardinality target is a complete request contract.  Entity
  // nouns that are grammatically excluded (for example "sözleşme sayma")
  // are not field requests and must not leak a second domain into COUNT.
  if (canonicalShape.taskType === "COUNT") requestedFields = [];
  if (["SCREEN_CONTEXT", "SELECTED_RECORD_CONTEXT"].includes(canonicalShape.taskType)) requestedFields = [];
  const taskSlotsFromCanonicalRequest = (canonicalShape.requestedTasks || []).flatMap((task) => ({
    ISSUE: ["ISSUE"],
    RISK: ["RISK"],
    NEXT_ACTION: ["NEXT_STEP"],
    CAUSE: ["REASON"],
    PRIORITY: ["PRIORITY"],
    RESOLUTION: ["RESOLUTION"],
    PLAN_REVIEW: ["EVIDENCE", "UNCERTAINTY", "SAFE_NEXT_STEP"],
  }[task] || []));
  const requestedTaskSlots = unique([...taskSlotsFromCanonicalRequest, ...(canonicalShape.requiredOutputSlots || [])]);
  const requestedStyle = canonicalShape.presentationOperator || resolveRequestedStyle(text);
  const semanticEntityType = canonicalShape.targetEntityType
    || (hasAny(text, ["veli", "ebeveyn", "parent"]) ? "PARENT" : hasAny(text, ["öğrenci", "ogrenci"]) ? "STUDENT" : hasAny(text, ["personel", "çalışan", "calisan"]) ? "PERSONNEL" : null);
  const previousPlanForStyle = conversationState?.lastSettledResult?.semanticPlan
    || conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || conversationState?.lastSemanticPlan
    || null;
  const previousSettledPlan = conversationState?.lastSettledResult?.semanticPlan
    || conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || conversationState?.lastSemanticPlan
    || null;
  const styleOnlyRequest = !canonicalShape.productGroundedWritingIntent && (canonicalShape.taskType === "STYLE" || (Boolean(requestedStyle) && !hasAny(text, [
    "sorun", "problem", "sıkıntı", "sikinti", "risk", "öncelik", "oncelik", "çöz", "coz", "durum",
    "vardiya", "sefer", "araç", "arac", "gps", "konum", "rota", "teklif", "sözleşme", "sozlesme",
    "operasyon", "servis", "kayıt", "kayit", "ekran", "panel", "öğrenci", "ogrenci", "personel", "çalışan", "calisan", "veli",
  ])));
  const lexicalDomains = styleOnlyRequest ? [] : resolveDomains(text, role);
  const discourseReferentialFieldLookup = canonicalShape.taskType === "FIELD_LOOKUP"
    && isReferentialRequest(message)
    && !lexicalDomains.length;
  const entityDomains = canonicalShape.taskType === "COUNT" && canonicalShape.domain
    ? [canonicalShape.domain]
    : lexicalDomains.length ? lexicalDomains : discourseReferentialFieldLookup ? [] : resolveScreenDomains(screenContext, role);
  // A named same-auth discourse record is a record target, even when its
  // requested operation (risk/cause/next step) is normally screen-scoped.
  // Keep CURRENT_SCREEN for genuinely deictic questions, but do not discard
  // the unique discourse entity before resolution.
  const screenScopedDecision = canonicalShape.scopeTarget === "CURRENT_SCREEN"
    && ["SCREEN_CONTEXT", "NEXT_ACTION", "PRIORITY", "RISK", "CAUSE", "RESOLUTION"].includes(canonicalShape.taskType)
    && !isDiscourseEntityReference(message);
  // scopeTarget is frozen by the canonical request.  A ROLE_GLOBAL turn may
  // retain the selected record in conversation memory, but it must not inject
  // that record into this turn's entity set.
  const roleGlobalScope = canonicalShape.scopeTarget === "ROLE_GLOBAL";
  let entities = canonicalShape.taskType === "COUNT" || screenScopedDecision || roleGlobalScope
    ? []
    : resolveEntities(message, selectedEntity, conversationState, screenContext, entityDomains);
  // An explicit external owner/subject is a first-class request scope.  Do
  // not let the current UI selection or prior conversation entity silently
  // become the target when that scope has not been resolved and authorized.
  if (requestedOwnershipScope?.explicitExternalScope && !entities.some((entity) => entity?.source === "EXPLICIT_QUERY")) {
    entities = [];
  }
  // A frozen selected-record scope owns the turn for field reads and bare
  // assessment questions alike.  The selected record can therefore return an
  // honest NO_DATA answer rather than being widened to role-global work.
  const frozenSelectedScope = canonicalShape.scopeTarget === "SELECTED_RECORD"
    && !requestedOwnershipScope?.explicitExternalScope
    && canonicalShape.uiContext?.selectedId
    && canonicalShape.uiContext?.selectedType;
  if (frozenSelectedScope && !entities.length) {
    entities = [{
      type: String(canonicalShape.uiContext.selectedType).toLowerCase(),
      id: Number(canonicalShape.uiContext.selectedId),
      source: "FROZEN_SELECTED_SCOPE",
    }];
  }
  const styleTargetPlan = styleOnlyRequest && previousPlanForStyle
    ? (previousPlanForStyle.styleTargetPlan || previousPlanForStyle)
    : null;
  const activeReasoningEntitySet = Array.isArray(conversationState?.activeReasoningEntitySet) && conversationState.activeReasoningEntitySet.length
    ? conversationState.activeReasoningEntitySet.filter(Boolean)
    : Array.isArray(conversationState?.activeComparisonSet) ? conversationState.activeComparisonSet.filter(Boolean) : [];
  const lastExplicitEntitySet = Array.isArray(conversationState?.lastExplicitEntitySet) ? conversationState.lastExplicitEntitySet.filter(Boolean) : [];
  const settledEntitySet = Array.isArray(previousSettledPlan?.entities) ? previousSettledPlan.entities.filter(Boolean) : previousSettledPlan?.entity ? [previousSettledPlan.entity] : [];
  const followUpEntitySet = activeReasoningEntitySet.length ? activeReasoningEntitySet : lastExplicitEntitySet.length ? lastExplicitEntitySet : settledEntitySet;
  if (!roleGlobalScope && !screenScopedDecision && !entities.length
    && (["CAUSE", "ISSUE", "RISK", "PRIORITY", "RESOLUTION", "NEXT_ACTION", "FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY"].includes(canonicalShape.taskType)
      || (canonicalShape.taskType === "FIELD_LOOKUP" && discourseReferentialFieldLookup && followUpEntitySet.length === 1))
    && followUpEntitySet.length) {
    entities = followUpEntitySet.map((current) => ({ ...current, source: current.source || "LAST_SETTLED_PRODUCT_CONTEXT" }));
  }
  if (styleOnlyRequest && styleTargetPlan) {
    const targetEntities = Array.isArray(styleTargetPlan.entities) && styleTargetPlan.entities.length
      ? styleTargetPlan.entities
      : activeReasoningEntitySet.length
        ? activeReasoningEntitySet
        : styleTargetPlan.entity
          ? [styleTargetPlan.entity]
          : [];
    entities = targetEntities.map((entity) => ({ ...entity, source: entity.source || "STYLE_TARGET_CONTEXT" }));
    if (!requestedFields.length && Array.isArray(styleTargetPlan.requestedFields)) requestedFields = styleTargetPlan.requestedFields;
  }
  if (["SELECTED_RECORD_CONTEXT", "RECORD_DETAILS"].includes(canonicalShape.taskType) && !entities.length && canonicalShape.uiContext.selectedId && canonicalShape.uiContext.selectedType) {
    entities = [{ type: canonicalShape.uiContext.selectedType.toLowerCase(), id: canonicalShape.uiContext.selectedId, source: "SELECTED_RECORD_CONTEXT" }];
  }
  const relationshipIntent = resolveRelationshipIntent(text, entities, selectedEntity, conversationState, screenContext, requestedFields);
  if (relationshipIntent) {
    const targetKey = entityKey(relationshipIntent.toEntity);
    const targetHasIdentity = Boolean(relationshipIntent.toEntity?.id || relationshipIntent.toEntity?.plate);
    if (targetHasIdentity) {
      entities = entities.map((current) => entityKey(current) === targetKey ? relationshipIntent.toEntity : current);
      if (!entities.some((current) => entityKey(current) === targetKey)) entities = [...entities, relationshipIntent.toEntity];
    }
  }
  const selectedTypeText = typeForSelected(selectedEntity?.entityType || conversationState?.selectedEntityType || screenContext?.selectedEntityType);
  const activeOfferContext = entities.some((current) => current.type === "offer")
    || selectedTypeText === "offer"
    || lexicalDomains.includes("OFFERS")
    || /\/offers\b|commercial-flow/iu.test(String(screenContext?.path || ""));
  if (activeOfferContext && canonicalShape.taskType !== "COUNT") {
    requestedFields = removeBusinessDateFieldsForFreshness(
      resolveRequestedFields(text, { inferGenericCommercialValue: true, role }),
      canonicalShape.taskType,
    );
  }
  const activeAgreementContext = entities.some((current) => current.type === "agreement")
    || selectedTypeText === "agreement"
    || lexicalDomains.includes("AGREEMENTS")
    || /\/agreements\b/iu.test(String(screenContext?.path || ""));
  if (activeAgreementContext && canonicalShape.taskType !== "COUNT") {
    requestedFields = removeBusinessDateFieldsForFreshness(
      resolveRequestedFields(text, { role }),
      canonicalShape.taskType,
    );
  }
  const entityFieldByType = { shift: "SHIFT", vehicle: "VEHICLE", driver: "DRIVER", offer: "OFFER", agreement: "AGREEMENT", organizationPlan: "PLAN", serviceRequest: "SERVICE_REQUEST" };
  const resolvedEntityFieldKeys = new Set(entities.map((current) => entityFieldByType[current.type]).filter(Boolean));
  if (!canonicalShape.currentAssignmentIntent) {
    requestedFields = requestedFields.filter((field) => !resolvedEntityFieldKeys.has(field.key));
  }
  if (entities.some((current) => current.type === "offer")) {
    if (hasAny(text, ["risk", "tehlike", "tehlikeli"]) && !requestedFields.some((field) => field.key === "RISK_STATE")) requestedFields.push({ key: "RISK_STATE", domain: "OFFERS" });
    if (hasAny(text, ["kalite", "eksik veri"]) && !requestedFields.some((field) => field.key === "QUALITY_STATE")) requestedFields.push({ key: "QUALITY_STATE", domain: "OFFERS" });
  }
  let entity = entities[0] || null;
  const entityScopedFieldLookup = canonicalShape.taskType === "FIELD_LOOKUP"
    && entities.length > 0
    && (discourseReferentialFieldLookup || canonicalShape.scopeTarget === "SELECTED_RECORD");
  const domains = canonicalShape.taskType === "SCREEN_CONTEXT"
    ? []
    : ["COUNT", "PLAN_REVIEW"].includes(canonicalShape.taskType) && canonicalShape.domain
      ? [canonicalShape.domain]
      : styleOnlyRequest
    ? [...(previousPlanForStyle?.requestedDomains || resolveScreenDomains(screenContext, role))]
    : entityScopedFieldLookup
      ? []
      : [...lexicalDomains, ...(lexicalDomains.length ? [] : resolveScreenDomains(screenContext, role))];
  for (const current of entities) {
    if (current.type === "shift") domains.push("SHIFTS");
    if (current.type === "vehicle") domains.push("VEHICLES");
    if (current.type === "driver") domains.push("DRIVERS");
    if (current.type === "offer") domains.push("OFFERS");
    if (current.type === "agreement") domains.push("AGREEMENTS");
    if (current.type === "personnel") domains.push("PERSONNEL");
    if (current.type === "student") domains.push("PERSONNEL");
    if (current.type === "parent") domains.push("PERSONNEL");
    if (current.type === "organizationPlan") domains.push("ORGANIZATION_PLANS");
    if (current.type === "serviceRequest") domains.push("SERVICE_REQUESTS");
  }
  for (const field of requestedFields) domains.push(field.domain);
  const allDomainRequest = hasAny(text, ["tüm domain", "tum domain"]);
  const requestOnly = domains.includes("SERVICE_REQUESTS")
    && !allDomainRequest
    && !hasAny(text, [
      "araç", "arac", "plaka", "sürücü", "surucu", "gps", "konum", "eta", "durak", "rota",
      "vardiya", "sefer", "shift", "teklif", "rfq", "sözleşme", "sozlesme", "anlaşma", "anlasma",
      "plan", "organizasyon", "maliyet", "bütçe", "butce",
    ]);
  let requestedDomains = unique(requestOnly ? domains.filter((domain) => domain === "SERVICE_REQUESTS") : domains);
  // In grounded writing, an audience word (for example "sürücüye") names
  // the addressee of the new message, not another record to retrieve.  Read
  // only the selected record and its explicitly requested fact.
  if (canonicalShape.productGroundedWritingIntent && entities.length) {
    const groundedEntityDomains = entities.map((current) => ({
      shift: "SHIFTS",
      vehicle: "VEHICLES",
      driver: "DRIVERS",
      offer: "OFFERS",
      agreement: "AGREEMENTS",
      personnel: "PERSONNEL",
      student: "PERSONNEL",
      parent: "PERSONNEL",
      organizationPlan: "ORGANIZATION_PLANS",
      serviceRequest: "SERVICE_REQUESTS",
    }[current.type])).filter(Boolean);
    requestedDomains = unique([...groundedEntityDomains, ...requestedFields.map((field) => field.domain)]);
  }
  const capabilities = getRoleDomainCapabilities(role).capabilities;
  const crossTenantRequested = conversationRoute.route === "AUTHORIZATION_NEGATIVE"
    || hasCrossTenantBoundarySignal(text)
    || Boolean(requestedOwnershipScope?.explicitExternalScope);
  const explicitCrossTenantRequest = role !== "SUPER_ADMIN" && crossTenantRequested;
  const conditionalRecordScopeRequest = ["DRIVER", "PERSONEL", "PARENT"].includes(role) && (
    /(?:başka|baska|diğer|diger|başkasının|baskasinin)\s+(?:sürücü|surucu|şoför|sofor|personel|çalışan|calisan|çocuk|cocuk|öğrenci|ogrenci|veli|kişinin|kisinin)/iu.test(text)
    || /(?:başkasının|baskasinin)\s+(?:vardiya|sefer|araç|arac|konum|servis|rota|kayıt|kayit)/iu.test(text)
  );
  const capabilityDeniedDomains = requestedDomains.filter((domain) => capabilities[domain] === "DENY_READ" || !capabilities[domain]);
  const deniedDomains = unique((explicitCrossTenantRequest || conditionalRecordScopeRequest)
    ? requestedDomains.filter((domain) => ["OFFERS", "AGREEMENTS", "SHIFTS", "VEHICLES", "DRIVERS", "PERSONNEL", "SERVICE_REQUESTS", "OPERATIONS", "BUDGET", "FINANCE"].includes(domain))
    : capabilityDeniedDomains);
  const conditionalDomains = requestedDomains.filter((domain) => capabilities[domain] === "CONDITIONAL_RECORD_SCOPE");
  const approvedLastLocationInfoTimeLookup = /^son konum bilgisi ne zaman geldi\??(?:\s*\/\s*saat)?$/.test(text);
  // These are exact, approved Turkish driver-phone location-signal prompts.
  // Keep them alongside the existing last-location alias so a presentation
  // vocabulary change cannot fall through to generic entity lookup.
  const approvedDriverPhoneLocationSignalLookup = [
    /^surucunun telefonundan konum sinyali devrede mi\??$/,
    /^surucunun telefonundan konum bilgisi geliyor mu\??$/,
    /^surucunun telefon konum sinyali aktif mi\??$/,
  ].some((pattern) => pattern.test(text));
  const fieldLookupFamily = canonicalShape.taskType === "FIELD_LOOKUP"
    && requestedDomains.includes("OPERATIONS")
    && requestedFields.some((field) => field.key === "GPS")
    && (hasAny(text, ["rota", "gps"]) || approvedLastLocationInfoTimeLookup || approvedDriverPhoneLocationSignalLookup)
    ? "LOCATION_GPS"
    : "ENTITY_LOOKUP";
  const shapeFamily = {
    SCREEN_CONTEXT: "SCREEN_CONTEXT",
    SELECTED_RECORD_CONTEXT: "SELECTED_RECORD_CONTEXT",
    RECORD_DETAILS: "RECORD_DETAILS",
    SITUATION: "SCREEN_OR_SITUATION_SUMMARY",
    RELATION_LOOKUP: "RELATION_LOOKUP",
    COUNT: "COUNT",
    COMPARISON: "COMPARISON",
    ISSUE: "ISSUE_DIAGNOSTIC",
    FIELD_LOOKUP: fieldLookupFamily,
    RISK: "RISK_RANKING",
    SHIFT_START_READINESS: "SHIFT_START_READINESS",
    STATUS: "STATUS",
    NEXT_ACTION: "NEXT_STEP",
    CAUSE: "CAUSE_WHY",
    PRIORITY: "PRIORITY",
    RESOLUTION: "RESOLUTION_PLAN",
    FRESHNESS_CHECK: "FRESHNESS_CHECK",
    UNCERTAINTY_CHECK: "UNCERTAINTY_CHECK",
    EVIDENCE_SUFFICIENCY: "EVIDENCE_SUFFICIENCY",
    PLAN_REVIEW: "PLAN_REVIEW",
    CLARIFY: "UNCLEAR_OR_AMBIGUOUS",
  }[canonicalShape.taskType] || null;
  const resolvedFamily = shapeFamily || (requestedTaskSlots.includes("RISK") && requestedTaskSlots.includes("EVIDENCE") && requestedTaskSlots.includes("NEXT_STEP")
    ? "RISK_RANKING"
    : resolveFamily({ text, domains: requestedDomains, entity, entities, temporalMode, relationshipIntent, requestedFields }));
  const family = deniedDomains.length
    ? "AUTHORIZATION_BOUNDARY"
    : styleOnlyRequest
      ? "STYLE"
      : resolvedFamily;
  const canReuseComparisonForFollowUp = ["COMPARISON", "CAUSE_WHY", "NEXT_STEP", "PRIORITY", "RISK_RANKING", "RESOLUTION_PLAN", "ISSUE_DIAGNOSTIC", "CONTINUE_CURRENT_REASONING"].includes(family)
    && !parseExplicitEntities(message).length
    && !entity
    && activeReasoningEntitySet.length > 1;
  if (canReuseComparisonForFollowUp) {
    entities = activeReasoningEntitySet.map((current) => ({ ...current, source: current.source || "FOLLOW_UP_COMPARISON_CONTEXT" }));
    entity = entities[0] || null;
  }
  if (family === "COUNT") {
    const entityFieldKeys = new Set(["OFFER", "AGREEMENT", "SHIFT", "PLAN", "VEHICLE", "DRIVER", "SERVICE_REQUEST"]);
    requestedFields = requestedFields.filter((field) => !entityFieldKeys.has(field.key));
  }
  const reasoningTaskFamily = ["SCREEN_OR_SITUATION_SUMMARY", "ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "RISK_RANKING", "SHIFT_START_READINESS", "PLAN_REVIEW"].includes(family);
  const evidenceAssessmentFamily = ["FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY"].includes(family);
  const conversationCandidates = conversationEntitiesFor(conversationState, { preferUniqueDiscourseReferent: isDiscourseEntityReference(message) });
  const referential = isReferentialRequest(message);
  const referentAmbiguous = !relationshipIntent
    && !["SCREEN_CONTEXT", "SELECTED_RECORD_CONTEXT"].includes(family)
    && !parseExplicitEntities(message).length
    && !entities.length
    && (isBareAmbiguousReference(message) || discourseReferentialFieldLookup)
    && referential
    && conversationCandidates.length !== 1;
  const clarificationNeed = styleOnlyRequest
    ? null
    : canonicalShape.ambiguity
      || (["SCREEN_CONTEXT", "SELECTED_RECORD_CONTEXT", "COUNT"].includes(canonicalShape.taskType)
        ? null
      : referentAmbiguous
      ? "REFERENT_AMBIGUOUS"
      : family === "COMPARISON" && entities.length > 1
      ? null
      : relationshipIntent ? null
      : reasoningTaskFamily || evidenceAssessmentFamily ? null : resolveClarification(text, entities, requestedFields, requestedDomains));
  const authorizationStatus = deniedDomains.length ? "DENY" : conditionalDomains.length ? "CONDITIONAL_SCOPE" : "ALLOW";
  const retainedComparisonSpec = canReuseComparisonForFollowUp
    ? (previousSettledPlan?.comparisonSpec || previousSettledPlan?.styleTargetPlan?.comparisonSpec || null)
    : null;
  const comparisonSpec = styleOnlyRequest && styleTargetPlan?.comparisonSpec
    ? styleTargetPlan.comparisonSpec
    : retainedComparisonSpec || resolveComparisonSpec(family, entities, requestedFields, text);
  const answerMode = family === "STYLE"
    ? "STYLE_TRANSFORM"
    : resolveAnswerMode(family, entities, requestedFields, clarificationNeed, deniedDomains);
  const taskVariant = family === "RISK_RANKING"
    ? (canonicalShape.urgentRiskIntent ? "URGENT_ISSUES" : "ORDERED_RISKS")
    : family === "SHIFT_START_READINESS"
      ? "SHIFT_START_READINESS"
    : family === "PLAN_REVIEW"
      ? "PLAN_REVIEW"
    : family === "CAUSE_WHY" && requestedTaskSlots.includes("IMPACT")
      ? "IMPACT"
    : family === "ISSUE_DIAGNOSTIC"
    ? (hasAny(text, ["var mı", "var mi"]) ? "ISSUE_PRESENCE" : hasAny(text, ["başka ne", "baska ne"]) ? "ADDITIONAL_ISSUES" : "ISSUE_DIAGNOSTIC")
      : family === "RESOLUTION_PLAN"
        ? (hasAny(text, ["ne yapalım", "ne yapalim"]) ? "ACTION_DECISION" : "ORDERED_RESOLUTION")
        : family === "PRIORITY"
          ? (hasAny(text, ["nereden başlay", "nereden baslay"]) ? "STARTING_POINT" : "FIRST_PRIORITY")
            : family === "NEXT_STEP"
              ? (hasAny(text, [
                "devam et", "devam edelim", "peki sonra", "sonra ne",
                "devamını anlat", "devamini anlat", "biraz daha anlat",
                "detaylandır", "detaylandir",
              ]) ? "CONTINUATION" : "IMMEDIATE_NEXT_STEP")
    : family === "RELATION_LOOKUP"
              ? "RELATED_RECORD"
            : family === "FRESHNESS_CHECK"
              ? "CURRENTNESS_VERIFICATION"
            : family === "UNCERTAINTY_CHECK"
              ? "UNCERTAINTY_ASSESSMENT"
            : family === "EVIDENCE_SUFFICIENCY"
              ? "EVIDENCE_SUFFICIENCY_ASSESSMENT"
            : family;
  const relationshipTraversal = resolveRelationships(entities, requestedFields, requestedDomains);
  if (relationshipIntent) relationshipTraversal.push({ key: `${relationshipIntent.fromEntity.type}->${relationshipIntent.toEntity.type}`, from: relationshipIntent.fromEntity.type, to: relationshipIntent.toEntity.type, reason: "semantic relationship lookup" });
  const evidenceRequirements = unique([
    ...requestedDomains.map((domain) => `DOMAIN:${domain}`),
    ...entities.map((current) => `ENTITY:${entityKey(current)}`),
    ...requestedFields.map((field) => `FIELD:${field.key}`),
    ...relationshipTraversal.map((link) => `RELATION:${link.key}`),
    comparisonSpec ? "COMPARISON:LEFT_AND_RIGHT" : "",
  ]);
  const signalCount = [requestedDomains.length, entities.length, requestedFields.length, temporalMode !== "UNKNOWN" ? 1 : 0, text.length > 0 ? 1 : 0].reduce((sum, value) => sum + value, 0);
  const confidence = family === "AUTHORIZATION_BOUNDARY" ? 0.99 : clarificationNeed ? 0.71 : Math.min(0.98, 0.5 + (signalCount * 0.08));
  const explicitEntity = entities.find((current) => current.source === "EXPLICIT_QUERY") || null;
  const previousPlan = conversationState?.lastSettledResult?.semanticPlan
    || conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || conversationState?.lastSemanticPlan
    || null;
  const hasFollowUpContext = Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.some((row) => row?.role === "user" && row?.text);
  const authorizationDecision = {
    status: authorizationStatus,
    allowedDomains: requestedDomains.filter((domain) => !deniedDomains.includes(domain)),
    deniedDomains,
    conditionalDomains,
    reason: deniedDomains.length
      ? (explicitCrossTenantRequest ? "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL" : conditionalRecordScopeRequest ? "RECORD_SCOPE_DENIED_BEFORE_RETRIEVAL" : "DOMAIN_CAPABILITY_DENIED")
      : conditionalDomains.length ? "RECORD_SCOPE_MUST_BE_VERIFIED" : crossTenantRequested && role === "SUPER_ADMIN" ? "SUPER_ADMIN_CROSS_TENANT_READ_ALLOWED" : "ROLE_DOMAIN_ALLOWED",
  };
  const requestedSlotLedger = buildRequestedSlotLedger({
    requestedFields,
    relationshipIntent,
    requiredOutputSlots: unique([...requestedTaskSlots, ...(canonicalShape.requiredOutputSlots || [])]),
  });
  const typedRequest = buildCanonicalTypedRequest({
    shape: family === "STYLE"
      ? { ...canonicalShape, taskType: "STYLE", targetEntityType: entities[0]?.type ? String(entities[0].type).toUpperCase() : null, explicitUserTarget: true, styleTarget: "LAST_SETTLED_RESULT", scopeTarget: "LAST_SETTLED_RESULT" }
      : referentAmbiguous
        ? { ...canonicalShape, taskType: "CLARIFY", ambiguity: "REFERENT_AMBIGUOUS", explicitTaskIntent: true }
        : canonicalShape,
    family,
    domains: requestedDomains,
    entities,
    requestedFields,
    relationshipIntent,
    comparisonSpec,
    temporalScope: { mode: temporalMode, explicit: temporalMode !== "UNKNOWN" },
    requestedStyle,
    requiredOutputSlots: canonicalShape.requiredOutputSlots || [],
    requestedSlotLedger,
    presentationOperator: canonicalShape.presentationOperator || requestedStyle,
    presentationItemCount: canonicalShape.presentationItemCount ?? null,
    styleTarget: family === "STYLE" ? "LAST_SETTLED_RESULT" : canonicalShape.styleTarget || "",
    clarificationNeed,
    primaryTask: family === "STYLE" ? "STYLE" : referentAmbiguous ? "CLARIFY" : family,
    styleModifier: requestedStyle || conversationRoute.styleModifier || "",
    productContextHint: family === "STYLE" ? "TRANSFORM_LAST_SETTLED_RESULT" : "ACTIVE_PRODUCT_CONTEXT",
    // STYLE operates exclusively on the already-authorized settled result.
    // It preserves context for presentation, but cannot cause a new product
    // query at the plan/executor boundary.
    retrieveProductData: deniedDomains.length === 0 && !styleOnlyRequest,
    requestedOwnershipScope,
  });
  return {
    planVersion: "SEFER_ABI_QUERY_PLAN_V2",
    planStatus: clarificationNeed ? "AMBIGUOUS" : deniedDomains.length ? "UNAUTHORIZED" : "READY",
    family: INTENT_FAMILIES.includes(family) ? family : "CURRENT_SITUATION",
    intentFamily: INTENT_FAMILIES.includes(family) ? family : "CURRENT_SITUATION",
    answerMode,
    confidence,
    role,
    normalizedText: text,
    requestedDomains,
    semanticEntityType: styleOnlyRequest
      ? (styleTargetPlan?.semanticEntityType || entities[0]?.type?.toUpperCase() || semanticEntityType)
      : semanticEntityType,
    currentAssignmentIntent: Boolean(canonicalShape.currentAssignmentIntent),
    deniedDomains,
    conditionalDomains,
    entities,
    entity,
    explicitEntity,
    entityResolution: {
      source: explicitEntity ? "EXPLICIT_QUERY" : entity?.source || null,
      confidence: explicitEntity ? 1 : entity ? (referentAmbiguous ? 0 : entity.source === "FOLLOW_UP_CONTEXT" ? 0.9 : 0.75) : 0,
      candidateCount: explicitEntity ? entities.length : (conversationCandidates.length || (entity ? 1 : 0)),
      ambiguous: Boolean(referentAmbiguous),
    },
    discourseReference: Boolean(referential),
    requestedFields,
    requestedTaskSlots,
    requestedSlotLedger: typedRequest.requestedSlotLedger,
    scopeTarget: typedRequest.scopeTarget,
    requiredOutputSlots: typedRequest.requiredOutputSlots,
    activeEntitySet: typedRequest.activeEntitySet,
    requestedTasks: canonicalShape.requestedTasks || typedRequest.requestedTasks || [],
    relationshipTraversal,
    comparisonSpec,
    comparison: comparisonSpec,
    relationshipIntent,
    relationSpec: relationshipIntent,
    taskVariant,
    screenDetailIntent: Boolean(typedRequest.screenDetailIntent),
    styleTargetFamily: styleOnlyRequest ? (styleTargetPlan?.family || null) : null,
    styleTargetPlan: styleTargetPlan || null,
    requestedStyle,
    styleOnlyRequest,
    primaryTask: family === "STYLE" ? "STYLE" : referentAmbiguous ? "CLARIFY" : family,
    styleModifier: requestedStyle || conversationRoute.styleModifier || null,
    productContextHint: family === "STYLE" ? "TRANSFORM_LAST_SETTLED_RESULT" : "ACTIVE_PRODUCT_CONTEXT",
    dialogueTopic: "PRODUCT",
    conversationRoute: conversationRoute.route,
    routingReason: conversationRoute.reason,
    retrieveProductData: Boolean(typedRequest.retrieveProductData),
    productGroundedWritingIntent: Boolean(typedRequest.productGroundedWritingIntent),
    presentationTask: typedRequest.presentationTask || null,
    outputAudience: typedRequest.outputAudience || null,
    crossTenantRequested,
    requestedOwnerScope: requestedOwnershipScope?.requestedOwnerScope || null,
    requestedTenantScope: requestedOwnershipScope?.requestedTenantScope || null,
    requestedSubjectScope: requestedOwnershipScope?.requestedSubjectScope || null,
    ownershipRelation: requestedOwnershipScope?.ownershipRelation || null,
    explicitExternalScope: Boolean(requestedOwnershipScope?.explicitExternalScope),
    authorizationDecision,
    clarificationNeed,
    evidenceRequirements,
    temporalMode,
    temporalScope: { mode: temporalMode, explicit: temporalMode !== "UNKNOWN" },
    explicitUiGuidance: family === "UI_GUIDANCE",
    multiDomain: requestedDomains.length > 1,
    multiEntity: entities.length > 1,
    signals: {
      authorization: authorizationStatus,
      domains: requestedDomains,
      temporalMode,
      entitySource: entity?.source || null,
      entityCount: entities.length,
      requestedFieldKeys: requestedFields.map((field) => field.key),
      requestedTaskSlots,
      taskType: typedRequest.taskType,
      followUp: hasFollowUpContext,
      previousIntentFamily: previousPlan?.intentFamily || null,
      dialogueTopic: "PRODUCT",
      conversationRoute: conversationRoute.route,
    },
    followUp: hasFollowUpContext,
    previousIntentFamily: styleOnlyRequest ? (styleTargetPlan?.intentFamily || styleTargetPlan?.family || null) : (previousPlan?.intentFamily || null),
    typedRequest,
    typedRequestValidation: validateCanonicalTypedRequest(typedRequest),
    requestState: {
      requestedEntitySet: entities,
      requestedFields,
      requestedDomains,
      reasoningTask: family,
      comparisonSpec,
      outputStyle: answerMode,
      typedRequest,
    },
    screenContext: {
      path: String(screenContext?.path || ""),
      label: String(screenContext?.label || ""),
      selectedEntity: screenContext?.selectedEntityId && screenContext?.selectedEntityType
        ? { type: typeForSelected(screenContext.selectedEntityType), id: Number(screenContext.selectedEntityId) }
        : null,
    },
  };
}

export { INTENT_FAMILIES, ROLE_DOMAIN_CAPABILITIES };
