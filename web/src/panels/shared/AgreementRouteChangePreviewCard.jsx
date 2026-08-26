export default function AgreementRouteChangePreviewCard({
  summaryText = "",
  companyOfferNote = "",
  roomCounterText = "",
  currentRouteLabel = "Mevcut rota",
  proposedRouteLabel = "Önerilen yeni rota",
  diffLabel = "Fark",
  priceLabel = "Ücret etkisi",
  currentRouteText = "-",
  proposedRouteText = "-",
  diffText = "-",
  priceImpactText = "-",
  boundaryNote = "",
  previewError = "",
  previewLoading = false,
  currentPreviewShiftId = 0,
  proposedPreviewShiftId = 0,
  currentPreviewButtonLabel = "Mevcut Rotayı Gör",
  proposedPreviewButtonLabel = "Yeni Rotayı Önizle",
  selected = false,
  className = "card",
  style = {},
  onOpenCurrentPreview,
  onOpenProposedPreview,
  actions = null,
}) {
  const hasCurrentPreview = Number(currentPreviewShiftId || 0) > 0;
  const hasProposedPreview = Number(proposedPreviewShiftId || 0) > 0;

  return (
    <div
      className={className}
      style={{
        border: selected ? "1px solid rgba(88,166,255,.42)" : "1px solid rgba(88,166,255,.24)",
        ...style,
      }}
    >
      {summaryText ? (
        <div className="muted" style={{ marginTop: 6 }}>
          {summaryText}
        </div>
      ) : null}
      {companyOfferNote ? (
        <div className="muted" style={{ marginTop: 6 }}>
          Hizmet Alan Firma notu: {companyOfferNote}
        </div>
      ) : null}
      {roomCounterText ? (
        <div className="muted" style={{ marginTop: 6 }}>
          Taşımacılık Firması karşı teklifi: <b>{roomCounterText}</b>
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">{currentRouteLabel}</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{currentRouteText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">{proposedRouteLabel}</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{proposedRouteText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">{diffLabel}</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{diffText}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">{priceLabel}</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{priceImpactText}</div>
        </div>
      </div>
      {boundaryNote ? (
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.4 }}>
          {boundaryNote}
        </div>
      ) : null}
      {previewError ? (
        <div className="muted" style={{ marginTop: 8 }}>
          Rota özeti yüklenemedi: {previewError}
        </div>
      ) : previewLoading ? (
        <div className="muted" style={{ marginTop: 8 }}>
          Rota özeti yükleniyor…
        </div>
      ) : null}
      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {onOpenCurrentPreview ? (
          <button
            type="button"
            className="btn"
            disabled={!hasCurrentPreview}
            onClick={(event) => {
              event.stopPropagation();
              onOpenCurrentPreview(event);
            }}
          >
            {currentPreviewButtonLabel}
          </button>
        ) : null}
        {onOpenProposedPreview ? (
          <button
            type="button"
            className="btn"
            disabled={!hasProposedPreview}
            onClick={(event) => {
              event.stopPropagation();
              onOpenProposedPreview(event);
            }}
          >
            {proposedPreviewButtonLabel}
          </button>
        ) : null}
        {actions ? <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
    </div>
  );
}
