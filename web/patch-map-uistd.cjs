const fs = require("fs");
const path = require("path");

function read(p){ return fs.readFileSync(p,"utf8").replace(/^\uFEFF/,""); }
function write(p,s){ fs.writeFileSync(p, s.replace(/^\uFEFF/,""), "utf8"); }

const appPath = path.join(process.cwd(),"src","App.jsx");
if(!fs.existsSync(appPath)){
  console.error("HATA: src/App.jsx bulunamadı");
  process.exit(1);
}

const app = read(appPath);

// 1) MapView import yolunu bul
let mapRel = null;
const m = app.match(/import\s+MapView\s+from\s+["'](.+?)["']/);
if (m) mapRel = m[1];

function findBySearch(){
  const srcRoot = path.join(process.cwd(),"src");
  const exts = new Set([".js",".jsx",".ts",".tsx"]);
  const out=[];
  (function walk(d){
    for(const e of fs.readdirSync(d,{withFileTypes:true})){
      const p = path.join(d,e.name);
      if(e.isDirectory()) walk(p);
      else if(exts.has(path.extname(e.name))) out.push(p);
    }
  })(srcRoot);

  // MapContainer içeren ilk dosya
  for(const f of out){
    const s = read(f);
    if(s.includes("MapContainer") && (s.includes("leaflet") || s.includes("react-leaflet"))){
      return path.relative(process.cwd(), f).replace(/\\/g,"/");
    }
  }
  return null;
}

if(!mapRel){
  mapRel = findBySearch();
  if(!mapRel){
    console.error("HATA: MapView import bulunamadı ve MapContainer araması da sonuç vermedi.");
    process.exit(1);
  }
}

const mapPath = path.join(process.cwd(), mapRel);
if(!fs.existsSync(mapPath)){
  // import yolu src/... değilse dene
  const alt = path.join(process.cwd(),"src", mapRel);
  if(fs.existsSync(alt)) {
    mapRel = "src/"+mapRel.replace(/^\.\//,"");
  } else {
    console.error("HATA: MapView dosyası bulunamadı:", mapPath);
    process.exit(1);
  }
}

// mapPath’i tekrar resolve et
const resolvedMapPath = path.isAbsolute(mapRel) ? mapRel : path.join(process.cwd(), mapRel);

// 2) Backup al
const stamp = new Date().toISOString().replace(/[-:T]/g,"").slice(0,15);
const bak = resolvedMapPath + `.bak_uistd_${stamp}`;
fs.copyFileSync(resolvedMapPath, bak);

// 3) Yeni MapView içeriği
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

    // programmatic move -> watcher tetiklenmesin
    programmaticRef.current = true;

    const z = map.getZoom();
    // hafif fly (zıplama gibi hissettirmez)
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

  // me
  useEffect(() => {
    (async () => {
      try {
        const j = await api("/api/me");
        setMe(j.me);
      } catch {
        // login yoksa sessiz
      }
    })();
  }, []);

  // school + routes (best-effort: SCHOOL_ADMIN endpointleri; admin/room ise admin schools varsa yakalar)
  useEffect(() => {
    (async () => {
      try {
        // SCHOOL_ADMIN için
        const s = await api("/api/school/me");
        setSchool(s.school);

        const r = await api("/api/school/routes");
        setRoutes(r.routes || []);
        if ((r.routes || []).length) setRouteId(String(r.routes[0].id));
      } catch {
        // SUPER_ADMIN / SERVICE_ROOM için okulu admin listeden yakalamayı dene (varsa)
        try {
          const list = await api("/api/admin/schools");
          const schools = list.schools || [];
          const pick = me?.schoolId ? schools.find(x => x.id === me.schoolId) : schools[0];
          if (pick) setSchool(pick);
        } catch {}
      }
    })();
  }, [me?.schoolId]);

  // stops
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

  // socket gps
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
      auth: { token },
    });

    socket.on("connect_error", () => {});
    socket.on("gps:update", (payload) => {
      // payload: { vehicleId, lat, lon, speed, heading, recordedAt }
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
        {/* legend */}
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

write(resolvedMapPath, content);
console.log("OK: MapView UI Standard v1 yazıldı =>", path.relative(process.cwd(), resolvedMapPath).replace(/\\/g,"/"));
console.log("Backup =>", path.relative(process.cwd(), bak).replace(/\\/g,"/"));
