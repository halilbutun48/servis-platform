// M27CHECK: Agreement Wizard presets (batch create) contract check
// - company can search hub rooms
// - company can create 2 agreement slots (morning+evening) through bundle + source shift

import http from "http";
import https from "https";
import { createAgreementSourceShift } from "./_agreement_source_shift_harness.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function reqJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const headers = { "Content-Type": "application/json", "x-greenpack": process.env.GREENPACK_HEADER ?? "1" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const text = data || "";
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {}
          resolve({ status: res.statusCode, json, text });
        });
      }
    );
    req.on("error", reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

async function mustOk(promise, msg) {
  const r = await promise;
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`${msg} -> HTTP ${r.status} ${r.text}`);
  }
  return r.json;
}

async function login(email, password) {
  const j = await mustOk(reqJson("POST", "/api/auth/login", { body: { email, password } }), `login(${email})`);
  if (!j?.token) throw new Error(`login token missing for ${email}`);
  return j.token;
}

function ok(label) {
  console.log(`OK ${label}`);
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).split("-").map((x) => Number(x));
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + Number(days || 0));
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

async function main() {
  console.log("=== M27CHECK: Agreement wizard presets (batch create) ===");
  console.log(`API_URL = ${BASE_URL}`);

  const tS = await login("superadmin@demo.com", "demo123");
  ok("login (SUPER_ADMIN)");

  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const roomName = `M27 Room ${rand}`;

  const hubLat = 41.0371;
  const hubLng = 28.9845;

  const room = await mustOk(reqJson("POST", "/api/rooms", { token: tS, body: { name: roomName } }), "room create");
  if (!room?.id) throw new Error("room create -> id missing");
  ok("room create");

  await mustOk(reqJson("PUT", `/api/rooms/${room.id}/hub`, { token: tS, body: { hubLat, hubLng } }), "room hub update");
  ok("room hub update");

  const tC = await login("company@demo.com", "demo123");
  ok("login (COMPANY)");

  // hub filter
  const hasHub = await mustOk(reqJson("GET", "/api/rooms?hasHub=1&take=200", { token: tC }), "company rooms hasHub");
  if (!Array.isArray(hasHub?.items)) throw new Error("rooms hasHub -> items missing");
  if (!hasHub.items.some((x) => x.id === room.id)) throw new Error("created hub room not found in hasHub list");
  ok("company GET /api/rooms?hasHub=1 works");

  const startDate = todayYmd();
  const endDate = addDaysYmd(startDate, 30);
  const weekMask = 62; // Mon-Fri

  const src = await createAgreementSourceShift({ reqJson, token: tC, roomId: room.id, tag: "M27" });
  if (!src?.shiftId) throw new Error("source shift create -> id missing");
  ok("source shift create");

  // morning + evening now go through canonical bundle create with sourceShiftId
  const bundle = await mustOk(
    reqJson("POST", "/api/agreements/bundle", {
      token: tC,
      body: {
        roomId: room.id,
        sourceShiftId: src.shiftId,
        startDate,
        endDate,
        weekMask,
        hubLat,
        hubLng,
        items: [
          { label: "Sabah", startMin: 7 * 60, endMin: 9 * 60, direction: "INBOUND", pattern: "ONE_WAY" },
          { label: "Akşam", startMin: 17 * 60, endMin: 19 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" },
        ],
      },
    }),
    "agreement bundle create (morning+evening)"
  );
  const createdIds = Array.isArray(bundle?.createdIds) ? bundle.createdIds.map((x) => Number(x)).filter((x) => x > 0) : [];
  if (createdIds.length !== 2) throw new Error(`agreement bundle create -> expected 2 ids, got ${createdIds.length}`);
  ok("agreement bundle create (2 items)");

  const al = await mustOk(reqJson("GET", "/api/agreements?take=200", { token: tC }), "agreements list");
  if (!Array.isArray(al?.items)) throw new Error("agreements list -> items missing");
  if (!createdIds.every((id) => al.items.some((x) => Number(x.id) === id))) throw new Error("bundle agreements not found in list");
  ok("agreements list contains both created");

  // cleanup
  for (const id of createdIds) {
    await mustOk(reqJson("PUT", `/api/agreements/${id}/cancel`, { token: tC, body: {} }), `agreement cancel #${id}`);
  }
  ok("agreement cancel (cleanup)");

  console.log("OK M27CHECK PASS");
}

main().catch((e) => {
  console.error("FAIL M27CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});

