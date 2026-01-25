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

import { createAndEmitNotification } from "./notifications/service.js";
import { buildNotifPayloadV1 } from "./notifications/payloadV1.js";
import { gpsStatusFromAt } from "./gps/status.js";
import { gateVehicleGpsState } from "./gps/gpsStateGate.js"; // ✅ transition gate

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

// Background checks: stale/offline vehicles + maintenance upcoming
async function backgroundTick() {
  try {
    // ✅ DB hazır değilse tick'i pas geç (log spam olmasın)
    try {
      await prisma.$queryRaw`SELECT 1`;
      globalThis.__dbWarned = false;
    } catch (e) {
      if (!globalThis.__dbWarned) {
        globalThis.__dbWarned = true;
        console.warn("backgroundTick: DB not ready, skipping checks.");
      }
      return;
    }

    const now = new Date();
    const nowMs = now.getTime();

    // ----------------------------
    // 1) GPS STALE/OFFLINE monitor
    // ----------------------------
    const lasts = await prisma.gpsLast.findMany({
      include: { vehicle: { include: { room: true } } },
    });

    for (const last of lasts) {
      const vehicle = last.vehicle;
      if (!vehicle) continue;

      // Tek kaynak UI status/ageSec: LIVE | STALE | OFFLINE
      const derived = gpsStatusFromAt(last.at);
      const uiStatus = derived?.status ?? "OFFLINE";
      const ageSec =
        typeof derived?.ageSec === "number"
          ? derived.ageSec
          : Math.max(
              0,
              Math.round((nowMs - new Date(last.at).getTime()) / 1000)
            );

      // UI status yayınla (harita/clients güncel kalsın)
      const vehicleStatusPayload = {
        vehicleId: last.vehicleId,
        status: uiStatus,
        ageSec,
      };
      io.to(`vehicle:${last.vehicleId}`).emit("vehicle:status", vehicleStatusPayload);
      io.to(`room:${vehicle.roomId}`).emit("vehicle:status", vehicleStatusPayload);
      io.to(`company:${vehicle.room.companyId}`).emit("vehicle:status", vehicleStatusPayload);

      // DB mapping: LIVE => OK/ACTIVE, STALE/OFFLINE => STALE/STALE
      const gpsLastDbStatus = uiStatus === "LIVE" ? "OK" : "STALE";
      const vehicleDbStatus = uiStatus === "LIVE" ? "ACTIVE" : "STALE";

      // gereksiz write olmasın
      await prisma.gpsLast.updateMany({
        where: { vehicleId: last.vehicleId, status: { not: gpsLastDbStatus } },
        data: { status: gpsLastDbStatus },
      });

      await prisma.vehicle.updateMany({
        where: { id: last.vehicleId, status: { not: vehicleDbStatus } },
        data: { status: vehicleDbStatus },
      });

      // ✅ SPAM'i KESEN YER: UI status transition gate
      const gate = await gateVehicleGpsState({
        prisma,
        vehicleId: last.vehicleId,
        newUiStatus: uiStatus,
        now,
      });

      if (!gate.shouldNotify) continue;

      // backgroundTick sadece STALE/OFFLINE transition üretir.
      // Recovery (TO_LIVE) /api/gps içinde üretilsin.
      let kind = null;
      let title = null;

      if (gate.transition === "LIVE_TO_STALE") {
        kind = "GPS_STALE";
        title = "GPS Stale";
      } else if (gate.transition === "STALE_TO_OFFLINE") {
        kind = "GPS_OFFLINE";
        title = "GPS Offline";
      } else {
        continue;
      }

      const payload = buildNotifPayloadV1({
        title,
        message:
          kind === "GPS_OFFLINE"
            ? `Araç ${vehicle.plate} uzun süredir çevrimdışı (${ageSec}sn).`
            : `Araç ${vehicle.plate} konum güncellemesi gecikti (${ageSec}sn).`,
        vehicleId: last.vehicleId,
        at: now.toISOString(),
        ageSec,
        status: uiStatus,
        kind,
      });

      // ROOM scope
      await createAndEmitNotification({
        io,
        type: "STALE", // geriye dönük uyumluluk
        scope: "ROOM",
        payload,
        roomId: vehicle.roomId,
        companyId: vehicle.room.companyId,
        vehicleId: last.vehicleId,
      });

      // COMPANY scope
      await createAndEmitNotification({
        io,
        type: "STALE",
        scope: "COMPANY",
        payload,
        companyId: vehicle.room.companyId,
        roomId: vehicle.roomId,
        vehicleId: last.vehicleId,
      });

      // DRIVER scope (aktif shift üzerinden driver bul)
      const sh = await prisma.shift.findFirst({
        where: {
          vehicleId: last.vehicleId,
          status: { in: ["APPROVED", "ACTIVE"] },
          driverId: { not: null },
        },
        select: { driverId: true },
      });

      if (sh?.driverId) {
        const dUser = await prisma.driver.findUnique({
          where: { id: sh.driverId },
          select: { userId: true },
        });

        await createAndEmitNotification({
          io,
          type: "STALE",
          scope: "DRIVER",
          payload,
          driverId: sh.driverId,
          userId: dUser?.userId ?? null,
          vehicleId: last.vehicleId,
          roomId: vehicle.roomId,
          companyId: vehicle.room.companyId,
        });
      }
    }

    // ----------------------------
    // 2) Maintenance upcoming: 7 days window
    // ----------------------------
    const upcoming = await prisma.vehicle.findMany({
      where: { nextMaintenanceAt: { not: null } },
      include: { room: true },
    });

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const v of upcoming) {
      const due = v.nextMaintenanceAt ? new Date(v.nextMaintenanceAt).getTime() : null;
      if (!due) continue;

      const diff = due - nowMs;
      if (diff <= 0 || diff >= sevenDaysMs) continue;

      // spam gate: same type+vehicle within last 24h
      const existing = await prisma.notification.findFirst({
        where: {
          type: "MAINT_7D",
          vehicleId: v.id,
          createdAt: { gte: new Date(nowMs - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (existing) continue;

      const payload = buildNotifPayloadV1({
        title: "Bakım Yaklaşıyor",
        message: `Araç ${v.plate} bakım tarihi yaklaştı (${new Date(due).toISOString().slice(0, 10)}).`,
        vehicleId: v.id,
        at: new Date().toISOString(),
        ageSec: null,
        status: null,
        kind: "MAINT_7D",
      });

      await createAndEmitNotification({
        io,
        type: "MAINT_7D",
        scope: "ROOM",
        payload,
        roomId: v.roomId,
        companyId: v.room.companyId,
        vehicleId: v.id,
      });

      await createAndEmitNotification({
        io,
        type: "MAINT_7D",
        scope: "COMPANY",
        payload,
        companyId: v.room.companyId,
        roomId: v.roomId,
        vehicleId: v.id,
      });

      // if any active shift -> driver
      const sh = await prisma.shift.findFirst({
        where: {
          vehicleId: v.id,
          status: { in: ["APPROVED", "ACTIVE"] },
          driverId: { not: null },
        },
        select: { driverId: true },
      });

      if (sh?.driverId) {
        const dUser = await prisma.driver.findUnique({
          where: { id: sh.driverId },
          select: { userId: true },
        });

        await createAndEmitNotification({
          io,
          type: "MAINT_7D",
          scope: "DRIVER",
          payload,
          driverId: sh.driverId,
          userId: dUser?.userId ?? null,
          vehicleId: v.id,
          roomId: v.roomId,
          companyId: v.room.companyId,
        });
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

console.log("server reload test", new Date().toISOString());