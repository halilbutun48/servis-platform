import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveIncomingCopilotScreenContext } from './service.js';

const driver = { role: 'DRIVER', companyKind: '', id: 9 };

test('full-screen driver copilot rebinds to an authorized live source surface', () => {
  const context = resolveIncomingCopilotScreenContext({
    user: driver,
    entityType: 'screen',
    entityId: 3105,
    screenContext: {
      id: 3105,
      path: '/driver/copilot',
      sourcePath: '/driver/route',
      selectedEntityType: 'shift',
      selectedEntityId: 29,
    },
  });

  assert.equal(context.path, '/driver/route');
  assert.equal(context.selectedEntityType, 'shift');
  assert.equal(context.selectedEntityId, 29);
});

test('full-screen copilot ignores a cross-role source surface', () => {
  const context = resolveIncomingCopilotScreenContext({
    user: driver,
    entityType: 'screen',
    entityId: 3105,
    screenContext: {
      id: 3105,
      path: '/driver/copilot',
      sourcePath: '/room/map',
      selectedEntityType: 'vehicle',
      selectedEntityId: 3,
    },
  });

  assert.equal(context.path, '/driver/copilot');
  assert.equal(context.selectedEntityType, 'vehicle');
  assert.equal(context.selectedEntityId, 3);
});
