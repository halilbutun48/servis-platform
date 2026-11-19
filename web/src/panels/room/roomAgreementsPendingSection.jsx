import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import { toHHMM, weekMaskToText } from "../../utils/agreementUi";
import { userFacingDirectionLabel, userFacingPatternLabel } from "../../utils/terminology";
import { daysLeftYmd, OfferCell, ShiftSummary } from "./roomAgreementsPendingSectionSupport";
import { rowSelectionStyle } from "../../utils/listUi";

export default function RoomAgreementsPendingSection({
  filteredPending,
  selectedAgreementId,
  setSelectedAgreementId,
  shiftStats,
  busy,
  openAgreementDetail,
  agreementPreviewShiftId,
  openAgreementPreview,
  setCounterId,
  setApproveId,
  setConflict,
  setCounterAmount,
  setCounterNote,
  setViewMode,
  rejectAgreement,
  actionClassName = "roomActionCTA",
  previewLabel = "Rota Önizle",
  approvalLabel = "Kabul Et",
}) {
  return (
    <div className="card">
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Bekleyen Sözleşmeler</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Yeni gelen teklif, karşı teklif ve karar bekleyen kayıtlar burada listelenir. Operasyon köprüsü üstteki tek CTA ile açılır; detaylar burada tekrar edilmez.
      </div>
      <div className="tableWrap">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Tarih</th><th>Saat</th><th>Günler</th><th>Yön / plan</th><th>Vardiyalar</th><th>Toplanma Konumu</th><th>Hizmet Alan Firma Teklifi</th><th>Taşımacılık Firması Karşı Teklifi</th><th>Aksiyon</th></tr></thead>
          <tbody>
            {filteredPending.map((a) => (
              <tr key={a.id} data-room-agreement-detail={String(a.id)} tabIndex={-1} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                <td><div>{a.id}</div><CommercialReadonlySummary item={a.commercialBackbone} compact /></td>
                <td className="muted">{String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const left = daysLeftYmd(String(a.endDate || "").slice(0, 10)); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}</td>
                <td className="muted">{toHHMM(a.startMin)} → {toHHMM(a.endMin)} {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}</td>
                <td className="muted" title="Çalışma günleri">{weekMaskToText(a.weekMask)}</td>
                <td className="muted">{userFacingDirectionLabel(a.direction || "INBOUND")} / {userFacingPatternLabel(a.pattern || "ONE_WAY")}</td>
                <td><ShiftSummary st={shiftStats?.[a.id]} /></td>
                <td className="muted">{typeof a.hubLat === "number" && typeof a.hubLng === "number" ? `${a.hubLat.toFixed(4)}, ${a.hubLng.toFixed(4)}` : "-"}</td>
                <td><OfferCell amount={a.companyOfferAmount} note={a.companyOfferNote} /></td>
                <td><OfferCell amount={a.roomOfferAmount} note={a.roomOfferNote} /></td>
                <td>
                  <button type="button" className={`btn sm primary ${actionClassName}`} onClick={(e) => { e.stopPropagation(); openAgreementDetail(a); }}>Detayı aç</button>
                  <button type="button" className={`btn sm ghost ${actionClassName}`} disabled={!agreementPreviewShiftId(a)} onClick={(e) => { e.stopPropagation(); openAgreementPreview(agreementPreviewShiftId(a), { title: `Sözleşme #${a.id} — Rota Önizleme` }); }}>{previewLabel}</button>
                  <button type="button" className="btn sm ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); setSelectedAgreementId(a.id); setCounterId(a.id); setApproveId(null); setConflict(null); setCounterAmount(String(a.roomOfferAmount ?? a.companyOfferAmount ?? "")); setCounterNote(String(a.roomOfferNote ?? "")); setViewMode("bridge"); }}>Karşı Teklif</button>
                  <button type="button" className="btn sm ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); rejectAgreement(a.id); }}>Reddet</button>
                  <button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); setSelectedAgreementId(a.id); setApproveId(a.id); setCounterId(null); setConflict(null); setViewMode("bridge"); }}>{approvalLabel}</button>
                </td>
              </tr>
            ))}
            {!filteredPending.length ? <tr><td colSpan={10} className="muted">Bekleyen sözleşme yok.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
