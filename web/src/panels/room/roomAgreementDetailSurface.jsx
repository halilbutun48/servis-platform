import { toHHMM } from "../../utils/agreementUi";
import { userFacingDirectionLabel, userFacingPatternLabel } from "../../utils/terminology";
import { pill } from "./roomAgreementsPanelHelpers";

export default function RoomAgreementDetailSurface({ agreement, viewMode, openAgreementBridge, openAgreementQuotePreview }) {
  if (!agreement) return null;
  return (
    <section
      className="card"
      data-room-agreement-detail-surface={String(agreement.id)}
      tabIndex={-1}
      aria-labelledby={`room-agreement-detail-title-${agreement.id}`}
      style={{ marginTop: 12, display: "grid", gap: 12, scrollMarginTop: 18 }}
    >
      <div className="topbar" style={{ alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 id={`room-agreement-detail-title-${agreement.id}`} style={{ margin: 0 }}>
            Sözleşme #{agreement.id} ayrıntıları
          </h3>
          <div className="muted" style={{ marginTop: 4 }}>
            {viewMode === "pending"
              ? "Bu kayıt karar aşamasında; bağlı operasyon karardan sonra oluşur."
              : "Bu kayıt kabul edilmiş veya devam eden sözleşmeler arasındadır; operasyon bağlantısı aşağıdaki köprüden izlenir."}
          </div>
        </div>
        <button type="button" className="btn sm" onClick={() => openAgreementBridge(agreement)}>
          Operasyon köprüsüne geç
        </button>
        <button type="button" className="btn sm primary" data-testid="room-agreement-detail-quote-preview" onClick={() => openAgreementQuotePreview(agreement)}>
          Teklif önizlemesine geç
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div><div className="muted">Mevcut durum</div><div style={{ marginTop: 4 }}>{pill(agreement.status)}</div></div>
        <div><div className="muted">Tarih</div><div style={{ marginTop: 4 }}>{String(agreement.startDate || "-").slice(0, 10)} → {String(agreement.endDate || "-").slice(0, 10)}</div></div>
        <div><div className="muted">Saat / plan</div><div style={{ marginTop: 4 }}>{toHHMM(agreement.startMin)} → {toHHMM(agreement.endMin)} • {userFacingDirectionLabel(agreement.direction || "INBOUND")} / {userFacingPatternLabel(agreement.pattern || "ONE_WAY")}</div></div>
        <div><div className="muted">Araç / sürücü</div><div style={{ marginTop: 4 }}>{agreement.vehicle?.plate || "Araç bilgisi yok"} / {agreement.driver?.fullName || "Sürücü bilgisi yok"}</div></div>
      </div>

      <div className="muted" style={{ borderTop: "1px solid var(--border, #d9dee8)", paddingTop: 10 }}>
        Sonraki işlem: {viewMode === "pending"
          ? "Kabul et, karşı teklif ver veya reddet."
          : "Operasyon Köprüsü'nde bağlı vardiyayı ve operasyon kanıtını kontrol et."}
      </div>
    </section>
  );
}
