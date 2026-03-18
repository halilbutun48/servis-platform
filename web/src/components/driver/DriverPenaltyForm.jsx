import { useState } from "react";

export default function DriverPenaltyForm({ driver, onSubmit, busy }) {
  const [durationDays, setDurationDays] = useState("1");
  const [reason, setReason] = useState("");
  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div><b>Gelmedi kaydı ekle</b> — {driver?.fullName}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "end" }}>
        <div>
          <label className="muted">Süre</label>
          <select value={durationDays} onChange={(e) => setDurationDays(e.target.value)} disabled={busy}>
            <option value="1">1 gün</option>
            <option value="3">3 gün</option>
            <option value="7">7 gün</option>
            <option value="14">14 gün</option>
          </select>
        </div>
        <div style={{ minWidth: 260 }}>
          <label className="muted">Neden</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Kısa açıklama" />
        </div>
        <button className="btn primary" disabled={busy} onClick={() => onSubmit({ durationDays: Number(durationDays), reason })}>Kaydet</button>
      </div>
    </div>
  );
}
