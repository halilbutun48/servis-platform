#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';

const scenarios = [
  { role: 'ROOM', user: { role: 'ROOM', roomId: 1 }, path: '/room', label: 'Taşımacılık Firması Merkezi', expectedOperation: 'OPEN_EXISTING_SHIFT_OPERATIONS', expectedNative: 'AUTHORIZED' },
  { role: 'COMPANY', user: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 }, path: '/company', label: 'Planlama Merkezi', expectedOperation: 'CREATE_SHIFT', expectedNative: 'AUTHORIZED' },
  { role: 'SCHOOL', user: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 }, path: '/school/operations', label: 'Okul Operasyon Paneli', expectedOperation: 'CREATE_SHIFT', expectedNative: 'DENIED' },
  { role: 'ORGANIZATION', user: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 }, path: '/organization', label: 'Organizasyon Merkezi', expectedOperation: 'CREATE_SHIFT', expectedNative: 'DENIED' },
  { role: 'DRIVER', user: { role: 'DRIVER', companyId: 1 }, path: '/driver/today', label: 'Sürücü Merkezi', expectedOperation: 'CREATE_SHIFT', expectedNative: 'DENIED' },
  { role: 'PERSONEL', user: { role: 'PERSONEL', companyId: 1 }, path: '/personel/live', label: 'Personel Merkezi', expectedOperation: 'CREATE_SHIFT', expectedNative: 'DENIED' },
  { role: 'PARENT', user: { role: 'PARENT' }, path: '/parent/live', label: 'Veli Merkezi', expectedOperation: 'CREATE_SHIFT', expectedNative: 'DENIED' },
  { role: 'SUPER_ADMIN', user: { role: 'SUPER_ADMIN' }, path: '/superadmin', label: 'Sistem Yönetimi', expectedOperation: 'CREATE_SHIFT', expectedNative: 'AUTHORIZED' },
];

const promptFor = (role) => `Yeni bir vardiya oluşturmak istiyorum; ${role} rolüyle oluşturma yetkim var mı?`;

const rows = [];
for (const scenario of scenarios) {
  const result = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: scenario.user,
    screenContext: { path: scenario.path, label: scenario.label, role: ['SCHOOL', 'ORGANIZATION'].includes(scenario.role) ? 'COMPANY' : scenario.role },
    message: promptFor(scenario.role),
    authSessionId: `m18-gov001-create-auth-${scenario.role.toLowerCase()}`,
  });
  const plan = result?.semanticPlan || {};
  const request = plan?.canonicalRequest || {};
  const actual = {
    requestMode: request?.typedEvidence?.requestMode?.value || request?.typedEvidence?.requestMode || request?.requestMode || null,
    action: request?.semanticAction?.actionClass || null,
    operation: request?.operation || plan?.operation || null,
    authorizationStatus: plan?.authorizationDecision?.authorizationStatus || null,
    reply: String(result?.reply || ''),
    businessWriteExecution: Number(result?.counters?.observed?.businessWriteExecution || 0),
  };
  assert.equal(actual.requestMode, 'EXPLAIN', `${scenario.role}: capability question keeps EXPLAIN request mode`);
  assert.equal(actual.action, 'CREATE', `${scenario.role}: desired operation remains CREATE action`);
  assert.equal(actual.operation, scenario.expectedOperation, `${scenario.role}: canonical operation boundary`);
  assert.equal(actual.authorizationStatus, scenario.expectedNative, `${scenario.role}: canonical authorization status`);
  assert.equal(actual.businessWriteExecution, 0, `${scenario.role}: no business write`);
  if (scenario.role === 'ROOM') assert.match(actual.reply, /yeni vardiya veya talep kaydı oluşturulmaz/iu, 'ROOM create boundary remains visible');
  if (['SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT'].includes(scenario.role)) assert.doesNotMatch(actual.reply, /Vardiya oluşturma akışında 1\. adım/iu, `${scenario.role}: denied role does not enter create workflow`);
  rows.push({ role: scenario.role, expected: scenario, actual: { ...actual, reply: undefined } });
}

console.log(JSON.stringify({ status: 'PASS', cases: rows.length, businessWriteExecution: 0, rows }, null, 2));
