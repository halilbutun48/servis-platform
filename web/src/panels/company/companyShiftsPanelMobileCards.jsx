import { rowSelectionStyle } from "../../utils/listUi";
import { displayStatusLabel } from "../../utils/displayStatus";
import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";
import { roomLabel } from "./shiftsPanelOfferUtils";
import { AgreementBadge } from "./companyShiftsPanelRows";
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
            Paket #{shift.splitRootId}
            {Number(shift.splitIndex || 0) > 0 && Number(shift.splitTotal || 0) > 0 ? ` • ${shift.splitIndex}/${shift.splitTotal}` : ""}
          </div>
        ) : null}
      </div>
      {selected ? <span className="shiftCardSelectionHint" data-selected="true">Seçili</span> : null}
    </div>
  );
}

function CardShell({ selected, children, onClick, shiftId, companyKind = "COMPANY" }) {
  return (
    <article
      className="card shiftCard shiftMobileCard"
      data-testid="commercial-shift-card"
      data-shift-id={shiftId}
      data-perspective="company"
      data-company-kind={companyKind || "COMPANY"}
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
          ? "Sözleşmeye dönüştürmek için taşımacılık firması seçili olmalı."
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

function AgreementConversionStatus({ shift, busy, meta, onConvertShiftToAgreement, showAction = true }) {
  if (meta.hasAgreement || meta.hasLinkedAgreementRequest) {
    return (
      <span className="pill" data-status="AGREEMENT" title={meta.conversionTitle || "Bu vardiya zaten bir sözleşmeye bağlandı."}>
        {meta.hasAgreement ? "Sözleşmeye Bağlı" : "Sözleşmeye Taşındı"}
      </span>
    );
  }

  if (!showAction) {
    return <span className="shiftCardSubtle">Sözleşme taslağına hazır.</span>;
  }

  if (meta.hasPendingAgreementRequest) {
    return (
      <span className="pill" data-status={meta.conversionState || "REQUESTED"} title={meta.conversionTitle || "Bu vardiya için sözleşme talebi taşımacılık firması kararını bekliyor."}>
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
        title={!Number(shift?.roomId || 0) ? "Önce taşımacılık firması seçili olmalı. Sonra taslak Hizmet Alan Firma Sözleşmeleri ekranında açılır." : "Bu vardiya düzenini sözleşme taslağına taşı."}
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
  companyKind = "COMPANY",
}) {
  const packageIds = computePackageShiftIds(shift);
  const selected = Number(copilotShiftId || 0) === Number(shift?.id || 0);
  const restricted = ["SCHOOL", "ORGANIZATION"].includes(String(companyKind || "").toUpperCase());

  return (
    <CardShell selected={selected} shiftId={shift?.id} companyKind={companyKind} onClick={() => onFocusShift(shift?.id)}>
      <CardHeader shift={shift} selected={selected}>
        <span className="pill" data-status={shift.status}>
          {displayStatusLabel(shift.status)}
        </span>
        <AgreementBadge agreementId={shift.agreementId} />
      </CardHeader>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field
          label="Taşımacılık Firması"
          value={
            <div className="shiftCardValueStack">
              <div className="shiftCardSubtle">Seçilmedi</div>
            </div>
          }
          wide
        />
        <Field label="Başlangıç" value={fmtTR(shift.startAt)} />
        <Field label="Bitiş" value={fmtTR(shift.endAt)} />
      </div>

      <ShiftCommercialSummary shift={shift} restricted={restricted} />
      <ShiftLifecycle shift={shift} restricted={restricted} />
      {restricted ? (
        <div className="shiftCardActionNote">Bu hesap türünde ticari teklif ve sözleşme işlemleri kullanılamaz.</div>
      ) : (
        <>
          <ShiftCardPrimaryAction label="Teklif Gönder" disabled={busy} onClick={(e) => { stopCardClick(e); onOpenOfferModal(shift.id); }} />
          <ShiftCardDetails>
            <CardSection title="Teklif / sözleşme özeti">
              <div className="shiftCardInfoBlock">
                <div className="shiftCardInfoTitle">Market talebi</div>
                <div className="shiftCardSubtle">Taşımacılık firması seçilmemiş talep. Teklif bu ekrandan taşımacılık firması havuzuna gönderilir.</div>
              </div>
            </CardSection>
            <CardSection title="Finansal ayrıntılar">
              <div className="shiftCardSubtle">Bu kartta ödeme sonucu oluşturulmadı. Hakediş bilgisi oluştuğunda Ticari Akış ekranından açılır.</div>
            </CardSection>
          </ShiftCardDetails>
          <ActionGroup note={packageIds.length < 2 ? "Paket teklif için en az iki vardiya gerekir." : null}>
            <button type="button" className="btn sm" disabled={busy || packageIds.length < 2} onClick={(e) => { stopCardClick(e); onOpenOfferModal(shift.id, packageIds); }} title={packageIds.length < 2 ? "Paket bulunamadı" : `Pakete uygula (${packageIds.length} vardiya)`}>Paket Teklif</button>
            <button type="button" className="btn sm" disabled={busy} onClick={(e) => { stopCardClick(e); onOpenOffersModal(shift.id); }}>Teklifleri Aç</button>
          </ActionGroup>
        </>
      )}
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
  onOpenOffersModal,
  onCancelMyRequest,
  onOpenExtendModal,
  onOpenPreview,
  onOpenOpsEvents,
  agreementConversion,
  onConvertShiftToAgreement,
  companyKind = "COMPANY",
}) {
  const room = roomsById?.get(Number(shift.roomId)) || null;
  const canNegotiate = ["DRAFT", "REQUESTED"].includes(String(shift.status));
  const canExtend = ["APPROVED", "ACTIVE"].includes(String(shift.status || "").toUpperCase());
  const agreementMeta = buildAgreementConversionMeta(shift, agreementConversion);
  const restricted = ["SCHOOL", "ORGANIZATION"].includes(String(companyKind || "").toUpperCase());
  const selected = Number(copilotShiftId || 0) === Number(shift?.id || 0);
  const extendRequested = Boolean(shift.extendRequestedEndAt && String(shift.extendDecision || "PENDING") === "PENDING");
  const primaryLabel = restricted
    ? "Operasyon Kaydı"
    : agreementMeta.canConvert
      ? agreementMeta.hadClosedAgreementRequest ? "Yeniden sözleşme taslağına dönüştür" : "Sözleşmeye Dönüştür"
      : agreementMeta.hasAgreement || agreementMeta.hasLinkedAgreementRequest
        ? "Operasyon Kaydı"
        : "Teklifleri Aç";
  const handlePrimaryAction = (e) => {
    stopCardClick(e);
    if (restricted || agreementMeta.hasAgreement || agreementMeta.hasLinkedAgreementRequest) {
      onOpenOpsEvents(shift.id);
    } else if (agreementMeta.canConvert) {
      onConvertShiftToAgreement(shift);
    } else {
      onOpenOffersModal(shift.id);
    }
  };

  return (
    <CardShell selected={selected} shiftId={shift?.id} companyKind={companyKind} onClick={() => onFocusShift(shift?.id)}>
      <CardHeader shift={shift} selected={selected}>
        <span className="pill" data-status={shift.status}>
          {displayStatusLabel(shift.status)}
        </span>
        <AgreementBadge agreementId={shift.agreementId} />
      </CardHeader>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field
          label="Taşımacılık Firması"
          value={
            <div className="shiftCardValueStack">
              <div>{room ? roomLabel(room) : "Bilgi yok"}</div>
              {hasRegionOwnership(room) ? <div className="shiftCardSubtle">{formatRegionOwnership(room)}</div> : null}
            </div>
          }
          wide
        />
        <Field label="Başlangıç" value={fmtTR(shift.startAt)} />
        <Field label="Bitiş" value={fmtTR(shift.endAt)} />
      </div>

      <ShiftCommercialSummary shift={shift} restricted={restricted} />
      <ShiftLifecycle shift={shift} restricted={restricted} />
      <ShiftCardPrimaryAction label={primaryLabel} disabled={busy} onClick={handlePrimaryAction} note={restricted ? "Okul ve organizasyon bağlamında ticari yaşam döngüsü kapalıdır." : null} />
      <ShiftCardDetails>
        {!restricted ? (
          <>
            <CardSection title="Teklif ayrıntıları">
              <ShiftOfferDetails shift={shift} />
            </CardSection>
            <CardSection title="Sözleşme">
              <AgreementConversionStatus shift={shift} busy={busy} meta={agreementMeta} onConvertShiftToAgreement={onConvertShiftToAgreement} showAction={false} />
            </CardSection>
          </>
        ) : null}
        <CompanyExtendCardSection
          shift={shift}
          busy={busy}
          fmtTR={fmtTR}
          onOpenExtendModal={onOpenExtendModal}
          onOpenPreview={onOpenPreview}
          canExtend={canExtend}
          extendRequested={extendRequested}
        />
      </ShiftCardDetails>
      <ActionGroup note={agreementMeta.note}>
        {!restricted && !agreementMeta.canConvert && !agreementMeta.hasAgreement && !agreementMeta.hasLinkedAgreementRequest ? <button type="button" className="btn sm" disabled={busy} onClick={(e) => { stopCardClick(e); onOpenOffersModal(shift.id); }}>Teklifleri Aç</button> : null}
        <button type="button" className="btn sm" disabled={busy || !canNegotiate} onClick={(e) => { stopCardClick(e); onCancelMyRequest(shift); }}>Talebi İptal Et</button>
        <button type="button" className="btn sm" disabled={busy} onClick={(e) => { stopCardClick(e); onOpenOpsEvents(shift.id); }}>Operasyon Kaydı</button>
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
  onOpenVehicleDetail,
  onOpenDriverDetail,
  onOpenExtendModal,
  onOpenPreview,
  onOpenOpsEvents,
  agreementConversion,
  onConvertShiftToAgreement,
  companyKind = "COMPANY",
}) {
  const room = roomsById?.get(Number(shift.roomId)) || null;
  const hasVehicle = !!(shift.vehicle?.plate || shift.vehicleId);
  const hasDriver = !!(shift.driver?.fullName || shift.driverId);
  const agreementMeta = buildAgreementConversionMeta(shift, agreementConversion);
  const restricted = ["SCHOOL", "ORGANIZATION"].includes(String(companyKind || "").toUpperCase());
  const canReassign = ["APPROVED", "ACTIVE"].includes(String(shift.status || "").toUpperCase());
  const selected = Number(copilotShiftId || 0) === Number(shift?.id || 0);
  const extendRequested = Boolean(shift.extendRequestedEndAt && String(shift.extendDecision || "PENDING") === "PENDING");
  const primaryLabel = restricted
    ? "Operasyon Kaydı"
    : agreementMeta.canConvert
      ? agreementMeta.hadClosedAgreementRequest ? "Yeniden sözleşme taslağına dönüştür" : "Sözleşmeye Dönüştür"
      : "Operasyon Kaydı";
  const handlePrimaryAction = (e) => {
    stopCardClick(e);
    if (!restricted && agreementMeta.canConvert) {
      onConvertShiftToAgreement(shift);
      return;
    }
    onOpenOpsEvents(shift.id);
  };

  return (
    <CardShell selected={selected} shiftId={shift?.id} companyKind={companyKind} onClick={() => onFocusShift(shift?.id)}>
      <CardHeader shift={shift} selected={selected}>
        <span className="pill" data-status={shift.status}>
          {displayStatusLabel(shift.status)}
        </span>
        <AgreementBadge agreementId={shift.agreementId} />
      </CardHeader>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field
          label="Taşımacılık Firması"
          value={
            <div className="shiftCardValueStack">
              <div>{room ? roomLabel(room) : "Bilgi yok"}</div>
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
      </div>

      <ShiftCommercialSummary shift={shift} restricted={restricted} />
      <ShiftLifecycle shift={shift} restricted={restricted} />
      <ShiftCardPrimaryAction label={primaryLabel} disabled={busy} onClick={handlePrimaryAction} note={restricted ? "Okul ve organizasyon bağlamında ticari yaşam döngüsü kapalıdır." : null} />
      <ShiftCardDetails>
        {!restricted ? (
          <>
            <CardSection title="Teklif ayrıntıları">
              <ShiftOfferDetails shift={shift} />
            </CardSection>
            <CardSection title="Sözleşme">
              <AgreementConversionStatus shift={shift} busy={busy} meta={agreementMeta} onConvertShiftToAgreement={onConvertShiftToAgreement} showAction={false} />
            </CardSection>
          </>
        ) : null}
        <CompanyExtendCardSection
          shift={shift}
          busy={busy}
          fmtTR={fmtTR}
          onOpenExtendModal={onOpenExtendModal}
          onOpenPreview={onOpenPreview}
          canExtend={canReassign}
          extendRequested={extendRequested}
        />
      </ShiftCardDetails>
      <ActionGroup note={agreementMeta.note}>
        <button type="button" className="btn sm" disabled={busy} onClick={(e) => { stopCardClick(e); onOpenOpsEvents(shift.id); }}>İşlem Kaydı</button>
      </ActionGroup>
    </CardShell>
  );
}
