// backend/scripts/_harness.js
import http from "http";
import https from "https";

export const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

// ---- GreenPack / HTTP stability knobs ----
const GREENPACK_HEADER = process.env.GREENPACK_HEADER ?? "1";

// istekler arası min gap (rate-limit tetiklenmesini azaltır)
const MIN_GAP_MS = Number(process.env.HTTP_THROTTLE_MS ?? 120);

// 429 retry için toplam max bekleme (ms)
const MAX_WAIT_MS = Number(process.env.HTTP_429_MAXWAIT_MS ?? 4 * 60_000);

// Emoji/UTF-8 problemleri için: NO_EMOJI=1 -> ASCII yaz
const USE_EMOJI = !(String(process.env.NO_EMOJI ?? "").trim() === "1");

const I_OK = USE_EMOJI ? "OK" : "[OK]";
const I_FAIL = USE_EMOJI ? "FAIL" : "[FAIL]";
const I_INFO = USE_EMOJI ? "INFO" : "[i]";
const I_WAIT = USE_EMOJI ? "WAIT" : "[wait]";
const I_BROOM = USE_EMOJI ? "CLEAN" : "[clean]";

let _lastHttpAt = 0;

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function throttle() {
  const now = Date.now();
  const dt = now - _lastHttpAt;
  if (dt < MIN_GAP_MS) await sleep(MIN_GAP_MS - dt);
  _lastHttpAt = Date.now();
}

/**
 * Legacy helpers (M0..M15 uyum)
 * ok(msg, cond=true) -> boolean (print only)
 * must(msg, cond) -> throws if false
 */
export function ok(msg, cond = true) {
  if (cond) {
    console.log(`${I_OK} ${msg}`);
    return true;
  }
  console.log(`${I_FAIL} ${msg}`);
  return false;
}

export function must(msg, cond) {
  if (cond) {
    console.log(`${I_OK} ${msg}`);
    return true;
  }
  throw new Error(`${I_FAIL} ${msg}`);
}

/**
 * M16+ compat: assertOk / banner / step
 */
export function banner(title = "") {
  const t = String(title || "").trim();
  console.log("");
  console.log(t ? `=== ${t} ===` : "===");
}

export function step(msg) {
  console.log(`${I_INFO} ${msg}`);
}

export function assertOk(cond, label = "ok") {
  if (!cond) throw new Error(`ASSERT_FAIL: ${label}`);
  console.log(`${I_OK} ${label}`);
  return true;
}

function parseRetryAfterMs(headers) {
  const ra = headers?.["retry-after"];
  if (!ra) return null;

  const s = Number(ra);
  if (Number.isFinite(s) && s > 0) {
    return Math.min(10 * 60_000, Math.max(250, Math.round(s * 1000)));
  }

  const t = Date.parse(String(ra));
  if (Number.isFinite(t)) {
    const ms = t - Date.now();
    if (ms > 0) return Math.min(10 * 60_000, ms);
  }
  return null;
}

function parseRateLimitResetMs(headers) {
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
async function reqJsonOnce(method, path, { token, body, includeGreenpack = true } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = {
    "Content-Type": "application/json",
  };
  if (includeGreenpack) headers["x-greenpack"] = GREENPACK_HEADER; // gate traffic marker
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

    req.on("error", (e) =>
      resolve({ ok: false, status: 0, headers: {}, json: null, text: String(e) })
    );

    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Deterministic HTTP helper:
 * - min gap throttle
 * - 429 retry (Retry-After / RateLimit-Reset / backoff)
 * - returns: { ok, status, json, text, headers }
 */
export async function reqJson(method, path, { token, body, maxWaitMs = MAX_WAIT_MS, includeGreenpack = true } = {}) {
  const t0 = Date.now();
  let attempt = 0;

  while (true) {
    await throttle();
    const r = await reqJsonOnce(method, path, { token, body, includeGreenpack });

    if (r.ok) return r;

    if (r.status === 429) {
      const raMs = parseRetryAfterMs(r.headers);
      const rlMs = parseRateLimitResetMs(r.headers);
      const backoff = Math.min(10_000, 400 + attempt * 400);
      const waitMs = Math.max(raMs ?? 0, rlMs ?? 0, backoff);

      if (Date.now() - t0 + waitMs > maxWaitMs) {
        const msg = `${method} ${path} -> 429 (rate limited; maxWait exceeded)\n${String(
          r.text || ""
        ).slice(0, 800)}`;
        return { ok: false, status: 429, headers: r.headers, json: r.json, text: msg };
      }

      console.log(`${I_INFO} 429 on ${method} ${path} -> wait ${waitMs}ms (attempt=${attempt + 1})`);
      await sleep(waitMs + 100);
      attempt++;
      continue;
    }

    return r;
  }
}

export async function callAny(method, paths, { token, body, includeGreenpack = true } = {}) {
  let last = null;
  for (const p of paths) {
    last = await reqJson(method, p, { token, body, includeGreenpack });
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

function isDriverIdentifier(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (s.toLowerCase() === 'driver@demo.com') return true;
  return /^SRC-\d+$/i.test(s);
}

function buildLoginBody(identifierOrEmail, password) {
  const raw = String(identifierOrEmail || '').trim();
  const body = raw.includes('@')
    ? { email: raw, password }
    : { identifier: raw, password };

  if (isDriverIdentifier(raw)) {
    body.deviceId = process.env.DRIVER_DEVICE_ID || 'greenpack-driver-device';
  }

  return body;
}

/**
 * Auth helpers
 */
export async function login(email, password) {
  // M16 yanlış pass gönderebilir -> fallback dene (şifreyi loglamıyoruz)
  const candidates = [];

  const p0 = password ?? "";
  if (p0 && !candidates.includes(p0)) candidates.push(p0);

  const env1 = process.env.DEMO_PASS;
  const env2 = process.env.SEED_PASS;
  if (env1 && !candidates.includes(env1)) candidates.push(env1);
  if (env2 && !candidates.includes(env2)) candidates.push(env2);

  // projedeki bilinen default
  if (!candidates.includes("demo123")) candidates.push("demo123");

  // bazen farklı yazılmış olabiliyor (zararsız fallback)
  if (!candidates.includes("Demo123")) candidates.push("Demo123");
  if (!candidates.includes("demo1234")) candidates.push("demo1234");

  let last = null;

  for (let i = 0; i < candidates.length; i++) {
    const pass = candidates[i];

    const body = buildLoginBody(email, pass);

    const r = await reqJson("POST", "/api/auth/login", {
      body,
    });

    if (r.ok && r.json?.token) return r.json.token;

    last = r;

    // 401 ise başka şifre dene; farklı hata ise direkt patlat
    if (r.status !== 401) break;
  }

  const st = last?.status ?? 0;
  const txt = last?.text ?? "";
  throw new Error(`login failed ${email} -> ${st}\n${txt}`);
}

/**
 * M16+ compat: loginFirst()
 * Kullanım:
 * - loginFirst("SUPER_ADMIN") / loginFirst("room") / loginFirst("company") ...
 * - loginFirst("someone@x.com", "pass")
 */
export async function loginFirst(who = "SUPER_ADMIN", pass = null) {
  const p = pass ?? process.env.DEMO_PASS ?? "demo123";
  const key = String(who || "").trim().toLowerCase();

  // rol -> demo mail map
  const map = {
    super_admin: "superadmin@demo.com",
    superadmin: "superadmin@demo.com",
    super: "superadmin@demo.com",

    // M80/M81 seeded demo accounts (School + Parent)
    school: "school@demo.com",
    parent: "parent@demo.com",

    room: "room@demo.com",
    company: "company@demo.com",
    driver: "driver@demo.com",
    personel: "personel@demo.com",
    personnel: "personel@demo.com",
  };

  const email =
    key.includes("@") ? String(who).trim() : (map[key] ?? "superadmin@demo.com");

  return await login(email, p);
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
  driverToken, // (şu an kullanılmıyor ama signature kalsın)
  companyId,
  roomId,
  vehicleId,
  driverId,
  tag = "HARNESS",
}) {
  const nowTag = tag + "-" + new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

  // OK KVKK time-window gate uyumu
  // Company canlı takip/notification fanout artık startAt<=now<=endAt şartına bağlı.
  // ACTIVE shift "şu an çalışıyor" demektir; bu yüzden GreenPack harness shift'i NOW aralığını kapsamalı.
  const startAt = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // started ~2m ago
  const endAt = new Date(Date.now() + 70 * 60 * 1000).toISOString();  // ends ~70m later
const shBody = {
    companyId,
    roomId,
    startAt,
    endAt,
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
  if (!shCreate.ok) {
    throw new Error(`shift create -> ${shCreate.r.status}\n${String(shCreate.r.text || "").slice(0, 400)}`);
  }

  const shiftId = shCreate.r.json?.id ?? shCreate.r.json?.shift?.id;
  if (!shiftId) throw new Error("shiftId missing");

  // approve body: SADECE vehicleId + driverId
  const shApprove = await callAny(
    "PUT",
    [`/api/shifts/${shiftId}/approve`, `/api/shifts/${shiftId}/assign`],
    { token: roomToken, body: { vehicleId, driverId } }
  );
  if (!shApprove.ok) {
    throw new Error(`approve -> ${shApprove.r.status}\n${String(shApprove.r.text || "").slice(0, 400)}`);
  }

  const shStart = await callAny(
    "POST",
    [`/api/shifts/${shiftId}/start`, `/api/shifts/${shiftId}/activate`],
    { token: roomToken, body: {} }
  );
  if (!shStart.ok) {
    throw new Error(`start -> ${shStart.r.status}\n${String(shStart.r.text || "").slice(0, 400)}`);
  }

  return {
    shiftId: Number(shiftId),
    vehicleId: Number(vehicleId),
    driverId: Number(driverId),
    startAt,
    endAt,
  };
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

export async function kvkkAccept(token, docKey = "LOCATION_CONSENT", docVersion = "1") {
  return reqJson("POST", "/api/kvkk/consents/accept", {
    token,
    body: { docKey, docVersion },
  });
}


export async function postGps(driverToken, body) {
  const payload = { ts: new Date().toISOString(), ...body };
  if (payload.speed == null && payload.speedKmh == null) payload.speed = 20;

  let r = await reqJson("POST", "/api/gps", { token: driverToken, body: payload });

  // M38: KVKK consent gate — auto accept in harness (dev/test only)
  if (!r.ok && r.status === 403 && String(r.json?.error || "") === "KVKK_CONSENT_REQUIRED") {
    const dk = String(r.json?.docKey || "LOCATION_CONSENT");
    const dv = String(r.json?.docVersion || "1");
    const acc = await kvkkAccept(driverToken, dk, dv);
    if (acc.ok) {
      r = await reqJson("POST", "/api/gps", { token: driverToken, body: payload });
    }
  }

  if (!r.ok) throw new Error(`POST /api/gps -> ${r.status}\n${String(r.text || "").slice(0, 400)}`);
  return r;
}


// Küçük log helper’ları (istersen kullanırsın)
export const ICONS = { I_OK, I_FAIL, I_INFO, I_WAIT, I_BROOM };

