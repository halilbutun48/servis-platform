import fs from "fs";
import path from "path";

const root = process.cwd();
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
  "backend/data/username-directory.json",
];
for (const rel of files) {
  if (fs.existsSync(path.join(root, rel))) ok(`${rel} exists`);
  else fail(`${rel} missing`);
}
const auth = read("backend/src/routes/auth.js");
if (auth.includes("resolveUserIdByUsername")) ok("auth username lookup enabled"); else fail("auth username lookup missing");
if (auth.includes("username: getEffectiveUsername(user)")) ok("auth login response exposes username"); else fail("auth login response username missing");
const admin = read("backend/src/routes/admin.js");
if (admin.includes("username: z.string()")) ok("admin create schema has username"); else fail("admin create schema username missing");
if (admin.includes("Kullanıcı adı zaten kullanılıyor")) ok("admin enforces unique username"); else fail("admin unique username guard missing");
if (admin.includes("getUserLoginMeta")) ok("admin maps username/email view"); else fail("admin login meta mapping missing");
const me = read("backend/src/routes/me.js");
if (me.includes("username: getEffectiveUsername(u)")) ok("me exposes username"); else fail("me username missing");
const app = read("web/src/App.jsx");
if (app.includes("Kullanıcı Adı, E-posta veya Sürücü Kodu")) ok("login screen label updated"); else fail("login screen label not updated");
const users = read("web/src/panels/superadmin/UsersPanel.jsx");
if (users.includes("Kullanıcı Adı")) ok("users panel username field visible"); else fail("users panel username field missing");
if (users.includes("Kullanıcı adını kopyala")) ok("users panel username copy action visible"); else fail("users panel username copy action missing");
if (process.exitCode) throw new Error("username first login hotfix check failed");
console.log("PASS username-first login hotfix check");
