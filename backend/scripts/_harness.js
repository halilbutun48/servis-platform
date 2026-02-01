// backend/scripts/_harness.js
import http from "http";
import https from "https";

export const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

// ---- GreenPack / HTTP stability knobs ----
const GREENPACK_HEADER = "1";

// istekler arası min gap (rate-limit tetiklenmesini azaltır)
const MIN_GAP_MS = Number(process.env.HTTP_THROTTLE_MS ?? 120);

// 429 retry için toplam max bekleme (ms)
const MAX_WAIT_MS = Number(process.env.HTTP_429_MAXWAIT_MS ?? 4 * 60_000);

let _lastHttpAt = 0;

async function throttle() {
  const now = Date.now();
  const dt = now - _lastHttpAt;
  if (dt < MIN_GAP_MS) await sleep(MIN_GAP_MS - dt);
  _lastHttpAt = Date.now();
}

export function ok(msg, cond = true) {
  if (cond) {
    console.log(`✅ ${msg}`);
    return true;
  }
  console.log(`❌ ${msg}`);
  return false;
}

export function must(msg, cond) {
  if (cond) {
    console.log(`✅ ${msg}`);
    return true;
  }
  throw new Error(`❌ ${msg}`);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfterMs(headers) {
  const ra = headers?.["retry-after"];
  if (!ra) return null;

  const s = Number(ra);
  if (Number.isFinite(s) && s > 0) return Math.min(10 * 60_000, Math.max(250, Math.round(s * 1000)));

  const t = Date.parse(String(ra));
  if (Number.isFinite(t)) {
    const ms = t - Date.now();
    if (ms > 0) return Math.min(10 * 60_000, ms);
  }
  return null;
}

function parseRateLimitResetMs(headers) {
  // bazı implementasyonlar ratelimit-reset header’ı döndürüyor
  const raw = headers?.["ratelimit-reset"];
  if (!raw) return null;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;

  // epoch seconds vs delta seconds ayrımı
  if (n > 1_000_000_000) {
    const ms = n * 1000 - Date.now();
    return ms > 0 ? Math.min(10 * 60_000, ms) : 0;
  }
  return Math.min(10 * 60_000, Math.round(n * 1000));
}

// Raw request (429 retry yok)
async function reqJsonOnce(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = {
    "Content-Type": "application/json",
    "x-greenpack": GREENPACK_HEADER, // ✅ gate traffic marker
  };
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
            headers: res.headers ?? {},
            json,
            text,
          });
        });
      }
    );

    req.on("error", (e) => resolve({ ok: false, status: 0, headers: {}, json: null, text: String(e) }));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Deterministic HTTP helper:
 * - min gap throttle
 * - 429 retry (Retry-After / RateLimit-Reset / backoff)
 * - returns same shape as old reqJson: { ok, status, json, text, headers }
 */
export async function reqJson(method, path, { token, body, maxWaitMs = MAX_WAIT_MS } = {}) {
  const t0 = Date.now();
  let attempt = 0;

  while (true) {
    await throttle();
    const r = await reqJsonOnce(method, path, { token, body });

    if (r.ok) return r;

    if (r.status === 429) {
      const raMs = parseRetryAfterMs(r.headers);
      const rlMs = parseRateLimitResetMs(r.headers);
      const backoff = Math.min(10_000, 400 + attempt * 400);
      const waitMs = Math.max(raMs ?? 0, rlMs ?? 0, backoff);

      if (Date.now() - t0 + waitMs > maxWaitMs) {
        // aynı hata formatını koru (scripts log’ları için)
        const msg = `${method} ${path} -> 429 (rate limited; maxWait exceeded)\n${String(r.text || "").slice(0, 800)}`;
        return { ok: false, status: 429, headers: r.headers, json: r.json, text: msg };
      }

      console.log(`ℹ️ 429 on ${method} ${path} -> wait ${waitMs}ms (attempt=${attempt + 1})`);
      await sleep(waitMs + 100);
      attempt++;
      continue;
    }

    return r;
  }
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
  // resp: { ok,status,json,text,... }
  const j = resp?.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.suggestions)) return j.suggestions;
  return [];
}

export async function login(email, password) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password } });
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

  // kısa aralık (gate hızlı olsun)
  const startAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const endAt = new Date(Date.now() + 70 * 60 * 1000).toISOString();

  const shBody = {
    companyId,
    roomId,
    startAt,
    endAt,
    // status göndermiyoruz (backend default REQUESTED set etmeli)
    stops: [
      { name: `${tag} Stop 1 ${nowTag}`, lat: 41.0306, lng: 28.9964, order: 1, type: "COMMON" },
      { name: `${tag} Stop 2 ${nowTag}`, lat: 41.031, lng: 28.9968, order: 2, type: "COMMON" },
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

  // approve body: SADECE vehicleId + driverId
  const shApprove = await callAny(
    "PUT",
    [`/api/shifts/${shiftId}/approve`, `/api/shifts/${shiftId}/assign`],
    { token: roomToken, body: { vehicleId, driverId } }
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
  // ACTIVE olmayan shiftlerde reached/complete 400 dönebilir; ignore.
  for (let order = 1; order <= 8; order++) {
    const r = await reqJson("POST", `/api/shifts/${shiftId}/reached`, {
      token: driverToken,
      body: { order },
    });
    if (r.status === 401 || r.status === 403) break;
  }

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

  // room fallback
  const done2 = await callAny(
    "POST",
    [`/api/shifts/${shiftId}/complete`, `/api/shifts/${shiftId}/done`],
    { token: roomToken, body: {} }
  );
  if (done2.ok) return true;

  // EN SON çare: reject (özellikle APPROVED/REQUESTED cleanup için)
  const rej = await callAny("PUT", [`/api/shifts/${shiftId}/reject`], {
    token: roomToken,
    body: { reason: "harness cleanup" },
  });
  return !!rej.ok;
}

export async function preCleanDriverShifts({ roomToken, driverToken, driverId }) {
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

    const okClose = await closeShiftHard({ shiftId: sid, driverToken, roomToken });
    if (okClose) cleaned++;
  }

  return { cleaned, found: openish.length };
}

export async function postGps(driverToken, body) {
  const payload = { ts: new Date().toISOString(), ...body };
  if (payload.speed == null && payload.speedKmh == null) payload.speed = 20;

  const r = await reqJson("POST", "/api/gps", { token: driverToken, body: payload });
  if (!r.ok) throw new Error(`POST /api/gps -> ${r.status}\n${r.text.slice(0, 400)}`);
  return r;
}
