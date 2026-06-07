import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import { rowSelectionStyle } from "../../utils/listUi";
import { displayStatusLabel } from "../../utils/displayStatus";
import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";
import { roomLabel } from "./shiftsPanelOfferUtils";
import { AgreementBadge } from "./companyShiftsPanelRows";

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
    <div className="shiftCardSection shiftActionGroup" onClick={stopCardClick}>
      <div className="shiftCardSectionTitle">Aksiyonlar</div>
      <div className="shiftCardActions">{children}</div>
      {note ? <div className="shiftCardActionNote">{note}</div> : null}
    </div>
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
            Paket #{shift.splitRootId}
            {Number(shift.splitIndex || 0) > 0 && Number(shift.splitTotal || 0) > 0 ? ` • ${shift.splitIndex}/${shift.splitTotal}` : ""}
          </div>
        ) : null}
      </div>
      <span className="shiftCardSelectionHint" data-selected={selected ? "true" : "false"}>
        {selected ? "Seçili" : "Kart"}
      </span>
    </div>
  );
}

function CardShell({ selected, children, onClick }) {
  return (
    <article
      className="card shiftCard shiftMobileCard"
      style={{ ...rowSelectionStyle(selected), overflow: "visible" }}
      onClick={onClick}
    >
      {children}
    </article>
  );
}

function agreementConversionTitle(agreementConversion) {
  const agreementId = Number(agreementConversion?.agreementId || 0);
  const status = String(agreementConversion?.status || "").toUpperCase();
  return agreementId ? `Sözleşme #${agreementId}${status ? ` • ${status}` : ""}` : "";
}

function buildAgreementConversionMeta(shift, agreementConversion) {
  const hasAgreement = Number(shift?.agreementId || 0) > 0;
  const conversionState = String(agreementConversion?.state || "").toLowerCase();
  const conversionTitle = agreementConversionTitle(agreementConversion);
  const hasPendingAgreementRequest = conversionState === "pending";
  const hasLinkedAgreementRequest = conversionState === "linked";
  const hadClosedAgreementRequest = conversionState === "closed";
  const canConvert = Number(shift?.roomId || 0) > 0 && !hasAgreement && !hasPendingAgreementRequest && !hasLinkedAgreementRequest;
  const note = hasAgreement || hasLinkedAgreementRequest
    ? conversionTitle || "Bu vardiya zaten sözleşmeye bağlı."
    : hasPendingAgreementRequest
      ? conversionTitle || "Bu vardiya için sözleşme talebi bekliyor."
      : hadClosedAgreementRequest
        ? conversionTitle || "Önceki talep sonuçlandı."
        : !canConvert
          ? "Sözleşmeye dönüştürmek için room seçili olmalı."
          : null;

  return {
    hasAgreement,
    conversionState,
    conversionTitle,
    hasPendingAgreementRequest,
    hasLinkedAgreementRequest,
    hadClosedAgreementRequest,
    canConvert,
    note,
  };
}

function AgreementConversionStatus({ shift, busy, meta, onConvertShiftToAgreement }) {
  if (meta.hasAgreement || meta.hasLinkedAgreementRequest) {
    return (
      <span className="pill" data-status="AGREEMENT" title={meta.conversionTitle || "Bu vardiya zaten bir sözleşmeye bağlandı."}>
        {meta.hasAgreement ? "Sözleşmeye Bağlı" : "Sözleşmeye Taşındı"}
      </span>
    );
  }

  if (meta.hasPendingAgreementRequest) {
    return (
      <span className="pill" data-status={meta.conversionState || "REQUESTED"} title={meta.conversionTitle || "Bu vardiya için sözleşme talebi oda kararını bekliyor."}>
        Sözleşme talebi bekliyor
      </span>
    );
  }

  return (
    <>
      {meta.hadClosedAgreementRequest ? (
        <span className="pill" data-status={meta.conversionState || "CLOSED"} title={meta.conversionTitle || "Önceki sözleşme talebi sonuçlandı; tekrar deneyebilirsin."}>
          Önceki talep sonuçlandı
        </span>
      ) : null}
      <button
        type="button"
        className="btn sm primary"
        disabled={busy || !meta.canConvert}
        title={!Number(shift?.roomId || 0) ? "Önce room seçili olmalı. Sonra taslak Company Sözleşmeler ekranında açılır." : "Bu vardiya düzenini sözleşme taslağına taşı."}
        onClick={(e) => {
          stopCardClick(e);
          onConvertShiftToAgreement?.(shift);
        }}
      >
        {meta.hadClosedAgreementRequest ? "Yeniden Dönüştür" : "Sözleşmeye Dönüştür"}
      </button>
    </>
  );
}

function CompanyExtendCardSection({ shift, busy, fmtTR, onOpenExtendModal, onOpenPreview, canExtend, extendRequested }) {
  return extendRequested ? (
    <CardSection title="Uzatma talebi" onClick={stopCardClick}>
      <div className="shiftCardInfoBlock">
        <div className="shiftCardSubtle" title={String(shift.extendRequestedEndAt)}>
          Talep: <b>{fmtTR(shift.extendRequestedEndAt)}</b>
        </div>
        <div className="shiftCardSubtle">
          {shift.extendDecision ? `Karar: ${displayStatusLabel(shift.extendDecision)}` : "Karar bekliyor"}
        </div>
      </div>
    </CardSection>
  ) : (
    <CardSection title="Uzatma / önizleme" onClick={stopCardClick}>
      <div className="shiftCardActions">
        <button
          type="button"
          className="btn sm"
          disabled={busy || !canExtend}
          onClick={(e) => {
            stopCardClick(e);
            onOpenExtendModal(shift);
          }}
          title={!canExtend ? "Süre uzatma yalnızca onaylı/aktif vardiyalarda" : "Talep gönder"}
        >
          Süre Uzat
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            onOpenPreview(shift.id);
          }}
        >
          Harita / Navigasyon Önizle
        </button>
      </div>
    </CardSection>
  );
}

export function CompanyMarketShiftCard({
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
  const selected = Number(copilotShiftId || 0) === Number(shift?.id || 0);

  return (
    <CardShell selected={selected} onClick={() => onFocusShift(shift?.id)}>
      <CardHeader shift={shift} selected={selected}>
        <span className="pill" data-status={shift.status}>
          {displayStatusLabel(shift.status)}
        </span>
        <AgreementBadge agreementId={shift.agreementId} />
      </CardHeader>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field
          label="Şirket / Oda"
          value={
            <div className="shiftCardValueStack">
              <div>{shift.company?.name || `Firma ID ${shift.companyId}`}</div>
              <div className="shiftCardSubtle">Oda: Seçilmedi</div>
            </div>
          }
          wide
        />
        <Field label="Başlangıç" value={fmtTR(shift.startAt)} />
        <Field label="Bitiş" value={fmtTR(shift.endAt)} />
        <Field label="Durum / Hakediş" value={<CommercialReadonlySummary item={shift.commercialBackbone} compact />} wide />
      </div>

      <CardSection title="Teklif / sözleşme özeti">
        <div className="shiftCardInfoBlock">
          <div className="shiftCardInfoTitle">Market talebi</div>
          <div className="shiftCardSubtle">Room seçilmemiş talep. Teklif burada room havuzuna gönderilir.</div>
        </div>
      </CardSection>

      <CardSection title="Ödeme / hakediş">
        <CommercialReadonlySummary item={shift.commercialBackbone} compact />
      </CardSection>

      <ActionGroup note={packageIds.length < 2 ? "Paket Teklif için en az 2 shift gerekir." : null}>
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            onOpenOfferModal(shift.id);
          }}
        >
          Teklif Gönder
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={busy || packageIds.length < 2}
          onClick={(e) => {
            stopCardClick(e);
            onOpenOfferModal(shift.id, packageIds);
          }}
          title={packageIds.length < 2 ? "Paket bulunamadı" : `Pakete uygula (${packageIds.length} shift)`}
        >
          Paket Teklif
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            onOpenOffersModal(shift.id);
          }}
        >
          Teklifler
        </button>
      </ActionGroup>
    </CardShell>
  );
}

export function CompanyPendingShiftCard({
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
  const room = roomsById?.get(Number(shift.roomId)) || null;
  const canNegotiate = ["DRAFT", "REQUESTED"].includes(String(shift.status));
  const canExtend = ["APPROVED", "ACTIVE"].includes(String(shift.status || "").toUpperCase());
  const agreementMeta = buildAgreementConversionMeta(shift, agreementConversion);
  const selected = Number(copilotShiftId || 0) === Number(shift?.id || 0);
  const extendRequested = Boolean(shift.extendRequestedEndAt && String(shift.extendDecision || "PENDING") === "PENDING");

  return (
    <CardShell selected={selected} onClick={() => onFocusShift(shift?.id)}>
      <CardHeader shift={shift} selected={selected}>
        <span className="pill" data-status={shift.status}>
          {displayStatusLabel(shift.status)}
        </span>
        <AgreementBadge agreementId={shift.agreementId} />
      </CardHeader>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field
          label="Şirket / Oda"
          value={
            <div className="shiftCardValueStack">
              <div>{shift.company?.name || `Firma ID ${shift.companyId}`}</div>
              <div className="shiftCardSubtle">{room ? `${roomLabel(room)} (#${room.id})` : `Oda ID ${shift.roomId}`}</div>
              {hasRegionOwnership(room) ? <div className="shiftCardSubtle">{formatRegionOwnership(room)}</div> : null}
            </div>
          }
          wide
        />
        <Field label="Başlangıç" value={fmtTR(shift.startAt)} />
        <Field label="Bitiş" value={fmtTR(shift.endAt)} />
        <Field label="Durum / Hakediş" value={<CommercialReadonlySummary item={shift.commercialBackbone} compact />} wide />
      </div>

      <CardSection title="Room Teklifi">
        {renderRoomOfferSummary(shift)}
      </CardSection>

      <CardSection title="Company Teklifi">
        {renderCompanyOfferSummary(shift)}
      </CardSection>

      <CardSection title="Ödeme / hakediş">
        <CommercialReadonlySummary item={shift.commercialBackbone} compact />
      </CardSection>

      <CompanyExtendCardSection
        shift={shift}
        busy={busy}
        fmtTR={fmtTR}
        onOpenExtendModal={onOpenExtendModal}
        onOpenPreview={onOpenPreview}
        canExtend={canExtend}
        extendRequested={extendRequested}
      />

      <ActionGroup note={agreementMeta.note}>
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            onOpenOffersModal(shift.id);
          }}
        >
          Teklifleri Aç
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={busy || !canNegotiate}
          onClick={(e) => {
            stopCardClick(e);
            onCancelMyRequest(shift);
          }}
        >
          Talebi İptal Et
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            onOpenOpsEvents(shift.id);
          }}
        >
          Operasyon Kaydı
        </button>
        <AgreementConversionStatus
          shift={shift}
          busy={busy}
          meta={agreementMeta}
          onConvertShiftToAgreement={onConvertShiftToAgreement}
        />
      </ActionGroup>
    </CardShell>
  );
}

export function CompanyFinalShiftCard({
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
  const room = roomsById?.get(Number(shift.roomId)) || null;
  const hasVehicle = !!(shift.vehicle?.plate || shift.vehicleId);
  const hasDriver = !!(shift.driver?.fullName || shift.driverId);
  const agreementMeta = buildAgreementConversionMeta(shift, agreementConversion);
  const canReassign = ["APPROVED", "ACTIVE"].includes(String(shift.status || "").toUpperCase());
  const selected = Number(copilotShiftId || 0) === Number(shift?.id || 0);
  const extendRequested = Boolean(shift.extendRequestedEndAt && String(shift.extendDecision || "PENDING") === "PENDING");

  return (
    <CardShell selected={selected} onClick={() => onFocusShift(shift?.id)}>
      <CardHeader shift={shift} selected={selected}>
        <span className="pill" data-status={shift.status}>
          {displayStatusLabel(shift.status)}
        </span>
        <AgreementBadge agreementId={shift.agreementId} />
      </CardHeader>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field
          label="Şirket / Oda"
          value={
            <div className="shiftCardValueStack">
              <div>{shift.company?.name || `Firma ID ${shift.companyId}`}</div>
              <div className="shiftCardSubtle">{room ? `${roomLabel(room)} (#${room.id})` : `Oda ID ${shift.roomId}`}</div>
              {hasRegionOwnership(room) ? <div className="shiftCardSubtle">{formatRegionOwnership(room)}</div> : null}
            </div>
          }
          wide
        />
        <Field
          label="Araç"
          value={
            hasVehicle ? (
              <button
                type="button"
                className="shiftCardInlineLink"
                onClick={(e) => {
                  stopCardClick(e);
                  onOpenVehicleDetail(shift);
                }}
                title="Araç detayını aç"
              >
                {shift.vehicle?.plate || (shift.vehicleId ? `#${shift.vehicleId}` : "-")}
              </button>
            ) : (
              "-"
            )
          }
        />
        <Field
          label="Sürücü"
          value={
            hasDriver ? (
              <button
                type="button"
                className="shiftCardInlineLink"
                onClick={(e) => {
                  stopCardClick(e);
                  onOpenDriverDetail(shift);
                }}
                title="Sürücü detayını aç"
              >
                {shift.driver?.fullName || (shift.driverId ? `#${shift.driverId}` : "-")}
              </button>
            ) : (
              "-"
            )
          }
        />
        <Field label="Başlangıç" value={fmtTR(shift.startAt)} />
        <Field label="Bitiş" value={fmtTR(shift.endAt)} />
        <Field label="Durum / Hakediş" value={<CommercialReadonlySummary item={shift.commercialBackbone} compact />} wide />
      </div>

      <CardSection title="Room Teklifi">
        {renderRoomOfferSummary(shift)}
      </CardSection>

      <CardSection title="Company Teklifi">
        {renderCompanyOfferSummary(shift)}
      </CardSection>

      <CardSection title="Ödeme / hakediş">
        <CommercialReadonlySummary item={shift.commercialBackbone} compact />
      </CardSection>

      <CompanyExtendCardSection
        shift={shift}
        busy={busy}
        fmtTR={fmtTR}
        onOpenExtendModal={onOpenExtendModal}
        onOpenPreview={onOpenPreview}
        canExtend={canReassign}
        extendRequested={extendRequested}
      />

      <ActionGroup note={agreementMeta.note}>
        <button
          type="button"
          className="btn sm"
          disabled={busy}
          onClick={(e) => {
            stopCardClick(e);
            onOpenOpsEvents(shift.id);
          }}
        >
          İşlem Kaydı
        </button>
        <AgreementConversionStatus
          shift={shift}
          busy={busy}
          meta={agreementMeta}
          onConvertShiftToAgreement={onConvertShiftToAgreement}
        />
      </ActionGroup>
    </CardShell>
  );
}
