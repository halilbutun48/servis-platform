// backend/scripts/m4check.js
import http from "http";
import https from "https";
import { prisma } from "../src/prisma.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const VEHICLE_ID = 1;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

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

function payloadOf(n){
  const p = n?.payloadJson ?? n?.payload ?? null;
  if(!p) return null;
  return typeof p === "string" ? JSON.parse(p) : p;
}
function countKind(items, kind){
  let c=0;
  for(const n of items?.items ?? items ?? []){
    const p = payloadOf(n);
    if(p?.kind === kind) c++;
  }
  return c;
}
function pickLastByKind(items, kind){
  const arr = (items?.items ?? items ?? []).slice().reverse();
  for(const n of arr){
    const p = payloadOf(n);
    if(p?.kind === kind) return p;
  }
  return null;
}
function assertV1(p){
  if(!p || typeof p !== "object") throw new Error("❌ notif payload missing");
  if(p.v !== 1) throw new Error(`❌ notif payload v!=1 (got ${p.v})`);
  if(typeof p.title !== "string" || !p.title.length) throw new Error("❌ notif payload title invalid");
  if(typeof p.message !== "string" || !p.message.length) throw new Error("❌ notif payload message invalid");
  if(typeof p.vehicleId !== "number") throw new Error("❌ notif payload vehicleId invalid");
  if(typeof p.at !== "string" || Number.isNaN(Date.parse(p.at))) throw new Error("❌ notif payload at invalid");
  if(typeof p.ageSec !== "number") throw new Error("❌ notif payload ageSec invalid");
  if(p.status !== null && !["LIVE","STALE","OFFLINE"].includes(p.status)) throw new Error(`❌ notif payload status invalid: ${p.status}`);
  if(p.kind !== null && typeof p.kind !== "string") throw new Error("❌ notif payload kind invalid");
}

function ok(msg){ console.log(`✅ ${msg}`); }

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken  = await login("driver@demo.com","demo123");
  const roomToken    = await login("room@demo.com","demo123");
  const companyToken = await login("company@demo.com","demo123");
  ok("login(driver/room/company)");

  // OVERSPEED payload v1
  const d0 = await reqJson("GET","/api/notifications/my",{ token: driverToken });
  const r0 = await reqJson("GET","/api/notifications/my",{ token: roomToken });
  const c0 = await reqJson("GET","/api/notifications/my",{ token: companyToken });
  const d0n = countKind(d0.json, "OVERSPEED");
  const r0n = countKind(r0.json, "OVERSPEED");
  const c0n = countKind(c0.json, "OVERSPEED");

  const gpsOS = await reqJson("POST","/api/gps",{ token: driverToken, body:{ vehicleId: VEHICLE_ID, lat:41.03025, lng:28.99605, speed:140 }});
  if(!gpsOS.ok) throw new Error(`❌ overspeed gps failed -> ${gpsOS.status}\n${gpsOS.text}`);
  await sleep(800);

  const d1 = await reqJson("GET","/api/notifications/my",{ token: driverToken });
  const r1 = await reqJson("GET","/api/notifications/my",{ token: roomToken });
  const c1 = await reqJson("GET","/api/notifications/my",{ token: companyToken });

  if(countKind(d1.json,"OVERSPEED") <= d0n) throw new Error("❌ OVERSPEED not created (DRIVER)");
  if(countKind(r1.json,"OVERSPEED") <= r0n) throw new Error("❌ OVERSPEED not created (ROOM)");
  if(countKind(c1.json,"OVERSPEED") <= c0n) throw new Error("❌ OVERSPEED not created (COMPANY)");
  const p = pickLastByKind(d1.json, "OVERSPEED");
  assertV1(p);
  ok("OVERSPEED notif v1 payload (driver/room/company)");

  // LIVE->STALE + dedupe
  const baseD = countKind((await reqJson("GET","/api/notifications/my",{token:driverToken})).json, "GPS_STALE");
  const baseR = countKind((await reqJson("GET","/api/notifications/my",{token:roomToken})).json, "GPS_STALE");
  const baseC = countKind((await reqJson("GET","/api/notifications/my",{token:companyToken})).json, "GPS_STALE");

  await prisma.gpsLast.update({ where:{ vehicleId: VEHICLE_ID }, data:{ at: new Date(Date.now()-25_000) } });
  await sleep(20_000);

  const dS  = countKind((await reqJson("GET","/api/notifications/my",{token:driverToken})).json, "GPS_STALE");
  const rS  = countKind((await reqJson("GET","/api/notifications/my",{token:roomToken})).json, "GPS_STALE");
  const cS  = countKind((await reqJson("GET","/api/notifications/my",{token:companyToken})).json, "GPS_STALE");
  if(dS<=baseD || rS<=baseR || cS<=baseC) throw new Error("❌ GPS_STALE not created for all scopes");
  ok("LIVE->STALE notif created (driver/room/company)");

  await sleep(20_000);
  const dS2 = countKind((await reqJson("GET","/api/notifications/my",{token:driverToken})).json, "GPS_STALE");
  const rS2 = countKind((await reqJson("GET","/api/notifications/my",{token:roomToken})).json, "GPS_STALE");
  const cS2 = countKind((await reqJson("GET","/api/notifications/my",{token:companyToken})).json, "GPS_STALE");
  if(dS2!==dS || rS2!==rS || cS2!==cS) throw new Error("❌ GPS_STALE dedupe failed");
  ok("GPS_STALE dedupe OK");

  // STALE->OFFLINE + dedupe
  const baseDO = countKind((await reqJson("GET","/api/notifications/my",{token:driverToken})).json, "GPS_OFFLINE");
  const baseRO = countKind((await reqJson("GET","/api/notifications/my",{token:roomToken})).json, "GPS_OFFLINE");
  const baseCO = countKind((await reqJson("GET","/api/notifications/my",{token:companyToken})).json, "GPS_OFFLINE");

  await prisma.gpsLast.update({ where:{ vehicleId: VEHICLE_ID }, data:{ at: new Date(Date.now()-350_000) } });
  await sleep(20_000);

  const dO  = countKind((await reqJson("GET","/api/notifications/my",{token:driverToken})).json, "GPS_OFFLINE");
  const rO  = countKind((await reqJson("GET","/api/notifications/my",{token:roomToken})).json, "GPS_OFFLINE");
  const cO  = countKind((await reqJson("GET","/api/notifications/my",{token:companyToken})).json, "GPS_OFFLINE");
  if(dO<=baseDO || rO<=baseRO || cO<=baseCO) throw new Error("❌ GPS_OFFLINE not created for all scopes");
  ok("STALE->OFFLINE notif created (driver/room/company)");

  await sleep(20_000);
  const dO2 = countKind((await reqJson("GET","/api/notifications/my",{token:driverToken})).json, "GPS_OFFLINE");
  const rO2 = countKind((await reqJson("GET","/api/notifications/my",{token:roomToken})).json, "GPS_OFFLINE");
  const cO2 = countKind((await reqJson("GET","/api/notifications/my",{token:companyToken})).json, "GPS_OFFLINE");
  if(dO2!==dO || rO2!==rO || cO2!==cO) throw new Error("❌ GPS_OFFLINE dedupe failed");
  ok("GPS_OFFLINE dedupe OK");

  // OFFLINE->LIVE recovery
  const baseDR = countKind((await reqJson("GET","/api/notifications/my",{token:driverToken})).json, "GPS_RECOVERY");
  const baseRR = countKind((await reqJson("GET","/api/notifications/my",{token:roomToken})).json, "GPS_RECOVERY");
  const baseCR = countKind((await reqJson("GET","/api/notifications/my",{token:companyToken})).json, "GPS_RECOVERY");

  const gpsRec = await reqJson("POST","/api/gps",{ token: driverToken, body:{ vehicleId: VEHICLE_ID, lat:41.0304, lng:28.9962, speed:10 }});
  if(!gpsRec.ok) throw new Error(`❌ recovery gps failed -> ${gpsRec.status}\n${gpsRec.text}`);
  await sleep(800);

  const dR  = countKind((await reqJson("GET","/api/notifications/my",{token:driverToken})).json, "GPS_RECOVERY");
  const rR  = countKind((await reqJson("GET","/api/notifications/my",{token:roomToken})).json, "GPS_RECOVERY");
  const cR  = countKind((await reqJson("GET","/api/notifications/my",{token:companyToken})).json, "GPS_RECOVERY");
  if(dR<=baseDR || rR<=baseRR || cR<=baseCR) throw new Error("❌ GPS_RECOVERY not created for all scopes");
  ok("OFFLINE->LIVE recovery notif created (driver/room/company)");

  console.log("\n✅ M4CHECK PASS");
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });
