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

  useEffect(() => {
    if (!manifest && !summary) {
      clearCopilotSelection("/superadmin/ssot-alignment");
      return;
    }
    const targetCount = Number(summary?.targetCount || 0);
    const greenCount = Number(summary?.greenCount || 0);
    const errorCount = Array.isArray(manifest?.route) ? manifest.route.length : 0;
    const activeRule = String(summary?.activeRule || "Çalışma hattı izleniyor").trim();
    setCopilotSelection({
      scopeKey: "/superadmin/ssot-alignment",
      entityType: "screen",
      entityId: 6111,
      label: "Sistem Standartları",
      summary: `${targetCount} hedef • Green: ${greenCount} • Toplam hat: ${errorCount}`,
      fields: [
        { label: "Aktif çalışma kuralı", value: activeRule, help: "Ekranda görünen aktif çalışma kuralını gösterir." },
        { label: "İzlenen dosyalar", value: `${targetCount} hedef`, help: "Ekranda izlenen hedef sayısını gösterir." },
        { label: "Green", value: String(greenCount), help: "Ekranda görünen Green sayısını gösterir." },
        { label: "Toplam hat", value: String(errorCount), help: "Manifestte görünen toplam hat satırı sayısını gösterir." },
      ],
      facts: {
        screenType: "SSOT_ALIGNMENT",
        counters: { targetCount, greenCount, errorCount },
        activeRule,
        evidence: [`İzlenen dosyalar: ${targetCount}`, `Green: ${greenCount}`, `Toplam hat: ${errorCount}`],
      },
    });
    return () => clearCopilotSelection("/superadmin/ssot-alignment");
  }, [manifest, summary]);

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
