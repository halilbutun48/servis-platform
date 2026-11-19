import assert from 'node:assert/strict';
import { extractCanonicalActual } from './lib/m18HoldoutExecutionAdapter.mjs';

const payload = ({ scope, typedTask, requestTask = undefined, requestTaskType = undefined }) => ({
  semanticPlan: {
    typedRequest: typedTask ? { taskType: typedTask } : null,
    canonicalRequest: {
      operation: scope === 'OFF_TOPIC_GENUINE' ? 'GENERAL_INFORMATION' : 'EXPLAIN_CURRENT_SURFACE',
      semanticScope: { class: scope },
      semanticAction: {
        actionClass: scope === 'OFF_TOPIC_GENUINE' ? 'NONE' : 'EXPLAIN',
        objectClass: scope === 'OFF_TOPIC_GENUINE' ? null : 'SURFACE',
        resolutionStatus: scope === 'OFF_TOPIC_GENUINE' ? 'NOT_APPLICABLE' : 'RESOLVED',
      },
      ...(requestTask === undefined ? {} : { task: requestTask }),
      ...(requestTaskType === undefined ? {} : { taskType: requestTaskType }),
    },
  },
});

assert.equal(
  extractCanonicalActual(payload({ scope: 'OFF_TOPIC_GENUINE', typedTask: 'OFF_TOPIC' })).task,
  'OFF_TOPIC',
  'genuine OOS must preserve the canonical OFF_TOPIC task from typedRequest',
);

assert.equal(
  extractCanonicalActual(payload({ scope: 'PRODUCT_EXPLICIT', typedTask: 'OFF_TOPIC' })).task,
  'NONE',
  'product help using the internal OFF_TOPIC task must retain absent canonical task metadata',
);

assert.equal(
  extractCanonicalActual(payload({ scope: 'PRODUCT_EXPLICIT', typedTask: 'SCREEN_CONTEXT' })).task,
  'NONE',
  'surface guidance must retain absent canonical task metadata',
);

assert.equal(
  extractCanonicalActual(payload({ scope: 'PRODUCT_EXPLICIT', typedTask: 'CLARIFY' })).task,
  'NONE',
  'clarification without canonical task metadata must remain NONE',
);

assert.equal(
  extractCanonicalActual(payload({ scope: 'OFF_TOPIC_GENUINE', typedTask: null, requestTaskType: 'OFF_TOPIC' })).task,
  'OFF_TOPIC',
  'explicit canonical task metadata remains authoritative',
);

console.log('M18_VCD_TASK_CONTRACT_CHECK=GREEN');
