#!/usr/bin/env node

import { detectOperationHealthSurface, buildOperationHealthState } from '../src/ai/chat/conversationOperationHealthEngine.js';

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
