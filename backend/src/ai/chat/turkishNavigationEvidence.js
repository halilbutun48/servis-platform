const PERSON_SUFFIX = "(?:im|ım|um|üm|sin|sın|sun|sün|iz|ız|uz|üz|siniz|sınız|sunuz|sünüz|ler|lar)?";
const IMPERATIVE_SUFFIX = "(?:in|ın|ün|un|iniz|ınız|ünüz|unuz)";
const AORIST_SUFFIX = `(?:r|er|ar|ir|ır|ür|ur)${PERSON_SUFFIX}`;
const ABILITY_SUFFIX = `(?:y?abilir|y?ebilir)${PERSON_SUFFIX}`;
const PROGRESSIVE_SUFFIX = `(?:iyor|ıyor|uyor|üyor)${PERSON_SUFFIX}`;
const FUTURE_SUFFIX = `(?:ecek|acak)${PERSON_SUFFIX}`;
const COLLECTIVE_SUFFIX = "(?:elim|alım)";
const INFINITIVE_SUFFIX = "(?:mek|mak)";
// Converb forms keep the first predicate as an actionable transition in
// coordinated requests such as “ekrana geçip başlangıcı göster”.  They are
// bounded morphology, not phrase or surface-name mappings.  Deliberately do
// not include conditional/negative forms here: “geçersem” and “geçme” are
// hypothetical/negated controls, not committed navigation requests.
const CONVERB_SUFFIX = "(?:y?(?:ip|ıp|up|üp|erek|arak))";
const INFLECTED_SUFFIX = `(?:${IMPERATIVE_SUFFIX}|${AORIST_SUFFIX}|${ABILITY_SUFFIX}|${PROGRESSIVE_SUFFIX}|${FUTURE_SUFFIX}|${COLLECTIVE_SUFFIX}|${INFINITIVE_SUFFIX}|${CONVERB_SUFFIX})`;

const NAVIGATION_PREDICATE_PATTERNS = Object.freeze([
  new RegExp(`^(?:git|gid)(?:${INFLECTED_SUFFIX})?$`, "u"),
  new RegExp(`^(?:geç|gec)(?:${INFLECTED_SUFFIX})?$`, "u"),
  new RegExp(`^(?:götür|gotur)(?:${INFLECTED_SUFFIX})?$`, "u"),
  new RegExp(`^(?:ulaş|ulas)(?:${INFLECTED_SUFFIX})?$`, "u"),
  new RegExp(`^(?:ilerle)(?:${INFLECTED_SUFFIX})?$`, "u"),
  new RegExp(`^(?:dön|don)(?:${INFLECTED_SUFFIX})?$`, "u"),
]);

function navigationTokens(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => typeof entry === "string" ? entry : entry?.normalized || entry?.raw)
      .filter(Boolean);
  }
  return String(value ?? "").match(/\p{L}+/gu) || [];
}

export function isTurkishDirectionalNavigationPredicate(value) {
  const token = String(value ?? "").normalize("NFC").toLocaleLowerCase("tr-TR");
  return NAVIGATION_PREDICATE_PATTERNS.some((pattern) => pattern.test(token));
}

export function hasTurkishDirectionalNavigationPredicate(value) {
  return navigationTokens(value).some(isTurkishDirectionalNavigationPredicate);
}
