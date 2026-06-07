import { CompanyFinalListRow, CompanyMarketRow, CompanyPendingRow } from "./companyShiftsPanelRows";
import { CompanyDriverDetailGrid, CompanyOfferDecisionCard, CompanyOfferRoomCard, CompanyVehicleDetailGrid, OfferSignalPill } from "./companyShiftsPanelCards";
import { CompanyAccordionHeader, CompanyMarketFilters, CompanyPendingFilters, CompanyStatusFilters } from "./companyShiftsPanelFilters";

export { AgreementBadge } from "./companyShiftsPanelRows";

export function CompanyOffersDecisionModal({
  offersModal,
  offersModalPkgIds,
  offersDecisionCards,
  recommendedOffer,
  recommendedCanAccept,
  roomScores,
  busy,
  offersCounterSel,
  onClose,
  onOpenPreview,
  onAcceptOffer,
  onAcceptOfferPackage,
  onSetOfferCounter,
  onCounterOffer,
  onCounterPackage,
}) {
  const packageSize = Array.isArray(offersModalPkgIds) ? offersModalPkgIds.length : 0;
  const items = Array.isArray(offersModal?.items) ? offersModal.items : [];
  const counteredCount = items.filter((o) => String(o?.status || "").toUpperCase() === "COUNTERED").length;
  const openCount = items.filter((o) => String(o?.status || "").toUpperCase() === "OPEN").length;
  const recommendedCount = (offersDecisionCards || []).filter((o) => o.__recommended).length;
  const hasRecommended = (offersDecisionCards || []).some((o) => o.__recommended);

  return (
    <div className="card" style={{ border: "2px solid #ddd" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800 }}>Teklifler — Vardiya #{offersModal.shiftId}</div>
          <div className="muted">Birini kabul edince diğerleri otomatik iptal olur{packageSize > 1 ? ` • Paket: ${packageSize} shift` : ""}.</div>
        </div>
        <button type="button" disabled={busy} onClick={onClose}>
          Kapat
        </button>
      </div>

      <div className="card" style={{ marginTop: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Karar Özeti</div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <OfferSignalPill label="Karşı teklif" value={String(counteredCount)} tone={counteredCount ? "warn" : "neutral"} />
          <OfferSignalPill label="Açık teklif" value={String(openCount)} tone="neutral" />
          <OfferSignalPill label="Önerilen" value={String(recommendedCount)} tone={hasRecommended ? "good" : "neutral"} />
          <OfferSignalPill label="Toplam" value={String(items.length)} tone="neutral" />
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Otomatik öneri sırası: karar verilebilirlik → room puanı → fiyat farkı → güncellik. Son karar yine sende.
        </div>
        {recommendedOffer ? (
          <div className="row" style={{ marginTop: 10, gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div className="muted">
              Öne çıkan teklif: {String(recommendedOffer.__recommendationShort || recommendedOffer.__recommendationReason || "Otomatik öneri")}
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {recommendedCanAccept ? (
                <button type="button" disabled={busy} onClick={() => onAcceptOffer(recommendedOffer.id)}>
                  Önerileni Kabul Et
                </button>
              ) : null}
              {recommendedCanAccept && packageSize > 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  title={`Pakete uygula (${packageSize} shift)`}
                  onClick={() => onAcceptOfferPackage(recommendedOffer.roomId)}
                >
                  Önerileni Pakete Uygula
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {(offersDecisionCards || []).map((offer) => (
          <CompanyOfferDecisionCard
            key={offer.id}
            offer={offer}
            fallbackShiftId={offersModal.shiftId}
            packageSize={packageSize}
            roomScore={roomScores[String(Number(offer.room?.id || offer.roomId || 0))] || null}
            busy={busy}
            counterState={offersCounterSel[offer.id]}
            onOpenPreview={onOpenPreview}
            onAcceptOffer={onAcceptOffer}
            onAcceptOfferPackage={onAcceptOfferPackage}
            onSetOfferCounter={onSetOfferCounter}
            onCounterOffer={onCounterOffer}
            onCounterPackage={onCounterPackage}
          />
        ))}
      </div>
    </div>
  );
}


export function CompanyDetailModal({ detailModal, onClose, fmtTR, vehicleMetaLine }) {
  if (!detailModal) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b>{detailModal.kind === "vehicle" ? "Araç Bilgileri" : "Sürücü Bilgileri"}</b>
            <div className="muted" style={{ marginTop: 4 }}>
              {detailModal.kind === "vehicle"
                ? detailModal.data?.plate || "Araç"
                : detailModal.data?.fullName || "Sürücü"}
            </div>
          </div>
          <button type="button" onClick={onClose}>Kapat</button>
        </div>

        {detailModal.kind === "vehicle" ? (
          <CompanyVehicleDetailGrid data={detailModal.data} fmtTR={fmtTR} vehicleMetaLine={vehicleMetaLine} />
        ) : (
          <CompanyDriverDetailGrid data={detailModal.data} />
        )}
      </div>
    </div>
  );
}

export function CompanyExtendModal({ extendModal, busy, onClose, onChange, onSubmit }) {
  if (!extendModal?.open) return null;
  return (
    <div className="card" style={{ border: "2px solid #ddd" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800 }}>Süre Uzat — Vardiya #{extendModal.shift?.id}</div>
          <div className="muted">Bu talep Room’a gider; kabul edilince vardiya süresi uzar.</div>
        </div>
        <button type="button" className="btn sm" disabled={busy} onClick={onClose}>
          Kapat
        </button>
      </div>

      <hr />

      <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div className="col" style={{ width: "min(100%, 240px)" }}>
          <label className="muted">Yeni Bitiş (Istanbul)</label>
          <input
            type="datetime-local"
            value={extendModal.endLocal}
            onChange={(e) => onChange({ endLocal: e.target.value })}
          />
        </div>
        <div className="col" style={{ flex: "1 1 260px", minWidth: 0 }}>
          <label className="muted">Not (opsiyonel)</label>
          <input
            value={extendModal.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="opsiyonel"
          />
        </div>
        <button type="button" disabled={busy} onClick={onSubmit}>
          {busy ? "..." : "Talep Gönder"}
        </button>
      </div>
    </div>
  );
}

export function CompanyOfferSendModal({ offerModal, rooms, roomScores, busy, onClose, onChange, onToggleRoom, onSubmit }) {
  if (!offerModal?.open) return null;
  return (
    <div className="card" style={{ border: "2px solid #ddd" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800 }}>Teklif Gönder — Vardiya #{offerModal.shiftId}</div>
          <div className="muted">Birden fazla room seçip tek seferde teklif at. Room puanı listede üstte görünür.</div>
        </div>
        <button type="button" disabled={busy} onClick={onClose}>
          Kapat
        </button>
      </div>

      <hr />

      <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Room ara"
          value={offerModal.q}
          onChange={(e) => onChange({ q: e.target.value })}
          style={{ width: "min(100%, 220px)" }}
        />
        <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={offerModal.onlyHub}
            onChange={(e) => onChange({ onlyHub: e.target.checked })}
          />
          Sadece konumlu
        </label>
      </div>

      <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto" }}>
        {(rooms || [])
          .filter((r) => {
            if (offerModal.onlyHub && !(r?.hubLat != null && r?.hubLng != null)) return false;
            const q = String(offerModal.q || "").trim().toLowerCase();
            if (!q) return true;
            return String(r?.name || "").toLowerCase().includes(q);
          })
          .map((r) => {
            const score = roomScores[String(r.id)] || null;
            return (
              <CompanyOfferRoomCard
                key={r.id}
                room={r}
                selected={Boolean(offerModal.roomIds?.[r.id])}
                score={score}
                onToggle={() => onToggleRoom(r.id)}
              />
            );
          })}
      </div>

      <hr />

      <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div className="col" style={{ width: "min(100%, 180px)" }}>
          <label className="muted">Company Tutar (₺) (opsiyonel)</label>
          <input
            value={offerModal.amountCompany}
            onChange={(e) => onChange({ amountCompany: e.target.value })}
            placeholder="örn 25000"
          />
        </div>
        <div className="col" style={{ flex: "1 1 240px", minWidth: 0 }}>
          <label className="muted">Not (opsiyonel)</label>
          <input
            value={offerModal.noteCompany}
            onChange={(e) => onChange({ noteCompany: e.target.value })}
            placeholder="opsiyonel"
          />
        </div>
        <button type="button" disabled={busy} onClick={onSubmit}>
          {busy ? "..." : "Teklifleri Gönder"}
        </button>
      </div>
    </div>
  );
}


export function CompanyMarketSection({
  sectionRef,
  accOpen,
  onSetOpen,
  onToggle,
  marketItems,
  marketQ,
  onChangeMarketQ,
  marketFocusIds,
  onClearFocus,
  busy,
  searchRef,
  fmtTR,
  copilotShiftId,
  onFocusShift,
  onOpenOfferModal,
  onOpenOffersModal,
  computePackageShiftIds,
}) {
  return (
    <div className="card" ref={sectionRef} role="tabpanel" aria-label="Market">
      <CompanyAccordionHeader
        title="Market Shifts"
        count={marketItems.length}
        description="Room seçilmemiş talepler. Teklifi birden fazla room’a gönder."
        accOpen={accOpen}
        onOpen={(e) => { if (e?.stopPropagation) e.stopPropagation(); onSetOpen(true); }}
        onClose={(e) => { if (e?.stopPropagation) e.stopPropagation(); onSetOpen(false); }}
        onToggle={(e) => { if (e?.stopPropagation) e.stopPropagation(); onToggle(); }}
      />

      {accOpen ? (
        <div style={{ marginTop: 10 }}>
          <CompanyMarketFilters
            marketQ={marketQ}
            onChangeMarketQ={onChangeMarketQ}
            marketFocusIds={marketFocusIds}
            onClearFocus={onClearFocus}
            busy={busy}
            searchRef={searchRef}
          />

          {marketItems.length ? (
            <div className="tableWrap">
              <table className="tbl" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>ID</th><th>Durum</th><th>Başlangıç</th><th>Bitiş</th><th>Teklifler</th>
                  </tr>
                </thead>
                <tbody>
                  {marketItems.map((shift) => (
                    <CompanyMarketRow
                      key={shift.id}
                      shift={shift}
                      busy={busy}
                      fmtTR={fmtTR}
                      copilotShiftId={copilotShiftId}
                      onFocusShift={onFocusShift}
                      onOpenOfferModal={onOpenOfferModal}
                      onOpenOffersModal={onOpenOffersModal}
                      computePackageShiftIds={computePackageShiftIds}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="muted">Market shift yok.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CompanyPendingSection({
  sectionRef,
  accOpen,
  onSetOpen,
  onToggle,
  pendingItems,
  pendingQ,
  onChangePendingQ,
  pendingFocusIds,
  onClearFocus,
  pendingOnlyRoomOffer,
  onChangePendingOnlyRoomOffer,
  busy,
  copilotShiftId,
  onFocusShift,
  roomsById,
  agreementConversionByShift,
  renderRoomOfferSummary,
  renderCompanyOfferSummary,
  onOpenOffersModal,
  onCancelMyRequest,
  fmtTR,
  onOpenExtendModal,
  onOpenPreview,
  onOpenOpsEvents,
  onConvertShiftToAgreement,
}) {
  return (
    <div className="card" ref={sectionRef} role="tabpanel" aria-label="Bekleyen">
      <CompanyAccordionHeader
        title="Bekleyen Talepler"
        count={pendingItems.length}
        description="Pazarlık / karar tamamlanmadan diğer tablara düşmez."
        accOpen={accOpen}
        onOpen={() => onSetOpen(true)}
        onClose={() => onSetOpen(false)}
        onToggle={onToggle}
      />

      {accOpen ? (
        <div style={{ marginTop: 10 }}>
          <CompanyPendingFilters
            pendingQ={pendingQ}
            onChangePendingQ={onChangePendingQ}
            pendingFocusIds={pendingFocusIds}
            onClearFocus={onClearFocus}
            pendingOnlyRoomOffer={pendingOnlyRoomOffer}
            onChangePendingOnlyRoomOffer={onChangePendingOnlyRoomOffer}
            busy={busy}
          />

          {pendingItems.length ? (
            <div className="tableWrap">
              <table className="tbl" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>ID</th><th>Durum</th><th>Oda</th><th>Room Teklifi (R→C)</th><th>Company Teklifi (C→R)</th><th>Pazarlık</th><th>İptal</th><th>Başlangıç</th><th>Bitiş</th><th>Uzat</th><th>Operasyon</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((shift) => (
                    <CompanyPendingRow
                      key={shift.id}
                      shift={shift}
                      busy={busy}
                      fmtTR={fmtTR}
                      copilotShiftId={copilotShiftId}
                      onFocusShift={onFocusShift}
                      roomsById={roomsById}
                      agreementConversion={agreementConversionByShift?.[String(Number(shift.id || 0))] || null}
                      renderRoomOfferSummary={renderRoomOfferSummary}
                      renderCompanyOfferSummary={renderCompanyOfferSummary}
                      onOpenOffersModal={onOpenOffersModal}
                      onCancelMyRequest={onCancelMyRequest}
                      onOpenExtendModal={onOpenExtendModal}
                      onOpenPreview={onOpenPreview}
                      onOpenOpsEvents={onOpenOpsEvents}
                      onConvertShiftToAgreement={onConvertShiftToAgreement}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="muted">Bekleyen talep yok.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CompanyStatusListSection({
  sectionRef,
  accOpen,
  onSetOpen,
  onToggle,
  title,
  description,
  items,
  status,
  onChangeStatus,
  q,
  onChangeQ,
  onClearFilters,
  busy,
  copilotShiftId,
  onFocusShift,
  roomsById,
  agreementConversionByShift,
  renderRoomOfferSummary,
  renderCompanyOfferSummary,
  fmtTR,
  onOpenVehicleDetail,
  onOpenDriverDetail,
  onOpenExtendModal,
  onOpenPreview,
  onOpenOpsEvents,
  onConvertShiftToAgreement,
  emptyLabel,
  searchPlaceholder,
}) {
  return (
    <div className="card" ref={sectionRef} role="tabpanel" aria-label={title}>
      <CompanyAccordionHeader
        title={title}
        count={items.length}
        description={description}
        accOpen={accOpen}
        onOpen={() => onSetOpen(true)}
        onClose={() => onSetOpen(false)}
        onToggle={onToggle}
      />

      {accOpen ? (
        <div style={{ marginTop: 10 }}>
          <CompanyStatusFilters
            status={status}
            onChangeStatus={onChangeStatus}
            q={q}
            onChangeQ={onChangeQ}
            onClearFilters={onClearFilters}
            searchPlaceholder={searchPlaceholder}
          />

          {items.length ? (
            <div className="tableWrap">
              <table className="tbl" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>ID</th><th>Durum</th><th>Oda</th><th>Room Teklifi (R→C)</th><th>Company Teklifi (C→R)</th><th>Atanan Araç</th><th>Sürücü</th><th>Başlangıç</th><th>Bitiş</th><th>Uzat</th><th>Operasyon</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((shift) => (
                    <CompanyFinalListRow
                      key={shift.id}
                      shift={shift}
                      busy={busy}
                      fmtTR={fmtTR}
                      copilotShiftId={copilotShiftId}
                      onFocusShift={onFocusShift}
                      roomsById={roomsById}
                      agreementConversion={agreementConversionByShift?.[String(Number(shift.id || 0))] || null}
                      renderRoomOfferSummary={renderRoomOfferSummary}
                      renderCompanyOfferSummary={renderCompanyOfferSummary}
                      onOpenVehicleDetail={onOpenVehicleDetail}
                      onOpenDriverDetail={onOpenDriverDetail}
                      onOpenExtendModal={onOpenExtendModal}
                      onOpenPreview={onOpenPreview}
                      onOpenOpsEvents={onOpenOpsEvents}
                      onConvertShiftToAgreement={onConvertShiftToAgreement}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="muted">{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CompanyContractSection({
  sectionRef,
  accOpen,
  onSetOpen,
  onToggle,
  contractItems,
  contractStatus,
  onChangeContractStatus,
  contractQ,
  onChangeContractQ,
  onClearFilters,
  busy,
  copilotShiftId,
  onFocusShift,
  roomsById,
  agreementConversionByShift,
  renderRoomOfferSummary,
  renderCompanyOfferSummary,
  fmtTR,
  onOpenVehicleDetail,
  onOpenDriverDetail,
  onOpenExtendModal,
  onOpenPreview,
  onOpenOpsEvents,
  onConvertShiftToAgreement,
}) {
  return (
    <CompanyStatusListSection
      sectionRef={sectionRef}
      accOpen={accOpen}
      onSetOpen={onSetOpen}
      onToggle={onToggle}
      title="Sözleşmeden Üretilen"
      description="Agreement / contract bağlantılı vardiyalar."
      items={contractItems}
      status={contractStatus}
      onChangeStatus={onChangeContractStatus}
      q={contractQ}
      onChangeQ={onChangeContractQ}
      onClearFilters={onClearFilters}
      busy={busy}
      copilotShiftId={copilotShiftId}
      onFocusShift={onFocusShift}
      roomsById={roomsById}
      agreementConversionByShift={agreementConversionByShift}
      renderRoomOfferSummary={renderRoomOfferSummary}
      renderCompanyOfferSummary={renderCompanyOfferSummary}
      fmtTR={fmtTR}
      onOpenVehicleDetail={onOpenVehicleDetail}
      onOpenDriverDetail={onOpenDriverDetail}
      onOpenExtendModal={onOpenExtendModal}
      onOpenPreview={onOpenPreview}
      onOpenOpsEvents={onOpenOpsEvents}
      onConvertShiftToAgreement={onConvertShiftToAgreement}
      emptyLabel="Sözleşmeden üretilen vardiya yok."
      searchPlaceholder="Ara (id / durum / plaka / sürücü / not)"
    />
  );
}

export function CompanyOtherSection({
  sectionRef,
  accOpen,
  onSetOpen,
  onToggle,
  otherItems,
  otherStatus,
  onChangeOtherStatus,
  otherQ,
  onChangeOtherQ,
  onClearFilters,
  busy,
  copilotShiftId,
  onFocusShift,
  roomsById,
  agreementConversionByShift,
  renderRoomOfferSummary,
  renderCompanyOfferSummary,
  fmtTR,
  onOpenVehicleDetail,
  onOpenDriverDetail,
  onOpenExtendModal,
  onOpenPreview,
  onOpenOpsEvents,
  onConvertShiftToAgreement,
}) {
  return (
    <CompanyStatusListSection
      sectionRef={sectionRef}
      accOpen={accOpen}
      onSetOpen={onSetOpen}
      onToggle={onToggle}
      title="Diğer Vardiyalar"
      description="Sözleşmeye bağlı olmayan manuel / guided / normal vardiyalar."
      items={otherItems}
      status={otherStatus}
      onChangeStatus={onChangeOtherStatus}
      q={otherQ}
      onChangeQ={onChangeOtherQ}
      onClearFilters={onClearFilters}
      busy={busy}
      copilotShiftId={copilotShiftId}
      onFocusShift={onFocusShift}
      roomsById={roomsById}
      agreementConversionByShift={agreementConversionByShift}
      renderRoomOfferSummary={renderRoomOfferSummary}
      renderCompanyOfferSummary={renderCompanyOfferSummary}
      fmtTR={fmtTR}
      onOpenVehicleDetail={onOpenVehicleDetail}
      onOpenDriverDetail={onOpenDriverDetail}
      onOpenExtendModal={onOpenExtendModal}
      onOpenPreview={onOpenPreview}
      onOpenOpsEvents={onOpenOpsEvents}
      onConvertShiftToAgreement={onConvertShiftToAgreement}
      emptyLabel="Diğer vardiya yok."
      searchPlaceholder="Ara (id / durum / plaka / sürücü / not)"
    />
  );
}

export function CompanyFinalListSection(props) {
  return CompanyOtherSection(props);
}
