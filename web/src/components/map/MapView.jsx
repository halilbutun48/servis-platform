import { useEffect, useMemo, useRef, useState } from "react";
import * as LeafletNS from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import "./mapShell.css";
import "./markers.css";
import { makeVehicleMarkerC } from "../../lib/markers/vehicleMarkerC";

/* LEAFLET_COMPAT */
const L = (LeafletNS.default && LeafletNS.default.divIcon) ? LeafletNS.default : LeafletNS;

function toNum(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const _divIconCache = new Map();
function divIconCached(key, opts) {
  if (_divIconCache.has(key)) return _divIconCache.get(key);
  const icon = L.divIcon(opts);
  _divIconCache.set(key, icon);
  return icon;
}

function iconStop(label = "DURAK") {
  const svg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s7-7.2 7-13a7 7 0 1 0-14 0c0 5.8 7 13 7 13Z" fill="white" opacity="0.2"/>
    <path d="M12 21s6-6.2 6-12a6 6 0 1 0-12 0c0 5.8 6 12 6 12Z" stroke="white" stroke-width="2"/>
    <path d="M9 9h6M9 12h6" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  const html = `<div class="pin-tag"><span class="pin-tag__dot"></span><span>${label}</span></div><div class="pin"><div class="pin__core">${svg}</div></div>`;
  return divIconCached(`stop:${label}`, {
    className: "pin-wrap pin-wrap--stop",
    html,
    iconSize: [140, 76],
    iconAnchor: [33, 56],
    popupAnchor: [0, -56],
  });
}


function FitController({ points, followPoint, fitKey }) {
  const map = useMap();
  const didFitRef = useRef(false);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  useEffect(() => { followRef.current = follow; }, [follow]);

  // Drag/Zoom => follow OFF
  useEffect(() => {
    const off = () => { if (followRef.current) setFollow(false); };
    map.on("dragstart", off);
    map.on("zoomstart", off);
    return () => {
      map.off("dragstart", off);
      map.off("zoomstart", off);
    };
  }, [map]);

  function fitAll() {
    if (!points?.length) return;
    const lats = points.map((p) => p[0]);
    const lons = points.map((p) => p[1]);
    const bounds = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ];
    map.fitBounds(bounds, { padding: [40, 40] });
    didFitRef.current = true;
  }

  // one-time fit on first meaningful data
  useEffect(() => {
    if (didFitRef.current) return;
    if (!points?.length) return;
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points?.length, fitKey]);

  // follow selected vehicle until user drags/zooms
  useEffect(() => {
    if (!followRef.current) return;
    if (!followPoint) return;
    map.setView(followPoint, map.getZoom(), { animate: true });
  }, [followPoint, map]);

  // expose fitAll to outside via window event (simple, no prop drilling)
  useEffect(() => {
    const onFit = () => fitAll();
    window.addEventListener("map:fitAll", onFit);
    return () => window.removeEventListener("map:fitAll", onFit);
  }, []);

  return null;
}

export default function MapView({
  vehicles = [],
  stops = [],
  selectedVehicleId = null,
  onSelectVehicle,
  fitKey = "default",
  height = "70vh",
}) {
  const center = useMemo(() => [41.0082, 28.9784], []); // Istanbul fallback

  const stopPoints = useMemo(() => {
    return (stops || [])
      .map((s) => [toNum(s.lat), toNum(s.lng), s])
      .filter((x) => x[0] !== null && x[1] !== null);
  }, [stops]);

  const vehiclePoints = useMemo(() => {
    return (vehicles || [])
      .map((v) => {
        const lat = toNum(v?.gpsLast?.lat);
        const lng = toNum(v?.gpsLast?.lng);
        if (lat === null || lng === null) return null;
        return [lat, lng, v];
      })
      .filter(Boolean);
  }, [vehicles]);

  const allPoints = useMemo(() => {
    return [...vehiclePoints.map((x) => [x[0], x[1]]), ...stopPoints.map((x) => [x[0], x[1]])];
  }, [vehiclePoints, stopPoints]);

  const followPoint = useMemo(() => {
    const v = (vehicles || []).find((x) => x.id === selectedVehicleId);
    const lat = toNum(v?.gpsLast?.lat);
    const lng = toNum(v?.gpsLast?.lng);
    if (lat === null || lng === null) return null;
    return [lat, lng];
  }, [vehicles, selectedVehicleId]);

  const polyline = useMemo(() => stopPoints.map((x) => [x[0], x[1]]), [stopPoints]);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ height, width: "100%" }}>
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <FitController points={allPoints} followPoint={followPoint} fitKey={fitKey} />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {polyline?.length >= 2 ? <Polyline positions={polyline} /> : null}

          {stopPoints.map(([lat, lng, s]) => (
            <Marker key={`stop:${s.id ?? s.order ?? s.name}`} position={[lat, lng]} icon={iconStop(s.name || `Stop ${s.order ?? ""}`)}>
              <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent={false}>
                {s.name || "Stop"}
              </Tooltip>
            </Marker>
          ))}

          {vehiclePoints.map(([lat, lng, v]) => (
            <Marker
              key={`veh:${v.id}`}
              position={[lat, lng]}
              icon={makeVehicleMarkerC({ plate: v.plate, status: (v.status === "STALE" ? "stale" : v.status === "PASSIVE" ? "offline" : "online"), heading: 0 })}
              eventHandlers={{
                click: () => onSelectVehicle && onSelectVehicle(v.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent={v.id === selectedVehicleId}>
                {v.plate} {v.status ? `(${v.status})` : ""}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div style={{ padding: 12, display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <div className="muted">
          {selectedVehicleId ? `Seçili araç: #${selectedVehicleId}` : "Araç seç: marker'a tıkla"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.dispatchEvent(new Event("map:fitAll"))}>Tümünü Göster</button>
        </div>
      </div>
    </div>
  );
}
