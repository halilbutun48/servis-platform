export default function PaymentReadonlySafetyBadge({ className = "", style }) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: 10,
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Hakediş güvenli modda</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Sadece hazırlık, önizleme ve CSV taslağı
          </div>
        </div>
        <span className="pill" data-status="INFO">Ödeme başlatılmaz</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status="ACTIVE">Hazırlık</span>
        <span className="pill" data-status="INFO">Önizleme</span>
        <span className="pill" data-status="INFO">CSV taslağı</span>
        <span className="pill" data-status="WARN">Son kontrol: aktif ödeme kapalı</span>
      </div>
    </div>
  );
}
