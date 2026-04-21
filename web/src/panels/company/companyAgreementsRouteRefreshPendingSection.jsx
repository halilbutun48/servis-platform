export default function CompanyAgreementsRouteRefreshPendingSection({
  title,
  summaryText,
  companyOfferNote = "",
  roomCounterText = "",
  currentRouteText = "-",
  proposedRouteText = "-",
  diffText = "-",
  priceImpactText = "-",
  previewError = "",
  previewLoading = false,
  currentPreviewShiftId = 0,
  proposedPreviewShiftId = 0,
  showCounterActions = false,
  busy = false,
  onOpenCurrentPreview,
  onOpenProposedPreview,
  onAcceptCounter,
  onRejectCounter,
}) {
  return (
    <div className="card" style={{ border: "1px solid rgba(88,166,255,.24)" }}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div className="muted" style={{ marginTop: 6 }}>{summaryText}</div>
      {companyOfferNote ? (
        <div className="muted" style={{ marginTop: 6 }}>Şirket notu: {companyOfferNote}</div>
      ) : null}
      {roomCounterText ? (
        <div className="muted" style={{ marginTop: 6 }}>
          Oda karşı teklifi: <b>{roomCounterText}</b>
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Mevcut rota</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{currentRouteText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Önerilen yeni rota</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{proposedRouteText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Fark</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{diffText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Ücret etkisi</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{priceImpactText}</div>
        </div>
      </div>
      {previewError ? (
        <div className="muted" style={{ marginTop: 8 }}>Rota özeti yüklenemedi: {previewError}</div>
      ) : previewLoading ? (
        <div className="muted" style={{ marginTop: 8 }}>Rota özeti yükleniyor…</div>
      ) : null}
      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={!Number(currentPreviewShiftId || 0)} onClick={onOpenCurrentPreview}>
          Mevcut Rotayı Gör
        </button>
        <button type="button" className="btn" disabled={!Number(proposedPreviewShiftId || 0)} onClick={onOpenProposedPreview}>
          Yeni Rotayı Önizle
        </button>
        {showCounterActions ? (
          <>
            <button type="button" disabled={busy} onClick={onAcceptCounter}>
              Karşı Teklifi Kabul Et
            </button>
            <button type="button" className="btn" disabled={busy} onClick={onRejectCounter}>
              Karşı Teklifi Reddet
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
