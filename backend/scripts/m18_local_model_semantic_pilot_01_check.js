import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import {
  LOCAL_MODEL_PROPOSAL_VERSION,
  applyLocalSemanticProposal,
  buildLocalSemanticProposalPrompt,
  isLocalSemanticProposalEnabled,
  requestLocalSemanticProposal,
  validateLocalSemanticProposal,
} from '../src/ai/chat/localSemanticProposal.js';

const enabledEnv = {
  SEFER_ABI_LOCAL_MODEL_ENABLED: '1',
  LOCAL_MAINTENANCE_MODE: '1',
  LOCAL_MAINTENANCE_SCOPE: 'DEMO_FIXTURE_ONLY',
  SEFER_ABI_LOCAL_MODEL_URL: 'http://127.0.0.1:8081',
};

assert.equal(isLocalSemanticProposalEnabled({ env: {} }), false, 'local model must be off by default');
assert.equal(isLocalSemanticProposalEnabled({ env: enabledEnv }), true, 'maintenance-only flag must enable the pilot');

let disabledFetchCalled = false;
const disabledAdapter = await requestLocalSemanticProposal({
  message: 'sentetik vardiya sorgusu',
  env: {},
  fetchImpl: async () => { disabledFetchCalled = true; return { ok: true, json: async () => ({}) }; },
});
assert.equal(disabledAdapter.status, 'DISABLED');
assert.equal(disabledFetchCalled, false, 'disabled pilot must not make any model request');

const validProposal = {
  version: LOCAL_MODEL_PROPOSAL_VERSION,
  taskType: 'FIELD_LOOKUP',
  entityType: 'SHIFT',
  explicitEntityRefs: [{ type: 'SHIFT', id: 211 }],
  requestedFields: ['SERVICE_BUYER_AMOUNT', 'CARRIER_AMOUNT', 'AGREEMENT_COMPANY_OFFER_AMOUNT'],
  ambiguity: 'NONE',
  confidence: 0.9,
};
const validation = validateLocalSemanticProposal(validProposal);
assert.equal(validation.valid, true, 'valid advisory proposal must validate');
assert.equal(validation.proposal.authority, 'ADVISORY', 'proposal must remain advisory');
assert.equal(validation.proposal.safety.writeBoundary, 'NO_BUSINESS_WRITE', 'proposal must not authorize writes');

const unsafeProposal = validateLocalSemanticProposal({
  ...validProposal,
  explicitEntityRefs: [{ type: 'OFFER', id: 211 }],
  requestedFields: ['UNKNOWN_SECRET_FIELD'],
});
assert.equal(unsafeProposal.valid, false, 'unsupported or mismatched proposal must be rejected');

const prompt = buildLocalSemanticProposalPrompt({
  message: '211 numaralı vardiyanın teklif ve kabul edilen bedellerini özetle',
  screenContext: { path: '/', role: 'ROOM', selectedEntityType: null, selectedEntityId: null },
});
assert.match(prompt.system, /JSON/i, 'model prompt must require JSON');
assert.match(prompt.system, /yetki|authorization/i, 'model prompt must forbid authorization decisions');

const baseShape = {
  taskType: 'CLARIFY',
  ambiguity: 'NUMERIC_REFERENT_TYPE_UNRESOLVED',
  domain: null,
  targetEntityType: null,
  requestedFields: [],
  normalizedText: '211 numarali vardiyanin teklif ve kabul edilen bedellerini ozetle',
};
const enriched = applyLocalSemanticProposal({
  shape: baseShape,
  proposal: validation.proposal,
  message: '211 numaralı vardiyanın teklif ve kabul edilen bedellerini özetle',
});
assert.equal(enriched.taskType, 'FIELD_LOOKUP', 'safe advisory must enrich an unresolved request');
assert.deepEqual(enriched.explicitEntityReference, { type: 'SHIFT', id: 211, source: 'LOCAL_MODEL_ADVISORY' });
assert.deepEqual(enriched.requestedFields, [
  { key: 'SERVICE_BUYER_AMOUNT', domain: 'OFFERS' },
  { key: 'CARRIER_AMOUNT', domain: 'OFFERS' },
  { key: 'AGREEMENT_COMPANY_OFFER_AMOUNT', domain: 'AGREEMENTS' },
]);

const rejectedEnrichment = applyLocalSemanticProposal({
  shape: baseShape,
  proposal: validation.proposal,
  message: '211 için ticari bilgileri özetle',
});
assert.equal(rejectedEnrichment, baseShape, 'untyped numeric reference must remain unresolved');

const offerNumberProposal = validateLocalSemanticProposal({
  ...validProposal,
  entityType: 'OFFER',
  explicitEntityRefs: [{ type: 'OFFER', id: 211 }],
});
assert.equal(offerNumberProposal.valid, true);
assert.equal(applyLocalSemanticProposal({
  shape: baseShape,
  proposal: offerNumberProposal.proposal,
  message: '211 için hangi teklif kabul edildi?',
}), baseShape, 'model must not reinterpret a relation number as an offer id');

const adapterResult = await requestLocalSemanticProposal({
  message: '211 numaralı vardiyanın teklif ve kabul edilen bedellerini özetle',
  screenContext: { path: '/', role: 'ROOM' },
  env: enabledEnv,
  fetchImpl: async (url, request) => {
    assert.equal(new URL(url).hostname, '127.0.0.1', 'proposal adapter must stay on loopback');
    assert.equal(request.method, 'POST');
    const body = JSON.parse(request.body);
    assert.match(body.prompt, /<\|im_start\|>system/);
    assert.match(body.prompt, /<\|im_start\|>assistant/);
    assert.equal(body.json_schema.type, 'object');
    assert.equal(body.stream, false);
    return {
      ok: true,
      json: async () => ({ content: JSON.stringify(validProposal) }),
    };
  },
});
assert.equal(adapterResult.status, 'VALID', 'local adapter must accept only a validated JSON proposal');
assert.equal(adapterResult.proposal.authority, 'ADVISORY');

const canonical = resolveCanonicalConversationRequest({
  message: '211 numaralı vardiyanın teklif ve kabul edilen bedellerini özetle',
  user: { id: 980002, role: 'ROOM', roomId: 1 },
  screenContext: { path: '/', role: 'ROOM' },
  localSemanticProposal: adapterResult.proposal,
});
assert.equal(canonical.validation.status, 'VALID');
assert.deepEqual(canonical.request.candidateEntityRefs, [
  { type: 'SHIFT', id: 211, source: 'EXPLICIT_QUERY' },
]);
assert.deepEqual(canonical.request.requestedFields, [
  'SERVICE_BUYER_AMOUNT',
  'CARRIER_AMOUNT',
  'AGREEMENT_COMPANY_OFFER_AMOUNT',
]);
assert.equal(canonical.request.safety.writeBoundary, 'NO_BUSINESS_WRITE');

console.log('M18 LOCAL MODEL SEMANTIC PILOT CHECK: PASS');
