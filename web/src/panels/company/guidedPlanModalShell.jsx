import { useMapEvents } from "react-leaflet";

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
