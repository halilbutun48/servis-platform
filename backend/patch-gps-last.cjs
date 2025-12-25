const fs = require("fs");

const p = "server.js";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

if (s.includes('"/api/gps/last"')) {
  console.log("OK: /api/gps/last zaten var");
  process.exit(0);
}

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

const idx = s.search(/app\.listen\s*\(/);
if (idx === -1) {
  console.error("HATA: server.js içinde app.listen bulunamadı");
  process.exit(1);
}

const bak = `server.js.bak_gpslast_${new Date().toISOString().replace(/[-:T]/g,"").slice(0,15)}`;
fs.writeFileSync(bak, s, "utf8");

s = s.slice(0, idx) + insert + s.slice(idx);
fs.writeFileSync(p, s, "utf8");

console.log("PATCH OK: /api/gps/last eklendi");
console.log("Backup =>", bak);
