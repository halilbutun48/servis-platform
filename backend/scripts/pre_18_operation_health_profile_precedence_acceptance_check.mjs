#!/usr/bin/env node

import { detectOperationHealthSurface, buildOperationHealthState } from '../src/ai/chat/conversationOperationHealthEngine.js';
import { buildAuthorizedReasoningAnswer } from '../src/services/authorizedProductAwareness.js';

const cases = [
  {
    label: 'company exact operations path selects company profile for open-request question',
    expected: 'COMPANY_OPERATIONS',
    build: () => buildOperationHealthState({
      message: 'Açık talep var mı?',
      questionType: 'STATUS_HELP',
      userRole: 'COMPANY',
      user: { role: 'COMPANY' },
      screenPath: '/company/operations',
      screenDefinition: {
        path: '/company/operations',
        label: 'Operasyon Paneli',
        menuPurpose: 'Açık talepleri ve operasyon durumunu gösterir.',
      },
    }).surfaceKey,
  },
  {
    label: 'company exact path beats colliding super-admin visible text',
    expected: 'COMPANY_OPERATIONS',
    build: () => detectOperationHealthSurface({
      userRole: 'COMPANY',
      user: { role: 'COMPANY' },
      screenPath: '/company/operations',
      screenDefinition: {
        path: '/company/operations',
        label: 'Operasyon Paneli',
        menuPurpose: 'Operasyon sağlığı ve açık talep görünürlüğü.',
      },
    }).key,
  },
  {
    label: 'super-admin exact operations path remains super-admin profile',
    expected: 'SUPERADMIN_OPERATIONS',
    build: () => detectOperationHealthSurface({
      userRole: 'SUPER_ADMIN',
      user: { role: 'SUPER_ADMIN' },
      screenPath: '/superadmin/operations',
      screenDefinition: { path: '/superadmin/operations', label: 'Operasyon Paneli' },
    }).key,
  },
  {
    label: 'same-role visible fallback remains available when no exact path exists',
    expected: 'COMPANY_OPERATIONS',
    build: () => detectOperationHealthSurface({
      userRole: 'COMPANY',
      user: { role: 'COMPANY' },
      screenPath: '/company/legacy-operations',
      screenDefinition: { label: 'Şirket Operasyonları', menuPurpose: 'Açık talepler' },
    }).key,
  },
  {
    label: 'company role cannot select foreign super-admin exact path profile',
    expected: 'GENERIC',
    build: () => detectOperationHealthSurface({
      userRole: 'COMPANY',
      user: { role: 'COMPANY' },
      screenPath: '/superadmin/operations',
      screenDefinition: { path: '/superadmin/operations', label: 'Operasyon Paneli' },
    }).key,
  },
  {
    label: 'unknown path with no valid profile preserves generic fallback',
    expected: 'GENERIC',
    build: () => detectOperationHealthSurface({
      userRole: 'COMPANY',
      user: { role: 'COMPANY' },
      screenPath: '/company/unknown-surface',
      screenDefinition: { path: '/company/unknown-surface', label: 'Bilinmeyen ekran' },
    }).key,
  },
];

let passCount = 0;
const failures = [];

for (const testCase of cases) {
  const actual = testCase.build();
  if (actual === testCase.expected) {
    passCount += 1;
    process.stdout.write(`PASS ${testCase.label}\n`);
    continue;
  }
  failures.push(testCase.label);
  process.stdout.write(`FAIL ${testCase.label}: expected ${testCase.expected}, got ${actual}\n`);
}

process.stdout.write(`OPERATION_HEALTH_PROFILE_PRECEDENCE_CASES=${cases.length}\n`);
process.stdout.write(`OPERATION_HEALTH_PROFILE_PRECEDENCE_PASS=${passCount}\n`);
process.stdout.write(`OPERATION_HEALTH_PROFILE_PRECEDENCE_FAIL=${failures.length}\n`);
if (failures.length > 0) process.exitCode = 1;

const staleSelectionAnswer = await buildAuthorizedReasoningAnswer({
  user: { id: 980002, role: 'ROOM', roomId: 1, companyId: null, companyKind: 'ROOM' },
  message: 'Bu ekrandaki açık sorunları açıkla.',
  screenContext: {
    id: 1114,
    path: '/room/operation-health',
    label: 'Operasyon Sağlığı',
    role: 'ROOM',
    selectedEntityType: 'screen',
    selectedEntityId: 1114,
    selectedRecordStatus: 'Kayıt #1 için durum: yetkili kayıtta yok.',
    structuredFacts: {
      summary: 'Operasyon sağlığı özetinde üç açık sorun görünüyor.',
      counters: { activeDrivers: 4, riskyDevices: 1, staleOrOffline: 2, openIssues: 3 },
    },
  },
});
if (!/Açık sorun[^0-9]*3/i.test(String(staleSelectionAnswer?.reply || ''))
  || /Kayıt #1/i.test(String(staleSelectionAnswer?.reply || ''))) {
  console.error('FAIL operation-health current issue evidence must beat stale selected-record text');
  process.exitCode = 1;
} else {
  console.log('PASS operation-health current issue evidence beats stale selected-record text');
}
