// backend/src/server.js
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
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
import "dotenv/config";
import { personelsRouter } from "./routes/personels.js";
import { companiesRouter } from "./routes/companies.js";
import { roomsRouter } from "./routes/rooms.js";

import { startMonitors } from "./jobs/index.js";

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

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

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/eta", etaRouter);
app.use("/api/companies", companiesRouter());
app.use("/api/rooms", roomsRouter());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// API routes needing io
app.use("/api/vehicles", vehiclesRouter(io));
app.use("/api/drivers", driversRouter(io));
app.use("/api/shifts", shiftsRouter(io));
app.use("/api/gps", gpsRouter(io));
app.use("/api/requests", requestsRouter(io));
app.use("/api/driver", driverRouter(io));
app.use("/api/personels", personelsRouter(io));
// Socket auth
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || "").replace("Bearer ", "");

    if (!token) return next(new Error("missing token"));

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return next(new Error("invalid user"));

    socket.user = user;
    next();
  } catch (e) {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.user;

  // Base scope rooms
  const rooms = scopeRoomsForUser(user);
  rooms.forEach((r) => socket.join(r));

  // Driver: join vehicle + shift rooms via assigned shifts
  (async () => {
    if (user.role !== "DRIVER") return;

    const driver = await prisma.driver.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!driver) return;

    const shifts = await prisma.shift.findMany({
      where: {
        driverId: driver.id,
        status: { in: ["APPROVED", "ACTIVE"] },
      },
      select: { id: true, vehicleId: true },
    });

    const vehicleIds = Array.from(
      new Set(shifts.map((s) => s.vehicleId).filter(Boolean))
    );
    vehicleIds.forEach((vid) => socket.join(`vehicle:${vid}`));

    const shiftIds = Array.from(new Set(shifts.map((s) => s.id)));
    shiftIds.forEach((sid) => socket.join(`shift:${sid}`));
  })();

  socket.emit("ws:ready", { userId: user.id, role: user.role, rooms });
  socket.on("disconnect", () => {});
});

// Background monitors (GPS stale/offline, maintenance, ...)
const stopMonitors = startMonitors(io);

function shutdown() {
  try {
    stopMonitors?.();
  } catch {
    // ignore
  }
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(ENV.PORT, () => {
  console.log(`✅ API listening on http://localhost:${ENV.PORT}`);
});

