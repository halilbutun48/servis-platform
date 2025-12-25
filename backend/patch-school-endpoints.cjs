const fs = require("fs");

const p = "server.js";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

const marker = "// --- SCHOOL_ADMIN: vehicles/routes/stops ---";
if (s.includes(marker)) {
  console.log("OK: school admin block zaten var");
  process.exit(0);
}

const block = `\n${marker}\n\
// Not: auth middleware'in req.user.id set ettiğini varsayıyoruz (api/me zaten böyle çalışıyor).\n\
async function loadMe(req, res, next) {\n\
  try {\n\
    const me = await prisma.user.findUnique({\n\
      where: { id: req.user.id },\n\
      select: { id: true, role: true, schoolId: true, email: true },\n\
    });\n\
    if (!me) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });\n\
    req.me = me;\n\
    next();\n\
  } catch (e) {\n\
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });\n\
  }\n\
}\n\
\n\
function requireSchool(req, res, next) {\n\
  if (!req.me?.schoolId) return res.status(400).json({ ok: false, error: "NO_SCHOOL" });\n\
  next();\n\
}\n\
\n\
// School me\n\
app.get("/api/school/me", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {\n\
  const school = await prisma.school.findUnique({\n\
    where: { id: req.me.schoolId },\n\
    select: { id: true, name: true, lat: true, lon: true, createdAt: true },\n\
  });\n\
  res.json({ ok: true, school });\n\
});\n\
\n\
app.put("/api/school/me/location", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {\n\
  const { lat, lon } = req.body || {};\n\
  const updated = await prisma.school.update({\n\
    where: { id: req.me.schoolId },\n\
    data: { lat: lat == null ? null : Number(lat), lon: lon == null ? null : Number(lon) },\n\
    select: { id: true, name: true, lat: true, lon: true },\n\
  });\n\
  res.json({ ok: true, school: updated });\n\
});\n\
\n\
// Vehicles\n\
app.get("/api/school/vehicles", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {\n\
  const vehicles = await prisma.vehicle.findMany({\n\
    where: { schoolId: req.me.schoolId },\n\
    orderBy: { id: "asc" },\n\
    select: {\n\
      id: true, plate: true, schoolId: true, driverUserId: true, createdAt: true,\n\
      driver: { select: { id: true, email: true, role: true } },\n\
    },\n\
  });\n\
  res.json({ ok: true, vehicles });\n\
});\n\
\n\
app.post("/api/school/vehicles", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {\n\
  const { plate, driverUserId } = req.body || {};\n\
  if (!plate) return res.status(400).json({ ok: false, error: "BAD_INPUT" });\n\
\n\
  let driverId = driverUserId == null ? null : Number(driverUserId);\n\
  if (driverId) {\n\
    const driver = await prisma.user.findFirst({\n\
      where: { id: driverId, role: "DRIVER", schoolId: req.me.schoolId },\n\
      select: { id: true },\n\
    });\n\
    if (!driver) return res.status(400).json({ ok: false, error: "BAD_DRIVER" });\n\
  }\n\
\n\
  try {\n\
    const created = await prisma.vehicle.create({\n\
      data: { plate: String(plate), schoolId: req.me.schoolId, driverUserId: driverId },\n\
      select: { id: true, plate: true, schoolId: true, driverUserId: true, createdAt: true },\n\
    });\n\
    res.json({ ok: true, vehicle: created });\n\
  } catch (e) {\n\
    return res.status(400).json({ ok: false, error: "CREATE_FAILED" });\n\
  }\n\
});\n\
\n\
app.put("/api/school/vehicles/:id", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {\n\
  const id = Number(req.params.id);\n\
  const { plate, driverUserId } = req.body || {};\n\
\n\
  const v = await prisma.vehicle.findFirst({ where: { id, schoolId: req.me.schoolId }, select: { id: true } });\n\
  if (!v) return res.status(404).json({ ok: false, error: "NOT_FOUND" });\n\
\n\
  let driverId = driverUserId == null || driverUserId === \"\" ? null : Number(driverUserId);\n\
  if (driverId) {\n\
    const driver = await prisma.user.findFirst({ where: { id: driverId, role: \"DRIVER\", schoolId: req.me.schoolId }, select: { id: true } });\n\
    if (!driver) return res.status(400).json({ ok: false, error: "BAD_DRIVER" });\n\
  }\n\
\n\
  try {\n\
    const updated = await prisma.vehicle.update({\n\
      where: { id },\n\
      data: { plate: plate ? String(plate) : undefined, driverUserId: driverId },\n\
      select: { id: true, plate: true, schoolId: true, driverUserId: true },\n\
    });\n\
    res.json({ ok: true, vehicle: updated });\n\
  } catch (e) {\n\
    return res.status(400).json({ ok: false, error: "UPDATE_FAILED" });\n\
  }\n\
});\n\
\n\
// Routes\n\
app.get("/api/school/routes", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {\n\
  const routes = await prisma.route.findMany({\n\
    where: { schoolId: req.me.schoolId },\n\
    orderBy: { id: \"asc\" },\n\
    select: {\n\
      id: true, name: true, schoolId: true, vehicleId: true, createdAt: true,\n\
      vehicle: { select: { id: true, plate: true } },\n\
      _count: { select: { stops: true } },\n\
    },\n\
  });\n\
  res.json({ ok: true, routes });\n\
});\n\
\n\
app.post("/api/school/routes", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {\n\
  const { name, vehicleId } = req.body || {};\n\
  if (!name) return res.status(400).json({ ok: false, error: \"BAD_INPUT\" });\n\
  let vid = vehicleId == null || vehicleId === \"\" ? null : Number(vehicleId);\n\
  if (vid) {\n\
    const v = await prisma.vehicle.findFirst({ where: { id: vid, schoolId: req.me.schoolId }, select: { id: true } });\n\
    if (!v) return res.status(400).json({ ok: false, error: \"BAD_VEHICLE\" });\n\
  }\n\
  const created = await prisma.route.create({\n\
    data: { name: String(name), schoolId: req.me.schoolId, vehicleId: vid },\n\
    select: { id: true, name: true, schoolId: true, vehicleId: true, createdAt: true },\n\
  });\n\
  res.json({ ok: true, route: created });\n\
});\n\
\n\
app.put("/api/school/routes/:id", auth, requireRole(\"SCHOOL_ADMIN\"), loadMe, requireSchool, async (req, res) => {\n\
  const id = Number(req.params.id);\n\
  const { name, vehicleId } = req.body || {};\n\
\n\
  const r = await prisma.route.findFirst({ where: { id, schoolId: req.me.schoolId }, select: { id: true } });\n\
  if (!r) return res.status(404).json({ ok: false, error: \"NOT_FOUND\" });\n\
\n\
  let vid = vehicleId == null || vehicleId === \"\" ? null : Number(vehicleId);\n\
  if (vid) {\n\
    const v = await prisma.vehicle.findFirst({ where: { id: vid, schoolId: req.me.schoolId }, select: { id: true } });\n\
    if (!v) return res.status(400).json({ ok: false, error: \"BAD_VEHICLE\" });\n\
  }\n\
\n\
  const updated = await prisma.route.update({\n\
    where: { id },\n\
    data: { name: name ? String(name) : undefined, vehicleId: vid },\n\
    select: { id: true, name: true, schoolId: true, vehicleId: true },\n\
  });\n\
  res.json({ ok: true, route: updated });\n\
});\n\
\n\
// Stops\n\
app.get(\"/api/school/routes/:id/stops\", auth, requireRole(\"SCHOOL_ADMIN\"), loadMe, requireSchool, async (req, res) => {\n\
  const routeId = Number(req.params.id);\n\
  const r = await prisma.route.findFirst({ where: { id: routeId, schoolId: req.me.schoolId }, select: { id: true } });\n\
  if (!r) return res.status(404).json({ ok: false, error: \"NOT_FOUND\" });\n\
\n\
  const stops = await prisma.routeStop.findMany({\n\
    where: { routeId },\n\
    orderBy: { ord: \"asc\" },\n\
    select: { id: true, routeId: true, ord: true, name: true, lat: true, lon: true },\n\
  });\n\
  res.json({ ok: true, stops });\n\
});\n\
\n\
app.post(\"/api/school/routes/:id/stops\", auth, requireRole(\"SCHOOL_ADMIN\"), loadMe, requireSchool, async (req, res) => {\n\
  const routeId = Number(req.params.id);\n\
  const { ord, name, lat, lon } = req.body || {};\n\
  if (!name || lat == null || lon == null) return res.status(400).json({ ok: false, error: \"BAD_INPUT\" });\n\
\n\
  const r = await prisma.route.findFirst({ where: { id: routeId, schoolId: req.me.schoolId }, select: { id: true } });\n\
  if (!r) return res.status(404).json({ ok: false, error: \"NOT_FOUND\" });\n\
\n\
  let ordNum = ord == null || ord === \"\" ? null : Number(ord);\n\
  if (!ordNum) {\n\
    const max = await prisma.routeStop.aggregate({ where: { routeId }, _max: { ord: true } });\n\
    ordNum = (max._max.ord || 0) + 1;\n\
  }\n\
\n\
  try {\n\
    const created = await prisma.routeStop.create({\n\
      data: { routeId, ord: ordNum, name: String(name), lat: Number(lat), lon: Number(lon) },\n\
      select: { id: true, routeId: true, ord: true, name: true, lat: true, lon: true },\n\
    });\n\
    res.json({ ok: true, stop: created });\n\
  } catch (e) {\n\
    return res.status(400).json({ ok: false, error: \"STOP_CREATE_FAILED\" });\n\
  }\n\
});\n\
\n\
app.put(\"/api/school/stops/:stopId\", auth, requireRole(\"SCHOOL_ADMIN\"), loadMe, requireSchool, async (req, res) => {\n\
  const stopId = Number(req.params.stopId);\n\
  const { ord, name, lat, lon } = req.body || {};\n\
\n\
  const stop = await prisma.routeStop.findUnique({ where: { id: stopId }, select: { id: true, routeId: true } });\n\
  if (!stop) return res.status(404).json({ ok: false, error: \"NOT_FOUND\" });\n\
\n\
  const r = await prisma.route.findFirst({ where: { id: stop.routeId, schoolId: req.me.schoolId }, select: { id: true } });\n\
  if (!r) return res.status(403).json({ ok: false, error: \"FORBIDDEN\" });\n\
\n\
  try {\n\
    const updated = await prisma.routeStop.update({\n\
      where: { id: stopId },\n\
      data: {\n\
        ord: ord == null || ord === \"\" ? undefined : Number(ord),\n\
        name: name ? String(name) : undefined,\n\
        lat: lat == null || lat === \"\" ? undefined : Number(lat),\n\
        lon: lon == null || lon === \"\" ? undefined : Number(lon),\n\
      },\n\
      select: { id: true, routeId: true, ord: true, name: true, lat: true, lon: true },\n\
    });\n\
    res.json({ ok: true, stop: updated });\n\
  } catch (e) {\n\
    return res.status(400).json({ ok: false, error: \"STOP_UPDATE_FAILED\" });\n\
  }\n\
});\n\
\n\
app.delete(\"/api/school/stops/:stopId\", auth, requireRole(\"SCHOOL_ADMIN\"), loadMe, requireSchool, async (req, res) => {\n\
  const stopId = Number(req.params.stopId);\n\
  const stop = await prisma.routeStop.findUnique({ where: { id: stopId }, select: { id: true, routeId: true } });\n\
  if (!stop) return res.status(404).json({ ok: false, error: \"NOT_FOUND\" });\n\
\n\
  const r = await prisma.route.findFirst({ where: { id: stop.routeId, schoolId: req.me.schoolId }, select: { id: true } });\n\
  if (!r) return res.status(403).json({ ok: false, error: \"FORBIDDEN\" });\n\
\n\
  await prisma.routeStop.delete({ where: { id: stopId } });\n\
  res.json({ ok: true });\n\
});\n\
`;

if (!/server\.listen\(/m.test(s)) {
  console.log("HATA: server.listen bulunamadı");
  process.exit(1);
}

s = s.replace(/(\r?\n)server\.listen\(/m, `\n${block}\n\nserver.listen(`);
fs.writeFileSync(p, s, "utf8");
console.log("OK: school admin endpoints eklendi");
