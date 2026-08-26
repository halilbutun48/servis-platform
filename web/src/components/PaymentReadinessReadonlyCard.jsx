import { useMemo } from "react";

function normalizeCount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getLabel(ok, goodText, badText = "Eksik bilgi") {
  return ok ? goodText : badText;
}

export default function PaymentReadinessReadonlyCard({
  paymentBackbone = null,
  settings = null,
  activeRule = null,
  settlementStatus = null,
  cards = null,
  paymentBackboneEndpointStatus = "ok",
  settingsEndpointStatus = "ok",
  className = "",
  style,
}) {
  const state = useMemo(() => {
    const commercialSourceCount = normalizeCount(cards?.commercialSources);
    const agreementSourceCount = normalizeCount(cards?.agreementSources);
    const shiftSeriesSourceCount = normalizeCount(cards?.shiftSeriesSources);
    const paymentAccountCount = normalizeCount(cards?.paymentAccounts);
    const commissionRuleCount = normalizeCount(cards?.commissionRules);
    const planCount = normalizeCount(cards?.settlementPlans);

    const backboneOk = paymentBackboneEndpointStatus === "ok"
      && settingsEndpointStatus === "ok"
      && Boolean(paymentBackbone?.summary || paymentBackbone?.activeMilestone || settings?.summary);
    const commercialSummaryOk = commercialSourceCount > 0 || agreementSourceCount > 0 || shiftSeriesSourceCount > 0;
    const commissionRuleOk = Boolean(activeRule) || commissionRuleCount > 0;
    const paymentAccountOk = paymentAccountCount > 0;
    const readinessNotes = [];

    if (!backboneOk) readinessNotes.push("Ödeme omurgası özet bilgisi eksik.");
    if (!commercialSummaryOk) readinessNotes.push("Sözleşme / vardiya ticari özeti yok.");
    if (!commissionRuleOk) readinessNotes.push("Komisyon kuralı tanımlı değil.");
    if (!paymentAccountOk) readinessNotes.push("Ödeme hesabı bilgisi eksik.");
    if (!planCount) readinessNotes.push("Hakediş planı henüz görünmüyor.");
    if (settlementStatus && String(settlementStatus?.endpointStatus || "").toLowerCase() !== "ok") {
      readinessNotes.push("Hakediş durumu kontrol bilgisi eksik.");
    }

    return {
      backboneOk,
      commercialSummaryOk,
      commissionRuleOk,
      paymentAccountOk,
      readinessNotes,
      commercialSourceCount,
      agreementSourceCount,
      shiftSeriesSourceCount,
      paymentAccountCount,
      commissionRuleCount,
      planCount,
    };
  }, [activeRule, cards, paymentBackbone, paymentBackboneEndpointStatus, settings, settingsEndpointStatus, settlementStatus]);

  const rows = [
    { label: "Ödeme omurgası hazır mı?", value: getLabel(state.backboneOk, "Hazırlık"), status: state.backboneOk ? "SUCCESS" : "WARN" },
    { label: "Sözleşme / vardiya ticari özeti var mı?", value: getLabel(state.commercialSummaryOk, "Var"), status: state.commercialSummaryOk ? "ACTIVE" : "WARN" },
    { label: "Komisyon kuralı tanımlı mı?", value: getLabel(state.commissionRuleOk, "Tanımlı"), status: state.commissionRuleOk ? "ACTIVE" : "WARN" },
    { label: "Ödeme hesabı bilgisi eksik mi?", value: getLabel(state.paymentAccountOk, "Hayır", "Eksik bilgi"), status: state.paymentAccountOk ? "ACTIVE" : "WARN" },
  ];

  const overallLabel = state.readinessNotes.length ? "Kontrol gerekli" : "Hazırlık";
  const overallStatus = state.readinessNotes.length ? "WARN" : "ACTIVE";

  if (!paymentBackbone && !settings && !activeRule && !cards) return null;

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">Hakediş hazırlığı</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Bu kart salt okunur kontrol içindir; işlem başlatmaz.
          </div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Hakediş, Hazırlık, Eksik bilgi ve Kontrol gerekli görünürlüğü sunar.
          </div>
        </div>
        <span className="pill" data-status={overallStatus}>{overallLabel}</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status="INFO">Hakediş</span>
        <span className="pill" data-status={overallStatus}>{overallLabel}</span>
        {state.readinessNotes.length ? <span className="pill" data-status="WARN">Eksik bilgi</span> : null}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, fontWeight: 700 }}>{row.label}</div>
            <span className="pill" data-status={row.status}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="panelMeta">
        {state.readinessNotes.length
          ? `Hazır değil: ${state.readinessNotes.slice(0, 2).join(" • ")}`
          : "Hazırlık kontrolü tamam görünüyor."}
      </div>

      <div className="panelMeta">
        Özet: Ticari kayıtlar, komisyon kuralı ve ödeme hesabı birlikte okunur.
      </div>
    </div>
  );
}
