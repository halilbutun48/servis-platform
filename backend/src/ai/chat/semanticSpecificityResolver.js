const RECORD_TERMS = "(?:vardiya|sefer|shift|sozlesme|sözleşme|anlasma|anlaşma|contract|teklif|arac|araç|surucu|sürücü|personel|kayit|kayıt|kart|durak|rota)";
const FIELD_TERMS = "(?:saat|zaman|tarih|baslangic|başlangıç|bitis|bitiş|durum|status|statu|konum|rota|durak|plaka|tutar|bedel|miktar|limit|sinir|sınır|tavan|taban|oran|kota|kapasite|ust\s+limit|üst\s+limit)";
const STRONG_FIELD_TERMS = "(?:saat|zaman|tarih|baslangic|başlangıç|bitis|bitiş|durum|status|statu|konum|plaka|tutar|bedel|miktar|limit|sinir|sınır|tavan|taban|oran|kota|kapasite|alan|deger|değer|ust\s+limit|üst\s+limit)";
const FINANCIAL_FIELD_ANCHORS = "(?:odeme|ödeme|maliyet|butce|bütçe|gelir|gider|fatura|tahsilat|finans|teklif)";
const FINANCIAL_METRIC_IDENTITY = "(?:tahmini\\s+maliyet|operasyonel\\s+maliyet(?:\\s+tahmini)?|teklif\\s+taban\\p{L}*|önerilen\\s+minimum\\s+teklif|tahmini\\s+k(?:âr|ar)\\p{L}*)";
const RISK_TERMS = "(?:risk|tehlike|riskli|degerlendir|değerlendir|analiz|maliyet\s+acisindan|maliyet\s+açısından)";
const COUNT_TERMS = "(?:toplam|sayı|kaç|kac|adet|tane)";
const PRODUCT_TERMS = "(?:vardiya|sefer|shift|sozlesme|sözleşme|anlasma|anlaşma|contract|teklif|arac|araç|surucu|sürücü|personel|kayit|kayıt|kart|durak|rota|planlama|ekran|panel|merkez|bolum|bölüm|alan|copilot|servisim|firmalar|operasyon|odeme|ödeme|tutar|maliyet|butce|bütçe|gelir|gider|fatura|tahsilat)";
const NON_PRODUCT_TOPIC_TERMS = "(?:evde|tatil|yemek|film|kitap|etkinlik|espri|saka|şaka|hikaye|hikâye|siir|şiir|doğum|dogum|müzik|muzik|misafir)";
const NON_PRODUCT_REQUEST_TERMS = "(?:oner|öner|fikir|yaz|hazirla|hazırla|uret|üret|anlat|ver|planla)";
const MUTATION_TERMS = "(?:güncelle|guncelle|düzenle|duzenle|ayarla|ileri\\s+al|geri\\s+al|değiştir|degistir)";

export const SEMANTIC_SPECIFICITY_CONTRACT = Object.freeze({
  id: "M18-SEMANTIC-SPECIFICITY-RESOLVER-AND-ANTI-LOOP-01",
  dimensions: Object.freeze(["REQUEST_MODE", "TASK", "TARGET", "REFERENCE", "AUTHORIZATION"]),
  genericFallbacks: Object.freeze(["SCREEN_CONTEXT", "ROLE_HELP", "GENERAL_INFORMATION", "GENUINE_OOS"]),
  specificEvidenceRules: Object.freeze([
    "CONCRETE_FIELD_BLOCKS_GENERIC_SCREEN_CONTEXT",
    "EXPLICIT_RISK_REQUIRES_ANALYTICAL_EVIDENCE",
    "CONCRETE_FIELD_OUTRANKS_GENERIC_COST_CUE",
    "COUNT_EVIDENCE_BLOCKS_ROLE_HELP",
    "PRODUCT_GROUNDING_BLOCKS_OOS_WITHOUT_POSITIVE_NON_PRODUCT_EVIDENCE",
    "VALID_CONTINUATION_STATE_PRESERVES_CONTINUATION",
    "AUTHORIZATION_FOLLOWS_SEMANTICS",
    "PREPARATION_EVIDENCE_BLOCKS_CREATE_AND_ROLE_HELP",
    "ROLE_CAPABILITY_HELP_OUTRANKS_GENERIC_SCREEN_CONTEXT",
  ]),
  authority: "SINGLE_TYPED_SEMANTIC_COMPOSITION",
});

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[’']/gu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function hasMatch(text, pattern) {
  return new RegExp(pattern, "iu").test(text);
}

// A quote-floor question asks for a computed financial preview. It must not
// be reduced to the scalar "taban" field of an arbitrary offer record. Keep
// the rule compositional: a floor concept and a calculation/question cue are
// both required, so ordinary record-field questions retain their precedence.
function hasQuoteFloorAnalysisEvidence(text) {
  const value = normalizeText(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/ı/g, "i");
  const floorConcept = /\b(?:teklif\s+taban\p{L}*|guvenli\s+taban\p{L}*|minimum\s+fiyat\p{L}*|quote\s+floor)\b/iu.test(value);
  const calculationQuestion = /\b(?:ne|nedir|toplam|toplami|kisi\s+basi|hesap|hesapla|hesaplandi|deger|degeri|oneri|onerilen|detay|ayrinti|ac|goster|gosterir|karsilastir|marj|kar)\p{L}*\b/iu.test(value);
  return floorConcept && calculationQuestion;
}

function hasQuoteFloorContextualFollowUpEvidence(text, conversationState = null) {
  const value = normalizeText(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/ı/g, "i");
  const deicticCalculation = /^(?:bu|bunun|bu\s+(?:tutar|deger|sonuc))\b.*\b(?:nasil|hesap|detay|ayrinti|neden|acikla|anlat)\p{L}*\b/iu.test(value);
  if (!deicticCalculation) return false;
  const previousRequest = conversationState?.lastSettledResult?.semanticPlan?.canonicalRequest
    || conversationState?.productContext?.semanticPlan?.canonicalRequest
    || conversationState?.lastSemanticPlan?.canonicalRequest
    || null;
  const previousRequestHasQuoteFloor = previousRequest?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true;
  const recentQuoteFloor = (Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages : [])
    .some((item) => /\b(?:teklif\s+taban\p{L}*|guvenli\s+taban\p{L}*|minimum\s+fiyat\p{L}*|quote\s+floor)\b/iu.test(normalizeText(item?.text)));
  return previousRequestHasQuoteFloor || recentQuoteFloor;
}

function hasWord(text, alternatives) {
  return hasMatch(text, `(?:^|[^\\p{L}\\p{N}])${alternatives}\\p{L}*(?=$|[^\\p{L}\\p{N}])`);
}

function hasConcreteFieldEvidence(text, evidence, inferred) {
  const typedField = evidence?.field?.value && String(evidence.field.value).toUpperCase() !== "NONE";
  const inferredFieldKeys = new Set(
    (Array.isArray(inferred?.requestedFields) ? inferred.requestedFields : [])
      .map((field) => String(field?.key || field || "").toUpperCase()),
  );
  // Product-field resolution is already owned by the canonical request
  // builder. Reuse that typed result here so an imperative presentation verb
  // (for example "göster") cannot demote a record-bound note/description
  // read to generic surface VIEW semantics.
  const inferredProductField = ["NOTE", "NOTE_COMPANY", "NOTE_ROOM"].some((key) => inferredFieldKeys.has(key));
  const roleHelpCandidate = evidence?.quality?.roleHelpCandidate === true;
  const targetRequest = String(evidence?.targetRequest?.value || "").toUpperCase();
  const roleAspect = String(evidence?.roleAspect?.value || "").toUpperCase();
  const roleHelpAspect = new Set([
    "CAPABILITY", "RESPONSIBILITY", "OWNERSHIP", "DECISION_RESPONSIBILITY",
    "PROCESS_RESPONSIBILITY", "BOUNDARY", "LIMITATION", "ORIENTATION", "STARTING_GUIDANCE",
  ]).has(roleAspect);
  // Ambiguous product terms such as route/stop can belong to both the
  // product-area vocabulary and the field vocabulary.  When the typed
  // extractor has already classified the request as role help over a
  // product area, lexical co-occurrence alone is not concrete field
  // evidence. A real field remains authoritative through evidence.field.
  const explicitStrongFieldCue = hasMatch(text, `\\b${STRONG_FIELD_TERMS}\\p{L}*\\b`);
  if (roleHelpCandidate && !typedField && targetRequest === "PRODUCT_AREA" && roleHelpAspect && !explicitStrongFieldCue) return false;
  const recordToField = hasMatch(text, `\\b${RECORD_TERMS}\\p{L}*(?:\\s+\\p{L}+){0,6}\\s+${FIELD_TERMS}\\p{L}*\\b`);
  const fieldToRecord = hasMatch(text, `\\b${FIELD_TERMS}\\p{L}*(?:\\s+\\p{L}+){0,6}\\s+${RECORD_TERMS}\\p{L}*\\b`);
  // A product-level financial property question is a concrete field request
  // even when it intentionally has no selected record.  The canonical
  // contract grounds it as RECORD with an ABSENT reference; authorization
  // remains downstream and record-specific variants still require a real
  // referent.
  const financialFieldQuestion = hasMatch(
    text,
    `(?:^|[^\\p{L}\\p{N}])${FINANCIAL_FIELD_ANCHORS}\\p{L}*(?:\\s+\\p{L}+){0,6}\\s+${FIELD_TERMS}\\p{L}*(?=$|[^\\p{L}\\p{N}])`,
  ) && hasMatch(text, "\\b(?:ne|nedir|kac|kaç|hangi|ne\\s+kadar)\\b");
  return Boolean(typedField || inferredProductField || recordToField || fieldToRecord || financialFieldQuestion);
}

function hasFinancialMetricIdentityEvidence(text, { conversationState = null, context = null } = {}) {
  const metricSelection = hasMatch(text, `\\b${FINANCIAL_METRIC_IDENTITY}\\b`);
  const surfaceText = [
    context?.currentSurface?.path,
    context?.currentSurface?.label,
    conversationState?.lastScreenPath,
    conversationState?.costAnalysisState?.lastScreenPath,
  ].filter(Boolean).join(" ");
  const financialSurface = /(?:financial-operations|teklif\\s+ve\\s+k[âa]rl[ıi]l[ıi]k|maliyet\\s+ve\\s+teklif)/iu.test(surfaceText);
  const prior = conversationState?.lastSettledResult?.semanticPlan?.canonicalRequest
    || conversationState?.productContext?.semanticPlan?.canonicalRequest
    || conversationState?.lastSemanticPlan?.canonicalRequest
    || null;
  const recentFinancial = (Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages : [])
    .some((item) => hasMatch(
      normalizeText(item?.text),
      `(?:finans(?:al)?|teklif|tahmini\s+maliyet|operasyonel\s+maliyet|k[âa]r|tutar)`,
    ));
  const priorFinancial = String(prior?.domain || "").toUpperCase() === "FINANCE"
    || String(prior?.typedEvidence?.object?.value || "").toUpperCase() === "FINANCIAL"
    || Boolean(conversationState?.costAnalysisState?.lastMetricIdentity)
    || recentFinancial;
  const sourceFollowUp = hasMatch(text, "\\b(?:kayna\\p{L}*|dayana\\p{L}*|hesaplama\\p{L}*|temel\\p{L}*|provenans\\p{L}*)\\b");
  return (metricSelection && (financialSurface || priorFinancial)) || (sourceFollowUp && priorFinancial);
}

function hasExplicitAnalyticalEvidence(text, conversationState = null, context = null) {
  const financialSourceExplanation = hasMatch(
    text,
    `\\b${FINANCIAL_FIELD_ANCHORS}\\p{L}*(?:\\s+\\p{L}+){0,6}\\s+(?:kayna\\p{L}*|dayanak\\p{L}*|acikla\\p{L}*|anlat\\p{L}*|geliyor\\p{L}*)\\b`,
  ) || hasMatch(
    text,
    `\\b(?:kayna\\p{L}*|dayanak\\p{L}*|acikla\\p{L}*|anlat\\p{L}*|geliyor\\p{L}*)\\b(?:\\s+\\p{L}+){0,6}\\s+${FINANCIAL_FIELD_ANCHORS}\\p{L}*\\b`,
  );
  return hasMatch(text, `\\b${RISK_TERMS}\\p{L}*\\b`)
    || hasMatch(text, "\\b(?:mali|mâli)\\s+risk\\p{L}*\\b")
    || hasMatch(text, "\\b(?:risk|maliyet)\\p{L}*\\s+(?:analiz|degerlendir|değerlendir)\\p{L}*\\b")
    || financialSourceExplanation
    || hasFinancialMetricIdentityEvidence(text, { conversationState, context });
}

function hasCardinalityEvidence(text, evidence, inferred) {
  const typedCardinality = evidence?.cardinality?.value && String(evidence.cardinality.value).toUpperCase() !== "NONE";
  const inferredCount = ["COUNT"].includes(String(inferred?.taskType || "").toUpperCase());
  const morphology = hasMatch(text, `\\b${COUNT_TERMS}\\p{L}*\\b`)
    && hasMatch(text, `\\b(?:${RECORD_TERMS})\\p{L}*\\b`);
  return Boolean(typedCardinality || inferredCount || morphology);
}

function hasCapabilityOrPermissionEvidence(text, evidence) {
  return String(evidence?.roleAspect?.value || "").toUpperCase() === "CAPABILITY"
    || String(evidence?.roleAspect?.value || "").toUpperCase() === "BOUNDARY"
    || hasWord(text, "(?:yetki|izin|izn|erişim|erisim|yapabilir|değiştirebilir|degistirebilir|düzenleyebilir|duzenleyebilir|güncelleyebilir|guncelleyebilir)");
}

function hasRoleCapabilityExplanationEvidence(evidence) {
  return evidence?.quality?.roleHelpCandidate === true
    && String(evidence?.requestMode?.value || "").toUpperCase() === "EXPLAIN"
    && String(evidence?.subject?.value || "").toUpperCase() === "ROLE"
    && String(evidence?.roleAspect?.value || "").toUpperCase() === "CAPABILITY"
    && String(evidence?.productHelp?.value || "").toUpperCase() === "CAPABILITY_GUIDANCE"
    && String(evidence?.targetRequest?.value || "").toUpperCase() === "PRODUCT_AREA";
}

function hasSurfaceHelpEvidence(text, evidence, inferred) {
  const roleProductAreaHelp = evidence?.quality?.roleHelpCandidate === true
    && String(evidence?.targetRequest?.value || "").toUpperCase() === "PRODUCT_AREA"
    && String(evidence?.object?.value || "").toUpperCase() !== "SURFACE";
  // Product-area role help may mention an "alan", "bölüm" or a task noun.
  // Those words are not current-surface evidence when typed role evidence has
  // already established a reference-less EXPLAIN request. An explicit named
  // surface remains eligible through the typed SURFACE target path.
  if (roleProductAreaHelp) return false;
  const typedSurface = String(evidence?.object?.value || "").toUpperCase() === "SURFACE"
    || String(evidence?.targetRequest?.value || "").toUpperCase() === "SURFACE";
  const surfaceLabel = hasWord(text, "(?:ekran|sayfa|panel|menu|planlama|sistem|merkez|alan|bölüm|bolum|görünüm|gorunum|çalışma|calisma)");
  const purposeCue = hasMatch(text, "(?:ne\\s+ise\\s+yar|amac|amaç|kullan|anlat|acikla|açıkla|görev|gorev|işlev|islev|yön|yon|başlangıç|baslangic|özet|ozet|sıra|sira)");
  return (typedSurface || surfaceLabel) && purposeCue
    && (inferred?.screenContextIntent === true
      || inferred?.screenKnowledgeIntent === true
      || inferred?.roleHelpIntent === true
      || surfaceLabel);
}

function hasPreparationEvidence(text) {
  const preparation = hasMatch(text, "\\b(?:hazır|hazir|hazırlık|hazirlik|kontrol\\s+(?:listesi|noktaları|sırası|sirasi|sırasını|sirasini|adımları|adimlari)|başlangıç\\s+adımları|baslangic\\s+adimlari)\\p{L}*\\b");
  const boundary = hasMatch(text, "\\b(?:açmadan|acmadan|oluşturmadan|olusturmadan|yaratmadan|başlamadan|baslamadan|açılış|acilis|oluşturma|olusturma|önce|once|öncesi|oncesi)\\p{L}*\\b");
  return preparation && boundary;
}

function hasNavigationEvidence(text, evidence, inferred) {
  const requestMode = String(evidence?.requestMode?.value ?? evidence?.requestMode ?? inferred?.requestMode?.value ?? inferred?.requestMode ?? "").toUpperCase();
  // Movement morphology is structural evidence even when the typed composer
  // also observes a guidance verb. Showing a surface remains VIEW unless a
  // movement predicate is present.
  const movement = hasWord(text, "(?:geç|git|gid|aç|yonlendir|yönlendir|ulaş|ulas|ilerle|dön|don|gidelim|geçelim)");
  const target = hasWord(text, "(?:ekran|sayfa|panel|merkez|bölüm|bolum|alan|görünüm|gorunum|copilot|servisim|firmalar|liste|sözleşme|sozlesme|vardiya|sefer|rota|teklif)");
  const liveSurfaceTarget = String(inferred?.workflowIntent || "").toUpperCase() === "OPEN_SURFACE"
    && Boolean(inferred?.currentTargetReference?.targetKey)
    && String(inferred?.targetEntityType || "").toUpperCase() === "SURFACE";
  // A canonical live-control match is already structural navigation evidence.
  // Do not require the visible control's label to be a generic surface noun;
  // labels such as "Canlı Takip" are valid product destinations in their own
  // right. The inferred target is still supplied by the current UI envelope,
  // while authorization remains downstream.
  return liveSurfaceTarget || (requestMode === "NAVIGATE" && movement && target);
}

function hasIssueSurfaceViewEvidence(text, evidence, inferred) {
  const requestMode = String(evidence?.requestMode?.value ?? evidence?.requestMode ?? "").toUpperCase();
  if (!["VIEW", "NAVIGATE"].includes(requestMode)) return false;
  const liveSurfaceContext = String(inferred?.workflowIntent || "").toUpperCase() === "OPEN_SURFACE"
    && Boolean(inferred?.currentTargetReference?.targetKey)
    && String(inferred?.targetEntityType || "").toUpperCase() === "SURFACE";
  if (!liveSurfaceContext) return false;
  const issueSubject = hasWord(text, "(?:sorun|problem|aksak|aksaklık|aksaklik|arıza|ariza)");
  const showAction = hasWord(text, "(?:göster|goster|aç|ac|götür|gotur|gör|gor|incele|bul)");
  return issueSubject && showAction;
}

function hasExplicitSurfaceViewEvidence(text, evidence, inferred) {
  const requestMode = String(evidence?.requestMode?.value ?? evidence?.requestMode ?? "").toUpperCase();
  const object = String(evidence?.object?.value || inferred?.targetEntityType || "").toUpperCase();
  if (object !== "SURFACE") return false;
  return requestMode === "VIEW"
    && hasWord(text, "(?:görüntüle|goruntule|listele|incele|izle|getir|bak|gör|gor|göster|goster)");
}

function hasExplicitCreateEvidence(text, evidence, inferred) {
  // Permission/capability questions describe whether creation is allowed;
  // they do not request creation.  Keep the semantic capability check ahead
  // of the workflow-intent hint so authorization remains downstream of the
  // correct user task.
  if (hasCapabilityOrPermissionEvidence(text, evidence)) return false;
  const surfaceMovement = hasMatch(text, "\\b(?:ekran|sayfa|panel|merkez|bölüm|bolum|görünüm|gorunum|liste|menü|menu)\\p{L}*\\b")
    && hasMatch(text, "\\b(?:geç|gec|git|gid|aç|ac|ulaş|ulas|ilerle|dön|don|gidelim|geçelim)\\p{L}*\\b");
  if (surfaceMovement) return false;
  const workflowIntent = String(inferred?.workflowIntent || "").toUpperCase();
  if (workflowIntent === "CREATE_SHIFT") return true;
  const requestMode = String(evidence?.requestMode?.value || evidence?.requestMode || "").toUpperCase();
  return requestMode === "CREATE"
    && hasWord(text, "(?:vardiya|sefer|shift|kayıt|kayit|plan)")
    && hasWord(text, "(?:oluştur|olustur|yarat|yaratıl|yaratil|başlat|baslat|kaydet|ekle|aç|ac)");
}

function hasSurfaceNavigationTarget(text) {
  return hasWord(text, "(?:ekran|sayfa|panel|merkez|bölüm|bolum|alan|görünüm|gorunum|copilot|servisim|firmalar)");
}

function hasExplicitMutationEvidence(text) {
  if (hasMatch(text, "\\b(?:değiştir|degistir|düzenle|duzenle|güncelle|guncelle)\\w*(?:ebilir|abilir)\\b")) return false;
  if (hasWord(text, "(?:yetki|izin|izn|erişim|erisim)")) return false;
  return hasMatch(text, `\\b${MUTATION_TERMS}(?:mek|mak|me|ma|sin|sın|abilir|ebilir|yebilir|yabilir)?\\b`)
    && !hasMatch(text, "\\b(?:mümkün|mumkun)\\b");
}

function hasConcreteTargetEvidence(text, evidence, inferred) {
  const objectValue = String(evidence?.object?.value || "NONE").toUpperCase();
  const inferredTarget = String(inferred?.targetEntityType || "").toUpperCase();
  return objectValue !== "NONE" && objectValue !== "SURFACE" && objectValue !== "PRODUCT_AREA"
    || Boolean(inferredTarget && !["NONE", "SURFACE", "PRODUCT_AREA"].includes(inferredTarget))
    || hasWord(text, RECORD_TERMS);
}

function hasPositiveNonProductEvidence(text, evidence) {
  const objectValue = String(evidence?.object?.value || "NONE").toUpperCase();
  const explicitProductText = hasWord(text, PRODUCT_TERMS)
    || hasWord(text, "(?:ekran|sayfa|panel|menu|planlama|sistem)");
  const concreteDomain = Array.isArray(evidence?.domainEvidence)
    && evidence.domainEvidence.some((entry) => entry?.kind === "CONCRETE_DOMAIN");
  const concreteProductObject = objectValue !== "NONE"
    && objectValue !== "SURFACE"
    && objectValue !== "RECORD";
  const hasProductEvidence = concreteProductObject
    || explicitProductText
    || concreteDomain;
  const nonProductTopic = hasWord(text, NON_PRODUCT_TOPIC_TERMS);
  const nonProductRequest = hasWord(text, NON_PRODUCT_REQUEST_TERMS)
    || hasMatch(text, "\\b(?:hazırla|hazirla|planla|öner|oner|üret|uret)\\p{L}*\\b");
  const externalDomain = Array.isArray(evidence?.domainEvidence)
    && evidence.domainEvidence.some((entry) => entry?.kind === "EXTERNAL_DOMAIN");
  // A typed external-domain fact is itself affirmative non-product evidence.
  // Requiring an additional topic/request vocabulary here made arithmetic
  // resolve to OFF_TOPIC_GENUINE scope while leaving the canonical action
  // unresolved. Product words still veto this path through hasProductEvidence.
  // A generic RECORD inference from external wording (for example a music
  // list) is not enough to veto a typed external domain. Explicit product
  // vocabulary or a concrete product object still retains precedence.
  const positiveExternalDomain = externalDomain
    && !explicitProductText
    && !concreteDomain
    && !concreteProductObject;
  return !hasProductEvidence && nonProductTopic && nonProductRequest
    || positiveExternalDomain;
}

function targetTypeFromEvidence(evidence, inferred) {
  return inferred?.targetEntityType
    || (String(evidence?.object?.value || "").toUpperCase() !== "NONE" ? evidence.object.value : null)
    || null;
}

function requiresConcreteReferenceResolution(evidence) {
  const reference = String(evidence?.reference?.value || "").toUpperCase();
  const object = String(evidence?.object?.value || "").toUpperCase();
  return ["AMBIGUOUS", "UNRESOLVED", "REJECTED_STALE", "STALE"].includes(reference)
    && object !== "SURFACE";
}

function taskShapeOverrides(taskType, { evidence, inferred } = {}) {
  const targetEntityType = targetTypeFromEvidence(evidence, inferred);
  const domain = inferred?.domain || null;
  if (taskType === "OFF_TOPIC") {
    return {
      taskType,
      generalCreativeIntent: true,
      generalInformationIntent: false,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      explicitTaskIntent: false,
      explicitUserTarget: false,
      targetEntityType: null,
      targetCandidates: [],
      scopeTarget: "NONE",
      ambiguity: null,
      domain: null,
    };
  }
  if (taskType === "COUNT") {
    return {
      taskType,
      requestedTasks: ["COUNT"],
      countTarget: inferred?.countTarget || (targetEntityType ? { targetEntityType, domain } : null),
      explicitCardinalityTarget: true,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitTaskIntent: true,
      explicitUserTarget: Boolean(targetEntityType),
      targetEntityType,
      scopeTarget: inferred?.scopeTarget || "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  if (taskType === "SCREEN_CONTEXT") {
    return {
      taskType,
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: true,
      screenDetailIntent: true,
      screenKnowledgeIntent: true,
      explicitTaskIntent: true,
      explicitUserTarget: true,
      targetEntityType: "SURFACE",
      scopeTarget: "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  if (taskType === "NAVIGATION") {
    return {
      taskType: "SCREEN_CONTEXT",
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: true,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitTaskIntent: true,
      explicitUiGuidance: true,
      targetEntityType,
      scopeTarget: inferred?.scopeTarget || "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  if (taskType === "VIEW") {
    return {
      taskType: "VIEW",
      requestedTasks: ["VIEW"],
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: true,
      explicitTaskIntent: true,
      explicitUserTarget: Boolean(targetEntityType),
      targetEntityType,
      scopeTarget: inferred?.scopeTarget || "CURRENT_SCREEN",
      ambiguity: null,
    };
  }
  if (taskType === "UPDATE") {
    return {
      taskType: "UPDATE",
      requestedTasks: ["UPDATE"],
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: false,
      explicitTaskIntent: true,
      explicitUserTarget: Boolean(targetEntityType),
      targetEntityType,
      scopeTarget: inferred?.scopeTarget || "CURRENT_SCREEN",
      ambiguity: null,
      capabilityIntent: false,
      mutationIntent: true,
    };
  }
  if (taskType === "CREATE") {
    return {
      taskType: "CREATE",
      requestedTasks: ["CREATE_SHIFT"],
      generalProductHelpIntent: false,
      roleHelpIntent: false,
      screenContextIntent: false,
      screenDetailIntent: false,
      screenKnowledgeIntent: false,
      explicitUiGuidance: true,
      explicitTaskIntent: true,
      explicitUserTarget: Boolean(targetEntityType),
      targetEntityType: targetEntityType || "SHIFT",
      scopeTarget: inferred?.scopeTarget || "CURRENT_SCREEN",
      workflowIntent: inferred?.workflowIntent || null,
      ambiguity: null,
    };
  }
  if (!["FIELD_LOOKUP", "RISK"].includes(taskType)) return null;
  return {
    taskType,
    requestedTasks: [taskType],
    generalProductHelpIntent: false,
    roleHelpIntent: false,
    screenContextIntent: false,
    screenDetailIntent: false,
    screenKnowledgeIntent: false,
    explicitUiGuidance: false,
    workflowIntent: null,
    workflowModel: null,
    workflowStepIntent: false,
    explicitTaskIntent: true,
    explicitUserTarget: Boolean(targetEntityType),
    targetEntityType,
    ...(taskType === "FIELD_LOOKUP" ? { capabilityIntent: true, capabilityEvidence: true } : {}),
    scopeTarget: inferred?.scopeTarget || "CURRENT_SCREEN",
    ambiguity: null,
    ...(taskType === "RISK" ? { requestedTasks: ["RISK"], domain: inferred?.domain || "BUDGET" } : {}),
  };
}

/**
 * The sole cross-dimension specificity decision point for the typed authority.
 * Feature extraction remains elsewhere; this function only composes the
 * already-observed evidence and returns deterministic shape/evidence changes.
 */
export function resolveSemanticSpecificity({ message, evidence = {}, inferred = {}, context = {}, conversationState = null } = {}) {
  const text = normalizeText(message);
  const quoteFloorAnalysisEvidence = hasQuoteFloorAnalysisEvidence(text)
    || hasQuoteFloorContextualFollowUpEvidence(text, conversationState);
  const concreteFieldEvidence = hasConcreteFieldEvidence(text, evidence, inferred) && !quoteFloorAnalysisEvidence;
  const financialMetricIdentityEvidence = hasFinancialMetricIdentityEvidence(text, { conversationState, context });
  const explicitAnalyticalEvidence = hasExplicitAnalyticalEvidence(text, conversationState, context) || quoteFloorAnalysisEvidence;
  const cardinalityEvidence = hasCardinalityEvidence(text, evidence, inferred);
  const navigationEvidence = hasNavigationEvidence(text, evidence, inferred);
  const capabilityEvidence = hasCapabilityOrPermissionEvidence(text, evidence);
  const liveCanonicalTargetViewEvidence = Boolean(inferred?.currentTargetReference?.targetKey)
    && String(evidence?.requestMode?.value || "").toUpperCase() === "VIEW"
    && inferred?.explicitUiGuidance === true
    && ["VEHICLE", "DRIVER"].includes(String(inferred?.targetEntityType || "").toUpperCase());
  const explicitMutationEvidence = hasExplicitMutationEvidence(text);
  const explicitCreateEvidence = hasExplicitCreateEvidence(text, evidence, inferred);
  const preparationEvidence = hasPreparationEvidence(text);
  const issueSurfaceViewEvidence = hasIssueSurfaceViewEvidence(text, evidence, inferred);
  const explicitSurfaceViewEvidence = hasExplicitSurfaceViewEvidence(text, evidence, inferred)
    || issueSurfaceViewEvidence;
  const positiveNonProductEvidence = hasPositiveNonProductEvidence(text, evidence);
  const concreteTargetEvidence = hasConcreteTargetEvidence(text, evidence, inferred);
  const surfaceHelpEvidence = hasSurfaceHelpEvidence(text, evidence, inferred);
  const roleCapabilityExplanationEvidence = hasRoleCapabilityExplanationEvidence(evidence);
  const navigationTargetClass = navigationEvidence && (
    hasSurfaceNavigationTarget(text)
      || String(inferred?.targetEntityType || "").toUpperCase() === "SURFACE"
      || Boolean(inferred?.currentTargetReference?.targetKey)
  ) ? "SURFACE" : null;
  const referenceRequiresResolution = requiresConcreteReferenceResolution(evidence);
  const continuationEvidence = String(evidence?.requestMode?.value || "").toUpperCase() === "CONTINUE"
    || String(inferred?.taskType || "").toUpperCase() === "CONTINUE_CURRENT_REASONING"
    || Boolean(context?.continuity?.continuation?.status === "VALID");

  let selectedTask = null;
  if (positiveNonProductEvidence) selectedTask = "OFF_TOPIC";
  else if (continuationEvidence) selectedTask = null;
  else if (referenceRequiresResolution) selectedTask = null;
  else if (explicitMutationEvidence && concreteTargetEvidence && !explicitAnalyticalEvidence) selectedTask = "UPDATE";
  else if (explicitCreateEvidence && !explicitAnalyticalEvidence) selectedTask = "CREATE";
  else if (preparationEvidence && !explicitAnalyticalEvidence) selectedTask = "SCREEN_CONTEXT";
  else if (explicitAnalyticalEvidence && !concreteFieldEvidence) selectedTask = "RISK";
  else if (explicitSurfaceViewEvidence && !concreteFieldEvidence) selectedTask = "VIEW";
  else if (liveCanonicalTargetViewEvidence) selectedTask = "NAVIGATION";
  else if (navigationEvidence && navigationTargetClass === "SURFACE") selectedTask = "NAVIGATION";
  else if (inferred?.collectionSummaryIntent) selectedTask = "COUNT";
  else if (concreteFieldEvidence
    // Current-screen purpose remains authoritative for operation-inventory
    // questions even when selected-record evidence exposes record fields.
    // The selection grounds the explanation; it does not make the request a
    // scalar field lookup.
    && String(inferred?.screenKnowledgeKind || "").toUpperCase() !== "SCREEN_PURPOSE"
    && !inferred?.roleHelpIntent
    && !inferred?.generalProductHelpIntent
    && String(inferred?.taskType || "").toUpperCase() !== "RECORD_DETAILS"
    && !explicitAnalyticalEvidence) selectedTask = "FIELD_LOOKUP";
  else if (capabilityEvidence
    && concreteTargetEvidence
    && String(inferred?.screenKnowledgeKind || "").toUpperCase() !== "SCREEN_PURPOSE"
    && !inferred?.roleHelpIntent
    && !inferred?.generalProductHelpIntent
    && String(inferred?.taskType || "").toUpperCase() !== "RECORD_DETAILS"
    && !explicitAnalyticalEvidence) selectedTask = "FIELD_LOOKUP";
  else if (cardinalityEvidence && !concreteFieldEvidence && !explicitAnalyticalEvidence) selectedTask = "COUNT";
  else if (navigationEvidence) selectedTask = "NAVIGATION";
  else if (surfaceHelpEvidence) selectedTask = "SCREEN_CONTEXT";

  const blocksGenericFallback = Boolean(selectedTask && ["OFF_TOPIC", "FIELD_LOOKUP", "COUNT", "RISK", "SCREEN_CONTEXT", "NAVIGATION", "VIEW", "UPDATE", "CREATE"].includes(selectedTask));
  const inferredOverrides = selectedTask ? taskShapeOverrides(selectedTask, { evidence, inferred }) : {};
  const quoteFloorOverrides = quoteFloorAnalysisEvidence && selectedTask === "RISK"
    ? {
      ...inferredOverrides,
      domain: "BUDGET",
      targetEntityType: null,
      targetCandidates: [],
      explicitUserTarget: true,
      scopeTarget: "CURRENT_SCREEN",
    }
    : inferredOverrides;
  const requestModeOverride = selectedTask === "OFF_TOPIC"
    ? "GENUINE_OOS"
    : selectedTask === "SCREEN_CONTEXT"
      ? "EXPLAIN"
    : selectedTask === "NAVIGATION"
      ? "NAVIGATE"
    : selectedTask === "VIEW"
      ? "VIEW"
    : selectedTask === "UPDATE"
      ? "UPDATE"
    : selectedTask === "CREATE"
      ? "CREATE"
    : ["FIELD_LOOKUP", "RISK"].includes(selectedTask)
      ? "EXPLAIN"
      : null;

  return Object.freeze({
    text,
    concreteFieldEvidence,
    explicitAnalyticalEvidence,
    financialMetricIdentityEvidence,
    quoteFloorAnalysisEvidence,
    cardinalityEvidence,
    navigationEvidence,
    navigationTargetClass,
    issueSurfaceViewEvidence,
    explicitMutationEvidence,
    explicitCreateEvidence,
    explicitSurfaceViewEvidence,
    preparationEvidence,
    capabilityEvidence,
    roleCapabilityExplanationEvidence,
    concreteTargetEvidence,
    positiveNonProductEvidence,
    referenceRequiresResolution,
    continuationEvidence,
    selectedTask,
    blocksGenericFallback,
    requestModeOverride,
    inferredOverrides: Object.freeze(quoteFloorOverrides),
  });
}

export function applySemanticSpecificityResolution(shape, resolution) {
  if (!resolution?.selectedTask) return shape;
  return {
    ...shape,
    ...resolution.inferredOverrides,
  };
}

export function applySemanticSpecificityEvidence(evidence, resolution) {
  if (!resolution) return evidence;
  const quality = {
    ...(evidence?.quality || {}),
    genuineOosEvidence: Boolean(evidence?.quality?.genuineOosEvidence || resolution.positiveNonProductEvidence),
    roleHelpCandidate: resolution.blocksGenericFallback ? false : Boolean(evidence?.quality?.roleHelpCandidate),
  };
  const requestMode = resolution.requestModeOverride
    ? { ...(evidence?.requestMode || {}), value: resolution.requestModeOverride }
    : evidence?.requestMode;
  return {
    ...evidence,
    ...(requestMode ? { requestMode } : {}),
    quality,
    specificity: resolution,
  };
}
