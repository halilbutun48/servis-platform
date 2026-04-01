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
import { companyOverviewRouter } from "./routes/companyOverview.js";
import { planBuilderRouter } from "./routes/planBuilder.js";
import { liveRouter } from "./routes/live.js";
import { parentRouter } from "./routes/parent.js";
import { kvkkRouter } from "./routes/kvkk.js";
import logsRouter from "./routes/logs.js";
import reportsRouter from "./routes/reports.js";
import penaltiesRouter from "./routes/penalties.js";

import availabilityRoutes from "./routes/availability.js";

// Router export tipleri karÄ±ÅŸsa bile crash etmemek iÃ§in namespace import
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

// Public routerâ€™lar (io yok)
import * as companiesMod from "./routes/companies.js";
import * as roomsMod from "./routes/rooms.js";
import * as routeTemplatesMod from "./routes/routeTemplates.js";
import { offersRouter } from "./routes/offers.js";
import { checkinRouter } from "./routes/checkin.js";
import { organizationRouter } from "./routes/organization.js";
import { schoolParentInvitesRouter } from "./routes/schoolParentInvites.js";
import { passengerLinksRouter, publicPassengerLiveRouter } from "./routes/passengerLinks.js";
import { aiRouter } from "./routes/ai.js";
import { observabilityRouter } from "./routes/observability.js";
import { fieldAcceptanceRouter } from "./routes/fieldAcceptance.js";
import { ssotAlignmentRouter } from "./routes/ssotAlignment.js";
import { commercialCoreRouter } from "./routes/commercialCore.js";
import { trustQualityRouter } from "./routes/trustQuality.js";
import { naturalCopilotRouter } from "./routes/naturalCopilot.js";
import { pilotLaunchGateRouter } from "./routes/pilotLaunchGate.js";
import { operationVerificationRouter } from "./routes/operationVerification.js";

import { startMonitors } from "./jobs/index.js";
import { apiRequestLog } from "./middleware/apiRequestLog.js";
import { getRedis } from "./redis/index.js";
import { RedisRateLimitStore } from "./middleware/rateLimitRedisStore.js";
import { startCapacityBaselineMonitor, capacityRequestStarted, capacityRequestFinished, capacityWsConnected, capacityWsDisconnected, getCapacityHealthSummary } from "./ops/capacityLoadBaseline.js";
import { edgeRequestContext, applyEdgeSecurityHeaders, edgeSecurityGuard, getEdgeSecurityHealthSummary } from "./ops/edgeSecurityBaseline.js";
import { pickExport, assertRouteFactories } from "./bootstrap/routeFactories.js";
import { mountCoreRoutes, mountIoRoutes } from "./bootstrap/routeMounts.js";

import * as agreementsMod from "./routes/agreements.js";

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
assertRouteFactories({
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
});

const app = express();
startCapacityBaselineMonitor();

// M11: proxy / gÃ¼venlik baseline
app.disable("x-powered-by");
app.set("trust proxy", Math.max(0, Number(ENV.TRUST_PROXY_HOPS || 1)));

// M38: env mode flags (needed early)
const mode = String(process.env.NODE_ENV || ENV.NODE_ENV || ENV.APP_ENV || "development").toLowerCase();
const isProd = mode === "production";

// M38: prod guard â€” CORS_ORIGIN must not be "*" in production
if (isProd && String(ENV.CORS_ORIGIN || "").trim() === "*") {
  throw new Error('CORS_ORIGIN must not be "*" in production');
}

// Optional prod guard â€” redirect http->https when behind proxy
const requireHttps = isProd && String(process.env.REQUIRE_HTTPS || "0") === "1";


app.use(cors({ origin: ENV.CORS_ORIGIN === "*" ? true : ENV.CORS_ORIGIN }));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
if (requireHttps) {
  app.set("trust proxy", Math.max(0, Number(ENV.TRUST_PROXY_HOPS || 1)));
  app.use((req, res, next) => {
    const xf = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
    if (req.secure || xf === "https") return next();
    const host = req.headers.host;
    if (!host) return res.status(400).send("Bad Request");
    return res.redirect(301, "https://" + host + req.originalUrl);
  });
}

app.use(edgeRequestContext);
app.use(applyEdgeSecurityHeaders);
app.use(edgeSecurityGuard);
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  capacityRequestStarted();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    capacityRequestFinished();
  };
  res.on("finish", finish);
  res.on("close", finish);
  next();
});
app.use(morgan("dev"));

// M10: request log (must be early)
app.use(apiRequestLog());

// M11: Rate limit
// GreenPack deterministic gate iÃ§in (dev/test only) header bazlÄ± skip.
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

// âœ… M41: distributed rate-limit store (Redis)
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

// âœ… M77: route-based buckets (login asla GPS tarafÄ±ndan kilitlenmez)
const authLimiter = rateLimit({
  windowMs: ENV.AUTH_RATE_LIMIT_WINDOW_MS,
  max: ENV.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("auth:", ENV.AUTH_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: (req) => {
    const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    return `ip:${req.ip}|identifier:${identifier}`;
  },
  handler: limiter429Handler,
});

function authActionKey(req) {
  const token = String(req.get("x-auth-token") || "") || readBearerToken(req);
  if (token) return authKey(req);

  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (refreshToken) return `ip:${req.ip}|refresh:${refreshToken.slice(0, 24)}`;

  const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const deviceId = String(req.body?.deviceId || "").trim().toLowerCase();
  return `ip:${req.ip}|identifier:${identifier}|device:${deviceId}`;
}

const authActionWindowMs = Math.min(Number(ENV.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000), 10 * 60 * 1000);
const authActionLimiter = rateLimit({
  windowMs: authActionWindowMs,
  max: Math.max(5, Math.min(Number(ENV.AUTH_RATE_LIMIT_MAX || 10), 10)),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("auth-action:", authActionWindowMs),
  skip: greenpackSkip,
  keyGenerator: authActionKey,
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

const readSummaryLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: Math.max(180, Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read-summary:", ENV.READ_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

const readPreviewLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: Math.max(180, Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read-preview:", ENV.READ_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

const readDirectoryLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: Math.max(240, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2.2)),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read-directory:", ENV.READ_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});


const readOfferLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2.8)),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read-offer:", ENV.READ_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

const readPeopleLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2.8)),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read-people:", ENV.READ_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

const readLiveShiftLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2.8)),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read-live-shift:", ENV.READ_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});
function isSummaryReadPath(req) {
  const path = String(req.path || "");
  return (
    path === "/company/overview/workflow-summary" ||
    path === "/company/overview/commercial-flow-summary" ||
    path === "/trust-quality/company/summary"
  );
}

function isReportReadPath(req) {
  return /^\/reports\/(shifts|drivers|vehicles|stops)\/summary$/.test(String(req.path || ""));
}

function isScoreReadPath(req) {
  return String(req.path || "") === "/trust-quality/provider-scores";
}

function isPreviewReadPath(req) {
  return /^\/shifts\/\d+\/route-preview$/.test(String(req.path || ""));
}

function isOfferReadPath(req) {
  return String(req.path || "") === "/offers/company";
}

function isPeopleReadPath(req) {
  return String(req.path || "") === "/company/personels";
}

function isLiveShiftReadPath(req) {
  const path = String(req.path || "");
  if (path !== "/shifts") return false;
  const onlyNow = String(req.query?.onlyNow || "0") === "1";
  const status = String(req.query?.status || "");
  return onlyNow || status.includes("APPROVED") || status.includes("ACTIVE");
}

function isDirectoryReadPath(req) {
  const path = String(req.path || "");
  return (
    path === "/rooms" ||
    path === "/vehicles" ||
    path === "/agreements"
  );
}


const readReportLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 3)),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read-report:", ENV.READ_RATE_LIMIT_WINDOW_MS),
  skip: greenpackSkip,
  keyGenerator: authKey,
  handler: limiter429Handler,
});

const readScoreLimiter = rateLimit({
  windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
  max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 3)),
  standardHeaders: true,
  legacyHeaders: false,
  store: rlStore("read-score:", ENV.READ_RATE_LIMIT_WINDOW_MS),
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

// Auth (Ã§ok sÄ±kÄ±)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/auth/parent-invite", authLimiter);
app.use("/api/auth/refresh", authActionLimiter);
app.use("/api/auth/logout", authActionLimiter);
app.use("/api/auth/driver/change-pin", authActionLimiter);

// GPS ingest (ayrÄ± kova)
app.use("/api/gps", gpsLimiter);
app.use("/api/telematics", telematicsLimiter);

// Export/download endpoints (WAF-style ayrÄ± kova)
app.use("/api/logs/export", exportLimiter);
app.use("/api/admin/logs/export", exportLimiter);

// Genel API (GET / write ayrÄ±mÄ±)
app.use("/api", (req, res, next) => {
  // /api/auth/* ve /api/gps/* kendi limiter'Ä±nda
  if (req.path.startsWith("/auth")) return next();
  if (req.path.startsWith("/gps")) return next();
  if (req.path.startsWith("/telematics")) return next();

  if (req.method === "GET") {
    if (isSummaryReadPath(req)) return readSummaryLimiter(req, res, next);
    if (isReportReadPath(req)) return readReportLimiter(req, res, next);
    if (isScoreReadPath(req)) return readScoreLimiter(req, res, next);
    if (isPreviewReadPath(req)) return readPreviewLimiter(req, res, next);
    if (isOfferReadPath(req)) return readOfferLimiter(req, res, next);
    if (isPeopleReadPath(req)) return readPeopleLimiter(req, res, next);
    if (isLiveShiftReadPath(req)) return readLiveShiftLimiter(req, res, next);
    if (isDirectoryReadPath(req)) return readDirectoryLimiter(req, res, next);
    return readLimiter(req, res, next);
  }
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
    ok: true, // geriye dÃ¶nÃ¼k uyum
    ts: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    dbOk,
    dbLatencyMs: Date.now() - t0,
    version: ENV.APP_VERSION,
    capacity: getCapacityHealthSummary(),
    edgeSecurity: getEdgeSecurityHealthSummary(),
  });
});

mountCoreRoutes(app, {
  authStep2Router,
  authRouter,
  publicPassengerLiveRouter,
  authRequired,
  requireStepUp,
  requireStepUpWrite,
  meRouter,
  notificationsRouter,
  kvkkRouter,
  logsRouter,
  reportsRouter,
  penaltiesRouter,
  etaRouter,
  geocodeRouter,
  companyHubRouter,
  companyOverviewRouter,
  planBuilderRouter,
  liveRouter,
  observabilityRouter,
  fieldAcceptanceRouter,
  ssotAlignmentRouter,
  commercialCoreRouter,
  trustQualityRouter,
  naturalCopilotRouter,
  pilotLaunchGateRouter,
  operationVerificationRouter,
  parentRouter,
  schoolParentInvitesRouter,
  companiesRouter,
  roomsRouter,
  routeTemplatesRouter,
  availabilityRoutes,
  adminLogsRouter,
  adminRouter,
});

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

    const tokenSv = Number(decoded?.sv ?? decoded?.sessionVersion ?? 1);
    const userSv = Number(user?.sessionVersion ?? 1);
    if (Number.isFinite(tokenSv) && Number.isFinite(userSv) && tokenSv !== userSv) {
      return next(new Error("session revoked"));
    }

    socket.user = user;
    return next();
  } catch {
    return next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  capacityWsConnected();
  socket.on("disconnect", () => capacityWsDisconnected());
  const user = socket.user;
  const rooms = scopeRoomsForUser(user);
  rooms.forEach((r) => socket.join(r));
  socket.emit("ws:ready", { userId: user.id, role: user.role, rooms });
});

mountIoRoutes(app, io, {
  vehiclesRouter,
  driversRouter,
  shiftsRouter,
  gpsRouter,
  telematicsRouter,
  requestsRouter,
  driverRouter,
  personelsRouter,
  companyPersonelsRouter,
  passengerLinksRouter,
  personelShiftsRouter,
  agreementsRouter,
  offersRouter,
  checkinRouter,
  organizationRouter,
  aiRouter,
});
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
  console.log(`âœ… API listening on http://localhost:${ENV.PORT}`);
});








