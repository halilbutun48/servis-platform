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

export default function CommercialCorePanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);
  const [lifecycle, setLifecycle] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, l] = await Promise.all([
          api("/api/commercial-core/manifest", { token }),
          api("/api/commercial-core/lifecycle-template", { token }),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setLifecycle(l || null);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>M62 Ticari Omurga Güçlendirme</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Talep, teklif, karsi teklif, pazarlik gecmisi ve sozlesmeye gecis omurgasi
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Aktif milestone">
          <div>{manifest?.activeMilestone || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>{manifest?.title || "-"}</div>
        </Card>
        <Card title="İzlenen ticari adımlar">
          <div>{(manifest?.steps || []).length} adim</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(manifest?.steps || []).map((item) => item.label).join(" • ") || "Henüz veri yok"}
          </div>
        </Card>
        <Card title="Sözleşmeye geçiş">
          <div>{(lifecycle?.route || []).join(" -> ") || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>{lifecycle?.summary || "-"}</div>
        </Card>
      </div>
    </div>
  );
}
