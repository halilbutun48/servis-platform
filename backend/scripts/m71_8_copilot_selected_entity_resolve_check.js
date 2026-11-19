
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import { executeSemanticQueryPlan } from '../src/services/queryPlanExecutor.js';
import { resolveCopilotGuidedTarget } from '../src/ai/chat/copilotUiElementAnchor.js';

const cwd = process.argv[2] || process.cwd();
const repoRoot = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const ok = (msg) => console.log(`OK ${msg}`);
const fail = (msg) => { console.error(`FAIL ${msg}`); process.exit(1); };

// Regression: an old route instance must not overwrite the live selected
// record, and a stale browser-global mirror must not outrank the same-bundle
// selection that produced the current event.
const selectionEvents = [];
globalThis.window = {
  location: { hash: '#/room/shifts' },
  dispatchEvent(event) { selectionEvents.push(event); },
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
const { readCopilotSelection, setCopilotSelection } = await import(
  pathToFileURL(path.join(repoRoot, 'web', 'src', 'utils', 'copilotSelection.js')).href
);
setCopilotSelection({ scopeKey: '/room/shifts', entityType: 'shift', entityId: 168, label: 'Vardiya #168' });
globalThis.window.__psv1CopilotSelection = { scopeKey: '/room/map', entityType: 'shift', entityId: 214, label: 'Vardiya #214' };
if (Number(readCopilotSelection()?.entityId) !== 168) {
  fail('live M71.8 selected shift 168 must not be replaced by a stale window mirror for shift 214');
}
globalThis.window.location.hash = '#/room/map';
setCopilotSelection({ scopeKey: '/room/shifts', entityType: 'shift', entityId: 210, label: 'Vardiya #210' });
if (Number(readCopilotSelection()?.entityId) !== 168) {
  fail('old /room/shifts instance must not overwrite the current selected record after route transition');
}
ok('selected record remains route-bound against stale window and old-instance writes');

const guidedTargetUser = { id: 980002, role: 'ROOM', roomId: 1, companyKind: 'ROOM' };
const selectedShiftGuidanceScreen = {
  id: 42,
  path: '/room/shifts',
  label: 'Vardiyalar',
  role: 'ROOM',
  selectedEntityType: 'shift',
  selectedEntityId: 211,
  uiHints: {
    activeTabs: ['Bekleyen Talepler20'],
    visibleButtons: [
      { label: 'Diğer Vardiyalar7', targetKey: 'legacy:other-tab', semanticType: 'tab', identitySource: 'LEGACY_LABEL' },
      { label: 'Vardiya #211 ayrıntıları', targetKey: 'room-shifts:shift:211:details', semanticId: 'product:room:shift:211:details', semanticType: 'disclosure', identitySource: 'CANONICAL' },
    ],
  },
};
const selectedShiftGuidancePlan = {
  family: 'CONTEXTUAL_PUBLIC_TYPE',
  publicQuestionType: 'MISSING_DATA_HELP',
  entity: { type: 'shift', id: 211 },
};
const selectedShiftGuidedTarget = resolveCopilotGuidedTarget({
  user: guidedTargetUser,
  screenContext: selectedShiftGuidanceScreen,
  semanticPlan: selectedShiftGuidancePlan,
  message: 'Eksik vardiya bilgilerini göster',
});
if (selectedShiftGuidedTarget.status !== 'FOUND'
  || selectedShiftGuidedTarget.targetKey !== 'room-shifts:shift:211:details'
  || selectedShiftGuidedTarget.authorizedContext?.shiftId !== 211
  || selectedShiftGuidedTarget.label === 'Diğer Vardiyalar7') {
  fail('selected shift missing-data guidance must target the selected shift details, not an inactive tab');
}
ok('selected shift missing-data guidance targets the selected record details');
const noSelectedShiftGuidance = resolveCopilotGuidedTarget({
  user: guidedTargetUser,
  screenContext: { ...selectedShiftGuidanceScreen, selectedEntityType: '', selectedEntityId: null },
  semanticPlan: selectedShiftGuidancePlan,
  message: 'Eksik vardiya bilgilerini göster',
});
if (noSelectedShiftGuidance?.status === 'FOUND' && noSelectedShiftGuidance.targetKey === 'room-shifts:shift:211:details') {
  fail('missing-data guidance must not reuse a stale selected shift target');
}
ok('missing-data guidance does not reuse a stale selected shift target');

console.log('=== M71.8 COPILOT SELECTED ENTITY RESOLVE CHECK ===');
const service = read('backend/src/ai/service.js');
const resolver = read('backend/src/ai/chat/contextResolver.js');
const composer = read('backend/src/ai/chat/helpComposer.js');
const roomReplies = read('backend/src/ai/chat/conversationTaskStateRoomReplies.js');
const tools = read('backend/src/ai/tools.js');
const awareness = read('backend/src/services/authorizedProductAwareness.js');
const queryPlan = read('backend/src/services/queryPlanExecutor.js');
const offersPanel = read('web/src/panels/room/OffersPanel.jsx');
const commercialFlowPanel = read('web/src/panels/company/CommercialFlowPanel.jsx');
const companyOverview = read('backend/src/routes/companyOverview.js');
const roomCommercialFlowPanel = read('web/src/panels/room/CommercialFlowPanel.jsx');
const copilotPanel = read('web/src/panels/shared/CopilotPanel.jsx');
const agreementsPanel = read('web/src/panels/room/AgreementsPanel.jsx');
const checkinPanel = read('web/src/panels/room/CheckinPanel.jsx');
const entityRuntime = read('backend/src/ai/chat/helpComposerEntityRuntime.js');
const toolsSource = read('backend/src/ai/tools.js');
const awarenessSource = read('backend/src/services/authorizedProductAwareness.js');
const queryPlanSource = read('backend/src/services/queryPlanExecutor.js');

if (!includesText(service, 'resolveChatContext({ entityType, entityId, user, screenContext, conversationState })')) fail('service passes conversationState into resolveChatContext');
ok('service passes conversationState into resolveChatContext');
if (!includesText(service, 'const selectedRecordContextRequest = semanticPlan.typedRequest?.taskType === "SELECTED_RECORD_CONTEXT"')
  || !includesText(service, 'hasExplicitCandidateRecord && !selectedRecordContextRequest')) fail('selected-record identity must not be suppressed by the explicit-candidate reasoning guard');
ok('selected-record identity bypasses the explicit-candidate reasoning guard');
if (!includesText(service, 'semanticPlan.family === "CONTEXTUAL_PUBLIC_TYPE"')
  || !includesText(service, 'semanticPlan.publicQuestionType === "MISSING_DATA_HELP"')
  || !includesText(service, 'Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) > 0')
  || !includesText(service, "semanticPlan.entities[0]?.type || ''")) {
  fail('contextual selected-record missing-data requests must bypass generic reasoning');
}
ok('contextual selected-record missing-data requests bypass generic reasoning');
if (!includesText(service, 'const selectedRecordEvidenceGuidance = contextualMissingDataRequest')
  || !includesText(service, 'currentSurfaceGuidance || selectedRecordEvidenceGuidance')) {
  fail('selected-record named-field missing-data requests must bypass generic awareness fallback');
}
ok('selected-record named-field missing-data requests bypass generic awareness fallback');
if (!includesText(service, '(!hasExplicitCandidateRecord || semanticPlan.family === "CONTEXTUAL_PUBLIC_TYPE")')) fail('contextual public selected-record guidance must remain on the screen-help path');
ok('contextual public selected-record guidance remains on the screen-help path');
if (!includesText(resolver, 'pickSelectedEntity') || !includesText(resolver, "selected?.entityType || entityType")) fail('contextResolver promotes selected entity for screen chat');
ok('contextResolver promotes selected entity for screen chat');
if (!includesText(resolver, "['shift', 'vehicle', 'driver', 'offer', 'agreement']")) fail('contextResolver keeps typed selected driver/offer/agreement scope');
if (!includesText(tools, 'getDriverContext') || !includesText(tools, 'getOfferContext') || !includesText(tools, 'getAgreementContext')) fail('tools provide read-only typed selected-record contexts');
ok('contextResolver keeps typed selected driver/offer/agreement scope');
ok('tools provide read-only typed selected-record contexts');
if (!includesText(composer, 'prefersSelectedEntity') || !includesText(composer, "requestEntityType === 'screen'") || !includesText(composer, 'resolveReferencedScreenDefinition')) fail('helpComposer computes selected-entity preference');
ok('helpComposer computes selected-entity preference');
if (!includesText(composer, "questionType === 'READINESS_CHECK' && entityType === 'shift'") || !includesText(composer, 'shiftReadinessReply')) fail('helpComposer has shift readiness reply');
ok('helpComposer has shift readiness reply');
if (!includesText(composer, "questionType === 'MISSING_DATA_HELP' && entityType === 'shift'") || !includesText(composer, 'shiftMissingDataReply')) fail('helpComposer has shift missing-data reply');
ok('helpComposer has shift missing-data reply');
if (!includesText(composer, 'preserveRawSelectedEntityEvidenceReply')
  || !includesText(composer, "['shift', 'vehicle', 'offer', 'agreement']")
  || !includesText(composer, "['MISSING_DATA_HELP', 'READINESS_CHECK', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'WHY_BLOCKED']")) {
  fail('selected-record evidence reply must be preserved from generic reasoning replacement');
}
ok('selected-record evidence reply is protected from generic reasoning replacement');
if (!includesText(roomReplies, "if (String(questionType || '') === 'MISSING_DATA_HELP') return ''")) fail('ROOM next-action override must not replace typed missing-data replies');
ok('ROOM next-action override preserves typed missing-data replies');
if (!includesText(composer, 'answerEntityType') || !includesText(composer, 'preferEntityContext')) fail('helpComposer routes record-scoped questions through selected entity');
ok('helpComposer routes record-scoped questions through selected entity');
if (!includesText(awareness, 'vehicles: { select: { id: true, plate: true, status: true') || !includesText(awareness, 'shiftIds')) fail('driver awareness keeps bound vehicle and shift evidence');
if (!includesText(queryPlan, 'entity.type === "driver"') || !includesText(queryPlan, 'Bağlı araç')) fail('query plan composes selected driver record evidence');
ok('driver awareness keeps bound vehicle and shift evidence');
ok('query plan composes selected driver record evidence');
if (!includesText(offersPanel, 'offerIdFromRoute() > 0 ? "" : "OPEN,COUNTERED"')
  || !includesText(offersPanel, 'return explicitId > 0 ? matched : null')) {
  fail('deep-linked offer is not fail-closed against stale or unauthorized fallback');
}
if (!includesText(companyOverview, 'offerId: latestOffer?.id || null') || !includesText(companyOverview, 'agreementId: shift?.agreementId || null')) fail('commercial flow preserves selected offer/agreement identity');
if (!includesText(commercialFlowPanel, 'selectedItem?.offerId') || !includesText(commercialFlowPanel, 'selectedItem?.agreementId')) fail('commercial flow promotes the selected typed record');
ok('deep-linked offer remains visible under API authorization');
ok('deep-linked offer does not fall back to another record');
ok('commercial flow preserves selected offer/agreement identity');
ok('commercial flow promotes the selected typed record');
if (!includesText(roomCommercialFlowPanel, 'selectedItem?.offerId ? "offer"') || !includesText(roomCommercialFlowPanel, 'selectedItem?.agreementId ? "agreement"')) fail('ROOM commercial flow must publish a supported typed record');
ok('ROOM commercial flow publishes a supported typed record');
if (!includesText(roomCommercialFlowPanel, 'selectedItem?.shiftId ? "shift"')) fail('ROOM commercial flow keeps shift fallback typed');
ok('ROOM commercial flow keeps shift fallback typed');
if (!includesText(copilotPanel, 'const scopedChatSelection = chatSelection') || !includesText(copilotPanel, 'liveSelection || scopedChatSelection || null')) fail('copilot request must reject stale cross-route selection');
ok('copilot request rejects stale cross-route selection');
if (!includesText(read('backend/src/ai/chat/semanticIntentPlanner.js'), 'bagli arac')) fail('driver bound-vehicle wording must be a canonical field signal');
ok('driver bound-vehicle wording is a canonical field signal');
if (!includesText(agreementsPanel, "entityType: 'agreement'") || !includesText(agreementsPanel, "entityId: Number(item?.id || 0) || null")) fail('ROOM agreement selection must publish the authorized agreement identity');
if (includesText(agreementsPanel, "entityType: item?.shiftId ? 'shift' : 'screen'") || includesText(agreementsPanel, "Number(item?.shiftId || 1106) || 1106")) fail('ROOM agreement selection must not publish a screen or synthetic fallback identity');
ok('ROOM agreement selection publishes a typed, non-synthetic identity');
if (!includesText(entityRuntime, "['shift', 'vehicle', 'driver', 'offer', 'agreement']")) fail('selected-record preference must cover all supported typed records');
if (!includesText(entityRuntime, 'RELATION_LOOKUP') || !includesText(entityRuntime, 'ENTITY_LOOKUP')) fail('selected-record preference must cover relation and record lookup families');
ok('selected-record preference is typed-record and family aware');
if (!includesText(toolsSource, 'checkinEvents')) fail('shift context must expose read-only check-in evidence');
if (!includesText(awarenessSource, 'boardingCount') || !includesText(awarenessSource, 'alightingCount')) fail('shift list evidence must expose read-only biniş/iniş counts');
if (!includesText(queryPlanSource, 'BOARDING_COUNT') || !includesText(queryPlanSource, 'ALIGHTING_COUNT')) fail('query plan must compose biniş/iniş count fields');
if (!includesText(composer, 'BOARDING_COUNT') || !includesText(composer, 'checkinCounts')) fail('helpComposer must answer selected shift check-in counts from read-only context');
ok('check-in evidence remains read-only and typed');
if (!includesText(awarenessSource, 'agreementId: true')
  || !includesText(awarenessSource, 'operationStatus: Number(row.agreementId || 0)')) {
  fail('authorized shift facts must preserve the UI operation-status basis without inventing a separate status');
}
if (!includesText(queryPlanSource, 'OPERATION_STATUS') || !includesText(queryPlanSource, 'operationStatusText')) {
  fail('query plan must compose the authorized operation-status field');
}
ok('authorized shift facts and query plan preserve the operation-status contract');

const driverUser = { id: 980002, role: 'ROOM', roomId: 1, companyKind: 'ROOM' };
const driverScreen = {
  path: '/room/drivers',
  label: 'Sürücüler',
  role: 'ROOM',
  selectedEntityType: 'driver',
  selectedEntityId: 1,
  selectedLabel: 'Driver One',
};
const driverMessage = 'Seçili sürücünün durumu ve bağlı aracını açıkla';
const driverRequest = resolveCanonicalConversationRequest({ message: driverMessage, user: driverUser, screenContext: driverScreen });
const driverPlan = resolveSemanticIntent({ message: driverMessage, user: driverUser, screenContext: driverScreen, canonicalRequest: driverRequest });
if (!driverPlan.entities?.some((entity) => entity.type === 'driver' && Number(entity.id) === 1)) fail('driver plan loses the live typed driver');
if (!driverPlan.requestedFields?.some((field) => field.key === 'VEHICLE')) fail('driver plan loses the bound vehicle field');
ok('driver plan preserves typed driver and bound vehicle evidence');

const selectedShiftScreen = {
  path: '/room/shifts',
  label: 'Vardiyalar',
  role: 'ROOM',
  selectedEntityType: 'shift',
  selectedEntityId: 211,
  selectedLabel: 'Vardiya 211',
  semanticResolutionContext: {
    authorizedRole: 'ROOM',
    requestEntityType: 'shift',
    sourceScreenPath: '/room/shifts',
    effectiveScreenPath: '/room/shifts',
    sourceScreenLabel: 'Vardiyalar',
    effectiveScreenLabel: 'Vardiyalar',
    planningSurfaceText: 'Vardiya Özeti',
  },
};
const selectedShiftMissingDataMessage = 'Eksik vardiya bilgilerini göster';
const selectedShiftMissingDataRequest = resolveCanonicalConversationRequest({
  message: selectedShiftMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
});
const selectedShiftMissingDataPlan = resolveSemanticIntent({
  message: selectedShiftMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
  canonicalRequest: selectedShiftMissingDataRequest,
});
if (selectedShiftMissingDataPlan.family !== 'CONTEXTUAL_PUBLIC_TYPE'
  || selectedShiftMissingDataPlan.publicQuestionType !== 'MISSING_DATA_HELP'
  || selectedShiftMissingDataPlan.routingReason !== 'selected-shift-missing-data-chip'
  || !selectedShiftMissingDataPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 211)) {
  fail('selected shift missing-data suggestion must remain record-scoped instead of generic screen guidance');
}
ok('selected shift missing-data suggestion remains record-scoped');

const selectedShiftMissingDataMeta = detectQuestionIntent(selectedShiftMissingDataMessage, {
  entityType: 'screen',
  screenPath: '/room/shifts',
  roleMode: 'OPERATIONS',
  userRole: 'ROOM',
  originalMessage: selectedShiftMissingDataMessage,
  canonicalRequest: selectedShiftMissingDataRequest,
  semanticResolutionContext: selectedShiftScreen.semanticResolutionContext,
});
if (selectedShiftMissingDataMeta.questionType !== 'MISSING_DATA_HELP') {
  fail(`selected shift missing-data request must not be downgraded to ${selectedShiftMissingDataMeta.questionType}`);
}
ok('canonical contextual missing-data request reaches the evidence-aware question type');

const selectedShiftNamedFieldsMessage = 'Bu vardiyada araç, sürücü ya da durak bilgilerinde eksik olan var mı?';
const selectedShiftNamedFieldsRequest = resolveCanonicalConversationRequest({
  message: selectedShiftNamedFieldsMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
});
const selectedShiftNamedFieldsPlan = resolveSemanticIntent({
  message: selectedShiftNamedFieldsMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
  canonicalRequest: selectedShiftNamedFieldsRequest,
});
if (selectedShiftNamedFieldsPlan.family !== 'CONTEXTUAL_PUBLIC_TYPE'
  || selectedShiftNamedFieldsPlan.publicQuestionType !== 'MISSING_DATA_HELP'
  || selectedShiftNamedFieldsPlan.typedRequest?.taskType !== 'FIELD_LOOKUP'
  || !selectedShiftNamedFieldsPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 211)) {
  fail('unseen selected-shift named-field missing-data request must remain record-scoped');
}
ok('unseen selected-shift named-field missing-data request remains record-scoped');

const selectedShiftClientScreen = { ...selectedShiftScreen, semanticResolutionContext: undefined };
const selectedShiftClientRequest = resolveCanonicalConversationRequest({
  message: selectedShiftMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftClientScreen,
});
const selectedShiftClientPlan = resolveSemanticIntent({
  message: selectedShiftMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftClientScreen,
  canonicalRequest: selectedShiftClientRequest,
});
if (selectedShiftClientPlan.family !== 'CONTEXTUAL_PUBLIC_TYPE'
  || selectedShiftClientPlan.publicQuestionType !== 'MISSING_DATA_HELP') {
  fail('live client screen projection must preserve selected shift missing-data semantics');
}
ok('live client screen projection preserves selected shift missing-data semantics');

const selectedShiftShellScreen = {
  ...selectedShiftScreen,
  semanticResolutionContext: {
    ...selectedShiftScreen.semanticResolutionContext,
    requestEntityType: 'screen',
    selectedEntityType: 'shift',
    selectedEntityId: 211,
  },
};
const selectedShiftShellPlan = resolveSemanticIntent({
  message: selectedShiftMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftShellScreen,
  canonicalRequest: resolveCanonicalConversationRequest({
    message: selectedShiftMissingDataMessage,
    user: driverUser,
    screenContext: selectedShiftShellScreen,
  }),
});
if (selectedShiftShellPlan.family !== 'CONTEXTUAL_PUBLIC_TYPE'
  || selectedShiftShellPlan.publicQuestionType !== 'MISSING_DATA_HELP') {
  fail('screen transport context must preserve selected shift missing-data semantics');
}
ok('screen transport context preserves selected shift missing-data semantics');

const selectedShiftNaturalMissingDataMessage = 'Bu vardiyada hangi bilgiler eksik?';
const selectedShiftNaturalMissingDataRequest = resolveCanonicalConversationRequest({
  message: selectedShiftNaturalMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
});
const selectedShiftNaturalMissingDataPlan = resolveSemanticIntent({
  message: selectedShiftNaturalMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
  canonicalRequest: selectedShiftNaturalMissingDataRequest,
});
if (selectedShiftNaturalMissingDataPlan.family !== 'CONTEXTUAL_PUBLIC_TYPE'
  || selectedShiftNaturalMissingDataPlan.publicQuestionType !== 'MISSING_DATA_HELP'
  || !selectedShiftNaturalMissingDataPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 211)) {
  fail('natural selected shift missing-data wording must remain record-scoped');
}
ok('natural selected shift missing-data wording remains record-scoped');

const selectedShiftUnseenMissingDataMessage = 'Araç, sürücü ya da durak tarafında eksik olan var mı?';
const selectedShiftUnseenMissingDataRequest = resolveCanonicalConversationRequest({
  message: selectedShiftUnseenMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
});
const selectedShiftUnseenMissingDataPlan = resolveSemanticIntent({
  message: selectedShiftUnseenMissingDataMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
  canonicalRequest: selectedShiftUnseenMissingDataRequest,
});
if (selectedShiftUnseenMissingDataPlan.family !== 'CONTEXTUAL_PUBLIC_TYPE'
  || selectedShiftUnseenMissingDataPlan.publicQuestionType !== 'MISSING_DATA_HELP'
  || !selectedShiftUnseenMissingDataPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 211)) {
  fail('unseen selected shift missing-data wording must remain record-scoped');
}
ok('unseen selected shift missing-data wording remains record-scoped');

const selectedShiftSafeNextMessage = 'Sıradaki güvenli işlem ne?';
const selectedShiftSafeNextRequest = resolveCanonicalConversationRequest({
  message: selectedShiftSafeNextMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
});
const selectedShiftSafeNextPlan = resolveSemanticIntent({
  message: selectedShiftSafeNextMessage,
  user: driverUser,
  screenContext: selectedShiftScreen,
  canonicalRequest: selectedShiftSafeNextRequest,
});
if (selectedShiftSafeNextPlan.family !== 'CONTEXTUAL_PUBLIC_TYPE'
  || selectedShiftSafeNextPlan.publicQuestionType !== 'SAFE_NEXT_STEP'
  || !selectedShiftSafeNextPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 211)) {
  fail('selected shift safe-next suggestion must remain record-scoped');
}
ok('selected shift safe-next suggestion remains record-scoped');

const noSelectionShiftScreen = {
  ...selectedShiftScreen,
  selectedEntityType: undefined,
  selectedEntityId: null,
  selectedLabel: '',
  semanticResolutionContext: {
    ...selectedShiftScreen.semanticResolutionContext,
    requestEntityType: 'screen',
  },
};
const noSelectionMissingDataRequest = resolveCanonicalConversationRequest({
  message: selectedShiftMissingDataMessage,
  user: driverUser,
  screenContext: noSelectionShiftScreen,
});
const noSelectionMissingDataPlan = resolveSemanticIntent({
  message: selectedShiftMissingDataMessage,
  user: driverUser,
  screenContext: noSelectionShiftScreen,
  canonicalRequest: noSelectionMissingDataRequest,
});
if (noSelectionMissingDataPlan.family === 'CONTEXTUAL_PUBLIC_TYPE'
  && noSelectionMissingDataPlan.publicQuestionType === 'MISSING_DATA_HELP') {
  fail('missing-data suggestion must not claim selected-record context without a selected shift');
}
ok('missing-data suggestion does not invent selected shift context');

const driverExecution = await executeSemanticQueryPlan({
  plan: driverPlan,
  allowedDomains: ['DRIVERS', 'VEHICLES'],
  readDomain: async (domain, { entities }) => domain === 'DRIVERS'
    ? {
      domain,
      count: entities.length,
      facts: entities.map((entity) => ({
        driverId: entity.id,
        driverName: 'Driver One',
        vehiclePlate: '34ABC123',
      })),
    }
    : { domain, count: 0, facts: [] },
});
if (driverExecution.status !== 'RESOLVED'
  || !includesText(driverExecution.reply, 'Driver One')
  || !includesText(driverExecution.reply, '34ABC123')
  || includesText(driverExecution.reply, 'Kayıt #1')) {
  fail(`driver relation reply must use the authorized driver name and bound vehicle without generic record labeling: ${driverExecution.reply}`);
}
ok('driver relation reply preserves meaningful name and vehicle evidence without generic record labeling');

const unauthorizedDriverExecution = await executeSemanticQueryPlan({
  plan: driverPlan,
  allowedDomains: ['AGREEMENTS'],
  readDomain: async (domain) => ({
    domain,
    count: 1,
    facts: [{ driverId: 1, driverName: 'Driver One', vehiclePlate: '34ABC123' }],
  }),
});
if (unauthorizedDriverExecution.status !== 'UNAUTHORIZED'
  || !unauthorizedDriverExecution.unauthorizedFacts?.length
  || includesText(unauthorizedDriverExecution.reply, '34ABC123')
  || includesText(unauthorizedDriverExecution.reply, 'Driver One')) {
  fail('unauthorized driver scope must fail closed without exposing driver or vehicle evidence');
}
ok('unauthorized driver scope remains fail-closed');

const missingDriverScreen = { ...driverScreen, selectedEntityId: 999, selectedLabel: 'Bilinmeyen sürücü' };
const missingDriverRequest = resolveCanonicalConversationRequest({ message: 'Bu sürücünün bağlı aracı ne?', user: driverUser, screenContext: missingDriverScreen });
const missingDriverPlan = resolveSemanticIntent({ message: 'Bu sürücünün bağlı aracı ne?', user: driverUser, screenContext: missingDriverScreen, canonicalRequest: missingDriverRequest });
const missingDriverExecution = await executeSemanticQueryPlan({
  plan: missingDriverPlan,
  allowedDomains: ['DRIVERS', 'VEHICLES'],
  readDomain: async (domain) => ({ domain, count: 0, facts: [] }),
});
if (missingDriverExecution.status !== 'NO_DATA'
  || includesText(missingDriverExecution.reply, '34ABC123')
  || (!includesText(missingDriverExecution.reply, 'başka bir kaydı bunun yerine kullanmıyorum')
    && !includesText(missingDriverExecution.reply, 'başka bir kaydı ikame etme')
    && !includesText(missingDriverExecution.reply, 'yetkili kayıtta doğrulanamadı'))) {
  fail('missing driver record must not fall back to another driver or vehicle');
}
ok('missing driver record remains fail-closed without record fallback');

const agreementScreen = {
  path: '/room/agreements',
  label: 'Sözleşmeler',
  role: 'ROOM',
  selectedEntityType: 'agreement',
  selectedEntityId: 184,
  selectedLabel: 'Sözleşme 184',
};
const agreementMessage = 'Seçili sözleşmenin durumunu açıkla';
const agreementRequest = resolveCanonicalConversationRequest({ message: agreementMessage, user: driverUser, screenContext: agreementScreen });
const agreementPlan = resolveSemanticIntent({ message: agreementMessage, user: driverUser, screenContext: agreementScreen, canonicalRequest: agreementRequest });
if (!agreementPlan.entities?.some((entity) => entity.type === 'agreement' && Number(entity.id) === 184)) fail('agreement plan loses the live typed agreement');
if (!agreementPlan.requestedFields?.some((field) => field.key === 'STATUS')) fail('agreement plan loses the requested status field');
ok('agreement plan preserves typed agreement and status evidence');

const agreementDetailsMessage = 'Bu sözleşmenin detaylarını açıkla.';
const agreementDetailsRequest = resolveCanonicalConversationRequest({ message: agreementDetailsMessage, user: driverUser, screenContext: agreementScreen });
const agreementDetailsPlan = resolveSemanticIntent({ message: agreementDetailsMessage, user: driverUser, screenContext: agreementScreen, canonicalRequest: agreementDetailsRequest });
const selectedAgreementId = Number(agreementScreen.selectedEntityId);
if (agreementDetailsRequest.request.operation !== 'EXPLAIN_RECORD_DETAILS'
  || agreementDetailsPlan.family !== 'RECORD_DETAILS'
  || !agreementDetailsPlan.entities?.some((entity) => entity.type === 'agreement' && Number(entity.id) === selectedAgreementId)
  || agreementDetailsPlan.family === 'UI_GUIDANCE') {
  fail('selected agreement detail request must remain RECORD_DETAILS and retain the typed agreement');
}
const agreementDetailsExecution = await executeSemanticQueryPlan({
  plan: agreementDetailsPlan,
  allowedDomains: ['AGREEMENTS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      agreementId: entity.id,
      statusText: 'AUTHORIZED_STATUS',
      dateText: 'AUTHORIZED_DATE',
    })),
  }),
});
if (agreementDetailsExecution.status !== 'RESOLVED'
  || !includesText(agreementDetailsExecution.reply, 'AUTHORIZED_STATUS')
  || !includesText(agreementDetailsExecution.reply, 'AUTHORIZED_DATE')
  || includesText(agreementDetailsExecution.reply, 'Şu anda Sözleşmeler ekranındasın')
  || includesText(agreementDetailsExecution.reply, 'doğrulanabilir güvenli adım')) {
  fail('authorized agreement details must compose record facts instead of generic UI guidance');
}
ok('authorized agreement details preserve RECORD_DETAILS facts without UI guidance fallback');

const unauthorizedAgreementExecution = await executeSemanticQueryPlan({
  plan: agreementDetailsPlan,
  allowedDomains: ['DRIVERS'],
  readDomain: async (domain) => ({
    domain,
    count: 1,
    facts: [{ id: selectedAgreementId, statusText: 'MUST_NOT_LEAK', dateText: 'MUST_NOT_LEAK' }],
  }),
});
if (unauthorizedAgreementExecution.status !== 'UNAUTHORIZED'
  || includesText(unauthorizedAgreementExecution.reply, 'MUST_NOT_LEAK')) {
  fail('unauthorized agreement details must fail closed without leaking facts');
}
ok('unauthorized agreement details remain fail-closed');

const missingAgreementScreen = { ...agreementScreen, selectedEntityId: selectedAgreementId + 1000, selectedLabel: 'Bilinmeyen sözleşme' };
const missingAgreementRequest = resolveCanonicalConversationRequest({ message: agreementDetailsMessage, user: driverUser, screenContext: missingAgreementScreen });
const missingAgreementPlan = resolveSemanticIntent({ message: agreementDetailsMessage, user: driverUser, screenContext: missingAgreementScreen, canonicalRequest: missingAgreementRequest });
const missingAgreementExecution = await executeSemanticQueryPlan({
  plan: missingAgreementPlan,
  allowedDomains: ['AGREEMENTS'],
  readDomain: async (domain) => ({ domain, count: 0, facts: [] }),
});
if (missingAgreementExecution.status !== 'NO_DATA'
  || includesText(missingAgreementExecution.reply, 'AUTHORIZED_STATUS')
  || includesText(missingAgreementExecution.reply, 'AUTHORIZED_DATE')) {
  fail('missing agreement details must not substitute another record or invent facts');
}
ok('missing agreement details remain fail-closed without record substitution');

const offerScreen = {
  path: '/room/offers',
  label: 'Teklifler',
  role: 'ROOM',
  selectedEntityType: 'offer',
  selectedEntityId: 37,
  selectedLabel: 'Teklif 37',
};
const offerDetailsMessage = 'Bu teklifin durumunu ve detaylarını açıkla.';
const offerDetailsRequest = resolveCanonicalConversationRequest({ message: offerDetailsMessage, user: driverUser, screenContext: offerScreen });
const offerDetailsPlan = resolveSemanticIntent({ message: offerDetailsMessage, user: driverUser, screenContext: offerScreen, canonicalRequest: offerDetailsRequest });
const selectedOfferId = Number(offerScreen.selectedEntityId);
if (offerDetailsRequest.request.operation !== 'EXPLAIN_RECORD_DETAILS'
  || offerDetailsPlan.family !== 'RECORD_DETAILS'
  || !offerDetailsPlan.entities?.some((entity) => entity.type === 'offer' && Number(entity.id) === selectedOfferId)
  || offerDetailsPlan.family === 'UI_GUIDANCE') {
  fail('selected offer status-and-details request must remain RECORD_DETAILS and retain the typed offer');
}
const offerDetailsExecution = await executeSemanticQueryPlan({
  plan: offerDetailsPlan,
  allowedDomains: ['OFFERS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      offerId: entity.id,
      companyName: 'AUTHORIZED_COMPANY',
      statusText: 'AUTHORIZED_STATUS',
      shiftId: 210,
      serviceBuyerAmount: 1,
      serviceBuyerAmountText: 'AUTHORIZED_AMOUNT',
      note: 'AUTHORIZED_NOTE',
    })),
  }),
});
if (offerDetailsExecution.status !== 'RESOLVED'
  || !includesText(offerDetailsExecution.reply, 'AUTHORIZED_STATUS')
  || !includesText(offerDetailsExecution.reply, 'AUTHORIZED_AMOUNT')
  || includesText(offerDetailsExecution.reply, 'Şu anda Teklifler ekranındasın')
  || includesText(offerDetailsExecution.reply, 'genel')) {
  fail('authorized offer status-and-details must compose record facts instead of a field-only or generic guidance reply');
}
ok('authorized offer status-and-details preserve RECORD_DETAILS facts without generic guidance fallback');

const liveOfferScreen = {
  ...offerScreen,
  uiHints: {
    visibleButtons: [
      { label: 'Teklif ayrıntılarını göster', targetKey: 'offer-details', semanticType: 'DISCLOSURE' },
      { label: 'Durum', targetKey: 'offer-status', semanticType: 'FIELD' },
    ],
  },
};
const liveOfferRequest = resolveCanonicalConversationRequest({
  message: offerDetailsMessage,
  user: driverUser,
  screenContext: liveOfferScreen,
});
if (liveOfferRequest.request.operation !== 'EXPLAIN_RECORD_DETAILS'
  || liveOfferRequest.canonicalShape?.taskType !== 'RECORD_DETAILS') {
  fail('live offer UI vocabulary must not downgrade combined status-and-details into FIELD_LOOKUP');
}
ok('live offer UI vocabulary preserves combined status-and-details as RECORD_DETAILS');
const liveOfferStatusRequest = resolveCanonicalConversationRequest({
  message: 'Teklifin durumu ne?',
  user: driverUser,
  screenContext: liveOfferScreen,
});
if (liveOfferStatusRequest.request.operation !== 'LOOK_UP_FIELD'
  || liveOfferStatusRequest.canonicalShape?.taskType !== 'FIELD_LOOKUP') {
  fail('live offer UI vocabulary must preserve a single status question as FIELD_LOOKUP');
}
ok('live offer UI vocabulary preserves a single status question as FIELD_LOOKUP');

const offerAgreementRelationMessage = 'Bu teklifin karşı teklifi var mı ve bir sözleşmeye bağlandı mı?';
const offerAgreementRelationRequest = resolveCanonicalConversationRequest({
  message: offerAgreementRelationMessage,
  user: driverUser,
  screenContext: liveOfferScreen,
});
if (offerAgreementRelationRequest.request.operation !== 'LOOK_UP_RELATION'
  || offerAgreementRelationRequest.canonicalShape?.taskType !== 'RELATION_LOOKUP') {
  fail('offer relationship question must not be reduced to collection COUNT by a cardinality cue');
}
ok('offer relationship question preserves typed relation intent over collection cardinality');

const offerAgreementRelationScreen = {
  ...liveOfferScreen,
  selectedRelatedEntityType: 'shift',
  selectedRelatedEntityId: 210,
};
const offerAgreementRelationWithSelectedShiftRequest = resolveCanonicalConversationRequest({
  message: offerAgreementRelationMessage,
  user: driverUser,
  screenContext: offerAgreementRelationScreen,
});
const offerAgreementRelationWithSelectedShiftPlan = resolveSemanticIntent({
  message: offerAgreementRelationMessage,
  user: driverUser,
  screenContext: offerAgreementRelationScreen,
  canonicalRequest: offerAgreementRelationWithSelectedShiftRequest,
});
if (offerAgreementRelationWithSelectedShiftPlan.entities?.some((entity) => entity.type === 'agreement' && Number(entity.id) === 210)
  || !offerAgreementRelationWithSelectedShiftPlan.relationshipTraversal?.some((link) => String(link.key || '').startsWith('offer->agreement'))) {
  fail('offer-to-agreement relation must not reuse the selected shift id as an agreement id');
}
ok('offer-to-agreement relation keeps selected shift identity typed and avoids phantom agreement id');
const offerAgreementTarget = offerAgreementRelationWithSelectedShiftPlan.relationshipIntent?.toEntity
  || offerAgreementRelationWithSelectedShiftPlan.relationSpec?.toEntity
  || null;
if (offerAgreementTarget?.type === 'agreement' && !(Number(offerAgreementTarget.id) > 0)) {
  fail('offer-to-agreement relation must not retain an unverified null agreement target');
}
ok('offer-to-agreement relation does not retain an unverified null agreement target');
const offerAgreementContinuationPlan = {
  ...offerAgreementRelationWithSelectedShiftPlan,
  family: 'CONTINUE_CURRENT_REASONING',
  intentFamily: 'CONTINUE_CURRENT_REASONING',
  answerMode: 'CONTINUATION',
  continuationOfFamily: 'RELATION_LOOKUP',
  continuationDepth: 1,
  entity: { type: 'offer', id: 37 },
  entities: [{ type: 'offer', id: 37 }],
};
const offerAgreementContinuationExecution = await executeSemanticQueryPlan({
  plan: offerAgreementContinuationPlan,
  allowedDomains: ['OFFERS', 'AGREEMENTS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      offerId: entity.id,
      agreementId: null,
      shiftId: 210,
      statusText: 'COUNTERED',
    })),
  }),
});
if (includesText(offerAgreementContinuationExecution.reply, 'Sözleşme #null')
  || includesText(offerAgreementContinuationExecution.reply, 'ilişki yetkili kanıtla doğrulandı')) {
  fail('offer continuation must preserve an absent agreement as an unverified relationship');
}
ok('offer continuation preserves an absent agreement as an unverified relationship');

const shiftOfferMessage = "Vardiya 211'e ait teklifin durumunu ve tutarını açıkla.";
const shiftOfferScreen = {
  path: '/room/shifts',
  label: 'Vardiyalar',
  role: 'ROOM',
  selectedEntityType: 'shift',
  selectedEntityId: 211,
  selectedLabel: 'Vardiya ID 211',
};
const shiftOfferRequest = resolveCanonicalConversationRequest({
  message: shiftOfferMessage,
  user: driverUser,
  screenContext: shiftOfferScreen,
});
const shiftOfferPlan = resolveSemanticIntent({
  message: shiftOfferMessage,
  user: driverUser,
  screenContext: shiftOfferScreen,
  canonicalRequest: shiftOfferRequest,
});
const shiftOfferStatusField = shiftOfferPlan.requestedFields?.find((field) => field.key === 'STATUS');
if (!shiftOfferPlan.relationshipTraversal?.some((link) => link.key === 'shift->offer')
  || !shiftOfferPlan.requestedFields?.some((field) => field.key === 'SERVICE_BUYER_AMOUNT' && field.domain === 'OFFERS')
  || !shiftOfferPlan.requestedFields?.some((field) => field.key === 'CARRIER_AMOUNT' && field.domain === 'OFFERS')
  || shiftOfferStatusField?.domain !== 'OFFERS') {
  fail('shift-to-offer commercial lookup must bind neutral status to the authorized offer domain');
}
ok('shift-to-offer commercial lookup binds status and amounts to the authorized offer domain');
const shiftOfferExecution = await executeSemanticQueryPlan({
  plan: shiftOfferPlan,
  allowedDomains: ['SHIFTS', 'OFFERS'],
  readDomain: async (domain, { entities }) => domain === 'OFFERS'
    ? {
      domain,
      count: entities.length,
      facts: entities.map((entity) => ({
        id: entity.id + 1000,
        offerId: entity.id + 1000,
        shiftId: entity.id,
        statusText: 'AUTHORIZED_OFFER_STATUS',
        serviceBuyerAmountText: 'AUTHORIZED_SERVICE_AMOUNT',
        carrierAmountText: 'AUTHORIZED_CARRIER_AMOUNT',
      })),
    }
    : {
      domain,
      count: entities.length,
      facts: entities.map((entity) => ({ id: entity.id, shiftId: entity.id, statusText: 'AUTHORIZED_SHIFT_STATUS' })),
    },
});
if (shiftOfferExecution.status !== 'RESOLVED'
  || !includesText(shiftOfferExecution.reply, 'AUTHORIZED_OFFER_STATUS')
  || !includesText(shiftOfferExecution.reply, 'AUTHORIZED_SERVICE_AMOUNT')
  || !includesText(shiftOfferExecution.reply, 'AUTHORIZED_CARRIER_AMOUNT')
  || includesText(shiftOfferExecution.reply, 'AUTHORIZED_SHIFT_STATUS')) {
  fail('shift-to-offer commercial lookup must compose offer status and authorized amounts without using shift status: ' + shiftOfferExecution.reply);
}
ok('shift-to-offer commercial lookup composes offer status and authorized amounts');
const deniedShiftOfferExecution = await executeSemanticQueryPlan({
  plan: shiftOfferPlan,
  allowedDomains: ['SHIFTS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      shiftId: entity.id,
      statusText: 'MUST_NOT_LEAK_OFFER_STATUS',
      serviceBuyerAmountText: 'MUST_NOT_LEAK_OFFER_AMOUNT',
    })),
  }),
});
if (deniedShiftOfferExecution.status !== 'UNAUTHORIZED'
  || includesText(deniedShiftOfferExecution.reply, 'MUST_NOT_LEAK_OFFER_STATUS')
  || includesText(deniedShiftOfferExecution.reply, 'MUST_NOT_LEAK_OFFER_AMOUNT')) {
  fail('shift-to-offer commercial lookup must fail closed when the offer domain is not authorized');
}
ok('shift-to-offer commercial lookup remains fail-closed when offers are unauthorized');

const offerNotesScreen = {
  path: '/room/offers',
  label: 'Teklifler',
  role: 'ROOM',
  selectedEntityType: 'offer',
  selectedEntityId: 37,
  selectedLabel: 'Teklif #37',
};
const offerNotesUser = { id: 980002, role: 'ROOM', roomId: 1, companyKind: 'ROOM' };
const offerNoteCases = [
  ['both offer notes', 'Bu teklifin notlarını göster.', ['NOTE']],
  ['service buyer note', 'Hizmet alan firmanın notunda ne yazıyor?', ['NOTE_COMPANY']],
  ['carrier note', 'Taşımacılık firmasının açıklaması nedir?', ['NOTE_ROOM']],
];
for (const [label, message, expectedFields] of offerNoteCases) {
  const request = resolveCanonicalConversationRequest({ message, user: offerNotesUser, screenContext: offerNotesScreen });
  const plan = resolveSemanticIntent({ message, user: offerNotesUser, screenContext: offerNotesScreen, canonicalRequest: request });
  const actualFields = (plan.requestedFields || []).map((field) => field.key);
  if (plan.typedRequest?.taskType !== 'FIELD_LOOKUP'
    || !plan.entities?.some((entity) => entity.type === 'offer' && Number(entity.id) === 37)
    || !expectedFields.every((field) => actualFields.includes(field))) {
    fail(`${label} must preserve selected offer note field lookup: ${JSON.stringify({ taskType: plan.typedRequest?.taskType, entities: plan.entities, fields: actualFields, family: plan.family })}`);
  }
}
const offerNotesRequest = resolveCanonicalConversationRequest({ message: 'Bu teklifin notlarını göster.', user: offerNotesUser, screenContext: offerNotesScreen });
const offerNotesPlan = resolveSemanticIntent({ message: 'Bu teklifin notlarını göster.', user: offerNotesUser, screenContext: offerNotesScreen, canonicalRequest: offerNotesRequest });
const offerNotesExecution = await executeSemanticQueryPlan({
  plan: offerNotesPlan,
  allowedDomains: ['OFFERS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      offerId: entity.id,
      shiftId: 210,
      noteCompany: 'AUTHORIZED_SERVICE_BUYER_NOTE',
      noteRoom: 'AUTHORIZED_CARRIER_NOTE',
    })),
  }),
});
if (offerNotesExecution.status !== 'RESOLVED'
  || !includesText(offerNotesExecution.reply, 'AUTHORIZED_SERVICE_BUYER_NOTE')
  || !includesText(offerNotesExecution.reply, 'AUTHORIZED_CARRIER_NOTE')
  || includesText(offerNotesExecution.reply, 'İstenen alanı bu ifadeden güvenle çıkaramadım')) {
  fail('selected offer note lookup must compose both authorized note fields without clarification: ' + offerNotesExecution.reply);
}
if (!includesText(awarenessSource, 'const selectedOfferFieldLookup =')
  || !includesText(awarenessSource, 'if (selectedOfferFieldLookup && !allowRecordDetails) return null;')
  || !includesText(awarenessSource, 'explicitOfferRecordNavigationTarget(user, semanticPlan, authorizationDecision, { allowRecordDetails: true })')) {
  fail('selected offer field lookup must not be intercepted by record-surface navigation');
}
ok('selected offer note lookup preserves both authorized note fields and fails closed outside the selected offer');

const checkinScreen = {
  path: '/room/checkin',
  label: 'Biniş kayıtları',
  role: 'ROOM',
  selectedEntityType: 'shift',
  selectedEntityId: 168,
  selectedLabel: 'Vardiya 168',
};
if (!includesText(checkinPanel, 'setCopilotSelection')
  || !includesText(checkinPanel, 'scopeKey: "/room/checkin"')
  || !includesText(checkinPanel, 'entityType: "shift"')
  || !includesText(checkinPanel, 'boardingCount')
  || !includesText(checkinPanel, 'alightingCount')) {
  fail('ROOM check-in must publish the selected shift and read-only biniş/iniş evidence to Sefer Abi');
}
ok('ROOM check-in publishes selected shift and read-only biniş/iniş evidence');
const checkinMessage = 'Seçili vardiyanın biniş ve iniş durumunu açıkla';
const checkinRequest = resolveCanonicalConversationRequest({ message: checkinMessage, user: driverUser, screenContext: checkinScreen });
const checkinPlan = resolveSemanticIntent({ message: checkinMessage, user: driverUser, screenContext: checkinScreen, canonicalRequest: checkinRequest });
if (!checkinPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 168)) fail('check-in plan loses the live typed shift');
if (!checkinPlan.requestedFields?.some((field) => field.key === 'BOARDING_COUNT') || !checkinPlan.requestedFields?.some((field) => field.key === 'ALIGHTING_COUNT')) fail('check-in plan loses biniş/iniş count fields');
ok('check-in plan preserves selected shift and biniş/iniş fields');

const liveCheckinMessage = 'Bu vardiyanın durumunu, kaç kişinin bindiğini ve kaç kişinin indiğini açıkla.';
const liveCheckinRequest = resolveCanonicalConversationRequest({ message: liveCheckinMessage, user: driverUser, screenContext: checkinScreen });
const liveCheckinPlan = resolveSemanticIntent({ message: liveCheckinMessage, user: driverUser, screenContext: checkinScreen, canonicalRequest: liveCheckinRequest });
const liveCheckinFields = [
  ...(liveCheckinRequest?.canonicalShape?.requestedFields || []),
  ...(liveCheckinPlan?.requestedFields || []),
].map((field) => field?.key);
if (liveCheckinRequest?.canonicalShape?.taskType === 'COUNT'
  || liveCheckinRequest?.request?.operation === 'COUNT'
  || !liveCheckinFields.includes('STATUS')
  || !liveCheckinFields.includes('BOARDING_COUNT')
  || !liveCheckinFields.includes('ALIGHTING_COUNT')
  || liveCheckinFields.includes('PASSENGER_COUNT')) {
  fail('natural-language Check-in status plus biniş/iniş request must not collapse to PASSENGER_COUNT');
}
ok('natural-language Check-in status plus biniş/iniş request preserves the three requested facts');
const liveCheckinExecution = await executeSemanticQueryPlan({
  plan: liveCheckinPlan,
  allowedDomains: ['SHIFTS', 'OPERATIONS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      shiftId: entity.id,
      statusText: 'AUTHORIZED_STATUS',
      boardingCount: 0,
      alightingCount: 0,
    })),
  }),
});
if (liveCheckinExecution.status !== 'RESOLVED'
  || !includesText(liveCheckinExecution.reply, 'AUTHORIZED_STATUS')
  || !includesText(liveCheckinExecution.reply, 'biniş sayısı: 0')
  || !includesText(liveCheckinExecution.reply, 'iniş sayısı: 0')
  || includesText(liveCheckinExecution.reply, 'yolcu sayısı')) {
  fail('natural-language Check-in request must compose status and read-only biniş/iniş facts: ' + liveCheckinExecution.reply);
}
ok('natural-language Check-in request composes status and read-only biniş/iniş facts');

const shiftOperationsMessage = 'Bu vardiyanın aracı, sürücüsü ve operasyon durumu nedir?';
const shiftOperationsRequest = resolveCanonicalConversationRequest({ message: shiftOperationsMessage, user: driverUser, screenContext: checkinScreen });
const shiftOperationsPlan = resolveSemanticIntent({ message: shiftOperationsMessage, user: driverUser, screenContext: checkinScreen, canonicalRequest: shiftOperationsRequest });
if (!shiftOperationsPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 168)
  || !['STATUS', 'VEHICLE', 'DRIVER', 'OPERATION_STATUS'].every((key) => shiftOperationsPlan.requestedFields?.some((field) => field.key === key))) {
  fail('natural-language Shift operations request must preserve the selected shift and status/vehicle/driver/operation-status fields');
}
const shiftOperationsExecution = await executeSemanticQueryPlan({
  plan: shiftOperationsPlan,
  allowedDomains: ['SHIFTS', 'VEHICLES', 'DRIVERS', 'OPERATIONS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      shiftId: entity.id,
      statusText: 'AUTHORIZED_STATUS',
      vehiclePlate: 'AUTHORIZED_PLATE',
      driverName: 'AUTHORIZED_DRIVER',
      operationStatus: 'AUTHORIZED_OPERATION_STATUS',
      startAtText: '4.09.2026 07:00',
      text: 'Vardiya #168 • Geçmiş kayıt • AUTHORIZED_STATUS • Araç AUTHORIZED_PLATE • Sürücü AUTHORIZED_DRIVER • 4.09.2026 07:00',
    })),
  }),
});
if (shiftOperationsExecution.status !== 'RESOLVED'
  || !includesText(shiftOperationsExecution.reply, 'AUTHORIZED_STATUS')
  || !includesText(shiftOperationsExecution.reply, 'AUTHORIZED_PLATE')
  || !includesText(shiftOperationsExecution.reply, 'AUTHORIZED_DRIVER')
  || !includesText(shiftOperationsExecution.reply, 'AUTHORIZED_OPERATION_STATUS')) {
  fail('natural-language Shift operations request must compose authorized status, vehicle, driver, and operation-status facts: ' + shiftOperationsExecution.reply);
}
ok('natural-language Shift operations request composes authorized status, vehicle, driver, and operation-status facts');

const selectedShiftStaleState = {
  lastScreenPath: '/room/shifts',
  lastExplicitEntitySet: [{ type: 'shift', id: 211, source: 'EXPLICIT_QUERY' }],
  entityContext: { conversationEntities: [{ type: 'shift', id: 211, source: 'EXPLICIT_QUERY' }] },
  activeComparisonSet: [],
};
const selectedShiftContext = {
  path: '/room/shifts',
  label: 'Vardiyalar',
  role: 'ROOM',
  selectedEntityType: 'shift',
  selectedEntityId: 210,
  selectedLabel: 'Vardiya ID 210',
};
const selectedShiftStaleMessage = 'Seçili vardiyanın araç ve sürücü bilgisi nedir?';
const selectedShiftStaleRequest = resolveCanonicalConversationRequest({
  message: selectedShiftStaleMessage,
  user: driverUser,
  conversationState: selectedShiftStaleState,
  screenContext: selectedShiftContext,
});
const selectedShiftStalePlan = resolveSemanticIntent({
  message: selectedShiftStaleMessage,
  user: driverUser,
  conversationState: selectedShiftStaleState,
  screenContext: selectedShiftContext,
  canonicalRequest: selectedShiftStaleRequest,
});
if (!selectedShiftStalePlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 210)
  || selectedShiftStalePlan.entities.some((entity) => entity.type === 'shift' && Number(entity.id) === 211)) {
  fail('selected shift must suppress a retained same-type stale relation target');
}
ok('selected shift suppresses a retained same-type stale relation target');

const numericReferentQuestion = "211'e kaç para teklif edilmiş?";
const numericHomeScreen = {
  path: '/room',
  label: 'Ana Sayfa',
  role: 'ROOM',
  selectedEntityType: null,
  selectedEntityId: null,
  selectedLabel: null,
};
const numericHistoryState = {
  lastScreenPath: '/room/offers',
  lastExplicitEntitySet: [{ type: 'offer', id: 37, source: 'EXPLICIT_QUERY' }],
  entityContext: { conversationEntities: [{ type: 'offer', id: 37, source: 'EXPLICIT_QUERY' }] },
  activeComparisonSet: [],
};
const numericHomeRequest = resolveCanonicalConversationRequest({
  message: numericReferentQuestion,
  user: driverUser,
  conversationState: numericHistoryState,
  screenContext: numericHomeScreen,
});
const numericHomePlan = resolveSemanticIntent({
  message: numericReferentQuestion,
  user: driverUser,
  conversationState: numericHistoryState,
  screenContext: numericHomeScreen,
  canonicalRequest: numericHomeRequest,
});
if (numericHomeRequest.canonicalShape?.ambiguity !== 'NUMERIC_REFERENT_TYPE_UNRESOLVED'
  || numericHomeRequest.request?.operation !== 'CLARIFY_SEMANTIC_REQUEST'
  || numericHomePlan.entities?.length
  || numericHomePlan.family !== 'UNCLEAR_OR_AMBIGUOUS') {
  fail('bare numeric Turkish referent without a typed surface must clarify and must not reuse stale offer context');
}
ok('bare numeric Turkish referent without a typed surface remains fail-closed and stale-context safe');

const numericShiftScreen = {
  ...selectedShiftContext,
  selectedEntityId: 210,
  selectedLabel: 'Vardiya ID 210',
};
const numericShiftRequest = resolveCanonicalConversationRequest({
  message: numericReferentQuestion,
  user: driverUser,
  conversationState: numericHistoryState,
  screenContext: numericShiftScreen,
});
const numericShiftPlan = resolveSemanticIntent({
  message: numericReferentQuestion,
  user: driverUser,
  conversationState: numericHistoryState,
  screenContext: numericShiftScreen,
  canonicalRequest: numericShiftRequest,
});
if (numericShiftRequest.canonicalShape?.explicitEntityReference?.type !== 'SHIFT'
  || Number(numericShiftRequest.canonicalShape?.explicitEntityReference?.id) !== 211
  || !numericShiftPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 211)
  || numericShiftPlan.entities?.some((entity) => entity.type === 'shift' && Number(entity.id) === 210)) {
  fail('explicit 211 referent must inherit only the live shift type and override selected 210');
}
ok('explicit 211 referent overrides selected 210 without hardcoded record fallback');

const shiftContinuationPlan = {
  ...shiftOperationsPlan,
  family: 'CONTINUE_CURRENT_REASONING',
  intentFamily: 'CONTINUE_CURRENT_REASONING',
  answerMode: 'CONTINUATION',
  continuationOfFamily: shiftOperationsPlan.family,
  continuationDepth: 1,
  previousAnswerText: shiftOperationsExecution.reply,
};
const shiftContinuationExecution = await executeSemanticQueryPlan({
  plan: shiftContinuationPlan,
  allowedDomains: ['SHIFTS', 'VEHICLES', 'DRIVERS', 'OPERATIONS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      shiftId: entity.id,
      statusText: 'AUTHORIZED_STATUS',
      vehiclePlate: 'AUTHORIZED_PLATE',
      driverName: 'AUTHORIZED_DRIVER',
      operationStatus: 'AUTHORIZED_OPERATION_STATUS',
      startAtText: '4.09.2026 07:00',
      text: 'Vardiya #168 • Geçmiş kayıt • AUTHORIZED_STATUS • Araç AUTHORIZED_PLATE • Sürücü AUTHORIZED_DRIVER • 4.09.2026 07:00',
    })),
  }),
});
if (shiftContinuationExecution.status !== 'RESOLVED'
  || !includesText(shiftContinuationExecution.reply, '4.09.2026 07:00')
  || includesText(shiftContinuationExecution.reply, 'ek yetkili kanıt')
  || includesText(shiftContinuationExecution.reply, 'yeni bir domain')) {
  fail('continuation must expose only novel authorized detail in user-facing language: ' + shiftContinuationExecution.reply);
}
ok('continuation exposes only novel authorized detail without internal language');

const shiftFinalContinuationExecution = await executeSemanticQueryPlan({
  plan: { ...shiftContinuationPlan, continuationDepth: 2, previousAnswerText: shiftContinuationExecution.reply },
  allowedDomains: ['SHIFTS', 'VEHICLES', 'DRIVERS', 'OPERATIONS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      id: entity.id,
      shiftId: entity.id,
      statusText: 'AUTHORIZED_STATUS',
      vehiclePlate: 'AUTHORIZED_PLATE',
      driverName: 'AUTHORIZED_DRIVER',
      operationStatus: 'AUTHORIZED_OPERATION_STATUS',
      startAtText: '4.09.2026 07:00',
      text: 'Vardiya #168 • Geçmiş kayıt • AUTHORIZED_STATUS • Araç AUTHORIZED_PLATE • Sürücü AUTHORIZED_DRIVER • 4.09.2026 07:00',
    })),
  }),
});
if (shiftFinalContinuationExecution.continuationComplete !== true
  || includesText(shiftFinalContinuationExecution.reply, 'yetkili kanıt')
  || includesText(shiftFinalContinuationExecution.reply, 'kanıt kümesi')) {
  fail('continuation must terminate cleanly when no novel authorized detail remains: ' + shiftFinalContinuationExecution.reply);
}
ok('continuation terminates cleanly when no novel authorized detail remains');

const hubScreen = { path: '/room/hub', label: 'Taşımacılık Firması Konumu', role: 'ROOM' };
const hubMessage = 'Bu konum ve harita ekranında ne yapabilirim?';
const hubRequest = resolveCanonicalConversationRequest({ message: hubMessage, user: driverUser, screenContext: hubScreen });
const hubPlan = resolveSemanticIntent({ message: hubMessage, user: driverUser, screenContext: hubScreen, canonicalRequest: hubRequest });
if (hubPlan.family === 'ROLE_EXPLANATION_HELP' || hubPlan.scopeTarget === 'ROLE_GLOBAL') fail('current Hub surface question must not fall into generic role help');
if (!['SCREEN_CONTEXT', 'UI_GUIDANCE'].includes(hubPlan.family) || hubPlan.scopeTarget !== 'CURRENT_SCREEN') fail('Hub current-surface question must preserve current-screen scope');
ok('Hub current-surface question preserves current-screen scope');
console.log('=== M71.8 COPILOT SELECTED ENTITY RESOLVE CHECK PASS ===');
