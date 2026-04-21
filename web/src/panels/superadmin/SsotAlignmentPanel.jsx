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

export default function SsotAlignmentPanel() {
  const [manifest, setManifest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api("/api/ssot-alignment/manifest"),
          api("/api/ssot-alignment/summary-template"),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setSummary(s || null);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelTitle">Sistem Standartları</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Resmi doküman, paket ve çalışma hattının aynı kurala göre ilerlediğini özetler.
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Aktif çalışma kuralı">
          <div>{summary?.activeRule || "Çalışma hattı izleniyor"}</div>
          <div className="muted" style={{ marginTop: 6 }}>Paket ve doküman akışı tek hat üzerinden izlenir.</div>
        </Card>
        <Card title="İzlenen dosyalar">
          <div>{summary?.targetCount ?? 0} hedef</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(manifest?.targets || []).slice(0, 4).map((item) => item.label).join(" • ") || "Henüz dosya özeti yok"}
          </div>
        </Card>
        <Card title="Durum özeti">
          <div>Green: {summary?.greenCount ?? 0}</div>
          <div className="muted" style={{ marginTop: 6 }}>Toplam hat: {(manifest?.route || []).length || 0}</div>
        </Card>
      </div>
    </div>
  );
}
