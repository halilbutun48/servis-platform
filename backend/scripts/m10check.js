// backend/scripts/m10check.js
import http from "http";
import https from "https";
import { prisma } from "../src/prisma.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function reqJson(path, { method = "GET", token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const payload = body ? JSON.stringify(body) : null;

  const headers = { "Content-Type": "application/json" };
  if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      url,
      { method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const isJson = (res.headers["content-type"] || "").includes("application/json");
          const parsed = isJson ? JSON.parse(data || "{}") : data;
          if (res.statusCode >= 400) {
            return reject(new Error(JSON.stringify(parsed)));
          }
          resolve(parsed);
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email, password) {
  const r = await reqJson("/api/auth/login", { method: "POST", body: { email, password } });
  return r.token;
}

async function main() {
  console.log("✅ Starting M10CHECK");
  console.log("API_URL =", BASE_URL);

  const tCompany = await login("company@demo.com", "demo123");
  const tRoom = await login("room@demo.com", "demo123");

  // create shift as company
  const shift = await reqJson("/api/shifts", {
    method: "POST",
    token: tCompany,
    body: {
      roomId: 1,
      startAt: new Date(Date.now() + 3600000).toISOString(),
      endAt: new Date(Date.now() + 7200000).toISOString(),
      stops: [
        { name: "A", lat: 41.01, lng: 28.97, order: 1 },
        { name: "B", lat: 41.02, lng: 28.98, order: 2 },
      ],
    },
  });

  // approve + start (should create audit logs)
  await reqJson(`/api/shifts/${shift.id}/approve`, {
    method: "POST",
    token: tRoom,
    body: { vehicleId: 1, driverId: 1 },
  });

  await reqJson(`/api/shifts/${shift.id}/start`, {
    method: "POST",
    token: tRoom,
  });

  // wait small time for async log flush
  await new Promise((r) => setTimeout(r, 200));

  const apiCount = await prisma.apiRequest.count();
  const auditCount = await prisma.auditLog.count();

  if (apiCount < 1) throw new Error("ApiRequest empty (expected >0)");
  if (auditCount < 1) throw new Error("AuditLog empty (expected >0)");

  const hasApprove = await prisma.auditLog.findFirst({ where: { action: "SHIFT_APPROVE" } });
  const hasStart = await prisma.auditLog.findFirst({ where: { action: "SHIFT_START" } });

  if (!hasApprove) throw new Error("Missing audit action SHIFT_APPROVE");
  if (!hasStart) throw new Error("Missing audit action SHIFT_START");

  console.log("✅ M10CHECK PASS");
}

main().catch((e) => {
  console.error("M10CHECK FAIL:", e.message || e);
  process.exit(1);
});
