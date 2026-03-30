import { useEffect, useState } from "react";
import { api } from "../../api";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 280px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function TrustQualityPanel() {
  const [evaluation, setEvaluation] = useState(null);
  const [providerSignal, setProviderSignal] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const fields = Array.isArray(evaluation?.fields) ? evaluation.fields : [];
    const signals = Array.isArray(providerSignal?.signals) ? providerSignal.signals : [];
    if (!evaluation && !providerSignal) {
      clearCopilotSelection('/superadmin/trust-quality');
      return;
    }
    const facts = {
      screenType: 'TRUST_QUALITY',
      stage: providerSignal?.summary ? 'ACTIVE' : 'SCAFFOLD',
      readiness: fields.length && signals.length ? 'READY' : 'REVIEW_NEEDED',
      readinessScore: Math.max(36, Math.min(88, (fields.length * 12) + (signals.length * 10))),
      blockers: !signals.length ? ['Sağlayıcı kalite sinyali henüz oluşmamış veya boş görünüyor.'] : [],
      counters: { evaluationFields: fields.length, providerSignals: signals.length },
      evidence: [
        `Değerlendirme alanı: ${fields.length}`,
        `Kalite sinyali: ${signals.length}`,
        providerSignal?.summary ? `Özet: ${providerSignal.summary}` : '',
      ].filter(Boolean),
      reasoningLead: 'Bu ekranda hizmet değerlendirmesi ile sağlayıcı sinyali birlikte okunur.',
      nextBestAction: signals.length
        ? 'Önce değerlendirme alanları ile sağlayıcı sinyal özetini birlikte oku. Sonra gerekirse hizmet ekranına in.'
        : 'Önce hangi kalite sinyalinin eksik kaldığını netleştir. Sonra hizmet değerlendirme hattına geri dön.',
      safestNextStep: 'En risksiz adım, değerlendirme alanları ile sağlayıcı sinyal setini aynı anda okumaktır.',
      compareHint: 'Hizmet puanı ile sağlayıcı sinyali aynı şey değildir; karar desteği için ikisi birlikte okunur.',
    };
    setCopilotSelection({
      scopeKey: '/superadmin/trust-quality',
      entityType: 'screen',
      entityId: 6113,
      label: 'Güven ve kalite özeti',
      summary: [fields.length ? `${fields.length} alan` : null, signals.length ? `${signals.length} sinyal` : null, providerSignal?.summary || null].filter(Boolean).join(' • '),
      fields: [
        { label: 'Değerlendirme Alanı', value: String(fields.length), help: 'Hizmet değerlendirmesinde görünen alan sayısını gösterir.' },
        { label: 'İlk Alan', value: fields[0] || '-', help: 'Hizmet değerlendirme setindeki ilk alanı örnek odak olarak gösterir.' },
        { label: 'Sağlayıcı Sinyali', value: String(signals.length), help: 'Sağlayıcı tarafında görünen kalite sinyali sayısını gösterir.' },
        { label: 'İlk Sinyal', value: signals[0] || '-', help: 'Sağlayıcı kalite sinyal setindeki ilk maddeyi gösterir.' },
        { label: 'Özet', value: providerSignal?.summary || '-', help: 'Güven ve kalite görünümünün kısa özetini gösterir.' },
      ],
      badges: [
        { label: 'Durum', value: signals.length ? 'AKTİF' : 'SCAFFOLD', help: 'Kalite sinyali katmanının aktif olup olmadığını özetler.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/superadmin/trust-quality');
  }, [evaluation, providerSignal]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [e, p] = await Promise.all([
          api("/api/trust-quality/evaluation-template"),
          api("/api/trust-quality/provider-signal-template"),
        ]);
        if (cancelled) return;
        setEvaluation(e || null);
        setProviderSignal(p || null);
      } catch (e2) {
        if (cancelled) return;
        setErr(e2?.message || String(e2));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Güven ve Kalite</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Hizmet değerlendirmesi, sağlayıcı kalite sinyali ve karar desteği özetini gösterir.
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Aktif kalite görünümü">
          <div>Kalite özeti açık</div>
          <div className="muted" style={{ marginTop: 6 }}>Hizmet alan değerlendirmesi ile sağlayıcı sinyali birlikte izlenir.</div>
        </Card>
        <Card title="Hizmet alan değerlendirmesi">
          <div>{(evaluation?.fields || []).length} alan</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(evaluation?.fields || []).join(" • ") || "Henüz değerlendirme alanı yok"}
          </div>
        </Card>
        <Card title="Sağlayıcı kalite sinyali">
          <div>{(providerSignal?.signals || []).join(" • ") || "Henüz sinyal yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>{providerSignal?.summary || "Sağlayıcı kalite ve güven görünürlüğü için özet sinyal seti."}</div>
        </Card>
      </div>
    </div>
  );
}
