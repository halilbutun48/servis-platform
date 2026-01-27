import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const nowTag = new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

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

function itemsOf(resp){
  const j = resp?.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.suggestions)) return j.suggestions;
  return [];
}

async function login(email, password){
  const r = await reqJson("POST","/api/auth/login",{ body:{ email, password } });
  if (!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  const token = r.json?.token;
  if(!token) throw new Error(`login token missing: ${email}`);
  return token;
}

async function callAny(method, paths, { token, body } = {}) {
  for (const p of paths) {
    const r = await reqJson(method, p, { token, body });
    if (r.ok) return { ok:true, path:p, r };
  }
  const rr = await reqJson(method, paths[0], { token, body });
  return { ok:false, path:paths[0], r: rr };
}

function ok(msg){ console.log(`✅ ${msg}`); }
function bad(msg){ console.log(`❌ ${msg}`); }

function distM(aLat,aLng,bLat,bLng){
  const R=6371000;
  const toRad=x=>x*Math.PI/180;
  const dLat=toRad(bLat-aLat);
  const dLng=toRad(bLng-aLng);
  const lat1=toRad(aLat), lat2=toRad(bLat);
  const s=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.min(1, Math.sqrt(s)));
}

async function listStops(shiftId, token){
  // birçok shape/endpoint ihtimaline tolerant
  const got = await callAny("GET", [
    `/api/shifts/${shiftId}`,
    `/api/shifts/${shiftId}/stops`,
    `/api/stops?shiftId=${shiftId}`
  ], { token });

  if(!got.ok) return { ok:false, items:[], raw:got.r, path:got.path };

  const j = got.r.json;
  let stops = [];
  if(Array.isArray(j)) stops = j;
  else if(Array.isArray(j?.items)) stops = j.items;
  else if(Array.isArray(j?.stops)) stops = j.stops;
  else if(Array.isArray(j?.shift?.stops)) stops = j.shift.stops;
  else if(Array.isArray(j?.data?.stops)) stops = j.data.stops;

  return { ok:true, items:stops, raw:got.r, path:got.path };
}

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const personelToken = await login("personel@demo.com","demo123");
  const companyToken  = await login("company@demo.com","demo123");
  const roomToken     = await login("room@demo.com","demo123");
  ok("login(personel/company/room)");

  const meRoom = await reqJson("GET","/api/me",{ token: roomToken });
  const meComp = await reqJson("GET","/api/me",{ token: companyToken });
  const roomId = meRoom.json?.roomId ?? 1;
  const companyId = meComp.json?.companyId ?? 1;

  // pick vehicle/driver
  const vlist = await reqJson("GET","/api/vehicles",{ token: roomToken });
  const dlist = await reqJson("GET","/api/drivers",{ token: roomToken });
  const vehicleId = vlist.json?.items?.[0]?.id ?? vlist.json?.[0]?.id ?? 1;
  const driverId  = dlist.json?.items?.[0]?.id ?? dlist.json?.[0]?.id ?? 1;

  // shift create
  const startAt = new Date(Date.now() + 10*60*1000).toISOString();
  const endAt   = new Date(Date.now() + 70*60*1000).toISOString();
  const shBody = {
    companyId, roomId, startAt, endAt,
    status: "REQUESTED",
    stops: [
      { name:`M7 Stop 1 ${nowTag}`, lat:41.0306, lng:28.9964, order:1, type:"COMMON" },
      { name:`M7 Stop 2 ${nowTag}`, lat:41.0310, lng:28.9968, order:2, type:"COMMON" },
      { name:`M7 Stop 3 ${nowTag}`, lat:41.0313, lng:28.9971, order:3, type:"COMMON" }
    ]
  };

  const shCreate = await reqJson("POST","/api/shifts",{ token: companyToken, body: shBody });
  if(!shCreate.ok) { bad(`shift create -> ${shCreate.status}`); process.exit(1); }
  const shiftId = shCreate.json?.id ?? shCreate.json?.shift?.id;
  if(!shiftId) throw new Error("shiftId missing");
  ok(`shift create (id=${shiftId})`);

  // approve/assign
  const ap = await callAny("PUT", [
    `/api/shifts/${shiftId}/approve`,
    `/api/shifts/${shiftId}/assign`
  ], { token: roomToken, body:{ vehicleId, driverId, status:"APPROVED" } });
  if(!ap.ok) throw new Error(`approve -> ${ap.r.status}\n${ap.r.text.slice(0,300)}`);
  ok("approve/assign");

  // create 6 requests: 2 cluster (A ve B)
  const A = [
    { lat:41.03090, lng:28.99660 },
    { lat:41.03092, lng:28.99663 },
    { lat:41.03088, lng:28.99658 },
  ];
  const B = [
    { lat:41.03160, lng:28.99740 },
    { lat:41.03162, lng:28.99743 },
    { lat:41.03158, lng:28.99738 },
  ];

  for (const p of [...A, ...B]){
    const r = await reqJson("POST","/api/requests",{ token: personelToken, body:{ shiftId, lat:p.lat, lng:p.lng } });
    if(!r.ok && r.status !== 409) throw new Error(`request create -> ${r.status}\n${r.text.slice(0,200)}`);
  }
  ok("seed requests (two clusters) created/ensured");

  // GET suggestions (endpoint fallback)
  const sug = await callAny("GET", [
    `/api/shifts/${shiftId}/stop-suggestions?onlyOpen=1&radiusM=120`,
    `/api/shifts/${shiftId}/suggestions/stops?onlyOpen=1&radiusM=120`,
    `/api/requests/stop-suggestions?shiftId=${shiftId}&onlyOpen=1&radiusM=120`,
    `/api/requests/suggestions?shiftId=${shiftId}&onlyOpen=1&radiusM=120`
  ], { token: roomToken });

  if(!sug.ok) throw new Error(`suggestions endpoint missing/failed -> ${sug.r.status}\n${sug.r.text.slice(0,300)}`);
  const suggestions = itemsOf(sug.r);
  if(!Array.isArray(suggestions) || suggestions.length < 1) {
    throw new Error(`suggestions empty -> ${sug.path}\n${JSON.stringify(sug.r.json).slice(0,400)}`);
  }
  ok(`suggestions ok (${sug.path}) count=${suggestions.length}`);

  // pick first suggestion
  const s0 = suggestions[0] ?? {};
  const sLat = Number(s0.lat ?? s0.latitude);
  const sLng = Number(s0.lng ?? s0.longitude);
  const sId  = s0.id ?? s0.suggestionId ?? null;
  if(!Number.isFinite(sLat) || !Number.isFinite(sLng)) {
    throw new Error(`suggestion lat/lng missing: ${JSON.stringify(s0).slice(0,300)}`);
  }

  // stop count before
  const before = await listStops(shiftId, roomToken);
  if(!before.ok) throw new Error(`listStops before failed -> ${before.path} (${before.raw?.status})`);
  const beforeN = before.items.length;

  // accept suggestion -> create stop
  const acc = await callAny("POST", [
    `/api/shifts/${shiftId}/stops/from-suggestion`,
    `/api/shifts/${shiftId}/stops/accept-suggestion`,
    `/api/suggestions/stops/accept`,
  ], {
    token: roomToken,
    body: { suggestionId: sId, lat: sLat, lng: sLng, name: `M7 COMMON from requests ${nowTag}` }
  });

  if(!acc.ok) throw new Error(`accept suggestion failed -> ${acc.r.status}\n${acc.r.text.slice(0,300)}`);
  ok(`accept suggestion ok (${acc.path})`);

  // stop count after + must contain near suggestion point
  const after = await listStops(shiftId, roomToken);
  if(!after.ok) throw new Error(`listStops after failed -> ${after.path} (${after.raw?.status})`);
  const afterN = after.items.length;
  if(afterN <= beforeN) throw new Error(`stop not added (before=${beforeN}, after=${afterN})`);

  const near = after.items.find(st=>{
    const lat = Number(st.lat ?? st.latitude);
    const lng = Number(st.lng ?? st.longitude);
    if(!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return distM(lat,lng,sLat,sLng) <= 80; // 80m tolerans
  });

  if(!near) throw new Error("created stop not found near accepted suggestion");

  ok("stop created near suggestion");

  console.log("\n✅ M7CHECK PASS");
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });
