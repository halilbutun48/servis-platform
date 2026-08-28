import { displayStatusLabel } from "../../utils/displayStatus";

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatTry(value) {
  if (!hasValue(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return `${new Intl.NumberFormat("tr-TR").format(number)} ₺`;
}

function offerDecisionLabel(value) {
  const status = String(value || "").trim().toUpperCase();
  if (!status) return null;
  return displayStatusLabel(status);
}

function offerStatus(shift) {
  const decision = String(shift?.roomOfferDecision || shift?.offerDecision || "").toUpperCase();
  if (["ACCEPTED", "APPROVED"].includes(decision)) return "Tamamlandı";
  if (hasValue(shift?.companyOfferAmount) || hasValue(shift?.roomOfferAmount)) return "İnceleniyor";
  return "Bekliyor";
}

function operationStatus(shift) {
  if (Number(shift?.agreementId || 0) <= 0) return "Bekliyor";
  const hasAssignment = Number(shift?.vehicleId || 0) > 0 && Number(shift?.driverId || 0) > 0;
  return hasAssignment ? "Hazır" : "Eksik";
}

function hakedişStatus(shift) {
  const status = String(shift?.reconciliation?.status || shift?.hakedisStatus || "").toUpperCase();
  if (!status) return "Bekliyor";
  if (["MATCHED", "UYUMLU"].includes(status)) return "Uyumlu";
  if (["REVIEW_NEEDED", "IN_REVIEW", "INCELENMELI"].includes(status)) return "İncelenmeli";
  return "Eksik veri";
}

export function ShiftCommercialSummary({ shift, restricted = false }) {
  if (restricted) return null;
  const companyAmount = formatTry(shift?.companyOfferAmount);
  const roomAmount = formatTry(shift?.roomOfferAmount);

  return (
    <div className="shiftCardCommercialSummary" data-testid="shift-commercial-summary">
      <div className="shiftCardSectionTitle">Ticari özet</div>
      {companyAmount || roomAmount ? (
        <div className="shiftCardSummaryValues">
          {companyAmount ? <span><b>Firma teklifi:</b> {companyAmount}</span> : null}
          {roomAmount ? <span><b>Taşımacılık Firması teklifi:</b> {roomAmount}</span> : null}
        </div>
      ) : (
        <div className="shiftCardSubtle">Teklif bilgisi henüz oluşmadı.</div>
      )}
    </div>
  );
}

export function ShiftOfferDetails({ shift }) {
  const companyAmount = formatTry(shift?.companyOfferAmount);
  const roomAmount = formatTry(shift?.roomOfferAmount);
  const decisionCode = String(shift?.roomOfferDecision || shift?.offerDecision || "").trim().toUpperCase();
  const decision = offerDecisionLabel(decisionCode);
  const decisionAlreadyShownByStatus = decisionCode && ["ACCEPTED", "APPROVED"].includes(decisionCode)
    && ["ACCEPTED", "APPROVED"].includes(String(shift?.status || "").trim().toUpperCase());
  const hasNote = hasValue(shift?.companyOfferNote) || hasValue(shift?.roomOfferNote) || hasValue(shift?.roomOfferDecisionNote);
  if (!companyAmount && !roomAmount && (!decision || decisionAlreadyShownByStatus) && !hasNote) {
    return <div className="shiftCardSubtle">Teklif ayrıntısı bulunmuyor.</div>;
  }
  return (
    <div className="shiftCardInfoBlock">
      {companyAmount ? <div className="shiftCardSubtle"><b>Firma teklifi:</b> {companyAmount}</div> : null}
      {roomAmount ? <div className="shiftCardSubtle"><b>Taşımacılık Firması teklifi:</b> {roomAmount}</div> : null}
      {decision && !decisionAlreadyShownByStatus ? <div className="shiftCardSubtle"><b>Karar:</b> {decision}</div> : null}
      {shift?.companyOfferNote ? <div className="shiftCardSubtle"><b>Firma notu:</b> {shift.companyOfferNote}</div> : null}
      {shift?.roomOfferNote ? <div className="shiftCardSubtle"><b>Taşımacılık Firması notu:</b> {shift.roomOfferNote}</div> : null}
      {shift?.roomOfferDecisionNote ? <div className="shiftCardSubtle"><b>Karar notu:</b> {shift.roomOfferDecisionNote}</div> : null}
    </div>
  );
}

export function ShiftLifecycle({ shift, restricted = false }) {
  const steps = restricted
    ? [{ key: "operation", label: "Operasyon", value: operationStatus(shift) }]
    : [
      { key: "offer", label: "Teklif", value: offerStatus(shift) },
      { key: "agreement", label: "Sözleşme", value: Number(shift?.agreementId || 0) > 0 ? "Tamamlandı" : "Sıradaki" },
      { key: "operation", label: "Operasyon", value: operationStatus(shift) },
      { key: "hakedis", label: "Hakediş", value: hakedişStatus(shift) },
    ];

  return (
    <section className="shiftCardLifecycle" data-testid="shift-card-lifecycle" aria-label="İş akışı durumu">
      <div className="shiftCardSectionTitle">İş akışı durumu</div>
      <div className="shiftCardLifecycleSteps">
        {steps.map((step) => (
          <div className="shiftCardLifecycleStep" key={step.key} data-state={step.value}>
            <span className="shiftCardLifecycleLabel">{step.label}</span>
            <span className="shiftCardLifecycleValue">{step.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ShiftCardPrimaryAction({ label, onClick, disabled = false, note = null }) {
  if (!label) return null;
  return (
    <section className="shiftCardPrimaryAction" data-testid="shift-card-primary-action">
      <button type="button" className="btn primary shiftCardPrimaryButton" disabled={disabled} onClick={onClick}>
        {label}
      </button>
      {note ? <div className="shiftCardActionNote">{note}</div> : null}
    </section>
  );
}

export function ShiftCardDetails({ children }) {
  return (
    <details className="shiftCardDisclosure">
      <summary>Detayları göster</summary>
      <div className="shiftCardDisclosureBody">{children}</div>
    </details>
  );
}

export function ShiftCardOtherActions({ children, note = null, className = "" }) {
  return (
    <details className={`shiftCardDisclosure shiftCardOtherActions${className ? ` ${className}` : ""}`}>
      <summary>Diğer işlemler</summary>
      <div className="shiftCardDisclosureBody">
        <div className="shiftCardActions">{children}</div>
        {note ? <div className="shiftCardActionNote">{note}</div> : null}
      </div>
    </details>
  );
}
