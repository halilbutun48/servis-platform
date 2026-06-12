import { useEffect, useRef } from "react";
import ListSelectionBanner from "../../components/ListSelectionBanner";
import { buildCapacityMeta, formatShiftDateTimeTR as fmtTR } from "./roomShiftsPanelUtils";
import { displayStatusLabel } from "../../utils/displayStatus";
import { RoomPendingShiftRow, RoomAllShiftRow } from "./roomShiftsPanelRows";
import {
  AgreementBadge,
  RoomAvailabilityLine,
  RoomCompanyOfferSummary,
  RoomOfferSummary,
  RoomStatusPill,
  RoomDispatchSuggestionCard,
} from "./roomShiftsPanelCards";
import { RoomPendingShiftCard, RoomAllShiftCard } from "./roomShiftsPanelMobileCards";

export {
  AgreementBadge,
  RoomAvailabilityLine,
  RoomCompanyOfferSummary,
  RoomOfferSummary,
  RoomStatusPill,
};

export function RoomPendingSection({ showTitle = true, pendingStatus, setPendingStatus, pendingQ, setPendingQ, pendingFiltered, ...props }) {
  return (
    <div className="card roomShiftsSectionCard">
      {showTitle ? <h3>Bekleyen Talepler</h3> : null}
      {showTitle ? <div className="muted roomShiftsSectionSubtitle">Firma talebi, Room onayı ve karar bekleyen vardiyalar.</div> : null}
      <div className="toolbarLeft" style={{ marginBottom: 10 }}>
        <select value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value)}>
          <option value="OPEN">Açık (DRAFT + REQUESTED)</option>
          <option value="REQUESTED">Bekliyor</option>
          <option value="DRAFT">Taslak</option>
        </select>
        <input value={pendingQ} onChange={(e) => setPendingQ(e.target.value)} placeholder="Ara (id / şirket / plaka / sürücü / not)" style={{ width: "min(100%, 280px)" }} />
        <button type="button" className="btn sm" onClick={() => { setPendingQ(""); setPendingStatus("OPEN"); }}>Temizle</button>
      </div>
      {pendingFiltered.length ? (
        <>
          <div className="tableWrap desktopShiftTable shiftsDesktopTable shiftsDesktopTable--room-pending">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Şirket</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th>Harita</th>
                <th>Teklif / Pazarlık</th>
                <th>Araç + şoför</th>
                <th>Kabul Et</th>
                <th>Reddet</th>
              </tr>
            </thead>
            <tbody>{pendingFiltered.map((shift) => <RoomPendingShiftRow key={shift.id} shift={shift} {...props} />)}</tbody>
          </table>
          </div>
          <div className="mobileShiftCards shiftsMobileCards">
            {pendingFiltered.map((shift) => <RoomPendingShiftCard key={shift.id} shift={shift} {...props} />)}
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
          <div className="muted">Bekleyen talep yok.</div>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
            Bekleyen kayıt oluşunca Kabul Et ve Reddet aksiyonları burada görünür.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn sm" disabled>Kabul Et</button>
            <button type="button" className="btn sm" disabled>Reddet</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RoomDispatchPoolSummary({
  shift,
  capacityMeta,
  effectiveRoomId = null,
  poolSummary,
  dispatchPreview,
  dispatchEditSel,
  getDispatchSelectionStates,
  items,
  vehiclesForRoom,
  driversForRoom,
  isDriverAvailableForShift,
  isVehicleAvailableForShift,
  selectedDispatchVehicleId,
  selectedDispatchDriverId,
  vehiclesById,
  driversById,
  buildDispatchVirtualShift,
  setDispatchSelection,
  openDispatchSuggestionPreview,
  loadPoolSummary,
  loadDispatchPreview,
  autoSplitApprove,
  busy,
}) {
  const sid = Number(shift?.id);
  const state = poolSummary[sid] || null;
  const data = state?.data || null;
  const comboItems = Array.isArray(data?.suggestedCombo?.items) ? data.suggestedCombo.items : [];
  const dState = dispatchPreview[sid] || null;
  const dData = dState?.data || null;
  const suggestions = Array.isArray(dData?.suggestions) ? dData.suggestions : [];
  const requestedDispatchPreviewRef = useRef(new Set());
  useEffect(() => {
    if (!capacityMeta?.dispatchRequired || !sid) return;
    if (requestedDispatchPreviewRef.current.has(sid)) return;
    requestedDispatchPreviewRef.current.add(sid);
    loadDispatchPreview(shift, { force: false });
  }, [capacityMeta?.dispatchRequired, loadDispatchPreview, shift, sid]);
  const dispatchSelStates = getDispatchSelectionStates({
    shift,
    suggestions,
    dispatchEditSel,
    vehiclesById,
    items,
    vehiclesForRoom,
    isDriverAvailableForShift,
    isVehicleAvailableForShift,
    buildCapacityMeta,
  });
  const roomVehicles = Array.isArray(data?.vehicles) && data.vehicles.length
    ? data.vehicles.filter((v) => v?.vehicleOk && Number(v.capacity || 0) > 0)
    : vehiclesForRoom(effectiveRoomId ?? shift?.roomId);
  const roomDrivers = Array.isArray(data?.drivers) && data.drivers.length
    ? data.drivers.filter((d) => d?.driverOk)
    : driversForRoom(effectiveRoomId ?? shift?.roomId);
  const dispatchSelectionRows = suggestions.map((part) => ({
    part,
    state: dispatchSelStates?.[Number(part?.splitIndex || 0)] || { status: "missing", code: "SELECT_REQUIRED", message: "Araç ve şoför seç." },
  }));
  const dispatchApplyIssue = dispatchSelectionRows.find(({ state }) => state?.status !== "ok") || null;
  const dispatchCanApply = suggestions.length > 0 && !dispatchApplyIssue;
  const dispatchApplyMessage = !suggestions.length
    ? "Önce bölme önizlemesi oluştur."
    : dispatchApplyIssue?.state?.message || "Tüm öneriler hazır.";
  const showDispatchApplyAction = Boolean(data);

  return (
    <div className="card roomShiftsDispatchPoolCard" style={{ padding: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div className="muted"><b>Room havuz özeti</b></div>
        <button
          type="button"
          className="btn sm"
          disabled={busy || state?.status === "loading"}
          onClick={() => loadPoolSummary(shift, { force: true })}
        >
          {state?.status === "loading" ? "Yükleniyor..." : data ? "Yenile" : "Yükle"}
        </button>
      </div>

      {state?.status === "error" ? (
        <div className="muted" style={{ marginTop: 8 }}>
          <b>Hata:</b> {state.error}
        </div>
      ) : null}

      {data ? (
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>
              <b>Durum:</b>{" "}
              <span className="pill" data-status={data.enoughPoolCapacity ? "OK" : "REJECTED"}>
                {data.enoughPoolCapacity ? "HAVUZ YETER" : "HAVUZ YETMEZ"}
              </span>
            </span>
            <span>• <b>Müsait araç:</b> {data.vehicles?.filter?.((x) => x.vehicleOk)?.length || 0}/{data.roomVehicleCount || 0}</span>
            <span>• <b>Boş şoför:</b> {data.freeDriverCount || 0}</span>
            <span>• <b>Toplam eşleşebilir koltuk:</b> {data.totalPairCapacity || 0}</span>
            {!data.enoughPoolCapacity ? <span>• <b>Eksik:</b> {data.missingPoolCapacity || 0}</span> : null}
          </div>

          {showDispatchApplyAction ? (
            <div className="roomShiftsDispatchApplyRow">
              <button
                type="button"
                className="btn roomActionCTA"
                disabled={busy || !dispatchCanApply}
                onClick={() => autoSplitApprove(shift)}
              >
                Önizlemeyi Uygula: Böl & Onayla
              </button>
              <div className="roomShiftsDispatchApplyHint">
                Önizleme ile aynı bölme planı uygulanır; seçtiğin araç ve şoför eşleşmeleri kullanılır.
              </div>
              <div className={`roomShiftsDispatchApplyState ${dispatchCanApply ? "roomShiftsDispatchApplyState--ok" : "roomShiftsDispatchApplyState--error"}`}>
                {!dispatchCanApply ? dispatchApplyMessage : "Tüm öneriler hazır. Önizlemeyi uygulayabilirsin."}
              </div>
            </div>
          ) : null}

          {comboItems.length ? (
            <div className="muted">
              <b>Önerilen kombinasyon:</b>{" "}
              {comboItems.map((x) => `${x.plate} (${x.capacity}${x?.allocatedPax ? ` → ${x.allocatedPax} kişi` : ""})${x?.suggestedDriver?.fullName ? ` → ${x.suggestedDriver.fullName}` : ""}`).join(" + ")}
            </div>
          ) : (
            <div className="muted">
              Öneri üretilemedi. Room havuzunda bu zaman için uygun araç/şoför çifti bulunamadı.
            </div>
          )}

          {data?.enoughPoolCapacity && Number(data?.suggestedCombo?.vehicleCount || 0) > 1 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="btn sm"
                disabled={busy || dState?.status === "loading"}
                onClick={() => loadDispatchPreview(shift, { force: true })}
              >
                {dState?.status === "loading" ? "Önizleme hazırlanıyor..." : suggestions.length ? "Bölme önizlemesini yenile" : "Bölme önizlemesi oluştur"}
              </button>
              <div className="muted" style={{ fontSize: 12 }}>
                Yakın kişileri aynı araca toplamayı dener, sonra araç bazlı durak sırasını OSRM + solver ile iyileştirir.
              </div>
            </div>
          ) : null}

          {dState?.status === "error" ? (
            <div className="muted" style={{ color: "#b42318" }}>
              <b>Bölme önizleme hatası:</b> {dState.error}
            </div>
          ) : null}

          {suggestions.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {suggestions.map((part) => (
                <RoomDispatchSuggestionCard
                  key={`dispatch-${sid}-${part.splitIndex}`}
                  sid={sid}
                  shift={shift}
                  part={part}
                  roomVehicles={roomVehicles}
                  roomDrivers={roomDrivers}
                  vehiclesById={vehiclesById}
                  driversById={driversById}
                  buildDispatchVirtualShift={buildDispatchVirtualShift}
                  selectedDispatchVehicleId={selectedDispatchVehicleId}
                  selectedDispatchDriverId={selectedDispatchDriverId}
                  dispatchSelStates={dispatchSelStates}
                  setDispatchSelection={setDispatchSelection}
                  openDispatchSuggestionPreview={openDispatchSuggestionPreview}
                />
              ))}
            </div>
          ) : null}

          <div className="muted">
            <b>Min araç ihtiyacı:</b> {data?.suggestedCombo?.vehicleCount || capacityMeta?.roomMinVehicleCount || "-"}
            {data?.suggestedCombo?.totalCapacity ? ` • öneri toplam koltuk: ${data.suggestedCombo.totalCapacity}` : ""}
            {Number(data?.suggestedCombo?.overflowCapacity || 0) > 0 ? ` • taşma: ${data.suggestedCombo.overflowCapacity}` : ""}
          </div>
        </div>
      ) : state?.status === "loading" ? (
        <div className="muted" style={{ marginTop: 8 }}>Room havuz özeti hesaplanıyor…</div>
      ) : (
        <div className="muted" style={{ marginTop: 8 }}>
          Çoklu araç/şoför havuzunu görmek için yükle.
        </div>
      )}
    </div>
  );
}
export function RoomFinalListSection({
  showTitle = true,
  title = "Vardiyalar",
  description = "",
  listQ,
  setListQ,
  copilotShift,
  listFiltered,
  items,
  emptyText = "Kayıt yok.",
  searchPlaceholder = "Ara (id / şirket / plaka / sürücü / not)",
  ...props
}) {
  const splitEligibleShift = Number(copilotShift?.splitRootId || 0) > 0
    ? copilotShift
    : (Array.isArray(items) ? items.find((shift) => Number(shift?.splitRootId || 0) > 0) || null : null);

  return (
    <div className="card roomShiftsSectionCard">
      {showTitle ? <h3>{title}</h3> : null}
      {showTitle && description ? <div className="muted roomShiftsSectionSubtitle">{description}</div> : null}
      <div className="toolbarLeft" style={{ marginBottom: 10 }}>
        <input value={listQ} onChange={(e) => setListQ(e.target.value)} placeholder={searchPlaceholder} style={{ width: "min(100%, 320px)" }} />
        <button type="button" className="btn sm" onClick={() => { setListQ(""); }}>Temizle</button>
      </div>
      {splitEligibleShift ? (
        <div className="roomShiftsDispatchApplyRow" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className="btn roomActionCTA"
            disabled
            title={`Bu önizleme ayrı onay akışından uygulanır. Split vardiya #${splitEligibleShift.id} hazır`}
          >
            Önizlemeyi Uygula: Böl &amp; Onayla
          </button>
          <div className="roomShiftsDispatchApplyHint">
            Önizleme ile aynı bölme planı uygulanır; seçtiğin araç ve şoför eşleşmeleri kullanılır.
          </div>
          <div className="roomShiftsDispatchApplyState roomShiftsDispatchApplyState--ok">
            Tüm öneriler hazır. Önizlemeyi uygulayabilirsin.
          </div>
        </div>
      ) : null}
      <ListSelectionBanner
        selectedLabel={copilotShift ? `Vardiya ID ${copilotShift.id}` : ""}
        selectedSummary={copilotShift ? [displayStatusLabel(copilotShift?.status) || "-", fmtTR(copilotShift?.startAt), fmtTR(copilotShift?.endAt)].filter(Boolean).join(" • ") : ""}
        visibleCount={listFiltered.length}
        totalCount={items.length}
        filterValue={String(listQ || "").trim()}
        onClearFilter={() => { setListQ(""); }}
        helper="Copilot seçili vardiyayı kullanır."
      />
      {listFiltered.length ? (
        <>
          <div className="tableWrap desktopShiftTable shiftsDesktopTable shiftsDesktopTable--room-final">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Durum</th>
                <th>Şirket</th>
                <th>Teklifler</th>
                <th>Araç</th>
                <th>Sürücü</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th>Uzatma</th>
                <th>Operasyon</th>
              </tr>
            </thead>
            <tbody>{listFiltered.map((shift) => <RoomAllShiftRow key={shift.id} shift={shift} {...props} />)}</tbody>
          </table>
          </div>
          <div className="mobileShiftCards shiftsMobileCards">
            {listFiltered.map((shift) => <RoomAllShiftCard key={shift.id} shift={shift} {...props} />)}
          </div>
        </>
      ) : (
        <div className="muted">{emptyText}</div>
      )}
    </div>
  );
}
