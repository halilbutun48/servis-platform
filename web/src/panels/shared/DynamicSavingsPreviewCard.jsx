export default function DynamicSavingsPreviewCard({
  preview = null,
  title = "Dinamik tasarruf önizlemesi",
  className = "card",
  style = {},
}) {
  const ok = Boolean(preview?.ok);
  const summaryText = String(preview?.summaryText || preview?.fallbackText || "Tasarruf hesabı için yeterli veri yok");
  const currentRouteText = String(preview?.currentRouteText || "-");
  const proposedRouteText = String(preview?.proposedRouteText || "-");
  const diffText = String(preview?.diffText || preview?.fallbackText || "Tasarruf hesabı için yeterli veri yok");
  const kmSavingsText = String(preview?.kmSavingsText || preview?.fallbackText || "Tasarruf hesabı için yeterli veri yok");
  const durationSavingsText = String(preview?.durationSavingsText || preview?.fallbackText || "Tasarruf hesabı için yeterli veri yok");
  const capacityEffectText = String(preview?.capacityEffectText || preview?.fallbackText || "Tasarruf hesabı için yeterli veri yok");
  const approxCostText = String(preview?.approxCostText || preview?.fallbackText || "Tasarruf hesabı için yeterli veri yok");
  const previewOnlyNote = String(preview?.previewOnlyNote || "Readonly önizleme: Bu sadece önizlemedir. Uygulama, ödeme ve settlement yok.");
  const nextBestAction = String(preview?.nextBestAction || "Bu sadece önizlemedir; teklif / kabul akışını doğrula.");
  const reliability = String(preview?.reliability || (ok ? "Tahmini" : "Yetersiz veri"));
  const warnings = Array.isArray(preview?.warnings) ? preview.warnings.filter(Boolean) : [];

  return (
    <div
      className={className}
      style={{
        border: ok ? "1px solid rgba(88,166,255,.24)" : "1px solid rgba(255,255,255,.08)",
        background: "rgba(255,255,255,.02)",
        ...style,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          <div className="muted" style={{ marginTop: 4, lineHeight: 1.4 }}>
            {summaryText}
          </div>
        </div>
        <span className="pill">{ok ? "Readonly önizleme" : "Veri yok"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Mevcut</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{currentRouteText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Yeni</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{proposedRouteText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Fark</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{diffText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Km tasarrufu</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{kmSavingsText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Süre tasarrufu</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{durationSavingsText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Kapasite etkisi</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{capacityEffectText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Yaklaşık maliyet</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{approxCostText}</div>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
        {previewOnlyNote}
      </div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Sonraki adım: {nextBestAction}
      </div>
      <div className="muted" style={{ marginTop: 6 }}>
        Güvenilirlik: {reliability}
      </div>
      {warnings.length ? (
        <div className="muted" style={{ marginTop: 6 }}>
          Uyarılar: {warnings.join(" • ")}
        </div>
      ) : null}
    </div>
  );
}
