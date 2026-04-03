const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'App.js');
const t = fs.readFileSync(p, 'utf8');
console.log('=== M81.2C APP.JS SYNTAX FIX CHECK ===');
if (!t.includes('options.canOpenSettings ?? ((foregroundPermission?.canAskAgain === false) || (backgroundPermission?.canAskAgain === false))')) {
  console.error('FAIL expected nullish/logical expression not fixed');
  process.exit(1);
}
console.log('OK nullish/logical expression safely parenthesized');
console.log('=== M81.2C APP.JS SYNTAX FIX CHECK PASS ===');
