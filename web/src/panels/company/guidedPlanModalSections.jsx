import {
  GuidedBulkOffersCard,
  GuidedCompanyGeoGateCard,
  GuidedDraftShiftsCard,
  GuidedOrganizationPlanCard,
  GuidedOrganizationReadinessCard,
  GuidedOsrmGateCard,
  GuidedPlanDatesCard,
  GuidedPlanPackCard,
} from "./guidedPlanModalCards";

export function GuidedHubStep({
  organization,
  busy,
  useGeolocation,
  addr,
  setAddr,
  geocodeAddress,
  hubLat,
  setHubLat,
  hubLng,
  setHubLng,
  hubLoaded,
  saveHub,
}) {
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      <div className="muted">
        {organization
          ? "1. adımda gezi için toplanma konumunu ayarla. Bu nokta turun başlangıç merkezi olur."
          : "1. adımda şirket kendi konumunu ayarlar."}
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={useGeolocation} disabled={busy}>Konumumu al</button>
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder={organization ? "Toplanma konumu adresi (örn. Denizli Forum önü)" : "Adresten konum al (örn. Ankara Çankaya ...)"}
          style={{ flex: 1, minWidth: 260 }}
          disabled={busy}
        />
        <button type="button" onClick={geocodeAddress} disabled={busy}>Adresten bul</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="muted">{organization ? "Toplanma Konumu Lat" : "Şirket Konumu Lat"}</label>
          <input value={hubLat} onChange={(e) => setHubLat(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label className="muted">{organization ? "Toplanma Konumu Lng" : "Şirket Konumu Lng"}</label>
          <input value={hubLng} onChange={(e) => setHubLng(e.target.value)} disabled={busy} />
        </div>
      </div>

      {!hubLoaded ? <div className="muted">{organization ? "Toplanma Konumu okunuyor..." : "Şirket Konumu okunuyor..."}</div> : null}

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" onClick={saveHub} disabled={busy}>
          {organization ? "Toplanma konumunu kaydet" : "İleri"}
        </button>
      </div>
    </div>
  );
}


export function GuidedPlanSetupStep({
  organization,
  busy,
  PACKS,
  packKey,
  setPackKey,
  pack,
  customSlots,
  setCustomSlots,
  createAdditionalCustomSlot,
  startDate,
  setStartDate,
  durationOptions,
  durationKey,
  setDurationKey,
  endDate,
  WEEKDAYS,
  daysSel,
  setDaysSel,
  weekMask,
  eligibleDaysCount,
  totalShiftCount,
  guidedLimitMessage,
  nextValidStart,
  planSummary,
  orgEstimatedPax,
  setOrgEstimatedPax,
  orgGatheringName,
  setOrgGatheringName,
  orgDestinationAudit,
  orgDestinations,
  moveDestination,
  removeDestination,
  setDestinationField,
  setDestinationCoordField,
  geocodeDestination,
  openDestinationMapPicker,
  openDestinationNavigation,
  addDestination,
  orgReturnType,
  setOrgReturnType,
  setStep,
  createDraftShifts,
}) {
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
      <div className="muted">{organization ? "2. adımda gezi akışını seçersin. Bu adım sadece taslak plan oluşturur; teklif henüz gönderilmez." : "2. adımda plan paketi seçilir. Bu adım sadece taslak oluşturur; teklif göndermez."}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <GuidedPlanPackCard
          organization={organization}
          busy={busy}
          PACKS={PACKS}
          packKey={packKey}
          setPackKey={setPackKey}
          pack={pack}
          customSlots={customSlots}
          setCustomSlots={setCustomSlots}
          createAdditionalCustomSlot={createAdditionalCustomSlot}
        />

        <GuidedPlanDatesCard
          busy={busy}
          startDate={startDate}
          setStartDate={setStartDate}
          durationOptions={durationOptions}
          durationKey={durationKey}
          setDurationKey={setDurationKey}
          endDate={endDate}
          WEEKDAYS={WEEKDAYS}
          daysSel={daysSel}
          setDaysSel={setDaysSel}
          organization={organization}
          weekMask={weekMask}
          eligibleDaysCount={eligibleDaysCount}
          nextValidStart={nextValidStart}
          planSummary={planSummary}
        />
      </div>

      {organization ? (
        <GuidedOrganizationPlanCard
          busy={busy}
          orgEstimatedPax={orgEstimatedPax}
          setOrgEstimatedPax={setOrgEstimatedPax}
          orgGatheringName={orgGatheringName}
          setOrgGatheringName={setOrgGatheringName}
          orgDestinationAudit={orgDestinationAudit}
          orgDestinations={orgDestinations}
          moveDestination={moveDestination}
          removeDestination={removeDestination}
          setDestinationField={setDestinationField}
          setDestinationCoordField={setDestinationCoordField}
          geocodeDestination={geocodeDestination}
          openDestinationMapPicker={openDestinationMapPicker}
          openDestinationNavigation={openDestinationNavigation}
          addDestination={addDestination}
          orgReturnType={orgReturnType}
          setOrgReturnType={setOrgReturnType}
        />
      ) : null}

      <div className="muted" style={{ fontSize: 12 }}>
        Bu plan: <b>{eligibleDaysCount}</b> gün • <b>{totalShiftCount}</b> vardiya
      </div>
      {guidedLimitMessage ? (
        <div className="card err">{guidedLimitMessage}</div>
      ) : null}

      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setStep(0)} disabled={busy}>Geri</button>
        <button type="button" onClick={createDraftShifts} disabled={busy || eligibleDaysCount === 0 || Boolean(guidedLimitMessage)}>Taslak vardiya oluştur</button>
      </div>
    </div>
  );
}

export function GuidedSolveOffersStep({
  organization,
  busy,
  orgDraftCompletion,
  orgEstimatedPax,
  companyGeoGate,
  offerOsrmGate,
  draftShifts,
  osrmBatch,
  osrmReorderAll,
  osrmReorder,
  openShiftNavigation,
  osrmResById,
  onReloadRooms,
  roomsSupported,
  routeRefreshMode,
  routeRefreshLaunch,
  sentOk,
  offerOutcome,
  roomQ,
  setRoomQ,
  rooms,
  selectedRoomCount,
  offerAmount,
  setOfferAmount,
  offerNote,
  setOfferNote,
  roomsFiltered,
  roomScores,
  selRoomIds,
  setSelRoomIds,
  sendBulkOffers,
  setStep,
  onAfterCreated,
  onClose,
  resetAll,
}) {
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
      <div className="muted">
        {organization
          ? "4. adım: Ön izle, rota sırasını iyileştir ve plan tamamsa uygun room'lara teklif gönder. Eksik koordinat varsa markete düşmez."
          : "4. adım: Ön izleme al → rota sırasını iyileştir → uygun room'lara teklif gönder."}
      </div>

      {organization ? (
        <GuidedOrganizationReadinessCard
          orgDraftCompletion={orgDraftCompletion}
          orgEstimatedPax={orgEstimatedPax}
        />
      ) : null}

      {!organization ? (
        <GuidedCompanyGeoGateCard companyGeoGate={companyGeoGate} />
      ) : null}

      {!organization ? (
        <GuidedOsrmGateCard offerOsrmGate={offerOsrmGate} />
      ) : null}

      <GuidedDraftShiftsCard
        busy={busy}
        draftShifts={draftShifts}
        osrmBatch={osrmBatch}
        osrmReorderAll={osrmReorderAll}
        osrmReorder={osrmReorder}
        openShiftNavigation={openShiftNavigation}
        osrmResById={osrmResById}
      />

      <GuidedBulkOffersCard
        busy={busy}
        onReloadRooms={onReloadRooms}
        roomsSupported={roomsSupported}
        routeRefreshMode={routeRefreshMode}
        routeRefreshLaunch={routeRefreshLaunch}
        sentOk={sentOk}
        offerOutcome={offerOutcome}
        roomQ={roomQ}
        setRoomQ={setRoomQ}
        rooms={rooms}
        selectedRoomCount={selectedRoomCount}
        offerAmount={offerAmount}
        setOfferAmount={setOfferAmount}
        offerNote={offerNote}
        setOfferNote={setOfferNote}
        roomsFiltered={roomsFiltered}
        roomScores={roomScores}
        selRoomIds={selRoomIds}
        setSelRoomIds={setSelRoomIds}
        sendBulkOffers={sendBulkOffers}
        organization={organization}
        orgDraftCompletion={orgDraftCompletion}
        offerOsrmGate={offerOsrmGate}
      />

      <div className="row" style={{ justifyContent: sentOk ? "flex-end" : "space-between", gap: 10, flexWrap: "wrap" }}>
        {!sentOk ? (
          <button type="button" onClick={() => setStep(2)} disabled={busy}>Geri</button>
        ) : null}
        <button type="button" onClick={() => { onAfterCreated?.(); onClose?.(); resetAll(); }} disabled={busy || !sentOk}>
          Bitir
        </button>
      </div>
    </div>
  );
}
