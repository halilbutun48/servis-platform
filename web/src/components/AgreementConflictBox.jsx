import { toHHMM, weekMaskToText } from "../utils/agreementUi";
import { displayStatusLabel } from "../utils/displayStatus";

export default function AgreementConflictBox({ errObj }) {
  if (!errObj) return null;
  const msg = errObj?.message || errObj?.error || "Sözleşme çakışması oluştu.";
  const c = errObj?.conflictingAgreement;

  return (
    <div className="card" style={{ borderColor: "rgba(239,68,68,.45)", background: "rgba(85,16,20,.25)" }}>
      <div style={{ fontWeight: 900 }}>Sözleşme çakışması</div>
      <div className="muted" style={{ marginTop: 6 }}>{msg}</div>

      {c ? (
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          <div>
            Çakışan sözleşme kayıt no: <b>{c.id}</b>
          </div>
          <div>Durum: {displayStatusLabel(c.status)}</div>
          <div>
            Tarih: {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
          </div>
          <div>
            Saat: {toHHMM(c.startMin)} → {toHHMM(c.endMin)}
          </div>
          <div>
            Günler: {weekMaskToText(c.weekMask)}
          </div>
          <div>
            Araç kayıt no: {c.vehicleId ?? "-"} • Sürücü kayıt no: {c.driverId ?? "-"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
