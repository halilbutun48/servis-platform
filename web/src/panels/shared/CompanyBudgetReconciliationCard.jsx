import FinanceRiskBadge from "./FinanceRiskBadge.jsx";
import { buildCompanyReconciliationRiskPresentation } from "./financeRiskPresentation.js";

function formatMoneyMinor(value, currencyCode = "TRY") {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(numeric / 100)}${suffix}`;
}

function formatDateOnly(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function EvidenceMetric({ title, value, note, href = "" }) {
  return (
    <div className="card" style={{ padding: 12, minWidth: 0, background: "rgba(255,255,255,0.02)" }}>
      <div className="panelSectionTitle">{href ? <a href={href}>{title}</a> : title}</div>
      <div className="panelStatValue" style={{ marginTop: 6 }}>{href ? <a href={href} style={{ color: "inherit", textDecoration: "none" }}>{value}</a> : value}</div>
      <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.4 }}>{note}</div>
    </div>
  );
}

export default function CompanyBudgetReconciliationCard({ summary = {}, currencyCode = "TRY", agreementPath = "/company/agreements" }) {
  const items = Array.isArray(summary?.financialEvidence) ? summary.financialEvidence : [];
  if (!items.length) return null;

  const totals = summary?.evidenceTotals || {};
  const status = summary?.financialEvidenceStatus || summary?.status || "EVIDENCE_MISSING";
  const risk = buildCompanyReconciliationRiskPresentation({ status });
  const serviceEligibleCount = Number.isSafeInteger(Number(totals.serviceEligibleCount)) ? Number(totals.serviceEligibleCount) : null;
  const serviceCompletedCount = Number.isSafeInteger(Number(totals.serviceCompletedCount)) ? Number(totals.serviceCompletedCount) : null;
  const serviceText = serviceEligibleCount == null || serviceCompletedCount == null
    ? "-"
    : `${serviceCompletedCount} / ${serviceEligibleCount} hareket tamamlandı`;
  const evidenceNote = items.length === 1
    ? `Sözleşme #${items[0].agreementId} için ayrı kanıt özeti.`
    : `${items.length} sözleşmenin kanıtı ayrı değerlendiriliyor.`;
  const collectionDates = [...new Set(items.flatMap((item) => (
    Array.isArray(item?.payment?.collectionDates) ? item.payment.collectionDates : []
  )))].map(formatDateOnly).filter(Boolean);
  const collectionDateText = collectionDates.length
    ? collectionDates.join(", ")
    : "Doğrulanmış tarih yok";
  const sourceAgreementId = Number(items[0]?.agreementId || 0);
  const sourceHref = sourceAgreementId > 0
    ? `#${agreementPath}?focusAgreementId=${encodeURIComponent(String(sourceAgreementId))}`
    : `#${agreementPath}?detail=bridge`;
  const invoiceAmountMinor = Number(totals.invoiceAmountMinor);
  const paidAmountMinor = Number(totals.paidAmountMinor);
  const remainingPaymentMinor = Number.isSafeInteger(invoiceAmountMinor)
    && invoiceAmountMinor >= 0
    && Number.isSafeInteger(paidAmountMinor)
    && paidAmountMinor >= 0
    && paidAmountMinor <= invoiceAmountMinor
    ? invoiceAmountMinor - paidAmountMinor
    : null;

  return (
    <div className="card" data-testid="company-budget-reconciliation" style={{ marginTop: 12, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div className="panelSectionTitle">Gerçekleşen hizmet ve finans kanıtı</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Sözleşme taahhüdü, gerçekleşen hizmet, hakediş, fatura ve ödeme ayrı tutulur; aynı tutar iki kez düşülmez.
          </div>
        </div>
        <FinanceRiskBadge risk={risk} testId="company-budget-reconciliation-risk" />
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <EvidenceMetric
          title="Gerçekleşen hizmet"
          value={serviceText}
          note={serviceCompletedCount === serviceEligibleCount && serviceEligibleCount > 0 ? "Hizmet kanıtı tamamlandı." : "Tamamlanan hizmet kanıtı eksik."}
          href={sourceHref}
        />
        <EvidenceMetric
          title="Hakediş"
          value={formatMoneyMinor(totals.hakedisAmountMinor, currencyCode)}
          note={totals.hakedisAmountMinor == null ? "Hakediş kaydı yok veya kapsam tamamlanmadı." : "Kayıtlı hakediş tutarı."}
          href={sourceHref}
        />
        <EvidenceMetric
          title="Fatura"
          value={formatMoneyMinor(totals.invoiceAmountMinor, currencyCode)}
          note={totals.invoiceAmountMinor == null ? "Fatura kaydı yok veya eşleşme tamamlanmadı." : "Hakedişle karşılaştırılan fatura tutarı."}
          href={sourceHref}
        />
        <EvidenceMetric
          title="Ödenen"
          value={formatMoneyMinor(totals.paidAmountMinor, currencyCode)}
          note={totals.paidAmountMinor == null ? "Doğrulanmış ödeme/tahsilat kanıtı yok." : "Doğrulanmış tahsilat tutarı."}
          href={sourceHref}
        />
        <EvidenceMetric
          title="Kalan ödeme"
          value={formatMoneyMinor(remainingPaymentMinor, currencyCode)}
          note={remainingPaymentMinor == null ? "Fatura ve ödeme eşleşmesi doğrulanamadı." : "Fatura eksi doğrulanmış ödeme; gerçekleşen harcamaya eklenmez."}
          href={sourceHref}
        />
      </div>

      <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.45 }}>{evidenceNote}</div>
      <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>
        <b>Tahsilat tarihi:</b> {collectionDateText}
      </div>
      <div className="panelMeta" style={{ marginTop: 8 }}><a href={sourceHref}>Kaynak sözleşme ve kanıt kayıtlarını aç</a></div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {items.map((item) => (
          <div key={String(item.agreementId)} className="panelMeta" style={{ lineHeight: 1.45 }}>
            <b>Sözleşme #{item.agreementId}</b> · {item.statusLabel || "Finansal kanıt eksik"} · {item.missingDataText || "Eksik kayıt görünmüyor."}
          </div>
        ))}
      </div>
    </div>
  );
}
