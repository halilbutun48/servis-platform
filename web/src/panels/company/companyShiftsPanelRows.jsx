import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import { rowSelectionStyle } from "../../utils/listUi";
import { displayStatusLabel } from "../../utils/displayStatus";
import { roomLabel } from "./shiftsPanelOfferUtils";

export function AgreementBadge({ agreementId }) {
  const id = Number(agreementId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return (
    <span
      className="pill"
      data-status="AGREEMENT"
      title="Sözleşmeye bağlı vardiya"
      style={{ marginLeft: 8 }}
    >
      Sözleşme #{id}
    </span>
  );
}

function clickableInfoStyle(disabled = false) {
  return {
    padding: 0,
    border: 0,
    background: "transparent",
    color: disabled ? "inherit" : "#9ecbff",
    cursor: disabled ? "default" : "pointer",
    textDecoration: disabled ? "none" : "underline",
    font: "inherit",
  };
}

function CompanyRoomCell({ shift, room }) {
  return (
    <td className="muted">
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <span>{room ? `${roomLabel(room)} (#${room.id})` : `#${shift.roomId}`}</span>
        </div>
      </div>
    </td>
  );
}

function CompanyExtendCell({ shift, busy, fmtTR, onOpenExtendModal, onOpenPreview }) {
  const status = String(shift.status || "").toUpperCase();
  const canExtend = status === "APPROVED" || status === "ACTIVE";
  return (
    <td>
      {shift.extendRequestedEndAt ? (
        <div style={{ display: "grid", gap: 6 }}>
          <span className="pill" data-status={shift.extendDecision || "PENDING"}>{displayStatusLabel(shift.extendDecision || "PENDING")}</span>
          <div className="muted" title={String(shift.extendRequestedEndAt)}>Talep: {fmtTR(shift.extendRequestedEndAt)}</div>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={busy || !canExtend}
            onClick={() => onOpenExtendModal(shift)}
          >
            Süre Uzat
          </button>
          <button type="button" className="btn sm" disabled={busy} onClick={() => onOpenPreview(shift.id)}>Harita / Navigasyon Önizle</button>
        </>
      )}
    </td>
  );
}

function agreementConversionTitle(agreementConversion) {
  const agreementId = Number(agreementConversion?.agreementId || 0);
  const status = String(agreementConversion?.status || "").toUpperCase();
  return agreementId ? `Sözleşme #${agreementId}${status ? ` • ${status}` : ""}` : "";
}

function CompanyOpsCell({ busy, shift, agreementConversion, onOpenOpsEvents, onConvertShiftToAgreement }) {
  const hasAgreement = Number(shift?.agreementId || 0) > 0;
  const conversionState = String(agreementConversion?.state || "");
  const conversionTitle = agreementConversionTitle(agreementConversion);
  const hasPendingAgreementRequest = conversionState === "pending";
  const hasLinkedAgreementRequest = conversionState === "linked";
  const hadClosedAgreementRequest = conversionState === "closed";
  const canConvert = Number(shift?.roomId || 0) > 0 && !hasAgreement && !hasPendingAgreementRequest && !hasLinkedAgreementRequest;
  return (
    <td>
      <div style={{ display: "grid", gap: 8 }}>
        <button type="button" className="btn sm" disabled={busy} onClick={() => onOpenOpsEvents(shift?.id)}>Operasyon Kaydı</button>
        {hasAgreement || hasLinkedAgreementRequest ? (
          <span
            className="pill"
            data-status="AGREEMENT"
            title={conversionTitle || "Bu vardiya zaten bir sözleşmeye bağlandı."}
          >
            {hasAgreement ? "Sözleşmeye Bağlı" : "Sözleşmeye Taşındı"}
          </span>
        ) : hasPendingAgreementRequest ? (
          <span
            className="pill"
            data-status={agreementConversion?.status || "REQUESTED"}
            title={conversionTitle || "Bu vardiya için sözleşme talebi oda kararını bekliyor."}
          >
            Sözleşme talebi bekliyor
          </span>
        ) : (
          <>
            {hadClosedAgreementRequest ? (
              <span
                className="pill"
                data-status={agreementConversion?.status || "CLOSED"}
                title={conversionTitle || "Önceki sözleşme talebi sonuçlandı; tekrar deneyebilirsin."}
              >
                Önceki talep sonuçlandı
              </span>
            ) : null}
          <button
            type="button"
            className="btn sm primary"
            disabled={busy || !canConvert}
            title={!Number(shift?.roomId || 0) ? "Önce room seçili olmalı. Sonra taslak Company Sözleşmeler ekranında açılır." : "Bu vardiya düzenini sözleşme taslağına taşı."}
            onClick={() => onConvertShiftToAgreement?.(shift)}
          >
            {hadClosedAgreementRequest ? "Yeniden Dönüştür" : "Sözleşmeye Dönüştür"}
          </button>
          {canConvert ? (
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.35 }}>
            Vardiyayı sözleşmeye dönüştür: tıkladığında vardiya Company Sözleşmeler ekranında taslak olarak açılır.
            </div>
          ) : null}
        </>
      )}
      </div>
    </td>
  );
}

export function CompanyMarketRow({
  shift,
  busy,
  fmtTR,
  copilotShiftId,
  onFocusShift,
  onOpenOfferModal,
  onOpenOffersModal,
  computePackageShiftIds,
}) {
  const packageIds = computePackageShiftIds(shift);
  return (
    <tr key={shift.id} onClick={() => onFocusShift(shift?.id)} style={rowSelectionStyle(Number(copilotShiftId || 0) === Number(shift?.id || 0))}>
      <td>{shift.id}<AgreementBadge agreementId={shift.agreementId} /><CommercialReadonlySummary item={shift.commercialBackbone} compact /></td>
      <td><span className="pill" data-status={shift.status}>{displayStatusLabel(shift.status)}</span></td>
      <td className="muted">{fmtTR(shift.startAt)}</td>
      <td className="muted">{fmtTR(shift.endAt)}</td>
      <td>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={busy} onClick={() => onOpenOfferModal(shift.id)}>Teklif Gönder</button>
          <button
            type="button"
            disabled={busy || packageIds.length < 2}
            title={packageIds.length < 2 ? "Paket bulunamadı" : `Pakete uygula (${packageIds.length} shift)`}
            onClick={() => onOpenOfferModal(shift.id, packageIds)}
          >
            Paket Teklif
          </button>
          <button type="button" disabled={busy} onClick={() => onOpenOffersModal(shift.id)}>Teklifler</button>
        </div>
      </td>
    </tr>
  );
}

export function CompanyPendingRow({
  shift,
  busy,
  fmtTR,
  copilotShiftId,
  onFocusShift,
  roomsById,
  renderRoomOfferSummary,
  renderCompanyOfferSummary,
  onOpenOffersModal,
  onCancelMyRequest,
  onOpenExtendModal,
  onOpenPreview,
  onOpenOpsEvents,
  agreementConversion,
  onConvertShiftToAgreement,
}) {
  const room = roomsById.get(Number(shift.roomId));
  const canNegotiate = ["DRAFT", "REQUESTED"].includes(String(shift.status));
  return (
    <tr key={shift.id} onClick={() => onFocusShift(shift?.id)} style={rowSelectionStyle(Number(copilotShiftId || 0) === Number(shift?.id || 0))}>
      <td>
        {shift.id}
        <AgreementBadge agreementId={shift.agreementId} />
        <CommercialReadonlySummary item={shift.commercialBackbone} compact />
        {Number(shift.splitRootId || 0) > 0 ? (
          <div className="muted" style={{ marginTop: 4 }}>
            Paket #{shift.splitRootId}
            {Number(shift.splitIndex || 0) > 0 && Number(shift.splitTotal || 0) > 0 ? ` • ${shift.splitIndex}/${shift.splitTotal}` : ""}
          </div>
        ) : null}
      </td>
      <td><span className="pill" data-status={shift.status}>{displayStatusLabel(shift.status)}</span></td>
      <CompanyRoomCell shift={shift} room={room} />
      <td>{renderRoomOfferSummary(shift)}</td>
      <td>{renderCompanyOfferSummary(shift)}</td>
      <td>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="muted">Pazarlık sadece Market / Teklifler ekranında yapılır.</div>
          <button type="button" className="btn sm" disabled={busy} onClick={() => onOpenOffersModal(shift.id)}>Teklifleri Aç</button>
        </div>
      </td>
      <td><button type="button" disabled={busy || !canNegotiate} onClick={() => onCancelMyRequest(shift)}>Talebi İptal Et</button></td>
      <td className="muted" title={String(shift.startAt)}>{fmtTR(shift.startAt)}</td>
      <td className="muted" title={String(shift.endAt)}>{fmtTR(shift.endAt)}</td>
      <CompanyExtendCell shift={shift} busy={busy} fmtTR={fmtTR} onOpenExtendModal={onOpenExtendModal} onOpenPreview={onOpenPreview} />
      <CompanyOpsCell busy={busy} shift={shift} agreementConversion={agreementConversion} onOpenOpsEvents={onOpenOpsEvents} onConvertShiftToAgreement={onConvertShiftToAgreement} />
    </tr>
  );
}

export function CompanyFinalListRow({
  shift,
  busy,
  fmtTR,
  copilotShiftId,
  onFocusShift,
  roomsById,
  renderRoomOfferSummary,
  renderCompanyOfferSummary,
  onOpenVehicleDetail,
  onOpenDriverDetail,
  onOpenExtendModal,
  onOpenPreview,
  onOpenOpsEvents,
  agreementConversion,
  onConvertShiftToAgreement,
}) {
  const room = roomsById.get(Number(shift.roomId));
  const hasVehicle = !!(shift.vehicle?.plate || shift.vehicleId);
  const hasDriver = !!(shift.driver?.fullName || shift.driverId);
  return (
    <tr key={shift.id} onClick={() => onFocusShift(shift?.id)} style={rowSelectionStyle(Number(copilotShiftId || 0) === Number(shift?.id || 0))}>
      <td>{shift.id}<AgreementBadge agreementId={shift.agreementId} /><CommercialReadonlySummary item={shift.commercialBackbone} compact /></td>
      <td><span className="pill" data-status={shift.status}>{displayStatusLabel(shift.status)}</span></td>
      <CompanyRoomCell shift={shift} room={room} />
      <td>{renderRoomOfferSummary(shift)}</td>
      <td>{renderCompanyOfferSummary(shift)}</td>
      <td className="muted">
        {hasVehicle ? (
          <button type="button" onClick={() => onOpenVehicleDetail(shift)} style={clickableInfoStyle(!hasVehicle)} title="Araç detayını aç">
            {shift.vehicle?.plate || (shift.vehicleId ? `#${shift.vehicleId}` : "-")}
          </button>
        ) : "-"}
      </td>
      <td className="muted">
        {hasDriver ? (
          <button type="button" onClick={() => onOpenDriverDetail(shift)} style={clickableInfoStyle(!hasDriver)} title="Sürücü detayını aç">
            {shift.driver?.fullName || (shift.driverId ? `#${shift.driverId}` : "-")}
          </button>
        ) : "-"}
      </td>
      <td className="muted" title={String(shift.startAt)}>{fmtTR(shift.startAt)}</td>
      <td className="muted" title={String(shift.endAt)}>{fmtTR(shift.endAt)}</td>
      <CompanyExtendCell shift={shift} busy={busy} fmtTR={fmtTR} onOpenExtendModal={onOpenExtendModal} onOpenPreview={onOpenPreview} />
      <CompanyOpsCell busy={busy} shift={shift} agreementConversion={agreementConversion} onOpenOpsEvents={onOpenOpsEvents} onConvertShiftToAgreement={onConvertShiftToAgreement} />
    </tr>
  );
}
