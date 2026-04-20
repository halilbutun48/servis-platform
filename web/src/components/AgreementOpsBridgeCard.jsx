import { toHHMM, weekMaskToText } from "../utils/agreementUi";
import { agreementStatusText } from "../utils/agreementLabels";

function trDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgreementOpsBridgeCard({
  agreement,
  room = null,
  bridge,
  onOpenShift,
  onOpenPreview,
  emptyText = "Bu sözleşmeye bağlı üretilmiş vardiya henüz yok.",
}) {
  if (!agreement) return null;
  const generatedCount = Number(bridge?.generatedCount || 0);
  const lastShift = bridge?.lastShift || null;
  const vehicleLabel = bridge?.agreementVehicle?.plate || lastShift?.vehicle?.plate || (agreement?.vehicleId ? `#${agreement.vehicleId}` : "-");
  const driverLabel = bridge?.agreementDriver?.fullName || lastShift?.driver?.fullName || (agreement?.driverId ? `#${agreement.driverId}` : "-");
  const hubText = typeof agreement?.hubLat === "number" && typeof agreement?.hubLng === "number"
    ? `${agreement.hubLat.toFixed(4)}, ${agreement.hubLng.toFixed(4)}`
    : (typeof bridge?.plan?.hubLat === "number" && typeof bridge?.plan?.hubLng === "number"
      ? `${bridge.plan.hubLat.toFixed(4)}, ${bridge.plan.hubLng.toFixed(4)}`
      : "-");
  const contextText = room?.name || (room?.id ? `Oda #${room.id}` : agreementStatusText(agreement?.status));

  return (
    <div className="card" style={{ border: "1px solid rgba(88,166,255,.28)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>Operasyon Köprüsü</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {contextText} • {String(agreement?.direction || bridge?.plan?.direction || "-").toUpperCase()} / {String(agreement?.pattern || bridge?.plan?.pattern || "-").toUpperCase()}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill" title="Bu sözleşmeden üretilen toplam vardiya">Üretilen vardiya: {generatedCount}</span>
          <span className="pill" title="Sözleşme saat penceresi">{toHHMM(agreement?.startMin)} → {toHHMM(agreement?.endMin)}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div><div className="muted">Araç</div><div style={{ fontWeight: 800 }}>{vehicleLabel}</div></div>
        <div><div className="muted">Sürücü</div><div style={{ fontWeight: 800 }}>{driverLabel}</div></div>
        <div><div className="muted">Hub</div><div style={{ fontWeight: 800 }}>{hubText}</div></div>
        <div><div className="muted">Plan</div><div style={{ fontWeight: 800 }}>{weekMaskToText(agreement?.weekMask) || "-"}</div></div>
      </div>

      {lastShift ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Son üretilen vardiya #{lastShift.id}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {String(lastShift.status || "-").toUpperCase()} • {trDateTime(lastShift.startAt)} → {trDateTime(lastShift.endAt)}
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={() => onOpenShift?.(lastShift.id)}>Vardiyaya Git</button>
              <button type="button" className="btn" disabled={!lastShift?.previewAvailable && !lastShift?.id} onClick={() => onOpenPreview?.(lastShift.id)}>Rota Önizleme</button>
            </div>
          </div>
          <div className="muted" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
            <div>Durak: <b>{Number(lastShift.stopCount || 0)}</b></div>
            <div>Personel: <b>{Number(lastShift.peopleCount || 0)}</b></div>
            <div>Mesafe: <b>{lastShift.routeSnapshotDistanceM ? `${Math.round(Number(lastShift.routeSnapshotDistanceM) / 1000)} km` : "-"}</b></div>
            <div>Süre: <b>{lastShift.routeSnapshotDurationSec ? `${Math.round(Number(lastShift.routeSnapshotDurationSec) / 60)} dk` : "-"}</b></div>
          </div>
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 12 }}>{emptyText}</div>
      )}
    </div>
  );
}
