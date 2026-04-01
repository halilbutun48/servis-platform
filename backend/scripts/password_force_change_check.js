import fs from "fs";
import path from "path";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");
function must(rel, pattern, message) {
  const full = path.join(root, rel);
  const txt = fs.readFileSync(full, "utf8");
  if (!txt.includes(pattern)) {
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
