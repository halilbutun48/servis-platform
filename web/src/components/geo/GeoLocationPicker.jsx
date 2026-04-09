import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";

const DEFAULT_COUNTRY_CENTER = [39.0, 35.0];
const EMPTY_ZOOM = 6;
const PREVIEW_ZOOM = 14;
const PICKER_ZOOM = 16;
const PICKER_MAX_ZOOM = 18;
const PICKER_MIN_ZOOM = 5;

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function MapClickPicker({ onPick, enabled = true }) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
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

function MapInvalidateSize({ watchKey }) {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        // ignore
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [map, watchKey]);
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

function MapMarker({ valid, lat, lng }) {
  if (!valid) return null;
  return (
    <CircleMarker
      center={[lat, lng]}
      radius={10}
      pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.85, weight: 3 }}
    />
  );
}

function ReadOnlyPreviewMap({ center, zoom, valid, latNum, lngNum, watchKey }) {
  return (
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
      <MapInvalidateSize watchKey={watchKey} />
      <MapTools center={center} zoom={zoom} />
      <MapMarker valid={valid} lat={latNum} lng={lngNum} />
    </MapContainer>
  );
}

function EditableModalMap({ center, zoom, valid, latNum, lngNum, onPick, watchKey }) {
  return (
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
      <MapInvalidateSize watchKey={watchKey} />
      <MapClickPicker onPick={onPick} enabled />
      <MapTools center={center} zoom={zoom} />
      <MapMarker valid={valid} lat={latNum} lng={lngNum} />
    </MapContainer>
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
  onLatChange,
  onLngChange,
  onGeocode,
  onSave,
  onSaveNext,
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
  const previewZoom = valid ? PREVIEW_ZOOM : EMPTY_ZOOM;
  const pickerZoom = valid ? PICKER_ZOOM : EMPTY_ZOOM;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftLat, setDraftLat] = useState(valid ? latNum : null);
  const [draftLng, setDraftLng] = useState(valid ? lngNum : null);


  const draftValid = draftLat != null && draftLng != null;
  const draftCenter = useMemo(
    () => (draftValid ? [draftLat, draftLng] : center),
    [draftValid, draftLat, draftLng, center]
  );

  function openPicker() {
    setDraftLat(valid ? latNum : null);
    setDraftLng(valid ? lngNum : null);
    setPickerOpen(true);
  }

  function applyDraftAndClose() {
    if (!draftValid) return;
    onPick && onPick(draftLat, draftLng);
    setPickerOpen(false);
  }

  return (
    <>
      <div className="card" style={{ minHeight: 640 }}>
        <div className="topbar">
          <div>
            <div className="title">{title || "Konum seçici"}</div>
            <div className="muted">{subtitle || "Adresi yaz, adresten bul ya da büyük haritada işaretleyip kaydet."}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Seçili kayıt: <b>{selectedName || "-"}</b>
            </div>
          </div>
          <div className="muted" style={{ textAlign: "right" }}>
            <div>
              Durum: <b>{statusLabel || "-"}</b>
            </div>
            <div style={{ marginTop: 4 }}>{reasonLabel || "Neden yok"}</div>
          </div>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <div className="muted">Adres</div>
          <input
            value={address}
            onChange={(e) => onAddressChange && onAddressChange(e.target.value)}
            placeholder="Adres gir veya büyük haritada işaretle"
            disabled={busy}
          />
        </div>

        <div className="fieldRow" style={{ marginTop: 12 }}>
          <div className="field">
            <div className="muted">Lat</div>
            <input
              type="number"
              step="0.000001"
              value={lat ?? ""}
              onChange={(e) => onLatChange && onLatChange(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="field">
            <div className="muted">Lng</div>
            <input
              type="number"
              step="0.000001"
              value={lng ?? ""}
              onChange={(e) => onLngChange && onLngChange(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>

        <div className="actionsRow" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn sm" onClick={onGeocode} disabled={busy || geoBusy || !String(address || "").trim()}>
            {geoBusy ? "Bulunuyor..." : "Adresten Bul"}
          </button>
          <button type="button" className="btn sm primary" onClick={openPicker} disabled={busy}>
            Büyük Haritada İşaretle
          </button>
          <button type="button" className="btn sm ghost" onClick={onClear} disabled={busy}>
            Konumu Temizle
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            height: 290,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,.18)",
            background: "rgba(15,23,42,.18)",
            position: "relative",
          }}
        >
          <ReadOnlyPreviewMap
            center={center}
            zoom={previewZoom}
            valid={valid}
            latNum={latNum}
            lngNum={lngNum}
            watchKey={`${latNum ?? "x"}:${lngNum ?? "x"}`}
          />
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          Küçük harita sadece önizleme içindir. Noktayı rahat seçmek için "Büyük Haritada İşaretle" butonunu kullan. İşaretleme sonrası OK ile kapanır, seçilen konum küçük haritada görünmeye devam eder.
        </div>

        <div className="actionsRow" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn sm" onClick={onSave} disabled={busy}>
            {busy ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <button type="button" className="btn sm" onClick={onSaveNext} disabled={busy}>
            {busy ? "..." : "Kaydet + Sonraki"}
          </button>
          <button type="button" className="btn sm primary" onClick={onMarkOk} disabled={busy || !valid}>
            {busy ? "..." : "OK Yap"}
          </button>
        </div>
      </div>

      {pickerOpen ? (
        <div className="modal-backdrop" style={{ padding: 20 }}>
          <div className="modal" style={{ maxWidth: 1180, borderRadius: 18, border: "1px solid #22314f", background: "#121a2a", padding: 16 }}>
            <div className="topbar" style={{ alignItems: "flex-start", gap: 12 }}>
              <div>
                <div className="title">Büyük Haritada Konum İşaretle</div>
                <div className="muted">Haritada tıkla, pimi yerleştir. Sonra OK ile seçimi uygula.</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Seçili kayıt: <b>{selectedName || "-"}</b>
                </div>
              </div>
              <div className="muted" style={{ textAlign: "right" }}>
                <div>Lat: <b>{draftValid ? draftLat.toFixed(6) : "-"}</b></div>
                <div style={{ marginTop: 4 }}>Lng: <b>{draftValid ? draftLng.toFixed(6) : "-"}</b></div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                height: "70vh",
                minHeight: 520,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(148,163,184,.18)",
                background: "rgba(15,23,42,.18)",
                position: "relative",
              }}
            >
              <EditableModalMap
                center={draftCenter}
                zoom={pickerZoom}
                valid={draftValid}
                latNum={draftLat}
                lngNum={draftLng}
                onPick={(nextLat, nextLng) => {
                  setDraftLat(Number(nextLat.toFixed(6)));
                  setDraftLng(Number(nextLng.toFixed(6)));
                }}
                watchKey={`${pickerOpen}:${draftLat ?? "x"}:${draftLng ?? "x"}`}
              />
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              İpucu: Kaydır-zoom yap, doğru noktaya tıkla. OK dediğinde seçtiğin koordinat ana forma aktarılır; sonra normal Kaydet ile veritabanına yazılır.
            </div>

            <div className="actionsRow" style={{ marginTop: 14, justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div className="muted">İstersen küçük formdaki lat/lng alanlarını sonra elle de düzeltebilirsin.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn sm" onClick={() => setPickerOpen(false)}>
                  İptal
                </button>
                <button type="button" className="btn sm primary" onClick={applyDraftAndClose} disabled={!draftValid}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
