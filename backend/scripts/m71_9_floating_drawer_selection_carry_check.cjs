const fs = require('fs');
const path = require('path');

const repoRoot = process.argv[2] || process.cwd();


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}

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

ok(includesText(drawer, 'function normalizeScopePath(path)'), 'drawer normalizes scope path');
ok(includesText(drawer, 'scopeFamily(path)'), 'drawer computes scope family');
ok(includesText(drawer, 'selection?.entityType || ""'), 'drawer sends selected entity type');
ok(includesText(drawer, 'selectedEntityId: Number(selection?.entityId || 0) || null'), 'drawer sends selected entity id');
ok(includesText(drawer, 'if (q) return q;'), 'drawer sends raw user question');
ok(includesText(panel, 'function normalizeScopePath(path)'), 'panel normalizes scope path');
ok(includesText(panel, 'scopeFamily(path)'), 'panel computes scope family');

if (process.exitCode) {
  console.error('=== M71.9 FLOATING DRAWER SELECTION CARRY CHECK FAIL ===');
  process.exit(process.exitCode);
}
console.log('=== M71.9 FLOATING DRAWER SELECTION CARRY CHECK PASS ===');
