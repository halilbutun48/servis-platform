import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDateTimeTR } from "../utils/time";

const REASON_LABELS = new Map([
  ["VEHICLE_BREAKDOWN", "Araç arızası"],
  ["DRIVER_SICKNESS", "Sürücü rahatsızlığı"],
  ["DRIVER_UNAVAILABLE", "Sürücü uygun değil"],
  ["VEHICLE_UNAVAILABLE", "Araç uygun değil"],
  ["TRAFFIC_INCIDENT", "Trafik / yol durumu"],
  ["OPERATIONAL_NEED", "Operasyon ihtiyacı"],
  ["OTHER", "Diğer"],
]);

function eventTitle(action) {
  const a = String(action || "").toUpperCase();
  if (a === "SHIFT_APPROVE") return "İlk atama / onay";
  if (a === "SHIFT_ASSIGN") return "Atama";
  if (a === "SHIFT_REASSIGN") return "Operasyonel atama değişikliği";
  return action || "İşlem";
}

function actorLine(item) {
  if (item?.actorLabel) return item.actorLabel;
  if (item?.actorRole && item?.actorUserId) return `${item.actorRole} #${item.actorUserId}`;
  if (item?.actorRole) return item.actorRole;
  return "Sistem";
}

function pairLine(label, info) {
  const vehicle = info?.vehiclePlate || (info?.vehicleId ? `#${info.vehicleId}` : "-");
  const driver = info?.driverName || (info?.driverId ? `#${info.driverId}` : "-");
  return (
    <div className="muted" style={{ display: "grid", gap: 4 }}>
      <div><b>{label}</b></div>
      <div>Araç: {vehicle}</div>
      <div>Sürücü: {driver}</div>
    </div>
  );
}

function reasonLabel(reason) {
  const key = String(reason || "").trim().toUpperCase();
  return REASON_LABELS.get(key) || reason || "-";
}

export default function ShiftOperationEventsModal({ open, onClose, shiftId, subtitle = "" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open || !shiftId) return;
    let dead = false;
    (async () => {
      setBusy(true);
      setErr("");
      try {
        const data = await api(`/api/shifts/${shiftId}/operation-events`);
        if (dead) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (dead) return;
        setErr(String(e?.message || e));
      } finally {
        if (!dead) setBusy(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [open, shiftId]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900 }}>Shift #{shiftId} — Operasyon Akışı</div>
            {subtitle ? <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{subtitle}</div> : null}
            <div className="muted" style={{ marginTop: 4 }}>
              Sürücü / araç değişiklikleri burada görünür. Bu alan ticari pazarlık değil, operasyon kaydıdır.
            </div>
          </div>
          <button type="button" className="btn sm" onClick={onClose}>Kapat</button>
        </div>

        <hr />

        {busy ? <div className="muted">Yükleniyor...</div> : null}
        {err ? <div className="card err">{err}</div> : null}

        {!busy && !err ? (
          items.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((item) => (
                <div key={item.id} className="card" style={{ marginTop: 0 }}>
                  <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>{eventTitle(item.action)}</div>
                    <span className="muted">{formatDateTimeTR(item.at)}</span>
                  </div>

                  <div className="muted" style={{ marginTop: 6 }}>
                    Yapan: <b>{actorLine(item)}</b>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    {item?.meta?.from ? pairLine("Önce", item.meta.from) : null}
                    {item?.meta?.to ? pairLine("Sonra", item.meta.to) : null}
                  </div>

                  {item?.meta?.reason ? (
                    <div style={{ marginTop: 10 }}>
                      <b>Neden:</b> {reasonLabel(item.meta.reason)}
                    </div>
                  ) : null}
                  {item?.meta?.note ? (
                    <div className="muted" style={{ marginTop: 6 }}>
                      Not: {item.meta.note}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">Henüz operasyon değişikliği kaydı yok.</div>
          )
        ) : null}
      </div>
    </div>
  );
}
