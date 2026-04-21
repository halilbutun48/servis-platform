export default function CompanyAgreementsSourceShiftSection({
  origin,
  canShowRouteRefreshActions = false,
  previewShiftId = 0,
  routeRefreshActionDisabled = false,
  routeRefreshActionLabel = "Rota Güncelle",
  onOpenSourceShift,
  onOpenPreview,
  onStartRouteRefresh,
}) {
  if (!origin) return null;

  return (
    <div className="card" style={{ border: "1px solid rgba(88,166,255,.24)" }}>
      <div style={{ fontWeight: 900 }}>Kaynak vardiya bağlantısı</div>
      <div className="muted" style={{ marginTop: 6 }}>
        Bu sözleşme, vardiya <b>#{origin.sourceShiftId}</b> üzerinden açılan taslaktan oluşturuldu.
      </div>
      {origin?.sourceSummary ? (
        <div className="muted" style={{ marginTop: 6 }}>{origin.sourceSummary}</div>
      ) : null}
      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={onOpenSourceShift}>
          Kaynak Vardiyaya Git
        </button>
        {canShowRouteRefreshActions ? (
          <>
            <button type="button" className="btn" disabled={!Number(previewShiftId || 0)} onClick={onOpenPreview}>
              Rota Önizleme
            </button>
            <button type="button" className="btn" disabled={routeRefreshActionDisabled} onClick={onStartRouteRefresh}>
              {routeRefreshActionLabel}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
