// backend/src/server.js
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import "dotenv/config";

import { ENV } from "./env.js";
import { prisma } from "./prisma.js";
import { verifyToken } from "./auth/jwt.js";
import { authRequired, requireStepUp, requireStepUpWrite } from "./auth/middleware.js";
import { scopeRoomsForUser } from "./ws/scope.js";

import { authRouter } from "./routes/auth.js";
import { authStep2Router } from "./routes/auth_step2.js";
import { meRouter } from "./routes/me.js";
import { notificationsRouter } from "./routes/notifications.js";
import { etaRouter } from "./routes/eta.js";
import { geocodeRouter } from "./routes/geocode.js";
import { companyHubRouter } from "./routes/companyHub.js";
import { planBuilderRouter } from "./routes/planBuilder.js";
import { liveRouter } from "./routes/live.js";
import { parentRouter } from "./routes/parent.js";
import { kvkkRouter } from "./routes/kvkk.js";
import logsRouter from "./routes/logs.js";

import availabilityRoutes from "./routes/availability.js";

// Router export tipleri karışsa bile crash etmemek için namespace import
import * as vehiclesMod from "./routes/vehicles.js";
import * as driversMod from "./routes/drivers.js";
import * as shiftsMod from "./routes/shifts/index.js";
import * as gpsMod from "./routes/gps.js";
import * as telematicsMod from "./routes/telematics.js";
import * as requestsMod from "./routes/requests.js";
import * as driverMod from "./routes/driver.js";
import * as personelsMod from "./routes/personels.js";
import * as companyPersonelsMod from "./routes/companyPersonels.js";
import * as personelShiftsMod from "./routes/personelShifts.js";

import { adminRouter } from "./routes/admin.js";
import adminLogsRouter from "./routes/admin_logs.js";

// Public router’lar (io yok)
import * as companiesMod from "./routes/companies.js";
import * as roomsMod from "./routes/rooms.js";
import * as routeTemplatesMod from "./routes/routeTemplates.js";
import { offersRouter } from "./routes/offers.js";
import { checkinRouter } from "./routes/checkin.js";
import { organizationRouter } from "./routes/organization.js";
import { schoolParentInvitesRouter } from "./routes/schoolParentInvites.js";
import { passengerLinksRouter, publicPassengerLiveRouter } from "./routes/passengerLinks.js";
import { aiRouter } from "./routes/ai.js";

import { startMonitors } from "./jobs/index.js";
import { apiRequestLog } from "./middleware/apiRequestLog.js";
import { getRedis } from "./redis/index.js";
import { RedisRateLimitStore } from "./middleware/rateLimitRedisStore.js";

import * as agreementsMod from "./routes/agreements.js";
/**
 * mod export'ları 3 tip olabilir:
 * 1) export function xxxRouter(io){...}  => factory
 * 2) export default function (io){...}  => factory
 * 3) export default router               => Router objesi
 *
 * Biz server.js tarafında HER ZAMAN xxxRouter(...) çağırmak istiyoruz.
 * Bu yüzden Router objesi gelirse factory wrapper’a sarıyoruz.
 */
function pickExport(mod, preferredName) {
  const picked = mod?.[preferredName] ?? mod?.default;
  if (!picked) return null;
  if (typeof picked === "function") return picked;
  return (..._args) => picked;
}

const vehiclesRouter = pickExport(vehiclesMod, "vehiclesRouter");
const driversRouter = pickExport(driversMod, "driversRouter");
const shiftsRouter = pickExport(shiftsMod, "shiftsRouter");
const gpsRouter = pickExport(gpsMod, "gpsRouter");
const telematicsRouter = pickExport(telematicsMod, "telematicsRouter");
const requestsRouter = pickExport(requestsMod, "requestsRouter");
const driverRouter = pickExport(driverMod, "driverRouter");
const personelsRouter = pickExport(personelsMod, "personelsRouter");
const companyPersonelsRouter = pickExport(companyPersonelsMod, "companyPersonelsRouter");
const personelShiftsRouter = pickExport(personelShiftsMod, "personelShiftsRouter");

const companiesRouter = pickExport(companiesMod, "companiesRouter");
const roomsRouter = pickExport(roomsMod, "roomsRouter");
const routeTemplatesRouter = pickExport(routeTemplatesMod, "routeTemplatesRouter");
const agreementsRouter = pickExport(agreementsMod, "agreementsRouter");
for (const [name, fn] of Object.entries({
  vehiclesRouter,
  driversRouter,
  shiftsRouter,
  gpsRouter,
  telematicsRouter,
  requestsRouter,
  driverRouter,
  personelsRouter,
  companyPersonelsRouter,
  personelShiftsRouter,
  companiesRouter,
  roomsRouter,
  routeTemplatesRouter,
})) {
  if (!fn) {
    throw new Error(`Route export missing: ${name} (check named/default export)`);
  }
}

const app = express();

// M11: proxy / güvenlik baseline
app.disable("x-powered-by");
app.set("trust proxy", 1);

// M38: env mode flags (needed early)
const mode = String(process.env.NODE_ENV || ENV.NODE_ENV || ENV.APP_ENV || "development").toLowerCase();
const isProd = mode === "production";

// M38: prod guard — CORS_ORIGIN must not be "*" in production
if (isProd && String(ENV.CORS_ORIGIN || "").trim() === "*") {
  throw new Error('CORS_ORIGIN must not be "*" in production');
}

// Optional prod guard — redirect http->https when behind proxy
const requireHttps = isProd && String(process.env.REQUIRE_HTTPS || "0") === "1";


app.use(cors({ origin: ENV.CORS_ORIGIN === "*" ? true : ENV.CORS_ORIGIN }));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
if (requireHttps) {
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const xf = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
    if (req.secure || xf === "https") return next();
    const host = req.headers.host;
    if (!host) return res.status(400).send("Bad Request");
    return res.redirect(301, "https://" + host + req.originalUrl);
  });
}

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// M10: request log (must be early)
app.use(apiRequestLog());

// M11: Rate limit
// GreenPack deterministic gate için (dev/test only) header bazlı skip.
// PROD'DA asla skip yok.
function greenpackSkip(req) {
  if (isProd) return false;
  const gp = String(req.get("x-greenpack") || "").toLowerCase();
  return gp === "1" || gp === "true";
}

function readBearerToken(req) {
  const a = String(req.get("authorization") || "");
  const m = a.match(/^Bearer\s+(.+)$/i);
  return m ? String(m[1] || "") : "";
}

function authKey(req) {
  const token = String(req.get("x-auth-token") || "") || readBearerToken(req);
  if (token) {
    try {
      const decoded = verifyToken(String(token));
      const userId = decoded?.userId ?? decoded?.id;
      if (userId) return `u:${userId}`;
    } catch {}
    return `t:${token.slice(0, 24)}`; // fallback (do not store full token)
  }
  return `ip:${req.ip}`;
}

// ✅ M41: distributed rate-limit store (Redis)
const rateLimitStoreMode = String(ENV.RATE_LIMIT_STORE || process.env.RATE_LIMIT_STORE || "").toLowerCase();
const useRedisRateLimitStore = rateLimitStoreMode === "redis";
const _redis = useRedisRateLimitStore ? getRedis() : null;
function rlStore(prefix, windowMs) {
  if (!useRedisRateLimitStore || !_redis) return undefined;
  return new RedisRateLimitStore({ redis: _redis, windowMs, prefix });
}

function limiter429Handler(req, res) {
  return res.status(429).json({
    error: "RATE_LIMITED",
    code: "RATE_LIMITED",
    path: req.originalUrl || req.path || null,
  });
}

// ✅ M77: route-based buckets (login asla GPS tarafından kilitlenmez)
const authLimiter = rateLimit({
  windowMs: ENV.AUTH_RATE_LIMIT_WINDOW_MS,
  max: ENV.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("auth:", ENV.AUTH_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: (req) => {
    const email = String(req.body?.email || req.body?.username || "").trim().toLowerCase();
    return `ip:${req.ip}|email:${email}`;
  },
  handler: limiter429Handler,
});

const readLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: ENV.READ_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read:", ENV.READ_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

const writeLimiter = rateLimit({
  windowMs: ENV.WRITE_RATE_LIMIT_WINDOW_MS,
  max: ENV.WRITE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("write:", ENV.WRITE_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

const gpsLimiter = rateLimit({
  windowMs: ENV.GPS_RATE_LIMIT_WINDOW_MS,
  max: ENV.GPS_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("gps:", ENV.GPS_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

const telematicsLimiter = rateLimit({
  windowMs: ENV.TELEMATICS_RATE_LIMIT_WINDOW_MS,
  max: ENV.TELEMATICS_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("telematics:", ENV.TELEMATICS_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: (req) => {
    const auth = String(req.get("authorization") || req.get("x-device-key") || req.get("x-telematics-secret") || "").trim();
    return auth ? `tele:${auth.slice(0, 32)}` : `ip:${req.ip}`;
  },
  handler: limiter429Handler,
});

const exportLimiter = rateLimit({
  windowMs: ENV.EXPORT_RATE_LIMIT_WINDOW_MS,
  max: ENV.EXPORT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("export:", ENV.EXPORT_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

// Auth (çok sıkı)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google", authLimiter);

// GPS ingest (ayrı kova)
app.use("/api/gps", gpsLimiter);
app.use("/api/telematics", telematicsLimiter);

// Export/download endpoints (WAF-style ayrı kova)
app.use("/api/logs/export", exportLimiter);
app.use("/api/admin/logs/export", exportLimiter);

// Genel API (GET / write ayrımı)
app.use("/api", (req, res, next) => {
  // /api/auth/* ve /api/gps/* kendi limiter'ında
  if (req.path.startsWith("/auth")) return next();
  if (req.path.startsWith("/gps")) return next();
  if (req.path.startsWith("/telematics")) return next();

  if (req.method === "GET") return readLimiter(req, res, next);
  return writeLimiter(req, res, next);
});

// Health (M10+M11: db ping + uptime + version)
app.get("/health", async (req, res) => {
  const t0 = Date.now();
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  res.json({
    ok: true, // geriye dönük uyum
    ts: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    dbOk,
    dbLatencyMs: Date.now() - t0,
    version: ENV.APP_VERSION,
  });
});

// Public routes
app.use("/api/auth", authStep2Router);
app.use("/api/auth", authRouter);
app.use("/api/public/passenger-live", publicPassengerLiveRouter());
app.use("/api/public/personel-live", publicPassengerLiveRouter());

// Step 1.5: TOTP step-up guard (ROOM + SUPER_ADMIN on sensitive paths)
app.use("/api/admin/logs", authRequired(), requireStepUp("SUPER_ADMIN"));
app.use("/api/admin", authRequired(), requireStepUp("SUPER_ADMIN"));
app.use("/api/logs/export", authRequired(), requireStepUp("ROOM", "SUPER_ADMIN"));
app.use("/api/vehicles", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));
app.use("/api/drivers", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));
app.use("/api/availability", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));
app.use("/api/shifts", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));
app.use("/api/me", meRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/kvkk", kvkkRouter());
app.use("/api/logs", logsRouter());
app.use("/api/eta", etaRouter);
app.use("/api/geocode", geocodeRouter());
app.use("/api/company/hub", companyHubRouter());
app.use("/api/plan-builder", planBuilderRouter());
app.use("/api/live", liveRouter());
app.use("/api/parent", parentRouter());
app.use("/api/school/parent-invites", schoolParentInvitesRouter());
app.use("/api/companies", companiesRouter());
app.use("/api/rooms", roomsRouter());
app.use("/api/route-templates", routeTemplatesRouter());
app.use("/api/availability", availabilityRoutes);
app.use("/api/admin/logs", adminLogsRouter());
app.use("/api/admin", adminRouter());

// Server + Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ENV.CORS_ORIGIN === "*" ? true : ENV.CORS_ORIGIN } });

// Socket auth: token -> decode -> DB user -> join scopes
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers["x-auth-token"] ||
      (socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");

    if (!token) return next(new Error("missing token"));

    const decoded = verifyToken(String(token));
    const userId = decoded?.userId ?? decoded?.id;
    if (!userId) return next(new Error("invalid token payload"));

    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return next(new Error("invalid user"));

    socket.user = user;
    return next();
  } catch {
    return next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.user;
  const rooms = scopeRoomsForUser(user);
  rooms.forEach((r) => socket.join(r));
  socket.emit("ws:ready", { userId: user.id, role: user.role, rooms });
});

// API routes needing io
app.use("/api/vehicles", vehiclesRouter(io));
app.use("/api/drivers", driversRouter(io));
app.use("/api/shifts", shiftsRouter(io));
app.use("/api/gps", gpsRouter(io));
app.use("/api/telematics", telematicsRouter(io));
app.use("/api/requests", requestsRouter(io));
app.use("/api/driver", driverRouter(io));
app.use("/api/personels", personelsRouter(io));
app.use("/api/company/personels", companyPersonelsRouter());
app.use("/api/company/passenger-links", passengerLinksRouter());
app.use("/api/personel/shifts", personelShiftsRouter());
app.use("/api/agreements", agreementsRouter(io));
app.use("/api/offers", offersRouter(io));
app.use("/api/checkin", checkinRouter(io));
app.use("/api/organization", organizationRouter(io));
app.use("/api/ai", aiRouter());
// Background monitors
const stopMonitors = startMonitors(io);

function shutdown() {
  try {
    stopMonitors?.();
  } catch {}
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(ENV.PORT, () => {
  console.log(`✅ API listening on http://localhost:${ENV.PORT}`);
});


