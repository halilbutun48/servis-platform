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
import { scopeRoomsForUser } from "./ws/scope.js";

import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { vehiclesRouter } from "./routes/vehicles.js";
import { driversRouter } from "./routes/drivers.js";
import { shiftsRouter } from "./routes/shifts.js";
import { gpsRouter } from "./routes/gps.js";
import { requestsRouter } from "./routes/requests.js";
import { notificationsRouter } from "./routes/notifications.js";
import { driverRouter } from "./routes/driver.js";
import { etaRouter } from "./routes/eta.js";
import { personelsRouter } from "./routes/personels.js";
import { companiesRouter } from "./routes/companies.js";
import { roomsRouter } from "./routes/rooms.js";
import { routeTemplatesRouter } from "./routes/routeTemplates.js";

import { startMonitors } from "./jobs/index.js";
import { apiRequestLog } from "./middleware/apiRequestLog.js";

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// M10: request log (must be early)
app.use(apiRequestLog());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// public routes
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/eta", etaRouter);
app.use("/api/companies", companiesRouter());
app.use("/api/rooms", roomsRouter());
app.use("/api/route-templates", routeTemplatesRouter());

// create server + io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ✅ SOCKET AUTH (decode token -> fetch user -> join scopes)
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers["x-auth-token"] ||
      (socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");

    if (!token) return next(new Error("missing token"));

    const decoded = verifyToken(String(token)); // { userId, role }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return next(new Error("invalid user"));

    socket.user = user;
    return next();
  } catch (e) {
    return next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.user;

  const rooms = scopeRoomsForUser(user);
  rooms.forEach((r) => socket.join(r));

  socket.emit("ws:ready", { userId: user.id, role: user.role, rooms });
  socket.on("disconnect", () => {});
});

// io-needed routes
app.use("/api/vehicles", vehiclesRouter(io));
app.use("/api/drivers", driversRouter(io));
app.use("/api/shifts", shiftsRouter(io));
app.use("/api/gps", gpsRouter(io));
app.use("/api/requests", requestsRouter(io));
app.use("/api/driver", driverRouter(io));
app.use("/api/personels", personelsRouter(io));

// monitors
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
