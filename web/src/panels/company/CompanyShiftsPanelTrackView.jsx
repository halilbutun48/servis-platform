import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import ShiftOperationEventsModal from "../../components/ShiftOperationEventsModal";
import {
  CompanyDetailModal,
  CompanyExtendModal,
  CompanyFinalListSection,
  CompanyMarketSection,
  CompanyOfferSendModal,
  CompanyOffersDecisionModal,
  CompanyPendingSection,
} from "./companyShiftsPanelSections";

export default function CompanyShiftsPanelTrackView(props) {
  const {
    isCommercialMode,
    dayYmd,
    setDayYmd,
    todayYmdLocal,
    addDaysYmd,
    setMainTab,
    setTrackTab,
    setFinalStatus,
    listSectionRef,
    setFinalQ,
    setPendingQ,
    setMarketQ,
    setPendingOnlyRoomOffer,
    setOnlyAgreement,
    trackTab,
    canonicalCompanyCounts,
    marketSectionRef,
    accOpen,
    setAccOpen,
    toggleAcc,
    marketItems,
    marketQ,
    setMarketFocusIds,
    marketFocusIds,
    busy,
    marketSearchRef,
    fmtTR,
    copilotShiftId,
    setFocusedTrackShiftId,
    openOfferModalForShift,
    openOffersModalForShift,
    computePackageShiftIds,
    pendingSectionRef,
    pendingItems,
    pendingQ,
    pendingFocusIds,
    setPendingFocusIds,
    pendingOnlyRoomOffer,
    onlyAgreement,
    roomsById,
    agreementConversionByShift,
    renderRoomOfferSummary,
    renderCompanyOfferSummary,
    cancelMyRequest,
    openExtendModal,
    setPreviewModal,
    openOpsEvents,
    finalItems,
    finalStatus,
    finalQ,
    openVehicleDetail,
    openDriverDetail,
    detailModal,
    setDetailModal,
    vehicleMetaLine,
    opsEventsModal,
    setOpsEventsModal,
    previewModal,
    extendModal,
    setExtendModal,
    submitExtendRequest,
    offerModal,
    rooms,
    roomScores,
    setOfferModal,
    setOffersModal,
    toggleOfferRoom,
    submitOfferModal,
    offersModal,
    offersModalPkgIds,
    offersDecisionCards,
    recommendedOffer,
    recommendedCanAccept,
    offersCounterSel,
    acceptOffer,
    acceptOfferPackage,
    setOffersCounter,
    companyCounterOffer,
    companyCounterPackage,
    onConvertShiftToAgreement,
  } = props;

  return (
    <>
      <div
        className="card"
        style={{
          position: "sticky",
          top: 74,
          zIndex: 4,
          background: "rgba(18,26,42,.92)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Hızlı Filtre</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Gün: <b>{dayYmd || "Hepsi"}</b> • Liste: <b>{finalStatus === "ALL" ? "Hepsi" : finalStatus}</b>
            </div>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            <input type="date" value={dayYmd} onChange={(e) => setDayYmd(e.target.value)} title="Gün filtresi" style={{ padding: "8px 10px" }} />

            <button type="button" className="btn sm" onClick={() => setDayYmd(todayYmdLocal())}>Bugün</button>
            <button type="button" className="btn sm" onClick={() => setDayYmd(addDaysYmd(todayYmdLocal(), 1))}>Yarın</button>

            <span className="muted" style={{ margin: "0 4px" }}>|</span>

            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setMainTab("track");
                setTrackTab("list");
                setFinalStatus("OPEN");
                setTimeout(() => {
                  try { listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* no-op: scrolling is best effort */ }
                }, 0);
              }}
              title="Liste: kabul edildi + aktif"
            >
              Açık
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setMainTab("track");
                setTrackTab("list");
                setFinalStatus("ACTIVE");
                setTimeout(() => {
                  try { listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* no-op: scrolling is best effort */ }
                }, 0);
              }}
            >
              Active
            </button>

            <span className="muted" style={{ margin: "0 4px" }}>|</span>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setDayYmd("");
                setFinalStatus("ALL");
                setFinalQ("");
                setPendingQ("");
                setMarketQ("");
                setPendingOnlyRoomOffer(false);
                setOnlyAgreement(false);
              }}
            >
              Temizle
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <PanelSegmentTabs
          ariaLabel="Company shifts bölümleri"
          tabs={[
            { key: "market", label: "Market", badge: canonicalCompanyCounts.market },
            { key: "pending", label: "Bekleyen", badge: canonicalCompanyCounts.pending },
            { key: "list", label: "Liste", badge: canonicalCompanyCounts.final },
          ]}
          value={trackTab}
          onChange={setTrackTab}
          compact
        />
        <div className="muted" style={{ marginTop: 6 }}>
          {isCommercialMode
            ? "Market: teklif / pazarlık • Bekleyen: operasyon hazırlığı • Liste: kabul edildi / aktif / tamamlandı / reddedildi"
            : "Market: room seçilmemiş talepler • Bekleyen: pazarlık/karar • Liste: kabul edildi / aktif / tamamlandı / reddedildi"}
        </div>
      </div>

      <CompanyMarketSection
        trackTab={trackTab}
        sectionRef={marketSectionRef}
        accOpen={accOpen.market}
        onSetOpen={(next) => setAccOpen((p) => ({ ...p, market: next }))}
        onToggle={() => toggleAcc("market")}
        marketItems={marketItems}
        marketQ={marketQ}
        onChangeMarketQ={setMarketQ}
        marketFocusIds={marketFocusIds}
        onClearFocus={() => setMarketFocusIds([])}
        busy={busy}
        searchRef={marketSearchRef}
        fmtTR={fmtTR}
        copilotShiftId={copilotShiftId}
        onFocusShift={(shiftId) => setFocusedTrackShiftId(Number(shiftId || 0) || null)}
        onOpenOfferModal={openOfferModalForShift}
        onOpenOffersModal={openOffersModalForShift}
        computePackageShiftIds={computePackageShiftIds}
      />

      <CompanyPendingSection
        trackTab={trackTab}
        sectionRef={pendingSectionRef}
        accOpen={accOpen.pending}
        onSetOpen={(next) => setAccOpen((p) => ({ ...p, pending: next }))}
        onToggle={() => toggleAcc("pending")}
        pendingItems={pendingItems}
        pendingQ={pendingQ}
        onChangePendingQ={setPendingQ}
        pendingFocusIds={pendingFocusIds}
        onClearFocus={() => setPendingFocusIds([])}
        pendingOnlyRoomOffer={pendingOnlyRoomOffer}
        onChangePendingOnlyRoomOffer={setPendingOnlyRoomOffer}
        onlyAgreement={onlyAgreement}
        onChangeOnlyAgreement={setOnlyAgreement}
        busy={busy}
        copilotShiftId={copilotShiftId}
        onFocusShift={(shiftId) => setFocusedTrackShiftId(Number(shiftId || 0) || null)}
        roomsById={roomsById}
        agreementConversionByShift={agreementConversionByShift}
        renderRoomOfferSummary={renderRoomOfferSummary}
        renderCompanyOfferSummary={renderCompanyOfferSummary}
        onOpenOffersModal={openOffersModalForShift}
        onCancelMyRequest={cancelMyRequest}
        fmtTR={fmtTR}
        onOpenExtendModal={openExtendModal}
        onOpenPreview={(shiftId) => setPreviewModal({ open: true, shiftId })}
        onOpenOpsEvents={openOpsEvents}
        onConvertShiftToAgreement={onConvertShiftToAgreement}
      />

      <CompanyFinalListSection
        trackTab={trackTab}
        sectionRef={listSectionRef}
        accOpen={accOpen.list}
        onSetOpen={(next) => setAccOpen((p) => ({ ...p, list: next }))}
        onToggle={() => toggleAcc("list")}
        finalItems={finalItems}
        finalStatus={finalStatus}
        onChangeFinalStatus={setFinalStatus}
        finalQ={finalQ}
        onChangeFinalQ={setFinalQ}
        onlyAgreement={onlyAgreement}
        onChangeOnlyAgreement={setOnlyAgreement}
        onClearFilters={() => { setFinalStatus("ALL"); setFinalQ(""); setOnlyAgreement(false); }}
        busy={busy}
        copilotShiftId={copilotShiftId}
        onFocusShift={(shiftId) => setFocusedTrackShiftId(Number(shiftId || 0) || null)}
        roomsById={roomsById}
        agreementConversionByShift={agreementConversionByShift}
        renderRoomOfferSummary={renderRoomOfferSummary}
        renderCompanyOfferSummary={renderCompanyOfferSummary}
        fmtTR={fmtTR}
        onOpenVehicleDetail={openVehicleDetail}
        onOpenDriverDetail={openDriverDetail}
        onOpenExtendModal={openExtendModal}
        onOpenPreview={(shiftId) => setPreviewModal({ open: true, shiftId })}
        onOpenOpsEvents={openOpsEvents}
        onConvertShiftToAgreement={onConvertShiftToAgreement}
      />

      <CompanyDetailModal detailModal={detailModal} onClose={() => setDetailModal(null)} fmtTR={fmtTR} vehicleMetaLine={vehicleMetaLine} />

      <ShiftOperationEventsModal open={opsEventsModal.open} shiftId={opsEventsModal.shiftId} onClose={() => setOpsEventsModal({ open: false, shiftId: null })} />

      {previewModal.open ? (
        <RoutePreviewModal
          open={previewModal.open}
          onClose={() => setPreviewModal({ open: false, shiftId: null })}
          title={previewModal.shiftId ? `Shift #${previewModal.shiftId} — Rota/Durak Önizleme` : "Rota/Durak Önizleme"}
          shiftId={previewModal.shiftId}
        />
      ) : null}

      <CompanyExtendModal
        extendModal={extendModal}
        busy={busy}
        onClose={() => setExtendModal({ open: false, shift: null, endLocal: "", note: "" })}
        onChange={(patch) => setExtendModal((p) => ({ ...p, ...patch }))}
        onSubmit={submitExtendRequest}
      />

      <CompanyOfferSendModal
        offerModal={offerModal}
        rooms={rooms}
        roomScores={roomScores}
        busy={busy}
        onClose={() => setOfferModal((p) => ({ ...p, open: false }))}
        onChange={(patch) => setOfferModal((p) => ({ ...p, ...patch }))}
        onToggleRoom={toggleOfferRoom}
        onSubmit={submitOfferModal}
      />

      {offersModal.open ? (
        <CompanyOffersDecisionModal
          offersModal={offersModal}
          offersModalPkgIds={offersModalPkgIds}
          offersDecisionCards={offersDecisionCards}
          recommendedOffer={recommendedOffer}
          recommendedCanAccept={recommendedCanAccept}
          roomScores={roomScores}
          busy={busy}
          offersCounterSel={offersCounterSel}
          onClose={() => setOffersModal((p) => ({ ...p, open: false }))}
          onOpenPreview={(shiftId) => setPreviewModal({ open: true, shiftId })}
          onAcceptOffer={acceptOffer}
          onAcceptOfferPackage={acceptOfferPackage}
          onSetOfferCounter={setOffersCounter}
          onCounterOffer={companyCounterOffer}
          onCounterPackage={companyCounterPackage}
        />
      ) : null}
    </>
  );
}
