import { useEffect, useMemo, useState } from "react";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import { getApiErrorInfo } from "../../utils/apiContract";
import { getCompanyFinancialOperationsPreview, getRoomFinancialOperationsPreview } from "../../api";

const INPUT_STYLE = {
  width: "100%",
  marginTop: 6,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  color: "inherit",
  padding: "10px 12px",
  outline: "none",
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function formatTRY(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)} ₺`;
}

function formatBps(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n / 100)}`;
}

function formatKm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  if (n <= 0) return "-";
  return n >= 10 ? `${Math.round(n)} km` : `${n.toFixed(2)} km`;
}

function formatMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  if (n <= 0) return "-";
  return `${Math.round(n)} dk`;
}

function MetricCard({ title, value, note, tone = "default" }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
    danger: { border: "1px solid rgba(240,68,56,0.35)", title: "#fda29b", value: "#fecaca" },
  }[tone] || null;

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

function scopeMeta(scope) {
  if (scope === "ROOM") {
    return {
      title: "Finansal Operasyonlar",
      subtitle: "Oda kârlılığı ve quote floor için read-only preview.",
      currentLabel: "Mevcut oda teklifi",
      baselineLabel: "Maliyet tabanı",
      resultLabel: "Quote floor",
      amountLabel: "Oda teklif sinyali",
      amountGapLabel: "Oda farkı",
      endpointLabel: "Room preview",
    };
  }
  return {
    title: "Bütçe ve Servis Maliyeti",
    subtitle: "Şirket tarafı bütçe ve servis maliyeti için read-only preview.",
    currentLabel: "Mevcut bütçe / teklif",
    baselineLabel: "Servis maliyeti",
    resultLabel: "Bütçe farkı",
    amountLabel: "Bütçe sinyali",
    amountGapLabel: "Bütçe farkı",
    endpointLabel: "Company preview",
  };
}

function formatMoney(value, currencyCode = "TRY") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)}${suffix}`;
}

function CompanyComparisonBlock({ comparison, currencyCode }) {
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

function renderCompanyFinancialPreview({ meta, me, preview, loading, err, setRefreshTick }) {
  const companyBudget = preview?.companyBudget || {};
  const companyServiceCost = preview?.companyServiceCost || {};
  const unitCosts = preview?.unitCosts || {};
  const period = preview?.period || {};
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
        Bu yüzey sadece read-only/preview amaçlıdır; write-action, payment, invoice ve accounting kapalıdır.
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
                  <CompanyComparisonBlock key={comparison.supplierRef || comparison.safeSupplierLabel || comparison.pricePeriod || "supplier"} comparison={comparison} currencyCode={preview?.currencyCode} />
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

function initialForm() {
  return {
    manualBaselineOperationalCostMinor: "",
    targetContributionBps: "",
    riskReserveBps: "",
    serviceDistanceKm: "",
    routeDurationMinutes: "",
    passengerCount: "",
    vehicleCapacity: "",
    shiftCount: "",
    serviceDayCount: "",
    fuelConsumptionLitersPer100Km: "",
    fuelUnitPriceMinor: "",
    driverBasePerShiftMinor: "",
    maintenancePerKmMinor: "",
    vehicleLeaseMonthlyMinor: "",
  };
}

function cleanParams(form) {
  const params = {};
  for (const [key, value] of Object.entries(form || {})) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    params[key] = text;
  }
  return params;
}

function allowedForScope(scope, me) {
  const role = normalizeText(me?.role);
  const kind = normalizeText(me?.companyKind);
  if (scope === "ROOM") return role === "ROOM" || role === "SUPER_ADMIN";
  if (role === "SUPER_ADMIN") return true;
  if (role !== "COMPANY") return false;
  return !(kind === "SCHOOL" || kind === "ORGANIZATION");
}

function buildDeniedText(scope, me) {
  const role = normalizeText(me?.role) || "-";
  const kind = normalizeText(me?.companyKind) || "-";
  if (role === "COMPANY" && (kind === "SCHOOL" || kind === "ORGANIZATION")) {
    return "Bu alt kimlik için finansal operasyon yüzeyi kapalıdır. Bu alan read-only/preview olarak kalır.";
  }
  return scope === "ROOM"
    ? "Bu rol için oda finansal operasyon yüzeyi görünmez. Bu alan read-only/preview olarak kalır."
    : "Bu rol için şirket finansal operasyon yüzeyi görünmez. Bu alan read-only/preview olarak kalır.";
}

export default function FinancialOperationsPanel({ scope = "ROOM" }) {
  const { token, me } = useSession();
  const meta = useMemo(() => scopeMeta(scope), [scope]);
  const canView = useMemo(() => allowedForScope(scope, me), [scope, me]);
  const [form, setForm] = useState(() => initialForm());
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    setForm(initialForm());
    setPreview(null);
    setErr("");
    setRefreshTick(0);
  }, [scope]);

  useEffect(() => {
    if (!token || !canView) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setErr("");
      try {
        const params = cleanParams(form);
        const payload = scope === "ROOM"
          ? await getRoomFinancialOperationsPreview(token, params, { signal: controller.signal })
          : await getCompanyFinancialOperationsPreview(token, params, { signal: controller.signal });
        if (!controller.signal.aborted) setPreview(payload || null);
      } catch (e) {
        if (e?.name === "AbortError" || controller.signal.aborted) return;
        const info = getApiErrorInfo(e, "Finansal operasyon önizlemesi okunamadı.");
        setErr(info.message || "Finansal operasyon önizlemesi okunamadı.");
        setPreview(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [canView, form, refreshTick, scope, token]);

  const snapshot = preview?.snapshot || {};
  const model = preview?.operationalCostModel || {};
  const quoteFloor = preview?.quoteFloor || {};
  const roomProfitability = preview?.roomProfitability || null;
  const companyBudget = preview?.companyBudget || null;
  const missingFields = Array.from(new Set([...(model?.missingFields || []), ...(quoteFloor?.missingFields || [])]));
  const readOnlyNote = "Bu yüzey sadece read-only/preview amaçlıdır; write-action, payment, invoice ve accounting kapalıdır.";

  if (!canView) {
    return (
      <PanelChrome
        title={meta.title}
        subtitle={meta.subtitle}
      >
        <div className="card" style={{ border: "1px solid rgba(240,68,56,0.25)" }}>
          <div style={{ fontWeight: 900 }}>Erişim kapalı</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {buildDeniedText(scope, me)}
          </div>
          <div className="muted" style={{ marginTop: 10 }}>{readOnlyNote}</div>
        </div>
      </PanelChrome>
    );
  }

  if (scope === "COMPANY") {
    return renderCompanyFinancialPreview({
      meta,
      me,
      preview,
      loading,
      err,
      setRefreshTick,
    });
  }

  const scopeTitle = meta.title;
  const currentAmountMinor = scope === "ROOM"
    ? Number(snapshot.currentRoomOfferMinor || 0) || null
    : Number(snapshot.currentCommercialAmountMinor || snapshot.currentCompanyOfferMinor || 0) || null;
  const baselineMinor = Number(quoteFloor?.baselineOperationalCostMinor || preview?.baselineOperationalCostMinor || 0) || null;
  const currentGapMinor = preview?.roomProfitability?.profitMinor ?? preview?.companyBudget?.budgetGapMinor ?? null;
  const quoteFloorGapMinor = Number.isFinite(Number(quoteFloor?.marginGapMinor)) ? Number(quoteFloor.marginGapMinor) : null;
  const quoteFloorComputed = Boolean(quoteFloor?.computed);
  const modelStatusTone = String(model?.status || "").toLowerCase() === "complete"
    ? "good"
    : String(model?.status || "").toLowerCase() === "blocked"
      ? "danger"
      : "warm";

  return (
    <PanelChrome
      title={scopeTitle}
      subtitle={meta.subtitle}
      actions={(
        <button type="button" className="btn sm" onClick={() => setRefreshTick((n) => n + 1)} disabled={loading}>
          {loading ? "Yenileniyor..." : "Yenile"}
        </button>
      )}
    >
      <div className="muted" style={{ lineHeight: 1.45 }}>{readOnlyNote}</div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status="OK">{normalizeText(me?.role) || "-"}</span>
        {normalizeText(me?.companyKind) ? <span className="pill">{normalizeText(me?.companyKind)}</span> : null}
        <span className="pill" data-status={modelStatusTone.toUpperCase()}>{String(model?.status || "unknown").toUpperCase()}</span>
        <span className="pill" data-status={quoteFloorComputed ? "OK" : "WARN"}>{quoteFloorComputed ? "Quote floor hazır" : "Quote floor bekliyor"}</span>
      </div>

      {err ? (
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.25)" }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <MetricCard title="Kaynak" value={snapshot.sourceLabel || "-"} note={snapshot.roomName || snapshot.companyName || "-"} />
        <MetricCard title="Mesafe" value={formatKm(snapshot.routeDistanceKm)} note="Rota snapshot mesafesi" />
        <MetricCard title="Süre" value={formatMinutes(snapshot.routeDurationMin)} note="Rota snapshot süresi" />
        <MetricCard title="Yolcu" value={Number(snapshot.passengerCount || 0)} note="Snapshot yolcu / pax" />
        <MetricCard title="Kapasite" value={Number(snapshot.vehicleCapacity || 0) || "-"} note="Araç kapasitesi" />
        <MetricCard title={meta.currentLabel} value={formatTRY(currentAmountMinor)} note={snapshot.currentCommercialAmountLabel || "-"} />
        <MetricCard title={meta.baselineLabel} value={formatTRY(baselineMinor)} note={quoteFloor?.baselineSource || model?.status || "-"} tone={quoteFloorComputed ? "good" : "warm"} />
        <MetricCard title={meta.resultLabel} value={formatTRY(quoteFloor?.quoteFloorMinor)} note={quoteFloorComputed ? `Kişi başı ${formatTRY(quoteFloor?.quoteFloorPerPassengerMinor)}` : "Açık parametre bekleniyor"} tone={quoteFloorComputed ? "good" : "warm"} />
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Açık parametreler</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Quote floor ve maliyet önizlemesi açıkça girilen parametrelerle çalışır. Gizli varsayılan kullanılmaz.
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <label className="muted">
              Manuel maliyet tabanı
              <input
                inputMode="numeric"
                placeholder="örn. 125000"
                value={form.manualBaselineOperationalCostMinor}
                onChange={(e) => setForm((prev) => ({ ...prev, manualBaselineOperationalCostMinor: e.target.value }))}
                style={INPUT_STYLE}
              />
            </label>
            <label className="muted">
              Hedef katkı bps
              <input
                inputMode="numeric"
                placeholder="örn. 1200"
                value={form.targetContributionBps}
                onChange={(e) => setForm((prev) => ({ ...prev, targetContributionBps: e.target.value }))}
                style={INPUT_STYLE}
              />
            </label>
            <label className="muted">
              Risk rezervi bps
              <input
                inputMode="numeric"
                placeholder="örn. 300"
                value={form.riskReserveBps}
                onChange={(e) => setForm((prev) => ({ ...prev, riskReserveBps: e.target.value }))}
                style={INPUT_STYLE}
              />
            </label>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Gelişmiş maliyet girdileri</summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <label className="muted">
                Servis mesafesi (km)
                <input
                  inputMode="decimal"
                  placeholder="otomatik snapshot kullanılır"
                  value={form.serviceDistanceKm}
                  onChange={(e) => setForm((prev) => ({ ...prev, serviceDistanceKm: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Rota süresi (dk)
                <input
                  inputMode="decimal"
                  placeholder="otomatik snapshot kullanılır"
                  value={form.routeDurationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, routeDurationMinutes: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Yolcu sayısı
                <input
                  inputMode="numeric"
                  placeholder="otomatik snapshot kullanılır"
                  value={form.passengerCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, passengerCount: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Araç kapasitesi
                <input
                  inputMode="numeric"
                  placeholder="otomatik snapshot kullanılır"
                  value={form.vehicleCapacity}
                  onChange={(e) => setForm((prev) => ({ ...prev, vehicleCapacity: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Yakıt tüketimi (L/100km)
                <input
                  inputMode="decimal"
                  placeholder="örn. 5.5"
                  value={form.fuelConsumptionLitersPer100Km}
                  onChange={(e) => setForm((prev) => ({ ...prev, fuelConsumptionLitersPer100Km: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Yakıt birim fiyatı (minor)
                <input
                  inputMode="numeric"
                  placeholder="örn. 5000"
                  value={form.fuelUnitPriceMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, fuelUnitPriceMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Sürücü temel maliyeti
                <input
                  inputMode="numeric"
                  placeholder="örn. 1200"
                  value={form.driverBasePerShiftMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, driverBasePerShiftMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Km başı bakım maliyeti
                <input
                  inputMode="numeric"
                  placeholder="örn. 15"
                  value={form.maintenancePerKmMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, maintenancePerKmMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Aylık araç kira maliyeti
                <input
                  inputMode="numeric"
                  placeholder="örn. 25000"
                  value={form.vehicleLeaseMonthlyMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, vehicleLeaseMonthlyMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
            </div>
          </details>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Maliyet modeli</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {model?.summaryText || "Maliyet modeli henüz hesaplanmadı."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <MetricCard title="Durum" value={String(model?.status || "-").toUpperCase()} note={model?.confidence?.reason || "-"} tone={modelStatusTone} />
            <MetricCard title="Güven" value={String(model?.confidence?.level || "-").toUpperCase()} note={`Puan ${Number(model?.confidence?.score || 0) || 0}/100`} />
            <MetricCard title="Birim km" value={formatTRY(model?.unitCosts?.costPerTotalKmMinor)} note="Toplam km başı" />
            <MetricCard title="Birim yolcu" value={formatTRY(model?.unitCosts?.costPerPassengerMinor)} note="Yolcu başı" />
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Eksik alanlar</div>
            <ChipRow items={missingFields} emptyText="Eksik alan görünmüyor." />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">{scope === "ROOM" ? "Oda kârlılığı" : "Bütçe sinyali"}</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {scope === "ROOM"
              ? roomProfitability?.summaryText || "Oda kârlılığı önizlemesi için veri bekleniyor."
              : companyBudget?.summaryText || "Bütçe önizlemesi için veri bekleniyor."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <MetricCard title={meta.currentLabel} value={formatTRY(currentAmountMinor)} note={snapshot.currentCommercialAmountCounterLabel || snapshot.currentCommercialCounterLabel || "-"} tone={currentAmountMinor != null ? "good" : "default"} />
            <MetricCard title={scope === "ROOM" ? "Kâr / zarar" : "Bütçe farkı"} value={formatTRY(currentGapMinor)} note={scope === "ROOM" ? "Mevcut teklif - maliyet" : "Mevcut bütçe - servis maliyeti"} tone={currentGapMinor != null && Number(currentGapMinor) >= 0 ? "good" : "warm"} />
            <MetricCard title={meta.resultLabel} value={formatTRY(quoteFloor?.quoteFloorMinor)} note={quoteFloorComputed ? `Kişi başı ${formatTRY(quoteFloor?.quoteFloorPerPassengerMinor)}` : "Açık parametre bekliyor"} tone={quoteFloorComputed ? "good" : "warm"} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Quote floor açıklığı</div>
            <div className="card" style={{ marginTop: 8, padding: 12, background: "rgba(255,255,255,0.02)" }}>
              <div className="muted">Taban kaynağı</div>
              <div style={{ fontWeight: 800, marginTop: 4 }}>{quoteFloor?.baselineSource || "-"}</div>
              <div className="muted" style={{ marginTop: 6 }}>Hedef katkı: <b>{formatBps(quoteFloor?.targetContributionBps)}</b> • Risk rezervi: <b>{formatBps(quoteFloor?.riskReserveBps)}</b></div>
              <div className="muted" style={{ marginTop: 6 }}>Fark: <b>{formatTRY(quoteFloorGapMinor)}</b></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Snapshot</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {snapshot.roomName || snapshot.companyName ? `${snapshot.roomName || "-"} • ${snapshot.companyName || "-"}` : "Snapshot adı yok."}
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div className="muted">Kaynak: <b>{snapshot.sourceLabel || "-"}</b></div>
            <div className="muted">Durum: <b>{snapshot.shiftStatus || "-"}</b></div>
            <div className="muted">Aktif vardiya: <b>{snapshot.activeShiftCount || 0}</b></div>
            <div className="muted">Aktif sözleşme: <b>{snapshot.activeAgreementCount || 0}</b></div>
            <div className="muted">Açık teklif: <b>{snapshot.openOfferCount || 0}</b></div>
            <div className="muted">Karşı teklif: <b>{snapshot.counterOfferCount || 0}</b></div>
            <div className="muted">Oda / şirket etiketi: <b>{snapshot.currentCommercialCounterLabel || "-"}</b></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Genel not</div>
            <div className="card" style={{ marginTop: 8, padding: 12, background: "rgba(255,255,255,0.02)" }}>
              {preview?.summaryText || "Sadece önizleme. Yazma aksiyonu yok."}
            </div>
          </div>
        </div>
      </div>
    </PanelChrome>
  );
}
