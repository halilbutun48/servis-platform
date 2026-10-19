const PRODUCER = "deterministic-turkish-feature-producer";
const NORMALIZATION_FORM = "TURKISH_LOWERCASE_NFC";
const TOKEN_RE = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*|[?!…]/gu;

function normalizeTurkish(value) {
  return String(value ?? "").normalize("NFC").toLocaleLowerCase("tr-TR");
}

function span(start, end) {
  return { start, end };
}

function feature(featureKind, value, sourceSpan, quality = "MEDIUM", supportOrContradiction = "SUPPORT") {
  return {
    featureKind,
    value,
    sourceSpan: span(sourceSpan.start, sourceSpan.end),
    normalizationForm: NORMALIZATION_FORM,
    producer: PRODUCER,
    supportOrContradiction,
    quality,
  };
}

function emptyMorphology() {
  return {
    plurality: [],
    person: [],
    possessive: [],
    case: [],
    modality: [],
    negation: [],
  };
}

function addMorphology(morphology, bucketName, value, sourceSpan, quality = "MEDIUM") {
  const bucket = morphology[bucketName];
  if (!bucket.some((item) => item.value === value)) bucket.push(feature(bucketName.toUpperCase(), value, sourceSpan, quality));
}

function hasSuffixWithStem(value, suffixes, minimumStemLength = 3) {
  return suffixes.some((suffix) => value.endsWith(suffix) && value.length - suffix.length >= minimumStemLength);
}

function isVerbLikeWord(value) {
  return /(?:malı|meli)(?:yız|yiz|yuz|yüz|ız|iz|uz|üz)$/u.test(value)
    || /(?:malı|meli|mamalı|memeli)/u.test(value)
    || (/(?:ıyor|iyor|uyor|üyor|acak|ecek|dır|dir|dur|dür|dı|di|du|dü|tı|ti|tu|tü|ılır|ilir|ulur|ülür|ar|er|ır|ir|ur|ür)$/u.test(value)
      && !/(?:lar|ler)$/u.test(value));
}

function isFirstPersonAbilityWord(value) {
  // Preserve common keyboard variants such as "yapabılırım" while keeping
  // the rule morphological: the ability stem and first-person ending must
  // both be present, so this does not become a sentence-specific exception.
  return /(?:ab[ıi]l|eb[ıi]l)(?:[ıi]r[ıi]m|[uü]r[ıi]m)$/u.test(value)
    || /(?:abil|ebil)(?:irim|ırım|urum|ürüm)$/u.test(value);
}

function isNegativeParticipleWord(value) {
  return /(?:ma|me)(?:yan|yen|dığı|diği|duğu|düğü|dık|dik|duk|dük|yacağı|yeceği|yacak|yecek)$/u.test(value);
}

function isPossessiveExclusionWord(value) {
  return /^dış(?:ım|im|um|üm)(?:da|de|ta|te)$/u.test(value);
}


function isPriorityNominal(value) {
  return /^önceli(?:k|ğ\p{L}*)$/u.test(value) || /^onceli(?:k|g\p{L}*)$/u.test(value);
}

function isPerspectiveNominal(value) {
  return /^(?:görüş|gorus|görünüm|gorunum|perspektif|pencere)\p{L}*$/u.test(value);
}

function isResponsibilityAttributionParticiple(value) {
  return /^düşen$/u.test(value) || /^dusen$/u.test(value);
}

function isRelationalParticipleWord(value) {
  return /\p{L}+(?:dığı|diği|duğu|düğü|tığı|tiği|tuğu|tüğü|ulan|ülen)$/u.test(value);
}

function isExteriorLocativeWord(value) {
  return /^dışarıda$/u.test(value) || /^disarida$/u.test(value);
}

function isDutyAttributionNominal(value) {
  return /^(?:iş|is)(?:im|ım|um|üm|imiz|ımız|umuz|ümüz)?$/u.test(value);
}

function isInfinitiveTaskWord(value) {
  return /\p{L}+(?:mak|mek)$/u.test(value);
}

function isThirdPersonAoristPredicate(value) {
  return /\p{L}+(?:ar|er|ır|ir|ur|ür)$/u.test(value);
}

function isFirstPersonInterpretivePredicate(value) {
  return /\p{L}+(?:arım|erim|ırım|irim|urum|ürüm)$/u.test(value);
}

function isFirstPersonNegativeFinitePredicate(value) {
  return /\p{L}+(?:mam|mem)$/u.test(value);
}

function addConservativeSuffixFacts(normalized, sourceSpan, morphology) {
  if (hasSuffixWithStem(normalized, ["ımız", "imiz", "umuz", "ümüz", "ımızın", "imizin", "umuzun", "ümüzün", "ımızı", "imizi", "umuzu", "ümüzü"])) addMorphology(morphology, "possessive", "FIRST_PLURAL", sourceSpan, "HIGH");
  if (hasSuffixWithStem(normalized, ["ınız", "iniz", "unuz", "ünüz", "ınızın", "inizin", "unuzun", "ünüzün"])) addMorphology(morphology, "possessive", "SECOND_PLURAL", sourceSpan, "MEDIUM");
  if (hasSuffixWithStem(normalized, ["ım", "im", "um", "üm", "ımı", "imi", "umu", "ümü", "ımdan", "imden", "umdan", "ümden"])) addMorphology(morphology, "possessive", "FIRST_SINGULAR", sourceSpan, "HIGH");
  if (hasSuffixWithStem(normalized, ["ın", "in", "un", "ün", "ını", "ini", "unu", "ünü"])) addMorphology(morphology, "possessive", "SECOND_SINGULAR", sourceSpan, "MEDIUM");
  if (hasSuffixWithStem(normalized, ["ları", "leri", "larının", "lerinin", "larından", "lerinden"])) addMorphology(morphology, "possessive", "THIRD_PLURAL", sourceSpan, "MEDIUM");

  if (/(?:n[ıiuü]|[ıiuü])$/u.test(normalized) && normalized.length >= 6) {
    if (/(?:n[ıiuü])$/u.test(normalized) || /(?:lerimizi|larımızı|lerini|larını|imizi|ımızı|umuzu|ümüzü)$/u.test(normalized)) {
      addMorphology(morphology, "case", "ACCUSATIVE", sourceSpan, "MEDIUM");
    }
  }
  if (/(?:ın|in|un|ün|nın|nin|nun|nün)$/u.test(normalized) && normalized.length >= 6) {
    addMorphology(morphology, "case", "GENITIVE", sourceSpan, "MEDIUM");
  }
  if (/(?:dan|den|tan|ten)$/u.test(normalized) && normalized.length >= 6) {
    addMorphology(morphology, "case", "ABLATIVE", sourceSpan, "MEDIUM");
  }
  if (/(?:da|de|ta|te)$/u.test(normalized) && normalized.length >= 5) {
    addMorphology(morphology, "case", "LOCATIVE", sourceSpan, "MEDIUM");
  }
  if (/(?:ya|ye)$/u.test(normalized) && normalized.length >= 5) {
    addMorphology(morphology, "case", "DATIVE", sourceSpan, "LOW");
  }

  if (isVerbLikeWord(normalized)) {
    if (/(?:yız|yiz|yuz|yüz|ız|iz|uz|üz)$/u.test(normalized)) addMorphology(morphology, "person", "FIRST_PLURAL", sourceSpan, "MEDIUM");
    if (/(?:sınız|siniz|sunuz|sünüz)$/u.test(normalized)) addMorphology(morphology, "person", "SECOND_PLURAL", sourceSpan, "MEDIUM");
    if (/(?:sın|sin|sun|sün)$/u.test(normalized)) addMorphology(morphology, "person", "SECOND_SINGULAR", sourceSpan, "MEDIUM");
    if (/(?:yım|yim|yum|yüm)$/u.test(normalized)) addMorphology(morphology, "person", "FIRST_SINGULAR", sourceSpan, "MEDIUM");
  }
  if (isFirstPersonAbilityWord(normalized)) addMorphology(morphology, "modality", "ABILITY", sourceSpan, "HIGH");
  if (isNegativeParticipleWord(normalized)) addMorphology(morphology, "negation", "NEGATION", sourceSpan, "HIGH");
}

/**
 * Keep the normalized token and, when an unambiguous bounded suffix is seen,
 * one root-like candidate. This is evidence only, not Turkish lemmatization.
 */
function lemmaCandidates(normalized) {
  const candidates = [normalized];
  const suffixes = [
    "larımız", "lerimiz", "larımızı", "lerimizi", "larını", "lerini",
    "ımız", "imiz", "umuz", "ümüz", "ları", "leri", "dır", "dir", "dur", "dür",
    "malı", "meli", "ıyor", "iyor", "uyor", "üyor", "mak", "mek", "lar", "ler",
  ];
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix) && normalized.length - suffix.length >= 3) {
      candidates.push(normalized.slice(0, -suffix.length));
      break;
    }
  }
  return [...new Set(candidates)];
}

function buildToken(raw, sourceSpan, isWord) {
  const normalized = normalizeTurkish(raw);
  const morphology = emptyMorphology();
  if (isWord) {
    const add = (bucket, value, quality = "MEDIUM") => addMorphology(morphology, bucket, value, sourceSpan, quality);
    const pluralMarker = /(?:lar|ler)/u.exec(normalized);
    const hasInflectedPlural = pluralMarker !== null && normalized.length > pluralMarker.index + pluralMarker[0].length;
    if (hasInflectedPlural) add("plurality", "PLURAL");

    const necessity = /(?:malı|meli)/u.test(normalized);
    if (necessity) add("modality", "NECESSITY", "HIGH");
    if (/(?:mamalı|memeli)/u.test(normalized)) add("negation", "NEGATION", "HIGH");
    const verbLike = necessity || /(?:ıyor|iyor|uyor|üyor|acak|ecek|dı|di|du|dü|tı|ti|tu|tü)$/u.test(normalized);
    if (verbLike && /(?:yım|yim|yum|yüm|ım|im|um|üm)$/u.test(normalized)) add("person", "FIRST_SINGULAR");

    if (hasInflectedPlural && /(?:ım|im|um|üm)(?:ı|i|u|ü)?$/u.test(normalized) && !necessity) add("possessive", "FIRST_SINGULAR");
    if (hasInflectedPlural && /[ıiuü]$/u.test(normalized)) add("case", "ACCUSATIVE");
    addConservativeSuffixFacts(normalized, sourceSpan, morphology);
  }
  return {
    raw,
    normalized,
    lemmaCandidates: lemmaCandidates(normalized),
    sourceSpan: span(sourceSpan.start, sourceSpan.end),
    morphology,
  };
}

function makeTokenFeatures(tokens) {
  const MAX_RELATION_CANDIDATES = 8;
  const MAX_LOCAL_TOKENS = 5;
  const words = tokens.filter((token) => /[\p{L}\p{M}\p{N}]/u.test(token.raw));
  const relationSpan = (startToken, endToken) => span(startToken.sourceSpan.start, endToken.sourceSpan.end);
  const actorObject = [];
  const ownership = [];
  const process = [];
  const assignment = [];
  const inclusion = [];
  const exclusion = [];
  const purpose = [];
  const orientation = [];
  const startingGuidance = [];
  const boundary = [];
  const limitation = [];
  const decision = [];
  const verbNoun = [];
  const local = [];

  const pushRelation = (bucket, featureKind, value, start, end, quality = "MEDIUM") => {
    if (bucket.length < MAX_RELATION_CANDIDATES) bucket.push(feature(featureKind, value, span(start, end), quality));
  };
  const cue = (token, patterns) => patterns.some((pattern) => pattern.test(token.normalized));
  const hasCase = (token, value) => token.morphology.case.some((entry) => entry.value === value);
  const hasPossessive = (token) => token.morphology.possessive.length > 0;
  const actorToken = (token) => cue(token, [
    /^kim$/u, /^(?:ben|bana|benim|benden|sen|sana|senin|biz|bize|bizim|siz|size|sizin)$/u, /tarafından$/u,
  ]);
  const ownershipToken = (token) => token.morphology.possessive.length > 0 || token.normalized.includes("sahip") || token.normalized === "ait";
  const structuralCues = {
    purpose: [/amaç/u, /neden/u, /için/u, /^işlev/u],
    orientation: [/^yön/u, /^anla/u, /^kavra/u, /^öğren/u],
    startingGuidance: [/^ilk$/u, /^başla/u, /^başlangıç/u, /^nereden$/u],
    boundary: [/^sınır/u, /^kapsam/u, /^çizgi/u, /^bit/u],
    limitation: [/^dışında$/u, /^hariç/u, /^haric/u, /^kısıt/u, /^sınırlı$/u, /^sınır/u, /^kapsam/u, /^bit/u],
    inclusion: [/^dahil$/u, /^içinde$/u, /^içer/u],
    exclusion: [/^dışında$/u, /^hariç/u, /^haric/u, /^olmayan$/u],
  };
  for (let index = 0; index < words.length; index += 1) {
    const token = words[index];
    if (isVerbLikeWord(token.normalized)) {
      const object = [...words.slice(0, index).reverse(), ...words.slice(index + 1)]
        .find((candidate) => !actorToken(candidate)
          && (candidate.morphology.case.length > 0 || candidate.morphology.possessive.length > 0));
      if (object && actorObject.length < MAX_RELATION_CANDIDATES) {
        const actor = words.slice(0, index).findLast(actorToken) || words.slice(index + 1).find(actorToken);
        const start = Math.min(object.sourceSpan.start, token.sourceSpan.start, actor?.sourceSpan.start ?? object.sourceSpan.start);
        const end = Math.max(object.sourceSpan.end, token.sourceSpan.end, actor?.sourceSpan.end ?? object.sourceSpan.end);
        pushRelation(actorObject, "ACTOR_OBJECT_RELATION", "ACTOR_OBJECT", start, end);
        pushRelation(verbNoun, "VERB_NOUN_RELATION", "VERB_NOUN", Math.min(object.sourceSpan.start, token.sourceSpan.start), Math.max(object.sourceSpan.end, token.sourceSpan.end), "LOW");
        if (actor) pushRelation(assignment, "ASSIGNMENT_RELATION", "ASSIGNMENT", actor.sourceSpan.start, token.sourceSpan.end, "MEDIUM");
      }
      pushRelation(process, "PROCESS_RELATION", "PROCESS", token.sourceSpan.start, token.sourceSpan.end, "MEDIUM");
    }
    if (ownershipToken(token)) {
      pushRelation(ownership, "OWNERSHIP_RELATION", "OWNERSHIP", token.sourceSpan.start, token.sourceSpan.end);
    }
    if (isPossessiveExclusionWord(token.normalized)) {
      pushRelation(limitation, "LIMITATION_RELATION", "LIMITATION", token.sourceSpan.start, token.sourceSpan.end);
      pushRelation(exclusion, "EXCLUSION_RELATION", "EXCLUSION", token.sourceSpan.start, token.sourceSpan.end);
    }
    if (isNegativeParticipleWord(token.normalized)) {
      pushRelation(limitation, "LIMITATION_RELATION", "LIMITATION", token.sourceSpan.start, token.sourceSpan.end, "MEDIUM");
      pushRelation(exclusion, "EXCLUSION_RELATION", "EXCLUSION", token.sourceSpan.start, token.sourceSpan.end, "MEDIUM");
    }
    if (isFirstPersonAbilityWord(token.normalized) && words.some((candidate) => /^hangi$/u.test(candidate.normalized))) {
      pushRelation(inclusion, "INCLUSION_RELATION", "INCLUSION", token.sourceSpan.start, token.sourceSpan.end, "MEDIUM");
    }
    if (isPriorityNominal(token.normalized) && words.some(actorToken)) {
      pushRelation(decision, "DECISION_RELATION", "DECISION", token.sourceSpan.start, token.sourceSpan.end, "MEDIUM");
    }
    if (isPerspectiveNominal(token.normalized) && words.some(actorToken)) {
      pushRelation(orientation, "ORIENTATION_RELATION", "ORIENTATION", token.sourceSpan.start, token.sourceSpan.end, "MEDIUM");
    }
    if (isResponsibilityAttributionParticiple(token.normalized) && words.some(actorToken)) {
      const actor = words.find(actorToken);
      pushRelation(assignment, "ASSIGNMENT_RELATION", "ASSIGNMENT", actor.sourceSpan.start, token.sourceSpan.end, "MEDIUM");
    }
    for (const [name, patterns] of Object.entries(structuralCues)) {
      if (cue(token, patterns)) {
        pushRelation({ purpose, orientation, startingGuidance, boundary, limitation, inclusion, exclusion }[name], `${name.toUpperCase()}_RELATION`, name.toUpperCase(), token.sourceSpan.start, token.sourceSpan.end, "LOW");
      }
    }
    if (actorToken(token)) {
      const localTail = words.slice(index + 1);
      const nextPredicate = localTail.find((candidate) => isVerbLikeWord(candidate.normalized));
      const ownedNominal = localTail.find(ownershipToken);
      const accountabilityQuestion = words.some((candidate) => /^(?:hangi\p{L}*|ne|nerede|nasıl|nasil)$/u.test(candidate.normalized));
      const relationalAttribution = localTail.some((candidate) => isRelationalParticipleWord(candidate.normalized));
      // Possessive morphology alone expresses ownership, not an assigned duty.
      // An owned nominal becomes an attribution only in a bounded
      // accountability question or relative-clause relation; this excludes
      // ordinary possession such as a yes/no question about a personal item.
      const assignmentEndpoint = nextPredicate
        || (ownedNominal && (accountabilityQuestion || relationalAttribution) ? ownedNominal : null);
      if (assignmentEndpoint) pushRelation(assignment, "ASSIGNMENT_RELATION", "ASSIGNMENT", token.sourceSpan.start, assignmentEndpoint.sourceSpan.end);
    }
  }

  const isQuestionWord = (token) => /^(?:hangi\p{L}*|ne|nasıl|nasil)$/u.test(token.normalized);
  const hasQuestionWord = words.some(isQuestionWord);
  const hasQuestionForm = hasQuestionWord
    || tokens.some((token) => token.normalized === "?")
    || words.some((token) => ["mi", "mı", "mu", "mü"].includes(token.normalized));
  const roleSide = words.find((token) => /^(?:tarafında|tarafinda)$/u.test(token.normalized));
  const exterior = words.find((token) => isExteriorLocativeWord(token.normalized));
  const relationalParticiple = exterior
    ? words.slice(words.indexOf(exterior) + 1).find((token) => isRelationalParticipleWord(token.normalized))
    : null;
  if (hasQuestionWord && exterior && relationalParticiple) {
    const relation = relationSpan(exterior, relationalParticiple);
    pushRelation(limitation, "LIMITATION_RELATION", "LIMITATION", relation.start, relation.end, "HIGH");
    pushRelation(exclusion, "EXCLUSION_RELATION", "EXCLUSION", relation.start, relation.end, "HIGH");
  }

  const attributionActor = words.find(actorToken);
  const attributionDuty = attributionActor
    ? words.slice(words.indexOf(attributionActor) + 1).find((token) => isDutyAttributionNominal(token.normalized))
    : null;
  const taskInfinitive = words.find((token) => isInfinitiveTaskWord(token.normalized));
  if (hasQuestionForm && attributionActor && attributionDuty && taskInfinitive) {
    const relation = relationSpan(taskInfinitive, attributionDuty);
    pushRelation(assignment, "ASSIGNMENT_RELATION", "ASSIGNMENT", relation.start, relation.end, "HIGH");
  }

  const aoristPredicates = words.filter((token) => isThirdPersonAoristPredicate(token.normalized));
  const operationalPredicate = aoristPredicates.find((token) => {
    const index = words.indexOf(token);
    return words.slice(Math.max(0, index - 3), index).some((candidate) => hasPossessive(candidate) && hasCase(candidate, "ACCUSATIVE"));
  });
  if (words.some((token) => /^hangi\p{L}*$/u.test(token.normalized)) && operationalPredicate) {
    const object = words.slice(0, words.indexOf(operationalPredicate)).reverse().find((candidate) => hasPossessive(candidate) && hasCase(candidate, "ACCUSATIVE"));
    const relation = relationSpan(object || operationalPredicate, operationalPredicate);
    pushRelation(inclusion, "INCLUSION_RELATION", "INCLUSION", relation.start, relation.end, "MEDIUM");
  }

  const priorityNominal = words.find((token) => isPriorityNominal(token.normalized));
  const causalPredicate = priorityNominal
    ? words.slice(words.indexOf(priorityNominal) + 1).find((token) => isThirdPersonAoristPredicate(token.normalized))
    : null;
  if (priorityNominal && hasQuestionWord && roleSide && causalPredicate) {
    const relation = relationSpan(priorityNominal, causalPredicate);
    pushRelation(decision, "DECISION_RELATION", "DECISION", relation.start, relation.end, "HIGH");
  }

  const interpretationPredicate = words.find((token) => isFirstPersonInterpretivePredicate(token.normalized));
  if (interpretationPredicate && words.some((token) => /^(?:nasıl|nasil)$/u.test(token.normalized))) {
    const index = words.indexOf(interpretationPredicate);
    const operationalObject = words.slice(Math.max(0, index - 4), index).reverse().find((token) => hasPossessive(token) && hasCase(token, "ACCUSATIVE"));
    const operationalLocation = words.slice(0, index).find((token) => hasCase(token, "LOCATIVE"));
    if (operationalObject && operationalLocation) {
      const relation = relationSpan(operationalLocation, interpretationPredicate);
      pushRelation(orientation, "ORIENTATION_RELATION", "ORIENTATION", relation.start, relation.end, "MEDIUM");
    }
  }

  const pairedQuestionCount = words.filter((token) => /^hangi\p{L}*$/u.test(token.normalized)).length;
  const negativeParticipation = words.find((token) => isFirstPersonNegativeFinitePredicate(token.normalized));
  const positiveParticipation = words.find((token) => isThirdPersonAoristPredicate(token.normalized) || isFirstPersonInterpretivePredicate(token.normalized));
  if (pairedQuestionCount >= 2 && negativeParticipation && positiveParticipation && words.indexOf(positiveParticipation) < words.indexOf(negativeParticipation)) {
    const relation = relationSpan(positiveParticipation, negativeParticipation);
    pushRelation(limitation, "LIMITATION_RELATION", "LIMITATION", relation.start, relation.end, "HIGH");
    pushRelation(exclusion, "EXCLUSION_RELATION", "EXCLUSION", relation.start, relation.end, "HIGH");
  }

  if (actorObject.length || ownership.length || process.length || purpose.length || orientation.length || startingGuidance.length || boundary.length || limitation.length || decision.length || assignment.length) {
    const first = words[0];
    const last = words[Math.min(words.length - 1, MAX_LOCAL_TOKENS - 1)];
    local.push(feature("LOCAL_STRUCTURE", "BOUNDED_WINDOW", relationSpan(first, last), "LOW"));
  }
  return { actorObject, ownership, process, assignment, inclusion, exclusion, purpose, orientation, startingGuidance, boundary, limitation, decision, verbNoun, local };
}

function arithmeticDomainEvidence(tokens, sourceText) {
  const numericTokenCount = tokens.filter((token) => /\d/u.test(token.normalized)).length;
  const symbolExpression = /\d\s*[+\-*×÷/]\s*\d/u.test(sourceText);
  const arithmeticWords = new Set(["çarpı", "carpi", "bölü", "bolu", "artı", "arti", "eksi"]);
  const fractionWords = new Set(["yarısı", "yarisi", "çeyreği", "çeyregi", "ceyregi", "üçte", "ucte", "yarım", "yarim"]);
  const operatorWordExpression = numericTokenCount >= 2
    && tokens.some((token) => arithmeticWords.has(token.normalized));
  const fractionExpression = numericTokenCount >= 1
    && tokens.some((token) => fractionWords.has(token.normalized));
  if (!symbolExpression && !operatorWordExpression && !fractionExpression) return [];
  return [{
    ...feature("DOMAIN_EVIDENCE", "ARITHMETIC", { start: 0, end: sourceText.length }, "HIGH"),
    kind: "EXTERNAL_DOMAIN",
  }];
}

function collectCueFeatures(tokens, sourceText = "") {
  const temporal = [];
  const order = [];
  const priority = [];
  const questionMarkers = [];
  const domainEvidence = [];
  const temporalCues = new Set(["günlük", "bugün", "yarın", "dün", "sonra", "şimdi", "akşam", "sabah", "gece"]);
  const orderCues = new Set(["sırayla", "sıra", "önce", "sonra", "ardından", "ilk", "son"]);
  const priorityCues = new Set(["sırayla", "önce", "acil", "öncelik", "önemli"]);
  const externalWeatherCues = new Set(["yağmur", "rüzgar", "ruzgar", "kar", "fırtına", "firtina", "sıcaklık", "sicaklik"]);
  const externalEntertainmentCue = /^(?:film|sinema|dizi|kitap|m[uü]zik|[şs]ark[ıi])\p{L}*$/u;

  for (const token of tokens) {
    if (temporalCues.has(token.normalized)) temporal.push(feature("TEMPORAL", "TEMPORAL", token.sourceSpan));
    if (orderCues.has(token.normalized)) order.push(feature("ORDER", "SEQUENCE", token.sourceSpan));
    if (priorityCues.has(token.normalized) || isPriorityNominal(token.normalized)) priority.push(feature("PRIORITY", "PRIORITY", token.sourceSpan));
    if (["mi", "mı", "mu", "mü"].includes(token.normalized)) {
      questionMarkers.push(feature("QUESTION_MARKER", "QUESTION_PARTICLE", token.sourceSpan, "HIGH"));
    }
    if (token.normalized === "?") questionMarkers.push(feature("QUESTION_MARKER", "QUESTION_MARK", token.sourceSpan, "HIGH"));
    if (externalWeatherCues.has(token.normalized)) {
      domainEvidence.push({
        ...feature("DOMAIN_EVIDENCE", "WEATHER", token.sourceSpan, "HIGH"),
        kind: "EXTERNAL_DOMAIN",
      });
    }
    if (externalEntertainmentCue.test(token.normalized)) {
      domainEvidence.push({
        ...feature("DOMAIN_EVIDENCE", "ENTERTAINMENT_MEDIA", token.sourceSpan, "HIGH"),
        kind: "EXTERNAL_DOMAIN",
      });
    }
  }
  const weatherNounPair = tokens.find((token, index) => token.normalized === "hava"
    && tokens.slice(index + 1, index + 4).some((candidate) => /^(?:tahmin|durum)\p{L}*$/u.test(candidate.normalized)));
  if (weatherNounPair) {
    const pairEnd = tokens.find((token, index) => index > tokens.indexOf(weatherNounPair)
      && index <= tokens.indexOf(weatherNounPair) + 3
      && /^(?:tahmin|durum)\p{L}*$/u.test(token.normalized));
    if (pairEnd) {
      domainEvidence.push({
        ...feature("DOMAIN_EVIDENCE", "WEATHER", { start: weatherNounPair.sourceSpan.start, end: pairEnd.sourceSpan.end }, "HIGH"),
        kind: "EXTERNAL_DOMAIN",
      });
    }
  }
  domainEvidence.push(...arithmeticDomainEvidence(tokens, sourceText));
  return { temporal, order, priority, questionMarkers, domainEvidence };
}

export function extractTurkishSemanticFeatures({ text } = {}) {
  const sourceText = String(text ?? "");
  const normalizedText = normalizeTurkish(sourceText);
  const tokens = [];
  for (const match of sourceText.matchAll(TOKEN_RE)) {
    const raw = match[0];
    const start = match.index ?? 0;
    tokens.push(buildToken(raw, span(start, start + raw.length), /[\p{L}\p{M}\p{N}]/u.test(raw)));
  }

  const cues = collectCueFeatures(tokens, sourceText);
  const relations = makeTokenFeatures(tokens);
  const negation = tokens.flatMap((token) => token.morphology.negation);
  const modality = tokens.flatMap((token) => token.morphology.modality);
  const isQuestion = cues.questionMarkers.length > 0 || /[?]/u.test(sourceText);
  const recognized = negation.length + modality.length + cues.temporal.length + cues.order.length + cues.priority.length + cues.domainEvidence.length
    + Object.values(relations).reduce((total, candidates) => total + candidates.length, 0);
  const overall = recognized === 0 ? "LOW" : recognized >= 4 ? "HIGH" : "MEDIUM";

  return {
    sourceText,
    normalizedText,
    tokens,
    polarity: { negation, modality },
    question: {
      isQuestion,
      markers: cues.questionMarkers,
      form: cues.questionMarkers.some((item) => item.value === "QUESTION_PARTICLE") ? "TAG_OR_PARTICLE" : isQuestion ? "PUNCTUATION" : "NONE",
    },
    relations,
    temporal: cues.temporal,
    order: cues.order,
    priority: cues.priority,
    domainEvidence: cues.domainEvidence,
    structure: { local: relations.local },
    featureQuality: {
      overall,
      partial: overall !== "HIGH",
      bounded: true,
      recognizedFeatureCount: recognized,
    },
  };
}
