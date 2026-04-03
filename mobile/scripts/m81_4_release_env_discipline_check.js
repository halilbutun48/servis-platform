const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const appJson = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
const easJson = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");

let okCount = 0;
let failCount = 0;
function ok(message) {
  okCount += 1;
  console.log(`OK ${message}`);
}
function fail(message) {
  failCount += 1;
  console.log(`FAIL ${message}`);
}
function expect(condition, message) {
  if (condition) ok(message);
  else fail(message);
}

console.log("=== M81.4 RELEASE / ENV DISCIPLINE CHECK ===");

expect(packageJson.scripts && packageJson.scripts["check:m81.4"] === "node scripts/m81_4_release_env_discipline_check.js", "check:m81.4 script present in package json");
expect(packageJson.scripts && typeof packageJson.scripts["doctor:mobile"] === "string", "doctor:mobile script present in package json");
expect(packageJson.version === appJson.expo.version, "package version matches expo app version");
expect(appJson.expo?.extra?.releaseStage === "m81-mobile-saha-sertlestirme", "app release stage moved to m81 mobile saha sertlestirme");
expect(easJson.build?.preview?.env?.EXPO_PUBLIC_RELEASE_STAGE === "preview-internal", "eas preview release stage present");
expect(easJson.build?.production?.env?.EXPO_PUBLIC_RELEASE_STAGE === "production", "eas production release stage present");
expect(typeof easJson.build?.preview?.env?.EXPO_PUBLIC_API_BASE_URL === "string" && easJson.build.preview.env.EXPO_PUBLIC_API_BASE_URL.length > 0, "eas preview api base url present");
expect(typeof easJson.build?.production?.env?.EXPO_PUBLIC_API_BASE_URL === "string" && easJson.build.production.env.EXPO_PUBLIC_API_BASE_URL.length > 0, "eas production api base url present");
expect(!/trycloudflare\.com/i.test(easJson.build?.preview?.env?.EXPO_PUBLIC_API_BASE_URL || ""), "eas preview api base url not tied to temporary cloudflare tunnel");
expect(!/trycloudflare\.com/i.test(envExample), ".env.example does not contain temporary cloudflare tunnel");
expect(/EXPO_PUBLIC_API_BASE_URL=/.test(envExample), ".env.example includes api base url example");
expect(/EXPO_PUBLIC_RELEASE_STAGE=preview-internal/.test(envExample), ".env.example includes preview release stage example");
expect(easJson.build?.preview?.android?.buildType === "apk", "eas preview android buildType remains apk");
expect(!!easJson.build?.preview?.ios, "eas preview ios profile present");
expect(!!easJson.build?.["preview-simulator"]?.ios?.simulator, "eas preview-simulator ios profile present");
expect(!!easJson.build?.production?.ios, "eas production ios profile present");

if (failCount > 0) {
  console.log(`=== M81.4 RELEASE / ENV DISCIPLINE CHECK FAIL (${failCount}) ===`);
  process.exit(1);
}
console.log(`=== M81.4 RELEASE / ENV DISCIPLINE CHECK PASS (${okCount}) ===`);