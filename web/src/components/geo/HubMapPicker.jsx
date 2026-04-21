import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import "../map/mapShell.css";

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

function PreviewMap({ center, zoom, valid, latNum, lngNum, watchKey }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={PICKER_MIN_ZOOM}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom
    >
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={PICKER_MAX_ZOOM} />
      <ZoomControl position="bottomright" />
      <MapCenterSync center={center} zoom={zoom} />
      <MapInvalidateSize watchKey={watchKey} />
      <MapTools center={center} zoom={zoom} />
      <MapMarker valid={valid} lat={latNum} lng={lngNum} />
    </MapContainer>
  );
}

function EditableMap({ center, zoom, valid, latNum, lngNum, onPick, watchKey }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={PICKER_MIN_ZOOM}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom
    >
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={PICKER_MAX_ZOOM} />
      <ZoomControl position="bottomright" />
      <MapCenterSync center={center} zoom={zoom} />
      <MapInvalidateSize watchKey={watchKey} />
      <MapClickPicker onPick={onPick} enabled />
      <MapTools center={center} zoom={zoom} />
      <MapMarker valid={valid} lat={latNum} lng={lngNum} />
    </MapContainer>
  );
}

export default function HubMapPicker({
  lat,
  lng,
  onPick,
  busy = false,
  title = "Büyük Haritada İşaretle",
  subjectLabel = "Hub",
  previewHeight = 290,
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
  const draftCenter = useMemo(() => (draftValid ? [draftLat, draftLng] : center), [draftValid, draftLat, draftLng, center]);

  function openPicker() {
    setDraftLat(valid ? latNum : null);
    setDraftLng(valid ? lngNum : null);
    setPickerOpen(true);
  }

  function applyDraftAndClose() {
    if (!draftValid || !onPick) return;
    onPick(Number(draftLat.toFixed(6)), Number(draftLng.toFixed(6)));
    setPickerOpen(false);
  }

  return (
    <>
      <div className="toolbar" style={{ marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn sm primary" onClick={openPicker} disabled={busy}>
          {title}
        </button>
      </div>

      <div className="ms-mapwrap" style={{ marginTop: 12, height: previewHeight }}>
        <div className="ms-map">
          <PreviewMap
            center={center}
            zoom={previewZoom}
            valid={valid}
            latNum={latNum}
            lngNum={lngNum}
            watchKey={`${latNum ?? "x"}:${lngNum ?? "x"}`}
          />
        </div>
      </div>

      <div className="panelMeta" style={{ marginTop: 10 }}>
        Küçük harita önizleme içindir. Noktayı rahat seçmek için "{title}" butonunu kullan. OK dedikten sonra konum lat/lng alanına aktarılır; sonra normal Kaydet ile veritabanına yazılır.
      </div>

      {pickerOpen ? (
        <div className="modal-backdrop" style={{ padding: 20 }}>
          <div className="modal" style={{ maxWidth: 1180, borderRadius: 8, border: "1px solid #22314f", background: "#121a2a", padding: 16 }}>
            <div className="topbar" style={{ alignItems: "flex-start", gap: 12 }}>
              <div>
                <div className="panelTitle">{subjectLabel} için büyük haritada konum işaretle</div>
                <div className="panelSubtitle">Haritada tıkla, pimi yerleştir. Sonra OK ile seçimi ana forma uygula.</div>
              </div>
              <div className="muted" style={{ textAlign: "right" }}>
                <div className="panelMeta">Lat: <b>{draftValid ? draftLat.toFixed(6) : "-"}</b></div>
                <div className="panelMeta" style={{ marginTop: 4 }}>Lng: <b>{draftValid ? draftLng.toFixed(6) : "-"}</b></div>
              </div>
            </div>

            <div className="ms-mapwrap" style={{ marginTop: 12, height: "70vh", minHeight: 520 }}>
              <div className="ms-map">
                <EditableMap
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
            </div>

            <div className="panelMeta" style={{ marginTop: 10 }}>
              İpucu: Haritayı kaydır-zoom yap, doğru noktaya tıkla. OK dediğinde koordinat ana forma aktarılır. Ardından Kaydet ile işlemi tamamla.
            </div>

            <div className="actionsRow" style={{ marginTop: 14, justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div className="muted">İstersen ana ekranda lat/lng alanını elle de düzeltebilirsin.</div>
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
