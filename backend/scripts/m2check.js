// backend/scripts/m2check.js
import http from "http";
import https from "https";
import { prisma } from "../src/prisma.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function reqJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve) => {
    const req = lib.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const text = data || "";
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch {}
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, text });
        });
      }
    );
    req.on("error", (e)=> resolve({ ok:false, status:0, json:null, text:String(e) }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password){
  const r = await reqJson("POST","/api/auth/login",{ body:{ email, password } });
  if(!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  if(!r.json?.token) throw new Error(`token missing for ${email}`);
  return r.json.token;
}

function ok(msg){ console.log(`✅ ${msg}`); }

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken = await login("driver@demo.com","demo123");
  ok("login(driver)");

  // GPS ingest
  const g = await reqJson("POST","/api/gps",{
    token: driverToken,
    body: { vehicleId: 1, lat: 41.0302, lng: 28.9960, speed: 20 }
  });
  if(!g.ok) throw new Error(`❌ POST /api/gps failed -> ${g.status}\n${g.text}`);
  ok("POST /api/gps (LIVE)");

  // DB mapping (LIVE -> Vehicle.ACTIVE + GpsLast.OK)
  const v = await prisma.vehicle.findUnique({ where:{id:1}, select:{ status:true } });
  const gl= await prisma.gpsLast.findUnique({ where:{ vehicleId:1 }, select:{ status:true, at:true } });
  if(v?.status!=="ACTIVE" || gl?.status!=="OK") throw new Error(`❌ DB mapping wrong: Vehicle=${v?.status} GpsLast=${gl?.status}`);
  ok("DB mapping LIVE -> Vehicle.ACTIVE + GpsLast.OK");

  // ETA http sanity
  const eta = await reqJson("GET","/api/eta?vehicleId=1",{ token: driverToken });
  if(!eta.ok) throw new Error(`❌ GET /api/eta failed -> ${eta.status}\n${eta.text}`);
  if(!Array.isArray(eta.json?.stops)) throw new Error("❌ /api/eta invalid (stops[])");
  ok(`/api/eta ok (stops=${eta.json.stops.length})`);

  console.log("\n✅ M2CHECK PASS");
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });
