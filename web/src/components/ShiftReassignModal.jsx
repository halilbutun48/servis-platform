import { useMemo, useState } from "react";

const REASONS = [
  ["VEHICLE_BREAKDOWN", "Araç arızası"],
  ["VEHICLE_UNAVAILABLE", "Araç kullanılamıyor"],
  ["DRIVER_SICK", "Sürücü hastalandı"],
  ["DRIVER_UNAVAILABLE", "Sürücü müsait değil"],
  ["OPS_REALLOCATION", "Operasyon yeniden planlandı"],
  ["OTHER", "Diğer"],
];

function ShiftReassignModalBody({ shift, subtitle = "", vehicles, drivers, busy, onClose, onSubmit }) {
  const [vehicleId, setVehicleId] = useState(() => (shift?.vehicleId ? String(shift.vehicleId) : ""));
  const [driverId, setDriverId] = useState(() => (shift?.driverId ? String(shift.driverId) : ""));
  const [reason, setReason] = useState("VEHICLE_BREAKDOWN");
  const [note, setNote] = useState("");

  const currentVehicle = useMemo(() => vehicles.find((v) => Number(v.id) === Number(shift?.vehicleId)) || null, [vehicles, shift]);
  const currentDriver = useMemo(() => drivers.find((d) => Number(d.id) === Number(shift?.driverId)) || null, [drivers, shift]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900 }}>Shift #{shift.id} — Operasyonel Atama Değişikliği</div>
            {subtitle ? <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{subtitle}</div> : null}
            <div className="muted" style={{ marginTop: 4 }}>
              Bu işlem ticari pazarlık değildir. Yeni araç / sürücü ataması yapılır, rota / görev paketi yenilenir ve company operasyon kaydında görünür.
            </div>
          </div>
          <button type="button" className="btn sm" disabled={busy} onClick={onClose}>Kapat</button>
        </div>

        <hr />

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="card" style={{ marginTop: 0 }}>
            <div style={{ fontWeight: 800 }}>Mevcut Atama</div>
            <div className="muted" style={{ marginTop: 8 }}>Araç: {currentVehicle?.plate || (shift?.vehicleId ? `#${shift.vehicleId}` : "-")}</div>
            <div className="muted">Sürücü: {currentDriver?.fullName || (shift?.driverId ? `#${shift.driverId}` : "-")}</div>
          </div>

          <div className="card" style={{ marginTop: 0 }}>
            <div style={{ fontWeight: 800 }}>Yeni Atama</div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <label className="muted">Araç</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Araç seç</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate || `#${v.id}`}</option>
                ))}
              </select>
              <label className="muted">Sürücü</label>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">Sürücü seç</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName || `#${d.id}`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <label className="muted">Neden</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <label className="muted">Not (opsiyonel)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. araç arıza yaptığı için yedek araç atandı" />
        </div>

        <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button type="button" className="btn" disabled={busy} onClick={onClose}>İptal</button>
          <button
            type="button"
            className="btn primary"
            disabled={busy || !vehicleId || !driverId}
            onClick={() => onSubmit?.({ vehicleId: Number(vehicleId), driverId: Number(driverId), reason, note })}
          >
            {busy ? "..." : "Değişikliği Kaydet ve Paketi Yenile"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftReassignModal({ open, shift, subtitle = "", vehicles = [], drivers = [], busy = false, onClose, onSubmit }) {
  if (!open || !shift) return null;

  const modalKey = `${shift.id || "new"}:${shift.vehicleId || "none"}:${shift.driverId || "none"}`;

  return (
    <ShiftReassignModalBody
      key={modalKey}
      shift={shift}
      subtitle={subtitle}
      vehicles={vehicles}
      drivers={drivers}
      busy={busy}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
