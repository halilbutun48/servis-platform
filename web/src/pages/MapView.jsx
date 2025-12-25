import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import GpsFollowLayer from "./GpsFollowLayer.jsx";

export default function MapView() {
  // Seed coords (same as DB seed)
  const school = useMemo(() => ({ name: "Demo Okul", lat: 41.0094, lon: 28.9794 }), []);
  const stops = useMemo(() => ([
    { ord: 1, name: "Durak 1", lat: 41.0100, lon: 28.9800 },
    { ord: 2, name: "Durak 2", lat: 41.0120, lon: 28.9820 },
  ]), []);

  const schoolIcon = useMemo(() => new L.DivIcon({
    className: "school-icon",
    html: `
      <div style="
        width:28px;height:28px;border-radius:10px;
        background:#fff; box-shadow:0 6px 18px rgba(0,0,0,.18);
        display:flex;align-items:center;justify-content:center;
        border:1px solid rgba(0,0,0,.08)
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 10.5L12 5l8 5.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5Z" stroke="#111" stroke-width="2"/>
          <path d="M9 21v-7h6v7" stroke="#111" stroke-width="2"/>
          <path d="M3 10.5l9-6 9 6" stroke="#111" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }), []);

  const stopIcon = (n) => new L.DivIcon({
    className: "stop-icon",
    html: `
      <div style="
        width:26px;height:26px;border-radius:999px;
        background:#fff; box-shadow:0 6px 18px rgba(0,0,0,.18);
        display:flex;align-items:center;justify-content:center;
        border:2px solid #111; font-weight:800; font-size:12px;
      ">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  const center = [school.lat, school.lon];

  return (
    <div style={{ height: "calc(100vh - 16px)", padding: 8 }}>
      <div style={{ position: "relative", height: "100%" }}>
        <div style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1500,
          background: "white",
          padding: "10px 12px",
          borderRadius: 12,
          boxShadow: "0 6px 24px rgba(0,0,0,.12)",
          minWidth: 180
        }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Legend</div>
          <div style={{ fontSize: 12, lineHeight: 1.35 }}>
            <div>Okul</div>
            <div>- Durak (no)</div>
            <div>- Arac</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Drag/Zoom: Follow OFF
            </div>
          </div>
        </div>

        <MapContainer center={center} zoom={16} style={{ height: "100%", borderRadius: 14, overflow: "hidden" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />

          <Marker position={[school.lat, school.lon]} icon={schoolIcon}>
            <Popup><b>{school.name}</b></Popup>
          </Marker>

          {stops.map((s) => (
            <Marker key={s.ord} position={[s.lat, s.lon]} icon={stopIcon(s.ord)}>
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <b>{s.name}</b><br />
                  ord: {s.ord}
                </div>
              </Popup>
            </Marker>
          ))}

          <GpsFollowLayer vehicleId={1} pollMs={5000} />
        </MapContainer>
      </div>
    </div>
  );
}
