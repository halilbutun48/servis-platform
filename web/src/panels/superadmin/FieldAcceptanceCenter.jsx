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

export default function FieldAcceptanceCenter() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);
  const [sessionTemplate, setSessionTemplate] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api("/api/field-acceptance/manifest", { token }),
          api("/api/field-acceptance/session-template", { token }),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setSessionTemplate(s || null);
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
          <h2 style={{ margin: 0 }}>M60 Saha Acceptance Merkezi</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Saha öncesi acceptance checklist ve karar iskeleti
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Karar seçenekleri">
          <div className="muted">{(manifest?.decisions || []).join(", ") || "Henüz veri yok"}</div>
        </Card>
        <Card title="Checklist özeti">
          <div>{manifest?.checklist?.length ?? 0} madde</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(manifest?.checklist || []).slice(0, 3).map((item) => item.label).join(" • ") || "Henüz veri yok"}
          </div>
        </Card>
        <Card title="Test oturumu şablonu">
          <div>Karar: {sessionTemplate?.decision || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Cihaz: {sessionTemplate?.deviceModel || "-"} • Build: {sessionTemplate?.buildProfile || "-"}
          </div>
        </Card>
      </div>
    </div>
  );
}
