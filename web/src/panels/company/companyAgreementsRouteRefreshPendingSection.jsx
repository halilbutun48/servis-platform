import CollapsibleSection from "../../components/CollapsibleSection";
import AgreementRouteChangePreviewCard from "../shared/AgreementRouteChangePreviewCard";
import DynamicSavingsPreviewCard from "../shared/DynamicSavingsPreviewCard";

export default function CompanyAgreementsRouteRefreshPendingSection({
  title,
  summaryText,
  companyOfferNote = "",
  roomCounterText = "",
  currentRouteText = "-",
  proposedRouteText = "-",
  diffText = "-",
  priceImpactText = "-",
  dynamicSavingsPreview = null,
  previewError = "",
  previewLoading = false,
  currentPreviewShiftId = 0,
  proposedPreviewShiftId = 0,
  showCounterActions = false,
  busy = false,
  onOpenCurrentPreview,
  onOpenProposedPreview,
  onAcceptCounter,
  onRejectCounter,
}) {
  const boundaryNote = showCounterActions
    ? "Bu sadece teklif / önizleme; rota uygulanmadı. Karşı teklif bekleniyor."
    : "Bu sadece teklif / önizleme; rota uygulanmadı.";

  return (
    <CollapsibleSection
      title={title}
      subtitle={summaryText}
      badge={showCounterActions ? "Karşı teklif" : "Talep"}
      defaultOpen={false}
      compact
    >
      <AgreementRouteChangePreviewCard
        summaryText={summaryText}
        companyOfferNote={companyOfferNote}
        roomCounterText={roomCounterText}
        currentRouteLabel="Eski rota"
        proposedRouteLabel="Yeni rota"
        diffLabel="Kişi / durak / km / süre farkı"
        currentRouteText={currentRouteText}
        proposedRouteText={proposedRouteText}
        diffText={diffText}
        priceImpactText={priceImpactText}
        boundaryNote={boundaryNote}
        previewError={previewError}
        previewLoading={previewLoading}
        currentPreviewShiftId={currentPreviewShiftId}
        proposedPreviewShiftId={proposedPreviewShiftId}
        onOpenCurrentPreview={onOpenCurrentPreview}
        onOpenProposedPreview={onOpenProposedPreview}
        actions={showCounterActions ? (
          <>
            <button type="button" disabled={busy} onClick={onAcceptCounter}>
              Karşı Teklifi Kabul Et
            </button>
            <button type="button" className="btn" disabled={busy} onClick={onRejectCounter}>
              Karşı Teklifi Reddet
            </button>
          </>
        ) : null}
      />
      {dynamicSavingsPreview ? (
        <div style={{ marginTop: 12 }}>
          <DynamicSavingsPreviewCard preview={dynamicSavingsPreview} />
        </div>
      ) : null}
    </CollapsibleSection>
  );
}
