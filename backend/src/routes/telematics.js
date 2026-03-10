import express from "express";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { makeTelematicsToken, hashTelematicsToken } from "../telematics/hash.js";
import { normalizeDirectPush, normalizeVendorPayload } from "../telematics/providers.js";
import { readDeviceToken, readProviderSecret, findDeviceByToken, findDeviceBySerial, ingestTelematicsPosition } from "../telematics/service.js";

function ensureEnabled() {
  if (!ENV.TELEMATICS_ENABLED) {
    const e = new Error("TELEMATICS_DISABLED");
    e.status = 503;
    e.code = "TELEMATICS_DISABLED";
    throw e;
  }
}

function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

async function scopedVehicleOrThrow(user, vehicleId) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, roomId: true, plate: true },
  });
  if (!vehicle) {
    const e = new Error("Vehicle not found");
    e.status = 404;
    throw e;
  }
  if (String(user.role) === "ROOM" && Number(vehicle.roomId) !== Number(user.roomId || 0)) {
    const e = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
  return vehicle;
}

export function telematicsRouter(io) {
  const r = express.Router();

  r.get("/devices", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    try {
      ensureEnabled();
      const roomId = String(req.user.role) === "ROOM" ? Number(req.user.roomId || 0) : toInt(req.query.roomId);
      const where = {};
      if (roomId) where.vehicle = { roomId };
      const items = await prisma.gpsDevice.findMany({
        where,
        include: { vehicle: { select: { id: true, plate: true, roomId: true } } },
        orderBy: [{ id: "desc" }],
      });
      return res.json({
        ok: true,
        items: items.map((x) => ({
          id: x.id,
          vendor: x.vendor,
          serial: x.serial,
          label: x.label,
          status: x.status,
          vehicleId: x.vehicleId,
          vehicle: x.vehicle,
          lastSeenAt: x.lastSeenAt,
          lastIngestAt: x.lastIngestAt,
          createdAt: x.createdAt,
          updatedAt: x.updatedAt,
        })),
      });
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.code || e.message || "list failed" });
    }
  });

  r.post("/devices", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    try {
      ensureEnabled();
      const vehicleId = toInt(req.body?.vehicleId);
      const serial = String(req.body?.serial || "").trim();
      const vendor = String(req.body?.vendor || "GENERIC").trim().toUpperCase();
      const label = req.body?.label ? String(req.body.label).trim() : null;
      if (!vehicleId || !serial) return res.status(400).json({ error: "vehicleId and serial required" });
      await scopedVehicleOrThrow(req.user, vehicleId);

      const rawToken = makeTelematicsToken();
      const created = await prisma.gpsDevice.create({
        data: {
          vehicleId,
          vendor,
          serial,
          label,
          authTokenHash: hashTelematicsToken(rawToken),
          status: "ACTIVE",
        },
      });
      return res.status(201).json({
        ok: true,
        id: created.id,
        vendor: created.vendor,
        serial: created.serial,
        label: created.label,
        vehicleId: created.vehicleId,
        status: created.status,
        token: rawToken,
      });
    } catch (e) {
      if (String(e.message || "").includes("Unique constraint")) {
        return res.status(409).json({ error: "device already exists" });
      }
      return res.status(e.status || 500).json({ error: e.code || e.message || "create failed" });
    }
  });

  r.post("/devices/:id/rotate", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    try {
      ensureEnabled();
      const id = toInt(req.params.id);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const device = await prisma.gpsDevice.findUnique({ where: { id }, include: { vehicle: true } });
      if (!device) return res.status(404).json({ error: "device not found" });
      await scopedVehicleOrThrow(req.user, device.vehicleId);

      const rawToken = makeTelematicsToken();
      await prisma.gpsDevice.update({
        where: { id },
        data: { authTokenHash: hashTelematicsToken(rawToken) },
      });
      return res.json({ ok: true, id, token: rawToken });
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.code || e.message || "rotate failed" });
    }
  });

  r.patch("/devices/:id", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    try {
      ensureEnabled();
      const id = toInt(req.params.id);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const device = await prisma.gpsDevice.findUnique({ where: { id } });
      if (!device) return res.status(404).json({ error: "device not found" });
      await scopedVehicleOrThrow(req.user, device.vehicleId);

      const data = {};
      if (req.body?.label !== undefined) data.label = req.body.label ? String(req.body.label).trim() : null;
      if (req.body?.status !== undefined) {
        const status = String(req.body.status || "").trim().toUpperCase();
        if (!["ACTIVE", "DISABLED"].includes(status)) return res.status(400).json({ error: "invalid status" });
        data.status = status;
      }
      const updated = await prisma.gpsDevice.update({ where: { id }, data });
      return res.json({ ok: true, item: updated });
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.code || e.message || "update failed" });
    }
  });

  r.post("/push", async (req, res) => {
    try {
      ensureEnabled();
      const rawToken = readDeviceToken(req);
      if (!rawToken) return res.status(401).json({ error: "DEVICE_TOKEN_REQUIRED" });
      const device = await findDeviceByToken(rawToken);
      if (!device) return res.status(401).json({ error: "DEVICE_UNAUTHORIZED" });

      const normalized = normalizeDirectPush(req.body || {});
      if (normalized.vehicleId && Number(normalized.vehicleId) !== Number(device.vehicleId)) {
        return res.status(403).json({ error: "VEHICLE_MISMATCH" });
      }
      if (normalized.serial && String(normalized.serial) !== String(device.serial)) {
        return res.status(403).json({ error: "SERIAL_MISMATCH" });
      }

      const out = await ingestTelematicsPosition(io, device, normalized);
      return res.json(out);
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.code || e.message || "push failed" });
    }
  });

  r.post("/vendor/:provider", async (req, res) => {
    try {
      ensureEnabled();
      const expected = String(ENV.TELEMATICS_VENDOR_SHARED_SECRET || "").trim();
      const got = readProviderSecret(req);
      if (!expected) return res.status(503).json({ error: "VENDOR_SECRET_NOT_CONFIGURED" });
      if (!got || got !== expected) return res.status(401).json({ error: "VENDOR_UNAUTHORIZED" });

      const provider = String(req.params.provider || "").trim();
      const normalized = normalizeVendorPayload(provider, req.body || {});
      const device = await findDeviceBySerial({ provider, serial: normalized.serial });
      if (!device) return res.status(404).json({ error: "DEVICE_NOT_FOUND" });

      const out = await ingestTelematicsPosition(io, device, normalized);
      return res.json(out);
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.code || e.message || "vendor push failed" });
    }
  });

  return r;
}

export default telematicsRouter;
