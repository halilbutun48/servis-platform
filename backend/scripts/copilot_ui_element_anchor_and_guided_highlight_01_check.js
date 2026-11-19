#!/usr/bin/env node

import {
  resolveCopilotGuidedTarget,
  isCopilotGuidanceMessage,
  GUIDED_TARGET_STATUSES,
} from '../src/ai/chat/copilotUiElementAnchor.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { runCopilotFoundation } from '../src/ai/service.js';
import { buildCanonicalProductKnowledgeInventory, buildCanonicalSemanticBlockInventory, listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  buildGuidedDraftResumeCandidates,
  deriveGuidedDraftResumeStep,
} from '../src/routes/shifts/helpers.js';
import {
  mapPersistedStopsForDisplay,
  buildStopSummary,
  shouldPersistPeopleSnapshot,
} from '../../web/src/panels/company/shiftPeopleTabUtils.js';
import { shouldRestoreGuidedTargetAfterRouteChange } from '../../web/src/copilot/guidedTargetState.js';
import { humanizeUserFacingText } from '../../web/src/utils/terminology.js';
import { resolveFieldPrivacyPolicy } from '../src/ai/chat/fieldPrivacyPolicy.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function source(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

function hasCanonicalPeopleStepIdentity(sourceText) {
  return /data-copilot-target=\{organization \? guidedTargetKey : undefined\}/u.test(sourceText)
    || /data-copilot-semantic-id=\{organization \? undefined : ['"]product:company-shifts:step3:address-next['"]\}/u.test(sourceText);
}

function assert(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

const guidedDraftBase = {
  id: 198,
  companyId: 10,
  roomId: null,
  status: 'DRAFT',
  hubLat: 41.01,
  hubLng: 29.01,
  startAt: '2026-09-28T06:00:00.000Z',
  endAt: '2026-09-28T14:00:00.000Z',
  peopleCount: 6,
  stops: [{ id: 1, order: 1 }],
  offers: [],
};
const guidedCreateAudit = {
  entityId: 198,
  action: 'SHIFT_CREATE',
  actorRole: 'COMPANY',
  meta: { via: 'GUIDED_BATCH', status: 'DRAFT' },
};
const guidedCandidates = buildGuidedDraftResumeCandidates(
  [guidedDraftBase],
  [guidedCreateAudit],
  { role: 'COMPANY', companyId: 10 },
);
assert(guidedCandidates.length === 1, 'server candidate requires canonical GUIDED_BATCH provenance');
assert(humanizeUserFacingText('Rehberi Başlat') === 'Rehberi Başlat', 'canonical visible labels survive web terminology normalization');
assert(humanizeUserFacingText('Bu akışta Rehberi Başlat ile ilerle.') === 'Bu akışta Rehberi Başlat ile ilerle.', 'canonical label remains exact inside visible guidance text');
assert(guidedCandidates[0].id === 198, 'candidate preserves exact server draft identity');
assert(guidedCandidates[0].resumeStep === 2, 'complete persisted prerequisites resume at Step 3 UI state');
assert(deriveGuidedDraftResumeStep({ ...guidedDraftBase, stops: [] }) === 1, 'partial personnel-only state falls back to Step 2 UI state');
assert(deriveGuidedDraftResumeStep({ ...guidedDraftBase, peopleCount: 0 }) === 1, 'partial stops-only state falls back to Step 2 UI state');
assert(
  buildGuidedDraftResumeCandidates(
    [{ ...guidedDraftBase, id: 199, companyId: 11 }],
    [{ ...guidedCreateAudit, entityId: 199 }],
    { role: 'COMPANY', companyId: 10 },
  ).length === 0,
  'candidate discovery rejects cross-tenant drafts',
);
assert(buildGuidedDraftResumeCandidates([], [], { role: 'COMPANY', companyId: 10 }).length === 0, 'no-draft baseline keeps normal new-plan entry');
assert(
  buildGuidedDraftResumeCandidates(
    [guidedDraftBase],
    [{ ...guidedCreateAudit, meta: { status: 'DRAFT' } }],
    { role: 'COMPANY', companyId: 10 },
  ).length === 0,
  'unproven draft provenance is not exposed as resumable',
);
const guidedModalSource = source('web/src/panels/company/GuidedPlanModal.jsx');
assert(guidedModalSource.includes('loadGuidedDraftCandidates'), 'guided modal uses server-backed draft discovery');
assert(guidedModalSource.includes('resumeChooserOpen'), 'guided modal exposes an explicit resume choice state');
assert(!guidedModalSource.includes('cleanupGuidedDraftShifts({ token, ids: lingeringIds })'), 'normal guided entry does not delete lingering drafts');

const navDockSource = source('web/src/layout/NavDock.jsx');
assert(
  navDockSource.includes('const advancedVisible = showAdvanced || mobileOpen;'),
  'mobile navigation opens the advanced live-tracking section for guided targets',
);
assert(
  navDockSource.includes('{advancedVisible ? <Section title={null} items={cfg.advanced} path={path} onItemSelect={handleMobileSelect} /> : null}'),
  'mobile navigation keeps the canonical advanced targets in the live DOM',
);

// M18 bounded regressions: authorized UI help must not be mistaken for raw
// personal-data disclosure, and server-hydrated personnel must not be
// re-written merely because the Step-3 component mounted.
const addressUiPlan = {
  family: 'UI_GUIDANCE',
  intentFamily: 'UI_GUIDANCE',
  explicitUiGuidance: true,
  capabilityIntent: 'ENTER_ADDRESS',
  workflowIntent: 'CREATE_SHIFT',
  scopeTarget: 'CURRENT_SCREEN',
};
assert(
  resolveFieldPrivacyPolicy({ user: { role: 'COMPANY', companyId: 10 }, message: 'adresi nereye yazacağım?', plan: addressUiPlan }).status === 'ALLOW',
  'authorized address UI help is not blocked by raw-address privacy guard',
);
assert(
  resolveFieldPrivacyPolicy({
    user: { role: 'COMPANY', companyId: 10 },
    message: 'adresi nereye yazacağım?',
    plan: {
      family: 'EXPLAIN_CURRENT_TARGET',
      intentFamily: 'EXPLAIN_CURRENT_TARGET',
      capabilityIntent: 'ENTER_ADDRESS',
      workflowIntent: 'CREATE_SHIFT',
      planStatus: 'READY',
    },
  }).status === 'ALLOW',
  'canonical current-target address help is not downgraded to raw-address disclosure',
);
assert(
  resolveFieldPrivacyPolicy({ user: { role: 'COMPANY', companyId: 10 }, message: 'bu kişinin adresini söyle', plan: { family: 'FIELD_LOOKUP', intentFamily: 'FIELD_LOOKUP' } }).status === 'DENY',
  'raw personal address disclosure remains blocked',
);
assert(
shouldPersistPeopleSnapshot([{ id: 1, name: 'A' }], [{ id: 1, name: 'A' }]) === false,
  'hydrated personnel snapshot is not dirty on resume',
);
assert(
shouldPersistPeopleSnapshot([{ id: 1, name: 'B' }], [{ id: 1, name: 'A' }]) === true,
  'explicit personnel edit remains persistable',
);

const persistedStopDisplay = mapPersistedStopsForDisplay(
  [{ id: 1, name: 'Pickup 1', lat: 41.01, lng: 29.01, assignmentCount: 2 }],
  { hubLat: 41.02, hubLng: 29.02, direction: 'INBOUND' },
);
const persistedStopSummary = buildStopSummary({
  base: { source: 'PERSISTED_SHIFT' },
  stopsInput: persistedStopDisplay,
  peopleInput: [{ id: 1, lat: 41.01, lng: 29.01 }],
  computeGeoStatus: () => 'OK',
});
assert(persistedStopSummary.source === 'PERSISTED_SHIFT', 'persisted stop evidence keeps its canonical source');
assert(persistedStopSummary.stopCountWithoutHub === 1, 'persisted stop count excludes the virtual collection location');
assert(persistedStopSummary.stopCountWithHub === 2, 'collection location is presented as a separate virtual stop');
assert(persistedStopDisplay.some((stop) => stop.id === 'hub'), 'collection location remains explicitly identifiable');

function fixture(overrides = {}) {
  return {
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: {
      path: '/company/agreements',
      label: 'Sözleşmeler',
      role: 'COMPANY',
      uiHints: {
        activeTabs: ['Aktif'],
        visibleButtons: [
          { label: 'Detayları göster', semanticType: 'button', targetKey: 'company-agreements:detaylari-goster', disabled: false },
          { label: 'Filtrele', semanticType: 'button', targetKey: 'company-agreements:filtrele', disabled: false },
        ],
        activeTabs: [{ label: 'Aktif', semanticType: 'tab', targetKey: 'company-agreements:tab:aktif' }],
      },
    },
    conversationState: { guidedTarget: null },
    ...overrides,
  };
}

const found = resolveCopilotGuidedTarget({ ...fixture(), message: 'Detayları göster nerede?' });
assert(found.status === GUIDED_TARGET_STATUSES.FOUND, 'current semantic target is found');
assert(found.targetKey === 'company-agreements:detaylari-goster', 'target uses stable semantic key');
assert(found.safeAction === 'HIGHLIGHT', 'target is highlight-only safe action');
assert(found.criticalActionExecution === false, 'target cannot execute business action');

// ROOM offer-surface navigation is a real route action when the request is
// made from another authorized screen.  On the offers route itself the same
// target remains highlight-only so a contextual question cannot cause a
// redundant navigation.
const roomOfferSurfaceNavigationPlan = {
  family: 'UI_GUIDANCE',
  workflowIntent: 'OPEN_OFFER_SURFACE',
  explicitUiGuidance: true,
  canonicalRequest: {
    operation: 'VIEW_AUTHORIZED_SURFACE',
    semanticAction: { actionClass: 'VIEW', objectClass: 'OFFER' },
  },
};
const roomOfferSurfaceFromShifts = resolveCopilotGuidedTarget({
  user: { role: 'ROOM', roomId: 1 },
  screenContext: {
    path: '/room/shifts',
    label: 'Vardiyalar',
    role: 'ROOM',
    id: 1103,
    uiHints: {
      visibleMenus: [{ label: 'Teklifler', targetKey: 'room:offers', identitySource: 'CANONICAL', semanticType: 'button' }],
      visibleButtons: [],
    },
  },
  conversationState: { guidedTarget: null },
  semanticPlan: roomOfferSurfaceNavigationPlan,
  message: 'Tekliflerimi görmek istiyorum.',
});
assert(roomOfferSurfaceFromShifts.status === GUIDED_TARGET_STATUSES.FOUND, 'ROOM offer collection resolves the visible cross-screen target');
assert(roomOfferSurfaceFromShifts.targetKey === 'room:offers', 'ROOM offer collection preserves the canonical surface target');
assert(roomOfferSurfaceFromShifts.safeAction === 'NAVIGATE', 'ROOM offer collection requests navigation from another screen');
const roomOfferSurfaceOnOffers = resolveCopilotGuidedTarget({
  user: { role: 'ROOM', roomId: 1 },
  screenContext: {
    path: '/room/offers',
    label: 'Teklifler',
    role: 'ROOM',
    id: 1104,
    uiHints: {
      visibleMenus: [{ label: 'Teklifler', targetKey: 'room:offers', identitySource: 'CANONICAL', semanticType: 'section' }],
      visibleButtons: [],
    },
  },
  conversationState: { guidedTarget: null },
  semanticPlan: roomOfferSurfaceNavigationPlan,
  message: 'Tekliflerimi görmek istiyorum.',
});
assert(roomOfferSurfaceOnOffers.safeAction === 'HIGHLIGHT', 'ROOM offer collection remains highlight-only on the current offers screen');

// The live drawer sends a typed SURFACE/SCREEN_CONTEXT envelope together with
// canonical visible buttons.  A concrete offer workflow must still win over
// the generic home-surface fallback; otherwise the UI highlights Operasyon
// Merkezi even though the request is already resolved as OPEN_OFFER_SURFACE.
const roomOfferSurfaceWithTypedEnvelope = resolveCopilotGuidedTarget({
  user: { role: 'ROOM', roomId: 1 },
  screenContext: {
    path: '/room/offers',
    label: 'Teklifler',
    role: 'ROOM',
    id: 1102,
    uiHints: {
      visibleMenus: [
        { label: 'Operasyon Merkezi', targetKey: 'room:home', identitySource: 'CANONICAL', semanticType: 'button' },
        { label: 'Ticari Çalışma Alanı', targetKey: 'room:commercial-flow', identitySource: 'CANONICAL', semanticType: 'button' },
        { label: 'Teklifler', targetKey: 'room:offers', identitySource: 'CANONICAL', semanticType: 'button' },
      ],
      visibleButtons: [
        { label: 'Operasyon Merkezi', targetKey: 'room:home', identitySource: 'CANONICAL', semanticType: 'button' },
        { label: 'Ticari Çalışma Alanı', targetKey: 'room:commercial-flow', identitySource: 'CANONICAL', semanticType: 'button' },
        { label: 'Teklifler', targetKey: 'room:offers', identitySource: 'CANONICAL', semanticType: 'button' },
      ],
    },
  },
  conversationState: { guidedTarget: null },
  semanticPlan: {
    family: 'UI_GUIDANCE',
    workflowIntent: 'OPEN_OFFER_SURFACE',
    explicitUiGuidance: true,
    typedRequest: {
      taskType: 'SCREEN_CONTEXT',
      targetEntityType: 'SURFACE',
      explicitUiGuidance: true,
      workflowIntent: 'OPEN_OFFER_SURFACE',
    },
    canonicalRequest: {
      operation: 'VIEW_AUTHORIZED_SURFACE',
      semanticAction: { actionClass: 'EXPLAIN', objectClass: 'SURFACE' },
    },
  },
  message: 'Teklifleri açar mısın?',
});
assert(roomOfferSurfaceWithTypedEnvelope.status === GUIDED_TARGET_STATUSES.FOUND, 'typed ROOM offer request resolves a target');
assert(roomOfferSurfaceWithTypedEnvelope.targetKey === 'room:offers', 'typed ROOM offer request does not fall back to Operasyon Merkezi');
assert(roomOfferSurfaceWithTypedEnvelope.safeAction === 'HIGHLIGHT', 'typed ROOM offer request is highlight-only on the offers screen');

const roomOfferContinuationTarget = resolveCopilotGuidedTarget({
  user: { role: 'ROOM', roomId: 1 },
  screenContext: {
    path: '/room/offers',
    label: 'Teklifler',
    role: 'ROOM',
    id: 1102,
    uiHints: {
      visibleMenus: [{ label: 'Teklifler', targetKey: 'room:offers', identitySource: 'CANONICAL', semanticType: 'button' }],
      visibleButtons: [
        { label: 'Teklif #37', targetKey: 'room:offers:offer:37', identitySource: 'CANONICAL', semanticType: 'disclosure' },
        { label: 'Teklif #36', targetKey: 'room:offers:offer:36', identitySource: 'CANONICAL', semanticType: 'disclosure' },
      ],
    },
  },
  conversationState: { guidedTarget: null },
  semanticPlan: {
    family: 'CONTINUE_CURRENT_REASONING',
    workflowIntent: 'OPEN_OFFER_SURFACE',
    continuationIntent: true,
    continuationAction: 'EXPAND',
    explicitUiGuidance: true,
    typedRequest: {
      taskType: 'CONTINUE_CURRENT_REASONING',
      targetEntityType: 'OFFER',
      workflowIntent: 'OPEN_OFFER_SURFACE',
      explicitUiGuidance: true,
    },
    canonicalRequest: { operation: 'CONTINUE_EXPLANATION' },
  },
  message: 'Adım adım anlat.',
});
assert(roomOfferContinuationTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'offer continuation resolves a real visible offer target');
assert(/^room:offers:offer:\d+$/u.test(String(roomOfferContinuationTarget.targetKey || '')), 'offer continuation uses a canonical offer disclosure target');
assert(roomOfferContinuationTarget.safeAction === 'HIGHLIGHT', 'offer continuation remains read-only highlight guidance');

const knowledgeInventory = buildCanonicalProductKnowledgeInventory(fixture().user, {
  screenContext: {
    ...fixture().screenContext,
    uiHints: {
      ...fixture().screenContext.uiHints,
      semanticElements: [
        { semanticType: 'field', label: 'Başlangıç tarihi', targetKey: 'company-agreements:start-date', required: true, source: 'LIVE_UI' },
        // The same DOM control may be observed more than once through a
        // modal/portal or responsive duplicate.  It must remain one semantic
        // product element in the canonical ledger.
        { semanticType: 'field', label: 'Başlangıç tarihi', targetKey: 'company-agreements:start-date', required: true, source: 'LIVE_UI' },
        { semanticType: 'disclosure', label: 'Detayları göster', targetKey: 'company-agreements:details', expanded: false, source: 'LIVE_UI' },
        { semanticType: 'modal', label: 'Sözleşme detayı', targetKey: 'company-agreements:contract-detail', source: 'LIVE_UI' },
        { semanticType: 'validation', label: 'Tarih gerekli', targetKey: 'company-agreements:start-date:error', invalid: true, source: 'LIVE_UI' },
      ],
    },
  },
});
assert(knowledgeInventory.status === 'AUTHORIZED', 'canonical product knowledge inventory is role-authorized');
assert(knowledgeInventory.normalizedUniqueSemanticElements >= knowledgeInventory.canonicallyCoveredUniqueElements, 'inventory reports normalized and covered semantic elements');
assert(knowledgeInventory.elements.some((row) => row.type === 'FIELD' && row.label === 'Başlangıç tarihi'), 'inventory preserves live field semantics');
assert(knowledgeInventory.elements.some((row) => row.type === 'DISCLOSURE' && row.label === 'Detayları göster'), 'inventory preserves live disclosure semantics');
assert(knowledgeInventory.elements.some((row) => row.type === 'MODAL' && row.label === 'Sözleşme detayı'), 'inventory preserves live modal semantics');
assert(knowledgeInventory.elements.some((row) => row.type === 'VALIDATION' && row.invalid === true), 'inventory preserves live validation semantics');
assert(knowledgeInventory.fabricatedProductElements.length === 0, 'inventory does not fabricate product elements');
assert(knowledgeInventory.observedDomInstances === 5, 'inventory records all observed DOM instances');
assert(knowledgeInventory.normalizedUniqueSemanticElements < knowledgeInventory.elements.length + knowledgeInventory.observedDomInstances, 'inventory normalizes duplicate DOM instances to unique semantic elements');

// C→D product-knowledge frontier: aggregate the existing canonical catalog
// for every current role and authorized screen.  This stays on the existing
// M18 owner; it is deliberately not a second inventory or browser harness.
// The inventory builder already normalizes live DOM instances by semanticId.
// Here we make that contract explicit for every role and require every
// authorized element to carry the full explanation/safety surface.
const KNOWLEDGE_ROLES = ['ROOM', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const KNOWLEDGE_FIELDS = [
  'purpose', 'requiredInput', 'precondition', 'validation', 'recovery',
  'workflowState', 'completionEvidence', 'nextStep', 'safeAction', 'businessWriteBoundary',
];
const productKnowledgeLedger = {
  roleCount: KNOWLEDGE_ROLES.length,
  authorizedScreenCount: 0,
  normalizedUniqueSemanticElementCount: 0,
  observedDomInstanceCount: 0,
  unknownAuthorizedProductElements: [],
  unresolvedProductKnowledgeGaps: [],
  fabricatedProductElements: [],
  countsByRole: {},
  countsByType: {},
};
for (const role of KNOWLEDGE_ROLES) {
  const user = { role, companyId: 10 };
  const roleRows = new Map();
  let roleScreens = 0;
  for (const screenRef of listScreensForUser(user)) {
    const inventory = buildCanonicalProductKnowledgeInventory(user, { screenContext: { path: screenRef.path } });
    roleScreens += 1;
    if (inventory.status !== 'AUTHORIZED' || !inventory.screen) {
      productKnowledgeLedger.unknownAuthorizedProductElements.push({ role, path: screenRef.path, reason: inventory.status });
      continue;
    }
    for (const row of inventory.elements || []) {
      const key = `${row.roleKey}|${row.path}|${row.semanticId}`;
      if (!roleRows.has(key)) roleRows.set(key, row);
      for (const field of KNOWLEDGE_FIELDS) {
        if (!String(row?.[field] || '').trim()) productKnowledgeLedger.unresolvedProductKnowledgeGaps.push({ role, path: row.path, semanticId: row.semanticId, field });
      }
      productKnowledgeLedger.countsByType[row.type] = (productKnowledgeLedger.countsByType[row.type] || 0) + 1;
    }
    for (const gap of inventory.unresolvedProductKnowledgeGaps || []) productKnowledgeLedger.unresolvedProductKnowledgeGaps.push({ role, ...gap });
    for (const fabricated of inventory.fabricatedProductElements || []) productKnowledgeLedger.fabricatedProductElements.push({ role, ...fabricated });
    productKnowledgeLedger.observedDomInstanceCount += Number(inventory.observedDomInstances || 0);
  }
  productKnowledgeLedger.authorizedScreenCount += roleScreens;
  productKnowledgeLedger.normalizedUniqueSemanticElementCount += roleRows.size;
  productKnowledgeLedger.countsByRole[role] = { authorizedScreens: roleScreens, normalizedUniqueSemanticElements: roleRows.size };
}
assert(productKnowledgeLedger.roleCount === 8, 'exhaustive product knowledge covers all 8 roles');
assert(productKnowledgeLedger.unknownAuthorizedProductElements.length === 0, 'unknown authorized product element count is zero');
assert(productKnowledgeLedger.unresolvedProductKnowledgeGaps.length === 0, 'unresolved product knowledge gap count is zero');
assert(productKnowledgeLedger.fabricatedProductElements.length === 0, 'fabricated product element count is zero');
assert(productKnowledgeLedger.normalizedUniqueSemanticElementCount > 0, 'product knowledge ledger has normalized semantic elements');
console.log(JSON.stringify({
  productKnowledgeLedger: {
    roleCount: productKnowledgeLedger.roleCount,
    authorizedScreenCount: productKnowledgeLedger.authorizedScreenCount,
    normalizedUniqueSemanticElementCount: productKnowledgeLedger.normalizedUniqueSemanticElementCount,
    observedDomInstanceCount: productKnowledgeLedger.observedDomInstanceCount,
    unknownAuthorizedProductElements: productKnowledgeLedger.unknownAuthorizedProductElements.length,
    unresolvedProductKnowledgeGaps: productKnowledgeLedger.unresolvedProductKnowledgeGaps.length,
    fabricatedProductElements: productKnowledgeLedger.fabricatedProductElements.length,
    countsByRole: productKnowledgeLedger.countsByRole,
    countsByType: productKnowledgeLedger.countsByType,
  },
}, null, 2));
const unauthorizedInventory = buildCanonicalProductKnowledgeInventory({ role: 'DRIVER', companyId: 10 }, {
  screenContext: { path: '/company/agreements', label: 'Sözleşmeler', role: 'DRIVER' },
});
assert(unauthorizedInventory.status !== 'AUTHORIZED', 'inventory refuses unauthorized role/screen context');

const missing = resolveCopilotGuidedTarget({ ...fixture(), message: 'Kaydet butonu nerede?' });
assert(missing.status === GUIDED_TARGET_STATUSES.NOT_FOUND, 'missing target is reported honestly');
assert(missing.targetKey === null, 'missing target has no invented identity');

const unrelatedAfterFound = resolveCopilotGuidedTarget({
  ...fixture({ conversationState: { guidedTarget: found } }),
  message: 'Kaydet butonu nerede?',
});
assert(unrelatedAfterFound.status === GUIDED_TARGET_STATUSES.NOT_FOUND, 'new target question does not reuse stale highlight');

const unauthorized = resolveCopilotGuidedTarget({
  ...fixture({ user: { role: 'DRIVER', companyId: 10 }, screenContext: { ...fixture().screenContext, role: 'DRIVER' } }),
  message: 'Detayları göster nerede?',
});
assert(unauthorized.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED, 'cross-role target is blocked');

const stale = resolveCopilotGuidedTarget({
  ...fixture({ conversationState: { guidedTarget: { targetKey: 'company-agreements:detaylari-goster', screenPath: '/company/agreements' } } }),
  message: 'Devam et',
  screenContext: { ...fixture().screenContext, path: '/company/shifts' },
});
assert(stale.status === GUIDED_TARGET_STATUSES.STALE, 'route change clears stale target');

// M18 semantic-block anchor contract: canonical control identity must remain
// distinct from the surrounding field/block and must carry the same identity
// that the future browser callout will use.
const step3IdentityFixture = fixture({
  screenContext: {
    ...fixture().screenContext,
    path: '/company/shifts',
    label: 'Vardiyalar',
    uiHints: {
      visibleButtons: [
        { label: 'Adres', semanticType: 'field', targetKey: 'company-shifts:step3:address-input', disabled: false },
        { label: 'Adres Temizle ve İlerle', semanticType: 'button', targetKey: 'company-shifts:step3:address-next', disabled: false },
      ],
      activeTabs: [],
      semanticElements: [
        { semanticType: 'field', label: 'Adres', targetKey: 'company-shifts:step3:address-input', source: 'LIVE_UI' },
        { semanticType: 'section', label: 'Vardiya Toplanma / Dağıtım Konumu', targetKey: 'company-shifts:step3:address-block', source: 'LIVE_UI' },
      ],
      semanticBlocks: [
        {
          semanticId: 'product:company-shifts:step3:address-block',
          blockKey: 'company-shifts:step3:address-block',
          label: 'Vardiya Toplanma / Dağıtım Konumu',
          order: 1,
          controlSemanticIds: ['company-shifts:step3:address-input', 'company-shifts:step3:address-next'],
        },
      ],
    },
  },
});
const addressControlTarget = resolveCopilotGuidedTarget({
  ...step3IdentityFixture,
  message: 'Adresi nereye yazacağım?',
  semanticPlan: { family: 'UI_GUIDANCE', capabilityIntent: 'ENTER_ADDRESS' },
});
assert(addressControlTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'address input control is grounded');
assert(addressControlTarget.targetKind === 'CONTROL', 'address input uses the CONTROL target kind');
assert(addressControlTarget.targetKey === 'company-shifts:step3:address-input', 'address input keeps its canonical identity');
assert(addressControlTarget.identitySource === 'CANONICAL', 'address input identity is canonical');
assert(addressControlTarget.targetKey !== 'company-shifts:step3:address-next', 'address input cannot reuse the step advance control identity');
const addressAdvanceTarget = resolveCopilotGuidedTarget({
  ...step3IdentityFixture,
  message: 'Adres Temizle ve İlerle nerede?',
  semanticPlan: { family: 'UI_GUIDANCE', explicitUiGuidance: true },
});
assert(addressAdvanceTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'address advance control is grounded');
assert(addressAdvanceTarget.targetKind === 'CONTROL', 'address advance uses the CONTROL target kind');
assert(addressAdvanceTarget.targetKey === 'company-shifts:step3:address-next', 'address advance keeps its canonical identity');
assert(addressAdvanceTarget.identitySource === 'CANONICAL', 'address advance identity is canonical');
const addressBlockTarget = resolveCopilotGuidedTarget({
  ...step3IdentityFixture,
  message: 'Bu bölüm ne işe yarıyor?',
  semanticPlan: { family: 'SCREEN_CONTEXT', screenContextIntent: true, targetKind: 'BLOCK', blockKey: 'company-shifts:step3:address-block' },
});
assert(addressBlockTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'address semantic block is grounded');
assert(addressBlockTarget.targetKind === 'BLOCK', 'region explanation uses the BLOCK target kind');
assert(addressBlockTarget.blockKey === 'company-shifts:step3:address-block', 'region explanation keeps its canonical block identity');
assert(addressBlockTarget.identitySource === 'CANONICAL', 'region explanation identity is canonical');
assert(addressBlockTarget.legacyLabelFallbackUsed === false, 'canonical region explanation never uses label fallback');
assert(addressBlockTarget.callout?.targetKey === addressBlockTarget.targetKey, 'callout and visual target share one canonical identity');

// A concrete Hub map enlargement request must use the visible map-picker
// control, not the generic product onboarding branch.  The target identity is
// supplied by the live UI and remains subject to normal screen authorization.
const roomHubMapExpansion = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 1108,
  user: { id: 918781, role: 'ROOM', roomId: 1 },
  screenContext: {
    id: 1108,
    path: '/room/hub',
    label: 'Taşımacılık Firması Konumu',
    role: 'ROOM',
    uiHints: {
      visibleButtons: [
        { label: 'Büyük Haritada İşaretle', semanticType: 'button', targetKey: 'room:hub:map-picker-open', identitySource: 'CANONICAL', disabled: false },
        { label: 'Zoom in', semanticType: 'button', targetKey: 'room:hub:map-zoom-in', identitySource: 'CANONICAL', disabled: false },
      ],
      activeTabs: [],
    },
  },
  message: 'Bu haritayı nasıl büyütebilirim? Adım adım göster.',
  authSessionId: 'm18-hub-map-expansion-guidance',
});
assert(['UI_GUIDANCE', 'SCREEN_CONTEXT'].includes(roomHubMapExpansion.semanticPlan?.family), 'Hub map enlargement stays in current-screen guidance');
assert(roomHubMapExpansion.guidedTarget?.status === 'FOUND', 'Hub map enlargement resolves a visible target');
assert(roomHubMapExpansion.guidedTarget?.targetKey === 'room:hub:map-picker-open', 'Hub map enlargement resolves the canonical map-picker target');
assert(/Büyük Haritada İşaretle|büyük harita|haritayı/i.test(roomHubMapExpansion.reply || ''), 'Hub map enlargement names the real map control');

// The planner must carry block-level intent through the production semantic
// path. A prior CONTROL in conversation state may provide context, but it
// must not become the visual target for a new region explanation.
const blockIntentScreenContext = {
  ...step3IdentityFixture.screenContext,
  role: 'COMPANY',
  uiHints: {
    ...step3IdentityFixture.screenContext.uiHints,
    workflowState: {
      workflowId: 'COMPANY_GUIDED_NEW_PLAN',
      activeStepOrdinal: 3,
      currentTargetKey: 'company-shifts:step3:address-next',
      currentTargetLabel: 'Adres Temizle ve İlerle',
      source: 'LIVE_UI',
    },
  },
};
const blockIntentConversationState = {
  guidedTarget: addressAdvanceTarget,
  activeGuidedTask: {
    semanticPlan: {
      family: 'UI_GUIDANCE',
      workflowIntent: 'CREATE_SHIFT',
      workflowModel: { goal: 'CREATE_SHIFT' },
      workflowStepReference: { ordinal: 3, key: 'PERSONNEL_STOPS', label: 'Personel + Durak' },
    },
  },
};
const blockIntentPlan = resolveSemanticIntent({
  message: 'bu alan ne işe yarıyor?',
  user: step3IdentityFixture.user,
  conversationState: blockIntentConversationState,
  screenContext: blockIntentScreenContext,
});
assert(blockIntentPlan.targetKind === 'BLOCK', 'block explanation keeps BLOCK target intent after a CONTROL');
assert(blockIntentPlan.blockKey === 'company-shifts:step3:address-block', 'block explanation carries the canonical block identity');
const blockTargetAfterControl = resolveCopilotGuidedTarget({
  ...step3IdentityFixture,
  screenContext: blockIntentScreenContext,
  conversationState: blockIntentConversationState,
  message: 'bu alan ne işe yarıyor?',
  semanticPlan: blockIntentPlan,
});
assert(blockTargetAfterControl.targetKind === 'BLOCK', 'CONTROL to BLOCK transition replaces the prior control target');
assert(blockTargetAfterControl.targetKey === 'company-shifts:step3:address-block', 'CONTROL to BLOCK transition uses the canonical block key');
assert(blockTargetAfterControl.callout?.targetKey === blockTargetAfterControl.targetKey, 'block callout remains attached to the block identity');
for (const blockMessage of ['burayı adım adım anlat', 'sonraki bölüm ne?', 'bu adımda ne yapacağım?']) {
  const plan = resolveSemanticIntent({
    message: blockMessage,
    user: step3IdentityFixture.user,
    conversationState: blockIntentConversationState,
    screenContext: blockIntentScreenContext,
  });
  assert(plan.targetKind === 'BLOCK', `block-level follow-up keeps BLOCK intent: ${blockMessage}`);
  const target = resolveCopilotGuidedTarget({
    ...step3IdentityFixture,
    screenContext: blockIntentScreenContext,
    conversationState: blockIntentConversationState,
    message: blockMessage,
    semanticPlan: plan,
  });
  assert(target.targetKind === 'BLOCK', `block-level follow-up resolves a BLOCK target: ${blockMessage}`);
  assert(target.targetKey === 'company-shifts:step3:address-block', `block-level follow-up keeps the canonical block: ${blockMessage}`);
}

// Deictic live-surface regression: once the authorized Step-3 wizard is
// visibly live, short current-surface variants must share the same most
// specific workflow scope.  The explicit named screen control remains a
// deliberate escape hatch to the broader route context.
const liveStepThreeDeicticMessages = [
  'Burası ne',
  'Burda napiyoruz',
  'Burası ne işe yarıyor',
  'Burada ne yapacağım',
  'Şu an neredeyim',
  'Bu bölüm ne',
  'Bu adım ne',
];
const liveStepThreeDeicticPlans = liveStepThreeDeicticMessages.map((message) => resolveSemanticIntent({
  message,
  user: step3IdentityFixture.user,
  conversationState: blockIntentConversationState,
  screenContext: blockIntentScreenContext,
}));
for (const [index, plan] of liveStepThreeDeicticPlans.entries()) {
  const message = liveStepThreeDeicticMessages[index];
  assert(plan.family === 'EXPLAIN_CURRENT_TARGET', `deictic live Step-3 query stays in the current workflow: ${message}`);
  assert(plan.workflowIntent === 'CREATE_SHIFT', `deictic live Step-3 query preserves CREATE_SHIFT: ${message}`);
  assert(plan.workflowStepReference?.ordinal === 3, `deictic live Step-3 query binds to ordinal three: ${message}`);
  assert(plan.targetKind === 'BLOCK', `deictic live Step-3 query resolves a BLOCK target: ${message}`);
  assert(plan.blockKey === 'company-shifts:step3:address-block', `deictic live Step-3 query keeps the canonical block: ${message}`);
}
assert(
  liveStepThreeDeicticPlans[0].workflowStepReference?.ordinal === liveStepThreeDeicticPlans[1].workflowStepReference?.ordinal
    && liveStepThreeDeicticPlans[0].blockKey === liveStepThreeDeicticPlans[1].blockKey,
  'Burası ne and Burda napiyoruz share one live Step-3 semantic scope',
);
const explicitBroaderScreenPlan = resolveSemanticIntent({
  message: 'Planlama Merkezi ne işe yarıyor?',
  user: step3IdentityFixture.user,
  conversationState: blockIntentConversationState,
  screenContext: blockIntentScreenContext,
});
assert(explicitBroaderScreenPlan.family === 'SCREEN_CONTEXT', 'explicit named broader screen can override deictic live-surface inference');
assert(explicitBroaderScreenPlan.workflowIntent !== 'CREATE_SHIFT', 'explicit named broader screen does not inherit the live workflow task');
const noLiveStepScreenPlan = resolveSemanticIntent({
  message: 'Burası ne',
  user: step3IdentityFixture.user,
  conversationState: {},
  screenContext: { ...blockIntentScreenContext, uiHints: { ...blockIntentScreenContext.uiHints, workflowState: null, semanticBlocks: [] } },
});
assert(noLiveStepScreenPlan.family === 'SCREEN_CONTEXT', 'without a more-specific live surface, deictic help falls back to the route screen');
const blockInventory = buildCanonicalSemanticBlockInventory(step3IdentityFixture.user, {
  screenContext: step3IdentityFixture.screenContext,
});
assert(blockInventory.status === 'AUTHORIZED', 'semantic block inventory is role-authorized');
assert(blockInventory.authorizedSemanticBlockCount >= 1, 'semantic block inventory counts canonical blocks');
assert(blockInventory.unresolvedSemanticBlockCount === 0, 'semantic block inventory has no unresolved block');
assert(blockInventory.fabricatedSemanticBlockCount === 0, 'semantic block inventory does not fabricate blocks');

const canonicalCurrentRouteTarget = resolveCopilotGuidedTarget({
  ...fixture({
    conversationState: { guidedTarget: { targetKey: 'company:rehberi-baslat', screenPath: '/company' } },
    screenContext: {
      ...fixture().screenContext,
      path: '/company/shifts',
      label: 'Vardiyalar',
      uiHints: {
        visibleButtons: [{ label: 'Detayları göster', semanticType: 'disclosure', targetKey: 'company-shifts:detaylari-goster', disabled: false }],
        activeTabs: [],
      },
    },
  }),
  message: 'Detayları göster nerede?',
  semanticPlan: {
    family: 'UI_GUIDANCE',
    typedRequest: { screenContextIntent: true },
    explicitUiGuidance: true,
  },
});
assert(canonicalCurrentRouteTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'a fresh canonical guidance plan re-resolves after route change');
assert(canonicalCurrentRouteTarget.targetKey === 'company-shifts:detaylari-goster', 'a fresh canonical plan never retains the previous route target');

// ROOM populated-row leaf contract: the selected shift's responsive action
// controls must publish one canonical identity so an identical label on an
// unselected row cannot win grounding by DOM order.
const roomSelectedLeafSource = source('web/src/panels/room/roomShiftsPanelMobileCards.jsx');
const roomSelectedRowSource = source('web/src/panels/room/roomShiftsPanelRows.jsx');
const roomPrimaryActionSource = source('web/src/panels/shared/CommercialShiftCardPresentation.jsx');
const roomUiSurfaceSource = source('web/src/components/copilot/uiSurface.js');
assert(roomSelectedLeafSource.includes('dataCopilotTarget'), 'ROOM mobile populated-row leaf actions accept canonical copilot identity');
assert(roomSelectedRowSource.includes('data-copilot-target'), 'ROOM desktop populated-row leaf actions expose canonical copilot identity');
assert(roomPrimaryActionSource.includes('data-copilot-target={dataCopilotTarget}'), 'shared primary action renders the ROOM canonical copilot identity');
assert(roomUiSurfaceSource.includes('identitySource === \'CANONICAL\''), 'ui surface prefers canonical duplicate labels over legacy label rows');

const roomSelectedLeafTarget = resolveCopilotGuidedTarget({
  user: { role: 'ROOM', roomId: 1 },
  screenContext: {
    path: '/room/shifts',
    label: 'Vardiyalar',
    role: 'ROOM',
    uiHints: {
      visibleButtons: [
        { label: 'Rota Önizleme', semanticType: 'button', disabled: false, identitySource: 'LEGACY_LABEL' },
        { label: 'Tüm iş akışını göster', semanticType: 'disclosure', disabled: false, identitySource: 'LEGACY_LABEL' },
        { label: 'Rota Önizleme', semanticType: 'button', targetKey: 'room-shifts:shift:168:route-preview', disabled: false, identitySource: 'CANONICAL' },
        { label: 'İşlem Kaydı', semanticType: 'button', targetKey: 'room-shifts:shift:168:operation-events', disabled: false, identitySource: 'CANONICAL' },
      ],
    },
  },
  message: 'Rotasını göster',
  semanticPlan: {
    family: 'UI_GUIDANCE',
    explicitUiGuidance: true,
    currentTargetReference: {
      targetKind: 'CONTROL',
      targetKey: 'room-shifts:shift:168:route-preview',
      label: 'Rota Önizleme',
      semanticType: 'button',
      screenPath: '/room/shifts',
    },
  },
});
assert(roomSelectedLeafTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'ROOM selected populated-row route leaf resolves');
assert(roomSelectedLeafTarget.targetKey === 'room-shifts:shift:168:route-preview', 'ROOM selected populated-row route leaf keeps selected shift identity');

const roomReassignScreen = {
  path: '/room/shifts',
  label: 'Vardiyalar',
  role: 'ROOM',
  selectedEntity: { type: 'shift', id: 168 },
  uiHints: {
    visibleButtons: [
      { label: 'Atamayı Değiştir', semanticType: 'button', targetKey: 'room-shifts:shift:168:reassign', disabled: false, identitySource: 'CANONICAL' },
    ],
  },
};
const roomReassignMessage = 'Atama değişikliğini nereden yaparım?';
const roomReassignCanonical = resolveCanonicalConversationRequest({
  message: roomReassignMessage,
  user: { role: 'ROOM', roomId: 1 },
  screenContext: roomReassignScreen,
  conversationState: null,
  env: { ...process.env, SEFER_SEMANTIC_AUTHORITY: 'NEW' },
});
const roomReassignPlan = resolveSemanticIntent({
  message: roomReassignMessage,
  user: { role: 'ROOM', roomId: 1 },
  screenContext: roomReassignScreen,
  conversationState: null,
  canonicalRequest: roomReassignCanonical,
});
assert(roomReassignPlan.family === 'UI_GUIDANCE', 'ROOM selected reassign leaf stays UI guidance instead of role help');
assert(roomReassignPlan.roleHelpIntent !== true, 'ROOM selected reassign leaf does not become role-global help');

const workflowFixture = {
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company/shifts',
    label: 'Vardiyalar',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [
        { label: 'Planlama Merkezi', semanticType: 'button', targetKey: 'company-shifts:planlama-merkezi', disabled: false },
      ],
      activeTabs: [],
    },
  },
};
for (const message of [
  'Ben vardiya oluşturmak istiyorum',
  'Yeni vardiya nereden açılıyor?',
  'Vardiya eklemeyi göster',
  'Beni vardiya oluşturma ekranına götür',
  'Vardiya oluşturma yerini bulamadım',
]) {
  const plan = resolveSemanticIntent({ ...workflowFixture, message, conversationState: null });
  assert(plan.family === 'UI_GUIDANCE', `workflow intent resolves to UI guidance: ${message}`);
  assert(plan.typedRequest?.explicitTaskIntent === true, `workflow intent is explicit: ${message}`);
  assert(plan.requestedDomains.includes('SHIFTS'), `workflow intent keeps shift authorization domain: ${message}`);
}
const workflowVisibleShiftSurface = resolveSemanticIntent({
  ...workflowFixture,
  screenContext: {
    ...workflowFixture.screenContext,
    uiHints: {
      ...workflowFixture.screenContext.uiHints,
      visibleButtons: [
        { label: 'Vardiyalar', semanticType: 'button', disabled: false },
        { label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:guided-plan-start', disabled: false },
      ],
    },
  },
  message: 'Vardiya oluşturma yerini bulamadım',
  conversationState: null,
});
assert(workflowVisibleShiftSurface.workflowIntent === 'CREATE_SHIFT', 'workflow guidance outranks a similarly named visible shift surface');
assert(workflowVisibleShiftSurface.family === 'UI_GUIDANCE', 'workflow guidance is not downgraded to generic screen capability help');

const workflowTarget = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [
        { label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false },
      ],
      activeTabs: [],
    },
  },
  conversationState: { guidedTarget: null },
  message: 'Ben vardiya oluşturmak istiyorum',
});
assert(workflowTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'workflow intent resolves to the real Planlama Merkezi control');
assert(workflowTarget.targetKey === 'company:rehberi-baslat', 'workflow target keeps the current semantic target key');
const workflowContinue = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [
        { label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false },
      ],
      activeTabs: [],
    },
  },
  conversationState: {
    guidedTarget: null,
    lastSettledResult: { semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
  },
  message: 'Devam',
});
assert(workflowContinue.status === GUIDED_TARGET_STATUSES.FOUND, 'Devam re-resolves the real workflow target after navigation');

// #18 must keep the semantic decision in the canonical planner.  These are
// production-language follow-ups, so a raw phrase matcher downstream is not
// allowed to become the authority that restores the workflow.
const canonicalWorkflowState = {
  lastSettledResult: {
    semanticPlan: {
      family: 'UI_GUIDANCE',
      intentFamily: 'UI_GUIDANCE',
      dialogueTopic: 'PRODUCT',
      conversationRoute: 'RETURN_TO_PRODUCT_TASK',
      workflowIntent: 'CREATE_SHIFT',
      requestedDomains: ['SHIFTS'],
      entities: [],
    },
  },
  authorizedProductContext: {
    semanticPlan: {
      family: 'UI_GUIDANCE',
      intentFamily: 'UI_GUIDANCE',
      dialogueTopic: 'PRODUCT',
      conversationRoute: 'RETURN_TO_PRODUCT_TASK',
      workflowIntent: 'CREATE_SHIFT',
      requestedDomains: ['SHIFTS'],
      entities: [],
    },
  },
  guidedTarget: null,
};

for (const { message, family } of [
  // The current-step request expands the active guided task.  It remains a
  // continuation of the task; the canonical action is carried separately.
  { message: 'Adım adım anlat', family: 'CONTINUE_CURRENT_REASONING' },
  { message: 'Devam', family: 'CONTINUE_CURRENT_REASONING' },
  { message: 'Sonra?', family: 'CONTINUE_CURRENT_REASONING' },
  { message: 'Bulamadım', family: 'CONTINUE_CURRENT_REASONING' },
  { message: 'Burada göremiyorum', family: 'CONTINUE_CURRENT_REASONING' },
  { message: 'Geri', family: 'CONTINUE_CURRENT_REASONING' },
  { message: 'Yanlış ekrandayım', family: 'CONTINUE_CURRENT_REASONING' },
]) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    conversationState: canonicalWorkflowState,
    message,
  });
  assert(plan.family === family, `canonical workflow follow-up uses the current contract: ${message}`);
  assert(
    plan.workflowIntent === 'CREATE_SHIFT' || plan.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT',
    `canonical workflow follow-up preserves CREATE_SHIFT: ${message}`,
  );
}

// Colloquial recovery/continuation language is part of the canonical M18
// contract. These variants must rejoin the active task instead of falling
// through the generic OFF_TOPIC route.
for (const [message, action] of [
  ['napmam gerek burda', 'RECOVER'],
  ['yapamıyorum', 'RECOVER'],
  ['olmuyor', 'RECOVER'],
  ['burada kaldım', 'RECOVER'],
  ['yardım et', 'RECOVER'],
  ['devamı yapalım', 'CONTINUE'],
  ['devam edelim', 'CONTINUE'],
  ['hadi devam', 'CONTINUE'],
  ['sonraki adıma geç', 'NEXT'],
  ['geri dön', 'BACK'],
]) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: { path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' },
    conversationState: canonicalWorkflowState,
    message,
  });
  assert(plan.family === 'CONTINUE_CURRENT_REASONING', `colloquial active-task language keeps canonical continuation: ${message}`);
  assert(plan.conversationRoute === 'RETURN_TO_PRODUCT_TASK', `colloquial active-task language stays in product route: ${message}`);
  assert(plan.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `colloquial active-task language preserves task: ${message}`);
  assert(plan.continuationAction === action, `colloquial active-task language keeps action ${action}: ${message}`);
}

const standaloneNextStep = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' },
  conversationState: null,
  message: 'sonraki adıma geç',
});
assert(standaloneNextStep.family === 'NEXT_STEP', 'standalone next-step request remains a general next-step request');
assert(!standaloneNextStep.continuationAction, 'standalone next-step request does not invent continuation action');

// The active task/target is also the semantic context for failure language.
// These probes intentionally use unseen wording: a live target failure must
// recover the task instead of entering the generic conversation route.
const activeTargetFailureState = {
  activeGuidedTask: { semanticPlan: { family: 'UI_GUIDANCE', workflowIntent: 'CREATE_SHIFT', workflowStepReference: { ordinal: 1, key: 'COMPANY_LOCATION', label: 'Şirket konumu' } } },
  guidedTarget: { status: 'FOUND', targetKey: 'company:rehberi-baslat', label: 'Rehberi Başlat', screenPath: '/company', identitySource: 'CANONICAL' },
  lastSettledResult: { semanticPlan: { family: 'UI_GUIDANCE', workflowIntent: 'CREATE_SHIFT', requestedDomains: ['SHIFTS'] } },
};
for (const message of ['Rehberi başlatamıyorum', 'buna basamıyorum', 'buradan devam edemiyorum', 'bu çalışmıyor', 'bunu bulamadım']) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    conversationState: activeTargetFailureState,
    message,
  });
  assert(plan.family === 'CONTINUE_CURRENT_REASONING', `active target failure rejoins task: ${message}`);
  assert(plan.continuationAction === 'RECOVER', `active target failure is recovery: ${message}`);
  assert(plan.conversationRoute === 'RETURN_TO_PRODUCT_TASK', `active target failure stays product-scoped: ${message}`);
}

// Real UI-originated envelope parity: a fresh auth scope may have no server
// conversation task yet, while the authorized surface still exposes the
// canonical current target. The planner must use that live target hint for
// failure recovery and the service must revalidate the exact target; a test
// fixture must not be required to inject activeGuidedTask/guidedTarget.
const realUiRecovery = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user: { id: 9101, role: 'COMPANY', companyId: 10, companyKind: 'COMPANY' },
  screenContext: {
    id: 2101,
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    companyKind: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL', disabled: false }],
      workflowState: null,
      currentTarget: null,
    },
  },
  message: 'Rehberi başlatamıyorum',
  authSessionId: `m18-real-ui-recovery-${Date.now()}`,
});
assert(realUiRecovery.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', 'real UI envelope failure stays target-grounded without injected task state');
assert(realUiRecovery.semanticPlan?.currentTargetRecoveryIntent === true, 'real UI envelope failure is classified as contextual recovery');
assert(realUiRecovery.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'real UI envelope recovery revalidates a live target');
assert(realUiRecovery.guidedTarget?.targetKey === 'company:guided-plan-start', 'real UI envelope recovery preserves exact canonical target');
assert(!/mevcut ürün kapsamının dışında/i.test(realUiRecovery.reply || ''), 'real UI envelope recovery never returns generic out-of-scope');

// ROOM selected-shift recovery must consume the live target key from the UI
// envelope.  The semantic recovery block may carry a role-labelled semantic
// id, but it must not outrank the canonical DOM target for the same selected
// shift and turn.
const roomSelectedShiftRecoveryUser = { id: 9103, role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const roomSelectedShiftRecoveryScreen = {
    id: 1103,
    path: '/room/shifts',
    label: 'Vardiyalar',
    role: 'ROOM',
    selectedEntityType: 'shift',
    selectedEntityId: 210,
    selectedLabel: 'Vardiya ID 210',
    uiHints: {
      visibleButtons: [
        {
          label: 'Vardiya #210 ayrıntıları',
          semanticType: 'disclosure',
          targetKey: 'room-shifts:shift:210:details',
          semanticId: 'product:room:shift:210:details',
          identitySource: 'CANONICAL',
          disabled: false,
        },
      ],
      currentTarget: {
        status: 'FOUND',
        targetKind: 'CONTROL',
        targetKey: 'room-shifts:shift:210:details',
        semanticId: 'product:room:shift:210:details',
        label: 'Vardiya #210 ayrıntıları',
        screenPath: '/room/shifts',
        role: 'ROOM',
      },
      semanticBlocks: [],
    },
};
const roomSelectedShiftRecoveryState = {
    lastScreenPath: '/room/shifts',
    selectedEntityType: 'shift',
    selectedEntityId: 210,
    selectedLabel: 'Vardiya ID 210',
    guidedTarget: {
      status: 'FOUND',
      targetKey: 'room-shifts:shift:210:details',
      semanticId: 'product:room:shift:210:details',
      label: 'Vardiya #210 ayrıntıları',
      screenPath: '/room/shifts',
      role: 'ROOM',
    },
};
const roomSelectedShiftRecoveryMessage = 'Bulamadım.';
const roomSelectedShiftRecoveryCanonical = resolveCanonicalConversationRequest({
  message: roomSelectedShiftRecoveryMessage,
  user: roomSelectedShiftRecoveryUser,
  screenContext: roomSelectedShiftRecoveryScreen,
  conversationState: roomSelectedShiftRecoveryState,
  env: { ...process.env, SEFER_SEMANTIC_AUTHORITY: 'NEW' },
});
const roomSelectedShiftRecoverySemantic = resolveSemanticIntent({
  message: roomSelectedShiftRecoveryMessage,
  user: roomSelectedShiftRecoveryUser,
  screenContext: roomSelectedShiftRecoveryScreen,
  conversationState: roomSelectedShiftRecoveryState,
  canonicalRequest: roomSelectedShiftRecoveryCanonical,
});
const roomSelectedShiftRecoveryTarget = resolveCopilotGuidedTarget({
  user: roomSelectedShiftRecoveryUser,
  screenContext: roomSelectedShiftRecoveryScreen,
  conversationState: roomSelectedShiftRecoveryState,
  semanticPlan: roomSelectedShiftRecoverySemantic,
  message: roomSelectedShiftRecoveryMessage,
});
assert(roomSelectedShiftRecoverySemantic.family === 'EXPLAIN_CURRENT_TARGET', 'ROOM selected-shift failure stays target-grounded');
assert(roomSelectedShiftRecoverySemantic.currentTargetRecoveryIntent === true, 'ROOM selected-shift failure is contextual recovery');
assert(roomSelectedShiftRecoveryTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'ROOM selected-shift recovery revalidates the live target');
assert(roomSelectedShiftRecoveryTarget.targetKey === 'room-shifts:shift:210:details', 'ROOM selected-shift recovery preserves the live canonical target');
assert(roomSelectedShiftRecoveryTarget.identitySource === 'CANONICAL', 'ROOM selected-shift recovery keeps canonical target identity');
for (const message of ['buna basamıyorum', 'buradan devam edemiyorum', 'bu çalışmıyor', 'bunu bulamadım']) {
  const paraphraseRecovery = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 2101,
    user: { id: 9102, role: 'COMPANY', companyId: 10, companyKind: 'COMPANY' },
    screenContext: {
      id: 2101,
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
      companyKind: 'COMPANY',
      uiHints: {
        visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL', disabled: false }],
        workflowState: null,
        currentTarget: { status: 'FOUND', targetKind: 'CONTROL', targetKey: 'company:guided-plan-start', label: 'Rehberi Başlat', screenPath: '/company', role: 'COMPANY' },
      },
    },
    message,
    authSessionId: `m18-real-ui-recovery-paraphrase-${message}`,
  });
  assert(paraphraseRecovery.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', `real UI envelope failure paraphrase stays target-grounded: ${message}`);
  assert(paraphraseRecovery.semanticPlan?.currentTargetRecoveryIntent === true, `real UI envelope failure paraphrase is contextual recovery: ${message}`);
  assert(paraphraseRecovery.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `real UI envelope failure paraphrase revalidates the live target: ${message}`);
  assert(paraphraseRecovery.guidedTarget?.targetKey === 'company:guided-plan-start', `real UI envelope failure paraphrase preserves exact target: ${message}`);
  assert(!/mevcut ürün kapsamının dışında/i.test(paraphraseRecovery.reply || ''), `real UI envelope failure paraphrase avoids out-of-scope: ${message}`);
}

const noLiveTargetFailure = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { id: 2101, path: '/company', label: 'Planlama Merkezi', role: 'COMPANY', uiHints: { visibleButtons: [], currentTarget: null } },
  conversationState: null,
  message: 'Rehberi başlatamıyorum',
});
assert(noLiveTargetFailure.family === 'OFF_TOPIC_SAFE', 'failure language without a live target remains safely out of scope');

const currentScreenPurposeDuringTarget = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: activeTargetFailureState,
  message: 'Bu ekran ne işe yarıyor?',
});
assert(
  currentScreenPurposeDuringTarget.typedRequest?.taskType === 'SCREEN_CONTEXT'
    && currentScreenPurposeDuringTarget.typedRequest?.screenContextIntent === true
    && currentScreenPurposeDuringTarget.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
  'explicit current-screen purpose keeps canonical screen context ahead of the previous target',
);
assert(currentScreenPurposeDuringTarget.workflowIntent !== 'CREATE_SHIFT', 'current-screen purpose does not inherit the active workflow target');
for (const [message, expectedFamily] of [
  ['şu ekran ne yapıyor', 'UI_GUIDANCE'],
  ['burada ne yapılıyor', 'UI_GUIDANCE'],
  ['bu bölüm ne', 'SCREEN_CONTEXT'],
]) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    conversationState: {},
    message,
  });
  assert(plan.family === expectedFamily, `unseen current-screen paraphrase keeps the canonical family: ${message}`);
  assert(plan.typedRequest?.screenContextIntent === true, `unseen current-screen paraphrase carries screen intent: ${message}`);
}
for (const [message, workflowIntent] of [['sözleşmeleri nereden açarım', null], ['vardiya ekranı nerede', 'OPEN_SHIFT_SURFACE']]) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    conversationState: {},
    message,
  });
  assert(plan.family === 'UI_GUIDANCE', `unseen capability/navigation paraphrase stays UI guidance: ${message}`);
  if (workflowIntent) assert(plan.workflowIntent === workflowIntent, `unseen navigation paraphrase resolves its canonical workflow: ${message}`);
}

const navigationTargetWithPreviousControl = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [
        { label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', identitySource: 'CANONICAL' },
        { label: 'Vardiyalar', semanticType: 'link', targetKey: 'company:shifts', identitySource: 'CANONICAL' },
      ],
    },
  },
  conversationState: { ...activeTargetFailureState },
  semanticPlan: { family: 'UI_GUIDANCE', workflowIntent: 'OPEN_SHIFT_SURFACE', typedRequest: { screenContextIntent: true } },
  message: 'Vardiyalar nerde',
});
assert(navigationTargetWithPreviousControl.status === GUIDED_TARGET_STATUSES.FOUND, 'explicit navigation resolves a live target');
assert(navigationTargetWithPreviousControl.targetKey === 'company:shifts', 'explicit navigation supersedes the previous workflow control');
assert(navigationTargetWithPreviousControl.label === 'Vardiyalar', 'navigation target preserves its canonical visible label');

const canonicalContinuationPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: canonicalWorkflowState,
  message: 'Adım adım anlat',
});

// CREATE_SHIFT is a real guided workflow, not a one-turn screen description.
// Keep the workflow model and step references on the canonical semantic plan
// so the production service can answer follow-ups from the same task.
const createShiftStartPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: { guidedTarget: null },
  message: 'vardiya oluşturmak istiyorum',
});
assert(createShiftStartPlan.family === 'UI_GUIDANCE', 'create-shift goal enters canonical UI guidance');
assert(createShiftStartPlan.workflowIntent === 'CREATE_SHIFT', 'create-shift goal is retained on the canonical plan');
assert(createShiftStartPlan.workflowModel?.id === 'COMPANY_GUIDED_NEW_PLAN', 'create-shift binds to the company guided workflow');
assert(createShiftStartPlan.workflowModel?.steps?.length === 4, 'create-shift exposes all four canonical workflow steps');
assert(createShiftStartPlan.workflowStepReference?.ordinal === 1, 'create-shift starts at the first workflow step');

// Before the real guided modal is opened, the live surface exposes only the
// canonical entry control.  Workflow knowledge may describe step one as the
// next step, but it must not claim that step is currently live.
const preWizardUiState = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL', disabled: false }],
    activeTabs: [],
    workflowState: null,
  },
};
const preWizardStartPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: preWizardUiState,
  conversationState: { guidedTarget: null },
  message: 'vardiya oluşturmak istiyorum',
});
assert(preWizardStartPlan.workflowEntryState === 'PRE_WIZARD', 'pre-wizard create-shift request records the live entry state');
assert(!preWizardStartPlan.workflowStepReference, 'pre-wizard create-shift request has no current workflow step');
assert(preWizardStartPlan.workflowNextStepReference?.ordinal === 1, 'pre-wizard create-shift request keeps step one as the next step');
assert(preWizardStartPlan.workflowNextState === 'UNKNOWN_ENTRY_NEXT_STATE', 'pre-wizard without server draft evidence stays conditional about the next live state');
const preWizardNoDraftUiState = {
  ...preWizardUiState,
  uiHints: {
    ...preWizardUiState.uiHints,
    guidedDraftAvailability: { state: 'NEW_PLAN_STEP_1', count: 0, source: 'SERVER_GUIDED_DRAFTS' },
  },
};
const preWizardNoDraftPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: preWizardNoDraftUiState,
  conversationState: { guidedTarget: null },
  message: 'vardiya oluşturmak istiyorum',
});
assert(preWizardNoDraftPlan.workflowNextState === 'NEW_PLAN_STEP_1', 'pre-wizard no-draft state exposes the new-plan next state');
const preWizardExistingDraftUiState = {
  ...preWizardUiState,
  uiHints: {
    ...preWizardUiState.uiHints,
    guidedDraftAvailability: { state: 'SAVED_DRAFT_CHOOSER', count: 1, maxResumeStep: 2, source: 'SERVER_GUIDED_DRAFTS' },
  },
};
const preWizardExistingDraftPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: preWizardExistingDraftUiState,
  conversationState: { guidedTarget: null },
  message: 'vardiya oluşturmak istiyorum',
});
assert(preWizardExistingDraftPlan.workflowNextState === 'SAVED_DRAFT_CHOOSER', 'pre-wizard existing-draft state exposes the chooser as the next live state');
assert(preWizardExistingDraftPlan.workflowDraftAvailability?.count === 1, 'pre-wizard existing-draft state preserves server availability count');
const preWizardRecoveryPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: preWizardUiState,
  conversationState: {
    activeGuidedTask: { semanticPlan: preWizardStartPlan },
    guidedTarget: { status: 'FOUND', targetKey: 'company:guided-plan-start', label: 'Rehberi Başlat', screenPath: '/company', identitySource: 'CANONICAL' },
  },
  message: 'Rehberi başlatamıyorum',
});
assert(preWizardRecoveryPlan.workflowEntryState === 'PRE_WIZARD', 'pre-wizard recovery preserves the live entry state');
assert(!preWizardRecoveryPlan.workflowStepReference, 'pre-wizard recovery does not take over a future workflow step');
assert(preWizardRecoveryPlan.currentTargetReference?.targetKey === 'company:guided-plan-start', 'pre-wizard recovery remains attached to the entry control');
const preWizardExistingDraftResponse = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user: { id: 9111, role: 'COMPANY', companyId: 10, companyKind: 'COMPANY' },
  screenContext: { id: 2101, ...preWizardExistingDraftUiState, companyKind: 'COMPANY' },
  conversationState: {
    activeGuidedTask: { semanticPlan: preWizardExistingDraftPlan },
    guidedTarget: { status: 'FOUND', targetKey: 'company:guided-plan-start', label: 'Rehberi Başlat', screenPath: '/company', identitySource: 'CANONICAL' },
  },
  message: 'vardiya oluşturmak istiyorum',
  authSessionId: `m18-prewizard-existing-draft-${Date.now()}`,
});
assert(preWizardExistingDraftResponse.semanticPlan?.workflowNextState === 'SAVED_DRAFT_CHOOSER', 'production pre-wizard response preserves the server-backed chooser next state');
assert(/kayıtlı taslak seçimi/i.test(preWizardExistingDraftResponse.reply || ''), 'production pre-wizard response explains the existing-draft branch');
const preWizardExistingDraftRecovery = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user: { id: 9111, role: 'COMPANY', companyId: 10, companyKind: 'COMPANY' },
  screenContext: { id: 2101, ...preWizardExistingDraftUiState, companyKind: 'COMPANY' },
  conversationState: {
    activeGuidedTask: { semanticPlan: preWizardExistingDraftPlan },
    guidedTarget: { status: 'FOUND', targetKey: 'company:guided-plan-start', label: 'Rehberi Başlat', screenPath: '/company', identitySource: 'CANONICAL' },
  },
  message: 'Rehberi başlatamıyorum',
  authSessionId: `m18-prewizard-existing-draft-recovery-${Date.now()}`,
});
assert(/takıldığını anlıyorum/i.test(preWizardExistingDraftRecovery.reply || ''), 'production pre-wizard recovery acknowledges the blocked current target');
assert(/yeniden dokun|görünür ve etkin/i.test(preWizardExistingDraftRecovery.reply || ''), 'production pre-wizard recovery provides a concrete safe retry action');
assert(preWizardExistingDraftRecovery.guidedTarget?.targetKey === 'company:guided-plan-start', 'production pre-wizard recovery keeps the exact entry target');

const createShiftState = {
  ...canonicalWorkflowState,
  activeGuidedTask: { semanticPlan: createShiftStartPlan },
  guidedTarget: {
    status: 'FOUND',
    targetKey: 'company:rehberi-baslat',
    label: 'Rehberi Başlat',
    screenPath: '/company',
    semanticType: 'button',
  },
};
const createShiftStepTwoUiState = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [{ label: 'Taslak vardiya oluştur', semanticType: 'button', targetKey: 'company:guided-plan:step-2:taslak', identitySource: 'CANONICAL', disabled: false }],
    activeTabs: [],
    workflowState: {
      workflowId: 'COMPANY_GUIDED_NEW_PLAN',
      activeStepOrdinal: 2,
      completedThroughOrdinal: 1,
      currentTargetKey: 'company:guided-plan:step-2:taslak',
      currentTargetLabel: 'Taslak vardiya oluştur',
      source: 'LIVE_UI',
    },
  },
};
const createShiftStepThreeUiState = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [{ label: 'Adres Temizle ve İlerle', semanticType: 'button', targetKey: 'company:guided-plan:step-3:adres', disabled: false }],
    activeTabs: [],
    workflowState: {
      workflowId: 'COMPANY_GUIDED_NEW_PLAN',
      activeStepOrdinal: 3,
      completedThroughOrdinal: 2,
      currentTargetKey: 'company:guided-plan:step-3:adres',
      currentTargetLabel: 'Adres Temizle ve İlerle',
      source: 'LIVE_UI',
    },
  },
};
const createShiftStepOneLiveUiState = {
  path: '/company',
  label: 'Yeni Plan Oluştur',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [
      { label: 'Konumumu al', semanticType: 'button', targetKey: 'company:guided-plan:step-1:location', identitySource: 'CANONICAL', disabled: false },
      { label: 'Adresten bul', semanticType: 'button', targetKey: 'company:guided-plan:step-1:address', identitySource: 'CANONICAL', disabled: false },
      { label: 'İleri', semanticType: 'button', targetKey: 'company:guided-plan:step-1:next', identitySource: 'CANONICAL', disabled: false },
    ],
    activeTabs: [],
    modalTitles: ['Yeni Plan Oluştur'],
    workflowState: {
      workflowId: 'COMPANY_GUIDED_NEW_PLAN',
      activeStepOrdinal: 1,
      completedThroughOrdinal: 0,
      currentTargetKey: 'company:guided-plan:step-1:location',
      currentTargetLabel: 'Konumumu al',
      source: 'LIVE_UI',
    },
  },
};
const createShiftStepThreePeopleLiveUiState = {
  path: '/company',
  label: 'Yeni Plan Oluştur',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [
      { label: 'Ad Soyad', semanticType: 'field', targetKey: 'company:guided-plan:step-3:name', identitySource: 'CANONICAL', disabled: false },
      { label: 'Adres', semanticType: 'field', targetKey: 'company:guided-plan:step-3:address', identitySource: 'CANONICAL', disabled: false },
      { label: 'Ekle', semanticType: 'button', targetKey: 'company:guided-plan:step-3:add-personnel', identitySource: 'CANONICAL', disabled: false },
      { label: 'Adresten Bul', semanticType: 'button', targetKey: 'company:guided-plan:step-3:geocode', identitySource: 'CANONICAL', disabled: false },
      { label: 'Excel/CSV içe aktarma', semanticType: 'button', targetKey: 'company:guided-plan:step-3:import-personnel', identitySource: 'CANONICAL', disabled: false },
      { label: 'Durakları Hazırla', semanticType: 'button', targetKey: 'company:guided-plan:step-3:prepare-stops', identitySource: 'CANONICAL', disabled: false },
      { label: '1. Durak Üret', semanticType: 'button', targetKey: 'company:guided-plan:step-3:generate-stops', identitySource: 'CANONICAL', disabled: false },
      { label: '2. Vardiyadan Durakları Çek', semanticType: 'button', targetKey: 'company:guided-plan:step-3:pull-shift-stops', identitySource: 'CANONICAL', disabled: false },
      { label: 'Önizle', semanticType: 'button', targetKey: 'company:guided-plan:step-3:preview', identitySource: 'CANONICAL', disabled: false },
      { label: 'Adres Temizle ve İlerle', semanticType: 'button', targetKey: 'company:guided-plan:step-3:advance', identitySource: 'CANONICAL', disabled: false },
    ],
    activeTabs: [],
    modalTitles: ['Yeni Plan Oluştur', 'Personel + Durak'],
    workflowState: {
      workflowId: 'COMPANY_GUIDED_NEW_PLAN',
      activeStepOrdinal: 3,
      completedThroughOrdinal: 2,
      currentTargetKey: 'company:guided-plan:step-3:add-personnel',
      currentTargetLabel: 'Ekle',
      source: 'LIVE_UI',
    },
  },
};
for (const [message, expectedFamily, expectedAction, expectedOrdinal] of [
  ['bastımburası ne', 'EXPLAIN_CURRENT_TARGET', null, 1],
  ['tamam bastımsonra', 'CONTINUE_CURRENT_REASONING', 'NEXT', 2],
  ['1. adımda napıcam', 'EXPLAIN_CURRENT_TARGET', null, 1],
  ['2. adımda ne yapacağım', 'EXPLAIN_CURRENT_TARGET', null, 2],
]) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: message === 'tamam bastımsonra' ? createShiftStepTwoUiState : { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    conversationState: createShiftState,
    message,
  });
  assert(plan.family === expectedFamily, `create-shift follow-up keeps canonical class: ${message}`);
  if (expectedAction) assert(plan.continuationAction === expectedAction, `create-shift follow-up keeps ${expectedAction}: ${message}`);
  assert(plan.workflowIntent === 'CREATE_SHIFT' || plan.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `create-shift follow-up preserves active goal: ${message}`);
  assert(plan.workflowModel?.id === 'COMPANY_GUIDED_NEW_PLAN' || plan.continuationBasePlan?.workflowModel?.id === 'COMPANY_GUIDED_NEW_PLAN', `create-shift follow-up preserves workflow model: ${message}`);
  assert(plan.workflowStepReference?.ordinal === expectedOrdinal || plan.continuationBasePlan?.workflowStepReference?.ordinal === expectedOrdinal, `create-shift follow-up resolves workflow step ${expectedOrdinal}: ${message}`);
}

// The visible guided modal is the current workflow authority for deictic
// follow-ups. These cases reproduce the real Step-2 Plan paketi regression:
// the stored task remains on step one, while the live UI proves step two and
// exposes its current target.
const liveStepTwoGroundingState = {
  ...createShiftState,
  guidedTarget: null,
};
for (const [message, expectedFamily] of [
  ['tamam açtım sonra burası ne', 'EXPLAIN_CURRENT_TARGET'],
  ['burda ne yapıcam', 'EXPLAIN_CURRENT_TARGET'],
  ['bu adımda napacam', 'EXPLAIN_CURRENT_TARGET'],
  ['şu an kaçıncı adımdayım', 'EXPLAIN_CURRENT_TARGET'],
]) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: createShiftStepTwoUiState,
    conversationState: liveStepTwoGroundingState,
    message,
  });
  assert(plan.family === expectedFamily, `live Step-2 follow-up keeps the grounded semantic class: ${message}`);
  assert(plan.workflowIntent === 'CREATE_SHIFT', `live Step-2 follow-up preserves CREATE_SHIFT: ${message}`);
  assert(plan.workflowStepReference?.ordinal === 2, `live Step-2 follow-up resolves the visible ordinal: ${message}`);
  assert(plan.workflowStepReference?.key === 'PLAN_PACKAGE', `live Step-2 follow-up resolves Plan paketi: ${message}`);
  assert(plan.workflowActualUiState?.activeStepOrdinal === 2, `live Step-2 follow-up carries current UI state: ${message}`);
  assert(plan.conversationRoute === 'RETURN_TO_PRODUCT_TASK', `live Step-2 follow-up remains on the product route: ${message}`);
}

for (const message of ['nerede kaldık', 'sonra ne', 'devam edelim']) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: createShiftStepTwoUiState,
    conversationState: liveStepTwoGroundingState,
    message,
  });
  assert(plan.family === 'CONTINUE_CURRENT_REASONING', `live Step-2 continuation keeps the continuation class: ${message}`);
  assert(plan.workflowIntent === 'CREATE_SHIFT', `live Step-2 continuation preserves CREATE_SHIFT: ${message}`);
  assert(plan.workflowStepReference?.ordinal === 2, `live Step-2 continuation stays on the visible step: ${message}`);
  assert(plan.workflowActualUiState?.currentTargetKey === 'company:guided-plan:step-2:taslak', `live Step-2 continuation carries the current target: ${message}`);
  assert(plan.conversationRoute === 'RETURN_TO_PRODUCT_TASK', `live Step-2 continuation cannot fall into an external route: ${message}`);
}

const activeTargetExplanationState = {
  ...canonicalWorkflowState,
  activeGuidedTask: { semanticPlan: canonicalWorkflowState.lastSettledResult.semanticPlan },
  guidedTarget: {
    status: 'FOUND',
    targetKey: 'company:rehberi-baslat',
    label: 'Rehberi Başlat',
    screenPath: '/company',
    semanticType: 'button',
  },
};
for (const message of ['burası ne', 'bu ne', 'ne yapacağım']) {
  const targetExplanation = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    conversationState: activeTargetExplanationState,
    message,
  });
  assert(targetExplanation.family === 'EXPLAIN_CURRENT_TARGET', `active target explanation keeps its semantic class: ${message}`);
  assert(targetExplanation.answerMode === 'TARGET_EXPLANATION', `active target explanation uses target presentation mode: ${message}`);
  assert(targetExplanation.guidedTargetReference?.targetKey === 'company:rehberi-baslat', `active target explanation keeps the real target: ${message}`);
  assert(targetExplanation.workflowIntent === 'CREATE_SHIFT' || targetExplanation.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `active target explanation preserves the guided task: ${message}`);
}

const currentScreenPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: { guidedTarget: null },
  message: 'Nasıl çalışıyor bu?',
});
assert(
  currentScreenPlan.typedRequest?.taskType === 'SCREEN_CONTEXT'
    && currentScreenPlan.typedRequest?.screenContextIntent === true
    && currentScreenPlan.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
  'deictic current-screen question stays in canonical product context',
);
assert(currentScreenPlan.conversationRoute === 'RETURN_TO_PRODUCT_TASK', 'deictic current-screen question cannot be routed off-topic');

// A selected vehicle/student carried by live shells is evidence inside the
// current surface, not a competing authority for an explicit screen-purpose
// question.  Keep the semantic scope on CURRENT_SCREEN for PERSONEL/PARENT.
for (const role of ['PERSONEL', 'PARENT']) {
  const selectedScreenPlan = resolveSemanticIntent({
    user: { role },
    screenContext: {
      path: role === 'PERSONEL' ? '/personel/live' : '/parent/live',
      label: role === 'PERSONEL' ? 'Canlı' : 'Canlı Takip',
      role,
      selectedEntityType: role === 'PERSONEL' ? 'vehicle' : 'student',
      selectedEntityId: 1,
    },
    conversationState: { guidedTarget: null },
    message: 'Bu ekran ne işe yarıyor',
  });
  assert(
    selectedScreenPlan.typedRequest?.taskType === 'SCREEN_CONTEXT'
      && selectedScreenPlan.typedRequest?.screenContextIntent === true
      && selectedScreenPlan.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
    `selected-record shell keeps screen-purpose semantics: ${role}`,
  );
  assert(
    selectedScreenPlan.typedRequest?.scopeTarget === 'CURRENT_SCREEN'
      || selectedScreenPlan.canonicalShape?.scopeTarget === 'CURRENT_SCREEN',
    `selected-record shell keeps current-screen scope: ${role}`,
  );
}

for (const message of ['ben burayı hiç bilmiyorum bana öğret', 'baştan anlat', 'bunu hiç kullanmadım']) {
  const teachingPlan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    conversationState: { guidedTarget: null },
    message,
  });
  assert(teachingPlan.family === 'SCREEN_CONTEXT', `teach-from-zero stays grounded in the current surface: ${message}`);
  assert(teachingPlan.screenDetailIntent === true, `teach-from-zero requests detailed screen guidance: ${message}`);
}

const safeShowPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: { guidedTarget: null },
  message: 'sen göster',
});
assert(['SCREEN_CONTEXT', 'UI_GUIDANCE'].includes(safeShowPlan.family), 'safe natural show request stays in product guidance');
assert(safeShowPlan.explicitUiGuidance === true, 'safe natural show request is explicitly UI guidance');
const activeSafeShowPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: {
    ...canonicalWorkflowState,
    activeGuidedTask: { semanticPlan: { family: 'UI_GUIDANCE', workflowIntent: 'CREATE_SHIFT' } },
  },
  message: 'sen göster',
});
assert(activeSafeShowPlan.family === 'CONTINUE_CURRENT_REASONING', 'safe show request rejoins an active guided task');
assert(activeSafeShowPlan.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', 'safe show request preserves the active guided goal');

// Canonical current-screen grounding must win over stale screen aliases and
// prior settled results. Each surface is a distinct authorized context; the
// response may not describe an unrelated Vardiyalar/Geri Bildirim screen.
for (const [role, path, label, forbidden] of [
  ['COMPANY', '/company/operations', 'Operasyon Paneli', /bildirim ekranında|vardiyalar ekranında|saha geri bildirimlerini/i],
  ['COMPANY', '/company/agreements', 'Sözleşmeler', /bildirim ekranında|vardiyalar ekranında|saha geri bildirimlerini/i],
  ['SUPER_ADMIN', '/superadmin/operations', 'Denetim Paneli', /vardiyalar ekranında|saha geri bildirimlerini/i],
  ['SCHOOL', '/school/operations', 'Operasyon Paneli', /bildirim ekranında|vardiyalar ekranında/i],
]) {
  const screenResponse = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: { id: 918777, role, companyId: 10, roomId: 1, companyKind: role },
    screenContext: { path, label, role, uiHints: { visibleButtons: [], activeTabs: [] } },
    conversationState: { lastSettledResult: { semanticPlan: { family: 'RISK_RANKING', requestedDomains: ['SHIFTS'] } } },
    message: 'Bu ekranı anlat',
    authSessionId: `m18-current-screen-grounding-${role}-${path}`,
  });
  assert(
    screenResponse.semanticPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT'
      && screenResponse.semanticPlan?.typedRequest?.screenContextIntent === true
      && screenResponse.semanticPlan?.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
    `current-screen help stays canonical for ${role} ${path}`,
  );
  assert(!forbidden.test(screenResponse.reply || ''), `current-screen help does not describe a stale surface for ${role} ${path}`);
  assert(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(screenResponse.reply || '') || /bu ekran|bu yüzey|burada/i.test(screenResponse.reply || ''), `current-screen help is grounded for ${role} ${path}`);
}

// The browser owner covers the same semantic class for every current role.
// Keep a production-service parity matrix here as a fast regression guard so
// a stale prior surface cannot re-enter through any role-specific catalog.
const roleScreenGroundingMatrix = [
  { role: 'SUPER_ADMIN', user: { id: 1, role: 'SUPER_ADMIN' }, paths: ['/superadmin/operations', '/superadmin/companies'] },
  { role: 'ROOM', user: { id: 2, role: 'ROOM', roomId: 1 }, paths: ['/room/shifts', '/room/agreements'] },
  { role: 'COMPANY', user: { id: 3, role: 'COMPANY', companyId: 10, companyKind: 'COMPANY' }, paths: ['/company', '/company/operations'] },
  { role: 'SCHOOL', user: { id: 4, role: 'COMPANY', companyId: 11, companyKind: 'SCHOOL' }, paths: ['/school/operations', '/school/agreements'] },
  { role: 'ORGANIZATION', user: { id: 5, role: 'COMPANY', companyId: 12, companyKind: 'ORGANIZATION' }, paths: ['/organization/operations', '/organization/agreements'] },
  { role: 'DRIVER', user: { id: 6, role: 'DRIVER' }, paths: ['/driver/route', '/driver/today'] },
  { role: 'PERSONEL', user: { id: 7, role: 'PERSONEL' }, paths: ['/personel/live', '/personel/my'] },
  { role: 'PARENT', user: { id: 8, role: 'PARENT' }, paths: ['/parent/live', '/parent/copilot'] },
];
for (const spec of roleScreenGroundingMatrix) {
  for (const path of spec.paths) {
    const screenResponse = await runCopilotFoundation({
      intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: spec.user,
      screenContext: { path, label: path, role: spec.user.role },
      conversationState: { lastSettledResult: { semanticPlan: { family: 'RISK_RANKING', requestedDomains: ['SHIFTS'] } } },
      message: 'Bu ekranı anlat', authSessionId: `m18-role-screen-grounding-${spec.role}-${path}`,
    });
    assert(
      screenResponse.semanticPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT'
        && screenResponse.semanticPlan?.typedRequest?.screenContextIntent === true
        && screenResponse.semanticPlan?.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
      `role screen help remains canonical: ${spec.role} ${path}`,
    );
    assert(screenResponse.screenPath === path, `role screen help preserves current path: ${spec.role} ${path}`);
    assert(!/mevcut ürün kapsamının dışında|yetkili kayıtta yok|kayıt bulunamadı/i.test(screenResponse.reply || ''), `role screen help is not generic or record lookup: ${spec.role} ${path}`);
  }
}

// Shared current-screen how-to must not remap a non-CREATE_SHIFT surface to a
// nearby default route. The visible live map remains the semantic authority
// for this turn, even when the utterance is a generic usage question.
const roomMapHowTo = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 1101,
  user: { id: 918778, role: 'ROOM', roomId: 1 },
  screenContext: {
    id: 1101,
    path: '/room/map',
    label: 'Canlı Takip',
    role: 'ROOM',
    uiHints: {
      visibleButtons: [
        { label: 'Aracı aç', semanticType: 'button', targetKey: 'room-map:vehicle-open', disabled: false },
        { label: 'Durakları göster', semanticType: 'button', targetKey: 'room-map:stops', disabled: false },
      ],
      activeTabs: [],
    },
  },
  message: 'Bu ekranı nasıl kullanırım?',
  authSessionId: 'm18-generalization-room-map-how-to',
});
assert(['UI_GUIDANCE', 'SCREEN_CONTEXT'].includes(roomMapHowTo.semanticPlan?.family), 'non-CREATE_SHIFT current-screen how-to stays in product guidance');
assert(!/Vardiyalar ekranını aç/i.test(roomMapHowTo.reply || ''), 'non-CREATE_SHIFT current-screen how-to does not remap to Vardiyalar');
assert(/Canlı Takip|harita|araç|durak/i.test(roomMapHowTo.reply || ''), 'non-CREATE_SHIFT current-screen how-to names the live surface');

// Explicit capability help must generalize from the current authorized UI
// vocabulary. It must not depend on CREATE_SHIFT terms or a finite utterance
// list: the visible surface supplies the target label, while role/screen
// authorization remains the authority for whether that target may be guided.
const roomLiveTrackCapability = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 1100,
  user: { id: 918779, role: 'ROOM', roomId: 1 },
  screenContext: {
    id: 1100,
    path: '/room',
    label: 'Taşımacılık Firması Merkezi',
    role: 'ROOM',
    uiHints: { visibleButtons: [{ label: 'Canlı Takip', semanticType: 'menu', targetKey: 'room:map', identitySource: 'CANONICAL' }] },
  },
  message: 'canlı takibi nereden açarım?',
  authSessionId: 'm18-generalization-room-live-track-capability',
});
assert(['UI_GUIDANCE', 'SCREEN_CONTEXT'].includes(roomLiveTrackCapability.semanticPlan?.family), 'ROOM explicit capability help stays in product guidance');
assert(!/mevcut ürün kapsamının dışında/i.test(roomLiveTrackCapability.reply || ''), 'ROOM explicit capability help is not generic off-topic');
assert(/Canlı Takip|harita|araç|durak/i.test(roomLiveTrackCapability.reply || ''), 'ROOM explicit capability help names the authorized live surface');

const driverRouteCapability = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 3102,
  user: { id: 918780, role: 'DRIVER' },
  screenContext: {
    id: 3102,
    path: '/driver/route',
    label: 'Rota',
    role: 'DRIVER',
    uiHints: {
      visibleButtons: [{
        label: 'Harita aç',
        semanticType: 'button',
        targetKey: 'driver:map',
        identitySource: 'CANONICAL',
      }],
    },
  },
  message: 'haritayı nasıl açarım?',
  authSessionId: 'm18-generalization-driver-route-capability',
});
assert(['UI_GUIDANCE', 'SCREEN_CONTEXT'].includes(driverRouteCapability.semanticPlan?.family), 'DRIVER explicit capability help stays in product guidance');
assert(!/mevcut ürün kapsamının dışında/i.test(driverRouteCapability.reply || ''), 'DRIVER explicit capability help is not generic off-topic');
assert(driverRouteCapability.guidedTarget?.status === 'FOUND', 'DRIVER explicit capability help resolves a real route target');
assert(/Rota|görev|bugün/i.test(driverRouteCapability.reply || ''), 'DRIVER explicit capability help names the authorized route surface');

// A previously active workflow must not explain its old target after the
// authorized route changes.  Current-screen help is grounded in the current
// route; the guided task remains available only for continuation/target
// questions.
const staleGuidedTaskAfterRouteChange = resolveSemanticIntent({
  user: { role: 'ROOM', roomId: 1 },
  screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
  conversationState: {
    activeGuidedTask: {
      screenPath: '/company',
      semanticPlan: {
        family: 'UI_GUIDANCE',
        workflowIntent: 'CREATE_SHIFT',
        workflowStepReference: { ordinal: 1, key: 'COMPANY_LOCATION', label: 'Şirket konumu' },
      },
    },
    lastScreenPath: '/company',
    guidedTarget: { status: 'FOUND', targetKey: 'company:shift-start', label: 'Vardiya oluşturma' },
  },
  message: 'Bu ekranı anlat',
});
assert(
  staleGuidedTaskAfterRouteChange.typedRequest?.taskType === 'SCREEN_CONTEXT'
    && staleGuidedTaskAfterRouteChange.typedRequest?.screenContextIntent === true
    && staleGuidedTaskAfterRouteChange.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
  'current-screen help outranks stale guided task after route change',
);
assert(staleGuidedTaskAfterRouteChange.workflowIntent !== 'CREATE_SHIFT', 'route change does not leak prior guided workflow into screen help');
assert(staleGuidedTaskAfterRouteChange.screenDetailIntent === true, 'route-changed screen help remains a detailed current-surface explanation');
const directCurrentScreenHelpDuringTask = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: {
    activeGuidedTask: {
      screenPath: '/company',
      semanticPlan: { family: 'UI_GUIDANCE', workflowIntent: 'CREATE_SHIFT' },
    },
    lastScreenPath: '/company',
    guidedTarget: { status: 'FOUND', targetKey: 'company:shift-start' },
  },
  message: 'Bu ekranı anlat',
});
assert(
  directCurrentScreenHelpDuringTask.typedRequest?.taskType === 'SCREEN_CONTEXT'
    && directCurrentScreenHelpDuringTask.typedRequest?.screenContextIntent === true
    && directCurrentScreenHelpDuringTask.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
  'direct current-screen explanation outranks an active task on the same route',
);
assert(directCurrentScreenHelpDuringTask.workflowIntent !== 'CREATE_SHIFT', 'direct current-screen explanation does not inherit the active workflow');

const visibleControlPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company/shifts',
    label: 'Vardiyalar',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Ayrıntılı çalışma alanını göster', semanticType: 'disclosure', targetKey: 'company:details', disabled: false }],
      activeTabs: [],
    },
  },
  conversationState: { guidedTarget: null },
  message: 'Detayları göster nerede?',
});
assert(visibleControlPlan.family === 'UI_GUIDANCE', 'visible control request stays in canonical UI guidance');
assert(visibleControlPlan.explicitUiGuidance === true, 'visible control request is not reinterpreted as record lookup');

const explicitNextStepQuestion = resolveSemanticIntent({
  ...workflowFixture,
  message: 'Konum incelemeden sonra nereye geçeyim?',
  screenContext: { path: '/company/georeview', label: 'Konum İncele', role: 'COMPANY' },
  conversationState: null,
});
assert(explicitNextStepQuestion.family !== 'CONTINUE_CURRENT_REASONING', 'an explicit current-screen next-step question is not mistaken for a contextless continuation');

const planDrivenTarget = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false }],
      activeTabs: [],
    },
  },
  conversationState: canonicalWorkflowState,
  semanticPlan: canonicalContinuationPlan,
  message: 'Adım adım anlat',
});
assert(planDrivenTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'guided target consumes the canonical continuation plan before raw phrase fallback');
assert(planDrivenTarget.targetKey === 'company:rehberi-baslat', 'canonical continuation resolves the real workflow target');
const disabledTargetContext = {
  path: '/company',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [{ label: 'Personel erişimi oluştur', semanticType: 'button', targetKey: 'company:personel-access', disabled: false }],
    disabledButtons: [{ label: 'Taslak vardiya oluştur', semanticType: 'button', targetKey: '/company:button:Taslak vardiya oluştur', disabled: true }],
    workflowState: { workflowId: 'COMPANY_GUIDED_NEW_PLAN', activeStepOrdinal: 2, currentTargetLabel: 'Taslak vardiya oluştur', source: 'LIVE_UI' },
  },
};
const disabledTarget = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: disabledTargetContext,
  conversationState: { activeGuidedTask: { workflowIntent: 'CREATE_SHIFT' } },
  semanticPlan: { family: 'CONTINUE_CURRENT_REASONING', workflowIntent: 'CREATE_SHIFT' },
  message: 'sonra',
});
assert(disabledTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'live workflow may explain a disabled current-step target');
assert(disabledTarget.label === 'Taslak vardiya oluştur', 'live workflow target does not fall back to an unrelated enabled control');
const occludedLiveTarget = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Personel erişimi oluştur', semanticType: 'button', targetKey: 'company:personel-access', disabled: false }],
      disabledButtons: [],
      workflowState: { workflowId: 'COMPANY_GUIDED_NEW_PLAN', activeStepOrdinal: 2, currentTargetLabel: 'Taslak vardiya oluştur', source: 'LIVE_UI' },
    },
  },
  conversationState: { activeGuidedTask: { workflowIntent: 'CREATE_SHIFT' } },
  semanticPlan: { family: 'EXPLAIN_CURRENT_TARGET', workflowIntent: 'CREATE_SHIFT' },
  message: 'burda ne yapıcam',
});
assert(occludedLiveTarget.status === GUIDED_TARGET_STATUSES.NOT_FOUND, 'live workflow does not claim an occluded current-step target');
assert(occludedLiveTarget.label !== 'Personel erişimi oluştur', 'live workflow never substitutes an unrelated visible control');

assert(isCopilotGuidanceMessage('Girdim.'), 'continuation command is guidance');
assert(isCopilotGuidanceMessage('Burası ne?'), 'screen grounding question is guidance');
assert(!isCopilotGuidanceMessage('Sözleşmeyi onayla'), 'business write is not guidance');

const serviceSource = source('backend/src/ai/service.js');
const stateSource = source('backend/src/ai/chat/canonicalConversationState.js');
const overlaySource = source('web/src/components/copilot/GuidedTargetOverlay.jsx');
const surfaceSource = source('web/src/components/copilot/uiSurface.js');
const drawerSource = source('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const helpComposerSource = source('backend/src/ai/chat/helpComposer.js');
const styleSource = source('web/src/index.css');
const guidedModalShellSource = source('web/src/panels/company/guidedPlanModalShell.jsx');
const guidedPlanModalSource = source('web/src/panels/company/GuidedPlanModal.jsx');
const guidedModalSectionsSource = source('web/src/panels/company/guidedPlanModalSections.jsx');
assert(serviceSource.includes('resolveCopilotGuidedTarget'), 'service consumes canonical target resolver');
assert(serviceSource.includes('guidedTarget'), 'service returns grounded target state');
assert(serviceSource.includes('continuationDepth > 1'), 'repeated continuation changes its truthful presentation without inventing progress');
assert(stateSource.includes('guidedTarget'), 'conversation state stores target continuity without auth authority');
assert(stateSource.includes('nonSettlingTargetExplanation'), 'target explanation does not settle or erase the active task');
assert(overlaySource.includes('scrollIntoView'), 'browser target uses bounded scroll');
assert(overlaySource.includes("window.innerWidth <= 720 ? 'auto' : 'smooth'"), 'mobile target scroll settles before drawer overlap correction');
assert(overlaySource.includes('pointerEvents: \'none\''), 'highlight cannot block the target click');
assert(overlaySource.includes('TARGET_DISAPPEARED'), 'disappeared target clears highlight');
assert(overlaySource.includes('const hadTarget = Boolean(targetRef.current)'), 'disappeared target transition observes prior DOM target');
assert(overlaySource.includes("active && active.status !== 'CLEARED'"), 'route changes clear stale guided recovery state before destination resolution');
assert(overlaySource.includes("shouldRestoreGuidedTargetAfterRouteChange(target, getPath())"), 'off-route navigation targets are not replaced by the current workflow marker');
assert(overlaySource.includes('data-copilot-workflow-target-key'), 'modal step changes re-resolve from live workflow target metadata');
assert(overlaySource.includes("target.status === 'UNAUTHORIZED'"), 'live workflow recovery does not override an authorization denial');
assert(overlaySource.includes('keepTargetAboveMobileDrawer'), 'mobile target remains above the bounded drawer');
assert(overlaySource.includes('scrollTargetContainer'), 'mobile overlap correction scrolls the real target container');
assert(overlaySource.includes('window.scrollBy'), 'mobile overlap correction uses bounded browser scroll');
assert(!overlaySource.includes('Bu hedef artık doğrulanamıyor'), 'guided recovery is not rendered as a detached global toast');
assert(surfaceSource.includes('semanticType'), 'ui surface captures semantic target type');
assert(guidedPlanModalSource.includes('else setGuidedTarget(null)'), 'guided modal clears its own target when no prior target exists');
assert(shouldRestoreGuidedTargetAfterRouteChange({ status: 'FOUND', screenPath: '/company' }, '/company') === true, 'same-route guided modal close preserves the active target');
assert(shouldRestoreGuidedTargetAfterRouteChange({ status: 'FOUND', screenPath: '/company' }, '/company/shifts') === false, 'route-changing guided modal close clears the pre-navigation target');
assert(overlaySource.includes('shouldRestoreGuidedTargetAfterRouteChange'), 'overlay rejects a target from a different live route');
assert(overlaySource.includes('shouldRestoreGuidedTargetAfterRouteChange(target, getPath())'), 'overlay compares target identity against the current route before placement');
assert(!guidedPlanModalSource.includes('if (!guidedTargetBeforeModalRef.current) return undefined;'), 'guided modal resolves its own current-step target without a prior Sefer Abi target');
assert(guidedPlanModalSource.includes('function guidedModalTargetKey'), 'guided modal derives a stable semantic key for each current step');
assert(guidedModalSectionsSource.includes('data-copilot-target={guidedTargetKey}'), 'guided modal step controls expose the canonical target identity');
const guidedPeopleStepSource = source('web/src/panels/company/guidedPlanModalPeopleStep.jsx');
assert(hasCanonicalPeopleStepIdentity(guidedPeopleStepSource), 'people and stops step exposes the canonical target or semantic identity');
const intentionallyBrokenPeopleStepSource = guidedPeopleStepSource
  .replace(/data-copilot-target=\{organization \? guidedTargetKey : undefined\}/u, 'data-copilot-target={undefined}')
  .replace(/data-copilot-semantic-id=\{organization \? undefined : ['"]product:company-shifts:step3:address-next['"]\}/u, 'data-copilot-semantic-id={undefined}');
assert(!hasCanonicalPeopleStepIdentity(intentionallyBrokenPeopleStepSource), 'negative PeopleStep fixture rejects missing canonical target and semantic identity');
assert(source('web/src/panels/company/guidedPlanModalCards.jsx').includes('data-copilot-target={guidedTargetKey}'), 'offer step exposes the canonical target identity');
assert(surfaceSource.includes('elementFromPoint'), 'ui surface rejects detached or occluded targets');
assert(overlaySource.includes('elementFromPoint'), 'highlight checks the real topmost target');
assert(drawerSource.includes('guidedRecoveryMessage'), 'guided recovery is attached to the Sefer Abi drawer state');
assert(drawerSource.includes('data-copilot-guided-recovery="true"'), 'guided recovery has an in-drawer accessible marker');
assert(
  drawerSource.includes('guidedRecoveryMessage')
    && drawerSource.includes('messages')
    && drawerSource.includes('scrollRef.current.scrollTop'),
  'mobile recovery re-aligns the conversation scroll',
);
assert(drawerSource.includes('setGuidedRecoveryMessage("");'), 'a new semantic request clears stale recovery presentation');
assert(drawerSource.includes('setGuidedTarget(null)'), 'clearing the transcript also clears the visible guided target');
assert(drawerSource.includes('semanticFamily') && drawerSource.includes('keepsRecoveryContext'), 'current semantic response owns stale-target recovery presentation');
assert(drawerSource.includes('guideActionKind') && drawerSource.includes('action?.guide?.jobType'), 'guide-bearing quick actions retain guide dispatch when action kind metadata is stale');
assert(drawerSource.includes('copilotDrawerResizeHandle'), 'desktop resize handle remains explicit');
assert(styleSource.includes('height: min(35vh, 300px) !important;'), 'mobile drawer uses bounded compact height');
assert(styleSource.includes('.copilotDrawerMoreMenu .copilotDrawerPresets') && styleSource.includes('display: none;'), 'mobile hides desktop-only size presets');
assert(drawerSource.includes('mobileDrawerFrame') && drawerSource.includes('hasMobileFrame') && drawerSource.includes('data-mobile-frame'), 'mobile drawer persists and reflects a bounded frame state');
assert(drawerSource.includes('mobileDrawerPlacement') && drawerSource.includes('mobileDrawerMaxHeight'), 'mobile drawer tracks placement and map-safe height');
assert(drawerSource.includes('drawerResizeBounds') && drawerSource.includes('startDrawerResize') && drawerSource.includes('finishDrawerResize'), 'mobile drawer exposes bounded pointer resize behavior');
assert(drawerSource.includes('suggestionsOpen') && drawerSource.includes('setSuggestionsOpen(false)'), 'closing a suggestion keeps the drawer disclosure state consistent');
assert(drawerSource.includes('copilotDrawer--guided-target'), 'mobile guided target state has a compact drawer mode');
assert(drawerSource.includes('rows={2}'), 'mobile composer starts compact');
assert(!drawerSource.includes('Bağlam: <b>{screenContext.label}</b>'), 'duplicate visible context line is removed');
assert(styleSource.includes('height: var(--copilot-mobile-drawer-height) !important;') && styleSource.includes('max-height: calc(100dvh - 20px) !important;'), 'interacted mobile frame height remains bounded');
assert(styleSource.includes('height: min(35vh, 300px) !important;'), 'mobile guided target mode keeps the real target visible');
assert(styleSource.includes('height: min(56dvh, 470px) !important;'), 'mobile guided workspace keeps a bounded primary modal height');
assert(styleSource.includes('margin-bottom: calc(min(35vh, 300px) + 52px) !important;'), 'mobile guided workspace reserves a real drawer clearance lane');
assert(styleSource.includes('.copilotDrawer .copilotChatSurface::after'), 'mobile chat reserves composer-safe scroll space');
assert(styleSource.includes('box-sizing: border-box;') && styleSource.includes('padding-bottom: 10px;'), 'mobile chat keeps composer-safe geometry');
assert(styleSource.includes('min-height: 36px;') && styleSource.includes('max-height: 120px;'), 'mobile composer grows within bounded height');
assert(styleSource.includes('min-height: 96px;'), 'mobile compact mode preserves a usable answer region');
assert(!styleSource.includes('-webkit-line-clamp: 2;') && styleSource.includes('-webkit-line-clamp: unset;'), 'mobile answers remain fully readable in the scroll surface');
assert(styleSource.includes('copilotMsgActions') && styleSource.includes('max-height: none;') && styleSource.includes('overflow: visible;'), 'mobile action rows remain fully reachable in the scroll surface');
assert(drawerSource.includes('data-copilot-primary-action="true"'), 'mobile compact mode marks the current safe primary action');
assert(drawerSource.includes('copilotMsgPrimaryAction') && drawerSource.includes('data-copilot-primary-action'), 'mobile action markup keeps the primary safe action visible');
assert(!helpComposerSource.includes('targetLabel.toLocaleLowerCase'), 'canonical target labels are not grammatically mutated in visible guidance');
assert(styleSource.includes('.copilotDrawer .copilotComposer {\n    position: static;'), 'mobile composer participates in compact flex layout');
assert(styleSource.includes('.copilotDrawer .copilotChatSurface::after {') && styleSource.includes('display: none;'), 'collapsed compact mode does not reserve a hidden oversized spacer');
assert(!styleSource.includes('height: min(30vh, 268px) !important;'), 'guided workspace does not collapse compact content below the working-mode bound');
assert(guidedModalShellSource.includes('backdropClassName') && guidedModalShellSource.includes('backdropStyle'), 'guided modal exposes a bounded backdrop customization hook');
assert(guidedPlanModalSource.includes('guidedPlanModalBackdrop'), 'guided plan uses the dedicated modal backdrop boundary');
assert(guidedPlanModalSource.includes('guidedPlanModalSurface'), 'guided plan uses the dedicated opaque modal surface');
assert(styleSource.includes('background: rgba(2, 6, 23, .72) !important;'), 'guided modal uses a strong background scrim');
assert(styleSource.includes('background: linear-gradient(180deg, rgba(18, 26, 42, .995), rgba(11, 18, 32, .995)) !important;'), 'guided modal surface is opaque and visually dominant');
assert(styleSource.includes('border: 1px solid rgba(126, 164, 232, .62) !important;') && styleSource.includes('box-shadow: 0 26px 72px rgba(2, 6, 23, .58)'), 'guided modal has a clear boundary and elevation');
assert(guidedModalSectionsSource.includes('guidedPlanPrimaryAction'), 'guided modal exposes one dominant primary action hook');
assert(guidedModalSectionsSource.includes('guidedPlanSecondaryAction'), 'guided modal demotes secondary actions explicitly');
assert(drawerSource.includes('messages.length, open, suggestionsOpen'), 'suggestions disclosure re-anchors conversation scroll');
assert(drawerSource.includes('newestUser') && drawerSource.includes('chatRect.top - userRect.top'), 'suggestions disclosure keeps the newest user exchange below its boundary');

for (const role of ['SUPER_ADMIN', 'ROOM', 'COMPANY', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
  const negative = resolveCopilotGuidedTarget({
    ...fixture({ user: { role, companyId: 10 }, screenContext: { path: '/company/agreements', label: 'Sözleşmeler', role: 'COMPANY', uiHints: { visibleButtons: [] } } }),
    message: 'Detayları göster nerede?',
  });
  if (role === 'COMPANY') assert(negative.status === GUIDED_TARGET_STATUSES.NOT_FOUND, `${role} unknown target has no fake guidance`);
  else assert(negative.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED, `${role} cannot borrow another role screen`);
}

// This is the production orchestration bridge: canonical planning, server
// conversation state, authorized awareness, target resolution, and commit all
// run together. Lower-level composer matrices stay valuable, but cannot
// substitute for this path.
async function runProductionParityRegression() {
  const user = { id: 918001, role: 'COMPANY', companyId: 10, roomId: 1, companyKind: 'COMPANY' };
  const screenContext = {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false }],
      activeTabs: [],
    },
  };
  const request = (message, authSessionId, currentScreen = screenContext) => runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    screenContext: currentScreen,
    message,
    authSessionId,
  });
  const workflowSession = 'm18-canonical-semantic-authority-workflow';
  const workflowStart = await request('Ben vardiya oluşturmak istiyorum', workflowSession);
  assert(workflowStart.semanticPlan?.family === 'UI_GUIDANCE', 'production workflow start remains UI guidance');
  assert(workflowStart.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'production workflow start keeps CREATE_SHIFT');
  assert(workflowStart.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'production workflow start resolves an existing target');
  assert(!/yetkili kayıtta yok|kayıt bulunamadı/i.test(workflowStart.reply || ''), 'production workflow start is not collapsed into record lookup');
  assert((workflowStart.quickActions || []).every((item) => item?.criticalActionExecution !== true), 'production workflow start cannot execute a critical action');
  assert(!(workflowStart.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE' && item?.path === screenContext.path), 'production workflow start does not claim navigation to the screen already open');

  const authorityRegressionSession = 'm18-current-request-authority-regression';
  await request('Ben vardiya oluşturmak istiyorum', authorityRegressionSession);
  const activeFailure = await request('Rehberi başlatamıyorum', authorityRegressionSession);
  assert(activeFailure.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'active target failure remains on the canonical continuation path');
  assert(activeFailure.semanticPlan?.continuationAction === 'RECOVER', 'active target failure resolves as recovery');
  assert(activeFailure.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'active target failure preserves the current workflow');
  assert(!/mevcut ürün kapsamının dışında/i.test(activeFailure.reply || ''), 'active target failure never falls through to out-of-scope');
  assert(/Rehberi Başlat/.test(activeFailure.reply || ''), 'active target recovery preserves the exact visible target label');
  assert(!/Rehberi başlatılması/i.test(activeFailure.reply || ''), 'active target recovery does not mutate the visible target label');

  const currentScreenQuestion = await request('Bu ekran ne işe yarıyor?', authorityRegressionSession);
  assert(
    currentScreenQuestion.semanticPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT'
      && currentScreenQuestion.semanticPlan?.typedRequest?.screenContextIntent === true
      && currentScreenQuestion.semanticPlan?.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
    'explicit current-screen question outranks the previous target',
  );
  assert(currentScreenQuestion.semanticPlan?.workflowIntent !== 'CREATE_SHIFT', 'current-screen question does not inherit the previous workflow target');
  assert(/Planlama Merkezi/i.test(currentScreenQuestion.reply || ''), 'current-screen question explains the live surface');
  assert(currentScreenQuestion.guidedTarget?.status !== GUIDED_TARGET_STATUSES.FOUND || currentScreenQuestion.guidedTarget?.label !== 'Rehberi Başlat', 'current-screen question does not retain the stale control target');

  const navigationScreenContext = {
    ...screenContext,
    uiHints: {
      ...screenContext.uiHints,
      visibleButtons: [
        ...screenContext.uiHints.visibleButtons,
        { label: 'Vardiyalar', semanticType: 'button', targetKey: 'company:shifts', identitySource: 'CANONICAL', disabled: false },
      ],
    },
  };
  const navigationRequest = await request('Vardiyalar nerde', authorityRegressionSession, navigationScreenContext);
  assert(navigationRequest.semanticPlan?.family === 'UI_GUIDANCE', 'explicit navigation remains UI guidance');
  assert(navigationRequest.semanticPlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'explicit navigation resolves the requested surface');
  assert(navigationRequest.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'explicit navigation resolves a real target');
  assert(navigationRequest.guidedTarget?.targetKey === 'company:shifts', 'explicit navigation resolves the canonical shifts target');
  assert(navigationRequest.guidedTarget?.label === 'Vardiyalar', 'explicit navigation keeps the canonical target label');
  assert(navigationRequest.guidedTarget?.label !== 'Rehberi Başlat', 'explicit navigation clears the unrelated previous target');
  assert(!/Rehberi başlatılması/i.test(navigationRequest.reply || ''), 'navigation response does not mutate the previous visible label');

  // Screen explanations have their own continuation units. A follow-up must
  // advance the canonical screen guidance instead of falling into a generic
  // "name an area" clarification when no record is selected.
  const screenContinuationSession = 'm18-screen-explanation-continuation';
  const screenExplanation = await request('Bu ekran ne işe yarıyor?', screenContinuationSession);
  const screenExpansion = await request('Devamını anlat', screenContinuationSession);
  assert(
    screenExplanation.semanticPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT'
      && screenExplanation.semanticPlan?.typedRequest?.screenContextIntent === true
      && screenExplanation.semanticPlan?.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
    'screen explanation starts with the canonical screen context',
  );
  assert(screenExpansion.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'screen explanation continuation stays a continuation');
  assert(
    screenExpansion.semanticPlan?.continuationBasePlan?.typedRequest?.taskType === 'SCREEN_CONTEXT'
      && screenExpansion.semanticPlan?.continuationBasePlan?.typedRequest?.screenContextIntent === true
      && screenExpansion.semanticPlan?.continuationBasePlan?.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
    'screen continuation preserves the settled screen explanation',
  );
  assert(/Planlama Merkezi|ekran/i.test(screenExpansion.reply || ''), 'screen continuation remains grounded to the live screen');
  assert(!/birden fazla kayıt|alanı kastettiğini netleştir/i.test(screenExpansion.reply || ''), 'screen continuation does not require a record clarification');
  assert(screenExpansion.reply !== screenExplanation.reply, 'screen continuation advances beyond the first screen explanation');

  // Real users often fuse the action report and the next question without a
  // space, or refer to a numbered step instead of repeating the domain noun.
  // Keep this sequence on the production service path so task persistence and
  // workflow knowledge cannot regress while lower-level planner tests stay
  // green.
  const createShiftGoalSession = 'm18-create-shift-goal-workflow-sequence';
  const createShiftGoalStart = await request('vardiya olusturmak ıstıyorum', createShiftGoalSession);
  assert(createShiftGoalStart.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'create-shift goal with Turkish dotless i persists the active workflow');
  assert(createShiftGoalStart.semanticPlan?.workflowModel?.id === 'COMPANY_GUIDED_NEW_PLAN', 'create-shift goal selects the canonical company workflow model');
  assert(createShiftGoalStart.semanticPlan?.workflowStepReference?.ordinal === 1, 'create-shift goal starts at workflow step one');
  assert(createShiftGoalStart.taskState?.activeGoal === 'CREATE_SHIFT', 'create-shift response persists the active goal');
  assert(createShiftGoalStart.taskState?.activeWorkflow === 'COMPANY_GUIDED_NEW_PLAN', 'create-shift response persists the active workflow');
  assert(createShiftGoalStart.taskState?.activeStep?.ordinal === 1, 'create-shift response persists the current step');
  assert(createShiftGoalStart.taskState?.currentExpectedStep?.ordinal === 1, 'create-shift response persists the expected step');
  assert(createShiftGoalStart.taskState?.currentSurface?.path === '/company', 'create-shift response persists the authorized current surface');
  assert(createShiftGoalStart.taskState?.currentRole === 'COMPANY', 'create-shift response persists the current role');
  assert(createShiftGoalStart.taskState?.safeOnly === true, 'create-shift task state remains safe-navigation only');
  const workflowSteps = createShiftGoalStart.semanticPlan?.workflowModel?.steps || [];
  assert(workflowSteps.length === 4, 'create-shift workflow exposes exactly four current product steps');
  for (const step of workflowSteps) {
    assert(String(step.what || '').trim(), `workflow step ${step.ordinal} has a product-grounded what explanation`);
    assert(String(step.why || '').trim(), `workflow step ${step.ordinal} has a product-grounded why explanation`);
    assert(String(step.action || '').trim(), `workflow step ${step.ordinal} has a product-grounded action explanation`);
    assert(Array.isArray(step.controls) && step.controls.length > 0, `workflow step ${step.ordinal} exposes real controls`);
    assert(Array.isArray(step.preconditions) && step.preconditions.length > 0, `workflow step ${step.ordinal} exposes real preconditions`);
    assert(String(step.completion || '').trim(), `workflow step ${step.ordinal} exposes a completion condition`);
    assert(String(step.nextStep || '').trim(), `workflow step ${step.ordinal} exposes the next valid step`);
    assert(String(step.safeAction || '').trim(), `workflow step ${step.ordinal} exposes a safe UI boundary`);
    assert(String(step.businessWriteBoundary || '').trim(), `workflow step ${step.ordinal} exposes the business-write boundary`);
  }
  const createShiftTargetExplanation = await request('burası ne', createShiftGoalSession);
  assert(createShiftTargetExplanation.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', 'create-shift target explanation keeps the current workflow task');
  assert(createShiftTargetExplanation.semanticPlan?.workflowStepReference?.ordinal === 1, 'target explanation keeps workflow step one');
  assert(/1\. adım/i.test(createShiftTargetExplanation.reply || ''), 'target explanation names the current workflow step');
  assert(/Şirket konumu|başlangıç şirket konumunu/i.test(createShiftTargetExplanation.reply || ''), 'step one explanation names the real product target');
  assert(/Neden:|başlangıç noktasına/i.test(createShiftTargetExplanation.reply || ''), 'step one explanation includes why the target is needed');
  assert(/Konumumu al|Adresten bul/i.test(createShiftTargetExplanation.reply || ''), 'step one explanation includes real controls');
  assert(/Ön koşul:/i.test(createShiftTargetExplanation.reply || ''), 'step one explanation includes preconditions');
  assert(/Sonraki adım:/i.test(createShiftTargetExplanation.reply || ''), 'step one explanation includes the next workflow step');
  assert(/iş kaydı yazmıyor|kullanıcı kontrolündedir/i.test(createShiftTargetExplanation.reply || ''), 'step one explanation states the safe business-write boundary');
  const createShiftTeachFromZero = await request('başından anlat', createShiftGoalSession);
  assert(createShiftTeachFromZero.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', 'active create-shift teach-from-zero keeps the workflow explanation');
  assert(createShiftTeachFromZero.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'active create-shift teach-from-zero preserves the workflow goal');
  assert(/1\. adım|Şirket konumu/i.test(createShiftTeachFromZero.reply || ''), 'active create-shift teach-from-zero explains the current workflow step');
  const createShiftNext = await request('tamam bastımsonra', createShiftGoalSession, createShiftStepTwoUiState);
  assert(createShiftNext.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'fused completion and next request remains canonical continuation');
  assert(createShiftNext.semanticPlan?.continuationAction === 'NEXT', 'fused completion and next request advances the workflow');
  assert(createShiftNext.semanticPlan?.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', 'fused completion and next request preserves the active create-shift task');
  assert(createShiftNext.semanticPlan?.workflowStepReference?.ordinal === 2, 'fused completion and next request advances to workflow step two');
  assert(/2\. adım/i.test(createShiftNext.reply || ''), 'workflow continuation explains step two rather than a generic next action');
  assert(/Plan paketi|paket/i.test(createShiftNext.reply || ''), 'workflow continuation names the real step two product target');
  const createShiftBlockedRepeat = await request('sonra', createShiftGoalSession, createShiftStepTwoUiState);
  assert(createShiftBlockedRepeat.semanticPlan?.workflowStepReference?.ordinal === 2, 'incomplete step two keeps the current workflow step');
  assert(createShiftBlockedRepeat.semanticPlan?.workflowProgression?.action === 'BLOCKED_PRECONDITION', 'incomplete step two blocks another blind advance');
  assert(createShiftBlockedRepeat.taskState?.lastCompletedStep === 1, 'incomplete step two preserves only the actually completed prior step');
  assert(/tamamlandığını.*doğrulayamadım|tamamlanmadan sonraki adıma geçmiyorum/i.test(createShiftBlockedRepeat.reply || ''), 'incomplete step two explains the blocked progression truthfully');
  const createShiftStepThreeSession = 'm18-create-shift-step-three-live-transition';
  await request('vardiya oluşturmak istiyorum', createShiftStepThreeSession);
  await request('tamam bastımsonra', createShiftStepThreeSession, createShiftStepTwoUiState);
  const createShiftStepThree = await request('sonra', createShiftStepThreeSession, createShiftStepThreeUiState);
  assert(createShiftStepThree.semanticPlan?.workflowStepReference?.ordinal === 3, 'live completion evidence advances to workflow step three');
  assert(createShiftStepThree.semanticPlan?.workflowProgression?.action === 'NEXT', 'live UI completion evidence permits the next workflow step');
  assert(createShiftStepThree.semanticPlan?.workflowProgression?.preconditionSatisfied === true, 'step three transition records verified UI completion');
  assert(createShiftStepThree.taskState?.lastCompletedStep === 2, 'step three transition records the completed second step');
  assert(createShiftStepThree.guidedTarget?.label === 'Adres Temizle ve İlerle', 'step three transition resolves its current real target');
  const createShiftFusedExplanation = await request('bastımburası ne', createShiftGoalSession);
  assert(createShiftFusedExplanation.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', 'fused action report and target question keeps target explanation');
  assert(createShiftFusedExplanation.semanticPlan?.workflowStepReference?.ordinal === 2, 'fused target explanation stays on workflow step two');
  const createShiftOrdinal = await request('1. adımda napıcam', createShiftGoalSession);
  assert(createShiftOrdinal.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', 'ordinal workflow question keeps target explanation');
  assert(createShiftOrdinal.semanticPlan?.workflowStepReference?.ordinal === 1, 'ordinal workflow question resolves step one');
  assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati, durum veya başka alan/i.test(createShiftOrdinal.reply || ''), 'ordinal workflow question does not fall out of scope or into field lookup');

  for (const [message, ordinal] of [
    ['ilk adım ne', 1],
    ['2. adım neydi', 2],
    ['ikinci adımda ne yapacağım', 2],
    ['3. adım ne', 3],
    ['son adım ne', 4],
    ['dördüncü adımda ne var', 4],
  ]) {
    const response = await request(message, createShiftGoalSession);
    assert(response.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', `ordinal workflow variant keeps target explanation: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === ordinal, `ordinal workflow variant resolves step ${ordinal}: ${message}`);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati, durum veya başka alan/i.test(response.reply || ''), `ordinal workflow variant remains in product knowledge: ${message}`);
  }

  for (const [message, expectedFamily] of [
    ['neden bunu yapıyorum', 'EXPLAIN_CURRENT_TARGET'],
    ['yapamıyorum', 'CONTINUE_CURRENT_REASONING'],
    ['sonra ne yapayım', 'CONTINUE_CURRENT_REASONING'],
    ['nerede kaldık', 'CONTINUE_CURRENT_REASONING'],
    ['geri dön', 'CONTINUE_CURRENT_REASONING'],
    ['devam edelim', 'CONTINUE_CURRENT_REASONING'],
  ]) {
    const response = await request(message, createShiftGoalSession);
    assert(response.semanticPlan?.family === expectedFamily, `create-shift colloquial follow-up keeps its semantic class: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT' || response.semanticPlan?.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `create-shift colloquial follow-up preserves the active goal: ${message}`);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati, durum veya başka alan/i.test(response.reply || ''), `create-shift colloquial follow-up does not fall back: ${message}`);
    assert(response.taskState?.activeGoal === 'CREATE_SHIFT', `create-shift colloquial follow-up persists the task state: ${message}`);
  }

  // Verify product knowledge for each canonical step without turning the
  // response into an execution claim.  The model is the single source for
  // meaning, controls, preconditions, completion, and safe boundaries.
  for (const ordinal of [1, 2, 3, 4]) {
    const knowledgeSession = `m18-create-shift-knowledge-${ordinal}`;
    await request('vardiya oluşturmak istiyorum', knowledgeSession);
    const response = await request(`${ordinal}. adımda ne yapacağım`, knowledgeSession);
    const step = response.semanticPlan?.workflowModel?.steps?.find((item) => item.ordinal === ordinal)
      || response.workflowModel?.steps?.find((item) => item.ordinal === ordinal);
    assert(step, `workflow knowledge resolves step ${ordinal}`);
    for (const [key, label] of [
      ['what', 'what'], ['why', 'why'], ['action', 'action'], ['completion', 'completion'],
      ['nextStep', 'next step'], ['safeAction', 'safe action'], ['businessWriteBoundary', 'business-write boundary'],
    ]) assert(String(step[key] || '').trim(), `workflow step ${ordinal} includes ${label} knowledge`);
    assert(Array.isArray(step.controls) && step.controls.length > 0, `workflow step ${ordinal} includes real control knowledge`);
    assert(Array.isArray(step.preconditions) && step.preconditions.length > 0, `workflow step ${ordinal} includes precondition knowledge`);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati, durum veya başka alan/i.test(response.reply || ''), `workflow step ${ordinal} knowledge is not generic or a field lookup`);
  }

  // Real UI Step-2 regression: the modal has advanced to Plan paketi while
  // the persisted task may still carry step one. Every deictic/current-step
  // request must follow the live workflow state and the live target.
  const liveStepTwoSession = 'm18-create-shift-live-step-two-grounding';
  await request('vardiya oluşturmak istiyorum', liveStepTwoSession);
  for (const message of ['tamam açtım sonra burası ne', 'burda ne yapıcam', 'bu adımda napacam', 'şu an kaçıncı adımdayım']) {
    const response = await request(message, liveStepTwoSession, createShiftStepTwoUiState);
    assert(response.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', `live Step-2 production response explains the current step: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `live Step-2 production response preserves CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 2, `live Step-2 production response uses ordinal two: ${message}`);
    assert(response.taskState?.actualUiState?.activeStepOrdinal === 2, `live Step-2 production response records live ordinal two: ${message}`);
    assert(/2\. adım|Plan paketi/i.test(response.reply || ''), `live Step-2 production response names Plan paketi: ${message}`);
    assert(!/Konumumu al|Adresten bul|1\. adım|hava|döviz|kripto|trafik|kritik|sürücü|araç/i.test(response.reply || ''), `live Step-2 production response has no stale or unrelated guidance: ${message}`);
    assert(response.guidedTarget?.screenPath === '/company', `live Step-2 production target remains on the current screen: ${message}`);
    assert(response.guidedTarget?.targetKey !== 'company:rehberi-baslat', `live Step-2 production response clears the stale Step-1 target: ${message}`);
  }
  for (const message of ['nerede kaldık', 'sonra ne', 'devam edelim']) {
    const response = await request(message, liveStepTwoSession, createShiftStepTwoUiState);
    assert(response.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', `live Step-2 production continuation remains canonical: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 2, `live Step-2 production continuation stays on ordinal two: ${message}`);
    assert(response.semanticPlan?.workflowProgression?.blockedByPrecondition === true || response.taskState?.activeStep?.ordinal === 2, `live Step-2 production continuation does not invent completion: ${message}`);
    assert(/2\. adım|Plan paketi/i.test(response.reply || ''), `live Step-2 production continuation names the current step: ${message}`);
  }

  // M18 real-UI corrective regression: a live guided modal must keep
  // current-step how-to and capability questions inside the active workflow.
  // These are semantic classes, not exact phrase allow-lists.  Step 1 must
  // resolve the visible location controls after a user reports that the
  // guide is open; Step 3 must resolve the real personnel add/import
  // capability rather than a shift-field clarification.
  const liveStepOneSession = 'm18-create-shift-live-step-one-how-to-grounding';
  await request('vardiya oluşturmak istiyorum', liveStepOneSession, createShiftStepOneLiveUiState);
  for (const message of [
    'rehberi başlattım şimdi napıcam',
    'rehber açıldı şimdi ne yapacağım',
    'açtım şimdi ne yapmam lazım',
    'şimdi ne yapacağım',
  ]) {
    const response = await request(message, liveStepOneSession, createShiftStepOneLiveUiState);
    assert(response.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', `live Step-1 how-to stays in the workflow: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `live Step-1 how-to preserves CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 1, `live Step-1 how-to resolves ordinal one: ${message}`);
    assert(/Şirket konumu|Konumumu al|Adresten bul/i.test(response.reply || ''), `live Step-1 how-to names current location controls: ${message}`);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati|durum veya başka alan/i.test(response.reply || ''), `live Step-1 how-to has no generic or field fallback: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `live Step-1 how-to resolves a real target: ${message}`);
    assert(['Konumumu al', 'Adresten bul', 'İleri'].includes(response.guidedTarget?.label), `live Step-1 target belongs to the current controls: ${message}`);
  }

  const liveStepThreePeopleSession = 'm18-create-shift-live-step-three-people-capability';
  await request('vardiya oluşturmak istiyorum', liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
  for (const message of ['burda ne yapıcam', 'nasıl yapıcam burda', 'bu adımda napacam', 'şu an kaçıncı adımdayım']) {
    const response = await request(message, liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
    assert(response.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', `live Step-3 how-to stays in the workflow: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `live Step-3 how-to preserves CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 3, `live Step-3 how-to resolves ordinal three: ${message}`);
    assert(/Personel \+ Durak|personel|durak|Ekle|Adresten Bul/i.test(response.reply || ''), `live Step-3 how-to names current people/stop controls: ${message}`);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati|durum veya başka alan|kritik|sürücü|araç|hava|döviz|kripto|trafik/i.test(response.reply || ''), `live Step-3 how-to has no unrelated fallback: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `live Step-3 how-to resolves a real target: ${message}`);
    assert(['Ekle', 'Adresten Bul', 'Excel/CSV içe aktarma', 'Adres Temizle ve İlerle'].includes(response.guidedTarget?.label), `live Step-3 target belongs to current people/stop controls: ${message}`);
  }
  const liveStepThreeDeicticResponses = [];
  for (const message of ['Burası ne', 'Burda napiyoruz', 'Burası ne işe yarıyor', 'Şu an neredeyim', 'Bu adım ne']) {
    const response = await request(message, liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
    liveStepThreeDeicticResponses.push(response);
    assert(response.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', `live Step-3 deictic query stays in the workflow: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `live Step-3 deictic query preserves CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 3, `live Step-3 deictic query binds to ordinal three: ${message}`);
    assert(/Personel \+ Durak|personel|durak|Ekle|Adresten Bul|Excel\/CSV/i.test(response.reply || ''), `live Step-3 deictic query explains the current surface: ${message}`);
    assert(!/Planlama Merkezi.*(?:genel|ana|ekranı|ekrani)/iu.test(response.reply || ''), `live Step-3 deictic query does not fall back to the broader screen: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `live Step-3 deictic query resolves a current target: ${message}`);
    assert((response.quickActions || []).every((item) => item?.criticalActionExecution !== true), `live Step-3 deictic query remains non-executing: ${message}`);
  }
  assert(
    liveStepThreeDeicticResponses[0].semanticPlan?.workflowStepReference?.ordinal === liveStepThreeDeicticResponses[1].semanticPlan?.workflowStepReference?.ordinal,
    'production Burası ne and Burda napiyoruz share the live Step-3 ordinal',
  );
  for (const [message, expectedTarget, expectedCapability] of [
    ['nasıl personel eklerim', 'Ekle', 'ADD_PERSONNEL'],
    ['personel nasıl eklerim', 'Ekle', 'ADD_PERSONNEL'],
    ['toplu personel nasıl yüklerim', 'Excel/CSV içe aktarma', 'IMPORT_PERSONNEL'],
    ['excelden personel ekleniyor mu', 'Excel/CSV içe aktarma', 'IMPORT_PERSONNEL'],
  ]) {
    const response = await request(message, liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
    assert(response.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', `personnel capability stays in the current workflow: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `personnel capability preserves CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 3, `personnel capability resolves the people/stop step: ${message}`);
    assert(response.semanticPlan?.capabilityIntent === expectedCapability, `personnel capability is classified canonically as ${expectedCapability}: ${message}`);
    assert(new RegExp(expectedTarget, 'iu').test(response.reply || ''), `personnel capability explanation names ${expectedTarget}: ${message}`);
    assert(!/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin|mevcut ürün kapsamının dışında/i.test(response.reply || ''), `personnel capability does not use a field or generic fallback: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `personnel capability resolves a real target: ${message}`);
    assert(response.guidedTarget?.label === expectedTarget, `personnel capability target matches its explanation: ${message}`);
    assert((response.quickActions || []).every((item) => item?.criticalActionExecution !== true), `personnel capability remains non-executing: ${message}`);
  }

  // Step-3 procedural-order regression: current product knowledge must carry
  // the real preparation -> split/combined stop generation -> preview order,
  // while live UI grounding keeps every explanation tied to a visible safe
  // control. These probes intentionally cover colloquial and capability
  // variants instead of allowing phrase-specific branches.
  const stepThree = createShiftStartPlan.workflowModel.steps.find((item) => item.ordinal === 3);
  assert(/Durakları Hazırla/i.test(stepThree.action), 'Step-3 canonical action names the combined stop-preparation control');
  assert(/1\. Durak Üret.*2\. Vardiyadan Durakları Çek/i.test(stepThree.action), 'Step-3 canonical action preserves the supported split stop sequence');
  assert(/Durakları Hazırla/i.test(stepThree.completion), 'Step-3 completion requires stop preparation evidence');
  assert(/Ön izleme/i.test(stepThree.nextStep), 'Step-3 next step remains preview only after stop preparation');
  const proceduralResponse = await request('burda napıyorum', liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
  assert(Array.isArray(proceduralResponse.taskState?.workflowOrder) && proceduralResponse.taskState.workflowOrder.length === 5, 'production task state carries the canonical Step-3 order');
  assert(/Durakları Hazırla/i.test(proceduralResponse.taskState?.alternativePath || ''), 'production task state carries the supported Step-3 alternative path');
  assert(Array.isArray(proceduralResponse.taskState?.completionEvidence) && proceduralResponse.taskState.completionEvidence.length > 0, 'production task state carries Step-3 completion evidence');
  for (const message of [
    'burda napıyorum',
    'nasıl yapıcam burda',
    'burayı bana adım adım anlat',
    'anlat bana burayı',
    'durakları hazırlamıyacak mıyım',
    'bundan sonra ne yapacağım',
    'şu anda bu adımda hangi işlem oluyor?',
    'sıradaki işlem nedir?',
    'bu adımın amacı ne?',
  ]) {
    const response = await request(message, liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `procedural Step-3 probe preserves CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 3, `procedural Step-3 probe stays on ordinal three: ${message}`);
    assert(/Durakları Hazırla|Durak Üret|Vardiyadan Durakları Çek|Önizle/i.test(response.reply || ''), `procedural Step-3 probe explains the real order: ${message}`);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati|durum veya başka alan|kritik|sürücü|araç|hava|döviz|kripto|trafik|gizlilik|özel veri/i.test(response.reply || ''), `procedural Step-3 probe has no unrelated fallback: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `procedural Step-3 probe resolves a real target: ${message}`);
  }
  for (const [message, expectedCapability, expectedTarget] of [
    ['nasıl eklemem gerek adresi', 'ENTER_ADDRESS', 'Adres'],
    ['adresi nereye yazacağım?', 'ENTER_ADDRESS', 'Adres'],
    ['adres alanı nerede?', 'ENTER_ADDRESS', 'Adres'],
    ['Adres Temizle ve İlerle nerede?', 'ENTER_ADDRESS', 'Adres Temizle ve İlerle'],
    ['exel dosyasını nerden eklicem', 'IMPORT_PERSONNEL', 'Excel/CSV içe aktarma'],
    ['tabloyu nerden yüklicem', 'IMPORT_PERSONNEL', 'Excel/CSV içe aktarma'],
    ['durakları hazırlamıyacak mıyım', 'PREPARE_STOPS', 'Durakları Hazırla'],
    ['kişileri ekleme yolunu anlatır mısın?', 'ADD_PERSONNEL', 'Ekle'],
  ]) {
    const response = await request(message, liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `Step-3 capability variant preserves CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 3, `Step-3 capability variant stays on ordinal three: ${message}`);
    assert(response.semanticPlan?.capabilityIntent === expectedCapability, `Step-3 capability variant resolves ${expectedCapability}: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `Step-3 capability variant resolves a target: ${message}`);
    assert(new RegExp(expectedTarget, 'iu').test(response.guidedTarget?.label || '') || new RegExp(expectedTarget, 'iu').test(response.reply || ''), `Step-3 capability variant aligns target and explanation: ${message}`);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati|durum veya başka alan|gizlilik|özel veri/i.test(response.reply || ''), `Step-3 capability variant avoids false fallback: ${message}`);
  }
  // Canonical semantic authority must outrank the broad route/cost classifier
  // when the live Step-3 workflow has already resolved PREPARE_STOPS.  Keep a
  // separate explicit cost control to prove cost reasoning remains available
  // when no canonical guided workflow plan owns the turn.
  const prepareStopsAuthorityResponse = await request('durakları hazırlamıyacak mıyım', liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
  assert(prepareStopsAuthorityResponse.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'active Step-3 PREPARE_STOPS keeps CREATE_SHIFT as the semantic authority');
  assert(prepareStopsAuthorityResponse.semanticPlan?.capabilityIntent === 'PREPARE_STOPS', 'active Step-3 PREPARE_STOPS capability remains canonical');
  assert(prepareStopsAuthorityResponse.semanticPlan?.family === 'EXPLAIN_CURRENT_TARGET', 'active Step-3 PREPARE_STOPS is not replaced by a generic cost family');
  assert(prepareStopsAuthorityResponse.guidedTarget?.label === 'Durakları Hazırla', 'active Step-3 PREPARE_STOPS target matches the explanation');
  assert(prepareStopsAuthorityResponse.providerSummary !== 'cost-analysis-authorized-route', 'active Step-3 PREPARE_STOPS cannot take the cost-analysis early return');
  assert(/Durakları Hazırla/i.test(prepareStopsAuthorityResponse.reply || ''), 'active Step-3 PREPARE_STOPS reply explains the real control');
  const explicitCostResponse = await request('maliyeti ne', 'm18-explicit-cost-without-guided-workflow');
  assert(explicitCostResponse.providerSummary === 'cost-analysis-authorized-route', 'explicit cost question without a guided workflow still reaches cost reasoning');
  assert(explicitCostResponse.semanticPlan?.workflowIntent !== 'CREATE_SHIFT', 'explicit cost control has no guided workflow override');
  // M18 Step-3 semantic-authority regression: colloquial capability and
  // settled-task follow-ups must stay in the live guided workflow. These
  // probes deliberately use paraphrases that are not canonical UI labels.
  for (const [message, expectedCapability, expectedTarget] of [
    ['nasıl kişi ekliycem', 'ADD_PERSONNEL', 'Ekle'],
    ['buraya çalışan nasıl ekleniyor', 'ADD_PERSONNEL', 'Ekle'],
    ['personeli nereden ekleyeceğim', 'ADD_PERSONNEL', 'Ekle'],
    ['durak nasıl oluşturuyorum', 'PREPARE_STOPS', 'Durakları Hazırla'],
    ['durak üretme nerede', 'PREPARE_STOPS', 'Durakları Hazırla'],
    ['kişileri ekledim şimdi durağı nasıl çıkaracağız', 'PREPARE_STOPS', 'Durakları Hazırla'],
  ]) {
    const response = await request(message, liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `unseen Step-3 capability keeps CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 3, `unseen Step-3 capability stays on ordinal three: ${message}`);
    assert(response.semanticPlan?.capabilityIntent === expectedCapability, `unseen Step-3 capability resolves ${expectedCapability}: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `unseen Step-3 capability resolves a live target: ${message}`);
    assert(response.guidedTarget?.label === expectedTarget, `unseen Step-3 capability target matches explanation: ${message}`);
    assert(response.providerSummary !== 'cost-analysis-authorized-route', `unseen Step-3 capability is not stolen by cost reasoning: ${message}`);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati|durum veya başka alan|araç|sürücü|kritik/i.test(response.reply || ''), `unseen Step-3 capability has no unrelated domain fallback: ${message}`);
  }
  for (const [message, expectedAction] of [
    ['ekledim sonra?', 'NEXT'],
    ['yaptım, şimdi ne olacak', 'NEXT'],
    ['sonraki kısmı anlat', 'NEXT'],
    ['dediğin yer yok', 'RECOVER'],
    ['tekrar göster', 'RECOVER'],
  ]) {
    const response = await request(message, liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT' || response.semanticPlan?.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `Step-3 follow-up preserves the active task: ${message}`);
    assert(response.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', `Step-3 follow-up stays on continuation: ${message}`);
    assert(response.semanticPlan?.continuationAction === expectedAction, `Step-3 follow-up resolves ${expectedAction}: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 3 || response.semanticPlan?.continuationBasePlan?.workflowStepReference?.ordinal === 3, `Step-3 follow-up stays on current step: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `Step-3 follow-up re-resolves a live target: ${message}`);
    assert(!/mevcut ürün kapsamının dışında|araç|sürücü|başlangıç\/bitiş saati|durum veya başka alan/i.test(response.reply || ''), `Step-3 follow-up has no unrelated fallback: ${message}`);
  }
  const continuationFirst = await request('Devamını anlat', liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
  const continuationSecond = await request('Devamını anlat', liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
  assert(continuationSecond.semanticPlan?.continuationDepth > continuationFirst.semanticPlan?.continuationDepth, 'Step-3 continuation advances settled explanation depth');
  assert(continuationFirst.reply !== continuationSecond.reply, 'Step-3 continuation does not repeat the identical explanation');
  assert(!/İnsan onayı|human approval/i.test(continuationFirst.reply || '') && !/İnsan onayı|human approval/i.test(continuationSecond.reply || ''), 'Step-3 visible terminology keeps user approval wording');
  for (const message of ['ekledim şimdi napıcam', 'exel\/csv içe aktardım şimdi ne yapcam']) {
    const response = await request(message, liveStepThreePeopleSession, createShiftStepThreePeopleLiveUiState);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT', `Step-3 claimed-progress probe preserves CREATE_SHIFT: ${message}`);
    assert(response.semanticPlan?.workflowStepReference?.ordinal === 3, `Step-3 claimed-progress probe remains on current step without UI proof: ${message}`);
    assert(response.semanticPlan?.workflowCompletionVerified !== true && response.taskState?.stepCompletionVerified !== true, `Step-3 claimed-progress probe does not fabricate completion: ${message}`);
  }

  // A real uninterrupted COMPANY conversation must keep the established
  // CREATE_SHIFT goal ahead of generic reasoning, field clarification, and
  // settled-result fallbacks.  These are intentionally varied follow-ups,
  // not a finite phrase allow-list for the UI.
  const continuitySession = 'm18-active-user-goal-continuity';
  const continuityStart = await request('vardiya oluşturmak istiyorum', continuitySession);
  assert(continuityStart.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'active continuity establishes CREATE_SHIFT');
  let previousContinuityDepth = 0;
  for (const [message, expectedAction] of [
    ['ne yapacağım', null],
    ['burası ne', null],
    ['tamam', 'CONTINUE'],
    ['sonra ne yapayım', 'NEXT'],
    ['yapamıyorum', 'RECOVER'],
    ['tamam tıkladım sonra', 'NEXT'],
    ['vardiya oluşturacaktık ne oldu', 'CONTINUE'],
    ['nerede kaldık', 'CONTINUE'],
    ['devam edelim', 'CONTINUE'],
    ['geri dön', 'BACK'],
  ]) {
    const response = await request(message, continuitySession);
    assert(!/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati|durum veya başka alan/i.test(response.reply || ''), `active continuity did not fall back to unrelated help: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'CREATE_SHIFT' || response.semanticPlan?.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `active continuity preserves CREATE_SHIFT: ${message}`);
    assert(['EXPLAIN_CURRENT_TARGET', 'CONTINUE_CURRENT_REASONING'].includes(response.semanticPlan?.family), `active continuity stays in task guidance: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `active continuity resolves a current target: ${message}`);
    if (expectedAction) assert(response.semanticPlan?.continuationAction === expectedAction, `active continuity action is ${expectedAction}: ${message}`);
    if (response.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING') {
      const depth = Number(response.semanticPlan?.continuationDepth || 0);
      assert(depth > previousContinuityDepth, `active continuity advances task depth: ${message}`);
      previousContinuityDepth = depth;
    }
  }
  assert(previousContinuityDepth >= 7, 'active continuity sequence records progressive task depth');

  for (const [message, action] of [
    ['Adım adım anlat', 'EXPAND'],
    ['Devam', 'CONTINUE'],
    ['Sonra?', 'NEXT'],
    ['Bulamadım', 'RECOVER'],
    ['Burada göremiyorum', 'RECOVER'],
    ['Geri', 'BACK'],
    ['Yanlış ekrandayım', 'RECOVER'],
  ]) {
    const response = await request(message, workflowSession);
    assert(response.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', `production continuation preserves workflow family: ${message}`);
    assert(response.semanticPlan?.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `production continuation preserves workflow task: ${message}`);
    assert(response.semanticPlan?.continuationAction === action, `production continuation classifies recovery action: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `production continuation resolves a current target: ${message}`);
    assert((response.quickActions || []).every((item) => item?.criticalActionExecution !== true), `production continuation stays non-executing: ${message}`);
  }

  const screenResponse = await request('Nasıl çalışıyor bu?', 'm18-canonical-semantic-authority-screen');
  assert(
    screenResponse.semanticPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT'
      && screenResponse.semanticPlan?.typedRequest?.screenContextIntent === true
      && screenResponse.semanticPlan?.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
    'production screen referent uses canonical screen context',
  );
  assert(screenResponse.semanticPlan?.conversationRoute === 'RETURN_TO_PRODUCT_TASK', 'production screen referent is not routed off-topic');
  assert(!/mevcut ürün kapsamının dışında/i.test(screenResponse.reply || ''), 'production screen referent receives product help');

  // Current-screen help and in-product onboarding are semantic classes, not
  // a finite phrase list.  Keep representative colloquial/deictic variants
  // on the real service path so they cannot regress to generic out-of-scope
  // handling or a record/data lookup.
  for (const message of ['burada ne yapabilirim', 'burda naparım', 'bu ekran ne işe yarıyor']) {
    const response = await request(message, `m18-screen-help-variant-${message}`);
    assert(
      response.semanticPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT'
        && response.semanticPlan?.typedRequest?.screenContextIntent === true
        && response.semanticPlan?.typedRequest?.scopeTarget === 'CURRENT_SCREEN',
      `screen-help variant keeps screen context: ${message}`,
    );
    assert(response.semanticPlan?.conversationRoute === 'RETURN_TO_PRODUCT_TASK', `screen-help variant remains product-grounded: ${message}`);
    assert(!/mevcut ürün kapsamının dışında/i.test(response.reply || ''), `screen-help variant is not generic out-of-scope: ${message}`);
    assert(/Planlama Merkezi|ekran|operasyon|İlk bakılacak yer|Önce/i.test(response.reply || ''), `screen-help variant explains the current surface: ${message}`);
  }
  for (const message of ['bana programı öğret', "SeferPakt'ı nasıl kullanacağım", 'nereden başlayayım']) {
    const response = await request(message, `m18-product-help-variant-${message}`);
    assert(response.semanticPlan?.conversationRoute !== 'OFF_TOPIC_SAFE', `product-help variant is not out-of-scope: ${message}`);
    assert(!/mevcut ürün kapsamının dışında/i.test(response.reply || ''), `product-help variant has in-product guidance: ${message}`);
  }

  // Current-screen product knowledge is broader than screen-purpose wording.
  // Input/precondition, validation/recovery, and next-step questions without a
  // record noun must still use the authorized visible surface as their
  // grounding context.  Keep the negative reasoning controls below so this
  // class cannot swallow risk or explicit next-action semantics.
  const knowledgeScreen = {
    path: '/company/financial-operations',
    label: 'Finansal Operasyonlar',
    role: 'COMPANY',
    uiHints: { visibleButtons: [], activeTabs: [] },
  };
  const knowledgeRequest = (message, authSessionId) => request(message, authSessionId, knowledgeScreen);
  const screenKnowledgeExpectations = [
    ['ne girmem lazım', 'HOW_TO_HELP'],
    ['zorunlu mu', 'HOW_TO_HELP'],
    ['yanlış yaparsam ne olur', 'HOW_TO_HELP'],
    ['nasıl düzeltecem', 'HOW_TO_HELP'],
    ['sonra ne olacak', 'NEXT_STEP'],
    ['neden gerekli', 'SCREEN_PURPOSE'],
  ];
  for (const [message, expectedQuestionType] of screenKnowledgeExpectations) {
    const response = await knowledgeRequest(message, `m18-screen-knowledge-${message}`);
    assert(
      ['SCREEN_CONTEXT', 'UI_GUIDANCE'].includes(response.semanticPlan?.family)
        && response.semanticPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT',
      `current-screen knowledge remains screen-grounded: ${message}`,
    );
    assert(response.semanticPlan?.conversationRoute === 'RETURN_TO_PRODUCT_TASK', `current-screen knowledge remains in product route: ${message}`);
    assert(
      response.questionType === expectedQuestionType
        || (expectedQuestionType === 'HOW_TO_HELP' && response.questionType === 'SCREEN_EXPLANATION_HELP'),
      `current-screen knowledge uses the canonical public type ${expectedQuestionType}: ${message}`,
    );
    assert(!/mevcut ürün kapsamının dışında/i.test(response.reply || ''), `current-screen knowledge is not generic out-of-scope: ${message}`);
    assert(/Finansal Operasyonlar|finans|ekran|alan|adım|adim|önce|once/i.test(response.reply || ''), `current-screen knowledge is grounded in the visible surface: ${message}`);
  }
  const riskControl = await knowledgeRequest('Riskleri sırala', 'm18-screen-knowledge-negative-risk');
  assert(riskControl.semanticPlan?.family !== 'SCREEN_CONTEXT' && riskControl.questionType !== 'HOW_TO_HELP', 'screen knowledge does not swallow risk reasoning');
  assert(!/mevcut ürün kapsamının dışında/i.test(riskControl.reply || ''), 'risk reasoning remains product-grounded');
  const nextActionControl = await knowledgeRequest('Sıradaki doğru işlem ne?', 'm18-screen-knowledge-negative-next-action');
  // The canonical planner now keeps this request in the UI-guidance family
  // while preserving its explicit NEXT_ACTION task and current-screen scope.
  // The old checker assertion required the retired NEXT_STEP family and was
  // therefore a harness contract drift, not a product regression.
  assert(
    ['UI_GUIDANCE', 'SCREEN_CONTEXT', 'NEXT_STEP'].includes(nextActionControl.semanticPlan?.family)
      && ['NEXT_ACTION', 'SCREEN_CONTEXT'].includes(nextActionControl.semanticPlan?.typedRequest?.taskType)
      && nextActionControl.semanticPlan?.typedRequest?.scopeTarget === 'CURRENT_SCREEN'
      && nextActionControl.semanticPlan?.typedRequest?.screenContextIntent === true,
    'screen knowledge preserves explicit current-screen next action',
  );
  assert(
    ['AUTHORIZED_DOMAIN_SCREEN_CONTEXT', 'NEXT_BEST_ACTION', 'NEXT_STEP', 'NEXT_ACTION'].includes(nextActionControl.questionType),
    'explicit next action keeps a canonical public question type',
  );

  const noBase = await request(
    'Devam',
    'm18-canonical-semantic-authority-no-base',
    {
      ...screenContext,
      uiHints: { visibleButtons: [], activeTabs: [] },
    },
  );
  assert(noBase.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'continuation without prior task remains a canonical continuation request');
  assert(noBase.semanticPlan?.clarificationNeed === 'CONTINUATION_BASE_NOT_FOUND', 'continuation without prior task asks for clarification');
  assert(noBase.guidedTarget?.status !== GUIDED_TARGET_STATUSES.FOUND, 'continuation without prior task does not invent a target');

  // Navigation to the Vardiyalar surface is a UI-guidance task.  It must not
  // be downgraded to a field lookup just because the user names the domain.
  const shiftNavigationContext = {
    path: '/company/agreements',
    label: 'Sözleşmeler',
    role: 'COMPANY',
    uiHints: { visibleButtons: [], activeTabs: [] },
  };
  const shiftNavigationRequest = (message, authSessionId, currentScreen = shiftNavigationContext) => runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    screenContext: currentScreen,
    message,
    authSessionId,
  });
  for (const message of [
    'vardiyalar nerde',
    'vardiyalar ekranına gitmek istiyorum',
    'vardiyaları kontrol edelim',
    'vardiya ekranını göster',
    'vardiyalara gidelim',
    'Vardiya ekranını aç',
  ]) {
    const response = await shiftNavigationRequest(message, `m18-shift-navigation-${message}`);
    assert(response.semanticPlan?.family === 'UI_GUIDANCE', `shift surface navigation stays UI guidance: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', `shift surface navigation keeps its task: ${message}`);
    assert((response.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE' && item?.path === '/company/shifts'), `shift surface navigation resolves the authorized route: ${message}`);
    assert(!/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin/i.test(response.reply || ''), `shift surface navigation is not a field clarification: ${message}`);
  }

  const shiftStatus = await shiftNavigationRequest('vardiya durumları ne', 'm18-shift-status-data-query');
  assert(shiftStatus.semanticPlan?.family !== 'UI_GUIDANCE', 'shift status remains a data question');
  // The canonical response remains a data/status answer, and may expose the
  // real Reports surface as a safe follow-up.  The retired assertion rejected
  // every navigation action and therefore treated a valid canonical route as
  // fabricated guidance.
  assert(
    (shiftStatus.quickActions || []).every((item) => item?.actionKind !== 'OPEN_ROUTE' || item?.path === '/company/reports'),
    'shift status only offers the canonical reports follow-up',
  );

  const nonexistentShiftTarget = await shiftNavigationRequest('Hayali vardiya kontrolünü aç', 'm18-nonexistent-shift-target');
  assert(!(nonexistentShiftTarget.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE'), 'nonexistent shift target has no navigation action');
  assert(nonexistentShiftTarget.guidedTarget?.status !== GUIDED_TARGET_STATUSES.FOUND, 'nonexistent shift target has no guided target');
  assert(!/Planlama Merkezi ekranını aç|Vardiyalar ekranını aç/i.test(nonexistentShiftTarget.reply || ''), 'nonexistent shift target does not claim a real screen');
  assert(/doğrulayamadım|doğrulanamadı|gerçek.*ekran|gerçek.*bölüm/i.test(nonexistentShiftTarget.reply || ''), 'nonexistent shift target is rejected as an unresolved UI target');
  const unseenNonexistentShiftTarget = await shiftNavigationRequest('Hayali vardiya panelini göster', 'm18-unseen-nonexistent-shift-target');
  assert(unseenNonexistentShiftTarget.semanticPlan?.family === 'UI_GUIDANCE', 'unseen nonexistent shift target stays UI guidance');
  assert(!(unseenNonexistentShiftTarget.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE'), 'unseen nonexistent shift target has no navigation action');
  assert(!/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin/i.test(unseenNonexistentShiftTarget.reply || ''), 'unseen nonexistent shift target is not a field clarification');

  // A role-private UI request is resolved against the current canonical role
  // and screen authority before any active CREATE_SHIFT continuation or field
  // clarification can reuse stale task context. The request remains read-only
  // and carries an explicit unauthorized target state for the UI layer.
  const roleTargetContext = {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false }],
      activeTabs: [],
    },
  };
  const roleTargetRequest = (message, authSessionId, currentScreen = roleTargetContext) => runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    screenContext: currentScreen,
    message,
    authSessionId,
  });
  const unauthorizedRoleTarget = await roleTargetRequest('SUPER_ADMIN kullanıcı yönetimi ekranını aç', 'm18-unauthorized-role-target');
  assert(unauthorizedRoleTarget.semanticPlan?.roleTargetResolution === 'UNAUTHORIZED', 'cross-role UI target resolves as unauthorized');
  assert(unauthorizedRoleTarget.semanticPlan?.family === 'AUTHORIZATION_BOUNDARY', 'cross-role UI target owns the canonical authorization boundary');
  assert(unauthorizedRoleTarget.questionType === 'AUTHORIZATION_BOUNDARY', 'cross-role UI target emits the public authorization type');
  assert(unauthorizedRoleTarget.guidedTarget?.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED, 'cross-role UI target carries an explicit unauthorized guided target');
  assert(!/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin/i.test(unauthorizedRoleTarget.reply || ''), 'cross-role UI target never falls into shift-field clarification');
  assert(!((unauthorizedRoleTarget.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE')), 'cross-role UI target exposes no navigation action');
  assert(/yetkili|kullanılamıyor|yönlendirme yapmıyorum/i.test(unauthorizedRoleTarget.reply || ''), 'cross-role UI target explains the authorization boundary truthfully');

  const activeWorkflowUnauthorizedSession = 'm18-unauthorized-role-target-active-create-shift';
  await roleTargetRequest('vardiya oluşturmak istiyorum', activeWorkflowUnauthorizedSession);
  const activeWorkflowUnauthorized = await roleTargetRequest('SUPER_ADMIN kullanıcı yönetimi ekranını aç', activeWorkflowUnauthorizedSession);
  assert(activeWorkflowUnauthorized.semanticPlan?.roleTargetResolution === 'UNAUTHORIZED', 'unauthorized target outranks an active CREATE_SHIFT task');
  assert(activeWorkflowUnauthorized.semanticPlan?.family === 'AUTHORIZATION_BOUNDARY', 'active CREATE_SHIFT does not replace an unauthorized target boundary');
  assert(!/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin|mevcut ürün kapsamının dışında/i.test(activeWorkflowUnauthorized.reply || ''), 'active CREATE_SHIFT cannot turn unauthorized target into a fallback');
  assert(activeWorkflowUnauthorized.guidedTarget?.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED, 'active CREATE_SHIFT carries the unauthorized target state');

  const unseenUnauthorizedRoleTarget = await roleTargetRequest('sistem yöneticisi kullanıcılar sayfasını göster', 'm18-unseen-unauthorized-role-target');
  assert(unseenUnauthorizedRoleTarget.semanticPlan?.roleTargetResolution === 'UNAUTHORIZED', 'unseen cross-role paraphrase resolves as unauthorized');
  assert(unseenUnauthorizedRoleTarget.guidedTarget?.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED, 'unseen cross-role paraphrase has no visible target');
  assert(!/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin/i.test(unseenUnauthorizedRoleTarget.reply || ''), 'unseen cross-role paraphrase avoids stale workflow fallback');

  const nonexistentRoleTarget = await roleTargetRequest('hayali kullanıcı yönetimi ekranını aç', 'm18-nonexistent-role-target');
  // COMPANY has a canonical product-scope boundary for user-management
  // surfaces.  The old checker expected the retired generic unresolved-target
  // shape and would reject the safer explicit scope response.
  assert(nonexistentRoleTarget.semanticPlan?.family === 'AUTHORIZATION_BOUNDARY', 'unsupported company admin target stays on the scope boundary');
  assert(nonexistentRoleTarget.semanticPlan?.workflowIntent === 'UNSUPPORTED_COMPANY_ADMIN_SURFACE', 'unsupported company admin target keeps its canonical scope');
  assert(!nonexistentRoleTarget.guidedTarget || nonexistentRoleTarget.guidedTarget?.status !== GUIDED_TARGET_STATUSES.FOUND, 'unsupported company admin target has no fabricated target');
  assert(!(nonexistentRoleTarget.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE'), 'unsupported company admin target has no navigation action');
  assert(!/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin/i.test(nonexistentRoleTarget.reply || ''), 'nonexistent role target avoids stale workflow fallback');

  const authorizedRoleTarget = await roleTargetRequest('COMPANY ekranındaki Rehberi Başlat nerede', 'm18-authorized-role-target');
  assert(authorizedRoleTarget.semanticPlan?.roleTargetResolution === 'AUTHORIZED', 'current-role UI target remains authorized');
  assert(authorizedRoleTarget.semanticPlan?.family === 'UI_GUIDANCE', 'current-role UI target stays in UI guidance');
  assert(authorizedRoleTarget.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'current-role UI target resolves the real visible control');
  assert(authorizedRoleTarget.guidedTarget?.targetKey === 'company:rehberi-baslat', 'current-role UI target preserves canonical identity');

  // The real-user flow changes the browser route before the user confirms
  // entry.  Canonical continuation must verify that current screen and target
  // the live Vardiyalar surface instead of replaying the prior Planlama
  // Merkezi target or falling off-topic.
  const realisticFlowSession = 'm18-realistic-guided-shift-flow';
  const planningContext = {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false }],
      activeTabs: [],
    },
  };
  const realisticStart = await shiftNavigationRequest('Bir vardiya oluşturalım', realisticFlowSession, planningContext);
  assert(realisticStart.semanticPlan?.family === 'UI_GUIDANCE', 'realistic shift flow starts as UI guidance');
  assert(realisticStart.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'realistic shift flow preserves CREATE_SHIFT');

  // A continuation request is not proof that the current guided step was
  // completed.  With the planning surface still showing the entry control and
  // no live workflow state, repeated "sonra" must remain on step one rather
  // than advancing from conversation turn count alone.
  const preconditionSession = 'm18-create-shift-precondition-coordination';
  const preconditionStart = await shiftNavigationRequest('vardiya oluşturmak istiyorum', preconditionSession, planningContext);
  assert(preconditionStart.taskState?.currentExpectedStep?.ordinal === 1, 'create-shift precondition flow starts on step one');
  const preconditionFirstNext = await shiftNavigationRequest('sonra', preconditionSession, planningContext);
  // In the canonical CONTINUE contract the workflow result is returned at the
  // response envelope/task-state level, while semanticPlan carries the intent
  // family.  The retired assertion read semanticPlan.workflowProgression and
  // missed the same safety guarantee that the live response exposes.
  assert(preconditionFirstNext.workflowStepReference?.ordinal === 1, 'incomplete step one blocks the first blind advance');
  assert(preconditionFirstNext.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'blocked step one preserves the active workflow');
  assert(preconditionFirstNext.taskState?.currentExpectedStep?.ordinal === 1, 'blocked step one keeps the current expected step');
  assert(preconditionFirstNext.taskState?.lastCompletedStep == null, 'blocked step one does not fabricate completion');
  assert(/tamamlandığını canlı arayüzde doğrulamadan sonraki adıma geçtiğini varsaymıyorum/i.test(preconditionFirstNext.reply || ''), 'blocked step one explains the unverified completion boundary');
  const preconditionSecondNext = await shiftNavigationRequest('sonra', preconditionSession, planningContext);
  assert(preconditionSecondNext.workflowStepReference?.ordinal === 1, 'repeated blind advance remains on step one');
  assert(preconditionSecondNext.taskState?.lastCompletedStep == null, 'repeated blind advance still has no completed step');

  const enteredContext = {
    path: '/company/shifts',
    label: 'Vardiyalar',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Detayları göster', semanticType: 'disclosure', targetKey: 'company-shifts:detaylari-goster', disabled: false }],
      activeTabs: [],
    },
  };
  const entered = await shiftNavigationRequest('Girdim', realisticFlowSession, enteredContext);
  assert(entered.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'Girdim rejoins the active guided task');
  assert(entered.semanticPlan?.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', 'Girdim keeps the active CREATE_SHIFT task');
  assert(entered.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'Girdim resolves a real current Vardiyalar target');
  assert(entered.guidedTarget?.screenPath === '/company/shifts', 'Girdim uses the current Vardiyalar screen');
  assert(!(entered.quickActions || []).some((item) => item?.path === '/company'), 'Girdim does not retain a stale Planlama Merkezi navigation action');
  for (const message of ['Bulamadım', 'Devam et', 'Geri dön']) {
    const response = await shiftNavigationRequest(message, realisticFlowSession, enteredContext);
    assert(response.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', `${message} preserves the active realistic shift task`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `${message} resolves a current Vardiyalar target`);
    assert(response.guidedTarget?.screenPath === '/company/shifts', `${message} stays grounded to Vardiyalar`);
    assert(!(response.quickActions || []).some((item) => item?.path === '/company'), `${message} does not replay a stale Planlama Merkezi route`);
  }

  const driverNavigation = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: { id: 918333, role: 'DRIVER', companyId: 10, roomId: 1 },
    screenContext: { path: '/driver/route', label: 'Rota', role: 'DRIVER', uiHints: { visibleButtons: [], activeTabs: [] } },
    message: 'vardiyalar nerde',
    authSessionId: 'm18-shift-navigation-driver-negative',
  });
  assert(driverNavigation.semanticPlan?.family === 'UI_GUIDANCE', 'DRIVER shift vocabulary remains a semantic guidance request');
  assert(driverNavigation.guidedTarget?.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED, 'DRIVER shift vocabulary does not fabricate a Vardiyalar target');
  assert((driverNavigation.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE' && item?.path === '/driver/route'), 'DRIVER shift vocabulary offers the authorized route surface');
  assert(/Rota ekranını aç/i.test(driverNavigation.reply || ''), 'DRIVER shift vocabulary explains the authorized route surface');

  const continuationSession = 'm18-shift-navigation-continuation';
  await shiftNavigationRequest('vardiyalar nerde', continuationSession);
  const shiftSurfaceContext = {
    path: '/company/shifts',
    label: 'Vardiyalar',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Detayları göster', semanticType: 'disclosure', targetKey: 'company-shifts:detaylari-goster', disabled: false }],
      activeTabs: [],
    },
  };
  const firstExpansion = await shiftNavigationRequest('Devamını anlat', continuationSession, shiftSurfaceContext);
  const secondExpansion = await shiftNavigationRequest('Devamını anlat', continuationSession, shiftSurfaceContext);
  assert(firstExpansion.semanticPlan?.continuationBasePlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'first continuation preserves the active shift navigation task');
  assert(secondExpansion.semanticPlan?.continuationBasePlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'repeated continuation preserves the active shift navigation task');
  assert(secondExpansion.semanticPlan?.continuationDepth > firstExpansion.semanticPlan?.continuationDepth, 'repeated continuation advances canonical task progress');
  assert(firstExpansion.reply !== secondExpansion.reply, 'repeated continuation does not replay the settled result');
  assert(firstExpansion.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'first continuation resolves a real current shift target');
  assert(secondExpansion.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'repeated continuation re-resolves the real current shift target');

  // A later settled data result must not replace the active guided task.  The
  // task is conversation context only; route authorization is still resolved
  // anew from the current role and screen.
  const staleSettledSession = 'm18-shift-navigation-stale-settled';
  await shiftNavigationRequest('vardiyalar nerde', staleSettledSession);
  await shiftNavigationRequest('vardiya durumları ne', staleSettledSession, shiftSurfaceContext);
  const afterDataQuestion = await shiftNavigationRequest('Devamını anlat', staleSettledSession, shiftSurfaceContext);
  const afterDataQuestionRepeat = await shiftNavigationRequest('Devamını anlat', staleSettledSession, shiftSurfaceContext);
  assert(afterDataQuestion.semanticPlan?.continuationBasePlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'a settled data answer cannot contaminate the active guided task');
  assert(afterDataQuestion.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'continuation after a data answer resolves the real current target');
  assert(afterDataQuestionRepeat.semanticPlan?.continuationBasePlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'repeated continuation after a data answer keeps the active guided task');
  assert(afterDataQuestionRepeat.semanticPlan?.continuationDepth > afterDataQuestion.semanticPlan?.continuationDepth, 'repeated continuation after a data answer advances task progress');
  assert(afterDataQuestionRepeat.reply !== afterDataQuestion.reply, 'repeated continuation after a data answer does not replay the same settled result');
  assert(afterDataQuestionRepeat.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'repeated continuation after a data answer resolves the real current target');
}

await runProductionParityRegression();

console.log(JSON.stringify({
  check: 'copilot-ui-element-anchor-and-guided-highlight-01',
  found: found.status,
  missing: missing.status,
  unauthorized: unauthorized.status,
  stale: stale.status,
  prohibited: {
    nonexistentUiGuidanceCount: missing.status === GUIDED_TARGET_STATUSES.NOT_FOUND ? 0 : 1,
    unauthorizedGuidanceCount: unauthorized.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED ? 0 : 1,
    criticalActionExecutionCount: 0,
  },
}));
