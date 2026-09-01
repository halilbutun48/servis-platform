// web/src/components/map/MapView.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as LeafletNS from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { uiStatusFromVehicle } from "../../utils/uiStatus";
import { gpsFreshnessLabelFromUiStatus, gpsSourceLabelFromKey } from "../../utils/gpsSource";
import { gpsSourceVisibilityTextFromVehicle } from "../../utils/gpsSourceVisibility";
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

function isReachedStop(stop) {
  const st = String(stop?.state || stop?.status || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || st === "COMPLETED" || st === "SKIPPED" || Boolean(stop?.reachedAt) || Boolean(stop?.reached);
}

function firstPendingStop(stops) {
  return (Array.isArray(stops) ? stops : []).find((s) => !isReachedStop(s)) || null;
}

function lastCompletedStop(stops) {
  const arr = (Array.isArray(stops) ? stops : []).filter((s) => isReachedStop(s));
  if (!arr.length) return null;
  const sorted = arr.sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
  return sorted[sorted.length - 1] || null;
}

function nearestIndex(points, target) {
  if (!Array.isArray(points) || !points.length || !target) return -1;
  let bestIdx = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const dLat = Number(p[0]) - Number(target[0]);
    const dLng = Number(p[1]) - Number(target[1]);
    const score = (dLat * dLat) + (dLng * dLng);
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function sliceInclusive(points, fromIdx, toIdx) {
  if (!Array.isArray(points) || points.length < 2) return [];
  const a = Math.max(0, Number(fromIdx || 0));
  const b = Math.max(0, Number(toIdx || 0));
  if (a === b) return [points[a], points[b]].filter(Boolean);
  if (a < b) return points.slice(a, b + 1);
  return points.slice(b, a + 1).reverse();
}

const _divIconCache = new Map();
function divIconCached(key, opts) {
  if (_divIconCache.has(key)) return _divIconCache.get(key);
  const icon = L.divIcon(opts);
  _divIconCache.set(key, icon);
  return icon;
}

function iconStop(label = "DURAK", variant = "default") {
  const svg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s7-7.2 7-13a7 7 0 1 0-14 0c0 5.8 7 13 7 13Z" fill="white" opacity="0.2"/>
    <path d="M12 21s6-6.2 6-12a6 6 0 1 0-12 0c0 5.8 6 12 6 12Z" stroke="white" stroke-width="2"/>
    <path d="M9 9h6M9 12h6" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

  const html = `<div class="pin-tag"><span class="pin-tag__dot"></span><span>${label}</span></div><div class="pin"><div class="pin__core">${svg}</div></div>`;
  const variantClass = variant === "next" ? " pin-wrap--stopNext" : variant === "done" ? " pin-wrap--stopDone" : "";

  return divIconCached(`stop:${variant}:${label}`, {
    className: `pin-wrap pin-wrap--stop${variantClass}`,
    html,
    iconSize: [140, 76],
    iconAnchor: [33, 56],
    popupAnchor: [0, -56],
  });
}

function FitController({ points, followPoint, followZoom, fitKey }) {
  const map = useMap();
  const didFitRef = useRef(false);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);

  useEffect(() => { followRef.current = follow; }, [follow]);

  useEffect(() => {
    const off = () => { if (followRef.current) setFollow(false); };
    map.on("dragstart", off);
    map.on("zoomstart", off);
    return () => {
      map.off("dragstart", off);
      map.off("zoomstart", off);
    };
  }, [map]);

  useEffect(() => {
    const onFocus = () => { if (followRef.current) setFollow(false); };
    window.addEventListener("map:focus", onFocus);
    return () => window.removeEventListener("map:focus", onFocus);
  }, []);

  const fitAll = useCallback(() => {
    if (!points?.length) return;
    const lats = points.map((p) => p[0]);
    const lons = points.map((p) => p[1]);
    const bounds = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ];
    map.fitBounds(bounds, { padding: [40, 40] });
    didFitRef.current = true;
  }, [map, points]);

  useEffect(() => {
    if (didFitRef.current) return;
    if (!points?.length) return;
    fitAll();
  }, [fitAll, points?.length, fitKey]);

  useEffect(() => {
    if (!followRef.current || !followPoint) return;
    const z = Number.isFinite(Number(followZoom)) ? Number(followZoom) : map.getZoom();
    map.setView(followPoint, z, { animate: true });
  }, [followPoint, followZoom, map]);

  useEffect(() => {
    const onFit = () => fitAll();
    window.addEventListener("map:fitAll", onFit);
    return () => window.removeEventListener("map:fitAll", onFit);
  }, [fitAll]);

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

function MapSizeController() {
  const map = useMap();

  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      if (disposed) return;
      try { map.invalidateSize({ pan: false }); } catch { /* map may be unmounted */ }
    };
    const timers = [0, 80, 260, 700].map((delay) => window.setTimeout(refresh, delay));
    const container = map.getContainer();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(refresh) : null;
    observer?.observe(container);
    window.addEventListener("resize", refresh);
    return () => {
      disposed = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      observer?.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [map]);

  return null;
}

export default function MapView({
  vehicles = [],
  stops = [],
  selectedVehicleId = null,
  onSelectVehicle,
  mode = "overview",
  fitKey = "default",
  height = "70vh",
  routePath = [],
  routeSource = "ESTIMATED",
}) {
  const center = useMemo(() => [41.0082, 28.9784], []);
  const [tileState, setTileState] = useState("loading");
  const tileLoadedRef = useRef(false);

  useEffect(() => {
    tileLoadedRef.current = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!tileLoadedRef.current) setTileState("fallback");
    }, 8000);
    return () => window.clearTimeout(fallbackTimer);
  }, []);

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

  const selectedVehicle = useMemo(
    () => (vehicles || []).find((x) => String(x.id) === String(selectedVehicleId)) || null,
    [vehicles, selectedVehicleId]
  );

  const followPoint = useMemo(() => {
    const v = selectedVehicle;
    const lat = toNum(v?.gpsLast?.lat);
    const lng = toNum(v?.gpsLast?.lng);
    if (lat === null || lng === null) return null;
    return [lat, lng];
  }, [selectedVehicle]);

  const selectedUi = useMemo(() => (selectedVehicle ? uiStatusFromVehicle(selectedVehicle) : null), [selectedVehicle]);
  const gpsSourceVisibility = gpsSourceVisibilityTextFromVehicle(selectedVehicle);
  const { sourceVisibility } = gpsSourceVisibility;
  const gpsSourceFallbackLabel = gpsSourceLabelFromKey(
    selectedVehicle?.gpsState?.lastSource || selectedVehicle?.gpsLast?.source
  );
  const selectedGpsSource = gpsSourceVisibility.text || gpsSourceFallbackLabel;
  const selectedGpsSourceLabel = sourceVisibility?.label || selectedGpsSource;
  const followZoom = useMemo(() => {
    if (selectedUi === "OFFLINE") return 12;
    if (selectedUi === "STALE") return 14;
    if (selectedUi === "LIVE") return 16;
    return null;
  }, [selectedUi]);

  const routeLine = useMemo(() => {
    const fromPath = (Array.isArray(routePath) ? routePath : [])
      .map((p) => [toNum(p?.lat), toNum(p?.lng)])
      .filter((x) => x[0] !== null && x[1] !== null);
    if (fromPath.length >= 2) return fromPath;
    return stopPoints.map((x) => [x[0], x[1]]);
  }, [routePath, stopPoints]);

  const nextStop = useMemo(() => firstPendingStop(stops), [stops]);
  const completedStop = useMemo(() => lastCompletedStop(stops), [stops]);

  const nextStopPoint = useMemo(() => {
    const lat = toNum(nextStop?.lat ?? nextStop?.location?.lat);
    const lng = toNum(nextStop?.lng ?? nextStop?.location?.lng);
    return lat === null || lng === null ? null : [lat, lng];
  }, [nextStop]);

  const completedStopPoint = useMemo(() => {
    const lat = toNum(completedStop?.lat ?? completedStop?.location?.lat);
    const lng = toNum(completedStop?.lng ?? completedStop?.location?.lng);
    return lat === null || lng === null ? null : [lat, lng];
  }, [completedStop]);

  const helperLeg = useMemo(() => {
    if (!followPoint || !nextStopPoint) return [];
    return [followPoint, nextStopPoint];
  }, [followPoint, nextStopPoint]);

  const completedRoute = useMemo(() => {
    if (!routeLine.length || !completedStopPoint) return [];
    const endIdx = nearestIndex(routeLine, completedStopPoint);
    if (endIdx < 1) return [];
    return routeLine.slice(0, endIdx + 1);
  }, [routeLine, completedStopPoint]);

  const nextLegRoute = useMemo(() => {
    if (!routeLine.length || !nextStopPoint) return [];
    const nextIdx = nearestIndex(routeLine, nextStopPoint);
    if (nextIdx < 0) return [];
    const startIdx = followPoint
      ? nearestIndex(routeLine, followPoint)
      : (completedStopPoint ? nearestIndex(routeLine, completedStopPoint) : 0);
    if (startIdx < 0) return routeLine.slice(0, nextIdx + 1);
    return sliceInclusive(routeLine, startIdx, nextIdx);
  }, [routeLine, nextStopPoint, followPoint, completedStopPoint]);

  const allPoints = useMemo(() => {
    return [
      ...vehiclePoints.map((x) => [x[0], x[1]]),
      ...stopPoints.map((x) => [x[0], x[1]]),
      ...routeLine,
    ];
  }, [vehiclePoints, stopPoints, routeLine]);

  return (
    <div className="card mapViewShell" data-map-route-source={routeSource} style={{ padding: 0 }}>
      <div style={{ height, width: "100%", position: "relative" }}>
        <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <FitController
            key={`fit:${fitKey}:${selectedVehicleId ?? "none"}`}
            points={allPoints}
            followPoint={followPoint}
            followZoom={followZoom}
            fitKey={fitKey}
          />
          <FocusController />
          <MapSizeController />

            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                load: () => {
                  tileLoadedRef.current = true;
                  setTileState("settled");
                },
                tileerror: () => {
                  if (!tileLoadedRef.current) setTileState("fallback");
                },
              }}
            />

          {routeLine?.length >= 2 ? (
            <Polyline positions={routeLine} pathOptions={{ color: "#64748b", weight: 5, opacity: 0.5 }} />
          ) : null}

          {completedRoute?.length >= 2 ? (
            <Polyline positions={completedRoute} pathOptions={{ color: "#22c55e", weight: 6, opacity: 0.65 }} />
          ) : null}

          {nextLegRoute?.length >= 2 ? (
            <Polyline positions={nextLegRoute} pathOptions={{ color: "#2563eb", weight: 7, opacity: 0.9 }} />
          ) : null}

          {helperLeg?.length >= 2 ? (
            <Polyline positions={helperLeg} pathOptions={{ color: "#0ea5e9", weight: 3, opacity: 0.8, dashArray: "8 8" }} />
          ) : null}

          {stopPoints.map(([lat, lng, s]) => {
            const variant =
              String(nextStop?.id) === String(s?.id)
                ? "next"
                : isReachedStop(s)
                  ? "done"
                  : "default";

            return (
              <Marker
                key={`stop:${s.id ?? s.order ?? s.name}`}
                position={[lat, lng]}
                icon={iconStop(s.name || `Durak ${s.order ?? ""}`, variant)}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent={false}>
                  {s.name || "Durak"}
                </Tooltip>
              </Marker>
            );
          })}

          {vehiclePoints.map(([lat, lng, v]) => {
            const ui = uiStatusFromVehicle(v);
            const icon = makeVehicleMarkerC({
              plate: v.plate,
              status: markerStatus(ui),
              heading: typeof v?.heading === "number" ? v.heading : 0,
              selected: String(v.id) === String(selectedVehicleId),
              muted: mode === "focus" && String(v.id) !== String(selectedVehicleId),
            });

            return (
              <Marker
                key={`veh:${v.id}`}
                position={[lat, lng]}
                icon={icon}
                eventHandlers={{ click: () => onSelectVehicle && onSelectVehicle(v.id) }}
              />
            );
          })}
        </MapContainer>
        {tileState === "fallback" ? (
          <div className="mapProviderStatus" data-map-fallback="true" role="status">
            Harita sağlayıcısı yanıt vermiyor. Konum listesi ve rota ayrıntıları aşağıdaki panelde korunuyor.
          </div>
        ) : null}
      </div>

      <div className="mapViewFooter" data-map-settled-state={tileState === "settled" ? "true" : "false"} data-map-provider-state={tileState}>
        <div className="muted" style={{ fontSize: 12 }}>
          {vehiclePoints.length ? `${vehiclePoints.length} araç haritada` : "Konum verisi bekleniyor"}
        </div>

        <div className="mapViewPills">
          <span className="pill">{mode === "focus" ? "Odak görünümü" : "Genel görünüm"}</span>
          <span className="pill" data-map-provider-label="true">{tileState === "settled" ? "Harita hazır" : tileState === "fallback" ? "Harita yedeği" : "Harita yükleniyor"}</span>
        </div>
      </div>

      <details className="mapViewDiagnostics">
        <summary>Tanılama ayrıntıları</summary>
        <div className="mapViewDiagnostics__grid">
          <span>GPS kaynağı: {selectedGpsSourceLabel}</span>
          <span>GPS durumu: {gpsFreshnessLabelFromUiStatus(selectedUi)}</span>
          <span>Rota kaynağı: {routeSource}</span>
        </div>
      </details>
    </div>
  );
}
