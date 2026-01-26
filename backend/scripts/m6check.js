import http from "http";
import https from "https";
import { io as ioc } from "socket.io-client";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const nowTag = new Date().toISOString().replace(/[:.TZ-]/g,"").slice(0,14);

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
  if (!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  const token = r.json?.token;
  if(!token) throw new Error(`login token missing: ${email}`);
  return token;
}

async function connectWs(token, label){
  const sock = ioc(BASE_URL, { auth: { token }, transports: ["websocket"] });
  const bag = { ready:null, req:[] };

  sock.on("ws:ready", (d)=> bag.ready=d);
  sock.on("request:update", (d)=> bag.req.push(d));

  const t0=Date.now();
  while(!bag.ready && Date.now()-t0<5000) await sleep(100);
  if(!bag.ready) throw new Error(`WS ready timeout: ${label}`);
  return { sock, bag };
}

async function waitFor(condFn, timeoutMs, stepMs=100){
  const t0=Date.now();
  while(Date.now()-t0<timeoutMs){
    if(condFn()) return true;
    await sleep(stepMs);
  }
  return false;
}

function ok(msg){ console.log(`✅ ${msg}`); }
function bad(msg){ console.log(`❌ ${msg}`); }

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const personelToken = await login("personel@demo.com","demo123");
  const companyToken  = await login("company@demo.com","demo123");
  const roomToken     = await login("room@demo.com","demo123");
  ok("login(personel/company/room)");

  // WS
  const wsP = await connectWs(personelToken, "personel");
  const wsC = await connectWs(companyToken, "company");
  const wsR = await connectWs(roomToken, "room");
  ok("WS connect + ws:ready");

  const meRoom = await reqJson("GET","/api/me",{ token: roomToken });
  const meComp = await reqJson("GET","/api/me",{ token: companyToken });
  const roomId = meRoom.json?.roomId ?? 1;
  const companyId = meComp.json?.companyId ?? 1;

  // pick vehicle/driver
  const vlist = await reqJson("GET","/api/vehicles",{ token: roomToken });
  const dlist = await reqJson("GET","/api/drivers",{ token: roomToken });
  const vehicleId = vlist.json?.items?.[0]?.id ?? vlist.json?.[0]?.id ?? 1;
  const driverId  = dlist.json?.items?.[0]?.id ?? dlist.json?.[0]?.id ?? 1;

  // Create shift as company (REQUESTED)
  const startAt = new Date(Date.now() + 10*60*1000).toISOString();
  const endAt   = new Date(Date.now() + 70*60*1000).toISOString();
  const shBody = {
    companyId, roomId, startAt, endAt,
    status: "REQUESTED",
    stops: [
      { name:`M6 Stop 1 ${nowTag}`, lat:41.0306, lng:28.9964, order:1, type:"COMMON" },
      { name:`M6 Stop 2 ${nowTag}`, lat:41.0310, lng:28.9968, order:2, type:"COMMON" },
      { name:`M6 Stop 3 ${nowTag}`, lat:41.0313, lng:28.9971, order:3, type:"COMMON" }
    ]
  };

  const shCreate = await reqJson("POST","/api/shifts",{ token: companyToken, body: shBody });
  if(!shCreate.ok) throw new Error(`shift create -> ${shCreate.status}\n${shCreate.text.slice(0,400)}`);
  const shiftId = shCreate.json?.id ?? shCreate.json?.shift?.id;
  if(!shiftId) throw new Error("shiftId missing");
  ok(`shift create (id=${shiftId})`);

  // Approve/assign as ROOM (PUT alias)
  const ap = await reqJson("PUT",`/api/shifts/${shiftId}/approve`,{ token: roomToken, body:{ vehicleId, driverId, status:"APPROVED" } });
  if(!ap.ok) throw new Error(`approve -> ${ap.status}\n${ap.text.slice(0,400)}`);
  ok("approve/assign");

  // Negative: invalid create (missing fields) -> 400
  const badCreate = await reqJson("POST","/api/requests",{ token: personelToken, body:{ shiftId } });
  if(badCreate.status !== 400) throw new Error(`request validation expected 400 got ${badCreate.status}`);
  ok("request validation 400 (missing lat/lng)");

  // Create request as PERSONEL
  wsP.bag.req=[]; wsC.bag.req=[]; wsR.bag.req=[];
  const rqCreate = await reqJson("POST","/api/requests",{ token: personelToken, body:{ shiftId, lat:41.0309, lng:28.9966 } });
  if(!rqCreate.ok) throw new Error(`request create -> ${rqCreate.status}\n${rqCreate.text.slice(0,400)}`);
  const requestId = rqCreate.json?.id ?? rqCreate.json?.request?.id;
  if(!requestId) throw new Error("requestId missing");
  ok(`request create (id=${requestId})`);

  // WS should receive request:update on create (company+room+personel)
  const wsOk = await waitFor(()=> wsP.bag.req.length>0 && wsC.bag.req.length>0 && wsR.bag.req.length>0, 4000);
  if(!wsOk) throw new Error("WS request:update missing for one of (personel/company/room)");
  ok("WS request:update (create) personel/company/room");

  // Duplicate OPEN request should be blocked (409)
  const dup = await reqJson("POST","/api/requests",{ token: personelToken, body:{ shiftId, lat:41.0310, lng:28.9967 } });
  if(dup.status !== 409) throw new Error(`duplicate expected 409 got ${dup.status}`);
  ok("duplicate OPEN blocked (409)");

  // List onlyOpen for company + room must include requestId
  const lc = await reqJson("GET","/api/requests?onlyOpen=1",{ token: companyToken });
  const lr = await reqJson("GET","/api/requests?onlyOpen=1",{ token: roomToken });
  const inC = (lc.json?.items ?? []).some(x=>x.id===requestId);
  const inR = (lr.json?.items ?? []).some(x=>x.id===requestId);
  if(!lc.ok || !inC) throw new Error("company list missing request");
  if(!lr.ok || !inR) throw new Error("room list missing request");
  ok("list onlyOpen includes request (company+room)");

  // COMPANY cannot close (403)
  const cClose = await reqJson("POST",`/api/requests/${requestId}/close`,{ token: companyToken, body:{ status:"ACCEPTED" } });
  if(cClose.status !== 403) throw new Error(`company close expected 403 got ${cClose.status}`);
  ok("RBAC: company close forbidden (403)");

  // Close as ROOM
  wsP.bag.req=[]; wsC.bag.req=[]; wsR.bag.req=[];
  const rClose = await reqJson("POST",`/api/requests/${requestId}/close`,{ token: roomToken, body:{ status:"ACCEPTED" } });
  if(!rClose.ok) throw new Error(`room close -> ${rClose.status}\n${rClose.text.slice(0,400)}`);
  ok("room close ACCEPTED");

  const wsOk2 = await waitFor(()=> wsP.bag.req.length>0 && wsC.bag.req.length>0 && wsR.bag.req.length>0, 4000);
  if(!wsOk2) throw new Error("WS request:update missing on close for one of (personel/company/room)");
  ok("WS request:update (close) personel/company/room");

  // Re-close must be blocked (409)
  const reclose = await reqJson("POST",`/api/requests/${requestId}/close`,{ token: roomToken, body:{ status:"ACCEPTED" } });
  if(reclose.status !== 409) throw new Error(`re-close expected 409 got ${reclose.status}`);
  ok("re-close blocked (409)");

  // onlyOpen should NOT include anymore
  const lc2 = await reqJson("GET","/api/requests?onlyOpen=1",{ token: companyToken });
  const still = (lc2.json?.items ?? []).some(x=>x.id===requestId);
  if(still) throw new Error("request still in onlyOpen after close");
  ok("onlyOpen cleared after close");

  wsP.sock.close(); wsC.sock.close(); wsR.sock.close();
  console.log("\n✅ M6CHECK PASS");
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });
