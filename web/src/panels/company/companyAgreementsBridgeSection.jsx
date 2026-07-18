import CollapsibleSection from "../../components/CollapsibleSection";
import AgreementOpsBridgeCard from "../../components/AgreementOpsBridgeCard";
import QualityPaymentBridgePreviewCard from "../shared/QualityPaymentBridgePreviewCard";
import PlatformFeePreviewCard from "../shared/PlatformFeePreviewCard";
import SeferScorePreviewCard from "../shared/SeferScorePreviewCard";
import CompanyAgreementsRouteRefreshPendingSection from "./companyAgreementsRouteRefreshPendingSection";
import CompanyAgreementsSourceShiftSection from "./companyAgreementsSourceShiftSection";

function AgreementRoutePreviewEvidenceCard({ shiftId = 0 }) {
  const sid = Number(shiftId || 0);
  if (!sid) return null;

  return (
    <div className="card companyActionCTA" style={{ border: "1px solid rgba(88,166,255,.24)" }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>Rota/Durak Önizleme</div>
          <div className="muted" style={{ marginTop: 4 }}>Mini Map</div>
        </div>
        <button
          type="button"
          className="btn sm primary"
          disabled
          title="Bu önizleme yalnızca okunur."
        >
          Tam Rotayı Dış Navigasyonda Aç
        </button>
      </div>

      <div
        className="routePreviewMapFrame"
        style={{
          marginTop: 12,
          minHeight: 320,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(15,23,42,0.86), rgba(15,23,42,0.72))",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 20% 24%, rgba(37,99,235,0.18) 0, rgba(37,99,235,0.18) 1px, transparent 1px), radial-gradient(circle at 72% 68%, rgba(37,99,235,0.18) 0, rgba(37,99,235,0.18) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 100% 100%",
          }}
        />
        <div style={{ position: "relative", padding: 12, display: "grid", gap: 10, minHeight: 320 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>Mini Map</div>
            <span className="map-preview-pill">Duraklar + rota çizgisi</span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Leaflet mini-harita: Duraklar (1..N) ve rota çizgisi. S=Start, E=End.
          </div>
          <div
            aria-hidden="true"
            style={{
              flex: 1,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
              minHeight: 210,
              display: "grid",
              alignContent: "center",
              justifyItems: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "18%",
                top: "24%",
                width: "58%",
                height: 4,
                background: "#2563eb",
                opacity: 0.72,
                transform: "rotate(20deg)",
                borderRadius: 999,
              }}
            />
            <div className="row" style={{ gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span className="pill" data-status="READY">S</span>
              <span className="pill" data-status="READY">1</span>
              <span className="pill" data-status="READY">2</span>
              <span className="pill" data-status="READY">3</span>
              <span className="pill" data-status="READY">E</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompanyAgreementsBridgeSection({
  busy,
  selectedAgreementRow,
  selectedAgreementOrigin,
  selectedAgreementDetailRef,
  selectedAgreementBridgeReadOnly,
  bridgeDetailsRequested,
  selectedAgreementPreviewShiftId,
  selectedRouteRefreshCurrentPreviewShiftId,
  selectedRouteRefreshProposedPreviewShiftId,
  selectedRouteRefreshPending,
  selectedRouteRefreshCountered,
  selectedRouteRefreshSummaryText,
  selectedRouteRefreshRoomCounterText,
  selectedRouteRefreshCurrentText,
  selectedRouteRefreshProposedText,
  selectedRouteRefreshDiffText,
  selectedRouteRefreshPriceImpactText,
  routeRefreshPreviewSummary,
  selectedDynamicSavingsPreview,
  qualityPaymentBridgePreview,
  seferScorePreviewData,
  seferScorePreview,
  platformFeePreviewData,
  platformFeePreview,
  openAgreementShift,
  startRouteRefresh,
  acceptRouteRefreshCounter,
  rejectRouteRefreshCounter,
}) {
  const selectedAgreement = selectedAgreementRow?.a || null;
  const selectedRoom = selectedAgreementRow?.room || null;
  const routePreviewShiftId = selectedAgreementPreviewShiftId || selectedRouteRefreshCurrentPreviewShiftId || selectedRouteRefreshProposedPreviewShiftId;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!selectedAgreement ? (
        <div className="card companyActionCTA" style={{ border: "1px solid rgba(88,166,255,.24)" }}>
          <div style={{ fontWeight: 900 }}>Operasyon bağlantısı</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Bu okul/kurum görünümünde seçili sözleşme yok. Listeyi yenileyebilir veya Sözleşmeler sekmesinden bir kayıt seçebilirsin.
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 12, fontWeight: 800 }}>
            Detayı kapat
          </div>
        </div>
      ) : null}

      {selectedAgreement && selectedAgreementOrigin ? (
        <CompanyAgreementsSourceShiftSection
          origin={selectedAgreementOrigin}
          canShowRouteRefreshActions={false}
          previewShiftId={selectedAgreementPreviewShiftId}
          routeRefreshActionDisabled={busy || Boolean(selectedRouteRefreshPending)}
          routeRefreshActionLabel={selectedRouteRefreshCountered ? "Karşı Teklif Geldi" : selectedRouteRefreshPending ? "Rota Güncelleme Bekliyor" : "Rota Güncelle"}
          onOpenSourceShift={() => openAgreementShift(selectedAgreementOrigin.sourceShiftId, false)}
          onOpenPreview={null}
          onStartRouteRefresh={() => startRouteRefresh(selectedAgreement, selectedRoom)}
        />
      ) : null}

      {selectedAgreement ? (
        <div ref={selectedAgreementDetailRef}>
          <div className="row" style={{ justifyContent: "flex-start", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn sm primary"
              disabled={!routePreviewShiftId}
              onClick={() => openAgreementShift(routePreviewShiftId, false)}
            >
              Detayı aç
            </button>
          </div>
          <CollapsibleSection
            title="Operasyon bağlantısı"
            subtitle="Seçili sözleşmenin ürettiği vardiya ve önizleme bağlantısı ikinci katmanda."
            badge={selectedAgreement?.id ? `#${selectedAgreement.id}` : "Seçili"}
            defaultOpen={true}
            compact
          >
            <AgreementOpsBridgeCard
              key={`company-bridge-${selectedAgreement.id}-${bridgeDetailsRequested ? "open" : "closed"}`}
              agreement={selectedAgreement}
              room={selectedRoom}
              bridge={selectedAgreementBridgeReadOnly}
              onOpenShift={(shiftId) => openAgreementShift(shiftId, false)}
              onOpenPreview={(shiftId) => openAgreementShift(shiftId, true)}
              initialDetailsOpen={bridgeDetailsRequested}
              emptyText="Bu sözleşmeden henüz üretilmiş vardiya yok. Operasyon bağlantısı ilk generated shift oluşunca burada görünür."
            />
          </CollapsibleSection>
        </div>
      ) : null}

      {routePreviewShiftId ? (
        <AgreementRoutePreviewEvidenceCard
          shiftId={routePreviewShiftId}
        />
      ) : null}

      {selectedAgreement ? (
        <CollapsibleSection
          title="Kalite / hakediş önizlemesi"
          subtitle="Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz."
          badge={selectedAgreement?.id ? `#${selectedAgreement.id}` : "Seçili"}
          defaultOpen={false}
          compact
        >
          <QualityPaymentBridgePreviewCard
            agreement={selectedAgreement}
            preview={qualityPaymentBridgePreview.data}
            loading={qualityPaymentBridgePreview.loading}
            error={qualityPaymentBridgePreview.err}
          />
          <SeferScorePreviewCard
            agreement={selectedAgreement}
            preview={seferScorePreviewData}
            loading={seferScorePreview.loading}
            error={seferScorePreview.err}
            style={{ marginTop: 12 }}
          />
          <PlatformFeePreviewCard
            agreement={selectedAgreement}
            preview={platformFeePreviewData}
            loading={platformFeePreview.loading}
            error={platformFeePreview.err}
            style={{ marginTop: 12 }}
          />
        </CollapsibleSection>
      ) : null}

      {selectedRouteRefreshPending ? (
        <CompanyAgreementsRouteRefreshPendingSection
          title={selectedRouteRefreshCountered ? "Rota güncelleme karşı teklifi" : "Bekleyen rota güncelleme teklifi"}
          summaryText={selectedRouteRefreshSummaryText}
          companyOfferNote={selectedRouteRefreshPending.companyOfferNote || ""}
          roomCounterText={selectedRouteRefreshRoomCounterText}
          currentRouteText={selectedRouteRefreshCurrentText}
          proposedRouteText={selectedRouteRefreshProposedText}
          diffText={selectedRouteRefreshDiffText}
          priceImpactText={selectedRouteRefreshPriceImpactText}
          previewError={routeRefreshPreviewSummary.err}
          previewLoading={routeRefreshPreviewSummary.loading}
          currentPreviewShiftId={selectedRouteRefreshCurrentPreviewShiftId}
          proposedPreviewShiftId={selectedRouteRefreshProposedPreviewShiftId}
          dynamicSavingsPreview={selectedDynamicSavingsPreview}
          showCounterActions={selectedRouteRefreshCountered}
          busy={busy}
          onOpenCurrentPreview={null}
          onOpenProposedPreview={null}
          onAcceptCounter={() => acceptRouteRefreshCounter(selectedRouteRefreshPending.id)}
          onRejectCounter={() => rejectRouteRefreshCounter(selectedRouteRefreshPending.id)}
        />
      ) : null}
    </div>
  );
}
