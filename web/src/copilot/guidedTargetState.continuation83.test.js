import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldNavigateGuidedTarget } from './guidedTargetState.js';

test('canonical NAVIGATE target may start a cross-route transition', () => {
  assert.equal(shouldNavigateGuidedTarget({
    status: 'FOUND',
    safeAction: 'NAVIGATE',
    identitySource: 'CANONICAL',
    screenPath: '/superadmin/operations',
  }, '/superadmin/copilot'), true);
});

test('legacy or same-route targets do not start a cross-route transition', () => {
  assert.equal(shouldNavigateGuidedTarget({
    status: 'FOUND',
    safeAction: 'NAVIGATE',
    identitySource: 'LEGACY_LABEL',
    screenPath: '/superadmin/operations',
  }, '/superadmin/copilot'), false);
  assert.equal(shouldNavigateGuidedTarget({
    status: 'FOUND',
    safeAction: 'NAVIGATE',
    identitySource: 'CANONICAL',
    screenPath: '/superadmin/copilot',
  }, '/superadmin/copilot'), false);
});
