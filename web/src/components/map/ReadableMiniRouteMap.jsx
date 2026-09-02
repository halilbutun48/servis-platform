import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { useSession } from "../../state/session";
import { getShiftRoutePreview } from "../../utils/shiftRoutePreview";
import "./markers.css";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizePoint(point = null, index = 0) {
  if (!point || typeof point !== "object") return null;

  const lat = toNumber(point.lat ?? point.latitude ?? point.y);
  const lng = toNumber(point.lng ?? point.lon ?? point.longitude ?? point.x);
  if (lat == null || lng == null) return null;

  const label = String(point.label ?? point.badge ?? point.shortLabel ?? point.name ?? point.title ?? point.kind ?? point.role ?? "").trim();
  const tooltip = String(point.tooltip ?? point.tooltipLabel ?? point.name ?? point.title ?? label).trim();

  return {
    id: String(point.id ?? point.key ?? `${label || "point"}:${index}:${lat}:${lng}`),
    lat,
    lng,
    label: label || String(index + 1),
    tooltip: tooltip || label || String(index + 1),
    tone: String(point.tone ?? point.kind ?? point.role ?? "route").toLowerCase(),
    kind: String(point.kind ?? point.role ?? "route").toLowerCase(),
  };
}

function normalizePathPoint(point = null, index = 0) {
  if (!point || typeof point !== "object") return null;
  const lat = toNumber(point.lat ?? point.latitude ?? point.y);
  const lng = toNumber(point.lng ?? point.lon ?? point.longitude ?? point.x);
  if (lat == null || lng == null) return null;
  return {
    id: String(point.id ?? point.key ?? `path:${index}:${lat}:${lng}`),
    lat,
    lng,
  };
}

function buildBounds(points = []) {
  const coords = (Array.isArray(points) ? points : [])
    .filter((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .map((point) => [point.lat, point.lng]);

  if (!coords.length) return null;

  if (coords.length === 1) {
    const [lat, lng] = coords[0];
    return latLngBounds([
      [lat - 0.006, lng - 0.006],
      [lat + 0.006, lng + 0.006],
    ]);
  }

  return latLngBounds(coords);
}

function toneStyle(tone = "route") {
  const key = String(tone || "").toLowerCase();
  if (key === "start") {
    return { fillColor: "#16a34a", color: "rgba(255,255,255,.92)", weight: 2, fillOpacity: 0.96, radius: 9 };
  }
  if (key === "end") {
    return { fillColor: "#f59e0b", color: "rgba(255,255,255,.92)", weight: 2, fillOpacity: 0.96, radius: 9 };
  }
  if (key === "current") {
    return { fillColor: "#f97316", color: "rgba(255,255,255,.92)", weight: 2, fillOpacity: 0.98, radius: 10 };
  }
  if (key === "requested") {
    return { fillColor: "#2563eb", color: "rgba(255,255,255,.92)", weight: 2, fillOpacity: 0.98, radius: 10 };
  }
  if (key === "highlight") {
    return { fillColor: "#7c3aed", color: "rgba(255,255,255,.92)", weight: 2, fillOpacity: 0.96, radius: 9 };
  }
  if (key === "muted") {
    return { fillColor: "#475569", color: "rgba(255,255,255,.90)", weight: 2, fillOpacity: 0.95, radius: 8 };
  }
  return { fillColor: "#3b82f6", color: "rgba(255,255,255,.92)", weight: 2, fillOpacity: 0.96, radius: 8 };
}

function buildGeometryKey(points = []) {
  return (Array.isArray(points) ? points : [])
    .map((point) => `${point?.id || ""}:${point?.lat ?? ""}:${point?.lng ?? ""}:${point?.label || ""}:${point?.tone || ""}`)
    .join("|");
}

function routeSourceLabel(source = "") {
  const key = String(source || "").trim().toUpperCase();
  if (key === "SNAPSHOT") return "Yol ağına yakın rota";
  if (key === "LEARNED") return "Yol ağına yakın rota";
  if (key === "ESTIMATED") return "Yaklaşık / kuş uçuşu önizleme";
  return "";
}

function routeSourceDetail(source = "") {
  const key = String(source || "").trim().toUpperCase();
  if (key === "SNAPSHOT") return "Kaydedilmiş rota";
  if (key === "LEARNED") return "Öğrenilmiş";
  if (key === "ESTIMATED") return "Yaklaşık";
  return "";
}

function MiniMapViewportController({ geometryKey, bounds, fitPadding = [24, 24], maxZoom = 17 }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        // ignore resize timing glitches during panel open/close
      }

      if (!bounds) return;

      try {
        map.fitBounds(bounds, { padding: fitPadding, maxZoom });
      } catch {
        // ignore incomplete bounds while tiles are still loading
      }
    }, 60);

    return () => window.clearTimeout(timer);
  }, [map, bounds, fitPadding, maxZoom, geometryKey]);

  return null;
}

function MiniRouteMapSurface({
  interactive = false,
  allowWheelZoomInModal = true,
  openModal = null,
  expandable = false,
  showOpenMapButton = false,
  linePoints = [],
  markers = [],
  bounds = null,
  geometryKey = "",
  defaultCenter = [41.0082, 28.9784],
  defaultZoom = 12,
  tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  tileAttribution = "&copy; OpenStreetMap contributors",
  tileFailureGeometryKey = "",
  setTileFailureGeometryKey = null,
}) {
  const hasCoordinates = Array.isArray(bounds) ? bounds.length > 0 : Boolean(bounds);
  const center = linePoints[0] || markers[0] || null;
  const mapCenter = center ? [center.lat, center.lng] : defaultCenter;
  const tilesFailed = tileFailureGeometryKey === geometryKey;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100%",
        height: "100%",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(15,23,42,0.86), rgba(15,23,42,0.72))",
      }}
    >
      {hasCoordinates ? (
        <MapContainer
          center={mapCenter}
          zoom={defaultZoom}
          zoomControl={interactive}
          dragging={interactive}
          scrollWheelZoom={interactive && allowWheelZoomInModal}
          doubleClickZoom={interactive}
          touchZoom={interactive}
          boxZoom={interactive}
          keyboard={interactive}
          style={{ width: "100%", height: "100%" }}
          className="readableMiniRouteMap__leaflet"
        >
          <MiniMapViewportController
            geometryKey={geometryKey}
            bounds={bounds}
            fitPadding={interactive ? [32, 32] : [22, 22]}
            maxZoom={interactive ? 18 : 17}
          />

          <TileLayer
            attribution={tileAttribution}
            url={tileUrl}
            eventHandlers={{
              load: () => {
                if (typeof setTileFailureGeometryKey === "function") setTileFailureGeometryKey("");
              },
              tileerror: () => {
                if (typeof setTileFailureGeometryKey === "function") setTileFailureGeometryKey(geometryKey);
              },
            }}
          />

          {linePoints.length >= 2 ? (
            <Polyline
              positions={linePoints.map((point) => [point.lat, point.lng])}
              pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.82, lineCap: "round", lineJoin: "round" }}
            />
          ) : null}

          {markers.map((point, index) => {
            const tone = toneStyle(point.tone || point.kind);
            return (
              <CircleMarker
                key={point.id || `${point.label}:${index}`}
                center={[point.lat, point.lng]}
                radius={tone.radius}
                pathOptions={{
                  color: tone.color,
                  fillColor: tone.fillColor,
                  fillOpacity: tone.fillOpacity,
                  weight: tone.weight,
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -10]} opacity={1}>
                  {point.label}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      ) : null}

      {!interactive && hasCoordinates && expandable && showOpenMapButton ? (
        <button
          type="button"
          aria-label="Haritayı büyüt"
          onClick={openModal}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 430,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            padding: 10,
            border: 0,
            background: "linear-gradient(180deg, rgba(15,23,42,0.02), rgba(15,23,42,0.08))",
            cursor: "zoom-in",
            color: "inherit",
          }}
        >
          <span className="map-preview-pill">Haritayı büyüt</span>
        </button>
      ) : null}

      {!interactive && hasCoordinates && tilesFailed ? (
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            zIndex: 500,
            maxWidth: "calc(100% - 20px)",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(245, 158, 11, 0.36)",
            background: "rgba(17,24,39,0.90)",
            color: "#fff",
            boxShadow: "0 14px 30px rgba(0,0,0,.24)",
            fontSize: 12,
            lineHeight: 1.35,
            pointerEvents: "none",
          }}
        >
          Harita döşemeleri yüklenemedi. Noktalar yine gösteriliyor.
        </div>
      ) : null}
    </div>
  );
}

export default function ReadableMiniRouteMap({
  title = "Mini harita önizlemesi",
  subtitle = "Leaflet tile arka planlı mini rota görünümü",
  linePoints = [],
  markers = [],
  routePathPoints = [],
  routePreviewShiftId = null,
  legendItems = [],
  fallbackText = "Harita için yeterli koordinat yok.",
  footerText = "",
  routeModeLabel = "",
  expandedTitle = "",
  expandable = false,
  expanded: expandedProp = undefined,
  onExpandedChange = null,
  allowWheelZoomInModal = true,
  showOpenMapButton = false,
  height = 240,
  minHeight = 220,
  defaultCenter = [41.0082, 28.9784],
  defaultZoom = 12,
  tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  tileAttribution = "&copy; OpenStreetMap contributors",
  className = "",
  style = {},
  ariaLabel = "Mini harita önizlemesi",
}) {
  const { token } = useSession();
  const isControlled = typeof expandedProp === "boolean";
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = isControlled ? expandedProp : internalExpanded;
  const setExpanded = (next) => {
    if (isControlled) {
      if (typeof onExpandedChange === "function") onExpandedChange(Boolean(next));
      return;
    }
    setInternalExpanded(Boolean(next));
    if (typeof onExpandedChange === "function") onExpandedChange(Boolean(next));
  };

  const [routePreviewState, setRoutePreviewState] = useState({
    shiftId: 0,
    status: "idle",
    source: "",
    points: [],
    error: "",
  });
  const [tileFailureGeometryKey, setTileFailureGeometryKey] = useState("");
  const requestedShiftId = Number(routePreviewShiftId || 0);
  const routePreviewEnabled = Boolean(routePreviewShiftId && token);

  useEffect(() => {
    if (!routePreviewEnabled) return;

    const sid = requestedShiftId;

    let alive = true;
    const controller = new AbortController();

    (async () => {
      try {
        const data = await getShiftRoutePreview(token, sid, { signal: controller.signal, ttlMs: 30000, delayMs: 80 });
        if (!alive) return;

        const points = Array.isArray(data?.path?.points)
          ? data.path.points.map((point, index) => normalizePathPoint(point, index)).filter(Boolean)
          : [];

        setRoutePreviewState({
          shiftId: sid,
          status: data?.ok === false ? "error" : "ready",
          source: String(data?.path?.source || "").toUpperCase(),
          points,
          error: data?.ok === false ? String(data?.error || "route-preview-error") : "",
        });
      } catch (error) {
        if (!alive) return;
        setRoutePreviewState({
          shiftId: sid,
          status: "error",
          source: "",
          points: [],
          error: String(error?.message || error || "route-preview-error"),
        });
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [routePreviewEnabled, requestedShiftId, token]);

  const normalizedLinePoints = useMemo(
    () => (Array.isArray(linePoints) ? linePoints : [])
      .map((point, index) => normalizePoint(point, index))
      .filter(Boolean),
    [linePoints]
  );

  const normalizedRoutePathPoints = useMemo(
    () => (Array.isArray(routePathPoints) ? routePathPoints : [])
      .map((point, index) => normalizePathPoint(point, index))
      .filter(Boolean),
    [routePathPoints]
  );

  const normalizedMarkers = useMemo(
    () => (Array.isArray(markers) ? markers : [])
      .map((point, index) => normalizePoint(point, index))
      .filter(Boolean),
    [markers]
  );

  const activeRoutePreviewState = routePreviewEnabled && routePreviewState.shiftId === requestedShiftId
    ? routePreviewState
    : routePreviewEnabled
      ? { shiftId: requestedShiftId, status: "loading", source: "", points: [], error: "" }
      : { shiftId: 0, status: "idle", source: "", points: [], error: "" };

  const previewRoutePoints = activeRoutePreviewState.points.length >= 2 ? activeRoutePreviewState.points : [];
  const routePath = previewRoutePoints.length >= 2
    ? previewRoutePoints
    : normalizedRoutePathPoints.length >= 2
      ? normalizedRoutePathPoints
      : normalizedLinePoints;
  const renderMarkers = normalizedMarkers.length ? normalizedMarkers : normalizedLinePoints;
  const boundsPoints = useMemo(
    () => [...routePath, ...renderMarkers],
    [routePath, renderMarkers]
  );
  const bounds = useMemo(() => buildBounds(boundsPoints), [boundsPoints]);
  const geometryKey = useMemo(
    () => buildGeometryKey(boundsPoints),
    [boundsPoints]
  );

  const hasCoordinates = boundsPoints.length > 0;

  const routeMode = useMemo(() => {
    const remoteLabel = routeSourceLabel(activeRoutePreviewState.source);
    if (remoteLabel) {
      return activeRoutePreviewState.source ? `${remoteLabel}${routeSourceDetail(activeRoutePreviewState.source) ? ` (${routeSourceDetail(activeRoutePreviewState.source)})` : ""}` : remoteLabel;
    }
    if (routePreviewEnabled && activeRoutePreviewState.status === "loading") {
      return "Yol verisi yükleniyor";
    }
    if (routeModeLabel) return routeModeLabel;
    return hasCoordinates ? "Yaklaşık / kuş uçuşu önizleme" : "";
  }, [hasCoordinates, routeModeLabel, routePreviewEnabled, activeRoutePreviewState.source, activeRoutePreviewState.status]);

  const legendNodes = legendItems
    .filter(Boolean)
    .map((item, index) => {
      const legend = typeof item === "string" ? { label: item, text: "" } : item;
      const label = String(legend.label || legend.shortLabel || "").trim();
      const text = String(legend.text || legend.description || "").trim();
      return (
        <span className="map-preview-pill" key={`${label || "legend"}:${index}`}>
          <strong style={{ letterSpacing: ".2px" }}>{label || `#${index + 1}`}</strong>
          {text ? <span>{text}</span> : null}
        </span>
      );
    });

  const openModal = () => {
    if (!expandable) return;
    setExpanded(true);
  };

  const closeModal = () => {
    if (!expandable) return;
    setExpanded(false);
  };

  const modalTitle = expandedTitle || title;
  const modalNote = activeRoutePreviewState.status === "loading"
    ? "Yol verisi yükleniyor. Şimdilik mevcut mini görünüm gösterilir."
    : activeRoutePreviewState.status === "error" && activeRoutePreviewState.error
      ? "Yol verisi alınamadı; mevcut önizleme kullanılıyor."
      : activeRoutePreviewState.source === "ESTIMATED" || !activeRoutePreviewState.source
        ? "Yaklaşık / kuş uçuşu önizleme."
        : "Yol ağına yakın rota görünümü.";

  return (
    <section
      className={className}
      aria-label={ariaLabel || title}
      style={{
        display: "grid",
        gap: 10,
        minWidth: 0,
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 0 0 1px rgba(15,23,42,0.04) inset",
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{title}</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
          {routeMode ? (
            <span className="map-preview-pill" title={activeRoutePreviewState.source ? `Rota kaynağı: ${activeRoutePreviewState.source}` : "Rota kaynağı okunamadı"}>
              {routeMode}
            </span>
          ) : null}
          {legendNodes.length ? legendNodes : null}
          {expandable && showOpenMapButton ? (
            <button type="button" className="btn sm" onClick={openModal}>
              Haritayı büyüt
            </button>
          ) : null}
        </div>
      </div>

      {hasCoordinates ? (
        <div
          style={{
            position: "relative",
            minHeight,
            height,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(15,23,42,0.86), rgba(15,23,42,0.72))",
          }}
        >
          <MiniRouteMapSurface
            interactive={false}
            linePoints={routePath}
            markers={renderMarkers}
            bounds={bounds}
            geometryKey={geometryKey}
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
            allowWheelZoomInModal={allowWheelZoomInModal}
            openModal={openModal}
            expandable={expandable}
            showOpenMapButton={showOpenMapButton}
            tileUrl={tileUrl}
            tileAttribution={tileAttribution}
            tileFailureGeometryKey={tileFailureGeometryKey}
            setTileFailureGeometryKey={setTileFailureGeometryKey}
          />
        </div>
      ) : (
        <div
          style={{
            minHeight,
            display: "grid",
            alignContent: "center",
            gap: 8,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 800 }}>{fallbackText}</div>
          <div className="panelMeta">
            Koordinat eklenince burada tile arka planlı mini harita görünür. Rota çizgisi ve marker'lar birlikte okunur.
          </div>
        </div>
      )}

      {footerText ? (
        <div className="panelMeta" style={{ lineHeight: 1.45 }}>
          {footerText}
        </div>
      ) : null}

      {expandable && isExpanded ? (
        <div
          className="modal-backdrop routePreviewBackdrop"
          onClick={closeModal}
          style={{ zIndex: 9055, background: "rgba(0,0,0,0.58)" }}
        >
          <div
            className="card modal routePreviewModal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1180px, 96vw)",
              maxHeight: "92vh",
              overflow: "hidden",
              padding: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>{modalTitle}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{subtitle}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{modalNote}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                {routeMode ? <span className="map-preview-pill">{routeMode}</span> : null}
                <button type="button" className="btn sm" onClick={closeModal}>
                  Haritayı kapat
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {legendNodes.length ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {legendNodes}
                </div>
              ) : null}

              <div
                style={{
                  minHeight: "clamp(360px, 62vh, 680px)",
                  height: "clamp(360px, 62vh, 680px)",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "linear-gradient(180deg, rgba(15,23,42,0.86), rgba(15,23,42,0.72))",
                }}
              >
                <MiniRouteMapSurface
                  interactive
                  linePoints={routePath}
                  markers={renderMarkers}
                  bounds={bounds}
                  geometryKey={geometryKey}
                  defaultCenter={defaultCenter}
                  defaultZoom={defaultZoom}
                  allowWheelZoomInModal={allowWheelZoomInModal}
                  openModal={openModal}
                  expandable={expandable}
                  showOpenMapButton={showOpenMapButton}
                  tileUrl={tileUrl}
                  tileAttribution={tileAttribution}
                  tileFailureGeometryKey={tileFailureGeometryKey}
                  setTileFailureGeometryKey={setTileFailureGeometryKey}
                />
              </div>
            </div>

            {footerText ? (
              <div className="panelMeta" style={{ lineHeight: 1.45 }}>
                {footerText}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
