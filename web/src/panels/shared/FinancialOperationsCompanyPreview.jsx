import PanelChrome from "../../components/PanelChrome";

function formatMoney(value, currencyCode = "TRY") {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)}${suffix}`;
}

function formatMoneyOrDash(value, currencyCode = "TRY") {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  return formatMoney(value, currencyCode);
}

function formatTextOrDash(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function CompanyComparisonBlock({
  comparison,
  currencyCode,
  MetricCard,
  ChipRow,
}) {
  void MetricCard;
  void ChipRow;
  if (!comparison) return null;

  return (
    <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800 }}>{comparison.safeSupplierLabel || comparison.supplierRef || "Tedarikçi"}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {comparison.verifiedSupplierState ? `Durum: ${comparison.verifiedSupplierState}` : "Durum: unknown"}
          </div>
        </div>
        <div className="muted">{comparison.pricePeriod || "-"}</div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <MetricCard title="Fiyat" value={formatMoney(comparison.normalizedPriceMinor, currencyCode)} note="Dönemsel fiyat" />
        <MetricCard title="Kalite" value={comparison.qualityScore ?? "-"} note="Kalite göstergesi" />
        <MetricCard title="Güvenilirlik" value={comparison.reliabilityScore ?? "-"} note="Güvenilirlik göstergesi" />
        <MetricCard title="Kanıt" value={comparison.serviceEvidenceCount ?? "-"} note="Veri / kanıt kapsamı" />
      </div>
      <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
        {comparison.valueBand ? `Value band: ${comparison.valueBand}` : "Value band: incomplete"}
      </div>
      {Array.isArray(comparison.comparisonWarnings) && comparison.comparisonWarnings.length ? (
        <ChipRow items={comparison.comparisonWarnings} emptyText="Karşılaştırma uyarısı yok." />
      ) : null}
    </div>
  );
}

export default function FinancialOperationsCompanyPreview({
  meta,
  me,
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
  normalizeText,
  MetricCard,
  ChipRow,
  formatBps,
  INPUT_STYLE,
}) {
  const companyBudget = preview?.companyBudget || {};
  const companyServiceCost = preview?.companyServiceCost || {};
  const unitCosts = preview?.unitCosts || {};
  const period = preview?.period || {};
  const budgetPlan = preview?.budgetPlan || {};
  const currentBudgetPlan = budgetPlan?.current || budgetPlan?.draft || budgetPlan?.active || null;
  const currentBudgetPlanStatus = String(currentBudgetPlan?.status || "").toUpperCase();
  const currentBudgetPlanApprovalState = String(currentBudgetPlan?.budgetApprovalState || "").toLowerCase();
  const budgetPlanEditable = !currentBudgetPlan?.id || currentBudgetPlanStatus === "DRAFT";
  const budgetPlanCanSubmit = budgetPlanEditable && ["draft", "rejected"].includes(currentBudgetPlanApprovalState);
  const budgetPlanCanApprove = budgetPlanEditable && currentBudgetPlanApprovalState === "submitted";
  const budgetPlanCanActivate = budgetPlanEditable && currentBudgetPlanApprovalState === "approved";
  const budgetPlanCanArchive = Boolean(currentBudgetPlan?.id) && currentBudgetPlanStatus !== "ARCHIVED";
  const previewBudgetAmountMinor = currentBudgetPlan?.budgetAmountMinor ?? (String(form?.budgetAmountMinor ?? "").trim() ? form.budgetAmountMinor : null);
  const previewPlanVersion = currentBudgetPlan?.version ?? (String(form?.budgetPlanVersion ?? "").trim() ? form.budgetPlanVersion : null);
  const previewPeriodLabel = currentBudgetPlan?.periodLabel || ((String(form?.periodStart ?? "").trim() || String(form?.periodEnd ?? "").trim()) ? `${form.periodStart || "-"} - ${form.periodEnd || "-"}` : "-");
  const previewCurrencyCode = currentBudgetPlan?.currencyCode || String(form?.currencyCode || "").trim() || "TRY";
  const supplierComparisons = Array.isArray(preview?.supplierComparisons) ? preview.supplierComparisons : [];
  const companyStatus = String(preview?.status || "unknown").toUpperCase();
  const statusTone = {
    WITHIN_BUDGET: "good",
    OVER_BUDGET: "danger",
    PARTIAL_PERIOD: "warm",
    MIXED_CURRENCY: "danger",
    PERIOD_MISMATCH: "danger",
    REVIEW_REQUIRED: "warm",
    NO_BUDGET: "warm",
    NO_SERVICE_COST: "warm",
    BLOCKED: "danger",
  }[companyStatus] || "default";

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
        Bu yüzey budget lifecycle ve explainable preview sunar; payment, invoice ve accounting kapalıdır.
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status="OK">{normalizeText(me?.role) || "-"}</span>
        {normalizeText(me?.companyKind) ? <span className="pill">{normalizeText(me?.companyKind)}</span> : null}
        <span className="pill" data-status={statusTone.toUpperCase()}>{companyStatus}</span>
        <span className="pill">{period.periodLabel || "Dönem eksik"}</span>
        <span className="pill">{preview?.currencyCode || "CUR?"}</span>
        <span className="pill">{preview?.budgetSource || "budget missing"}</span>
      </div>

      {err ? (
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.25)" }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <MetricCard title="Dönem Bütçesi" value={formatMoney(companyBudget.effectiveBudgetMinor, preview?.currencyCode)} note={companyBudget.summaryText || "Onaylı bütçe yok"} tone={companyBudget.effectiveBudgetMinor != null ? "good" : "warm"} />
        <MetricCard title="Gerçekleşen Servis Harcaması" value={formatMoney(companyServiceCost.companyVisibleServiceSpendMinor, preview?.currencyCode)} note={companyServiceCost.summaryText || "Servis harcaması yok"} tone={companyServiceCost.companyVisibleServiceSpendMinor != null ? "good" : "warm"} />
        <MetricCard title="Kalan Bütçe" value={formatMoney(companyBudget.remainingBudgetMinor, preview?.currencyCode)} note={companyBudget.budgetSource || "-"} tone={companyBudget.remainingBudgetMinor != null && Number(companyBudget.remainingBudgetMinor) >= 0 ? "good" : "danger"} />
        <MetricCard title="Bütçe Sapması" value={formatMoney(companyBudget.varianceMinor, preview?.currencyCode)} note={companyBudget.varianceDirection || "unknown"} tone={companyBudget.varianceMinor != null && Number(companyBudget.varianceMinor) >= 0 ? "good" : "danger"} />
        <MetricCard title="Bütçe Kullanım Oranı" value={formatBps(companyBudget.usageBps)} note={companyBudget.budgetApprovalState || "unknown"} />
        <MetricCard title="Personel Başı Maliyet" value={formatMoney(unitCosts.costPerActivePersonMinor, preview?.currencyCode)} note={`Aktif personel: ${unitCosts.activePersonCount ?? "-"}`} />
        <MetricCard title="Vardiya Başı Maliyet" value={formatMoney(unitCosts.costPerShiftMinor, preview?.currencyCode)} note={`Vardiya: ${unitCosts.deliveredShiftCount ?? "-"}`} />
        <MetricCard title="Sefer Başı Maliyet" value={formatMoney(unitCosts.costPerTripMinor, preview?.currencyCode)} note={`Sefer: ${unitCosts.deliveredTripCount ?? "-"}`} />
        <MetricCard title="Gün Başı Maliyet" value={formatMoney(unitCosts.costPerServiceDayMinor, preview?.currencyCode)} note={`Gün: ${unitCosts.deliveredServiceDayCount ?? "-"}`} />
        <MetricCard title="Veri Güveni" value={String(preview?.confidence?.level || preview?.dataQuality?.level || "-").toUpperCase()} note={`Puan ${Number(preview?.confidence?.score || preview?.dataQuality?.score || 0) || 0}/100`} />
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Bütçe yaşam döngüsü</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {currentBudgetPlan
              ? "Bütçe planı sunucu otoritesindeki sürüm ile korunur."
              : "Henüz kayıtlı bütçe planı yok; yeni bir taslak oluşturabilirsin."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <MetricCard
              title="Durum"
              value={String(currentBudgetPlan?.status || "DRAFT").toUpperCase()}
              note={currentBudgetPlan?.lifecycleState || "draft"}
              tone={currentBudgetPlan?.status === "ACTIVE" ? "good" : currentBudgetPlan?.status === "ARCHIVED" ? "danger" : "warm"}
            />
            <MetricCard
              title="Sürüm"
              value={formatTextOrDash(currentBudgetPlan?.version ?? form.budgetPlanVersion)}
              note={currentBudgetPlan?.id ? `Plan #${currentBudgetPlan.id}` : "Yeni plan"}
            />
            <MetricCard
              title="Bütçe"
              value={formatMoneyOrDash(previewBudgetAmountMinor, previewCurrencyCode)}
              note={previewPlanVersion ? `Version ${previewPlanVersion}` : "Taslak girdisi"}
              tone={previewBudgetAmountMinor != null ? "good" : "warm"}
            />
            <MetricCard
              title="Dönem"
              value={formatTextOrDash(previewPeriodLabel)}
              note={previewCurrencyCode}
            />
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="muted">Kaynak: <b>{formatTextOrDash(currentBudgetPlan?.budgetSource || form.budgetSource)}</b></div>
            <div className="muted">Onay durumu: <b>{formatTextOrDash(currentBudgetPlan?.budgetApprovalState || form.budgetApprovalState)}</b></div>
            <div className="muted">Uyarı eşiği: <b>{formatBps(currentBudgetPlan?.warningThresholdBps ?? form.warningThresholdBps)}</b></div>
            <div className="muted">Açıklama: <b>{formatTextOrDash(currentBudgetPlan?.description || form.description)}</b></div>
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
            <button type="button" className="btn sm" onClick={() => onBudgetAction("save")} disabled={loading || budgetActionBusy.length > 0 || (currentBudgetPlan?.id && !budgetPlanEditable)}>
              {budgetActionBusy === "save" ? "Kaydediliyor..." : "Taslak kaydet"}
            </button>
            <button type="button" className="btn sm" onClick={() => onBudgetAction("submit")} disabled={loading || !currentBudgetPlan?.id || !budgetPlanCanSubmit || budgetActionBusy.length > 0}>
              {budgetActionBusy === "submit" ? "Gönderiliyor..." : "Gönder"}
            </button>
            <button type="button" className="btn sm" onClick={() => onBudgetAction("approve")} disabled={loading || !currentBudgetPlan?.id || !budgetPlanCanApprove || budgetActionBusy.length > 0}>
              {budgetActionBusy === "approve" ? "Onaylanıyor..." : "Onayla"}
            </button>
            <button type="button" className="btn sm" onClick={() => onBudgetAction("activate")} disabled={loading || !currentBudgetPlan?.id || !budgetPlanCanActivate || budgetActionBusy.length > 0}>
              {budgetActionBusy === "activate" ? "Aktive ediliyor..." : "Aktive et"}
            </button>
            <button type="button" className="btn sm" onClick={() => onBudgetAction("archive")} disabled={loading || !currentBudgetPlan?.id || !budgetPlanCanArchive || budgetActionBusy.length > 0}>
              {budgetActionBusy === "archive" ? "Arşivleniyor..." : "Arşivle"}
            </button>
            <button type="button" className="btn sm" onClick={() => onBudgetAction("save", { createNew: true })} disabled={loading || budgetActionBusy.length > 0}>
              Yeni taslak
            </button>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Bütçe girdileri</summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <label className="muted">
                Bütçe miktarı (minor)
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
                  <input
                    value={form.currencyCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, currencyCode: e.target.value }))}
                    style={INPUT_STYLE}
                  />
                </label>
                <label className="muted">
                  Kaynak
                  <input
                    value={form.budgetSource}
                    onChange={(e) => setForm((prev) => ({ ...prev, budgetSource: e.target.value }))}
                    style={INPUT_STYLE}
                  />
                </label>
                <label className="muted">
                  Onay durumu
                  <input
                    value={form.budgetApprovalState}
                    onChange={(e) => setForm((prev) => ({ ...prev, budgetApprovalState: e.target.value }))}
                    style={INPUT_STYLE}
                  />
                </label>
                <label className="muted">
                  Uyarı eşiği bps
                  <input
                    inputMode="numeric"
                    placeholder="örn. 1500"
                    value={form.warningThresholdBps}
                    onChange={(e) => setForm((prev) => ({ ...prev, warningThresholdBps: e.target.value }))}
                    style={INPUT_STYLE}
                  />
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
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Servis Bütçesi</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {companyBudget.summaryText || "Onaylı bütçe bulunamadığı için bütçe sapması hesaplanmadı."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="muted">Bütçe kaynağı: <b>{companyBudget.budgetSource || "-"}</b></div>
            <div className="muted">Onay durumu: <b>{companyBudget.budgetApprovalState || "-"}</b></div>
            <div className="muted">Dönem: <b>{companyBudget.periodLabel || period.periodLabel || "-"}</b></div>
            <div className="muted">Kalan / sapma: <b>{formatMoney(companyBudget.remainingBudgetMinor, preview?.currencyCode)}</b> / <b>{formatMoney(companyBudget.varianceMinor, preview?.currencyCode)}</b></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Eksik alanlar</div>
            <ChipRow items={Array.isArray(preview?.missingFields) ? preview.missingFields : []} emptyText="Eksik alan görünmüyor." />
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Gerçekleşen Servis Maliyeti</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {companyServiceCost.summaryText || "Servis harcaması için yeterli kaynak bulunamadı."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="muted">Kaynak: <b>{companyServiceCost.serviceCostSource || "-"}</b></div>
            <div className="muted">Para birimi: <b>{companyServiceCost.currencyCode || "-"}</b></div>
            <div className="muted">Vergi / baz: <b>{companyServiceCost.taxBasis || "-"}</b></div>
            <div className="muted">Aktif kişi: <b>{companyServiceCost.activePersonCount ?? "-"}</b> • Planlı kişi: <b>{companyServiceCost.plannedPersonCount ?? "-"}</b></div>
            <div className="muted">Gün / vardiya / sefer: <b>{companyServiceCost.deliveredServiceDayCount ?? "-"}</b> / <b>{companyServiceCost.deliveredShiftCount ?? "-"}</b> / <b>{companyServiceCost.deliveredTripCount ?? "-"}</b></div>
          </div>
          {Array.isArray(preview?.serviceCostComponents) && preview.serviceCostComponents.length ? (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {preview.serviceCostComponents.map((component) => (
                <div key={component.key} className="card" style={{ padding: 10, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight: 800 }}>{component.label}</div>
                  <div className="muted" style={{ marginTop: 4 }}>{formatMoney(component.amountMinor, preview?.currencyCode)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Tedarikçi Karşılaştırması</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {preview?.supplierComparisonSummaryText || "Tedarikçi karşılaştırması için veri bekleniyor; otomatik seçim yapılmadı."}
          </div>
          <div style={{ marginTop: 10 }}>
            {supplierComparisons.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {supplierComparisons.map((comparison) => (
                  <CompanyComparisonBlock
                    key={comparison.supplierRef || comparison.safeSupplierLabel || comparison.pricePeriod || "supplier"}
                    comparison={comparison}
                    currencyCode={preview?.currencyCode}
                    MetricCard={MetricCard}
                    ChipRow={ChipRow}
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

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Hakediş / Fatura Kontrolü</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Bu bölüm finansal operasyon bloğunun sonraki aşamasında tamamlanacak. Henüz fatura, hakediş, tasarruf veya dışa aktarım işlemi yapılmıyor.
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Tasarruf Senaryoları</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Bu bölüm finansal operasyon bloğunun sonraki aşamasında tamamlanacak. Henüz forecast veya savings hesaplanmıyor.
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Dışa Aktarım</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Bu bölüm finansal operasyon bloğunun sonraki aşamasında tamamlanacak. Henüz Excel / CSV dışa aktarım yapılmıyor.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }} className="card">
        <div className="panelSectionTitle">Genel Not</div>
        <div style={{ marginTop: 8 }} className="muted">
          {preview?.summaryText || "Bütçe ve servis maliyeti önizlemesi için veri bekleniyor."}
        </div>
        <div style={{ marginTop: 10 }} className="muted">
          {preview?.nextSafeStep ? `Sonraki güvenli adım: ${preview.nextSafeStep}` : "Sonraki güvenli adım henüz belirlenmedi."}
        </div>
      </div>
    </PanelChrome>
  );
}
