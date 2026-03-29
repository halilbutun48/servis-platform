import { useEffect, useState } from "react";
import { api } from "../../api";

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
