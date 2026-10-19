import { hasTurkishDirectionalNavigationPredicate } from "./turkishNavigationEvidence.js";

const ROLE_ASPECTS = Object.freeze([
  "CAPABILITY", "RESPONSIBILITY", "OWNERSHIP", "DECISION_RESPONSIBILITY",
  "PROCESS_RESPONSIBILITY", "BOUNDARY", "LIMITATION", "ORIENTATION", "STARTING_GUIDANCE",
]);

const ROLE_HELP_BY_ASPECT = Object.freeze({
  CAPABILITY: "CAPABILITY_GUIDANCE",
  RESPONSIBILITY: "RESPONSIBILITY_GUIDANCE",
  OWNERSHIP: "RESPONSIBILITY_GUIDANCE",
  DECISION_RESPONSIBILITY: "RESPONSIBILITY_GUIDANCE",
  PROCESS_RESPONSIBILITY: "PROCESS_GUIDANCE",
  BOUNDARY: "RESPONSIBILITY_GUIDANCE",
  LIMITATION: "RESPONSIBILITY_GUIDANCE",
  ORIENTATION: "ORIENTATION",
  STARTING_GUIDANCE: "ORIENTATION",
});

const PROVENANCE = Object.freeze({ raw: "RAW_TEXT", morphology: "MORPHOLOGY", structure: "STRUCTURE", auth: "AUTH_CONTEXT", surface: "SURFACE_CONTEXT", task: "ACTIVE_TASK", reference: "REFERENCE_HISTORY", inference: "INFERENCE" });
const CONCRETE_OBJECT_VALUES = new Set(["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "FINANCIAL", "SURFACE", "RECORD", "ENTITY"]);
const ROLE_HELP_CONCRETE_ASPECTS = new Set([
  "CAPABILITY", "RESPONSIBILITY", "OWNERSHIP", "DECISION_RESPONSIBILITY",
  "PROCESS_RESPONSIBILITY", "ORIENTATION", "STARTING_GUIDANCE",
]);
const GENERAL_CREATIVE_OUTPUT_TOPIC = /^(?:şiir|siir|hikaye|hikâye|öykü|oyku|mesaj|metin|not|tebrik|dilek|cümle|cumle|paragraf)\p{L}*$/u;
const GENERAL_CREATIVE_OUTPUT_VERB = /^(?:yaz|oluştur|olustur|hazırla|hazirla|üret|uret|uydur|kur|çıkar|cikar)\p{L}*$/u;

function stringValue(value) {
  return String(value ?? "").trim();
}

function normalizedTokens(features) {
  return (Array.isArray(features?.tokens) ? features.tokens : [])
    .flatMap((token) => [token.normalized, ...(Array.isArray(token.lemmaCandidates) ? token.lemmaCandidates : [])])
    .filter(Boolean)
    .map((token) => stringValue(token).toLocaleLowerCase("tr-TR"));
}

function surfaceTokens(features) {
  return (Array.isArray(features?.tokens) ? features.tokens : [])
    .map((token) => stringValue(token?.normalized).toLocaleLowerCase("tr-TR"))
    .filter(Boolean);
}

function hasToken(tokens, patterns) {
  return patterns.some((pattern) => tokens.some((token) => pattern.test(token)));
}

function hasExactToken(tokens, values) {
  const expected = new Set(values);
  return tokens.some((token) => expected.has(token));
}

function hasImperativeToken(tokens, stems) {
  return tokens.some((token) => stems.some((stem) => new RegExp("^" + stem + "(?:ın|in|un|ün|ınız|iniz|unuz|ünüz|elim|alım)?$", "u").test(token)));
}

const TURKISH_POLITE_QUESTION_CLITICS = new Set([
  "misin", "mısın", "musun", "müsün",
  "misiniz", "mısınız", "musunuz", "müsünüz",
]);

const TURKISH_AORIST_SUFFIXES = Object.freeze(["r", "ar", "er", "ır", "ir", "ur", "ür"]);

function isTurkishPoliteQuestionClitic(value) {
  return TURKISH_POLITE_QUESTION_CLITICS.has(value);
}

function isTurkishAoristFormForStem(value, stem) {
  return TURKISH_AORIST_SUFFIXES.some((suffix) => value === `${stem}${suffix}`);
}

function hasPoliteAoristActionRequest(features, stems) {
  if (!features?.question?.isQuestion || !Array.isArray(features?.tokens)) return false;
  const surfaceTokens = features.tokens
    .map((token) => stringValue(token?.normalized).toLocaleLowerCase("tr-TR"))
    .filter(Boolean);
  return surfaceTokens.some((token, index) => {
    if (!isTurkishPoliteQuestionClitic(token) || index === 0) return false;
    const predicate = surfaceTokens[index - 1];
    return stems.some((stem) => isTurkishAoristFormForStem(predicate, stem));
  });
}

function hasDesiderativeActionRequest(features, stems) {
  if (features?.question?.isQuestion || !Array.isArray(features?.tokens)) return false;
  const words = surfaceTokens(features);
  const desiderativeIndex = words.findIndex((token) => /^(?:istiyor(?:um|uz|sun|sunuz)?|ister(?:im|iz|sin|siniz)?)$/u.test(token));
  if (desiderativeIndex <= 0) return false;
  return words.slice(0, desiderativeIndex).some((token) => stems.some((stem) => token === `${stem}mak` || token === `${stem}mek`));
}

function hasNegatedDesiderativeAction(features, stems) {
  if (!Array.isArray(features?.tokens)) return false;
  const words = surfaceTokens(features);
  const negatedIndex = words.findIndex((token) => /^istemiyor(?:um|uz|sun|sunuz)?$/u.test(token));
  if (negatedIndex <= 0) return false;
  return words.slice(0, negatedIndex).some((token) => stems.some((stem) => token === `${stem}mak` || token === `${stem}mek`));
}

function hasSurfaceDiscoveryStructure(tokens) {
  const surfaceNoun = hasToken(tokens, [/^sayfa\p{L}*$/u, /^ekran\p{L}*$/u, /^panel\p{L}*$/u, /^menü\p{L}*$/u, /^menu\p{L}*$/u]);
  return surfaceNoun && hasImperativeToken(tokens, ["bul", "ara"]);
}

function hasSurfaceViewPredicate(tokens) {
  const colloquialInspection = hasToken(tokens, [/^göz$/u, /^goz$/u])
    && hasToken(tokens, [/^at\p{L}*$/u]);
  const perceptionRequest = hasToken(tokens, [/^g(?:ö|o)rebil\p{L}*$/u]);
  if (colloquialInspection || perceptionRequest) return true;
  if (hasImperativeToken(tokens, ["görüntüle", "goruntule", "göster", "goster", "listele", "incele", "izle", "getir", "bak", "gör", "gor"])) return true;
  return hasToken(tokens, [
    /^göster(?:ir|iyor|iyor(?:sun|musun)|ebilir|ebilir(?:misin))$/u,
    /^goster(?:ir|iyor|iyor(?:sun|musun)|ebilir|ebilir(?:misin))$/u,
  ]);
}

function hasDeicticSurfaceGuidanceStructure(tokens) {
  const deicticSurface = hasToken(tokens, [
    /^buray[ıi]$/u,
    /^burada$/u,
    /^burasi$/u,
    /^buradaki$/u,
  ]);
  const guidanceCue = hasToken(tokens, [
    /^nasil$/u,
    /^nasıl$/u,
    /^kullan\p{L}*$/u,
    /^anlat\p{L}*$/u,
    /^acikla\p{L}*$/u,
    /^açıkla\p{L}*$/u,
  ]);
  return deicticSurface && guidanceCue;
}

function hasTemporalDemonstrativeModifier(tokens) {
  const temporalHead = /^(?:hafta|ay|gün|gun)\p{L}*$/u;
  const compactTemporalModifier = /^(?:bugün|bugunku|bugünkü|yarın|yarinki|yarınki|geçen|gecen)\p{L}*$/u;
  return tokens.some((token, index) => /^(?:bu|şu|su)$/u.test(token)
      && tokens.slice(index + 1, index + 4).some((candidate) => temporalHead.test(candidate)))
    || tokens.some((token) => compactTemporalModifier.test(token));
}

function hasExplicitSurfacePurposeStructure(tokens) {
  const surfaceAnchor = hasToken(tokens, [
    /^(?:ekran|sayfa|panel|menu|bölüm|bolum)\p{L}*$/u,
  ]);
  const purposeCue = hasToken(tokens, [/^ne$/u])
    && hasToken(tokens, [/^(?:işe|ise)$/u])
    && hasToken(tokens, [/^yar\p{L}*$/u]);
  return surfaceAnchor && purposeCue;
}

function normalizeStructuralSignal(value) {
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
    .replace(/\s+/gu, " ")
    .trim();
}

// These predicates describe reusable speech-act structures. They are shared
// with the canonical request owner below; none of them is a complete utterance
// or a case/phrase exception.
function hasStandaloneTeachRequest(value) {
  const text = normalizeStructuralSignal(value);
  const tokens = text.split(/\s+/u).filter(Boolean);
  const teach = tokens.some((token) => /^ogret\p{L}*$/u.test(token));
  const recipient = tokens.some((token) => /^(?:bana|bize|banas+da)$/u.test(token));
  const unrelatedRecord = tokens.some((token) => /^(?:kayit|kayd|vardiya|sefer|teklif|sozlesme|arac|surucu|personel)\p{L}*$/u.test(token));
  return teach && (recipient || tokens.length === 1) && !unrelatedRecord;
}

function hasDomainCollectionGuidanceRequest(value) {
  const text = normalizeStructuralSignal(value);
  const domain = /\b(?:binis|yoklama|checkin|kanit|konum)\p{L}*\b/iu.test(text);
  const collection = /\b(?:kayit|liste|veri|durum)\p{L}*\b/iu.test(text);
  const guidance = /\b(?:nasil|ne|goster|anlat|acikla|ogren|bak)\p{L}*\b/iu.test(text);
  return domain && collection && guidance;
}

function hasOfferCollectionCountRequest(value) {
  const text = normalizeStructuralSignal(value);
  // Match the count/status predicate as its own lexical unit.  A stem such
  // as `var\p{L}*` also matches `vardiya`, which can veto an unrelated role
  // responsibility question before canonical composition sees its aspect.
  return /\b(?:teklif|offer|rfq)\p{L}*\b/iu.test(text)
    && /\b(?:var|bulunuyor|bulunan|mevcut|gorunuyor|listeleniyor|listelenen|bekliyor|bekleyen)\b/iu.test(text);
}

function hasFinanceSummaryRequest(value) {
  const text = normalizeStructuralSignal(value);
  const finance = /\b(?:finans|mali|maliyet|butce|gider|gelir|fatura|hakedi|tahsilat|odeme)\p{L}*\b/iu.test(text);
  const summary = /\b(?:bilgi|ozet|durum|detay|ver|goster|anlat|ogren|incele|degerlendir)\p{L}*\b/iu.test(text);
  return finance && summary;
}

// A diagnostic collection request is a read-only product question even when
// it is phrased as an imperative (for example, a contextual smart chip).
// Keep this structural: an issue subject plus a diagnostic/listing predicate
// supplies the speech-act evidence without binding the composer to one chip
// label or a particular screen.
function hasIssueDiagnosticRequest(value) {
  const text = normalizeStructuralSignal(value);
  const issueSubject = /\b(?:sorun|problem|sikinti|aksak|aksayan|ariza|risk)\p{L}*\b/iu.test(text);
  const diagnosticPredicate = /\b(?:hangi|hangisi|neler|ne|var\s+mi|nerede|gor(?:unuyor|unuyor\s+mu)|sirala|listele|ayir|cikar)\p{L}*\b/iu.test(text);
  return issueSubject && diagnosticPredicate;
}

// Cardinality is a structural property of a product collection, not a
// complete utterance or a role-help phrase. Keep inflected Turkish entity and
// count forms together here so the evidence survives before broad orientation
// composition can take over.
function hasCardinalityCue(value) {
  const text = normalizeStructuralSignal(value);
  const entity = /\b(?:vardiya|sefer|teklif|sozlesme|anlasma|agreement|contract|kontrat|arac|surucu|sofor|personel|calisan|ogrenci|cocuk|veli|talep|basvuru)\p{L}*\b/iu.test(text);
  if (!entity) return false;
  const pluralEntity = /\b(?:vardiya|sefer|teklif|sozlesme|anlasma|agreement|contract|kontrat|arac|surucu|sofor|personel|calisan|ogrenci|cocuk|veli|talep|basvuru)(?:lar|ler)\p{L}*\b/iu.test(text);
  const countNoun = /\b(?:toplam(?:i|ini|in|un|u)?|say(?:i|ini|isini|isi|ilar|ilari)|aded(?:i|ini))\b/iu.test(text);
  const quantifiedSet = /\b(?:kac)\s+(?:\p{L}+\s+){0,2}\p{L}+\b/iu.test(text)
    && /\b(?:var|bulunuyor|bulunan|mevcut|gorunuyor|listeleniyor|listelenen|bekliyor|bekleyen)\p{L}*\b/iu.test(text);
  const typedCountVerb = /\b(?:say|listele|toplamla)\p{L}*\b/iu.test(text);
  const collectionPredicate = /\b(?:neler|hangileri|liste|listele|listesi|ozet|ozeti|envanter|bekleyen|bekliyor|inceleme)\p{L}*\b/iu.test(text);
  if (countNoun && /\btoplam(?:i|ini|in|un|u)\b/iu.test(text) && !pluralEntity) return false;
  return (countNoun && (pluralEntity || !/\btoplam(?:i|ini|in|un|u)\b/iu.test(text)))
    || quantifiedSet
    || typedCountVerb
    || (pluralEntity && collectionPredicate)
    || (/\b(?:var|bekliyor)\b/iu.test(text) && /\b(?:bekleyen|bekliyor|inceleme)\p{L}*\b/iu.test(text) && entity);
}

function hasTwoReferenceComparisonStructure(tokens, features) {
  if (features?.question?.isQuestion) return false;
  const numericReferences = new Set(tokens.filter((token) => /^\d+$/u.test(token)));
  return numericReferences.size >= 2
    && hasExactToken(tokens, ["ile"])
    && hasToken(tokens, [/^aras(?:ı|i)ndaki\p{L}*$/u])
    && hasToken(tokens, [/^(?:fark|değiş|degis|ayrım|ayrim)\p{L}*$/u]);
}

function hasProductComparativeQuestion(tokens, features) {
  return Boolean(features?.question?.isQuestion)
    && hasToken(tokens, [/^hangi\p{L}*$/u])
    && hasExactToken(tokens, ["daha"])
    && concreteObject(tokens) !== "NONE";
}

function normalizedRelationName(value) {
  return stringValue(value).toUpperCase().replace(/[^A-Z0-9]+/gu, "_");
}

function structuralRelations(features) {
  return Object.entries(features?.relations || {}).flatMap(([bucket, candidates]) => (
    Array.isArray(candidates)
      ? candidates.map((candidate) => ({
        names: new Set([
          normalizedRelationName(bucket),
          normalizedRelationName(candidate?.featureKind),
          normalizedRelationName(candidate?.value),
        ]),
        quality: candidate?.quality || "MEDIUM",
      }))
      : []
  ));
}

function hasStructuralRelation(relations, names) {
  const expected = new Set(names.map(normalizedRelationName));
  return relations.some((relation) => [...relation.names].some((name) => expected.has(name)));
}

function hasCorroboratedStructuralRelation(relations, names) {
  const expected = new Set(names.map(normalizedRelationName));
  const matches = relations.filter((relation) => [...relation.names].some((name) => expected.has(name)));
  return matches.some((relation) => relation.quality === "HIGH")
    || (matches.some((relation) => relation.quality === "MEDIUM")
      && hasStructuralRelation(relations, ["ASSIGNMENT_RELATION", "ASSIGNMENT"]));
}

function structuralAspectValue(features) {
  const relations = structuralRelations(features);
  const has = (...names) => hasStructuralRelation(relations, names);
  const hasHighQualityAssignment = relations.some((relation) => relation.quality === "HIGH"
    && [...relation.names].some((name) => new Set(["ASSIGNMENT_RELATION", "ASSIGNMENT"]).has(name)));
  const ordered = Boolean(features?.order?.length || features?.priority?.length);
  if (has("BOUNDARY_RELATION", "BOUNDARY")) return { value: "BOUNDARY", provenance: [PROVENANCE.structure] };
  if (has("LIMITATION_RELATION", "LIMITATION", "EXCLUSION_RELATION", "EXCLUSION")) return { value: "LIMITATION", provenance: [PROVENANCE.structure] };
  if (has("STARTING_GUIDANCE_RELATION", "STARTINGGUIDANCE_RELATION", "STARTING_GUIDANCE")) return { value: "STARTING_GUIDANCE", provenance: [PROVENANCE.structure] };
  if (has("ORIENTATION_RELATION", "ORIENTATION", "PURPOSE_RELATION", "PURPOSE")) return { value: "ORIENTATION", provenance: [PROVENANCE.structure] };
  if (has("DECISION_RELATION", "DECISION")) return { value: "DECISION_RESPONSIBILITY", provenance: [PROVENANCE.structure] };
  if (hasHighQualityAssignment) return { value: "RESPONSIBILITY", provenance: [PROVENANCE.structure] };
  if (hasCorroboratedStructuralRelation(relations, ["OWNERSHIP_RELATION", "OWNERSHIP"])) return ordered
    ? { value: "DECISION_RESPONSIBILITY", provenance: [PROVENANCE.structure] }
    : { value: "OWNERSHIP", provenance: [PROVENANCE.structure] };
  if (has("INCLUSION_RELATION", "INCLUSION")) return { value: "CAPABILITY", provenance: [PROVENANCE.structure] };
  if (has("PROCESS_RELATION", "PROCESS", "VERB_NOUN_RELATION", "VERB_NOUN")) return { value: "PROCESS_RESPONSIBILITY", provenance: [PROVENANCE.structure] };
  if (has("ACTOR_OBJECT_RELATION", "ACTOR_OBJECT", "ASSIGNMENT_RELATION", "ASSIGNMENT")) return { value: "RESPONSIBILITY", provenance: [PROVENANCE.structure] };
  return { value: "NONE", provenance: [] };
}

function item(value, quality, provenance, contextRef) {
  return { value, quality, provenance: [...new Set(provenance)], ...(contextRef ? { contextRef } : {}) };
}

function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function contextRef(provenance, context) {
  if (provenance === PROVENANCE.auth) return `auth:role:${stringValue(context?.role).toUpperCase() || "UNKNOWN"}`;
  if (provenance === PROVENANCE.surface) return `surface:${stringValue(context?.currentSurface?.path || "unknown")}`;
  if (provenance === PROVENANCE.task) return "task:active";
  if (provenance === PROVENANCE.reference) return "reference:current-turn";
  return null;
}

function concreteObject(tokens) {
  if (hasToken(tokens, [/vardiya/u, /sefer/u, /shift/u, /servis/u])) return "SHIFT";
  if (hasToken(tokens, [/sözleş/u, /sozles/u, /anlaş/u, /anlas/u, /contract/u, /kontrat/u])) return "AGREEMENT";
  if (hasToken(tokens, [/teklif/u, /offer/u, /rfq/u])) return "OFFER";
  if (hasToken(tokens, [/rota/u, /güzerg/u, /guzerg/u, /durak/u])) return "ROUTE";
  if (hasToken(tokens, [/maaş/u, /maas/u, /ücret/u, /ucret/u, /fatura/u, /hakedi/u, /maliyet/u, /bütçe/u, /butce/u, /ödeme/u, /odeme/u, /fiyat/u, /finans/u, /mali/u])) return "FINANCIAL";
  if (hasDomainCollectionGuidanceRequest(tokens.join(" "))) return "SURFACE";
  if (hasToken(tokens, [/kay(?:ı|i)?(?:t|d)\p{L}*/u, /liste/u])) return "RECORD";
  if (hasToken(tokens, [/ekran/u, /panel/u, /surface/u])) return "SURFACE";
  if (hasToken(tokens, [/araç/u, /arac/u, /taşıt/u, /tasit/u, /kapasite/u, /kontenjan/u])) return "ENTITY";
  return "NONE";
}

const LIVE_SURFACE_TARGET_STOP_WORDS = new Set([
  "ac", "aç", "goster", "göster", "kullan", "nereden", "nasil", "nasıl", "hangi",
  "buton", "ekran", "sayfa", "menu", "menü", "olan", "olanı", "olanin", "olanın",
  "icin", "için", "bana", "bir", "bu", "su", "şu",
]);

function normalizedTargetTerms(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/\s+/u)
    .map((term) => term.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter((term) => term.length >= 4 && !LIVE_SURFACE_TARGET_STOP_WORDS.has(term));
}

function liveSurfaceNavigationTarget(features, screenContext) {
  const candidates = [
    ...(Array.isArray(screenContext?.uiHints?.visibleButtons) ? screenContext.uiHints.visibleButtons : []),
    ...(Array.isArray(screenContext?.uiHints?.allowedActions) ? screenContext.uiHints.allowedActions : []),
    ...(Array.isArray(screenContext?.uiHints?.visibleMenus) ? screenContext.uiHints.visibleMenus : []),
  ].filter((candidate) => candidate && candidate.disabled !== true);
  if (!candidates.length) return null;
  const textTerms = normalizedTargetTerms(features?.normalizedText);
  if (!textTerms.length) return null;
  // Showing or inspecting a grounded target is a VIEW/GUIDED_SHOW request;
  // only explicit movement/opening predicates may upgrade the live-target
  // match to NAVIGATE.  Keep target discovery independent from action mode.
  const navigationCue = hasImperativeToken(surfaceTokens(features), [
    "aç", "ac", "git", "geç", "gec", "gir", "ulaş", "ulas", "yönel", "yonel", "bul",
  ]) || hasTurkishDirectionalNavigationPredicate(textTerms);
  if (!navigationCue) return null;
  return candidates.find((candidate) => {
    const targetTerms = normalizedTargetTerms(candidate.label || candidate.title || candidate.name);
    return targetTerms.some((targetTerm) => textTerms.some((textTerm) => textTerm.startsWith(targetTerm) || targetTerm.startsWith(textTerm)));
  }) || null;
}

function supportedEvidence(features, field) {
  return (Array.isArray(features?.[field]) ? features[field] : [])
    .filter((entry) => entry && entry.supportOrContradiction !== "CONTRADICTION")
    .filter((entry) => typeof entry.value === "string" && entry.value.trim().length > 0);
}

function typedObjectValue(features) {
  const entry = supportedEvidence(features, "objectEvidence")
    .find((candidate) => candidate.kind === "CONCRETE_OBJECT" || candidate.featureKind === "CONCRETE_OBJECT");
  const value = stringValue(entry?.value).toUpperCase();
  return CONCRETE_OBJECT_VALUES.has(value) ? value : "NONE";
}

function typedReferenceValue(features) {
  const entry = supportedEvidence(features, "referenceEvidence")
    .find((candidate) => ["UNIQUE", "AMBIGUOUS", "STALE", "ABSENT"].includes(String(candidate.value).toUpperCase()));
  return entry ? String(entry.value).toUpperCase() : null;
}

function hasGeneralCreativeOutputStructure(tokens) {
  const topicIndex = tokens.findIndex((token) => GENERAL_CREATIVE_OUTPUT_TOPIC.test(stringValue(token)));
  if (topicIndex < 0) return false;
  return tokens.slice(topicIndex + 1, topicIndex + 8)
    .some((token) => GENERAL_CREATIVE_OUTPUT_VERB.test(stringValue(token)));
}

function reusableDomainEvidence(features, tokens) {
  const typed = supportedEvidence(features, "domainEvidence")
    .filter((candidate) => ["CONCRETE_DOMAIN", "EXTERNAL_DOMAIN"].includes(candidate.kind || candidate.featureKind))
    .map((candidate) => ({ ...candidate, kind: candidate.kind || candidate.featureKind }));
  const inferred = hasToken(tokens, [/tarih/u, /saat/u, /zaman/u]) && (features?.temporal?.length || features?.question?.isQuestion)
    ? [{ kind: "CONCRETE_DOMAIN", value: "DATE_TIME_LIMIT" }]
    : [];
  return [...typed, ...inferred].map((entry) => ({
    kind: entry.kind,
    value: stringValue(entry.value).toUpperCase(),
    provenance: entry.provenance || [PROVENANCE.structure],
    quality: entry.quality || "HIGH",
  }));
}

function hasContinuationVerb(tokens) {
  return hasToken(tokens, [
    /^anlat\p{L}*$/u,
    /^g[oö]ster\p{L}*$/u,
    /^a[cç][ıi]kla\p{L}*$/u,
    /^ge[cç]\p{L}*$/u,
    /^et\p{L}*$/u,
    /^edel\p{L}*$/u,
    /^s[uü]rd[uü]r\p{L}*$/u,
  ]);
}

function hasContinuationForm(tokens, features) {
  const surfaceTokens = Array.isArray(features?.tokens)
    ? features.tokens.map((token) => stringValue(token?.normalized).toLocaleLowerCase("tr-TR")).filter(Boolean)
    : tokens;
  const existingContinuationVerb = hasImperativeToken(tokens, ["sürdür", "surdur"]);
  const bareContinuation = surfaceTokens.some((token, index) => {
    if (token !== "devam") return false;
    // The deterministic feature stream keeps punctuation as tokens.  A
    // terminal question mark must not turn the bare discourse continuation
    // "hadi devam?" into a non-continuation request.
    const next = surfaceTokens.slice(index + 1).find((candidate) => !/^[?!.,;:]+$/u.test(candidate));
    return !next || /^(?:et|edel\p{L}*|s[uü]rd[uü]r\p{L}*)$/u.test(next);
  });
  const inflectedContinuation = surfaceTokens.some((token) => /^devam(?:ı|i|u|ü)(?:n(?:ı|i|u|ü|a|e|dan|den)|ya|ye|dan|den)?$/u.test(token));
  const progressionText = surfaceTokens.join(" ");
  const guidedProgression = /\b(?:bir\s+)?sonraki\s+ad[ıi]m\p{L}*\s+ge[cç]\p{L}*\b/iu.test(progressionText)
    || /\b(?:kald[ıi]ğımız|kaldigimiz)\b.*\byerden\b.*\b(?:ilerle|devam|sürd[üu]r)\p{L}*\b/iu.test(progressionText)
    || /\b(?:bu|aynı|ayni)\s+akış\p{L}*\s+sürd[üu]r\p{L}*\b/iu.test(progressionText);
  // The canonical continuation contract also includes expansion requests.
  // Their grammatical question form must not downgrade the typed mode to
  // EXPLAIN while the semantic action remains CONTINUE.
  const expansionContinuation = /\b(?:daha\s+fazla|biraz\s+daha|ad[ıi]m\s+ad[ıi]m)\s+(?:anlat|a[cç][ıi]kla)\p{L}*\b/iu.test(progressionText);
  const objectContinuation = /\bdevam(?:ı|i|u|ü)n(?:ı|i|u|ü)?\s+(?:anlat|a[cç][ıi]kla)\p{L}*\b/iu.test(progressionText);
  return existingContinuationVerb
    || bareContinuation
    || (inflectedContinuation && hasContinuationVerb(surfaceTokens))
    || guidedProgression
    || expansionContinuation
    || objectContinuation;
}

function hasGuidanceRecoveryForm(tokens) {
  return hasToken(tokens, [
    /^bulam\p{L}*$/u,
    /^g[oö]rem\p{L}*$/u,
    /^yapam\p{L}*$/u,
    /^acilam\p{L}*$/u,
    /^a[cç][ıi]lam\p{L}*$/u,
    /^baslatam\p{L}*$/u,
    /^ba[sş]latam\p{L}*$/u,
    /^tak[iı]lam\p{L}*$/u,
  ]) || hasToken(tokens, [
    /^(?:dedi[gğ]in|soyledi[gğ]in|s[oö]yledi[gğ]in)$/u,
  ]) && hasToken(tokens, [/^yer$/u, /^yok$/u]);
}

function hasContinuationInputEvidence(tokens, features) {
  const surface = surfaceTokens(features);
  return hasContinuationForm(tokens, features)
    || hasGuidanceRecoveryForm(tokens)
    || hasToken(surface, [/^geri$/u, /^geriye$/u, /^geriden$/u]);
}

function hasCurrentSurfaceGuidanceRequest(tokens, features) {
  // Use the surface token stream for phrase composition. normalizedTokens()
  // intentionally includes lemma candidates, which duplicates each word and
  // breaks adjacency-sensitive guidance structures such as "nerelere bakmam
  // gerek". Lemma candidates remain appropriate for token predicates below,
  // but this structural family must preserve the original word order.
  const text = surfaceTokens(features).join(" ");
  return /\b(?:nerelere|nelere|neye)\s+bak(?:mam|mal[ıi]y[ıi]m|ay[ıi]m)?\s+(?:gerek|gerekiyor|laz[ıi]m)\b/iu.test(text)
    || /\b(?:bana\s+)?yard[iı]m\s+et\b/iu.test(text)
    || /\b(?:program|uygulama|platform|sistem)\p{L}*\s+kullanmay[ıi]\s+bana\s+(?:öğret|ogret)\p{L}*\b/iu.test(text)
    || /\b(?:burada|burda)\s+(?:ne\s+yapabilirim|nereden\s+baslamal[ıi]y[ıi]m)\b/iu.test(text)
    || /\b(?:burada|burda)\s+(?:sorun|problem|aksakl[ıi]k)\s+var\s+m[ıi]\b/iu.test(text)
    || /\b(?:ne\s+yapmam\s+gerekiyor|bana\s+ad[ıi]m\s+ad[ıi]m\s+goster)\b/iu.test(text)
    || hasStandaloneTeachRequest(text);
}

// A live guided step is a current product target even when the user asks in
// first-person future form ("bu adımda ne yapacağım?"). Keep this structural
// workflow relation in the typed evidence layer so an active task cannot be
// rejected as an internally unresolved generic question.
function hasCurrentWorkflowStepGuidanceRequest(features) {
  const text = surfaceTokens(features).join(" ");
  return /\b(?:bu|şu|su|mevcut)\s+ad[ıi]m(?:da|de|ın|in)?\b.{0,28}\b(?:ne|nas[ıi]l|hangi|neden|amaç|amac|yap)\p{L}*\b/iu.test(text)
    || /\b(?:burası|burasi|burda|burada)\s+(?:ne|napiyoruz|ne\s+yap|nap)\p{L}*\b/iu.test(text)
    || /\b(?:şu\s+an|su\s+an)\s+neredeyim\b/iu.test(text)
    || /\b(?:şu\s+an|su\s+an|şimdi|simdi)\b.{0,28}\b(?:hangi|kaçıncı|kacinci|ne\s+yap|nap)\p{L}*\b/iu.test(text);
}

function requestMode(tokens, features, hasActiveTask, hasCurrentSurface = false, hasLiveWorkflowStep = false) {
  const surface = surfaceTokens(features);
  // BACK is a continuation relation over the active guided task. It is not
  // itself a workflow verb, so the generic continuation-form detector does
  // not see the bare discourse marker "Geri.". Preserve the same typed
  // CONTINUE axis used by Devam/Recovery and let continuationActionFor()
  // select the BACK transition later.
  const backCue = hasToken(surface, [/^geri$/u, /^geriye$/u, /^geriden$/u]);
  if (hasActiveTask && (hasContinuationForm(tokens, features) || hasGuidanceRecoveryForm(tokens) || backCue)) return { value: "CONTINUE", provenance: [PROVENANCE.raw, PROVENANCE.task, PROVENANCE.morphology] };
  const createStems = ["oluştur", "olustur", "başlat", "baslat", "yarat", "kur", "planla"];
  const compareStems = ["karşılaştır", "karsilastir", "kıyasla", "kiyasla"];
  const sendStems = ["gönder", "gonder", "ilet"];
  const updateStems = ["değiştir", "degistir", "yenile", "güncelle", "guncelle", "tamamla"];
  const viewStems = ["göster", "goster", "listele", "incele", "izle", "getir", "bak", "gör", "gor", "görüntüle", "goruntule"];
  const actionStems = [...new Set([...createStems, ...compareStems, ...sendStems, ...updateStems, ...viewStems, "aç", "ac", "geç", "gec", "git", "öğren", "ogren"])];
  if (hasNegatedDesiderativeAction(features, actionStems)) return { value: null, provenance: [PROVENANCE.raw, PROVENANCE.morphology] };
  if (hasImperativeToken(surface, createStems)
    || hasPoliteAoristActionRequest(features, createStems)
    || hasDesiderativeActionRequest(features, createStems)) return { value: "CREATE", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  if (hasImperativeToken(surface, compareStems)
    || hasPoliteAoristActionRequest(features, compareStems)
    || hasDesiderativeActionRequest(features, compareStems)) return { value: "COMPARE", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  if (hasTwoReferenceComparisonStructure(tokens, features)) return { value: "COMPARE", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if (hasProductComparativeQuestion(tokens, features)) return { value: "COMPARE", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if (hasImperativeToken(surface, sendStems)
    || hasPoliteAoristActionRequest(features, sendStems)
    || hasDesiderativeActionRequest(features, sendStems)) return { value: "SEND", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  if ((hasImperativeToken(surface, updateStems)
    || hasPoliteAoristActionRequest(features, updateStems)
    || hasDesiderativeActionRequest(features, updateStems))
    && concreteObject(tokens) !== "NONE") return { value: "UPDATE", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  const workflowNavigation = concreteObject(tokens) === "SHIFT"
    && hasToken(tokens, [/^olustur\p{L}*$/u, /^oluştur\p{L}*$/u])
    && hasImperativeToken(surface, ["göt", "got", "götür", "gotur", "git", "geç", "gec", "aç", "ac"]);
  if (workflowNavigation) return { value: "CREATE", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  if (!features?.question?.isQuestion && (
    hasImperativeToken(surface, ["denetle"])
    || (hasExactToken(tokens, ["kontrol"]) && hasExactToken(tokens, ["et"]))
  )) return { value: "OTHER_PRODUCT_REQUEST", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  const directOpen = hasImperativeToken(surface, ["aç", "ac"]);
  if (directOpen) {
    const directObject = concreteObject(tokens);
    const ambiguousDeictic = hasExactToken(tokens, ["bunu", "şunu", "sunu", "onu"]);
    if (ambiguousDeictic && directObject === "NONE") return { value: "EXPLAIN", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
    if (directObject !== "NONE" && directObject !== "SURFACE") return { value: "VIEW", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
    return { value: "NAVIGATE", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  }
  if (hasSurfaceDiscoveryStructure(tokens)) return { value: "NAVIGATE", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if (hasTurkishDirectionalNavigationPredicate(tokens)) return { value: "NAVIGATE", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if (hasCurrentSurface && (hasDomainCollectionGuidanceRequest(surface.join(" ")) || hasOfferCollectionCountRequest(surface.join(" ")) || hasFinanceSummaryRequest(surface.join(" ")))) return { value: "EXPLAIN", provenance: [PROVENANCE.raw, PROVENANCE.surface, PROVENANCE.structure] };
  if (hasCurrentSurface && (hasActiveTask || hasLiveWorkflowStep) && hasCurrentWorkflowStepGuidanceRequest(features)) return { value: "EXPLAIN", provenance: [PROVENANCE.raw, PROVENANCE.surface, PROVENANCE.task, PROVENANCE.structure] };
  if (hasCurrentSurface && hasCurrentSurfaceGuidanceRequest(tokens, features)) return { value: "EXPLAIN", provenance: [PROVENANCE.raw, PROVENANCE.surface, PROVENANCE.structure] };
  if (hasIssueDiagnosticRequest(surface.join(" "))) return { value: "EXPLAIN", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if (features?.question?.isQuestion && hasToken(tokens, [/hangi/u, /nasıl/u, /nasil/u, /ne/u, /nereden/u])) return { value: "EXPLAIN", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if (hasSurfaceViewPredicate(tokens)
    || hasPoliteAoristActionRequest(features, viewStems)
    || hasDesiderativeActionRequest(features, viewStems)) return { value: "VIEW", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  if (features?.question?.isQuestion || hasToken(tokens, [/açıkla/u, /acikla/u, /anlat/u, /öğren/u, /ogren/u, /kavra/u, /anla/u, /bil/u, /hangi/u, /nasıl/u, /nasil/u])) return { value: "EXPLAIN", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  return { value: null, provenance: [] };
}

function relationValue(tokens, features) {
  const explicitOwnership = hasToken(tokens, [/sahip/u, /ait$/u, /üstlen/u, /ustlen/u]);
  const ownership = explicitOwnership;
  const process = Boolean(features?.relations?.process?.length) || hasToken(tokens, [/yürüt/u, /yurut/u, /başla/u, /basla/u, /takip/u, /işle/u, /isle/u, /adım/u, /adim/u]);
  const actorObject = Boolean(features?.relations?.actorObject?.length) || hasToken(tokens, [/görev/u, /gorev/u, /sorum/u, /takip/u]);
  if (ownership) return { value: "OWNERSHIP", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  if (process) return { value: "PROCESS", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  if (actorObject) return { value: "ACTOR_OBJECT", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if ((features?.relations?.ownership || []).some((candidate) => candidate?.quality === "HIGH")) return { value: "OWNERSHIP", provenance: [PROVENANCE.morphology, PROVENANCE.structure] };
  if (features?.polarity?.negation?.length) return { value: "NEGATION", provenance: [PROVENANCE.morphology] };
  return { value: "NONE", provenance: [] };
}

function aspectValue(tokens, features, relation, order, polarity) {
  const structuralAspect = structuralAspectValue(features);
  const modality = Boolean(features?.polarity?.modality?.length) || hasToken(tokens, [/malı/u, /meli/u]);
  if (polarity === "NEGATIVE" && !hasToken(tokens, [/kapsam/u, /sınır/u, /sinir/u, /bit/u])) return { value: "LIMITATION", provenance: [PROVENANCE.morphology, PROVENANCE.structure] };
  if (hasToken(tokens, [/sınır/u, /sinir/u, /bit/u, /kapsam/u, /yetki/u])) return { value: "BOUNDARY", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if (hasToken(tokens, [/yapab[ıi]l/u, /yetki/u, /eriş/u, /eris/u, /kullanab[ıi]l/u])) return { value: "CAPABILITY", provenance: [PROVENANCE.raw, PROVENANCE.morphology] };
  // A weak orientation relation can be emitted for broad first-person
  // predicates such as "ederim". Explicit process evidence such as
  // "takip ederim" is stronger and must retain responsibility/process
  // semantics instead of being projected as orientation help.
  // Keep role nouns such as "yönetici" from masquerading as the
  // orientation verb stem "yön".  Orientation is explicit only when the
  // token itself expresses learning/understanding/direction.
  const explicitOrientationCue = hasToken(tokens, [
    /^öğren\p{L}*$/u,
    /^ogren\p{L}*$/u,
    /^anla\p{L}*$/u,
    /^kavra\p{L}*$/u,
    /^yön(?:el|lendir)\p{L}*$/u,
    /^yon(?:el|lendir)\p{L}*$/u,
  ]);
  if (relation.value === "OWNERSHIP" && order.value !== "NONE") {
    return { value: "DECISION_RESPONSIBILITY", provenance: [...relation.provenance, ...order.provenance, PROVENANCE.inference] };
  }
  if (relation.value === "OWNERSHIP" && ["ORIENTATION", "PROCESS_RESPONSIBILITY"].includes(structuralAspect.value)) {
    return { value: "OWNERSHIP", provenance: relation.provenance };
  }
  const explicitResponsibilityCue = hasToken(tokens, [/^görev\p{L}*$/u, /^gorev\p{L}*$/u, /^sorum\p{L}*$/u, /^takip\p{L}*$/u]);
  if (!explicitOrientationCue && (relation.value === "ACTOR_OBJECT" || explicitResponsibilityCue)) {
    return { value: "RESPONSIBILITY", provenance: [...relation.provenance, PROVENANCE.inference] };
  }
  const weakOrientationOverriddenByStrongerRelation = structuralAspect.value === "ORIENTATION"
    && (["PROCESS", "OWNERSHIP", "ACTOR_OBJECT"].includes(relation.value) || explicitResponsibilityCue)
    && !explicitOrientationCue;
  if (structuralAspect.value !== "NONE" && !weakOrientationOverriddenByStrongerRelation) return structuralAspect;
  if (relation.value === "OWNERSHIP" && order.value !== "NONE") return { value: "DECISION_RESPONSIBILITY", provenance: [...relation.provenance, ...order.provenance, PROVENANCE.inference] };
  if (relation.value === "OWNERSHIP") return { value: "OWNERSHIP", provenance: relation.provenance };
  const hasStructuralStartingPoint = Boolean(features?.relations?.startingGuidance?.length)
    || hasToken(tokens, [/ilk/u, /nereden/u]);
  if (hasStructuralStartingPoint
    && hasToken(tokens, [/başla/u, /basla/u, /ilk/u, /nereden/u])
    && !hasToken(tokens, [/öğren/u, /ogren/u, /anla/u, /kavra/u])) return { value: "STARTING_GUIDANCE", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.morphology] };
  if (hasToken(tokens, [/öğren/u, /ogren/u, /anla/u, /kavra/u])) return { value: "ORIENTATION", provenance: [PROVENANCE.raw, PROVENANCE.structure] };
  if (relation.value === "PROCESS" && modality) return { value: "PROCESS_RESPONSIBILITY", provenance: [...relation.provenance, PROVENANCE.morphology] };
  if (relation.value === "ACTOR_OBJECT" || hasToken(tokens, [/görev/u, /gorev/u, /sorum/u, /takip/u])) return { value: "RESPONSIBILITY", provenance: [...relation.provenance, PROVENANCE.raw] };
  return { value: "NONE", provenance: [] };
}

function referentMatchesAuthorizedScope(candidate, context) {
  if (!candidate || typeof candidate !== "object") return false;
  if (candidate.authorized === false
    || candidate.sourceTrusted === false
    || candidate.scopeMismatch === true
    || candidate.tenantMismatch === true) return false;
  const tenantScope = context?.tenantScope || context?.authScope || {};
  const candidateRoomId = Number(candidate.roomId || candidate.room?.id || 0);
  const currentRoomId = Number(tenantScope.roomId || 0);
  if (candidateRoomId > 0 && currentRoomId > 0 && candidateRoomId !== currentRoomId) return false;
  const candidateCompanyId = Number(candidate.companyId || candidate.company?.id || 0);
  const currentCompanyId = Number(tenantScope.companyId || 0);
  if (candidateCompanyId > 0 && currentCompanyId > 0 && candidateCompanyId !== currentCompanyId) return false;
  const authorizationStatus = String(candidate.authorizationStatus || candidate.scopeStatus || "").toUpperCase();
  if (["DENIED", "UNAUTHORIZED", "REJECTED", "TENANT_SCOPE_DENIED"].includes(authorizationStatus)) return false;
  return true;
}

function validatedReferent(context, conversationState) {
  const historicalSuppressed = context?.referenceState?.historicalSuppressed === true
    || context?.freshness?.selectionHistoricalSuppressed === true;
  const candidates = [
    [context?.referenceState?.uniqueReferent, PROVENANCE.reference],
    [context?.referenceState?.selectedEntity, PROVENANCE.surface],
    ...(!historicalSuppressed ? [
      [conversationState?.referenceState?.uniqueReferent, PROVENANCE.reference],
      [conversationState?.uniqueDiscourseReferent, PROVENANCE.reference],
    ] : []),
  ];
  for (const [candidate, provenance] of candidates) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    if (!referentMatchesAuthorizedScope(candidate, context)) continue;
    if (candidate.validated === false || candidate.freshness === "STALE" || candidate.stale === true) continue;
    const type = stringValue(candidate.type || candidate.entityType).toUpperCase();
    const id = Number(candidate.id || candidate.entityId);
    if (!type || !Number.isInteger(id) || id <= 0) continue;
    return { type, id, provenance };
  }
  return null;
}

function composeSemanticEvidence({ features = {}, context = {}, conversationState = {}, screenContext = {} } = {}) {
  const tokens = normalizedTokens(features);
  const stateActiveTask = conversationState?.activeGuidedTask || conversationState?.activeTask || null;
  const hasCanonicalContinuity = Boolean(context?.continuity && typeof context.continuity === "object");
  const continuationInputEvidence = hasContinuationInputEvidence(tokens, features);
  // A prior canonical response can provide a valid server-owned conversation
  // context without materializing an active guided task.  Continuation
  // wording must still align its typed request mode with the CONTINUE action
  // in that case; without server-owned state, do not promote a standalone
  // discourse marker.
  const serverOwnedConversationContext = Boolean(
    conversationState
      && typeof conversationState === "object"
      && (
        conversationState.guidedTarget
        || conversationState.lastScreenPath
        || conversationState.lastScreenLabel
        || conversationState.selectedLabel
      ),
  );
  const activeTaskContinuationFallback = Boolean(
    context?.continuity?.task?.status === "ACTIVE"
      && context?.continuity?.precedence !== "EXPLICIT_INPUT"
      && continuationInputEvidence,
  );
  const continuationIsValid = hasCanonicalContinuity
    ? (String(context.continuity?.continuation?.status || "").toUpperCase() === "VALID"
      && String(context.continuity?.precedence || "").toUpperCase() !== "EXPLICIT_INPUT")
      || activeTaskContinuationFallback
    : Boolean(stateActiveTask || context?.activeTask);
  // A current screen is server-owned context, but it is not by itself an
  // active task. Expansion wording such as "adım adım anlat" must start a
  // new analytical request on a fresh surface; CONTINUE remains available
  // when a settled/active server-owned task is actually present.
  const serverOwnedTaskContext = Boolean(
    stateActiveTask
      || conversationState?.lastSettledResult
      || conversationState?.productContext?.semanticPlan
      || conversationState?.lastSemanticPlan,
  );
  const continuationModeEligible = continuationIsValid
    || (serverOwnedConversationContext && serverOwnedTaskContext && continuationInputEvidence);
  const matchedLiveSurfaceTarget = liveSurfaceNavigationTarget(features, screenContext);
  const validCurrentSurface = Boolean(context?.currentSurface?.path || context?.currentSurface?.label || screenContext?.path || screenContext?.label);
  const mode = matchedLiveSurfaceTarget
    ? { value: "NAVIGATE", provenance: [PROVENANCE.raw, PROVENANCE.structure, PROVENANCE.surface] }
    : requestMode(
      tokens,
      features,
      continuationModeEligible,
      validCurrentSurface,
      Boolean(screenContext?.uiHints?.workflowState?.workflowId),
    );
  const contextualReferent = validatedReferent(context, conversationState);
  const lexicalObjectValue = concreteObject(tokens);
  const typedObject = typedObjectValue(features);
  const structuralSurfaceHelp = hasStandaloneTeachRequest(surfaceTokens(features).join(" "))
    || hasDomainCollectionGuidanceRequest(surfaceTokens(features).join(" "));
  const explicitCurrentSurfaceEvidence = validCurrentSurface
    && (hasDeicticSurfaceGuidanceStructure(tokens) || hasExplicitSurfacePurposeStructure(tokens) || structuralSurfaceHelp);
  // A server-owned selection is grounding context, not a user-specified
  // record target. Keep that distinction available to the role-help veto
  // below: otherwise a broad platform/role responsibility question is
  // promoted to the selected entity merely because the current screen has a
  // selection.
  const contextualSelectionOnly = lexicalObjectValue === "NONE"
    && typedObject === "NONE"
    && !explicitCurrentSurfaceEvidence
    && Boolean(contextualReferent);
  // A deictic amount question on the authorized financial surface is a
  // financial reference even when the utterance does not repeat the field
  // label used by the card.  Keep the referent unresolved until a current
  // target or prior server-owned amount context makes it unique; generic role
  // help must not erase this evidence.
  const financialDeicticText = String(features?.normalizedText || "");
  const financialDeicticReference = /\/financial-operations\b/iu.test(String(screenContext?.path || context?.currentSurface?.path || ""))
    && /^(?:bu|bunun|şu|şunun)\b/iu.test(financialDeicticText)
    && /\b(?:tutar|değer|deger|sonuç|sonuc)/iu.test(financialDeicticText)
    && /\b(?:kaynak|kaynağ|hesap|belirlen|hesaplan|neden|açıkla|acikla|anlat)/iu.test(financialDeicticText);
  const objectValue = matchedLiveSurfaceTarget
    ? "SURFACE"
    : typedObject !== "NONE"
      ? typedObject
    : explicitCurrentSurfaceEvidence
    ? "SURFACE"
    : financialDeicticReference
    ? "FINANCIAL"
    : lexicalObjectValue === "NONE" && contextualReferent
    ? (ROLE_ASPECTS.includes(contextualReferent.type) ? "ENTITY" : contextualReferent.type)
    : lexicalObjectValue;
  const domainEvidence = reusableDomainEvidence(features, tokens);
  const cardinalityEvidence = hasCardinalityCue(surfaceTokens(features).join(" "));
  const externalDomainEvidence = domainEvidence.filter((entry) => entry.kind === "EXTERNAL_DOMAIN");
  const arithmeticDomainEvidence = externalDomainEvidence.filter((entry) => entry.value === "ARITHMETIC");
  const nonArithmeticExternalDomainEvidence = externalDomainEvidence.filter((entry) => entry.value !== "ARITHMETIC");
  const concreteDomainEvidence = domainEvidence.filter((entry) => entry.kind === "CONCRETE_DOMAIN");
  const relation = relationValue(tokens, features);
  const orderValue = features?.order?.length ? (hasToken(tokens, [/ilk/u]) ? "FIRST" : hasToken(tokens, [/sonra/u, /ardından/u, /ardindan/u]) ? "NEXT" : "SEQUENCE") : "NONE";
  const order = { value: orderValue, provenance: orderValue === "NONE" ? [] : [PROVENANCE.raw, PROVENANCE.structure] };
  const polarityValue = features?.polarity?.negation?.length || hasToken(tokens, [/mamalı/u, /memeli/u]) ? "NEGATIVE" : hasToken(tokens, [/sınırlı/u, /sinirli/u]) ? "LIMITATION" : "AFFIRMATIVE";
  const polarity = { value: polarityValue, provenance: polarityValue === "AFFIRMATIVE" ? [] : [PROVENANCE.morphology, PROVENANCE.raw] };
  const aspect = aspectValue(tokens, features, relation, order, polarityValue);
  const explicitProductArithmeticAnchor = typedObject !== "NONE"
    || lexicalObjectValue !== "NONE"
    || Boolean(contextualReferent);
  const generalCreativeOutput = hasGeneralCreativeOutputStructure(tokens)
    && lexicalObjectValue === "NONE"
    && !contextualReferent;
  const positiveUnrelatedDomain = nonArithmeticExternalDomainEvidence.length > 0
    || (arithmeticDomainEvidence.length > 0 && !explicitProductArithmeticAnchor)
    || generalCreativeOutput;
  const composedMode = positiveUnrelatedDomain
    ? { value: "GENUINE_OOS", provenance: [PROVENANCE.structure] }
    : mode.value
    ? mode
    : aspect.value !== "NONE"
      ? { value: "EXPLAIN", provenance: [...aspect.provenance, PROVENANCE.inference] }
      : mode;
  const role = stringValue(context?.role).toUpperCase();
  const productContext = Boolean(
    context?.evidence?.product
      || context?.currentDomain
      || context?.currentSurface?.path
      || screenContext?.path
      || hasToken(tokens, [/sistem/u, /uygulama/u, /ekran/u, /panel/u, /bölüm/u, /bolum/u]),
  );
  const roleScopedDeictic = tokens.some((token, index) => /^bu$/u.test(token) && /^rol\p{L}*$/u.test(tokens[index + 1] || ""));
  const temporalDemonstrativeModifier = hasTemporalDemonstrativeModifier(tokens);
  const selectedObjectReference = objectValue !== "NONE" && hasToken(tokens, [/^seçili\p{L}*$/u, /^secili\p{L}*$/u, /^seçilen\p{L}*$/u, /^secilen\p{L}*$/u]);
  const explicitReference = hasToken(tokens, [/^şu$/u, /^su$/u, /^onu$/u, /^bunu$/u, /^şunu$/u, /^sunu$/u])
    // Do not let a contextual selected-record object manufacture a deictic
    // record reference. In "bu platformda ..." the demonstrative belongs to
    // the product surface; it is not an instruction to explain the selected
    // shift. An explicit lexical/typed entity still retains the record lane.
    || ((lexicalObjectValue !== "NONE" || typedObject !== "NONE")
      && hasToken(tokens, [/^bu$/u])
      && !roleScopedDeictic
      && !temporalDemonstrativeModifier)
    || selectedObjectReference;
  const contextualReference = Boolean(contextualReferent) && (explicitReference || objectValue === "ENTITY");
  const explicitTypedReference = typedReferenceValue(features);
  const referenceValue = explicitTypedReference
    || (contextualReference
      ? "UNIQUE"
      : explicitReference
        ? "UNRESOLVED"
        : financialDeicticReference
          ? (contextualReferent ? "UNIQUE" : "AMBIGUOUS")
        : "ABSENT");
  const referenceProvenance = referenceValue === "ABSENT"
    ? []
    : [
      ...(explicitTypedReference ? [PROVENANCE.structure] : []),
      ...(explicitReference ? [PROVENANCE.raw] : []),
      ...(contextualReferent ? [contextualReferent.provenance] : []),
    ];
  const referenceContextRef = contextualReferent
    ? `reference:unique:${contextualReferent.type}:${contextualReferent.id}`
    : null;
  const reference = item(referenceValue, referenceValue === "UNIQUE" ? "HIGH" : "MEDIUM", referenceProvenance, referenceContextRef);
  const actionConditionedObjectValue = composedMode.value === "EXPLAIN"
    && objectValue === "SURFACE"
    && aspect.value !== "NONE"
    ? "NONE"
    : objectValue;
  const concrete = actionConditionedObjectValue !== "NONE" || concreteDomainEvidence.length > 0;
  const reliableProductAnchor = productContext;
  const implicitRoleHelpFragment = mode.value === null
    && !/[.!?]\s*$/u.test(stringValue(features?.normalizedText))
    && aspect.value !== "NONE";
  const roleHelpRequestMode = mode.value === "EXPLAIN"
    || (mode.value === "CONTINUE" && continuationIsValid)
    || implicitRoleHelpFragment;
  const situatedCurrentSurfaceHelp = /\b(?:burada|burda|bu\s+ekranda|bu\s+sayfada)\b.{0,48}\b(?:ne\s+yap\p{L}*|nereden\s+basla\p{L}*|sorun\p{L}*|problem\p{L}*|dikkat\p{L}*|bakmam\b|yard[iı]m\s+et|ad[iı]m\s+ad[iı]m)\b/iu.test(stringValue(features?.normalizedText));
  const boundaryOrLimitationRoleHelp = ["BOUNDARY", "LIMITATION"].includes(aspect.value)
    && referenceValue === "ABSENT"
    && (relation.value === "OWNERSHIP" || polarityValue === "NEGATIVE");
  const financeSummaryRequest = hasFinanceSummaryRequest(features?.normalizedText || "");
  const deicticReferentNeedsResolution = explicitReference && objectValue !== "SURFACE";
  const selectedRecordGrounding = Boolean(
    context?.currentEntity?.type && Number(context?.currentEntity?.id) > 0,
  ) || Boolean(
    context?.referenceState?.selectedEntity?.type && Number(context?.referenceState?.selectedEntity?.id) > 0,
  );
  const roleHelpReferenceVeto = (deicticReferentNeedsResolution && ["AMBIGUOUS", "UNRESOLVED", "REJECTED_STALE", "STALE"].includes(referenceValue))
    || (referenceValue === "UNIQUE" && objectValue !== "SURFACE" && !roleScopedDeictic)
    || objectValue === "FINANCIAL"
    || objectValue === "ENTITY"
    || financeSummaryRequest
    || structuralSurfaceHelp
    // A deictic current-surface capability question such as
    // "burada ne yapabilirim" is screen help, not role-global capability
    // help. Explicit role/permission wording remains role help because it
    // does not satisfy this situated-surface predicate.
    || situatedCurrentSurfaceHelp
    || cardinalityEvidence
    || hasOfferCollectionCountRequest(surfaceTokens(features).join(" "))
    // Concrete product objects normally own an explanation request.  A
    // reference-less role orientation/capability question is the bounded
    // exception: words such as "servis işlerini nasıl öğrenebilirim?" name a
    // product area, not a business record.  Keep boundary/detail questions
    // (for example a contract's scope) on the concrete-object path.
    || (CONCRETE_OBJECT_VALUES.has(objectValue)
      && !(contextualSelectionOnly
        && !explicitReference
        && mode.value === "EXPLAIN"
        && ROLE_HELP_CONCRETE_ASPECTS.has(aspect.value))
      && objectValue !== "SURFACE"
      && (selectedRecordGrounding || explicitReference || !ROLE_HELP_CONCRETE_ASPECTS.has(aspect.value))
      && !boundaryOrLimitationRoleHelp);
  const roleHelpCandidate = Boolean(
    role && productContext && reliableProductAnchor && aspect.value !== "NONE"
      && roleHelpRequestMode
      && !positiveUnrelatedDomain && concreteDomainEvidence.length === 0
      && !roleHelpReferenceVeto,
  );
  const subjectValue = role ? "ROLE" : (hasToken(tokens, [/ben/u, /olarak/u]) ? "EXPLICIT_ACTOR" : "NONE");
  const object = item(objectValue, concrete ? "HIGH" : "LOW", concrete ? [PROVENANCE.raw, PROVENANCE.structure] : []);
  const targetValue = matchedLiveSurfaceTarget
    ? "SURFACE"
    : roleHelpCandidate
    ? "PRODUCT_AREA"
    : explicitCurrentSurfaceEvidence
      ? "SURFACE"
    : concrete
      ? (referenceValue === "UNIQUE" ? "ENTITY" : objectValue === "SURFACE" ? "SURFACE" : "RECORD")
      : "NONE";
  const productHelpValue = roleHelpCandidate ? ROLE_HELP_BY_ASPECT[aspect.value] : "NONE";
  const surfacePath = context?.currentSurface?.path || screenContext?.path || "";
  const contradictions = [];
  const contradiction = (value) => contradictions.push({ value, provenance: [PROVENANCE.inference], quality: "CONTRADICTION", authorizationEffect: "NONE" });
  if (concrete && !roleHelpCandidate && (aspect.value !== "NONE" || role)) contradiction("CONCRETE_OBJECT_OVERRIDES_BROAD_ROLE_ASPECT");
  if (composedMode.value && composedMode.value !== "EXPLAIN" && (aspect.value !== "NONE" || role)) contradiction("CONCRETE_REQUEST_MODE_OVERRIDES_BROAD_ROLE_ASPECT");
  if (polarityValue === "NEGATIVE" && relation.value !== "NONE") contradiction("NEGATED_RELATION");
  const provenance = [
    ...(role ? [{ dimension: "subject", source: PROVENANCE.auth, quality: "HIGH", authorizationEffect: "NONE", contextRef: contextRef(PROVENANCE.auth, context) }] : []),
    ...[aspect, mode, relation, order, polarity, reference].flatMap((entry) => entry.provenance.map((sourceName) => ({ dimension: "composition", source: sourceName, quality: sourceName === PROVENANCE.morphology ? "MEDIUM" : "HIGH", authorizationEffect: "NONE" }))),
    ...(surfacePath ? [{ dimension: "surface", source: PROVENANCE.surface, quality: "MEDIUM", authorizationEffect: "NONE", contextRef: `surface:${surfacePath}` }] : []),
  ];
  const qualityValue = features?.featureQuality?.overall === "LOW" ? "LOW" : roleHelpCandidate || concrete ? "HIGH" : "MEDIUM";
  const quality = {
    value: qualityValue,
    confidence: qualityValue,
    completeness: features?.featureQuality?.partial ? "PARTIAL" : "COMPLETE",
    evidenceCount: tokens.length + relation.provenance.length + aspect.provenance.length,
    roleHelpCandidate,
    genuineOosEvidence: positiveUnrelatedDomain,
    authorizationEffect: "NONE",
  };
  const descriptor = (value, provenanceNames, qualityName = qualityValue) => item(value, qualityName, provenanceNames);
  const temporalValue = hasToken(tokens, [/günlük/u, /gunluk/u]) ? "RECURRING" : hasToken(tokens, [/bugün/u, /bugun/u, /şimdi/u, /simdi/u]) ? "CURRENT" : hasToken(tokens, [/yarın/u, /yarin/u]) ? "FUTURE" : "NONE";
  const temporalProvenance = temporalValue === "NONE" ? [] : [PROVENANCE.raw, PROVENANCE.morphology];
  return deepFreeze({
    subject: descriptor(subjectValue, role ? [PROVENANCE.auth] : []),
    roleAspect: descriptor(aspect.value, aspect.provenance),
    requestMode: descriptor(composedMode.value, composedMode.provenance),
    productHelp: descriptor(productHelpValue, roleHelpCandidate ? [...aspect.provenance, PROVENANCE.inference] : []),
    object,
    relation: descriptor(relation.value, relation.provenance),
    reference,
    targetRequest: descriptor(targetValue, targetValue === "PRODUCT_AREA" ? [PROVENANCE.auth, ...(surfacePath ? [PROVENANCE.surface] : [])] : matchedLiveSurfaceTarget ? [PROVENANCE.surface, PROVENANCE.structure] : object.provenance),
    polarity: descriptor(polarity.value, polarity.provenance),
    temporal: descriptor(temporalValue, temporalProvenance),
    order,
    priority: descriptor(features?.priority?.length ? (hasToken(tokens, [/acil/u, /öncelik/u, /oncelik/u]) ? "URGENT" : "PRIORITY") : "NONE", features?.priority?.length ? [PROVENANCE.raw, PROVENANCE.structure] : []),
    contradictions: Object.freeze(contradictions),
    provenance: Object.freeze(provenance),
    quality,
    domainEvidence: Object.freeze(domainEvidence.map((entry) => ({
      ...item(entry.value, entry.quality, entry.provenance),
      kind: entry.kind,
    }))),
  });
}

export {
  composeSemanticEvidence,
  ROLE_ASPECTS,
  hasStandaloneTeachRequest,
  hasDomainCollectionGuidanceRequest,
  hasOfferCollectionCountRequest,
  hasFinanceSummaryRequest,
};
