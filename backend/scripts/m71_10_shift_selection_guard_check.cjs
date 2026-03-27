const fs = require('fs');
const path = require('path');
const root = process.argv[2] || process.cwd();
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
ok(shifts.includes('if (trackTab === "market") return marketItems[0] || null;'), 'company shifts picks first market row for copilot selection');
ok(shifts.includes('if (trackTab === "pending") return pendingItems[0] || null;'), 'company shifts picks first pending row for copilot selection');
ok(shifts.includes('return finalItems[0] || null;'), 'company shifts picks first final row for copilot selection');
const help = read('backend/src/ai/chat/helpComposer.js');
ok(help.includes('function isShiftTrackingScreen(screenDefinition)'), 'helpComposer has shifts-screen guard helper');
ok(help.includes('function shiftScreenNoSelectionReply(questionType, screenDefinition)'), 'helpComposer has no-selection reply helper');
ok(help.includes("entityType === 'screen' && isShiftTrackingScreen(screenDefinition)"), 'helpComposer guards shifts screen record questions');
if (process.exitCode) {
  console.error('=== M71.10 CHECK FAIL ===');
  process.exit(process.exitCode);
}
console.log('=== M71.10 CHECK PASS ===');
