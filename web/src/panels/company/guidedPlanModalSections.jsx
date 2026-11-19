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
import { guidedPlanHubCopy } from "./guidedPlanRoleCopy";

export function GuidedHubStep({
  organization,
  school,
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
  guidedTargetKey,
}) {
  const copy = guidedPlanHubCopy({ organization, school });
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      <div className="muted">
        {copy.description}
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="guidedPlanSecondaryAction" data-copilot-target={guidedTargetKey} onClick={useGeolocation} disabled={busy}>Konumumu al</button>
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder={copy.placeholder}
          style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}
          disabled={busy}
        />
        <button type="button" className="guidedPlanSecondaryAction" onClick={geocodeAddress} disabled={busy}>Adresten bul</button>
      </div>

      <div className="guidedPlanHubCoordGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, minWidth: 0 }}>
        <div>
          <label className="muted">{copy.latitude}</label>
          <input value={hubLat} onChange={(e) => setHubLat(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label className="muted">{copy.longitude}</label>
          <input value={hubLng} onChange={(e) => setHubLng(e.target.value)} disabled={busy} />
        </div>
      </div>

      {!hubLoaded ? <div className="muted">{copy.loading}</div> : null}

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="guidedPlanPrimaryAction" onClick={saveHub} disabled={busy}>
          {copy.save}
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
  draftAmount,
  setDraftAmount,
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
  guidedTargetKey,
}) {
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
      <div className="muted">{organization ? "2. adımda gezi akışını seçersin. Bu adım sadece taslak plan oluşturur; teklif henüz gönderilmez." : "2. adımda plan paketi seçilir. Bu adım sadece taslak oluşturur; teklif göndermez."}</div>

      <div className="guidedPlanSetupGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, minWidth: 0 }}>
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

      <div className="card guidedPlanBudgetCard" data-testid="guided-plan-budget-card">
        <div style={{ fontWeight: 800 }}>6. Talep bütçesi</div>
        <div className="muted" style={{ marginTop: 6 }}>
          COMPANY&apos;nin bu talep için ayırdığı bütçeyi gir. Bu tutar ROOM&apos;un teklif fiyatı değildir; teklif gönderiminde ayrıca taşımacılık firması seçilir. Kaydedilen tutar Planlama Merkezi ve Teklif ve Fiyat Rehberi&apos;nin ortak ticari kaynağıdır.
        </div>
        <div className="card" data-testid="guided-plan-budget-context" style={{ marginTop: 10, padding: 12, background: "rgba(255,255,255,0.025)" }}>
          <div className="panelSectionTitle">Bu planın bütçe kapsamı</div>
          <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Dönem: <b>{startDate || "Belirtilmedi"} – {endDate || "Belirtilmedi"}</b> · Çalışma günü: <b>{eligibleDaysCount}</b> · Taslak vardiya: <b>{totalShiftCount}</b>
          </div>
          <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {organization && orgEstimatedPax
              ? `Katılımcı sayısı: ${orgEstimatedPax}. `
              : "Personel/katılımcı sayısı bu adımda doğrulanmadı. "}
            Rota, durak ve hizmet uygunluğu sonraki adımlarda gerçek kayıtlarla doğrulanır.
          </div>
          <div className="panelMeta" data-testid="guided-plan-budget-recommendation" style={{ marginTop: 8, lineHeight: 1.45, color: "#ffd38a" }}>
            Bütçe önerisi: Bu yeni plan için doğrulanmış karşılaştırılabilir fiyat referansı mevcut değil; tutar uydurulmadı. Plan kapsamı ve gelen gerçek teklifler tamamlandığında Teklif ve Fiyat Rehberi&apos;nde bütçe farkı gösterilir.
          </div>
        </div>
        <label className="muted" style={{ display: "block", marginTop: 10 }} htmlFor="guided-plan-budget">Talep bütçesi (₺)</label>
        <input id="guided-plan-budget" data-testid="guided-plan-budget" inputMode="decimal" value={draftAmount} onChange={(event) => setDraftAmount(event.target.value)} placeholder="Örn. 10000" disabled={busy} />
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
        <button type="button" className="guidedPlanSecondaryAction" onClick={() => setStep(0)} disabled={busy}>Geri</button>
        <button type="button" className="guidedPlanPrimaryAction" data-copilot-target={guidedTargetKey} onClick={createDraftShifts} disabled={busy || eligibleDaysCount === 0 || Boolean(guidedLimitMessage)}>Taslak vardiya oluştur</button>
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
  guidedTargetKey,
}) {
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
      <div className="muted">
        {organization
          ? "4. adım: Ön izle, rota sırasını iyileştir ve plan tamamsa uygun taşımacılık firmalarına teklif gönder. Eksik koordinat varsa piyasa akışına çıkmaz."
          : "4. adım: Ön izleme al → rota sırasını iyileştir → uygun taşımacılık firmalarına teklif gönder."}
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
        guidedTargetKey={guidedTargetKey}
      />

      <div className="row" style={{ justifyContent: sentOk ? "flex-end" : "space-between", gap: 10, flexWrap: "wrap" }}>
        {!sentOk ? (
          <button type="button" className="guidedPlanSecondaryAction" onClick={() => setStep(2)} disabled={busy}>Geri</button>
        ) : null}
        <button type="button" className="guidedPlanPrimaryAction" onClick={() => { onAfterCreated?.(); onClose?.(); resetAll(); }} disabled={busy || !sentOk}>
          Bitir
        </button>
      </div>
    </div>
  );
}
