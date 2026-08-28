import { useEffect, useRef } from "react";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import ShiftOperationEventsModal from "../../components/ShiftOperationEventsModal";
import {
  CompanyContractSection,
  CompanyDetailModal,
  CompanyExtendModal,
  CompanyMarketSection,
  CompanyOfferSendModal,
  CompanyOffersDecisionModal,
  CompanyOtherSection,
  CompanyPendingSection,
} from "./companyShiftsPanelSections";

const TRACK_TAB_LABELS = {
  market: "Market",
  pending: "Bekleyen",
  contract: "Sözleşmeden Üretilen",
  other: "Diğer Vardiyalar",
};

export default function CompanyShiftsPanelTrackView(props) {
  const {
    dayYmd,
    setDayYmd,
    todayYmdLocal,
    addDaysYmd,
    trackTab,
    setTrackTab,
    trackCounts,
    marketSectionRef,
    accOpen,
    setAccOpen,
    toggleAcc,
    marketItems,
    marketQ,
    setMarketQ,
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
    setPendingQ,
    pendingFocusIds,
    setPendingFocusIds,
    pendingOnlyRoomOffer,
    setPendingOnlyRoomOffer,
    roomsById,
    agreementConversionByShift,
    renderRoomOfferSummary,
    renderCompanyOfferSummary,
    cancelMyRequest,
    openExtendModal,
    setPreviewModal,
    openOpsEvents,
    contractSectionRef,
    contractItems,
    contractStatus,
    setContractStatus,
    contractQ,
    setContractQ,
    otherSectionRef,
    otherItems,
    otherStatus,
    setOtherStatus,
    otherQ,
    setOtherQ,
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
    companyKind = "COMPANY",
  } = props;
  const didAutoScrollRef = useRef(false);

  useEffect(() => {
    if (didAutoScrollRef.current) return;
    if (trackTab !== "other") return;
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 640px)").matches) return;
    let cancelled = false;
    let attempts = 0;
    let rafId = 0;

    const tryScroll = () => {
      if (cancelled || didAutoScrollRef.current) return;
      const target = otherSectionRef?.current;
      if (target) {
        didAutoScrollRef.current = true;
        try {
          target.scrollIntoView({ behavior: "auto", block: "start" });
        } catch {
          // ignore
        }
        return;
      }
      if (attempts < 20) {
        attempts += 1;
        rafId = window.requestAnimationFrame(tryScroll);
      }
    };

    rafId = window.requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [otherSectionRef, trackTab]);

  return (
    <>
      <PanelSegmentTabs
        ariaLabel="Hizmet Alan Firma vardiya bölümleri"
        tabs={[
          { key: "market", label: "Market", badge: trackCounts.market },
          { key: "pending", label: "Bekleyen", badge: trackCounts.pending },
          { key: "contract", label: "Sözleşmeden Üretilen", badge: trackCounts.contract },
          { key: "other", label: "Diğer Vardiyalar", badge: trackCounts.other },
        ]}
        value={trackTab}
        onChange={setTrackTab}
        compact
      />

      <div
        className="card companyShiftsTrackQuickFilter"
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
              Gün: <b>{dayYmd || "Hepsi"}</b> • Aktif sekme: <b>{TRACK_TAB_LABELS[trackTab] || trackTab || "?"}</b>
            </div>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            <input type="date" value={dayYmd} onChange={(e) => setDayYmd(e.target.value)} title="Gün filtresi" style={{ padding: "8px 10px" }} />
            <button type="button" className="btn sm" onClick={() => setDayYmd(todayYmdLocal())}>Bugün</button>
            <button type="button" className="btn sm" onClick={() => setDayYmd(addDaysYmd(todayYmdLocal(), 1))}>Yarın</button>
            <button type="button" className="btn sm" onClick={() => setDayYmd("")}>Temizle</button>
          </div>
        </div>
      </div>

      <div className="card companyShiftsTrackSummary" style={{ marginTop: 10 }}>
        <div className="muted" style={{ marginTop: 6 }}>
          Market: taşımacılık firması seçilmemiş talepler • Bekleyen: pazarlık/karar • Sözleşmeden Üretilen: sözleşmeye bağlı vardiyalar • Diğer Vardiyalar: sözleşmesiz vardiyalar
        </div>
      </div>

      {trackTab === "market" ? (
        <CompanyMarketSection
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
          companyKind={companyKind}
        />
      ) : null}

      {trackTab === "pending" ? (
        <CompanyPendingSection
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
          companyKind={companyKind}
        />
      ) : null}

      {trackTab === "contract" ? (
        <CompanyContractSection
          sectionRef={contractSectionRef}
          accOpen={accOpen.contract}
          onSetOpen={(next) => setAccOpen((p) => ({ ...p, contract: next }))}
          onToggle={() => toggleAcc("contract")}
          contractItems={contractItems}
          contractStatus={contractStatus}
          onChangeContractStatus={setContractStatus}
          contractQ={contractQ}
          onChangeContractQ={setContractQ}
          onClearFilters={() => { setContractStatus("ALL"); setContractQ(""); }}
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
          companyKind={companyKind}
        />
      ) : null}

      {trackTab === "other" ? (
        <CompanyOtherSection
          sectionRef={otherSectionRef}
          accOpen={accOpen.other}
          onSetOpen={(next) => setAccOpen((p) => ({ ...p, other: next }))}
          onToggle={() => toggleAcc("other")}
          featuredShift={props.featuredShift}
          otherItems={otherItems}
          otherStatus={otherStatus}
          onChangeOtherStatus={setOtherStatus}
          otherQ={otherQ}
          onChangeOtherQ={setOtherQ}
          onClearFilters={() => { setOtherStatus("ALL"); setOtherQ(""); }}
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
          companyKind={companyKind}
        />
      ) : null}

      <CompanyDetailModal detailModal={detailModal} onClose={() => setDetailModal(null)} fmtTR={fmtTR} vehicleMetaLine={vehicleMetaLine} />

      <ShiftOperationEventsModal open={opsEventsModal.open} shiftId={opsEventsModal.shiftId} onClose={() => setOpsEventsModal({ open: false, shiftId: null })} />

      {previewModal.open ? (
        <RoutePreviewModal
          open={previewModal.open}
          onClose={() => setPreviewModal({ open: false, shiftId: null })}
          title={previewModal.shiftId ? `Vardiya #${previewModal.shiftId} — Rota/Durak Önizleme` : "Rota/Durak Önizleme"}
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
