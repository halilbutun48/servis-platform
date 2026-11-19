import { useState } from "react";
import { toHHMM, weekMaskToText } from "../utils/agreementUi";
import { agreementStatusText } from "../utils/agreementLabels";
import { getEffectiveRouteMetrics, formatKm, formatDuration } from "../utils/routePreviewSummary";

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
  initialDetailsOpen = false,
  showPrimaryAction = true,
  compact = false,
  onPrimaryAction,
  onSyncOperation,
}) {
  const [detailsOpen, setDetailsOpen] = useState(() => Boolean(initialDetailsOpen));
  const [stagesOpen, setStagesOpen] = useState(false);

  if (!agreement) return null;

  const generatedCount = Number(bridge?.generatedCount || 0);
  const lastShift = bridge?.lastShift || null;
  const hasLastShift = Boolean(lastShift?.id);
  const lastShiftRouteMetrics = getEffectiveRouteMetrics({
    routeSnapshotDistanceM: lastShift?.routeSnapshotDistanceM,
    routeSnapshotDurationSec: lastShift?.routeSnapshotDurationSec,
    routeSnapshotInputHash: lastShift?.routeSnapshotInputHash,
  }, "SNAPSHOT");
  const vehicleLabel = bridge?.agreementVehicle?.plate || lastShift?.vehicle?.plate || "-";
  const driverLabel = bridge?.agreementDriver?.fullName || lastShift?.driver?.fullName || "-";
  const evidencePlan = bridge?.operationEvidencePlan || null;
  const evidencePrimaryAction = evidencePlan?.primaryAction || null;
  const hubText = typeof agreement?.hubLat === "number" && typeof agreement?.hubLng === "number"
    ? `${agreement.hubLat.toFixed(4)}, ${agreement.hubLng.toFixed(4)}`
    : (typeof bridge?.plan?.hubLat === "number" && typeof bridge?.plan?.hubLng === "number"
      ? `${bridge.plan.hubLat.toFixed(4)}, ${bridge.plan.hubLng.toFixed(4)}`
      : "-");
  const contextText = room?.name || agreementStatusText(agreement?.status);
  const agreementStatus = agreementStatusText(agreement?.status);
  const agreementStatusCode = String(agreement?.status || "").toUpperCase();
  const canPrepareOperation = !hasLastShift && ["APPROVED", "ACTIVE"].includes(agreementStatusCode);
  const routeStateLabel = hasLastShift ? "Operasyona ulaştı" : generatedCount > 0 ? "Taslak bekliyor" : compact ? "Vardiya yok" : "Sadece önizleme";
  const riskLabel = hasLastShift ? "Düşük" : compact ? "Kanıt oluşamaz" : "Bilgi eksik";
  const nextActionLabel = hasLastShift ? "Operasyon kaydını aç" : "Taslağı incele";
  const summarySentence = hasLastShift
    ? `Son vardiya hazır. ${vehicleLabel !== "-" ? `Araç ${vehicleLabel}.` : ""}${driverLabel !== "-" ? ` Sürücü ${driverLabel}.` : ""}`
    : generatedCount > 0
      ? "Taslak hazır. Taslağı inceleyip eksik alanları kontrol edebilirsin. Eksikleri tamamla."
      : compact
        ? "Bu sözleşmeye bağlı vardiya yok. Gerçek operasyon kaydı oluştuğunda kanıt burada görünür."
        : emptyText || "Bu bağlantı için henüz vardiya üretilmedi. Taslak detayını görmek için detayı aç.";

  return (
    <div className="card" data-role="agreement-ops-bridge-card" style={{ border: "1px solid rgba(88,166,255,.28)" }}>
      {!compact ? <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn ghost roomActionCTA"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-label={detailsOpen ? "Detayı gizle" : "Detayı aç"}
          title={detailsOpen ? "Detayı gizle" : "Detayı aç"}
        >
          {detailsOpen ? "Ayrıntıları gizle" : "Ayrıntıları göster"}
        </button>
      </div> : null}

      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>{compact ? "Operasyon bağlantısı" : "Operasyon Köprüsü"}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {contextText} • {String(agreement?.direction || bridge?.plan?.direction || "-").toUpperCase() === "INBOUND" ? "Gidiş" : String(agreement?.direction || bridge?.plan?.direction || "-").toUpperCase() === "OUTBOUND" ? "Dönüş" : "Yön bilgisi yok"} / {String(agreement?.pattern || bridge?.plan?.pattern || "-").toUpperCase() === "ONE_WAY" ? "Tek yön" : String(agreement?.pattern || bridge?.plan?.pattern || "-").toUpperCase() === "ROUND_TRIP" ? "Gidiş-dönüş" : "Plan bilgisi yok"}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill" title="Sözleşme statüsü">{agreementStatus}</span>
          <span className="pill" title="Bu sözleşmeden üretilen toplam vardiya">Üretilen vardiya: {generatedCount}</span>
          <span className="pill" title="Sözleşme saat penceresi">{toHHMM(agreement?.startMin)} → {toHHMM(agreement?.endMin)}</span>
        </div>
      </div>

      {!compact && detailsOpen ? (
        <div className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 12, fontWeight: 800 }}>
          Detayı kapat
        </div>
      ) : null}

      <div style={{ marginTop: 10, fontWeight: 800, lineHeight: 1.45 }}>
        <div className="muted" style={{ marginBottom: 4, fontSize: 12, letterSpacing: 0.2 }}>
          Kısa karar
        </div>
        {hasLastShift ? "Bu bağlantı operasyona ulaştı." : "Bu bağlantı için henüz vardiya üretilmedi."}
      </div>
      {evidencePlan ? (
        <div
          data-role="agreement-operation-evidence-plan"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: evidencePlan.sourceContext?.statusKey === "CONTEXT_MISMATCH"
              ? "1px solid rgba(247,144,9,.42)"
              : "1px solid rgba(88,166,255,.28)",
            background: evidencePlan.sourceContext?.statusKey === "CONTEXT_MISMATCH"
              ? "rgba(247,144,9,.07)"
              : "rgba(88,166,255,.06)",
          }}
        >
          <div style={{ fontWeight: 900 }}>Operasyon kanıtı durumu</div>
          <div style={{ marginTop: 4, fontWeight: 800 }}>{evidencePlan.statusLabel}</div>
          {evidencePlan.missing ? (
            <div className="muted" style={{ marginTop: 6 }}><b>Eksik:</b> {evidencePlan.missing}</div>
          ) : null}
          {evidencePlan.why ? (
            <div className="muted" style={{ marginTop: 4 }}><b>Neden:</b> {evidencePlan.why}</div>
          ) : null}
          <div className="muted" style={{ marginTop: 4 }}>
            <b>Sorumlu rol:</b> {evidencePlan.responsibleRole || "-"} · <b>Ekran:</b> {evidencePlan.screen || "-"}
          </div>
          {evidencePlan.sourceContext?.statusKey === "CONTEXT_MISMATCH" ? (
            <div className="muted" style={{ marginTop: 8, color: "#fedf89" }}>
              <b>Başlangıç kaydı uyarısı:</b> {evidencePlan.sourceContext.reason}
            </div>
          ) : null}
          {evidencePrimaryAction?.label && typeof onPrimaryAction === "function" && evidencePrimaryAction.key === "ACCEPT_AGREEMENT" ? (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn sm primary roomActionCTA"
                onClick={() => onPrimaryAction?.(agreement, evidencePrimaryAction)}
              >
                {evidencePrimaryAction.label}
              </button>
              <div className="muted" style={{ marginTop: 5, fontSize: 12 }}>
                Bu düğme yalnız kabul akışını açar; açık onay verilmeden kayıt gönderilmez ve operasyon kanıtı oluşturulmaz.
              </div>
            </div>
          ) : null}
          {canPrepareOperation && typeof onSyncOperation === "function" ? (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn sm primary roomActionCTA"
                data-testid={`agreement-operation-sync-${agreement.id}`}
                onClick={() => onSyncOperation?.(agreement)}
              >
                Operasyon vardiyasını hazırla
              </button>
              <div className="muted" style={{ marginTop: 5, fontSize: 12 }}>
                Kaynak vardiya korunur; kabul edilmiş sözleşmeye bağlı operasyon vardiyası hazırlanır.
              </div>
            </div>
          ) : null}
          {Array.isArray(evidencePlan.stages) && evidencePlan.stages.length ? (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setStagesOpen((value) => !value)}
                aria-expanded={stagesOpen}
              >
                {stagesOpen ? "Tamamlanma adımlarını gizle" : "Tamamlanma adımlarını gör"}
              </button>
              {stagesOpen ? (
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {evidencePlan.stages.map((item) => (
                    <div key={item.key} style={{ padding: 9, borderRadius: 9, background: "rgba(255,255,255,.04)" }}>
                      <div style={{ fontWeight: 800 }}>{item.label} · {item.statusLabel}</div>
                      {item.missing ? <div className="muted" style={{ marginTop: 3 }}><b>Eksik:</b> {item.missing}</div> : null}
                      {item.why ? <div className="muted" style={{ marginTop: 3 }}><b>Neden:</b> {item.why}</div> : null}
                      <div className="muted" style={{ marginTop: 3 }}>{item.responsibleRole} · {item.screen}{item.action ? ` · ${item.action}` : ""}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        {summarySentence}
      </div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        {compact ? "Sadece önizleme — ödeme, fatura veya muhasebe kaydı başlatmaz." : "Bu alan önizlemedir; işlem başlatmaz."}
      </div>
      {!compact ? <>
        <div className="muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
          Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.
        </div>
        <div className="muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
          Sadece önizleme — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.
        </div>
        <div className="muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
          Sadece önizleme — tahsilat/fatura oluşturulmaz.
        </div>
      </> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12 }}>
        <SummaryChip label="Durum" value={routeStateLabel} tone={hasLastShift ? "good" : "warn"} />
        <SummaryChip label="Etki" value={generatedCount ? `${generatedCount} vardiya` : "Henüz yok"} />
        <SummaryChip label="Denge" value={riskLabel} tone={hasLastShift ? "good" : "warn"} />
        {!compact ? <SummaryChip label="Sıradaki işlem" value={nextActionLabel} tone={hasLastShift ? "good" : "warn"} /> : null}
      </div>

      {!compact ? <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn sm primary roomActionCTA"
          onClick={() => setDetailsOpen(true)}
        >
          Detayları göster
        </button>
        {showPrimaryAction ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (hasLastShift) {
                onOpenShift?.(lastShift.id);
                return;
              }
              setDetailsOpen(true);
            }}
          >
            {nextActionLabel}
          </button>
        ) : null}
      </div> : null}

      {compact || detailsOpen ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          {compact && !hasLastShift && generatedCount <= 0 ? null : (
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
          )}

          {hasLastShift ? (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Son üretilen vardiya</div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {agreementStatusText(lastShift.status)} • {trDateTime(lastShift.startAt)} → {trDateTime(lastShift.endAt)}
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
                <div>Mesafe: <b>{lastShiftRouteMetrics.status === "UNKNOWN" ? "Mesafe henüz hesaplanmadı" : formatKm(Number(lastShift.routeSnapshotDistanceM))}</b></div>
                <div>Süre: <b>{lastShiftRouteMetrics.status === "UNKNOWN" ? "Süre henüz hesaplanmadı" : formatDuration(Number(lastShift.routeSnapshotDurationSec))}</b></div>
              </div>
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 12 }}>{compact ? "Bu sözleşmeye bağlı vardiya bulunamadı." : emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
