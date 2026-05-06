// backend/src/server.js
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
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
import * as personelAccessMod from "./routes/personelAccess.js";
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
import { startCapacityBaselineMonitor, capacityRequestStarted, capacityRequestFinished, capacityWsConnected, capacityWsDisconnected, getCapacityHealthSummary } from "./ops/capacityLoadBaseline.js";
import { edgeRequestContext, applyEdgeSecurityHeaders, edgeSecurityGuard, getEdgeSecurityHealthSummary } from "./ops/edgeSecurityBaseline.js";
import { pickExport, assertRouteFactories } from "./bootstrap/routeFactories.js";
import { mountCoreRoutes, mountIoRoutes } from "./bootstrap/routeMounts.js";
import { createApiRateLimiters } from "./bootstrap/rateLimits.js";
import { expressErrorHandler } from "./errors/http.js";
import { installSocketRelay } from "./ws/socketRelay.js";

import * as agreementsMod from "./routes/agreements.js";
import logger from "./lib/logger.js";

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
const personelAccessRouter = pickExport(personelAccessMod, "personelAccessRouter");
const publicPersonelInviteRouter = pickExport(personelAccessMod, "publicPersonelInviteRouter");

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
  personelAccessRouter,
  publicPersonelInviteRouter,
  companiesRouter,
  roomsRouter,
  routeTemplatesRouter,
});

const app = express();
startCapacityBaselineMonitor();

// M11: proxy / güvenlik baseline
app.disable("x-powered-by");
app.set("trust proxy", Math.max(0, Number(ENV.TRUST_PROXY_HOPS || 1)));

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

const rateLimitStoreMode = String(ENV.RATE_LIMIT_STORE || process.env.RATE_LIMIT_STORE || "").toLowerCase();

const {
  authLimiter,
  authActionLimiter,
  gpsLimiter,
  telematicsLimiter,
  exportLimiter,
  apiLimiterMiddleware,
} = createApiRateLimiters({
  ENV,
  isProd,
  verifyToken,
  rateLimitStoreMode,
  getRedis,
});

// Auth (cok siki)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/auth/parent-invite", authLimiter);
app.use("/api/auth/personel-invite", authLimiter);
app.use("/api/auth/refresh", authActionLimiter);
app.use("/api/auth/logout", authActionLimiter);
app.use("/api/auth/driver/change-pin", authActionLimiter);

// GPS ingest (ayri kova)
app.use("/api/gps", gpsLimiter);
app.use("/api/telematics", telematicsLimiter);

// Export/download endpoints (WAF-style ayri kova)
app.use("/api/logs/export", exportLimiter);
app.use("/api/admin/logs/export", exportLimiter);

// Genel API (GET / write ayrimi)
app.use("/api", apiLimiterMiddleware);

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
    capacity: getCapacityHealthSummary(),
    edgeSecurity: getEdgeSecurityHealthSummary(),
  });
});

// Server + Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ENV.CORS_ORIGIN === "*" ? true : ENV.CORS_ORIGIN } });
const stopSocketRelay = installSocketRelay(io, { redisUrl: ENV.REDIS_URL });

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
}, io);

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
  personelAccessRouter,
  publicPersonelInviteRouter,
  agreementsRouter,
  offersRouter,
  checkinRouter,
  organizationRouter,
  aiRouter,
});

app.use(expressErrorHandler);
// Background monitors
const stopMonitors = startMonitors(io);

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    stopSocketRelay?.();
  } catch {}
  try {
    await stopMonitors?.();
  } catch {}
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(ENV.PORT, () => {
  logger.info(`✅ API listening on http://localhost:${ENV.PORT}`);
});




