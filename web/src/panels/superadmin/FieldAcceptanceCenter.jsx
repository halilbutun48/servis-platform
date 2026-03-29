import { useEffect, useState } from "react";
import { api } from "../../api";
import PanelKvkkHint from "../shared/PanelKvkkHint";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 280px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function FieldAcceptanceCenter() {
  const [manifest, setManifest] = useState(null);
  const [sessionTemplate, setSessionTemplate] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [m, s] = await Promise.all([
        api("/api/field-acceptance/manifest"),
        api("/api/field-acceptance/session-template"),
      ]);
      setManifest(m || null);
      setSessionTemplate(s || null);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api("/api/field-acceptance/manifest"),
          api("/api/field-acceptance/session-template"),
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
  }, []);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Saha Kabul Merkezi</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Sahaya çıkmadan önce kabul kararı, checklist durumu ve test oturum özetini toplar.
          </div>
        </div>
        <button className="btn" onClick={load}>Yenile</button>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <PanelKvkkHint panelKey="fieldAcceptance" />

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Karar seçenekleri">
          <div className="muted">{(manifest?.decisions || []).join(", ") || "Henüz karar seçeneği yok"}</div>
        </Card>
        <Card title="Checklist özeti">
          <div>{manifest?.checklist?.length ?? 0} madde</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(manifest?.checklist || []).slice(0, 3).map((item) => item.label).join(" • ") || "Henüz checklist maddesi yok"}
          </div>
        </Card>
        <Card title="Test oturumu özeti">
          <div>Karar: {sessionTemplate?.decision || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Cihaz: {sessionTemplate?.deviceModel || "-"} • Build: {sessionTemplate?.buildProfile || "-"}
          </div>
        </Card>
      </div>

      {!!manifest?.checklist?.length && (
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {manifest.checklist.map((item, idx) => {
            const status = sessionTemplate?.checklist?.[idx]?.status || "PENDING";
            return (
              <div key={item.id || idx} className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.label}</div>
                  <div className="muted" style={{ marginTop: 6 }}>Alan: {item.area || "genel"}</div>
                </div>
                <div className="pill">{status}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
