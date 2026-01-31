// backend/scripts/_harness.js
import http from "http";
import https from "https";

export const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function reqJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve) => {
    const req = lib.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const text = data || "";
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json,
            text,
          });
        });
      }
    );

    req.on("error", (e) =>
      resolve({ ok: false, status: 0, json: null, text: String(e) })
    );
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export async function callAny(method, paths, { token, body } = {}) {
  let last = null;
  for (const p of paths) {
    last = await reqJson(method, p, { token, body });
    if (last.ok) return { ok: true, path: p, r: last };
    if (last.status === 404) continue;
  }
  return { ok: false, path: paths[0], r: last };
}

export function itemsOf(resp) {
  const j = resp?.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.suggestions)) return j.suggestions;
  return [];
}

export async function login(email, password) {
  const r = await reqJson("POST", "/api/auth/login", {
    body: { email, password },
  });
  if (!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  if (!r.json?.token) throw new Error(`token missing for ${email}`);
  return r.json.token;
}

export async function getRoomCompanyIds(roomToken, companyToken) {
  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  const meComp = await reqJson("GET", "/api/me", { token: companyToken });
  return {
    roomId: meRoom.json?.roomId ?? 1,
    companyId: meComp.json?.companyId ?? 1,
  };
}

export async function pickVehicleDriver(roomToken) {
  const vlist = await reqJson("GET", "/api/vehicles", { token: roomToken });
  const dlist = await reqJson("GET", "/api/drivers", { token: roomToken });

  const vehicleId = vlist.json?.items?.[0]?.id ?? vlist.json?.[0]?.id ?? 1;
  const driverId = dlist.json?.items?.[0]?.id ?? dlist.json?.[0]?.id ?? 1;

  return { vehicleId: Number(vehicleId), driverId: Number(driverId) };
}

export async function ensureActiveShift({
  companyToken,
  roomToken,
  driverToken,
  companyId,
  roomId,
  vehicleId,
  driverId,
  tag = "HARNESS",
}) {
  const nowTag = tag + "-" + new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

  const startAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const endAt = new Date(Date.now() + 70 * 60 * 1000).toISOString();

  const shBody = {
    companyId,
    roomId,
    startAt,
    endAt,
    status: "REQUESTED",
    stops: [
      { name: `${tag} Stop 1 ${nowTag}`, lat: 41.0306, lng: 28.9964, order: 1, type: "COMMON" },
      { name: `${tag} Stop 2 ${nowTag}`, lat: 41.0310, lng: 28.9968, order: 2, type: "COMMON" },
      { name: `${tag} Stop 3 ${nowTag}`, lat: 41.0313, lng: 28.9971, order: 3, type: "COMMON" },
    ],
  };

  const shCreate = await callAny("POST", ["/api/shifts", "/api/shift"], {
    token: companyToken,
    body: shBody,
  });
  if (!shCreate.ok) throw new Error(`shift create -> ${shCreate.r.status}\n${shCreate.r.text.slice(0, 400)}`);

  const shiftId = shCreate.r.json?.id ?? shCreate.r.json?.shift?.id;
  if (!shiftId) throw new Error("shiftId missing");

  const shApprove = await callAny(
    "PUT",
    [`/api/shifts/${shiftId}/approve`, `/api/shifts/${shiftId}/assign`],
    { token: roomToken, body: { vehicleId, driverId, status: "APPROVED" } }
  );
  if (!shApprove.ok) {
    throw new Error(`approve -> ${shApprove.r.status}\n${shApprove.r.text.slice(0, 400)}`);
  }

  const shStart = await callAny(
    "POST",
    [`/api/shifts/${shiftId}/start`, `/api/shifts/${shiftId}/activate`],
    { token: roomToken, body: {} }
  );
  if (!shStart.ok) {
    throw new Error(`start -> ${shStart.r.status}\n${shStart.r.text.slice(0, 400)}`);
  }

  return { shiftId: Number(shiftId), vehicleId: Number(vehicleId), driverId: Number(driverId), startAt, endAt };
}

export async function closeShiftHard({ shiftId, driverToken, roomToken }) {
  // try reach a few orders; ignore 400/404
  for (let order = 1; order <= 8; order++) {
    const r = await reqJson("POST", `/api/shifts/${shiftId}/reached`, {
      token: driverToken,
      body: { order },
    });
    if (r.status === 401 || r.status === 403) break;
  }

  // prefer driver complete endpoint (projende var: /api/driver/shifts/:id/complete)
  const done = await callAny(
    "POST",
    [
      `/api/driver/shifts/${shiftId}/complete`,
      `/api/driver/shifts/${shiftId}/done`,
      `/api/shifts/${shiftId}/complete`,
      `/api/shifts/${shiftId}/done`,
    ],
    { token: driverToken, body: {} }
  );

  if (done.ok) return true;

  // room fallback (bazı sistemlerde complete room tarafında)
  const done2 = await callAny(
    "POST",
    [`/api/shifts/${shiftId}/complete`, `/api/shifts/${shiftId}/done`],
    { token: roomToken, body: {} }
  );
  return !!done2.ok;
}

export async function preCleanDriverShifts({ roomToken, driverToken, driverId }) {
  // try list open shifts
  const list = await callAny("GET", ["/api/shifts?onlyOpen=1", "/api/shifts"], { token: roomToken });
  if (!list.ok) return { cleaned: 0, found: 0 };

  const items = itemsOf(list.r);
  const openish = (items ?? []).filter((s) => {
    const did = Number(s?.driverId ?? s?.driver?.id);
    const st = String(s?.status ?? "");
    if (did !== Number(driverId)) return false;
    return ["APPROVED", "ACTIVE", "REQUESTED"].includes(st);
  });

  let cleaned = 0;
  for (const s of openish) {
    const sid = Number(s?.id);
    if (!sid) continue;
    const ok = await closeShiftHard({ shiftId: sid, driverToken, roomToken });
    if (ok) cleaned++;
  }
  return { cleaned, found: openish.length };
}

export async function postGps(driverToken, body) {
  const payload = {
    ts: new Date().toISOString(),
    ...body,
  };
  if (payload.speed == null && payload.speedKmh == null) payload.speed = 20;

  const r = await reqJson("POST", "/api/gps", { token: driverToken, body: payload });
  if (!r.ok) throw new Error(`POST /api/gps -> ${r.status}\n${r.text.slice(0, 400)}`);
  return r;
}
