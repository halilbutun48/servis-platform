const fs = require("fs");
const path = require("path");

function read(p){ return fs.readFileSync(p,"utf8").replace(/^\uFEFF/,""); }
function write(p,s){ fs.writeFileSync(p, s.replace(/^\uFEFF/,""), "utf8"); }

const appPath = path.join(process.cwd(),"src","App.jsx");
if(!fs.existsSync(appPath)){
  console.error("HATA: src/App.jsx bulunamadı");
  process.exit(1);
}

const appDir = path.dirname(appPath);
const app = read(appPath);

const m = app.match(/import\s+MapView\s+from\s+["'](.+?)["']/);
let importPath = m ? m[1] : null;

function tryCandidates(base){
  const exts = ["", ".jsx", ".js", ".tsx", ".ts", "/index.jsx", "/index.js", "/index.tsx", "/index.ts"];
  for(const e of exts){
    const p = base + e;
    if(fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function findBySearch(){
  const srcRoot = path.join(process.cwd(),"src");
  const exts = new Set([".js",".jsx",".ts",".tsx"]);
  const files=[];
  (function walk(d){
    for(const ent of fs.readdirSync(d,{withFileTypes:true})){
      const p = path.join(d,ent.name);
      if(ent.isDirectory()) walk(p);
      else if(exts.has(path.extname(ent.name))) files.push(p);
    }
  })(srcRoot);

  // MapContainer + export default araması
  for(const f of files){
    const s = read(f);
    if(s.includes("MapContainer") && (s.includes("react-leaflet") || s.includes("leaflet"))){
      return f;
    }
  }
  return null;
}

let mapFile = null;

if(importPath){
  let base = null;

  if(importPath.startsWith(".")){
    base = path.resolve(appDir, importPath);
  } else if(importPath.startsWith("/")){
    base = path.resolve(process.cwd(),"src", "."+importPath); // /pages/MapView => src/pages/MapView
  } else {
    // alias vs: en azından src altında dene
    base = path.resolve(process.cwd(),"src", importPath);
  }

  mapFile = tryCandidates(base);
}

if(!mapFile){
  mapFile = findBySearch();
}

if(!mapFile){
  console.error("HATA: MapView dosyası bulunamadı. (import yok veya arama sonuçsuz)");
  process.exit(1);
}

// Backup al
const stamp = new Date().toISOString().replace(/[-:T]/g,"").slice(0,15);
const bak = mapFile + `.bak_uistd_${stamp}`;
fs.copyFileSync(mapFile, bak);

// UI Standard v1 MapView yaz
const content = `
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import L from "leaflet";
import { io } from "socket.io-client";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

/**
 * UI Standard v1:
 * - Map icons: School / Stop (ordinal) / Vehicle (rotating)
 * - Focus/Zoom rules:
 *   * user drag/zoom => Auto-follow OFF (toast)
 *   * GPS update while OFF => map does NOT jump
 *   * "Takip Aç" => follow resumes + centers on vehicle
 */

function getToken() {
  return localStorage.getItem("token") || "";
}

async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-auth-token": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error || \`HTTP_\${res.status}\`);
  return json;
}

/** ----- Icons (divIcon / SVG) ----- */
function iconSchool() {
  const html = \`
  <div style="transform: translate(-50%, -100%);">
    <div style="
      width: 34px; height: 34px; border-radius: 10px;
      background: #ffffff; border: 2px solid #111827;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 6px 16px rgba(0,0,0,.15);
      font-size: 18px; line-height: 1;
    ">🏫</div>
  </div>\`;
  return L.divIcon({ className: "", html, iconSize: [34,34], iconAnchor: [0,0] });
}

function iconStop(ord) {
  const label = String(ord ?? "");
  const html = \`
  <div style="transform: translate(-50%, -100%);">
    <div style="
      width: 30px; height: 30px; border-radius: 999px;
      background: #ffffff; border: 2px solid #111827;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 6px 16px rgba(0,0,0,.15);
      font-weight: 800; font-size: 13px;
    ">\${label}</div>
  </div>\`;
  return L.divIcon({ className: "", html, iconSize: [30,30], iconAnchor: [0,0] });
}

function iconVehicle(heading = 0) {
  const deg = Number.isFinite(Number(heading)) ? Number(heading) : 0;
  const html = \`
  <div style="transform: translate(-50%, -50%);">
    <div style="
      width: 42px; height: 42px; border-radius: 999px;
      background: #ffffff; border: 2px solid #111827;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 6px 16px rgba(0,0,0,.18);
    ">
      <div style="transform: rotate(\${deg}deg);">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l7 20-7-4-7 4 7-20z" fill="#111827"/>
        </svg>
      </div>
    </div>
  </div>\`;
  return L.divIcon({ className: "", html, iconSize: [42,42], iconAnchor: [0,0] });
}

/** ----- Auto-follow helpers ----- */
function InteractionWatcher({ autoFollow, setAutoFollow, programmaticRef }) {
  useMapEvents({
    dragstart() {
      if (programmaticRef.current) return;
      if (autoFollow) {
        setAutoFollow(false);
        toast.dismiss("follow-off");
        toast("Takip kapandı (harita elle hareket ettirildi)", { id: "follow-off" });
      }
    },
    zoomstart() {
      if (programmaticRef.current) return;
      if (autoFollow) {
        setAutoFollow(false);
        toast.dismiss("follow-off");
        toast("Takip kapandı (zoom manuel)", { id: "follow-off" });
      }
    },
  });
  return null;
}

function AutoFollowController({ autoFollow, vehicle, programmaticRef }) {
  const map = useMap();

  useEffect(() => {
    const onMoveEnd = () => { programmaticRef.current = false; };
    map.on("moveend", onMoveEnd);
    return () => map.off("moveend", onMoveEnd);
  }, [map, programmaticRef]);

  useEffect(() => {
    if (!autoFollow) return;
    if (!vehicle?.lat || !vehicle?.lon) return;

    programmaticRef.current = true;
    const z = map.getZoom();
    map.flyTo([vehicle.lat, vehicle.lon], z, { animate: true, duration: 0.6 });
  }, [autoFollow, vehicle?.lat, vehicle?.lon]);

  return null;
}

export default function MapView() {
  const [me, setMe] = useState(null);

  const [school, setSchool] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState("");
  const [stops, setStops] = useState([]);

  const [vehicle, setVehicle] = useState(null);
  const [autoFollow, setAutoFollow] = useState(true);

  const programmaticRef = useRef(false);

  const center = useMemo(() => {
    if (vehicle?.lat && vehicle?.lon) return [vehicle.lat, vehicle.lon];
    if (school?.lat != null && school?.lon != null) return [school.lat, school.lon];
    return [41.0094, 28.9794];
  }, [school, vehicle]);

  useEffect(() => {
    (async () => {
      try {
        const j = await api("/api/me");
        setMe(j.me);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await api("/api/school/me");
        setSchool(s.school);

        const r = await api("/api/school/routes");
        setRoutes(r.routes || []);
        if ((r.routes || []).length) setRouteId(String(r.routes[0].id));
      } catch {
        try {
          const list = await api("/api/admin/schools");
          const schools = list.schools || [];
          const pick = me?.schoolId ? schools.find(x => x.id === me.schoolId) : schools[0];
          if (pick) setSchool(pick);
        } catch {}
      }
    })();
  }, [me?.schoolId]);

  useEffect(() => {
    (async () => {
      if (!routeId) { setStops([]); return; }
      try {
        const j = await api(\`/api/school/routes/\${Number(routeId)}/stops\`);
        setStops(j.stops || []);
      } catch {
        setStops([]);
      }
    })();
  }, [routeId]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
      auth: { token },
    });

    socket.on("gps:update", (payload) => {
      if (!payload) return;
      const lat = Number(payload.lat);
      const lon = Number(payload.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      setVehicle({
        vehicleId: payload.vehicleId,
        lat,
        lon,
        speed: payload.speed == null ? null : Number(payload.speed),
        heading: payload.heading == null ? 0 : Number(payload.heading),
        recordedAt: payload.recordedAt || new Date().toISOString(),
      });
    });

    return () => socket.disconnect();
  }, []);

  function turnFollowOn() {
    setAutoFollow(true);
    toast.dismiss("follow-on");
    toast("Takip açıldı", { id: "follow-on" });
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontWeight: 800 }}>Harita</div>

        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Follow: <b>{autoFollow ? "ON" : "OFF"}</b>
        </div>

        {!autoFollow && (
          <button onClick={turnFollowOn} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            Takip Aç
          </button>
        )}

        {routes.length > 0 && (
          <select value={routeId} onChange={(e) => setRouteId(e.target.value)} style={{ padding: 6 }}>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>Rota: {r.name} (#{r.id})</option>
            ))}
          </select>
        )}

        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
          {vehicle?.recordedAt ? <>GPS: {String(vehicle.recordedAt).replace("T"," ").replace("Z","")}</> : "GPS yok"}
        </div>
      </div>

      <div style={{ position: "relative", height: "72vh", borderRadius: 16, overflow: "hidden", border: "1px solid #eee" }}>
        <div style={{
          position: "absolute", zIndex: 500, right: 10, top: 10,
          background: "rgba(255,255,255,.92)", border: "1px solid #e5e7eb",
          borderRadius: 14, padding: "10px 12px", boxShadow: "0 10px 22px rgba(0,0,0,.10)",
          fontSize: 12,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Legend</div>
          <div>🏫 Okul</div>
          <div>● Durak (numara)</div>
          <div>▲ Araç (heading)</div>
          <div style={{ marginTop: 6, opacity: .7 }}>Drag/Zoom ⇒ Follow OFF</div>
        </div>

        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <InteractionWatcher autoFollow={autoFollow} setAutoFollow={setAutoFollow} programmaticRef={programmaticRef} />
          <AutoFollowController autoFollow={autoFollow} vehicle={vehicle} programmaticRef={programmaticRef} />

          {school?.lat != null && school?.lon != null && (
            <Marker position={[school.lat, school.lon]} icon={iconSchool()}>
              <Popup>
                <b>Okul</b><br />
                {school.name ? school.name : ""}<br />
                {school.lat}, {school.lon}
              </Popup>
            </Marker>
          )}

          {Array.isArray(stops) && stops.map((st) => (
            <Marker key={st.id} position={[st.lat, st.lon]} icon={iconStop(st.ord)}>
              <Popup>
                <b>{st.ord}. {st.name}</b><br />
                {st.lat}, {st.lon}
              </Popup>
            </Marker>
          ))}

          {vehicle?.lat && vehicle?.lon && (
            <Marker position={[vehicle.lat, vehicle.lon]} icon={iconVehicle(vehicle.heading)}>
              <Popup>
                <b>Araç</b><br />
                lat: {vehicle.lat}<br />
                lon: {vehicle.lon}<br />
                speed: {vehicle.speed ?? "-"}<br />
                heading: {vehicle.heading ?? 0}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
`;

write(mapFile, content);

console.log("OK: MapView patched =>", path.relative(process.cwd(), mapFile).replace(/\\/g,"/"));
console.log("Backup =>", path.relative(process.cwd(), bak).replace(/\\/g,"/"));
