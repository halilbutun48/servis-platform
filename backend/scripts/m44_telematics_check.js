import http from "http";
import { banner, step, must, reqJson } from "./_harness.js";
import { prisma } from "../src/prisma.js";
import { hashTelematicsToken } from "../src/telematics/hash.js";
import { ENV } from "../src/env.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

async function postRaw(path, body, headers = {}) {
  const url = new URL(path, BASE_URL);
  const payload = JSON.stringify(body ?? {});
  return new Promise((resolve) => {
    const req = http.request({
      method: "POST",
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
        ...headers,
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch {}
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, text: data });
      });
    });
    req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: String(e) }));
    req.write(payload);
    req.end();
  });
}

async function login(email, password) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password } });
  must(`login ok ${email}`, r.ok && !!r.json?.token);
  return r.json;
}

async function ensureRoomVehicle(roomUserId) {
  const roomUser = await prisma.user.findUnique({ where: { id: roomUserId }, select: { roomId: true } });
  let vehicle = await prisma.vehicle.findFirst({ where: { roomId: roomUser?.roomId ?? -1 }, orderBy: { id: "asc" } });
  if (vehicle) return vehicle;
  return prisma.vehicle.create({
    data: {
      roomId: roomUser.roomId,
      plate: `M44-${Date.now()}`.slice(0, 12),
      capacity: 16,
      speedLimitKmh: 90,
      status: "ACTIVE",
    },
  });
}

async function main() {
  banner("M44 TELEMATICS CHECK");
  must("telematics enabled", ENV.TELEMATICS_ENABLED === true);
  must("vendor secret configured", !!String(ENV.TELEMATICS_VENDOR_SHARED_SECRET || ""));

  step("seed room login and vehicle");
  const room = await login("room@demo.com", "demo123");
  const vehicle = await ensureRoomVehicle(room.user.id);
  must("room vehicle present", !!vehicle?.id);

  step("provision gps device in DB");
  const rawToken = `m44-token-${Date.now()}`;
  const serial = `M44-SERIAL-${Date.now()}`;
  const device = await prisma.gpsDevice.create({
    data: {
      vehicleId: vehicle.id,
      vendor: "GENERIC",
      serial,
      label: "M44 Test Device",
      status: "ACTIVE",
      authTokenHash: hashTelematicsToken(rawToken),
    },
  });
  must("gps device created", !!device?.id);

  step("direct device push -> gpsLast update");
  const at1 = new Date().toISOString();
  const push1 = await postRaw("/api/telematics/push", { lat: 41.01, lng: 29.01, speed: 33, at: at1, serial }, { Authorization: `Device ${rawToken}` });
  must("direct push ok", push1.ok && push1.json?.vehicleId === vehicle.id);
  must("direct push source DEVICE", String(push1.json?.source || "") === "DEVICE");

  const last1 = await prisma.gpsLast.findUnique({ where: { vehicleId: vehicle.id } });
  must("gpsLast created after direct push", !!last1 && Math.abs(Number(last1.lat) - 41.01) < 0.0001);

  const dev1 = await prisma.gpsDevice.findUnique({ where: { id: device.id } });
  must("device lastSeenAt updated", !!dev1?.lastSeenAt);

  step("vendor cloud push -> same vehicle through serial lookup");
  const at2 = new Date(Date.now() + 65_000).toISOString();
  const vendorPush = await postRaw("/api/telematics/vendor/generic", { serial, lat: 41.015, lng: 29.02, speed: 41, at: at2 }, { "x-telematics-secret": String(ENV.TELEMATICS_VENDOR_SHARED_SECRET) });
  must("vendor push ok", vendorPush.ok && vendorPush.json?.vehicleId === vehicle.id);
  must("vendor push source VENDOR", String(vendorPush.json?.source || "") === "VENDOR");

  const last2 = await prisma.gpsLast.findUnique({ where: { vehicleId: vehicle.id } });
  must("gpsLast updated after vendor push", !!last2 && Math.abs(Number(last2.lng) - 29.02) < 0.0001);

  const auditRows = await prisma.auditLog.findMany({
    where: { entity: "Vehicle", entityId: vehicle.id, action: { in: ["GPS_DEVICE_INGEST", "GPS_VENDOR_INGEST"] } },
    orderBy: { id: "asc" },
  });
  must("device/vendor audit rows created", auditRows.length >= 2);

  console.log("\n=== M44 TELEMATICS CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
