// M21CHECK: SUPER_ADMIN panels backend readiness (companies + rooms create/list)
// Runs in docker (see tools/gate.ps1). Uses demo seed creds.

import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

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
          try { json = text ? JSON.parse(text) : null; } catch {}
          resolve({ status: res.statusCode, json, text });
        });
      }
    );
    req.on("error", reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

async function mustOk(promise, msg){
  const r = await promise;
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`${msg} -> HTTP ${r.status} ${r.text}`);
  }
  return r.json;
}

async function login(email, password){
  const j = await mustOk(reqJson("POST", "/api/auth/login", { body: { email, password } }), `login(${email})`);
  if (!j?.token) throw new Error(`login token missing for ${email}`);
  return j.token;
}

function ok(label){ console.log(`✅ ${label}`); }

async function main(){
  console.log("=== M21CHECK: SUPER_ADMIN companies + rooms ===");
  console.log(`API_URL = ${BASE_URL}`);

  // seed creds
  const tS = await login("superadmin@demo.com", "demo123");
  ok("login (SUPER_ADMIN)");

  // create company
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const companyName = `M21 Company ${rand}`;
  const c = await mustOk(reqJson("POST", "/api/companies", { token: tS, body: { name: companyName } }), "company create");
  if (!c?.id) throw new Error("company create -> id missing");
  ok("company create");

  const cs = await mustOk(reqJson("GET", "/api/companies?take=50", { token: tS }), "company list");
  if (!Array.isArray(cs?.items)) throw new Error("company list -> items missing");
  if (!cs.items.some(x => x.id === c.id)) throw new Error("company not found in list");
  ok("company list contains created");

  // create room (no company binding; relation is via Agreement)
  const roomName = `M21 Room ${rand}`;
  const hubLat = 41.0371;
  const hubLng = 28.9845;
  const r = await mustOk(reqJson("POST", "/api/rooms", { token: tS, body: { name: roomName } }), "room create");
  if (!r?.id) throw new Error("room create -> id missing");
  ok("room create");

  // set hub (optional)
  await mustOk(reqJson("PUT", `/api/rooms/${r.id}/hub`, { token: tS, body: { hubLat, hubLng } }), "room hub update");
  ok("room hub update");

  const rs = await mustOk(reqJson("GET", "/api/rooms?take=50", { token: tS }), "room list");
  if (!Array.isArray(rs?.items)) throw new Error("room list -> items missing");
  const row = rs.items.find(x => x.id === r.id);
  if (!row) throw new Error("room not found in list");
  ok("room list contains created");

  // light RBAC: COMPANY cannot create company
  const tC = await login("company@demo.com", "demo123");
  const bad = await reqJson("POST", "/api/companies", { token: tC, body: { name: `NOPE ${rand}` } });
  if (bad.status !== 403) throw new Error(`RBAC expected 403, got ${bad.status}`);
  ok("RBAC: COMPANY cannot create company (403)");

  console.log("✅ M21CHECK PASS");
}

main().catch((e) => {
  console.error("❌ M21CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});
