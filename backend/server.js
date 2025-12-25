const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

const prisma = new PrismaClient();

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan('dev', { skip: (req) => req.path === '/api/gps/last' }));
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 600 }));

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, schoolId: user.schoolId ?? null, email: user.email },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function auth(req, res, next) {
  const token = req.headers["x-auth-token"];
  if (!token) return res.status(401).json({ ok: false, error: "NO_TOKEN" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "BAD_TOKEN" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    next();
  };
}

// WS rooms: vehicle:{vehicleId}, school:{schoolId}, route:{routeId}
io.on("connection", (socket) => {
  socket.on("join", (p = {}) => {
    const { vehicleId, schoolId, routeId } = p || {};
    if (vehicleId) socket.join(`vehicle:${vehicleId}`);
    if (schoolId) socket.join(`school:${schoolId}`);
    if (routeId) socket.join(`route:${routeId}`);
  });
});

// --- API ---
app.get("/api/_ping", async (req, res) => {
  await prisma.pingLog.create({ data: {} });

// GPS LAST (UI fallback)
app.get("/api/gps/last", async (req, res) => {
  try {
    const vehicleId = Number(req.query.vehicleId || 0);
    const where = vehicleId ? { vehicleId } : {};
    const last = await prisma.gpsLog.findFirst({
      where,
      orderBy: { recordedAt: "desc" },
    });

// DEBUG: build stamp
app.get("/api/_build", (req, res) => {
  res.json({ ok: true, build: "20251225_175033" });
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

    res.json({ ok: true, last });
  } catch (e) {
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});


  res.json({ ok: true, ts: new Date().toISOString() });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: "BAD_INPUT" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });

  res.json({ ok: true, token: signToken(user) });
});

app.get("/api/me", auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });

  res.json({
    ok: true,
    me: { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId, createdAt: user.createdAt },
  });
});

// School: me (harita okul konumu DB'den gelsin)
app.get("/api/school/me", auth, async (req, res) => {
  const schoolId = req.user.schoolId;
  if (!schoolId) return res.json({ ok: true, school: null });

  const school = await prisma.school.findUnique({ where: { id: Number(schoolId) } });
  if (!school) return res.status(404).json({ ok: false, error: "SCHOOL_NOT_FOUND" });

  res.json({
    ok: true,
    school: { id: school.id, name: school.name, lat: school.lat, lon: school.lon, createdAt: school.createdAt },
  });
});

// School: location update (demo iÃƒÆ’Ã‚Â§in)
app.put(
  "/api/school/:id/location",
  auth,
  requireRole("SUPER_ADMIN", "SERVICE_ROOM", "SCHOOL_ADMIN"),
  async (req, res) => {
    const id = Number(req.params.id);
    const { lat, lon } = req.body || {};
    if (!id || lat == null || lon == null) return res.status(400).json({ ok: false, error: "BAD_INPUT" });

    // SCHOOL_ADMIN sadece kendi okulunu gÃƒÆ’Ã‚Â¼nceller
    if (req.user.role === "SCHOOL_ADMIN" && Number(req.user.schoolId) !== id) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const updated = await prisma.school.update({
      where: { id },
      data: { lat: Number(lat), lon: Number(lon) },
    });

    res.json({ ok: true, school: { id: updated.id, lat: updated.lat, lon: updated.lon } });
  }
);

// Route stops (haritada duraklar)
app.get("/api/routes/:id/stops", auth, async (req, res) => {
  const routeId = Number(req.params.id);
  if (!routeId) return res.status(400).json({ ok: false, error: "BAD_INPUT" });

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) return res.status(404).json({ ok: false, error: "ROUTE_NOT_FOUND" });

  // kullanÃƒâ€Ã‚Â±cÃƒâ€Ã‚Â± bir okula baÃƒâ€Ã…Â¸lÃƒâ€Ã‚Â±ysa, baÃƒâ€¦Ã…Â¸ka okulun rotasÃƒâ€Ã‚Â±nÃƒâ€Ã‚Â± gÃƒÆ’Ã‚Â¶rmesin
  if (req.user.schoolId && route.schoolId !== Number(req.user.schoolId)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  const stops = await prisma.routeStop.findMany({
    where: { routeId },
    orderBy: { ord: "asc" },
  });

  res.json({
    ok: true,
    stops: stops.map((s) => ({ id: s.id, ord: s.ord, name: s.name, lat: s.lat, lon: s.lon })),
  });
});

app.post("/api/gps", auth, requireRole("DRIVER"), async (req, res) => {
  const { vehicleId, lat, lon, speed, heading, routeId } = req.body || {};
  if (!vehicleId || lat == null || lon == null) return res.status(400).json({ ok: false, error: "BAD_INPUT" });

  const vId = Number(vehicleId);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vId } });
  const schoolId = vehicle?.schoolId ?? null;

  const created = await prisma.gpsLog.create({
    data: {
      vehicleId: vId,
      lat: Number(lat),
      lon: Number(lon),
      speed: speed == null ? null : Number(speed),
      heading: heading == null ? null : Number(heading),
      recordedAt: new Date(),
    },
  });

  const payload = {
    vehicleId: vId,
    lat: created.lat,
    lon: created.lon,
    speed: created.speed,
    heading: created.heading,
    recordedAt: created.recordedAt.toISOString(),
  };

  io.to(`vehicle:${vId}`).emit("gps:update", payload);
  if (schoolId) io.to(`school:${schoolId}`).emit("gps:update", payload);
  if (routeId) io.to(`route:${Number(routeId)}`).emit("gps:update", payload);

  res.json({ ok: true, last: payload });
});

app.get("/api/gps/latest", auth, async (req, res) => {
  const vehicleId = Number(req.query.vehicleId || 1);

  const last = await prisma.gpsLog.findFirst({
    where: { vehicleId },
    orderBy: { recordedAt: "desc" },
  });

  if (!last) return res.json({ ok: true, last: null });

  res.json({
    ok: true,
    last: {
      vehicleId,
      lat: last.lat,
      lon: last.lon,
      speed: last.speed,
      heading: last.heading,
      recordedAt: last.recordedAt.toISOString(),
    },
  });
});

// --- ADMIN: schools & users (Super Admin / Servis OdasÃ„Â±) ---
app.get("/api/admin/schools", auth, requireRole("SUPER_ADMIN", "SERVICE_ROOM"), async (req, res) => {
  const schools = await prisma.school.findMany({ orderBy: { id: "asc" } });
  res.json({ ok: true, schools: schools.map(s => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon })) });
});

app.post("/api/admin/schools", auth, requireRole("SUPER_ADMIN", "SERVICE_ROOM"), async (req, res) => {
  const { name, lat, lon } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: "BAD_INPUT" });

  const created = await prisma.school.create({
    data: { name: String(name), lat: lat == null ? null : Number(lat), lon: lon == null ? null : Number(lon) },
  });

  res.json({ ok: true, school: { id: created.id, name: created.name, lat: created.lat, lon: created.lon } });
});

app.get("/api/admin/users", auth, requireRole("SUPER_ADMIN", "SERVICE_ROOM"), async (req, res) => {
  const schoolId = req.query.schoolId ? Number(req.query.schoolId) : null;

  const users = await prisma.user.findMany({
    where: schoolId ? { schoolId } : {},
    orderBy: { id: "asc" },
    select: { id: true, email: true, role: true, schoolId: true, createdAt: true },
  });

  res.json({ ok: true, users });
});

app.post("/api/admin/users", auth, requireRole("SUPER_ADMIN", "SERVICE_ROOM"), async (req, res) => {
  const { email, password, role, schoolId } = req.body || {};
  if (!email || !password || !role) return res.status(400).json({ ok: false, error: "BAD_INPUT" });

  const allowed = ["SCHOOL_ADMIN", "DRIVER", "PARENT", "SERVICE_ROOM"];
  if (!allowed.includes(String(role))) return res.status(400).json({ ok: false, error: "BAD_ROLE" });

  const pwHash = await bcrypt.hash(String(password), 10);

  try {
    const created = await prisma.user.create({
      data: {
        email: String(email),
        passwordHash: pwHash,
        role: String(role),
        schoolId: schoolId == null ? null : Number(schoolId),
      },
      select: { id: true, email: true, role: true, schoolId: true, createdAt: true },
    });

    res.json({ ok: true, user: created });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "EMAIL_EXISTS" });
  }
});


// --- SCHOOL_ADMIN: vehicles/routes/stops ---
// Not: auth middleware'in req.user.id set ettiÃ„Å¸ini varsayÃ„Â±yoruz (api/me zaten bÃƒÂ¶yle ÃƒÂ§alÃ„Â±Ã…Å¸Ã„Â±yor).
async function loadMe(req, res, next) {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true, schoolId: true, email: true },
    });
    if (!me) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    req.me = me;
    next();
  } catch (e) {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

function requireSchool(req, res, next) {
  if (!req.me?.schoolId) return res.status(400).json({ ok: false, error: "NO_SCHOOL" });
  next();
}

// School me
app.get("/api/school/me", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const school = await prisma.school.findUnique({
    where: { id: req.me.schoolId },
    select: { id: true, name: true, lat: true, lon: true, createdAt: true },
  });
  res.json({ ok: true, school });
});

app.put("/api/school/me/location", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const { lat, lon } = req.body || {};
  const updated = await prisma.school.update({
    where: { id: req.me.schoolId },
    data: { lat: lat == null ? null : Number(lat), lon: lon == null ? null : Number(lon) },
    select: { id: true, name: true, lat: true, lon: true },
  });
  res.json({ ok: true, school: updated });
});

// Vehicles
app.get("/api/school/vehicles", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { schoolId: req.me.schoolId },
    orderBy: { id: "asc" },
    select: {
      id: true, plate: true, schoolId: true, driverUserId: true, createdAt: true,
      driver: { select: { id: true, email: true, role: true } },
    },
  });
  res.json({ ok: true, vehicles });
});

app.post("/api/school/vehicles", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const { plate, driverUserId } = req.body || {};
  if (!plate) return res.status(400).json({ ok: false, error: "BAD_INPUT" });

  let driverId = driverUserId == null ? null : Number(driverUserId);
  if (driverId) {
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: "DRIVER", schoolId: req.me.schoolId },
      select: { id: true },
    });
    if (!driver) return res.status(400).json({ ok: false, error: "BAD_DRIVER" });
  }

  try {
    const created = await prisma.vehicle.create({
      data: { plate: String(plate), schoolId: req.me.schoolId, driverUserId: driverId },
      select: { id: true, plate: true, schoolId: true, driverUserId: true, createdAt: true },
    });
    res.json({ ok: true, vehicle: created });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "CREATE_FAILED" });
  }
});

app.put("/api/school/vehicles/:id", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const id = Number(req.params.id);
  const { plate, driverUserId } = req.body || {};

  const v = await prisma.vehicle.findFirst({ where: { id, schoolId: req.me.schoolId }, select: { id: true } });
  if (!v) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  let driverId = driverUserId == null || driverUserId === "" ? null : Number(driverUserId);
  if (driverId) {
    const driver = await prisma.user.findFirst({ where: { id: driverId, role: "DRIVER", schoolId: req.me.schoolId }, select: { id: true } });
    if (!driver) return res.status(400).json({ ok: false, error: "BAD_DRIVER" });
  }

  try {
    const updated = await prisma.vehicle.update({
      where: { id },
      data: { plate: plate ? String(plate) : undefined, driverUserId: driverId },
      select: { id: true, plate: true, schoolId: true, driverUserId: true },
    });
    res.json({ ok: true, vehicle: updated });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "UPDATE_FAILED" });
  }
});

// Routes
app.get("/api/school/routes", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const routes = await prisma.route.findMany({
    where: { schoolId: req.me.schoolId },
    orderBy: { id: "asc" },
    select: {
      id: true, name: true, schoolId: true, vehicleId: true, createdAt: true,
      vehicle: { select: { id: true, plate: true } },
      _count: { select: { stops: true } },
    },
  });
  res.json({ ok: true, routes });
});

app.post("/api/school/routes", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const { name, vehicleId } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: "BAD_INPUT" });
  let vid = vehicleId == null || vehicleId === "" ? null : Number(vehicleId);
  if (vid) {
    const v = await prisma.vehicle.findFirst({ where: { id: vid, schoolId: req.me.schoolId }, select: { id: true } });
    if (!v) return res.status(400).json({ ok: false, error: "BAD_VEHICLE" });
  }
  const created = await prisma.route.create({
    data: { name: String(name), schoolId: req.me.schoolId, vehicleId: vid },
    select: { id: true, name: true, schoolId: true, vehicleId: true, createdAt: true },
  });
  res.json({ ok: true, route: created });
});

app.put("/api/school/routes/:id", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const id = Number(req.params.id);
  const { name, vehicleId } = req.body || {};

  const r = await prisma.route.findFirst({ where: { id, schoolId: req.me.schoolId }, select: { id: true } });
  if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  let vid = vehicleId == null || vehicleId === "" ? null : Number(vehicleId);
  if (vid) {
    const v = await prisma.vehicle.findFirst({ where: { id: vid, schoolId: req.me.schoolId }, select: { id: true } });
    if (!v) return res.status(400).json({ ok: false, error: "BAD_VEHICLE" });
  }

  const updated = await prisma.route.update({
    where: { id },
    data: { name: name ? String(name) : undefined, vehicleId: vid },
    select: { id: true, name: true, schoolId: true, vehicleId: true },
  });
  res.json({ ok: true, route: updated });
});

// Stops
app.get("/api/school/routes/:id/stops", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const routeId = Number(req.params.id);
  const r = await prisma.route.findFirst({ where: { id: routeId, schoolId: req.me.schoolId }, select: { id: true } });
  if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const stops = await prisma.routeStop.findMany({
    where: { routeId },
    orderBy: { ord: "asc" },
    select: { id: true, routeId: true, ord: true, name: true, lat: true, lon: true },
  });
  res.json({ ok: true, stops });
});

app.post("/api/school/routes/:id/stops", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const routeId = Number(req.params.id);
  const { ord, name, lat, lon } = req.body || {};
  if (!name || lat == null || lon == null) return res.status(400).json({ ok: false, error: "BAD_INPUT" });

  const r = await prisma.route.findFirst({ where: { id: routeId, schoolId: req.me.schoolId }, select: { id: true } });
  if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  let ordNum = ord == null || ord === "" ? null : Number(ord);
  if (!ordNum) {
    const max = await prisma.routeStop.aggregate({ where: { routeId }, _max: { ord: true } });
    ordNum = (max._max.ord || 0) + 1;
  }

  try {
    const created = await prisma.routeStop.create({
      data: { routeId, ord: ordNum, name: String(name), lat: Number(lat), lon: Number(lon) },
      select: { id: true, routeId: true, ord: true, name: true, lat: true, lon: true },
    });
    res.json({ ok: true, stop: created });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "STOP_CREATE_FAILED" });
  }
});

app.put("/api/school/stops/:stopId", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const stopId = Number(req.params.stopId);
  const { ord, name, lat, lon } = req.body || {};

  const stop = await prisma.routeStop.findUnique({ where: { id: stopId }, select: { id: true, routeId: true } });
  if (!stop) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const r = await prisma.route.findFirst({ where: { id: stop.routeId, schoolId: req.me.schoolId }, select: { id: true } });
  if (!r) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  try {
    const updated = await prisma.routeStop.update({
      where: { id: stopId },
      data: {
        ord: ord == null || ord === "" ? undefined : Number(ord),
        name: name ? String(name) : undefined,
        lat: lat == null || lat === "" ? undefined : Number(lat),
        lon: lon == null || lon === "" ? undefined : Number(lon),
      },
      select: { id: true, routeId: true, ord: true, name: true, lat: true, lon: true },
    });
    res.json({ ok: true, stop: updated });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "STOP_UPDATE_FAILED" });
  }
});

app.delete("/api/school/stops/:stopId", auth, requireRole("SCHOOL_ADMIN"), loadMe, requireSchool, async (req, res) => {
  const stopId = Number(req.params.stopId);
  const stop = await prisma.routeStop.findUnique({ where: { id: stopId }, select: { id: true, routeId: true } });
  if (!stop) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const r = await prisma.route.findFirst({ where: { id: stop.routeId, schoolId: req.me.schoolId }, select: { id: true } });
  if (!r) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  await prisma.routeStop.delete({ where: { id: stopId } });
  res.json({ ok: true });
});


server.listen(PORT, () => console.log("API listening on", PORT));