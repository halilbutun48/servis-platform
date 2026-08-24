#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as model from '../src/finance/operationalCostModel.js';
import { RECOGNIZED_CURRENCY_CODES } from '../src/finance/operationalCostMath.js';
import { runOperationalCostModelExpansionChecks } from './operational_cost_model_01_expansion.js';
import {
  assertProductExtensionsIncludes,
  assertProductExtensionsOrder,
  productExtensionsChecks,
} from './lib/productExtensionsRegistry.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { mustNoDiffExceptWithIdentity } from './lib/guardGitScope.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const financeOwnedRoutePaths = new Set([
  'backend/src/routes/commercialCore.js',
  'backend/src/routes/companyOverview.js',
  'backend/src/routes/operationProof.js',
]);
const financeOwnedRouteEntries = Object.freeze(
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path }) => financeOwnedRoutePaths.has(path))
);
const concurrentRuntimeRouteEntries = Object.freeze([
  { path: 'backend/src/routes/trustQuality.js', sha256: 'FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD' },
  { path: 'backend/src/routes/admin.js', sha256: '61A3D7CF98653E6E413E787BCBFD9D8DD9AECE77A7663DCA78E9CE446D2C5DA4' },
  { path: 'backend/src/routes/agreements.js', sha256: '90CED5678F26B47AE69CE985D6D436B70DF8886B523ECA8988E51BE53ECD2B9A' },
  { path: 'backend/src/routes/auth.js', sha256: 'A137B997660215DBD2C5E8AA24593BD96F319CF784322C65D3628B8C9F4AACF3' },
  { path: 'backend/src/routes/dashboardBulk.js', sha256: 'C1FA734271C1B3FF73CA3393B781EAF966710A66AD57BC31290B829CFFF5754F' },
  { path: 'backend/src/routes/offers.js', sha256: '40C553F43D0709D3146D6DA48893B2FDAF9DA3B3814961ECA9C0FD8FA15FF649' },
  { path: 'backend/src/routes/public.js', sha256: '5196203AC501B365D52D79D29FA355DF23421180C9337D58EEE3B19707AFFF23' },
]);
const financeOwnedServiceEntries = Object.freeze([
  { path: 'backend/src/services/qualityPaymentBridgeService.js', sha256: '935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83' },
  { path: 'backend/src/services/dashboardBulk.js', sha256: 'E3BF830BD2DF41A158FB60ED766C9A0C25A789C85F722443A37CEA61618A1A0E' },
]);

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

function eachContains(text, needles, scope) {
  for (const needle of needles) {
    check(textHas(text, needle), `${scope} contains ${needle}`);
  }
}

function eachLacks(text, needles, scope) {
  for (const needle of needles) {
    check(textLacks(text, needle), `${scope} lacks ${needle}`);
  }
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

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let last = -1;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, last + 1);
    check(idx >= 0, `${label} contains ${needle}`);
    if (idx < 0) return;
    check(idx > last, `${label} keeps ${needle} after previous needle`);
    last = idx;
  }
}

function component(result, key) {
  return result.components.find((item) => item.componentKey === key);
}

const docPath = 'docs/OPERATIONAL_COST_MODEL_01.md';
const modelPath = 'backend/src/finance/operationalCostModel.js';
const mathPath = 'backend/src/finance/operationalCostMath.js';
const checkPath = 'backend/scripts/operational_cost_model_01_check.js';
const packagePath = 'package.json';
const guidePath = 'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md';
const primerPath = 'docs/PRIMER_SSOT.md';
const roadmapPath = 'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md';
const repoAuditPath = 'docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md';
const harnessCheckPath = 'backend/scripts/script_harness_consolidation_01_check.js';
const harnessDocPath = 'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md';
const financialSurfaceDocPath = 'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md';

const docText = read(docPath);
const modelText = read(modelPath);
const mathText = read(mathPath);
const packageText = read(packagePath);
const guideText = read(guidePath);
const primerText = read(primerPath);
const roadmapText = read(roadmapPath);
const repoAuditText = read(repoAuditPath);
const harnessCheckText = read(harnessCheckPath);
const harnessDocText = read(harnessDocPath);
const financialSurfaceDocText = read(financialSurfaceDocPath);
const checkText = read(checkPath);

function buildCompleteInput() {
  return {
    currencyCode: 'TRY',
    sourceType: 'route_preview',
    sourceRef: 'route-1',
    routeRef: 'route-1',
    vehicleRef: 'vehicle-1',
    driverRef: 'driver-1',
    serviceDistanceKm: 150,
    emptyDistanceKm: 50,
    totalDistanceKm: 200,
    routeDurationMinutes: 120,
    waitingMinutes: 30,
    overtimeMinutes: 15,
    shiftCount: 2,
    serviceDayCount: 4,
    tripCount: 3,
    passengerCount: 20,
    vehicleCapacity: 40,
    fuelConsumptionLitersPer100Km: 5,
    fuelUnitPriceMinor: 5000,
    vehicleLeaseMonthlyMinor: 20000,
    vehicleDepreciationMonthlyMinor: 10000,
    insuranceMonthlyMinor: 5000,
    taxAndLicenseMonthlyMinor: 5000,
    allocationShiftsPerMonth: 20,
    vehicleFixedCostAllocationMode: 'per_shift',
    maintenancePerKmMinor: 10,
    tirePerKmMinor: 5,
    driverBasePerShiftMinor: 1000,
    mealAllowancePerShiftMinor: 200,
    socialCostAllocationMinor: 150,
    driverWaitingHourlyCostMinor: 600,
    driverOvertimeHourlyCostMinor: 900,
    tollMinor: 300,
    bridgeMinor: 200,
    highwayMinor: 100,
    parkingMinor: 50,
    terminalMinor: 75,
    otherDirectRouteFeeMinor: 25,
    operationsOverheadFixedMinor: 4000,
    operationsOverheadPerShiftMinor: 100,
    operationsOverheadRateBps: 500,
    operationsOverheadRateBaseMinor: 50000,
    otherDirectCostMinor: 150,
  };
}

function buildPreviewInput() {
  return {
    ...buildCompleteInput(),
    qualityAdjustmentPreviewMinor: -250,
    includeExternalPreviewAdjustments: true,
  };
}

function buildBlockedInput() {
  return {
    currencyCode: 'TRY',
    fuelCurrencyCode: 'USD',
    totalDistanceKm: 100,
    fuelConsumptionLitersPer100Km: 5,
    fuelUnitPriceMinor: 1000,
  };
}

function buildIncompleteInput() {
  return {
    currencyCode: 'TRY',
    maintenancePerKmMinor: 10,
  };
}


function main() {
  console.log('=== OPERATIONAL-COST-MODEL-01 CHECK ===');

  check(exists(docPath), 'doc exists');
  check(exists(modelPath), 'model exists');
  check(exists(mathPath), 'math helper exists');
  check(exists(checkPath), 'check exists');

  check(fileLines(modelPath) < 1000, 'model stays under 1000 lines', String(fileLines(modelPath)));
  check(fileLines(mathPath) < 1000, 'math helper stays under 1000 lines', String(fileLines(mathPath)));
  check(fileLines(docPath) < 1000, 'doc stays under 1000 lines', String(fileLines(docPath)));
  check(fileLines(checkPath) < 1000, 'check stays under 1000 lines', String(fileLines(checkPath)));

  eachContains(docText, [
    '# OPERATIONAL-COST-MODEL-01',
    'Finansal Operasyon ve Maliyet Yönetimi bloğundaki pure deterministic cost model milestone',
    'check:operationalcostmodel01',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
    'Read-only / preview-only karar destek üretir',
    'Sonraki güvenli aşama: `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01`',
    'Existing Capability Reuse Map',
    'Dynamic Savings',
    'Hakediş önizlemesi',
    'Kalite kesintisi',
    'Teklif analizi',
    'Sözleşme fiyatları',
    'Kilometre ve rota maliyet yardımcıları',
    'Araç / sürücü maliyet alanları',
    'Dashboard maliyet kartları',
    'Excel / CSV dışa aktarma',
    'Sefer Abi maliyet cevapları',
    'Cost Component Registry',
    'fuel',
    'vehicle_fixed_allocated',
    'vehicle_variable',
    'driver_labor',
    'waiting_and_overtime',
    'route_fees',
    'operations_overhead',
    'other_direct_cost',
    'external_preview_adjustments',
    'Money / Currency Policy',
    'No Write-Action Boundary',
    'Accounting / e-Fatura / e-Defter / Tax Exclusion',
    'Data Quality and Confidence',
    'Validation Contract',
    'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
  ], 'doc');

  eachContains(docText, [
    'Dispatch apply yok.',
    'Route apply yok.',
    'Driver / vehicle assign yok.',
    'Agreement execute yok.',
    'Payment / hakediş execute yok.',
    'Invoice create / update / delete yok.',
    'Accounting posting yok.',
    'Provider credential read/write/use yok.',
    'Message / email / SMS / push yok.',
    'ERP live integration yok.',
    'e-Fatura yok.',
    'e-Defter yok.',
    'Vergi programı yok.',
    'Full muhasebe programı değildir.',
  ], 'doc boundary');

  eachContains(packageText, [
    '"check:operationalcostmodel01": "node backend/scripts/operational_cost_model_01_check.js"',
  ], 'package');

  const registryScripts = productExtensionsChecks.map((step) => step.script);
  assertProductExtensionsIncludes('check:operationalcostmodel01', 'product extensions registry includes operational cost model check', registryScripts);
  assertProductExtensionsOrder([
    'check:financialoperationssurfaceandrbac01',
    'check:operationalcostmodel01',
    'check:uxmarketplacepanels01',
  ], 'product extensions registry runner order', registryScripts);
  assertProductExtensionsOrder([
    'check:financialoperationssurfaceandrbac01',
    'check:operationalcostmodel01',
    'check:roomprofitabilityandquotefloor01',
  ], 'product extensions registry verify finance order', registryScripts);

  eachContains(guideText, [
    'check:operationalcostmodel01',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
  ], 'guide');
  ordered(guideText, [
    'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01',
    'OPERATIONAL-COST-MODEL-01',
    'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
  ], 'guide finance order');

  eachContains(primerText, [
    'check:operationalcostmodel01',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
  ], 'primer');
  ordered(primerText, [
    'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01',
    'OPERATIONAL-COST-MODEL-01',
    'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
  ], 'primer finance order');

  eachContains(roadmapText, [
    'check:operationalcostmodel01',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
  ], 'roadmap');
  ordered(roadmapText, [
    'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01',
    'OPERATIONAL-COST-MODEL-01',
    'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
  ], 'roadmap finance order');

  eachContains(repoAuditText, [
    'check:operationalcostmodel01',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
  ], 'repo audit');
  ordered(repoAuditText, [
    'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01',
    'OPERATIONAL-COST-MODEL-01',
    'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
  ], 'repo audit finance order');

  eachContains(harnessCheckText, [
    'check:operationalcostmodel01',
    'backend/scripts/operational_cost_model_01_check.js',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
    'docs/OPERATIONAL_COST_MODEL_01.md',
  ], 'harness check');

  eachContains(harnessDocText, [
    'Operational cost model milestone: `OPERATIONAL-COST-MODEL-01`',
    'check:operationalcostmodel01',
    'root:check:operationalcostmodel01',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
  ], 'harness doc');
  ordered(harnessDocText, [
    'Financial operations surface milestone: `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01`',
    'Operational cost model milestone: `OPERATIONAL-COST-MODEL-01`',
    'Marketplace panels milestone: `UX-MARKETPLACE-PANELS-01`',
  ], 'harness doc finance order');

  eachContains(financialSurfaceDocText, [
    'OPERATIONAL-COST-MODEL-01`: `check:operationalcostmodel01`',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
  ], 'financial surface doc');

  eachContains(checkText, [
    'PASS OPERATIONAL-COST-MODEL-01',
    'guardCases',
    'passCount',
    'failCount',
  ], 'check script banner');

  eachContains(modelText, [
    'export function normalizeOperationalCostInput',
    'export function buildOperationalCostModel',
    'export function getOperationalCostModelRegistrySummary',
    'OPERATIONAL_COST_MODEL_VERSION',
    'OPERATIONAL_COST_COMPONENT_REGISTRY',
    'OPERATIONAL_COST_UNIT_COST_KEYS',
  ], 'model source');

  eachContains(mathText, [
    'RECOGNIZED_CURRENCY_CODES',
    'compactText',
    'normalizeCurrencyCode',
    'normalizeMode',
    'parseMinor',
    'parseWholeNumber',
    'parseRatio',
    'buildFuelComponent',
    'buildVehicleFixedComponent',
    'buildVehicleVariableComponent',
    'buildDriverLaborComponent',
  ], 'math helper source');

  eachContains(modelText, [
    'buildWaitingOvertimeComponent',
    'buildRouteFeesComponent',
    'buildOperationsOverheadComponent',
    'buildOtherDirectCostComponent',
    'buildExternalPreviewAdjustmentsComponent',
    'summarizeComponent',
    'computeUnitCost',
    'buildSummaryText',
    'buildNextSafeStepText',
  ], 'model orchestration source');

  eachLacks(modelText, [
    'fetch(',
    'axios',
    'http://',
    'https://',
    'prisma',
    'mongoose',
    'MongoClient',
    'writeAction: true',
    'payment execute',
    'invoice create',
    'route apply',
    'dispatch apply',
  ], 'model source safety');

  eachLacks(mathText, [
    'fetch(',
    'axios',
    'http://',
    'https://',
    'prisma',
    'mongoose',
    'MongoClient',
  ], 'math helper safety');

  check(RECOGNIZED_CURRENCY_CODES.has('TRY'), 'currency set includes TRY');
  check(RECOGNIZED_CURRENCY_CODES.has('USD'), 'currency set includes USD');
  check(RECOGNIZED_CURRENCY_CODES.has('EUR'), 'currency set includes EUR');

  const registry = model.getOperationalCostModelRegistrySummary();
  check(registry.modelVersion === 'OPERATIONAL-COST-MODEL-01', 'registry model version matches');
  check(registry.componentCount === 9, 'registry component count matches');
  check(JSON.stringify(registry.componentKeys) === JSON.stringify([
    'fuel',
    'vehicle_fixed_allocated',
    'vehicle_variable',
    'driver_labor',
    'waiting_and_overtime',
    'route_fees',
    'operations_overhead',
    'other_direct_cost',
    'external_preview_adjustments',
  ]), 'registry component key order matches');
  check(JSON.stringify(registry.unitCostKeys) === JSON.stringify([
    'costPerServiceKmMinor',
    'costPerTotalKmMinor',
    'costPerShiftMinor',
    'costPerTripMinor',
    'costPerServiceDayMinor',
    'costPerPassengerMinor',
    'costPerPassengerKmMinor',
    'costPerVehicleMinor',
    'costPerMinuteMinor',
  ]), 'registry unit cost keys match');

  const completeInput = buildCompleteInput();
  const completeNormalized = model.normalizeOperationalCostInput(completeInput);
  const completeResult = model.buildOperationalCostModel(completeInput);

  check(Object.isFrozen(completeNormalized), 'normalized input is frozen');
  check(completeNormalized.vehicleFixedCostAllocationMode === 'per_shift', 'normalized fixed allocation mode preserved');
  check(Object.isFrozen(completeResult), 'complete result is frozen');
  check(Object.isFrozen(completeResult.components), 'component array is frozen');
  check(Object.isFrozen(completeResult.componentSummaries), 'component summary array is frozen');
  check(completeResult.modelVersion === 'OPERATIONAL-COST-MODEL-01', 'complete result model version');
  check(completeResult.calculationId.startsWith('ocm_'), 'complete result has stable calculation id prefix');
  check(completeResult.normalizedInput.calculationId === completeResult.calculationId, 'normalized calculation id preserved');
  check(completeResult.status === 'complete', 'complete case status');
  check(completeResult.currencyCode === 'TRY', 'complete case currency');
  check(completeResult.baselineOperationalCostMinor === 67675, 'complete case baseline');
  check(completeResult.includedComponentTotalMinor === 67675, 'complete case included total');
  check(completeResult.externalPreviewAdjustmentsMinor === 0, 'complete case preview adjustments');
  check(completeResult.adjustedPreviewCostMinor === null, 'complete case adjusted preview omitted');
  check(completeResult.readOnly === true, 'readOnly flag true');
  check(completeResult.previewOnly === true, 'previewOnly flag true');
  check(completeResult.writeAction === false, 'writeAction flag false');
  check(completeResult.notPersisted === true, 'notPersisted flag true');
  check(completeResult.notInvoiced === true, 'notInvoiced flag true');
  check(completeResult.notPaid === true, 'notPaid flag true');
  check(completeResult.notPostedToAccounting === true, 'notPostedToAccounting flag true');
  check(completeResult.noQuoteFloor === true, 'noQuoteFloor flag true');
  check(completeResult.noProfitabilityDecision === true, 'noProfitabilityDecision flag true');

  check(JSON.stringify(completeResult.components.map((item) => item.componentKey)) === JSON.stringify([
    'fuel',
    'vehicle_fixed_allocated',
    'vehicle_variable',
    'driver_labor',
    'waiting_and_overtime',
    'route_fees',
    'operations_overhead',
    'other_direct_cost',
    'external_preview_adjustments',
  ]), 'component order matches registry');

  check(JSON.stringify(completeResult.componentSummaries.map((item) => item.key)) === JSON.stringify([
    'fuel',
    'vehicle_fixed_allocated',
    'vehicle_variable',
    'driver_labor',
    'waiting_and_overtime',
    'route_fees',
    'operations_overhead',
    'other_direct_cost',
    'external_preview_adjustments',
  ]), 'component summary order matches registry');

  check(component(completeResult, 'fuel').amountMinor === 50000, 'fuel component amount');
  check(component(completeResult, 'vehicle_fixed_allocated').amountMinor === 4000, 'vehicle fixed component amount');
  check(component(completeResult, 'vehicle_variable').amountMinor === 3000, 'vehicle variable component amount');
  check(component(completeResult, 'driver_labor').amountMinor === 2550, 'driver labor component amount');
  check(component(completeResult, 'waiting_and_overtime').amountMinor === 525, 'waiting/overtime component amount');
  check(component(completeResult, 'route_fees').amountMinor === 750, 'route fees component amount');
  check(component(completeResult, 'operations_overhead').amountMinor === 6700, 'operations overhead component amount');
  check(component(completeResult, 'other_direct_cost').amountMinor === 150, 'other direct cost component amount');
  check(component(completeResult, 'external_preview_adjustments').amountMinor === 0, 'preview adjustments excluded in baseline');
  check(component(completeResult, 'external_preview_adjustments').status === 'excluded', 'preview adjustments status excluded');

  check(completeResult.unitCosts.costPerServiceKmMinor === 451, 'unit cost per service km');
  check(completeResult.unitCosts.costPerTotalKmMinor === 338, 'unit cost per total km');
  check(completeResult.unitCosts.costPerShiftMinor === 33838, 'unit cost per shift');
  check(completeResult.unitCosts.costPerTripMinor === 22558, 'unit cost per trip');
  check(completeResult.unitCosts.costPerServiceDayMinor === 16919, 'unit cost per service day');
  check(completeResult.unitCosts.costPerPassengerMinor === 3384, 'unit cost per passenger');
  check(completeResult.unitCosts.costPerPassengerKmMinor === 17, 'unit cost per passenger km');
  check(completeResult.unitCosts.costPerVehicleMinor === 67675, 'unit cost per vehicle');
  check(completeResult.unitCosts.costPerMinuteMinor === 564, 'unit cost per minute');

  check(completeResult.dataQuality.completenessScore === 72, 'complete case completeness score');
  check(completeResult.dataQuality.confidenceLevel === 'medium', 'complete case confidence level');
  check(completeResult.dataQuality.includedComponentCount === 8, 'complete case included component count');
  check(completeResult.dataQuality.totalComponentCount === 9, 'complete case total component count');
  check(completeResult.dataQuality.missingFieldCount === 0, 'complete case missing field count');
  check(completeResult.dataQuality.invalidFieldCount === 0, 'complete case invalid field count');
  check(completeResult.dataQuality.warningCount === 0, 'complete case warning count');
  check(completeResult.dataQuality.blockerCount === 0, 'complete case blocker count');
  check(completeResult.dataQuality.mixedCurrency === false, 'complete case mixed currency false');
  check(completeResult.confidence.level === 'medium', 'complete case confidence object level');
  check(completeResult.confidence.score === 72, 'complete case confidence score');
  check(completeResult.warnings.length === 0, 'complete case warnings empty');
  check(completeResult.blockers.length === 0, 'complete case blockers empty');
  check(completeResult.doubleCountWarnings.length === 0, 'complete case double-count warnings empty');
  check(completeResult.currencyWarnings.length === 0, 'complete case currency warnings empty');
  check(completeResult.missingFields.length === 0, 'complete case missing fields empty');
  check(completeResult.invalidFields.length === 0, 'complete case invalid fields empty');
  check(completeResult.summaryText === 'Operasyonel maliyet önizlemesi hazırlandı; herhangi bir ödeme, fatura veya muhasebe kaydı oluşturulmadı.', 'complete case summary text');
  check(completeResult.nextSafeStepText === 'Sıradaki güvenli aşama: ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01.', 'complete case next step text');
  check(Array.isArray(completeResult.evidence) && completeResult.evidence.length > 0, 'complete case evidence present');
  check(Array.isArray(completeResult.formulaTrace) && completeResult.formulaTrace.length > 0, 'complete case formula trace present');

  const previewInput = buildPreviewInput();
  const previewResult = model.buildOperationalCostModel(previewInput);
  check(previewResult.status === 'partial', 'preview case status');
  check(previewResult.baselineOperationalCostMinor === 67675, 'preview case baseline');
  check(previewResult.externalPreviewAdjustmentsMinor === -250, 'preview case adjustment amount');
  check(previewResult.adjustedPreviewCostMinor === 67425, 'preview case adjusted preview');
  check(component(previewResult, 'external_preview_adjustments').amountMinor === -250, 'preview case negative adjustment preserved');
  check(component(previewResult, 'external_preview_adjustments').status === 'excluded', 'preview case adjustment remains excluded');
  check(previewResult.summaryText === 'Operasyonel maliyet önizlemesi hazırlandı; bazı uyarılar var ama herhangi bir ödeme, fatura veya muhasebe kaydı oluşturulmadı.', 'preview case summary text');
  check(previewResult.readOnly === true && previewResult.previewOnly === true && previewResult.writeAction === false, 'preview case boundary flags');

  const blockedInput = buildBlockedInput();
  const blockedResult = model.buildOperationalCostModel(blockedInput);
  check(blockedResult.status === 'blocked', 'blocked case status');
  check(blockedResult.blockers.includes('mixed currency not allowed'), 'blocked case mixed currency blocker');
  check(blockedResult.currencyWarnings.some((line) => line.includes('Mixed currency not allowed: TRY, USD')), 'blocked case currency warning');
  check(blockedResult.normalizedInput._currencyCandidates.length === 2, 'blocked case currency candidates');
  check(blockedResult.readOnly === true && blockedResult.writeAction === false, 'blocked case boundary flags');

  const incompleteInput = buildIncompleteInput();
  const incompleteResult = model.buildOperationalCostModel(incompleteInput);
  check(incompleteResult.status === 'incomplete', 'incomplete case status');
  check(incompleteResult.missingFields.includes('distance inputs'), 'incomplete case missing distance input');
  check(component(incompleteResult, 'vehicle_variable').status === 'incomplete', 'incomplete case vehicle variable incomplete');
  check(component(incompleteResult, 'vehicle_variable').includedInBaseline === false, 'incomplete case vehicle variable excluded');
  check(incompleteResult.blockers.length === 0, 'incomplete case has no blockers');
  check(incompleteResult.baselineOperationalCostMinor === 0, 'incomplete case zero baseline');

  runOperationalCostModelExpansionChecks(check, component);

  eachLacks(modelText, [
    'fetch(',
    'axios',
    'http://',
    'https://',
    'prisma',
    'mongoose',
    'MongoClient',
    'writeAction: true',
    'payment execute',
    'invoice create',
    'route apply',
    'dispatch apply',
  ], 'model source');

  eachLacks(mathText, [
    'fetch(',
    'axios',
    'http://',
    'https://',
    'prisma',
    'mongoose',
    'MongoClient',
  ], 'math source');

  mustNoDiffExceptWithIdentity(
    ['backend/src/routes'],
    [...financeOwnedRouteEntries, ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF],
    'backend/src/routes diff limited to finance-owned and approved concurrent runtime paths',
  );
  mustNoDiffExceptWithIdentity(
    ['backend/src/services'],
    [...financeOwnedServiceEntries, ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF],
    'backend/src/services diff limited to finance-owned runtime paths',
  );
  assertEmptyDiff(['prisma'], 'prisma diff empty');
  assertEmptyDiff(['prisma'], 'prisma diff empty');
  assertCommandOutputEmpty(['diff', '--check'], 'git diff --check clean');
  assertCommandOutputEmpty(['diff', '--cached', '--check'], 'git diff --cached --check clean');
  assertCommandOutputEmpty(['diff', '--cached', '--name-only'], 'stage empty');
  check(!exists('debug.log'), 'debug.log absent');

  check(guardCases >= 130, `guard case minimum preserved: ${guardCases}`);
  console.log(`modelLineCount=${fileLines(modelPath)} mathLineCount=${fileLines(mathPath)} docLineCount=${fileLines(docPath)}`);
  console.log(`registrySummary=${registry.componentCount} components | ${registry.componentKeys.join(' -> ')}`);
  console.log(`boundarySummary=${completeResult.readOnly ? 'read-only' : 'mutable'} | preview-only=${completeResult.previewOnly}`);
  console.log(`diffSummary=route/service/prisma/backend_prisma clean`);
  console.log(`PASS OPERATIONAL-COST-MODEL-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  console.log(`FAIL OPERATIONAL-COST-MODEL-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
  process.exit(1);
}
