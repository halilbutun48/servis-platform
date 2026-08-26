import AgreementOpsBridgeCard from "../../components/AgreementOpsBridgeCard";
import QualityPaymentBridgePreviewCard from "../shared/QualityPaymentBridgePreviewCard";
import PlatformFeePreviewCard from "../shared/PlatformFeePreviewCard";
import SeferScorePreviewCard from "../shared/SeferScorePreviewCard";
import AgreementConflictBox from "../../components/AgreementConflictBox";
import CollapsibleSection from "../../components/CollapsibleSection";
import { moneyTry } from "./roomAgreementsPanelHelpers";

export default function RoomAgreementsBridgeSection({
  busy,
  copilotAgreementTarget,
  opsBridge,
  bridgeDetailsRequested,
  onRequestBridgeDetails,
  onOpenShift,
  onOpenPreview,
  qualityPaymentBridgePreview,
  seferScorePreviewData,
  seferScorePreview,
  platformFeePreviewData,
  platformFeePreview,
  counterTarget,
  counterAmount,
  counterNote,
  onChangeCounterAmount,
  onChangeCounterNote,
  onCounterSubmit,
  onCounterCancel,
  approveTarget,
  vehicles,
  drivers,
  selVehicle,
  selDriver,
  onChangeVehicle,
  onChangeDriver,
  onApproveSubmit,
  onApproveCancel,
  conflict,
  onClearConflict,
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card roomCriticalFixScope" style={{ border: "1px solid rgba(88,166,255,.24)" }}>
        <div style={{ fontWeight: 900 }}>Operasyon Köprüsü</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
          Detayları aç ile köprü kartını genişlet; ardından Vardiyaya git veya Rota Önizleme ile ilerle.
        </div>
        <div className="muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
          Bu alan önizlemedir; işlem başlatmaz.
        </div>
        <div className="muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
          Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn sm primary roomActionCTA"
            onClick={onRequestBridgeDetails}
          >
            Detayı aç
          </button>
        </div>
      </div>

      {copilotAgreementTarget ? (
        <div style={{ display: "grid", gap: 8 }}>
          <AgreementOpsBridgeCard
            key={`room-bridge-${copilotAgreementTarget.id}-${bridgeDetailsRequested ? "open" : "closed"}`}
            agreement={copilotAgreementTarget}
            bridge={opsBridge?.[copilotAgreementTarget.id] || null}
            onOpenShift={onOpenShift}
            onOpenPreview={onOpenPreview}
            initialDetailsOpen={bridgeDetailsRequested}
          />
        </div>
      ) : (
        <div className="card muted">Operasyon köprüsü için bir sözleşme seç.</div>
      )}

      <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
        İpucu: Detayı aç ile köprü kartını genişlet; ardından Vardiyaya git veya Rota Önizleme ile ilerle.
      </div>

      {copilotAgreementTarget ? (
        <div style={{ display: "grid", gap: 8 }}>
          <CollapsibleSection
            title="Kalite / hakediş önizlemesi"
            subtitle="Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz."
            badge={copilotAgreementTarget?.id ? `Sözleşme ID ${copilotAgreementTarget.id}` : "Seçili"}
            defaultOpen={false}
            compact
          >
            <QualityPaymentBridgePreviewCard
              agreement={copilotAgreementTarget}
              preview={qualityPaymentBridgePreview.data}
              loading={qualityPaymentBridgePreview.loading}
              error={qualityPaymentBridgePreview.err}
            />
            <SeferScorePreviewCard
              agreement={copilotAgreementTarget}
              preview={seferScorePreviewData}
              loading={seferScorePreview.loading}
              error={seferScorePreview.err}
              style={{ marginTop: 12 }}
            />
            <PlatformFeePreviewCard
              agreement={copilotAgreementTarget}
              preview={platformFeePreviewData}
              loading={platformFeePreview.loading}
              error={platformFeePreview.err}
              style={{ marginTop: 12 }}
            />
          </CollapsibleSection>
        </div>
      ) : null}

      {counterTarget ? (
        <div className="card">
          <div style={{ fontWeight: 900 }}>Karşı Teklif • Sözleşme ID {counterTarget.id}</div>

          <div className="muted" style={{ marginTop: 6 }}>
            Hizmet Alan Firma teklifi: <b>{moneyTry(counterTarget.companyOfferAmount)}</b>
            {counterTarget.companyOfferNote ? <span> — {counterTarget.companyOfferNote}</span> : null}
          </div>

          <div className="fieldRow" style={{ marginTop: 12 }}>
            <div className="field">
              <div className="muted">Karşı Teklif (₺)</div>
              <input value={counterAmount} onChange={(e) => onChangeCounterAmount(e.target.value)} placeholder="örn: 5000" />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <div className="muted">Not (opsiyonel)</div>
              <input value={counterNote} onChange={(e) => onChangeCounterNote(e.target.value)} placeholder="örn: 3 gün / 2 araç" />
            </div>
          </div>

          <div className="actionsRow" style={{ marginTop: 12 }}>
            <button type="button" className="btn sm primary" disabled={busy} onClick={onCounterSubmit}>
              {busy ? "Gönderiliyor..." : "Karşı Teklif Gönder"}
            </button>
            <button
              type="button"
              className="btn sm ghost"
              disabled={busy}
              onClick={onCounterCancel}
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}

      {approveTarget ? (
        <div className="card">
          <div style={{ fontWeight: 900 }}>Kabul Akışı • Sözleşme ID {approveTarget.id}</div>

          <div className="muted" style={{ marginTop: 6 }}>
            Hizmet Alan Firma teklifi: <b>{moneyTry(approveTarget.companyOfferAmount)}</b>
            {approveTarget.companyOfferNote ? <span> — {approveTarget.companyOfferNote}</span> : null}
          </div>

          <div className="fieldRow" style={{ marginTop: 12 }}>
            <div className="field">
              <div className="muted">Araç</div>
              <select
                value={selVehicle}
                onChange={(e) => {
                  onChangeVehicle(e.target.value);
                  onClearConflict();
                }}
              >
                <option value="">Seç</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate ?? `Araç ID ${v.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="muted">Sürücü</div>
              <select
                value={selDriver}
                onChange={(e) => {
                  onChangeDriver(e.target.value);
                  onClearConflict();
                }}
              >
                <option value="">Seç</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName ?? `Sürücü ID ${d.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="actionsRow" style={{ marginTop: 12 }}>
            <button type="button" className="btn sm primary" disabled={busy} onClick={onApproveSubmit}>
              {busy ? "Kabul ediliyor..." : "Kabul Et"}
            </button>
            <button
              type="button"
              className="btn sm ghost"
              disabled={busy}
              onClick={onApproveCancel}
            >
              Vazgeç
            </button>
          </div>

          <AgreementConflictBox errObj={conflict} />
        </div>
      ) : null}
    </div>
  );
}
