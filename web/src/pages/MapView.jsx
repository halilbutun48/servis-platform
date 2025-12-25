import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import GpsFollowLayer from "./GpsFollowLayer.jsx";

export default function MapView() {
  // Seed coords (same as DB seed)
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
        className: "school-icon",
        html: `
          <div style="
            width:28px;height:28px;border-radius:10px;
            background:#fff; box-shadow:0 6px 18px rgba(0,0,0,.18);
            display:flex;align-items:center;justify-content:center;
            border:1px solid rgba(0,0,0,.08)
          ">
            <div style="font-size:11px;font-weight:800;line-height:1">OK</div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    []
  );

  const stopIcon = (n) =>
    new L.DivIcon({
      className: "stop-icon",
      html: `
        <div style="
          width:26px;height:26px;border-radius:999px;
          background:#fff; box-shadow:0 6px 18px rgba(0,0,0,.18);
          display:flex;align-items:center;justify-content:center;
          border:2px solid #111; font-weight:800; font-size:12px;
        ">${n}</div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

  const center = [school.lat, school.lon];

  return (
    <div style={{ height: "calc(100vh - 16px)", padding: 8 }}>
      <div style={{ position: "relative", height: "100%" }}>
        {/* Legend */}
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
            minWidth: 180,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Legend</div>
          <div style={{ fontSize: 12, lineHeight: 1.35 }}>
            <div>OK Okul</div>
            <div>- Durak (numara)</div>
            <div>- Arac</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>Drag/Zoom: Follow OFF</div>
          </div>
        </div>

        <MapContainer
          center={center}
          zoom={16}
          style={{ height: "100%", borderRadius: 14, overflow: "hidden" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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

          {/* Arac + Follow logic */}
          <GpsFollowLayer vehicleId={1} pollMs={15000} />
        </MapContainer>
      </div>
    </div>
  );
}
