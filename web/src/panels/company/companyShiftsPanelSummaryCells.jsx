import { formatTRY, vehicleMetaLine } from "./shiftsPanelOfferUtils";

export function renderCompanyOfferSummary(s, vehiclesById) {
  const ovId = s.companyOfferVehicleId ? Number(s.companyOfferVehicleId) : null;
  const ov = ovId ? vehiclesById.get(ovId) : null;
  const cAmt = s.companyOfferAmount != null ? Number(s.companyOfferAmount) : null;

  const has = Boolean(ovId || cAmt != null || s.companyOfferNote);
  if (!has) return <span className="muted">-</span>;

  return (
    <div className="muted" title={s.companyOfferNote || ""}>
      <div>
        <b>C→R Araç:</b> {ovId ? (ov ? `${ov.plate} • ${vehicleMetaLine(ov)}` : `#${ovId}`) : "-"}
      </div>
      {cAmt != null ? (
        <div className="muted" style={{ marginTop: 4 }}>
          <b>C→R Tutar:</b> {formatTRY(cAmt)} ₺
        </div>
      ) : null}
      {s.companyOfferNote ? <div className="muted" style={{ marginTop: 4 }}>{s.companyOfferNote}</div> : null}
    </div>
  );
}

export function renderRoomOfferSummary(s, { vehiclesById, fmtTR, busy, onOpenOffersModal }) {
  const rvId = s.roomOfferVehicleId ? Number(s.roomOfferVehicleId) : null;
  const rv = rvId ? vehiclesById.get(rvId) : null;
  const rAmt = s.roomOfferAmount != null ? Number(s.roomOfferAmount) : null;

  const has = Boolean(rvId || rAmt != null || s.roomOfferNote || s.roomOfferToDriver || s.roomOfferDriverNote);
  if (!has) return <span className="muted">-</span>;

  const decision = String(s.roomOfferDecision || "PENDING").toUpperCase();
  const decisionAtText = s.roomOfferDecisionAt ? fmtTR(s.roomOfferDecisionAt) : "";

  return (
    <div className="muted">
      <div>
        <b>R→C Araç:</b> {rvId ? (rv ? `${rv.plate} • ${vehicleMetaLine(rv)}` : `#${rvId}`) : "-"}
      </div>

      {rAmt != null ? (
        <div className="muted" style={{ marginTop: 4 }}>
          <b>R→C Tutar:</b> {formatTRY(rAmt)} ₺
        </div>
      ) : null}

      {s.roomOfferNote ? (
        <div className="muted" style={{ marginTop: 4 }}>
          <b>R→C Not:</b> {s.roomOfferNote}
        </div>
      ) : null}

      {s.roomOfferToDriver ? (
        <div className="muted" style={{ marginTop: 4 }}>
          <b>R→D:</b> evet{s.roomOfferDriverNote ? ` • ${s.roomOfferDriverNote}` : ""}
        </div>
      ) : null}

      <div style={{ marginTop: 8 }}>
        <b>Legacy Durum:</b>{" "}
        <span className={decision === "PENDING" ? "muted" : "pill"} data-status={decision === "PENDING" ? undefined : decision}>
          {decision}
        </span>
        {decision !== "PENDING" && decisionAtText ? <span className="muted"> • {decisionAtText}</span> : null}
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        Bu alan eski vardiya ve taşımacılık firması teklif özetidir. Ticari karar artık Market / Teklifler ekranında verilir.
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={() => onOpenOffersModal(s.id)}>
          Teklifleri Aç
        </button>
      </div>

      {s.roomOfferDecisionNote ? (
        <div className="muted" style={{ marginTop: 6 }}>
          <b>Legacy Karar Notu:</b> {s.roomOfferDecisionNote}
        </div>
      ) : null}
    </div>
  );
}
