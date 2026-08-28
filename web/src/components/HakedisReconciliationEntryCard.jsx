import ReconciliationPreviewCard from "./ReconciliationPreviewCard";

export default function HakedisReconciliationEntryCard({ agreement, token, onOpenAgreement }) {
  const agreementId = Number(agreement?.id || 0);

  return (
    <section className="card" data-testid="hakedis-reconciliation-entry" style={{ display: "grid", gap: 10 }}>
      <div>
        <div className="panelSectionTitle">Hakediş ve fatura mutabakatı</div>
        <div className="panelMeta" style={{ marginTop: 4 }}>
          {agreementId > 0
            ? "Sözleşme ve operasyon kanıtlarını karşılaştırmalı olarak inceleyin."
            : "Sözleşme ve operasyon kanıtı oluştuğunda beklenen hakediş, fatura ve fark burada birlikte görünür."}
        </div>
      </div>

      {agreementId > 0 ? (
        <>
          <ReconciliationPreviewCard agreementId={agreementId} token={token} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn primary" data-testid="hakedis-reconciliation-cta" onClick={onOpenAgreement}>
              Mutabakatı incele
            </button>
          </div>
        </>
      ) : (
        <div data-testid="hakedis-reconciliation-empty" style={{ display: "grid", gap: 8 }}>
          <div className="panelMeta">Henüz mutabakat yapılabilecek sözleşme bulunmuyor.</div>
          <div className="panelMeta">Sözleşme oluştuğunda hakediş ve fatura kanıtları bu akıştan açılır.</div>
          <div>
            <button type="button" className="btn primary" data-testid="hakedis-reconciliation-cta" onClick={onOpenAgreement}>
              Sözleşmeleri aç
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
