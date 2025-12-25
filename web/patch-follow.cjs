const fs = require("fs");
const path = require("path");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const srcDir = path.join(process.cwd(), "src");
const files = walk(srcDir).filter(f => /\.(jsx|tsx)$/.test(f));

function read(f){ return fs.readFileSync(f, "utf8").replace(/^\uFEFF/, ""); }

let mapFile =
  files.find(f => read(f).includes("react-leaflet") && read(f).includes("MapContainer")) ||
  files.find(f => read(f).includes("react-leaflet"));

if (!mapFile) {
  console.error("HATA: react-leaflet kullanan dosya bulunamadı (MapView?).");
  process.exit(1);
}

const mapDir = path.dirname(mapFile);
const layerFile = path.join(mapDir, "GpsFollowLayer.jsx");

// 1) layer dosyasını yaz
if (!fs.existsSync(layerFile)) {
  const layer = `
import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import toast, { Toaster } from "react-hot-toast";
import L from "leaflet";

const toNum = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export default function GpsFollowLayer({ vehicleId = 1, pollMs = 2000 }) {
  const map = useMap();
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  const [last, setLast] = useState(null);
  const lastPosRef = useRef(null);
  const firstFixRef = useRef(true);

  useEffect(() => { followRef.current = follow; }, [follow]);

  // Kullanıcı haritayı sürükleyince follow OFF
  useEffect(() => {
    const onDragStart = () => {
      if (followRef.current) {
        setFollow(false);
        toast("Haritayı sürükledin → Takip kapandı", { id: "follow-off" });
      }
    };
    map.on("dragstart", onDragStart);
    return () => map.off("dragstart", onDragStart);
  }, [map]);

  // Poll: /api/gps/last
  useEffect(() => {
    let alive = true;
    let t = null;

    const run = async () => {
      try {
        const r = await fetch(\`/api/gps/last?vehicleId=\${vehicleId}\`);
        const j = await r.json();
        if (!alive) return;
        if (j && j.ok) setLast(j.last || null);
      } catch (_) {}
      if (alive) t = setTimeout(run, pollMs);
    };

    run();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [vehicleId, pollMs]);

  const pos = useMemo(() => {
    const lat = toNum(last?.lat);
    const lon = toNum(last?.lon);
    if (lat === null || lon === null) return null;
    return [lat, lon];
  }, [last]);

  // Follow ON ise konuma odakla; OFF ise sadece marker güncellensin
  useEffect(() => {
    if (!pos) return;
    lastPosRef.current = pos;

    if (!followRef.current) return;

    const z = firstFixRef.current ? 16 : map.getZoom();
    firstFixRef.current = false;
    map.setView(pos, z, { animate: !firstFixRef.current });
  }, [pos, map]);

  const icon = useMemo(() => new L.DivIcon({
    className: "vehicle-dot",
    html: '<div style="width:14px;height:14px;border-radius:999px;background:#111;box-shadow:0 0 0 3px rgba(0,0,0,.15)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  }), []);

  const enableFollow = () => {
    setFollow(true);
    toast("Takip açıldı", { id: "follow-on" });
    if (lastPosRef.current) map.setView(lastPosRef.current, map.getZoom(), { animate: true });
  };

  return (
    <>
      <Toaster position="top-center" />
      {pos && (
        <Marker position={pos} icon={icon}>
          <Popup>
            <div style={{ fontSize: 12 }}>
              <div><b>Araç</b> #{vehicleId}</div>
              <div>lat: {pos[0]}</div>
              <div>lon: {pos[1]}</div>
              {last?.recordedAt && <div>ts: {String(last.recordedAt)}</div>}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Basit kontrol (follow kapalıyken göster) */}
      {!follow && (
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1000,
          background: "white",
          padding: "8px 10px",
          borderRadius: 10,
          boxShadow: "0 6px 24px rgba(0,0,0,.12)"
        }}>
          <button onClick={enableFollow} style={{
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer"
          }}>
            Takip Aç
          </button>
        </div>
      )}
    </>
  );
}
`.trimStart();

  fs.writeFileSync(layerFile, layer, "utf8");
}

// 2) Map dosyasını patchle
let s = read(mapFile);

// import ekle
const importLine = `import GpsFollowLayer from "./GpsFollowLayer.jsx";\n`;
if (!s.includes("GpsFollowLayer")) {
  const m = s.match(/^(import[^\n]*\n)+/m);
  if (m) s = s.replace(m[0], m[0] + importLine);
  else s = importLine + s;
}

// MapContainer içine layer ekle
if (!s.includes("<GpsFollowLayer")) {
  const closeTag = "</MapContainer>";
  const idx = s.indexOf(closeTag);
  if (idx === -1) {
    console.error("HATA: </MapContainer> bulunamadı, manuel eklemek gerekir.");
    process.exit(1);
  }
  s = s.slice(0, idx) + `\n        <GpsFollowLayer vehicleId={1} />\n` + s.slice(idx);
}

// backup + write
const stamp = new Date().toISOString().replace(/[-:T]/g,"").slice(0,15);
fs.writeFileSync(mapFile + `.bak_${stamp}`, s, "utf8");
fs.writeFileSync(mapFile, s, "utf8");

console.log("OK: Map patched");
console.log("Map file:", mapFile);
console.log("Layer file:", layerFile);
