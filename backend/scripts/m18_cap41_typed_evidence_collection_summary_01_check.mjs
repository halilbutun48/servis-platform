#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';

const user = { id: 4, role: 'ROOM', roomId: 1, companyKind: 'DEMO' };
const env = { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY: 'NEW' };

function agreementScreen(selectedId = 184) {
  return {
    id: 1106,
    path: '/room/agreements',
    label: 'Sözleşmeler',
    role: 'ROOM',
    selectedEntityType: selectedId ? 'agreement' : null,
    selectedEntityId: selectedId,
    selectedLabel: selectedId ? `Sözleşme ID ${selectedId}` : '',
    uiHints: { activeTabs: ['bridge'] },
  };
}

function resolve(message, selectedId = 184) {
  return resolveCanonicalConversationRequest({
    message,
    user,
    screenContext: agreementScreen(selectedId),
    env,
  });
}

const collectionMessages = [
  'Tüm sözleşmelerin durumlarını özetle.',
  'Tüm sözleşmelerin statülerini özetler misin?',
  'Bütün anlaşmaların durumlarını özetle.',
];

try {
  const collection = collectionMessages.map((message) => ({
    message,
    result: resolve(message),
  }));
  const detail = resolve('Bu sözleşmenin durumu ne?');

  for (const { message, result } of collection) {
    assert.equal(result.validation?.status, 'VALID', `${message}: canonical request must be valid`);
    assert.equal(result.failureClass, null, `${message}: typed evidence must not fail internally`);
    assert.equal(result.canonicalShape?.taskType, 'COUNT', `${message}: collection request must be COUNT`);
    assert.equal(result.canonicalShape?.domain, 'AGREEMENTS', `${message}: domain must be AGREEMENTS`);
    assert.equal(result.canonicalShape?.collectionSummaryIntent, true, `${message}: collection summary must be preserved`);
    assert.equal(result.canonicalShape?.targetEntityType, 'AGREEMENT', `${message}: target must be AGREEMENT`);
    assert.equal(result.canonicalShape?.scopeTarget, 'CURRENT_SCREEN', `${message}: scope must remain current screen`);
    assert.equal(result.request?.candidateEntityRefs?.length, 0, `${message}: incidental selection must not scope collection`);
  }

  assert.equal(detail.canonicalShape?.taskType, 'FIELD_LOOKUP', 'selected detail must remain FIELD_LOOKUP');
  assert.equal(detail.request?.candidateEntityRefs?.length, 1, 'selected detail must retain one authorized record reference');

  console.log(JSON.stringify({ status: 'PASS', collection, detail }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'FAIL', error: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
}
