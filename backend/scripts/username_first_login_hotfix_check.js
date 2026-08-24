import fs from "fs";
import path from "path";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS } from "./lib/guardGitScope.js";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");


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
function ok(msg){ console.log(`OK ${msg}`); }
function fail(msg){ console.error(`FAIL ${msg}`); process.exitCode = 1; }
function read(rel){ return fs.readFileSync(path.join(root, rel), "utf8"); }

console.log("=== USERNAME-FIRST LOGIN HOTFIX CHECK ===");
const files = [
  "backend/src/auth/usernameDirectory.js",
  "backend/src/routes/auth.js",
  "backend/src/routes/admin.js",
  "backend/src/routes/me.js",
  APP_JSX_ROLE_TENANT_SCOPE_PATHS[0],
  "web/src/panels/superadmin/UsersPanel.jsx",
  "backend/src/auth/usernameDirectory.js",
];
for (const rel of files) {
  if (fs.existsSync(path.join(root, rel))) ok(`${rel} exists`);
  else fail(`${rel} missing`);
}
if (!fs.existsSync(path.join(root, "backend/data/username-directory.json"))) ok("backend/data/username-directory.json runtime file not tracked (expected)");
const auth = read("backend/src/routes/auth.js");
if (includesText(auth, "resolveUserIdByUsername")) ok("auth username lookup enabled"); else fail("auth username lookup missing");
if (includesText(auth, "username: getEffectiveUsername(user)")) ok("auth login response exposes username"); else fail("auth login response username missing");
const admin = read("backend/src/routes/admin.js");
if (includesText(admin, "username: z.string()")) ok("admin create schema has username"); else fail("admin create schema username missing");
if (includesText(admin, "Kullanıcı adı zaten kullanılıyor")) ok("admin enforces unique username"); else fail("admin unique username guard missing");
if (includesText(admin, "getUserLoginMeta")) ok("admin maps username/email view"); else fail("admin login meta mapping missing");
console.log("=== USERNAME-FIRST LOGIN HOTFIX CHECK PASS ===");
if (process.exitCode) process.exit(process.exitCode);
