import { inferRequestedOwnershipScope } from "../src/ai/chat/canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";
import { resolveConversationRoute } from "../src/ai/chat/conversationRouting.js";
import { executeSemanticQueryPlan } from "../src/services/queryPlanExecutor.js";
import { commitCanonicalConversationState, getCanonicalConversationState } from "../src/ai/chat/canonicalConversationState.js";
import { projectAgreementCanonicalRelation } from "../src/services/authorizedProductAwareness.js";
import { buildLuna001CleanLifecycleOracle, evaluateLuna001Contamination } from "./pre_18_luna001_clean_lifecycle_oracle.mjs";

const failures = [];
let assertionCount = 0;
let generatedParaphraseCount = 0;
const check = (name, value, detail = "") => {
  assertionCount += 1;
  if (!value) failures.push({ name, detail });
};
const generated = (cases) => {
  generatedParaphraseCount += cases.length;
  return cases;
};
const user = (role = "ROOM") => ({ role, companyKind: role === "SCHOOL" ? "SCHOOL" : role === "ORGANIZATION" ? "ORGANIZATION" : role === "COMPANY" ? "COMPANY" : "", id: 1, roomId: role === "ROOM" ? 1 : null, companyId: role === "ROOM" ? null : 1 });
const screen = (path, type = "", id = null) => ({ path, label: path, selectedEntityType: type, selectedEntityId: id });
const productPlan = (type = "offer", id = 35, domain = "OFFERS") => ({ dialogueTopic: "PRODUCT", family: "ENTITY_LOOKUP", requestedDomains: [domain], entities: [{ type, id }] });
const productState = (type = "offer", id = 35, domain = "OFFERS") => ({
  authScopeVersion: 0,
  selectedEntityType: type,
  selectedEntityId: id,
  authorizedProductContext: { semanticPlan: productPlan(type, id, domain) },
  lastSettledResult: { semanticPlan: productPlan(type, id, domain), reply: "Yetkili ürün sonucu" },
});
const plan = (message, { role = "ROOM", screenContext = screen("/room/offers", "offer", 35), conversationState = productState() } = {}) => resolveSemanticIntent({ message, user: user(role), screenContext, conversationState });
const fieldKeys = (result) => (result.requestedFields || []).map((field) => field.key);

const buyer = plan("hizmet alan taraf ne girmiş");
check("BUYER_VALUE_FIELD", buyer.typedRequest?.taskType === "FIELD_LOOKUP" && fieldKeys(buyer).includes("SERVICE_BUYER_AMOUNT"), JSON.stringify({ task: buyer.typedRequest?.taskType, fields: fieldKeys(buyer) }));
check("BUYER_NOT_COUNT", buyer.typedRequest?.taskType !== "COUNT", buyer.typedRequest?.taskType);
check("TYPED_REQUEST_DEEP_FROZEN", Object.isFrozen(buyer.typedRequest) && Object.isFrozen(buyer.typedRequest.entityRefs) && Object.isFrozen(buyer.typedRequest.entityRefs[0]), "typed request or nested entity refs are mutable");

const carrier = plan("taşımacı ne vermiş");
check("CARRIER_VALUE_FIELD", carrier.typedRequest?.taskType === "FIELD_LOOKUP" && fieldKeys(carrier).includes("CARRIER_AMOUNT"), JSON.stringify({ task: carrier.typedRequest?.taskType, fields: fieldKeys(carrier) }));

const count = plan("kaç açık teklif var", { screenContext: screen("/room/offers"), conversationState: {} });
check("CARDINALITY_COUNT", count.typedRequest?.taskType === "COUNT" && count.typedRequest?.countTarget?.targetEntityType === "OFFER", JSON.stringify(count.typedRequest));

const agreement = plan("firma teklifi kaç?", { screenContext: screen("/company/agreements", "agreement", 71), conversationState: productState("agreement", 71, "AGREEMENTS"), role: "COMPANY" });
check("AGREEMENT_SCALAR_FIELD", agreement.typedRequest?.taskType === "FIELD_LOOKUP" && fieldKeys(agreement).includes("AGREEMENT_COMPANY_OFFER_AMOUNT"), JSON.stringify({ task: agreement.typedRequest?.taskType, fields: fieldKeys(agreement) }));
check("AGREEMENT_NOT_COUNT", agreement.typedRequest?.taskType !== "COUNT", agreement.typedRequest?.taskType);

const agreementRelation = projectAgreementCanonicalRelation({ shifts: [{ id: 168 }, { id: 167 }] }, { sourceShiftId: 15 });
check("AGREEMENT_SOURCE_SHIFT_PROJECTION", agreementRelation.sourceShiftId === 15 && agreementRelation.generatedShiftIds.join(",") === "168,167" && agreementRelation.latestGeneratedShiftId === 168 && agreementRelation.shiftId === 15, JSON.stringify(agreementRelation));
const agreementRelationExecution = await executeSemanticQueryPlan({
  plan: {
    ...agreement,
    family: "RELATION_LOOKUP",
    intentFamily: "RELATION_LOOKUP",
    requestedDomains: ["AGREEMENTS"],
    entities: [{ type: "agreement", id: 71 }],
    entity: { type: "agreement", id: 71 },
    relationshipIntent: { fromEntity: { type: "agreement", id: 71 }, toEntity: { type: "shift", id: null } },
    relationSpec: { fromEntity: { type: "agreement", id: 71 }, toEntity: { type: "shift", id: null } },
  },
  allowedDomains: ["AGREEMENTS"],
  readDomain: async () => ({ domain: "AGREEMENTS", count: 1, facts: [{ id: 71, agreementId: 71, shiftId: 15, generatedShiftIds: [168, 167], text: "Sözleşme #71" }] }),
});
check("AGREEMENT_RELATION_ANSWERS_SOURCE_SHIFT", /vardiya #15/iu.test(agreementRelationExecution.reply) && !/#168\b/u.test(agreementRelationExecution.reply), agreementRelationExecution.reply);

const comparison = plan("Teklif #35 ile Teklif #34 arasında hangisi daha acil, neden?");
check("COMPARISON_REQUIRED_OUTPUTS", comparison.typedRequest?.taskType === "COMPARISON" && ["WINNER_OR_ORDER", "REASON", "EVIDENCE"].every((slot) => comparison.typedRequest?.requiredOutputSlots?.includes(slot)), JSON.stringify(comparison.typedRequest));

const schoolNext = plan("ilk iş ne", { role: "SCHOOL", screenContext: screen("/school"), conversationState: {} });
check("SCREEN_SCOPED_NEXT_ACTION", schoolNext.scopeTarget === "CURRENT_SCREEN" && schoolNext.entities.length === 0, JSON.stringify({ scope: schoolNext.scopeTarget, entities: schoolNext.entities }));

const parentNext = plan("şimdi ne yapayım", { role: "PARENT", screenContext: screen("/parent/live", "personnel", 9), conversationState: productState("personnel", 9, "PERSONNEL") });
check("PARENT_SELECTED_CONTEXT_PRESERVED", parentNext.scopeTarget === "SELECTED_RECORD" && parentNext.entities.length === 1 && parentNext.entities[0]?.type === "personnel" && parentNext.entities[0]?.id === 9, JSON.stringify({ scope: parentNext.scopeTarget, entities: parentNext.entities }));

// The selected-record continuity above is intentional. Keep the negative
// authorization matrix explicit so the stale expectation cannot be replaced
// with a permissive global action.
const parentOffers = plan("teklifleri göster", { role: "PARENT", screenContext: screen("/parent/live", "personnel", 9), conversationState: productState("personnel", 9, "PERSONNEL") });
check("PARENT_WRONG_ROLE_REJECTED", parentOffers.family === "AUTHORIZATION_BOUNDARY" && parentOffers.deniedDomains?.includes("OFFERS") && parentOffers.entities.length === 0, JSON.stringify({ family: parentOffers.family, denied: parentOffers.deniedDomains, entities: parentOffers.entities }));
const parentAction = await executeSemanticQueryPlan({
  plan: {
    ...parentOffers,
    family: "ENTITY_LOOKUP",
    intentFamily: "ENTITY_LOOKUP",
    requestedDomains: ["OFFERS"],
    entities: [{ type: "offer", id: 35 }],
  },
  allowedDomains: [],
  readDomain: async () => ({ domain: "OFFERS", count: 1, facts: [{ id: 35, text: "yetkisiz teklif" }] }),
});
check("PARENT_UNAUTHORIZED_GLOBAL_ACTION_REJECTED", parentAction.status === "UNAUTHORIZED" && parentAction.unauthorizedFacts?.includes("OFFERS") && !/yetkisiz teklif/iu.test(parentAction.reply || ""), JSON.stringify({ status: parentAction.status, unauthorizedFacts: parentAction.unauthorizedFacts, reply: parentAction.reply }));
const wrongEntityAction = await executeSemanticQueryPlan({
  plan: { ...parentNext, family: "ENTITY_LOOKUP", intentFamily: "ENTITY_LOOKUP", requestedDomains: ["PERSONNEL"], entities: [{ type: "personnel", id: 10 }] },
  allowedDomains: ["PERSONNEL"],
  readDomain: async (_domain, { entities }) => ({ domain: "PERSONNEL", count: entities.length, facts: entities.filter((entity) => entity.id === 9).map((entity) => ({ id: entity.id, text: "başka personel" })) }),
});
check("PARENT_WRONG_ENTITY_NOT_SELECTED", wrongEntityAction.status !== "OK" || !/başka personel/iu.test(wrongEntityAction.reply || ""), JSON.stringify({ status: wrongEntityAction.status, reply: wrongEntityAction.reply }));

const style = plan("iki madde yap", { conversationState: productState() });
check("STYLE_STATE_MACHINE", style.typedRequest?.taskType === "STYLE" && style.typedRequest?.presentationOperator === "BULLETIZE" && style.typedRequest?.styleTarget === "LAST_SETTLED_RESULT", JSON.stringify(style.typedRequest));

const offTopicQuery = "teklifleri bırak, firma ve rakam geçen iki cümlelik bir şaka yaz";
const offTopic = plan(offTopicQuery);
check("EXPLICIT_OFF_TOPIC_NO_RETRIEVAL", offTopic.family === "OFF_TOPIC_SAFE" && offTopic.typedRequest?.retrieveProductData === false && offTopic.entities.length === 0 && offTopic.requestedDomains.length === 0, JSON.stringify({ family: offTopic.family, typed: offTopic.typedRequest }));

const negated = plan("teklifleri bırakma, bu teklifin durumu ne?");
check("NEGATED_ABANDONMENT_STAYS_PRODUCT", negated.family !== "OFF_TOPIC_SAFE", JSON.stringify({ family: negated.family, route: negated.conversationRoute }));

const suspended = { ...productState(), dialogueState: { suspendedProduct: true }, suspendedProductContext: { semanticPlan: productPlan() } };
const returned = plan("geri dönelim", { conversationState: suspended });
check("RETURN_RESTORES_SAME_AUTH_CONTEXT", returned.typedRequest?.taskType === "RETURN_TO_PRODUCT" && returned.entities.some((entity) => entity.type === "offer" && entity.id === 35), JSON.stringify(returned.typedRequest));

const stateUser = { ...user(), id: 99101 };
const stateScreen = screen("/room/offers", "offer", 35);
commitCanonicalConversationState({ user: stateUser, screenContext: stateScreen, authSessionId: "terra-focus", message: "durum", payload: { reply: "Teklif #35 açık.", semanticPlan: buyer, conversationRoute: buyer.conversationRoute, dialogueTopic: "PRODUCT" } });
commitCanonicalConversationState({ user: stateUser, screenContext: stateScreen, authSessionId: "terra-focus", message: offTopicQuery, payload: { reply: "Kısa şaka.", semanticPlan: offTopic, conversationRoute: offTopic.conversationRoute, dialogueTopic: "OFF_TOPIC" } });
const suspendedState = getCanonicalConversationState({ user: stateUser, screenContext: stateScreen, authSessionId: "terra-focus" });
check("OFF_TOPIC_SUSPENDS_NOT_ERASES", suspendedState.dialogueState?.phase === "PRODUCT_SUSPENDED" && suspendedState.dialogueState?.suspendedProduct === true && suspendedState.suspendedProductContext?.semanticPlan?.dialogueTopic === "PRODUCT", JSON.stringify(suspendedState.dialogueState));
const changedAuthState = getCanonicalConversationState({ user: { ...stateUser, id: 99102 }, screenContext: stateScreen, authSessionId: "terra-focus" });
const crossAuthReturn = plan("geri dönelim", { conversationState: changedAuthState });
check("CROSS_AUTH_RETURN_DOES_NOT_RESTORE", !crossAuthReturn.entities.some((entity) => entity.type === "offer" && entity.id === 35), JSON.stringify({ family: crossAuthReturn.family, entities: crossAuthReturn.entities }));

const route = resolveConversationRoute({ message: offTopicQuery, user: user(), screenContext: screen("/room/offers", "offer", 35), conversationState: productState(), canonicalShape: offTopic.typedRequest });
check("ROUTE_REUSES_CANONICAL_OFF_TOPIC", route.route === "OFF_TOPIC_SAFE" && route.retrieveProductData === false, JSON.stringify(route));

const contractPlan = {
  ...comparison,
  family: "COMPARISON",
  intentFamily: "COMPARISON",
  requestedDomains: ["OFFERS"],
  entities: [{ type: "offer", id: 35 }, { type: "offer", id: 34 }],
  entity: { type: "offer", id: 35 },
  comparisonSpec: { kind: "ENTITY_COMPARISON", leftEntity: { type: "offer", id: 35 }, rightEntity: { type: "offer", id: 34 }, dimensions: ["STATUS", "DATE"] },
  typedRequest: { ...comparison.typedRequest, taskType: "COMPARISON", requiredOutputSlots: ["WINNER_OR_ORDER", "REASON", "EVIDENCE", "SAFE_NEXT_STEP"] },
};
const contractExecution = await executeSemanticQueryPlan({
  plan: contractPlan,
  allowedDomains: ["OFFERS"],
  readDomain: async (_domain, { entities }) => ({
    domain: "OFFERS",
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      offerId: entity.id,
      statusText: entity.id === 35 ? "Açık" : "Karşı teklif",
      riskState: entity.id === 35 ? "HIGH" : "LOW",
      riskStateText: entity.id === 35 ? "Yüksek" : "Düşük",
      qualityState: "COMPLETE",
      qualityStateText: "Tam",
      startAt: entity.id === 35 ? "2026-09-28T15:00:00.000Z" : "2026-09-29T15:00:00.000Z",
      startAtText: entity.id === 35 ? "28.09.2026 15:00" : "29.09.2026 15:00",
      text: `Teklif #${entity.id}`,
    })),
  }),
});
check("COMPARISON_OUTPUT_CONTRACT", contractExecution.outputContract?.status === "SATISFIED" && contractExecution.outputContract?.comparisonDecision?.status === "ORDERED" && /once teklif #35|önce teklif #35/iu.test(contractExecution.reply) && /gerekce|gerekçe/iu.test(contractExecution.reply) && /sonraki guvenli adim|sonraki güvenli adım/iu.test(contractExecution.reply), JSON.stringify({ contract: contractExecution.outputContract, reply: contractExecution.reply }));

const dateRangeExecution = await executeSemanticQueryPlan({
  plan: {
    ...buyer,
    family: "ENTITY_LOOKUP",
    intentFamily: "ENTITY_LOOKUP",
    requestedDomains: ["OFFERS"],
    entities: [{ type: "offer", id: 35 }],
    entity: { type: "offer", id: 35 },
    requestedFields: [{ key: "DATE_RANGE", domain: "OFFERS" }],
    typedRequest: { ...buyer.typedRequest, taskType: "FIELD_LOOKUP", requestedFields: ["DATE_RANGE"] },
  },
  allowedDomains: ["OFFERS"],
  readDomain: async () => ({ domain: "OFFERS", count: 1, facts: [{ id: 35, offerId: 35, startAtText: "28.09.2026 15:00", endAtText: null, text: "Teklif #35" }] }),
});
check("COMPOSITE_DATE_RANGE_NO_SILENT_DROP", /28\.09\.2026 15:00/.test(dateRangeExecution.reply) && /bitis bulunamadi|bitiş bulunamadı/iu.test(dateRangeExecution.reply), dateRangeExecution.reply);
const completeDateExecution = await executeSemanticQueryPlan({
  plan: dateRangeExecution.items?.[0] ? {
    ...buyer,
    family: "ENTITY_LOOKUP",
    intentFamily: "ENTITY_LOOKUP",
    requestedDomains: ["OFFERS"],
    entities: [{ type: "offer", id: 35 }],
    entity: { type: "offer", id: 35 },
    requestedFields: [{ key: "DATE_RANGE", domain: "OFFERS" }],
    typedRequest: { ...buyer.typedRequest, taskType: "FIELD_LOOKUP", requestedFields: ["DATE_RANGE"] },
  } : buyer,
  allowedDomains: ["OFFERS"],
  readDomain: async () => ({ domain: "OFFERS", count: 1, facts: [{ id: 35, offerId: 35, startAtText: "28.09.2026 15:00", endAtText: "28.09.2026 17:00", text: "Teklif #35" }] }),
});
check("COMPOSITE_DATE_RANGE_BOTH_ENDPOINTS", /28\.09\.2026 15:00/.test(completeDateExecution.reply) && /28\.09\.2026 17:00/.test(completeDateExecution.reply), completeDateExecution.reply);

const scalarExecution = async (scalarPlan, fact) => executeSemanticQueryPlan({
  plan: scalarPlan,
  allowedDomains: scalarPlan.requestedDomains,
  readDomain: async (domain) => ({ domain, count: 1, facts: [fact] }),
});
const buyerExecution = await scalarExecution({ ...buyer, requestedDomains: ["OFFERS"], entities: [{ type: "offer", id: 35 }], entity: { type: "offer", id: 35 }, requestedFields: [{ key: "SERVICE_BUYER_AMOUNT", domain: "OFFERS" }], typedRequest: { ...buyer.typedRequest, requestedFields: ["SERVICE_BUYER_AMOUNT"] } }, { id: 35, offerId: 35, serviceBuyerAmountText: "12.000", text: "Teklif #35" });
check("OFFER_BUYER_RENDERED_SCALAR", /12\.000/.test(buyerExecution.reply) && !/teklif kaydi|teklif kaydı/iu.test(buyerExecution.reply), buyerExecution.reply);
const carrierExecution = await scalarExecution({ ...carrier, requestedDomains: ["OFFERS"], entities: [{ type: "offer", id: 35 }], entity: { type: "offer", id: 35 }, requestedFields: [{ key: "CARRIER_AMOUNT", domain: "OFFERS" }], typedRequest: { ...carrier.typedRequest, requestedFields: ["CARRIER_AMOUNT"] } }, { id: 35, offerId: 35, carrierAmountText: "-", text: "Teklif #35" });
check("OFFER_CARRIER_NO_ZERO_INVENTION", /henuz girilmemis|henüz girilmemiş|yetkili kayitta yok|yetkili kayıtta yok/iu.test(carrierExecution.reply) && !/\b0\b/u.test(carrierExecution.reply), carrierExecution.reply);
const agreementExecution = await scalarExecution({ ...agreement, requestedDomains: ["AGREEMENTS"], entities: [{ type: "agreement", id: 71 }], entity: { type: "agreement", id: 71 }, requestedFields: [{ key: "AGREEMENT_COMPANY_OFFER_AMOUNT", domain: "AGREEMENTS" }], typedRequest: { ...agreement.typedRequest, requestedFields: ["AGREEMENT_COMPANY_OFFER_AMOUNT"] } }, { id: 71, agreementId: 71, companyOfferAmountText: "45.000", text: "Sözleşme #71" });
check("AGREEMENT_RENDERED_SCALAR", /45\.000/.test(agreementExecution.reply) && !/teklif kaydi|teklif kaydı/iu.test(agreementExecution.reply), agreementExecution.reply);

const externalOwnershipCases = generated([
  "başka bir kurumun kaç çocuğu kayıtlı",
  "diğer bir firmanın vardiya sayısını göster",
  "başka okulun öğrencileri kaç tane",
  "bizim kuruma bağlı olmayan sürücünün plakasını söyle",
]);
for (const query of externalOwnershipCases) {
  const scope = inferRequestedOwnershipScope(query);
  const result = plan(query, { role: "PARENT", screenContext: screen("/parent/live"), conversationState: {} });
  check(`EXTERNAL_OWNERSHIP_SCOPE:${query}`, scope.explicitExternalScope && result.typedRequest?.explicitExternalScope && result.conversationRoute === "AUTHORIZATION_NEGATIVE", JSON.stringify({ scope, family: result.family, route: result.conversationRoute, typed: result.typedRequest }));
}

const nonOwnershipContrastCases = generated([
  "başka bir şey soracağım, kısa bir mesaj yaz",
  "farklı bir mesaj hazırla",
  "bunu başka türlü açıkla",
  "öteki biçimde iki madde yap",
  "başka bir firma kelimesiyle iki cümle yaz",
]);
for (const query of nonOwnershipContrastCases) {
  const scope = inferRequestedOwnershipScope(query);
  const result = plan(query);
  check(`NON_OWNERSHIP_LANGUAGE:${query}`, !scope.explicitExternalScope && result.conversationRoute !== "AUTHORIZATION_NEGATIVE", JSON.stringify({ scope, route: result.conversationRoute }));
}

const creativeVocabularyCases = generated([
  "rota ile vardiya sözcüklerini kullanıp iki satır mesaj hazırla",
  "teklif kelimesini geçirerek iki cümle oluştur",
  "araç sözcüğüyle kısa hikaye uydur",
  "plaka kelimesi geçen bir not yaz",
  "personel sözcüğünü içeren kısa teşekkür metni hazırla",
  "firma kelimesiyle iki satır oluştur",
]);
for (const query of creativeVocabularyCases) {
  const result = plan(query);
  check(`GENERAL_CREATIVE_NO_RETRIEVAL:${query}`, result.family === "OFF_TOPIC_SAFE" && result.typedRequest?.taskType === "OFF_TOPIC" && result.typedRequest?.retrieveProductData === false && result.entities.length === 0 && result.requestedDomains.length === 0, JSON.stringify({ family: result.family, route: result.conversationRoute, typed: result.typedRequest, entities: result.entities, domains: result.requestedDomains }));
}

const factualWritingCases = generated([
  "seçili vardiyanın saatini kullanarak sürücüye iki satır mesaj yaz",
  "teklifin tutarını kullanarak firmaya kısa bir not hazırla",
]);
for (const query of factualWritingCases) {
  const result = plan(query, { screenContext: screen("/room/shifts", "shift", 167), conversationState: productState("shift", 167, "SHIFTS") });
  check(`FACTUAL_WRITING_REMAINS_PRODUCT:${query}`, result.family !== "OFF_TOPIC_SAFE" && result.typedRequest?.retrieveProductData !== false, JSON.stringify({ family: result.family, route: result.conversationRoute, typed: result.typedRequest }));
}

const screenContextCases = generated([
  "şu an neye bakıyorum",
  "burada açık olan bölüm nedir",
  "burası ne",
  "şimdi hangi sayfadayım",
]);
for (const query of screenContextCases) {
  const result = plan(query, { role: "SCHOOL", screenContext: screen("/school"), conversationState: {} });
  check(`SCREEN_WITHOUT_SELECTION:${query}`, result.typedRequest?.taskType === "SCREEN_CONTEXT" && result.family === "SCREEN_CONTEXT" && result.entities.length === 0, JSON.stringify({ family: result.family, typed: result.typedRequest, entities: result.entities }));
}

const selectedRecordContext = plan("hangi kayda bakıyorum", { screenContext: screen("/room/offers", "offer", 35), conversationState: productState() });
check("SELECTED_RECORD_REQUIRES_REAL_SELECTION", selectedRecordContext.typedRequest?.taskType === "SELECTED_RECORD_CONTEXT" && selectedRecordContext.typedRequest?.entityRefs?.some((entity) => entity.type === "offer" && entity.id === 35), JSON.stringify(selectedRecordContext.typedRequest));

const absentSelectedRecord = plan("hangi kayıt seçili", { role: "SCHOOL", screenContext: screen("/school"), conversationState: {} });
check("NO_SELECTION_CLARIFIES", absentSelectedRecord.typedRequest?.taskType === "CLARIFY" && absentSelectedRecord.typedRequest?.ambiguity === "NO_SELECTED_RECORD" && absentSelectedRecord.entities.length === 0, JSON.stringify({ family: absentSelectedRecord.family, typed: absentSelectedRecord.typedRequest, entities: absentSelectedRecord.entities }));

const lifecycleOracle = buildLuna001CleanLifecycleOracle();
check("LUNA001_ORACLE_CONTRACT", lifecycleOracle.source.entity.id === 35 && lifecycleOracle.target.role === "COMPANY" && lifecycleOracle.lifecycle.includes("UI_LOGOUT") && lifecycleOracle.lifecycle.includes("ASSERT_NO_COMPANY_ASSISTANT_QUERY_OR_SELECTION"), JSON.stringify(lifecycleOracle));
check("LUNA001_ORACLE_SECRET_POLICY", lifecycleOracle.secretPolicy === "TOKEN_OR_RAW_SESSION_VALUE_NEVER_LOGGED" && lifecycleOracle.capturedFields.includes("canonicalConversationStateKeyFingerprint"), JSON.stringify(lifecycleOracle));
const contaminatedByPriorAssistant = evaluateLuna001Contamination({ companyCopilotRequestCount: 1, companySelection: { type: "shift", id: 167 } });
check("LUNA001_ORACLE_DETECTS_PRIOR_TARGET_QUERY", contaminatedByPriorAssistant.status === "CONTAMINATED" && contaminatedByPriorAssistant.reasons.includes("COMPANY_ASSISTANT_QUERY_BEFORE_TARGET"), JSON.stringify(contaminatedByPriorAssistant));
const contaminatedBySourceSelection = evaluateLuna001Contamination({ companyCopilotRequestCount: 0, companySelection: { type: "offer", id: 35 } });
check("LUNA001_ORACLE_DETECTS_SOURCE_SELECTION", contaminatedBySourceSelection.status === "CONTAMINATED" && contaminatedBySourceSelection.reasons.includes("COMPANY_ALREADY_SELECTED_SOURCE_OFFER"), JSON.stringify(contaminatedBySourceSelection));
const cleanTargetPrecondition = evaluateLuna001Contamination({ companyCopilotRequestCount: 0, companySelection: { type: "shift", id: 167 } });
check("LUNA001_ORACLE_ACCEPTS_CLEAN_TARGET", cleanTargetPrecondition.status === "CLEAN" && cleanTargetPrecondition.reasons.length === 0, JSON.stringify(cleanTargetPrecondition));

const summary = {
  check: "PRE_18_RESIDUAL_TERRA_FOCUSED_ORACLE",
  assertions: assertionCount,
  generatedParaphrases: generatedParaphraseCount,
  passed: assertionCount - failures.length,
  failures,
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
