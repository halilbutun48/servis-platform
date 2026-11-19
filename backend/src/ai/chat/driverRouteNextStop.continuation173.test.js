import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from './canonicalSemanticRequest.js';
import { resolveSemanticIntent, toPublicQuestionType } from './semanticIntentPlanner.js';
import { buildChatHelpResponse } from './helpComposer.js';

const user = { id: 2, role: 'DRIVER', companyId: 1 };

const selectedFields = [
  { label: 'Vardiya', value: '#29' },
  { label: 'Araç', value: '34 ABC 125' },
  { label: 'Son konum bilgisi', value: '11 sa önce' },
  { label: 'Sıradaki durak', value: 'Dropoff 1' },
  { label: 'Tahmini varış süresi', value: 'hesaplanamıyor' },
];

const routeContext = {
  path: '/driver/route',
  selectedEntityType: 'shift',
  selectedEntityId: '29',
  contextSummary: 'Vardiya #29 • Rota • Araç: 34 ABC 125 • Son GPS/konum: 11 sa önce • Sıradaki durak: Dropoff 1 • Tahmini süre: hesaplanamıyor',
  selectedSummary: 'Vardiya #29 • Rota • Araç: 34 ABC 125 • Son GPS/konum: 11 sa önce • Sıradaki durak: Dropoff 1 • Tahmini süre: hesaplanamıyor',
  selectedFields,
};

function canonical(message, screenContext = routeContext) {
  return resolveCanonicalConversationRequest({ message, user, screenContext });
}

function ask(message, screenContext = routeContext, sourceScreenContext = null) {
  return buildChatHelpResponse({
    entityType: 'shift',
    entityId: 29,
    user,
    message,
    screenContext,
    sourceScreenContext,
  });
}

test('selected next-stop lookup remains a read-only route field lookup', () => {
  const request = canonical('Sıradaki durak ne?');
  const plan = resolveSemanticIntent({
    message: 'Sıradaki durak ne?',
    user,
    screenContext: routeContext,
    canonicalRequest: request,
  });

  assert.equal(request.request.operation, 'LOOK_UP_FIELD');
  assert.equal(request.request.safety.actionPolicy, 'READ_ONLY');
  assert.equal(plan.family, 'ENTITY_LOOKUP');
  assert.equal(toPublicQuestionType(plan), 'LOCATION_HELP');
});

test('driver route reply states the visible next stop and stale GPS boundary', () => {
  const result = ask('Sıradaki durak ne?');

  assert.match(result.reply, /Dropoff 1/);
  assert.match(result.reply, /Son bilinen sıradaki durak/i);
  assert.match(result.reply, /Tahmini varış süresi hesaplanamıyor/i);
  assert.doesNotMatch(result.reply, /Rota ekranındasın/i);
  assert.doesNotMatch(result.reply, /İlk güvenli adım: Önce sıradaki durağı kontrol et/i);
});

test('full-screen copilot keeps the source route selection for the same lookup', () => {
  // The full-screen route carries the originating scope in the query and
  // posts that authorized source route as its screen context.  Keep that
  // contract here instead of inventing a second `/copilot` data surface.
  const fullScreenContext = { ...routeContext, uiSurface: { mode: 'FULL_SCREEN_COPILOT' } };
  const result = ask('Sıradaki durak ne?', fullScreenContext);

  assert.match(result.reply, /Dropoff 1/);
  assert.match(result.reply, /Vardiya #29/);
  assert.doesNotMatch(result.reply, /başka bir vardiya|seçili kayıt bulunamadı/i);
});

test('next-stop action wording remains an action request', () => {
  const request = canonical('Sıradaki durak için ne yapmalıyım?');

  assert.equal(request.request.operation, 'RESOLVE_NEXT_SAFE_ACTION');
  assert.equal(request.request.capability, 'NEXT_ACTION');
  assert.equal(request.request.safety.actionPolicy, 'SAFE_UI_ONLY');
});
