const fs = require("fs");

const mapView = `import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import GpsFollowLayer from "./GpsFollowLayer.jsx";

export default function MapView() {
  const school = useMemo(() => ({ name: "Demo Okul", lat: 41.0094, lon: 28.9794 }), []);
  const stops = useMemo(
    () => [
      { ord: 1, name: "Durak 1", lat: 41.01, lon: 28.98 },
      { ord: 2, name: "Durak 2", lat: 41.012, lon: 28.982 },
    ],
    []
  );

  const schoolIcon = useMemo(
    () =>
      new L.DivIcon({
        className: "ico-school",
        html: \`
          <div style="
            width:28px;height:28px;border-radius:10px;
            background:#fff; box-shadow:0 6px 18px rgba(0,0,0,.18);
            display:flex;align-items:center;justify-content:center;
            border:1px solid rgba(0,0,0,.10); font-weight:900; font-size:11px;
            color:#111;
          ">OK</div>
        \`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    []
  );

  const stopIcon = (n) =>
    new L.DivIcon({
      className: "ico-stop",
      html: \`
        <div style="
          width:26px;height:26px;border-radius:999px;
          background:#fff; box-shadow:0 6px 18px rgba(0,0,0,.18);
          display:flex;align-items:center;justify-content:center;
          border:2px solid #111; font-weight:900; font-size:12px; color:#111;
        ">\${n}</div>
      \`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

  const center = [school.lat, school.lon];

  return (
    <div style={{ height: "calc(100vh - 16px)", padding: 8 }}>
      <div style={{ position: "relative", height: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1500,
            background: "white",
            padding: "10px 12px",
            borderRadius: 12,
            boxShadow: "0 6px 24px rgba(0,0,0,.12)",
            minWidth: 190,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Legend</div>
          <div style={{ fontSize: 12, lineHeight: 1.35 }}>
            <div>OK  School</div>
            <div>-   Stop (number)</div>
            <div>-   Vehicle (dot)</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Drag/Zoom: Follow OFF
            </div>
          </div>
        </div>

        <MapContainer
          center={center}
          zoom={16}
          style={{ height: "100%", borderRadius: 14, overflow: "hidden" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />

          <Marker position={[school.lat, school.lon]} icon={schoolIcon}>
            <Popup>
              <b>{school.name}</b>
            </Popup>
          </Marker>

          {stops.map((s) => (
            <Marker key={s.ord} position={[s.lat, s.lon]} icon={stopIcon(s.ord)}>
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <b>{s.name}</b>
                  <br />
                  ord: {s.ord}
                </div>
              </Popup>
            </Marker>
          ))}

          <GpsFollowLayer vehicleId={1} pollMs={1500} />
        </MapContainer>
      </div>
    </div>
  );
}
`;

const gpsFollow = `import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import toast, { Toaster } from "react-hot-toast";
import L from "leaflet";

const toNum = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export default function GpsFollowLayer({ vehicleId = 1, pollMs = 1500 }) {
  const map = useMap();
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  const [last, setLast] = useState(null);
  const lastPosRef = useRef(null);
  const firstFixRef = useRef(true);

  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  // user drag => follow OFF
  useEffect(() => {
    const onDragStart = () => {
      if (followRef.current) {
        setFollow(false);
        toast("Dragged: Follow OFF", { id: "follow-off" });
      }
    };
    map.on("dragstart", onDragStart);
    return () => map.off("dragstart", onDragStart);
  }, [map]);

  // poll GPS last
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
    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, [vehicleId, pollMs]);

  const pos = useMemo(() => {
    const lat = toNum(last?.lat);
    const lon = toNum(last?.lon);
    if (lat === null || lon === null) return null;
    return [lat, lon];
  }, [last]);

  // follow ON => setView, follow OFF => no jump
  useEffect(() => {
    if (!pos) return;
    lastPosRef.current = pos;
    if (!followRef.current) return;

    const z = firstFixRef.current ? 16 : map.getZoom();
    map.setView(pos, z, { animate: true });
    firstFixRef.current = false;
  }, [pos, map]);

  const icon = useMemo(
    () =>
      new L.DivIcon({
        className: "ico-veh",
        html: \`
          <div style="
            width:18px;height:18px;border-radius:999px;
            background:#111; box-shadow:0 0 0 3px rgba(0,0,0,.15);
            border:2px solid #fff;
          "></div>
        \`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    []
  );

  const enableFollow = () => {
    setFollow(true);
    toast("Follow ON", { id: "follow-on" });
    if (lastPosRef.current) map.setView(lastPosRef.current, map.getZoom(), { animate: true });
  };

  return (
    <>
      <Toaster position="top-center" />
      {pos ? (
        <Marker position={pos} icon={icon}>
          <Popup>
            <div style={{ fontSize: 12 }}>
              <div>
                <b>Vehicle</b> #{vehicleId}
              </div>
              <div>lat: {pos[0]}</div>
              <div>lon: {pos[1]}</div>
              {last?.recordedAt && <div>ts: {String(last.recordedAt)}</div>}
            </div>
          </Popup>
        </Marker>
      ) : (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            zIndex: 2000,
            background: "white",
            padding: "8px 10px",
            borderRadius: 10,
            boxShadow: "0 6px 24px rgba(0,0,0,.12)",
            fontSize: 12,
          }}
        >
          Waiting GPS...
        </div>
      )}

      {!follow && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2000,
            background: "white",
            padding: "8px 10px",
            borderRadius: 10,
            boxShadow: "0 6px 24px rgba(0,0,0,.12)",
          }}
        >
          <button
            onClick={enableFollow}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Follow ON
          </button>
        </div>
      )}
    </>
  );
}
`;

fs.writeFileSync("src/pages/MapView.jsx", mapView.replace(/^\uFEFF/, ""), "utf8");
fs.writeFileSync("src/pages/GpsFollowLayer.jsx", gpsFollow.replace(/^\uFEFF/, ""), "utf8");
console.log("OK: MapView.jsx + GpsFollowLayer.jsx rewritten (ASCII).");
