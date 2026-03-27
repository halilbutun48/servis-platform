const fs = require('fs');
const path = require('path');

const repoRoot = process.argv[2] || process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL ' + msg);
    process.exitCode = 1;
  } else {
    console.log('OK ' + msg);
  }
}

console.log('=== M71.9 FLOATING DRAWER SELECTION CARRY CHECK ===');

const drawer = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const panel = read('web/src/panels/shared/CopilotPanel.jsx');

ok(drawer.includes('function normalizeScopePath(path)'), 'drawer normalizes scope path');
ok(drawer.includes('scopeFamily(path)'), 'drawer computes scope family');
ok(drawer.includes('selection?.entityType || ""'), 'drawer sends selected entity type');
ok(drawer.includes('selectedEntityId: Number(selection?.entityId || 0) || null'), 'drawer sends selected entity id');
ok(drawer.includes('if (q) return q;'), 'drawer sends raw user question');
ok(panel.includes('function normalizeScopePath(path)'), 'panel normalizes scope path');
ok(panel.includes('scopeFamily(path)'), 'panel computes scope family');

if (process.exitCode) {
  console.error('=== M71.9 FLOATING DRAWER SELECTION CARRY CHECK FAIL ===');
  process.exit(process.exitCode);
}
console.log('=== M71.9 FLOATING DRAWER SELECTION CARRY CHECK PASS ===');
