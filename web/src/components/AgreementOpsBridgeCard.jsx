import { useState } from "react";
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

function SummaryChip({ label, value, tone = "default" }) {
  const palette = tone === "good"
    ? { border: "1px solid rgba(18,183,106,0.35)", background: "rgba(18,183,106,0.10)", color: "#d1fadf" }
    : tone === "warn"
      ? { border: "1px solid rgba(247,144,9,0.35)", background: "rgba(247,144,9,0.10)", color: "#fedf89" }
      : { border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#d0d5dd" };

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        ...palette,
      }}
    >
      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 800, lineHeight: 1.35 }}>{value}</div>
    </div>
  );
}

export default function AgreementOpsBridgeCard({
  agreement,
  room = null,
  bridge,
  onOpenShift,
  onOpenPreview,
  emptyText = "Bu sözleşmeye bağlı üretilmiş vardiya henüz yok.",
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!agreement) return null;

  const generatedCount = Number(bridge?.generatedCount || 0);
  const lastShift = bridge?.lastShift || null;
  const hasLastShift = Boolean(lastShift?.id);
  const vehicleLabel = bridge?.agreementVehicle?.plate || lastShift?.vehicle?.plate || (agreement?.vehicleId ? `#${agreement.vehicleId}` : "-");
  const driverLabel = bridge?.agreementDriver?.fullName || lastShift?.driver?.fullName || (agreement?.driverId ? `#${agreement.driverId}` : "-");
  const hubText = typeof agreement?.hubLat === "number" && typeof agreement?.hubLng === "number"
    ? `${agreement.hubLat.toFixed(4)}, ${agreement.hubLng.toFixed(4)}`
    : (typeof bridge?.plan?.hubLat === "number" && typeof bridge?.plan?.hubLng === "number"
      ? `${bridge.plan.hubLat.toFixed(4)}, ${bridge.plan.hubLng.toFixed(4)}`
      : "-");
  const contextText = room?.name || (room?.id ? `Oda #${room.id}` : agreementStatusText(agreement?.status));
  const agreementStatus = agreementStatusText(agreement?.status);
  const routeStateLabel = hasLastShift ? "Operasyona ulaştı" : generatedCount > 0 ? "Taslak bekliyor" : "Sadece önizleme";
  const riskLabel = hasLastShift ? "Düşük" : "Bilgi eksik";
  const nextActionLabel = hasLastShift ? "Operasyon kaydını aç" : "Eksikleri tamamla";
  const summarySentence = hasLastShift
    ? `Son vardiya hazır. ${vehicleLabel !== "-" ? `Araç ${vehicleLabel}.` : ""}${driverLabel !== "-" ? ` Sürücü ${driverLabel}.` : ""}`
    : emptyText;

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
          <span className="pill" title="Sözleşme statüsü">{agreementStatus}</span>
          <span className="pill" title="Bu sözleşmeden üretilen toplam vardiya">Üretilen vardiya: {generatedCount}</span>
          <span className="pill" title="Sözleşme saat penceresi">{toHHMM(agreement?.startMin)} → {toHHMM(agreement?.endMin)}</span>
        </div>
      </div>

      <div style={{ marginTop: 10, fontWeight: 800, lineHeight: 1.45 }}>
        <div className="muted" style={{ marginBottom: 4, fontSize: 12, letterSpacing: 0.2 }}>
          Kısa karar
        </div>
        {hasLastShift ? "Bu bağlantı operasyona ulaştı." : "Bu bağlantı için henüz vardiya üretilmedi."}
      </div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        {summarySentence}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12 }}>
        <SummaryChip label="Durum" value={routeStateLabel} tone={hasLastShift ? "good" : "warn"} />
        <SummaryChip label="Etki" value={generatedCount ? `${generatedCount} vardiya` : "Henüz yok"} />
        <SummaryChip label="Risk" value={riskLabel} tone={hasLastShift ? "good" : "warn"} />
        <SummaryChip label="Sıradaki işlem" value={nextActionLabel} tone={hasLastShift ? "good" : "warn"} />
      </div>

      <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (hasLastShift) {
              onOpenShift?.(lastShift.id);
              return;
            }
            setDetailsOpen(true);
          }}
        >
          {hasLastShift ? "Operasyon kaydını aç" : "Eksikleri tamamla"}
        </button>
        <button type="button" className="btn ghost" onClick={() => setDetailsOpen((v) => !v)}>
          {detailsOpen ? "Detayı kapat" : "Detayı aç"}
        </button>
      </div>

      {detailsOpen ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div>
              <div className="muted">Araç</div>
              <div style={{ fontWeight: 800 }}>{vehicleLabel}</div>
            </div>
            <div>
              <div className="muted">Sürücü</div>
              <div style={{ fontWeight: 800 }}>{driverLabel}</div>
            </div>
            <div>
              <div className="muted">Toplanma Konumu</div>
              <div style={{ fontWeight: 800 }}>{hubText}</div>
            </div>
            <div>
              <div className="muted">Plan</div>
              <div style={{ fontWeight: 800 }}>{weekMaskToText(agreement?.weekMask) || "-"}</div>
            </div>
          </div>

          {hasLastShift ? (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Son üretilen vardiya #{lastShift.id}</div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {String(lastShift.status || "-").toUpperCase()} • {trDateTime(lastShift.startAt)} → {trDateTime(lastShift.endAt)}
                  </div>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn" onClick={() => onOpenShift?.(lastShift.id)}>Vardiyaya git</button>
                  <button type="button" className="btn" disabled={!lastShift?.previewAvailable && !lastShift?.id} onClick={() => onOpenPreview?.(lastShift.id)}>Rota önizleme</button>
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
      ) : null}
    </div>
  );
}
