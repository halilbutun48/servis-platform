const USER_FACING_TOKEN_REPLACEMENTS = [
  [/\bOPERATIONS\b/giu, "operasyon"],
  [/\bSHIFTS\b/giu, "vardiya"],
  [/\bOFFERS\b/giu, "teklif"],
  [/\bAGREEMENTS\b/giu, "sözleşme"],
  [/\bPERSONNEL\b/giu, "personel"],
  [/\bPARENT\b/giu, "veli"],
  [/\bCOMPANY\b/giu, "Hizmet Alan Firma"],
  [/\bROOM\b/giu, "Taşımacılık Firması"],
  [/\bSUPER_ADMIN\b/giu, "Süper Yönetici"],
  [/\bSCHOOL\b/giu, "okul"],
  [/\bORGANIZATION\b/giu, "organizasyon"],
  // Only uppercase role tokens are internal codes. Preserve title-cased
  // user-facing values such as a person's visible name, "Driver One".
  [/\bDRIVER\b/gu, "sürücü"],
  [/\bALLOW_READ\b/giu, "salt okunur erişim"],
  [/\bREADY\b/giu, "hazır"],
  [/\bBLOCKED\b/giu, "engellenmiş"],
  [/\bDRAFT\b/giu, "taslak"],
  [/\bOPEN\b/giu, "açık"],
  [/\bDONE\b/giu, "tamamlandı"],
  [/\bCOMPLETED\b/giu, "tamamlandı"],
  [/\bREQUESTED\b/giu, "talep edildi"],
  [/\bACCEPTED\b/giu, "kabul edildi"],
  [/\bREJECTED\b/giu, "reddedildi"],
  [/\bPENDING\b/giu, "bekliyor"],
  [/\bIN_PROGRESS\b/giu, "devam ediyor"],
  [/\bNO_ACTIVE_SHIFT\b/giu, "etkin vardiya yok"],
  [/\bCOUNTERED\b/giu, "karşı teklif aşamasında"],
  [/\bOUTBOUND\b/giu, "gidiş"],
  [/\bINBOUND\b/giu, "dönüş"],
  [/\bONE_WAY\b/giu, "tek yönlü"],
  [/\bAI_COPILOT_QUERY\b/giu, "Sefer Abi sorusu"],
  [/(?<!\()\bETA\b/giu, "tahmini varış zamanı (ETA)"],
  [/\bGPS\b/giu, "GPS/konum"],
];

const USER_FACING_TEXT_KEYS = new Set([
  "reply", "summary", "contextSummary", "reasoning", "priority", "safeNextStep", "nextAction", "bestNextAction",
  "followUpPrompt", "roleBoundary", "title", "body", "label", "description", "reason", "next", "text", "meaning",
]);

function normalizeTurkishComposition(value) {
  let text = String(value ?? "");
  for (const [pattern, replacement] of USER_FACING_TOKEN_REPLACEMENTS) text = text.replace(pattern, replacement);

  text = text
    .replace(/\btenantlar\s+arası\b/giu, "farklı hesaplara ait")
    .replace(/\btenant\b/giu, "hesap")
    .replace(/\bcross[- ]hesap\b/giu, "hesaplar arası")
    .replace(/\bread\s+policy\b/giu, "okuma kuralı")
    .replace(/\b(?:canonical|kanonik)\b/giu, "doğrulanmış")
    .replace(/\bauthorization\s+gate\b/giu, "yetki kontrolü")
    .replace(/\bfield\s+privacy\s+policy\b/giu, "alan gizliliği kuralları")
    .replace(/\bRBAC\b/giu, "erişim kuralları")
    .replace(/\bretrieval\b/giu, "veri erişimi")
    .replace(/\bprojection\b/giu, "alan")
    .replace(/\bprotected\b/giu, "korunan")
    .replace(/\breferent\b/giu, "ifade")
    .replace(/\bclarification\b/giu, "netleştirme")
    .replace(/\bdomain(?:ler|leri|lerini)?\b/giu, "ürün alanı")
    .replace(/\bscope\b/giu, "kapsam")
    .replace(/\bfail-closed\b/giu, "güvenli biçimde");

  // Keep generated Turkish fluent when a composition step accidentally joins
  // the operation stem with the coordinate noun. This is a family-level
  // guard for the malformed composition, not a phrase-specific router.
  text = text.replace(/\b(?:baş|bas)koordinat\p{L}*/giu, "koordinasyonu");
  text = text.replace(/(?:Sürücü|sürücü)\s+(?=(?:Sürücü|sürücü)(?:\s|$))/gu, "");
  text = text.replace(/(?:Araç|araç)\s+(?=(?:Araç|araç)(?:\s|$))/gu, "");
  text = text.replace(/(?:Vardiya|vardiya)\s+(?=(?:Vardiya|vardiya)(?:\s|$))/gu, "");
  text = text.replace(/(?:Teklif|teklif)\s+(?=(?:Teklif|teklif)(?:\s|$))/gu, "");
  text = text.replace(/(?:Sözleşme|sözleşme)\s+(?=(?:Sözleşme|sözleşme)(?:\s|$))/gu, "");
  text = text.replace(/tamamlandı\s*•\s*tamamlandı/giu, "tamamlandı");
  text = text.replace(/(?:konum\/)?GPS\/konum(?:\/konum)?/giu, "GPS/konum");
  text = text.replace(/(?<!\()\bETA\b/giu, "tahmini varış zamanı (ETA)");
  text = text.replace(/\s+([,.!?;:])/gu, "$1");
  // Visible bullet and paragraph boundaries are presentation semantics.  A
  // global whitespace collapse used to turn a valid two-item STYLE response
  // into one inline sentence, so normalize horizontal whitespace per line
  // while preserving intentional line breaks from the final composer.
  return text
    .split(/\r?\n/u)
    .map((line) => line.replace(/[^\S\r\n]+/gu, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function stripInternalMetaLead(value, family) {
  const text = normalizeTurkishComposition(value);
  if (!["NEXT_ACTION", "NEXT_STEP", "PRIORITY", "RISK_RANKING"].includes(String(family || "").toUpperCase())) return text;
  return text.replace(/^(?:\s*\d+\s+(?:operasyon|vardiya|teklif|sözleşme|personel|veli|araç|sürücü)\s+kayd[ıi][,.;:]?\s*)+(?=(?:sonraki|önce|önerim|risk|güvenli))/iu, "").trim();
}

function normalizeVisibleValue(value, family) {
  if (value == null || typeof value !== "string") return value;
  return stripInternalMetaLead(value, family);
}

function normalizeVisibleObject(value, family, key = "") {
  if (typeof value === "string") return USER_FACING_TEXT_KEYS.has(key) || key === "" ? normalizeVisibleValue(value, family) : value;
  if (Array.isArray(value)) return value.map((item) => normalizeVisibleObject(item, family, key));
  if (!value || typeof value !== "object") return value;
  const result = { ...value };
  for (const [childKey, childValue] of Object.entries(result)) {
    if (typeof childValue === "string" && USER_FACING_TEXT_KEYS.has(childKey)) result[childKey] = normalizeVisibleValue(childValue, family);
    else if (Array.isArray(childValue) && ["responseSections", "quickActions", "authorizedRecords", "retrievedFacts", "dataSources"].includes(childKey)) result[childKey] = childValue.map((item) => normalizeVisibleObject(item, family, ""));
    else if (childValue && typeof childValue === "object" && childKey === "responseSections") result[childKey] = normalizeVisibleObject(childValue, family, childKey);
  }
  return result;
}

export function normalizeSeferAbiUserFacingPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const family = payload?.semanticPlan?.family || payload?.semanticPlan?.intentFamily || payload?.assistantIntent || "";
  const normalized = { ...payload };
  for (const key of USER_FACING_TEXT_KEYS) {
    if (typeof normalized[key] === "string") normalized[key] = normalizeVisibleValue(normalized[key], family);
  }
  if (Array.isArray(normalized.responseSections)) normalized.responseSections = normalized.responseSections.map((section) => normalizeVisibleObject(section, family));
  if (Array.isArray(normalized.quickActions)) normalized.quickActions = normalized.quickActions.map((action) => normalizeVisibleObject(action, family));
  if (Array.isArray(normalized.authorizedRecords)) normalized.authorizedRecords = normalized.authorizedRecords.map((record) => normalizeVisibleObject(record, family));
  if (Array.isArray(normalized.retrievedFacts)) normalized.retrievedFacts = normalized.retrievedFacts.map((fact) => normalizeVisibleValue(fact, family));
  if (Array.isArray(normalized.dataSources)) normalized.dataSources = normalized.dataSources.map((source) => normalizeVisibleValue(source, family));
  return normalized;
}

export { normalizeTurkishComposition };
