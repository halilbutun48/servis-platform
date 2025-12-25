const fs = require("fs");

const p = "server.js";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

const stamp = new Date().toISOString().replace(/[-:T]/g,"").slice(0,15);

const hasBuild  = /app\.get\(\s*["']\/api\/_build["']/.test(s);
const hasRoutes = /app\.get\(\s*["']\/api\/_routes["']/.test(s);

if (hasBuild && hasRoutes) {
  console.log("OK: /api/_build ve /api/_routes zaten var");
  process.exit(0);
}

// /api/_ping bloğunu bulup hemen altına ekle
const rePing = /app\.get\(\s*["']\/api\/_ping["'][\s\S]*?\n\}\);\s*\n/;
const m = s.match(rePing);
if (!m) {
  console.error("HATA: /api/_ping bloğu bulunamadı (app.get('/api/_ping'...) )");
  process.exit(1);
}

let insert = "";

if (!hasBuild) {
  insert += `app.get("/api/_build", (req, res) => res.json({ ok: true, build: "${stamp}" }));\n\n`;
}

if (!hasRoutes) {
  insert += `
app.get("/api/_routes", (req, res) => {
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
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});
\n`;
}

const bak = `server.js.bak_dbg_${stamp}`;
fs.writeFileSync(bak, s, "utf8");

s = s.replace(rePing, (x) => x + insert);
fs.writeFileSync(p, s, "utf8");

console.log("PATCH OK: dbg routes eklendi");
console.log("Backup =>", bak);
