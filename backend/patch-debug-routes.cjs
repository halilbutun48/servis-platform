const fs = require("fs");

const stamp = process.env.BUILD_STAMP || "dev";
const file = "server.js";

let s = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");

if (s.includes("/api/_build") || s.includes("/api/_routes")) {
  console.log("OK: debug routes already exist");
  process.exit(0);
}

const m = s.match(/^\s*const\s+app\s*=\s*express\(\)\s*;?\s*$/m);
if (!m) {
  console.error("PATCH FAIL: 'const app = express()' not found");
  process.exit(1);
}

const insert = `

// DEBUG endpoints
app.get('/api/_build', (req, res) => res.json({ ok: true, build: '${stamp}' }));

app.get('/api/_routes', (req, res) => {
  try {
    const stack = (app._router && app._router.stack) || (app.router && app.router.stack) || [];
    const routes = [];
    for (const layer of stack) {
      if (layer && layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods || {}).filter(k => layer.route.methods[k]);
        routes.push({ path: layer.route.path, methods });
      }
    }
    res.json({ ok: true, routes });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

`;

s = s.replace(m[0], m[0] + insert);
fs.writeFileSync(file, s, "utf8");
console.log("OK: debug routes injected. build =", stamp);
