import ListSelectionBanner from "../../components/ListSelectionBanner";
import { formatShiftDateTimeTR as fmtTR } from "./roomShiftsPanelUtils";
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

export {
  AgreementBadge,
  RoomAvailabilityLine,
  RoomCompanyOfferSummary,
  RoomOfferSummary,
  RoomStatusPill,
};

export function RoomPendingSection({ pendingStatus, setPendingStatus, pendingQ, setPendingQ, pendingFiltered, ...props }) {
  return (
    <div className="card">
      <h3>Bekleyen Talepler</h3>
      <div className="muted" style={{ marginBottom: 8 }}>Firma request / room approval / karar bekleyen vardiya talepleri.</div>
      <div className="toolbarLeft" style={{ marginBottom: 10 }}>
        <select value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value)}>
          <option value="OPEN">Açık (DRAFT + REQUESTED)</option>
          <option value="REQUESTED">Bekliyor</option>
          <option value="DRAFT">Taslak</option>
        </select>
        <input value={pendingQ} onChange={(e) => setPendingQ(e.target.value)} placeholder="Ara (id / şirket / plaka / sürücü / not)" style={{ minWidth: 280 }} />
        <button type="button" className="btn sm" onClick={() => { setPendingQ(""); setPendingStatus("OPEN"); }}>Temizle</button>
      </div>
      {pendingFiltered.length ? (
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Şirket</th>
              <th>Başlangıç</th>
              <th>Bitiş</th>
              <th>Harita</th>
              <th>Teklif / Pazarlık</th>
              <th>Vehicle + Driver</th>
              <th>Kabul Et</th>
              <th>Reddet</th>
            </tr>
          </thead>
          <tbody>{pendingFiltered.map((shift) => <RoomPendingShiftRow key={shift.id} shift={shift} {...props} />)}</tbody>
        </table>
      ) : (
        <div className="muted">Bekleyen talep yok.</div>
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
  getDispatchSelectionStates,
  vehiclesForRoom,
  driversForRoom,
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
  const dispatchSelStates = getDispatchSelectionStates(shift, suggestions);
  const roomVehicles = Array.isArray(data?.vehicles) && data.vehicles.length
    ? data.vehicles.filter((v) => v?.vehicleOk && Number(v.capacity || 0) > 0)
    : vehiclesForRoom(effectiveRoomId ?? shift?.roomId);
  const roomDrivers = Array.isArray(data?.drivers) && data.drivers.length
    ? data.drivers.filter((d) => d?.driverOk)
    : driversForRoom(effectiveRoomId ?? shift?.roomId);
  const dispatchCanApply = suggestions.length > 0 && suggestions.every((part) => dispatchSelStates?.[Number(part?.splitIndex || 0)]?.status === "ok");

  return (
    <div className="card" style={{ padding: 10 }}>
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
            <span>• <b>Boş driver:</b> {data.freeDriverCount || 0}</span>
            <span>• <b>Toplam eşleşebilir koltuk:</b> {data.totalPairCapacity || 0}</span>
            {!data.enoughPoolCapacity ? <span>• <b>Eksik:</b> {data.missingPoolCapacity || 0}</span> : null}
          </div>

          {comboItems.length ? (
            <div className="muted">
              <b>Önerilen kombinasyon:</b>{" "}
              {comboItems.map((x) => `${x.plate} (${x.capacity}${x?.allocatedPax ? ` → ${x.allocatedPax} kişi` : ""})${x?.suggestedDriver?.fullName ? ` → ${x.suggestedDriver.fullName}` : ""}`).join(" + ")}
            </div>
          ) : (
            <div className="muted">
              Öneri üretilemedi. Room havuzunda bu zaman için uygun araç/driver çifti bulunamadı.
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
                {dState?.status === "loading" ? "Önizleme hazırlanıyor..." : suggestions.length ? "Dispatch Önizlemeyi Yenile" : "Dispatch Önizleme Oluştur"}
              </button>
              <div className="muted" style={{ fontSize: 12 }}>
                Yakın kişileri aynı araca toplamayı dener, sonra araç bazlı durak sırasını OSRM + solver ile iyileştirir.
              </div>
            </div>
          ) : null}

          {dState?.status === "error" ? (
            <div className="muted" style={{ color: "#b42318" }}>
              <b>Dispatch önizleme hatası:</b> {dState.error}
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

          {data?.enoughPoolCapacity && Number(data?.suggestedCombo?.vehicleCount || 0) > 1 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="btn" disabled={busy || !dispatchCanApply} onClick={() => autoSplitApprove(shift)}>
                Önizlemeyi Uygula: Böl & Onayla
              </button>
              <div className="muted" style={{ fontSize: 12 }}>
                Dispatch önizleme ile aynı geo-temelli bölme planı uygulanır; seçtiğin araç/şoför eşleşmeleri kullanılır.
              </div>
              {!dispatchCanApply ? <div className="muted" style={{ color: "#b42318", fontSize: 12 }}>Önce tüm önerilerde uygun araç ve şoför seçimini tamamla.</div> : null}
            </div>
          ) : null}
        </div>
      ) : state?.status === "loading" ? (
        <div className="muted" style={{ marginTop: 8 }}>Room havuz özeti hesaplanıyor…</div>
      ) : (
        <div className="muted" style={{ marginTop: 8 }}>
          Çoklu araç/driver havuzunu görmek için yükle.
        </div>
      )}
    </div>
  );
}
export function RoomFinalListSection({
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
  return (
    <div className="card">
      <h3>{title}</h3>
      {description ? <div className="muted" style={{ marginBottom: 8 }}>{description}</div> : null}
      <div className="toolbarLeft" style={{ marginBottom: 10 }}>
        <input value={listQ} onChange={(e) => setListQ(e.target.value)} placeholder={searchPlaceholder} style={{ minWidth: 320 }} />
        <button type="button" className="btn sm" onClick={() => { setListQ(""); }}>Temizle</button>
      </div>
      <ListSelectionBanner
        selectedLabel={copilotShift ? `Vardiya #${copilotShift.id}` : ""}
        selectedSummary={copilotShift ? [displayStatusLabel(copilotShift?.status) || "-", fmtTR(copilotShift?.startAt), fmtTR(copilotShift?.endAt)].filter(Boolean).join(" • ") : ""}
        visibleCount={listFiltered.length}
        totalCount={items.length}
        filterValue={String(listQ || "").trim()}
        onClearFilter={() => { setListQ(""); }}
        helper="Copilot seçili vardiyayı kullanır."
      />
      {listFiltered.length ? (
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
      ) : (
        <div className="muted">{emptyText}</div>
      )}
    </div>
  );
}
