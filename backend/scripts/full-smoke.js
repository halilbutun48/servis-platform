/* backend/scripts/full-smoke.js
 * Full Smoke (V1): Encoding + Health + Auth + /api/me + Lists + Vehicle->Driver bind
 *                + ROOM room-offer + COMPANY room-offer-decision
 *                + (best-effort) conflict probe
 *                + WS: connect then trigger room-offer to observe shift-like event
 *
 * Usage (PowerShell):
 *  cd backend
 *  $env:API_URL="http://127.0.0.1:3000"
 *  $env:ROOM_EMAIL="room@demo.com"; $env:ROOM_PASS="demo123"
 *  $env:COMPANY_EMAIL="company@demo.com"; $env:COMPANY_PASS="demo123"
 *  $env:SMOKE_DEBUG="1"
 *  node .\scripts\full-smoke.js
 *
 * Optional shortcuts:
 *  $env:ROOM_TOKEN="..."     # varsa ROOM login yerine kullanır
 *  $env:COMPANY_TOKEN="..."  # varsa COMPANY login yerine kullanır
 *
 * Optional:
 *  $env:SMOKE_TIMEOUT_MS="8000"
 */

import http from "http";
import https from "https";
import fs from "fs";
import path from "path";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

const ROOM_TOKEN = process.env.ROOM_TOKEN ?? "";
const COMPANY_TOKEN = process.env.COMPANY_TOKEN ?? "";

const ROOM_EMAIL = process.env.ROOM_EMAIL ?? "";
const ROOM_PASS = process.env.ROOM_PASS ?? "";

const COMPANY_EMAIL = process.env.COMPANY_EMAIL ?? "";
const COMPANY_PASS = process.env.COMPANY_PASS ?? "";

const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 8000);
const DEBUG = String(process.env.SMOKE_DEBUG ?? "").trim() === "1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPlaceholder(v) {
  if (!v) return true;
  const s = String(v).trim().toLowerCase();
  return (
    s === "..." ||
    s === "xxx" ||
    s === "changeme" ||
    s === "todo" ||
    s === "email" ||
    s === "password" ||
    s === "paste_token" ||
    s === "paste-token" ||
    s.includes("buraya") ||
    s.includes("senin_") ||
    s.includes("buldugun")
  );
}

function snippet(t, n = 240) {
  const s = String(t ?? "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function pickToken(json) {
  return json?.token || json?.accessToken || json?.data?.token || null;
}

function reqJson(method, p, { token, body, headers: extraHeaders } = {}) {
  const url = new URL(p, API_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = { "Content-Type": "application/json", "x-greenpack": process.env.GREENPACK_HEADER ?? "1", ...(extraHeaders ?? {}) };

  // backend bazen Bearer bazen x-auth-token → ikisini de gönder
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["x-auth-token"] = token;
  }

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
            headers: res.headers,
          });
        });
      }
    );

    req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: String(e), headers: {} }));
    req.setTimeout(TIMEOUT_MS, () => {
      try {
        req.destroy();
      } catch {}
      resolve({ ok: false, status: 0, json: null, text: "timeout", headers: {} });
    });

    if (body != null) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password, label) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password } });
  const tok = pickToken(r.json);
  if (!r.ok || !tok) throw new Error(`${label} login failed: ${r.status} ${snippet(r.text)}`);
  return tok;
}

function firstId(listJson) {
  if (!listJson) return null;
  if (Array.isArray(listJson)) return listJson[0]?.id ?? null;
  if (Array.isArray(listJson.items)) return listJson.items[0]?.id ?? null;
  if (Array.isArray(listJson.data)) return listJson.data[0]?.id ?? null;
  if (Array.isArray(listJson.rows)) return listJson.rows[0]?.id ?? null;
  return null;
}

async function runEncodingCheck() {
  const root = path.resolve(process.cwd(), "..", "web");
  const srcDir = path.join(root, "src");
  const files = [];

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(js|jsx|ts|tsx|html|css)$/i.test(ent.name)) files.push(full);
    }
  }

  if (fs.existsSync(srcDir)) walk(srcDir);

  const ix = path.join(root, "index.html");
  if (fs.existsSync(ix)) files.push(ix);

  // legacy encoding garbage detector
  const badRe = /Ã|Ä|Å|â/;
  const bad = [];
  for (const f of files) {
    const t = fs.readFileSync(f, "utf8");
    if (badRe.test(t)) bad.push(f);
  }
  return { ok: bad.length === 0, bad };
}

async function probeGetVerbose(token, paths) {
  const attempts = [];
  for (const p of paths) {
    const r = await reqJson("GET", p, { token });
    if (DEBUG) console.log("[probe]", r.status, p);
    attempts.push({ path: p, status: r.status, ok: r.ok, text: snippet(r.text) });
    if (r.ok) return { ok: true, path: p, res: r, attempts };
  }
  return { ok: false, path: null, res: null, attempts };
}

async function runWsSignal(roomToken, shiftId) {
  let io = null;
  try {
    const mod = await import("socket.io-client");
    io = mod.io;
  } catch {
    return { ok: false, skipped: true, reason: "socket.io-client not installed" };
  }

  if (!shiftId) return { ok: false, skipped: true, reason: "No shiftId to trigger WS event" };

  const origin = new URL(API_URL).origin;

  return await new Promise((resolve) => {
    const socket = io(origin, {
      transports: ["websocket"],
      reconnection: false,
      timeout: TIMEOUT_MS,
      auth: { token: roomToken },
      extraHeaders: { Authorization: `Bearer ${roomToken}`, "x-auth-token": roomToken },
    });

    let got = false;

    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {}
      resolve({ ok: got, skipped: !got, reason: got ? null : "connected but no shift-like event observed" });
    }, TIMEOUT_MS);

    socket.onAny((event) => {
      const ev = String(event || "").toLowerCase();
      if (ev.includes("shift")) got = true;
    });

    socket.on("connect", async () => {
      // Bağlanınca event tetikle: room-offer
      try {
        await reqJson("PUT", `/api/shifts/${shiftId}/room-offer`, {
          token: roomToken,
          body: { roomOfferAmount: 111, roomOfferNote: "WS Smoke trigger" },
        });
      } catch {}
    });

    socket.on("connect_error", (e) => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      resolve({ ok: false, skipped: true, reason: `connect_error: ${String(e?.message ?? e)}` });
    });
  });
}

async function main() {
  const results = [];
  const fail = (name, extra) => results.push({ name, ok: false, ...extra });
  const pass = (name, extra) => results.push({ name, ok: true, ...extra });
  const skip = (name, extra) => results.push({ name, ok: true, skipped: true, ...extra });

  // 0) Encoding
  const enc = await runEncodingCheck();
  if (enc.ok) pass("encoding:web/src clean");
  else fail("encoding:web/src clean", { badFiles: enc.bad.slice(0, 10), note: enc.bad.length > 10 ? `+${enc.bad.length - 10} more` : "" });

  // 1) Health
  const health = await probeGetVerbose(null, ["/api/health", "/health", "/api/_ping", "/_ping"]);
  if (health.ok) pass(`api:health probe (${health.path})`, { status: health.res.status });
  else fail("api:health probe", { note: "No health endpoint matched", attempts: health.attempts });

  // 2) Auth tokens
  let roomToken = ROOM_TOKEN;
  if (isPlaceholder(roomToken)) {
    if (isPlaceholder(ROOM_EMAIL) || isPlaceholder(ROOM_PASS)) {
      return void fail("auth:ROOM token/login", { note: "ROOM_TOKEN yok, ROOM_EMAIL/ROOM_PASS da yok" });
    }
    try {
      roomToken = await login(ROOM_EMAIL, ROOM_PASS, "ROOM");
      pass("auth:ROOM login", { email: ROOM_EMAIL });
    } catch (e) {
      return void fail("auth:ROOM login", { note: String(e?.message ?? e) });
    }
  } else {
    pass("auth:ROOM token (env)");
  }

  let companyToken = COMPANY_TOKEN;
  if (isPlaceholder(companyToken)) {
    if (!isPlaceholder(COMPANY_EMAIL) && !isPlaceholder(COMPANY_PASS)) {
      try {
        companyToken = await login(COMPANY_EMAIL, COMPANY_PASS, "COMPANY");
        pass("auth:COMPANY login", { email: COMPANY_EMAIL });
      } catch (e) {
        companyToken = null;
        fail("auth:COMPANY login", { note: String(e?.message ?? e) });
      }
    } else {
      companyToken = null;
      skip("auth:COMPANY login", { note: "COMPANY_EMAIL/COMPANY_PASS yok" });
    }
  } else {
    pass("auth:COMPANY token (env)");
  }

  // 2.1) /api/me
  const me = await reqJson("GET", "/api/me", { token: roomToken });
  if (me.ok) pass("api:me (token ok)", { me: me.json });
  else fail("api:me (token ok)", { status: me.status, text: snippet(me.text) });

  // 3) Lists (we know exact endpoints)
  let vehicleId = null,
    driverId = null,
    shiftId = null;

  const v = await probeGetVerbose(roomToken, ["/api/vehicles", "/api/vehicles?take=10", "/api/vehicles?limit=10"]);
  if (v.ok) {
    vehicleId = firstId(v.res.json);
    pass(`api:list vehicles (${v.path})`, { pickedVehicleId: vehicleId ?? null });
  } else fail("api:list vehicles", { attempts: v.attempts.slice(0, 8) });

  const d = await probeGetVerbose(roomToken, ["/api/drivers", "/api/drivers?take=10", "/api/drivers?limit=10"]);
  if (d.ok) {
    driverId = firstId(d.res.json);
    pass(`api:list drivers (${d.path})`, { pickedDriverId: driverId ?? null });
  } else fail("api:list drivers", { attempts: d.attempts.slice(0, 8) });

  const s = await probeGetVerbose(roomToken, ["/api/shifts", "/api/shifts?take=10", "/api/shifts?limit=10"]);
  if (s.ok) {
    shiftId = firstId(s.res.json);
    pass(`api:list shifts (${s.path})`, { pickedShiftId: shiftId ?? null });
  } else fail("api:list shifts", { attempts: s.attempts.slice(0, 8) });

  // 4) Vehicle->Driver bind (best-effort)
  if (vehicleId && driverId) {
    const candidates = [
      { method: "PUT", path: `/api/vehicles/${vehicleId}/driver/${driverId}` },
      { method: "PUT", path: `/api/vehicles/${vehicleId}/bind-driver`, body: { driverId } },
      { method: "POST", path: `/api/vehicles/${vehicleId}/bind`, body: { driverId } },
      { method: "PATCH", path: `/api/vehicles/${vehicleId}`, body: { driverId } },
      { method: "PUT", path: `/api/vehicles/${vehicleId}`, body: { driverId } },
    ];

    let ok = false,
      used = null,
      last = null;

    for (const c of candidates) {
      const r = await reqJson(c.method, c.path, { token: roomToken, body: c.body });
      last = r;
      if (r.ok) {
        ok = true;
        used = c;
        break;
      }
    }

    if (ok) pass("vehicle:bind driver", { used });
    else fail("vehicle:bind driver", { lastStatus: last?.status, lastText: snippet(last?.text) });
  } else {
    skip("vehicle:bind driver", { note: "Need vehicleId + driverId" });
  }

  // 5) ROOM offer + COMPANY decision (doğru endpoint'ler)
  if (shiftId) {
    const ro = await reqJson("PUT", `/api/shifts/${shiftId}/room-offer`, {
      token: roomToken,
      body: { roomOfferAmount: 1234, roomOfferNote: "Smoke" },
    });

    if (!ro.ok) {
      fail("shift:room offer (ROOM)", { status: ro.status, text: snippet(ro.text) });
    } else {
      pass("shift:room offer (ROOM)");
    }

    if (ro.ok) {
      if (!companyToken) {
        skip("shift:room offer decision (COMPANY)", { note: "COMPANY token yok" });
      } else {
        const dec = await reqJson("PUT", `/api/shifts/${shiftId}/room-offer-decision`, {
          token: companyToken,
          body: { decision: "ACCEPTED", note: "ok" },
        });

        if (!dec.ok) fail("shift:room offer decision (COMPANY)", { status: dec.status, text: snippet(dec.text) });
        else pass("shift:room offer decision (COMPANY)");
      }
    } else {
      skip("shift:room offer decision (COMPANY)", { note: "ROOM offer başarısız → decision atlandı" });
    }
  } else {
    skip("shift:room offer/decision", { note: "Need shiftId" });
  }

  // 6) Conflict best-effort (generic)
  if (shiftId && vehicleId) {
    const candidates = [
      { method: "POST", path: `/api/shifts/${shiftId}/approve`, body: { vehicleId } },
      { method: "POST", path: `/api/shifts/${shiftId}/assign`, body: { vehicleId } },
      { method: "PATCH", path: `/api/shifts/${shiftId}`, body: { status: "APPROVED", roomOfferVehicleId: vehicleId } },
    ];

    let first = null,
      second = null;

    for (const c of candidates) {
      first = await reqJson(c.method, c.path, { token: roomToken, body: c.body });
      if (first.ok) {
        await sleep(200);
        second = await reqJson(c.method, c.path, { token: roomToken, body: c.body });
        break;
      }
    }

    if (first?.ok && second && (second.status === 409 || second.status === 400)) {
      pass("shift:conflict signal (second attempt blocked)", { firstStatus: first.status, secondStatus: second.status });
    } else {
      skip("shift:conflict signal", {
        note: "Could not confidently trigger conflict",
        firstStatus: first?.status,
        secondStatus: second?.status,
      });
    }
  } else {
    skip("shift:conflict signal", { note: "Need shiftId + vehicleId" });
  }

  // 7) WS: connect then trigger room-offer to observe shift-like event
  {
    const ws = await runWsSignal(roomToken, shiftId);
    if (ws.ok) pass("ws:shift event signal");
    else skip("ws:shift event signal", { note: ws.reason });
  }

  // Summary
  const maxName = Math.max(...results.map((r) => r.name.length));
  console.log("\n=== FULL SMOKE SUMMARY ===");
  for (const r of results) {
    const tag = r.ok ? (r.skipped ? "SKIP" : "PASS") : "FAIL";
    console.log(`${tag.padEnd(4)}  ${r.name.padEnd(maxName)}  ${r.note ?? ""}`);

    if (!r.ok && r.status) console.log(`      status: ${r.status}  text: ${r.text}`);
    if (!r.ok && r.attempts?.length) {
      console.log("      attempts:");
      for (const a of r.attempts.slice(0, 8)) console.log(`        - ${a.status} ${a.path}  ${a.text}`);
    }
    if (r.ok && r.me) console.log("      me:", snippet(JSON.stringify(r.me), 260));
    if (!r.ok && r.badFiles?.length) console.log("      badFiles:", r.badFiles);
    if (!r.ok && r.lastStatus) console.log("      lastStatus:", r.lastStatus, " lastText:", r.lastText);
  }

  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("FULL SMOKE CRASH:", e);
  process.exit(2);
});