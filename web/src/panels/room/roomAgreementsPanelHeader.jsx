import ReconciliationPreviewCard from "../../components/ReconciliationPreviewCard";
export default function RoomAgreementsPanelHeader({
  busy,
  refreshing,
  refreshAgreements,
  err,
  refreshFeedback,
  surfaceFeedback,
  viewMode,
  agreementDisplayTarget,
  token,
  openAgreementShift,
  openAgreementShifts,
  bridgePeriod,
  roomAgreementsNotice,
  openAgreementDetail,
  openAgreementQuotePreview,
  openAgreementBridge,
  setViewMode,
  roomAgreementTabs,
  filterQ,
  setFilterQ,
  filteredCount,
  totalCount,
  clearAgreementFilter,
  TabsComponent,
}) {
  const Tabs = TabsComponent;
  return (
    <>
      <div className="topbar">
        <div>
          <div className="title">Taşımacılık Firması / Sözleşmeler</div>
          <div className="muted">Bekleyen sözleşmeler burada karar bekler. Taşımacılık Firması bu ekranda kabul / karşı teklif / red kararını verir. Not: sözleşme durumu zaman bazlıdır. Sürücü vardiyayı bitirse bile sözleşme bitiş tarihine kadar devam ediyor görünebilir. Uzatma talepleri de burada yönetilir.</div>
        </div>
        <button type="button" className="btn sm ghost" disabled={busy || refreshing} onClick={refreshAgreements}>
          {refreshing ? "Yenileniyor..." : "Yenile"}
        </button>
      </div>

      {err ? <div className="card err">{String(err)}</div> : null}
      {refreshFeedback ? (
        <div className="muted" data-testid="room-agreements-refresh-feedback" aria-live="polite" style={{ marginTop: 8 }}>
          {refreshFeedback}
        </div>
      ) : null}
      {surfaceFeedback ? (
        <div className="muted" data-testid="room-agreements-surface-feedback" aria-live="polite" style={{ marginTop: 8 }}>
          {surfaceFeedback}
        </div>
      ) : null}

      {viewMode === "bridge" ? (
        <ReconciliationPreviewCard
          agreementId={agreementDisplayTarget?.id}
          token={token}
          onOpenOperation={openAgreementShift}
          onOpenAgreementShifts={openAgreementShifts}
          roomSummaryMode
          collectionEnabled
          periodStart={bridgePeriod.periodStart}
          periodEnd={bridgePeriod.periodEnd}
          style={{ marginTop: 12 }}
        />
      ) : null}

      {roomAgreementsNotice ? (
        <div
          className="card"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            border: roomAgreementsNotice.tone === "warning" ? "1px solid rgba(250,204,21,.42)" : "1px solid rgba(88,166,255,.32)",
            background: roomAgreementsNotice.tone === "warning" ? "rgba(250,204,21,.06)" : "rgba(88,166,255,.06)",
          }}
        >
          <div style={{ minWidth: 240 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Yeni gelen talep</div>
            <div style={{ fontWeight: 900 }}>{roomAgreementsNotice.title}</div>
            <div className="muted" style={{ marginTop: 4 }}>{roomAgreementsNotice.detail}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {agreementDisplayTarget ? (
              <button type="button" className="btn sm" onClick={() => openAgreementDetail(agreementDisplayTarget)}>
                Sözleşme detayını aç
              </button>
            ) : null}
            {agreementDisplayTarget ? (
              <button type="button" className="btn sm" data-testid="room-agreement-quote-preview" onClick={() => openAgreementQuotePreview(agreementDisplayTarget)}>
                Teklif önizlemesine geç
              </button>
            ) : null}
            <button
              type="button"
              className="btn sm primary"
              onClick={() => (
                roomAgreementsNotice.actionTab === "bridge" && agreementDisplayTarget
                  ? openAgreementBridge(agreementDisplayTarget)
                  : setViewMode(roomAgreementsNotice.actionTab)
              )}
            >
              {roomAgreementsNotice.actionLabel}
            </button>
          </div>
        </div>
      ) : null}

      <div
        data-copilot-target="room:agreements:list"
        data-copilot-semantic-id="product:room:agreements:list"
        data-copilot-label="Sözleşme listesi"
        data-copilot-filter-scope="agreements"
        data-copilot-filter-value={String(filterQ || "").trim()}
        data-copilot-filter-visible-count={filteredCount}
        data-copilot-filter-total-count={totalCount}
        data-copilot-filter-clear-target="room:agreements:filter-clear"
      >
        <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <div className="muted">Filtre</div>
            <input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="Kayıt no / durum / teklif / tarih / not" />
          </div>
          <div className="muted">Gösterilen: <b>{filteredCount}</b> / Toplam: <b>{totalCount}</b></div>
          {String(filterQ || "").trim() ? (
            <button
              type="button"
              className="btn sm ghost"
              data-copilot-target="room:agreements:filter-clear"
              onClick={clearAgreementFilter}
            >
              Filtreyi Temizle
            </button>
          ) : null}
        </div>
        <Tabs tabs={roomAgreementTabs} value={viewMode} onChange={setViewMode} compact />
      </div>
    </>
  );
}
