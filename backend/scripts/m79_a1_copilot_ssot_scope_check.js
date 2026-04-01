import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const repoRoot = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

let failed = false;
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { failed = true; console.error(`FAIL ${msg}`); }
function exists(rel) {
  const full = path.join(repoRoot, rel);
  if (fs.existsSync(full)) ok(`${rel} exists`); else fail(`${rel} missing`);
}
function includes(text, needle, msg) {
  if (text.includes(needle)) ok(msg); else fail(msg);
}
function notIncludes(text, needle, msg) {
  if (!text.includes(needle)) ok(msg); else fail(msg);
}

console.log('=== M79 A1 COPILOT SSOT + SCOPE CHECK ===');

exists('web/src/copilot/screenRegistry.js');
exists('web/src/layout/NavDock.jsx');
exists('web/src/components/copilot/FloatingCopilotDrawer.jsx');
exists('web/src/panels/company/CommercialFlowPanel.jsx');
exists('web/src/panels/company/GeoReviewPanel.jsx');
exists('web/src/panels/company/ServiceEvaluationPanel.jsx');

const registry = read('web/src/copilot/screenRegistry.js');
const navDock = read('web/src/layout/NavDock.jsx');
const drawer = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const commercial = read('web/src/panels/company/CommercialFlowPanel.jsx');
const geo = read('web/src/panels/company/GeoReviewPanel.jsx');
const evalPanel = read('web/src/panels/company/ServiceEvaluationPanel.jsx');

includes(registry, 'export function getCopilotScreenOptions', 'screen registry exports screen options');
includes(registry, 'export function getCopilotMenuEntry', 'screen registry exports copilot menu entry');
includes(registry, 'export function resolveRuntimeScopeKey', 'screen registry exports runtime scope resolver');
includes(registry, 'ORGANIZATION', 'screen registry includes organization role');
includes(registry, 'SUPER_ADMIN', 'screen registry includes super admin role');
includes(registry, '/room/commercial-flow', 'screen registry includes room commercial flow');
includes(registry, '/superadmin/operation-verification', 'screen registry includes operation verification');

includes(navDock, 'getCopilotMenuEntry', 'nav dock consumes shared copilot menu entry');
notIncludes(navDock, 'Copilot Test', 'nav dock no longer shows Copilot Test');
includes(navDock, 'copilotEntry.label', 'nav dock uses shared copilot label');

includes(drawer, 'resolveCopilotScreenContext', 'floating drawer consumes shared screen context resolver');
notIncludes(drawer, 'Copilot Test', 'floating drawer no longer shows Copilot Test');
notIncludes(drawer, 'function buildScreenOptions', 'floating drawer local screen option table removed');

for (const [name, text] of [['CommercialFlowPanel', commercial], ['GeoReviewPanel', geo], ['ServiceEvaluationPanel', evalPanel]]) {
  includes(text, 'resolveRuntimeScopeKey', `${name} imports runtime scope resolver`);
  includes(text, 'const copilotScopeKey = useMemo(() => resolveRuntimeScopeKey(getPath(),', `${name} computes runtime-aware scope key`);
  includes(text, 'scopeKey: copilotScopeKey', `${name} writes runtime-aware scope key`);
  notIncludes(text, 'scopeKey: "/company/', `${name} no longer hardcodes company-only scope key`);
}

if (failed) {
  console.error('CHECK FAIL M79 A1 copilot ssot + scope');
  process.exit(1);
}

console.log('PASS M79 A1 copilot ssot + scope check');
