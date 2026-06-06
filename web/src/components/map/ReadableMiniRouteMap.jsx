import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
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

export default function ReadableMiniRouteMap({
  title = "Mini harita önizlemesi",
  subtitle = "Leaflet tile arka planlı mini rota görünümü",
  linePoints = [],
  markers = [],
  legendItems = [],
  fallbackText = "Harita için yeterli koordinat yok.",
  footerText = "",
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
  const normalizedLinePoints = useMemo(
    () => (Array.isArray(linePoints) ? linePoints : [])
      .map((point, index) => normalizePoint(point, index))
      .filter(Boolean),
    [linePoints]
  );

  const normalizedMarkers = useMemo(
    () => (Array.isArray(markers) ? markers : [])
      .map((point, index) => normalizePoint(point, index))
      .filter(Boolean),
    [markers]
  );

  const renderMarkers = normalizedMarkers.length ? normalizedMarkers : normalizedLinePoints;
  const linePath = normalizedLinePoints.length >= 2 ? normalizedLinePoints : [];
  const boundsPoints = useMemo(
    () => [...normalizedLinePoints, ...renderMarkers],
    [normalizedLinePoints, renderMarkers]
  );
  const bounds = useMemo(() => buildBounds(boundsPoints), [boundsPoints]);
  const geometryKey = useMemo(
    () => buildGeometryKey(boundsPoints),
    [boundsPoints]
  );

  const [tileFailureGeometryKey, setTileFailureGeometryKey] = useState("");
  const tilesFailed = tileFailureGeometryKey === geometryKey;

  const hasCoordinates = boundsPoints.length > 0;
  const center = normalizedLinePoints[0] || renderMarkers[0] || null;
  const mapCenter = center ? [center.lat, center.lng] : defaultCenter;

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

        {legendNodes.length ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
            {legendNodes}
          </div>
        ) : null}
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
          <MapContainer
            center={mapCenter}
            zoom={defaultZoom}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            boxZoom={false}
            keyboard={false}
            style={{ width: "100%", height: "100%" }}
            className="readableMiniRouteMap__leaflet"
          >
            <MiniMapViewportController
              geometryKey={geometryKey}
              bounds={bounds}
              fitPadding={[22, 22]}
              maxZoom={17}
            />

            <TileLayer
              attribution={tileAttribution}
              url={tileUrl}
              eventHandlers={{
                load: () => setTileFailureGeometryKey(""),
                tileerror: () => setTileFailureGeometryKey(geometryKey),
              }}
            />

            {linePath.length >= 2 ? (
              <Polyline
                positions={linePath.map((point) => [point.lat, point.lng])}
                pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.82, lineCap: "round", lineJoin: "round" }}
              />
            ) : null}

            {renderMarkers.map((point, index) => {
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

          {tilesFailed ? (
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
              }}
            >
              Harita döşemeleri yüklenemedi. Noktalar yine gösteriliyor.
            </div>
          ) : null}
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
    </section>
  );
}
