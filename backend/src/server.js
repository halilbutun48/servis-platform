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
import { createNotification } from "./notifications/service.js";



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

app.get("/health", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/eta", etaRouter);

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
  const rooms = scopeRoomsForUser(user);
  rooms.forEach((r) => socket.join(r));

  // Driver: join vehicle rooms via assigned shifts
  (async () => {
    if (user.role !== "DRIVER") return;
    const driver = await prisma.driver.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (!driver) return;
    const shifts = await prisma.shift.findMany({
      where: { driverId: driver.id, status: { in: ["APPROVED", "ACTIVE"] }, vehicleId: { not: null } },
      select: { vehicleId: true },
    });
    const vehicleIds = Array.from(new Set(shifts.map((s) => s.vehicleId).filter(Boolean)));
    vehicleIds.forEach((vid) => socket.join(`vehicle:${vid}`));
  })();

  socket.emit("ws:ready", { userId: user.id, role: user.role, rooms });

  socket.on("disconnect", () => {});
});

// Background checks: stale vehicles + maintenance upcoming
async function backgroundTick() {
  try {
    // stale: if gpsLast.at older than 45 seconds => STALE
    const staleThresholdMs = 45_000;
    const now = Date.now();

    const lasts = await prisma.gpsLast.findMany({
      include: { vehicle: { include: { room: true } } },
    });

    for (const last of lasts) {
      const age = now - new Date(last.at).getTime();
      if (age <= staleThresholdMs) continue;
      if (last.status === "STALE") continue;

      await prisma.gpsLast.update({ where: { vehicleId: last.vehicleId }, data: { status: "STALE" } });
      await prisma.vehicle.update({ where: { id: last.vehicleId }, data: { status: "STALE" } });

      const payloadJson = {
        title: "GPS Stale",
        message: `Araç ${last.vehicle.plate} konum güncellemesi gecikti (${Math.round(age / 1000)}sn).`,
        vehicleId: last.vehicleId,
        ageSec: Math.round(age / 1000),
        at: last.at,
      };

      // ROOM scope
      await createNotification({ type: "STALE", scope: "ROOM", payloadJson, roomId: last.vehicle.roomId, vehicleId: last.vehicleId });
      io.to(`room:${last.vehicle.roomId}`).emit("notif:new", { scope: "ROOM", type: "STALE", payload: payloadJson });
      io.to(`room:${last.vehicle.roomId}`).emit("vehicle:status", { vehicleId: last.vehicleId, status: "STALE" });

      // COMPANY scope (Room'un Companysi)
      await createNotification({ type: "STALE", scope: "COMPANY", payloadJson, companyId: last.vehicle.room.companyId, vehicleId: last.vehicleId });
      io.to(`company:${last.vehicle.room.companyId}`).emit("notif:new", { scope: "COMPANY", type: "STALE", payload: payloadJson });

      // DRIVER scope (aktif shift üzerinden driver bulmaya çalış)
      const sh = await prisma.shift.findFirst({
        where: { vehicleId: last.vehicleId, status: { in: ["APPROVED", "ACTIVE"] }, driverId: { not: null } },
        select: { driverId: true },
      });
      if (sh?.driverId) {
        await createNotification({ type: "STALE", scope: "DRIVER", payloadJson, driverId: sh.driverId, vehicleId: last.vehicleId });
        // driver user'sa user roomuna da basabiliriz
        const dUser = await prisma.driver.findUnique({ where: { id: sh.driverId }, select: { userId: true } });
        if (dUser?.userId) io.to(`user:${dUser.userId}`).emit("notif:new", { scope: "DRIVER", type: "STALE", payload: payloadJson });
      }
    }

    // maintenance upcoming: 7 days window
    const upcoming = await prisma.vehicle.findMany({ where: { nextMaintenanceAt: { not: null } }, include: { room: true } });
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    for (const v of upcoming) {
      const due = v.nextMaintenanceAt ? new Date(v.nextMaintenanceAt).getTime() : null;
      if (!due) continue;
      const diff = due - now;
      if (diff <= 0 || diff >= sevenDays) continue;

      // spam gate: same type+vehicle within last 24h
      const existing = await prisma.notification.findFirst({
        where: {
          type: "MAINT_7D",
          vehicleId: v.id,
          createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (existing) continue;

      const payloadJson = {
        title: "Bakım Yaklaşıyor",
        message: `Araç ${v.plate} bakım tarihi yaklaştı (${new Date(due).toISOString().slice(0, 10)}).`,
        vehicleId: v.id,
        nextMaintenanceAt: v.nextMaintenanceAt,
      };

      await createNotification({ type: "MAINT_7D", scope: "ROOM", payloadJson, roomId: v.roomId, vehicleId: v.id });
      io.to(`room:${v.roomId}`).emit("notif:new", { scope: "ROOM", type: "MAINT_7D", payload: payloadJson });

      await createNotification({ type: "MAINT_7D", scope: "COMPANY", payloadJson, companyId: v.room.companyId, vehicleId: v.id });
      io.to(`company:${v.room.companyId}`).emit("notif:new", { scope: "COMPANY", type: "MAINT_7D", payload: payloadJson });

      // if any active shift -> driver
      const sh = await prisma.shift.findFirst({
        where: { vehicleId: v.id, status: { in: ["APPROVED", "ACTIVE"] }, driverId: { not: null } },
        select: { driverId: true },
      });
      if (sh?.driverId) {
        await createNotification({ type: "MAINT_7D", scope: "DRIVER", payloadJson, driverId: sh.driverId, vehicleId: v.id });
        const dUser = await prisma.driver.findUnique({ where: { id: sh.driverId }, select: { userId: true } });
        if (dUser?.userId) io.to(`user:${dUser.userId}`).emit("notif:new", { scope: "DRIVER", type: "MAINT_7D", payload: payloadJson });
      }
    }
  } catch (e) {
    console.error("backgroundTick error:", e);
  }
}

setInterval(backgroundTick, 15_000);

server.listen(ENV.PORT, () => {
  console.log(`✅ API listening on http://localhost:${ENV.PORT}`);
});


