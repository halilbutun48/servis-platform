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

export default function CommercialCorePanel() {
  const [manifest, setManifest] = useState(null);
  const [lifecycle, setLifecycle] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const [m, l] = await Promise.all([
        api("/api/commercial-core/manifest"),
        api("/api/commercial-core/lifecycle-template"),
      ]);
      setManifest(m || null);
      setLifecycle(l || null);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const steps = manifest?.steps || [];
  const route = lifecycle?.route || [];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Ticari Akış</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Talebin teklif, karşı teklif, uzlaşma ve sözleşmeye geçiş yolunu özetler.
          </div>
        </div>
        <button className="btn" onClick={load}>Yenile</button>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Aktif durum">
          <div>{manifest?.title || "Henüz ticari özet yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {manifest?.activeMilestone || "Aktif durum bilgisi gelmedi"}
          </div>
        </Card>
        <Card title="İzlenen adımlar">
          <div>{steps.length} adım</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {steps.map((item) => item.label).join(" • ") || "Henüz adım listesi yok"}
          </div>
        </Card>
        <Card title="Sözleşmeye geçiş">
          <div>{route.join(" → ") || "Henüz geçiş yolu yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {lifecycle?.summary || "Bu ekran ticari sürecin hangi kapılardan geçtiğini anlatır"}
          </div>
        </Card>
      </div>
    </div>
  );
}
