const TASK_TYPES = new Set([
  "SCREEN_CONTEXT",
  "SELECTED_RECORD_CONTEXT",
  "RECORD_DETAILS",
  "CONTINUE_CURRENT_REASONING",
  "FIELD_LOOKUP",
  "RELATION_LOOKUP",
  "COUNT",
  "COMPARISON",
  "SITUATION",
  "ISSUE",
  "CAUSE",
  "RESOLUTION",
  "RISK",
  "PRIORITY",
  "NEXT_ACTION",
  "SHIFT_START_READINESS",
  "FRESHNESS_CHECK",
  "UNCERTAINTY_CHECK",
  "EVIDENCE_SUFFICIENCY",
  "RETURN_TO_PRODUCT",
  "PLAN_REVIEW",
  "STYLE",
  "OFF_TOPIC",
  "CLARIFY",
]);

const ENTITY_CONCEPTS = [
  { type: "OFFER", domain: "OFFERS", terms: ["teklif", "offer", "rfq"] },
  { type: "SHIFT", domain: "SHIFTS", terms: ["vardiya", "sefer", "shift"] },
  { type: "AGREEMENT", domain: "AGREEMENTS", terms: ["sozlesme", "anlasma", "agreement", "contract"] },
  { type: "VEHICLE", domain: "VEHICLES", terms: ["arac", "plaka", "vehicle"] },
  { type: "DRIVER", domain: "DRIVERS", terms: ["surucu", "sofor", "driver"] },
  { type: "PERSONNEL", domain: "PERSONNEL", terms: ["personel", "calisan"] },
  { type: "STUDENT", domain: "PERSONNEL", terms: ["ogrenci", "cocuk", "student"] },
  { type: "PARENT", domain: "PERSONNEL", terms: ["veli", "ebeveyn", "parent"] },
  { type: "SERVICE_REQUEST", domain: "SERVICE_REQUESTS", terms: ["servis talebi", "talep", "basvuru"] },
  { type: "ORGANIZATION_PLAN", domain: "ORGANIZATION_PLANS", terms: ["organizasyon plani", "servis plani", "gezi plani"] },
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

const OWNER_SCOPE_CONCEPTS = [
  { type: "SCHOOL", pattern: /(?:okul|school)\p{L}*/iu },
  { type: "COMPANY", pattern: /(?:firma|şirket|sirket|company)\p{L}*/iu },
  { type: "ORGANIZATION", pattern: /(?:kurum|organizasyon|organization)\p{L}*/iu },
  { type: "LEGAL_ENTITY", pattern: /(?:tüzel|tuzel)\s+(?:kişi|kisi|kişinin|kisinin)\b/iu },
  { type: "ACCOUNT", pattern: /(?:hesa[pb]|account)\p{L}*/iu },
  { type: "TENANT", pattern: /tenant\p{L}*/iu },
  { type: "DRIVER", pattern: /(?:sürücü|surucu|şoför|sofor|driver)\p{L}*/iu },
  { type: "PERSONNEL", pattern: /(?:personel|çalışan|calisan|employee)\p{L}*/iu },
  { type: "STUDENT", pattern: /(?:öğrenci|ogrenci|çocuk|cocuk|student)\p{L}*/iu },
  { type: "PARENT", pattern: /(?:veli|ebeveyn|parent)\p{L}*/iu },
];

const SUBJECT_SCOPE_CONCEPTS = [
  { type: "OFFER", pattern: /(?:teklif|offer|rfq)\p{L}*/iu },
  { type: "AGREEMENT", pattern: /(?:sözleşme|sozlesme|anlaşma|anlasma|agreement|contract)\p{L}*/iu },
  { type: "SHIFT", pattern: /(?:vardiya|sefer|shift)\p{L}*/iu },
  { type: "VEHICLE", pattern: /(?:araç|arac|plaka|vehicle)\p{L}*/iu },
  { type: "DRIVER", pattern: /(?:sürücü|surucu|şoför|sofor|driver)\p{L}*/iu },
  { type: "PERSONNEL", pattern: /(?:personel|çalışan|calisan|employee)\p{L}*/iu },
  { type: "STUDENT", pattern: /(?:öğrenci|ogrenci|çocuk|cocuk|student)\p{L}*/iu },
  { type: "PARENT", pattern: /(?:veli|ebeveyn|parent)\p{L}*/iu },
  { type: "PERSON", pattern: /(?:kişi|kisi|insan|person)\p{L}*/iu },
  { type: "SERVICE_REQUEST", pattern: /(?:servis|service)\p{L}*/iu },
  { type: "RECORD", pattern: /(?:kay(?:it|d)|record)\p{L}*/iu },
];

// `normalize()` is applied before this expression. Keep this marker
// morphological rather than phrase-specific: an external owner can include
// an intervening determiner ("başka bir kurumun") and ownership can be
// negated through an explicitly named current-owner relation ("bizim kuruma
// bağlı olmayan"). Those structures must establish scope before any current
// tenant or selected-record fallback is considered.
const EXTERNAL_OWNER_NOUN = "(?:okul|firma|sirket|kurum|organizasyon|hesa[pb]|tenant|surucu|sofor|arac|personel|ogrenci|veli|cocuk|kisi)";
const EXTERNAL_POSSESSIVE_OWNER_NOUN = `${EXTERNAL_OWNER_NOUN}(?:in|un|nin|nun)`;
const OPTIONAL_EXTERNAL_DETERMINER = "(?:(?:bir|birer|herhangi\\s+bir)\\s+)?";
const CURRENT_OWNER_REFERENCE = "(?:bize|bizim|bu|su|o|benim|bana|kendi|mevcut)";
const EXTERNAL_SCOPE_MARKER = new RegExp(
  `(?:\\b(?:baska|oteki|diger|farkli)\\s+${OPTIONAL_EXTERNAL_DETERMINER}${EXTERNAL_POSSESSIVE_OWNER_NOUN}\\b|\\b(?:harici|external|baskasinin)\\b|\\bbaskas\\p{L}*\\s+ait\\b|\\b(?:bizden|sizden)\\s+olmayan\\b|\\b${CURRENT_OWNER_REFERENCE}\\b\\s+(?:${EXTERNAL_OWNER_NOUN}\\p{L}*\\s+){0,2}(?:ait\\s+olmayan|bagli\\s+olmayan|olmayan|dis(?:indaki|inda)?|harici|otesi|otesinde)|\\b(?:bu|bizim|mevcut|kendi)\\s+(?:hesab\\p{L}*\\s+(?:dis(?:indaki|inda)?|harici|otesi|otesinde|bagli\\s+olmayan)|kapsam\\p{L}*\\s+(?:dis(?:indaki|inda)?|harici))|\\b(?:kapsam|hesap|tenant|sirket|firma|kurum)\\b\\s+(?:disi|disindaki|disinda|harici)|\\b(?:bagli|ait)\\s+olmayan)`,
  "iu",
);

function firstScopeConcept(text, concepts) {
  return concepts.find((concept) => concept.pattern.test(text))?.type || null;
}

export function inferRequestedOwnershipScope(value) {
  const text = normalize(value);
  const ownerType = firstScopeConcept(text, OWNER_SCOPE_CONCEPTS);
  const subjectType = firstScopeConcept(text, SUBJECT_SCOPE_CONCEPTS);
  const externalMarker = EXTERNAL_SCOPE_MARKER.test(text);
  const explicitExternalScope = Boolean(externalMarker && (ownerType || subjectType));
  const tenantOwner = new Set(["SCHOOL", "COMPANY", "ORGANIZATION", "LEGAL_ENTITY", "ACCOUNT", "TENANT"]);
  return {
    requestedOwnerScope: explicitExternalScope ? { relation: "EXTERNAL", ownerType: ownerType || null } : null,
    requestedTenantScope: explicitExternalScope && ownerType && tenantOwner.has(ownerType) ? "EXTERNAL_TENANT" : explicitExternalScope ? "EXTERNAL_OWNER" : null,
    requestedSubjectScope: explicitExternalScope ? { relation: "EXTERNAL", subjectType: subjectType || null } : null,
    ownershipRelation: explicitExternalScope ? "NOT_CURRENT_OWNER" : null,
    explicitExternalScope,
    markers: explicitExternalScope ? ["EXTERNAL_SCOPE_MARKER"] : [],
  };
}

function hasTerm(text, term) {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(" ")) return text.includes(normalizedTerm);
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${normalizedTerm}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
}

function hasAnyTerm(text, terms) {
  return terms.some((term) => hasTerm(text, term));
}

function typeForSelected(value) {
  const type = normalize(value);
  if (type.includes("offer") || type.includes("teklif")) return "OFFER";
  if (type.includes("shift") || type.includes("vardiya") || type.includes("sefer")) return "SHIFT";
  if (type.includes("agreement") || type.includes("sozlesme")) return "AGREEMENT";
  if (type.includes("vehicle") || type.includes("arac")) return "VEHICLE";
  if (type.includes("driver") || type.includes("surucu")) return "DRIVER";
  if (type.includes("parent") || type.includes("veli")) return "PARENT";
  if (type.includes("student") || type.includes("ogrenci") || type.includes("cocuk")) return "STUDENT";
  if (type.includes("personnel") || type.includes("personel") || type.includes("calisan")) return "PERSONNEL";
  if (type.includes("organizationplan") || type.includes("organization_plan") || type === "plan") return "ORGANIZATION_PLAN";
  return "";
}

function currentUiContext(screenContext, conversationState) {
  const path = String(screenContext?.path || conversationState?.lastScreenPath || "").trim();
  const label = String(screenContext?.label || conversationState?.lastScreenLabel || "").trim();
  // Visible controls are route-bound UI context only. They never grant a
  // capability or select data: server-side role/screen authorization remains
  // authoritative, and the guided-target resolver still requires a real
  // currently rendered control before it can return FOUND.
  const visibleControlCount = Array.isArray(screenContext?.uiHints?.visibleButtons)
    ? screenContext.uiHints.visibleButtons
      .filter((item) => String(item?.label || "").trim())
      .length
    : 0;
  const selectedId = Number(screenContext?.selectedEntityId || conversationState?.selectedEntityId || 0);
  // The routing adapter deliberately never transports an entity id. It may
  // carry the already-authorized current-screen selection type, however,
  // which is enough to distinguish an unresolved parent-live target from a
  // selected service without making that selection an authorization input.
  const selectedType = typeForSelected(
    screenContext?.selectedEntityType
    || conversationState?.selectedEntityType
    || screenContext?.semanticResolutionContext?.selectedEntityType,
  );
  const selectedEntityPresent = Boolean(
    screenContext?.semanticResolutionContext?.selectedEntityPresent === true
    || (selectedId > 0 && selectedType),
  );
  return { path, label, selectedId: selectedId > 0 ? selectedId : null, selectedType, selectedEntityPresent, visibleControlCount };
}

function hasCardinalityCue(text) {
  // A complete numeric calculation is a general task, not an entity count.
  // Do not let a bare "kaç" borrow the current product screen as a target.
  // Cardinality is a property of an entity *set*, not a token.  In
  // particular, "firma teklifi kaç" is a scalar-field question on a selected
  // agreement, whereas "kaç teklif var" asks for an OFFER set cardinality.
  if (isGeneralArithmeticRequest(text)) return false;
  const explicitEntityTarget = ENTITY_CONCEPTS.some((concept) => hasAnyTerm(text, concept.terms));
  if (!explicitEntityTarget) return false;
  const typedCountVerb = /\b(?:say|listele|toplamla)\p{L}*\b/iu.test(text)
    && ENTITY_CONCEPTS.some((concept) => hasAnyTerm(text, concept.terms));
  const explicitCountNoun = /(?:^|[^\p{L}])(?:say(?:i|ini|isini|isi|ilar|ilari)|aded(?:i|ini)|toplam)(?=$|[^\p{L}])/iu.test(text)
    || hasAnyTerm(text, ["kac tane", "kac adet", "toplam kac"]);
  const countPredicate = /\b(?:var|bulunuyor|gorunuyor|mevcut|kayitli|listelen|duruyor|bekliyor|kaldi|kalmis)\p{L}*\b/iu.test(text);
  const quantifiedSet = /(?:^|[^\p{L}])kac\s+(?:\p{L}+\s+){0,2}\p{L}+/iu.test(text) && countPredicate;
  return explicitCountNoun || typedCountVerb || quantifiedSet;
}

// Turkish arithmetic is expressed with both symbols and ordinary language.
// Model the operation over numeric operands, rather than enumerating complete
// sentences. Explicit product entity/count language remains outside this rule.
export function evaluateGeneralArithmeticRequest(value) {
  const text = normalize(value);
  if (!text) return null;
  const productCountTarget = ENTITY_CONCEPTS.some((concept) => hasAnyTerm(text, concept.terms))
    || /\b(?:kayit|vardiya|teklif|sozlesme|anlasma|arac|surucu|personel|ogrenci|veli|talep|plan)\p{L}*\b/iu.test(text);
  if (productCountTarget) return null;
  const plainNumber = "(\\d+(?:[.,]\\d+)?)";
  const number = (raw) => Number(String(raw || "").replace(",", "."));
  const numberWords = new Map([
    ["sifir", 0], ["bir", 1], ["iki", 2], ["uc", 3], ["dort", 4], ["bes", 5], ["alti", 6], ["yedi", 7], ["sekiz", 8], ["dokuz", 9],
    ["on", 10], ["yirmi", 20], ["otuz", 30], ["kirk", 40], ["elli", 50], ["altmis", 60], ["yetmis", 70], ["seksen", 80], ["doksan", 90],
  ]);
  const parseNumberWords = (raw) => {
    const candidate = String(raw || "").trim();
    if (!candidate) return null;
    if (/^\d+(?:[.,]\d+)?$/u.test(candidate)) return number(candidate);
    const tokens = candidate.split(/\s+/u);
    let total = 0;
    let current = 0;
    for (const token of tokens) {
      if (numberWords.has(token)) {
        current += numberWords.get(token);
      } else if (token === "yuz") {
        current = (current || 1) * 100;
      } else if (token === "bin") {
        total += (current || 1) * 1000;
        current = 0;
      } else if (token === "duzine") {
        current = (current || 1) * 12;
      } else {
        return null;
      }
    }
    return total + current;
  };
  // Remove a result-request suffix before splitting the operands.  Keeping
  // it outside the operand capture prevents a greedy fallback from treating
  // "kaç eder" as part of the right-hand number.
  const expressionText = text.replace(/\s+(?:kac\s+eder|nedir|sonucu)\??$/u, "").trim();
  const wordExpression = expressionText.match(/^(.+?)\s+(arti|eksi|kere|carpi|bol)\s+(.+?)\??$/u);
  if (wordExpression) {
    const left = parseNumberWords(wordExpression[1]);
    const right = parseNumberWords(wordExpression[3]);
    if (Number.isFinite(left) && Number.isFinite(right)) {
      if (wordExpression[2] === "arti") return left + right;
      if (wordExpression[2] === "eksi") return left - right;
      if (wordExpression[2] === "bol") return right === 0 ? null : left / right;
      return left * right;
    }
  }
  const dozen = text.match(/^(.+?)\s+duzine(?:\s+(?:kac\s+eder|nedir|sonucu))?\??$/u);
  if (dozen) {
    const count = parseNumberWords(dozen[1]);
    if (Number.isFinite(count)) return count * 12;
  }
  let match = text.match(new RegExp(`^${plainNumber}\\s*([+\\-*/])\\s*${plainNumber}(?:\\s+(?:kac\\s+eder|nedir|sonucu))?\\??$`, "u"));
  if (match) {
    const left = number(match[1]);
    const right = number(match[3]);
    if (match[2] === "+") return left + right;
    if (match[2] === "-") return left - right;
    if (match[2] === "*") return left * right;
    if (match[2] === "/") return right === 0 ? null : left / right;
  }
  match = text.match(new RegExp(`^${plainNumber}\\s+(arti|eksi|kere|carpi)\\s+${plainNumber}(?:\\s+(?:kac\\s+eder|nedir|sonucu))?\\??$`, "u"));
  if (match) {
    const left = number(match[1]);
    const right = number(match[3]);
    if (match[2] === "arti") return left + right;
    if (match[2] === "eksi") return left - right;
    return left * right;
  }
  match = text.match(new RegExp(`^${plainNumber}(?:['’]?(?:den|dan|ten|tan))\\s+${plainNumber}(?:['’]?(?:yi|yi|i|u|u))?\\s+cikar\\p{L}*\\??$`, "u"));
  if (match) return number(match[1]) - number(match[2]);
  match = text.match(new RegExp(`^${plainNumber}\\s+(?:ile|ve)\\s+${plainNumber}(?:['’]?\\p{L}+)?\\s+(carp|bol)\\p{L}*\\??$`, "u"));
  if (match) return match[3] === "carp" ? number(match[1]) * number(match[2]) : (number(match[2]) === 0 ? null : number(match[1]) / number(match[2]));
  match = text.match(new RegExp(`^${plainNumber}(?:['’]?\\p{L}+)?\\s+(yarisi|ucu|dortte\\s+biri)\\??$`, "u"));
  if (match) return number(match[1]) / (match[2] === "yarisi" ? 2 : match[2] === "ucu" ? 3 : 4);
  return null;
}

export function isGeneralArithmeticRequest(value) {
  return Number.isFinite(evaluateGeneralArithmeticRequest(value));
}

function hasValueLookupCue(text) {
  return /(?:bedel|tutar|rakam|fiyat|para)\p{L}*/iu.test(text)
    || hasAnyTerm(text, [
    "bedel", "tutar", "rakam", "fiyat", "para", "ne yazmis", "ne girmis", "ne vermis",
    "ne belirtmis", "yazdigi", "girdigi", "verdigi", "firma kac yazmis", "firma kac para",
  ])
    // A company/service-receiver offer is a scalar field when it is asked as
    // a value.  The selected entity catalog decides its canonical field.
    || /(?:firma|sirket|hizmet\s+alan|alici|musteri)\p{L}*(?:\s+\p{L}+){0,2}\s+teklif\p{L}*.{0,18}\b(?:kac|ne|bedel|tutar|rakam|para)\b/iu.test(text);
}

function hasRiskCue(text) {
  return /(?:risk|tehlike)\p{L}*/iu.test(text);
}

// Assessment language can ask for the operationally important item without
// naming the literal word "risk".  This is structural question grammar: a
// critical/open subject plus a diagnostic question, or a prioritizing verb
// with its object.  Scope is still decided separately by the canonical turn.
function hasAssessmentSummaryCue(text) {
  const criticalSubject = /(?:(?:en\s+)?(?:kritik|onemli)|acik)\s+(?:risk|sorun|konu|oncelik)\p{L}*(?:\s+(?:ne|nedir|var\s+mi|hangisi))?/iu.test(text);
  const prioritizeObject = /\b(?:neleri|neyi|hangi\s+(?:konu|sorun|risk|isi))\b(?:\s+\p{L}+){0,3}\s+(?:oncele|onceliklendir|one\s+koy)\p{L}*/iu.test(text);
  // "Dikkat gerektiren yanı/noktası ne" asks for an assessment of the
  // target, not its identity. Keep this grammar independent of any product
  // noun so the selected assessment route can return evidence or no-evidence.
  const attentionAssessment = /\b(?:dikkat|takip|kontrol)\s+gerektir\p{L}*(?:\s+(?:yan|nokta|konu|sey)\p{L}*)?(?:\s+(?:ne|nedir|var\s+mi|hangisi))?\b/iu.test(text);
  return criticalSubject || prioritizeObject || attentionAssessment;
}

function hasIssueDiagnosticCue(text) {
  const disruption = /(?:sorun|problem|sikinti|aksak|aksayan|ters(?:\s+giden|\s+gidiyor)?|ariza)\p{L}*/iu.test(text);
  if (!disruption) return false;
  const diagnosticOperation = /(?:hangi|hangisi|ne|nerede|var\s+mi|gor(?:uyor|uyor\s+musun)|olustur\p{L}*|cikar\p{L}*|asil|gercekten|ayir\p{L}*)/iu.test(text);
  if (!diagnosticOperation) return false;
  // A named record's status remains a field lookup unless the user is asking
  // the diagnostic question itself (for example, "hangi durum sorun?").
  const explicitRecordStatus = /(?:teklif|vardiya|sefer|arac|sozlesme|kayit)\p{L}*.{0,24}(?:durum|statu|status)\p{L}*/iu.test(text)
    && !/(?:hangi\s+durum.*(?:sorun|problem)|(?:sorun|problem).*hangi\s+durum)/iu.test(text);
  return !explicitRecordStatus;
}

function hasDateRangeCue(text) {
  return /(?:hangi|ne)\s+(?:saat|zaman)/iu.test(text)
    || /(?:saatler|tarih\s+araligi|baslangic\p{L}*\s*[-/]?\s*bitis\p{L}*|baslama\p{L}*\s*[-/]?\s*bitis\p{L}*)/iu.test(text)
    || /(?:basla\p{L}*.*bit\p{L}*|bit\p{L}*.*basla\p{L}*|kactan\s+kaca|saat\p{L}*\s+aralig\p{L}*)/iu.test(text);
}

function hasScreenSurfaceCue(text) {
  return /(?:ekran|sayfa|panel|menu|bolum|bura|burda|burasi|burdaki|buradaki|calisma\s+alani|modul|bulundugum\s+yer)\p{L}*/iu.test(text);
}

function hasScreenDetailCue(text) {
  return hasScreenDeicticCue(text)
    && /\b(?:detayli\p{L}*\s+)?(?:acikla|anlat)\p{L}*\b/iu.test(text);
}

function hasScreenContextCue(text) {
  const uiSurface = hasScreenSurfaceCue(text);
  const locationQuestion = /(?:neresi|nerede|neredeyim|hangi|adi\s+(?:ne|nedir)|acik|anlat|neye\s+bak(?:iyorum|iyoruz)?|sayfa\s+ne|panel\s+ne|ekran\s+ne|bolum\s+ne)/iu.test(text);
  // SCREEN_CONTEXT is a situated orientation speech act.  It is determined
  // from the user locating themselves in the current work, not only from a
  // literal UI noun such as "screen" or "workflow".  The general-information
  // classifier runs before this function, keeping abstract process questions
  // out of the product context.
  const situatedReference = /\b(?:bu|su)\s+an(?:da)?\b|\b(?:burada|buradaki|burasi|bulundugum|ilerledigim|geldigim)\b/iu.test(text);
  const orientationOperation = /\b(?:neyin\s+icindeyim|ne\s+yapiliyor|nereye\s+geldim|hangi\s+is(?:in)?\s+uzerinde\s+ilerliyorum|amac\p{L}*\s+ne|(?:neyi|ne)\s+goster\p{L}*|hangi\s+(?:is\s+akis|surec|operasyon\s+adim|calisma\s+alan|akis)\p{L}*|nerede\s+(?:bulun|calis|dur)\p{L}*)\b/iu.test(text);
  const selfLocatedProgress = /\b(?:hangi|ne|nerede)\s+(?:\p{L}+\s+){0,4}(?:icindeyim|ilerliyorum|bulunuyorum|calisiyorum|geldim)\b/iu.test(text);
  // Turkish often binds the work-area noun and the first-person location
  // suffix into a single token ("iş akışındayım"). This is a situated
  // orientation operation, not a generic question about workflows.
  const workflowSelfLocation = /\b(?:hangi\s+)?(?:is\s+akis|surec|operasyon|calisma\s+alan)(?:indayim|indeyim|dayim|deyim|icindeyim|icerisindeyim)\b/iu.test(text);
  return /(?:^|[^\p{L}])neredey(?:im|iz)?(?:$|[^\p{L}])/iu.test(text)
    // First-person location verbs still ask about the current UI surface;
    // they are not record-field lookups.  Keep the verb stem open so normal
    // Turkish inflection (bulunuyor/çalışıyor/duruyor) remains semantic.
    || /(?:^|[^\p{L}])nerede\s+(?:bulun|calis|dur)\p{L}*(?=$|[^\p{L}])/iu.test(text)
    || hasAnyTerm(text, [
      "hangi ekran", "hangi sayfa", "hangi panel", "su an neresi", "su anda neresi",
      "neresi acik", "nerede acigim", "burada neresi", "bu ekranda neresi", "neresi acildi",
      "su an neye bakiyorum", "burada ne acik", "burasi ne", "hangi sayfadayim",
    ])
    || (uiSurface && locationQuestion)
    || ((situatedReference && orientationOperation) || selfLocatedProgress || workflowSelfLocation);
}

function hasCurrentScreenReferentCue(text) {
  // This recognises a deictic product speech act. The caller still supplies
  // the separately authorized current route and visible screen facts.
  return /(?:^|\b)(?:nasil)\s+calisiyor\s+(?:bu|burasi)|(?:bu|su)\s+ne\s+ise\s+yarar|(?:burada|bu\s+ekranda)\s+ne\s+yapacagim|(?:su|bu)\s+ekran\s+ne(?:dir)?\b/iu.test(text);
}

function hasVisibleControlDiscoveryCue(text, ui) {
  // A request such as "Detayları göster nerede?" asks to locate a visible
  // control, not to retrieve a record's "detail" field.  The grammar is kept
  // semantic rather than tied to a particular label.  It is available only
  // when the current authorized screen supplied visible controls; downstream
  // target resolution then proves the exact control or truthfully returns
  // NOT_FOUND.
  if (!ui?.path || !Number(ui.visibleControlCount || 0)) return false;
  const locationRequest = /\b(?:nerede|neresi|hangi(?:si|\s+(?:buton|sekme|kart|alan|bolum|bölüm)))\b/iu.test(text);
  const controlNoun = /\b(?:buton|sekme|tab|kart|alan|bolum|bölüm|detay)\p{L}*\b/iu.test(text);
  const discoveryVerb = /\b(?:goster|göster|ac|aç|bul|git|götür|gotur|baslat|başlat|incele|sec|seç)\p{L}*\b/iu.test(text);
  return locationRequest && (controlNoun || discoveryVerb);
}

function hasScreenDeicticCue(text) {
  return /(?:bu\s+(?:ekran|sayfa|panel|bolum)|burada|buradaki|bu\s+sayfada|bu\s+ekranda)/iu.test(text);
}

function hasScreenDeicticActionCue(text) {
  if (!hasScreenDeicticCue(text)) return false;
  return /(?:ilk|once|simdi|guvenli|mantikli).{0,32}(?:hamle|yap|basla|bak|incele|ele\s+al|is|hareket)|(?:ne\s+yap|nereden\s+basla|hangi(?:si|yle)\s+once)/iu.test(text);
}

function hasScreenDeicticSituationCue(text) {
  if (!hasScreenDeicticCue(text)) return false;
  return /(?:neyi\s+(?:takip|izli)|neler\s+(?:gorun\p{L}*|var)|en\s+onemli|durum\s+ne|ne\s+onemli|neyi\s+goru)/iu.test(text);
}

function hasExplicitScreenQuestion(text) {
  return hasAnyTerm(text, [
    "hangi ekran", "hangi sayfa", "hangi panel", "hangi bölüm", "hangi bolum", "neredeyim", "neredeyiz",
    "burası neresi", "burasi neresi", "şu an neresi", "su an neresi", "şu anda neresi", "su anda neresi",
  ]);
}

function hasSelectedRecordCue(text) {
  return hasAnyTerm(text, [
    "hangi kayit", "secilen kayit", "secili kayit", "secilen oge", "secili oge",
    "hangi teklif acik", "hangi kart acik", "hangi kart", "hangi kayda bak",
    "hangi kaydi goruyorum", "bu ekranda hangi kayda", "secili olan",
    "su an secili", "hangisi secili", "secilmis olan", "acik kayit", "acik teklif", "acik vardiya", "acik sefer",
  ])
    || /(?:hangi|secili|secilen|bu)\s+(?:kayit\p{L}*|kart\p{L}*|teklif\p{L}*|vardiya\p{L}*|sefer\p{L}*|arac\p{L}*|plaka\p{L}*)(?:[^\p{L}\p{N}]{0,3}|\s+\p{L}+){0,3}\s+(?:goruyorum|gorunen|gosteriliyor|acik|bakiyorum|inceliyorum)\b/iu.test(text)
    || /(?:hangi|secili|secilen)\s+(?:kayit\p{L}*|kart\p{L}*|teklif\p{L}*|vardiya\p{L}*|sefer\p{L}*|arac\p{L}*|plaka\p{L}*)\b/iu.test(text)
    || /(?:bu|su|secili|secilen|aktif|baktigim)\s+(?:kayit\p{L}*|kart\p{L}*|teklif\p{L}*|vardiya\p{L}*|sefer\p{L}*|arac\p{L}*|plaka\p{L}*)\s+(?:hangisi|ne(?:dir)?|numaras\p{L}*|\bid\b|\bno\b)/iu.test(text)
    || /(?:burada|burda|bu\s+ekranda)\s+hangis\p{L}*\s+secil\p{L}*/iu.test(text);
}

// Turkish case suffixes change a noun's visible stem ("kayıt" →
// "kaydın"), so identity-only patterns are not sufficient for an operation
// directed at the record currently selected in the UI.  This is deliberately
// structural: the deictic/selection modifier and a record noun must occur
// together; a product noun on its own still does not claim the selection.
function hasSelectedRecordReference(text) {
  const recordNoun = "(?:kay(?:it|d)\\p{L}*|kart\\p{L}*|satir\\p{L}*|teklif\\p{L}*|vardiya\\p{L}*|sefer\\p{L}*|arac\\p{L}*|plaka\\p{L}*|surucu\\p{L}*|sofor\\p{L}*|sozlesme\\p{L}*)";
  return new RegExp(`\\b(?:bu|su|secil(?:i|en)?|aktif|baktigim|acik)\\s+${recordNoun}\\b`, "iu").test(text);
}

function hasSelectedRecordActionReference(text) {
  // Generic prioritisation such as "ilk iş ne" belongs to the current screen.
  // A selected record is a target only when the user actually points at it.
  return /(?:bu|su|secili|baktigim|acik)\s+(?:kayit|kart|teklif|vardiya|sefer|arac|sozlesme)\p{L}*.{0,28}(?:ne\s+yap|once|ilk|bak|incele|coz|hallet|oncelik|adim)/iu.test(text);
}

function hasSelectedTypedPossessiveReference(text, ui = {}) {
  if (!ui?.selectedId || !ui?.selectedType || hasRoleGlobalScopeCue(text)) return false;
  // A selected card stays the target when the user names that card through a
  // possessive Turkish form ("vardiyanın riski", "teklifin sonraki adımı").
  // This is tied to the selected *type* and an assessment/action operation;
  // an unqualified plural such as "vardiya riskleri" is not enough to turn a
  // role-wide request into a selected-record request.
  const possessiveNoun = {
    shift: "(?:vardiyanin|seferin)",
    offer: "teklifin",
    agreement: "(?:sozlesmenin|anlasmanin)",
    vehicle: "(?:aracin|plakanin)",
    driver: "(?:surucunun|soforun)",
    personnel: "personelin",
    student: "ogrencinin",
    parent: "velinin",
  }[String(ui.selectedType || "").toLowerCase()] || "";
  const assessmentOrAction = /(?:risk|tehlike|sorun|problem|dikkat|guvenli|sonraki|ilk\s+adim|ne\s+yap|neden|oncelik|incele|kontrol)/iu;
  return Boolean(possessiveNoun)
    && new RegExp(`\\b${possessiveNoun}\\b`, "iu").test(text)
    && assessmentOrAction.test(text);
}

function hasRoleGlobalScopeCue(text) {
  return hasAnyTerm(text, [
    "tum kayitlarda", "butun kayitlarda", "rol genelinde",
    "hepsinde", "tum operasyonlarda", "genel risk",
  ])
    // Ownership noun + broadening modifier is structural scope grammar.  It
    // deliberately does not depend on a fixed risk phrase, so it also covers
    // "firma çapında en kritik konu" and "tüm firma için hangi risk".
    || /\b(?:rol|firma|sirket|kurum|operasyon)\p{L}*\s+(?:genel\p{L}*|cap\p{L}*|tamam\p{L}*)\b/iu.test(text)
    || /\b(?:tum|butun)\s+(?:rol|firma|sirket|kurum|operasyon)\p{L}*(?:\s+(?:icin|genel\p{L}*))?\b/iu.test(text)
    || /\bgenel\s+(?:risk|oncelik|sorun)\p{L}*/iu.test(text);
}

// Attention/caution is an assessment speech act when the user asks what to
// inspect, monitor, or keep in mind to proceed safely.  It deliberately does
// not name a product domain; scope resolution applies the current selected
// record only when the surrounding UI/discourse makes that target unambiguous.
function hasAttentionAssessmentCue(text) {
  return /\b(?:neye|nelere|neyi|hangi\s+(?:konu|noktaya|seye))\s+(?:dikkat|odaklan|kontrol|izle|gozden\s+gecir|goz\s+onunde\s+bulundur)\p{L}*/iu.test(text)
    || /\b(?:dikkat|kontrol|gozden\s+gecir|izle)\s+(?:etmem|etmeliyim|edeyim|etmemiz|etmeliyiz|etmek|edil\p{L}*\s+gerek\p{L}*)\b/iu.test(text)
    || /\b(?:dikkat|kontrol|gozden\s+gecir|izle)\p{L}*\s+gerek\p{L}*\s+(?:ne|neler|hangi\s+(?:sey|konu|nokta)\p{L}*)\b/iu.test(text)
    || /\bgoz\p{L}*\s+(?:onunde\s+bulundur|kacir)\p{L}*\s+gerek\p{L}*\s+(?:ne|neler|hangi\s+konu\p{L}*)\b/iu.test(text)
    || /\b(?:sorun|aksilik)\s+(?:yasamamak|cikarmamak|olmamak)\s+icin\s+(?:neye|neyi|neleri)\s+(?:dikkat|kontrol|izle|gozden\s+gecir|bak)\p{L}*/iu.test(text);
}

// A bare assessment question does not widen a valid selected record to the
// role queue.  The UI selection is inherited only when the current turn has
// not explicitly named another scope.  This keeps "en önemli risk ne" on the
// selected Shift, while "firma genelinde açık risk var mı" remains global.
function hasInheritedSelectedAssessmentScope({ text, ui, inferred } = {}) {
  if (!ui?.selectedId || !ui?.selectedType) return false;
  if (hasRoleGlobalScopeCue(text) || (hasScreenDeicticCue(text) && !hasAttentionAssessmentCue(text)) || hasComparisonCue(text)) return false;
  if (inferred?.generalInformationIntent || inferred?.generalCreativeIntent) return false;
  const assessmentTasks = new Set(["RISK", "ISSUE", "NEXT_ACTION", "PRIORITY", "CAUSE", "RESOLUTION"]);
  const requestedTasks = Array.isArray(inferred?.requestedTasks) ? inferred.requestedTasks : [];
  return assessmentTasks.has(String(inferred?.taskType || ""))
    || requestedTasks.some((task) => assessmentTasks.has(String(task || "")));
}

// "Genel olarak" describes the level of explanation, not automatically the
// scope of a product query.  Keep it out of ROLE_GLOBAL unless the turn also
// establishes a concrete product target.  This prevents a selected record
// from turning an abstract question into operational advice.
function hasExplicitGeneralInformationIntent(text) {
  // These phrases identify an abstract explanatory frame, even when they
  // include a product-shaped word such as "öncelik".  They are not a weak
  // alias list: framing + explanatory operation must jointly be present.
  const generalFraming = hasAnyTerm(text, [
    "genel olarak", "genelde", "temelde", "temel olarak", "prensip olarak", "prensipte", "genel çerçevede", "genel cercevede",
  ])
    // "Genel servis planlaması nasıl yapılır?" is an explanatory frame:
    // "genel" qualifies the whole subject, rather than asking for a
    // current record.  Keep the subject open so product-adjacent vocabulary
    // does not need a special alias to be safe general information.
    || /\bgenel(?:\s+\p{L}+){0,4}\s+(?:nasil|neye\s+gore|hangi\s+olcut|nelere?\s+dikkat|yaparken|yapilirken|kurarken|sirasinda|surecinde|hazirlig\p{L}*|icin)\b/iu.test(text);
  const explanatoryOperation = /\b(?:nasil|neye\s+gore|hangi\s+olcut|nelere?\s+dikkat|belirlen\p{L}*|degerlendiril\p{L}*|anlat\p{L}*|acikla\p{L}*|sirala\p{L}*|sira\s+(?:neye|nasil)|ele\s+al\p{L}*|bak\p{L}*|sec\p{L}*|kur\p{L}*)\b/iu.test(text);
  // General how-to questions often omit the literal "genel" modifier but
  // still describe a type of plan, organisation, process or workflow.  This
  // is grammar around an abstract activity, not a catalog of product nouns.
  const abstractPlanningHowToFrame = /\b(?:iyi|etkili|guvenli|verimli|basarili)?(?:\s+bir)?(?:\s+\p{L}+){0,3}\s+(?:plan|planlama|organizasyon|surec|akis)\p{L}*\s+(?:nasil|neye\s+gore|hangi\s+olcut|nelere?\s+dikkat)\b/iu.test(text)
    || /\b(?:planlama|organizasyon|surec|akis)\p{L}*\s+(?:nasil|neye\s+gore|hangi\s+olcut|nelere?\s+dikkat)\b/iu.test(text);
  const concreteProductDependency = /\b(?:bu|su|secili|aktif|mevcut|baktigim)\s+(?:teklif|vardiya|sefer|arac|surucu|sozlesme|kayit|kart)\p{L}*/iu.test(text)
    || /\b(?:teklif|vardiya|sefer|arac|surucu|sozlesme|kayit|kart)\s*#?\s*\d+\b/iu.test(text)
    || hasScreenDeicticCue(text)
    || hasExplicitRelationCue(text)
    // Possessive ownership plus a retrieval verb is still a record/data
    // request.  Preserve the authorization path for requests such as a
    // user's or company's plan being fetched, without treating abstract
    // advice as protected-data access.
    || /\b(?:benim|bizim|sirketimin|firmamin|kurumumun)\b(?:\s+\p{L}+){0,5}\s+\b(?:goster|getir|listele|say|bul|ver)\p{L}*/iu.test(text)
    || hasDirectFieldLookupCue(text);
  // An ordinary activity frame ("trafikte", "satranç oynarken") makes an
  // attention question general knowledge even while a browser happens to
  // retain a product selection.  The frame is grammatical rather than a
  // domain-word list, and an explicit product referent remains authoritative.
  const activityAttentionFrame = /\b(?:\p{L}+(?:de|da|te|ta)|\p{L}+(?:arken|erken|irken|urken))(?:\s+\p{L}+){0,3}\s+(?:neye|nelere|neyi|hangi\s+konu\p{L}*)\s+(?:dikkat|odaklan|kontrol|izle|gozden\s+gecir)\p{L}*/iu.test(text);
  // An arbitrary process subject plus an explanatory operation is general
  // knowledge, even while a product card happens to be selected. This is
  // intentionally grammar-based rather than a product-domain word list.
  const abstractProcessFrame = /\b(?:bir|her|genel)?(?:\s+\p{L}+){0,2}\s+(?:surec|akis|yontem|asama)\p{L}*\s+(?:hangi\s+asama\p{L}*|nasil\s+(?:iler|isle)\p{L}*|ne(?:ler)?\s+olur)\b/iu.test(text);
  const productActivityReference = /\b(?:teklif|vardiya|sefer|arac|surucu|sozlesme|kayit|kart|rota|durak|servis|operasyon)\p{L}*/iu.test(text);
  return (generalFraming && explanatoryOperation || abstractPlanningHowToFrame || activityAttentionFrame && !productActivityReference || abstractProcessFrame) && !concreteProductDependency;
}

function isSelectedRecordIdentityRelationForm(text) {
  // "Bu satır hangi kayda ait?" asks the selected UI row's identity, whereas
  // "Bu teklif hangi vardiyaya bağlı?" asks for a separate relation.  The
  // distinction is structural: row/card/self-reference + record identity is
  // not a traversal to another entity type.
  return /\b(?:bu|su|secil(?:i|en)?|aktif|baktigim)\s+(?:satir|kart|kay\p{L}*)\s+hangi\s+kay\p{L}*\s+ait\b/iu.test(text);
}

function hasTypedEntityRelationQuestion(text) {
  // A record noun followed by a relationship-bearing entity and an
  // interrogative is a traversal even without the literal word "bağlı".
  // This handles Turkish possessive/case grammar such as a record's driver
  // name or a driver assigned to that record, rather than a phrase catalog.
  const source = "(?:vardiya|sefer|shift|teklif|offer|arac|vehicle|surucu|sofor|driver|sozlesme|agreement|kayit|kart)";
  const target = "(?:surucu|sofor|driver|arac|vehicle|vardiya|sefer|shift|sozlesme|agreement)";
  const relationQuestion = "(?:kim|hangi(?:si)?|ad\\p{L}*|isim\\p{L}*|gorevli|atan\\p{L}*|bagli)";
  return new RegExp(`\\b${source}\\p{L}*(?:\\s+\\p{L}+){0,4}\\s+(?:hangi\\s+)?${target}\\p{L}*(?:\\s+${relationQuestion})?\\b`, "iu").test(text);
}

function hasExplicitRelationCue(text) {
  if (isSelectedRecordIdentityRelationForm(text)) return false;
  return hasAnyTerm(text, [
    "bagli", "ait", "iliskili", "baglanti", "surucusu kim", "soforu kim", "bagli kayit", "bagli kaydi", "sozlesmesi var mi",
  ]) || hasTypedEntityRelationQuestion(text)
    || /(?:vardiya|sefer|arac\p{L}*|surucu\p{L}*|sofor\p{L}*|sozlesme\p{L}*|kayit\p{L}*).{0,24}(?:bagli|ait|iliskili|araci|vardiyasi|surucusu|soforu)/iu.test(text)
    || /\b(?:bagli\s+)?vardiyas\p{L}*\b/iu.test(text);
}

function hasSelectedRecordIdentityCue(text, ui = {}) {
  if (!ui.selectedId || !ui.selectedType || hasExplicitRelationCue(text)) return false;
  // An explicit field question about the selected record (status, date,
  // amount, time, etc.) is not an identity request merely because Turkish
  // also uses a deictic and the question word "ne".  Field semantics must
  // win before the generic identity fallback is considered.
  if (hasDirectFieldLookupCue(text) && !hasCardinalityCue(text)) return false;
  // Assessment and action operations can also end in the Turkish question
  // word "ne" (for example "bu vardiyanın riski ne").  That grammar names
  // the selected record as the target; it is not an instruction to identify
  // the record itself.  Preserve the operation so the planner can return an
  // evidence-grounded assessment or an explicit no-data result.
  if (hasRiskCue(text) || hasAssessmentSummaryCue(text) || hasIssueDiagnosticCue(text)
    || hasNextActionOperationCue(text) || hasPriorityOperationCue(text)) return false;
  // Identity is an operation on the selected UI referent.  The referent may
  // be a product noun, a generic item, or a deictic phrase; none of those
  // surface forms is individually required when the selection is singular.
  const selectedReference = hasSelectedRecordReference(text)
    || /\b(?:(?:bu|su|o)\p{L}*|secili|secilen|aktif|acik|baktig\p{L}*|elimdek\p{L}*|gordug\p{L}*)\b/iu.test(text)
    || /\b(?:sey|oge|nesne|satir|kart|kay\p{L}*)\p{L}*\b/iu.test(text);
  const identityOperation = /\b(?:hangi|hangisi|ne|numaras\p{L}*|kimlik\p{L}*|kod\p{L}*|referans\p{L}*|tanimla\p{L}*|ayirt\p{L}*|\bno\b|\bid\b)\b/iu.test(text);
  const identificationFrame = /\b(?:hangi|hangisi|ne|nasil)\b/iu.test(text)
    || /\b(?:tanimla|ayirt)\p{L}*/iu.test(text);
  return selectedReference && identityOperation && identificationFrame;
}

const CREATIVE_OUTPUT_TOPICS = "(?:saka|espri|fikra|hikaye|mesaj|metin|not|siir|tebrik|dilek|cumle|satir|paragraf)";
const CREATIVE_OUTPUT_VERBS = "(?:yaz|olustur|hazirla|uret|uydur|kur|yap|cikar)";
const PRODUCT_RECORD_POSSESSIVES = "(?:teklifin|vardiyanin|seferin|aracin|surucunun|soforun|sozlesmenin|kaydin|kartin)";
const PRODUCT_FACTUAL_FIELDS = "(?:saat|zaman|tarih|baslangic|bitis|giris|cikis|durum|plaka|tutar|bedel|miktar|konum|rota|durak|eta|surucu)";
// These are compositional dependency verbs, not complete query aliases. They
// describe using an authorized record fact as input to a new presentation.
const PRODUCT_FACT_DEPENDENCY_VERBS = "(?:kullan\\p{L}*|dayan\\p{L}*|referans\\s+al\\p{L}*|temel\\s+al\\p{L}*|yararlan\\p{L}*|gore)";

function hasTimeFieldCue(text) {
  // Possessive/case suffixes ("vardiya saatini") and colloquial "kaçta"
  // both request a value on one shift; neither is a cardinality operation.
  return /\b(?:vardiya|sefer|shift)\p{L}*\s+saat\p{L}*\b/iu.test(text)
    || /\b(?:bu|su|secili|aktif|mevcut)\s+(?:vardiya|sefer|shift)\p{L}*\s+(?:kacta|ne\s+zaman)\b/iu.test(text)
    || /\b(?:kactan\s+kaca|saat\p{L}*\s+aralig\p{L}*|zaman\p{L}*\s+dilim\p{L}*|giris\p{L}*\s+cikis\p{L}*)\b/iu.test(text)
    || /\b(?:hangi|ne)\s+saat\p{L}*\b/iu.test(text)
    // The endpoints may be expressed entirely as a Turkish converb pair,
    // e.g. "kaçta başlayıp kaçta bitiyor".  This names one interval value,
    // never an entity count.
    || /\b(?:kacta\s+)?basla\p{L}*(?:\s+\p{L}+){0,3}\s+(?:kacta\s+)?bit\p{L}*\b/iu.test(text);
}

function productGroundedWritingShape(text, ui = {}) {
  const recordName = "(?:teklif|vardiya|sefer|arac|surucu|sofor|sozlesme|kayit|kart)";
  const hasSelectedRecord = Boolean(ui.selectedId && ui.selectedType);
  const selectedReference = hasSelectedRecord
    && (new RegExp(`\\b(?:secili|aktif|mevcut|baktigim|bu|su|o)\\s+${recordName}\\p{L}*`, "iu").test(text)
      || new RegExp(`\\b${PRODUCT_RECORD_POSSESSIVES}\\b`, "iu").test(text));
  // An explicit record identifier may carry Turkish possessive/case suffixes
  // directly ("Vardiya 151in") or after an apostrophe ("151'in").  The
  // structural entity reference stays separate from the requested fact and
  // the writing task, so this is not a sentence-level alias.
  const explicitReference = new RegExp(`\\b${recordName}\\s*#?\\s*\\d+(?:['’]?(?:in|un|i|e|a|de|da|den|dan))?\\b`, "iu").test(text);
  // The fact dependency is structural: the requested record field is used
  // as an input to a writing task.  Keep verbal forms open so natural
  // inflections such as "temel alıp" and "saatine göre" retain the same
  // grounded-writing contract without teaching a single complete phrase.
  const factualField = new RegExp(`\\b${PRODUCT_FACTUAL_FIELDS}\\p{L}*\\b`, "iu").test(text)
    || /\b(?:kactan\s+kaca|saat\p{L}*\s+aralig\p{L}*|zaman\p{L}*\s+dilim\p{L}*)\b/iu.test(text);
  const deicticFact = /\b(?:bu|su|o)\s+(?:bilgi|veri|detay)\p{L}*\b/iu.test(text);
  const dependencyVerb = new RegExp(`\\b${PRODUCT_FACT_DEPENDENCY_VERBS}\\b`, "iu").test(text)
    || /\b(?:alip|alarak)\b/iu.test(text);
  // "Saatlerini sürücüye ileten not" is also a fact dependency even though
  // the delivery verb follows the audience rather than the field directly.
  const factualDelivery = /\b(?:ilet|aktar|bildir|bilgilendir|paylas|haber\s+ver|duyur)\p{L}*\b/iu.test(text);
  const writingTask = new RegExp(`\\b${CREATIVE_OUTPUT_TOPICS}\\p{L}*.{0,32}\\b${CREATIVE_OUTPUT_VERBS}\\p{L}*`, "iu").test(text)
    || factualDelivery
    || /\b(?:surucu|sofor|driver)\p{L}*(?:\s+\p{L}+){0,6}\s+(?:yaz|hazirla|olustur|kur)\p{L}*\b/iu.test(text);
  const hasAudience = /\b(?:surucu|sofor|driver)\p{L}*/iu.test(text);
  // A selected record plus an explicit fact and an addressed writing task
  // necessarily makes that fact an input.  The user need not redundantly say
  // "kullan" before every delivery verb.
  const factDependency = (factualField || deicticFact) && (dependencyVerb || factualDelivery || (writingTask && hasAudience));
  // A singular selected record is an authorized local referent.  In a
  // composite fact-to-message request the user may omit "this Shift" without
  // making the fact source ambiguous.  Explicit ownership/scope controls are
  // still evaluated later by the canonical authorization pipeline.
  const implicitSelectedReference = hasSelectedRecord && !explicitReference && factDependency && writingTask && hasAudience;
  const selectedOrExplicitRecord = selectedReference || explicitReference || implicitSelectedReference;
  if (!selectedOrExplicitRecord || !factDependency || !writingTask) return null;
  return {
    productGroundedWritingIntent: true,
    presentationTask: "WRITE",
    outputAudience: hasAudience ? "DRIVER" : null,
    requiredOutputSlots: ["GROUNDED_FACT", "WRITTEN_OUTPUT"],
    implicitSelectedFactDependency: Boolean(implicitSelectedReference && deicticFact),
  };
}

function coordinatedOutputTerms(value) {
  const source = String(value || "");
  // A creative vocabulary list is output-only data. Its boundary is the
  // vocabulary marker or containment verb, not a fixed number of terms or a
  // product word.  Turkish requests often omit commas and conjunctions:
  // "rota araç durak servis sözcüklerinin hepsiyle" is one four-term list.
  const term = "\\p{L}+";
  const separator = "(?:\\s*,\\s*|\\s*\\/\\s*|\\s+(?:ve|ile)\\s+|\\s+)";
  const list = `(${term}(?:${separator}${term}){0,7})`;
  const marker = "(?:kelime\\p{L}*|sözc(?:ük|üğ)\\p{L}*|sozcug\\p{L}*|söz\\p{L}*)";
  const beforeVocabulary = source.match(new RegExp(`\\b${list}\\s+${marker}`, "iu"));
  const allTogether = source.match(new RegExp(`\\b${list}\\s+(?:hepsiyle|hepsini|tum(?:u|unu)?yle|tamamiyla)\\b`, "iu"));
  const contained = source.match(new RegExp(`\\b(?:içinde|icinde)\\s+${list}\\s+(?:geçen|gecen|bulunan|yer\\s+alan|içeren|iceren)`, "iu"));
  // A vocabulary constraint frequently omits "içinde": "firma ve rakam
  // geçen kısa şaka" still has two required output terms.  The boundary is
  // the output-constraint verb, not the presence of a marker word.
  const plainContained = source.match(new RegExp(`\\b${list}\\s+(?:geçen|gecen|bulunan|yer\\s+alan|içeren|iceren)\\b`, "iu"));
  const rawList = beforeVocabulary?.[1] || allTogether?.[1] || contained?.[1] || plainContained?.[1] || "";
  return (rawList.match(/\p{L}+/gu) || []).filter((item) => !/^(?:ve|ile)$/iu.test(item));
}

export function generalCreativeOutputShape(value) {
  const source = String(value || "");
  const normalized = normalize(source);
  const terms = coordinatedOutputTerms(source);
  let forbiddenTerms = [];
  // Turkish consonant softening turns "sözcük" into forms such as
  // "sözcüğünü".  Model the marker morphologically so the requested output
  // word remains the captured term; do not enumerate complete sentences.
  const vocabularyMarker = "(?:kelime\\p{L}*|sözc(?:ük|üğ)\\p{L}*|sozcug\\p{L}*|söz\\p{L}*)";
  const forbiddenList = "(\\p{L}+(?:\\s*,\\s*\\p{L}+)*(?:\\s+(?:ve|ile)\\s+\\p{L}+)?)";
  const forbidden = source.match(new RegExp(`${forbiddenList}\\s+${vocabularyMarker}\\s+(?:kullanma\\p{L}*|geçirme\\p{L}*|gecirme\\p{L}*)\\b`, "iu"));
  if (forbidden?.[1]) forbiddenTerms = (forbidden[1].match(/\p{L}+/gu) || []).filter((item) => !/^(?:ve|ile)$/iu.test(item));
  const sentenceCount = /\biki\s+c[uü]mle\p{L}*/iu.test(source) ? 2
    : /\b(?:tek|bir)\s+c[uü]mle\p{L}*/iu.test(source) ? 1
      : null;
  const requestedFormat = /\b(?:saka|espri|fikra)\p{L}*/iu.test(normalized) ? "JOKE"
    : /\b(?:tekerleme|kafiye|kafiyeli)\p{L}*/iu.test(normalized) ? "RHYME"
    : /\b(?:hikaye|hikâye)\p{L}*/iu.test(normalized) ? "MINI_STORY"
      : /\bnot\p{L}*/iu.test(normalized) ? "SHORT_NOTE"
        : /\bmesaj\p{L}*/iu.test(normalized) ? "SHORT_MESSAGE"
            : sentenceCount ? "SENTENCES"
            : "CREATIVE_TEXT";
  const uniqueForbiddenTerms = [...new Set(forbiddenTerms.map((term) => String(term || "").trim()).filter(Boolean))];
  const forbiddenNormalized = new Set(uniqueForbiddenTerms.map((term) => normalize(term)));
  const uniqueRequiredTerms = [...new Set(terms.map((term) => String(term || "").trim()).filter(Boolean))]
    .filter((term) => !forbiddenNormalized.has(normalize(term)));
  return {
    generalCreativeIntent: true,
    requiredOutputTerms: uniqueRequiredTerms,
    forbiddenOutputTerms: uniqueForbiddenTerms,
    requestedFormat,
    sentenceCount,
  };
}

function hasFactualProductDependency(text) {
  const selectedRecordReference = /\b(?:secili|aktif|mevcut|baktigim)\s+(?:teklif|vardiya|sefer|arac|surucu|sozlesme|kayit|kart)\p{L}*/iu.test(text);
  const possessiveRecordField = new RegExp(`\\b${PRODUCT_RECORD_POSSESSIVES}\\s+(?:\\p{L}+\\s+){0,3}${PRODUCT_FACTUAL_FIELDS}\\p{L}*(?:\\s+\\p{L}+){0,3}\\s+${PRODUCT_FACT_DEPENDENCY_VERBS}\\b`, "iu").test(text);
  return selectedRecordReference || possessiveRecordField;
}

// Product words can be requested as vocabulary for a new creative output.
// Treat that speech act as general unless the utterance also carries a real
// record-to-field dependency. This is deliberately structural: the content
// words themselves are not an implicit request to retrieve their records.
export function isGeneralCreativeOutputVocabularyRequest(value, ui = {}) {
  const text = normalize(value);
  const creativeOutput = new RegExp(`\\b${CREATIVE_OUTPUT_TOPICS}\\p{L}*.{0,48}\\b${CREATIVE_OUTPUT_VERBS}\\p{L}*`, "iu").test(text);
  // Turkish softens the final k in inflected "sözcük" forms
  // ("sözcüğüyle" → "sozcuguyle" after normalization), so keep the stem
  // family morphological rather than treating only one surface spelling.
  const vocabularyFraming = /\b(?:kelime|sozcuk|sozcug|soz)\p{L}*\b/iu.test(text);
  const vocabularyOutput = vocabularyFraming && /\b(?:yaz|olustur|hazirla|uret|uydur|kur)\p{L}*\b/iu.test(text);
  const containedVocabularyOutput = /\b(?:icinde|icer(?:en|ip))\s+.+?\s+(?:gecen|bulunan|yer\s+alan|iceren)\s+.+?\b(?:yaz|olustur|hazirla|uret|uydur|kur)\p{L}*\b/iu.test(text);
  // Vocabulary framing is a speech act: the user asks for new prose which
  // happens to contain product words. The output form need not be a fixed
  // noun from our creative-topic list; it can be a rhyme, slogan, caption,
  // or another user-defined form. Product retrieval remains available only
  // when the utterance expressly depends on selected-record facts.
  return (creativeOutput || vocabularyOutput || containedVocabularyOutput) && !productGroundedWritingShape(text, ui) && !hasFactualProductDependency(text);
}

function hasAmbiguousOpenSelectionCue(text) {
  return /(?:tekliflerden|vardiyalardan|seferlerden|kayitlardan|kartlardan)\s+hangisi\s+acik/iu.test(text);
}

// A bare selection request names neither a product target nor a decision
// criterion.  It is therefore a clarification boundary, not a comparison
// that may borrow an arbitrary current record or screen.
function hasUnspecifiedSelectionCue(text, ui = {}) {
  if (ui.selectedId || ui.selectedType) return false;
  return /^(?:hangisini|hangisi|hangi\s+birini)\s+(?:seceyim|secmeliyim|tercih\s+edeyim)\??$/iu.test(text);
}

// Parent live status language without a selected child/service cannot safely
// identify which authorized record the user means. Keep this as a surface-
// bound ambiguity rule: it does not turn the same words into product context
// on another route.
function hasUnresolvedParentLiveStatusCue(text, ui = {}) {
  if (ui.selectedId || ui.selectedType) return false;
  if (!/\/parent\/live\b/iu.test(String(ui.path || ''))) return false;
  return /^(?:gelmedi(?:\s+mi)?|niye\s+yok|neden\s+yok|gorunmuyor)\??$/iu.test(text);
}

// A selected parent-live service is already an authorized, unique context.
// These status forms therefore request a read-only status assessment; the
// no-selection branch above remains the clarification boundary.
function hasSelectedParentLiveStatusCue(text, ui = {}) {
  if (!(ui.selectedId || ui.selectedType)) return false;
  if (!/\/parent\/live\b/iu.test(String(ui.path || ''))) return false;
  return /^(?:gelmedi(?:\s+mi)?|gorunuyor\s+mu|gorunmuyor)\??$/iu.test(text);
}

function hasAmbiguousActionReferentCue(text, ui = {}) {
  if (ui.selectedId || ui.selectedType) return false;
  return /^(?:bunu|sunu|onu)\s+(?:nasil\s+(?:yap(?:acagim|ayim)|baslat(?:acagim|ayim))|ne\s+yap(?:acagim|ayim))\??$/iu.test(text);
}

// This wording asks for the causal mechanism behind an existing outcome; it
// is not an unresolved action request. Classify it before generic pronoun
// ambiguity so the canonical planner, rather than a legacy presentation
// fallback, owns the ROOT_CAUSE path.
function hasCausalMechanismCue(text) {
  return /(?:^|\s)(?:bunu|sunu|onu)\s+ne\s+bozuyor\s+olabilir\??$/iu.test(text);
}

// A direct control-state question is not a causal-analysis request.  Keep
// this narrow: broader "neden/niye" questions may still be legitimate root
// cause requests when they ask for the mechanism behind an observed outcome.
function hasDirectBlockedControlCue(text) {
  return /^(?:(?:bu|bunu)\s+)?(?:neden|niye)\s+(?:pasif|kapali|gorunmuyor|olmuyor)(?:\s+bu)?\??$/iu.test(text);
}

function hasRecordDetailsCue(text) {
  return hasAnyTerm(text, [
    "icerik", "icerigi", "icerigini", "detay", "detayi", "detaylari", "ayrinti", "ayrintisi", "ayrintilari",
    "icinde ne var", "neler var", "ne iceriyor", "ne icerir", "detayini ac", "ayrintisini anlat",
  ]);
}

function hasDirectFieldLookupCue(text) {
  const decisionProcessLanguage = /\bkarar\p{L}*\s+(?:ver|al)\p{L}*\b/iu.test(text);
  // A state question is a STATUS lookup even when it does not repeat the
  // literal noun "durum" in its base form.  These constructions describe a
  // property of the referenced record ("hangi durumda", "mevcut hali"),
  // rather than asking which record is selected.
  const statusStateQuestion = /\b(?:hangi|ne)\s+durum\p{L}*\b/iu.test(text)
    || /\b(?:mevcut|su\s+anki|guncel)\s+(?:hal|durum)\p{L}*\b/iu.test(text);
  const explicitStatusField = hasAnyTerm(text, [
    "durum", "durumu", "durumunu", "statü", "statüsü", "statu", "statusu", "status",
  ]) || /\b(?:durum|statu|status)\p{L}*\b/iu.test(text);
  const statusOrDecisionField = hasAnyTerm(text, [
    "durum", "durumu", "durumunu", "statü", "statüsü", "statu", "statusu", "status", "karar", "karari", "kararı", "tarih", "tarihi", "saat", "saatleri",
    "konum", "konumu", "rota", "rotasi", "durak", "duragi",
  ]);
  return (statusOrDecisionField && !(decisionProcessLanguage && !explicitStatusField))
    || statusStateQuestion
    || hasTimeFieldCue(text)
    || /\bstat(?:u|us)\p{L}*/iu.test(text) || hasDateRangeCue(text) || hasValueLookupCue(text);
}

function hasCurrentAssignmentCue(text) {
  return hasAnyTerm(text, [
    "aktif gorev", "mevcut gorev", "gorevim", "aktif vardiyam", "mevcut vardiyam",
    "bagli arac", "hangi araca bagli", "aracim hangisi", "aktif aracim", "mevcut aracim", "plakam", "servis aracim",
    "rotam", "duraklarim", "simdi hangi arac", "bugun hangi arac",
  ]);
}

function isShiftSurfaceContext(ui = {}) {
  return /\/(?:room|company)\/shifts\b/iu.test(String(ui?.path || ""));
}

function hasShiftStartReadinessCue(text) {
  const startCue = /\b(?:baslatma|baslangic)\p{L}*\b/iu.test(text);
  const readinessCue = /\b(?:uygun|hazir|baslatilabilir|baslayabilir)\p{L}*\b/iu.test(text);
  return startCue && readinessCue;
}

function hasPlanReviewCue(text) {
  const namedReviewObject = /\b(?:bu\s+)?(?:plan|taslak|oneri|karar|sozlesme|anlasma)\p{L}*(?:\s+\p{L}+){0,3}\s+(?:dogru|uygun|uygulanabilir|mantikli|sorunlu|eksik)\p{L}*(?:\s+(?:mi|mı|mu|mü|gorunuyor))?\b/iu.test(text);
  const reviewVerb = /\b(?:plan|taslak|oneri|karar|sozlesme|anlasma)\p{L}*(?:\s+\p{L}+){0,3}\s+(?:kontrol|incele|degerlendir|gozden\s+gecir)\p{L}*\b/iu.test(text);
  const approvalReview = /\b(?:plan|taslak|oneri|karar|sozlesme|anlasma)\p{L}*.{0,32}\b(?:onaylamadan|karar\s+vermeden)\s+once\b.{0,32}\b(?:neyi|neleri|ne)\s+(?:kontrol|incele|gozden\s+gecir|degerlendir)\p{L}*\b/iu.test(text);
  return namedReviewObject || reviewVerb || approvalReview;
}

function hasUrgentRiskRankingCue(text) {
  return /\b(?:hangi|hangisi|ne)\s+(?:konu|sorun|risk|is)\p{L}*\s+(?:daha\s+)?acil\p{L}*\b/iu.test(text)
    || /\b(?:en\s+)?acil\s+(?:konu|sorun|risk|is)\p{L}*\b/iu.test(text);
}

function hasComparisonCue(text) {
  return hasAnyTerm(text, [
    "karsilastir", "karsilastirma", "kiyasla", "kiyas", "fark", "arasindaki fark",
    "ikisi arasinda", "hangisi daha", "hangisini sec", "biri mi digeri mi", "yan yana",
  ]) || /\bfark\p{L}*/iu.test(text)
    || /(?:^|\s)#?\d+\p{L}*\s*(?:ile|ve|,|\/)\s*#?\d+\p{L}*(?=$|\s|[^\p{L}\p{N}])/iu.test(text)
    || /(?:^|\s)#?\d+\s*(?:mi|mı|mu|mü)\s*#?\d+\s*(?:mi|mı|mu|mü)?(?=$|\s|[^\p{L}\p{N}])/iu.test(text);
}

function hasPriorityOrderingCue(text) {
  return hasAnyTerm(text, [
    "hangisi öne alın", "hangisi one alin", "önceliklendirme", "onceliklendirme",
    "sıra ver", "sira ver", "önce ele al", "once ele al", "daha acil",
    "ilk ilgilen", "ilk ele al", "hangi teklif daha acil", "acil olan", "ilk sıraya", "ilk siraya",
  ]) || /\b(?:hangis\p{L}*\s+(?:once|oncelik)|once\s+(?:hangis\p{L}*|hangi\s+(?:kay\p{L}*|teklif\p{L}*|vardiya\p{L}*|sozlesme\p{L}*))|onceliklendir\p{L}*|sira\s+ver\p{L}*|daha\s+acil|acil\s+olan|ilk\s+ilgilen\p{L}*|ilk\s+ele\s+al\p{L}*|ilk\s+siraya\s+koy\p{L}*|hangi\s+teklif\s+daha\s+acil|(?:hangisini|kimi)\s+one\s+koy\p{L}*|(?:onem|oncelik)\p{L}*\s+(?:siras\p{L}*|dereces\p{L}*\s+gore)\s+(?:koy|ver|yap|duzenle|sirala|diz)\p{L}*|aciliyet\p{L}*\s+siras\p{L}*\s+(?:yerlestir|koy|ver|sirala|diz)\p{L}*)\b/iu.test(text)
    // Ranking is a structural operation when a plural/deictic comparison
    // target is paired with an ordering verb; no literal priority noun is
    // required (for example, "bu iki teklifi ... sıralayıp").
    || /\b(?:bu\s+)?(?:ikisi|ikisini|ikiliyi|bunlari|iki\s+(?:teklif|kayit|vardiya|sozlesme)\p{L}*)\b(?:\s+\p{L}+){0,8}\s+(?:sirala|diz|yerlestir|one\s+koy|onceliklendir)\p{L}*/iu.test(text);
}

function hasComparisonContext(conversationState, text) {
  const active = conversationState?.activeReasoningEntitySet
    || conversationState?.activeComparisonSet
    || conversationState?.authorizedProductContext?.semanticPlan?.entities
    || [];
  const activePair = Array.isArray(active) && active.filter(Boolean).length > 1;
  return activePair || hasComparisonCue(text) || /\b(?:ikisi|bu\s+iki|iki\s+kayit|iki\s+teklif|digeri)\b/iu.test(text);
}

function hasStandaloneNextCue(text) {
  // “Sonra?” is a short discourse continuation.  A sentence such as
  // “Konum incelemeden sonra nereye geçeyim?” already names its screen task,
  // so it must be resolved from the current authorized screen rather than
  // being treated as a continuation with no base.
  return /^(?:peki\s+)?(?:sonra|sonrasi|sonraki(?:\s+adim)?)(?:\s+ne)?[?.!,]*$/iu.test(String(text || '').trim());
}

function continuationActionFor(text) {
  // This is a discourse operation over the already authorized task. It never
  // adds a domain, entity, permission, or business execution request.
  if (/\b(?:bulamad|goremiyor|yanlis\s+ekran)\p{L}*/iu.test(text)) return "RECOVER";
  if (/^geri\b|\bgeri\s+(?:don|gel)\p{L}*/iu.test(text)) return "BACK";
  if (/\b(?:adim\s+adim|detayli|devamini|daha\s+fazla|biraz\s+daha)\s+(?:anlat|acikla)\p{L}*/iu.test(text)) return "EXPAND";
  if (hasStandaloneNextCue(text)) return "NEXT";
  return "CONTINUE";
}

function hasContinuationCue(text, conversationState = null) {
  const confirmsEntryToActiveGuidedTask = Boolean(conversationState?.activeGuidedTask?.semanticPlan)
    && /^\s*(?:girdim|girdik|ekrana\s+girdim|buradayim|buradayım)\b/iu.test(String(text || ''));
  return confirmsEntryToActiveGuidedTask || (!hasWorkflowGuidanceCue(text) && hasAnyTerm(text, [
    "devam", "devamini anlat", "devamini acikla", "devam et", "daha fazla anlat", "daha fazla acikla",
    "biraz daha anlat", "biraz daha acikla", "surdur", "devam edelim", "adim adim anlat",
    "adim adim acikla", "bulamadim", "burada goremiyorum",
    "yanlis ekrandayim", "geri",
  ]) || (!hasWorkflowGuidanceCue(text) && hasStandaloneNextCue(text)));
}

function hasReturnToProductCue(text, conversationState = null) {
  const productTarget = /(?:teklif|vardiya|sefer|arac|plaka|surucu|sofor|sozlesme|kayit|operasyon|servis|plan)\p{L}*/iu.test(text);
  const returnOperation = /(?:geri\s+)?don\p{L}*|geri\s+gel\p{L}*|kaldig\p{L}*\s+yer\p{L}*\s+devam/iu.test(text);
  const sameAuthSuspendedContext = Boolean(
    conversationState?.suspendedProductContext?.semanticPlan
    || (conversationState?.dialogueState?.suspendedProduct && conversationState?.productContext?.semanticPlan)
  );
  return returnOperation && (productTarget || sameAuthSuspendedContext);
}

function stylePresentation(text) {
  const normalized = normalize(text);
  const presentationCount = (value) => value === "bir" ? 1
    : value === "iki" ? 2
      : value === "uc" ? 3
        : value === "dort" ? 4
          : value === "bes" ? 5 : Number(value || 0) || null;
  // Presentation-only requests are a compositional count + unit + transform
  // operation.  Units deliberately include generic forms (part, section,
  // item) so a previous answer can be reformatted without relying on one
  // special noun such as "madde".
  const countedPresentation = /\b(bir|iki|uc|dort|bes|\d+)\s+(?:kisa\s+)?(madde|nokta|baslik|parca|bolum|oge|sey|cumle)(?:ya|yi|ye|lik|de|da|te|ta|me|ma|e|a|i|in|un)?\s+(?:halinde\s+|altinda\s+)?(?:ayir|bol|yap|cevir|hale\s+getir|anlat|ozetle|acikla|yaz|ver|indir|sikistir|toparla|soyle)\b/iu.exec(normalized)
    || /\b(bir|iki|uc|dort|bes|\d+)\s+baslik\s+altinda\s+(?:anlat|ozetle|acikla|yaz|ver|toparla)\b/iu.exec(normalized);
  if (countedPresentation) {
    const operator = countedPresentation[2] === "cumle" ? "SHORTEN" : "BULLETIZE";
    return { operator, itemCount: presentationCount(countedPresentation[1]) };
  }
  if (/\b(?:madde\s+madde|maddeler\s+halinde)\s+(?:anlat|ozetle|acikla|yaz|ver)\b/iu.test(normalized)) return { operator: "BULLETIZE", itemCount: null };
  const sentenceShortening = /\b(bir|iki|uc|dort|bes|tek|\d+)\s+cumle(?:ye|lik)?\s+(?:indir|cevir|yap|kur|hale\s+getir)\b/iu.exec(normalized);
  if (/\b(?:daha\s+)?kisa(?:ca)?\b/iu.test(normalized) || sentenceShortening) {
    const requested = sentenceShortening?.[1] || "";
    const itemCount = requested === "bir" || requested === "tek" ? 1
      : requested === "iki" ? 2
        : requested === "uc" ? 3
          : requested === "dort" ? 4
            : requested === "bes" ? 5 : Number(requested || 0) || null;
    return { operator: "SHORTEN", itemCount };
  }
  if (/\b(?:daha\s+)?(?:anlasilir|sade|basit|kolay)\s+(?:yaz|anlat|aktar)|\b(?:bunu|sunu|onu)\s+(?:sadelestir|basitlestir|netlestir|yeniden\s+yaz|farkli\s+anlat)\b/iu.test(normalized)) return { operator: "SIMPLIFY", itemCount: null };
  if (/\b(?:biraz\s+ac|detaylandir)\p{L}*/iu.test(normalized)) return { operator: "EXPAND", itemCount: null };
  return null;
}

function hasFreshnessCheckCue(text) {
  // A freshness question asks whether data is still trustworthy as a
  // representation of the current state.  It is different from asking for
  // a business date on a record (for example an offer's start/end dates).
  // Keep the distinction semantic: update/recency stems and validity terms
  // express freshness regardless of their exact Turkish inflection.
  const refreshOrRecency = /(?:yenilen|guncelle|tazele)\p{L}*|guncellik\p{L}*|\b(?:taze|eski)\p{L}*\b|\b(?:veri|bilgi|sonuc)\p{L}*.{0,18}\bya[sş]\p{L}*\b|ne\s+kadar\s+eski|ne\s+zamandir\s+(?:boyle|bu\s+halde)|son\s+(?:guncelle|yenilen)\p{L}*/iu.test(text);
  const contextualCurrentness = /(?:guncel|son\s+durum|halen|hala)\p{L}*/iu.test(text);
  const checkOperation = /(?:\bm(?:i|u)\b|miyiz|midir|ne\s+kadar|ne\s+zaman|kontrol|dogru|gecerli|guvenilir)/iu.test(text);
  const ageQuestion = /\b(?:veri|bilgi|sonuc)\p{L}*.{0,18}\bya[sş]\p{L}*\s+(?:ne|nedir)\b/iu.test(text);
  // "güncel durum nedir" is ordinarily a STATUS lookup.  Do not promote it
  // to freshness unless the wording also carries an update/recency concept.
  const explicitStatusField = /\b(?:durum|statu|status)\p{L}*\b/iu.test(text);
  return (checkOperation || ageQuestion) && (refreshOrRecency || (contextualCurrentness && !explicitStatusField));
}

function hasEvidenceSufficiencyCue(text) {
  return /(?:kanit|dayanak|delil|veri)\p{L}*.{0,28}(?:yeter|tam|eksik|guclu|saglam|dogrula)\p{L}*/iu.test(text)
    || /(?:yeterli|saglam|guclu)\p{L}*.{0,28}(?:kanit|dayanak|delil|veri)\p{L}*/iu.test(text)
    || /^(?:bunun\s+|onun\s+)?(?:kanit|dayanak|delil)\p{L}*\s+(?:ne|nedir|hangisi)\??$/iu.test(text);
}

function hasUncertaintyCheckCue(text) {
  return hasEvidenceSufficiencyCue(text)
    || /(?:emin\s+miyiz|emin\s+misin|kesin\s+mi|guvenebilir\s+miyiz|dogrulanmis\s+mi|suphe\p{L}*\s+var\s+mi)/iu.test(text);
}

function hasUniqueTypedDiscourseReferent(text, conversationState = null) {
  const candidates = [
    ...(Array.isArray(conversationState?.lastExplicitEntitySet) ? conversationState.lastExplicitEntitySet : []),
    ...(Array.isArray(conversationState?.entityContext?.conversationEntities) ? conversationState.entityContext.conversationEntities : []),
    ...(Array.isArray(conversationState?.activeComparisonSet) ? conversationState.activeComparisonSet : []),
  ].filter((candidate) => candidate?.type && candidate?.id);
  const unique = [...new Map(candidates.map((candidate) => [`${candidate.type}:${candidate.id}`, candidate])).values()];
  if (unique.length !== 1) return false;
  const type = String(unique[0].type).toLowerCase();
  const typeCue = type === "offer" ? /\bteklif\p{L}*/iu
    : type === "shift" ? /\b(?:vardiya|sefer|shift)\p{L}*/iu
      : type === "vehicle" ? /\b(?:arac|plaka|vehicle)\p{L}*/iu
        : type === "driver" ? /\b(?:surucu|sofor|driver)\p{L}*/iu
          : type === "agreement" ? /\b(?:sozlesme|anlasma|agreement)\p{L}*/iu
            : /\b(?:kayit|kart)\p{L}*/iu;
  return typeCue.test(text);
}

function hasAmbiguousReferentCue(text, conversationState = null) {
  if (/(?:teklif|vardiya|sefer|arac|sozlesme|kayit)\p{L}*\s*#?\s*\d+/iu.test(text)) return false;
  // A named same-auth discourse referent is safe only if the server-owned
  // state contains exactly one matching entity.  It remains discourse state,
  // never a restored UI selection.
  if (hasUniqueTypedDiscourseReferent(text, conversationState)) return false;
  return /^(?:hangisi\s+acik|(?:az\s+)?onceki\s+(?:sey|kayit|kart|teklif|vardiya|sefer)|oteki\b|digeri\b|hani\s+(?:su\s+|az\s+)?(?:onceki\s+)?(?:kayit|sey)?\b|o\s+hangisiydi\b|o\s+neydi\b|onu(?:\s+\p{L}+){0,2}\s+(?:anlat|acikla|goster)\p{L}*\b|(?:su|o)\s+sey\p{L}*(?:\s+(?:anlat|acikla|goster)\p{L}*)?\b)/iu.test(text);
}

function hasPriorityOperationCue(text) {
  // Priority is an ordering operation, not a fixed phrase.  Recognize the
  // grammatical combination of first/before + a decision target + an
  // investigate/resolve verb so natural inflections remain typed operations.
  const firstTargetOperation = /(?:en\s+)?(?:ilk|once)\s+(?:olarak\s+)?(?:neyi|neye|neyle|hangis\p{L}*|hangi\s+is\p{L}*|is\p{L}*)\s+(?:(?:ele\s+al|incele|bak|coz|hallet|ugras)\p{L}*|ne(?:dir|\s+olmali)?)/iu.test(text);
  const chooseFirstOperation = /hangis\p{L}*\s+(?:once|ilk)\s+(?:olarak\s+)?(?:ele\s+al|incele|bak|coz|hallet|ugras)\p{L}*/iu.test(text);
  const priorityNounOperation = /\bonceli\p{L}*\b.{0,24}\b(?:ne|nedir|olmali|hangis\p{L}*)\b/iu.test(text);
  const firstWorkOperation = /(?:simdi\s+)?(?:en\s+)?ilk\s+is\p{L}*\s+ne(?:dir|\s+olmali)?/iu.test(text);
  // Choosing/recommending the first work item is an action-prioritization
  // operation even when the user does not ask the literal "ne?" question.
  const chooseWorkOperation = /(?:ilk|once)\s+(?:olarak\s+)?(?:is|adim|islem|aksiyon)\p{L}*\s+(?:sec|belirle|oner|goster)\p{L}*/iu.test(text);
  const firstNamedWork = /(?:ilk|once)\s+(?:olarak\s+)?hangi\s+(?:kay\p{L}*|is|konu|sorun)\p{L}*(?:\s+(?:ele\s+al|incele|bak|coz|hallet|ugras)\p{L}*)?/iu.test(text);
  const urgentOrdering = /(?:en\s+)?acil\p{L}*(?:\s+olan\p{L}*)?\s+(?:(?:kay(?:it|id)|konu|sorun)\p{L}*\s+)?(?:sirala|listele|oner|belirle)\p{L}*/iu.test(text);
  return hasAnyTerm(text, ["oncelik", "ilk ilgilen", "hangi isi once", "once neyi", "ilk hangisi"])
    || /hangis\p{L}*\s+(?:daha\s+)?acil\p{L}*/iu.test(text)
    || /(?:hangis\p{L}*|nereden|neyle)\s+(?:once\s+|ilk\s+)?basla\p{L}*/iu.test(text)
    || /(?:ilk|once)\s+(?:olarak\s+)?hangis\p{L}*(?:\s+(?:ele\s+al|incele|coz|bak)\p{L}*)?/iu.test(text)
    || /hangis\p{L}*\s+oncelik\s+ver\p{L}*/iu.test(text)
    || /hangi\s+(?:is|kayit|konu|sorun)\p{L}*\s+(?:once|ilk)\s+(?:ele\s+al|coz|incele|bak)\p{L}*/iu.test(text)
    || firstTargetOperation
    || chooseFirstOperation
    || priorityNounOperation
    || firstWorkOperation
    || chooseWorkOperation
    || firstNamedWork
    || urgentOrdering;
}

function hasNextActionOperationCue(text) {
  const directAction = /\b(?:ne\s+)?yap\p{L}*\s+gerek\p{L}*/iu.test(text)
    || /(?:sonraki|siradaki|bir\s+sonraki|ilk)\s+(?:dogru\s+|guvenli\s+)?(?:adim|islem|aksiyon)\p{L}*/iu.test(text)
    || /(?:bundan\s+sonra|hemen)\s+ne\s+yap\p{L}*/iu.test(text)
    || /sirada\s+ne\s+var/iu.test(text)
    || /\b(?:simdi|hemen|bundan\s+sonra)?\s*(?:en\s+)?mantikli\s+(?:adim|is|islem|aksiyon)\p{L}*\b/iu.test(text);
  const bareNow = /^(?:peki\s+)?simdi\s+ne(?:\s+yapayim|\s+yapalim)?\??$/iu.test(text);
  return directAction || hasAttentionAssessmentCue(text) || (bareNow && !hasDirectFieldLookupCue(text));
}

function hasRelationLookupCue(text) {
  if (isSelectedRecordIdentityRelationForm(text)) return false;
  const directFieldCue = hasAnyTerm(text, [
    "durum", "durumu", "durumunu", "statü", "statüsü", "statu", "statusu", "status", "karar", "karari", "kararı", "tarih", "tarihi", "saat", "saatleri", "risk", "riski", "kalite", "kalitesi", "konum", "konumu", "rota", "rotasi", "durak", "duragi",
  ]);
  const explicitRelationCue = hasExplicitRelationCue(text);
  if (directFieldCue && !explicitRelationCue) return false;
  const relationGrammar = /(?:bagl\p{L}*|ait\p{L}*|ilisk\p{L}*|baglanti\p{L}*|esles\p{L}*|kayn\p{L}*)/iu.test(text)
    || hasTypedEntityRelationQuestion(text)
    || /(?:vardiya|sefer|shift|arac\p{L}*|surucu\p{L}*|sofor\p{L}*|sozlesme\p{L}*|kayit\p{L}*).{0,24}(?:bagli|ait|iliskili|araci|vardiyasi|surucusu|soforu)/iu.test(text);
  return relationGrammar || hasAnyTerm(text, [
    "bagli", "ait", "iliskili", "hangi vardiyaya bagli", "hangi araca bagli", "hangi sofore bagli",
    "surucusu kim", "soforu kim", "bagli kayit", "bagli kaydi", "sozlesmesi var mi",
  ]);
}

// Workflow guidance is a request to find the current product entry point,
// not a lookup for an existing record.  Keep this semantic distinction at the
// canonical request boundary so every downstream composer/authorizer receives
// the same task intent for natural Turkish variants.
function hasWorkflowGuidanceCue(text) {
  // A request that explicitly names a fabricated/nonexistent target must not
  // enter a real workflow lane.  It has no canonical screen identity to
  // resolve, so downstream guidance must remain target-less and truthful.
  if (/\b(?:hayali|olmayan|var\s+olmayan|mevcut\s+olmayan|uydurma|sahte)\b/iu.test(text)) return false;
  const hasShiftSubject = /\b(?:vardiya|sefer|shift)\p{L}*\b/iu.test(text);
  if (!hasShiftSubject) return false;
  const guidanceVerb = /\b(?:olustur|oluştur|ac|aç|ekle|goster|göster|gotur|götür|bulamad|bulamiyor|bulamıyo|nereden)\p{L}*\b/iu.test(text);
  if (!guidanceVerb) return false;
  // Existing-record questions remain data lookups.  Creation/location verbs
  // without a concrete record/status keep the request in the UI workflow lane.
  const existingRecordLookup = /\b(?:durum|status|statu|numara|id|tarih|saat|konum|arac|araç|surucu|sürücü|kayit|kayıt)\p{L}*\b/iu.test(text)
    && !/\b(?:olustur|oluştur|ac|aç|ekle|goster|göster|gotur|götür|nereden)\p{L}*\b/iu.test(text);
  return !existingRecordLookup;
}

// Opening the Vardiyalar surface is a navigation task. It is distinct from
// both creating a new shift and reading a shift field: the user names a
// screen/location, not an existing record or one of its properties.
function hasShiftSurfaceNavigationCue(text) {
  if (/\b(?:hayali|olmayan|var\s+olmayan|mevcut\s+olmayan|uydurma|sahte)\b/iu.test(text)) return false;
  const hasShiftSubject = /\b(?:vardiya|sefer|shift)\p{L}*\b/iu.test(text);
  if (!hasShiftSubject) return false;
  const creationCue = /\b(?:olustur|oluştur|ac|aç|ekle)\p{L}*\b/iu.test(text);
  const creationScreenCue = /\b(?:olustur|oluştur|ekle|ekleme)\p{L}*\s+ekran\p{L}*\b/iu.test(text);
  const directScreenOpenCue = /\bekran\p{L}*\s+(?:ac|aç)\b/iu.test(text);
  // “Vardiya ekranını aç” names the existing surface.  “Vardiya oluşturma
  // ekranını aç” still names the create workflow, so it stays in the
  // CREATE_SHIFT lane.  This distinction is semantic, not a phrase-specific
  // route shortcut.
  if (creationCue && (!directScreenOpenCue || creationScreenCue)) return false;
  return /\b(?:nerede|nerde|ekran\p{L}*|goster|göster|git|gidelim|kontrol\s+edelim)\b/iu.test(text);
}

// A deictic reference ("bu teklif", "seçili vardiya") identifies a target;
// it is not itself a request to identify that target.  Keep operation
// detection separate so that explicit work such as risk, next action, field,
// detail, or relation lookup cannot collapse into SELECTED_RECORD_CONTEXT.
function inferExplicitOperations(text) {
  const tasks = [];
  if (hasComparisonCue(text)) tasks.push("COMPARISON");
  if (hasFreshnessCheckCue(text)) tasks.push("FRESHNESS_CHECK");
  if (hasUncertaintyCheckCue(text)) tasks.push("UNCERTAINTY_CHECK");
  if (hasEvidenceSufficiencyCue(text)) tasks.push("EVIDENCE_SUFFICIENCY");
  if (hasIssueDiagnosticCue(text)) tasks.push("ISSUE");
  if (hasCardinalityCue(text) && !hasValueLookupCue(text)) tasks.push("COUNT");
  if (hasRelationLookupCue(text)) tasks.push("RELATION_LOOKUP");
  if (hasRecordDetailsCue(text)) tasks.push("RECORD_DETAILS");
  if (hasDirectFieldLookupCue(text)) tasks.push("FIELD_LOOKUP");
  if (hasRiskCue(text)) tasks.push("RISK");
  if (hasAssessmentSummaryCue(text)) {
    tasks.push(/(?:oncele|onceliklendir|one\s+koy)\p{L}*/iu.test(text) ? "PRIORITY" : "RISK");
  }
  if (hasNextActionOperationCue(text)) tasks.push("NEXT_ACTION");
  if (!hasDirectBlockedControlCue(text) && hasAnyTerm(text, ["neden", "niye", "sebep", "nicin", "neden onemli", "gerekce"])) tasks.push("CAUSE");
  if (/(?:etki|sonuc)\p{L}*.{0,20}(?:ne|nedir|olur|yaratir|dogurur)/iu.test(text)) tasks.push("CAUSE");
  if (hasPriorityOperationCue(text)) tasks.push("PRIORITY");
  if (hasAnyTerm(text, [
    "cozelim", "cozeriz", "cozmek", "nasil coz", "nasil halled", "cozum adimi",
    "cozum plani", "uygulanacak adim", "cozum sirasi",
  ])) tasks.push("RESOLUTION");
  return [...new Set(tasks)];
}

function explicitTaskShape(text, ui) {
  const requestedTasks = inferExplicitOperations(text);
  if (!requestedTasks.length) return null;
  const target = inferTarget(text, { forCount: requestedTasks.includes("COUNT") });
  const mayUseSelectedTarget = Boolean(ui.selectedId && ui.selectedType)
    && (hasSelectedRecordCue(text) || hasSelectedRecordReference(text) || hasSelectedRecordActionReference(text) || hasSelectedRecordIdentityCue(text, ui));
  const selectedCommercialField = requestedTasks.includes("FIELD_LOOKUP") && hasValueLookupCue(text) && ui.selectedType;
  const selectedType = selectedCommercialField ? ui.selectedType : target?.type || (mayUseSelectedTarget ? ui.selectedType : null);
  const selectedDomain = target?.domain
    || (selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === selectedType)?.domain || null : null);
  // A query can surface both a temporal field cue ("ne zaman") and a
  // freshness operation ("yenilendi/güncellendi").  The latter determines
  // the requested work; timestamps are evidence, not a reason to replace
  // FRESHNESS_CHECK with a record-date lookup.
  const primaryTask = [
    "COMPARISON", "EVIDENCE_SUFFICIENCY", "UNCERTAINTY_CHECK", "FRESHNESS_CHECK", "ISSUE", "PRIORITY", "NEXT_ACTION", "RESOLUTION", "RISK", "CAUSE",
    "RELATION_LOOKUP", "RECORD_DETAILS", "FIELD_LOOKUP", "COUNT",
  ].find((task) => requestedTasks.includes(task)) || requestedTasks[0];
  return {
    taskType: primaryTask,
    confidence: selectedType ? 0.96 : 0.86,
    domain: selectedDomain,
    targetEntityType: selectedType,
    requestedTasks,
    explicitTaskIntent: true,
    countTarget: primaryTask === "COUNT" && target
      ? { targetEntityType: target.type, domain: target.domain }
      : null,
  };
}

function countTargetIsExplicitlyExcluded(text, concept) {
  const normalized = normalize(text);
  // This models exclusion grammar ("öğrencileri say, sözleşme sayma")
  // rather than enumerating sentences.  An excluded entity must not turn an
  // otherwise explicit count target into an arbitrary screen-domain count.
  return concept.terms.some((term) => {
    const stem = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${stem}\\p{L}*(?:\\s+\\p{L}+){0,3}\\s+(?:sayma|saymay|sayilma|haric|disinda|degil)\\p{L}*\\b`, "iu").test(normalized);
  });
}

function inferTarget(text, { forCount = false } = {}) {
  const candidates = ENTITY_CONCEPTS.filter((concept) => hasAnyTerm(text, concept.terms));
  const applicable = forCount ? candidates.filter((concept) => !countTargetIsExplicitlyExcluded(text, concept)) : candidates;
  return applicable.length === 1 ? applicable[0] : null;
}

function inferTask({ text, rawText = text, ui, conversationState = null }) {
  if (isGeneralArithmeticRequest(text)) {
    return { taskType: null, confidence: 0.99, domain: null, targetEntityType: null, generalArithmetic: true };
  }
  const groundedWriting = productGroundedWritingShape(text, ui);
  if (groundedWriting) {
    const target = inferTarget(text);
    // Grounded writing requires a real selected record.  A word such as
    // "sürücüye" is its message audience, not a reason to replace that
    // selected record with a DRIVER retrieval target.
    const selectedType = ui.selectedType || target?.type || null;
    const selectedDomain = target?.domain
      || (selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === selectedType)?.domain || null : null);
    return {
      taskType: "FIELD_LOOKUP",
      confidence: selectedType ? 0.98 : 0.86,
      domain: selectedDomain,
      targetEntityType: selectedType,
      selectedRecordIntent: Boolean(ui.selectedId && ui.selectedType),
      explicitTaskIntent: true,
      ...groundedWriting,
    };
  }
  if (isGeneralCreativeOutputVocabularyRequest(text, ui)) {
    return {
      taskType: "OFF_TOPIC",
      confidence: 0.98,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: true,
      ...generalCreativeOutputShape(rawText),
    };
  }
  if (hasExplicitGeneralInformationIntent(text)) {
    return {
      taskType: "OFF_TOPIC",
      confidence: 0.97,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: true,
      generalInformationIntent: true,
    };
  }
  const presentation = stylePresentation(text);
  const creativeOutputRequest = /\b(?:saka|espri|hikaye|mesaj|metin|not)\p{L}*.{0,24}\b(?:yaz|olustur|hazirla|uret)\p{L}*/iu.test(text);
  const hasLastSettledResult = Boolean(conversationState?.lastSettledResult?.semanticPlan || conversationState?.authorizedProductContext?.semanticPlan);
  if (presentation && !creativeOutputRequest && (/\b(?:bunu|sunu|onu)\b/iu.test(text) || hasLastSettledResult)) {
    return {
      taskType: "STYLE",
      confidence: 0.97,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: true,
      presentationOperator: presentation.operator,
      presentationItemCount: presentation.itemCount,
      styleTarget: "LAST_SETTLED_RESULT",
    };
  }
  if (hasContinuationCue(text, conversationState)) {
    return {
      taskType: "CONTINUE_CURRENT_REASONING",
      confidence: 0.99,
      domain: null,
      targetEntityType: ui.selectedType || null,
      continuationIntent: true,
      continuationAction: continuationActionFor(text),
    };
  }
  if (hasShiftSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "OPEN_SHIFT_SURFACE",
    };
  }
  if (hasWorkflowGuidanceCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "CREATE_SHIFT",
    };
  }
  if (hasVisibleControlDiscoveryCue(text, ui)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.96,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      uiTargetDiscovery: true,
    };
  }
  // "Bu vardiyanın riskine dön" is a selected-record risk request, not a
  // context-restoration command.  A genuine return phrase has no present
  // selected-assessment operation and can continue through its existing
  // suspended-context lifecycle.
  const selectedAssessmentReturnTarget = hasSelectedTypedPossessiveReference(text, ui)
    && (hasRiskCue(text) || hasAttentionAssessmentCue(text) || hasNextActionOperationCue(text));
  if (hasReturnToProductCue(text, conversationState) && !selectedAssessmentReturnTarget) {
    return { taskType: "RETURN_TO_PRODUCT", confidence: 0.98, domain: null, targetEntityType: ui.selectedType || null, returnToProductIntent: true, explicitTaskIntent: true };
  }
  // Resolve a determined selected-record identity before generic pronoun
  // ambiguity.  The selection supplies the unique referent; this does not
  // apply to relation requests, which the identity predicate rejects.
  if (hasSelectedRecordIdentityCue(text, ui) && !hasPlanReviewCue(text)) {
    return {
      taskType: "SELECTED_RECORD_CONTEXT",
      confidence: 0.99,
      domain: ui.selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === ui.selectedType)?.domain || null : null,
      targetEntityType: ui.selectedType || null,
      selectedRecordIntent: true,
      explicitTaskIntent: true,
    };
  }
  if (hasAmbiguousReferentCue(text, conversationState)) {
    return { taskType: "CLARIFY", confidence: 0.97, domain: null, targetEntityType: null, ambiguity: "REFERENT_NOT_UNIQUELY_JUSTIFIED" };
  }
  if (hasCausalMechanismCue(text)) {
    return { taskType: "CAUSE", confidence: 0.96, domain: null, targetEntityType: null, explicitTaskIntent: true };
  }
  if (hasAmbiguousActionReferentCue(text, ui)) {
    return { taskType: "CLARIFY", confidence: 0.96, domain: null, targetEntityType: null, ambiguity: "ACTION_TARGET_NOT_SPECIFIED" };
  }
  if (hasUnresolvedParentLiveStatusCue(text, ui)) {
    return { taskType: "CLARIFY", confidence: 0.96, domain: "PERSONNEL", targetEntityType: "STUDENT", ambiguity: "PARENT_LIVE_TARGET_NOT_SPECIFIED" };
  }
  if (hasSelectedParentLiveStatusCue(text, ui)) {
    return { taskType: "STATUS", confidence: 0.96, domain: "PERSONNEL", targetEntityType: ui.selectedType || "STUDENT", explicitTaskIntent: true };
  }
  if (hasPlanReviewCue(text)) {
    const selectedReviewType = ui.selectedEntityPresent && ["ORGANIZATION_PLAN", "AGREEMENT", "OFFER"].includes(ui.selectedType)
      ? ui.selectedType
      : null;
    const selectedReviewDomain = selectedReviewType
      ? ENTITY_CONCEPTS.find((concept) => concept.type === selectedReviewType)?.domain || null
      : null;
    if (selectedReviewType) {
      return {
        taskType: "PLAN_REVIEW",
        confidence: 0.98,
        domain: selectedReviewDomain,
        targetEntityType: selectedReviewType,
        requestedTasks: ["PLAN_REVIEW"],
        requiredOutputSlots: ["EVIDENCE", "UNCERTAINTY", "SAFE_NEXT_STEP"],
        selectedRecordIntent: true,
        planReviewIntent: true,
        explicitTaskIntent: true,
      };
    }
    return {
      taskType: "CLARIFY",
      confidence: 0.96,
      domain: null,
      targetEntityType: null,
      ambiguity: "PLAN_REVIEW_OBJECT_NOT_SELECTED",
      planReviewIntent: true,
      explicitTaskIntent: true,
    };
  }
  if (isShiftSurfaceContext(ui) && hasShiftStartReadinessCue(text)) {
    return {
      taskType: "SHIFT_START_READINESS",
      confidence: 0.96,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      screenContextIntent: true,
      explicitTaskIntent: true,
    };
  }
  if (ui.path && hasUrgentRiskRankingCue(text)) {
    return {
      taskType: "RISK",
      confidence: 0.95,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      urgentRiskIntent: true,
      screenContextIntent: true,
      explicitTaskIntent: true,
    };
  }
  // A screen-deictic action or situation is a current-screen task even when
  // it also contains words such as "önce", "durum", or "hangi". Classify
  // it before generic priority/field grammar can turn it into global work.
  if ((hasScreenContextCue(text) || (ui.path && hasCurrentScreenReferentCue(text))) && !hasCardinalityCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: hasScreenDetailCue(text),
      explicitTaskIntent: true,
    };
  }
  if (hasScreenDeicticActionCue(text) && !hasCardinalityCue(text)) {
    return { taskType: "NEXT_ACTION", confidence: 0.95, domain: null, targetEntityType: null, screenContextIntent: true, explicitTaskIntent: true };
  }
  if (hasScreenDeicticSituationCue(text) && !hasCardinalityCue(text)) {
    return { taskType: "SITUATION", confidence: 0.95, domain: null, targetEntityType: null, screenContextIntent: true, explicitTaskIntent: true };
  }
  const explicitTask = explicitTaskShape(text, ui);
  const priorityComparison = hasPriorityOrderingCue(text) && hasComparisonContext(conversationState, text);
  if (hasUnspecifiedSelectionCue(text, ui)) {
    return {
      taskType: "CLARIFY",
      confidence: 0.96,
      domain: null,
      targetEntityType: null,
      ambiguity: "SELECTION_TARGET_OR_CRITERION_NOT_SPECIFIED",
    };
  }
  if (hasComparisonCue(text) || priorityComparison) {
    const requestedTasks = [...new Set([...(explicitTask?.requestedTasks || []), "COMPARISON", ...(priorityComparison ? ["PRIORITY"] : [])])];
    return {
      taskType: "COMPARISON",
      confidence: 0.96,
      domain: explicitTask?.domain || (ui.selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === ui.selectedType)?.domain || null : null),
      targetEntityType: explicitTask?.targetEntityType || ui.selectedType || null,
      requestedTasks,
      explicitTaskIntent: true,
    };
  }
  if (hasAmbiguousOpenSelectionCue(text)) {
    return {
      taskType: "CLARIFY",
      confidence: 0.58,
      domain: ui.selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === ui.selectedType)?.domain || null : null,
      targetEntityType: ui.selectedType || null,
      ambiguity: "OPEN_SELECTED_VS_STATUS",
    };
  }
  if (explicitTask) return explicitTask;
  const selectedRecordCue = hasSelectedRecordCue(text) || hasSelectedRecordIdentityCue(text, ui);
  const hasRealSelectedRecord = Boolean(ui.selectedId && ui.selectedType);
  const selectedRecordRequest = selectedRecordCue
    && hasRealSelectedRecord
    && !hasCardinalityCue(text)
    && !hasExplicitRelationCue(text);
  if (selectedRecordCue && !hasRealSelectedRecord && !hasCardinalityCue(text) && !hasExplicitRelationCue(text)) {
    return {
      taskType: "CLARIFY",
      confidence: 0.96,
      domain: null,
      targetEntityType: null,
      ambiguity: "NO_SELECTED_RECORD",
      selectedRecordIntent: true,
      explicitTaskIntent: true,
    };
  }
  const combinedScreenAndSelectedRecord = selectedRecordRequest
    && hasExplicitScreenQuestion(text)
    && /[,]|(?:^|\s)(?:ve|hem|ayrıca|ayrica)(?:\s|$)/iu.test(text);
  if (combinedScreenAndSelectedRecord) {
    return {
      taskType: "SELECTED_RECORD_CONTEXT",
      confidence: ui.selectedId && ui.selectedType ? 0.99 : 0.8,
      domain: ui.selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === ui.selectedType)?.domain || null : null,
      targetEntityType: ui.selectedType || null,
      selectedRecordIntent: true,
      screenContextIntent: true,
      combinedContextIntent: true,
    };
  }
  if (selectedRecordRequest) {
    return {
      taskType: "SELECTED_RECORD_CONTEXT",
      confidence: ui.selectedId && ui.selectedType ? 0.99 : 0.78,
      domain: ui.selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === ui.selectedType)?.domain || null : null,
      targetEntityType: ui.selectedType || null,
      selectedRecordIntent: true,
    };
  }
  if (hasRecordDetailsCue(text) && !hasCardinalityCue(text)) {
    const target = inferTarget(text, { forCount: true });
    const selectedType = target?.type || ui.selectedType || null;
    const selectedDomain = target?.domain
      || (selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === selectedType)?.domain || null : null);
    return {
      taskType: "RECORD_DETAILS",
      confidence: selectedType ? 0.96 : 0.72,
      domain: selectedDomain,
      targetEntityType: selectedType,
      recordDetailsIntent: true,
    };
  }
  const currentAssignmentTarget = inferTarget(text);
  if (hasCurrentAssignmentCue(text) && (!ui.selectedId || !currentAssignmentTarget || currentAssignmentTarget.type === ui.selectedType) && !hasCardinalityCue(text)) {
    const target = currentAssignmentTarget;
    return {
      taskType: "FIELD_LOOKUP",
      confidence: target ? 0.93 : 0.9,
      domain: target?.domain || "SHIFTS",
      targetEntityType: target?.type || "SHIFT",
      currentAssignmentIntent: true,
    };
  }
  if (hasDirectFieldLookupCue(text) && !hasCardinalityCue(text)) {
    const target = inferTarget(text);
    const selectedCommercialField = hasValueLookupCue(text) && ui.selectedType;
    const selectedType = selectedCommercialField ? ui.selectedType : target?.type || ui.selectedType || null;
    const selectedDomain = target?.domain
      || (selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === selectedType)?.domain || null : null);
    return {
      taskType: "FIELD_LOOKUP",
      confidence: selectedType ? 0.94 : 0.82,
      domain: selectedDomain,
      targetEntityType: selectedType,
    };
  }
  if (hasRelationLookupCue(text) && !hasCardinalityCue(text)) {
    return {
      taskType: "RELATION_LOOKUP",
      confidence: 0.9,
      domain: null,
      targetEntityType: null,
      relationIntent: true,
    };
  }
  if (hasCardinalityCue(text) && !hasValueLookupCue(text)) {
    const target = inferTarget(text);
    if (target) {
      return {
        taskType: "COUNT",
        confidence: 0.98,
        domain: target.domain,
        targetEntityType: target.type,
        countTarget: { targetEntityType: target.type, domain: target.domain },
        explicitCardinalityTarget: true,
      };
    }
  }
  if (hasDateRangeCue(text)) return { taskType: "FIELD_LOOKUP", confidence: 0.86 };
  if (hasValueLookupCue(text)) return { taskType: "FIELD_LOOKUP", confidence: 0.82 };
  return { taskType: null, confidence: 0, domain: null, targetEntityType: null };
}

export function inferCanonicalSemanticRequest({ message, screenContext, conversationState } = {}) {
  const text = normalize(message);
  const ui = currentUiContext(screenContext, conversationState);
  const inferred = inferTask({ text, rawText: message, ui, conversationState });
  const requestedOwnershipScope = inferRequestedOwnershipScope(text);
  const targetCandidates = ENTITY_CONCEPTS.filter((concept) => hasAnyTerm(text, concept.terms));
  const countTargetCandidates = targetCandidates.filter((concept) => !countTargetIsExplicitlyExcluded(text, concept));
  const ambiguousTarget = hasCardinalityCue(text) && !hasValueLookupCue(text) && countTargetCandidates.length > 1;
  const task = ambiguousTarget ? "CLARIFY" : inferred.taskType;
  const selectedScopeRequested = Boolean(ui.selectedId && ui.selectedType)
    && (hasSelectedRecordCue(text) || hasSelectedRecordReference(text) || hasSelectedRecordActionReference(text) || hasSelectedTypedPossessiveReference(text, ui) || hasSelectedRecordIdentityCue(text, ui) || inferred.productGroundedWritingIntent);
  const inheritedSelectedAssessmentScope = hasInheritedSelectedAssessmentScope({ text, ui, inferred });
  const scopeTarget = inferred.generalInformationIntent || inferred.generalCreativeIntent
    ? "NONE"
    : hasRoleGlobalScopeCue(text)
    ? "ROLE_GLOBAL"
    : selectedScopeRequested || inheritedSelectedAssessmentScope || task === "PLAN_REVIEW" || (["FIELD_LOOKUP", "RELATION_LOOKUP", "RECORD_DETAILS", "STYLE"].includes(task) && Boolean(ui.selectedId))
      ? "SELECTED_RECORD"
      : "CURRENT_SCREEN";
  const requiredOutputSlots = (() => {
    const tasks = inferred.requestedTasks || [];
    const slots = new Set(inferred.requiredOutputSlots || []);
    if (task === "COMPARISON" && tasks.includes("PRIORITY")) {
      slots.add("WINNER_OR_ORDER");
      slots.add("REASON");
      slots.add("EVIDENCE");
    }
    if (task === "PRIORITY" || tasks.includes("PRIORITY")) {
      slots.add("ORDER_DECISION");
      slots.add("REASON");
    }
    if ((task === "PRIORITY" || tasks.includes("PRIORITY")) && /(?:kanit|dayanak|delil|veri)/iu.test(text)) slots.add("EVIDENCE");
    if (tasks.includes("NEXT_ACTION") || tasks.includes("RESOLUTION")) slots.add("SAFE_NEXT_STEP");
    if (tasks.includes("CAUSE")) slots.add("REASON");
    return [...slots];
  })();
  return {
    ...inferred,
    taskType: task,
    ambiguity: ambiguousTarget ? "MULTIPLE_EXPLICIT_ENTITY_TARGETS" : (inferred.ambiguity || null),
    targetCandidates: targetCandidates.map((concept) => concept.type),
    normalizedText: text,
    uiContext: ui,
    requestedOwnershipScope,
    scopeTarget,
    requiredOutputSlots,
    explicitUserTarget: Boolean(inferred.targetEntityType || inferred.countTarget || inferred.requestedTasks?.length || task === "SCREEN_CONTEXT" || task === "SELECTED_RECORD_CONTEXT" || task === "RELATION_LOOKUP" || task === "RECORD_DETAILS" || task === "CONTINUE_CURRENT_REASONING" || task === "RETURN_TO_PRODUCT" || task === "FRESHNESS_CHECK" || task === "UNCERTAINTY_CHECK" || task === "EVIDENCE_SUFFICIENCY" || task === "COMPARISON" || (task === "FIELD_LOOKUP" && ui.selectedId)),
  };
}

function familyToTaskType(family) {
  return {
    SCREEN_CONTEXT: "SCREEN_CONTEXT",
    SELECTED_RECORD_CONTEXT: "SELECTED_RECORD_CONTEXT",
    RECORD_DETAILS: "RECORD_DETAILS",
    CONTINUE_CURRENT_REASONING: "CONTINUE_CURRENT_REASONING",
    SCREEN_OR_SITUATION_SUMMARY: "SITUATION",
    CURRENT_SITUATION: "SITUATION",
    STATUS: "SITUATION",
    ISSUE_DIAGNOSTIC: "ISSUE",
    RESOLUTION_PLAN: "RESOLUTION",
    PRIORITY: "PRIORITY",
    NEXT_STEP: "NEXT_ACTION",
    CAUSE_WHY: "CAUSE",
    RISK_RANKING: "RISK",
    FRESHNESS_CHECK: "FRESHNESS_CHECK",
    UNCERTAINTY_CHECK: "UNCERTAINTY_CHECK",
    EVIDENCE_SUFFICIENCY: "EVIDENCE_SUFFICIENCY",
    RETURN_TO_PRODUCT: "RETURN_TO_PRODUCT",
    PLAN_REVIEW: "PLAN_REVIEW",
    RELATION_LOOKUP: "RELATION_LOOKUP",
    COUNT: "COUNT",
    ENTITY_LOOKUP: "FIELD_LOOKUP",
    COMPARISON: "COMPARISON",
    STYLE: "STYLE",
    OFF_TOPIC_SAFE: "OFF_TOPIC",
    GENERAL_KNOWLEDGE: "OFF_TOPIC",
    LIVE_EXTERNAL_DATA: "OFF_TOPIC",
    UNCLEAR_OR_AMBIGUOUS: "CLARIFY",
    UI_GUIDANCE: "SCREEN_CONTEXT",
  }[family] || "FIELD_LOOKUP";
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function buildCanonicalTypedRequest({ shape, family, domains = [], entities = [], requestedFields = [], relationshipIntent = null, comparisonSpec = null, temporalScope = null, requestedStyle = "", clarificationNeed = null, primaryTask = "", styleModifier = "", productContextHint = "", requestedOwnershipScope = null, topicTransition = null, suspendProductContext = false, retrieveProductData = true, scopeTarget = "", requiredOutputSlots = [], requestedSlotLedger = [], presentationOperator = "", presentationItemCount = null, styleTarget = "" } = {}) {
  const taskType = shape?.taskType || familyToTaskType(family);
  const validTaskType = TASK_TYPES.has(taskType) ? taskType : "CLARIFY";
  const request = {
    taskType: validTaskType,
    requestedTasks: [...new Set((Array.isArray(shape?.requestedTasks) ? shape.requestedTasks : [validTaskType])
      .filter((task) => TASK_TYPES.has(task)))],
    domain: shape?.domain || domains[0] || null,
    entityRefs: entities,
    targetEntityType: shape?.targetEntityType || null,
    requestedFields: requestedFields.map((field) => field.key || field),
    relationType: relationshipIntent?.kind || null,
    comparisonEntities: comparisonSpec?.kind === "ENTITY_COMPARISON" ? [comparisonSpec.leftEntity, comparisonSpec.rightEntity].filter(Boolean) : [],
    comparisonDimensions: comparisonSpec?.dimensions || [],
    temporalScope: temporalScope || { mode: "UNKNOWN", explicit: false },
    answerStyle: requestedStyle || "DEFAULT",
    primaryTask: primaryTask || (validTaskType === "STYLE" ? "STYLE" : validTaskType === "OFF_TOPIC" ? "OFF_TOPIC_GENERAL_REQUEST" : validTaskType),
    styleModifier: styleModifier || requestedStyle || null,
    productContextHint: productContextHint || null,
    topicTransition: topicTransition || null,
    suspendProductContext: Boolean(suspendProductContext),
    retrieveProductData: Boolean(retrieveProductData),
    scopeTarget: shape?.scopeTarget || scopeTarget || "CURRENT_SCREEN",
    activeEntitySet: entities,
    requiredOutputSlots: [...new Set([...(shape?.requiredOutputSlots || []), ...requiredOutputSlots])],
    // This ordered ledger is the output contract for mixed scalar/relation/
    // temporal requests.  It is derived before execution and is intentionally
    // immutable with the rest of the typed request.
    requestedSlotLedger: [...new Map((Array.isArray(requestedSlotLedger) ? requestedSlotLedger : [])
      .filter((slot) => slot?.key)
      .map((slot) => [String(slot.key), { key: String(slot.key), kind: String(slot.kind || "TASK"), order: Number(slot.order || 0) }]))
      .values()],
    presentationOperator: shape?.presentationOperator || presentationOperator || null,
    presentationItemCount: shape?.presentationItemCount ?? presentationItemCount ?? null,
    styleTarget: shape?.styleTarget || styleTarget || null,
    productGroundedWritingIntent: Boolean(shape?.productGroundedWritingIntent),
    presentationTask: shape?.presentationTask || null,
    outputAudience: shape?.outputAudience || null,
    generalCreativeIntent: Boolean(shape?.generalCreativeIntent),
    generalInformationIntent: Boolean(shape?.generalInformationIntent),
    requiredOutputTerms: [...new Set((Array.isArray(shape?.requiredOutputTerms) ? shape.requiredOutputTerms : []).map((term) => String(term || "").trim()).filter(Boolean))],
    forbiddenOutputTerms: [...new Set((Array.isArray(shape?.forbiddenOutputTerms) ? shape.forbiddenOutputTerms : []).map((term) => String(term || "").trim()).filter(Boolean))],
    requestedFormat: shape?.requestedFormat || null,
    sentenceCount: Number(shape?.sentenceCount || 0) || null,
    screenContextIntent: Boolean(shape?.screenContextIntent || validTaskType === "SCREEN_CONTEXT"),
    screenDetailIntent: Boolean(shape?.screenDetailIntent),
    selectedRecordIntent: Boolean(shape?.selectedRecordIntent || validTaskType === "SELECTED_RECORD_CONTEXT"),
    combinedContextIntent: Boolean(shape?.combinedContextIntent),
    recordDetailsIntent: Boolean(shape?.recordDetailsIntent || validTaskType === "RECORD_DETAILS"),
    continuationIntent: Boolean(shape?.continuationIntent || validTaskType === "CONTINUE_CURRENT_REASONING"),
    continuationAction: shape?.continuationAction || null,
    returnToProductIntent: Boolean(shape?.returnToProductIntent || validTaskType === "RETURN_TO_PRODUCT"),
    currentAssignmentIntent: Boolean(shape?.currentAssignmentIntent),
    explicitTaskIntent: Boolean(shape?.explicitTaskIntent),
    countTarget: shape?.countTarget || null,
    requestedOwnerScope: requestedOwnershipScope?.requestedOwnerScope || shape?.requestedOwnershipScope?.requestedOwnerScope || null,
    requestedTenantScope: requestedOwnershipScope?.requestedTenantScope || shape?.requestedOwnershipScope?.requestedTenantScope || null,
    requestedSubjectScope: requestedOwnershipScope?.requestedSubjectScope || shape?.requestedOwnershipScope?.requestedSubjectScope || null,
    ownershipRelation: requestedOwnershipScope?.ownershipRelation || shape?.requestedOwnershipScope?.ownershipRelation || null,
    explicitExternalScope: Boolean(requestedOwnershipScope?.explicitExternalScope || shape?.requestedOwnershipScope?.explicitExternalScope),
    ambiguity: clarificationNeed || shape?.ambiguity || null,
    confidence: Number(shape?.confidence || 0) || (clarificationNeed ? 0.55 : 0.7),
    explicitUserTarget: Boolean(shape?.explicitUserTarget),
  };
  return deepFreeze(request);
}

export function validateCanonicalTypedRequest(request) {
  const errors = [];
  if (!TASK_TYPES.has(request?.taskType)) errors.push("UNKNOWN_TASK_TYPE");
  if (request?.taskType === "COUNT" && !request?.countTarget?.targetEntityType) errors.push("COUNT_TARGET_REQUIRED");
  if (request?.taskType === "SELECTED_RECORD_CONTEXT" && !request?.selectedRecordIntent) errors.push("SELECTED_RECORD_INTENT_REQUIRED");
  if (request?.taskType === "SELECTED_RECORD_CONTEXT" && !request?.entityRefs?.some((entity) => entity?.type && (entity?.id || entity?.plate))) errors.push("SELECTED_RECORD_IDENTITY_REQUIRED");
  if (!["CURRENT_SCREEN", "SELECTED_RECORD", "ROLE_GLOBAL", "LAST_SETTLED_RESULT", "NONE"].includes(request?.scopeTarget)) errors.push("UNKNOWN_SCOPE_TARGET");
  if (request?.taskType === "OFF_TOPIC" && request?.retrieveProductData) errors.push("OFF_TOPIC_RETRIEVAL_FORBIDDEN");
  if (request?.generalCreativeIntent && request?.taskType !== "OFF_TOPIC") errors.push("GENERAL_CREATIVE_OFF_TOPIC_REQUIRED");
  if (request?.taskType === "STYLE" && !request?.styleTarget) errors.push("STYLE_TARGET_REQUIRED");
  if (request?.productGroundedWritingIntent && request?.taskType !== "FIELD_LOOKUP") errors.push("GROUNDED_WRITING_FIELD_LOOKUP_REQUIRED");
  if (request?.productGroundedWritingIntent && !request?.requestedFields?.length) errors.push("GROUNDED_WRITING_FACT_REQUIRED");
  return { valid: errors.length === 0, errors };
}

export { TASK_TYPES, normalize, familyToTaskType };
