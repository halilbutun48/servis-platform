import { buildCopilotPayload, getShiftContext, getVehicleContext } from "./tools.js";
import { buildJobGuideResponse } from "./jobGuide/index.js";
import { buildIfStuck, buildQuickActions } from "./jobGuide/quickActions.js";
import { normalizeGuideLevel } from "./jobGuide/levels.js";
import { buildCanonicalProductKnowledgeInventory, getScreenDefinitionForUser, resolveAuthorizedScreenContext } from "./jobGuide/screenCatalog.js";
import { resolveChatContext } from "./chat/contextResolver.js";
import { buildChatHelpResponse, buildGenericProductHelpResponse } from "./chat/helpComposer.js";
import { buildProductOverviewHelpReply, buildProductTeachingReply, buildRoleExplanationHelpReply } from "./chat/conversationTaskStateBuilders.js";
import { buildSeferAbiCostAnalysisResponse, detectCostAnalysisIntent } from "./chat/seferAbiCostAnalysisAssistant.js";
import { getEtaDisplay, getGpsAgeText, getGpsReliabilityLabel, normalizeGpsFreshness } from "./chat/etaSanity.js";
import { ACTIONABLE_EVENT_SOURCE_ID, buildActionableAnswer, buildActionableEventsForUser } from "../services/actionableEvents.js";
import { buildAuthorizedProductAwarenessAnswer, buildAuthorizedReasoningAnswer, buildVisibleFactText, resolveAuthorizedProductDomains } from "../services/authorizedProductAwareness.js";
import { isCurrentSituationDiagnosticQuestion } from "./chat/intentRouter.js";
import { buildConversationRoutingResponse } from "./chat/conversationRouting.js";
import { COMPANY_GUIDED_NEW_PLAN_WORKFLOW, resolveCanonicalConversationRequest } from "./chat/canonicalSemanticRequest.js";
import { buildCanonicalSemanticContext } from "./chat/canonicalSemanticContext.js";
import { resolveSemanticIntent } from "./chat/semanticIntentPlanner.js";
import { authorizeSemanticRequest } from "./chat/authorizationGate.js";
import { commitCanonicalConversationState, getCanonicalConversationState } from "./chat/canonicalConversationState.js";
import { normalizeSeferAbiUserFacingPayload } from "./chat/userFacingLanguageNormalizer.js";
import { GUIDED_TARGET_STATUSES, resolveCopilotGuidedTarget } from "./chat/copilotUiElementAnchor.js";
import { requestLocalSemanticProposal } from "./chat/localSemanticProposal.js";

function hasCanonicalCostIntent(semanticPlan) {
  const request = semanticPlan?.canonicalRequest;
  if (!['SEFER-ABI-CANONICAL-REQUEST-V2', 'SEFER-ABI-CANONICAL-REQUEST-V3'].includes(request?.version)) return false;
  return request.operation === "ASSESS_CURRENT_RISK"
    || ["BUDGET", "FINANCE"].includes(String(request.domain || "").toUpperCase())
    || request.capability === "COST_ANALYSIS";
}

function hasCanonicalQuoteFloorEvidence(semanticPlan) {
  const request = semanticPlan?.canonicalRequest;
  return request?.domain === "BUDGET"
    && request?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true;
}

function roleGlobalActionableFallbackAllowed(semanticPlan, _conversationState) {
  if (!semanticPlan || semanticPlan.planStatus !== "READY") return false;
  // A role-global actionable queue is a last resort.  A narrower valid task
  // owns the turn even when its honest result is NO_DATA, UNKNOWN, or
  // INSUFFICIENT_EVIDENCE; those terminal states are not permission to answer
  // a different question from the role-global queue.
  if (["CURRENT_SCREEN", "SELECTED_RECORD", "NONE"].includes(semanticPlan.scopeTarget)) return false;
  if (semanticPlan.comparisonSpec || semanticPlan.entities?.length > 1 || semanticPlan.activeEntitySet?.length > 1) return false;
  if (semanticPlan.typedRequest?.generalInformationIntent || semanticPlan.typedRequest?.generalCreativeIntent) return false;
  if (semanticPlan.clarificationNeed || semanticPlan.family === "STYLE") return false;
  // A terminal result from the *current* narrower request returns before this
  // fallback site.  A terminal result from an earlier turn must not suppress
  // a new, explicit ROLE_GLOBAL request in the same authorized conversation.
  // This admission point therefore reasons only about the frozen current plan.
  return semanticPlan.scopeTarget === "ROLE_GLOBAL";
}

function hasScreenIdentityHint(screenContext = {}, entityType = "", entityId = null) {
  return Boolean(
    String(screenContext?.path || "")
    || Number(screenContext?.id || screenContext?.entityId || (entityType === "screen" ? entityId : 0)) > 0,
  );
}

function copyClientSelectionHints(screenContext = {}) {
  return {
    selectedLabel: String(screenContext?.selectedLabel || screenContext?.selectedRecordLabel || ""),
    selectedEntityType: String(screenContext?.selectedEntityType || ""),
    selectedEntityId: Number(screenContext?.selectedEntityId || 0) || null,
    selectedRelatedEntityType: String(screenContext?.selectedRelatedEntityType || ""),
    selectedRelatedEntityId: Number(screenContext?.selectedRelatedEntityId || 0) || null,
    selectedEntitySet: Array.isArray(screenContext?.selectedEntitySet) ? screenContext.selectedEntitySet : [],
  };
}

export function resolveIncomingCopilotScreenContext({ user, screenContext, entityType, entityId } = {}) {
  if (!hasScreenIdentityHint(screenContext, entityType, entityId)) return null;
  const requestedId = entityType === "screen" && Number(entityId) > 0
    ? Number(entityId)
    : Number(screenContext?.id || screenContext?.entityId || 0) || null;
  const resolved = resolveAuthorizedScreenContext(user, screenContext || {}, requestedId);
  if (!resolved.screen) {
    const error = new Error("SCREEN_CONTEXT_NOT_AUTHORIZED");
    error.status = 400;
    error.code = "SCREEN_CONTEXT_NOT_AUTHORIZED";
    error.screenContextStatus = resolved.status;
    throw error;
  }
  return {
    ...copyClientSelectionHints(screenContext),
    id: Number(resolved.screen.id),
    path: resolved.screen.path,
    label: resolved.screen.label,
    role: resolved.effectiveRoleKey,
    companyKind: String(user?.companyKind || "").toUpperCase(),
    catalogRoleKey: resolved.screen.catalogRoleKey,
    // The browser surface is evidence for this turn only. The canonical
    // conversation state sanitizes it before any semantic target resolution.
    uiHints: screenContext?.uiHints && typeof screenContext.uiHints === "object"
      ? screenContext.uiHints
      : {},
  };
}

function buildGenericProductHelpProjection({ message, semanticPlan, user = null, screenContext = null }) {
  // Product-overview language is safe to answer without records, but an
  // authenticated in-product turn should still explain the user's actual
  // role and current authorized surface.  Keep the context-free projection
  // for unauthenticated/no-screen requests; use the existing role playbook
  // for current UI guidance without adding a second semantic authority.
  const contextual = Boolean(screenContext?.path && user?.role);
  const screenDefinition = contextual
    ? getScreenDefinitionForUser(user, screenContext, Number(screenContext?.id || 0) || null)
    : null;
  const roleHelp = semanticPlan?.family === "ROLE_EXPLANATION_HELP";
  const roleCapabilityReply = contextual && roleHelp
    ? buildRoleExplanationHelpReply({
      message,
      userRole: user?.role,
      user,
      roleMode: "FULL",
      screenDefinition: null,
      screenContext: null,
    })
    : "";
  const replyState = contextual
    && !roleHelp
    ? buildProductTeachingReply({
      message,
      userRole: user?.role,
      user,
      sectionIndex: roleHelp ? 1 : 0,
    })
    : null;
  const reply = contextual
    ? roleHelp ? roleCapabilityReply : replyState.reply
    : buildGenericProductHelpResponse({ message, semanticPlan });
  return {
    ok: true,
    copilotVersion: "ROUND-10-GENERIC-PRODUCT-HELP",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: "Genel ürün yardımı",
    provider: "local-static-product-help",
    providerSummary: contextual ? "role-scoped-product-help" : "context-free-generic-product-help",
    mode: "RULE_BASED",
    // Keep this projection context-free. Authenticated identity and persisted
    // route-bound context remain internal to the lifecycle owner for a later,
    // freshly authorized contextual request.
    scope: contextual
      ? { role: String(user?.role || ""), companyKind: String(user?.companyKind || ""), summary: "Rol ve yetkili mevcut ekran yüzeyi üzerinden ürün yardımı; kayıt verisi okunmadı." }
      : { summary: "Genel ürün açıklaması; ekran, kayıt, rol veya tenant verisi kullanılmadı." },
    reply,
    summary: reply,
    contextSummary: contextual
      ? `Bu tur, ${String(screenContext?.label || "yetkili ekran")} ve ${String(user?.role || "mevcut rol")} bağlamında ürün rehberliği verdi; kayıt verisi okunmadı.`
      : "Bu tur, kayıt veya mevcut ekran bağlamı kullanmadan genel ürün açıklaması verdi.",
    questionType: "GENERIC_PRODUCT_HELP",
    activeTopic: "GENERIC_PRODUCT_HELP",
    assistantIntent: "GENERIC_PRODUCT_HELP",
    authorizedDomainMap: [],
    authorizedRecords: [],
    retrievedFacts: [],
    responseSections: [{ title: "SeferPakt", body: reply }],
    dataSources: [contextual ? "rol rehberi ve yetkili ekran sözleşmesi" : "statik ürün yardım sözleşmesi"],
    reasoning: contextual
      ? "Ürün yardımı, kayıt okumadan mevcut yetkili rol ve ekranın başlangıç adımlarına bağlandı."
      : "Genel ürün yardımı, yetkili kayıt veya route-bound bağlam okumadan yanıtlandı.",
    semanticPlan,
    teachingState: replyState?.teachingState || null,
    conversationRoute: "GENERIC_PRODUCT_HELP",
    dialogueTopic: "GENERIC_PRODUCT_HELP",
    authorizedProductContext: null,
    readOnly: true,
    quickActions: contextual ? [{
      label: "Bu ekranı anlat",
      actionKind: "ASK",
      askText: "Bu ekran ne işe yarıyor?",
      reason: "Mevcut yetkili ekranı açıklamak için güvenli ürün yardımı ister; işlem başlatmaz.",
    }] : [],
  };
}

function buildProductTeachingContinuationProjection({ message, semanticPlan, user = null, screenContext = null, conversationState = null }) {
  const state = conversationState?.productTeachingState || null;
  const currentIndex = Number(state?.sectionIndex || 0);
  const continuationAction = String(
    semanticPlan?.typedRequest?.continuationAction
      || semanticPlan?.continuationAction
      || "NEXT",
  ).toUpperCase();
  const direction = continuationAction === "RECOVER"
    ? "RECOVER"
    : ["BACK", "PREVIOUS", "GERI"].includes(continuationAction) ? "BACK" : "NEXT";
  const nextIndex = direction === "BACK" || direction === "RECOVER" ? currentIndex : currentIndex + 1;
  const rendered = buildProductTeachingReply({
    message,
    userRole: user?.role,
    user,
    sectionIndex: nextIndex,
    direction,
  });
  return {
    ok: true,
    copilotVersion: "ROUND-10-PRODUCT-TEACHING",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: "Ürün öğretimi",
    provider: "local-product-teaching-state",
    providerSummary: "server-owned-product-teaching-continuation",
    mode: "RULE_BASED",
    scope: {
      role: String(user?.role || ""),
      companyKind: String(user?.companyKind || ""),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: "Ürün öğretimi, aynı yetkili rol/tenant kapsamındaki sunucu durumundan ilerletildi.",
    },
    reply: rendered.reply,
    summary: rendered.summary,
    contextSummary: "Ürün öğretiminin bir sonraki anlamlı bölümü sunuldu; kayıt verisi okunmadı.",
    questionType: "PRODUCT_TEACHING_CONTINUATION",
    activeTopic: "PRODUCT_TEACHING",
    assistantIntent: "PRODUCT_TEACHING",
    authorizedDomainMap: [],
    authorizedRecords: [],
    retrievedFacts: [],
    responseSections: [{ title: "Ürün öğretimi", body: rendered.reply }],
    dataSources: ["mevcut rol yetenek sözleşmesi", "sunucu sahipli öğretim durumu"],
    reasoning: direction === "BACK"
      ? "Devam durumu bir önceki öğretim bölümüne alındı."
      : "Devam durumu, mevcut öğretim konusunun sonraki yeni bölümüne ilerletildi.",
    semanticPlan,
    teachingState: rendered.teachingState,
    conversationRoute: semanticPlan.conversationRoute,
    dialogueTopic: "PRODUCT",
    authorizedProductContext: null,
    readOnly: true,
    quickActions: [],
    followUpPrompt: rendered.teachingState.completed ? "İstersen belirli bir ekranı anlatayım." : "Devamını anlat",
  };
}

function intentLabel(intent) {
  const map = {
    SHIFT_SUMMARY: "Vardiya Özeti",
    CONFLICT_EXPLAIN: "Conflict Açıklama",
    OPS_NOTE_DRAFT: "Operasyon Notu Taslağı",
    ASSIGNMENT_READINESS: "Atama Hazırlık Kontrolü",
    OFFER_DECISION_HELP: "Teklif Karar Yardımı",
    TELEMATICS_HEALTH: "Telematics Health",
    GPS_SIGNAL_DIAGNOSIS: "GPS Sinyal Teşhisi",
    JOB_GUIDE: "İş Rehberi",
    CHAT_HELP: "Sohbet Yardımı",
  };
  return map[String(intent || "")] || String(intent || "-");
}

function describeEntity(context) {
  if (!context) return "-";
  if (context.type === "shift") {
    return `Shift #${context.id} • ${context.status || "-"} • ${context.company?.name || context.room?.name || "shift"}`;
  }
  if (context.type === "vehicle") {
    return `Vehicle #${context.id} • ${context.plate || "plate?"} • ${context.status || "-"}`;
  }
  if (context.type === "screen") {
    return `${context.label || "Ekran"} • ${context.roleLabel || context.roleKey || "rol"}`;
  }
  return `${context.type || "entity"} #${context.id || "-"}`;
}

function visibleContextText(screenContext) {
  return buildVisibleFactText(screenContext);
}

function buildVisibleContextDiagnosticResponse({ user, entityType, entityId, screenContext, message }) {
  if (!isCurrentSituationDiagnosticQuestion(message)) return null;
  const text = visibleContextText(screenContext);
  const normalized = text.toLocaleLowerCase("tr-TR");
  const liveSurface = /\/map\b|\/live\b|canlı takip|canli takip|konum sinyali|tahmini süre|tahmini varış/i.test(text);
  const gpsOffline = /çevrim dışı|cevrim disi|offline|konum sinyali yok|sinyal yok|gps.*(?:yok|çevrim dışı|cevrim disi)/i.test(text);
  const etaUnavailable = /tahmini süre[^•]{0,80}(hesaplanamıyor|hesaplanmiyor|yok|görünmüyor|gorunmuyor)|eta[^•]{0,80}(hesaplanamıyor|hesaplanmiyor|yok|güvenilir değil|guvenilir degil)/i.test(text)
    || (/eta yok|tahmini süre yok/i.test(normalized));
  if (!liveSurface || (!gpsOffline && !etaUnavailable)) return null;
  const selected = screenContext?.selectedLabel || screenContext?.selectedRecordLabel || "seçili kayıt";
  const parts = [];
  if (gpsOffline) parts.push("Konum/GPS sinyali çevrim dışı; araçtan güncel konum alınamıyor.");
  else if (etaUnavailable) parts.push("Güncel konum verisiyle ilgili bir eksik sinyal var.");
  if (etaUnavailable) parts.push("Bu nedenle tahmini süre şu anda hesaplanamıyor.");
  parts.push("Güvenli sonraki adım: önce araç cihazının ve konum bağlantısının durumunu kontrol et; güncel konum geldikten sonra tahmini süreyi yeniden doğrula.");
  return {
    ok: true,
    copilotVersion: "ROUND-3-VISIBLE-CONTEXT-DIAGNOSTIC",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: "Mevcut durum teşhisi",
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || "Sefer Abi",
    provider: "local-visible-context",
    providerSummary: "current-authorized-visible-runtime-context",
    mode: "RULE_BASED",
    scope: {
      role: String(user?.role || ""),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: "Yalnızca ekrandaki yetkili canlı kayıt bağlamı kullanıldı.",
    },
    reply: `${selected} için ${parts.join(" ")}`.trim(),
    summary: parts.join(" "),
    contextSummary: text,
    questionType: "ROOT_CAUSE",
    activeTopic: "CURRENT_SITUATION_DIAGNOSTIC",
    assistantIntent: "CURRENT_SITUATION_DIAGNOSTIC",
    dataSources: ["seçili canlı araç bağlamı", "vardiya kaydı", "konum/GPS sinyali", "tahmini süre durumu"],
    retrievedFacts: [
      gpsOffline ? "Konum/GPS sinyali çevrim dışı" : "Konum sinyalinde eksik veri",
      "Araçtan güncel konum alınamıyor",
      etaUnavailable ? "Tahmini süre hesaplanamıyor" : "Tahmini süre doğrulanamıyor",
    ],
    reasoning: "Tahmini süre güncel konum sinyaline bağlıdır; sinyal alınamadığında süre güvenilir biçimde hesaplanamaz.",
    priority: "Operasyonel takip önceliği",
    safeNextStep: "Araç cihazı ve konum bağlantısını kontrol et; güncel konum geldikten sonra tahmini süreyi yeniden doğrula.",
    roleBoundary: "Yalnızca kullanıcının yetkili mevcut ekran ve seçili kayıt sinyalleri kullanıldı.",
    quickActions: [],
    responseSections: [
      { title: "Gördüğüm durum", body: parts.slice(0, 2).join(" ") },
      { title: "Şimdi ne yapmalıyım?", body: "Araç cihazı ve konum bağlantısını kontrol et; güncel konum geldikten sonra tahmini süreyi yeniden doğrula." },
    ],
    followUpPrompt: "Devamını anlat",
  };
}

function buildRoleScopedTargetBoundaryResponse({ user, entityType, entityId, screenContext, semanticPlan }) {
  const roleTargetDenied = semanticPlan?.roleTargetResolution === "UNAUTHORIZED";
  const createCapabilityDenied = semanticPlan?.authorizationDecision?.reason === "CREATE_CAPABILITY_DENIED_BY_ROLE";
  if (!roleTargetDenied && !createCapabilityDenied) return null;
  const requestedRole = String(semanticPlan?.requestedRoleTarget?.roleKey || "başka bir rol").toUpperCase();
  const currentRole = String(semanticPlan?.role || user?.role || "mevcut rol").toUpperCase();
  const reply = createCapabilityDenied
    ? `Yeni vardiya oluşturma yetkisi ${currentRole} rolünde bulunmuyor; bu nedenle oluşturma akışını başlatmıyorum. Mevcut yetkili ekranlarını açıklayabilirim.`
    : `İstenen ${requestedRole} ekranı veya yeteneği, mevcut ${currentRole} rolünün yetkili bağlamında kullanılamıyor. Bu nedenle bu hedefe yönlendirme yapmıyorum.`;
  return {
    ok: true,
    copilotVersion: createCapabilityDenied ? "ROUND-18-CREATE-CAPABILITY-AUTHORIZATION" : "ROUND-18-ROLE-TARGET-AUTHORIZATION",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: "Yetki sınırı",
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || "Sefer Abi",
    provider: "canonical-role-target-authorization",
    providerSummary: createCapabilityDenied ? "create-capability-denied-before-workflow-fallback" : "role-scoped-target-denied-before-workflow-fallback",
    mode: "RULE_BASED",
    scope: {
      role: currentRole,
      companyKind: String(user?.companyKind || ""),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: "İstenen rol ekranı mevcut rol ve tenant yetki sınırında reddedildi; ürün kaydı okunmadı.",
    },
    reply,
    summary: reply,
    contextSummary: createCapabilityDenied ? "Yeni vardiya oluşturma capability sınırı mevcut rol için reddedildi." : "İstenen rol kapsamındaki ekran mevcut kullanıcı için yetkili değil.",
    questionType: "AUTHORIZATION_BOUNDARY",
    activeTopic: "AUTHORIZATION_BOUNDARY",
    assistantIntent: "AUTHORIZATION_BOUNDARY",
    authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
    authorizedRecords: [],
    retrievedFacts: [],
    responseSections: [{ title: "Yetki sınırı", body: reply }],
    dataSources: ["mevcut rol/tenant yetki kapsamı"],
    reasoning: createCapabilityDenied
      ? "CREATE semantic action korunurken, mevcut rolün create capability sınırı workflow fallback'inden önce reddedildi."
      : "Mevcut isteğin rol-scoped hedefi, aktif iş akışı veya alan açıklaması fallback'inden önce reddedildi.",
    roleBoundary: reply,
    readOnly: true,
    quickActions: [],
    followUpPrompt: "Mevcut rolündeki yetkili bir ekranı sorabilirsin.",
    semanticPlan,
    conversationRoute: semanticPlan.conversationRoute,
    dialogueTopic: semanticPlan.dialogueTopic,
    authorizedProductContext: null,
    guidedTarget: {
      status: GUIDED_TARGET_STATUSES.UNAUTHORIZED,
      targetKey: null,
      targetKind: "ROLE_SCOPED_UI",
      roleKey: requestedRole,
      screenPath: screenContext?.path || null,
      reason: "REQUESTED_ROLE_TARGET_NOT_AUTHORIZED",
    },
  };
}

function buildCrossDriverBoundaryResponse({ user, entityType, entityId, screenContext, message }) {
  const role = String(user?.role || "").toUpperCase();
  const text = String(message || "").toLocaleLowerCase("tr-TR");
  if (role !== "DRIVER" || !/(başka|baska|diğer|diger).*(sürücü|surucu)|sürücülerin|suruculerin/.test(text)) return null;
  return {
    ok: true,
    copilotVersion: "ROUND-3-AUTHORIZATION-BOUNDARY",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    assistantIntent: "AUTHORIZATION_BOUNDARY",
    intentLabel: "Yetki sınırı",
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || "Sefer Abi",
    provider: "local-authorization-boundary",
    providerSummary: "cross-driver-read-denied-before-retrieval",
    mode: "RULE_BASED",
    scope: { role, summary: "Sadece sürücünün kendi yetkili kayıtları okunabilir." },
    reply: "Başka sürücülerin sorunlarını paylaşamam. Güvenlik ve yetki sınırı gereği yalnızca kendi vardiya, rota, konum ve görev durumunu açıklayabilirim.",
    summary: "Başka sürücülerin verileri bu oturum için yetkili değil.",
    questionType: "AUTHORIZATION_BOUNDARY",
    activeTopic: "AUTHORIZATION_BOUNDARY",
    authorizedRecords: [],
    dataSources: [],
    retrievedFacts: [],
    reasoning: "Başka sürücülere ait kayıtlar sorgulanmadan önce yetki sınırında durduruldu.",
    safeNextStep: "İstersen kendi bugünkü vardiya ve rota durumunu sorabilirsin.",
    responseSections: [{ title: "Şimdi ne yapabilirim?", body: "Yalnızca kendi bugünkü vardiya ve rota durumunu açıklayabilirim." }],
    roleBoundary: "Başka sürücülere ait kayıtlar okunmadı.",
    readOnly: true,
    quickActions: [],
  };
}

function buildCrossPersonBoundaryResponse({ user, entityType, entityId, screenContext, message }) {
  const role = String(user?.role || "").toUpperCase();
  const text = String(message || "").toLocaleLowerCase("tr-TR");
  if (role !== "PERSONEL" || !/(başka|baska|diğer|diger).*(personel|kiş|kis|çalışan|calisan).*(servis|vardiya|konum|durum)|personellerin.*(servis|vardiya|konum)/.test(text)) return null;
  return {
    ok: true,
    copilotVersion: "ROUND-4-AUTHORIZATION-BOUNDARY",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    assistantIntent: "AUTHORIZATION_BOUNDARY",
    intentLabel: "Yetki sınırı",
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || "Sefer Abi",
    provider: "local-authorization-boundary",
    providerSummary: "cross-person-read-denied-before-retrieval",
    mode: "RULE_BASED",
    scope: { role, summary: "Sadece personelin kendi yetkili servis kayıtları okunabilir." },
    reply: "Başka personellerin servis veya konum bilgilerini paylaşamam. Bu oturumda yalnızca kendi yetkili servis, vardiya ve görev durumunu açıklayabilirim.",
    summary: "Başka personellere ait veriler bu oturum için yetkili değil.",
    questionType: "AUTHORIZATION_BOUNDARY",
    activeTopic: "AUTHORIZATION_BOUNDARY",
    authorizedRecords: [],
    dataSources: [],
    retrievedFacts: [],
    reasoning: "Başka personele ait kayıtlar okunmadan önce yetki sınırında durduruldu.",
    safeNextStep: "İstersen kendi servis durumunu veya bugünkü vardiyanı sorabilirsin.",
    responseSections: [{ title: "Şimdi ne yapabilirim?", body: "Yalnızca kendi servis ve vardiya durumunu açıklayabilirim." }],
    roleBoundary: "Başka personele ait kayıtlar okunmadı.",
    readOnly: true,
    quickActions: [],
  };
}

function buildCrossChildBoundaryResponse({ user, entityType, entityId, screenContext, message }) {
  const role = String(user?.role || "").toUpperCase();
  const text = String(message || "").toLocaleLowerCase("tr-TR");
  if (role !== "PARENT" || !/(başka|baska|diğer|diger).*(çocuk|cocuk|öğrenci|ogrenci|veli|aile).*(servis|araç|arac|konum|vardiya|durum)|çocukların|cocuklarin|öğrencilerin|ogrencilerin/.test(text)) return null;
  return {
    ok: true,
    copilotVersion: "ROUND-4-AUTHORIZATION-BOUNDARY",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    assistantIntent: "AUTHORIZATION_BOUNDARY",
    intentLabel: "Yetki sınırı",
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || "Sefer Abi",
    provider: "local-authorization-boundary",
    providerSummary: "cross-child-read-denied-before-retrieval",
    mode: "RULE_BASED",
    scope: { role, summary: "Sadece velinin yetkili çocuk kayıtları okunabilir." },
    reply: "Başka çocukların servis veya konum bilgilerini paylaşamam. Bu oturumda yalnızca size bağlı ve yetkili çocuğunuzun servis durumunu açıklayabilirim.",
    summary: "Başka çocuklara ait veriler bu oturum için yetkili değil.",
    questionType: "AUTHORIZATION_BOUNDARY",
    activeTopic: "AUTHORIZATION_BOUNDARY",
    authorizedRecords: [],
    dataSources: [],
    retrievedFacts: [],
    reasoning: "Başka çocuklara ait kayıtlar okunmadan önce veli yetki sınırında durduruldu.",
    safeNextStep: "İstersen kendi çocuğunuzun araç, sürücü, durak ve tahmini süre durumunu sorabilirsiniz.",
    responseSections: [{ title: "Şimdi ne yapabilirim?", body: "Yalnızca size bağlı ve yetkili çocuğunuzun servis durumunu açıklayabilirim." }],
    roleBoundary: "Başka çocuklara ait kayıtlar okunmadı.",
    readOnly: true,
    quickActions: [],
  };
}

function buildProductAwarenessResponse({ awareness, user, entityType, entityId, screenContext }) {
  if (!awareness) return null;
  const continuationComplete = awareness.semanticPlan?.family === "CONTINUE_CURRENT_REASONING"
    && awareness.queryPlanExecution?.continuationComplete === true;
  const requestedOfferId = (Array.isArray(awareness?.semanticPlan?.canonicalRequest?.candidateEntityRefs)
    ? awareness.semanticPlan.canonicalRequest.candidateEntityRefs
    : [])
    .find((candidate) => String(candidate?.type || '').toUpperCase() === 'OFFER' && Number(candidate?.id) > 0)?.id || null;
  const productKnowledgeInventory = buildCanonicalProductKnowledgeInventory(user, { screenContext: screenContext || {} });
  const authorized = resolveAuthorizedProductDomains(user);
  const authorizationBoundary = awareness.authorizationBoundary === true || awareness.domain === "AUTHORIZATION_BOUNDARY";
  const domainLabel = {
    OFFERS: "teklif",
    AGREEMENTS: "sözleşme",
    SHIFTS: "vardiya",
    VEHICLES: "araç",
    DRIVERS: "sürücü",
    PERSONNEL: "personel/öğrenci",
    BUDGET: "bütçe ve maliyet",
    FINANCE: "mutabakat ve mali önizleme",
    NOTIFICATIONS: "bildirim",
    OPERATIONS: "operasyon",
    ORGANIZATION_PLANS: "organizasyon planı",
    TENANT_ACCESS: "tenant erişim",
    AUTHORIZATION_BOUNDARY: "yetki sınırı",
  }[awareness.domain] || "kayıt";
  return {
    ok: true,
    copilotVersion: "ROUND-3-AUTHORIZED-PRODUCT-AWARENESS",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: authorizationBoundary ? "Yetki sınırı" : "Yetkili ürün bilgisi",
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || "Sefer Abi",
    provider: "local-authorized-product-read",
    providerSummary: awareness.source,
    mode: "RULE_BASED",
    scope: {
      role: String(user?.role || ""),
      companyKind: String(user?.companyKind || ""),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: "Sorgu için role/company-kind/tenant kapsamlı salt okunur alan okuması yapıldı.",
    },
    reply: awareness.reply,
    summary: awareness.reply,
    contextSummary: authorizationBoundary ? "İstenen ürün alanı mevcut rol/company-kind yetki kapsamı dışında bırakıldı." : `${awareness.count} yetkili ${domainLabel} kaydı salt okunur kapsamda değerlendirildi.`,
    questionType: `AUTHORIZED_DOMAIN_${awareness.domain}`,
    activeTopic: awareness.domain,
    authorizedDomain: awareness.domain,
    authorizedDomainMap: authorized.domains,
    authorizedRecords: awareness.records,
    discourseEntities: awareness.discourseEntities || [],
    authorizedRecordCount: awareness.count,
    assistantIntent: `AUTHORIZED_DOMAIN_${awareness.domain}`,
    dataSources: awareness.dataSources,
    retrievedFacts: awareness.retrievedFacts,
    reasoning: awareness.reasoning,
    semanticPlan: awareness.semanticPlan || null,
    queryPlanExecution: awareness.queryPlanExecution || null,
    synthesis: awareness.synthesis || null,
    styleApplied: awareness.styleApplied || null,
    authorizedProductContext: awareness.semanticPlan?.dialogueTopic === "PRODUCT"
      && !["AUTHORIZATION_NEGATIVE"].includes(awareness.semanticPlan?.conversationRoute)
      && awareness.semanticPlan?.family !== "AUTHORIZATION_BOUNDARY"
      ? { semanticPlan: awareness.semanticPlan, screenPath: screenContext?.path || null }
      : null,
    productKnowledgeInventory,
    priority: awareness.priority,
    safeNextStep: awareness.nextAction,
    nextAction: awareness.nextAction,
    responseSections: [
      { title: "Özet", body: awareness.reply },
      { title: "Neden böyle söyledim", body: awareness.reasoning },
      { title: "Şimdi ne yapmalıyım?", body: awareness.nextAction },
    ],
    roleBoundary: awareness.roleBoundary || (authorizationBoundary ? awareness.reply : "Yalnızca kullanıcının mevcut yetki ve tenant kapsamındaki kayıtlar kullanıldı."),
    readOnly: true,
    quickActions: awareness.navigationTarget?.path
      ? [{
        actionKind: "OPEN_ROUTE",
        label: `${awareness.navigationTarget.label || "Yetkili ekran"} ekranına git`,
        path: awareness.navigationTarget.path,
        ...(requestedOfferId ? { routeParams: { offerId: Math.trunc(Number(requestedOfferId)) } } : {}),
        safeNavigation: true,
        criticalActionExecution: false,
      }]
      : [],
    followUpPrompt: continuationComplete ? "" : "Devamını anlat",
  };
}

function applyRequestedStyleToAnswer(answer) {
  const style = answer?.semanticPlan?.requestedStyle;
  const source = String(answer?.reply || "").trim();
  // The authorized awareness layer may already have transformed the settled
  // answer.  Style is presentation-only and must be idempotent at the final
  // response boundary; otherwise the same prefix/content is applied twice.
  if (!style || !source || answer?.styleApplied === style) return answer;
  let reply = source;
  const sentences = source.split(/(?<=[.!?])\s+/u).map((part) => part.trim()).filter(Boolean);
  const firstSentence = sentences[0] || source;
  const colonTail = firstSentence.match(/^[^:]{24,}:\s*(.+)$/u)?.[1]?.trim();
  const factualCore = colonTail && /(?:#\d+|\b(?:Teklif|Vardiya|Araç|Sözleşme)\b)/u.test(colonTail) ? colonTail : firstSentence;
  const compactCore = factualCore.length <= 260
    ? factualCore
    : factualCore.split(/\s*[;•]\s*/u).filter(Boolean).slice(0, 2).join("; ");
  const oneSentence = `${compactCore.replace(/[.!?]+$/u, "").trim()}.`;
  const requestedSentenceCount = Number(answer?.semanticPlan?.typedRequest?.presentationItemCount || 0);
  const sentenceLimited = requestedSentenceCount > 0
    ? sentences.slice(0, requestedSentenceCount).join(" ") || oneSentence
    : oneSentence;
  if (["SHORT_SUMMARY", "SINGLE_SENTENCE", "RESULT_ONLY", "SHORTEN"].includes(style)) reply = sentenceLimited;
  if (style === "BULLET_STEPS") {
    const parts = source.split(/(?<=[.!?])\s+/u).map((part) => part.trim()).filter(Boolean);
    reply = parts.map((part, index) => `${index + 1}) ${part}`).join(" ");
  }
  if (style === "CHILD_FRIENDLY") reply = `Basitçe: ${source}`;
  if (style === "EVIDENCE_FIRST") reply = `Kanıt odaklı kısa yanıt: ${source}`;
  if (style === "RESULT_FIRST") reply = `Sonuç: ${source}`;
  if (style === "REPHRASED") reply = `Başka türlü söyleyeyim: ${oneSentence}`;
  if (style === "EXPANDED") {
    const details = String(answer?.reasoning || "").trim();
    const nextAction = String(answer?.nextAction || answer?.safeNextStep || "").trim();
    reply = [source, details && !source.includes(details) ? `Ayrıntı: ${details}` : "", nextAction ? `Sonraki güvenli adım: ${nextAction}` : ""].filter(Boolean).join(" ");
  }
  answer.reply = reply;
  answer.summary = reply;
  answer.styleApplied = style;
  if (Array.isArray(answer.responseSections) && answer.responseSections[0]) answer.responseSections[0].body = reply;
  return answer;
}

function buildScopeSummary(user, entityType, entityId) {
  const role = String(user?.role || "-");
  const room = user?.roomId != null ? `roomId=${user.roomId}` : null;
  const company = user?.companyId != null ? `companyId=${user.companyId}` : null;
  const scopeBits = [room, company].filter(Boolean).join(", ");
  if (entityType === "screen") return `${role} rolü için ekran rehberi okundu${scopeBits ? ` (${scopeBits})` : ""}.`;
  return `${role} scope içinde ${entityType} #${entityId} okundu${scopeBits ? ` (${scopeBits})` : ""}.`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function normalizeVisibleText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeVisibleKey(value) {
  return normalizeVisibleText(value).toLocaleLowerCase("tr-TR");
}

function selectedRows(screenContext, key) {
  return Array.isArray(screenContext?.[key]) ? screenContext[key] : [];
}

function buildLegacyChatHelpResponse(input) {
  const baseResponse = buildChatHelpResponse(input);
  return baseResponse;
}

function createShiftWorkflowModelForPlan(semanticPlan, conversationState = null) {
  return semanticPlan?.workflowModel
    || semanticPlan?.continuationBasePlan?.workflowModel
    || conversationState?.activeGuidedTask?.semanticPlan?.workflowModel
    || (semanticPlan?.workflowIntent === "CREATE_SHIFT" ? COMPANY_GUIDED_NEW_PLAN_WORKFLOW : null);
}

function createShiftWorkflowStepForPlan(semanticPlan, conversationState = null) {
  const model = createShiftWorkflowModelForPlan(semanticPlan, conversationState);
  if (!model?.steps?.length) return { model: null, step: null };
  const liveWorkflowActive = Boolean(
    semanticPlan?.workflowActualUiState?.workflowId
      || semanticPlan?.workflowStepReference?.ordinal
      || semanticPlan?.workflowStepOrdinal,
  );
  const workflowEntryState = liveWorkflowActive
    ? null
    : (semanticPlan?.workflowEntryState
      || semanticPlan?.continuationBasePlan?.workflowEntryState
      || conversationState?.activeGuidedTask?.semanticPlan?.workflowEntryState
      || null);
  if (workflowEntryState === "PRE_WIZARD") {
    return { model, step: null, entry: true, nextStep: model.steps[0] || null };
  }
  const ordinal = Number(
    semanticPlan?.workflowStepReference?.ordinal
      || semanticPlan?.workflowStepOrdinal
      || semanticPlan?.continuationBasePlan?.workflowStepReference?.ordinal
      || conversationState?.activeGuidedTask?.semanticPlan?.workflowStepReference?.ordinal
      || 1,
  ) || 1;
  return {
    model,
    step: model.steps.find((item) => Number(item.ordinal) === ordinal) || model.steps[0],
  };
}

function buildCreateShiftWorkflowResponse({ user, entityType, entityId, screenContext, semanticPlan, conversationState, guidedTarget = null } = {}) {
  const { model, step, entry, nextStep } = createShiftWorkflowStepForPlan(semanticPlan, conversationState);
  if (!model) return null;
  if (entry) {
    const canonicalEntryTarget = semanticPlan?.workflowEntryTarget
      || semanticPlan?.continuationBasePlan?.workflowEntryTarget
      || null;
    // A disclosure can be a safe reveal step, but it is not the requested
    // guided-entry control. Use a resolved target only when it proves the
    // same canonical identity; the existing target resolver may reveal the
    // enclosing disclosure and then re-resolve the exact child separately.
    const guidedTargetMatchesEntry = guidedTarget?.status === "FOUND"
      && canonicalEntryTarget?.targetKey
      && String(guidedTarget.targetKey || "") === String(canonicalEntryTarget.targetKey);
    const entryTarget = guidedTargetMatchesEntry
      ? guidedTarget
      : canonicalEntryTarget;
    const targetLabel = String(entryTarget?.label || "Rehberi Başlat").trim();
    const nextLabel = String(nextStep?.label || "Şirket konumu").trim();
    const nextState = String(semanticPlan?.workflowNextState || "").toUpperCase();
    const draftAvailability = semanticPlan?.workflowDraftAvailability || null;
    const hasKnownDraftChooser = nextState === "SAVED_DRAFT_CHOOSER" && Number(draftAvailability?.count || 0) > 0;
    const nextStateLine = hasKnownDraftChooser
      ? `Bu düğmeye bastıktan sonra önce kayıtlı taslak seçimi açılır; ${Number(draftAvailability.count)} uygun taslak bulundu. Devam et mevcut taslağı kanıtlanan güvenli adımından sürdürür, Yeni plan eski taslakları koruyarak başlangıç akışını açar.`
      : nextState === "NEW_PLAN_STEP_1"
        ? `Bu düğmeye bastıktan sonra kayıtlı taslak seçimi yok; yeni akışın ilk adımı “${nextLabel}” olur.`
        : `Bu düğmeye bastıktan sonra uygun kayıtlı taslak varsa önce seçim ekranı, yoksa yeni akışın ilk adımı “${nextLabel}” görünür.`;
    const recovery = semanticPlan?.continuationAction === "RECOVER"
      ? ` Bu hedefte takıldığını anlıyorum. “${targetLabel}” düğmesine yeniden dokun; açılmazsa düğmenin görünür ve etkin durumunu birlikte kontrol edelim. Akış açılmadan sonraki adıma geçtiğini varsaymıyorum.`
      : "";
    const reply = `Yeni vardiya planını bu ekrandan başlatabilirsin. Rehberli akış şu anda açık değil; mevcut güvenli hedef “${targetLabel}”. ${nextStateLine} ${nextLabel} adımının kontrolleri, akış gerçekten açıldıktan sonra görünür ve o zaman mevcut adım olarak açıklanır.${recovery} Sefer Abi yalnızca görünür hedefi gösterir; iş kaydı oluşturmaz veya ilerletmez.`;
    const currentTarget = entryTarget?.status === "FOUND"
      ? {
        targetKind: entryTarget.targetKind || "CONTROL",
        targetKey: entryTarget.targetKey || null,
        semanticId: entryTarget.semanticId || null,
        blockKey: entryTarget.blockKey || null,
        label: entryTarget.label || null,
        semanticType: entryTarget.semanticType || null,
        screenPath: entryTarget.screenPath || screenContext?.path || null,
        locator: entryTarget.locator || null,
        callout: entryTarget.callout || null,
      }
      : null;
    const taskState = {
      activeGoal: model.goal,
      activeWorkflow: model.id,
      activeStep: null,
      currentExpectedStep: null,
      nextStep: nextStep ? { ordinal: nextStep.ordinal, key: nextStep.key, label: nextStep.label } : null,
      workflowEntryState: "PRE_WIZARD",
      lastCompletedStep: null,
      actualUiState: null,
      workflowProgression: null,
      currentTarget,
      currentSurface: { path: screenContext?.path || null, label: screenContext?.label || null },
      currentRole: String(user?.role || "").toUpperCase() || null,
      currentEntity: semanticPlan?.entity || null,
      authorizedActionSet: Array.isArray(screenContext?.uiHints?.visibleButtons)
        ? screenContext.uiHints.visibleButtons.map((item) => item?.label).filter(Boolean).slice(0, 32)
        : [],
      safeOnly: true,
    };
    return {
      ok: true,
      copilotVersion: "M18-CANONICAL-CREATE-SHIFT-WORKFLOW",
      generatedAt: new Date().toISOString(),
      intent: "CHAT_HELP",
      intentLabel: "Vardiya oluşturma rehberi",
      entityType,
      entityId: Number(entityId),
      entityLabel: screenContext?.label || "Sefer Abi",
      provider: "local-canonical-workflow-guidance",
      providerSummary: model.id,
      mode: "RULE_BASED",
      scope: {
        role: String(user?.role || ""),
        companyKind: String(user?.companyKind || ""),
        roomId: user?.roomId ?? null,
        companyId: user?.companyId ?? null,
        summary: "Yetkili mevcut ekran ve rehberli akış başlangıcı kullanıldı; kayıt yazımı yapılmadı.",
      },
      reply,
      summary: reply,
      contextSummary: "Rehberli akış başlangıcı",
      questionType: semanticPlan?.family === "EXPLAIN_CURRENT_TARGET" ? "EXPLAIN_CURRENT_TARGET" : "UI_GUIDANCE",
      activeTopic: "CREATE_SHIFT",
      assistantIntent: "CREATE_SHIFT_WORKFLOW_GUIDANCE",
      authorizedDomainMap: ["SHIFTS"],
      authorizedRecords: [],
      retrievedFacts: [],
      responseSections: [
        { title: "Mevcut durum", body: `Rehberli akış açık değil; “${targetLabel}” mevcut güvenli hedef.` },
        { title: "Sıradaki canlı durum", body: nextStateLine },
        { title: "Güvenli sınır", body: "Sefer Abi hedefi gösterir; düğmeye basmaz, iş kaydı yazmaz veya akışı ilerletmez." },
      ],
      dataSources: ["kanonik COMPANY Guided New Plan iş akışı", "yetkili mevcut ekran"],
      reasoning: "Canlı modal/iş akışı işareti bulunmadığı için giriş kontrolü mevcut, ilk adım ise sıradaki durumdur.",
      safeNextStep: `“${targetLabel}” hedefini kontrol et.`,
      nextAction: `Sıradaki güvenli hedef: ${targetLabel}.`,
      workflowModel: model,
      workflowEntryState: "PRE_WIZARD",
      workflowEntryTarget: currentTarget,
      workflowNextStepReference: nextStep ? { ordinal: nextStep.ordinal, key: nextStep.key, label: nextStep.label } : null,
      workflowNextState: nextState || "UNKNOWN_ENTRY_NEXT_STATE",
      workflowDraftAvailability: draftAvailability,
      workflowStepReference: null,
      workflowStepOrdinal: null,
      workflowOrder: [],
      workflowCompletionEvidence: [],
      workflowStateTransitions: [],
      taskState,
      semanticPlan,
      guidedTarget: guidedTarget || null,
      roleBoundary: "Sadece mevcut role ve tenant kapsamındaki güvenli UI rehberliği verildi.",
      readOnly: true,
      quickActions: [],
      followUpPrompt: "Devamını anlat",
      recoveryAction: semanticPlan?.continuationAction === "RECOVER"
        ? { type: "RECHECK_CANONICAL_TARGET", targetKey: currentTarget?.targetKey || null, label: targetLabel }
        : null,
    };
  }
  if (!step) return null;
  const capability = Array.isArray(step.capabilityGuides)
    ? step.capabilityGuides.find((item) => item?.intent === semanticPlan?.capabilityIntent)
    : null;
  const knowledge = capability || step;
  const targetLabel = String(guidedTarget?.status === "FOUND" ? guidedTarget.label || "" : "").trim();
  const targetLine = targetLabel
    ? `Ekranda doğrulayabildiğim mevcut hedef: “${targetLabel}”.`
    : "Bu adım için ekranda doğrulanabilir bir hedef görünmüyorsa ilerleme iddiasında bulunmuyorum.";
  const controls = Array.isArray(knowledge.controls) ? knowledge.controls.join(", ") : "";
  const preconditions = Array.isArray(knowledge.preconditions)
    ? knowledge.preconditions.join(", ")
    : String(knowledge.precondition || "");
  const blockedProgressionLine = semanticPlan?.workflowPreconditionBlocked
    ? `Bu adımın tamamlandığını mevcut arayüzde doğrulayamadım; ${step.label} tamamlanmadan sonraki adıma geçmiyorum. Önce ${step.completion}`
    : "";
  const capabilityLead = capability ? `Bu adımda ${capability.label} yeteneğini kullanırsın. ` : "";
  const recoveryLine = semanticPlan?.continuationAction === "RECOVER"
    ? ` Bu hedefte zorlanıyorsan “${targetLabel || step.label}” hedefini yeniden kontrol et; mevcut arayüz doğrulanmadan ilerleme varsaymıyorum.`
    : "";
  const continuationDepth = Number(semanticPlan?.continuationDepth || 0);
  const proceduralOrder = Array.isArray(step.proceduralOrder) ? step.proceduralOrder : [];
  const continuationUnit = semanticPlan?.family === "CONTINUE_CURRENT_REASONING" && proceduralOrder.length
    ? proceduralOrder[Math.min(Math.max(continuationDepth - 1, 0), proceduralOrder.length - 1)]
    : "";
  const continuationLine = continuationUnit
    ? ` Bu devam açıklamasının ${continuationDepth}. anlamlı parçası: ${continuationUnit}. Bu yalnızca açıklama sırasıdır; canlı arayüz kanıtı olmadan tamamlandı sayılmaz.`
    : "";
  const continuationMode = String(semanticPlan?.canonicalRequest?.continuation?.mode || "").trim().toUpperCase();
  const continuationAction = String(
    semanticPlan?.typedRequest?.continuationAction
      || semanticPlan?.continuationAction
      || "CONTINUE",
  ).toUpperCase();
  const isBack = ["BACK", "PREVIOUS", "GERI"].includes(continuationAction);
  const isRecovery = continuationAction === "RECOVER";
  const isContinuation = !isBack && !isRecovery
    && (continuationMode === "CONTINUE" || semanticPlan?.family === "CONTINUE_CURRENT_REASONING");
  const isRestart = continuationMode === "RESTART";
  const currentStepAction = knowledge.action || step.action || controls;
  const currentStepBoundary = knowledge.businessWriteBoundary || step.businessWriteBoundary || "Sefer Abi iş kaydı yazmaz.";
  const reply = isRestart
    ? `Akışı baştan başlatıyoruz. Şimdi ${step.ordinal}. adım olan ${step.label} üzerindesin. ${currentStepAction} ${targetLine} Bu başlangıç yalnızca güvenli rehberliktir; ${currentStepBoundary}`
    : isBack
      ? step.ordinal === 1
        ? `Geri isteğini aldım; bu akışın ilk adımındasın: ${step.label}. Önceki bir adım yok. ${currentStepAction} ${targetLine} Arayüzü kullanıcı olarak değiştirmeden yalnızca mevcut güvenli adımı açıklıyorum. ${currentStepBoundary}`
        : `Geri isteğini aldım. Önceki uygun adım: ${step.label}. ${currentStepAction} ${targetLine} Arayüzde geçişi kullanıcı yapar; Sefer Abi yalnızca önceki adımı açıklar ve iş kaydı yazmaz. ${currentStepBoundary}`
    : isContinuation
      ? `Aynı vardiya akışında ${step.ordinal}. adım olan ${step.label} devam ediyor. Bu ${continuationDepth}. devam açıklaması. ${continuationUnit ? `Sıradaki açıklama parçası: ${continuationUnit}. Şimdi: ${currentStepAction}` : currentStepAction} ${blockedProgressionLine} ${targetLine} Bu adımın tamamlandığını canlı arayüzde doğrulamadan sonraki adıma geçtiğini varsaymıyorum. ${currentStepBoundary}`
      : `Vardiya oluşturma akışında ${step.ordinal}. adım: ${step.label}. ${capabilityLead}${knowledge.what || step.what || step.purpose} Neden: ${knowledge.why || step.why || step.purpose} Şimdi: ${currentStepAction} Görünür kontroller: ${controls}. Ön koşul: ${preconditions}. ${knowledge.completion || step.completion} ${blockedProgressionLine} ${continuationLine} Sonraki adım: ${step.nextStep || "Akışın mevcut doğrulanabilir adımını kontrol et."} ${targetLine}${recoveryLine} ${knowledge.safeAction || step.safeAction || "Sefer Abi yalnızca güvenli rehberlik eder."} ${currentStepBoundary}`;
  const responseSections = isRestart
    ? [
      { title: "Yeniden başlangıç", body: `Akış ${step.ordinal}. adım olan ${step.label} üzerinden başlatılıyor.` },
      { title: "Şimdi", body: currentStepAction },
      { title: "Güvenli sınır", body: currentStepBoundary },
    ]
    : isBack
      ? [
        { title: "Önceki adım", body: step.ordinal === 1 ? `İlk adımdasın: ${step.label}` : `${step.ordinal}. adım: ${step.label}` },
        { title: "Güvenli sınır", body: "Sefer Abi arayüzü kullanıcı yerine değiştirmez veya iş kaydı yazmaz." },
      ]
    : isContinuation
      ? [
        { title: "Devam edilen adım", body: `${step.ordinal}. adım: ${step.label}` },
        { title: "Sıradaki açıklama", body: `${continuationDepth}. devam açıklaması: ${continuationUnit || currentStepAction}` },
        { title: "Güvenli sınır", body: currentStepBoundary },
      ]
      : [
        { title: `Adım ${step.ordinal}: ${step.label}`, body: `${step.what || step.purpose} ${step.action || ""}`.trim() },
        { title: "Neden bu adım?", body: knowledge.why || step.why || step.purpose },
        { title: "Ön koşul ve tamamlanma", body: `${preconditions}. ${knowledge.completion || step.completion}`.trim() },
        { title: "Sonraki adım", body: step.nextStep || "Mevcut doğrulanabilir adımı kontrol et." },
        ...(isRecovery ? [{ title: "Kurtarma", body: `“${targetLabel || step.label}” hedefini yeniden kontrol et; canlı arayüz doğrulanmadan ilerleme varsaymıyorum.` }] : []),
        { title: "Güvenli sınır", body: currentStepBoundary },
      ];
  const activeWorkflowStep = {
    ordinal: step.ordinal,
    key: step.key,
    label: step.label,
  };
  const currentTarget = guidedTarget?.status === "FOUND"
    ? {
      targetKind: guidedTarget.targetKind || "CONTROL",
      targetKey: guidedTarget.targetKey || null,
      semanticId: guidedTarget.semanticId || null,
      blockKey: guidedTarget.blockKey || null,
      label: guidedTarget.label || null,
      semanticType: guidedTarget.semanticType || null,
      screenPath: guidedTarget.screenPath || screenContext?.path || null,
      locator: guidedTarget.locator || null,
      callout: guidedTarget.callout || null,
    }
    : null;
  const authorizedActionSet = Array.isArray(screenContext?.uiHints?.visibleButtons)
    ? screenContext.uiHints.visibleButtons.map((item) => item?.label).filter(Boolean).slice(0, 32)
    : [];
  const actualUiState = semanticPlan?.workflowActualUiState
    || screenContext?.uiHints?.workflowState
    || null;
  const completionVerified = semanticPlan?.workflowCompletionVerified === true
    && semanticPlan?.workflowProgression?.action === "NEXT";
  const priorTaskState = conversationState?.activeGuidedTask?.taskState || null;
  const taskState = {
    activeGoal: model.goal,
    activeWorkflow: model.id,
    activeStep: activeWorkflowStep,
    currentExpectedStep: activeWorkflowStep,
    lastCompletedStep: completionVerified
      ? Number(semanticPlan.workflowProgression.fromOrdinal || 0) || null
      : Number(priorTaskState?.lastCompletedStep || 0) || null,
    stepPreconditions: Array.isArray(step.preconditions) ? step.preconditions.slice() : [],
    stepCompletionCondition: step.completion || null,
    workflowOrder: Array.isArray(step.proceduralOrder) ? step.proceduralOrder.slice() : [],
    alternativePath: step.alternativePath || null,
    completionEvidence: Array.isArray(step.completionEvidence) ? step.completionEvidence.slice() : [],
    stateTransitions: Array.isArray(step.stateTransitions) ? step.stateTransitions.slice() : [],
    stepCompletionVerified: completionVerified,
    actualUiState,
    workflowProgression: semanticPlan?.workflowProgression || null,
    currentTarget,
    currentSurface: {
      path: screenContext?.path || null,
      label: screenContext?.label || null,
    },
    currentRole: String(user?.role || "").toUpperCase() || null,
    currentEntity: semanticPlan?.entity || null,
    authorizedActionSet,
    safeOnly: true,
  };
  return {
    ok: true,
    copilotVersion: "M18-CANONICAL-CREATE-SHIFT-WORKFLOW",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: "Vardiya oluşturma rehberi",
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || "Sefer Abi",
    provider: "local-canonical-workflow-guidance",
    providerSummary: model.id,
    mode: "RULE_BASED",
    scope: {
      role: String(user?.role || ""),
      companyKind: String(user?.companyKind || ""),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: "Yetkili mevcut ekran ve kanonik vardiya iş akışı kullanıldı; kayıt yazımı yapılmadı.",
    },
    reply,
    summary: reply,
    contextSummary: isRestart
      ? `Baştan başlatılan ${step.ordinal}. adım: ${step.label}`
      : isContinuation
        ? `Devam edilen ${step.ordinal}. adım: ${step.label}`
        : `${step.ordinal}. adım: ${step.label}`,
    questionType: semanticPlan?.family === "CONTINUE_CURRENT_REASONING" ? "CONTINUE_FLOW" : semanticPlan?.family || "UI_GUIDANCE",
    activeTopic: "CREATE_SHIFT",
    assistantIntent: "CREATE_SHIFT_WORKFLOW_GUIDANCE",
    authorizedDomainMap: ["SHIFTS"],
    authorizedRecords: [],
    retrievedFacts: [],
    responseSections,
    dataSources: ["kanonik COMPANY Guided New Plan iş akışı", "yetkili mevcut ekran"],
    reasoning: step.purpose,
    safeNextStep: targetLabel ? `“${targetLabel}” hedefini kontrol et; ardından ${step.completion}` : step.completion,
    nextAction: targetLabel ? `Sıradaki güvenli hedef: ${targetLabel}.` : (step.nextStep || step.completion),
    workflowModel: model,
    workflowStepReference: { ordinal: step.ordinal, key: step.key, label: step.label },
    workflowStepOrdinal: step.ordinal,
    workflowOrder: Array.isArray(step.proceduralOrder) ? step.proceduralOrder.slice() : [],
    workflowAlternativePath: step.alternativePath || null,
    workflowCompletionEvidence: Array.isArray(step.completionEvidence) ? step.completionEvidence.slice() : [],
    workflowStateTransitions: Array.isArray(step.stateTransitions) ? step.stateTransitions.slice() : [],
    taskState,
    semanticPlan,
    guidedTarget: guidedTarget || null,
    roleBoundary: "Sadece mevcut role ve tenant kapsamındaki güvenli UI rehberliği verildi.",
    readOnly: true,
    quickActions: [],
    followUpPrompt: "Devamını anlat",
  };
}

function canonicalVisibleControl(screenContext, targetKey) {
  return (Array.isArray(screenContext?.uiHints?.visibleButtons) ? screenContext.uiHints.visibleButtons : [])
    .find((item) => (
      String(item?.identitySource || '').trim().toUpperCase() === 'CANONICAL'
        && String(item?.targetKey || '').trim() === targetKey
        && !item?.disabled
    )) || null;
}

// The server-backed saved-draft chooser is an actual foreground surface. It
// has a different product meaning from both the pre-wizard entry action and
// the first wizard step. Compose it from only the live canonical controls
// carried by the authorized UI envelope; no chooser action is executed here.
function buildGuidedDraftChooserResponse({ user, screenContext, semanticPlan } = {}) {
  const chooser = semanticPlan?.guidedDraftChooser;
  if (!semanticPlan?.guidedDraftChooserIntent || chooser?.kind !== 'SAVED_DRAFT_CHOOSER') return null;
  const title = String(chooser.title || '').trim();
  const resume = canonicalVisibleControl(screenContext, 'company:guided-draft-resume');
  if (!title || !resume) return null;
  const newPlan = canonicalVisibleControl(screenContext, 'company:guided-draft-new');
  const discard = canonicalVisibleControl(screenContext, 'company:guided-draft-discard');
  const availability = chooser.draftAvailability && typeof chooser.draftAvailability === 'object'
    ? chooser.draftAvailability
    : null;
  const draftCount = Math.max(0, Number(availability?.count || 0) || 0);
  const actionLines = [
    `“${String(resume.label || '').trim()}” mevcut taslağı kanıtlanan güvenli adımından sürdürür.`,
    newPlan ? `“${String(newPlan.label || '').trim()}” mevcut taslağı silmeden yeni başlangıç yolunu açar.` : null,
    discard ? `“${String(discard.label || '').trim()}” yıkıcı bir işlemdir; yalnızca açık kullanıcı niyeti ve ayrı onayla uygulanır.` : null,
  ].filter(Boolean);
  const countLine = draftCount > 0 ? `Şu anda ${draftCount} kayıtlı taslak var.` : '';
  const reply = `${title} seçimindesin. Bu pencere, mevcut rehberli taslağı nasıl sürdüreceğini seçmek içindir. ${countLine} ${actionLines.join(' ')} Bu seçimi yapana kadar Şirket konumu adımında değilsin. Sefer Abi yalnızca seçenekleri açıklar; taslak oluşturmaz, silmez veya ilerletmez.`.replace(/\s+/g, ' ').trim();
  return {
    reply,
    summary: reply,
    contextSummary: title,
    questionType: 'SCREEN_PURPOSE',
    activeTopic: 'CREATE_SHIFT',
    assistantIntent: 'GUIDED_DRAFT_CHOOSER_GUIDANCE',
    responseSections: [
      { title: 'Mevcut yüzey', body: `${title} seçimindesin. ${countLine}`.trim() },
      { title: 'Seçenekler', body: actionLines.join(' ') },
      { title: 'Güvenli sınır', body: 'Sefer Abi seçim yapmaz, taslak oluşturmaz veya silmez.' },
    ],
    dataSources: ['yetkili canlı taslak seçici', 'sunucu destekli rehberli taslak durumu'],
    reasoning: 'Ön plandaki canlı taslak seçici, geniş Planlama Merkezi ekranından daha özgül mevcut yüzeydir.',
    safeNextStep: `Önce “${String(resume.label || '').trim()}” seçeneğinin uygun olup olmadığını kontrol et.`,
    nextAction: `Sıradaki güvenli seçim: ${String(resume.label || '').trim()}.`,
    workflowEntryState: 'SAVED_DRAFT_CHOOSER',
    workflowStepReference: null,
    workflowStepOrdinal: null,
    taskState: {
      activeGoal: 'GUIDED_DRAFT_SELECTION',
      activeWorkflow: 'COMPANY_GUIDED_NEW_PLAN',
      activeStep: null,
      currentExpectedStep: null,
      workflowEntryState: 'SAVED_DRAFT_CHOOSER',
      currentSurface: { path: screenContext?.path || null, label: title },
      currentRole: String(user?.role || '').toUpperCase() || null,
      safeOnly: true,
    },
    readOnly: true,
  };
}

function rowValueByLabels(rows, labels) {
  const items = Array.isArray(rows) ? rows : [];
  const targetLabels = (Array.isArray(labels) ? labels : []).map((item) => normalizeVisibleKey(item)).filter(Boolean);
  if (!items.length || !targetLabels.length) return "";
  for (const row of items) {
    const rowLabel = normalizeVisibleKey(firstNonEmpty(row?.label, row?.key, row?.title, ""));
    if (!rowLabel) continue;
    if (!targetLabels.some((label) => rowLabel.includes(label))) continue;
    return firstNonEmpty(row?.value, row?.text, row?.status, row?.summary, "");
  }
  return "";
}

function extractPlateFromVisibleText(value) {
  const text = normalizeVisibleText(value);
  if (!text) return "";
  const explicit = text.match(/\b(?:Araç|Vehicle)\s*([A-Z0-9-]{5,})\b/i);
  if (explicit?.[1]) return explicit[1];
  if (/^[A-Z0-9-]{5,}$/i.test(text)) return text;
  return "";
}

function extractVisibleValueFromText(value, labels = []) {
  const text = normalizeVisibleText(value);
  if (!text) return "";
  const labelList = (Array.isArray(labels) ? labels : [labels]).map((item) => normalizeVisibleText(item)).filter(Boolean);
  for (const label of labelList) {
    const escaped = escapeRegExp(label);
    const patterns = [
      new RegExp(`(?:^|[•\\-])\\s*${escaped}\\s*[:：]?\\s*([^•]+)`, "i"),
      new RegExp(`(?:^|[•\\-])\\s*${escaped}\\s+([^•]+)`, "i"),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return normalizeVisibleText(match[1]);
    }
  }
  return "";
}

function buildLiveSelectionSnapshot(screenContext) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : screenContext?.liveFacts && typeof screenContext.liveFacts === "object"
      ? screenContext.liveFacts
      : null;
  const fields = selectedRows(screenContext, "selectedFields");
  const badges = selectedRows(screenContext, "selectedBadges");
  const selectedSummary = firstNonEmpty(
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.selectedSummary,
    screenContext?.selectedLabel,
    screenContext?.selectedRecordStatus,
    facts?.helpContextSummary,
    facts?.contextSummary,
    facts?.selectedRecordSummary,
    facts?.selectedRecordStatus,
    facts?.copilotSummary,
    facts?.summary,
    "",
  );
  const vehiclePlate = firstNonEmpty(
    rowValueByLabels(fields, ["Araç", "Vehicle", "Plaka"]),
    rowValueByLabels(badges, ["Araç", "Vehicle", "Plaka"]),
    extractPlateFromVisibleText(selectedSummary),
    extractPlateFromVisibleText(screenContext?.selectedLabel),
    extractPlateFromVisibleText(screenContext?.helpContextSummary),
    extractPlateFromVisibleText(screenContext?.contextSummary),
    extractPlateFromVisibleText(facts?.selectedRecordLabel),
    "",
  );
  const gpsStatus = firstNonEmpty(
    rowValueByLabels(fields, ["GPS", "Canlılık", "Live"]),
    rowValueByLabels(badges, ["GPS", "Canlılık", "Live"]),
    rowValueByLabels(fields, ["Durum"]),
    rowValueByLabels(badges, ["Durum"]),
    extractVisibleValueFromText(selectedSummary, ["GPS", "Canlılık", "Live", "Durum"]),
    "",
  );
  const lastGps = firstNonEmpty(rowValueByLabels(fields, ["Son GPS", "Last GPS"]), extractVisibleValueFromText(selectedSummary, ["Son GPS", "Last GPS"]), "");
  const nextStop = firstNonEmpty(rowValueByLabels(fields, ["Sıradaki Durak", "Sıradaki durak", "Next Stop"]), extractVisibleValueFromText(selectedSummary, ["Sıradaki Durak", "Sıradaki durak", "Next Stop", "Sıradaki"]), "");
  const totalStops = firstNonEmpty(rowValueByLabels(fields, ["Toplam Durak", "Toplam durak", "Durak Sayısı", "Durak sayısı"]), extractVisibleValueFromText(selectedSummary, ["Toplam Durak", "Toplam durak", "Durak Sayısı", "Durak sayısı"]), "");
  const eta = firstNonEmpty(rowValueByLabels(fields, ["ETA"]), extractVisibleValueFromText(selectedSummary, ["ETA"]), "");
  const noLiveVehicleText = normalizeVisibleText([
    screenContext?.selectedSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedRecordStatus,
    facts?.selectedSummary,
    facts?.selectedRecordSummary,
    facts?.helpContextSummary,
    facts?.contextSummary,
    facts?.selectedRecordStatus,
    facts?.summary,
    facts?.copilotSummary,
  ].filter(Boolean).join(" • "));
  const noLiveVehicle = String(screenContext?.path || "").includes("/parent/live")
    && (
      facts?.noLiveVehicle === true
      || facts?.liveVehicleVisible === false
      || /canlı araç görünmüyor|canli araç görünmüyor|canli arac gorunmuyor|araç yok|arac yok|araç:\s*0|arac:\s*0|canlı konum görünmüyor|canli konum görünmüyor|aktif vardiya saat aralığı|araç ataması varsa görünür|arac ataması varsa görünür/i.test(noLiveVehicleText)
    );
  const gpsFreshness = normalizeGpsFreshness({ gpsStatus, gpsAge: lastGps, gpsLast: lastGps, etaMinutes: eta });
  const gpsStatusLabel = getGpsReliabilityLabel({ gpsStatus, gpsAge: lastGps, gpsLast: lastGps });
  const lastGpsLabel = getGpsAgeText({ gpsAge: lastGps, gpsLast: lastGps });
  const etaLabel = getEtaDisplay({
    gpsStatus,
    gpsAge: lastGps,
    gpsLast: lastGps,
    etaMinutes: eta,
    nextStopName: nextStop,
  });
  const nextStopLabel = gpsFreshness.isFresh ? "Sıradaki durak" : "Son bilinen sıradaki durak";
  const hasSelection = !noLiveVehicle && Boolean(vehiclePlate || selectedSummary || gpsStatus || lastGps || nextStop || totalStops || eta);
  const mainLead = noLiveVehicle
    ? "Şu an bu çocuk için canlı araç görünmüyor."
    : vehiclePlate
      ? `Seçili araç ${vehiclePlate} görünüyor.`
      : selectedSummary
        ? `Seçili kayıt ${selectedSummary} görünüyor.`
        : "Bu ekranda seçili araç bilgisi net görünmüyor.";
  const detailBits = [];
  if (gpsStatus) detailBits.push(`GPS ${gpsStatusLabel}.`);
  if (lastGps) detailBits.push(`Son GPS ${lastGpsLabel}.`);
  if (nextStop) detailBits.push(`${nextStopLabel} ${nextStop}${totalStops ? `, toplam durak ${totalStops}` : ""} görünüyor.`);
  if (eta) detailBits.push(`ETA ${etaLabel}.`);
  const recommendation = "Araç haritada güvenilir görünmüyorsa önce son GPS zamanını, araç bağlantısını, görev bağlantısını ve Sürücünün telefon GPS’i durumunu kontrol et.";
  const summary = noLiveVehicle
    ? "Şimdi: Bu çocuk için canlı araç görünmüyor. Araç sadece aktif vardiya saat aralığında ve araç ataması varsa görünür. Önce aktif servis saati, araç ataması ve canlı konum durumunu kontrol et."
    : hasSelection && (vehiclePlate || gpsStatus || lastGps || nextStop || eta || totalStops)
    ? `Şimdi: ${[mainLead, ...detailBits, recommendation].join(" ")}`
    : `Şimdi: ${mainLead} Araç haritada görünmüyorsa önce son GPS zamanı, araç bağlantısı, görev bağlantısı ve Sürücünün telefon GPS’i durumunu kontrol et.`;
  return {
    hasSelection,
    noLiveVehicle,
    vehiclePlate,
    gpsStatus,
    lastGps,
    nextStop,
    totalStops,
    eta,
    selectedSummary,
    summary,
  };
}

function buildJobGuideMismatchFallback({ jobType, guideLevel, context, screenContext, entityType, entityId, user }) {
  const pathText = String(context?.path || context?.screenPath || context?.screen?.path || "").toLowerCase();
  const liveSnapshot = buildLiveSelectionSnapshot(screenContext);
  const isGpsSurface = /\/map\b|\/live\b/.test(pathText) || ["TELEMATICS_DEVICE_CREATE", "LOCATION_SOURCE_GUIDE", "GPS_SIGNAL_DIAGNOSIS_GUIDE"].includes(String(jobType || ""));
  const summary = isGpsSurface
    ? (liveSnapshot.noLiveVehicle
      ? liveSnapshot.summary
      : (liveSnapshot.hasSelection
      ? liveSnapshot.summary
      : "Şimdi: Bu ekranda seçili araç bilgisi net görünmüyor. Araç haritada görünmüyorsa önce son GPS zamanı, araç bağlantısı, görev bağlantısı ve Sürücünün telefon GPS’i durumunu kontrol et."))
    : (liveSnapshot.hasSelection
      ? `Şimdi: Seçili kayıt ${liveSnapshot.selectedSummary || "görünüyor"}. İlgili kaydı açıp tekrar dene.`
      : "Şimdi: Bu ekranda seçili kayıt bilgisi net görünmüyor. İlgili kaydı açıp tekrar dene.");
  const quickActions = buildQuickActions({ jobType, context, user });
  const ifStuck = buildIfStuck({ jobType, context, user });
  return {
    ok: true,
    provider: "local-job-guide",
    mode: "JOB_GUIDE",
    copilotVersion: "M46.6-B",
    generatedAt: new Date().toISOString(),
    intent: "JOB_GUIDE",
    intentLabel: "İş Rehberi",
    entityType,
    entityId: Number(entityId),
    jobType,
    guideLevel: normalizeGuideLevel(guideLevel),
    scope: {
      role: String(user?.role || ""),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
    },
    summary,
    jobPurpose: summary,
    plainSummary: summary,
    screenExplanation: summary,
    whatToDoNow: isGpsSurface
      ? "Son GPS zamanını, araç bağlantısını, görev bağlantısını ve Sürücünün telefon GPS’i durumunu kontrol et."
      : "İlgili kaydı açıp seçili alanları tekrar kontrol et.",
    whatToDoNext: isGpsSurface
      ? "Seçili araç netleşirse canlı takip ekranında yeniden kontrol et."
      : "İlgili kayıt netleşirse aynı ekranda yeniden oku.",
    doNotDo: "İç hata kodunu kullanıcıya gösterme.",
    beforeYouStart: isGpsSurface
      ? [
        "Son GPS zamanını kontrol et.",
        "Araç bağlantısını kontrol et.",
        "Sürücünün telefon GPS’i durumunu kontrol et.",
      ]
      : [
        "Seçili kaydı ve alanları tekrar kontrol et.",
        "Eksik alan varsa önce onları tamamla.",
      ],
    canProceed: false,
    whyBlocked: isGpsSurface
      ? (
        liveSnapshot.hasSelection
          ? [
            liveSnapshot.vehiclePlate ? `Seçili araç ${liveSnapshot.vehiclePlate} için canlı sinyal ve bağlantı birlikte okunmalı.` : "Seçili kayıt için canlı sinyal ve bağlantı birlikte okunmalı.",
          ]
          : [
            "Seçili araç bilgisi net görünmüyor.",
          ]
      )
      : (
        liveSnapshot.hasSelection
          ? ["Seçili kayıt bilgisi var; ilgili kaydı açıp tekrar dene."]
          : ["Seçili kayıt bilgisi net görünmüyor."]
      ),
    lockedActionReasons: [
      isGpsSurface
        ? "Araç görünürlüğü için araç ve GPS sinyali birlikte okunur."
        : "Seçili kayıt tipi ile rehber yüzeyi uyuşmuyor.",
    ],
    quickActions,
    ifStuck,
    copyOutputs: [
      { label: "Kısa durum", value: summary },
    ],
  };
}

function unique(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).filter((x) => x != null && `${x}`.trim() !== "")));
}

function clamp(min, value, max) {
  return Math.min(max, Math.max(min, value));
}

function roundConfidence(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(clamp(0.5, value, 0.99).toFixed(2));
}

function mapBlocker(code) {
  const map = {
    VEHICLE_MISSING: "Araç ataması eksik.",
    DRIVER_MISSING: "Sürücü ataması eksik.",
    STOPS_MISSING: "Durak verisi eksik.",
    CAPACITY_EXCEEDED: "Kapasite ihtiyacı mevcut araç kapasitesini aşıyor.",
    EXTEND_PENDING: "Süre uzatma kararı beklemede.",
    NO_ACTIVE_DEVICE: "Aktif telematics cihazı görünmüyor.",
    NO_GPS_SIGNAL: "GPS sinyali görünmüyor.",
    GPS_STALE: "GPS verisi stale durumda.",
  };
  return map[String(code || "")] || String(code || "-");
}

function ageMinutes(input) {
  const d = input ? new Date(input) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.round((Date.now() - d.getTime()) / 60000);
}

function shiftMissingData(context) {
  const out = [];
  if (!context?.vehicleId) out.push("Araç ataması görünmüyor.");
  if (!context?.driverId) out.push("Sürücü ataması görünmüyor.");
  if (!Number(context?.stopCount || 0)) out.push("Durak verisi görünmüyor.");
  if (!context?.roomId && String(context?.status || "") !== "REQUESTED") out.push("Room ataması görünmüyor.");
  if (!context?.companyId) out.push("Şirket kapsamı görünmüyor.");
  return unique(out);
}

function vehicleMissingData(context) {
  const out = [];
  if (!Number(context?.activeDeviceCount || 0)) out.push("Aktif telematics device görünmüyor.");
  if (!context?.gpsLast?.at) out.push("Son GPS zamanı görünmüyor.");
  if (!context?.driver?.id) out.push("Araç için default sürücü bağı görünmüyor.");
  if (!(context?.currentShiftIds || []).length) out.push("Aktif shift bağı görünmüyor.");
  return unique(out);
}

function deriveBlockers(base, context) {
  const blockers = [];
  for (const code of Array.isArray(base?.blocks) ? base.blocks : []) blockers.push(mapBlocker(code));
  if (context?.type === "shift" && String(context?.status || "") === "APPROVED" && !context?.roomId) {
    blockers.push("APPROVED vardiyada room ataması görünmüyor.");
  }
  if (context?.type === "vehicle" && (context?.currentShiftIds || []).length > 0 && !context?.gpsLast?.at) {
    blockers.push("Aktif shift bağlı araçta canlı GPS sinyali görünmüyor.");
  }
  return unique(blockers);
}

function deriveOverallStatus(base, blockers, missingData) {
  if ((blockers || []).length || String(base?.severity || "") === "CRITICAL") return "BLOCKED";
  if ((missingData || []).length >= 2 || ["WARN", "INFO"].includes(String(base?.severity || "")) || (base?.risks || []).length) return "ATTENTION";
  return "OK";
}

function deriveActionability(overallStatus, blockers, missingData, consistencyChecks) {
  if (overallStatus === "BLOCKED" || (blockers || []).length >= 2) return "NOT_READY";
  const hasWarnConsistency = (consistencyChecks || []).some((x) => ["WARN", "BLOCKED"].includes(String(x?.status || "")));
  if ((missingData || []).length || hasWarnConsistency || overallStatus === "ATTENTION") return "REVIEW_NEEDED";
  return "READY";
}

function deriveDataFreshness(context) {
  if (context?.type === "vehicle") {
    const age = ageMinutes(context?.gpsLast?.at);
    if (age == null) return "UNKNOWN";
    if (age <= 15) return "FRESH";
    return "STALE";
  }
  const startAge = ageMinutes(context?.startAt);
  if (startAge == null) return "UNKNOWN";
  if (Math.abs(startAge) <= 720) return "FRESH";
  if (Math.abs(startAge) <= 2880) return "STALE";
  return "UNKNOWN";
}

function deriveCoverage(base, missingData) {
  const evidenceCount = Array.isArray(base?.evidence) ? base.evidence.length : 0;
  if (evidenceCount >= 5 && (missingData || []).length <= 1) return "SUFFICIENT";
  if (evidenceCount >= 3 && (missingData || []).length <= 3) return "PARTIAL";
  return "WEAK";
}

function relatedEvidence(base, fragments) {
  const evidence = Array.isArray(base?.evidence) ? base.evidence : [];
  const keys = (Array.isArray(fragments) ? fragments : []).map((x) => String(x || "").toLowerCase()).filter(Boolean);
  const matched = evidence.filter((line) => keys.some((k) => String(line || "").toLowerCase().includes(k)));
  return (matched.length ? matched : evidence).slice(0, 3);
}

function relatedReferenceKeys(base, preferred) {
  const refs = base?.references && typeof base.references === "object" ? Object.keys(base.references) : [];
  const wanted = (Array.isArray(preferred) ? preferred : []).filter((x) => refs.includes(x));
  return (wanted.length ? wanted : refs).slice(0, 5);
}

function action(title, reason, priority, preconditions, linkedEvidence, linkedReferences) {
  return {
    title,
    reason,
    priority,
    preconditions: unique(preconditions || []).slice(0, 4),
    linkedEvidence: unique(linkedEvidence || []).slice(0, 3),
    linkedReferences: unique(linkedReferences || []).slice(0, 5),
  };
}

function buildShiftActions(intent, context, base, missingData, blockers) {
  const actions = [];
  if (!context?.vehicleId) {
    actions.push(action(
      "Araç atamasını netleştir",
      "Araç ataması eksik olduğu için vardiya karar kalitesi düşüyor.",
      "HIGH",
      ["Uygun araç havuzu görünür olmalı", "Room/company scope doğrulanmalı"],
      relatedEvidence(base, ["vehicleId", "requiredPax", "status"]),
      relatedReferenceKeys(base, ["shiftId", "vehicleId", "requiredPax", "openOfferCount"]),
    ));
  }
  if (!context?.driverId) {
    actions.push(action(
      "Sürücü atamasını tamamla",
      "Sürücü eksikliği atama hazırlığını doğrudan bloklayabilir.",
      "HIGH",
      ["Müsait sürücü veya bind ekranı erişimi olmalı"],
      relatedEvidence(base, ["driverId", "status", "assignmentCount"]),
      relatedReferenceKeys(base, ["shiftId", "driverId", "assignmentCount"]),
    ));
  }
  if (!Number(context?.stopCount || 0)) {
    actions.push(action(
      "Durak üretimini/persist adımını doğrula",
      "Durak verisi olmadan operasyon ve atama kararı zayıf kalır.",
      "HIGH",
      ["Rota/durak üretim akışı erişilebilir olmalı"],
      relatedEvidence(base, ["stopCount", "startAt"]),
      relatedReferenceKeys(base, ["shiftId", "stopCount", "progressId"]),
    ));
  }
  if (String(context?.roomOfferDecision || "") === "PENDING" || Number(context?.openOfferCount || 0) > 0 || intent === "OFFER_DECISION_HELP") {
    actions.push(action(
      "Offer kararını kapat",
      "Bekleyen offer/decision akışı karar tutarlılığını düşürüyor.",
      String(context?.roomOfferDecision || "") === "PENDING" ? "HIGH" : "MEDIUM",
      ["Room/company teklif alanları birlikte karşılaştırılmalı"],
      relatedEvidence(base, ["openOfferCount", "status", "vehicleId"]),
      relatedReferenceKeys(base, ["shiftId", "openOfferCount", "offeredRoomIds", "vehicleId"]),
    ));
  }
  if (!actions.length) {
    actions.push(action(
      "Canlı operasyon takibini sürdür",
      blockers?.[0] || missingData?.[0] || "Kritik ek bloklayıcı görünmüyor.",
      "LOW",
      ["Audit ve canlı panel görünürlüğü açık olmalı"],
      relatedEvidence(base, ["status", "startAt"]),
      relatedReferenceKeys(base, ["shiftId", "progressId", "roomId", "companyId"]),
    ));
  }
  return actions.slice(0, 4);
}

function buildVehicleActions(context, base, missingData, blockers) {
  const actions = [];
  if (!Number(context?.activeDeviceCount || 0)) {
    actions.push(action(
      "ACTIVE device hattını düzelt",
      "Aktif device olmadan telematics ve GPS kararları güvenilir değildir.",
      "HIGH",
      ["ROOM > Vehicles > Telematics erişimi olmalı"],
      relatedEvidence(base, ["activeDeviceCount", "deviceIds", "plate"]),
      relatedReferenceKeys(base, ["vehicleId", "deviceIds", "activeDeviceIds"]),
    ));
  }
  if (!context?.gpsLast?.at) {
    actions.push(action(
      "Son ingest akışını doğrula",
      "GPS zaman damgası görünmüyor; direct push/vendor hattı kontrol edilmeli.",
      "HIGH",
      ["Provider/shared secret ve son push izleri erişilebilir olmalı"],
      relatedEvidence(base, ["gpsLastAt", "gpsUiState", "deviceIds"]),
      relatedReferenceKeys(base, ["vehicleId", "gpsLastAt", "gpsUiState", "deviceIds"]),
    ));
  }
  if (String(context?.gpsState?.lastUiStatus || "") === "STALE") {
    actions.push(action(
      "STALE sinyali tazele",
      "UI state stale olduğu için kararlar güncel veriyle desteklenmiyor.",
      "MEDIUM",
      ["gpsState ve notify hattı birlikte doğrulanmalı"],
      relatedEvidence(base, ["gpsUiState", "gpsLastAt"]),
      relatedReferenceKeys(base, ["vehicleId", "gpsUiState", "currentShiftIds"]),
    ));
  }
  if (!actions.length) {
    actions.push(action(
      "Canlı GPS takibini sürdür",
      blockers?.[0] || missingData?.[0] || "Kritik telematics bloklayıcısı görünmüyor.",
      "LOW",
      ["Canlı panel ve harita karşılaştırması erişilebilir olmalı"],
      relatedEvidence(base, ["plate", "gpsLastAt", "currentShiftIds"]),
      relatedReferenceKeys(base, ["vehicleId", "currentShiftIds", "gpsLastAt"]),
    ));
  }
  return actions.slice(0, 4);
}

function actionPriorityBase(priority) {
  if (priority === "HIGH") return 82;
  if (priority === "MEDIUM") return 58;
  return 34;
}

function matchesActionTopic(text, fragments) {
  const hay = String(text || "").toLowerCase();
  return (Array.isArray(fragments) ? fragments : []).some((part) => hay.includes(String(part || "").toLowerCase()));
}

function deriveActionBlockedBy(actionItem, blockers, missingData) {
  const text = `${actionItem?.title || ""} ${actionItem?.reason || ""}`;
  return unique([...(blockers || []), ...(missingData || [])].filter((item) => {
    const sample = String(item || "").toLowerCase();
    if (matchesActionTopic(text, ["araç", "vehicle"])) return sample.includes("araç") || sample.includes("vehicle");
    if (matchesActionTopic(text, ["sürücü", "driver"])) return sample.includes("sürücü") || sample.includes("driver");
    if (matchesActionTopic(text, ["durak", "rota", "stop"])) return sample.includes("durak") || sample.includes("stop") || sample.includes("rota");
    if (matchesActionTopic(text, ["offer", "teklif"])) return sample.includes("offer") || sample.includes("teklif") || sample.includes("karar");
    if (matchesActionTopic(text, ["gps", "signal", "device", "ingest", "stale", "telematics"])) return sample.includes("gps") || sample.includes("device") || sample.includes("signal") || sample.includes("stale") || sample.includes("telematics");
    return false;
  })).slice(0, 3);
}

function deriveActionDependsOn(actionItem, context) {
  const text = `${actionItem?.title || ""} ${actionItem?.reason || ""}`;
  const out = [];
  if (matchesActionTopic(text, ["sürücü", "driver"]) && !context?.vehicleId) out.push("Araç seçimi netleşmeli.");
  if (matchesActionTopic(text, ["offer", "teklif"]) && String(context?.roomOfferDecision || "") === "PENDING") out.push("Bekleyen room offer kararı netleşmeli.");
  if (matchesActionTopic(text, ["gps", "signal", "device", "ingest", "stale"]) && !Number(context?.activeDeviceCount || 0)) out.push("Önce ACTIVE device hattı görünür olmalı.");
  if (matchesActionTopic(text, ["durak", "rota", "stop"]) && !context?.roomId && context?.type === "shift") out.push("Room/scope ataması görünür olmalı.");
  for (const item of actionItem?.preconditions || []) out.push(item);
  return unique(out).slice(0, 4);
}

function deriveActionPriorityScore(actionItem, context, overallStatus, dataFreshness, blockedBy, missingData) {
  let score = actionPriorityBase(actionItem?.priority);
  score += Math.min(12, (blockedBy || []).length * 6);
  score += Math.min(8, (missingData || []).length * 2);
  if (overallStatus === "BLOCKED" && actionItem?.priority === "HIGH") score += 8;
  if (dataFreshness === "STALE" && matchesActionTopic(actionItem?.title, ["gps", "signal", "device", "ingest", "stale"])) score += 8;
  if (matchesActionTopic(actionItem?.title, ["offer", "teklif"]) && Number(context?.openOfferCount || 0) > 0) score += 6;
  if (matchesActionTopic(actionItem?.title, ["durak", "rota", "stop"]) && !Number(context?.stopCount || 0)) score += 7;
  if (matchesActionTopic(actionItem?.title, ["araç", "vehicle"]) && !context?.vehicleId) score += 8;
  if (matchesActionTopic(actionItem?.title, ["sürücü", "driver"]) && !context?.driverId) score += 8;
  return Math.round(clamp(25, score, 99));
}

function deriveActionWhyNow(actionItem, overallStatus, dataFreshness, blockedBy, missingData) {
  const notes = [];
  if (overallStatus === "BLOCKED") notes.push("karar katmanı şu an blocked durumda");
  else if (overallStatus === "ATTENTION") notes.push("karar katmanı dikkat istiyor");
  if (blockedBy?.length) notes.push(`doğrudan ilişkili blocker: ${blockedBy[0]}`);
  else if (missingData?.length) notes.push(`eksik veri baskısı: ${missingData[0]}`);
  if (dataFreshness === "STALE") notes.push("veri güncelliği stale");
  if (dataFreshness === "UNKNOWN") notes.push("veri güncelliği tam doğrulanamadı");
  if (!notes.length) notes.push(actionItem?.reason || "aksiyon planı ilk sıraya alınmalı");
  return notes.join("; ") + ".";
}

function calibrateActionPlan(recommendedActions, context, base, meta) {
  const enriched = (Array.isArray(recommendedActions) ? recommendedActions : []).map((item, index) => {
    const blockedBy = deriveActionBlockedBy(item, meta?.blockers, meta?.missingData);
    const dependsOn = deriveActionDependsOn(item, context);
    const priorityScore = deriveActionPriorityScore(item, context, meta?.overallStatus, meta?.dataFreshness, blockedBy, meta?.missingData);
    const evidenceLinks = unique(item?.linkedEvidence || []).slice(0, 3);
    const referenceLinks = unique(item?.linkedReferences || []).slice(0, 5);
    return {
      ...item,
      blockedBy,
      dependsOn,
      evidenceLinks,
      referenceLinks,
      priorityScore,
      whyNow: deriveActionWhyNow(item, meta?.overallStatus, meta?.dataFreshness, blockedBy, meta?.missingData),
      sortIndex: index,
    };
  }).sort((a, b) => {
    if ((b?.priorityScore || 0) !== (a?.priorityScore || 0)) return (b?.priorityScore || 0) - (a?.priorityScore || 0);
    return (a?.sortIndex || 0) - (b?.sortIndex || 0);
  }).map(({ sortIndex: _sortIndex, ...rest }) => rest);

  const recommendedFirstAction = enriched[0]
    ? {
        title: enriched[0].title,
        priority: enriched[0].priority,
        priorityScore: enriched[0].priorityScore,
        whyNow: enriched[0].whyNow,
        blockedBy: enriched[0].blockedBy,
        evidenceLinks: enriched[0].evidenceLinks,
        referenceLinks: enriched[0].referenceLinks,
      }
    : null;

  const calibrationNotes = [];
  if (meta?.dataFreshness === "STALE") calibrationNotes.push("STALE veri nedeniyle aksiyon öncelikleri canlı sinyal / ingest düzeltmelerine kaydırıldı.");
  if (meta?.coverage === "WEAK") calibrationNotes.push("Coverage WEAK olduğu için yüksek öncelikli aksiyonlar daha fazla doğrulama adımıyla okunmalı.");
  if (meta?.coverage === "PARTIAL") calibrationNotes.push("Coverage PARTIAL; karar özetini referans ve evidence ile birlikte okumak gerekir.");
  if ((meta?.missingData || []).length) calibrationNotes.push(`Eksik veri sayısı ${(meta?.missingData || []).length}; öncelik puanı eksik veri baskısını da içerir.`);
  if ((meta?.blockers || []).length) calibrationNotes.push(`Blocker sayısı ${(meta?.blockers || []).length}; ilk aksiyon blocker çözmeye daha yakın seçildi.`);
  if ((enriched[0]?.evidenceLinks || []).length === 0) calibrationNotes.push("İlk aksiyon için linked evidence zayıf; reference ve nextChecks birlikte okunmalı.");
  if (!calibrationNotes.length) calibrationNotes.push("Kalibrasyon notu: aksiyon planı temiz sinyalle üretildi; yine de evidence, reference ve nextChecks birlikte okunmalı.");

  const actionPlanSummary = recommendedFirstAction
    ? `İlk önerilen aksiyon: ${recommendedFirstAction.title} (score ${recommendedFirstAction.priorityScore}). ${recommendedFirstAction.whyNow}`
    : "İlk önerilen aksiyon üretilemedi.";

  return {
    recommendedActions: enriched.slice(0, 4),
    recommendedFirstAction,
    calibrationNotes: unique(calibrationNotes).slice(0, 5),
    actionPlanSummary,
  };
}

function buildConsistencyChecks(base, context, recommendedActions, overallStatus, actionability, dataFreshness, coverage, missingData, blockers, recommendedFirstAction, calibrationNotes) {
  const checks = [];
  const confidence = roundConfidence(base?.confidence);
  const evidenceCount = Array.isArray(base?.evidence) ? base.evidence.length : 0;
  checks.push({
    label: "Confidence vs Evidence",
    status: confidence != null && confidence >= 0.85 && evidenceCount < 3 ? "WARN" : "GOOD",
    detail: confidence != null ? `confidence=${Math.round(confidence * 100)}%, evidence=${evidenceCount}` : `evidence=${evidenceCount}`,
  });
  checks.push({
    label: "Freshness vs Status",
    status: dataFreshness === "STALE" && overallStatus === "OK" ? "WARN" : (dataFreshness === "UNKNOWN" ? "WARN" : "GOOD"),
    detail: `freshness=${dataFreshness}, overallStatus=${overallStatus}`,
  });
  checks.push({
    label: "Coverage vs Confidence",
    status: coverage === "WEAK" && (confidence || 0) >= 0.8 ? "WARN" : "GOOD",
    detail: `coverage=${coverage}, confidence=${confidence != null ? Math.round(confidence * 100) + '%' : '-'}`,
  });
  checks.push({
    label: "Action Plan Completeness",
    status: (recommendedActions || []).length ? "GOOD" : "WARN",
    detail: `recommendedActions=${(recommendedActions || []).length}`,
  });
  checks.push({
    label: "Readiness vs Missing Data",
    status: actionability === "READY" && ((missingData || []).length || (blockers || []).length) ? "WARN" : "GOOD",
    detail: `actionability=${actionability}, missingData=${(missingData || []).length}, blockers=${(blockers || []).length}`,
  });
  checks.push({
    label: "Priority vs Evidence Links",
    status: (recommendedActions || []).some((x) => Number(x?.priorityScore || 0) >= 80 && !(x?.evidenceLinks || []).length) ? "WARN" : "GOOD",
    detail: `priority80+=${(recommendedActions || []).filter((x) => Number(x?.priorityScore || 0) >= 80).length}`,
  });
  checks.push({
    label: "First Action Availability",
    status: recommendedFirstAction?.title ? "GOOD" : "WARN",
    detail: recommendedFirstAction?.title ? `first=${recommendedFirstAction.title}` : "first action missing",
  });
  checks.push({
    label: "Calibration Notes",
    status: (calibrationNotes || []).length ? "GOOD" : "WARN",
    detail: `calibrationNotes=${(calibrationNotes || []).length}`,
  });
  if (context?.type === "vehicle") {
    checks.push({
      label: "Vehicle Signal Context",
      status: (context?.currentShiftIds || []).length > 0 && !context?.gpsLast?.at ? "BLOCKED" : "GOOD",
      detail: `currentShiftIds=${(context?.currentShiftIds || []).length}, gpsLastAt=${context?.gpsLast?.at || '-'}`,
    });
  }
  return checks.slice(0, 8);
}

function providerSummary(base, decisionMeta) {
  const confidence = typeof base?.confidence === "number" ? `confidence=${Math.round(base.confidence * 100)}%` : null;
  const evidence = Array.isArray(base?.evidence) ? `evidence=${base.evidence.length}` : null;
  const overallStatus = decisionMeta?.overallStatus ? `overall=${decisionMeta.overallStatus}` : null;
  const actionability = decisionMeta?.actionability ? `actionability=${decisionMeta.actionability}` : null;
  const firstAction = decisionMeta?.recommendedFirstAction?.title ? `firstAction=${decisionMeta.recommendedFirstAction.title}` : null;
  return [confidence, evidence, overallStatus, actionability, firstAction].filter(Boolean).join(" • ");
}

function enrichDecisionLayer(intent, context, base) {
  const missingData = context?.type === "vehicle" ? vehicleMissingData(context) : shiftMissingData(context);
  const blockers = deriveBlockers(base, context);
  const overallStatus = deriveOverallStatus(base, blockers, missingData);
  const dataFreshness = deriveDataFreshness(context);
  const coverage = deriveCoverage(base, missingData);
  const rawActions = context?.type === "vehicle"
    ? buildVehicleActions(context, base, missingData, blockers)
    : buildShiftActions(intent, context, base, missingData, blockers);
  const consistencyChecks = buildConsistencyChecks(base, context, rawActions, overallStatus, "REVIEW_NEEDED", dataFreshness, coverage, missingData, blockers, null, []);
  const actionability = deriveActionability(overallStatus, blockers, missingData, consistencyChecks);
  const actionPlan = calibrateActionPlan(rawActions, context, base, {
    overallStatus,
    actionability,
    dataFreshness,
    coverage,
    missingData,
    blockers,
  });
  const fixedConsistencyChecks = buildConsistencyChecks(
    base,
    context,
    actionPlan.recommendedActions,
    overallStatus,
    actionability,
    dataFreshness,
    coverage,
    missingData,
    blockers,
    actionPlan.recommendedFirstAction,
    actionPlan.calibrationNotes,
  );

  return {
    overallStatus,
    actionability,
    dataFreshness,
    coverage,
    missingData,
    blockers,
    recommendedActions: actionPlan.recommendedActions,
    recommendedFirstAction: actionPlan.recommendedFirstAction,
    calibrationNotes: actionPlan.calibrationNotes,
    actionPlanSummary: actionPlan.actionPlanSummary,
    consistencyChecks: fixedConsistencyChecks,
  };
}

function previousRoomCapabilityGuidanceReply(conversationState) {
  const messages = Array.isArray(conversationState?.recentMessages)
    ? conversationState.recentMessages
    : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const plan = message?.semanticPlan || null;
    if (String(message?.role || '').toLowerCase() !== 'assistant') continue;
    if (String(plan?.family || '').toUpperCase() !== 'UI_GUIDANCE') continue;
    if (String(plan?.roleCapabilityBoundary || '').toUpperCase() !== 'ROOM_CREATE_UNSUPPORTED') continue;
    const reply = String(message?.text || '').trim();
    if (reply) return reply;
  }
  return '';
}

export async function runCopilotFoundation(args = {}) {
  const authorizedScreenContext = resolveIncomingCopilotScreenContext({
    user: args.user,
    screenContext: args.screenContext,
    entityType: args.entityType,
    entityId: args.entityId,
  });
  const canonicalState = getCanonicalConversationState({ user: args.user, screenContext: authorizedScreenContext, authSessionId: args.authSessionId });
  const rawPayload = await runCopilotFoundationInternal({
    ...args,
    screenContext: canonicalState.screenContext,
    conversationState: canonicalState,
  });
  // An explicit canonical authorization result owns the target state for this
  // turn. Do not let the resolver reuse a previous workflow/control target
  // after the current request has been denied for a different role.
  const guidedTarget = rawPayload?.semanticPlan?.roleTargetResolution === "UNAUTHORIZED"
    && rawPayload?.guidedTarget?.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED
    ? rawPayload.guidedTarget
    : resolveCopilotGuidedTarget({
      user: args.user,
      screenContext: canonicalState.screenContext,
      conversationState: canonicalState,
      semanticPlan: rawPayload?.semanticPlan || null,
      message: args.message,
    });
  if (guidedTarget?.status === 'FOUND'
    && rawPayload?.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING'
    && rawPayload?.semanticPlan?.continuationBasePlan?.family === 'UI_GUIDANCE') {
    const targetLabel = String(guidedTarget.label || '').trim();
    if (targetLabel) {
      const continuationAction = String(
        rawPayload.semanticPlan?.typedRequest?.continuationAction
          || rawPayload.semanticPlan?.continuationAction
          || 'CONTINUE',
      ).toUpperCase();
      const previousGuidanceReply = continuationAction === 'BACK'
        ? previousRoomCapabilityGuidanceReply(canonicalState)
        : '';
      if (previousGuidanceReply) {
        rawPayload.reply = previousGuidanceReply;
        rawPayload.summary = previousGuidanceReply;
        if (Array.isArray(rawPayload.responseSections) && rawPayload.responseSections[0]) rawPayload.responseSections[0].body = previousGuidanceReply;
      } else {
        const continuationDepth = Number(rawPayload.semanticPlan?.continuationDepth || 0);
        const progressionReply = continuationDepth > 1
          ? `Bu görevde ${continuationDepth}. devam adımındasın. ${canonicalState.screenContext?.label || 'Bu ekran'} ekranında "${targetLabel}" hâlâ doğrulanabilir sonraki kontrol; tamamlandığını doğrulamadan başka bir adımı tamamlandı saymıyorum.`
          : `Şu anda ${canonicalState.screenContext?.label || 'bu ekran'} ekranındasın. Sıradaki güvenli adım: ${targetLabel}. Bu hedefi kontrol ederek akışa devam edebilirsin.`;
        rawPayload.reply = progressionReply;
        rawPayload.summary = progressionReply;
        if (Array.isArray(rawPayload.responseSections) && rawPayload.responseSections[0]) rawPayload.responseSections[0].body = progressionReply;
      }
      rawPayload.nextAction = `Sıradaki hedef: ${targetLabel}.`;
      rawPayload.safeNextStep = rawPayload.nextAction;
    }
  }
  // A canonical surface-navigation turn must expose the live target that the
  // browser can actually reveal.  The legacy screen composer may otherwise
  // return only a generic current-screen summary even though the same
  // authorized target was resolved for the transport payload.  Keep this
  // presentation-only bridge bounded to the canonical navigation operation;
  // it does not infer a target or grant permission.
  const canonicalTargetedGuidance = [
    'NAVIGATE_AUTHORIZED_SURFACE',
    'VIEW_AUTHORIZED_SURFACE',
    'LOOK_UP_FIELD',
  ].includes(rawPayload?.semanticPlan?.canonicalRequest?.operation);
  if (canonicalTargetedGuidance && guidedTarget?.status === 'FOUND') {
    const targetLabel = String(guidedTarget.label || '').trim();
    if (targetLabel && !String(rawPayload.reply || '').includes(targetLabel)) {
      const targetLine = `Ekranda doğrulayabildiğim hedef: “${targetLabel}”.`;
      rawPayload.reply = `${targetLine} ${String(rawPayload.reply || '').trim()}`.trim();
      rawPayload.summary = rawPayload.reply;
      if (Array.isArray(rawPayload.responseSections) && rawPayload.responseSections[0]) {
        rawPayload.responseSections[0].body = rawPayload.reply;
      }
      rawPayload.nextAction = `“${targetLabel}” hedefini aç.`;
      rawPayload.safeNextStep = rawPayload.nextAction;
    }
  }
  const createCapabilityDenied = rawPayload?.semanticPlan?.authorizationDecision?.reason === "CREATE_CAPABILITY_DENIED_BY_ROLE";
  const guidedDraftChooserResponse = createCapabilityDenied
    ? null
    : buildGuidedDraftChooserResponse({
      user: args.user,
      entityType: args.entityType,
      entityId: args.entityId,
      screenContext: canonicalState.screenContext,
      semanticPlan: rawPayload?.semanticPlan,
    });
  if (guidedDraftChooserResponse) {
    rawPayload.reply = guidedDraftChooserResponse.reply;
    rawPayload.summary = guidedDraftChooserResponse.summary;
    rawPayload.contextSummary = guidedDraftChooserResponse.contextSummary;
    rawPayload.questionType = guidedDraftChooserResponse.questionType;
    rawPayload.activeTopic = guidedDraftChooserResponse.activeTopic;
    rawPayload.assistantIntent = guidedDraftChooserResponse.assistantIntent;
    rawPayload.responseSections = guidedDraftChooserResponse.responseSections;
    rawPayload.dataSources = guidedDraftChooserResponse.dataSources;
    rawPayload.reasoning = guidedDraftChooserResponse.reasoning;
    rawPayload.safeNextStep = guidedDraftChooserResponse.safeNextStep;
    rawPayload.nextAction = guidedDraftChooserResponse.nextAction;
    rawPayload.workflowEntryState = guidedDraftChooserResponse.workflowEntryState;
    rawPayload.workflowStepReference = guidedDraftChooserResponse.workflowStepReference;
    rawPayload.workflowStepOrdinal = guidedDraftChooserResponse.workflowStepOrdinal;
    rawPayload.taskState = guidedDraftChooserResponse.taskState;
  }
  const createShiftTurn = rawPayload?.semanticPlan?.workflowIntent === "CREATE_SHIFT"
    || rawPayload?.semanticPlan?.continuationBasePlan?.workflowIntent === "CREATE_SHIFT";
  if (!createCapabilityDenied
    && createShiftTurn
    && ["UI_GUIDANCE", "CONTINUE_CURRENT_REASONING", "EXPLAIN_CURRENT_TARGET"].includes(rawPayload?.semanticPlan?.family)) {
    const workflowResponse = buildCreateShiftWorkflowResponse({
      user: args.user,
      entityType: args.entityType,
      entityId: args.entityId,
      screenContext: canonicalState.screenContext,
      semanticPlan: rawPayload.semanticPlan,
      conversationState: canonicalState,
      guidedTarget,
    });
    if (workflowResponse) {
      rawPayload.reply = workflowResponse.reply;
      rawPayload.summary = workflowResponse.summary;
      rawPayload.contextSummary = workflowResponse.contextSummary;
      rawPayload.questionType = workflowResponse.questionType;
      rawPayload.activeTopic = workflowResponse.activeTopic;
      rawPayload.assistantIntent = workflowResponse.assistantIntent;
      rawPayload.responseSections = workflowResponse.responseSections;
      rawPayload.dataSources = workflowResponse.dataSources;
      rawPayload.reasoning = workflowResponse.reasoning;
      rawPayload.safeNextStep = workflowResponse.safeNextStep;
      rawPayload.nextAction = workflowResponse.nextAction;
      rawPayload.workflowModel = workflowResponse.workflowModel;
      rawPayload.workflowStepReference = workflowResponse.workflowStepReference;
      rawPayload.workflowStepOrdinal = workflowResponse.workflowStepOrdinal;
      rawPayload.taskState = workflowResponse.taskState;
      if (guidedTarget) rawPayload.guidedTarget = guidedTarget;
    }
  }
  const payload = normalizeSeferAbiUserFacingPayload({
    ...rawPayload,
    ...(guidedTarget ? { guidedTarget } : {}),
    conversationState: {
      guidedTarget: guidedTarget || canonicalState.guidedTarget || null,
      lastScreenPath: canonicalState.screenContext?.path || null,
      lastScreenLabel: canonicalState.screenContext?.label || null,
      selectedLabel: canonicalState.screenContext?.selectedLabel || null,
    },
  });
  commitCanonicalConversationState({
    user: args.user,
    screenContext: canonicalState.screenContext,
    message: args.message,
    payload,
    authSessionId: args.authSessionId,
  });
  return payload;
}

async function runCopilotFoundationInternal({ intent, entityType, entityId, user, jobType, guideLevel, screenContext, message, conversationState }) {
  if (intent === "CHAT_HELP") {
    // Interpret natural language once.  Every later stage receives this same
    // typed request; authorization and retrieval may reject it, but neither
    // may silently reinterpret its task, entity target, or context scope.
    const semanticContext = buildCanonicalSemanticContext({ message, user, conversationState, screenContext });
    const localSemanticProposalResult = await requestLocalSemanticProposal({
      message,
      user,
      screenContext,
      conversationState,
    });
    const localSemanticProposal = localSemanticProposalResult.status === "VALID"
      ? localSemanticProposalResult.proposal
      : null;
    const canonicalRequestResult = resolveCanonicalConversationRequest({
      message,
      user,
      conversationState,
      screenContext,
      semanticContext,
      localSemanticProposal,
    });
    const semanticPlan = resolveSemanticIntent({ message, user, conversationState, screenContext, canonicalRequest: canonicalRequestResult });
    semanticPlan.canonicalRequest = canonicalRequestResult.request;
    semanticPlan.canonicalRequestEnvelope = canonicalRequestResult;
    semanticPlan.canonicalRequestValidation = canonicalRequestResult.validation;
    semanticPlan.canonicalRequestId = canonicalRequestResult.requestId;
    // Stage A exposes the provider-neutral eligibility decision as bounded
    // provenance only. It does not invoke a proposer or alter the canonical
    // semantic/authorization path.
    semanticPlan.canonicalFallbackEligibility = canonicalRequestResult.fallbackEligibility;
    if (localSemanticProposalResult.status !== "DISABLED") {
      semanticPlan.localSemanticProposal = {
        status: localSemanticProposalResult.status,
        applied: Boolean(localSemanticProposal),
        latencyMs: Number(localSemanticProposalResult.latencyMs || 0),
      };
    }
    if (canonicalRequestResult.validation?.status === "SEMANTIC_UNRESOLVED") {
      const reply = "Bu isteği güvenli biçimde ürün anlamına bağlayamadım; hangi yetkili alanı açıklamamı istediğini belirtir misin?";
      return {
        ok: true,
        intent: "CHAT_HELP",
        intentLabel: "Güvenli açıklama",
        provider: "local-canonical-semantic-validation",
        mode: "RULE_BASED",
        scope: { role: String(user?.role || ""), companyId: user?.companyId ?? null, roomId: user?.roomId ?? null },
        reply,
        summary: reply,
        contextSummary: "Geçersiz veya eksik canonical semantic envelope; güvenli açıklama istendi.",
        questionType: "SAFE_CLARIFICATION",
        activeTopic: "SEMANTIC_UNRESOLVED",
        assistantIntent: "SAFE_CLARIFICATION",
        authorizedDomainMap: [],
        authorizedRecords: [],
        retrievedFacts: [],
        responseSections: [{ title: "Güvenli açıklama", body: reply }],
        dataSources: ["canonical semantic validation"],
        reasoning: "Geçersiz envelope OOS olarak sınıflandırılmadı.",
        semanticPlan,
        conversationRoute: "SAFE_CLARIFICATION",
        dialogueTopic: "PRODUCT",
        authorizedProductContext: null,
        readOnly: true,
        quickActions: [],
      };
    }
    const canonicalAuthorization = await authorizeSemanticRequest({ user, plan: semanticPlan, request: canonicalRequestResult.request });
    const roleScopedTargetDenied = semanticPlan.roleTargetResolution === "UNAUTHORIZED";
    semanticPlan.authorizationDecision = {
      ...(semanticPlan.authorizationDecision || {}),
      status: roleScopedTargetDenied ? "DENY" : canonicalAuthorization.status,
      authorizationStatus: roleScopedTargetDenied ? "DENIED" : canonicalAuthorization.authorizationStatus,
      reason: roleScopedTargetDenied ? "ROLE_SCOPED_TARGET_DENIED" : canonicalAuthorization.reason,
      authorizedEntityRefs: canonicalAuthorization.authorizedEntityRefs,
      deniedCandidateRefs: roleScopedTargetDenied
        ? (canonicalRequestResult.request?.candidateEntityRefs || [])
        : canonicalAuthorization.deniedCandidateRefs,
    };
    // A canonical role-scoped target denial is terminal for this turn. It must
    // not be reinterpreted as a stale active-workflow field clarification,
    // generic recovery, or a previous selected target. Task state remains
    // context only and never grants authorization.
    const roleScopedTargetBoundary = buildRoleScopedTargetBoundaryResponse({
      user,
      entityType,
      entityId,
      screenContext,
      semanticPlan,
    });
    if (roleScopedTargetBoundary) return roleScopedTargetBoundary;
    const canonicalCostIntent = hasCanonicalCostIntent(semanticPlan);
    // Cost routing is frozen in the V3 canonical request before authorization;
    // downstream raw-text analysis cannot take over this decision.
    const requestedDomains = semanticPlan.requestedDomains || [];
    const financialScreen = /\/(?:room|company|school|organization)\/(?:financial-operations|operations)\b/i.test(String(screenContext?.path || ""));
    const explicitRoleGlobal = semanticPlan.scopeTarget === "ROLE_GLOBAL"
      || semanticPlan.typedRequest?.scopeTarget === "ROLE_GLOBAL"
      || semanticPlan.primaryTask === "ROLE_GLOBAL";
    const explicitFinancialMetric = semanticPlan.canonicalRequest?.typedEvidence?.specificity?.financialMetricIdentityEvidence === true;
    const costDomainAllowed = canonicalCostIntent
      && semanticPlan.authorizationDecision?.status === "ALLOW"
      && (
        requestedDomains.some((domain) => ["BUDGET", "FINANCE"].includes(domain))
        || (semanticPlan.canonicalRequest?.capability === "COST_ANALYSIS" && requestedDomains.some((domain) => ["VEHICLES", "OPERATIONS", "PERSONNEL", "ORGANIZATION_PLANS"].includes(domain)))
        || (semanticPlan.canonicalRequest?.capability === "COST_ANALYSIS" && financialScreen && ["COMPANY", "ROOM", "SCHOOL", "ORGANIZATION"].includes(String(user?.companyKind || user?.role || "").toUpperCase()))
        || hasCanonicalQuoteFloorEvidence(semanticPlan)
      );
    // The canonical semantic plan owns a grounded guided workflow turn.  A
    // broad cost classifier may still inspect the same raw text (for example
    // “durak”), but it cannot replace an already-authorized workflow meaning
    // with an unrelated cost answer.  Explicit cost plans keep their normal
    // route because they do not carry the CREATE_SHIFT workflow intent.
    const canonicalWorkflowOwnsTurn = Boolean(
      semanticPlan?.planStatus === "READY"
      && (
        semanticPlan?.workflowIntent === "CREATE_SHIFT"
        || semanticPlan?.continuationBasePlan?.workflowIntent === "CREATE_SHIFT"
      )
    );
    // A financial follow-up can be intentionally terse (for example,
    // "10 kişi daha gelirse?").  The current screen and the immediately
    // preceding cost conversation keep it inside the same read-only owner;
    // it must not be downgraded to off-topic before cost analysis sees it.
    if (canonicalCostIntent
      && costDomainAllowed
      && (!explicitRoleGlobal || explicitFinancialMetric)
      && semanticPlan.family !== "SCREEN_CONTEXT"
      && !canonicalWorkflowOwnsTurn) {
      const resolved = await resolveChatContext({ entityType, entityId, user, screenContext, conversationState });
      return buildSeferAbiCostAnalysisResponse({
        baseResponse: {
          ok: true,
          generatedAt: new Date().toISOString(),
          intent,
          intentLabel: intentLabel(intent),
          entityType,
          entityId: Number(entityId),
          entityLabel: resolved.entityLabel,
          provider: "local-foundation",
          providerSummary: "cost-analysis-authorized-route",
          mode: "RULE_BASED",
          scope: resolved.scope,
          screenPath: screenContext?.path || null,
          screenLabel: screenContext?.label || null,
          semanticPlan,
          conversationRoute: semanticPlan.conversationRoute,
          dialogueTopic: semanticPlan.dialogueTopic,
        },
        user,
        message,
        screenContext,
        conversationState,
        resolvedEntityType: resolved.resolvedEntityType,
        resolvedEntityId: resolved.resolvedEntityId,
        scope: resolved.scope,
      });
    }
    const conversationRoute = {
      route: semanticPlan.conversationRoute,
      dialogueTopic: semanticPlan.dialogueTopic,
      reason: semanticPlan.routingReason,
      primaryTask: semanticPlan.primaryTask,
      styleModifier: semanticPlan.styleModifier,
      productContextHint: semanticPlan.productContextHint,
      topicTransition: semanticPlan.topicTransition,
      suspendProductContext: semanticPlan.suspendProductContext,
      retrieveProductData: semanticPlan.retrieveProductData,
    };
    const hasExplicitCandidateRecord = Array.isArray(semanticPlan.canonicalRequest?.candidateEntityRefs)
      && semanticPlan.canonicalRequest.candidateEntityRefs.some((candidate) => (
        String(candidate?.type || "").trim().length > 0
        && Number(candidate?.id) > 0
      ));
    const productTeachingContinuation = semanticPlan.family === "CONTINUE_CURRENT_REASONING"
      && ["GENERIC_PRODUCT_HELP", "ROLE_EXPLANATION_HELP"].includes(String(semanticPlan.continuationBasePlan?.family || ""))
      && conversationState?.productTeachingState;
    if (productTeachingContinuation) {
      return buildProductTeachingContinuationProjection({
        message,
        semanticPlan,
        user,
        screenContext,
        conversationState,
      });
    }
    if (!hasExplicitCandidateRecord
      && (conversationRoute.route === "GENERIC_PRODUCT_HELP"
        || ["GENERIC_PRODUCT_HELP", "ROLE_EXPLANATION_HELP"].includes(String(semanticPlan.family || "")))) {
      return buildGenericProductHelpProjection({ message, semanticPlan, user, screenContext });
    }
    if (["OFF_TOPIC_SAFE", "GENERAL_KNOWLEDGE", "LIVE_EXTERNAL_DATA", "UNCLEAR_OR_AMBIGUOUS"].includes(conversationRoute.route)) {
      const reply = buildConversationRoutingResponse({ route: conversationRoute.route, message, semanticPlan, routingReason: conversationRoute.reason });
      const priorProductContext = conversationState?.authorizedProductContext || null;
      return {
        ok: true,
        copilotVersion: "ROUND-10-CONVERSATION-ROUTER",
        generatedAt: new Date().toISOString(),
        intent: "CHAT_HELP",
        intentLabel: "Konuşma yönlendirmesi",
        entityType,
        entityId: Number(entityId),
        entityLabel: screenContext?.label || "Sefer Abi",
        provider: "local-conversation-router",
        providerSummary: conversationRoute.route,
        mode: "RULE_BASED",
        scope: {
          role: String(user?.role || ""),
          companyKind: String(user?.companyKind || ""),
          roomId: user?.roomId ?? null,
          companyId: user?.companyId ?? null,
          summary: "Konuşma konusu ürün kapsamından ayrıldı; yetkili ürün kaydı okunmadı.",
        },
        reply,
        summary: reply,
        contextSummary: "Bu turda ürün kaydı okunmadı; önceki aynı-auth ürün bağlamı korunuyor.",
        questionType: conversationRoute.route,
        activeTopic: conversationRoute.dialogueTopic,
        assistantIntent: conversationRoute.route,
        authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
        authorizedRecords: [],
        retrievedFacts: [],
        responseSections: [{ title: "Yanıt", body: reply }],
        dataSources: ["konuşma yönlendirme sınıflandırması", "mevcut auth kapsamı"],
        reasoning: "Konu dışı, canlı dış veri veya belirsiz referans ürün-domain yürütmesine sokulmadı.",
        semanticPlan,
        conversationRoute: conversationRoute.route,
        dialogueTopic: conversationRoute.dialogueTopic,
        authorizedProductContext: priorProductContext,
        roleBoundary: "Önceki yetkili ürün bağlamı aynı auth kapsamı içinde korunuyor; bu turda ürün verisi okunmadı.",
        readOnly: true,
        quickActions: [],
        followUpPrompt: conversationRoute.route === "UNCLEAR_OR_AMBIGUOUS" ? "Bir kayıt veya alan adı ver." : "İstersen yetkili ürün görevine geri dönebiliriz.",
      };
    }
    // Cross-owner requests must reach the canonical semantic authorization gate.
    // The legacy role-specific boundary replies remain available only for non-
    // tenant-negative paths; otherwise they would bypass the typed plan and its
    // before-retrieval authorization decision.
    if (conversationRoute.route !== "AUTHORIZATION_NEGATIVE") {
      const crossPersonBoundary = buildCrossPersonBoundaryResponse({ user, entityType, entityId, screenContext, message });
      if (crossPersonBoundary) return crossPersonBoundary;
      const crossChildBoundary = buildCrossChildBoundaryResponse({ user, entityType, entityId, screenContext, message });
      if (crossChildBoundary) return crossChildBoundary;
      const crossDriverBoundary = buildCrossDriverBoundaryResponse({ user, entityType, entityId, screenContext, message });
      if (crossDriverBoundary) return crossDriverBoundary;
    }

    // Financial questions have a dedicated read-only assistant and must reach
    // its canonical cost/scenario owners before the generic priority fallback.
    // The typed authorization decision remains the gate for this early route.
    const domainScopedGuidance = semanticPlan.family === "UI_GUIDANCE"
      && (semanticPlan.requestedDomains || []).length > 0;
    const workflowGuidance = (["UI_GUIDANCE", "EXPLAIN_CURRENT_TARGET"].includes(semanticPlan.family)
      || semanticPlan.continuationBasePlan?.family === "UI_GUIDANCE")
      && !domainScopedGuidance
      && !hasExplicitCandidateRecord;
    // A resolved canonical VIEW request is already an authorized, read-only
    // request for the current product surface. Keep it on the surface-help
    // composition path even when the legacy planner classified the same
    // wording as a cross-domain summary family. This preserves the canonical
    // action/object decision instead of asking the reasoning composer to infer
    // fields again from raw text.
    const canonicalSurfaceView = Boolean(
      semanticPlan.canonicalRequest?.operation === "VIEW_AUTHORIZED_SURFACE"
      && semanticPlan.canonicalRequest?.semanticAction?.actionClass === "VIEW"
      && semanticPlan.canonicalRequest?.semanticAction?.objectClass,
    );
    // A canonical screen-context question is already an authorized UI-help
    // decision.  Let the screen-aware composer explain the real surface;
    // the cross-domain reasoning path otherwise collapses it to a one-line
    // situation summary before the richer UI guidance can run.
    const currentSurfaceGuidance = Boolean(
      screenContext?.path
      && !semanticPlan.workflowIntent
      && !hasExplicitCandidateRecord
      && (
        semanticPlan.family === "SCREEN_CONTEXT"
        || canonicalSurfaceView
        || (["NEXT_STEP", "RISK_RANKING"].includes(semanticPlan.family) && (
          semanticPlan.scopeTarget === "CURRENT_SCREEN"
          || semanticPlan.typedRequest?.scopeTarget === "CURRENT_SCREEN"
        ))
        || (semanticPlan.family === "UI_GUIDANCE" && (
          semanticPlan.scopeTarget === "CURRENT_SCREEN"
          || semanticPlan.typedRequest?.scopeTarget === "CURRENT_SCREEN"
          || semanticPlan.typedRequest?.screenContextIntent === true
        ))
      ),
    );
    const genericCurrentSurfaceGuidance = currentSurfaceGuidance && !domainScopedGuidance;
    const screenContextHelp = genericCurrentSurfaceGuidance
      && !(semanticPlan.requestedDomains || []).length;
    const selectedRecordContextRequest = semanticPlan.typedRequest?.taskType === "SELECTED_RECORD_CONTEXT";
    const reasoningAnswer = workflowGuidance || screenContextHelp || (hasExplicitCandidateRecord && !selectedRecordContextRequest)
      ? null
      : await buildAuthorizedReasoningAnswer({
        user,
        message,
        screenContext,
        conversationState,
        semanticPlan,
      });
    if (reasoningAnswer) {
      applyRequestedStyleToAnswer(reasoningAnswer);
      const authorized = resolveAuthorizedProductDomains(user);
      return {
        ok: true,
        copilotVersion: "ROUND-3-AUTHORIZED-REASONING",
        generatedAt: new Date().toISOString(),
        intent: "CHAT_HELP",
        intentLabel: "Yetkili durum değerlendirmesi",
        entityType,
        entityId: Number(entityId),
        entityLabel: screenContext?.label || "Sefer Abi",
        provider: "local-authorized-reasoning",
        providerSummary: reasoningAnswer.source,
        mode: "RULE_BASED",
        scope: {
          role: String(user?.role || ""),
          companyKind: String(user?.companyKind || ""),
          roomId: user?.roomId ?? null,
          companyId: user?.companyId ?? null,
          summary: "Yetki, company-kind ve tenant kapsamı korunarak birden fazla salt-okunur alan birlikte değerlendirildi.",
        },
        reply: reasoningAnswer.reply,
        summary: reasoningAnswer.reply,
        contextSummary: `${reasoningAnswer.retrievedFacts?.length || reasoningAnswer.records.length} farklı bulgu ve yetkili kayıt birlikte değerlendirildi.`,
        questionType: reasoningAnswer.topic,
        activeTopic: reasoningAnswer.topic,
        assistantIntent: reasoningAnswer.intent || reasoningAnswer.topic,
        authorizedDomainMap: authorized.domains,
        authorizedRecords: reasoningAnswer.records,
        discourseEntities: reasoningAnswer.discourseEntities || [],
        responseSections: [
          { title: "Özet", body: reasoningAnswer.reply },
          { title: "Neden böyle söyledim", body: reasoningAnswer.reasoning || "Yetkili kayıtlar birlikte değerlendirildi." },
          { title: "Şimdi ne yapmalıyım?", body: reasoningAnswer.nextAction },
        ],
        dataSources: reasoningAnswer.dataSources,
        retrievedFacts: reasoningAnswer.retrievedFacts,
        reasoning: reasoningAnswer.reasoning,
        styleApplied: reasoningAnswer.styleApplied || null,
        semanticPlan: reasoningAnswer.semanticPlan || null,
        authorizedProductContext: reasoningAnswer.semanticPlan?.dialogueTopic === "PRODUCT"
          && !["AUTHORIZATION_NEGATIVE"].includes(reasoningAnswer.semanticPlan?.conversationRoute)
          && reasoningAnswer.semanticPlan?.family !== "AUTHORIZATION_BOUNDARY"
          ? { semanticPlan: reasoningAnswer.semanticPlan, screenPath: screenContext?.path || null }
          : null,
        queryPlanExecution: reasoningAnswer.queryPlanExecution || null,
        synthesis: reasoningAnswer.synthesis || null,
        priority: reasoningAnswer.priority,
        safeNextStep: reasoningAnswer.safeNextStep || reasoningAnswer.nextAction,
        nextAction: reasoningAnswer.nextAction,
        roleBoundary: reasoningAnswer.topic === "AUTHORIZATION_BOUNDARY"
          ? reasoningAnswer.reply
          : "Yalnızca kullanıcının mevcut yetki ve tenant kapsamındaki kayıtlar kullanıldı.",
        privacyBoundary: reasoningAnswer.topic === "FIELD_PRIVACY_BOUNDARY",
        readOnly: true,
        quickActions: [],
        followUpPrompt: "Devamını anlat",
      };
    }

    const visibleContextPlan = semanticPlan;
    const retainedProductResult = Boolean(conversationState?.lastSettledResult?.semanticPlan || conversationState?.authorizedProductContext?.semanticPlan);
    const visibleContextDiagnostic = semanticPlan.family !== "SCREEN_CONTEXT"
      && !hasExplicitCandidateRecord
      && (!retainedProductResult || ["CURRENT_SITUATION", "LOCATION_GPS", "ETA"].includes(visibleContextPlan.family))
      ? buildVisibleContextDiagnosticResponse({ user, entityType, entityId, screenContext, message })
      : null;
    if (visibleContextDiagnostic) return visibleContextDiagnostic;

    // An active guided target explanation is a presentation turn over the
    // canonical target. Keep it on the existing screen-aware composer before
    // product awareness or record fallbacks can reinterpret the raw question
    // as out-of-scope or a lookup.
    if (semanticPlan.family === "EXPLAIN_CURRENT_TARGET") {
      if (semanticPlan.workflowIntent === "CREATE_SHIFT" || semanticPlan.continuationBasePlan?.workflowIntent === "CREATE_SHIFT") {
        const workflowTarget = resolveCopilotGuidedTarget({
          user,
          screenContext,
          conversationState,
          semanticPlan,
          message,
        });
        const workflowResponse = buildCreateShiftWorkflowResponse({
          user,
          entityType,
          entityId,
          screenContext,
          semanticPlan,
          conversationState,
          guidedTarget: workflowTarget,
        });
        if (workflowResponse) return workflowResponse;
      }
      const targetContext = await resolveChatContext({ entityType, entityId, user, screenContext, conversationState });
      const targetResponse = buildLegacyChatHelpResponse({
        entityType,
        entityId,
        user,
        message,
        semanticPlan,
        conversationState,
        screenContext,
        ...targetContext,
      });
      return {
        ...targetResponse,
        semanticPlan,
        conversationRoute: semanticPlan.conversationRoute,
        dialogueTopic: semanticPlan.dialogueTopic,
      };
    }

    // CREATE_SHIFT is a canonical workflow task. Keep its product knowledge
    // bound to the active semantic plan instead of sending the request back
    // through broad record-awareness or generic screen fallbacks.
    const createShiftPlan = semanticPlan?.workflowIntent === "CREATE_SHIFT"
      || semanticPlan?.continuationBasePlan?.workflowIntent === "CREATE_SHIFT";
    if (createShiftPlan && ["UI_GUIDANCE", "CONTINUE_CURRENT_REASONING"].includes(semanticPlan.family)) {
      const workflowTarget = resolveCopilotGuidedTarget({
        user,
        screenContext,
        conversationState,
        semanticPlan,
        message,
      });
      const workflowResponse = buildCreateShiftWorkflowResponse({
        user,
        entityType,
        entityId,
        screenContext,
        semanticPlan,
        conversationState,
        guidedTarget: workflowTarget,
      });
      if (workflowResponse) return workflowResponse;
    }

    // SCREEN_CONTEXT is already a canonical UI-help decision. Let the
    // screen-aware composer describe the real authorized surface and its safe
    // next steps; the broad awareness snapshot must not collapse it into a
    // one-line situation label.
    const productAwareness = genericCurrentSurfaceGuidance
      ? null
      : await buildAuthorizedProductAwarenessAnswer({ user, message, screenContext, conversationState, semanticPlan });
    const productAwarenessResponse = buildProductAwarenessResponse({
      awareness: productAwareness,
      user,
      entityType,
      entityId,
      screenContext,
    });
    if (productAwarenessResponse) return applyRequestedStyleToAnswer(productAwarenessResponse);

    let actionableSource = null;
    try {
      actionableSource = await buildActionableEventsForUser(user);
    } catch {
      // The established screen-scoped assistant remains available if the
      // read-only cross-panel snapshot is temporarily unavailable.
    }
    const actionableAnswer = actionableSource
      && !genericCurrentSurfaceGuidance
      && roleGlobalActionableFallbackAllowed(semanticPlan, conversationState)
      ? buildActionableAnswer({ message, snapshot: actionableSource })
      : null;
    if (actionableAnswer) {
      return {
        ok: true,
        copilotVersion: "ROUND-2-ACTIONABLE-EVENTS",
        generatedAt: new Date().toISOString(),
        intent,
        intentLabel: intentLabel(intent),
        entityType,
        entityId: Number(entityId),
        entityLabel: screenContext?.label || "Sefer Abi",
        provider: "local-foundation",
        providerSummary: ACTIONABLE_EVENT_SOURCE_ID,
        mode: "RULE_BASED",
        scope: {
          role: String(user?.role || ""),
          roomId: user?.roomId ?? null,
          companyId: user?.companyId ?? null,
          summary: buildScopeSummary(user, entityType, entityId),
        },
        reply: actionableAnswer.reply,
        summary: actionableAnswer.reply,
        contextSummary: `${actionableSource.summary.total} yetkili aksiyon kaydı aynı kaynakta okundu.`,
        questionType: `ACTIONABLE_${actionableAnswer.topic}`,
        activeTopic: actionableAnswer.topic,
        bestNextAction: actionableAnswer.nextAction,
        nextAction: actionableAnswer.nextAction,
        responseSections: [
          { title: "Özet", body: actionableAnswer.reply },
          { title: "Şimdi ne yapmalıyım?", body: actionableAnswer.nextAction },
        ],
        actionableEventSource: actionableSource.source,
        actionableEvents: actionableSource.events,
        actionableEventSummary: actionableSource.summary,
        actionableEventIds: actionableAnswer.eventIds,
        roleBoundary: "Yalnızca bu kullanıcının yetkili güncel kayıtları kullanıldı.",
        quickActions: [],
        followUpPrompt: "Devamını anlat",
      };
    }
    const resolved = await resolveChatContext({ entityType, entityId, user, screenContext, conversationState });
    let baseResponse;
    try {
      baseResponse = buildLegacyChatHelpResponse({
        entityType,
        entityId,
        user,
        message,
        semanticPlan,
        conversationState,
        screenContext,
        ...resolved,
      });
    } catch (error) {
      const costRequest = canonicalCostIntent
        ? detectCostAnalysisIntent({ message, screenContext, conversationState })
        : { isCostAnalysis: false };
      const legacyGuideMismatch = ["JOB_TYPE_ENTITY_MISMATCH", "UNSUPPORTED_JOB_TYPE"].includes(String(error?.code || ""));
      if (!canonicalCostIntent || !costRequest.isCostAnalysis || !legacyGuideMismatch) throw error;
      baseResponse = {
        ok: true,
        generatedAt: new Date().toISOString(),
        intent,
        intentLabel: intentLabel(intent),
        entityType,
        entityId: Number(entityId),
        entityLabel: resolved.entityLabel,
        provider: "local-foundation",
        providerSummary: "cost-analysis-base-fallback",
        mode: "RULE_BASED",
        scope: resolved.scope,
        screenPath: screenContext?.path || null,
        screenLabel: screenContext?.label || null,
      };
    }
    // Keep canonical screen-context help on the screen-help composer even if
    // a colloquial phrase contains a cost-like verb such as "çalışıyor".
    // Screen context is already the semantic decision and must not be wrapped
    // by the financial assistant.
    if (genericCurrentSurfaceGuidance) {
      return {
        ...baseResponse,
        semanticPlan,
        conversationRoute: semanticPlan.conversationRoute,
        dialogueTopic: semanticPlan.dialogueTopic,
      };
    }
    if (!canonicalCostIntent) {
      return {
        ...baseResponse,
        semanticPlan,
        conversationRoute: semanticPlan.conversationRoute,
        dialogueTopic: semanticPlan.dialogueTopic,
      };
    }
    return buildSeferAbiCostAnalysisResponse({
      baseResponse,
      user,
      message,
      screenContext,
      conversationState,
      resolvedEntityType: resolved.resolvedEntityType,
      resolvedEntityId: resolved.resolvedEntityId,
      scope: resolved.scope,
    });
  }

  let context = null;
  if (entityType === "shift") {
    context = await getShiftContext(user, entityId);
  } else if (entityType === "vehicle") {
    context = await getVehicleContext(user, entityId);
  } else if (entityType === "screen") {
    context = getScreenDefinitionForUser(user, screenContext || {}, entityId);
    if (!context) {
      const e = new Error("SCREEN_CONTEXT_NOT_FOUND");
      e.status = 400;
      e.code = "SCREEN_CONTEXT_NOT_FOUND";
      throw e;
    }
  } else {
    const e = new Error("UNSUPPORTED_ENTITY_TYPE");
    e.status = 400;
    e.code = "UNSUPPORTED_ENTITY_TYPE";
    throw e;
  }


  if (intent === "JOB_GUIDE") {
    try {
      return {
        ...buildJobGuideResponse({
          jobType,
          guideLevel,
          context,
          entityType,
          entityId,
          user,
          screenContext,
        }),
        entityLabel: describeEntity(context),
        providerSummary: `guideLevel=${String(guideLevel || "SHORT")}`,
        scope: {
          role: String(user.role || ""),
          roomId: user.roomId ?? null,
          companyId: user.companyId ?? null,
          summary: buildScopeSummary(user, entityType, entityId),
        },
      };
    } catch (err) {
      if (String(err?.code || "") === "JOB_TYPE_ENTITY_MISMATCH" || String(err?.code || "") === "UNSUPPORTED_JOB_TYPE") {
        return {
          ...buildJobGuideMismatchFallback({ jobType, guideLevel, context, screenContext, entityType, entityId, user }),
          entityLabel: describeEntity(context),
          providerSummary: `guideLevel=${String(guideLevel || "SHORT")}`,
        };
      }
      throw err;
    }
  }

  const base = buildCopilotPayload(intent, context);
  const decisionMeta = enrichDecisionLayer(intent, context, base);
  return {
    ok: true,
    copilotVersion: "M46.5",
    generatedAt: new Date().toISOString(),
    intent,
    intentLabel: intentLabel(intent),
    entityType,
    entityId: Number(entityId),
    entityLabel: describeEntity(context),
    provider: "local-foundation",
    providerSummary: providerSummary(base, decisionMeta),
    mode: "RULE_BASED",
    scope: {
      role: String(user.role || ""),
      roomId: user.roomId ?? null,
      companyId: user.companyId ?? null,
      summary: buildScopeSummary(user, entityType, entityId),
    },
    ...base,
    ...decisionMeta,
  };
}
