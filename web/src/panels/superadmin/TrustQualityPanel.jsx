import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { getCompanyTrustQualitySummary, getTrustQualityTemplate } from "../../utils/companyDataHub";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildTrustQualityCopilotFacts } from "../../utils/copilotFacts";
import { getQualityProofSignalSummary, getQualityDraftScoreSummary, getQualityReviewDecisionSummary, getQualityReviewDecisionHistory } from "../../api";
import OperationProofReadonlyBadge from "../../components/OperationProofReadonlyBadge";
import QualityProofReadonlyCard from "../../components/QualityProofReadonlyCard";
import QualityDraftScoreCard from "../../components/QualityDraftScoreCard";
import QualityReviewDecisionCard from "../../components/QualityReviewDecisionCard";
import QualityReviewHistoryCard from "../../components/QualityReviewHistoryCard";
import FlowSummaryStrip from "../../components/FlowSummaryStrip";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";

function Card({ title, subtitle, children, className = "", style }) {
  return (
    <div
      className={`quality-card-shell ${className}`.trim()}
      style={{
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        minWidth: 0,
        width: "100%",
        ...style,
      }}
    >
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>{title}</div>
      {subtitle ? <div className="panelMeta" style={{ marginTop: -2, marginBottom: 10 }}>{subtitle}</div> : null}
      {children}
    </div>
  );
}

function MetricTile({ title, value, note, tone = "default" }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warn: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
    muted: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#d0d5dd" },
  };
  const colors = palette[tone] || palette.default;
  return (
    <div
      className="quality-card-shell"
      style={{
        padding: 14,
        border: colors.border,
        borderRadius: 8,
        minWidth: 0,
        width: "100%",
        display: "grid",
        gap: 8,
      }}
    >
      <div className="panelSectionTitle" style={{ color: colors.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: colors.value }}>{value}</div>
      {note ? <div className="panelMeta">{note}</div> : null}
    </div>
  );
}

function reviewStatusLabel(value) {
  const status = String(value || "REVIEW_PENDING").trim().toUpperCase();
  if (status === "REVIEW_PENDING") return "Kalite incelemesi bekliyor";
  if (status === "REVIEWED") return "İncelendi";
  if (status === "NEEDS_RECHECK") return "Tekrar kontrol gerekli";
  if (status === "IGNORED_FOR_NOW") return "Şimdilik dikkate alınmadı";
  return status.replace(/_/g, " ") || "Kalite incelemesi bekliyor";
}

export default function TrustQualityPanel() {
  const { token } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [manifest, setManifest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [providerSignal, setProviderSignal] = useState(null);
  const [proofSummary, setProofSummary] = useState(null);
  const [draftScoreSummary, setDraftScoreSummary] = useState(null);
  const [reviewDecisionSummary, setReviewDecisionSummary] = useState(null);
  const [reviewHistorySummary, setReviewHistorySummary] = useState(null);
  const [err, setErr] = useState("");

  const summaryCards = summary?.cards || {};
  const completedServices = Number(summaryCards.completedServices || 0);
  const pendingEvaluation = Number(summaryCards.pendingEvaluation || 0);
  const activeServices = Number(summaryCards.activeServices || 0);
  const providerCount = Number(summaryCards.providerCount || 0);
  const summaryReady = summary != null;
  const fields = Array.isArray(evaluation?.fields) ? evaluation.fields : [];
  const signals = Array.isArray(providerSignal?.signals) ? providerSignal.signals : [];

  useEffect(() => {
    const qualityFacts = buildTrustQualityCopilotFacts({
      proofSummary,
      draftScoreSummary,
      reviewDecisionSummary,
      reviewHistorySummary,
      providerSignal,
      summary,
      evaluation,
    });
    if (!summary && !evaluation && !providerSignal && !proofSummary && !draftScoreSummary && !reviewDecisionSummary && !reviewHistorySummary) {
      clearCopilotSelection('/superadmin/trust-quality');
      return;
    }
    const facts = {
      screenType: 'TRUST_QUALITY',
      stage: summaryReady ? 'ACTIVE' : 'REVIEW_NEEDED',
      readiness: summaryReady ? 'READY' : (fields.length && signals.length ? 'READY' : 'REVIEW_NEEDED'),
      readinessScore: summaryReady
        ? Math.max(48, Math.min(92, (completedServices * 3) + (activeServices * 5) + (providerCount * 4)))
        : Math.max(36, Math.min(88, (fields.length * 12) + (signals.length * 10))),
      blockers: summaryReady ? [] : ['Canlı kalite özeti henüz yüklenmedi.'],
      counters: {
        completedServices,
        pendingEvaluation,
        activeServices,
        providerCount,
        evaluationFields: fields.length,
        providerSignals: signals.length,
      },
      evidence: [
        summaryReady ? `Tamamlanan hizmet: ${completedServices}` : '',
        summaryReady ? `Bekleyen değerlendirme: ${pendingEvaluation}` : '',
        summaryReady ? `Aktif hizmet: ${activeServices}` : '',
        summaryReady ? `Sağlayıcı sayısı: ${providerCount}` : '',
        `Değerlendirme alanı: ${fields.length}`,
        `Kalite sinyali: ${signals.length}`,
        providerSignal?.summary ? `Özet: ${providerSignal.summary}` : '',
      ].filter(Boolean),
      reasoningLead: summaryReady
        ? 'Bu ekranda canlı kalite özeti, kanıt, taslak skor, inceleme kararı ve kalite geçmişi sekmeleri birlikte okunur.'
        : 'Bu ekranda hizmet değerlendirmesi ile sağlayıcı sinyali birlikte okunur.',
      nextBestAction: summaryReady
        ? 'Önce özet bandını oku. Sonra gerekirse Servis Kanıtı veya İnceleme Kararı sekmesini aç.'
        : (signals.length
          ? 'Önce değerlendirme alanları ile sağlayıcı sinyal özetini birlikte oku. Sonra gerekirse hizmet ekranına in.'
          : 'Önce hangi kalite sinyalinin eksik kaldığını netleştir. Sonra hizmet değerlendirme hattına geri dön.'),
      safestNextStep: summaryReady
        ? 'En risksiz adım, özet bandından sonra Servis Kanıtı ve İnceleme Kararı sekmelerini sırayla okumaktır.'
        : 'En risksiz adım, değerlendirme alanları ile sağlayıcı sinyal setini aynı anda okumaktır.',
      compareHint: summaryReady
        ? 'Canlı özet operasyonel snapshot, sekmeler ise karar ve denetim referansıdır.'
        : 'Hizmet puanı ile sağlayıcı sinyali aynı şey değildir; karar desteği için ikisi birlikte okunur.',
    };
    setCopilotSelection({
      scopeKey: '/superadmin/trust-quality',
      entityType: 'screen',
      entityId: 6113,
      label: 'Güven ve kalite özeti',
      summary: [
        summaryReady ? `${completedServices} tamamlanan` : null,
        summaryReady ? `${pendingEvaluation} bekleyen` : null,
        summaryReady ? `${activeServices} aktif` : null,
        summaryReady ? `${providerCount} sağlayıcı` : null,
        fields.length ? `${fields.length} alan` : null,
        signals.length ? `${signals.length} sinyal` : null,
        proofSummary?.statusText || proofSummary?.summaryText || proofSummary?.title || null,
        draftScoreSummary?.scoreBand || draftScoreSummary?.status || draftScoreSummary?.summaryText || null,
        reviewStatusLabel(reviewDecisionSummary?.reviewStatus || reviewDecisionSummary?.status || reviewDecisionSummary?.summaryText || null),
        reviewHistorySummary?.latestDecision?.statusText || reviewHistorySummary?.summaryText || null,
        providerSignal?.summary || null,
        qualityFacts?.copilotSummary || null,
      ].filter(Boolean).join(' • '),
      fields: [
        { label: 'Tamamlanan Hizmet', value: String(completedServices), help: 'Canlı kalite özetinde tamamlanan hizmet sayısını gösterir.' },
        { label: 'Bekleyen Değerlendirme', value: String(pendingEvaluation), help: 'Canlı kalite özetinde yanıt bekleyen kayıt sayısını gösterir.' },
        { label: 'Aktif Hizmet', value: String(activeServices), help: 'Canlı kalite özetinde aktif operasyon sayısını gösterir.' },
        { label: 'Sağlayıcı Sayısı', value: String(providerCount), help: 'Canlı kalite özetinde görünen sağlayıcı sayısını gösterir.' },
        { label: 'Değerlendirme Alanı', value: String(fields.length), help: 'Hizmet değerlendirmesinde görünen alan sayısını gösterir.' },
        { label: 'Sağlayıcı Sinyali', value: String(signals.length), help: 'Sağlayıcı tarafında görünen kalite sinyali sayısını gösterir.' },
        { label: 'Kanıt', value: proofSummary?.statusText || proofSummary?.summaryText || proofSummary?.title || '-', help: 'Servis kanıtı ve hizmet kanıtı durumunu gösterir.' },
        { label: 'Taslak Skor', value: draftScoreSummary?.scoreBand || draftScoreSummary?.status || draftScoreSummary?.summaryText || '-', help: 'Taslak kalite skorunun görünür bandını gösterir.' },
        { label: 'İnceleme', value: reviewStatusLabel(reviewDecisionSummary?.reviewStatus || reviewDecisionSummary?.status || reviewDecisionSummary?.summaryText || '-'), help: 'Kalite inceleme kararının durumunu gösterir.' },
        { label: 'Kalite Geçmişi', value: reviewHistorySummary?.latestDecision?.statusText || reviewHistorySummary?.summaryText || '-', help: 'Son kalite karar geçmişini gösterir.' },
        { label: 'Özet', value: providerSignal?.summary || qualityFacts?.copilotSummary || '-', help: 'Güven ve kalite görünümünün kısa özetini gösterir.' },
      ],
      badges: [
        { label: 'Durum', value: summaryReady ? 'CANLI ÖZET' : 'BEKLİYOR', help: 'Canlı kalite özetinin yüklenip yüklenmediğini gösterir.' },
      ],
      facts: { ...facts, ...qualityFacts },
    });
    return () => clearCopilotSelection('/superadmin/trust-quality');
  }, [
    summary,
    evaluation,
    providerSignal,
    proofSummary,
    draftScoreSummary,
    reviewDecisionSummary,
    reviewHistorySummary,
    completedServices,
    pendingEvaluation,
    activeServices,
    providerCount,
    summaryReady,
    fields.length,
    signals.length,
  ]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [m, summaryPayload, evaluationTemplate, providerTemplate, proofPayload, draftPayload, decisionPayload, historyPayload] = await Promise.all([
          api("/api/trust-quality/manifest", { token }),
          getCompanyTrustQualitySummary(token, { ttlMs: 25000 }),
          getTrustQualityTemplate(token, { ttlMs: 25000 }),
          api("/api/trust-quality/provider-signal-template", { token }),
          getQualityProofSignalSummary({}, { token }).catch(() => null),
          getQualityDraftScoreSummary({}, { token }).catch(() => null),
          getQualityReviewDecisionSummary({}, { token }).catch(() => null),
          getQualityReviewDecisionHistory({}, { token }).catch(() => null),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setSummary(summaryPayload || null);
        setEvaluation(evaluationTemplate || null);
        setProviderSignal(providerTemplate || null);
        setProofSummary(proofPayload || null);
        setDraftScoreSummary(draftPayload || null);
        setReviewDecisionSummary(decisionPayload || null);
        setReviewHistorySummary(historyPayload || null);
      } catch (e2) {
        if (cancelled) return;
        setErr(e2?.message || String(e2));
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const activeDimensions = Array.isArray(manifest?.dimensions)
    ? manifest.dimensions.filter((item) => String(item?.status || "").toUpperCase() === "ACTIVE")
    : [];
  const plannedDimensions = Array.isArray(manifest?.dimensions)
    ? manifest.dimensions.filter((item) => String(item?.status || "").toUpperCase() === "PLANNED")
    : [];
  const manifestRules = Array.isArray(manifest?.rules) ? manifest.rules : [];
  const hasLoadedAny =
    summary !== null
    || evaluation !== null
    || providerSignal !== null
    || proofSummary !== null
    || draftScoreSummary !== null
    || reviewDecisionSummary !== null
    || reviewHistorySummary !== null;
  const proofStatus = proofSummary?.statusText || proofSummary?.summaryText || proofSummary?.title || (summaryReady ? "Hazır" : "-");
  const draftStatus = draftScoreSummary?.scoreBand || draftScoreSummary?.status || draftScoreSummary?.summaryText || "-";
  const reviewStatus = reviewStatusLabel(reviewDecisionSummary?.reviewStatus || reviewDecisionSummary?.status || reviewDecisionSummary?.summaryText || "-");
  const historyStatus = reviewHistorySummary?.latestDecision?.statusText || reviewHistorySummary?.summaryText || "-";
  const proofSignal = String(proofStatus || "").toUpperCase();
  const reviewSignal = String(reviewStatus || "").toUpperCase();
  const proofNeedsAttention =
    proofSignal.includes("BEK")
    || proofSignal.includes("PEND")
    || proofSignal.includes("EKS");
  const reviewNeedsAttention =
    pendingEvaluation > 0
    || reviewSignal.includes("BEK")
    || reviewSignal.includes("PEND");
  const hasCriticalBand = proofNeedsAttention || reviewNeedsAttention;
  const criticalBandText = pendingEvaluation > 0
    ? `Kalite/kanıt bekleyen hizmet var · ${pendingEvaluation} kayıt`
    : reviewNeedsAttention
    ? `Kanıt veya inceleme sinyali dikkat gerektiriyor · ${reviewStatus !== "-" ? reviewStatus : proofStatus}`
      : `Kanıt veya inceleme sinyali dikkat gerektiriyor · ${proofStatus}`;
  const criticalBandDescription = pendingEvaluation > 0
    ? "İnceleme Kararı sekmesi, bekleyen kayıtları ve kanıt sinyallerini birlikte gösterir."
    : `Kanıt durumu: ${proofStatus} • İnceleme durumu: ${reviewStatus}`;
  const criticalBandTarget = reviewNeedsAttention ? "decision" : "proof";
  const tabs = [
    { key: "overview", label: "Özet" },
    { key: "proof", label: "Servis Kanıtı" },
    { key: "draft", label: "Taslak Skor" },
    { key: "decision", label: "İnceleme Kararı", badge: pendingEvaluation > 0 ? pendingEvaluation : null },
    { key: "history", label: "Kalite Geçmişi", badge: Array.isArray(reviewHistorySummary?.historyItems) ? reviewHistorySummary.historyItems.length : null },
    { key: "roadmap", label: "Yol Haritası / Riskler", badge: (plannedDimensions.length + manifestRules.length) || null },
  ];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelTitle">Güven ve Kalite Özeti</div>
          <div className="panelSubtitle" style={{ marginTop: 6 }}>
            Canlı kalite özeti, kanıt ve karar sekmeleri birlikte okunur.
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, maxWidth: 980 }}>
        <FlowSummaryStrip
          title="Kalite akış özeti"
          description="Bu ekran kesin kalite puanı vermez. Kanıt, taslak skor, inceleme kararı ve denetim izini birlikte gösterir."
          steps={["1. Kanıt", "2. Taslak skor", "3. İnceleme", "4. Denetim izi", "Kesin puan yok"]}
          statusText="Kesin puan yok"
          tone="warn"
        />
      </div>

      <div className="card" style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="panelSectionTitle">
            {!hasLoadedAny ? "Kalite verileri yükleniyor..." : hasCriticalBand ? criticalBandText : "Kalite ve kanıt akışı hazır"}
          </div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            {!hasLoadedAny
              ? "Canlı kalite bandı kısa süre içinde yüklenecek."
              : hasCriticalBand
                ? criticalBandDescription
                : "Kritik kalite uyarısı görünmüyor; detaylar gerektiğinde ilgili sekmelerden açılır."}
          </div>
        </div>
        {!hasLoadedAny ? null : hasCriticalBand ? (
          <button type="button" onClick={() => setActiveTab(criticalBandTarget === "decision" ? "decision" : "proof")}>
            {criticalBandTarget === "decision" ? "İnceleme Kararı sekmesine git" : "Servis Kanıtı sekmesine git"}
          </button>
        ) : null}
      </div>

      <div className="quality-summary-grid" style={{ marginTop: 14 }}>
        <MetricTile title="Kanıt" value={proofStatus} note="Servis kanıtı ve görünür sinyal" tone={String(proofStatus || "").includes("Hazır") ? "good" : "default"} />
        <MetricTile title="Taslak skor" value={draftStatus} note="Taslak kalite bandı" tone={String(draftStatus || "").includes("Yükleniyor") ? "muted" : "default"} />
        <MetricTile title="İnceleme" value={reviewStatus} note="İnceleme kararı durumu" tone={pendingEvaluation > 0 ? "warn" : "default"} />
        <MetricTile title="Karar bekleyen" value={pendingEvaluation} note="Bekleyen değerlendirme sayısı" tone={pendingEvaluation > 0 ? "warn" : "good"} />
        <MetricTile title="Kalite geçmişi" value={historyStatus} note="Son karar geçmişi" tone={String(historyStatus || "").includes("Yok") ? "muted" : "default"} />
        <MetricTile title="Aktif operasyon" value={activeServices} note="Canlı hizmet sayısı" tone={activeServices > 0 ? "good" : "default"} />
      </div>

      <div className="card" style={{ marginTop: 14, paddingTop: 12, paddingBottom: 12 }}>
        <PanelSegmentTabs
          ariaLabel="Güven ve kalite sekmeleri"
          compact
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
        {activeTab === "overview" ? (
          <div role="tabpanel" aria-label="Özet" className="card" style={{ display: "grid", gap: 12 }}>
            <div className="quality-detail-layout">
              <Card
                title="Kalite akışı kısa yorumu"
                subtitle="Özet, kanıt ve karar sekmeleri için kısa okuma"
              >
                <div className="panelBody">
                  Canlı kalite özeti, Tamamlanan hizmet, Değerlendirme bekleyen, Aktif hizmet ve Sağlayıcı sayısı üstteki KPI bandında okunur.
                  Detaylar Servis Kanıtı, Taslak Skor, İnceleme Kararı ve Kalite Geçmişi sekmelerine taşınır.
                </div>
                <div className="panelMeta" style={{ marginTop: 6 }}>
                  Bu özet kesin kalite puanı değildir; yalnızca hangi sekmenin önce açılacağını gösterir.
                </div>
              </Card>

              <Card
                title="Sıradaki doğru kontrol"
                subtitle="Karar öncesi güvenli adım"
              >
                <div className="panelBody">
                  {pendingEvaluation > 0
                    ? "Önce bekleyen kayıtları incele. Sonra gerekirse Servis Kanıtı ve İnceleme Kararı sekmelerini aç."
                    : "Bekleyen kayıt görünmüyor. Gerekirse Servis Kanıtı ve Kalite Geçmişi sekmelerini aç."}
                </div>
                <div className="toolbar" style={{ flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setActiveTab("proof")}>Servis Kanıtı</button>
                  <button type="button" onClick={() => setActiveTab("decision")} disabled={!pendingEvaluation}>
                    İnceleme Kararı
                  </button>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {activeTab === "proof" ? (
          <div role="tabpanel" aria-label="Servis Kanıtı" className="card" style={{ display: "grid", gap: 12 }}>
            <div className="panelMeta">
              Servis kanıtı detayları burada toplanır; ana sayfada uzun açık blok olarak kalmaz.
            </div>
            <OperationProofReadonlyBadge className="quality-card-shell" style={{ height: "100%", padding: 12, gap: 8 }} />
            <QualityProofReadonlyCard className="quality-card-shell" style={{ height: "100%", padding: 12, gap: 8 }} />
          </div>
        ) : null}

        {activeTab === "draft" ? (
          <div role="tabpanel" aria-label="Taslak Skor" className="card" style={{ padding: 14 }}>
            <QualityDraftScoreCard className="quality-card-shell" style={{ height: "100%", padding: 12, gap: 8 }} />
          </div>
        ) : null}

        {activeTab === "decision" ? (
          <div role="tabpanel" aria-label="İnceleme Kararı" className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
            <div className="panelMeta">
              Karar notu ve inceleme aksiyonları bu sekmede kaydedilir; kritik kararlar üstte tekrar edilmez.
            </div>
            <QualityReviewDecisionCard className="quality-card-shell" style={{ height: "100%", padding: 12, gap: 8 }} />
          </div>
        ) : null}

        {activeTab === "history" ? (
          <div role="tabpanel" aria-label="Kalite Geçmişi" className="card" style={{ padding: 14 }}>
            <QualityReviewHistoryCard className="quality-card-shell" style={{ height: "100%", padding: 12, gap: 8 }} />
          </div>
        ) : null}

        {activeTab === "roadmap" ? (
          <div role="tabpanel" aria-label="Yol Haritası / Riskler" className="card" style={{ display: "grid", gap: 12 }}>
            <Card
              title="Yol haritası: hizmet alan değerlendirmesi"
              subtitle="Kaliteye bağlı etki ve görevler"
            >
              <div className="panelBody">
                {evaluation?.summary || "Hizmet değerlendirme alanları ve kalite etkileri burada görünür."}
              </div>
              <div className="panelMeta" style={{ marginTop: 6 }}>
                {(evaluation?.fields || []).join(" • ") || "Henüz değerlendirme alanı yok"}
              </div>
              <div className="panelMeta" style={{ marginTop: 6 }}>
                Aktif milestone: {manifest?.activeMilestone || "M63"}
              </div>
            </Card>

            <Card
              title="Yol haritası: sağlayıcı kalite sinyali"
              subtitle="Risk ve tamamlanması gereken kalite adımları"
            >
              <div className="panelBody">{providerSignal?.summary || "Sağlayıcı kalite ve güven görünürlüğü için özet sinyal seti."}</div>
              <div className="panelMeta" style={{ marginTop: 6 }}>
                {(providerSignal?.signals || []).join(" • ") || "Henüz sinyal yok"}
              </div>
              <div className="panelMeta" style={{ marginTop: 6 }}>
                {manifestRules.join(" • ") || "Henüz yol haritası kuralı yok"}
              </div>
              <div className="panelMeta" style={{ marginTop: 6 }}>
                Aktif: {activeDimensions.length} • Planlı: {plannedDimensions.length}
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
