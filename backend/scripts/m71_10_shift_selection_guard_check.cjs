const fs = require('fs');
const path = require('path');
const root = process.argv[2] || process.cwd();


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
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL ' + msg);
    process.exitCode = 1;
  } else {
    console.log('OK ' + msg);
  }
}
console.log('=== M71.10 SHIFT SELECTION + SHIFTS SCREEN GUARD CHECK ===');
const shifts = read('web/src/panels/company/ShiftsPanel.jsx');
ok(includesText(shifts, 'if (trackTab === "market") return marketItems[0] || null;'), 'company shifts picks first market row for copilot selection');
ok(includesText(shifts, 'if (trackTab === "pending") return pendingItems[0] || null;'), 'company shifts picks first pending row for copilot selection');
ok(includesText(shifts, 'return finalItems[0] || null;'), 'company shifts picks first final row for copilot selection');
const help = read('backend/src/ai/chat/helpComposer.js');
const entityRuntime = read('backend/src/ai/chat/helpComposerEntityRuntime.js');
ok(includesText(entityRuntime, 'function isShiftTrackingScreen(screenDefinition)'), 'helpComposer has shifts-screen guard helper');
ok(includesText(entityRuntime, 'function shiftScreenNoSelectionReply(questionType, screenDefinition)'), 'helpComposer has no-selection reply helper');
ok(includesText(help, "entityType === 'screen' && isShiftTrackingScreen(screenDefinition)"), 'helpComposer guards shifts screen record questions');
if (process.exitCode) {
  console.error('=== M71.10 CHECK FAIL ===');
  process.exit(process.exitCode);
}
console.log('=== M71.10 CHECK PASS ===');
