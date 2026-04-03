const fs = require("fs");
const path = require("path");

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }

console.log("=== M81.2B BUNDLE CHAIN CHECK ===");
const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const babelPath = path.join(root, "babel.config.js");
const checkerPath = path.join(root, "scripts", "m81_2b_bundle_chain_check.js");

if (!fs.existsSync(pkgPath)) {
  fail("package.json present");
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
if (pkg.scripts && pkg.scripts["check:m81.2b"] === "node scripts/m81_2b_bundle_chain_check.js") ok("check:m81.2b script present in package json");
else fail("check:m81.2b script present in package json");

if (pkg.devDependencies && pkg.devDependencies["babel-preset-expo"]) ok("babel-preset-expo present in devDependencies");
else fail("babel-preset-expo present in devDependencies");

if (fs.existsSync(babelPath)) {
  const txt = fs.readFileSync(babelPath, "utf8");
  if (/babel-preset-expo/.test(txt)) ok("babel config references babel-preset-expo");
  else fail("babel config references babel-preset-expo");
} else {
  fail("babel.config.js present");
}

if (fs.existsSync(checkerPath)) ok("m81.2b checker file present");
else fail("m81.2b checker file present");

if (process.exitCode && process.exitCode !== 0) {
  console.error("=== M81.2B BUNDLE CHAIN CHECK FAIL ===");
  process.exit(process.exitCode);
}
console.log("=== M81.2B BUNDLE CHAIN CHECK PASS ===");
