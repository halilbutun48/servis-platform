import { detectCopilotGuidedTaskEngineProgressCommand } from './copilotGuidedTaskEngine.js';
import { explainTermsFromText } from '../jobGuide/glossary.js';
import { evaluateSemanticFallbackEligibility } from './semanticCandidateFallback.js';
import { buildCanonicalSemanticContext, hasFreshCanonicalSemanticContext, resolveCurrentSelection } from './canonicalSemanticContext.js';
import { extractTurkishSemanticFeatures } from './turkishSemanticFeatures.js';
import {
  composeSemanticEvidence,
  hasStandaloneTeachRequest,
  hasDomainCollectionGuidanceRequest,
  hasOfferCollectionCountRequest,
  hasFinanceSummaryRequest,
} from './semanticEvidenceComposer.js';
import { getSemanticAuthorityMode } from './semanticAuthorityMode.js';
import { hasTurkishDirectionalNavigationPredicate } from './turkishNavigationEvidence.js';
import {
  applySemanticSpecificityEvidence,
  applySemanticSpecificityResolution,
  hasFinancialReadinessEvidence,
  resolveSemanticSpecificity,
} from './semanticSpecificityResolver.js';
import { applyLocalSemanticProposal } from './localSemanticProposal.js';

const TASK_TYPES = new Set([
  "SCREEN_CONTEXT",
  "EXPLAIN_CURRENT_TARGET",
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
  { type: "AGREEMENT", domain: "AGREEMENTS", terms: ["sozlesme", "anlasma", "agreement", "contract", "kontrat"] },
  { type: "VEHICLE", domain: "VEHICLES", terms: ["arac", "araba", "plaka", "vehicle"] },
  { type: "DRIVER", domain: "DRIVERS", terms: ["surucu", "sofor", "driver"] },
  { type: "PERSONNEL", domain: "PERSONNEL", terms: ["personel", "calisan"] },
  { type: "STUDENT", domain: "PERSONNEL", terms: ["ogrenci", "cocuk", "student"] },
  { type: "PARENT", domain: "PERSONNEL", terms: ["veli", "ebeveyn", "parent"] },
  { type: "SERVICE_REQUEST", domain: "SERVICE_REQUESTS", terms: ["servis talebi", "talep", "basvuru"] },
  { type: "ORGANIZATION_PLAN", domain: "ORGANIZATION_PLANS", terms: ["organizasyon plani", "servis plani", "gezi plani"] },
];

// A role name used together with a concrete UI destination is a request for
// that role's surface, not a field name from the currently active workflow.
// Keep this as a semantic reference envelope; authorization is resolved later
// against the authenticated role and canonical screen authority.
const ROLE_UI_REFERENCES = Object.freeze([
  { roleKey: "SUPER_ADMIN", terms: ["super admin", "superadmin", "super_admin", "sistem yoneticisi"] },
  { roleKey: "ROOM", terms: ["room", "oda yoneticisi", "oda yonetimi"] },
  { roleKey: "COMPANY", terms: ["company", "sirket", "firma", "hizmet alan firma"] },
  { roleKey: "SCHOOL", terms: ["school", "okul"] },
  { roleKey: "ORGANIZATION", terms: ["organization", "organizasyon", "kurum"] },
  { roleKey: "DRIVER", terms: ["driver", "surucu", "sofor"] },
  { roleKey: "PERSONEL", terms: ["personel", "calisan"] },
  { roleKey: "PARENT", terms: ["parent", "veli", "ebeveyn"] },
]);

const ROLE_HELP_CONCRETE_ASPECTS = new Set([
  "CAPABILITY", "RESPONSIBILITY", "OWNERSHIP", "DECISION_RESPONSIBILITY",
  "PROCESS_RESPONSIBILITY", "ORIENTATION", "STARTING_GUIDANCE",
]);

export function inferRoleScopedUiTarget(text) {
  const value = normalize(text);
  // A party-qualified note request is a field read on the current product
  // record. Do not let the party label (for example "Hizmet Alan Firma")
  // promote the request to a cross-role screen target before the canonical
  // OFFERS note-field path resolves it.
  if (hasProductNoteLookupCue(value)) return null;
  const surfaceReference = /\b(?:ekran|sayfa|panel|menu|kullanici|yonetim|yetki|rol|bolum|alan)\p{L}*\b/iu.test(value);
  // A process predicate such as "yönetmek" can occur next to a surface noun
  // while the user is asking about responsibility or limits. It is not a
  // directional UI request. Keep role-scoped target promotion bounded to
  // movement/discovery verbs and the existing structural navigation helper.
  const navigationPredicate = hasTurkishDirectionalNavigationPredicate(value)
    || /\b(?:ac(?!ikla)|goster|bul|nerede|neresi|kontrol|incele)\p{L}*\b/iu.test(value);
  const concreteRecordReference = /\b(?:teklif|sozlesme|sözleşme|anlasma|anlaşma|vardiya|sefer|arac|araç|surucu|sürücü|personel|bildirim|finans|hakediş|hakedis)\p{L}*\b/iu.test(value);
  const navigationCue = (surfaceReference || concreteRecordReference) && navigationPredicate;
  if (!navigationCue) return null;
  const reference = ROLE_UI_REFERENCES.find(({ terms }) => terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^\\p{L}])${escaped}(?:$|[^\\p{L}])`, "iu").test(value);
  }));
  if (!reference) return null;
  const explicitlyMissing = /\b(?:hayali|gizli|olmayan|var olmayan|mevcut olmayan|uydurma|sahte)\b/iu.test(value);
  return {
    roleKey: reference.roleKey,
    targetKind: "ROLE_SCOPED_UI",
    explicitlyMissing,
    source: "EXPLICIT_ROLE_UI_REFERENCE",
  };
}

function normalize(value) {
  const normalized = String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
  // Turkish chat input often fuses an action report and its next question
  // ("bastımburası", "tamam bastımsonra") or an ordinal and its question
  // ("1.adımdanapıcam").  Recover word boundaries structurally so the
  // canonical semantic rules can compose the utterance; this is not a list
  // of accepted phrases.
  return normalized
    .replace(/(bastim|tikladim|yaptim|actim)(?=(?:burasi|burada|buras|sonra|simdi|ne|nap|neden))/g, "$1 ")
    .replace(/(tamam)(?=(?:bastim|tikladim|yaptim|actim))/g, "$1 ")
    .replace(/(\d)\.?\s*adim(da|de|dan|den)?\s*(?=(?:nap|ne|nasil|neden|niye|neye))/g, "$1 adim$2 ")
    .replace(/(ilk|birinci|ikinci|ucuncu|dorduncu|besinci|son)adim\s*(?=(?:da|de|dan|den|ne|nap|nasil))/g, "$1 adim ")
    .replace(/\s+/g, " ")
    .trim();
}

// Keep explicit numeric shift references typed even when Turkish places the
// number before the noun (for example, "211 numaralı vardiya").  A bare
// number remains intentionally unresolved; the record type must be present
// in the utterance before authorization can resolve the record.
export function explicitShiftReferenceFromText(value) {
  const text = normalize(value);
  const typedBeforeNumber = text.match(/\b(?:vardiya|sefer|shift)\s*#?\s*(\d+)(?:['’]?\p{L}+)?\b/iu);
  if (typedBeforeNumber) return { type: "SHIFT", id: Number(typedBeforeNumber[1]), source: "EXPLICIT_QUERY" };
  const numberBeforeTyped = text.match(/\b#?(\d+)\s+(?:numarali|numarasi|no)\s+(?:vardiya|sefer|shift)\p{L}*\b/iu);
  if (numberBeforeTyped) return { type: "SHIFT", id: Number(numberBeforeTyped[1]), source: "EXPLICIT_QUERY" };
  return null;
}

// A typed vehicle reference owns the turn even when the live screen carries a
// different selected shift/vehicle.  Bare numbers remain intentionally
// ambiguous; only an explicit vehicle noun may select a vehicle by id.
export function explicitVehicleReferenceFromText(value) {
  const text = normalize(value);
  const typedBeforeNumber = text.match(/\b(?:arac|vehicle)\s*#?\s*(\d+)(?:['’]?\p{L}+)?\b/iu);
  if (typedBeforeNumber) return { type: "VEHICLE", id: Number(typedBeforeNumber[1]), source: "EXPLICIT_QUERY" };
  const numberBeforeTyped = text.match(/\b#?(\d+)\s+(?:numarali|numarasi|no)\s+(?:arac|vehicle)\p{L}*\b/iu);
  if (numberBeforeTyped) return { type: "VEHICLE", id: Number(numberBeforeTyped[1]), source: "EXPLICIT_QUERY" };
  return null;
}

// A typed reconciliation/agreement reference owns the turn even when the
// current screen carries a different selected record. Bare numbers remain
// unresolved until the agreement/mutabakat noun is present.
export function explicitAgreementReferenceFromText(value) {
  const text = normalize(value);
  const typedBeforeNumber = text.match(/\b(?:mutabakat|reconciliation|agreement|sozlesme)\s*#?\s*(\d+)(?:['’]?\p{L}+)?\b/iu);
  if (typedBeforeNumber) return { type: "AGREEMENT", id: Number(typedBeforeNumber[1]), source: "EXPLICIT_QUERY" };
  const numberBeforeTyped = text.match(/\b#?(\d+)\s+(?:numarali|numarasi|no)\s+(?:mutabakat|reconciliation|agreement|sozlesme)\p{L}*\b/iu);
  if (numberBeforeTyped) return { type: "AGREEMENT", id: Number(numberBeforeTyped[1]), source: "EXPLICIT_QUERY" };
  const financialReviewStatus = text.match(/\b#?(\d+)\b.{0,18}\b(?:neden\s+)?inceleme\s+bek(?:liyor|lemede)\b/iu);
  if (financialReviewStatus) return { type: "AGREEMENT", id: Number(financialReviewStatus[1]), source: "EXPLICIT_QUERY" };
  return null;
}

// A number with a Turkish case suffix (for example, "211'e" or "211'in")
// is not a record type by itself. It may inherit the type of the current
// authorized selection, but on a surface without a typed selection it must
// remain unresolved instead of borrowing a stale offer/shift from history.
function contextualNumericRecordReferenceFromText(value, ui = {}) {
  const text = normalize(value);
  const numericCase = text.match(/\b#?(\d+)(?:['’]?(?:ye|ya|e|a|nin|nın|nun|nün|in|ın|un|ün|den|dan|ten|tan|de|da))\b/iu);
  if (!numericCase) return null;
  if (explicitShiftReferenceFromText(text)
    || explicitAgreementReferenceFromText(text)
    || /\b(?:teklif|offer|rfq)\s*#?\s*\d+\b/iu.test(text)) return null;
  const recordCue = hasValueLookupCue(text)
    || hasRecordDetailsCue(text)
    || /\b(?:teklif|karsi\s+teklif|kabul\s+edilen|kabul|nihai|son\s+fiyat|ticari|fiyat|tutar|bedel|para|miktar|durum|detay|ayrinti|anlat|acikla)\p{L}*/iu.test(text);
  if (!recordCue) return null;
  const selectedType = ui?.selectionSource === "SURFACE_CONTEXT"
    ? typeForSelected(ui?.selectedType)
    : "";
  const typedSelection = new Set(["SHIFT", "OFFER", "AGREEMENT", "VEHICLE", "DRIVER", "PERSONNEL", "STUDENT", "PARENT"]);
  if (!typedSelection.has(selectedType)) {
    return {
      ambiguity: "NUMERIC_REFERENT_TYPE_UNRESOLVED",
      id: Number(numericCase[1]),
    };
  }
  return {
    reference: { type: selectedType, id: Number(numericCase[1]), source: "EXPLICIT_QUERY" },
  };
}

function editDistance(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    for (let column = 0; column <= b.length; column += 1) previous[column] = current[column];
  }
  return previous[b.length];
}

function hasApproximateProductSubject(value) {
  const tokens = normalize(value).split(/\s+/u).map((token) => token.replace(/[^\p{L}\p{N}]/gu, ''));
  return tokens.some((token) => ['program', 'uygulama', 'platform', 'sistem'].some((term) => (
    token.startsWith(term)
      || (token.length >= term.length - 2 && editDistance(token, term) <= 2)
  )));
}

function hasExplicitProductLevelHelpCue(value) {
  const text = normalize(value);
  return /\b(?:seferpakt|program|uygulama|platform|sistem)\p{L}*\b/iu.test(text)
    && /\b(?:kullan\p{L}*|ogret\p{L}*|öğret\p{L}*|anlat\p{L}*|acikla\p{L}*|açıkla\p{L}*|ne\s+ise\s+yar\p{L}*|neler\s+yapabil\p{L}*)\b/iu.test(text)
    && !/\b(?:yetki|yapabil\p{L}*|sorumluluk|gorev|işlem|islem|hangi\s+is\p{L}*)\b/iu.test(text);
}

// An access-boundary question is a semantic family, not a phrase-specific
// answer override.  On the KVKK surface it must stay grounded in the current
// authorized visibility state instead of being downgraded to role-global help.
function hasAccessBoundaryQuestion(value) {
  const text = normalize(value);
  const accessTerm = /\b(?:erisim|izin|yetki)\p{L}*\b/iu.test(text);
  const boundaryTerm = /\b(?:kapali|kisitli|engel\p{L}*|gosterilmiyor|gorunmuyor|neden|kim|hangi)\p{L}*\b/iu.test(text);
  return accessTerm && boundaryTerm;
}

function hasKvkkAccessBoundaryQuestion(value) {
  const text = normalize(value);
  const visibilityTerm = /\b(?:kvkk|gizlilik|gorunurluk|gorunur)\p{L}*\b/iu.test(text);
  const boundaryTerm = /\b(?:kapali|kisitli|engel\p{L}*|gosterilmiyor|gorunmuyor|neden|kim|hangi)\p{L}*\b/iu.test(text);
  return hasAccessBoundaryQuestion(text) || (visibilityTerm && boundaryTerm);
}

// Role help is a compositional semantic family, not a growing list of speech
// act functions. These dimensions are evidence only; the canonical task/scope
// pipeline remains the sole semantic authority. A role aspect and an
// explanatory/orientational request mode must agree, and concrete entity or
// UI actions veto role-help interpretation.
const ROLE_HELP_ASPECTS = Object.freeze({
  CAPABILITY: /\b(?:yetki|yapabil|yonet|yurut|islev|becer|manage|handle)\p{L}*\b/iu,
  // Match the role-work concept, not every word beginning with `is`.
  // `isleyis` / `isleyisini` is a screen-behaviour term and must not become
  // role responsibility evidence merely because it shares the `is` stem.
  RESPONSIBILITY: /\b(?:sorumluluk|gorev|faaliyet|calisma)\p{L}*\b|\b(?:is(?:ler(?:i|im|in|ini|imiz|iniz|leri)?|im|in|imiz|iniz|leri)?|gorev(?:ler|im|in|imiz|iniz|leri)?|faaliyet(?:ler|im|in|imiz|iniz|leri)?|calisma(?:lar|m|n|miz|niz|lari)?)\b/iu,
  BOUNDARY: /\b(?:sinir|kapsam|limit|cerceve|dahil|ait|haric|disinda|uzerime)\p{L}*\b/iu,
  // Keep stems that are semantically stable under Turkish inflection. In
  // particular, `anla` would consume `anlat...` and `bil` would consume
  // `bilgi...`; neither should turn a record/screen explanation into role
  // help merely because it shares a lexical prefix.
  ORIENTATION: /\b(?:rol|baslangic|basla|nereden|ilk|once|ogren|kavra|tani|yol|adim)\p{L}*\b/iu,
});

const ROLE_HELP_CONTEXTS = new Set([
  "COMPANY", "ROOM", "SCHOOL", "ORGANIZATION", "DRIVER", "PERSONEL", "PARENT", "SUPER_ADMIN",
]);

function collectRoleHelpSemanticEvidence(value, { roleContext = "" } = {}) {
  const text = normalize(value);
  if (!text) return { isRoleHelp: false, aspects: [], evidence: [] };

  const normalizedRoleContext = String(roleContext || "").trim().toUpperCase();
  const roleContextAvailable = ROLE_HELP_CONTEXTS.has(normalizedRoleContext);
  const explicitRoleReference = /\b(?:company|room|driver|personel|parent|school|organization|super\s*admin|superadmin|sistem\s+yoneticisi|yonetici|sirket|firma|tasimacilik|surucu|veli|okul|organizasyon|oda|rol|kullanici|hesa[pb]|taraf)\p{L}*\b/iu.test(text);
  const aspects = Object.entries(ROLE_HELP_ASPECTS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([aspect]) => aspect);
  const hasRoleAspect = aspects.length > 0;
  const explanationMode = /\b(?:ne|neler|nedir|nasil|hangi|nereden|nerede|once|ilk|anlat|acikla|ogren|anla|kavra|tani|bil|gerek|sorumlu|ait|dahil)\p{L}*\b/iu.test(text);
  const concreteEntity = explicitObjectClassFromText(text);
  // A role noun can also be a supported product object (for example
  // `sürücü` or `personel`). It is a subject rather than a requested record
  // when the utterance frames it with `olarak`, `rol`, `taraf`, `kullanıcı`, or
  // `hesap`; only the latter should veto role-level help.
  const roleEntityAsSubject = Boolean(
    concreteEntity
    && explicitRoleReference
    && /\b(?:olarak|rol|taraf|kullanici|hesa[pb])\p{L}*\b/iu.test(text),
  );
  const concreteEntityTarget = Boolean(concreteEntity && !roleEntityAsSubject);
  const concreteProductFieldLookup = hasProductNoteLookupCue(text);
  const explicitSurfaceExplanation = hasExplicitCurrentScreenPurposeCue(text)
    || hasNamedSurfaceExplanationCue(text);
  // `nerede` is an explanatory boundary question in forms such as
  // "yetkim nerede biter". Treat it as navigation only when an actual
  // show/open/move predicate is present.
  const concreteAction = /\b(?:goruntule|listele|incele|goster|ac(?!ikla)|git|gidelim|gec|ulas|ilerle)\p{L}*\b/iu.test(text);
  const concreteUiTarget = /\b(?:bu|su|mevcut|buradaki|burada)\s+(?:ekran|sayfa|panel|menu|alan|bolum)\p{L}*\b/iu.test(text)
    && (explicitSurfaceExplanation || concreteAction);
  const situatedCurrentSurfaceHelp = /\b(?:burada|burda|bu\s+ekranda|bu\s+sayfada)\b.{0,48}\b(?:ne\s+yap\p{L}*|nereden\s+basla\p{L}*|sorun\p{L}*|problem\p{L}*|dikkat\p{L}*|bakmam\b|yard[iı]m\s+et|ad[iı]m\s+ad[iı]m)\b/iu.test(text);
  const specificTask = /\b(?:yeni|olustur|baslat|planla|duzenle|ayarla|sil|gonder|dagit|icra)\p{L}*\b/iu.test(text);
  const roleSubject = explicitRoleReference || (roleContextAvailable && hasRoleAspect);
  const explicitCurrentSurfaceAnchor = /\b(?:ekran|sayfa|panel|menu|bolum)\p{L}*\b/iu.test(text);
  const roleContextOnlySurfaceExplanation = roleContextAvailable
    && !explicitRoleReference
    && explicitCurrentSurfaceAnchor
    && explanationMode
    && explicitSurfaceExplanation;
  const isRoleHelp = Boolean(
    roleSubject
    && hasRoleAspect
    && explanationMode
    && !roleContextOnlySurfaceExplanation
    && !situatedCurrentSurfaceHelp
    && !concreteEntityTarget
    && !concreteProductFieldLookup
    && !concreteUiTarget
    && !concreteAction
    && !specificTask
    // Explicit canonical operations (for example risk analysis) own the
    // utterance before broad role-orientation evidence can route it to the
    // role-help composer.  Reuse the shared operation detector rather than
    // creating a second phrase-level classifier.
    && inferExplicitOperations(text).length === 0,
  );

  return {
    isRoleHelp,
    roleContext: normalizedRoleContext || null,
    aspects,
    requestMode: explanationMode ? "EXPLANATION_ORIENTATION" : null,
    evidence: [
      ...(roleSubject ? ["ROLE_SUBJECT"] : []),
      ...(aspects.length ? aspects.map((aspect) => `ROLE_ASPECT_${aspect}`) : []),
      ...(explanationMode ? ["ROLE_HELP_EXPLANATION_MODE"] : []),
      ...(concreteEntityTarget ? [`CONCRETE_ENTITY_${concreteEntity}`] : []),
      ...(concreteUiTarget ? ["CONCRETE_UI_TARGET"] : []),
      ...(concreteAction ? ["CONCRETE_VIEW_OR_NAVIGATION_ACTION"] : []),
      ...(specificTask ? ["CONCRETE_BUSINESS_TASK"] : []),
    ],
  };
}

// This is the canonical structural boundary for role-aware product help. It
// accepts varied capability, responsibility, boundary, limitation, and
// orientation constructions through one evidence composition, grounded by an
// explicit role reference or the authenticated role context. Conversation
// routing reuses this predicate; it does not establish a second authority.
export function isExplicitRoleHelpIntent(value, { roleContext = "" } = {}) {
  return collectRoleHelpSemanticEvidence(value, { roleContext }).isRoleHelp;
}

export function isGenericProductHelpIntent(value, { roleContext = "" } = {}) {
  const text = normalize(value);
  if (!text) return false;
  if (hasProductNoteLookupCue(text)) return false;
  const productUsageOrientation = /\b(?:seferpakt|program|uygulama|platform|sistem)\p{L}*\b/iu.test(text)
    && /\b(?:kullan\p{L}*|ogret\p{L}*|öğret\p{L}*|anlat\p{L}*|acikla\p{L}*|açıkla\p{L}*)\b/iu.test(text)
    && !/\b(?:yetki|yapabil\p{L}*|sorumluluk|gorev|işlem|islem|hangi\s+is\p{L}*)\b/iu.test(text);
  if (isExplicitRoleHelpIntent(text, { roleContext }) && !productUsageOrientation) return false;
  const genericProductSubject = /\bseferpakt\p{L}*\b|\b(?:bu\s+)?(?:program|uygulama|platform|sistem)\p{L}*\b/iu.test(text)
    || hasApproximateProductSubject(text);
  const namedProductSubject = /\b(?:vardiya|sefer|shift|teklif|servis|organizasyon|plan|personel|ogrenci|cocuk|veli|yonetim|operasyon)\p{L}*\b/iu.test(text);
  // Product/role capability questions are a structural speech-act family.
  // Keep them global even when the active UI has a selected record; the
  // selected record must not turn "which work can I handle here?" into a
  // scalar field lookup. Concrete entity and screen-purpose vetoes below
  // still keep record and surface questions in their own canonical lanes.
  const productCapabilityRequest = /\b(?:hangi|neler|ne)\b(?:\s+\p{L}+){0,7}\s+(?:yapabil|ustlen|ilgilen|yurut|yonet|gerceklestir|gorev|islem|sorumluluk|faaliyet|calisma)\p{L}*\b/iu.test(text);
  const overviewRequest = /\b(?:bu\s+)?(?:program|uygulama|platform|sistem)\p{L}*\s+ne\b|\bne\s+(?:ise\s+yar\p{L}*|yapar|yapabil\p{L}*)\b|\bnedir\b|\bne\s+icin\s+kullan\p{L}*\b|\b(?:nasil\s+)?kullan\p{L}*\b|\b(?:nasil\s+)?ogret\p{L}*\b|\b(?:nereden\s+)?basla\p{L}*\b|\bamac\p{L}*\s+ne\b|\bgenel\s+olarak\b|\bneler\s+yap\p{L}*\b|\banlat\p{L}*\b/iu.test(text)
    || productCapabilityRequest;
  const educationRequest = /\b(?:bastan|basindan|ogret\p{L}*|anlat\p{L}*|acikla\p{L}*|kullanmay\p{L}*|hazirlayacag\p{L}*|hazirlamay\p{L}*|basla\p{L}*|goster\p{L}*)\b/iu.test(text)
    && !/\b(?:bu|su)\s+(?:ekran|sayfa|panel)\p{L}*\b|\b(?:burada|burda|burasi)\b/iu.test(text)
    && !/\b(?:durum|status|statu|risk|tarih|saat|konum|rota|durak|tutar|bedel|kayit|kayd)\p{L}*\b/iu.test(text);
  const namedWorkflowGuidance = namedProductSubject
    && /\b(?:goster\p{L}*|gotur\p{L}*|nerede\p{L}*|nerde\p{L}*|ekle\p{L}*|olustur\p{L}*|baslat\p{L}*|kur\p{L}*|ayar\p{L}*|ac(?!ikla)\p{L}*|git\p{L}*|gidelim|kontrol\s+edelim)\b/iu.test(text);
  const bareOnboardingRequest = /^(?:nereden\s+baslayay\p{L}*|ilk\s+adim\s+ne(?:dir)?)\??$/iu.test(text);
  const bareUsageRequest = /^(?:bana\s+)?(?:nasil|ne\s+sekilde)\s+(?:kullan|basla|ilerle)\p{L}*\??$/iu.test(text);
  const firstTimeOnboarding = /\b(?:ilk\s+kez|ilk\s+defa|yeniyim|yeni\s+baslad(?:ı|i)m|daha\s+once\s+kullanmad(?:ı|i)m)\b.{0,80}\b(?:baslang\p{L}*|yol\s+haritas\p{L}*|adim\s+adim|goster\p{L}*|anlat\p{L}*|ogret\p{L}*|kullan\p{L}*|basla\p{L}*)\b/iu.test(text);
  const onboardingFrame = /\b(?:baslang\p{L}*|yol\s+haritas\p{L}*|adim\s+adim)\b.{0,50}\b(?:goster\p{L}*|anlat\p{L}*|ogret\p{L}*|kullan\p{L}*|basla\p{L}*)\b/iu.test(text);
  const assistantCapabilityRequest = /\b(?:sefer\s+abi|asistan)\b.{0,70}\b(?:hangi\s+konularda|neler(?:de)?\s+yapabil|ne(?:ler)?\s+yapabil|yardim\s+edebil|yol\s+goster|destek\s+olabil)\b/iu.test(text);
  const genericHelpRequest = /\b(?:bana\s+)?yardim\s+et\b/iu.test(text)
    || /\b(?:nerelere|nelere|neye)\s+bak(?:mam|mal[ıi]y[ıi]m|ay[ıi]m)?\s+(?:gerek|gerekiyor|laz[ıi]m)\b/iu.test(text);
  // Abstract orientation is a product-help speech act even when the user
  // does not name the product as "program" or "platform".  The frame is
  // intentionally compositional: a broad product/role area, an interrogative
  // orientation target, and a learning/understanding predicate.  It is
  // excluded for concrete screen/entity requests below.
  const abstractOrientationFrame = (/\b(?:hangi|neler|nereden)\b(?:\s+\p{L}+){0,7}\s+(?:ogren|anla|kavra|bil|tanim|basla)\p{L}*\b/iu.test(text)
    || /\b(?:once|ilk)\b(?:\s+\p{L}+){0,5}\s+(?:hangi|neler|nereden)\b(?:\s+\p{L}+){0,7}\s+(?:ogren|anla|kavra|bil|tanim|basla)\p{L}*\b/iu.test(text))
    && /\b(?:sirket|firma|hesap|rol|alan|bolum|gorev|islev|sistem|uygulama|platform|program)\p{L}*\b/iu.test(text);
  // A locative surface noun alone is not a current-screen reference. A
  // surface used as the grammatical subject/genitive of an explanation is an
  // explicit surface-purpose request; retain that existing screen contract
  // while keeping process/role guidance beside a surface GENERAL_INFORMATION.
  const surfaceSubjectExplanation = /\b(?:ekran|sayfa|panel|menu|bolum)\p{L}*(?:in|nin|un|nun)\b.{0,64}\b(?:anlat|acikla|ogren|nasil\s+calis|ne\s+ise\s+yar)\p{L}*\b/iu.test(text)
    || hasNamedSurfaceExplanationCue(text);
  const explicitSurfaceExplanation = surfaceSubjectExplanation
    || hasExplicitCurrentScreenPurposeCue(text)
    || (hasScreenDeicticCue(text)
      && /\b(?:anlat|acikla|ogren|nasil\s+calis|ne\s+ise\s+yar)\p{L}*\b/iu.test(text));
  const explicitProductOperation = namedProductSubject
    && (hasExplicitSurfaceViewVerb(text) || hasExplicitSurfaceNavigationVerb(text));
  const concreteEntityExplanation = /\b(?:bu|su|secil(?:i|en)?|aktif|mevcut|baktigim)\s+(?:vardiya|sefer|teklif|sozlesme|anlasma|arac|plaka|surucu|sofor|personel|kayit|kart)\p{L}*\b(?:.{0,32})\b(?:detay|ayrinti|durum|neden|anlat|acikla)\p{L}*\b/iu.test(text)
    || /\b(?:vardiyanin|seferin|teklifin|sozlesmenin|anlasmanin|aracin|surucunun|soforun|personelin|kaydin|kartin)\b(?:.{0,24})\b(?:detay|ayrinti|durum|neden|anlat|acikla)\p{L}*\b/iu.test(text);
  return assistantCapabilityRequest || genericHelpRequest || (!namedWorkflowGuidance && ((genericProductSubject && overviewRequest) || (namedProductSubject && educationRequest) || abstractOrientationFrame || bareOnboardingRequest || bareUsageRequest || firstTimeOnboarding || onboardingFrame)
    && !explicitSurfaceExplanation
    && !concreteEntityExplanation
    && !explicitProductOperation);
}

// Canonical product truth for the COMPANY guided new-plan flow.  The model
// is carried by semantic plans and active task state; UI target resolution
// still proves the concrete current control before any guidance is emitted.
export const COMPANY_GUIDED_NEW_PLAN_WORKFLOW = Object.freeze({
  id: "COMPANY_GUIDED_NEW_PLAN",
  goal: "CREATE_SHIFT",
  steps: Object.freeze([
    Object.freeze({
      ordinal: 1,
      key: "COMPANY_LOCATION",
      label: "Şirket konumu",
      what: "Planın başlangıç şirket konumunu belirlemek.",
      purpose: "Planın başlangıç konumunu belirlemek.",
      why: "Rota, durak ve süre hesaplarının doğru başlangıç noktasına bağlanması gerekir.",
      action: "Konumumu al ile mevcut konumu kullan veya adresi yazıp Adresten bul ile doğrula.",
      controls: Object.freeze(["Konumumu al", "Adresten bul", "İleri"]),
      preconditions: Object.freeze(["Yetkili COMPANY oturumu", "Konum veya adres bilgisi"]),
      completion: "Şirket konumu doğrulanıp İleri ile sonraki adıma geçilir.",
      nextStep: "Plan paketi (2. adım)",
      safeAction: "Sefer Abi hedefi açıklar ve görünür kontrolü gösterebilir; kullanıcı yerine konum kaydetmez.",
      businessWriteBoundary: "Konum kaydetme ve ilerleme kullanıcı kontrolündedir; Sefer Abi iş kaydı yazmaz.",
      nextOrdinal: 2,
    }),
    Object.freeze({
      ordinal: 2,
      key: "PLAN_PACKAGE",
      label: "Plan paketi",
      what: "Vardiya planının paket, tarih, gün ve saat seçeneklerini belirlemek.",
      purpose: "Planın gün, saat ve paket seçeneklerini belirlemek.",
      why: "Taslak vardiya sayısı ve çalışma takvimi bu seçimlerden türetilir.",
      action: "Plan paketini, başlangıç tarihini ve uygun gün seçeneklerini gözden geçir.",
      controls: Object.freeze(["Plan paketi", "Tarih ve gün seçenekleri", "Taslak vardiya oluştur"]),
      preconditions: Object.freeze(["Şirket konumu doğrulanmış olmalı", "Yetkili planlama ekranı"]),
      completion: "Paket ve tarih bilgileri tamamlanınca taslak vardiyalar oluşturulur.",
      nextStep: "Personel + Durak (3. adım)",
      safeAction: "Sefer Abi seçenekleri ve hedefi gösterir; paket seçmez veya taslak oluşturmaz.",
      businessWriteBoundary: "Taslak vardiya oluşturma ve teklif gönderme işlemlerini Sefer Abi yürütmez.",
      nextOrdinal: 3,
    }),
    Object.freeze({
      ordinal: 3,
      key: "PERSONNEL_STOPS",
      label: "Personel + Durak",
      what: "Personel ve durak bilgilerini rota için eşleştirmek; kişi ekleme veya toplu içe aktarma bilgilerini doğrulamak.",
      purpose: "Kişileri, durakları ve konum doğrulamasını tamamlamak.",
      why: "Servis güzergâhı ve kişi erişimi ancak yetkili personel ile duraklar doğrulanınca anlamlı olur.",
      action: "Önce Ad Soyad ve Adres alanlarını doldurup Adresten Bul ile adresi doğrula; sonra Ekle veya Excel/CSV içe aktarma ile kişileri ekle. Kişi ve adres verisi hazır olduğunda Durakları Hazırla kullan; gerekirse 1. Durak Üret, ardından 2. Vardiyadan Durakları Çek adımlarını ayrı ayrı çalıştır ve ancak sonra Önizle'ye geç.",
      controls: Object.freeze(["Ad Soyad", "Adres", "Adresten Bul", "Ekle", "Excel/CSV içe aktarma", "Durakları Hazırla", "1. Durak Üret", "2. Vardiyadan Durakları Çek", "Önizle", "Adres Temizle ve İlerle"]),
      preconditions: Object.freeze(["Taslak plan ve uygun günler hazır olmalı", "Yetkili personel/durak kapsamı", "Kişi adresleri veya koordinatları doğrulanabilir olmalı", "Durak hazırlama için kişi verisi hazır olmalı"]),
      completion: "Önce kişi ve adres satırları doğrulanır; ardından Durakları Hazırla veya 1. Durak Üret → 2. Vardiyadan Durakları Çek tamamlanır. Bu kanıtlar görünmeden Önizle'ye geçildiği varsayılmaz.",
      nextStep: "Durak hazırlama → 1. Durak Üret → 2. Vardiyadan Durakları Çek → Ön izleme + teklif (4. adım)",
      proceduralOrder: Object.freeze(["Personel/adres hazırla", "Durakları Hazırla", "1. Durak Üret", "2. Vardiyadan Durakları Çek", "Önizle"]),
      alternativePath: "Durakları Hazırla önerilen birleşik yoldur; desteklenen ayrı yol 1. Durak Üret → 2. Vardiyadan Durakları Çek sırasıdır.",
      completionEvidence: Object.freeze(["Kişi satırı görünür", "Adres veya koordinat geçerli", "Durakları Hazırla tamamlandı veya 1. Durak Üret ve 2. Vardiyadan Durakları Çek tamamlandı", "Önizle görünür ve gerçek UI hazır" ]),
      stateTransitions: Object.freeze(["PERSONNEL_READY", "STOPS_PREPARED", "STOPS_GENERATED", "SHIFT_STOPS_IMPORTED", "PREVIEW_READY"]),
      safeAction: "Sefer Abi görünür personel ekleme, içe aktarma ve durak hedefini açıklar; seçimleri, dosya yüklemeyi veya adresleri kullanıcı yerine çalıştırmaz.",
      businessWriteBoundary: "Personel, durak ve adres değişikliklerini Sefer Abi uygulamaz.",
      capabilityGuides: Object.freeze([
        Object.freeze({
          intent: "ADD_PERSONNEL",
          label: "Personel ekleme",
          what: "Yeni bir personel satırını plana eklemek.",
          action: "Ad Soyad ve Adres alanlarını doldur; konumu Adresten Bul ile doğruladıktan sonra Ekle düğmesini kullanıcı olarak çalıştır.",
          controls: Object.freeze(["Ad Soyad", "Adres", "Adresten Bul", "Ekle"]),
          precondition: "Yetkili kişi kapsamı ve kişi için ad ile adres veya koordinat bulunmalı.",
          completion: "Kişi satırı listede görünür ve adres/koordinat doğrulaması geçerli olur.",
          safeAction: "Sefer Abi yalnızca bu alanları ve Ekle hedefini gösterir; Ekle işlemini kullanıcı yerine çalıştırmaz.",
          businessWriteBoundary: "Ekle düğmesi iş verisi yazabilir; kullanıcı onayı olmadan çalıştırılmaz.",
        }),
        Object.freeze({
          intent: "ENTER_ADDRESS",
          label: "Adres girme ve doğrulama",
          what: "Personel satırının adresini girmek ve gerçek konumunu doğrulamak.",
          action: "Adres alanını doldur; gerekiyorsa Adresten Bul ile konumu doğrula, sonra kişi ekleme akışına dön.",
          controls: Object.freeze(["Adres", "Adresten Bul", "Ekle"]),
          precondition: "Yetkili COMPANY Step-3 yüzeyi ve kişi satırı için adres bilgisi bulunmalı.",
          completion: "Adres alanı ve doğrulanmış koordinat kişi satırında görünür; tek başına kullanıcı beyanı tamamlanma kanıtı değildir.",
          safeAction: "Sefer Abi adresi okuyup kaydetmez; yalnızca görünür alanı ve doğrulama hedefini gösterir.",
          businessWriteBoundary: "Adres ve kişi kaydı yazımı kullanıcı etkileşimidir; Sefer Abi çalıştırmaz.",
        }),
        Object.freeze({
          intent: "IMPORT_PERSONNEL",
          label: "Excel/CSV içe aktarma",
          what: "Birden fazla personel satırını dosyadan plana almak.",
          action: "Excel/CSV içe aktarma alanını aç; dosya ve içe aktarma modunu seç, sonra satır/adres doğrulamasını kontrol et.",
          controls: Object.freeze(["Excel/CSV içe aktarma", "İçe aktarma modu", "Dosya seç"]),
          precondition: "Yetkili kişi kapsamı ve kabul edilen bir CSV/XLSX dosyası bulunmalı.",
          completion: "İçe aktarılan satırlar listede görünür ve geçersiz adres/koordinat kalmaz.",
          safeAction: "Sefer Abi içe aktarma hedefini açıklar; dosya seçmez, yüklemez veya kayıt yazmaz.",
          businessWriteBoundary: "Dosya içe aktarma toplu iş verisi yazabilir; kullanıcı onayı olmadan çalıştırılmaz.",
        }),
        Object.freeze({
          intent: "PREPARE_STOPS",
          label: "Durakları hazırlama",
          what: "Doğrulanmış kişi ve adreslerden durak hazırlamak.",
          action: "Önerilen birleşik yol olarak Durakları Hazırla'yı çalıştır; ayrı ilerleyeceksen 1. Durak Üret ve ardından 2. Vardiyadan Durakları Çek adımlarını izle.",
          controls: Object.freeze(["Durakları Hazırla", "1. Durak Üret", "2. Vardiyadan Durakları Çek"]),
          precondition: "Kişi satırlarında geçerli adres veya koordinat bulunmalı.",
          completion: "Durak üretimi ve vardiyadan durakları çekme sonucu gerçek UI'da görünmeden hazır kabul edilmez.",
          safeAction: "Sefer Abi yalnızca gerçek durak hazırlama hedefini gösterir; üretim veya veri yazımı çalıştırmaz.",
          businessWriteBoundary: "Durak üretimi iş verisini değiştirebilir; kullanıcı onayı olmadan çalıştırılmaz.",
        }),
      ]),
      nextOrdinal: 4,
    }),
    Object.freeze({
      ordinal: 4,
      key: "PREVIEW_AND_OFFER",
      label: "Ön izleme + teklif",
      what: "Taslak vardiyaları, rota hazırlığını ve teklif kapsamını gözden geçirmek.",
      purpose: "Taslak vardiyaları, rota hazırlığını ve teklif kapsamını gözden geçirmek.",
      why: "Tekliften önce kapsam, rota ve eksik kanıtlar insan tarafından doğrulanmalıdır.",
      action: "Ön izlemeyi ve rota sırasını kontrol et; teklif kapsamını insan onayına bırak.",
      controls: Object.freeze(["Ön izleme", "Rota sırasını iyileştir", "Teklif gönder"]),
      preconditions: Object.freeze(["Personel ve durak bilgileri doğrulanmış olmalı", "Taslak vardiyalar hazır olmalı"]),
      completion: "Ön izleme ve gerekli insan onayı tamamlanmadan teklif gönderilmez.",
      nextStep: "İnsan onayı ve teklif değerlendirmesi",
      safeAction: "Sefer Abi ön izleme ve teklif hedefini açıklayabilir; teklif göndermez veya onaylamaz.",
      businessWriteBoundary: "Teklif gönderme ve onay işlemleri iş yazımıdır; Sefer Abi bunları çalıştırmaz.",
      nextOrdinal: null,
    }),
  ]),
});

function workflowStepReferenceFromText(value) {
  const text = normalize(value);
  const numeric = text.match(/(?:^|\s)([1-4])\s*adim(?:da|de|dan|den)?\b/iu);
  const named = [
    ["ilk", 1], ["birinci", 1], ["ikinci", 2], ["ucuncu", 3], ["dorduncu", 4], ["son", 4],
  ].find(([term]) => new RegExp(`(?:^|\\s)${term}\\s+adim(?:da|de|dan|den)?\\b`, "iu").test(text));
  const ordinal = numeric ? Number(numeric[1]) : named?.[1] || null;
  if (!ordinal) return null;
  const step = COMPANY_GUIDED_NEW_PLAN_WORKFLOW.steps.find((item) => item.ordinal === ordinal);
  return step ? { ordinal: step.ordinal, key: step.key, label: step.label } : null;
}

function activeWorkflowPlan(conversationState) {
  const candidates = [
    conversationState?.activeGuidedTask?.semanticPlan,
    conversationState?.productContext?.semanticPlan,
    conversationState?.lastSettledResult?.semanticPlan,
    conversationState?.authorizedProductContext?.semanticPlan,
  ];
  const supportedWorkflowIntents = new Set(["CREATE_SHIFT", "OPEN_SHIFT_SURFACE", "OPEN_OFFER_SURFACE", "OPEN_MAP_SURFACE", "OPEN_REPORTS_SURFACE"]);
  return candidates.find((plan) => (
    supportedWorkflowIntents.has(String(plan?.workflowIntent || "").toUpperCase())
    || supportedWorkflowIntents.has(String(plan?.workflowModel?.goal || "").toUpperCase())
  )) || null;
}

function hasRoomCapabilityBoundaryContinuation({ message, user, screenContext, conversationState } = {}) {
  if (String(user?.role || "").toUpperCase() !== "ROOM") return false;
  if (!/\/room\/shifts\b/iu.test(String(screenContext?.path || ""))) return false;
  const text = normalize(message);
  if (!hasStepByStepTeachingCue(text)) return false;
  const plans = [
    conversationState?.activeGuidedTask?.semanticPlan,
    conversationState?.productContext?.semanticPlan,
    conversationState?.lastSettledResult?.semanticPlan,
    conversationState?.authorizedProductContext?.semanticPlan,
    conversationState?.lastProductSemanticPlan,
    conversationState?.lastSemanticPlan,
  ];
  const boundaryPlan = plans.find((plan) => (
    String(plan?.roleCapabilityBoundary || "").toUpperCase() === "ROOM_CREATE_UNSUPPORTED"
    && String(plan?.workflowIntent || "").toUpperCase() === "OPEN_SHIFT_SURFACE"
  ));
  if (!boundaryPlan) return false;
  return hasStepByStepTeachingCue(text);
}

function liveWorkflowStepReference(ui) {
  const workflowState = ui?.workflowState;
  if (!workflowState || workflowState.workflowId !== COMPANY_GUIDED_NEW_PLAN_WORKFLOW.id) return null;
  const ordinal = Number(workflowState.activeStepOrdinal || 0);
  if (!Number.isInteger(ordinal) || ordinal < 1) return null;
  const step = COMPANY_GUIDED_NEW_PLAN_WORKFLOW.steps.find((item) => item.ordinal === ordinal);
  return step ? { ordinal: step.ordinal, key: step.key, label: step.label } : null;
}

// A saved-draft chooser is a foreground live surface, not a workflow step.
// Require three independent current-state signals: the server-backed chooser
// state, its canonical resume action, and the modal identity captured from
// the authorized UI. This recognizes a live surface; it neither authorizes
// an action nor substitutes a similarly labelled element.
function liveGuidedDraftChooserState(ui) {
  if (!ui || ui.workflowState?.workflowId === COMPANY_GUIDED_NEW_PLAN_WORKFLOW.id) return null;
  const availability = ui.guidedDraftAvailability && typeof ui.guidedDraftAvailability === 'object'
    ? ui.guidedDraftAvailability
    : null;
  const draftState = String(availability?.state || '').trim().toUpperCase();
  const draftCount = Math.max(0, Number(availability?.count || 0) || 0);
  if (ui.surfaceRole !== 'COMPANY' || draftState !== 'SAVED_DRAFT_CHOOSER' || draftCount < 1) return null;
  const foregroundSurface = ui.foregroundSurface && typeof ui.foregroundSurface === 'object'
    ? ui.foregroundSurface
    : null;
  const foregroundSurfaceKey = String(foregroundSurface?.key || '').trim();
  const foregroundSurfaceKind = String(foregroundSurface?.kind || '').trim().toUpperCase();
  const resumeTarget = (Array.isArray(ui.visibleTargets) ? ui.visibleTargets : []).find((item) => (
    item?.identitySource === 'CANONICAL'
      && !item?.disabled
      && String(item?.targetKey || '').trim() === 'company:guided-draft-resume'
  ));
  if (foregroundSurfaceKey !== 'company:guided-draft-chooser' || foregroundSurfaceKind !== 'SAVED_DRAFT_CHOOSER' || !resumeTarget) return null;
  return {
    kind: 'SAVED_DRAFT_CHOOSER',
    title: 'Kayıtlı taslaklar',
    draftAvailability: {
      state: draftState,
      count: draftCount,
      maxResumeStep: Number(availability?.maxResumeStep || 0) || null,
      source: String(availability?.source || 'SERVER_GUIDED_DRAFTS').trim(),
    },
  };
}

// A canonical guided-plan entry control is live product evidence that the
// wizard has not been opened yet.  The workflow catalog remains authoritative
// for what comes next, but it cannot manufacture a current step in the
// absence of the modal's LIVE_UI workflow marker.
function guidedWorkflowEntryState(ui) {
  if (!ui || ui.workflowState?.workflowId === COMPANY_GUIDED_NEW_PLAN_WORKFLOW.id) return null;
  // The chooser has already become the foreground surface. It is neither the
  // pre-wizard entry surface nor Step 1, even though it belongs to the same
  // guided-flow lifecycle.
  if (liveGuidedDraftChooserState(ui)) return null;
  const target = (Array.isArray(ui.visibleTargets) ? ui.visibleTargets : []).find((item) => {
    const key = String(item?.targetKey || '').trim();
    return item?.identitySource === 'CANONICAL'
      && !item?.disabled
      && /:guided-plan-start$/iu.test(key);
  });
  // Planlama Merkezi keeps its normal guided-entry action inside the existing
  // work-area disclosure. A closed disclosure does not make the workflow
  // modal live, nor does it erase the canonical entry action from this
  // authorized screen contract. Preserve the exact target key only; the
  // guided-target resolver remains responsible for revealing and proving the
  // live DOM element before a callout/highlight is rendered.
  const contractedEntryTarget = !target
    && ui.surfaceRole === 'COMPANY'
    && /^\/company\/?$/iu.test(String(ui.path || ''))
    && ui.guidedDraftAvailability
    ? {
      targetKey: 'company:guided-plan-start',
      label: 'Rehberi Başlat',
      semanticType: 'button',
      identitySource: 'CANONICAL',
      requiresLiveResolution: true,
    }
    : null;
  const entryTarget = target || contractedEntryTarget;
  if (!entryTarget) return null;
  const nextStep = COMPANY_GUIDED_NEW_PLAN_WORKFLOW.steps[0];
  const draftAvailability = ui.guidedDraftAvailability && typeof ui.guidedDraftAvailability === 'object'
    ? ui.guidedDraftAvailability
    : null;
  const draftState = String(draftAvailability?.state || '').trim().toUpperCase();
  const draftCount = Math.max(0, Number(draftAvailability?.count || 0) || 0);
  const nextState = draftState === 'SAVED_DRAFT_CHOOSER' && draftCount > 0
    ? 'SAVED_DRAFT_CHOOSER'
    : draftState === 'NEW_PLAN_STEP_1' && draftCount === 0
      ? 'NEW_PLAN_STEP_1'
      : 'UNKNOWN_ENTRY_NEXT_STATE';
  return {
    state: 'PRE_WIZARD',
    currentTarget: {
      targetKind: 'CONTROL',
      targetKey: String(entryTarget.targetKey || '').trim(),
      label: String(entryTarget.label || '').trim(),
      semanticType: String(entryTarget.semanticType || 'button').trim(),
      requiresLiveResolution: entryTarget.requiresLiveResolution === true,
    },
    nextStep: nextStep ? { ordinal: nextStep.ordinal, key: nextStep.key, label: nextStep.label } : null,
    nextState,
    draftAvailability: draftAvailability
      ? { state: draftState || 'UNKNOWN', count: draftCount, maxResumeStep: Number(draftAvailability.maxResumeStep || 0) || null, source: String(draftAvailability.source || 'SERVER_GUIDED_DRAFTS').trim() }
      : null,
  };
}

function hasLiveWorkflowGroundingCue(text) {
  const value = String(text || "");
  return /\b(?:burasi|burda|burada)\s+(?:ne|ne\s+yap|nap)\p{L}*/iu.test(value)
    || /\bbu\s+adim(?:da|de)?\s+(?:ne|ne\s+yap|nap)\p{L}*/iu.test(value)
    || hasCurrentWorkflowStepQuestion(value)
    || /\b(?:şu\s+an|su\s+an)\s+neredeyim\b/iu.test(value)
    || /\bsu\s+an\s+kacinci\s+adim(?:dayim|deyim|da|de)?\b/iu.test(value)
    || /\b(?:nerede|nerde)\s+kaldik\b/iu.test(value)
    || /\bsonra\s+ne\b/iu.test(value)
    || /\b(?:devam\s+edelim|hadi\s+devam|devam\s+et)\b/iu.test(value)
    || hasCurrentStepHowToCue(value)
    // Failure/recovery language is grounded by a rendered workflow too.  It
    // must not be downgraded to generic chat merely because the user did not
    // repeat the control label.
    || hasActiveGuidanceFailureCue(value)
    // Structural block/surface references are live-workflow follow-ups when
    // the guided UI is rendered.  Keep them in the canonical workflow path
    // so a prior control target cannot make the request appear control-level.
    || hasExplicitCurrentScreenPurposeCue(value)
    || hasNextSemanticBlockCue(value)
    || /\b(?:burayi|burayı|burası|burasi|bu\s+ekranı|bu\s+ekrani)\b.*\b(?:anlat|acikla|açıkla)\b/iu.test(normalize(value))
    || /\b(?:anlat|acikla|açıkla)\b.*\b(?:burayi|burayı|burası|burasi|bu\s+ekranı|bu\s+ekrani)\b/iu.test(normalize(value))
    || /\b(?:adim\s+adim|adım\s+adım)\b.*\b(?:anlat|acikla|açıkla)\b/iu.test(normalize(value))
    || /\b(?:durak(?:lari|ları)?|stop)\b.*\b(?:hazirla|hazırla|hazirlam|hazırlam)\p{L}*\b/iu.test(normalize(value))
    || isLiveWorkflowContinuationCue(value)
    || hasWorkflowStartFollowUpCue(value)
    || hasWorkflowCapabilityCue(value)
    // A generic help request is still a live-workflow follow-up when the
    // conversation carries an active guided task.  The helper is only used
    // together with an active/live workflow guard, so this does not make
    // context-free generic help inherit stale workflow state.
    || isGenericProductHelpIntent(value);
}

// A live workflow step can be queried through several grammatical forms
// ("bu adımın amacı", "şu anda bu adımda hangi işlem oluyor?", "sıradaki
// adım ne?").  Resolve the relation between a current-step reference and a
// question operator instead of enumerating complete utterances.
function hasCurrentWorkflowStepQuestion(text) {
  const value = normalize(text);
  const stepReference = /\b(?:bu|su|mevcut|su\s+anki)\s+adim(?:in|un|da|de)?\b/iu.test(value);
  const questionOperator = /\b(?:ne|nasil|hangi|sirada|siradaki|sonraki|amac|neden|oluyor|var|yap)\p{L}*\b/iu.test(value);
  return stepReference && questionOperator;
}

function hasNextSemanticBlockCue(text) {
  return /\b(?:sonraki|bir\s+sonraki)\s+(?:bolum|bölüm|blok|alan|kisim|kısım)\b/iu.test(normalize(text));
}

// A live workflow can distinguish a region/block explanation from a broader
// screen-purpose question. Keep the distinction structural so the semantic
// block resolver can emit the canonical BLOCK identity instead of inheriting a
// previous CONTROL target.
function hasLiveBlockExplanationCue(text, ui = null) {
  const value = normalize(text);
  const currentLabel = normalize(ui?.label || '');
  const namesBroaderSurface = Boolean(currentLabel && currentLabel.length >= 3 && value.includes(currentLabel));
  const deicticSurfaceQuestion = /\b(?:burasi|burada|burda|bu\s+(?:alan|bolum|kisim|adim|ekran)(?:da|de)?|su\s+an)\b.{0,48}\b(?:ne|napiyoruz|ne\s+var|nasil|neredeyim|ne\s+ise\s+yar|yapiliyor|yapiyoruz|ne\s+yap|nap)\p{L}*/iu.test(value);
  return /\b(?:bu|su)\s+(?:bolum|alan|kisim|blok)\p{L}*\b.{0,48}\b(?:ne\s+ise\s+yar|anlat|acikla|ne\s+yap|nasil\s+yap)\p{L}*/iu.test(value)
    || /\b(?:burayi|burasi|bu\s+bolumu|bu\s+alani|bu\s+blok)\b.{0,48}\b(?:adim\s+adim|anlat|acikla|nasil\s+yap)\p{L}*/iu.test(value)
    || hasNextSemanticBlockCue(value)
    || (deicticSurfaceQuestion && !namesBroaderSurface);
}

// These are semantic current-workflow follow-ups.  They deliberately describe
// the relation between the user's deictic/how-to language and a live guided
// workflow; they are not a finite list of accepted utterances.
function hasCurrentStepHowToCue(text) {
  const value = normalize(text);
  return /\b(?:nasil|nasıl)\s+(?:yap|yapmam|yapicam|yapacagim|yapiyorum|yapiyoruz|yaparim|personel|calisan)\p{L}*/iu.test(value)
    || /\b(?:ne\s+yapmam|ne\s+yapacagim|napmam|napicam|napacagim)\b.*\b(?:gerek|lazim|burda|burada|simdi|bu\s+adim)\b/iu.test(value)
    || /\b(?:burdan|buradan|burda|burada|simdi|su\s+an)\b.*\b(?:ne|nap|nasil|sonra|devam)\b/iu.test(value)
    || /\b(?:bundan\s+sonra)\b.*\b(?:ne|nap|nasil|yap)\b/iu.test(value)
    || /\b(?:kacinci|kacinci)\s+adim(?:dayim|deyim|da|de)?\b/iu.test(value);
}

// Address questions are UI guidance only when the wording points at the
// current form/control (where/how to enter it).  Keep raw-person disclosure
// language out of this cue so the privacy boundary remains authoritative.
function hasAddressUiHelpCue(text) {
  const value = normalize(text);
  const rawPersonReference = /\b(?:bu|o|onun|kisinin|personelin|ogrencinin|cocugun|velinin)\b.*\b(?:adres|adresten)\p{L}*\b/iu.test(value);
  if (rawPersonReference) return false;
  return (
    /\b(?:adres|adresten)\p{L}*\b.*\b(?:nereye|nerede|nerden)\b/iu.test(value)
    || /\b(?:nereye|nerede|nerden)\b.*\b(?:adres|adresten)\p{L}*\b/iu.test(value)
    || /\b(?:adres|adresten)\p{L}*\b.*\b(?:alan|gire|gir|doldur|dogrula)\p{L}*\b/iu.test(value)
    || /\b(?:nasil)\b.*\b(?:adres|adresten)\p{L}*\b/iu.test(value)
  );
}

function workflowCapabilityIntentFromText(text, workflowStepReference = null) {
  if (workflowStepReference?.key !== "PERSONNEL_STOPS") return null;
  const value = normalize(text);
  const personnel = /\b(?:personel|calisan|kisi|kisileri|kisiler)\p{L}*\b/iu.test(value);
  const importCue = /\b(?:excel|exel|csv|toplu|dosya|tablo|ice\s+aktar|import|yukle|aktar)\p{L}*\b/iu.test(value);
  const addCue = /\b(?:ekl(?:e|i)|eklerim|ekliyorum|ekleniyor|eklemek|add)\p{L}*\b/iu.test(value);
  const addressCue = /\b(?:adres|adresten)\p{L}*\b/iu.test(value);
  const addressUiHelp = hasAddressUiHelpCue(value);
  // Stop creation is a Step-3 capability in its own right.  Keep the
  // operation vocabulary structural so colloquial forms such as "durak
  // üretme nerede" and "durağı nasıl çıkaracağız" stay in the workflow,
  // while a bare stop count or cost question can still use its own domain.
  const stopReference = /\b(?:durak|duraklari|durakları|durağı|duragi|stop)\p{L}*\b/iu.test(value);
  const stopOperation = /\b(?:hazirla|hazırla|hazirlam|hazırlam|uret|üret|olustur|oluştur|cikar|çıkar|cek|çek|hazir)\p{L}*\b/iu.test(value)
    || /\b(?:nerede|nerden|nasil|nasıl)\b/iu.test(value);
  const stopPreparationCue = stopReference && stopOperation;
  if (stopPreparationCue) return "PREPARE_STOPS";
  if (addressCue && (addressUiHelp || addCue || /\bnasil\b.*\b(?:gerek|ekle|dogrula|doğrula)\b/iu.test(value))) return "ENTER_ADDRESS";
  if (importCue && /\b(?:nerden|neresi|ekle|yukle|aktar|nasil|hangi|dosya|tablo)\b/iu.test(value)) return "IMPORT_PERSONNEL";
  if (personnel && importCue) return "IMPORT_PERSONNEL";
  if (personnel && (addCue || /\bnasil\b.*\bpersonel\b/iu.test(value))) return "ADD_PERSONNEL";
  return null;
}

function hasWorkflowCapabilityCue(text) {
  const value = normalize(text);
  const importCue = /\b(?:excel|exel|csv|toplu|dosya|tablo|ice\s+aktar|import|yukle|aktar)\p{L}*\b/iu.test(value);
  const addressUiHelp = hasAddressUiHelpCue(value);
  const stopReference = /\b(?:durak|duraklari|durakları|durağı|duragi|stop)\p{L}*\b/iu.test(value);
  const stopOperation = /\b(?:hazirla|hazırla|hazirlam|hazırlam|uret|üret|olustur|oluştur|cikar|çıkar|cek|çek|hazir)\p{L}*\b/iu.test(value)
    || /\b(?:nerede|nerden|nasil|nasıl)\b/iu.test(value);
  return (
    /\b(?:personel|calisan|kisi|kisileri|kisiler)\p{L}*\b/iu.test(value)
      && /\b(?:ekl(?:e|i)|eklerim|ekliyorum|ekleniyor|eklemek|excel|exel|csv|toplu|dosya|tablo|ice\s+aktar|import|yukle|aktar)\p{L}*\b/iu.test(value)
  ) || (importCue && /\b(?:nerden|neresi|ekle|yukle|aktar|nasil|hangi)\b/iu.test(value))
    || addressUiHelp
    || (stopReference && stopOperation);
}

// Route-order verification is a Step-4 semantic next action when the live
// workflow says ordering/verification is missing. This is structural
// (route/order/verification plus an action cue), so generic cost questions
// remain in cost reasoning and no individual utterance becomes a branch.
function hasRouteOrderVerificationCue(text) {
  const value = normalize(text);
  const routeReference = /\b(?:rota|rotayi|rotayı|guzergah|güzergah|durak|osrm|route)\p{L}*\b/iu.test(value);
  const orderOrVerification = /\b(?:sira|sıra|sirasi|sırası|sirala|sırala|siralam|sıralam|dogrula|doğrula|dogrulama|doğrulama|kontrol|eksik|hazir|hazır)\p{L}*\b/iu.test(value);
  const actionCue = /\b(?:nerede|nerde|nasil|nasıl|hangi|sonraki|siradaki|sıradaki|ne|neye|bak|kontrol)\b/iu.test(value);
  return routeReference && orderOrVerification && actionCue;
}

function routeOrderActionFromUi(ui) {
  const targets = Array.isArray(ui?.visibleTargets) ? ui.visibleTargets : [];
  return targets.find((target) => {
    const label = normalize(target?.label || '');
    return /\b(?:rota|rotalari|rotaları|route)\b.*\b(?:sira|sıra|sirala|sırala|olustur|oluştur)\b/iu.test(label)
      || /\b(?:sira|sıra|sirala|sırala)\b.*\b(?:rota|rotalari|rotaları|route)\b/iu.test(label);
  }) || null;
}

function hasWorkflowStartFollowUpCue(text) {
  const value = normalize(text);
  return /\b(?:rehber|rehberi|rehberli|baslattim|basladim|acildi|actim|buradayim)\b.*\b(?:simdi|sonra|ne|nap|devam|yapmam|yapacagim|var)\b/iu.test(value);
}

function isLiveWorkflowContinuationCue(text) {
  const value = String(text || "");
  const reportedAction = /\b(?:ekledim|ekledik|yaptim|yaptım|tamamladim|tamamladım|ice\s+aktardim|içe\s+aktardım|exel\s*\/\s*csv\s+ice\s+aktardim|excel\s*\/\s*csv\s+içe\s+aktardım)\b/iu.test(value);
  const asksAfter = /\b(?:sonra|simdi|şimdi|devam|ne|nap|nasil|nasıl|olacak|yap)\b/iu.test(value);
  const recoveryReference = hasActiveGuidanceFailureCue(value)
    || /\b(?:dediğin|dedigin|soyledigin|söylediğin)\s+yer\s+yok\b/iu.test(value)
    || /\btekrar\s+goster\p{L}*\b/iu.test(value);
  const continuationPresentation = /\b(?:devamini|devamını)\s+(?:anlat|acikla|açıkla)\p{L}*\b/iu.test(value)
    || /\bsonraki\s+(?:kisim|kismi|kısmı)\s+(?:anlat|acikla|açıkla)\p{L}*\b/iu.test(value)
    || /\b(?:kaldigin|kaldığın|kaldiginiz|kaldığınız)\s+yerden\s+devam\b/iu.test(value);
  return /\b(?:nerede|nerde)\s+kaldik\b/iu.test(value)
    || /\bsonra\s+ne\b/iu.test(value)
    || /\b(?:sirada|siradaki|sonraki)\b.*\b(?:ne|adim|islem)\p{L}*\b/iu.test(value)
    || /\b(?:devam\s+edelim|hadi\s+devam|devam\s+et)\b/iu.test(value)
    || (reportedAction && asksAfter)
    || /\b(?:bundan\s+sonra)\b.*\b(?:ne|nap|yap)\p{L}*\b/iu.test(value)
    || recoveryReference
    || continuationPresentation;
}

// A rendered guided workflow is contextual UI evidence for the current turn.
// It must outrank the context-free product-help shortcut, while server-side
// screen/role authorization remains the authority for access.
export function hasLiveWorkflowGroundingReference(value, screenContext = null, conversationState = null) {
  const ui = currentUiContext(screenContext, null);
  const cue = hasLiveWorkflowGroundingCue(normalize(value));
  return Boolean(cue && (
    liveWorkflowStepReference(ui)
    || activeWorkflowPlan(conversationState)
  ));
}

// A numbered step question is contextual when an authorized guided workflow
// is already active. Keep that fact in the canonical semantic owner so the
// generic onboarding classifier cannot replace the active task.
export function hasActiveWorkflowStepReference(value, conversationState = null) {
  return Boolean(workflowStepReferenceFromText(value) && activeWorkflowPlan(conversationState));
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
  { type: "VEHICLE", pattern: /(?:araç|arac|araba|plaka|vehicle)\p{L}*/iu },
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
const EXTERNAL_DATIVE_OWNER_NOUN = "(?:okula|firmaya|sirkete|kuruma|organizasyona|hesaba|tenanta|surucuye|sofore|araca|personele|ogrenciye|veliye|cocuga|kisiye)";
const OPTIONAL_EXTERNAL_DETERMINER = "(?:(?:bir|birer|herhangi\\s+bir)\\s+)?";
const CURRENT_OWNER_REFERENCE = "(?:bize|bizim|bu|su|o|benim|bana|kendi|mevcut)";
const EXTERNAL_SCOPE_MARKER = new RegExp(
  `(?:\\b(?:baska|oteki|diger|farkli)\\s+${OPTIONAL_EXTERNAL_DETERMINER}(?:${EXTERNAL_POSSESSIVE_OWNER_NOUN}|${EXTERNAL_DATIVE_OWNER_NOUN}\\s+ait)\\b|\\b(?:harici|external|baskasinin)\\b|\\bbaskas\\p{L}*\\s+ait\\b|\\b(?:bizden|sizden)\\s+olmayan\\b|\\b${CURRENT_OWNER_REFERENCE}\\b\\s+(?:${EXTERNAL_OWNER_NOUN}\\p{L}*\\s+){0,2}(?:ait\\s+olmayan|bagli\\s+olmayan|olmayan|dis(?:indaki|inda)?|harici|otesi|otesinde)|\\b(?:bu|bizim|mevcut|kendi)\\s+(?:hesab\\p{L}*\\s+(?:dis(?:indaki|inda)?|harici|otesi|otesinde|bagli\\s+olmayan)|kapsam\\p{L}*\\s+(?:dis(?:indaki|inda)?|harici))|\\b(?:kapsam|hesap|tenant|sirket|firma|kurum)\\b\\s+(?:disi|disindaki|disinda|harici)|\\b(?:bagli|ait)\\s+olmayan)`,
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
  // A named tenant followed by an ownership relation is an explicit external
  // scope even when the user does not say “başka tenant”.  Without this
  // canonical signal a named tenant + record request can inherit the live
  // selection and be answered as the selected record.  Never infer a current
  // tenant from the name; unknown named ownership is fail-closed.
  const namedTenantReference = (() => {
    const match = text.match(/\b([\p{L}\p{N}_-]+)\s+tenant\p{L}*\s+ait\b/iu);
    const owner = String(match?.[1] || '').trim();
    return Boolean(match && owner && !/^(?:benim|bizim|mevcut|kendi|bu|su|current)$/iu.test(owner));
  })();
  const explicitExternalScope = Boolean((externalMarker || namedTenantReference) && (ownerType || subjectType));
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

function currentUiContext(screenContext, conversationState, user = null) {
  const path = String(screenContext?.path || conversationState?.lastScreenPath || "").trim();
  const label = String(screenContext?.label || conversationState?.lastScreenLabel || "").trim();
  const declaredRole = String(screenContext?.semanticResolutionContext?.authorizedRole || "").trim().toUpperCase();
  const authenticatedRole = String(user?.role || "").trim().toUpperCase();
  const companyKind = String(user?.companyKind || user?.companyType || "").trim().toUpperCase();
  const surfaceRole = ["SCHOOL", "ORGANIZATION"].includes(declaredRole)
    ? declaredRole
    : authenticatedRole === "COMPANY" && ["SCHOOL", "ORGANIZATION"].includes(companyKind)
      ? companyKind
      : /\/school(?:\/|$)/iu.test(path)
        ? "SCHOOL"
        : /\/organization(?:\/|$)/iu.test(path)
          ? "ORGANIZATION"
          : authenticatedRole;
  // Visible controls are route-bound UI context only. They never grant a
  // capability or select data: server-side role/screen authorization remains
  // authoritative, and the guided-target resolver still requires a real
  // currently rendered control before it can return FOUND.
  const visibleControlCount = Array.isArray(screenContext?.uiHints?.visibleButtons)
    ? screenContext.uiHints.visibleButtons
      .filter((item) => String(item?.label || "").trim())
      .length
    : 0;
  const visibleTargetLabels = [
    label,
    ...(Array.isArray(screenContext?.uiHints?.visibleButtons) ? screenContext.uiHints.visibleButtons : []),
    ...(Array.isArray(screenContext?.uiHints?.allowedActions) ? screenContext.uiHints.allowedActions : []),
    ...(Array.isArray(screenContext?.uiHints?.visibleMenus) ? screenContext.uiHints.visibleMenus : []),
  ]
    .map((item) => typeof item === "string" ? item : item?.label)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const modalTitles = (Array.isArray(screenContext?.uiHints?.modalTitles) ? screenContext.uiHints.modalTitles : [])
    .map((item) => typeof item === 'string' ? item : item?.label)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const currentSelection = resolveCurrentSelection({ screenContext, conversationState });
  const selectedId = Number(currentSelection.entity?.id || 0);
  // The routing adapter deliberately never transports an entity id. It may
  // carry the already-authorized current-screen selection type, however,
  // which is enough to distinguish an unresolved parent-live target from a
  // selected service without making that selection an authorization input.
  const selectedType = typeForSelected(
    currentSelection.entity?.type,
  );
  const selectedEntityPresent = Boolean(
    selectedId > 0 && selectedType,
  );
  const workflowState = screenContext?.uiHints?.workflowState && typeof screenContext.uiHints.workflowState === "object"
    ? {
      workflowId: String(screenContext.uiHints.workflowState.workflowId || "").trim(),
      activeStepOrdinal: Number(screenContext.uiHints.workflowState.activeStepOrdinal || 0) || null,
      completedThroughOrdinal: Number(screenContext.uiHints.workflowState.completedThroughOrdinal || 0) || 0,
      currentTargetKey: String(screenContext.uiHints.workflowState.currentTargetKey || "").trim(),
      currentTargetLabel: String(screenContext.uiHints.workflowState.currentTargetLabel || "").trim(),
      source: String(screenContext.uiHints.workflowState.source || "LIVE_UI").trim(),
    }
    : null;
  const currentTarget = screenContext?.uiHints?.currentTarget && typeof screenContext.uiHints.currentTarget === "object"
    ? {
      status: String(screenContext.uiHints.currentTarget.status || "").trim().toUpperCase(),
      targetKind: String(screenContext.uiHints.currentTarget.targetKind || "CONTROL").trim().toUpperCase(),
      targetKey: String(screenContext.uiHints.currentTarget.targetKey || "").trim(),
      semanticId: String(screenContext.uiHints.currentTarget.semanticId || "").trim(),
      blockKey: String(screenContext.uiHints.currentTarget.blockKey || "").trim(),
      label: String(screenContext.uiHints.currentTarget.label || "").trim(),
      semanticType: String(screenContext.uiHints.currentTarget.semanticType || "").trim(),
      screenPath: String(screenContext.uiHints.currentTarget.screenPath || "").trim(),
      role: String(screenContext.uiHints.currentTarget.role || "").trim().toUpperCase(),
    }
    : null;
  const visibleTargets = (Array.isArray(screenContext?.uiHints?.visibleButtons) ? screenContext.uiHints.visibleButtons : [])
    .filter((item) => item && String(item?.label || "").trim() && String(item?.targetKey || item?.semanticKey || item?.copilotTarget || "").trim())
    .map((item) => ({
      label: String(item.label || "").trim(),
      targetKey: String(item.targetKey || item.semanticKey || item.copilotTarget || "").trim(),
      semanticType: String(item.semanticType || "button").trim(),
      identitySource: String(
        item.identitySource
          || (item.targetKey || item.semanticKey || item.copilotTarget || item.semanticId ? "CANONICAL" : "LEGACY_LABEL"),
      ).trim().toUpperCase(),
      disabled: Boolean(item.disabled),
    }));
  const rawDraftAvailability = screenContext?.uiHints?.guidedDraftAvailability && typeof screenContext.uiHints.guidedDraftAvailability === 'object'
    ? screenContext.uiHints.guidedDraftAvailability
    : null;
  const guidedDraftAvailability = rawDraftAvailability
    ? {
      state: String(rawDraftAvailability.state || 'UNKNOWN').trim().toUpperCase(),
      count: Math.max(0, Number(rawDraftAvailability.count || 0) || 0),
      maxResumeStep: Number(rawDraftAvailability.maxResumeStep || 0) || null,
      source: String(rawDraftAvailability.source || 'SERVER_GUIDED_DRAFTS').trim(),
    }
    : null;
  const rawForegroundSurface = screenContext?.uiHints?.foregroundSurface && typeof screenContext.uiHints.foregroundSurface === 'object'
    ? screenContext.uiHints.foregroundSurface
    : null;
  const foregroundSurface = rawForegroundSurface
    ? {
      key: String(rawForegroundSurface.key || '').trim(),
      kind: String(rawForegroundSurface.kind || '').trim().toUpperCase(),
      source: String(rawForegroundSurface.source || 'LIVE_UI').trim(),
    }
    : null;
  return { path, label, surfaceRole, selectedId: selectedId > 0 ? selectedId : null, selectedType, selectionSource: currentSelection.source || null, selectedEntityPresent, visibleControlCount, visibleTargetLabels, visibleTargets, modalTitles, currentTarget, workflowState, guidedDraftAvailability, foregroundSurface };
}

function hasSelectedFinancialAgreementSurface(ui) {
  if (String(ui?.selectedType || '').toUpperCase() !== 'AGREEMENT' || Number(ui?.selectedId || 0) <= 0) return false;
  if (!/^\/room\/(?:agreements|commercial-flow)$/iu.test(String(ui?.path || ''))) return false;
  return (Array.isArray(ui?.visibleTargetLabels) ? ui.visibleTargetLabels : []).some((label) =>
    /(?:fark|hakediş|hakedis|fatura|mutabakat|ödeme|odeme|önizleme|onizleme)/iu.test(String(label || '')),
  );
}

function isSelectedFinancialGuidedEntry(text, ui) {
  return hasSelectedFinancialAgreementSurface(ui)
    && (hasStepByStepTeachingCue(text) || hasContinuationCue(text));
}

function isExplicitOrganizationPlanReference(text) {
  return hasAnyTerm(text, ["organizasyon plani", "gezi plani", "organization plan", "trip plan"]);
}

function hasOperationalEvidenceQuestion(text) {
  return /\b(?:neye|nelere|neyi)\s+(?:bak|incele|kontrol|degerlendir|gozden\s+gecir)\p{L}*\b/iu.test(text)
    || /\bhangi\s+\p{L}+(?:\s+\p{L}+){0,2}\s+(?:bak|incele|kontrol|degerlendir|gozden\s+gecir)\p{L}*\b/iu.test(text)
    || hasEvidenceSufficiencyCue(text)
    || hasAttentionAssessmentCue(text);
}

function isSchoolOperationalPlanningQuestion(text, ui) {
  return ui?.surfaceRole === "SCHOOL"
    && /\/school\/operations\b/iu.test(String(ui.path || ""))
    && !isExplicitOrganizationPlanReference(text)
    && hasOperationalEvidenceQuestion(text);
}

function currentTargetFailureReference(text, ui) {
  if (!ui?.path || !hasActiveGuidanceFailureCue(text)) return null;
  const current = ui.currentTarget;
  if (current?.status === "FOUND" && current.targetKey && (!current.screenPath || current.screenPath === ui.path)) {
    return current;
  }
  const value = normalize(text);
  const stopWords = new Set(["buton", "alan", "ekran", "bölüm", "bolum"]);
  const candidates = Array.isArray(ui.visibleTargets) ? ui.visibleTargets.filter((row) => row.identitySource === "CANONICAL" && !row.disabled) : [];
  const matching = candidates.find((row) => {
    const words = normalize(row.label).split(/\s+/u)
      .map((word) => word.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter((word) => word.length >= 4 && !stopWords.has(word));
    return words.some((word) => value.split(/\s+/u).some((candidate) => candidate.startsWith(word) || word.startsWith(candidate)));
  });
  return matching || null;
}

const SCREEN_CAPABILITY_STOP_WORDS = new Set([
  "ac", "aç", "goster", "göster", "kullan", "nereden", "nasil", "nasıl", "hangi", "buton", "ekran", "sayfa", "menu", "menü",
  "olan", "olanı", "olanin", "olanın", "icin", "için", "bana", "bir", "bu", "su", "şu",
]);

// Explicit capability help is grounded by the currently authorized surface's
// own visible vocabulary.  This is structural label/verb matching, not a
// phrase list: the screen supplies the target words and the user supplies a
// how-to/open operation.  Authorization and actual target existence remain
// downstream responsibilities of the screen registry and guided resolver.
function currentTargetMatchesSelectedRecord(candidate, ui) {
  const targetKey = String(candidate?.targetKey || "").trim();
  const recordMatch = targetKey.match(/:(shift|agreement|offer|vehicle|driver|personnel|student|parent):(\d+)(?::|$)/iu);
  if (!recordMatch) return true;
  const selectedId = Number(ui?.selectedId);
  if (!Number.isInteger(selectedId) || selectedId <= 0) return false;
  const selectedType = String(ui?.selectedType || "").trim().toUpperCase();
  const targetType = String(recordMatch[1] || "").toUpperCase();
  return selectedId === Number(recordMatch[2])
    && (!selectedType || selectedType === targetType);
}

function currentScreenCapabilityTarget(text, ui) {
  if (!ui?.path || !Array.isArray(ui.visibleTargetLabels) || !ui.visibleTargetLabels.length) return false;
  const value = normalize(text);
  const explicitControlVerb = /\b(?:nereden|nerede|nerde|nasil|ac(?!ik)\p{L}*|goster\p{L}*|kullan\p{L}*|bul\p{L}*|ulas\p{L}*|git\p{L}*|gec\p{L}*|gireyim|buyut\p{L}*|yaklastir\p{L}*|genislet\p{L}*|zoom)\b/iu.test(value);
  const explicitControlQuestion = /\bhangi\s+(?:buton|sekme|tab|kart|alan|bolum|bölüm)\p{L}*\b/iu.test(value);
  if (!explicitControlVerb && !explicitControlQuestion) return false;
  const inputTerms = value.split(/\s+/u)
    .map((term) => term.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter((term) => term.length >= 4 && !SCREEN_CAPABILITY_STOP_WORDS.has(term));
  const candidates = Array.isArray(ui.visibleTargets) && ui.visibleTargets.length
    ? ui.visibleTargets
    : ui.visibleTargetLabels.map((label) => ({ label }));
  const mapEnlargementRequest = /\b(?:harita|zoom)\p{L}*\b/iu.test(value)
    && /\b(?:buyut|yaklastir|yakinlastir|genislet|zoom)\p{L}*\b/iu.test(value);
  if (mapEnlargementRequest) {
    const mapTarget = candidates.find((candidate) => {
      if (!currentTargetMatchesSelectedRecord(candidate, ui)) return false;
      const label = normalize(candidate?.label);
      const semanticType = normalize(candidate?.semanticType);
      return /(?:buyuk|buyut|yaklastir|yakinlastir|yakınlastır|genislet|zoom)\p{L}*/iu.test(label)
        || /map[_-](?:modal[_-])?open|zoom[_-]in/iu.test(semanticType)
        || /(?:map|zoom)[_-].*(?:open|in)/iu.test(String(candidate?.targetKey || ""));
    });
    // An explicit enlargement request may not fall through to a generic
    // presentation control such as “Tümünü göster”.  If the live surface
    // does not expose a zoom target, the truthful result is NOT_FOUND.
    return mapTarget || null;
  }
  return candidates.find((candidate) => {
    if (!currentTargetMatchesSelectedRecord(candidate, ui)) return false;
    return normalize(candidate?.label)
      .split(/\s+/u)
      .map((term) => term.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter((term) => term.length >= 4 && !SCREEN_CAPABILITY_STOP_WORDS.has(term))
      .some((term) => inputTerms.some((inputTerm) => inputTerm.startsWith(term) || term.startsWith(inputTerm)));
  }) || null;
}

function hasCardinalityCue(text) {
  // A complete numeric calculation is a general task, not an entity count.
  // Do not let a bare "kaç" borrow the current product screen as a target.
  // Cardinality is a property of an entity *set*, not a token.  In
  // particular, "firma teklifi kaç" is a scalar-field question on a selected
  // agreement, whereas "kaç teklif var" asks for an OFFER set cardinality.
  if (isGeneralArithmeticRequest(text)) return false;
  const hasInflectedTerm = (value, term) => {
    const parts = normalize(term).split(/\s+/u).filter(Boolean);
    if (!parts.length) return false;
    const pattern = parts.map((part, index) => {
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return index === parts.length - 1 ? `${escaped}\\p{L}*` : escaped;
    }).join("\\s+");
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${pattern}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
  };
  const hasPluralEntityTarget = ENTITY_CONCEPTS.some((concept) => concept.terms.some((term) => {
    const parts = normalize(term).split(/\s+/u).filter(Boolean);
    if (!parts.length) return false;
    const last = parts.at(-1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefix = parts.slice(0, -1).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
    const pattern = prefix ? `${prefix}\\s+${last}(?:lar|ler)\\p{L}*` : `${last}(?:lar|ler)\\p{L}*`;
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${pattern}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
  }));
  const explicitEntityTarget = ENTITY_CONCEPTS.some((concept) => concept.terms.some((term) => hasAnyTerm(text, [term]) || hasInflectedTerm(text, term)));
  if (!explicitEntityTarget) return false;
  const typedCountVerb = /\b(?:say|listele|toplamla)\p{L}*\b/iu.test(text)
    && ENTITY_CONCEPTS.some((concept) => hasAnyTerm(text, concept.terms));
  const explicitCountNoun = /(?:^|[^\p{L}])(?:say(?:i|ini|isini|isi|ilar|ilari)|aded(?:i|ini)|toplam(?:i|ini|in|un|ün|u)?)(?=$|[^\p{L}])/iu.test(text)
    || hasAnyTerm(text, ["kac tane", "kac adet", "toplam kac"]);
  const countPredicate = /\b(?:var|bulunuyor|gorunuyor|mevcut|kayitli|listelen|duruyor|bekliyor|kaldi|kalmis)\p{L}*\b/iu.test(text);
  const collectionPredicate = /\b(?:neler|hangileri|liste|listele|listesi|ozet|ozeti|envanter|bekleyen|bekliyor|beklemede|inceleme)\p{L}*\b/iu.test(text);
  const quantifiedSet = /(?:^|[^\p{L}])kac\s+(?:\p{L}+\s+){0,2}\p{L}+/iu.test(text) && countPredicate;
  // Collection language can be inflected or possessive (for example
  // "anlaşmaların özeti"). Requiring a bare plural suffix here allowed the
  // canonical transport shape to fall back to FIELD_LOOKUP even though the
  // request clearly asks for an authorized collection summary.
  const collectionSet = explicitEntityTarget && collectionPredicate;
  const singlePendingExistence = /\b(?:var|bulunuyor|gorunuyor|bekliyor|beklemede)\b/iu.test(text)
    && /\b(?:bekleyen|bekliyor|beklemede|inceleme)\p{L}*\b/iu.test(text)
    && explicitEntityTarget;
  return (explicitCountNoun && (hasPluralEntityTarget || !/\btoplam(?:i|ini|in|un|ün|u)\b/iu.test(text)))
    || (typedCountVerb && explicitEntityTarget)
    || quantifiedSet
    || collectionSet
    || singlePendingExistence;
}

function hasOfferCollectionSummaryRequest(text) {
  const normalized = normalize(text);
  const offerMention = /\b(?:teklif|offer|rfq)\p{L}*\b/iu.test(normalized);
  const collectionCue = /\b(?:neler|hangileri|liste|listele|listesi|ozet|ozeti|envanter)\p{L}*\b/iu.test(normalized);
  const pluralStatusCue = /\b(?:durum(?:u|unu|lari|larini|leri|lerini)?|sirala|siralar|sir[ae]layalim|siralar\s+misin)\b/iu.test(normalized)
    && /\b(?:teklif|offer|rfq)\p{L}*(?:ler|ları|leri)\b/iu.test(normalized);
  return offerMention && (collectionCue || pluralStatusCue);
}

// A status-qualified plural collection request remains a collection query
// even when the same sentence asks where the collection is visible.  The
// selected record carried by the current screen is only shell context; it
// must not turn "beklemede olan vardiyaları ..." into a selected-record
// explanation.
function hasTemporalCollectionCue(text) {
  const value = normalize(text);
  const status = /\b(?:bekleyen|bekliyor|beklemede|inceleme)\p{L}*\b/iu.test(value);
  const pluralEntity = /\b(?:vardiya|sefer|teklif|sozlesme|anlasma|kayit|talep)(?:\p{L})*?(?:lar|ler)\p{L}*\b/iu.test(value);
  return status && pluralEntity;
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

// A note question is a read of an authorized product record, not a request to
// draft a new note. Keep the boundary structural: a note/description field,
// a product record or party anchor, and a read/explanation predicate must
// occur together. This lets inflected Turkish forms share one field-lookup
// contract without enumerating complete user sentences.
export function hasProductNoteLookupCue(value) {
  const text = normalize(value);
  const noteField = /\b(?:not|aciklama)\p{L}*\b/iu.test(text);
  const readPredicate = /\b(?:ne|nedir|nasil|goster|gosterir|anlat|acikla|oku|ozetle|yaz|soyle)\p{L}*\b/iu.test(text);
  const recordOrParty = /\b(?:teklif|offer|rfq|hizmet\s+alan|alici|musteri|tasimacilik|tasimaci|tasiyici|nakliyeci|firma|sirket)\p{L}*(?:\s+\p{L}+){0,2}\b/iu.test(text);
  return noteField && readPredicate && recordOrParty;
}

export function resolveProductNoteFields(value) {
  const text = normalize(value);
  if (!hasProductNoteLookupCue(text)) return [];
  const asksServiceBuyerNote = /\b(?:hizmet\s+alan|alici|musteri)\p{L}*\b/iu.test(text);
  const asksCarrierNote = /\b(?:tasimacilik|tasimaci|tasiyici|nakliyeci)\p{L}*\b/iu.test(text);
  if (asksServiceBuyerNote || asksCarrierNote) {
    return [
      ...(asksServiceBuyerNote ? [{ key: "NOTE_COMPANY", domain: "OFFERS" }] : []),
      ...(asksCarrierNote ? [{ key: "NOTE_ROOM", domain: "OFFERS" }] : []),
    ];
  }
  return [{ key: "NOTE", domain: "OFFERS" }];
}

// A bounded numeric/property question can be a concrete field request even
// when it does not name a scalar noun such as "tutar". Keep this as a
// compositional evidence family: a product/record anchor, a bounded field
// noun, and value-question grammar must all be present. This prevents the
// generic cost-analysis cue from claiming referent-scoped limit questions
// without turning one financial word into FIELD_LOOKUP.
function hasBoundedFieldQuestionCue(text) {
  const fieldNoun = /\b(?:limit|sinir|tavan|taban|oran|kota|kapasite)\p{L}*\b/iu.test(text);
  const valueQuestion = /\b(?:ne|nedir|kac|kaç|ne\s+kadar|hangi)\b/iu.test(text);
  const productAnchor = /\b(?:odeme|ödeme|maliyet|butce|bütçe|gelir|gider|fatura|tahsilat|finans|sozlesme|sözleşme|anlasma|anlaşma|teklif)\p{L}*\b/iu.test(text);
  return fieldNoun && valueQuestion && productAnchor;
}

function hasRiskCue(text) {
  return /(?:risk|tehlike)\p{L}*/iu.test(text);
}

function hasCostAnalysisCue(text, conversationState = null, ui = null) {
  const value = normalize(text);
  return hasQuoteFloorAnalysisCue(value, conversationState, ui)
    || /\b(?:maliyet|butce|gider|karlilik|gelir|finans|fatura|hakediş|hakedis|tahsilat|odeme|ödeme)\p{L}*\b.{0,32}\b(?:ne|nedir|neden|nasil|nasıl|art|azal|degis|değiş|hesap|etki|fark|karsilastir|karşılaştır|kayna\p{L}*|dayanak\p{L}*|acikla\p{L}*|anlat\p{L}*|geliyor\p{L}*|hazır|hazir|eksik|aşama|asama|hangi|durum|var)\b/iu.test(value)
    || /\b(?:ne|nedir|neden|nasil|nasıl|hesap|etki|fark|kayna\p{L}*|dayanak\p{L}*|acikla\p{L}*|anlat\p{L}*|geliyor\p{L}*|hazır|hazir|eksik|aşama|asama|hangi|durum|var)\b.{0,32}\b(?:maliyet|butce|gider|karlilik|gelir|finans|fatura|hakediş|hakedis|tahsilat|odeme|ödeme)\p{L}*\b/iu.test(value);
}

// A quote-floor request is a computed financial preview, not a scalar field
// on an arbitrary offer record. Keep the evidence compositional: a canonical
// floor concept plus a question/calculation operator is required before the
// risk/cost route can outrank generic commercial field lookup.
// A visible financial screen can be asked about its own risks using natural
// attention grammar (for example "hangi risklere dikkat etmeliyim"). Keep
// that request with the current FINANCE owner when no record is selected;
// otherwise the generic NEXT_ACTION/deictic path can erase the screen scope.
function hasFinancialScreenRiskCue(text) {
  const value = normalize(text);
  const financialContext = /\b(?:finans|mali|odeme|hakedis|fatura|karlilik|maliyet|butce)\p{L}*\b/iu.test(value);
  const riskCue = /\b(?:risk|tehlike)\p{L}*\b/iu.test(value);
  const attentionCue = /\b(?:dikkat|kontrol|izle|bak)\p{L}*\b/iu.test(value);
  const questionCue = /\b(?:hangi|ne|nelere|neyi)\b/iu.test(value);
  return financialContext && riskCue && (attentionCue || questionCue);
}

function hasQuoteFloorContextualFollowUpCue(text, conversationState = null, ui = null) {
  const value = normalize(text);
  const deicticCalculation = /^(?:bu|bunun|bu\s+(?:tutar|deger|sonuc|rakam|bedel|miktar|para)\p{L}*)\b.*\b(?:nasil|hesap|detay|ayrinti|neden|acikla|anlat)\p{L}*\b/iu.test(value);
  if (!deicticCalculation) return false;
  const currentSurfaceText = [ui?.path, ui?.label, ui?.foregroundSurface?.key]
    .filter(Boolean)
    .join(" ");
  const hasLiveSurface = Boolean(currentSurfaceText);
  const currentSurfaceIsFinancial = /(?:financial-operations|teklif\s+ve\s+k[âa]rl[ıi]l[ıi]k|maliyet\s+ve\s+teklif)/iu.test(currentSurfaceText);
  // Historical financial turns cannot override a live non-financial surface.
  // The current authorized surface owns a deictic request unless it is itself
  // the financial surface that established the quote-floor context.
  if (hasLiveSurface && !currentSurfaceIsFinancial) return false;
  const previousRequest = conversationState?.lastSettledResult?.semanticPlan?.canonicalRequest
    || conversationState?.productContext?.semanticPlan?.canonicalRequest
    || conversationState?.lastSemanticPlan?.canonicalRequest
    || null;
  const previousRequestHasQuoteFloor = previousRequest?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true;
  const recentQuoteFloor = (Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages : [])
    .some((item) => /\b(?:teklif\s+taban\p{L}*|guvenli\s+taban\p{L}*|minimum\s+fiyat\p{L}*|quote\s+floor)\b/iu.test(normalize(item?.text)));
  return previousRequestHasQuoteFloor || recentQuoteFloor;
}

function hasUnresolvedQuoteFloorDeicticCue(text, conversationState = null, ui = null) {
  const value = normalize(text);
  const deicticCalculation = /^(?:bu|bunun|bu\s+(?:tutar|deger|sonuc|rakam|bedel|miktar|para)\p{L}*)\b.*\b(?:nasil|hesap|detay|ayrinti|neden|acikla|anlat)\p{L}*\b/iu.test(value);
  if (!deicticCalculation) return false;
  const currentSurfaceText = [ui?.path, ui?.label, ui?.foregroundSurface?.key]
    .filter(Boolean)
    .join(" ");
  const currentSurfaceIsFinancial = /(?:financial-operations|teklif\s+ve\s+k[âa]rl[ıi]l[ıi]k|maliyet\s+ve\s+teklif)/iu.test(currentSurfaceText);
  const hasLiveSelectedRecord = Boolean(
    (ui?.selectedEntityType && ui?.selectedEntityId)
      || (ui?.selectedRecordType && ui?.selectedRecordId)
      || ui?.selectedEntity?.id,
  );
  // Quote-floor deictic protection is a financial-surface contract.  A
  // selected agreement/offer/shift question such as “bu sözleşmenin
  // detaylarını anlat” must remain record-scoped and must not be rewritten
  // as financial clarification merely because it starts with “bu”.
  // Without a live financial surface or selected record, the same deictic
  // amount has no authorized referent and must remain fail-closed.
  if (currentSurfaceText && !currentSurfaceIsFinancial && hasLiveSelectedRecord) return false;
  return deicticCalculation && !hasQuoteFloorContextualFollowUpCue(value, conversationState, ui);
}

function hasQuoteFloorAnalysisCue(text, conversationState = null, ui = null) {
  const value = normalize(text);
  const floorConcept = /\b(?:teklif\s+taban\p{L}*|guvenli\s+taban\p{L}*|minimum\s+fiyat\p{L}*|quote\s+floor)\b/iu.test(value);
  const calculationQuestion = /\b(?:ne|nedir|toplam|toplami|kisi\s+basi|hesap|hesapla|hesaplandi|deger|degeri|oneri|onerilen|detay|ayrinti|ac|goster|gosterir|karsilastir|karşılaştır|marj|kar)\p{L}*\b/iu.test(value);
  return (floorConcept && calculationQuestion) || hasQuoteFloorContextualFollowUpCue(value, conversationState, ui);
}

function hasKnownTermDefinitionCue(text) {
  const value = normalize(text);
  if (!/(?:ne\s+demek|ne\s+ise\s+yar\p{L}*|ne\s+icin|nedir)\??$/iu.test(value)) return false;
  return explainTermsFromText(value, 1).length > 0;
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

// Operation-health metric questions are read-only questions about the
// current ROOM projection contract.  They are intentionally structural:
// metric/projection language must be paired with an explanatory, comparison,
// issue-subset, or classification cue.  This keeps the canonical semantic
// owner ahead of generic screen help without creating a second classifier.
function operationHealthMetricMode(text, ui = {}) {
  const roomSurface = String(ui?.surfaceRole || '').toUpperCase() === 'ROOM'
    || (/\/room\/operation-health\b/iu.test(String(ui?.path || '')) && !/\/(?:school|organization)\//iu.test(String(ui?.path || '')));
  if (!roomSurface || !/\/room\/operation-health\b/iu.test(String(ui?.path || ''))) return '';
  const value = normalize(text);
  const questionCue = /\b(?:ne|neden|hangi|hangileri|ayni|mi|goster|ac|incele|anlam|say|gör|gor|görünüyor|gorunuyor)\p{L}*\b/iu.test(value);
  const metricCue = /\b(?:sayi|sayac|ozet|detay|gunluk|toplam|sifir|rakam|deger|degerleri|iki|uc)\p{L}*\b/iu.test(value);
  const issueCue = /\b(?:sorun|problem|aksaklik|ariza|uyari|operasyon|gps|konum|canlilik|surucu|arac)\p{L}*\b/iu.test(value);
  const projectionCue = /\b(?:ozet|detay|gunluk|rapor|sayi|sayac|toplam|sifir|iki|uc)\p{L}*\b/iu.test(value);
  const metricTargetCue = /\b(?:satir|kart|bolum|sekme|tab)\p{L}*\b/iu.test(value);
  const gpsSubsetCue = /\b(?:gps|konum|canlilik|eski|guncels+degil|cevrims+disi|offline)\p{L}*\b/iu.test(value)
    && (/\b(?:sorun|surucu|arac|say|hang|ayni)\p{L}*\b/iu.test(value) || metricTargetCue);
  const deviceRiskCue = (
    /\b(?:riskli\s+cihaz|riskli\s+cihazlar)\p{L}*\b/iu.test(value)
    || (/\b(?:cihaz|ekipman|donanim|donanım)\p{L}*\b/iu.test(value)
      && /\brisk\p{L}*\b/iu.test(value))
  ) && questionCue;
  const agreementClassificationCue = /\b(?:sozlesme|anlasma|inceleme|bekleyen)\p{L}*\b/iu.test(value)
    && /\b(?:operasyon|ariza|sorun|problem|say)\p{L}*\b/iu.test(value);
  const metricDefinitionCue = /\b(?:sayac|sayi|ozet|detay|rakam|deger)\p{L}*\b/iu.test(value)
    && questionCue;
  if (gpsSubsetCue && questionCue) return 'GPS_ISSUE_SUBSET';
  if (deviceRiskCue) return 'METRIC_DEFINITION';
  if (projectionCue && questionCue && (metricCue || /\b(?:ayni|neden)\b/iu.test(value))) return 'PROJECTION_CONTRACT';
  if (agreementClassificationCue && questionCue) return 'OPERATIONAL_CLASSIFICATION';
  if (metricDefinitionCue) return 'METRIC_DEFINITION';
  if (issueCue && /\b(?:hang|hangi|neden|say)\p{L}*\b/iu.test(value)) return 'ISSUE_METRIC_SCOPE';
  return '';
}

function hasIssueDiagnosticCue(text) {
  const value = normalize(text);
  const disruption = /(?:sorun|problem|sikinti|aksak|aksayan|ters(?:\s+giden|\s+gidiyor)?|ariza)\p{L}*/iu.test(value)
    // A stale GPS/position value is itself the reported operational
    // disruption. Keep this bounded to the telematics vocabulary so generic
    // "neden güncel değil" questions do not become diagnostics.
    || (/(?:gps|konum|arac|takip)\p{L}*/iu.test(value)
      && /(?:guncel\s+degil|guncel\s+olmayan|eski|cevrim\s+disi|offline|calismiyor|calismayan)\p{L}*/iu.test(value));
  if (!disruption) return false;
  const diagnosticOperation = /\b(?:hangi\p{L}*|hangisi\p{L}*|ne\p{L}*|nerede\p{L}*|neden\p{L}*|var\s+mi|gor(?:uyor|uyor\s+musun)|sirala\p{L}*|listele\p{L}*|anlat\p{L}*|acikla\p{L}*|teshis\p{L}*|incele\p{L}*|degerlendir\p{L}*|kontrol\p{L}*|baslik\p{L}*|olustur\p{L}*|cikar\p{L}*|asil|gercekten|ayir\p{L}*)\b/iu.test(value);
  if (!diagnosticOperation) return false;
  // A named record's status remains a field lookup unless the user is asking
  // the diagnostic question itself (for example, "hangi durum sorun?").
  const explicitRecordStatus = /(?:teklif|vardiya|sefer|arac|sozlesme|kayit)\p{L}*.{0,24}(?:durum|statu|status)\p{L}*/iu.test(text)
    && !/(?:hangi\s+durum.*(?:sorun|problem)|(?:sorun|problem).*hangi\s+durum)/iu.test(text);
  return !explicitRecordStatus;
}

// Issue verbs such as "incele" are also used by the surface-navigation
// grammar. When they are attached to a concrete GPS/problem subject without
// naming a screen or tab, the issue itself is the object of the request; do
// not let the generic vehicle-surface target win first.
function hasCanonicalIssueDiagnosticRequest(text) {
  const value = normalize(text);
  const navigationWithoutInspection = hasTurkishDirectionalNavigationPredicate(value)
    || /\b(?:nerede|nerde|ac(?!ik)\p{L}*|goster\p{L}*)\b/iu.test(value);
  return hasIssueDiagnosticCue(value)
    && !hasScreenSurfaceCue(value)
    && !navigationWithoutInspection;
}

function hasOperationHealthIssueViewCue(text, screenContext = null) {
  if (!/\/room\/operation-health\b/iu.test(String(screenContext?.path || ''))) return false;
  const value = normalize(text);
  const issue = /(?:sorun|problem|sikinti|aksak|aksayan|ters(?:\s+giden|\s+gidiyor)?|ariza|gps|konum|canlilik|cevrim\s+disi|offline|eski)\p{L}*/iu.test(value);
  const view = /\b(?:goster|ac(?!ik)\p{L}*|incele(?!me)\p{L}*)\b/iu.test(value);
  const explicitNavigation = /\b(?:sekme|tab|ekran|sayfa|panel|merkez|menu|git|gotur|gec)\p{L}*\b/iu.test(value);
  return issue && view && !explicitNavigation;
}

function hasDateRangeCue(text) {
  return /(?:hangi|ne)\s+(?:saat|zaman)/iu.test(text)
    || /(?:saatler|tarih\s+araligi|baslangic\p{L}*\s*[-/]?\s*bitis\p{L}*|baslama\p{L}*\s*[-/]?\s*bitis\p{L}*)/iu.test(text)
    || /(?:basla\p{L}*.*bit\p{L}*|bit\p{L}*.*basla\p{L}*|kactan\s+kaca|saat\p{L}*\s+aralig\p{L}*)/iu.test(text);
}

function hasScreenSurfaceCue(text) {
  return /(?:ekran|sayfa|panel|menu|sekme|tab|bolum|bura|burda|burasi|burdaki|buradaki|calisma\s+alani|modul|bulundugum\s+yer)\p{L}*/iu.test(text);
}

function hasScreenDetailCue(text) {
  return hasScreenDeicticCue(text)
    && /\b(?:detayli\p{L}*\s+)?(?:acikla|anlat)\p{L}*\b/iu.test(text);
}

// Navigation is a behavior class, not a fixed phrase shape.  Surface names
// remain the unique target evidence; these movement verbs only establish that
// the user is asking to open or move to that known surface.
function hasExplicitSurfaceNavigationVerb(text) {
  const value = normalize(text);
  return hasTurkishDirectionalNavigationPredicate(value)
    || /\b(?:nerede|nerde|ac(?!ik)\p{L}*|goster\p{L}*|incele\p{L}*)\b/iu.test(value);
}

// An agreement's operation bridge is a selected-record surface, not the
// generic Operations Center. Keep this as a composed semantic relation:
// agreement + operational process + a safe view/navigation request.
function hasAgreementOperationBridgeCue(text, uiContext = null) {
  const value = normalize(text);
  const agreement = /\b(?:sozlesme|anlasma|agreement|contract|kontrat)\p{L}*\b/iu.test(value)
    || /\boperasyon\s+kopru(?:su|sunun|sunu)?\b/iu.test(value);
  const process = /\b(?:operasyon|vardiya|sefer|kopru|baglant|ilisk|uretilen)\p{L}*\b/iu.test(value);
  const view = hasExplicitSurfaceNavigationVerb(value)
    || /\b(?:var\s+mi|nereden|hangi\s+ekran|ilgili\s+ekran)\b/iu.test(value);
  // A selected agreement is a valid deictic subject for phrases such as
  // “Bunun operasyon köprüsünü göster”. Keep the bridge intent bound to the
  // live selected-record envelope; without that envelope the same wording
  // must not invent an agreement target or fall back across tenants.
  const selectedAgreement = String(uiContext?.selectedType || '').toUpperCase() === 'AGREEMENT'
    && Number(uiContext?.selectedId || 0) > 0;
  const deicticBridge = selectedAgreement
    && process
    && view;
  return (agreement && process && view) || deicticBridge;
}

// A short Turkish verb stem must not be allowed to consume a longer noun or
// explanatory verb.  In particular, “görevini” is not “gör” and “açıkla” is
// not “aç”.  Keep the matcher compositional so inflected real-user forms stay
// supported without turning arbitrary prefixes into action truth.
function hasExplicitSurfaceViewVerb(text) {
  const value = normalize(text);
  return /\b(?:goruntule|listele|incele)\p{L}*\b/iu.test(value)
    // Keep the bare imperative bounded to the complete word. A generic
    // `gor\p{L}*` prefix also matches the noun `görüş` in role-help and
    // ownership questions, turning them into surface VIEW requests.
    || /\b(?:gor)\b/iu.test(value)
    || /\b(?:goruyor|goruyorum|goruyoruz|gorursun|gordum|gordun|gordu|gordugum|gorecek|gorecegim|gormek|gormeye|gorunuyor)\p{L}*\b/iu.test(value);
}

// An explicit request to explain the currently visible surface is a
// current-screen question, even when an older guided task still exists in the
// conversation state.  Keep this semantic class ahead of active-target
// explanation so a route/surface change cannot make the old task describe the
// wrong screen.  Target-specific wording (for example "bu adım ne?") remains
// with the active guided task below.
function hasExplicitCurrentScreenPurposeCue(text) {
  const value = String(text || "");
  // A deictic section-purpose question is current-surface help when no more
  // specific live target evidence takes precedence. Screen/page/panel/section
  // wording remains current-surface help; live block resolution still runs
  // earlier for genuinely target-specific workflow questions.
  const surface = /\b(?:bu|su)(?:\s+\p{L}+){0,5}\s+(?:ekran|sayfa|panel|bolum)\p{L}*\b/iu;
  const explain = /\b(?:anlat|acikla|açıkla|ne\s+ise\s+yar\p{L}*|ne\s+icin|ne\s+yapabil\p{L}*|nasıl\s+calis\p{L}*|nasil\s+calis\p{L}*)\b/iu;
  // A current-surface purpose request can express its operation inventory
  // before or after the interrogative (for example, “hangi işlemleri
  // gerçekleştirebilirim?” or “sunduğu görevler neler?”). Keep this
  // structural so Turkish inflection and word order stay in one semantic
  // class without adding a literal question rule.
  const operationInventory = /(?:\b(?:hangi|ne|neler)\s+(?:\p{L}+\s+){0,4}(?:yap|sun|gerceklestir|kullan|yurut)\p{L}*\b|\b(?:yap|sun|gerceklestir|kullan|yurut)\p{L}*(?:\s+\p{L}+){0,4}\s+\b(?:ne|neler|hangi)\b)/iu;
  const roleCapabilityScope = /\b(?:bu|su|şu)\s+rol(?:de|deki|un|ün|u|ü|ler(?:de|deki)?)\b/iu.test(value);
  const currentScreenOperationInventory = operationInventory.test(value) && !roleCapabilityScope;
  const screenDeictic = hasScreenDeicticCue(value);
  const screenUsage = /(?:^|\b)(?:bu|şu|su)\s+(?:ekran|sayfa|panel)\p{L}*\s+(?:(?:nasıl|nasil)\s+(?:kullan|ilerle|başla|basla)\p{L}*|nereden\s+(?:başla|basla)\p{L}*)\b/iu.test(value);
  const deicticWorkArea = /\b(?:nasıl|nasil)\s+(?:çalış|calis)\p{L}*\s+(?:bu|şu|su)\b/iu.test(value)
    || /\b(?:bu|şu|su)\s+(?:nasıl|nasil)\s+(?:çalış|calis)\p{L}*\b/iu.test(value);
  const currentScreenFocus = /\b(?:neye|nelere|nerelere)\s+bak(?:mam|mal[ıi]y[ıi]m|ay[ıi]m)\b/iu.test(value)
    || /(?:^|\s)(?:ilk|önce|once|şimdi|simdi)\s+(?:olarak\s+)?neyi\s+kontrol\s+(?:et|ed)(?:meliyim|meliyiz|eyim|elim|eyelim|sem)\b/iu.test(value)
    || /\bhangi\s+\p{L}+(?:\s+\p{L}+){0,3}\s+(?:önce|once|ilk)\s+(?:incele|bak|kontrol)\p{L}*\b/iu.test(value);
  return (surface.test(value) && (explain.test(value) || currentScreenOperationInventory || currentScreenFocus || screenUsage))
    || (screenDeictic && currentScreenOperationInventory)
    || deicticWorkArea
    || (hasScreenDeicticCue(value) && currentScreenFocus);
}

// These are situated help requests even when the user omits the literal
// screen/page/panel noun. The caller still requires an authorized live path;
// this helper only supplies the speech-act evidence for that surface.
function hasSituatedCurrentSurfaceGuidanceCue(text) {
  const value = normalize(text);
  return hasExplicitCurrentScreenPurposeCue(value)
    || /\b(?:neye|nelere|nerelere)\s+bak(?:mam|mal[ıi]y[ıi]m|ay[ıi]m)\b/iu.test(value)
    || /\b(?:bana\s+)?yard[ıi]m\s+et\b/iu.test(value)
    || /\b(?:program|uygulama|platform|sistem)\p{L}*\s+kullanmay[ıi]\s+bana\s+(?:öğret|ogret)\p{L}*\b/iu.test(value)
    || /\b(?:burada|burda)\s+(?:ne\s+yapabilirim|nereden\s+baslamal[ıi]y[ıi]m|sorun|problem|dikkat)\b/iu.test(value)
    || /\bne\s+yapmam\s+gerekiyor\b/iu.test(value)
    || /\b(?:bana\s+)?ad[ıi]m\s+ad[ıi]m\s+(?:göster|goster|anlat|açıkla|acikla)\b/iu.test(value);
}

// A situated “neden gerekli/önemli?” question is a purpose question about
// the currently authorized surface when no record or role is named. Keep it
// compositional so the live screen supplies the subject instead of routing
// the user into role-global help.
function hasCurrentSurfaceWhyCue(text) {
  const value = normalize(text);
  return /\b(?:neden|niye|nicin)\s+(?:gerekli|onemli|kullanil(?:ir|iyor)|var)\b/iu.test(value);
}

// A user may name the current surface and ask where to start without using a
// literal "screen/page/panel" noun (for example, "Finansal operasyonlarda
// önce neye bakılır?"). With an authorized live route and no record target,
// this is still current-surface guidance. Keep the grammar compositional so
// the active surface supplies the context instead of adding phrase-specific
// answers.
function hasCurrentSurfaceFocusCue(text, ui) {
  if (!ui?.path) return false;
  const value = normalize(text);
  const focusQuestion = /\b(?:once|önce|ilk|simdi|şimdi|sirada|sırada|oncelikle|öncelikle)\s+(?:olarak\s+)?(?:neyi|neye|nelere|hangi\s+\p{L}+)?\s*(?:bak|kontrol|incele|degerlendir|değerlendir|gozden\s+gecir|gözden\s+geçir)\p{L}*\b/iu.test(value)
    || /\b(?:neyi|neye|nelere)\s+(?:bak|kontrol|incele|degerlendir|değerlendir|gozden\s+gecir|gözden\s+geçir)\p{L}*\b/iu.test(value);
  return focusQuestion && !hasCardinalityCue(value) && !hasSelectedRecordIdentityCue(value, ui);
}

function hasNamedSurfaceExplanationCue(text) {
  const value = normalize(text);
  return /\b(?:ekran|sayfa|panel|menu|bolum)(?:i|u|yi|yu|ini|unu|yini|yunu|in|nin|un|nun|inin|unun)\b.{0,64}\b(?:anlat|acikla|ogren|nasil\s+calis|ne\s+ise\s+yar)\p{L}*/iu.test(value);
}

function hasExplicitSurfaceSemanticOperation(text) {
  const value = normalize(text);
  return /\b(?:gec|git|gidelim|ulas|ilerle|goster|goruntule|listele|incele)\p{L}*\b/iu.test(value)
    // `açtığı`/`açtım` can describe a relationship or prior state rather than
    // an imperative navigation request; the canonical action classifier owns
    // those forms.  Do not use the short `ac` stem as a role-help veto here.
    || /\b(?:ac|acalim|aciniz|acmak|acmaya)\b/iu.test(value);
}

function allowsConcreteRoleHelpAspect(evidence, reference) {
  const aspect = String(evidence?.roleAspect?.value || "").toUpperCase();
  if (ROLE_HELP_CONCRETE_ASPECTS.has(aspect)) return true;
  if (!['BOUNDARY', 'LIMITATION'].includes(aspect) || reference !== 'ABSENT') return false;
  const relation = String(evidence?.relation?.value || '').toUpperCase();
  const polarity = String(evidence?.polarity?.value || '').toUpperCase();
  return relation === 'OWNERSHIP' || polarity === 'NEGATIVE';
}

// A user who names the visible control class is asking for control guidance,
// not a purpose summary for the enclosing screen.  The canonical target
// resolver still proves the exact live control; this only preserves the
// semantic scope until that resolver runs.
function hasExplicitButtonExplanationCue(text) {
  const value = String(text || '');
  return /\b(?:bu|şu|su)\s+buton\p{L}*\b.{0,24}\b(?:ne|neden|niye|acikla|açıkla|ise\s+yar|işe\s+yar)\b/iu.test(value)
    || /\bbuton\p{L}*\b.{0,24}\b(?:ne\s+ise\s+yar|nerede|hangisi)\b/iu.test(value);
}

function hasDirectCurrentScreenExplanationCue(text) {
  const value = String(text || "");
  return /\b(?:bu|su)\s+(?:ekran|sayfa|panel|bolum|bölüm)\p{L}*\s+(?:anlat|acikla|açıkla)\p{L}*\b/iu.test(value);
}

function hasStepByStepTeachingCue(text) {
  return /\b(?:adım\s+adım|adim\s+adim|aşama\s+aşama|asama\s+asama)\s+(?:anlat|açıkla|acikla|göster|goster|incele|inceleyelim|bak|bakalım|bakalim)\p{L}*\b/iu.test(String(text || ""));
}

function hasTeachFromZeroCue(text) {
  return /\b(?:buray(?:ı|i)|burada|burda|bu\s+ekran(?:ı|i)|bu\s+sayfa(?:yı|yi)|bunu)\b.{0,42}\b(?:hiç\s+bilmi(?:yorum|yoruz)|bilmiyor(?:um|uz)|tanımıyor(?:um|uz)|kullanmad(?:ım|im)|öğret(?:ir|in)?|ogret(?:ir|in)?|anlat(?:ır|ın)?|basindan\s+anlat|başından\s+anlat)\b/iu.test(text)
    || /\b(?:baştan|başından|bastan|basindan)\s+anlat\b/iu.test(text)
    // Step-by-step teaching is resolved separately when a live/persisted
    // workflow exists.  Without that grounding, the phrase alone must not
    // turn an analytical request into current-screen help.
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
  // Colloquial Turkish often contracts "ne yaparım" into "naparım".
  // When it is anchored to the current surface, it is still a situated
  // product-help request rather than general conversation or a record field.
  const situatedActionQuestion = /\b(?:burada|burda|bu\s+ekranda|bu\s+sayfada)\s+(?:ne\s+)?(?:yap|nap)\p{L}*\b/iu.test(text);
  // Colloquial first-person forms such as "napmam gerek burda" and
  // "burayı anlamadım" are still situated UI-help requests when no active
  // guided task is available. Keep them in the screen-context family instead
  // of letting the generic conversation fallback call them off-topic.
  const situatedRecoveryQuestion = /\b(?:burada|burda|bu\s+ekranda|bu\s+sayfada)\s+(?:ne\s+)?(?:yapmam|napmam)\s+gerek\b/iu.test(text)
    || /\bburay(?:ı|i)\s+anlamad(?:ı|i)m\b/iu.test(text);
  // A first-time user can ask for instruction without naming the screen
  // explicitly.  When the request is anchored to “burayı/burada”, the
  // authorized current screen is the only safe teaching context.
  const situatedLearningRequest = hasTeachFromZeroCue(text);
  // “Nerede bu?” / “hangi yer?” is a real user discovery request.  With a
  // current authorized surface it should remain contextual (or ask for a
  // narrower target), never fall into generic off-topic chat.
  const bareSurfaceDiscovery = /^(?:nerede\s+bu|neresi\s+bu|hangi\s+yer|goster|göster)\??$/iu.test(text);
  const situatedWhyRequest = /\b(?:bunu|buray(?:ı|i)|burada|burda)\s+(?:neden|niye)\b/iu.test(text);
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
    || ((situatedReference && orientationOperation) || selfLocatedProgress || workflowSelfLocation || situatedActionQuestion || situatedRecoveryQuestion || situatedLearningRequest || situatedWhyRequest)
    || bareSurfaceDiscovery;
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

function hasSelectedRecordActionReference(text, ui = {}) {
  // Generic prioritisation such as "ilk iş ne" belongs to the current screen.
  // A selected record is a target only when the user actually points at it.
  const directDeicticShow = Boolean(ui?.selectedId && ui?.selectedType)
    && /^(?:bu|bunu|su|sunu|onu)\s+(?:goster|göster|ac|aç|incele|bak)\p{L}*\s*[.!?]?$/iu.test(String(text || "").trim());
  return directDeicticShow
    || /(?:bu|su|secili|baktigim|acik)\s+(?:kayit|kart|teklif|vardiya|sefer|arac|sozlesme)\p{L}*.{0,28}(?:ne\s+yap|once|ilk|bak|incele|coz|hallet|oncelik|adim)/iu.test(text);
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
    || hasProductNoteLookupCue(text)
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
  const screenSelectedReference = /\b(?:burada|burda|bu\s+ekranda|buradaki)\s+(?:hangi|hangisi)\s+(?:vardiya|sefer|shift|teklif|arac|plaka|surucu|sofor|sozlesme|kayit)\p{L}*\s+(?:secil|acik)\p{L}*/iu.test(text);
  if (!ui.selectedId || !ui.selectedType || (hasExplicitRelationCue(text) && !screenSelectedReference)) return false;
  // A deictic screen-purpose question identifies the current surface, not
  // the selected record carried by the shell.  Keep this exclusion here as
  // well as in inferTask so scope derivation cannot reintroduce stale record
  // authority after the semantic task has been classified as SCREEN_CONTEXT.
  if (hasScreenDeicticCue(text) && /(?:ne\s+ise\s+yar\p{L}*|ne\s+icin|nasil\s+calis\p{L}*|burada\s+ne\s+yap\p{L}*|burda\s+ne\s+yap\p{L}*)/iu.test(text)) return false;
  // A broad product frame such as “bu platformda hangi işlerden
  // sorumluyum?” is role/global help. The selected card is only context;
  // it must not become a record identity without a record/relation cue.
  if (hasExplicitProductLevelHelpCue(text)
    && !hasSelectedRecordCue(text)
    && !hasExplicitRelationCue(text)) return false;
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
    || screenSelectedReference
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
  return selectedRecordReference || possessiveRecordField || hasProductNoteLookupCue(text);
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
  // Do not treat the lexical stem in "sözleşmeden" as the standalone
  // vocabulary marker "söz".  Contract-to-shift requests are product
  // relations, not creative-output requests.
  const vocabularyFraming = /\b(?:kelime|sozcuk|sozcug|soz(?!lesme\p{L}*))\p{L}*\b/iu.test(text);
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
  return /\b(?:detay|ayrinti)\p{L}*\b/iu.test(text)
    || hasAnyTerm(text, [
    "icerik", "icerigi", "icerigini", "detay", "detayi", "detaylari", "ayrinti", "ayrintisi", "ayrintilari",
    "icinde ne var", "neler var", "ne iceriyor", "ne icerir", "detayini ac", "ayrintisini anlat",
    ]);
}

function hasSelectedRecordExplanationCue(text, ui = {}) {
  if (!(ui.selectedId && ui.selectedType)) return false;
  const selectedTypeTerms = {
    AGREEMENT: "(?:sozlesme|anlasma)",
    OFFER: "(?:teklif|offer)",
    SHIFT: "(?:vardiya|sefer|shift)",
    VEHICLE: "(?:arac|vehicle)",
    DRIVER: "(?:surucu|sofor|driver)",
  }[String(ui.selectedType || "").toUpperCase()];
  const namedSelectedRecord = selectedTypeTerms
    ? new RegExp(`\\b(?:bu|su|şu)\\s+${selectedTypeTerms}\\p{L}*\\b`, "iu").test(text)
    : false;
  if (!hasSelectedRecordCue(text) && !hasSelectedRecordIdentityCue(text, ui) && !namedSelectedRecord) return false;
  if (hasDirectFieldLookupCue(text) || hasCardinalityCue(text) || hasExplicitRelationCue(text)) return false;
  return /\b(?:anlat|acikla|ozetle|bilgi\s+ver|bakabilir\s+m[ıi]y[ıi]z|incele)\p{L}*\b/iu.test(text);
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
    || /\bstat(?:u|us)\p{L}*/iu.test(text) || hasDateRangeCue(text)
    || hasBoundedFieldQuestionCue(text) || hasValueLookupCue(text)
    || hasProductNoteLookupCue(text);
}

function hasCurrentAssignmentCue(text) {
  return hasAnyTerm(text, [
    "aktif gorev", "mevcut gorev", "gorevim", "aktif vardiyam", "mevcut vardiyam",
    "bagli arac", "hangi araca bagli", "aracim hangisi", "aktif aracim", "mevcut aracim", "plakam", "servis aracim",
    "rotam", "duraklarim", "simdi hangi arac", "bugun hangi arac",
  ]);
}

// A selected vehicle/driver relationship request is a traversal task, even
// when the user phrases it as an assignment or connection status question.
// Keep this at the canonical task boundary so screen-help and field fallback
// cannot replace the requested relation before authorization/execution.
function selectedRelationshipTraversalTarget(text, ui = {}) {
  const selectedType = String(ui?.selectedType || "").toUpperCase();
  if (!ui?.selectedId || !selectedType) return null;
  const relationCue = /\b(?:bagl\p{L}*|ilisk\p{L}*|atam\p{L}*|atanan\p{L}*|vardiya\p{L}*|sefer\p{L}*|shift\p{L}*|arac\p{L}*|vehicle|surucu\p{L}*|sofor\p{L}*)\b/iu.test(text);
  if (!relationCue) return null;
  if (selectedType === "VEHICLE" && /\b(?:vardiya\p{L}*|sefer\p{L}*|shift|atam\p{L}*|baglanti\p{L}*)\b/iu.test(text)) return "SHIFT";
  if (selectedType === "DRIVER") {
    if (/\b(?:arac\p{L}*|vehicle|plaka\p{L}*)\b/iu.test(text)) return "VEHICLE";
    if (/\b(?:vardiya\p{L}*|sefer\p{L}*|shift|atam\p{L}*|baglanti\p{L}*)\b/iu.test(text)) return "SHIFT";
  }
  if (selectedType === "SHIFT") {
    if (/\b(?:arac\p{L}*|vehicle|plaka\p{L}*)\b/iu.test(text)) return "VEHICLE";
    if (/\b(?:surucu\p{L}*|sürücü\p{L}*|sofor\p{L}*|şoför\p{L}*)\b/iu.test(text)) return "DRIVER";
  }
  return null;
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

function hasNaturalBackCue(text) {
  const value = normalize(text).trim();
  const previousReference = /\b(?:onceki|evvelki)\b/u.test(value);
  const stepReference = /\b(?:adim|asama|aciklama|kisim|bolum|safha|nokta)\p{L}*\b/u.test(value);
  const transitionCue = /\b(?:don|gel|git|gec)\p{L}*\b/u.test(value);
  const revisitCue = /\b(?:yeniden|tekrar|bir\s+daha)\b/u.test(value)
    && /\b(?:gor|goster|anlat|acikla)\p{L}*\b/u.test(value);
  const relativeStepBack = /\b(?:bir\s+)?adim\p{L}*\s+(?:geri|geriye)\b/u.test(value);
  return relativeStepBack
    || (previousReference && stepReference && (transitionCue || revisitCue));
}

function hasCanonicalContinuationTask(conversationState = null) {
  if (conversationState?.activeGuidedTask?.semanticPlan) return true;
  if (conversationState?.lastSettledResult?.analyticStepState) return true;
  const plans = [
    conversationState?.lastSettledResult?.semanticPlan,
    conversationState?.authorizedProductContext?.semanticPlan,
    conversationState?.lastProductSemanticPlan,
    conversationState?.lastSemanticPlan,
  ];
  return plans.some((plan) => Boolean(plan && (
    plan.continuationIntent === true
    || (Array.isArray(plan.requestedDomains) && plan.requestedDomains.length > 0)
    || (Array.isArray(plan.entities) && plan.entities.length > 0)
    || Boolean(plan.relationshipIntent)
    || ['RISK_RANKING', 'COMPARISON', 'PRIORITY', 'CAUSE_WHY', 'CONTINUE_CURRENT_REASONING', 'UI_GUIDANCE', 'GENERIC_PRODUCT_HELP', 'ROLE_EXPLANATION_HELP', 'RELATION_LOOKUP', 'FIELD_LOOKUP', 'RECORD_DETAILS', 'SCREEN_CONTEXT', 'EXPLAIN_CURRENT_TARGET'].includes(String(plan.family || '').toUpperCase())
  )));
}

function continuationActionFor(text) {
  // This is a discourse operation over the already authorized task. It never
  // adds a domain, entity, permission, or business execution request.
  if (hasActiveGuidanceFailureCue(text) || /\b(?:bulamad|goremiyor|yanlis\s+ekran|dediğin\s+yer\s+yok|dedigin\s+yer\s+yok|söylediğin\s+yer\s+yok|soyledigin\s+yer\s+yok|tekrar\s+goster)\p{L}*/iu.test(text)) return "RECOVER";
  if (/\b(?:yapam\p{L}*|olmuyor|beceremedim|burada\s+kaldım|burada\s+kaldim|yardım\s+et|yardim\s+et|burayı\s+anlamadım|burayi\s+anlamadim|napmam\s+gerek\s+burda|napmam\s+gerek\s+burada)\b/iu.test(text)) return "RECOVER";
  if (/\b(?:niye|neden)\s+(?:ilerlemiyor|ilerlemiyo|olmuyor|olmadı|olmadı)\b/iu.test(text)) return "RECOVER";
  if (/^geri\b|\bgeri\s+(?:don|gel)\p{L}*/iu.test(text) || hasNaturalBackCue(text)) return "BACK";
  if (/\b(?:ekledim|ekledik|yaptim|yaptım|tamamladim|tamamladım|ice\s+aktardim|içe\s+aktardım)\b/iu.test(text)
    && /\b(?:sonra|simdi|şimdi|devam|ne|nap|olacak|yap)\b/iu.test(text)) return "NEXT";
  if (/\bsonraki\s+(?:kisim|kismi|kısmı)\s+(?:anlat|acikla|açıkla)\p{L}*\b/iu.test(text)) return "NEXT";
  if (/\b(?:sonraki\s+adım(?:a)?\s+geç|sonraki\s+adima\s+gec|sonra\s+ne\s+yap(?:ayım|ayim|alım|alim)|şimdi\s+ne\s+yap(?:ayım|ayim|alım|alim)|simdi\s+ne\s+yap(?:ayim|alim)|tamam(?:\s+(?:tıkladım|tikladim|bastım|bastim|yaptım|yaptim))?\s+sonra)\b/iu.test(text)) return "NEXT";
  if (/\b(?:adim\s+adim|detayli|devamini|daha\s+fazla|biraz\s+daha)\s+(?:anlat|acikla)\p{L}*/iu.test(text)) return "EXPAND";
  if (hasStandaloneNextCue(text)) return "NEXT";
  return "CONTINUE";
}

// Restart is a typed task transition, not continuation. Keep the grammar
// behavior-based so “baştan anlat” (re-explain) remains EXPLAIN while an
// explicit start-over request is represented separately in the canonical
// request without introducing a new action enum.
function hasTaskRestartCue(text) {
  const value = String(text || "");
  return /\b(?:baştan|bastan)\s+(?:al|başla|basla|başlat|baslat|başlayalım|baslayalim|kur|oluştur|olustur)\p{L}*\b/iu.test(value)
    || /\b(?:yeniden|sıfırdan|sifirdan)\s+(?:başla|basla|başlat|baslat|başlayalım|baslayalim|kur|oluştur|olustur)\p{L}*\b/iu.test(value)
    || /\bgeri\s+(?:başa|basa|başlangıca|baslangica)\s+(?:dön|don|gel)\b/iu.test(value);
}

function hasActiveGuidedTask(conversationState = null) {
  return Boolean(conversationState?.activeGuidedTask?.semanticPlan);
}

// Failure language is a semantic operation over the live guided task/target.
// Keep the vocabulary stem-based so inflections and colloquial forms rejoin
// the active product task without making any one utterance a production rule.
function hasActiveGuidanceFailureCue(value) {
  return /\b(?:yapam|olmuyor|acilam|açılam|acilm|açılm|calismiyor|çalışmıyor|basam|baslatam|başlatam|bulam|ilerleyem|devam\s+edem|takilam|takılam|gorem|görem)\p{L}*\b/iu.test(String(value || ""))
    || /\b(?:dediğin|dedigin|söylediğin|soyledigin)\s+yer\s+yok\b/iu.test(String(value || ""))
    || /\btekrar\s+(?:goster|göster)\p{L}*\b/iu.test(String(value || ""))
    // Users also report a missing guided destination by naming its visible
    // control class (“o menü yok”, “bu sekme yok”).  Keep this structural:
    // the live authorized surface still has to prove the exact target below.
    || /\b(?:(?:bu|o|dediğin|dedigin|söylediğin|soyledigin)\s+)?(?:menü|menu|sekme|tab|buton|alan|ekran|sayfa|panel|bölüm|bolum)\p{L}*\s+yok\b/iu.test(String(value || ""));
}

function hasCurrentGuidedTargetExplanationCue(text, conversationState = null) {
  if (!hasActiveGuidedTask(conversationState) && conversationState?.guidedTarget?.status !== 'FOUND') return false;
  const normalizedText = String(text || '').trim();
  const activeStepLabel = String(conversationState?.activeGuidedTask?.semanticPlan?.workflowStepReference?.label || '').trim();
  const normalizedStepLabel = activeStepLabel.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const stepPurposeCue = /\b(?:neden|niye)\s+(?:gerekli|önemli|onemli)\b/iu.test(normalizedText)
    && (!normalizedStepLabel || normalizedText.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').includes(normalizedStepLabel));
  const afterCompletedAction = normalizedText.replace(/^(?:(?:tamam\s+)?(?:bastim|tikladim|yaptim)\s+)/iu, '');
  return /^(?:(?:buras[ıi]|burasi|bu|şu|su)\s+(?:ne|alan\s+ne|buton\s+ne(?:\s+ise\s+yar(?:ı|i)yor)?|ne\s+ise\s+yar(?:ı|i)yor|kısmı\s+anlat|kismi\s+anlat|açıkla|acikla)|bu\s+ekran\s+ne\s+(?:için|icin)(?:\s+var)?|bu\s+sayfa\s+ne\s+(?:için|icin)(?:\s+var)?|bu\s+panel\s+ne\s+(?:için|icin)(?:\s+var)?)\??$/iu.test(afterCompletedAction)
    || /\b(?:burada|burda)\s+ne\s+yap(?:ıyorum|iyorum|acagim|acağım)\b/iu.test(text)
    || /^ne\s+yap(?:acağım|acagim|ayım|ayim|yapacağım|yapacagim)\??$/iu.test(String(text || '').trim())
    || /\b(?:neden)\s+(?:bunu|bunu\s+)?yap(?:ıyorum|iyorum|ıyoruz|iyoruz)\b/iu.test(text)
    || /\b(?:bu\s+buton|bu\s+alan|bu\s+kısım|bu\s+kisim|buradaki\s+alan)\b.{0,24}\b(?:ne|açıkla|acikla|işe\s+yar|ise\s+yar)\b/iu.test(text)
    || stepPurposeCue;
}

function hasActiveTaskResumeCue(text, conversationState = null) {
  if (!hasActiveGuidedTask(conversationState)) return false;
  return /\b(?:vardiya|sefer|shift)\p{L}*\b.{0,32}\b(?:oluşturacaktık|olusturacaktik|oluşturuyorduk|olusturuyorduk|ne\s+oldu)\b/iu.test(text)
    || /\b(?:nerede|nerde)\s+kald(?:ık|ik)\b/iu.test(text)
    || /\b(?:nerede|nerde)\s+kalm(?:ıştık|istiktik|istik)\b/iu.test(text)
    || /\b(?:vardiya|sefer|shift)\s+(?:işine|isine|akışına|akisina)\s+dön(?:elim|elim)?\b/iu.test(text);
}

function hasActiveTaskInteractionCue(text) {
  const value = String(text || '');
  return /\b(?:bana\s+göster|bana\s+goster|beraber\s+yapalım|beraber\s+yapalim|birlikte\s+yapalım|birlikte\s+yapalim)\b/iu.test(value)
    || hasSafeGuidanceInteractionCue(value)
    || /\b(?:niye|neden)\s+(?:ilerlemiyor|ilerlemiyo|olmuyor|olmadı|olmadi)\b/iu.test(value)
    || /\b(?:yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol\s+ettim|işledim|isledim)\b/iu.test(value);
}

// Natural continuation requests often combine a discourse anchor (the place
// already reached, the next part/step, or "from here") with a progress verb.
// Treat that combination as one semantic class so inflected/colloquial forms
// do not require a phrase-specific production branch.  The active task still
// supplies only context; explicit domain operations are resolved earlier.
function hasNaturalContinuationCue(text) {
  const value = normalize(String(text || ''));
  const progressVerb = /\b(?:devam|surdur|ilerle|kald)\p{L}*\b/iu.test(value);
  const discourseAnchor = /\b(?:buradan|burdan|yerden|kaldigimiz|kaldigim|siradaki|sonraki|adim|kisim|akistan|akisa)\p{L}*\b/iu.test(value);
  return progressVerb && discourseAnchor;
}

function hasSafeGuidanceInteractionCue(text) {
  const value = String(text || '');
  const actorCue = /\b(?:sen|bana|benim\s+yerime)\b/iu.test(value);
  const targetCue = /\b(?:bu\s+(?:ekran|sayfa|panel|bölüm|bolum|alan|buton|sekme)|şunu|sunu|burayı|burayi|burada|orayı|orayi|ilgili)\b/iu.test(value);
  const operationCue = /\b(?:göster|goster|aç|ac|bul|götür|gotur|başlat|baslat)\p{L}*\b/iu.test(value);
  const safeObjectlessShow = actorCue && /\b(?:göster|goster|aç|ac)\b/iu.test(value);
  return operationCue && (targetCue || safeObjectlessShow)
    && !/\b(?:onayla|reddet|kabul\s+et|gönder|gonder|kaydet|sil|dağıt|dagit|ata|değiştir|degistir|başlatma|baslatma)\p{L}*\b/iu.test(value);
}

function hasContinuationCue(text, conversationState = null) {
  const activeTask = hasActiveGuidedTask(conversationState);
  const confirmsEntryToActiveGuidedTask = activeTask
    && /^\s*(?:girdim|girdik|ekrana\s+girdim|buradayim|buradayım)\b/iu.test(String(text || ''));
  const guidanceContext = [
    activeTask ? conversationState?.activeGuidedTask?.semanticPlan : null,
    conversationState?.lastSettledResult?.semanticPlan,
    conversationState?.authorizedProductContext?.semanticPlan,
    conversationState?.lastProductSemanticPlan,
  ].find((plan) => plan?.family === 'UI_GUIDANCE' || plan?.continuationBasePlan?.family === 'UI_GUIDANCE')
    || (conversationState?.guidedTarget?.status === 'FOUND' ? { family: 'UI_GUIDANCE', workflowIntent: conversationState?.activeGuidedTask?.semanticPlan?.workflowIntent || 'ACTIVE_GUIDANCE_TARGET' } : null);
  const activeTaskRecovery = Boolean(guidanceContext) && (
    hasActiveGuidanceFailureCue(text)
    || /\b(?:beceremedim|burada\s+kaldım|burada\s+kaldim|yardım\s+et|yardim\s+et|burayı\s+anlamadım|burayi\s+anlamadim|napmam\s+gerek\s+burda|napmam\s+gerek\s+burada)\b/iu.test(String(text || ''))
  );
  const activeTaskContinuation = Boolean(guidanceContext) && (
    hasNaturalContinuationCue(text)
    || /\b(?:devamı\s+yapalım|devami\s+yapalim|devam\s+edelim|hadi\s+devam|sonraki\s+adım(?:a)?\s+geç|sonraki\s+adima\s+gec|sonra\s+ne\s+yap(?:ayım|alim|ayim)|sonra\s+ne|tamam(?:\s+(?:tıkladım|tikladim|bastım|bastim|yaptım|yaptim))?(?:\s+sonra)?|şimdi\s+ne|simdi\s+ne)\b/iu.test(String(text || ''))
  );
  const activeTaskResume = hasActiveTaskResumeCue(text, conversationState);
  const guidedProgress = activeTask ? detectCopilotGuidedTaskEngineProgressCommand(text, conversationState) : null;
  const activeTaskInteraction = activeTask && hasActiveTaskInteractionCue(text);
  const naturalBack = hasCanonicalContinuationTask(conversationState) && hasNaturalBackCue(text);
  return confirmsEntryToActiveGuidedTask || activeTaskRecovery || activeTaskContinuation || activeTaskResume || activeTaskInteraction || naturalBack || Boolean(guidedProgress?.command && guidedProgress.command !== "RESTART") || (!hasWorkflowGuidanceCue(text) && hasAnyTerm(text, [
    "devam", "devamini anlat", "devamini acikla", "devam et", "daha fazla anlat", "daha fazla acikla",
    "biraz daha anlat", "biraz daha acikla", "surdur", "devam edelim", "adim adim anlat",
    "adim adim acikla", "bulamadim", "burada goremiyorum",
    "yanlis ekrandayim", "geri", "devami yapalım", "hadi devam", "sonraki adıma geç",
  ]) || (!hasWorkflowGuidanceCue(text) && hasStandaloneNextCue(text)));
}

function hasProductTeachingContext(conversationState = null) {
  if (String(conversationState?.productTeachingState?.subject || '').toUpperCase() === 'PRODUCT_TEACHING') return true;
  const plans = [
    conversationState?.lastSettledResult?.semanticPlan,
    conversationState?.productContext?.semanticPlan,
    conversationState?.authorizedProductContext?.semanticPlan,
    conversationState?.lastProductSemanticPlan,
    conversationState?.lastSemanticPlan,
  ];
  return plans.some((plan) => ['GENERIC_PRODUCT_HELP', 'ROLE_EXPLANATION_HELP'].includes(String(plan?.family || '').toUpperCase()));
}

function hasProductTeachingContinuationCue(text, conversationState = null) {
  return hasProductTeachingContext(conversationState) && hasContinuationCue(text, conversationState);
}

// A current authorized surface is also the grounding context for generic
// product-knowledge questions about inputs, preconditions, validation and the
// next step.  These questions often omit the field or control noun entirely
// ("ne girmem lazım", "zorunlu mu", "nasıl düzeltecem").  Keep this as a
// semantic class rather than adding one branch per literal utterance.  Explicit
// record/data and reasoning operations are handled by their canonical rules
// before this fallback is considered.
function currentScreenKnowledgeKind(text, ui) {
  if (!ui?.path) return "";
  const situatedSurfaceFocus = /\b(?:burada|burda)\s+(?:ne\s+yap\p{L}*|nereden\s+basla\p{L}*)\b/iu.test(text);
  const situatedSurfaceRisk = /\b(?:burada|burda)\s+(?:sorun|problem|aksakl\p{L}*)\s+var\s+m[ıi]\b/iu.test(text);
  if (hasDirectFieldLookupCue(text) || hasAssessmentSummaryCue(text)) return "";
  if (hasExplicitCurrentScreenPurposeCue(text)) return "SCREEN_FOCUS";
  if (hasNextActionOperationCue(text)) return ui?.selectedId || ui?.selectedType ? "" : "NEXT_ACTION";
  if (hasRiskCue(text) || situatedSurfaceRisk) {
    return ui?.selectedId || ui?.selectedType ? "" : "SCREEN_RISK";
  }
  if (hasCardinalityCue(text)) return "";
  if (situatedSurfaceFocus) return "SCREEN_FOCUS";
  if (/(?:nerelere|nelere|neye)\s+bak(?:mam|mal[ıi]y[ıi]m|ay[ıi]m)?(?:\s+(?:gerek|gerekiyor|laz[ıi]m))?\b/iu.test(text)
    || /(?:^|\s)(?:ilk|önce|once|şimdi|simdi)\s+(?:olarak\s+)?neyi\s+kontrol\s+(?:et|ed)(?:meliyim|meliyiz|eyim|elim|eyelim|sem)\b/iu.test(text)
    || /\bhangi\s+\p{L}+(?:\s+\p{L}+){0,3}\s+(?:önce|once|ilk)\s+(?:incele|bak|kontrol)\p{L}*\b/iu.test(text)) return "SCREEN_FOCUS";
  if (/\b(?:bana\s+)?yardim\s+et\b/iu.test(text)) return "SCREEN_FOCUS";
  if (isGenericProductHelpIntent(text, { roleContext: ui?.surfaceRole })) return "SCREEN_FOCUS";
  if (/(?:neden\s+(?:gerekli|onemli)|niye\s+(?:gerekli|onemli)|amac\p{L}*|ne\s+ise\s+yar\p{L}*)/iu.test(text)) return "SCREEN_PURPOSE";
  if (/(?:ne\s+girm\p{L}*|ne\s+yaz\p{L}*|hangi\s+(?:alan|bilgi|veri)\p{L}*|zorunlu\p{L}*|gerekli\p{L}*|on\s+kosul\p{L}*|hazirlik\p{L}*\s+(?:ne|gerek))/iu.test(text)) return "HOW_TO_HELP";
  if (/(?:yanlis\s+(?:yaparsam|girersem|doldurursam)|hata\p{L}*|olmuyor|olmazsa|nasil\s+duzelt\p{L}*|nasil\s+gider\p{L}*|takil\p{L}*|burada\s+kald\p{L}*)/iu.test(text)) return "HOW_TO_HELP";
  if (/(?:sonra\s+ne(?:\s+olacak)?|bundan\s+sonra|bir\s+sonraki|sirada\s+ne|devaminda\s+ne|sonraki\s+adim)/iu.test(text)) return "NEXT_STEP";
  return "";
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
    ...(conversationState?.uniqueDiscourseReferent ? [conversationState.uniqueDiscourseReferent] : []),
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
  return typeCue.test(text)
    || /^(?:bu|bunun|su|sunun|onun|o|şunu|sunu|az\s+önceki|az\s+onceki)\b/iu.test(text);
}

const PREVIOUS_RECORD_TYPE_PATTERNS = Object.freeze([
  { type: 'offer', pattern: /\b(?:onceki|evvelki)\s+teklif\p{L}*/iu },
  { type: 'agreement', pattern: /\b(?:onceki|evvelki)\s+(?:sozlesme|anlasma|kontrat)\p{L}*/iu },
  { type: 'shift', pattern: /\b(?:onceki|evvelki)\s+(?:vardiya|sefer|shift)\p{L}*/iu },
  { type: 'vehicle', pattern: /\b(?:onceki|evvelki)\s+(?:arac|plaka|vehicle)\p{L}*/iu },
  { type: 'driver', pattern: /\b(?:onceki|evvelki)\s+(?:surucu|sofor|driver)\p{L}*/iu },
  { type: 'record', pattern: /\b(?:onceki|evvelki)\s+(?:kayit|kart|oge)\p{L}*/iu },
]);

function previousRecordType(message) {
  const normalized = normalize(message);
  return PREVIOUS_RECORD_TYPE_PATTERNS.find(({ pattern }) => pattern.test(normalized))?.type || null;
}

function previousRecordDomainCompatible(type, requestedDomains = []) {
  if (!requestedDomains.length || type === 'record') return true;
  const domains = {
    offer: ['OFFERS', 'AGREEMENTS', 'SHIFTS', 'OPERATIONS'],
    agreement: ['AGREEMENTS', 'OFFERS', 'SHIFTS', 'OPERATIONS'],
    shift: ['SHIFTS', 'VEHICLES', 'DRIVERS', 'OPERATIONS'],
    vehicle: ['VEHICLES', 'SHIFTS', 'OPERATIONS'],
    driver: ['DRIVERS', 'SHIFTS', 'OPERATIONS'],
  }[type] || [];
  return domains.some((domain) => requestedDomains.includes(domain));
}

export function resolvePreviousRecordReference({ message, conversationState, selectedEntity = null, screenContext = null, requestedDomains = [] } = {}) {
  const requestedType = previousRecordType(message);
  if (!requestedType) return null;
  const current = selectedEntity?.type
    ? selectedEntity
    : selectedEntity?.entityType
      ? { type: selectedEntity.entityType, id: selectedEntity.entityId }
      : screenContext?.selectedEntity || null;
  const currentKey = current?.type && current?.id ? `${String(current.type).toLowerCase()}:${current.id}` : '';
  const history = Array.isArray(conversationState?.recentEntityHistory) ? conversationState.recentEntityHistory : [];
  const candidate = history.find((entity) => {
    const type = String(entity?.type || '').toLowerCase();
    const key = `${type}:${entity?.id || ''}`;
    const typeMatches = requestedType === 'record' ? type === String(current?.type || '').toLowerCase() : type === requestedType;
    return entity?.id && typeMatches && key !== currentKey && previousRecordDomainCompatible(type, requestedDomains);
  });
  return candidate ? { ...candidate, source: 'PREVIOUS_RECORD_CONTEXT' } : null;
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
    || /\b(?:simdi|hemen|bundan\s+sonra)?\s*(?:en\s+)?mantikli\s+(?:adim|is|islem|aksiyon)\p{L}*\b/iu.test(text)
    || /\b(?:hangi|ne)\s+(?:dogru\s+|guvenli\s+|mantikli\s+)?(?:adim|islem|aksiyon|kontrol)\p{L}*\s+(?:yap|gec|git|uygula|izle)\p{L}*\b/iu.test(text)
    || /\bhangi\s+(?:dogru\s+|guvenli\s+|mantikli\s+)?adim\p{L}*\s+(?:ile\s+)?ilerle\p{L}*\b/iu.test(text)
    // Keep natural first-person safety questions on the actionable path.
    // Without this, "Bu sayfada şimdi ne yapmam güvenli?" is reduced to
    // selected-record screen context and loses the next-step contract.
    || /\bne\s+yap(?:maliyim|mam\s+(?:guvenli|mantikli))\b/iu.test(text);
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
  const relationGrammar = hasContractShiftGenerationLookupCue(text)
    || /(?:bagl\p{L}*|ait\p{L}*|ilisk\p{L}*|baglanti\p{L}*|esles\p{L}*|kayn\p{L}*)/iu.test(text)
    || hasTypedEntityRelationQuestion(text)
    || /(?:vardiya|sefer|shift|arac\p{L}*|surucu\p{L}*|sofor\p{L}*|sozlesme\p{L}*|kayit\p{L}*).{0,24}(?:bagli|ait|iliskili|araci|vardiyasi|surucusu|soforu)/iu.test(text);
  return relationGrammar || hasAnyTerm(text, [
    "bagli", "ait", "iliskili", "hangi vardiyaya bagli", "hangi araca bagli", "hangi sofore bagli",
    "surucusu kim", "soforu kim", "bagli kayit", "bagli kaydi", "sozlesmesi var mi",
  ]);
}

// A contract-produced-shift request is a relationship lookup even when the
// user asks to show/open the related collection instead of asking "bağlı mı".
// Keep this structural: the contract, generated-shift relation, and visible
// action/question must all be present. Authorization and evidence remain
// downstream responsibilities.
export function hasContractShiftGenerationLookupCue(text) {
  const value = normalize(text);
  const contract = /\b(?:sozlesme|anlasma|agreement|contract|kontrat)\p{L}*\b/iu.test(value);
  // Keep common spoken/typed Turkish inflections in the same canonical
  // relation family.  `vardılar` is a frequent misspelling of `vardiyalar`
  // in this user task; it is still a shift-collection reference, not an
  // agreement-surface navigation request.
  const shift = /\b(?:vardiya|vardilar|sefer|shift)\p{L}*\b/iu.test(value);
  const generated = /\b(?:uretil|uret|cik|olustur|olusturul)\p{L}*\b/iu.test(value);
  const bound = /\b(?:bagl|ait|ilisk|baglanti|esles)\p{L}*\b/iu.test(value);
  const visibleOrQuestion = hasExplicitSurfaceNavigationVerb(value)
    || /\b(?:var|mi|mı|mu|mü|oldu|edildi|edilmis|edilmiş|nerede|nereye|hangi|hangileri|liste|listele)\p{L}*\b/iu.test(value);
  return contract && shift && (generated || bound) && visibleOrQuestion;
}

function hasPreparationOnlyCue(text) {
  const value = normalize(text);
  const preparationMarker = /\b(?:hazır|hazir|hazırlık|hazirlik|kontrol\s+(?:listesi|noktaları|sırası|sirasi|sırasını|sirasini|adımları|adimlari)|başlangıç\s+adımları|baslangic\s+adimlari)\p{L}*\b/iu.test(value);
  const boundaryMarker = /\b(?:açmadan|acmadan|oluşturmadan|olusturmadan|yaratmadan|başlamadan|baslamadan|açılış|acilis|oluşturma|olusturma|önce|once|öncesi|oncesi)\p{L}*\b/iu.test(value);
  return preparationMarker && boundaryMarker;
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
  if (hasContractShiftGenerationLookupCue(text)) return false;
  // An explicit shift identity plus a detail cue is an existing-record
  // lookup.  Do not let the polite verb form "açar mısın" promote it into
  // ROOM's create/workflow guidance lane.
  if (explicitShiftReferenceFromText(text) && hasRecordDetailsCue(text)) return false;
  // Past-tense resume language refers to an already active task and belongs
  // to continuation/recovery, even when it contains the shift creation verb.
  if (/\b(?:olusturacaktik|oluşturacaktık|olusturuyorduk|oluşturuyorduk|ne\s+oldu|nerede\s+kaldik|nerede\s+kaldık)\b/iu.test(text)) return false;
  const hasShiftSubject = /\b(?:vardiya|sefer|shift)\p{L}*\b/iu.test(text);
  if (!hasShiftSubject) return false;
  if (hasPreparationOnlyCue(text)) return false;
  // The normalized adjective "acik" in phrases such as "açık olan vardiya
  // teklifleri" must not be consumed as the imperative "aç". Keep the
  // workflow lane for real open/create guidance while leaving current-screen
  // offer explanations in their own read-only semantic lane.
  const guidanceVerb = /\b(?:olustur|oluştur|ac(?!ik(?:\b|la))|aç(?!ık(?:\b|la))|ekle|goster|göster|got|göt|gotur|götür|bulamad|bulamiyor|bulamıyo|nereden)\p{L}*\b/iu.test(text);
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
  if (hasContractShiftGenerationLookupCue(text)) return false;
  const hasShiftSubject = /\b(?:vardiya|sefer|shift)\p{L}*\b/iu.test(text);
  if (!hasShiftSubject) return false;
  const creationCue = /\b(?:olustur|oluştur|ac(?!ikla)|aç(?!ıkla)|ekle)\p{L}*\b/iu.test(text);
  const creationScreenCue = /\b(?:olustur|oluştur|ekle|ekleme)\p{L}*\s+ekran\p{L}*\b/iu.test(text);
  const directScreenOpenCue = /\bekran\p{L}*\s+(?:ac|aç)\b/iu.test(text);
  // “Vardiya ekranını aç” names the existing surface.  “Vardiya oluşturma
  // ekranını aç” still names the create workflow, so it stays in the
  // CREATE_SHIFT lane.  This distinction is semantic, not a phrase-specific
  // route shortcut.
  if (creationCue && (!directScreenOpenCue || creationScreenCue)) return false;
  return hasExplicitSurfaceNavigationVerb(text)
    || /\b(?:kontrol\s+edelim)\b/iu.test(normalize(text));
}

// Opening the current offers surface is a safe UI guidance request.  Keep it
// separate from COMMERCIAL_SUMMARY so a user asking to inspect offers is not
// mistaken for asking for a field from an existing offer.  The authorized
// screen catalog remains the only source for the concrete destination.
function hasOfferSurfaceNavigationCue(text) {
  if (/\b(?:hayali|olmayan|var\s+olmayan|mevcut\s+olmayan|uydurma|sahte)\b/iu.test(text)) return false;
  if (!/\b(?:teklif|offer|rfq)\p{L}*\b/iu.test(text)) return false;
  // An explicit numeric offer is a record lookup. It must not be collapsed
  // into the generic offers surface because the canonical authorization gate
  // needs the exact record identity before retrieval.
  if (/\b(?:teklif|offer|rfq)\s*#?\s*\d+\b/iu.test(text)) return false;
  const navigationVerb = hasExplicitSurfaceNavigationVerb(text)
    || /\b(?:bak\p{L}*|kontrol\s+edelim|inceleyelim)\b/iu.test(normalize(text));
  if (!navigationVerb) return false;
  // Questions about a concrete offer's fields, comparison, decision or
  // business action remain read-only commercial reasoning/action guidance.
  const fieldOrDecisionCue = /\b(?:durum|tarih|saat|tutar|bedel|fiyat|rakam|neden|risk|kalite|kabul|reddet|onay|karsi\s+teklif|karşı\s+teklif|degerlendir|değerlendir|mantikli|mantıklı|daha\s+iyi|sozlesme|sözleşme)\b/iu.test(text);
  return !fieldOrDecisionCue;
}

// Opening the agreements surface is a navigation request, not a question
// about a particular agreement record. Keep the destination as a canonical
// domain candidate so the authenticated role's screen catalog selects the
// real role-owned agreements route downstream.
function hasAgreementSurfaceNavigationCue(text) {
  const value = normalize(text);
  if (!/\b(?:sozlesme|anlasma|agreement|contract)\p{L}*\b/iu.test(value)) return false;
  if (hasContractShiftGenerationLookupCue(value)) return false;
  const navigationCue = hasExplicitSurfaceNavigationVerb(value);
  if (!navigationCue) return false;
  const recordActionCue = /\b(?:onay|iptal|uzat|durum|tarih|saat|tutar|bedel|bagli|etki|neden|kapsam)\p{L}*\b/iu.test(value);
  return !recordActionCue;
}

// These are named role-owned surfaces, not generic product-help topics. Keep
// their entry semantics in the canonical request so a home-screen question
// can reach the real route without borrowing the current screen or a selected
// record as its target.
function hasReportsSurfaceNavigationCue(text) {
  const value = normalize(text);
  if (!/\b(?:rapor|report)\p{L}*\b/iu.test(value)) return false;
  return hasExplicitSurfaceNavigationVerb(value);
}

function hasLiveMapSurfaceNavigationCue(text) {
  const value = normalize(text);
  // Keep entry language separate from an already-open map instruction such
  // as “Bu haritayı büyüt”. The latter belongs to the live control/target
  // owner and must not be reclassified as a request to open the map surface.
  if (!/\b(?:canli\s+(?:takip|izleme)|takip\s+harita)\p{L}*\b/iu.test(value)) return false;
  return hasExplicitSurfaceNavigationVerb(value);
}

// Biniş kayıtları is a ROOM-owned read-only surface. Resolve it before
// selected shift/vehicle field lookup can inherit a stale record.
function hasCheckinSurfaceNavigationCue(text) {
  const value = normalize(text);
  if (!/\b(?:binis|inis|check[- ]?in)\p{L}*\b/iu.test(value)) return false;
  return hasExplicitSurfaceNavigationVerb(value)
    || /\b(?:olay|kayit|kayıt|takip)\p{L}*\b/iu.test(value);
}

// Uygulanan Rota is a read-only agreement tab, not a route-write operation.
function hasAppliedRouteSurfaceNavigationCue(text) {
  const value = normalize(text);
  if (!/\buygulanan\s+rota\p{L}*\b/iu.test(value)) return false;
  return hasExplicitSurfaceNavigationVerb(value);
}

// A collection-display request is more specific than opening the Agreements
// surface. Keep this structural: collection quantifiers/list nouns plus a
// visible-action verb, without a selected/named record or status filter.
function hasAgreementCollectionViewCue(text) {
  const value = normalize(text);
  if (!/\b(?:sozlesme|anlasma|agreement|contract)\p{L}*\b/iu.test(value)) return false;
  if (!hasExplicitSurfaceNavigationVerb(value)) return false;
  if (/\b(?:bu|su|secil(?:i|en)?|aktif|mevcut|baktigim|sozlesmenin|anlasmanin|agreementin|contractin)\b/iu.test(value)) return false;
  if (/\b(?:durum|statu|status|bekleyen|inceleme|onay|tarih|saat|tutar|bedel|bagli|etki|neden|kapsam)\p{L}*\b/iu.test(value)) return false;
  return /\b(?:butun|tum|hepsi|tamami|tamamı|liste|listesi|listeyi|envanter|koleksiyon)\p{L}*\b/iu.test(value);
}

// A fabricated shift target is still a UI-guidance request.  Keep it in the
// canonical guidance lane so downstream product awareness can reject the
// target explicitly instead of reinterpreting "kontrolünü aç" as a field
// lookup.  No real route or target is authorized by this shape.
function hasUnresolvedShiftSurfaceNavigationCue(text) {
  if (!/\b(?:hayali|olmayan|var\s+olmayan|mevcut\s+olmayan|uydurma|sahte)\b/iu.test(text)) return false;
  if (!/\b(?:vardiya|sefer|shift)\p{L}*\b/iu.test(text)) return false;
  return /\b(?:kontrol|ekran|panel|bolum|bölüm|sihirbaz)\p{L}*\b.{0,20}\b(?:ac|aç|goster|göster|git|gidelim|kontrol\s+edelim)\b/iu.test(text)
    || /\b(?:ac|aç|goster|göster|git|gidelim|kontrol\s+edelim)\b.{0,20}\b(?:kontrol|ekran|panel|bolum|bölüm|sihirbaz)\p{L}*\b/iu.test(text);
}

// Plausible but explicitly fabricated UI names must stay in the guidance
// lane so the downstream resolver can reject them truthfully instead of
// matching a nearby real control by loose wording.
function hasUnresolvedUiTargetCue(text) {
  if (!/\b(?:hayali|gizli|vip|olmayan|var\s+olmayan|mevcut\s+olmayan|uydurma|sahte)\b/iu.test(text)) return false;
  return /\b(?:ekran|sekme|panel|sihirbaz|buton|bolum|bölüm|alan)\p{L}*\b/iu.test(text)
    && /\b(?:ac|aç|goster|göster|git|gidelim|bul|bulamad|kontrol|incele|inceleyelim)\p{L}*\b/iu.test(text);
}

// A deictic reference ("bu teklif", "seçili vardiya") identifies a target;
// it is not itself a request to identify that target.  Keep operation
// detection separate so that explicit work such as risk, next action, field,
// detail, or relation lookup cannot collapse into SELECTED_RECORD_CONTEXT.
function inferExplicitOperations(text, conversationState = null, ui = null) {
  const tasks = [];
  if (hasComparisonCue(text)) tasks.push("COMPARISON");
  if (hasFreshnessCheckCue(text)) tasks.push("FRESHNESS_CHECK");
  if (hasUncertaintyCheckCue(text)) tasks.push("UNCERTAINTY_CHECK");
  if (hasEvidenceSufficiencyCue(text)) tasks.push("EVIDENCE_SUFFICIENCY");
  if (hasIssueDiagnosticCue(text)) tasks.push("ISSUE");
  if (hasQuoteFloorAnalysisCue(text, conversationState, ui)) tasks.push("RISK");
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

function explicitTaskShape(text, ui, conversationState = null) {
  const requestedTasks = inferExplicitOperations(text, conversationState, ui);
  if (!requestedTasks.length) return null;
  const target = inferTarget(text, { forCount: requestedTasks.includes("COUNT") });
  const mayUseSelectedTarget = Boolean(ui.selectedId && ui.selectedType)
    && (hasSelectedRecordCue(text) || hasSelectedRecordReference(text) || hasSelectedRecordActionReference(text, ui) || hasSelectedRecordIdentityCue(text, ui));
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
  const hasInflectedTerm = (term) => {
    const parts = normalize(term).split(/\s+/u).filter(Boolean);
    if (!parts.length) return false;
    const pattern = parts.map((part, index) => {
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return index === parts.length - 1 ? `${escaped}\\p{L}*` : escaped;
    }).join("\\s+");
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${pattern}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
  };
  const candidates = ENTITY_CONCEPTS.filter((concept) => concept.terms.some((term) => hasAnyTerm(text, [term]) || (forCount && hasInflectedTerm(term))));
  const applicable = forCount ? candidates.filter((concept) => !countTargetIsExplicitlyExcluded(text, concept)) : candidates;
  return applicable.length === 1 ? applicable[0] : null;
}

function directFieldLookupShape(text, ui) {
  // A combined request such as “durumunu ve detaylarını açıkla” must stay in
  // the record-details lane. The status word is evidence to include in the
  // authorized record explanation, not permission to discard the details
  // operation and downgrade the request to a scalar field lookup.
  // Current-screen purpose questions are a separate canonical intent even
  // when a selected record is present. Do not let the scalar field branch
  // consume an operation-inventory question before screen-purpose precedence
  // has a chance to classify it.
  if (!hasDirectFieldLookupCue(text)
    || hasExplicitCurrentScreenPurposeCue(text)
    || hasCardinalityCue(text)
    || hasRecordDetailsCue(text)) return null;
  const target = inferTarget(text);
  const selectedCommercialField = hasValueLookupCue(text) && ui.selectedType;
  const selectedType = selectedCommercialField ? ui.selectedType : target?.type || ui.selectedType || null;
  const selectedDomain = target?.domain
    || (selectedType ? ENTITY_CONCEPTS.find((concept) => concept.type === selectedType)?.domain || null : null);
  const requestedFields = resolveProductNoteFields(text);
  return {
    taskType: "FIELD_LOOKUP",
    confidence: selectedType ? 0.94 : 0.82,
    domain: selectedDomain,
    targetEntityType: selectedType,
    requestedFields,
    requestedFieldsAuthoritative: requestedFields.length > 0,
    explicitTaskIntent: true,
  };
}

function hasSelectedShiftCheckinFactCue(text, ui) {
  if (String(ui?.selectedType || "").toUpperCase() !== "SHIFT") return false;
  const checkinFieldCue = /\b(?:binis|bindi|inis|indi)\p{L}*\b/iu.test(text);
  const explanationCue = /\b(?:durum|say|sayi|kac|acikla|anlat|goster)\p{L}*\b/iu.test(text);
  return checkinFieldCue && explanationCue;
}

function inferTask({ text, rawText = text, ui, conversationState = null }) {
  if (isGeneralArithmeticRequest(text)) {
    return { taskType: null, confidence: 0.99, domain: null, targetEntityType: null, generalArithmetic: true };
  }
  const contextualNumericReference = contextualNumericRecordReferenceFromText(text, ui);
  if (contextualNumericReference?.ambiguity) {
    return {
      taskType: "CLARIFY",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      ambiguity: contextualNumericReference.ambiguity,
    };
  }
  const explicitShiftReference = explicitShiftReferenceFromText(text);
  const explicitVehicleReference = explicitVehicleReferenceFromText(text);
  const explicitAgreementReference = explicitAgreementReferenceFromText(text);
  const explicitRecordReference = explicitShiftReference || explicitVehicleReference || explicitAgreementReference || contextualNumericReference?.reference || null;
  const explicitCommercialRecordCue = /\b(?:teklif|karsi\s+teklif|kabul\s+edilen|kabul|nihai|son\s+fiyat|ticari|fiyat|tutar|bedel|para|miktar)\p{L}*/iu.test(text);
  const explicitAgreementRecordCue = Boolean(explicitAgreementReference)
    && /\b(?:mutabakat|reconciliation|agreement|sozlesme|inceleme|incele|goster|göster|ac|aç|detay|ayrinti|ayrıntı|neden|eksik|odeme|ödeme|hakediş|hakedis)\p{L}*/iu.test(text);
  // An explicit shift identity plus a detail request is a read-only record
  // opening operation. Resolve it before surface-capability and ROOM create
  // policy cues; otherwise the polite "açar mısın" form can be interpreted
  // as a new-shift request and leave the real card unselected.
  if (explicitShiftReference && hasRecordDetailsCue(text) && !hasCardinalityCue(text)) {
    return {
      taskType: "RECORD_DETAILS",
      confidence: 0.99,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      requestedTasks: ["RECORD_DETAILS"],
      recordDetailsIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitEntityReference: explicitShiftReference,
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  const liveGuidedTargetExplanation = hasCurrentGuidedTargetExplanationCue(text, conversationState);
  const explicitVehicleIdentityCue = /\b(?:plaka|hangi|kim|numara|id|durum|konum|gps|goster|göster|detay|anlat|acikla|açıkla)\p{L}*/iu.test(text);
  if (explicitVehicleReference && explicitVehicleIdentityCue) {
    const vehicleIdentityField = /\bplaka\p{L}*\b/iu.test(text)
      ? { key: "PLATE", domain: "VEHICLES" }
      : { key: "VEHICLE", domain: "VEHICLES" };
    return {
      taskType: "FIELD_LOOKUP",
      confidence: 0.97,
      domain: "VEHICLES",
      targetEntityType: "VEHICLE",
      requestedFields: [vehicleIdentityField],
      requestedFieldsAuthoritative: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitEntityReference: explicitVehicleReference,
    };
  }
  if (explicitRecordReference && (explicitCommercialRecordCue || explicitAgreementRecordCue)) {
    const domainByType = { SHIFT: "SHIFTS", OFFER: "OFFERS", AGREEMENT: "AGREEMENTS", VEHICLE: "VEHICLES", DRIVER: "DRIVERS", PERSONNEL: "PERSONNEL", STUDENT: "PERSONNEL", PARENT: "PERSONNEL" };
    return {
      taskType: "FIELD_LOOKUP",
      confidence: 0.97,
      domain: domainByType[explicitRecordReference.type] || null,
      targetEntityType: explicitRecordReference.type,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitEntityReference: explicitRecordReference,
    };
  }
  const healthMetricMode = operationHealthMetricMode(text, ui);
  // A vehicle/GPS request that explicitly asks to show the current vehicle
  // surface is a UI target request when that authorized surface is live. The
  // operation-health metric contract remains the owner for factual/diagnostic
  // questions; it must not consume a concrete visible vehicle target first.
  const preMetricVehicleTarget = currentScreenCapabilityTarget(text, ui);
  const preMetricVehicleObject = semanticObjectClass(null, text);
  if (preMetricVehicleTarget && ["VEHICLE", "DRIVER"].includes(preMetricVehicleObject)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.96,
      domain: preMetricVehicleObject === "DRIVER" ? "DRIVERS" : "VEHICLES",
      targetEntityType: preMetricVehicleObject,
      screenContextIntent: true,
      explicitUiGuidance: true,
      explicitTaskIntent: true,
      scopeTarget: "CURRENT_SCREEN",
      workflowIntent: "OPEN_SURFACE",
      currentTargetReference: {
        targetKind: "CONTROL",
        targetKey: String(preMetricVehicleTarget.targetKey || "").trim(),
        label: String(preMetricVehicleTarget.label || "").trim(),
        semanticType: String(preMetricVehicleTarget.semanticType || "button").trim(),
        screenPath: String(ui.path || "").trim(),
      },
    };
  }
  const operationHealthSurfaceNavigation = /\boperasyon\s+sagligi\p{L}*\b/iu.test(text)
    && hasExplicitSurfaceNavigationVerb(text);
  if (operationHealthSurfaceNavigation) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: "OPERATIONS",
      targetEntityType: "SURFACE",
      requestedTasks: ["SCREEN_CONTEXT"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      workflowIntent: "OPEN_OPERATION_HEALTH_SURFACE",
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  if (healthMetricMode) {
    return {
      taskType: "ISSUE",
      confidence: 0.97,
      domain: "OPERATIONS",
      targetEntityType: null,
      requestedTasks: ["ISSUE"],
      requestedFields: [{ key: "OPERATION_HEALTH_METRIC", domain: "OPERATIONS" }],
      requestedFieldsAuthoritative: true,
      explicitTaskIntent: true,
      operationHealthMetricIntent: true,
      operationHealthMetricMode: healthMetricMode,
    };
  }
  if (hasLiveMapSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: "OPERATIONS",
      targetEntityType: "SURFACE",
      requestedTasks: ["SCREEN_CONTEXT"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      workflowIntent: "OPEN_MAP_SURFACE",
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  if (hasCheckinSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: "OPERATIONS",
      targetEntityType: "SURFACE",
      requestedTasks: ["SCREEN_CONTEXT"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      workflowIntent: "OPEN_CHECKIN_SURFACE",
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
    };
  }
  if (hasAppliedRouteSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: "AGREEMENTS",
      targetEntityType: "SURFACE",
      requestedTasks: ["SCREEN_CONTEXT"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      workflowIntent: "OPEN_APPLIED_ROUTE_SURFACE",
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
    };
  }
  if (hasReportsSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: "OPERATIONS",
      targetEntityType: "SURFACE",
      requestedTasks: ["SCREEN_CONTEXT"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      workflowIntent: "OPEN_REPORTS_SURFACE",
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  if (hasCanonicalIssueDiagnosticRequest(text)) {
    return {
      taskType: "ISSUE",
      confidence: 0.96,
      domain: "OPERATIONS",
      targetEntityType: null,
      requestedTasks: ["ISSUE"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: ui.selectedId && ui.selectedType ? "SELECTED_RECORD" : "CURRENT_SCREEN",
      roleHelpIntent: false,
      generalProductHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
    };
  }
  // A vehicle GPS/status question is a typed vehicle field lookup even when
  // the user says "araba" rather than "araç" and even when the UI selection
  // is supplied separately by the live screen.  Keep this in the shared
  // semantic boundary so downstream authorization and data resolution own the
  // selected vehicle; do not let generic off-topic/product-help fallback win.
  const gpsStatusSignal = /\b(?:gps|konum|takip|guncel|güncel|calis|çalış|cevrim\s+disi|çevrim\s+dışı|offline)\p{L}*\b/iu.test(text);
  const vehicleGpsQuestion = (
    /\b(?:arac|araba|plaka|vehicle)\p{L}*\b/iu.test(text)
    || (ui?.selectedType === "VEHICLE" && gpsStatusSignal)
  )
    && gpsStatusSignal
    && /\b(?:mi|mı|mu|mü|ne|nasil|nasıl|durum|goster|göster|calis|çalış|guncel|güncel)\p{L}*\b/iu.test(text);
  if (vehicleGpsQuestion) {
    return {
      taskType: "FIELD_LOOKUP",
      confidence: 0.97,
      domain: "VEHICLES",
      targetEntityType: "VEHICLE",
      requestedFields: [{ key: "GPS", domain: "OPERATIONS" }],
      requestedFieldsAuthoritative: true,
      explicitTaskIntent: true,
      selectedRecordIntent: Boolean(ui?.selectedId && ui?.selectedType === "VEHICLE"),
    };
  }
  const financialScreenRisk = hasFinancialScreenRiskCue(text)
    && /\/(?:room|company|school|organization)\/financial-operations\b/iu.test(String(ui?.path || ''))
    && !ui?.selectedId
    && !ui?.selectedType;
  if (financialScreenRisk) {
    return {
      taskType: 'RISK',
      confidence: 0.97,
      domain: 'FINANCE',
      targetEntityType: null,
      requestedTasks: ['RISK'],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: 'CURRENT_SCREEN',
    };
  }
  // A financial readiness/process question owns the turn before the
  // selected-record fallback.  The ROOM commercial shell may carry a
  // selected shift or agreement, but that record is not a hakediş/payment
  // record.  Keep the request in the authorized financial read-only owner so
  // the downstream assistant can return evidence or an honest capability
  // boundary instead of asking for unrelated shift fields.
  const quoteFloorAnalysis = hasQuoteFloorAnalysisCue(text, conversationState, ui);
  if ((quoteFloorAnalysis || hasFinancialReadinessEvidence(text) || hasCostAnalysisCue(text, conversationState, ui))
    && !hasNextActionOperationCue(text)) {
    return {
      taskType: "RISK",
      confidence: 0.95,
      domain: quoteFloorAnalysis ? "BUDGET" : "FINANCE",
      targetEntityType: null,
      requestedTasks: ["RISK"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  // Resolve an active-task previous-step request before referential and role
  // help fallbacks. The structural cue is intentionally context-bound so a
  // question about earlier data is not silently converted into BACK.
  if (hasCanonicalContinuationTask(conversationState)
    && hasNaturalBackCue(text)
    && inferExplicitOperations(text, conversationState).length === 0) {
    return {
      taskType: "CONTINUE_CURRENT_REASONING",
      confidence: 0.99,
      domain: null,
      targetEntityType: ui.selectedType || null,
      continuationIntent: true,
      continuationAction: "BACK",
    };
  }
  // A bare numeric follow-up can refer to the single authorized record just
  // settled by the assistant (for example, after saying “sözleşme: 184”).
  // Bind only when the number exactly matches that server-owned discourse
  // referent; otherwise leave the request unresolved for clarification.
  const settledReferent = conversationState?.uniqueDiscourseReferent;
  const numericRecordDetails = String(text || '').match(/^#?(\d+)\s+(?:acikla|açıkla|detay(?:landir|landır)?|anlat)\p{L}*\s*$/iu);
  if (numericRecordDetails && settledReferent?.id && Number(numericRecordDetails[1]) === Number(settledReferent.id)) {
    const domain = {
      agreement: "AGREEMENTS",
      offer: "OFFERS",
      shift: "SHIFTS",
      vehicle: "VEHICLES",
      driver: "DRIVERS",
      personnel: "PERSONNEL",
      student: "PERSONNEL",
      parent: "PERSONNEL",
    }[String(settledReferent.type || "").toLowerCase()] || null;
    return {
      taskType: "RECORD_DETAILS",
      confidence: 0.97,
      domain,
      targetEntityType: String(settledReferent.type || "").toUpperCase() || null,
      recordDetailsIntent: true,
      discourseReferentNumeric: true,
    };
  }
  const referentialDetailCue = settledReferent?.id
    && /^(?:bu|bunun|su|sunun|onun|o|şunu|sunu|az\s+önceki|az\s+onceki)\b/iu.test(String(text || ""))
    && /\b(?:detay|detaylandir|detaylandır|anlat|acikla|açıkla)\p{L}*\b/iu.test(String(text || ""));
  if (referentialDetailCue) {
    const type = String(settledReferent.type || "").toLowerCase();
    const domain = { agreement: "AGREEMENTS", offer: "OFFERS", shift: "SHIFTS", vehicle: "VEHICLES", driver: "DRIVERS", personnel: "PERSONNEL", student: "PERSONNEL", parent: "PERSONNEL" }[type] || null;
    return {
      taskType: "RECORD_DETAILS",
      confidence: 0.95,
      domain,
      targetEntityType: type.toUpperCase() || null,
      recordDetailsIntent: true,
      discourseReferentFollowUp: true,
    };
  }
  // A unique server-authorized discourse record remains the target of a
  // property question even when the user uses only a deictic pronoun (for
  // example "bunun saati ne").  The referent is conversation context, not
  // authorization; the normal capability/tenant checks still run later.
  const referentialFieldCue = settledReferent?.id
    && /^(?:bu|bunun|su|sunun|onun|o|şunu|sunu|az\s+önceki|az\s+onceki)\b/iu.test(String(text || ""))
    && /\b(?:saat|zaman|gun|gün|tarih|durum|status|statü|statu|konum|rota|durak|deger|değer|fiyat|tutar|miktar|oran)\p{L}*\b/iu.test(String(text || ""));
  if (referentialFieldCue) {
    const type = String(settledReferent.type || "").toLowerCase();
    const domain = { agreement: "AGREEMENTS", offer: "OFFERS", shift: "SHIFTS", vehicle: "VEHICLES", driver: "DRIVERS", personnel: "PERSONNEL", student: "PERSONNEL", parent: "PERSONNEL" }[type] || null;
    return {
      taskType: "FIELD_LOOKUP",
      confidence: 0.93,
      domain,
      targetEntityType: type.toUpperCase() || null,
      discourseReferentFieldFollowUp: true,
    };
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
  // A short teaching follow-up is grounded by the current authorized surface
  // (and by the active workflow when one exists). It must not ask the user to
  // name the area again merely because the follow-up omits the noun.
  if (ui?.path && hasStandaloneTeachRequest(text) && hasExplicitProductLevelHelpCue(text) && !hasCanonicalContinuationTask(conversationState)) {
    return {
      taskType: "OFF_TOPIC",
      confidence: 0.96,
      domain: null,
      targetEntityType: null,
      generalInformationIntent: true,
      generalProductHelpIntent: true,
      productTeachingIntent: true,
      roleHelpIntent: false,
      primaryTask: "GENERIC_PRODUCT_HELP",
      explicitTaskIntent: true,
      scopeTarget: "ROLE_GLOBAL",
    };
  }
  // Collection/domain guidance is not a request for one arbitrary record.
  // Keep the current authorized surface as the grounding object until a
  // concrete collection target is resolved downstream.
  if (hasDomainCollectionGuidanceRequest(text)
    && !hasCardinalityCue(text)
    && !hasSelectedShiftCheckinFactCue(text, ui)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.95,
      domain: "OPERATIONS",
      targetEntityType: "SURFACE",
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: "HOW_TO_USE",
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  // A relationship question may contain a surface cardinality cue such as
  // "var mı".  The typed relationship must win over collection COUNT so an
  // offer-to-agreement/counteroffer question is resolved as a traversal, not
  // as a generic offer count.
  if ((hasOfferCollectionCountRequest(text) || hasOfferCollectionSummaryRequest(text)) && !hasRelationLookupCue(text)) {
    const target = ENTITY_CONCEPTS.find((concept) => concept.type === "OFFER");
    if (hasOfferCollectionSummaryRequest(text)) {
      return {
        taskType: "SCREEN_CONTEXT",
        confidence: 0.98,
        domain: target.domain,
        targetEntityType: target.type,
        requestedTasks: ["SCREEN_CONTEXT"],
        explicitTaskIntent: true,
        explicitUserTarget: true,
        explicitUiGuidance: true,
        screenContextIntent: true,
        workflowIntent: "OPEN_OFFER_SURFACE",
        collectionSummaryIntent: true,
        scopeTarget: "CURRENT_SCREEN",
      };
    }
    return {
      taskType: "COUNT",
      confidence: 0.98,
      domain: target.domain,
      targetEntityType: target.type,
      countTarget: { targetEntityType: target.type, domain: target.domain },
      explicitCardinalityTarget: true,
      explicitTaskIntent: true,
    };
  }
  if (hasFinanceSummaryRequest(text)) {
    return {
      taskType: "RISK",
      confidence: 0.92,
      domain: "BUDGET",
      targetEntityType: null,
      requestedTasks: ["RISK"],
      explicitTaskIntent: true,
    };
  }
  // Once product teaching has started, short follow-ups operate on the
  // server-owned teaching cursor. Resolve that discourse operation before the
  // broad role-help fallback so “adım adım anlat”, BACK and RECOVER consume
  // the existing context instead of opening a fresh ambiguous help request.
  if (hasProductTeachingContinuationCue(text, conversationState)) {
    return {
      taskType: "CONTINUE_CURRENT_REASONING",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      continuationIntent: true,
      continuationAction: continuationActionFor(text),
      explicitTaskIntent: false,
    };
  }
  const roleScopedUiTarget = inferRoleScopedUiTarget(text);
  // A role-scoped destination is more specific than generic product help or
  // current-surface explanation. Resolve it before those broad fallbacks so
  // a cross-role surface request remains an explicit target for the
  // authorization/grounding stages. This records the requested target only;
  // it does not grant access.
  if (roleScopedUiTarget) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      explicitUiGuidance: true,
      explicitTaskIntent: true,
      scopeTarget: "CURRENT_SCREEN",
      workflowIntent: roleScopedUiTarget.explicitlyMissing ? "UNRESOLVED_UI_TARGET" : "ROLE_SCOPED_UI_TARGET",
      requestedRoleTarget: roleScopedUiTarget,
    };
  }
  if (ui?.path && hasCurrentSurfaceWhyCue(text) && !hasExplicitProductLevelHelpCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: null,
      targetEntityType: "SURFACE",
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: "SCREEN_PURPOSE",
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  // A situated surface-purpose question must win before the role-capability
  // fallback.  This keeps wording such as “bu konum ve harita ekranında ne
  // yapabilirim?” grounded in the active Hub surface instead of role-global
  // help, without granting access to any record.
  if (ui?.path && hasExplicitCurrentScreenPurposeCue(text) && !liveGuidedTargetExplanation) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: null,
      targetEntityType: "SURFACE",
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: currentScreenKnowledgeKind(text, ui) || "SCREEN_PURPOSE",
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  // Product-purpose questions are broader than role-capability questions.
  // Resolve the named product subject before role-aspect morphology can
  // project a process-responsibility answer over the product overview.
  if (hasExplicitProductLevelHelpCue(text)
    && !(activeWorkflowPlan(conversationState) && workflowStepReferenceFromText(text))
    && !hasCanonicalContinuationTask(conversationState)
    && !(ui?.path && hasSituatedCurrentSurfaceGuidanceCue(text))) {
    return {
      taskType: "OFF_TOPIC",
      confidence: 0.97,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: true,
      generalInformationIntent: true,
      generalProductHelpIntent: true,
      productTeachingIntent: false,
      roleHelpIntent: false,
      primaryTask: "GENERIC_PRODUCT_HELP",
      scopeTarget: "ROLE_GLOBAL",
    };
  }
  // Concrete field evidence must outrank generic role-help and current-screen
  // explanation. Keep this precedence structural: the shared field cue helper
  // decides it for financial and non-financial fields alike.
  // A live guided Step-3 capability question is a how-to request about the
  // active workflow, even when its noun (for example "durak") is also a
  // valid record field elsewhere. Resolve the live workflow evidence before
  // allowing the broad field classifier to consume that noun.
  const earlyLiveStepReference = liveWorkflowStepReference(ui);
  const liveWorkflowCapability = Boolean(earlyLiveStepReference && hasWorkflowCapabilityCue(text));
  // A computed quote-floor question names a financial preview, not a scalar
  // property of an arbitrary OFFER. Let the canonical cost route own it
  // before the generic commercial field projection consumes the same nouns.
  const globalProductHelpIntent = isGenericProductHelpIntent(text, { roleContext: ui?.surfaceRole });
  // A live route-order precondition is a canonical next action. Resolve it
  // before concrete field evidence so a route-order recovery request cannot
  // be consumed as a generic ROUTE field lookup. Carry only the existing live
  // control identity; no label or UI state can grant authorization.
  if (hasRouteOrderVerificationCue(text)) {
    const liveRouteStep = liveWorkflowStepReference(ui);
    const routeOrderAction = routeOrderActionFromUi(ui);
    return {
      taskType: "NEXT_ACTION",
      confidence: 0.99,
      domain: "OPERATIONS",
      targetEntityType: "SHIFT",
      requestedTasks: ["NEXT_ACTION"],
      explicitTaskIntent: true,
      routeOrderIntent: true,
      routeOrderState: "MISSING_OR_UNVERIFIED",
      routeOrderAction: routeOrderAction
        ? { label: routeOrderAction.label, targetKey: routeOrderAction.targetKey, semanticType: routeOrderAction.semanticType }
        : null,
      workflowIntent: liveRouteStep ? "CREATE_SHIFT" : null,
      workflowStepReference: liveRouteStep,
      workflowActualUiState: ui.workflowState || null,
      liveWorkflowGrounded: Boolean(liveRouteStep),
    };
  }
  const preFieldCapabilityTarget = currentScreenCapabilityTarget(text, ui);
  const preFieldCapabilityObject = semanticObjectClass(null, text);
  const preFieldConcreteCapability = Boolean(preFieldCapabilityTarget)
    && ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER"].includes(preFieldCapabilityObject);
  const selectedRelationTargetType = selectedRelationshipTraversalTarget(text, ui);
  if (selectedRelationTargetType) {
    return {
      taskType: "RELATION_LOOKUP",
      confidence: 0.96,
      domain: selectedRelationTargetType === "VEHICLE"
        ? "VEHICLES"
        : selectedRelationTargetType === "DRIVER" ? "DRIVERS" : "SHIFTS",
      targetEntityType: selectedRelationTargetType,
      relationIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "SELECTED_RECORD",
    };
  }
  const directFieldLookup = liveWorkflowCapability || hasQuoteFloorAnalysisCue(text, conversationState, ui)
    || globalProductHelpIntent
    // A visible record control must not outrank an authorized product-field
    // read merely because the Turkish request uses an imperative such as
    // "göster". Note/description lookups remain record-bound field reads;
    // their existing evidence and target bridge own the presentation.
    || (preFieldConcreteCapability && !hasProductNoteLookupCue(text))
    ? null
    : directFieldLookupShape(text, ui);
  if (directFieldLookup) return directFieldLookup;
  // Role-capability questions are product help even when the utterance does
  // not name a record or a concrete screen. Keep them in the canonical
  // product-help lane so current-surface context cannot narrow them into
  // record clarification.
  if (isExplicitRoleHelpIntent(text, { roleContext: ui?.surfaceRole })
    && !(activeWorkflowPlan(conversationState) && workflowStepReferenceFromText(text))
    && !(activeWorkflowPlan(conversationState) && hasLiveWorkflowGroundingCue(text))
    && !(liveWorkflowStepReference(ui) && hasLiveWorkflowGroundingCue(text))
    && !(ui?.path && hasExplicitCurrentScreenPurposeCue(text))
    // A visible, authorized control is a current UI target even when the
    // sentence uses broad role-help morphology (for example, "nereden
    // yaparım?"). Let the live surface target owner resolve it below.
    && !(ui?.path && currentScreenCapabilityTarget(text, ui))
    // A failure/recovery report is a continuation of the active authorized
    // task, even when its wording also contains a broad help cue.  Let the
    // live-target recovery rule below own that turn instead of converting it
    // into role-global generic help.
    && !hasActiveGuidanceFailureCue(text)
    // A local deictic with no resolvable target is a clarification request,
    // not a role-global capability question.
    && !hasScreenDeicticCue(text)) {
    return {
      taskType: "OFF_TOPIC",
      confidence: 0.97,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: true,
      generalProductHelpIntent: true,
      roleHelpIntent: true,
      primaryTask: "ROLE_EXPLANATION_HELP",
      scopeTarget: "ROLE_GLOBAL",
    };
  }
  // A clear product-level teaching/overview request is already a complete
  // product intent. Represent it before current-surface and workflow cues so
  // compatible UI context cannot narrow a global help request into a record
  // or screen clarification.
  if (globalProductHelpIntent
    // A concrete collection request such as "bekleyen vardiyaları açıkla"
    // names an authorized product set.  Do not let the broad teaching
    // speech-act classifier move it to ROLE_GLOBAL before temporal/domain
    // planning can resolve the requested collection.
    && !hasCardinalityCue(text)
    && !(activeWorkflowPlan(conversationState) && workflowStepReferenceFromText(text))
    // A named product capability question is global help even when the
    // screen-knowledge helper can ground the same words in the current UI.
    // Keep explicit screen-purpose and concrete target cues authoritative;
    // do not let the selected record manufacture a FIELD_LOOKUP target.
    && !(ui?.path && (hasSituatedCurrentSurfaceGuidanceCue(text) || currentScreenCapabilityTarget(text, ui)))
    && !(activeWorkflowPlan(conversationState) && hasLiveWorkflowGroundingCue(text))
    && !(liveWorkflowStepReference(ui) && hasLiveWorkflowGroundingCue(text))
    && !hasActiveGuidanceFailureCue(text)
    && !hasScreenDeicticCue(text)) {
    return {
      taskType: "OFF_TOPIC",
      confidence: 0.97,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: true,
      generalInformationIntent: true,
      generalProductHelpIntent: true,
      primaryTask: "GENERIC_PRODUCT_HELP",
      scopeTarget: "ROLE_GLOBAL",
    };
  }
  // An ordinal question such as “ilk adım ne?” is a continuation of the
  // active guided workflow when that workflow exists.  Resolve it before the
  // broad “... ne?” information classifier so the active task remains the
  // semantic authority.
  const workflowStepReference = workflowStepReferenceFromText(text);
  const activeWorkflow = activeWorkflowPlan(conversationState);
  const workflowEntry = guidedWorkflowEntryState(ui);
  const foregroundGuidedDraftChooser = liveGuidedDraftChooserState(ui);
  const liveStepReference = liveWorkflowStepReference(ui);
  // A contract-to-generated-shift request is a relationship lookup even when
  // the live surface exposes a Vardiyalar control. Preserve the relation
  // before visible-control matching can reinterpret the related collection as
  // a generic FIELD_LOOKUP/UI_GUIDANCE request.
  if (hasContractShiftGenerationLookupCue(text)) {
    return {
      taskType: "RELATION_LOOKUP",
      confidence: 0.96,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      relationIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  // A live guided step owns capability/how-to questions for that step.  Some
  // step nouns (notably "durak") are also valid record fields elsewhere, so
  // defer the broad field classifier until the workflow capability contract
  // has had a chance to resolve the active step.
  // The foreground chooser is more specific than its containing route. It
  // owns deictic/current-screen questions while it is actually live; explicit
  // operations still flow through their own canonical candidates below.
  if (foregroundGuidedDraftChooser
    && !liveStepReference
    && !inferExplicitOperations(text, conversationState).length
    && (hasScreenDeicticCue(text) || hasScreenContextCue(text) || hasCurrentScreenReferentCue(text))) {
    return {
      taskType: 'SCREEN_CONTEXT',
      confidence: 0.99,
      domain: 'SHIFTS',
      targetEntityType: 'SHIFT',
      screenContextIntent: true,
      screenDetailIntent: true,
      scopeTarget: 'CURRENT_SCREEN',
      explicitTaskIntent: true,
      guidedDraftChooserIntent: true,
      guidedDraftChooser: foregroundGuidedDraftChooser,
    };
  }
  // Concrete field evidence also outranks glossary/screen-context inference.
  // A field question may contain a glossary word such as "limit" while still
  // asking for a product record property, not for a definition of the term.
  const earlyCurrentCapabilityTarget = currentScreenCapabilityTarget(text, ui);
  const earlyCurrentCapabilityObject = semanticObjectClass(null, text);
  const earlyConcreteCurrentCapability = Boolean(earlyCurrentCapabilityTarget)
    && ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER"].includes(earlyCurrentCapabilityObject);
  const earlyDirectFieldLookup = liveWorkflowCapability
    || hasQuoteFloorAnalysisCue(text, conversationState, ui)
    || earlyConcreteCurrentCapability
    ? null
    : directFieldLookupShape(text, ui);
  if (earlyDirectFieldLookup) return earlyDirectFieldLookup;
  // Known glossary definitions are explicit product-knowledge requests. They
  // outrank broader current-screen/domain classifiers while preserving the
  // live surface as grounding context.
  if (!hasQuoteFloorAnalysisCue(text, conversationState, ui) && hasKnownTermDefinitionCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: "TERM_DEFINITION",
      termDefinitionIntent: true,
      explicitTaskIntent: true,
    };
  }
  // Current route/screen truth outranks a stale guided target when the user
  // explicitly asks for the visible surface itself.  The active task remains
  // available for continuation and target-specific questions; it is simply
  // not allowed to contaminate current-screen orientation.
  // A fresh auth session may not have the server's in-memory guided task yet,
  // while the browser still carries a verified current target or a canonical
  // target control is visibly rendered on the authorized surface. Failure
  // language must stay attached to that live target instead of falling into
  // generic out-of-scope chat. The target itself is revalidated downstream.
  // A generic failure report can legitimately omit the label after the
  // current entry action has already been established. In pre-wizard state,
  // inherit only the canonical entry target from the live authorized surface;
  // this resolves a referent and never grants permission or substitutes a
  // nearby disclosure/control.
  const liveTargetFailure = currentTargetFailureReference(text, ui)
    || (hasActiveGuidanceFailureCue(text) && workflowEntry?.currentTarget ? workflowEntry.currentTarget : null);
  if (liveTargetFailure) {
    const entryWorkflow = workflowEntry || null;
    const activeCreateShift = activeWorkflow?.workflowIntent === 'CREATE_SHIFT'
      || activeWorkflow?.workflowModel?.goal === 'CREATE_SHIFT';
    const targetWorkflowIntent = activeCreateShift || entryWorkflow ? 'CREATE_SHIFT' : 'ACTIVE_GUIDANCE_TARGET';
    return {
      taskType: "EXPLAIN_CURRENT_TARGET",
      confidence: 0.98,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      currentTargetExplanationIntent: true,
      currentTargetRecoveryIntent: true,
      currentTargetReference: {
        targetKind: liveTargetFailure.targetKind || "CONTROL",
        targetKey: liveTargetFailure.targetKey || null,
        semanticId: liveTargetFailure.semanticId || null,
        blockKey: liveTargetFailure.blockKey || null,
        label: liveTargetFailure.label || null,
        semanticType: liveTargetFailure.semanticType || "button",
        screenPath: liveTargetFailure.screenPath || ui.path || null,
      },
      workflowIntent: targetWorkflowIntent,
      workflowModel: activeCreateShift ? activeWorkflow?.workflowModel : (entryWorkflow ? COMPANY_GUIDED_NEW_PLAN_WORKFLOW : null),
      workflowEntryState: entryWorkflow?.state || activeWorkflow?.workflowEntryState || null,
      workflowEntryTarget: entryWorkflow?.currentTarget || activeWorkflow?.workflowEntryTarget || null,
      workflowNextStepReference: entryWorkflow?.nextStep || activeWorkflow?.workflowNextStepReference || null,
      workflowNextState: entryWorkflow?.nextState || activeWorkflow?.workflowNextState || null,
      workflowDraftAvailability: entryWorkflow?.draftAvailability || activeWorkflow?.workflowDraftAvailability || null,
      workflowActualUiState: ui.workflowState,
      continuationAction: "RECOVER",
      liveTargetGrounded: true,
    };
  }
  if (liveStepReference && hasLiveBlockExplanationCue(text, ui)) {
    const workflowModel = activeWorkflow?.workflowModel || COMPANY_GUIDED_NEW_PLAN_WORKFLOW;
    return {
      taskType: "EXPLAIN_CURRENT_TARGET",
      confidence: 0.99,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      currentTargetExplanationIntent: true,
      workflowStepIntent: true,
      workflowIntent: "CREATE_SHIFT",
      workflowModel,
      workflowStepReference: liveStepReference,
      workflowActualUiState: ui.workflowState,
      liveWorkflowGrounded: true,
      targetKind: "BLOCK",
    };
  }
  // Without a live UI step snapshot, step-by-step wording expands the
  // persisted workflow explanation. A real live step remains authoritative
  // above, where the request is a current-target explanation.
  if (activeWorkflow
    && hasStepByStepTeachingCue(text)
    && !liveStepReference) {
    const workflowIntent = String(activeWorkflow.workflowIntent || "").toUpperCase();
    const isOfferSurfaceWorkflow = workflowIntent === "OPEN_OFFER_SURFACE";
    const workflowModel = activeWorkflow.workflowModel
      || (workflowIntent === "CREATE_SHIFT" ? COMPANY_GUIDED_NEW_PLAN_WORKFLOW : null);
    const workflowStepReference = activeWorkflow.workflowStepReference
      || workflowModel?.steps?.[0]
      || null;
    return {
      taskType: "CONTINUE_CURRENT_REASONING",
      confidence: 0.99,
      domain: isOfferSurfaceWorkflow ? "OFFERS" : "SHIFTS",
      targetEntityType: isOfferSurfaceWorkflow ? "OFFER" : "SHIFT",
      continuationIntent: true,
      continuationAction: "EXPAND",
      explicitTaskIntent: true,
      workflowIntent: activeWorkflow.workflowIntent || "CREATE_SHIFT",
      workflowModel,
      workflowStepReference,
      workflowStepIntent: Boolean(workflowStepReference),
      workflowActualUiState: ui.workflowState || null,
      liveWorkflowGrounded: false,
    };
  }
  // A live workflow marker supplies step grounding, but it must not swallow an
  // explicit request about the current screen itself. Screen purpose is a
  // higher-scope request than the previously highlighted control/step.
  if (ui?.path && hasExplicitCurrentScreenPurposeCue(text) && !liveGuidedTargetExplanation) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: "SCREEN_PURPOSE",
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
      explicitTaskIntent: true,
    };
  }
  if (ui?.path && Number(ui.visibleControlCount || 0) > 0 && hasExplicitButtonExplanationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: "BUTTON_HELP",
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
      explicitTaskIntent: true,
    };
  }
  // A rendered guided modal is the strongest current-step evidence for
  // deictic follow-ups. It is contextual UI evidence only: authorization is
  // still resolved from the server-side role/screen authority and the target
  // resolver must prove a real current control before returning FOUND.
  if (liveStepReference && hasLiveWorkflowGroundingCue(text)) {
    const workflowModel = activeWorkflow?.workflowModel || COMPANY_GUIDED_NEW_PLAN_WORKFLOW;
    const capabilityIntent = workflowCapabilityIntentFromText(text, liveStepReference);
    if (isLiveWorkflowContinuationCue(text) && !hasNextSemanticBlockCue(text)) {
      return {
        taskType: "CONTINUE_CURRENT_REASONING",
        confidence: 0.99,
        domain: "SHIFTS",
        targetEntityType: "SHIFT",
        continuationIntent: true,
        continuationAction: continuationActionFor(text),
        explicitTaskIntent: true,
        workflowIntent: "CREATE_SHIFT",
        workflowModel,
        workflowStepReference: liveStepReference,
        workflowActualUiState: ui.workflowState,
        capabilityIntent,
        liveWorkflowGrounded: true,
      };
    }
    return {
      taskType: "EXPLAIN_CURRENT_TARGET",
      confidence: 0.99,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      currentTargetExplanationIntent: true,
      workflowStepIntent: true,
      workflowIntent: "CREATE_SHIFT",
      workflowModel,
      workflowStepReference: liveStepReference,
      workflowActualUiState: ui.workflowState,
      capabilityIntent,
      liveWorkflowGrounded: true,
    };
  }
  // Concrete surface navigation wins before the broader create-workflow cue;
  // “vardiya ekranını göster” names the existing surface, while “vardiya
  // oluşturma yerini bulamadım” names the creation workflow.
  if (hasUnresolvedShiftSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "UNRESOLVED_SHIFT_SURFACE",
    };
  }
  if (hasLiveMapSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: "OPERATIONS",
      targetEntityType: "SURFACE",
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "OPEN_MAP_SURFACE",
    };
  }
  if (hasReportsSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: "OPERATIONS",
      targetEntityType: "SURFACE",
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "OPEN_REPORTS_SURFACE",
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
  if (hasOfferSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: "OFFERS",
      targetEntityType: "OFFER",
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "OPEN_OFFER_SURFACE",
    };
  }
  if (hasAgreementSurfaceNavigationCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: "AGREEMENTS",
      targetEntityType: "AGREEMENT",
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "OPEN_AGREEMENTS_SURFACE",
    };
  }
  // A concrete shift-creation request remains a workflow intent even when the
  // current surface exposes a similarly named Vardiyalar control. Generic
  // visible-control capability matching must not steal CREATE_SHIFT.
  if (hasWorkflowGuidanceCue(text)) {
    if (workflowEntry) {
      return {
        taskType: "SCREEN_CONTEXT",
        confidence: 0.99,
        domain: "SHIFTS",
        targetEntityType: "SHIFT",
        screenContextIntent: true,
        explicitUiGuidance: true,
        explicitTaskIntent: true,
        workflowIntent: "CREATE_SHIFT",
        workflowModel: COMPANY_GUIDED_NEW_PLAN_WORKFLOW,
        workflowEntryState: workflowEntry.state,
        workflowEntryTarget: workflowEntry.currentTarget,
        workflowNextStepReference: workflowEntry.nextStep,
        workflowNextState: workflowEntry.nextState,
        workflowDraftAvailability: workflowEntry.draftAvailability,
        workflowStepReference: null,
        workflowStepIntent: false,
        workflowActualUiState: ui.workflowState,
      };
    }
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "CREATE_SHIFT",
      workflowModel: COMPANY_GUIDED_NEW_PLAN_WORKFLOW,
      workflowStepReference: { ordinal: 1, key: "COMPANY_LOCATION", label: "Şirket konumu" },
    };
  }
  // A selected-record identity question can contain the selected entity's
  // surface noun (for example, “burada hangi vardiya seçili?”). Do not let a
  // matching visible control claim that request as generic UI guidance.
  const selectedRecordIdentityRequest = hasSelectedRecordIdentityCue(text, ui)
    && !hasPlanReviewCue(text);
  const currentCapabilityTarget = selectedRecordIdentityRequest
    ? null
    : currentScreenCapabilityTarget(text, ui);
  const currentCapabilityObject = semanticObjectClass(null, text);
  const currentCapabilityIsConcrete = ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER"].includes(currentCapabilityObject);
  if (currentCapabilityTarget) {
    if (currentCapabilityIsConcrete) {
      const currentCapabilityDomain = {
        SHIFT: "SHIFTS",
        AGREEMENT: "AGREEMENTS",
        OFFER: "OFFERS",
        ROUTE: "OPERATIONS",
        PERSONNEL: "PERSONNEL",
        VEHICLE: "VEHICLES",
        DRIVER: "DRIVERS",
      }[currentCapabilityObject] || null;
      return {
        taskType: hasExplicitSurfaceViewVerb(text) ? "SCREEN_CONTEXT" : "FIELD_LOOKUP",
        confidence: 0.96,
        domain: currentCapabilityDomain,
        targetEntityType: currentCapabilityObject,
        screenContextIntent: hasExplicitSurfaceViewVerb(text),
        explicitUiGuidance: true,
        explicitTaskIntent: true,
        scopeTarget: "CURRENT_SCREEN",
        workflowIntent: null,
        currentTargetReference: {
          targetKind: "CONTROL",
          targetKey: String(currentCapabilityTarget.targetKey || "").trim(),
          label: String(currentCapabilityTarget.label || "").trim(),
          semanticType: String(currentCapabilityTarget.semanticType || "button").trim(),
          screenPath: String(ui.path || "").trim(),
        },
      };
    }
    const explicitNavigation = hasExplicitSurfaceNavigationVerb(text);
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.96,
      domain: null,
      targetEntityType: "SURFACE",
      screenContextIntent: true,
      explicitUiGuidance: true,
      explicitTaskIntent: true,
      scopeTarget: "CURRENT_SCREEN",
      workflowIntent: explicitNavigation ? "OPEN_SURFACE" : null,
      currentTargetReference: {
        targetKind: "CONTROL",
        targetKey: String(currentCapabilityTarget.targetKey || "").trim(),
        label: String(currentCapabilityTarget.label || "").trim(),
        semanticType: String(currentCapabilityTarget.semanticType || "button").trim(),
        screenPath: String(ui.path || "").trim(),
      },
    };
  }
  if (ui?.path && (
    hasDirectCurrentScreenExplanationCue(text)
    || (hasExplicitCurrentScreenPurposeCue(text) && !liveGuidedTargetExplanation)
  )) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: true,
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
      explicitTaskIntent: true,
    };
  }
  if (workflowStepReference && activeWorkflow) {
    return {
      taskType: "EXPLAIN_CURRENT_TARGET",
      confidence: 0.99,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      currentTargetExplanationIntent: true,
      workflowStepIntent: true,
      workflowModel: activeWorkflow.workflowModel || COMPANY_GUIDED_NEW_PLAN_WORKFLOW,
      workflowStepReference,
    };
  }
  // Once a guided workflow is active, a teach-from-zero request still refers
  // to that workflow. Preserve its current step and let the workflow composer
  // explain the real controls, prerequisites, and outcome instead of falling
  // back to a generic screen overview.
  if (activeWorkflow && hasTeachFromZeroCue(text)) {
    const activeStep = activeWorkflow.workflowStepReference
      || COMPANY_GUIDED_NEW_PLAN_WORKFLOW.steps[0];
    return {
      taskType: "EXPLAIN_CURRENT_TARGET",
      confidence: 0.99,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      currentTargetExplanationIntent: true,
      workflowStepIntent: true,
      workflowIntent: "CREATE_SHIFT",
      workflowModel: activeWorkflow.workflowModel || COMPANY_GUIDED_NEW_PLAN_WORKFLOW,
      workflowStepReference: activeStep,
      continuationAction: "EXPAND",
    };
  }
  // When a user asks to be taught from the beginning while a real product
  // surface is open, keep the request grounded in that authorized screen.
  // The general-information classifier must not turn “baştan anlat” or
  // “bunu hiç kullanmadım” into generic out-of-scope chat.
  if (hasExplicitGeneralInformationIntent(text) && !(ui?.path && hasTeachFromZeroCue(text))) {
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
  // A live guided-target explanation is more specific than a broad current
  // screen-purpose reading.  Keep explicit named-screen questions broad, but
  // let a grounded deictic follow-up explain the active workflow target.
  if (ui?.path && hasExplicitCurrentScreenPurposeCue(text) && !liveGuidedTargetExplanation) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: "SCREEN_PURPOSE",
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
      explicitTaskIntent: true,
    };
  }
  if (liveGuidedTargetExplanation) {
    return {
      taskType: "EXPLAIN_CURRENT_TARGET",
      confidence: 0.99,
      domain: null,
      targetEntityType: ui.selectedType || null,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      currentTargetExplanationIntent: true,
    };
  }
  if (hasTaskRestartCue(text) && (hasActiveGuidedTask(conversationState) || conversationState?.productContext?.semanticPlan)) {
    const activeWorkflow = activeWorkflowPlan(conversationState);
    return {
      taskType: "RETURN_TO_PRODUCT",
      confidence: 0.99,
      domain: activeWorkflow?.workflowIntent === "CREATE_SHIFT" ? "SHIFTS" : null,
      targetEntityType: activeWorkflow?.workflowIntent === "CREATE_SHIFT" ? "SHIFT" : ui.selectedType || null,
      returnToProductIntent: true,
      restartIntent: true,
      continuationAction: "RESTART",
      explicitTaskIntent: true,
      workflowIntent: activeWorkflow?.workflowIntent || null,
    };
  }
  // A discourse cue such as "adım adım" must not consume a turn that also
  // contains an explicit canonical operation. Resolve the named analytic
  // operation first; continuation is only a fallback for operation-less
  // follow-ups.
  if (hasContinuationCue(text, conversationState)
    && inferExplicitOperations(text, conversationState).length === 0) {
    return {
      taskType: "CONTINUE_CURRENT_REASONING",
      confidence: 0.99,
      domain: null,
      targetEntityType: ui.selectedType || null,
      continuationIntent: true,
      continuationAction: continuationActionFor(text),
    };
  }
  const screenKnowledgeKind = currentScreenKnowledgeKind(text, ui);
  if (screenKnowledgeKind
    && !hasCardinalityCue(text)
    && !hasSelectedShiftCheckinFactCue(text, ui)
    && inferExplicitOperations(text, conversationState).length === 0) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.96,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind,
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
      explicitTaskIntent: true,
    };
  }
  if (hasSafeGuidanceInteractionCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.97,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      explicitUiGuidance: true,
      uiTargetDiscovery: true,
      explicitTaskIntent: true,
    };
  }
  if (hasUnresolvedUiTargetCue(text)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "UNRESOLVED_UI_TARGET",
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
  // An explicit purpose question names the current surface, not the record
  // currently selected inside it.  Resolve this before the selected-record
  // fallback so live/parent shells cannot turn “bu ekran ne işe yarıyor?”
  // into a stale vehicle or student summary.
  const explicitCurrentScreenPurpose = hasScreenDeicticCue(text)
    && /(?:ne\s+ise\s+yar\p{L}*|ne\s+icin|nasil\s+calis\p{L}*|burada\s+ne\s+yap\p{L}*|burda\s+ne\s+yap\p{L}*)/iu.test(text);
  if (explicitCurrentScreenPurpose && !hasCardinalityCue(text) && !inferExplicitOperations(text, conversationState).length) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.99,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: true,
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
      explicitTaskIntent: true,
    };
  }
  // Check-in questions may use either the noun forms ("biniş/iniş") or the
  // natural verb forms ("bindiğini/indiğini"). Resolve those explicit
  // read-only facts before the generic "kaç kişi" cardinality branch below;
  // otherwise a selected shift is reduced to PASSENGER_COUNT and the
  // check-in evidence never reaches the planner/composer.
  const selectedShiftCheckinFacts = hasSelectedShiftCheckinFactCue(text, ui);
  if (selectedShiftCheckinFacts) {
    const requestedFields = [];
    if (/\bdurum\p{L}*\b/iu.test(text)) requestedFields.push({ key: "STATUS", domain: null });
    if (/\b(?:binis|bindi)\p{L}*\b/iu.test(text)) requestedFields.push({ key: "BOARDING_COUNT", domain: "OPERATIONS" });
    if (/\b(?:inis|indi)\p{L}*\b/iu.test(text)) requestedFields.push({ key: "ALIGHTING_COUNT", domain: "OPERATIONS" });
    if (requestedFields.length) {
      return {
        taskType: "FIELD_LOOKUP",
        confidence: 0.99,
        domain: "SHIFTS",
        targetEntityType: "SHIFT",
        requestedFields,
        requestedFieldsAuthoritative: true,
        selectedRecordIntent: true,
        explicitTaskIntent: true,
      };
    }
  }
  // A selected shift passenger question is a field lookup on that one
  // authorized record, not a request to count shift records. Keep the
  // cardinality family for planner compatibility while carrying the exact
  // field dependency into the read-only evidence path.
  const selectedShiftPassengerCount = hasCardinalityCue(text)
    && String(ui?.selectedType || "").toUpperCase() === "SHIFT"
    && /\b(?:yolcu|kişi|kisi|öğrenci|ogrenci|çocuk|cocuk|personel)\p{L}*\b/iu.test(text);
  if (selectedShiftPassengerCount) {
    return {
      taskType: "COUNT",
      confidence: 0.99,
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      countTarget: { targetEntityType: "SHIFT", domain: "SHIFTS" },
      requestedFields: [{ key: "PASSENGER_COUNT", domain: "SHIFTS" }],
      requestedFieldsAuthoritative: true,
      explicitCardinalityTarget: true,
      selectedRecordIntent: true,
      explicitTaskIntent: true,
    };
  }
  const selectedScreenCollectionRequest = Boolean(ui.selectedId && ui.selectedType)
    && hasTemporalCollectionCue(text);
  if (selectedScreenCollectionRequest) {
    const selectedConcept = ENTITY_CONCEPTS.find((concept) => concept.type === ui.selectedType);
    return {
      taskType: "COUNT",
      confidence: 0.98,
      domain: selectedConcept?.domain || null,
      targetEntityType: ui.selectedType,
      countTarget: { targetEntityType: ui.selectedType, domain: selectedConcept?.domain || null },
      explicitCardinalityTarget: true,
      explicitTaskIntent: true,
    };
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
  // A valid selected-record identity question may use screen-deictic wording
  // (for example, “burada hangi vardiya seçili?”). The active record is the
  // user's referent; do not let the surrounding screen-context classifier
  // erase that identity request before the selected-record branch runs.
  // An explicit next-step question remains an action request even when it
  // names the current surface (for example, “bu kârlılık ekranında hangi
  // güvenli adıma geçmeliyim?”). Resolve it before the broad screen-context
  // branch; the active selected record only grounds the safe answer.
  if (hasNextActionOperationCue(text) && !hasCardinalityCue(text)) {
    return {
      taskType: "NEXT_ACTION",
      confidence: 0.95,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      explicitTaskIntent: true,
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  if ((hasScreenContextCue(text) || (ui.path && hasCurrentScreenReferentCue(text)))
    && !hasCardinalityCue(text)
    && !hasSelectedRecordIdentityCue(text, ui)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.98,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: hasScreenDetailCue(text) || hasTeachFromZeroCue(text),
      explicitTaskIntent: true,
    };
  }
  if (hasCurrentSurfaceFocusCue(text, ui)) {
    return {
      taskType: "SCREEN_CONTEXT",
      confidence: 0.95,
      domain: null,
      targetEntityType: null,
      screenContextIntent: true,
      screenDetailIntent: false,
      explicitTaskIntent: true,
    };
  }
  if (hasScreenDeicticActionCue(text) && !hasCardinalityCue(text)) {
    return { taskType: "NEXT_ACTION", confidence: 0.95, domain: null, targetEntityType: null, screenContextIntent: true, explicitTaskIntent: true };
  }
  if (hasScreenDeicticSituationCue(text) && !hasCardinalityCue(text)) {
    return { taskType: "SITUATION", confidence: 0.95, domain: null, targetEntityType: null, screenContextIntent: true, explicitTaskIntent: true };
  }
  const explicitTask = explicitTaskShape(text, ui, conversationState);
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
  if (hasSelectedRecordExplanationCue(text, ui)) {
    const selectedType = ui.selectedType || null;
    const selectedDomain = selectedType
      ? ENTITY_CONCEPTS.find((concept) => concept.type === selectedType)?.domain || null
      : null;
    return {
      taskType: "RECORD_DETAILS",
      confidence: 0.96,
      domain: selectedDomain,
      targetEntityType: selectedType,
      requestedTasks: ["RECORD_DETAILS"],
      selectedRecordIntent: true,
      recordDetailsIntent: true,
      explicitTaskIntent: true,
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
  // Financial source/provenance questions can contain the generic "kaynak"
  // relation cue. Resolve the domain-specific cost contract before generic
  // relation traversal so a financial follow-up reaches the authorized cost
  // evidence reader instead of the relation-missing fallback.
  if (hasCostAnalysisCue(text, conversationState, ui)) return { taskType: "RISK", confidence: 0.9, domain: "BUDGET", requestedTasks: ["RISK"], explicitTaskIntent: true };
  if (!hasQuoteFloorAnalysisCue(text, conversationState, ui) && hasDirectFieldLookupCue(text) && !hasCardinalityCue(text)) {
    return directFieldLookupShape(text, ui);
  }
  // Relation grammar is more specific than a bare cardinality predicate
  // such as "var mı". Keep traversal questions in RELATION_LOOKUP even
  // when the same sentence asks whether the relation exists.
  if (hasRelationLookupCue(text)) {
    return {
      taskType: "RELATION_LOOKUP",
      confidence: 0.9,
      domain: null,
      targetEntityType: null,
      relationIntent: true,
    };
  }
  if (hasCardinalityCue(text) && !hasValueLookupCue(text)) {
    const target = inferTarget(text, { forCount: true });
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
  // A generic how-to question about the live authorized surface is still a
  // canonical screen request.  Preserve that semantic candidate in the V1
  // envelope so post-canonical adapters do not downgrade it to clarification
  // merely because no entity noun was supplied.
  if (ui?.path && /\b(?:ekran|sayfa|panel|alan|bolum|bölüm|burada|burda|burasi|burası)\p{L}*\b.{0,40}\b(?:kullan|nasil|nasıl|anlat|acikla|açıkla|ne)\p{L}*/iu.test(text)) {
    return { taskType: "SCREEN_CONTEXT", confidence: 0.9, domain: null, targetEntityType: null, screenContextIntent: true, explicitTaskIntent: true };
  }
  return { taskType: null, confidence: 0, domain: null, targetEntityType: null };
}

export function inferCanonicalSemanticRequest({ message, user, screenContext, conversationState, localSemanticProposal = null } = {}) {
  const text = normalize(message);
  const ui = currentUiContext(screenContext, conversationState, user);
  const inferredTask = inferTask({ text, rawText: message, ui, conversationState });
  const inferredProposal = applyLocalSemanticProposal({
    shape: inferredTask,
    proposal: localSemanticProposal,
    message,
  });
  const agreementOperationalClassificationCue = /\b(?:sozlesme|anlasma|agreement|contract|kontrat)\p{L}*\b/iu.test(text)
    && /\b(?:operasyon|ariza|sorun|problem|aksaklik)\p{L}*\b/iu.test(text);
  const agreementCollectionCue = hasCardinalityCue(text)
    && !agreementOperationalClassificationCue
    && !hasContractShiftGenerationLookupCue(text)
    && /\b(?:sozlesme|anlasma|agreement|contract|kontrat)\p{L}*\b/iu.test(text);
  const agreementCollectionSummaryIntent = agreementCollectionCue
    && /\b(?:neler|hangi|hangileri|liste|listele|listesi|ozet|ozeti|envanter)\p{L}*\b/iu.test(text);
  const agreementCollectionViewIntent = hasAgreementCollectionViewCue(text);
  const agreementCollectionViewProposal = agreementCollectionViewIntent
    ? {
      ...inferredProposal,
      taskType: "SCREEN_CONTEXT",
      confidence: Math.max(Number(inferredProposal?.confidence || 0), 0.98),
      domain: "AGREEMENTS",
      targetEntityType: "AGREEMENT",
      requestedTasks: ["SCREEN_CONTEXT"],
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      workflowIntent: "OPEN_AGREEMENTS_SURFACE",
      scopeTarget: "CURRENT_SCREEN",
      agreementCollectionViewIntent: true,
    }
    : inferredProposal;
  const inferred = agreementCollectionCue
    ? {
      ...agreementCollectionViewProposal,
      taskType: "COUNT",
      confidence: Math.max(Number(inferredProposal?.confidence || 0), 0.96),
      domain: "AGREEMENTS",
      targetEntityType: "AGREEMENT",
      requestedTasks: ["COUNT"],
      explicitTaskIntent: true,
      explicitCardinalityTarget: true,
      countTarget: { targetEntityType: "AGREEMENT", domain: "AGREEMENTS" },
      collectionSummaryIntent: agreementCollectionSummaryIntent,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      workflowIntent: null,
    }
    : agreementCollectionViewProposal;
  const requestedOwnershipScope = inferRequestedOwnershipScope(text);
  const schoolOperationalPlanningQuestion = isSchoolOperationalPlanningQuestion(text, ui);
  const targetCandidates = ENTITY_CONCEPTS.filter((concept) => {
    if (!hasAnyTerm(text, concept.terms)) return false;
    // "servis planı" is a generic operational-plan reference on the SCHOOL
    // operations surface. Do not turn it into an ORGANIZATION_PLAN entity;
    // explicit organization/gezi plan requests remain candidates and are
    // authorized or denied deterministically downstream.
    return !(schoolOperationalPlanningQuestion && concept.type === "ORGANIZATION_PLAN");
  });
  const roomShiftCreationRequest = ui?.surfaceRole === "ROOM"
    && inferred?.workflowIntent === "CREATE_SHIFT";
  const contextualInference = schoolOperationalPlanningQuestion
    ? {
      taskType: "EVIDENCE_SUFFICIENCY",
      confidence: 0.94,
      domain: "OPERATIONS",
      targetEntityType: null,
      requestedTasks: ["EVIDENCE_SUFFICIENCY"],
      requestedFields: [],
      requestedFieldsAuthoritative: true,
      requiredOutputSlots: ["EVIDENCE", "SAFE_NEXT_STEP"],
      screenContextIntent: true,
      explicitTaskIntent: true,
      schoolOperationalPlanIntent: true,
    }
    : roomShiftCreationRequest
      ? {
        taskType: "SCREEN_CONTEXT",
        confidence: 0.99,
        domain: "SHIFTS",
        targetEntityType: "SHIFT",
        screenContextIntent: true,
        explicitUiGuidance: true,
        explicitTaskIntent: true,
        requestedTasks: ["SCREEN_CONTEXT"],
        workflowIntent: "OPEN_SHIFT_SURFACE",
        roleCapabilityBoundary: "ROOM_CREATE_UNSUPPORTED",
        // This preserves the user's meaning before capability policy and
        // authorization decide the available ROOM outcome. It is not a
        // permission grant and must never select the COMPANY workflow.
        semanticActionCandidateHint: {
          actionClass: "CREATE",
          objectClass: "SHIFT",
          evidence: ["EXPLICIT_SHIFT_CREATION_GOAL"],
        },
      }
    : inferred;
  const effectiveInferred = contextualInference;
  const selectedFinancialGuidedEntry = isSelectedFinancialGuidedEntry(text, ui);
  const countTargetCandidates = targetCandidates.filter((concept) => !countTargetIsExplicitlyExcluded(text, concept));
  const ambiguousTarget = !schoolOperationalPlanningQuestion && hasCardinalityCue(text) && !hasValueLookupCue(text) && countTargetCandidates.length > 1;
  const task = ambiguousTarget ? "CLARIFY" : effectiveInferred.taskType;
  const selectedScopeRequested = Boolean(ui.selectedId && ui.selectedType)
    && (hasSelectedRecordCue(text) || hasSelectedRecordReference(text) || hasSelectedRecordActionReference(text, ui) || hasSelectedTypedPossessiveReference(text, ui) || hasSelectedRecordIdentityCue(text, ui) || inferred.productGroundedWritingIntent);
  const inheritedSelectedAssessmentScope = hasInheritedSelectedAssessmentScope({ text, ui, inferred: effectiveInferred });
  const scopeTarget = (effectiveInferred.roleHelpIntent || effectiveInferred.generalProductHelpIntent)
    ? "ROLE_GLOBAL"
    : effectiveInferred.generalInformationIntent || effectiveInferred.generalCreativeIntent
    ? "NONE"
    : hasRoleGlobalScopeCue(text)
    ? "ROLE_GLOBAL"
    // Operation-health metric/row requests are owned by the visible
    // operation-health projection.  A stale selected shift or agreement may
    // still be present in the conversation envelope, but it must not turn a
    // screen-level GPS/offline row request into a record diagnosis.
    : effectiveInferred.operationHealthMetricIntent
    ? "CURRENT_SCREEN"
    : selectedScopeRequested || inheritedSelectedAssessmentScope || task === "PLAN_REVIEW" || (["FIELD_LOOKUP", "RELATION_LOOKUP", "RECORD_DETAILS", "STYLE"].includes(task) && Boolean(ui.selectedId))
      ? "SELECTED_RECORD"
      : "CURRENT_SCREEN";
  const requiredOutputSlots = (() => {
    const tasks = effectiveInferred.requestedTasks || [];
    const slots = new Set(effectiveInferred.requiredOutputSlots || []);
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
    ...effectiveInferred,
    ...(selectedFinancialGuidedEntry
      ? {
        taskType: "CONTINUE_CURRENT_REASONING",
        domain: "FINANCE",
        targetEntityType: "AGREEMENT",
        requestedTasks: ["CONTINUE_CURRENT_REASONING"],
        explicitTaskIntent: false,
        explicitUserTarget: true,
        continuationIntent: true,
        continuationAction: continuationActionFor(text),
        generalProductHelpIntent: false,
        roleHelpIntent: false,
        productTeachingIntent: false,
        screenContextIntent: false,
        screenDetailIntent: false,
        screenKnowledgeIntent: false,
        explicitUiGuidance: false,
        primaryTask: "CONTINUE_CURRENT_REASONING",
        scopeTarget: "SELECTED_RECORD",
        selectedRecordIntent: true,
        ambiguity: null,
      }
      : {
        taskType: task,
      }),
    ambiguity: ambiguousTarget ? "MULTIPLE_EXPLICIT_ENTITY_TARGETS" : (inferred.ambiguity || null),
    targetCandidates: targetCandidates.map((concept) => concept.type),
    normalizedText: text,
    uiContext: ui,
    requestedOwnershipScope,
    scopeTarget: selectedFinancialGuidedEntry ? "SELECTED_RECORD" : scopeTarget,
    requiredOutputSlots,
    explicitUserTarget: selectedFinancialGuidedEntry || Boolean(effectiveInferred.targetEntityType || effectiveInferred.countTarget || effectiveInferred.requestedTasks?.length || task === "SCREEN_CONTEXT" || task === "SELECTED_RECORD_CONTEXT" || task === "RELATION_LOOKUP" || task === "RECORD_DETAILS" || task === "CONTINUE_CURRENT_REASONING" || task === "RETURN_TO_PRODUCT" || task === "FRESHNESS_CHECK" || task === "UNCERTAINTY_CHECK" || task === "EVIDENCE_SUFFICIENCY" || task === "COMPARISON" || (task === "FIELD_LOOKUP" && ui.selectedId)),
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
    generalProductHelpIntent: Boolean(shape?.generalProductHelpIntent),
    productTeachingIntent: Boolean(shape?.productTeachingIntent),
    roleHelpIntent: Boolean(shape?.roleHelpIntent),
    requiredOutputTerms: [...new Set((Array.isArray(shape?.requiredOutputTerms) ? shape.requiredOutputTerms : []).map((term) => String(term || "").trim()).filter(Boolean))],
    forbiddenOutputTerms: [...new Set((Array.isArray(shape?.forbiddenOutputTerms) ? shape.forbiddenOutputTerms : []).map((term) => String(term || "").trim()).filter(Boolean))],
    requestedFormat: shape?.requestedFormat || null,
    sentenceCount: Number(shape?.sentenceCount || 0) || null,
    screenContextIntent: Boolean(shape?.screenContextIntent || validTaskType === "SCREEN_CONTEXT"),
    screenDetailIntent: Boolean(shape?.screenDetailIntent),
    screenKnowledgeIntent: Boolean(shape?.screenKnowledgeIntent),
    screenKnowledgeKind: shape?.screenKnowledgeKind || null,
    termDefinitionIntent: Boolean(shape?.termDefinitionIntent),
    operationHealthMetricIntent: Boolean(shape?.operationHealthMetricIntent),
    operationHealthMetricMode: shape?.operationHealthMetricMode || null,
    agreementOperationBridgeIntent: Boolean(shape?.agreementOperationBridgeIntent),
    selectedRecordIntent: Boolean(shape?.selectedRecordIntent || validTaskType === "SELECTED_RECORD_CONTEXT"),
    combinedContextIntent: Boolean(shape?.combinedContextIntent),
    recordDetailsIntent: Boolean(shape?.recordDetailsIntent || validTaskType === "RECORD_DETAILS"),
    continuationIntent: Boolean(shape?.continuationIntent || validTaskType === "CONTINUE_CURRENT_REASONING"),
    continuationAction: shape?.continuationAction || null,
    workflowIntent: shape?.workflowIntent || null,
    workflowModel: shape?.workflowModel || null,
    workflowEntryState: shape?.workflowEntryState || null,
    workflowEntryTarget: shape?.workflowEntryTarget || null,
    workflowNextStepReference: shape?.workflowNextStepReference || null,
    workflowNextState: shape?.workflowNextState || null,
    workflowDraftAvailability: shape?.workflowDraftAvailability || null,
    guidedDraftChooserIntent: Boolean(shape?.guidedDraftChooserIntent),
    guidedDraftChooser: shape?.guidedDraftChooser || null,
    workflowStepIntent: Boolean(shape?.workflowStepIntent),
    workflowStepReference: shape?.workflowStepReference || null,
    requestedRoleTarget: shape?.requestedRoleTarget || null,
    returnToProductIntent: Boolean(shape?.returnToProductIntent || validTaskType === "RETURN_TO_PRODUCT"),
    currentAssignmentIntent: Boolean(shape?.currentAssignmentIntent),
    explicitTaskIntent: Boolean(shape?.explicitTaskIntent),
    countTarget: shape?.countTarget || null,
    collectionSummaryIntent: Boolean(shape?.collectionSummaryIntent),
    collectionStatusDistributionIntent: Boolean(shape?.collectionStatusDistributionIntent),
    agreementCollectionViewIntent: Boolean(shape?.agreementCollectionViewIntent),
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

// V1 and V2 remain transport-only compatibility shapes. New requests are V3:
// semantic scope and semantic action are sibling results of this one
// canonical interpreter, before capability policy and authorization.
export const SEFER_ABI_CANONICAL_REQUEST_VERSION = "SEFER-ABI-CANONICAL-REQUEST-V3";
export const SEFER_ABI_CANONICAL_REQUEST_V1_VERSION = "SEFER-ABI-CANONICAL-REQUEST-V1";
export const SEFER_ABI_CANONICAL_REQUEST_V2_VERSION = "SEFER-ABI-CANONICAL-REQUEST-V2";

const CANONICAL_SEMANTIC_SCOPE_CLASSES = new Set([
  "PRODUCT_EXPLICIT",
  "PRODUCT_CONTEXTUAL",
  "PRODUCT_AMBIGUOUS",
  "OFF_TOPIC_GENUINE",
  "UNRESOLVED",
]);

const CANONICAL_SEMANTIC_ACTION_CLASSES = new Set([
  "CREATE",
  "NAVIGATE",
  "VIEW",
  "EXPLAIN",
  "COMPARE",
  "UPDATE",
  "DELETE",
  "SEND",
  "CONTINUE",
  "RESUME",
  "NEXT",
  "PREPARE",
  "ANALYZE",
  "NONE",
]);

const CANONICAL_SEMANTIC_ACTION_RESOLUTION_STATUSES = new Set([
  "RESOLVED",
  "AMBIGUOUS",
  "UNRESOLVED",
  "NOT_APPLICABLE",
]);

const CANONICAL_SEMANTIC_OBJECT_CLASSES = new Set([
  "SHIFT",
  "AGREEMENT",
  "OFFER",
  "ROUTE",
  "PERSONNEL",
  "VEHICLE",
  "DRIVER",
  "FINANCIAL",
  "SURFACE",
  "RECORD",
]);

const CANONICAL_OPERATION_BY_TASK = Object.freeze({
  SCREEN_CONTEXT: "EXPLAIN_CURRENT_SURFACE",
  EXPLAIN_CURRENT_TARGET: "EXPLAIN_CURRENT_TARGET",
  SELECTED_RECORD_CONTEXT: "EXPLAIN_SELECTED_RECORD",
  RECORD_DETAILS: "EXPLAIN_RECORD_DETAILS",
  CONTINUE_CURRENT_REASONING: "CONTINUE_EXPLANATION",
  FIELD_LOOKUP: "LOOK_UP_FIELD",
  RELATION_LOOKUP: "LOOK_UP_RELATION",
  COUNT: "COUNT_AUTHORIZED_RECORDS",
  COMPARISON: "COMPARE_AUTHORIZED_RECORDS",
  SITUATION: "ASSESS_CURRENT_SITUATION",
  ISSUE: "DIAGNOSE_CURRENT_ISSUE",
  CAUSE: "EXPLAIN_CURRENT_CAUSE",
  RISK: "ASSESS_CURRENT_RISK",
  PRIORITY: "RESOLVE_CURRENT_PRIORITY",
  NEXT_ACTION: "RESOLVE_NEXT_SAFE_ACTION",
  SHIFT_START_READINESS: "ASSESS_SHIFT_READINESS",
  FRESHNESS_CHECK: "CHECK_CURRENT_FRESHNESS",
  UNCERTAINTY_CHECK: "CHECK_CURRENT_UNCERTAINTY",
  EVIDENCE_SUFFICIENCY: "CHECK_EVIDENCE_SUFFICIENCY",
  RESOLUTION: "RECOVER_CURRENT_TASK",
  RETURN_TO_PRODUCT: "RETURN_TO_PRODUCT",
  OFF_TOPIC: "GENERAL_INFORMATION",
  CLARIFY: "CLARIFY_SEMANTIC_REQUEST",
});

function hasGenuineOffTopicSignal(text, shape) {
  if (shape?.taskType === "OFF_TOPIC" || shape?.generalCreativeIntent || shape?.generalInformationIntent || shape?.generalArithmetic) return true;
  // This is a behavior-class boundary for ordinary non-product preference or
  // small-talk requests. It relies on the absence of product evidence and a
  // general preference/comparison speech act rather than enumerating topics.
  const preferenceGrammar = /\b(?:mi|mı|mu|mü|hangisi|tercih|oner|öner|onerir|önerir|seviyor|sever|tavsiye)\p{L}*\b/iu.test(text);
  return preferenceGrammar && text.split(/\s+/).filter(Boolean).length >= 2;
}

function hasStructuredRoleProcessExplanation(text) {
  const value = normalize(text);
  const roleAspect = /\b(?:sinir|kapsam|limit|cerceve|yetki|sorumluluk|gorev|sorumlu|dahil|haric|disinda)\p{L}*\b/iu.test(value);
  const processPredicate = /\b(?:yonet|yurut|islet|sorumlu|gorev)\p{L}*\b/iu.test(value);
  return roleAspect && processPredicate;
}

function hasProductSignal(text, shape) {
  if (shape?.taskType === "OFF_TOPIC" && !shape?.roleHelpIntent && !shape?.generalProductHelpIntent) return false;
  if (shape?.generalCreativeIntent || shape?.generalArithmetic) return false;
  if (shape?.taskType && shape.taskType !== "CLARIFY" && shape.taskType !== "OFF_TOPIC") return true;
  if (shape?.explicitUserTarget || shape?.explicitTaskIntent || shape?.explicitUiGuidance || shape?.workflowIntent) return true;
  if (Array.isArray(shape?.targetCandidates) && shape.targetCandidates.length) return true;
  if (shape?.uiContext?.currentTarget || shape?.uiContext?.workflowState) return true;
  return /\b(?:vardiya|sefer|shift|teklif|servis|sozlesme|sözleşme|anlasma|agreement|contract|kontrat|arac|araç|surucu|sürücü|personel|durak|rota|operasyon|plan|ekran|panel|sistem|konum|adres|kayit|kayıt|durum|tarih|saat|maliyet|bedel|tutar|kanıt|kanit|veri|yetki|risk)\p{L}*\b/iu.test(text);
}

function semanticObjectClass(shape, text) {
  const type = String(shape?.targetEntityType || shape?.targetCandidates?.[0] || "").trim().toUpperCase();
  if (["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER"].includes(type)) return type;
  if (String(shape?.workflowIntent || "").toUpperCase().includes("SHIFT")) return "SHIFT";
  if (/\b(?:vardiya|sefer|shift)\p{L}*\b/iu.test(text)) return "SHIFT";
  if (/\b(?:sozlesme|sözleşme|anlasma|agreement|contract|kontrat)\p{L}*\b/iu.test(text)) return "AGREEMENT";
  if (/\b(?:teklif|offer|rfq)\p{L}*\b/iu.test(text)) return "OFFER";
  if (/\b(?:rota|guzergah|güzergah|durak)\p{L}*\b/iu.test(text)) return "ROUTE";
  if (/\b(?:arac|araç)\p{L}*\b/iu.test(text)) return "VEHICLE";
  if (/\b(?:surucu|sürücü|sofor|şoför)\p{L}*\b/iu.test(text)) return "DRIVER";
  if (/\b(?:personel|calisan|çalışan|ogrenci|öğrenci)\p{L}*\b/iu.test(text)) return "PERSONNEL";
  if (shape?.screenContextIntent || shape?.taskType === "SCREEN_CONTEXT") return "SURFACE";
  return "UNKNOWN";
}

function hasOperationalShiftEntityEvidence(text) {
  const normalizedText = normalize(text);
  const serviceTerm = /\bservis\p{L}*\b/iu;
  const taskTerm = /\b(?:gorev|is)\p{L}*\b/iu;
  return (serviceTerm.test(normalizedText) && taskTerm.test(normalizedText));
}

// An explicit product object in the current utterance outranks a stale object
// inherited from an active task.  Keep this compositional: one uniquely named
// object supplies evidence, while multiple named objects remain unresolved for
// the existing ambiguity path.  A service-task construction is structural
// operational evidence for a SHIFT; it is not a surface label or permission.
function explicitObjectClassFromText(text) {
  const objectClasses = [...new Set(ENTITY_CONCEPTS
    .filter((concept) => ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL"].includes(concept.type))
    .filter((concept) => concept.terms.some((term) => {
      const normalizedTerm = normalize(term);
      if (!normalizedTerm) return false;
      if (normalizedTerm.includes(" ")) return text.includes(normalizedTerm);
      const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\p{L}*\\b`, "iu").test(text);
    }))
    .map((concept) => concept.type))];
  if (objectClasses.length === 0 && hasOperationalShiftEntityEvidence(text)) return "SHIFT";
  return objectClasses.length === 1 ? objectClasses[0] : null;
}

// Candidate formation is intentionally compositional.  The lexical helpers
// below only emit bounded evidence; none of them is canonical meaning on its
// own.  A typed action is formed only when an action predicate, a product
// object, and an affirmative goal relation agree without a stronger
// navigation/view/explanation/restart/negation signal.
const COMPOSITIONAL_ACTION_PREDICATE_STEMS = Object.freeze({
  CREATE: Object.freeze(["kur", "olustur", "baslat", "planla", "duzenle", "ayarla"]),
  VIEW: Object.freeze(["goruntule", "listele", "incele"]),
  NAVIGATE: Object.freeze(["ac", "git", "gec", "ilerle", "don"]),
  EXPLAIN: Object.freeze(["anlat", "acikla"]),
  COMPARE: Object.freeze(["karsilastir", "kiyasla"]),
});

function hasPredicateStem(text, stems) {
  return stems.some((stem) => new RegExp(`\\b${stem}\\p{L}*\\b`, "iu").test(text));
}

function compositionalGoalRelation(text, actionStems, objectStems) {
  const actionPattern = actionStems.join("|");
  const objectPattern = objectStems.join("|");
  const objectThenAction = new RegExp(
    `\\b(?:${objectPattern})\\p{L}*(?:\\s+\\p{L}+){0,8}\\s+(?:${actionPattern})\\p{L}*\\b`,
    "iu",
  ).test(text);
  const actionThenObject = new RegExp(
    `\\b(?:${actionPattern})\\p{L}*(?:\\s+\\p{L}+){0,8}\\s+(?:${objectPattern})\\p{L}*\\b`,
    "iu",
  ).test(text);
  const affirmativeGoal = /\b(?:istiyor(?:um|uz)?|ister(?:im|iz)?|gerekiyor|gerek|lazim|planliyor(?:um|uz)?|niyetim|amacim)\b/iu.test(text)
    || /\b(?:kurmak|olusturmak|baslatmak|planlamak|duzenlemek|ayarlamak|kurmam|olusturmam|baslatmam|planlamam|duzenlemem|ayarlamam)\b/iu.test(text);
  return {
    predicateObjectRelation: (objectThenAction || actionThenObject) && affirmativeGoal,
    affirmativeGoal,
  };
}

function collectCompositionalSemanticEvidence({ text, objectClass } = {}) {
  const normalizedText = normalize(text);
  const objectEvidence = objectClass === "SHIFT"
    && /\b(?:vardiya|sefer|shift)\p{L}*\b/iu.test(normalizedText);
  if (!objectEvidence) {
    return {
      actionClass: null,
      objectClass: objectClass === "UNKNOWN" ? null : objectClass,
      evidence: [],
      negated: false,
      relation: false,
      resolutionStatus: "UNRESOLVED",
    };
  }

  const createPredicate = hasPredicateStem(normalizedText, COMPOSITIONAL_ACTION_PREDICATE_STEMS.CREATE);
  const relation = compositionalGoalRelation(
    normalizedText,
    COMPOSITIONAL_ACTION_PREDICATE_STEMS.CREATE,
    ["vardiya", "sefer", "shift"],
  );
  const negated = /\b(?:istem(?:iyor|iyorum|em|eyelim|eyiz)\p{L}*|yapmay\p{L}*|kurmay\p{L}*|olusturmay\p{L}*|baslatmay\p{L}*)\b/iu.test(normalizedText);
  const competingAction = [
    ["VIEW", hasPredicateStem(normalizedText, COMPOSITIONAL_ACTION_PREDICATE_STEMS.VIEW)],
    ["NAVIGATE", hasPredicateStem(normalizedText, COMPOSITIONAL_ACTION_PREDICATE_STEMS.NAVIGATE)],
    ["EXPLAIN", hasPredicateStem(normalizedText, COMPOSITIONAL_ACTION_PREDICATE_STEMS.EXPLAIN)],
    ["COMPARE", hasPredicateStem(normalizedText, COMPOSITIONAL_ACTION_PREDICATE_STEMS.COMPARE)],
  ].find(([, present]) => present);

  if (negated && createPredicate) {
    return {
      actionClass: "NONE",
      objectClass: "SHIFT",
      evidence: ["COMPOSITIONAL_OBJECT_ENTITY", "COMPOSITIONAL_CREATE_PREDICATE", "COMPOSITIONAL_NEGATION_VETO"],
      negated: true,
      relation: relation.predicateObjectRelation,
      resolutionStatus: "UNRESOLVED",
    };
  }
  if (competingAction || !createPredicate || !relation.predicateObjectRelation) {
    return {
      actionClass: null,
      objectClass: "SHIFT",
      evidence: ["COMPOSITIONAL_OBJECT_ENTITY"],
      negated: false,
      relation: relation.predicateObjectRelation,
      resolutionStatus: competingAction ? "AMBIGUOUS" : "UNRESOLVED",
    };
  }
  return {
    actionClass: "CREATE",
    objectClass: "SHIFT",
    evidence: [
      "COMPOSITIONAL_ACTION_PREDICATE",
      "COMPOSITIONAL_OBJECT_ENTITY",
      "COMPOSITIONAL_PREDICATE_OBJECT_GOAL",
      "COMPOSITIONAL_EXPLICIT_AFFIRMATIVE_GOAL",
    ],
    negated: false,
    relation: true,
    resolutionStatus: "RESOLVED",
  };
}

// Internal contextual evidence is a bounded composition of reusable semantic
// categories. It is deliberately separate from the lexical helpers above:
// current surface/domain context can supply object meaning, while the
// utterance still has to provide a non-mutating inspection predicate. Context
// never supplies authorization or a protected record.
function collectInternalContextualEvidence({ text, objectClass, semanticContext } = {}) {
  if (!hasFreshCanonicalSemanticContext(semanticContext)) return null;
  const normalizedText = normalize(text);
  const contextEvidence = semanticContext.evidence || {};
  // A uniquely named non-SHIFT product object in the utterance is a new
  // semantic target. The current SHIFT surface/task may ground the response,
  // but it cannot replace that explicit object with stale contextual meaning.
  if (["AGREEMENT", "OFFER", "ROUTE", "PERSONNEL"].includes(objectClass)) return null;
  const strongShiftLexeme = /\b(?:sefer|vardiya|shift)\p{L}*\b/iu.test(normalizedText);
  const objectIsShift = objectClass === "SHIFT"
    || semanticContext.currentDomain === "SHIFTS"
    || (contextEvidence.object?.includes("PRODUCT_SHIFT_RECORD") && strongShiftLexeme);
  const inspection = contextEvidence.action?.includes("NON_MUTATING_INSPECTION");
  if (!objectIsShift || !inspection) return null;
  // `bakmam gerek` is an affirmative necessity construction (“I need to
  // look”), not the negative imperative `bakma` (“don't look”). Keep the
  // negative imperative boundary explicit so suffixes do not turn a current
  // surface guidance request into an unresolved/negated record inspection.
  const negated = Boolean(contextEvidence.negation)
    || /\b(?:istemiyor(?:um|uz)?|istemiyorum|istemem|degil|değil)\p{L}*\b/iu.test(normalizedText)
    || /\b(?:bak|g[oö]r)ma(?:\s|[,.!?]|$)/iu.test(normalizedText)
    || /\b(?:g[oö]r|bak|incele)\p{L}*\s+(?:istemiyor|istemem|istemiyorum)\b/iu.test(normalizedText);
  const competing = [
    ["CREATE", /\b(?:kur|olustur|oluştur|baslat|başlat|planla|duzenle|düzenle|ayarla)\p{L}*\b/iu.test(normalizedText)],
    ["NAVIGATE", /\b(?:ac|aç|git|gec|geç|ilerle|don|dön)\p{L}*\b/iu.test(normalizedText)],
    ["EXPLAIN", /\b(?:anlat|acikla|açıkla)\p{L}*\b/iu.test(normalizedText)],
    ["COMPARE", /\b(?:karsilastir|karşılaştır|kiyasla|kıyasla)\p{L}*\b/iu.test(normalizedText)],
  ].find(([, present]) => present);
  if (negated) {
    return {
      actionClass: "NONE",
      objectClass: "SHIFT",
      evidence: ["INTERNAL_CONTEXT_SHIFT_DOMAIN", "INTERNAL_CONTEXT_INSPECTION", "INTERNAL_CONTEXT_NEGATION_VETO"],
      relation: true,
      negated: true,
      resolutionStatus: "UNRESOLVED",
    };
  }
  if (competing) return null;
  return {
    actionClass: "VIEW",
    objectClass: "SHIFT",
    evidence: [
      "INTERNAL_CONTEXT_SHIFT_DOMAIN",
      "INTERNAL_CONTEXT_OPERATIONAL_RECORD",
      "INTERNAL_CONTEXT_INSPECTION",
      ...(contextEvidence.temporal?.includes("CURRENT_TIME_WINDOW") ? ["INTERNAL_CONTEXT_CURRENT_TIME"] : []),
      "INTERNAL_CONTEXT_PREDICATE_OBJECT_RELATION",
    ],
    relation: true,
    negated: false,
    resolutionStatus: "RESOLVED",
  };
}

function semanticActionModifiers({ actionClass, explicitness, targetCandidate, modifiers = null } = {}) {
  const supplied = modifiers && typeof modifiers === "object" && !Array.isArray(modifiers) ? modifiers : {};
  return {
    new: Boolean(supplied.new ?? actionClass === "CREATE"),
    current: Boolean(supplied.current ?? ["VIEW", "EXPLAIN", "COMPARE", "CONTINUE", "RESUME", "PREPARE", "ANALYZE"].includes(actionClass)),
    next: Boolean(supplied.next ?? actionClass === "NEXT"),
    explicitTarget: Boolean(supplied.explicitTarget ?? (explicitness === "EXPLICIT" || targetCandidate?.targetKey || targetCandidate?.semanticId)),
  };
}

function resolvedSemanticAction({ actionClass, objectClass, evidence, explicitness = "EXPLICIT", targetCandidate = null, modifiers = null, resolutionStatus = "RESOLVED" } = {}) {
  const normalizedObjectClass = objectClass && !["UNKNOWN", "GENERAL"].includes(String(objectClass).toUpperCase())
    ? objectClass
    : null;
  const normalizedTargetCandidate = targetCandidate || (normalizedObjectClass ? { objectClass: normalizedObjectClass } : null);
  return {
    actionClass,
    objectClass: normalizedObjectClass,
    targetCandidate: normalizedTargetCandidate,
    modifiers: semanticActionModifiers({ actionClass, explicitness, targetCandidate: normalizedTargetCandidate, modifiers }),
    explicitness,
    evidence: [...new Set(evidence || [])],
    resolutionStatus,
  };
}

// This recognizes an action/object meaning from the utterance plus currently
// authenticated context. It deliberately does not inspect an ALLOW result:
// product policy and deterministic authorization run later.
function inferCanonicalSemanticAction({ text, shape, conversationState, semanticContext = null, typedEvidence = null } = {}) {
  const normalizedText = normalize(text);
  const hinted = shape?.semanticActionCandidateHint;
  const activeWorkflowIntent = String(
    conversationState?.activeGuidedTask?.semanticPlan?.workflowIntent
    || conversationState?.activeTask?.semanticPlan?.workflowIntent
    || "",
  ).toUpperCase();
  const activeGuidedWorkflowRecovery = Boolean(
    shape?.currentTargetRecoveryIntent
    && activeWorkflowIntent === "CREATE_SHIFT"
    && conversationState?.activeGuidedTask?.semanticPlan,
  );
  // A supported role noun can be the grammatical subject of a broad
  // responsibility/orientation request (for example, “Personel tarafında
  // bana düşen işleri nasıl öğrenirim?”). Typed evidence has already proved
  // that this is ROLE + PRODUCT_AREA with no concrete object/reference. Do
  // not promote the subject noun to a PERSONNEL record in that shape; an
  // explicit personnel collection/record request remains concrete because it
  // has a different typed request mode or target.
  const typedRoleSubjectProductAreaHelp = typedEvidence?.subject?.value === "ROLE"
    && String(typedEvidence?.requestMode?.value || "").toUpperCase() === "EXPLAIN"
    && String(typedEvidence?.object?.value || "").toUpperCase() === "NONE"
    && String(typedEvidence?.reference?.value || "ABSENT").toUpperCase() === "ABSENT"
    && String(typedEvidence?.targetRequest?.value || "").toUpperCase() === "PRODUCT_AREA"
    && String(typedEvidence?.roleAspect?.value || "NONE").toUpperCase() !== "NONE";
  const explicitTextObjectClass = typedRoleSubjectProductAreaHelp
    ? null
    : explicitObjectClassFromText(normalizedText);
  const objectClass = String(
    explicitTextObjectClass
      || hinted?.objectClass
      || (typedRoleSubjectProductAreaHelp ? "UNKNOWN" : semanticObjectClass(shape, normalizedText)),
  ).toUpperCase();
  const contextualObjectClass = objectClass === "UNKNOWN" && activeWorkflowIntent.includes("SHIFT") ? "SHIFT" : objectClass;
  const hintEvidence = Array.isArray(hinted?.evidence) ? hinted.evidence : [];
  const previousSemanticPlan = conversationState?.lastSettledResult?.semanticPlan
    || conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || null;
  const helpContinuationBase = ["GENERIC_PRODUCT_HELP", "ROLE_EXPLANATION_HELP"].includes(String(previousSemanticPlan?.family || ""))
    || String(previousSemanticPlan?.conversationRoute || "") === "GENERIC_PRODUCT_HELP";
  const typedReference = String(typedEvidence?.reference?.value || "").toUpperCase();
  const typedReferenceNeedsClarification = ["AMBIGUOUS", "UNRESOLVED", "REJECTED_STALE", "STALE"].includes(typedReference);
  const typedObjectEvidence = String(typedEvidence?.object?.value || "").toUpperCase();
  const typedReferenceRequiresConcreteTarget = typedReferenceNeedsClarification && typedObjectEvidence !== "SURFACE";
  // A quote-floor explanation is a screen-scoped financial follow-up when the
  // current authorized surface and the settled financial evidence both agree.
  // It does not require a selected record; unlike a generic deictic request,
  // the metric identity is carried by the current financial surface and the
  // prior typed quote-floor evidence. Non-financial surfaces and absent prior
  // evidence remain fail-closed below.
  const referenceLessQuoteFloorFollowUp = shape?.taskType === "RISK"
    && typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true
    && hasQuoteFloorContextualFollowUpCue(normalizedText, conversationState, semanticContext?.currentSurface);

  if (shape?.taskType === "ISSUE"
    && shape?.operationHealthMetricIntent
    && !hasExplicitSurfaceNavigationVerb(normalizedText)
    && !shape?.ambiguity) {
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: null,
      evidence: ["CANONICAL_OPERATION_HEALTH_METRIC_TASK"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }

  // Selected-record identity is already grounded by the authenticated UI
  // selection. The typed reference classifier may not have a lexical record
  // token for natural questions such as “şu an hangi vardiyadayım?”. Keep the
  // semantic action resolved here; authorization still validates the selected
  // typed record downstream.
  if (shape?.taskType === "SELECTED_RECORD_CONTEXT"
    && shape?.selectedRecordIntent
    && !shape?.ambiguity) {
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: "RECORD",
      targetCandidate: { objectClass: "RECORD" },
      evidence: ["CANONICAL_SELECTED_RECORD_CONTEXT"],
      explicitness: shape?.explicitTaskIntent ? "EXPLICIT" : "CONTEXTUAL",
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }

  // An operational issue inquiry is a current-screen diagnostic, not a
  // request to resolve a record named by a deictic such as “şu anda”. Keep
  // the read-only issue action resolved so reference handling cannot turn a
  // truthful aggregate question into generic clarification.
  if (shape?.taskType === "ISSUE" && !shape?.ambiguity) {
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: null,
      evidence: ["CANONICAL_ISSUE_DIAGNOSTIC_TASK"],
      explicitness: shape?.explicitTaskIntent ? "EXPLICIT" : "CONTEXTUAL",
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }

  // An explicit current-screen knowledge request is grounded by the
  // authenticated surface itself. Resolve it as a read-only explanation
  // before lexical deictic validation can mistake the screen reference for
  // an unresolved record. This preserves fail-closed record handling while
  // allowing questions such as “Bu finans ekranında önce neyi kontrol
  // edeyim?” to reach the current-surface answer owner.
  if (shape?.taskType === "SCREEN_CONTEXT"
    && shape?.screenKnowledgeIntent === true
    && !shape?.ambiguity
    // Explicit surface-opening language is navigation, even though the
    // same sentence also carries screen-knowledge evidence. Let the VIEW
    // owner activate the authorized route instead of explaining the current
    // screen.
    && !(["VIEW", "NAVIGATE"].includes(String(typedEvidence?.requestMode?.value || "").toUpperCase())
      && (hasShiftSurfaceNavigationCue(normalizedText)
        || hasOfferSurfaceNavigationCue(normalizedText)
        || hasAgreementSurfaceNavigationCue(normalizedText)
        || hasCheckinSurfaceNavigationCue(normalizedText)
        || hasAppliedRouteSurfaceNavigationCue(normalizedText)
        || hasLiveMapSurfaceNavigationCue(normalizedText)
        || hasReportsSurfaceNavigationCue(normalizedText)))) {
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: "SURFACE",
      targetCandidate: { objectClass: "SURFACE" },
      evidence: ["CANONICAL_CURRENT_SCREEN_CONTEXT"],
      explicitness: shape?.explicitTaskIntent ? "EXPLICIT" : "CONTEXTUAL",
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }

  const currentTargetGrounded = Boolean(shape?.currentTargetRecoveryIntent || shape?.currentTargetExplanationIntent);
  const referenceLessFinancialReadiness = shape?.taskType === "RISK"
    && typedEvidence?.specificity?.financialReadinessEvidence === true;
  if (typedReferenceRequiresConcreteTarget
    && !currentTargetGrounded
    && !referenceLessFinancialReadiness
    && !referenceLessQuoteFloorFollowUp
    && !(shape?.taskType === "COUNT" && shape?.countTarget?.targetEntityType)) {
    return resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: null,
      evidence: ["DEICTIC_REFERENCE_WITHOUT_VALID_REFERENT"],
      explicitness: "UNRESOLVED",
      resolutionStatus: "UNRESOLVED",
      modifiers: { new: false, current: false, next: false, explicitTarget: false },
    });
  }

  // Comparison is a first-class semantic action. It is resolved before live
  // target continuation so an explicit comparison request cannot be replaced
  // by the previously highlighted product control. Missing or multiple
  // object candidates keep the COMPARE action while preserving truthful
  // unresolved/ambiguous status; no UNKNOWN object is fabricated.
  if (shape?.taskType === "COMPARISON" || shape?.requestedTasks?.includes?.("COMPARISON")) {
    const activeComparisonSet = conversationState?.activeComparisonSet || conversationState?.activeReasoningEntitySet || [];
    const targetCandidateCount = Array.isArray(shape?.targetCandidates) ? shape.targetCandidates.length : 0;
    const activeComparisonCount = Array.isArray(activeComparisonSet) ? activeComparisonSet.filter(Boolean).length : 0;
    const activeComparisonTypes = [...new Set((Array.isArray(activeComparisonSet) ? activeComparisonSet : [])
      .map((item) => String(item?.type || item?.entityType || "").trim().toUpperCase())
      .filter((type) => ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL"].includes(type)))];
    const resolutionStatus = shape?.ambiguity || activeComparisonCount > 2 || targetCandidateCount > 1
      ? "AMBIGUOUS"
      : targetCandidateCount === 0 && activeComparisonCount < 2
        ? "UNRESOLVED"
        : "RESOLVED";
    const comparisonObjectClass = targetCandidateCount > 1
      ? null
      : objectClass !== "UNKNOWN"
        ? objectClass
      : activeComparisonTypes.length === 1
        ? activeComparisonTypes[0]
        : null;
    return resolvedSemanticAction({
      actionClass: "COMPARE",
      objectClass: comparisonObjectClass,
      evidence: [...hintEvidence, "CANONICAL_COMPARISON_TASK"],
      explicitness: shape?.explicitTaskIntent ? "EXPLICIT" : "CONTEXTUAL",
      resolutionStatus,
      modifiers: { current: true, explicitTarget: targetCandidateCount > 0 || activeComparisonCount > 0 },
    });
  }

  // A live failure/reference targets the already rendered control. Its
  // surrounding workflow may be CREATE_SHIFT, but that future operation must
  // not overwrite recovery on the current target.
  if (activeGuidedWorkflowRecovery) {
    return resolvedSemanticAction({
      actionClass: "CONTINUE",
      objectClass: contextualObjectClass === "UNKNOWN" ? "SHIFT" : contextualObjectClass,
      evidence: ["ACTIVE_WORKFLOW_RECOVERY"],
      explicitness: "CONTEXTUAL",
      resolutionStatus: "RESOLVED",
    });
  }
  if (shape?.currentTargetRecoveryIntent || shape?.currentTargetExplanationIntent) {
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: contextualObjectClass === "UNKNOWN" ? "SURFACE" : contextualObjectClass,
      evidence: [shape?.currentTargetRecoveryIntent ? "LIVE_TARGET_RECOVERY" : "LIVE_TARGET_EXPLANATION"],
      explicitness: "CONTEXTUAL",
      targetCandidate: shape?.currentTargetReference?.targetKey ? { targetKey: shape.currentTargetReference.targetKey } : null,
    });
  }
  if (shape?.restartIntent) {
    return resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: contextualObjectClass,
      evidence: ["TASK_RESTART_REQUEST"],
      explicitness: "CONTEXTUAL",
      modifiers: { new: true, current: false, next: false, explicitTarget: false },
    });
  }
  if (hasActiveTaskResumeCue(normalizedText, conversationState)) {
    return resolvedSemanticAction({ actionClass: "RESUME", objectClass: contextualObjectClass === "UNKNOWN" ? "RECORD" : contextualObjectClass, evidence: ["ACTIVE_TASK_RESUME_CUE"], explicitness: "CONTEXTUAL" });
  }
  if (shape?.continuationIntent || shape?.taskType === "CONTINUE_CURRENT_REASONING") {
    const continuationObjectClass = activeWorkflowIntent.includes("SHIFT")
      ? "SHIFT"
      : contextualObjectClass === "UNKNOWN"
        ? (helpContinuationBase ? "SURFACE" : "RECORD")
        : contextualObjectClass;
    return resolvedSemanticAction({
      actionClass: "CONTINUE",
      objectClass: continuationObjectClass,
      evidence: ["SETTLED_TASK_CONTINUATION", ...(helpContinuationBase ? ["GENERIC_HELP_CONTINUATION"] : [])],
      explicitness: "CONTEXTUAL",
    });
  }
  const typedRequestMode = String(typedEvidence?.requestMode?.value || "").toUpperCase();
  const typedObjectClass = String(typedEvidence?.object?.value || "").toUpperCase();
  // An affirmative compositional creation goal is more specific than a broad
  // typed mode (including EXPLAIN/UPDATE) that can consume the same SHIFT noun.
  // Preserve the product task before explanation/field projection consumes
  // it. Authorization remains a later, independent decision.
  const compositionalCreateEvidence = collectCompositionalSemanticEvidence({
    text: normalizedText,
    objectClass: contextualObjectClass,
  });
  if (compositionalCreateEvidence.negated
    && !typedReferenceRequiresConcreteTarget
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    return resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: "SHIFT",
      evidence: [...compositionalCreateEvidence.evidence, "COMPOSITIONAL_NEGATION_PRECEDES_TYPED_ACTION"],
      explicitness: "EXPLICIT",
      resolutionStatus: "UNRESOLVED",
    });
  }
  if (compositionalCreateEvidence.actionClass === "CREATE"
    && compositionalCreateEvidence.objectClass === "SHIFT"
    && !typedReferenceRequiresConcreteTarget
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    return resolvedSemanticAction({
      actionClass: "CREATE",
      objectClass: "SHIFT",
      evidence: [
        ...compositionalCreateEvidence.evidence,
        "COMPOSITIONAL_CREATE_PRECEDES_TYPED_ACTION",
      ],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
    });
  }
  // An explicit numeric offer reference is a record-view request even when
  // the live UI envelope also carries a generic OPEN_SURFACE workflow. Keep
  // the exact record identity in the canonical view lane so guided-target
  // resolution can bind the authorized offer card instead of the enclosing
  // offers surface. Authorization and retrieval remain downstream.
  const explicitOfferRecordView = typedObjectClass === "OFFER"
    && typedEvidence?.specificity?.quoteFloorAnalysisEvidence !== true
    && /\b(?:teklif|offer|rfq)\s*#?\s*\d+\b/iu.test(normalizedText);
  if (explicitOfferRecordView) {
    return resolvedSemanticAction({
      actionClass: "VIEW",
      objectClass: "OFFER",
      evidence: ["EXPLICIT_OFFER_RECORD_VIEW"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
      modifiers: { current: true, new: false, next: false, explicitTarget: true },
    });
  }
  // The central specificity resolver identifies movement plus a concrete
  // target before legacy COUNT/VIEW projection can consume the same noun.
  // A contract-to-generated-shift request is a relationship lookup even when
  // the wording uses an opening verb. Preserve the relation before typed
  // navigation specificity can reinterpret the related collection as a
  // generic surface destination.
  if (hasContractShiftGenerationLookupCue(normalizedText)) {
    return resolvedSemanticAction({
      actionClass: "VIEW",
      objectClass: "SHIFT",
      targetCandidate: { objectClass: "SHIFT" },
      evidence: ["CONTRACT_SHIFT_RELATION_LOOKUP"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
      modifiers: { current: true, new: false, next: false, explicitTarget: true },
    });
  }
  // An explicit surface-opening request is a visible navigation task even
  // when the specificity layer also carries screen-context evidence. Keep
  // the workflow destination on the VIEW lane so the authorized surface
  // owner can activate the real route instead of replying with a description
  // of the screen the user is already on.
  const openSurfaceWorkflow = [
    "OPEN_SURFACE",
    "OPEN_SHIFT_SURFACE",
    "OPEN_OFFER_SURFACE",
    "OPEN_AGREEMENTS_SURFACE",
    "OPEN_MAP_SURFACE",
    "OPEN_REPORTS_SURFACE",
    "OPEN_CHECKIN_SURFACE",
    "OPEN_APPLIED_ROUTE_SURFACE",
  ].includes(String(shape?.workflowIntent || "").toUpperCase());
  if (openSurfaceWorkflow
    && typedRequestMode === "VIEW"
    && typedEvidence?.quality?.authorizationEffect === "NONE"
    && !typedReferenceRequiresConcreteTarget) {
    const surfaceObject = ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "SURFACE"].includes(contextualObjectClass)
      && contextualObjectClass !== "SURFACE"
      ? contextualObjectClass
       : (semanticObjectClass(shape, normalizedText) || "SURFACE");
    return resolvedSemanticAction({
      actionClass: "VIEW",
      objectClass: surfaceObject,
      targetCandidate: { objectClass: surfaceObject },
      evidence: ["CANONICAL_OPEN_SURFACE_VIEW"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
      modifiers: { current: false, new: false, next: false, explicitTarget: true },
    });
  }
  if (typedEvidence?.specificity?.selectedTask === "NAVIGATION"
    && !typedReferenceRequiresConcreteTarget
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    const textualNavigationObject = semanticObjectClass(null, normalizedText);
    const navigationObject = ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER", "RECORD"].includes(typedEvidence?.specificity?.navigationTargetClass)
      ? typedEvidence.specificity.navigationTargetClass
      : ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER", "RECORD"].includes(typedObjectClass)
        ? typedObjectClass
      : (textualNavigationObject !== "UNKNOWN"
        ? textualNavigationObject
        : (contextualObjectClass === "UNKNOWN" ? null : contextualObjectClass));
    return resolvedSemanticAction({
      actionClass: "NAVIGATE",
      objectClass: navigationObject,
      targetCandidate: navigationObject ? { objectClass: navigationObject } : null,
      evidence: ["CENTRAL_SPECIFICITY_NAVIGATION", ...(navigationObject ? ["TYPED_OBJECT_EVIDENCE"] : [])],
      explicitness: "EXPLICIT",
      resolutionStatus: navigationObject ? "RESOLVED" : "UNRESOLVED",
    });
  }
  const explicitSurfaceViewCue = hasShiftSurfaceNavigationCue(normalizedText)
    || hasOfferSurfaceNavigationCue(normalizedText)
    || hasAgreementSurfaceNavigationCue(normalizedText)
    || hasCheckinSurfaceNavigationCue(normalizedText)
    || hasAppliedRouteSurfaceNavigationCue(normalizedText)
    || hasLiveMapSurfaceNavigationCue(normalizedText)
    || hasReportsSurfaceNavigationCue(normalizedText);
  if (typedRequestMode === "VIEW"
    && explicitSurfaceViewCue
    && !typedReferenceRequiresConcreteTarget
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    const surfaceObject = ["SHIFT", "AGREEMENT", "OFFER"].includes(typedObjectClass)
      ? typedObjectClass
       : (semanticObjectClass(shape, normalizedText) || "SURFACE");
    return resolvedSemanticAction({
      actionClass: "VIEW",
      objectClass: surfaceObject,
      targetCandidate: { objectClass: surfaceObject },
      evidence: ["CANONICAL_SURFACE_NAVIGATION_VIEW"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
      modifiers: { current: false, new: false, next: false, explicitTarget: true },
    });
  }
  if (typedRequestMode === "NAVIGATE"
    && explicitSurfaceViewCue
    && !typedReferenceRequiresConcreteTarget
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    const surfaceObject = ["SHIFT", "AGREEMENT", "OFFER"].includes(typedObjectClass)
      ? typedObjectClass
       : (semanticObjectClass(shape, normalizedText) || "SURFACE");
    return resolvedSemanticAction({
      actionClass: "NAVIGATE",
      objectClass: surfaceObject,
      targetCandidate: { objectClass: surfaceObject },
      evidence: ["CANONICAL_SURFACE_NAVIGATION"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
      modifiers: { current: false, new: false, next: false, explicitTarget: true },
    });
  }
  if (typedEvidence?.specificity?.selectedTask === "SCREEN_CONTEXT"
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: "SURFACE",
      targetCandidate: { objectClass: "SURFACE" },
      evidence: ["CENTRAL_SPECIFICITY_SCREEN_CONTEXT"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }
  // Route-order recovery is a canonical next action. It must outrank the
  // generic typed EXPLAIN/ROUTE projection below, otherwise the same live
  // precondition is downgraded to a field lookup and loses its action safety
  // contract.
  if (shape?.routeOrderIntent || shape?.taskType === "NEXT_ACTION") {
    return resolvedSemanticAction({
      actionClass: "NEXT",
      objectClass: "ROUTE",
      evidence: ["LIVE_NEXT_STEP_REQUIREMENT"],
      explicitness: shape?.liveWorkflowGrounded ? "CONTEXTUAL" : "EXPLICIT",
    });
  }
  if (shape?.taskType === "COUNT") {
    const countObject = ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "RECORD"].includes(contextualObjectClass)
      ? contextualObjectClass
      : null;
    return resolvedSemanticAction({
      actionClass: "VIEW",
      objectClass: countObject,
      targetCandidate: countObject ? { objectClass: countObject } : null,
      evidence: ["CANONICAL_COUNT_TASK"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
    });
  }
  if (shape?.taskType === "RISK") {
    return resolvedSemanticAction({
      actionClass: "ANALYZE",
      objectClass: null,
      evidence: ["CANONICAL_RISK_TASK"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
    });
  }
  // A where/how question can be typed broadly as EXPLAIN while the canonical
  // shape has already resolved the concrete COMPANY creation workflow. The
  // workflow intent is the narrower semantic authority here; preserve
  // NAVIGATE and other explicit modes below so surface navigation does not
  // become creation guidance accidentally.
  if (shape?.workflowIntent === "CREATE_SHIFT"
    && typedRequestMode === "EXPLAIN"
    && typedObjectClass === "SHIFT"
    && !/\b(?:yetki|izin|iznim|izni|yapabil|sorumluluk|gorev|görev)\p{L}*\b/iu.test(normalizedText)) {
    return resolvedSemanticAction({
      actionClass: "CREATE",
      objectClass: "SHIFT",
      evidence: ["CANONICAL_WORKFLOW_INTENT_CREATE_SHIFT", "TYPED_WORKFLOW_GUIDANCE_EXPLAIN"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
    });
  }
  if (typedRequestMode === "UPDATE"
    && ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER"].includes(typedObjectClass)
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    return resolvedSemanticAction({
      actionClass: "UPDATE",
      objectClass: typedObjectClass,
      evidence: ["TYPED_REQUEST_MODE_UPDATE", "TYPED_CONCRETE_OBJECT"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
    });
  }
  if (typedRequestMode === "EXPLAIN"
    && !typedReferenceRequiresConcreteTarget
    && ["RECORD", "ENTITY"].includes(String(typedEvidence?.targetRequest?.value || "").toUpperCase())
    && typedEvidence?.object?.value !== "NONE"
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    const typedExplanationObject = CANONICAL_SEMANTIC_OBJECT_CLASSES.has(typedObjectClass)
      ? typedObjectClass
      : "RECORD";
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: typedExplanationObject,
      targetCandidate: { objectClass: typedExplanationObject },
      evidence: ["TYPED_REQUEST_MODE_EXPLAIN", "TYPED_CONCRETE_OBJECT"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
    });
  }
  // Central specificity resolution owns concrete field questions before the
  // contextual inspection fallback can project them as VIEW.  The field task
  // remains an explanation/read operation; authorization and record
  // grounding still run after this semantic decision.
  if (shape?.taskType === "FIELD_LOOKUP"
    && typedEvidence?.specificity?.selectedTask === "FIELD_LOOKUP"
    && !typedReferenceRequiresConcreteTarget
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    const fieldObject = ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER", "RECORD"].includes(typedObjectClass)
      ? typedObjectClass
      : (contextualObjectClass === "UNKNOWN" ? null : contextualObjectClass);
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: fieldObject,
      targetCandidate: fieldObject ? { objectClass: fieldObject } : null,
      evidence: ["CENTRAL_SPECIFICITY_FIELD_LOOKUP"],
      explicitness: "EXPLICIT",
      resolutionStatus: fieldObject ? "RESOLVED" : "UNRESOLVED",
    });
  }
  if (["CREATE", "VIEW", "NAVIGATE", "DELETE", "SEND", "COMPARE"].includes(typedRequestMode)
    && !typedReferenceRequiresConcreteTarget
    && !shape?.ambiguity
    && typedEvidence?.quality?.authorizationEffect === "NONE") {
    const candidateObject = ["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "VEHICLE", "DRIVER", "FINANCIAL", "RECORD", "SURFACE"].includes(typedObjectClass)
      ? typedObjectClass
      : (contextualObjectClass === "UNKNOWN" ? null : contextualObjectClass);
    const typedActionObject = CANONICAL_SEMANTIC_OBJECT_CLASSES.has(candidateObject) ? candidateObject : null;
    return resolvedSemanticAction({
      actionClass: typedRequestMode,
      objectClass: typedActionObject,
      targetCandidate: typedActionObject ? { objectClass: typedActionObject } : null,
      evidence: [`TYPED_REQUEST_MODE_${typedRequestMode}`, ...(typedActionObject ? ["TYPED_OBJECT_EVIDENCE"] : [])],
      // A bare navigation imperative such as “oraya git” carries an action
      // mode but no authorized surface/record. Keep it unresolved so the
      // canonical scope routes to clarification instead of manufacturing a
      // target or silently choosing the current screen.
      explicitness: typedActionObject ? "EXPLICIT" : "UNRESOLVED",
      resolutionStatus: typedActionObject ? "RESOLVED" : "UNRESOLVED",
    });
  }
  if (shape?.generalProductHelpIntent) {
    const explicitSurfaceEvidence = Boolean(
      shape?.screenContextIntent
      || shape?.screenKnowledgeIntent
      || shape?.screenDetailIntent
      || shape?.explicitUiGuidance
      || String(typedEvidence?.targetRequest?.value || "").toUpperCase() === "SURFACE"
      || String(typedEvidence?.object?.value || "").toUpperCase() === "SURFACE",
    );
    return resolvedSemanticAction({
      actionClass: "EXPLAIN",
      // Incidental current-surface context is not a semantic object. Keep a
      // concrete role/process subject when it was textually resolved, and
      // project SURFACE only when the request itself carries explicit surface
      // evidence.
      objectClass: hasStructuredRoleProcessExplanation(normalizedText)
        && contextualObjectClass !== "UNKNOWN"
        ? contextualObjectClass
        : explicitSurfaceEvidence
          ? "SURFACE"
          : null,
      evidence: ["GENERAL_PRODUCT_HELP_REQUEST"],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
      modifiers: { current: true, new: false, next: false, explicitTarget: false },
    });
  }

  const compositionalEvidence = collectCompositionalSemanticEvidence({ text: normalizedText, objectClass: contextualObjectClass });
  if (compositionalEvidence.negated) {
    return resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: "SHIFT",
      evidence: compositionalEvidence.evidence,
      explicitness: "EXPLICIT",
      resolutionStatus: "UNRESOLVED",
      modifiers: { new: false, current: false, next: false, explicitTarget: false },
    });
  }
  if (compositionalEvidence.actionClass === "CREATE" && compositionalEvidence.resolutionStatus === "RESOLVED") {
    return resolvedSemanticAction({
      actionClass: "CREATE",
      objectClass: "SHIFT",
      evidence: [...hintEvidence, ...compositionalEvidence.evidence],
      explicitness: "EXPLICIT",
      resolutionStatus: "RESOLVED",
    });
  }

  const contextualEvidence = collectInternalContextualEvidence({
    text: normalizedText,
    objectClass: contextualObjectClass,
    semanticContext,
  });
  if (contextualEvidence?.negated) {
    return resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: "SHIFT",
      evidence: contextualEvidence.evidence,
      explicitness: "EXPLICIT",
      resolutionStatus: "UNRESOLVED",
      modifiers: { new: false, current: false, next: false, explicitTarget: false },
    });
  }
  if (contextualEvidence?.actionClass === "VIEW" && contextualEvidence.resolutionStatus === "RESOLVED") {
    return resolvedSemanticAction({
      actionClass: "VIEW",
      objectClass: "SHIFT",
      evidence: [...hintEvidence, ...contextualEvidence.evidence],
      explicitness: explicitObjectClassFromText(normalizedText)
        && hasExplicitSurfaceNavigationVerb(normalizedText)
        ? "EXPLICIT"
        : "CONTEXTUAL",
      resolutionStatus: "RESOLVED",
      modifiers: { current: true, new: false, next: false, explicitTarget: false },
    });
  }

  if (hinted?.actionClass === "CREATE"
    && hinted?.objectClass === "SHIFT"
    && !/\b(?:yetki|izin|iznim|izni|yapabil|sorumluluk|gorev|görev)\p{L}*\b/iu.test(normalizedText)) {
    return resolvedSemanticAction({ actionClass: "CREATE", objectClass: "SHIFT", evidence: [...hintEvidence, "EXPLICIT_SHIFT_CREATE_GOAL"] });
  }

  if (/^UNRESOLVED_[A-Z0-9_]+$/.test(String(shape?.workflowIntent || ""))) {
    return resolvedSemanticAction({ actionClass: "NAVIGATE", objectClass, evidence: ["EXPLICIT_UNRESOLVED_UI_TARGET"] });
  }

  // A canonically identified existing surface takes precedence over a shared
  // creation verb: “vardiya ekranını aç” navigates; it does not create.
  if (/^OPEN_[A-Z0-9_]+$/.test(String(shape?.workflowIntent || ""))) {
    return resolvedSemanticAction({ actionClass: "NAVIGATE", objectClass, evidence: ["CANONICAL_SURFACE_NAVIGATION"] });
  }

  const capabilityBoundaryQuestion = /\b(?:yetki|izin|iznim|izni|yapabil|sorumluluk|gorev|görev)\p{L}*\b/iu.test(normalizedText);
  // Explicit record-detail requests are resolved above, so the generic
  // "aç" creation spelling remains available for the existing ROOM create
  // policy (for example, “yeni vardiya açma talebim var”).
  const explicitShiftCreate = objectClass === "SHIFT"
    && !hasPreparationOnlyCue(normalizedText)
    && !capabilityBoundaryQuestion
    && /\b(?:yeni|sifirdan|sıfırdan)?\s*(?:vardiya|sefer|shift)\p{L}*(?:\s+(?:plani|planı))?.{0,36}\b(?:olustur|oluştur|baslat|başlat|ac(?!ikla)|aç(?!ıkla))\p{L}*\b/iu.test(normalizedText);
  if ((shape?.workflowIntent === "CREATE_SHIFT" && !capabilityBoundaryQuestion) || explicitShiftCreate) {
    return resolvedSemanticAction({ actionClass: "CREATE", objectClass: "SHIFT", evidence: [...hintEvidence, "EXPLICIT_SHIFT_CREATE_GOAL"] });
  }

  if (objectClass !== "UNKNOWN" && hasExplicitSurfaceViewVerb(normalizedText)) {
    return resolvedSemanticAction({ actionClass: "VIEW", objectClass, evidence: ["EXPLICIT_SURFACE_VIEW"] });
  }

  if (shape?.workflowStepIntent && shape?.capabilityIntent) {
    return resolvedSemanticAction({ actionClass: "PREPARE", objectClass: objectClass === "UNKNOWN" ? "ROUTE" : objectClass, evidence: ["LIVE_WORKFLOW_CAPABILITY"] , explicitness: "CONTEXTUAL" });
  }
  if (shape?.taskType && shape.taskType !== "CLARIFY" && shape.taskType !== "OFF_TOPIC") {
    const liveContextExplanation = Boolean(shape?.liveWorkflowGrounded || shape?.currentTargetExplanationIntent || shape?.workflowStepIntent || shape?.continuationIntent);
    return resolvedSemanticAction({ actionClass: "EXPLAIN", objectClass, evidence: ["CANONICAL_TASK_EXPLANATION"], explicitness: liveContextExplanation ? "CONTEXTUAL" : (shape?.explicitTaskIntent ? "EXPLICIT" : "CONTEXTUAL") });
  }
  if (shape?.taskType === "OFF_TOPIC" || shape?.generalInformationIntent || shape?.generalCreativeIntent) {
    return resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: null,
      explicitness: "NONE",
      evidence: ["GENERAL_NON_PRODUCT_REQUEST"],
      resolutionStatus: "NOT_APPLICABLE",
      modifiers: { new: false, current: false, next: false, explicitTarget: false },
    });
  }
  return resolvedSemanticAction({
    actionClass: "NONE",
    objectClass: null,
    explicitness: "UNRESOLVED",
    evidence: ["NO_UNIQUE_ACTION_OBJECT_CANDIDATE"],
    resolutionStatus: "UNRESOLVED",
    modifiers: { new: false, current: false, next: false, explicitTarget: false },
  });
}

function mapSemanticActionToCanonicalMeaning({ semanticAction, shape } = {}) {
  const actionClass = semanticAction?.actionClass;
  const objectClass = semanticAction?.objectClass;
  const uiRole = String(shape?.uiContext?.surfaceRole || "").toUpperCase();
  const nextShape = { ...shape };
  if (actionClass === "NONE" && semanticAction?.evidence?.includes("COMPOSITIONAL_NEGATION_VETO")) {
    return {
      shape: {
        ...nextShape,
        taskType: "CLARIFY",
        requestedTasks: [],
        workflowIntent: null,
        workflowModel: null,
        workflowStepIntent: false,
        explicitTaskIntent: false,
        ambiguity: "NEGATED_PRODUCT_GOAL",
      },
      operation: "CLARIFY_SEMANTIC_REQUEST",
      capability: "CLARIFY",
    };
  }
  if (actionClass === "NEXT" && objectClass === "ROUTE") {
    Object.assign(nextShape, {
      taskType: "NEXT_ACTION",
      requestedTasks: ["NEXT_ACTION"],
      requestedFields: [],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      routeOrderIntent: true,
      routeOrderState: "MISSING_OR_UNVERIFIED",
    });
    return {
      shape: nextShape,
      operation: "RESOLVE_NEXT_SAFE_ACTION",
      capability: "NEXT_ACTION",
    };
  }
  if (actionClass === "CREATE" && objectClass === "SHIFT") {
    if (uiRole === "ROOM" || shape?.roleCapabilityBoundary === "ROOM_CREATE_UNSUPPORTED") {
      Object.assign(nextShape, {
        taskType: "SCREEN_CONTEXT",
        domain: "SHIFTS",
        targetEntityType: "SHIFT",
        requestedTasks: ["SCREEN_CONTEXT"],
        explicitTaskIntent: true,
        explicitUiGuidance: true,
        workflowIntent: "OPEN_SHIFT_SURFACE",
        workflowModel: null,
        roleCapabilityBoundary: "ROOM_CREATE_UNSUPPORTED",
      });
      return { shape: nextShape, operation: "OPEN_EXISTING_SHIFT_OPERATIONS", capability: "OPEN_SHIFT_SURFACE" };
    }
    // Action/object recognition deliberately runs before authorization. Once
    // the product-policy mapping reaches the COMPANY workflow, however, the
    // live UI still decides whether a step is current. This second use of the
    // same canonical entry-state helper covers create wording that did not
    // itself match a workflow-help grammar (for example, a start-goal).
    const entryWorkflow = guidedWorkflowEntryState(shape?.uiContext);
    Object.assign(nextShape, {
      taskType: "SCREEN_CONTEXT",
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      requestedTasks: ["CREATE_SHIFT"],
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      workflowIntent: "CREATE_SHIFT",
      workflowModel: uiRole === "COMPANY" ? COMPANY_GUIDED_NEW_PLAN_WORKFLOW : null,
      workflowEntryState: entryWorkflow?.state || nextShape.workflowEntryState || null,
      workflowEntryTarget: entryWorkflow?.currentTarget || nextShape.workflowEntryTarget || null,
      workflowNextStepReference: entryWorkflow?.nextStep || nextShape.workflowNextStepReference || null,
      workflowNextState: entryWorkflow?.nextState || nextShape.workflowNextState || null,
      workflowDraftAvailability: entryWorkflow?.draftAvailability || nextShape.workflowDraftAvailability || null,
      // A canonical pre-wizard entry state proves that no wizard step is
      // current. Keep a catalog's first step as next-step knowledge only.
      workflowStepReference: entryWorkflow ? null : nextShape.workflowStepReference || null,
      workflowStepIntent: entryWorkflow ? false : Boolean(nextShape.workflowStepIntent),
      workflowActualUiState: entryWorkflow ? shape?.uiContext?.workflowState || null : nextShape.workflowActualUiState || null,
    });
    return { shape: nextShape, operation: "CREATE_SHIFT", capability: "CREATE_SHIFT" };
  }
  if (actionClass === "NAVIGATE") {
    return { shape: nextShape, operation: "NAVIGATE_AUTHORIZED_SURFACE", capability: String(nextShape.workflowIntent || `OPEN_${objectClass}_SURFACE`).toUpperCase() };
  }
  if (actionClass === "UPDATE") {
    return {
      shape: nextShape,
      operation: objectClass === "SHIFT" ? "OPEN_EXISTING_SHIFT_OPERATIONS" : "UPDATE_AUTHORIZED_RECORD",
      capability: objectClass === "SHIFT" ? "UPDATE_SHIFT" : `UPDATE_${objectClass || "RECORD"}`,
    };
  }
  // A named offer collection is a surface-scoped summary request, not a
  // scalar cardinality query. Keep the collection envelope on the view
  // operation so authorized offer facts reach the visible answer.
  if (shape?.collectionSummaryIntent === true
    && String(shape?.targetEntityType || objectClass || "").toUpperCase() === "OFFER") {
    Object.assign(nextShape, {
      taskType: "SCREEN_CONTEXT",
      domain: "OFFERS",
      targetEntityType: "OFFER",
      requestedTasks: ["SCREEN_CONTEXT"],
      requestedFields: [],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      workflowIntent: "OPEN_OFFER_SURFACE",
      ambiguity: null,
    });
    return {
      shape: nextShape,
      operation: "VIEW_AUTHORIZED_SURFACE",
      capability: "VIEW_OFFER_SURFACE",
    };
  }
  if (shape?.taskType === "COUNT") {
    return { shape: nextShape, operation: "COUNT_AUTHORIZED_RECORDS", capability: "COUNT_AUTHORIZED_RECORDS" };
  }
  // A relation lookup may use a visible verb such as "göster" or "aç".
  // Preserve the already-resolved relationship task instead of remapping the
  // related SHIFT object to generic surface navigation.
  if (actionClass === "VIEW"
    && shape?.taskType === "RELATION_LOOKUP"
    // An explicit record-view sentence such as “başka kuruma ait vardiya
    // kaydını görüntüle” must reach the normal record/surface authorization
    // path. Relation traversal remains authoritative for generated/related
    // collections, which do not carry this record-view construction.
    && !/\b(?:kay[ıi]t|kay[ıi]d|record)\p{L}*\b/iu.test(normalize(shape?.normalizedText || ""))) {
    Object.assign(nextShape, {
      taskType: "RELATION_LOOKUP",
      domain: nextShape.domain || "SHIFTS",
      targetEntityType: nextShape.targetEntityType || "SHIFT",
      requestedTasks: ["RELATION_LOOKUP"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      ambiguity: null,
    });
    return { shape: nextShape, operation: "LOOK_UP_RELATION", capability: "VIEW_SHIFTS" };
  }
  if (actionClass === "VIEW") {
    if (objectClass === "FINANCIAL") {
      Object.assign(nextShape, {
        domain: "FINANCE",
        explicitTaskIntent: true,
        explicitUserTarget: true,
      });
      return {
        shape: nextShape,
        operation: "VIEW_AUTHORIZED_SURFACE",
        capability: "VIEW_FINANCIAL_SURFACE",
      };
    }
    if (objectClass === "OFFER" && semanticAction?.evidence?.includes("EXPLICIT_OFFER_RECORD_VIEW")) {
      return {
        shape: nextShape,
        operation: "VIEW_AUTHORIZED_SURFACE",
        capability: "VIEW_OFFER_SURFACE",
      };
    }
    if (objectClass === "OFFER") {
      Object.assign(nextShape, {
        taskType: "SCREEN_CONTEXT",
        domain: "OFFERS",
        targetEntityType: "OFFER",
        requestedTasks: ["SCREEN_CONTEXT"],
        requestedFields: [],
        explicitTaskIntent: true,
        explicitUserTarget: true,
        explicitUiGuidance: true,
        screenContextIntent: true,
        workflowIntent: "OPEN_OFFER_SURFACE",
        ambiguity: null,
      });
      return {
        shape: nextShape,
        operation: "VIEW_AUTHORIZED_SURFACE",
        capability: "VIEW_OFFER_SURFACE",
      };
    }
    if (objectClass === "SHIFT" && !nextShape.domain) {
      Object.assign(nextShape, {
        taskType: "SCREEN_CONTEXT",
        domain: "SHIFTS",
        targetEntityType: "SHIFT",
        requestedTasks: ["SCREEN_CONTEXT"],
        explicitTaskIntent: true,
        explicitUiGuidance: true,
        workflowIntent: "OPEN_SHIFT_SURFACE",
        screenContextIntent: true,
      });
    }
    return { shape: nextShape, operation: "VIEW_AUTHORIZED_SURFACE", capability: objectClass === "SHIFT" ? "VIEW_SHIFTS" : String(nextShape.workflowIntent || `VIEW_${objectClass}_SURFACE`).toUpperCase() };
  }
  // A natural-language request may use an explanatory politeness form
  // ("Teklifleri açar mısın?", "Tekliflere bakabilir miyiz?") while its
  // canonical workflow is still an explicit offer-surface destination. Keep
  // that destination as the operation owner; otherwise the later role-help
  // seam can label a real navigation request as generic explanation.
  if (actionClass === "EXPLAIN" && shape?.workflowIntent === "OPEN_OFFER_SURFACE") {
    return {
      shape: nextShape,
      operation: "VIEW_AUTHORIZED_SURFACE",
      capability: "VIEW_OFFER_SURFACE",
    };
  }
  if (actionClass === "EXPLAIN"
    && (shape?.currentTargetRecoveryIntent || shape?.currentTargetExplanationIntent)) {
    return { shape: nextShape, operation: "EXPLAIN_CURRENT_TARGET", capability: "EXPLAIN_CURRENT_TARGET" };
  }
  if (actionClass === "EXPLAIN"
    && shape?.generalProductHelpIntent
    && !shape?.currentTargetRecoveryIntent
    && !shape?.currentTargetExplanationIntent
    && !shape?.workflowIntent) {
    return { shape: nextShape, operation: "GENERAL_INFORMATION", capability: "GENERAL_INFORMATION" };
  }
  if (actionClass === "COMPARE") {
    return { shape: nextShape, operation: "COMPARE_AUTHORIZED_RECORDS", capability: "COMPARE_AUTHORIZED_RECORDS" };
  }
  if (actionClass === "RESUME") {
    return { shape: nextShape, operation: "CONTINUE_EXPLANATION", capability: "RESUME_SETTLED_TASK" };
  }
  if (actionClass === "CONTINUE") {
    return { shape: nextShape, operation: "CONTINUE_EXPLANATION", capability: "CONTINUE_SETTLED_TASK" };
  }
  if (actionClass === "NONE" && nextShape?.restartIntent) {
    return { shape: { ...nextShape, taskType: "RETURN_TO_PRODUCT", returnToProductIntent: true }, operation: "RETURN_TO_PRODUCT", capability: "RETURN_TO_PRODUCT" };
  }
  if (actionClass === "PREPARE" && nextShape?.capabilityIntent) {
    return { shape: nextShape, operation: "EXPLAIN_CURRENT_TARGET", capability: String(nextShape.capabilityIntent).toUpperCase() };
  }
  return {
    shape: nextShape,
    operation: CANONICAL_OPERATION_BY_TASK[TASK_TYPES.has(nextShape?.taskType) ? nextShape.taskType : "CLARIFY"] || "CLARIFY_SEMANTIC_REQUEST",
    capability: String(nextShape?.workflowStepIntent
      ? nextShape?.workflowStepReference?.key || nextShape?.taskType || "CLARIFY"
      : nextShape?.requestedTasks?.[0] || nextShape?.taskType || "CLARIFY").toUpperCase(),
  };
}

function resolveSemanticScope({ text, shape, semanticAction } = {}) {
  const normalizedText = normalize(text);
  if (shape?.taskType === "CLARIFY" && shape?.ambiguity === "REFERENT_NOT_UNIQUELY_JUSTIFIED") {
    return { class: "PRODUCT_AMBIGUOUS", evidence: "DEICTIC_REFERENCE_WITHOUT_VALID_REFERENT", explicit: false, confidence: 0.55 };
  }
  if (hasGenuineOffTopicSignal(normalizedText, shape) && !hasProductSignal(normalizedText, shape)) {
    return { class: "OFF_TOPIC_GENUINE", evidence: "NON_PRODUCT_TOPIC_WITH_GENERAL_REQUEST", explicit: false, confidence: 0.94 };
  }

  const explicitSurfaceTransition = Boolean(shape?.explicitUiGuidance && /^OPEN_[A-Z0-9_]+$/.test(String(shape?.workflowIntent || "")));
  const explicitAction = semanticAction?.resolutionStatus === "RESOLVED"
    && ["CREATE", "NAVIGATE", "VIEW", "COMPARE"].includes(semanticAction?.actionClass);
  // Context-derived action evidence may ground an utterance that already
  // names a supported product object. Scope must follow that intrinsic
  // product meaning; only genuinely context-dependent actions retain the
  // contextual veto. Continuation/resume remain contextual by contract.
  const intrinsicProductObject = Boolean(explicitObjectClassFromText(normalizedText));
  const intrinsicResolvedAction = semanticAction?.resolutionStatus === "RESOLVED"
    && ["CREATE", "NAVIGATE", "VIEW", "EXPLAIN", "COMPARE", "ANALYZE", "PREPARE"].includes(semanticAction?.actionClass)
    && intrinsicProductObject;
  const contextualAction = ["CONTINUE", "RESUME"].includes(semanticAction?.actionClass)
    || (semanticAction?.explicitness === "CONTEXTUAL" && !intrinsicResolvedAction);
  const explicit = !contextualAction && (explicitAction || Boolean(shape?.explicitUserTarget || shape?.explicitTaskIntent || shape?.explicitUiGuidance || shape?.requestedTasks?.length));
  if (explicit && shape?.taskType !== "CLARIFY") {
    return { class: "PRODUCT_EXPLICIT", evidence: explicitAction ? "EXPLICIT_ACTION_OBJECT_CANDIDATE" : "EXPLICIT_PRODUCT_OPERATION_OR_CAPABILITY", explicit: true, confidence: Number(shape?.confidence || 0.9) || 0.9 };
  }

  const contextual = Boolean(
    shape?.liveWorkflowGrounded
    || (shape?.workflowIntent && !explicitSurfaceTransition)
    || shape?.continuationIntent
    || shape?.currentTargetExplanationIntent
    || shape?.currentTargetRecoveryIntent
    || shape?.workflowStepIntent
    || shape?.selectedRecordIntent
    || shape?.discourseReferentFollowUp
    || shape?.discourseReferentFieldFollowUp
    || shape?.uiContext?.currentTarget
    || shape?.uiContext?.workflowState
    || shape?.uiContext?.selectedEntityPresent,
  ) || (/^(?:bu|bunun|su|sunun|onun|o|şu|su)\b/iu.test(normalizedText) && hasProductSignal(normalizedText, shape));
  if (semanticAction?.explicitness === "CONTEXTUAL"
    && Array.isArray(semanticAction?.evidence)
    && semanticAction.evidence.some((item) => String(item).startsWith("INTERNAL_CONTEXT_"))) {
    return { class: "PRODUCT_CONTEXTUAL", evidence: "INTERNAL_CONTEXTUAL_SEMANTIC_EVIDENCE", explicit: false, confidence: 0.94 };
  }
  if (contextual) return { class: "PRODUCT_CONTEXTUAL", evidence: "LIVE_OR_SETTLED_PRODUCT_CONTEXT", explicit: false, confidence: Number(shape?.confidence || 0.85) || 0.85 };

  if (shape?.ambiguity || shape?.taskType === "CLARIFY" || hasProductSignal(normalizedText, shape)) {
    return { class: "PRODUCT_AMBIGUOUS", evidence: shape?.ambiguity ? "PRODUCT_CANDIDATE_WITH_UNRESOLVED_AMBIGUITY" : "PRODUCT_SIGNAL_WITHOUT_UNIQUE_OPERATION", explicit: false, confidence: Number(shape?.confidence || 0.55) || 0.55 };
  }
  return { class: "UNRESOLVED", evidence: "NO_VALID_PRODUCT_OR_GENUINE_OFF_TOPIC_EVIDENCE", explicit: false, confidence: 0.2 };
}

function candidateEntityRefsFromCanonicalShape(shape, selectedEntity, { operation = null, semanticAction = null, message = '', conversationState = null, screenContext = null } = {}) {
  const refs = [];
  // Role/global and generic-help turns may mention a product area while
  // intentionally avoiding a business-record target.  Do not project the
  // lexical candidate into the canonical reference envelope after the
  // higher-level help composition has already settled that distinction.
  if (shape?.roleHelpIntent === true || shape?.generalProductHelpIntent === true) return refs;
  // An explicit external owner/tenant is a deny-before-retrieval request.
  // Never carry the live selected record into the canonical candidate
  // envelope, where a later relation adapter could silently reuse it.
  if (shape?.requestedOwnershipScope?.explicitExternalScope === true) return refs;
  // Role-scoped financial summaries intentionally clear the visible record;
  // do not let a selected vehicle or shift become a hidden retrieval target.
  if (shape?.suppressSelectedEntityContext === true) return refs;
  const targetEntityType = String(shape?.targetEntityType || "").trim().toUpperCase();
  const workflowIntent = String(shape?.workflowIntent || "").trim().toUpperCase();
  const ui = shape?.uiContext || {};
  // The candidate envelope is built before `currentRequest.normalizedMeaning`
  // is attached to the frozen request. Fall back to the raw turn so an
  // explicit offer/record id can suppress a stale selected-card candidate.
  const normalizedText = String(shape?.normalizedText || shape?.currentRequest?.normalizedMeaning || message || "").trim();
  const previousRecordReference = resolvePreviousRecordReference({
    message: message || normalizedText,
    conversationState,
    selectedEntity,
    screenContext,
    requestedDomains: Array.isArray(shape?.requestedDomains) ? shape.requestedDomains : [],
  });
  if (shape?.ambiguity === "NUMERIC_REFERENT_TYPE_UNRESOLVED") return refs;
  const explicitOfferMatch = normalizedText.match(/\b(?:teklif|offer|rfq)\s*#?\s*(\d+)\b/iu);
  const explicitOfferReference = explicitOfferMatch
    ? { type: "OFFER", id: Number(explicitOfferMatch[1]), source: "EXPLICIT_QUERY" }
    : null;
  const explicitRecordReference = shape?.explicitEntityReference
    || explicitShiftReferenceFromText(normalizedText)
    || explicitVehicleReferenceFromText(normalizedText)
    || explicitAgreementReferenceFromText(normalizedText);
  const explicitSelectedRecordReference = hasSelectedRecordCue(normalizedText)
    || hasSelectedRecordReference(normalizedText)
    || hasSelectedRecordActionReference(normalizedText, ui)
    || hasSelectedTypedPossessiveReference(normalizedText, ui);
  const collectionScope = shape?.collectionSummaryIntent === true
    || shape?.agreementCollectionViewIntent === true
    || (shape?.taskType === "COUNT" && shape?.scopeTarget === "CURRENT_SCREEN")
    || hasContractShiftGenerationLookupCue(normalizedText);
  const surfaceWorkflow = ["OPEN_SURFACE", "OPEN_SHIFT_SURFACE", "OPEN_OFFER_SURFACE", "OPEN_AGREEMENTS_SURFACE", "OPEN_MAP_SURFACE", "OPEN_REPORTS_SURFACE", "OPEN_CHECKIN_SURFACE", "OPEN_APPLIED_ROUTE_SURFACE"].includes(workflowIntent);
  const surfaceTarget = Boolean(
    (targetEntityType === "SURFACE" && (
      shape?.explicitUserTarget
      || shape?.currentTargetReference?.targetKey
      || surfaceWorkflow
    ))
      || (
        surfaceWorkflow
        && !explicitOfferReference
        && !explicitRecordReference
        && !explicitSelectedRecordReference
        && ["NAVIGATE_AUTHORIZED_SURFACE", "VIEW_AUTHORIZED_SURFACE", "OPEN_EXISTING_SHIFT_OPERATIONS"].includes(String(operation || "").toUpperCase())
        && ["NAVIGATE", "VIEW", "CREATE", "EXPLAIN"].includes(String(semanticAction?.actionClass || "").toUpperCase())
      ),
  );
  const add = (value, source) => {
    if (!value) return;
    const type = String(value.type || value.entityType || value.targetEntityType || "").trim().toUpperCase();
    if (!type) return;
    const id = Number(value.id || value.entityId || 0) || null;
    const ref = { type, id, source };
    const key = `${type}:${id || "UNKNOWN"}:${source}`;
    if (!refs.some((item) => `${item.type}:${item.id || "UNKNOWN"}:${item.source}` === key)) refs.push(ref);
  };
  if (previousRecordReference) add(previousRecordReference, "PREVIOUS_RECORD_CONTEXT");
  if (explicitOfferReference) add(explicitOfferReference, "EXPLICIT_QUERY");
  if (explicitRecordReference) add(explicitRecordReference, "EXPLICIT_QUERY");
  // A contract-produced-shift relation is scoped by the selected agreement
  // when the conversation is on an agreement surface.  The collection-scope
  // branch below must not erase that relation source; without it the query
  // executor cannot distinguish “this contract's shifts” from an ungrounded
  // collection request and the user receives a false evidence-missing reply.
  const selectedAgreementSource = !explicitRecordReference && !explicitOfferReference
    && String(shape?.taskType || "").toUpperCase() === "RELATION_LOOKUP"
    && String(selectedEntity?.type || selectedEntity?.entityType || ui.selectedType || "").toUpperCase() === "AGREEMENT"
    && Number(selectedEntity?.id || selectedEntity?.entityId || ui.selectedId || 0) > 0
    ? (selectedEntity?.type || selectedEntity?.entityType
      ? selectedEntity
      : { type: ui.selectedType, id: ui.selectedId })
    : null;
  if (selectedAgreementSource) add(selectedAgreementSource, "SELECTED_RELATION_SOURCE");
  if (!surfaceTarget && !explicitOfferReference && !explicitRecordReference && !collectionScope && !previousRecordReference) add(selectedEntity, "SELECTED_ENTITY_CANDIDATE");
  if (!surfaceTarget) {
    for (const type of Array.isArray(shape?.targetCandidates) ? shape.targetCandidates : []) {
      if (explicitOfferReference && String(type || "").toUpperCase() === "OFFER") continue;
      if (explicitRecordReference && ["SHIFT", "OFFER"].includes(String(type || "").toUpperCase())) continue;
      add({ type }, "TEXT_ENTITY_CANDIDATE");
    }
  }
  // An explicit record identity owns the turn.  The live selected card is
  // still useful evidence for deictic requests, but must not be appended as a
  // second candidate when the user explicitly named another offer.
  if (!surfaceTarget && !explicitOfferReference && !explicitRecordReference && !collectionScope && !previousRecordReference && (ui.selectedType || ui.selectedId)) add({ type: ui.selectedType, id: ui.selectedId }, "LIVE_CONTEXT_CANDIDATE");
  return refs;
}

function canonicalRequestedFields(shape) {
  return [...new Set((Array.isArray(shape?.requestedFields) ? shape.requestedFields : [])
    .map((field) => typeof field === "string" ? field : field?.key)
    .map((field) => String(field || "").trim())
    .filter(Boolean))];
}

function canonicalSafetyForShape(shape) {
  const writeBoundary = "NO_BUSINESS_WRITE";
  const actionPolicy = shape?.explicitUiGuidance || shape?.workflowIntent || shape?.workflowStepIntent
    ? "SAFE_UI_ONLY"
    : "READ_ONLY";
  return { actionPolicy, writeBoundary };
}

function validateCanonicalConversationRequest(request) {
  const errors = [];
  if (request?.version !== SEFER_ABI_CANONICAL_REQUEST_VERSION) errors.push("INVALID_VERSION");
  for (const field of ["operation", "domain", "capability"]) {
    if (typeof request?.[field] !== "string" || !request[field].trim()) errors.push(`MISSING_${field.toUpperCase()}`);
  }
  if (!Array.isArray(request?.candidateEntityRefs)) errors.push("CANDIDATE_ENTITY_REFS_REQUIRED");
  if (!Array.isArray(request?.requestedFields)) errors.push("REQUESTED_FIELDS_REQUIRED");
  if (!request?.safety || !["READ_ONLY", "SAFE_UI_ONLY", "WRITE_REQUIRES_SEPARATE_AUTH"].includes(request.safety.actionPolicy)) errors.push("ACTION_POLICY_REQUIRED");
  if (!request?.safety || !["NO_BUSINESS_WRITE", "SEPARATE_AUTH_REQUIRED"].includes(request.safety.writeBoundary)) errors.push("WRITE_BOUNDARY_REQUIRED");
  if (!request?.ambiguity || typeof request.ambiguity.status !== "string") errors.push("AMBIGUITY_STATE_REQUIRED");
  if (!request?.semanticScope || !CANONICAL_SEMANTIC_SCOPE_CLASSES.has(request.semanticScope.class)) errors.push("SEMANTIC_SCOPE_REQUIRED");
  if (!request?.semanticScope || typeof request.semanticScope.evidence !== "string" || !request.semanticScope.evidence.trim()) errors.push("SEMANTIC_SCOPE_EVIDENCE_REQUIRED");
  const action = request?.semanticAction;
  if (!action || !CANONICAL_SEMANTIC_ACTION_CLASSES.has(action.actionClass)) errors.push("SEMANTIC_ACTION_REQUIRED");
  if (!action || (action.objectClass !== null && !CANONICAL_SEMANTIC_OBJECT_CLASSES.has(action.objectClass))) errors.push("SEMANTIC_ACTION_OBJECT_REQUIRED");
  if (!action || !CANONICAL_SEMANTIC_ACTION_RESOLUTION_STATUSES.has(action.resolutionStatus)) errors.push("SEMANTIC_ACTION_RESOLUTION_REQUIRED");
  if (!action || !Array.isArray(action.evidence) || !action.evidence.length) errors.push("SEMANTIC_ACTION_EVIDENCE_REQUIRED");
  const modifierKeys = ["new", "current", "next", "explicitTarget"];
  if (!action || !action.modifiers || Array.isArray(action.modifiers) || modifierKeys.some((key) => typeof action.modifiers[key] !== "boolean")) errors.push("SEMANTIC_ACTION_MODIFIERS_REQUIRED");
  if (action?.targetCandidate !== null && action?.targetCandidate !== undefined && typeof action.targetCandidate !== "object") errors.push("SEMANTIC_ACTION_TARGET_CANDIDATE_INVALID");
  if (action?.targetCandidate?.objectClass && !CANONICAL_SEMANTIC_OBJECT_CLASSES.has(action.targetCandidate.objectClass)) errors.push("SEMANTIC_ACTION_TARGET_OBJECT_INVALID");
  if (action?.actionClass === "CREATE" && action?.objectClass === "SHIFT") {
    if (request?.operation !== "CREATE_SHIFT" && request?.operation !== "OPEN_EXISTING_SHIFT_OPERATIONS") errors.push("CREATE_SHIFT_OPERATION_REQUIRED");
    if (request?.operation === "EXPLAIN_CURRENT_SURFACE") errors.push("CREATE_SHIFT_SURFACE_EXPLANATION_CONTRADICTION");
  }
  if (action?.actionClass === "NAVIGATE" && request?.operation === "CREATE_SHIFT") errors.push("NAVIGATE_CREATE_CONTRADICTION");
  if (action?.actionClass === "VIEW" && request?.operation === "CREATE_SHIFT") errors.push("VIEW_CREATE_CONTRADICTION");
  if (action?.actionClass === "COMPARE" && request?.operation !== "COMPARE_AUTHORIZED_RECORDS") errors.push("COMPARE_OPERATION_REQUIRED");
  if (request?.operation === "COMPARE_AUTHORIZED_RECORDS" && action?.actionClass !== "COMPARE") errors.push("COMPARE_ACTION_REQUIRED");
  if (request?.semanticScope?.class === "OFF_TOPIC_GENUINE") {
    if (action?.actionClass !== "NONE" || request?.operation !== "GENERAL_INFORMATION") errors.push("OFF_TOPIC_PRODUCT_OPERATION_CONTRADICTION");
  }
  const executableOperation = request?.operation === "CREATE_SHIFT"
    || /^(?:SEND|EXECUTE|DISPATCH|DELETE|WRITE|IMPORT)_/iu.test(String(request?.operation || ""));
  if (["UNRESOLVED", "AMBIGUOUS"].includes(action?.resolutionStatus) && executableOperation) errors.push("UNRESOLVED_ACTION_EXECUTABLE_OPERATION_FORBIDDEN");
  if (!request?.provenance || typeof request.provenance.interpreter !== "string") errors.push("PROVENANCE_REQUIRED");
  const failureClass = errors.length === 0
    ? null
    : errors.some((error) => error.startsWith("COMPARE_") || error.startsWith("SEMANTIC_ACTION_"))
      ? "ACTION_MAPPING_FAILURE"
      : "SAFE_CLARIFICATION";
  return { valid: errors.length === 0, errors, failureClass };
}

export function canonicalRequestSemanticFingerprint(request) {
  return JSON.stringify({
    version: request?.version || null,
    operation: request?.operation || null,
    domain: request?.domain || null,
    capability: request?.capability || null,
    candidateEntityRefs: request?.candidateEntityRefs || [],
    requestedFields: request?.requestedFields || [],
    semanticScope: request?.semanticScope || null,
    semanticAction: request?.semanticAction || null,
    safety: request?.safety || null,
    currentRequest: request?.currentRequest || null,
  });
}

export function assertCanonicalRequestUnchanged(originalRequest, candidateRequest) {
  const original = canonicalRequestSemanticFingerprint(originalRequest);
  const candidate = canonicalRequestSemanticFingerprint(candidateRequest);
  if (original !== candidate) throw new Error("POST_CANONICAL_REQUEST_MUTATION");
  return true;
}

const SHADOW_MISMATCH_CATEGORIES = Object.freeze([
  "missing feature",
  "composition mismatch",
  "object veto",
  "context mismatch",
  "action mismatch",
  "scope mismatch",
  "authorization mismatch",
  "response-only mismatch",
]);

function shadowMismatch(category, detected, details) {
  return { category, detected: Boolean(detected), details: details || null };
}

function shadowVisibleBehaviorFingerprint({ request, validation, failureClass, fallbackEligibility } = {}) {
  return JSON.stringify({
    canonicalRequest: canonicalRequestSemanticFingerprint(request),
    validation,
    failureClass: failureClass || null,
    fallbackEligibility: {
      eligible: Boolean(fallbackEligibility?.eligible),
      reason: fallbackEligibility?.reason || null,
      invoked: Boolean(fallbackEligibility?.invoked),
    },
  });
}

function buildShadowSemanticEvidenceDiagnostic({
  features,
  context,
  newEvidence,
  request,
  canonicalShape,
  validation,
  failureClass,
  fallbackEligibility,
} = {}) {
  const composedAction = String(newEvidence?.requestMode?.value || "").toUpperCase() || null;
  const oldAction = String(request?.semanticAction?.actionClass || "").toUpperCase() || null;
  const actionEquivalent = {
    EXPLAIN: "EXPLAIN",
    VIEW: "VIEW",
    NAVIGATE: "NAVIGATE",
  }[composedAction] || null;
  const oldRoleHelpCandidate = Boolean(canonicalShape?.roleHelpIntent || canonicalShape?.generalProductHelpIntent);
  const newRoleHelpCandidate = Boolean(newEvidence?.quality?.roleHelpCandidate);
  const contextUsed = Array.isArray(context?.contextUsed) ? context.contextUsed : [];
  const contextSources = new Set(
    (Array.isArray(newEvidence?.provenance) ? newEvidence.provenance : [])
      .map((entry) => entry?.source)
      .filter((source) => ["AUTH_CONTEXT", "SURFACE_CONTEXT", "ACTIVE_TASK", "REFERENCE_HISTORY"].includes(source)),
  );
  const contextMismatch = [...contextSources].some((source) => !contextUsed.some((entry) => entry?.source === source && entry?.used === true));
  const authorizationMismatch = newEvidence?.quality?.authorizationEffect !== "NONE"
    || (Array.isArray(newEvidence?.provenance) && newEvidence.provenance.some((entry) => entry?.authorizationEffect !== "NONE"));
  const responseMismatch = Object.prototype.hasOwnProperty.call(newEvidence || {}, "response")
    || Object.prototype.hasOwnProperty.call(newEvidence || {}, "responseFamily");
  const objectVeto = Array.isArray(newEvidence?.contradictions)
    && newEvidence.contradictions.some((entry) => entry?.value === "CONCRETE_OBJECT_OVERRIDES_BROAD_ROLE_ASPECT");
  const oldScope = String(request?.semanticScope?.class || "").toUpperCase();
  const newTarget = String(newEvidence?.targetRequest?.value || "").toUpperCase();
  const scopeMismatch = Boolean(newTarget && newTarget !== "NONE")
    && oldScope === "OFF_TOPIC_GENUINE";
  const missingFeature = !features
    || !Array.isArray(features.tokens)
    || (features.featureQuality?.partial === true && features.tokens.length === 0);
  const compositionMismatch = oldRoleHelpCandidate !== newRoleHelpCandidate;
  const actionMismatch = Boolean(actionEquivalent && oldAction && actionEquivalent !== oldAction)
    || Boolean(!actionEquivalent && ["CREATE", "COMPARE", "NONE"].includes(oldAction) && newEvidence?.requestMode?.value);

  return {
    mode: "SHADOW",
    authoritativePath: "OLD_CANONICAL",
    shadowSemanticAuthorityCount: 0,
    visibleBehaviorChangeCount: 0,
    canonicalRequestFingerprint: canonicalRequestSemanticFingerprint(request),
    visibleBehaviorFingerprint: shadowVisibleBehaviorFingerprint({ request, validation, failureClass, fallbackEligibility }),
    contextUsed,
    mismatchCategories: SHADOW_MISMATCH_CATEGORIES.map((category) => {
      switch (category) {
        case "missing feature":
          return shadowMismatch(category, missingFeature, missingFeature ? "feature extraction incomplete" : null);
        case "composition mismatch":
          return shadowMismatch(category, compositionMismatch, { oldRoleHelpCandidate, newRoleHelpCandidate });
        case "object veto":
          return shadowMismatch(category, objectVeto, objectVeto ? "concrete object vetoes broad role aspect" : null);
        case "context mismatch":
          return shadowMismatch(category, contextMismatch, contextMismatch ? "composer context provenance is not typed as used" : null);
        case "action mismatch":
          return shadowMismatch(category, actionMismatch, { oldAction, composedAction });
        case "scope mismatch":
          return shadowMismatch(category, scopeMismatch, { oldScope, newTarget });
        case "authorization mismatch":
          return shadowMismatch(category, authorizationMismatch, authorizationMismatch ? "evidence attempted an authorization effect" : null);
        case "response-only mismatch":
          return shadowMismatch(category, responseMismatch, responseMismatch ? "evidence attempted a response effect" : null);
        default:
          return shadowMismatch(category, false, null);
      }
    }),
    newEvidence,
  };
}

function resolveOldCanonicalConversationRequest({
  message,
  user,
  selectedEntity = null,
  conversationState = null,
  screenContext = null,
  semanticContext = null,
  interpreterMode = "DETERMINISTIC",
  authorityTrace = null,
  localSemanticProposal = null,
} = {}) {
  if (authorityTrace) authorityTrace.events.push({ path: "OLD_CANONICAL", role: "AUTHORITY" });
  const canonicalContext = semanticContext || buildCanonicalSemanticContext({ message, user, screenContext, conversationState });
  const inferredShape = inferCanonicalSemanticRequest({ message, user, screenContext, conversationState, localSemanticProposal });
  const normalizedMessage = normalize(message);
  const operationHealthIssueCue = /(?:riskli\s+cihaz|gps|konum\s+sinyali|cevrim\s+disi|çevrim\s+dışı|acik\s+sorun|açık\s+sorun)/iu.test(normalizedMessage);
  const crossSurfaceOperationHealthIssue = String(user?.role || "").toUpperCase() === "ROOM"
    && /(?:satir|sıra|sorun|problem|riskli\s+cihaz|acik\s+sorun|açık\s+sorun)/iu.test(normalizedMessage);
  const operationHealthSurfaceIssue = (
    /\/room\/operation-health\b/iu.test(String(screenContext?.path || ""))
    || crossSurfaceOperationHealthIssue
  )
    && operationHealthIssueCue
    && !hasOperationHealthIssueViewCue(message, screenContext);
  const scopedInferredShape = operationHealthSurfaceIssue
    ? {
      ...inferredShape,
      targetEntityType: null,
      scopeTarget: "CURRENT_SCREEN",
      domain: "OPERATIONS",
      taskType: "ISSUE",
      operationHealthMetricIntent: true,
      operationHealthMetricMode: "GPS_ISSUE_SUBSET",
      requestedTasks: ["ISSUE"],
      requestedFields: [{ key: "OPERATION_HEALTH_METRIC", domain: "OPERATIONS" }],
      explicitUserTarget: true,
      requestedDomains: ["OPERATIONS"],
    }
    : inferredShape;
  const inferredSemanticAction = inferCanonicalSemanticAction({ text: message, shape: scopedInferredShape, conversationState, semanticContext: canonicalContext });
  const preliminaryMapping = mapSemanticActionToCanonicalMeaning({ semanticAction: inferredSemanticAction, shape: scopedInferredShape });
  const preliminaryShape = preliminaryMapping.shape;
  const preliminaryScope = resolveSemanticScope({ text: message, shape: preliminaryShape, semanticAction: inferredSemanticAction });
  const semanticAction = preliminaryScope.class === "OFF_TOPIC_GENUINE"
    ? resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: null,
      explicitness: "NONE",
      evidence: ["GENUINE_OFF_TOPIC_SCOPE"],
      resolutionStatus: "NOT_APPLICABLE",
      modifiers: { new: false, current: false, next: false, explicitTarget: false },
    })
    : inferredSemanticAction;
  const mapping = mapSemanticActionToCanonicalMeaning({ semanticAction, shape: scopedInferredShape });
  const shape = mapping.shape;
  const semanticScope = preliminaryScope.class === "OFF_TOPIC_GENUINE"
    ? preliminaryScope
    : resolveSemanticScope({ text: message, shape, semanticAction });
  const taskType = TASK_TYPES.has(shape?.taskType) ? shape.taskType : "CLARIFY";
  const operation = semanticScope.class === "OFF_TOPIC_GENUINE"
    ? "GENERAL_INFORMATION"
    : mapping.operation;
  const domain = semanticScope.class === "OFF_TOPIC_GENUINE"
    ? "GENERAL"
    : String(shape?.domain || shape?.requestedOwnershipScope?.requestedOwnerScope || shape?.targetCandidates?.[0] || "PRODUCT").trim().toUpperCase();
  const capability = semanticScope.class === "OFF_TOPIC_GENUINE"
    ? "GENERAL_INFORMATION"
    : mapping.capability;
  const candidateEntityRefs = operationHealthSurfaceIssue
    ? []
    : candidateEntityRefsFromCanonicalShape(shape, selectedEntity, { operation, semanticAction, message, conversationState, screenContext });
  const request = deepFreeze({
    version: SEFER_ABI_CANONICAL_REQUEST_VERSION,
    operation,
    domain,
    capability,
    candidateEntityRefs,
    requestedFields: canonicalRequestedFields(shape),
    safety: canonicalSafetyForShape(shape),
    semanticScope,
    semanticAction,
    currentRequest: {
      explicitness: semanticScope.explicit ? "EXPLICIT" : semanticScope.class === "PRODUCT_CONTEXTUAL" ? "CONTEXTUAL" : "UNRESOLVED",
      operation,
      normalizedMeaning: String(shape?.normalizedText || normalize(message)).trim(),
      rawTextHash: null,
    },
    activeTaskRef: conversationState?.activeGuidedTask?.taskId
      || conversationState?.activeTask?.id
      || conversationState?.activeGuidedTask?.semanticPlan?.workflowIntent
      || null,
    workflowRef: shape?.workflowIntent
      ? { workflowIntent: shape.workflowIntent, workflowState: shape.workflowStepReference?.key || shape.workflowNextState || null }
      : null,
    continuation: {
      mode: shape?.restartIntent ? "RESTART" : semanticAction.actionClass === "RESUME" ? "RESUME" : (shape?.continuationIntent || taskType === "CONTINUE_CURRENT_REASONING" ? "CONTINUE" : "NEW_REQUEST"),
      baseRequestId: conversationState?.lastSettledResult?.requestId || null,
      depth: Number(conversationState?.lastSettledResult?.continuationDepth || 0) || 0,
    },
    groundingRequirement: semanticScope.class === "OFF_TOPIC_GENUINE" ? "NONE" : "CURRENT_AUTHORIZED_RUNTIME",
    ambiguity: {
      status: semanticAction.resolutionStatus === "AMBIGUOUS" ? "AMBIGUOUS" : semanticScope.class === "PRODUCT_AMBIGUOUS" || semanticScope.class === "UNRESOLVED" || semanticAction.resolutionStatus === "UNRESOLVED" || shape?.ambiguity || (taskType === "CLARIFY" && semanticAction.resolutionStatus !== "RESOLVED") ? "UNRESOLVED" : "NONE",
      candidates: Array.isArray(shape?.targetCandidates) ? [...shape.targetCandidates] : [],
      reason: shape?.ambiguity || null,
    },
    provenance: {
      interpreter: "EXISTING_CANONICAL_SEMANTIC_INFERENCE",
      interpreterMode,
      source: "canonicalSemanticRequest.inferCanonicalSemanticRequest",
      createdAt: new Date().toISOString(),
    },
  });
  const validation = validateCanonicalConversationRequest(request);
  // Stage A exposes only the deterministic fallback eligibility seam. With no
  // proposer injected, this metadata never changes the canonical result or
  // invokes external work; the existing semantic authority remains final.
  const fallbackEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: semanticScope.class,
    resolutionStatus: semanticAction.resolutionStatus,
    confidence: semanticScope.confidence <= 0.65 ? "LOW" : "HIGH",
    hasProductEvidence: semanticScope.class !== "OFF_TOPIC_GENUINE"
      && (semanticScope.class === "PRODUCT_AMBIGUOUS" || domain !== "GENERAL" || semanticAction.objectClass !== null),
  });
  return deepFreeze({
    requestId: `ccr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    request,
    canonicalShape: shape,
    validation: {
      status: validation.valid ? "VALID" : "SEMANTIC_UNRESOLVED",
      errors: validation.errors,
      failureClass: validation.failureClass,
    },
    // Every invalid envelope is a user-safe clarification outcome. The
    // internal validation failure class remains available for diagnostics so
    // ACTION_MAPPING_FAILURE cannot be confused with PRODUCT_AMBIGUITY.
    failureClass: validation.valid ? null : "SAFE_CLARIFICATION",
    fallbackEligibility: { ...fallbackEligibility, invoked: false },
    user: { role: user?.role || null },
    diagnostics: {},
  });
}

function composeTypedSemanticEvidence({ message, user, conversationState, screenContext, semanticContext, authorityTrace = null, traceRole = "DIAGNOSTIC", localSemanticProposal = null }) {
  if (authorityTrace) authorityTrace.events.push({ path: "NEW_TYPED_EVIDENCE", role: traceRole });
  const context = semanticContext || buildCanonicalSemanticContext({ message, user, screenContext, conversationState });
  const features = extractTurkishSemanticFeatures({ text: message });
  const baseEvidence = composeSemanticEvidence({
    features,
    context,
    conversationState: conversationState || {},
    screenContext: screenContext || {},
  });
  const inferred = inferCanonicalSemanticRequest({ message, user, screenContext, conversationState, localSemanticProposal });
  const specificity = resolveSemanticSpecificity({ message, evidence: baseEvidence, inferred, context, conversationState });
  const evidence = applySemanticSpecificityEvidence(baseEvidence, specificity);
  const resolvedInferred = {
    ...inferred,
    ...specificity.inferredOverrides,
  };
  return { context, features, evidence, inferred: resolvedInferred, specificity };
}

function createAuthorityTrace(mode, selectedAuthority) {
  return {
    mode,
    selectedAuthority,
    events: [],
    fallbackAttempts: [],
    downstreamRedecisions: [],
  };
}

function authorityDiagnostics(trace) {
  const events = Array.isArray(trace?.events) ? trace.events : [];
  const authorityEvents = events.filter(({ role }) => role === "AUTHORITY");
  const authoritativePaths = authorityEvents.map(({ path }) => path);
  const oldAuthorityInvocationCount = events.filter(({ path }) => path === "OLD_CANONICAL").length;
  const newAuthorityInvocationCount = events.filter(({ path }) => path === "NEW_TYPED_EVIDENCE").length;
  const fallbackAttempts = Array.isArray(trace?.fallbackAttempts) ? trace.fallbackAttempts : [];
  const downstreamRedecisions = Array.isArray(trace?.downstreamRedecisions) ? trace.downstreamRedecisions : [];
  return {
    mode: trace?.mode || null,
    authoritativePath: authorityEvents.length === 1 ? authorityEvents[0].path : null,
    oldAuthorityInvocationCount,
    newAuthorityInvocationCount,
    PER_REQUEST_SEMANTIC_AUTHORITY_COUNT: authorityEvents.length === 1
      && authorityEvents[0].path === trace?.selectedAuthority ? authorityEvents.length : 0,
    RUNTIME_SEMANTIC_FALLBACK_COUNT: fallbackAttempts.length,
    SHADOW_SEMANTIC_AUTHORITY_COUNT: events.filter(({ role }) => role === "SHADOW_AUTHORITY").length,
    DUAL_SEMANTIC_AUTHORITY_COUNT: new Set(authoritativePaths).size > 1 ? 1 : 0,
    DOWNSTREAM_SEMANTIC_REDECISION_COUNT: downstreamRedecisions.length,
    trace: {
      mode: trace?.mode || null,
      selectedAuthority: trace?.selectedAuthority || null,
      events: events.map((event) => ({ ...event })),
      fallbackAttempts: fallbackAttempts.map((event) => ({ ...event })),
      downstreamRedecisions: downstreamRedecisions.map((event) => ({ ...event })),
    },
  };
}

function newAuthorityShape({ message, screenContext, evidence, failure = false, roleHelp = false } = {}) {
  if (failure) {
    return {
      taskType: "CLARIFY",
      confidence: 0,
      domain: null,
      targetEntityType: null,
      explicitTaskIntent: false,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      primaryTask: "SEMANTIC_UNRESOLVED",
      scopeTarget: "NONE",
      ambiguity: "INTERNAL_EVIDENCE_FAILURE",
      targetCandidates: [],
      normalizedText: normalize(message),
      requestedOwnershipScope: null,
      requiredOutputSlots: [],
      explicitUserTarget: false,
    };
  }
  return {
    taskType: roleHelp ? "OFF_TOPIC" : "SCREEN_CONTEXT",
    confidence: 0.9,
    domain: null,
    targetEntityType: null,
    explicitTaskIntent: true,
    generalProductHelpIntent: roleHelp,
    roleHelpIntent: roleHelp,
    primaryTask: roleHelp ? "ROLE_EXPLANATION_HELP" : "TYPED_SEMANTIC_REQUEST",
    scopeTarget: roleHelp ? "ROLE_GLOBAL" : "CURRENT_SCREEN",
    ambiguity: null,
    targetCandidates: [],
    normalizedText: normalize(message),
    uiContext: {
      path: screenContext?.path || "",
      label: screenContext?.label || "",
      surfaceRole: screenContext?.role || "",
      selectedId: null,
      selectedType: "",
      selectedEntityPresent: false,
      visibleControlCount: 0,
      visibleTargetLabels: [],
      visibleTargets: [],
      modalTitles: [],
      currentTarget: null,
      workflowState: null,
      guidedDraftAvailability: null,
      foregroundSurface: null,
    },
    requestedOwnershipScope: null,
    requiredOutputSlots: [],
    explicitUserTarget: false,
    typedEvidence: {
      subject: evidence?.subject?.value || "NONE",
      roleAspect: evidence?.roleAspect?.value || "NONE",
      requestMode: evidence?.requestMode?.value || "NONE",
      productHelp: evidence?.productHelp?.value || "NONE",
    },
  };
}

function buildTypedCanonicalShape({ message, user, screenContext, conversationState, evidence, context, inferred: providedInferred = null, specificity = null } = {}) {
  const inferred = providedInferred || inferCanonicalSemanticRequest({ message, user, screenContext, conversationState });
  const financialScreenRiskRequest = hasFinancialScreenRiskCue(message)
    && /\/(?:room|company|school|organization)\/financial-operations\b/iu.test(String(screenContext?.path || ''))
    && !currentUiContext(screenContext, conversationState).selectedEntityPresent;
  const mode = String(evidence?.requestMode?.value || "UNRESOLVED").toUpperCase();
  const selectedRecordReference = inferred?.scopeTarget === "SELECTED_RECORD"
    && inferred?.uiContext?.selectedEntityPresent === true
    && Boolean(inferred?.uiContext?.selectedId && inferred?.uiContext?.selectedType);
  const explicitRecordReference = inferred?.explicitEntityReference
    || explicitShiftReferenceFromText(message)
    || explicitVehicleReferenceFromText(message)
    || explicitAgreementReferenceFromText(message)
    || selectedRecordReference;
  const reference = explicitRecordReference
    ? "EXPLICIT"
    : String(evidence?.reference?.value || "ABSENT").toUpperCase();
  const typedObjectValue = String(evidence?.object?.value || "NONE").toUpperCase();
  const agreementOperationBridgeIntent = hasAgreementOperationBridgeCue(
    message,
    currentUiContext(screenContext, conversationState, user),
  );
  const explicitSurfaceExplanation = hasExplicitCurrentScreenPurposeCue(normalize(message))
    || hasNamedSurfaceExplanationCue(message);
  const productHelpSignal = Boolean(
    inferred?.generalProductHelpIntent
      || (/(?:\bprogram\p{L}*\b|\bplatform\p{L}*\b|\bseferpakt\p{L}*\b)/iu.test(normalize(message))
        && (isGenericProductHelpIntent(message, { roleContext: screenContext?.role })
          || isExplicitRoleHelpIntent(message, { roleContext: screenContext?.role })))
      || (isGenericProductHelpIntent(message, { roleContext: screenContext?.role })
        && !isExplicitRoleHelpIntent(message, { roleContext: screenContext?.role })),
  );
  const productHelpComposition = Boolean(productHelpSignal && !explicitSurfaceExplanation);
  const liveSurfaceTargetEvidence = Boolean(inferred?.currentTargetReference?.targetKey);
  const explicitSurfaceEvidence = Boolean(
    liveSurfaceTargetEvidence
      || (typedObjectValue === "SURFACE"
        && Boolean(
          inferred?.screenContextIntent
          || inferred?.screenKnowledgeIntent
          || inferred?.explicitUiGuidance
          || String(evidence?.targetRequest?.value || "").toUpperCase() === "SURFACE",
        )),
  )
    && !productHelpComposition;
  const externalDomain = Array.isArray(evidence?.domainEvidence)
    && evidence.domainEvidence.some((entry) => entry?.kind === "EXTERNAL_DOMAIN" && String(entry?.value || "").trim() && entry?.value !== "NONE");
  const continuationValid = String(context?.continuity?.continuation?.status || "").toUpperCase() === "VALID"
    && String(context?.continuity?.precedence || "").toUpperCase() !== "EXPLICIT_INPUT";
  const kvkkVisibilitySurfaceRequest = /\/shared\/kvkk\b/iu.test(String(screenContext?.path || ""))
    && (
      /\b(?:kvkk|gizlilik|görünürlük|gorunurluk|görünür|gorunur|yetki|rol)\p{L}*\b/iu.test(normalize(message))
      || hasKvkkAccessBoundaryQuestion(message)
    );
  const roleHelpCandidate = evidence?.quality?.roleHelpCandidate === true
    && mode === "EXPLAIN"
    && (!hasIssueDiagnosticCue(normalize(message))
      || hasUnresolvedQuoteFloorDeicticCue(message, conversationState, screenContext))
    && !inferred?.operationHealthMetricIntent
    // A concrete typed object is stronger than broad role-orientation
    // evidence for operation-bearing requests.  A reference-less role
    // orientation/capability question may still name a product area (for
    // example, “servis işlerini nasıl öğrenebilirim?”) without asking for a
    // business record.
    && (!typedObjectValue
      || allowsConcreteRoleHelpAspect(evidence, reference)
      // A selected card inherited from the current screen is context, not an
      // explicit target, for a structural role-capability question.
      || (specificity?.roleCapabilityExplanationEvidence === true && !explicitRecordReference))
    && !externalDomain
    && reference !== "AMBIGUOUS"
    && !inferred?.generalCreativeIntent
    && String(inferred?.screenKnowledgeKind || "").toUpperCase() !== "SCREEN_PURPOSE"
    && !inferred?.screenKnowledgeIntent
    && !inferred?.screenDetailIntent
    && !inferred?.workflowIntent
    // A live recovery/target explanation is already grounded in the current
    // authorized workflow.  Do not let broad role-help evidence rewrite that
    // typed target into role-global product help before action composition.
    && !inferred?.continuationIntent
    && !inferred?.currentTargetRecoveryIntent
    && (!inferred?.currentTargetExplanationIntent
      || hasUnresolvedQuoteFloorDeicticCue(message, conversationState, screenContext))
    && !inferred?.workflowIntent
    // KVKK visibility questions are screen-scoped when the authorized user is
    // already on the KVKK surface. Do not let role-global capability evidence
    // replace the screen's own visibility-boundary answer.
    && !kvkkVisibilitySurfaceRequest
    // A deictic local reference without a resolvable record or explicit
    // screen-purpose cue is ambiguous, not role-global help. Keep it on the
    // safe clarification path instead of answering an unrelated domain.
    && !hasScreenDeicticCue(normalize(message))
    && !hasProductNoteLookupCue(message)
    && !explicitRecordReference
    && (!explicitSurfaceEvidence || (
      String(evidence?.targetRequest?.value || "").toUpperCase() === "PRODUCT_AREA"
      && !explicitSurfaceExplanation
      && !liveSurfaceTargetEvidence
    ));
  const concreteObjectVeto = evidence?.object?.value
    && evidence.object.value !== "NONE"
    && evidence?.targetRequest?.value !== "PRODUCT_AREA"
    && !inferred?.termDefinitionIntent
    && !inferred?.operationHealthMetricIntent
    && !inferred?.screenKnowledgeIntent
    && !productHelpComposition;
  let shape = {
    ...inferred,
    agreementOperationBridgeIntent,
    typedEvidence: {
      subject: evidence?.subject?.value || "NONE",
      roleAspect: evidence?.roleAspect?.value || "NONE",
      requestMode: evidence?.requestMode?.value || "NONE",
      productHelp: evidence?.productHelp?.value || "NONE",
      object: evidence?.object?.value || "NONE",
      reference,
    },
  };
  if (inferred?.schoolOperationalPlanIntent && inferred?.screenContextIntent) {
    shape = {
      ...shape,
      taskType: "EVIDENCE_SUFFICIENCY",
      domain: "OPERATIONS",
      targetEntityType: null,
      requestedTasks: ["EVIDENCE_SUFFICIENCY"],
      requestedFields: [],
      requestedFieldsAuthoritative: true,
      requiredOutputSlots: ["EVIDENCE", "SAFE_NEXT_STEP"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  if (kvkkVisibilitySurfaceRequest) {
    shape = {
      ...shape,
      taskType: "SCREEN_CONTEXT",
      domain: null,
      targetEntityType: "SURFACE",
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: hasKvkkAccessBoundaryQuestion(message) ? "KVKK_VISIBILITY" : "SCREEN_PURPOSE",
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      primaryTask: "SCREEN_CONTEXT",
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  if (hasContractShiftGenerationLookupCue(message)) {
    shape = {
      ...shape,
      taskType: "RELATION_LOOKUP",
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      requestedTasks: ["RELATION_LOOKUP"],
      relationIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      workflowIntent: null,
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  if (roleHelpCandidate && !kvkkVisibilitySurfaceRequest) {
    shape = {
      ...shape,
      taskType: "OFF_TOPIC",
      generalProductHelpIntent: true,
      roleHelpIntent: true,
      primaryTask: "ROLE_EXPLANATION_HELP",
      explicitTaskIntent: true,
      scopeTarget: "ROLE_GLOBAL",
      ambiguity: null,
    };
  } else if (explicitSurfaceEvidence && mode === "EXPLAIN"
    // A concrete collection request may also ask where that collection is
    // visible.  The collection/count owner remains authoritative; the
    // surface evidence supplies presentation context and must not rewrite a
    // COUNT request into generic screen help.
    && !hasCardinalityCue(message)
    && (typedObjectValue === "SURFACE" || inferred?.targetEntityType === "SURFACE" || !liveSurfaceTargetEvidence)) {
    shape = {
      ...shape,
      taskType: "SCREEN_CONTEXT",
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      scopeTarget: "CURRENT_SCREEN",
      explicitTaskIntent: true,
      explicitUserTarget: true,
      ambiguity: null,
    };
  }
  if (externalDomain && specificity?.positiveNonProductEvidence === true) {
    shape = {
      ...shape,
      taskType: "OFF_TOPIC",
      generalCreativeIntent: false,
      generalInformationIntent: false,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      explicitTaskIntent: false,
      explicitUserTarget: false,
      targetEntityType: null,
      targetCandidates: [],
      scopeTarget: "NONE",
      ambiguity: null,
    };
  } else if ((["AMBIGUOUS", "UNRESOLVED", "REJECTED_STALE", "STALE"].includes(reference)
      || hasUnresolvedQuoteFloorDeicticCue(message, conversationState, screenContext))
    && !hasIssueDiagnosticCue(normalize(message))
    && inferred?.taskType !== "SELECTED_RECORD_CONTEXT"
    // An explicit collection/count request already identifies its authorized
    // entity set.  A temporal/deictic word such as "şu anda" must not erase
    // that set and turn "hangi vardiyalar bekliyor?" into a record
    // clarification when the request carries a typed count target.
    && !(inferred?.taskType === "COUNT" && inferred?.countTarget?.targetEntityType)
    && !inferred?.currentTargetRecoveryIntent
    && !inferred?.currentTargetExplanationIntent
    && !specificity?.financialReadinessEvidence
    && !financialScreenRiskRequest
    && !hasQuoteFloorContextualFollowUpCue(normalize(message), conversationState, screenContext)
    && !hasExplicitCurrentScreenPurposeCue(normalize(message))
    && !shape?.schoolOperationalPlanIntent
    && !liveSurfaceTargetEvidence
    && !shape?.currentTargetReference?.targetKey
    && String(evidence?.object?.value || "").toUpperCase() !== "SURFACE") {
    shape = {
      ...shape,
      taskType: "CLARIFY",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      explicitTaskIntent: false,
      explicitUserTarget: false,
      targetEntityType: null,
      targetCandidates: [],
      ambiguity: "REFERENT_NOT_UNIQUELY_JUSTIFIED",
      scopeTarget: "NONE",
    };
  } else if (continuationValid && mode === "CONTINUE") {
    shape = {
      ...shape,
      taskType: "CONTINUE_CURRENT_REASONING",
      requestedTasks: ["CONTINUE_CURRENT_REASONING"],
      continuationIntent: true,
      explicitTaskIntent: false,
      explicitUserTarget: false,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      targetEntityType: null,
      targetCandidates: [],
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
  } else if (concreteObjectVeto
    // COUNT and RISK are already authoritative typed task families. A
    // concrete domain object is their target, not evidence that the request
    // must be rewritten as a scalar field lookup.
    // SELECTED_RECORD_CONTEXT is likewise an explicit identity question
    // about the live selected record; it must reach the selected-record
    // response owner rather than becoming an empty FIELD_LOOKUP.
    && !["COUNT", "RISK", "ISSUE", "EVIDENCE_SUFFICIENCY", "RECORD_DETAILS", "RELATION_LOOKUP", "SELECTED_RECORD_CONTEXT", "NEXT_ACTION"].includes(String(inferred?.taskType || "").toUpperCase())
    && !explicitSurfaceEvidence
    // A current-screen purpose request remains SCREEN_CONTEXT even when the
    // live surface carries a selected record. The record grounds the answer;
    // it does not turn an operation-inventory question into FIELD_LOOKUP.
    && String(inferred?.screenKnowledgeKind || "").toUpperCase() !== "SCREEN_PURPOSE"
    // A role-global capability question remains ROLE_HELP even when the
    // active screen also carries a selected record. Selection is grounding,
    // not evidence that the user asked for a record field.
    && !inferred?.roleHelpIntent
    && !inferred?.generalProductHelpIntent
    && !inferred?.workflowIntent
    && !inferred?.continuationIntent) {
    shape = {
      ...shape,
      taskType: "FIELD_LOOKUP",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      primaryTask: null,
      continuationIntent: false,
      continuationAction: null,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  const resolvedShape = applySemanticSpecificityResolution(shape, specificity);
  const explicitAgreementDetailsRequest = Boolean(explicitAgreementReferenceFromText(message))
    && hasRecordDetailsCue(normalize(message))
    && String(resolvedShape?.taskType || "").toUpperCase() === "FIELD_LOOKUP";
  if (explicitAgreementDetailsRequest) {
    return {
      ...resolvedShape,
      taskType: "RECORD_DETAILS",
      requestedTasks: ["RECORD_DETAILS"],
      requestedFields: [],
      primaryTask: "RECORD_DETAILS",
      domain: "AGREEMENTS",
      targetEntityType: "AGREEMENT",
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: resolvedShape.scopeTarget === "SELECTED_RECORD" ? "SELECTED_RECORD" : resolvedShape.scopeTarget,
      ambiguity: null,
    };
  }
  const unresolvedAmountDeictic = hasUnresolvedQuoteFloorDeicticCue(message, conversationState, screenContext);
  // A later operation-health metric classifier may recognise "hesaplandı"
  // as an issue explanation.  An unbound amount reference is more specific:
  // without a live financial surface or selected record it must remain
  // fail-closed rather than inherit a stale product entity.
  if (unresolvedAmountDeictic) {
    return {
      ...resolvedShape,
      taskType: "CLARIFY",
      requestedTasks: [],
      requestedFields: [],
      domain: null,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      explicitTaskIntent: false,
      explicitUserTarget: false,
      targetEntityType: null,
      targetCandidates: [],
      scopeTarget: "NONE",
      ambiguity: "REFERENT_NOT_UNIQUELY_JUSTIFIED",
    };
  }
  // Keep the contract-to-generated-shift relation authoritative through the
  // final typed-specificity pass. Surface/action evidence may describe the
  // visible Vardiyalar control, but it must not erase the user's related-data
  // request or downgrade it to generic screen context.
  if (hasContractShiftGenerationLookupCue(message)) {
    return {
      ...resolvedShape,
      taskType: "RELATION_LOOKUP",
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      requestedTasks: ["RELATION_LOOKUP"],
      relationIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      workflowIntent: null,
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  const explicitOperationHealthMetricTarget = inferred?.operationHealthMetricIntent
    && ['GPS_ISSUE_SUBSET', 'METRIC_DEFINITION'].includes(String(inferred?.operationHealthMetricMode || '').trim().toUpperCase());
  if (inferred?.operationHealthMetricIntent
    && !hasExplicitSurfaceNavigationVerb(message)
    && (explicitOperationHealthMetricTarget || !hasExplicitSurfaceNavigationVerb(message))
    && String(resolvedShape?.taskType || '').toUpperCase() !== 'ISSUE') {
    return {
      ...resolvedShape,
      taskType: 'ISSUE',
      requestedTasks: ['ISSUE'],
      requestedFields: inferred.requestedFields || resolvedShape?.requestedFields || [],
      requestedFieldsAuthoritative: true,
      domain: resolvedShape?.domain || 'OPERATIONS',
      operationHealthMetricIntent: true,
      operationHealthMetricMode: inferred.operationHealthMetricMode || null,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: 'CURRENT_SCREEN',
      ambiguity: null,
    };
  }
  // Diagnostic issue grammar is an explicit read-only product task. It must
  // retain that task even when deictic reference handling or broad role-help
  // composition has produced a provisional CLARIFY/OFF_TOPIC shape. The
  // existing issue cue remains the sole structural authority; this only
  // prevents a later generic fallback from discarding it.
  const resolvedIssueDiagnostic = (hasIssueDiagnosticCue(normalize(message))
    && !hasExplicitSurfaceNavigationVerb(message))
    || hasOperationHealthIssueViewCue(message, screenContext);
  if (resolvedIssueDiagnostic && ["CLARIFY", "OFF_TOPIC"].includes(String(resolvedShape?.taskType || "").toUpperCase())) {
    return {
      ...resolvedShape,
      taskType: "ISSUE",
      requestedTasks: ["ISSUE"],
      domain: resolvedShape?.domain || "OPERATIONS",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  // Specificity overrides refine the task family but must not erase a
  // canonical field dependency already established by the semantic request
  // (for example PASSENGER_COUNT on the selected shift).
  if (Array.isArray(inferred?.requestedFields)
    && inferred.requestedFields.length
    && (!Array.isArray(resolvedShape?.requestedFields) || !resolvedShape.requestedFields.length)) {
    return {
      ...resolvedShape,
      requestedFields: inferred.requestedFields,
      requestedFieldsAuthoritative: inferred.requestedFieldsAuthoritative === true,
    };
  }
  return resolvedShape;
}

function buildNewCanonicalResult({
  message,
  user,
  selectedEntity,
  conversationState,
  screenContext,
  interpreterMode,
  typed,
  } = {}) {
  const evidence = typed?.evidence || {};
  const context = typed?.context || buildCanonicalSemanticContext({
    message,
    user,
    conversationState,
    screenContext,
    semanticContext: null,
  });
  const mode = String(evidence?.requestMode?.value || "UNRESOLVED").toUpperCase();
  const typedObjectClass = evidence?.object?.value && evidence.object.value !== "NONE" ? evidence.object.value : null;
  const objectClass = typedObjectClass && CANONICAL_SEMANTIC_OBJECT_CLASSES.has(typedObjectClass)
    ? typedObjectClass
    : null;
  const inferred = typed?.inferred || inferCanonicalSemanticRequest({ message, user, screenContext, conversationState });
  const specificity = typed?.specificity || evidence?.specificity || null;
  const contractShiftRelationRequest = hasContractShiftGenerationLookupCue(message);
  const selectedRecordReference = inferred?.scopeTarget === "SELECTED_RECORD"
    && inferred?.uiContext?.selectedEntityPresent === true
    && Boolean(inferred?.uiContext?.selectedId && inferred?.uiContext?.selectedType);
  const explicitRecordReference = inferred?.explicitEntityReference
    || explicitShiftReferenceFromText(message)
    || explicitVehicleReferenceFromText(message)
    || explicitAgreementReferenceFromText(message)
    || selectedRecordReference;
  const roomCapabilityBoundaryContinuation = hasRoomCapabilityBoundaryContinuation({
    message,
    user,
    screenContext,
    conversationState,
  });
  const roleHelpEvidenceCandidate = (evidence?.quality?.roleHelpCandidate === true
    || specificity?.roleCapabilityExplanationEvidence === true)
    && mode === "EXPLAIN"
    && !hasIssueDiagnosticCue(normalize(message))
    && !inferred?.operationHealthMetricIntent
    && !hasContractShiftGenerationLookupCue(message)
    && evidence.subject?.value === "ROLE"
    // Concrete object evidence owns operation-bearing requests; bounded
    // reference-less role-help aspects are allowed to name a product area.
    && (!objectClass
      || allowsConcreteRoleHelpAspect(evidence, String(evidence?.reference?.value || "ABSENT").toUpperCase())
      || (specificity?.roleCapabilityExplanationEvidence === true && !explicitRecordReference))
    && evidence.roleAspect?.value
    && evidence.roleAspect.value !== "NONE"
    && evidence.productHelp?.value
    && evidence.productHelp.value !== "NONE"
    && evidence.targetRequest?.value === "PRODUCT_AREA"
    && !explicitRecordReference
    && !hasScreenDeicticCue(normalize(message))
    && !hasProductNoteLookupCue(message)
    && !roomCapabilityBoundaryContinuation;
  const explicitSurfacePurpose = hasSituatedCurrentSurfaceGuidanceCue(normalize(message))
    || hasNamedSurfaceExplanationCue(message);
  const explicitSurfaceFocusAssessment = explicitSurfacePurpose
    && hasAttentionAssessmentCue(normalize(message));
  const liveSurfaceTargetEvidence = Boolean(inferred?.currentTargetReference?.targetKey);
  const productHelpSignal = Boolean(
    hasExplicitProductLevelHelpCue(message)
      || (/(?:\bprogram\p{L}*\b|\bplatform\p{L}*\b|\bseferpakt\p{L}*\b)/iu.test(normalize(message))
        && isGenericProductHelpIntent(message, { roleContext: screenContext?.role })
        && !isExplicitRoleHelpIntent(message, { roleContext: screenContext?.role }))
      || (isGenericProductHelpIntent(message, { roleContext: screenContext?.role })
        && !isExplicitRoleHelpIntent(message, { roleContext: screenContext?.role })),
  );
  const previousSemanticPlan = conversationState?.lastSettledResult?.semanticPlan
    || conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || conversationState?.lastSemanticPlan
    || null;
  const settledProductTask = Boolean(previousSemanticPlan && (
    (Array.isArray(previousSemanticPlan.requestedDomains) && previousSemanticPlan.requestedDomains.length > 0)
      || (Array.isArray(previousSemanticPlan.entities) && previousSemanticPlan.entities.length > 0)
      || previousSemanticPlan.relationshipIntent
      || ['RELATION_LOOKUP', 'FIELD_LOOKUP', 'RECORD_DETAILS', 'SCREEN_CONTEXT', 'UI_GUIDANCE', 'CONTINUE_CURRENT_REASONING'].includes(String(previousSemanticPlan.family || '').toUpperCase())
  ));
  const settledProductContinuation = settledProductTask && (
    hasStepByStepTeachingCue(message)
      || hasNaturalContinuationCue(message)
      || hasNaturalBackCue(message)
      || /\b(?:geri|bulamadım|bulamadim|burada\s+göremiyorum|burada\s+goremiyorum)\b/iu.test(String(message || ''))
  );
  const productHelpComposition = Boolean(productHelpSignal && !settledProductContinuation && !explicitSurfacePurpose && !explicitRecordReference && !liveSurfaceTargetEvidence && !contractShiftRelationRequest);
  const explicitSurfaceSemanticOperation = hasExplicitSurfaceSemanticOperation(message);
  const roleCapabilityHelpSupported = specificity?.roleCapabilityExplanationEvidence === true;
  const contextOnlyRoleCapabilityHelp = roleCapabilityHelpSupported && !explicitRecordReference;
  const financialScreenRiskRequest = hasFinancialScreenRiskCue(message)
    && /\/(?:room|company|school|organization)\/financial-operations\b/iu.test(String(screenContext?.path || ''))
    && !currentUiContext(screenContext, conversationState).selectedEntityPresent;
  const currentNextActionRequest = !roleCapabilityHelpSupported && Boolean(
    inferred?.taskType === "NEXT_ACTION"
      || inferred?.routeOrderIntent === true
      || inferred?.requestedTasks?.includes?.("NEXT_ACTION")
      // A named current surface plus an explicit "önce neyi kontrol
      // edeyim?" question is screen-focused guidance, not a record-level
      // next-action request. Let the authorized surface owner answer it;
      // generic next-action wording without this surface cue keeps its
      // existing behavior.
      || (hasNextActionOperationCue(normalize(message))
        && !financialScreenRiskRequest
        && !explicitSurfaceFocusAssessment),
  );
  const kvkkVisibilitySurfaceRequest = /\/shared\/kvkk\b/iu.test(String(screenContext?.path || ""))
    && (
      /\b(?:kvkk|gizlilik|görünürlük|gorunurluk|görünür|gorunur|yetki|rol)\p{L}*\b/iu.test(normalize(message))
      || hasKvkkAccessBoundaryQuestion(message)
    );
  const roleHelpSupported = !kvkkVisibilitySurfaceRequest && roleHelpEvidenceCandidate
    && !contractShiftRelationRequest
    && !settledProductContinuation
    // Situated help is owned by the current authorized surface. Do not let
    // broad role-help evidence reclassify it as ROLE_GLOBAL merely because
    // the utterance also contains a capability/orientation cue.
    && !explicitSurfacePurpose
    && !productHelpComposition
    && (roleCapabilityHelpSupported || (
      !inferred?.screenContextIntent
      && !inferred?.screenKnowledgeIntent
      && !inferred?.screenDetailIntent
    ))
    && !inferred?.workflowIntent
    // A recovery/explanation request for a live guided target is already
    // grounded in an authorized workflow. It must not be rewritten as
    // role-global help merely because the wording also contains an
    // orientation/help cue.
    && !inferred?.continuationIntent
    && !inferred?.currentTargetRecoveryIntent
    && !inferred?.currentTargetExplanationIntent
    && !roomCapabilityBoundaryContinuation
    && inferred?.taskType !== "NEXT_ACTION"
    && !currentNextActionRequest;
  let typedShape = buildTypedCanonicalShape({
    message,
    user,
    screenContext,
    conversationState,
    evidence,
    context,
    inferred,
    specificity,
  });
  const explicitShiftDetailRequest = Boolean(
    explicitShiftReferenceFromText(message)
      && hasRecordDetailsCue(normalize(message))
      && !hasCardinalityCue(normalize(message)),
  );
  if (explicitShiftDetailRequest) {
    // The NEW typed authority must preserve a concrete shift-detail request
    // before visible-shift capability or ROOM create-policy projection can
    // claim the same "aç" verb.  Retrieval/selection remains downstream and
    // still requires the authorized entity reference.
    typedShape = {
      ...typedShape,
      taskType: "RECORD_DETAILS",
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      requestedTasks: ["RECORD_DETAILS"],
      recordDetailsIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      screenContextIntent: false,
      screenDetailIntent: false,
      explicitUiGuidance: false,
      workflowIntent: null,
      scopeTarget: "CURRENT_SCREEN",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      ambiguity: null,
    };
  }
  // An active guided workflow owns ordinal step questions such as
  // “ilk adım ne?”.  The typed evidence composer may still carry the broad
  // product-help task type from the same words; normalize that envelope here
  // before planner/response composition can discard the live task context.
  // This is intentionally guarded by both server-owned workflow state and an
  // explicit ordinal reference, so context-free questions keep their normal
  // general-help behavior.
  const activeOrdinalWorkflowReference = workflowStepReferenceFromText(message);
  const activeOrdinalWorkflow = activeWorkflowPlan(conversationState);
  const liveWorkflowReference = liveWorkflowStepReference(currentUiContext(screenContext, conversationState, user));
  const activeWorkflowStepContext = Boolean(
    (activeOrdinalWorkflowReference && activeOrdinalWorkflow)
      || (liveWorkflowReference
        && hasLiveWorkflowGroundingCue(message)
        && !isLiveWorkflowContinuationCue(message)),
  );
  if (activeWorkflowStepContext && (
    activeOrdinalWorkflowReference
      || liveWorkflowReference
  )) {
    const resolvedWorkflow = activeOrdinalWorkflow || {
      workflowIntent: "CREATE_SHIFT",
      workflowModel: COMPANY_GUIDED_NEW_PLAN_WORKFLOW,
    };
    const resolvedWorkflowStep = activeOrdinalWorkflowReference || liveWorkflowReference;
    typedShape = {
      ...typedShape,
      taskType: "EXPLAIN_CURRENT_TARGET",
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      requestedTasks: ["EXPLAIN_CURRENT_TARGET"],
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      currentTargetExplanationIntent: true,
      workflowStepIntent: true,
      workflowIntent: resolvedWorkflow.workflowIntent || "CREATE_SHIFT",
      workflowModel: resolvedWorkflow.workflowModel || COMPANY_GUIDED_NEW_PLAN_WORKFLOW,
      workflowStepReference: resolvedWorkflowStep,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      scopeTarget: "CURRENT_SCREEN",
    };
  }
  if (settledProductContinuation) {
    const priorEntity = Array.isArray(previousSemanticPlan?.entities) ? previousSemanticPlan.entities.find(Boolean) : null;
    const priorDomains = Array.isArray(previousSemanticPlan?.requestedDomains) ? previousSemanticPlan.requestedDomains.filter(Boolean) : [];
    typedShape = {
      ...typedShape,
      taskType: "CONTINUE_CURRENT_REASONING",
      confidence: Math.max(Number(typedShape?.confidence || 0), 0.99),
      domain: priorDomains[0] || typedShape?.domain || null,
      targetEntityType: priorEntity?.type ? String(priorEntity.type).toUpperCase() : typedShape?.targetEntityType || null,
      requestedTasks: ["CONTINUE_CURRENT_REASONING"],
      explicitTaskIntent: false,
      continuationIntent: true,
      continuationAction: continuationActionFor(message),
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      productTeachingIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      primaryTask: "CONTINUE_CURRENT_REASONING",
      scopeTarget: previousSemanticPlan?.scopeTarget || "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  // A finance-process question is a concrete, read-only product request even
  // when Turkish capability grammar also emits a broad role/process aspect
  // (for example, asking where invoice reconciliation is followed). Keep the
  // typed financial object and process relation authoritative; otherwise the
  // inherited role-help inference sends the request to generic product help
  // before the authorized financial owner can report its real capability.
  const financialReadinessRequest = hasFinancialReadinessEvidence(message);
  const isFinancialOperationsSurface = /\/(?:room|company|school|organization)\/financial-operations\b/iu.test(String(screenContext?.path || ''));
  const currentSurfaceFocusWithoutSelection = Boolean(
    inferred?.screenContextIntent
      && !inferred?.selectedRecordIntent
      && !explicitRecordReference
      && !selectedEntity
      && !currentUiContext(screenContext, conversationState).selectedEntityPresent
      && (isFinancialOperationsSurface || explicitSurfacePurpose),
  );
  const financialProcessRequest = mode === "EXPLAIN"
    && String(evidence?.object?.value || "").toUpperCase() === "FINANCIAL"
    && String(evidence?.relation?.value || "").toUpperCase() === "PROCESS"
    && String(evidence?.targetRequest?.value || "").toUpperCase() === "RECORD"
    && String(evidence?.reference?.value || "ABSENT").toUpperCase() === "ABSENT"
    && !financialReadinessRequest
    && !hasCostAnalysisCue(message, conversationState, screenContext)
    // A current-surface focus question is about the visible financial screen,
    // not a record-level process lookup. Preserve the screen contract when
    // no authorized record is selected; record-specific finance questions
    // continue through the typed financial-process owner.
    && !currentSurfaceFocusWithoutSelection;
  const recentFinancialUserMessages = (Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages : [])
    .filter((item) => item?.role === "user");
  const latestFinancialUserText = normalize(recentFinancialUserMessages.at(-1)?.text);
  const recentFinancialMetricSelection = latestFinancialUserText
    ? [
      /\btahmini\s+maliyet\p{L}*\b/iu,
      /\boperasyonel\s+maliyet(?:\s+tahmini)?\p{L}*\b/iu,
      /\bteklif\s+taban\p{L}*\b/iu,
      /\btahmini\s+k(?:âr|ar)\p{L}*\b/iu,
      /\bplanlanan\s+teklif\p{L}*\b/iu,
    ].filter((pattern) => pattern.test(latestFinancialUserText)).length === 1
    : false;
  const activeFinancialMetricSelection = Boolean(conversationState?.costAnalysisState?.lastMetricIdentity)
    || recentFinancialMetricSelection;
  const financialSourceFollowUp = /\b(?:kayna\p{L}*|dayana\p{L}*|hesaplama\p{L}*|temel\p{L}*|provenans\p{L}*)\b/iu.test(normalize(message))
    && /^(?:bu|bunun|bu\s+(?:tutar|deger|sonuc)\p{L}*)\b/iu.test(normalize(message));
  const financialReferenceValue = String(evidence?.reference?.value || "").toUpperCase();
  const financialObjectAmbiguity = String(evidence?.object?.value || "").toUpperCase() === "FINANCIAL"
    && ["AMBIGUOUS", "UNRESOLVED"].includes(financialReferenceValue);
  const selectedOfferFinancialAmbiguity = String(evidence?.object?.value || "").toUpperCase() === "OFFER"
    && specificity?.financialMetricIdentityEvidence === true
    && financialSourceFollowUp
    && !activeFinancialMetricSelection
    && financialReferenceValue === "ABSENT";
  const quoteFloorContextualFollowUp = hasQuoteFloorContextualFollowUpCue(
    normalize(message),
    conversationState,
    screenContext,
  );
  const financialDeicticClarification = mode === "EXPLAIN"
    && ["RECORD", "PRODUCT_AREA"].includes(String(evidence?.targetRequest?.value || "").toUpperCase())
    && (financialObjectAmbiguity || selectedOfferFinancialAmbiguity)
    && !financialReadinessRequest
    && !financialScreenRiskRequest
    && !quoteFloorContextualFollowUp
    && !hasExplicitCurrentScreenPurposeCue(normalize(message));
  const financialProcessShape = financialProcessRequest
    ? {
      ...typedShape,
      taskType: "FIELD_LOOKUP",
      domain: "FINANCE",
      targetEntityType: "RECORD",
      requestedTasks: ["FIELD_LOOKUP"],
      requestedFields: [],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      primaryTask: "FINANCIAL_PROCESS_LOOKUP",
      ambiguity: null,
    }
    : financialDeicticClarification
      ? {
        ...typedShape,
        taskType: "CLARIFY",
        domain: "FINANCE",
        targetEntityType: "RECORD",
        requestedTasks: [],
        requestedFields: [],
        explicitTaskIntent: false,
        explicitUserTarget: false,
        scopeTarget: "NONE",
        generalProductHelpIntent: false,
        roleHelpIntent: false,
        screenContextIntent: false,
        screenDetailIntent: false,
        screenKnowledgeIntent: false,
        explicitUiGuidance: false,
        primaryTask: "FINANCIAL_REFERENCE_CLARIFICATION",
        ambiguity: "REFERENT_NOT_UNIQUELY_JUSTIFIED",
      }
    : typedShape;
  const financialSurfaceFocusShape = currentSurfaceFocusWithoutSelection
    ? {
      ...typedShape,
      taskType: "SCREEN_CONTEXT",
      confidence: Math.max(Number(typedShape?.confidence || 0), 0.99),
      domain: null,
      targetEntityType: "SURFACE",
      requestedTasks: ["SCREEN_CONTEXT"],
      requestedFields: [],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: "SCREEN_FOCUS",
      explicitUiGuidance: true,
      primaryTask: "SCREEN_CONTEXT",
      ambiguity: null,
    }
    : financialProcessShape;
  const roomBoundaryShape = roomCapabilityBoundaryContinuation
    ? {
      ...financialProcessShape,
      taskType: "SCREEN_CONTEXT",
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      targetCandidates: [],
      requestedTasks: ["SCREEN_CONTEXT"],
      requestedFields: [],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      screenKnowledgeIntent: true,
      screenDetailIntent: true,
      workflowIntent: "OPEN_SHIFT_SURFACE",
      roleCapabilityBoundary: "ROOM_CREATE_UNSUPPORTED",
      continuationIntent: true,
      continuationAction: continuationActionFor(message),
      scopeTarget: "CURRENT_SCREEN",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      primaryTask: "SCREEN_CONTEXT",
      ambiguity: null,
    }
    : null;
  const explicitSurfaceEvidence = Boolean(
    liveSurfaceTargetEvidence
      || (typedObjectClass === "SURFACE"
        && Boolean(
          typedShape?.screenContextIntent
          || typedShape?.screenKnowledgeIntent
          || typedShape?.explicitUiGuidance
          || String(evidence?.targetRequest?.value || "").toUpperCase() === "SURFACE",
        )),
  )
    && (!roleHelpEvidenceCandidate || explicitSurfacePurpose || liveSurfaceTargetEvidence)
    && !productHelpComposition;
  const canonicalIssueDiagnosticRequest = hasCanonicalIssueDiagnosticRequest(message);
  const supportedTypedRequest = roomCapabilityBoundaryContinuation
    || roleHelpSupported
    || Boolean(inferred?.currentTargetRecoveryIntent || inferred?.currentTargetExplanationIntent)
    || Boolean(inferred?.continuationIntent || inferred?.taskType === "CONTINUE_CURRENT_REASONING")
    || Boolean(inferred?.explicitUiGuidance || inferred?.screenContextIntent || inferred?.screenKnowledgeIntent)
    // Collection cardinality is a complete typed read-only request even when
    // the morphology does not emit a separate requestMode (for example an
    // imperative Turkish summary request). Preserve the inferred collection
    // scope instead of converting it into INTERNAL_EVIDENCE_FAILURE.
    || Boolean(
      inferred?.taskType === "COUNT"
      && inferred?.explicitTaskIntent
      && inferred?.explicitUserTarget
      && inferred?.targetEntityType,
    )
    || Boolean(
      inferred?.taskType === "RISK"
      && inferred?.explicitTaskIntent
      && String(inferred?.domain || "").toUpperCase() === "BUDGET",
    )
    || Boolean(
      canonicalIssueDiagnosticRequest
      && inferred?.taskType === "ISSUE"
      && inferred?.explicitTaskIntent
      && inferred?.explicitUserTarget,
    )
    || Boolean(inferred?.explicitTaskIntent && inferred?.explicitUserTarget && inferred?.targetEntityType === "SHIFT" && inferred?.taskType === "FIELD_LOOKUP")
    || ["EXPLAIN", "VIEW", "NAVIGATE", "CREATE", "UPDATE", "DELETE", "SEND", "COMPARE", "OTHER_PRODUCT_REQUEST", "GENUINE_OOS", "CONTINUE", "RESUME"].includes(mode);
  const failure = !supportedTypedRequest;
  const financialIssueRequest = /\b(?:hakediş|hakedis)\p{L}*\b.{0,32}\b(?:sorun|durum|var)\b/iu.test(normalize(message))
    || hasFinancialReadinessEvidence(message)
    || (String(evidence?.object?.value || "").toUpperCase() === "FINANCIAL" && canonicalIssueDiagnosticRequest);
  const financialIssueShape = financialIssueRequest
    ? {
      ...typedShape,
      taskType: "RISK",
      confidence: Math.max(Number(typedShape?.confidence || 0), 0.96),
      domain: "FINANCE",
      targetEntityType: null,
      requestedTasks: ["RISK"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      // “Hakedişlerimde…” is a role-scoped financial summary. A selected
      // vehicle/shift is not an implicit financial target for this turn.
      scopeTarget: "CURRENT_SCREEN",
      selectedRecordIntent: false,
      suppressSelectedEntityContext: true,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      ambiguity: null,
    }
    : null;
  const issueDiagnosticShape = canonicalIssueDiagnosticRequest && !financialIssueRequest
    ? {
      ...typedShape,
      taskType: "ISSUE",
      confidence: Math.max(Number(typedShape?.confidence || 0), 0.96),
      domain: "OPERATIONS",
      targetEntityType: null,
      requestedTasks: ["ISSUE"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: inferred?.scopeTarget || "CURRENT_SCREEN",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      ambiguity: null,
    }
    : null;
  let shape = failure
    ? newAuthorityShape({ message, screenContext, evidence, failure: true, roleHelp: false })
    : (roomBoundaryShape || financialIssueShape || financialSurfaceFocusShape || issueDiagnosticShape || typedShape);
  if (!failure && explicitShiftDetailRequest) {
    // Apply the concrete-record precedence at the final NEW-authority shape
    // seam as well. A ROOM capability-boundary projection must not replace a
    // user-named, authorized read-only shift detail request.
    shape = {
      ...shape,
      taskType: "RECORD_DETAILS",
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      requestedTasks: ["RECORD_DETAILS"],
      recordDetailsIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      screenContextIntent: false,
      screenDetailIntent: false,
      explicitUiGuidance: false,
      workflowIntent: null,
      scopeTarget: "CURRENT_SCREEN",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      ambiguity: null,
    };
  }
  if (currentNextActionRequest) {
    shape = {
      ...shape,
      taskType: "NEXT_ACTION",
      domain: null,
      targetEntityType: null,
      requestedTasks: ["NEXT_ACTION"],
      requestedFields: [],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
      routeOrderIntent: true,
      routeOrderState: "MISSING_OR_UNVERIFIED",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: true,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: true,
      primaryTask: "NEXT_ACTION",
      ambiguity: null,
    };
  }
  let semanticAction = inferCanonicalSemanticAction({
    text: message,
    shape,
    conversationState,
    semanticContext: context,
    typedEvidence: evidence,
  });
  if (!failure && explicitShiftDetailRequest) {
    semanticAction = resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: "SHIFT",
      targetCandidate: { objectClass: "SHIFT" },
      explicitness: "EXPLICIT",
      evidence: ["EXPLICIT_SHIFT_RECORD_DETAILS"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }
  if (canonicalIssueDiagnosticRequest && !financialIssueRequest) {
    semanticAction = resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: null,
      targetCandidate: null,
      explicitness: "EXPLICIT",
      evidence: ["CANONICAL_ISSUE_DIAGNOSTIC_TASK"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }
  if (financialIssueRequest) {
    semanticAction = resolvedSemanticAction({
      actionClass: "ANALYZE",
      objectClass: "FINANCIAL",
      targetCandidate: { objectClass: "FINANCIAL" },
      explicitness: "EXPLICIT",
      evidence: ["CANONICAL_FINANCIAL_ISSUE_TASK"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }
  const normalizedOperationHealthMessage = normalize(message);
  const currentScreenPath = String(screenContext?.path || "");
  const explicitNonOperationHealthSelection = currentScreenPath !== "/room/operation-health"
    && Boolean(screenContext?.selectedEntity || screenContext?.selectedEntityId || screenContext?.selectedEntityType);
  const operationHealthSurfaceIssue = (
    /\/room\/operation-health\b/iu.test(currentScreenPath)
    || (String(user?.role || "").toUpperCase() === "ROOM"
      && /(?:satir|sıra|sorun|problem|riskli\s+cihaz|acik\s+sorun|açık\s+sorun)/iu.test(normalizedOperationHealthMessage))
  )
    && /(?:riskli\s+cihaz|gps|konum\s+sinyali|cevrim\s+disi|çevrim\s+dışı|acik\s+sorun|açık\s+sorun|problem)/iu.test(normalizedOperationHealthMessage)
    && !hasOperationHealthIssueViewCue(message, screenContext)
    && !explicitNonOperationHealthSelection;
  if (operationHealthSurfaceIssue) {
    const keepMetricContract = shape?.operationHealthMetricIntent === true;
    shape = {
      ...shape,
      taskType: "ISSUE",
      domain: "OPERATIONS",
      targetEntityType: null,
      requestedTasks: ["ISSUE"],
      requestedFields: keepMetricContract ? shape.requestedFields : [],
      requestedFieldsAuthoritative: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
      screenContextIntent: true,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      roleHelpIntent: false,
      generalProductHelpIntent: false,
      requestedDomains: ["OPERATIONS"],
    };
    semanticAction = resolvedSemanticAction({
      actionClass: "ANALYZE",
      objectClass: "SURFACE",
      targetCandidate: { objectClass: "SURFACE" },
      explicitness: "EXPLICIT",
      evidence: ["CURRENT_OPERATION_HEALTH_SCREEN_SCOPE"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: false },
    });
  }
  if (financialScreenRiskRequest && shape?.taskType === "RISK" && shape?.scopeTarget === "CURRENT_SCREEN") {
    semanticAction = resolvedSemanticAction({
      actionClass: "ANALYZE",
      objectClass: "SURFACE",
      targetCandidate: { objectClass: "SURFACE" },
      explicitness: "EXPLICIT",
      evidence: ["CURRENT_FINANCIAL_SCREEN_RISK"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: false },
    });
  }
  // A generic record request without a record type, id, selected record or
  // unique discourse referent is not a request for the nearest product
  // surface. Keep the ambiguity at the canonical semantic owner so downstream
  // screen guidance cannot silently choose Biniş, Vardiyalar, Teklifler or
  // another unrelated collection.
  const unresolvedGenericRecordReferent = !failure
    && !explicitRecordReference
    && !currentUiContext(screenContext, conversationState, user).selectedEntityPresent
    && (String(shape?.typedEvidence?.object || semanticAction?.objectClass || "").toUpperCase() === "RECORD"
      || String(evidence?.targetRequest?.value || "").toUpperCase() === "RECORD")
    && /\b(?:kay(?:ı|i)t|record)\p{L}*\b/iu.test(normalize(message))
    && /\b(?:g[oö]ster|a[cç]|incele|bul|g[oö]r[uü]nt[uü]le)\p{L}*\b/iu.test(normalize(message))
    && !(
      String(inferred?.workflowIntent || "").toUpperCase() === "OPEN_SHIFT_SURFACE"
      && String(evidence?.requestMode?.value || "").toUpperCase() === "VIEW"
    )
    && !inferred?.currentTargetReference?.targetKey
    && !conversationState?.uniqueDiscourseReferent
    && !conversationState?.activeTask;
  if (unresolvedGenericRecordReferent) {
    shape = {
      ...shape,
      taskType: "CLARIFY",
      domain: null,
      targetEntityType: null,
      targetCandidates: [],
      requestedTasks: [],
      requestedFields: [],
      requestedFieldsAuthoritative: true,
      explicitTaskIntent: true,
      explicitUserTarget: false,
      scopeTarget: "NONE",
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      primaryTask: "CLARIFY_RECORD_TARGET",
      ambiguity: "RECORD_TYPE_OR_ID_REQUIRED",
    };
    semanticAction = resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: "RECORD",
      targetCandidate: { objectClass: "RECORD" },
      explicitness: "EXPLICIT",
      evidence: ["GENERIC_RECORD_TARGET_UNRESOLVED"],
      resolutionStatus: "AMBIGUOUS",
      modifiers: { new: false, current: false, next: false, explicitTarget: false },
    });
  }
  const mapped = mapSemanticActionToCanonicalMeaning({ semanticAction, shape });
  shape = mapped.shape || shape;
  // KVKK access-boundary questions are a screen-scoped explanation family.
  // Preserve that semantic decision after generic action mapping as well;
  // otherwise visibility wording such as “Bu KVKK görünürlüğü neden
  // kısıtlı?” can lose its EXPLAIN/SURFACE action and fall into clarification.
  if (kvkkVisibilitySurfaceRequest && hasKvkkAccessBoundaryQuestion(message)) {
    shape = {
      ...shape,
      taskType: "SCREEN_CONTEXT",
      targetEntityType: "SURFACE",
      requestedTasks: ["SCREEN_CONTEXT"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      screenKnowledgeKind: "KVKK_VISIBILITY",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      primaryTask: "SCREEN_CONTEXT",
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
    semanticAction = resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: "SURFACE",
      targetCandidate: { objectClass: "SURFACE" },
      explicitness: "EXPLICIT",
      evidence: ["CURRENT_KVKK_ACCESS_BOUNDARY"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }
  if (roomBoundaryShape) {
    shape = {
      ...shape,
      ...roomBoundaryShape,
    };
  }
  if (productHelpComposition && !financialProcessRequest && !financialDeicticClarification && !specificity?.blocksGenericFallback && !roomCapabilityBoundaryContinuation && !explicitRecordReference) {
    shape = {
      ...shape,
      taskType: "OFF_TOPIC",
      confidence: Math.max(Number(shape?.confidence || 0), 0.97),
      domain: null,
      targetEntityType: null,
      targetCandidates: [],
      generalInformationIntent: true,
      generalProductHelpIntent: true,
      productTeachingIntent: Boolean(shape?.productTeachingIntent || hasExplicitProductLevelHelpCue(message)),
      roleHelpIntent: false,
      primaryTask: "GENERIC_PRODUCT_HELP",
      explicitTaskIntent: true,
      scopeTarget: "ROLE_GLOBAL",
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      currentTargetRecoveryIntent: false,
      currentTargetExplanationIntent: false,
      ambiguity: null,
    };
  }
  if (roleHelpSupported
    && (!specificity?.blocksGenericFallback || contextOnlyRoleCapabilityHelp)
    && !explicitSurfaceEvidence
    && !explicitSurfacePurpose
    && !roomCapabilityBoundaryContinuation) {
    shape = {
      ...shape,
      taskType: "OFF_TOPIC",
      generalProductHelpIntent: true,
      roleHelpIntent: true,
      primaryTask: "ROLE_EXPLANATION_HELP",
      explicitTaskIntent: true,
      scopeTarget: "ROLE_GLOBAL",
      ambiguity: null,
    };
  }
  // A contract-produced-shift relation is a concrete read-only product task.
  // Keep it ahead of the broad role/process explanation fallback so spoken
  // variants such as “sözleşmeden çıkan vardiyaları açar mısın?” reach the
  // same collection executor as the established “üretilen vardiyalar” form.
  if (contractShiftRelationRequest) {
    shape = {
      ...shape,
      taskType: "RELATION_LOOKUP",
      domain: "SHIFTS",
      targetEntityType: "SHIFT",
      requestedTasks: ["RELATION_LOOKUP"],
      relationIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      generalInformationIntent: false,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      primaryTask: "TYPED_SEMANTIC_REQUEST",
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      workflowIntent: null,
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
    semanticAction = resolvedSemanticAction({
      actionClass: "VIEW",
      objectClass: "SHIFT",
      targetCandidate: { objectClass: "SHIFT" },
      explicitness: "EXPLICIT",
      evidence: ["CONTRACT_SHIFT_RELATION_LOOKUP"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }
  const externalDomain = Array.isArray(evidence.domainEvidence)
    && evidence.domainEvidence.some((entry) => entry?.kind === "EXTERNAL_DOMAIN" && String(entry?.value || "").toUpperCase() !== "NONE");
  const positiveNonProductEvidence = specificity?.positiveNonProductEvidence === true;
  const unresolvedCurrentSurfaceReferent = (inferred?.taskType === "CLARIFY" || shape?.taskType === "CLARIFY")
    && (inferred?.ambiguity === "REFERENT_NOT_UNIQUELY_JUSTIFIED" || shape?.ambiguity === "REFERENT_NOT_UNIQUELY_JUSTIFIED")
    && Boolean(screenContext?.path);
  const explicitGenuineOffTopic = hasGenuineOffTopicSignal(normalize(message), inferred)
    && !unresolvedCurrentSurfaceReferent
    && !hasProductSignal(normalize(message), inferred);
  const genuineOos = !failure
    && (
      (mode === "GENUINE_OOS"
        && evidence?.quality?.genuineOosEvidence === true
        && positiveNonProductEvidence)
      || explicitGenuineOffTopic
    );
  const coherentRoleHelp = !failure
    && !roomCapabilityBoundaryContinuation
    && !contractShiftRelationRequest
    && (!specificity?.blocksGenericFallback || contextOnlyRoleCapabilityHelp)
    && !currentNextActionRequest
    && (roleHelpSupported
      || (
        evidence?.quality?.roleHelpCandidate === true
        && inferred?.screenContextIntent
        && inferred?.taskType !== "NEXT_ACTION"
        && !inferred?.screenKnowledgeIntent
        && !inferred?.screenDetailIntent
        && !explicitSurfacePurpose
        && !productHelpComposition
      ))
    && !explicitSurfaceEvidence
    && !(externalDomain && positiveNonProductEvidence)
    && !shape?.generalCreativeIntent
    && !shape?.generalArithmetic
    && !shape?.operationHealthMetricIntent
    && !hasProductNoteLookupCue(message)
    // The typed shape may discover a live recovery/target explanation even
    // when the initial inference carried only broad orientation evidence.
    // Preserve that concrete workflow meaning at the final composition seam.
    && !shape?.currentTargetRecoveryIntent
    && !shape?.currentTargetExplanationIntent
    // A resolved operation-bearing CREATE action outranks broad role-help
    // evidence. Without this guard, necessity wording such as “kurmam
    // gerekiyor” can be rewritten as role-global EXPLAIN at the final seam.
    && semanticAction?.actionClass !== "CREATE"
    // A canonical workflow destination owns the turn even when the typed
    // evidence also contains broad role/process language. Do not collapse a
    // concrete surface request such as opening Offers into ROLE_GLOBAL help.
    && !inferred?.workflowIntent
    && !(shape?.workflowIntent && explicitSurfaceSemanticOperation);
  if (coherentRoleHelp) {
    // Incidental product nouns may leave a weak screen-context task on the
    // typed shape even after central composition has established role help.
    // Normalize the owned shape here so the planner consumes the same
    // canonical meaning instead of reinterpreting it as UI guidance.
    shape = {
      ...shape,
      taskType: "OFF_TOPIC",
      requestedTasks: ["OFF_TOPIC"],
      generalInformationIntent: false,
      generalProductHelpIntent: true,
      roleHelpIntent: true,
      primaryTask: "ROLE_EXPLANATION_HELP",
      explicitTaskIntent: true,
      explicitUserTarget: false,
      targetEntityType: null,
      targetCandidates: [],
      requestedFields: [],
      scopeTarget: "ROLE_GLOBAL",
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      workflowIntent: null,
      currentTargetRecoveryIntent: false,
      currentTargetExplanationIntent: false,
      ambiguity: null,
    };
  }
  // An explicit view/open request for the current Operation Health problems
  // surface is a guided surface request, not an issue-diagnostic question.
  // Keep the canonical target and the semantic family aligned: the user is
  // asking to see the authorized problems surface, while issue records are
  // read only by the executor when that surface is rendered.
  if (hasOperationHealthIssueViewCue(message, screenContext)) {
    shape = {
      ...shape,
      taskType: "SCREEN_CONTEXT",
      domain: "OPERATIONS",
      targetEntityType: "SURFACE",
      requestedTasks: ["SCREEN_CONTEXT"],
      explicitTaskIntent: true,
      explicitUserTarget: true,
      explicitUiGuidance: true,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
    semanticAction = resolvedSemanticAction({
      actionClass: "VIEW",
      objectClass: "SURFACE",
      targetCandidate: { objectClass: "SURFACE" },
      explicitness: "EXPLICIT",
      evidence: ["CURRENT_OPERATION_HEALTH_PROBLEMS_VIEW"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: true },
    });
  }
  const unresolvedNumericReferent = inferred?.ambiguity === "NUMERIC_REFERENT_TYPE_UNRESOLVED";
  if (unresolvedNumericReferent) {
    // Preserve the canonical ambiguity through the final typed-action mapping.
    // A downstream lexical pass must not turn an unresolved number into an
    // offer/shift lookup or inherit the previously selected record.
    shape = {
      ...shape,
      taskType: "CLARIFY",
      domain: null,
      targetEntityType: null,
      targetCandidates: [],
      requestedTasks: [],
      requestedFields: [],
      requestedFieldsAuthoritative: true,
      explicitTaskIntent: true,
      explicitUserTarget: false,
      scopeTarget: "NONE",
      generalInformationIntent: false,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      explicitUiGuidance: false,
      ambiguity: "NUMERIC_REFERENT_TYPE_UNRESOLVED",
    };
    semanticAction = resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: null,
      explicitness: "NONE",
      evidence: ["NUMERIC_REFERENT_TYPE_UNRESOLVED"],
      resolutionStatus: "AMBIGUOUS",
      modifiers: { new: false, current: false, next: false, explicitTarget: false },
    });
  }
  const genericProductHelp = !failure
    && Boolean(shape?.generalProductHelpIntent)
    && !contractShiftRelationRequest
    && !shape?.generalCreativeIntent
    && !shape?.generalArithmetic
    && !shape?.currentTargetRecoveryIntent
    && !shape?.currentTargetExplanationIntent
    && !shape?.workflowIntent;
  if (genuineOos) {
    semanticAction = resolvedSemanticAction({
      actionClass: "NONE",
      objectClass: null,
      explicitness: "NONE",
      evidence: ["TYPED_SEMANTIC_EXTERNAL_DOMAIN"],
      resolutionStatus: "NOT_APPLICABLE",
      modifiers: { new: false, current: false, next: false, explicitTarget: false },
    });
  } else if (coherentRoleHelp) {
    const currentSurfaceAvailable = Boolean(context?.currentSurface?.path || context?.currentSurface?.label || screenContext?.path || screenContext?.label);
    const roleHelpObjectClass = currentSurfaceAvailable ? "SURFACE" : null;
    semanticAction = resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: roleHelpObjectClass,
      targetCandidate: roleHelpObjectClass ? { objectClass: roleHelpObjectClass } : null,
      explicitness: "EXPLICIT",
      evidence: ["TYPED_SEMANTIC_ROLE_HELP"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: false },
    });
  } else if (genericProductHelp) {
    // General product help remains a global explanation task.  When a
    // current surface exists, expose it only as the grounding object; the
    // operation stays GENERAL_INFORMATION and must not become screen help.
    const currentSurfaceAvailable = Boolean(context?.currentSurface?.path || context?.currentSurface?.label || screenContext?.path || screenContext?.label);
    const productHelpObjectClass = currentSurfaceAvailable ? "SURFACE" : null;
    semanticAction = resolvedSemanticAction({
      actionClass: "EXPLAIN",
      objectClass: productHelpObjectClass,
      targetCandidate: productHelpObjectClass ? { objectClass: productHelpObjectClass } : null,
      explicitness: "EXPLICIT",
      evidence: ["TYPED_SEMANTIC_PRODUCT_HELP"],
      resolutionStatus: "RESOLVED",
      modifiers: { new: false, current: true, next: false, explicitTarget: false },
    });
  }
  const semanticScope = failure
    ? { class: "UNRESOLVED", evidence: "INTERNAL_EVIDENCE_FAILURE", explicit: false, confidence: 0 }
    : genuineOos
      ? { class: "OFF_TOPIC_GENUINE", evidence: "TYPED_SEMANTIC_EXTERNAL_DOMAIN", explicit: true, confidence: 0.9 }
      : roomCapabilityBoundaryContinuation
        ? { class: "PRODUCT_EXPLICIT", evidence: "ROOM_CAPABILITY_BOUNDARY_CONTINUATION", explicit: true, confidence: 0.95 }
      : coherentRoleHelp
        ? { class: "PRODUCT_EXPLICIT", evidence: "TYPED_SEMANTIC_ROLE_HELP", explicit: true, confidence: 0.9 }
        : genericProductHelp
          ? { class: "PRODUCT_EXPLICIT", evidence: "TYPED_SEMANTIC_PRODUCT_HELP", explicit: true, confidence: 0.9 }
          : resolveSemanticScope({ text: message, shape, semanticAction });
  const operation = operationHealthSurfaceIssue
    ? "DIAGNOSE_CURRENT_ISSUE"
    : failure
    ? "GENERAL_INFORMATION"
    : genuineOos
      ? "GENERAL_INFORMATION"
      : (kvkkVisibilitySurfaceRequest && hasKvkkAccessBoundaryQuestion(message))
        ? "EXPLAIN_CURRENT_SURFACE"
    : unresolvedNumericReferent || unresolvedGenericRecordReferent
        ? "CLARIFY_SEMANTIC_REQUEST"
      : roomCapabilityBoundaryContinuation
        ? "OPEN_EXISTING_SHIFT_OPERATIONS"
      : coherentRoleHelp || genericProductHelp
        ? "GENERAL_INFORMATION"
        : mapped.operation;
  const domain = failure || genuineOos || unresolvedNumericReferent || unresolvedGenericRecordReferent ? "GENERAL" : String(shape?.domain || "PRODUCT").toUpperCase();
  const capability = operationHealthSurfaceIssue
    ? "DIAGNOSE_OPERATION_HEALTH"
    : failure || genuineOos || coherentRoleHelp || genericProductHelp
    ? "GENERAL_INFORMATION"
    : unresolvedNumericReferent || unresolvedGenericRecordReferent
      ? "GENERAL_INFORMATION"
    : roomCapabilityBoundaryContinuation
      ? "OPEN_SHIFT_SURFACE"
    : mapped.capability;
  const request = deepFreeze({
    version: SEFER_ABI_CANONICAL_REQUEST_VERSION,
    operation,
    domain,
    capability,
    candidateEntityRefs: operationHealthSurfaceIssue
      ? []
      : candidateEntityRefsFromCanonicalShape(shape, selectedEntity, { operation, semanticAction, message, conversationState, screenContext }),
    requestedFields: canonicalRequestedFields(shape),
    safety: canonicalSafetyForShape(shape),
    semanticScope,
    semanticAction,
    currentRequest: {
      explicitness: failure || unresolvedNumericReferent || unresolvedGenericRecordReferent ? "UNRESOLVED" : "EXPLICIT",
      operation,
      normalizedMeaning: String(shape.normalizedText || normalize(message)).trim(),
      rawTextHash: null,
    },
    activeTaskRef: conversationState?.activeGuidedTask?.taskId
      || conversationState?.activeTask?.id
      || conversationState?.activeGuidedTask?.semanticPlan?.workflowIntent
      || null,
    workflowRef: shape?.workflowIntent
      ? {
        workflowIntent: shape.workflowIntent,
        workflowState: shape.workflowActualUiState || shape.workflowEntryState || null,
      }
      : null,
    continuation: {
      mode: semanticAction.actionClass === "CONTINUE"
        ? "CONTINUE"
        : semanticAction.actionClass === "RESUME"
          ? "RESUME"
          : shape?.restartIntent
            ? "RESTART"
            : "NEW_REQUEST",
      baseRequestId: conversationState?.lastSettledResult?.requestId || null,
      depth: Number(conversationState?.lastSettledResult?.continuationDepth || 0) || 0,
    },
    groundingRequirement: failure || genuineOos ? "NONE" : "CURRENT_AUTHORIZED_RUNTIME",
    ambiguity: {
      status: failure || semanticAction.resolutionStatus === "UNRESOLVED" || shape?.ambiguity
        ? "UNRESOLVED"
        : semanticAction.resolutionStatus === "AMBIGUOUS"
          ? "AMBIGUOUS"
          : "NONE",
      candidates: [],
      reason: failure ? "INTERNAL_EVIDENCE_FAILURE" : shape?.ambiguity || null,
    },
    provenance: {
      interpreter: "TYPED_SEMANTIC_EVIDENCE",
      interpreterMode,
      source: "semanticEvidenceComposer.composeSemanticEvidence",
      createdAt: new Date().toISOString(),
    },
    typedEvidence: evidence || null,
  });
  const validation = validateCanonicalConversationRequest(request);
  const fallbackEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: semanticScope.class,
    resolutionStatus: semanticAction.resolutionStatus,
    confidence: failure || semanticAction.resolutionStatus === "UNRESOLVED" ? "LOW" : "HIGH",
    hasProductEvidence: !failure && !genuineOos && semanticScope.class !== "OFF_TOPIC_GENUINE",
  });
  return deepFreeze({
    requestId: `ccr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    request,
    canonicalShape: shape,
    validation: {
      status: failure ? "SEMANTIC_UNRESOLVED" : (validation.valid ? "VALID" : "SEMANTIC_UNRESOLVED"),
      errors: validation.errors,
      failureClass: failure ? "INTERNAL_EVIDENCE_FAILURE" : validation.failureClass,
    },
    failureClass: failure ? "INTERNAL_EVIDENCE_FAILURE" : (validation.valid ? null : "SAFE_CLARIFICATION"),
    fallbackEligibility: { ...fallbackEligibility, invoked: false },
    user: { role: user?.role || null },
    diagnostics: {},
  });
}

export function resolveCanonicalConversationRequest({
  message,
  user,
  selectedEntity = null,
  conversationState = null,
  screenContext = null,
  semanticContext = null,
  interpreterMode = "DETERMINISTIC",
  env = process.env,
  localSemanticProposal = null,
} = {}) {
  const mode = getSemanticAuthorityMode({ env });
  const selectedAuthority = mode === "NEW" ? "NEW_TYPED_EVIDENCE" : "OLD_CANONICAL";
  const authorityTrace = createAuthorityTrace(mode, selectedAuthority);
  if (mode === "NEW") {
    const typed = composeTypedSemanticEvidence({ message, user, conversationState, screenContext, semanticContext, authorityTrace, traceRole: "AUTHORITY", localSemanticProposal });
    const result = buildNewCanonicalResult({ message, user, selectedEntity, conversationState, screenContext, interpreterMode, typed });
    return deepFreeze({
      ...result,
      diagnostics: {
        semanticAuthority: authorityDiagnostics(authorityTrace),
      },
    });
  }

  const oldResult = resolveOldCanonicalConversationRequest({
    message,
    user,
    selectedEntity,
    conversationState,
    screenContext,
    semanticContext,
    interpreterMode,
    authorityTrace,
    localSemanticProposal,
  });
  if (mode === "OLD") {
    return deepFreeze({
      ...oldResult,
      diagnostics: {
        semanticAuthority: authorityDiagnostics(authorityTrace),
      },
    });
  }

  const typed = composeTypedSemanticEvidence({ message, user, conversationState, screenContext, semanticContext, authorityTrace, traceRole: "DIAGNOSTIC", localSemanticProposal });
  const shadowSemanticEvidence = buildShadowSemanticEvidenceDiagnostic({
    features: typed.features,
    context: typed.context,
    newEvidence: typed.evidence,
    request: oldResult.request,
    canonicalShape: oldResult.canonicalShape,
    validation: {
      valid: oldResult.validation.status === "VALID",
      errors: oldResult.validation.errors,
      failureClass: oldResult.validation.failureClass,
    },
    failureClass: oldResult.failureClass,
    fallbackEligibility: oldResult.fallbackEligibility,
  });
  return deepFreeze({
    ...oldResult,
    diagnostics: {
      semanticAuthority: authorityDiagnostics(authorityTrace),
      shadowSemanticEvidence,
    },
  });
}

export { validateCanonicalConversationRequest };

export { TASK_TYPES, normalize, familyToTaskType };
