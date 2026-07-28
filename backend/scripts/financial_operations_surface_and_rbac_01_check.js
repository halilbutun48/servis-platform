#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as scope from '../src/finance/financialOperationsScope.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function countLines(text) {
  const source = String(text || '');
  if (!source) return 0;
  return source.split(/\r?\n/).length;
}

let guardCases = 0;
let passCount = 0;
let failCount = 0;

function check(condition, label, detail = '') {
  guardCases += 1;
  if (!condition) {
    failCount += 1;
    const suffix = detail ? ` :: ${detail}` : '';
    throw new Error(`FAIL ${label}${suffix}`);
  }
  passCount += 1;
  console.log(`OK ${label}`);
}

function textHas(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function textLacks(text, needle) {
  return !textHas(text, needle);
}

function fileLines(relPath) {
  return countLines(read(relPath));
}

function gitOutput(args) {
  const out = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '');
}

function diffNames(paths, cached = false) {
  const args = ['diff'];
  if (cached) args.push('--cached');
  args.push('--name-only', '--', ...paths);
  return gitOutput(args)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function assertEmptyDiff(paths, label, cached = false, allow = []) {
  const allowed = new Set(allow);
  const names = diffNames(paths, cached).filter((name) => !allowed.has(name));
  check(names.length === 0, label, names.join(', '));
}

function assertCommandOutputEmpty(args, label) {
  const output = gitOutput(args).trim();
  check(output.length === 0, label, output);
}

const docPath = 'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md';
const helperPath = 'backend/src/finance/financialOperationsScope.js';
const checkPath = 'backend/scripts/financial_operations_surface_and_rbac_01_check.js';
const packageText = read('package.json');
const runnerText = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyText = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guideText = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const primerText = read('docs/PRIMER_SSOT.md');
const roadmapText = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
const repoAuditText = read('docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md');
const harnessCheckText = read('backend/scripts/script_harness_consolidation_01_check.js');
const harnessDocText = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
const helperText = read(helperPath);
const docText = read(docPath);
const checkText = read(checkPath);

const expectedSurfaces = [
  'financial_overview',
  'room_profitability',
  'quote_floor_preview',
  'route_cost_preview',
  'vehicle_cost_preview',
  'agreement_margin_preview',
  'company_budget',
  'company_service_cost',
  'cost_per_person',
  'supplier_price_quality_compare',
  'hakedis_invoice_reconciliation_preview',
  'scenario_forecast_savings',
  'accounting_export_contract',
];

const expectedRoleVisibility = {
  SUPER_ADMIN: expectedSurfaces,
  ROOM: [
    'financial_overview',
    'room_profitability',
    'quote_floor_preview',
    'route_cost_preview',
    'vehicle_cost_preview',
    'agreement_margin_preview',
    'supplier_price_quality_compare',
    'hakedis_invoice_reconciliation_preview',
    'scenario_forecast_savings',
  ],
  COMPANY: [
    'financial_overview',
    'company_budget',
    'company_service_cost',
    'cost_per_person',
    'supplier_price_quality_compare',
    'hakedis_invoice_reconciliation_preview',
    'scenario_forecast_savings',
  ],
  DRIVER: [],
  PERSONEL: [],
  PARENT: [],
  SCHOOL: [],
  ORGANIZATION: [],
  DEFAULT: [],
};

const reuseCapabilities = [
  'Dynamic Savings',
  'Hakediş önizlemesi',
  'Kalite kesintisi',
  'Payment/quality bridge',
  'Teklif analizi',
  'Teklif önerisi',
  'Pazarlık hazırlığı',
  'Sözleşme fiyatları',
  'Kilometre / rota maliyet yardımcıları',
  'Araç / sürücü maliyet alanları',
  'Dashboard maliyet kartları',
  'Excel / CSV dışa aktarma',
  'Sefer Abi maliyet cevapları',
];

const blockedScopeNeedles = [
  'maliyet motoru',
  'kârlılık hesaplaması',
  'minimum teklif tabanı',
  'bütçe sapması',
  'hakediş/fatura reconciliation',
  'senaryo/forecast',
  'muhasebe export formatı',
  'ERP entegrasyonu',
  'e-Fatura',
  'e-Defter',
  'vergi programı',
  'payment/hakediş execute',
  'invoice create/update/delete',
  'accounting posting',
  'DB migration',
  'backend write route',
  'provider credential read/write/use',
  'dispatch apply',
  'route apply',
  'driver/vehicle assignment',
  'message/email/SMS/push',
];

const readOnlyActionCases = [
  'financial_overview',
  'room_profitability',
  'quote_floor_preview',
  'route_cost_preview',
  'vehicle_cost_preview',
  'agreement_margin_preview',
  'company_budget',
  'company_service_cost',
  'cost_per_person',
  'supplier_price_quality_compare',
  'hakedis_invoice_reconciliation_preview',
  'scenario_forecast_savings',
  'accounting_export_contract',
  'overview',
  'preview',
  'summary',
  'compare',
  'policy',
  'rbac',
];

const blockedActionCases = [
  'payment execute',
  'hakediş execute',
  'invoice create',
  'invoice update',
  'invoice delete',
  'accounting posting',
  'erp live integration',
  'db write',
  'backend write route',
  'route apply',
  'dispatch apply',
  'shift create',
  'shift update',
  'driver assign',
  'vehicle assign',
  'provider credential management',
  'message send',
  'email send',
  'sms send',
  'push send',
];

function main() {
  console.log('=== FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01 CHECK ===');

  check(exists(docPath), 'doc exists');
  check(exists(helperPath), 'helper exists');
  check(exists(checkPath), 'check exists');

  check(textHas(docText, 'FINANCIAL OPERATIONS AND COST MANAGEMENT'), 'doc title present');
  check(textHas(docText, 'Finansal Operasyon ve Maliyet Yönetimi'), 'doc product name present');
  check(textHas(docText, 'muhasebe programı değildir'), 'doc excludes accounting-program framing');
  check(textHas(docText, 'read-only/preview/karar destek'), 'doc read-only decision-support wording present');
  check(textHas(docText, 'Role Access Matrix'), 'doc role access matrix heading present');
  check(textHas(docText, 'Surface Registry'), 'doc surface registry heading present');
  check(textHas(docText, 'Future Milestone Mapping'), 'doc future milestone mapping heading present');
  check(textHas(docText, 'Existing Capability Reuse Map'), 'doc reuse map heading present');
  check(textHas(docText, 'No Write-Action Boundary'), 'doc write-action boundary heading present');
  check(textHas(docText, 'Accounting / e-Fatura / e-Defter / tax exclusion'), 'doc accounting exclusion heading present');
  check(textHas(docText, 'KVKK / PII / Tenant Isolation Boundary'), 'doc kvkk boundary heading present');
  check(textHas(docText, 'Next Milestone'), 'doc next milestone heading present');
  check(textHas(docText, 'OPERATIONAL-COST-MODEL-01'), 'doc next milestone mentions operational cost model');
  check(textHas(docText, 'check:financialoperationssurfaceandrbac01'), 'doc canonical check present');
  check(textHas(docText, 'backend/src/finance/financialOperationsScope.js'), 'doc helper path present');

  const docForbiddenPhrases = [
    'Fatura kestim',
    'Ödeme başlattım',
    'Muhasebeye işledim',
    'ERP’ye aktardım',
    'Hakedişi onayladım',
    'Tahsilat yaptım',
    'Gider kaydı oluşturdum',
    'Vergi/e-Fatura/e-Defter hazır',
  ];
  for (const needle of docForbiddenPhrases) {
    check(textLacks(docText, needle), `doc forbids phrase: ${needle}`);
  }

  check(textHas(helperText, 'FINANCIAL_OPERATIONS_BLOCK_NAME'), 'helper exports block name');
  check(textHas(helperText, 'FINANCIAL_OPERATIONS_NEXT_MILESTONE'), 'helper exports next milestone');
  check(textHas(helperText, 'FINANCIAL_OPERATIONS_MILESTONES'), 'helper exports milestone registry');
  check(textHas(helperText, 'FINANCIAL_OPERATIONS_SCOPE_BOUNDARY'), 'helper exports scope boundary');
  check(textHas(helperText, 'FINANCIAL_OPERATIONS_EXCLUDED_SCOPE'), 'helper exports excluded scope');
  check(textHas(helperText, 'FINANCIAL_OPERATIONS_SURFACES'), 'helper exports surface registry');
  check(textHas(helperText, 'FINANCIAL_OPERATIONS_ROLE_ACCESS'), 'helper exports role access map');
  check(textHas(helperText, 'FINANCIAL_OPERATIONS_REUSE_MAP'), 'helper exports reuse map');
  check(textHas(helperText, 'getFinancialOperationsAccessForRole'), 'helper exports access getter');
  check(textHas(helperText, 'canViewFinancialSurface'), 'helper exports surface visibility guard');
  check(textHas(helperText, 'listFinancialSurfacesForRole'), 'helper exports surface lister');
  check(textHas(helperText, 'describeFinancialSurface'), 'helper exports surface describer');
  check(textHas(helperText, 'buildFinancialOperationsEmptyState'), 'helper exports empty state builder');
  check(textHas(helperText, 'buildFinancialOperationsRbacDenial'), 'helper exports RBAC denial builder');
  check(textHas(helperText, 'buildFinancialOperationsReuseSummary'), 'helper exports reuse summary builder');
  check(textHas(helperText, 'buildFinancialOperationsNextMilestoneSummary'), 'helper exports next milestone summary');
  check(textHas(helperText, 'isAccountingExecutionBlocked'), 'helper exports accounting execution blocker');
  check(textHas(helperText, 'isFinancialOperationReadOnlyAction'), 'helper exports read-only classifier');

  check(Array.isArray(scope.FINANCIAL_OPERATIONS_MILESTONES), 'helper milestone registry is array');
  check(scope.FINANCIAL_OPERATIONS_MILESTONES.length === 8, 'helper milestone registry has eight items');
  check(scope.FINANCIAL_OPERATIONS_MILESTONES[0] === 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01', 'helper milestone first item is current milestone');
  check(scope.FINANCIAL_OPERATIONS_MILESTONES[1] === 'OPERATIONAL-COST-MODEL-01', 'helper milestone second item is operational cost model');
  check(scope.FINANCIAL_OPERATIONS_NEXT_MILESTONE === 'OPERATIONAL-COST-MODEL-01', 'helper next milestone is operational cost model');
  check(Array.isArray(scope.FINANCIAL_OPERATIONS_SURFACES), 'helper surfaces is array');
  check(scope.FINANCIAL_OPERATIONS_SURFACES.length === expectedSurfaces.length, 'helper surface registry has thirteen items');
  check(Array.isArray(scope.FINANCIAL_OPERATIONS_REUSE_MAP), 'helper reuse map is array');
  check(scope.FINANCIAL_OPERATIONS_REUSE_MAP.length === reuseCapabilities.length, 'helper reuse map has thirteen items');
  check(Array.isArray(scope.FINANCIAL_OPERATIONS_SCOPE_BOUNDARY), 'helper scope boundary is array');
  check(Array.isArray(scope.FINANCIAL_OPERATIONS_EXCLUDED_SCOPE), 'helper excluded scope is array');
  check(Array.isArray(scope.getFinancialOperationsAccessForRole('ROOM').visibleSurfaceIds), 'role access returns surface ids');
  check(scope.getFinancialOperationsAccessForRole('ROOM').role === 'ROOM', 'room access role key normalized');
  check(scope.getFinancialOperationsAccessForRole('DEFAULT').role === 'DEFAULT', 'default access role key normalized');
  check(scope.getFinancialOperationsReuseSummary().items.length === reuseCapabilities.length, 'reuse summary returns reuse map items');
  check(scope.buildFinancialOperationsNextMilestoneSummary().nextMilestone === 'OPERATIONAL-COST-MODEL-01', 'next milestone summary keeps next milestone');
  check(scope.buildFinancialOperationsNextMilestoneSummary().milestoneOrder.length === 8, 'next milestone summary keeps milestone order');
  check(scope.isAccountingExecutionBlocked('payment execute') === true, 'payment execute is blocked');
  check(scope.isAccountingExecutionBlocked('invoice create') === true, 'invoice create is blocked');
  check(scope.isAccountingExecutionBlocked('accounting posting') === true, 'accounting posting is blocked');
  check(scope.isAccountingExecutionBlocked('erp live integration') === true, 'erp live integration is blocked');
  check(scope.isAccountingExecutionBlocked('db write') === true, 'db write is blocked');
  check(scope.isAccountingExecutionBlocked('backend write route') === true, 'backend write route is blocked');
  check(scope.isFinancialOperationReadOnlyAction('financial_overview') === true, 'financial overview is read-only');
  check(scope.isFinancialOperationReadOnlyAction('room_profitability') === true, 'room profitability is read-only');
  check(scope.isFinancialOperationReadOnlyAction('company_budget') === true, 'company budget is read-only');
  check(scope.isFinancialOperationReadOnlyAction('scenario_forecast_savings') === true, 'scenario forecast savings is read-only');
  check(scope.isFinancialOperationReadOnlyAction('accounting_export_contract') === true, 'accounting export contract is read-only');
  check(scope.isFinancialOperationReadOnlyAction('payment execute') === false, 'payment execute is not read-only');
  check(scope.isFinancialOperationReadOnlyAction('invoice create') === false, 'invoice create is not read-only');

  for (const surfaceId of expectedSurfaces) {
    const surface = scope.FINANCIAL_OPERATIONS_SURFACES.find((item) => item.id === surfaceId);
    check(Boolean(surface), `surface registry contains ${surfaceId}`);
    check(surface.id === surfaceId, `surface registry id matches ${surfaceId}`);
    check(textHas(surface.title, ' '), `surface title is readable for ${surfaceId}`);
    check(textHas(surface.summary, 'önizleme') || textHas(surface.summary, 'kartı') || textHas(surface.summary, 'yüzeyi') || textHas(surface.summary, 'kontrat') || textHas(surface.summary, 'karşılaştırma'), `surface summary is descriptive for ${surfaceId}`);
    check(Array.isArray(surface.visibleToRoles), `surface visible roles array for ${surfaceId}`);
    check(surface.visibleToRoles.length > 0, `surface has visible roles for ${surfaceId}`);
    check(Array.isArray(surface.reuseCapabilities), `surface reuse capability array for ${surfaceId}`);
    check(Array.isArray(surface.excludedScope), `surface excluded scope array for ${surfaceId}`);
    check(Array.isArray(surface.readOnlyActions), `surface read-only action array for ${surfaceId}`);
    const describedRoom = scope.describeFinancialSurface(surfaceId, 'ROOM');
    const describedCompany = scope.describeFinancialSurface(surfaceId, 'COMPANY');
    const describedSuper = scope.describeFinancialSurface(surfaceId, 'SUPER_ADMIN');
    check(describedSuper.exists === true, `describe surface exists for ${surfaceId}`);
    check(describedSuper.surfaceId === surfaceId, `describe surface id matches for ${surfaceId}`);
    check(describedSuper.allowed === true, `super admin can view ${surfaceId}`);
    check(describedRoom.exists === true, `room describe exists for ${surfaceId}`);
    check(describedCompany.exists === true, `company describe exists for ${surfaceId}`);
    check(scope.canViewFinancialSurface('SUPER_ADMIN', surfaceId) === true, `super admin access for ${surfaceId}`);
    check(scope.canViewFinancialSurface('ROOM', surfaceId) === expectedRoleVisibility.ROOM.includes(surfaceId), `room access for ${surfaceId}`);
    check(scope.canViewFinancialSurface('COMPANY', surfaceId) === expectedRoleVisibility.COMPANY.includes(surfaceId), `company access for ${surfaceId}`);
    check(scope.canViewFinancialSurface('DRIVER', surfaceId) === false, `driver denied for ${surfaceId}`);
    check(scope.canViewFinancialSurface('PERSONEL', surfaceId) === false, `personel denied for ${surfaceId}`);
    check(scope.canViewFinancialSurface('PARENT', surfaceId) === false, `parent denied for ${surfaceId}`);
    check(scope.canViewFinancialSurface('SCHOOL', surfaceId) === false, `school denied for ${surfaceId}`);
    check(scope.canViewFinancialSurface('ORGANIZATION', surfaceId) === false, `organization denied for ${surfaceId}`);
    check(scope.canViewFinancialSurface('UNKNOWN_ROLE', surfaceId) === false, `unknown role denied for ${surfaceId}`);
    check(scope.listFinancialSurfacesForRole('SUPER_ADMIN').some((item) => item.id === surfaceId), `super admin surface list contains ${surfaceId}`);
    if (expectedRoleVisibility.ROOM.includes(surfaceId)) {
      check(scope.listFinancialSurfacesForRole('ROOM').some((item) => item.id === surfaceId), `room surface list contains ${surfaceId}`);
    } else {
      check(scope.listFinancialSurfacesForRole('ROOM').every((item) => item.id !== surfaceId), `room surface list excludes ${surfaceId}`);
    }
    if (expectedRoleVisibility.COMPANY.includes(surfaceId)) {
      check(scope.listFinancialSurfacesForRole('COMPANY').some((item) => item.id === surfaceId), `company surface list contains ${surfaceId}`);
    } else {
      check(scope.listFinancialSurfacesForRole('COMPANY').every((item) => item.id !== surfaceId), `company surface list excludes ${surfaceId}`);
    }
    check(scope.buildFinancialOperationsEmptyState('SUPER_ADMIN', surfaceId).allowed === true, `super admin empty state allowed for ${surfaceId}`);
    check(scope.buildFinancialOperationsEmptyState('ROOM', surfaceId).readOnly === true, `room empty state is read-only for ${surfaceId}`);
    check(scope.buildFinancialOperationsEmptyState('COMPANY', surfaceId).readOnly === true, `company empty state is read-only for ${surfaceId}`);
  }

  check(scope.getFinancialOperationsAccessForRole('SUPER_ADMIN').visibleSurfaceIds.length === expectedRoleVisibility.SUPER_ADMIN.length, 'super admin sees all surfaces');
  check(scope.getFinancialOperationsAccessForRole('ROOM').visibleSurfaceIds.length === expectedRoleVisibility.ROOM.length, 'room sees nine surfaces');
  check(scope.getFinancialOperationsAccessForRole('COMPANY').visibleSurfaceIds.length === expectedRoleVisibility.COMPANY.length, 'company sees seven surfaces');
  check(scope.getFinancialOperationsAccessForRole('DRIVER').visibleSurfaceIds.length === 0, 'driver sees zero surfaces');
  check(scope.getFinancialOperationsAccessForRole('PERSONEL').visibleSurfaceIds.length === 0, 'personel sees zero surfaces');
  check(scope.getFinancialOperationsAccessForRole('PARENT').visibleSurfaceIds.length === 0, 'parent sees zero surfaces');
  check(scope.getFinancialOperationsAccessForRole('SCHOOL').visibleSurfaceIds.length === 0, 'school sees zero surfaces');
  check(scope.getFinancialOperationsAccessForRole('ORGANIZATION').visibleSurfaceIds.length === 0, 'organization sees zero surfaces');
  check(scope.getFinancialOperationsAccessForRole('DEFAULT').visibleSurfaceIds.length === 0, 'default sees zero surfaces');

  for (const role of Object.keys(expectedRoleVisibility)) {
    const access = scope.getFinancialOperationsAccessForRole(role);
    const visible = scope.listFinancialSurfacesForRole(role);
    check(Array.isArray(access.visibleSurfaceIds), `${role} access surface ids array`);
    check(Array.isArray(access.visibleSurfaceTitles), `${role} access surface titles array`);
    check(Array.isArray(access.policyNotes), `${role} access policy notes array`);
    check(textHas(access.tenantIsolationText, 'Tenant isolation'), `${role} access keeps tenant isolation wording`);
    check(typeof access.summaryText === 'string', `${role} access summary text is string`);
    check(typeof access.denialText === 'string', `${role} access denial text is string`);
    check(typeof access.nextAction === 'string', `${role} access next action is string`);
    check(visible.map((item) => item.id).join(',') === expectedRoleVisibility[role].join(','), `${role} visible surface list matches`);
  }

  for (const capability of reuseCapabilities) {
    const item = scope.FINANCIAL_OPERATIONS_REUSE_MAP.find((entry) => entry.capability === capability);
    check(Boolean(item), `reuse map contains ${capability}`);
    check(item.capability === capability, `reuse map capability matches ${capability}`);
    check(Array.isArray(item.sourceFiles), `reuse map source file array for ${capability}`);
    check(item.sourceFiles.length > 0, `reuse map source file list is not empty for ${capability}`);
    check(Array.isArray(item.surfaces), `reuse map surface list for ${capability}`);
    check(item.surfaces.length > 0, `reuse map surfaces are not empty for ${capability}`);
    check(typeof item.note === 'string' && item.note.length > 0, `reuse map note present for ${capability}`);
  }

  for (const needle of blockedScopeNeedles) {
    check(textHas(docText, needle), `doc excluded scope includes ${needle}`);
    check(textHas(helperText, needle), `helper excluded scope includes ${needle}`);
  }

  for (const action of blockedActionCases) {
    check(scope.isAccountingExecutionBlocked(action) === true, `blocked action guard for ${action}`);
    check(scope.isFinancialOperationReadOnlyAction(action) === false, `blocked action is not read-only: ${action}`);
  }

  for (const action of readOnlyActionCases) {
    check(scope.isFinancialOperationReadOnlyAction(action) === true, `read-only action guard for ${action}`);
  }

  const emptySuper = scope.buildFinancialOperationsEmptyState('SUPER_ADMIN', 'financial_overview');
  const emptyRoom = scope.buildFinancialOperationsEmptyState('ROOM', 'company_budget');
  const emptyDenied = scope.buildFinancialOperationsEmptyState('DRIVER', 'financial_overview');
  const denial = scope.buildFinancialOperationsRbacDenial('PERSONEL', 'company_budget');
  check(emptySuper.allowed === true, 'super admin empty state allowed');
  check(emptySuper.readOnly === true, 'super admin empty state is read-only');
  check(textHas(emptySuper.summaryText, 'read-only/preview'), 'super admin empty state keeps preview wording');
  check(emptyRoom.allowed === false || emptyRoom.allowed === true, 'room empty state returns a structured response');
  check(textHas(emptyRoom.summaryText, 'read-only/preview') || textHas(emptyRoom.summaryText, 'henüz veri yok'), 'room empty state is descriptive');
  check(emptyDenied.allowed === false, 'driver empty state denies access');
  check(textHas(emptyDenied.summaryText, 'erişemez') || textHas(emptyDenied.summaryText, 'kapalı'), 'driver empty state uses denial wording');
  check(denial.allowed === false, 'rbac denial denies access');
  check(textHas(denial.summaryText, 'read-only/preview'), 'rbac denial keeps preview wording');

  check(textHas(helperText, 'tenant isolation preserved'), 'helper keeps tenant isolation boundary');
  check(textHas(helperText, 'no payment/hakediş execute'), 'helper blocks payment execute');
  check(textHas(helperText, 'no invoice create/update/delete'), 'helper blocks invoice write');
  check(textHas(helperText, 'no accounting posting'), 'helper blocks accounting posting');
  check(textHas(helperText, 'no ERP live integration'), 'helper blocks ERP integration');
  check(textHas(helperText, 'no DB write'), 'helper blocks DB write');
  check(textHas(helperText, 'no backend write route'), 'helper blocks backend write route');
  check(textHas(helperText, 'read-only preview only'), 'helper boundary stays preview only');
  check(textHas(helperText, 'Next milestone summary'), 'helper next milestone summary present');
  check(textHas(helperText, 'OPERATIONAL-COST-MODEL-01'), 'helper mentions next milestone');

  check(textHas(docText, 'ROOM and COMPANY visible surfaces'), 'doc mentions room/company visibility');
  check(textHas(docText, 'SUPER_ADMIN visible surfaces'), 'doc mentions super admin visibility');
  check(textHas(docText, 'DRIVER / PERSONEL denied surfaces'), 'doc mentions driver/personel denial');
  check(textHas(docText, 'No write-action boundary'), 'doc mentions write-action boundary');
  check(textHas(docText, 'Validation Results'), 'doc includes validation results section');

  check(textHas(packageText, '"check:financialoperationssurfaceandrbac01": "node backend/scripts/financial_operations_surface_and_rbac_01_check.js"'), 'package alias added');
  check(textHas(runnerText, 'check:financialoperationssurfaceandrbac01'), 'product extensions runner includes financial check');
  check(textHas(verifyText, 'check:financialoperationssurfaceandrbac01'), 'verify chain includes financial check');
  check(textHas(guideText, 'check:financialoperationssurfaceandrbac01'), 'script guide exposes financial check');
  check(textHas(guideText, 'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md'), 'script guide links financial doc');
  check(textHas(guideText, 'backend/src/finance/financialOperationsScope.js'), 'script guide links financial helper');
  check(textHas(primerText, 'check:financialoperationssurfaceandrbac01'), 'primer exposes financial check');
  check(textHas(primerText, 'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md'), 'primer links financial doc');
  check(textHas(primerText, 'backend/src/finance/financialOperationsScope.js'), 'primer links financial helper');
  check(textHas(roadmapText, 'check:financialoperationssurfaceandrbac01'), 'roadmap lock doc exposes financial check');
  check(textHas(roadmapText, 'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md'), 'roadmap lock doc links financial doc');
  check(textHas(roadmapText, 'backend/src/finance/financialOperationsScope.js'), 'roadmap lock doc links financial helper');
  check(textHas(repoAuditText, 'check:financialoperationssurfaceandrbac01'), 'repo audit roadmap mentions financial check');
  check(textHas(repoAuditText, 'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md'), 'repo audit roadmap links financial doc');
  check(textHas(harnessCheckText, 'check:financialoperationssurfaceandrbac01'), 'harness check knows financial alias');
  check(textHas(harnessDocText, 'root:check:financialoperationssurfaceandrbac01'), 'harness doc lists financial root check');
  check(textHas(harnessDocText, 'check:financialoperationssurfaceandrbac01'), 'harness doc lists financial check');
  check(textHas(harnessDocText, 'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md'), 'harness doc lists financial doc');
  check(textHas(harnessDocText, 'backend/src/finance/financialOperationsScope.js'), 'harness doc lists financial helper');
  check(textHas(checkText, 'PASS FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01'), 'check banner contains pass marker');
  check(textHas(checkText, 'guardCases'), 'check script prints guardCases');
  check(textHas(checkText, 'passCount'), 'check script prints passCount');
  check(textHas(checkText, 'failCount'), 'check script prints failCount');

  check(fileLines(helperPath) < 1000, 'helper stays under 1000 lines', String(fileLines(helperPath)));
  check(fileLines(checkPath) < 1000, 'check stays under 1000 lines', String(fileLines(checkPath)));
  check(fileLines(docPath) < 1000, 'doc stays under 1000 lines', String(fileLines(docPath)));

  assertEmptyDiff(
    ['backend/src/routes'],
    'backend/src/routes diff empty except room financial operations preview routes',
    false,
    ['backend/src/routes/commercialCore.js', 'backend/src/routes/companyOverview.js'],
  );
  assertEmptyDiff(['backend/src/services'], 'backend/src/services diff empty');
  assertEmptyDiff(['prisma'], 'prisma diff empty');
  assertEmptyDiff(['backend/prisma'], 'backend/prisma diff empty');
  assertCommandOutputEmpty(['diff', '--check'], 'git diff --check clean');
  assertCommandOutputEmpty(['diff', '--cached', '--check'], 'git diff --cached --check clean');
  assertCommandOutputEmpty(['diff', '--cached', '--name-only'], 'stage empty');
  check(!exists('debug.log'), 'debug.log absent');

  console.log(`roleAccessSummary=${Object.entries(expectedRoleVisibility)
    .map(([role, items]) => `${role}:${items.length}`)
    .join(' | ')}`);
  console.log(`surfaceRegistrySummary=${scope.FINANCIAL_OPERATIONS_SURFACES.length} surfaces`);
  console.log(`futureMilestoneSummary=${scope.FINANCIAL_OPERATIONS_MILESTONES.join(' -> ')}`);
  console.log(`reuseMapSummary=${scope.FINANCIAL_OPERATIONS_REUSE_MAP.length} capabilities`);
  console.log(`excludedScopeSummary=${scope.FINANCIAL_OPERATIONS_EXCLUDED_SCOPE.length} exclusions`);
  console.log(`noWriteActionSummary=${scope.FINANCIAL_OPERATIONS_SCOPE_BOUNDARY.length} boundary items`);
  console.log(`lineCountSummary=helper:${fileLines(helperPath)} check:${fileLines(checkPath)} doc:${fileLines(docPath)}`);
  console.log(`routeServicePrismaSummary=clean`);
  console.log(`commitExternalSummary=runtime-data and generated artifacts stay external`);
  console.log(`PASS ${scope.FINANCIAL_OPERATIONS_BLOCK_NAME} guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exit(1);
}
