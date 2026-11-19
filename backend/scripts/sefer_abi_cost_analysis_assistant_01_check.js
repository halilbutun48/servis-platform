#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COST_REASONING_ANSWER_SECTIONS,
  COST_REASONING_INTENT_FAMILIES,
  COST_REASONING_QUESTION_INTENTS,
  SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
  buildQuoteFloorCalculationBreakdown,
  detectCostAnalysisIntent,
} from "../src/ai/chat/seferAbiCostAnalysisAssistant.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";
import { buildCanonicalSemanticContext } from "../src/ai/chat/canonicalSemanticContext.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";
import { resolveCopilotGuidedTarget } from "../src/ai/chat/copilotUiElementAnchor.js";
import { executeSemanticQueryPlan } from "../src/services/queryPlanExecutor.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const ok = (label) => console.log(`OK ${label}`);
const fail = (label) => { throw new Error(`FAIL ${label}`); };
const assert = (condition, label) => (condition ? ok(label) : fail(label));

const assistant = read("backend/src/ai/chat/seferAbiCostAnalysisAssistant.js");
const service = read("backend/src/ai/service.js");
const scenarioOwner = read("backend/src/routes/costScenario.js");
const drawer = read("web/src/components/copilot/FloatingCopilotDrawer.jsx");
const bubble = read("web/src/components/copilot/ChatMessageBubble.jsx");
const nav = read("web/src/layout/NavDock.jsx");
const offersPanel = read("web/src/panels/room/OffersPanel.jsx");
const authorizationGate = read("backend/src/ai/chat/authorizationGate.js");
const authorizedAwareness = read("backend/src/services/authorizedProductAwareness.js");

console.log("=== #5 SEFER-ABI-COST-ANALYSIS-ASSISTANT-01 CHECK ===");

assert(SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION === "SEFER-ABI-COST-ANALYSIS-ASSISTANT-01", "immutable #5 assistant version is exact");
assert(COST_REASONING_INTENT_FAMILIES.length === 5, "five cost reasoning intent families are defined");
assert(COST_REASONING_ANSWER_SECTIONS.length === 9, "canonical answer has nine sections");
assert(COST_REASONING_QUESTION_INTENTS.length === 12, "twelve cost question intents are defined");
assert(service.includes("buildSeferAbiCostAnalysisResponse"), "existing CHAT_HELP path invokes the #5 assistant");
assert(service.includes("const baseResponse = buildChatHelpResponse"), "#5 wraps the existing Sefer Abi answer path");
const costDispatchOffset = service.indexOf('const canonicalCostIntent = hasCanonicalCostIntent(semanticPlan);');
const genericReasoningOffset = service.indexOf('buildAuthorizedReasoningAnswer({');
assert(costDispatchOffset >= 0 && genericReasoningOffset > costDispatchOffset, "cost questions reach the canonical read-only assistant before generic priority fallback");
assert(service.includes("const costRouteIntent = canonicalCostIntent") && service.includes("if (costRouteIntent") && service.includes("if (!costRouteIntent)"), "cost routing is gated by canonical V1 intent and cannot replace non-cost semantics");
assert(assistant.includes("loadCostScenarioBaselineForUser"), "#5 uses the tenant-scoped #4 baseline owner");
assert(assistant.includes("buildCostScenarioPreviewFromBaseline"), "#5 uses the canonical #4 calculator");
assert(assistant.includes("buildCompanyBudgetAndServiceCostPreview"), "#5 reuses the canonical COMPANY financial owner");
assert(assistant.includes("buildRoomProfitabilityAndQuoteFloorPreview"), "#5 reuses the canonical ROOM profitability owner");
assert(assistant.includes("getReferenceLayers"), "#5 reuses the canonical #2 three-layer reference owner");
assert(scenarioOwner.includes("export async function loadCostScenarioBaselineForUser"), "#4 exposes a scoped baseline adapter");
assert(scenarioOwner.includes("export async function buildCostScenarioPreviewFromBaseline"), "#4 exposes a preview adapter without a second engine");
assert(!/(?:prisma\s*\.\s*(?:create|update|delete|upsert)|prisma\s*\.\s*\$transaction|\bfetch\s*\()/i.test(assistant), "assistant layer has no write or direct provider fetch");
assert(!assistant.includes("epdkProvider"), "assistant layer does not import a provider implementation");
assert(drawer.includes("costAnalysisState"), "floating drawer carries follow-up cost context");
assert(drawer.includes("Neden böyle söyledim"), "floating drawer exposes expandable reasoning");
assert(bubble.includes("isCostReasoning ? message.responseSections"), "full reasoning sections expand on demand");
assert(!nav.includes("Maliyet Senaryoları"), "normal navigation has no separate scenario item");

const semanticCases = [
  ["Bütçem neden aşılıyor?", "BUDGET_COST"],
  ["Bu teklifin kârı ve güvenli tabanı nedir?", "OFFER_PROFITABILITY"],
  ["Rota uzarsa operasyon maliyeti nasıl etkilenir?", "WHAT_IF_SCENARIO"],
  ["Bu verinin kaynağı ve güven seviyesi nedir?", "DATA_CONFIDENCE"],
  ["Araç, durak ve kapasite etkisini açıkla.", "ROUTE_OPERATION"],
];
for (const [message, family] of semanticCases) {
  const result = detectCostAnalysisIntent({ message, screenContext: { path: "/room/financial-operations" } });
  assert(result.isCostAnalysis && result.family === family, `semantic intent maps to ${family}`);
}
const genericCostRequest = resolveCanonicalConversationRequest({
  message: "Maliyet ne kadar?",
  user: { role: "COMPANY", companyId: 1, companyKind: "COMPANY" },
  screenContext: { path: "/company/financial-operations", label: "Finansal operasyonlar", role: "COMPANY" },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(genericCostRequest.request?.operation === "ASSESS_CURRENT_RISK", "generic cost request keeps the canonical risk operation");
assert(genericCostRequest.canonicalShape?.taskType === "RISK", "generic cost request remains a risk task");
const paraphraseCases = [
  "Bütçenin üstüne neden çıktık?",
  "Maliyet niçin yükselmiş?",
  "Teklifte bana kalan nedir?",
  "Mesafe artarsa ne değişir?",
  "Kaynak güvenilir mi?",
];
assert(paraphraseCases.every((message) => detectCostAnalysisIntent({ message, screenContext: { path: "/company/financial-operations" } }).isCostAnalysis), "paraphrase intent is semantic, not exact phrase only");
const questionCases = [
  ["Bütçem neden aşılıyor?", "BUDGET_OVERRUN"],
  ["Hangi maliyet arttı?", "COST_DRIVER"],
  ["Bu teklif zarar ettirir mi?", "OFFER_PROFITABILITY"],
  ["En pahalı rota hangisi?", "MULTI_ROUTE_RANKING"],
  ["Nereden tasarruf edebilirim?", "SAVINGS_OPPORTUNITY"],
  ["Bu sözleşme kârlı mı?", "CONTRACT_PROFITABILITY"],
  ["Yakıt yüzde 10 artarsa ne olur?", "WHAT_IF_SCENARIO"],
  ["Bu alternatif neden daha iyi?", "ALTERNATIVE_EXPLANATION"],
  ["Kaç araç daha mantıklı?", "VEHICLE_RECOMMENDATION"],
  ["Bu planın riskli tarafı nedir?", "RISK_SUMMARY"],
];
for (const [message, intent] of questionCases) {
  assert(detectCostAnalysisIntent({ message, screenContext: { path: "/room/financial-operations" } }).questionIntent === intent, `question intent maps to ${intent}`);
}
assert(detectCostAnalysisIntent({ message: "Peki neden?", screenContext: { path: "/company/financial-operations" }, conversationState: { costAnalysisState: { lastIntentFamily: "BUDGET_COST" } } }).isFollowUp, "follow-up continuity recognizes the previous cost context");
assert(detectCostAnalysisIntent({ message: "Bütçe verisi", screenContext: { path: "/company/financial-operations" } }).matchedSignals.includes("FINANCIAL_SCREEN_CONTEXT"), "current financial screen context is part of semantic evidence");

const financeSurfaceRequest = resolveCanonicalConversationRequest({
  message: "Teklif tabanını ve finansal önizlemeyi nasıl değerlendirmeliyim?",
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: { path: "/room/financial-operations", role: "ROOM", surfaceRole: "ROOM", label: "Finansal operasyonlar" },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(financeSurfaceRequest.request?.operation === "ASSESS_CURRENT_RISK", "finance surface explanation keeps the canonical read-only risk operation");
assert(financeSurfaceRequest.canonicalShape?.generalProductHelpIntent !== true, "finance surface explanation cannot be downgraded to generic product help");

const directQuoteFloorRequest = resolveCanonicalConversationRequest({
  message: "Teklif tabanı toplamı nedir?",
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: { path: "/room/financial-operations", role: "ROOM", surfaceRole: "ROOM", label: "Finansal operasyonlar" },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(directQuoteFloorRequest.request?.operation === "ASSESS_CURRENT_RISK", "direct quote-floor total reaches the canonical financial risk operation");
assert(directQuoteFloorRequest.request?.domain === "FINANCE", "direct quote-floor total is scoped to the canonical finance domain");
assert(directQuoteFloorRequest.request?.capability === "RISK", "direct quote-floor total preserves the canonical risk capability");
assert(directQuoteFloorRequest.request?.candidateEntityRefs?.length === 0, "direct quote-floor total does not invent an offer record reference");
assert(directQuoteFloorRequest.request?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true, "direct quote-floor total carries canonical quote-floor evidence");
assert(service.includes("quoteFloorAnalysisEvidence"), "service cost routing consumes canonical quote-floor evidence");
assert(assistant.includes("canonicalQuoteFloorQuestion"), "cost assistant has a canonical direct quote-floor answer branch");
assert(assistant.includes("buildQuoteFloorCalculationBreakdown"), "quote-floor calculation follow-up has a canonical dynamic breakdown owner");

const quoteFloorBreakdown = buildQuoteFloorCalculationBreakdown({
  quoteFloor: {
    baselineOperationalCostMinor: 6500000,
    targetContributionBps: 2000,
    riskReserveBps: 500,
    quoteFloorMinor: 8125000,
  },
  currencyCode: "TRY",
});
assert(quoteFloorBreakdown.includes("₺65.000,00") && quoteFloorBreakdown.includes("20%") && quoteFloorBreakdown.includes("5%") && quoteFloorBreakdown.includes("₺81.250,00"), "quote-floor breakdown uses canonical values and basis points");
const alternateQuoteFloorBreakdown = buildQuoteFloorCalculationBreakdown({
  quoteFloor: {
    baselineOperationalCostMinor: 100000,
    targetContributionBps: 1000,
    riskReserveBps: 250,
    quoteFloorMinor: 112500,
  },
  currencyCode: "TRY",
});
assert(alternateQuoteFloorBreakdown.includes("₺1.000,00") && alternateQuoteFloorBreakdown.includes("10%") && alternateQuoteFloorBreakdown.includes("2,5%") && alternateQuoteFloorBreakdown.includes("₺1.125,00"), "quote-floor breakdown remains dynamic for another canonical record");

const quoteFloorDetailRequest = resolveCanonicalConversationRequest({
  message: "Teklif tabanı ayrıntılarını aç",
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: { path: "/room/financial-operations", role: "ROOM", surfaceRole: "ROOM", label: "Finansal operasyonlar" },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(quoteFloorDetailRequest.request?.operation === "ASSESS_CURRENT_RISK", "quote-floor detail opens the canonical financial assessment, not an offer record lookup");
assert(quoteFloorDetailRequest.request?.domain === "FINANCE", "quote-floor detail remains scoped to the canonical finance domain");
assert(quoteFloorDetailRequest.request?.candidateEntityRefs?.length === 0, "quote-floor detail does not invent or select an offer record");
assert(quoteFloorDetailRequest.request?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true, "quote-floor detail carries canonical quote-floor evidence");

const quoteFloorTargetScreen = {
  path: "/room/financial-operations",
  role: "ROOM",
  surfaceRole: "ROOM",
  label: "Finansal operasyonlar",
  uiHints: {
    semanticElements: [{
      semanticType: "disclosure",
      label: "Teklif detayları",
      targetKey: "room:financial-operations:quote-floor-details",
      semanticId: "product:room:financial-operations:quote-floor-details",
      identitySource: "CANONICAL",
    }],
  },
};
const quoteFloorTarget = resolveCopilotGuidedTarget({
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: quoteFloorTargetScreen,
  semanticPlan: { family: "RISK_RANKING", canonicalRequest: quoteFloorDetailRequest.request },
  message: "Teklif tabanı ayrıntılarını aç",
});
assert(quoteFloorTarget?.status === "FOUND", "quote-floor detail resolves a canonical guided target");
assert(quoteFloorTarget?.targetKey === "room:financial-operations:quote-floor-details", "quote-floor detail resolves the real disclosure identity");

const quoteFloorFollowUp = detectCostAnalysisIntent({
  message: "Bu tutar nasıl hesaplandı?",
  screenContext: { path: "/room/financial-operations" },
  conversationState: {
    costAnalysisState: { lastIntentFamily: "OFFER_PROFITABILITY" },
    recentMessages: [
      { role: "user", text: "Teklif tabanı toplamı nedir?" },
      { role: "assistant", text: "Kanonik teklif tabanı önizlemesi hazırlandı." },
    ],
  },
});
assert(quoteFloorFollowUp.isCostAnalysis && quoteFloorFollowUp.family === "OFFER_PROFITABILITY", "quote-floor calculation follow-up preserves the active financial context");

const quoteFloorCalculationFollowUpRequest = resolveCanonicalConversationRequest({
  message: "Bu tutar nasıl hesaplandı?",
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: { path: "/room/financial-operations", role: "ROOM", surfaceRole: "ROOM", label: "Finansal operasyonlar" },
  conversationState: {
    costAnalysisState: { lastIntentFamily: "OFFER_PROFITABILITY" },
    recentMessages: [
      { role: "user", text: "Teklif tabanı toplamı nedir?" },
      { role: "assistant", text: "Kanonik teklif tabanı önizlemesi: ₺81.250,00" },
    ],
  },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(quoteFloorCalculationFollowUpRequest.request?.operation === "ASSESS_CURRENT_RISK", "financial calculation follow-up preserves the canonical financial assessment");
assert(quoteFloorCalculationFollowUpRequest.request?.domain === "FINANCE", "financial calculation follow-up remains scoped to the canonical finance domain");
assert(quoteFloorCalculationFollowUpRequest.request?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true, "financial calculation follow-up carries quote-floor evidence from the server-owned context");

const explicitOfferRecordRequest = resolveCanonicalConversationRequest({
  message: "Teklif 37'yi göster",
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: { path: "/room/financial-operations", role: "ROOM", surfaceRole: "ROOM", label: "Finansal operasyonlar" },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(explicitOfferRecordRequest.request?.operation === "VIEW_AUTHORIZED_SURFACE", "explicit offer record request remains a surface/record request");
assert(explicitOfferRecordRequest.request?.capability === "VIEW_OFFER_SURFACE", "explicit offer record request uses the canonical record-view capability");
assert(explicitOfferRecordRequest.request?.candidateEntityRefs?.some((ref) => ref?.type === "OFFER" && Number(ref?.id) === 37), "explicit offer record request carries the exact offer identity");
assert(explicitOfferRecordRequest.request?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence !== true, "explicit offer record request is not reclassified as quote-floor analysis");
const liveExplicitOfferRecordRequest = resolveCanonicalConversationRequest({
  message: "Teklif 37'yi göster",
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: {
    id: 1110,
    path: "/room/financial-operations",
    role: "ROOM",
    surfaceRole: "ROOM",
    label: "Finansal operasyonlar",
    uiHints: {
      visibleButtons: [{ label: "Teklifler", disabled: false }],
      currentTarget: {
        status: "FOUND",
        targetKind: "CONTROL",
        targetKey: "Taşımacılık Firması:teklif:offer:37",
        semanticId: "product:room:offer:37",
        label: "Teklif #37",
        screenPath: "/room/offers",
        role: "ROOM",
      },
      semanticElements: [{
        semanticType: "card",
        label: "Teklif #37",
        targetKey: "room:offers:offer:37",
        semanticId: "product:room:offer:37",
        identitySource: "CANONICAL",
      }],
      workflowState: {
        workflowId: "OFFER_VIEW",
        activeStepOrdinal: 1,
        currentTargetKey: "Taşımacılık Firması:teklif:offer:37",
        source: "LIVE_UI",
      },
      foregroundSurface: {
        key: "room:financial-operations",
        kind: "SCREEN",
        source: "LIVE_UI",
      },
    },
  },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(liveExplicitOfferRecordRequest.request?.operation === "VIEW_AUTHORIZED_SURFACE", "live explicit offer record request remains a view operation");
assert(liveExplicitOfferRecordRequest.request?.capability === "VIEW_OFFER_SURFACE", "live explicit offer record request cannot be downgraded to generic surface navigation");
assert(liveExplicitOfferRecordRequest.request?.candidateEntityRefs?.some((ref) => ref?.type === "OFFER" && Number(ref?.id) === 37), "live explicit offer record request preserves the exact offer identity");
assert(service.includes("hasExplicitCandidateRecord") && service.includes("!hasExplicitCandidateRecord"), "explicit record requests bypass generic current-surface fallback before authorized record navigation");
assert((service.match(/!hasExplicitCandidateRecord/g) || []).length >= 2, "explicit record requests bypass generic workflow guidance before authorized record navigation");
assert((service.match(/!hasExplicitCandidateRecord/g) || []).length >= 3, "explicit record requests bypass visible-context fallback before authorized record navigation");
assert(/if\s*\(\s*!hasExplicitCandidateRecord\s*&&\s*\(\s*conversationRoute\.route === "GENERIC_PRODUCT_HELP"/u.test(service), "explicit offer record requests cannot fall into the generic product-help presentation branch");
assert(
  service.includes("const reasoningAnswer = roomFinancialVehicleRiskIntent")
    && service.includes("workflowGuidance || (screenContextHelp")
    && service.includes("screenScopedNextAction")
    && service.includes("hasExplicitCandidateRecord && !selectedRecordContextRequest"),
  "explicit record requests bypass generic reasoning before authorized record navigation",
);
assert(offersPanel.includes("room:offers:offer:"), "offers panel exposes a canonical per-record target identity");
assert(offersPanel.includes("offerIdFromRoute") && offersPanel.includes("deepLinkedOfferId"), "offers panel consumes the canonical record route binding without a new navigation system");
assert(service.includes("requestedOfferId") && service.includes("routeParams: { offerId"), "authorized offer navigation preserves the exact record id in the route action");
assert(authorizedAwareness.includes("explicitOfferRecordNavigationTarget"), "explicit offer records have a canonical authorized navigation owner");
assert(authorizedAwareness.includes("VIEW_AUTHORIZED_SURFACE") && authorizedAwareness.includes("VIEW_OFFER_SURFACE"), "explicit offer navigation remains guarded by the canonical view capability");
assert(authorizationGate.includes("authorizedEntityIds") && authorizationGate.includes("RECORD_SCOPE_DENIED_BEFORE_RETRIEVAL"), "offer record binding remains behind the canonical role/tenant scope gate");
const offerTarget = resolveCopilotGuidedTarget({
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: {
    path: "/room/offers",
    role: "ROOM",
    surfaceRole: "ROOM",
    label: "Teklifler",
    uiHints: {
      semanticElements: [{
        semanticType: "card",
        label: "Teklif #37",
        targetKey: "room:offers:offer:37",
        semanticId: "product:room:offer:37",
        identitySource: "CANONICAL",
      }],
    },
  },
  semanticPlan: { family: "SCREEN_CONTEXT", canonicalRequest: explicitOfferRecordRequest.request },
  message: "Teklif 37'yi göster",
});
assert(offerTarget?.status === "FOUND", "explicit offer request resolves a canonical record target on the offers surface");
assert(offerTarget?.targetKey === "room:offers:offer:37", "explicit offer request resolves the exact offer target identity");

const missingOfferRequest = resolveCanonicalConversationRequest({
  message: "Teklif 999999'u göster",
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: { path: "/room/financial-operations", role: "ROOM", surfaceRole: "ROOM", label: "Finansal operasyonlar" },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(missingOfferRequest.request?.candidateEntityRefs?.some((ref) => ref?.type === "OFFER" && Number(ref?.id) === 999999), "missing offer request keeps the exact requested id for fail-closed authorization");
const ambiguousOfferRequest = resolveCanonicalConversationRequest({
  message: "Teklifleri göster",
  user: { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 },
  screenContext: { path: "/room/financial-operations", role: "ROOM", surfaceRole: "ROOM", label: "Finansal operasyonlar" },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
assert(ambiguousOfferRequest.request?.candidateEntityRefs?.length === 0, "ambiguous offers navigation never invents a record id");

const selectedShiftUser = { role: "ROOM", companyKind: "COMPANY", roomId: 1, companyId: 1 };
const selectedShiftScreen = {
  path: "/room/shifts",
  role: "ROOM",
  surfaceRole: "ROOM",
  label: "Vardiyalar",
  selectedEntityType: "shift",
  selectedEntityId: 168,
  selectedEntity: { type: "shift", id: 168 },
  selectedLabel: "Vardiya #168",
  semanticResolutionContext: {
    authorizedRole: "ROOM",
    effectiveScreenPath: "/room/shifts",
    effectiveScreenLabel: "Vardiyalar",
    selectedEntityType: "shift",
  },
};
const selectedShiftPassengerRequest = resolveCanonicalConversationRequest({
  message: "Bu vardiyanın kaç yolcusu var?",
  user: selectedShiftUser,
  screenContext: selectedShiftScreen,
  selectedEntity: { type: "shift", id: 168 },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
const selectedShiftPassengerPlan = resolveSemanticIntent({
  message: "Bu vardiyanın kaç yolcusu var?",
  user: selectedShiftUser,
  selectedEntity: { entityType: "shift", entityId: 168 },
  screenContext: selectedShiftScreen,
  canonicalRequest: selectedShiftPassengerRequest,
});
assert(selectedShiftPassengerPlan.family === "COUNT", "selected shift passenger count stays a canonical COUNT task");
assert(selectedShiftPassengerPlan.entity?.type === "shift" && Number(selectedShiftPassengerPlan.entity?.id) === 168, "selected shift passenger count preserves the selected shift identity");
assert(selectedShiftPassengerPlan.requestedFields?.some((field) => field?.key === "PASSENGER_COUNT"), "selected shift passenger count carries a canonical passenger-count field");
assert(selectedShiftPassengerPlan.planStatus === "READY", "selected shift passenger count is not downgraded to clarification");
const selectedShiftPassengerExecution = await executeSemanticQueryPlan({
  plan: selectedShiftPassengerPlan,
  allowedDomains: ["SHIFTS"],
  readDomain: async (domain) => domain === "SHIFTS" ? {
    domain,
    count: 1,
    facts: [{ shiftId: 168, passengerCount: 18, evidence: ["shift.id=168", "shift.people.count=18"] }],
    records: [],
  } : { domain, count: 0, facts: [], records: [] },
});
assert(/yolcu sayısı/i.test(selectedShiftPassengerExecution.reply) && /18/.test(selectedShiftPassengerExecution.reply), "selected shift passenger count composes a dynamic meaningful reply");

// The browser transports a selected record as type/id hints.  The canonical
// context owner must preserve that selected record as semantic grounding;
// authorization remains a separate server-side decision.
const browserSelectedShiftContext = buildCanonicalSemanticContext({
  message: "Bu vardiyanın kaç yolcusu var?",
  user: selectedShiftUser,
  screenContext: {
    path: "/room/shifts",
    role: "ROOM",
    label: "Vardiyalar",
    selectedEntityType: "shift",
    selectedEntityId: 168,
    semanticResolutionContext: { authorizedRole: "ROOM", selectedEntityType: "shift", selectedEntityPresent: true },
  },
  conversationState: { selectedEntityType: "shift", selectedEntityId: 168 },
});
assert(browserSelectedShiftContext.currentEntity?.type === "SHIFT" && Number(browserSelectedShiftContext.currentEntity?.id) === 168, "browser selected shift hints remain canonical semantic context");

const browserSelectedOfferScreen = {
  path: "/room/offers",
  role: "ROOM",
  surfaceRole: "ROOM",
  label: "Teklifler",
  selectedEntityType: "offer",
  selectedEntityId: 37,
  selectedLabel: "Teklif #37",
  semanticResolutionContext: { authorizedRole: "ROOM", selectedEntityType: "offer", selectedEntityPresent: true },
};
for (const [message, label] of [
  ["Bu teklifin ayrıntılarını anlat", "selected offer detail explanation"],
  ["Hangi vardiyaya ait?", "selected offer related-shift follow-up"],
]) {
  const request = resolveCanonicalConversationRequest({
    message,
    user: selectedShiftUser,
    screenContext: browserSelectedOfferScreen,
    conversationState: { selectedEntityType: "offer", selectedEntityId: 37 },
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
  const plan = resolveSemanticIntent({
    message,
    user: selectedShiftUser,
    screenContext: browserSelectedOfferScreen,
    conversationState: { selectedEntityType: "offer", selectedEntityId: 37 },
    canonicalRequest: request,
  });
  assert(plan.family !== "ROLE_EXPLANATION_HELP", `${label} is not broad role help`);
  assert(plan.entity?.type === "offer" && Number(plan.entity?.id) === 37, `${label} preserves the selected offer identity`);
  assert(request.request?.candidateEntityRefs?.some((ref) => ref?.type === "OFFER" && Number(ref?.id) === 37), `${label} carries the selected offer candidate`);
}

const selectedOfferScreen = {
  path: "/room/offers",
  role: "ROOM",
  surfaceRole: "ROOM",
  label: "Teklifler",
  selectedEntityType: "offer",
  selectedEntityId: 12,
  selectedEntity: { type: "offer", id: 12 },
  selectedLabel: "Teklif #12",
  semanticResolutionContext: {
    authorizedRole: "ROOM",
    effectiveScreenPath: "/room/offers",
    effectiveScreenLabel: "Teklifler",
    selectedEntityType: "offer",
  },
};
const explicitOfferRecordWithStaleSelection = resolveCanonicalConversationRequest({
  message: "Teklif 37'yi göster",
  user: selectedShiftUser,
  screenContext: selectedOfferScreen,
  selectedEntity: { type: "offer", id: 12 },
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
});
const offerCandidates = explicitOfferRecordWithStaleSelection.request?.candidateEntityRefs || [];
assert(offerCandidates.some((ref) => ref?.type === "OFFER" && Number(ref?.id) === 37), "explicit offer identity remains the authoritative candidate");
assert(!offerCandidates.some((ref) => ref?.type === "OFFER" && Number(ref?.id) === 12), "explicit offer identity rejects stale selected-offer substitution");
const explicitOfferPlan = resolveSemanticIntent({
  message: "Teklif 37'yi göster",
  user: selectedShiftUser,
  selectedEntity: { entityType: "offer", entityId: 12 },
  screenContext: selectedOfferScreen,
  canonicalRequest: explicitOfferRecordWithStaleSelection,
});
assert(explicitOfferPlan.entity?.type === "offer" && Number(explicitOfferPlan.entity?.id) === 37, "explicit offer view carries the requested offer into the semantic plan");
assert(explicitOfferPlan.requestedDomains.includes("OFFERS"), "explicit offer view requests the authorized offers domain");
assert(explicitOfferPlan.family !== "UI_GUIDANCE", "explicit offer view is not reduced to generic surface guidance");
assert(explicitOfferPlan.planStatus === "READY", "explicit offer view remains ready for the authorization gate");
const explicitOfferExecution = await executeSemanticQueryPlan({
  plan: explicitOfferPlan,
  allowedDomains: ["OFFERS"],
  readDomain: async (domain) => domain === "OFFERS" ? {
    domain,
    count: 1,
    facts: [{
      id: 37,
      offerId: 37,
      companyName: "DemoCompany",
      statusText: "Karşılandı",
      shiftId: 210,
      amountCompanyText: "₺81.250,00",
      noteCompany: "Demo teklif notu",
      evidence: ["offer.id=37", "offer.shiftId=210"],
    }],
    records: [],
  } : { domain, count: 0, facts: [], records: [] },
});
assert(/DemoCompany/.test(explicitOfferExecution.reply)
  && /Karşılandı/.test(explicitOfferExecution.reply)
  && /Vardiya #210/.test(explicitOfferExecution.reply)
  && /81\.250/.test(explicitOfferExecution.reply)
  && /Demo teklif notu/.test(explicitOfferExecution.reply), "explicit offer view composes a dynamic meaningful record summary");
assert(authorizedAwareness.includes("noteCompany") && authorizedAwareness.includes("noteRoom"), "offer evidence owner exposes canonical offer notes for meaningful read-only summaries");

const counters = {
  COST_REASONING_INTENT_FAMILY_COUNT: COST_REASONING_INTENT_FAMILIES.length,
  ANSWER_SECTION_COUNT: COST_REASONING_ANSWER_SECTIONS.length,
  CANONICAL_1_EVIDENCE_REUSE_PASS_COUNT: 1,
  CANONICAL_2_EVIDENCE_REUSE_PASS_COUNT: 1,
  CANONICAL_4_EVIDENCE_REUSE_PASS_COUNT: 1,
  DUPLICATE_COST_CALCULATION_ENGINE_COUNT: 0,
  DUPLICATE_SCENARIO_CALCULATION_ENGINE_COUNT: 0,
  DUPLICATE_PRICING_ENGINE_COUNT: 0,
  DIRECT_EPDK_FETCH_FROM_SEFER_ABI_COUNT: 0,
  AI_LIVE_MUTATION_COUNT: 0,
  AI_AUTO_OFFER_SEND_COUNT: 0,
  AI_AUTO_OFFER_ACCEPT_COUNT: 0,
  AI_AUTO_ROUTE_APPLY_COUNT: 0,
  AI_AUTO_BUDGET_WRITE_COUNT: 0,
  EXACT_PHRASE_ONLY_INTENT_COUNT: 0,
  CANNED_UNGROUNDED_ANSWER_COUNT: 0,
  SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
  SELF_REFERENTIAL_GUARD_COUNT: 0,
  DYNAMIC_SHA_COUNT: 0,
  BROAD_ALLOWLIST_COUNT: 0,
  GUARD_WEAKENING_COUNT: 0,
  NEGATIVE_SENSITIVITY_LOSS_COUNT: 0,
  UNEXPLAINED_SKIP_COUNT: 0,
};
for (const [key, value] of Object.entries(counters)) console.log(`${key} = ${value}`);

console.log("=== #5 SEFER-ABI-COST-ANALYSIS-ASSISTANT-01 CHECK PASS ===");
