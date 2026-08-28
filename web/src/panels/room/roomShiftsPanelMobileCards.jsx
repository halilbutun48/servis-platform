import { navigate } from "../../router";
import { rowSelectionStyle } from "../../utils/listUi";
import { displayStatusLabel } from "../../utils/displayStatus";
import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";
import {
  buildCapacityMeta,
  formatShiftDateTimeTR as fmtTR,
  vehicleMetaLine,
} from "./roomShiftsPanelUtils";
import {
  AgreementBadge,
  RoomAvailabilityLine,
} from "./roomShiftsPanelCards";
import {
  ShiftCardDetails,
  ShiftCardOtherActions,
  ShiftCardPrimaryAction,
  ShiftCommercialSummary,
  ShiftOfferDetails,
  ShiftLifecycle,
} from "../shared/CommercialShiftCardPresentation";

function stopCardClick(e) {
  e.stopPropagation();
}

function Field({ label, value, wide = false }) {
  return (
    <div className={`shiftCardField${wide ? " shiftCardField--wide" : ""}`}>
      <div className="shiftCardFieldLabel">{label}</div>
      <div className="shiftCardFieldValue">{value}</div>
    </div>
  );
}

function CardSection({ title, children, onClick = null }) {
  return (
    <div className="shiftCardSection" onClick={onClick || stopCardClick}>
      <div className="shiftCardSectionTitle">{title}</div>
      {children}
    </div>
  );
}

function ActionGroup({ children, note = null }) {
  return (
    <ShiftCardOtherActions className="shiftActionGroup" note={note}>{children}</ShiftCardOtherActions>
  );
}

function CardHeader({ shift, selected, children }) {
  return (
    <div className="shiftCardHeader">
      <div className="shiftCardHeaderMain">
        <div className="shiftCardTitleRow">
          <div className="shiftCardTitle">Vardiya ID {shift.id}</div>
          {children}
        </div>
        {Number(shift.splitRootId || 0) > 0 ? (
          <div className="shiftCardSubtle" style={{ marginTop: 4 }}>
            Paket ID {shift.splitRootId}
            {Number(shift.splitIndex || 0) > 0 && Number(shift.splitTotal || 0) > 0 ? ` • ${shift.splitIndex}/${shift.splitTotal}` : ""}
          </div>
        ) : null}
      </div>
      {selected ? <span className="shiftCardSelectionHint" data-selected="true">Seçili</span> : null}
    </div>
  );
}

function CardShell({ selected, children, onClick, shiftId }) {
  return (
    <article
      className="card shiftCard shiftMobileCard"
      data-testid="commercial-shift-card"
      data-shift-id={shiftId}
      data-perspective="room"
      style={{ ...rowSelectionStyle(selected), overflow: "visible" }}
      onClick={onClick}
    >
      {children}
    </article>
  );
}

export function RoomPendingShiftCard({
  shift,
  offersByShiftId,
  effectiveShiftRoomId,
  vehiclesForRoom,
  assignSel,
  vehiclesById,
  showAvailableOnly,
  isVehicleAvailableForShift,
  driversById,
  driverSel,
  avail,
  busy,
  openRoutePreview,
  renderPoolSummary,
  setAssignSel,
  setDriverSel,
  drivers,
  uiCopyVehicleToPkg,
  uiCopyDriverToPkg,
  toggleAvailable,
  roomsById,
  approveShift,
  rejectShift,
  setFocusedTrackShiftId,
  copilotShiftId,
}) {
  const sid = Number(shift.id);
  const marketOffer = offersByShiftId.get(sid) || null;
  const effectiveRoomId = effectiveShiftRoomId(shift, marketOffer);
  const isAgreement = Number(shift?.agreementId) > 0;
  const roomVehicles = vehiclesForRoom(effectiveRoomId);
  const selectedVehicleId = assignSel[sid] || "";
  const vId = selectedVehicleId ? Number(selectedVehicleId) : null;
  const selectedVehicle = vId ? vehiclesById.get(vId) : null;
  const onlyAvail = Boolean(showAvailableOnly[sid]);
  const availVehicles = roomVehicles.filter((v) => isVehicleAvailableForShift(v.id, shift));
  const dropdownVehicles = onlyAvail ? availVehicles : roomVehicles;
  const availCount = availVehicles.length;
  const autoDriverId = selectedVehicle?.driverId ? Number(selectedVehicle.driverId) : null;
  const autoDriverName = autoDriverId && driversById.get(autoDriverId) ? driversById.get(autoDriverId).fullName : autoDriverId ? `Sürücü ID ${autoDriverId}` : "-";
  const selD = driverSel[sid] ?? "";
  const manualDriverId = selD ? Number(selD) : null;
  const effDriverId = manualDriverId ?? autoDriverId ?? null;
  const capacityMeta = buildCapacityMeta({ shift, vehicle: selectedVehicle, roomVehicles });
  const availability = avail[sid];
  const offerSummaryShift = marketOffer ? {
    ...shift,
    companyOfferAmount: marketOffer.amountCompany,
    roomOfferAmount: marketOffer.amountRoom,
    roomOfferDecision: marketOffer.status,
    companyOfferNote: marketOffer.noteCompany,
    roomOfferNote: marketOffer.noteRoom,
  } : shift;
  const approveDisabled =
    busy ||
    !vId ||
    !effDriverId ||
    capacityMeta.insufficient ||
    availability?.status === "checking" ||
    availability?.status === "conflict" ||
    availability?.status === "error";
  const approveReason = !vId
    ? "Araç seç."
    : !effDriverId
      ? "Sürücü seç."
      : capacityMeta.blockCode
        ? capacityMeta.blockMessage
        : availability?.status === "checking"
          ? "Kontrol ediliyor."
          : availability?.status === "conflict"
            ? "Çakışma var."
            : availability?.status === "error"
              ? "Uygunluk hatası."
              : "";
  const selected = Number(copilotShiftId || 0) === Number(shift?.id || 0);
  return (
    <CardShell selected={selected} shiftId={shift?.id} onClick={() => setFocusedTrackShiftId(Number(shift?.id || 0) || null)}>
      <CardHeader shift={shift} selected={selected}>
        <span className="pill" data-status={shift.status}>
          {displayStatusLabel(shift.status)}
        </span>
        <AgreementBadge agreementId={shift.agreementId} />
      </CardHeader>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field
          label="Hizmet Alan Firma"
          value={
            <div className="shiftCardValueStack">
              <div>{shift.company?.name || "Bilgi yok"}</div>
              {hasRegionOwnership(shift.company) ? <div className="shiftCardSubtle">{formatRegionOwnership(shift.company)}</div> : null}
            </div>
          }
          wide
        />
        <Field
          label="Araç"
          value={<div className="shiftCardValueStack"><div>{selectedVehicle?.plate || "-"}</div>{hasRegionOwnership(selectedVehicle) ? <div className="shiftCardSubtle">{formatRegionOwnership(selectedVehicle)}</div> : null}</div>}
        />
        <Field
          label="Sürücü"
          value={<div className="shiftCardValueStack"><div>{driversById.get(Number(effDriverId))?.fullName || "-"}</div></div>}
        />
        <Field label="Başlangıç" value={fmtTR(shift.startAt)} />
        <Field label="Bitiş" value={fmtTR(shift.endAt)} />
      </div>

      <ShiftCommercialSummary shift={shift} />
      <ShiftLifecycle shift={shift} />
      <ShiftCardPrimaryAction
        label="Kabul Et"
        disabled={approveDisabled}
        onClick={(e) => {
          stopCardClick(e);
          approveShift(shift);
        }}
        note={approveReason || null}
      />
      <ShiftCardDetails>
        <CardSection title="Teklif ayrıntıları">
          {isAgreement ? <div className="shiftCardSubtle">Sözleşmeli vardiya. Pazarlık kapalı.</div> : <ShiftOfferDetails shift={offerSummaryShift} />}
        </CardSection>

      <CardSection title="Araç + şoför" onClick={stopCardClick}>
        {capacityMeta.dispatchRequired ? (
          <div className="shiftCardInfoBlock">
            <div className="roomInlineNotice roomInlineNotice--warn">
              <div style={{ fontWeight: 800 }}>Bölme modu aktif</div>
              <div>Bu kayıt çok araçlı plan gerektiriyor. Araç ve şoför seçimini aşağıdaki öneri kartlarından yap.</div>
            </div>
            {renderPoolSummary(shift, capacityMeta, effectiveRoomId)}
          </div>
        ) : (
          <div className="shiftCardControlGrid">
            <label className="shiftCardControl">
              <span className="shiftCardFieldLabel">Araç</span>
              <select
                value={selectedVehicleId}
                onClick={stopCardClick}
                onChange={async (e) => {
                  const val = e.target.value;
                  setAssignSel((p) => ({ ...p, [sid]: val }));
                  const hadManual = Boolean(driverSel[sid]);
                  if (!hadManual) {
                    const vid = val ? Number(val) : null;
                    const vv = vid ? vehiclesById.get(vid) : null;
                    if (vv?.driverId) setDriverSel((p) => ({ ...p, [sid]: String(vv.driverId) }));
                  }
                }}
                disabled={busy}
              >
                <option value="">— araç seç —</option>
                {dropdownVehicles.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.plate} • {vehicleMetaLine(v)}
                    {hasRegionOwnership(v) ? ` • ${formatRegionOwnership(v).replace(/^Bölge:\s*/, "")}` : ""}
                    {` (Araç ID ${v.id})`}
                  </option>
                ))}
              </select>
            </label>

            <label className="shiftCardControl">
              <span className="shiftCardFieldLabel">Şoför</span>
              <select
                value={driverSel[sid] ?? ""}
                onClick={stopCardClick}
                onChange={(e) => setDriverSel((p) => ({ ...p, [sid]: e.target.value }))}
                disabled={busy}
              >
                <option value="">Seç (opsiyonel)</option>
                {drivers
                  .filter((d) => !d?.roomId || Number(d.roomId) === Number(shift.roomId))
                  .map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.fullName || d.name || `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || `Şoför ID ${d.id}`}
                      {hasRegionOwnership(d) ? ` • ${formatRegionOwnership(d).replace(/^Bölge:\s*/, "")}` : ""}
                    </option>
                  ))}
              </select>
            </label>

            <div className="shiftCardActions">
              <button
                type="button"
                className="btn sm"
                disabled={busy || !selectedVehicleId}
                onClick={(e) => {
                  stopCardClick(e);
                  uiCopyVehicleToPkg(shift, selectedVehicleId);
                }}
                title="Seçili aracı aynı paket içindeki diğer satırlara kopyalar (sadece UI)"
              >
                Araç → Pakete Kopyala
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={busy || !(driverSel[sid] ?? "")}
                onClick={(e) => {
                  stopCardClick(e);
                  uiCopyDriverToPkg(shift, driverSel[sid] ?? "");
                }}
                title="Seçili şoförü aynı paket içindeki diğer satırlara kopyalar (sadece UI)"
              >
                Şoför → Pakete Kopyala
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={busy}
                onClick={(e) => {
                  stopCardClick(e);
                  toggleAvailable(sid);
                }}
              >
                {onlyAvail ? `Tüm Araçları Göster (${roomVehicles.length})` : `Müsait Araçları Göster (${availCount})`}
              </button>
            </div>

            <div className="shiftCardSubtle">Not: Bu butonlar sadece dropdown değerlerini kopyalar; backend’e kayıt atmaz.</div>
            <RoomAvailabilityLine shift={shift} vehicleId={vId} driverId={effDriverId} autoDriverName={autoDriverName} availability={availability || null} selectedVehicle={selectedVehicle || null} roomVehicles={roomVehicles} roomsById={roomsById} />
          </div>
        )}
      </CardSection>

      {capacityMeta.dispatchRequired ? null : (
        <CardSection title="İşlem özetleri">
          <div className="shiftCardSubtle">
            Uygunluk:{" "}
            {availability?.status === "ok"
              ? "Hazır"
              : availability?.status === "checking"
                ? "Kontrol ediliyor"
                : availability?.status === "conflict"
                  ? "Çakışma var"
                  : availability?.status === "error"
                    ? "Hata"
                    : "Araç/şoför seç"}
          </div>
        </CardSection>
      )}
      </ShiftCardDetails>

      <ActionGroup>
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            openRoutePreview(shift);
          }}
          title="Rota ve durakları haritada önizle"
        >
          Rota Önizleme
        </button>
        {!isAgreement ? (
          <button
            type="button"
            className="btn sm"
            disabled={busy}
            onClick={(e) => {
              stopCardClick(e);
              navigate("/room/offers");
            }}
          >
            Tekliflere Git
          </button>
        ) : null}
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            rejectShift(shift);
          }}
        >
          Reddet
        </button>
      </ActionGroup>

    </CardShell>
  );
}

export function RoomAllShiftCard({
  shift,
  vehiclesById,
  driversById,
  setFocusedTrackShiftId,
  copilotShiftId,
  extendNoteSel,
  setExtendNote,
  busy,
  decideExtend,
  openOpsEvents,
  openReassignModal,
  openRoutePreview,
}) {
  const vehicle = shift.vehicle || (shift.vehicleId ? vehiclesById.get(Number(shift.vehicleId)) || null : null);
  const driver = shift.driver || (shift.driverId ? driversById?.get(Number(shift.driverId)) || null : null);
  const selected = Number(copilotShiftId || 0) === Number(shift?.id || 0);
  const canReassign = String(shift.status || "").toUpperCase() === "APPROVED" || String(shift.status || "").toUpperCase() === "ACTIVE";
  const extendRequested = Boolean(shift.extendRequestedEndAt && String(shift.extendDecision || "PENDING") === "PENDING");
  const primaryLabel = canReassign ? "Atamayı Değiştir" : "Rota Önizleme";
  const handlePrimaryAction = (e) => {
    stopCardClick(e);
    if (canReassign) openReassignModal(shift);
    else openRoutePreview?.(shift);
  };

  return (
    <CardShell selected={selected} shiftId={shift?.id} onClick={() => setFocusedTrackShiftId(Number(shift?.id || 0) || null)}>
      <CardHeader shift={shift} selected={selected}>
        <span className="pill" data-status={shift.status}>
          {displayStatusLabel(shift.status)}
        </span>
        <AgreementBadge agreementId={shift.agreementId} />
      </CardHeader>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field
          label="Hizmet Alan Firma"
          value={
            <div className="shiftCardValueStack">
              <div>{shift.company?.name || "Bilgi yok"}</div>
              {hasRegionOwnership(shift.company) ? <div className="shiftCardSubtle">{formatRegionOwnership(shift.company)}</div> : null}
            </div>
          }
          wide
        />
        <Field
          label="Araç"
          value={<div className="shiftCardValueStack"><div>{vehicle?.plate || "-"}</div>{hasRegionOwnership(vehicle) ? <div className="shiftCardSubtle">{formatRegionOwnership(vehicle)}</div> : null}</div>}
        />
        <Field
          label="Sürücü"
          value={<div className="shiftCardValueStack"><div>{driver?.fullName || "-"}</div>{hasRegionOwnership(driver) ? <div className="shiftCardSubtle">{formatRegionOwnership(driver)}</div> : null}</div>}
        />
        <Field label="Başlangıç" value={fmtTR(shift.startAt)} />
        <Field label="Bitiş" value={fmtTR(shift.endAt)} />
      </div>

      <ShiftCommercialSummary shift={shift} />
      <ShiftLifecycle shift={shift} />
      <ShiftCardPrimaryAction label={primaryLabel} disabled={busy} onClick={handlePrimaryAction} />
      <ShiftCardDetails>
        <CardSection title="Teklif ayrıntıları">
          {Number(shift?.agreementId) > 0 ? <div className="shiftCardSubtle">Sözleşmeli vardiya. Pazarlık kapalı.</div> : <ShiftOfferDetails shift={shift} />}
        </CardSection>

      {extendRequested ? (
        <CardSection title="Uzatma talebi" onClick={stopCardClick}>
          <div className="shiftCardInfoBlock">
            <div className="shiftCardSubtle" title={String(shift.extendRequestedEndAt)}>
              Talep: <b>{fmtTR(shift.extendRequestedEndAt)}</b>
            </div>
            <input
              placeholder="Not (opsiyonel)"
              value={extendNoteSel[Number(shift.id)] || ""}
              onClick={stopCardClick}
              onChange={(e) => setExtendNote(shift.id, e.target.value)}
            />
            <div className="shiftCardActions">
              <button
                type="button"
                className="btn sm"
                disabled={busy}
                onClick={(e) => {
                  stopCardClick(e);
                  decideExtend(shift.id, "ACCEPTED");
                }}
              >
                Kabul
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={busy}
                onClick={(e) => {
                  stopCardClick(e);
                  decideExtend(shift.id, "REJECTED");
                }}
              >
                Reddet
              </button>
            </div>
          </div>
        </CardSection>
      ) : null}
      </ShiftCardDetails>

      <ActionGroup note={!canReassign ? "Atamayı Değiştir yalnızca APPROVED / ACTIVE vardiyalarda." : null}>
        {canReassign ? (
          <button
            type="button"
            className="btn sm"
            disabled={busy}
            onClick={(e) => {
              stopCardClick(e);
              openRoutePreview?.(shift);
            }}
          >
            Rota Önizleme
          </button>
        ) : null}
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            openOpsEvents(shift.id);
          }}
        >
          İşlem Kaydı
        </button>
      </ActionGroup>
    </CardShell>
  );
}
