#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { executeSemanticQueryPlan } from '../src/services/queryPlanExecutor.js';
import { resolveCopilotGuidedTarget } from '../src/ai/chat/copilotUiElementAnchor.js';

const user = { id: 980002, role: 'ROOM', roomId: 1, companyKind: 'ROOM' };
const screenContext = {
  path: '/room/offers',
  label: 'Teklifler',
  role: 'ROOM',
  selectedEntityType: 'offer',
  selectedEntityId: 37,
  selectedLabel: 'Teklif #37',
  uiHints: {
    semanticElements: [{
      label: 'Teklif #37',
      targetKey: 'room:offers:offer:37',
      semanticId: 'product:room:offer:37',
      identitySource: 'CANONICAL',
      semanticType: 'section',
      source: 'LIVE_UI',
    }],
  },
};

const noteFixtures = {
  noteCompany: 'AUTHORIZED_SERVICE_BUYER_NOTE',
  noteRoom: 'AUTHORIZED_CARRIER_NOTE',
};

function planFor(message, context = screenContext) {
  const request = resolveCanonicalConversationRequest({
    message,
    user,
    selectedEntity: context.selectedEntityId
      ? { type: 'OFFER', id: context.selectedEntityId }
      : null,
    screenContext: context,
  });
  const plan = resolveSemanticIntent({
    message,
    user,
    selectedEntity: context.selectedEntityId
      ? { type: 'OFFER', id: context.selectedEntityId }
      : null,
    screenContext: context,
    canonicalRequest: request,
  });
  return { request, plan };
}

async function execute(message, context = screenContext) {
  const { request, plan } = planFor(message, context);
  const execution = await executeSemanticQueryPlan({
    plan,
    allowedDomains: ['OFFERS'],
    readDomain: async (domain, { entities }) => ({
      domain,
      count: entities.length,
      facts: entities.map((entity) => ({
        id: entity.id,
        offerId: entity.id,
        noteCompany: noteFixtures.noteCompany,
        noteRoom: noteFixtures.noteRoom,
      })),
    }),
  });
  return { request, plan, execution };
}

const companyImperative = await execute('Hizmet Alan Firmanın bıraktığı açıklamayı göster.');
assert.equal(companyImperative.request.canonicalShape.taskType, 'FIELD_LOOKUP');
assert.equal(companyImperative.plan.typedRequest?.taskType, 'FIELD_LOOKUP');
assert.ok(companyImperative.plan.entities?.some((entity) => entity.type === 'offer' && Number(entity.id) === 37));
assert.ok(companyImperative.plan.requestedFields.some((field) => field.key === 'NOTE_COMPANY'));
assert.equal(companyImperative.execution.status, 'RESOLVED');
assert.match(companyImperative.execution.reply, /AUTHORIZED_SERVICE_BUYER_NOTE/);
const companyTarget = resolveCopilotGuidedTarget({
  user,
  screenContext,
  semanticPlan: { ...companyImperative.plan, canonicalRequest: companyImperative.request.request },
  message: 'Hizmet Alan Firmanın bıraktığı açıklamayı göster.',
});
assert.equal(companyTarget.status, 'FOUND');
assert.equal(companyTarget.targetKey, 'room:offers:offer:37');
assert.equal(companyTarget.identitySource, 'CANONICAL');

const companyQuestion = await execute('Bu teklifin hizmet alan firma notu ne?');
assert.equal(companyQuestion.plan.typedRequest?.taskType, 'FIELD_LOOKUP');
assert.ok(companyQuestion.plan.requestedFields.some((field) => field.key === 'NOTE_COMPANY'));
assert.equal(companyQuestion.execution.status, 'RESOLVED');
assert.match(companyQuestion.execution.reply, /AUTHORIZED_SERVICE_BUYER_NOTE/);

const carrierImperative = await execute('Taşımacılık firmasının açıklamasını göster.');
assert.equal(carrierImperative.plan.typedRequest?.taskType, 'FIELD_LOOKUP');
assert.ok(carrierImperative.plan.requestedFields.some((field) => field.key === 'NOTE_ROOM'));
assert.equal(carrierImperative.execution.status, 'RESOLVED');
assert.match(carrierImperative.execution.reply, /AUTHORIZED_CARRIER_NOTE/);

const noSelection = await execute('Bu teklifin hizmet alan firma notu ne?', {
  ...screenContext,
  selectedEntityType: '',
  selectedEntityId: null,
  selectedLabel: '',
});
assert.notEqual(noSelection.plan.entity?.id, 37);
assert.doesNotMatch(noSelection.execution.reply, /AUTHORIZED_SERVICE_BUYER_NOTE/);

console.log('WP-05 offer-note semantic/GÖSTER regression: PASS');
