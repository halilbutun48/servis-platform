import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { getCompanyTrustQualitySummary, getTrustQualityTemplate } from "../../utils/companyDataHub";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import OperationProofReadonlyBadge from "../../components/OperationProofReadonlyBadge";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, flex: "1 1 280px" }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function TrustQualityPanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [providerSignal, setProviderSignal] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const summaryCards = summary?.cards || {};
    const completedServices = Number(summaryCards.completedServices || 0);
    const pendingEvaluation = Number(summaryCards.pendingEvaluation || 0);
    const activeServices = Number(summaryCards.activeServices || 0);
    const providerCount = Number(summaryCards.providerCount || 0);
    const summaryReady = summary != null;
    const fields = Array.isArray(evaluation?.fields) ? evaluation.fields : [];
    const signals = Array.isArray(providerSignal?.signals) ? providerSignal.signals : [];
    if (!summary && !evaluation && !providerSignal) {
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
        ? 'Bu ekranda canlı kalite özeti ile planlı template kartları birlikte okunur.'
        : 'Bu ekranda hizmet değerlendirmesi ile sağlayıcı sinyali birlikte okunur.',
      nextBestAction: summaryReady
        ? 'Önce canlı kalite özetini oku. Sonra roadmap kartlarındaki değerlendirme ve sinyal kartlarını birlikte incele.'
        : (signals.length
          ? 'Önce değerlendirme alanları ile sağlayıcı sinyal özetini birlikte oku. Sonra gerekirse hizmet ekranına in.'
          : 'Önce hangi kalite sinyalinin eksik kaldığını netleştir. Sonra hizmet değerlendirme hattına geri dön.'),
      safestNextStep: summaryReady
        ? 'En risksiz adım, canlı kalite özetini roadmap kartlarıyla birlikte okumaktır.'
        : 'En risksiz adım, değerlendirme alanları ile sağlayıcı sinyal setini aynı anda okumaktır.',
      compareHint: summaryReady
        ? 'Canlı özet operasyonel snapshot, template kartları ise roadmap referansıdır.'
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
        providerSignal?.summary || null,
      ].filter(Boolean).join(' • '),
      fields: [
        { label: 'Tamamlanan Hizmet', value: String(completedServices), help: 'Canlı kalite özetinde tamamlanan hizmet sayısını gösterir.' },
        { label: 'Bekleyen Değerlendirme', value: String(pendingEvaluation), help: 'Canlı kalite özetinde yanıt bekleyen kayıt sayısını gösterir.' },
        { label: 'Aktif Hizmet', value: String(activeServices), help: 'Canlı kalite özetinde aktif operasyon sayısını gösterir.' },
        { label: 'Sağlayıcı Sayısı', value: String(providerCount), help: 'Canlı kalite özetinde görünen sağlayıcı sayısını gösterir.' },
        { label: 'Değerlendirme Alanı', value: String(fields.length), help: 'Hizmet değerlendirmesinde görünen alan sayısını gösterir.' },
        { label: 'Sağlayıcı Sinyali', value: String(signals.length), help: 'Sağlayıcı tarafında görünen kalite sinyali sayısını gösterir.' },
        { label: 'Özet', value: providerSignal?.summary || '-', help: 'Güven ve kalite görünümünün kısa özetini gösterir.' },
      ],
      badges: [
        { label: 'Durum', value: summaryReady ? 'CANLI ÖZET' : 'BEKLİYOR', help: 'Canlı kalite özetinin yüklenip yüklenmediğini gösterir.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/superadmin/trust-quality');
  }, [summary, evaluation, providerSignal]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [m, summaryPayload, evaluationTemplate, providerTemplate] = await Promise.all([
          api("/api/trust-quality/manifest", { token }),
          getCompanyTrustQualitySummary(token, { ttlMs: 25000 }),
          getTrustQualityTemplate(token, { ttlMs: 25000 }),
          api("/api/trust-quality/provider-signal-template", { token }),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setSummary(summaryPayload || null);
        setEvaluation(evaluationTemplate || null);
        setProviderSignal(providerTemplate || null);
      } catch (e2) {
        if (cancelled) return;
        setErr(e2?.message || String(e2));
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const dimensions = Array.isArray(manifest?.dimensions) ? manifest.dimensions : [];
  const activeDimensions = dimensions.filter((item) => String(item?.status || "").toUpperCase() === "ACTIVE");
  const plannedDimensions = dimensions.filter((item) => String(item?.status || "").toUpperCase() === "PLANNED");
  const manifestRules = Array.isArray(manifest?.rules) ? manifest.rules : [];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelTitle">Güven ve Kalite Özeti</div>
          <div className="panelSubtitle" style={{ marginTop: 6 }}>
            Canlı kalite özeti ile planlı template kartlarını birlikte gösterir.
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, maxWidth: 760 }}>
        <OperationProofReadonlyBadge />
      </div>

      <div className="panelSectionTitle" style={{ marginTop: 18 }}>Aktif operasyon</div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Canlı kalite özeti">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div>
              <div className="panelMeta">Tamamlanan hizmet</div>
              <div className="panelStatValue" style={{ marginTop: 4 }}>{summary?.cards?.completedServices ?? "-"}</div>
            </div>
            <div>
              <div className="panelMeta">Değerlendirme bekleyen</div>
              <div className="panelStatValue" style={{ marginTop: 4 }}>{summary?.cards?.pendingEvaluation ?? "-"}</div>
            </div>
            <div>
              <div className="panelMeta">Aktif hizmet</div>
              <div className="panelStatValue" style={{ marginTop: 4 }}>{summary?.cards?.activeServices ?? "-"}</div>
            </div>
            <div>
              <div className="panelMeta">Sağlayıcı sayısı</div>
              <div className="panelStatValue" style={{ marginTop: 4 }}>{summary?.cards?.providerCount ?? "-"}</div>
            </div>
          </div>
          <div className="panelMeta" style={{ marginTop: 8 }}>Bu kart `/api/trust-quality/company/summary` ile beslenir; template kartlar roadmap tarafında kalır.</div>
        </Card>
        <Card title="Yol haritası: hizmet alan değerlendirmesi">
          <div className="panelStatValue">{(evaluation?.fields || []).length} alan</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {(evaluation?.fields || []).join(" • ") || "Henüz değerlendirme alanı yok"}
          </div>
        </Card>
        <Card title="Yol haritası: sağlayıcı kalite sinyali">
          <div className="panelBody">{(providerSignal?.signals || []).join(" • ") || "Henüz sinyal yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>{providerSignal?.summary || "Sağlayıcı kalite ve güven görünürlüğü için özet sinyal seti."}</div>
        </Card>
      </div>

      <div className="panelSectionTitle" style={{ marginTop: 18 }}>Gelecek faz</div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Planlı kalite boyutları">
          <div className="panelBody">{plannedDimensions.length ? plannedDimensions.map((item) => item.label).join(" • ") : "Planlı boyut yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Aktif: {activeDimensions.length} • Planlı: {plannedDimensions.length}
          </div>
        </Card>
        <Card title="Yol haritası kuralları">
          <div className="panelBody">{manifest?.activeMilestone || "M63"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {manifestRules.join(" • ") || "Henüz yol haritası kuralı yok"}
          </div>
        </Card>
      </div>
    </div>
  );
}
