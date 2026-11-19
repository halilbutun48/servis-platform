import { useEffect, useMemo, useState } from "react";
import PanelChrome from "../../components/PanelChrome";
import { getCompanyOffers } from "../../utils/companyDataHub";
import {
  budgetApprovalStateLabel,
  budgetSourceLabel,
  confidenceLabel,
  confidenceTone,
  currencyCodeLabel,
  financeFieldLabels,
  lifecycleStateLabel,
  normalizeFinanceVisibleText,
  previewStatusLabel,
  previewStatusTone,
  serviceCostComponentLabel,
  serviceCostTaxBasisLabel,
  serviceCostSourceLabel,
} from "./financialOperationsPresentation";
import { buildOfferBudgetComparisonPresentation } from "./companyBudgetOfferComparisonPresentation.js";
import { buildCompanyOfferEvaluationPresentation } from "./companyOfferEvaluationPresentation.js";
import { buildCompanyBudgetRiskPresentation } from "./financeRiskPresentation.js";
import FinanceRiskBadge from "./FinanceRiskBadge.jsx";
import CompanyBudgetReconciliationCard from "./CompanyBudgetReconciliationCard.jsx";
import CompanyInvoicePaymentPanel from "../../components/CompanyInvoicePaymentPanel.jsx";
import {
  formatBudgetAmountInputFromMinor,
  parseBudgetAmountInputToMinor,
} from "./companyBudgetAmountPresentation.js";

function formatMoneyMinor(value, currencyCode = "TRY") {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n / 100)}${suffix}`;
}

function formatTextOrDash(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function formatDateForUser(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? text
    : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatPeriodForUser(value, fallbackStart = "", fallbackEnd = "") {
  const text = String(value ?? "").trim();
  const range = text.match(/^(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})$/);
  if (range) return `${formatDateForUser(range[1])} – ${formatDateForUser(range[2])}`;
  if (fallbackStart || fallbackEnd) {
    return `${formatDateForUser(fallbackStart || "-")} – ${formatDateForUser(fallbackEnd || "-")}`;
  }
  return formatDateForUser(text);
}

function agreementPathForBuyerKind(kind) {
  const key = String(kind || "").trim().toUpperCase();
  if (key === "SCHOOL") return "/school/agreements";
  if (key === "ORGANIZATION") return "/organization/agreements";
  return "/company/agreements";
}

function formatBpsInput(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n / 100) : "";
}

function parseBpsInput(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return "";
  const n = Number(text);
  return Number.isFinite(n) ? String(Math.round(n * 100)) : "";
}

function visibleText(value, fallback = "-") {
  const text = normalizeFinanceVisibleText(String(value ?? "").trim());
  return text || fallback;
}

function MetricCard({ title, value, note, tone = "default", href = "" }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    muted: { border: "1px solid rgba(148,163,184,0.24)", title: "#aab4c3", value: "#d0d5dd" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
    danger: { border: "1px solid rgba(240,68,56,0.35)", title: "#fda29b", value: "#fecaca" },
  }[tone] || {
    border: "1px solid rgba(255,255,255,0.08)",
    title: "#98a2b3",
    value: "#f8fafc",
  };

  return (
    <div style={{ padding: 14, border: palette.border, borderRadius: 12, minWidth: 0 }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8, color: palette.title }}>
        {href ? <a href={href} style={{ color: palette.title, textDecoration: "underline", textUnderlineOffset: 3 }}>{title}</a> : title}
      </div>
      <div className="panelStatValue" style={{ color: palette.value }}>
        {href ? <a href={href} style={{ color: palette.value, textDecoration: "none" }}>{value}</a> : value}
      </div>
      {note ? <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>{note}</div> : null}
    </div>
  );
}

function CompanyFinancialEvidenceSummary({ summary = {}, currencyCode = "TRY", expectedPeriodAmountMinor = null, agreementPath = "/company/agreements" }) {
  const totals = summary?.evidenceTotals || {};
  const hasEvidence = Array.isArray(summary?.financialEvidence) && summary.financialEvidence.length > 0;
  if (!hasEvidence) return null;
  const serviceEligibleCount = totals.serviceEligibleCount ?? 0;
  const serviceCompletedCount = totals.serviceCompletedCount ?? 0;
  const sourceAgreementId = Number(summary?.financialEvidence?.[0]?.agreementId || 0);
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
    <div className="card" data-testid="company-financial-evidence-summary" style={{ marginTop: 12, padding: 14, border: "1px solid rgba(18,183,106,0.28)", background: "rgba(18,183,106,0.04)" }}>
      <div className="panelSectionTitle">Finansal kanıt durumu</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Hizmet {serviceCompletedCount}/{serviceEligibleCount} tamamlandı; COMPANY gideri ile ROOM tedarikçi kanıtları ayrı izlenir.
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        <MetricCard
          title="COMPANY gerçekleşen gideri"
          value={formatMoneyMinor(totals.realizedServiceAmountMinor, currencyCode)}
          note={totals.realizedServiceAmountMinor == null ? "Tamamlanan hizmet ve COMPANY sözleşme bedeli birlikte doğrulanmadı." : "Tamamlanan hizmet ve COMPANY sözleşme bedeli; ROOM tedarikçi tutarından ayrı."}
          tone={totals.realizedServiceAmountMinor == null ? "muted" : "good"}
          href={sourceHref}
        />
        <MetricCard title="Hakediş" value={formatMoneyMinor(totals.hakedisAmountMinor, currencyCode)} href={sourceHref} />
        <MetricCard title="Fatura (ROOM tedarikçi)" value={formatMoneyMinor(totals.invoiceAmountMinor, currencyCode)} href={sourceHref} />
        <MetricCard title="Ödenen (ROOM tahsilatı)" value={formatMoneyMinor(totals.paidAmountMinor, currencyCode)} href={sourceHref} />
        <MetricCard
          title="Kalan ödeme (ROOM faturası)"
          value={formatMoneyMinor(remainingPaymentMinor, currencyCode)}
          note={remainingPaymentMinor == null ? "ROOM faturası ve tahsilat eşleşmesi doğrulanamadı." : "ROOM tedarikçi faturası eksi doğrulanmış tahsilat; COMPANY giderine ikinci kez eklenmez."}
          tone={remainingPaymentMinor == null ? "muted" : remainingPaymentMinor > 0 ? "warm" : "good"}
          href={sourceHref}
        />
        <MetricCard
          title="Beklenen dönem tutarı"
          value={formatMoneyMinor(expectedPeriodAmountMinor, currencyCode)}
          note={expectedPeriodAmountMinor == null ? "Sözleşme veya planlama referansı bulunamadı." : "Sözleşme/planlama referansı; gerçekleşmiş harcama değildir."}
          tone="muted"
        />
      </div>
      <div className="panelMeta" style={{ marginTop: 8 }}>Bu tutarlar bütçe taahhüdüne veya gerçekleşen harcamaya ikinci kez eklenmez.</div>
      <div className="panelMeta" style={{ marginTop: 8 }}><a href={sourceHref}>Kaynak sözleşme ve kanıt kayıtlarını aç</a></div>
    </div>
  );
}

function CompanyHistoricalFinancialEvidence({
  items = [],
  currencyCode = "TRY",
  agreementPath = "/company/agreements",
  token = "",
  selectedInvoiceId = null,
  onSelectInvoice = null,
  onChanged = null,
}) {
  const evidenceItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!evidenceItems.length) return null;
  return (
    <div className="card" data-testid="company-historical-financial-evidence" style={{ marginTop: 12, padding: 14, border: "1px solid rgba(18,183,106,0.28)", background: "rgba(18,183,106,0.04)" }}>
      <div className="panelSectionTitle">Tamamlanmış finans dönemi</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Gerçekleşen hizmet kanıtı, seçili güncel önizlemeden ayrı tutulur. COMPANY gideri sözleşme bedelinden; ROOM hakedişi, tedarikçi faturası ve tahsilatı karşı taraf kanıtlarından okunur.
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {evidenceItems.map((item) => {
          const invoiceAmountMinor = Number(item?.invoice?.amountMinor);
          const paidAmountMinor = item?.payment?.status === "AVAILABLE" ? Number(item?.payment?.amountMinor) : NaN;
          const remainingPaymentMinor = Number.isSafeInteger(invoiceAmountMinor)
            && invoiceAmountMinor >= 0
            && Number.isSafeInteger(paidAmountMinor)
            && paidAmountMinor >= 0
            && paidAmountMinor <= invoiceAmountMinor
            ? invoiceAmountMinor - paidAmountMinor
            : null;
          const sourceHref = Number(item?.agreementId) > 0
            ? `#${agreementPath}?focusAgreementId=${encodeURIComponent(String(item.agreementId))}`
            : `#${agreementPath}?detail=bridge`;
          return (
            <div key={String(item.agreementId)} style={{ paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{formatPeriodForUser("", item?.period?.start, item?.period?.end)}</strong>
                <a href={sourceHref}>Sözleşme #{item.agreementId} kaydını aç</a>
              </div>
              <div className="panelMeta" style={{ marginTop: 6 }}>
                {item?.serviceEvidence?.completedCount || 0}/{item?.serviceEvidence?.eligibleCount || 0} hizmet hareketi tamamlandı · Kanıt düzeyi: yüksek
              </div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                <MetricCard
                  title="COMPANY gerçekleşen gideri"
                  value={formatMoneyMinor(item?.companyContractAmountMinor, currencyCode)}
                  note={item?.companyContractAmountMinor == null ? "Kabul edilmiş ticari fiyat kanıtı bulunamadı." : "Tamamlanan hizmet ve kabul edilmiş ticari fiyat."}
                  tone={item?.companyContractAmountMinor == null ? "muted" : "good"}
                />
                <MetricCard title="ROOM hakedişi" value={formatMoneyMinor(item?.hakedis?.amountMinor, currencyCode)} />
                <MetricCard title="Fatura (ROOM tedarikçi)" value={formatMoneyMinor(item?.invoice?.amountMinor, currencyCode)} />
                <MetricCard title="Ödenen (ROOM tahsilatı)" value={formatMoneyMinor(item?.payment?.amountMinor, currencyCode)} />
                <MetricCard
                  title="Kalan ödeme (ROOM faturası)"
                  value={formatMoneyMinor(remainingPaymentMinor, currencyCode)}
                  note={remainingPaymentMinor == null ? "ROOM faturası ve tahsilat mutabakatı tamamlanmadı." : "ROOM faturası eksi doğrulanmış tahsilat; COMPANY giderine ikinci kez eklenmez."}
                  tone={remainingPaymentMinor == null ? "muted" : remainingPaymentMinor > 0 ? "warm" : "good"}
                />
              </div>
              <CompanyInvoicePaymentPanel
                invoiceId={item?.invoice?.id}
                agreementId={item?.agreementId}
                hakedisId={item?.hakedis?.id}
                token={token}
                selected={Number(selectedInvoiceId || 0) === Number(item?.invoice?.id || 0)}
                onSelectInvoice={onSelectInvoice}
                onChanged={onChanged}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BuyerServiceContextCard({ context = null, buyerKind = "COMPANY" }) {
  if (!context) return null;
  const participantCount = context.participantCount == null ? "Belirtilmedi" : `${new Intl.NumberFormat("tr-TR").format(Number(context.participantCount))}`;
  const stopCount = context.stopCount == null ? "Belirtilmedi" : `${new Intl.NumberFormat("tr-TR").format(Number(context.stopCount))}`;
  const workingDays = Array.isArray(context.workingDays) && context.workingDays.length
    ? context.workingDays.join(" · ")
    : "Belirtilmedi";
  const schedule = context.schedule || {};
  const timeText = schedule.startTime && schedule.endTime
    ? `${schedule.startTime} – ${schedule.endTime}`
    : "Belirtilmedi";
  const route = context.route || {};
  const routeText = route.distanceKm == null
    ? "Belirtilmedi"
    : `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(Number(route.distanceKm))} km${route.durationMin == null ? "" : ` · ${Math.round(Number(route.durationMin))} dk`}`;
  const missing = Array.isArray(context.missing) ? context.missing : [];
  return (
    <div className="card" data-testid="buyer-service-context" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.28)", background: "rgba(58,102,255,0.05)" }}>
      <div className="panelSectionTitle">Seçili hizmet kapsamı</div>
      <div style={{ marginTop: 6, fontWeight: 800 }}>{context.serviceLabel || (buyerKind === "SCHOOL" ? "Öğrenci taşıma hizmeti" : buyerKind === "ORGANIZATION" ? "Etkinlik taşıma hizmeti" : "Servis hizmeti")}</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Bu özet, seçili dönem ve kaynak hizmet kaydından okunur; teklif ve bütçe karşılaştırması bu kapsamdan ayrılmaz.
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        <div><div className="panelMeta">{context.participantLabel || "Kişi sayısı"}</div><div className="panelStatValue">{participantCount}</div></div>
        <div><div className="panelMeta">Durak</div><div className="panelStatValue">{stopCount}</div></div>
        <div><div className="panelMeta">Hizmet dönemi</div><div className="panelStatValue" style={{ fontSize: 15 }}>{formatPeriodForUser("", context.period?.start, context.period?.end) || "Belirtilmedi"}</div></div>
        <div><div className="panelMeta">Çalışma günleri</div><div className="panelStatValue" style={{ fontSize: 15 }}>{workingDays}</div></div>
        <div><div className="panelMeta">Saat</div><div className="panelStatValue" style={{ fontSize: 15 }}>{timeText}</div></div>
        <div><div className="panelMeta">Güzergâh</div><div className="panelStatValue" style={{ fontSize: 15 }}>{routeText}</div></div>
      </div>
      {missing.length ? (
        <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.45 }}>Eksik kapsam bilgisi: <b>{missing.join(" · ")}</b>. Bu nedenle kesin fiyat önerisi yayımlanmaz.</div>
      ) : null}
    </div>
  );
}

function ChipRow({ items = [], emptyText = "-" }) {
  const chips = Array.isArray(items) ? items.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (!chips.length) return <div className="muted" style={{ marginTop: 6 }}>{emptyText}</div>;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {chips.map((item) => (
        <span key={item} className="pill">{item}</span>
      ))}
    </div>
  );
}

function labelFromMap(value, map, fallback) {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return fallback;
  return map[key] || fallback;
}

const SUPPLIER_STATE_LABELS = Object.freeze({
  verified: "Doğrulanmış",
  unverified: "Doğrulanmamış",
  pending: "Beklemede",
  blocked: "Kısıtlı",
  rejected: "Reddedildi",
  unknown: "Bilinmiyor",
});

const VALUE_BAND_LABELS = Object.freeze({
  balanced: "Dengeli",
  better: "Daha iyi",
  worse: "Daha zayıf",
  high: "Yüksek",
  low: "Düşük",
  incomplete: "Eksik veri",
  unknown: "Bilinmiyor",
});

const PERIOD_LABELS = Object.freeze({
  contract_period: "Sözleşme dönemi",
  current_period: "Geçerli dönem",
  preview_period: "Önizleme dönemi",
  snapshot: "Hesaplama özeti",
  unknown: "Dönem bilinmiyor",
});

function supplierStateLabel(value) {
  return labelFromMap(value, SUPPLIER_STATE_LABELS, "Bilinmiyor");
}

function valueBandLabel(value) {
  return labelFromMap(value, VALUE_BAND_LABELS, "Bilinmiyor");
}

function comparisonPeriodLabel(value) {
  return labelFromMap(value, PERIOD_LABELS, "Dönem bilinmiyor");
}

function CompanyComparisonBlock({
  comparison,
  currencyCode,
}) {
  if (!comparison) return null;

  const bandLabel = valueBandLabel(comparison.valueBand);
  const stateLabel = supplierStateLabel(comparison.verifiedSupplierState);
  const periodLabel = visibleText(comparisonPeriodLabel(comparison.pricePeriod));
  const supplierLabel = visibleText(comparison.safeSupplierLabel || comparison.supplierRef || "Tedarikçi", "Tedarikçi");
  const warnings = Array.isArray(comparison.comparisonWarnings)
    ? comparison.comparisonWarnings.map((item) => visibleText(item, "")).filter(Boolean)
    : [];

  return (
    <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800 }}>{supplierLabel}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {stateLabel ? `Durum: ${stateLabel}` : "Durum: bilinmiyor"}
          </div>
        </div>
        <div className="muted">{periodLabel}</div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)" }}>
          <div className="panelSectionTitle">Fiyat</div>
          <div className="panelStatValue">{formatMoneyMinor(comparison.normalizedPriceMinor, currencyCode)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Dönemsel fiyat</div>
        </div>
        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)" }}>
          <div className="panelSectionTitle">Kalite</div>
          <div className="panelStatValue">{comparison.qualityScore ?? "-"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Kalite puanı</div>
        </div>
        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)" }}>
          <div className="panelSectionTitle">Güvenilirlik</div>
          <div className="panelStatValue">{comparison.reliabilityScore ?? "-"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Güvenilirlik puanı</div>
        </div>
        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)" }}>
          <div className="panelSectionTitle">Kanıt</div>
          <div className="panelStatValue">{comparison.serviceEvidenceCount ?? "-"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Veri / kanıt kapsamı</div>
        </div>
      </div>
      <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
        {bandLabel ? `Değer bandı: ${bandLabel}` : "Değer bandı: bilinmiyor"}
      </div>
      {warnings.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {warnings.map((text) => <span key={text} className="pill">{text}</span>)}
        </div>
      ) : null}
    </div>
  );
}

function CompanyOfferBudgetComparison({ comparison, currencyCode }) {
  const presentation = buildOfferBudgetComparisonPresentation({ comparison, currencyCode });
  if (!presentation.visible) return null;

  return (
    <div className="card" data-testid="company-offer-budget-comparison" style={{ marginTop: 12, padding: 14, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ fontWeight: 850 }}>{presentation.title}</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{presentation.summaryText}</div>
      {presentation.candidates.length ? (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {presentation.candidates.map((candidate) => (
            <div key={String(candidate.offerId)} className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{candidate.providerName}</div>
                  <div className="muted" style={{ marginTop: 4 }}>{candidate.statusLabel} · {candidate.periodLabel}</div>
                </div>
                <div style={{ fontWeight: 850 }}>{candidate.amountLabel}</div>
              </div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>{candidate.serviceConditionsLabel}</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>{candidate.scopeLabel}</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{candidate.possibleRemainingLabel}</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{candidate.economicNote}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatOfferDateRange(offer) {
  const start = offer?.shift?.startAt ? new Date(offer.shift.startAt) : null;
  if (!start || Number.isNaN(start.getTime())) return "Dönem doğrulanıyor";
  const end = offer?.shift?.endAt ? new Date(offer.shift.endAt) : null;
  const formatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" });
  const startLabel = formatter.format(start);
  return end && !Number.isNaN(end.getTime()) && formatter.format(end) !== startLabel
    ? `${startLabel} – ${formatter.format(end)}`
    : startLabel;
}

function formatOfferDifference(value, currencyCode) {
  if (value == null) return "Hesaplanamadı";
  if (value === 0) return "Bütçeyle aynı";
  const amount = formatMoneyMinor(Math.abs(value), currencyCode);
  return value > 0 ? `${amount} üzerinde` : `${amount} altında`;
}

function companyOfferSuitabilityLabel(offer, context) {
  const routeReady = Boolean(offer?.shift?.routeSnapshotValidatedAt || context?.route?.distanceKm != null);
  const capacity = offer?.shift?.requiredPaxOverride ?? offer?.requiredPax ?? null;
  if (routeReady && capacity != null) return `Rota doğrulandı · kapasite ihtiyacı ${capacity} kişi`;
  if (routeReady) return "Rota doğrulandı · kapasite uygunluğu teyit bekliyor";
  return "Rota veya kapasite uygunluğu bu teklif kaydında doğrulanmadı";
}

function CompanyIncomingOfferEvaluation({
  token,
  buyerServiceContext,
  budgetMinor,
  currencyCode,
  agreementPath,
  onOpenBudget,
  comparison = null,
}) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getCompanyOffers(token, {
          signal: controller.signal,
          status: "OPEN,COUNTERED,ACCEPTED",
          take: 50,
          ttlMs: 15000,
          force: true,
        });
        if (alive) setOffers(Array.isArray(result?.items) ? result.items : []);
      } catch (requestError) {
        if (alive && requestError?.name !== "AbortError") {
          setOffers([]);
          setError("Gelen teklifler okunamadı. Vardiyalar ekranından aynı ticari kaydı açabilirsiniz.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 120);
    return () => {
      alive = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [token]);

  const presentation = buildCompanyOfferEvaluationPresentation({
    offers,
    budgetMinor,
    context: buyerServiceContext,
  });
  const sortedOffers = [...presentation.items].sort((a, b) => {
    const aActive = ["OPEN", "COUNTERED"].includes(String(a.status || "").toUpperCase());
    const bActive = ["OPEN", "COUNTERED"].includes(String(b.status || "").toUpperCase());
    if (aActive !== bActive) return Number(bActive) - Number(aActive);
    return Number(b.id || 0) - Number(a.id || 0);
  });
  const displayedOffers = sortedOffers.slice(0, 12);
  const referenceLabel = presentation.referenceMinMinor == null
    ? "Kesin bütçe önerisi yayımlanmadı"
    : presentation.referenceMinMinor === presentation.referenceMaxMinor
      ? `Gelen teklif referansı: ${formatMoneyMinor(presentation.referenceMinMinor, currencyCode)}`
      : `Gelen teklifler: ${formatMoneyMinor(presentation.referenceMinMinor, currencyCode)} – ${formatMoneyMinor(presentation.referenceMaxMinor, currencyCode)}`;

  return (
    <div className="card" data-testid="company-offer-evaluation" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.28)", background: "rgba(58,102,255,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">Gelen teklif değerlendirmesi</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Aynı plan, dönem ve hizmet kapsamındaki taşımacılık firması cevaplarını karşılaştırın. Araç işletme maliyeti veya ROOM kârı bu ekranda gösterilmez.
          </div>
        </div>
        <button type="button" className="btn sm" onClick={onOpenBudget}>
          {budgetMinor == null ? "Bütçeyi belirle" : "Bütçeyi düzenle"}
        </button>
      </div>

      <div data-testid="company-budget-reference" style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.025)" }}>
          <div className="panelSectionTitle">Bütçe rehberi</div>
          <div className="panelStatValue" style={{ marginTop: 8 }}>{budgetMinor == null ? "Bütçe belirlenmedi" : formatMoneyMinor(budgetMinor, currencyCode)}</div>
          <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {budgetMinor == null
              ? presentation.hasComparablePriceReference
                ? `${referenceLabel}. Bu mevcut teklif verisidir; onayınız olmadan bütçe önerisi veya ticari karar uygulanmaz.`
                : "Geçerli bütçe veya karşılaştırılabilir tedarikçi fiyatı bulunmadığı için tutar uydurulmadı. Planlama bilgilerini tamamlayıp bütçeyi aynı kaynaktan belirleyin."
              : `${referenceLabel}. Teklif farkı yalnız ROOM fiyatı mevcut olduğunda hesaplanır; şirket bütçesi ile ROOM teklifi ayrı tutulur.`}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          <MetricCard title="Plan" value={buyerServiceContext?.serviceLabel || "Hizmet planı"} note={buyerServiceContext?.period?.start ? formatPeriodForUser("", buyerServiceContext.period.start, buyerServiceContext.period.end) : "Dönem doğrulanıyor"} />
          <MetricCard title="Gelen teklif" value={String(presentation.activeCount)} note="Açık veya karşı teklif" />
          <MetricCard title="Hizmet kapsamı" value={buyerServiceContext?.participantCount == null ? "Doğrulanıyor" : `${buyerServiceContext.participantCount} kişi`} note={buyerServiceContext?.stopCount == null ? "Durak bilgisi yok" : `${buyerServiceContext.stopCount} durak`} />
        </div>
      </div>

      {loading ? <div className="muted" style={{ marginTop: 12 }}>Gelen teklifler yükleniyor...</div> : null}
      {error ? <div className="panelMeta" role="alert" style={{ marginTop: 12 }}>{error}</div> : null}
      {!loading && !error && !displayedOffers.length ? (
        <div className="card" data-testid="company-offer-empty" style={{ marginTop: 12, background: "rgba(255,255,255,0.025)" }}>
          <div style={{ fontWeight: 800 }}>Henüz gelen teklif yok</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Planlama Merkezi&apos;nde aynı bütçe kaynağını kullanarak teklif talebi gönderdiğinizde cevaplar burada görünür. Araç maliyeti veya varsayımsal kâr bu boşluğu doldurmaz.
          </div>
        </div>
      ) : null}
      {!loading && !displayedOffers.length && comparison?.status === "ready" ? (
        <CompanyOfferBudgetComparison comparison={comparison} currencyCode={currencyCode} />
      ) : null}
      {displayedOffers.length ? (
        <div data-testid="company-incoming-offers" style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {displayedOffers.map((offer) => {
            const status = String(offer.status || "").toUpperCase();
            const shiftId = Number(offer.shiftId || 0);
            const actionHref = shiftId > 0 ? `#/company/shifts?focusShiftId=${encodeURIComponent(String(shiftId))}` : `#${agreementPath}`;
            const actionLabel = status === "ACCEPTED" ? "İşi aç" : status === "COUNTERED" ? "Pazarlığı aç" : "Teklifi aç";
            const note = String(offer.noteRoom || offer.noteCompany || "").trim();
            return (
              <div key={String(offer.id)} className="card" data-testid={`company-offer-card-${offer.id}`} style={{ padding: 12, background: "rgba(255,255,255,0.025)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 850 }}>{offer.providerName}</div>
                    <div className="muted" style={{ marginTop: 4 }}>Teklif #{offer.id} · Vardiya #{shiftId || "-"} · {formatOfferDateRange(offer)}</div>
                  </div>
                  <span className="pill">{offer.statusLabel}</span>
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                  <MetricCard title="ROOM teklifi" value={offer.serviceAmountMinor == null ? "Bekleniyor" : formatMoneyMinor(offer.serviceAmountMinor, currencyCode)} note="Tedarikçi yanıtı" tone={offer.serviceAmountMinor == null ? "muted" : "default"} />
                  <MetricCard title="Talep bütçesi" value={offer.amountCompany == null ? "Belirlenmedi" : formatMoneyMinor(offer.amountCompany, currencyCode)} note="COMPANY kaynağı" tone="muted" />
                  <MetricCard title="Bütçe farkı" value={formatOfferDifference(offer.budgetDifferenceMinor, currencyCode)} note={offer.serviceAmountMinor == null ? "ROOM fiyatı gelince hesaplanır" : "ROOM teklifi − COMPANY bütçesi"} tone={offer.budgetDifferenceMinor != null && offer.budgetDifferenceMinor > 0 ? "warm" : "default"} />
                </div>
                <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>
                  <b>Hizmet uygunluğu:</b> {companyOfferSuitabilityLabel(offer, buyerServiceContext)}
                </div>
                {note ? <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}><b>Koşul / not:</b> {note}</div> : null}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a className="btn sm primary" href={actionHref}>{actionLabel}</a>
                  {offer.shift?.agreementId ? <a className="btn sm" href={`#${agreementPath}?focusAgreementId=${encodeURIComponent(String(offer.shift.agreementId))}`}>Sözleşmeyi aç</a> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {presentation.items.length > displayedOffers.length ? <div className="panelMeta" style={{ marginTop: 10 }}>İlk {displayedOffers.length} kayıt gösteriliyor. Tüm teklif ve geçmiş kayıtlar Vardiyalar / Ticari Akış ekranında korunur.</div> : null}
    </div>
  );
}

export default function FinancialOperationsCompanyPreview({
  meta,
  token,
  preview,
  loading,
  err,
  setRefreshTick,
  form,
  setForm,
  onBudgetPlanSelect,
  onBudgetAction,
  budgetActionBusy,
  budgetActionErr,
  budgetActionOk,
  initialIncomeInvoiceId = "",
  selectedIncomeInvoiceId = null,
  onSelectIncomeInvoice = null,
  formatBps,
  INPUT_STYLE,
}) {
  const [budgetDetailsOpen, setBudgetDetailsOpen] = useState(false);
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [companyFinanceTab, setCompanyFinanceTab] = useState("budget-service-expenses");
  const companyBudget = preview?.companyBudget || {};
  const commitmentSummary = preview?.commitmentSummary || companyBudget?.commitmentSummary || {};
  const companyServiceCost = preview?.companyServiceCost || {};
  const unitCosts = preview?.unitCosts || {};
  const period = preview?.period || {};
  const budgetPlan = preview?.budgetPlan || {};
  const budgetPlanItems = Array.isArray(budgetPlan?.items) ? budgetPlan.items : [];
  const currentBudgetPlan = budgetPlan?.current || budgetPlan?.draft || budgetPlan?.active || null;
  const currentBudgetPlanStatus = String(currentBudgetPlan?.status || "").toUpperCase();
  const currentBudgetPlanApprovalState = String(currentBudgetPlan?.budgetApprovalState || "").toUpperCase();
  const budgetPlanEditable = !currentBudgetPlan?.id || currentBudgetPlanStatus === "DRAFT";
  const budgetPlanCanSubmit = budgetPlanEditable && ["draft", "rejected"].includes(String(currentBudgetPlanApprovalState).toLowerCase());
  const budgetPlanCanApprove = budgetPlanEditable && String(currentBudgetPlanApprovalState).toLowerCase() === "submitted";
  const budgetPlanCanActivate = budgetPlanEditable && String(currentBudgetPlanApprovalState).toLowerCase() === "approved";
  const budgetPlanCanArchive = Boolean(currentBudgetPlan?.id) && currentBudgetPlanStatus !== "ARCHIVED";
  const previewPeriodLabel = formatPeriodForUser(
    currentBudgetPlan?.periodLabel,
    form?.periodStart,
    form?.periodEnd,
  ) || "-";
  const previewCurrencyCode = currentBudgetPlan?.currencyCode || String(form?.currencyCode || "").trim() || "TRY";
  const supplierComparisons = Array.isArray(preview?.supplierComparisons) ? preview.supplierComparisons : [];
  const companyStatus = String(preview?.status || "unknown").toUpperCase();
  const previewTone = previewStatusTone(companyStatus);
  const previewLabel = previewStatusLabel(companyStatus);
  const confidenceValue = preview?.confidence?.level || preview?.dataQuality?.level || "";
  const confidenceValueLabel = confidenceLabel(confidenceValue);
  const confidenceValueTone = confidenceTone(confidenceValue);
  const budgetApprovalLabel = budgetApprovalStateLabel(currentBudgetPlan?.budgetApprovalState || form.budgetApprovalState);
  const budgetSourceHuman = budgetSourceLabel(currentBudgetPlan?.budgetSource || form.budgetSource);
  const budgetScope = currentBudgetPlan?.scope || null;
  const selectedAgreementIds = Array.isArray(form?.agreementIds)
    ? form.agreementIds.map((id) => String(id))
    : Array.isArray(budgetScope?.selectedAgreementIds)
      ? budgetScope.selectedAgreementIds.map((id) => String(id))
      : [];
  const scopePeriodMatchesForm = Boolean(
    budgetScope
      && String(budgetScope.periodStart || "") === String(form?.periodStart || "")
      && String(budgetScope.periodEnd || "") === String(form?.periodEnd || ""),
  );
  const serviceCostSourceHuman = visibleText(serviceCostSourceLabel(companyServiceCost.serviceCostSource || preview?.serviceCostSource));
  const offerBudgetComparison = preview?.offerBudgetComparison || companyBudget?.offerBudgetComparison || null;
  const offerComparisonReady = offerBudgetComparison?.status === "ready"
    && Array.isArray(offerBudgetComparison?.candidates)
    && offerBudgetComparison.candidates.length > 0;
  const summaryText = visibleText(offerComparisonReady
    ? "Aynı hizmet dönemindeki taşımacılık firması teklifleri hazırlandı; tutarlar kesin taahhüt veya gerçekleşmiş harcama değildir."
    : preview?.summaryText
    || companyBudget?.summaryText
    || companyServiceCost?.summaryText
    || "Bütçe ve servis maliyeti önizlemesi için veri bekleniyor.");
  const missingFields = financeFieldLabels(Array.isArray(preview?.missingFields) ? preview.missingFields : []);
  const periodLabel = formatPeriodForUser(period.periodLabel || previewPeriodLabel, period.periodStart, period.periodEnd);
  const hasBudgetAmount = commitmentSummary.budgetAmountMinor != null
    || companyBudget.effectiveBudgetMinor != null
    || currentBudgetPlan?.budgetAmountMinor != null
    || String(form?.budgetAmountMinor || "").trim() !== "";
  const effectiveBudgetMinor = commitmentSummary.budgetAmountMinor
    ?? companyBudget.effectiveBudgetMinor
    ?? currentBudgetPlan?.budgetAmountMinor
    ?? (String(form?.budgetAmountMinor || "").trim() !== "" ? Number(form.budgetAmountMinor) : null);
  const hasBudgetPlan = Boolean(currentBudgetPlan?.id);
  const noBudgetState = !hasBudgetAmount && !hasBudgetPlan;
  const budgetPlanIsDraft = currentBudgetPlanStatus === "DRAFT";
  const companyBudgetRisk = buildCompanyBudgetRiskPresentation({
    budgetUsageBps: companyBudget.usageBps,
    isDraft: budgetPlanIsDraft,
    comparisonReady: companyBudget.usageBps != null && !noBudgetState,
  });
  const commitmentComplete = commitmentSummary?.status === "complete";
  const commitmentNote = commitmentComplete
    ? `${commitmentSummary.commitmentCount || 0} onaylı sözleşme; sözleşme tutarı bir kez sayıldı.`
    : "Sözleşme tutarı veya dönemi eksik olduğu için güvenilir toplam hesaplanamadı.";
  const realizedSpendEvidenceMinor = commitmentSummary?.realizedSpendMinor ?? null;
  const actualSpendMinor = companyServiceCost.actualServiceSpendMinor ?? realizedSpendEvidenceMinor;
  const actualSpendDisplay = actualSpendMinor == null
    ? "Doğrulanmadı"
    : formatMoneyMinor(actualSpendMinor, previewCurrencyCode);
  const actualSpendNote = actualSpendMinor == null
    ? "Tamamlanmış hizmet ve eşleşmiş fatura kanıtı yok. Hakediş/fatura/ödeme ayrı tutulur."
    : companyServiceCost.actualServiceSpendMinor != null
      ? "Doğrulanmış gerçekleşen hizmet gideri"
      : "Tamamlanan hizmet ve COMPANY sözleşme bedeli; ROOM tedarikçi kanıtları ayrı tutulur";
  const expectedPeriodAmountMinor = companyServiceCost.companyVisibleServiceSpendMinor
    ?? companyServiceCost.agreementPriceMinor
    ?? companyServiceCost.offerPriceMinor
    ?? null;
  const agreementPath = agreementPathForBuyerKind(meta?.buyerKind);
  const buyerServiceContext = preview?.snapshot?.buyerServiceContext || null;
  const historicalFinancialEvidence = Array.isArray(preview?.historicalFinancialEvidence)
    ? preview.historicalFinancialEvidence
    : [];
  const companyInvoicePayment = preview?.companyInvoicePayment || null;
  const companyInvoiceContextLink = useMemo(() => {
    const invoiceId = Number(companyInvoicePayment?.invoiceId || 0);
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) return null;
    const evidenceItems = [
      ...(Array.isArray(commitmentSummary?.financialEvidence) ? commitmentSummary.financialEvidence : []),
      ...(Array.isArray(historicalFinancialEvidence) ? historicalFinancialEvidence : []),
    ];
    const evidence = evidenceItems.find((item) => Number(item?.invoice?.id || 0) === invoiceId) || null;
    const agreementId = Number(evidence?.agreementId || preview?.contextResolution?.selectedAgreementId || 0);
    return {
      invoiceId,
      agreementId: Number.isSafeInteger(agreementId) && agreementId > 0 ? agreementId : null,
      hakedisId: Number(evidence?.hakedis?.id || evidence?.hakedisId || 0) || null,
      customerLabel: evidence?.customerLabel || preview?.company?.name || meta?.title || "Hizmet alan",
      sourceLabel: companyInvoicePayment?.sourceLabel || evidence?.sourceLabel || "",
    };
  }, [companyInvoicePayment?.invoiceId, companyInvoicePayment?.sourceLabel, commitmentSummary?.financialEvidence, historicalFinancialEvidence, meta?.title, preview?.company?.name, preview?.contextResolution?.selectedAgreementId]);

  useEffect(() => {
    const requestedInvoiceId = Number(initialIncomeInvoiceId || 0);
    if (requestedInvoiceId > 0 && requestedInvoiceId === Number(companyInvoiceContextLink?.invoiceId || 0)) {
      onSelectIncomeInvoice?.(companyInvoiceContextLink);
    }
  }, [companyInvoiceContextLink, initialIncomeInvoiceId, onSelectIncomeInvoice]);
  const historicalInvoiceIds = new Set(historicalFinancialEvidence
    .map((item) => Number(item?.invoice?.id || 0))
    .filter((id) => id > 0));
  const primaryBudgetAction = !hasBudgetPlan
    ? { label: "Bütçe oluştur", action: "open" }
    : budgetPlanCanSubmit
      ? { label: "Bütçeyi gönder", action: "submit" }
      : budgetPlanCanApprove
        ? { label: "Bütçeyi onayla", action: "approve" }
        : budgetPlanCanActivate
          ? { label: "Bütçeyi aktifleştir", action: "activate" }
          : { label: "Bütçe detaylarını aç", action: "open" };
  const primaryBudgetActionNote = !hasBudgetPlan
    ? "Bu dönem için bütçe planını oluşturun."
    : budgetPlanCanSubmit
      ? "Taslak hazır; onay sürecine göndermek için bütçeyi gönderin."
      : budgetPlanCanApprove
        ? "Gönderilmiş bütçeyi kontrol edip onaylayın."
        : budgetPlanCanActivate
          ? "Onaylanan bütçeyi kullanıma açın."
          : "Gerekirse bütçe ayrıntılarını açarak planı kontrol edin.";

  function handlePrimaryBudgetAction() {
    setBudgetDetailsOpen(true);
    if (primaryBudgetAction.action !== "open") {
      onBudgetAction(primaryBudgetAction.action);
    }
  }

  function openBudgetEditor() {
    setCompanyFinanceTab("budget-service-expenses");
    setBudgetDetailsOpen(true);
    setBudgetEditorOpen(true);
  }

  return (
    <PanelChrome
      className="pre18-finance-surface pre18-finance-company"
      title={meta.title}
      subtitle={meta.subtitle}
      actions={(
        <button type="button" className="btn sm" onClick={() => setRefreshTick((n) => n + 1)} disabled={loading}>
          {loading ? "Yenileniyor..." : "Yenile"}
        </button>
      )}
    >
      <div className="muted" style={{ lineHeight: 1.45 }}>
        Bu dönem servis maliyetlerinizi bütçenizle karşılaştırın.
      </div>

      <div
        className="company-finance-tabs"
        data-testid="company-finance-tabs"
        role="tablist"
        aria-label={meta?.buyerTablistLabel || "Hizmet Alan Firma finans bölümleri"}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, borderBottom: "1px solid rgba(255,255,255,0.10)", paddingBottom: 8 }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={companyFinanceTab === "budget-service-expenses"}
          aria-controls="company-finance-budget"
          className={`btn sm ${companyFinanceTab === "budget-service-expenses" ? "primary" : ""}`}
          onClick={() => setCompanyFinanceTab("budget-service-expenses")}
        >
          Bütçe ve Servis Giderleri
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={companyFinanceTab === "offer-price-guide"}
          aria-controls="company-finance-price-guide"
          className={`btn sm ${companyFinanceTab === "offer-price-guide" ? "primary" : ""}`}
          onClick={() => setCompanyFinanceTab("offer-price-guide")}
        >
          Teklif ve Fiyat Rehberi
        </button>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status={previewTone.toUpperCase()}>{previewLabel}</span>
        {confidenceValue ? <span className="pill" data-status={confidenceValueTone.toUpperCase()}>{confidenceValueLabel}</span> : null}
        <FinanceRiskBadge risk={companyBudgetRisk} testId="company-budget-risk-status" />
        <span className="pill">{periodLabel}</span>
      </div>

      <BuyerServiceContextCard context={buyerServiceContext} buyerKind={meta?.buyerKind} />

      <CompanyHistoricalFinancialEvidence
        items={historicalFinancialEvidence}
        currencyCode={previewCurrencyCode}
        agreementPath={agreementPath}
        token={token}
        selectedInvoiceId={selectedIncomeInvoiceId}
        onSelectInvoice={onSelectIncomeInvoice}
        onChanged={() => setRefreshTick((n) => n + 1)}
      />
      {companyInvoicePayment?.invoiceId && !historicalInvoiceIds.has(Number(companyInvoicePayment.invoiceId)) ? (
        <CompanyInvoicePaymentPanel
          invoiceId={companyInvoicePayment.invoiceId}
          agreementId={companyInvoiceContextLink?.agreementId}
          hakedisId={companyInvoiceContextLink?.hakedisId}
          token={token}
          selected={Number(selectedIncomeInvoiceId || 0) === Number(companyInvoicePayment.invoiceId || 0)}
          onSelectInvoice={onSelectIncomeInvoice}
          onChanged={() => setRefreshTick((n) => n + 1)}
        />
      ) : null}

      {err ? (
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.25)" }}>
          {err}
        </div>
      ) : null}

      {companyFinanceTab === "budget-service-expenses" ? (
        <div id="company-finance-budget" role="tabpanel" data-testid="company-finance-budget">
          {noBudgetState ? (
            <div className="card" data-testid="company-budget-next-action" style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.35)", background: "rgba(247,144,9,0.06)" }}>
              <div className="panelSectionTitle">Bütçe durumu</div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>Bu dönem için henüz onaylı bütçeniz yok.</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
                Servis maliyetlerinizi bütçeyle karşılaştırabilmek için önce bir bütçe oluşturun.
              </div>
              <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.45 }}><strong>Sıradaki işlem:</strong> {primaryBudgetAction.label}. {primaryBudgetActionNote}</div>
              <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={handlePrimaryBudgetAction} disabled={loading || budgetActionBusy.length > 0}>
                {primaryBudgetAction.label}
              </button>
            </div>
          ) : (
            <div className="card" data-testid="company-budget-next-action" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.28)", background: "rgba(58,102,255,0.05)" }}>
              <div className="panelSectionTitle">Bütçe durumu</div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>{previewLabel}</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{summaryText}</div>
              <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.45 }}><strong>Sıradaki işlem:</strong> {primaryBudgetAction.label}. {primaryBudgetActionNote}</div>
              <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={handlePrimaryBudgetAction} disabled={loading || budgetActionBusy.length > 0}>
                {primaryBudgetAction.label}
              </button>
            </div>
          )}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {hasBudgetAmount ? (
          <>
            <MetricCard
              title="Planlanan bütçe"
              value={formatMoneyMinor(commitmentSummary.budgetAmountMinor ?? companyBudget.effectiveBudgetMinor ?? currentBudgetPlan?.budgetAmountMinor, previewCurrencyCode)}
              note={budgetPlanIsDraft ? "Taslak plan; henüz aktifleştirilmedi." : visibleText(budgetSourceLabel(companyBudget.budgetSource || preview?.budgetSource))}
              tone="default"
            />
            <MetricCard
              title="Sözleşmelerle taahhüt edilen"
              value={formatMoneyMinor(commitmentSummary.committedAmountMinor, previewCurrencyCode)}
              note={commitmentNote}
              tone={commitmentComplete ? "good" : "warm"}
            />
            <MetricCard
              title="Kullanılabilir bütçe"
              value={formatMoneyMinor(commitmentSummary.remainingBudgetMinor, previewCurrencyCode)}
              note={commitmentComplete ? "Toplam bütçeden onaylı sözleşme taahhüdü düşülmüştür." : "Kapsam tamamlanmadan kalan bütçe gösterilmez."}
              tone={commitmentSummary.remainingBudgetMinor != null && Number(commitmentSummary.remainingBudgetMinor) >= 0 ? "good" : "danger"}
            />
            <MetricCard
              title="Doğrulanmış gerçekleşen harcama"
              value={actualSpendDisplay}
              note={actualSpendNote}
              tone={actualSpendMinor != null ? "good" : "muted"}
            />
          </>
        ) : (
          <MetricCard
            title="Doğrulanmış gerçekleşen harcama"
            value={actualSpendDisplay}
            note={actualSpendNote}
            tone={actualSpendMinor != null ? "good" : "muted"}
          />
        )}
      </div>
      <CompanyFinancialEvidenceSummary
        summary={commitmentSummary}
        currencyCode={previewCurrencyCode}
        expectedPeriodAmountMinor={expectedPeriodAmountMinor}
        agreementPath={agreementPath}
      />
    </div>
      ) : null}

      {companyFinanceTab === "offer-price-guide" ? (
        <div id="company-finance-price-guide" role="tabpanel" data-testid="company-finance-price-guide">
          <CompanyIncomingOfferEvaluation
            token={token}
            buyerServiceContext={buyerServiceContext}
            budgetMinor={effectiveBudgetMinor}
            currencyCode={previewCurrencyCode}
            agreementPath={agreementPath}
            onOpenBudget={openBudgetEditor}
            comparison={offerComparisonReady ? offerBudgetComparison : null}
          />
        </div>
      ) : null}

      {companyFinanceTab === "budget-service-expenses" ? <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <details className="card" style={{ minWidth: 0 }} open={budgetDetailsOpen} onToggle={(event) => setBudgetDetailsOpen(event.currentTarget.open)}>
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Bütçe detayları</summary>
          <div className="card" style={{ minWidth: 0, marginTop: 12 }}>
          <div className="panelSectionTitle">Bütçe yaşam döngüsü</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {currentBudgetPlan
              ? "Bütçe planı sunucu otoritesindeki sürüm ile korunur."
              : "Henüz kayıtlı bütçe planı yok; yeni bir taslak oluşturabilirsin."}
          </div>
          {budgetPlanItems.length > 1 ? (
            <label className="muted" style={{ display: "grid", gap: 6, marginTop: 12 }}>
              Bütçe planını seç
              <select
                aria-label="Bütçe planını seç"
                value={String(currentBudgetPlan?.id ?? form?.budgetPlanId ?? "")}
                onChange={(event) => onBudgetPlanSelect?.(event.target.value)}
                style={INPUT_STYLE}
              >
                {budgetPlanItems.map((plan) => (
                  <option key={String(plan.id)} value={String(plan.id)}>
                    #{plan.id} · {plan.periodLabel || `${plan.periodStart || "-"} – ${plan.periodEnd || "-"}`} · {lifecycleStateLabel(plan.status || "DRAFT")}
                  </option>
                ))}
              </select>
              <span className="panelMeta">Yalnız bu firmanın yetkili bütçe planları gösterilir.</span>
            </label>
          ) : null}
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <MetricCard
              title="Durum"
              value={lifecycleStateLabel(currentBudgetPlan?.status || "DRAFT")}
              note={budgetApprovalLabel}
              tone={currentBudgetPlan?.status === "ACTIVE" ? "good" : currentBudgetPlan?.status === "ARCHIVED" ? "danger" : "warm"}
            />
            <MetricCard
              title="Sürüm"
              value={formatTextOrDash(currentBudgetPlan?.version ?? form.budgetPlanVersion)}
              note={currentBudgetPlan?.id ? `Bütçe planı #${currentBudgetPlan.id}` : "Yeni plan"}
            />
            <MetricCard
              title="Kaynak"
              value={budgetSourceHuman}
              note={visibleText(currentBudgetPlan?.description || form.description)}
            />
            <MetricCard
              title="Dönem"
              value={formatTextOrDash(previewPeriodLabel)}
              note={currencyCodeLabel(previewCurrencyCode)}
            />
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="muted">Uyarı eşiği: <b>{formatBps(currentBudgetPlan?.warningThresholdBps ?? form.warningThresholdBps)}</b></div>
            <div className="muted">Onay durumu: <b>{budgetApprovalLabel}</b></div>
            <div className="muted">Açıklama: <b>{visibleText(currentBudgetPlan?.description || form.description)}</b></div>
          </div>

          {budgetActionErr ? (
            <div className="card" style={{ marginTop: 10, border: "1px solid rgba(240,68,56,0.25)" }}>
              {budgetActionErr}
            </div>
          ) : null}
          {budgetActionOk ? (
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
              {budgetActionOk}
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!currentBudgetPlan?.id ? (
              <button type="button" className="btn primary" onClick={() => onBudgetAction("save")} disabled={loading || budgetActionBusy.length > 0}>
                {budgetActionBusy === "save" ? "Kaydediliyor..." : "Taslak kaydet"}
              </button>
            ) : null}
            {currentBudgetPlan?.id && budgetPlanEditable ? (
              <button type="button" className="btn sm" onClick={() => onBudgetAction("save")} disabled={loading || budgetActionBusy.length > 0}>
                {budgetActionBusy === "save" ? "Kaydediliyor..." : "Taslağı güncelle"}
              </button>
            ) : null}
            {budgetPlanCanSubmit ? (
              <button type="button" className="btn primary" onClick={() => onBudgetAction("submit")} disabled={loading || budgetActionBusy.length > 0}>
                {budgetActionBusy === "submit" ? "Gönderiliyor..." : "Gönder"}
              </button>
            ) : null}
            {budgetPlanCanApprove ? (
              <button type="button" className="btn primary" onClick={() => onBudgetAction("approve")} disabled={loading || budgetActionBusy.length > 0}>
                {budgetActionBusy === "approve" ? "Onaylanıyor..." : "Onayla"}
              </button>
            ) : null}
            {budgetPlanCanActivate ? (
              <button type="button" className="btn primary" onClick={() => onBudgetAction("activate")} disabled={loading || budgetActionBusy.length > 0}>
                {budgetActionBusy === "activate" ? "Aktive ediliyor..." : "Aktive et"}
              </button>
            ) : null}
          </div>
          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Diğer bütçe işlemleri</summary>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {budgetPlanCanArchive ? (
                <button type="button" className="btn sm" onClick={() => onBudgetAction("archive")} disabled={loading || budgetActionBusy.length > 0}>
                  {budgetActionBusy === "archive" ? "Arşivleniyor..." : "Arşivle"}
                </button>
              ) : null}
              <button type="button" className="btn sm" onClick={() => onBudgetAction("save", { createNew: true })} disabled={loading || budgetActionBusy.length > 0}>
                Yeni taslak
              </button>
            </div>
          </details>

          <details style={{ marginTop: 12 }} open={budgetEditorOpen} onToggle={(event) => setBudgetEditorOpen(event.currentTarget.open)}>
            <summary className="muted" style={{ cursor: "pointer" }}>Bütçe ayrıntıları</summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <label className="muted">
                Bütçe tutarı (₺)
                <input
                  data-testid="company-budget-amount-input"
                  inputMode="decimal"
                  placeholder="örn. 300000"
                  value={formatBudgetAmountInputFromMinor(form.budgetAmountMinor)}
                  onChange={(e) => setForm((prev) => ({ ...prev, budgetAmountMinor: parseBudgetAmountInputToMinor(e.target.value) }))}
                  style={INPUT_STYLE}
                />
                <div className="panelMeta">Tutarı TL olarak girin. Örnek: 200000 = 200.000 ₺.</div>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <label className="muted">
                  Başlangıç
                  <input
                    type="date"
                    value={form.periodStart}
                    onChange={(e) => setForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                    style={INPUT_STYLE}
                  />
                </label>
                <label className="muted">
                  Bitiş
                  <input
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) => setForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
                    style={INPUT_STYLE}
                  />
                </label>
                <label className="muted">
                  Para birimi
                  <div style={{ ...INPUT_STYLE, boxSizing: "border-box" }}>{currencyCodeLabel(form.currencyCode || previewCurrencyCode)}</div>
                  <div className="panelMeta">Sistem tarafından belirlenir.</div>
                </label>
                <label className="muted">
                  Bütçe kaynağı
                  <div style={{ ...INPUT_STYLE, boxSizing: "border-box" }}>{budgetSourceHuman}</div>
                  <div className="panelMeta">Sistem kaynağı; yaşam döngüsü işlemleriyle güncellenir.</div>
                </label>
                <label className="muted">
                  Onay durumu
                  <div style={{ ...INPUT_STYLE, boxSizing: "border-box" }}>{budgetApprovalLabel}</div>
                  <div className="panelMeta">Yaşam döngüsü işlemleriyle güncellenir.</div>
                </label>
                <label className="muted">
                  Uyarı eşiği (%)
                  <input
                    inputMode="decimal"
                    placeholder="örn. 15"
                    value={formatBpsInput(form.warningThresholdBps)}
                    onChange={(e) => setForm((prev) => ({ ...prev, warningThresholdBps: parseBpsInput(e.target.value) }))}
                    style={INPUT_STYLE}
                  />
                  <div className="panelMeta">Bütçe aşımı uyarısı için oran.</div>
                </label>
              </div>
              <label className="muted">
                Açıklama
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  style={{ ...INPUT_STYLE, minHeight: 84, resize: "vertical" }}
                />
              </label>
              <div className="card" style={{ marginTop: 2, display: "grid", gap: 9 }} data-testid="company-budget-scope">
                <div className="panelSectionTitle">Bu bütçenin kapsadığı hizmetler</div>
                <div className="muted" style={{ lineHeight: 1.45 }}>
                  Firma: <b>{visibleText(preview?.snapshot?.companyName || meta.title || "Yetkili firma")}</b>
                </div>
                {!currentBudgetPlan?.id ? (
                  <div className="muted">Önce bütçe dönemini taslak olarak kaydedin; uygun sözleşmeler burada listelenecek.</div>
                ) : !scopePeriodMatchesForm ? (
                  <div className="muted">Dönem değişti. Önce taslağı kaydedin; sözleşme kapsamı yeni döneme göre yeniden doğrulanacak.</div>
                ) : (
                  <>
                    <div className="muted">Seçilen sözleşmeler bu bütçeye ait hizmet kapsamını belirtir. Tutarlar burada harcama olarak toplamaz.</div>
                    {Array.isArray(budgetScope?.eligible) && budgetScope.eligible.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {budgetScope.eligible.map((item) => {
                          const agreementId = String(item.agreementId);
                          const checked = selectedAgreementIds.includes(agreementId);
                          return (
                            <label key={agreementId} style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: budgetPlanEditable ? "pointer" : "default" }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!budgetPlanEditable}
                                onChange={() => {
                                  if (!budgetPlanEditable) return;
                                  setForm((prev) => {
                                    const current = Array.isArray(prev.agreementIds) ? prev.agreementIds.map((id) => String(id)) : [];
                                    const next = current.includes(agreementId)
                                      ? current.filter((id) => id !== agreementId)
                                      : [...current, agreementId];
                                    return { ...prev, agreementIds: next };
                                  });
                                }}
                              />
                              <span>
                                <b>{visibleText(item.roomName)}</b>
                                <span className="muted" style={{ display: "block", lineHeight: 1.4 }}>
                                  Sözleşme #{item.agreementId} • {visibleText(item.summaryText)} • {visibleText(item.statusLabel)} • {visibleText(item.periodCoverageLabel)}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="muted">Bu dönemde seçilebilecek yetkili sözleşme bulunamadı.</div>
                    )}
                    {Array.isArray(budgetScope?.excluded) && budgetScope.excluded.length ? (
                      <details>
                        <summary className="muted" style={{ cursor: "pointer" }}>Kapsam dışı kayıtları gör</summary>
                        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                          {budgetScope.excluded.map((item) => (
                            <div key={`excluded-${item.agreementId}`} className="muted" style={{ lineHeight: 1.4 }}>
                              <b>{visibleText(item.roomName)}</b> — {visibleText(item.reason || "Bu bütçeye eklenemedi.")}
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    {budgetPlanEditable ? (
                      <div className="panelMeta">Kapsam değişikliği taslak sürümüne kaydedilir; onaylı veya aktif bütçe sessizce değiştirilemez.</div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </details>
          </div>
        </details>
        <details className="card" style={{ minWidth: 0 }}>
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Hesaplama detayları</summary>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <details className="card" data-testid="company-budget-finance-evidence" style={{ minWidth: 0 }}>
              <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Doğrulanmış finans kanıtı</summary>
              <CompanyBudgetReconciliationCard summary={commitmentSummary} currencyCode={previewCurrencyCode} agreementPath={agreementPath} />
            </details>
            <div className="panelSectionTitle">Genel not</div>
            <div className="muted" style={{ lineHeight: 1.45 }}>
              Maliyetleri bütçe dönemi, gerçekleşen hizmet ve mevcut operasyon kanıtlarıyla birlikte değerlendirin.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <MetricCard title="Bütçe kullanım oranı" value={formatBps(companyBudget.usageBps)} note={budgetApprovalLabel} />
              <MetricCard title="Personel Başı Maliyet" value={formatMoneyMinor(unitCosts.costPerActivePersonMinor, previewCurrencyCode)} note={`Aktif personel: ${unitCosts.activePersonCount ?? "-"}`} />
              <MetricCard title="Vardiya Başı Maliyet" value={formatMoneyMinor(unitCosts.costPerShiftMinor, previewCurrencyCode)} note={`Vardiya: ${unitCosts.deliveredShiftCount ?? "-"}`} />
              <MetricCard title="Sefer Başı Maliyet" value={formatMoneyMinor(unitCosts.costPerTripMinor, previewCurrencyCode)} note={`Sefer: ${unitCosts.deliveredTripCount ?? "-"}`} />
            </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Servis bütçesi</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {commitmentComplete
              ? "Toplam bütçe ile onaylı sözleşme taahhüdü aynı dönem içinde karşılaştırılıyor."
              : "Sözleşme kapsamı veya tutarı eksik olduğu için güvenilir kalan bütçe hesaplanmadı."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="muted">Bütçe kaynağı: <b>{budgetSourceLabel(companyBudget.budgetSource || preview?.budgetSource)}</b></div>
            <div className="muted">Onay durumu: <b>{budgetApprovalStateLabel(companyBudget.budgetApprovalState || currentBudgetPlan?.budgetApprovalState || form.budgetApprovalState)}</b></div>
            <div className="muted">Dönem: <b>{visibleText(companyBudget.periodLabel || periodLabel || "-")}</b></div>
            <div className="muted">Sözleşmelere ayrılan / kalan: <b>{formatMoneyMinor(commitmentSummary.committedAmountMinor, previewCurrencyCode)}</b> / <b>{formatMoneyMinor(commitmentSummary.remainingBudgetMinor, previewCurrencyCode)}</b></div>
            <div className="muted">Bütçe sapması: <b>{commitmentSummary.remainingBudgetMinor == null
              ? "hesaplanamadı"
              : Number(commitmentSummary.remainingBudgetMinor) < 0
                ? `bütçe ${formatMoneyMinor(Math.abs(commitmentSummary.remainingBudgetMinor), previewCurrencyCode)} aşıldı`
                : `${formatMoneyMinor(commitmentSummary.remainingBudgetMinor, previewCurrencyCode)} kullanılabilir`}</b></div>
            <div className="muted">Gerçekleşen harcama tamamlanmış hizmet ve eşleşmiş fatura kanıtından bir kez okunur; hakediş ve ödeme ayrı tutulur.</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Eksik alanlar</div>
            <ChipRow items={missingFields} emptyText="Eksik alan görünmüyor." />
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Servis maliyeti önizlemesi</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {visibleText(companyServiceCost.summaryText || "Servis harcaması için yeterli kaynak bulunamadı.")}
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="muted">Kaynak: <b>{serviceCostSourceHuman}</b></div>
            <div className="muted">Para birimi: <b>{currencyCodeLabel(companyServiceCost.currencyCode || previewCurrencyCode)}</b></div>
            <div className="muted">Vergi / baz: <b>{serviceCostTaxBasisLabel(companyServiceCost.taxBasis || preview?.taxBasis)}</b></div>
            <div className="muted">Aktif kişi: <b>{companyServiceCost.activePersonCount ?? "-"}</b> • Planlı kişi: <b>{companyServiceCost.plannedPersonCount ?? "-"}</b></div>
            <div className="muted">Gün / vardiya / sefer: <b>{companyServiceCost.deliveredServiceDayCount ?? "-"}</b> / <b>{companyServiceCost.deliveredShiftCount ?? "-"}</b> / <b>{companyServiceCost.deliveredTripCount ?? "-"}</b></div>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {Array.isArray(preview?.serviceCostComponents) && preview.serviceCostComponents.length ? (
              preview.serviceCostComponents.map((component) => (
                <div key={component.key} className="card" style={{ padding: 10, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight: 800 }}>{visibleText(serviceCostComponentLabel(component), "Bileşen")}</div>
                  <div className="muted" style={{ marginTop: 4 }}>{formatMoneyMinor(component.amountMinor, previewCurrencyCode)}</div>
                </div>
              ))
            ) : (
              <div className="muted">Bileşen dökümü henüz yok.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Geçmiş tedarikçi kalite karşılaştırması</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {offerComparisonReady
              ? "Teklif tutarları üstteki kartta karşılaştırılıyor; bu ayrıntı alanında geçmiş kalite ve güvenilirlik kaydı bulunmuyor."
              : visibleText(preview?.supplierComparisonSummaryText || "Karşılaştırılabilir geçmiş kalite verisi bulunamadı; otomatik seçim yapılmadı.")}
          </div>
          <div style={{ marginTop: 10 }}>
            {supplierComparisons.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {supplierComparisons.map((comparison) => (
                  <CompanyComparisonBlock
                    key={comparison.supplierRef || comparison.safeSupplierLabel || comparison.pricePeriod || "supplier"}
                    comparison={comparison}
                    currencyCode={previewCurrencyCode}
                  />
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
                {offerComparisonReady
                  ? "Geçmiş kalite ve güvenilirlik kaydı bulunmuyor; güncel teklif karşılaştırması üstteki kartta gösteriliyor."
                  : "Karşılaştırılabilir geçmiş kalite verisi bulunamadı; otomatik seçim yapılmadı."}
              </div>
            )}
          </div>
        </div>

        <details className="card" style={{ minWidth: 0, padding: 12 }}>
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Ayrıntılı sonuçlar</summary>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div className="card" style={{ minWidth: 0 }}>
              <div className="panelSectionTitle">Hakediş / fatura / ödeme ayrımı</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
                Doğrulanmış hakediş, fatura ve ödeme kayıtları üstteki finansal kanıt özetinde ayrı gösterilir. Bu ekran bunları bütçe taahhüdüne veya gerçekleşen harcamaya ikinci kez eklemez.
              </div>
            </div>

            <div className="card" style={{ minWidth: 0 }}>
              <div className="panelSectionTitle">Tasarruf senaryoları</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
                Maliyet Senaryosu çalışma alanı bu bütçe sayfasının üst bölümünde tekil ve görünür olarak sunulur; burada ikinci bir senaryo paneli veya hesaplama yapılmaz.
              </div>
            </div>

            <div className="card" style={{ minWidth: 0 }}>
              <div className="panelSectionTitle">Dışa aktarım</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
                Muhasebe dışa aktarımı yukarıdaki bağlamsal panelden önizleme ve kullanıcı onayı ile hazırlanır; burada ikinci bir dışa aktarım akışı yoktur.
              </div>
            </div>
          </div>
        </details>
          </div>
        </details>
      </div> : null}

      <div style={{ marginTop: 12 }} className="muted">
        {noBudgetState ? "Bütçe oluşturduğunuzda servis maliyetlerinizi dönem bazında karşılaştırabileceksiniz." : summaryText}
      </div>
    </PanelChrome>
  );
}
