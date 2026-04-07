import fs from "fs";
import path from "path";

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
function must(rel, pattern, message) {
  const full = path.join(root, rel);
  const txt = fs.readFileSync(full, "utf8");
  if (!includesText(txt, pattern)) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
  console.log(`OK ${message}`);
}

must("backend/src/routes/auth.js", 'authRouter.post("/change-password"', "auth change-password route exists");
must("backend/src/routes/auth.js", "pwdChangeOnly", "limited token flag exists");
must("backend/src/routes/admin.js", "markPasswordChangeRequired", "admin marks password change required");
must("backend/src/routes/me.js", "requirePasswordChange", "me route exposes password change flag");
must("web/src/panels/shared/ForcePasswordChangePanel.jsx", "Şifrenizi değiştirin", "force password panel exists");
must("web/src/App.jsx", '"/auth/change-password"', "app routes to forced password page");
console.log("PASS password force change check");
