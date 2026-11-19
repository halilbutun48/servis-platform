import { OfferCell } from "./roomAgreementsPanelSections";
import { daysLeftYmd, pill } from "./roomAgreementsPanelHelpers";
import { rowSelectionStyle } from "../../utils/listUi";

export default function RoomAgreementsOtherSection({
  filteredOthers,
  selectedAgreementId,
  setSelectedAgreementId,
  openAgreementDetail,
  agreementPreviewShiftId,
  openAgreementPreview,
  actionClassName = "roomActionCTA",
  previewLabel = "Rota Önizle",
}) {
  return (
    <div className="card">
      <div className="topbar" style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>Diğer Sözleşmeler</div>
        <div className="muted">Durum, dönem, ilgili firma ve teklif tutarı; ayrıntılar seçili kayıtta.</div>
      </div>

      <div className="tableWrap roomAgreementsOtherDesktopTable">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Durum</th><th>Dönem</th><th>İlgili firma</th><th>Teklif tutarı</th><th>Araç / sürücü</th><th>Aksiyon</th></tr></thead>
          <tbody>
            {filteredOthers.map((a) => (
              <tr key={a.id} data-room-agreement-detail={String(a.id)} tabIndex={-1} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                <td>{a.id}</td>
                <td>{pill(a.status)}</td>
                <td className="muted">{String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const left = daysLeftYmd(String(a.endDate || "").slice(0, 10)); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}</td>
                <td className="muted" data-room-agreement-company>{a.company?.name || "Firma bilgisi yok"}</td>
                <td><OfferCell amount={a.roomOfferAmount ?? a.companyOfferAmount} note={a.roomOfferNote ?? a.companyOfferNote} secondaryAmount={a.roomOfferAmount != null ? a.companyOfferAmount : null} secondaryNote={a.companyOfferNote} secondaryLabel="Firma teklifi" /></td>
                <td className="muted"><span data-room-agreement-vehicle>{a.vehicle?.plate || "Araç bilgisi yok"}</span><span aria-hidden="true"> / </span><span data-room-agreement-driver>{a.driver?.fullName || "Sürücü bilgisi yok"}</span></td>
                <td>
                  <button type="button" className={`btn sm primary ${actionClassName}`} onClick={(e) => { e.stopPropagation(); openAgreementDetail(a); }}>Detayı aç</button>
                  <button type="button" className={`btn sm ghost ${actionClassName}`} disabled={!agreementPreviewShiftId(a)} onClick={(e) => { e.stopPropagation(); openAgreementPreview(agreementPreviewShiftId(a), { title: `Sözleşme #${a.id} — Rota Önizleme` }); }}>{previewLabel}</button>
                </td>
              </tr>
            ))}
            {!filteredOthers.length ? <tr><td colSpan={7} className="muted">Kayıt yok.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="roomAgreementsOtherMobileCards">
        {filteredOthers.map((a) => (
          <article key={`mobile-${a.id}`} className="card roomAgreementMobileCard" data-room-agreement-mobile-detail={String(a.id)} tabIndex={-1} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
            <div className="topbar" style={{ alignItems: "flex-start", gap: 8 }}>
              <div><div style={{ fontWeight: 900 }}>Sözleşme #{a.id}</div><div className="muted" style={{ marginTop: 4 }}>{a.company?.name || "Firma bilgisi yok"}</div></div>
              {pill(a.status)}
            </div>
            <div className="roomAgreementMobileMeta">
              <div><div className="muted">Dönem</div><div>{String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}</div></div>
              <div><div className="muted">Teklif tutarı</div><OfferCell amount={a.roomOfferAmount ?? a.companyOfferAmount} note={a.roomOfferNote ?? a.companyOfferNote} secondaryAmount={a.roomOfferAmount != null ? a.companyOfferAmount : null} secondaryNote={a.companyOfferNote} secondaryLabel="Firma teklifi" /></div>
              <div><div className="muted">Araç / sürücü</div><div><span data-room-agreement-vehicle>{a.vehicle?.plate || "Araç bilgisi yok"}</span> / <span data-room-agreement-driver>{a.driver?.fullName || "Sürücü bilgisi yok"}</span></div></div>
            </div>
            <div className="actionsRow" style={{ marginTop: 12 }}>
              <button type="button" className={`btn sm primary ${actionClassName}`} onClick={(e) => { e.stopPropagation(); openAgreementDetail(a); }}>Detayı aç</button>
              <button type="button" className={`btn sm ghost ${actionClassName}`} disabled={!agreementPreviewShiftId(a)} onClick={(e) => { e.stopPropagation(); openAgreementPreview(agreementPreviewShiftId(a), { title: `Sözleşme #${a.id} — Rota Önizleme` }); }}>{previewLabel}</button>
            </div>
          </article>
        ))}
        {!filteredOthers.length ? <div className="muted">Kayıt yok.</div> : null}
      </div>
    </div>
  );
}
