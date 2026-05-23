import { boardingChangePreviewKindLabel } from "./boardingChangeUi";

function formatNumber(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

function formatDelta(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${Number.isInteger(n) ? String(n) : n.toFixed(digits)}`;
}

function StatTile({ label, value, note }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div className="panelMeta" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 6 }}>{note}</div> : null}
    </div>
  );
}

export default function BoardingRouteImpactPreviewCard({ preview = null, title = "Rota etkisi önizlemesi" }) {
  if (!preview) {
    return (
      <div className="card" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="panelSectionTitle">{title}</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Önizleme seçilmedi.</div>
      </div>
    );
  }

  const changeTypeLabel = String(preview.changeTypeLabel || boardingChangePreviewKindLabel(preview.changeType) || "Biniş değişikliği önizlemesi");
  const capacity = preview.capacityImpact && typeof preview.capacityImpact === "object" ? preview.capacityImpact : {};
  const reliability = preview.reliability && typeof preview.reliability === "object" ? preview.reliability : {};
  const warnings = Array.isArray(preview.warnings) ? preview.warnings : [];
  const capacityAfter = capacity.availableAfter != null ? formatNumber(capacity.availableAfter) : "Bilinmiyor";
  const capacityBefore = capacity.availableBefore != null ? formatNumber(capacity.availableBefore) : "Bilinmiyor";
  const statusTone = reliability.ok === false ? "rgba(240, 68, 56, 0.22)" : "rgba(18, 183, 106, 0.18)";
  const borderTone = reliability.ok === false ? "rgba(240, 68, 56, 0.35)" : "rgba(18, 183, 106, 0.35)";

  return (
    <div className="card" style={{ borderColor: borderTone, background: statusTone }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">{title}</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>{String(preview.previewOnlyNote || "Bu sadece önizlemedir. Rota/atama uygulanmadı.")}</div>
        </div>
        <span className="pill" data-status={reliability.ok === false ? "WARN" : "OK"}>{changeTypeLabel}</span>
      </div>

      <div className="panelBody" style={{ marginTop: 12 }}>
        {String(preview.summaryLine || `${changeTypeLabel} · ${preview.personLabel || "Seçili kişi"}`)}
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatTile label="Etkilenen kişi" value={String(preview.personLabel || "-")} note={`Değişiklik: ${changeTypeLabel}`} />
        <StatTile label="Eski durak" value={String(preview.oldStopLabel || "-")} note={`Yeni/geçici durak: ${String(preview.newStopLabel || "-")}`} />
        <StatTile label="Kişi etkisi" value={`${formatNumber(preview.currentPeopleCount)} → ${formatNumber(preview.previewPeopleCount)}`} note={`Fark ${formatDelta(Number(preview.previewPeopleCount || 0) - Number(preview.currentPeopleCount || 0))}`} />
        <StatTile label="Durak etkisi" value={`${formatNumber(preview.currentStopCount)} → ${formatNumber(preview.previewStopCount)}`} note={`Fark ${formatDelta(Number(preview.previewStopCount || 0) - Number(preview.currentStopCount || 0))}`} />
        <StatTile label="Km etkisi" value={`${formatNumber(preview.currentDistanceKm, 2)} → ${formatNumber(preview.previewDistanceKm, 2)}`} note={`Fark ${formatDelta(preview.distanceDeltaKm, 2)} km`} />
        <StatTile label="Süre etkisi" value={`${formatNumber(preview.currentDurationMin)} → ${formatNumber(preview.previewDurationMin)}`} note={`Fark ${formatDelta(preview.durationDeltaMin)} dk`} />
        <StatTile label="Kapasite" value={capacity.status || "UNKNOWN"} note={`Önceki yük: ${formatNumber(capacity.currentLoad)} • Önizleme yükü: ${formatNumber(capacity.previewLoad)} • Boş koltuk: ${capacityBefore} → ${capacityAfter}`} />
        <StatTile label="Güvenilirlik" value={String(reliability.label || "ETA hesaplanamıyor")} note={String(reliability.note || "ETA hesaplanamıyor")} />
      </div>

      {warnings.length ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid rgba(245, 158, 11, 0.28)", background: "rgba(245, 158, 11, 0.10)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Uyarılar</div>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: "grid", gap: 4 }}>
            {warnings.slice(0, 4).map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <div className="panelMeta">Sıradaki önerilen işlem</div>
        <div style={{ marginTop: 4, fontWeight: 700 }}>{String(preview.nextBestAction || "Önizlemeyi doğrula.")}</div>
      </div>
    </div>
  );
}
