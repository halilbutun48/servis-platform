import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 280px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function SsotAlignmentPanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api("/api/ssot-alignment/manifest", { token }),
          api("/api/ssot-alignment/summary-template", { token }),
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
  }, [token]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>M61 SSOT + Milestone Hizası</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Resmi dosyalarin ve milestone hattinin tek gercekte hizalanmasi
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Aktif milestone">
          <div>{summary?.activeMilestone || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>{summary?.activeRule || "-"}</div>
        </Card>
        <Card title="Izlenen SSOT hedefleri">
          <div>{summary?.targetCount ?? 0} dosya</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(manifest?.targets || []).slice(0, 4).map((item) => item.label).join(" • ") || "Henüz veri yok"}
          </div>
        </Card>
        <Card title="Milestone ozeti">
          <div>Green: {summary?.greenCount ?? 0}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(manifest?.route || []).map((item) => `${item.id}:${item.status}`).join(" • ") || "Henüz veri yok"}
          </div>
        </Card>
      </div>
    </div>
  );
}
