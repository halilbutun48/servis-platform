const fs = require("fs");

const p = "server.js";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

const hasLast = /app\.get\(\s*["']\/api\/gps\/last["']/.test(s);
if (hasLast) {
  console.log("OK: /api/gps/last zaten var.");
  process.exit(0);
}

const m = s.match(/app\.get\(\s*["']\/api\/_ping["']/);
if (!m) {
  console.error("PATCH FAIL: /api/_ping route bulunamadi. server.js yapisi farkli.");
  process.exit(1);
}

const start = m.index;

// /api/_ping route'un kapanisini bulmak icin basit brace-scan
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

const insert = `

/**
 * GPS LAST (UI fallback)
 * Public endpoint: /api/gps/last?vehicleId=1
 */
app.get("/api/gps/last", async (req, res) => {
  try {
    const vehicleId = Number(req.query.vehicleId || 0);
    const where = vehicleId ? { vehicleId } : {};
    const last = await prisma.gpsLog.findFirst({
      where,
      orderBy: { recordedAt: "desc" },
    });
    res.json({ ok: true, last });
  } catch (e) {
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// DEBUG: build stamp (cache/proxy test)
app.get("/api/_build", (req, res) => {
  res.json({ ok: true, build: "${stamp}" });
});

// DEBUG: list registered routes
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

s = s.slice(0, end) + insert + s.slice(end);

// UTF-8 BOM'suz yaz
fs.writeFileSync(p, s, "utf8");
console.log("OK: /api/gps/last + /api/_build + /api/_routes eklendi.");
