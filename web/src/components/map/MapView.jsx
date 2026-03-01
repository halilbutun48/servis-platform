// web/src/components/map/MapView.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import * as LeafletNS from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { uiStatusFromVehicle } from "../../utils/uiStatus";
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

function markerStatus(uiStatus) {
  if (uiStatus === "OFFLINE") return "offline";
  if (uiStatus === "STALE") return "stale";
  return "online";
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

function FitController({ points, followPoint, followZoom, fitKey, followResetKey }) {
  const map = useMap();
  const didFitRef = useRef(false);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);

  useEffect(() => { followRef.current = follow; }, [follow]);

  // selection change -> follow ON
  useEffect(() => { setFollow(true); }, [followResetKey]);

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

  // focus event => follow OFF
  useEffect(() => {
    const onFocus = () => { if (followRef.current) setFollow(false); };
    window.addEventListener("map:focus", onFocus);
    return () => window.removeEventListener("map:focus", onFocus);
  }, []);

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

  useEffect(() => {
    if (didFitRef.current) return;
    if (!points?.length) return;
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points?.length, fitKey]);

  useEffect(() => {
    if (!followRef.current) return;
    if (!followPoint) return;
    const z = Number.isFinite(Number(followZoom)) ? Number(followZoom) : map.getZoom();
    map.setView(followPoint, z, { animate: true });
  }, [followPoint, followZoom, map]);

  useEffect(() => {
    const onFit = () => fitAll();
    window.addEventListener("map:fitAll", onFit);
    return () => window.removeEventListener("map:fitAll", onFit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points?.length]);

  return null;
}

function FocusController() {
  const map = useMap();

  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail || {};
      const lat = toNum(d.lat);
      const lng = toNum(d.lng);
      if (lat === null || lng === null) return;

      const zoom = Number.isFinite(Number(d.zoom)) ? Number(d.zoom) : Math.max(map.getZoom(), 15);
      map.flyTo([lat, lng], zoom, { animate: true, duration: 0.6 });
    };

    window.addEventListener("map:focus", handler);
    return () => window.removeEventListener("map:focus", handler);
  }, [map]);

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
      .map((s) => [toNum(s.lat ?? s?.location?.lat), toNum(s.lng ?? s?.location?.lng), s])
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
    return [
      ...vehiclePoints.map((x) => [x[0], x[1]]),
      ...stopPoints.map((x) => [x[0], x[1]]),
    ];
  }, [vehiclePoints, stopPoints]);

  const selectedVehicle = useMemo(
    () => (vehicles || []).find((x) => x.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const followPoint = useMemo(() => {
    const v = selectedVehicle;
    const lat = toNum(v?.gpsLast?.lat);
    const lng = toNum(v?.gpsLast?.lng);
    if (lat === null || lng === null) return null;
    return [lat, lng];
  }, [selectedVehicle]);

  const polyline = useMemo(() => stopPoints.map((x) => [x[0], x[1]]), [stopPoints]);

  const selectedUi = useMemo(() => (selectedVehicle ? uiStatusFromVehicle(selectedVehicle) : null), [selectedVehicle]);
  const followZoom = useMemo(() => {
    if (selectedUi === "OFFLINE") return 12;
    if (selectedUi === "STALE") return 14;
    if (selectedUi === "LIVE") return 16;
    return null;
  }, [selectedUi]);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ height, width: "100%" }}>
        <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <FitController
            points={allPoints}
            followPoint={followPoint}
            followZoom={followZoom}
            fitKey={fitKey}
            followResetKey={selectedVehicleId}
          />
          <FocusController />

          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {polyline?.length >= 2 ? <Polyline positions={polyline} /> : null}

          {stopPoints.map(([lat, lng, s]) => (
            <Marker key={`stop:${s.id ?? s.order ?? s.name}`} position={[lat, lng]} icon={iconStop(s.name || `Stop ${s.order ?? ""}`)}>
              <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent={false}>
                {s.name || "Stop"}
              </Tooltip>
            </Marker>
          ))}

          {vehiclePoints.map(([lat, lng, v]) => {
            const ui = uiStatusFromVehicle(v); // LIVE|STALE|OFFLINE
            const icon = makeVehicleMarkerC({
              plate: v.plate,
              status: markerStatus(ui), // online|stale|offline
              heading: typeof v?.heading === "number" ? v.heading : 0,
            });

            return (
              <Marker key={`veh:${v.id}`} position={[lat, lng]} icon={icon} eventHandlers={{ click: () => onSelectVehicle && onSelectVehicle(v.id) }} />
            );
          })}
        </MapContainer>
      </div>

      <div style={{ padding: 12, display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <div className="muted">{selectedVehicleId ? `Seçili araç: #${selectedVehicleId}` : "Araç seç: marker'a tıkla"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.dispatchEvent(new Event("map:fitAll"))}>Tümünü Göster</button>
        </div>
      </div>
    </div>
  );
}


