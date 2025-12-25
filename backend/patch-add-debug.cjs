const fs = require("fs");

const p = "server.js";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

// zaten var mi?
const hasBuild  = /app\.get\(\s*["']\/api\/_build["']/.test(s);
const hasRoutes = /app\.get\(\s*["']\/api\/_routes["']/.test(s);

if (hasBuild && hasRoutes) {
  console.log("OK: /api/_build ve /api/_routes zaten var.");
  process.exit(0);
}

// ping'i bul
const m = s.match(/app\.get\(\s*["']\/api\/_ping["']/);
if (!m) {
  console.error("PATCH FAIL: /api/_ping bulunamadi.");
  process.exit(1);
}
const start = m.index;

// ping route kapanisini brace-scan ile bul
function findRouteEnd(idx) {
  const arrow = s.indexOf("=>", idx);
  if (arrow < 0) return -1;

  const braceStart = s.indexOf("{", arrow);
  if (braceStart < 0) return -1;

  let depth = 0;
  let inStr = null;
  let esc = false;

  for (let i = braceStart; i < s.length; i++) {
    const ch = s[i];

    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === inStr) { inStr = null; continue; }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") { inStr = ch; continue; }

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const close = s.indexOf(");", i);
        if (close < 0) return -1;
        return close + 2;
      }
    }
  }
  return -1;
}

const end = findRouteEnd(start);
if (end < 0) {
  console.error("PATCH FAIL: /api/_ping kapanisi bulunamadi.");
  process.exit(1);
}

const stamp = new Date().toISOString();

let insert = "\n";

if (!hasBuild) {
  insert += `
/* DEBUG: build stamp */
app.get("/api/_build", (req, res) => {
  res.json({ ok: true, build: "${stamp}" });
});
`;
}

if (!hasRoutes) {
  insert += `
/* DEBUG: list registered routes */
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
`;
}

insert += "\n";

s = s.slice(0, end) + insert + s.slice(end);

fs.writeFileSync(p, s, "utf8");
console.log("OK: debug endpointleri eklendi:", { added_build: !hasBuild, added_routes: !hasRoutes });
