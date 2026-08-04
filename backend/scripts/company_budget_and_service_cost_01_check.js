#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildCompanyBudgetAndServiceCostPreview,
  buildFinancialOperationsCompanyKindDeniedPreview,
} from '../src/finance/companyBudgetAndServiceCost.js';

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

function textHas(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function textLacks(text, needle) {
  return !textHas(text, needle);
}

function countLines(text) {
  const source = String(text || '');
  if (!source) return 0;
  return source.split(/\r?\n/).length;
}

function fileLines(relPath) {
  return countLines(read(relPath));
}

function getPathValue(obj, pathText) {
  return String(pathText || '')
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

const FIXED_TODAY_ISO = '2026-07-29';

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

function must(text, needle, label) {
  check(textHas(text, needle), label, needle);
}

function lacks(text, needle, label) {
  check(textLacks(text, needle), label, needle);
}

function assertPairs(obj, pairs, labelPrefix) {
  for (const [pathText, expected] of pairs) {
    const actual = getPathValue(obj, pathText);
    check(Object.is(actual, expected), `${labelPrefix} ${pathText}`, `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

function assertFragments(text, fragments, labelPrefix) {
  for (const fragment of fragments) {
    must(text, fragment, `${labelPrefix} contains ${fragment}`);
  }
}

function assertMissingFragments(text, fragments, labelPrefix) {
  for (const fragment of fragments) {
    lacks(text, fragment, `${labelPrefix} lacks ${fragment}`);
  }
}

function gitOutput(args) {
  const out = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '');
}

function assertEmptyDiff(paths, label, cached = false) {
  const args = ['diff'];
  if (cached) args.push('--cached');
  args.push('--name-only', '--', ...paths);
  const names = gitOutput(args)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  check(names.length === 0, label, names.join(', '));
}

function assertCommandOutputEmpty(args, label) {
  const output = gitOutput(args).trim();
  check(output.length === 0, label, output);
}

const docPath = 'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md';
const helperPath = 'backend/src/finance/companyBudgetAndServiceCost.js';
const routePath = 'backend/src/routes/companyOverview.js';
const panelPath = 'web/src/panels/shared/FinancialOperationsPanel.jsx';
const scopePath = 'backend/src/finance/financialOperationsScope.js';
const financialSurfaceDocPath = 'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md';
const packagePath = 'package.json';
const runnerPath = 'backend/scripts/run_product_extensions_check_chain.js';
const verifyPath = 'backend/scripts/verify_chain_01_product_extensions_check.js';
const guidePath = 'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md';
const primerPath = 'docs/PRIMER_SSOT.md';
const roadmapPath = 'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md';
const repoAuditPath = 'docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md';
const harnessCheckPath = 'backend/scripts/script_harness_consolidation_01_check.js';
const harnessDocPath = 'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md';

function main() {
const docText = read(docPath);
const helperText = read(helperPath);
const routeText = read(routePath);
const panelText = read(panelPath);
const scopeText = read(scopePath);
const financialSurfaceDocText = read(financialSurfaceDocPath);
const packageText = read(packagePath);
const runnerText = read(runnerPath);
const verifyText = read(verifyPath);
const guideText = read(guidePath);
const primerText = read(primerPath);
const roadmapText = read(roadmapPath);
const repoAuditText = read(repoAuditPath);
const harnessCheckText = read(harnessCheckPath);
const harnessDocText = read(harnessDocPath);
const todayIso = FIXED_TODAY_ISO;

function buildBaseArgs() {
  return {
    role: 'COMPANY',
    companyKind: 'COMPANY',
    company: { id: 21, name: 'Company Demo', kind: 'COMPANY' },
    shift: {
      id: 301,
      roomId: 11,
      companyId: 21,
      status: 'ACTIVE',
      routeSnapshotDistanceM: 9000,
      routeSnapshotDurationSec: 1800,
      requiredPaxOverride: 18,
      companyOfferAmount: 220000,
      roomOfferAmount: 200000,
      _count: { people: 17, stops: 4 },
      vehicle: { capacity: 20 },
    },
    agreement: {
      id: 401,
      roomId: 11,
      companyId: 21,
      startDate: '2026-07-01',
      endDate: '2026-07-28',
      companyOfferAmount: 225000,
      roomOfferAmount: 205000,
      status: 'ACTIVE',
    },
    companySummary: {
      cards: {
        todayAgreements: 3,
        activeShiftCount: 2,
        activeAgreements: 1,
        openOffersCount: 1,
        counterShiftCount: 1,
        requestedAgreements: 1,
      },
    },
    budgetInputs: {
      approvedBudgetAmountMinor: 300000,
      budgetApprovalState: 'approved',
      budgetSource: 'approved_budget',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-28',
      periodType: 'contract_period',
      currencyCode: 'TRY',
    },
    serviceCostInputs: {
      actualServiceSpendMinor: 180000,
      serviceCostSource: 'actual_service_spend',
      currencyCode: 'TRY',
      serviceCurrencyCode: 'TRY',
      taxBasis: 'contract',
      deliveredShiftCount: 2,
      deliveredTripCount: 4,
      deliveredServiceDayCount: 10,
      activePersonCount: 17,
      plannedPersonCount: 18,
      periodType: 'contract_period',
      pricePeriod: 'contract_period',
    },
    supplierInputs: {
      supplierRef: 'safe-supplier-1',
      safeSupplierLabel: 'Supplier Alpha',
      supplierPriceMinor: 170000,
      supplierQualityScore: 88,
      supplierReliabilityScore: 91,
      supplierEvidenceCount: 12,
      supplierCurrencyCode: 'TRY',
      supplierPricePeriod: 'contract_period',
      verifiedSupplierState: 'verified',
    },
    costInputs: {},
    previewInputs: { todayIso: FIXED_TODAY_ISO },
  };
}

function buildCompanyArgs(overrides = {}) {
  const base = buildBaseArgs();
  return {
    ...base,
    ...overrides,
    company: { ...base.company, ...(overrides.company || {}) },
    shift: { ...base.shift, ...(overrides.shift || {}) },
    agreement: { ...base.agreement, ...(overrides.agreement || {}) },
    companySummary: { ...base.companySummary, ...(overrides.companySummary || {}) },
    budgetInputs: { ...base.budgetInputs, ...(overrides.budgetInputs || {}) },
    serviceCostInputs: { ...base.serviceCostInputs, ...(overrides.serviceCostInputs || {}) },
    supplierInputs: { ...base.supplierInputs, ...(overrides.supplierInputs || {}) },
    costInputs: { ...base.costInputs, ...(overrides.costInputs || {}) },
    previewInputs: { ...base.previewInputs, ...(overrides.previewInputs || {}) },
  };
}

function assertStaticContract() {
  check(exists(docPath), 'doc exists');
  check(exists(helperPath), 'helper exists');
  check(exists(routePath), 'route exists');
  check(exists(panelPath), 'panel exists');
  check(exists(scopePath), 'scope helper exists');
  check(exists(financialSurfaceDocPath), 'financial surface doc exists');
  check(exists(harnessCheckPath), 'harness check exists');
  check(exists(harnessDocPath), 'harness doc exists');

  assertFragments(docText, [
    '# COMPANY-BUDGET-AND-SERVICE-COST-01',
    'Finansal Operasyon ve Maliyet Yönetimi bloğundaki company-centric read-only preview milestone.',
    'check:companybudgetandservicecost01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
    'backend/src/finance/companyBudgetAndServiceCost.js',
    'backend/src/routes/companyOverview.js',
    'web/src/panels/shared/FinancialOperationsPanel.jsx',
    'package.json',
    'backend/scripts/run_product_extensions_check_chain.js',
    'backend/scripts/verify_chain_01_product_extensions_check.js',
    'backend/scripts/script_harness_consolidation_01_check.js',
    'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md',
    'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md',
    'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
    'docs/PRIMER_SSOT.md',
    'docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md',
    'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
    'No Write-Action Boundary',
    'Next Milestone',
    'HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01',
    'read-only/preview/karar destek',
    'room iç marj, quote floor',
  ], 'doc');

  assertFragments(helperText, [
    'export function buildCompanyBudgetAndServiceCostPreview',
    'export function buildFinancialOperationsCompanyKindDeniedPreview',
    'export const COMPANY_BUDGET_AND_SERVICE_COST_MODEL_VERSION',
    'companyBudget',
    'companyServiceCost',
    'supplierComparisonSummaryText',
    'supplierComparisonState',
    'noRoomInternalCost',
    'noRoomMargin',
    'noQuoteFloor',
    'noSupplierSelection',
    'noAccountingPosting',
    'readOnly: true',
    'previewOnly: true',
    'writeAction: false',
    'budget source:',
    'service cost source:',
    'Bütçe ve Servis Maliyeti önizlemesi hazırlandı.',
    'Bu sonuç fatura, hakediş, ödeme veya muhasebe kaydı değildir.',
    'HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01',
  ], 'helper');

  assertMissingFragments(helperText, [
    'fetch(',
    'axios',
    'prisma',
    'MongoClient',
    'mongoose',
    'http://',
    'https://',
    'buildRoomProfitabilityAndQuoteFloorPreview',
    'quoteFloorMinor',
    'roomMarginMinor',
    'roomInternalCostMinor',
    'paymentExecute',
    'accountingPosting(',
  ], 'helper');

  assertFragments(routeText, [
    '../finance/companyBudgetAndServiceCost.js',
    'buildCompanyBudgetAndServiceCostPreview',
    'buildFinancialOperationsCompanyKindDeniedPreview',
    'budgetInputs: req.query || {}',
    'serviceCostInputs: req.query || {}',
    'supplierInputs: req.query || {}',
    'previewInputs: req.query || {}',
    '/financial-operations/preview',
    'companyOverview',
  ], 'route');
  assertMissingFragments(routeText, [
    'roomProfitabilityAndQuoteFloor.js',
    'buildRoomProfitabilityAndQuoteFloorPreview',
    'payment execute',
    'invoice create',
    'accounting posting',
  ], 'route');

  assertFragments(panelText, [
    'Bütçe ve Servis Maliyeti',
    'Tedarikçi Karşılaştırması',
    'CompanyComparisonBlock',
    'renderCompanyFinancialPreview',
    'preview?.supplierComparisonSummaryText',
    'read-only/preview',
    'Yenile',
    'Dönem Bütçesi',
    'Gerçekleşen Servis Harcaması',
    'Personel Başı Maliyet',
    'Vardiya Başı Maliyet',
    'Sefer Başı Maliyet',
    'Gün Başı Maliyet',
  ], 'panel');

  assertFragments(scopeText, [
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'company_budget',
    'company_service_cost',
    'cost_per_person',
    'supplier_price_quality_compare',
    'hakedis_invoice_reconciliation_preview',
    'scenario_forecast_savings',
    'accounting_export_contract',
    'Company tarafında bütçe, servis maliyeti ve reconciliation önizleme görünür.',
    'Room iç marj ve teklif tabanı ham detayları kapalıdır.',
    'no write-action',
    'tenant isolation preserved',
    'read-only preview only',
  ], 'scope');

  assertFragments(financialSurfaceDocText, [
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'check:companybudgetandservicecost01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
    'backend/src/finance/companyBudgetAndServiceCost.js',
    'company budget preview',
    'company service cost',
    'cost per person',
    'supplier price/quality compare',
    'room iç marj ve quote floor ham detayları',
    'company-centric read-only önizleme',
  ], 'financial surface doc');

  assertFragments(packageText, [
    '"check:companybudgetandservicecost01": "node backend/scripts/company_budget_and_service_cost_01_check.js"',
  ], 'package');
  assertFragments(runnerText, [
    'check:companybudgetandservicecost01',
  ], 'runner');
  assertFragments(verifyText, [
    'check:companybudgetandservicecost01',
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
    'backend/src/finance/companyBudgetAndServiceCost.js',
  ], 'verify chain');
  assertFragments(guideText, [
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'check:companybudgetandservicecost01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
    'backend/src/finance/companyBudgetAndServiceCost.js',
  ], 'script guide');
  assertFragments(primerText, [
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'check:companybudgetandservicecost01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
    'backend/src/finance/companyBudgetAndServiceCost.js',
  ], 'primer');
  assertFragments(roadmapText, [
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'check:companybudgetandservicecost01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
    'backend/src/finance/companyBudgetAndServiceCost.js',
  ], 'roadmap');
  assertFragments(repoAuditText, [
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'check:companybudgetandservicecost01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
    'backend/src/finance/companyBudgetAndServiceCost.js',
  ], 'repo audit');
  assertFragments(harnessCheckText, [
    'check:companybudgetandservicecost01',
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
  ], 'harness check');
  assertFragments(harnessDocText, [
    'check:companybudgetandservicecost01',
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
  ], 'harness doc');

  check(fileLines(docPath) < 1000, 'doc stays under 1000 lines', String(fileLines(docPath)));
  check(fileLines(helperPath) < 1000, 'helper stays under 1000 lines', String(fileLines(helperPath)));
  check(fileLines(routePath) < 1000, 'route stays under 1000 lines', String(fileLines(routePath)));
  check(fileLines(panelPath) < 1000, 'panel stays under 1000 lines', String(fileLines(panelPath)));
  check(fileLines(scopePath) < 1000, 'scope stays under 1000 lines', String(fileLines(scopePath)));
  check(fileLines(financialSurfaceDocPath) < 1000, 'financial surface doc stays under 1000 lines', String(fileLines(financialSurfaceDocPath)));
  assertEmptyDiff(['backend/src/services'], 'backend/src/services diff empty');
  assertEmptyDiff(['prisma'], 'prisma diff empty');
  assertEmptyDiff(['prisma'], 'prisma diff empty');
  assertCommandOutputEmpty(['diff', '--cached', '--name-only'], 'stage empty');
  check(!exists('debug.log'), 'debug.log absent');

  const completePreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs());
  assertPairs(completePreview, [
    ['allowed', true],
    ['scope', 'COMPANY'],
    ['surfaceId', 'company_budget'],
    ['status', 'within_budget'],
    ['readOnly', true],
    ['previewOnly', true],
    ['writeAction', false],
    ['noRoomInternalCost', true],
    ['noRoomMargin', true],
    ['noQuoteFloor', true],
    ['noSupplierSelection', true],
    ['noAccountingPosting', true],
    ['companyBudget.effectiveBudgetMinor', 300000],
    ['companyBudget.budgetUsedMinor', 180000],
    ['companyBudget.remainingBudgetMinor', 120000],
    ['companyBudget.varianceMinor', 120000],
    ['companyBudget.usageBps', 6000],
    ['companyBudget.readOnly', true],
    ['companyBudget.previewOnly', true],
    ['companyBudget.writeAction', false],
    ['companyServiceCost.companyVisibleServiceSpendMinor', 180000],
    ['companyServiceCost.currencyCode', 'TRY'],
    ['companyServiceCost.serviceCurrencyCode', 'TRY'],
    ['companyServiceCost.readOnly', true],
    ['companyServiceCost.previewOnly', true],
    ['companyServiceCost.writeAction', false],
    ['period.periodState', 'complete'],
    ['period.isPartial', false],
    ['period.isMismatch', false],
    ['supplierComparisonState', 'balanced'],
    ['supplierComparisons.length', 1],
    ['supplierComparisons.0.valueBand', 'balanced'],
    ['supplierComparisons.0.currencyCode', 'TRY'],
    ['supplierComparisons.0.verifiedSupplierState', 'verified'],
    ['companyBudget.missingFields.length', 0],
    ['companyServiceCost.missingFields.length', 0],
    ['missingFields.length', 0],
    ['invalidFields.length', 0],
    ['warnings.length', 0],
    ['blockers.length', 0],
    ['comparisonPolicy.periodMismatch', false],
    ['comparisonPolicy.mixedCurrency', false],
    ['unitCosts.costPerActivePersonMinor', 10588],
    ['unitCosts.costPerPlannedPersonMinor', 10000],
    ['unitCosts.costPerServiceDayMinor', 18000],
    ['unitCosts.costPerShiftMinor', 90000],
    ['unitCosts.costPerTripMinor', 45000],
    ['dataQuality.level', 'high'],
    ['confidence.level', 'high'],
    ['nextSafeStep', 'HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01'],
  ], 'complete preview');
  assertFragments(completePreview.summaryText, [
    'Bütçe ve Servis Maliyeti önizlemesi hazırlandı.',
    'Bu sonuç fatura, hakediş, ödeme veya muhasebe kaydı değildir.',
  ], 'complete summary');
  assertFragments(completePreview.companyBudget.summaryText, [
    'Bütçe ve servis harcaması read-only olarak karşılaştırıldı.',
  ], 'complete budget summary');
  assertFragments(completePreview.companyServiceCost.summaryText, [
    'Gerçekleşen servis harcaması önizlemesi hazırlandı.',
    'Bu sonuç fatura, hakediş, ödeme veya muhasebe kaydı değildir.',
  ], 'complete service summary');
  assertFragments(completePreview.supplierComparisonSummaryText, [
    'Tedarikçi karşılaştırması hazırlandı',
    'otomatik seçim yapılmadı',
  ], 'complete supplier summary');
  assertMissingFragments(JSON.stringify(completePreview), [
    'roomProfitability',
    'quoteFloorMinor',
    'roomInternalCostMinor',
    'roomMarginMinor',
    'supplierSelectionId',
    'dispatchApply',
    'paymentExecute',
    'accountingPosting(',
  ], 'complete preview room leakage guard');

  const zeroBudgetPreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs({
    budgetInputs: {
      budgetAmountMinor: 0,
      budgetApprovalState: 'draft',
      budgetSource: 'draft_budget',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-28',
      periodType: 'contract_period',
      currencyCode: 'TRY',
    },
    serviceCostInputs: {
      actualServiceSpendMinor: 0,
      serviceCostSource: 'actual_service_spend',
      currencyCode: 'TRY',
      serviceCurrencyCode: 'TRY',
      taxBasis: 'contract',
      deliveredShiftCount: 0,
      deliveredTripCount: 0,
      deliveredServiceDayCount: 0,
      activePersonCount: 1,
      plannedPersonCount: 1,
      periodType: 'contract_period',
      pricePeriod: 'contract_period',
    },
    supplierInputs: {
      supplierRef: undefined,
      safeSupplierLabel: undefined,
      supplierPriceMinor: undefined,
      supplierQualityScore: undefined,
      supplierReliabilityScore: undefined,
      supplierEvidenceCount: undefined,
      supplierCurrencyCode: undefined,
      supplierPricePeriod: undefined,
      verifiedSupplierState: undefined,
    },
  }));
  assertPairs(zeroBudgetPreview, [
    ['companyBudget.explicitZeroBudget', true],
    ['companyBudget.effectiveBudgetMinor', 0],
    ['companyBudget.remainingBudgetMinor', 0],
    ['companyBudget.varianceMinor', 0],
    ['companyBudget.usageBps', null],
    ['companyServiceCost.companyVisibleServiceSpendMinor', 0],
    ['status', 'within_budget'],
    ['allowed', true],
    ['companyBudget.budgetSource', 'draft_budget'],
    ['companyBudget.budgetApprovalState', 'draft'],
    ['companyBudget.missingFields.length', 0],
    ['companyServiceCost.missingFields.length', 0],
    ['supplierComparisonState', 'incomplete'],
    ['supplierComparisons.length', 0],
  ], 'explicit zero budget');
  assertFragments(zeroBudgetPreview.companyBudget.summaryText, [
    'Bütçe ve servis harcaması read-only olarak karşılaştırıldı.',
  ], 'explicit zero budget summary');

  const missingBudgetPreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs({
    budgetInputs: {
      budgetAmountMinor: undefined,
      approvedBudgetAmountMinor: undefined,
      revisedBudgetAmountMinor: undefined,
      manualPreviewBudgetAmountMinor: undefined,
      budgetSource: undefined,
      budgetApprovalState: undefined,
      periodStart: '2026-07-01',
      periodEnd: '2026-07-28',
      periodType: 'contract_period',
      currencyCode: 'TRY',
    },
  }));
  assertPairs(missingBudgetPreview, [
    ['status', 'no_budget'],
    ['allowed', true],
    ['companyBudget.effectiveBudgetMinor', null],
    ['companyBudget.remainingBudgetMinor', null],
    ['companyBudget.varianceMinor', null],
    ['companyServiceCost.companyVisibleServiceSpendMinor', 180000],
    ['companyBudget.missingFields.length', 1],
    ['companyBudget.missingFields.0', 'budgetAmountMinor'],
    ['companyBudget.warnings.length', 1],
    ['companyBudget.warnings.0', 'Onaylı bütçe bulunmadı'],
  ], 'missing budget');
  assertFragments(missingBudgetPreview.companyBudget.summaryText, [
    'Onaylı bütçe bulunmadığı için bütçe sapması hesaplanmadı.',
  ], 'missing budget summary');

  const missingServicePreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs({
    shift: {
      companyOfferAmount: Number.NaN,
      roomOfferAmount: Number.NaN,
    },
    agreement: {
      companyOfferAmount: Number.NaN,
      roomOfferAmount: Number.NaN,
    },
    serviceCostInputs: {
      actualServiceSpendMinor: undefined,
      deliveredServiceCostPreviewMinor: undefined,
      contractedServiceCostMinor: undefined,
      agreementPriceMinor: undefined,
      offerPriceMinor: undefined,
      perShiftPriceMinor: undefined,
      perTripPriceMinor: undefined,
      perDayPriceMinor: undefined,
      serviceCostSource: undefined,
    },
  }));
  assertPairs(missingServicePreview, [
    ['status', 'no_service_cost'],
    ['allowed', true],
    ['companyBudget.effectiveBudgetMinor', 300000],
    ['companyServiceCost.companyVisibleServiceSpendMinor', null],
    ['companyServiceCost.summaryText', 'Gerçekleşen servis harcaması için yeterli kaynak bulunamadı.'],
    ['companyBudget.remainingBudgetMinor', null],
    ['companyBudget.varianceMinor', null],
    ['companyServiceCost.missingFields.length', 4],
    ['companyServiceCost.missingFields.0', 'actualServiceSpendMinor'],
  ], 'missing service cost');
  assertFragments(missingServicePreview.summaryText, [
    'Servis harcaması kaynağı bulunmadığı için gerçekleşen spend hesaplanmadı.',
  ], 'missing service summary');

  const periodMismatchPreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs({
    budgetInputs: {
      periodType: 'billing_period',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-28',
      currencyCode: 'TRY',
    },
    serviceCostInputs: {
      periodType: 'contract_period',
      pricePeriod: 'contract_period',
      currencyCode: 'TRY',
      serviceCurrencyCode: 'TRY',
      actualServiceSpendMinor: 180000,
      taxBasis: 'contract',
      deliveredShiftCount: 2,
      deliveredTripCount: 4,
      deliveredServiceDayCount: 10,
      activePersonCount: 17,
      plannedPersonCount: 18,
    },
  }));
  assertPairs(periodMismatchPreview, [
    ['status', 'period_mismatch'],
    ['comparisonPolicy.periodMismatch', true],
    ['comparisonPolicy.mixedCurrency', false],
    ['allowed', false],
    ['blockers.length', 1],
    ['blockers.0', 'Period mismatch'],
    ['period.isMismatch', true],
    ['period.periodType', 'billing_period'],
    ['supplierComparisonState', 'balanced'],
  ], 'period mismatch');
  assertFragments(periodMismatchPreview.companyBudget.summaryText, [
    'Dönem bilgileri eşleşmediği için bütçe sapması güvenle hesaplanmadı.',
  ], 'period mismatch summary');

  const mixedCurrencyPreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs({
    budgetInputs: {
      approvedBudgetAmountMinor: 300000,
      budgetApprovalState: 'approved',
      budgetSource: 'approved_budget',
      currencyCode: 'TRY',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-28',
      periodType: 'contract_period',
    },
    serviceCostInputs: {
      currencyCode: undefined,
      serviceCurrencyCode: 'USD',
      taxBasis: 'contract',
      actualServiceSpendMinor: 180000,
      deliveredShiftCount: 2,
      deliveredTripCount: 4,
      deliveredServiceDayCount: 10,
      activePersonCount: 17,
      plannedPersonCount: 18,
      periodType: 'contract_period',
      pricePeriod: 'contract_period',
    },
  }));
  assertPairs(mixedCurrencyPreview, [
    ['status', 'mixed_currency'],
    ['comparisonPolicy.mixedCurrency', true],
    ['allowed', false],
    ['blockers.length', 1],
    ['blockers.0', 'Mixed currency comparison blocked'],
    ['companyServiceCost.currencyCode', 'USD'],
    ['companyServiceCost.serviceCurrencyCode', 'USD'],
    ['companyBudget.remainingBudgetMinor', 120000],
    ['companyBudget.varianceMinor', 120000],
    ['companyBudget.budgetSource', 'approved_budget'],
  ], 'mixed currency');
  assertFragments(mixedCurrencyPreview.companyBudget.summaryText, [
    'Para birimi uyumsuz olduğu için bütçe ile servis harcaması doğrudan karşılaştırılmadı.',
  ], 'mixed currency summary');

  const partialPeriodPreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs({
    agreement: {
      id: 402,
      roomId: 11,
      companyId: 21,
      startDate: '2026-07-01',
      endDate: '2026-08-31',
      companyOfferAmount: 225000,
      roomOfferAmount: 205000,
      status: 'ACTIVE',
    },
    budgetInputs: {
      periodStart: '2026-07-01',
      periodEnd: '2026-08-31',
      periodType: 'contract_period',
      currencyCode: 'TRY',
    },
    serviceCostInputs: {
      periodType: 'contract_period',
      pricePeriod: 'contract_period',
      actualServiceSpendMinor: 180000,
      currencyCode: 'TRY',
      serviceCurrencyCode: 'TRY',
      taxBasis: 'contract',
      deliveredShiftCount: 2,
      deliveredTripCount: 4,
      deliveredServiceDayCount: 10,
      activePersonCount: 17,
      plannedPersonCount: 18,
    },
  }));
  assertPairs(partialPeriodPreview, [
    ['status', 'partial_period'],
    ['period.isPartial', true],
    ['period.periodState', 'partial'],
    ['period.periodEnd', '2026-08-31'],
    ['allowed', true],
    ['companyBudget.remainingBudgetMinor', 120000],
    ['companyBudget.varianceMinor', 120000],
    ['supplierComparisonState', 'balanced'],
  ], 'partial period');
  assertFragments(partialPeriodPreview.companyBudget.summaryText, [
    'Dönem henüz tamamlanmadığı için bütçe kullanım oranı önizleme niteliğindedir.',
  ], 'partial period summary');

  const derivedServicePreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs({
    shift: {
      companyOfferAmount: null,
      roomOfferAmount: null,
    },
    agreement: {
      companyOfferAmount: null,
      roomOfferAmount: null,
    },
    serviceCostInputs: {
      actualServiceSpendMinor: null,
      serviceCostSource: null,
      deliveredServiceCostPreviewMinor: null,
      contractedServiceCostMinor: null,
      agreementPriceMinor: null,
      offerPriceMinor: null,
      deliveredShiftCount: 3,
      perShiftPriceMinor: 45000,
      deliveredTripCount: 6,
      perTripPriceMinor: 22500,
      deliveredServiceDayCount: 9,
      perDayPriceMinor: 15000,
      activePersonCount: 17,
      plannedPersonCount: 18,
      currencyCode: 'TRY',
      serviceCurrencyCode: 'TRY',
      taxBasis: 'contract',
      periodType: 'contract_period',
      pricePeriod: 'contract_period',
    },
    supplierInputs: {
      supplierRef: 'derived-supplier',
      safeSupplierLabel: 'Derived Supplier',
      supplierPriceMinor: 160000,
      supplierQualityScore: 77,
      supplierReliabilityScore: 79,
      supplierEvidenceCount: 8,
      supplierCurrencyCode: 'TRY',
      supplierPricePeriod: 'contract_period',
      verifiedSupplierState: 'verified',
    },
  }));
  assertPairs(derivedServicePreview, [
    ['status', 'within_budget'],
    ['companyServiceCost.companyVisibleServiceSpendMinor', 135000],
    ['companyServiceCost.serviceCostSource', 'delivered_shift_count_x_per_shift_price'],
    ['companyServiceCost.deliveredShiftCount', 3],
    ['companyServiceCost.deliveredTripCount', 6],
    ['companyServiceCost.deliveredServiceDayCount', 9],
    ['supplierComparisonState', 'balanced'],
    ['supplierComparisons.length', 1],
    ['supplierComparisons.0.valueBand', 'balanced'],
    ['unitCosts.costPerShiftMinor', 45000],
    ['unitCosts.costPerTripMinor', 22500],
    ['unitCosts.costPerServiceDayMinor', 15000],
  ], 'derived service preview');

  const incompleteSupplierPreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyArgs({
    supplierInputs: {
      supplierRef: undefined,
      safeSupplierLabel: undefined,
      supplierNameSafe: undefined,
      supplierPriceMinor: undefined,
      supplierQualityScore: undefined,
      supplierReliabilityScore: undefined,
      supplierEvidenceCount: undefined,
      supplierCurrencyCode: undefined,
      supplierPricePeriod: undefined,
      verifiedSupplierState: undefined,
    },
  }));
  assertPairs(incompleteSupplierPreview, [
    ['status', 'within_budget'],
    ['allowed', true],
    ['supplierComparisonState', 'incomplete'],
    ['supplierComparisons.length', 0],
    ['companyBudget.effectiveBudgetMinor', 300000],
    ['companyServiceCost.companyVisibleServiceSpendMinor', 180000],
  ], 'incomplete supplier preview');
  assertFragments(incompleteSupplierPreview.supplierComparisonSummaryText, [
    'Tedarikçi karşılaştırması için veri bekleniyor',
    'otomatik seçim yapılmadı',
  ], 'incomplete supplier summary');

  const deniedPreview = buildFinancialOperationsCompanyKindDeniedPreview({
    role: 'COMPANY',
    companyKind: 'SCHOOL',
    scope: 'COMPANY',
  });
  assertPairs(deniedPreview, [
    ['allowed', false],
    ['deniedByCompanyKind', true],
    ['scope', 'COMPANY'],
    ['surfaceId', 'company_budget'],
    ['status', 'blocked'],
    ['readOnly', true],
    ['previewOnly', true],
    ['writeAction', false],
    ['notPersisted', true],
    ['notInvoiced', true],
    ['notPaid', true],
    ['notApproved', true],
    ['noRoomInternalCost', true],
    ['noRoomMargin', true],
    ['noQuoteFloor', true],
    ['noSupplierSelection', true],
    ['noAccountingPosting', true],
    ['companyBudget', null],
    ['companyServiceCost', null],
    ['supplierComparisons.length', 0],
    ['nextSafeStep', 'HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01'],
  ], 'denied preview');
  check(Object.keys(deniedPreview.unitCosts || {}).length === 0, 'denied preview unitCosts empty', JSON.stringify(deniedPreview.unitCosts || {}));
  assertFragments(deniedPreview.summaryText, [
    'read-only/preview',
    'Bu alt kimlik için finansal operasyon yüzeyi kapalıdır.',
  ], 'denied summary');

  assertFragments(JSON.stringify(completePreview), ['"modelVersion":"COMPANY-BUDGET-AND-SERVICE-COST-01"', '"previewId":"ocm_', '"title":"Company budget preview"', '"nextAction":"Bütçe ve servis maliyeti önizlemesini açık parametrelerle tamamla."', '"nextSafeStep":"HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01"', '"tenantIsolationText":"Tenant isolation korunur; ham veri role göre daraltılır."', '"serviceCostComponents":[', '"key":"actual_service_spend"', '"label":"Gerçekleşen servis harcaması"', '"key":"agreement_price"', '"key":"offer_price"', '"comparisonPolicy":{"periodMismatch":false,"mixedCurrency":false}'], 'complete preview serialized core');
  assertFragments(JSON.stringify(completePreview.companyBudget), ['"budgetSource":"approved_budget"', '"budgetApprovalState":"approved"', '"periodType":"contract_period"', '"periodStart":"2026-07-01"', '"periodEnd":"2026-07-28"', '"periodLabel":"2026-07-01 - 2026-07-28"', '"effectiveBudgetMinor":300000', '"remainingBudgetMinor":120000', '"varianceMinor":120000', '"varianceDirection":"under_budget"', '"usageBps":6000', '"explicitZeroBudget":false', '"summaryText":"Bütçe ve servis harcaması read-only olarak karşılaştırıldı."', '"missingFields":[]', '"warnings":[]', '"blockers":[]', '"readOnly":true', '"previewOnly":true', '"writeAction":false'], 'complete companyBudget serialized');
  assertFragments(JSON.stringify(completePreview.companyServiceCost), ['"serviceCostSource":"actual_service_spend"', '"currencyCode":"TRY"', '"serviceCurrencyCode":"TRY"', '"taxBasis":"contract"', '"companyVisibleServiceSpendMinor":180000', '"actualServiceSpendMinor":180000', '"deliveredServiceCostPreviewMinor":null', '"contractedServiceCostMinor":null', '"agreementPriceMinor":220000', '"offerPriceMinor":220000', '"qualityAdjustmentPreviewMinor":null', '"hakedisAdjustmentPreviewMinor":null', '"contractualAdjustmentPreviewMinor":null', '"summaryText":"Gerçekleşen servis harcaması önizlemesi hazırlandı. Bu sonuç fatura, hakediş, ödeme veya muhasebe kaydı değildir."', '"missingFields":[]', '"warnings":[]', '"blockers":[]', '"readOnly":true', '"previewOnly":true', '"writeAction":false'], 'complete companyServiceCost serialized');
  assertFragments(JSON.stringify(completePreview.supplierComparisons[0]), ['"supplierRef":"safe-supplier-1"', '"safeSupplierLabel":"Supplier Alpha"', '"normalizedPriceMinor":170000', '"pricePeriod":"contract_period"', '"currencyCode":"TRY"', '"qualityScore":88', '"reliabilityScore":91', '"serviceEvidenceCount":12', '"verifiedSupplierState":"verified"', '"dataQuality":"balanced"', '"comparisonWarnings":[]', '"priceDeltaMinor":-10000', '"priceIndexBps":9444', '"valueBand":"balanced"'], 'complete supplier comparison serialized');
  assertFragments(JSON.stringify(completePreview.unitCosts), ['"costPerActivePersonMinor":10588', '"costPerPlannedPersonMinor":10000', '"costPerServiceDayMinor":18000', '"costPerShiftMinor":90000', '"costPerTripMinor":45000', '"costPerAgreementMinor":180000', '"costPerSupplierMinor":null', '"activePersonCount":17', '"plannedPersonCount":18', '"deliveredServiceDayCount":10', '"deliveredShiftCount":2', '"deliveredTripCount":4', '"budgetUsedMinor":180000'], 'complete unitCosts serialized');
  assertFragments(JSON.stringify(completePreview.period), ['"periodType":"contract_period"', '"periodStart":"2026-07-01"', '"periodEnd":"2026-07-28"', '"periodLabel":"2026-07-01 - 2026-07-28"', '"periodState":"complete"', '"isPartial":false', '"isMismatch":false', `"todayIso":"${todayIso}"`], 'complete period serialized');
  assertFragments(JSON.stringify(completePreview.dataQuality), ['"score":100', '"level":"high"', '"completenessScore":100', '"confidenceLevel":"high"', '"summaryText":"Bütçe ve servis harcaması okunabildi."', '"reason":"Sınırlı veriyle preview üretildi."'], 'complete dataQuality serialized');
  assertFragments(JSON.stringify(completePreview.confidence), ['"score":100', '"level":"high"', '"reason":"Sınırlı veriyle preview üretildi."'], 'complete confidence serialized');
  assertFragments(JSON.stringify(completePreview.evidence), ['"companyId: 21"', '"shiftId: 301"', '"agreementId: 401"', '"budget source: approved_budget"', '"service cost source: actual_service_spend"', '"period: 2026-07-01 - 2026-07-28"', '"budgetUsedMinor = 180000"', '"remainingBudgetMinor = 300000 - 180000"'], 'complete evidence serialized');
  assertFragments(JSON.stringify(completePreview.formulaTrace), ['"budgetUsedMinor = companyVisibleServiceSpendMinor"', '"remainingBudgetMinor = effectiveBudgetMinor - budgetUsedMinor"', '"varianceMinor = effectiveBudgetMinor - budgetUsedMinor"', '"usageBps = budgetUsedMinor / effectiveBudgetMinor * 10000"'], 'complete formulaTrace serialized');
  assertFragments(JSON.stringify(completePreview.sourceTrace), ['"companyId:21"', '"shiftId:301"', '"agreementId:401"', '"companyName:Company Demo"', '"roomName:-"', '"budgetSource:approved_budget"', '"serviceCostSource:actual_service_spend"'], 'complete sourceTrace serialized');
  assertFragments(JSON.stringify(completePreview.comparisonPolicy), ['"periodMismatch":false', '"mixedCurrency":false'], 'complete comparisonPolicy serialized');
  assertFragments(JSON.stringify(zeroBudgetPreview), ['"explicitZeroBudget":true', '"budgetSource":"draft_budget"', '"budgetApprovalState":"draft"', '"effectiveBudgetMinor":0', '"remainingBudgetMinor":0', '"varianceMinor":0', '"usageBps":null', '"companyVisibleServiceSpendMinor":0', '"status":"within_budget"', '"supplierComparisonState":"incomplete"', '"supplierComparisons":[]', '"missingFields":[]', '"warnings":[]', '"blockers":[]'], 'explicit zero preview serialized');
  assertFragments(JSON.stringify(missingBudgetPreview), ['"status":"no_budget"', '"effectiveBudgetMinor":null', '"remainingBudgetMinor":null', '"varianceMinor":null', '"companyVisibleServiceSpendMinor":180000', '"budgetApprovalState":"unknown"', '"budgetSource":"missing"', '"missingFields":["budgetAmountMinor"]', '"warnings":["Onaylı bütçe bulunmadı"]'], 'missing budget serialized');
  assertFragments(JSON.stringify(missingServicePreview), ['"status":"no_service_cost"', '"companyVisibleServiceSpendMinor":null', '"companyBudget":{"budgetSource":"approved_budget"', '"serviceCostSource":"missing"', '"missingFields":["actualServiceSpendMinor","contractedServiceCostMinor","agreementPriceMinor","offerPriceMinor"]', '"summaryText":"Gerçekleşen servis harcaması için yeterli kaynak bulunamadı."', '"remainingBudgetMinor":null', '"varianceMinor":null'], 'missing service serialized');
  assertFragments(JSON.stringify(periodMismatchPreview), ['"status":"period_mismatch"', '"periodMismatch":true', '"mixedCurrency":false', '"blockers":["Period mismatch"]', '"periodState":"complete"', '"isMismatch":true', '"periodType":"billing_period"', '"supplierComparisonState":"balanced"'], 'period mismatch serialized');
  assertFragments(JSON.stringify(mixedCurrencyPreview), ['"status":"mixed_currency"', '"periodMismatch":false', '"mixedCurrency":true', '"blockers":["Mixed currency comparison blocked"]', '"currencyCode":"USD"', '"serviceCurrencyCode":"USD"', '"remainingBudgetMinor":120000', '"varianceMinor":120000'], 'mixed currency serialized');
  assertFragments(JSON.stringify(partialPeriodPreview), ['"status":"partial_period"', '"periodState":"partial"', '"isPartial":true', '"isMismatch":false', '"periodEnd":"2026-08-31"', '"supplierComparisonState":"balanced"', '"remainingBudgetMinor":120000', '"varianceMinor":120000'], 'partial period serialized');
  assertFragments(JSON.stringify(derivedServicePreview), ['"status":"within_budget"', '"companyVisibleServiceSpendMinor":135000', '"serviceCostSource":"delivered_shift_count_x_per_shift_price"', '"deliveredShiftCount":3', '"deliveredTripCount":6', '"deliveredServiceDayCount":9', '"supplierComparisonState":"balanced"', '"supplierComparisons":[', '"valueBand":"balanced"', '"costPerShiftMinor":45000', '"costPerTripMinor":22500', '"costPerServiceDayMinor":15000'], 'derived service serialized');
  assertFragments(JSON.stringify(incompleteSupplierPreview), ['"status":"within_budget"', '"supplierComparisonState":"incomplete"', '"supplierComparisons":[]', '"companyVisibleServiceSpendMinor":180000', '"supplierComparisonSummaryText":"Tedarikçi karşılaştırması için veri bekleniyor; otomatik seçim yapılmadı."'], 'incomplete supplier serialized');
  assertFragments(JSON.stringify(deniedPreview), ['"allowed":false', '"deniedByCompanyKind":true', '"companyBudget":null', '"companyServiceCost":null', '"supplierComparisons":[]', '"unitCosts":{}', '"nextSafeStep":"HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01"', '"summaryText":"Bu alt kimlik için finansal operasyon yüzeyi kapalıdır. Bu alan read-only/preview olarak kalır."'], 'denied preview serialized');
  assertFragments(JSON.stringify(completePreview.surface), ['"exists":true', '"allowed":true', '"role":"COMPANY"', '"surfaceId":"company_budget"', '"title":"Company budget preview"', '"summaryText":"Şirket bütçesi için read-only karar destek yüzeyi."', '"rbacText":"Company tarafında bütçe, servis maliyeti ve reconciliation önizleme görünür."', '"nextAction":"Bütçe ve servis maliyeti kartlarını kontrol et."', '"previewOnly":true', '"phase":"current"', '"nextMilestone":"COMPANY-BUDGET-AND-SERVICE-COST-01"', '"reuseCapabilities":["Dashboard maliyet kartları","Sefer Abi maliyet cevapları"]', '"excludedScope":["budget write","accounting posting","ERP integration"]'], 'complete surface serialized');
  assertFragments(JSON.stringify(completePreview.access), ['"role":"COMPANY"', '"summaryText":"Company tarafında bütçe, servis maliyeti ve reconciliation önizleme görünür."', '"denialText":"Room iç marj ve teklif tabanı ham detayları kapalıdır."', '"nextAction":"Bütçe ve servis maliyeti kartlarını kontrol et."', '"tenantIsolationText":"Tenant isolation korunur; ham veri role göre daraltılır."', '"visibleSurfaceIds":["financial_overview","company_budget","company_service_cost","cost_per_person","supplier_price_quality_compare","hakedis_invoice_reconciliation_preview","scenario_forecast_savings"]', '"visibleSurfaceTitles":["Finansal operasyon özeti","Company budget preview","Company service cost preview","Cost per person preview","Supplier price / quality compare","Hakediş / invoice reconciliation preview","Scenario forecast / savings preview"]', '"policyNotes":["room internal margin hidden","supplier credential hidden"]'], 'complete access serialized');
  assertFragments(JSON.stringify(completePreview.tenantIsolation), ['"companyId":21', '"role":"COMPANY"', '"scope":"COMPANY"', '"tenantIsolationText":"Tenant isolation korunur; ham veri role göre daraltılır."'], 'complete tenantIsolation serialized');
  assertFragments(JSON.stringify(completePreview.serviceCostComponents), ['"key":"actual_service_spend"', '"label":"Gerçekleşen servis harcaması"', '"amountMinor":180000', '"source":"actualServiceSpendMinor"', '"key":"agreement_price"', '"label":"Agreement price"', '"source":"agreementPriceMinor"', '"key":"offer_price"', '"label":"Offer price"', '"source":"offerPriceMinor"'], 'complete serviceCostComponents serialized');

  check(fileLines(docPath) < 1000, 'doc remains under 1000 lines', String(fileLines(docPath)));
  check(fileLines(helperPath) < 1000, 'helper remains under 1000 lines', String(fileLines(helperPath)));
  check(fileLines(routePath) < 1000, 'route remains under 1000 lines', String(fileLines(routePath)));
  check(fileLines(panelPath) < 1000, 'panel remains under 1000 lines', String(fileLines(panelPath)));
  check(fileLines(scopePath) < 1000, 'scope remains under 1000 lines', String(fileLines(scopePath)));
  check(fileLines(financialSurfaceDocPath) < 1000, 'financial surface doc remains under 1000 lines', String(fileLines(financialSurfaceDocPath)));

  check(guardCases >= 500, 'guard case threshold met', String(guardCases));
  check(passCount === guardCases, 'pass count matches guard cases', `${passCount}/${guardCases}`);
  check(failCount === 0, 'no failing cases', String(failCount));

  console.log(`PASS COMPANY-BUDGET-AND-SERVICE-COST-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
}
assertStaticContract();
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  console.log(`FAIL COMPANY-BUDGET-AND-SERVICE-COST-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
  process.exit(1);
}
