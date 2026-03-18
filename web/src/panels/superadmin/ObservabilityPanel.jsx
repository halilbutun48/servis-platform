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

export default function ObservabilityPanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api("/api/observability/manifest", { token }),
          api("/api/observability/health-summary", { token }),
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
          <h2 style={{ margin: 0 }}>M59 Gözlemleme Merkezi</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Saha öncesi sağlık ve risk görünürlüğü iskeleti
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Mobil sağlık olayları">
          <div className="muted">{(manifest?.mobileHealthEventTypes || []).join(", ") || "Henüz veri yok"}</div>
        </Card>
        <Card title="GPS güven skoru">
          <div style={{ fontSize: 24, fontWeight: 700 }}>{summary?.gpsReliability?.score ?? "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>{summary?.gpsReliability?.label || "GPS güven skoru"}</div>
        </Card>
        <Card title="Cihaz sağlık özeti">
          <div>Son sync: {summary?.deviceHealth?.lastSyncAt || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>Risk: {summary?.deviceHealth?.risk || "unknown"}</div>
        </Card>
      </div>
    </div>
  );
}
