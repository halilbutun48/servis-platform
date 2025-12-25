const fs = require("fs");

const p = "server.js";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

if (s.includes('app.get("/api/gps/last"') || s.includes("app.get('/api/gps/last'")) {
  console.log("OK: /api/gps/last zaten var");
  process.exit(0);
}

const idx = s.indexOf('app.get("/api/_ping"');
const idx2 = s.indexOf("app.get('/api/_ping'");
const start = idx !== -1 ? idx : idx2;

if (start === -1) {
  console.error('HATA: server.js içinde /api/_ping route bulunamadı. (app.get("/api/_ping") yok)');
  process.exit(1);
}

// /api/_ping route'unun kapanışını bul (ilk ");" / "});" sonrası)
let end = s.indexOf("});", start);
if (end === -1) end = s.indexOf(");", start);
if (end === -1) {
  console.error("HATA: /api/_ping bloğunun sonu bulunamadı");
  process.exit(1);
}
end = s.indexOf("\n", end);
if (end === -1) end = s.length;

const insert = `

// GPS LAST (UI fallback)
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

`;

const stamp = new Date().toISOString().replace(/[-:T]/g,"").slice(0,15);
const bak = `server.js.bak_gpslast_${stamp}`;
fs.writeFileSync(bak, s, "utf8");

s = s.slice(0, end) + insert + s.slice(end);
fs.writeFileSync(p, s, "utf8");

console.log("PATCH OK: /api/gps/last eklendi");
console.log("Backup =>", bak);
