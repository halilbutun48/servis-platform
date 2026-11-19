const USER_FACING_TOKEN_REPLACEMENTS = [
  // Backend enums and workflow/state identifiers stay internal. They are
  // rendered into Turkish before entering any user-visible response field.
  // TEST_SIMULATED is a provenance marker, not user-facing copy. Preserve the
  // important DEMO distinction without exposing the internal enum.
  [/\bTEST_SIMULATED\b/giu, "DEMO"],
  [/\bNEEDS_REVIEW\b/giu, "İnceleme gerekli"],
  [/\bREVIEW_NEEDED\b/giu, "İnceleme gerekli"],
  [/\bNEEDS_RECHECK\b/giu, "Tekrar kontrol gerekli"],
  [/\bMISSING_PROOF\b/giu, "Kanıt eksik"],
  [/\bMISSING\b/giu, "Eksik"],
  [/\bPARTIAL\b/giu, "Kısmi"],
  [/\bNOT_READY\b/giu, "Henüz hazır değil"],
  [/\bFAILED\b/giu, "Başarısız"],
  [/\bINVALID_COORD\b/giu, "Geçersiz konum"],
  [/\bADDRESS_ONLY\b/giu, "Yalnızca adres var"],
  [/\bUNKNOWN\b/giu, "Bilinmiyor"],
  [/\bNOT_FOUND\b/giu, "Bulunamadı"],
  [/\bUNAUTHORIZED\b/giu, "Yetki yok"],
  [/\bTARGET_DISAPPEARED\b/giu, "Hedef artık görünmüyor"],
  [/\bWRONG_STATE\b/giu, "Geçersiz durum"],
  [/\bPRE_WIZARD\b/giu, "Akış başlamadan önce"],
  [/\bSAVED_DRAFT_CHOOSER\b/giu, "Kayıtlı taslak seçimi"],
  [/\bNEW_PLAN_STEP_1\b/giu, "Yeni planın ilk adımı"],
  [/\bCREATE_SHIFT\b/giu, "Vardiya oluşturma"],
  [/\bPERSONNEL_STOPS\b/giu, "Personel ve durak"],
  [/\bPREPARE_STOPS\b/giu, "Durakları hazırlama"],
  [/\bADD_PERSONNEL\b/giu, "Personel ekleme"],
  [/\bIMPORT_PERSONNEL\b/giu, "Personel içe aktarma"],
  [/\bEXPLAIN_CURRENT_TARGET\b/giu, "Mevcut hedef açıklaması"],
  [/\bCONTINUE_CURRENT_REASONING\b/giu, "Devam eden işlem açıklaması"],
  [/\bUI_GUIDANCE\b/giu, "Arayüz rehberliği"],
  [/\bCURRENT_SCREEN_HELP\b/giu, "Mevcut ekran yardımı"],
  [/\bNO_DATA\b/giu, "Veri yok"],
  [/\bINSUFFICIENT_EVIDENCE\b/giu, "Yeterli kanıt yok"],
  [/\bAUTHORIZATION_NEGATIVE\b/giu, "Yetki sınırı"],
  [/\bOFF_TOPIC_SAFE\b/giu, "Ürün dışı güvenli yanıt"],
  [/\bLIVE_EXTERNAL_DATA\b/giu, "Canlı dış veri"],
  [/\bUNCLEAR_OR_AMBIGUOUS\b/giu, "Belirsiz istek"],
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

const STRUCTURAL_INTERNAL_TOKEN_RE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
const UNKNOWN_INTERNAL_TOKEN_VISIBLE_TEXT = "Bu durum için güvenli bir açıklama veremiyorum.";

const USER_FACING_TEXT_KEYS = new Set([
  "reply", "summary", "contextSummary", "reasoning", "priority", "safeNextStep", "nextAction", "bestNextAction",
  "followUpPrompt", "roleBoundary", "title", "body", "label", "description", "reason", "next", "text", "meaning",
  "questionLabel", "actionPlanLabel", "activeTopicLabel", "assistantReply", "boundaryText", "clarifyingQuestion", "safeAlternative",
  "nextBestAction", "rootCauseReply", "riskScoringReply", "smartDiagnosticReply", "selectedRecordLabel", "selectedRecordSummary",
  "selectedRecordStatus", "selectedFieldLines", "selectedBadgeLines", "selectedSignalLines", "suggestedChips", "rootCauseChips",
  "riskScoringChips", "smartDiagnosticChips", "visibleReason",
]);

const USER_FACING_OBJECT_KEYS = new Set([
  "responseSections", "quickActions", "linkedGuides", "authorizedRecords", "retrievedFacts", "dataSources", "reasoningAssistant", "guidedTarget",
  "uncertaintyMeta", "routePlan", "contextPriority", "taskState", "conversationState", "continuity", "continuityMeta", "qualityHints",
]);

// These fields are canonical identity/transport data.  They may be carried
// alongside a visible label, but translating them would break target
// equality, route scoping, or authorization checks.  Only their user-facing
// sibling text is normalized.
const INTERNAL_IDENTITY_KEYS = new Set([
  "targetKey", "semanticId", "blockKey", "screenPath", "identitySource", "semanticType",
  "authorizedContext", "anchor", "locator", "routeKey", "actionKind", "guideJobType", "jobType",
  "path", "kind",
  "activeGoal", "activeWorkflow", "activeStep", "currentExpectedStep", "currentSurface", "currentRole",
  "effectiveRole", "mode", "provider", "providerSummary", "questionType", "assistantIntent", "intent", "intentLabel",
  "lastReasoningAssistantRole", "lastReasoningAssistantMode", "lastReasoningAssistantFingerprint",
  "safeOnly", "workflowIntent", "workflowId", "ordinal", "completedThroughOrdinal", "currentTargetKey",
]);

function normalizeTurkishComposition(value, renderState = null) {
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
  // GPS is rendered as the user-facing "GPS/konum" label above.  Preserve
  // Turkish suffixes instead of leaving the old apostrophe attached to the
  // expanded label (for example, "GPS/konum'i").
  text = text
    .replace(/\bGPS\/konum['’]ini\b/giu, "GPS/konumunu")
    .replace(/\bGPS\/konum['’]inden\b/giu, "GPS/konumundan")
    .replace(/\bGPS\/konum['’]ine\b/giu, "GPS/konumuna")
    .replace(/\bGPS\/konum['’]i\b/giu, "GPS/konumu")
    .replace(/\bGPS\/konumu\s+bilgisini\b/giu, "GPS/konum bilgisini")
    .replace(/\bGPS\/konumu\s+tarafını\b/giu, "GPS/konum tarafını");
  text = text.replace(/(?<!\()\bETA\b/giu, "tahmini varış zamanı (ETA)");
  // Known tokens receive precise copy above. Unknown structured tokens must
  // fail closed; heuristic humanization can both leak implementation detail
  // and invent a meaning that the product has not approved.
  text = text.replace(STRUCTURAL_INTERNAL_TOKEN_RE, () => {
    if (renderState && typeof renderState === 'object') renderState.status = 'RENDERING_REJECTED';
    return UNKNOWN_INTERNAL_TOKEN_VISIBLE_TEXT;
  });
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

function stripInternalMetaLead(value, family, renderState = null) {
  const text = normalizeTurkishComposition(value, renderState);
  if (!["NEXT_ACTION", "NEXT_STEP", "PRIORITY", "RISK_RANKING"].includes(String(family || "").toUpperCase())) return text;
  return text.replace(/^(?:\s*\d+\s+(?:operasyon|vardiya|teklif|sözleşme|personel|veli|araç|sürücü)\s+kayd[ıi][,.;:]?\s*)+(?=(?:sonraki|önce|önerim|risk|güvenli))/iu, "").trim();
}

function normalizeVisibleValue(value, family, renderState = null) {
  if (value == null || typeof value !== "string") return value;
  return stripInternalMetaLead(value, family, renderState);
}

function normalizeVisibleObject(value, family, key = "", visibleScope = false, renderState = null) {
  if (typeof value === "string") return visibleScope || USER_FACING_TEXT_KEYS.has(key) || key === "" ? normalizeVisibleValue(value, family, renderState) : value;
  if (Array.isArray(value)) return value.map((item) => normalizeVisibleObject(item, family, key, visibleScope, renderState));
  if (!value || typeof value !== "object") return value;
  const result = { ...value };
  for (const [childKey, childValue] of Object.entries(result)) {
    if (INTERNAL_IDENTITY_KEYS.has(childKey)) continue;
    // ROOM cost conversation state is a transport envelope consumed by the
    // next turn. Its subject/continuation/category values are machine
    // contracts, not visible copy; translating them would destroy draft
    // continuity while the visible reply remains correct.
    if (key === "conversationState" && childKey === "roomCost") continue;
    // Guided-target/task envelopes carry machine status values that the web
    // client compares as canonical identity.  Keep those transport fields
    // intact while still normalizing status text in visible records/cards.
    if (childKey === "status" && ["guidedTarget", "taskState", "conversationState"].includes(key)) continue;
    const childVisibleScope = visibleScope || USER_FACING_OBJECT_KEYS.has(childKey);
    if (typeof childValue === "string" && (childVisibleScope || USER_FACING_TEXT_KEYS.has(childKey))) result[childKey] = normalizeVisibleValue(childValue, family, renderState);
    else if (childValue && typeof childValue === "object" && (childVisibleScope || USER_FACING_OBJECT_KEYS.has(childKey))) result[childKey] = normalizeVisibleObject(childValue, family, childKey, childVisibleScope, renderState);
  }
  return result;
}

export function normalizeSeferAbiUserFacingPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const renderState = { status: 'OK' };
  const family = payload?.semanticPlan?.family || payload?.semanticPlan?.intentFamily || payload?.assistantIntent || "";
  const normalized = { ...payload };
  for (const key of USER_FACING_TEXT_KEYS) {
    if (typeof normalized[key] === "string") normalized[key] = normalizeVisibleValue(normalized[key], family, renderState);
  }
  for (const key of USER_FACING_OBJECT_KEYS) {
    if (normalized[key] != null) normalized[key] = normalizeVisibleObject(normalized[key], family, key, true, renderState);
  }
  Object.defineProperty(normalized, '__renderingStatus', { value: renderState.status, enumerable: false, configurable: true });
  return normalized;
}

export { normalizeTurkishComposition };
