import fs from "fs";
import path from "path";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");
function ok(msg){ console.log(`OK ${msg}`); }
function fail(msg){ console.error(`FAIL ${msg}`); process.exitCode = 1; }
function read(rel){ return fs.readFileSync(path.join(root, rel), "utf8"); }

console.log("=== USERNAME-FIRST LOGIN HOTFIX CHECK ===");
const files = [
  "backend/src/auth/usernameDirectory.js",
  "backend/src/routes/auth.js",
  "backend/src/routes/admin.js",
  "backend/src/routes/me.js",
  "web/src/App.jsx",
  "web/src/panels/superadmin/UsersPanel.jsx",
  "backend/src/auth/usernameDirectory.js",
];
for (const rel of files) {
  if (fs.existsSync(path.join(root, rel))) ok(`${rel} exists`);
  else fail(`${rel} missing`);
}
if (!fs.existsSync(path.join(root, "backend/data/username-directory.json"))) ok("backend/data/username-directory.json runtime file not tracked (expected)");
const auth = read("backend/src/routes/auth.js");
if (auth.includes("resolveUserIdByUsername")) ok("auth username lookup enabled"); else fail("auth username lookup missing");
if (auth.includes("username: getEffectiveUsername(user)")) ok("auth login response exposes username"); else fail("auth login response username missing");
const admin = read("backend/src/routes/admin.js");
if (admin.includes("username: z.string()")) ok("admin create schema has username"); else fail("admin create schema username missing");
if (admin.includes("Kullanıcı adı zaten kullanılıyor")) ok("admin enforces unique username"); else fail("admin unique username guard missing");
if (admin.includes("getUserLoginMeta")) ok("admin maps username/email view"); else fail("admin login meta mapping missing");
console.log("=== USERNAME-FIRST LOGIN HOTFIX CHECK PASS ===");
if (process.exitCode) process.exit(process.exitCode);
