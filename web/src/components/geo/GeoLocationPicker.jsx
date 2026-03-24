import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";

const DEFAULT_COUNTRY_CENTER = [39.0, 35.0];
const EMPTY_ZOOM = 6;
const PICKER_ZOOM = 16;
const PICKER_MAX_ZOOM = 18;
const PICKER_MIN_ZOOM = 5;

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function MapClickPicker({ onPick }) {
  useMapEvents({
    click(e) {
      const lat = Number(e?.latlng?.lat);
      const lng = Number(e?.latlng?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) onPick(lat, lng);
    },
  });
  return null;
}

function MapCenterSync({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!Array.isArray(center) || center.length !== 2) return;
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

function MapTools({ center, zoom }) {
  const map = useMap();
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1000,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        className="btn sm"
        style={{ backdropFilter: "blur(4px)", background: "rgba(15,23,42,.78)" }}
        onClick={() => map.setView(center, zoom, { animate: true })}
      >
        Merkeze al
      </button>
      <button
        type="button"
        className="btn sm ghost"
        style={{ backdropFilter: "blur(4px)", background: "rgba(15,23,42,.78)" }}
        onClick={() => map.zoomIn()}
      >
        +
      </button>
      <button
        type="button"
        className="btn sm ghost"
        style={{ backdropFilter: "blur(4px)", background: "rgba(15,23,42,.78)" }}
        onClick={() => map.zoomOut()}
      >
        -
      </button>
    </div>
  );
}

export default function GeoLocationPicker({
  title,
  subtitle,
  selectedName,
  address,
  onAddressChange,
  lat,
  lng,
  onPick,
  onGeocode,
  onSave,
  onMarkOk,
  onClear,
  busy = false,
  geoBusy = false,
  statusLabel = "-",
  reasonLabel = "Neden yok",
}) {
  const latNum = toNum(lat);
  const lngNum = toNum(lng);
  const valid = latNum != null && lngNum != null;
  const center = useMemo(() => (valid ? [latNum, lngNum] : DEFAULT_COUNTRY_CENTER), [valid, latNum, lngNum]);
  const zoom = valid ? PICKER_ZOOM : EMPTY_ZOOM;

  return (
    <div className="card" style={{ minHeight: 640 }}>
      <div className="topbar">
        <div>
          <div className="title">{title || "Konum seçici"}</div>
          <div className="muted">{subtitle || "Adresi yaz, adresten bul ya da haritada tıklayıp pimi seç."}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Seçili kayıt: <b>{selectedName || "-"}</b>
          </div>
        </div>
        <div className="muted" style={{ textAlign: "right" }}>
          <div>Durum: <b>{statusLabel || "-"}</b></div>
          <div style={{ marginTop: 4 }}>{reasonLabel || "Neden yok"}</div>
        </div>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <div className="muted">Adres</div>
        <input
          value={address}
          onChange={(e) => onAddressChange && onAddressChange(e.target.value)}
          placeholder="Adres gir veya haritada pimi seç"
          disabled={busy}
        />
      </div>

      <div className="fieldRow" style={{ marginTop: 12 }}>
        <div className="field">
          <div className="muted">Lat</div>
          <input type="number" step="0.000001" value={lat ?? ""} readOnly disabled />
        </div>
        <div className="field">
          <div className="muted">Lng</div>
          <input type="number" step="0.000001" value={lng ?? ""} readOnly disabled />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          height: 420,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(148,163,184,.18)",
          background: "rgba(15,23,42,.18)",
          position: "relative",
        }}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          minZoom={PICKER_MIN_ZOOM}
          zoomControl={false}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={PICKER_MAX_ZOOM}
          />
          <ZoomControl position="bottomright" />
          <MapCenterSync center={center} zoom={zoom} />
          <MapClickPicker onPick={onPick} />
          <MapTools center={center} zoom={zoom} />
          {valid ? (
            <CircleMarker
              center={[latNum, lngNum]}
              radius={10}
              pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.85, weight: 3 }}
            />
          ) : null}
        </MapContainer>
      </div>

      <div className="muted" style={{ marginTop: 10 }}>
        İpucu: Harita artık daha okunur yakınlıkta açılır. Önce adresten bul, sonra gerekirse haritada tıklayıp pimi ince ayar yap. "Merkeze al" ile seçili konuma tekrar dönebilirsin.
      </div>

      <div className="actionsRow" style={{ marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn sm" onClick={onGeocode} disabled={busy || geoBusy || !String(address || "").trim()}>
          {geoBusy ? "Bulunuyor..." : "Adresten Bul"}
        </button>
        <button type="button" className="btn sm ghost" onClick={onClear} disabled={busy}>
          Konumu Temizle
        </button>
        <button type="button" className="btn sm" onClick={onSave} disabled={busy}>
          {busy ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button type="button" className="btn sm primary" onClick={onMarkOk} disabled={busy || !valid}>
          {busy ? "..." : "OK Yap"}
        </button>
      </div>
    </div>
  );
}
