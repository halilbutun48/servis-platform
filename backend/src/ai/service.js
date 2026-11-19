import { buildCopilotPayload, getShiftContext, getVehicleContext, getVehicleContextByPlate } from "./tools.js";
import { prisma } from "../prisma.js";
import { buildJobGuideResponse } from "./jobGuide/index.js";
import { buildIfStuck, buildQuickActions } from "./jobGuide/quickActions.js";
import { normalizeGuideLevel } from "./jobGuide/levels.js";
import { buildCanonicalProductKnowledgeInventory, getScreenDefinitionForUser, resolveAuthorizedScreenContext } from "./jobGuide/screenCatalog.js";
import { resolveChatContext } from "./chat/contextResolver.js";
import { buildChatHelpResponse, buildCompanyHubContextReply, buildCrossRoleSynchronizationResponse, buildGenericProductHelpResponse, buildOperationVerificationContextReply, buildParentLiveNoVehicleReply } from "./chat/helpComposer.js";
import { buildGeoReviewContinuationReply } from "./chat/helpComposerSelectedRuntime.js";
import { buildProductTeachingReply, buildRoleExplanationHelpReply } from "./chat/conversationTaskStateBuilders.js";
import {
  buildPlatformHistoricalReferenceClosedResponse,
  buildSeferAbiCostAnalysisResponse,
  buildUnselectedFinanceReconciliationResponse,
  companyPriceBudgetQuestionKind,
  detectCostAnalysisIntent,
  isCompanySelectedInvoiceFinanceQuestion,
  isRoomSelectedInvoiceAmountQuestion,
  isUnselectedFinanceReconciliationQuestion,
} from "./chat/seferAbiCostAnalysisAssistant.js";
import { isRoomFinancialDecisionQuestion } from "./chat/financialScenarioContext.js";
import { getEtaDisplay, getGpsAgeText, getGpsReliabilityLabel, normalizeGpsFreshness } from "./chat/etaSanity.js";
import { ACTIONABLE_EVENT_SOURCE_ID, buildActionableAnswer, buildActionableEventsForUser } from "../services/actionableEvents.js";
import { buildAuthorizedProductAwarenessAnswer, buildAuthorizedReasoningAnswer, buildVisibleFactText, isSuperAdminFieldAcceptanceReadPlan, resolveAuthorizedProductDomains, resolveAuthorizedReasoningNavigationTarget } from "../services/authorizedProductAwareness.js";
import { isCurrentSituationDiagnosticQuestion } from "./chat/intentRouter.js";
import { buildConversationRoutingResponse } from "./chat/conversationRouting.js";
import {
  COMPANY_GUIDED_NEW_PLAN_WORKFLOW,
  inferRoomCostSemanticRequest,
  resolveCanonicalConversationRequest,
} from "./chat/canonicalSemanticRequest.js";
import { buildCanonicalSemanticContext } from "./chat/canonicalSemanticContext.js";
import { resolveSemanticIntent } from "./chat/semanticIntentPlanner.js";
import { authorizeSemanticRequest, authorizationBoundaryReply } from "./chat/authorizationGate.js";
import { fieldPrivacyBoundaryReply, resolveFieldPrivacyPolicy } from "./chat/fieldPrivacyPolicy.js";
import { commitCanonicalConversationState, getCanonicalConversationState } from "./chat/canonicalConversationState.js";
import { normalizeSeferAbiUserFacingPayload } from "./chat/userFacingLanguageNormalizer.js";
import { GUIDED_TARGET_STATUSES, resolveCopilotGuidedTarget } from "./chat/copilotUiElementAnchor.js";
import { requestLocalSemanticProposal } from "./chat/localSemanticProposal.js";
import {
  buildRoomCostDraftReply,
  resolveRoomCostRequest,
  ROOM_COST_SALARY_CATEGORIES,
} from "../finance/roomCostAssistantContract.js";
import { summarizeRoomCosts } from "../finance/roomCostLedger.js";
import { getShiftSummary } from "../lib/reports.js";
import { buildRoomHgsExpenseAssistantResponse } from "./chat/roomHgsExpenseAssistant.js";
import { getReferenceLayers } from "../externalCost/externalCostReferenceService.js";
import { listPublicLeadReviewQueue } from "../services/publicLeadService.js";
import { getRegionCapacitySnapshot } from "../ops/regionCapacity.js";
import { buildRegionCapacityReply, resolveSuperAdminRegionCapacityRequest } from "./regionCapacitySemantic.js";
import { buildSchoolParentAccessHistoryResponse } from "./chat/schoolParentAccessContext.js";

const INDEPENDENT_ROOM_FINANCE_VIEWS = new Set(["overview", "expenses"]);

export { buildCrossRoleSynchronizationResponse };

export function buildOrganizationLegacyPlanMapExplanation({
  user,
  screenContext,
  message,
  entityType = "screen",
  entityId = 0,
  semanticPlan = null,
} = {}) {
  const role = String(user?.role || "").toUpperCase();
  const companyKind = String(user?.companyKind || screenContext?.companyKind || "").toUpperCase();
  const path = String(screenContext?.path || "").split("?")[0];
  const normalizedMessage = String(message || "").toLocaleLowerCase("tr-TR");
  const organizationOwner = role === "ORGANIZATION"
    || (role === "COMPANY" && companyKind === "ORGANIZATION");
  if (!organizationOwner || path !== "/organization/plans") return null;
  if (!/(?:harita|koordinat|konum)/iu.test(normalizedMessage)) return null;

  const privacyPlan = semanticPlan || {
    family: "SCREEN_CONTEXT",
    intentFamily: "SCREEN_CONTEXT",
    screenContextIntent: true,
    requestedDomains: ["ORGANIZATION_PLANS"],
  };
  const privacyDecision = resolveFieldPrivacyPolicy({ user, message, plan: privacyPlan });
  const privacyBoundary = privacyDecision.status === "DENY";
  const reply = privacyBoundary
    ? fieldPrivacyBoundaryReply(privacyDecision)
    : "Bu eski plan taslağında koordinat yoksa harita yalnız yaklaşık / kuş uçuşu önizleme gösterir; kesin rota çizgisi ve durak işaretleri üretmez. Koordinatlı konum ve kesin rota için Planlama Merkezi'ne gitmelisin. Bu konuşma ham koordinat paylaşmaz ve kayıt değiştirmez.";
  const nextAction = privacyBoundary
    ? "Güvenli durum özeti veya yetkili toplu gösterge iste."
    : "Planlama Merkezi'ne git; koordinatlı durak eklenmeden kesin rota görüntüsü bekleme.";
  return {
    ok: true,
    copilotVersion: "CONT-311-ORGANIZATION-LEGACY-PLAN-MAP",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: privacyBoundary ? "Alan gizliliği sınırı" : "Yetkili ekran açıklaması",
    entityType,
    entityId: Number(entityId) || 0,
    entityLabel: screenContext?.label || "Yer Planları",
    provider: "local-chat-help",
    providerSummary: "organization-legacy-plan-map-explanation-v1",
    source: "organization-legacy-plan-map-explanation-v1",
    mode: "RULE_BASED",
    scope: {
      role: String(user?.role || ""),
      companyKind: String(user?.companyKind || screenContext?.companyKind || ""),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: "Yalnızca yetkili ORGANIZATION Planları ekranının yaklaşık harita önizlemesi açıklandı.",
    },
    reply,
    summary: reply,
    contextSummary: privacyBoundary
      ? "Korunan ham koordinat paylaşılmadı."
      : "Seçili eski plan yüzeyindeki koordinatsız yaklaşık harita durumu açıklandı.",
    questionType: privacyBoundary ? "FIELD_PRIVACY_BOUNDARY" : "SCREEN_CONTEXT_ORGANIZATION_PLANS_MAP",
    activeTopic: privacyBoundary ? "FIELD_PRIVACY_BOUNDARY" : "ORGANIZATION_PLANS",
    authorizedDomain: privacyBoundary ? "FIELD_PRIVACY_BOUNDARY" : "ORGANIZATION_PLANS",
    authorizedRecords: [],
    authorizedRecordCount: 0,
    assistantIntent: privacyBoundary ? "FIELD_PRIVACY_BOUNDARY" : "SCREEN_CONTEXT_ORGANIZATION_PLANS_MAP",
    dataSources: ["yetkili ORGANIZATION Planları ekranı", "alan gizliliği kuralları"],
    retrievedFacts: privacyBoundary
      ? ["Korunan ham koordinat paylaşılmadı"]
      : ["Yaklaşık / kuş uçuşu önizleme", "Koordinatlı konum eklenmeden kesin rota ve durak işareti yok"],
    reasoning: privacyBoundary
      ? "Ham koordinat isteği alan gizliliği kuralıyla engellendi."
      : "Mevcut route bağlamı koordinat içermeyen eski plan taslağına bağlandı; kesin rota veya konum uydurulmadı.",
    priority: privacyBoundary ? "Alan gizliliği sınırı" : "Koordinatsız plan önizlemesi",
    nextAction,
    safeNextStep: nextAction,
    responseSections: [
      { title: "Özet", body: reply },
      { title: "Şimdi ne yapmalıyım?", body: nextAction },
    ],
    roleBoundary: "Yalnızca kullanıcının mevcut role/company-kind/tenant kapsamı kullanıldı.",
    readOnly: true,
    privacyBoundary,
    semanticPlan: privacyBoundary
      ? { ...privacyPlan, family: "FIELD_PRIVACY_BOUNDARY", intentFamily: "FIELD_PRIVACY_BOUNDARY", fieldPrivacyDecision: privacyDecision }
      : privacyPlan,
    authorizedProductContext: {
      screenPath: path,
      screenLabel: screenContext?.label || "Yer Planları",
    },
    quickActions: [],
  };
}

export function buildDirectScreenMetricResponse({ user, entityType, entityId, screenContext, message } = {}) {
  const path = String(screenContext?.path || screenContext?.screenPath || screenContext?.scopeKey || '').split('?')[0].trim();
  const role = String(user?.role || '').toUpperCase();
  const companyKind = String(user?.companyKind || screenContext?.companyKind || '').toUpperCase();
  const text = String(message || '').toLocaleLowerCase('tr-TR');
  const rows = Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : [];
  const findValue = (pattern, fallbackKey) => {
    const row = rows.find((item) => pattern.test(String(item?.label || item?.key || '').toLocaleLowerCase('tr-TR')));
    if (row && row.value !== undefined && row.value !== null && String(row.value).trim() !== '') return String(row.value).trim();
    const counters = screenContext?.structuredFacts?.counters;
    const fallback = counters && fallbackKey ? counters[fallbackKey] : undefined;
    return fallback === undefined || fallback === null ? '' : String(fallback);
  };
  const asksOpenAlarm = /açık alarm|acık alarm|alarm sayısı|alarm sayisi|açık sorun|acık sorun|sorun sayısı|sorun sayisi/.test(text);
  if (role === 'SUPER_ADMIN' && path === '/superadmin/observability' && asksOpenAlarm) {
    const value = findValue(/açık alarm|acık alarm|açık sorun|acık sorun/, 'openIssueCount');
    if (!value) return null;
    const reply = `Canlı İzleme ekranında açık alarm / açık sorun sayısı: ${value}. Bu sayı yalnızca SUPER_ADMIN oturumunun yetkili canlı izleme metriğinden okunuyor; başka tenant veya gizli olay ayrıntısı açmıyorum.`;
    return {
      ok: true,
      copilotVersion: 'CONT-202-DIRECT-SCREEN-METRIC',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Yetkili ekran metriği',
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || 'Canlı İzleme',
      provider: 'local-authorized-screen-metric',
      providerSummary: 'superadmin-observability-open-issue-count',
      mode: 'RULE_BASED',
      scope: { role, companyKind: String(user?.companyKind || ''), roomId: user?.roomId ?? null, companyId: user?.companyId ?? null, summary: 'Yalnızca yetkili SUPER_ADMIN canlı izleme metriği okundu.' },
      reply,
      summary: reply,
      contextSummary: `Yetkili ${path} ekranında açık alarm / açık sorun metriği okundu.`,
      questionType: 'STATUS_HELP',
      activeTopic: 'OBSERVABILITY_METRIC',
      assistantIntent: 'STATUS_HELP',
      responseSections: [{ title: 'Yetkili metrik', body: reply }],
      dataSources: ['SUPER_ADMIN canlı izleme ekranının yetkili özeti'],
      retrievedFacts: [{ label: 'Açık alarm / açık sorun', value }],
      readOnly: true,
      writeAction: false,
      semanticPlan: { family: 'STATUS_HELP', scopeTarget: 'CURRENT_SCREEN', screenPath: path, authorizationDecision: { status: 'ALLOW' } },
    };
  }
  const asksActiveService = /aktif servis|aktif servis sayısı|aktif servis sayisi|servis sayısı|servis sayisi/.test(text);
  if ((role === 'ORGANIZATION' || companyKind === 'ORGANIZATION') && path === '/organization/operations' && asksActiveService) {
    const value = findValue(/aktif servis|servis durumu/, 'todayActiveCount');
    if (!value) return null;
    const reply = `Organizasyon operasyon panelinde bugün aktif servis sayısı: ${value}. Bu değer yalnızca bu organizasyon tenant'ının yetkili güncel özetinden okunuyor; başka tenant verisi eklemiyorum.`;
    return {
      ok: true,
      copilotVersion: 'CONT-202-DIRECT-SCREEN-METRIC',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Yetkili ekran metriği',
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || 'Organizasyon Operasyon Paneli',
      provider: 'local-authorized-screen-metric',
      providerSummary: 'organization-operations-active-service-count',
      mode: 'RULE_BASED',
      scope: { role, companyKind: String(user?.companyKind || ''), roomId: user?.roomId ?? null, companyId: user?.companyId ?? null, summary: 'Yalnızca yetkili organizasyon tenant operasyon özeti okundu.' },
      reply,
      summary: reply,
      contextSummary: `Yetkili ${path} ekranında bugün aktif servis metriği okundu.`,
      questionType: 'STATUS_HELP',
      activeTopic: 'ORGANIZATION_OPERATIONS_METRIC',
      assistantIntent: 'STATUS_HELP',
      responseSections: [{ title: 'Yetkili metrik', body: reply }],
      dataSources: ['ORGANIZATION operasyon panelinin tenant kapsamlı yetkili özeti'],
      retrievedFacts: [{ label: 'Aktif servis', value }],
      readOnly: true,
      writeAction: false,
      semanticPlan: { family: 'STATUS_HELP', scopeTarget: 'CURRENT_SCREEN', screenPath: path, authorizationDecision: { status: 'ALLOW' } },
    };
  }
  const commercialFlowPath = /^\/(?:company|school|organization)\/commercial-flow$/iu.test(path);
  const visibleMetrics = Array.isArray(screenContext?.uiHints?.visibleMetrics)
    ? screenContext.uiHints.visibleMetrics
    : [];
  const buildReadOnlyScreenMetricResponse = ({
    reply,
    providerSummary,
    activeTopic,
    questionType = 'VISIBLE_SCREEN_METRIC',
    entityLabel,
    facts = [],
    contextSummary,
  }) => ({
    ok: true,
    copilotVersion: 'CONT-219-DIRECT-SCREEN-METRIC',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Yetkili ekran özeti',
    entityType,
    entityId: Number(entityId) || 0,
    entityLabel: entityLabel || screenContext?.label || 'Yetkili ekran',
    provider: 'local-authorized-screen-metric',
    providerSummary,
    mode: 'RULE_BASED',
    scope: {
      role,
      companyKind: String(user?.companyKind || ''),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: 'Yalnızca mevcut SUPER_ADMIN oturumunun yetkili ve görünür ekran özeti okundu.',
    },
    reply,
    summary: reply,
    contextSummary: contextSummary || `Yetkili ${path} ekranındaki görünür özet açıklandı.`,
    questionType,
    activeTopic,
    assistantIntent: 'STATUS_HELP',
    responseSections: [{ title: 'Yetkili ekran özeti', body: reply }],
    dataSources: ['mevcut yetkili SUPER_ADMIN ekranının görünür özeti'],
    retrievedFacts: facts,
    readOnly: true,
    writeAction: false,
    semanticPlan: { family: 'STATUS_HELP', scopeTarget: 'CURRENT_SCREEN', screenPath: path, authorizationDecision: { status: 'ALLOW' } },
  });
  if (role === 'SUPER_ADMIN' && path === '/superadmin/users') {
    const asksUserCount = /(?:kaç|sayısı|sayisi|kaç tane|adet)\s*(?:kullanıcı|kullanici|kayıt|kayit)|(?:kullanıcı|kullanici|kayıt|kayit)\s*(?:sayısı|sayisi|adedi)/iu.test(text);
    if (asksUserCount) {
      const metric = visibleMetrics.find((row) => /kayıt\s+sayısı|kullanıcı/iu.test(String(row?.label || '').toLocaleLowerCase('tr-TR')));
      if (!metric || String(metric.value ?? '').trim() === '') return null;
      const value = String(metric.value).trim();
      return buildReadOnlyScreenMetricResponse({
        reply: `Kullanıcılar ekranında görünen yetkili kullanıcı sayısı: ${value}. Bu sayı yalnızca SUPER_ADMIN oturumunun yüklediği görünür kullanıcı listesinden okunuyor; şifre, gizli kimlik doğrulama verisi veya başka tenant ayrıntısı açmıyorum.`,
        providerSummary: 'superadmin-users-visible-count',
        activeTopic: 'SUPERADMIN_USERS_METRIC',
        entityLabel: 'Kullanıcılar',
        facts: [{ label: 'Kullanıcı sayısı', value, source: metric.source || 'AUTHORIZED_VISIBLE_SCREEN' }],
      });
    }
  }
  if (role === 'SUPER_ADMIN' && path === '/superadmin/operation-verification') {
    const counters = screenContext?.structuredFacts?.counters || {};
    const asksRoleScope = /hangi\s+roller|kaç\s+rol|kapsam.*rol/iu.test(text);
    const asksCheckSummary = /kontrol\s+özeti|kaç\s+(?:kabul|eksik|kayıtlı)|kayıtlı\s+kontrol|durum\s+özeti/iu.test(text);
    if (asksRoleScope && Number(counters.roles || 0) > 0) {
      const value = String(counters.roles);
      return buildReadOnlyScreenMetricResponse({
        reply: `Operasyon Doğrulama ekranında ${value} rol yüzeyi bulunuyor; şu an seçili rol: ${String(findValue(/rol/iu, '') || 'Süper Yönetici')}. Yanıt yalnızca bu yetkili ekranın görünür rol kapsamını açıklar.`,
        providerSummary: 'superadmin-operation-verification-role-scope',
        activeTopic: 'SUPERADMIN_OPERATION_VERIFICATION',
        entityLabel: 'Operasyon Doğrulama',
        facts: [{ label: 'Rol yüzeyi', value }],
      });
    }
    if (asksCheckSummary) {
      const saved = findValue(/kayıtlı\s+kontrol/iu, 'saved');
      const total = findValue(/toplam\s+kontrol/iu, 'checks');
      const defaults = findValue(/varsayılan\s+karar/iu, 'defaults');
      if (saved || total) {
        return buildReadOnlyScreenMetricResponse({
          reply: `Seçili Operasyon Doğrulama ekranında ${saved || '0'} kayıtlı kontrol ve ${total || '0'} toplam kontrol var; varsayılan karar: ${defaults || 'belirtilmemiş'}. Bu yanıt kayıt yazmaz.`,
          providerSummary: 'superadmin-operation-verification-summary',
          activeTopic: 'SUPERADMIN_OPERATION_VERIFICATION',
          entityLabel: 'Operasyon Doğrulama',
          facts: [{ label: 'Kayıtlı kontrol', value: saved || '0' }, { label: 'Toplam kontrol', value: total || '0' }],
        });
      }
    }
  }
  if (role === 'SUPER_ADMIN' && path === '/superadmin/ssot-alignment') {
    const counters = screenContext?.structuredFacts?.counters || {};
    const asksTargetCount = /kaç\s+(?:dosya|hedef)|izlenen\s+dosya|kaç\s+hedef/iu.test(text);
    const asksActiveRule = /aktif\s+çalışma\s+kuralı|hangi\s+aktif\s+çalışma\s+kuralı|hangi\s+kural/iu.test(text);
    const asksStatus = /green|toplam\s+hat|kaç\s+hata|durum\s+özeti/iu.test(text);
    if (asksTargetCount && Number(counters.targetCount || 0) >= 0) {
      const value = String(counters.targetCount ?? (findValue(/izlenen\s+dosya/iu, 'targetCount') || '0'));
      return buildReadOnlyScreenMetricResponse({
        reply: `Sistem Standartları ekranında ${value} hedef dosya izleniyor. Bu sayı yalnızca mevcut SUPER_ADMIN ekranının yetkili manifest özetinden okunuyor.`,
        providerSummary: 'superadmin-ssot-alignment-target-count',
        activeTopic: 'SUPERADMIN_SSOT_ALIGNMENT',
        entityLabel: 'Sistem Standartları',
        facts: [{ label: 'İzlenen dosyalar', value }],
      });
    }
    if (asksActiveRule) {
      const value = String(screenContext?.structuredFacts?.activeRule || findValue(/aktif\s+çalışma\s+kuralı/iu, 'activeRule') || '').trim();
      if (value) {
        return buildReadOnlyScreenMetricResponse({
          reply: `Sistem Standartları ekranındaki aktif çalışma kuralı: ${value}. Bu yalnızca görünen çalışma kuralı bilgisidir; yeni paket veya işlem başlatmıyorum.`,
          providerSummary: 'superadmin-ssot-alignment-active-rule',
          activeTopic: 'SUPERADMIN_SSOT_ALIGNMENT',
          entityLabel: 'Sistem Standartları',
          facts: [{ label: 'Aktif çalışma kuralı', value }],
        });
      }
    }
    if (asksStatus) {
      const green = String(counters.greenCount ?? (findValue(/green/iu, 'greenCount') || '0'));
      const errors = String(counters.errorCount ?? (findValue(/toplam\s+hat/iu, 'errorCount') || '0'));
      return buildReadOnlyScreenMetricResponse({
        reply: `Sistem Standartları durum özeti: Green ${green}, toplam hat ${errors}. Değerler yalnızca yetkili ekranda görünen manifest özetinden okunuyor.`,
        providerSummary: 'superadmin-ssot-alignment-status-summary',
        activeTopic: 'SUPERADMIN_SSOT_ALIGNMENT',
        entityLabel: 'Sistem Standartları',
        facts: [{ label: 'Green', value: green }, { label: 'Toplam hat', value: errors }],
      });
    }
  }
  if (role === 'SUPER_ADMIN' && path === '/superadmin/commercial-core') {
    const asksPaymentBoundary = /ödeme\s+(?:başlat|açık|aktif)|canlı\s+ödeme|ödeme\s+başlatılır/iu.test(text);
    const asksAccrualMode = /hakediş.*(?:mod|hangi|durum)|hangi\s+mod.*hakediş|hakediş\s+hazırlığı/iu.test(text);
    if (asksPaymentBoundary) {
      return buildReadOnlyScreenMetricResponse({
        reply: 'Bu Ticari Akış ekranında ödeme başlatılmıyor; ödeme kapalı ve yalnız hazırlık, salt-okunur hakediş önizlemesi ile CSV taslağı görünür.',
        providerSummary: 'superadmin-commercial-core-payment-boundary',
        activeTopic: 'SUPERADMIN_COMMERCIAL_CORE',
        entityLabel: 'Ticari Akış',
        facts: [{ label: 'Ödeme', value: 'Kapalı' }],
      });
    }
    if (asksAccrualMode) {
      const preview = findValue(/hakediş\s+önizleme/iu, 'preview');
      return buildReadOnlyScreenMetricResponse({
        reply: `Hakediş güvenli hazırlık modunda; aktif ödeme kapalı${preview && preview !== '-' ? `, görünen önizleme durumu: ${preview}` : ''}. Bu ekran ödeme veya fatura başlatmıyor.`,
        providerSummary: 'superadmin-commercial-core-accrual-mode',
        activeTopic: 'SUPERADMIN_COMMERCIAL_CORE',
        entityLabel: 'Ticari Akış',
        facts: [{ label: 'Hakediş modu', value: preview || 'Hazırlık / salt-okunur önizleme' }],
      });
    }
  }
  if (role === 'SUPER_ADMIN' && path === '/superadmin/trust-quality') {
    const asksActiveOperation = /aktif\s+(?:operasyon|hizmet)|kaç\s+aktif/iu.test(text);
    const asksDefinitiveScore = /(?:kalite|sonuç|skor|puan).*(?:kesin|nihai)|(?:kesin|nihai).*(?:kalite|sonuç|skor|puan)/iu.test(text);
    if (asksActiveOperation) {
      const value = findValue(/aktif\s+(?:operasyon|hizmet)/iu, 'activeServices');
      if (value) {
        return buildReadOnlyScreenMetricResponse({
          reply: `Güven ve Kalite ekranında görünen aktif operasyon/hizmet sayısı: ${value}. Bu değer yalnızca SUPER_ADMIN yetkili kalite özetinden okunuyor.`,
          providerSummary: 'superadmin-trust-quality-active-services',
          activeTopic: 'SUPERADMIN_TRUST_QUALITY',
          entityLabel: 'Güven ve Kalite Özeti',
          facts: [{ label: 'Aktif operasyon/hizmet', value }],
        });
      }
    }
    if (asksDefinitiveScore) {
      return buildReadOnlyScreenMetricResponse({
        reply: 'Hayır. Bu ekran kesin kalite puanı vermez; kanıt, taslak skor, inceleme kararı ve denetim izini birlikte gösterir. Yeni veya çelişkili veri gelirse sonuç yeniden değerlendirilir.',
        providerSummary: 'superadmin-trust-quality-score-boundary',
        activeTopic: 'SUPERADMIN_TRUST_QUALITY',
        entityLabel: 'Güven ve Kalite Özeti',
        facts: [{ label: 'Kesin puan', value: 'Yok' }],
      });
    }
  }
  const asksVisibleMarketOfferCount = commercialFlowPath
    && /market\s+teklif/iu.test(text)
    && /(?:kaç|sayısı|sayisi|kaç tane|adet|durum)/iu.test(text);
  if (asksVisibleMarketOfferCount) {
    const metric = visibleMetrics.find((row) => /market\s+teklif/iu.test(String(row?.label || '')));
    if (!metric || String(metric.value ?? '').trim() === '') return null;
    const value = String(metric.value).trim();
    const roleLabel = role || companyKind || 'yetkili';
    const reply = `Bu ekrandaki yetkili görünür Market Teklifi sayısı: ${value}. Bu sayı yalnızca mevcut ${roleLabel} ticari akış özetinde görünen kapsamı gösteriyor; ayrıntılı teklif kayıtları bu oturumda ayrıca okunmadı.`;
    return {
      ok: true,
      copilotVersion: 'CONT-217-VISIBLE-COMMERCIAL-METRIC',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Yetkili ekran metriği',
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || 'Ticari Akışım',
      provider: 'local-authorized-screen-metric',
      providerSummary: 'commercial-flow-visible-market-offer-count',
      mode: 'RULE_BASED',
      scope: {
        role,
        companyKind: String(user?.companyKind || ''),
        roomId: user?.roomId ?? null,
        companyId: user?.companyId ?? null,
        summary: 'Yalnızca mevcut yetkili ekranda görünen ticari akış metriği okundu; teklif kayıt ayrıntısı okunmadı.',
      },
      reply,
      summary: reply,
      contextSummary: `Yetkili ${path} ekranında görünen Market Teklifi metriği okundu.`,
      questionType: 'VISIBLE_SCREEN_METRIC',
      activeTopic: 'COMMERCIAL_FLOW_METRIC',
      assistantIntent: 'STATUS_HELP',
      responseSections: [{ title: 'Yetkili ekran metriği', body: reply }],
      dataSources: ['mevcut yetkili ticari akış ekranının görünür metriği'],
      retrievedFacts: [{ label: 'Market Teklifi', value, source: metric.source || 'AUTHORIZED_VISIBLE_SCREEN' }],
      readOnly: true,
      writeAction: false,
      semanticPlan: { family: 'STATUS_HELP', scopeTarget: 'CURRENT_SCREEN', screenPath: path, authorizationDecision: { status: 'ALLOW' } },
    };
  }
  const asksRegionCount = role === 'SUPER_ADMIN'
    && path === '/superadmin/regions'
    && /(?:kaç|sayısı|sayisi|kaç tane|adet)\s*(?:bölge|il)|(?:bölge|il)\s*(?:sayısı|sayisi|adedi)/iu.test(text);
  const asksRegionScopeBoundary = role === 'SUPER_ADMIN'
    && path === '/superadmin/regions'
    && /(?:başka|farklı|yabancı)\s+tenant|tenant.*(?:dahil|içer|kapsam)/iu.test(text);
  if (asksRegionScopeBoundary) {
    const metric = visibleMetrics.find((row) => /bölge|il/u.test(String(row?.label || '').toLocaleLowerCase('tr-TR')));
    if (!metric || String(metric.value ?? '').trim() === '') return null;
    const value = String(metric.value).trim();
    const reply = `Hayır. Bu ekrandaki ${value} bölge yalnızca mevcut SUPER_ADMIN oturumunun yetkili yönetim kapsamından geliyor; başka tenant, okul, firma veya gizli bölge kaydı bu yanıta dahil edilmiyor.`;
    return {
      ok: true,
      copilotVersion: 'CONT-217-VISIBLE-ADMIN-METRIC',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Yetkili kapsam açıklaması',
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || 'İller ve Bölgeler',
      provider: 'local-authorized-screen-metric',
      providerSummary: 'superadmin-regions-visible-scope-boundary',
      mode: 'RULE_BASED',
      scope: { role, companyKind: String(user?.companyKind || ''), roomId: user?.roomId ?? null, companyId: user?.companyId ?? null, summary: 'Yanıt yalnızca SUPER_ADMIN görünür bölge kapsamını açıklar.' },
      reply,
      summary: reply,
      contextSummary: `Yetkili ${path} ekranındaki bölge kapsamı açıklandı.`,
      questionType: 'VISIBLE_SCREEN_SCOPE',
      activeTopic: 'SUPERADMIN_REGIONS_METRIC',
      assistantIntent: 'STATUS_HELP',
      responseSections: [{ title: 'Yetkili kapsam', body: reply }],
      dataSources: ['SUPER_ADMIN İller ve Bölgeler ekranının görünür özeti'],
      retrievedFacts: [{ label: 'Bölge', value, source: metric.source || 'AUTHORIZED_VISIBLE_SCREEN' }],
      readOnly: true,
      writeAction: false,
      semanticPlan: { family: 'STATUS_HELP', scopeTarget: 'CURRENT_SCREEN', screenPath: path, authorizationDecision: { status: 'ALLOW' } },
    };
  }
  if (asksRegionCount) {
    const metric = visibleMetrics.find((row) => /bölge|il/iu.test(String(row?.label || '')));
    if (!metric || String(metric.value ?? '').trim() === '') return null;
    const value = String(metric.value).trim();
    const reply = `İller ve Bölgeler ekranında görünen yetkili bölge sayısı: ${value}. Bu sayı yalnızca SUPER_ADMIN oturumunun görünür yönetim özetinden okunuyor; başka tenant veya gizli yönetim alanı açmıyorum.`;
    return {
      ok: true,
      copilotVersion: 'CONT-217-VISIBLE-ADMIN-METRIC',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Yetkili ekran metriği',
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || 'İller ve Bölgeler',
      provider: 'local-authorized-screen-metric',
      providerSummary: 'superadmin-regions-visible-count',
      mode: 'RULE_BASED',
      scope: { role, companyKind: String(user?.companyKind || ''), roomId: user?.roomId ?? null, companyId: user?.companyId ?? null, summary: 'Yalnızca SUPER_ADMIN görünür bölge sayısı okundu.' },
      reply,
      summary: reply,
      contextSummary: `Yetkili ${path} ekranında görünen bölge sayısı okundu.`,
      questionType: 'VISIBLE_SCREEN_METRIC',
      activeTopic: 'SUPERADMIN_REGIONS_METRIC',
      assistantIntent: 'STATUS_HELP',
      responseSections: [{ title: 'Yetkili ekran metriği', body: reply }],
      dataSources: ['SUPER_ADMIN İller ve Bölgeler ekranının görünür özeti'],
      retrievedFacts: [{ label: 'Bölge', value, source: metric.source || 'AUTHORIZED_VISIBLE_SCREEN' }],
      readOnly: true,
      writeAction: false,
      semanticPlan: { family: 'STATUS_HELP', scopeTarget: 'CURRENT_SCREEN', screenPath: path, authorizationDecision: { status: 'ALLOW' } },
    };
  }
  const asksAuditCount = role === 'SUPER_ADMIN'
    && path === '/superadmin/audit'
    && /(?:kaç|sayısı|sayisi|kaç tane|adet)\s*(?:işlem|audit|kayıt)|(?:işlem|audit)\s*(?:kayıt|sayısı|sayisi)/iu.test(text);
  const asksAuditScopeBoundary = role === 'SUPER_ADMIN'
    && path === '/superadmin/audit'
    && /(?:başka|farklı|yabancı)\s+tenant|tenant.*(?:dahil|içer|kapsam)/iu.test(text);
  if (asksAuditScopeBoundary) {
    const metric = visibleMetrics.find((row) => /işlem|audit|kayıt/iu.test(String(row?.label || '').toLocaleLowerCase('tr-TR')));
    if (!metric || String(metric.value ?? '').trim() === '') return null;
    const value = String(metric.value).trim();
    const reply = `Hayır. Bu ekrandaki ${value} işlem kaydı yalnızca mevcut SUPER_ADMIN oturumunun yetkili, yüklenmiş audit görünümünden geliyor; başka tenant, gizli meta veri veya ham kişisel veri bu yanıta dahil edilmiyor.`;
    return {
      ok: true,
      copilotVersion: 'CONT-217-VISIBLE-ADMIN-METRIC',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Yetkili kapsam açıklaması',
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || 'İşlem Kayıtları',
      provider: 'local-authorized-screen-metric',
      providerSummary: 'superadmin-audit-visible-scope-boundary',
      mode: 'RULE_BASED',
      scope: { role, companyKind: String(user?.companyKind || ''), roomId: user?.roomId ?? null, companyId: user?.companyId ?? null, summary: 'Yanıt yalnızca SUPER_ADMIN görünür audit kapsamını açıklar.' },
      reply,
      summary: reply,
      contextSummary: `Yetkili ${path} ekranındaki audit kapsamı açıklandı.`,
      questionType: 'VISIBLE_SCREEN_SCOPE',
      activeTopic: 'SUPERADMIN_AUDIT_METRIC',
      assistantIntent: 'STATUS_HELP',
      responseSections: [{ title: 'Yetkili kapsam', body: reply }],
      dataSources: ['SUPER_ADMIN İşlem Kayıtları ekranının görünür özeti'],
      retrievedFacts: [{ label: 'İşlem Kayıtları', value, source: metric.source || 'AUTHORIZED_VISIBLE_SCREEN' }],
      readOnly: true,
      writeAction: false,
      semanticPlan: { family: 'STATUS_HELP', scopeTarget: 'CURRENT_SCREEN', screenPath: path, authorizationDecision: { status: 'ALLOW' } },
    };
  }
  if (asksAuditCount) {
    const metric = visibleMetrics.find((row) => /işlem|audit/u.test(String(row?.label || '').toLocaleLowerCase('tr-TR')));
    if (!metric || String(metric.value ?? '').trim() === '') return null;
    const value = String(metric.value).trim();
    const reply = `İşlem Kayıtları ekranında görünen yetkili kayıt sayısı: ${value}. Bu sayı yalnızca SUPER_ADMIN oturumunun yüklediği görünür audit listesini gösteriyor; gizli meta verileri açmıyorum.`;
    return {
      ok: true,
      copilotVersion: 'CONT-217-VISIBLE-ADMIN-METRIC',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Yetkili ekran metriği',
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || 'İşlem Kayıtları',
      provider: 'local-authorized-screen-metric',
      providerSummary: 'superadmin-audit-visible-count',
      mode: 'RULE_BASED',
      scope: { role, companyKind: String(user?.companyKind || ''), roomId: user?.roomId ?? null, companyId: user?.companyId ?? null, summary: 'Yalnızca SUPER_ADMIN görünür audit listesi sayısı okundu.' },
      reply,
      summary: reply,
      contextSummary: `Yetkili ${path} ekranında görünen işlem kayıtları sayısı okundu.`,
      questionType: 'VISIBLE_SCREEN_METRIC',
      activeTopic: 'SUPERADMIN_AUDIT_METRIC',
      assistantIntent: 'STATUS_HELP',
      responseSections: [{ title: 'Yetkili ekran metriği', body: reply }],
      dataSources: ['SUPER_ADMIN İşlem Kayıtları ekranının görünür özeti'],
      retrievedFacts: [{ label: 'İşlem Kayıtları', value, source: metric.source || 'AUTHORIZED_VISIBLE_SCREEN' }],
      readOnly: true,
      writeAction: false,
      semanticPlan: { family: 'STATUS_HELP', scopeTarget: 'CURRENT_SCREEN', screenPath: path, authorizationDecision: { status: 'ALLOW' } },
    };
  }
  return null;
}

function independentRoomFinanceView(screenContext = {}) {
  const path = String(screenContext?.path || "").split("?")[0];
  if (path !== "/room/financial-operations") return null;
  const view = String(screenContext?.structuredFacts?.financeView || screenContext?.structuredFacts?.activeTab || "").trim().toLowerCase();
  return INDEPENDENT_ROOM_FINANCE_VIEWS.has(view) ? view : null;
}

function formatLedgerMinor(value, currencyCode = "TRY") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "belirsiz";
  const amount = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) / 100);
  return `${amount} ${String(currencyCode || "TRY").toUpperCase() === "TRY" ? "TL" : String(currencyCode).toUpperCase()}`;
}

function currentMonthBounds(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    periodStart: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    periodEnd: `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function independentLedgerQuestion(message = "") {
  const value = String(message || "").trim().replace(/\s+/gu, " ");
  if (/^bu ay ne kadar giderim var\?$/iu.test(value)) return "MONTH_TOTAL";
  if (/^(?:hangi giderler dağıtılmamış|dağıtım bekleyen giderlerim neler)\?$/iu.test(value)) return "UNALLOCATED";
  if (/^bu araç bu (?:ay|dönem) ne kadar (?:masraf|gider) yaptı\?$/iu.test(value)) return "VEHICLE_PERIOD_TOTAL";
  if (/^bu aracın giderleri hangi servislere dağıldı\?$/iu.test(value)) return "VEHICLE_ALLOCATIONS";
  if (/^bu araç bana ne kadar kazandırdı\?$/iu.test(value)) return "VEHICLE_EARNINGS";
  if (/^hangi servis zarar ettirdi\?$/iu.test(value)) return "SERVICE_PROFITABILITY";
  if (/^bu aracın giderleri neler\?$/iu.test(value)) return "VEHICLE_SCOPE";
  if (/^bu rakam nereden geliyor\?$/iu.test(value)) return "SOURCE";
  if (/^sıradaki doğru (?:işlem|kontrol) ne\?$/iu.test(value)) return "NEXT_STEP";
  return null;
}

async function buildSuperAdminRegionCapacityResponse({
  user,
  entityType,
  entityId,
  screenContext,
  message,
  conversationState,
  semanticPlan,
} = {}) {
  const request = resolveSuperAdminRegionCapacityRequest({
    userRole: user?.role,
    screenPath: screenContext?.path,
    message,
    conversationState,
  });
  if (!request) return null;

  let snapshot;
  try {
    snapshot = await getRegionCapacitySnapshot();
  } catch (_error) {
    const reply = "Bölge kapasite özeti şu anda doğrulanamadı; ekrandaki güncel listeyi yenileyip tekrar deneyebilirsin. Başka bir bölgenin sayısını varsaymıyorum.";
    return {
      ok: true,
      intent: "CHAT_HELP",
      intentLabel: "Bölge kapasite açıklaması",
      provider: "local-superadmin-region-capacity-read",
      providerSummary: "region-capacity-read-failed-closed",
      mode: "RULE_BASED",
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || "İller ve Bölgeler",
      reply,
      summary: reply,
      contextSummary: "SUPER_ADMIN yetkili bölge kapasite özeti okunamadı.",
      questionType: "REGION_CAPACITY_SUMMARY",
      activeTopic: "REGION_CAPACITY_SUMMARY",
      assistantIntent: "REGION_CAPACITY_SUMMARY",
      semanticPlan: {
        ...semanticPlan,
        family: "REGION_CAPACITY_SUMMARY",
        intentFamily: "REGION_CAPACITY_SUMMARY",
        regionContext: null,
      },
      responseSections: [{ title: "Bölge kapasitesi", body: reply }],
      dataSources: ["SUPER_ADMIN İller ve Bölgeler kapasite özeti"],
      retrievedFacts: [],
      readOnly: true,
      writeAction: false,
      persisted: false,
      safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    };
  }

  const result = buildRegionCapacityReply({ snapshot, request });
  const reply = String(result?.reply || "").trim();
  const responseSemanticPlan = {
    ...semanticPlan,
    family: "REGION_CAPACITY_SUMMARY",
    intentFamily: "REGION_CAPACITY_SUMMARY",
    regionContext: result?.regionContext || null,
    typedRequest: {
      ...(semanticPlan?.typedRequest || {}),
      taskType: "COUNT",
      explicitTaskIntent: true,
      scopeTarget: "CURRENT_SCREEN",
    },
  };
  return {
    ok: true,
    intent: "CHAT_HELP",
    intentLabel: "Bölge kapasite açıklaması",
    provider: "local-superadmin-region-capacity-read",
    providerSummary: "region-capacity-read",
    mode: "RULE_BASED",
    entityType,
    entityId: Number(entityId) || 0,
    entityLabel: screenContext?.label || "İller ve Bölgeler",
    scope: {
      role: "SUPER_ADMIN",
      summary: "Yalnız SUPER_ADMIN yetkili bölge kapasite özeti okundu.",
    },
    reply,
    summary: reply,
    contextSummary: "SUPER_ADMIN İller ve Bölgeler ekranındaki yetkili kapasite özeti.",
    questionType: "REGION_CAPACITY_SUMMARY",
    activeTopic: "REGION_CAPACITY_SUMMARY",
    assistantIntent: "REGION_CAPACITY_SUMMARY",
    semanticPlan: responseSemanticPlan,
    responseSections: [{ title: "Bölge kapasitesi", body: reply }],
    dataSources: ["SUPER_ADMIN İller ve Bölgeler kapasite özeti"],
    retrievedFacts: result?.regionContext ? [{ type: "AUTHORIZED_REGION_CAPACITY", ...result.regionContext }] : [],
    suggestedChips: result?.status === "FOUND"
      ? ["Peki taşımacılık firması kaç?", "Bu bölgeyi ekranda göster", "Bölge kapasitesini yenile"]
      : ["Hangi bölgeler var?"],
    readOnly: true,
    writeAction: false,
    persisted: false,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

async function buildIndependentRoomFinanceLedgerResponse({ user, entityType, entityId, screenContext, message, semanticPlan } = {}) {
  const financeView = independentRoomFinanceView(screenContext);
  const questionType = independentLedgerQuestion(message);
  if (String(user?.role || "").toUpperCase() !== "ROOM" || !financeView || !questionType) return null;

  const monthly = questionType === "MONTH_TOTAL";
  const structuredFacts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : {};
  const vehicleScoped = questionType === "VEHICLE_PERIOD_TOTAL"
    || questionType === "VEHICLE_ALLOCATIONS"
    || questionType === "VEHICLE_EARNINGS";
  const ledgerVehicleId = Number(structuredFacts.ledgerVehicleId || 0);
  const hasLedgerVehicle = Number.isSafeInteger(ledgerVehicleId) && ledgerVehicleId > 0;
  const selectedPeriodStart = String(structuredFacts.ledgerPeriodStart || "").trim() || null;
  const selectedPeriodEnd = String(structuredFacts.ledgerPeriodEnd || "").trim() || null;
  const selectedPeriod = selectedPeriodStart || selectedPeriodEnd
    ? { periodStart: selectedPeriodStart, periodEnd: selectedPeriodEnd }
    : null;
  const scopedPeriod = vehicleScoped
    ? (selectedPeriod || currentMonthBounds())
    : monthly
      ? currentMonthBounds()
      : null;
  const filters = {
    recordKind: "ACTUAL",
    includeSalary: true,
    ...(vehicleScoped && hasLedgerVehicle ? { vehicleId: ledgerVehicleId } : {}),
    ...(scopedPeriod || { periodScope: "ALL" }),
  };
  let result;
  try {
    result = await summarizeRoomCosts({
      actor: user,
      roomId: user.roomId,
      filters,
      prisma,
    });
  } catch (_error) {
    const reply = "Firma gider defteri özeti şu anda doğrulanamadı. Giderlerim ekranındaki canlı kapsamı yenileyip tekrar deneyebilirsin; hizmet veya vardiya maliyetini firma toplamı yerine kullanmıyorum.";
    return {
      ok: true,
      intent: "CHAT_HELP",
      intentLabel: "Firma gider defteri açıklaması",
      provider: "local-room-finance-ledger-read",
      providerSummary: "independent-room-ledger-read-failed-closed",
      mode: "RULE_BASED",
      entityType,
      entityId: Number(entityId) || 0,
      entityLabel: screenContext?.label || "Giderlerim",
      reply,
      summary: reply,
      contextSummary: `ROOM firma gider defteri · ${financeView}`,
      questionType: "FINANCE_LEDGER_SUMMARY",
      assistantIntent: "FINANCE_LEDGER_SUMMARY",
      semanticPlan,
      dataSources: ["ROOM gider defteri"],
      retrievedFacts: [],
      readOnly: true,
      writeAction: false,
      persisted: false,
      safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    };
  }

  const actual = result?.buckets?.ACTUAL || {};
  const allocation = result?.allocation || {};
  const amount = formatLedgerMinor(actual.grossAmountMinor, actual.currencyCode);
  const count = Number(actual.entryCount || 0);
  const scopeLabel = scopedPeriod
    ? `${scopedPeriod.periodStart || "başlangıç yok"} – ${scopedPeriod.periodEnd || "bitiş yok"}`
    : "Tüm dönemler";
  const sourceIds = (Array.isArray(result?.known) ? result.known : [])
    .filter((row) => String(row?.recordKind || "").toUpperCase() === "ACTUAL")
    .map((row) => Number(row?.entryId || 0))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  const sourceIdText = sourceIds.length ? `Kaynak gider kayıtları: #${sourceIds.join(", #")}.` : "Kaynak gider kaydı bulunamadı.";
  const pendingAmount = formatLedgerMinor(allocation.pendingAmountMinor, allocation.currencyCode || actual.currencyCode);
  const allocationGroups = new Map();
  if (questionType === "VEHICLE_ALLOCATIONS") {
    for (const line of Array.isArray(allocation?.lines) ? allocation.lines : []) {
      for (const allocationLine of Array.isArray(line?.allocationLines) ? line.allocationLines : []) {
        const agreementId = Number(allocationLine?.agreementId || 0) || null;
        const shiftId = Number(allocationLine?.shiftId || 0) || null;
        const key = `${agreementId || "none"}:${shiftId || "none"}`;
        const current = allocationGroups.get(key) || {
          agreementId,
          shiftId,
          amountMinor: 0,
          agreementLabel: allocationLine?.display?.agreementLabel || null,
          shiftLabel: allocationLine?.display?.shiftLabel || null,
        };
        current.amountMinor += Number(allocationLine?.allocatedAmountMinor || 0) || 0;
        allocationGroups.set(key, current);
      }
    }
  }
  const allocationGroupText = [...allocationGroups.values()]
    .filter((item) => item.amountMinor > 0)
    .map((item) => {
      const target = [
        item.agreementId && `Sözleşme #${item.agreementId}`,
        item.agreementLabel,
        item.shiftId && `Vardiya #${item.shiftId}`,
        item.shiftLabel,
      ].filter(Boolean).join(" · ") || "ilişkili servis";
      return `${target}: ${formatLedgerMinor(item.amountMinor, allocation.currencyCode || actual.currencyCode)}`;
    })
    .join("; ");
  const netNote = actual.netRollupBlocked
    ? "KDV bilgisi eksik olan kayıtlar nedeniyle kesin net toplam çıkarılmadı."
    : "Net toplam için kayıtlı KDV kapsamı kullanıldı.";
  let reply;
  if (questionType === "MONTH_TOTAL") {
    reply = `${scopeLabel} için firma geneli Giderlerim defterinde ${amount} / ${count} onaylı gerçekleşen gider kaydı var. Bu yanıt hizmet veya vardiya filtresi taşımaz. ${netNote}`;
  } else if (questionType === "VEHICLE_ALLOCATIONS") {
    reply = allocationGroupText
      ? `${scopeLabel} döneminde seçili aracın kanıtlı gider dağıtımı şu servis kapsamlarına ayrılıyor: ${allocationGroupText}. Bu dağıtılmış payların toplamı araç giderini ikinci kez artırmaz; kaynak gider kayıtları bir kez sayılır. ${netNote}`
      : `${scopeLabel} döneminde seçili araç için doğrulanmış servis dağıtım satırı bulunamadı. Dağıtım ilişkisi olmayan giderleri bir servise uydurarak bağlamıyorum; Giderlerim içindeki kaynak kaydı ve dağıtım kanıtı kontrol edilmeli.`;
  } else if (questionType === "VEHICLE_EARNINGS") {
    reply = hasLedgerVehicle
      ? `${scopeLabel} döneminde seçili aracın doğrulanmış gerçekleşen gideri ${amount} / ${count} kayıttır. Bu görünümde aynı araç ve dönem için kazanılmış gelir kanıtı doğrulanmadığı için ne kadar kazandırdığına veya kesin kâra dair hüküm vermiyorum; başka bir servis ya da firmanın gelirini araca taşımıyorum. ${netNote}`
      : "Bu aracın kazancını güvenle açıklayebilmem için Giderlerim ekranında araç filtresini açıkça seçmelisin. Araç ve dönem kanıtı olmadan gelir veya kâr uydurmuyorum.";
  } else if (questionType === "SERVICE_PROFITABILITY") {
    reply = "Bu Giderlerim görünümünde seçili servis ve aynı kapsamdaki kazanılmış gelir kanıtı bulunmadığı için hangi servisin zarar ettiğini söylemiyorum. Araç giderini, servis payını veya başka bir dönemin gelirini zarar sonucu gibi göstermiyorum; ilgili servisi Genel Durum ya da Servis Maliyeti sekmesinde açıkça seçip aynı dönem kanıtıyla incelemelisin.";
  } else if (questionType === "VEHICLE_PERIOD_TOTAL") {
    if (!hasLedgerVehicle) {
      reply = "Bu aracın tutarını güvenle hesaplayabilmem için Giderlerim ekranında araç filtresini seçmelisin. Araç filtresi olmadan firma geneli gider toplamını araç gideri gibi göstermiyorum.";
    } else {
      reply = `${scopeLabel} döneminde seçili aracın Giderlerim defterinde ${amount} / ${count} onaylı gerçekleşen gider kaydı var. Bu, araç gider defterinin brüt toplamıdır; hizmet veya vardiya maliyeti ve kesin net kâr değildir. ${netNote}`;
    }
  } else if (questionType === "UNALLOCATED") {
    reply = `Firma geneli ${scopeLabel} kapsamındaki kanıtlı gerçekleşen giderlerde dağıtım bekleyen para payı ${pendingAmount}. Defter özeti ${count} gerçekleşen kaydı içeriyor; dağıtım görünümü ${allocation.status || "belirsiz"} ve ${Number(allocation.includedLineCount || 0)} satır kapsamda. ${netNote}`;
  } else if (questionType === "VEHICLE_SCOPE") {
    reply = `Şu anda Giderlerim firma genelinde açık; otomatik araç filtresi uygulanmadı. Firma geneli toplam ${amount} / ${count} kayıt. Belirli bir aracın giderlerini görmek için Giderlerim içindeki araç filtresini açıkça seçmelisin; Servis Maliyeti seçimi bu defteri daraltmaz.`;
  } else if (questionType === "SOURCE") {
    reply = `Bu tutar ROOM'un bağımsız Giderlerim defterindeki onaylı gerçekleşen kayıtların brüt toplamından geliyor: ${amount} / ${count} kayıt. ${sourceIdText} ${netNote}`;
  } else {
    reply = `Sıradaki güvenli adım, Giderlerim'de firma geneli toplamı ve dağıtım bekleyen payı incelemek; ardından gerekiyorsa ilgili giderin ayrıntısına gitmek. Bu yanıt salt okunur, ${count} gerçekleşen kayıt ve ${amount} toplamı üzerinden hazırlandı.`;
  }

  return {
    ok: true,
    intent: "CHAT_HELP",
    intentLabel: "Firma gider defteri açıklaması",
    provider: "local-room-finance-ledger-read",
    providerSummary: "independent-room-ledger-read",
    mode: "RULE_BASED",
    entityType,
    entityId: Number(entityId) || 0,
    entityLabel: screenContext?.label || "Giderlerim",
    scope: { role: "ROOM", roomId: Number(user?.roomId || 0) || null, periodStart: filters.periodStart || null, periodEnd: filters.periodEnd || null },
    reply,
    summary: reply,
    contextSummary: `Firma geneli · Bağımsız gider defteri · ${scopeLabel}`,
    questionType: "FINANCE_LEDGER_SUMMARY",
    activeTopic: "FINANCE_LEDGER_SUMMARY",
    assistantIntent: "FINANCE_LEDGER_SUMMARY",
    semanticPlan,
    responseSections: [{ title: "Sonuç", body: reply }],
    retrievedFacts: [
      { type: "ROOM_LEDGER_ACTUAL", amountMinor: actual.grossAmountMinor ?? null, currencyCode: actual.currencyCode || null, entryCount: count, scope: scopeLabel },
      { type: "ROOM_LEDGER_ALLOCATION", pendingAmountMinor: allocation.pendingAmountMinor ?? null, status: allocation.status || null, includedLineCount: allocation.includedLineCount ?? null },
    ],
    dataSources: ["ROOM gider defteri", "canonical maliyet dağıtım özeti"],
    readOnly: true,
    writeAction: false,
    persisted: false,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    qualityHints: { actionable: true, independentLedgerScope: true, selectedServiceContextIgnored: !vehicleScoped, explicitVehicleScope: vehicleScoped },
  };
}

function hasCanonicalCostIntent(semanticPlan) {
  const request = semanticPlan?.canonicalRequest;
  if (!['SEFER-ABI-CANONICAL-REQUEST-V2', 'SEFER-ABI-CANONICAL-REQUEST-V3'].includes(request?.version)) return false;
  return request.operation === "ASSESS_CURRENT_RISK"
    || ["BUDGET", "FINANCE"].includes(String(request.domain || "").toUpperCase())
    || request.capability === "COST_ANALYSIS";
}

export function hasSelectedFinancialMetricQuestion({ message = "", screenContext = null } = {}) {
  const path = String(screenContext?.path || "").split("?")[0];
  if (!/^\/(?:room|company|school|organization)\/financial-operations$/iu.test(path)) return false;
  const financeView = String(screenContext?.structuredFacts?.financeView || screenContext?.structuredFacts?.activeTab || "").trim().toLowerCase();
  const companyFinanceOverview = String(screenContext?.structuredFacts?.screenType || "").toUpperCase() === "COMPANY_FINANCIAL_OPERATIONS"
    && String(screenContext?.role || "").toUpperCase() === "COMPANY";
  const selectedCostView = !financeView
    || ["service-cost", "vehicle-comparison", "quote-profitability"].includes(financeView)
    // COMPANY's overview contains the canonical read-only scenario workspace;
    // natural vehicle questions from that surface must reach the same owner
    // instead of falling through to generic vehicle/GPS awareness.
    || (companyFinanceOverview && financeView === "overview");
  const selectedId = Number(
    screenContext?.selectedEntityId
      || screenContext?.selectedRecordId
      || screenContext?.structuredFacts?.selectedShiftId
      || screenContext?.structuredFacts?.selectedAgreementId
      || screenContext?.structuredFacts?.selectedVehicleId
      || 0,
  ) || 0;
  if (selectedId <= 0) return false;
  const value = String(message || "");
  const visibleSuggestions = Array.isArray(screenContext?.uiHints?.visibleSuggestions)
    ? screenContext.uiHints.visibleSuggestions.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const clickedVisibleFinanceStarter = selectedCostView && visibleSuggestions.some((item) => item === value.trim());
  const canonicalFinanceStarter = selectedCostView && /^(?:bu servisin maliyeti ne\?|bu rakam nereden geliyor\?|bu vardiyanın kilometresi neden eksik\?|bu bilgiyi nereden tamamlayabilirim\?|bu ay ne kadar giderim var\?|hangi giderler dağıtılmamış\?|bu aracın giderleri neler\?|bu servise hangi araç daha uygun\?|midibüs yerine otobüs kullansam ne değişir\?|yakıt fiyatı artarsa maliyet ne olur\?|bu hizmetten ne kadar kazanıyorum\?|gerçekleşen giderle tahmin arasındaki fark ne\?|teklif neden bu vardiyaya ait değil\?|sıradaki doğru işlem ne\?)$/iu.test(value.trim());
  const naturalVehicleComparisonQuestion = selectedCostView
    && /(?:hangi|kaç|kac)\s+(?:bir\s+)?(?:araç|arac)(?=\s|$|[?!.,])[^.!?\n]{0,48}(?:uygun|mantıklı|mantikli|öner|oner|iyi|avantajlı|avantajli)/iu.test(value)
    || (selectedCostView && /(?:araç|arac)(?=\s|$|[?!.,])[^.!?\n]{0,48}(?:daha\s+)?(?:uygun|mantıklı|mantikli|öner|oner)/iu.test(value));
  const naturalFuelScenarioQuestion = selectedCostView
    && /(?:yakıt|yakit|akaryakıt|akaryakit)[^.!?\n]{0,48}(?:artar|artarsa|artış|artis|yüksel|yuksel|ne\s+olur)/iu.test(value);
  const naturalFinanceContinuationQuestion = selectedCostView
    && (/(?:^(?:bunu|bu\s+(?:alanı|bilgiyi|varsayımı|tutarı)).*(?:nereden|nasıl).*(?:değiştir|degistir|tamam|bul))/iu.test(value.trim())
      || /^(?:bulamadım|bulamadim|geri|devam(?:\s+et)?|neden|nasıl|nasil)\.?$/iu.test(value.trim()));
  const metricWord = /(?:maliyet|gider|servis|hizmet|rakam|tutar|teklif|tahmini|gerçekleşen|gerceklesen)/iu.test(value);
  const questionWord = /(?:ne|nedir|ne kadar|nereden|kaynak|hesap|fark|göster|goster|açıkla|acikla|detay|neden)/iu.test(value);
  // A visible starter is an explicit current-screen action, including route
  // and completion-help chips that do not contain a financial metric word.
  // Risk starters remain owned by the risk composer.
  return (metricWord && questionWord || clickedVisibleFinanceStarter || canonicalFinanceStarter || naturalVehicleComparisonQuestion || naturalFuelScenarioQuestion || naturalFinanceContinuationQuestion)
    && !/(?:risk|tehlike|riskli)/iu.test(value);
}

export function shouldRoutePlatformHistoricalReferenceBeforeFinancialRisk({ semanticPlan = null, authorizationStatus = "DENY", roleScopedTargetDenied = false } = {}) {
  const requested = semanticPlan?.canonicalRequest?.platformHistoricalReferenceIntent === true
    || semanticPlan?.typedRequest?.platformHistoricalReferenceIntent === true;
  return requested && String(authorizationStatus).toUpperCase() === "ALLOW" && !roleScopedTargetDenied;
}

export function isSelectedRecordAssessmentPlan({ semanticPlan = null, explicitSelectedFinancialCostQuestion = false, agreementReconciliationIntent = false } = {}) {
  return semanticPlan?.scopeTarget === "SELECTED_RECORD"
    && Array.isArray(semanticPlan?.entities)
    && semanticPlan.entities.length === 1
    && ["RISK_RANKING", "NEXT_STEP", "PRIORITY", "ISSUE_DIAGNOSTIC", "CAUSE_WHY", "RESOLUTION_PLAN"].includes(String(semanticPlan?.family || ""))
    && !explicitSelectedFinancialCostQuestion
    && !agreementReconciliationIntent;
}

export function isRoomFinancialScreenSummaryIntent({ semanticPlan = null, screenContext = null, message = "" } = {}) {
  const selectedEntityId = Number(
    screenContext?.selectedEntityId
      || screenContext?.selectedRecordId
      || 0,
  ) || 0;
  const selectedEntityType = String(screenContext?.selectedEntityType || "").trim().toLowerCase();
  if (selectedEntityId > 0 && selectedEntityType) return false;
  return semanticPlan?.canonicalRequest?.operation === "ASSESS_CURRENT_RISK"
    && String(semanticPlan?.canonicalRequest?.domain || "").toUpperCase() === "FINANCE"
    && Array.isArray(semanticPlan?.canonicalRequest?.candidateEntityRefs)
    && semanticPlan.canonicalRequest.candidateEntityRefs.length === 0
    && /hakediş|hakedis|mutabakat|fatura|finans/iu.test(String(message || ""));
}

function hasCanonicalQuoteFloorEvidence(semanticPlan) {
  const request = semanticPlan?.canonicalRequest;
  return request?.domain === "BUDGET"
    && request?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true;
}

function hasCanonicalFinancialMetricIdentity(semanticPlan) {
  const request = semanticPlan?.canonicalRequest;
  const domain = String(request?.domain || "").toUpperCase();
  const specificity = request?.typedEvidence?.specificity || {};
  return ["BUDGET", "FINANCE"].includes(domain)
    && (specificity.financialMetricIdentityEvidence === true
      || specificity.quoteFloorAnalysisEvidence === true);
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
    selectedFields: Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : [],
    selectedBadges: Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges : [],
    structuredFacts: screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
      ? screenContext.structuredFacts
      : null,
  };
}

function canonicalTargetIsLive(screenContext = {}, target = null) {
  const targetKey = String(target?.targetKey || '').trim();
  if (!targetKey) return false;
  const hints = screenContext?.uiHints && typeof screenContext.uiHints === 'object'
    ? screenContext.uiHints
    : {};
  const rows = [
    ...(Array.isArray(hints.visibleButtons) ? hints.visibleButtons : []),
    ...(Array.isArray(hints.visibleMenus) ? hints.visibleMenus : []),
    ...(Array.isArray(hints.activeTabs) ? hints.activeTabs : []),
    ...(Array.isArray(hints.semanticElements) ? hints.semanticElements : []),
    ...(Array.isArray(hints.semanticBlocks) ? hints.semanticBlocks : []),
  ];
  return rows.some((row) => String(
    typeof row === 'string' ? row : row?.targetKey || row?.semanticKey || row?.copilotTarget || row?.blockKey || '',
  ).trim() === targetKey);
}

function roomCostSurfacePath(screenContext = {}) {
  return String(screenContext?.path || '').split('?')[0];
}

function isRoomCostAssistantAdmission({ user, screenContext, semanticPlan } = {}) {
  const canonicalFinancialMetric = semanticPlan?.canonicalRequest?.typedEvidence?.specificity?.financialMetricIdentityEvidence === true;
  return String(user?.role || '').toUpperCase() === 'ROOM'
    && roomCostSurfacePath(screenContext) === '/room/financial-operations'
    && Boolean(semanticPlan?.roomCostRequest)
    // Direct read-only financial metric questions (currently the automatic
    // fuel-cost contract) belong to the canonical cost-analysis owner.  The
    // room-cost assistant remains responsible for ledger drafts, summaries,
    // recovery and explicit confirmation, but must not replace a metric
    // answer with a generic central-ledger explanation.
    && !canonicalFinancialMetric
    && (semanticPlan?.authorizationDecision?.status === 'ALLOW'
      || semanticPlan?.roleTargetResolution === 'UNAUTHORIZED');
}

export function isRoomCostScenarioSurfaceQuestion({ user, screenContext, message = '' } = {}) {
  const path = String(screenContext?.path || '').split('?')[0];
  if (String(user?.role || '').toUpperCase() !== 'ROOM' || path !== '/room/cost-scenarios') return false;
  const text = String(message || '');
  return /(?:maliyet|senaryo|önizleme|onizleme|plan)/iu.test(text)
    && /(?:gerçekleşmiş|gerceklesmis|ödeme|odeme|gider|kâr|kar|net|kesin|sonuç|sonuc|bakım|bakim|kdv|kanıt|kanit)/iu.test(text);
}

function safeRoomCostDeniedSemanticPlan() {
  return {
    family: 'AUTHORIZATION_BOUNDARY',
    intentFamily: 'AUTHORIZATION_BOUNDARY',
    planStatus: 'UNAUTHORIZED',
    conversationRoute: 'AUTHORIZATION_BOUNDARY',
    dialogueTopic: 'PRODUCT',
    roleTargetResolution: 'UNAUTHORIZED',
    requestedDomains: [],
    requestedFields: [],
    roomCostRequest: null,
    typedRequest: { taskType: 'SAFE_CLARIFICATION', roomCostRequest: null },
    canonicalRequest: null,
  };
}

function roomCostResolvedRecord(resolvedContext, user) {
  const type = String(resolvedContext?.resolvedEntityType || '').toUpperCase();
  const record = resolvedContext?.context;
  const id = Number(record?.id || 0) || 0;
  if (!id || !['VEHICLE', 'DRIVER'].includes(type)) return null;
  return {
    type,
    id,
    roomId: Number(user?.roomId || 0) || null,
    plate: record?.plate || record?.licensePlate || null,
  };
}

function safeRoomCostContinuationState(clientState, user, screenContext) {
  const role = String(user?.role || '').toUpperCase();
  const path = String(screenContext?.path || '').split('?')[0];
  const roomCost = clientState?.roomCost || clientState?.roomCostConversationState || null;
  if (role !== 'ROOM' || path !== '/room/financial-operations' || roomCost?.subject !== 'ROOM_COST_DRAFT') return null;
  if (Number(roomCost.roomId || 0) !== Number(user?.roomId || 0)) return null;
  const draft = roomCost.draft && typeof roomCost.draft === 'object' ? roomCost.draft : {};
  const period = draft.period && typeof draft.period === 'object'
    ? {
      kind: String(draft.period.kind || '').toUpperCase() || null,
      value: String(draft.period.value || '').trim() || null,
      start: String(draft.period.start || '').trim() || null,
      end: String(draft.period.end || '').trim() || null,
    }
    : null;
  return {
    subject: 'ROOM_COST_DRAFT',
    intent: String(roomCost.intent || '').trim() || null,
    continuationAction: String(roomCost.continuationAction || '').trim().toUpperCase() || 'CONTINUE',
    confirmationRequired: roomCost.confirmationRequired === true,
    roomId: Number(user.roomId),
    selectedRecordKey: String(roomCost.selectedRecordKey || '').trim() || null,
    draft: {
      persisted: false,
      writeAction: false,
      category: String(draft.category || '').trim().toUpperCase() || null,
      vehicleId: Number(draft.vehicleId || 0) || null,
      driverId: Number(draft.driverId || 0) || null,
      period,
      amountMinor: Number.isSafeInteger(draft.amountMinor) && draft.amountMinor > 0 ? draft.amountMinor : null,
      currencyCode: /^[A-Z]{3}$/u.test(String(draft.currencyCode || '').toUpperCase()) ? String(draft.currencyCode).toUpperCase() : null,
      evidenceRef: String(draft.evidenceRef || '').trim().toUpperCase() || null,
    },
    audit: { readOnly: true, writeAction: false, salaryRedacted: draft.salaryRedacted === true },
  };
}

function hasCanonicalRoomCostState(conversationState) {
  return Boolean(
    conversationState?.lastSettledResult?.roomCostConversationState
      || conversationState?.lastSettledResult?.semanticPlan?.roomCostConversationState,
  );
}

async function buildRoomCostAssistantResponse({
  user,
  screenContext,
  semanticPlan,
  conversationState,
  entityType,
  entityId,
  roomCostAccess,
} = {}) {
  if (!isRoomCostAssistantAdmission({ user, screenContext, semanticPlan })) return null;

  const resolvedContext = await resolveChatContext({
    entityType,
    entityId,
    user,
    screenContext,
    conversationState,
  });
  let selectedRecord = roomCostResolvedRecord(resolvedContext, user);
  const requestedVehiclePlate = semanticPlan?.roomCostRequest?.fields?.vehicle?.plate;
  const priorRoomCostState = conversationState?.roomCost
    || conversationState?.roomCostConversationState
    || conversationState?.lastSettledResult?.roomCostConversationState
    || conversationState?.lastSettledResult?.semanticPlan?.roomCostConversationState
    || null;
  const priorVehicleId = Number(priorRoomCostState?.draft?.vehicleId || 0) || null;
  if (!selectedRecord && requestedVehiclePlate) {
    try {
      const vehicleContext = await getVehicleContextByPlate(user, requestedVehiclePlate);
      selectedRecord = {
        type: 'VEHICLE',
        id: vehicleContext.id,
        roomId: Number(user?.roomId || 0) || null,
        plate: vehicleContext.plate || requestedVehiclePlate,
      };
    } catch (error) {
      if (!['VEHICLE_NOT_FOUND', 'VEHICLE_PLATE_AMBIGUOUS'].includes(String(error?.code || ''))) throw error;
      // An unresolved or ambiguous plate is a clarification boundary. Do not
      // synthesize an ID or let an old selected record authorize this turn.
      selectedRecord = null;
    }
  } else if (!selectedRecord && priorVehicleId) {
    try {
      const vehicleContext = await getVehicleContext(user, priorVehicleId);
      selectedRecord = {
        type: 'VEHICLE',
        id: vehicleContext.id,
        roomId: Number(user?.roomId || 0) || null,
        plate: vehicleContext.plate || null,
      };
    } catch (error) {
      // A client-provided continuation reference never grants access. If the
      // current user can no longer resolve the vehicle in the active ROOM,
      // force safe clarification instead of rebinding to a same-ID record.
      if (!['VEHICLE_NOT_FOUND', 'VEHICLE_SCOPE_FORBIDDEN', 'FORBIDDEN'].includes(String(error?.code || ''))) throw error;
      selectedRecord = null;
    }
  }
  const activeContext = {
    roomId: Number(user?.roomId || 0) || null,
    salaryAccess: roomCostAccess?.salaryAllowed === true,
    selectedRecord,
    selectedRecordKey: selectedRecord ? `${selectedRecord.type}:${selectedRecord.id}` : null,
    authorizedVehicles: selectedRecord?.type === 'VEHICLE' ? [selectedRecord] : [],
    authorizedDrivers: selectedRecord?.type === 'DRIVER' ? [selectedRecord] : [],
    conversationState,
  };
  const draft = resolveRoomCostRequest({
    semanticRequest: semanticPlan,
    activeContext,
  });
  const access = { salaryAllowed: roomCostAccess?.salaryAllowed === true };
  const reply = buildRoomCostDraftReply({ draft, access, missing: draft.missing });
  const categoryKey = String(draft?.fields?.category?.key || '').toUpperCase();
  const salarySensitive = ROOM_COST_SALARY_CATEGORIES.has(categoryKey)
    || draft?.fields?.salaryRequested === true;
  const salaryDenied = salarySensitive && access.salaryAllowed !== true;
  const targetReference = reply.guidedTarget
    ? {
      targetKey: reply.guidedTarget.targetKey,
      semanticId: reply.guidedTarget.semanticId,
      targetKind: 'CONTROL',
      screenPath: '/room/financial-operations',
    }
    : null;
  const responseSemanticPlan = salaryDenied
    ? safeRoomCostDeniedSemanticPlan()
    : {
      ...semanticPlan,
      roomCostConversationState: reply.conversationState,
      roomCostTargetReference: targetReference,
      currentTargetReference: targetReference,
    };
  const safeSummary = salaryDenied
    ? 'Yetkili finansal erişim olmadan ayrıntı gösterilmedi.'
    : reply.answerTr;
  return {
    ok: true,
    intent: 'CHAT_HELP',
    intentLabel: intentLabel('CHAT_HELP'),
    provider: 'local-room-cost-assistant',
    providerSummary: 'room-cost-assistant-draft',
    mode: 'RULE_BASED',
    scope: { role: 'ROOM', roomId: Number(user?.roomId || 0) || null },
    reply: salaryDenied ? safeSummary : reply.answerTr,
    summary: salaryDenied ? safeSummary : reply.answerTr,
    contextSummary: 'ROOM Gider Yönetimi yetkili ve salt-okunur taslak yönlendirmesi.',
    questionType: 'FIELD_LOOKUP',
    assistantIntent: 'ROOM_COST',
    responseSections: [{ title: 'Gider yönlendirmesi', body: salaryDenied ? safeSummary : reply.answerTr }],
    semanticPlan: responseSemanticPlan,
    guidedTarget: reply.guidedTarget || null,
    roomCostConversationState: reply.conversationState,
    suggestedChips: salaryDenied ? [] : reply.suggestedQuestions,
    contextualSuggestedChips: salaryDenied ? [] : reply.suggestedQuestions,
    confirmationRequired: salaryDenied ? false : reply.conversationState?.confirmationRequired === true,
    readOnly: true,
    writeAction: false,
    persisted: false,
    dataSources: ['ROOM Gider Yönetimi'],
    reasoning: salaryDenied
      ? 'Yetkili erişim sonucu olmadan hassas finansal ayrıntı, hedef veya taslak alanları üretilmedi.'
      : 'ROOM Gider Yönetimi sözleşmesi üretim canonical servisinde çalıştırıldı; iş yazımı yapılmadı.',
    nextAction: salaryDenied
      ? 'Yetkili bir finans ekranında ilerle.'
      : (reply.guidedTarget ? `“${reply.guidedTarget.targetKey}” hedefini kontrol et.` : 'Eksik bilgileri netleştir.'),
    safeNextStep: salaryDenied
      ? 'Yetkili bir finans ekranında ilerle.'
      : (reply.guidedTarget ? `“${reply.guidedTarget.targetKey}” hedefini kontrol et.` : 'Eksik bilgileri netleştir.'),
  };
}

function restoreVerifiedConversationStep({ conversationState, screenContext, semanticPlan, user } = {}) {
  const action = String(
    semanticPlan?.typedRequest?.continuationAction || semanticPlan?.continuationAction || '',
  ).toUpperCase();
  if (action !== 'BACK') return null;
  const step = Array.isArray(conversationState?.conversationStepHistory)
    ? conversationState.conversationStepHistory[0]
    : null;
  const target = step?.guidedTarget;
  const targetScopeRole = String(target?.authorizedContext?.role || target?.role || '').toUpperCase();
  if (!step || !target || step.screenPath !== String(screenContext?.path || '')
    || (targetScopeRole && targetScopeRole !== String(user?.role || '').toUpperCase())
    || !canonicalTargetIsLive(screenContext, target)) return null;
  const selectedId = Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) || 0;
  const storedSelectedId = Number(step.selectedEntity?.id || 0) || 0;
  if (selectedId > 0 && storedSelectedId > 0 && selectedId !== storedSelectedId) return null;
  return {
    step,
    target: {
      ...target,
      status: GUIDED_TARGET_STATUSES.FOUND,
      screenPath: String(screenContext?.path || ''),
      role: String(user?.role || '').toUpperCase(),
      reason: 'Önceki adım aynı yetkili yüzeyde canlı canonical hedef olarak yeniden doğrulandı.',
    },
  };
}

function restoreVerifiedForwardConversationStep({ conversationState, screenContext, semanticPlan, user } = {}) {
  const action = String(
    semanticPlan?.typedRequest?.continuationAction || semanticPlan?.continuationAction || '',
  ).toUpperCase();
  if (!['CONTINUE', 'NEXT', 'FORWARD'].includes(action)) return null;
  const step = conversationState?.conversationForwardStep || null;
  const target = step?.guidedTarget;
  const targetScopeRole = String(target?.authorizedContext?.role || target?.role || '').toUpperCase();
  if (!step || !target || step.screenPath !== String(screenContext?.path || '')
    || (targetScopeRole && targetScopeRole !== String(user?.role || '').toUpperCase())
    || !canonicalTargetIsLive(screenContext, target)) return null;
  const selectedId = Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) || 0;
  const storedSelectedId = Number(step.selectedEntity?.id || 0) || 0;
  if (selectedId > 0 && storedSelectedId > 0 && selectedId !== storedSelectedId) return null;
  return {
    step,
    target: {
      ...target,
      status: GUIDED_TARGET_STATUSES.FOUND,
      screenPath: String(screenContext?.path || ''),
      role: String(user?.role || '').toUpperCase(),
      reason: 'İleri adım aynı yetkili yüzeyde canlı canonical hedef olarak yeniden doğrulandı.',
    },
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
  // A full-screen copilot route is hosted at /<role>/copilot, while the
  // selected record may have originated from a live surface such as
  // /driver/route. Re-bind semantic reads to that source surface only after
  // resolving it through the authenticated role's screen catalog. An
  // unrecognized or cross-role source is ignored, never trusted as a route
  // authorization shortcut.
  const sourcePath = String(screenContext?.sourcePath || '').split('?')[0].trim();
  const sourceResolved = sourcePath && sourcePath !== resolved.screen.path
    ? resolveAuthorizedScreenContext(user, { path: sourcePath }, null)
    : null;
  const effectiveScreen = sourceResolved?.screen || resolved.screen;
  return {
    ...copyClientSelectionHints(screenContext),
    id: Number(effectiveScreen.id),
    path: effectiveScreen.path,
    label: effectiveScreen.label,
    role: resolved.effectiveRoleKey,
    companyKind: String(user?.companyKind || "").toUpperCase(),
    catalogRoleKey: effectiveScreen.catalogRoleKey,
    // The browser surface is evidence for this turn only. The canonical
    // conversation state sanitizes it before any semantic target resolution.
    uiHints: screenContext?.uiHints && typeof screenContext.uiHints === "object"
      ? screenContext.uiHints
      : {},
  };
}

function buildGenericProductHelpProjection({ message, semanticPlan, user = null, screenContext = null, conversationState = null }) {
  // A Hub location question is still classified conservatively as generic
  // role help by the planner when the user omits the word "koordinat".  The
  // live Hub surface already carries the authorized coordinates, so keep this
  // narrow read-only route ahead of the generic role playbook.  Authorization
  // has completed before this projection is reached.
  const companyHubContextReply = buildCompanyHubContextReply({ message, screenContext, conversationState });
  if (companyHubContextReply) {
    return {
      ok: true,
      copilotVersion: "ROUND-10-COMPANY-HUB-CONTEXT",
      generatedAt: new Date().toISOString(),
      intent: "CHAT_HELP",
      intentLabel: "Yetkili merkez konumu",
      provider: "local-company-hub-context",
      providerSummary: "authorized-company-hub-read",
      mode: "RULE_BASED",
      scope: {
        role: String(user?.role || ""),
        companyKind: String(user?.companyKind || ""),
        summary: "Yalnızca mevcut yetkili Hub kaydının konum alanları okundu; yazma işlemi başlatılmadı.",
      },
      ...companyHubContextReply,
      contextSummary: "Yetkili Hub kaydının mevcut merkez konumu okundu.",
      semanticPlan,
      conversationRoute: "CURRENT_SCREEN_CONTEXT",
      dialogueTopic: "PRODUCT",
      authorizedProductContext: {
        screenPath: String(screenContext?.path || "").split("?")[0],
        screenLabel: screenContext?.label || "Hub",
      },
      readOnly: true,
    };
  }

  // Product-overview language is safe to answer without records, but an
  // authenticated in-product turn should still explain the user's actual
  // role and current authorized surface.  Keep the context-free projection
  // for unauthenticated/no-screen requests; use the existing role playbook
  // for current UI guidance without adding a second semantic authority.
  const contextual = Boolean(screenContext?.path && user?.role);
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

export function buildSuperAdminOnboardingReviewSelectedLeadResponse({
  user,
  screenContext,
  selectedRecord,
  semanticPlan = null,
} = {}) {
  const role = String(user?.role || "").trim().toUpperCase();
  const path = String(screenContext?.path || "").split("?")[0];
  const selected = selectedRecord && typeof selectedRecord === "object" ? selectedRecord : null;
  if (
    role !== "SUPER_ADMIN"
    || !["/superadmin/onboarding-review", "/superadmin/public-leads"].includes(path)
    || !selected
  ) {
    return null;
  }

  const statusLabel = String(selected.statusLabel || selected.status || "").trim() || "Durum bilgisi yok";
  const typeLabel = String(selected.typeLabel || selected.type || "").trim() || "Başvuru";
  const sourceLabel = String(selected.sourceLabel || selected.source || "").trim() || "kaynak belirtilmedi";
  const reply = `Seçili başvurunun durumu: ${statusLabel}. Türü: ${typeLabel}. Kaynak: ${sourceLabel}. Bu yalnızca insan inceleme durumudur; davet, kullanıcı, ödeme veya sözleşme işlemi başlatmadım.`;
  return {
    ok: true,
    copilotVersion: "ROUND-10-SUPERADMIN-ONBOARDING-SELECTED-LEAD",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: "Seçili başvuru durumu",
    provider: "local-authorized-public-lead-review",
    providerSummary: "superadmin-onboarding-review-selected-lead-read",
    mode: "RULE_BASED",
    scope: {
      role: "SUPER_ADMIN",
      summary: "Yalnız ekranda seçilmiş ve yetkili başvurunun durum alanı okundu; iletişim veya başvuru ayrıntısı açıklanmadı.",
    },
    reply,
    summary: reply,
    contextSummary: "Başvuru İncelemesi ekranındaki seçili yetkili kayıt okundu.",
    questionType: "PUBLIC_LEAD_REVIEW_SELECTED_RECORD_STATUS",
    activeTopic: "PUBLIC_LEAD_REVIEW",
    assistantIntent: "PUBLIC_LEAD_REVIEW_SELECTED_RECORD_STATUS",
    authorizedDomainMap: ["PUBLIC_LEAD_REVIEW"],
    authorizedRecords: [{
      id: String(selected.id || ""),
      type: "public-lead",
      status: String(selected.status || "").trim().toUpperCase(),
    }],
    retrievedFacts: [
      { field: "status", value: String(selected.status || "").trim().toUpperCase() },
      { field: "statusLabel", value: statusLabel },
      { field: "type", value: String(selected.type || "").trim().toUpperCase() },
      { field: "source", value: String(selected.source || "").trim().toUpperCase() },
    ],
    responseSections: [{ title: "Seçili başvuru", body: reply }],
    dataSources: ["yetkili seçili Başvuru İncelemesi kaydı"],
    reasoning: "Süper Yönetici rolü, Başvuru İncelemesi yüzeyi ve seçili kayıt bağlamı doğrulandı; yalnız izin verilen durum ve tür alanları kullanıldı.",
    semanticPlan,
    conversationRoute: "CURRENT_SCREEN_CONTEXT",
    dialogueTopic: "PRODUCT",
    authorizedProductContext: { screenPath: path, screenLabel: screenContext?.label || "Başvuru İncelemesi" },
    readOnly: true,
    quickActions: [],
  };
}

export async function buildSuperAdminOnboardingReviewQueueResponse({ user, screenContext, message, semanticPlan = null } = {}) {
  const role = String(user?.role || "").trim().toUpperCase();
  const path = String(screenContext?.path || "").split("?")[0];
  const text = String(message || "").trim();
  const selectedLeadId = String(
    screenContext?.structuredFacts?.leadId
      || (String(screenContext?.selectedEntityType || "").trim().toLowerCase() === "public-lead" ? screenContext?.selectedEntityId : "")
      || "",
  ).trim();
  const selectedRecordQuestion = Boolean(selectedLeadId)
    && (
      /(?:seçili|bu başvuru|bu kayıt|bu demo)/iu.test(text)
      || (
        /(?:durum|inceleme|not)/iu.test(text)
        && !/(?:kuyruk|toplam|kaç|kaç tane|sayı|sayısı)/iu.test(text)
      )
    )
    && /(?:başvuru|kayıt|kayit|demo|inceleme|durum)/iu.test(text);
  const queueQuestion = /başvuru/iu.test(text)
    && /(?:kuyruk|kayıt|kayit|kaç|kaç tane|var mı|var mi|toplam|durum)/iu.test(text);
  if (role !== "SUPER_ADMIN" || !["/superadmin/onboarding-review", "/superadmin/public-leads"].includes(path) || (!queueQuestion && !selectedRecordQuestion)) {
    return null;
  }

  const queue = await listPublicLeadReviewQueue({ take: 200 });
  if (selectedRecordQuestion) {
    const selectedRecord = (Array.isArray(queue?.items) ? queue.items : [])
      .find((item) => String(item?.id || "") === selectedLeadId);
    return buildSuperAdminOnboardingReviewSelectedLeadResponse({
      user,
      screenContext,
      message,
      selectedRecord,
      semanticPlan,
    }) || {
      ok: true,
      copilotVersion: "ROUND-10-SUPERADMIN-ONBOARDING-SELECTED-LEAD",
      generatedAt: new Date().toISOString(),
      intent: "CHAT_HELP",
      intentLabel: "Seçili başvuru durumu",
      provider: "local-authorized-public-lead-review",
      providerSummary: "superadmin-onboarding-review-selected-lead-missing",
      mode: "RULE_BASED",
      scope: { role: "SUPER_ADMIN", summary: "Seçili başvuru yetkili kuyrukta bulunamadı; kayıt uydurulmadı." },
      reply: "Seçili başvuruyu yetkili kuyrukta bulamadım; durum uydurmadım. Listeyi yenileyip yetkili bir başvuru seçebilirsin.",
      summary: "Seçili başvuru yetkili kuyrukta bulunamadı; durum uydurulmadı.",
      contextSummary: "Seçili başvuru bağlamı doğrulanamadı.",
      questionType: "PUBLIC_LEAD_REVIEW_SELECTED_RECORD_NOT_FOUND",
      activeTopic: "PUBLIC_LEAD_REVIEW",
      assistantIntent: "PUBLIC_LEAD_REVIEW_SELECTED_RECORD_NOT_FOUND",
      authorizedDomainMap: ["PUBLIC_LEAD_REVIEW"],
      authorizedRecords: [],
      retrievedFacts: [],
      responseSections: [{ title: "Seçili başvuru", body: "Seçili başvuruyu yetkili kuyrukta bulamadım; durum uydurmadım." }],
      dataSources: ["yetkili Başvuru İncelemesi kuyruğu"],
      reasoning: "Seçili kayıt kimliği kuyruk readback ile doğrulanamadı; güvenli boş durum korundu.",
      semanticPlan,
      conversationRoute: "CURRENT_SCREEN_CONTEXT",
      dialogueTopic: "PRODUCT",
      authorizedProductContext: { screenPath: path, screenLabel: screenContext?.label || "Başvuru İncelemesi" },
      readOnly: true,
      quickActions: [],
    };
  }
  const total = Number(queue?.total || 0);
  const counts = queue?.counts && typeof queue.counts === "object" ? queue.counts : {};
  const pending = Number(counts.pendingCount || 0);
  const ready = Number(counts.inviteReadyCount || 0);
  const rejected = Number(counts.rejectedCount || 0);
  const reply = total === 0
    ? "Başvuru inceleme kuyruğu şu an boş. Toplam başvuru 0; incelenecek seçili kayıt yok. Bu soru için yeni başvuru oluşturmadım."
    : `Başvuru kuyruğunda toplam ${total} kayıt var. Bekleyen ${pending}, davet için uygun ${ready}, reddedilen ${rejected}. Ayrıntı görmek için listeden yetkili bir başvuru seçebilirsin.`;

  return {
    ok: true,
    copilotVersion: "ROUND-10-SUPERADMIN-ONBOARDING-QUEUE",
    generatedAt: new Date().toISOString(),
    intent: "CHAT_HELP",
    intentLabel: "Başvuru kuyruğu özeti",
    provider: "local-authorized-public-lead-review",
    providerSummary: "superadmin-onboarding-review-queue-read",
    mode: "RULE_BASED",
    scope: {
      role: "SUPER_ADMIN",
      summary: "Başvuru kuyruğunun yalnız toplam ve durum sayıları okundu; iletişim veya başvuru ayrıntısı açıklanmadı.",
    },
    reply,
    summary: reply,
    contextSummary: "Başvuru İncelemesi ekranındaki yetkili kuyruk sayısı okundu.",
    questionType: "PUBLIC_LEAD_REVIEW_QUEUE_SUMMARY",
    activeTopic: "PUBLIC_LEAD_REVIEW",
    assistantIntent: "PUBLIC_LEAD_REVIEW_QUEUE_SUMMARY",
    authorizedDomainMap: ["PUBLIC_LEAD_REVIEW"],
    authorizedRecords: [],
    retrievedFacts: [{ field: "total", value: total }, { field: "pending", value: pending }, { field: "inviteReady", value: ready }, { field: "rejected", value: rejected }],
    responseSections: [{ title: "Başvuru kuyruğu", body: reply }],
    dataSources: ["yetkili Başvuru İnceleme kuyruğu"],
    reasoning: "Süper Yönetici rolü ve Başvuru İncelemesi yüzeyi doğrulandı; yalnız aggregate kuyruk sayıları kullanıldı.",
    semanticPlan,
    conversationRoute: "CURRENT_SCREEN_CONTEXT",
    dialogueTopic: "PRODUCT",
    authorizedProductContext: { screenPath: path, screenLabel: screenContext?.label || "Başvuru İncelemesi" },
    readOnly: true,
    quickActions: [],
  };
}

function buildProductTeachingContinuationProjection({ message, semanticPlan, user = null, conversationState = null }) {
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

export function buildVisibleContextDiagnosticResponse({ user, entityType, entityId, screenContext, message, semanticPlan = null }) {
  if (!isCurrentSituationDiagnosticQuestion(message)) return null;
  const text = visibleContextText(screenContext);
  const normalized = text.toLocaleLowerCase("tr-TR");
  const liveSurfaceText = `${String(screenContext?.path || '')} ${text}`;
  const liveSurface = /\/map\b|\/live\b|\/room\/vehicles\b|\/driver\/(?:route|today|map)\b|canlı takip|canli takip|konum sinyali|tahmini süre|tahmini varış/i.test(liveSurfaceText);
  const selectedEntityType = String(screenContext?.selectedEntityType || '').trim().toLowerCase();
  const selectedStatusRows = [
    ...(Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : []),
    ...(Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges : []),
  ];
  const selectedRowValue = (pattern) => firstNonEmpty(
    selectedStatusRows.find((row) => pattern.test(normalizeVisibleKey(row?.label || row?.key || row?.title || '')))?.value,
    selectedStatusRows.find((row) => pattern.test(normalizeVisibleKey(row?.label || row?.key || row?.title || '')))?.text,
    '',
  );
  const selectedGpsStatus = firstNonEmpty(
    selectedRowValue(/gps|konum|durum/iu),
    screenContext?.structuredFacts?.gpsStatus,
  );
  const selectedLastGps = firstNonEmpty(
    selectedRowValue(/son\s+(?:gps|konum)/iu),
    screenContext?.structuredFacts?.gpsFreshness,
  );
  const selectedVehicleStatus = selectedEntityType === 'vehicle'
    && ['/room/vehicles', '/room/map'].includes(String(screenContext?.path || '').split('?')[0])
    && Boolean(selectedGpsStatus);
  const selectedGpsOffline = selectedVehicleStatus
    && /çevrim dışı|cevrim disi|offline|konum sinyali yok|sinyal yok/i.test(String(selectedGpsStatus));
  const selectedGpsStale = selectedVehicleStatus
    && /güncel değil|guncel degil|stale|eski/i.test(String(selectedGpsStatus));
  const gpsOffline = selectedVehicleStatus
    ? selectedGpsOffline
    : /çevrim dışı|cevrim disi|offline|konum sinyali yok|sinyal yok|gps.*(?:yok|çevrim dışı|cevrim disi)/i.test(text);
  const gpsStale = selectedVehicleStatus
    ? selectedGpsStale
    : /güncel değil|guncel degil|stale|gps.*(?:eski|gecik)/i.test(text);
  const driverPhoneGpsQuestion = /sürücünün\s+telefon\s+gps['’]?i\s+devrede\s+m[ıi]/iu.test(String(message || ''));
  const etaUnavailable = /tahmini süre[^•]{0,80}(hesaplanamıyor|hesaplanmiyor|yok|görünmüyor|gorunmuyor)|eta[^•]{0,80}(hesaplanamıyor|hesaplanmiyor|yok|güvenilir değil|guvenilir degil)/i.test(text)
    || (/eta yok|tahmini süre yok/i.test(normalized));
  if (!liveSurface || (!gpsOffline && !gpsStale && !etaUnavailable)) return null;
  // The visible-context adapter must not replace an already-resolved
  // canonical ISSUE_DIAGNOSTIC request with its legacy ROOT_CAUSE label. Keep
  // the old label only for callers that do not provide a canonical plan.
  const canonicalIssueDiagnostic = semanticPlan?.family === 'ISSUE_DIAGNOSTIC'
    || semanticPlan?.canonicalRequest?.operation === 'DIAGNOSE_CURRENT_ISSUE'
    || semanticPlan?.canonicalRequest?.request?.operation === 'DIAGNOSE_CURRENT_ISSUE';
  const publicDiagnosticType = canonicalIssueDiagnostic ? 'ISSUE_DIAGNOSTIC' : 'ROOT_CAUSE';
  const selected = screenContext?.selectedLabel || screenContext?.selectedRecordLabel || "seçili kayıt";
  const parts = [];
  if (driverPhoneGpsQuestion) {
    parts.push("Bu ekranda sürücü telefonundan gelen konum sinyali için ayrı, doğrulanmış bir kanıt görünmüyor; görünen yetkili durum araç konum sinyalinin çevrim dışı olduğunu gösteriyor.");
  } else if (gpsOffline) parts.push("Konum/GPS sinyali çevrim dışı; araçtan güncel konum alınamıyor.");
  else if (gpsStale) parts.push(`Konum/GPS sinyali güncel değil${selectedLastGps && selectedLastGps !== '-' ? `; son yetkili GPS kaydı ${selectedLastGps}` : ''}.`);
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
    questionType: publicDiagnosticType,
    activeTopic: publicDiagnosticType,
    assistantIntent: publicDiagnosticType,
    dataSources: ["seçili canlı araç bağlamı", "vardiya kaydı", "konum/GPS sinyali", "tahmini süre durumu"],
    retrievedFacts: [
      gpsOffline ? "Konum/GPS sinyali çevrim dışı" : gpsStale ? "Konum/GPS sinyali güncel değil" : "Konum sinyalinde eksik veri",
      gpsOffline ? "Araçtan güncel konum alınamıyor" : gpsStale ? "Son yetkili GPS kaydı mevcut, ancak güncel değil" : "Araçtan güncel konum doğrulanamıyor",
      etaUnavailable ? "Tahmini süre hesaplanamıyor" : "Tahmini süre doğrulanamıyor",
    ],
    reasoning: driverPhoneGpsQuestion
      ? "Sürücü telefonundan gelen konum verisinin kişiye özgü ham telemetrisi paylaşılmadı; yalnızca ekranda doğrulanmış araç konum sinyali kullanıldı."
      : "Tahmini süre güncel konum sinyaline bağlıdır; sinyal alınamadığında süre güvenilir biçimde hesaplanamaz.",
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

export function buildRoomSelectedAgreementNextActionResponse({ user, entityType, entityId, screenContext, semanticPlan }) {
  if (String(user?.role || '').toUpperCase() !== 'ROOM') return null;
  const path = String(screenContext?.path || '').split('?')[0];
  if (!['/room/agreements', '/room/commercial-flow'].includes(path)) return null;
  if (semanticPlan?.family !== 'UI_GUIDANCE' || semanticPlan?.typedRequest?.taskType !== 'NEXT_ACTION') return null;
  const selectedType = String(screenContext?.selectedEntityType || '').trim().toLowerCase();
  const selectedId = Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) || 0;
  if (selectedType !== 'agreement' || selectedId <= 0) return null;
  const visibleButtons = Array.isArray(screenContext?.uiHints?.visibleButtons)
    ? screenContext.uiHints.visibleButtons
    : [];
  const selectedRecordTarget = visibleButtons.find((button) => {
    const targetKey = String(button?.targetKey || '').trim().toLowerCase();
    return targetKey.includes(`agreement:${selectedId}`) && button?.targetKey;
  });
  const target = selectedRecordTarget || visibleButtons.find((button) => {
    const label = String(button?.label || '').trim();
    return /detay|köprü|kopru|rota|önizleme|onizleme/iu.test(label)
      && button?.targetKey;
  }) || null;
  const selection = `Sözleşme #${selectedId}`;
  const targetLabel = String(target?.label || '').trim();
  const reply = target
    ? `${selection} seçili. Ekranda bu kayda bağlı “${targetLabel}” hedefi görünür; önce onu açıp sözleşme köprüsündeki yetkili vardiya/rota ayrıntısını kontrol et. Bu yanıt yalnızca mevcut salt-okunur hedefi gösterir; kayıt veya sözleşme işlemi başlatmıyorum.`
    : `${selection} seçili, ancak bu turda seçili kayda bağlı görünür bir sonraki hedef doğrulanamadı. Yeni kayıt veya yetki varsaymadan ekrandaki sözleşme ayrıntısını açmanı bekliyorum.`;
  return {
    ok: true,
    copilotVersion: 'ROOM-SELECTED-AGREEMENT-NEXT-ACTION',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Seçili sözleşme sonraki adımı',
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || 'Sözleşmeler',
    provider: 'local-room-selected-record-guidance',
    providerSummary: 'selected-agreement-visible-target',
    mode: 'RULE_BASED',
    scope: {
      role: String(user?.role || ''),
      companyKind: String(user?.companyKind || ''),
      roomId: user?.roomId ?? null,
      summary: 'Yalnızca seçili ROOM sözleşmesi ve aynı turdaki görünür hedef kullanıldı.',
    },
    reply,
    summary: reply,
    contextSummary: `${selection} ve görünür sonraki hedef bağlamı kullanıldı.`,
    questionType: 'NEXT_ACTION',
    activeTopic: 'SELECTED_AGREEMENT_NEXT_ACTION',
    assistantIntent: 'SELECTED_AGREEMENT_NEXT_ACTION',
    authorizedRecords: [{ type: 'agreement', id: selectedId }],
    retrievedFacts: target ? [`${selection}: ${targetLabel}`] : [`${selection}: görünür hedef doğrulanamadı`],
    responseSections: [{ title: 'Sıradaki doğru işlem', body: reply }],
    dataSources: ['yetkili seçili sözleşme bağlamı', 'canlı görünür UI hedefleri'],
    guidedTarget: target ? {
      status: 'FOUND',
      targetKey: target.targetKey,
      label: targetLabel,
      semanticId: target.semanticId || null,
      screenPath: path,
      identitySource: target.identitySource || 'LIVE_UI',
    } : { status: 'NOT_FOUND', targetKey: null, screenPath: path },
    roleBoundary: 'Yalnızca mevcut ROOM tenant ve seçili sözleşme bağlamı kullanıldı; işlem başlatılmadı.',
    readOnly: true,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    quickActions: [],
  };
}

function buildRoomAgreementOperationBridgeResponse({ user, screenContext, semanticPlan, guidedTarget }) {
  if (String(user?.role || '').toUpperCase() !== 'ROOM') return null;
  if (semanticPlan?.agreementOperationBridgeIntent !== true) return null;
  if (guidedTarget?.status !== GUIDED_TARGET_STATUSES.FOUND) return null;
  const path = String(screenContext?.path || '').split('?')[0];
  if (path !== '/room/agreements') return null;
  const selectedId = Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) || 0;
  if (String(screenContext?.selectedEntityType || '').trim().toLowerCase() !== 'agreement' || selectedId <= 0) return null;
  const expectedTargetKey = `room:agreements:agreement:${selectedId}:operation-bridge`;
  if (String(guidedTarget.targetKey || '').trim() !== expectedTargetKey) return null;
  const targetLabel = String(guidedTarget.label || 'Detayı aç').trim();
  const reply = `Sözleşme #${selectedId} için Operasyon Köprüsü hedefi doğrulandı: “${targetLabel}”. Bu hedefi açarak sözleşmeye bağlı vardiya ve rota ayrıntılarını inceleyebilirsin; yalnızca salt-okunur görünürlük sağlıyorum, işlem başlatmıyorum.`;
  return {
    reply,
    summary: reply,
    nextAction: `“${targetLabel}” hedefini aç.` ,
    safeNextStep: `“${targetLabel}” hedefini aç.`,
    activeTopic: 'SELECTED_AGREEMENT_OPERATION_BRIDGE',
    assistantIntent: 'AGREEMENT_OPERATION_BRIDGE',
    questionType: 'SCREEN_CONTEXT',
    authorizedRecords: [{ type: 'agreement', id: selectedId }],
    retrievedFacts: [`Sözleşme #${selectedId}: Operasyon Köprüsü hedefi doğrulandı`],
    responseSections: [{ title: 'Operasyon Köprüsü', body: reply }],
    dataSources: ['yetkili seçili sözleşme bağlamı', 'canlı canonical Operasyon Köprüsü hedefi'],
    roleBoundary: 'Yalnızca mevcut ROOM tenant ve seçili sözleşme bağlamı kullanıldı; işlem başlatılmadı.',
    readOnly: true,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

export async function buildSelectedAgreementOperationStatusResponse({ user, screenContext, message } = {}) {
  const role = String(user?.role || '').toUpperCase();
  if (!['COMPANY', 'ROOM'].includes(role)) return null;
  const path = String(screenContext?.path || '').split('?')[0];
  if (!['/company/agreements', '/room/agreements', '/company/commercial-flow', '/room/commercial-flow'].includes(path)) return null;

  const text = String(message || '').toLocaleLowerCase('tr-TR');
  const asksOperationStatus = /(?:operasyon|vardiya|sefer|üret(?:ildi|ildi)|oluş(?:tu|muş)|bağlı)/iu.test(text)
    && /(?:kaydı|kayıt|vardiya|operasyon|sefer|bağlı)/iu.test(text)
    && /(?:var\s*mı|oluştu\s*mu|oluşmuş\s*mu|mevcut\s*mu|üretildi\s*mi|üretildi|kaç|hangi|durumu\s*nedir|durum\s*ne)/iu.test(text);
  if (!asksOperationStatus) return null;

  const selectedType = String(screenContext?.selectedEntityType || '').trim().toLowerCase();
  const selectedId = Number(
    screenContext?.selectedEntityId
      || screenContext?.selectedRecordId
      || 0,
  ) || 0;
  if (selectedType !== 'agreement' || selectedId <= 0) return null;

  const scopeId = Number(role === 'COMPANY'
    ? (user?.companyId ?? screenContext?.companyId)
    : (user?.roomId ?? screenContext?.roomId)) || 0;
  if (scopeId <= 0) return null;

  const agreement = await prisma.agreement.findFirst({
    where: {
      id: selectedId,
      ...(role === 'COMPANY' ? { companyId: scopeId } : { roomId: scopeId }),
    },
    select: {
      id: true,
      status: true,
      shifts: {
        orderBy: { startAt: 'asc' },
        select: { id: true, status: true, startAt: true, endAt: true },
      },
    },
  });

  if (!agreement) {
    const reply = `Sözleşme #${selectedId} için operasyon durumunu bu ${role === 'COMPANY' ? 'firma' : 'taşımacılık firması'} oturumunun yetkili kapsamında doğrulayamıyorum.`;
    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Sözleşme operasyon durumu',
      provider: 'local-authorized-agreement-operation-status',
      providerSummary: 'authorized-agreement-operation-status-boundary',
      mode: 'RULE_BASED',
      scope: { role, companyId: user?.companyId ?? null, roomId: user?.roomId ?? null, summary: 'Seçili sözleşmenin operasyon durumu tenant sınırı içinde doğrulanamadı.' },
      reply,
      summary: reply,
      contextSummary: `Sözleşme #${selectedId} operasyon durumu yetki sınırında doğrulanamadı.`,
      questionType: 'STATUS_HELP',
      activeTopic: 'SELECTED_AGREEMENT_OPERATION_STATUS',
      assistantIntent: 'STATUS_HELP',
      authorizedRecords: [],
      retrievedFacts: [],
      responseSections: [{ title: 'Yetki sınırı', body: reply }],
      dataSources: ['canonical Agreement tenant scope'],
      roleBoundary: 'Başka şirket veya ROOM sözleşmesi açıklanmadı.',
      readOnly: true,
      safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
      quickActions: [],
    };
  }

  const shifts = Array.isArray(agreement.shifts) ? agreement.shifts : [];
  const statusLabel = {
    REQUESTED: 'Talep edildi',
    ACTIVE: 'Aktif',
    APPROVED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal edildi',
  }[String(agreement.status || '').toUpperCase()] || String(agreement.status || 'Bilinmiyor');
  const operationText = shifts.length
    ? `Seçili Sözleşme #${agreement.id} ${statusLabel} durumda ve ${shifts.length} bağlı operasyon vardiyası kaydı var: ${shifts.map((shift) => `Vardiya #${shift.id} (${String(shift.status || 'Bilinmiyor')})`).join(', ')}.`
    : `Seçili Sözleşme #${agreement.id} ${statusLabel} durumda; bağlı operasyon vardiyası kaydı yok. Bu nedenle GPS, biniş veya gerçekleşmiş hizmet kanıtı oluşmuş sayılmıyor.`;
  const reply = `${operationText} Bu yanıt yalnızca mevcut yetkili sözleşme ve bağlı vardiya kayıtlarını okur; yeni işlem başlatmıyorum.`;
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Sözleşme operasyon durumu',
    provider: 'local-authorized-agreement-operation-status',
    providerSummary: 'authorized-agreement-operation-status-v1',
    mode: 'RULE_BASED',
    scope: { role, companyId: user?.companyId ?? null, roomId: user?.roomId ?? null, summary: 'Yalnızca seçili sözleşme ve aynı tenant içindeki bağlı vardiyalar okundu.' },
    reply,
    summary: reply,
    contextSummary: `Sözleşme #${agreement.id} • ${statusLabel} • bağlı operasyon vardiyası: ${shifts.length}`,
    questionType: 'STATUS_HELP',
    activeTopic: 'SELECTED_AGREEMENT_OPERATION_STATUS',
    assistantIntent: 'STATUS_HELP',
    authorizedRecords: [{ type: 'agreement', id: agreement.id }, ...shifts.map((shift) => ({ type: 'shift', id: shift.id }))],
    retrievedFacts: [
      { label: 'Sözleşme durumu', value: statusLabel },
      { label: 'Bağlı operasyon vardiyası', value: shifts.length },
      ...shifts.map((shift) => ({ label: `Vardiya #${shift.id}`, value: String(shift.status || 'Bilinmiyor') })),
    ],
    responseSections: [{ title: 'Seçili sözleşme', body: reply }],
    dataSources: ['canonical Agreement kaydı', 'canonical Agreement.shifts ilişkisi'],
    roleBoundary: 'Yalnızca mevcut COMPANY veya ROOM tenant kapsamındaki seçili sözleşme açıklandı; token, GPS, biniş veya finansal sonuç açıklanmadı.',
    readOnly: true,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    quickActions: [],
  };
}

function buildOperationHealthHintDiagnosticResponse({ user, entityType, entityId, screenContext, message }) {
  if (String(user?.role || '').toUpperCase() !== 'ROOM') return null;
  if (String(screenContext?.path || '') !== '/room/operation-health') return null;
  const text = String(message || '').trim();
  const titleMatch = text.match(/(?:başlık|baslik)\s*:\s*(.*?)\.\s*(?:detay|detail)\s*:/iu);
  const detailMatch = text.match(/(?:detay|detail)\s*:\s*(.*?)(?:\.\s*(?:bunun|bu)\b|$)/iu);
  const explainCue = /(?:ne\s+anlama\s+geliyor|ne\s+anlama\s+geldiğini|acikla|açıkla|anlat|anlami|anlamı)/iu.test(text);
  if (!titleMatch || !detailMatch || !explainCue) return null;
  const title = String(titleMatch[1] || '').trim();
  const detail = String(detailMatch[1] || '').trim();
  if (!title || !detail) return null;
  const normalizedDetail = detail.toLocaleLowerCase('tr-TR');
  const liveSignalIssue = /gps|konum|stale|offline|çevrim dışı|cevrim disi|güncel değil|guncel degil|canlılık|canlilik/.test(normalizedDetail);
  const explanation = liveSignalIssue
    ? 'Bu, bazı sürücü veya araç canlılık/GPS sinyallerinin güncel olmadığını gösterir; tek başına rota ya da atama değişikliği anlamına gelmez.'
    : 'Bu, Operasyon Sağlığı ekranında doğrulanmış bir uyarı bulunduğunu gösterir; ekrandaki kaydı değiştirmeden önce ilgili satırın kanıtını kontrol etmek gerekir.';
  const nextStep = 'Sürücü & Sorunlar sekmesinde ilgili satırın son GPS, izin ve oturum bilgilerini kontrol et; güncel kanıt gelmeden iş verisini değiştirmiyorum.';
  const reply = `${title}: ${detail} ${explanation} Güvenli sonraki adım: ${nextStep}`;
  return {
    ok: true,
    copilotVersion: 'ROUND-18-OPERATION-HEALTH-VISIBLE-HINT',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Operasyon sağlığı açıklaması',
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || 'Operasyon Sağlığı',
    provider: 'local-visible-operation-health-hint',
    providerSummary: 'visible-operation-health-warning-context',
    mode: 'RULE_BASED',
    scope: {
      role: String(user?.role || ''),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: 'Yalnızca yetkili Operasyon Sağlığı ekranında görünen uyarı kullanıldı.',
    },
    reply,
    summary: reply,
    contextSummary: `${title} • ${detail}`,
    questionType: 'CURRENT_SITUATION_DIAGNOSTIC',
    activeTopic: 'CURRENT_SITUATION_DIAGNOSTIC',
    assistantIntent: 'CURRENT_SITUATION_DIAGNOSTIC',
    authorizedRecords: [],
    retrievedFacts: [title, detail],
    dataSources: ['yetkili Operasyon Sağlığı ekranı görünür uyarısı'],
    reasoning: 'Görünür uyarının başlık ve detay alanları, genel operasyon metriği sorgusuna çevrilmeden açıklama bağlamı olarak korundu.',
    safeNextStep: nextStep,
    responseSections: [
      { title: 'Gördüğüm uyarı', body: `${title}: ${detail}` },
      { title: 'Şimdi ne yapmalıyım?', body: nextStep },
    ],
    followUpPrompt: 'İstersen bu uyarının hangi satırdan geldiğini açabilirim.',
    readOnly: true,
    quickActions: [],
  };
}

async function buildRoomFinancialScreenRiskResponse({ user, entityType, entityId, screenContext, message, semanticPlan, conversationState }) {
  if (String(user?.role || '').toUpperCase() !== 'ROOM') return null;
  if (String(semanticPlan?.family || '') !== 'RISK_RANKING') return null;
  const financialSummaryIntent = isRoomFinancialScreenSummaryIntent({ semanticPlan, screenContext, message });
  if (String(screenContext?.path || '') !== '/room/financial-operations' && !financialSummaryIntent) return null;
  if (hasSelectedFinancialMetricQuestion({ message, screenContext })) return null;
  // A selected financial metric is owned by the canonical cost-analysis
  // composer, even when the typed request uses RISK as its read-only
  // analytical task. The screen-risk boundary only owns an unselected,
  // metric-free risk request; it must not consume a source/provenance
  // follow-up before the metric-specific evidence route can run.
  if (hasCanonicalFinancialMetricIdentity(semanticPlan)) return null;
  const hasSelectedRecord = !financialSummaryIntent && (
    Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) > 0
    || (Array.isArray(semanticPlan?.entities) && semanticPlan.entities.length > 0)
  );
  if (hasSelectedRecord) return null;

  const scopedPlan = {
    ...semanticPlan,
    family: 'RISK_RANKING',
    planStatus: 'READY',
    scopeTarget: 'CURRENT_SCREEN',
    requestedDomains: ['FINANCE'],
    canonicalRequest: {
      ...(semanticPlan.canonicalRequest || {}),
      operation: 'ASSESS_CURRENT_RISK',
      domain: 'FINANCE',
      capability: 'RISK',
    },
    entities: [],
  };
  const authorizedFinance = await buildAuthorizedProductAwarenessAnswer({
    user,
    message,
    screenContext,
    conversationState,
    semanticPlan: scopedPlan,
  });
  if (!authorizedFinance || authorizedFinance.authorizationBoundary) return null;
  const facts = Array.isArray(authorizedFinance.retrievedFacts)
    ? authorizedFinance.retrievedFacts.filter(Boolean).slice(0, 8)
    : [];
  const evidence = facts.length
    ? `Yetkili finansal kayıtlarda görünen kanıt: ${facts.join(' ')}`
    : 'Yetkili güncel hakediş veya fatura kaydında sıralanabilir ek bir risk kanıtı görünmüyor.';
  const reply = `Finansal Operasyonlar ekranındaki riskleri yalnızca bu ekranın yetkili finans bağlamında değerlendiriyorum. ${evidence} Bu sonuçta vardiya rota maliyetini finansal risk yerine koymuyorum. Ödeme, fatura veya muhasebe işlemi başlatmıyorum; eksik veri varsa ekranın ilgili finansal detayını doğrulamak gerekir.`;
  return {
    ok: true,
    copilotVersion: 'ROUND-18-FINANCIAL-SCREEN-RISK',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Finansal ekran risk açıklaması',
    entityType,
    entityId: Number(entityId),
    entityLabel: screenContext?.label || 'Finansal Operasyonlar',
    provider: 'local-authorized-financial-screen-risk',
    providerSummary: 'current-financial-screen-risk-boundary',
    mode: 'RULE_BASED',
    scope: {
      role: String(user?.role || ''),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: financialSummaryIntent
        ? 'ROOM ana sayfası finans özeti, yalnızca yetkili Hakediş/mutabakat kayıtlarıyla değerlendirildi.'
        : 'Yalnızca yetkili Finansal Operasyonlar ekranı ve finans kayıtları kullanıldı.',
    },
    reply,
    summary: reply,
    contextSummary: financialSummaryIntent
      ? 'ROOM ana sayfası • Hakediş/mutabakat risk özeti'
      : 'Finansal Operasyonlar ekranı • seçili kayıt yok',
    questionType: 'CURRENT_SCREEN_RISK',
    activeTopic: 'FINANCE',
    assistantIntent: 'CURRENT_SCREEN_RISK',
    authorizedRecords: Array.isArray(authorizedFinance.authorizedRecords) ? authorizedFinance.authorizedRecords : [],
    retrievedFacts: facts,
    dataSources: ['yetkili ROOM finans kayıtları', 'mevcut Finansal Operasyonlar ekranı'],
    reasoning: 'Finansal ekran kapsamı, genel vardiya rota maliyeti karşılaştırmasından önce terminal bir ekran-scoped owner olarak korundu.',
    safeNextStep: 'Finansal detayları ve eksik veri uyarısını kontrol et; ödeme veya muhasebe işlemi başlatma.',
    responseSections: [
      { title: 'Finansal risk kapsamı', body: evidence },
      { title: 'Güvenli sonraki adım', body: 'Finansal detayları ve eksik veri uyarısını kontrol et; ödeme veya muhasebe işlemi başlatma.' },
    ],
    followUpPrompt: 'İstersen bu ekrandaki finansal detayın kaynağını açıklayabilirim.',
    semanticPlan: scopedPlan,
    readOnly: true,
    quickActions: financialSummaryIntent
      ? [{ actionKind: 'OPEN_ROUTE', label: 'Hakediş ve mutabakat görünümünü aç', path: '/room/commercial-flow?tab=settlement', safeNavigation: true, criticalActionExecution: false }]
      : [],
  };
}

export function isRoomFinancialVehicleRiskIntent({ user, screenContext, message, semanticPlan }) {
  return String(user?.role || '').toUpperCase() === 'ROOM'
    && String(screenContext?.path || '').split('?')[0] === '/room/financial-operations'
    && String(screenContext?.structuredFacts?.financeView || screenContext?.structuredFacts?.activeTab || '').trim().toLowerCase() === 'vehicle-comparison'
    && /(?:riskleri|riskleri\s+sirala|risk|tehlike)/iu.test(String(message || ''))
    && semanticPlan?.authorizationDecision?.status === 'ALLOW';
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

function buildCanonicalAuthorizationBoundaryResponse({ user, screenContext, semanticPlan, authorizationDecision }) {
  const reason = String(authorizationDecision?.reason || '').toUpperCase();
  const explicitBoundary = semanticPlan?.conversationRoute === 'AUTHORIZATION_NEGATIVE'
    && semanticPlan?.routingReason === 'EXPLICIT_AUTHORIZATION_BOUNDARY_LANGUAGE';
  if (!explicitBoundary && String(authorizationDecision?.status || '').toUpperCase() !== 'DENY') return null;
  if (!explicitBoundary && ![
    'TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL',
    'RECORD_SCOPE_DENIED_BEFORE_RETRIEVAL',
    'DOMAIN_CAPABILITY_DENIED',
  ].includes(reason)) return null;
  const reply = explicitBoundary
    ? "Yetki veya KVKK sınırını aşan kayıtları açamam. Yalnızca mevcut oturumda açıkça yetkili ve KVKK'ya uygun kayıtları açıklayabilirim."
    : authorizationBoundaryReply({
      deniedDomains: Array.isArray(authorizationDecision?.deniedDomains)
        ? authorizationDecision.deniedDomains
        : [],
    });
  const boundaryPlan = {
    ...semanticPlan,
    family: 'AUTHORIZATION_BOUNDARY',
    intentFamily: 'AUTHORIZATION_BOUNDARY',
    planStatus: 'UNAUTHORIZED',
    conversationRoute: 'AUTHORIZATION_NEGATIVE',
    dialogueTopic: 'PRODUCT_AUTHORIZATION',
    retrieveProductData: false,
    authorizationDecision,
  };
  return {
    ok: true,
    copilotVersion: 'ROUND-18-CANONICAL-AUTHORIZATION-BOUNDARY',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Yetki sınırı',
    entityType: 'screen',
    entityId: 0,
    entityLabel: screenContext?.label || 'Sefer Abi',
    provider: 'canonical-authorization-gate',
    providerSummary: reason,
    mode: 'RULE_BASED',
    scope: {
      role: String(user?.role || ''),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: 'Korunan kayıtlar yetki sınırında okunmadı; seçili kayda fallback yapılmadı.',
    },
    reply,
    summary: reply,
    contextSummary: 'İstenen kayıt kapsamı mevcut oturumda doğrulanamadı.',
    questionType: 'AUTHORIZATION_BOUNDARY',
    activeTopic: 'AUTHORIZATION_BOUNDARY',
    assistantIntent: 'AUTHORIZATION_BOUNDARY',
    authorizedRecords: [],
    retrievedFacts: ['Korunan kayıt okunmadı'],
    dataSources: ['canonical rol/tenant yetki sınırı'],
    responseSections: [{ title: 'Yetki sınırı', body: reply }],
    reasoning: 'Yetki kararı veri erişiminden önce terminal olarak uygulandı; seçili kayıt veya başka tenant verisi kullanılmadı.',
    roleBoundary: reply,
    safeNextStep: 'Yalnızca mevcut oturumda görünen yetkili bir kayıt veya ekran üzerinden devam edebilirsin.',
    followUpPrompt: 'Yetkili bir kayıt veya ekran adı verirsen onu açıklayabilirim.',
    semanticPlan: boundaryPlan,
    conversationRoute: 'AUTHORIZATION_NEGATIVE',
    dialogueTopic: 'PRODUCT_AUTHORIZATION',
    authorizedProductContext: null,
    guidedTarget: { status: GUIDED_TARGET_STATUSES.UNAUTHORIZED, targetKey: null, screenPath: screenContext?.path || null },
    readOnly: true,
    quickActions: [],
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

export function isParentCrossChildQuestion(message = '') {
  const text = String(message || '').toLocaleLowerCase('tr-TR');
  return /(?:başka|baska|diğer|diger|başkasının|baskasinin)\s+(?:bir\s+)?(?:çocu\p{L}*|cocu\p{L}*|öğrenc\p{L}*|ogrenc\p{L}*|veli\p{L}*|aile\p{L}*|kiş\p{L}*|kis\p{L}*)/iu.test(text)
    || /(?:çocukların|cocuklarin|öğrencilerin|ogrencilerin|velilerin|ailelerin)/iu.test(text);
}

function buildCrossChildBoundaryResponse({ user, entityType, entityId, screenContext, message }) {
  const role = String(user?.role || "").toUpperCase();
  if (role !== "PARENT" || !isParentCrossChildQuestion(message)) return null;
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

function buildProductAwarenessResponse({ awareness, user, entityType, entityId, screenContext, message = '' }) {
  if (!awareness) return null;
  const parentLiveNoVehicleReply = String(user?.role || '').trim().toUpperCase() === 'PARENT'
    && String(screenContext?.path || '').includes('/parent/live')
    && !isParentCrossChildQuestion(message)
    ? buildParentLiveNoVehicleReply({
      screenContext,
      screenPath: screenContext?.path || '',
      message,
    })
    : '';
  const effectiveAwareness = parentLiveNoVehicleReply && !/canlı araç görünmüyor/i.test(parentLiveNoVehicleReply)
    ? { ...awareness, reply: parentLiveNoVehicleReply }
    : awareness;
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
    reply: effectiveAwareness.reply,
    summary: effectiveAwareness.reply,
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
      { title: "Özet", body: effectiveAwareness.reply },
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
        ...(awareness.navigationTarget.routeParams
          ? { routeParams: awareness.navigationTarget.routeParams }
          : requestedOfferId
            ? { routeParams: { offerId: Math.trunc(Number(requestedOfferId)) } }
            : {}),
        safeNavigation: true,
        criticalActionExecution: false,
      }]
      : [],
    followUpPrompt: continuationComplete ? "" : "Devamını anlat",
  };
}

export function applyRequestedStyleToAnswer(answer) {
  const style = answer?.semanticPlan?.requestedStyle;
  const source = String(answer?.reply || "").trim();
  // The authorized awareness layer may already have transformed the settled
  // answer.  Style is presentation-only and must be idempotent at the final
  // response boundary; otherwise the same prefix/content is applied twice.
  if (!style || !source || answer?.styleApplied === style) return answer;
  const preservesMetricContract = answer?.semanticPlan?.operationHealthMetricIntent === true
    || answer?.semanticPlan?.typedRequest?.operationHealthMetricIntent === true;
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
  if (["SHORT_SUMMARY", "SINGLE_SENTENCE", "RESULT_ONLY", "SHORTEN"].includes(style)) {
    // A metric request may ask for a summary, but its typed contract still
    // requires the distinct operation-health projections to remain visible.
    // Do not collapse the answer to the first open-issue sentence and lose
    // the requested risky-device / stale-offline evidence.
    reply = preservesMetricContract ? source : sentenceLimited;
  }
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

export function isCompanyBudgetDraftEvidenceFollowUp({ user = null, screenContext = null, message = "" } = {}) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : {};
  const normalized = normalizeVisibleKey(message);
  const evidenceQuestion = /(?:gerçekleşen\s+harcama|gerceklesen\s+harcama|hakediş|hakedis|fatura|ödeme|odeme)/u.test(normalized)
    && /(?:var\s+(?:mi|mı|mu|mü)|durumu|doğrulandı|dogrulandi|göster|goster|ne\s+durumda)/u.test(normalized);
  const planId = Number(facts.selectedBudgetPlanId || facts.budgetPlanId || 0);
  return String(user?.role || "").toUpperCase() === "COMPANY"
    && String(screenContext?.path || "").split("?")[0] === "/company/financial-operations"
    && Number.isSafeInteger(planId)
    && planId > 0
    && String(facts.budgetStatus || "").toUpperCase() === "DRAFT"
    && evidenceQuestion;
}

// The live-target postprocessor may provide a recovery sentence for genuine
// failure reports such as “Bulamadım”.  A user asking how to fill the active
// field already has a more specific, field-aware answer from the canonical
// target composer; do not overwrite that answer with the generic recovery
// sentence.
export function shouldUseCurrentTargetRecoveryFallback({ message = '', semanticPlan = null } = {}) {
  if (semanticPlan?.currentTargetRecoveryIntent !== true) return false;
  return !isCurrentTargetFieldFillQuestion(message);
}

function isCurrentTargetFieldFillQuestion(message = '') {
  const normalizedMessage = String(message || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR');
  return /\b(?:bu|şu|su|buradaki)\s+alan[ıi]\s+(?:nasıl|nasil)\s+doldur/iu.test(normalizedMessage);
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
  const continuationAction = String(
    semanticPlan?.typedRequest?.continuationAction
      || semanticPlan?.continuationAction
      || '',
  ).toUpperCase();
  const requestedOrdinal = Number(
    semanticPlan?.workflowStepReference?.ordinal
      || semanticPlan?.workflowStepOrdinal
      || semanticPlan?.continuationBasePlan?.workflowStepReference?.ordinal
      || conversationState?.activeGuidedTask?.semanticPlan?.workflowStepReference?.ordinal
      || 1,
  ) || 1;
  const actualOrdinal = Number(semanticPlan?.workflowActualUiState?.activeStepOrdinal || 0) || 0;
  const projectedAheadOfLiveUi = actualOrdinal > 0 && requestedOrdinal > actualOrdinal;
  const ordinal = ['BACK', 'PREVIOUS', 'GERI', 'RECOVER'].includes(continuationAction) && projectedAheadOfLiveUi
    ? actualOrdinal
    : requestedOrdinal;
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
    const workflowCapabilityIntent = String(semanticPlan?.workflowCapabilityIntent || '').toUpperCase();
    const capabilityEntryHint = workflowCapabilityIntent === 'IMPORT_PERSONNEL'
      ? 'Excel/CSV içe aktarma, rehber açıldıktan sonra 3. adım olan Personel + Durak bölümündeki yetkili kontrolden yapılır; dosya seçme veya içe aktarma işlemini senin yerine başlatmıyorum.'
      : workflowCapabilityIntent === 'ADD_PERSONNEL'
        ? 'Personel ekleme, rehber açıldıktan sonra 3. adım olan Personel + Durak bölümündeki yetkili alanlardan yapılır; kayıt eklemeyi senin yerine başlatmıyorum.'
        : '';
    const hasKnownDraftChooser = nextState === "SAVED_DRAFT_CHOOSER" && Number(draftAvailability?.count || 0) > 0;
    const nextStateLine = hasKnownDraftChooser
      ? `Bu düğmeye bastıktan sonra önce kayıtlı taslak seçimi açılır; ${Number(draftAvailability.count)} uygun taslak bulundu. Devam et mevcut taslağı kanıtlanan güvenli adımından sürdürür, Yeni plan eski taslakları koruyarak başlangıç akışını açar.`
      : nextState === "NEW_PLAN_STEP_1"
        ? `Bu düğmeye bastıktan sonra kayıtlı taslak seçimi yok; yeni akışın ilk adımı “${nextLabel}” olur.`
        : `Bu düğmeye bastıktan sonra uygun kayıtlı taslak varsa önce seçim ekranı, yoksa yeni akışın ilk adımı “${nextLabel}” görünür.`;
    const recovery = semanticPlan?.continuationAction === "RECOVER"
      ? ` Bu hedefte takıldığını anlıyorum. “${targetLabel}” düğmesine yeniden dokun; açılmazsa düğmenin görünür ve etkin durumunu birlikte kontrol edelim. Akış açılmadan sonraki adıma geçtiğini varsaymıyorum.`
      : "";
    const reply = `Yeni vardiya planını bu ekrandan başlatabilirsin. Rehberli akış şu anda açık değil; mevcut güvenli hedef “${targetLabel}”. ${nextStateLine} ${nextLabel} adımının kontrolleri, akış gerçekten açıldıktan sonra görünür ve o zaman mevcut adım olarak açıklanır. ${capabilityEntryHint}${recovery} Sefer Abi yalnızca görünür hedefi gösterir; iş kaydı oluşturmaz veya ilerletmez.`;
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
  const actualUiState = semanticPlan?.workflowActualUiState
    || screenContext?.uiHints?.workflowState
    || null;
  const actualUiStepOrdinal = Number(actualUiState?.activeStepOrdinal || 0) || 0;
  const actualUiStep = actualUiStepOrdinal > 0
    ? (model.steps || []).find((item) => Number(item?.ordinal || 0) === actualUiStepOrdinal)
    : null;
  const capabilityAheadOfLiveStep = Boolean(
    actualUiStep
      && Number(step.ordinal || 0) > actualUiStepOrdinal
      && semanticPlan?.workflowPreconditionBlocked,
  );
  const responseStep = capabilityAheadOfLiveStep ? actualUiStep : step;
  const responseKnowledge = capabilityAheadOfLiveStep ? actualUiStep : knowledge;
  const targetLabel = String(
    guidedTarget?.status === "FOUND"
      ? guidedTarget.label || ""
      : actualUiState?.currentTargetLabel || "",
  ).trim();
  const targetLine = targetLabel
    ? `Ekranda doğrulayabildiğim mevcut hedef: “${targetLabel}”.`
    : "Bu adım için ekranda doğrulanabilir bir hedef görünmüyorsa ilerleme iddiasında bulunmuyorum.";
  const controls = Array.isArray(responseKnowledge.controls) ? responseKnowledge.controls.join(", ") : "";
  const preconditions = Array.isArray(responseKnowledge.preconditions)
    ? responseKnowledge.preconditions.join(", ")
    : String(responseKnowledge.precondition || "");
  const blockedProgressionLine = capabilityAheadOfLiveStep
    ? `İstenen ${step.label} yeteneği ${step.ordinal}. adımda kullanılabilir; ancak canlı arayüzde şu an ${actualUiStep.ordinal}. adım olan ${actualUiStep.label} açık. Önce ${actualUiStep.completion} tamamlanmalı; Excel/CSV kontrolü henüz erişilebilir değil.`
    : semanticPlan?.workflowPreconditionBlocked
      ? `Bu adımın tamamlandığını mevcut arayüzde doğrulayamadım; ${step.label} tamamlanmadan sonraki adıma geçmiyorum. Önce ${step.completion}`
    : "";
  const capabilityLead = capabilityAheadOfLiveStep
    ? `${capability?.label || step.label} ${step.ordinal}. adımda kullanılabilir; şu an önce ${actualUiStep.label} tamamlanmalı. `
    : capability ? `Bu adımda ${capability.label} yeteneğini kullanırsın. ` : "";
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
  const currentStepAction = responseKnowledge.action || responseStep.action || controls;
  const currentStepBoundary = responseKnowledge.businessWriteBoundary || responseStep.businessWriteBoundary || "Sefer Abi iş kaydı yazmaz.";
  const reply = isRestart
    ? `Akışı baştan başlatıyoruz. Şimdi ${responseStep.ordinal}. adım olan ${responseStep.label} üzerindesin. ${currentStepAction} ${targetLine} Bu başlangıç yalnızca güvenli rehberliktir; ${currentStepBoundary}`
    : isBack
      ? responseStep.ordinal === 1
        ? `Geri isteğini aldım; bu akışın ilk adımındasın: ${responseStep.label}. Önceki bir adım yok. ${currentStepAction} ${targetLine} Arayüzü kullanıcı olarak değiştirmeden yalnızca mevcut güvenli adımı açıklıyorum. ${currentStepBoundary}`
        : `Geri isteğini aldım. Önceki uygun adım: ${responseStep.label}. ${currentStepAction} ${targetLine} Arayüzde geçişi kullanıcı yapar; Sefer Abi yalnızca önceki adımı açıklar ve iş kaydı yazmaz. ${currentStepBoundary}`
    : isContinuation
      ? `Aynı vardiya akışında ${responseStep.ordinal}. adım olan ${responseStep.label} devam ediyor. Bu ${continuationDepth}. devam açıklaması. ${continuationUnit ? `Sıradaki açıklama parçası: ${continuationUnit}. Şimdi: ${currentStepAction}` : currentStepAction} ${blockedProgressionLine} ${targetLine} Bu adımın tamamlandığını canlı arayüzde doğrulamadan sonraki adıma geçtiğini varsaymıyorum. ${currentStepBoundary}`
      : `Vardiya oluşturma akışında ${responseStep.ordinal}. adım: ${responseStep.label}. ${capabilityLead}${responseKnowledge.what || responseStep.what || responseStep.purpose} Neden: ${responseKnowledge.why || responseStep.why || responseStep.purpose} Şimdi: ${currentStepAction} Görünür kontroller: ${controls}. Ön koşul: ${preconditions}. ${responseKnowledge.completion || responseStep.completion} ${blockedProgressionLine} ${continuationLine} Sonraki adım: ${responseStep.nextStep || "Akışın mevcut doğrulanabilir adımını kontrol et."} ${targetLine}${recoveryLine} ${responseKnowledge.safeAction || responseStep.safeAction || "Sefer Abi yalnızca güvenli rehberlik eder."} ${currentStepBoundary}`;
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
      { title: `Adım ${responseStep.ordinal}: ${responseStep.label}`, body: `${responseStep.what || responseStep.purpose} ${responseStep.action || ""}`.trim() },
      { title: "Neden bu adım?", body: responseKnowledge.why || responseStep.why || responseStep.purpose },
      { title: "Ön koşul ve tamamlanma", body: `${preconditions}. ${responseKnowledge.completion || responseStep.completion} ${blockedProgressionLine}`.trim() },
      { title: "Sonraki adım", body: responseStep.nextStep || "Mevcut doğrulanabilir adımı kontrol et." },
      ...(isRecovery ? [{ title: "Kurtarma", body: `“${targetLabel || responseStep.label}” hedefini yeniden kontrol et; canlı arayüz doğrulanmadan ilerleme varsaymıyorum.` }] : []),
        { title: "Güvenli sınır", body: currentStepBoundary },
      ];
  const activeWorkflowStep = {
    ordinal: responseStep.ordinal,
    key: responseStep.key,
    label: responseStep.label,
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

function buildRoomEmptyFilterRecoveryResponse({ user, screenContext, message } = {}) {
  if (String(user?.role || '').toUpperCase() !== 'ROOM') return null;
  const path = String(screenContext?.path || '').split('?')[0];
  const surface = path === '/room/agreements'
    ? { scope: 'agreements', label: 'Sözleşmeler', noun: 'sözleşme' }
    : path === '/room/vehicles'
      ? { scope: 'vehicles', label: 'Araçlar', noun: 'araç' }
      : null;
  if (!surface) return null;
  const text = String(message || '').trim();
  if (!/(?:göremiyorum|goremiyorum|bulamıyorum|bulamiyorum|bulamadım|bulamadim)/iu.test(text)
    || !/(?:ne\s+yapmalıyım|ne\s+yapayım|nasıl|nasil)/iu.test(text)) return null;

  const filterStates = Array.isArray(screenContext?.uiHints?.filterStates)
    ? screenContext.uiHints.filterStates
    : [];
  const filter = filterStates.find((row) => String(row?.scope || '').trim() === surface.scope);
  const visibleCount = Number(filter?.visibleCount || 0) || 0;
  const totalCount = Number(filter?.totalCount || 0) || 0;
  const filterValue = String(filter?.value || '').trim();
  const clearTargetKey = String(filter?.clearTargetKey || '').trim();
  const visibleButtons = Array.isArray(screenContext?.uiHints?.visibleButtons)
    ? screenContext.uiHints.visibleButtons
    : [];
  const clearButton = visibleButtons.find((button) => (
    String(button?.targetKey || '').trim() === clearTargetKey
      && /filtre/i.test(String(button?.label || ''))
      && button?.disabled !== true
  ));
  if (!filterValue || visibleCount !== 0 || totalCount <= 0 || !clearTargetKey || !clearButton) return null;

  const reply = `${surface.label} ekranındasın. “${filterValue}” filtresi ${totalCount} yetkili ${surface.noun} içinden 0 kayıt gösteriyor. Eski ${surface.noun} seçimini geri getirmiyorum; önce filtreyi temizleyip listeyi yeniden görünür hâle getirebilirsin.`;
  const action = {
    label: 'Filtreyi temizle',
    actionKind: 'CLEAR_FILTER',
    targetKey: clearTargetKey,
    screenPath: path,
    reason: 'Mevcut ekrandaki canlı sıfır-sonuç filtresini temizler; filtreyle gizlenmiş eski seçim varsa onu da temizler, kayıt seçmez ve işlem başlatmaz.',
    safeUiAction: true,
    criticalActionExecution: false,
  };
  return {
    ok: true,
    provider: 'local-room-empty-filter-recovery',
    providerSummary: 'live-authorized-empty-filter-state',
    mode: 'RULE_BASED',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Boş liste kurtarma',
    entityType: 'screen',
    entityId: 0,
    entityLabel: String(screenContext?.label || surface.label),
    scope: {
      role: String(user?.role || ''),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: `Yalnız ${surface.label} ekranının canlı filtresi ve yetkili toplamı kullanıldı.`,
    },
    reply,
    summary: reply,
    contextSummary: `${surface.label}: aktif filtre ${filterValue}, görünür 0 / toplam ${totalCount}.`,
    questionType: 'MISSING_DATA_HELP',
    activeTopic: 'EMPTY_FILTER_RECOVERY',
    assistantIntent: 'EMPTY_FILTER_RECOVERY',
    responseSections: [
      { title: 'Gördüğüm durum', body: `${surface.label} ekranında aktif filtre nedeniyle görünür kayıt yok.` },
      { title: 'Güvenli sonraki adım', body: 'Filtreyi temizle; bu işlem filtreyle gizlenmiş eski seçimi de kaldırır, yeni kayıt seçmez.' },
    ],
    dataSources: ['LIVE_UI_FILTER_STATE', 'LIVE_UI_CLEAR_FILTER_CONTROL'],
    retrievedFacts: [{ type: 'EMPTY_FILTER', scope: surface.scope, filterValue, visibleCount, totalCount }],
    safeNextStep: 'Filtreyi temizle; ardından listeden istediğin kaydı kendin seç.',
    nextAction: 'Önce “Filtreyi temizle” düğmesine bas.',
    roleBoundary: `Yalnız mevcut ROOM tenantının ${surface.label} görünümü kullanıldı; kayıt okunmadı ve işlem başlatılmadı.`,
    readOnly: true,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    qualityHints: { actionable: true, hasSupportAction: true, liveUiVerified: true },
    quickActions: [action],
  };
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

function previousRoomCapabilityGuidanceReply(conversationState, workflowIntent = "") {
  const messages = Array.isArray(conversationState?.recentMessages)
    ? conversationState.recentMessages
    : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const plan = message?.semanticPlan || null;
    if (String(message?.role || '').toLowerCase() !== 'assistant') continue;
    if (String(plan?.family || '').toUpperCase() !== 'UI_GUIDANCE') continue;
    const sameWorkflow = workflowIntent
      ? String(plan?.workflowIntent || '').toUpperCase() === String(workflowIntent).toUpperCase()
      : true;
    if (!sameWorkflow) continue;
    if (String(plan?.roleCapabilityBoundary || '').toUpperCase() !== 'ROOM_CREATE_UNSUPPORTED'
      && !workflowIntent) continue;
    const reply = String(message?.text || '').trim();
    if (reply) return reply;
  }
  return '';
}

export function buildSelectedShiftContinuationGuidance({ shiftId, targetLabel, action, depth } = {}) {
  const safeId = Number(shiftId) || 0;
  const label = String(targetLabel || 'Vardiya ayrıntıları').trim();
  if (safeId <= 0 || !label) return null;
  const steps = [
    `1. “${label}” hedefini açıp Vardiya #${safeId} ayrıntılarını doğrula.`,
    '2. Durum ile araç/sürücü atamasını kontrol et.',
    '3. Durak/rota ve konum sinyalini kontrol et.',
    '4. Operasyon kanıtını ve doğrulanabilir sonraki işi kontrol et.',
  ];
  const normalizedAction = String(action || 'CONTINUE').trim().toUpperCase();
  const continuationDepth = Math.max(1, Number(depth) || 1);
  const currentOrdinal = Math.min(steps.length, continuationDepth);
  const previousOrdinal = Math.max(1, currentOrdinal - 1);
  if (normalizedAction === 'BACK') {
    return {
      reply: `Bir önceki güvenli adıma dönüyoruz: ${steps[previousOrdinal - 1]} Kayıt değişikliği yapmıyorum; seçili Vardiya #${safeId} bağlamını koruyorum.`,
      sections: [
        { title: 'Önceki adım', body: steps[previousOrdinal - 1] },
        { title: 'Güvenli sınır', body: 'Sefer Abi yalnızca mevcut yetkili kaydı açıklar; iş kaydı değiştirmez.' },
      ],
    };
  }
  if (normalizedAction === 'RECOVER') {
    return {
      reply: `Seçili Vardiya #${safeId} akışında kalıyoruz. Bulamadığın adım için ${steps[currentOrdinal - 1]} Hedef görünmüyorsa bu adımı tamamlandı saymıyorum.`,
      sections: [
        { title: 'Kurtarma', body: steps[currentOrdinal - 1] },
        { title: 'Hedef', body: `“${label}” hedefini yeniden kontrol et.` },
        { title: 'Güvenli sınır', body: 'Yetkili ekran doğrulanmadan ilerleme veya iş kaydı yazımı varsayılmıyor.' },
      ],
    };
  }
  const reply = continuationDepth <= 1
    ? `Seçili Vardiya #${safeId} için adım adım ilerleyelim: ${steps.join(' ')} Bu yalnızca mevcut yetkili ekranı okuyan güvenli rehberliktir.`
    : `Seçili Vardiya #${safeId} akışında sıradaki somut adım: ${steps[currentOrdinal - 1]} Önceki adımın tamamlandığını canlı arayüzde doğrulamadan sonraki adıma geçtiğini varsaymıyorum.`;
  return {
    reply,
    sections: continuationDepth <= 1
      ? [
        { title: 'Adım sırası', body: steps.join(' ') },
        { title: 'Mevcut hedef', body: `“${label}” hedefini açıp seçili kaydı kontrol et.` },
        { title: 'Güvenli sınır', body: 'Sefer Abi yalnızca rehberlik eder; iş kaydı oluşturmaz veya değiştirmez.' },
      ]
      : [
        { title: `Adım ${currentOrdinal}`, body: steps[currentOrdinal - 1] },
        { title: 'Mevcut hedef', body: `“${label}” hedefi hâlâ seçili Vardiya #${safeId} bağlamında doğrulanıyor.` },
        { title: 'Güvenli sınır', body: 'Ön koşul doğrulanmadan ilerleme tamamlandı sayılmıyor.' },
      ],
  };
}

export async function runCopilotFoundation(args = {}) {
  const authorizedScreenContext = resolveIncomingCopilotScreenContext({
    user: args.user,
    screenContext: args.screenContext,
    entityType: args.entityType,
    entityId: args.entityId,
  });
  const canonicalState = getCanonicalConversationState({ user: args.user, screenContext: authorizedScreenContext, authSessionId: args.authSessionId });
  const clientRoomCostState = safeRoomCostContinuationState(args.conversationState, args.user, authorizedScreenContext);
  const effectiveConversationState = !hasCanonicalRoomCostState(canonicalState) && clientRoomCostState
    ? { ...canonicalState, roomCost: clientRoomCostState }
    : canonicalState;
  const rawPayload = await runCopilotFoundationInternal({
    ...args,
    screenContext: canonicalState.screenContext,
    conversationState: effectiveConversationState,
    roomCostAccess: args.roomCostAccess,
  });
  // BACK over a read-only agreement task is a canonical state transition,
  // not a request to repeat the latest relation answer. Restore only a
  // bounded prior step whose target is still present in the live authorized
  // surface and whose selected record remains in scope.
  const restoredConversationStep = restoreVerifiedConversationStep({
    conversationState: canonicalState,
    screenContext: canonicalState.screenContext,
    semanticPlan: rawPayload?.semanticPlan,
    user: args.user,
  });
  const restoredForwardConversationStep = restoreVerifiedForwardConversationStep({
    conversationState: canonicalState,
    screenContext: canonicalState.screenContext,
    semanticPlan: rawPayload?.semanticPlan,
    user: args.user,
  });
  if (restoredConversationStep) {
    const previousPlan = restoredConversationStep.step.semanticPlan || null;
    const currentPlan = rawPayload.semanticPlan || {};
    const restoredPlan = {
      ...previousPlan,
      family: 'CONTINUE_CURRENT_REASONING',
      intentFamily: 'CONTINUE_CURRENT_REASONING',
      continuationAction: 'BACK',
      continuationBasePlan: previousPlan,
      restoredConversationStep: true,
      relationshipIntent: null,
      typedRequest: {
        ...(currentPlan.typedRequest || {}),
        taskType: 'CONTINUE_CURRENT_REASONING',
        continuationIntent: true,
        continuationAction: 'BACK',
      },
      canonicalRequest: currentPlan.canonicalRequest || previousPlan?.canonicalRequest || null,
    };
    rawPayload.semanticPlan = restoredPlan;
    rawPayload.reply = `Önceki adıma döndük. ${String(restoredConversationStep.step.reply || '').trim()}`.trim();
    rawPayload.summary = rawPayload.reply;
    rawPayload.responseSections = [{ title: 'Önceki adım', body: rawPayload.reply }];
    rawPayload.nextAction = restoredConversationStep.step.nextAction || `“${String(restoredConversationStep.target.label || '').trim()}” hedefini kontrol et.`;
    rawPayload.safeNextStep = restoredConversationStep.step.safeNextStep || rawPayload.nextAction;
    rawPayload.guidedTarget = restoredConversationStep.target;
    rawPayload.conversationStepRestore = restoredConversationStep.step;
    rawPayload.conversationStepForward = canonicalState.lastSettledResult
      ? {
        authScopeVersion: canonicalState.authScopeVersion,
        screenPath: canonicalState.guidedTarget?.screenPath || canonicalState.screenContext?.path,
        selectedEntity: canonicalState.entityContext?.selectedEntity || canonicalState.screenContext?.selectedEntity || null,
        semanticPlan: canonicalState.lastSettledResult.semanticPlan || null,
        guidedTarget: canonicalState.guidedTarget || null,
        reply: canonicalState.lastSettledResult.reply || '',
        summary: canonicalState.lastSettledResult.summary || canonicalState.lastSettledResult.reply || '',
        nextAction: canonicalState.lastSettledResult.nextAction || '',
        safeNextStep: canonicalState.lastSettledResult.safeNextStep || '',
      }
      : null;
  } else if (restoredForwardConversationStep) {
    const previousPlan = restoredForwardConversationStep.step.semanticPlan || null;
    const currentPlan = rawPayload.semanticPlan || {};
    const restoredPlan = {
      ...previousPlan,
      family: 'CONTINUE_CURRENT_REASONING',
      intentFamily: 'CONTINUE_CURRENT_REASONING',
      continuationAction: 'CONTINUE',
      continuationBasePlan: previousPlan,
      restoredConversationStep: true,
      restoredForwardStep: true,
      typedRequest: {
        ...(currentPlan.typedRequest || {}),
        taskType: 'CONTINUE_CURRENT_REASONING',
        continuationIntent: true,
        continuationAction: 'CONTINUE',
      },
      canonicalRequest: currentPlan.canonicalRequest || previousPlan?.canonicalRequest || null,
    };
    rawPayload.semanticPlan = restoredPlan;
    rawPayload.reply = `Devam ediyoruz. ${String(restoredForwardConversationStep.step.reply || '').trim()}`.trim();
    rawPayload.summary = rawPayload.reply;
    rawPayload.responseSections = [{ title: 'İleri adım', body: rawPayload.reply }];
    rawPayload.nextAction = restoredForwardConversationStep.step.nextAction || `“${String(restoredForwardConversationStep.target.label || '').trim()}” hedefini kontrol et.`;
    rawPayload.safeNextStep = restoredForwardConversationStep.step.safeNextStep || rawPayload.nextAction;
    rawPayload.guidedTarget = restoredForwardConversationStep.target;
    rawPayload.conversationStepForwardRestore = restoredForwardConversationStep.step;
  }
  // An explicit canonical authorization result owns the target state for this
  // turn. Do not let the resolver reuse a previous workflow/control target
  // after the current request has been denied for a different role.
  const retainsConversationGuidedTarget = Boolean(
    restoredConversationStep
      || restoredForwardConversationStep
      || ['CONTINUE_CURRENT_REASONING', 'EXPLAIN_CURRENT_TARGET'].includes(String(rawPayload?.semanticPlan?.family || ''))
      || rawPayload?.conversationStepRestore
      || rawPayload?.conversationStepForwardRestore,
  );
  // The resolver must not use a prior target as implicit context for an
  // independent turn.  Otherwise a correct FIELD_LOOKUP answer can be
  // returned together with the previous Vardiyalar target, and the response
  // layer will rehydrate the stale drawer/callout even when the canonical
  // state commit later clears it.
  const targetResolutionState = retainsConversationGuidedTarget
    ? canonicalState
    : { ...canonicalState, guidedTarget: null };
  // Cross-surface relation navigation already carries its authorized route
  // and record identity in the response.  Do not let the legacy live-target
  // resolver attach an unrelated disclosure from the source screen (for
  // example, a generic Vardiyalar target while the user is being sent to the
  // selected vehicle on the map).  The destination screen owns its own
  // visible target after navigation.
  const targetOwnerSource = String(rawPayload?.source || rawPayload?.providerSummary || '');
  const suppressSourceScreenTarget = [
    'authorized-room-relation-v1',
    'authorized-room-agreement-context-navigation-v1',
    'authorized-room-vehicle-map-navigation-v1',
  ].includes(targetOwnerSource);
  const guidedTarget = suppressSourceScreenTarget
    ? null
    : restoredConversationStep?.target
    || restoredForwardConversationStep?.target
    || (rawPayload?.semanticPlan?.roleTargetResolution === "UNAUTHORIZED"
    && rawPayload?.guidedTarget?.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED
    ? rawPayload.guidedTarget
    : resolveCopilotGuidedTarget({
      user: args.user,
      screenContext: canonicalState.screenContext,
      conversationState: targetResolutionState,
      semanticPlan: rawPayload?.semanticPlan || null,
      message: args.message,
    }));
  const agreementOperationBridgeResponse = buildRoomAgreementOperationBridgeResponse({
    user: args.user,
    screenContext: canonicalState.screenContext,
    semanticPlan: rawPayload?.semanticPlan || null,
    guidedTarget,
  });
  if (agreementOperationBridgeResponse) Object.assign(rawPayload, agreementOperationBridgeResponse);
  const selectedShiftId = Number(
    canonicalState.screenContext?.selectedEntityId
      || canonicalState.screenContext?.selectedRecordId
      || rawPayload?.semanticPlan?.entity?.id
      || 0,
  ) || 0;
  const selectedShiftGuidance = guidedTarget?.status === 'FOUND'
    && String(canonicalState.screenContext?.path || '').split('?')[0] === '/room/shifts'
    && selectedShiftId > 0
    && String(rawPayload?.semanticPlan?.entity?.type || canonicalState.screenContext?.selectedEntityType || '').toLowerCase() === 'shift'
    && String(guidedTarget.targetKey || '') === `room-shifts:shift:${selectedShiftId}:details`;
  const selectedShiftGuidanceTask = rawPayload?.semanticPlan?.family === 'UI_GUIDANCE'
    && rawPayload?.semanticPlan?.typedRequest?.taskType === 'NEXT_ACTION';
  const activeGuidedTaskPlan = canonicalState?.activeGuidedTask?.semanticPlan || null;
  const selectedShiftContinuation = rawPayload?.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING'
    && (
      rawPayload?.semanticPlan?.continuationBasePlan?.family === 'UI_GUIDANCE'
      // The server-owned task is the continuity authority. Some runtimes can
      // return a reduced continuation envelope while retaining the verified
      // active task; use that task only after the live selected-shift target
      // above has already revalidated the same record and route.
      || activeGuidedTaskPlan?.family === 'UI_GUIDANCE'
    );
  if (selectedShiftGuidance && selectedShiftGuidanceTask) {
    const selectedLabel = String(canonicalState.screenContext?.selectedLabel || `Vardiya #${selectedShiftId}`).trim();
    const targetLabel = String(guidedTarget.label || 'Detayları göster').trim();
    const nextReply = `${selectedLabel} için sıradaki güvenli adım: “${targetLabel}” hedefini açıp durum, araç/sürücü ve rota bilgilerini kontrol etmek. İşlem başlatmıyorum; yalnızca mevcut yetkili kaydı gösteriyorum.`;
    rawPayload.reply = nextReply;
    rawPayload.summary = nextReply;
    rawPayload.nextAction = `Sıradaki hedef: ${targetLabel}.`;
    rawPayload.safeNextStep = rawPayload.nextAction;
    if (Array.isArray(rawPayload.responseSections) && rawPayload.responseSections[0]) rawPayload.responseSections[0].body = nextReply;
  }
  if (selectedShiftGuidance && selectedShiftContinuation
    && String(rawPayload?.semanticPlan?.typedRequest?.continuationAction || rawPayload?.semanticPlan?.continuationAction || '').toUpperCase() === 'BACK') {
    const targetLabel = String(guidedTarget.label || 'Detayları göster').trim();
    const backReply = `Bir önceki güvenli adıma dönüyoruz: seçili Vardiya #${selectedShiftId} için “${targetLabel}” hedefini yeniden kontrol edelim. Bu geri dönüşte kayıt değişikliği yapılmadı.`;
    rawPayload.reply = backReply;
    rawPayload.summary = backReply;
    rawPayload.nextAction = `Önceki güvenli hedef: ${targetLabel}.`;
    rawPayload.safeNextStep = rawPayload.nextAction;
    if (Array.isArray(rawPayload.responseSections) && rawPayload.responseSections[0]) rawPayload.responseSections[0].body = backReply;
  }
  if (selectedShiftGuidance && selectedShiftContinuation
    && String(rawPayload?.semanticPlan?.typedRequest?.continuationAction || rawPayload?.semanticPlan?.continuationAction || '').toUpperCase() === 'RECOVER') {
    const targetLabel = String(guidedTarget.label || 'Detayları göster').trim();
    const recoverReply = `Seçili Vardiya #${selectedShiftId} akışında kalıyoruz. Bulamadığın adım için “${targetLabel}” hedefini yeniden kontrol edelim; doğrulanmayan bir adımı tamamlandı saymıyorum.`;
    rawPayload.reply = recoverReply;
    rawPayload.summary = recoverReply;
    rawPayload.nextAction = `Kurtarma hedefi: ${targetLabel}.`;
    rawPayload.safeNextStep = rawPayload.nextAction;
    if (Array.isArray(rawPayload.responseSections) && rawPayload.responseSections[0]) rawPayload.responseSections[0].body = recoverReply;
  }
  if (selectedShiftGuidance && selectedShiftContinuation
    && !['BACK', 'RECOVER'].includes(String(rawPayload?.semanticPlan?.typedRequest?.continuationAction || rawPayload?.semanticPlan?.continuationAction || '').toUpperCase())) {
    const continuation = buildSelectedShiftContinuationGuidance({
      shiftId: selectedShiftId,
      targetLabel: guidedTarget.label,
      action: rawPayload?.semanticPlan?.typedRequest?.continuationAction || rawPayload?.semanticPlan?.continuationAction || 'CONTINUE',
      depth: rawPayload?.semanticPlan?.continuationDepth,
    });
    if (continuation) {
      rawPayload.reply = continuation.reply;
      rawPayload.summary = continuation.reply;
      rawPayload.responseSections = continuation.sections;
      rawPayload.nextAction = `“${String(guidedTarget.label || 'Vardiya ayrıntıları').trim()}” hedefini kontrol et.`;
      rawPayload.safeNextStep = rawPayload.nextAction;
    }
  }
  if (guidedTarget?.status === 'FOUND'
    && rawPayload?.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING'
    && rawPayload?.semanticPlan?.continuationBasePlan?.family === 'UI_GUIDANCE'
    && !(selectedShiftGuidance && selectedShiftContinuation)
    // BACK has a distinct canonical response contract.  Do not replace it
    // with the generic target-progress bridge used for CONTINUE/NEXT; that
    // loses the user's requested return-to-previous-step meaning.
    && String(rawPayload?.semanticPlan?.typedRequest?.continuationAction
      || rawPayload?.semanticPlan?.continuationAction
      || '').toUpperCase() !== 'BACK') {
    const targetLabel = String(guidedTarget.label || '').trim();
    if (targetLabel) {
      const continuationAction = String(
        rawPayload.semanticPlan?.typedRequest?.continuationAction
          || rawPayload.semanticPlan?.continuationAction
          || 'CONTINUE',
      ).toUpperCase();
      const previousGuidanceReply = continuationAction === 'BACK'
        ? previousRoomCapabilityGuidanceReply(canonicalState, rawPayload.semanticPlan?.workflowIntent)
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
  // The legacy target-explanation composer runs before the final live target
  // resolver.  When the current turn resolves a more specific canonical
  // target (for example an offer disclosure instead of the enclosing offers
  // surface), replace that stale presentation with the target identity proven
  // for this turn.  This keeps the visible answer and DOM highlight on one
  // authorized target without changing permissions or inventing a record.
  if (guidedTarget?.status === 'FOUND'
    && rawPayload?.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET'
    && !isCurrentTargetFieldFillQuestion(args.message)
    && rawPayload?.provider !== 'local-room-empty-filter-recovery') {
    const targetLabel = String(guidedTarget.label || '').trim();
    if (targetLabel) {
      const screenLabel = String(canonicalState.screenContext?.label || 'bu ekran').trim();
      const recovery = shouldUseCurrentTargetRecoveryFallback({
        message: args.message,
        semanticPlan: rawPayload.semanticPlan,
      });
      const explanationReply = recovery
        ? `Şu an ${screenLabel} üzerindesin. “${targetLabel}” hedefinde ilerleyemediğini anladım. Bu hedefi yeniden kontrol ederek birlikte devam edelim; hedef doğrulanmadan görevi tamamlandı saymıyorum.`
        : `Şu an ${screenLabel} üzerindesin. Vurgulanan “${targetLabel}” bu akıştaki mevcut hedef. Buradan “${targetLabel}” hedefini kontrol edebilir veya alanın ne yaptığını öğrenebilirsin; bu açıklama görevin adımını ilerletmez.`;
      rawPayload.reply = explanationReply;
      rawPayload.summary = explanationReply;
      if (Array.isArray(rawPayload.responseSections) && rawPayload.responseSections[0]) {
        rawPayload.responseSections[0].body = explanationReply;
      }
      rawPayload.nextAction = `“${targetLabel}” hedefini kontrol et.`;
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
    'EXPLAIN_CURRENT_SURFACE',
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
  // Some bounded, read-only capability composers resolve a canonical target
  // together with their answer (for example ROOM payment-readiness -> the
  // settlement tab).  Preserve that target when the generic live resolver has
  // no competing result, but only when it is canonical and belongs to the
  // current authorized screen.  This prevents a raw/stale target from being
  // promoted into the response while keeping the capability's real DOM anchor.
  const rawCanonicalGuidedTarget = rawPayload?.guidedTarget?.status === 'FOUND'
    && rawPayload?.guidedTarget?.identitySource === 'CANONICAL'
    && String(rawPayload?.guidedTarget?.screenPath || '').split('?')[0]
      === String(canonicalState.screenContext?.path || '').split('?')[0]
    ? rawPayload.guidedTarget
    : null;
  const responseGuidedTarget = guidedTarget
    || rawCanonicalGuidedTarget
    || (retainsConversationGuidedTarget ? canonicalState.guidedTarget : null);
  const payload = normalizeSeferAbiUserFacingPayload({
    ...rawPayload,
    guidedTarget: responseGuidedTarget,
    conversationState: {
      ...(rawPayload?.roomCostConversationState
        ? { roomCost: rawPayload.roomCostConversationState }
        : {}),
      ...(rawPayload?.costAnalysisState
        ? { costAnalysisState: rawPayload.costAnalysisState }
        : {}),
      guidedTarget: responseGuidedTarget,
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

async function runCopilotFoundationInternal({ intent, entityType, entityId, user, jobType, guideLevel, screenContext, message, conversationState, roomCostAccess }) {
  if (intent === "CHAT_HELP") {
    const directScreenMetricResponse = buildDirectScreenMetricResponse({ user, entityType, entityId, screenContext, message });
    if (directScreenMetricResponse) return directScreenMetricResponse;
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
    let semanticPlan = resolveSemanticIntent({ message, user, conversationState, screenContext, canonicalRequest: canonicalRequestResult });
    // A short continuation on the live ROOM financial surface must keep the
    // existing, server-owned cost draft.  The canonical room-cost classifier
    // is narrowly admitted by role, tenant, route and prior draft state; it
    // cannot create a new target or grant write capability.  Without this
    // bridge, "Devam" is consumed by the generic conversation router before
    // the room-cost contract can preserve its verified fields.
    const roomCostContinuationRequest = inferRoomCostSemanticRequest({
      text: message,
      user,
      screenContext,
      conversationState,
      inferred: semanticPlan,
    });
    if (roomCostContinuationRequest) {
      semanticPlan = {
        ...semanticPlan,
        family: "FIELD_LOOKUP",
        intentFamily: "FIELD_LOOKUP",
        roomCostRequest: roomCostContinuationRequest,
        typedRequest: {
          ...(semanticPlan.typedRequest || {}),
          taskType: "FIELD_LOOKUP",
          continuationIntent: roomCostContinuationRequest.continuationAction !== "NEW_REQUEST",
          continuationAction: roomCostContinuationRequest.continuationAction,
          roomCostRequest: roomCostContinuationRequest,
        },
      };
    }
    // Cross-role impact questions are a canonical read-only relation task.
    // Resolve their authorized screen/record context before broad reasoning
    // and product-awareness fallbacks can replace the relationship answer
    // with a generic "linked record" message. This does not grant a write
    // capability and fails closed when no selected record is available.
    if (semanticPlan?.crossRoleImpactIntent === true) {
      let crossRoleContext = null;
      let crossRoleScope = null;
      let crossRoleLabel = "Sefer Abi";
      try {
        const resolvedCrossRole = await resolveChatContext({
          entityType,
          entityId,
          user,
          screenContext,
          conversationState,
        });
        crossRoleContext = resolvedCrossRole?.context || null;
        crossRoleScope = resolvedCrossRole?.scope || null;
        crossRoleLabel = resolvedCrossRole?.entityLabel || crossRoleLabel;
      } catch {
        // The response composer remains usable without a selected record;
        // the helper then states the missing authorized context plainly.
      }
      const crossRoleResponse = buildCrossRoleSynchronizationResponse({
        user,
        message,
        context: crossRoleContext,
        screenContext,
        semanticPlan,
        entityType,
        entityId,
      });
      if (crossRoleResponse) {
        return {
          ok: true,
          generatedAt: new Date().toISOString(),
          intent: "CHAT_HELP",
          intentLabel: "Roller arası işlem etkisi",
          provider: "local-authorized-relation-read",
          providerSummary: "canonical-cross-role-impact",
          mode: "RULE_BASED",
          entityType,
          entityId: Number(entityId) || 0,
          entityLabel: crossRoleLabel,
          scope: crossRoleScope || {
            role: String(user?.role || ""),
            roomId: user?.roomId ?? null,
            companyId: user?.companyId ?? null,
            summary: "Yalnızca yetkili rol ve tenant kapsamı kullanıldı.",
          },
          ...crossRoleResponse,
          semanticPlan,
          conversationRoute: semanticPlan.conversationRoute,
          dialogueTopic: semanticPlan.dialogueTopic,
          roleBoundary: "Yalnızca mevcut rol ve tenant kapsamındaki kayıtlar kullanıldı.",
          privacyBoundary: false,
        };
      }
    }
    semanticPlan.canonicalRequest = canonicalRequestResult.request;
    semanticPlan.canonicalRequestEnvelope = canonicalRequestResult;
    semanticPlan.canonicalRequestValidation = canonicalRequestResult.validation;
    semanticPlan.canonicalRequestId = canonicalRequestResult.requestId;
    // Stage A exposes the provider-neutral eligibility decision as bounded
    // provenance only. It does not invoke a proposer or alter the canonical
    // semantic/authorization path.
    semanticPlan.canonicalFallbackEligibility = canonicalRequestResult.fallbackEligibility;
    // A GeoReview chip such as “Devamını anlat” is a short, read-only UI
    // continuation and may arrive without a semanticPlan from the browser.
    // Resolve it before product-awareness and domain fallbacks can reinterpret
    // the selected location record as an unrelated agreement or completion
    // target.
    const geoReviewContinuation = buildGeoReviewContinuationReply({ message, screenContext });
    if (geoReviewContinuation) {
      const targetResponse = buildLegacyChatHelpResponse({
        entityType,
        entityId,
        user,
        message,
        semanticPlan,
        conversationState,
        screenContext,
        ...(await resolveChatContext({ entityType, entityId, user, screenContext, conversationState })),
      });
      return {
        ...targetResponse,
        semanticPlan,
        conversationRoute: "CURRENT_SELECTED_RECORD",
        dialogueTopic: "PRODUCT",
      };
    }
    const schoolParentAccessHistoryResponse = await buildSchoolParentAccessHistoryResponse({
      user,
      screenContext,
      message,
      prisma,
    });
    if (schoolParentAccessHistoryResponse) {
      return {
        ...schoolParentAccessHistoryResponse,
        entityType,
        entityId: Number(entityId) || 0,
        entityLabel: screenContext?.selectedLabel || screenContext?.label || "Veli Erişimi",
        semanticPlan,
        conversationRoute: "CURRENT_SELECTED_RECORD",
        dialogueTopic: "PRODUCT",
      };
    }
    const regionCapacityResponse = await buildSuperAdminRegionCapacityResponse({
      user,
      entityType,
      entityId,
      screenContext,
      message,
      conversationState,
      semanticPlan,
    });
    if (regionCapacityResponse) return regionCapacityResponse;
    const canonicalWorkflowIntent = String(canonicalRequestResult.request?.workflowRef?.workflowIntent || "");
    const canonicalReportStatusGuidance = canonicalRequestResult.canonicalShape?.reportStatusGuidanceIntent === true;
    if ((["UNSPECIFIED_DISABLED_FIELD", "REPORT_FILTER_GUIDANCE", "REPORT_STATUS_GUIDANCE"].includes(canonicalWorkflowIntent)
      || canonicalReportStatusGuidance)
      && String(user?.role || "").toUpperCase() === "COMPANY") {
      const effectiveWorkflowIntent = canonicalReportStatusGuidance ? "REPORT_STATUS_GUIDANCE" : canonicalWorkflowIntent;
      semanticPlan = {
        ...semanticPlan,
        family: "SCREEN_CONTEXT",
        intentFamily: "SCREEN_CONTEXT",
        workflowIntent: effectiveWorkflowIntent,
        typedRequest: {
          ...(semanticPlan.typedRequest || {}),
          taskType: "SCREEN_CONTEXT",
          screenContextIntent: true,
          explicitTaskIntent: true,
          explicitUserTarget: true,
        },
      };
    }
    // A concrete operational diagnosis may be classified by the legacy
    // planner as role help because the user did not name a record. The
    // canonical request is already explicit and authorized; retain its
    // OPERATIONS owner so read-only operational evidence can be retrieved
    // instead of falling back to a role playbook.
    if (["DIAGNOSE_CURRENT_ISSUE", "ASSESS_CURRENT_SITUATION"].includes(canonicalRequestResult.request?.operation)
      && canonicalRequestResult.request?.domain === "OPERATIONS"
      && !(Array.isArray(semanticPlan.requestedDomains) && semanticPlan.requestedDomains.length)) {
      semanticPlan.requestedDomains = ["OPERATIONS"];
    }
    if (canonicalRequestResult.request?.operation === "ASSESS_CURRENT_SITUATION"
      && canonicalRequestResult.request?.domain === "OPERATIONS") {
      semanticPlan.requestedDomains = ["OPERATIONS"];
    }
    const emptyFilterRecovery = buildRoomEmptyFilterRecoveryResponse({
      user,
      screenContext,
      message,
    });
    if (emptyFilterRecovery) {
      return {
        ...emptyFilterRecovery,
        semanticPlan,
        canonicalRequest: canonicalRequestResult.request,
      };
    }
    if (localSemanticProposalResult.status !== "DISABLED") {
      semanticPlan.localSemanticProposal = {
        status: localSemanticProposalResult.status,
        applied: Boolean(localSemanticProposal),
        latencyMs: Number(localSemanticProposalResult.latencyMs || 0),
      };
    }
    const buyerFinanceScreenPath = String(screenContext?.path || "").split("?")[0];
    const buyerFinanceQuestionKind = String(user?.role || "").toUpperCase() === "COMPANY"
      && ["/company/financial-operations", "/school/financial-operations", "/organization/financial-operations"].includes(buyerFinanceScreenPath)
      ? companyPriceBudgetQuestionKind(message)
      : null;
    if (canonicalRequestResult.validation?.status === "SEMANTIC_UNRESOLVED" && !buyerFinanceQuestionKind) {
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
    if (canonicalAuthorization.status === "ALLOW"
      && !roleScopedTargetDenied
      && (isCompanySelectedInvoiceFinanceQuestion({ user, screenContext, message })
        || isRoomSelectedInvoiceAmountQuestion({ user, screenContext, message }))) {
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
          providerSummary: "company-selected-invoice-finance-authorized-route",
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
        resolvedContext: resolved.context,
        scope: resolved.scope,
      });
    }
    if (canonicalAuthorization.status === "ALLOW" && !roleScopedTargetDenied) {
      const organizationLegacyPlanMapResponse = buildOrganizationLegacyPlanMapExplanation({
        user,
        screenContext,
        message,
        entityType,
        entityId,
        semanticPlan,
      });
      if (organizationLegacyPlanMapResponse) return organizationLegacyPlanMapResponse;
    }
    // A general ROOM receivable question on the finance screen is not a cost
    // draft and not a generic product-help request. Keep it on the truthful
    // reconciliation boundary until an authorized agreement or invoice is
    // selected; never infer an amount from planned or incomplete records.
    if (canonicalAuthorization.status === "ALLOW"
      && !roleScopedTargetDenied
      && isUnselectedFinanceReconciliationQuestion({ baseResponse: { screenPath: screenContext?.path || null, semanticPlan }, user, screenContext, message })) {
      const resolved = await resolveChatContext({ entityType, entityId, user, screenContext, conversationState });
      return buildUnselectedFinanceReconciliationResponse({
        baseResponse: {
          ok: true,
          generatedAt: new Date().toISOString(),
          intent,
          intentLabel: intentLabel(intent),
          entityType,
          entityId: Number(entityId),
          entityLabel: resolved.entityLabel,
          provider: "local-foundation",
          providerSummary: "room-finance-receivable-boundary-authorized-route",
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
        screenPath: String(screenContext?.path || "/room/financial-operations").split("?")[0],
      });
    }
    if (canonicalAuthorization.status === "ALLOW" && !roleScopedTargetDenied) {
      const agreementOperationStatusResponse = await buildSelectedAgreementOperationStatusResponse({
        user,
        screenContext,
        message,
      });
      if (agreementOperationStatusResponse) {
        return {
          ...agreementOperationStatusResponse,
          entityType,
          entityId: Number(entityId) || 0,
          entityLabel: screenContext?.selectedLabel || screenContext?.label || "Sözleşme",
          semanticPlan,
          conversationRoute: "CURRENT_SELECTED_RECORD",
          dialogueTopic: "PRODUCT",
        };
      }
    }
    const platformHistoricalReferenceIntent = shouldRoutePlatformHistoricalReferenceBeforeFinancialRisk({
      semanticPlan,
      authorizationStatus: canonicalAuthorization.status,
      roleScopedTargetDenied,
    });
    // COMPANY budget and purchase-price questions use the same Sefer Abi
    // financial assistant as ROOM.  The canonical planner can conservatively
    // classify short deictic wording such as "Bu teklif bütçeme uygun mu?"
    // as unresolved because no offer is selected in the current surface.  The
    // live COMPANY budget screen is already an authorized tenant boundary, so
    // route only these explicit read-only questions into the existing cost
    // analysis owner; it must not create a record or broaden retrieval scope.
    const companyPriceBudgetKind = buyerFinanceQuestionKind;
    if (companyPriceBudgetKind && canonicalAuthorization.status === "ALLOW" && !roleScopedTargetDenied) {
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
          providerSummary: "company-price-budget-advisory-authorized-route",
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
        resolvedContext: resolved.context,
        scope: resolved.scope,
      });
    }
    if (canonicalAuthorization.status === "ALLOW" && !roleScopedTargetDenied) {
      const roomHgsExpenseResponse = await buildRoomHgsExpenseAssistantResponse({
        user,
        screenContext,
        message,
        conversationState,
        semanticPlan,
        prisma,
      });
      if (roomHgsExpenseResponse) return roomHgsExpenseResponse;
    }
    if (platformHistoricalReferenceIntent) {
      const resolved = await resolveChatContext({ entityType, entityId, user, screenContext, conversationState });
      const roomRegion = String(user?.role || "").toUpperCase() === "ROOM" && user?.roomId
        ? await prisma.room.findUnique({
          where: { id: Number(user.roomId) },
          select: { region: { select: { id: true, name: true } } },
        })
        : null;
      const referenceLayers = await getReferenceLayers({
        family: "REGIONAL_COST_REFERENCE",
        unit: "CURRENCY_PER_TRIP",
        regionName: roomRegion?.region?.name || undefined,
        scope: "ROOM",
      }, user);
      const platformReference = (referenceLayers?.layers || [])
        .find((layer) => layer?.layer === "SEFERPAKT_PLATFORM_REFERENCE") || null;
      return buildPlatformHistoricalReferenceClosedResponse({
        baseResponse: {
          ok: true,
          intent,
          entityType,
          entityId: Number(entityId),
          entityLabel: resolved.entityLabel,
          semanticPlan,
          conversationRoute: semanticPlan.conversationRoute,
          dialogueTopic: semanticPlan.dialogueTopic,
        },
        user,
        screenContext,
        platformReference,
      });
    }
    if (semanticPlan.workflowIntent === "REPORT_FILTER_GUIDANCE"
      && String(user?.role || "").toUpperCase() === "COMPANY") {
      const currentPath = String(screenContext?.path || "").split("?")[0];
      const onReportsSurface = currentPath === "/company/reports";
      const reportNavigationTarget = onReportsSurface
        ? null
        : { path: "/company/reports", label: "Raporlar", recordType: "SURFACE" };
      const reportFilterAwareness = {
        role: user?.role,
        domain: "OPERATIONS",
        authorizationBoundary: false,
        authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
        count: 0,
        records: [],
        reply: onReportsSurface
          ? "Raporlar ekranındasın. Üstteki sekmelerden Vardiyalar, Sürücüler, Araçlar veya Duraklar görünümünü seçebilirsin. Genel filtredeki “Satır içinde ara” alanı metinle arar; Başlangıç ve Bitiş alanları tarih aralığını, sütun başlıklarının altındaki alanlar da ilgili sütunu filtreler. Değişiklikten sonra Yenile düğmesine bas."
          : "Raporu filtrelemek için önce Raporlar ekranını açıyorum. Burada sekme, tarih aralığı, genel arama ve sütun filtreleriyle sonucu daraltabilirsin.",
        nextAction: onReportsSurface
          ? "“Satır içinde ara”, Başlangıç/Bitiş veya ilgili sütun filtresini kullan; ardından Yenile’ye bas."
          : "Raporlar ekranında filtre alanını seç.",
        source: "authorized-report-filter-guidance-v1",
        navigationTarget: reportNavigationTarget,
        dataSources: ["canlı Raporlar ekranı", "yetkili COMPANY UI kapsamı"],
        retrievedFacts: ["Satır içinde ara", "Başlangıç", "Bitiş", "Yenile"],
        reasoning: "Kullanıcıya yalnız canlı COMPANY Raporlar yüzeyinde görünen filtre kontrolleri açıklandı; veri veya yazma işlemi yapılmadı.",
        priority: "Rapor filtre rehberliği",
        semanticPlan,
      };
      const reportFilterResponse = buildProductAwarenessResponse({
        awareness: reportFilterAwareness,
        user,
        entityType,
        entityId,
        screenContext,
      });
      if (reportFilterResponse) return applyRequestedStyleToAnswer(reportFilterResponse);
    }
    if (semanticPlan.workflowIntent === "REPORT_STATUS_GUIDANCE"
      && String(user?.role || "").toUpperCase() === "COMPANY") {
      const { periodStart, periodEnd } = currentMonthBounds();
      const summary = await getShiftSummary({ from: periodStart, to: periodEnd }, user);
      const rows = Array.isArray(summary?.rows) ? summary.rows : [];
      const idsFor = (statuses) => rows
        .filter((row) => statuses.includes(String(row?.status || "").toUpperCase()))
        .map((row) => Number(row?.id || 0))
        .filter((id) => id > 0);
      const doneIds = idsFor(["DONE"]);
      const approvedIds = idsFor(["APPROVED", "ACTIVE"]);
      const pendingIds = idsFor(["DRAFT", "REQUESTED"]);
      const issueIds = idsFor(["REJECTED", "CANCELLED", "ERROR", "FAILED"]);
      const reportStatusAwareness = {
        role: user?.role,
        domain: "OPERATIONS",
        authorizationBoundary: false,
        authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
        count: Number(summary?.total || rows.length || 0),
        records: rows.slice(0, 16).map((row) => `Vardiya #${Number(row?.id || 0)}: ${String(row?.status || "Bilinmiyor")}`),
        reply: `Bu ay COMPANY kapsamındaki ${Number(summary?.total || rows.length || 0)} vardiya raporlandı. Tamamlandı statüsünde ${doneIds.length} kayıt var${doneIds.length ? ` (#${doneIds.join(", #")})` : ""}; ${approvedIds.length} kayıt Onaylandı, ${pendingIds.length} kayıt Taslak/Talep durumunda. Canonical sorun statüsünde (Reddedildi/İptal/Hata) ${issueIds.length} kayıt var${issueIds.length ? ` (#${issueIds.join(", #")})` : ""}. Ayrıntıyı Raporlar ekranındaki Durum sütunundan ve ilgili filtrelerden inceleyebilirsin.`,
        nextAction: "Raporlar ekranında Durum filtresini veya Satır içinde ara alanını kullan; bir satırı seçersen ayrıntısını açabilirim.",
        source: "authorized-report-status-guidance-v1",
        navigationTarget: String(screenContext?.path || "").split("?")[0] === "/company/reports"
          ? null
          : { path: "/company/reports", label: "Raporlar", recordType: "SURFACE" },
        dataSources: ["canonical COMPANY vardiya raporu", "Raporlar ekranı"],
        retrievedFacts: [`period=${periodStart}/${periodEnd}`, `total=${Number(summary?.total || rows.length || 0)}`, `done=${doneIds.length}`, `approved=${approvedIds.length}`, `pending=${pendingIds.length}`, `issues=${issueIds.length}`],
        reasoning: "Vardiya durumları aynı COMPANY tenant ve mevcut ay kapsamındaki canonical rapor özetinden ayrıştırıldı; tamamlanmayan veya sorunlu durumlar birbirine karıştırılmadı.",
        priority: "Rapor durum mutabakatı",
        semanticPlan,
      };
      const reportStatusResponse = buildProductAwarenessResponse({
        awareness: reportStatusAwareness,
        user,
        entityType,
        entityId,
        screenContext,
      });
      if (reportStatusResponse) return applyRequestedStyleToAnswer(reportStatusResponse);
    }
    // COMPANY has no settings or user-permission management surface in the
    // current authorized screen catalog. Resolve this explicit product-scope
    // request before the generic authorization reasoning lane can replace the
    // safe product-gap explanation with its broader record-access boundary.
    if (["UNSUPPORTED_COMPANY_ADMIN_SURFACE", "UNSPECIFIED_DISABLED_FIELD"].includes(String(semanticPlan.workflowIntent || ""))
      && String(user?.role || "").toUpperCase() === "COMPANY") {
      const unsupportedSurfaceAwareness = await buildAuthorizedProductAwarenessAnswer({
        user,
        message,
        screenContext,
        conversationState,
        semanticPlan,
      });
      const unsupportedSurfaceResponse = buildProductAwarenessResponse({
        awareness: unsupportedSurfaceAwareness,
        user,
        entityType,
        entityId,
        screenContext,
      });
      if (unsupportedSurfaceResponse) return applyRequestedStyleToAnswer(unsupportedSurfaceResponse);
    }
    const operationHealthHintDiagnostic = buildOperationHealthHintDiagnosticResponse({
      user,
      entityType,
      entityId,
      screenContext,
      message,
    });
    if (operationHealthHintDiagnostic) return operationHealthHintDiagnostic;
    // The three ROOM decision questions are an explicit, authorized finance
    // surface task. Route them before the independent ledger/draft composers;
    // those older paths intentionally answer Giderlerim questions and would
    // otherwise swallow the server-owned vehicle/contract/offer explanation.
    // This remains read-only and still requires the canonical authorization
    // decision above.
    if (canonicalAuthorization.status === "ALLOW"
      && isRoomFinancialDecisionQuestion({ user, screenContext, message })) {
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
          providerSummary: "room-financial-decision-explanation-authorized-route",
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
        resolvedContext: resolved.context,
        scope: resolved.scope,
      });
    }
    // Giderlerim and Genel Durum are independent firm-ledger surfaces.  Read
    // their visible starter questions from the canonical ledger before any
    // selected-service cost or screen-risk route can see a stale shift.
    const independentRoomFinanceLedger = await buildIndependentRoomFinanceLedgerResponse({
      user,
      entityType,
      entityId,
      screenContext,
      message,
      semanticPlan,
    });
    if (independentRoomFinanceLedger) return independentRoomFinanceLedger;
    const roomFinancialScreenRisk = await buildRoomFinancialScreenRiskResponse({
      user,
      entityType,
      entityId,
      screenContext,
      message,
      semanticPlan,
      conversationState,
    });
    if (roomFinancialScreenRisk) return roomFinancialScreenRisk;
    const roomFinancialVehicleRiskIntent = isRoomFinancialVehicleRiskIntent({
      user,
      screenContext,
      message,
      semanticPlan,
    });
    const roomCostAssistantResponse = hasSelectedFinancialMetricQuestion({ message, screenContext })
      || roomFinancialVehicleRiskIntent
      ? null
      : await buildRoomCostAssistantResponse({
        user,
        screenContext,
        semanticPlan,
        message,
        conversationState,
        entityType,
        entityId,
        roomCostAccess,
      });
    if (roomCostAssistantResponse) return roomCostAssistantResponse;
    // The cost-scenarios surface already contains the authorized preview and
    // its explicit financial limits. Route questions about that visible
    // scenario to the same read-only cost owner before generic screen help
    // asks for an unrelated record or invents a financial conclusion.
    if (isRoomCostScenarioSurfaceQuestion({ user, screenContext, message })
      && semanticPlan.authorizationDecision?.status === 'ALLOW') {
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
          provider: 'local-foundation',
          providerSummary: 'room-cost-scenario-surface-question-authorized-route',
          mode: 'RULE_BASED',
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
        resolvedContext: resolved.context,
      });
    }
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
    const canonicalAuthorizationBoundary = buildCanonicalAuthorizationBoundaryResponse({
      user,
      screenContext,
      semanticPlan,
      authorizationDecision: semanticPlan.authorizationDecision,
    });
    if (canonicalAuthorizationBoundary) return canonicalAuthorizationBoundary;
    const canonicalCostIntent = hasCanonicalCostIntent(semanticPlan);
    // Cost routing is frozen in the V3 canonical request before authorization;
    // downstream raw-text analysis cannot take over this decision.
    const requestedDomains = semanticPlan.requestedDomains || [];
    const agreementReconciliationIntent = Array.isArray(semanticPlan.entities)
      && semanticPlan.entities.some((entity) => (
        String(entity?.type || "").toLowerCase() === "agreement"
        && Number(entity?.id) > 0
      ))
      && /(?:hakediş|hakedis|fatura|mutabakat|reconciliation|ödeme|odeme|inceleme)/iu.test(String(message || ""));
    // The ROOM cost-scenarios surface owns its visible "Riskleri sırala"
    // chip.  That explicit current-screen task is authorized by the live
    // route, but older planning still labels it OPERATIONS/SHIFTS instead of
    // COST_ANALYSIS.  Keep the route-bound chip on the canonical cost owner;
    // otherwise the generic screen-risk composer answers without the actual
    // cost preview warnings and missing-data evidence.
    const roomCostScreenRiskIntent = String(user?.role || '').toUpperCase() === 'ROOM'
      && semanticPlan.family === 'RISK_RANKING'
      && semanticPlan.scopeTarget === 'CURRENT_SCREEN'
      && /^\/room\/cost-scenarios$/iu.test(String(screenContext?.path || '').split('?')[0])
      && semanticPlan.authorizationDecision?.status === 'ALLOW';
    const financialScreen = /\/(?:room|company|school|organization)\/(?:financial-operations|operations)\b/i.test(String(screenContext?.path || ""));
    // A selected financial record can still be classified as RISK_RANKING by
    // the broad semantic planner when the user asks a concrete cost question
    // such as "Bu servisin maliyeti ne?". Keep explicit financial metric
    // questions on the canonical cost owner; only explicit risk language stays
    // on the risk owner.
    const explicitSelectedFinancialCostQuestion = hasSelectedFinancialMetricQuestion({ message, screenContext });
    const companyBudgetDraftEvidenceFollowUp = isCompanyBudgetDraftEvidenceFollowUp({ user, screenContext, message });
    const costRouteIntent = canonicalCostIntent
      || platformHistoricalReferenceIntent
      || agreementReconciliationIntent
      || roomCostScreenRiskIntent
      || roomFinancialVehicleRiskIntent
      || explicitSelectedFinancialCostQuestion
      || companyBudgetDraftEvidenceFollowUp;
    const explicitRoleGlobal = semanticPlan.scopeTarget === "ROLE_GLOBAL"
      || semanticPlan.typedRequest?.scopeTarget === "ROLE_GLOBAL"
      || semanticPlan.primaryTask === "ROLE_GLOBAL";
    const selectedRecordAssessmentPlan = isSelectedRecordAssessmentPlan({
      semanticPlan,
      explicitSelectedFinancialCostQuestion,
      agreementReconciliationIntent,
    });
    const roomOffersRiskWithoutSelection = semanticPlan.scopeTarget === "CURRENT_SCREEN"
      && semanticPlan.family === "RISK_RANKING"
      && /\/room\/offers\b/i.test(String(screenContext?.path || ""))
      && !(Array.isArray(semanticPlan.entities) && semanticPlan.entities.some((entity) => String(entity?.type || "").toLowerCase() === "offer" && Number(entity?.id) > 0))
      && !Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0);
    const explicitFinancialMetric = semanticPlan.canonicalRequest?.typedEvidence?.specificity?.financialMetricIdentityEvidence === true;
    const canonicalFinancialSurfaceView = semanticPlan.canonicalRequest?.operation === "VIEW_AUTHORIZED_SURFACE"
      && String(semanticPlan.canonicalRequest?.domain || "").toUpperCase() === "FINANCE"
      && String(semanticPlan.canonicalRequest?.semanticAction?.actionClass || "").toUpperCase() === "VIEW"
      && String(semanticPlan.canonicalRequest?.semanticAction?.objectClass || "").toUpperCase() === "FINANCIAL";
    const costDomainAllowed = costRouteIntent
      && semanticPlan.authorizationDecision?.status === "ALLOW"
      && (
        requestedDomains.some((domain) => ["BUDGET", "FINANCE"].includes(domain))
        // A visible finance starter is an explicit user action on the
        // selected financial record. The semantic planner may classify
        // follow-up wording such as "Bu rakam nereden geliyor?" under the
        // selected shift domain; the live finance surface still proves the
        // cost-analysis owner and scope.
        || (explicitSelectedFinancialCostQuestion
          && financialScreen
          && ["ROOM", "COMPANY", "SCHOOL", "ORGANIZATION"].includes(String(user?.role || "").toUpperCase()))
        || (agreementReconciliationIntent && requestedDomains.includes("AGREEMENTS"))
        || roomFinancialVehicleRiskIntent
        || (semanticPlan.canonicalRequest?.capability === "COST_ANALYSIS" && requestedDomains.some((domain) => ["VEHICLES", "OPERATIONS", "PERSONNEL", "ORGANIZATION_PLANS"].includes(domain)))
        || (semanticPlan.canonicalRequest?.capability === "COST_ANALYSIS" && financialScreen && ["COMPANY", "ROOM", "SCHOOL", "ORGANIZATION"].includes(String(user?.companyKind || user?.role || "").toUpperCase()))
        || hasCanonicalQuoteFloorEvidence(semanticPlan)
        || platformHistoricalReferenceIntent
        || roomCostScreenRiskIntent
        || companyBudgetDraftEvidenceFollowUp
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
    if (costRouteIntent
      && costDomainAllowed
      && !selectedRecordAssessmentPlan
      && !roomOffersRiskWithoutSelection
      && (!explicitRoleGlobal || explicitFinancialMetric || explicitSelectedFinancialCostQuestion || companyBudgetDraftEvidenceFollowUp)
      && (semanticPlan.family !== "SCREEN_CONTEXT" || canonicalFinancialSurfaceView)
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
         resolvedContext: resolved.context,
        scope: resolved.scope,
      });
    }
    const roomSelectedAgreementNextAction = buildRoomSelectedAgreementNextActionResponse({
      user,
      entityType,
      entityId,
      screenContext,
      semanticPlan,
    });
    if (roomSelectedAgreementNextAction) return roomSelectedAgreementNextAction;
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
    const canonicalOperationalRead = ["DIAGNOSE_CURRENT_ISSUE", "ASSESS_CURRENT_SITUATION"].includes(semanticPlan.canonicalRequest?.operation)
      && semanticPlan.canonicalRequest?.domain === 'OPERATIONS';
    const hasExplicitCandidateRecord = Array.isArray(semanticPlan.canonicalRequest?.candidateEntityRefs)
      && semanticPlan.canonicalRequest.candidateEntityRefs.some((candidate) => (
        String(candidate?.type || "").trim().length > 0
        && Number(candidate?.id) > 0
      ));
    const productTeachingContinuation = semanticPlan.family === "CONTINUE_CURRENT_REASONING"
      && ["GENERIC_PRODUCT_HELP", "ROLE_EXPLANATION_HELP"].includes(String(semanticPlan.continuationBasePlan?.family || ""))
      && conversationState?.productTeachingState;
    const accessLinkStatusContext = /\/access-links(?:\/|$)/iu.test(String(screenContext?.path || ""))
      && (
        semanticPlan?.accessLinkStatusIntent === true
        || (Array.isArray(semanticPlan?.requestedFields)
          && semanticPlan.requestedFields.some((field) => String(field?.key || field || "").toUpperCase() === "PASSENGER_LIVE_LINK_STATUS"))
        || /\b(?:canli|canlı|erisim|erişim|baglanti|bağlantı|link|token)\p{L}*\b/iu.test(String(message || ""))
          && /\b(?:durum|aktif|gecerli|geçerli|iptal|suresi|süresi|sona|hala|hâlâ)\p{L}*\b/iu.test(String(message || ""))
        || (Array.isArray(conversationState?.recentMessages)
          && conversationState.recentMessages.some((turn) => {
            const prior = String(turn?.text || "");
            return /\b(?:canli|canlı|erisim|erişim|baglanti|bağlantı|link|token)\p{L}*\b/iu.test(prior)
              && /\b(?:durum|aktif|gecerli|geçerli|iptal|suresi|süresi|sona)\p{L}*\b/iu.test(prior);
          })
          && /\b(?:bu|o|bunun|peki|halen|hala|hâlâ|gecerli|geçerli|aktif|iptal|suresi|süresi|sona|baglanti|bağlantı|link|token)\p{L}*\b/iu.test(String(message || "")))
      );
    const onboardingReviewQueueResponse = await buildSuperAdminOnboardingReviewQueueResponse({
      user,
      screenContext,
      message,
      semanticPlan,
    });
    if (onboardingReviewQueueResponse) return onboardingReviewQueueResponse;
    const fieldAcceptanceReadContext = isSuperAdminFieldAcceptanceReadPlan({
      role: user?.role,
      message,
      screenContext,
    });
    const operationVerificationContextReply = buildOperationVerificationContextReply({
      message,
      screenContext,
    });
    if (operationVerificationContextReply) return operationVerificationContextReply;
    const companyHubContextReply = canonicalAuthorization.status === "ALLOW"
      && !roleScopedTargetDenied
      ? buildCompanyHubContextReply({ message, screenContext, conversationState })
      : null;
    if (companyHubContextReply) {
      return {
        ok: true,
        copilotVersion: "ROUND-10-COMPANY-HUB-CONTEXT",
        generatedAt: new Date().toISOString(),
        intent,
        intentLabel: "Yetkili merkez konumu",
        entityType,
        entityId: Number(entityId),
        entityLabel: screenContext?.label || "Hub",
        provider: "local-company-hub-context",
        providerSummary: "authorized-company-hub-read",
        mode: "RULE_BASED",
        scope: {
          role: String(user?.role || ""),
          companyKind: String(user?.companyKind || ""),
          roomId: user?.roomId ?? null,
          companyId: user?.companyId ?? null,
          summary: "Yalnızca mevcut yetkili Hub kaydının konum alanları okundu; yazma işlemi başlatılmadı.",
        },
        ...companyHubContextReply,
        contextSummary: "Yetkili Hub kaydının mevcut merkez konumu okundu.",
        semanticPlan,
        conversationRoute: "CURRENT_SCREEN_CONTEXT",
        dialogueTopic: "PRODUCT",
        authorizedProductContext: {
          screenPath: String(screenContext?.path || "").split("?")[0],
          screenLabel: screenContext?.label || "Hub",
        },
        readOnly: true,
      };
    }
    const earlyVisibleContextDiagnostic = buildVisibleContextDiagnosticResponse({
      user,
      entityType,
      entityId,
      screenContext,
      message,
      semanticPlan,
    });
    if (earlyVisibleContextDiagnostic) return earlyVisibleContextDiagnostic;
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
        || ["GENERIC_PRODUCT_HELP", "ROLE_EXPLANATION_HELP"].includes(String(semanticPlan.family || "")))
      && !accessLinkStatusContext
      && !canonicalOperationalRead
      && !fieldAcceptanceReadContext
      && !companyBudgetDraftEvidenceFollowUp) {
      return buildGenericProductHelpProjection({ message, semanticPlan, user, screenContext, conversationState });
    }
    if (["OFF_TOPIC_SAFE", "GENERAL_KNOWLEDGE", "LIVE_EXTERNAL_DATA", "UNCLEAR_OR_AMBIGUOUS"].includes(conversationRoute.route)
      && !fieldAcceptanceReadContext) {
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

    // A live vehicle/GPS diagnosis is a visible-context answer, even when the
    // selected record also gives the legacy planner a relation candidate. Keep
    // this narrow, post-authorization route ahead of reasoning/record fallbacks
    // so a current offline signal cannot be replaced by unrelated relation prose.
    const directVehicleDiagnosticCue = isCurrentSituationDiagnosticQuestion(message)
      || /(?:ara[cç]|gps|konum)[^.!?\n]{0,80}(?:durumunu\s+açıkla|neden\s+gör(?:ün|un)m(?:ü|u)yor|gör(?:ün|un)m(?:ü|u)yor)/iu.test(String(message || ''));
    const directVehicleDiagnosticSurface = [
      '/room/vehicles',
      '/room/map',
      '/driver/route',
      '/driver/today',
      '/driver/map',
    ].includes(String(screenContext?.path || '').split('?')[0]);
    const directVehicleDiagnosticSelection = Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) > 0;
    const explicitVehicleRelationRequest = semanticPlan.family === "RELATION_LOOKUP"
      && String(semanticPlan.relationshipIntent?.kind || semanticPlan.typedRequest?.relationType || '').toUpperCase() === 'VEHICLE_TO_DRIVER';
    if (directVehicleDiagnosticCue && directVehicleDiagnosticSurface && directVehicleDiagnosticSelection && !explicitVehicleRelationRequest) {
      const directVisibleDiagnostic = buildVisibleContextDiagnosticResponse({ user, entityType, entityId, screenContext, message, semanticPlan });
      if (directVisibleDiagnostic) return directVisibleDiagnostic;
    }

    // Araç Karşılaştır'daki risk chip'i seçili vardiyayı genel operasyon riski
    // olarak değil, aynı finansal senaryonun salt-okunur risk çıktısı olarak
    // değerlendirmelidir. Yetkilendirme kararı geçerli olmadan bu erken yol
    // çalışmaz.
    if (roomFinancialVehicleRiskIntent && semanticPlan.authorizationDecision?.status === "ALLOW") {
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
          providerSummary: "cost-analysis-vehicle-risk-authorized-route",
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
        resolvedContext: resolved.context,
        scope: resolved.scope,
      });
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
    const roomCapabilityBoundaryContinuation = semanticPlan.family === 'UI_GUIDANCE'
      && String(semanticPlan.roleCapabilityBoundary || '').toUpperCase() === 'ROOM_CREATE_UNSUPPORTED'
      && semanticPlan.typedRequest?.continuationIntent === true
      && String(semanticPlan.typedRequest?.continuationAction || semanticPlan.continuationAction || '').toUpperCase() === 'CONTINUE';
    // A canonical screen-context question is already an authorized UI-help
    // decision.  Let the screen-aware composer explain the real surface;
    // the cross-domain reasoning path otherwise collapses it to a one-line
    // situation summary before the richer UI guidance can run.
    const directSelectedMetricQuestion = (() => {
      const path = String(screenContext?.path || '').split('?')[0];
      const role = String(user?.role || '').toUpperCase();
      const text = String(message || '').toLocaleLowerCase('tr-TR');
      const asksOpenAlarm = /açık alarm|acık alarm|alarm sayısı|alarm sayisi|açık sorun|acık sorun|sorun sayısı|sorun sayisi/.test(text);
      const asksActiveService = /aktif servis|aktif servis sayısı|aktif servis sayisi|servis sayısı|servis sayisi/.test(text);
      return (role === 'SUPER_ADMIN' && path === '/superadmin/observability' && asksOpenAlarm)
        || (role === 'ORGANIZATION' && path === '/organization/operations' && asksActiveService);
    })();
    const currentSurfaceGuidance = directSelectedMetricQuestion || Boolean(
      screenContext?.path
      && (!semanticPlan.workflowIntent || roomCapabilityBoundaryContinuation)
      && (!hasExplicitCandidateRecord || semanticPlan.family === "CONTEXTUAL_PUBLIC_TYPE")
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
          || semanticPlan.typedRequest?.taskType === "NEXT_ACTION"
        ))
      ),
    );
    const screenScopedNextAction = semanticPlan.family === "UI_GUIDANCE"
      && semanticPlan.typedRequest?.taskType === "NEXT_ACTION";
    const contextualMissingDataRequest = semanticPlan.family === "CONTEXTUAL_PUBLIC_TYPE"
      && semanticPlan.publicQuestionType === "MISSING_DATA_HELP"
      && Array.isArray(semanticPlan.entities)
      && semanticPlan.entities.length === 1
      && Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) > 0
      && String(semanticPlan.entities[0]?.type || '').toLowerCase() === String(screenContext?.selectedEntityType || '').toLowerCase();
    // A selected-record missing-data question may arrive as a FIELD_LOOKUP
    // envelope when the user names several operational fields.  The canonical
    // planner has already resolved that request to the live selected record;
    // keep it on the evidence-aware screen composer instead of allowing the
    // generic awareness/query fallback to replace it with a field clarification.
    const selectedRecordEvidenceGuidance = contextualMissingDataRequest;
    // A ROOM capability-boundary continuation is still a current-surface
    // guidance turn.  Its SHIFTS domain is already authorized by the
    // canonical plan, but the response must go through the screen-aware
    // composer so it can offer the nearest read-only action instead of
    // repeating the generic domain snapshot.
    const parentLiveLocationHelp = semanticPlan.family === "CONTEXTUAL_PUBLIC_TYPE"
      && semanticPlan.publicQuestionType === "LOCATION_HELP"
      && String(screenContext?.path || "").split("?")[0] === "/parent/live";
    const accessLinkStatusFollowUp = accessLinkStatusContext;
    const genericCurrentSurfaceGuidance = !accessLinkStatusFollowUp && (roomCapabilityBoundaryContinuation
      || parentLiveLocationHelp
      || ((currentSurfaceGuidance || selectedRecordEvidenceGuidance) && !domainScopedGuidance));
    const screenContextHelp = genericCurrentSurfaceGuidance
      && !(semanticPlan.requestedDomains || []).length;
    const selectedRecordContextRequest = semanticPlan.typedRequest?.taskType === "SELECTED_RECORD_CONTEXT"
      // Contextual missing-data questions are already narrowed to the live
      // selected record by the canonical planner. Keep them on the evidence-
      // aware composer instead of letting the generic reasoning lane replace
      // the typed question with a role-level explanation.
      || contextualMissingDataRequest;
    const relationRecordRequest = semanticPlan.family === "RELATION_LOOKUP"
      && Boolean(semanticPlan.relationshipIntent);
    const operationHealthIssuePlan = (/(?:^|\/)operation-health$/iu.test(String(screenContext?.path || '').split('?')[0])
      || /operasyon\s+sağlığı/iu.test(String(screenContext?.label || '')))
      && (semanticPlan.family === 'ISSUE_DIAGNOSTIC'
        || semanticPlan.canonicalRequest?.operation === 'DIAGNOSE_CURRENT_ISSUE');
    const crossSurfaceOperationHealthIssuePlan = String(user?.role || '').toUpperCase() === 'ROOM'
      && (semanticPlan.family === 'ISSUE_DIAGNOSTIC'
        || semanticPlan.canonicalRequest?.operation === 'DIAGNOSE_CURRENT_ISSUE')
      && (semanticPlan.requestedDomains || []).includes('OPERATIONS');
    const reasoningAnswer = roomFinancialVehicleRiskIntent
      ? null
      : crossSurfaceOperationHealthIssuePlan
      ? null
      : canonicalOperationalRead
      ? null
      : workflowGuidance || parentLiveLocationHelp || (screenContextHelp && !operationHealthIssuePlan) || screenScopedNextAction || (hasExplicitCandidateRecord && !selectedRecordContextRequest && !selectedRecordAssessmentPlan && !relationRecordRequest)
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
      const reasoningNavigationTarget = resolveAuthorizedReasoningNavigationTarget({
        user,
        semanticPlan,
        screenContext,
        message,
      });
      const reasoningQuickActions = reasoningNavigationTarget?.path
        ? [{
          actionKind: "OPEN_ROUTE",
          label: `${reasoningNavigationTarget.label || "Yetkili ekran"} ekranına git`,
          path: reasoningNavigationTarget.path,
          safeNavigation: true,
          criticalActionExecution: false,
        }]
        : [];
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
        quickActions: reasoningQuickActions,
        followUpPrompt: "Devamını anlat",
      };
    }

    const visibleContextPlan = semanticPlan;
    const retainedProductResult = Boolean(conversationState?.lastSettledResult?.semanticPlan || conversationState?.authorizedProductContext?.semanticPlan);
    const currentVehicleDiagnosticMessage = isCurrentSituationDiagnosticQuestion(message)
      || /(?:ara[cç]|gps|konum)[^.!?\n]{0,80}(?:durumunu\s+açıkla|neden\s+gör(?:ün|un)m(?:ü|u)yor|gör(?:ün|un)m(?:ü|u)yor)/iu.test(String(message || ''));
    const selectedVehicleDiagnostic = ['/room/vehicles', '/driver/route', '/driver/today', '/driver/map'].includes(String(screenContext?.path || '').split('?')[0])
      && String(screenContext?.selectedEntityType || '').trim().toLowerCase() === 'vehicle'
      && Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) > 0
      && currentVehicleDiagnosticMessage;
    const selectedMapVehicleDiagnostic = ['/room/map', '/driver/route', '/driver/today', '/driver/map'].includes(String(screenContext?.path || '').split('?')[0])
      && Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) > 0
      && currentVehicleDiagnosticMessage;
    const selectedLiveVehicleDiagnostic = selectedVehicleDiagnostic || selectedMapVehicleDiagnostic;
    const visibleContextDiagnostic = !operationHealthIssuePlan && !crossSurfaceOperationHealthIssuePlan
      && !explicitVehicleRelationRequest
      && !accessLinkStatusFollowUp
      && (semanticPlan.family !== "SCREEN_CONTEXT" || selectedLiveVehicleDiagnostic)
      && (!hasExplicitCandidateRecord || selectedLiveVehicleDiagnostic)
      && (!retainedProductResult
        || ["CURRENT_SITUATION", "LOCATION_GPS", "ETA"].includes(visibleContextPlan.family)
        || selectedLiveVehicleDiagnostic)
      ? buildVisibleContextDiagnosticResponse({ user, entityType, entityId, screenContext, message, semanticPlan })
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
    const unsupportedCompanyAdminSurface = ["UNSUPPORTED_COMPANY_ADMIN_SURFACE", "UNSPECIFIED_DISABLED_FIELD"].includes(String(semanticPlan.workflowIntent || ""))
      && String(user?.role || "").toUpperCase() === "COMPANY";
    const productAwareness = genericCurrentSurfaceGuidance
      && !relationRecordRequest
      && !unsupportedCompanyAdminSurface
      ? null
      : await buildAuthorizedProductAwarenessAnswer({ user, message, screenContext, conversationState, semanticPlan });
    const productAwarenessResponse = buildProductAwarenessResponse({
      awareness: productAwareness,
      user,
      entityType,
      entityId,
      screenContext,
      message,
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
      const costRequest = costRouteIntent
        ? detectCostAnalysisIntent({ message, screenContext, conversationState })
        : { isCostAnalysis: false };
      const legacyGuideMismatch = ["JOB_TYPE_ENTITY_MISMATCH", "UNSUPPORTED_JOB_TYPE"].includes(String(error?.code || ""));
      if (!costRouteIntent || (!costRequest.isCostAnalysis && !agreementReconciliationIntent) || !legacyGuideMismatch) throw error;
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
    if (!costRouteIntent) {
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
       resolvedContext: resolved.context,
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
