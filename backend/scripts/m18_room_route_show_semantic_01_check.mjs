#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  resolveCopilotGuidedTarget,
  GUIDED_TARGET_STATUSES,
} from '../src/ai/chat/copilotUiElementAnchor.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { runCopilotFoundation } from '../src/ai/service.js';

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = 'NEW';

const user = { role: 'ROOM', roomId: 1 };

function roomRouteScreen(selectedId = 168, { selected = true } = {}) {
  return {
    path: '/room/shifts',
    label: 'Vardiyalar',
    role: 'ROOM',
    ...(selected ? {
      selectedEntity: { type: 'shift', id: selectedId },
      selectedEntityType: 'shift',
      selectedEntityId: selectedId,
      selectedLabel: `Vardiya ${selectedId}`,
    } : {}),
    uiHints: {
      visibleButtons: [
        {
          label: 'Rota Önizleme',
          semanticType: 'button',
          targetKey: `room-shifts:shift:${selectedId}:route-preview`,
          disabled: false,
          identitySource: 'CANONICAL',
        },
      ],
    },
  };
}

function canonical(message, screenContext) {
  return resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState: null,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
}

const directShow = canonical('Rotasını göster', roomRouteScreen());
assert.equal(directShow.request.operation, 'VIEW_AUTHORIZED_SURFACE');
assert.equal(directShow.request.semanticAction.actionClass, 'VIEW');
assert.equal(directShow.request.semanticAction.objectClass, 'ROUTE');
assert.equal(directShow.canonicalShape.currentTargetReference.targetKey, 'room-shifts:shift:168:route-preview');

const wherePreview = canonical('Rota önizleme nerede?', roomRouteScreen());
assert.equal(wherePreview.request.operation, 'LOOK_UP_FIELD');
assert.equal(wherePreview.request.semanticAction.actionClass, 'EXPLAIN');
assert.equal(wherePreview.request.semanticAction.objectClass, 'ROUTE');
assert.equal(wherePreview.canonicalShape.currentTargetReference.targetKey, 'room-shifts:shift:168:route-preview');

const selectedShiftVehicleRelation = canonical('Bu vardiyanın aracı nerede?', {
  ...roomRouteScreen(),
  selectedEntity: { type: 'shift', id: 168, vehicleId: 3 },
});
assert.equal(selectedShiftVehicleRelation.request.operation, 'LOOK_UP_RELATION', 'selected shift vehicle question must be a relation lookup');
assert.equal(selectedShiftVehicleRelation.canonicalShape.taskType, 'RELATION_LOOKUP', 'selected shift vehicle question must preserve relation task');
assert.equal(selectedShiftVehicleRelation.canonicalShape.targetEntityType, 'VEHICLE', 'selected shift vehicle question must resolve the vehicle relation');
assert.equal(selectedShiftVehicleRelation.canonicalShape.relationIntent, true, 'selected shift vehicle question must carry relation intent');

const whereResponse = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 1103,
  user: { id: 882168, role: 'ROOM', roomId: 1 },
  message: 'Rota önizleme nerede?',
  screenContext: { id: 1103, ...roomRouteScreen(), uiHints: roomRouteScreen().uiHints },
  authSessionId: 'm18-room-route-show-anlat',
});
assert.equal(whereResponse.guidedTarget?.status, GUIDED_TARGET_STATUSES.FOUND);
assert.equal(whereResponse.guidedTarget?.targetKey, 'room-shifts:shift:168:route-preview');
assert.match(String(whereResponse.reply || ''), /Rota ve durakları haritada önizle|Rota Önizleme/iu, 'route explanation names the resolved target');

const noSelectedContext = canonical('Rotasını göster', roomRouteScreen(168, { selected: false }));
assert.equal(noSelectedContext.canonicalShape.currentTargetReference, undefined);

const unauthorized = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: roomRouteScreen(),
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
assert.equal(unauthorized.status, GUIDED_TARGET_STATUSES.UNAUTHORIZED);

const stale = resolveCopilotGuidedTarget({
  user,
  screenContext: roomRouteScreen(169),
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
assert.equal(stale.status, GUIDED_TARGET_STATUSES.NOT_FOUND);

const operationEventsScreen = {
  ...roomRouteScreen(),
  uiHints: {
    visibleButtons: [{
      label: 'İşlem Kaydı',
      semanticType: 'button',
      targetKey: 'room-shifts:shift:168:operation-events',
      disabled: false,
      identitySource: 'CANONICAL',
    }],
  },
};
const operationEvents = resolveCopilotGuidedTarget({
  user,
  screenContext: operationEventsScreen,
  message: 'İşlem kaydını göster',
  semanticPlan: {
    family: 'UI_GUIDANCE',
    explicitUiGuidance: true,
    currentTargetReference: {
      targetKind: 'CONTROL',
      targetKey: 'room-shifts:shift:168:operation-events',
      label: 'İşlem Kaydı',
      semanticType: 'button',
      screenPath: '/room/shifts',
    },
  },
});
assert.equal(operationEvents.status, GUIDED_TARGET_STATUSES.FOUND);
assert.equal(operationEvents.targetKey, 'room-shifts:shift:168:operation-events');

const reassignmentScreen = {
  ...roomRouteScreen(),
  uiHints: {
    visibleButtons: [{
      label: 'Atamayı Değiştir',
      semanticType: 'button',
      targetKey: 'room-shifts:shift:168:reassign',
      disabled: false,
      identitySource: 'CANONICAL',
    }],
  },
};
const reassignment = resolveCopilotGuidedTarget({
  user,
  screenContext: reassignmentScreen,
  message: 'Atama değişikliğini göster',
  semanticPlan: {
    family: 'UI_GUIDANCE',
    explicitUiGuidance: true,
    currentTargetReference: {
      targetKind: 'CONTROL',
      targetKey: 'room-shifts:shift:168:reassign',
      label: 'Atamayı Değiştir',
      semanticType: 'button',
      screenPath: '/room/shifts',
    },
  },
});
assert.equal(reassignment.status, GUIDED_TARGET_STATUSES.FOUND);
assert.equal(reassignment.targetKey, 'room-shifts:shift:168:reassign');

console.log(JSON.stringify({
  check: 'M18_ROOM_ROUTE_SHOW_SEMANTIC',
  status: 'GREEN',
  cases: {
    directShow: 'VIEW_AUTHORIZED_SURFACE/VIEW/ROUTE',
    wherePreview: 'LOOK_UP_FIELD/EXPLAIN/ROUTE',
    missingContext: 'REJECTED',
    wrongTenantRole: unauthorized.status,
    staleRecord: stale.status,
    operationEvents: operationEvents.status,
    reassignment: reassignment.status,
  },
}, null, 2));
