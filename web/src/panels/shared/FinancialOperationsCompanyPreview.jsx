import { useState } from "react";
import PanelChrome from "../../components/PanelChrome";
import {
  budgetApprovalStateLabel,
  budgetVarianceDirectionLabel,
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

function formatMoney(value, currencyCode = "TRY") {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)}${suffix}`;
}

function formatTextOrDash(value) {
  const text = String(value ?? "").trim();
  return text || "-";
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

function MetricCard({ title, value, note, tone = "default" }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
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
      <div className="panelSectionTitle" style={{ marginBottom: 8, color: palette.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: palette.value }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>{note}</div> : null}
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
          <div className="panelStatValue">{formatMoney(comparison.normalizedPriceMinor, currencyCode)}</div>
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

export default function FinancialOperationsCompanyPreview({
  meta,
  preview,
  loading,
  err,
  setRefreshTick,
  form,
  setForm,
  onBudgetAction,
  budgetActionBusy,
  budgetActionErr,
  budgetActionOk,
  externalReferenceCard,
  scenarioPanel,
  formatBps,
  INPUT_STYLE,
}) {
  const [budgetDetailsOpen, setBudgetDetailsOpen] = useState(false);
  const companyBudget = preview?.companyBudget || {};
  const companyServiceCost = preview?.companyServiceCost || {};
  const unitCosts = preview?.unitCosts || {};
  const period = preview?.period || {};
  const budgetPlan = preview?.budgetPlan || {};
  const currentBudgetPlan = budgetPlan?.current || budgetPlan?.draft || budgetPlan?.active || null;
  const currentBudgetPlanStatus = String(currentBudgetPlan?.status || "").toUpperCase();
  const currentBudgetPlanApprovalState = String(currentBudgetPlan?.budgetApprovalState || "").toUpperCase();
  const budgetPlanEditable = !currentBudgetPlan?.id || currentBudgetPlanStatus === "DRAFT";
  const budgetPlanCanSubmit = budgetPlanEditable && ["draft", "rejected"].includes(String(currentBudgetPlanApprovalState).toLowerCase());
  const budgetPlanCanApprove = budgetPlanEditable && String(currentBudgetPlanApprovalState).toLowerCase() === "submitted";
  const budgetPlanCanActivate = budgetPlanEditable && String(currentBudgetPlanApprovalState).toLowerCase() === "approved";
  const budgetPlanCanArchive = Boolean(currentBudgetPlan?.id) && currentBudgetPlanStatus !== "ARCHIVED";
  const previewPeriodLabel = visibleText(
    currentBudgetPlan?.periodLabel
      || ((String(form?.periodStart ?? "").trim() || String(form?.periodEnd ?? "").trim()) ? `${form.periodStart || "-"} - ${form.periodEnd || "-"}` : "-"),
  );
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
  const serviceCostSourceHuman = visibleText(serviceCostSourceLabel(companyServiceCost.serviceCostSource || preview?.serviceCostSource));
  const summaryText = visibleText(preview?.summaryText
    || companyBudget?.summaryText
    || companyServiceCost?.summaryText
    || "Bütçe ve servis maliyeti önizlemesi için veri bekleniyor.");
  const missingFields = financeFieldLabels(Array.isArray(preview?.missingFields) ? preview.missingFields : []);
  const periodLabel = visibleText(period.periodLabel || previewPeriodLabel || "-");
  const hasApprovedBudget = companyBudget.effectiveBudgetMinor != null;
  const hasBudgetPlan = Boolean(currentBudgetPlan?.id);
  const noBudgetState = !hasApprovedBudget && !hasBudgetPlan;
  const primaryBudgetAction = !hasBudgetPlan
    ? { label: "Bütçe oluştur", action: "open" }
    : budgetPlanCanSubmit
      ? { label: "Bütçeyi gönder", action: "submit" }
      : budgetPlanCanApprove
        ? { label: "Bütçeyi onayla", action: "approve" }
        : budgetPlanCanActivate
          ? { label: "Bütçeyi aktifleştir", action: "activate" }
          : { label: "Bütçe detaylarını aç", action: "open" };

  function handlePrimaryBudgetAction() {
    setBudgetDetailsOpen(true);
    if (primaryBudgetAction.action !== "open") {
      onBudgetAction(primaryBudgetAction.action);
    }
  }

  return (
    <PanelChrome
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

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status={previewTone.toUpperCase()}>{previewLabel}</span>
        {confidenceValue ? <span className="pill" data-status={confidenceValueTone.toUpperCase()}>{confidenceValueLabel}</span> : null}
        <span className="pill">{periodLabel}</span>
      </div>

      {err ? (
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.25)" }}>
          {err}
        </div>
      ) : null}

      {noBudgetState ? (
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.35)", background: "rgba(247,144,9,0.06)" }}>
          <div className="panelSectionTitle">Bütçe durumu</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>Bu dönem için henüz onaylı bütçeniz yok.</div>
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
            Servis maliyetlerinizi bütçeyle karşılaştırabilmek için önce bir bütçe oluşturun.
          </div>
          <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={handlePrimaryBudgetAction} disabled={loading || budgetActionBusy.length > 0}>
            {primaryBudgetAction.label}
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.28)", background: "rgba(58,102,255,0.05)" }}>
          <div className="panelSectionTitle">Bütçe durumu</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>{previewLabel}</div>
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{summaryText}</div>
          <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={handlePrimaryBudgetAction} disabled={loading || budgetActionBusy.length > 0}>
            {primaryBudgetAction.label}
          </button>
        </div>
      )}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {hasApprovedBudget ? (
          <>
            <MetricCard
              title="Onaylı bütçe"
              value={formatMoney(companyBudget.effectiveBudgetMinor, previewCurrencyCode)}
              note={visibleText(budgetSourceLabel(companyBudget.budgetSource || preview?.budgetSource))}
              tone="good"
            />
            <MetricCard
              title="Gerçekleşen servis maliyeti"
              value={formatMoney(companyServiceCost.companyVisibleServiceSpendMinor, previewCurrencyCode)}
              note={serviceCostSourceHuman}
              tone={companyServiceCost.companyVisibleServiceSpendMinor != null ? "good" : "warm"}
            />
            <MetricCard
              title="Kalan bütçe"
              value={formatMoney(companyBudget.remainingBudgetMinor, previewCurrencyCode)}
              note={visibleText(budgetSourceHuman)}
              tone={companyBudget.remainingBudgetMinor != null && Number(companyBudget.remainingBudgetMinor) >= 0 ? "good" : "danger"}
            />
            <MetricCard
              title="Bütçe sapması"
              value={formatMoney(companyBudget.varianceMinor, previewCurrencyCode)}
              note={visibleText(budgetVarianceDirectionLabel(companyBudget.varianceDirection || "UNKNOWN"))}
              tone={companyBudget.varianceMinor != null && Number(companyBudget.varianceMinor) >= 0 ? "good" : "danger"}
            />
          </>
        ) : (
          <MetricCard
            title="Gerçekleşen servis maliyeti"
            value={formatMoney(companyServiceCost.companyVisibleServiceSpendMinor, previewCurrencyCode)}
            note={serviceCostSourceHuman}
            tone={companyServiceCost.companyVisibleServiceSpendMinor != null ? "good" : "warm"}
          />
        )}
      </div>

      {externalReferenceCard}

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <details className="card" style={{ minWidth: 0 }} open={budgetDetailsOpen} onToggle={(event) => setBudgetDetailsOpen(event.currentTarget.open)}>
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Bütçe detayları</summary>
          <div className="card" style={{ minWidth: 0, marginTop: 12 }}>
          <div className="panelSectionTitle">Bütçe yaşam döngüsü</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {currentBudgetPlan
              ? "Bütçe planı sunucu otoritesindeki sürüm ile korunur."
              : "Henüz kayıtlı bütçe planı yok; yeni bir taslak oluşturabilirsin."}
          </div>
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

          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Bütçe ayrıntıları</summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <label className="muted">
                Bütçe tutarı (₺)
                <input
                  inputMode="numeric"
                  placeholder="örn. 300000"
                  value={form.budgetAmountMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, budgetAmountMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
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
            </div>
          </details>
          </div>
        </details>
        <details className="card" style={{ minWidth: 0 }}>
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Hesaplama detayları</summary>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div className="panelSectionTitle">Genel not</div>
            <div className="muted" style={{ lineHeight: 1.45 }}>
              Maliyetleri bütçe dönemi, gerçekleşen hizmet ve mevcut operasyon kanıtlarıyla birlikte değerlendirin.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <MetricCard title="Bütçe kullanım oranı" value={formatBps(companyBudget.usageBps)} note={budgetApprovalLabel} />
              <MetricCard title="Personel Başı Maliyet" value={formatMoney(unitCosts.costPerActivePersonMinor, previewCurrencyCode)} note={`Aktif personel: ${unitCosts.activePersonCount ?? "-"}`} />
              <MetricCard title="Vardiya Başı Maliyet" value={formatMoney(unitCosts.costPerShiftMinor, previewCurrencyCode)} note={`Vardiya: ${unitCosts.deliveredShiftCount ?? "-"}`} />
              <MetricCard title="Sefer Başı Maliyet" value={formatMoney(unitCosts.costPerTripMinor, previewCurrencyCode)} note={`Sefer: ${unitCosts.deliveredTripCount ?? "-"}`} />
            </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Servis bütçesi</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {visibleText(companyBudget.summaryText || "Onaylı bütçe bulunamadığı için bütçe sapması hesaplanmadı.")}
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="muted">Bütçe kaynağı: <b>{budgetSourceLabel(companyBudget.budgetSource || preview?.budgetSource)}</b></div>
            <div className="muted">Onay durumu: <b>{budgetApprovalStateLabel(companyBudget.budgetApprovalState || currentBudgetPlan?.budgetApprovalState || form.budgetApprovalState)}</b></div>
            <div className="muted">Dönem: <b>{visibleText(companyBudget.periodLabel || periodLabel || "-")}</b></div>
            <div className="muted">Kalan / sapma: <b>{formatMoney(companyBudget.remainingBudgetMinor, previewCurrencyCode)}</b> / <b>{formatMoney(companyBudget.varianceMinor, previewCurrencyCode)}</b></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Eksik alanlar</div>
            <ChipRow items={missingFields} emptyText="Eksik alan görünmüyor." />
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Gerçekleşen servis maliyeti</div>
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
                  <div className="muted" style={{ marginTop: 4 }}>{formatMoney(component.amountMinor, previewCurrencyCode)}</div>
                </div>
              ))
            ) : (
              <div className="muted">Bileşen dökümü henüz yok.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Tedarikçi karşılaştırması</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {visibleText(preview?.supplierComparisonSummaryText || "Tedarikçi karşılaştırması için veri bekleniyor; otomatik seçim yapılmadı.")}
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
                Bu bölüm finansal operasyon bloğunun sonraki aşamasında tamamlanacak. Henüz otomatik tedarikçi seçimi yapılmıyor.
              </div>
            )}
          </div>
        </div>

        <details className="card" style={{ minWidth: 0, padding: 12 }}>
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Ayrıntılı sonuçlar</summary>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div className="card" style={{ minWidth: 0 }}>
              <div className="panelSectionTitle">Hakediş / fatura kontrolü</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
                Bu bölüm finansal operasyon bloğunun sonraki aşamasında tamamlanacak. Henüz fatura, hakediş, tasarruf veya dışa aktarım işlemi yapılmıyor.
              </div>
            </div>

            <div className="card" style={{ minWidth: 0 }}>
              <div className="panelSectionTitle">Tasarruf senaryoları</div>
              {scenarioPanel}
            </div>

            <div className="card" style={{ minWidth: 0 }}>
              <div className="panelSectionTitle">Dışa aktarım</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
                Bu bölüm finansal operasyon bloğunun sonraki aşamasında tamamlanacak. Henüz elektronik tablo / CSV dışa aktarım yapılmıyor.
              </div>
            </div>
          </div>
        </details>
          </div>
        </details>
      </div>

      <div style={{ marginTop: 12 }} className="muted">
        {noBudgetState ? "Bütçe oluşturduğunuzda servis maliyetlerinizi dönem bazında karşılaştırabileceksiniz." : summaryText}
      </div>
    </PanelChrome>
  );
}
