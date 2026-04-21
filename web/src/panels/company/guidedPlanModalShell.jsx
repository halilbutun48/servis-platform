import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

export function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 60,
        padding: 16,
        overflow: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="card"
        style={{
          width: "min(1680px, calc(100vw - 12px))",
          maxWidth: "min(1680px, calc(100vw - 12px))",
          height: "min(95vh, 1080px)",
          maxHeight: "min(95vh, 1080px)",
          margin: "6px auto",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function MapPickEvents({ onPick }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng?.lat, e.latlng?.lng);
    },
  });
  return null;
}

export function MapPointPickerModal({
  open,
  onClose,
  mapPickPoint,
  setMapPickPoint,
  fmtCoord,
  applyDestinationMapPoint,
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>Haritadan nokta seç</div>
        <div className="muted">Haritada bir noktaya tıkla. Seçilen koordinat ilgili yer kartına yazılır.</div>
        <div style={{ height: 360, width: "100%", border: "1px solid #223", borderRadius: 12, overflow: "hidden" }}>
          {Array.isArray(mapPickPoint) ? (
            <MapContainer center={mapPickPoint} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapPickEvents onPick={(lat, lng) => setMapPickPoint([lat, lng])} />
              <CircleMarker center={mapPickPoint} radius={9} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.7 }} />
            </MapContainer>
          ) : null}
        </div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="muted">Lat</label>
            <input value={fmtCoord(mapPickPoint?.[0])} readOnly />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="muted">Lng</label>
            <input value={fmtCoord(mapPickPoint?.[1])} readOnly />
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={onClose}>Vazgeç</button>
          <button type="button" onClick={applyDestinationMapPoint} disabled={!Array.isArray(mapPickPoint)}>
            Bu noktayı kullan
          </button>
        </div>
      </div>
    </Modal>
  );
}
